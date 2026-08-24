using Atlament.Core;

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
}
