using Atlament.Core;
using System.Net;

namespace Atlament.Tests;

public sealed class AfCoreTests
{
    private static readonly RuntimeSourceFile ExerciseMaster = new("master/exercises.json", """
        {
          "schema_version": 1,
          "exercises": [
            { "exercise_id": "known-exercise", "name": "Known Exercise", "body_part": "chest", "active": true }
          ]
        }
        """);

    private static readonly RuntimeSourceFile GymMaster = new("master/gyms.json", """
        {
          "schema_version": 1,
          "gyms": [
            { "gym_id": "known-gym", "name": "Known Gym", "short_name": "KG", "active": true }
          ]
        }
        """);

    [Fact]
    public void TechnicalInvalidRejectsEntireSyncSet()
    {
        var builder = new RuntimeDataBuilder();
        var files = new[]
        {
            Workout("workouts/valid.json", "known-gym", "known-exercise"),
            new RuntimeSourceFile("workouts/invalid.json", """
                {
                  "schema_version": 1,
                  "session_id": "missing-required-fields"
                }
                """)
        };

        var result = builder.Build(files, ExerciseMaster, GymMaster);

        Assert.True(result.TechnicalInvalid);
        Assert.Empty(result.Sessions);
        Assert.Contains(result.Errors, error => error.Code == AfErrorCodes.RuntimeDataInvalid);
    }

    [Fact]
    public void MasterResolveFailureRejectsOnlyAffectedSession()
    {
        var builder = new RuntimeDataBuilder();
        var files = new[]
        {
            Workout("workouts/valid.json", "known-gym", "known-exercise"),
            Workout("workouts/missing-exercise.json", "known-gym", "missing-exercise"),
            Workout("workouts/missing-gym.json", "missing-gym", "known-exercise")
        };

        var result = builder.Build(files, ExerciseMaster, GymMaster);

        Assert.False(result.TechnicalInvalid);
        var session = Assert.Single(result.Sessions);
        Assert.Equal("valid", session.SessionId);
        Assert.Contains(result.Errors, error => error.Code == AfErrorCodes.MasterExerciseNotFound);
        Assert.Contains(result.Errors, error => error.Code == AfErrorCodes.MasterGymNotFound);
        Assert.DoesNotContain(result.Sessions, item => item.Exercises.Any(exercise => exercise.Name is null));
    }

    [Fact]
    public void CurrentRuntimeDataIsStoredAfterSessionRejectApplied()
    {
        var root = Path.Combine(Path.GetTempPath(), "atlament-af-test-" + Guid.NewGuid().ToString("N"));
        try
        {
            var paths = new WindowsPathProvider(root);
            var store = new RuntimeDataStore(paths);
            var session = new WorkoutSession(
                1,
                "valid",
                "2026-08-24",
                "complete",
                new Gym("known-gym", "Known Gym", "KG"),
                null,
                new[]
                {
                    new WorkoutExercise("known-exercise", "Known Exercise", "chest", new[] { new ExerciseSet(1, 20, 10, null, null, null, null) }, Array.Empty<string>())
                },
                Array.Empty<string>());
            var errors = new[] { new AfError(AfErrorCodes.MasterExerciseNotFound, "Exercise master is not found: missing-exercise.", true) };

            var saveErrors = store.SaveCurrent(new RuntimeBuildResult(new[] { session }, errors, false));
            var (loaded, loadErrors) = store.LoadCurrent();

            Assert.Empty(saveErrors);
            Assert.Empty(loadErrors);
            Assert.NotNull(loaded);
            Assert.Equal("valid", Assert.Single(loaded!.Sessions).SessionId);
            Assert.Equal(AfErrorCodes.MasterExerciseNotFound, Assert.Single(loaded.Errors).Code);
        }
        finally
        {
            if (Directory.Exists(root))
            {
                Directory.Delete(root, true);
            }
        }
    }

