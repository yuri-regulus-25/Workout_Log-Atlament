using System.Net;
using System.Net.Http.Headers;
using System.Reflection;
using System.Security.Cryptography;
using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using Microsoft.Data.Sqlite;

namespace Atlament.Core;

public sealed class WindowsPathProvider
{
    public WindowsPathProvider(string runtimeRoot)
    {
        RuntimeRoot = runtimeRoot;
        DataRoot = Path.Combine(runtimeRoot, "data");
        FrontendArtifactRoot = Path.Combine(DataRoot, "frontend");
        ConfigurationRoot = Path.Combine(DataRoot, "configuration");
        RuntimeDataRoot = Path.Combine(DataRoot, "runtime");
        RecoveryRoot = Path.Combine(DataRoot, "recovery");
        LogRoot = Path.Combine(DataRoot, "logs");
    }

    public string RuntimeRoot { get; }
    public string DataRoot { get; }
    public string FrontendArtifactRoot { get; }
    public string ConfigurationRoot { get; }
    public string RuntimeDataRoot { get; }
    public string RecoveryRoot { get; }
    public string LogRoot { get; }
    public string CurrentRuntimeRoot => Path.Combine(RuntimeDataRoot, "current");
    public string TemporaryRuntimeRoot => Path.Combine(RuntimeDataRoot, "temporary");
    public string ConfigurationPath => Path.Combine(ConfigurationRoot, "af-settings.json");
    public string CredentialPath => Path.Combine(ConfigurationRoot, "credential.dpapi");
    public string RuntimeDataPath => Path.Combine(CurrentRuntimeRoot, "runtime-data.json");
    public string RecoveryDraftRoot => Path.Combine(RecoveryRoot, "drafts");
    public string TemporaryRecoveryRoot => Path.Combine(RecoveryRoot, "temporary");
}

/// <summary>
/// Shared JSON contract options for AF API payloads and persisted runtime/configuration files.
/// Keeping this centralized prevents casing drift between Windows, Android, and Frontend clients.
/// </summary>
public sealed class AfJson
{
    public static readonly JsonSerializerOptions Options = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
        WriteIndented = true
    };

    public static readonly JsonSerializerOptions RepositoryWriteOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
        WriteIndented = true,
        Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping
    };

    public static readonly JsonSerializerOptions RepositoryJsonlWriteOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
        WriteIndented = false,
        Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping
    };
}

public sealed class AfLog
{
    private readonly WindowsPathProvider _paths;
    private bool _sqliteReady;

    public AfLog(WindowsPathProvider paths)
    {
        _paths = paths;
    }

    public void Initialize()
    {
        Directory.CreateDirectory(_paths.LogRoot);
        using var connection = new SqliteConnection($"Data Source={Path.Combine(_paths.LogRoot, "integrated.sqlite")}");
        connection.Open();
        using var command = connection.CreateCommand();
        command.CommandText = """
            CREATE TABLE IF NOT EXISTS logs (
                date TEXT NOT NULL,
                type TEXT NOT NULL,
                endpoint TEXT NULL,
                detail TEXT NOT NULL
            );
            DELETE FROM logs WHERE date < $threshold;
            """;
        command.Parameters.AddWithValue("$threshold", DateTimeOffset.UtcNow.AddHours(-672).ToString("O"));
        command.ExecuteNonQuery();
        _sqliteReady = true;
    }

    public void Write(LogType type, string detail, string? endpoint = null)
    {
        try
        {
            Directory.CreateDirectory(_paths.LogRoot);
            if (_sqliteReady)
            {
                using var connection = new SqliteConnection($"Data Source={Path.Combine(_paths.LogRoot, "integrated.sqlite")}");
                connection.Open();
                using var command = connection.CreateCommand();
                command.CommandText = "INSERT INTO logs(date, type, endpoint, detail) VALUES ($date, $type, $endpoint, $detail)";
                command.Parameters.AddWithValue("$date", DateTimeOffset.UtcNow.ToString("O"));
                command.Parameters.AddWithValue("$type", type.ToString());
                command.Parameters.AddWithValue("$endpoint", endpoint ?? "");
                command.Parameters.AddWithValue("$detail", detail);
                command.ExecuteNonQuery();
            }

            if (type is LogType.ERROR or LogType.FATAL)
            {
                // Text files are intentionally limited to severe failures. SQLite is the primary
                // operation log, but plain files remain useful when database initialization fails.
                AppendRotatingText(type == LogType.ERROR ? "error" : "fatal_error", type, detail, endpoint);
            }
        }
        catch
        {
            // Logging failure is explicitly non-fatal.
        }
    }

    private void AppendRotatingText(string fileName, LogType type, string detail, string? endpoint)
    {
        var path = Path.Combine(_paths.LogRoot, fileName);
        if (File.Exists(path) && File.GetCreationTimeUtc(path) < DateTime.UtcNow.AddHours(-24))
        {
            File.Delete(path);
        }

        File.AppendAllText(path, $"{DateTimeOffset.UtcNow:O}\t{type}\t{endpoint ?? ""}\t{detail}{Environment.NewLine}", Encoding.UTF8);
    }
}

public sealed class ConfigurationStore
{
    private static readonly HashSet<string> ResourceTypes = new(StringComparer.Ordinal) { "WORKOUT", "MACHINE_MASTER", "GYM_MASTER" };
    private static readonly HashSet<string> ResourceKinds = new(StringComparer.Ordinal) { "file", "directory" };
    private readonly WindowsPathProvider _paths;

    public ConfigurationStore(WindowsPathProvider paths)
    {
        _paths = paths;
    }

    public (AfConfiguration Configuration, IReadOnlyList<AfError> Errors, bool Available) Load()
    {
        if (!File.Exists(_paths.ConfigurationPath))
        {
            return (AfConfiguration.Default, new[] { new AfError(AfErrorCodes.ConfigRequired, "Configuration is required.", true) }, false);
        }

        try
        {
            var config = JsonSerializer.Deserialize<AfConfiguration>(File.ReadAllText(_paths.ConfigurationPath), AfJson.Options);
            if (config is null)
            {
                return (AfConfiguration.Default, new[] { new AfError(AfErrorCodes.ConfigInvalid, "Configuration is invalid.", true) }, false);
            }

            var errors = Validate(config);
            return errors.Count == 0 ? (config, errors, true) : (config, errors, false);
        }
        catch
        {
            return (AfConfiguration.Default, new[] { new AfError(AfErrorCodes.ConfigInvalid, "Configuration could not be parsed.", true) }, false);
        }
    }

    public IReadOnlyList<AfError> Save(AfConfiguration configuration)
    {
        var errors = Validate(configuration);
        if (errors.Count > 0)
        {
            return errors;
        }

        try
        {
            Directory.CreateDirectory(_paths.ConfigurationRoot);
            var temporaryPath = _paths.ConfigurationPath + ".tmp";
            File.WriteAllText(temporaryPath, JsonSerializer.Serialize(configuration, AfJson.Options), Encoding.UTF8);
            File.Move(temporaryPath, _paths.ConfigurationPath, true);
            return Array.Empty<AfError>();
        }
        catch
        {
            return new[] { new AfError(AfErrorCodes.ConfigSaveFailed, "Configuration could not be saved.", true) };
        }
    }

    public static IReadOnlyList<AfError> Validate(AfConfiguration configuration)
    {
        var errors = new List<AfError>();
        if (configuration.SchemaVersion != 1)
        {
            errors.Add(new AfError(AfErrorCodes.ConfigInvalid, "Unsupported configuration schemaVersion.", true));
        }

        if (string.IsNullOrWhiteSpace(configuration.Repository.Owner) ||
            string.IsNullOrWhiteSpace(configuration.Repository.Repository) ||
            string.IsNullOrWhiteSpace(configuration.Repository.Ref))
        {
            errors.Add(new AfError(AfErrorCodes.ConfigInvalid, "Repository configuration is invalid.", true));
        }

        foreach (var resource in configuration.Resources)
        {
            if (!ResourceTypes.Contains(resource.Type) || !ResourceKinds.Contains(resource.ResourceKind) || string.IsNullOrWhiteSpace(resource.Path))
            {
                errors.Add(new AfError(AfErrorCodes.ConfigInvalid, "Resource configuration is invalid.", true));
                break;
            }
        }

        ValidateRange(configuration.Timeouts.GithubRequestTimeoutSec, 1, 120, "githubRequestTimeoutSec", errors);
        ValidateRange(configuration.Timeouts.SyncOperationTimeoutSec, 5, 600, "syncOperationTimeoutSec", errors);
        ValidateRange(configuration.Timeouts.GeneralApiTimeoutSec, 1, 120, "generalApiTimeoutSec", errors);
        ValidateRange(configuration.Timeouts.ShutdownTimeoutSec, 1, 60, "shutdownTimeoutSec", errors);
        return errors;
    }

    private static void ValidateRange(int value, int min, int max, string name, List<AfError> errors)
    {
        if (value < min || value > max)
        {
            errors.Add(new AfError(AfErrorCodes.ConfigInvalid, $"{name} is out of range.", true));
        }
    }
}

public sealed class CredentialStore
{
    private readonly WindowsPathProvider _paths;

    public CredentialStore(WindowsPathProvider paths)
    {
        _paths = paths;
    }

    public (string? Token, CredentialStatus Status) Load()
    {
        try
        {
            if (!File.Exists(_paths.CredentialPath))
            {
                return (null, new CredentialStatus(false, CredentialState.missing.ToString(), null));
            }

            var protectedBytes = File.ReadAllBytes(_paths.CredentialPath);
            // DPAPI binds credentials to the current Windows user. The token should never be
            // recoverable from copied application folders or written into Frontend-visible data.
            var json = Encoding.UTF8.GetString(ProtectedData.Unprotect(protectedBytes, null, DataProtectionScope.CurrentUser));
            var credential = JsonSerializer.Deserialize<StoredCredential>(json, AfJson.Options);
            if (credential?.Token is not { Length: > 0 })
            {
                return (null, new CredentialStatus(false, CredentialState.invalid.ToString(), credential?.LimitDate));
            }

            var state = CredentialState.available;
            if (DateOnly.TryParse(credential.LimitDate, out var limitDate) && limitDate < DateOnly.FromDateTime(DateTime.Today))
            {
                state = CredentialState.expired;
            }

            return (credential.Token, new CredentialStatus(true, state.ToString(), credential.LimitDate));
        }
        catch
        {
            return (null, new CredentialStatus(false, CredentialState.unknown.ToString(), null));
        }
    }

    public CredentialUpdateResult Save(CredentialUpdate update)
    {
        if (!string.IsNullOrWhiteSpace(update.LimitDate) && !DateOnly.TryParse(update.LimitDate, out _))
        {
            return new CredentialUpdateResult(false, CredentialState.invalid.ToString(), update.LimitDate);
        }

        var current = Load();
        var token = string.IsNullOrWhiteSpace(update.Token) ? current.Token : update.Token;
        if (string.IsNullOrWhiteSpace(token))
        {
            return new CredentialUpdateResult(current.Status.Configured, current.Status.State, current.Status.LimitDate);
        }

        Directory.CreateDirectory(_paths.ConfigurationRoot);
        var json = JsonSerializer.Serialize(new StoredCredential(token, update.LimitDate), AfJson.Options);
        var protectedBytes = ProtectedData.Protect(Encoding.UTF8.GetBytes(json), null, DataProtectionScope.CurrentUser);
        File.WriteAllBytes(_paths.CredentialPath, protectedBytes);
        var state = CredentialState.available;
        if (DateOnly.TryParse(update.LimitDate, out var limitDate) && limitDate < DateOnly.FromDateTime(DateTime.Today))
        {
            state = CredentialState.expired;
        }

        return new CredentialUpdateResult(true, state.ToString(), update.LimitDate);
    }

    private sealed record StoredCredential(string Token, string? LimitDate);
}

public sealed class RuntimeDataStore
{
    private readonly WindowsPathProvider _paths;

    public RuntimeDataStore(WindowsPathProvider paths)
    {
        _paths = paths;
    }

    public void ClearTemporary()
    {
        if (Directory.Exists(_paths.TemporaryRuntimeRoot))
        {
            Directory.Delete(_paths.TemporaryRuntimeRoot, true);
        }

        Directory.CreateDirectory(_paths.TemporaryRuntimeRoot);
    }

    public IReadOnlyList<AfError> SaveCurrent(RuntimeBuildResult result, LocalMasterDocuments? masterDocuments = null)
    {
        try
        {
            // Write through the temporary runtime area so Frontend requests never observe a
            // partially serialized runtime-data.json during sync.
            Directory.CreateDirectory(_paths.TemporaryRuntimeRoot);
            var data = new RuntimeDataFile(2, DateTimeOffset.UtcNow, result.Sessions, result.Errors, result.Warnings, masterDocuments);
            var tempPath = Path.Combine(_paths.TemporaryRuntimeRoot, "runtime-data.json");
            File.WriteAllText(tempPath, JsonSerializer.Serialize(data, AfJson.Options), Encoding.UTF8);
            Directory.CreateDirectory(_paths.CurrentRuntimeRoot);
            File.Move(tempPath, _paths.RuntimeDataPath, true);
            ClearTemporary();
            return Array.Empty<AfError>();
        }
        catch
        {
            return new[] { new AfError(AfErrorCodes.RuntimeDataUpdateFailed, "Runtime Data could not be updated.", true) };
        }
    }

    public (RuntimeDataFile? Data, IReadOnlyList<AfError> Errors) LoadCurrent()
    {
        try
        {
            if (!File.Exists(_paths.RuntimeDataPath))
            {
                return (null, new[] { new AfError(AfErrorCodes.RuntimeDataUnavailable, "Runtime Data is unavailable.", true) });
            }

            var data = JsonSerializer.Deserialize<RuntimeDataFile>(File.ReadAllText(_paths.RuntimeDataPath), AfJson.Options);
            if (data is null || data.SchemaVersion is not (1 or 2) || data.Sessions is null)
            {
                return (null, new[] { new AfError(AfErrorCodes.RuntimeDataInvalid, "Runtime Data contract is invalid.", true) });
            }

            return (data, Array.Empty<AfError>());
        }
        catch
        {
            return (null, new[] { new AfError(AfErrorCodes.RuntimeDataInvalid, "Runtime Data could not be read.", true) });
        }
    }
}

public sealed class RecoveryDraftStore
{
    private readonly WindowsPathProvider _paths;

    public RecoveryDraftStore(WindowsPathProvider paths)
    {
        _paths = paths;
    }

    public RecoveryDraftSnapshot Load(AfConfiguration configuration, string resourceType, string sourcePath, string currentSourceRevision)
    {
        try
        {
            if (!Directory.Exists(_paths.RecoveryDraftRoot))
            {
                return new RecoveryDraftSnapshot("none", null);
            }

            foreach (var path in Directory.EnumerateFiles(_paths.RecoveryDraftRoot, "*.json").OrderBy(path => path, StringComparer.Ordinal))
            {
                var envelope = ReadEnvelope(path);
                if (envelope is null)
                {
                    return new RecoveryDraftSnapshot("corrupted", null);
                }

                if (!SameRepository(envelope.Repository, configuration.Repository) ||
                    envelope.Draft.ResourceType != resourceType ||
                    envelope.Draft.SourcePath != sourcePath)
                {
                    continue;
                }

                if (envelope.Draft.SchemaVersion != 1)
                {
                    return new RecoveryDraftSnapshot("incompatible", envelope.Draft);
                }

                return new RecoveryDraftSnapshot(
                    envelope.Draft.SourceRevision == currentSourceRevision ? "active" : "stale",
                    envelope.Draft);
            }

            return new RecoveryDraftSnapshot("none", null);
        }
        catch
        {
            return new RecoveryDraftSnapshot("corrupted", null);
        }
    }

    public IReadOnlyList<RecoveryDraft> List(AfConfiguration configuration)
    {
        try
        {
            if (!Directory.Exists(_paths.RecoveryDraftRoot))
            {
                return Array.Empty<RecoveryDraft>();
            }

            return Directory.EnumerateFiles(_paths.RecoveryDraftRoot, "*.json")
                .OrderBy(path => path, StringComparer.Ordinal)
                .Select(ReadEnvelope)
                .Where(envelope => envelope is not null)
                .Where(envelope => SameRepository(envelope!.Repository, configuration.Repository))
                .Select(envelope => envelope!.Draft)
                .Where(draft => draft.SchemaVersion == 1)
                .ToArray();
        }
        catch
        {
            return Array.Empty<RecoveryDraft>();
        }
    }

    public IReadOnlyList<AfError> Save(AfConfiguration configuration, RecoveryDraft draft)
    {
        try
        {
            Directory.CreateDirectory(_paths.RecoveryDraftRoot);
            Directory.CreateDirectory(_paths.TemporaryRecoveryRoot);
            var envelope = new RecoveryDraftEnvelope(configuration.Repository, draft);
            var path = DraftPath(configuration, draft.ResourceType, draft.SourcePath, draft.SourceRevision);
            var temporaryPath = Path.Combine(_paths.TemporaryRecoveryRoot, Path.GetFileName(path) + ".tmp");
            File.WriteAllText(temporaryPath, JsonSerializer.Serialize(envelope, AfJson.Options), Encoding.UTF8);
            using (var stream = new FileStream(temporaryPath, FileMode.Open, FileAccess.ReadWrite, FileShare.None))
            {
                stream.Flush(true);
            }

            File.Move(temporaryPath, path, true);
            return Array.Empty<AfError>();
        }
        catch
        {
            return new[] { new AfError(AfErrorCodes.RecoveryDraftSaveFailed, "Recovery Draft could not be saved.", true) };
        }
    }

    public IReadOnlyList<AfError> Delete(AfConfiguration configuration, string resourceType, string sourcePath, string sourceRevision)
    {
        try
        {
            var path = DraftPath(configuration, resourceType, sourcePath, sourceRevision);
            if (File.Exists(path))
            {
                File.Delete(path);
            }

            return Array.Empty<AfError>();
        }
        catch
        {
            return new[] { new AfError(AfErrorCodes.RecoveryDraftSaveFailed, "Recovery Draft could not be discarded.", true) };
        }
    }

    public int CountActive(AfConfiguration configuration)
    {
        try
        {
            if (!Directory.Exists(_paths.RecoveryDraftRoot))
            {
                return 0;
            }

            return Directory.EnumerateFiles(_paths.RecoveryDraftRoot, "*.json")
                .Select(ReadEnvelope)
                .Count(envelope => envelope is not null &&
                    SameRepository(envelope.Repository, configuration.Repository) &&
                    envelope.Draft.SchemaVersion == 1);
        }
        catch
        {
            return 0;
        }
    }

    private RecoveryDraftEnvelope? ReadEnvelope(string path)
    {
        try
        {
            return JsonSerializer.Deserialize<RecoveryDraftEnvelope>(File.ReadAllText(path), AfJson.Options);
        }
        catch
        {
            return null;
        }
    }

    private string DraftPath(AfConfiguration configuration, string resourceType, string sourcePath, string sourceRevision)
    {
        var key = string.Join("|", configuration.Repository.Owner, configuration.Repository.Repository, configuration.Repository.Ref, configuration.Repository.RootPath, resourceType, sourcePath, sourceRevision);
        var hash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(key))).ToLowerInvariant();
        return Path.Combine(_paths.RecoveryDraftRoot, hash + ".json");
    }

    private static bool SameRepository(RepositoryConfiguration left, RepositoryConfiguration right) =>
        left.Owner == right.Owner &&
        left.Repository == right.Repository &&
        left.Ref == right.Ref &&
        left.RootPath == right.RootPath;

    private sealed record RecoveryDraftEnvelope(
        [property: JsonPropertyName("repository")] RepositoryConfiguration Repository,
        [property: JsonPropertyName("draft")] RecoveryDraft Draft);
}

public sealed class RecoveryService
{
    private const int SourceViewLimitBytes = 256 * 1024;
    private static readonly string[] WorkoutFieldOrder =
    {
        "schema_version",
        "session_id",
        "date",
        "status",
        "gym_id",
        "condition",
        "machines",
        "notes"
    };

    private readonly RecoveryDraftStore _store;
    private readonly RuntimeDataBuilder _runtimeDataBuilder = new();

    public RecoveryService(RecoveryDraftStore store)
    {
        _store = store;
    }

    public int CountActiveDrafts(AfConfiguration configuration) => _store.CountActive(configuration);

    public bool MatchesWorkoutResourceKey(AfConfiguration configuration, string resourceKey, RuntimeSourceFile source, string sourceRevision) =>
        BuildResourceKey(configuration, "WORKOUT", source.Path, sourceRevision) == resourceKey;

