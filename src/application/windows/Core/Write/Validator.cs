using System.Globalization;
using System.Text.Json.Nodes;

namespace Atlament.Core.Write;

/// <summary>Workout Manager の server-side field / reference validation。</summary>
internal static class Validator
{
    public static ValidationResult Validate(SessionInput? input, JsonObject? source, MasterCatalog masters, bool create)
    {
        var fields = new List<FieldError>();
        var errors = new List<AfError>();
        if (input is null)
        {
            fields.Add(new FieldError("session", "必須項目です"));
            errors.Add(Error(AfErrorCodes.WorkoutValidationFailed, "Workout session request is invalid."));
            return new ValidationResult(fields, errors);
        }

        if (string.IsNullOrWhiteSpace(input.Date) ||
            !DateOnly.TryParseExact(input.Date, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out _))
        {
            fields.Add(new FieldError("date", "必須項目です"));
        }
        else if (!create && source is not null && !string.Equals(input.Date, source["date"]?.GetValue<string>(), StringComparison.Ordinal))
        {
            fields.Add(new FieldError("date", "日付は変更できません"));
        }

        ValidateReference("gymId", input.GymId, source?["gym_id"]?.GetValue<string>(), masters.Gyms, create, fields);

        var machines = input.Machines ?? Array.Empty<MachineInput>();
        if (machines.Count is < 1 or > 10)
        {
            fields.Add(new FieldError("machines", "マシンは1件以上10件以下にしてください"));
        }

        var selected = new HashSet<string>(StringComparer.Ordinal);
        var usedSourceMachines = new HashSet<int>();
        var sourceMachines = source?["machines"] as JsonArray;
        for (var machineIndex = 0; machineIndex < machines.Count; machineIndex++)
        {
            var machine = machines[machineIndex];
            var path = $"machines[{machineIndex}]";
            JsonObject? sourceMachine = null;
            if (machine.SourceIndex is int originalMachine && !usedSourceMachines.Add(originalMachine))
            {
                fields.Add(new FieldError(path, "入力内容が不正です"));
            }
            if (machine.SourceIndex is int sourceIndex && sourceMachines is not null && sourceIndex >= 0 && sourceIndex < sourceMachines.Count)
            {
                sourceMachine = sourceMachines[sourceIndex] as JsonObject;
            }

            ValidateReference($"{path}.machineId", machine.MachineId, sourceMachine?["machine_id"]?.GetValue<string>(), masters.Machines, create || sourceMachine is null, fields);
            if (machine.NotesSpecified)
            {
                ValidateNotes($"{path}.notes", machine.Notes, Resource.ProjectSessionNotes(sourceMachine), fields);
            }
            if (!string.IsNullOrWhiteSpace(machine.MachineId) && !selected.Add(machine.MachineId))
            {
                fields.Add(new FieldError($"{path}.machineId", "同じマシンは選択できません"));
            }

            var sets = machine.Sets ?? Array.Empty<SetInput>();
            if (sets.Count is < 1 or > 10)
            {
                fields.Add(new FieldError($"{path}.sets", "セットは1件以上10件以下にしてください"));
            }

            var sourceSets = sourceMachine?["sets"] as JsonArray;
            var usedSourceSets = new HashSet<int>();
            for (var setIndex = 0; setIndex < sets.Count; setIndex++)
            {
                var set = sets[setIndex];
                var setPath = $"{path}.sets[{setIndex}]";
                if (set.SourceIndex is int original && !usedSourceSets.Add(original))
                {
                    fields.Add(new FieldError(setPath, "入力内容が不正です"));
                }

                if (set.Reps is null)
                {
                    fields.Add(new FieldError($"{setPath}.reps", "必須項目です"));
                }
                else if (set.Reps < 1)
                {
                    fields.Add(new FieldError($"{setPath}.reps", "1以上の整数を入力してください"));
                }
                else if (set.Reps > 100)
                {
                    fields.Add(new FieldError($"{setPath}.reps", "100以下の数値を入力してください"));
                }

                if (set.WeightKg is null)
                {
                    fields.Add(new FieldError($"{setPath}.weightKg", "必須項目です"));
                }
                else if (set.WeightKg < 0)
                {
                    fields.Add(new FieldError($"{setPath}.weightKg", "数字を入力してください"));
                }
                else if (set.WeightKg > 999.99m)
                {
                    fields.Add(new FieldError($"{setPath}.weightKg", "999.99以下の数値を入力してください"));
                }
                else if (decimal.Round(set.WeightKg.Value, 2) != set.WeightKg.Value)
                {
                    fields.Add(new FieldError($"{setPath}.weightKg", "少数は2桁までです"));
                }

                JsonObject? sourceSet = null;
                if (set.SourceIndex is int sourceSetIndex && sourceSets is not null && sourceSetIndex >= 0 && sourceSetIndex < sourceSets.Count)
                {
                    sourceSet = sourceSets[sourceSetIndex] as JsonObject;
                }
                ValidateNotes($"{setPath}.notes", set.Notes, sourceSet?["note"]?.GetValue<string>(), fields);
            }
        }

        var sourceNotes = Resource.ProjectSessionNotes(source);
        ValidateNotes("notes", input.Notes, sourceNotes, fields);
        if (fields.Any(error => error.Message == "マスターデータに存在しません"))
        {
            errors.Add(Error(AfErrorCodes.WorkoutReferenceInvalid, "Workout master reference is invalid."));
        }
        else if (fields.Count > 0)
        {
            errors.Add(Error(AfErrorCodes.WorkoutValidationFailed, "Workout validation failed."));
        }

        return new ValidationResult(fields, errors);
    }

    private static void ValidateReference(
        string path,
        string? value,
        string? sourceValue,
        IReadOnlyDictionary<string, MasterEntry> catalog,
        bool requireCurrent,
        List<FieldError> fields)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            fields.Add(new FieldError(path, "必須項目です"));
            return;
        }

        if (!requireCurrent && string.Equals(value, sourceValue, StringComparison.Ordinal))
        {
            return;
        }

        if (!catalog.TryGetValue(value, out var entry) || !entry.Active || entry.Deleted)
        {
            fields.Add(new FieldError(path, "マスターデータに存在しません"));
        }
    }

    private static void ValidateNotes(string path, string? value, string? sourceValue, List<FieldError> fields)
    {
        if ((value?.Length ?? 0) > 400 && !string.Equals(value ?? "", sourceValue ?? "", StringComparison.Ordinal))
        {
            fields.Add(new FieldError(path, "400字以内に入力してください"));
        }
    }

    private static AfError Error(string code, string message) => new(code, message, true);
}
