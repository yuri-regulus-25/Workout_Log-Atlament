package jp.yuri_regulus_25.atlament

import java.time.LocalDate
import org.json.JSONArray
import org.json.JSONObject

/**
 * Repository source から Android AF の Runtime Data payload を構築する。
 *
 * Windows `RuntimeDataBuilder` と同じ product contract を Kotlin/JSON 実装で再現する。
 * Broken Workout resource は resource 単位で隔離し、未解決または削除済み Master reference は
 * warning と resolution facts に落として Runtime 採用を継続する。
 */
internal class AndroidRuntimeDataBuilder {
    private data class MasterRecordCatalog<T>(val lookup: Map<String, T>, val excludedIds: Set<String>, val structuralInvalid: Boolean)
    private data class MachineMasterItem(val id: String, val sourceIds: List<String>, val name: String, val bodyPart: String, val deleted: Boolean)
    private data class GymMasterItem(val id: String, val sourceIds: List<String>, val name: String, val shortName: String?, val deleted: Boolean)

    private val bodyParts = setOf("chest", "back", "legs", "shoulders", "arms", "glutes", "core", "cardio", "other")

    /**
     * Workout files と local/remote Master snapshot から `/runtime/workouts` 互換 payload を作る。
     *
     * payload が null の場合は新しい Runtime Data として保存してはならない。
     * payload が存在する場合、errors は隔離済み resource、warnings は user-actionable な確認事項として扱う。
     */
    fun buildRuntimeDataPayload(
        workoutFiles: List<RuntimeSourceFile>,
        machineMaster: MasterDocument,
        gymMaster: MasterDocument
    ): RuntimeBuildResult {
        val errors = JSONArray()
        val warnings = JSONArray()
        val machines = parseMachineMaster(RuntimeSourceFile(machineMaster.path, machineMaster.content), errors)
        val gyms = parseGymMaster(RuntimeSourceFile(gymMaster.path, gymMaster.content), errors)
        if (machines.structuralInvalid || gyms.structuralInvalid) return RuntimeBuildResult(null, errors, warnings)

        val sessions = JSONArray()
        workoutFiles.sortedBy { it.path }.forEach { file ->
            val resourceSessions = JSONArray()
            val resourceErrors = JSONArray()
            val resourceWarnings = JSONArray()
            if (file.path.endsWith(".jsonl", ignoreCase = true)) {
                file.content.split("\r\n", "\n").forEachIndexed { index, line ->
                    if (line.isNotBlank()) buildSession(file.path, index + 1, line, machines, gyms, resourceErrors, resourceWarnings)?.let(resourceSessions::put)
                }
            } else if (file.path.endsWith(".json", ignoreCase = true)) {
                buildSession(file.path, null, file.content, machines, gyms, resourceErrors, resourceWarnings)?.let(resourceSessions::put)
            }

            if (resourceErrors.length() > 0) {
                appendJsonArray(errors, resourceErrors)
            } else {
                appendJsonArray(sessions, resourceSessions)
                appendJsonArray(warnings, resourceWarnings)
            }
        }

        val payload = JSONObject()
            .put("success", true)
            .put("errors", errors)
            .put("warnings", warnings)
            .put("data", JSONObject().put("sessions", sessions))
            .put("masterDocuments", JSONObject()
                .put("machine", masterDocumentJson(machineMaster))
                .put("gym", masterDocumentJson(gymMaster)))
            .toString(2)
        return RuntimeBuildResult(payload, errors, warnings)
    }

