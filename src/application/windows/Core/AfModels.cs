using System.Text.Json.Serialization;

namespace Atlament.Core;

public sealed record RepositoryConfiguration(
    [property: JsonPropertyName("owner")] string Owner,
    [property: JsonPropertyName("repository")] string Repository,
    [property: JsonPropertyName("ref")] string Ref,
    [property: JsonPropertyName("rootPath")] string RootPath);

public sealed record ResourceConfiguration(
    [property: JsonPropertyName("type")] string Type,
    [property: JsonPropertyName("path")] string Path,
    [property: JsonPropertyName("resourceKind")] string ResourceKind,
    [property: JsonPropertyName("required")] bool Required,
    [property: JsonPropertyName("emptyAllowed")] bool EmptyAllowed);

public sealed record TimeoutConfiguration(
    [property: JsonPropertyName("githubRequestTimeoutSec")] int GithubRequestTimeoutSec,
    [property: JsonPropertyName("syncOperationTimeoutSec")] int SyncOperationTimeoutSec,
    [property: JsonPropertyName("generalApiTimeoutSec")] int GeneralApiTimeoutSec,
    [property: JsonPropertyName("shutdownTimeoutSec")] int ShutdownTimeoutSec);

public sealed record AfConfiguration(
    [property: JsonPropertyName("schemaVersion")] int SchemaVersion,
    [property: JsonPropertyName("repository")] RepositoryConfiguration Repository,
    [property: JsonPropertyName("resources")] IReadOnlyList<ResourceConfiguration> Resources,
    [property: JsonPropertyName("timeouts")] TimeoutConfiguration Timeouts)
{
    public static AfConfiguration Default => new(
        1,
        new RepositoryConfiguration("", "", "main", ""),
        new[]
        {
            new ResourceConfiguration("WORKOUT", "workouts/", "directory", true, false),
            new ResourceConfiguration("MACHINE_MASTER", "master/machines.json", "file", true, false),
            new ResourceConfiguration("GYM_MASTER", "master/gyms.json", "file", true, false)
        },
        new TimeoutConfiguration(10, 60, 30, 10));
}

public sealed record ConfigurationUpdate(
    [property: JsonPropertyName("repository")] RepositoryConfigurationUpdate? Repository,
    [property: JsonPropertyName("resources")] IReadOnlyList<ResourceConfiguration>? Resources,
    [property: JsonPropertyName("timeouts")] TimeoutConfigurationUpdate? Timeouts);

public sealed record RepositoryConfigurationUpdate(
    [property: JsonPropertyName("owner")] string? Owner,
    [property: JsonPropertyName("repository")] string? Repository,
    [property: JsonPropertyName("ref")] string? Ref,
    [property: JsonPropertyName("rootPath")] string? RootPath);

public sealed record TimeoutConfigurationUpdate(
    [property: JsonPropertyName("githubRequestTimeoutSec")] int? GithubRequestTimeoutSec,
    [property: JsonPropertyName("syncOperationTimeoutSec")] int? SyncOperationTimeoutSec,
    [property: JsonPropertyName("generalApiTimeoutSec")] int? GeneralApiTimeoutSec,
    [property: JsonPropertyName("shutdownTimeoutSec")] int? ShutdownTimeoutSec);

public sealed record ConfigurationUpdateResult(
    [property: JsonPropertyName("remoteChecked")] bool RemoteChecked);

public sealed record CredentialStatus(
    [property: JsonPropertyName("configured")] bool Configured,
    [property: JsonPropertyName("state")] string State,
    [property: JsonPropertyName("limitDate")] string? LimitDate);

public sealed record CredentialUpdate(
    [property: JsonPropertyName("token")] string? Token,
    [property: JsonPropertyName("limitDate")] string? LimitDate);

public sealed record CredentialUpdateResult(
    [property: JsonPropertyName("configured")] bool Configured,
    [property: JsonPropertyName("state")] string State,
    [property: JsonPropertyName("limitDate")] string? LimitDate);

public sealed record MasterWriteTarget(
    [property: JsonPropertyName("type")] string Type,
    [property: JsonPropertyName("path")] string Path,
    [property: JsonPropertyName("resourceKind")] string ResourceKind,
    [property: JsonPropertyName("writeAllowed")] bool WriteAllowed);

public sealed record MasterWriteSecurity(
    [property: JsonPropertyName("configurationAvailable")] bool ConfigurationAvailable,
    [property: JsonPropertyName("credentialConfigured")] bool CredentialConfigured,
    [property: JsonPropertyName("credentialState")] string CredentialState,
    [property: JsonPropertyName("repositoryConfigured")] bool RepositoryConfigured,
    [property: JsonPropertyName("writeEnabled")] bool WriteEnabled,
    [property: JsonPropertyName("workoutLogWriteAllowed")] bool WorkoutLogWriteAllowed,
    [property: JsonPropertyName("rawJsonWriteAllowed")] bool RawJsonWriteAllowed,
    [property: JsonPropertyName("genericGitWriteAllowed")] bool GenericGitWriteAllowed);