    public IReadOnlyList<BrokenResourceSummary> ListBrokenResources(
        AfConfiguration configuration,
        IReadOnlyList<RuntimeSourceFile> workoutFiles,
        RuntimeSourceFile machinesFile,
        RuntimeSourceFile gymsFile) =>
        InspectWorkoutResources(configuration, workoutFiles, machinesFile, gymsFile)
            .Where(resource => resource.Inspection.Health == "broken")
            .OrderBy(resource => resource.Source.Path, StringComparer.Ordinal)
            .Select(resource =>
            {
                var draft = _store.Load(configuration, "WORKOUT", resource.Source.Path, ResolveSourceRevision(resource.Source));
            return new BrokenResourceSummary(
                    resource.ResourceKey,
                    resource.Source.Path,
                    ResolveSourceRevision(resource.Source),
                    "WORKOUT",
                    "broken",
                    resource.Inspection.Issues,
                    true,
                    draft.State == "active");
            })
            .ToArray();

    public ResourceInspection? InspectPath(
        AfConfiguration configuration,
        string path,
        IReadOnlyList<RuntimeSourceFile> workoutFiles,
        RuntimeSourceFile machinesFile,
        RuntimeSourceFile gymsFile) =>
        InspectWorkoutResources(configuration, workoutFiles, machinesFile, gymsFile)
            .FirstOrDefault(resource => string.Equals(resource.Source.Path, path, StringComparison.Ordinal))
            ?.Inspection;

    public (RecoveryResourceDetail? Detail, IReadOnlyList<AfError> Errors) GetDetail(
        AfConfiguration configuration,
        string resourceKey,
        IReadOnlyList<RuntimeSourceFile> workoutFiles,
        RuntimeSourceFile machinesFile,
        RuntimeSourceFile gymsFile)
    {
        var resource = ResolveWorkoutResourceForRead(configuration, resourceKey, workoutFiles, machinesFile, gymsFile);
        if (resource is null)
        {
            return (null, new[] { new AfError(AfErrorCodes.RecoveryResourceNotFound, "Recovery Resource was not found.", true) });
        }

        var draft = _store.Load(configuration, "WORKOUT", resource.Source.Path, ResolveSourceRevision(resource.Source));
        var eligible = resource.Inspection.Health == "broken";
        return (new RecoveryResourceDetail(
            resource.ResourceKey,
            resource.Inspection,
            new RecoveryEligibility(eligible, eligible ? null : AfErrorCodes.RecoveryResourceNotBroken),
            new RecoveryCapabilities(true, eligible, eligible, eligible),
            draft), Array.Empty<AfError>());
    }

    public (RecoverySourceView? Source, IReadOnlyList<AfError> Errors) GetSource(
        AfConfiguration configuration,
        string resourceKey,
        IReadOnlyList<RuntimeSourceFile> workoutFiles,
        RuntimeSourceFile machinesFile,
        RuntimeSourceFile gymsFile)
    {
        var resource = ResolveWorkoutResourceForRead(configuration, resourceKey, workoutFiles, machinesFile, gymsFile);
        if (resource is null)
        {
            return (null, new[] { new AfError(AfErrorCodes.RecoveryResourceNotFound, "Recovery Resource was not found.", true) });
        }

        if (Encoding.UTF8.GetByteCount(resource.Source.Content) > SourceViewLimitBytes)
        {
            return (null, new[] { new AfError(AfErrorCodes.RecoverySourceViewTooLarge, "Recovery source view is too large.", true) });
        }

        return (new RecoverySourceView(
            resource.ResourceKey,
            resource.Source.Path,
            ResolveSourceRevision(resource.Source),
            "WORKOUT",
            resource.Source.Content,
            true), Array.Empty<AfError>());
    }

    public (RecoveryDraftSnapshot Snapshot, IReadOnlyList<AfError> Errors) GetDraft(
        AfConfiguration configuration,
        string resourceKey,
        IReadOnlyList<RuntimeSourceFile> workoutFiles,
        RuntimeSourceFile machinesFile,
        RuntimeSourceFile gymsFile)
    {
        var resource = ResolveWorkoutResourceForRead(configuration, resourceKey, workoutFiles, machinesFile, gymsFile);
        if (resource is null)
        {
            return (new RecoveryDraftSnapshot("none", null), new[] { new AfError(AfErrorCodes.RecoveryResourceNotFound, "Recovery Resource was not found.", true) });
        }

        return (_store.Load(configuration, "WORKOUT", resource.Source.Path, ResolveSourceRevision(resource.Source)), Array.Empty<AfError>());
    }

    public (RecoveryDraftSnapshot Snapshot, IReadOnlyList<AfError> Errors) CreateDraft(
        AfConfiguration configuration,
        string resourceKey,
        IReadOnlyList<RuntimeSourceFile> workoutFiles,
        RuntimeSourceFile machinesFile,
        RuntimeSourceFile gymsFile)
    {
        var resource = ResolveWorkoutResource(configuration, resourceKey, workoutFiles, machinesFile, gymsFile);
        if (resource is null)
        {
            return (new RecoveryDraftSnapshot("none", null), new[] { new AfError(AfErrorCodes.RecoveryResourceNotFound, "Recovery Resource was not found.", true) });
        }

        return CreateWorkoutDraft(configuration, resource.Source, resource.Inspection.Health == "broken");
    }

    public (RecoveryDraftSnapshot Snapshot, IReadOnlyList<AfError> Errors) UpdateDraft(
        AfConfiguration configuration,
        string resourceKey,
        RecoveryDraftUpdate update,
        IReadOnlyList<RuntimeSourceFile> workoutFiles,
        RuntimeSourceFile machinesFile,
        RuntimeSourceFile gymsFile)
    {
        var resource = ResolveWorkoutResource(configuration, resourceKey, workoutFiles, machinesFile, gymsFile);
        if (resource is null)
        {
            return (new RecoveryDraftSnapshot("none", null), new[] { new AfError(AfErrorCodes.RecoveryResourceNotFound, "Recovery Resource was not found.", true) });
        }

        if (update.ExpectedDraftRevision is null)
        {
            return (_store.Load(configuration, "WORKOUT", resource.Source.Path, ResolveSourceRevision(resource.Source)), new[] { new AfError(AfErrorCodes.RecoveryDraftConflict, "expectedDraftRevision is required.", true) });
        }

        return UpdateDraft(configuration, "WORKOUT", resource.Source.Path, ResolveSourceRevision(resource.Source), update);
    }

    public (RecoveryDraftSnapshot Snapshot, IReadOnlyList<AfError> Errors) DeleteDraft(
        AfConfiguration configuration,
        string resourceKey,
        IReadOnlyList<RuntimeSourceFile> workoutFiles,
        RuntimeSourceFile machinesFile,
        RuntimeSourceFile gymsFile)
    {
        var resource = ResolveWorkoutResource(configuration, resourceKey, workoutFiles, machinesFile, gymsFile);
        if (resource is null)
        {
            return (new RecoveryDraftSnapshot("none", null), new[] { new AfError(AfErrorCodes.RecoveryResourceNotFound, "Recovery Resource was not found.", true) });
        }

        var errors = _store.Delete(configuration, "WORKOUT", resource.Source.Path, ResolveSourceRevision(resource.Source));
        return errors.Count > 0
            ? (_store.Load(configuration, "WORKOUT", resource.Source.Path, ResolveSourceRevision(resource.Source)), errors)
            : (new RecoveryDraftSnapshot("none", null), Array.Empty<AfError>());
    }

    public (RecoveryValidationResult? Result, IReadOnlyList<AfError> Errors) ValidateDraft(
        AfConfiguration configuration,
        string resourceKey,
        IReadOnlyList<RuntimeSourceFile> workoutFiles,
        RuntimeSourceFile machinesFile,
        RuntimeSourceFile gymsFile)
    {
        var resource = ResolveWorkoutResourceForRead(configuration, resourceKey, workoutFiles, machinesFile, gymsFile);
        if (resource is null)
        {
            return (null, new[] { new AfError(AfErrorCodes.RecoveryResourceNotFound, "Recovery Resource was not found.", true) });
        }

        var draftSnapshot = _store.Load(configuration, "WORKOUT", resource.Source.Path, ResolveSourceRevision(resource.Source));
        if (draftSnapshot.State == "none" || draftSnapshot.Draft is null)
        {
            return (null, new[] { new AfError(AfErrorCodes.RecoveryDraftRequired, "Recovery Draft is required.", true) });
        }

        if (draftSnapshot.State == "stale")
        {
            return (null, new[] { new AfError(AfErrorCodes.RecoveryDraftStale, "Recovery Draft source revision is stale.", true) });
        }

        if (draftSnapshot.State == "incompatible")
        {
            return (null, new[] { new AfError(AfErrorCodes.RecoveryDraftIncompatible, "Recovery Draft schema is incompatible.", true) });
        }

        if (draftSnapshot.State == "corrupted")
        {
            return (null, new[] { new AfError(AfErrorCodes.RecoveryDraftCorrupted, "Recovery Draft is corrupted.", true) });
        }

        var draft = draftSnapshot.Draft;
        var unresolved = draft.Fields
            .Where(field => field["state"]?.GetValue<string>() == "unresolved")
            .Select(field => new ResourceIssue(
                "RECOVERY_FIELD_UNRESOLVED",
                "broken",
                "Recovery field is unresolved.",
                new ResourceIssueLocation(null, null, null, field["fieldPath"]?.GetValue<string>()),
                null))
            .ToArray();
        if (unresolved.Length > 0)
        {
            return (new RecoveryValidationResult(
                draft.SourceRevision,
                draft.DraftRevision,
                "broken",
                unresolved,
                false,
                draft.SourcePath,
                null,
                Array.Empty<string>(),
                null), Array.Empty<AfError>());
        }

        var candidate = BuildCandidateContent(draft);
        var replacementPath = DetermineReplacementPath(draft.SourcePath, candidate);
        var pathChange = string.Equals(replacementPath, draft.SourcePath, StringComparison.Ordinal)
            ? null
            : new RecoveryPathChange(draft.SourcePath, replacementPath);
        var candidateFile = new RuntimeSourceFile(replacementPath, candidate, draft.SourceRevision);
        var validation = _runtimeDataBuilder.Build(new[] { candidateFile }, machinesFile, gymsFile);
        var issues = validation.Errors.Select(error => new ResourceIssue(
            error.Code,
            "broken",
            error.Message,
            null,
            null)).Concat(validation.Warnings.Select(warning => new ResourceIssue(
            warning.Code,
            "warning",
            warning.Message,
            new ResourceIssueLocation(warning.Line, null, warning.SessionId, null),
            new JsonObject
            {
                ["referenceKind"] = warning.ReferenceKind,
                ["resolutionState"] = warning.ResolutionState,
                ["originalId"] = warning.OriginalId,
                ["resolvedId"] = warning.ResolvedId
            }))).ToList();

        var duplicateIssues = DuplicateIssues(candidateFile, workoutFiles.Where(file => file.Path != resource.Source.Path).ToArray(), machinesFile, gymsFile);
        issues.AddRange(duplicateIssues);
        var health = issues.Any(issue => issue.Severity == "broken") ? "broken" : issues.Count > 0 ? "degraded" : "healthy";
        return (new RecoveryValidationResult(
            draft.SourceRevision,
            draft.DraftRevision,
            health,
            issues,
            health is "healthy" or "degraded",
            replacementPath,
            candidate,
            new[] { "replacement candidate generated" },
            pathChange), Array.Empty<AfError>());
    }

    private IReadOnlyList<WorkoutRecoveryResource> InspectWorkoutResources(
        AfConfiguration configuration,
        IReadOnlyList<RuntimeSourceFile> workoutFiles,
        RuntimeSourceFile machinesFile,
        RuntimeSourceFile gymsFile) =>
        workoutFiles
            .OrderBy(file => file.Path, StringComparer.Ordinal)
            .Select(source =>
            {
                var result = _runtimeDataBuilder.Build(new[] { source }, machinesFile, gymsFile);
                var revision = ResolveSourceRevision(source);
                var issues = result.Errors.Select(error => new ResourceIssue(error.Code, "broken", error.Message, null, null))
                    .Concat(result.Warnings.Select(warning => new ResourceIssue(
                        warning.Code,
                        "warning",
                        warning.Message,
                        new ResourceIssueLocation(warning.Line, null, warning.SessionId, null),
                        new JsonObject
                        {
                            ["referenceKind"] = warning.ReferenceKind,
                            ["resolutionState"] = warning.ResolutionState,
                            ["originalId"] = warning.OriginalId,
                            ["resolvedId"] = warning.ResolvedId
                        })))
                    .ToArray();
                var health = issues.Any(issue => issue.Severity == "broken") ? "broken" : issues.Length > 0 ? "degraded" : "healthy";
                var inspection = new ResourceInspection(source.Path, revision, "WORKOUT", 1, health, issues);
                return new WorkoutRecoveryResource(source, BuildResourceKey(configuration, "WORKOUT", source.Path, revision), inspection);
            })
            .ToArray();

    private WorkoutRecoveryResource? ResolveWorkoutResource(
        AfConfiguration configuration,
        string resourceKey,
        IReadOnlyList<RuntimeSourceFile> workoutFiles,
        RuntimeSourceFile machinesFile,
        RuntimeSourceFile gymsFile) =>
        InspectWorkoutResources(configuration, workoutFiles, machinesFile, gymsFile)
            .FirstOrDefault(resource => resource.ResourceKey == resourceKey);

    private WorkoutRecoveryResource? ResolveWorkoutResourceForRead(
        AfConfiguration configuration,
        string resourceKey,
        IReadOnlyList<RuntimeSourceFile> workoutFiles,
        RuntimeSourceFile machinesFile,
        RuntimeSourceFile gymsFile)
    {
        var resources = InspectWorkoutResources(configuration, workoutFiles, machinesFile, gymsFile);
        var current = resources.FirstOrDefault(resource => resource.ResourceKey == resourceKey);
        if (current is not null)
        {
            return current;
        }

        var draft = _store.List(configuration)
            .FirstOrDefault(draft =>
                draft.ResourceType == "WORKOUT" &&
                BuildResourceKey(configuration, draft.ResourceType, draft.SourcePath, draft.SourceRevision) == resourceKey);
        if (draft is null)
        {
            return null;
        }

        return resources.FirstOrDefault(resource =>
            string.Equals(resource.Source.Path, draft.SourcePath, StringComparison.Ordinal));
    }

    private IReadOnlyList<ResourceIssue> DuplicateIssues(
        RuntimeSourceFile candidateFile,
        IReadOnlyList<RuntimeSourceFile> otherWorkoutFiles,
        RuntimeSourceFile machinesFile,
        RuntimeSourceFile gymsFile)
    {
        var candidate = _runtimeDataBuilder.Build(new[] { candidateFile }, machinesFile, gymsFile);
        var others = _runtimeDataBuilder.Build(otherWorkoutFiles, machinesFile, gymsFile);
        var otherSessionIds = new HashSet<string>(others.Sessions.Select(session => session.SessionId), StringComparer.Ordinal);
        return candidate.Sessions
            .Where(session => otherSessionIds.Contains(session.SessionId))
            .Select(session => new ResourceIssue(
                "RECOVERY_DUPLICATE_SESSION_ID",
                "broken",
                $"Duplicate session_id: {session.SessionId}.",
                new ResourceIssueLocation(null, null, session.SessionId, "/session_id"),
                null))
            .ToArray();
    }

    private static string BuildCandidateContent(RecoveryDraft draft)
    {
        var fields = draft.Fields.Where(field => field["state"]?.GetValue<string>() is "recovered" or "confirmed").ToArray();
        if (fields.Any(field => (field["fieldPath"]?.GetValue<string>() ?? "").StartsWith("/sessions/", StringComparison.Ordinal)))
        {
            var sessions = fields
                .Select(field => field["fieldPath"]?.GetValue<string>() ?? "")
                .Where(path => path.StartsWith("/sessions/", StringComparison.Ordinal))
                .Select(path => path.Split('/', StringSplitOptions.RemoveEmptyEntries)[1])
                .Distinct(StringComparer.Ordinal)
                .OrderBy(value => int.TryParse(value, out var parsed) ? parsed : int.MaxValue)
                .Select(index => BuildObjectFromFields(fields.Where(field => (field["fieldPath"]?.GetValue<string>() ?? "").StartsWith($"/sessions/{index}/", StringComparison.Ordinal)), $"/sessions/{index}"))
                .Select(SerializeRepositoryWorkoutLine);
            return string.Join("\n", sessions) + "\n";
        }

        return SerializeRepositoryWorkoutObject(BuildObjectFromFields(fields, "")) + "\n";
    }

    private static JsonObject BuildObjectFromFields(IEnumerable<JsonObject> fields, string prefix)
    {
        var values = new Dictionary<string, JsonNode?>(StringComparer.Ordinal);
        foreach (var field in fields.OrderBy(field => field["fieldPath"]?.GetValue<string>(), StringComparer.Ordinal))
        {
            var fieldPath = field["fieldPath"]?.GetValue<string>();
            if (string.IsNullOrWhiteSpace(fieldPath) || !field.ContainsKey("value"))
            {
                continue;
            }

            var key = prefix.Length == 0
                ? fieldPath.TrimStart('/')
                : fieldPath[(prefix.Length + 1)..];
            if (key.Contains('/', StringComparison.Ordinal) || key.Length == 0)
            {
                continue;
            }

            values[key] = field["value"]?.DeepClone();
        }

        var result = new JsonObject();
        foreach (var key in WorkoutFieldOrder)
        {
            if (values.Remove(key, out var value))
            {
                result[key] = value;
            }
        }

        foreach (var entry in values.OrderBy(entry => entry.Key, StringComparer.Ordinal))
        {
            result[entry.Key] = entry.Value;
        }

        return result;
    }

    private static string SerializeRepositoryWorkoutObject(JsonObject value) =>
        value.ToJsonString(AfJson.RepositoryWriteOptions).Replace("\r\n", "\n", StringComparison.Ordinal);

    private static string SerializeRepositoryWorkoutLine(JsonObject value) =>
        value.ToJsonString(AfJson.RepositoryJsonlWriteOptions);

    private static string DetermineReplacementPath(string sourcePath, string candidateContent)
    {
        if (!sourcePath.EndsWith(".json", StringComparison.OrdinalIgnoreCase) ||
            sourcePath.EndsWith(".jsonl", StringComparison.OrdinalIgnoreCase))
        {
            return sourcePath;
        }

        try
        {
            var date = JsonNode.Parse(candidateContent)?["date"]?.GetValue<string>()?.Trim();
            if (string.IsNullOrWhiteSpace(date) || !Regex.IsMatch(date, @"^\d{4}-\d{2}-\d{2}$"))
            {
                return sourcePath;
            }

            var normalized = sourcePath.Replace('\\', '/');
            var fileName = Path.GetFileName(normalized);
            var rewrittenFile = Regex.Replace(fileName, @"\d{4}-\d{2}-\d{2}", date, RegexOptions.CultureInvariant);
            if (rewrittenFile == fileName)
            {
                return sourcePath;
            }

            var directory = normalized[..^fileName.Length].TrimEnd('/');
            var segments = directory.Split('/', StringSplitOptions.RemoveEmptyEntries).ToList();
            if (segments.Count >= 2 &&
                Regex.IsMatch(segments[^2], @"^\d{4}$") &&
                Regex.IsMatch(segments[^1], @"^\d{2}$"))
            {
                segments[^2] = date[..4];
                segments[^1] = date[5..7];
                directory = string.Join("/", segments);
            }

            return directory.Length == 0 ? rewrittenFile : $"{directory}/{rewrittenFile}";
        }
        catch
        {
            return sourcePath;
        }
    }

    private static string BuildResourceKey(AfConfiguration configuration, string resourceType, string sourcePath, string sourceRevision)
    {
        var key = string.Join("|", configuration.Repository.Owner, configuration.Repository.Repository, configuration.Repository.Ref, configuration.Repository.RootPath, resourceType, sourcePath, sourceRevision);
        return Base64Url(SHA256.HashData(Encoding.UTF8.GetBytes(key)));
    }

    private static string Base64Url(byte[] bytes) =>
        Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');

    private sealed record WorkoutRecoveryResource(RuntimeSourceFile Source, string ResourceKey, ResourceInspection Inspection);

    public (RecoveryDraftSnapshot Snapshot, IReadOnlyList<AfError> Errors) CreateWorkoutDraft(
        AfConfiguration configuration,
        RuntimeSourceFile source,
        bool broken)
    {
        var sourceRevision = ResolveSourceRevision(source);
        var existing = _store.Load(configuration, "WORKOUT", source.Path, sourceRevision);
        if (existing.State == "active")
        {
            return (existing, Array.Empty<AfError>());
        }

        if (!broken)
        {
            return (new RecoveryDraftSnapshot("none", null), new[] { new AfError(AfErrorCodes.RecoveryResourceNotBroken, "Recovery Draft requires a Broken Resource.", true) });
        }

        var draft = new RecoveryDraft(
            1,
            source.Path,
            sourceRevision,
            "WORKOUT",
            1,
            1,
            ExtractWorkoutFields(source.Path, source.Content),
            Array.Empty<JsonObject>());
        var errors = _store.Save(configuration, draft);
        return errors.Count > 0
            ? (new RecoveryDraftSnapshot("none", null), errors)
            : (new RecoveryDraftSnapshot("active", draft), Array.Empty<AfError>());
    }

