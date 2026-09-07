package jp.yuri_regulus_25.atlament

import android.util.Base64
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import java.nio.charset.StandardCharsets
import java.security.MessageDigest
import org.json.JSONArray
import org.json.JSONObject

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

    fun postGraphql(configuration: JSONObject, payload: String): JSONObject {
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
            if (status !in 200..299) throw androidMapGithubError(status, "graphql")
            val response = connection.inputStream.bufferedReader(StandardCharsets.UTF_8).use { it.readText() }
            JSONObject(response)
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
