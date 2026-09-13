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
    public void BrokenWorkoutResourceQuarantinesOnlyThatFile()
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

        Assert.False(result.TechnicalInvalid);
        Assert.Equal("valid", Assert.Single(result.Sessions).SessionId);
        Assert.Contains(result.Errors, error => error.Code == AfErrorCodes.RuntimeDataInvalid);
    }

    [Fact]
    public void BrokenJsonlLineQuarantinesEntireJsonlResource()
    {
        var builder = new RuntimeDataBuilder();
        var files = new[]
        {
            new RuntimeSourceFile("workouts/mixed.jsonl", """
                {"schema_version":1,"session_id":"line-1","date":"2026-08-24","status":"complete","gym_id":"known-gym","machines":[{"machine_id":"known-machine","sets":[{"set":1,"weight_kg":20,"reps":10}]}]}
                {"schema_version":1,"session_id":"broken"
                {"schema_version":1,"session_id":"line-3","date":"2026-08-26","status":"complete","gym_id":"known-gym","machines":[{"machine_id":"known-machine","sets":[{"set":1,"weight_kg":20,"reps":10}]}]}
                """)
        };

        var result = builder.Build(files, MachineMaster, GymMaster);

        Assert.False(result.TechnicalInvalid);
        Assert.Empty(result.Sessions);
        Assert.Contains(result.Errors, error =>
            error.Code == AfErrorCodes.RuntimeDataInvalid &&
            error.Message.Contains("workouts/mixed.jsonl:2:", StringComparison.Ordinal));
    }

    [Fact]
    public void HealthyResourcesContinueAroundBrokenResource()
    {
        var builder = new RuntimeDataBuilder();
        var files = new[]
        {
            Workout("workouts/a.json", "known-gym", "known-machine"),
            new RuntimeSourceFile("workouts/b.json", "{"),
            Workout("workouts/c.json", "known-gym", "known-machine")
        };

        var result = builder.Build(files, MachineMaster, GymMaster);

        Assert.False(result.TechnicalInvalid);
        Assert.Equal(new[] { "a", "c" }, result.Sessions.Select(session => session.SessionId));
        Assert.Contains(result.Errors, error => error.Message.Contains("workouts/b.json", StringComparison.Ordinal));
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
    public void MasterReferenceSemanticsKeepsSharedResolutionAndWarningCodes()
    {
        Assert.Equal("missing", MasterReferenceSemantics.Resolve("missing-machine", null, deleted: false, invalidExcluded: false).State);
        Assert.Equal("deleted", MasterReferenceSemantics.Resolve("deleted-machine", "deleted-machine", deleted: true, invalidExcluded: false).State);
        Assert.Equal("invalid_excluded", MasterReferenceSemantics.Resolve("invalid-machine", null, deleted: false, invalidExcluded: true).State);
        Assert.Equal("resolved", MasterReferenceSemantics.Resolve("legacy-machine", "known-machine", deleted: false, invalidExcluded: false).State);

        Assert.Equal("MASTER_REFERENCE_MISSING", MasterReferenceSemantics.CreateWarning("machine", "missing-machine", null, false, false, "session", "workouts/a.json", null).Code);
        Assert.Equal("MASTER_REFERENCE_DELETED", MasterReferenceSemantics.CreateWarning("machine", "deleted-machine", "deleted-machine", true, false, "session", "workouts/a.json", null).Code);
        Assert.Equal("MASTER_REFERENCE_INVALID_EXCLUDED", MasterReferenceSemantics.CreateWarning("machine", "invalid-machine", null, false, true, "session", "workouts/a.json", null).Code);
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
    public void InvalidMasterRecordIsExcludedWhileValidRecordsRemainResolved()
    {
        var builder = new RuntimeDataBuilder();
        var machineMaster = new RuntimeSourceFile("master/machines.json", """
            {
              "schema_version": 1,
              "machines": [
                { "machine_id": "known-machine", "name": "Known Machine", "body_part": "chest", "active": true },
                { "machine_id": "invalid-machine", "name": "Invalid Machine", "body_part": "unknown", "active": true }
              ]
            }
            """);

        var result = builder.Build(
            new[]
            {
                Workout("workouts/valid.json", "known-gym", "known-machine"),
                Workout("workouts/excluded.json", "known-gym", "invalid-machine")
            },
            machineMaster,
            GymMaster);

        Assert.False(result.TechnicalInvalid);
        Assert.Equal(2, result.Sessions.Count);
        Assert.Contains(result.Errors, error => error.Code == AfErrorCodes.RuntimeDataInvalid && error.Message.Contains("Machine master item is invalid", StringComparison.Ordinal));
        Assert.Equal("Known Machine", result.Sessions.Single(session => session.SessionId == "valid").Machines[0].Name);
        var excluded = result.Sessions.Single(session => session.SessionId == "excluded").Machines[0];
        Assert.Equal("invalid_excluded", excluded.Resolution.State);
        Assert.Null(excluded.Name);
        Assert.Contains(result.Warnings, warning =>
            warning.Code == "MASTER_REFERENCE_INVALID_EXCLUDED" &&
            warning.ResolutionState == "invalid_excluded" &&
            warning.OriginalId == "invalid-machine");
    }

    [Fact]
    public void DuplicateMasterIdsExcludeAllConflictingRecordsWithoutGuessingWinner()
    {
        var builder = new RuntimeDataBuilder();
        var machineMaster = new RuntimeSourceFile("master/machines.json", """
            {
              "schema_version": 1,
              "machines": [
                { "machine_id": "duplicate-machine", "name": "First", "body_part": "chest", "active": true },
                { "machine_id": "duplicate-machine", "name": "Second", "body_part": "back", "active": true }
              ]
            }
            """);

        var result = builder.Build(new[] { Workout("workouts/duplicate.json", "known-gym", "duplicate-machine") }, machineMaster, GymMaster);

        Assert.False(result.TechnicalInvalid);
        var machine = Assert.Single(Assert.Single(result.Sessions).Machines);
        Assert.Equal("duplicate-machine", machine.MachineId);
        Assert.Equal("invalid_excluded", machine.Resolution.State);
        Assert.Null(machine.BodyPart);
        Assert.Contains(result.Errors, error => error.Message.Contains("duplicate reference key is excluded: duplicate-machine", StringComparison.Ordinal));
        Assert.Contains(result.Warnings, warning => warning.Code == "MASTER_REFERENCE_INVALID_EXCLUDED" && warning.OriginalId == "duplicate-machine");
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
    public void RecoveryDraftCreatePersistsRevisionBoundDraft()
    {
        var root = Path.Combine(Path.GetTempPath(), "atlament-recovery-test-" + Guid.NewGuid().ToString("N"));
        try
        {
            var paths = new WindowsPathProvider(root);
            var service = new RecoveryService(new RecoveryDraftStore(paths));
            var source = new RuntimeSourceFile("workouts/broken.json", """
                {
                  "schema_version": 1,
                  "session_id": "broken",
                  "date": "2026-08-24",
                  "status": "complete",
                  "gym_id": "known-gym"
                }
                """, "source-revision-a");

            var (snapshot, errors) = service.CreateWorkoutDraft(Configuration("data"), source, broken: true);

            Assert.Empty(errors);
            Assert.Equal("active", snapshot.State);
            Assert.NotNull(snapshot.Draft);
            Assert.Equal("workouts/broken.json", snapshot.Draft!.SourcePath);
            Assert.Equal("source-revision-a", snapshot.Draft.SourceRevision);
            Assert.Equal(1, snapshot.Draft.SchemaVersion);
            Assert.Equal(1, snapshot.Draft.DraftRevision);
            Assert.Contains(snapshot.Draft.Fields, field => field["fieldPath"]?.GetValue<string>() == "/session_id" && field["state"]?.GetValue<string>() == "recovered");
            Assert.Contains(snapshot.Draft.Fields, field => field["fieldPath"]?.GetValue<string>() == "/machines" && field["state"]?.GetValue<string>() == "unresolved" && !field.ContainsKey("value"));
            Assert.True(Directory.Exists(paths.RecoveryDraftRoot));
            Assert.False(Directory.Exists(Path.Combine(root, ".git")));
        }
        finally
        {
            if (Directory.Exists(root)) Directory.Delete(root, true);
        }
    }

    [Fact]
    public void RecoveryDraftCreateReturnsExistingActiveDraftWithoutOverwrite()
    {
        var root = Path.Combine(Path.GetTempPath(), "atlament-recovery-test-" + Guid.NewGuid().ToString("N"));
        try
        {
            var service = new RecoveryService(new RecoveryDraftStore(new WindowsPathProvider(root)));
            var configuration = Configuration("data");
            var source = new RuntimeSourceFile("workouts/broken.json", "{\"session_id\":\"first\"}", "source-revision-a");

            var first = service.CreateWorkoutDraft(configuration, source, broken: true).Snapshot.Draft!;
            var second = service.CreateWorkoutDraft(configuration, new RuntimeSourceFile("workouts/broken.json", "{\"session_id\":\"second\"}", "source-revision-a"), broken: true).Snapshot.Draft!;

            Assert.Equal(1, second.DraftRevision);
            Assert.Equal(first.Fields.Single(field => field["fieldPath"]?.GetValue<string>() == "/session_id")["value"]?.GetValue<string>(), second.Fields.Single(field => field["fieldPath"]?.GetValue<string>() == "/session_id")["value"]?.GetValue<string>());
        }
        finally
        {
            if (Directory.Exists(root)) Directory.Delete(root, true);
        }
    }

    [Fact]
    public void RecoveryDraftUpdateRequiresExpectedDraftRevision()
    {
        var root = Path.Combine(Path.GetTempPath(), "atlament-recovery-test-" + Guid.NewGuid().ToString("N"));
        try
        {
            var service = new RecoveryService(new RecoveryDraftStore(new WindowsPathProvider(root)));
            var configuration = Configuration("data");
            var source = new RuntimeSourceFile("workouts/broken.json", "{\"session_id\":\"broken\"}", "source-revision-a");
            _ = service.CreateWorkoutDraft(configuration, source, broken: true);
            var fields = new[]
            {
                new JsonObject
                {
                    ["fieldPath"] = "/session_id",
                    ["state"] = "confirmed",
                    ["source"] = "user",
                    ["value"] = "fixed"
                }
            };

            var updated = service.UpdateDraft(configuration, "WORKOUT", source.Path, source.Revision!, new RecoveryDraftUpdate(1, fields));
            var conflicted = service.UpdateDraft(configuration, "WORKOUT", source.Path, source.Revision!, new RecoveryDraftUpdate(1, Array.Empty<JsonObject>()));

            Assert.Empty(updated.Errors);
            Assert.Equal(2, updated.Snapshot.Draft!.DraftRevision);
            Assert.Contains(conflicted.Errors, error => error.Code == AfErrorCodes.RecoveryDraftConflict);
            Assert.Equal(2, conflicted.Snapshot.Draft!.DraftRevision);
            Assert.Equal("fixed", conflicted.Snapshot.Draft.Fields.Single()["value"]?.GetValue<string>());
        }
        finally
        {
            if (Directory.Exists(root)) Directory.Delete(root, true);
        }
    }

    [Fact]
    public void RecoveryDraftUpdatePropagatesRevisionForConsecutiveAutosaves()
    {
        var root = Path.Combine(Path.GetTempPath(), "atlament-recovery-test-" + Guid.NewGuid().ToString("N"));
        try
        {
            var service = new RecoveryService(new RecoveryDraftStore(new WindowsPathProvider(root)));
            var configuration = Configuration("data");
            var source = new RuntimeSourceFile("workouts/broken.json", "{\"session_id\":\"broken\"}", "source-revision-a");
            _ = service.CreateWorkoutDraft(configuration, source, broken: true);

            var first = service.UpdateDraft(
                configuration,
                "WORKOUT",
                source.Path,
                source.Revision!,
                new RecoveryDraftUpdate(1, new[] { ConfirmedField("/date", JsonValue.Create("2026-08-22")) }));
            var second = service.UpdateDraft(
                configuration,
                "WORKOUT",
                source.Path,
                source.Revision!,
                new RecoveryDraftUpdate(first.Snapshot.Draft!.DraftRevision, new[] { ConfirmedField("/date", JsonValue.Create("2026-08-23")) }));

            Assert.Empty(first.Errors);
            Assert.Equal(2, first.Snapshot.Draft!.DraftRevision);
            Assert.Empty(second.Errors);
            Assert.Equal(3, second.Snapshot.Draft!.DraftRevision);
            Assert.Equal("2026-08-23", second.Snapshot.Draft.Fields.Single()["value"]?.GetValue<string>());
        }
        finally
        {
            if (Directory.Exists(root)) Directory.Delete(root, true);
        }
    }

    [Fact]
    public void RecoveryDraftRestoreStaleAndCorruptedStatesDoNotTouchRuntime()
    {
        var root = Path.Combine(Path.GetTempPath(), "atlament-recovery-test-" + Guid.NewGuid().ToString("N"));
        try
        {
            var paths = new WindowsPathProvider(root);
            var configuration = Configuration("data");
            var service = new RecoveryService(new RecoveryDraftStore(paths));
            var source = new RuntimeSourceFile("workouts/broken.json", "{", "source-revision-a");
            var runtimeStore = new RuntimeDataStore(paths);
            Assert.Empty(runtimeStore.SaveCurrent(new RuntimeBuildResult(Array.Empty<WorkoutSession>(), Array.Empty<AfError>(), Array.Empty<RuntimeWarning>(), false)));
            var runtimeBefore = File.ReadAllText(paths.RuntimeDataPath);

            _ = service.CreateWorkoutDraft(configuration, source, broken: true);
            var restarted = new RecoveryService(new RecoveryDraftStore(paths));
            var active = restarted.LoadDraft(configuration, "WORKOUT", source.Path, "source-revision-a");
            var stale = restarted.LoadDraft(configuration, "WORKOUT", source.Path, "source-revision-b");
            File.WriteAllText(Path.Combine(paths.RecoveryDraftRoot, "corrupted.json"), "{", Encoding.UTF8);
            var corrupted = restarted.LoadDraft(configuration, "WORKOUT", "workouts/other.json", "other-revision");

            Assert.Equal("active", active.State);
            Assert.Equal("stale", stale.State);
            Assert.Equal("corrupted", corrupted.State);
            Assert.Equal(runtimeBefore, File.ReadAllText(paths.RuntimeDataPath));
        }
        finally
        {
            if (Directory.Exists(root)) Directory.Delete(root, true);
        }
    }

    [Fact]
    public void RecoveryInventoryListsOnlyCurrentBrokenWorkoutResources()
    {
        var root = Path.Combine(Path.GetTempPath(), "atlament-recovery-test-" + Guid.NewGuid().ToString("N"));
        try
        {
            var service = new RecoveryService(new RecoveryDraftStore(new WindowsPathProvider(root)));
            var configuration = Configuration("data");
            var files = new[]
            {
                Workout("workouts/a.json", "known-gym", "known-machine"),
                new RuntimeSourceFile("workouts/b.json", "{", "broken-revision"),
                Workout("workouts/c.json", "known-gym", "missing-machine")
            };

            var broken = service.ListBrokenResources(configuration, files, MachineMaster, GymMaster);

            var item = Assert.Single(broken);
            Assert.Equal("workouts/b.json", item.Path);
            Assert.Equal("broken", item.Health);
            Assert.Equal("WORKOUT", item.ResourceType);
            Assert.True(item.RecoveryEligible);
            Assert.False(item.HasDraft);
            Assert.NotEmpty(item.ResourceKey);
        }
        finally
        {
            if (Directory.Exists(root)) Directory.Delete(root, true);
        }
    }

    [Fact]
    public void RecoveryResourceKeyResolvesDetailAndRejectsTampering()
    {
        var root = Path.Combine(Path.GetTempPath(), "atlament-recovery-test-" + Guid.NewGuid().ToString("N"));
        try
        {
            var service = new RecoveryService(new RecoveryDraftStore(new WindowsPathProvider(root)));
            var configuration = Configuration("data");
            var files = new[] { new RuntimeSourceFile("workouts/b.json", "{", "broken-revision") };
            var key = Assert.Single(service.ListBrokenResources(configuration, files, MachineMaster, GymMaster)).ResourceKey;

            var (detail, detailErrors) = service.GetDetail(configuration, key, files, MachineMaster, GymMaster);
            var (tampered, tamperedErrors) = service.GetDetail(configuration, key + "x", files, MachineMaster, GymMaster);

            Assert.Empty(detailErrors);
            Assert.NotNull(detail);
            Assert.Equal(key, detail!.ResourceKey);
            Assert.Null(tampered);
            Assert.Contains(tamperedErrors, error => error.Code == AfErrorCodes.RecoveryResourceNotFound);
        }
        finally
        {
            if (Directory.Exists(root)) Directory.Delete(root, true);
        }
    }

    [Fact]
    public void RecoveryReadAndValidateClassifyOldRevisionDraftAsStale()
    {
        var root = Path.Combine(Path.GetTempPath(), "atlament-recovery-test-" + Guid.NewGuid().ToString("N"));
        try
        {
            var service = new RecoveryService(new RecoveryDraftStore(new WindowsPathProvider(root)));
            var configuration = Configuration("data");
            var sourcePath = "workouts/b.json";
            var sourceRevisionA = "source-revision-a";
            var sourceRevisionB = "source-revision-b";
            var sourceA = new RuntimeSourceFile(sourcePath, """
                {
                  "schema_version": 1,
                  "session_id": "stale-draft",
                  "status": "complete",
                  "gym_id": "known-gym",
                  "machines": [
                    {
                      "machine_id": "known-machine",
                      "sets": [
                        { "set": 1, "weight_kg": 20, "reps": 10 }
                      ]
                    }
                  ]
                }
                """, sourceRevisionA);
            var sourceB = new RuntimeSourceFile(sourcePath, """
                {
                  "schema_version": 1,
                  "session_id": "stale-draft",
                  "date": "2026-08-25",
                  "status": "complete",
                  "gym_id": "known-gym",
                  "machines": [
                    {
                      "machine_id": "known-machine",
                      "sets": [
                        { "set": 1, "weight_kg": 20, "reps": 10 }
                      ]
                    }
                  ]
                }
                """, sourceRevisionB);
            var filesA = new[] { sourceA };
            var filesB = new[] { sourceB };
            var oldResourceKey = Assert.Single(service.ListBrokenResources(configuration, filesA, MachineMaster, GymMaster)).ResourceKey;
            var draft = service.CreateDraft(configuration, oldResourceKey, filesA, MachineMaster, GymMaster).Snapshot.Draft!;
            var autosavedFields = draft.Fields
                .Select(field => field["fieldPath"]?.GetValue<string>() == "/date"
                    ? ConfirmedField("/date", JsonValue.Create("2026-08-24"))
                    : field)
                .ToArray();
            Assert.Empty(service.UpdateDraft(configuration, oldResourceKey, new RecoveryDraftUpdate(draft.DraftRevision, autosavedFields), filesA, MachineMaster, GymMaster).Errors);

            var (detail, detailErrors) = service.GetDetail(configuration, oldResourceKey, filesB, MachineMaster, GymMaster);
            var (draftSnapshot, draftErrors) = service.GetDraft(configuration, oldResourceKey, filesB, MachineMaster, GymMaster);
            var (validation, validationErrors) = service.ValidateDraft(configuration, oldResourceKey, filesB, MachineMaster, GymMaster);

            Assert.Empty(detailErrors);
            Assert.NotNull(detail);
            Assert.Equal(sourceRevisionB, detail!.Inspection.Revision);
            Assert.Equal("stale", detail.Draft.State);
            Assert.Equal(sourceRevisionA, detail.Draft.Draft!.SourceRevision);
            Assert.Empty(draftErrors);
            Assert.Equal("stale", draftSnapshot.State);
            Assert.Null(validation);
            Assert.Contains(validationErrors, error => error.Code == AfErrorCodes.RecoveryDraftStale);
            Assert.DoesNotContain(validationErrors, error => error.Code == AfErrorCodes.RecoveryResourceNotFound);
        }
        finally
        {
            if (Directory.Exists(root)) Directory.Delete(root, true);
        }
    }

    [Fact]
    public void RecoverySourceViewIsReadOnlyAndSizeLimited()
    {
        var root = Path.Combine(Path.GetTempPath(), "atlament-recovery-test-" + Guid.NewGuid().ToString("N"));
        try
        {
            var service = new RecoveryService(new RecoveryDraftStore(new WindowsPathProvider(root)));
            var configuration = Configuration("data");
            var files = new[] { new RuntimeSourceFile("workouts/b.json", "{", "small-broken") };
            var key = Assert.Single(service.ListBrokenResources(configuration, files, MachineMaster, GymMaster)).ResourceKey;

            var (source, sourceErrors) = service.GetSource(configuration, key, files, MachineMaster, GymMaster);
            var hugeFiles = new[] { new RuntimeSourceFile("workouts/huge.json", "{" + new string(' ', 270 * 1024), "huge-broken") };
            var hugeKey = Assert.Single(service.ListBrokenResources(configuration, hugeFiles, MachineMaster, GymMaster)).ResourceKey;
            var (hugeSource, hugeErrors) = service.GetSource(configuration, hugeKey, hugeFiles, MachineMaster, GymMaster);

            Assert.Empty(sourceErrors);
            Assert.NotNull(source);
            Assert.True(source!.ReadOnly);
            Assert.Equal("{", source.Content);
            Assert.Null(hugeSource);
            Assert.Contains(hugeErrors, error => error.Code == AfErrorCodes.RecoverySourceViewTooLarge);
        }
        finally
        {
            if (Directory.Exists(root)) Directory.Delete(root, true);
        }
    }

    [Fact]
    public void RecoveryValidationBuildsHealthyReplacementCandidateWithoutGitWrite()
    {
        var root = Path.Combine(Path.GetTempPath(), "atlament-recovery-test-" + Guid.NewGuid().ToString("N"));
        try
        {
            var service = new RecoveryService(new RecoveryDraftStore(new WindowsPathProvider(root)));
            var configuration = Configuration("data");
            var files = new[]
            {
                new RuntimeSourceFile("workouts/b.json", """
                    {
                      "schema_version": 1,
                      "session_id": "candidate",
                      "date": "2026-08-24",
                      "status": "complete",
                      "gym_id": "known-gym",
                      "extra": "do-not-carry"
                    }
                    """, "broken-revision")
            };
            var key = Assert.Single(service.ListBrokenResources(configuration, files, MachineMaster, GymMaster)).ResourceKey;
            var created = service.CreateDraft(configuration, key, files, MachineMaster, GymMaster).Snapshot.Draft!;
            var fields = new[]
            {
                ConfirmedField("/schema_version", JsonValue.Create(1)),
                ConfirmedField("/session_id", JsonValue.Create("candidate")),
                ConfirmedField("/date", JsonValue.Create("2026-08-24")),
                ConfirmedField("/status", JsonValue.Create("complete")),
                ConfirmedField("/gym_id", JsonValue.Create("known-gym")),
                ConfirmedField("/machines", JsonNode.Parse("""[{"machine_id":"known-machine","sets":[{"set":1,"weight_kg":20,"reps":10}]}]""")),
                ConfirmedField("/notes", JsonNode.Parse("[]"))
            };
            Assert.Empty(service.UpdateDraft(configuration, key, new RecoveryDraftUpdate(created.DraftRevision, fields), files, MachineMaster, GymMaster).Errors);

            var (result, errors) = service.ValidateDraft(configuration, key, files, MachineMaster, GymMaster);

            Assert.Empty(errors);
            Assert.NotNull(result);
            Assert.Equal("healthy", result!.Health);
            Assert.True(result.CommitAllowed);
            Assert.Equal("workouts/b.json", result.ReplacementPath);
            Assert.DoesNotContain("do-not-carry", result.ReplacementContent);
            Assert.DoesNotContain("\"condition\"", result.ReplacementContent);
            Assert.Equal("candidate", JsonNode.Parse(result.ReplacementContent!)?["session_id"]?.GetValue<string>());
            Assert.False(Directory.Exists(Path.Combine(root, ".git")));
        }
        finally
        {
            if (Directory.Exists(root)) Directory.Delete(root, true);
        }
    }

    [Fact]
    public void RecoveryReplacementPreservesOptionalAbsenceAndRecoverableWorkoutValues()
    {
        var root = Path.Combine(Path.GetTempPath(), "atlament-recovery-test-" + Guid.NewGuid().ToString("N"));
        try
        {
            var service = new RecoveryService(new RecoveryDraftStore(new WindowsPathProvider(root)));
            var configuration = Configuration("data");
            var sourcePath = "data/workouts/2026/08/2026-08-22.json";
            var brokenSource = """
                {
                  "schema_version": 1,
                  "session_id": "2026-08-22-01",
                  "status": "complete",
                  "gym_id": "known-gym",
                  "machines": [
                    {
                      "machine_id": "known-machine",
                      "sets": [
                        { "set": 1, "weight_kg": 22.5, "reps": 10, "note": "first note" },
                        { "set": 2, "weight_kg": 25, "reps": 8 }
                      ],
                      "notes": ["machine note"]
                    }
                  ],
                  "notes": ["session note"]
                }
                """;
            var files = new[] { new RuntimeSourceFile(sourcePath, brokenSource, ContentRevision(brokenSource)) };
            var key = Assert.Single(service.ListBrokenResources(configuration, files, MachineMaster, GymMaster)).ResourceKey;
            var draft = service.CreateDraft(configuration, key, files, MachineMaster, GymMaster).Snapshot.Draft!;
            var fields = draft.Fields
                .Select(field => field["fieldPath"]?.GetValue<string>() == "/date"
                    ? ConfirmedField("/date", JsonValue.Create("2026-08-22"))
                    : field)
                .ToArray();
            Assert.Empty(service.UpdateDraft(configuration, key, new RecoveryDraftUpdate(draft.DraftRevision, fields), files, MachineMaster, GymMaster).Errors);

            var (result, errors) = service.ValidateDraft(configuration, key, files, MachineMaster, GymMaster);

            Assert.Empty(errors);
            Assert.NotNull(result);
            Assert.Equal("healthy", result!.Health);
            Assert.True(result.CommitAllowed);
            Assert.DoesNotContain("\"condition\"", result.ReplacementContent);
            Assert.DoesNotContain("\\u", result.ReplacementContent);
            Assert.Contains("first note", result.ReplacementContent);
            Assert.Contains("session note", result.ReplacementContent);
            Assert.Contains("\n  \"schema_version\": 1,\n  \"session_id\": \"2026-08-22-01\",\n  \"date\": \"2026-08-22\"", result.ReplacementContent);
            Assert.EndsWith("\n", result.ReplacementContent!, StringComparison.Ordinal);
            Assert.False(result.ReplacementContent!.Contains("\r", StringComparison.Ordinal));
            var build = new RuntimeDataBuilder().Build(
                new[] { new RuntimeSourceFile(result.ReplacementPath, result.ReplacementContent!) },
                MachineMaster,
                GymMaster);
            Assert.Empty(build.Errors);
            var session = Assert.Single(build.Sessions);
            Assert.Equal("2026-08-22-01", session.SessionId);
            Assert.Equal("2026-08-22", session.Date);
            Assert.Equal("complete", session.Status);
            Assert.Equal("known-gym", session.Gym.Id);
            Assert.Null(session.Condition);
            Assert.Equal(new[] { "session note" }, session.Notes);
            var machine = Assert.Single(session.Machines);
            Assert.Equal("known-machine", machine.MachineId);
            Assert.Equal(new[] { "machine note" }, machine.Notes);
            Assert.Collection(machine.Sets,
                set =>
                {
                    Assert.Equal(1, set.Set);
                    Assert.Equal(22.5m, set.WeightKg);
                    Assert.Equal(10, set.Reps);
                    Assert.Equal("first note", set.Note);
                },
                set =>
                {
                    Assert.Equal(2, set.Set);
                    Assert.Equal(25m, set.WeightKg);
                    Assert.Equal(8, set.Reps);
                    Assert.Null(set.Note);
                });
        }
        finally
        {
            if (Directory.Exists(root)) Directory.Delete(root, true);
        }
    }

    [Fact]
    public void RecoveryReplacementSerializesJsonlWithReadableCanonicalObjects()
    {
        var root = Path.Combine(Path.GetTempPath(), "atlament-recovery-test-" + Guid.NewGuid().ToString("N"));
        try
        {
            var service = new RecoveryService(new RecoveryDraftStore(new WindowsPathProvider(root)));
            var configuration = Configuration("data");
            var sourcePath = "data/workouts/2026/08/2026-08-22.jsonl";
            var brokenSource = """
                {"schema_version":1,"session_id":"2026-08-22-01","status":"complete","gym_id":"known-gym","machines":[{"machine_id":"known-machine","sets":[{"set":1,"weight_kg":22.5,"reps":10,"note":"1本目メモ"}]}],"notes":["午前セッション"]}
                {"schema_version":1,"session_id":"2026-08-22-02","date":"2026-08-22","status":"complete","gym_id":"known-gym","machines":[{"machine_id":"known-machine","sets":[{"set":1,"weight_kg":25,"reps":8}]}]}
                """;
            var files = new[] { new RuntimeSourceFile(sourcePath, brokenSource, ContentRevision(brokenSource)) };
            var key = Assert.Single(service.ListBrokenResources(configuration, files, MachineMaster, GymMaster)).ResourceKey;
            var draft = service.CreateDraft(configuration, key, files, MachineMaster, GymMaster).Snapshot.Draft!;
            var fields = draft.Fields
                .Select(field => field["fieldPath"]?.GetValue<string>() == "/sessions/0/date"
                    ? ConfirmedField("/sessions/0/date", JsonValue.Create("2026-08-22"))
                    : field)
                .ToArray();
            Assert.Empty(service.UpdateDraft(configuration, key, new RecoveryDraftUpdate(draft.DraftRevision, fields), files, MachineMaster, GymMaster).Errors);

            var (result, errors) = service.ValidateDraft(configuration, key, files, MachineMaster, GymMaster);

            Assert.Empty(errors);
            Assert.NotNull(result);
            Assert.True(result!.CommitAllowed);
            Assert.DoesNotContain("\\u", result.ReplacementContent);
            Assert.Contains("1本目メモ", result.ReplacementContent);
            Assert.Contains("午前セッション", result.ReplacementContent);
            Assert.Contains("{\"schema_version\":1,\"session_id\":\"2026-08-22-01\",\"date\":\"2026-08-22\",\"status\":\"complete\",\"gym_id\":\"known-gym\"", result.ReplacementContent);
            Assert.Equal(3, result.ReplacementContent!.Split('\n').Length);
            var build = new RuntimeDataBuilder().Build(
                new[] { new RuntimeSourceFile(result.ReplacementPath, result.ReplacementContent) },
                MachineMaster,
                GymMaster);
            Assert.Empty(build.Errors);
            Assert.Equal(new[] { "2026-08-22-01", "2026-08-22-02" }, build.Sessions.Select(session => session.SessionId));
        }
        finally
        {
            if (Directory.Exists(root)) Directory.Delete(root, true);
        }
    }

    [Fact]
    public void RecoveryValidationReturnsSuccessfulBrokenResultForInvalidCandidate()
    {
        var root = Path.Combine(Path.GetTempPath(), "atlament-recovery-test-" + Guid.NewGuid().ToString("N"));
        try
        {
            var service = new RecoveryService(new RecoveryDraftStore(new WindowsPathProvider(root)));
            var configuration = Configuration("data");
            var files = new[] { new RuntimeSourceFile("workouts/b.json", "{", "broken-revision") };
            var key = Assert.Single(service.ListBrokenResources(configuration, files, MachineMaster, GymMaster)).ResourceKey;
            Assert.Empty(service.CreateDraft(configuration, key, files, MachineMaster, GymMaster).Errors);

            var (result, errors) = service.ValidateDraft(configuration, key, files, MachineMaster, GymMaster);

            Assert.Empty(errors);
            Assert.NotNull(result);
            Assert.Equal("broken", result!.Health);
            Assert.False(result.CommitAllowed);
            Assert.Null(result.ReplacementContent);
            Assert.Contains(result.Issues, issue => issue.Code == "RECOVERY_FIELD_UNRESOLVED");
        }
        finally
        {
            if (Directory.Exists(root)) Directory.Delete(root, true);
        }
    }

    [Fact]
    public void RecoveryFallbackDoesNotRequireOptionalConditionOrNotes()
    {
        var root = Path.Combine(Path.GetTempPath(), "atlament-recovery-test-" + Guid.NewGuid().ToString("N"));
        try
        {
            var service = new RecoveryService(new RecoveryDraftStore(new WindowsPathProvider(root)));
            var configuration = Configuration("data");
            var files = new[] { new RuntimeSourceFile("workouts/b.json", "{", "broken-revision") };
            var key = Assert.Single(service.ListBrokenResources(configuration, files, MachineMaster, GymMaster)).ResourceKey;
            var created = service.CreateDraft(configuration, key, files, MachineMaster, GymMaster).Snapshot.Draft!;
            Assert.Contains(created.Fields, field =>
                field["fieldPath"]?.GetValue<string>() == "/condition" &&
                field["state"]?.GetValue<string>() == "recovered" &&
                !field.ContainsKey("value"));
            Assert.Contains(created.Fields, field =>
                field["fieldPath"]?.GetValue<string>() == "/notes" &&
                field["state"]?.GetValue<string>() == "recovered" &&
                !field.ContainsKey("value"));
            Assert.DoesNotContain(created.Fields, field =>
                field["fieldPath"]?.GetValue<string>() is "/condition" or "/notes" &&
                field["state"]?.GetValue<string>() == "unresolved");
            var fields = new[]
            {
                ConfirmedField("/schema_version", JsonValue.Create(1)),
                ConfirmedField("/session_id", JsonValue.Create("fallback-required-only")),
                ConfirmedField("/date", JsonValue.Create("2026-08-24")),
                ConfirmedField("/status", JsonValue.Create("complete")),
                ConfirmedField("/gym_id", JsonValue.Create("known-gym")),
                ConfirmedField("/machines", JsonNode.Parse("""[{"machine_id":"known-machine","sets":[{"set":1,"weight_kg":20,"reps":10}]}]"""))
            };
            Assert.Empty(service.UpdateDraft(configuration, key, new RecoveryDraftUpdate(created.DraftRevision, fields), files, MachineMaster, GymMaster).Errors);

            var (result, errors) = service.ValidateDraft(configuration, key, files, MachineMaster, GymMaster);

            Assert.Empty(errors);
            Assert.NotNull(result);
            Assert.Equal("healthy", result!.Health);
            Assert.True(result.CommitAllowed);
            Assert.DoesNotContain("\"condition\"", result.ReplacementContent);
            Assert.DoesNotContain("\"notes\"", result.ReplacementContent);
        }
        finally
        {
            if (Directory.Exists(root)) Directory.Delete(root, true);
        }
    }

    [Fact]
    public void RecoveryValidationAllowsDegradedCandidateButBlocksDuplicateSession()
    {
        var root = Path.Combine(Path.GetTempPath(), "atlament-recovery-test-" + Guid.NewGuid().ToString("N"));
        try
        {
            var service = new RecoveryService(new RecoveryDraftStore(new WindowsPathProvider(root)));
            var configuration = Configuration("data");
            var files = new[]
            {
                new RuntimeSourceFile("workouts/b.json", "{", "broken-revision"),
                Workout("workouts/other.json", "known-gym", "known-machine")
            };
            var key = Assert.Single(service.ListBrokenResources(configuration, files, MachineMaster, GymMaster)).ResourceKey;
            var created = service.CreateDraft(configuration, key, files, MachineMaster, GymMaster).Snapshot.Draft!;
            var fields = new[]
            {
                ConfirmedField("/schema_version", JsonValue.Create(1)),
                ConfirmedField("/session_id", JsonValue.Create("unique")),
                ConfirmedField("/date", JsonValue.Create("2026-08-24")),
                ConfirmedField("/status", JsonValue.Create("complete")),
                ConfirmedField("/gym_id", JsonValue.Create("known-gym")),
                ConfirmedField("/machines", JsonNode.Parse("""[{"machine_id":"missing-machine","sets":[{"set":1,"weight_kg":20,"reps":10}]}]""")),
                ConfirmedField("/notes", JsonNode.Parse("[]"))
            };
            var degradedDraft = service.UpdateDraft(configuration, key, new RecoveryDraftUpdate(created.DraftRevision, fields), files, MachineMaster, GymMaster).Snapshot.Draft!;
            var (degraded, degradedErrors) = service.ValidateDraft(configuration, key, files, MachineMaster, GymMaster);

            fields[1] = ConfirmedField("/session_id", JsonValue.Create("other"));
            Assert.Empty(service.UpdateDraft(configuration, key, new RecoveryDraftUpdate(degradedDraft.DraftRevision, fields), files, MachineMaster, GymMaster).Errors);
            var (duplicate, duplicateErrors) = service.ValidateDraft(configuration, key, files, MachineMaster, GymMaster);

            Assert.Empty(degradedErrors);
            Assert.NotNull(degraded);
            Assert.Equal("degraded", degraded!.Health);
            Assert.True(degraded.CommitAllowed);
            Assert.Empty(duplicateErrors);
            Assert.NotNull(duplicate);
            Assert.Equal("broken", duplicate!.Health);
            Assert.False(duplicate.CommitAllowed);
            Assert.Contains(duplicate.Issues, issue => issue.Code == "RECOVERY_DUPLICATE_SESSION_ID");
        }
        finally
        {
            if (Directory.Exists(root)) Directory.Delete(root, true);
        }
    }

    [Fact]
    public async Task RecoveryCommitReflectsCommittedRevisionWhenBranchRawIsStale()
    {
        var root = Path.Combine(Path.GetTempPath(), "atlament-recovery-commit-test-" + Guid.NewGuid().ToString("N"));
        try
        {
            var paths = new WindowsPathProvider(root);
            var configuration = Configuration("data");
            Assert.Empty(new ConfigurationStore(paths).Save(configuration));
            Assert.Equal("available", new CredentialStore(paths).Save(new CredentialUpdate("token", "2026-12-31")).State);

            var sourcePath = "data/workouts/2026/08/2026-08-24.json";
            var brokenSource = """
                {
                  "schema_version": 1,
                  "session_id": "recover-me",
                  "date": "2026-08-24",
                  "status": "complete",
                  "gym_id": "known-gym"
                }
                """;
            var remoteWorkoutContent = brokenSource;
            var recoveryStore = new RecoveryDraftStore(paths);
            var recovery = new RecoveryService(recoveryStore);
            var preFiles = new[] { new RuntimeSourceFile(sourcePath, brokenSource, ContentRevision(brokenSource)) };
            var resourceKey = Assert.Single(recovery.ListBrokenResources(configuration, preFiles, MachineMaster, GymMaster)).ResourceKey;
            var draft = recovery.CreateDraft(configuration, resourceKey, preFiles, MachineMaster, GymMaster).Snapshot.Draft!;
            var fields = new[]
            {
                ConfirmedField("/schema_version", JsonValue.Create(1)),
                ConfirmedField("/session_id", JsonValue.Create("recover-me")),
                ConfirmedField("/date", JsonValue.Create("2026-08-24")),
                ConfirmedField("/status", JsonValue.Create("complete")),
                ConfirmedField("/gym_id", JsonValue.Create("known-gym")),
                ConfirmedField("/machines", JsonNode.Parse("""[{"machine_id":"known-machine","sets":[{"set":1,"weight_kg":20,"reps":10}]}]""")),
                ConfirmedField("/notes", JsonNode.Parse("[]"))
            };
            draft = recovery.UpdateDraft(configuration, resourceKey, new RecoveryDraftUpdate(draft.DraftRevision, fields), preFiles, MachineMaster, GymMaster).Snapshot.Draft!;
            var putCount = 0;
            var http = new RecordingAsyncHttpMessageHandler(async request =>
            {
                var url = request.RequestUri?.AbsoluteUri ?? "";
                if (request.Method == HttpMethod.Get && url.Contains("/contents/data/workouts?ref=master", StringComparison.Ordinal))
                {
                    return JsonResponse($$"""[{ "path": "{{sourcePath}}", "type": "file" }]""");
                }

                if (request.Method == HttpMethod.Get && url.Contains("/contents/data/workouts?ref=recovery-commit-sha", StringComparison.Ordinal))
                {
                    return JsonResponse($$"""[{ "path": "{{sourcePath}}", "type": "file" }]""");
                }

                if (request.Method == HttpMethod.Get && url.Contains("/contents/data/master/machines.json?ref=master", StringComparison.Ordinal))
                {
                    return JsonResponse($$"""{ "sha": "machine-sha", "content": "{{EncodeContent(MachineMaster.Content)}}" }""");
                }

                if (request.Method == HttpMethod.Get && url.Contains("/contents/data/master/machines.json?ref=recovery-commit-sha", StringComparison.Ordinal))
                {
                    return JsonResponse($$"""{ "sha": "machine-sha", "content": "{{EncodeContent(MachineMaster.Content)}}" }""");
                }

                if (request.Method == HttpMethod.Get && url.Contains("/contents/data/master/gyms.json?ref=master", StringComparison.Ordinal))
                {
                    return JsonResponse($$"""{ "sha": "gym-sha", "content": "{{EncodeContent(GymMaster.Content)}}" }""");
                }

                if (request.Method == HttpMethod.Get && url.Contains("/contents/data/master/gyms.json?ref=recovery-commit-sha", StringComparison.Ordinal))
                {
                    return JsonResponse($$"""{ "sha": "gym-sha", "content": "{{EncodeContent(GymMaster.Content)}}" }""");
                }

                if (request.Method == HttpMethod.Get && url.Contains("/contents/data/workouts/2026/08/2026-08-24.json?ref=master", StringComparison.Ordinal))
                {
                    return JsonResponse($$"""{ "sha": "source-blob-sha", "content": "{{EncodeContent(remoteWorkoutContent)}}" }""");
                }

                if (request.Method == HttpMethod.Put && url.Contains("/contents/data/workouts/2026/08/2026-08-24.json", StringComparison.Ordinal))
                {
                    putCount++;
                    var body = JsonNode.Parse(await request.Content!.ReadAsStringAsync())!;
                    remoteWorkoutContent = Encoding.UTF8.GetString(Convert.FromBase64String(body["content"]!.GetValue<string>()));
                    return JsonResponse("""{ "content": { "sha": "replacement-blob-sha" }, "commit": { "sha": "recovery-commit-sha" } }""");
                }

                if (request.Method == HttpMethod.Get && url.Contains("/contents/data/workouts/2026/08/2026-08-24.json?ref=master", StringComparison.Ordinal))
                {
                    return JsonResponse($$"""{ "sha": "source-blob-sha", "content": "{{EncodeContent(brokenSource)}}" }""");
                }

                if (request.Method == HttpMethod.Get && url.Contains("/contents/data/workouts/2026/08/2026-08-24.json?ref=recovery-commit-sha", StringComparison.Ordinal))
                {
                    return JsonResponse($$"""{ "sha": "replacement-blob-sha", "content": "{{EncodeContent(remoteWorkoutContent)}}" }""");
                }

                if (request.Method == HttpMethod.Get && url.Contains("/contents/data/master/machines.json?ref=recovery-commit-sha", StringComparison.Ordinal))
                {
                    return JsonResponse($$"""{ "sha": "machine-sha", "content": "{{EncodeContent(MachineMaster.Content)}}" }""");
                }

                if (request.Method == HttpMethod.Get && url.Contains("/contents/data/master/gyms.json?ref=recovery-commit-sha", StringComparison.Ordinal))
                {
                    return JsonResponse($$"""{ "sha": "gym-sha", "content": "{{EncodeContent(GymMaster.Content)}}" }""");
                }

                return new HttpResponseMessage(HttpStatusCode.NotFound);
            });
            var application = new AtlamentApplication(
                new ConfigurationStore(paths),
                new CredentialStore(paths),
                new RuntimeDataStore(paths),
                new RuntimeDataBuilder(),
                new GithubAccessService(new HttpClient(http)),
                new HostingStatusService(paths),
                new AfLog(paths),
                recovery);

            var commit = await application.CommitRecoveryDraftAsync(
                resourceKey,
                new RecoveryCommitRequest(ContentRevision(brokenSource), draft.DraftRevision),
                CancellationToken.None);

            Assert.Equal(200, commit.StatusCode);
            Assert.True(commit.Response.Success);
            Assert.True(commit.Response.Data!.Committed);
            Assert.True(commit.Response.Data.Reflection.Succeeded);
            Assert.Equal("healthy", commit.Response.Data.Reflection.Health);
            Assert.Equal(1, putCount);
            Assert.Equal("none", recovery.LoadDraft(configuration, "WORKOUT", sourcePath, ContentRevision(brokenSource)).State);
            var (runtime, runtimeErrors) = new RuntimeDataStore(paths).LoadCurrent();
            Assert.Empty(runtimeErrors);
            Assert.Equal("recover-me", Assert.Single(runtime!.Sessions).SessionId);
            var inventory = await application.ListRecoveryResourcesAsync(CancellationToken.None);
            Assert.Equal(200, inventory.StatusCode);
            Assert.Empty(inventory.Response.Data!);
            Assert.DoesNotContain(http.RequestedUrls, url => url.Contains("raw.githubusercontent.com", StringComparison.Ordinal));
        }
        finally
        {
            Microsoft.Data.Sqlite.SqliteConnection.ClearAllPools();
            if (Directory.Exists(root)) Directory.Delete(root, true);
        }
    }

    [Fact]
    public async Task RecoveryCommitReturnsWriteConflictWhenSourceRevisionAdvancedAfterValidation()
    {
        var root = Path.Combine(Path.GetTempPath(), "atlament-recovery-commit-test-" + Guid.NewGuid().ToString("N"));
        try
        {
            var paths = new WindowsPathProvider(root);
            var configuration = Configuration("data");
            Assert.Empty(new ConfigurationStore(paths).Save(configuration));
            Assert.Equal("available", new CredentialStore(paths).Save(new CredentialUpdate("token", "2026-12-31")).State);
            var sourcePath = "data/workouts/2026/08/2026-08-24.json";
            var brokenSource = """
                {
                  "schema_version": 1,
                  "session_id": "recover-me",
                  "status": "complete",
                  "gym_id": "known-gym",
                  "machines": [
                    {
                      "machine_id": "known-machine",
                      "sets": [
                        { "set": 1, "weight_kg": 20, "reps": 10 }
                      ]
                    }
                  ]
                }
                """;
            var remoteUpdatedSource = """
                {
                  "schema_version": 1,
                  "session_id": "recover-me",
                  "date": "2026-08-25",
                  "status": "complete",
                  "gym_id": "known-gym",
                  "machines": [
                    {
                      "machine_id": "known-machine",
                      "sets": [
                        { "set": 1, "weight_kg": 20, "reps": 10 }
                      ]
                    }
                  ]
                }
                """;
            var recovery = new RecoveryService(new RecoveryDraftStore(paths));
            var preFiles = new[] { new RuntimeSourceFile(sourcePath, brokenSource, ContentRevision(brokenSource)) };
            var resourceKey = Assert.Single(recovery.ListBrokenResources(configuration, preFiles, MachineMaster, GymMaster)).ResourceKey;
            var draft = recovery.CreateDraft(configuration, resourceKey, preFiles, MachineMaster, GymMaster).Snapshot.Draft!;
            var fields = draft.Fields
                .Select(field => field["fieldPath"]?.GetValue<string>() == "/date"
                    ? ConfirmedField("/date", JsonValue.Create("2026-08-24"))
                    : field)
                .ToArray();
            Assert.Empty(recovery.UpdateDraft(configuration, resourceKey, new RecoveryDraftUpdate(draft.DraftRevision, fields), preFiles, MachineMaster, GymMaster).Errors);
            Assert.True(recovery.ValidateDraft(configuration, resourceKey, preFiles, MachineMaster, GymMaster).Result!.CommitAllowed);

            var putCount = 0;
            var http = new RecordingHttpMessageHandler(request =>
            {
                var url = request.RequestUri?.AbsoluteUri ?? "";
                if (request.Method == HttpMethod.Get && url.Contains("/contents/data/workouts?ref=master", StringComparison.Ordinal))
                {
                    return JsonResponse($$"""[{ "path": "{{sourcePath}}", "type": "file" }]""");
                }

                if (request.Method == HttpMethod.Get && url.Contains("/contents/data/workouts/2026/08/2026-08-24.json?ref=master", StringComparison.Ordinal))
                {
                    return JsonResponse($$"""{ "sha": "updated-source-blob-sha", "content": "{{EncodeContent(remoteUpdatedSource)}}" }""");
                }

                if (request.Method == HttpMethod.Get && url.Contains("/contents/data/master/machines.json", StringComparison.Ordinal))
                {
                    return JsonResponse($$"""{ "sha": "machine-sha", "content": "{{EncodeContent(MachineMaster.Content)}}" }""");
                }

                if (request.Method == HttpMethod.Get && url.Contains("/contents/data/master/gyms.json", StringComparison.Ordinal))
                {
                    return JsonResponse($$"""{ "sha": "gym-sha", "content": "{{EncodeContent(GymMaster.Content)}}" }""");
                }

                if (request.Method == HttpMethod.Put)
                {
                    putCount++;
                }

                return new HttpResponseMessage(HttpStatusCode.NotFound);
            });
            var application = new AtlamentApplication(
                new ConfigurationStore(paths),
                new CredentialStore(paths),
                new RuntimeDataStore(paths),
                new RuntimeDataBuilder(),
                new GithubAccessService(new HttpClient(http)),
                new HostingStatusService(paths),
                new AfLog(paths),
                recovery);

            var commit = await application.CommitRecoveryDraftAsync(
                resourceKey,
                new RecoveryCommitRequest(ContentRevision(brokenSource), draft.DraftRevision + 1),
                CancellationToken.None);

            Assert.Equal(409, commit.StatusCode);
            Assert.False(commit.Response.Success);
            Assert.Contains(commit.Response.Errors, error => error.Code == AfErrorCodes.RecoveryWriteConflict);
            Assert.Equal(0, putCount);
            Assert.Equal("stale", recovery.LoadDraft(configuration, "WORKOUT", sourcePath, ContentRevision(remoteUpdatedSource)).State);
        }
        finally
        {
            Microsoft.Data.Sqlite.SqliteConnection.ClearAllPools();
            if (Directory.Exists(root)) Directory.Delete(root, true);
        }
    }

    [Fact]
    public async Task RecoveryCommitRejectsInvalidCandidateWithoutGitWrite()
    {
        var root = Path.Combine(Path.GetTempPath(), "atlament-recovery-commit-test-" + Guid.NewGuid().ToString("N"));
        try
        {
            var paths = new WindowsPathProvider(root);
            var configuration = Configuration("data");
            Assert.Empty(new ConfigurationStore(paths).Save(configuration));
            Assert.Equal("available", new CredentialStore(paths).Save(new CredentialUpdate("token", "2026-12-31")).State);
            var sourcePath = "data/workouts/2026/08/2026-08-24.json";
            var brokenSource = "{";
            var recovery = new RecoveryService(new RecoveryDraftStore(paths));
            var preFiles = new[] { new RuntimeSourceFile(sourcePath, brokenSource, ContentRevision(brokenSource)) };
            var resourceKey = Assert.Single(recovery.ListBrokenResources(configuration, preFiles, MachineMaster, GymMaster)).ResourceKey;
            var draft = recovery.CreateDraft(configuration, resourceKey, preFiles, MachineMaster, GymMaster).Snapshot.Draft!;
            var http = new RecordingHttpMessageHandler(request =>
            {
                var url = request.RequestUri?.AbsoluteUri ?? "";
                if (request.Method == HttpMethod.Get && url.Contains("/contents/data/workouts?ref=master", StringComparison.Ordinal))
                {
                    return JsonResponse($$"""[{ "path": "{{sourcePath}}", "type": "file" }]""");
                }

                if (request.Method == HttpMethod.Get && url.Contains("/contents/data/workouts/2026/08/2026-08-24.json?ref=master", StringComparison.Ordinal))
                {
                    return JsonResponse($$"""{ "sha": "source-blob-sha", "content": "{{EncodeContent(brokenSource)}}" }""");
                }

                if (request.Method == HttpMethod.Get && url.Contains("/contents/data/master/machines.json", StringComparison.Ordinal))
                {
                    return JsonResponse($$"""{ "sha": "machine-sha", "content": "{{EncodeContent(MachineMaster.Content)}}" }""");
                }

                if (request.Method == HttpMethod.Get && url.Contains("/contents/data/master/gyms.json", StringComparison.Ordinal))
                {
                    return JsonResponse($$"""{ "sha": "gym-sha", "content": "{{EncodeContent(GymMaster.Content)}}" }""");
                }

                return new HttpResponseMessage(HttpStatusCode.NotFound);
            });
            var application = new AtlamentApplication(
                new ConfigurationStore(paths),
                new CredentialStore(paths),
                new RuntimeDataStore(paths),
                new RuntimeDataBuilder(),
                new GithubAccessService(new HttpClient(http)),
                new HostingStatusService(paths),
                new AfLog(paths),
                recovery);

            var conflict = await application.CommitRecoveryDraftAsync(
                resourceKey,
                new RecoveryCommitRequest(ContentRevision(brokenSource), draft.DraftRevision + 1),
                CancellationToken.None);
            var commit = await application.CommitRecoveryDraftAsync(
                resourceKey,
                new RecoveryCommitRequest(ContentRevision(brokenSource), draft.DraftRevision),
                CancellationToken.None);

            Assert.Equal(409, conflict.StatusCode);
            Assert.Contains(conflict.Response.Errors, error => error.Code == AfErrorCodes.RecoveryDraftConflict);
            Assert.Equal(409, commit.StatusCode);
            Assert.False(commit.Response.Success);
            Assert.Contains(commit.Response.Errors, error => error.Code == AfErrorCodes.RecoveryValidationFailed);
            Assert.DoesNotContain(http.RequestedUrls, url => url.Contains("/contents/data/workouts/2026/08/2026-08-24.json") && !url.Contains("?ref=master"));
        }
        finally
        {
            Microsoft.Data.Sqlite.SqliteConnection.ClearAllPools();
            if (Directory.Exists(root)) Directory.Delete(root, true);
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
            File.WriteAllText(Path.Combine(workoutsRoot, "detail.html"), "<html></html>");
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
            Assert.Equal(Path.Combine(paths.FrontendArtifactRoot, "workouts", "detail.html"), workoutRouteFile?.PhysicalPath);
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

            if (url.Contains("/contents/data/workouts/2026/08/2026-08-24.json?ref=master", StringComparison.Ordinal))
            {
                return JsonResponse($$"""{ "sha": "workout-sha", "content": "{{EncodeContent("{}")}}" }""");
            }

            if (url.Contains("/contents/data/master/machines.json?ref=master", StringComparison.Ordinal) ||
                url.Contains("/contents/data/master/gyms.json?ref=master", StringComparison.Ordinal))
            {
                return JsonResponse($$"""{ "sha": "master-sha", "content": "{{EncodeContent("{}")}}" }""");
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
        Assert.Contains(http.RequestedUrls, url => url.Contains("/contents/data/workouts/2026/08/2026-08-24.json?ref=master", StringComparison.Ordinal));
        Assert.DoesNotContain(http.RequestedUrls, url => url.Contains("raw.githubusercontent.com", StringComparison.Ordinal));
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

            if (url.Contains("/contents/workouts/2026/08/2026-08-24.json?ref=master", StringComparison.Ordinal))
            {
                return JsonResponse($$"""{ "sha": "workout-sha", "content": "{{EncodeContent("{}")}}" }""");
            }

            if (url.Contains("/contents/master/machines.json?ref=master", StringComparison.Ordinal) ||
                url.Contains("/contents/master/gyms.json?ref=master", StringComparison.Ordinal))
            {
                return JsonResponse($$"""{ "sha": "master-sha", "content": "{{EncodeContent("{}")}}" }""");
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
    public async Task GithubAccessAllowsMissingWorkoutDirectoryAndReportsMissingRequiredMaster()
    {
        var service = new GithubAccessService(new HttpClient(new RecordingHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.NotFound))));

        var (_, errors) = await service.FetchAsync(Configuration("data"), "token", CancellationToken.None);

        var error = Assert.Single(errors);
        Assert.Equal(AfErrorCodes.GithubResourceNotFound, error.Code);
        Assert.Contains("data/master/machines.json", error.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task RecoveryGitWriteReplacesSamePathWithExpectedRemoteRevision()
    {
        var sourceContent = "{";
        var replacementContent = Workout("data/workouts/2026/08/2026-08-24.json", "known-gym", "known-machine").Content;
        string? writeBody = null;
        var http = new RecordingAsyncHttpMessageHandler(async request =>
        {
            var url = request.RequestUri?.AbsoluteUri ?? "";
            if (request.Method == HttpMethod.Get && url.Contains("/contents/data/workouts/2026/08/2026-08-24.json?ref=master", StringComparison.Ordinal))
            {
                return JsonResponse($$"""
                    {
                      "sha": "source-blob-sha",
                      "content": "{{EncodeContent(sourceContent)}}"
                    }
                    """);
            }

            if (request.Method == HttpMethod.Put && url.Contains("/contents/data/workouts/2026/08/2026-08-24.json", StringComparison.Ordinal))
            {
                writeBody = await request.Content!.ReadAsStringAsync();
                return JsonResponse("""
                    {
                      "content": { "sha": "replacement-blob-sha" },
                      "commit": { "sha": "commit-sha" }
                    }
                    """);
            }

            return new HttpResponseMessage(HttpStatusCode.NotFound);
        });
        var github = new GithubAccessService(new HttpClient(http));

        var result = await github.PushRecoveryReplacementAsync(
            Configuration("data"),
            "token",
            "data/workouts/2026/08/2026-08-24.json",
            ContentRevision(sourceContent),
            "data/workouts/2026/08/2026-08-24.json",
            replacementContent,
            CancellationToken.None);

        Assert.Empty(result.Errors);
        Assert.NotNull(result.Result);
        Assert.Equal(ContentRevision(replacementContent), result.Result!.ReplacementRevision);
        Assert.Equal("commit-sha", result.Result.CommitRevision);
        Assert.NotNull(writeBody);
        var writeJson = JsonNode.Parse(writeBody!)!;
        Assert.Equal("source-blob-sha", writeJson["sha"]?.GetValue<string>());
        Assert.Equal("Recover workout resource", writeJson["message"]?.GetValue<string>());
        Assert.DoesNotContain("data/workouts/2026/08/2026-08-24.json", writeBody, StringComparison.Ordinal);
    }

    [Fact]
    public async Task RecoveryGitWriteRejectsSourceRevisionConflictBeforeWrite()
    {
        var http = new RecordingHttpMessageHandler(request =>
        {
            var url = request.RequestUri?.AbsoluteUri ?? "";
            if (request.Method == HttpMethod.Get && url.Contains("/contents/data/workouts/2026/08/2026-08-24.json?ref=master", StringComparison.Ordinal))
            {
                return JsonResponse($$"""
                    {
                      "sha": "source-blob-sha",
                      "content": "{{EncodeContent("{}")}}"
                    }
                    """);
            }

            return new HttpResponseMessage(HttpStatusCode.OK);
        });
        var github = new GithubAccessService(new HttpClient(http));

        var result = await github.PushRecoveryReplacementAsync(
            Configuration("data"),
            "token",
            "data/workouts/2026/08/2026-08-24.json",
            ContentRevision("{"),
            "data/workouts/2026/08/2026-08-24.json",
            "{}",
            CancellationToken.None);

        Assert.Null(result.Result);
        Assert.Contains(result.Errors, error => error.Code == AfErrorCodes.RecoveryWriteConflict);
        Assert.DoesNotContain(http.RequestedUrls, url => url.Contains("/contents/data/workouts/2026/08/2026-08-24.json") && !url.Contains("?ref=master"));
    }

    [Fact]
    public async Task RecoveryGitWriteRelocatesWithSingleAtomicGitDataCommit()
    {
        var sourceContent = "{";
        var replacementContent = Workout("data/workouts/2026/08/2026-08-25.json", "known-gym", "known-machine").Content;
        var treeBodies = new List<string>();
        var http = new RecordingAsyncHttpMessageHandler(async request =>
        {
            var url = request.RequestUri?.AbsoluteUri ?? "";
            if (request.Method == HttpMethod.Get && url.Contains("/contents/data/workouts/2026/08/2026-08-24.json?ref=master", StringComparison.Ordinal))
            {
                return JsonResponse($$"""
                    {
                      "sha": "source-blob-sha",
                      "content": "{{EncodeContent(sourceContent)}}"
                    }
                    """);
            }

            if (request.Method == HttpMethod.Get && url.Contains("/contents/data/workouts/2026/08/2026-08-25.json?ref=master", StringComparison.Ordinal))
            {
                return new HttpResponseMessage(HttpStatusCode.NotFound);
            }

            if (request.Method == HttpMethod.Get && url.Contains("/git/ref/heads/master", StringComparison.Ordinal))
            {
                return JsonResponse("""{ "object": { "sha": "head-sha" } }""");
            }

            if (request.Method == HttpMethod.Get && url.Contains("/git/commits/head-sha", StringComparison.Ordinal))
            {
                return JsonResponse("""{ "tree": { "sha": "base-tree-sha" } }""");
            }

            if (request.Method == HttpMethod.Post && url.EndsWith("/git/blobs", StringComparison.Ordinal))
            {
                return JsonResponse("""{ "sha": "replacement-blob-sha" }""");
            }

            if (request.Method == HttpMethod.Post && url.EndsWith("/git/trees", StringComparison.Ordinal))
            {
                treeBodies.Add(await request.Content!.ReadAsStringAsync());
                return JsonResponse("""{ "sha": "replacement-tree-sha" }""");
            }

            if (request.Method == HttpMethod.Post && url.EndsWith("/git/commits", StringComparison.Ordinal))
            {
                var body = await request.Content!.ReadAsStringAsync();
                var json = JsonNode.Parse(body)!;
                Assert.Equal("head-sha", json["parents"]!.AsArray().Single()!.GetValue<string>());
                return JsonResponse("""{ "sha": "recovery-commit-sha" }""");
            }

            if (request.Method.Method == "PATCH" && url.Contains("/git/refs/heads/master", StringComparison.Ordinal))
            {
                var body = await request.Content!.ReadAsStringAsync();
                var json = JsonNode.Parse(body)!;
                Assert.False(json["force"]!.GetValue<bool>());
                Assert.Equal("recovery-commit-sha", json["sha"]?.GetValue<string>());
                return JsonResponse("""{ "object": { "sha": "recovery-commit-sha" } }""");
            }

            return new HttpResponseMessage(HttpStatusCode.NotFound);
        });
        var github = new GithubAccessService(new HttpClient(http));

        var result = await github.PushRecoveryReplacementAsync(
            Configuration("data"),
            "token",
            "data/workouts/2026/08/2026-08-24.json",
            ContentRevision(sourceContent),
            "data/workouts/2026/08/2026-08-25.json",
            replacementContent,
            CancellationToken.None);

        Assert.Empty(result.Errors);
        Assert.Equal("recovery-commit-sha", result.Result?.CommitRevision);
        var treeBody = Assert.Single(treeBodies);
        var treeJson = JsonNode.Parse(treeBody)!;
        Assert.Equal("base-tree-sha", treeJson["base_tree"]?.GetValue<string>());
        var entries = treeJson["tree"]!.AsArray();
        Assert.Contains(entries, entry => entry?["path"]?.GetValue<string>() == "data/workouts/2026/08/2026-08-25.json" && entry["sha"]?.GetValue<string>() == "replacement-blob-sha");
        Assert.Contains(entries, entry => entry?["path"]?.GetValue<string>() == "data/workouts/2026/08/2026-08-24.json" && entry["sha"] is null);
        Assert.DoesNotContain(http.RequestedUrls, url => url.Contains("/contents/data/workouts/2026/08/2026-08-24.json") && !url.Contains("?ref=master"));
    }

    [Fact]
    public async Task RecoveryGitWriteRejectsRelocationDestinationConflict()
    {
        var sourceContent = "{";
        var http = new RecordingHttpMessageHandler(request =>
        {
            var url = request.RequestUri?.AbsoluteUri ?? "";
            if (request.Method == HttpMethod.Get && url.Contains("/contents/data/workouts/2026/08/2026-08-24.json?ref=master", StringComparison.Ordinal))
            {
                return JsonResponse($$"""
                    {
                      "sha": "source-blob-sha",
                      "content": "{{EncodeContent(sourceContent)}}"
                    }
                    """);
            }

            if (request.Method == HttpMethod.Get && url.Contains("/contents/data/workouts/2026/08/2026-08-25.json?ref=master", StringComparison.Ordinal))
            {
                return JsonResponse($$"""
                    {
                      "sha": "destination-blob-sha",
                      "content": "{{EncodeContent("{}")}}"
                    }
                    """);
            }

            return new HttpResponseMessage(HttpStatusCode.NotFound);
        });
        var github = new GithubAccessService(new HttpClient(http));

        var result = await github.PushRecoveryReplacementAsync(
            Configuration("data"),
            "token",
            "data/workouts/2026/08/2026-08-24.json",
            ContentRevision(sourceContent),
            "data/workouts/2026/08/2026-08-25.json",
            "{}",
            CancellationToken.None);

        Assert.Null(result.Result);
        Assert.Contains(result.Errors, error => error.Code == AfErrorCodes.RecoveryWriteConflict);
        Assert.DoesNotContain(http.RequestedUrls, url => url.Contains("/git/blobs", StringComparison.Ordinal));
    }

    [Fact]
    public async Task RecoveryGitWriteReconcilesAmbiguousSamePathTimeoutWithoutBlindRetry()
    {
        var sourceContent = "{";
        var replacementContent = Workout("data/workouts/2026/08/2026-08-24.json", "known-gym", "known-machine").Content;
        var sourceReads = 0;
        var putAttempts = 0;
        var http = new RecordingHttpMessageHandler(request =>
        {
            var url = request.RequestUri?.AbsoluteUri ?? "";
            if (request.Method == HttpMethod.Get && url.Contains("/contents/data/workouts/2026/08/2026-08-24.json?ref=master", StringComparison.Ordinal))
            {
                sourceReads++;
                var content = sourceReads == 1 ? sourceContent : replacementContent;
                return JsonResponse($$"""
                    {
                      "sha": "blob-sha",
                      "content": "{{EncodeContent(content)}}"
                    }
                    """);
            }

            if (request.Method == HttpMethod.Put && url.Contains("/contents/data/workouts/2026/08/2026-08-24.json", StringComparison.Ordinal))
            {
                putAttempts++;
                throw new OperationCanceledException();
            }

            if (request.Method == HttpMethod.Get && url.Contains("/git/ref/heads/master", StringComparison.Ordinal))
            {
                return JsonResponse("""{ "object": { "sha": "reconciled-head-sha" } }""");
            }

            return new HttpResponseMessage(HttpStatusCode.NotFound);
        });
        var github = new GithubAccessService(new HttpClient(http));

        var result = await github.PushRecoveryReplacementAsync(
            Configuration("data"),
            "token",
            "data/workouts/2026/08/2026-08-24.json",
            ContentRevision(sourceContent),
            "data/workouts/2026/08/2026-08-24.json",
            replacementContent,
            CancellationToken.None);

        Assert.Empty(result.Errors);
        Assert.Equal("reconciled-head-sha", result.Result?.CommitRevision);
        Assert.Equal(1, putAttempts);
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
    public void LocalhostEndpointPolicyKeepsPrimaryAndSecondaryPortOrder()
    {
        Assert.Equal(new[] { 14108, 45194 }, LocalhostEndpointPolicy.Ports);
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
            Assert.Equal(0, status.Data.RuntimeData.QuarantinedWorkoutResourceCount);
            Assert.Equal(0, status.Data.Recovery.BrokenResourceCount);
            Assert.Equal(0, status.Data.Recovery.BrokenWorkoutResourceCount);
            Assert.Equal(0, status.Data.Recovery.BrokenMasterResourceCount);
            Assert.Equal(0, status.Data.Recovery.RecoverableResourceCount);
            Assert.Equal(0, status.Data.Recovery.ActiveDraftCount);
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

                if (url.Contains("/contents/data/workouts/2026-08-24.json?ref=master", StringComparison.Ordinal))
                {
                    var workout = Workout("workouts/2026-08-24.json", "known-gym", "known-machine").Content;
                    return JsonResponse($$"""{ "sha": "workout-sha", "content": "{{EncodeContent(workout)}}" }""");
                }

                if (url.Contains("/contents/data/master/machines.json", StringComparison.Ordinal))
                {
                    return JsonResponse($$"""
                        {
                          "sha": "machine-sha",
                          "content": "{{EncodeContent(MachineMaster.Content)}}"
                        }
                        """);
                }

                if (url.Contains("/contents/data/master/gyms.json", StringComparison.Ordinal))
                {
                    return JsonResponse($$"""
                        {
                          "sha": "gym-sha",
                          "content": "{{EncodeContent(GymMaster.Content)}}"
                        }
                        """);
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

                if (url.Contains("/contents/data/workouts/2026-08-24.json?ref=master", StringComparison.Ordinal))
                {
                    var workout = Workout("workouts/2026-08-24.json", "missing-gym", "missing-machine").Content;
                    return JsonResponse($$"""{ "sha": "workout-sha", "content": "{{EncodeContent(workout)}}" }""");
                }

                if (url.Contains("/contents/data/master/machines.json", StringComparison.Ordinal))
                {
                    return JsonResponse($$"""
                        {
                          "sha": "machine-sha",
                          "content": "{{EncodeContent(MachineMaster.Content)}}"
                        }
                        """);
                }

                if (url.Contains("/contents/data/master/gyms.json", StringComparison.Ordinal))
                {
                    return JsonResponse($$"""
                        {
                          "sha": "gym-sha",
                          "content": "{{EncodeContent(GymMaster.Content)}}"
                        }
                        """);
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
            Assert.NotNull(runtime.Data?.MasterDocuments);
            Assert.Equal(MachineMaster.Content, runtime.Data!.MasterDocuments!.Machine.Content);
            Assert.Equal(GymMaster.Content, runtime.Data.MasterDocuments.Gym.Content);
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

                if (url.Contains("/contents/data/workouts/2026-08-24.json?ref=master", StringComparison.Ordinal))
                {
                    var workout = Workout("workouts/2026-08-24.json", "known-gym", "known-machine").Content;
                    return JsonResponse($$"""{ "sha": "workout-sha", "content": "{{EncodeContent(workout)}}" }""");
                }

                if (url.Contains("/contents/data/master/machines.json", StringComparison.Ordinal))
                {
                    return JsonResponse($$"""
                        {
                          "sha": "machine-sha",
                          "content": "{{EncodeContent(MachineMaster.Content)}}"
                        }
                        """);
                }

                if (url.Contains("/contents/data/master/gyms.json", StringComparison.Ordinal))
                {
                    return JsonResponse($$"""
                        {
                          "sha": "gym-sha",
                          "content": "{{EncodeContent(GymMaster.Content)}}"
                        }
                        """);
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
            Assert.Equal("Update machine master: machines.json", payload["message"]!.GetValue<string>());
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
        Assert.Contains(result.Errors, error => error.Code == AfErrorCodes.MasterSyncRequired);
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
    public async Task MasterDocumentWriteAllowsDeletingReferencedMachine()
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
            var machineMaster = "{\"schema_version\":1,\"machines\":[{\"machine_id\":\"known-machine\",\"name\":\"Known Machine\",\"body_part\":\"chest\",\"aliases\":[],\"active\":true,\"deleted\":false}]}";
            var gymMaster = "{\"schema_version\":1,\"gyms\":[{\"gym_id\":\"known-gym\",\"name\":\"Known Gym\",\"active\":true,\"deleted\":false,\"main\":true}]}";
            var localMasters = new LocalMasterDocuments(
                new MasterDocumentSnapshot("MACHINE_MASTER", "master/machines.json", "current-sha", machineMaster),
                new MasterDocumentSnapshot("GYM_MASTER", "master/gyms.json", "gym-sha", gymMaster));
            Assert.Empty(runtimeStore.SaveCurrent(new RuntimeBuildResult(new[] { session }, Array.Empty<AfError>(), Array.Empty<RuntimeWarning>(), false), localMasters));

            var requests = new List<HttpRequestMessage>();
            var http = new RecordingAsyncHttpMessageHandler(async request =>
            {
                requests.Add(CloneRequest(request));
                if (request.Method == HttpMethod.Get)
                {
                    if (request.RequestUri!.AbsoluteUri.Contains("/contents/data/workouts/valid.json?ref=master", StringComparison.Ordinal))
                    {
                        const string workout = "{\"schema_version\":1,\"session_id\":\"valid\",\"date\":\"2026-08-24\",\"status\":\"complete\",\"gym_id\":\"known-gym\",\"machines\":[{\"machine_id\":\"known-machine\",\"sets\":[{\"set\":1,\"weight_kg\":20,\"reps\":10}]}]}";
                        return JsonResponse($$"""
                            {
                              "sha": "workout-sha",
                              "content": "{{EncodeContent(workout)}}"
                            }
                            """);
                    }

                    if (request.RequestUri!.AbsoluteUri.Contains("/contents/data/workouts?ref=master", StringComparison.Ordinal))
                    {
                        return JsonResponse("""
                            [
                              {
                                "type": "file",
                                "path": "data/workouts/valid.json"
                              }
                            ]
                            """);
                    }

                    if (request.RequestUri!.AbsoluteUri.Contains("/data/master/gyms.json", StringComparison.Ordinal))
                    {
                        return JsonResponse($$"""
                            {
                              "sha": "gym-sha",
                              "content": "{{EncodeContent(gymMaster)}}"
                            }
                            """);
                    }

                    return JsonResponse($$"""
                        {
                          "sha": "current-sha",
                          "content": "{{EncodeContent(machineMaster)}}"
                        }
                        """);
                }

                _ = await request.Content!.ReadAsStringAsync();
                return JsonResponse("""
                    {
                      "content": {
                        "sha": "saved-sha"
                      }
                    }
                    """);
            });
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
            Assert.Empty(runtimeStore.SaveCurrent(new RuntimeBuildResult(new[] { session }, Array.Empty<AfError>(), Array.Empty<RuntimeWarning>(), false), localMasters));
            requests.Clear();

            var result = await application.WriteMasterDocumentAsync(
                "MACHINE_MASTER",
                new MasterDocumentWriteRequest(
                    "current-sha",
                    "{\"schema_version\":1,\"machines\":[{\"machine_id\":\"known-machine\",\"name\":\"Known Machine\",\"body_part\":\"chest\",\"aliases\":[],\"active\":false,\"deleted\":true}]}"),
                CancellationToken.None);

            Assert.Equal(200, result.StatusCode);
            Assert.True(result.Response.Success);
            Assert.Equal("saved-sha", result.Response.Data!.Revision);
            Assert.Equal(new[] { HttpMethod.Get, HttpMethod.Put, HttpMethod.Get, HttpMethod.Get }, requests.Select(request => request.Method));
            Assert.Contains(requests, request => request.Method == HttpMethod.Put && request.RequestUri!.AbsoluteUri.Contains("/contents/data/master/machines.json", StringComparison.Ordinal));
            Assert.DoesNotContain(requests, request => request.Method == HttpMethod.Get && request.RequestUri!.AbsoluteUri.Contains("/contents/data/master/gyms.json", StringComparison.Ordinal));
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
    public async Task MasterDocumentReadUsesLocalMasterWithoutRemoteFetch()
    {
        var root = Path.Combine(Path.GetTempPath(), "atlament-af-test-" + Guid.NewGuid().ToString("N"));
        try
        {
            var paths = new WindowsPathProvider(root);
            var runtimeStore = new RuntimeDataStore(paths);
            var localMasters = new LocalMasterDocuments(
                new MasterDocumentSnapshot("MACHINE_MASTER", "master/machines.json", "local-machine-sha", "{\"schema_version\":1,\"machines\":[]}"),
                new MasterDocumentSnapshot("GYM_MASTER", "master/gyms.json", "local-gym-sha", "{\"schema_version\":1,\"gyms\":[]}"));
            Assert.Empty(runtimeStore.SaveCurrent(new RuntimeBuildResult(Array.Empty<WorkoutSession>(), Array.Empty<AfError>(), Array.Empty<RuntimeWarning>(), false), localMasters));

            var application = new AtlamentApplication(
                new ConfigurationStore(paths),
                new CredentialStore(paths),
                runtimeStore,
                new RuntimeDataBuilder(),
                new GithubAccessService(new HttpClient(new RecordingHttpMessageHandler(_ => throw new InvalidOperationException("GitHub must not be read for Maintenance display.")))),
                new HostingStatusService(paths),
                new AfLog(paths));

            var result = await application.ReadMasterDocumentAsync("MACHINE_MASTER", CancellationToken.None);

            Assert.Equal(200, result.StatusCode);
            Assert.Equal("local-machine-sha", result.Response.Data!.Revision);
            Assert.Equal("{\"schema_version\":1,\"machines\":[]}", result.Response.Data.Content);
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
    public async Task MasterDocumentReadRequiresSyncWhenLocalMasterIsMissing()
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
                new GithubAccessService(new HttpClient(new RecordingHttpMessageHandler(_ => throw new InvalidOperationException("GitHub must not be used as a Maintenance fallback.")))),
                new HostingStatusService(paths),
                new AfLog(paths));

            var result = await application.ReadMasterDocumentAsync("GYM_MASTER", CancellationToken.None);

            Assert.Equal(409, result.StatusCode);
            Assert.False(result.Response.Success);
            Assert.Contains(result.Response.Errors, error => error.Code == AfErrorCodes.MasterSyncRequired);
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
    public async Task UnresolvedMasterReferencesUseCurrentRuntimeWarningsWithoutRemoteFetch()
    {
        var root = Path.Combine(Path.GetTempPath(), "atlament-af-test-" + Guid.NewGuid().ToString("N"));
        try
        {
            var paths = new WindowsPathProvider(root);
            var runtimeStore = new RuntimeDataStore(paths);
            var warning = new RuntimeWarning(
                "MASTER_REFERENCE_MISSING",
                "machine",
                "missing",
                "unknown-machine",
                null,
                "session-1",
                "workouts/2026-08-24.json",
                null,
                "特定のマシンが存在しません: unknown-machine");
            Assert.Empty(runtimeStore.SaveCurrent(new RuntimeBuildResult(Array.Empty<WorkoutSession>(), Array.Empty<AfError>(), new[] { warning }, false)));

            var application = new AtlamentApplication(
                new ConfigurationStore(paths),
                new CredentialStore(paths),
                runtimeStore,
                new RuntimeDataBuilder(),
                new GithubAccessService(new HttpClient(new RecordingHttpMessageHandler(_ => throw new InvalidOperationException("GitHub must not be read for unresolved Maintenance data.")))),
                new HostingStatusService(paths),
                new AfLog(paths));

            var result = await application.GetUnresolvedMasterReferencesAsync(CancellationToken.None);

            Assert.Equal(200, result.StatusCode);
            var unresolved = Assert.Single(result.Response.Data!);
            Assert.Equal("MACHINE_MASTER", unresolved.Type);
            Assert.Equal("unknown-machine", unresolved.ReferenceId);
            Assert.Single(unresolved.AffectedWorkouts);
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

    private static JsonObject ConfirmedField(string fieldPath, JsonNode? value) =>
        new()
        {
            ["fieldPath"] = fieldPath,
            ["state"] = "confirmed",
            ["source"] = "user",
            ["value"] = value
        };

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

    private static string ContentRevision(string content) =>
        "content-sha256-" + Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(Encoding.UTF8.GetBytes(content))).ToLowerInvariant();

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
        public List<string> RequestedUrls { get; } = new();

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            RequestedUrls.Add(request.RequestUri?.AbsoluteUri ?? "");
            return await respond(request);
        }
    }
}
