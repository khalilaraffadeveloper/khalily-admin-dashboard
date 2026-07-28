package com.hamada.customer.ui.theme

import android.app.Activity
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

private val HamadaColorScheme = lightColorScheme(
    primary = HamadaPink,
    onPrimary = androidx.compose.ui.graphics.Color.White,
    primaryContainer = HamadaPinkLight,
    secondary = HamadaPurple,
    onSecondary = androidx.compose.ui.graphics.Color.White,
    secondaryContainer = HamadaPurpleLight,
    background = HamadaGrayLight,
    surface = androidx.compose.ui.graphics.Color.White,
    error = HamadaRed,
    onBackground = HamadaTextPrimary,
    onSurface = HamadaTextPrimary,
)

@Composable
fun HamadaCustomerTheme(content: @Composable () -> Unit) {
    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = HamadaPink.toArgb()
            window.navigationBarColor = HamadaPink.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = false
        }
    }
    MaterialTheme(
        colorScheme = HamadaColorScheme,
        typography = Typography(),
        content = content
    )
}
