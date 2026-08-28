using System.Net;
using System.Net.Http.Headers;
using System.Reflection;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
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
        LogRoot = Path.Combine(DataRoot, "logs");
    }

    public string RuntimeRoot { get; }
    public string DataRoot { get; }
    public string FrontendArtifactRoot { get; }
    public string ConfigurationRoot { get; }
    public string RuntimeDataRoot { get; }
    public string LogRoot { get; }
    public string CurrentRuntimeRoot => Path.Combine(RuntimeDataRoot, "current");
    public string TemporaryRuntimeRoot => Path.Combine(RuntimeDataRoot, "temporary");
    public string ConfigurationPath => Path.Combine(ConfigurationRoot, "af-settings.json");
    public string CredentialPath => Path.Combine(ConfigurationRoot, "credential.dpapi");
    public string RuntimeDataPath => Path.Combine(CurrentRuntimeRoot, "runtime-data.json");
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

    public IReadOnlyList<AfError> SaveCurrent(RuntimeBuildResult result)
    {
        try
        {
            // Write through the temporary runtime area so Frontend requests never observe a
            // partially serialized runtime-data.json during sync.
            Directory.CreateDirectory(_paths.TemporaryRuntimeRoot);
            var data = new RuntimeDataFile(1, DateTimeOffset.UtcNow, result.Sessions, result.Errors);
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
            if (data is null || data.SchemaVersion != 1 || data.Sessions is null)
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

public sealed class RuntimeDataBuilder
{
    private static readonly HashSet<string> BodyParts = new(StringComparer.Ordinal)
    {
        "chest", "back", "legs", "shoulders", "arms", "glutes", "core", "cardio", "other"
    };

    public RuntimeBuildResult Build(IReadOnlyList<RuntimeSourceFile> workoutFiles, RuntimeSourceFile machinesFile, RuntimeSourceFile gymsFile)
    {
        var errors = new List<AfError>();
        var machines = ParseMachineMaster(machinesFile, errors);
        var gyms = ParseGymMaster(gymsFile, errors);
        if (errors.Any(error => error.Code == AfErrorCodes.RuntimeDataInvalid))
        {
            // Master data is structural input for every workout. Stop immediately when it is
            // malformed so downstream errors do not hide the actual contract failure.
            return new RuntimeBuildResult(Array.Empty<WorkoutSession>(), errors, true);
        }

        if (workoutFiles.Count == 0)
        {
            errors.Add(new AfError(AfErrorCodes.RuntimeDataEmpty, "Workout resource is empty.", true));
            return new RuntimeBuildResult(Array.Empty<WorkoutSession>(), errors, true);
        }

        var sessions = new List<WorkoutSession>();
        foreach (var file in workoutFiles.OrderBy(file => file.Path, StringComparer.Ordinal))
        {
            if (file.Path.EndsWith(".jsonl", StringComparison.OrdinalIgnoreCase))
            {
                var lineNo = 0;
                foreach (var line in file.Content.Split(new[] { "\r\n", "\n" }, StringSplitOptions.None))
                {
                    lineNo++;
                    if (string.IsNullOrWhiteSpace(line)) continue;
                    var parsed = BuildSession(file.Path, lineNo, line, machines, gyms, errors);
                    if (parsed.TechnicalInvalid) return new RuntimeBuildResult(Array.Empty<WorkoutSession>(), errors, true);
                    if (parsed.Session is not null) sessions.Add(parsed.Session);
                }
            }
            else if (file.Path.EndsWith(".json", StringComparison.OrdinalIgnoreCase))
            {
                var parsed = BuildSession(file.Path, null, file.Content, machines, gyms, errors);
                if (parsed.TechnicalInvalid) return new RuntimeBuildResult(Array.Empty<WorkoutSession>(), errors, true);
                if (parsed.Session is not null) sessions.Add(parsed.Session);
            }
        }

        return errors.Count > 0
            // Master lookup misses are reported as user-actionable sync errors, but the current
            // runtime file is left untouched so local fallback can continue serving old data.
            ? new RuntimeBuildResult(Array.Empty<WorkoutSession>(), errors, false)
            : new RuntimeBuildResult(sessions, errors, false);
    }

    public (WorkoutSession? Session, bool TechnicalInvalid) BuildSingleSessionForTest(string json, string path = "test.json")
    {
        var machines = new Dictionary<string, MachineMasterItem>
        {
            ["known-machine"] = new("known-machine", "Known Machine", "chest")
        };
        var gyms = new Dictionary<string, GymMasterItem>
        {
            ["known-gym"] = new("known-gym", "Known Gym", "KG")
        };
        var errors = new List<AfError>();
        return BuildSession(path, null, json, machines, gyms, errors);
    }

    private static Dictionary<string, MachineMasterItem> ParseMachineMaster(RuntimeSourceFile file, List<AfError> errors)
    {
        try
        {
            using var document = JsonDocument.Parse(file.Content);
            var root = document.RootElement;
            if (!TryGetInt(root, "schema_version", out _) || !root.TryGetProperty("machines", out var items) || items.ValueKind != JsonValueKind.Array)
            {
                errors.Add(new AfError(AfErrorCodes.RuntimeDataInvalid, $"{file.Path}: Machine master contract is invalid.", false));
                return new();
            }

            var result = new Dictionary<string, MachineMasterItem>(StringComparer.Ordinal);
            foreach (var item in items.EnumerateArray())
            {
                if (!TryGetString(item, "machine_id", out var id) ||
                    !TryGetString(item, "name", out var name) ||
                    !TryGetString(item, "body_part", out var bodyPart) ||
                    !BodyParts.Contains(bodyPart) ||
                    !TryGetBool(item, "active", out _))
                {
                    errors.Add(new AfError(AfErrorCodes.RuntimeDataInvalid, $"{file.Path}: Machine master item is invalid.", false));
                    return new();
                }

                if (!result.TryAdd(id, new MachineMasterItem(id, name, bodyPart)))
                {
                    errors.Add(new AfError(AfErrorCodes.RuntimeDataInvalid, $"{file.Path}: Duplicate machine_id: {id}.", false));
                    return new();
                }
            }

            return result;
        }
        catch
        {
            errors.Add(new AfError(AfErrorCodes.RuntimeDataInvalid, $"{file.Path}: Machine master JSON is invalid.", false));
            return new();
        }
    }

    private static Dictionary<string, GymMasterItem> ParseGymMaster(RuntimeSourceFile file, List<AfError> errors)
    {
        try
        {
            using var document = JsonDocument.Parse(file.Content);
            var root = document.RootElement;
            if (!TryGetInt(root, "schema_version", out _) || !root.TryGetProperty("gyms", out var items) || items.ValueKind != JsonValueKind.Array)
            {
                errors.Add(new AfError(AfErrorCodes.RuntimeDataInvalid, $"{file.Path}: Gym master contract is invalid.", false));
                return new();
            }

            var result = new Dictionary<string, GymMasterItem>(StringComparer.Ordinal);
            foreach (var item in items.EnumerateArray())
            {
                if (!TryGetString(item, "gym_id", out var id) ||
                    !TryGetString(item, "name", out var name) ||
                    !TryGetBool(item, "active", out _))
                {
                    errors.Add(new AfError(AfErrorCodes.RuntimeDataInvalid, $"{file.Path}: Gym master item is invalid.", false));
                    return new();
                }

                TryGetString(item, "short_name", out var shortName);
                if (!result.TryAdd(id, new GymMasterItem(id, name, shortName)))
                {
                    errors.Add(new AfError(AfErrorCodes.RuntimeDataInvalid, $"{file.Path}: Duplicate gym_id: {id}.", false));
                    return new();
                }
            }

            return result;
        }
        catch
        {
            errors.Add(new AfError(AfErrorCodes.RuntimeDataInvalid, $"{file.Path}: Gym master JSON is invalid.", false));
            return new();
        }
    }

    private static (WorkoutSession? Session, bool TechnicalInvalid) BuildSession(
        string filePath,
        int? line,
        string content,
        IReadOnlyDictionary<string, MachineMasterItem> machines,
        IReadOnlyDictionary<string, GymMasterItem> gyms,
        List<AfError> errors)
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

            if (!gyms.TryGetValue(gymId, out var gymMaster))
            {
                errors.Add(new AfError(AfErrorCodes.MasterGymNotFound, Location(filePath, line) + $"Gym master is not found: {gymId}.", true));
                return (null, false);
            }

            var workoutMachines = new List<WorkoutMachine>();
            foreach (var machineItem in machineItems.EnumerateArray())
            {
                var parsed = BuildMachine(filePath, line, machineItem, machines, errors);
                if (parsed.TechnicalInvalid) return (null, true);
                if (parsed.MasterResolveFailure) return (null, false);
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
                new Gym(gymMaster.Id, gymMaster.Name, gymMaster.ShortName),
                ReadCondition(root),
                workoutMachines,
                ReadStringArray(root, "notes"));
            return (session, false);
        }
    }

    private static (WorkoutMachine? Machine, bool TechnicalInvalid, bool MasterResolveFailure) BuildMachine(
        string filePath,
        int? line,
        JsonElement item,
        IReadOnlyDictionary<string, MachineMasterItem> masters,
        List<AfError> errors)
    {
        if (item.ValueKind != JsonValueKind.Object ||
            !TryGetString(item, "machine_id", out var machineId) ||
            !item.TryGetProperty("sets", out var setItems) ||
            setItems.ValueKind != JsonValueKind.Array ||
            setItems.GetArrayLength() == 0)
        {
            errors.Add(new AfError(AfErrorCodes.RuntimeDataInvalid, Location(filePath, line) + "Machine required fields are invalid.", false));
            return (null, true, false);
        }

        if (!masters.TryGetValue(machineId, out var master))
        {
            errors.Add(new AfError(AfErrorCodes.MasterMachineNotFound, Location(filePath, line) + $"Machine master is not found: {machineId}.", true));
            return (null, false, true);
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
                return (null, true, false);
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

        return (new WorkoutMachine(machineId, master.Name, master.BodyPart, sets, ReadStringArray(item, "notes")), false, false);
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

    private sealed record MachineMasterItem(string Id, string Name, string BodyPart);
    private sealed record GymMasterItem(string Id, string Name, string? ShortName);
}

public sealed class GithubAccessService
{
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
        var rawUrl = $"https://raw.githubusercontent.com/{configuration.Repository.Owner}/{configuration.Repository.Repository}/{Uri.EscapeDataString(configuration.Repository.Ref)}/{EscapeRemotePath(path)}";
        using var request = CreateRequest(rawUrl, token);
        using var response = await _httpClient.SendAsync(request, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            return (null, MapGithubError(response.StatusCode, path));
        }

        return (new RuntimeSourceFile(path, await response.Content.ReadAsStringAsync(cancellationToken)), null);
    }

    private static HttpRequestMessage CreateRequest(string url, string? token)
    {
        var request = new HttpRequestMessage(HttpMethod.Get, url);
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

    private static string EscapeRemotePath(string path) =>
        string.Join("/", NormalizeRemotePath(path).Split('/', StringSplitOptions.RemoveEmptyEntries).Select(Uri.EscapeDataString));

    private static bool IsJsonRuntimePath(string path) =>
        path.EndsWith(".json", StringComparison.OrdinalIgnoreCase) ||
        path.EndsWith(".jsonl", StringComparison.OrdinalIgnoreCase);
}

public sealed record FrontendArtifactFile(string RequestPath, string? PhysicalPath, string? ResourceName)
{
    public bool IsEmbedded => ResourceName is not null;
}

public sealed class HostingStatusService
{
    private const string EmbeddedFrontendPrefix = "Frontend/";
    private readonly WindowsPathProvider _paths;
    private readonly Assembly _resourceAssembly;
    private readonly IReadOnlyDictionary<string, string> _embeddedResources;
    private static readonly IReadOnlyDictionary<string, string> ArtifactNames = new Dictionary<string, string>(StringComparer.Ordinal)
    {
        ["portal"] = "portal",
        ["dashboard"] = "dashboard",
        ["workouts"] = "workouts",
        ["machines"] = "machines",
        ["analytics"] = "analytics",
        ["settings"] = "settings"
    };

    public HostingStatusService(WindowsPathProvider paths)
    {
        _paths = paths;
        _resourceAssembly = typeof(HostingStatusService).Assembly;
        _embeddedResources = _resourceAssembly.GetManifestResourceNames()
            .Select(name => new { Key = NormalizeResourceName(name), ResourceName = name })
            .Where(resource => resource.Key.StartsWith(EmbeddedFrontendPrefix, StringComparison.Ordinal))
            .ToDictionary(resource => resource.Key, resource => resource.ResourceName, StringComparer.Ordinal);
    }

    public HostingComponentState GetStatus() => new(
        Status("portal"),
        Status("dashboard"),
        Status("workouts"),
        Status("machines"),
        Status("analytics"),
        Status("settings"));

    public FrontendArtifactFile? TryResolveFile(string requestPath, out bool artifactUnavailable)
    {
        artifactUnavailable = false;
        var normalized = requestPath.Trim('/');
        var app = normalized.Split('/', StringSplitOptions.RemoveEmptyEntries).FirstOrDefault() ?? "portal";
        if (app is "dashboard" or "workouts" or "machines" or "analytics" or "settings")
        {
            var relative = normalized.Length == app.Length ? "index.html" : normalized[(app.Length + 1)..];
            return Resolve(app, relative, out artifactUnavailable);
        }

        return Resolve("portal", normalized.Length == 0 ? "index.html" : normalized, out artifactUnavailable);
    }

    public Stream OpenRead(FrontendArtifactFile file)
    {
        if (file.PhysicalPath is not null)
        {
            return File.OpenRead(file.PhysicalPath);
        }

        if (file.ResourceName is not null)
        {
            return _resourceAssembly.GetManifestResourceStream(file.ResourceName)
                ?? throw new FileNotFoundException("Embedded frontend artifact was not found.", file.ResourceName);
        }

        throw new FileNotFoundException("Frontend artifact does not have a readable source.", file.RequestPath);
    }

    private string Status(string app)
    {
        return ResolveIndex(app) is not null
            ? ComponentStatus.available.ToString()
            : ComponentStatus.unavailable.ToString();
    }

    private FrontendArtifactFile? Resolve(string app, string relative, out bool artifactUnavailable)
    {
        artifactUnavailable = false;
        var sanitized = relative.Replace('\\', '/').TrimStart('/');
        if (sanitized.Split('/', StringSplitOptions.RemoveEmptyEntries).Any(segment => segment == ".."))
        {
            return null;
        }

        var resolved = ResolveExact(app, sanitized);
        if (resolved is not null)
        {
            return resolved;
        }

        if (app != "portal" && IsDefinedMpaRoute(app, sanitized))
        {
            return ResolveIndex(app);
        }

        if (!HasAppArtifactRoot(app))
        {
            artifactUnavailable = true;
        }

        return null;
    }

    private FrontendArtifactFile? ResolveIndex(string app) => ResolveExact(app, "index.html");

    private static bool IsDefinedMpaRoute(string app, string relative)
    {
        var route = relative.Trim('/');
        return app switch
        {
            "workouts" => System.Text.RegularExpressions.Regex.IsMatch(route, @"^\d{4}-\d{2}-\d{2}$"),
            "machines" => System.Text.RegularExpressions.Regex.IsMatch(route, @"^[A-Za-z0-9][A-Za-z0-9_-]*$"),
            _ => false
        };
    }

    private FrontendArtifactFile? ResolveExact(string app, string relative)
    {
        var root = PhysicalRoot(app);
        if (Directory.Exists(root))
        {
            var candidate = Path.GetFullPath(Path.Combine(root, relative.Replace('/', Path.DirectorySeparatorChar)));
            var fullRoot = Path.GetFullPath(root);
            if (candidate.StartsWith(fullRoot, StringComparison.OrdinalIgnoreCase) && File.Exists(candidate))
            {
                return new FrontendArtifactFile(candidate, candidate, null);
            }
        }

        var embeddedPath = EmbeddedPath(app, relative);
        return _embeddedResources.TryGetValue(embeddedPath, out var resourceName)
            ? new FrontendArtifactFile(embeddedPath, null, resourceName)
            : null;
    }

    private bool HasAppArtifactRoot(string app) => Directory.Exists(PhysicalRoot(app)) || ResolveIndex(app) is not null;

    private string PhysicalRoot(string app) => app == "portal"
        ? _paths.FrontendArtifactRoot
        : Path.Combine(_paths.FrontendArtifactRoot, ArtifactNames[app]);

    private static string EmbeddedPath(string app, string relative)
    {
        var normalized = relative.Replace('\\', '/').TrimStart('/');
        return app == "portal"
            ? EmbeddedFrontendPrefix + normalized
            : EmbeddedFrontendPrefix + ArtifactNames[app] + "/" + normalized;
    }

    private static string NormalizeResourceName(string resourceName) => resourceName.Replace('\\', '/');
}

public sealed class OperationGate
{
    private readonly object _syncRoot = new();
    private readonly Dictionary<string, OperationStatus> _operations = new(StringComparer.Ordinal)
    {
        ["startup"] = OperationStatus.idle,
        ["manualSync"] = OperationStatus.idle,
        ["configurationUpdate"] = OperationStatus.idle,
        ["credentialUpdate"] = OperationStatus.idle,
        ["shutdown"] = OperationStatus.idle
    };

    public bool TryStart(string name)
    {
        lock (_syncRoot)
        {
            // Startup sync and manual sync both update the same runtime file. Allowing them to
            // overlap would make Status API operation states ambiguous and risk last-writer wins.
            if (_operations["shutdown"] == OperationStatus.running && name != "shutdown") return false;
            if (name == "manualSync" && _operations["startup"] == OperationStatus.running) return false;
            if (name == "startup" && _operations["manualSync"] == OperationStatus.running) return false;
            if (_operations[name] == OperationStatus.running) return false;
            _operations[name] = OperationStatus.running;
            return true;
        }
    }

    public void Complete(string name, bool success)
    {
        lock (_syncRoot)
        {
            _operations[name] = success ? OperationStatus.completed : OperationStatus.failed;
        }
    }

    public OperationStateSnapshot Snapshot()
    {
        lock (_syncRoot)
        {
            return new OperationStateSnapshot(
                _operations["startup"].ToString(),
                _operations["manualSync"].ToString(),
                _operations["configurationUpdate"].ToString(),
                _operations["credentialUpdate"].ToString(),
                _operations["shutdown"].ToString());
        }
    }
}

public sealed class AtlamentApplication
{
    private static readonly string ApplicationFrameworkVersion =
        typeof(AtlamentApplication).Assembly.GetCustomAttribute<AssemblyInformationalVersionAttribute>()?.InformationalVersion
        ?? typeof(AtlamentApplication).Assembly.GetName().Version?.ToString()
        ?? "unknown";

    private readonly ConfigurationStore _configurationStore;
    private readonly CredentialStore _credentialStore;
    private readonly RuntimeDataStore _runtimeDataStore;
    private readonly RuntimeDataBuilder _runtimeDataBuilder;
    private readonly GithubAccessService _github;
    private readonly HostingStatusService _hosting;
    private readonly AfLog _log;
    private readonly OperationGate _operations = new();
    private AfConfiguration _configuration = AfConfiguration.Default;
    private CredentialStatus _credentialStatus = new(false, CredentialState.missing.ToString(), null);
    private string? _token;
    private ComponentStatus _configurationStatus = ComponentStatus.unknown;
    private ComponentStatus _credentialComponentStatus = ComponentStatus.unknown;
    private ComponentStatus _githubStatus = ComponentStatus.unknown;
    private ComponentStatus _runtimeStatus = ComponentStatus.unknown;
    private ApplicationStatus _applicationStatus = ApplicationStatus.starting;
    private readonly List<string> _requiredActions = new();

    public AtlamentApplication(
        ConfigurationStore configurationStore,
        CredentialStore credentialStore,
        RuntimeDataStore runtimeDataStore,
        RuntimeDataBuilder runtimeDataBuilder,
        GithubAccessService github,
        HostingStatusService hosting,
        AfLog log)
    {
        _configurationStore = configurationStore;
        _credentialStore = credentialStore;
        _runtimeDataStore = runtimeDataStore;
        _runtimeDataBuilder = runtimeDataBuilder;
        _github = github;
        _hosting = hosting;
        _log = log;
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
        ApplicationFrameworkVersion,
        new StatusVersions(ApplicationFrameworkVersion, GetFrontendFrameworkVersion()),
        new ApplicationState(_applicationStatus.ToString(), _applicationStatus == ApplicationStatus.degraded, _applicationStatus is not ApplicationStatus.stopping and not ApplicationStatus.failed),
        _operations.Snapshot(),
        new ComponentStateSnapshot(
            _configurationStatus.ToString(),
            _credentialComponentStatus.ToString(),
            _githubStatus.ToString(),
            _runtimeStatus.ToString(),
            _hosting.GetStatus()),
        _requiredActions.ToArray()));

    private string GetFrontendFrameworkVersion()
    {
        try
        {
            var versionFile = _hosting.TryResolveFile("/version.json", out _);
            if (versionFile is null) return "unknown";
            using var stream = _hosting.OpenRead(versionFile);
            var document = JsonNode.Parse(stream);
            return document?["frontend"]?.GetValue<string>() ?? "unknown";
        }
        catch
        {
            return "unknown";
        }
    }

    public AfResponse<RuntimeWorkoutData> GetRuntimeWorkouts()
    {
        var (data, errors) = _runtimeDataStore.LoadCurrent();
        if (data is null)
        {
            return AfResponses.Fail<RuntimeWorkoutData>(errors.First());
        }

        return AfResponses.Ok(new RuntimeWorkoutData(data.Sessions), data.Errors);
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

        _githubStatus = ComponentStatus.available;
        var machineMaster = remote.Files.FirstOrDefault(file => file.Path.EndsWith("master/machines.json", StringComparison.OrdinalIgnoreCase));
        var gymMaster = remote.Files.FirstOrDefault(file => file.Path.EndsWith("master/gyms.json", StringComparison.OrdinalIgnoreCase));
        var workoutFiles = remote.Files.Where(file => file.Path.Contains("workouts/", StringComparison.OrdinalIgnoreCase)).ToArray();
        if (machineMaster is null || gymMaster is null)
        {
            var error = new AfError(AfErrorCodes.GithubResourceNotFound, "Required master resource is missing.", true);
            return RuntimeBuildFailure(new[] { error });
        }

        var build = _runtimeDataBuilder.Build(workoutFiles, machineMaster, gymMaster);
        if (build.TechnicalInvalid || build.Errors.Count > 0)
        {
            return RuntimeBuildFailure(build.Errors);
        }

        var saveErrors = _runtimeDataStore.SaveCurrent(build);
        if (saveErrors.Count > 0)
        {
            _runtimeStatus = ComponentStatus.unavailable;
            return (500, new AfResponse<SyncResult>(false, saveErrors, null));
        }

        _runtimeStatus = ComponentStatus.available;
        _requiredActions.RemoveAll(action => action == AfErrorCodes.RuntimeDataRequired);
        _applicationStatus = build.Errors.Count > 0 ? ApplicationStatus.degraded : ApplicationStatus.ready;
        return (200, AfResponses.Ok(new SyncResult(build.Errors.Count > 0), build.Errors));
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
