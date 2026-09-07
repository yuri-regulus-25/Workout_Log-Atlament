package jp.yuri_regulus_25.atlament

import java.io.File
import java.nio.charset.StandardCharsets
import java.security.MessageDigest
import org.json.JSONArray
import org.json.JSONObject

class AndroidRecoveryDraftStore(
    private val draftDirectory: File,
    private val temporaryDirectory: File
) {
    fun countActive(): Int = runCatching {
        draftDirectory.listFiles { file -> file.extension == "json" }
            ?.count { file ->
                val envelope = JSONObject(file.readText(StandardCharsets.UTF_8))
                envelope.optJSONObject("draft")?.optInt("schemaVersion", -1) == 1
            } ?: 0
    }.getOrDefault(0)

    fun delete(resourceType: String, sourcePath: String, currentSourceRevision: String) {
        val draft = JSONObject()
            .put("resourceType", resourceType)
            .put("sourcePath", sourcePath)
            .put("sourceRevision", currentSourceRevision)
        val path = File(draftDirectory, draftFileName(draft))
        if (path.exists()) path.delete()
    }

    fun load(resourceType: String, sourcePath: String, currentSourceRevision: String): JSONObject {
        if (!draftDirectory.exists()) {
            return noDraft()
        }

        return try {
            draftDirectory.listFiles { file -> file.extension == "json" }
                ?.sortedBy { it.name }
                ?.forEach { file ->
                    val envelope = JSONObject(file.readText(StandardCharsets.UTF_8))
                    val draft = envelope.optJSONObject("draft") ?: return corruptedDraft()
                    if (draft.optString("resourceType") == resourceType && draft.optString("sourcePath") == sourcePath) {
                        val state = when {
                            draft.optInt("schemaVersion", -1) != 1 -> "incompatible"
                            draft.optString("sourceRevision") != currentSourceRevision -> "stale"
                            else -> "active"
                        }
                        return JSONObject().put("state", state).put("draft", draft)
                    }
                }
            noDraft()
        } catch (_: Exception) {
            corruptedDraft()
        }
    }

    fun findByResourceKey(
        configuration: JSONObject,
        resourceKey: String,
        resourceKeyOf: (JSONObject, String, String, String) -> String
    ): JSONObject? {
        if (!draftDirectory.exists()) {
            return null
        }

        return try {
            draftDirectory.listFiles { file -> file.extension == "json" }
                ?.sortedBy { it.name }
                ?.forEach { file ->
                    val envelope = JSONObject(file.readText(StandardCharsets.UTF_8))
                    val draft = envelope.optJSONObject("draft") ?: return null
                    if (draft.optInt("schemaVersion", -1) == 1 &&
                        draft.optString("resourceType") == "WORKOUT" &&
                        resourceKeyOf(
                            configuration,
                            draft.optString("resourceType"),
                            draft.optString("sourcePath"),
                            draft.optString("sourceRevision")
                        ) == resourceKey
                    ) {
                        return draft
                    }
                }
            null
        } catch (_: Exception) {
            null
        }
    }

    fun save(draft: JSONObject): JSONArray {
        return try {
            draftDirectory.mkdirs()
            temporaryDirectory.mkdirs()
            val path = File(draftDirectory, draftFileName(draft))
            val temporary = File(temporaryDirectory, path.name + ".tmp")
            temporary.writeText(JSONObject().put("draft", draft).toString(2), StandardCharsets.UTF_8)
            if (!temporary.renameTo(path)) throw IllegalStateException("Recovery Draft could not be replaced.")
            JSONArray()
        } catch (_: Exception) {
            errorsArray("RECOVERY_DRAFT_SAVE_FAILED", "Recovery Draft could not be saved.")
        }
    }

    private fun draftFileName(draft: JSONObject): String {
        val key = listOf(
            draft.optString("resourceType"),
            draft.optString("sourcePath"),
            draft.optString("sourceRevision")
        ).joinToString("|")
        return sha256Hex(key) + ".json"
    }

    private fun noDraft(): JSONObject = JSONObject().put("state", "none").put("draft", JSONObject.NULL)

    private fun corruptedDraft(): JSONObject = JSONObject().put("state", "corrupted").put("draft", JSONObject.NULL)

    private fun sha256Hex(value: String): String =
        MessageDigest.getInstance("SHA-256")
            .digest(value.toByteArray(StandardCharsets.UTF_8))
            .joinToString("") { "%02x".format(it) }
}
