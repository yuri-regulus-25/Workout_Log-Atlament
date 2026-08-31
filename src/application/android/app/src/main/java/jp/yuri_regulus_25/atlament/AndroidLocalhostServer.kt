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
import java.time.Instant
import java.security.KeyStore
import java.security.MessageDigest
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

internal fun androidMasterReferenceResolutionState(resolvedId: String?, deleted: Boolean): String = when {
    resolvedId.isNullOrBlank() -> "missing"
    deleted -> "deleted"
    else -> "resolved"
}

internal fun androidMasterReferenceWarningCode(deleted: Boolean): String =
    if (deleted) "MASTER_REFERENCE_DELETED" else "MASTER_REFERENCE_MISSING"

class AndroidLocalhostServer(
    private val context: Context,
    private val onShutdown: () -> Unit = {}
) : Closeable {
    private data class RuntimeSourceFile(val path: String, val content: String, val revision: String? = null)
    private data class SyncResponse(val status: Int, val body: String, val success: Boolean)
    private data class RuntimeBuildResult(val payload: String?, val errors: JSONArray, val warnings: JSONArray)
    private data class RuntimeFetchedResources(
        val workoutFiles: List<RuntimeSourceFile>,
        val machineMaster: RuntimeSourceFile?,
        val gymMaster: RuntimeSourceFile?
    )
    private data class RecoveryResource(val source: RuntimeSourceFile, val resourceKey: String, val inspection: JSONObject)
    private data class MasterWriteTarget(val type: String, val path: String)
    private data class MasterDocument(val type: String, val path: String, val revision: String, val content: String)
    private data class GithubContent(val revision: String, val content: String)
    private data class MachineMasterItem(val id: String, val sourceIds: List<String>, val name: String, val bodyPart: String, val deleted: Boolean)
    private data class GymMasterItem(val id: String, val sourceIds: List<String>, val name: String, val shortName: String?, val deleted: Boolean)
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
    private val recoveryDraftDirectory = File(context.filesDir, "recovery/drafts")
    private val recoveryTemporaryDirectory = File(context.filesDir, "recovery/temporary")
    private val logDatabaseFile = File(context.filesDir, "log/atlament-log.sqlite")
    private val operationLock = Object()
    @Volatile private var startupSyncStatus = "idle"
    @Volatile private var manualSyncStatus = "idle"
    @Volatile private var configurationUpdateStatus = "idle"
    @Volatile private var credentialUpdateStatus = "idle"
    @Volatile private var shutdownStatus = "idle"
    @Volatile private var githubComponentStatus = "unknown"
    @Volatile private var latestRemoteRetrieval = "unknown"
    @Volatile private var latestValidation = "unknown"
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
            method == "GET" && route == "/master-write/unresolved" -> sendUnresolvedMasterReferences(output)
            method == "GET" && route.startsWith("/master-write/documents/") -> sendMasterDocument(output, route.substringAfterLast('/'))
            method == "GET" && route == "/recovery/resources" -> sendRecoveryResources(output)
            method == "GET" && route.startsWith("/recovery/resources/") -> handleRecoveryResourceRoute(output, method, route, body)
            method == "POST" && route.startsWith("/recovery/resources/") -> handleRecoveryResourceRoute(output, method, route, body)
            method == "PUT" && route.startsWith("/recovery/resources/") -> handleRecoveryResourceRoute(output, method, route, body)
            method == "DELETE" && route.startsWith("/recovery/resources/") -> handleRecoveryResourceRoute(output, method, route, body)
            method == "GET" && route == "/runtime/workouts" -> sendRuntimeWorkoutData(output)
            method == "POST" && route == "/configuration" -> sendConfigurationUpdate(output, body)
            method == "POST" && route == "/credential" -> sendCredentialUpdate(output, body)
            method == "POST" && route == "/sync" -> sendManualSync(output)
            method == "PUT" && route.startsWith("/master-write/documents/") -> sendMasterDocumentWrite(output, route.substringAfterLast('/'), body)
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
            "runtimeData": ${runtimeDataFactsJson()},
            "recovery": ${recoveryStatusFactsJson()},
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

    private fun runtimeDataFactsJson(): String {
        val runtimeStatus = runtimeDataStatus()
        val currentAvailable = runtimeStatus != "unavailable"
        val generatedAt = if (runtimeDataFile.exists()) "\"${Instant.ofEpochMilli(runtimeDataFile.lastModified())}\"" else "null"
        val fallbackActive = (latestRemoteRetrieval == "failed" || latestValidation == "failed") && currentAvailable
        val quarantinedWorkoutResourceCount = quarantinedWorkoutResourceCount()
        return """
            {
              "currentAvailable": $currentAvailable,
              "currentGeneratedAt": $generatedAt,
              "latestRemoteRetrieval": "$latestRemoteRetrieval",
              "latestValidation": "$latestValidation",
              "fallbackActive": $fallbackActive,
              "quarantinedWorkoutResourceCount": $quarantinedWorkoutResourceCount
            }
        """.trimIndent()
    }

    private fun recoveryStatusFactsJson(): String {
        val brokenWorkoutCount = quarantinedWorkoutResourceCount()
        return JSONObject()
            .put("brokenResourceCount", brokenWorkoutCount)
            .put("brokenWorkoutResourceCount", brokenWorkoutCount)
            .put("brokenMasterResourceCount", 0)
            .put("recoverableResourceCount", brokenWorkoutCount)
            .put("activeDraftCount", activeRecoveryDraftCount())
            .toString()
    }

    private fun quarantinedWorkoutResourceCount(): Int = runCatching {
        if (!runtimeDataFile.exists()) return 0
        val runtime = JSONObject(runtimeDataFile.readText(StandardCharsets.UTF_8))
        val paths = linkedSetOf<String>()
        val errors = runtime.optJSONArray("errors") ?: return 0
        for (index in 0 until errors.length()) {
            val message = errors.optJSONObject(index)?.optString("message").orEmpty()
            val path = message.substringBefore(':').trim()
            if (path.endsWith(".json", ignoreCase = true) || path.endsWith(".jsonl", ignoreCase = true)) {
                paths.add(path)
            }
        }
        paths.size
    }.getOrDefault(0)

    private fun activeRecoveryDraftCount(): Int = runCatching {
        recoveryDraftDirectory.listFiles { file -> file.extension == "json" }
            ?.count { file ->
                val envelope = JSONObject(file.readText(StandardCharsets.UTF_8))
                envelope.optJSONObject("draft")?.optInt("schemaVersion", -1) == 1
            } ?: 0
    }.getOrDefault(0)

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
            applicationStatus() == "degraded" || degradedComponents.isNotEmpty() || unavailableComponents.isNotEmpty() || requiredActions.isNotEmpty() -> "degraded"
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
        if (!hasEncryptedCredential()) actions.add(0, "CREDENTIAL_REQUIRED")
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

    private fun sendMasterDocument(output: OutputStream, type: String) {
        val response = masterDocumentResponse(type)
        sendJson(output, response.status, response.body)
    }

    private fun masterDocumentResponse(type: String): SyncResponse {
        masterWriteTarget(type)
            ?: return SyncResponse(400, failJson("MASTER_WRITE_INVALID", "Master write target is not allowed."), false)
        return try {
            val documents = readLocalMasterDocuments()
                ?: return SyncResponse(409, failJson("MASTER_SYNC_REQUIRED", "Master data must be synchronized before maintenance."), false)
            val document = selectLocalMasterDocument(documents, type)
                ?: return SyncResponse(409, failJson("MASTER_SYNC_REQUIRED", "Master data must be synchronized before maintenance."), false)
            SyncResponse(200, okJson(masterDocumentJson(document).toString(2)), true)
        } catch (ex: AfException) {
            SyncResponse(masterWriteStatus(ex.code), failJson(ex.code, ex.message), false)
        } catch (_: Exception) {
            SyncResponse(409, failJson("MASTER_SYNC_REQUIRED", "Master data must be synchronized before maintenance."), false)
        }
    }

    private fun sendMasterDocumentWrite(output: OutputStream, type: String, body: String) {
        val response = masterDocumentWriteResponse(type, body)
        sendJson(output, response.status, response.body)
    }

    private fun masterDocumentWriteResponse(type: String, body: String): SyncResponse {
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

            val remote = readGithubContentFile(configuration, fullPath)
            if (remote.revision != current.revision) {
                return SyncResponse(409, failJson("MASTER_SYNC_REQUIRED", "Master document must be synchronized before saving."), false)
            }

            val savedRevision = writeGithubContentFile(configuration, fullPath, current.revision, nextContent, masterCommitMessage(target))
            val confirmedDocuments = replaceLocalMasterDocument(localDocuments, type, nextContent, savedRevision)
            val workoutFiles = fetchConfiguredWorkoutResources(configuration)
            val machineMaster = selectLocalMasterDocument(confirmedDocuments, "MACHINE_MASTER")
                ?: return SyncResponse(409, failJson("MASTER_SYNC_REQUIRED", "Master data was saved remotely. Synchronize application data before continuing."), false)
            val gymMaster = selectLocalMasterDocument(confirmedDocuments, "GYM_MASTER")
                ?: return SyncResponse(409, failJson("MASTER_SYNC_REQUIRED", "Master data was saved remotely. Synchronize application data before continuing."), false)
            val build = buildRuntimeDataPayload(workoutFiles, machineMaster, gymMaster)
            if (build.payload == null) {
                return SyncResponse(409, failJson("MASTER_SYNC_REQUIRED", "Master data was saved remotely. Synchronize application data before continuing."), false)
            }
            val saveErrors = saveRuntimeDataAtomically(build.payload)
            if (saveErrors.length() > 0) {
                return SyncResponse(409, failJson("MASTER_SYNC_REQUIRED", "Master data was saved remotely. Synchronize application data before continuing."), false)
            }
            githubComponentStatus = "available"
            latestValidation = "succeeded"
            SyncResponse(200, okJson(JSONObject()
                .put("type", target.type)
                .put("path", target.path)
                .put("revision", savedRevision)
                .toString(2)), true)
        } catch (ex: AfException) {
            SyncResponse(masterWriteStatus(ex.code), failJson(ex.code, ex.message), false)
        } catch (_: Exception) {
            SyncResponse(500, failJson("GITHUB_CONNECTION_FAILED", "GitHub connection failed."), false)
        }
    }

    private fun sendUnresolvedMasterReferences(output: OutputStream) {
        val response = unresolvedMasterReferencesResponse()
        sendJson(output, response.status, response.body)
    }

    private fun unresolvedMasterReferencesResponse(): SyncResponse {
        return try {
            if (!runtimeDataFile.exists()) {
                return SyncResponse(409, failJson("MASTER_SYNC_REQUIRED", "Master data must be synchronized before maintenance."), false)
            }
            val runtimeData = JSONObject(runtimeDataFile.readText(StandardCharsets.UTF_8))
            val warnings = runtimeData.optJSONArray("warnings") ?: JSONArray()
            SyncResponse(200, okJson(buildUnresolvedReferences(warnings).toString(2)), true)
        } catch (ex: AfException) {
            SyncResponse(masterWriteStatus(ex.code), failJson(ex.code, ex.message), false)
        } catch (_: Exception) {
            SyncResponse(409, failJson("MASTER_SYNC_REQUIRED", "Master data must be synchronized before maintenance."), false)
        }
    }

    private fun masterWriteEnvironment(): Pair<SyncResponse?, JSONObject?> {
        if (configurationStatus() != "available") {
            return Pair(SyncResponse(400, failJson("CONFIG_REQUIRED", "Configuration is required."), false), null)
        }
        if (credentialState() != "available" || readCredentialToken().isNullOrBlank()) {
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

    private fun readMasterDocumentFromGithub(configuration: JSONObject, type: String): MasterDocument {
        val target = masterWriteTarget(type)
            ?: throw AfException("MASTER_WRITE_INVALID", "Master write target is not allowed.")
        val repository = configuration.getJSONObject("repository")
        val fullPath = combineRemote(repository.optString("rootPath"), target.path)
        val content = readGithubContentFile(configuration, fullPath)
        return MasterDocument(target.type, target.path, content.revision, content.content)
    }

    private fun readLocalMasterDocuments(): JSONObject? {
        if (!runtimeDataFile.exists()) return null
        val runtimeData = JSONObject(runtimeDataFile.readText(StandardCharsets.UTF_8))
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

    private fun readGithubContentFile(configuration: JSONObject, path: String): GithubContent {
        val repository = configuration.getJSONObject("repository")
        val owner = repository.optString("owner").trim()
        val repo = repository.optString("repository").trim()
        val ref = repository.optString("ref", "main").trim().ifEmpty { "main" }
        val timeoutSec = configuration.optJSONObject("timeouts")?.optInt("githubRequestTimeoutSec", 10) ?: 10
        val url = "https://api.github.com/repos/${urlPath(owner)}/${urlPath(repo)}/contents/${escapeRemotePath(path)}?ref=${urlPath(ref)}"
        val response = JSONObject(httpGet(url, readCredentialToken(), timeoutSec, path))
        val revision = response.optString("sha").trim()
        val encoded = response.optString("content").replace("\\s".toRegex(), "")
        if (revision.isBlank() || encoded.isBlank()) {
            throw AfException("GITHUB_SERVER_ERROR", "GitHub contents response is invalid.")
        }
        val content = String(Base64.decode(encoded, Base64.DEFAULT), StandardCharsets.UTF_8)
        return GithubContent(revision, content)
    }

    private fun writeGithubContentFile(configuration: JSONObject, path: String, revision: String, content: String, commitMessage: String): String {
        val repository = configuration.getJSONObject("repository")
        val owner = repository.optString("owner").trim()
        val repo = repository.optString("repository").trim()
        val ref = repository.optString("ref", "main").trim().ifEmpty { "main" }
        val timeoutSec = configuration.optJSONObject("timeouts")?.optInt("githubRequestTimeoutSec", 10) ?: 10
        val payload = JSONObject()
            .put("message", commitMessage)
            .put("content", Base64.encodeToString(content.toByteArray(StandardCharsets.UTF_8), Base64.NO_WRAP))
            .put("sha", revision)
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
            readCredentialToken()?.takeIf { it.isNotBlank() }?.let { setRequestProperty("Authorization", "Bearer $it") }
        }
        return try {
            connection.outputStream.use { it.write(payload.toByteArray(StandardCharsets.UTF_8)) }
            val status = connection.responseCode
            if (status !in 200..299) {
                if (status == 409) throw AfException("MASTER_SYNC_REQUIRED", "Master document must be synchronized before saving.")
                throw mapGithubError(status, path)
            }
            val response = connection.inputStream.bufferedReader(StandardCharsets.UTF_8).use { it.readText() }
            val savedRevision = JSONObject(response).optJSONObject("content")?.optString("sha").orEmpty().trim()
            if (savedRevision.isBlank()) throw AfException("MASTER_WRITE_FAILED", "GitHub write result is ambiguous.")
            savedRevision
        } finally {
            connection.disconnect()
        }
    }

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

    private fun masterWriteStatus(code: String): Int = when (code) {
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

    private fun handleRecoveryResourceRoute(output: OutputStream, method: String, route: String, body: String) {
        val suffix = route.removePrefix("/recovery/resources/").trim('/')
        val resourceKey = suffix.substringBefore('/').takeIf { it.isNotBlank() }
        val action = suffix.substringAfter('/', "")
        if (resourceKey == null) {
            sendJson(output, 404, failJson("RECOVERY_RESOURCE_NOT_FOUND", "Recovery Resource was not found."))
            return
        }

        when {
            method == "GET" && action.isEmpty() -> sendRecoveryResourceDetail(output, resourceKey)
            method == "GET" && action == "source" -> sendRecoverySource(output, resourceKey)
            method == "GET" && action == "draft" -> sendRecoveryDraft(output, resourceKey)
            method == "POST" && action == "draft" -> sendRecoveryDraftCreate(output, resourceKey)
            method == "PUT" && action == "draft" -> sendRecoveryDraftUpdate(output, resourceKey, body)
            method == "DELETE" && action == "draft" -> sendRecoveryDraftDelete(output, resourceKey)
            method == "POST" && action == "validate" -> sendRecoveryValidation(output, resourceKey)
            method == "POST" && action == "commit" -> sendRecoveryCommitUnavailable(output, body)
            else -> sendJson(output, 501, failJson("COMMON_NOT_IMPLEMENTED", "This Android API route is not implemented yet."))
        }
    }

    private fun sendRecoveryResources(output: OutputStream) {
        try {
            val resources = inspectWorkoutRecoveryResources()
                .filter { it.inspection.optString("health") == "broken" }
                .sortedBy { it.source.path }
            val array = JSONArray()
            resources.forEach { resource ->
                val revision = sourceRevision(resource.source)
                val draft = loadRecoveryDraft("WORKOUT", resource.source.path, revision)
                array.put(JSONObject()
                    .put("resourceKey", resource.resourceKey)
                    .put("path", resource.source.path)
                    .put("revision", revision)
                    .put("resourceType", "WORKOUT")
                    .put("health", "broken")
                    .put("issues", resource.inspection.optJSONArray("issues") ?: JSONArray())
                    .put("recoveryEligible", true)
                    .put("hasDraft", draft.optString("state") == "active"))
            }
            sendJson(output, 200, okJson(array.toString()))
        } catch (ex: AfException) {
            sendJson(output, recoveryStatusCode(ex.code), failJson(ex.code, ex.message))
        } catch (ex: Exception) {
            sendJson(output, 503, failJson("RECOVERY_UNAVAILABLE", ex.message ?: "Recovery is unavailable."))
        }
    }

    private fun sendRecoveryResourceDetail(output: OutputStream, resourceKey: String) {
        val resolved = resolveRecoveryResource(resourceKey)
        if (resolved == null) {
            sendJson(output, 404, failJson("RECOVERY_RESOURCE_NOT_FOUND", "Recovery Resource was not found."))
            return
        }
        val eligible = resolved.inspection.optString("health") == "broken"
        val detail = JSONObject()
            .put("resourceKey", resolved.resourceKey)
            .put("inspection", resolved.inspection)
            .put("eligibility", JSONObject()
                .put("eligible", eligible)
                .put("reasonCode", if (eligible) JSONObject.NULL else "RECOVERY_RESOURCE_NOT_BROKEN"))
            .put("capabilities", recoveryCapabilitiesJson(eligible))
            .put("draft", loadRecoveryDraft("WORKOUT", resolved.source.path, sourceRevision(resolved.source)))
        sendJson(output, 200, okJson(detail.toString()))
    }

    private fun sendRecoverySource(output: OutputStream, resourceKey: String) {
        val resolved = resolveRecoveryResource(resourceKey)
        if (resolved == null) {
            sendJson(output, 404, failJson("RECOVERY_RESOURCE_NOT_FOUND", "Recovery Resource was not found."))
            return
        }
        if (resolved.source.content.toByteArray(StandardCharsets.UTF_8).size > 256 * 1024) {
            sendJson(output, 413, failJson("RECOVERY_SOURCE_VIEW_TOO_LARGE", "Recovery source view is too large."))
            return
        }
        val source = JSONObject()
            .put("resourceKey", resolved.resourceKey)
            .put("path", resolved.source.path)
            .put("revision", sourceRevision(resolved.source))
            .put("resourceType", "WORKOUT")
            .put("content", resolved.source.content)
            .put("readOnly", true)
        sendJson(output, 200, okJson(source.toString()))
    }

    private fun sendRecoveryDraft(output: OutputStream, resourceKey: String) {
        val resolved = resolveRecoveryResource(resourceKey)
        if (resolved == null) {
            sendJson(output, 404, failJson("RECOVERY_RESOURCE_NOT_FOUND", "Recovery Resource was not found."))
            return
        }
        sendJson(output, 200, okJson(loadRecoveryDraft("WORKOUT", resolved.source.path, sourceRevision(resolved.source)).toString()))
    }

    private fun sendRecoveryDraftCreate(output: OutputStream, resourceKey: String) {
        val resolved = resolveRecoveryResource(resourceKey)
        if (resolved == null) {
            sendJson(output, 404, failJson("RECOVERY_RESOURCE_NOT_FOUND", "Recovery Resource was not found."))
            return
        }
        val snapshot = createWorkoutRecoveryDraft(resolved.source, resolved.inspection.optString("health") == "broken")
        val errors = snapshot.optJSONArray("errors") ?: JSONArray()
        if (errors.length() > 0) {
            val first = errors.getJSONObject(0)
            sendJson(output, recoveryStatusCode(first.optString("code")), responseJson(false, "null", errors))
        } else {
            sendJson(output, 200, okJson(snapshot.remove("errors").let { snapshot.toString() }))
        }
    }

    private fun sendRecoveryDraftUpdate(output: OutputStream, resourceKey: String, body: String) {
        val resolved = resolveRecoveryResource(resourceKey)
        if (resolved == null) {
            sendJson(output, 404, failJson("RECOVERY_RESOURCE_NOT_FOUND", "Recovery Resource was not found."))
            return
        }
        val request = runCatching { JSONObject(body.ifBlank { "{}" }) }.getOrElse {
            sendJson(output, 400, failJson("COMMON_INVALID_REQUEST", "Recovery Draft update request is invalid."))
            return
        }
        val existing = loadRecoveryDraft("WORKOUT", resolved.source.path, sourceRevision(resolved.source))
        val draft = existing.optJSONObject("draft")
        if (existing.optString("state") != "active" || draft == null) {
            sendJson(output, 409, failJson("RECOVERY_DRAFT_CORRUPTED", "Active Recovery Draft is unavailable."))
            return
        }
        val expected = if (request.has("expectedDraftRevision")) request.optInt("expectedDraftRevision") else Int.MIN_VALUE
        if (expected != draft.optInt("draftRevision")) {
            sendJson(output, 409, responseJson(false, existing.toString(), errorsArray("RECOVERY_DRAFT_CONFLICT", "Recovery Draft was updated elsewhere.")))
            return
        }
        val next = JSONObject(draft.toString())
            .put("draftRevision", draft.optInt("draftRevision") + 1)
            .put("fields", request.optJSONArray("fields") ?: draft.optJSONArray("fields") ?: JSONArray())
        val errors = saveRecoveryDraft(next)
        if (errors.length() > 0) {
            sendJson(output, 503, responseJson(false, existing.toString(), errors))
            return
        }
        sendJson(output, 200, okJson(JSONObject().put("state", "active").put("draft", next).toString()))
    }

    private fun sendRecoveryDraftDelete(output: OutputStream, resourceKey: String) {
        val resolved = resolveRecoveryResource(resourceKey)
        if (resolved == null) {
            sendJson(output, 404, failJson("RECOVERY_RESOURCE_NOT_FOUND", "Recovery Resource was not found."))
            return
        }
        deleteRecoveryDraft("WORKOUT", resolved.source.path, sourceRevision(resolved.source))
        sendJson(output, 200, okJson(JSONObject().put("state", "none").put("draft", JSONObject.NULL).toString()))
    }

    private fun sendRecoveryValidation(output: OutputStream, resourceKey: String) {
        val result = validateRecoveryDraft(resourceKey)
        val errors = result.optJSONArray("errors") ?: JSONArray()
        if (errors.length() > 0) {
            val first = errors.getJSONObject(0)
            sendJson(output, recoveryStatusCode(first.optString("code")), responseJson(false, "null", errors))
        } else {
            sendJson(output, 200, okJson(result.getJSONObject("data").toString()))
        }
    }

    private fun sendRecoveryCommitUnavailable(output: OutputStream, body: String) {
        val request = runCatching { JSONObject(body.ifBlank { "{}" }) }.getOrDefault(JSONObject())
        request.optString("expectedSourceRevision")
        if (request.has("expectedDraftRevision")) request.optInt("expectedDraftRevision")
        sendJson(output, 503, failJson("RECOVERY_UNAVAILABLE", "Android Recovery commit is unavailable in this build."))
    }

    private fun okJson(dataJson: String, errorsJson: String = "[]", warningsJson: String = "[]"): String = """
        {
          "success": true,
          "errors": $errorsJson,
          "warnings": $warningsJson,
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
            if (build.payload == null) {
                return failedSync(build.errors)
            }
            val saveErrors = saveRuntimeDataAtomically(build.payload)
            if (saveErrors.length() > 0) {
                return failedSync(saveErrors)
            }
            githubComponentStatus = "available"
            latestRemoteRetrieval = "succeeded"
            latestValidation = "succeeded"
            writeLog("INFO", "Runtime data synchronized from GitHub.")
            SyncResponse(200, okJson("""
                {
                  "degraded": ${build.errors.length() > 0}
                }
            """.trimIndent(), errorsJson = build.errors.toString(), warningsJson = build.warnings.toString()), true)
        } catch (ex: AfException) {
            githubComponentStatus = "degraded"
            latestRemoteRetrieval = "failed"
            latestValidation = "skipped"
            writeLog("WARN", "Remote sync failed: ${ex.message}")
            failedSync(errorsArray(ex.code, ex.message))
        } catch (ex: Exception) {
            githubComponentStatus = "degraded"
            latestRemoteRetrieval = "failed"
            latestValidation = "skipped"
            val message = ex.message ?: "GitHub sync failed."
            writeLog("WARN", "Remote sync failed: $message")
            failedSync(errorsArray("GITHUB_CONNECTION_FAILED", message))
        }
    }

    private fun saveRuntimeDataAtomically(payload: String): JSONArray {
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

    private fun inspectWorkoutRecoveryResources(): List<RecoveryResource> {
        val configuration = JSONObject(loadConfigurationJson())
        val fetched = fetchConfiguredResources(configuration)
        val machine = fetched.machineMaster ?: throw AfException("RECOVERY_UNAVAILABLE", "Machine master resource is unavailable.")
        val gym = fetched.gymMaster ?: throw AfException("RECOVERY_UNAVAILABLE", "Gym master resource is unavailable.")
        val machineMaster = MasterDocument("MACHINE_MASTER", machine.path, sourceRevision(machine), machine.content)
        val gymMaster = MasterDocument("GYM_MASTER", gym.path, sourceRevision(gym), gym.content)
        return fetched.workoutFiles
            .sortedBy { it.path }
            .map { source ->
                val inspection = inspectWorkoutResource(source, machineMaster, gymMaster)
                RecoveryResource(source, recoveryResourceKey(configuration, "WORKOUT", source.path, sourceRevision(source)), inspection)
            }
    }

    private fun inspectWorkoutResource(source: RuntimeSourceFile, machineMaster: MasterDocument, gymMaster: MasterDocument): JSONObject {
        val build = buildRuntimeDataPayload(listOf(source), machineMaster, gymMaster)
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

    private fun resolveRecoveryResource(resourceKey: String): RecoveryResource? =
        runCatching { inspectWorkoutRecoveryResources().firstOrNull { it.resourceKey == resourceKey } }.getOrNull()

    private fun validateRecoveryDraft(resourceKey: String): JSONObject {
        val resources = runCatching { inspectWorkoutRecoveryResources() }.getOrElse { ex ->
            val code = if (ex is AfException) ex.code else "RECOVERY_UNAVAILABLE"
            val message = ex.message ?: "Recovery is unavailable."
            return JSONObject().put("errors", errorsArray(code, message))
        }
        val resolved = resources.firstOrNull { it.resourceKey == resourceKey }
            ?: return JSONObject().put("errors", errorsArray("RECOVERY_RESOURCE_NOT_FOUND", "Recovery Resource was not found."))
        val snapshot = loadRecoveryDraft("WORKOUT", resolved.source.path, sourceRevision(resolved.source))
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
                .put("data", recoveryValidationJson(draft, "broken", unresolved, false, draft.optString("sourcePath"), null))
        }

        val configuration = JSONObject(loadConfigurationJson())
        val fetched = fetchConfiguredResources(configuration)
        val machine = fetched.machineMaster ?: return JSONObject().put("errors", errorsArray("RECOVERY_UNAVAILABLE", "Machine master resource is unavailable."))
        val gym = fetched.gymMaster ?: return JSONObject().put("errors", errorsArray("RECOVERY_UNAVAILABLE", "Gym master resource is unavailable."))
        val machineMaster = MasterDocument("MACHINE_MASTER", machine.path, sourceRevision(machine), machine.content)
        val gymMaster = MasterDocument("GYM_MASTER", gym.path, sourceRevision(gym), gym.content)
        val candidate = buildRecoveryCandidateContent(draft)
        val replacementPath = determineReplacementPath(draft.optString("sourcePath"), candidate)
        val candidateFile = RuntimeSourceFile(replacementPath, candidate, draft.optString("sourceRevision"))
        val validation = buildRuntimeDataPayload(listOf(candidateFile), machineMaster, gymMaster)
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
            .put("data", recoveryValidationJson(draft, health, issues, health == "healthy" || health == "degraded", replacementPath, pathChange))
    }

    private fun recoveryValidationJson(
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
        val candidate = buildRuntimeDataPayload(listOf(candidateFile), machineMaster, gymMaster)
        val others = buildRuntimeDataPayload(otherWorkoutFiles, machineMaster, gymMaster)
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

    private fun buildRecoveryCandidateContent(draft: JSONObject): String {
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
            buildRecoveryObject(confirmed, "").toString() + "\n"
        }
    }

    private fun buildRecoveryObject(fields: List<JSONObject>, prefix: String): JSONObject {
        val result = JSONObject()
        fields.sortedBy { it.optString("fieldPath") }.forEach { field ->
            val path = field.optString("fieldPath")
            val key = if (prefix.isEmpty()) path.trimStart('/') else path.removePrefix("$prefix/")
            if (key.isNotBlank() && !key.contains('/')) {
                result.put(key, field.opt("value"))
            }
        }
        return result
    }

    private fun determineReplacementPath(sourcePath: String, candidateContent: String): String {
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

    private fun recoveryCapabilitiesJson(eligible: Boolean): JSONObject = JSONObject()
        .put("sourceView", true)
        .put("draft", eligible)
        .put("validate", eligible)
        .put("commit", false)

    private fun deleteRecoveryDraft(resourceType: String, sourcePath: String, currentSourceRevision: String) {
        val draft = JSONObject()
            .put("resourceType", resourceType)
            .put("sourcePath", sourcePath)
            .put("sourceRevision", currentSourceRevision)
        val path = File(recoveryDraftDirectory, recoveryDraftFileName(draft))
        if (path.exists()) path.delete()
    }

    private fun recoveryResourceKey(configuration: JSONObject, resourceType: String, sourcePath: String, sourceRevision: String): String {
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

    private fun sourceRevision(source: RuntimeSourceFile): String = source.revision ?: contentRevision(source.content)

    private fun recoveryStatusCode(code: String): Int = when (code) {
        "RECOVERY_RESOURCE_NOT_FOUND" -> 404
        "RECOVERY_SOURCE_VIEW_TOO_LARGE" -> 413
        "RECOVERY_RESOURCE_NOT_BROKEN",
        "RECOVERY_DRAFT_REQUIRED",
        "RECOVERY_DRAFT_CONFLICT",
        "RECOVERY_DRAFT_STALE",
        "RECOVERY_DRAFT_INCOMPATIBLE",
        "RECOVERY_DRAFT_CORRUPTED",
        "RECOVERY_VALIDATION_FAILED",
        "RECOVERY_WRITE_CONFLICT" -> 409
        "RECOVERY_UNAVAILABLE",
        "RECOVERY_WRITE_FAILED",
        "RECOVERY_REFLECTION_FAILED" -> 503
        "CONFIG_REQUIRED",
        "CONFIG_INVALID" -> 400
        "GITHUB_UNAUTHORIZED" -> 401
        "GITHUB_FORBIDDEN" -> 403
        "GITHUB_RESOURCE_NOT_FOUND" -> 404
        "GITHUB_RATE_LIMIT" -> 429
        "GITHUB_TIMEOUT",
        "GITHUB_CONNECTION_FAILED",
        "GITHUB_SERVER_ERROR" -> 503
        else -> 500
    }


    private fun createWorkoutRecoveryDraft(source: RuntimeSourceFile, broken: Boolean): JSONObject {
        val sourceRevision = source.revision ?: contentRevision(source.content)
        val existing = loadRecoveryDraft("WORKOUT", source.path, sourceRevision)
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
        val errors = saveRecoveryDraft(draft)
        return JSONObject()
            .put("state", if (errors.length() == 0) "active" else "none")
            .put("draft", if (errors.length() == 0) draft else JSONObject.NULL)
            .put("errors", errors)
    }

    private fun loadRecoveryDraft(resourceType: String, sourcePath: String, currentSourceRevision: String): JSONObject {
        if (!recoveryDraftDirectory.exists()) {
            return JSONObject().put("state", "none").put("draft", JSONObject.NULL)
        }

        return try {
            recoveryDraftDirectory.listFiles { file -> file.extension == "json" }
                ?.sortedBy { it.name }
                ?.forEach { file ->
                    val envelope = JSONObject(file.readText(StandardCharsets.UTF_8))
                    val draft = envelope.optJSONObject("draft") ?: return JSONObject().put("state", "corrupted").put("draft", JSONObject.NULL)
                    if (draft.optString("resourceType") == resourceType && draft.optString("sourcePath") == sourcePath) {
                        val state = when {
                            draft.optInt("schemaVersion", -1) != 1 -> "incompatible"
                            draft.optString("sourceRevision") != currentSourceRevision -> "stale"
                            else -> "active"
                        }
                        return JSONObject().put("state", state).put("draft", draft)
                    }
                }
            JSONObject().put("state", "none").put("draft", JSONObject.NULL)
        } catch (_: Exception) {
            JSONObject().put("state", "corrupted").put("draft", JSONObject.NULL)
        }
    }

    private fun saveRecoveryDraft(draft: JSONObject): JSONArray {
        return try {
            recoveryDraftDirectory.mkdirs()
            recoveryTemporaryDirectory.mkdirs()
            val path = File(recoveryDraftDirectory, recoveryDraftFileName(draft))
            val temporary = File(recoveryTemporaryDirectory, path.name + ".tmp")
            temporary.writeText(JSONObject().put("draft", draft).toString(2), StandardCharsets.UTF_8)
            if (!temporary.renameTo(path)) throw IllegalStateException("Recovery Draft could not be replaced.")
            JSONArray()
        } catch (_: Exception) {
            errorsArray("RECOVERY_DRAFT_SAVE_FAILED", "Recovery Draft could not be saved.")
        }
    }

    private fun recoveryDraftFileName(draft: JSONObject): String {
        val key = listOf(
            draft.optString("resourceType"),
            draft.optString("sourcePath"),
            draft.optString("sourceRevision")
        ).joinToString("|")
        return sha256Hex(key) + ".json"
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
        listOf("/schema_version", "/session_id", "/date", "/status", "/gym_id", "/condition", "/machines", "/notes")
            .forEach { fields.put(JSONObject().put("fieldPath", prefix + it).put("state", "unresolved").put("source", "original")) }
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

    private fun failedSync(errors: JSONArray): SyncResponse {
        githubComponentStatus = "degraded"
        if (latestRemoteRetrieval == "unknown") latestRemoteRetrieval = "succeeded"
        if (latestValidation == "unknown" || latestValidation == "succeeded") latestValidation = "failed"
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

    private fun runtimeDataStatus(): String {
        if (!runtimeDataFile.exists()) return "unavailable"
        return if (runtimeDataHasRetainedErrors()) "degraded" else "available"
    }

    private fun runtimeDataHasRetainedErrors(): Boolean = runCatching {
        val runtimeData = JSONObject(runtimeDataFile.readText(StandardCharsets.UTF_8))
        (runtimeData.optJSONArray("errors")?.length() ?: 0) > 0
    }.getOrDefault(false)

    private fun githubStatus(): String = githubComponentStatus

    private fun fetchRuntimeWorkoutData(): RuntimeBuildResult {
        // Android mirrors the Windows runtime builder contract in-place so packaged APKs can sync
        // without a shared .NET runtime dependency.
        val configuration = JSONObject(loadConfigurationJson())
        val workoutFiles = fetchConfiguredWorkoutResources(configuration)
        val machineMaster = readMasterDocumentFromGithub(configuration, "MACHINE_MASTER")
        val gymMaster = readMasterDocumentFromGithub(configuration, "GYM_MASTER")
        return buildRuntimeDataPayload(workoutFiles, machineMaster, gymMaster)
    }

    private fun buildRuntimeDataPayload(
        workoutFiles: List<RuntimeSourceFile>,
        machineMaster: MasterDocument,
        gymMaster: MasterDocument
    ): RuntimeBuildResult {
        val errors = JSONArray()
        val warnings = JSONArray()
        val machines = parseMachineMaster(RuntimeSourceFile(machineMaster.path, machineMaster.content), errors)
        val gyms = parseGymMaster(RuntimeSourceFile(gymMaster.path, gymMaster.content), errors)
        if (workoutFiles.isEmpty()) errors.put(errorJson("RUNTIME_DATA_EMPTY", "Workout resource is empty."))
        if (errors.length() > 0) return RuntimeBuildResult(null, errors, warnings)

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

    private fun appendJsonArray(target: JSONArray, source: JSONArray) {
        for (index in 0 until source.length()) {
            target.put(source.get(index))
        }
    }

    private fun fetchConfiguredWorkoutResources(configuration: JSONObject): List<RuntimeSourceFile> {
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
        val resources = configuration.getJSONArray("resources")

        for (index in 0 until resources.length()) {
            val resource = resources.getJSONObject(index)
            if (resource.optString("type") != "WORKOUT") continue
            val resourcePath = resource.optString("path")
            val kind = resource.optString("resourceKind", "file")
            val required = resource.optBoolean("required", true)
            val emptyAllowed = resource.optBoolean("emptyAllowed", false)
            val fullPath = combineRemote(repository.optString("rootPath"), resourcePath)
            val fetched = if (kind == "directory") {
                fetchDirectoryFiles(owner, repo, ref, fullPath, token, timeoutSec)
            } else {
                listOf(fetchRawRuntimeFile(owner, repo, ref, fullPath, token, timeoutSec))
            }

            if (!emptyAllowed && fetched.isEmpty()) {
                if (required) throw IllegalStateException("$resourcePath is empty.")
                continue
            }
            workoutFiles.addAll(fetched.filter { isJsonRuntimePath(it.path) })
        }

        return workoutFiles
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
                val sourceIds = readStringList(item?.optJSONArray("source_ids"))
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
                val record = MachineMasterItem(id, sourceIds, name, bodyPart, item?.optBoolean("deleted", false) ?: false)
                result[id] = record
                for (sourceId in sourceIds) {
                    if (result.containsKey(sourceId)) {
                        errors.put(errorJson("RUNTIME_DATA_INVALID", "${file.path}: Duplicate machine source_id: $sourceId."))
                        return emptyMap()
                    }
                    result[sourceId] = record
                }
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
                val sourceIds = readStringList(item?.optJSONArray("source_ids"))
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
                val record = GymMasterItem(id, sourceIds, name, shortName, item?.optBoolean("deleted", false) ?: false)
                result[id] = record
                for (sourceId in sourceIds) {
                    if (result.containsKey(sourceId)) {
                        errors.put(errorJson("RUNTIME_DATA_INVALID", "${file.path}: Duplicate gym source_id: $sourceId."))
                        return emptyMap()
                    }
                    result[sourceId] = record
                }
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

        val gym = gyms[gymId]
        if (gym == null || gym.deleted) {
            warnings.put(referenceWarningJson("gym", gymId, gym?.id, gym?.deleted ?: false, sessionId, filePath, line))
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
            .put("resolution", referenceResolutionJson(gymId, gym?.id, gym?.deleted ?: false))
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
        masters: Map<String, MachineMasterItem>,
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

        val master = masters[machineId]
        if (master == null || master.deleted) {
            warnings.put(referenceWarningJson("machine", machineId, master?.id, master?.deleted ?: false, sessionId, filePath, line))
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
            .put("resolution", referenceResolutionJson(machineId, master?.id, master?.deleted ?: false))
            .put("sets", sets)
            .put("notes", readStringArray(item.optJSONArray("notes")))
        if (master != null && !master.deleted) {
            normalized
                .put("name", master.name)
                .put("body_part", master.bodyPart)
        }
        return normalized
    }

    private fun referenceResolutionJson(originalId: String, resolvedId: String?, deleted: Boolean): JSONObject {
        return JSONObject()
            .put("state", androidMasterReferenceResolutionState(resolvedId, deleted))
            .put("originalId", originalId)
            .put("resolvedId", resolvedId ?: JSONObject.NULL)
    }

    private fun referenceWarningJson(
        referenceKind: String,
        originalId: String,
        resolvedId: String?,
        deleted: Boolean,
        sessionId: String,
        filePath: String,
        line: Int?
    ): JSONObject {
        val resolutionState = if (deleted) "deleted" else "missing"
        val subject = if (referenceKind == "gym") "ジム" else "マシン"
        val stateText = if (deleted) "削除されています" else "存在しません"
        return JSONObject()
            .put("code", androidMasterReferenceWarningCode(deleted))
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
        val content = httpGet(url, token, timeoutSec, path)
        return RuntimeSourceFile(path, content, contentRevision(content))
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

    private fun contentRevision(content: String): String = "content-sha256-${sha256Hex(content)}"

    private fun sha256Hex(value: String): String =
        MessageDigest.getInstance("SHA-256")
            .digest(value.toByteArray(StandardCharsets.UTF_8))
            .joinToString("") { "%02x".format(it) }

    private fun isJsonRuntimePath(path: String): Boolean =
        path.endsWith(".json", ignoreCase = true) || path.endsWith(".jsonl", ignoreCase = true)

    private fun mapGithubError(status: Int, path: String): AfException = when (status) {
        401 -> AfException("GITHUB_UNAUTHORIZED", "GitHub token is unauthorized.")
        403 -> AfException("GITHUB_FORBIDDEN", "GitHub access is forbidden.")
        404 -> AfException("GITHUB_RESOURCE_NOT_FOUND", "GitHub resource not found: $path.")
        429 -> AfException("GITHUB_RATE_LIMIT", "GitHub rate limit reached.")
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
          "warnings": [],
          "data": null
        }
    """.trimIndent()

    private fun responseJson(success: Boolean, dataJson: String, errors: JSONArray): String = """
        {
          "success": $success,
          "errors": ${errors.toString()},
          "warnings": [],
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







