package jp.yuri_regulus_25.atlament

import android.content.Context
import android.util.Base64
import java.io.BufferedInputStream
import java.io.BufferedReader
import java.io.ByteArrayInputStream
import java.io.Closeable
import java.io.File
import java.io.InputStream
import java.io.InputStreamReader
import java.io.OutputStream
import java.net.InetAddress
import java.net.ServerSocket
import java.net.Socket
import java.net.URLDecoder
import java.nio.charset.StandardCharsets
import java.time.Instant
import java.security.MessageDigest
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean
import org.json.JSONArray
import org.json.JSONObject

class AndroidLocalhostServer(
    private val context: Context,
    private val onShutdown: () -> Unit = {}
) : Closeable {
    private data class SyncResponse(val status: Int, val body: String, val success: Boolean)
    private data class RecoveryResource(val source: RuntimeSourceFile, val resourceKey: String, val inspection: JSONObject)
    private data class MasterWriteTarget(val type: String, val path: String)
    private val assetServer = AndroidAssetServer(context)
    private val runtimeDataBuilder = AndroidRuntimeDataBuilder()
    private val githubClient = AndroidGithubClient { credentialStore.readToken() }
    private val configuredResourceFetcher = AndroidConfiguredResourceFetcher(githubClient, ::validateConfiguration)
    private val bodyParts = setOf("chest", "back", "legs", "shoulders", "arms", "glutes", "core", "cardio", "other")
    private val resourceTypes = setOf("WORKOUT", "MACHINE_MASTER", "GYM_MASTER")
    private val resourceKinds = setOf("file", "directory")
    private val configurationFile = File(context.filesDir, "configuration/af-settings.json")
    private val configurationStore = AndroidConfigurationStore(configurationFile)
    private val credentialStore = AndroidCredentialStore(context)
    private val runtimeDataFile = File(context.filesDir, "runtime/current/runtime-workouts.json")
    private val runtimeDataStore = AndroidRuntimeDataStore(runtimeDataFile)
    private val recoveryDraftDirectory = File(context.filesDir, "recovery/drafts")
    private val recoveryTemporaryDirectory = File(context.filesDir, "recovery/temporary")
    private val recoveryDraftStore = AndroidRecoveryDraftStore(recoveryDraftDirectory, recoveryTemporaryDirectory)
    private val logDatabaseFile = File(context.filesDir, "log/atlament-log.sqlite")
    private val afLogStore = AndroidAfLogStore(logDatabaseFile)
    private val operationGate = AndroidOperationGate()
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
        for (candidate in androidLocalhostPorts) {
            try {
                // Match Windows AF port order so Frontend and smoke checks can share the same
                // primary/secondary localhost assumptions across platforms.
                val socket = ServerSocket(candidate, 50, InetAddress.getByName("127.0.0.1"))
                serverSocket = socket
                port = candidate
                running.set(true)
                afLogStore.initialize()
                afLogStore.write("INFO", "HTTP server started on 127.0.0.1:$candidate.")
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
                assetServer.serve(client.getOutputStream(), path)
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
            method == "GET" && route == "/credential/status" -> sendJson(output, 200, okJson(credentialStore.statusJson()))
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

    private fun statusJson(): String {
        val operations = operationGate.snapshot()
        return """
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
              },
              "build": {
                "variant": "${BuildConfig.BUILD_TYPE}",
                "debug": ${BuildConfig.DEBUG}
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
              "startup": "${operations.startup}",
              "manualSync": "${operations.manualSync}",
              "configurationUpdate": "${operations.configurationUpdate}",
              "credentialUpdate": "${operations.credentialUpdate}",
              "shutdown": "${operations.shutdown}"
            },
            "components": {
              "configuration": "${configurationStatus()}",
              "credential": "${credentialStore.componentStatus()}",
              "github": "${githubStatus()}",
              "runtimeData": "${runtimeDataStore.status()}",
              "hosting": ${hostingStatusJson()}
            },
            "requiredActions": ${requiredActionsJson()}
          }
        }
    """.trimIndent()
    }


    private fun frontendVersionJson(): JSONObject = runCatching {
        context.assets.open("frontend/version.json").use { stream ->
            JSONObject(stream.bufferedReader(StandardCharsets.UTF_8).readText())
        }
    }.getOrDefault(JSONObject())

    private fun runtimeDataFactsJson(): String {
        val runtimeStatus = runtimeDataStore.status()
        val currentAvailable = runtimeStatus != "unavailable"
        val generatedAt = if (runtimeDataStore.exists()) "\"${Instant.ofEpochMilli(runtimeDataStore.lastModifiedMillis())}\"" else "null"
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
            .put("activeDraftCount", recoveryDraftStore.countActive())
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
        if (configurationStatus() == "available" && runtimeDataStore.status() == "available" && requiredActionNames().isEmpty()) "ready" else "degraded"

    private fun readinessJson(): String {
        val requiredActions = requiredActionNames().sorted()
        val unavailableComponents = mutableListOf<String>()
        if (configurationStatus() == "unavailable") unavailableComponents.add("configuration")
        if (credentialStore.componentStatus() == "unavailable") unavailableComponents.add("credential")
        if (runtimeDataStore.status() == "unavailable") unavailableComponents.add("runtimeData")
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
        if (runtimeDataStore.exists()) actions.remove("RUNTIME_DATA_REQUIRED")
        if (credentialStore.state() == "missing") actions.add(0, "CREDENTIAL_REQUIRED")
        if (configurationStatus() != "available") actions.add(0, "CONFIGURATION_REQUIRED")
        return actions
    }

    private fun loadConfigurationJson(): String = configurationStore.loadJson()

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
        val credential = JSONObject(credentialStore.statusJson())
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
        if (credentialStore.state() != "available" || credentialStore.readToken().isNullOrBlank()) {
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
        val content = githubClient.readContentFile(configuration, fullPath)
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
        if (!operationGate.tryStart("configurationUpdate")) {
            return SyncResponse(409, failJson("OPERATION_ALREADY_RUNNING", "Configuration update is already running."), false)
        }

        var success = false
        return try {
            val update = if (updateJson.isBlank()) JSONObject() else JSONObject(updateJson)
            val merged = JSONObject(configurationStore.mergeJson(update.toString()))
            val validationErrors = validateConfiguration(merged)
            if (validationErrors.length() > 0) {
                return SyncResponse(400, responseJson(false, "null", validationErrors), false)
            }

            val saveErrors = configurationStore.saveAtomically(merged.toString(2))
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
            operationGate.complete("configurationUpdate", success)
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

    private fun checkRemoteConfiguration(configuration: JSONObject): JSONArray {
        return try {
            configuredResourceFetcher.fetchAll(configuration)
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
            method == "POST" && action == "commit" -> sendRecoveryCommit(output, resourceKey, body)
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
                val draft = recoveryDraftStore.load("WORKOUT", resource.source.path, revision)
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
        val resolved = resolveRecoveryResourceForRead(resourceKey)
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
            .put("draft", recoveryDraftStore.load("WORKOUT", resolved.source.path, sourceRevision(resolved.source)))
        sendJson(output, 200, okJson(detail.toString()))
    }

    private fun sendRecoverySource(output: OutputStream, resourceKey: String) {
        val resolved = resolveRecoveryResourceForRead(resourceKey)
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
        val resolved = resolveRecoveryResourceForRead(resourceKey)
        if (resolved == null) {
            sendJson(output, 404, failJson("RECOVERY_RESOURCE_NOT_FOUND", "Recovery Resource was not found."))
            return
        }
        sendJson(output, 200, okJson(recoveryDraftStore.load("WORKOUT", resolved.source.path, sourceRevision(resolved.source)).toString()))
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
        val existing = recoveryDraftStore.load("WORKOUT", resolved.source.path, sourceRevision(resolved.source))
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
        val errors = recoveryDraftStore.save(next)
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
        recoveryDraftStore.delete("WORKOUT", resolved.source.path, sourceRevision(resolved.source))
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

    private fun sendRecoveryCommit(output: OutputStream, resourceKey: String, body: String) {
        if (!operationGate.tryStart("recoveryCommit")) {
            sendJson(output, 409, failJson("OPERATION_ALREADY_RUNNING", "Recovery commit is already running."))
            return
        }

        var success = false
        try {
            val request = runCatching { JSONObject(body.ifBlank { "{}" }) }.getOrElse {
                sendJson(output, 400, failJson("RECOVERY_WRITE_FAILED", "Recovery commit request is invalid."))
                return
            }
            val expectedSourceRevision = request.optString("expectedSourceRevision").trim()
            val expectedDraftRevision = if (request.has("expectedDraftRevision")) request.optInt("expectedDraftRevision") else Int.MIN_VALUE
            if (expectedSourceRevision.isBlank() || expectedDraftRevision == Int.MIN_VALUE) {
                sendJson(output, 400, failJson("RECOVERY_WRITE_FAILED", "Recovery commit request is invalid."))
                return
            }

            val configuration = JSONObject(loadConfigurationJson())
            val resources = inspectWorkoutRecoveryResources()
            val resolved = resources.firstOrNull { it.resourceKey == resourceKey }
            if (resolved == null) {
                val staleSource = resources.firstOrNull {
                    recoveryResourceKey(configuration, "WORKOUT", it.source.path, expectedSourceRevision) == resourceKey
                }
                if (staleSource != null && sourceRevision(staleSource.source) != expectedSourceRevision) {
                    sendJson(output, 409, failJson("RECOVERY_WRITE_CONFLICT", "Recovery source revision is stale."))
                    return
                }

                sendJson(output, 404, failJson("RECOVERY_RESOURCE_NOT_FOUND", "Recovery Resource was not found."))
                return
            }
            if (resolved.inspection.optString("health") != "broken") {
                sendJson(output, 409, failJson("RECOVERY_RESOURCE_NOT_BROKEN", "Recovery target is not Broken."))
                return
            }
            if (sourceRevision(resolved.source) != expectedSourceRevision) {
                sendJson(output, 409, failJson("RECOVERY_WRITE_CONFLICT", "Recovery source revision is stale."))
                return
            }

            val snapshot = recoveryDraftStore.load("WORKOUT", resolved.source.path, sourceRevision(resolved.source))
            val draft = snapshot.optJSONObject("draft")
            if (snapshot.optString("state") != "active" || draft == null) {
                sendJson(output, 409, failJson("RECOVERY_DRAFT_REQUIRED", "Recovery Draft is required."))
                return
            }
            if (draft.optInt("draftRevision") != expectedDraftRevision) {
                sendJson(output, 409, failJson("RECOVERY_DRAFT_CONFLICT", "Recovery Draft was updated elsewhere."))
                return
            }

            val validationResult = validateRecoveryDraft(resourceKey)
            val validationErrors = validationResult.optJSONArray("errors") ?: JSONArray()
            if (validationErrors.length() > 0) {
                val first = validationErrors.getJSONObject(0)
                sendJson(output, recoveryStatusCode(first.optString("code")), responseJson(false, "null", validationErrors))
                return
            }
            val validation = validationResult.getJSONObject("data")
            if (!validation.optBoolean("commitAllowed")) {
                sendJson(output, 409, failJson("RECOVERY_VALIDATION_FAILED", "Recovery candidate is not committable."))
                return
            }

            val replacementContent = buildRecoveryCandidateContent(draft)
            val replacementPath = validation.optString("replacementPath")
            if (!configuredResourceFetcher.isAllowedRecoveryWorkoutPath(configuration, resolved.source.path) ||
                !configuredResourceFetcher.isAllowedRecoveryWorkoutPath(configuration, replacementPath)) {
                sendJson(output, 409, failJson("RECOVERY_WRITE_CONFLICT", "Recovery path is outside the configured resource boundary."))
                return
            }
            val push = pushRecoveryReplacement(configuration, resolved.source.path, expectedSourceRevision, replacementPath, replacementContent)
            val reflection = reflectRecoveryCommit(configuration, push.replacementPath, push.replacementRevision, push.commitRevision)
            val result = JSONObject()
                .put("committed", true)
                .put("sourcePath", resolved.source.path)
                .put("sourceRevision", sourceRevision(resolved.source))
                .put("replacementPath", push.replacementPath)
                .put("replacementRevision", push.replacementRevision)
                .put("commitRevision", push.commitRevision)
                .put("pathChange", validation.opt("pathChange") ?: JSONObject.NULL)
                .put("reflection", reflection)

            if (reflection.optBoolean("succeeded")) {
                recoveryDraftStore.delete("WORKOUT", resolved.source.path, sourceRevision(resolved.source))
                success = true
                sendJson(output, 200, okJson(result.toString()))
                return
            }

            val errors = errorsArray("RECOVERY_REFLECTION_FAILED", "Recovery commit succeeded but runtime reflection failed.")
            appendJsonArray(errors, reflection.optJSONArray("errors") ?: JSONArray())
            sendJson(output, 200, responseJson(true, result.toString(), errors, reflection.optJSONArray("warnings") ?: JSONArray()))
        } catch (ex: AfException) {
            sendJson(output, recoveryStatusCode(ex.code), failJson(ex.code, ex.message))
        } catch (_: Exception) {
            sendJson(output, 500, failJson("COMMON_INTERNAL_ERROR", "Recovery commit failed."))
        } finally {
            operationGate.complete("recoveryCommit", success)
        }
    }

    private fun pushRecoveryReplacement(
        configuration: JSONObject,
        sourcePath: String,
        expectedSourceRevision: String,
        replacementPath: String,
        replacementContent: String
    ): RecoveryGitWriteResult =
        if (sourcePath == replacementPath) {
            pushRecoverySamePath(configuration, sourcePath, expectedSourceRevision, replacementContent)
        } else {
            pushRecoveryRelocation(configuration, sourcePath, expectedSourceRevision, replacementPath, replacementContent)
        }

    private fun pushRecoverySamePath(
        configuration: JSONObject,
        path: String,
        expectedSourceRevision: String,
        replacementContent: String
    ): RecoveryGitWriteResult =
        githubClient.writeRecoveryContentFile(configuration, path, expectedSourceRevision, replacementContent)

    private fun pushRecoveryRelocation(
        configuration: JSONObject,
        sourcePath: String,
        expectedSourceRevision: String,
        replacementPath: String,
        replacementContent: String
    ): RecoveryGitWriteResult {
        val source = githubClient.readContentFile(configuration, sourcePath)
        if (contentRevision(source.content) != expectedSourceRevision) {
            throw AfException("RECOVERY_WRITE_CONFLICT", "Recovery source revision is stale.")
        }

        try {
            githubClient.readContentFile(configuration, replacementPath)
            throw AfException("RECOVERY_WRITE_CONFLICT", "Recovery destination already exists.")
        } catch (ex: AfException) {
            if (ex.code != "GITHUB_RESOURCE_NOT_FOUND") throw ex
        }

        val headSha = githubClient.readBranchHead(configuration)
        val commitSha = createRecoveryRelocationCommit(configuration, headSha, sourcePath, replacementPath, replacementContent)
        return RecoveryGitWriteResult(replacementPath, contentRevision(replacementContent), commitSha)
    }

    private fun createRecoveryRelocationCommit(
        configuration: JSONObject,
        expectedHeadSha: String,
        sourcePath: String,
        replacementPath: String,
        replacementContent: String
    ): String {
        val repository = configuration.getJSONObject("repository")
        val branchName = androidNormalizeGitBranchRef(repository.optString("ref", "main")).removePrefix("heads/")
        val addition = androidRecoveryRelocationAddition(replacementPath, replacementContent)
        val deletion = androidRecoveryRelocationDeletion(sourcePath)
        val input = JSONObject()
            .put("branch", JSONObject()
                .put("repositoryNameWithOwner", "${repository.optString("owner").trim()}/${repository.optString("repository").trim()}")
                .put("branchName", branchName))
            .put("expectedHeadOid", expectedHeadSha)
            .put("message", JSONObject().put("headline", "Recover workout resource"))
            .put("fileChanges", JSONObject()
                .put("additions", JSONArray().put(JSONObject()
                    .put("path", addition.path)
                    .put("contents", addition.contents)))
                .put("deletions", JSONArray().put(JSONObject()
                    .put("path", deletion.path))))
        val payload = JSONObject()
            .put("query", """
                mutation(${'$'}input: CreateCommitOnBranchInput!) {
                  createCommitOnBranch(input: ${'$'}input) {
                    commit { oid }
                  }
                }
            """.trimIndent())
            .put("variables", JSONObject().put("input", input))
            .toString()
        val response = githubClient.postGraphql(configuration, payload)
        val errors = response.optJSONArray("errors")
        if (errors != null && errors.length() > 0) {
            val message = errors.optJSONObject(0)?.optString("message").orEmpty()
            val type = errors.optJSONObject(0)?.optString("type").orEmpty()
            if (type == "STALE_DATA" || message.contains("Expected branch to point to", ignoreCase = true)) {
                throw AfException("RECOVERY_WRITE_CONFLICT", "Remote repository changed before Recovery commit.")
            }
            throw AfException("RECOVERY_WRITE_FAILED", message.ifBlank { "Recovery relocation commit failed." })
        }
        val commitSha = response.optJSONObject("data")
            ?.optJSONObject("createCommitOnBranch")
            ?.optJSONObject("commit")
            ?.optString("oid")
            .orEmpty()
            .trim()
        if (commitSha.isBlank()) throw AfException("RECOVERY_WRITE_FAILED", "GitHub write result is ambiguous.")
        return commitSha
    }

    private fun reflectRecoveryCommit(
        configuration: JSONObject,
        replacementPath: String,
        replacementRevision: String,
        commitRevision: String
    ): JSONObject {
        val committedConfiguration = JSONObject(configuration.toString())
        committedConfiguration.getJSONObject("repository").put("ref", commitRevision)
        val fetched = configuredResourceFetcher.fetchAll(committedConfiguration)
        val machine = fetched.machineMaster ?: return recoveryReflectionJson(false, JSONObject.NULL, errorsArray("RECOVERY_REFLECTION_FAILED", "Machine master resource is unavailable."), JSONArray())
        val gym = fetched.gymMaster ?: return recoveryReflectionJson(false, JSONObject.NULL, errorsArray("RECOVERY_REFLECTION_FAILED", "Gym master resource is unavailable."), JSONArray())
        val machineMaster = MasterDocument("MACHINE_MASTER", machine.path, sourceRevision(machine), machine.content)
        val gymMaster = MasterDocument("GYM_MASTER", gym.path, sourceRevision(gym), gym.content)
        val committed = fetched.workoutFiles.firstOrNull { it.path == replacementPath && sourceRevision(it) == replacementRevision }
            ?: return recoveryReflectionJson(false, JSONObject.NULL, errorsArray("RECOVERY_REFLECTION_FAILED", "Recovered resource revision is not reflected at the Recovery commit."), JSONArray())
        val inspection = inspectWorkoutResource(committed, machineMaster, gymMaster)
        if (inspection.optString("health") == "broken") {
            return recoveryReflectionJson(false, inspection.optString("health"), errorsArray("RECOVERY_REFLECTION_FAILED", "Recovered resource is not reflected as Healthy or Degraded."), JSONArray())
        }

        val build = runtimeDataBuilder.buildRuntimeDataPayload(fetched.workoutFiles, machineMaster, gymMaster)
        if (build.payload == null) {
            return recoveryReflectionJson(false, inspection.optString("health"), build.errors, build.warnings)
        }
        val saveErrors = runtimeDataStore.saveAtomically(build.payload)
        if (saveErrors.length() > 0) {
            return recoveryReflectionJson(false, inspection.optString("health"), saveErrors, build.warnings)
        }

        githubComponentStatus = "available"
        latestRemoteRetrieval = "succeeded"
        latestValidation = "succeeded"
        return recoveryReflectionJson(true, inspection.optString("health"), JSONArray(), build.warnings)
    }

    private fun recoveryReflectionJson(succeeded: Boolean, health: Any, errors: JSONArray, warnings: JSONArray): JSONObject =
        JSONObject()
            .put("succeeded", succeeded)
            .put("health", health)
            .put("errors", errors)
            .put("warnings", warnings)

    private fun okJson(dataJson: String, errorsJson: String = "[]", warningsJson: String = "[]"): String = """
        {
          "success": true,
          "errors": $errorsJson,
          "warnings": $warningsJson,
          "data": $dataJson
        }
    """.trimIndent()

    private fun sendCredentialUpdate(output: OutputStream, updateJson: String) {
        val response = credentialUpdateResponse(updateJson)
        sendJson(output, response.status, response.body)
    }

    private fun credentialUpdateResponse(updateJson: String): SyncResponse {
        if (!operationGate.tryStart("credentialUpdate")) {
            return SyncResponse(409, failJson("OPERATION_ALREADY_RUNNING", "Credential update is already running."), false)
        }

        var success = false
        return try {
            val data = credentialStore.updateResultJson(updateJson)
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
            operationGate.complete("credentialUpdate", success)
        }
    }

    private fun sendRuntimeWorkoutData(output: OutputStream) {
        if (!runtimeDataStore.exists()) {
            sendJson(output, 503, failJson("RUNTIME_DATA_UNAVAILABLE", "Runtime Data is unavailable."))
            return
        }

        sendJson(output, 200, runtimeDataStore.readText())
    }

    private fun sendManualSync(output: OutputStream) {
        val response = manualSyncResponse()
        sendJson(output, response.status, response.body)
    }

    private fun manualSyncResponse(): SyncResponse {
        if (!operationGate.tryStart("manualSync")) {
            return SyncResponse(409, failJson("OPERATION_ALREADY_RUNNING", "Sync is already running."), false)
        }

        var success = false
        return try {
            val response = syncRuntimeData()
            success = response.success
            response
        } catch (ex: Exception) {
            afLogStore.write("ERROR", "Manual sync failed: ${ex.message.orEmpty()}")
            SyncResponse(500, failJson("COMMON_INTERNAL_ERROR", "Sync failed."), false)
        } finally {
            operationGate.complete("manualSync", success)
        }
    }

    private fun startStartupSync() {
        if (!operationGate.tryStart("startup")) return
        requestExecutor.execute {
            try {
                if (configurationStatus() != "available" || credentialStore.state() != "available") {
                    afLogStore.write("INFO", "Startup sync skipped because configuration or credential is unavailable.")
                    operationGate.complete("startup", true)
                    return@execute
                }

                val response = syncRuntimeData()
                val success = response.success
                if (!success) afLogStore.write("WARN", "Startup sync completed without remote runtime update.")
                operationGate.complete("startup", success)
            } catch (ex: Exception) {
                afLogStore.write("ERROR", "Startup sync failed: ${ex.message.orEmpty()}")
                operationGate.complete("startup", false)
            }
        }
    }

    private fun syncRuntimeData(): SyncResponse {
        return try {
            val build = fetchRuntimeWorkoutData()
            if (build.payload == null) {
                return failedSync(build.errors)
            }
            val saveErrors = runtimeDataStore.saveAtomically(build.payload)
            if (saveErrors.length() > 0) {
                return failedSync(saveErrors)
            }
            githubComponentStatus = "available"
            latestRemoteRetrieval = "succeeded"
            latestValidation = "succeeded"
            afLogStore.write("INFO", "Runtime data synchronized from GitHub.")
            SyncResponse(200, okJson("""
                {
                  "degraded": ${build.errors.length() > 0}
                }
            """.trimIndent(), errorsJson = build.errors.toString(), warningsJson = build.warnings.toString()), true)
        } catch (ex: AfException) {
            githubComponentStatus = "degraded"
            latestRemoteRetrieval = "failed"
            latestValidation = "skipped"
            afLogStore.write("WARN", "Remote sync failed: ${ex.message}")
            failedSync(errorsArray(ex.code, ex.message))
        } catch (ex: Exception) {
            githubComponentStatus = "degraded"
            latestRemoteRetrieval = "failed"
            latestValidation = "skipped"
            val message = ex.message ?: "GitHub sync failed."
            afLogStore.write("WARN", "Remote sync failed: $message")
            failedSync(errorsArray("GITHUB_CONNECTION_FAILED", message))
        }
    }

    private fun inspectWorkoutRecoveryResources(): List<RecoveryResource> {
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
                RecoveryResource(source, recoveryResourceKey(configuration, "WORKOUT", source.path, sourceRevision(source)), inspection)
            }
    }

    private fun inspectWorkoutResource(source: RuntimeSourceFile, machineMaster: MasterDocument, gymMaster: MasterDocument): JSONObject {
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

    private fun resolveRecoveryResource(resourceKey: String): RecoveryResource? =
        runCatching { inspectWorkoutRecoveryResources().firstOrNull { it.resourceKey == resourceKey } }.getOrNull()

    private fun resolveRecoveryResourceForRead(resourceKey: String): RecoveryResource? = runCatching {
        val configuration = JSONObject(loadConfigurationJson())
        val resources = inspectWorkoutRecoveryResources()
        resources.firstOrNull { it.resourceKey == resourceKey } ?: run {
            val draft = recoveryDraftStore.findByResourceKey(configuration, resourceKey, ::recoveryResourceKey) ?: return@run null
            resources.firstOrNull { it.source.path == draft.optString("sourcePath") }
        }
    }.getOrNull()

    private fun validateRecoveryDraft(resourceKey: String): JSONObject {
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
            ?: recoveryDraftStore.findByResourceKey(configuration, resourceKey, ::recoveryResourceKey)?.let { draft ->
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
                .put("data", recoveryValidationJson(draft, "broken", unresolved, false, draft.optString("sourcePath"), null))
        }

        val fetched = configuredResourceFetcher.fetchAll(configuration)
        val machine = fetched.machineMaster ?: return JSONObject().put("errors", errorsArray("RECOVERY_UNAVAILABLE", "Machine master resource is unavailable."))
        val gym = fetched.gymMaster ?: return JSONObject().put("errors", errorsArray("RECOVERY_UNAVAILABLE", "Gym master resource is unavailable."))
        val machineMaster = MasterDocument("MACHINE_MASTER", machine.path, sourceRevision(machine), machine.content)
        val gymMaster = MasterDocument("GYM_MASTER", gym.path, sourceRevision(gym), gym.content)
        val candidate = buildRecoveryCandidateContent(draft)
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
            buildRecoveryObject(confirmed, "").toString(2) + "\n"
        }
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
        .put("commit", eligible)

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

    private fun runtimeDataHasRetainedErrors(): Boolean = runtimeDataStore.status() == "degraded"

    private fun githubStatus(): String = githubComponentStatus

    private fun fetchRuntimeWorkoutData(): RuntimeBuildResult {
        // Android mirrors the Windows runtime builder contract in-place so packaged APKs can sync
        // without a shared .NET runtime dependency.
        val configuration = JSONObject(loadConfigurationJson())
        val workoutFiles = configuredResourceFetcher.fetchWorkoutResources(configuration)
        val machineMaster = readMasterDocumentFromGithub(configuration, "MACHINE_MASTER")
        val gymMaster = readMasterDocumentFromGithub(configuration, "GYM_MASTER")
        return runtimeDataBuilder.buildRuntimeDataPayload(workoutFiles, machineMaster, gymMaster)
    }

    private fun appendJsonArray(target: JSONArray, source: JSONArray) {
        for (index in 0 until source.length()) {
            target.put(source.get(index))
        }
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

    private fun contentRevision(content: String): String = "content-sha256-${sha256Hex(content)}"

    private fun sha256Hex(value: String): String =
        MessageDigest.getInstance("SHA-256")
            .digest(value.toByteArray(StandardCharsets.UTF_8))
            .joinToString("") { "%02x".format(it) }

    private fun sendShutdown(output: OutputStream) {
        val already = shutdownRequested.getAndSet(true)
        if (!already) {
            operationGate.tryStart("shutdown")
            operationGate.complete("shutdown", true)
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

    override fun close() {
        afLogStore.write("INFO", "HTTP server stopped.")
        running.set(false)
        serverSocket?.close()
        serverSocket = null
        acceptExecutor.shutdownNow()
        requestExecutor.shutdownNow()
    }
}







