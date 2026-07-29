package com.ARAVA.driver.service

import android.app.Notification
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.IBinder
import android.os.Looper
import androidx.core.app.NotificationCompat
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationAvailability
import com.google.android.gms.location.LocationCallback
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationResult
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import com.google.firebase.firestore.FirebaseFirestore
import com.ARAVA.driver.ARAVAApp
import com.ARAVA.driver.MainActivity
import com.ARAVA.driver.R
import com.ARAVA.driver.util.GeoHashUtil
import com.ARAVA.driver.util.NetworkUtil
import com.ARAVA.driver.util.PrefsManager
import java.util.concurrent.TimeUnit

class DriverLocationService : Service() {

    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private lateinit var locationCallback: LocationCallback
    private val db = FirebaseFirestore.getInstance()

    companion object {
        private const val NOTIFICATION_ID = 1001
        private const val LOCATION_UPDATE_INTERVAL_MS = 30_000L
        private const val FASTEST_INTERVAL_MS = 15_000L
        private const val MIN_DISTANCE_METERS = 50f
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)
        createLocationCallback()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            "ACTION_STOP_SERVICE" -> {
                stopForeground(STOP_FOREGROUND_REMOVE)
                stopSelf()
                return START_NOT_STICKY
            }
        }

        val notification = buildNotification()
        startForeground(
            NOTIFICATION_ID,
            notification,
            ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION
        )
        startLocationUpdates()
        return START_STICKY
    }

    private var consecutiveFailures = 0
    private val maxFailures = 5

    private fun createLocationCallback() {
        locationCallback = object : LocationCallback() {
            override fun onLocationResult(result: LocationResult) {
                result.lastLocation?.let { location ->
                    if (!NetworkUtil.isNetworkAvailable(this@DriverLocationService)) {
                        consecutiveFailures++
                        if (consecutiveFailures >= maxFailures) {
                            stopSelf()
                        }
                        return@let
                    }
                    consecutiveFailures = 0
                    updateDriverLocationFirestore(
                        lat = location.latitude,
                        lng = location.longitude
                    )
                }
            }

            override fun onLocationAvailability(availability: LocationAvailability) {
                if (!availability.isLocationAvailable) {
                    consecutiveFailures++
                    if (consecutiveFailures >= maxFailures) {
                        stopSelf()
                    }
                }
            }
        }
    }

    private fun startLocationUpdates() {
        val locationRequest = LocationRequest.Builder(
            Priority.PRIORITY_BALANCED_POWER_ACCURACY,
            LOCATION_UPDATE_INTERVAL_MS
        ).apply {
            setMinUpdateDistanceMeters(MIN_DISTANCE_METERS)
            setMinUpdateIntervalMillis(FASTEST_INTERVAL_MS)
            setWaitForAccurateLocation(false)
        }.build()

        try {
            fusedLocationClient.requestLocationUpdates(
                locationRequest,
                locationCallback,
                Looper.getMainLooper()
            )
        } catch (_: SecurityException) {
            stopSelf()
        }
    }

    private fun updateDriverLocationFirestore(lat: Double, lng: Double) {
        val driverId = PrefsManager.getDriverId(this) ?: return
        val geohash = GeoHashUtil.encode(lat, lng)

        val updates = mapOf(
            "lat" to lat,
            "lng" to lng,
            "geohash" to geohash,
            "lastUpdated" to com.google.firebase.firestore.FieldValue.serverTimestamp()
        )

        db.collection("drivers").document(driverId)
            .update(updates)
            .addOnSuccessListener { consecutiveFailures = 0 }
            .addOnFailureListener { e ->
                consecutiveFailures++
                db.collection("drivers").document(driverId)
                    .set(updates, com.google.firebase.firestore.SetOptions.merge())
                    .addOnFailureListener {
                        if (consecutiveFailures >= maxFailures) {
                            stopSelf()
                        }
                    }
            }
    }

    private fun buildNotification(): Notification {
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        val stopIntent = PendingIntent.getService(
            this,
            1,
            Intent(this, DriverLocationService::class.java).apply {
                action = "ACTION_STOP_SERVICE"
            },
            PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, ARAVAApp.LOCATION_SERVICE_CHANNEL)
            .setContentTitle("ARAVA Driver")
            .setContentText("جاري تتبع موقعك لاستقبال الطلبات...")
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setContentIntent(pendingIntent)
            .addAction(android.R.drawable.ic_menu_close_clear_cancel, "إيقاف", stopIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }

    override fun onDestroy() {
        super.onDestroy()
        fusedLocationClient.removeLocationUpdates(locationCallback)
    }
}