public sealed record MasterWriteBoundary(
    [property: JsonPropertyName("repository")] RepositoryConfiguration Repository,
    [property: JsonPropertyName("allowedTargets")] IReadOnlyList<MasterWriteTarget> AllowedTargets,
    [property: JsonPropertyName("security")] MasterWriteSecurity Security);

public sealed record MasterDocumentSnapshot(
    [property: JsonPropertyName("type")] string Type,
    [property: JsonPropertyName("path")] string Path,
    [property: JsonPropertyName("revision")] string Revision,
    [property: JsonPropertyName("content")] string Content);

public sealed record MasterDocumentWriteRequest(
    [property: JsonPropertyName("expectedRevision")] string? ExpectedRevision,
    [property: JsonPropertyName("content")] string? Content);

public sealed record MasterDocumentWriteResult(
    [property: JsonPropertyName("type")] string Type,
    [property: JsonPropertyName("path")] string Path,
    [property: JsonPropertyName("revision")] string Revision);

public sealed record LocalMasterDocuments(
    [property: JsonPropertyName("machine")] MasterDocumentSnapshot Machine,
    [property: JsonPropertyName("gym")] MasterDocumentSnapshot Gym);

public sealed record UnresolvedMasterReference(
    [property: JsonPropertyName("type")] string Type,
    [property: JsonPropertyName("referenceId")] string ReferenceId,
    [property: JsonPropertyName("affectedWorkouts")] IReadOnlyList<UnresolvedAffectedWorkout> AffectedWorkouts);

public sealed record UnresolvedAffectedWorkout(
    [property: JsonPropertyName("filePath")] string FilePath,
    [property: JsonPropertyName("line")] int? Line,
    [property: JsonPropertyName("message")] string Message);

public sealed record SyncResult(
    [property: JsonPropertyName("degraded")] bool Degraded);

public sealed record ShutdownResult(
    [property: JsonPropertyName("accepted")] bool Accepted,
    [property: JsonPropertyName("alreadyShuttingDown")] bool AlreadyShuttingDown);

public sealed record RuntimeWorkoutData(
    [property: JsonPropertyName("sessions")] IReadOnlyList<WorkoutSession> Sessions,
    [property: JsonPropertyName("masterDocuments")] LocalMasterDocuments? MasterDocuments = null);

public sealed record RuntimeDataFile(
    [property: JsonPropertyName("schemaVersion")] int SchemaVersion,
    [property: JsonPropertyName("generatedAt")] DateTimeOffset GeneratedAt,
    [property: JsonPropertyName("sessions")] IReadOnlyList<WorkoutSession> Sessions,
    [property: JsonPropertyName("errors")] IReadOnlyList<AfError> Errors,
    [property: JsonPropertyName("warnings")] IReadOnlyList<RuntimeWarning> Warnings,
    [property: JsonPropertyName("masterDocuments")] LocalMasterDocuments? MasterDocuments = null);

public sealed record WorkoutSession(
    [property: JsonPropertyName("schema_version")] int SchemaVersion,
    [property: JsonPropertyName("session_id")] string SessionId,
    [property: JsonPropertyName("date")] string Date,
    [property: JsonPropertyName("status")] string Status,
    [property: JsonPropertyName("gym")] Gym Gym,
    [property: JsonPropertyName("condition")] SessionCondition? Condition,
    [property: JsonPropertyName("machines")] IReadOnlyList<WorkoutMachine> Machines,
    [property: JsonPropertyName("notes")] IReadOnlyList<string> Notes);

