using System.Net;
using System.Net.Http.Headers;
using System.Reflection;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;

namespace Atlament.Core;

/// <summary>
/// Repository 上の Workout/Master source から Frontend 向け Runtime Data を構築する。
/// </summary>
/// <remarks>
/// 構造的に壊れた Master は whole-runtime fallback 対象とする一方、壊れた Workout resource は
/// resource 単位で隔離する。未解決または削除済みの Master reference は warning として保持し、
/// Workout session 自体は集計対象に残す。
/// </remarks>
public sealed class RuntimeDataBuilder
{
    private static readonly HashSet<string> BodyParts = new(StringComparer.Ordinal)
    {
        "chest", "back", "legs", "shoulders", "arms", "glutes", "core", "cardio", "other"
    };

    /// <summary>
    /// Runtime Data の採用可否、隔離対象、Master reference warning を判定する。
    /// </summary>
    /// <returns>
    /// `TechnicalInvalid` が true の場合は新しい Runtime Data として採用してはならない。
    /// false の場合は errors に Broken Workout resource が含まれていても、残りの session は採用可能である。
    /// </returns>
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
            return new RuntimeBuildResult(Array.Empty<WorkoutSession>(), errors, warnings, false);
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

    /// <summary>
    /// 1 Workout record を Runtime session へ正規化する。
    /// </summary>
    /// <remarks>
    /// schema/date/status/sets などの必須構造違反は Broken Resource として扱う。
    /// Master reference の missing/deleted/invalid_excluded は warning 化し、元 ID と canonical ID の関係を
    /// resolution に保持する。
    /// </remarks>
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