    public (RecoveryDraftSnapshot Snapshot, IReadOnlyList<AfError> Errors) UpdateDraft(
        AfConfiguration configuration,
        string resourceType,
        string sourcePath,
        string currentSourceRevision,
        RecoveryDraftUpdate update)
    {
        var existing = _store.Load(configuration, resourceType, sourcePath, currentSourceRevision);
        if (existing.State != "active" || existing.Draft is null)
        {
            return (existing, new[] { new AfError(AfErrorCodes.RecoveryDraftCorrupted, "Active Recovery Draft is unavailable.", true) });
        }

        if (update.ExpectedDraftRevision != existing.Draft.DraftRevision)
        {
            return (existing, new[] { new AfError(AfErrorCodes.RecoveryDraftConflict, "Recovery Draft was updated elsewhere.", true) });
        }

        var next = existing.Draft with
        {
            DraftRevision = existing.Draft.DraftRevision + 1,
            Fields = update.Fields ?? existing.Draft.Fields
        };
        var errors = _store.Save(configuration, next);
        return errors.Count > 0
            ? (existing, errors)
            : (new RecoveryDraftSnapshot("active", next), Array.Empty<AfError>());
    }

    public RecoveryDraftSnapshot LoadDraft(AfConfiguration configuration, string resourceType, string sourcePath, string currentSourceRevision) =>
        _store.Load(configuration, resourceType, sourcePath, currentSourceRevision);

    private static IReadOnlyList<JsonObject> ExtractWorkoutFields(string path, string content)
    {
        var lines = content.Split(new[] { "\r\n", "\n" }, StringSplitOptions.None)
            .Select((line, index) => new { Line = line, Index = index })
            .Where(item => !string.IsNullOrWhiteSpace(item.Line))
            .ToArray();
        if (path.EndsWith(".jsonl", StringComparison.OrdinalIgnoreCase))
        {
            return lines.SelectMany(item => ExtractWorkoutObjectFields(TryParseJsonObject(item.Line), $"/sessions/{item.Index}")).ToArray();
        }

        return ExtractWorkoutObjectFields(TryParseJsonObject(content), "").ToArray();
    }

    private static IEnumerable<JsonObject> ExtractWorkoutObjectFields(JsonObject? source, string prefix)
    {
        if (source is null)
        {
            return UnresolvedWorkoutFields(prefix);
        }

        return new[]
        {
            RecoverableField(source, $"{prefix}/schema_version", "schema_version", JsonValueKind.Number),
            RecoverableField(source, $"{prefix}/session_id", "session_id", JsonValueKind.String),
            RecoverableField(source, $"{prefix}/date", "date", JsonValueKind.String),
            RecoverableField(source, $"{prefix}/status", "status", JsonValueKind.String),
            RecoverableField(source, $"{prefix}/gym_id", "gym_id", JsonValueKind.String),
            RecoverableField(source, $"{prefix}/condition", "condition", JsonValueKind.Object, true),
            RecoverableField(source, $"{prefix}/machines", "machines", JsonValueKind.Array),
            RecoverableField(source, $"{prefix}/notes", "notes", JsonValueKind.Array, true)
        };
    }

    private static IEnumerable<JsonObject> UnresolvedWorkoutFields(string prefix) =>
        new[]
        {
            UnresolvedField($"{prefix}/schema_version"),
            UnresolvedField($"{prefix}/session_id"),
            UnresolvedField($"{prefix}/date"),
            UnresolvedField($"{prefix}/status"),
            UnresolvedField($"{prefix}/gym_id"),
            UnresolvedField($"{prefix}/machines"),
            RecoveredAbsentField($"{prefix}/condition"),
            RecoveredAbsentField($"{prefix}/notes")
        };

    private static JsonObject RecoverableField(JsonObject source, string fieldPath, string key, JsonValueKind kind, bool optional = false)
    {
        if (!source.TryGetPropertyValue(key, out var value))
        {
            return optional ? RecoveredAbsentField(fieldPath) : UnresolvedField(fieldPath);
        }

        var actualKind = value is null ? JsonValueKind.Null : value.GetValueKind();
        var matches = actualKind == kind || (optional && key == "condition" && actualKind == JsonValueKind.Null);
        return matches ? RecoveredField(fieldPath, value?.DeepClone()) : UnresolvedField(fieldPath);
    }

    private static JsonObject RecoveredField(string fieldPath, JsonNode? value) =>
        new()
        {
            ["fieldPath"] = fieldPath,
            ["state"] = "recovered",
            ["source"] = "original",
            ["value"] = value
        };

    private static JsonObject RecoveredAbsentField(string fieldPath) =>
        new()
        {
            ["fieldPath"] = fieldPath,
            ["state"] = "recovered",
            ["source"] = "original"
        };

    private static JsonObject UnresolvedField(string fieldPath) =>
        new()
        {
            ["fieldPath"] = fieldPath,
            ["state"] = "unresolved",
            ["source"] = "original"
        };

    private static JsonObject? TryParseJsonObject(string content)
    {
        try
        {
            return JsonNode.Parse(content)?.AsObject();
        }
        catch
        {
            return null;
        }
    }

    private static string ResolveSourceRevision(RuntimeSourceFile source)
    {
        if (!string.IsNullOrWhiteSpace(source.Revision))
        {
            return source.Revision;
        }

        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(source.Content));
        return "content-sha256-" + Convert.ToHexString(bytes).ToLowerInvariant();
    }
}

public sealed class RuntimeDataBuilder
{
    private static readonly HashSet<string> BodyParts = new(StringComparer.Ordinal)
    {
        "chest", "back", "legs", "shoulders", "arms", "glutes", "core", "cardio", "other"
    };

    public RuntimeBuildResult Build(IReadOnlyList<RuntimeSourceFile> workoutFiles, RuntimeSourceFile machinesFile, RuntimeSourceFile gymsFile)
    {
        var errors = new List<AfError>();
        var warnings = new List<RuntimeWarning>();
        var machines = ParseMachineMaster(machinesFile, errors);
        var gyms = ParseGymMaster(gymsFile, errors);
        if (machines.StructuralInvalid || gyms.StructuralInvalid)
        {
            // Master Resource の構造が読めない場合は、Record 単位の隔離対象にできないため
            // v2.1.0 と同じ whole-runtime fallback 境界へ戻す。
            return new RuntimeBuildResult(Array.Empty<WorkoutSession>(), errors, warnings, true);
        }

        if (workoutFiles.Count == 0)
        {
            errors.Add(new AfError(AfErrorCodes.RuntimeDataEmpty, "Workout resource is empty.", true));
            return new RuntimeBuildResult(Array.Empty<WorkoutSession>(), errors, warnings, true);
        }

        var sessions = new List<WorkoutSession>();
        foreach (var file in workoutFiles.OrderBy(file => file.Path, StringComparer.Ordinal))
        {
            var resourceSessions = new List<WorkoutSession>();
            var resourceErrors = new List<AfError>();
            var resourceWarnings = new List<RuntimeWarning>();
            if (file.Path.EndsWith(".jsonl", StringComparison.OrdinalIgnoreCase))
            {
                var lineNo = 0;
                foreach (var line in file.Content.Split(new[] { "\r\n", "\n" }, StringSplitOptions.None))
                {
                    lineNo++;
                    if (string.IsNullOrWhiteSpace(line)) continue;
                    var parsed = BuildSession(file.Path, lineNo, line, machines, gyms, resourceErrors, resourceWarnings);
                    if (parsed.Session is not null) resourceSessions.Add(parsed.Session);
                }
            }
            else if (file.Path.EndsWith(".json", StringComparison.OrdinalIgnoreCase))
            {
                var parsed = BuildSession(file.Path, null, file.Content, machines, gyms, resourceErrors, resourceWarnings);
                if (parsed.Session is not null) resourceSessions.Add(parsed.Session);
            }

            if (resourceErrors.Count > 0)
            {
                errors.AddRange(resourceErrors);
            }
            else
            {
                sessions.AddRange(resourceSessions);
                warnings.AddRange(resourceWarnings);
            }
        }

        return new RuntimeBuildResult(sessions, errors, warnings, false);
    }

    public (WorkoutSession? Session, bool TechnicalInvalid) BuildSingleSessionForTest(string json, string path = "test.json")
    {
        var machines = new MasterRecordCatalog<MachineMasterItem>(
            new Dictionary<string, MachineMasterItem>(StringComparer.Ordinal)
            {
                ["known-machine"] = new("known-machine", Array.Empty<string>(), "Known Machine", "chest", false)
            },
            new HashSet<string>(StringComparer.Ordinal),
            false);
        var gyms = new MasterRecordCatalog<GymMasterItem>(
            new Dictionary<string, GymMasterItem>(StringComparer.Ordinal)
            {
                ["known-gym"] = new("known-gym", Array.Empty<string>(), "Known Gym", "KG", false)
            },
            new HashSet<string>(StringComparer.Ordinal),
            false);
        var errors = new List<AfError>();
        var warnings = new List<RuntimeWarning>();
        return BuildSession(path, null, json, machines, gyms, errors, warnings);
    }

    private static MasterRecordCatalog<MachineMasterItem> ParseMachineMaster(RuntimeSourceFile file, List<AfError> errors)
    {
        try
        {
            using var document = JsonDocument.Parse(file.Content);
            var root = document.RootElement;
            if (!TryGetInt(root, "schema_version", out _) || !root.TryGetProperty("machines", out var items) || items.ValueKind != JsonValueKind.Array)
            {
                errors.Add(new AfError(AfErrorCodes.RuntimeDataInvalid, $"{file.Path}: Machine master contract is invalid.", false));
                return MasterRecordCatalog<MachineMasterItem>.StructuralFailure();
            }

            var candidates = new List<MachineMasterItem>();
            var excludedIds = new HashSet<string>(StringComparer.Ordinal);
            foreach (var item in items.EnumerateArray())
            {
                if (!TryGetString(item, "machine_id", out var id) ||
                    !TryGetString(item, "name", out var name) ||
                    !TryGetString(item, "body_part", out var bodyPart) ||
                    !BodyParts.Contains(bodyPart) ||
                    !TryGetBool(item, "active", out _))
                {
                    errors.Add(new AfError(AfErrorCodes.RuntimeDataInvalid, $"{file.Path}: Machine master item is invalid.", false));
                    AddRecoverableMasterKeys(item, "machine_id", excludedIds);
                    continue;
                }

                var deleted = TryGetOptionalBool(item, "deleted") ?? false;
                candidates.Add(new MachineMasterItem(id, ReadStringArray(item, "source_ids"), name, bodyPart, deleted));
            }

            return BuildMasterCatalog(candidates, record => record.Id, record => record.SourceIds, excludedIds, file.Path, "Machine", errors);
        }
        catch
        {
            errors.Add(new AfError(AfErrorCodes.RuntimeDataInvalid, $"{file.Path}: Machine master JSON is invalid.", false));
            return MasterRecordCatalog<MachineMasterItem>.StructuralFailure();
        }
    }

    private static MasterRecordCatalog<GymMasterItem> ParseGymMaster(RuntimeSourceFile file, List<AfError> errors)
    {
        try
        {
            using var document = JsonDocument.Parse(file.Content);
            var root = document.RootElement;
            if (!TryGetInt(root, "schema_version", out _) || !root.TryGetProperty("gyms", out var items) || items.ValueKind != JsonValueKind.Array)
            {
                errors.Add(new AfError(AfErrorCodes.RuntimeDataInvalid, $"{file.Path}: Gym master contract is invalid.", false));
                return MasterRecordCatalog<GymMasterItem>.StructuralFailure();
            }

            var candidates = new List<GymMasterItem>();
            var excludedIds = new HashSet<string>(StringComparer.Ordinal);
            foreach (var item in items.EnumerateArray())
            {
                if (!TryGetString(item, "gym_id", out var id) ||
                    !TryGetString(item, "name", out var name) ||
                    !TryGetBool(item, "active", out _))
                {
                    errors.Add(new AfError(AfErrorCodes.RuntimeDataInvalid, $"{file.Path}: Gym master item is invalid.", false));
                    AddRecoverableMasterKeys(item, "gym_id", excludedIds);
                    continue;
                }

                TryGetString(item, "short_name", out var shortName);
                var deleted = TryGetOptionalBool(item, "deleted") ?? false;
                candidates.Add(new GymMasterItem(id, ReadStringArray(item, "source_ids"), name, shortName, deleted));
            }

            return BuildMasterCatalog(candidates, record => record.Id, record => record.SourceIds, excludedIds, file.Path, "Gym", errors);
        }
        catch
        {
            errors.Add(new AfError(AfErrorCodes.RuntimeDataInvalid, $"{file.Path}: Gym master JSON is invalid.", false));
            return MasterRecordCatalog<GymMasterItem>.StructuralFailure();
        }
    }

    private static MasterRecordCatalog<T> BuildMasterCatalog<T>(
        IReadOnlyList<T> candidates,
        Func<T, string> idSelector,
        Func<T, IReadOnlyList<string>> sourceIdsSelector,
        HashSet<string> excludedIds,
        string filePath,
        string label,
        List<AfError> errors)
    {
        var ownersByKey = new Dictionary<string, List<T>>(StringComparer.Ordinal);
        foreach (var candidate in candidates)
        {
            foreach (var key in CandidateKeys(idSelector(candidate), sourceIdsSelector(candidate)))
            {
                if (!ownersByKey.TryGetValue(key, out var owners))
                {
                    owners = new List<T>();
                    ownersByKey[key] = owners;
                }
                owners.Add(candidate);
            }
        }

        var excludedRecords = new HashSet<T>();
        foreach (var (key, owners) in ownersByKey)
        {
            if (owners.Count <= 1) continue;
            errors.Add(new AfError(AfErrorCodes.RuntimeDataInvalid, $"{filePath}: {label} master duplicate reference key is excluded: {key}.", false));
            foreach (var owner in owners)
            {
                excludedRecords.Add(owner);
            }
        }

        var lookup = new Dictionary<string, T>(StringComparer.Ordinal);
        foreach (var candidate in candidates)
        {
            var keys = CandidateKeys(idSelector(candidate), sourceIdsSelector(candidate));
            if (excludedRecords.Contains(candidate))
            {
                foreach (var key in keys) excludedIds.Add(key);
                continue;
            }

            foreach (var key in keys) lookup[key] = candidate;
        }

        return new MasterRecordCatalog<T>(lookup, excludedIds, false);
    }

    private static IReadOnlyList<string> CandidateKeys(string id, IReadOnlyList<string> sourceIds) =>
        new[] { id }.Concat(sourceIds).Where(value => !string.IsNullOrWhiteSpace(value)).Distinct(StringComparer.Ordinal).ToArray();

    private static void AddRecoverableMasterKeys(JsonElement item, string idField, HashSet<string> excludedIds)
    {
        if (TryGetString(item, idField, out var id)) excludedIds.Add(id);
        foreach (var sourceId in ReadStringArray(item, "source_ids")) excludedIds.Add(sourceId);
    }

    private static (WorkoutSession? Session, bool TechnicalInvalid) BuildSession(
        string filePath,
        int? line,
        string content,
        MasterRecordCatalog<MachineMasterItem> machines,
        MasterRecordCatalog<GymMasterItem> gyms,
        List<AfError> errors,
        List<RuntimeWarning> warnings)
    {
        JsonDocument document;
        try
        {
            document = JsonDocument.Parse(content);
        }
        catch
        {
            errors.Add(new AfError(AfErrorCodes.RuntimeDataInvalid, Location(filePath, line) + "Workout JSON is invalid.", false));
            return (null, true);
        }

        using (document)
        {
            var root = document.RootElement;
            if (root.ValueKind != JsonValueKind.Object ||
                !TryGetInt(root, "schema_version", out var schemaVersion) ||
                !TryGetString(root, "session_id", out var sessionId) ||
                !TryGetString(root, "date", out var date) ||
                !DateOnly.TryParse(date, out _) ||
                !TryGetString(root, "status", out var status) ||
                status is not ("complete" or "partial") ||
                !TryGetString(root, "gym_id", out var gymId) ||
                !root.TryGetProperty("machines", out var machineItems) ||
                machineItems.ValueKind != JsonValueKind.Array)
            {
                errors.Add(new AfError(AfErrorCodes.RuntimeDataInvalid, Location(filePath, line) + "Workout required fields are invalid.", false));
                return (null, true);
            }

            if (status == "complete" && machineItems.GetArrayLength() == 0)
            {
                errors.Add(new AfError(AfErrorCodes.RuntimeDataInvalid, Location(filePath, line) + "Complete workout session requires machines.", false));
                return (null, true);
            }

            gyms.Lookup.TryGetValue(gymId, out var gymMaster);
            var gymInvalidExcluded = gymMaster is null && gyms.ExcludedIds.Contains(gymId);
            if (gymMaster is null || gymMaster.Deleted)
            {
                warnings.Add(MasterReferenceSemantics.CreateWarning("gym", gymId, gymMaster?.Id, gymMaster?.Deleted ?? false, gymInvalidExcluded, sessionId, filePath, line));
            }

            var workoutMachines = new List<WorkoutMachine>();
            foreach (var machineItem in machineItems.EnumerateArray())
            {
                var parsed = BuildMachine(filePath, line, machineItem, machines, errors, warnings, sessionId);
                if (parsed.TechnicalInvalid) return (null, true);
                if (parsed.Machine is not null) workoutMachines.Add(parsed.Machine);
            }

            if (status == "complete" && workoutMachines.Count == 0)
            {
                errors.Add(new AfError(AfErrorCodes.RuntimeDataInvalid, Location(filePath, line) + "Complete workout session requires valid machines.", false));
                return (null, true);
            }

            var session = new WorkoutSession(
                schemaVersion,
                sessionId,
                date,
                status,
                new Gym(
                    gymMaster?.Id ?? gymId,
                    gymMaster is not null && !gymMaster.Deleted ? gymMaster.Name : null,
                    gymMaster is not null && !gymMaster.Deleted ? gymMaster.ShortName : null,
                    MasterReferenceSemantics.Resolve(gymId, gymMaster?.Id, gymMaster?.Deleted ?? false, gymInvalidExcluded)),
                ReadCondition(root),
                workoutMachines,
                ReadStringArray(root, "notes"));
            return (session, false);
        }
    }

    private static (WorkoutMachine? Machine, bool TechnicalInvalid) BuildMachine(
        string filePath,
        int? line,
        JsonElement item,
        MasterRecordCatalog<MachineMasterItem> masters,
        List<AfError> errors,
        List<RuntimeWarning> warnings,
        string sessionId)
    {
        if (item.ValueKind != JsonValueKind.Object ||
            !TryGetString(item, "machine_id", out var machineId) ||
            !item.TryGetProperty("sets", out var setItems) ||
            setItems.ValueKind != JsonValueKind.Array ||
            setItems.GetArrayLength() == 0)
        {
            errors.Add(new AfError(AfErrorCodes.RuntimeDataInvalid, Location(filePath, line) + "Machine required fields are invalid.", false));
            return (null, true);
        }

        masters.Lookup.TryGetValue(machineId, out var master);
        var invalidExcluded = master is null && masters.ExcludedIds.Contains(machineId);
        if (master is null || master.Deleted)
        {
            warnings.Add(MasterReferenceSemantics.CreateWarning("machine", machineId, master?.Id, master?.Deleted ?? false, invalidExcluded, sessionId, filePath, line));
        }

        var sets = new List<MachineSet>();
        foreach (var setItem in setItems.EnumerateArray())
        {
            if (setItem.ValueKind != JsonValueKind.Object ||
                !TryGetInt(setItem, "set", out var setNumber) ||
                !TryGetDecimal(setItem, "weight_kg", out var weightKg) ||
                !TryGetInt(setItem, "reps", out var reps))
            {
                errors.Add(new AfError(AfErrorCodes.RuntimeDataInvalid, Location(filePath, line) + $"Set in machine {machineId} is invalid.", false));
                return (null, true);
            }

            sets.Add(new MachineSet(
                setNumber,
                weightKg,
                reps,
                TryGetNullableDecimal(setItem, "rir"),
                TryGetNullableBool(setItem, "failure"),
                TryGetNullableBool(setItem, "warmup"),
                TryGetOptionalString(setItem, "note")));
        }

        return (new WorkoutMachine(
            master?.Id ?? machineId,
            master is not null && !master.Deleted ? master.Name : null,
            master is not null && !master.Deleted ? master.BodyPart : null,
            MasterReferenceSemantics.Resolve(machineId, master?.Id, master?.Deleted ?? false, invalidExcluded),
            sets,
            ReadStringArray(item, "notes")), false);
    }