    [Fact]
    public void FrontendHostingResolvesStaticResourcesAndAppRoutesSeparately()
    {
        var root = Path.Combine(Path.GetTempPath(), "atlament-hosting-test-" + Guid.NewGuid().ToString("N"));
        try
        {
            var paths = new WindowsPathProvider(root);
            var dashboardRoot = Path.Combine(paths.FrontendArtifactRoot, "dashboard");
            Directory.CreateDirectory(Path.Combine(dashboardRoot, "assets"));
            File.WriteAllText(Path.Combine(paths.FrontendArtifactRoot, "index.html"), "<html></html>");
            File.WriteAllText(Path.Combine(dashboardRoot, "index.html"), "<html></html>");
            File.WriteAllText(Path.Combine(dashboardRoot, "assets", "app.js"), "console.log('ok');");

            var hosting = new HostingStatusService(paths);

            var staticFile = hosting.TryResolveFile("/dashboard/assets/app.js", out var staticUnavailable);
            var routeFile = hosting.TryResolveFile("/dashboard/2026-08-24", out var routeUnavailable);
            var missingStatic = hosting.TryResolveFile("/dashboard/assets/missing.js", out var missingUnavailable);

            Assert.False(staticUnavailable);
            Assert.Equal(Path.Combine(dashboardRoot, "assets", "app.js"), staticFile);
            Assert.False(routeUnavailable);
            Assert.Equal(Path.Combine(dashboardRoot, "index.html"), routeFile);
            Assert.False(missingUnavailable);
            Assert.Null(missingStatic);
        }
        finally
        {
            if (Directory.Exists(root))
            {
                Directory.Delete(root, true);
            }
        }
    }

    [Fact]
    public void CredentialLimitDateCanBeUpdatedWithoutReenteringToken()
    {
        var root = Path.Combine(Path.GetTempPath(), "atlament-credential-test-" + Guid.NewGuid().ToString("N"));
        try
        {
            var paths = new WindowsPathProvider(root);
            var store = new CredentialStore(paths);

            var initial = store.Save(new CredentialUpdate("github-token", "2026-12-31"));
            var updated = store.Save(new CredentialUpdate(null, "2027-01-31"));
            var loaded = store.Load();

            Assert.True(initial.Configured);
            Assert.True(updated.Configured);
            Assert.Equal("available", updated.State);
            Assert.Equal("2027-01-31", updated.LimitDate);
            Assert.Equal("github-token", loaded.Token);
            Assert.Equal("2027-01-31", loaded.Status.LimitDate);
        }
        finally
        {
            if (Directory.Exists(root))
            {
                Directory.Delete(root, true);
            }
        }
    }

    [Fact]
    public async Task GithubAccessCombinesRootPathWithAllResources()
    {
        var http = new RecordingHttpMessageHandler(request =>
        {
            var url = request.RequestUri?.AbsoluteUri ?? "";
            if (url.Contains("/contents/data/workouts?ref=master", StringComparison.Ordinal))
            {
                return JsonResponse("""
                    [
                      { "path": "data/workouts/2026", "type": "dir" }
                    ]
                    """);
            }

            if (url.Contains("/contents/data/workouts/2026?ref=master", StringComparison.Ordinal))
            {
                return JsonResponse("""
                    [
                      { "path": "data/workouts/2026/08", "type": "dir" }
                    ]
                    """);
            }

            if (url.Contains("/contents/data/workouts/2026/08?ref=master", StringComparison.Ordinal))
            {
                return JsonResponse("""
                    [
                      { "path": "data/workouts/2026/08/2026-08-24.json", "type": "file" },
                      { "path": "data/workouts/2026/08/readme.md", "type": "file" }
                    ]
                    """);
            }

            if (url.Contains("/data/workouts/2026/08/2026-08-24.json", StringComparison.Ordinal) ||
                url.Contains("/data/master/exercises.json", StringComparison.Ordinal) ||
                url.Contains("/data/master/gyms.json", StringComparison.Ordinal))
            {
                return JsonResponse("{}");
            }

            return new HttpResponseMessage(HttpStatusCode.NotFound);
        });
        var service = new GithubAccessService(new HttpClient(http));

        var (files, errors) = await service.FetchAsync(Configuration("data"), "token", CancellationToken.None);

        Assert.Empty(errors);
        Assert.Equal(new[]
        {
            "data/workouts/2026/08/2026-08-24.json",
            "data/master/exercises.json",
            "data/master/gyms.json"
        }, files.Select(file => file.Path));
        Assert.Contains(http.RequestedUrls, url => url.Contains("/data/workouts/2026/08/2026-08-24.json", StringComparison.Ordinal));
        Assert.DoesNotContain(http.RequestedUrls, url => url.Contains("/readme.md", StringComparison.Ordinal));
    }

