package jp.yuri_regulus_25.atlament

import java.io.File
import kotlin.test.Test
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class AndroidRuntimeDataStoreContractTest {
    @Test
    fun keepsRuntimeDataPersistenceOutOfServerRouting() {
        val store = File("src/main/java/jp/yuri_regulus_25/atlament/AndroidRuntimeDataStore.kt").readText()
        val server = File("src/main/java/jp/yuri_regulus_25/atlament/AndroidLocalhostServer.kt").readText()

        assertTrue(store.contains("internal class AndroidRuntimeDataStore"))
        assertTrue(store.contains("fun exists(): Boolean"))
        assertTrue(store.contains("fun status(): String"))
        assertTrue(store.contains("fun saveAtomically(payload: String): JSONArray"))
        assertTrue(store.contains("runtimeDataFile.name + \".tmp\""))
        assertTrue(store.contains("runtimeDataFile.name + \".bak\""))
        assertTrue(store.contains("RUNTIME_DATA_SAVE_FAILED"))
        assertTrue(store.contains("hasRetainedErrors"))

        assertTrue(server.contains("private val runtimeDataStore = AndroidRuntimeDataStore"))
        assertTrue(server.contains("runtimeDataStore.status()"))
        assertTrue(server.contains("runtimeDataStore.saveAtomically"))
        assertTrue(server.contains("runtimeDataStore.readText()"))
        assertFalse(server.contains("private fun saveRuntimeDataAtomically"))
        assertFalse(server.contains("private fun runtimeDataStatus"))
    }
}
