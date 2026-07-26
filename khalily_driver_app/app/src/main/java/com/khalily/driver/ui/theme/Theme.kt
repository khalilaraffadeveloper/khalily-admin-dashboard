package com.khalily.driver.ui.theme

import android.app.Activity
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

private val KhalilyColorScheme = lightColorScheme(
    primary = KhalilyNavy,
    onPrimary = KhalilySurface,
    primaryContainer = KhalilyNavyLight,
    onPrimaryContainer = KhalilySurface,
    secondary = KhalilyTurquoise,
    onSecondary = KhalilySurface,
    secondaryContainer = KhalilyTurquoiseLight,
    tertiary = KhalilyGold,
    onTertiary = KhalilyNavy,
    background = KhalilySand,
    onBackground = KhalilyTextPrimary,
    surface = KhalilySurface,
    onSurface = KhalilyTextPrimary,
    error = KhalilyError,
    onError = KhalilySurface
)

@Composable
fun KhalilyTheme(content: @Composable () -> Unit) {
    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = KhalilyNavy.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = false
        }
    }

    MaterialTheme(
        colorScheme = KhalilyColorScheme,
        content = content
    )
}