public sealed record Gym(
    [property: JsonPropertyName("id")] string Id,
    [property: JsonPropertyName("name"), JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string? Name,
    [property: JsonPropertyName("short_name"), JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string? ShortName,
    [property: JsonPropertyName("resolution")] MasterReferenceResolution Resolution);

public sealed record WorkoutMachine(
    [property: JsonPropertyName("machine_id")] string MachineId,
    [property: JsonPropertyName("name"), JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string? Name,
    [property: JsonPropertyName("body_part"), JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string? BodyPart,
    [property: JsonPropertyName("resolution")] MasterReferenceResolution Resolution,
    [property: JsonPropertyName("sets")] IReadOnlyList<MachineSet> Sets,
    [property: JsonPropertyName("notes")] IReadOnlyList<string> Notes);

public sealed record MasterReferenceResolution(
    [property: JsonPropertyName("state")] string State,
    [property: JsonPropertyName("originalId")] string OriginalId,
    [property: JsonPropertyName("resolvedId")] string? ResolvedId);

public sealed record MachineSet(
    [property: JsonPropertyName("set")] int Set,
    [property: JsonPropertyName("weight_kg")] decimal WeightKg,
    [property: JsonPropertyName("reps")] int Reps,
    [property: JsonPropertyName("rir")] decimal? Rir,
    [property: JsonPropertyName("failure")] bool? Failure,
    [property: JsonPropertyName("warmup")] bool? Warmup,
    [property: JsonPropertyName("note")] string? Note);

public sealed record SessionCondition(
    [property: JsonPropertyName("fatigue")] decimal? Fatigue,
    [property: JsonPropertyName("motivation")] decimal? Motivation,
    [property: JsonPropertyName("sleep")] decimal? Sleep,
    [property: JsonPropertyName("soreness")] IReadOnlyList<string>? Soreness,
    [property: JsonPropertyName("performance")] string? Performance,
    [property: JsonPropertyName("notes")] IReadOnlyList<string>? Notes);

public sealed record AfStatus(
    [property: JsonPropertyName("versions")] StatusVersions Versions,
    [property: JsonPropertyName("readiness")] ApplicationReadiness Readiness,
    [property: JsonPropertyName("runtimeData")] RuntimeDataStatusFacts RuntimeData,
    [property: JsonPropertyName("application")] ApplicationState Application,
    [property: JsonPropertyName("operations")] OperationStateSnapshot Operations,
    [property: JsonPropertyName("components")] ComponentStateSnapshot Components,
    [property: JsonPropertyName("requiredActions")] IReadOnlyList<string> RequiredActions);

public sealed record StatusVersions(
    [property: JsonPropertyName("applicationFramework")] string ApplicationFramework,
    [property: JsonPropertyName("frontendFramework")] string FrontendFramework,
    [property: JsonPropertyName("nativePackages")] NativePackageVersions NativePackages);

public sealed record NativePackageVersions(
    [property: JsonPropertyName("windows")] WindowsPackageVersion Windows,
    [property: JsonPropertyName("android")] AndroidPackageVersion Android);

public sealed record WindowsPackageVersion(
    [property: JsonPropertyName("version")] string Version);

public sealed record AndroidPackageVersion(
    [property: JsonPropertyName("versionName")] string VersionName,
    [property: JsonPropertyName("versionCode")] int VersionCode);

public sealed record ApplicationReadiness(
    [property: JsonPropertyName("state")] string State,
    [property: JsonPropertyName("requiredActions")] IReadOnlyList<string> RequiredActions,
    [property: JsonPropertyName("unavailableComponents")] IReadOnlyList<string> UnavailableComponents,
    [property: JsonPropertyName("degradedComponents")] IReadOnlyList<string> DegradedComponents);

public sealed record RuntimeDataStatusFacts(
    [property: JsonPropertyName("currentAvailable")] bool CurrentAvailable,
    [property: JsonPropertyName("currentGeneratedAt")] DateTimeOffset? CurrentGeneratedAt,
    [property: JsonPropertyName("latestRemoteRetrieval")] string LatestRemoteRetrieval,
    [property: JsonPropertyName("latestValidation")] string LatestValidation,
    [property: JsonPropertyName("fallbackActive")] bool FallbackActive);

public sealed record ApplicationState(
    [property: JsonPropertyName("status")] string Status,
    [property: JsonPropertyName("degraded")] bool Degraded,
    [property: JsonPropertyName("acceptingRequests")] bool AcceptingRequests);

public sealed record OperationStateSnapshot(
    [property: JsonPropertyName("startup")] string Startup,
    [property: JsonPropertyName("manualSync")] string ManualSync,
    [property: JsonPropertyName("configurationUpdate")] string ConfigurationUpdate,
    [property: JsonPropertyName("credentialUpdate")] string CredentialUpdate,
    [property: JsonPropertyName("shutdown")] string Shutdown);

public sealed record ComponentStateSnapshot(
    [property: JsonPropertyName("configuration")] string Configuration,
    [property: JsonPropertyName("credential")] string Credential,
    [property: JsonPropertyName("github")] string Github,
    [property: JsonPropertyName("runtimeData")] string RuntimeData,
    [property: JsonPropertyName("hosting")] HostingComponentState Hosting);

public sealed record HostingComponentState(
    [property: JsonPropertyName("portal")] string Portal,
    [property: JsonPropertyName("dashboard")] string Dashboard,
    [property: JsonPropertyName("workouts")] string Workouts,
    [property: JsonPropertyName("machines")] string Machines,
    [property: JsonPropertyName("analytics")] string Analytics,
    [property: JsonPropertyName("settings")] string Settings,
    [property: JsonPropertyName("maintenance")] string Maintenance);

public sealed record RuntimeSourceFile(string Path, string Content);

public sealed record RuntimeBuildResult(
    IReadOnlyList<WorkoutSession> Sessions,
    IReadOnlyList<AfError> Errors,
    IReadOnlyList<RuntimeWarning> Warnings,
    bool TechnicalInvalid);
