using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace Atlament.Core.Write;

/// <summary>Workout Session create/update/delete の transaction boundary を調停する。</summary>
public sealed class Service
{
    private readonly GithubAccessService _github;
    private readonly RuntimeDataBuilder _builder;
    private readonly IRepository _repository;
    private readonly IReflection _reflection;

    internal Service(GithubAccessService github, RuntimeDataBuilder builder, IRepository repository, IReflection reflection)
    {
        _github = github;
        _builder = builder;
        _repository = repository;
        _reflection = reflection;
    }

    public async Task<(int StatusCode, AfResponse<Boundary> Response)> GetBoundaryAsync(
        AfConfiguration configuration,
        string? token,
        bool configurationAvailable,
        bool credentialAvailable,
        bool fallbackActive,
        CancellationToken cancellationToken)
    {
        if (!configurationAvailable || !credentialAvailable || fallbackActive)
        {
            var reason = fallbackActive ? "FALLBACK_ACTIVE" : !configurationAvailable ? "CONFIGURATION_REQUIRED" : "CREDENTIAL_REQUIRED";
            return (200, AfResponses.Ok(new Boundary(false, reason, false, fallbackActive ? "fallback" : "unavailable", null, Array.Empty<string>())));
        }

        var loaded = await LoadAsync(configuration, token, cancellationToken);
        if (loaded.Context is null)
        {
            return (StatusCode(loaded.Errors), new AfResponse<Boundary>(false, loaded.Errors, null));
        }

        var dates = loaded.Context.Resources.SelectMany(resource => resource.Sessions)
            .Select(session => session["date"]?.GetValue<string>())
            .Where(date => !string.IsNullOrWhiteSpace(date))
            .Distinct(StringComparer.Ordinal)
            .OrderBy(date => date, StringComparer.Ordinal)
            .Cast<string>()
            .ToArray();
        return (200, AfResponses.Ok(new Boundary(true, null, true, "remote", loaded.Context.Head, dates)));
    }

    public async Task<(int StatusCode, AfResponse<DateSnapshot> Response)> GetDateAsync(
        AfConfiguration configuration,
        string? token,
        string date,
        CancellationToken cancellationToken)
    {
        if (!IsDate(date)) return (400, AfResponses.Fail<DateSnapshot>(Error(AfErrorCodes.WorkoutValidationFailed, "Workout date is invalid.")));
        var loaded = await LoadAsync(configuration, token, cancellationToken);
        if (loaded.Context is null) return (StatusCode(loaded.Errors), new AfResponse<DateSnapshot>(false, loaded.Errors, null));
        var context = loaded.Context;
        var sessions = context.Resources
            .SelectMany(resource => resource.Sessions)
            .Where(session => session["date"]?.GetValue<string>() == date)
            .OrderBy(session => session["session_id"]?.GetValue<string>(), StringComparer.Ordinal)
            .Select(session => ToEditSession(session, context.Masters))
            .ToArray();
        var revisions = RelevantRevisions(context.Resources, date);
        var snapshot = new DateSnapshot(
            date,
            sessions,
            Options(context.Masters.Gyms),
            Options(context.Masters.Machines),
            EncodeContext(new ExpectedContext(context.Head, revisions)));
        return (200, AfResponses.Ok(snapshot));
    }

    public Task<(int StatusCode, AfResponse<MutationOutcome> Response)> CreateAsync(AfConfiguration configuration, string? token, CreateRequest request, CancellationToken cancellationToken) =>
        MutateAsync(configuration, token, "Create", null, request.Session, request.ExpectedContext, cancellationToken);

    public Task<(int StatusCode, AfResponse<MutationOutcome> Response)> UpdateAsync(AfConfiguration configuration, string? token, string sessionId, UpdateRequest request, CancellationToken cancellationToken) =>
        MutateAsync(configuration, token, "Update", sessionId, request.Session, request.ExpectedContext, cancellationToken);

    public Task<(int StatusCode, AfResponse<MutationOutcome> Response)> DeleteAsync(AfConfiguration configuration, string? token, string sessionId, DeleteRequest request, CancellationToken cancellationToken) =>
        MutateAsync(configuration, token, "Delete", sessionId, null, request.ExpectedContext, cancellationToken);

