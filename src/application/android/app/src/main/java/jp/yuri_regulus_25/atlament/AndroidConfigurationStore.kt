package jp.yuri_regulus_25.atlament

import java.io.File
import java.nio.charset.StandardCharsets
import org.json.JSONArray
import org.json.JSONObject

internal class AndroidConfigurationStore(private val configurationFile: File) {
    fun loadJson(): String = if (configurationFile.exists()) {
        configurationFile.readText(StandardCharsets.UTF_8)
    } else {
        defaultJson()
    }

    fun mergeJson(updateJson: String): String {
        val current = JSONObject(loadJson())
        if (updateJson.isBlank()) return current.toString(2)

        val update = JSONObject(updateJson)
        update.optJSONObject("repository")?.let { patch ->
            val repository = current.getJSONObject("repository")
            patch.keys().forEach { key ->
                if (!patch.isNull(key)) repository.put(key, patch.get(key))
            }
        }
        update.optJSONArray("resources")?.let { resources ->
            current.put("resources", resources)
        }
        update.optJSONObject("timeouts")?.let { patch ->
            val timeouts = current.getJSONObject("timeouts")
            patch.keys().forEach { key ->
                if (!patch.isNull(key)) timeouts.put(key, patch.get(key))
            }
        }
        return current.toString(2)
    }

    fun saveAtomically(json: String): JSONArray {
        return try {
            configurationFile.parentFile?.mkdirs()
            val temporary = File(configurationFile.parentFile, configurationFile.name + ".tmp")
            temporary.writeText(json, StandardCharsets.UTF_8)
            if (configurationFile.exists() && !configurationFile.delete()) {
                throw IllegalStateException("Existing configuration could not be replaced.")
            }
            if (!temporary.renameTo(configurationFile)) {
                throw IllegalStateException("Temporary configuration could not be moved.")
            }
            JSONArray()
        } catch (_: Exception) {
            errorsArray("CONFIG_SAVE_FAILED", "Configuration could not be saved.")
        }
    }

    private fun defaultJson(): String = """
        {
          "schemaVersion": 1,
          "repository": {
            "owner": "",
            "repository": "",
            "ref": "main",
            "rootPath": ""
          },
          "resources": [
            { "type": "WORKOUT", "path": "workouts/", "resourceKind": "directory", "required": true, "emptyAllowed": false },
            { "type": "MACHINE_MASTER", "path": "master/machines.json", "resourceKind": "file", "required": true, "emptyAllowed": false },
            { "type": "GYM_MASTER", "path": "master/gyms.json", "resourceKind": "file", "required": true, "emptyAllowed": false }
          ],
          "timeouts": {
            "githubRequestTimeoutSec": 10,
            "syncOperationTimeoutSec": 60,
            "generalApiTimeoutSec": 30,
            "shutdownTimeoutSec": 10
          }
        }
    """.trimIndent()
}
