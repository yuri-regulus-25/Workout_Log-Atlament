package jp.yuri_regulus_25.atlament

import org.json.JSONArray

internal data class RuntimeSourceFile(val path: String, val content: String, val revision: String? = null)

internal data class RuntimeBuildResult(val payload: String?, val errors: JSONArray, val warnings: JSONArray)

internal data class MasterDocument(val type: String, val path: String, val revision: String, val content: String)
