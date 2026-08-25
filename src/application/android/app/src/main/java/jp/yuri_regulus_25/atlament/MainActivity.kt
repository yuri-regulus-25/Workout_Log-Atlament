package jp.yuri_regulus_25.atlament

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.view.ViewGroup
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.TextView

class MainActivity : Activity() {
    private lateinit var webView: WebView
    private var localhostServer: AndroidLocalhostServer? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        webView = WebView(this).apply {
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT,
            )
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            webViewClient = AtlamentWebViewClient()
        }

        setContentView(webView)
        startLocalhostServer()
    }

    override fun onDestroy() {
        localhostServer?.close()
        localhostServer = null
        super.onDestroy()
    }

    @Suppress("DEPRECATION", "OVERRIDE_DEPRECATION")
    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }

    private fun startLocalhostServer() {
        try {
            val server = AndroidLocalhostServer(applicationContext)
            server.start()
            localhostServer = server
            webView.loadUrl(server.baseUrl)
        } catch (ex: Exception) {
            setContentView(TextView(this).apply {
                text = "Atlament localhost server failed to start.\n${ex.message.orEmpty()}"
                textSize = 16f
                setPadding(32, 32, 32, 32)
            })
        }
    }

    private inner class AtlamentWebViewClient : WebViewClient() {
        override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
            val uri = request.url
            if (uri.scheme == "file" || uri.host == "127.0.0.1" || uri.host == "localhost") {
                return false
            }
            if (uri.scheme == "http" || uri.scheme == "https") {
                startActivity(Intent(Intent.ACTION_VIEW, uri))
                return true
            }
            return false
        }
    }
}

