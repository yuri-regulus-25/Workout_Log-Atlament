package jp.yuri_regulus_25.atlament

import android.content.Context
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

/**
 * Android AF の localhost HTTP server と Application orchestration ルート。
 *
 * HTTP request を `/api/v1/common` 契約へ変換し、Configuration、Credential、Runtime build、
 * Master write、Recovery の domain処理と永続化を各Serviceへ委譲する。Recovery commitでは
 * source/draft revision確認、GitHub write、Runtime reflectionを調停し、path relocationに必要な
 * atomic GraphQL commit protocolの組み立ても現状はこのClassが所有する。低水準のGitHub通信は
 * `AndroidGithubClient`へ委譲する。Windowsと同じAPI shapeを公開し、Android固有差はasset配信、
 * credential保護、local file path、packagingの範囲へ閉じ込める。
 */
class AndroidLocalhostServer(
    private val context: Context,
    private val onShutdown: () -> Unit = {}
) : Closeable {
    private val assetServer = AndroidAssetServer(context)
    private val runtimeDataBuilder = AndroidRuntimeDataBuilder()
    private val githubClient = AndroidGithubClient { credentialStore.readToken() }
    private val configuredResourceFetcher = AndroidConfiguredResourceFetcher(githubClient, ::validateConfiguration)
    private val statusComposer = AndroidStatusComposer()
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
    private val masterWriteService by lazy {
        AndroidMasterWriteService(
            configurationStatus = ::configurationStatus,
            loadConfigurationJson = ::loadConfigurationJson,
            credentialStatusJson = { credentialStore.statusJson() },
            credentialState = { credentialStore.state() },
            credentialToken = { credentialStore.readToken() },
            githubClient = githubClient,
            runtimeDataStore = runtimeDataStore,
            runtimeDataBuilder = runtimeDataBuilder,
            configuredResourceFetcher = configuredResourceFetcher,
            markGithubAvailable = { githubComponentStatus = "available" },
            markValidationSucceeded = { latestValidation = "succeeded" }
        )
    }
    private val recoveryService by lazy {
        AndroidRecoveryService(
            loadConfigurationJson = ::loadConfigurationJson,
            configuredResourceFetcher = configuredResourceFetcher,
            runtimeDataBuilder = runtimeDataBuilder,
            recoveryDraftStore = recoveryDraftStore
        )
    }
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

    /**
     * Windows と同じ優先順の localhost port へ bind し、起動時同期を開始する。
     *
     * port 番号だけを process identity として扱わない。外部 tooling が AF を探す場合も、
     * Status API の Atlament-compatible facts を確認する必要がある。
     */
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


    /**
     * Android server 内の routing を AF endpoint 契約へ写像する。
     *
     * Legacy `/api/common/...` alias は公開せず、未知の `/api/...` は frontend fallback に流さない。
     * 各 handler は AF response envelope を返す責務を持つ。
     */
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

    /**
     * Frontend が platform 固有推測をせず利用可否を判定するための Status JSON を構成する。
     */
    private fun statusJson(): String = statusComposer.statusJson(
        AndroidStatusSnapshot(
            frontendVersion = frontendVersionJson(),
            operations = operationGate.snapshot(),
            runtimeDataFactsJson = runtimeDataFactsJson(),
            recoveryStatusFactsJson = recoveryStatusFactsJson(),
            hostingStatusJson = hostingStatusJson(),
            configurationStatus = configurationStatus(),
            credentialComponentStatus = credentialStore.componentStatus(),
            credentialState = credentialStore.state(),
            githubStatus = githubStatus(),
            runtimeDataStatus = runtimeDataStore.status(),
            runtimeDataExists = runtimeDataStore.exists()
        )
    )


    private fun frontendVersionJson(): JSONObject = runCatching {
        context.assets.open("frontend/version.json").use { stream ->
            JSONObject(stream.bufferedReader(StandardCharsets.UTF_8).readText())
        }
    }.getOrDefault(JSONObject())

    /**
     * Runtime Contract Matrix に沿った current/fallback/quarantine facts を返す。
     */
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

    private fun loadConfigurationJson(): String = configurationStore.loadJson()

    private fun masterWriteBoundaryJson(): String = masterWriteService.boundaryJson()

    private fun sendMasterDocument(output: OutputStream, type: String) {
        val response = masterWriteService.documentResponse(type)
        sendJson(output, response.status, response.body)
    }

    private fun sendMasterDocumentWrite(output: OutputStream, type: String, body: String) {
        val response = masterWriteService.documentWriteResponse(type, body)
        sendJson(output, response.status, response.body)
    }

    private fun sendUnresolvedMasterReferences(output: OutputStream) {
        val response = masterWriteService.unresolvedReferencesResponse()
        sendJson(output, response.status, response.body)
    }

    private fun sendConfigurationUpdate(output: OutputStream, updateJson: String) {
        val response = configurationUpdateResponse(updateJson)
        sendJson(output, response.status, response.body)
    }

    /**
     * Settings からの部分 Configuration 更新を適用し、必要な場合だけ remote check を行う。
     */
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
            val resources = recoveryService.inspectWorkoutRecoveryResources()
                .filter { it.inspection.optString("health") == "broken" }
                .sortedBy { it.source.path }
            val array = JSONArray()
            resources.forEach { resource ->
                val revision = recoveryService.sourceRevision(resource.source)
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
        val resolved = recoveryService.resolveResourceForRead(resourceKey)
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
            .put("capabilities", recoveryService.capabilitiesJson(eligible))
            .put("draft", recoveryDraftStore.load("WORKOUT", resolved.source.path, recoveryService.sourceRevision(resolved.source)))
        sendJson(output, 200, okJson(detail.toString()))
    }

    private fun sendRecoverySource(output: OutputStream, resourceKey: String) {
        val resolved = recoveryService.resolveResourceForRead(resourceKey)
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
            .put("revision", recoveryService.sourceRevision(resolved.source))
            .put("resourceType", "WORKOUT")
            .put("content", resolved.source.content)
            .put("readOnly", true)
        sendJson(output, 200, okJson(source.toString()))
    }

    private fun sendRecoveryDraft(output: OutputStream, resourceKey: String) {
        val resolved = recoveryService.resolveResourceForRead(resourceKey)
        if (resolved == null) {
            sendJson(output, 404, failJson("RECOVERY_RESOURCE_NOT_FOUND", "Recovery Resource was not found."))
            return
        }
        sendJson(output, 200, okJson(recoveryDraftStore.load("WORKOUT", resolved.source.path, recoveryService.sourceRevision(resolved.source)).toString()))
    }

    private fun sendRecoveryDraftCreate(output: OutputStream, resourceKey: String) {
        val resolved = recoveryService.resolveResource(resourceKey)
        if (resolved == null) {
            sendJson(output, 404, failJson("RECOVERY_RESOURCE_NOT_FOUND", "Recovery Resource was not found."))
            return
        }
        val snapshot = recoveryService.createWorkoutDraft(resolved.source, resolved.inspection.optString("health") == "broken")
        val errors = snapshot.optJSONArray("errors") ?: JSONArray()
        if (errors.length() > 0) {
            val first = errors.getJSONObject(0)
            sendJson(output, recoveryStatusCode(first.optString("code")), responseJson(false, "null", errors))
        } else {
            sendJson(output, 200, okJson(snapshot.remove("errors").let { snapshot.toString() }))
        }
    }

    private fun sendRecoveryDraftUpdate(output: OutputStream, resourceKey: String, body: String) {
        val resolved = recoveryService.resolveResource(resourceKey)
        if (resolved == null) {
            sendJson(output, 404, failJson("RECOVERY_RESOURCE_NOT_FOUND", "Recovery Resource was not found."))
            return
        }
        val request = runCatching { JSONObject(body.ifBlank { "{}" }) }.getOrElse {
            sendJson(output, 400, failJson("COMMON_INVALID_REQUEST", "Recovery Draft update request is invalid."))
            return
        }
        val existing = recoveryDraftStore.load("WORKOUT", resolved.source.path, recoveryService.sourceRevision(resolved.source))
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
        val resolved = recoveryService.resolveResource(resourceKey)
        if (resolved == null) {
            sendJson(output, 404, failJson("RECOVERY_RESOURCE_NOT_FOUND", "Recovery Resource was not found."))
            return
        }
        recoveryDraftStore.delete("WORKOUT", resolved.source.path, recoveryService.sourceRevision(resolved.source))
        sendJson(output, 200, okJson(JSONObject().put("state", "none").put("draft", JSONObject.NULL).toString()))
    }

    private fun sendRecoveryValidation(output: OutputStream, resourceKey: String) {
        val result = recoveryService.validateDraft(resourceKey)
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
            val resources = recoveryService.inspectWorkoutRecoveryResources()
            val resolved = resources.firstOrNull { it.resourceKey == resourceKey }
            if (resolved == null) {
                val staleSource = resources.firstOrNull {
                    recoveryService.resourceKey(configuration, "WORKOUT", it.source.path, expectedSourceRevision) == resourceKey
                }
                if (staleSource != null && recoveryService.sourceRevision(staleSource.source) != expectedSourceRevision) {
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
            if (recoveryService.sourceRevision(resolved.source) != expectedSourceRevision) {
                sendJson(output, 409, failJson("RECOVERY_WRITE_CONFLICT", "Recovery source revision is stale."))
                return
            }

            val snapshot = recoveryDraftStore.load("WORKOUT", resolved.source.path, recoveryService.sourceRevision(resolved.source))
            val draft = snapshot.optJSONObject("draft")
            if (snapshot.optString("state") != "active" || draft == null) {
                sendJson(output, 409, failJson("RECOVERY_DRAFT_REQUIRED", "Recovery Draft is required."))
                return
            }
            if (draft.optInt("draftRevision") != expectedDraftRevision) {
                sendJson(output, 409, failJson("RECOVERY_DRAFT_CONFLICT", "Recovery Draft was updated elsewhere."))
                return
            }

            val validationResult = recoveryService.validateDraft(resourceKey)
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

            val replacementContent = recoveryService.buildCandidateContent(draft)
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
                .put("sourceRevision", recoveryService.sourceRevision(resolved.source))
                .put("replacementPath", push.replacementPath)
                .put("replacementRevision", push.replacementRevision)
                .put("commitRevision", push.commitRevision)
                .put("pathChange", validation.opt("pathChange") ?: JSONObject.NULL)
                .put("reflection", reflection)

            if (reflection.optBoolean("succeeded")) {
                recoveryDraftStore.delete("WORKOUT", resolved.source.path, recoveryService.sourceRevision(resolved.source))
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
        val machineMaster = MasterDocument("MACHINE_MASTER", machine.path, recoveryService.sourceRevision(machine), machine.content)
        val gymMaster = MasterDocument("GYM_MASTER", gym.path, recoveryService.sourceRevision(gym), gym.content)
        val committed = fetched.workoutFiles.firstOrNull { it.path == replacementPath && recoveryService.sourceRevision(it) == replacementRevision }
            ?: return recoveryReflectionJson(false, JSONObject.NULL, errorsArray("RECOVERY_REFLECTION_FAILED", "Recovered resource revision is not reflected at the Recovery commit."), JSONArray())
        val inspection = recoveryService.inspectWorkoutResource(committed, machineMaster, gymMaster)
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

    /**
     * GitHub source を取得して Runtime Data を再構築し、local current snapshot へ保存する。
     *
     * remote retrieval または validation に失敗しても既存 Runtime Data があれば degraded として継続し、
     * Runtime Data がない場合だけ unavailable として返す。
     */
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

    /**
     * Android APK 内で Windows と同じ Runtime build 意味論を実行する。
     */
    private fun fetchRuntimeWorkoutData(): RuntimeBuildResult {
        // Android mirrors the Windows runtime builder contract in-place so packaged APKs can sync
        // without a shared .NET runtime dependency.
        val configuration = JSONObject(loadConfigurationJson())
        val workoutFiles = configuredResourceFetcher.fetchWorkoutResources(configuration)
        val machineMaster = masterWriteService.readMasterDocumentFromGithub(configuration, "MACHINE_MASTER")
        val gymMaster = masterWriteService.readMasterDocumentFromGithub(configuration, "GYM_MASTER")
        return runtimeDataBuilder.buildRuntimeDataPayload(workoutFiles, machineMaster, gymMaster)
    }

    private fun appendJsonArray(target: JSONArray, source: JSONArray) {
        for (index in 0 until source.length()) {
            target.put(source.get(index))
        }
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