    private static SessionCondition? ReadCondition(JsonElement root)
    {
        if (!root.TryGetProperty("condition", out var condition) || condition.ValueKind != JsonValueKind.Object)
        {
            return null;
        }

        return new SessionCondition(
            TryGetNullableDecimal(condition, "fatigue"),
            TryGetNullableDecimal(condition, "motivation"),
            TryGetNullableDecimal(condition, "sleep"),
            ReadNullableStringArray(condition, "soreness"),
            TryGetOptionalString(condition, "performance"),
            ReadNullableStringArray(condition, "notes"));
    }

    private static string Location(string filePath, int? line) => line is null ? $"{filePath}: " : $"{filePath}:{line}: ";

    private static bool TryGetString(JsonElement element, string name, out string value)
    {
        value = "";
        return element.TryGetProperty(name, out var property) && property.ValueKind == JsonValueKind.String && !string.IsNullOrWhiteSpace(value = property.GetString() ?? "");
    }

    private static string? TryGetOptionalString(JsonElement element, string name) =>
        element.TryGetProperty(name, out var property) && property.ValueKind == JsonValueKind.String ? property.GetString() : null;

    private static bool TryGetInt(JsonElement element, string name, out int value)
    {
        value = 0;
        return element.TryGetProperty(name, out var property) && property.ValueKind == JsonValueKind.Number && property.TryGetInt32(out value);
    }

    private static bool TryGetDecimal(JsonElement element, string name, out decimal value)
    {
        value = 0;
        return element.TryGetProperty(name, out var property) && property.ValueKind == JsonValueKind.Number && property.TryGetDecimal(out value);
    }

    private static bool TryGetBool(JsonElement element, string name, out bool value)
    {
        value = false;
        return element.TryGetProperty(name, out var property) && (property.ValueKind == JsonValueKind.True || property.ValueKind == JsonValueKind.False) && (value = property.GetBoolean()) == value;
    }

    private static bool? TryGetOptionalBool(JsonElement element, string name)
    {
        if (!element.TryGetProperty(name, out var property)) return null;
        return property.ValueKind is JsonValueKind.True or JsonValueKind.False ? property.GetBoolean() : null;
    }

    private static decimal? TryGetNullableDecimal(JsonElement element, string name)
    {
        if (!element.TryGetProperty(name, out var property) || property.ValueKind == JsonValueKind.Null) return null;
        return property.ValueKind == JsonValueKind.Number && property.TryGetDecimal(out var value) ? value : null;
    }

    private static bool? TryGetNullableBool(JsonElement element, string name)
    {
        if (!element.TryGetProperty(name, out var property) || property.ValueKind == JsonValueKind.Null) return null;
        return property.ValueKind is JsonValueKind.True or JsonValueKind.False ? property.GetBoolean() : null;
    }

    private static IReadOnlyList<string> ReadStringArray(JsonElement element, string name) =>
        ReadNullableStringArray(element, name) ?? Array.Empty<string>();

    private static IReadOnlyList<string>? ReadNullableStringArray(JsonElement element, string name)
    {
        if (!element.TryGetProperty(name, out var property) || property.ValueKind == JsonValueKind.Null) return null;
        if (property.ValueKind != JsonValueKind.Array) return Array.Empty<string>();
        return property.EnumerateArray()
            .Where(item => item.ValueKind == JsonValueKind.String)
            .Select(item => item.GetString() ?? "")
            .Where(value => value.Length > 0)
            .ToArray();
    }

    private sealed record MasterRecordCatalog<T>(Dictionary<string, T> Lookup, HashSet<string> ExcludedIds, bool StructuralInvalid)
    {
        public static MasterRecordCatalog<T> StructuralFailure() =>
            new(new Dictionary<string, T>(StringComparer.Ordinal), new HashSet<string>(StringComparer.Ordinal), true);
    }

    private sealed record MachineMasterItem(string Id, IReadOnlyList<string> SourceIds, string Name, string BodyPart, bool Deleted);
    private sealed record GymMasterItem(string Id, IReadOnlyList<string> SourceIds, string Name, string? ShortName, bool Deleted);
}

public static class MasterWriteValidator
{
    private static readonly HashSet<string> BodyParts = new(StringComparer.Ordinal)
    {
        "chest", "back", "legs", "shoulders", "arms", "glutes", "core", "cardio", "other"
    };

    public static IReadOnlyList<AfError> ValidateWholeMaster(string machineMasterContent, string gymMasterContent)
    {
        var errors = new List<AfError>();
        ValidateMachineMaster(machineMasterContent, errors);
        ValidateGymMaster(gymMasterContent, errors);
        return errors;
    }

    private static void ValidateMachineMaster(string content, List<AfError> errors)
    {
        try
        {
            using var document = JsonDocument.Parse(content);
            var root = document.RootElement;
            if (!TryGetInt(root, "schema_version", out var schemaVersion) || schemaVersion != 1 ||
                !root.TryGetProperty("machines", out var machines) || machines.ValueKind != JsonValueKind.Array)
            {
                errors.Add(new AfError(AfErrorCodes.MasterWriteInvalid, "Machine master contract is invalid.", true));
                return;
            }

            var ids = new HashSet<string>(StringComparer.Ordinal);
            foreach (var machine in machines.EnumerateArray())
            {
                if (!TryGetString(machine, "machine_id", out var id) ||
                    !TryGetString(machine, "name", out _) ||
                    !TryGetString(machine, "body_part", out var bodyPart) ||
                    !BodyParts.Contains(bodyPart) ||
                    !TryGetBool(machine, "active", out _) ||
                    !TryGetBool(machine, "deleted", out _) ||
                    !machine.TryGetProperty("aliases", out var aliases) ||
                    aliases.ValueKind != JsonValueKind.Array)
                {
                    errors.Add(new AfError(AfErrorCodes.MasterWriteInvalid, "Machine master item is invalid.", true));
                    return;
                }

                if (!ids.Add(id))
                {
                    errors.Add(new AfError(AfErrorCodes.MasterWriteInvalid, $"Duplicate machine_id: {id}.", true));
                    return;
                }

                foreach (var sourceId in ReadStringArray(machine, "source_ids"))
                {
                    if (!ids.Add(sourceId))
                    {
                        errors.Add(new AfError(AfErrorCodes.MasterWriteInvalid, $"Duplicate machine source_id: {sourceId}.", true));
                        return;
                    }
                }
            }
        }
        catch (JsonException)
        {
            errors.Add(new AfError(AfErrorCodes.MasterWriteInvalid, "Machine master JSON is invalid.", true));
        }
    }

    private static void ValidateGymMaster(string content, List<AfError> errors)
    {
        try
        {
            using var document = JsonDocument.Parse(content);
            var root = document.RootElement;
            if (!TryGetInt(root, "schema_version", out var schemaVersion) || schemaVersion != 1 ||
                !root.TryGetProperty("gyms", out var gyms) || gyms.ValueKind != JsonValueKind.Array)
            {
                errors.Add(new AfError(AfErrorCodes.MasterWriteInvalid, "Gym master contract is invalid.", true));
                return;
            }

            var ids = new HashSet<string>(StringComparer.Ordinal);
            var mainGymCount = 0;
            foreach (var gym in gyms.EnumerateArray())
            {
                if (!TryGetString(gym, "gym_id", out var id) ||
                    !TryGetString(gym, "name", out _) ||
                    !TryGetBool(gym, "active", out var active) ||
                    !TryGetBool(gym, "deleted", out var deleted) ||
                    !TryGetBool(gym, "main", out var main))
                {
                    errors.Add(new AfError(AfErrorCodes.MasterWriteInvalid, "Gym master item is invalid.", true));
                    return;
                }

                if (!ids.Add(id))
                {
                    errors.Add(new AfError(AfErrorCodes.MasterWriteInvalid, $"Duplicate gym_id: {id}.", true));
                    return;
                }

                foreach (var sourceId in ReadStringArray(gym, "source_ids"))
                {
                    if (!ids.Add(sourceId))
                    {
                        errors.Add(new AfError(AfErrorCodes.MasterWriteInvalid, $"Duplicate gym source_id: {sourceId}.", true));
                        return;
                    }
                }

                if (!main)
                {
                    continue;
                }

                mainGymCount++;
                if (!active || deleted)
                {
                    errors.Add(new AfError(AfErrorCodes.MasterWriteInvalid, "Main gym must be active and not logically deleted.", true));
                    return;
                }
            }

            if (mainGymCount > 1)
            {
                errors.Add(new AfError(AfErrorCodes.MasterWriteInvalid, "Gym master must have at most one main gym.", true));
            }
        }
        catch (JsonException)
        {
            errors.Add(new AfError(AfErrorCodes.MasterWriteInvalid, "Gym master JSON is invalid.", true));
        }
    }

    private static bool TryGetString(JsonElement element, string property, out string value)
    {
        value = "";
        if (!element.TryGetProperty(property, out var child) || child.ValueKind != JsonValueKind.String)
        {
            return false;
        }

        value = child.GetString()?.Trim() ?? "";
        return value.Length > 0;
    }

    private static bool TryGetInt(JsonElement element, string property, out int value)
    {
        value = 0;
        return element.TryGetProperty(property, out var child) && child.ValueKind == JsonValueKind.Number && child.TryGetInt32(out value);
    }

    private static bool TryGetBool(JsonElement element, string property, out bool value)
    {
        value = false;
        if (!element.TryGetProperty(property, out var child) ||
            (child.ValueKind != JsonValueKind.True && child.ValueKind != JsonValueKind.False))
        {
            return false;
        }

        value = child.GetBoolean();
        return true;
    }

    private static IReadOnlyList<string> ReadStringArray(JsonElement element, string property)
    {
        if (!element.TryGetProperty(property, out var child) || child.ValueKind != JsonValueKind.Array)
        {
            return Array.Empty<string>();
        }

        return child.EnumerateArray()
            .Where(item => item.ValueKind == JsonValueKind.String)
            .Select(item => item.GetString()?.Trim() ?? "")
            .Where(value => value.Length > 0)
            .ToArray();
    }
}

public sealed class GithubAccessService
{
    private static readonly IReadOnlyDictionary<string, string> MasterWriteTargets =
        new Dictionary<string, string>(StringComparer.Ordinal)
        {
            ["MACHINE_MASTER"] = "master/machines.json",
            ["GYM_MASTER"] = "master/gyms.json"
        };

    private readonly HttpClient _httpClient;

    public GithubAccessService()
        : this(new HttpClient())
    {
    }

    public GithubAccessService(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public async Task<(IReadOnlyList<RuntimeSourceFile> Files, IReadOnlyList<AfError> Errors)> FetchAsync(
        AfConfiguration configuration,
        string? token,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(configuration.Repository.Owner) || string.IsNullOrWhiteSpace(configuration.Repository.Repository))
        {
            return (Array.Empty<RuntimeSourceFile>(), new[] { new AfError(AfErrorCodes.ConfigRequired, "Repository configuration is required.", true) });
        }

        try
        {
            using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            timeoutCts.CancelAfter(TimeSpan.FromSeconds(configuration.Timeouts.GithubRequestTimeoutSec));
            var files = new List<RuntimeSourceFile>();
            var errors = new List<AfError>();

            foreach (var resource in configuration.Resources)
            {
                var fetched = resource.ResourceKind == "directory"
                    ? await FetchDirectoryAsync(configuration, resource, token, timeoutCts.Token)
                    : await FetchFileAsync(configuration, resource.Path, token, timeoutCts.Token);

                if (fetched.Errors.Count > 0)
                {
                    errors.AddRange(fetched.Errors);
                    if (resource.Required)
                    {
                        return (Array.Empty<RuntimeSourceFile>(), errors);
                    }
                }

                if (!resource.EmptyAllowed && fetched.Files.Count == 0)
                {
                    errors.Add(new AfError(AfErrorCodes.RuntimeDataEmpty, $"{resource.Path} is empty.", true));
                    if (resource.Required)
                    {
                        return (Array.Empty<RuntimeSourceFile>(), errors);
                    }
                }

                files.AddRange(fetched.Files);
            }

            return (files, errors);
        }
        catch (OperationCanceledException)
        {
            return (Array.Empty<RuntimeSourceFile>(), new[] { new AfError(AfErrorCodes.GithubTimeout, "GitHub access timed out.", true) });
        }
        catch (HttpRequestException)
        {
            return (Array.Empty<RuntimeSourceFile>(), new[] { new AfError(AfErrorCodes.GithubConnectionFailed, "GitHub connection failed.", true) });
        }
    }

    public async Task<IReadOnlyList<AfError>> CheckAsync(AfConfiguration configuration, string? token, CancellationToken cancellationToken)
    {
        var (_, errors) = await FetchAsync(configuration, token, cancellationToken);
        return errors;
    }

    public async Task<(IReadOnlyList<RuntimeSourceFile> Files, IReadOnlyList<AfError> Errors)> FetchWorkoutFilesAsync(
        AfConfiguration configuration,
        string? token,
        CancellationToken cancellationToken)
    {
        try
        {
            using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            timeoutCts.CancelAfter(TimeSpan.FromSeconds(configuration.Timeouts.GithubRequestTimeoutSec));
            var files = new List<RuntimeSourceFile>();
            var errors = new List<AfError>();
            foreach (var resource in configuration.Resources.Where(resource => resource.Type == "WORKOUT"))
            {
                var fetched = resource.ResourceKind == "directory"
                    ? await FetchDirectoryAsync(configuration, resource, token, timeoutCts.Token)
                    : await FetchFileAsync(configuration, resource.Path, token, timeoutCts.Token);
                if (fetched.Errors.Count > 0)
                {
                    errors.AddRange(fetched.Errors);
                    if (resource.Required) return (Array.Empty<RuntimeSourceFile>(), errors);
                }
                files.AddRange(fetched.Files);
            }

            return errors.Count == 0 ? (files, errors) : (Array.Empty<RuntimeSourceFile>(), errors);
        }
        catch (OperationCanceledException)
        {
            return (Array.Empty<RuntimeSourceFile>(), new[] { new AfError(AfErrorCodes.GithubTimeout, "GitHub access timed out.", true) });
        }
        catch (HttpRequestException)
        {
            return (Array.Empty<RuntimeSourceFile>(), new[] { new AfError(AfErrorCodes.GithubConnectionFailed, "GitHub connection failed.", true) });
        }
    }

    public async Task<(MasterDocumentSnapshot? Document, IReadOnlyList<AfError> Errors)> ReadMasterDocumentAsync(
        AfConfiguration configuration,
        string? token,
        string type,
        CancellationToken cancellationToken)
    {
        if (!TryGetMasterWriteTarget(type, out var target))
        {
            return (null, new[] { new AfError(AfErrorCodes.MasterWriteInvalid, "Master write target is not allowed.", true) });
        }

        try
        {
            using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            timeoutCts.CancelAfter(TimeSpan.FromSeconds(configuration.Timeouts.GithubRequestTimeoutSec));
            var fullPath = CombineRemote(configuration.Repository.RootPath, target);
            var remote = await ReadGithubContentAsync(configuration, fullPath, token, timeoutCts.Token);
            if (remote.Errors.Count > 0)
            {
                return (null, remote.Errors);
            }

            var content = DecodeGithubContent(remote.Content!);
            if (content is null)
            {
                return (null, new[] { new AfError(AfErrorCodes.GithubServerError, "GitHub contents response is invalid.", true) });
            }

            return (new MasterDocumentSnapshot(type, target, remote.Revision!, content), Array.Empty<AfError>());
        }
        catch (OperationCanceledException)
        {
            return (null, new[] { new AfError(AfErrorCodes.GithubTimeout, "GitHub access timed out.", true) });
        }
        catch (HttpRequestException)
        {
            return (null, new[] { new AfError(AfErrorCodes.GithubConnectionFailed, "GitHub connection failed.", true) });
        }
    }

    public async Task<(string? Revision, IReadOnlyList<AfError> Errors)> ReadMasterDocumentRevisionAsync(
        AfConfiguration configuration,
        string? token,
        string type,
        CancellationToken cancellationToken)
    {
        if (!TryGetMasterWriteTarget(type, out var target))
        {
            return (null, new[] { new AfError(AfErrorCodes.MasterWriteInvalid, "Master write target is not allowed.", true) });
        }

        try
        {
            using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            timeoutCts.CancelAfter(TimeSpan.FromSeconds(configuration.Timeouts.GithubRequestTimeoutSec));
            var fullPath = CombineRemote(configuration.Repository.RootPath, target);
            var remote = await ReadGithubContentAsync(configuration, fullPath, token, timeoutCts.Token);
            return remote.Errors.Count > 0 ? (null, remote.Errors) : (remote.Revision, Array.Empty<AfError>());
        }
        catch (OperationCanceledException)
        {
            return (null, new[] { new AfError(AfErrorCodes.GithubTimeout, "GitHub access timed out.", true) });
        }
        catch (HttpRequestException)
        {
            return (null, new[] { new AfError(AfErrorCodes.GithubConnectionFailed, "GitHub connection failed.", true) });
        }
    }

    public async Task<(MasterDocumentWriteResult? Result, IReadOnlyList<AfError> Errors)> SaveMasterDocumentAsync(
        AfConfiguration configuration,
        string? token,
        string type,
        string expectedRevision,
        string content,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(expectedRevision) || string.IsNullOrWhiteSpace(content))
        {
            return (null, new[] { new AfError(AfErrorCodes.MasterWriteInvalid, "Master document write request is invalid.", true) });
        }

        if (!TryGetMasterWriteTarget(type, out var target))
        {
            return (null, new[] { new AfError(AfErrorCodes.MasterWriteInvalid, "Master write target is not allowed.", true) });
        }

