package jp.yuri_regulus_25.atlament

import java.io.File
import kotlin.test.Test
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class AndroidGithubClientContractTest {
    @Test
    fun keepsGithubTransportAndErrorMappingOutOfServerRouting() {
        val client = File("src/main/java/jp/yuri_regulus_25/atlament/AndroidGithubClient.kt").readText()
        val server = File("src/main/java/jp/yuri_regulus_25/atlament/AndroidLocalhostServer.kt").readText()

        assertTrue(client.contains("internal class AndroidGithubClient"))
        assertTrue(client.contains("fun readContentFile("))
        assertTrue(client.contains("fun writeContentFile("))
        assertTrue(client.contains("fun writeRecoveryContentFile("))
        assertTrue(client.contains("fun readBranchHead("))
        assertTrue(client.contains("fun postGraphql("))
        assertTrue(client.contains("fun fetchDirectoryFiles("))
        assertTrue(client.contains("fun fetchRawRuntimeFile("))
        assertTrue(client.contains("private fun httpGet("))
        assertTrue(client.contains("androidMapGithubError(status"))
        assertTrue(client.contains("MASTER_SYNC_REQUIRED"))
        assertTrue(client.contains("RECOVERY_WRITE_CONFLICT"))

        assertTrue(server.contains("private val githubClient = AndroidGithubClient"))
        assertTrue(server.contains("githubClient.readContentFile"))
        assertTrue(server.contains("githubClient.writeContentFile"))
        assertTrue(server.contains("githubClient.writeRecoveryContentFile"))
        assertTrue(server.contains("githubClient.readBranchHead"))
        assertTrue(server.contains("githubClient.postGraphql"))
        assertFalse(server.contains("private fun readGithubContentFile"))
        assertFalse(server.contains("private fun writeGithubContentFile"))
        assertFalse(server.contains("private fun readBranchHead"))
        assertFalse(server.contains("private fun postGithubGraphql"))
        assertFalse(server.contains("private fun httpGet"))
        assertFalse(server.contains("HttpURLConnection"))
    }
}
