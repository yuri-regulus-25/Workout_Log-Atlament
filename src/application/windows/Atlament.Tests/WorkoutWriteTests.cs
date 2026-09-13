using Atlament.Core;
using Atlament.Core.Write;
using System.Net;
using System.Text;
using System.Text.Json.Nodes;

namespace Atlament.Tests;

public sealed class WorkoutWriteTests
{
    private static readonly RuntimeSourceFile MachineMaster = new("master/machines.json", """
        {"schema_version":1,"machines":[
          {"machine_id":"active-machine","name":"Active","body_part":"chest","active":true,"deleted":false},
          {"machine_id":"deleted-machine","name":"Deleted","body_part":"back","active":false,"deleted":true}
        ]}
        """);
    private static readonly RuntimeSourceFile GymMaster = new("master/gyms.json", """
        {"schema_version":1,"gyms":[
          {"gym_id":"active-gym","name":"Active Gym","active":true,"deleted":false,"main":true},
          {"gym_id":"inactive-gym","name":"Inactive Gym","active":false,"deleted":false,"main":false}
        ]}
        """);

    [Fact]
    public void JsonlUpdatePreservesOtherSessionsAndHiddenFields()
    {
        var parsed = Resource.Parse(new[] { new RuntimeSourceFile("workouts/2026/09/2026-09-13.jsonl", """
            {"schema_version":1,"session_id":"a","date":"2026-09-13","status":"partial","gym_id":"active-gym","condition":{"fatigue":2},"machines":[{"machine_id":"active-machine","notes":["hidden"],"sets":[{"set":4,"weight_kg":20,"reps":8,"rir":1}]}]}
            {"schema_version":1,"session_id":"b","date":"2026-09-13","status":"complete","gym_id":"active-gym","machines":[{"machine_id":"active-machine","sets":[{"set":1,"weight_kg":10,"reps":10}]}]}
            """) });

        var resource = Assert.Single(parsed.Resources);
        var source = resource.Sessions[0];
        var input = Resource.Project(source) with
        {
            Machines = new[] { Resource.Project(source).Machines![0] with { Sets = new[] { new SetInput(0, 9, 22.5m, null) } } }
        };
        var updated = Resource.UpdateSession(source, input);
        var content = Resource.Serialize(true, new[] { updated, resource.Sessions[1] });
        var reparsed = Resource.Parse(new[] { new RuntimeSourceFile(resource.Path, content) });

        Assert.Empty(reparsed.Errors);
        Assert.Equal(2, reparsed.Resources[0].Sessions.Count);
        Assert.Equal("b", reparsed.Resources[0].Sessions[1]["session_id"]!.GetValue<string>());
        Assert.Equal("partial", updated["status"]!.GetValue<string>());
        Assert.Equal(2, updated["condition"]!["fatigue"]!.GetValue<int>());
        Assert.Equal("hidden", updated["machines"]![0]!["notes"]![0]!.GetValue<string>());
        Assert.Equal(1, updated["machines"]![0]!["sets"]![0]!["rir"]!.GetValue<int>());
    }

    [Fact]
    public void DirtyAwareValidationGrandfathersLegacyNotesAndInvalidReferences()
    {
        var source = JsonNode.Parse("""
            {"date":"2026-09-13","gym_id":"missing-gym","machines":[{"machine_id":"deleted-machine","sets":[{"set":1,"weight_kg":10,"reps":10,"note":"legacy"}]}],"notes":["xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"]}
            """)!.AsObject();
        var input = Resource.Project(source);
        var unchanged = Validator.Validate(input, source, Masters(), false);

        Assert.True(unchanged.IsValid);

        var changed = input with { GymId = "missing-other", Notes = input.Notes + "x" };
        var invalid = Validator.Validate(changed, source, Masters(), false);
        Assert.Contains(invalid.FieldErrors, error => error.Path == "gymId" && error.Message == "マスターデータに存在しません");
        Assert.Contains(invalid.FieldErrors, error => error.Path == "notes" && error.Message == "400字以内に入力してください");
    }

