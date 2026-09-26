using Atlament.Core;
using Atlament.Core.Write;
using System.Net;
using System.Text;
using System.Text.Json;
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
    public async Task RepositoryReconciliationReturnsCommittedRevisionWithoutRetryingMutation()
    {
        var fixture = AmbiguousPatchRepository("commit");

        var result = await fixture.Repository.CommitAsync(Configuration(), "token", "head", "Update: Workout Log - 2026/09/13", new[]
        {
            new ResourceChange("workouts/2026/09/2026-09-13.json", "{}\n")
        }, CancellationToken.None);

        Assert.Equal("commit", result.Value?.CommitRevision);
        Assert.Empty(result.Errors);
        Assert.Equal(1, fixture.PatchCalls());
    }

    [Fact]
    public async Task RepositoryReconciliationRecognizesCommittedRevisionBehindCurrentHead()
    {
        var fixture = AmbiguousPatchRepository("later", "ahead");

        var result = await fixture.Repository.CommitAsync(Configuration(), "token", "head", "Update: Workout Log - 2026/09/13", new[]
        {
            new ResourceChange("workouts/2026/09/2026-09-13.json", "{}\n")
        }, CancellationToken.None);

        Assert.Equal("commit", result.Value?.CommitRevision);
        Assert.Empty(result.Errors);
        Assert.Equal(1, fixture.PatchCalls());
    }

    [Fact]
    public async Task RepositoryReconciliationReturnsWriteFailureWhenHeadDidNotChange()
    {
        var fixture = AmbiguousPatchRepository("head");

        var result = await fixture.Repository.CommitAsync(Configuration(), "token", "head", "Update: Workout Log - 2026/09/13", new[]
        {
            new ResourceChange("workouts/2026/09/2026-09-13.json", "{}\n")
        }, CancellationToken.None);

        Assert.Null(result.Value);
        Assert.Contains(result.Errors, error => error.Code == AfErrorCodes.WorkoutWriteFailed);
        Assert.Equal(1, fixture.PatchCalls());
    }

    [Fact]
    public async Task RepositoryReconciliationKeepsAmbiguousWhenHeadCannotBeRead()
    {
        var fixture = AmbiguousPatchRepository(null);

        var result = await fixture.Repository.CommitAsync(Configuration(), "token", "head", "Update: Workout Log - 2026/09/13", new[]
        {
            new ResourceChange("workouts/2026/09/2026-09-13.json", "{}\n")
        }, CancellationToken.None);

        Assert.Null(result.Value);
        Assert.Contains(result.Errors, error => error.Code == AfErrorCodes.WorkoutWriteResultAmbiguous);
        Assert.Equal(1, fixture.PatchCalls());
    }

    [Fact]
    public async Task RepositoryReconcilesObjectWriteFailureWithoutRetryOrRefUpdate()
    {
        var headReads = 0;
        var blobCalls = 0;
        var refUpdates = 0;
        var handler = new RecordingHandler(request =>
        {
            var path = request.RequestUri!.AbsolutePath;
            if (path.EndsWith("/git/ref/heads/main"))
            {
                headReads++;
                return Task.FromResult(Json("{\"object\":{\"sha\":\"head\"}}"));
            }
            if (path.EndsWith("/git/commits/head")) return Task.FromResult(Json("{\"tree\":{\"sha\":\"base-tree\"}}"));
            if (path.EndsWith("/git/blobs"))
            {
                blobCalls++;
                throw new HttpRequestException("response lost");
            }
            if (request.Method == HttpMethod.Patch) refUpdates++;
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.NotFound));
        });
        var repository = new Repository(new HttpClient(handler));

        var result = await repository.CommitAsync(Configuration(), "token", "head", "Create: Workout Log - 2026/09/13", new[]
        {
            new ResourceChange("workouts/2026/09/2026-09-13.json", "{}\n")
        }, CancellationToken.None);

        Assert.Null(result.Value);
        Assert.Contains(result.Errors, error => error.Code == AfErrorCodes.WorkoutWriteFailed);
        Assert.Equal(2, headReads);
        Assert.Equal(1, blobCalls);
        Assert.Equal(0, refUpdates);
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
    public void MachineNotesLoadUpdateAndPreserveOriginalArray()
    {
        var source = JsonNode.Parse(Workout("a"))!.AsObject();
        source["machines"]![0]!["notes"] = new JsonArray("一行目\n二行目", "", "三行目");
        var input = Resource.Project(source);
        Assert.Equal("一行目\n二行目\n\n三行目", input.Machines![0].Notes);
        var unchanged = Resource.UpdateSession(source, input);
        Assert.True(JsonNode.DeepEquals(source["machines"]![0]!["notes"], unchanged["machines"]![0]!["notes"]));

        var edited = input with { Machines = new[] { input.Machines[0] with { Notes = "変更\r\n\n次の行" } } };
        var updated = Resource.UpdateSession(source, edited);
        Assert.Equal(new[] { "変更", "次の行" }, updated["machines"]![0]!["notes"]!.AsArray().Select(value => value!.GetValue<string>()));
        Assert.Equal("変更\n次の行", Resource.Project(updated).Machines![0].Notes);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    public void MachineNotesClearAndOmittedRequestRemainDistinct(string? empty)
    {
        var source = JsonNode.Parse(Workout("a"))!.AsObject();
        source["machines"]![0]!["notes"] = new JsonArray("既存値");
        var input = Resource.Project(source);
        var omitted = JsonSerializer.Deserialize<MachineInput>("""
            {"sourceIndex":0,"machineId":"active-machine","sets":[{"sourceIndex":0,"reps":10,"weightKg":20,"notes":null}]}
            """, AfJson.Options)!;
        Assert.False(omitted.NotesSpecified);
        var preserved = Resource.UpdateSession(source, input with { Machines = new[] { omitted } });
        Assert.Equal("既存値", preserved["machines"]![0]!["notes"]![0]!.GetValue<string>());

        var explicitEmpty = JsonSerializer.Deserialize<MachineInput>(JsonSerializer.Serialize(omitted with { Notes = empty }, AfJson.Options), AfJson.Options)!;
        Assert.True(explicitEmpty.NotesSpecified);
        var cleared = Resource.UpdateSession(source, input with { Machines = new[] { explicitEmpty } });
        Assert.Null(cleared["machines"]![0]!["notes"]);
        var created = Resource.CreateSession("new", ValidInput() with { Machines = new[] { explicitEmpty with { SourceIndex = null } } });
        Assert.Null(created["machines"]![0]!["notes"]);
    }

    [Fact]
    public void MachineNotesFollowSourceIdentityWhenMachinesAreReordered()
    {
        var source = JsonNode.Parse(Workout("a"))!.AsObject();
        var machines = source["machines"]!.AsArray();
        machines[0]!["notes"] = new JsonArray("先頭");
        var second = machines[0]!.DeepClone();
        second["machine_id"] = "deleted-machine";
        second["notes"] = new JsonArray("二番目", "次の行");
        machines.Add(second);
        var input = Resource.Project(source);
        var updated = Resource.UpdateSession(source, input with { Machines = new[] { input.Machines![1], input.Machines[0] with { Notes = "変更" } } });
        var projected = Resource.Project(updated);
        Assert.Equal("二番目\n次の行", projected.Machines![0].Notes);
        Assert.Equal("変更", projected.Machines[1].Notes);
    }

    [Fact]
    public void MachineNotesValidate400CharactersAndGrandfatherUnchangedLegacyValues()
    {
        var input = ValidInput();
        var machine = input.Machines![0];
        Assert.True(Validator.Validate(input with { Machines = new[] { machine with { Notes = new string('a', 400) } } }, null, Masters(), true).IsValid);
        var invalid = Validator.Validate(input with { Machines = new[] { machine with { Notes = new string('a', 401) } } }, null, Masters(), true);
        Assert.Contains(invalid.FieldErrors, error => error.Path == "machines[0].notes" && error.Message == "400字以内に入力してください");
        var source = JsonNode.Parse(Workout("a"))!.AsObject();
        source["machines"]![0]!["notes"] = new JsonArray(new string('a', 401));
        var legacy = Resource.Project(source);
        Assert.True(Validator.Validate(legacy, source, Masters(), false).IsValid);
        Assert.False(Validator.Validate(legacy with { Machines = new[] { legacy.Machines![0] with { Notes = new string('b', 401) } } }, source, Masters(), false).IsValid);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task CreatePreservesSetNotesThroughRequestResourceAndRuntime(bool sameDate)
    {
        var repository = new FakeRepository();
        var service = ServiceFor(Workout("a"), repository, new FakeReflection(true));
        var date = sameDate ? "2026-09-13" : "2026-09-12";
        var snapshot = await service.GetDateAsync(Configuration(), "token", date, CancellationToken.None);
        var input = ValidInput() with
        {
            Date = date,
            Machines = new[] { new MachineInput(null, "active-machine", new[] { new SetInput(null, 10, 20m, "て\nすと") }) { Notes = "マシン\r\n\nメモ" } },
            Notes = "こんにちは\n次の行"
        };
        var requestJson = JsonSerializer.Serialize(new CreateRequest(input, snapshot.Response.Data!.ExpectedContext), AfJson.Options);
        var request = JsonSerializer.Deserialize<CreateRequest>(requestJson, AfJson.Options)!;

        var result = await service.CreateAsync(Configuration(), "token", request, CancellationToken.None);

        Assert.True(result.Response.Success);
        Assert.Equal(1, repository.CommitCount);
        var change = Assert.Single(repository.Changes, item => item.Content is not null);
        Assert.EndsWith(sameDate ? ".jsonl" : ".json", change.Path);
        var file = new RuntimeSourceFile(change.Path, change.Content!);
        var resource = Assert.Single(Resource.Parse(new[] { file }).Resources);
        var created = resource.Sessions.Last();
        var set = created["machines"]![0]!["sets"]![0]!.AsObject();
        Assert.Equal("て\nすと", set["note"]!.GetValue<string>());
        Assert.False(set.ContainsKey("notes"));
        Assert.Equal(new[] { "マシン", "メモ" }, created["machines"]![0]!["notes"]!.AsArray().Select(value => value!.GetValue<string>()));
        Assert.Equal("こんにちは", created["notes"]![0]!.GetValue<string>());
        Assert.Equal("次の行", created["notes"]![1]!.GetValue<string>());

        var runtime = new RuntimeDataBuilder().Build(new[] { file }, MachineMaster, GymMaster);
        Assert.Empty(runtime.Errors);
        var session = Assert.Single(runtime.Sessions, item => item.SessionId == created["session_id"]!.GetValue<string>());
        Assert.Equal("て\nすと", Assert.Single(Assert.Single(session.Machines).Sets).Note);
        Assert.Equal(new[] { "マシン", "メモ" }, Assert.Single(session.Machines).Notes);
        Assert.Equal(new[] { "こんにちは", "次の行" }, session.Notes);
    }

    [Fact]
    public async Task UpdateKeepsOtherSessionAndDeleteRemovesFinalResource()
    {
        var jsonl = Workout("a") + "\n" + Workout("b") + "\n";
        var updateRepository = new FakeRepository();
        var updateService = ServiceFor(jsonl, updateRepository, new FakeReflection(true), jsonl: true);
        var updateSnapshot = await updateService.GetDateAsync(Configuration(), "token", "2026-09-13", CancellationToken.None);
        var updateSession = updateSnapshot.Response.Data!.Sessions[0].Session;
        var updateInput = updateSession with { Notes = "updated", Machines = new[] { updateSession.Machines![0] with { Notes = "変更\nマシン" } } };

        var update = await updateService.UpdateAsync(Configuration(), "token", "a", new UpdateRequest(updateInput, updateSnapshot.Response.Data.ExpectedContext), CancellationToken.None);

        Assert.True(update.Response.Success);
        var updatedResource = Assert.Single(updateRepository.Changes);
        var parsed = Resource.Parse(new[] { new RuntimeSourceFile(updatedResource.Path, updatedResource.Content!) });
        Assert.Equal(new[] { "a", "b" }, parsed.Resources[0].Sessions.Select(session => session["session_id"]!.GetValue<string>()));
        Assert.Equal("変更\nマシン", Resource.Project(parsed.Resources[0].Sessions[0]).Machines![0].Notes);
        Assert.Null(parsed.Resources[0].Sessions[1]["machines"]![0]!["notes"]);

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

    private static (Repository Repository, Func<int> PatchCalls) AmbiguousPatchRepository(string? reconciliationHead, string? comparisonStatus = null)
    {
        var headReads = 0;
        var patchCalls = 0;
        var handler = new RecordingHandler(request =>
        {
            var path = request.RequestUri!.AbsolutePath;
            if (path.EndsWith("/git/ref/heads/main"))
            {
                headReads++;
                if (headReads > 2 && reconciliationHead is null) throw new HttpRequestException("reconciliation failed");
                var head = headReads > 2 ? reconciliationHead : "head";
                return Task.FromResult(Json($"{{\"object\":{{\"sha\":\"{head}\"}}}}"));
            }
            if (path.EndsWith("/git/commits/head")) return Task.FromResult(Json("{\"tree\":{\"sha\":\"base-tree\"}}"));
            if (path.EndsWith("/git/blobs")) return Task.FromResult(Json("{\"sha\":\"blob\"}"));
            if (path.EndsWith("/git/trees")) return Task.FromResult(Json("{\"sha\":\"next-tree\"}"));
            if (path.EndsWith("/git/commits")) return Task.FromResult(Json("{\"sha\":\"commit\"}"));
            if (path.Contains("/compare/commit...", StringComparison.Ordinal) && comparisonStatus is not null)
            {
                return Task.FromResult(Json($"{{\"status\":\"{comparisonStatus}\"}}"));
            }
            if (request.Method == HttpMethod.Patch)
            {
                patchCalls++;
                throw new HttpRequestException("response lost");
            }
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.NotFound));
        });
        return (new Repository(new HttpClient(handler)), () => patchCalls);
    }

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
