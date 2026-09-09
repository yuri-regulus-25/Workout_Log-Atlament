package jp.yuri_regulus_25.atlament

import java.io.File
import kotlin.test.Test
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class AndroidRuntimeDataBuilderContractTest {
    @Test
    fun keepsRuntimePayloadConstructionOutOfServerRouting() {
        val builder = File("src/main/java/jp/yuri_regulus_25/atlament/AndroidRuntimeDataBuilder.kt").readText()
        val server = File("src/main/java/jp/yuri_regulus_25/atlament/AndroidLocalhostServer.kt").readText()

        assertTrue(builder.contains("class AndroidRuntimeDataBuilder"))
        assertTrue(builder.contains("fun buildRuntimeDataPayload("))
        assertTrue(builder.contains("private fun parseMachineMaster"))
        assertTrue(builder.contains("private fun parseGymMaster"))
        assertTrue(builder.contains("private fun buildSession("))
        assertTrue(builder.contains("private fun buildMachine("))
        assertTrue(builder.contains("duplicate reference key is excluded"))
        assertTrue(builder.contains("androidMasterReferenceWarningCode"))
        assertTrue(builder.contains("androidMasterReferenceResolutionState"))
        assertTrue(builder.indexOf("machines.structuralInvalid || gyms.structuralInvalid") < builder.indexOf("buildSession(file.path"))

        assertTrue(server.contains("private val runtimeDataBuilder = AndroidRuntimeDataBuilder()"))
        assertTrue(server.contains("runtimeDataBuilder.buildRuntimeDataPayload"))
        assertFalse(server.contains("private fun buildRuntimeDataPayload("))
        assertFalse(server.contains("private fun parseMachineMaster"))
        assertFalse(server.contains("private fun buildSession("))
        assertFalse(server.contains("private data class MasterRecordCatalog"))
    }
}
