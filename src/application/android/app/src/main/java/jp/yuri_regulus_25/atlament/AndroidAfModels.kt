package jp.yuri_regulus_25.atlament

import org.json.JSONArray

internal data class RuntimeSourceFile(val path: String, val content: String, val revision: String? = null)

internal data class RuntimeBuildResult(val payload: String?, val errors: JSONArray, val warnings: JSONArray)

internal data class RuntimeFetchedResources(
    val workoutFiles: List<RuntimeSourceFile>,
    val machineMaster: RuntimeSourceFile?,
    val gymMaster: RuntimeSourceFile?
)

internal data class MasterDocument(val type: String, val path: String, val revision: String, val content: String)

internal data class GithubContent(val revision: String, val content: String)

internal data class RecoveryGitWriteResult(val replacementPath: String, val replacementRevision: String, val commitRevision: String)