    [Fact]
    public async Task GithubAccessUsesResourcePathWhenRootPathIsEmpty()
    {
        var http = new RecordingHttpMessageHandler(request =>
        {
            var url = request.RequestUri?.AbsoluteUri ?? "";
            if (url.Contains("/contents/workouts?ref=master", StringComparison.Ordinal))
            {
                return JsonResponse("""
                    [
                      { "path": "workouts/2026/08/2026-08-24.json", "type": "file" }
                    ]
                    """);
            }

            if (url.Contains("/workouts/2026/08/2026-08-24.json", StringComparison.Ordinal) ||
                url.Contains("/master/exercises.json", StringComparison.Ordinal) ||
                url.Contains("/master/gyms.json", StringComparison.Ordinal))
            {
                return JsonResponse("{}");
            }

            return new HttpResponseMessage(HttpStatusCode.NotFound);
        });
        var service = new GithubAccessService(new HttpClient(http));

        var (files, errors) = await service.FetchAsync(Configuration(""), "token", CancellationToken.None);

        Assert.Empty(errors);
        Assert.Equal(new[]
        {
            "workouts/2026/08/2026-08-24.json",
            "master/exercises.json",
            "master/gyms.json"
        }, files.Select(file => file.Path));
    }

    [Fact]
    public async Task GithubAccessReportsCombinedDirectoryPathWhenDirectoryRequestFails()
    {
        var service = new GithubAccessService(new HttpClient(new RecordingHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.NotFound))));

        var (_, errors) = await service.FetchAsync(Configuration("data"), "token", CancellationToken.None);

        var error = Assert.Single(errors);
        Assert.Equal(AfErrorCodes.GithubResourceNotFound, error.Code);
        Assert.Contains("data/workouts", error.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void OperationGatePreventsManualSyncDuringStartupSync()
    {
        var gate = new OperationGate();

        Assert.True(gate.TryStart("startup"));
        Assert.False(gate.TryStart("manualSync"));

        gate.Complete("startup", true);

        Assert.True(gate.TryStart("manualSync"));
    }

    [Fact]
    public async Task InitialMissingConfigurationCredentialAndRuntimeAreRequiredActions()
    {
        var root = Path.Combine(Path.GetTempPath(), "atlament-af-test-" + Guid.NewGuid().ToString("N"));
        try
        {
            var paths = new WindowsPathProvider(root);
            var application = new AtlamentApplication(
                new ConfigurationStore(paths),
                new CredentialStore(paths),
                new RuntimeDataStore(paths),
                new RuntimeDataBuilder(),
                new GithubAccessService(),
                new HostingStatusService(paths),
                new AfLog(paths));

            await application.StartAsync(CancellationToken.None);
            var status = application.GetStatus();

            Assert.True(status.Success);
            Assert.Contains("CONFIGURATION_REQUIRED", status.Data!.RequiredActions);
            Assert.Contains("CREDENTIAL_REQUIRED", status.Data.RequiredActions);
            Assert.Contains("RUNTIME_DATA_REQUIRED", status.Data.RequiredActions);
        }
        finally
        {
            Microsoft.Data.Sqlite.SqliteConnection.ClearAllPools();
            if (Directory.Exists(root))
            {
                Directory.Delete(root, true);
            }
        }
    }

    private static RuntimeSourceFile Workout(string path, string gymId, string exerciseId)
    {
        var sessionId = Path.GetFileNameWithoutExtension(path).Replace("missing-exercise", "missingExercise").Replace("missing-gym", "missingGym");
        return new RuntimeSourceFile(path, $$"""
            {
              "schema_version": 1,
              "session_id": "{{sessionId}}",
              "date": "2026-08-24",
              "status": "complete",
              "gym_id": "{{gymId}}",
              "exercises": [
                {
                  "exercise_id": "{{exerciseId}}",
                  "sets": [
                    { "set": 1, "weight_kg": 20, "reps": 10 }
                  ]
                }
              ]
            }
            """);
    }

    private static AfConfiguration Configuration(string rootPath) => new(
        1,
        new RepositoryConfiguration("owner", "repo", "master", rootPath),
        new[]
        {
            new ResourceConfiguration("WORKOUT", "workouts/", "directory", true, false),
            new ResourceConfiguration("EXERCISE_MASTER", "master/exercises.json", "file", true, false),
            new ResourceConfiguration("GYM_MASTER", "master/gyms.json", "file", true, false)
        },
        new TimeoutConfiguration(10, 60, 30, 10));

    private static HttpResponseMessage JsonResponse(string json) => new(HttpStatusCode.OK)
    {
        Content = new StringContent(json)
    };

    private sealed class RecordingHttpMessageHandler(Func<HttpRequestMessage, HttpResponseMessage> respond) : HttpMessageHandler
    {
        public List<string> RequestedUrls { get; } = new();

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            RequestedUrls.Add(request.RequestUri?.AbsoluteUri ?? "");
            return Task.FromResult(respond(request));
        }
    }
}
