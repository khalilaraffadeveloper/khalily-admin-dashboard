package com.ARAVA.customer.ui.theme

import android.app.Activity
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

private val ARAVAColorScheme = lightColorScheme(
    primary = ARAVAPink,
    onPrimary = androidx.compose.ui.graphics.Color.White,
    primaryContainer = ARAVAPinkLight,
    secondary = ARAVAPurple,
    onSecondary = androidx.compose.ui.graphics.Color.White,
    secondaryContainer = ARAVAPurpleLight,
    background = ARAVAGrayLight,
    surface = androidx.compose.ui.graphics.Color.White,
    error = ARAVARed,
    onBackground = ARAVATextPrimary,
    onSurface = ARAVATextPrimary,
)

@Composable
fun ARAVACustomerTheme(content: @Composable () -> Unit) {
    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = ARAVAPink.toArgb()
            window.navigationBarColor = ARAVAPink.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = false
        }
    }
    MaterialTheme(
        colorScheme = ARAVAColorScheme,
        typography = Typography(),
        content = content
    )
}