    private async Task<(int StatusCode, AfResponse<MutationOutcome> Response)> MutateAsync(
        AfConfiguration configuration,
        string? token,
        string operation,
        string? sessionId,
        SessionInput? input,
        string? expectedToken,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(token)) return Failure(503, Error(AfErrorCodes.WorkoutWriteUnavailable, "Workout write is unavailable."));
        var expected = DecodeContext(expectedToken);
        if (expected is null) return Failure(409, Error(AfErrorCodes.WorkoutSessionConflict, "Workout session must be reloaded before saving."));
        var loaded = await LoadAsync(configuration, token, cancellationToken);
        if (loaded.Context is null) return Failure(StatusCode(loaded.Errors), loaded.Errors);
        var context = loaded.Context;
        if (!string.Equals(expected.HeadRevision, context.Head, StringComparison.Ordinal))
        {
            return Failure(409, Error(AfErrorCodes.WorkoutRepositoryConflict, "Workout data changed. Reload before saving."));
        }

        var location = sessionId is null ? null : Resource.FindSession(context.Resources, sessionId);
        if (sessionId is not null && location is null)
        {
            return Failure(404, Error(AfErrorCodes.WorkoutSessionNotFound, "Workout session was not found."));
        }
        var date = operation == "Delete" ? location!.Session["date"]?.GetValue<string>() ?? "" : input?.Date ?? "";
        if (!ExpectedRevisionsMatch(expected, context.Resources, date))
        {
            return Failure(409, Error(AfErrorCodes.WorkoutResourceConflict, "Workout resource changed. Reload before saving."));
        }

        if (operation != "Delete")
        {
            var validation = Validator.Validate(input, location?.Session, context.Masters, operation == "Create");
            if (!validation.IsValid)
            {
                return (400, new AfResponse<MutationOutcome>(false, validation.Errors, new MutationOutcome(null, validation.FieldErrors)));
            }
        }

        var plan = BuildPlan(configuration, context.Resources, operation, location, input, sessionId);
        if (plan.Errors.Count > 0) return Failure(409, plan.Errors);
        var candidateValidation = ValidateCandidates(plan.CandidateFiles, context.Masters);
        if (candidateValidation.Count > 0) return Failure(400, candidateValidation);

        var commit = await _repository.CommitAsync(
            configuration,
            token,
            context.Head,
            $"{operation}: Workout Log - {date.Replace('-', '/')}",
            plan.Changes,
            cancellationToken);
        if (commit.Value is null) return Failure(StatusCode(commit.Errors), commit.Errors);