        try
        {
            using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            timeoutCts.CancelAfter(TimeSpan.FromSeconds(configuration.Timeouts.GithubRequestTimeoutSec));
            var fullPath = CombineRemote(configuration.Repository.RootPath, target);
            var remote = await ReadGithubContentAsync(configuration, fullPath, token, timeoutCts.Token);
            if (remote.Errors.Count > 0)
            {
                return (null, remote.Errors);
            }

            if (!string.Equals(remote.Revision, expectedRevision, StringComparison.Ordinal))
            {
                return (null, new[] { new AfError(AfErrorCodes.MasterSyncRequired, "Master document must be synchronized before saving.", true) });
            }

            var lifecycleErrors = ValidateMasterLifecycleTransition(type, remote.Content!, content);
            if (lifecycleErrors.Count > 0)
            {
                return (null, lifecycleErrors);
            }

            var other = await ReadOtherMasterDocumentAsync(configuration, token, type, timeoutCts.Token);
            if (other.Errors.Count > 0)
            {
                return (null, other.Errors);
            }

            var validationErrors = type == "MACHINE_MASTER"
                ? MasterWriteValidator.ValidateWholeMaster(content, other.Content!)
                : MasterWriteValidator.ValidateWholeMaster(other.Content!, content);
            if (validationErrors.Count > 0)
            {
                return (null, validationErrors);
            }

            var contentsUrl = $"https://api.github.com/repos/{configuration.Repository.Owner}/{configuration.Repository.Repository}/contents/{EscapeRemotePath(fullPath)}";
            using var request = CreateRequest(contentsUrl, token, HttpMethod.Put);
            var payload = new
            {
                message = BuildMasterCommitMessage(type, target),
                content = Convert.ToBase64String(Encoding.UTF8.GetBytes(content)),
                sha = remote.Revision,
                branch = configuration.Repository.Ref
            };
            request.Content = new StringContent(JsonSerializer.Serialize(payload, AfJson.Options), Encoding.UTF8, "application/json");
            using var response = await _httpClient.SendAsync(request, timeoutCts.Token);
            if (!response.IsSuccessStatusCode)
            {
                return (null, new[] { response.StatusCode == HttpStatusCode.Conflict
                    ? new AfError(AfErrorCodes.MasterSyncRequired, "Master document must be synchronized before saving.", true)
                    : MapGithubError(response.StatusCode, fullPath) });
            }

            var json = JsonNode.Parse(await response.Content.ReadAsStringAsync(timeoutCts.Token));
            var savedRevision = json?["content"]?["sha"]?.GetValue<string>();
            if (string.IsNullOrWhiteSpace(savedRevision))
            {
                return (null, new[] { new AfError(AfErrorCodes.MasterWriteFailed, "GitHub write result is ambiguous.", true) });
            }

            return (new MasterDocumentWriteResult(type, target, savedRevision), Array.Empty<AfError>());
        }
        catch (OperationCanceledException)
        {
            return (null, new[] { new AfError(AfErrorCodes.GithubTimeout, "GitHub access timed out.", true) });
        }
        catch (HttpRequestException)
        {
            return (null, new[] { new AfError(AfErrorCodes.GithubConnectionFailed, "GitHub connection failed.", true) });
        }
    }

    public async Task<(MasterDocumentWriteResult? Result, IReadOnlyList<AfError> Errors)> PushMasterDocumentAsync(
        AfConfiguration configuration,
        string? token,
        string type,
        string expectedRevision,
        string content,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(expectedRevision) || string.IsNullOrWhiteSpace(content))
        {
            return (null, new[] { new AfError(AfErrorCodes.MasterWriteInvalid, "Master document write request is invalid.", true) });
        }

        if (!TryGetMasterWriteTarget(type, out var target))
        {
            return (null, new[] { new AfError(AfErrorCodes.MasterWriteInvalid, "Master write target is not allowed.", true) });
        }

        try
        {
            using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            timeoutCts.CancelAfter(TimeSpan.FromSeconds(configuration.Timeouts.GithubRequestTimeoutSec));
            var fullPath = CombineRemote(configuration.Repository.RootPath, target);
            var remote = await ReadGithubContentAsync(configuration, fullPath, token, timeoutCts.Token);
            if (remote.Errors.Count > 0)
            {
                return (null, remote.Errors);
            }

            if (!string.Equals(remote.Revision, expectedRevision, StringComparison.Ordinal))
            {
                return (null, new[] { new AfError(AfErrorCodes.MasterSyncRequired, "Master document must be synchronized before saving.", true) });
            }

            var contentsUrl = $"https://api.github.com/repos/{configuration.Repository.Owner}/{configuration.Repository.Repository}/contents/{EscapeRemotePath(fullPath)}";
            using var request = CreateRequest(contentsUrl, token, HttpMethod.Put);
            var payload = new
            {
                message = BuildMasterCommitMessage(type, target),
                content = Convert.ToBase64String(Encoding.UTF8.GetBytes(content)),
                sha = remote.Revision,
                branch = configuration.Repository.Ref
            };
            request.Content = new StringContent(JsonSerializer.Serialize(payload, AfJson.Options), Encoding.UTF8, "application/json");
            using var response = await _httpClient.SendAsync(request, timeoutCts.Token);
            if (!response.IsSuccessStatusCode)
            {
                return (null, new[] { response.StatusCode == HttpStatusCode.Conflict
                    ? new AfError(AfErrorCodes.MasterSyncRequired, "Master document must be synchronized before saving.", true)
                    : MapGithubError(response.StatusCode, fullPath) });
            }

            var json = JsonNode.Parse(await response.Content.ReadAsStringAsync(timeoutCts.Token));
            var savedRevision = json?["content"]?["sha"]?.GetValue<string>();
            if (string.IsNullOrWhiteSpace(savedRevision))
            {
                return (null, new[] { new AfError(AfErrorCodes.MasterWriteFailed, "GitHub write result is ambiguous.", true) });
            }

            return (new MasterDocumentWriteResult(type, target, savedRevision), Array.Empty<AfError>());
        }
        catch (OperationCanceledException)
        {
            return (null, new[] { new AfError(AfErrorCodes.GithubTimeout, "GitHub access timed out.", true) });
        }
        catch (HttpRequestException)
        {
            return (null, new[] { new AfError(AfErrorCodes.GithubConnectionFailed, "GitHub connection failed.", true) });
        }
    }

    public async Task<(RecoveryGitWriteResult? Result, IReadOnlyList<AfError> Errors)> PushRecoveryReplacementAsync(
        AfConfiguration configuration,
        string? token,
        string sourcePath,
        string expectedSourceRevision,
        string replacementPath,
        string replacementContent,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(sourcePath) ||
            string.IsNullOrWhiteSpace(expectedSourceRevision) ||
            string.IsNullOrWhiteSpace(replacementPath) ||
            string.IsNullOrWhiteSpace(replacementContent))
        {
            return (null, new[] { new AfError(AfErrorCodes.RecoveryWriteFailed, "Recovery write request is invalid.", true) });
        }

        if (!IsAllowedRecoveryWorkoutPath(configuration, sourcePath) ||
            !IsAllowedRecoveryWorkoutPath(configuration, replacementPath))
        {
            return (null, new[] { new AfError(AfErrorCodes.RecoveryWriteConflict, "Recovery path is outside the configured resource boundary.", true) });
        }

        try
        {
            using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            timeoutCts.CancelAfter(TimeSpan.FromSeconds(configuration.Timeouts.GithubRequestTimeoutSec));
            var source = await ReadGithubContentAsync(configuration, sourcePath, token, timeoutCts.Token);
            if (source.Errors.Count > 0)
            {
                return (null, source.Errors);
            }

            var sourceContent = DecodeGithubContent(source.Content!);
            if (sourceContent is null)
            {
                return (null, new[] { new AfError(AfErrorCodes.GithubServerError, "GitHub contents response is invalid.", true) });
            }

            if (!string.Equals(CreateContentRevision(sourceContent), expectedSourceRevision, StringComparison.Ordinal))
            {
                return (null, new[] { new AfError(AfErrorCodes.RecoveryWriteConflict, "Recovery source revision is stale.", true) });
            }

            return string.Equals(sourcePath, replacementPath, StringComparison.Ordinal)
                ? await PushRecoverySamePathAsync(configuration, token, sourcePath, source.Revision!, replacementContent, timeoutCts.Token)
                : await PushRecoveryRelocationAsync(configuration, token, sourcePath, replacementPath, replacementContent, timeoutCts.Token);
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            var reconciled = await TryReconcileRecoveryWriteAsync(configuration, token, sourcePath, replacementPath, replacementContent);
            return reconciled.Result is not null
                ? reconciled
                : (null, new[] { new AfError(AfErrorCodes.RecoveryWriteFailed, "Recovery write result is ambiguous.", true) });
        }
        catch (HttpRequestException)
        {
            return (null, new[] { new AfError(AfErrorCodes.GithubConnectionFailed, "GitHub connection failed.", true) });
        }
    }

    private async Task<(RecoveryGitWriteResult? Result, IReadOnlyList<AfError> Errors)> PushRecoverySamePathAsync(
        AfConfiguration configuration,
        string? token,
        string path,
        string remoteBlobRevision,
        string replacementContent,
        CancellationToken cancellationToken)
    {
        var contentsUrl = $"https://api.github.com/repos/{configuration.Repository.Owner}/{configuration.Repository.Repository}/contents/{EscapeRemotePath(path)}";
        using var request = CreateRequest(contentsUrl, token, HttpMethod.Put);
        request.Content = new StringContent(JsonSerializer.Serialize(new
        {
            message = "Recover workout resource",
            content = Convert.ToBase64String(Encoding.UTF8.GetBytes(replacementContent)),
            sha = remoteBlobRevision,
            branch = configuration.Repository.Ref
        }, AfJson.Options), Encoding.UTF8, "application/json");
        using var response = await _httpClient.SendAsync(request, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            return (null, new[] { response.StatusCode == HttpStatusCode.Conflict
                ? new AfError(AfErrorCodes.RecoveryWriteConflict, "Recovery source revision is stale.", true)
                : MapGithubError(response.StatusCode, path) });
        }

        var json = JsonNode.Parse(await response.Content.ReadAsStringAsync(cancellationToken));
        var savedRevision = json?["content"]?["sha"]?.GetValue<string>();
        var commitRevision = json?["commit"]?["sha"]?.GetValue<string>();
        if (string.IsNullOrWhiteSpace(savedRevision) || string.IsNullOrWhiteSpace(commitRevision))
        {
            return (null, new[] { new AfError(AfErrorCodes.RecoveryWriteFailed, "GitHub write result is ambiguous.", true) });
        }

        return (new RecoveryGitWriteResult(path, CreateContentRevision(replacementContent), commitRevision), Array.Empty<AfError>());
    }

    private async Task<(RecoveryGitWriteResult? Result, IReadOnlyList<AfError> Errors)> PushRecoveryRelocationAsync(
        AfConfiguration configuration,
        string? token,
        string sourcePath,
        string replacementPath,
        string replacementContent,
        CancellationToken cancellationToken)
    {
        var destination = await ReadGithubContentAsync(configuration, replacementPath, token, cancellationToken);
        if (destination.Errors.Count == 0)
        {
            return (null, new[] { new AfError(AfErrorCodes.RecoveryWriteConflict, "Recovery destination already exists.", true) });
        }

        if (destination.Errors.FirstOrDefault()?.Code != AfErrorCodes.GithubResourceNotFound)
        {
            return (null, destination.Errors);
        }

        var head = await ReadBranchHeadAsync(configuration, token, cancellationToken);
        if (head.Errors.Count > 0 || string.IsNullOrWhiteSpace(head.HeadSha))
        {
            return (null, head.Errors);
        }

        var tree = await ReadCommitTreeAsync(configuration, token, head.HeadSha!, cancellationToken);
        if (tree.Errors.Count > 0 || string.IsNullOrWhiteSpace(tree.TreeSha))
        {
            return (null, tree.Errors);
        }

        var blob = await CreateBlobAsync(configuration, token, replacementContent, cancellationToken);
        if (blob.Errors.Count > 0 || string.IsNullOrWhiteSpace(blob.BlobSha))
        {
            return (null, blob.Errors);
        }

        var nextTree = await CreateRecoveryTreeAsync(configuration, token, tree.TreeSha!, sourcePath, replacementPath, blob.BlobSha!, cancellationToken);
        if (nextTree.Errors.Count > 0 || string.IsNullOrWhiteSpace(nextTree.TreeSha))
        {
            return (null, nextTree.Errors);
        }

        var commit = await CreateRecoveryCommitAsync(configuration, token, head.HeadSha!, nextTree.TreeSha!, cancellationToken);
        if (commit.Errors.Count > 0 || string.IsNullOrWhiteSpace(commit.CommitSha))
        {
            return (null, commit.Errors);
        }

        var currentHead = await ReadBranchHeadAsync(configuration, token, cancellationToken);
        if (currentHead.Errors.Count > 0)
        {
            return (null, currentHead.Errors);
        }

        if (!string.Equals(currentHead.HeadSha, head.HeadSha, StringComparison.Ordinal))
        {
            return (null, new[] { new AfError(AfErrorCodes.RecoveryWriteConflict, "Remote repository changed before Recovery commit.", true) });
        }

        var updated = await UpdateBranchHeadAsync(configuration, token, commit.CommitSha!, cancellationToken);
        if (updated.Count > 0)
        {
            return (null, updated);
        }

        return (new RecoveryGitWriteResult(replacementPath, CreateContentRevision(replacementContent), commit.CommitSha!), Array.Empty<AfError>());
    }

    private async Task<(RecoveryGitWriteResult? Result, IReadOnlyList<AfError> Errors)> TryReconcileRecoveryWriteAsync(
        AfConfiguration configuration,
        string? token,
        string sourcePath,
        string replacementPath,
        string replacementContent)
    {
        using var timeoutCts = new CancellationTokenSource(TimeSpan.FromSeconds(Math.Max(1, configuration.Timeouts.GithubRequestTimeoutSec)));
        var expectedRevision = CreateContentRevision(replacementContent);
        var replacement = await ReadGithubContentAsync(configuration, replacementPath, token, timeoutCts.Token);
        if (replacement.Errors.Count > 0)
        {
            return (null, replacement.Errors);
        }

        var replacementDecoded = DecodeGithubContent(replacement.Content!);
        if (replacementDecoded is null || !string.Equals(CreateContentRevision(replacementDecoded), expectedRevision, StringComparison.Ordinal))
        {
            return (null, Array.Empty<AfError>());
        }

        if (!string.Equals(sourcePath, replacementPath, StringComparison.Ordinal))
        {
            var source = await ReadGithubContentAsync(configuration, sourcePath, token, timeoutCts.Token);
            if (source.Errors.Count == 0 || source.Errors.FirstOrDefault()?.Code != AfErrorCodes.GithubResourceNotFound)
            {
                return (null, Array.Empty<AfError>());
            }
        }

        var head = await ReadBranchHeadAsync(configuration, token, timeoutCts.Token);
        return string.IsNullOrWhiteSpace(head.HeadSha)
            ? (null, head.Errors)
            : (new RecoveryGitWriteResult(replacementPath, expectedRevision, head.HeadSha!), Array.Empty<AfError>());
    }

    private async Task<(IReadOnlyList<RuntimeSourceFile> Files, IReadOnlyList<AfError> Errors)> FetchDirectoryAsync(
        AfConfiguration configuration,
        ResourceConfiguration resource,
        string? token,
        CancellationToken cancellationToken)
    {
        var prefix = CombineRemote(configuration.Repository.RootPath, resource.Path);
        return await FetchDirectoryContentsAsync(configuration, prefix, token, cancellationToken);
    }

    private async Task<(IReadOnlyList<RuntimeSourceFile> Files, IReadOnlyList<AfError> Errors)> FetchDirectoryContentsAsync(
        AfConfiguration configuration,
        string directoryPath,
        string? token,
        CancellationToken cancellationToken)
    {
        var contentsUrl = $"https://api.github.com/repos/{configuration.Repository.Owner}/{configuration.Repository.Repository}/contents/{EscapeRemotePath(directoryPath)}?ref={Uri.EscapeDataString(configuration.Repository.Ref)}";
        using var request = CreateRequest(contentsUrl, token);
        using var response = await _httpClient.SendAsync(request, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            return (Array.Empty<RuntimeSourceFile>(), new[] { MapGithubError(response.StatusCode, directoryPath) });
        }

        var json = await response.Content.ReadAsStringAsync(cancellationToken);
        var entries = JsonNode.Parse(json)?.AsArray();
        if (entries is null)
        {
            return (Array.Empty<RuntimeSourceFile>(), new[] { new AfError(AfErrorCodes.GithubServerError, "GitHub contents response is invalid.", true) });
        }

        var files = new List<RuntimeSourceFile>();
        var errors = new List<AfError>();
        foreach (var entry in entries)
        {
            var type = entry?["type"]?.GetValue<string>();
            var path = entry?["path"]?.GetValue<string>();
            if (string.IsNullOrWhiteSpace(type) || string.IsNullOrWhiteSpace(path))
            {
                errors.Add(new AfError(AfErrorCodes.GithubServerError, "GitHub contents response is invalid.", true));
                break;
            }

            if (type == "dir")
            {
                var nested = await FetchDirectoryContentsAsync(configuration, path, token, cancellationToken);
                if (nested.Errors.Count > 0)
                {
                    errors.AddRange(nested.Errors);
                    break;
                }

                files.AddRange(nested.Files);
                continue;
            }

            if (type == "file" && IsJsonRuntimePath(path))
            {
                var fetched = await FetchRawPathAsync(configuration, path, token, cancellationToken);
                if (fetched.Error is not null)
                {
                    errors.Add(fetched.Error);
                    break;
                }

                files.Add(fetched.File!);
            }
        }

        return errors.Count == 0 ? (files, errors) : (Array.Empty<RuntimeSourceFile>(), errors);
    }

    private async Task<(IReadOnlyList<RuntimeSourceFile> Files, IReadOnlyList<AfError> Errors)> FetchFileAsync(
        AfConfiguration configuration,
        string path,
        string? token,
        CancellationToken cancellationToken)
    {
        var fullPath = CombineRemote(configuration.Repository.RootPath, path);
        var fetched = await FetchRawPathAsync(configuration, fullPath, token, cancellationToken);
        return fetched.Error is null
            ? (new[] { fetched.File! }, Array.Empty<AfError>())
            : (Array.Empty<RuntimeSourceFile>(), new[] { fetched.Error });
    }

    private async Task<(RuntimeSourceFile? File, AfError? Error)> FetchRawPathAsync(
        AfConfiguration configuration,
        string path,
        string? token,
        CancellationToken cancellationToken)
    {
        var content = await ReadGithubContentAsync(configuration, path, token, cancellationToken);
        if (content.Errors.Count > 0)
        {
            return (null, content.Errors.First());
        }

        var decoded = DecodeGithubContent(content.Content!);
        if (decoded is null)
        {
            return (null, new AfError(AfErrorCodes.GithubServerError, "GitHub contents response is invalid.", true));
        }

        return (new RuntimeSourceFile(path, decoded, CreateContentRevision(decoded)), null);
    }

    private async Task<(string? Revision, string? Content, IReadOnlyList<AfError> Errors)> ReadGithubContentAsync(
        AfConfiguration configuration,
        string fullPath,
        string? token,
        CancellationToken cancellationToken)
    {
        var contentsUrl = $"https://api.github.com/repos/{configuration.Repository.Owner}/{configuration.Repository.Repository}/contents/{EscapeRemotePath(fullPath)}?ref={Uri.EscapeDataString(configuration.Repository.Ref)}";
        using var request = CreateRequest(contentsUrl, token);
        using var response = await _httpClient.SendAsync(request, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            return (null, null, new[] { MapGithubError(response.StatusCode, fullPath) });
        }

        var json = JsonNode.Parse(await response.Content.ReadAsStringAsync(cancellationToken));
        var revision = json?["sha"]?.GetValue<string>();
        var content = json?["content"]?.GetValue<string>();
        if (string.IsNullOrWhiteSpace(revision) || string.IsNullOrWhiteSpace(content))
        {
            return (null, null, new[] { new AfError(AfErrorCodes.GithubServerError, "GitHub contents response is invalid.", true) });
        }

        return (revision, content, Array.Empty<AfError>());
    }

    private async Task<(string? HeadSha, IReadOnlyList<AfError> Errors)> ReadBranchHeadAsync(
        AfConfiguration configuration,
        string? token,
        CancellationToken cancellationToken)
    {
        var refPath = NormalizeGitBranchRef(configuration.Repository.Ref);
        var url = $"https://api.github.com/repos/{configuration.Repository.Owner}/{configuration.Repository.Repository}/git/ref/{EscapeRemotePath(refPath)}";
        using var request = CreateRequest(url, token);
        using var response = await _httpClient.SendAsync(request, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            return (null, new[] { MapGithubError(response.StatusCode, refPath) });
        }

        var json = JsonNode.Parse(await response.Content.ReadAsStringAsync(cancellationToken));
        var sha = json?["object"]?["sha"]?.GetValue<string>();
        return string.IsNullOrWhiteSpace(sha)
            ? (null, new[] { new AfError(AfErrorCodes.GithubServerError, "GitHub ref response is invalid.", true) })
            : (sha, Array.Empty<AfError>());
    }

    private async Task<(string? TreeSha, IReadOnlyList<AfError> Errors)> ReadCommitTreeAsync(
        AfConfiguration configuration,
        string? token,
        string commitSha,
        CancellationToken cancellationToken)
    {
        var url = $"https://api.github.com/repos/{configuration.Repository.Owner}/{configuration.Repository.Repository}/git/commits/{Uri.EscapeDataString(commitSha)}";
        using var request = CreateRequest(url, token);
        using var response = await _httpClient.SendAsync(request, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            return (null, new[] { MapGithubError(response.StatusCode, commitSha) });
        }

        var json = JsonNode.Parse(await response.Content.ReadAsStringAsync(cancellationToken));
        var sha = json?["tree"]?["sha"]?.GetValue<string>();
        return string.IsNullOrWhiteSpace(sha)
            ? (null, new[] { new AfError(AfErrorCodes.GithubServerError, "GitHub commit response is invalid.", true) })
            : (sha, Array.Empty<AfError>());
    }

    private async Task<(string? BlobSha, IReadOnlyList<AfError> Errors)> CreateBlobAsync(
        AfConfiguration configuration,
        string? token,
        string content,
        CancellationToken cancellationToken)
    {
        var url = $"https://api.github.com/repos/{configuration.Repository.Owner}/{configuration.Repository.Repository}/git/blobs";
        using var request = CreateRequest(url, token, HttpMethod.Post);
        request.Content = new StringContent(JsonSerializer.Serialize(new
        {
            content,
            encoding = "utf-8"
        }, AfJson.Options), Encoding.UTF8, "application/json");
        using var response = await _httpClient.SendAsync(request, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            return (null, new[] { MapGithubError(response.StatusCode, "git/blobs") });
        }

        var json = JsonNode.Parse(await response.Content.ReadAsStringAsync(cancellationToken));
        var sha = json?["sha"]?.GetValue<string>();
        return string.IsNullOrWhiteSpace(sha)
            ? (null, new[] { new AfError(AfErrorCodes.GithubServerError, "GitHub blob response is invalid.", true) })
            : (sha, Array.Empty<AfError>());
    }

    private async Task<(string? TreeSha, IReadOnlyList<AfError> Errors)> CreateRecoveryTreeAsync(
        AfConfiguration configuration,
        string? token,
        string baseTreeSha,
        string sourcePath,
        string replacementPath,
        string replacementBlobSha,
        CancellationToken cancellationToken)
    {
        var url = $"https://api.github.com/repos/{configuration.Repository.Owner}/{configuration.Repository.Repository}/git/trees";
        using var request = CreateRequest(url, token, HttpMethod.Post);
        var tree = new JsonArray
        {
            new JsonObject
            {
                ["path"] = NormalizeRemotePath(replacementPath),
                ["mode"] = "100644",
                ["type"] = "blob",
                ["sha"] = replacementBlobSha
            },
            new JsonObject
            {
                ["path"] = NormalizeRemotePath(sourcePath),
                ["mode"] = "100644",
                ["type"] = "blob",
                ["sha"] = null
            }
        };
        request.Content = new StringContent(JsonSerializer.Serialize(new JsonObject
        {
            ["base_tree"] = baseTreeSha,
            ["tree"] = tree
        }, AfJson.Options), Encoding.UTF8, "application/json");
        using var response = await _httpClient.SendAsync(request, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            return (null, new[] { response.StatusCode == HttpStatusCode.Conflict
                ? new AfError(AfErrorCodes.RecoveryWriteConflict, "Recovery tree could not be created.", true)
                : MapGithubError(response.StatusCode, "git/trees") });
        }

        var json = JsonNode.Parse(await response.Content.ReadAsStringAsync(cancellationToken));
        var sha = json?["sha"]?.GetValue<string>();
        return string.IsNullOrWhiteSpace(sha)
            ? (null, new[] { new AfError(AfErrorCodes.GithubServerError, "GitHub tree response is invalid.", true) })
            : (sha, Array.Empty<AfError>());
    }

    private async Task<(string? CommitSha, IReadOnlyList<AfError> Errors)> CreateRecoveryCommitAsync(
        AfConfiguration configuration,
        string? token,
        string parentSha,
        string treeSha,
        CancellationToken cancellationToken)
    {
        var url = $"https://api.github.com/repos/{configuration.Repository.Owner}/{configuration.Repository.Repository}/git/commits";
        using var request = CreateRequest(url, token, HttpMethod.Post);
        request.Content = new StringContent(JsonSerializer.Serialize(new
        {
            message = "Recover workout resource",
            tree = treeSha,
            parents = new[] { parentSha }
        }, AfJson.Options), Encoding.UTF8, "application/json");
        using var response = await _httpClient.SendAsync(request, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            return (null, new[] { MapGithubError(response.StatusCode, "git/commits") });
        }

        var json = JsonNode.Parse(await response.Content.ReadAsStringAsync(cancellationToken));
        var sha = json?["sha"]?.GetValue<string>();
        return string.IsNullOrWhiteSpace(sha)
            ? (null, new[] { new AfError(AfErrorCodes.GithubServerError, "GitHub commit response is invalid.", true) })
            : (sha, Array.Empty<AfError>());
    }

    private async Task<IReadOnlyList<AfError>> UpdateBranchHeadAsync(
        AfConfiguration configuration,
        string? token,
        string commitSha,
        CancellationToken cancellationToken)
    {
        var refPath = NormalizeGitBranchRef(configuration.Repository.Ref);
        var url = $"https://api.github.com/repos/{configuration.Repository.Owner}/{configuration.Repository.Repository}/git/refs/{EscapeRemotePath(refPath)}";
        using var request = CreateRequest(url, token, new HttpMethod("PATCH"));
        request.Content = new StringContent(JsonSerializer.Serialize(new
        {
            sha = commitSha,
            force = false
        }, AfJson.Options), Encoding.UTF8, "application/json");
        using var response = await _httpClient.SendAsync(request, cancellationToken);
        if (response.IsSuccessStatusCode)
        {
            return Array.Empty<AfError>();
        }

        return new[] { response.StatusCode == HttpStatusCode.Conflict
            ? new AfError(AfErrorCodes.RecoveryWriteConflict, "Remote repository changed before Recovery commit.", true)
            : MapGithubError(response.StatusCode, refPath) };
    }

    private async Task<(string? Content, IReadOnlyList<AfError> Errors)> ReadOtherMasterDocumentAsync(
        AfConfiguration configuration,
        string? token,
        string type,
        CancellationToken cancellationToken)
    {
        var other = MasterWriteTargets.First(target => target.Key != type);
        var fullPath = CombineRemote(configuration.Repository.RootPath, other.Value);
        var remote = await ReadGithubContentAsync(configuration, fullPath, token, cancellationToken);
        if (remote.Errors.Count > 0)
        {
            return (null, remote.Errors);
        }

        var content = DecodeGithubContent(remote.Content!);
        return content is null
            ? (null, new[] { new AfError(AfErrorCodes.GithubServerError, "GitHub contents response is invalid.", true) })
            : (content, Array.Empty<AfError>());
    }

    private static bool TryGetMasterWriteTarget(string type, out string target)
    {
        if (MasterWriteTargets.TryGetValue(type, out var value))
        {
            target = value;
            return true;
        }

        target = "";
        return false;
    }

    private static string BuildMasterCommitMessage(string type, string path)
    {
        var subject = type == "MACHINE_MASTER" ? "machine" : "gym";
        var fileName = Path.GetFileName(path.Replace('/', Path.DirectorySeparatorChar));
        return $"Update {subject} master: {fileName}";
    }

    private static string CreateContentRevision(string content)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(content));
        return "content-sha256-" + Convert.ToHexString(bytes).ToLowerInvariant();
    }

    private static IReadOnlyList<AfError> ValidateMasterLifecycleTransition(string type, string currentEncodedContent, string nextContent)
    {
        if (type != "GYM_MASTER")
        {
            return Array.Empty<AfError>();
        }

        try
        {
            var currentContent = DecodeGithubContent(currentEncodedContent);
            if (currentContent is null)
            {
                return new[] { new AfError(AfErrorCodes.GithubServerError, "GitHub contents response is invalid.", true) };
            }

            var currentConfigured = HasMainGym(currentContent);
            var nextConfigured = HasMainGym(nextContent);
            return currentConfigured && !nextConfigured
                ? new[] { new AfError(AfErrorCodes.MasterWriteInvalid, "Configured Main Gym cannot be cleared.", true) }
                : Array.Empty<AfError>();
        }
        catch
        {
            return new[] { new AfError(AfErrorCodes.MasterWriteInvalid, "Master document lifecycle transition is invalid.", true) };
        }
    }

    private static bool HasMainGym(string content)
    {
        var document = JsonNode.Parse(content)?.AsObject();
        return document?["gyms"]?.AsArray()
            .OfType<JsonObject>()
            .Any(gym => gym["main"]?.GetValue<bool>() == true) == true;
    }

    private static string? DecodeGithubContent(string content)
    {
        try
        {
            return Encoding.UTF8.GetString(Convert.FromBase64String(content.Replace("\n", "").Replace("\r", "")));
        }
        catch (FormatException)
        {
            return null;
        }
    }

    private static HttpRequestMessage CreateRequest(string url, string? token, HttpMethod? method = null)
    {
        var request = new HttpRequestMessage(method ?? HttpMethod.Get, url);
        request.Headers.UserAgent.ParseAdd("Atlament-Windows-AF");
        if (!string.IsNullOrWhiteSpace(token))
        {
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        }

        return request;
    }

    private static AfError MapGithubError(HttpStatusCode statusCode, string path) => statusCode switch
    {
        HttpStatusCode.Unauthorized => new AfError(AfErrorCodes.GithubUnauthorized, "GitHub token is unauthorized.", true),
        HttpStatusCode.Forbidden => new AfError(AfErrorCodes.GithubForbidden, "GitHub access is forbidden.", true),
        HttpStatusCode.NotFound => new AfError(AfErrorCodes.GithubResourceNotFound, $"GitHub resource not found: {path}.", true),
        (HttpStatusCode)429 => new AfError(AfErrorCodes.GithubRateLimit, "GitHub rate limit reached.", true),
        _ => new AfError(AfErrorCodes.GithubServerError, "GitHub server error.", true)
    };

    private static string CombineRemote(string root, string path) =>
        string.Join("/", new[] { NormalizeRemotePath(root), NormalizeRemotePath(path) }.Where(value => value.Length > 0));

    private static string NormalizeRemotePath(string value) =>
        string.Join("/", value
            .Replace('\\', '/')
            .Trim()
            .Split('/', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries));

    private static string NormalizeGitBranchRef(string value)
    {
        var normalized = value.Trim();
        if (normalized.StartsWith("refs/", StringComparison.Ordinal))
        {
            return normalized["refs/".Length..];
        }

        if (normalized.StartsWith("heads/", StringComparison.Ordinal))
        {
            return normalized;
        }

        return "heads/" + normalized;
    }

    private static bool IsAllowedRecoveryWorkoutPath(AfConfiguration configuration, string path)
    {
        var normalized = NormalizeRemotePath(path);
        if (normalized.Length == 0 ||
            normalized.Contains("../", StringComparison.Ordinal) ||
            normalized.Contains("/..", StringComparison.Ordinal) ||
            normalized == ".." ||
            !IsJsonRuntimePath(normalized))
        {
            return false;
        }

        return configuration.Resources
            .Where(resource => resource.Type == "WORKOUT")
            .Select(resource => resource.ResourceKind == "directory"
                ? NormalizeRemotePath(CombineRemote(configuration.Repository.RootPath, resource.Path)).TrimEnd('/') + "/"
                : NormalizeRemotePath(CombineRemote(configuration.Repository.RootPath, resource.Path)))
            .Any(boundary => boundary.EndsWith("/", StringComparison.Ordinal)
                ? normalized.StartsWith(boundary, StringComparison.Ordinal)
                : string.Equals(normalized, boundary, StringComparison.Ordinal));
    }

    private static string EscapeRemotePath(string path) =>
        string.Join("/", NormalizeRemotePath(path).Split('/', StringSplitOptions.RemoveEmptyEntries).Select(Uri.EscapeDataString));

    private static bool IsJsonRuntimePath(string path) =>
        path.EndsWith(".json", StringComparison.OrdinalIgnoreCase) ||
        path.EndsWith(".jsonl", StringComparison.OrdinalIgnoreCase);
}

