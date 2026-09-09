package jp.yuri_regulus_25.atlament

internal class AfException(val code: String, override val message: String) : Exception(message)

internal fun androidNormalizeGitBranchRef(ref: String): String {
    val trimmed = ref.trim().trim('/')
    return when {
        trimmed.isBlank() -> "heads/main"
        trimmed.startsWith("refs/") -> trimmed.removePrefix("refs/")
        trimmed.startsWith("heads/") || trimmed.startsWith("tags/") -> trimmed
        else -> "heads/$trimmed"
    }
}

internal fun androidMapGithubError(status: Int, path: String): AfException = when (status) {
    401 -> AfException("GITHUB_UNAUTHORIZED", "GitHub token is unauthorized.")
    403 -> AfException("GITHUB_FORBIDDEN", "GitHub access is forbidden.")
    404 -> AfException("GITHUB_RESOURCE_NOT_FOUND", "GitHub resource not found: $path.")
    429 -> AfException("GITHUB_RATE_LIMIT", "GitHub rate limit reached.")
    else -> AfException("GITHUB_CONNECTION_FAILED", "GitHub server error: HTTP $status.")
}
