package com.khalily.driver.service

import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.RingtoneManager
import androidx.core.app.NotificationCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.khalily.driver.KhalilyApp
import com.khalily.driver.MainActivity
import com.khalily.driver.util.PrefsManager
import com.khalily.driver.util.SoundPlayer
import kotlin.random.Random

class KhalilyFirebaseMessagingService : FirebaseMessagingService() {

    companion object {
        var onRideRequestReceived: ((rideData: Map<String, Any>) -> Unit)? = null
    }

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        saveTokenToFirestore(token)
    }

    override fun onMessageReceived(message: RemoteMessage) {
        super.onMessageReceived(message)

        val data = message.data

        when (data["type"]) {
            "ride_request" -> handleRideRequest(data)
            "ride_cancelled" -> handleRideCancelled(data)
            else -> showGenericNotification(
                title = message.notification?.title ?: "\u062D\u0645\u0627\u062F\u0647",
                body = message.notification?.body ?: "لديك إشعار جديد"
            )
        }
    }

    private fun handleRideRequest(data: Map<String, String>) {
        val rideData = mutableMapOf<String, Any>(
            "rideId" to (data["rideId"] ?: ""),
            "passengerName" to (data["passengerName"] ?: "زبون"),
            "passengerPhone" to (data["passengerPhone"] ?: ""),
            "pickupLat" to (data["pickupLat"]?.toDoubleOrNull() ?: 0.0),
            "pickupLng" to (data["pickupLng"]?.toDoubleOrNull() ?: 0.0),
            "pickupAddress" to (data["pickupAddress"] ?: ""),
            "dropoffLat" to (data["dropoffLat"]?.toDoubleOrNull() ?: 0.0),
            "dropoffLng" to (data["dropoffLng"]?.toDoubleOrNull() ?: 0.0),
            "dropoffAddress" to (data["dropoffAddress"] ?: ""),
            "distanceKm" to (data["distanceKm"] ?: "0"),
            "fare" to (data["fare"] ?: data["estimatedFare"] ?: "0")
        )

        SoundPlayer.playRideRequestSound(this)
        onRideRequestReceived?.invoke(rideData)

        val notificationId = Random.nextInt(1000, 9999)
        showRideNotification(data, notificationId)
    }

    private fun handleRideCancelled(data: Map<String, String>) {
        SoundPlayer.stopSound()
        showGenericNotification(
            title = "تم إلغاء الرحلة",
            body = "تم إلغاء الرحلة من قبل الزبون"
        )
    }

    private fun showRideNotification(data: Map<String, String>, notificationId: Int) {
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("ride_request", true)
            putExtra("rideId", data["rideId"])
            putExtra("passengerName", data["passengerName"])
            putExtra("passengerPhone", data["passengerPhone"])
            putExtra("pickupLat", data["pickupLat"]?.toDoubleOrNull() ?: 0.0)
            putExtra("pickupLng", data["pickupLng"]?.toDoubleOrNull() ?: 0.0)
            putExtra("pickupAddress", data["pickupAddress"])
            putExtra("dropoffLat", data["dropoffLat"]?.toDoubleOrNull() ?: 0.0)
            putExtra("dropoffLng", data["dropoffLng"]?.toDoubleOrNull() ?: 0.0)
            putExtra("dropoffAddress", data["dropoffAddress"])
            putExtra("distanceKm", data["distanceKm"])
            putExtra("fare", data["fare"] ?: data["estimatedFare"])
        }

        val pendingIntent = PendingIntent.getActivity(
            this,
            notificationId,
            intent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        val notification = NotificationCompat.Builder(this, KhalilyApp.RIDE_REQUEST_CHANNEL)
            .setContentTitle("طلب رحلة جديد!")
            .setContentText("سعر: ${data["fare"] ?: data["estimatedFare"] ?: "?"} MRU")
            .setStyle(
                NotificationCompat.BigTextStyle()
                    .bigText(
                        "الانطلاق: ${data["pickupAddress"] ?: "?"}\n" +
                        "الوجهة: ${data["dropoffAddress"] ?: "?"}\n" +
                        "السعر: ${data["fare"] ?: data["estimatedFare"] ?: "?"} MRU"
                    )
            )
            .setSmallIcon(android.R.drawable.ic_menu_call)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM))
            .setVibrate(longArrayOf(0, 500, 200, 500, 200, 500))
            .build()

        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.notify(notificationId, notification)
    }

    private fun showGenericNotification(
        title: String = "\u062D\u0645\u0627\u062F\u0647",
        body: String = "لديك إشعار جديد"
    ) {
        val notification = NotificationCompat.Builder(this, KhalilyApp.RIDE_REQUEST_CHANNEL)
            .setContentTitle(title)
            .setContentText(body)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setAutoCancel(true)
            .build()

        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.notify(Random.nextInt(1000, 9999), notification)
    }

    private fun saveTokenToFirestore(token: String) {
        val driverId = PrefsManager.getDriverId(this) ?: return
        com.google.firebase.firestore.FirebaseFirestore.getInstance()
            .collection("drivers")
            .document(driverId)
            .update("fcmToken", token)
    }
}
