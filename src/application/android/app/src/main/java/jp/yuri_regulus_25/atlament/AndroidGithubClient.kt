package jp.yuri_regulus_25.atlament

import android.util.Base64
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import java.nio.charset.StandardCharsets
import java.security.MessageDigest
import org.json.JSONArray
import org.json.JSONObject

/**
 * Android AF が使用する GitHub REST/GraphQL I/O 境界。
 *
 * token は provider から都度取得し、client 自体では保持しない。
 * Master write と Recovery write は expected revision と固定 commit message を使い、
 * Frontend から任意 path、任意 commit message、汎用 Git 操作を指示できない契約にする。
 */
internal data class WorkoutRepositoryChange(val path: String, val content: String?)
internal enum class WorkoutCommitReconciliationState { COMMITTED, NOT_COMMITTED, UNKNOWN }
internal data class WorkoutCommitReconciliation(val state: WorkoutCommitReconciliationState, val revision: String? = null)
internal data class WorkoutCommitCandidate(val revision: String, val message: String, val parents: Set<String>)
internal data class WorkoutCommitComparison(val status: String, val commits: List<WorkoutCommitCandidate>, val files: Map<String, String>)
internal class WorkoutMutationOutcomeUnknownException(cause: Throwable? = null) : Exception(cause)

/** Repository readを注入してambiguous mutationの判定だけを担う。 */
internal class WorkoutCommitReconciler(
    private val readHead: () -> String,
    private val compare: (String, String) -> WorkoutCommitComparison,
    private val readContent: (String, String) -> String?
) {
    fun reconcile(expectedHead: String, message: String, changes: List<WorkoutRepositoryChange>): WorkoutCommitReconciliation {
        return try {
            val currentHead = readHead()
            if (currentHead == expectedHead) return WorkoutCommitReconciliation(WorkoutCommitReconciliationState.NOT_COMMITTED)
            val history = compare(expectedHead, currentHead)
            if (history.status != "ahead") return WorkoutCommitReconciliation(WorkoutCommitReconciliationState.NOT_COMMITTED)
            val candidate = history.commits.firstOrNull { expectedHead in it.parents }
                ?: return WorkoutCommitReconciliation(WorkoutCommitReconciliationState.NOT_COMMITTED)
            if (candidate.message != message) return WorkoutCommitReconciliation(WorkoutCommitReconciliationState.NOT_COMMITTED)
            val candidateComparison = if (candidate.revision == currentHead && history.commits.size == 1) history else compare(expectedHead, candidate.revision)
            val expected = changes.associateBy { normalizeWorkoutPath(it.path) }
            if (candidateComparison.files.keys != expected.keys) return WorkoutCommitReconciliation(WorkoutCommitReconciliationState.NOT_COMMITTED)
            for ((path, change) in expected) {
                val status = candidateComparison.files.getValue(path)
                if (change.content == null) {
                    if (status != "removed" || readContent(path, candidate.revision) != null) {
                        return WorkoutCommitReconciliation(WorkoutCommitReconciliationState.NOT_COMMITTED)
                    }
                } else if (status !in setOf("added", "modified") || readContent(path, candidate.revision) != change.content) {
                    return WorkoutCommitReconciliation(WorkoutCommitReconciliationState.NOT_COMMITTED)
                }
            }
            WorkoutCommitReconciliation(WorkoutCommitReconciliationState.COMMITTED, candidate.revision)
        } catch (_: Exception) {
            WorkoutCommitReconciliation(WorkoutCommitReconciliationState.UNKNOWN)
        }
    }
}

