package jp.yuri_regulus_25.atlament

import java.io.File
import kotlin.test.Test
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class AndroidAfLogStoreContractTest {
    @Test
    fun keepsAfLogPersistenceOutOfServerRouting() {
        val store = File("src/main/java/jp/yuri_regulus_25/atlament/AndroidAfLogStore.kt").readText()
        val server = File("src/main/java/jp/yuri_regulus_25/atlament/AndroidLocalhostServer.kt").readText()

        assertTrue(store.contains("internal class AndroidAfLogStore"))
        assertTrue(store.contains("fun initialize()"))
        assertTrue(store.contains("CREATE TABLE IF NOT EXISTS af_log"))
        assertTrue(store.contains("created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP"))
        assertTrue(store.contains("fun write(level: String, message: String)"))
        assertTrue(store.contains("INSERT INTO af_log(level, message) VALUES(?, ?)"))

        assertTrue(server.contains("private val afLogStore = AndroidAfLogStore(logDatabaseFile)"))
        assertTrue(server.contains("afLogStore.initialize()"))
        assertTrue(server.contains("afLogStore.write("))
        assertFalse(server.contains("private fun initializeLog"))
        assertFalse(server.contains("private fun writeLog"))
        assertFalse(server.contains("SQLiteDatabase"))
    }
}
