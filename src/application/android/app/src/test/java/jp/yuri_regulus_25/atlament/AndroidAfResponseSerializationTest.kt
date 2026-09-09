package jp.yuri_regulus_25.atlament

import java.io.File
import kotlin.test.Test
import kotlin.test.assertTrue

class AndroidAfResponseSerializationTest {
    @Test
    fun buildsFailureEnvelopeWithRecoverableErrorAndEmptyWarnings() {
        val source = responseSerializationSource()

        assertTrue(source.contains("\"success\": false"))
        assertTrue(source.contains("\"errors\": ${'$'}{errorsJson(code, message)}"))
        assertTrue(source.contains("\"warnings\": []"))
        assertTrue(source.contains("\"data\": null"))
        assertTrue(source.contains(".put(\"recoverable\", true)"))
    }

    @Test
    fun buildsResponseEnvelopeWithDataErrorsAndWarnings() {
        val source = responseSerializationSource()

        assertTrue(source.contains("internal fun responseJson(success: Boolean, dataJson: String, errors: JSONArray, warnings: JSONArray = JSONArray())"))
        assertTrue(source.contains("\"success\": ${'$'}success"))
        assertTrue(source.contains("\"errors\": ${'$'}{errors.toString()}"))
        assertTrue(source.contains("\"warnings\": ${'$'}{warnings.toString()}"))
        assertTrue(source.contains("\"data\": ${'$'}dataJson"))
    }

    @Test
    fun buildsSuccessEnvelopeForSharedServerAndServices() {
        val source = responseSerializationSource()

        assertTrue(source.contains("internal fun okJson(dataJson: String, errorsJson: String = \"[]\", warningsJson: String = \"[]\")"))
        assertTrue(source.contains("\"success\": true"))
        assertTrue(source.contains("\"errors\": ${'$'}errorsJson"))
        assertTrue(source.contains("\"warnings\": ${'$'}warningsJson"))
        assertTrue(source.contains("\"data\": ${'$'}dataJson"))
    }

    private fun responseSerializationSource(): String =
        File("src/main/java/jp/yuri_regulus_25/atlament/AndroidAfResponseSerialization.kt").readText()
}
