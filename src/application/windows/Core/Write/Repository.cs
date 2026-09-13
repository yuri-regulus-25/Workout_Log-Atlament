using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace Atlament.Core.Write;

internal interface IRepository
{
    Task<RepositoryResult<string>> ReadHeadAsync(AfConfiguration configuration, string? token, CancellationToken cancellationToken);
    Task<RepositoryResult<CommitResult>> CommitAsync(AfConfiguration configuration, string? token, string expectedHead, string message, IReadOnlyList<ResourceChange> changes, CancellationToken cancellationToken);
}

/// <summary>Workout mutation の optimistic concurrency と atomic Git commit を所有する。</summary>
internal sealed class Repository : IRepository
{
    private readonly HttpClient _httpClient;

    public Repository() : this(new HttpClient()) { }

    internal Repository(HttpClient httpClient)
    {
        _httpClient = httpClient;
        if (!_httpClient.DefaultRequestHeaders.UserAgent.Any())
        {
            _httpClient.DefaultRequestHeaders.UserAgent.ParseAdd("Atlament-Workout-Write/3.1");
        }
    }

    public async Task<RepositoryResult<string>> ReadHeadAsync(AfConfiguration configuration, string? token, CancellationToken cancellationToken)
    {
        try
        {
            var branchRef = NormalizeBranchRef(configuration.Repository.Ref);
            var response = await SendAsync(configuration, token, HttpMethod.Get, $"git/ref/{Escape(branchRef)}", null, cancellationToken);
            if (!response.IsSuccessStatusCode) return Failure<string>(response.StatusCode, "repository head");
            var json = JsonNode.Parse(await response.Content.ReadAsStringAsync(cancellationToken));
            var sha = json?["object"]?["sha"]?.GetValue<string>();
            return string.IsNullOrWhiteSpace(sha)
                ? Failed<string>(AfErrorCodes.WorkoutWriteFailed, "GitHub ref response is invalid.")
                : new RepositoryResult<string>(sha, Array.Empty<AfError>());
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            return Failed<string>(AfErrorCodes.GithubTimeout, "GitHub request timed out.");
        }
        catch (HttpRequestException)
        {
            return Failed<string>(AfErrorCodes.GithubConnectionFailed, "GitHub connection failed.");
        }
    }

    public async Task<RepositoryResult<CommitResult>> CommitAsync(
        AfConfiguration configuration,
        string? token,
        string expectedHead,
        string message,
        IReadOnlyList<ResourceChange> changes,
        CancellationToken cancellationToken)
    {
        try
        {
            using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            timeout.CancelAfter(TimeSpan.FromSeconds(configuration.Timeouts.GithubRequestTimeoutSec));
            var head = await ReadHeadAsync(configuration, token, timeout.Token);
            if (head.Value is null) return new RepositoryResult<CommitResult>(null, head.Errors);
            if (!string.Equals(head.Value, expectedHead, StringComparison.Ordinal))
            {
                return Failed<CommitResult>(AfErrorCodes.WorkoutRepositoryConflict, "Remote repository changed before Workout commit.");
            }

            var commitResponse = await SendAsync(configuration, token, HttpMethod.Get, $"git/commits/{Escape(expectedHead)}", null, timeout.Token);
            if (!commitResponse.IsSuccessStatusCode) return Failure<CommitResult>(commitResponse.StatusCode, expectedHead);
            var commitJson = JsonNode.Parse(await commitResponse.Content.ReadAsStringAsync(timeout.Token));
            var baseTree = commitJson?["tree"]?["sha"]?.GetValue<string>();
            if (string.IsNullOrWhiteSpace(baseTree)) return Failed<CommitResult>(AfErrorCodes.WorkoutWriteFailed, "GitHub commit response is invalid.");

            var entries = new JsonArray();
            foreach (var change in changes)
            {
                string? blobSha = null;
                if (change.Content is not null)
                {
                    var blobResponse = await SendAsync(configuration, token, HttpMethod.Post, "git/blobs", new JsonObject
                    {
                        ["content"] = change.Content,
                        ["encoding"] = "utf-8"
                    }, timeout.Token);
                    if (!blobResponse.IsSuccessStatusCode) return Failure<CommitResult>(blobResponse.StatusCode, change.Path);
                    blobSha = JsonNode.Parse(await blobResponse.Content.ReadAsStringAsync(timeout.Token))?["sha"]?.GetValue<string>();
                    if (string.IsNullOrWhiteSpace(blobSha)) return Failed<CommitResult>(AfErrorCodes.WorkoutWriteFailed, "GitHub blob response is invalid.");
                }
                entries.Add(new JsonObject
                {
                    ["path"] = NormalizePath(change.Path),
                    ["mode"] = "100644",
                    ["type"] = "blob",
                    ["sha"] = blobSha
                });
            }

            var treeResponse = await SendAsync(configuration, token, HttpMethod.Post, "git/trees", new JsonObject
            {
                ["base_tree"] = baseTree,
                ["tree"] = entries
            }, timeout.Token);
            if (!treeResponse.IsSuccessStatusCode) return Failure<CommitResult>(treeResponse.StatusCode, "git tree");
            var treeSha = JsonNode.Parse(await treeResponse.Content.ReadAsStringAsync(timeout.Token))?["sha"]?.GetValue<string>();
            if (string.IsNullOrWhiteSpace(treeSha)) return Failed<CommitResult>(AfErrorCodes.WorkoutWriteFailed, "GitHub tree response is invalid.");

            var newCommitResponse = await SendAsync(configuration, token, HttpMethod.Post, "git/commits", new JsonObject
            {
                ["message"] = message,
                ["tree"] = treeSha,
                ["parents"] = new JsonArray(expectedHead)
            }, timeout.Token);
            if (!newCommitResponse.IsSuccessStatusCode) return Failure<CommitResult>(newCommitResponse.StatusCode, "git commit");
            var commitSha = JsonNode.Parse(await newCommitResponse.Content.ReadAsStringAsync(timeout.Token))?["sha"]?.GetValue<string>();
            if (string.IsNullOrWhiteSpace(commitSha)) return Failed<CommitResult>(AfErrorCodes.WorkoutWriteResultAmbiguous, "GitHub write result is ambiguous.");

            var current = await ReadHeadAsync(configuration, token, timeout.Token);
            if (current.Value is null) return new RepositoryResult<CommitResult>(null, current.Errors);
            if (!string.Equals(current.Value, expectedHead, StringComparison.Ordinal))
            {
                return Failed<CommitResult>(AfErrorCodes.WorkoutRepositoryConflict, "Remote repository changed before Workout commit.");
            }

            var branchRef = NormalizeBranchRef(configuration.Repository.Ref);
            var update = await SendAsync(configuration, token, HttpMethod.Patch, $"git/refs/{Escape(branchRef)}", new JsonObject
            {
                ["sha"] = commitSha,
                ["force"] = false
            }, timeout.Token);
            if (!update.IsSuccessStatusCode)
            {
                return update.StatusCode is HttpStatusCode.Conflict or HttpStatusCode.UnprocessableEntity
                    ? Failed<CommitResult>(AfErrorCodes.WorkoutRepositoryConflict, "Remote repository changed before Workout commit.")
                    : Failure<CommitResult>(update.StatusCode, "git ref");
            }
            return new RepositoryResult<CommitResult>(new CommitResult(commitSha), Array.Empty<AfError>());
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            return Failed<CommitResult>(AfErrorCodes.WorkoutWriteResultAmbiguous, "GitHub write result is ambiguous.");
        }
        catch (HttpRequestException)
        {
            return Failed<CommitResult>(AfErrorCodes.WorkoutWriteResultAmbiguous, "GitHub write result is ambiguous.");
        }
    }

