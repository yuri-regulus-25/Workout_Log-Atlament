package jp.yuri_regulus_25.atlament

import java.io.File
import kotlin.test.Test
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class AndroidConfiguredResourceFetcherContractTest {
    @Test
    fun keepsConfiguredResourceTraversalOutOfServerRouting() {
        val fetcher = File("src/main/java/jp/yuri_regulus_25/atlament/AndroidConfiguredResourceFetcher.kt").readText()
        val models = File("src/main/java/jp/yuri_regulus_25/atlament/AndroidAfModels.kt").readText()
        val server = File("src/main/java/jp/yuri_regulus_25/atlament/AndroidLocalhostServer.kt").readText()

        assertTrue(fetcher.contains("internal class AndroidConfiguredResourceFetcher"))
        assertTrue(fetcher.contains("fun fetchWorkoutResources(configuration: JSONObject): List<RuntimeSourceFile>"))
        assertTrue(fetcher.contains("fun fetchAll(configuration: JSONObject): RuntimeFetchedResources"))
        assertTrue(fetcher.contains("fun isAllowedRecoveryWorkoutPath(configuration: JSONObject, path: String): Boolean"))
        assertTrue(fetcher.contains("githubClient.fetchDirectoryFiles"))
        assertTrue(fetcher.contains("githubClient.fetchRawRuntimeFile"))
        assertTrue(fetcher.contains("resourceKind\", \"file\") == \"directory\""))
        assertTrue(fetcher.contains("AfException(\"CONFIG_INVALID\""))
        assertTrue(models.contains("internal data class RuntimeFetchedResources"))

        assertTrue(server.contains("private val configuredResourceFetcher = AndroidConfiguredResourceFetcher"))
        assertTrue(server.contains("configuredResourceFetcher.fetchWorkoutResources"))
        assertTrue(server.contains("configuredResourceFetcher.fetchAll"))
        assertTrue(server.contains("configuredResourceFetcher.isAllowedRecoveryWorkoutPath"))
        assertFalse(server.contains("private fun fetchConfiguredWorkoutResources"))
        assertFalse(server.contains("private fun fetchConfiguredResources"))
        assertFalse(server.contains("private data class RuntimeFetchedResources"))
        assertFalse(server.contains("private fun isJsonRuntimePath"))
    }
}
