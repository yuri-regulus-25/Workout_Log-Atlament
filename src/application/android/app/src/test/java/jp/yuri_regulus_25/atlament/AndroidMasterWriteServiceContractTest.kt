package jp.yuri_regulus_25.atlament

import java.io.File
import kotlin.test.Test
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class AndroidMasterWriteServiceContractTest {
    @Test
    fun keepsMasterWriteAndValidationOutOfServerRouting() {
        val service = File("src/main/java/jp/yuri_regulus_25/atlament/AndroidMasterWriteService.kt").readText()
        val server = File("src/main/java/jp/yuri_regulus_25/atlament/AndroidLocalhostServer.kt").readText()
        val models = File("src/main/java/jp/yuri_regulus_25/atlament/AndroidAfModels.kt").readText()

        assertTrue(service.contains("internal class AndroidMasterWriteService"))
        assertTrue(service.contains("fun boundaryJson(): String"))
        assertTrue(service.contains("fun documentResponse(type: String): SyncResponse"))
        assertTrue(service.contains("fun documentWriteResponse(type: String, body: String): SyncResponse"))
        assertTrue(service.contains("fun unresolvedReferencesResponse(): SyncResponse"))
        assertTrue(service.contains("fun readMasterDocumentFromGithub(configuration: JSONObject, type: String): MasterDocument"))
        assertTrue(service.contains("Configured Main Gym cannot be cleared."))
        assertTrue(service.contains("Duplicate machine_id"))
        assertTrue(service.contains("Duplicate gym_id"))
        assertTrue(service.contains("MASTER_REFERENCE_MISSING"))
        assertTrue(service.contains("MASTER_REFERENCE_DELETED"))
        assertTrue(models.contains("internal data class SyncResponse"))

        assertTrue(server.contains("private val masterWriteService by lazy"))
        assertTrue(server.contains("masterWriteService.boundaryJson()"))
        assertTrue(server.contains("masterWriteService.documentResponse"))
        assertTrue(server.contains("masterWriteService.documentWriteResponse"))
        assertTrue(server.contains("masterWriteService.unresolvedReferencesResponse()"))
        assertTrue(server.contains("masterWriteService.readMasterDocumentFromGithub"))
        assertFalse(server.contains("private fun validateMasterWrite"))
        assertFalse(server.contains("private fun validateMachineMasterDocument"))
        assertFalse(server.contains("private fun validateGymMasterDocument"))
        assertFalse(server.contains("private fun buildUnresolvedReferences"))
        assertFalse(server.contains("private data class MasterWriteTarget"))
    }
}