public sealed class AtlamentApplication
{
    private static readonly IReadOnlyList<MasterWriteTarget> MasterWriteTargets = new[]
    {
        new MasterWriteTarget("MACHINE_MASTER", "master/machines.json", "file", true),
        new MasterWriteTarget("GYM_MASTER", "master/gyms.json", "file", true)
    };

    private static readonly string ApplicationFrameworkVersion =
        typeof(AtlamentApplication).Assembly.GetCustomAttribute<AssemblyInformationalVersionAttribute>()?.InformationalVersion
        ?? typeof(AtlamentApplication).Assembly.GetName().Version?.ToString()
        ?? "unknown";

    private static readonly BuildIdentity ApplicationBuildIdentity =
#if DEBUG
        new("Debug", true);
#else
        new("Release", false);
#endif

    private readonly ConfigurationStore _configurationStore;
    private readonly CredentialStore _credentialStore;
    private readonly RuntimeDataStore _runtimeDataStore;
    private readonly RuntimeDataBuilder _runtimeDataBuilder;
    private readonly GithubAccessService _github;
    private readonly HostingStatusService _hosting;
    private readonly AfLog _log;
    private readonly RecoveryService? _recovery;
    private readonly OperationGate _operations = new();
    private AfConfiguration _configuration = AfConfiguration.Default;
    private CredentialStatus _credentialStatus = new(false, CredentialState.missing.ToString(), null);
    private string? _token;
    private ComponentStatus _configurationStatus = ComponentStatus.unknown;
    private ComponentStatus _credentialComponentStatus = ComponentStatus.unknown;
    private ComponentStatus _githubStatus = ComponentStatus.unknown;
    private ComponentStatus _runtimeStatus = ComponentStatus.unknown;
    private ApplicationStatus _applicationStatus = ApplicationStatus.starting;
    private string _latestRemoteRetrieval = "unknown";
    private string _latestValidation = "unknown";
    private readonly List<string> _requiredActions = new();

    public AtlamentApplication(
        ConfigurationStore configurationStore,
        CredentialStore credentialStore,
        RuntimeDataStore runtimeDataStore,
        RuntimeDataBuilder runtimeDataBuilder,
        GithubAccessService github,
        HostingStatusService hosting,
        AfLog log,
        RecoveryService? recovery = null)
    {
        _configurationStore = configurationStore;
        _credentialStore = credentialStore;
        _runtimeDataStore = runtimeDataStore;
        _runtimeDataBuilder = runtimeDataBuilder;
        _github = github;
        _hosting = hosting;
        _log = log;
        _recovery = recovery;
    }

    public Task StartAsync(CancellationToken cancellationToken)
    {
        if (!_operations.TryStart("startup")) return Task.CompletedTask;
        try
        {
            _log.Initialize();
            _runtimeDataStore.ClearTemporary();
            LoadConfiguration();
            LoadCredential();
            ValidateLocalRuntime();
            _applicationStatus = DetermineApplicationStatus();
            // Startup Sync is background work by design: the shell should open and let Frontend
            // reflect running/degraded state through Status API instead of blocking first paint.
            _ = Task.Run(() => StartupSyncAsync(), CancellationToken.None);
        }
        catch (Exception ex)
        {
            _log.Write(LogType.FATAL, "Startup failed: " + ex.Message);
            _applicationStatus = ApplicationStatus.failed;
            _operations.Complete("startup", false);
        }

        return Task.CompletedTask;
    }

    public AfResponse<AfStatus> GetStatus() => AfResponses.Ok(new AfStatus(
        new StatusVersions(ApplicationFrameworkVersion, GetFrontendFrameworkVersion(), GetNativePackageVersions(), ApplicationBuildIdentity),
        DetermineReadiness(),
        DetermineRuntimeDataStatus(),
        DetermineRecoveryStatus(),
        new ApplicationState(_applicationStatus.ToString(), _applicationStatus == ApplicationStatus.degraded, _applicationStatus is not ApplicationStatus.stopping and not ApplicationStatus.failed),
        _operations.Snapshot(),
        new ComponentStateSnapshot(
            _configurationStatus.ToString(),
            _credentialComponentStatus.ToString(),
            _githubStatus.ToString(),
            _runtimeStatus.ToString(),
            _hosting.GetStatus()),
        _requiredActions.ToArray()));

    private RuntimeDataStatusFacts DetermineRuntimeDataStatus()
    {
        var (data, _) = _runtimeDataStore.LoadCurrent();
        var currentAvailable = data is not null && _runtimeStatus != ComponentStatus.unavailable;
        return new RuntimeDataStatusFacts(
            currentAvailable,
            data?.GeneratedAt,
            _latestRemoteRetrieval,
            _latestValidation,
            (_latestRemoteRetrieval == "failed" || _latestValidation == "failed") && currentAvailable,
            CountQuarantinedWorkoutResources(data));
    }

    private RecoveryStatusFacts DetermineRecoveryStatus()
    {
        var (data, _) = _runtimeDataStore.LoadCurrent();
        var brokenWorkoutCount = CountQuarantinedWorkoutResources(data);
        return new RecoveryStatusFacts(
            brokenWorkoutCount,
            brokenWorkoutCount,
            0,
            brokenWorkoutCount,
            _recovery?.CountActiveDrafts(_configuration) ?? 0);
    }

    private static int CountQuarantinedWorkoutResources(RuntimeDataFile? data)
    {
        if (data is null) return 0;
        return data.Errors
            .Select(error => error.Message.Split(':', 2)[0].Trim())
            .Where(path => path.EndsWith(".json", StringComparison.OrdinalIgnoreCase) || path.EndsWith(".jsonl", StringComparison.OrdinalIgnoreCase))
            .Distinct(StringComparer.Ordinal)
            .Count();
    }

    private ApplicationReadiness DetermineReadiness()
    {
        var requiredActions = _requiredActions.Distinct(StringComparer.Ordinal).OrderBy(action => action, StringComparer.Ordinal).ToArray();
        if (requiredActions.Contains("CONFIGURATION_REQUIRED", StringComparer.Ordinal) ||
            requiredActions.Contains("CREDENTIAL_REQUIRED", StringComparer.Ordinal))
        {
            return new ApplicationReadiness(
                "unconfigured",
                requiredActions,
                UnavailableComponents(),
                DegradedComponents());
        }

        if (_applicationStatus is ApplicationStatus.failed or ApplicationStatus.stopping ||
            _runtimeStatus == ComponentStatus.unavailable)
        {
            return new ApplicationReadiness(
                "unavailable",
                requiredActions,
                UnavailableComponents(),
                DegradedComponents());
        }

        var unavailable = UnavailableComponents();
        var degraded = DegradedComponents();
        if (_applicationStatus == ApplicationStatus.degraded || degraded.Count > 0 || unavailable.Count > 0 || requiredActions.Length > 0)
        {
            return new ApplicationReadiness(
                "degraded",
                requiredActions,
                unavailable,
                degraded);
        }

        return new ApplicationReadiness("ready", requiredActions, Array.Empty<string>(), Array.Empty<string>());
    }

    private IReadOnlyList<string> UnavailableComponents()
    {
        var components = new List<string>();
        if (_configurationStatus == ComponentStatus.unavailable) components.Add("configuration");
        if (_credentialComponentStatus == ComponentStatus.unavailable) components.Add("credential");
        if (_runtimeStatus == ComponentStatus.unavailable) components.Add("runtimeData");
        return components;
    }

    private IReadOnlyList<string> DegradedComponents()
    {
        var components = new List<string>();
        if (_githubStatus == ComponentStatus.degraded) components.Add("github");
        if (_runtimeStatus == ComponentStatus.degraded) components.Add("runtimeData");
        return components;
    }

    private string GetFrontendFrameworkVersion()
    {
        var version = ReadVersionJson();
        return version?["frontend"]?.GetValue<string>() ?? "unknown";
    }

    private NativePackageVersions GetNativePackageVersions()
    {
        var version = ReadVersionJson();
        return new NativePackageVersions(
            new WindowsPackageVersion(version?["windows"]?.GetValue<string>() ?? ApplicationFrameworkVersion),
            new AndroidPackageVersion(
                version?["android"]?["versionName"]?.GetValue<string>() ?? "unknown",
                version?["android"]?["versionCode"]?.GetValue<int>() ?? 0));
    }

    private JsonNode? ReadVersionJson()
    {
        try
        {
            var versionFile = _hosting.TryResolveFile("/version.json", out _);
            if (versionFile is null) return null;
            using var stream = _hosting.OpenRead(versionFile);
            return JsonNode.Parse(stream);
        }
        catch
        {
            return null;
        }
    }

    private static int MapMasterWriteStatusCode(IReadOnlyList<AfError> errors)
    {
        var code = errors.FirstOrDefault()?.Code;
        return code switch
        {
            AfErrorCodes.MasterWriteConflict => 409,
            AfErrorCodes.MasterSyncRequired => 409,
            AfErrorCodes.MasterWriteInvalid => 400,
            AfErrorCodes.CredentialRequired or AfErrorCodes.GithubUnauthorized => 401,
            AfErrorCodes.GithubForbidden => 403,
            AfErrorCodes.GithubResourceNotFound => 404,
            AfErrorCodes.GithubRateLimit => 429,
            AfErrorCodes.GithubTimeout or AfErrorCodes.GithubConnectionFailed => 503,
            _ => 500
        };
    }

    private static int RecoveryStatusCode(IReadOnlyList<AfError> errors)
    {
        var code = errors.FirstOrDefault()?.Code;
        return code switch
        {
            AfErrorCodes.RecoveryResourceNotFound => 404,
            AfErrorCodes.RecoverySourceViewTooLarge => 413,
            AfErrorCodes.RecoveryResourceNotBroken or
            AfErrorCodes.RecoveryDraftRequired or
            AfErrorCodes.RecoveryDraftConflict or
            AfErrorCodes.RecoveryDraftStale or
            AfErrorCodes.RecoveryDraftIncompatible or
            AfErrorCodes.RecoveryDraftCorrupted or
            AfErrorCodes.RecoveryValidationFailed or
            AfErrorCodes.RecoveryWriteConflict => 409,
            AfErrorCodes.RecoveryUnavailable => 503,
            AfErrorCodes.RecoveryWriteFailed => 503,
            AfErrorCodes.ConfigRequired or AfErrorCodes.ConfigInvalid => 400,
            _ => MapMasterWriteStatusCode(errors)
        };
    }

    public AfResponse<RuntimeWorkoutData> GetRuntimeWorkouts()
    {
        var (data, errors) = _runtimeDataStore.LoadCurrent();
        if (data is null)
        {
            return AfResponses.Fail<RuntimeWorkoutData>(errors.First());
        }

        return AfResponses.Ok(new RuntimeWorkoutData(data.Sessions, data.MasterDocuments), data.Errors, data.Warnings ?? Array.Empty<RuntimeWarning>());
    }

    public AfResponse<AfConfiguration> GetConfiguration() => AfResponses.Ok(_configuration);

