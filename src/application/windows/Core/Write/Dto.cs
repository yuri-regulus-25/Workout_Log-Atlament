using System.Text.Json.Nodes;
using System.Text.Json.Serialization;

namespace Atlament.Core.Write;

/// <summary>Workout Manager が扱う用途限定 write boundary の公開 DTO。</summary>
public sealed record Boundary(
    [property: JsonPropertyName("writable")] bool Writable,
    [property: JsonPropertyName("reason")] string? Reason,
    [property: JsonPropertyName("remoteAvailable")] bool RemoteAvailable,
    [property: JsonPropertyName("source")] string Source,
    [property: JsonPropertyName("revision")] string? Revision,
    [property: JsonPropertyName("workoutDates")] IReadOnlyList<string> WorkoutDates);

public sealed record MasterOption(
    [property: JsonPropertyName("id")] string Id,
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("active")] bool Active,
    [property: JsonPropertyName("deleted")] bool Deleted);

public sealed record SetInput(
    [property: JsonPropertyName("sourceIndex")] int? SourceIndex,
    [property: JsonPropertyName("reps")] int? Reps,
    [property: JsonPropertyName("weightKg")] decimal? WeightKg,
    [property: JsonPropertyName("notes")] string? Notes);

public sealed record MachineInput(
    [property: JsonPropertyName("sourceIndex")] int? SourceIndex,
    [property: JsonPropertyName("machineId")] string? MachineId,
    [property: JsonPropertyName("sets")] IReadOnlyList<SetInput>? Sets)
{
    private string? _notes;

    /// <summary>Machine Notes の編集値。旧クライアントの省略と明示的な削除を区別する。</summary>
    [JsonPropertyName("notes")]
    public string? Notes
    {
        get => _notes;
        init { _notes = value; NotesSpecified = true; }
    }

    [JsonIgnore]
    public bool NotesSpecified { get; private set; }
}

public sealed record SessionInput(
    [property: JsonPropertyName("date")] string? Date,
    [property: JsonPropertyName("gymId")] string? GymId,
    [property: JsonPropertyName("machines")] IReadOnlyList<MachineInput>? Machines,
    [property: JsonPropertyName("notes")] string? Notes);

public sealed record CreateRequest(
    [property: JsonPropertyName("session")] SessionInput? Session,
    [property: JsonPropertyName("expectedContext")] string? ExpectedContext);

public sealed record UpdateRequest(
    [property: JsonPropertyName("session")] SessionInput? Session,
    [property: JsonPropertyName("expectedContext")] string? ExpectedContext);

public sealed record DeleteRequest(
    [property: JsonPropertyName("expectedContext")] string? ExpectedContext);

public sealed record SessionForEdit(
    [property: JsonPropertyName("sessionId")] string SessionId,
    [property: JsonPropertyName("session")] SessionInput Session,
    [property: JsonPropertyName("warnings")] IReadOnlyList<FieldWarning> Warnings);

public sealed record DateSnapshot(
    [property: JsonPropertyName("date")] string Date,
    [property: JsonPropertyName("sessions")] IReadOnlyList<SessionForEdit> Sessions,
    [property: JsonPropertyName("gyms")] IReadOnlyList<MasterOption> Gyms,
    [property: JsonPropertyName("machines")] IReadOnlyList<MasterOption> Machines,
    [property: JsonPropertyName("expectedContext")] string ExpectedContext);

public sealed record FieldError(
    [property: JsonPropertyName("path")] string Path,
    [property: JsonPropertyName("message")] string Message);

public sealed record FieldWarning(
    [property: JsonPropertyName("path")] string Path,
    [property: JsonPropertyName("message")] string Message);

public sealed record MutationResult(
    [property: JsonPropertyName("operation")] string Operation,
    [property: JsonPropertyName("sessionId")] string? SessionId,
    [property: JsonPropertyName("date")] string Date,
    [property: JsonPropertyName("commitRevision")] string CommitRevision,
    [property: JsonPropertyName("reflection")] ReflectionResult Reflection);

public sealed record MutationOutcome(
    [property: JsonPropertyName("result")] MutationResult? Result,
    [property: JsonPropertyName("fieldErrors")] IReadOnlyList<FieldError> FieldErrors);

public sealed record ReflectionResult(
    [property: JsonPropertyName("succeeded")] bool Succeeded,
    [property: JsonPropertyName("errors")] IReadOnlyList<AfError> Errors,
    [property: JsonPropertyName("warnings")] IReadOnlyList<RuntimeWarning> Warnings);

internal sealed record MasterEntry(string Id, string Name, bool Active, bool Deleted);

internal sealed record MasterCatalog(
    IReadOnlyDictionary<string, MasterEntry> Gyms,
    IReadOnlyDictionary<string, MasterEntry> Machines,
    RuntimeSourceFile MachineSource,
    RuntimeSourceFile GymSource);

internal sealed record ResourceDocument(
    string Path,
    string Revision,
    bool JsonLines,
    IReadOnlyList<JsonObject> Sessions);

internal sealed record SessionLocation(ResourceDocument Resource, int Index, JsonObject Session);

internal sealed record RepositoryState(string HeadRevision, IReadOnlyList<RuntimeSourceFile> WorkoutFiles);

internal sealed record ResourceChange(string Path, string? Content);

internal sealed record CommitResult(string CommitRevision);

internal sealed record RepositoryResult<T>(T? Value, IReadOnlyList<AfError> Errors) where T : class;

internal sealed record ExpectedContext(string HeadRevision, IReadOnlyDictionary<string, string> ResourceRevisions);

internal sealed record ValidationResult(IReadOnlyList<FieldError> FieldErrors, IReadOnlyList<AfError> Errors)
{
    public bool IsValid => FieldErrors.Count == 0 && Errors.Count == 0;
}
