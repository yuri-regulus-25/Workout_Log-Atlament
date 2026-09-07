package jp.yuri_regulus_25.atlament

import java.io.File
import kotlin.test.Test
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class AndroidAssetServerContractTest {
    @Test
    fun keepsAssetRoutingAndErrorPagesOutOfLocalhostServerRouting() {
        val assetServer = File("src/main/java/jp/yuri_regulus_25/atlament/AndroidAssetServer.kt").readText()
        val localhostServer = File("src/main/java/jp/yuri_regulus_25/atlament/AndroidLocalhostServer.kt").readText()

        assertTrue(assetServer.contains("frontend/index.html"))
        assertTrue(assetServer.contains("frontend/404.html"))
        assertTrue(assetServer.contains("frontend/500.html"))
        assertTrue(assetServer.contains("frontend/503.html"))
        assertTrue(assetServer.contains("\"workouts\" -> normalized.matches"))
        assertTrue(assetServer.contains("\"machines\" -> normalized.matches"))
        assertTrue(assetServer.contains("\"text/css; charset=utf-8\""))
        assertTrue(localhostServer.contains("assetServer.serve(client.getOutputStream(), path)"))
        assertFalse(localhostServer.contains("private fun resolveAssetPath"))
        assertFalse(localhostServer.contains("private fun isDefinedMpaRoute"))
        assertFalse(localhostServer.contains("private fun contentType"))
    }
}
