package jp.yuri_regulus_25.atlament

import org.json.JSONArray
import org.json.JSONObject

internal class AndroidConfiguredResourceFetcher(
    private val githubClient: AndroidGithubClient,
    private val validateConfiguration: (JSONObject) -> JSONArray
) {
    fun fetchWorkoutResources(configuration: JSONObject): List<RuntimeSourceFile> {
        validate(configuration)
        val repository = configuration.getJSONObject("repository")
        val owner = repository.optString("owner").trim()
        val repo = repository.optString("repository").trim()
        val ref = repository.optString("ref", "main").trim().ifEmpty { "main" }
        val timeoutSec = configuration.optJSONObject("timeouts")?.optInt("githubRequestTimeoutSec", 10) ?: 10
        val workoutFiles = mutableListOf<RuntimeSourceFile>()
        val resources = configuration.getJSONArray("resources")

        for (index in 0 until resources.length()) {
            val resource = resources.getJSONObject(index)
            if (resource.optString("type") != "WORKOUT") continue
            val fetched = fetchResource(repository, resource, owner, repo, ref, timeoutSec)
            if (fetched.isEmpty() && !resource.optBoolean("emptyAllowed", false)) {
                if (resource.optBoolean("required", true)) throw IllegalStateException("${resource.optString("path")} is empty.")
                continue
            }
            workoutFiles.addAll(fetched.filter { isJsonRuntimePath(it.path) })
        }

        return workoutFiles
    }

    fun fetchAll(configuration: JSONObject): RuntimeFetchedResources {
        validate(configuration)
        val repository = configuration.getJSONObject("repository")
        val owner = repository.optString("owner").trim()
        val repo = repository.optString("repository").trim()
        val ref = repository.optString("ref", "main").trim().ifEmpty { "main" }
        val timeoutSec = configuration.optJSONObject("timeouts")?.optInt("githubRequestTimeoutSec", 10) ?: 10
        val workoutFiles = mutableListOf<RuntimeSourceFile>()
        var machineMaster: RuntimeSourceFile? = null
        var gymMaster: RuntimeSourceFile? = null
        val resources = configuration.getJSONArray("resources")

        for (index in 0 until resources.length()) {
            val resource = resources.getJSONObject(index)
            val type = resource.optString("type")
            val fetched = fetchResource(repository, resource, owner, repo, ref, timeoutSec)
            if (fetched.isEmpty() && !resource.optBoolean("emptyAllowed", false)) {
                if (resource.optBoolean("required", true)) throw IllegalStateException("${resource.optString("path")} is empty.")
                continue
            }

            when (type) {
                "MACHINE_MASTER" -> machineMaster = fetched.firstOrNull()
                "GYM_MASTER" -> gymMaster = fetched.firstOrNull()
                "WORKOUT" -> workoutFiles.addAll(fetched.filter { isJsonRuntimePath(it.path) })
                else -> workoutFiles.addAll(fetched.filter { isJsonRuntimePath(it.path) && it.path.contains("workouts/", ignoreCase = true) })
            }
        }

        return RuntimeFetchedResources(workoutFiles, machineMaster, gymMaster)
    }

    fun isAllowedRecoveryWorkoutPath(configuration: JSONObject, path: String): Boolean {
        val normalized = path.replace('\\', '/').trim('/')
        if (!isJsonRuntimePath(normalized)) return false
        val repository = configuration.getJSONObject("repository")
        val resources = configuration.getJSONArray("resources")
        for (index in 0 until resources.length()) {
            val resource = resources.getJSONObject(index)
            if (resource.optString("type") != "WORKOUT") continue
            val fullPath = combineRemote(repository.optString("rootPath"), resource.optString("path")).trim('/')
            if (resource.optString("resourceKind", "file") == "directory") {
                val prefix = fullPath.trimEnd('/') + "/"
                if (normalized.startsWith(prefix)) return true
            } else if (normalized == fullPath) {
                return true
            }
        }
        return false
    }

    private fun validate(configuration: JSONObject) {
        val configurationErrors = validateConfiguration(configuration)
        if (configurationErrors.length() > 0) {
            throw AfException("CONFIG_INVALID", configurationErrors.getJSONObject(0).optString("message", "Configuration is invalid."))
        }
    }

    private fun fetchResource(
        repository: JSONObject,
        resource: JSONObject,
        owner: String,
        repo: String,
        ref: String,
        timeoutSec: Int
    ): List<RuntimeSourceFile> {
        val fullPath = combineRemote(repository.optString("rootPath"), resource.optString("path"))
        return if (resource.optString("resourceKind", "file") == "directory") {
            githubClient.fetchDirectoryFiles(owner, repo, ref, fullPath, timeoutSec)
        } else {
            listOf(githubClient.fetchRawRuntimeFile(owner, repo, ref, fullPath, timeoutSec))
        }
    }

    private fun combineRemote(rootPath: String, path: String): String =
        listOf(rootPath, path)
            .map { it.trim().trim('/') }
            .filter { it.isNotBlank() }
            .joinToString("/")

    private fun isJsonRuntimePath(path: String): Boolean =
        path.endsWith(".json", ignoreCase = true) || path.endsWith(".jsonl", ignoreCase = true)
}
