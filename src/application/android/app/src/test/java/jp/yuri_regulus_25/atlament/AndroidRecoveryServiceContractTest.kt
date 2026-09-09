package jp.yuri_regulus_25.atlament

import java.io.File
import kotlin.test.Test
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class AndroidRecoveryServiceContractTest {
    @Test
    fun keepsRecoveryInspectionDraftValidationAndCandidateBuildingOutOfServerRouting() {
        val service = File("src/main/java/jp/yuri_regulus_25/atlament/AndroidRecoveryService.kt").readText()
        val server = File("src/main/java/jp/yuri_regulus_25/atlament/AndroidLocalhostServer.kt").readText()

        assertTrue(service.contains("internal class AndroidRecoveryService"))
        assertTrue(service.contains("fun inspectWorkoutRecoveryResources(): List<RecoveryResource>"))
        assertTrue(service.contains("fun resolveResourceForRead(resourceKey: String): RecoveryResource?"))
        assertTrue(service.contains("fun validateDraft(resourceKey: String): JSONObject"))
        assertTrue(service.contains("fun createWorkoutDraft(source: RuntimeSourceFile, broken: Boolean): JSONObject"))
        assertTrue(service.contains("fun buildCandidateContent(draft: JSONObject): String"))
        assertTrue(service.contains("fun determineReplacementPath(sourcePath: String, candidateContent: String): String"))
        assertTrue(service.contains("RECOVERY_FIELD_UNRESOLVED"))
        assertTrue(service.contains("RECOVERY_DUPLICATE_SESSION_ID"))
        assertTrue(service.contains("androidRecoveryWorkoutFieldOrder"))

        assertTrue(server.contains("private val recoveryService by lazy"))
        assertTrue(server.contains("recoveryService.inspectWorkoutRecoveryResources()"))
        assertTrue(server.contains("recoveryService.resolveResourceForRead"))
        assertTrue(server.contains("recoveryService.validateDraft"))
        assertFalse(server.contains("private fun extractWorkoutRecoveryFields"))
        assertFalse(server.contains("private fun buildRecoveryCandidateContent"))
        assertFalse(server.contains("private fun determineReplacementPath"))
        assertFalse(server.contains("private fun resourceIssuesFromErrors"))
    }
}
