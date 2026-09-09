package jp.yuri_regulus_25.atlament

import android.content.Context
import android.content.SharedPreferences
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import java.nio.charset.StandardCharsets
import java.security.KeyStore
import java.time.LocalDate
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec
import org.json.JSONObject

internal class AndroidCredentialStore(context: Context) {
    private val preferences: SharedPreferences = context.getSharedPreferences("atlament_secure_credential", Context.MODE_PRIVATE)
    private val keyAlias = "atlament_github_token"
    private val ciphertextKey = "github_token_ciphertext"
    private val ivKey = "github_token_iv"
    private val limitDateKey = "github_token_limit_date"

    fun statusJson(): String = statusJsonFor(state())

    fun updateResultJson(updateJson: String): String {
        val currentToken = readToken()
        val update = if (updateJson.isBlank()) JSONObject() else JSONObject(updateJson)
        val token = update.optString("token", "").trim().ifEmpty { currentToken }
        val limitDate = if (update.has("limitDate") && !update.isNull("limitDate")) {
            update.optString("limitDate", "").trim().ifEmpty { null }
        } else {
            null
        }

        if (!limitDate.isNullOrBlank() && runCatching { LocalDate.parse(limitDate) }.isFailure) {
            return statusJsonFor("invalid", configured = hasEncryptedCredential(), limitDate = limitDate)
        }
        if (token.isNullOrBlank()) {
            return statusJson()
        }

        writeToken(token, limitDate)
        return statusJsonFor(state(), configured = true, limitDate = limitDate)
    }

    fun componentStatus(): String = if (state() == "available") "available" else "unavailable"

    fun state(): String {
        if (!hasEncryptedCredential()) return "missing"
        if (readToken().isNullOrBlank()) return "invalid"
        val limitDate = preferences.getString(limitDateKey, null)
        if (!limitDate.isNullOrBlank()) {
            val parsed = runCatching { LocalDate.parse(limitDate) }.getOrNull() ?: return "invalid"
            if (parsed < LocalDate.now()) return "expired"
        }
        return "available"
    }

    fun readToken(): String? = runCatching {
        val ciphertext = preferences.getString(ciphertextKey, null) ?: return null
        val iv = preferences.getString(ivKey, null) ?: return null
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.DECRYPT_MODE, getCredentialKey(), GCMParameterSpec(128, Base64.decode(iv, Base64.NO_WRAP)))
        String(cipher.doFinal(Base64.decode(ciphertext, Base64.NO_WRAP)), StandardCharsets.UTF_8)
    }.getOrNull()

    private fun statusJsonFor(
        state: String,
        configured: Boolean = hasEncryptedCredential(),
        limitDate: String? = preferences.getString(limitDateKey, null)
    ): String {
        val limitDateJson = limitDate?.let { "\"$it\"" } ?: "null"
        return """
            {
              "configured": $configured,
              "state": "$state",
              "limitDate": $limitDateJson
            }
        """.trimIndent()
    }

    private fun hasEncryptedCredential(): Boolean =
        !preferences.getString(ciphertextKey, null).isNullOrBlank() &&
            !preferences.getString(ivKey, null).isNullOrBlank()

    private fun writeToken(token: String, limitDate: String?) {
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, getCredentialKey())
        val encrypted = cipher.doFinal(token.toByteArray(StandardCharsets.UTF_8))
        preferences.edit()
            .putString(ciphertextKey, Base64.encodeToString(encrypted, Base64.NO_WRAP))
            .putString(ivKey, Base64.encodeToString(cipher.iv, Base64.NO_WRAP))
            .apply {
                if (limitDate.isNullOrBlank()) remove(limitDateKey) else putString(limitDateKey, limitDate)
            }
            .apply()
    }

    private fun getCredentialKey(): SecretKey {
        val keyStore = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        (keyStore.getEntry(keyAlias, null) as? KeyStore.SecretKeyEntry)?.secretKey?.let { return it }

        val generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore")
        val spec = KeyGenParameterSpec.Builder(
            keyAlias,
            KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
        )
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setRandomizedEncryptionRequired(true)
            .build()
        generator.init(spec)
        return generator.generateKey()
    }
}