    private async Task<HttpResponseMessage> SendAsync(AfConfiguration configuration, string? token, HttpMethod method, string path, JsonNode? body, CancellationToken cancellationToken)
    {
        var url = $"https://api.github.com/repos/{Escape(configuration.Repository.Owner)}/{Escape(configuration.Repository.Repository)}/{path}";
        using var request = new HttpRequestMessage(method, url);
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/vnd.github+json"));
        request.Headers.Add("X-GitHub-Api-Version", "2022-11-28");
        if (!string.IsNullOrWhiteSpace(token)) request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        if (body is not null) request.Content = new StringContent(body.ToJsonString(AfJson.RepositoryJsonlWriteOptions), Encoding.UTF8, "application/json");
        return await _httpClient.SendAsync(request, cancellationToken);
    }

    private static RepositoryResult<T> Failure<T>(HttpStatusCode status, string target) where T : class => status switch
    {
        HttpStatusCode.Unauthorized => Failed<T>(AfErrorCodes.GithubUnauthorized, "GitHub authentication failed."),
        HttpStatusCode.Forbidden => Failed<T>(AfErrorCodes.GithubForbidden, "GitHub access is forbidden."),
        HttpStatusCode.NotFound => Failed<T>(AfErrorCodes.GithubResourceNotFound, $"GitHub resource was not found: {target}."),
        HttpStatusCode.Conflict or HttpStatusCode.UnprocessableEntity => Failed<T>(AfErrorCodes.WorkoutRepositoryConflict, "Remote repository changed before Workout commit."),
        (HttpStatusCode)429 => Failed<T>(AfErrorCodes.GithubRateLimit, "GitHub rate limit was exceeded."),
        _ => Failed<T>(AfErrorCodes.WorkoutWriteFailed, "Workout write failed.")
    };

    private static RepositoryResult<T> Failed<T>(string code, string message) where T : class =>
        new(null, new[] { new AfError(code, message, true) });

    private static string NormalizeBranchRef(string value)
    {
        var normalized = value.Trim().Replace('\\', '/').Trim('/');
        if (normalized.StartsWith("refs/", StringComparison.Ordinal)) normalized = normalized[5..];
        return normalized.StartsWith("heads/", StringComparison.Ordinal) ? normalized : "heads/" + normalized;
    }

    private static string NormalizePath(string value) => value.Replace('\\', '/').Trim('/');
    private static string Escape(string value) => string.Join('/', value.Split('/').Select(Uri.EscapeDataString));
}