    [Fact]
    public void NumericAndCollectionValidationUsesFinalContract()
    {
        var input = new SessionInput("2026-09-13", "active-gym", new[]
        {
            new MachineInput(null, "active-machine", new[] { new SetInput(null, 101, 999.999m, null) })
        }, null);
        var validation = Validator.Validate(input, null, Masters(), true);

        Assert.Contains(validation.FieldErrors, error => error.Path.EndsWith("reps") && error.Message == "100以下の数値を入力してください");
        Assert.Contains(validation.FieldErrors, error => error.Path.EndsWith("weightKg") && error.Message == "999.99以下の数値を入力してください");
    }

    [Fact]
    public void UpdateRejectsDateChangesAndDuplicateSourceSetMappings()
    {
        var source = JsonNode.Parse("""
            {"date":"2026-09-13","gym_id":"active-gym","machines":[{"machine_id":"active-machine","sets":[{"set":1,"weight_kg":10,"reps":10}]}]}
            """)!.AsObject();
        var projected = Resource.Project(source);
        var sourceSet = projected.Machines![0].Sets![0];
        var input = projected with
        {
            Date = "2026-09-14",
            Machines = new[] { projected.Machines[0] with { Sets = new[] { sourceSet, sourceSet } } }
        };

        var validation = Validator.Validate(input, source, Masters(), false);

        Assert.Contains(validation.FieldErrors, error => error.Path == "date" && error.Message == "日付は変更できません");
        Assert.Contains(validation.FieldErrors, error => error.Path == "machines[0].sets[1]" && error.Message == "入力内容が不正です");
    }

    [Fact]
    public void EmptyWorkoutCollectionIsAValidInitialRuntimeState()
    {
        var result = new RuntimeDataBuilder().Build(Array.Empty<RuntimeSourceFile>(), MachineMaster, GymMaster);

        Assert.False(result.TechnicalInvalid);
        Assert.Empty(result.Errors);
        Assert.Empty(result.Sessions);
    }

    [Fact]
    public async Task RepositoryUsesOneTreeCommitAndNonForceRefUpdate()
    {
        var requests = new List<(string Method, string Path, string Body)>();
        var handler = new RecordingHandler(async request =>
        {
            var body = request.Content is null ? "" : await request.Content.ReadAsStringAsync();
            requests.Add((request.Method.Method, request.RequestUri!.AbsolutePath, body));
            var path = request.RequestUri!.AbsolutePath;
            if (path.EndsWith("/git/ref/heads/main")) return Json("{\"object\":{\"sha\":\"head\"}}");
            if (path.EndsWith("/git/commits/head")) return Json("{\"tree\":{\"sha\":\"base-tree\"}}");
            if (path.EndsWith("/git/blobs")) return Json("{\"sha\":\"blob\"}");
            if (path.EndsWith("/git/trees")) return Json("{\"sha\":\"next-tree\"}");
            if (path.EndsWith("/git/commits")) return Json("{\"sha\":\"commit\"}");
            if (path.EndsWith("/git/refs/heads/main")) return Json("{}");
            return new HttpResponseMessage(HttpStatusCode.NotFound);
        });
        var repository = new Repository(new HttpClient(handler));

        var result = await repository.CommitAsync(Configuration(), "token", "head", "Create: Workout Log - 2026/09/13", new[]
        {
            new ResourceChange("workouts/2026/09/2026-09-13.json", null),
            new ResourceChange("workouts/2026/09/2026-09-13.jsonl", "{}\n")
        }, CancellationToken.None);

        Assert.NotNull(result.Value);
        Assert.Single(requests.Where(request => request.Method == "POST" && request.Path.EndsWith("/git/commits")));
        var tree = requests.Single(request => request.Method == "POST" && request.Path.EndsWith("/git/trees")).Body;
        Assert.Contains("2026-09-13.jsonl", tree);
        Assert.Contains("2026-09-13.json", tree);
        var update = requests.Single(request => request.Method == "PATCH").Body;
        Assert.Contains("\"force\":false", update);
    }