    private fun parseMachineMaster(file: RuntimeSourceFile, errors: JSONArray): MasterRecordCatalog<MachineMasterItem> {
        return try {
            val root = JSONObject(file.content)
            val items = root.optJSONArray("machines")
            if (!root.has("schema_version") || items == null) {
                errors.put(errorJson("RUNTIME_DATA_INVALID", "${file.path}: Machine master contract is invalid."))
                return MasterRecordCatalog(emptyMap(), emptySet(), structuralInvalid = true)
            }

            val candidates = mutableListOf<MachineMasterItem>()
            val excludedIds = linkedSetOf<String>()
            for (index in 0 until items.length()) {
                val item = items.optJSONObject(index)
                val id = item?.optString("machine_id").orEmpty().trim()
                val sourceIds = readStringList(item?.optJSONArray("source_ids"))
                val name = item?.optString("name").orEmpty().trim()
                val bodyPart = item?.optString("body_part").orEmpty().trim()
                val hasActive = item?.has("active") == true
                if (id.isBlank() || name.isBlank() || bodyPart !in bodyParts || !hasActive) {
                    errors.put(errorJson("RUNTIME_DATA_INVALID", "${file.path}: Machine master item is invalid."))
                    addRecoverableMasterKeys(item, "machine_id", excludedIds)
                    continue
                }
                val record = MachineMasterItem(id, sourceIds, name, bodyPart, item?.optBoolean("deleted", false) ?: false)
                candidates.add(record)
            }
            buildMasterCatalog(candidates, { it.id }, { it.sourceIds }, excludedIds, file.path, "Machine", errors)
        } catch (_: Exception) {
            errors.put(errorJson("RUNTIME_DATA_INVALID", "${file.path}: Machine master JSON is invalid."))
            MasterRecordCatalog(emptyMap(), emptySet(), structuralInvalid = true)
        }
    }

    private fun parseGymMaster(file: RuntimeSourceFile, errors: JSONArray): MasterRecordCatalog<GymMasterItem> {
        return try {
            val root = JSONObject(file.content)
            val items = root.optJSONArray("gyms")
            if (!root.has("schema_version") || items == null) {
                errors.put(errorJson("RUNTIME_DATA_INVALID", "${file.path}: Gym master contract is invalid."))
                return MasterRecordCatalog(emptyMap(), emptySet(), structuralInvalid = true)
            }

            val candidates = mutableListOf<GymMasterItem>()
            val excludedIds = linkedSetOf<String>()
            for (index in 0 until items.length()) {
                val item = items.optJSONObject(index)
                val id = item?.optString("gym_id").orEmpty().trim()
                val sourceIds = readStringList(item?.optJSONArray("source_ids"))
                val name = item?.optString("name").orEmpty().trim()
                val hasActive = item?.has("active") == true
                if (id.isBlank() || name.isBlank() || !hasActive) {
                    errors.put(errorJson("RUNTIME_DATA_INVALID", "${file.path}: Gym master item is invalid."))
                    addRecoverableMasterKeys(item, "gym_id", excludedIds)
                    continue
                }
                val shortName = item?.optString("short_name")?.takeIf { it.isNotBlank() }
                val record = GymMasterItem(id, sourceIds, name, shortName, item?.optBoolean("deleted", false) ?: false)
                candidates.add(record)
            }
            buildMasterCatalog(candidates, { it.id }, { it.sourceIds }, excludedIds, file.path, "Gym", errors)
        } catch (_: Exception) {
            errors.put(errorJson("RUNTIME_DATA_INVALID", "${file.path}: Gym master JSON is invalid."))
            MasterRecordCatalog(emptyMap(), emptySet(), structuralInvalid = true)
        }
    }

    private fun <T> buildMasterCatalog(
        candidates: List<T>,
        idOf: (T) -> String,
        sourceIdsOf: (T) -> List<String>,
        excludedIds: MutableSet<String>,
        filePath: String,
        label: String,
        errors: JSONArray
    ): MasterRecordCatalog<T> {
        val ownersByKey = linkedMapOf<String, MutableList<T>>()
        candidates.forEach { candidate ->
            candidateKeys(idOf(candidate), sourceIdsOf(candidate)).forEach { key ->
                ownersByKey.getOrPut(key) { mutableListOf() }.add(candidate)
            }
        }

        val excludedRecords = linkedSetOf<T>()
        ownersByKey.forEach { (key, owners) ->
            if (owners.size > 1) {
                errors.put(errorJson("RUNTIME_DATA_INVALID", "$filePath: $label master duplicate reference key is excluded: $key."))
                excludedRecords.addAll(owners)
            }
        }

        val lookup = linkedMapOf<String, T>()
        candidates.forEach { candidate ->
            val keys = candidateKeys(idOf(candidate), sourceIdsOf(candidate))
            if (candidate in excludedRecords) {
                excludedIds.addAll(keys)
            } else {
                keys.forEach { key -> lookup[key] = candidate }
            }
        }

        return MasterRecordCatalog(lookup, excludedIds, structuralInvalid = false)
    }

