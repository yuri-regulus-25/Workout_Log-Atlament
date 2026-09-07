package jp.yuri_regulus_25.atlament

import java.io.File
import kotlin.test.Test
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class AndroidRecoveryDraftStoreContractTest {
    @Test
    fun keepsRecoveryDraftPersistenceAndStateClassificationOutOfServerRouting() {
        val store = File("src/main/java/jp/yuri_regulus_25/atlament/AndroidRecoveryDraftStore.kt").readText()
        val server = File("src/main/java/jp/yuri_regulus_25/atlament/AndroidLocalhostServer.kt").readText()
        val recovery = File("src/main/java/jp/yuri_regulus_25/atlament/AndroidRecoveryService.kt").readText()

        assertTrue(store.contains("class AndroidRecoveryDraftStore"))
        assertTrue(store.contains("fun countActive()"))
        assertTrue(store.contains("fun load(resourceType: String, sourcePath: String, currentSourceRevision: String)"))
        assertTrue(store.contains("fun findByResourceKey("))
        assertTrue(store.contains("fun save(draft: JSONObject): JSONArray"))
        assertTrue(store.contains("fun delete(resourceType: String, sourcePath: String, currentSourceRevision: String)"))
        assertTrue(store.contains("state\", \"none"))
        assertTrue(store.contains("else -> \"active\""))
        assertTrue(store.contains("-> \"stale\""))
        assertTrue(store.contains("-> \"incompatible\""))
        assertTrue(store.contains("state\", \"corrupted"))
        assertTrue(store.contains("RECOVERY_DRAFT_SAVE_FAILED"))
        assertTrue(store.contains("path.name + \".tmp\""))

        assertTrue(server.contains("private val recoveryDraftStore = AndroidRecoveryDraftStore"))
        assertTrue(server.contains("recoveryDraftStore.countActive()"))
        assertTrue(server.contains("recoveryDraftStore.load"))
        assertTrue(server.contains("recoveryDraftStore.save"))
        assertTrue(server.contains("recoveryDraftStore.delete"))
        assertTrue(recovery.contains("recoveryDraftStore.findByResourceKey(configuration, resourceKey, ::resourceKey)"))
        assertFalse(server.contains("private fun activeRecoveryDraftCount"))
        assertFalse(server.contains("private fun recoveryDraftFileName"))
        assertFalse(server.contains("private fun saveRecoveryDraft"))
        assertFalse(server.contains("private fun loadRecoveryDraft"))
        assertFalse(server.contains("private fun findRecoveryDraftByResourceKey"))
    }
}
