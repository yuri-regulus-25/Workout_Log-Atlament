using System.Text.Json.Serialization;

namespace Atlament.Core;

public sealed record AfResponse<T>(
    [property: JsonPropertyName("success")] bool Success,
    [property: JsonPropertyName("errors")] IReadOnlyList<AfError> Errors,
    [property: JsonPropertyName("warnings")] IReadOnlyList<RuntimeWarning> Warnings,
    [property: JsonPropertyName("data")] T? Data)
{
    public AfResponse(bool success, IReadOnlyList<AfError> errors, T? data)
        : this(success, errors, Array.Empty<RuntimeWarning>(), data)
    {
    }
}

public sealed record AfError(
    [property: JsonPropertyName("code")] string Code,
    [property: JsonPropertyName("message")] string Message,
    [property: JsonPropertyName("recoverable")] bool Recoverable);

public sealed record RuntimeWarning(
    [property: JsonPropertyName("code")] string Code,
    [property: JsonPropertyName("referenceKind")] string ReferenceKind,
    [property: JsonPropertyName("resolutionState")] string ResolutionState,
    [property: JsonPropertyName("originalId")] string OriginalId,
    [property: JsonPropertyName("resolvedId")] string? ResolvedId,
    [property: JsonPropertyName("sessionId")] string SessionId,
    [property: JsonPropertyName("filePath")] string FilePath,
    [property: JsonPropertyName("line")] int? Line,
    [property: JsonPropertyName("message")] string Message);

public static class AfResponses
{
    public static AfResponse<T> Ok<T>(T data, IReadOnlyList<AfError>? errors = null) =>
        new(true, errors ?? Array.Empty<AfError>(), Array.Empty<RuntimeWarning>(), data);

    public static AfResponse<T> Ok<T>(T data, IReadOnlyList<AfError>? errors, IReadOnlyList<RuntimeWarning>? warnings) =>
        new(true, errors ?? Array.Empty<AfError>(), warnings ?? Array.Empty<RuntimeWarning>(), data);

    public static AfResponse<T> Fail<T>(AfError error) =>
        new(false, new[] { error }, Array.Empty<RuntimeWarning>(), default);
}

public static class AfErrorCodes
{
    public const string CommonInternalError = "COMMON_INTERNAL_ERROR";
    public const string OperationAlreadyRunning = "OPERATION_ALREADY_RUNNING";
    public const string ConfigRequired = "CONFIG_REQUIRED";
    public const string ConfigInvalid = "CONFIG_INVALID";
    public const string ConfigSaveFailed = "CONFIG_SAVE_FAILED";
    public const string CredentialRequired = "CREDENTIAL_REQUIRED";
    public const string RuntimeDataRequired = "RUNTIME_DATA_REQUIRED";
    public const string CredentialInvalid = "CREDENTIAL_INVALID";
    public const string CredentialSaveFailed = "CREDENTIAL_SAVE_FAILED";
    public const string GithubUnauthorized = "GITHUB_UNAUTHORIZED";
    public const string GithubForbidden = "GITHUB_FORBIDDEN";
    public const string GithubRateLimit = "GITHUB_RATE_LIMIT";
    public const string GithubResourceNotFound = "GITHUB_RESOURCE_NOT_FOUND";
    public const string GithubConnectionFailed = "GITHUB_CONNECTION_FAILED";
    public const string GithubTimeout = "GITHUB_TIMEOUT";
    public const string GithubServerError = "GITHUB_SERVER_ERROR";
    public const string RuntimeDataInvalid = "RUNTIME_DATA_INVALID";
    public const string RuntimeDataEmpty = "RUNTIME_DATA_EMPTY";
    public const string RuntimeDataUnavailable = "RUNTIME_DATA_UNAVAILABLE";
    public const string RuntimeDataUpdateFailed = "RUNTIME_DATA_UPDATE_FAILED";
    public const string MasterMachineNotFound = "MASTER_MACHINE_NOT_FOUND";
    public const string MasterGymNotFound = "MASTER_GYM_NOT_FOUND";
    public const string MasterWriteInvalid = "MASTER_WRITE_INVALID";
    public const string MasterWriteConflict = "MASTER_WRITE_CONFLICT";
    public const string MasterWriteFailed = "MASTER_WRITE_FAILED";
    public const string MasterSyncRequired = "MASTER_SYNC_REQUIRED";
    public const string HostingArtifactNotFound = "HOSTING_ARTIFACT_NOT_FOUND";
    public const string HostingStartFailed = "HOSTING_START_FAILED";
    public const string HttpPortUnavailable = "HTTP_PORT_UNAVAILABLE";
    public const string HttpServerStartFailed = "HTTP_SERVER_START_FAILED";
    public const string StorageReadFailed = "STORAGE_READ_FAILED";
    public const string StorageWriteFailed = "STORAGE_WRITE_FAILED";
    public const string ShutdownFailed = "SHUTDOWN_FAILED";
}

public enum ApplicationStatus { starting, ready, degraded, stopping, failed }
public enum ComponentStatus { unknown, available, unavailable, degraded }
public enum OperationStatus { idle, running, completed, failed }
public enum CredentialState { available, missing, invalid, expired, unknown }
public enum LogType { INFO, WARN, ERROR, FATAL }
