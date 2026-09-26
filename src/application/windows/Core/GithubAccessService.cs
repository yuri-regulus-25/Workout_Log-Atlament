using System.Net;
using System.Net.Http.Headers;
using System.Reflection;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;

namespace Atlament.Core;

/// <summary>
/// Windows AF が使用する GitHub Contents/GraphQL I/O 境界。
/// </summary>
/// <remarks>
/// Credential の値は呼び出し元から受け取るだけで保持しない。Master write と Recovery write は
/// allowlist、expected revision、固定 commit message によって境界を閉じ、Frontend から任意 Git 操作を
/// 指示できないようにする。
/// </remarks>
public sealed class GithubAccessService
{
    private static readonly IReadOnlyDictionary<string, string> MasterWriteTargets =
        new Dictionary<string, string>(StringComparer.Ordinal)
        {
            ["MACHINE_MASTER"] = "master/machines.json",
            ["GYM_MASTER"] = "master/gyms.json"
        };

    private readonly HttpClient _httpClient;

    public GithubAccessService()
        : this(new HttpClient())
    {
    }

    public GithubAccessService(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    /// <summary>
    /// Configuration に定義された Runtime source を GitHub から取得する。
    /// </summary>
    /// <remarks>
    /// required resource の取得失敗または empty disallow 違反は同期失敗として返す。
    /// HTTP status は stable `GITHUB_*`/Runtime error code へ分類し、message は表示用として扱う。
    /// </remarks>
    public async Task<(IReadOnlyList<RuntimeSourceFile> Files, IReadOnlyList<AfError> Errors)> FetchAsync(
        AfConfiguration configuration,
        string? token,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(configuration.Repository.Owner) || string.IsNullOrWhiteSpace(configuration.Repository.Repository))
        {
            return (Array.Empty<RuntimeSourceFile>(), new[] { new AfError(AfErrorCodes.ConfigRequired, "Repository configuration is required.", true) });
        }

        try
        {
            using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            timeoutCts.CancelAfter(TimeSpan.FromSeconds(configuration.Timeouts.GithubRequestTimeoutSec));
            var files = new List<RuntimeSourceFile>();
            var errors = new List<AfError>();

            foreach (var resource in configuration.Resources)
            {
                var fetched = resource.ResourceKind == "directory"
                    ? await FetchDirectoryAsync(configuration, resource, token, timeoutCts.Token)
                    : await FetchFileAsync(configuration, resource.Path, token, timeoutCts.Token);

                if (fetched.Errors.Count > 0)
                {
                    if (resource.Type == "WORKOUT" && resource.ResourceKind == "directory" && fetched.Errors.All(error => error.Code == AfErrorCodes.GithubResourceNotFound))
                    {
                        continue;
                    }
                    errors.AddRange(fetched.Errors);
                    if (resource.Required)
                    {
                        return (Array.Empty<RuntimeSourceFile>(), errors);
                    }
                }

                if (resource.Type != "WORKOUT" && !resource.EmptyAllowed && fetched.Files.Count == 0)
                {
                    errors.Add(new AfError(AfErrorCodes.RuntimeDataEmpty, $"{resource.Path} is empty.", true));
                    if (resource.Required)
                    {
                        return (Array.Empty<RuntimeSourceFile>(), errors);
                    }
                }

                files.AddRange(fetched.Files);
            }

            return (files, errors);
        }
        catch (OperationCanceledException)
        {
            return (Array.Empty<RuntimeSourceFile>(), new[] { new AfError(AfErrorCodes.GithubTimeout, "GitHub access timed out.", true) });
        }
        catch (HttpRequestException)
        {
            return (Array.Empty<RuntimeSourceFile>(), new[] { new AfError(AfErrorCodes.GithubConnectionFailed, "GitHub connection failed.", true) });
        }
    }

    public async Task<IReadOnlyList<AfError>> CheckAsync(AfConfiguration configuration, string? token, CancellationToken cancellationToken)
    {
        var (_, errors) = await FetchAsync(configuration, token, cancellationToken);
        return errors;
    }

    public async Task<(IReadOnlyList<RuntimeSourceFile> Files, IReadOnlyList<AfError> Errors)> FetchWorkoutFilesAsync(
        AfConfiguration configuration,
        string? token,
        CancellationToken cancellationToken)
    {
        try
        {
            using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            timeoutCts.CancelAfter(TimeSpan.FromSeconds(configuration.Timeouts.GithubRequestTimeoutSec));
            var files = new List<RuntimeSourceFile>();
            var errors = new List<AfError>();
            foreach (var resource in configuration.Resources.Where(resource => resource.Type == "WORKOUT"))
            {
                var fetched = resource.ResourceKind == "directory"
                    ? await FetchDirectoryAsync(configuration, resource, token, timeoutCts.Token)
                    : await FetchFileAsync(configuration, resource.Path, token, timeoutCts.Token);
                if (fetched.Errors.Count > 0)
                {
                    if (resource.ResourceKind == "directory" && fetched.Errors.All(error => error.Code == AfErrorCodes.GithubResourceNotFound))
                    {
                        continue;
                    }
                    errors.AddRange(fetched.Errors);
                    if (resource.Required) return (Array.Empty<RuntimeSourceFile>(), errors);
                }
                files.AddRange(fetched.Files);
            }

            return errors.Count == 0 ? (files, errors) : (Array.Empty<RuntimeSourceFile>(), errors);
        }
        catch (OperationCanceledException)
        {
            return (Array.Empty<RuntimeSourceFile>(), new[] { new AfError(AfErrorCodes.GithubTimeout, "GitHub access timed out.", true) });
        }
        catch (HttpRequestException)
        {
            return (Array.Empty<RuntimeSourceFile>(), new[] { new AfError(AfErrorCodes.GithubConnectionFailed, "GitHub connection failed.", true) });
        }
    }