        var reflection = await _reflection.ReflectAsync(configuration, token, commit.Value.CommitRevision, cancellationToken);
        var result = new MutationResult(operation.ToLowerInvariant(), plan.SessionId, date, commit.Value.CommitRevision, reflection);
        var responseErrors = reflection.Succeeded
            ? Array.Empty<AfError>()
            : new[] { Error(AfErrorCodes.WorkoutReflectionFailed, "Workout data was saved, but runtime reflection failed.") };
        return (200, new AfResponse<MutationOutcome>(true, responseErrors, reflection.Warnings, new MutationOutcome(result, Array.Empty<FieldError>())));
    }

    private MutationPlan BuildPlan(
        AfConfiguration configuration,
        IReadOnlyList<ResourceDocument> resources,
        string operation,
        SessionLocation? location,
        SessionInput? input,
        string? requestedSessionId)
    {
        var changes = new List<ResourceChange>();
        var candidateFiles = resources.Select(resource => new RuntimeSourceFile(resource.Path, Resource.Serialize(resource.JsonLines, resource.Sessions), resource.Revision)).ToList();
        string? resultSessionId = requestedSessionId;
        if (operation == "Create")
        {
            resultSessionId = CreateSessionId(input!.Date!, resources);
            var created = Resource.CreateSession(resultSessionId, input);
            var targets = resources.Where(resource => resource.Sessions.Any(session => session["date"]?.GetValue<string>() == input.Date)).ToArray();
            if (targets.Length > 1) return MutationPlan.Conflict("Multiple resources contain the selected Workout date.");
            if (targets.Length == 0)
            {
                var path = Resource.BuildDatePath(configuration, input.Date!, "json");
                var content = Resource.Serialize(false, new[] { created });
                changes.Add(new ResourceChange(path, content));
                candidateFiles.Add(new RuntimeSourceFile(path, content));
            }
            else
            {
                var target = targets[0];
                var sessions = target.Sessions.Concat(new[] { created }).ToArray();
                if (target.JsonLines)
                {
                    ReplaceCandidate(candidateFiles, target.Path, Resource.Serialize(true, sessions), changes);
                }
                else
                {
                    var jsonlPath = Resource.BuildDatePath(configuration, input.Date!, "jsonl");
                    if (resources.Any(resource => resource.Path == jsonlPath)) return MutationPlan.Conflict("Workout JSONL destination already exists.");
                    changes.Add(new ResourceChange(target.Path, null));
                    var content = Resource.Serialize(true, sessions);
                    changes.Add(new ResourceChange(jsonlPath, content));
                    candidateFiles.RemoveAll(file => file.Path == target.Path);
                    candidateFiles.Add(new RuntimeSourceFile(jsonlPath, content));
                }
            }
        }
        else if (operation == "Update")
        {
            var sessions = location!.Resource.Sessions.Select((session, index) => index == location.Index ? Resource.UpdateSession(location.Session, input!) : session).ToArray();
            ReplaceCandidate(candidateFiles, location.Resource.Path, Resource.Serialize(location.Resource.JsonLines, sessions), changes);
        }
        else
        {
            var sessions = location!.Resource.Sessions.Where((_, index) => index != location.Index).ToArray();
            if (sessions.Length == 0)
            {
                changes.Add(new ResourceChange(location.Resource.Path, null));
                candidateFiles.RemoveAll(file => file.Path == location.Resource.Path);
            }
            else
            {
                ReplaceCandidate(candidateFiles, location.Resource.Path, Resource.Serialize(location.Resource.JsonLines, sessions), changes);
            }
        }
        return new MutationPlan(resultSessionId, changes, candidateFiles, Array.Empty<AfError>());
    }

    private IReadOnlyList<AfError> ValidateCandidates(IReadOnlyList<RuntimeSourceFile> files, MasterCatalog masters)
    {
        var build = _builder.Build(files, masters.MachineSource, masters.GymSource);
        var ids = files.SelectMany(file => Resource.Parse(new[] { file }).Resources.SelectMany(resource => resource.Sessions))
            .Select(session => session["session_id"]?.GetValue<string>()).Where(id => !string.IsNullOrWhiteSpace(id)).ToArray();
        if (ids.Length != ids.Distinct(StringComparer.Ordinal).Count())
        {
            return new[] { Error(AfErrorCodes.WorkoutValidationFailed, "Duplicate session_id is not allowed.") };
        }
        return build.TechnicalInvalid || build.Errors.Count > 0
            ? new[] { Error(AfErrorCodes.WorkoutValidationFailed, "Affected Workout resource is invalid.") }
            : Array.Empty<AfError>();
    }

    private async Task<LoadResult> LoadAsync(AfConfiguration configuration, string? token, CancellationToken cancellationToken)
    {
        if (ConfigurationStore.Validate(configuration).Count > 0 || string.IsNullOrWhiteSpace(token))
        {
            return LoadResult.Failed(Error(AfErrorCodes.WorkoutWriteUnavailable, "Workout write is unavailable."));
        }
        var before = await _repository.ReadHeadAsync(configuration, token, cancellationToken);
        if (before.Value is null) return new LoadResult(null, before.Errors);
        var workoutsTask = _github.FetchWorkoutFilesAsync(configuration, token, cancellationToken);
        var machineTask = _github.ReadMasterDocumentAsync(configuration, token, "MACHINE_MASTER", cancellationToken);
        var gymTask = _github.ReadMasterDocumentAsync(configuration, token, "GYM_MASTER", cancellationToken);
        await Task.WhenAll(workoutsTask, machineTask, gymTask);
        var workouts = await workoutsTask;
        var machine = await machineTask;
        var gym = await gymTask;
        var errors = workouts.Errors.Concat(machine.Errors).Concat(gym.Errors).ToArray();
        if (errors.Length > 0 || machine.Document is null || gym.Document is null) return new LoadResult(null, errors.Length > 0 ? errors : new[] { Error(AfErrorCodes.WorkoutWriteFailed, "Workout source could not be loaded.") });
        var after = await _repository.ReadHeadAsync(configuration, token, cancellationToken);
        if (after.Value is null) return new LoadResult(null, after.Errors);
        if (!string.Equals(before.Value, after.Value, StringComparison.Ordinal)) return LoadResult.Failed(Error(AfErrorCodes.WorkoutRepositoryConflict, "Workout data changed while loading."));
        var parsed = Resource.Parse(workouts.Files);
        if (parsed.Errors.Count > 0) return new LoadResult(null, parsed.Errors);
        var masters = ParseMasters(machine.Document, gym.Document);
        return masters.Catalog is null ? new LoadResult(null, masters.Errors) : new LoadResult(new LoadContext(after.Value, parsed.Resources, masters.Catalog), Array.Empty<AfError>());
    }

    private static (MasterCatalog? Catalog, IReadOnlyList<AfError> Errors) ParseMasters(MasterDocumentSnapshot machine, MasterDocumentSnapshot gym)
    {
        try
        {
            var machineSource = new RuntimeSourceFile(machine.Path, machine.Content, machine.Revision);
            var gymSource = new RuntimeSourceFile(gym.Path, gym.Content, gym.Revision);
            return (new MasterCatalog(ParseMaster(gym.Content, "gyms", "gym_id"), ParseMaster(machine.Content, "machines", "machine_id"), machineSource, gymSource), Array.Empty<AfError>());
        }
        catch
        {
            return (null, new[] { Error(AfErrorCodes.WorkoutWriteUnavailable, "Master data is invalid.") });
        }
    }

    private static IReadOnlyDictionary<string, MasterEntry> ParseMaster(string content, string arrayName, string idName)
    {
        var array = JsonNode.Parse(content)?[arrayName]?.AsArray() ?? throw new JsonException();
        var result = new Dictionary<string, MasterEntry>(StringComparer.Ordinal);
        foreach (var node in array)
        {
            var item = node?.AsObject() ?? throw new JsonException();
            var id = item[idName]?.GetValue<string>() ?? throw new JsonException();
            var entry = new MasterEntry(id, item["name"]?.GetValue<string>() ?? id, item["active"]?.GetValue<bool>() == true, item["deleted"]?.GetValue<bool>() == true);
            result[id] = entry;
            if (item["source_ids"] is JsonArray sourceIds)
            {
                foreach (var sourceId in sourceIds.Select(value => value?.GetValue<string>()).Where(value => !string.IsNullOrWhiteSpace(value))) result[sourceId!] = entry;
            }
        }
        return result;
    }

    private static SessionForEdit ToEditSession(JsonObject session, MasterCatalog masters)
    {
        var warnings = new List<FieldWarning>();
        AddReferenceWarning("gymId", session["gym_id"]?.GetValue<string>(), masters.Gyms, warnings);
        if (session["machines"] is JsonArray machines)
        {
            for (var index = 0; index < machines.Count; index++) AddReferenceWarning($"machines[{index}].machineId", machines[index]?["machine_id"]?.GetValue<string>(), masters.Machines, warnings);
        }
        var id = session["session_id"]?.GetValue<string>() ?? "";
        return new SessionForEdit(id, Resource.Project(session), warnings);
    }

    private static void AddReferenceWarning(string path, string? id, IReadOnlyDictionary<string, MasterEntry> entries, List<FieldWarning> warnings)
    {
        if (string.IsNullOrWhiteSpace(id) || !entries.TryGetValue(id, out var entry) || !entry.Active || entry.Deleted)
        {
            warnings.Add(new FieldWarning(path, "現在のマスターデータでは選択できない値です。変更しない場合はそのまま保存できます。"));
        }
    }

    private static IReadOnlyList<MasterOption> Options(IReadOnlyDictionary<string, MasterEntry> entries) => entries.Values
        .DistinctBy(entry => entry.Id).Where(entry => entry.Active && !entry.Deleted)
        .OrderBy(entry => entry.Name, StringComparer.CurrentCulture)
        .Select(entry => new MasterOption(entry.Id, entry.Name, entry.Active, entry.Deleted)).ToArray();

    private static IReadOnlyDictionary<string, string> RelevantRevisions(IReadOnlyList<ResourceDocument> resources, string date) => resources
        .Where(resource => resource.Sessions.Any(session => session["date"]?.GetValue<string>() == date))
        .ToDictionary(resource => resource.Path, resource => resource.Revision, StringComparer.Ordinal);

    private static bool ExpectedRevisionsMatch(ExpectedContext expected, IReadOnlyList<ResourceDocument> resources, string date)
    {
        var current = RelevantRevisions(resources, date);
        return expected.ResourceRevisions.Count == current.Count && expected.ResourceRevisions.All(pair => current.TryGetValue(pair.Key, out var revision) && revision == pair.Value);
    }

    private static string EncodeContext(ExpectedContext context) => Convert.ToBase64String(Encoding.UTF8.GetBytes(JsonSerializer.Serialize(context, AfJson.Options)));
    private static ExpectedContext? DecodeContext(string? value)
    {
        try { return JsonSerializer.Deserialize<ExpectedContext>(Encoding.UTF8.GetString(Convert.FromBase64String(value ?? "")), AfJson.Options); }
        catch { return null; }
    }

    private static void ReplaceCandidate(List<RuntimeSourceFile> files, string path, string content, List<ResourceChange> changes)
    {
        changes.Add(new ResourceChange(path, content));
        var index = files.FindIndex(file => file.Path == path);
        if (index >= 0) files[index] = new RuntimeSourceFile(path, content); else files.Add(new RuntimeSourceFile(path, content));
    }

    private static string CreateSessionId(string date, IReadOnlyList<ResourceDocument> resources)
    {
        var ids = resources.SelectMany(resource => resource.Sessions).Select(session => session["session_id"]?.GetValue<string>()).ToHashSet(StringComparer.Ordinal);
        string id;
        do { id = $"{date}-{Guid.NewGuid():N}"; } while (ids.Contains(id));
        return id;
    }

    private static bool IsDate(string date) => DateOnly.TryParseExact(date, "yyyy-MM-dd", out _);
    private static AfError Error(string code, string message) => new(code, message, true);
    private static int StatusCode(IReadOnlyList<AfError> errors) => errors.FirstOrDefault()?.Code switch
    {
        AfErrorCodes.WorkoutSessionNotFound => 404,
        AfErrorCodes.WorkoutSessionConflict or AfErrorCodes.WorkoutResourceConflict or AfErrorCodes.WorkoutRepositoryConflict => 409,
        AfErrorCodes.GithubUnauthorized => 401,
        AfErrorCodes.GithubForbidden => 403,
        AfErrorCodes.GithubRateLimit => 429,
        AfErrorCodes.WorkoutValidationFailed or AfErrorCodes.WorkoutReferenceInvalid => 400,
        _ => 503
    };

    private static (int StatusCode, AfResponse<MutationOutcome> Response) Failure(int status, AfError error) => Failure(status, new[] { error });
    private static (int StatusCode, AfResponse<MutationOutcome> Response) Failure(int status, IReadOnlyList<AfError> errors) =>
        (status, new AfResponse<MutationOutcome>(false, errors, new MutationOutcome(null, Array.Empty<FieldError>())));

    private sealed record LoadContext(string Head, IReadOnlyList<ResourceDocument> Resources, MasterCatalog Masters);
    private sealed record LoadResult(LoadContext? Context, IReadOnlyList<AfError> Errors)
    {
        public static LoadResult Failed(AfError error) => new(null, new[] { error });
    }
    private sealed record MutationPlan(string? SessionId, IReadOnlyList<ResourceChange> Changes, IReadOnlyList<RuntimeSourceFile> CandidateFiles, IReadOnlyList<AfError> Errors)
    {
        public static MutationPlan Conflict(string message) => new(null, Array.Empty<ResourceChange>(), Array.Empty<RuntimeSourceFile>(), new[] { Error(AfErrorCodes.WorkoutResourceConflict, message) });
    }
}
