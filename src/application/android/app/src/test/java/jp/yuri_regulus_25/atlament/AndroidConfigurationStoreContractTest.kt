package jp.yuri_regulus_25.atlament

import java.io.File
import kotlin.test.Test
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class AndroidConfigurationStoreContractTest {
    @Test
    fun keepsDefaultConfigurationAndAtomicSaveOutOfServerRouting() {
        val store = File("src/main/java/jp/yuri_regulus_25/atlament/AndroidConfigurationStore.kt").readText()
        val server = File("src/main/java/jp/yuri_regulus_25/atlament/AndroidLocalhostServer.kt").readText()

        assertTrue(store.contains("\"schemaVersion\": 1"))
        assertTrue(store.contains("\"type\": \"WORKOUT\""))
        assertTrue(store.contains("\"type\": \"MACHINE_MASTER\""))
        assertTrue(store.contains("\"type\": \"GYM_MASTER\""))
        assertTrue(store.contains("configurationFile.name + \".tmp\""))
        assertTrue(store.contains("CONFIG_SAVE_FAILED"))
        assertTrue(server.contains("configurationStore.loadJson()"))
        assertTrue(server.contains("configurationStore.saveAtomically"))
        assertFalse(server.contains("private fun defaultConfigurationJson"))
        assertFalse(server.contains("private fun saveConfigurationAtomically"))
    }

    @Test
    fun keepsPartialConfigurationMergeSemanticsInConfigurationStore() {
        val store = File("src/main/java/jp/yuri_regulus_25/atlament/AndroidConfigurationStore.kt").readText()

        assertTrue(store.contains("update.optJSONObject(\"repository\")"))
        assertTrue(store.contains("if (!patch.isNull(key)) repository.put(key, patch.get(key))"))
        assertTrue(store.contains("update.optJSONArray(\"resources\")"))
        assertTrue(store.contains("update.optJSONObject(\"timeouts\")"))
    }
}