    private fun candidateKeys(id: String, sourceIds: List<String>): List<String> =
        (listOf(id) + sourceIds).map { it.trim() }.filter { it.isNotBlank() }.distinct()

    private fun addRecoverableMasterKeys(item: JSONObject?, idField: String, excludedIds: MutableSet<String>) {
        val id = item?.optString(idField).orEmpty().trim()
        if (id.isNotBlank()) excludedIds.add(id)
        excludedIds.addAll(readStringList(item?.optJSONArray("source_ids")))
    }

    /**
     * 1 Workout record を Runtime session JSON へ正規化する。
     *
     * 必須構造違反は broken、Master reference の missing/deleted/invalid_excluded は warning として分類する。
     */
    private fun buildSession(
        filePath: String,
        line: Int?,
        content: String,
        machines: MasterRecordCatalog<MachineMasterItem>,
        gyms: MasterRecordCatalog<GymMasterItem>,
        errors: JSONArray,
        warnings: JSONArray
    ): JSONObject? {
        val root = try {
            JSONObject(content)
        } catch (_: Exception) {
            errors.put(errorJson("RUNTIME_DATA_INVALID", location(filePath, line) + "Workout JSON is invalid."))
            return null
        }

        val schemaVersion = root.optInt("schema_version", Int.MIN_VALUE)
        val sessionId = root.optString("session_id").trim()
        val date = root.optString("date").trim()
        val status = root.optString("status").trim()
        val gymId = root.optString("gym_id").trim()
        val machineItems = root.optJSONArray("machines")
        val parsedDate = runCatching { LocalDate.parse(date) }.getOrNull()
        if (schemaVersion == Int.MIN_VALUE || sessionId.isBlank() || parsedDate == null || status !in setOf("complete", "partial") || gymId.isBlank() || machineItems == null) {
            errors.put(errorJson("RUNTIME_DATA_INVALID", location(filePath, line) + "Workout required fields are invalid."))
            return null
        }
        if (status == "complete" && machineItems.length() == 0) {
            errors.put(errorJson("RUNTIME_DATA_INVALID", location(filePath, line) + "Complete workout session requires machines."))
            return null
        }

        val gym = gyms.lookup[gymId]
        val gymInvalidExcluded = gym == null && gymId in gyms.excludedIds
        if (gym == null || gym.deleted) {
            warnings.put(referenceWarningJson("gym", gymId, gym?.id, gym?.deleted ?: false, gymInvalidExcluded, sessionId, filePath, line))
        }

        val normalizedMachines = JSONArray()
        for (index in 0 until machineItems.length()) {
            val normalized = buildMachine(filePath, line, machineItems.optJSONObject(index), machines, errors, warnings, sessionId) ?: return null
            normalizedMachines.put(normalized)
        }
        if (status == "complete" && normalizedMachines.length() == 0) {
            errors.put(errorJson("RUNTIME_DATA_INVALID", location(filePath, line) + "Complete workout session requires valid machines."))
            return null
        }

        val normalizedGym = JSONObject()
            .put("id", gym?.id ?: gymId)
            .put("resolution", referenceResolutionJson(gymId, gym?.id, gym?.deleted ?: false, gymInvalidExcluded))
        if (gym != null && !gym.deleted) {
            normalizedGym
                .put("name", gym.name)
                .put("short_name", gym.shortName ?: JSONObject.NULL)
        }

        return JSONObject()
            .put("schema_version", schemaVersion)
            .put("session_id", sessionId)
            .put("date", date)
            .put("status", status)
            .put("gym", normalizedGym)
            .put("condition", root.optJSONObject("condition") ?: JSONObject.NULL)
            .put("machines", normalizedMachines)
            .put("notes", readStringArray(root.optJSONArray("notes")))
    }

