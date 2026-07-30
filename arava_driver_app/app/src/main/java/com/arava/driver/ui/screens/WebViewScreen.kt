package com.arava.driver.ui.screens

import android.content.ActivityNotFoundException
import android.content.Intent
import android.graphics.Bitmap
import android.net.Uri
import android.view.ViewGroup
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.viewinterop.AndroidView
import com.arava.driver.ui.theme.ARAVAGold
import com.arava.driver.ui.theme.ARAVANavy

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WebViewScreen(
    url: String,
    title: String,
    onBack: () -> Unit
) {
    var isLoading by remember { mutableStateOf(true) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = title,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "رجوع",
                            tint = Color.White
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = ARAVANavy
                )
            )
        }
    ) { padding ->
        Box(modifier = Modifier.fillMaxSize().padding(padding)) {
            AndroidView(
                factory = { context ->
                    WebView(context).apply {
                        layoutParams = ViewGroup.LayoutParams(
                            ViewGroup.LayoutParams.MATCH_PARENT,
                            ViewGroup.LayoutParams.MATCH_PARENT
                        )
                        settings.javaScriptEnabled = true
                        settings.domStorageEnabled = true
                        settings.loadWithOverviewMode = true
                        settings.useWideViewPort = true
                        settings.builtInZoomControls = true
                        settings.displayZoomControls = false
                        webViewClient = object : WebViewClient() {
                            override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
                                isLoading = true
                            }
                            override fun onPageFinished(view: WebView?, url: String?) {
                                isLoading = false
                            }
                            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                                val url = request?.url?.toString() ?: return false
                                return handleCustomUrl(url, view?.context?.applicationContext)
                            }
                            @Deprecated("Deprecated in Java")
                            override fun shouldOverrideUrlLoading(view: WebView?, url: String?): Boolean {
                                return handleCustomUrl(url ?: return false, view?.context?.applicationContext)
                            }
                            private fun handleCustomUrl(url: String, appContext: android.content.Context?): Boolean {
                                if (appContext == null) return false
                                return when {
                                    url.startsWith("tel:") -> {
                                        appContext.startActivity(Intent(Intent.ACTION_DIAL, Uri.parse(url)))
                                        true
                                    }
                                    url.startsWith("whatsapp://") -> {
                                        try {
                                            appContext.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
                                        } catch (_: ActivityNotFoundException) {
                                            appContext.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://play.google.com/store/apps/details?id=com.whatsapp")))
                                        }
                                        true
                                    }
                                    url.startsWith("intent://") -> {
                                        try {
                                            appContext.startActivity(Intent.parseUri(url, Intent.URI_INTENT_SCHEME))
                                        } catch (_: Exception) {
                                            if (url.contains("com.whatsapp")) {
                                                try {
                                                    appContext.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://play.google.com/store/apps/details?id=com.whatsapp")))
                                                } catch (_: Exception) {}
                                            }
                                        }
                                        true
                                    }
                                    else -> false
                                }
                            }
                        }
                        webChromeClient = WebChromeClient()
                        loadUrl(url)
                    }
                },
                modifier = Modifier.fillMaxSize()
            )

            if (isLoading) {
                LinearProgressIndicator(
                    modifier = Modifier.fillMaxWidth(),
                    color = ARAVAGold
                )
            }
        }
    }
}