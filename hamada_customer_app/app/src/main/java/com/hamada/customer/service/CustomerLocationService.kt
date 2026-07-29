package com.hamada.customer.service

import android.app.Service
import android.content.Intent
import android.os.IBinder
import android.os.Looper
import androidx.core.app.NotificationCompat
import com.google.android.gms.location.*
import com.google.firebase.firestore.FirebaseFirestore
import com.hamada.customer.R
import com.hamada.customer.util.PrefsManager
import com.hamada.customer.util.GeoHashUtil

class CustomerLocationService : Service() {

    companion object {
        const val NOTIFICATION_ID = 2001
        const val LOCATION_UPDATE_MS = 30000L
        const val FASTEST_INTERVAL_MS = 15000L
        const val MIN_DISTANCE = 50f
        const val ACTION_STOP = "com.hamada.customer.STOP_LOCATION"
    }

    private lateinit var fusedClient: FusedLocationProviderClient
    private var locationCallback: LocationCallback? = null
    private var consecutiveFailures = 0

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        fusedClient = LocationServices.getFusedLocationProviderClient(this)
        startForeground(NOTIFICATION_ID, buildNotification())
        startLocationUpdates()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP) {
            stopForeground(STOP_FOREGROUND_REMOVE)
            stopSelf()
            return START_NOT_STICKY
        }
        return START_STICKY
    }

    private fun startLocationUpdates() {
        val request = LocationRequest.Builder(Priority.PRIORITY_BALANCED_POWER_ACCURACY, LOCATION_UPDATE_MS)
            .setMinUpdateIntervalMillis(FASTEST_INTERVAL_MS)
            .setMinUpdateDistanceMeters(MIN_DISTANCE)
            .build()

        locationCallback = object : LocationCallback() {
            override fun onLocationResult(result: LocationResult) {
                result.lastLocation?.let { loc ->
                    updateFirestore(loc.latitude, loc.longitude)
                    consecutiveFailures = 0
                }
            }
        }

        try {
            fusedClient.requestLocationUpdates(request, locationCallback!!, Looper.getMainLooper())
        } catch (_: SecurityException) {}
    }

    private fun updateFirestore(lat: Double, lng: Double) {
        val customerId = PrefsManager.getCustomerId()
        if (customerId.isEmpty()) return

        val data = hashMapOf(
            "lat" to lat,
            "lng" to lng,
            "geohash" to GeoHashUtil.encode(lat, lng),
            "lastLocationUpdate" to System.currentTimeMillis()
        )

        FirebaseFirestore.getInstance().collection("customers").document(customerId)
            .update(data as Map<String, Any>)
            .addOnFailureListener { consecutiveFailures++ }
            .addOnSuccessListener { consecutiveFailures = 0 }
    }

    private fun buildNotification() = NotificationCompat.Builder(this, "location_service_channel")
        .setContentTitle("TRENDLY")
        .setContentText("جاري تتبع موقعك...")
        .setSmallIcon(R.drawable.ic_notification)
        .setOngoing(true)
        .setPriority(NotificationCompat.PRIORITY_LOW)
        .build()

    override fun onDestroy() {
        locationCallback?.let { fusedClient.removeLocationUpdates(it) }
        super.onDestroy()
    }
}
