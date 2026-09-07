using System.Net;
using System.Net.Http.Headers;
using System.Reflection;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;

namespace Atlament.Core;
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

