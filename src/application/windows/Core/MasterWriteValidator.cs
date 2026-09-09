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
/// Master write 前に Machine/Gym master 全体の repository contract を検証する。
/// </summary>
/// <remarks>
/// 単一 record の見た目ではなく whole-master の整合性を判定する。
/// active/deleted を問わない ID/source_ids 重複、Main Gym の一意性、deleted/inactive Main Gym を拒否し、
/// Runtime 参照済み record の logical delete 自体はここでは禁止しない。
/// </remarks>
public static class MasterWriteValidator
{
    private static readonly HashSet<string> BodyParts = new(StringComparer.Ordinal)
    {
        "chest", "back", "legs", "shoulders", "arms", "glutes", "core", "cardio", "other"
    };

    /// <summary>
    /// Machine と Gym の両 Master を同時に検証する。
    /// </summary>
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