    public async Task<(int StatusCode, AfResponse<ConfigurationUpdateResult> Response)> UpdateConfigurationAsync(ConfigurationUpdate update, CancellationToken cancellationToken)
    {
        if (!_operations.TryStart("configurationUpdate"))
        {
            return (409, AfResponses.Fail<ConfigurationUpdateResult>(new AfError(AfErrorCodes.OperationAlreadyRunning, "Configuration update is already running.", true)));
        }

        try
        {
            var next = MergeConfiguration(_configuration, update);
            var errors = _configurationStore.Save(next);
            if (errors.Count > 0)
            {
                _operations.Complete("configurationUpdate", false);
                return (400, new AfResponse<ConfigurationUpdateResult>(false, errors, null));
            }

            var remoteChanged = update.Repository is not null || update.Resources is not null;
            _configuration = next;
            _configurationStatus = ComponentStatus.available;
            _requiredActions.RemoveAll(action => action == "CONFIGURATION_REQUIRED");
            var responseErrors = new List<AfError>();
            if (remoteChanged)
            {
                responseErrors.AddRange(await _github.CheckAsync(_configuration, _token, cancellationToken));
                _githubStatus = responseErrors.Count == 0 ? ComponentStatus.available : ComponentStatus.degraded;
            }

            _applicationStatus = DetermineApplicationStatus();
            _operations.Complete("configurationUpdate", true);
            return (200, AfResponses.Ok(new ConfigurationUpdateResult(remoteChanged), responseErrors));
        }
        catch
        {
            _operations.Complete("configurationUpdate", false);
            return (500, AfResponses.Fail<ConfigurationUpdateResult>(new AfError(AfErrorCodes.CommonInternalError, "Configuration update failed.", true)));
        }
    }

    public AfResponse<CredentialStatus> GetCredentialStatus() => AfResponses.Ok(_credentialStatus);

    public AfResponse<MasterWriteBoundary> GetMasterWriteBoundary()
    {
        var repositoryConfigured =
            !string.IsNullOrWhiteSpace(_configuration.Repository.Owner) &&
            !string.IsNullOrWhiteSpace(_configuration.Repository.Repository) &&
            !string.IsNullOrWhiteSpace(_configuration.Repository.Ref);
        var configuredTargetKeys = _configuration.Resources
            .Where(resource => resource.ResourceKind == "file")
            .Select(resource => $"{resource.Type}:{resource.Path}")
            .ToHashSet(StringComparer.Ordinal);
        var allTargetsConfigured = MasterWriteTargets.All(target => configuredTargetKeys.Contains($"{target.Type}:{target.Path}"));
        var writeEnabled =
            _configurationStatus == ComponentStatus.available &&
            _credentialStatus.Configured &&
            _credentialStatus.State == CredentialState.available.ToString() &&
            repositoryConfigured &&
            allTargetsConfigured;

        return AfResponses.Ok(new MasterWriteBoundary(
            _configuration.Repository,
            MasterWriteTargets,
            new MasterWriteSecurity(
                _configurationStatus == ComponentStatus.available,
                _credentialStatus.Configured,
                _credentialStatus.State,
                repositoryConfigured,
                writeEnabled,
                false,
                false,
                false)));
    }

    public Task<(int StatusCode, AfResponse<MasterDocumentSnapshot> Response)> ReadMasterDocumentAsync(string type, CancellationToken cancellationToken)
    {
        var local = LoadLocalMasterDocuments();
        if (local.Documents is null)
        {
            return Task.FromResult((409, AfResponses.Fail<MasterDocumentSnapshot>(new AfError(AfErrorCodes.MasterSyncRequired, "Master data must be synchronized before maintenance.", true))));
        }

        var document = SelectLocalMasterDocument(local.Documents, type);
        var result = document is null
            ? (400, AfResponses.Fail<MasterDocumentSnapshot>(new AfError(AfErrorCodes.MasterWriteInvalid, "Master write target is not allowed.", true)))
            : (200, AfResponses.Ok(document));
        return Task.FromResult(result);
    }

    public async Task<(int StatusCode, AfResponse<IReadOnlyList<BrokenResourceSummary>> Response)> ListRecoveryResourcesAsync(CancellationToken cancellationToken)
    {
        var context = await LoadRecoveryContextAsync(cancellationToken);
        if (context.Errors.Count > 0)
        {
            return (RecoveryStatusCode(context.Errors), new AfResponse<IReadOnlyList<BrokenResourceSummary>>(false, context.Errors, null));
        }

        return (200, AfResponses.Ok(_recovery!.ListBrokenResources(_configuration, context.WorkoutFiles!, context.MachineMaster!, context.GymMaster!)));
    }

    public async Task<(int StatusCode, AfResponse<RecoveryResourceDetail> Response)> GetRecoveryResourceAsync(string resourceKey, CancellationToken cancellationToken)
    {
        var context = await LoadRecoveryContextAsync(cancellationToken);
        if (context.Errors.Count > 0)
        {
            return (RecoveryStatusCode(context.Errors), new AfResponse<RecoveryResourceDetail>(false, context.Errors, null));
        }

        var (detail, errors) = _recovery!.GetDetail(_configuration, resourceKey, context.WorkoutFiles!, context.MachineMaster!, context.GymMaster!);
        return errors.Count > 0 || detail is null
            ? (RecoveryStatusCode(errors), new AfResponse<RecoveryResourceDetail>(false, errors, null))
            : (200, AfResponses.Ok(detail));
    }

    public async Task<(int StatusCode, AfResponse<RecoverySourceView> Response)> GetRecoverySourceAsync(string resourceKey, CancellationToken cancellationToken)
    {
        var context = await LoadRecoveryContextAsync(cancellationToken);
        if (context.Errors.Count > 0)
        {
            return (RecoveryStatusCode(context.Errors), new AfResponse<RecoverySourceView>(false, context.Errors, null));
        }

        var (source, errors) = _recovery!.GetSource(_configuration, resourceKey, context.WorkoutFiles!, context.MachineMaster!, context.GymMaster!);
        return errors.Count > 0 || source is null
            ? (RecoveryStatusCode(errors), new AfResponse<RecoverySourceView>(false, errors, null))
            : (200, AfResponses.Ok(source));
    }

    public async Task<(int StatusCode, AfResponse<RecoveryDraftSnapshot> Response)> GetRecoveryDraftAsync(string resourceKey, CancellationToken cancellationToken)
    {
        var context = await LoadRecoveryContextAsync(cancellationToken);
        if (context.Errors.Count > 0)
        {
            return (RecoveryStatusCode(context.Errors), new AfResponse<RecoveryDraftSnapshot>(false, context.Errors, null));
        }

        var (snapshot, errors) = _recovery!.GetDraft(_configuration, resourceKey, context.WorkoutFiles!, context.MachineMaster!, context.GymMaster!);
        return errors.Count > 0
            ? (RecoveryStatusCode(errors), new AfResponse<RecoveryDraftSnapshot>(false, errors, null))
            : (200, AfResponses.Ok(snapshot));
    }

    public async Task<(int StatusCode, AfResponse<RecoveryDraftSnapshot> Response)> CreateRecoveryDraftAsync(string resourceKey, CancellationToken cancellationToken)
    {
        var context = await LoadRecoveryContextAsync(cancellationToken);
        if (context.Errors.Count > 0)
        {
            return (RecoveryStatusCode(context.Errors), new AfResponse<RecoveryDraftSnapshot>(false, context.Errors, null));
        }

        var (snapshot, errors) = _recovery!.CreateDraft(_configuration, resourceKey, context.WorkoutFiles!, context.MachineMaster!, context.GymMaster!);
        return errors.Count > 0
            ? (RecoveryStatusCode(errors), new AfResponse<RecoveryDraftSnapshot>(false, errors, null))
            : (200, AfResponses.Ok(snapshot));
    }

    public async Task<(int StatusCode, AfResponse<RecoveryDraftSnapshot> Response)> UpdateRecoveryDraftAsync(string resourceKey, RecoveryDraftUpdate update, CancellationToken cancellationToken)
    {
        var context = await LoadRecoveryContextAsync(cancellationToken);
        if (context.Errors.Count > 0)
        {
            return (RecoveryStatusCode(context.Errors), new AfResponse<RecoveryDraftSnapshot>(false, context.Errors, null));
        }

        var (snapshot, errors) = _recovery!.UpdateDraft(_configuration, resourceKey, update, context.WorkoutFiles!, context.MachineMaster!, context.GymMaster!);
        return errors.Count > 0
            ? (RecoveryStatusCode(errors), new AfResponse<RecoveryDraftSnapshot>(false, errors, null))
            : (200, AfResponses.Ok(snapshot));
    }

    public async Task<(int StatusCode, AfResponse<RecoveryDraftSnapshot> Response)> DeleteRecoveryDraftAsync(string resourceKey, CancellationToken cancellationToken)
    {
        var context = await LoadRecoveryContextAsync(cancellationToken);
        if (context.Errors.Count > 0)
        {
            return (RecoveryStatusCode(context.Errors), new AfResponse<RecoveryDraftSnapshot>(false, context.Errors, null));
        }

        var (snapshot, errors) = _recovery!.DeleteDraft(_configuration, resourceKey, context.WorkoutFiles!, context.MachineMaster!, context.GymMaster!);
        return errors.Count > 0
            ? (RecoveryStatusCode(errors), new AfResponse<RecoveryDraftSnapshot>(false, errors, null))
            : (200, AfResponses.Ok(snapshot));
    }

    public async Task<(int StatusCode, AfResponse<RecoveryValidationResult> Response)> ValidateRecoveryDraftAsync(string resourceKey, CancellationToken cancellationToken)
    {
        var context = await LoadRecoveryContextAsync(cancellationToken);
        if (context.Errors.Count > 0)
        {
            return (RecoveryStatusCode(context.Errors), new AfResponse<RecoveryValidationResult>(false, context.Errors, null));
        }

        var (result, errors) = _recovery!.ValidateDraft(_configuration, resourceKey, context.WorkoutFiles!, context.MachineMaster!, context.GymMaster!);
        return errors.Count > 0 || result is null
            ? (RecoveryStatusCode(errors), new AfResponse<RecoveryValidationResult>(false, errors, null))
            : (200, AfResponses.Ok(result));
    }

    public async Task<(int StatusCode, AfResponse<RecoveryCommitResult> Response)> CommitRecoveryDraftAsync(
        string resourceKey,
        RecoveryCommitRequest request,
        CancellationToken cancellationToken)
    {
        if (!_operations.TryStart("recoveryCommit"))
        {
            return (409, AfResponses.Fail<RecoveryCommitResult>(new AfError(AfErrorCodes.OperationAlreadyRunning, "Recovery commit is already running.", true)));
        }

        try
        {
            if (string.IsNullOrWhiteSpace(request.ExpectedSourceRevision) || request.ExpectedDraftRevision is null)
            {
                _operations.Complete("recoveryCommit", false);
                return (400, AfResponses.Fail<RecoveryCommitResult>(new AfError(AfErrorCodes.RecoveryWriteFailed, "Recovery commit request is invalid.", true)));
            }

            var context = await LoadRecoveryContextAsync(cancellationToken);
            if (context.Errors.Count > 0)
            {
                _operations.Complete("recoveryCommit", false);
                return (RecoveryStatusCode(context.Errors), new AfResponse<RecoveryCommitResult>(false, context.Errors, null));
            }

            var (detail, detailErrors) = _recovery!.GetDetail(_configuration, resourceKey, context.WorkoutFiles!, context.MachineMaster!, context.GymMaster!);
            if (detailErrors.Count > 0 || detail is null)
            {
                var staleSource = context.WorkoutFiles!.FirstOrDefault(file =>
                    _recovery.MatchesWorkoutResourceKey(_configuration, resourceKey, file, request.ExpectedSourceRevision!));
                if (staleSource is not null &&
                    !string.Equals(ResolveRuntimeSourceRevision(staleSource), request.ExpectedSourceRevision, StringComparison.Ordinal))
                {
                    var sourceConflictErrors = new[] { new AfError(AfErrorCodes.RecoveryWriteConflict, "Recovery source revision is stale.", true) };
                    _operations.Complete("recoveryCommit", false);
                    return (409, new AfResponse<RecoveryCommitResult>(false, sourceConflictErrors, null));
                }

                _operations.Complete("recoveryCommit", false);
                return (RecoveryStatusCode(detailErrors), new AfResponse<RecoveryCommitResult>(false, detailErrors, null));
            }

            if (!string.Equals(detail.Inspection.Revision, request.ExpectedSourceRevision, StringComparison.Ordinal))
            {
                var sourceConflictErrors = new[] { new AfError(AfErrorCodes.RecoveryWriteConflict, "Recovery source revision is stale.", true) };
                _operations.Complete("recoveryCommit", false);
                return (409, new AfResponse<RecoveryCommitResult>(false, sourceConflictErrors, null));
            }

            if (detail.Inspection.Health != "broken")
            {
                var notBrokenErrors = new[] { new AfError(AfErrorCodes.RecoveryResourceNotBroken, "Recovery target is not Broken.", true) };
                _operations.Complete("recoveryCommit", false);
                return (409, new AfResponse<RecoveryCommitResult>(false, notBrokenErrors, null));
            }

            var (draft, draftErrors) = _recovery.GetDraft(_configuration, resourceKey, context.WorkoutFiles!, context.MachineMaster!, context.GymMaster!);
            if (draftErrors.Count > 0 || draft.State != "active" || draft.Draft is null)
            {
                var draftUnavailableErrors = draftErrors.Count > 0 ? draftErrors : new[] { new AfError(AfErrorCodes.RecoveryDraftRequired, "Recovery Draft is required.", true) };
                _operations.Complete("recoveryCommit", false);
                return (RecoveryStatusCode(draftUnavailableErrors), new AfResponse<RecoveryCommitResult>(false, draftUnavailableErrors, null));
            }

            if (draft.Draft.DraftRevision != request.ExpectedDraftRevision)
            {
                var draftConflictErrors = new[] { new AfError(AfErrorCodes.RecoveryDraftConflict, "Recovery Draft was updated elsewhere.", true) };
                _operations.Complete("recoveryCommit", false);
                return (409, new AfResponse<RecoveryCommitResult>(false, draftConflictErrors, null));
            }

            var (validation, validationErrors) = _recovery.ValidateDraft(_configuration, resourceKey, context.WorkoutFiles!, context.MachineMaster!, context.GymMaster!);
            if (validationErrors.Count > 0 || validation is null)
            {
                _operations.Complete("recoveryCommit", false);
                return (RecoveryStatusCode(validationErrors), new AfResponse<RecoveryCommitResult>(false, validationErrors, null));
            }

            if (!validation.CommitAllowed || string.IsNullOrWhiteSpace(validation.ReplacementContent))
            {
                var invalidCandidateErrors = new[] { new AfError(AfErrorCodes.RecoveryValidationFailed, "Recovery candidate is not committable.", true) };
                _operations.Complete("recoveryCommit", false);
                return (409, new AfResponse<RecoveryCommitResult>(false, invalidCandidateErrors, null));
            }

            var push = await _github.PushRecoveryReplacementAsync(
                _configuration,
                _token,
                detail.Inspection.Path,
                request.ExpectedSourceRevision!,
                validation.ReplacementPath,
                validation.ReplacementContent!,
                cancellationToken).ConfigureAwait(false);
            if (push.Result is null)
            {
                _operations.Complete("recoveryCommit", false);
                return (RecoveryStatusCode(push.Errors), new AfResponse<RecoveryCommitResult>(false, push.Errors, null));
            }

            var reflection = await ReflectRecoveryCommitAsync(validation.ReplacementPath, push.Result.ReplacementRevision, push.Result.CommitRevision, cancellationToken).ConfigureAwait(false);
            var result = new RecoveryCommitResult(
                true,
                detail.Inspection.Path,
                detail.Inspection.Revision,
                push.Result.ReplacementPath,
                push.Result.ReplacementRevision,
                push.Result.CommitRevision,
                validation.PathChange,
                reflection.Reflection);

            if (reflection.Reflection.Succeeded)
            {
                _ = _recovery.DeleteDraft(_configuration, resourceKey, context.WorkoutFiles!, context.MachineMaster!, context.GymMaster!);
                _operations.Complete("recoveryCommit", true);
                return (200, AfResponses.Ok(result));
            }

            var errors = new[] { new AfError(AfErrorCodes.RecoveryReflectionFailed, "Recovery commit succeeded but runtime reflection failed.", true) }
                .Concat(reflection.Reflection.Errors)
                .ToArray();
            _operations.Complete("recoveryCommit", false);
            return (200, new AfResponse<RecoveryCommitResult>(true, errors, reflection.Reflection.Warnings, result));
        }
        catch
        {
            _operations.Complete("recoveryCommit", false);
            return (500, AfResponses.Fail<RecoveryCommitResult>(new AfError(AfErrorCodes.CommonInternalError, "Recovery commit failed.", true)));
        }
    }

    private (RuntimeDataFile? Runtime, LocalMasterDocuments? Documents) LoadLocalMasterDocuments()
    {
        var (data, _) = _runtimeDataStore.LoadCurrent();
        return (data, data?.MasterDocuments);
    }

    private static MasterDocumentSnapshot? SelectLocalMasterDocument(LocalMasterDocuments documents, string type) => type switch
    {
        "MACHINE_MASTER" => documents.Machine,
        "GYM_MASTER" => documents.Gym,
        _ => null
    };

    private static LocalMasterDocuments ReplaceLocalMasterDocument(LocalMasterDocuments documents, string type, string content, string revision) => type switch
    {
        "MACHINE_MASTER" => documents with { Machine = new MasterDocumentSnapshot("MACHINE_MASTER", "master/machines.json", revision, content) },
        "GYM_MASTER" => documents with { Gym = new MasterDocumentSnapshot("GYM_MASTER", "master/gyms.json", revision, content) },
        _ => documents
    };

    private static RuntimeSourceFile ToRuntimeSource(MasterDocumentSnapshot document) => new(document.Path, document.Content, document.Revision);

    private async Task<RecoveryContext> LoadRecoveryContextAsync(CancellationToken cancellationToken)
    {
        if (_recovery is null)
        {
            return new RecoveryContext(
                null,
                null,
                null,
                new[] { new AfError(AfErrorCodes.RecoveryUnavailable, "Recovery is unavailable.", true) });
        }

        LoadConfiguration();
        LoadCredential();
        if (_configurationStatus != ComponentStatus.available)
        {
            return new RecoveryContext(
                null,
                null,
                null,
                new[] { new AfError(AfErrorCodes.ConfigRequired, "Configuration is required.", true) });
        }

        if (string.IsNullOrWhiteSpace(_token))
        {
            return new RecoveryContext(
                null,
                null,
                null,
                new[] { new AfError(AfErrorCodes.CredentialRequired, "Credential is required.", true) });
        }

        var workouts = await _github.FetchWorkoutFilesAsync(_configuration, _token, cancellationToken).ConfigureAwait(false);
        if (workouts.Errors.Count > 0)
        {
            return new RecoveryContext(null, null, null, workouts.Errors);
        }

        var machineSnapshot = await _github.ReadMasterDocumentAsync(_configuration, _token, "MACHINE_MASTER", cancellationToken).ConfigureAwait(false);
        if (machineSnapshot.Document is null)
        {
            return new RecoveryContext(null, null, null, machineSnapshot.Errors);
        }

        var gymSnapshot = await _github.ReadMasterDocumentAsync(_configuration, _token, "GYM_MASTER", cancellationToken).ConfigureAwait(false);
        if (gymSnapshot.Document is null)
        {
            return new RecoveryContext(null, null, null, gymSnapshot.Errors);
        }

        return new RecoveryContext(
            workouts.Files,
            ToRuntimeSource(machineSnapshot.Document),
            ToRuntimeSource(gymSnapshot.Document),
            Array.Empty<AfError>());
    }

