package com.trendly.customer.ui.theme

import android.app.Activity
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

private val TrendlyColorScheme = lightColorScheme(
    primary = TrendlyPink,
    onPrimary = androidx.compose.ui.graphics.Color.White,
    primaryContainer = TrendlyPinkLight,
    secondary = TrendlyPurple,
    onSecondary = androidx.compose.ui.graphics.Color.White,
    secondaryContainer = TrendlyPurpleLight,
    background = TrendlyGrayLight,
    surface = androidx.compose.ui.graphics.Color.White,
    error = TrendlyRed,
    onBackground = TrendlyTextPrimary,
    onSurface = TrendlyTextPrimary,
)

@Composable
fun TrendlyCustomerTheme(content: @Composable () -> Unit) {
    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = TrendlyPink.toArgb()
            window.navigationBarColor = TrendlyPink.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = false
        }
    }
    MaterialTheme(
        colorScheme = TrendlyColorScheme,
        typography = Typography(),
        content = content
    )
}
