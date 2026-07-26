package com.khalily.driver

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.media.RingtoneManager
import android.os.Build
import android.os.Build.FINGERPRINT
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.FirebaseFirestoreSettings

class KhalilyApp : Application() {

    companion object {
        const val RIDE_REQUEST_CHANNEL = "ride_request_channel"
        const val LOCATION_SERVICE_CHANNEL = "location_service_channel"

        // Firestore emulator host (Android emulator → host machine)
        private const val EMULATOR_HOST = "10.0.2.2:8080"

        // Dashboard URL — same project as the admin dashboard
        const val DASHBOARD_URL = "https://khalilaraffadeveloper.github.io/khalily-admin-dashboard/"

        fun isEmulator(): Boolean {
            return (Build.BRAND.startsWith("generic") && Build.DEVICE.startsWith("generic"))
                    || Build.FINGERPRINT.startsWith("generic")
                    || Build.FINGERPRINT.startsWith("unknown")
                    || Build.HARDWARE.contains("goldfish")
                    || Build.HARDWARE.contains("ranchu")
                    || Build.MODEL.contains("google_sdk")
                    || Build.MODEL.contains("Emulator")
                    || Build.MODEL.contains("Android SDK built for x86")
                    || Build.MANUFACTURER.contains("Genymotion")
                    || Build.PRODUCT.contains("sdk_google")
                    || Build.PRODUCT.contains("vbox86p")
                    || Build.PRODUCT.contains("emulator")
                    || Build.PRODUCT.contains("simulator")
        }
    }

    override fun onCreate() {
        super.onCreate()
        createNotificationChannels()
        configureFirestore()
    }

    private fun configureFirestore() {
        try {
            val db = FirebaseFirestore.getInstance()
            val settings = FirebaseFirestoreSettings.Builder()
                .setPersistenceEnabled(true)
                .build()
            db.firestoreSettings = settings
            android.util.Log.d("KhalilyApp", "✅ Firestore → khalily-app (Firebase Cloud)")
        } catch (e: Exception) {
            android.util.Log.e("KhalilyApp", "Firestore connection failed: ${e.message}")
        }
    }

    private fun createNotificationChannels() {
        val manager = getSystemService(NotificationManager::class.java)

        val rideChannel = NotificationChannel(
            RIDE_REQUEST_CHANNEL,
            "طلبات الرحلات",
            NotificationManager.IMPORTANCE_HIGH
        ).apply {
            description = "تنبيهات الطلبات الجديدة"
            enableVibration(true)
            vibrationPattern = longArrayOf(0, 300, 150, 300, 150, 600)
            setSound(
                RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM),
                android.media.AudioAttributes.Builder()
                    .setUsage(android.media.AudioAttributes.USAGE_ALARM)
                    .setContentType(android.media.AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build()
            )
        }

        val locationChannel = NotificationChannel(
            LOCATION_SERVICE_CHANNEL,
            "خدمة الموقع",
            NotificationManager.IMPORTANCE_LOW
        ).apply {
            description = "إشعار خدمة تتبع الموقع في الخلفية"
            setShowBadge(false)
        }

        manager.createNotificationChannel(rideChannel)
        manager.createNotificationChannel(locationChannel)
    }
}
