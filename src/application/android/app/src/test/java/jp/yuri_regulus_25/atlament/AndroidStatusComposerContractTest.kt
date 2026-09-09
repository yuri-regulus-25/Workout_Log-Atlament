package jp.yuri_regulus_25.atlament

import java.io.File
import kotlin.test.Test
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class AndroidStatusComposerContractTest {
    @Test
    fun keepsStatusReadinessCompositionOutOfServerRouting() {
        val composer = File("src/main/java/jp/yuri_regulus_25/atlament/AndroidStatusComposer.kt").readText()
        val server = File("src/main/java/jp/yuri_regulus_25/atlament/AndroidLocalhostServer.kt").readText()

        assertTrue(composer.contains("internal class AndroidStatusComposer"))
        assertTrue(composer.contains("internal data class AndroidStatusSnapshot"))
        assertTrue(composer.contains("fun statusJson(snapshot: AndroidStatusSnapshot): String"))
        assertTrue(composer.contains("\"requiredActions\""))
        assertTrue(composer.contains("\"unavailableComponents\""))
        assertTrue(composer.contains("\"degradedComponents\""))
        assertTrue(composer.contains("CONFIGURATION_REQUIRED"))
        assertTrue(composer.contains("CREDENTIAL_REQUIRED"))
        assertTrue(composer.contains("RUNTIME_DATA_REQUIRED"))

        assertTrue(server.contains("private val statusComposer = AndroidStatusComposer()"))
        assertTrue(server.contains("AndroidStatusSnapshot("))
        assertTrue(server.contains("statusComposer.statusJson"))
        assertFalse(server.contains("private fun applicationStatus"))
        assertFalse(server.contains("private fun readinessJson"))
        assertFalse(server.contains("private fun requiredActionsJson"))
        assertFalse(server.contains("private fun requiredActionNames"))
    }
}
