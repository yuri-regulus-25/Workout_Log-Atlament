package jp.yuri_regulus_25.atlament

internal data class AndroidOperationSnapshot(
    val startup: String,
    val manualSync: String,
    val configurationUpdate: String,
    val credentialUpdate: String,
    val shutdown: String,
    val recoveryCommitRunning: Boolean
)

internal class AndroidOperationGate {
    private val lock = Object()
    private val exclusiveOperations = setOf("startup", "manualSync", "configurationUpdate", "credentialUpdate", "recoveryCommit")

    @Volatile private var startupSyncStatus = "idle"
    @Volatile private var manualSyncStatus = "idle"
    @Volatile private var configurationUpdateStatus = "idle"
    @Volatile private var credentialUpdateStatus = "idle"
    @Volatile private var recoveryCommitRunning = false
    @Volatile private var shutdownStatus = "idle"

    fun tryStart(name: String): Boolean = synchronized(lock) {
        if (shutdownStatus == "running" && name != "shutdown") return@synchronized false
        if (name in exclusiveOperations && anyExclusiveRunning()) return@synchronized false
        when (name) {
            "startup" -> startupSyncStatus = "running"
            "manualSync" -> manualSyncStatus = "running"
            "configurationUpdate" -> configurationUpdateStatus = "running"
            "credentialUpdate" -> credentialUpdateStatus = "running"
            "recoveryCommit" -> recoveryCommitRunning = true
            "shutdown" -> {
                if (shutdownStatus == "running") return@synchronized false
                shutdownStatus = "running"
            }
            else -> return@synchronized false
        }
        true
    }

    fun complete(name: String, success: Boolean) = synchronized(lock) {
        val status = if (success) "completed" else "failed"
        when (name) {
            "startup" -> startupSyncStatus = status
            "manualSync" -> manualSyncStatus = status
            "configurationUpdate" -> configurationUpdateStatus = status
            "credentialUpdate" -> credentialUpdateStatus = status
            "recoveryCommit" -> recoveryCommitRunning = false
            "shutdown" -> shutdownStatus = status
        }
    }

    fun snapshot(): AndroidOperationSnapshot = synchronized(lock) {
        AndroidOperationSnapshot(
            startup = startupSyncStatus,
            manualSync = manualSyncStatus,
            configurationUpdate = configurationUpdateStatus,
            credentialUpdate = credentialUpdateStatus,
            shutdown = shutdownStatus,
            recoveryCommitRunning = recoveryCommitRunning
        )
    }

    private fun anyExclusiveRunning(): Boolean =
        startupSyncStatus == "running" ||
            manualSyncStatus == "running" ||
            configurationUpdateStatus == "running" ||
            credentialUpdateStatus == "running" ||
            recoveryCommitRunning
}