    public async Task<(MasterDocumentSnapshot? Document, IReadOnlyList<AfError> Errors)> ReadMasterDocumentAsync(
        AfConfiguration configuration,
        string? token,
        string type,
        CancellationToken cancellationToken)
    {
        if (!TryGetMasterWriteTarget(type, out var target))
        {
            return (null, new[] { new AfError(AfErrorCodes.MasterWriteInvalid, "Master write target is not allowed.", true) });
        }

        try
        {
            using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            timeoutCts.CancelAfter(TimeSpan.FromSeconds(configuration.Timeouts.GithubRequestTimeoutSec));
            var fullPath = CombineRemote(configuration.Repository.RootPath, target);
            var remote = await ReadGithubContentAsync(configuration, fullPath, token, timeoutCts.Token);
            if (remote.Errors.Count > 0)
            {
                return (null, remote.Errors);
            }

            var content = DecodeGithubContent(remote.Content!);
            if (content is null)
            {
                return (null, new[] { new AfError(AfErrorCodes.GithubServerError, "GitHub contents response is invalid.", true) });
            }

            return (new MasterDocumentSnapshot(type, target, remote.Revision!, content), Array.Empty<AfError>());
        }
        catch (OperationCanceledException)
        {
            return (null, new[] { new AfError(AfErrorCodes.GithubTimeout, "GitHub access timed out.", true) });
        }
        catch (HttpRequestException)
        {
            return (null, new[] { new AfError(AfErrorCodes.GithubConnectionFailed, "GitHub connection failed.", true) });
        }
    }

    public async Task<(string? Revision, IReadOnlyList<AfError> Errors)> ReadMasterDocumentRevisionAsync(
        AfConfiguration configuration,
        string? token,
        string type,
        CancellationToken cancellationToken)
    {
        if (!TryGetMasterWriteTarget(type, out var target))
        {
            return (null, new[] { new AfError(AfErrorCodes.MasterWriteInvalid, "Master write target is not allowed.", true) });
        }

        try
        {
            using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            timeoutCts.CancelAfter(TimeSpan.FromSeconds(configuration.Timeouts.GithubRequestTimeoutSec));
            var fullPath = CombineRemote(configuration.Repository.RootPath, target);
            var remote = await ReadGithubContentAsync(configuration, fullPath, token, timeoutCts.Token);
            return remote.Errors.Count > 0 ? (null, remote.Errors) : (remote.Revision, Array.Empty<AfError>());
        }
        catch (OperationCanceledException)
        {
            return (null, new[] { new AfError(AfErrorCodes.GithubTimeout, "GitHub access timed out.", true) });
        }
        catch (HttpRequestException)
        {
            return (null, new[] { new AfError(AfErrorCodes.GithubConnectionFailed, "GitHub connection failed.", true) });
        }
    }

    public async Task<(MasterDocumentWriteResult? Result, IReadOnlyList<AfError> Errors)> SaveMasterDocumentAsync(
        AfConfiguration configuration,
        string? token,
        string type,
        string expectedRevision,
        string content,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(expectedRevision) || string.IsNullOrWhiteSpace(content))
        {
            return (null, new[] { new AfError(AfErrorCodes.MasterWriteInvalid, "Master document write request is invalid.", true) });
        }

        if (!TryGetMasterWriteTarget(type, out var target))
        {
            return (null, new[] { new AfError(AfErrorCodes.MasterWriteInvalid, "Master write target is not allowed.", true) });
        }

