package jp.yuri_regulus_25.atlament

import java.io.File
import kotlin.test.Test
import kotlin.test.assertTrue

class AndroidCredentialStoreContractTest {
    @Test
    fun keepsCredentialPersistenceBackedByAndroidKeystoreAndSharedPreferences() {
        val source = File("src/main/java/jp/yuri_regulus_25/atlament/AndroidCredentialStore.kt").readText()

        assertTrue(source.contains("atlament_secure_credential"))
        assertTrue(source.contains("atlament_github_token"))
        assertTrue(source.contains("github_token_ciphertext"))
        assertTrue(source.contains("github_token_iv"))
        assertTrue(source.contains("github_token_limit_date"))
        assertTrue(source.contains("AES/GCM/NoPadding"))
        assertTrue(source.contains("AndroidKeyStore"))
    }

    @Test
    fun keepsCredentialStateAndInvalidLimitDateContractOutOfServerRouting() {
        val store = File("src/main/java/jp/yuri_regulus_25/atlament/AndroidCredentialStore.kt").readText()
        val server = File("src/main/java/jp/yuri_regulus_25/atlament/AndroidLocalhostServer.kt").readText()

        assertTrue(store.contains("return \"missing\""))
        assertTrue(store.contains("return \"invalid\""))
        assertTrue(store.contains("return \"expired\""))
        assertTrue(store.contains("return \"available\""))
        assertTrue(store.contains("LocalDate.parse(limitDate)"))
        assertTrue(server.contains("credentialStore.updateResultJson(updateJson)"))
        assertTrue(server.contains("credentialStore.readToken()"))
    }
}