    [Fact]
    public async Task CreateConvertsSingleJsonToJsonlInOneDomainCommit()
    {
        var repository = new FakeRepository();
        var service = ServiceFor(Workout("a"), repository, new FakeReflection(true));
        var snapshot = await service.GetDateAsync(Configuration(), "token", "2026-09-13", CancellationToken.None);
        var input = ValidInput();

        var result = await service.CreateAsync(Configuration(), "token", new CreateRequest(input, snapshot.Response.Data!.ExpectedContext), CancellationToken.None);

        Assert.True(result.Response.Success);
        Assert.Equal("Create: Workout Log - 2026/09/13", repository.Message);
        Assert.Equal(2, repository.Changes.Count);
        Assert.Contains(repository.Changes, change => change.Path.EndsWith(".json") && change.Content is null);
        var jsonl = Assert.Single(repository.Changes, change => change.Path.EndsWith(".jsonl"));
        Assert.Equal(2, Resource.Parse(new[] { new RuntimeSourceFile(jsonl.Path, jsonl.Content!) }).Resources[0].Sessions.Count);
    }

    [Fact]
    public async Task UpdateKeepsOtherSessionAndDeleteRemovesFinalResource()
    {
        var jsonl = Workout("a") + "\n" + Workout("b") + "\n";
        var updateRepository = new FakeRepository();
        var updateService = ServiceFor(jsonl, updateRepository, new FakeReflection(true), jsonl: true);
        var updateSnapshot = await updateService.GetDateAsync(Configuration(), "token", "2026-09-13", CancellationToken.None);
        var updateInput = updateSnapshot.Response.Data!.Sessions[0].Session with { Notes = "updated" };

        var update = await updateService.UpdateAsync(Configuration(), "token", "a", new UpdateRequest(updateInput, updateSnapshot.Response.Data.ExpectedContext), CancellationToken.None);

        Assert.True(update.Response.Success);
        var updatedResource = Assert.Single(updateRepository.Changes);
        var parsed = Resource.Parse(new[] { new RuntimeSourceFile(updatedResource.Path, updatedResource.Content!) });
        Assert.Equal(new[] { "a", "b" }, parsed.Resources[0].Sessions.Select(session => session["session_id"]!.GetValue<string>()));

        var deleteRepository = new FakeRepository();
        var deleteService = ServiceFor(Workout("a"), deleteRepository, new FakeReflection(true));
        var deleteSnapshot = await deleteService.GetDateAsync(Configuration(), "token", "2026-09-13", CancellationToken.None);
        var deleted = await deleteService.DeleteAsync(Configuration(), "token", "a", new DeleteRequest(deleteSnapshot.Response.Data!.ExpectedContext), CancellationToken.None);

        Assert.True(deleted.Response.Success);
        var deletion = Assert.Single(deleteRepository.Changes);
        Assert.Null(deletion.Content);
        Assert.Equal("Delete: Workout Log - 2026/09/13", deleteRepository.Message);
    }

    [Fact]
    public async Task ReflectionFailureDoesNotRepeatCommittedMutation()
    {
        var repository = new FakeRepository();
        var service = ServiceFor(Workout("a"), repository, new FakeReflection(false));
        var snapshot = await service.GetDateAsync(Configuration(), "token", "2026-09-13", CancellationToken.None);

        var result = await service.UpdateAsync(
            Configuration(),
            "token",
            "a",
            new UpdateRequest(snapshot.Response.Data!.Sessions[0].Session, snapshot.Response.Data.ExpectedContext),
            CancellationToken.None);

        Assert.True(result.Response.Success);
        Assert.False(result.Response.Data!.Result!.Reflection.Succeeded);
        Assert.Contains(result.Response.Errors, error => error.Code == AfErrorCodes.WorkoutReflectionFailed);
        Assert.Equal(1, repository.CommitCount);
    }

    private static MasterCatalog Masters() => new(
        new Dictionary<string, MasterEntry>(StringComparer.Ordinal)
        {
            ["active-gym"] = new("active-gym", "Active Gym", true, false),
            ["inactive-gym"] = new("inactive-gym", "Inactive Gym", false, false)
        },
        new Dictionary<string, MasterEntry>(StringComparer.Ordinal)
        {
            ["active-machine"] = new("active-machine", "Active", true, false),
            ["deleted-machine"] = new("deleted-machine", "Deleted", false, true)
        }, MachineMaster, GymMaster);

