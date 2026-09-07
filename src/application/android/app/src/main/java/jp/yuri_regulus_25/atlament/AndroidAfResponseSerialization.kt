package jp.yuri_regulus_25.atlament

import org.json.JSONArray
import org.json.JSONObject

internal fun failJson(code: String, message: String): String = """
    {
      "success": false,
      "errors": ${errorsJson(code, message)},
      "warnings": [],
      "data": null
    }
""".trimIndent()

internal fun responseJson(success: Boolean, dataJson: String, errors: JSONArray, warnings: JSONArray = JSONArray()): String = """
    {
      "success": $success,
      "errors": ${errors.toString()},
      "warnings": ${warnings.toString()},
      "data": $dataJson
    }
""".trimIndent()

internal fun errorsJson(code: String, message: String): String =
    errorsArray(code, message).toString()

internal fun errorsArray(code: String, message: String): JSONArray =
    JSONArray().put(errorJson(code, message))

internal fun errorJson(code: String, message: String): JSONObject =
    JSONObject()
        .put("code", code)
        .put("message", message)
        .put("recoverable", true)