        try
        {
            using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            timeoutCts.CancelAfter(TimeSpan.FromSeconds(configuration.Timeouts.GithubRequestTimeoutSec));
            var fullPath = CombineRemote(configuration.Repository.RootPath, target);
            var remote = await ReadGithubContentAsync(configuration, fullPath, token, timeoutCts.Token);
            if (remote.Errors.Count > 0)
            {
                return (null, remote.Errors);
            }

            if (!string.Equals(remote.Revision, expectedRevision, StringComparison.Ordinal))
            {
                return (null, new[] { new AfError(AfErrorCodes.MasterSyncRequired, "Master document must be synchronized before saving.", true) });
            }

            var lifecycleErrors = ValidateMasterLifecycleTransition(type, remote.Content!, content);
            if (lifecycleErrors.Count > 0)
            {
                return (null, lifecycleErrors);
            }

            var other = await ReadOtherMasterDocumentAsync(configuration, token, type, timeoutCts.Token);
            if (other.Errors.Count > 0)
            {
                return (null, other.Errors);
            }

            var validationErrors = type == "MACHINE_MASTER"
                ? MasterWriteValidator.ValidateWholeMaster(content, other.Content!)
                : MasterWriteValidator.ValidateWholeMaster(other.Content!, content);
            if (validationErrors.Count > 0)
            {
                return (null, validationErrors);
            }

            var contentsUrl = $"https://api.github.com/repos/{configuration.Repository.Owner}/{configuration.Repository.Repository}/contents/{EscapeRemotePath(fullPath)}";
            using var request = CreateRequest(contentsUrl, token, HttpMethod.Put);
            var payload = new
            {
                message = BuildMasterCommitMessage(type, target),
                content = Convert.ToBase64String(Encoding.UTF8.GetBytes(content)),
                sha = remote.Revision,
                branch = configuration.Repository.Ref
            };
            request.Content = new StringContent(JsonSerializer.Serialize(payload, AfJson.Options), Encoding.UTF8, "application/json");
            using var response = await _httpClient.SendAsync(request, timeoutCts.Token);
            if (!response.IsSuccessStatusCode)
            {
                return (null, new[] { response.StatusCode == HttpStatusCode.Conflict
                    ? new AfError(AfErrorCodes.MasterSyncRequired, "Master document must be synchronized before saving.", true)
                    : MapGithubError(response.StatusCode, fullPath) });
            }

            var json = JsonNode.Parse(await response.Content.ReadAsStringAsync(timeoutCts.Token));
            var savedRevision = json?["content"]?["sha"]?.GetValue<string>();
            if (string.IsNullOrWhiteSpace(savedRevision))
            {
                return (null, new[] { new AfError(AfErrorCodes.MasterWriteFailed, "GitHub write result is ambiguous.", true) });
            }

            return (new MasterDocumentWriteResult(type, target, savedRevision), Array.Empty<AfError>());
        }
        catch (OperationCanceledException)
        {
            return (null, new[] { new AfError(AfErrorCodes.GithubTimeout, "GitHub access timed out.", true) });
        }
        catch (HttpRequestException)
        {
            return (null, new[] { new AfError(AfErrorCodes.GithubConnectionFailed, "GitHub connection failed.", true) });
        }
    }

    /// <summary>
    /// Master document を GitHub Contents API へ optimistic concurrency で書き込む。
    /// </summary>
    /// <remarks>
    /// ここでは remote revision の一致だけを確認する。whole-master validation と local snapshot reflection は
    /// Application orchestration 側で行うため、呼び出し側は成功 revision を local state へ反映する必要がある。
    /// </remarks>
    public async Task<(MasterDocumentWriteResult? Result, IReadOnlyList<AfError> Errors)> PushMasterDocumentAsync(
        AfConfiguration configuration,
        string? token,
        string type,
        string expectedRevision,
        string content,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(expectedRevision) || string.IsNullOrWhiteSpace(content))
        {
            return (null, new[] { new AfError(AfErrorCodes.MasterWriteInvalid, "Master document write request is invalid.", true) });
        }

        if (!TryGetMasterWriteTarget(type, out var target))
        {
            return (null, new[] { new AfError(AfErrorCodes.MasterWriteInvalid, "Master write target is not allowed.", true) });
        }

        try
        {
            using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            timeoutCts.CancelAfter(TimeSpan.FromSeconds(configuration.Timeouts.GithubRequestTimeoutSec));
            var fullPath = CombineRemote(configuration.Repository.RootPath, target);
            var remote = await ReadGithubContentAsync(configuration, fullPath, token, timeoutCts.Token);
            if (remote.Errors.Count > 0)
            {
                return (null, remote.Errors);
            }

            if (!string.Equals(remote.Revision, expectedRevision, StringComparison.Ordinal))
            {
                return (null, new[] { new AfError(AfErrorCodes.MasterSyncRequired, "Master document must be synchronized before saving.", true) });
            }

            var contentsUrl = $"https://api.github.com/repos/{configuration.Repository.Owner}/{configuration.Repository.Repository}/contents/{EscapeRemotePath(fullPath)}";
            using var request = CreateRequest(contentsUrl, token, HttpMethod.Put);
            var payload = new
            {
                message = BuildMasterCommitMessage(type, target),
                content = Convert.ToBase64String(Encoding.UTF8.GetBytes(content)),
                sha = remote.Revision,
                branch = configuration.Repository.Ref
            };
            request.Content = new StringContent(JsonSerializer.Serialize(payload, AfJson.Options), Encoding.UTF8, "application/json");
            using var response = await _httpClient.SendAsync(request, timeoutCts.Token);
            if (!response.IsSuccessStatusCode)
            {
                return (null, new[] { response.StatusCode == HttpStatusCode.Conflict
                    ? new AfError(AfErrorCodes.MasterSyncRequired, "Master document must be synchronized before saving.", true)
                    : MapGithubError(response.StatusCode, fullPath) });
            }

            var json = JsonNode.Parse(await response.Content.ReadAsStringAsync(timeoutCts.Token));
            var savedRevision = json?["content"]?["sha"]?.GetValue<string>();
            if (string.IsNullOrWhiteSpace(savedRevision))
            {
                return (null, new[] { new AfError(AfErrorCodes.MasterWriteFailed, "GitHub write result is ambiguous.", true) });
            }

            return (new MasterDocumentWriteResult(type, target, savedRevision), Array.Empty<AfError>());
        }
        catch (OperationCanceledException)
        {
            return (null, new[] { new AfError(AfErrorCodes.GithubTimeout, "GitHub access timed out.", true) });
        }
        catch (HttpRequestException)
        {
            return (null, new[] { new AfError(AfErrorCodes.GithubConnectionFailed, "GitHub connection failed.", true) });
        }
    }

    /// <summary>
    /// Recovery replacement を 1 Broken Resource に対する Git commit として反映する。
    /// </summary>
    /// <remarks>
    /// source/replacement path は Workout resource boundary 内に限定する。
    /// 同一 path は Contents API、path relocation は tree/commit/ref update を使い、force update や自動 merge は行わない。
    /// timeout 後は同じ replacement content が反映済みかだけを照合し、曖昧な結果は成功扱いしない。
    /// </remarks>
    public async Task<(RecoveryGitWriteResult? Result, IReadOnlyList<AfError> Errors)> PushRecoveryReplacementAsync(
        AfConfiguration configuration,
        string? token,
        string sourcePath,
        string expectedSourceRevision,
        string replacementPath,
        string replacementContent,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(sourcePath) ||
            string.IsNullOrWhiteSpace(expectedSourceRevision) ||
            string.IsNullOrWhiteSpace(replacementPath) ||
            string.IsNullOrWhiteSpace(replacementContent))
        {
            return (null, new[] { new AfError(AfErrorCodes.RecoveryWriteFailed, "Recovery write request is invalid.", true) });
        }

        if (!IsAllowedRecoveryWorkoutPath(configuration, sourcePath) ||
            !IsAllowedRecoveryWorkoutPath(configuration, replacementPath))
        {
            return (null, new[] { new AfError(AfErrorCodes.RecoveryWriteConflict, "Recovery path is outside the configured resource boundary.", true) });
        }

        try
        {
            using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            timeoutCts.CancelAfter(TimeSpan.FromSeconds(configuration.Timeouts.GithubRequestTimeoutSec));
            var source = await ReadGithubContentAsync(configuration, sourcePath, token, timeoutCts.Token);
            if (source.Errors.Count > 0)
            {
                return (null, source.Errors);
            }

            var sourceContent = DecodeGithubContent(source.Content!);
            if (sourceContent is null)
            {
                return (null, new[] { new AfError(AfErrorCodes.GithubServerError, "GitHub contents response is invalid.", true) });
            }

            if (!string.Equals(CreateContentRevision(sourceContent), expectedSourceRevision, StringComparison.Ordinal))
            {
                return (null, new[] { new AfError(AfErrorCodes.RecoveryWriteConflict, "Recovery source revision is stale.", true) });
            }

            return string.Equals(sourcePath, replacementPath, StringComparison.Ordinal)
                ? await PushRecoverySamePathAsync(configuration, token, sourcePath, source.Revision!, replacementContent, timeoutCts.Token)
                : await PushRecoveryRelocationAsync(configuration, token, sourcePath, replacementPath, replacementContent, timeoutCts.Token);
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            var reconciled = await TryReconcileRecoveryWriteAsync(configuration, token, sourcePath, replacementPath, replacementContent);
            return reconciled.Result is not null
                ? reconciled
                : (null, new[] { new AfError(AfErrorCodes.RecoveryWriteFailed, "Recovery write result is ambiguous.", true) });
        }
        catch (HttpRequestException)
        {
            return (null, new[] { new AfError(AfErrorCodes.GithubConnectionFailed, "GitHub connection failed.", true) });
        }
    }

    private async Task<(RecoveryGitWriteResult? Result, IReadOnlyList<AfError> Errors)> PushRecoverySamePathAsync(
        AfConfiguration configuration,
        string? token,
        string path,
        string remoteBlobRevision,
        string replacementContent,
        CancellationToken cancellationToken)
    {
        var contentsUrl = $"https://api.github.com/repos/{configuration.Repository.Owner}/{configuration.Repository.Repository}/contents/{EscapeRemotePath(path)}";
        using var request = CreateRequest(contentsUrl, token, HttpMethod.Put);
        request.Content = new StringContent(JsonSerializer.Serialize(new
        {
            message = "Recover workout resource",
            content = Convert.ToBase64String(Encoding.UTF8.GetBytes(replacementContent)),
            sha = remoteBlobRevision,
            branch = configuration.Repository.Ref
        }, AfJson.Options), Encoding.UTF8, "application/json");
        using var response = await _httpClient.SendAsync(request, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            return (null, new[] { response.StatusCode == HttpStatusCode.Conflict
                ? new AfError(AfErrorCodes.RecoveryWriteConflict, "Recovery source revision is stale.", true)
                : MapGithubError(response.StatusCode, path) });
        }

        var json = JsonNode.Parse(await response.Content.ReadAsStringAsync(cancellationToken));
        var savedRevision = json?["content"]?["sha"]?.GetValue<string>();
        var commitRevision = json?["commit"]?["sha"]?.GetValue<string>();
        if (string.IsNullOrWhiteSpace(savedRevision) || string.IsNullOrWhiteSpace(commitRevision))
        {
            return (null, new[] { new AfError(AfErrorCodes.RecoveryWriteFailed, "GitHub write result is ambiguous.", true) });
        }

        return (new RecoveryGitWriteResult(path, CreateContentRevision(replacementContent), commitRevision), Array.Empty<AfError>());
    }

    private async Task<(RecoveryGitWriteResult? Result, IReadOnlyList<AfError> Errors)> PushRecoveryRelocationAsync(
        AfConfiguration configuration,
        string? token,
        string sourcePath,
        string replacementPath,
        string replacementContent,
        CancellationToken cancellationToken)
    {
        var destination = await ReadGithubContentAsync(configuration, replacementPath, token, cancellationToken);
        if (destination.Errors.Count == 0)
        {
            return (null, new[] { new AfError(AfErrorCodes.RecoveryWriteConflict, "Recovery destination already exists.", true) });
        }

        if (destination.Errors.FirstOrDefault()?.Code != AfErrorCodes.GithubResourceNotFound)
        {
            return (null, destination.Errors);
        }

        var head = await ReadBranchHeadAsync(configuration, token, cancellationToken);
        if (head.Errors.Count > 0 || string.IsNullOrWhiteSpace(head.HeadSha))
        {
            return (null, head.Errors);
        }

        var tree = await ReadCommitTreeAsync(configuration, token, head.HeadSha!, cancellationToken);
        if (tree.Errors.Count > 0 || string.IsNullOrWhiteSpace(tree.TreeSha))
        {
            return (null, tree.Errors);
        }

        var blob = await CreateBlobAsync(configuration, token, replacementContent, cancellationToken);
        if (blob.Errors.Count > 0 || string.IsNullOrWhiteSpace(blob.BlobSha))
        {
            return (null, blob.Errors);
        }

        var nextTree = await CreateRecoveryTreeAsync(configuration, token, tree.TreeSha!, sourcePath, replacementPath, blob.BlobSha!, cancellationToken);
        if (nextTree.Errors.Count > 0 || string.IsNullOrWhiteSpace(nextTree.TreeSha))
        {
            return (null, nextTree.Errors);
        }

        var commit = await CreateRecoveryCommitAsync(configuration, token, head.HeadSha!, nextTree.TreeSha!, cancellationToken);
        if (commit.Errors.Count > 0 || string.IsNullOrWhiteSpace(commit.CommitSha))
        {
            return (null, commit.Errors);
        }

        var currentHead = await ReadBranchHeadAsync(configuration, token, cancellationToken);
        if (currentHead.Errors.Count > 0)
        {
            return (null, currentHead.Errors);
        }

        if (!string.Equals(currentHead.HeadSha, head.HeadSha, StringComparison.Ordinal))
        {
            return (null, new[] { new AfError(AfErrorCodes.RecoveryWriteConflict, "Remote repository changed before Recovery commit.", true) });
        }

        var updated = await UpdateBranchHeadAsync(configuration, token, commit.CommitSha!, cancellationToken);
        if (updated.Count > 0)
        {
            return (null, updated);
        }

        return (new RecoveryGitWriteResult(replacementPath, CreateContentRevision(replacementContent), commit.CommitSha!), Array.Empty<AfError>());
    }

    private async Task<(RecoveryGitWriteResult? Result, IReadOnlyList<AfError> Errors)> TryReconcileRecoveryWriteAsync(
        AfConfiguration configuration,
        string? token,
        string sourcePath,
        string replacementPath,
        string replacementContent)
    {
        using var timeoutCts = new CancellationTokenSource(TimeSpan.FromSeconds(Math.Max(1, configuration.Timeouts.GithubRequestTimeoutSec)));
        var expectedRevision = CreateContentRevision(replacementContent);
        var replacement = await ReadGithubContentAsync(configuration, replacementPath, token, timeoutCts.Token);
        if (replacement.Errors.Count > 0)
        {
            return (null, replacement.Errors);
        }

        var replacementDecoded = DecodeGithubContent(replacement.Content!);
        if (replacementDecoded is null || !string.Equals(CreateContentRevision(replacementDecoded), expectedRevision, StringComparison.Ordinal))
        {
            return (null, Array.Empty<AfError>());
        }

        if (!string.Equals(sourcePath, replacementPath, StringComparison.Ordinal))
        {
            var source = await ReadGithubContentAsync(configuration, sourcePath, token, timeoutCts.Token);
            if (source.Errors.Count == 0 || source.Errors.FirstOrDefault()?.Code != AfErrorCodes.GithubResourceNotFound)
            {
                return (null, Array.Empty<AfError>());
            }
        }

        var head = await ReadBranchHeadAsync(configuration, token, timeoutCts.Token);
        return string.IsNullOrWhiteSpace(head.HeadSha)
            ? (null, head.Errors)
            : (new RecoveryGitWriteResult(replacementPath, expectedRevision, head.HeadSha!), Array.Empty<AfError>());
    }

    private async Task<(IReadOnlyList<RuntimeSourceFile> Files, IReadOnlyList<AfError> Errors)> FetchDirectoryAsync(
        AfConfiguration configuration,
        ResourceConfiguration resource,
        string? token,
        CancellationToken cancellationToken)
    {
        var prefix = CombineRemote(configuration.Repository.RootPath, resource.Path);
        return await FetchDirectoryContentsAsync(configuration, prefix, token, cancellationToken);
    }

    private async Task<(IReadOnlyList<RuntimeSourceFile> Files, IReadOnlyList<AfError> Errors)> FetchDirectoryContentsAsync(
        AfConfiguration configuration,
        string directoryPath,
        string? token,
        CancellationToken cancellationToken)
    {
        var contentsUrl = $"https://api.github.com/repos/{configuration.Repository.Owner}/{configuration.Repository.Repository}/contents/{EscapeRemotePath(directoryPath)}?ref={Uri.EscapeDataString(configuration.Repository.Ref)}";
        using var request = CreateRequest(contentsUrl, token);
        using var response = await _httpClient.SendAsync(request, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            return (Array.Empty<RuntimeSourceFile>(), new[] { MapGithubError(response.StatusCode, directoryPath) });
        }

        var json = await response.Content.ReadAsStringAsync(cancellationToken);
        var entries = JsonNode.Parse(json)?.AsArray();
        if (entries is null)
        {
            return (Array.Empty<RuntimeSourceFile>(), new[] { new AfError(AfErrorCodes.GithubServerError, "GitHub contents response is invalid.", true) });
        }

        var files = new List<RuntimeSourceFile>();
        var errors = new List<AfError>();
        foreach (var entry in entries)
        {
            var type = entry?["type"]?.GetValue<string>();
            var path = entry?["path"]?.GetValue<string>();
            if (string.IsNullOrWhiteSpace(type) || string.IsNullOrWhiteSpace(path))
            {
                errors.Add(new AfError(AfErrorCodes.GithubServerError, "GitHub contents response is invalid.", true));
                break;
            }

            if (type == "dir")
            {
                var nested = await FetchDirectoryContentsAsync(configuration, path, token, cancellationToken);
                if (nested.Errors.Count > 0)
                {
                    errors.AddRange(nested.Errors);
                    break;
                }

                files.AddRange(nested.Files);
                continue;
            }

            if (type == "file" && IsJsonRuntimePath(path))
            {
                var fetched = await FetchRawPathAsync(configuration, path, token, cancellationToken);
                if (fetched.Error is not null)
                {
                    errors.Add(fetched.Error);
                    break;
                }

                files.Add(fetched.File!);
            }
        }

        return errors.Count == 0 ? (files, errors) : (Array.Empty<RuntimeSourceFile>(), errors);
    }

    private async Task<(IReadOnlyList<RuntimeSourceFile> Files, IReadOnlyList<AfError> Errors)> FetchFileAsync(
        AfConfiguration configuration,
        string path,
        string? token,
        CancellationToken cancellationToken)
    {
        var fullPath = CombineRemote(configuration.Repository.RootPath, path);
        var fetched = await FetchRawPathAsync(configuration, fullPath, token, cancellationToken);
        return fetched.Error is null
            ? (new[] { fetched.File! }, Array.Empty<AfError>())
            : (Array.Empty<RuntimeSourceFile>(), new[] { fetched.Error });
    }

    private async Task<(RuntimeSourceFile? File, AfError? Error)> FetchRawPathAsync(
        AfConfiguration configuration,
        string path,
        string? token,
        CancellationToken cancellationToken)
    {
        var content = await ReadGithubContentAsync(configuration, path, token, cancellationToken);
        if (content.Errors.Count > 0)
        {
            return (null, content.Errors.First());
        }

        var decoded = DecodeGithubContent(content.Content!);
        if (decoded is null)
        {
            return (null, new AfError(AfErrorCodes.GithubServerError, "GitHub contents response is invalid.", true));
        }

        return (new RuntimeSourceFile(path, decoded, CreateContentRevision(decoded)), null);
    }

    private async Task<(string? Revision, string? Content, IReadOnlyList<AfError> Errors)> ReadGithubContentAsync(
        AfConfiguration configuration,
        string fullPath,
        string? token,
        CancellationToken cancellationToken)
    {
        var contentsUrl = $"https://api.github.com/repos/{configuration.Repository.Owner}/{configuration.Repository.Repository}/contents/{EscapeRemotePath(fullPath)}?ref={Uri.EscapeDataString(configuration.Repository.Ref)}";
        using var request = CreateRequest(contentsUrl, token);
        using var response = await _httpClient.SendAsync(request, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            return (null, null, new[] { MapGithubError(response.StatusCode, fullPath) });
        }

        var json = JsonNode.Parse(await response.Content.ReadAsStringAsync(cancellationToken));
        var revision = json?["sha"]?.GetValue<string>();
        var content = json?["content"]?.GetValue<string>();
        if (string.IsNullOrWhiteSpace(revision) || string.IsNullOrWhiteSpace(content))
        {
            return (null, null, new[] { new AfError(AfErrorCodes.GithubServerError, "GitHub contents response is invalid.", true) });
        }

        return (revision, content, Array.Empty<AfError>());
    }

    private async Task<(string? HeadSha, IReadOnlyList<AfError> Errors)> ReadBranchHeadAsync(
        AfConfiguration configuration,
        string? token,
        CancellationToken cancellationToken)
    {
        var refPath = NormalizeGitBranchRef(configuration.Repository.Ref);
        var url = $"https://api.github.com/repos/{configuration.Repository.Owner}/{configuration.Repository.Repository}/git/ref/{EscapeRemotePath(refPath)}";
        using var request = CreateRequest(url, token);
        using var response = await _httpClient.SendAsync(request, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            return (null, new[] { MapGithubError(response.StatusCode, refPath) });
        }

        var json = JsonNode.Parse(await response.Content.ReadAsStringAsync(cancellationToken));
        var sha = json?["object"]?["sha"]?.GetValue<string>();
        return string.IsNullOrWhiteSpace(sha)
            ? (null, new[] { new AfError(AfErrorCodes.GithubServerError, "GitHub ref response is invalid.", true) })
            : (sha, Array.Empty<AfError>());
    }

    private async Task<(string? TreeSha, IReadOnlyList<AfError> Errors)> ReadCommitTreeAsync(
        AfConfiguration configuration,
        string? token,
        string commitSha,
        CancellationToken cancellationToken)
    {
        var url = $"https://api.github.com/repos/{configuration.Repository.Owner}/{configuration.Repository.Repository}/git/commits/{Uri.EscapeDataString(commitSha)}";
        using var request = CreateRequest(url, token);
        using var response = await _httpClient.SendAsync(request, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            return (null, new[] { MapGithubError(response.StatusCode, commitSha) });
        }

        var json = JsonNode.Parse(await response.Content.ReadAsStringAsync(cancellationToken));
        var sha = json?["tree"]?["sha"]?.GetValue<string>();
        return string.IsNullOrWhiteSpace(sha)
            ? (null, new[] { new AfError(AfErrorCodes.GithubServerError, "GitHub commit response is invalid.", true) })
            : (sha, Array.Empty<AfError>());
    }

    private async Task<(string? BlobSha, IReadOnlyList<AfError> Errors)> CreateBlobAsync(
        AfConfiguration configuration,
        string? token,
        string content,
        CancellationToken cancellationToken)
    {
        var url = $"https://api.github.com/repos/{configuration.Repository.Owner}/{configuration.Repository.Repository}/git/blobs";
        using var request = CreateRequest(url, token, HttpMethod.Post);
        request.Content = new StringContent(JsonSerializer.Serialize(new
        {
            content,
            encoding = "utf-8"
        }, AfJson.Options), Encoding.UTF8, "application/json");
        using var response = await _httpClient.SendAsync(request, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            return (null, new[] { MapGithubError(response.StatusCode, "git/blobs") });
        }

        var json = JsonNode.Parse(await response.Content.ReadAsStringAsync(cancellationToken));
        var sha = json?["sha"]?.GetValue<string>();
        return string.IsNullOrWhiteSpace(sha)
            ? (null, new[] { new AfError(AfErrorCodes.GithubServerError, "GitHub blob response is invalid.", true) })
            : (sha, Array.Empty<AfError>());
    }

    private async Task<(string? TreeSha, IReadOnlyList<AfError> Errors)> CreateRecoveryTreeAsync(
        AfConfiguration configuration,
        string? token,
        string baseTreeSha,
        string sourcePath,
        string replacementPath,
        string replacementBlobSha,
        CancellationToken cancellationToken)
    {
        var url = $"https://api.github.com/repos/{configuration.Repository.Owner}/{configuration.Repository.Repository}/git/trees";
        using var request = CreateRequest(url, token, HttpMethod.Post);
        var tree = new JsonArray
        {
            new JsonObject
            {
                ["path"] = NormalizeRemotePath(replacementPath),
                ["mode"] = "100644",
                ["type"] = "blob",
                ["sha"] = replacementBlobSha
            },
            new JsonObject
            {
                ["path"] = NormalizeRemotePath(sourcePath),
                ["mode"] = "100644",
                ["type"] = "blob",
                ["sha"] = null
            }
        };
        request.Content = new StringContent(JsonSerializer.Serialize(new JsonObject
        {
            ["base_tree"] = baseTreeSha,
            ["tree"] = tree
        }, AfJson.Options), Encoding.UTF8, "application/json");
        using var response = await _httpClient.SendAsync(request, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            return (null, new[] { response.StatusCode == HttpStatusCode.Conflict
                ? new AfError(AfErrorCodes.RecoveryWriteConflict, "Recovery tree could not be created.", true)
                : MapGithubError(response.StatusCode, "git/trees") });
        }

        var json = JsonNode.Parse(await response.Content.ReadAsStringAsync(cancellationToken));
        var sha = json?["sha"]?.GetValue<string>();
        return string.IsNullOrWhiteSpace(sha)
            ? (null, new[] { new AfError(AfErrorCodes.GithubServerError, "GitHub tree response is invalid.", true) })
            : (sha, Array.Empty<AfError>());
    }

    private async Task<(string? CommitSha, IReadOnlyList<AfError> Errors)> CreateRecoveryCommitAsync(
        AfConfiguration configuration,
        string? token,
        string parentSha,
        string treeSha,
        CancellationToken cancellationToken)
    {
        var url = $"https://api.github.com/repos/{configuration.Repository.Owner}/{configuration.Repository.Repository}/git/commits";
        using var request = CreateRequest(url, token, HttpMethod.Post);
        request.Content = new StringContent(JsonSerializer.Serialize(new
        {
            message = "Recover workout resource",
            tree = treeSha,
            parents = new[] { parentSha }
        }, AfJson.Options), Encoding.UTF8, "application/json");
        using var response = await _httpClient.SendAsync(request, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            return (null, new[] { MapGithubError(response.StatusCode, "git/commits") });
        }

        var json = JsonNode.Parse(await response.Content.ReadAsStringAsync(cancellationToken));
        var sha = json?["sha"]?.GetValue<string>();
        return string.IsNullOrWhiteSpace(sha)
            ? (null, new[] { new AfError(AfErrorCodes.GithubServerError, "GitHub commit response is invalid.", true) })
            : (sha, Array.Empty<AfError>());
    }

    private async Task<IReadOnlyList<AfError>> UpdateBranchHeadAsync(
        AfConfiguration configuration,
        string? token,
        string commitSha,
        CancellationToken cancellationToken)
    {
        var refPath = NormalizeGitBranchRef(configuration.Repository.Ref);
        var url = $"https://api.github.com/repos/{configuration.Repository.Owner}/{configuration.Repository.Repository}/git/refs/{EscapeRemotePath(refPath)}";
        using var request = CreateRequest(url, token, new HttpMethod("PATCH"));
        request.Content = new StringContent(JsonSerializer.Serialize(new
        {
            sha = commitSha,
            force = false
        }, AfJson.Options), Encoding.UTF8, "application/json");
        using var response = await _httpClient.SendAsync(request, cancellationToken);
        if (response.IsSuccessStatusCode)
        {
            return Array.Empty<AfError>();
        }

        return new[] { response.StatusCode == HttpStatusCode.Conflict
            ? new AfError(AfErrorCodes.RecoveryWriteConflict, "Remote repository changed before Recovery commit.", true)
            : MapGithubError(response.StatusCode, refPath) };
    }

    private async Task<(string? Content, IReadOnlyList<AfError> Errors)> ReadOtherMasterDocumentAsync(
        AfConfiguration configuration,
        string? token,
        string type,
        CancellationToken cancellationToken)
    {
        var other = MasterWriteTargets.First(target => target.Key != type);
        var fullPath = CombineRemote(configuration.Repository.RootPath, other.Value);
        var remote = await ReadGithubContentAsync(configuration, fullPath, token, cancellationToken);
        if (remote.Errors.Count > 0)
        {
            return (null, remote.Errors);
        }

        var content = DecodeGithubContent(remote.Content!);
        return content is null
            ? (null, new[] { new AfError(AfErrorCodes.GithubServerError, "GitHub contents response is invalid.", true) })
            : (content, Array.Empty<AfError>());
    }

    private static bool TryGetMasterWriteTarget(string type, out string target)
    {
        if (MasterWriteTargets.TryGetValue(type, out var value))
        {
            target = value;
            return true;
        }

        target = "";
        return false;
    }

    private static string BuildMasterCommitMessage(string type, string path)
    {
        var subject = type == "MACHINE_MASTER" ? "machine" : "gym";
        var fileName = Path.GetFileName(path.Replace('/', Path.DirectorySeparatorChar));
        return $"Update {subject} master: {fileName}";
    }

    private static string CreateContentRevision(string content)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(content));
        return "content-sha256-" + Convert.ToHexString(bytes).ToLowerInvariant();
    }

    private static IReadOnlyList<AfError> ValidateMasterLifecycleTransition(string type, string currentEncodedContent, string nextContent)
    {
        if (type != "GYM_MASTER")
        {
            return Array.Empty<AfError>();
        }

        try
        {
            var currentContent = DecodeGithubContent(currentEncodedContent);
            if (currentContent is null)
            {
                return new[] { new AfError(AfErrorCodes.GithubServerError, "GitHub contents response is invalid.", true) };
            }

            var currentConfigured = HasMainGym(currentContent);
            var nextConfigured = HasMainGym(nextContent);
            return currentConfigured && !nextConfigured
                ? new[] { new AfError(AfErrorCodes.MasterWriteInvalid, "Configured Main Gym cannot be cleared.", true) }
                : Array.Empty<AfError>();
        }
        catch
        {
            return new[] { new AfError(AfErrorCodes.MasterWriteInvalid, "Master document lifecycle transition is invalid.", true) };
        }
    }

    private static bool HasMainGym(string content)
    {
        var document = JsonNode.Parse(content)?.AsObject();
        return document?["gyms"]?.AsArray()
            .OfType<JsonObject>()
            .Any(gym => gym["main"]?.GetValue<bool>() == true) == true;
    }

    private static string? DecodeGithubContent(string content)
    {
        try
        {
            return Encoding.UTF8.GetString(Convert.FromBase64String(content.Replace("\n", "").Replace("\r", "")));
        }
        catch (FormatException)
        {
            return null;
        }
    }

    private static HttpRequestMessage CreateRequest(string url, string? token, HttpMethod? method = null)
    {
        var request = new HttpRequestMessage(method ?? HttpMethod.Get, url);
        request.Headers.UserAgent.ParseAdd("Atlament-Windows-AF");
        if (!string.IsNullOrWhiteSpace(token))
        {
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        }

        return request;
    }

    private static AfError MapGithubError(HttpStatusCode statusCode, string path) => statusCode switch
    {
        HttpStatusCode.Unauthorized => new AfError(AfErrorCodes.GithubUnauthorized, "GitHub token is unauthorized.", true),
        HttpStatusCode.Forbidden => new AfError(AfErrorCodes.GithubForbidden, "GitHub access is forbidden.", true),
        HttpStatusCode.NotFound => new AfError(AfErrorCodes.GithubResourceNotFound, $"GitHub resource not found: {path}.", true),
        (HttpStatusCode)429 => new AfError(AfErrorCodes.GithubRateLimit, "GitHub rate limit reached.", true),
        _ => new AfError(AfErrorCodes.GithubServerError, "GitHub server error.", true)
    };

    private static string CombineRemote(string root, string path) =>
        string.Join("/", new[] { NormalizeRemotePath(root), NormalizeRemotePath(path) }.Where(value => value.Length > 0));

    private static string NormalizeRemotePath(string value) =>
        string.Join("/", value
            .Replace('\\', '/')
            .Trim()
            .Split('/', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries));

    private static string NormalizeGitBranchRef(string value)
    {
        var normalized = value.Trim();
        if (normalized.StartsWith("refs/", StringComparison.Ordinal))
        {
            return normalized["refs/".Length..];
        }

        if (normalized.StartsWith("heads/", StringComparison.Ordinal))
        {
            return normalized;
        }

        return "heads/" + normalized;
    }

    private static bool IsAllowedRecoveryWorkoutPath(AfConfiguration configuration, string path)
    {
        var normalized = NormalizeRemotePath(path);
        if (normalized.Length == 0 ||
            normalized.Contains("../", StringComparison.Ordinal) ||
            normalized.Contains("/..", StringComparison.Ordinal) ||
            normalized == ".." ||
            !IsJsonRuntimePath(normalized))
        {
            return false;
        }

        return configuration.Resources
            .Where(resource => resource.Type == "WORKOUT")
            .Select(resource => resource.ResourceKind == "directory"
                ? NormalizeRemotePath(CombineRemote(configuration.Repository.RootPath, resource.Path)).TrimEnd('/') + "/"
                : NormalizeRemotePath(CombineRemote(configuration.Repository.RootPath, resource.Path)))
            .Any(boundary => boundary.EndsWith("/", StringComparison.Ordinal)
                ? normalized.StartsWith(boundary, StringComparison.Ordinal)
                : string.Equals(normalized, boundary, StringComparison.Ordinal));
    }

    private static string EscapeRemotePath(string path) =>
        string.Join("/", NormalizeRemotePath(path).Split('/', StringSplitOptions.RemoveEmptyEntries).Select(Uri.EscapeDataString));

    private static bool IsJsonRuntimePath(string path) =>
        path.EndsWith(".json", StringComparison.OrdinalIgnoreCase) ||
        path.EndsWith(".jsonl", StringComparison.OrdinalIgnoreCase);
}

