using Atlament.Core;
using System.Net;
using System.Reflection;
using System.Text;
using System.Text.Json.Nodes;

namespace Atlament.Tests;

public sealed class AfCoreTests
{
    private static readonly RuntimeSourceFile MachineMaster = new("master/machines.json", """
        {
          "schema_version": 1,
          "machines": [
            { "machine_id": "known-machine", "name": "Known Machine", "body_part": "chest", "active": true }
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
            Workout("workouts/valid.json", "known-gym", "known-machine"),
            new RuntimeSourceFile("workouts/invalid.json", """
                {
                  "schema_version": 1,
                  "session_id": "missing-required-fields"
                }
                """)
        };

        var result = builder.Build(files, MachineMaster, GymMaster);

        Assert.True(result.TechnicalInvalid);
        Assert.Empty(result.Sessions);
        Assert.Contains(result.Errors, error => error.Code == AfErrorCodes.RuntimeDataInvalid);
    }

    [Fact]
    public void MasterResolveFailureKeepsRuntimeBuildWithWarnings()
    {
        var builder = new RuntimeDataBuilder();
        var files = new[]
        {
            Workout("workouts/valid.json", "known-gym", "known-machine"),
            Workout("workouts/missing-machine.json", "known-gym", "missing-machine"),
            Workout("workouts/missing-gym.json", "missing-gym", "known-machine")
        };

        var result = builder.Build(files, MachineMaster, GymMaster);

        Assert.False(result.TechnicalInvalid);
        Assert.Empty(result.Errors);
        Assert.Equal(3, result.Sessions.Count);
        Assert.Contains(result.Warnings, warning => warning.Code == "MASTER_REFERENCE_MISSING" && warning.ReferenceKind == "machine" && warning.OriginalId == "missing-machine");
        Assert.Contains(result.Warnings, warning => warning.Code == "MASTER_REFERENCE_MISSING" && warning.ReferenceKind == "gym" && warning.OriginalId == "missing-gym");
    }

    [Fact]
    public void SourceIdsResolveUnresolvedWorkoutReferencesWithoutRawWorkoutRewrite()
    {
        var builder = new RuntimeDataBuilder();
        var machineMaster = new RuntimeSourceFile("master/machines.json", """
            {
              "schema_version": 1,
              "machines": [
                { "machine_id": "known-machine", "source_ids": ["legacy-machine"], "name": "Known Machine", "body_part": "chest", "active": true }
              ]
            }
            """);
        var gymMaster = new RuntimeSourceFile("master/gyms.json", """
            {
              "schema_version": 1,
              "gyms": [
                { "gym_id": "known-gym", "source_ids": ["legacy-gym"], "name": "Known Gym", "short_name": "KG", "active": true }
              ]
            }
            """);

        var result = builder.Build(new[] { Workout("workouts/legacy.json", "legacy-gym", "legacy-machine") }, machineMaster, gymMaster);

        var session = Assert.Single(result.Sessions);
        Assert.Empty(result.Errors);
        Assert.Equal("known-gym", session.Gym.Id);
        Assert.Equal("known-machine", Assert.Single(session.Machines).MachineId);
    }

    [Fact]
    public void CurrentRuntimeDataCanStoreCleanBuildOnly()
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
                new Gym("known-gym", "Known Gym", "KG", new MasterReferenceResolution("resolved", "known-gym", "known-gym")),
                null,
                new[]
                {
                    new WorkoutMachine("known-machine", "Known Machine", "chest", new MasterReferenceResolution("resolved", "known-machine", "known-machine"), new[] { new MachineSet(1, 20, 10, null, null, null, null) }, Array.Empty<string>())
                },
                Array.Empty<string>());

            var saveErrors = store.SaveCurrent(new RuntimeBuildResult(new[] { session }, Array.Empty<AfError>(), Array.Empty<RuntimeWarning>(), false));
            var (loaded, loadErrors) = store.LoadCurrent();

            Assert.Empty(saveErrors);
            Assert.Empty(loadErrors);
            Assert.NotNull(loaded);
            Assert.Equal("valid", Assert.Single(loaded!.Sessions).SessionId);
            Assert.Empty(loaded.Errors);
            Assert.Empty(loaded.Warnings);
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
            var workoutsRoot = Path.Combine(paths.FrontendArtifactRoot, "workouts");
            var machinesRoot = Path.Combine(paths.FrontendArtifactRoot, "machines");
            Directory.CreateDirectory(Path.Combine(dashboardRoot, "assets"));
            Directory.CreateDirectory(workoutsRoot);
            Directory.CreateDirectory(machinesRoot);
            File.WriteAllText(Path.Combine(paths.FrontendArtifactRoot, "index.html"), "<html></html>");
            File.WriteAllText(Path.Combine(dashboardRoot, "index.html"), "<html></html>");
            File.WriteAllText(Path.Combine(workoutsRoot, "index.html"), "<html></html>");
            File.WriteAllText(Path.Combine(machinesRoot, "index.html"), "<html></html>");
            File.WriteAllText(Path.Combine(dashboardRoot, "assets", "app.js"), "console.log('ok');");

            var hosting = new HostingStatusService(paths);

            var staticFile = hosting.TryResolveFile("/dashboard/assets/app.js", out var staticUnavailable);
            var workoutRouteFile = hosting.TryResolveFile("/workouts/2026-08-24", out var workoutRouteUnavailable);
            var machineRouteFile = hosting.TryResolveFile("/machines/known-machine", out var machineRouteUnavailable);
            var unknownRoute = hosting.TryResolveFile("/dashboard/2026-08-24", out var unknownRouteUnavailable);
            var missingStatic = hosting.TryResolveFile("/dashboard/assets/missing.js", out var missingUnavailable);

            Assert.False(staticUnavailable);
            Assert.Equal(Path.Combine(dashboardRoot, "assets", "app.js"), staticFile?.PhysicalPath);
            Assert.False(workoutRouteUnavailable);
            Assert.Equal(Path.Combine(paths.FrontendArtifactRoot, "workouts", "index.html"), workoutRouteFile?.PhysicalPath);
            Assert.False(machineRouteUnavailable);
            Assert.Equal(Path.Combine(paths.FrontendArtifactRoot, "machines", "index.html"), machineRouteFile?.PhysicalPath);
            Assert.False(unknownRouteUnavailable);
            Assert.Null(unknownRoute);
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
    public void ConfigurationValidationRequiresRepositoryIdentity()
    {
        var errors = ConfigurationStore.Validate(AfConfiguration.Default);

        Assert.Contains(errors, error => error.Code == AfErrorCodes.ConfigInvalid);
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
                url.Contains("/data/master/machines.json", StringComparison.Ordinal) ||
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
            "data/master/machines.json",
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
                url.Contains("/master/machines.json", StringComparison.Ordinal) ||
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
            "master/machines.json",
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
            Directory.CreateDirectory(paths.FrontendArtifactRoot);
            File.WriteAllText(Path.Combine(paths.FrontendArtifactRoot, "version.json"), """
                {
                  "frontend": "1.0.0",
                  "windows": "1.0.0",
                  "android": {
                    "versionName": "0.1.0",
                    "versionCode": 1
                  }
                }
                """);
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
            var expectedApplicationVersion =
                typeof(AtlamentApplication).Assembly.GetCustomAttribute<AssemblyInformationalVersionAttribute>()?.InformationalVersion;

            Assert.True(status.Success);
            Assert.Equal(expectedApplicationVersion, status.Data!.Versions.ApplicationFramework);
            Assert.DoesNotContain("+", status.Data.Versions.ApplicationFramework, StringComparison.Ordinal);
            Assert.Equal("1.0.0", status.Data.Versions.FrontendFramework);
            Assert.Equal("1.0.0", status.Data.Versions.NativePackages.Windows.Version);
            Assert.Equal("0.1.0", status.Data.Versions.NativePackages.Android.VersionName);
            Assert.Equal(1, status.Data.Versions.NativePackages.Android.VersionCode);
            Assert.Contains("CONFIGURATION_REQUIRED", status.Data!.RequiredActions);
            Assert.Contains("CREDENTIAL_REQUIRED", status.Data.RequiredActions);
            Assert.Contains("RUNTIME_DATA_REQUIRED", status.Data.RequiredActions);
            Assert.Equal("unconfigured", status.Data.Readiness.State);
            Assert.Contains("configuration", status.Data.Readiness.UnavailableComponents);
            Assert.Contains("credential", status.Data.Readiness.UnavailableComponents);
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

    [Fact]
    public async Task RequiredActionsAreClearedWhenStartupPrerequisitesAreResolved()
    {
        var root = Path.Combine(Path.GetTempPath(), "atlament-af-test-" + Guid.NewGuid().ToString("N"));
        try
        {
            var http = new RecordingHttpMessageHandler(request =>
            {
                var url = request.RequestUri?.AbsoluteUri ?? "";
                if (url.Contains("/contents/data/workouts?ref=master", StringComparison.Ordinal))
                {
                    return JsonResponse("""
                        [
                          { "path": "data/workouts/2026-08-24.json", "type": "file" }
                        ]
                        """);
                }

                if (url.Contains("/data/workouts/2026-08-24.json", StringComparison.Ordinal))
                {
                    return JsonResponse(Workout("workouts/2026-08-24.json", "known-gym", "known-machine").Content);
                }

                if (url.Contains("/data/master/machines.json", StringComparison.Ordinal))
                {
                    return JsonResponse(MachineMaster.Content);
                }

                if (url.Contains("/data/master/gyms.json", StringComparison.Ordinal))
                {
                    return JsonResponse(GymMaster.Content);
                }

                return new HttpResponseMessage(HttpStatusCode.NotFound);
            });
            var paths = new WindowsPathProvider(root);
            var application = new AtlamentApplication(
                new ConfigurationStore(paths),
                new CredentialStore(paths),
                new RuntimeDataStore(paths),
                new RuntimeDataBuilder(),
                new GithubAccessService(new HttpClient(http)),
                new HostingStatusService(paths),
                new AfLog(paths));

            await application.StartAsync(CancellationToken.None);
            await WaitForStartupAsync(application);
            var initial = application.GetStatus().Data!;
            Assert.Contains("CONFIGURATION_REQUIRED", initial.RequiredActions);
            Assert.Contains("CREDENTIAL_REQUIRED", initial.RequiredActions);
            Assert.Contains("RUNTIME_DATA_REQUIRED", initial.RequiredActions);

            var configuration = await application.UpdateConfigurationAsync(
                new ConfigurationUpdate(new RepositoryConfigurationUpdate("owner", "repo", "master", "data"), null, null),
                CancellationToken.None);
            var afterConfiguration = application.GetStatus().Data!;
            Assert.Equal(200, configuration.StatusCode);
            Assert.DoesNotContain("CONFIGURATION_REQUIRED", afterConfiguration.RequiredActions);

            var credential = application.UpdateCredential(new CredentialUpdate("github-token", "2026-12-31"));
            var afterCredential = application.GetStatus().Data!;
            Assert.Equal(200, credential.StatusCode);
            Assert.DoesNotContain("CREDENTIAL_REQUIRED", afterCredential.RequiredActions);
            Assert.Equal("unavailable", afterCredential.Readiness.State);
            Assert.DoesNotContain("CONFIGURATION_REQUIRED", afterCredential.Readiness.RequiredActions);
            Assert.DoesNotContain("CREDENTIAL_REQUIRED", afterCredential.Readiness.RequiredActions);
            Assert.Contains("RUNTIME_DATA_REQUIRED", afterCredential.Readiness.RequiredActions);

            var sync = await application.ManualSyncAsync(CancellationToken.None);
            var afterSync = application.GetStatus().Data!;
            Assert.True(sync.Response.Success);
            Assert.DoesNotContain("RUNTIME_DATA_REQUIRED", afterSync.RequiredActions);
            Assert.Empty(afterSync.RequiredActions);
            Assert.Equal("ready", afterSync.Application.Status);
            Assert.Equal("ready", afterSync.Readiness.State);
            Assert.Empty(afterSync.Readiness.RequiredActions);
            Assert.Empty(afterSync.Readiness.UnavailableComponents);
            Assert.True(afterSync.RuntimeData.CurrentAvailable);
            Assert.NotNull(afterSync.RuntimeData.CurrentGeneratedAt);
            Assert.Equal("succeeded", afterSync.RuntimeData.LatestRemoteRetrieval);
            Assert.Equal("succeeded", afterSync.RuntimeData.LatestValidation);
            Assert.False(afterSync.RuntimeData.FallbackActive);

            var expiredCredential = application.UpdateCredential(new CredentialUpdate("github-token", "2026-01-01"));
            var afterExpiredCredential = application.GetStatus().Data!;
            Assert.Equal(200, expiredCredential.StatusCode);
            Assert.DoesNotContain("CREDENTIAL_REQUIRED", afterExpiredCredential.Readiness.RequiredActions);
            Assert.Equal("degraded", afterExpiredCredential.Readiness.State);
            Assert.Contains("credential", afterExpiredCredential.Readiness.UnavailableComponents);
            Assert.DoesNotContain("runtimeData", afterExpiredCredential.Readiness.UnavailableComponents);
            Assert.True(afterExpiredCredential.RuntimeData.CurrentAvailable);
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

    [Fact]
    public async Task UnresolvedMasterReferencesDoNotDegradeRuntimeHealth()
    {
        var root = Path.Combine(Path.GetTempPath(), "atlament-af-test-" + Guid.NewGuid().ToString("N"));
        try
        {
            var http = new RecordingHttpMessageHandler(request =>
            {
                var url = request.RequestUri?.AbsoluteUri ?? "";
                if (url.Contains("/contents/data/workouts?ref=master", StringComparison.Ordinal))
                {
                    return JsonResponse("""
                        [
                          { "path": "data/workouts/2026-08-24.json", "type": "file" }
                        ]
                        """);
                }

                if (url.Contains("/data/workouts/2026-08-24.json", StringComparison.Ordinal))
                {
                    return JsonResponse(Workout("workouts/2026-08-24.json", "missing-gym", "missing-machine").Content);
                }

                if (url.Contains("/data/master/machines.json", StringComparison.Ordinal))
                {
                    return JsonResponse(MachineMaster.Content);
                }

                if (url.Contains("/data/master/gyms.json", StringComparison.Ordinal))
                {
                    return JsonResponse(GymMaster.Content);
                }

                return new HttpResponseMessage(HttpStatusCode.NotFound);
            });
            var paths = new WindowsPathProvider(root);
            var configurationStore = new ConfigurationStore(paths);
            Assert.Empty(configurationStore.Save(Configuration("data")));
            var credentialStore = new CredentialStore(paths);
            Assert.Equal("available", credentialStore.Save(new CredentialUpdate("github-token", "2026-12-31")).State);
            var application = new AtlamentApplication(
                configurationStore,
                credentialStore,
                new RuntimeDataStore(paths),
                new RuntimeDataBuilder(),
                new GithubAccessService(new HttpClient(http)),
                new HostingStatusService(paths),
                new AfLog(paths));

            await application.StartAsync(CancellationToken.None);
            await WaitForStartupAsync(application);
            var status = application.GetStatus().Data!;
            var runtime = application.GetRuntimeWorkouts();

            Assert.True(runtime.Success);
            Assert.Empty(runtime.Errors);
            Assert.NotEmpty(runtime.Warnings);
            Assert.Equal("ready", status.Readiness.State);
            Assert.False(status.Application.Degraded);
            Assert.False(status.RuntimeData.FallbackActive);
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

    [Fact]
    public async Task RemoteFailureWithCurrentRuntimeDataPublishesFallbackStatus()
    {
        var root = Path.Combine(Path.GetTempPath(), "atlament-af-test-" + Guid.NewGuid().ToString("N"));
        try
        {
            var failRemote = false;
            var http = new RecordingHttpMessageHandler(request =>
            {
                if (failRemote)
                {
                    throw new HttpRequestException("offline");
                }

                var url = request.RequestUri?.AbsoluteUri ?? "";
                if (url.Contains("/contents/data/workouts?ref=master", StringComparison.Ordinal))
                {
                    return JsonResponse("""
                        [
                          { "path": "data/workouts/2026-08-24.json", "type": "file" }
                        ]
                        """);
                }

                if (url.Contains("/data/workouts/2026-08-24.json", StringComparison.Ordinal))
                {
                    return JsonResponse(Workout("workouts/2026-08-24.json", "known-gym", "known-machine").Content);
                }

                if (url.Contains("/data/master/machines.json", StringComparison.Ordinal))
                {
                    return JsonResponse(MachineMaster.Content);
                }

                if (url.Contains("/data/master/gyms.json", StringComparison.Ordinal))
                {
                    return JsonResponse(GymMaster.Content);
                }

                return new HttpResponseMessage(HttpStatusCode.NotFound);
            });
            var paths = new WindowsPathProvider(root);
            var configurationStore = new ConfigurationStore(paths);
            Assert.Empty(configurationStore.Save(Configuration("data")));
            var credentialStore = new CredentialStore(paths);
            Assert.Equal("available", credentialStore.Save(new CredentialUpdate("github-token", "2026-12-31")).State);
            var application = new AtlamentApplication(
                configurationStore,
                credentialStore,
                new RuntimeDataStore(paths),
                new RuntimeDataBuilder(),
                new GithubAccessService(new HttpClient(http)),
                new HostingStatusService(paths),
                new AfLog(paths));

            await application.StartAsync(CancellationToken.None);
            await WaitForStartupAsync(application);
            var ready = application.GetStatus().Data!;
            Assert.Equal("ready", ready.Readiness.State);
            Assert.False(ready.RuntimeData.FallbackActive);

            failRemote = true;
            var fallback = await application.ManualSyncAsync(CancellationToken.None);
            var status = application.GetStatus().Data!;

            Assert.Equal(200, fallback.StatusCode);
            Assert.False(fallback.Response.Success);
            Assert.True(fallback.Response.Data!.Degraded);
            Assert.Equal("degraded", status.Readiness.State);
            Assert.True(status.RuntimeData.CurrentAvailable);
            Assert.Equal("failed", status.RuntimeData.LatestRemoteRetrieval);
            Assert.Equal("skipped", status.RuntimeData.LatestValidation);
            Assert.True(status.RuntimeData.FallbackActive);
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

    [Fact]
    public async Task MasterWriteBoundaryAllowsOnlyMasterResources()
    {
        var root = Path.Combine(Path.GetTempPath(), "atlament-af-test-" + Guid.NewGuid().ToString("N"));
        try
        {
            var paths = new WindowsPathProvider(root);
            var configurationStore = new ConfigurationStore(paths);
            var saved = configurationStore.Save(Configuration("data"));
            Assert.Empty(saved);

            var application = new AtlamentApplication(
                configurationStore,
                new CredentialStore(paths),
                new RuntimeDataStore(paths),
                new RuntimeDataBuilder(),
                new GithubAccessService(new HttpClient(new RecordingHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.OK)))),
                new HostingStatusService(paths),
                new AfLog(paths));

            await application.StartAsync(CancellationToken.None);
            await WaitForStartupAsync(application);
            var boundary = application.GetMasterWriteBoundary().Data!;

            Assert.Equal("owner", boundary.Repository.Owner);
            Assert.Equal("repo", boundary.Repository.Repository);
            Assert.Equal("master", boundary.Repository.Ref);
            Assert.All(boundary.AllowedTargets, target => Assert.True(target.WriteAllowed));
            Assert.Contains(boundary.AllowedTargets, target => target.Type == "MACHINE_MASTER" && target.Path == "master/machines.json");
            Assert.Contains(boundary.AllowedTargets, target => target.Type == "GYM_MASTER" && target.Path == "master/gyms.json");
            Assert.DoesNotContain(boundary.AllowedTargets, target => target.Type == "WORKOUT");
            Assert.True(boundary.Security.ConfigurationAvailable);
            Assert.False(boundary.Security.WriteEnabled);
            Assert.False(boundary.Security.WorkoutLogWriteAllowed);
            Assert.False(boundary.Security.RawJsonWriteAllowed);
            Assert.False(boundary.Security.GenericGitWriteAllowed);
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

    [Fact]
    public async Task MasterWriteBoundaryRequiresAvailableCredential()
    {
        var root = Path.Combine(Path.GetTempPath(), "atlament-af-test-" + Guid.NewGuid().ToString("N"));
        try
        {
            var paths = new WindowsPathProvider(root);
            var configurationStore = new ConfigurationStore(paths);
            Assert.Empty(configurationStore.Save(Configuration("data")));
            var credentialStore = new CredentialStore(paths);
            var credential = credentialStore.Save(new CredentialUpdate("github-token", "2026-12-31"));
            Assert.Equal("available", credential.State);

            var application = new AtlamentApplication(
                configurationStore,
                credentialStore,
                new RuntimeDataStore(paths),
                new RuntimeDataBuilder(),
                new GithubAccessService(new HttpClient(new RecordingHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.OK)))),
                new HostingStatusService(paths),
                new AfLog(paths));

            await application.StartAsync(CancellationToken.None);
            await WaitForStartupAsync(application);
            var boundary = application.GetMasterWriteBoundary().Data!;

            Assert.True(boundary.Security.CredentialConfigured);
            Assert.Equal("available", boundary.Security.CredentialState);
            Assert.True(boundary.Security.RepositoryConfigured);
            Assert.True(boundary.Security.WriteEnabled);
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

    [Fact]
    public async Task MasterWriteBoundaryDoesNotTrustConfiguredArbitraryMasterPath()
    {
        var root = Path.Combine(Path.GetTempPath(), "atlament-af-test-" + Guid.NewGuid().ToString("N"));
        try
        {
            var paths = new WindowsPathProvider(root);
            var configurationStore = new ConfigurationStore(paths);
            var configuration = new AfConfiguration(
                1,
                new RepositoryConfiguration("owner", "repo", "master", "data"),
                new[]
                {
                    new ResourceConfiguration("WORKOUT", "workouts/", "directory", true, false),
                    new ResourceConfiguration("MACHINE_MASTER", "master/other-machines.json", "file", true, false),
                    new ResourceConfiguration("GYM_MASTER", "master/gyms.json", "file", true, false)
                },
                new TimeoutConfiguration(10, 60, 30, 10));
            Assert.Empty(configurationStore.Save(configuration));
            var credentialStore = new CredentialStore(paths);
            Assert.Equal("available", credentialStore.Save(new CredentialUpdate("github-token", "2026-12-31")).State);

            var application = new AtlamentApplication(
                configurationStore,
                credentialStore,
                new RuntimeDataStore(paths),
                new RuntimeDataBuilder(),
                new GithubAccessService(new HttpClient(new RecordingHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.OK)))),
                new HostingStatusService(paths),
                new AfLog(paths));

            await application.StartAsync(CancellationToken.None);
            await WaitForStartupAsync(application);
            var boundary = application.GetMasterWriteBoundary().Data!;

            Assert.Contains(boundary.AllowedTargets, target => target.Type == "MACHINE_MASTER" && target.Path == "master/machines.json");
            Assert.DoesNotContain(boundary.AllowedTargets, target => target.Path == "master/other-machines.json");
            Assert.False(boundary.Security.WriteEnabled);
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

    [Fact]
    public async Task MasterDocumentWriteUsesExpectedRevisionAndFixedCommitMessage()
    {
        var requests = new List<HttpRequestMessage>();
        var http = new RecordingAsyncHttpMessageHandler(async request =>
        {
            requests.Add(CloneRequest(request));
            if (request.Method == HttpMethod.Get)
            {
                if (request.RequestUri!.AbsoluteUri.Contains("/data/master/gyms.json", StringComparison.Ordinal))
                {
                    return JsonResponse($$"""
                        {
                          "sha": "gym-sha",
                          "content": "{{EncodeContent("{\"schema_version\":1,\"gyms\":[{\"gym_id\":\"g1\",\"name\":\"Gym\",\"active\":true,\"deleted\":false,\"main\":true}]}")}}"
                        }
                        """);
                }

                return JsonResponse($$"""
                    {
                      "sha": "current-sha",
                      "content": "{{EncodeContent("{\"schema_version\":1,\"machines\":[{\"machine_id\":\"m0\",\"name\":\"Machine 0\",\"body_part\":\"chest\",\"aliases\":[],\"active\":true,\"deleted\":false}]}")}}"
                    }
                    """);
            }

            var body = request.Content is null ? "{}" : await request.Content.ReadAsStringAsync();
            var payload = JsonNode.Parse(body)!;
            Assert.Equal("Update machine master", payload["message"]!.GetValue<string>());
            Assert.Equal("current-sha", payload["sha"]!.GetValue<string>());
            Assert.Equal("master", payload["branch"]!.GetValue<string>());
            Assert.Equal(
                "{\"schema_version\":1,\"machines\":[{\"machine_id\":\"m1\",\"name\":\"Machine 1\",\"body_part\":\"back\",\"aliases\":[],\"active\":true,\"deleted\":false}]}",
                Encoding.UTF8.GetString(Convert.FromBase64String(payload["content"]!.GetValue<string>())));
            return JsonResponse("""
                {
                  "content": {
                    "sha": "saved-sha"
                  }
                }
                """);
        });

        var github = new GithubAccessService(new HttpClient(http));
        var result = await github.SaveMasterDocumentAsync(
            Configuration("data"),
            "github-token",
            "MACHINE_MASTER",
            "current-sha",
            "{\"schema_version\":1,\"machines\":[{\"machine_id\":\"m1\",\"name\":\"Machine 1\",\"body_part\":\"back\",\"aliases\":[],\"active\":true,\"deleted\":false}]}",
            CancellationToken.None);

        Assert.Empty(result.Errors);
        Assert.NotNull(result.Result);
        Assert.Equal("saved-sha", result.Result!.Revision);
        Assert.Equal("master/machines.json", result.Result.Path);
        Assert.Equal(3, requests.Count);
        Assert.Equal(HttpMethod.Get, requests[0].Method);
        Assert.Contains("/contents/data/master/machines.json?ref=master", requests[0].RequestUri!.AbsoluteUri);
        Assert.Equal(HttpMethod.Get, requests[1].Method);
        Assert.Contains("/contents/data/master/gyms.json?ref=master", requests[1].RequestUri!.AbsoluteUri);
        Assert.Equal(HttpMethod.Put, requests[2].Method);
        Assert.Contains("/contents/data/master/machines.json", requests[2].RequestUri!.AbsoluteUri);
    }

    [Fact]
    public async Task MasterDocumentWriteRejectsStaleRevisionWithoutPut()
    {
        var methods = new List<HttpMethod>();
        var http = new RecordingHttpMessageHandler(request =>
        {
            methods.Add(request.Method);
            return JsonResponse("""
                {
                  "sha": "newer-sha",
                  "content": "e30="
                }
                """);
        });

        var github = new GithubAccessService(new HttpClient(http));
        var result = await github.SaveMasterDocumentAsync(
            Configuration("data"),
            "github-token",
            "GYM_MASTER",
            "stale-sha",
            "{\"schema_version\":1,\"gyms\":[]}",
            CancellationToken.None);

        Assert.Null(result.Result);
        Assert.Contains(result.Errors, error => error.Code == AfErrorCodes.MasterWriteConflict);
        Assert.Equal(new[] { HttpMethod.Get }, methods);
    }

    [Fact]
    public async Task MasterDocumentWriteRejectsUnknownTarget()
    {
        var github = new GithubAccessService(new HttpClient(new RecordingHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.OK))));

        var result = await github.SaveMasterDocumentAsync(
            Configuration("data"),
            "github-token",
            "WORKOUT",
            "sha",
            "{}",
            CancellationToken.None);

        Assert.Null(result.Result);
        Assert.Contains(result.Errors, error => error.Code == AfErrorCodes.MasterWriteInvalid);
    }

    [Fact]
    public async Task MasterDocumentWriteValidatesWholeMasterBeforePut()
    {
        var methods = new List<HttpMethod>();
        var http = new RecordingHttpMessageHandler(request =>
        {
            methods.Add(request.Method);
            if (request.RequestUri!.AbsoluteUri.Contains("/data/master/machines.json", StringComparison.Ordinal))
            {
                return JsonResponse($$"""
                    {
                      "sha": "machine-sha",
                      "content": "{{EncodeContent("{\"schema_version\":1,\"machines\":[{\"machine_id\":\"m1\",\"name\":\"Machine 1\",\"body_part\":\"chest\",\"aliases\":[],\"active\":true,\"deleted\":false}]}")}}"
                    }
                    """);
            }

            return JsonResponse($$"""
                {
                  "sha": "gym-sha",
                  "content": "{{EncodeContent("{\"schema_version\":1,\"gyms\":[{\"gym_id\":\"g1\",\"name\":\"Gym 1\",\"active\":true,\"deleted\":false,\"main\":false}]}")}}"
                }
                """);
        });

        var github = new GithubAccessService(new HttpClient(http));
        var result = await github.SaveMasterDocumentAsync(
            Configuration("data"),
            "github-token",
            "GYM_MASTER",
            "gym-sha",
            "{\"schema_version\":1,\"gyms\":[{\"gym_id\":\"g1\",\"name\":\"Gym 1\",\"active\":true,\"deleted\":false,\"main\":true},{\"gym_id\":\"g2\",\"name\":\"Gym 2\",\"active\":false,\"deleted\":false,\"main\":true}]}",
            CancellationToken.None);

        Assert.Null(result.Result);
        Assert.Contains(result.Errors, error => error.Code == AfErrorCodes.MasterWriteInvalid);
        Assert.Equal(new[] { HttpMethod.Get, HttpMethod.Get }, methods);
    }

    [Fact]
    public async Task MasterDocumentWriteRejectsClearingConfiguredMainGymBeforePut()
    {
        var methods = new List<HttpMethod>();
        var http = new RecordingHttpMessageHandler(request =>
        {
            methods.Add(request.Method);
            return JsonResponse($$"""
                {
                  "sha": "gym-sha",
                  "content": "{{EncodeContent("{\"schema_version\":1,\"gyms\":[{\"gym_id\":\"g1\",\"name\":\"Gym 1\",\"active\":true,\"deleted\":false,\"main\":true}]}")}}"
                }
                """);
        });

        var github = new GithubAccessService(new HttpClient(http));
        var result = await github.SaveMasterDocumentAsync(
            Configuration("data"),
            "github-token",
            "GYM_MASTER",
            "gym-sha",
            "{\"schema_version\":1,\"gyms\":[{\"gym_id\":\"g1\",\"name\":\"Gym 1\",\"active\":true,\"deleted\":false,\"main\":false}]}",
            CancellationToken.None);

        Assert.Null(result.Result);
        Assert.Contains(result.Errors, error => error.Code == AfErrorCodes.MasterWriteInvalid);
        Assert.Equal(new[] { HttpMethod.Get }, methods);
    }

    [Theory]
    [InlineData(401, AfErrorCodes.GithubUnauthorized)]
    [InlineData(403, AfErrorCodes.GithubForbidden)]
    [InlineData(404, AfErrorCodes.GithubResourceNotFound)]
    [InlineData(429, AfErrorCodes.GithubRateLimit)]
    [InlineData(500, AfErrorCodes.GithubServerError)]
    public async Task MasterDocumentWriteMapsGithubReadFailureCodes(int statusCode, string expectedCode)
    {
        var github = new GithubAccessService(new HttpClient(new RecordingHttpMessageHandler(_ => new HttpResponseMessage((HttpStatusCode)statusCode))));

        var result = await github.SaveMasterDocumentAsync(
            Configuration("data"),
            "github-token",
            "MACHINE_MASTER",
            "current-sha",
            "{\"schema_version\":1,\"machines\":[]}",
            CancellationToken.None);

        Assert.Null(result.Result);
        Assert.Contains(result.Errors, error => error.Code == expectedCode);
    }

    [Fact]
    public async Task MasterDocumentWriteReportsAmbiguousGithubWriteResult()
    {
        var http = new RecordingHttpMessageHandler(request =>
        {
            if (request.Method == HttpMethod.Put)
            {
                return JsonResponse("{}");
            }

            if (request.RequestUri!.AbsoluteUri.Contains("/data/master/gyms.json", StringComparison.Ordinal))
            {
                return JsonResponse($$"""
                    {
                      "sha": "gym-sha",
                      "content": "{{EncodeContent("{\"schema_version\":1,\"gyms\":[]}")}}"
                    }
                    """);
            }

            return JsonResponse($$"""
                {
                  "sha": "machine-sha",
                  "content": "{{EncodeContent("{\"schema_version\":1,\"machines\":[]}")}}"
                }
                """);
        });

        var github = new GithubAccessService(new HttpClient(http));
        var result = await github.SaveMasterDocumentAsync(
            Configuration("data"),
            "github-token",
            "MACHINE_MASTER",
            "machine-sha",
            "{\"schema_version\":1,\"machines\":[]}",
            CancellationToken.None);

        Assert.Null(result.Result);
        Assert.Contains(result.Errors, error => error.Code == AfErrorCodes.MasterWriteFailed);
    }

    [Fact]
    public async Task MasterDocumentWriteMapsNetworkAndCanceledOperations()
    {
        var networkGithub = new GithubAccessService(new HttpClient(new RecordingHttpMessageHandler(_ => throw new HttpRequestException())));
        var network = await networkGithub.SaveMasterDocumentAsync(
            Configuration("data"),
            "github-token",
            "MACHINE_MASTER",
            "current-sha",
            "{\"schema_version\":1,\"machines\":[]}",
            CancellationToken.None);

        using var canceled = new CancellationTokenSource();
        await canceled.CancelAsync();
        var timeoutGithub = new GithubAccessService(new HttpClient(new RecordingHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.OK))));
        var timeout = await timeoutGithub.SaveMasterDocumentAsync(
            Configuration("data"),
            "github-token",
            "MACHINE_MASTER",
            "current-sha",
            "{\"schema_version\":1,\"machines\":[]}",
            canceled.Token);

        Assert.Null(network.Result);
        Assert.Contains(network.Errors, error => error.Code == AfErrorCodes.GithubConnectionFailed);
        Assert.Null(timeout.Result);
        Assert.Contains(timeout.Errors, error => error.Code == AfErrorCodes.GithubTimeout);
    }

    [Fact]
    public async Task MasterDocumentWriteRejectsDeletingReferencedMachineBeforeGithubWrite()
    {
        var root = Path.Combine(Path.GetTempPath(), "atlament-af-test-" + Guid.NewGuid().ToString("N"));
        try
        {
            var paths = new WindowsPathProvider(root);
            var configurationStore = new ConfigurationStore(paths);
            Assert.Empty(configurationStore.Save(Configuration("data")));
            var credentialStore = new CredentialStore(paths);
            Assert.Equal("available", credentialStore.Save(new CredentialUpdate("github-token", "2026-12-31")).State);

            var runtimeStore = new RuntimeDataStore(paths);
            var session = new WorkoutSession(
                1,
                "valid",
                "2026-08-24",
                "complete",
                new Gym("known-gym", "Known Gym", "KG", new MasterReferenceResolution("resolved", "known-gym", "known-gym")),
                null,
                new[]
                {
                    new WorkoutMachine("known-machine", "Known Machine", "chest", new MasterReferenceResolution("resolved", "known-machine", "known-machine"), new[] { new MachineSet(1, 20, 10, null, null, null, null) }, Array.Empty<string>())
                },
                Array.Empty<string>());
            Assert.Empty(runtimeStore.SaveCurrent(new RuntimeBuildResult(new[] { session }, Array.Empty<AfError>(), Array.Empty<RuntimeWarning>(), false)));

            var http = new RecordingHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.OK));
            var application = new AtlamentApplication(
                configurationStore,
                credentialStore,
                runtimeStore,
                new RuntimeDataBuilder(),
                new GithubAccessService(new HttpClient(http)),
                new HostingStatusService(paths),
                new AfLog(paths));

            await application.StartAsync(CancellationToken.None);
            await WaitForStartupAsync(application);
            Assert.Empty(runtimeStore.SaveCurrent(new RuntimeBuildResult(new[] { session }, Array.Empty<AfError>(), Array.Empty<RuntimeWarning>(), false)));
            http.RequestedUrls.Clear();

            var result = await application.WriteMasterDocumentAsync(
                "MACHINE_MASTER",
                new MasterDocumentWriteRequest(
                    "current-sha",
                    "{\"schema_version\":1,\"machines\":[{\"machine_id\":\"known-machine\",\"name\":\"Known Machine\",\"body_part\":\"chest\",\"aliases\":[],\"active\":false,\"deleted\":true}]}"),
                CancellationToken.None);

            Assert.Equal(400, result.StatusCode);
            Assert.False(result.Response.Success);
            Assert.Contains(result.Response.Errors, error => error.Code == AfErrorCodes.MasterWriteInvalid);
            Assert.Empty(http.RequestedUrls);
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

    private static async Task WaitForStartupAsync(AtlamentApplication application)
    {
        for (var attempt = 0; attempt < 20; attempt++)
        {
            if (application.GetStatus().Data?.Operations.Startup != "running")
            {
                return;
            }

            await Task.Delay(50);
        }
    }

    private static RuntimeSourceFile Workout(string path, string gymId, string machineId)
    {
        var sessionId = Path.GetFileNameWithoutExtension(path).Replace("missing-machine", "missingMachine").Replace("missing-gym", "missingGym");
        return new RuntimeSourceFile(path, $$"""
            {
              "schema_version": 1,
              "session_id": "{{sessionId}}",
              "date": "2026-08-24",
              "status": "complete",
              "gym_id": "{{gymId}}",
              "machines": [
                {
                  "machine_id": "{{machineId}}",
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
            new ResourceConfiguration("MACHINE_MASTER", "master/machines.json", "file", true, false),
            new ResourceConfiguration("GYM_MASTER", "master/gyms.json", "file", true, false)
        },
        new TimeoutConfiguration(10, 60, 30, 10));

    private static HttpResponseMessage JsonResponse(string json) => new(HttpStatusCode.OK)
    {
        Content = new StringContent(json)
    };

    private static string EncodeContent(string content) => Convert.ToBase64String(Encoding.UTF8.GetBytes(content));

    private static HttpRequestMessage CloneRequest(HttpRequestMessage request)
    {
        return new HttpRequestMessage(request.Method, request.RequestUri);
    }

    private sealed class RecordingHttpMessageHandler(Func<HttpRequestMessage, HttpResponseMessage> respond) : HttpMessageHandler
    {
        public List<string> RequestedUrls { get; } = new();

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            RequestedUrls.Add(request.RequestUri?.AbsoluteUri ?? "");
            return Task.FromResult(respond(request));
        }
    }

    private sealed class RecordingAsyncHttpMessageHandler(Func<HttpRequestMessage, Task<HttpResponseMessage>> respond) : HttpMessageHandler
    {
        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            return await respond(request);
        }
    }
}
