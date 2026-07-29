package com.ARAVA.driver.util

import android.content.Context
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import com.ARAVA.driver.R

object SoundPlayer {
    private var mediaPlayer: MediaPlayer? = null
    private var vibrator: Vibrator? = null
    private var isPlayingFlag = false
    private var vibrateThread: Thread? = null

    private val VIBRATE_PATTERN = longArrayOf(0, 300, 150, 300, 150, 600, 300, 300, 150, 300, 150, 600)

    fun playRideRequestSound(context: Context) {
        stopSound()
        isPlayingFlag = true

        // Get vibrator
        vibrator = if (Build.VERSION.SDK_INT >= 31) {
            val mgr = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager
            mgr.defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            context.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
        }

        // Play the custom ARAVA ride notification tone
        try {
            val toneUri = android.net.Uri.parse("android.resource://${context.packageName}/${R.raw.soundreality_notification_tone}")
            mediaPlayer = MediaPlayer().apply {
                setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build()
                )
                setDataSource(context, toneUri)
                isLooping = true
                setVolume(1.0f, 1.0f)
                prepare()
                start()
            }
        } catch (_: Exception) {
            // Fallback: play default notification
            try {
                val notifUri = android.media.RingtoneManager.getDefaultUri(android.media.RingtoneManager.TYPE_NOTIFICATION)
                mediaPlayer = MediaPlayer().apply {
                    setAudioAttributes(
                        AudioAttributes.Builder()
                            .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                            .build()
                    )
                    setDataSource(context, notifUri)
                    isLooping = true
                    setVolume(1.0f, 1.0f)
                    prepare()
                    start()
                }
            } catch (_: Exception) {}
        }

        // Vibration in a loop
        vibrateThread = Thread {
            try {
                while (isPlayingFlag) {
                    if (Build.VERSION.SDK_INT >= 26) {
                        vibrator?.vibrate(VibrationEffect.createWaveform(VIBRATE_PATTERN, 0))
                    } else {
                        @Suppress("DEPRECATION")
                        vibrator?.vibrate(VIBRATE_PATTERN, 0)
                    }
                    Thread.sleep(2000)
                }
            } catch (_: InterruptedException) {}
        }.apply { start() }
    }

    fun stopSound() {
        isPlayingFlag = false
        vibrateThread?.interrupt()
        vibrateThread = null
        try {
            vibrator?.cancel()
            vibrator = null
        } catch (_: Exception) { vibrator = null }
        try {
            mediaPlayer?.stop()
            mediaPlayer?.release()
            mediaPlayer = null
        } catch (_: Exception) { mediaPlayer = null }
    }

    fun isCurrentlyPlaying(): Boolean = isPlayingFlag
}