    private fun buildMachine(
        filePath: String,
        line: Int?,
        item: JSONObject?,
        masters: MasterRecordCatalog<MachineMasterItem>,
        errors: JSONArray,
        warnings: JSONArray,
        sessionId: String
    ): JSONObject? {
        val machineId = item?.optString("machine_id").orEmpty().trim()
        val setItems = item?.optJSONArray("sets")
        if (item == null || machineId.isBlank() || setItems == null || setItems.length() == 0) {
            errors.put(errorJson("RUNTIME_DATA_INVALID", location(filePath, line) + "Machine required fields are invalid."))
            return null
        }

        val master = masters.lookup[machineId]
        val invalidExcluded = master == null && machineId in masters.excludedIds
        if (master == null || master.deleted) {
            warnings.put(referenceWarningJson("machine", machineId, master?.id, master?.deleted ?: false, invalidExcluded, sessionId, filePath, line))
        }

        val sets = JSONArray()
        for (index in 0 until setItems.length()) {
            val set = setItems.optJSONObject(index)
            if (set == null || !set.has("set") || !set.has("weight_kg") || !set.has("reps")) {
                errors.put(errorJson("RUNTIME_DATA_INVALID", location(filePath, line) + "Set in machine $machineId is invalid."))
                return null
            }
            sets.put(JSONObject()
                .put("set", set.optInt("set"))
                .put("weight_kg", set.optDouble("weight_kg"))
                .put("reps", set.optInt("reps"))
                .put("rir", if (set.has("rir") && !set.isNull("rir")) set.optDouble("rir") else JSONObject.NULL)
                .put("failure", if (set.has("failure") && !set.isNull("failure")) set.optBoolean("failure") else JSONObject.NULL)
                .put("warmup", if (set.has("warmup") && !set.isNull("warmup")) set.optBoolean("warmup") else JSONObject.NULL)
                .put("note", set.optString("note").takeIf { it.isNotBlank() } ?: JSONObject.NULL))
        }

        val normalized = JSONObject()
            .put("machine_id", master?.id ?: machineId)
            .put("resolution", referenceResolutionJson(machineId, master?.id, master?.deleted ?: false, invalidExcluded))
            .put("sets", sets)
            .put("notes", readStringArray(item.optJSONArray("notes")))
        if (master != null && !master.deleted) {
            normalized
                .put("name", master.name)
                .put("body_part", master.bodyPart)
        }
        return normalized
    }

    private fun referenceResolutionJson(originalId: String, resolvedId: String?, deleted: Boolean, invalidExcluded: Boolean): JSONObject {
        return JSONObject()
            .put("state", androidMasterReferenceResolutionState(resolvedId, deleted, invalidExcluded))
            .put("originalId", originalId)
            .put("resolvedId", resolvedId ?: JSONObject.NULL)
    }

    private fun referenceWarningJson(
        referenceKind: String,
        originalId: String,
        resolvedId: String?,
        deleted: Boolean,
        invalidExcluded: Boolean,
        sessionId: String,
        filePath: String,
        line: Int?
    ): JSONObject {
        val resolutionState = if (invalidExcluded) "invalid_excluded" else if (deleted) "deleted" else "missing"
        val subject = if (referenceKind == "gym") "ジム" else "マシン"
        val stateText = if (invalidExcluded) "Runtime採用対象から除外されています" else if (deleted) "削除されています" else "存在しません"
        return JSONObject()
            .put("code", androidMasterReferenceWarningCode(deleted, invalidExcluded))
            .put("referenceKind", referenceKind)
            .put("resolutionState", resolutionState)
            .put("originalId", originalId)
            .put("resolvedId", resolvedId ?: JSONObject.NULL)
            .put("sessionId", sessionId)
            .put("filePath", filePath)
            .put("line", line ?: JSONObject.NULL)
            .put("message", "特定の${subject}が${stateText}: $originalId")
    }

    private fun readStringArray(array: JSONArray?): JSONArray {
        val result = JSONArray()
        if (array == null) return result
        for (index in 0 until array.length()) {
            val value = array.optString(index)
            if (value.isNotBlank()) result.put(value)
        }
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

    private fun location(filePath: String, line: Int?): String =
        if (line == null) "$filePath: " else "$filePath:$line: "

    private fun masterDocumentJson(document: MasterDocument): JSONObject = JSONObject()
        .put("type", document.type)
        .put("path", document.path)
        .put("revision", document.revision)
        .put("content", document.content)

    private fun appendJsonArray(target: JSONArray, source: JSONArray) {
        for (index in 0 until source.length()) {
            target.put(source.get(index))
        }
    }
}
