package jp.yuri_regulus_25.atlament

import java.io.File
import java.nio.charset.StandardCharsets
import org.json.JSONArray
import org.json.JSONObject

internal class AndroidRuntimeDataStore(
    private val runtimeDataFile: File
) {
    fun exists(): Boolean = runtimeDataFile.exists()

    fun lastModifiedMillis(): Long = runtimeDataFile.lastModified()

    fun readText(): String = runtimeDataFile.readText(StandardCharsets.UTF_8)

    fun status(): String {
        if (!runtimeDataFile.exists()) return "unavailable"
        return if (hasRetainedErrors()) "degraded" else "available"
    }

    fun saveAtomically(payload: String): JSONArray {
        return try {
            runtimeDataFile.parentFile?.mkdirs()
            val directory = runtimeDataFile.parentFile ?: throw IllegalStateException("Runtime directory is unavailable.")
            val temporary = File(directory, runtimeDataFile.name + ".tmp")
            val backup = File(directory, runtimeDataFile.name + ".bak")
            temporary.writeText(payload, StandardCharsets.UTF_8)
            if (backup.exists() && !backup.delete()) {
                throw IllegalStateException("Existing runtime backup could not be removed.")
            }
            if (runtimeDataFile.exists() && !runtimeDataFile.renameTo(backup)) {
                throw IllegalStateException("Existing runtime data could not be preserved.")
            }
            if (!temporary.renameTo(runtimeDataFile)) {
                if (backup.exists()) backup.renameTo(runtimeDataFile)
                throw IllegalStateException("Temporary runtime data could not be moved.")
            }
            if (backup.exists()) backup.delete()
            JSONArray()
        } catch (_: Exception) {
            errorsArray("RUNTIME_DATA_SAVE_FAILED", "Runtime Data could not be saved.")
        }
    }

    private fun hasRetainedErrors(): Boolean = runCatching {
        val runtimeData = JSONObject(runtimeDataFile.readText(StandardCharsets.UTF_8))
        (runtimeData.optJSONArray("errors")?.length() ?: 0) > 0
    }.getOrDefault(false)
}
