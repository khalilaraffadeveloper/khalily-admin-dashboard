package com.trendly.customer.util

import android.content.Context
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import java.io.File
import java.io.FileOutputStream

object SoundPlayer {
    private var mediaPlayer: MediaPlayer? = null
    private var vibrator: Vibrator? = null
    private var isPlaying = false

    fun playNotificationSound(context: Context) {
        try {
            val vibratorManager = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager
            vibrator = vibratorManager?.defaultVibrator ?: @Suppress("DEPRECATION") context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator

            val pattern = longArrayOf(0, 300, 150, 300, 150, 600, 300, 300, 150, 300, 150, 600)
            vibrator?.vibrate(VibrationEffect.createWaveform(pattern, 0))

            val notification = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
            mediaPlayer = MediaPlayer().apply {
                setDataSource(context, notification)
                setAudioAttributes(
                    android.media.AudioAttributes.Builder()
                        .setUsage(android.media.AudioAttributes.USAGE_ALARM)
                        .setContentType(android.media.AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build()
                )
                isLooping = true
                setVolume(1.0f, 1.0f)
                prepare()
                start()
            }
            isPlaying = true
        } catch (_: Exception) {}
    }

    fun playRideAcceptedSound(context: Context) {
        try {
            val notification = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
            mediaPlayer = MediaPlayer().apply {
                setDataSource(context, notification)
                isLooping = false
                setVolume(1.0f, 1.0f)
                prepare()
                start()
                setOnCompletionListener { release() }
            }
        } catch (_: Exception) {}
    }

    fun stopSound() {
        try {
            mediaPlayer?.stop()
            mediaPlayer?.release()
            mediaPlayer = null
            vibrator?.cancel()
            isPlaying = false
        } catch (_: Exception) {}
    }

    fun isCurrentlyPlaying(): Boolean = isPlaying
}
