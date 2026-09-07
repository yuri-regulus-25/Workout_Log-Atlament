package jp.yuri_regulus_25.atlament

import android.content.Context
import java.io.ByteArrayInputStream
import java.io.InputStream
import java.io.OutputStream
import java.nio.charset.StandardCharsets

internal class AndroidAssetServer(private val context: Context) {
    private val appNames = setOf("dashboard", "workouts", "machines", "analytics", "settings", "maintenance")

    fun serve(output: OutputStream, path: String) {
        val assetPath = resolveAssetPath(path)
        if (assetPath == null) {
            sendErrorPage(output, 404)
            return
        }

        try {
            context.assets.open(assetPath).use { stream ->
                sendStream(output, 200, contentType(assetPath), stream)
            }
        } catch (_: java.io.FileNotFoundException) {
            sendErrorPage(output, 404)
        } catch (_: Exception) {
            sendErrorPage(output, 500)
        }
    }

    internal fun resolveAssetPath(path: String): String? {
        val normalized = path.trimStart('/')
        val root = normalized.substringBefore('/')
        return when {
            path == "/" || normalized.isEmpty() -> "frontend/index.html"
            normalized == "error.css" -> "frontend/error.css"
            normalized == "404.html" || normalized == "500.html" || normalized == "503.html" -> "frontend/$normalized"
            normalized.startsWith("android/") -> normalized
            normalized.startsWith("frontend/") -> normalized
            normalized in appNames -> "frontend/$normalized/index.html"
            root in appNames && isDefinedMpaRoute(root, normalized.removePrefix("$root/")) -> definedMpaRouteEntry(root)
            normalized.contains('.') -> "frontend/$normalized"
            else -> null
        }
    }

    private fun definedMpaRouteEntry(app: String): String = when (app) {
        "workouts" -> "frontend/workouts/detail.html"
        else -> "frontend/$app/index.html"
    }

    private fun isDefinedMpaRoute(app: String, route: String): Boolean {
        val normalized = route.trim('/')
        return when (app) {
            "workouts" -> normalized.matches(Regex("""\d{4}-\d{2}-\d{2}"""))
            "machines" -> normalized.matches(Regex("""[A-Za-z0-9][A-Za-z0-9_-]*"""))
            else -> false
        }
    }

    private fun sendErrorPage(output: OutputStream, status: Int) {
        val assetPath = when (status) {
            404 -> "frontend/404.html"
            500 -> "frontend/500.html"
            503 -> "frontend/503.html"
            else -> "frontend/500.html"
        }
        try {
            context.assets.open(assetPath).use { stream ->
                sendStream(output, status, contentType(assetPath), stream)
            }
        } catch (_: Exception) {
            sendText(output, status, "text/plain; charset=utf-8", reason(status))
        }
    }

    private fun sendText(output: OutputStream, status: Int, contentType: String, body: String) {
        sendStream(output, status, contentType, ByteArrayInputStream(body.toByteArray(StandardCharsets.UTF_8)))
    }

    private fun sendStream(output: OutputStream, status: Int, contentType: String, body: InputStream) {
        val bytes = body.readBytes()
        val header = buildString {
            append("HTTP/1.1 ").append(status).append(' ').append(reason(status)).append("\r\n")
            append("Content-Type: ").append(contentType).append("\r\n")
            append("Content-Length: ").append(bytes.size).append("\r\n")
            append("Connection: close\r\n")
            append("Cache-Control: no-store\r\n")
            append("\r\n")
        }.toByteArray(StandardCharsets.UTF_8)
        output.write(header)
        output.write(bytes)
        output.flush()
    }

    private fun reason(status: Int): String = when (status) {
        200 -> "OK"
        404 -> "Not Found"
        500 -> "Internal Server Error"
        503 -> "Service Unavailable"
        400 -> "Bad Request"
        405 -> "Method Not Allowed"
        409 -> "Conflict"
        501 -> "Not Implemented"
        else -> "Error"
    }

    private fun contentType(path: String): String = when (path.substringAfterLast('.', "").lowercase()) {
        "html" -> "text/html; charset=utf-8"
        "js" -> "text/javascript; charset=utf-8"
        "css" -> "text/css; charset=utf-8"
        "json" -> "application/json; charset=utf-8"
        "svg" -> "image/svg+xml"
        "png" -> "image/png"
        "jpg", "jpeg" -> "image/jpeg"
        "ico" -> "image/x-icon"
        "woff" -> "font/woff"
        "woff2" -> "font/woff2"
        else -> "application/octet-stream"
    }
}
