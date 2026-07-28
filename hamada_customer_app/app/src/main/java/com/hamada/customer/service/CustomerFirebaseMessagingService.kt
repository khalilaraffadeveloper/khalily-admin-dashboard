package com.hamada.customer.service

import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.hamada.customer.MainActivity
import com.hamada.customer.R
import com.hamada.customer.util.PrefsManager
import com.google.firebase.firestore.FirebaseFirestore

class CustomerFirebaseMessagingService : FirebaseMessagingService() {

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        val customerId = PrefsManager.getCustomerId()
        if (customerId.isNotEmpty()) {
            FirebaseFirestore.getInstance().collection("customers").document(customerId)
                .update("fcmToken", token)
        }
    }

    override fun onMessageReceived(message: RemoteMessage) {
        super.onMessageReceived(message)
        val data = message.data
        val type = data["type"] ?: return

        when (type) {
            "ride_accepted" -> {
                val name = data["driverName"] ?: ""
                showNotification("\u062A\u0645 \u0642\u0628\u0648\u0644 \u0631\u062D\u0644\u062A\u0643!",
                    "\u0627\u0644\u0633\u0627\u0626\u0642 $name \u0641\u064A \u0637\u0631\u064A\u0642\u0647 \u0625\u0644\u064A\u0643", "ride_accepted")
            }
            "ride_started" -> showNotification(
                "\u0628\u062F\u0623\u062A \u0627\u0644\u0631\u062D\u0644\u0629",
                "\u0627\u0644\u0633\u0627\u0626\u0642 \u0641\u064A \u0627\u0644\u0637\u0631\u064A\u0642 \u0625\u0644\u0649 \u0648\u062C\u0647\u062A\u0643",
                "ride_started"
            )
            "ride_completed" -> {
                val fare = data["fare"] ?: ""
                showNotification("\u062A\u0645\u062A \u0627\u0644\u0631\u062D\u0644\u0629!",
                    "\u0648\u0635\u0644\u062A \u0625\u0644\u0649 \u0648\u062C\u0647\u062A\u0643. \u0627\u0644\u0623\u062C\u0631\u0629: $fare MRU", "ride_completed")
            }
            "ride_cancelled" -> showNotification(
                "\u062A\u0645 \u0625\u0644\u063A\u0627\u0621 \u0627\u0644\u0631\u062D\u0644\u0629",
                "\u0644\u0645 \u064A\u062A\u0645 \u0642\u0628\u0648\u0644 \u0637\u0644\u0628\u0643. \u062C\u0631\u0651\u0628 \u062A\u0648\u0633\u064A\u0639 \u0646\u0637\u0627\u0642 \u0627\u0644\u0628\u062D\u062B.",
                "ride_cancelled"
            )
            "driver_arriving" -> showNotification(
                "\u0627\u0644\u0633\u0627\u0626\u0642 \u0648\u0635\u0644!",
                "\u0627\u0644\u0633\u0627\u0626\u0642 \u0641\u064A \u0627\u0646\u062A\u0638\u0627\u0631\u0643 \u0627\u0644\u0622\u0646",
                "driver_arriving"
            )
        }
    }

    private fun showNotification(title: String, body: String, type: String) {
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("notification_type", type)
        }
        val pending = PendingIntent.getActivity(this, 0, intent, PendingIntent.FLAG_IMMUTABLE)

        val notification = NotificationCompat.Builder(this, "ride_status_channel")
            .setContentTitle(title)
            .setContentText(body)
            .setSmallIcon(R.drawable.ic_notification)
            .setAutoCancel(true)
            .setContentIntent(pending)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .build()

        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.notify(System.currentTimeMillis().toInt(), notification)
    }
}