    private static AfConfiguration Configuration() => AfConfiguration.Default with
    {
        Repository = new RepositoryConfiguration("owner", "repo", "main", "")
    };

    private static HttpResponseMessage Json(string body) => new(HttpStatusCode.OK)
    {
        Content = new StringContent(body, Encoding.UTF8, "application/json")
    };

    private sealed class RecordingHandler(Func<HttpRequestMessage, Task<HttpResponseMessage>> respond) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken) => respond(request);
    }

    private static SessionInput ValidInput() => new(
        "2026-09-13",
        "active-gym",
        new[] { new MachineInput(null, "active-machine", new[] { new SetInput(null, 10, 20m, null) }) },
        null);

    private static string Workout(string sessionId) => $$"""
        {"schema_version":1,"session_id":"{{sessionId}}","date":"2026-09-13","status":"complete","gym_id":"active-gym","machines":[{"machine_id":"active-machine","sets":[{"set":1,"weight_kg":20,"reps":10}]}]}
        """;

    private static Service ServiceFor(string workoutContent, FakeRepository repository, IReflection reflection, bool jsonl = false)
    {
        var path = $"workouts/2026/09/2026-09-13.{(jsonl ? "jsonl" : "json")}";
        var handler = new RecordingHandler(request =>
        {
            var url = request.RequestUri!.AbsoluteUri;
            if (url.Contains("/contents/workouts?ref=main", StringComparison.Ordinal))
            {
                return Task.FromResult(Json($$"""[{"path":"{{path}}","type":"file"}]"""));
            }
            if (url.Contains($"/contents/{path}?ref=main", StringComparison.Ordinal))
            {
                return Task.FromResult(Json($$"""{"sha":"workout-sha","content":"{{Convert.ToBase64String(Encoding.UTF8.GetBytes(workoutContent))}}"}"""));
            }
            if (url.Contains("/contents/master/machines.json?ref=main", StringComparison.Ordinal))
            {
                return Task.FromResult(Json($$"""{"sha":"machine-sha","content":"{{Convert.ToBase64String(Encoding.UTF8.GetBytes(MachineMaster.Content))}}"}"""));
            }
            if (url.Contains("/contents/master/gyms.json?ref=main", StringComparison.Ordinal))
            {
                return Task.FromResult(Json($$"""{"sha":"gym-sha","content":"{{Convert.ToBase64String(Encoding.UTF8.GetBytes(GymMaster.Content))}}"}"""));
            }
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.NotFound));
        });
        return new Service(new GithubAccessService(new HttpClient(handler)), new RuntimeDataBuilder(), repository, reflection);
    }

    private sealed class FakeRepository : IRepository
    {
        public int CommitCount { get; private set; }
        public string? Message { get; private set; }
        public IReadOnlyList<ResourceChange> Changes { get; private set; } = Array.Empty<ResourceChange>();

        public Task<RepositoryResult<string>> ReadHeadAsync(AfConfiguration configuration, string? token, CancellationToken cancellationToken) =>
            Task.FromResult(new RepositoryResult<string>("head", Array.Empty<AfError>()));

        public Task<RepositoryResult<CommitResult>> CommitAsync(AfConfiguration configuration, string? token, string expectedHead, string message, IReadOnlyList<ResourceChange> changes, CancellationToken cancellationToken)
        {
            CommitCount++;
            Message = message;
            Changes = changes;
            return Task.FromResult(new RepositoryResult<CommitResult>(new CommitResult("commit"), Array.Empty<AfError>()));
        }
    }

    private sealed class FakeReflection(bool succeeded) : IReflection
    {
        public Task<ReflectionResult> ReflectAsync(AfConfiguration configuration, string? token, string commitRevision, CancellationToken cancellationToken) =>
            Task.FromResult(new ReflectionResult(
                succeeded,
                succeeded ? Array.Empty<AfError>() : new[] { new AfError(AfErrorCodes.WorkoutReflectionFailed, "failed", true) },
                Array.Empty<RuntimeWarning>()));
    }
}
