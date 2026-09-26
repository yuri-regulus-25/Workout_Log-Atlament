namespace Atlament.Core.Write;

internal interface IReflection
{
    Task<ReflectionResult> ReflectAsync(AfConfiguration configuration, string? token, string commitRevision, CancellationToken cancellationToken);
}

/// <summary>Git commit 後の revision を読み直し、Runtime Dataへ反映する。</summary>
internal sealed class Reflection : IReflection
{
    private readonly GithubAccessService _github;
    private readonly RuntimeDataBuilder _builder;
    private readonly RuntimeDataStore _store;

    public Reflection(GithubAccessService github, RuntimeDataBuilder builder, RuntimeDataStore store)
    {
        _github = github;
        _builder = builder;
        _store = store;
    }

    public async Task<ReflectionResult> ReflectAsync(AfConfiguration configuration, string? token, string commitRevision, CancellationToken cancellationToken)
    {
        var committed = configuration with { Repository = configuration.Repository with { Ref = commitRevision } };
        var workouts = await _github.FetchWorkoutFilesAsync(committed, token, cancellationToken);
        var machine = await _github.ReadMasterDocumentAsync(committed, token, "MACHINE_MASTER", cancellationToken);
        var gym = await _github.ReadMasterDocumentAsync(committed, token, "GYM_MASTER", cancellationToken);
        var errors = workouts.Errors.Concat(machine.Errors).Concat(gym.Errors).ToArray();
        if (errors.Length > 0 || machine.Document is null || gym.Document is null)
        {
            return Failed(errors.Length > 0 ? errors : new[] { Error() });
        }

        var machineSource = new RuntimeSourceFile(machine.Document.Path, machine.Document.Content, machine.Document.Revision);
        var gymSource = new RuntimeSourceFile(gym.Document.Path, gym.Document.Content, gym.Document.Revision);
        var build = _builder.Build(workouts.Files, machineSource, gymSource);
        if (build.TechnicalInvalid)
        {
            return Failed(build.Errors);
        }
        var saveErrors = _store.SaveCurrent(build, new LocalMasterDocuments(machine.Document, gym.Document));
        return saveErrors.Count > 0
            ? Failed(saveErrors)
            : new ReflectionResult(true, Array.Empty<AfError>(), build.Warnings);
    }

    private static ReflectionResult Failed(IReadOnlyList<AfError> errors) =>
        new(false, errors.Count > 0 ? errors : new[] { Error() }, Array.Empty<RuntimeWarning>());

    private static AfError Error() => new(AfErrorCodes.WorkoutReflectionFailed, "Workout commit succeeded but runtime reflection failed.", true);
}
