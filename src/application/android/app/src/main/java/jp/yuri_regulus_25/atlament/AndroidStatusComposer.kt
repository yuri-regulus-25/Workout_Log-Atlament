package jp.yuri_regulus_25.atlament

import org.json.JSONObject

internal data class AndroidStatusSnapshot(
    val frontendVersion: JSONObject,
    val operations: AndroidOperationSnapshot,
    val runtimeDataFactsJson: String,
    val recoveryStatusFactsJson: String,
    val hostingStatusJson: String,
    val configurationStatus: String,
    val credentialComponentStatus: String,
    val credentialState: String,
    val githubStatus: String,
    val runtimeDataStatus: String,
    val runtimeDataExists: Boolean
)

internal class AndroidStatusComposer {
    fun statusJson(snapshot: AndroidStatusSnapshot): String {
        val requiredActions = requiredActionNames(snapshot)
        val applicationStatus = applicationStatus(snapshot, requiredActions)
        return """
        {
          "success": true,
          "errors": [],
          "data": {
            "versions": {
              "applicationFramework": "${BuildConfig.VERSION_NAME}",
              "frontendFramework": "${snapshot.frontendVersion.optString("frontend", "unknown")}",
              "nativePackages": {
                "windows": {
                  "version": "${snapshot.frontendVersion.optString("windows", "unknown")}"
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
            "readiness": ${readinessJson(snapshot, requiredActions, applicationStatus)},
            "runtimeData": ${snapshot.runtimeDataFactsJson},
            "recovery": ${snapshot.recoveryStatusFactsJson},
            "application": {
              "status": "$applicationStatus",
              "degraded": ${applicationStatus == "degraded"},
              "acceptingRequests": true
            },
            "operations": {
              "startup": "${snapshot.operations.startup}",
              "manualSync": "${snapshot.operations.manualSync}",
              "configurationUpdate": "${snapshot.operations.configurationUpdate}",
              "credentialUpdate": "${snapshot.operations.credentialUpdate}",
              "shutdown": "${snapshot.operations.shutdown}"
            },
            "components": {
              "configuration": "${snapshot.configurationStatus}",
              "credential": "${snapshot.credentialComponentStatus}",
              "github": "${snapshot.githubStatus}",
              "runtimeData": "${snapshot.runtimeDataStatus}",
              "hosting": ${snapshot.hostingStatusJson}
            },
            "requiredActions": ${requiredActionsJson(requiredActions)}
          }
        }
    """.trimIndent()
    }

    private fun applicationStatus(snapshot: AndroidStatusSnapshot, requiredActions: List<String>): String =
        if (snapshot.configurationStatus == "available" && snapshot.runtimeDataStatus == "available" && requiredActions.isEmpty()) "ready" else "degraded"

    private fun readinessJson(snapshot: AndroidStatusSnapshot, requiredActions: List<String>, applicationStatus: String): String {
        val sortedRequiredActions = requiredActions.sorted()
        val unavailableComponents = mutableListOf<String>()
        if (snapshot.configurationStatus == "unavailable") unavailableComponents.add("configuration")
        if (snapshot.credentialComponentStatus == "unavailable") unavailableComponents.add("credential")
        if (snapshot.runtimeDataStatus == "unavailable") unavailableComponents.add("runtimeData")
        val degradedComponents = mutableListOf<String>()
        if (snapshot.githubStatus == "degraded") degradedComponents.add("github")
        val state = when {
            sortedRequiredActions.contains("CONFIGURATION_REQUIRED") || sortedRequiredActions.contains("CREDENTIAL_REQUIRED") -> "unconfigured"
            unavailableComponents.contains("runtimeData") -> "unavailable"
            applicationStatus == "degraded" || degradedComponents.isNotEmpty() || unavailableComponents.isNotEmpty() || sortedRequiredActions.isNotEmpty() -> "degraded"
            else -> "ready"
        }
        return """
            {
              "state": "$state",
              "requiredActions": ${requiredActionsJson(sortedRequiredActions)},
              "unavailableComponents": ${stringListJson(unavailableComponents)},
              "degradedComponents": ${stringListJson(degradedComponents)}
            }
        """.trimIndent()
    }

    private fun requiredActionNames(snapshot: AndroidStatusSnapshot): List<String> {
        val actions = mutableListOf("RUNTIME_DATA_REQUIRED")
        if (snapshot.runtimeDataExists) actions.remove("RUNTIME_DATA_REQUIRED")
        if (snapshot.credentialState == "missing") actions.add(0, "CREDENTIAL_REQUIRED")
        if (snapshot.configurationStatus != "available") actions.add(0, "CONFIGURATION_REQUIRED")
        return actions
    }

    private fun requiredActionsJson(requiredActions: List<String>): String = stringListJson(requiredActions)

    private fun stringListJson(values: List<String>): String =
        values.joinToString(prefix = "[", postfix = "]") { "\"$it\"" }
}
