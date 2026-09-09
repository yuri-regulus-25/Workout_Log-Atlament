package jp.yuri_regulus_25.atlament

import org.json.JSONArray
import org.json.JSONObject

internal class AndroidMasterWriteService(
    private val configurationStatus: () -> String,
    private val loadConfigurationJson: () -> String,
    private val credentialStatusJson: () -> String,
    private val credentialState: () -> String,
    private val credentialToken: () -> String?,
    private val githubClient: AndroidGithubClient,
    private val runtimeDataStore: AndroidRuntimeDataStore,
    private val runtimeDataBuilder: AndroidRuntimeDataBuilder,
    private val configuredResourceFetcher: AndroidConfiguredResourceFetcher,
    private val markGithubAvailable: () -> Unit,
    private val markValidationSucceeded: () -> Unit
) {
    private data class MasterWriteTarget(val type: String, val path: String)

    private val bodyParts = setOf("chest", "back", "legs", "shoulders", "arms", "glutes", "core", "cardio", "other")

    fun boundaryJson(): String {
        val configuration = JSONObject(loadConfigurationJson())
        val repository = configuration.getJSONObject("repository")
        val allowedTargets = JSONArray()
        allowedTargets.put(JSONObject()
            .put("type", "MACHINE_MASTER")
            .put("path", "master/machines.json")
            .put("resourceKind", "file")
            .put("writeAllowed", true))
        allowedTargets.put(JSONObject()
            .put("type", "GYM_MASTER")
            .put("path", "master/gyms.json")
            .put("resourceKind", "file")
            .put("writeAllowed", true))
        val repositoryConfigured = repository.optString("owner").trim().isNotBlank() &&
            repository.optString("repository").trim().isNotBlank() &&
            repository.optString("ref", "main").trim().isNotBlank()
        val resources = configuration.optJSONArray("resources") ?: JSONArray()
        val configuredTargetKeys = mutableSetOf<String>()
        for (index in 0 until resources.length()) {
            val resource = resources.optJSONObject(index) ?: continue
            if (resource.optString("resourceKind") == "file") {
                configuredTargetKeys.add("${resource.optString("type")}:${resource.optString("path")}")
            }
        }
        val allTargetsConfigured = configuredTargetKeys.contains("MACHINE_MASTER:master/machines.json") &&
            configuredTargetKeys.contains("GYM_MASTER:master/gyms.json")
        val credential = JSONObject(credentialStatusJson())
        val credentialState = credential.optString("state", "unknown")
        val writeEnabled = configurationStatus() == "available" &&
            credential.optBoolean("configured", false) &&
            credentialState == "available" &&
            repositoryConfigured &&
            allTargetsConfigured

        return JSONObject()
            .put("repository", repository)
            .put("allowedTargets", allowedTargets)
            .put("security", JSONObject()
                .put("configurationAvailable", configurationStatus() == "available")
                .put("credentialConfigured", credential.optBoolean("configured", false))
                .put("credentialState", credentialState)
                .put("repositoryConfigured", repositoryConfigured)
                .put("writeEnabled", writeEnabled)
                .put("workoutLogWriteAllowed", false)
                .put("rawJsonWriteAllowed", false)
                .put("genericGitWriteAllowed", false))
            .toString(2)
    }

    fun documentResponse(type: String): SyncResponse {
        val target = masterWriteTarget(type)
            ?: return SyncResponse(400, failJson("MASTER_WRITE_INVALID", "Master write target is not allowed."), false)
        return try {
            val documents = readLocalMasterDocuments()
                ?: return SyncResponse(409, failJson("MASTER_SYNC_REQUIRED", "Master data must be synchronized before maintenance."), false)
            val document = selectLocalMasterDocument(documents, target.type)
                ?: return SyncResponse(409, failJson("MASTER_SYNC_REQUIRED", "Master data must be synchronized before maintenance."), false)
            SyncResponse(200, okJson(masterDocumentJson(document).toString(2)), true)
        } catch (ex: AfException) {
            SyncResponse(statusFor(ex.code), failJson(ex.code, ex.message), false)
        } catch (_: Exception) {
            SyncResponse(409, failJson("MASTER_SYNC_REQUIRED", "Master data must be synchronized before maintenance."), false)
        }
    }

    fun documentWriteResponse(type: String, body: String): SyncResponse {
        val target = masterWriteTarget(type)
            ?: return SyncResponse(400, failJson("MASTER_WRITE_INVALID", "Master write target is not allowed."), false)
        val request = try {
            if (body.isBlank()) JSONObject() else JSONObject(body)
        } catch (_: Exception) {
            return SyncResponse(400, failJson("MASTER_WRITE_INVALID", "Master document write request is invalid."), false)
        }
        val expectedRevision = request.optString("expectedRevision").trim()
        val nextContent = request.optString("content")
        if (expectedRevision.isBlank() || nextContent.isBlank()) {
            return SyncResponse(400, failJson("MASTER_WRITE_INVALID", "Master document write request is invalid."), false)
        }

        val environment = masterWriteEnvironment()
        if (environment.first != null) return environment.first!!
        val configuration = environment.second!!
        val repository = configuration.getJSONObject("repository")
        val fullPath = combineRemote(repository.optString("rootPath"), target.path)

        return try {
            val localDocuments = readLocalMasterDocuments()
                ?: return SyncResponse(409, failJson("MASTER_SYNC_REQUIRED", "Master data must be synchronized before maintenance."), false)
            val current = selectLocalMasterDocument(localDocuments, type)
                ?: return SyncResponse(409, failJson("MASTER_SYNC_REQUIRED", "Master data must be synchronized before maintenance."), false)
            if (current.revision != expectedRevision) {
                return SyncResponse(409, failJson("MASTER_SYNC_REQUIRED", "Master document must be synchronized before saving."), false)
            }

            val candidateDocuments = replaceLocalMasterDocument(localDocuments, type, nextContent, current.revision)
            val other = selectLocalMasterDocument(candidateDocuments, otherMasterWriteTarget(type).type)
                ?: return SyncResponse(409, failJson("MASTER_SYNC_REQUIRED", "Master data must be synchronized before maintenance."), false)
            val validationErrors = validateMasterWrite(type, current.content, nextContent, other.content)
            if (validationErrors.length() > 0) {
                return SyncResponse(400, responseJson(false, "null", validationErrors), false)
            }

            val remote = githubClient.readContentFile(configuration, fullPath)
            if (remote.revision != current.revision) {
                return SyncResponse(409, failJson("MASTER_SYNC_REQUIRED", "Master document must be synchronized before saving."), false)
            }

            val savedRevision = githubClient.writeContentFile(configuration, fullPath, current.revision, nextContent, masterCommitMessage(target))
            val confirmedDocuments = replaceLocalMasterDocument(localDocuments, type, nextContent, savedRevision)
            val workoutFiles = configuredResourceFetcher.fetchWorkoutResources(configuration)
            val machineMaster = selectLocalMasterDocument(confirmedDocuments, "MACHINE_MASTER")
                ?: return SyncResponse(409, failJson("MASTER_SYNC_REQUIRED", "Master data was saved remotely. Synchronize application data before continuing."), false)
            val gymMaster = selectLocalMasterDocument(confirmedDocuments, "GYM_MASTER")
                ?: return SyncResponse(409, failJson("MASTER_SYNC_REQUIRED", "Master data was saved remotely. Synchronize application data before continuing."), false)
            val build = runtimeDataBuilder.buildRuntimeDataPayload(workoutFiles, machineMaster, gymMaster)
            if (build.payload == null) {
                return SyncResponse(409, failJson("MASTER_SYNC_REQUIRED", "Master data was saved remotely. Synchronize application data before continuing."), false)
            }
            val saveErrors = runtimeDataStore.saveAtomically(build.payload)
            if (saveErrors.length() > 0) {
                return SyncResponse(409, failJson("MASTER_SYNC_REQUIRED", "Master data was saved remotely. Synchronize application data before continuing."), false)
            }
            markGithubAvailable()
            markValidationSucceeded()
            SyncResponse(200, okJson(JSONObject()
                .put("type", target.type)
                .put("path", target.path)
                .put("revision", savedRevision)
                .toString(2)), true)
        } catch (ex: AfException) {
            SyncResponse(statusFor(ex.code), failJson(ex.code, ex.message), false)
        } catch (_: Exception) {
            SyncResponse(500, failJson("GITHUB_CONNECTION_FAILED", "GitHub connection failed."), false)
        }
    }

    fun unresolvedReferencesResponse(): SyncResponse {
        return try {
            if (!runtimeDataStore.exists()) {
                return SyncResponse(409, failJson("MASTER_SYNC_REQUIRED", "Master data must be synchronized before maintenance."), false)
            }
            val runtimeData = JSONObject(runtimeDataStore.readText())
            val warnings = runtimeData.optJSONArray("warnings") ?: JSONArray()
            SyncResponse(200, okJson(buildUnresolvedReferences(warnings).toString(2)), true)
        } catch (ex: AfException) {
            SyncResponse(statusFor(ex.code), failJson(ex.code, ex.message), false)
        } catch (_: Exception) {
            SyncResponse(409, failJson("MASTER_SYNC_REQUIRED", "Master data must be synchronized before maintenance."), false)
        }
    }

    fun readMasterDocumentFromGithub(configuration: JSONObject, type: String): MasterDocument {
        val target = masterWriteTarget(type)
            ?: throw AfException("MASTER_WRITE_INVALID", "Master write target is not allowed.")
        val repository = configuration.getJSONObject("repository")
        val fullPath = combineRemote(repository.optString("rootPath"), target.path)
        val content = githubClient.readContentFile(configuration, fullPath)
        return MasterDocument(target.type, target.path, content.revision, content.content)
    }

    fun statusFor(code: String): Int = when (code) {
        "MASTER_SYNC_REQUIRED" -> 409
        "MASTER_WRITE_CONFLICT" -> 409
        "GITHUB_UNAUTHORIZED" -> 401
        "GITHUB_FORBIDDEN" -> 403
        "GITHUB_RESOURCE_NOT_FOUND" -> 404
        "GITHUB_RATE_LIMIT" -> 429
        "GITHUB_TIMEOUT", "GITHUB_CONNECTION_FAILED" -> 503
        "GITHUB_SERVER_ERROR", "MASTER_WRITE_FAILED" -> 500
        else -> 400
    }

    private fun masterWriteEnvironment(): Pair<SyncResponse?, JSONObject?> {
        if (configurationStatus() != "available") {
            return Pair(SyncResponse(400, failJson("CONFIG_REQUIRED", "Configuration is required."), false), null)
        }
        if (credentialState() != "available" || credentialToken().isNullOrBlank()) {
            return Pair(SyncResponse(401, failJson("CREDENTIAL_REQUIRED", "Credential is required."), false), null)
        }
        return Pair(null, JSONObject(loadConfigurationJson()))
    }

    private fun masterWriteTarget(type: String): MasterWriteTarget? = when (type) {
        "MACHINE_MASTER" -> MasterWriteTarget("MACHINE_MASTER", "master/machines.json")
        "GYM_MASTER" -> MasterWriteTarget("GYM_MASTER", "master/gyms.json")
        else -> null
    }

    private fun masterCommitMessage(target: MasterWriteTarget): String {
        val subject = if (target.type == "MACHINE_MASTER") "machine" else "gym"
        val fileName = target.path.substringAfterLast('/')
        return "Update $subject master: $fileName"
    }

    private fun otherMasterWriteTarget(type: String): MasterWriteTarget =
        if (type == "MACHINE_MASTER") masterWriteTarget("GYM_MASTER")!! else masterWriteTarget("MACHINE_MASTER")!!

    private fun readLocalMasterDocuments(): JSONObject? {
        if (!runtimeDataStore.exists()) return null
        val runtimeData = JSONObject(runtimeDataStore.readText())
        return runtimeData.optJSONObject("masterDocuments")
    }

    private fun selectLocalMasterDocument(documents: JSONObject, type: String): MasterDocument? {
        val key = when (type) {
            "MACHINE_MASTER" -> "machine"
            "GYM_MASTER" -> "gym"
            else -> return null
        }
        val document = documents.optJSONObject(key) ?: return null
        val target = masterWriteTarget(type) ?: return null
        val revision = document.optString("revision").trim()
        val content = document.optString("content")
        if (revision.isBlank() || content.isBlank()) return null
        return MasterDocument(
            document.optString("type", target.type).ifBlank { target.type },
            document.optString("path", target.path).ifBlank { target.path },
            revision,
            content
        )
    }

    private fun replaceLocalMasterDocument(documents: JSONObject, type: String, content: String, revision: String): JSONObject {
        val result = JSONObject(documents.toString())
        val target = masterWriteTarget(type) ?: return result
        val key = if (type == "MACHINE_MASTER") "machine" else "gym"
        result.put(key, masterDocumentJson(MasterDocument(target.type, target.path, revision, content)))
        return result
    }

    private fun masterDocumentJson(document: MasterDocument): JSONObject = JSONObject()
        .put("type", document.type)
        .put("path", document.path)
        .put("revision", document.revision)
        .put("content", document.content)

    private fun validateMasterWrite(type: String, currentContent: String, nextContent: String, otherContent: String): JSONArray {
        val errors = JSONArray()
        if (type == "GYM_MASTER") validateMainGymTransition(currentContent, nextContent, errors)
        if (errors.length() > 0) return errors

        if (type == "MACHINE_MASTER") {
            validateMachineMasterDocument(nextContent, errors)
            validateGymMasterDocument(otherContent, errors)
        } else {
            validateMachineMasterDocument(otherContent, errors)
            validateGymMasterDocument(nextContent, errors)
        }
        return errors
    }

    private fun validateMainGymTransition(currentContent: String, nextContent: String, errors: JSONArray) {
        val current = runCatching { JSONObject(currentContent).optJSONArray("gyms") ?: JSONArray() }.getOrElse { JSONArray() }
        val next = runCatching { JSONObject(nextContent).optJSONArray("gyms") ?: JSONArray() }.getOrElse { JSONArray() }
        val hadMain = (0 until current.length()).any { current.optJSONObject(it)?.optBoolean("main", false) == true }
        val hasMain = (0 until next.length()).any { next.optJSONObject(it)?.optBoolean("main", false) == true }
        if (hadMain && !hasMain) {
            errors.put(errorJson("MASTER_WRITE_INVALID", "Configured Main Gym cannot be cleared."))
        }
    }

    private fun validateMachineMasterDocument(content: String, errors: JSONArray) {
        try {
            val root = JSONObject(content)
            val machines = root.optJSONArray("machines")
            if (root.optInt("schema_version", Int.MIN_VALUE) != 1 || machines == null) {
                errors.put(errorJson("MASTER_WRITE_INVALID", "Machine master contract is invalid."))
                return
            }

            val ids = mutableSetOf<String>()
            for (index in 0 until machines.length()) {
                val machine = machines.optJSONObject(index)
                val id = machine?.optString("machine_id").orEmpty().trim()
                val name = machine?.optString("name").orEmpty().trim()
                val bodyPart = machine?.optString("body_part").orEmpty().trim()
                val aliases = machine?.optJSONArray("aliases")
                if (id.isBlank() || name.isBlank() || bodyPart !in bodyParts || aliases == null || !hasBoolean(machine, "active") || !hasBoolean(machine, "deleted")) {
                    errors.put(errorJson("MASTER_WRITE_INVALID", "Machine master item is invalid."))
                    return
                }
                if (!ids.add(id)) {
                    errors.put(errorJson("MASTER_WRITE_INVALID", "Duplicate machine_id: $id."))
                    return
                }
                for (sourceId in readStringList(machine?.optJSONArray("source_ids"))) {
                    if (!ids.add(sourceId)) {
                        errors.put(errorJson("MASTER_WRITE_INVALID", "Duplicate machine source_id: $sourceId."))
                        return
                    }
                }
            }
        } catch (_: Exception) {
            errors.put(errorJson("MASTER_WRITE_INVALID", "Machine master JSON is invalid."))
        }
    }

    private fun validateGymMasterDocument(content: String, errors: JSONArray) {
        try {
            val root = JSONObject(content)
            val gyms = root.optJSONArray("gyms")
            if (root.optInt("schema_version", Int.MIN_VALUE) != 1 || gyms == null) {
                errors.put(errorJson("MASTER_WRITE_INVALID", "Gym master contract is invalid."))
                return
            }

            val ids = mutableSetOf<String>()
            var mainGymCount = 0
            for (index in 0 until gyms.length()) {
                val gym = gyms.optJSONObject(index)
                val id = gym?.optString("gym_id").orEmpty().trim()
                val name = gym?.optString("name").orEmpty().trim()
                if (id.isBlank() || name.isBlank() || !hasBoolean(gym, "active") || !hasBoolean(gym, "deleted") || !hasBoolean(gym, "main")) {
                    errors.put(errorJson("MASTER_WRITE_INVALID", "Gym master item is invalid."))
                    return
                }
                if (!ids.add(id)) {
                    errors.put(errorJson("MASTER_WRITE_INVALID", "Duplicate gym_id: $id."))
                    return
                }
                for (sourceId in readStringList(gym?.optJSONArray("source_ids"))) {
                    if (!ids.add(sourceId)) {
                        errors.put(errorJson("MASTER_WRITE_INVALID", "Duplicate gym source_id: $sourceId."))
                        return
                    }
                }
                if (gym?.optBoolean("main", false) == true) {
                    mainGymCount++
                    if (!gym.optBoolean("active", false) || gym.optBoolean("deleted", false)) {
                        errors.put(errorJson("MASTER_WRITE_INVALID", "Main gym must be active and not logically deleted."))
                        return
                    }
                }
            }

            if (mainGymCount > 1) {
                errors.put(errorJson("MASTER_WRITE_INVALID", "Gym master must have at most one main gym."))
            }
        } catch (_: Exception) {
            errors.put(errorJson("MASTER_WRITE_INVALID", "Gym master JSON is invalid."))
        }
    }

    private fun hasBoolean(document: JSONObject?, name: String): Boolean =
        document?.has(name) == true && document.get(name) is Boolean

    private fun buildUnresolvedReferences(warnings: JSONArray): JSONArray {
        val groups = linkedMapOf<String, JSONObject>()
        for (index in 0 until warnings.length()) {
            val warning = warnings.optJSONObject(index) ?: continue
            val code = warning.optString("code")
            if (code != "MASTER_REFERENCE_MISSING" && code != "MASTER_REFERENCE_DELETED") continue
            val kind = warning.optString("referenceKind")
            val referenceId = warning.optString("originalId")
            if (referenceId.isBlank()) continue
            val type = if (kind == "gym") "GYM_MASTER" else "MACHINE_MASTER"
            val key = "$type:$referenceId"
            val group = groups.getOrPut(key) {
                JSONObject()
                    .put("type", type)
                    .put("referenceId", referenceId)
                    .put("resolutionState", warning.optString("resolutionState"))
                    .put("affectedWorkouts", JSONArray())
            }
            group.getJSONArray("affectedWorkouts").put(JSONObject()
                .put("filePath", warning.optString("filePath"))
                .put("line", if (warning.isNull("line")) JSONObject.NULL else warning.opt("line"))
                .put("message", warning.optString("message")))
        }
        val result = JSONArray()
        groups.values.forEach(result::put)
        return result
    }

    private fun readStringList(array: JSONArray?): List<String> {
        val result = mutableListOf<String>()
        if (array == null) return result
        for (index in 0 until array.length()) {
            val value = array.optString(index).trim()
            if (value.isNotBlank()) result.add(value)
        }
        return result
    }

    private fun combineRemote(rootPath: String, path: String): String =
        listOf(rootPath, path)
            .map { it.trim().trim('/') }
            .filter { it.isNotBlank() }
            .joinToString("/")
}
