using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace Atlament.Core.Write;

/// <summary>Workout JSON / JSONL の解決、再構築、canonical serialization を担当する。</summary>
internal static class Resource
{
    public static (IReadOnlyList<ResourceDocument> Resources, IReadOnlyList<AfError> Errors) Parse(IReadOnlyList<RuntimeSourceFile> files)
    {
        var resources = new List<ResourceDocument>();
        var errors = new List<AfError>();
        foreach (var file in files)
        {
            try
            {
                var jsonl = file.Path.EndsWith(".jsonl", StringComparison.OrdinalIgnoreCase);
                var sessions = jsonl
                    ? file.Content.Split(new[] { "\r\n", "\n" }, StringSplitOptions.RemoveEmptyEntries)
                        .Select(line => JsonNode.Parse(line)?.AsObject() ?? throw new JsonException()).ToArray()
                    : new[] { JsonNode.Parse(file.Content)?.AsObject() ?? throw new JsonException() };
                if (sessions.Length == 0)
                {
                    throw new JsonException();
                }
                resources.Add(new ResourceDocument(file.Path, file.Revision ?? ContentRevision(file.Content), jsonl, sessions));
            }
            catch
            {
                errors.Add(new AfError(AfErrorCodes.WorkoutValidationFailed, $"{file.Path}: Workout resource is invalid.", true));
            }
        }
        return (resources, errors);
    }

    public static SessionLocation? FindSession(IReadOnlyList<ResourceDocument> resources, string sessionId)
    {
        SessionLocation? found = null;
        foreach (var resource in resources)
        {
            for (var index = 0; index < resource.Sessions.Count; index++)
            {
                if (resource.Sessions[index]["session_id"]?.GetValue<string>() != sessionId) continue;
                if (found is not null) return null;
                found = new SessionLocation(resource, index, resource.Sessions[index]);
            }
        }
        return found;
    }

    public static SessionInput Project(JsonObject source)
    {
        var machines = (source["machines"] as JsonArray ?? new JsonArray())
            .Select((node, machineIndex) =>
            {
                var machine = node?.AsObject();
                var sets = (machine?["sets"] as JsonArray ?? new JsonArray())
                    .Select((setNode, setIndex) =>
                    {
                        var set = setNode?.AsObject();
                        return new SetInput(
                            setIndex,
                            set?["reps"]?.GetValue<int>(),
                            set?["weight_kg"]?.GetValue<decimal>(),
                            set?["note"]?.GetValue<string>());
                    }).ToArray();
                return new MachineInput(machineIndex, machine?["machine_id"]?.GetValue<string>(), sets);
            }).ToArray();
        return new SessionInput(
            source["date"]?.GetValue<string>(),
            source["gym_id"]?.GetValue<string>(),
            machines,
            ProjectSessionNotes(source));
    }

    public static string ProjectSessionNotes(JsonObject? source)
    {
        if (source?["notes"] is not JsonArray notes) return "";
        return string.Join("\n", notes.Select(node => node?.GetValue<string>()).Where(value => value is not null));
    }

    public static JsonObject CreateSession(string sessionId, SessionInput input)
    {
        var result = new JsonObject
        {
            ["schema_version"] = 1,
            ["session_id"] = sessionId,
            ["date"] = input.Date,
            ["status"] = "complete",
            ["gym_id"] = input.GymId,
            ["machines"] = BuildMachines(input.Machines ?? Array.Empty<MachineInput>(), null)
        };
        ApplySessionNotes(result, input.Notes);
        return result;
    }

    public static JsonObject UpdateSession(JsonObject source, SessionInput input)
    {
        var result = source.DeepClone().AsObject();
        result["date"] = input.Date;
        result["gym_id"] = input.GymId;
        result["machines"] = BuildMachines(input.Machines ?? Array.Empty<MachineInput>(), source["machines"] as JsonArray);
        ApplySessionNotes(result, input.Notes);
        return result;
    }

    public static string Serialize(bool jsonl, IReadOnlyList<JsonObject> sessions)
    {
        if (!jsonl)
        {
            return sessions[0].ToJsonString(AfJson.RepositoryWriteOptions) + Environment.NewLine;
        }
        return string.Join("\n", sessions.Select(session => session.ToJsonString(AfJson.RepositoryJsonlWriteOptions))) + "\n";
    }

    public static string BuildDatePath(AfConfiguration configuration, string date, string extension)
    {
        var workout = configuration.Resources.First(resource => resource.Type == "WORKOUT");
        var root = Combine(configuration.Repository.RootPath, workout.Path);
        return Combine(root, $"{date[..4]}/{date.Substring(5, 2)}/{date}.{extension}");
    }

    public static string ContentRevision(string content)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(content));
        return "content-sha256-" + Convert.ToHexString(bytes).ToLowerInvariant();
    }

    private static JsonArray BuildMachines(IReadOnlyList<MachineInput> inputs, JsonArray? sourceMachines)
    {
        var result = new JsonArray();
        foreach (var input in inputs)
        {
            JsonObject machine;
            if (input.SourceIndex is int sourceIndex && sourceMachines is not null && sourceIndex >= 0 && sourceIndex < sourceMachines.Count && sourceMachines[sourceIndex] is JsonObject source)
            {
                machine = source.DeepClone().AsObject();
            }
            else
            {
                machine = new JsonObject();
            }
            machine["machine_id"] = input.MachineId;
            machine["sets"] = BuildSets(input.Sets ?? Array.Empty<SetInput>(), machine["sets"] as JsonArray);
            result.Add(machine);
        }
        return result;
    }

    private static JsonArray BuildSets(IReadOnlyList<SetInput> inputs, JsonArray? sourceSets)
    {
        var result = new JsonArray();
        for (var index = 0; index < inputs.Count; index++)
        {
            var input = inputs[index];
            JsonObject set;
            if (input.SourceIndex is int sourceIndex && sourceSets is not null && sourceIndex >= 0 && sourceIndex < sourceSets.Count && sourceSets[sourceIndex] is JsonObject source)
            {
                set = source.DeepClone().AsObject();
            }
            else
            {
                set = new JsonObject();
            }
            set["set"] = index + 1;
            set["reps"] = input.Reps;
            set["weight_kg"] = input.WeightKg;
            if (string.IsNullOrEmpty(input.Notes)) set.Remove("note"); else set["note"] = input.Notes;
            result.Add(set);
        }
        return result;
    }

    private static void ApplySessionNotes(JsonObject result, string? notes)
    {
        var values = (notes ?? "").Split(new[] { "\r\n", "\n" }, StringSplitOptions.None)
            .Where(value => value.Length > 0).ToArray();
        if (values.Length == 0)
        {
            result.Remove("notes");
            return;
        }
        result["notes"] = new JsonArray(values.Select(value => (JsonNode?)JsonValue.Create(value)).ToArray());
    }

    private static string Combine(string left, string right) =>
        string.Join('/', new[] { left, right }.Select(value => value.Replace('\\', '/').Trim('/')).Where(value => value.Length > 0));
}
