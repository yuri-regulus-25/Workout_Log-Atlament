package jp.yuri_regulus_25.atlament

import android.database.sqlite.SQLiteDatabase
import java.io.File

internal class AndroidAfLogStore(
    private val logDatabaseFile: File
) {
    fun initialize() {
        logDatabaseFile.parentFile?.mkdirs()
        SQLiteDatabase.openOrCreateDatabase(logDatabaseFile, null).use { database ->
            database.execSQL(
                """
                CREATE TABLE IF NOT EXISTS af_log (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    level TEXT NOT NULL,
                    message TEXT NOT NULL
                )
                """.trimIndent()
            )
        }
    }

    fun write(level: String, message: String) {
        runCatching {
            logDatabaseFile.parentFile?.mkdirs()
            SQLiteDatabase.openOrCreateDatabase(logDatabaseFile, null).use { database ->
                database.execSQL(
                    "INSERT INTO af_log(level, message) VALUES(?, ?)",
                    arrayOf(level, message)
                )
            }
        }
    }
}
