package jp.yuri_regulus_25.atlament

import android.content.Context
import android.content.SharedPreferences
import android.database.sqlite.SQLiteDatabase
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import java.io.BufferedInputStream
import java.io.BufferedReader
import java.io.ByteArrayInputStream
import java.io.Closeable
import java.io.File
import java.io.InputStream
import java.io.InputStreamReader
import java.io.OutputStream
import java.net.HttpURLConnection
import java.net.InetAddress
import java.net.ServerSocket
import java.net.Socket
import java.net.URL
import java.net.URLDecoder
import java.net.URLEncoder
import java.nio.charset.StandardCharsets
import java.security.KeyStore
import java.time.LocalDate
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec
import org.json.JSONArray
import org.json.JSONObject

class AndroidLocalhostServer(
    private val context: Context,
    private val onShutdown: () -> Unit = {}
) : Closeable {
    private data class RuntimeSourceFile(val path: String, val content: String)
    private data class SyncResponse(val status: Int, val body: String, val success: Boolean)
    private data class RuntimeBuildResult(val payload: String?, val errors: JSONArray)
    private data class RuntimeFetchedResources(
        val workoutFiles: List<RuntimeSourceFile>,
        val machineMaster: RuntimeSourceFile?,
        val gymMaster: RuntimeSourceFile?
    )
    private data class MachineMasterItem(val id: String, val name: String, val bodyPart: String)
    private data class GymMasterItem(val id: String, val name: String, val shortName: String?)
    private class AfException(val code: String, override val message: String) : Exception(message)
    private val appNames = setOf("dashboard", "workouts", "machines", "analytics", "settings", "maintenance")
    private val bodyParts = setOf("chest", "back", "legs", "shoulders", "arms", "glutes", "core", "cardio", "other")
    private val resourceTypes = setOf("WORKOUT", "MACHINE_MASTER", "GYM_MASTER")
    private val resourceKinds = setOf("file", "directory")
    private val configurationFile = File(context.filesDir, "configuration/af-settings.json")
    private val credentialPreferences: SharedPreferences = context.getSharedPreferences("atlament_secure_credential", Context.MODE_PRIVATE)
    private val credentialKeyAlias = "atlament_github_token"
    private val credentialCiphertextKey = "github_token_ciphertext"
    private val credentialIvKey = "github_token_iv"
    private val credentialLimitDateKey = "github_token_limit_date"
    private val runtimeDataFile = File(context.filesDir, "runtime/current/runtime-workouts.json")
    private val logDatabaseFile = File(context.filesDir, "log/atlament-log.sqlite")
    private val operationLock = Object()
    @Volatile private var startupSyncStatus = "idle"
    @Volatile private var manualSyncStatus = "idle"
    @Volatile private var configurationUpdateStatus = "idle"
    @Volatile private var credentialUpdateStatus = "idle"
    @Volatile private var shutdownStatus = "idle"
    @Volatile private var githubComponentStatus = "unknown"
    private val running = AtomicBoolean(false)
    private val shutdownRequested = AtomicBoolean(false)
    private val acceptExecutor: ExecutorService = Executors.newSingleThreadExecutor()
    private val requestExecutor: ExecutorService = Executors.newCachedThreadPool()
    private var serverSocket: ServerSocket? = null

    var port: Int = 0
        private set

    val baseUrl: String
        get() = "http://127.0.0.1:$port/"

    fun start() {
        if (running.get()) return

        val lastError = mutableListOf<Exception>()
        for (candidate in listOf(14108, 45194)) {
            try {
                // Match Windows AF port order so Frontend and smoke checks can share the same
                // primary/secondary localhost assumptions across platforms.
                val socket = ServerSocket(candidate, 50, InetAddress.getByName("127.0.0.1"))
                serverSocket = socket
                port = candidate
                running.set(true)
                initializeLog()
                writeLog("INFO", "HTTP server started on 127.0.0.1:$candidate.")
                acceptExecutor.execute { acceptLoop(socket) }
                startStartupSync()
                return
            } catch (ex: Exception) {
                lastError.add(ex)
            }
        }

        throw IllegalStateException("Primary and secondary HTTP ports are unavailable.", lastError.lastOrNull())
    }

    private fun acceptLoop(socket: ServerSocket) {
        while (running.get()) {
            try {
                val client = socket.accept()
                requestExecutor.execute { handleClient(client) }
            } catch (_: Exception) {
                if (running.get()) break
            }
        }
    }

    private fun handleClient(socket: Socket) {
        socket.use { client ->
            val input = BufferedInputStream(client.getInputStream())
            val reader = BufferedReader(InputStreamReader(input, StandardCharsets.UTF_8))
            val requestLine = reader.readLine() ?: return
            var contentLength = 0
            while (true) {
                val line = reader.readLine() ?: break
                if (line.isEmpty()) break
                val separator = line.indexOf(':')
                if (separator > 0 && line.substring(0, separator).equals("Content-Length", ignoreCase = true)) {
                    contentLength = line.substring(separator + 1).trim().toIntOrNull() ?: 0
                }
            }
            val body = if (contentLength > 0) {
                val chars = CharArray(contentLength)
                val count = reader.read(chars, 0, contentLength)
                if (count > 0) String(chars, 0, count) else ""
            } else {
                ""
            }

            val parts = requestLine.split(" ")
            if (parts.size < 2) {
                sendJson(client.getOutputStream(), 400, failJson("COMMON_INVALID_REQUEST", "HTTP request line is invalid."))
                return
            }

            val method = parts[0]
            val path = sanitizePath(parts[1])
            if (path.startsWith("/api/")) {
                handleApi(client.getOutputStream(), method, path, body)
            } else if (method == "GET") {
                serveAsset(client.getOutputStream(), path)
            } else {
                sendJson(client.getOutputStream(), 405, failJson("METHOD_NOT_ALLOWED", "Only GET is supported for frontend assets."))
            }
        }
    }


    private fun handleApi(output: OutputStream, method: String, path: String, body: String) {
        if (!path.startsWith("/api/v1/common")) {
            sendJson(output, 501, failJson("COMMON_NOT_IMPLEMENTED", "This Android API route is not implemented yet."))
            return
        }

        val route = path.removePrefix("/api/v1/common")
        when {
            method == "GET" && route == "/status" -> sendJson(output, 200, statusJson())
            method == "GET" && route == "/configuration" -> sendJson(output, 200, okJson(loadConfigurationJson()))
            method == "GET" && route == "/credential/status" -> sendJson(output, 200, okJson(credentialStatusJson()))
            method == "GET" && route == "/master-write/boundary" -> sendJson(output, 200, okJson(masterWriteBoundaryJson()))
            method == "GET" && route == "/runtime/workouts" -> sendRuntimeWorkoutData(output)
            method == "POST" && route == "/configuration" -> sendConfigurationUpdate(output, body)
            method == "POST" && route == "/credential" -> sendCredentialUpdate(output, body)
            method == "POST" && route == "/sync" -> sendManualSync(output)
            method == "POST" && route == "/shutdown" -> sendShutdown(output)
            else -> sendJson(output, 501, failJson("COMMON_NOT_IMPLEMENTED", "This Android API route is not implemented yet."))
        }
    }

    private fun sanitizePath(rawPath: String): String {
        // Asset serving accepts browser paths, not filesystem paths. Normalize before routing so
        // encoded traversal attempts cannot escape the packaged frontend directory.
        val withoutQuery = rawPath.substringBefore('?').substringBefore('#')
        val decoded = URLDecoder.decode(withoutQuery, StandardCharsets.UTF_8.name()).replace('\\', '/')
        val segments = decoded.split('/').filter { it.isNotEmpty() }
        val normalized = mutableListOf<String>()
        for (segment in segments) {
            when (segment) {
                "." -> Unit
                ".." -> return "/__invalid__"
                else -> normalized.add(segment)
            }
        }
        return "/" + normalized.joinToString("/")
    }

    private fun serveAsset(output: OutputStream, path: String) {
        val assetPath = resolveAssetPath(path)
        if (assetPath == null) {
            sendErrorPage(output, 404)
            return
        }

        try {
            context.assets.open(assetPath).use { stream ->
                sendStream(output, 200, contentType(assetPath), stream)
            }
        } catch (_: java.io.FileNotFoundException) {
            sendErrorPage(output, 404)
        } catch (_: Exception) {
            sendErrorPage(output, 500)
        }
    }

    private fun resolveAssetPath(path: String): String? {
        val normalized = path.trimStart('/')
        val root = normalized.substringBefore('/')
        return when {
            path == "/" || normalized.isEmpty() -> "frontend/index.html"
            normalized == "error.css" -> "frontend/error.css"
            normalized == "404.html" || normalized == "500.html" || normalized == "503.html" -> "frontend/$normalized"
            normalized.startsWith("android/") -> normalized
            normalized.startsWith("frontend/") -> normalized
            normalized in appNames -> "frontend/$normalized/index.html"
            root in appNames && isDefinedMpaRoute(root, normalized.removePrefix("$root/")) -> "frontend/$root/index.html"
            normalized.contains('.') -> "frontend/$normalized"
            else -> null
        }
    }

    private fun isDefinedMpaRoute(app: String, route: String): Boolean {
        val normalized = route.trim('/')
        return when (app) {
            "workouts" -> normalized.matches(Regex("""\d{4}-\d{2}-\d{2}"""))
            "machines" -> normalized.matches(Regex("""[A-Za-z0-9][A-Za-z0-9_-]*"""))
            else -> false
        }
    }

    private fun statusJson(): String = """
        {
          "success": true,
          "errors": [],
          "data": {
            "versions": {
              "applicationFramework": "${BuildConfig.VERSION_NAME}",
              "frontendFramework": "${frontendVersionJson().optString("frontend", "unknown")}",
              "nativePackages": {
                "windows": {
                  "version": "${frontendVersionJson().optString("windows", "unknown")}"
                },
                "android": {
                  "versionName": "${BuildConfig.VERSION_NAME}",
                  "versionCode": ${BuildConfig.VERSION_CODE}
                }
              }
            },
            "readiness": ${readinessJson()},
            "application": {
              "status": "${applicationStatus()}",
              "degraded": ${applicationStatus() == "degraded"},
              "acceptingRequests": true
            },
            "operations": {
              "startup": "$startupSyncStatus",
              "manualSync": "${manualSyncStatus}",
              "configurationUpdate": "$configurationUpdateStatus",
              "credentialUpdate": "$credentialUpdateStatus",
              "shutdown": "$shutdownStatus"
            },
            "components": {
              "configuration": "${configurationStatus()}",
              "credential": "${credentialComponentStatus()}",
              "github": "${githubStatus()}",
              "runtimeData": "${runtimeDataStatus()}",
              "hosting": ${hostingStatusJson()}
            },
            "requiredActions": ${requiredActionsJson()}
          }
        }
    """.trimIndent()


    private fun frontendVersionJson(): JSONObject = runCatching {
        context.assets.open("frontend/version.json").use { stream ->
            JSONObject(stream.bufferedReader(StandardCharsets.UTF_8).readText())
        }
    }.getOrDefault(JSONObject())

    private fun hostingStatusJson(): String = """
        {
          "portal": "${assetStatus("frontend/index.html")}",
          "dashboard": "${assetStatus("frontend/dashboard/index.html")}",
          "workouts": "${assetStatus("frontend/workouts/index.html")}",
          "machines": "${assetStatus("frontend/machines/index.html")}",
          "analytics": "${assetStatus("frontend/analytics/index.html")}",
          "settings": "${assetStatus("frontend/settings/index.html")}",
          "maintenance": "${assetStatus("frontend/maintenance/index.html")}"
        }
    """.trimIndent()

    private fun assetStatus(assetPath: String): String = if (assetExists(assetPath)) "available" else "degraded"

    private fun assetExists(assetPath: String): Boolean = runCatching {
        context.assets.open(assetPath).use { true }
    }.getOrDefault(false)
    private fun configurationStatus(): String {
        if (!configurationFile.exists()) return "unavailable"
        return runCatching {
            if (validateConfiguration(JSONObject(configurationFile.readText(StandardCharsets.UTF_8))).length() == 0) "available" else "unavailable"
        }.getOrDefault("unavailable")
    }

    private fun applicationStatus(): String =
        if (configurationStatus() == "available" && runtimeDataStatus() == "available" && requiredActionNames().isEmpty()) "ready" else "degraded"

    private fun readinessJson(): String {
        val requiredActions = requiredActionNames().sorted()
        val unavailableComponents = mutableListOf<String>()
        if (configurationStatus() == "unavailable") unavailableComponents.add("configuration")
        if (credentialComponentStatus() == "unavailable") unavailableComponents.add("credential")
        if (runtimeDataStatus() == "unavailable") unavailableComponents.add("runtimeData")
        val degradedComponents = mutableListOf<String>()
        if (githubStatus() == "degraded") degradedComponents.add("github")
        val state = when {
            requiredActions.contains("CONFIGURATION_REQUIRED") || requiredActions.contains("CREDENTIAL_REQUIRED") -> "unconfigured"
            unavailableComponents.contains("runtimeData") -> "unavailable"
            applicationStatus() == "degraded" || degradedComponents.isNotEmpty() || requiredActions.isNotEmpty() -> "degraded"
            else -> "ready"
        }
        return """
            {
              "state": "$state",
              "requiredActions": ${requiredActions.joinToString(prefix = "[", postfix = "]") { "\"$it\"" }},
              "unavailableComponents": ${unavailableComponents.joinToString(prefix = "[", postfix = "]") { "\"$it\"" }},
              "degradedComponents": ${degradedComponents.joinToString(prefix = "[", postfix = "]") { "\"$it\"" }}
            }
        """.trimIndent()
    }

    private fun requiredActionsJson(): String =
        requiredActionNames().joinToString(prefix = "[", postfix = "]") { "\"$it\"" }

    private fun requiredActionNames(): List<String> {
        val actions = mutableListOf("RUNTIME_DATA_REQUIRED")
        if (runtimeDataFile.exists()) actions.remove("RUNTIME_DATA_REQUIRED")
        if (credentialState() != "available") actions.add(0, "CREDENTIAL_REQUIRED")
        if (configurationStatus() != "available") actions.add(0, "CONFIGURATION_REQUIRED")
        return actions
    }

    private fun loadConfigurationJson(): String = if (configurationFile.exists()) {
        configurationFile.readText(StandardCharsets.UTF_8)
    } else {
        defaultConfigurationJson()
    }

    private fun masterWriteBoundaryJson(): String {
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

    private fun sendConfigurationUpdate(output: OutputStream, updateJson: String) {
        val response = configurationUpdateResponse(updateJson)
        sendJson(output, response.status, response.body)
    }

    private fun configurationUpdateResponse(updateJson: String): SyncResponse {
        if (!tryStartOperation("configurationUpdate")) {
            return SyncResponse(409, failJson("OPERATION_ALREADY_RUNNING", "Configuration update is already running."), false)
        }

        var success = false
        return try {
            val update = if (updateJson.isBlank()) JSONObject() else JSONObject(updateJson)
            val merged = JSONObject(mergeConfigurationJson(update.toString()))
            val validationErrors = validateConfiguration(merged)
            if (validationErrors.length() > 0) {
                return SyncResponse(400, responseJson(false, "null", validationErrors), false)
            }

            val saveErrors = saveConfigurationAtomically(merged.toString(2))
            if (saveErrors.length() > 0) {
                return SyncResponse(500, responseJson(false, "null", saveErrors), false)
            }

            val remoteChanged = update.has("repository") || update.has("resources")
            val remoteErrors = if (remoteChanged) checkRemoteConfiguration(merged) else JSONArray()
            githubComponentStatus = if (!remoteChanged) githubComponentStatus else if (remoteErrors.length() == 0) "available" else "degraded"
            success = true
            SyncResponse(200, okJson("""
                {
                  "remoteChecked": $remoteChanged
                }
            """.trimIndent(), remoteErrors.toString()), true)
        } catch (_: Exception) {
            SyncResponse(500, failJson("COMMON_INTERNAL_ERROR", "Configuration update failed."), false)
        } finally {
            completeOperation("configurationUpdate", success)
        }
    }

    private fun validateConfiguration(configuration: JSONObject): JSONArray {
        val errors = JSONArray()
        if (configuration.optInt("schemaVersion", Int.MIN_VALUE) != 1) {
            errors.put(errorJson("CONFIG_INVALID", "Unsupported configuration schemaVersion."))
        }

        val repository = configuration.optJSONObject("repository")
        if (repository == null ||
            repository.optString("owner").trim().isBlank() ||
            repository.optString("repository").trim().isBlank() ||
            repository.optString("ref", "main").trim().isBlank()
        ) {
            errors.put(errorJson("CONFIG_INVALID", "Repository configuration is invalid."))
        }

        val resources = configuration.optJSONArray("resources")
        if (resources == null || resources.length() == 0) {
            errors.put(errorJson("CONFIG_INVALID", "Resource configuration is required."))
        } else {
            for (index in 0 until resources.length()) {
                val resource = resources.optJSONObject(index)
                if (resource == null ||
                    resource.optString("type") !in resourceTypes ||
                    resource.optString("resourceKind") !in resourceKinds ||
                    resource.optString("path").trim().isBlank() ||
                    !resource.has("required") ||
                    !resource.has("emptyAllowed")
                ) {
                    errors.put(errorJson("CONFIG_INVALID", "Resource configuration is invalid."))
                    break
                }
            }
        }

        val timeouts = configuration.optJSONObject("timeouts")
        if (timeouts == null) {
            errors.put(errorJson("CONFIG_INVALID", "Timeout configuration is required."))
        } else {
            validateRange(timeouts.optInt("githubRequestTimeoutSec", Int.MIN_VALUE), 1, 120, "githubRequestTimeoutSec", errors)
            validateRange(timeouts.optInt("syncOperationTimeoutSec", Int.MIN_VALUE), 5, 600, "syncOperationTimeoutSec", errors)
            validateRange(timeouts.optInt("generalApiTimeoutSec", Int.MIN_VALUE), 1, 120, "generalApiTimeoutSec", errors)
            validateRange(timeouts.optInt("shutdownTimeoutSec", Int.MIN_VALUE), 1, 60, "shutdownTimeoutSec", errors)
        }
        return errors
    }

    private fun validateRange(value: Int, min: Int, max: Int, name: String, errors: JSONArray) {
        if (value < min || value > max) errors.put(errorJson("CONFIG_INVALID", "$name is out of range."))
    }

    private fun saveConfigurationAtomically(json: String): JSONArray {
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

    private fun checkRemoteConfiguration(configuration: JSONObject): JSONArray {
        return try {
            fetchConfiguredResources(configuration)
            JSONArray()
        } catch (ex: AfException) {
            errorsArray(ex.code, ex.message)
        } catch (ex: Exception) {
            errorsArray("GITHUB_CONNECTION_FAILED", ex.message ?: "GitHub configuration check failed.")
        }
    }
    private fun okJson(dataJson: String, errorsJson: String = "[]"): String = """
        {
          "success": true,
          "errors": $errorsJson,
          "data": $dataJson
        }
    """.trimIndent()

    private fun mergeConfigurationJson(updateJson: String): String {
        val current = JSONObject(loadConfigurationJson())
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
    private fun defaultConfigurationJson(): String = """
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

    private fun credentialStatusJson(): String = credentialStatusJsonFor(credentialState())

    private fun credentialUpdateResultJson(updateJson: String): String {
        val currentToken = readCredentialToken()
        val update = if (updateJson.isBlank()) JSONObject() else JSONObject(updateJson)
        val token = update.optString("token", "").trim().ifEmpty { currentToken }
        val limitDate = if (update.has("limitDate") && !update.isNull("limitDate")) {
            update.optString("limitDate", "").trim().ifEmpty { null }
        } else {
            null
        }

        if (!limitDate.isNullOrBlank() && runCatching { LocalDate.parse(limitDate) }.isFailure) {
            return credentialStatusJsonFor("invalid", configured = hasEncryptedCredential(), limitDate = limitDate)
        }
        if (token.isNullOrBlank()) {
            return credentialStatusJson()
        }

        writeCredentialToken(token, limitDate)
        return credentialStatusJsonFor(credentialState(), configured = true, limitDate = limitDate)
    }

    private fun sendCredentialUpdate(output: OutputStream, updateJson: String) {
        val response = credentialUpdateResponse(updateJson)
        sendJson(output, response.status, response.body)
    }

    private fun credentialUpdateResponse(updateJson: String): SyncResponse {
        if (!tryStartOperation("credentialUpdate")) {
            return SyncResponse(409, failJson("OPERATION_ALREADY_RUNNING", "Credential update is already running."), false)
        }

        var success = false
        return try {
            val data = credentialUpdateResultJson(updateJson)
            val state = JSONObject(data).optString("state")
            success = state != "invalid"
            if (success) {
                SyncResponse(200, okJson(data), true)
            } else {
                SyncResponse(400, failJson("CREDENTIAL_INVALID", "Credential is invalid."), false)
            }
        } catch (_: Exception) {
            SyncResponse(500, failJson("CREDENTIAL_SAVE_FAILED", "Credential could not be saved."), false)
        } finally {
            completeOperation("credentialUpdate", success)
        }
    }

    private fun credentialStatusJsonFor(
        state: String,
        configured: Boolean = hasEncryptedCredential(),
        limitDate: String? = credentialPreferences.getString(credentialLimitDateKey, null)
    ): String {
        val limitDateJson = limitDate?.let { "\"$it\"" } ?: "null"
        return """
            {
              "configured": $configured,
              "state": "$state",
              "limitDate": $limitDateJson
            }
        """.trimIndent()
    }

    private fun credentialComponentStatus(): String = if (credentialState() == "available") "available" else "unavailable"

    private fun credentialState(): String {
        if (!hasEncryptedCredential()) return "missing"
        if (readCredentialToken().isNullOrBlank()) return "invalid"
        val limitDate = credentialPreferences.getString(credentialLimitDateKey, null)
        if (!limitDate.isNullOrBlank()) {
            val parsed = runCatching { LocalDate.parse(limitDate) }.getOrNull() ?: return "invalid"
            if (parsed < LocalDate.now()) return "expired"
        }
        return "available"
    }

    private fun hasEncryptedCredential(): Boolean =
        !credentialPreferences.getString(credentialCiphertextKey, null).isNullOrBlank() &&
            !credentialPreferences.getString(credentialIvKey, null).isNullOrBlank()

    private fun readCredentialToken(): String? = runCatching {
        val ciphertext = credentialPreferences.getString(credentialCiphertextKey, null) ?: return null
        val iv = credentialPreferences.getString(credentialIvKey, null) ?: return null
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.DECRYPT_MODE, getCredentialKey(), GCMParameterSpec(128, Base64.decode(iv, Base64.NO_WRAP)))
        String(cipher.doFinal(Base64.decode(ciphertext, Base64.NO_WRAP)), StandardCharsets.UTF_8)
    }.getOrNull()

    private fun writeCredentialToken(token: String, limitDate: String?) {
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, getCredentialKey())
        val encrypted = cipher.doFinal(token.toByteArray(StandardCharsets.UTF_8))
        credentialPreferences.edit()
            .putString(credentialCiphertextKey, Base64.encodeToString(encrypted, Base64.NO_WRAP))
            .putString(credentialIvKey, Base64.encodeToString(cipher.iv, Base64.NO_WRAP))
            .apply {
                if (limitDate.isNullOrBlank()) remove(credentialLimitDateKey) else putString(credentialLimitDateKey, limitDate)
            }
            .apply()
    }

    private fun getCredentialKey(): SecretKey {
        val keyStore = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        (keyStore.getEntry(credentialKeyAlias, null) as? KeyStore.SecretKeyEntry)?.secretKey?.let { return it }

        val generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore")
        val spec = KeyGenParameterSpec.Builder(
            credentialKeyAlias,
            KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
        )
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setRandomizedEncryptionRequired(true)
            .build()
        generator.init(spec)
        return generator.generateKey()
    }

    private fun sendRuntimeWorkoutData(output: OutputStream) {
        if (!runtimeDataFile.exists()) {
            sendJson(output, 503, failJson("RUNTIME_DATA_UNAVAILABLE", "Runtime Data is unavailable."))
            return
        }

        sendJson(output, 200, runtimeDataFile.readText(StandardCharsets.UTF_8))
    }

    private fun sendManualSync(output: OutputStream) {
        val response = manualSyncResponse()
        sendJson(output, response.status, response.body)
    }

    private fun manualSyncResponse(): SyncResponse {
        if (!tryStartOperation("manualSync")) {
            return SyncResponse(409, failJson("OPERATION_ALREADY_RUNNING", "Sync is already running."), false)
        }

        var success = false
        return try {
            val response = syncRuntimeData()
            success = response.success
            response
        } catch (ex: Exception) {
            writeLog("ERROR", "Manual sync failed: ${ex.message.orEmpty()}")
            SyncResponse(500, failJson("COMMON_INTERNAL_ERROR", "Sync failed."), false)
        } finally {
            completeOperation("manualSync", success)
        }
    }

    private fun startStartupSync() {
        if (!tryStartOperation("startup")) return
        requestExecutor.execute {
            try {
                if (configurationStatus() != "available" || credentialState() != "available") {
                    writeLog("INFO", "Startup sync skipped because configuration or credential is unavailable.")
                    completeOperation("startup", true)
                    return@execute
                }

                val response = syncRuntimeData()
                val success = response.success
                if (!success) writeLog("WARN", "Startup sync completed without remote runtime update.")
                completeOperation("startup", success)
            } catch (ex: Exception) {
                writeLog("ERROR", "Startup sync failed: ${ex.message.orEmpty()}")
                completeOperation("startup", false)
            }
        }
    }

    private fun syncRuntimeData(): SyncResponse {
        return try {
            val build = fetchRuntimeWorkoutData()
            if (build.errors.length() > 0 || build.payload == null) {
                return failedSync(build.errors)
            }
            runtimeDataFile.parentFile?.mkdirs()
            runtimeDataFile.writeText(build.payload, StandardCharsets.UTF_8)
            githubComponentStatus = "available"
            writeLog("INFO", "Runtime data synchronized from GitHub.")
            SyncResponse(200, okJson("""
                {
                  "degraded": false
                }
            """.trimIndent()), true)
        } catch (ex: AfException) {
            githubComponentStatus = "degraded"
            writeLog("WARN", "Remote sync failed: ${ex.message}")
            failedSync(errorsArray(ex.code, ex.message))
        } catch (ex: Exception) {
            githubComponentStatus = "degraded"
            val message = ex.message ?: "GitHub sync failed."
            writeLog("WARN", "Remote sync failed: $message")
            failedSync(errorsArray("GITHUB_CONNECTION_FAILED", message))
        }
    }

    private fun failedSync(errors: JSONArray): SyncResponse {
        githubComponentStatus = "degraded"
        return if (runtimeDataFile.exists()) {
            // Preserve offline usability: remote sync failure becomes degraded success from the
            // user's perspective when cached runtime data is still available.
            SyncResponse(200, responseJson(false, """
                {
                  "degraded": true
                }
            """.trimIndent(), errors), false)
        } else {
            SyncResponse(503, responseJson(false, "null", errors), false)
        }
    }

    private fun tryStartOperation(name: String): Boolean = synchronized(operationLock) {
        // All write-like operations share one gate because configuration, credential, and sync can
        // affect the same Status API state observed by Portal.
        if (shutdownStatus == "running" && name != "shutdown") return@synchronized false
        if (name in setOf("startup", "manualSync", "configurationUpdate", "credentialUpdate")) {
            if (startupSyncStatus == "running" || manualSyncStatus == "running" || configurationUpdateStatus == "running" || credentialUpdateStatus == "running") {
                return@synchronized false
            }
        }
        when (name) {
            "startup" -> {
                if (startupSyncStatus == "running") return@synchronized false
                startupSyncStatus = "running"
            }
            "manualSync" -> {
                if (manualSyncStatus == "running") return@synchronized false
                manualSyncStatus = "running"
            }
            "configurationUpdate" -> {
                if (configurationUpdateStatus == "running") return@synchronized false
                configurationUpdateStatus = "running"
            }
            "credentialUpdate" -> {
                if (credentialUpdateStatus == "running") return@synchronized false
                credentialUpdateStatus = "running"
            }
            "shutdown" -> {
                if (shutdownStatus == "running") return@synchronized false
                shutdownStatus = "running"
            }
            else -> return@synchronized false
        }
        true
    }

    private fun completeOperation(name: String, success: Boolean) = synchronized(operationLock) {
        val status = if (success) "completed" else "failed"
        when (name) {
            "startup" -> startupSyncStatus = status
            "manualSync" -> manualSyncStatus = status
            "configurationUpdate" -> configurationUpdateStatus = status
            "credentialUpdate" -> credentialUpdateStatus = status
            "shutdown" -> shutdownStatus = status
        }
    }

    private fun runtimeDataStatus(): String = if (runtimeDataFile.exists()) "available" else "unavailable"

    private fun githubStatus(): String = githubComponentStatus

    private fun fetchRuntimeWorkoutData(): RuntimeBuildResult {
        // Android mirrors the Windows runtime builder contract in-place so packaged APKs can sync
        // without a shared .NET runtime dependency.
        val configuration = JSONObject(loadConfigurationJson())
        val fetched = fetchConfiguredResources(configuration)
        val workoutFiles = fetched.workoutFiles
        val machineMaster = fetched.machineMaster
        val gymMaster = fetched.gymMaster

        val errors = JSONArray()
        val machines = machineMaster?.let { parseMachineMaster(it, errors) }
        val gyms = gymMaster?.let { parseGymMaster(it, errors) }
        if (machineMaster == null) errors.put(errorJson("GITHUB_RESOURCE_NOT_FOUND", "Required machine master resource is missing."))
        if (gymMaster == null) errors.put(errorJson("GITHUB_RESOURCE_NOT_FOUND", "Required gym master resource is missing."))
        if (workoutFiles.isEmpty()) errors.put(errorJson("RUNTIME_DATA_EMPTY", "Workout resource is empty."))
        if (errors.length() > 0 || machines == null || gyms == null) return RuntimeBuildResult(null, errors)

        val sessions = JSONArray()
        workoutFiles.sortedBy { it.path }.forEach { file ->
            if (file.path.endsWith(".jsonl", ignoreCase = true)) {
                file.content.split("\r\n", "\n").forEachIndexed { index, line ->
                    if (line.isNotBlank()) buildSession(file.path, index + 1, line, machines, gyms, errors)?.let(sessions::put)
                }
            } else if (file.path.endsWith(".json", ignoreCase = true)) {
                buildSession(file.path, null, file.content, machines, gyms, errors)?.let(sessions::put)
            }
        }

        if (errors.length() > 0) return RuntimeBuildResult(null, errors)

        val payload = JSONObject()
            .put("success", true)
            .put("errors", JSONArray())
            .put("data", JSONObject().put("sessions", sessions))
            .toString(2)
        return RuntimeBuildResult(payload, errors)
    }

    private fun fetchConfiguredResources(configuration: JSONObject): RuntimeFetchedResources {
        val configurationErrors = validateConfiguration(configuration)
        if (configurationErrors.length() > 0) {
            throw AfException("CONFIG_INVALID", configurationErrors.getJSONObject(0).optString("message", "Configuration is invalid."))
        }
        val repository = configuration.getJSONObject("repository")
        val owner = repository.optString("owner").trim()
        val repo = repository.optString("repository").trim()
        val ref = repository.optString("ref", "main").trim().ifEmpty { "main" }

        val timeoutSec = configuration.optJSONObject("timeouts")?.optInt("githubRequestTimeoutSec", 10) ?: 10
        val token = readCredentialToken()
        val workoutFiles = mutableListOf<RuntimeSourceFile>()
        var machineMaster: RuntimeSourceFile? = null
        var gymMaster: RuntimeSourceFile? = null
        val resources = configuration.getJSONArray("resources")

        for (index in 0 until resources.length()) {
            val resource = resources.getJSONObject(index)
            val type = resource.optString("type")
            val resourcePath = resource.optString("path")
            val kind = resource.optString("resourceKind", "file")
            val required = resource.optBoolean("required", true)
            val emptyAllowed = resource.optBoolean("emptyAllowed", false)
            val fullPath = combineRemote(repository.optString("rootPath"), resourcePath)
            // Resource entries can point at files or directories. Directory mode expands to JSON
            // files before type-specific master/workout classification.
            val fetched = if (kind == "directory") {
                fetchDirectoryFiles(owner, repo, ref, fullPath, token, timeoutSec)
            } else {
                listOf(fetchRawRuntimeFile(owner, repo, ref, fullPath, token, timeoutSec))
            }

            if (!emptyAllowed && fetched.isEmpty()) {
                if (required) throw IllegalStateException("$resourcePath is empty.")
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

    private fun parseMachineMaster(file: RuntimeSourceFile, errors: JSONArray): Map<String, MachineMasterItem> {
        return try {
            val root = JSONObject(file.content)
            val items = root.optJSONArray("machines")
            if (!root.has("schema_version") || items == null) {
                errors.put(errorJson("RUNTIME_DATA_INVALID", "${file.path}: Machine master contract is invalid."))
                return emptyMap()
            }

            val result = linkedMapOf<String, MachineMasterItem>()
            for (index in 0 until items.length()) {
                val item = items.optJSONObject(index)
                val id = item?.optString("machine_id").orEmpty().trim()
                val name = item?.optString("name").orEmpty().trim()
                val bodyPart = item?.optString("body_part").orEmpty().trim()
                val hasActive = item?.has("active") == true
                if (id.isBlank() || name.isBlank() || bodyPart !in bodyParts || !hasActive) {
                    errors.put(errorJson("RUNTIME_DATA_INVALID", "${file.path}: Machine master item is invalid."))
                    return emptyMap()
                }
                if (result.containsKey(id)) {
                    errors.put(errorJson("RUNTIME_DATA_INVALID", "${file.path}: Duplicate machine_id: $id."))
                    return emptyMap()
                }
                result[id] = MachineMasterItem(id, name, bodyPart)
            }
            result
        } catch (_: Exception) {
            errors.put(errorJson("RUNTIME_DATA_INVALID", "${file.path}: Machine master JSON is invalid."))
            emptyMap()
        }
    }

    private fun parseGymMaster(file: RuntimeSourceFile, errors: JSONArray): Map<String, GymMasterItem> {
        return try {
            val root = JSONObject(file.content)
            val items = root.optJSONArray("gyms")
            if (!root.has("schema_version") || items == null) {
                errors.put(errorJson("RUNTIME_DATA_INVALID", "${file.path}: Gym master contract is invalid."))
                return emptyMap()
            }

            val result = linkedMapOf<String, GymMasterItem>()
            for (index in 0 until items.length()) {
                val item = items.optJSONObject(index)
                val id = item?.optString("gym_id").orEmpty().trim()
                val name = item?.optString("name").orEmpty().trim()
                val hasActive = item?.has("active") == true
                if (id.isBlank() || name.isBlank() || !hasActive) {
                    errors.put(errorJson("RUNTIME_DATA_INVALID", "${file.path}: Gym master item is invalid."))
                    return emptyMap()
                }
                if (result.containsKey(id)) {
                    errors.put(errorJson("RUNTIME_DATA_INVALID", "${file.path}: Duplicate gym_id: $id."))
                    return emptyMap()
                }
                val shortName = item?.optString("short_name")?.takeIf { it.isNotBlank() }
                result[id] = GymMasterItem(id, name, shortName)
            }
            result
        } catch (_: Exception) {
            errors.put(errorJson("RUNTIME_DATA_INVALID", "${file.path}: Gym master JSON is invalid."))
            emptyMap()
        }
    }

    private fun buildSession(
        filePath: String,
        line: Int?,
        content: String,
        machines: Map<String, MachineMasterItem>,
        gyms: Map<String, GymMasterItem>,
        errors: JSONArray
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

        val gym = gyms[gymId]
        if (gym == null) {
            errors.put(errorJson("MASTER_GYM_NOT_FOUND", location(filePath, line) + "Gym master is not found: $gymId."))
            return null
        }

        val normalizedMachines = JSONArray()
        for (index in 0 until machineItems.length()) {
            val normalized = buildMachine(filePath, line, machineItems.optJSONObject(index), machines, errors) ?: return null
            normalizedMachines.put(normalized)
        }
        if (status == "complete" && normalizedMachines.length() == 0) {
            errors.put(errorJson("RUNTIME_DATA_INVALID", location(filePath, line) + "Complete workout session requires valid machines."))
            return null
        }

        return JSONObject()
            .put("schema_version", schemaVersion)
            .put("session_id", sessionId)
            .put("date", date)
            .put("status", status)
            .put("gym", JSONObject().put("id", gym.id).put("name", gym.name).put("short_name", gym.shortName ?: JSONObject.NULL))
            .put("condition", root.optJSONObject("condition") ?: JSONObject.NULL)
            .put("machines", normalizedMachines)
            .put("notes", readStringArray(root.optJSONArray("notes")))
    }

    private fun buildMachine(
        filePath: String,
        line: Int?,
        item: JSONObject?,
        masters: Map<String, MachineMasterItem>,
        errors: JSONArray
    ): JSONObject? {
        val machineId = item?.optString("machine_id").orEmpty().trim()
        val setItems = item?.optJSONArray("sets")
        if (item == null || machineId.isBlank() || setItems == null || setItems.length() == 0) {
            errors.put(errorJson("RUNTIME_DATA_INVALID", location(filePath, line) + "Machine required fields are invalid."))
            return null
        }

        val master = masters[machineId]
        if (master == null) {
            errors.put(errorJson("MASTER_MACHINE_NOT_FOUND", location(filePath, line) + "Machine master is not found: $machineId."))
            return null
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

        return JSONObject()
            .put("machine_id", machineId)
            .put("name", master.name)
            .put("body_part", master.bodyPart)
            .put("sets", sets)
            .put("notes", readStringArray(item.optJSONArray("notes")))
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

    private fun location(filePath: String, line: Int?): String =
        if (line == null) "$filePath: " else "$filePath:$line: "

    private fun fetchDirectoryFiles(
        owner: String,
        repo: String,
        ref: String,
        directoryPath: String,
        token: String?,
        timeoutSec: Int
    ): List<RuntimeSourceFile> {
        val escapedPath = escapeRemotePath(directoryPath)
        val contentsPath = if (escapedPath.isEmpty()) "" else "/$escapedPath"
        val url = "https://api.github.com/repos/${urlPath(owner)}/${urlPath(repo)}/contents$contentsPath?ref=${urlPath(ref)}"
        val entries = JSONArray(httpGet(url, token, timeoutSec, directoryPath))
        val files = mutableListOf<RuntimeSourceFile>()

        for (index in 0 until entries.length()) {
            val entry = entries.getJSONObject(index)
            val type = entry.optString("type")
            val path = entry.optString("path")
            if (type == "dir") {
                files.addAll(fetchDirectoryFiles(owner, repo, ref, path, token, timeoutSec))
            } else if (type == "file" && isJsonRuntimePath(path)) {
                files.add(fetchRawRuntimeFile(owner, repo, ref, path, token, timeoutSec))
            }
        }

        return files
    }

    private fun fetchRawRuntimeFile(
        owner: String,
        repo: String,
        ref: String,
        path: String,
        token: String?,
        timeoutSec: Int
    ): RuntimeSourceFile {
        val url = "https://raw.githubusercontent.com/${urlPath(owner)}/${urlPath(repo)}/${urlPath(ref)}/${escapeRemotePath(path)}"
        return RuntimeSourceFile(path, httpGet(url, token, timeoutSec, path))
    }

    private fun httpGet(url: String, token: String?, timeoutSec: Int, pathForError: String): String {
        val connection = (URL(url).openConnection() as HttpURLConnection).apply {
            requestMethod = "GET"
            connectTimeout = timeoutSec * 1000
            readTimeout = timeoutSec * 1000
            setRequestProperty("User-Agent", "Atlament-Android-AF")
            if (!token.isNullOrBlank()) setRequestProperty("Authorization", "Bearer $token")
        }

        return try {
            val status = connection.responseCode
            if (status !in 200..299) throw mapGithubError(status, pathForError)
            connection.inputStream.bufferedReader(StandardCharsets.UTF_8).use { it.readText() }
        } finally {
            connection.disconnect()
        }
    }

    private fun combineRemote(rootPath: String, path: String): String =
        listOf(rootPath, path)
            .map { it.trim().trim('/') }
            .filter { it.isNotBlank() }
            .joinToString("/")

    private fun escapeRemotePath(path: String): String =
        path.trim('/').split('/').filter { it.isNotBlank() }.joinToString("/") { urlPath(it) }

    private fun urlPath(value: String): String = URLEncoder.encode(value, StandardCharsets.UTF_8.name()).replace("+", "%20")

    private fun isJsonRuntimePath(path: String): Boolean =
        path.endsWith(".json", ignoreCase = true) || path.endsWith(".jsonl", ignoreCase = true)

    private fun mapGithubError(status: Int, path: String): AfException = when (status) {
        401 -> AfException("GITHUB_UNAUTHORIZED", "GitHub token is unauthorized.")
        403 -> AfException("GITHUB_FORBIDDEN", "GitHub access is forbidden.")
        404 -> AfException("GITHUB_RESOURCE_NOT_FOUND", "GitHub resource not found: $path.")
        429 -> AfException("GITHUB_RATE_LIMITED", "GitHub rate limit reached.")
        else -> AfException("GITHUB_CONNECTION_FAILED", "GitHub server error: HTTP $status.")
    }

    private fun sendShutdown(output: OutputStream) {
        val already = shutdownRequested.getAndSet(true)
        if (!already) {
            tryStartOperation("shutdown")
            completeOperation("shutdown", true)
        }
        sendJson(output, 200, okJson("{ \"accepted\": true, \"alreadyShuttingDown\": $already }"))
        if (!already) {
            Thread {
                runCatching { Thread.sleep(150) }
                close()
                onShutdown()
            }.start()
        }
    }
    private fun failJson(code: String, message: String): String = """
        {
          "success": false,
          "errors": ${errorsJson(code, message)},
          "data": null
        }
    """.trimIndent()

    private fun responseJson(success: Boolean, dataJson: String, errors: JSONArray): String = """
        {
          "success": $success,
          "errors": ${errors.toString()},
          "data": $dataJson
        }
    """.trimIndent()

    private fun errorsJson(code: String, message: String): String =
        errorsArray(code, message).toString()

    private fun errorsArray(code: String, message: String): JSONArray =
        JSONArray().put(errorJson(code, message))

    private fun errorJson(code: String, message: String): JSONObject =
        JSONObject()
            .put("code", code)
            .put("message", message)
            .put("recoverable", true)
    private fun sendErrorPage(output: OutputStream, status: Int) {
        val assetPath = when (status) {
            404 -> "frontend/404.html"
            500 -> "frontend/500.html"
            503 -> "frontend/503.html"
            else -> "frontend/500.html"
        }
        try {
            context.assets.open(assetPath).use { stream ->
                sendStream(output, status, contentType(assetPath), stream)
            }
        } catch (_: Exception) {
            sendText(output, status, "text/plain; charset=utf-8", reason(status))
        }
    }
    private fun sendJson(output: OutputStream, status: Int, json: String) {
        sendText(output, status, "application/json; charset=utf-8", json)
    }

    private fun sendText(output: OutputStream, status: Int, contentType: String, body: String) {
        sendStream(output, status, contentType, ByteArrayInputStream(body.toByteArray(StandardCharsets.UTF_8)))
    }

    private fun sendStream(output: OutputStream, status: Int, contentType: String, body: InputStream) {
        val bytes = body.readBytes()
        val header = buildString {
            append("HTTP/1.1 ").append(status).append(' ').append(reason(status)).append("\r\n")
            append("Content-Type: ").append(contentType).append("\r\n")
            append("Content-Length: ").append(bytes.size).append("\r\n")
            append("Connection: close\r\n")
            append("Cache-Control: no-store\r\n")
            append("\r\n")
        }.toByteArray(StandardCharsets.UTF_8)
        output.write(header)
        output.write(bytes)
        output.flush()
    }

    private fun reason(status: Int): String = when (status) {
        200 -> "OK"
        404 -> "Not Found"
        500 -> "Internal Server Error"
        503 -> "Service Unavailable"
        400 -> "Bad Request"
        405 -> "Method Not Allowed"
        409 -> "Conflict"
        501 -> "Not Implemented"
        else -> "Error"
    }

    private fun contentType(path: String): String = when (path.substringAfterLast('.', "").lowercase()) {
        "html" -> "text/html; charset=utf-8"
        "js" -> "text/javascript; charset=utf-8"
        "css" -> "text/css; charset=utf-8"
        "json" -> "application/json; charset=utf-8"
        "svg" -> "image/svg+xml"
        "png" -> "image/png"
        "jpg", "jpeg" -> "image/jpeg"
        "ico" -> "image/x-icon"
        "woff" -> "font/woff"
        "woff2" -> "font/woff2"
        else -> "application/octet-stream"
    }

    override fun close() {
        writeLog("INFO", "HTTP server stopped.")
        running.set(false)
        serverSocket?.close()
        serverSocket = null
        acceptExecutor.shutdownNow()
        requestExecutor.shutdownNow()
    }

    private fun initializeLog() {
        logDatabaseFile.parentFile?.mkdirs()
        SQLiteDatabase.openOrCreateDatabase(logDatabaseFile, null).use { database ->
            database.execSQL(
                """
                CREATE TABLE IF NOT EXISTS af_log (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    level TEXT NOT NULL,
                    message TEXT NOT NULL
                )
                """.trimIndent()
            )
        }
    }

    private fun writeLog(level: String, message: String) {
        runCatching {
            logDatabaseFile.parentFile?.mkdirs()
            SQLiteDatabase.openOrCreateDatabase(logDatabaseFile, null).use { database ->
                database.execSQL(
                    "INSERT INTO af_log(level, message) VALUES(?, ?)",
                    arrayOf(level, message)
                )
            }
        }
    }
}