internal class AndroidGithubClient(
    private val tokenProvider: () -> String?
) {
    fun readContentFile(configuration: JSONObject, path: String): GithubContent {
        val repository = configuration.getJSONObject("repository")
        val owner = repository.optString("owner").trim()
        val repo = repository.optString("repository").trim()
        val ref = repository.optString("ref", "main").trim().ifEmpty { "main" }
        val timeoutSec = configuration.optJSONObject("timeouts")?.optInt("githubRequestTimeoutSec", 10) ?: 10
        val url = "https://api.github.com/repos/${urlPath(owner)}/${urlPath(repo)}/contents/${escapeRemotePath(path)}?ref=${urlPath(ref)}"
        val response = JSONObject(httpGet(url, timeoutSec, path))
        val encoded = response.optString("content").replace("\\s".toRegex(), "")
        val revision = response.optString("sha").trim()
        if (encoded.isBlank() || revision.isBlank()) throw AfException("GITHUB_SERVER_ERROR", "GitHub contents response is invalid.")
        val content = String(Base64.decode(encoded, Base64.DEFAULT), StandardCharsets.UTF_8)
        return GithubContent(revision, content)
    }

    /**
     * GitHub Contents API で Master document を revision 一致時だけ更新する。
     */
    fun writeContentFile(
        configuration: JSONObject,
        path: String,
        revision: String,
        content: String,
        commitMessage: String
    ): String {
        val repository = configuration.getJSONObject("repository")
        val owner = repository.optString("owner").trim()
        val repo = repository.optString("repository").trim()
        val branch = repository.optString("ref", "main").trim().ifEmpty { "main" }
        val timeoutSec = configuration.optJSONObject("timeouts")?.optInt("githubRequestTimeoutSec", 10) ?: 10
        val payload = JSONObject()
            .put("message", commitMessage)
            .put("content", Base64.encodeToString(content.toByteArray(StandardCharsets.UTF_8), Base64.NO_WRAP))
            .put("sha", revision)
            .put("branch", branch)
            .toString()
        val url = "https://api.github.com/repos/${urlPath(owner)}/${urlPath(repo)}/contents/${escapeRemotePath(path)}"
        val connection = (URL(url).openConnection() as HttpURLConnection).apply {
            requestMethod = "PUT"
            connectTimeout = timeoutSec * 1000
            readTimeout = timeoutSec * 1000
            doOutput = true
            setRequestProperty("User-Agent", "Atlament-Android-AF")
            setRequestProperty("Content-Type", "application/json")
            tokenProvider()?.takeIf { it.isNotBlank() }?.let { setRequestProperty("Authorization", "Bearer $it") }
        }
        return try {
            connection.outputStream.use { it.write(payload.toByteArray(StandardCharsets.UTF_8)) }
            val status = connection.responseCode
            if (status !in 200..299) {
                if (status == 409) throw AfException("MASTER_SYNC_REQUIRED", "Master document must be synchronized before saving.")
                throw androidMapGithubError(status, path)
            }
            val response = connection.inputStream.bufferedReader(StandardCharsets.UTF_8).use { it.readText() }
            val savedRevision = JSONObject(response).optJSONObject("content")?.optString("sha").orEmpty().trim()
            if (savedRevision.isBlank()) throw AfException("MASTER_WRITE_FAILED", "GitHub write result is ambiguous.")
            savedRevision
        } finally {
            connection.disconnect()
        }
    }

    /**
     * 同一 path の Recovery replacement を 1 GitHub commit として保存する。
     */
    fun writeRecoveryContentFile(
        configuration: JSONObject,
        path: String,
        expectedSourceRevision: String,
        replacementContent: String
    ): RecoveryGitWriteResult {
        val source = readContentFile(configuration, path)
        if (contentRevision(source.content) != expectedSourceRevision) {
            throw AfException("RECOVERY_WRITE_CONFLICT", "Recovery source revision is stale.")
        }

        val repository = configuration.getJSONObject("repository")
        val owner = repository.optString("owner").trim()
        val repo = repository.optString("repository").trim()
        val ref = repository.optString("ref", "main").trim().ifEmpty { "main" }
        val timeoutSec = configuration.optJSONObject("timeouts")?.optInt("githubRequestTimeoutSec", 10) ?: 10
        val payload = JSONObject()
            .put("message", "Recover workout resource")
            .put("content", Base64.encodeToString(replacementContent.toByteArray(StandardCharsets.UTF_8), Base64.NO_WRAP))
            .put("sha", source.revision)
            .put("branch", ref)
            .toString()
        val url = "https://api.github.com/repos/${urlPath(owner)}/${urlPath(repo)}/contents/${escapeRemotePath(path)}"
        val connection = (URL(url).openConnection() as HttpURLConnection).apply {
            requestMethod = "PUT"
            connectTimeout = timeoutSec * 1000
            readTimeout = timeoutSec * 1000
            doOutput = true
            setRequestProperty("User-Agent", "Atlament-Android-AF")
            setRequestProperty("Content-Type", "application/json")
            tokenProvider()?.takeIf { it.isNotBlank() }?.let { setRequestProperty("Authorization", "Bearer $it") }
        }
        return try {
            connection.outputStream.use { it.write(payload.toByteArray(StandardCharsets.UTF_8)) }
            val status = connection.responseCode
            if (status !in 200..299) {
                if (status == 409) throw AfException("RECOVERY_WRITE_CONFLICT", "Recovery source revision is stale.")
                throw androidMapGithubError(status, path)
            }
            val response = connection.inputStream.bufferedReader(StandardCharsets.UTF_8).use { it.readText() }
            val json = JSONObject(response)
            val commitRevision = json.optJSONObject("commit")?.optString("sha").orEmpty().trim()
            if (commitRevision.isBlank()) throw AfException("RECOVERY_WRITE_FAILED", "GitHub write result is ambiguous.")
            RecoveryGitWriteResult(path, contentRevision(replacementContent), commitRevision)
        } finally {
            connection.disconnect()
        }
    }

    fun readBranchHead(configuration: JSONObject): String {
        val repository = configuration.getJSONObject("repository")
        val owner = repository.optString("owner").trim()
        val repo = repository.optString("repository").trim()
        val ref = androidNormalizeGitBranchRef(repository.optString("ref", "main"))
        val timeoutSec = configuration.optJSONObject("timeouts")?.optInt("githubRequestTimeoutSec", 10) ?: 10
        val url = "https://api.github.com/repos/${urlPath(owner)}/${urlPath(repo)}/git/ref/${escapeRemotePath(ref)}"
        val sha = JSONObject(httpGet(url, timeoutSec, ref)).optJSONObject("object")?.optString("sha").orEmpty().trim()
        if (sha.isBlank()) throw AfException("GITHUB_SERVER_ERROR", "GitHub ref response is invalid.")
        return sha
    }

    /** ambiguous mutation を read-only の repository state から確定する。 */
    fun reconcileWorkoutCommit(
        configuration: JSONObject,
        expectedHead: String,
        message: String,
        changes: List<WorkoutRepositoryChange>
    ): WorkoutCommitReconciliation = WorkoutCommitReconciler(
        readHead = { readBranchHead(configuration) },
        compare = { base, head -> parseComparison(compareCommits(configuration, base, head)) },
        readContent = { path, revision -> readContentAt(configuration, path, revision) }
    ).reconcile(expectedHead, message, changes)

    private fun parseComparison(value: JSONObject): WorkoutCommitComparison {
        val commits = value.optJSONArray("commits") ?: throw IllegalArgumentException("Commit comparison is missing commits.")
        val files = value.optJSONArray("files") ?: throw IllegalArgumentException("Commit comparison is missing files.")
        return WorkoutCommitComparison(
            value.optString("status"),
            (0 until commits.length()).map { index ->
                val commit = commits.getJSONObject(index)
                val parents = commit.optJSONArray("parents") ?: JSONArray()
                WorkoutCommitCandidate(
                    commit.getString("sha"),
                    commit.getJSONObject("commit").getString("message"),
                    (0 until parents.length()).map { parents.getJSONObject(it).getString("sha") }.toSet()
                )
            },
            (0 until files.length()).associate { index ->
                val file = files.getJSONObject(index)
                normalizeWorkoutPath(file.getString("filename")) to file.getString("status")
            }
        )
    }

    private fun compareCommits(configuration: JSONObject, base: String, head: String): JSONObject {
        val repository = configuration.getJSONObject("repository")
        val timeoutSec = configuration.optJSONObject("timeouts")?.optInt("githubRequestTimeoutSec", 10) ?: 10
        val url = "https://api.github.com/repos/${urlPath(repository.optString("owner").trim())}/${urlPath(repository.optString("repository").trim())}/compare/${urlPath(base)}...${urlPath(head)}"
        return JSONObject(httpGet(url, timeoutSec, "compare"))
    }

    private fun readContentAt(configuration: JSONObject, path: String, revision: String): String? {
        val committed = JSONObject(configuration.toString())
        committed.getJSONObject("repository").put("ref", revision)
        return try {
            readContentFile(committed, path).content
        } catch (ex: AfException) {
            if (ex.code == "GITHUB_RESOURCE_NOT_FOUND") null else throw ex
        }
    }

    /**
     * path relocation Recovery の atomic fileChanges commit に使用する GraphQL 呼び出し。
     */
    fun postGraphql(configuration: JSONObject, payload: String): JSONObject =
        postGraphqlRequest(configuration, payload, ambiguousResultAware = false)

    /** Workout Mutation専用。送信後の通信断をreconciliation対象として識別する。 */
    fun postWorkoutMutationGraphql(configuration: JSONObject, payload: String): JSONObject =
        postGraphqlRequest(configuration, payload, ambiguousResultAware = true)

    private fun postGraphqlRequest(configuration: JSONObject, payload: String, ambiguousResultAware: Boolean): JSONObject {
        val timeoutSec = configuration.optJSONObject("timeouts")?.optInt("githubRequestTimeoutSec", 10) ?: 10
        val url = "https://api.github.com/graphql"
        val connection = (URL(url).openConnection() as HttpURLConnection).apply {
            requestMethod = "POST"
            connectTimeout = timeoutSec * 1000
            readTimeout = timeoutSec * 1000
            doOutput = true
            setRequestProperty("User-Agent", "Atlament-Android-AF")
            setRequestProperty("Content-Type", "application/json")
            tokenProvider()?.takeIf { it.isNotBlank() }?.let { setRequestProperty("Authorization", "Bearer $it") }
        }
        return try {
            connection.outputStream.use { it.write(payload.toByteArray(StandardCharsets.UTF_8)) }
            val status = connection.responseCode
            if (ambiguousResultAware && (status == 408 || status >= 500)) throw WorkoutMutationOutcomeUnknownException()
            if (status !in 200..299) throw androidMapGithubError(status, "graphql")
            val response = connection.inputStream.bufferedReader(StandardCharsets.UTF_8).use { it.readText() }
            JSONObject(response)
        } catch (ex: AfException) {
            throw ex
        } catch (ex: WorkoutMutationOutcomeUnknownException) {
            throw ex
        } catch (ex: Exception) {
            if (ambiguousResultAware) throw WorkoutMutationOutcomeUnknownException(ex)
            throw ex
        } finally {
            connection.disconnect()
        }
    }

    fun fetchDirectoryFiles(
        owner: String,
        repo: String,
        ref: String,
        directoryPath: String,
        timeoutSec: Int
    ): List<RuntimeSourceFile> {
        val escapedPath = escapeRemotePath(directoryPath)
        val contentsPath = if (escapedPath.isEmpty()) "" else "/$escapedPath"
        val url = "https://api.github.com/repos/${urlPath(owner)}/${urlPath(repo)}/contents$contentsPath?ref=${urlPath(ref)}"
        val entries = JSONArray(httpGet(url, timeoutSec, directoryPath))
        val files = mutableListOf<RuntimeSourceFile>()

        for (index in 0 until entries.length()) {
            val entry = entries.getJSONObject(index)
            val type = entry.optString("type")
            val path = entry.optString("path")
            if (type == "dir") {
                files.addAll(fetchDirectoryFiles(owner, repo, ref, path, timeoutSec))
            } else if (type == "file" && isJsonRuntimePath(path)) {
                files.add(fetchRawRuntimeFile(owner, repo, ref, path, timeoutSec))
            }
        }

        return files
    }

    fun fetchRawRuntimeFile(
        owner: String,
        repo: String,
        ref: String,
        path: String,
        timeoutSec: Int
    ): RuntimeSourceFile {
        val url = "https://api.github.com/repos/${urlPath(owner)}/${urlPath(repo)}/contents/${escapeRemotePath(path)}?ref=${urlPath(ref)}"
        val response = JSONObject(httpGet(url, timeoutSec, path))
        val encoded = response.optString("content").replace("\\s".toRegex(), "")
        if (encoded.isBlank()) throw AfException("GITHUB_SERVER_ERROR", "GitHub contents response is invalid.")
        val content = String(Base64.decode(encoded, Base64.DEFAULT), StandardCharsets.UTF_8)
        return RuntimeSourceFile(path, content, contentRevision(content))
    }

    private fun httpGet(url: String, timeoutSec: Int, pathForError: String): String {
        val connection = (URL(url).openConnection() as HttpURLConnection).apply {
            requestMethod = "GET"
            connectTimeout = timeoutSec * 1000
            readTimeout = timeoutSec * 1000
            setRequestProperty("User-Agent", "Atlament-Android-AF")
            tokenProvider()?.takeIf { it.isNotBlank() }?.let { setRequestProperty("Authorization", "Bearer $it") }
        }

        return try {
            val status = connection.responseCode
            if (status !in 200..299) throw androidMapGithubError(status, pathForError)
            connection.inputStream.bufferedReader(StandardCharsets.UTF_8).use { it.readText() }
        } finally {
            connection.disconnect()
        }
    }

    private fun escapeRemotePath(path: String): String =
        path.trim('/').split('/').filter { it.isNotBlank() }.joinToString("/") { urlPath(it) }

    private fun urlPath(value: String): String = URLEncoder.encode(value, StandardCharsets.UTF_8.name()).replace("+", "%20")

    private fun contentRevision(content: String): String = "content-sha256-${sha256Hex(content)}"

    private fun sha256Hex(value: String): String =
        MessageDigest.getInstance("SHA-256")
            .digest(value.toByteArray(StandardCharsets.UTF_8))
            .joinToString("") { "%02x".format(it) }

    private fun isJsonRuntimePath(path: String): Boolean =
        path.endsWith(".json", ignoreCase = true) || path.endsWith(".jsonl", ignoreCase = true)
}

private fun normalizeWorkoutPath(value: String): String = value.replace('\\', '/').trim('/')