    private async Task<(RecoveryReflectionResult Reflection, ResourceInspection? Inspection)> ReflectRecoveryCommitAsync(
        string replacementPath,
        string replacementRevision,
        string commitRevision,
        CancellationToken cancellationToken)
    {
        var committedConfiguration = _configuration with
        {
            Repository = _configuration.Repository with { Ref = commitRevision }
        };
        var context = await LoadRecoveryContextAsync(committedConfiguration, cancellationToken).ConfigureAwait(false);
        if (context.Errors.Count > 0)
        {
            return (new RecoveryReflectionResult(false, null, context.Errors, Array.Empty<RuntimeWarning>()), null);
        }

        var committed = context.WorkoutFiles!
            .FirstOrDefault(file => string.Equals(file.Path, replacementPath, StringComparison.Ordinal));
        if (committed is null || !string.Equals(ResolveRuntimeSourceRevision(committed), replacementRevision, StringComparison.Ordinal))
        {
            return (new RecoveryReflectionResult(
                false,
                null,
                new[] { new AfError(AfErrorCodes.RecoveryReflectionFailed, "Recovered resource revision is not reflected at the Recovery commit.", true) },
                Array.Empty<RuntimeWarning>()), null);
        }

        var inspection = _recovery!.InspectPath(_configuration, replacementPath, context.WorkoutFiles!, context.MachineMaster!, context.GymMaster!);
        if (inspection is null || inspection.Health == "broken")
        {
            return (new RecoveryReflectionResult(
                false,
                inspection?.Health,
                new[] { new AfError(AfErrorCodes.RecoveryReflectionFailed, "Recovered resource is not reflected as Healthy or Degraded.", true) },
                Array.Empty<RuntimeWarning>()), inspection);
        }

        var build = _runtimeDataBuilder.Build(context.WorkoutFiles!, context.MachineMaster!, context.GymMaster!);
        if (build.TechnicalInvalid)
        {
            _latestValidation = "failed";
            return (new RecoveryReflectionResult(false, inspection.Health, build.Errors, build.Warnings), inspection);
        }

        var masterDocuments = new LocalMasterDocuments(
            ToMasterDocumentSnapshot(context.MachineMaster!, "MACHINE_MASTER"),
            ToMasterDocumentSnapshot(context.GymMaster!, "GYM_MASTER"));
        var saveErrors = _runtimeDataStore.SaveCurrent(build, masterDocuments);
        if (saveErrors.Count > 0)
        {
            _runtimeStatus = ComponentStatus.unavailable;
            return (new RecoveryReflectionResult(false, inspection.Health, saveErrors, build.Warnings), inspection);
        }

        _githubStatus = ComponentStatus.available;
        _runtimeStatus = ComponentStatus.available;
        _latestRemoteRetrieval = "succeeded";
        _latestValidation = "succeeded";
        _requiredActions.RemoveAll(action => action == AfErrorCodes.RuntimeDataRequired);
        _applicationStatus = build.Errors.Count > 0 ? ApplicationStatus.degraded : ApplicationStatus.ready;
        return (new RecoveryReflectionResult(true, inspection.Health, Array.Empty<AfError>(), build.Warnings), inspection);
    }

    private async Task<RecoveryContext> LoadRecoveryContextAsync(AfConfiguration configuration, CancellationToken cancellationToken)
    {
        var workouts = await _github.FetchWorkoutFilesAsync(configuration, _token, cancellationToken).ConfigureAwait(false);
        if (workouts.Errors.Count > 0)
        {
            return new RecoveryContext(null, null, null, workouts.Errors);
        }

        var machineSnapshot = await _github.ReadMasterDocumentAsync(configuration, _token, "MACHINE_MASTER", cancellationToken).ConfigureAwait(false);
        if (machineSnapshot.Document is null)
        {
            return new RecoveryContext(null, null, null, machineSnapshot.Errors);
        }

        var gymSnapshot = await _github.ReadMasterDocumentAsync(configuration, _token, "GYM_MASTER", cancellationToken).ConfigureAwait(false);
        if (gymSnapshot.Document is null)
        {
            return new RecoveryContext(null, null, null, gymSnapshot.Errors);
        }

        return new RecoveryContext(
            workouts.Files,
            ToRuntimeSource(machineSnapshot.Document),
            ToRuntimeSource(gymSnapshot.Document),
            Array.Empty<AfError>());
    }

    private static MasterDocumentSnapshot ToMasterDocumentSnapshot(RuntimeSourceFile source, string type) =>
        new(type, source.Path, ResolveRuntimeSourceRevision(source), source.Content);

    private static string ResolveRuntimeSourceRevision(RuntimeSourceFile source)
    {
        if (!string.IsNullOrWhiteSpace(source.Revision))
        {
            return source.Revision;
        }

        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(source.Content));
        return "content-sha256-" + Convert.ToHexString(bytes).ToLowerInvariant();
    }

    private sealed record RecoveryContext(
        IReadOnlyList<RuntimeSourceFile>? WorkoutFiles,
        RuntimeSourceFile? MachineMaster,
        RuntimeSourceFile? GymMaster,
        IReadOnlyList<AfError> Errors);

    private static IReadOnlyList<AfError> ValidateLocalMasterLifecycleTransition(string type, string currentContent, string nextContent)
    {
        if (type != "GYM_MASTER")
        {
            return Array.Empty<AfError>();
        }

        try
        {
            var currentConfigured = HasMainGym(currentContent);
            var nextConfigured = HasMainGym(nextContent);
            return currentConfigured && !nextConfigured
                ? new[] { new AfError(AfErrorCodes.MasterWriteInvalid, "Configured Main Gym cannot be cleared.", true) }
                : Array.Empty<AfError>();
        }
        catch
        {
            return new[] { new AfError(AfErrorCodes.MasterWriteInvalid, "Master document lifecycle transition is invalid.", true) };
        }
    }

    private static bool HasMainGym(string content)
    {
        var document = JsonNode.Parse(content)?.AsObject();
        return document?["gyms"]?.AsArray()
            .OfType<JsonObject>()
            .Any(gym => gym["main"]?.GetValue<bool>() == true) == true;
    }

    public Task<(int StatusCode, AfResponse<IReadOnlyList<UnresolvedMasterReference>> Response)> GetUnresolvedMasterReferencesAsync(CancellationToken cancellationToken)
    {
        var (data, errors) = _runtimeDataStore.LoadCurrent();
        if (data is null)
        {
            return Task.FromResult((409, AfResponses.Fail<IReadOnlyList<UnresolvedMasterReference>>(new AfError(AfErrorCodes.MasterSyncRequired, "Master data must be synchronized before maintenance.", true))));
        }

        return Task.FromResult((200, AfResponses.Ok(BuildUnresolvedMasterReferences(data.Warnings ?? Array.Empty<RuntimeWarning>()))));
    }

    public async Task<(int StatusCode, AfResponse<MasterDocumentWriteResult> Response)> WriteMasterDocumentAsync(
        string type,
        MasterDocumentWriteRequest request,
        CancellationToken cancellationToken)
    {
        if (_configurationStatus != ComponentStatus.available)
        {
            return (400, AfResponses.Fail<MasterDocumentWriteResult>(new AfError(AfErrorCodes.ConfigRequired, "Configuration is required.", true)));
        }

        if (string.IsNullOrWhiteSpace(_token))
        {
            return (401, AfResponses.Fail<MasterDocumentWriteResult>(new AfError(AfErrorCodes.CredentialRequired, "Credential is required.", true)));
        }

        var local = LoadLocalMasterDocuments();
        if (local.Documents is null)
        {
            return (409, AfResponses.Fail<MasterDocumentWriteResult>(new AfError(AfErrorCodes.MasterSyncRequired, "Master data must be synchronized before maintenance.", true)));
        }

        var current = SelectLocalMasterDocument(local.Documents, type);
        if (current is null)
        {
            return (400, AfResponses.Fail<MasterDocumentWriteResult>(new AfError(AfErrorCodes.MasterWriteInvalid, "Master write target is not allowed.", true)));
        }

        if (!string.Equals(current.Revision, request.ExpectedRevision ?? "", StringComparison.Ordinal))
        {
            return (409, AfResponses.Fail<MasterDocumentWriteResult>(new AfError(AfErrorCodes.MasterSyncRequired, "Master document must be synchronized before saving.", true)));
        }

        var candidateContent = request.Content ?? "";
        if (string.IsNullOrWhiteSpace(candidateContent))
        {
            return (400, AfResponses.Fail<MasterDocumentWriteResult>(new AfError(AfErrorCodes.MasterWriteInvalid, "Master document write request is invalid.", true)));
        }

        var candidateDocuments = ReplaceLocalMasterDocument(local.Documents, type, candidateContent, current.Revision);
        var lifecycleErrors = ValidateLocalMasterLifecycleTransition(type, current.Content, candidateContent);
        if (lifecycleErrors.Count > 0)
        {
            return (400, new AfResponse<MasterDocumentWriteResult>(false, lifecycleErrors, null));
        }

        var validationErrors = MasterWriteValidator.ValidateWholeMaster(candidateDocuments.Machine.Content, candidateDocuments.Gym.Content);
        if (validationErrors.Count > 0)
        {
            return (400, new AfResponse<MasterDocumentWriteResult>(false, validationErrors, null));
        }

        var push = await _github.PushMasterDocumentAsync(
            _configuration,
            _token,
            type,
            current.Revision,
            candidateContent,
            cancellationToken);
        if (push.Result is null)
        {
            return (MapMasterWriteStatusCode(push.Errors), new AfResponse<MasterDocumentWriteResult>(false, push.Errors, null));
        }

        var confirmedDocuments = ReplaceLocalMasterDocument(local.Documents, type, candidateContent, push.Result.Revision);
        var workouts = await _github.FetchWorkoutFilesAsync(_configuration, _token, cancellationToken);
        if (workouts.Errors.Count > 0)
        {
            return (409, AfResponses.Fail<MasterDocumentWriteResult>(new AfError(AfErrorCodes.MasterSyncRequired, "Master data was saved remotely. Synchronize application data before continuing.", true)));
        }

        var build = _runtimeDataBuilder.Build(workouts.Files, ToRuntimeSource(confirmedDocuments.Machine), ToRuntimeSource(confirmedDocuments.Gym));
        if (build.TechnicalInvalid)
        {
            return (409, AfResponses.Fail<MasterDocumentWriteResult>(new AfError(AfErrorCodes.MasterSyncRequired, "Master data was saved remotely. Synchronize application data before continuing.", true)));
        }

        var saveErrors = _runtimeDataStore.SaveCurrent(build, confirmedDocuments);
        if (saveErrors.Count > 0)
        {
            return (409, AfResponses.Fail<MasterDocumentWriteResult>(new AfError(AfErrorCodes.MasterSyncRequired, "Master data was saved remotely. Synchronize application data before continuing.", true)));
        }

        _runtimeStatus = ComponentStatus.available;
        _latestValidation = "succeeded";
        _requiredActions.RemoveAll(action => action == AfErrorCodes.RuntimeDataRequired);
        _applicationStatus = DetermineApplicationStatus();
        return (200, AfResponses.Ok(push.Result));
    }

    private static IReadOnlyList<UnresolvedMasterReference> BuildUnresolvedMasterReferences(IReadOnlyList<RuntimeWarning> warnings)
    {
        var groups = new Dictionary<(string Type, string ReferenceId), List<UnresolvedAffectedWorkout>>();
        foreach (var warning in warnings.Where(warning => warning.Code is "MASTER_REFERENCE_MISSING" or "MASTER_REFERENCE_DELETED"))
        {
            var referenceId = warning.OriginalId.Trim();
            if (referenceId.Length == 0)
            {
                continue;
            }

            var key = (warning.ReferenceKind == "machine" ? "MACHINE_MASTER" : "GYM_MASTER", referenceId);
            if (!groups.TryGetValue(key, out var affected))
            {
                affected = new List<UnresolvedAffectedWorkout>();
                groups[key] = affected;
            }

            affected.Add(new UnresolvedAffectedWorkout(warning.FilePath ?? "", warning.Line, warning.Message));
        }

        return groups
            .OrderBy(group => group.Key.Type, StringComparer.Ordinal)
            .ThenBy(group => group.Key.ReferenceId, StringComparer.Ordinal)
            .Select(group => new UnresolvedMasterReference(group.Key.Type, group.Key.ReferenceId, group.Value))
            .ToArray();
    }

    private static (string FilePath, int? Line) ParseErrorLocation(string message)
    {
        var separator = message.IndexOf(": ", StringComparison.Ordinal);
        var location = separator < 0 ? message : message[..separator];
        var lineMarker = ": line ";
        var lineIndex = location.LastIndexOf(lineMarker, StringComparison.Ordinal);
        if (lineIndex >= 0 && int.TryParse(location[(lineIndex + lineMarker.Length)..], out var line))
        {
            return (location[..lineIndex], line);
        }

        return (location, null);
    }

    public (int StatusCode, AfResponse<CredentialUpdateResult> Response) UpdateCredential(CredentialUpdate update)
    {
        if (!_operations.TryStart("credentialUpdate"))
        {
            return (409, AfResponses.Fail<CredentialUpdateResult>(new AfError(AfErrorCodes.OperationAlreadyRunning, "Credential update is already running.", true)));
        }

        try
        {
            var result = _credentialStore.Save(update);
            LoadCredential();
            _applicationStatus = DetermineApplicationStatus();
            _operations.Complete("credentialUpdate", result.State != CredentialState.invalid.ToString());
            return result.State == CredentialState.invalid.ToString()
                ? (400, AfResponses.Fail<CredentialUpdateResult>(new AfError(AfErrorCodes.CredentialInvalid, "Credential is invalid.", true)))
                : (200, AfResponses.Ok(result));
        }
        catch
        {
            _operations.Complete("credentialUpdate", false);
            return (500, AfResponses.Fail<CredentialUpdateResult>(new AfError(AfErrorCodes.CredentialSaveFailed, "Credential could not be saved.", true)));
        }
    }

    public async Task<(int StatusCode, AfResponse<SyncResult> Response)> ManualSyncAsync(CancellationToken cancellationToken)
    {
        if (!_operations.TryStart("manualSync"))
        {
            return (409, AfResponses.Fail<SyncResult>(new AfError(AfErrorCodes.OperationAlreadyRunning, "Sync is already running.", true)));
        }

        try
        {
            var response = await SyncCoreAsync(cancellationToken);
            _operations.Complete("manualSync", response.Response.Success);
            return response;
        }
        catch
        {
            _operations.Complete("manualSync", false);
            return (500, AfResponses.Fail<SyncResult>(new AfError(AfErrorCodes.CommonInternalError, "Sync failed.", true)));
        }
    }

    public AfResponse<ShutdownResult> BeginShutdown()
    {
        var already = !_operations.TryStart("shutdown");
        _applicationStatus = ApplicationStatus.stopping;
        if (!already) _operations.Complete("shutdown", true);
        return AfResponses.Ok(new ShutdownResult(true, already));
    }

    private async Task StartupSyncAsync()
    {
        try
        {
            if (_configurationStatus != ComponentStatus.available || _credentialStatus.State is "missing" or "invalid" or "unknown")
            {
                _applicationStatus = DetermineApplicationStatus();
                _operations.Complete("startup", true);
                return;
            }

            var response = await SyncCoreAsync(CancellationToken.None);
            _applicationStatus = DetermineApplicationStatus();
            _operations.Complete("startup", response.Response.Success);
            if (!response.Response.Success)
            {
                _log.Write(LogType.WARN, "Startup sync completed without updating remote runtime data.");
            }
        }
        catch (Exception ex)
        {
            _log.Write(LogType.ERROR, "Startup sync failed: " + ex.Message);
            _applicationStatus = DetermineApplicationStatus();
            _operations.Complete("startup", false);
        }
    }

    private async Task<(int StatusCode, AfResponse<SyncResult> Response)> SyncCoreAsync(CancellationToken cancellationToken)
    {
        var remote = await _github.FetchAsync(_configuration, _token, cancellationToken);
        if (remote.Errors.Count > 0)
        {
            _latestRemoteRetrieval = "failed";
            _latestValidation = "skipped";
            _githubStatus = ComponentStatus.degraded;
            ValidateLocalRuntime();
            if (_runtimeStatus == ComponentStatus.available)
            {
                // Remote failure is degraded, not fatal, when a previously built runtime file can
                // still satisfy Frontend data requests.
                return (200, new AfResponse<SyncResult>(false, remote.Errors, new SyncResult(true)));
            }

            return (503, new AfResponse<SyncResult>(false, remote.Errors, null));
        }

        _latestRemoteRetrieval = "succeeded";
        _githubStatus = ComponentStatus.available;
        var machineSnapshot = await _github.ReadMasterDocumentAsync(_configuration, _token, "MACHINE_MASTER", cancellationToken);
        if (machineSnapshot.Document is null)
        {
            _latestValidation = "failed";
            return RuntimeBuildFailure(machineSnapshot.Errors);
        }

        var gymSnapshot = await _github.ReadMasterDocumentAsync(_configuration, _token, "GYM_MASTER", cancellationToken);
        if (gymSnapshot.Document is null)
        {
            _latestValidation = "failed";
            return RuntimeBuildFailure(gymSnapshot.Errors);
        }

        var machineMaster = ToRuntimeSource(machineSnapshot.Document);
        var gymMaster = ToRuntimeSource(gymSnapshot.Document);
        var workoutFiles = remote.Files.Where(file => file.Path.Contains("workouts/", StringComparison.OrdinalIgnoreCase)).ToArray();

        var build = _runtimeDataBuilder.Build(workoutFiles, machineMaster, gymMaster);
        if (build.TechnicalInvalid)
        {
            _latestValidation = "failed";
            return RuntimeBuildFailure(build.Errors);
        }

        var masterDocuments = new LocalMasterDocuments(machineSnapshot.Document, gymSnapshot.Document);
        var saveErrors = _runtimeDataStore.SaveCurrent(build, masterDocuments);
        if (saveErrors.Count > 0)
        {
            _runtimeStatus = ComponentStatus.unavailable;
            return (500, new AfResponse<SyncResult>(false, saveErrors, null));
        }

        _runtimeStatus = ComponentStatus.available;
        _latestValidation = "succeeded";
        _requiredActions.RemoveAll(action => action == AfErrorCodes.RuntimeDataRequired);
        _applicationStatus = build.Errors.Count > 0 ? ApplicationStatus.degraded : ApplicationStatus.ready;
        return (200, AfResponses.Ok(new SyncResult(build.Errors.Count > 0), build.Errors, build.Warnings));
    }

    private (int StatusCode, AfResponse<SyncResult> Response) RuntimeBuildFailure(IReadOnlyList<AfError> errors)
    {
        _githubStatus = ComponentStatus.degraded;
        ValidateLocalRuntime();
        _applicationStatus = DetermineApplicationStatus();
        if (_runtimeStatus == ComponentStatus.available)
        {
            return (200, new AfResponse<SyncResult>(false, errors, new SyncResult(true)));
        }

        return (503, new AfResponse<SyncResult>(false, errors, null));
    }

    private void LoadConfiguration()
    {
        var loaded = _configurationStore.Load();
        _configuration = loaded.Configuration;
        _configurationStatus = loaded.Available ? ComponentStatus.available : ComponentStatus.unavailable;
        _requiredActions.RemoveAll(action => action == "CONFIGURATION_REQUIRED");
        if (!loaded.Available) _requiredActions.Add("CONFIGURATION_REQUIRED");
    }

    private void LoadCredential()
    {
        var loaded = _credentialStore.Load();
        _token = loaded.Token;
        _credentialStatus = loaded.Status;
        _credentialComponentStatus = _credentialStatus.State == CredentialState.available.ToString() ? ComponentStatus.available : ComponentStatus.unavailable;
        _requiredActions.RemoveAll(action => action == "CREDENTIAL_REQUIRED");
        if (!_credentialStatus.Configured) _requiredActions.Add("CREDENTIAL_REQUIRED");
    }

    private void ValidateLocalRuntime()
    {
        var (data, _) = _runtimeDataStore.LoadCurrent();
        _runtimeStatus = data is null ? ComponentStatus.unavailable : ComponentStatus.available;
        _requiredActions.RemoveAll(action => action == AfErrorCodes.RuntimeDataRequired);
        if (data is null) _requiredActions.Add(AfErrorCodes.RuntimeDataRequired);
    }

    private ApplicationStatus DetermineApplicationStatus()
    {
        if (_configurationStatus == ComponentStatus.available && _runtimeStatus == ComponentStatus.available)
        {
            return _requiredActions.Count == 0 ? ApplicationStatus.ready : ApplicationStatus.degraded;
        }

        return ApplicationStatus.degraded;
    }

    private static AfConfiguration MergeConfiguration(AfConfiguration current, ConfigurationUpdate update)
    {
        // Settings posts partial updates. Merge keeps unspecified fields stable so independent
        // cards on the Settings screen do not accidentally reset each other.
        var repository = update.Repository is null
            ? current.Repository
            : new RepositoryConfiguration(
                update.Repository.Owner ?? current.Repository.Owner,
                update.Repository.Repository ?? current.Repository.Repository,
                update.Repository.Ref ?? current.Repository.Ref,
                update.Repository.RootPath ?? current.Repository.RootPath);

        var timeouts = update.Timeouts is null
            ? current.Timeouts
            : new TimeoutConfiguration(
                update.Timeouts.GithubRequestTimeoutSec ?? current.Timeouts.GithubRequestTimeoutSec,
                update.Timeouts.SyncOperationTimeoutSec ?? current.Timeouts.SyncOperationTimeoutSec,
                update.Timeouts.GeneralApiTimeoutSec ?? current.Timeouts.GeneralApiTimeoutSec,
                update.Timeouts.ShutdownTimeoutSec ?? current.Timeouts.ShutdownTimeoutSec);

        return new AfConfiguration(current.SchemaVersion, repository, update.Resources ?? current.Resources, timeouts);
    }
}
