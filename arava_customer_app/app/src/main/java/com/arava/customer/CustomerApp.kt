package com.ARAVA.customer

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.FirebaseFirestoreSettings

class CustomerApp : Application() {

    override fun onCreate() {
        super.onCreate()
        createNotificationChannels()

        val settings = FirebaseFirestoreSettings.Builder()
            .setLocalCacheSettings(com.google.firebase.firestore.PersistentCacheSettings.newBuilder().build())
            .build()
        FirebaseFirestore.getInstance().firestoreSettings = settings
    }

    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val manager = getSystemService(NotificationManager::class.java)

            val rideChannel = NotificationChannel(
                "ride_status_channel",
                "حالات الرحلات",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "إشعارات حالة الرحلة"
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 300, 150, 300)
            }

            val locationChannel = NotificationChannel(
                "location_service_channel",
                "خدمة الموقع",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "تتبع الموقع في الخلفية"
                setShowBadge(false)
            }

            manager.createNotificationChannel(rideChannel)
            manager.createNotificationChannel(locationChannel)
        }
    }
}
