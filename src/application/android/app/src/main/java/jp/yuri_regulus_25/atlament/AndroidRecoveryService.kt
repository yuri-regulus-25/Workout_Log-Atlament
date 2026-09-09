package jp.yuri_regulus_25.atlament

import android.util.Base64
import java.nio.charset.StandardCharsets
import java.security.MessageDigest
import org.json.JSONArray
import org.json.JSONObject

/**
 * Android AF の Recovery read/draft/validate domain service。
 *
 * GitHub write の実行や HTTP response 変換は `AndroidLocalhostServer` 側に残し、
 * ここでは Broken Resource inspection、Draft 生成、candidate validation の契約を扱う。
 * Draft は device-local で source path/revision に結び付き、stale/incompatible/corrupted を明示状態で返す。
 */
internal class AndroidRecoveryService(
    private val loadConfigurationJson: () -> String,
    private val configuredResourceFetcher: AndroidConfiguredResourceFetcher,
    private val runtimeDataBuilder: AndroidRuntimeDataBuilder,
    private val recoveryDraftStore: AndroidRecoveryDraftStore
) {
    /**
     * current GitHub source set から Recovery 対象 resource の inspection を作成する。
     */
    fun inspectWorkoutRecoveryResources(): List<RecoveryResource> {
        val configuration = JSONObject(loadConfigurationJson())
        val fetched = configuredResourceFetcher.fetchAll(configuration)
        val machine = fetched.machineMaster ?: throw AfException("RECOVERY_UNAVAILABLE", "Machine master resource is unavailable.")
        val gym = fetched.gymMaster ?: throw AfException("RECOVERY_UNAVAILABLE", "Gym master resource is unavailable.")
        val machineMaster = MasterDocument("MACHINE_MASTER", machine.path, sourceRevision(machine), machine.content)
        val gymMaster = MasterDocument("GYM_MASTER", gym.path, sourceRevision(gym), gym.content)
        return fetched.workoutFiles
            .sortedBy { it.path }
            .map { source ->
                val inspection = inspectWorkoutResource(source, machineMaster, gymMaster)
                RecoveryResource(source, resourceKey(configuration, "WORKOUT", source.path, sourceRevision(source)), inspection)
            }
    }

    fun resolveResource(resourceKey: String): RecoveryResource? =
        runCatching { inspectWorkoutRecoveryResources().firstOrNull { it.resourceKey == resourceKey } }.getOrNull()

    fun resolveResourceForRead(resourceKey: String): RecoveryResource? = runCatching {
        val configuration = JSONObject(loadConfigurationJson())
        val resources = inspectWorkoutRecoveryResources()
        resources.firstOrNull { it.resourceKey == resourceKey } ?: run {
            val draft = recoveryDraftStore.findByResourceKey(configuration, resourceKey, ::resourceKey) ?: return@run null
            resources.firstOrNull { it.source.path == draft.optString("sourcePath") }
        }
    }.getOrNull()

    /**
     * Draft から replacement candidate を生成し、whole-resource validation を実行する。
     *
     * unresolved field は API error ではなく `health: broken` の validation result として返す。
     * `healthy` と `degraded` は commit 可能、`broken` は commit 不可である。
     */
    fun validateDraft(resourceKey: String): JSONObject {
        val configuration = runCatching { JSONObject(loadConfigurationJson()) }.getOrElse { ex ->
            val code = if (ex is AfException) ex.code else "RECOVERY_UNAVAILABLE"
            val message = ex.message ?: "Recovery is unavailable."
            return JSONObject().put("errors", errorsArray(code, message))
        }
        val resources = runCatching { inspectWorkoutRecoveryResources() }.getOrElse { ex ->
            val code = if (ex is AfException) ex.code else "RECOVERY_UNAVAILABLE"
            val message = ex.message ?: "Recovery is unavailable."
            return JSONObject().put("errors", errorsArray(code, message))
        }
        val resolved = resources.firstOrNull { it.resourceKey == resourceKey }
            ?: recoveryDraftStore.findByResourceKey(configuration, resourceKey, ::resourceKey)?.let { draft ->
                resources.firstOrNull { it.source.path == draft.optString("sourcePath") }
            }
            ?: return JSONObject().put("errors", errorsArray("RECOVERY_RESOURCE_NOT_FOUND", "Recovery Resource was not found."))
        val snapshot = recoveryDraftStore.load("WORKOUT", resolved.source.path, sourceRevision(resolved.source))
        val draft = snapshot.optJSONObject("draft")
        when (snapshot.optString("state")) {
            "none" -> return JSONObject().put("errors", errorsArray("RECOVERY_DRAFT_REQUIRED", "Recovery Draft is required."))
            "stale" -> return JSONObject().put("errors", errorsArray("RECOVERY_DRAFT_STALE", "Recovery Draft source revision is stale."))
            "incompatible" -> return JSONObject().put("errors", errorsArray("RECOVERY_DRAFT_INCOMPATIBLE", "Recovery Draft schema is incompatible."))
            "corrupted" -> return JSONObject().put("errors", errorsArray("RECOVERY_DRAFT_CORRUPTED", "Recovery Draft is corrupted."))
        }
        if (draft == null) return JSONObject().put("errors", errorsArray("RECOVERY_DRAFT_REQUIRED", "Recovery Draft is required."))

        val unresolved = unresolvedRecoveryIssues(draft.optJSONArray("fields") ?: JSONArray())
        if (unresolved.length() > 0) {
            return JSONObject()
                .put("errors", JSONArray())
                .put("data", validationJson(draft, "broken", unresolved, false, draft.optString("sourcePath"), null))
        }

        val fetched = configuredResourceFetcher.fetchAll(configuration)
        val machine = fetched.machineMaster ?: return JSONObject().put("errors", errorsArray("RECOVERY_UNAVAILABLE", "Machine master resource is unavailable."))
        val gym = fetched.gymMaster ?: return JSONObject().put("errors", errorsArray("RECOVERY_UNAVAILABLE", "Gym master resource is unavailable."))
        val machineMaster = MasterDocument("MACHINE_MASTER", machine.path, sourceRevision(machine), machine.content)
        val gymMaster = MasterDocument("GYM_MASTER", gym.path, sourceRevision(gym), gym.content)
        val candidate = buildCandidateContent(draft)
        val replacementPath = determineReplacementPath(draft.optString("sourcePath"), candidate)
        val candidateFile = RuntimeSourceFile(replacementPath, candidate, draft.optString("sourceRevision"))
        val validation = runtimeDataBuilder.buildRuntimeDataPayload(listOf(candidateFile), machineMaster, gymMaster)
        val issues = JSONArray()
        appendJsonArray(issues, resourceIssuesFromErrors(validation.errors))
        appendJsonArray(issues, resourceIssuesFromWarnings(validation.warnings))
        appendJsonArray(issues, duplicateRecoveryIssues(candidateFile, fetched.workoutFiles.filter { it.path != resolved.source.path }, machineMaster, gymMaster))
        val health = when {
            hasSeverity(issues, "broken") -> "broken"
            issues.length() > 0 -> "degraded"
            else -> "healthy"
        }
        val pathChange = if (replacementPath == draft.optString("sourcePath")) null else JSONObject().put("from", draft.optString("sourcePath")).put("to", replacementPath)
        return JSONObject()
            .put("errors", JSONArray())
            .put("data", validationJson(draft, health, issues, health == "healthy" || health == "degraded", replacementPath, pathChange))
    }

    /**
     * Broken Workout source から初期 Draft を作成する。
     *
     * 必須 field が読めない場合は unresolved、optional field の欠落は recovered として初期化する。
     */
    fun createWorkoutDraft(source: RuntimeSourceFile, broken: Boolean): JSONObject {
        val sourceRevision = sourceRevision(source)
        val existing = recoveryDraftStore.load("WORKOUT", source.path, sourceRevision)
        if (existing.optString("state") == "active") return existing
        if (!broken) {
            return JSONObject()
                .put("state", "none")
                .put("draft", JSONObject.NULL)
                .put("errors", errorsArray("RECOVERY_RESOURCE_NOT_BROKEN", "Recovery Draft requires a Broken Resource."))
        }

        val draft = JSONObject()
            .put("schemaVersion", 1)
            .put("sourcePath", source.path)
            .put("sourceRevision", sourceRevision)
            .put("resourceType", "WORKOUT")
            .put("inspectionVersion", 1)
            .put("draftRevision", 1)
            .put("fields", extractWorkoutRecoveryFields(source.path, source.content))
            .put("suggestions", JSONArray())
        val errors = recoveryDraftStore.save(draft)
        return JSONObject()
            .put("state", if (errors.length() == 0) "active" else "none")
            .put("draft", if (errors.length() == 0) draft else JSONObject.NULL)
            .put("errors", errors)
    }

    fun buildCandidateContent(draft: JSONObject): String {
        val fields = draft.optJSONArray("fields") ?: JSONArray()
        val confirmed = mutableListOf<JSONObject>()
        for (index in 0 until fields.length()) {
            val field = fields.optJSONObject(index) ?: continue
            if ((field.optString("state") == "recovered" || field.optString("state") == "confirmed") && field.has("value")) {
                confirmed.add(field)
            }
        }
        val sessionIndexes = confirmed.mapNotNull { field ->
            Regex("""^/sessions/([^/]+)/""").find(field.optString("fieldPath"))?.groupValues?.get(1)
        }.distinct().sortedBy { it.toIntOrNull() ?: Int.MAX_VALUE }

        return if (sessionIndexes.isNotEmpty()) {
            sessionIndexes.joinToString("\n") { index ->
                buildRecoveryObject(confirmed.filter { it.optString("fieldPath").startsWith("/sessions/$index/") }, "/sessions/$index").toString()
            } + "\n"
        } else {
            buildRecoveryObject(confirmed, "").toString(2) + "\n"
        }
    }

    fun determineReplacementPath(sourcePath: String, candidateContent: String): String {
        if (!sourcePath.endsWith(".json", ignoreCase = true) || sourcePath.endsWith(".jsonl", ignoreCase = true)) return sourcePath
        return runCatching {
            val date = JSONObject(candidateContent).optString("date").trim()
            if (!Regex("""^\d{4}-\d{2}-\d{2}$""").matches(date)) return sourcePath
            val normalized = sourcePath.replace('\\', '/')
            val fileName = normalized.substringAfterLast('/')
            val rewrittenFile = Regex("""\d{4}-\d{2}-\d{2}""").replace(fileName, date)
            if (rewrittenFile == fileName) return sourcePath
            val segments = normalized.substringBeforeLast('/', "").split('/').filter { it.isNotBlank() }.toMutableList()
            if (segments.size >= 2 && Regex("""^\d{4}$""").matches(segments[segments.size - 2]) && Regex("""^\d{2}$""").matches(segments.last())) {
                segments[segments.size - 2] = date.substring(0, 4)
                segments[segments.size - 1] = date.substring(5, 7)
            }
            val directory = segments.joinToString("/")
            if (directory.isBlank()) rewrittenFile else "$directory/$rewrittenFile"
        }.getOrDefault(sourcePath)
    }

    fun capabilitiesJson(eligible: Boolean): JSONObject = JSONObject()
        .put("sourceView", true)
        .put("draft", eligible)
        .put("validate", eligible)
        .put("commit", eligible)

    fun sourceRevision(source: RuntimeSourceFile): String = source.revision ?: contentRevision(source.content)

    fun inspectWorkoutResource(source: RuntimeSourceFile, machineMaster: MasterDocument, gymMaster: MasterDocument): JSONObject {
        val build = runtimeDataBuilder.buildRuntimeDataPayload(listOf(source), machineMaster, gymMaster)
        val issues = JSONArray()
        appendJsonArray(issues, resourceIssuesFromErrors(build.errors))
        appendJsonArray(issues, resourceIssuesFromWarnings(build.warnings))
        val health = when {
            hasSeverity(issues, "broken") -> "broken"
            issues.length() > 0 -> "degraded"
            else -> "healthy"
        }
        return JSONObject()
            .put("path", source.path)
            .put("revision", sourceRevision(source))
            .put("resourceType", "WORKOUT")
            .put("inspectionVersion", 1)
            .put("health", health)
            .put("issues", issues)
    }

    private fun validationJson(
        draft: JSONObject,
        health: String,
        issues: JSONArray,
        commitAllowed: Boolean,
        replacementPath: String,
        pathChange: JSONObject?
    ): JSONObject = JSONObject()
        .put("sourceRevision", draft.optString("sourceRevision"))
        .put("draftRevision", draft.optInt("draftRevision"))
        .put("health", health)
        .put("issues", issues)
        .put("commitAllowed", commitAllowed)
        .put("replacementPath", replacementPath)
        .put("replacementContent", JSONObject.NULL)
        .put("changeSummary", JSONArray().put("replacement candidate generated"))
        .put("pathChange", pathChange ?: JSONObject.NULL)

    private fun unresolvedRecoveryIssues(fields: JSONArray): JSONArray {
        val issues = JSONArray()
        for (index in 0 until fields.length()) {
            val field = fields.optJSONObject(index) ?: continue
            if (field.optString("state") == "unresolved") {
                issues.put(JSONObject()
                    .put("code", "RECOVERY_FIELD_UNRESOLVED")
                    .put("severity", "broken")
                    .put("message", "Recovery field is unresolved.")
                    .put("location", JSONObject()
                        .put("line", JSONObject.NULL)
                        .put("recordId", JSONObject.NULL)
                        .put("sessionId", JSONObject.NULL)
                        .put("fieldPath", field.optString("fieldPath")))
                    .put("details", JSONObject.NULL))
            }
        }
        return issues
    }

    private fun duplicateRecoveryIssues(
        candidateFile: RuntimeSourceFile,
        otherWorkoutFiles: List<RuntimeSourceFile>,
        machineMaster: MasterDocument,
        gymMaster: MasterDocument
    ): JSONArray {
        val candidate = runtimeDataBuilder.buildRuntimeDataPayload(listOf(candidateFile), machineMaster, gymMaster)
        val others = runtimeDataBuilder.buildRuntimeDataPayload(otherWorkoutFiles, machineMaster, gymMaster)
        val otherSessionIds = linkedSetOf<String>()
        val otherSessions = JSONObject(others.payload ?: "{}").optJSONObject("data")?.optJSONArray("sessions") ?: JSONArray()
        for (index in 0 until otherSessions.length()) {
            val sessionId = otherSessions.optJSONObject(index)?.optString("session_id").orEmpty()
            if (sessionId.isNotBlank()) otherSessionIds.add(sessionId)
        }

        val issues = JSONArray()
        val candidateSessions = JSONObject(candidate.payload ?: "{}").optJSONObject("data")?.optJSONArray("sessions") ?: JSONArray()
        for (index in 0 until candidateSessions.length()) {
            val sessionId = candidateSessions.optJSONObject(index)?.optString("session_id").orEmpty()
            if (otherSessionIds.contains(sessionId)) {
                issues.put(JSONObject()
                    .put("code", "RECOVERY_DUPLICATE_SESSION_ID")
                    .put("severity", "broken")
                    .put("message", "Duplicate session_id: $sessionId.")
                    .put("location", JSONObject()
                        .put("line", JSONObject.NULL)
                        .put("recordId", JSONObject.NULL)
                        .put("sessionId", sessionId)
                        .put("fieldPath", "/session_id"))
                    .put("details", JSONObject.NULL))
            }
        }
        return issues
    }

    private fun buildRecoveryObject(fields: List<JSONObject>, prefix: String): JSONObject {
        val values = mutableMapOf<String, Any?>()
        val result = JSONObject()
        fields.sortedBy { it.optString("fieldPath") }.forEach { field ->
            val path = field.optString("fieldPath")
            val key = if (prefix.isEmpty()) path.trimStart('/') else path.removePrefix("$prefix/")
            if (key.isNotBlank() && !key.contains('/')) {
                values[key] = field.opt("value")
            }
        }
        androidRecoveryWorkoutFieldOrder.forEach { key ->
            if (values.containsKey(key)) result.put(key, values.remove(key))
        }
        values.keys.sorted().forEach { key -> result.put(key, values[key]) }
        return result
    }

    private fun resourceIssuesFromErrors(errors: JSONArray): JSONArray {
        val issues = JSONArray()
        for (index in 0 until errors.length()) {
            val error = errors.optJSONObject(index) ?: continue
            issues.put(JSONObject()
                .put("code", error.optString("code"))
                .put("severity", "broken")
                .put("message", error.optString("message"))
                .put("location", JSONObject.NULL)
                .put("details", JSONObject.NULL))
        }
        return issues
    }

    private fun resourceIssuesFromWarnings(warnings: JSONArray): JSONArray {
        val issues = JSONArray()
        for (index in 0 until warnings.length()) {
            val warning = warnings.optJSONObject(index) ?: continue
            issues.put(JSONObject()
                .put("code", warning.optString("code"))
                .put("severity", "warning")
                .put("message", warning.optString("message"))
                .put("location", JSONObject()
                    .put("line", if (warning.isNull("line")) JSONObject.NULL else warning.optInt("line"))
                    .put("recordId", JSONObject.NULL)
                    .put("sessionId", warning.optString("sessionId").takeIf { it.isNotBlank() } ?: JSONObject.NULL)
                    .put("fieldPath", JSONObject.NULL))
                .put("details", JSONObject()
                    .put("referenceKind", warning.optString("referenceKind"))
                    .put("resolutionState", warning.optString("resolutionState"))
                    .put("originalId", warning.optString("originalId"))
                    .put("resolvedId", if (warning.isNull("resolvedId")) JSONObject.NULL else warning.optString("resolvedId"))))
        }
        return issues
    }

    private fun hasSeverity(issues: JSONArray, severity: String): Boolean {
        for (index in 0 until issues.length()) {
            if (issues.optJSONObject(index)?.optString("severity") == severity) return true
        }
        return false
    }

    private fun extractWorkoutRecoveryFields(path: String, content: String): JSONArray {
        val lines = content.split("\r\n", "\n").withIndex().filter { it.value.isNotBlank() }
        if (path.endsWith(".jsonl", ignoreCase = true)) {
            val fields = JSONArray()
            lines.forEach { line ->
                appendJsonArray(fields, extractWorkoutObjectFields(runCatching { JSONObject(line.value) }.getOrNull(), "/sessions/${line.index}"))
            }
            return fields
        }
        return extractWorkoutObjectFields(runCatching { JSONObject(content) }.getOrNull(), "")
    }

    private fun extractWorkoutObjectFields(source: JSONObject?, prefix: String): JSONArray {
        if (source == null) return unresolvedWorkoutFields(prefix)
        return JSONArray()
            .put(recoverableField(source, "${prefix}/schema_version", "schema_version", "number"))
            .put(recoverableField(source, "${prefix}/session_id", "session_id", "string"))
            .put(recoverableField(source, "${prefix}/date", "date", "string"))
            .put(recoverableField(source, "${prefix}/status", "status", "string"))
            .put(recoverableField(source, "${prefix}/gym_id", "gym_id", "string"))
            .put(recoverableField(source, "${prefix}/condition", "condition", "object", optional = true))
            .put(recoverableField(source, "${prefix}/machines", "machines", "array"))
            .put(recoverableField(source, "${prefix}/notes", "notes", "array", optional = true))
    }

    private fun unresolvedWorkoutFields(prefix: String): JSONArray {
        val fields = JSONArray()
        listOf("/schema_version", "/session_id", "/date", "/status", "/gym_id", "/machines")
            .forEach { fields.put(JSONObject().put("fieldPath", prefix + it).put("state", "unresolved").put("source", "original")) }
        listOf("/condition", "/notes")
            .forEach { fields.put(JSONObject().put("fieldPath", prefix + it).put("state", "recovered").put("source", "original")) }
        return fields
    }

    private fun recoverableField(source: JSONObject, fieldPath: String, key: String, type: String, optional: Boolean = false): JSONObject {
        if (!source.has(key)) {
            return if (optional) {
                JSONObject().put("fieldPath", fieldPath).put("state", "recovered").put("source", "original")
            } else {
                JSONObject().put("fieldPath", fieldPath).put("state", "unresolved").put("source", "original")
            }
        }
        val value = source.opt(key)
        val matches = when (type) {
            "string" -> value is String
            "number" -> value is Number
            "object" -> value == JSONObject.NULL || value is JSONObject
            "array" -> value is JSONArray
            else -> false
        }
        return if (matches) {
            JSONObject().put("fieldPath", fieldPath).put("state", "recovered").put("source", "original").put("value", value)
        } else {
            JSONObject().put("fieldPath", fieldPath).put("state", "unresolved").put("source", "original")
        }
    }

    /**
     * Frontend へ opaque として公開する Recovery resource key を生成する。
     *
     * key の中身は Frontend business logic で復号・解析してはならない。
     */
    fun resourceKey(configuration: JSONObject, resourceType: String, sourcePath: String, sourceRevision: String): String {
        val repository = configuration.getJSONObject("repository")
        val key = listOf(
            repository.optString("owner"),
            repository.optString("repository"),
            repository.optString("ref"),
            repository.optString("rootPath"),
            resourceType,
            sourcePath,
            sourceRevision
        ).joinToString("|")
        return Base64.encodeToString(MessageDigest.getInstance("SHA-256").digest(key.toByteArray(StandardCharsets.UTF_8)), Base64.URL_SAFE or Base64.NO_WRAP or Base64.NO_PADDING)
    }

    private fun contentRevision(content: String): String =
        "content-sha256-${MessageDigest.getInstance("SHA-256").digest(content.toByteArray(StandardCharsets.UTF_8)).joinToString("") { "%02x".format(it) }}"

    private fun appendJsonArray(target: JSONArray, source: JSONArray) {
        for (index in 0 until source.length()) {
            target.put(source.get(index))
        }
    }
}
