package com.ARAVA.customer

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.*
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationServices
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.ARAVA.customer.service.CustomerLocationService
import com.ARAVA.customer.ui.screens.home.*
import com.ARAVA.customer.ui.screens.WebViewScreen
import com.ARAVA.customer.ui.screens.login.LoginScreen
import com.ARAVA.customer.ui.screens.login.RegisterScreen
import com.ARAVA.customer.ui.screens.settings.SettingsScreen
import com.ARAVA.customer.ui.theme.ARAVACustomerTheme
import com.ARAVA.customer.util.*
import java.text.SimpleDateFormat
import java.util.*

class MainActivity : ComponentActivity() {

    private val permLauncher = registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) {}
    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private var lastLat: Double = 18.0735
    private var lastLng: Double = -15.9582

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        PrefsManager.init(this)
        requestPermissions()

        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)
        try {
            fusedLocationClient.lastLocation.addOnSuccessListener { loc ->
                loc?.let {
                    lastLat = it.latitude
                    lastLng = it.longitude
                }
            }
        } catch (_: SecurityException) {}

        setContent {
            ARAVACustomerTheme {
                var screen by remember { mutableStateOf(
                    if (PrefsManager.isLoggedIn()) "home" else "login"
                ) }
                var customerName by remember { mutableStateOf(PrefsManager.getCustomerName()) }
                var customerPhone by remember { mutableStateOf(PrefsManager.getPhone()) }
                var customerWhatsapp by remember { mutableStateOf(PrefsManager.getWhatsapp()) }
                var customerId by remember { mutableStateOf(PrefsManager.getCustomerId()) }
                var credit by remember { mutableDoubleStateOf(0.0) }
                var totalRides by remember { mutableIntStateOf(0) }

                // Ride state
                var currentRideId by remember { mutableStateOf("") }
                var rideStatus by remember { mutableStateOf("") }
                var ridePickup by remember { mutableStateOf("") }
                var rideDropoff by remember { mutableStateOf("") }
                var rideFare by remember { mutableDoubleStateOf(0.0) }
                var rideRadius by remember { mutableIntStateOf(5) }
                var rideCommission by remember { mutableDoubleStateOf(0.0) }
                var driverName by remember { mutableStateOf("") }
                var driverPhone by remember { mutableStateOf("") }
                var driverWhatsapp by remember { mutableStateOf("") }

                // Listen for credit changes
                LaunchedEffect(customerId) {
                    if (customerId.isNotEmpty()) {
                        FirebaseFirestore.getInstance().collection("customers").document(customerId)
                            .addSnapshotListener { doc, _ ->
                                doc?.let {
                                    credit = it.getDouble("credit") ?: 0.0
                                    totalRides = (it.getLong("totalRides") ?: 0).toInt()
                                    customerName = it.getString("name") ?: customerName
                                    customerPhone = it.getString("phone") ?: customerPhone
                                    customerWhatsapp = it.getString("whatsapp") ?: customerWhatsapp
                                }
                            }
                    }
                }

                // Listen for ride changes
                LaunchedEffect(customerId) {
                    if (customerId.isNotEmpty()) {
                        FirebaseFirestore.getInstance().collection("rides")
                            .whereEqualTo("customerId", customerId)
                            .orderBy("createdAt", com.google.firebase.firestore.Query.Direction.DESCENDING)
                            .limit(1)
                            .addSnapshotListener { snap, _ ->
                                snap?.documents?.firstOrNull()?.let { doc ->
                                    val newStatus = doc.getString("status") ?: ""
                                    val rideId = doc.id
                                    val prevStatus = rideStatus
                                    if (rideId != currentRideId || newStatus != rideStatus) {
                                        currentRideId = rideId
                                        rideStatus = newStatus
                                        ridePickup = doc.getString("pickupAddress") ?: ""
                                        rideDropoff = doc.getString("dropoffAddress") ?: ""
                                        rideFare = doc.getDouble("fare") ?: 0.0
                                        rideRadius = (doc.getLong("searchRadiusKm") ?: 5).toInt()
                                        rideCommission = doc.getDouble("commissionFromCustomer") ?: 0.0
                                        driverName = doc.getString("driverName") ?: ""
                                        driverPhone = doc.getString("driverPhone") ?: ""
                                        driverWhatsapp = doc.getString("driverWhatsapp") ?: ""

                                        if (newStatus == "completed" && (prevStatus == "accepted" || prevStatus == "in_progress") && rideFare > 0) {
                                            FirebaseFirestore.getInstance().collection("customers").document(customerId)
                                                .update(
                                                    "credit", FieldValue.increment(-rideFare),
                                                    "totalRides", FieldValue.increment(1)
                                                )
                                        }

                                        if (newStatus == "accepted" || newStatus == "in_progress" || newStatus == "completed") {
                                            screen = "tracking"
                                        }
                                    }
                                }
                            }
                    }
                }

                // Start location service when logged in
                LaunchedEffect(screen) {
                    if (screen != "login" && screen != "register") {
                        val serviceIntent = Intent(this@MainActivity, CustomerLocationService::class.java)
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                            startForegroundService(serviceIntent)
                        } else {
                            startService(serviceIntent)
                        }
                    }
                }

                when (screen) {
                    "login" -> LoginScreen(
                        onLoginSuccess = {
                            customerId = PrefsManager.getCustomerId()
                            customerName = PrefsManager.getCustomerName()
                            customerPhone = PrefsManager.getPhone()
                            customerWhatsapp = PrefsManager.getWhatsapp()
                            screen = "home"
                        },
                        onGoToRegister = { screen = "register" }
                    )
                    "register" -> RegisterScreen(
                        onRegisterSuccess = {
                            customerId = PrefsManager.getCustomerId()
                            customerName = PrefsManager.getCustomerName()
                            customerPhone = PrefsManager.getPhone()
                            customerWhatsapp = PrefsManager.getWhatsapp()
                            screen = "home"
                        },
                        onGoToLogin = { screen = "login" }
                    )
                    "home" -> {
                        Box(modifier = Modifier.fillMaxSize()) {
                            HomeScreen(
                                customerName = customerName,
                                credit = credit,
                                onRequestRide = { pickup, dropoff, radius, fare, commission ->
                                    ridePickup = pickup
                                    rideDropoff = dropoff
                                    rideRadius = radius
                                    rideFare = fare
                                    rideCommission = commission
                                    createRide(customerId, customerName, customerPhone, customerWhatsapp, pickup, dropoff, radius, fare, commission) { rideId ->
                                        currentRideId = rideId
                                        rideStatus = "pending"
                                        screen = "waiting"
                                    }
                                }
                            )
                            // Top navigation buttons
                            Row(
                                modifier = Modifier.align(Alignment.TopEnd).padding(8.dp),
                                horizontalArrangement = Arrangement.spacedBy(4.dp)
                            ) {
                                IconButton(onClick = { screen = "promotions" }) {
                                    Icon(Icons.Default.Info, contentDescription = "العروض", tint = androidx.compose.ui.graphics.Color.White)
                                }
                                IconButton(onClick = { screen = "shop" }) {
                                    Icon(Icons.Default.ShoppingCart, contentDescription = "المتجر", tint = androidx.compose.ui.graphics.Color.White)
                                }
                                IconButton(onClick = { screen = "settings" }) {
                                    Icon(Icons.Default.Settings, contentDescription = "الإعدادات", tint = androidx.compose.ui.graphics.Color.White)
                                }
                            }
                        }
                    }
                    "waiting" -> WaitingScreen(
                        searchRadius = rideRadius,
                        pickupAddress = ridePickup,
                        dropoffAddress = rideDropoff,
                        fare = rideFare,
                        onTimeout = {
                            cancelRide(currentRideId)
                            screen = "home"
                        }
                    )
                    "tracking" -> RideTrackingScreen(
                        rideStatus = rideStatus,
                        driverName = driverName,
                        driverPhone = driverPhone,
                        driverWhatsapp = driverWhatsapp,
                        pickupAddress = ridePickup,
                        dropoffAddress = rideDropoff,
                        fare = rideFare,
                        onRideCompleted = { screen = "home" }
                    )
                    "promotions" -> WebViewScreen(
                        url = "https://khalilaraffadeveloper.github.io/ARAVA-admin-dashboard/promotions.html",
                        title = "العروض والنشاطات",
                        onBack = { screen = "home" }
                    )
                    "shop" -> WebViewScreen(
                        url = "https://khalilaraffadeveloper.github.io/ARAVA-admin-dashboard/shop.html",
                        title = "المتجر",
                        onBack = { screen = "home" }
                    )
                    "settings" -> SettingsScreen(
                        customerName = customerName,
                        customerPhone = customerPhone,
                        customerWhatsapp = customerWhatsapp,
                        credit = credit,
                        totalRides = totalRides,
                        onLogout = {
                            stopService(Intent(this@MainActivity, CustomerLocationService::class.java))
                            FirebaseFirestore.getInstance().collection("customers").document(customerId)
                                .update("isOnline", false)
                            PrefsManager.clear()
                            screen = "login"
                        }
                    )
                }
            }
        }
    }

    private fun requestPermissions() {
        val perms = mutableListOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            perms.add(Manifest.permission.POST_NOTIFICATIONS)
        }
        val needed = perms.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }
        if (needed.isNotEmpty()) permLauncher.launch(needed.toTypedArray())
    }

    private fun createRide(
        customerId: String, customerName: String, customerPhone: String, customerWhatsapp: String,
        pickupAddress: String, dropoffAddress: String, radiusKm: Int, fare: Double, commission: Double,
        onCreated: (String) -> Unit
    ) {
        val commissionPercent = 10.0
        try {
            fusedLocationClient.lastLocation.addOnSuccessListener { loc ->
                loc?.let {
                    lastLat = it.latitude
                    lastLng = it.longitude
                }
            }
        } catch (_: SecurityException) {}
        val rideData = hashMapOf(
            "customerId" to customerId,
            "customerName" to customerName,
            "customerPhone" to customerPhone,
            "customerWhatsapp" to customerWhatsapp,
            "passengerName" to customerName,
            "passengerPhone" to customerPhone,
            "pickupLat" to lastLat,
            "pickupLng" to lastLng,
            "pickupAddress" to pickupAddress,
            "dropoffLat" to 0.0,
            "dropoffLng" to 0.0,
            "dropoffAddress" to dropoffAddress,
            "status" to "pending",
            "fare" to fare,
            "searchRadiusKm" to radiusKm,
            "commissionPercent" to commissionPercent,
            "commissionAmount" to commission,
            "commissionFromCustomer" to commission,
            "commissionFromDriver" to commission / 2.0,
            "source" to "customer_app",
            "notifiedDrivers" to emptyList<String>(),
            "statusHistory" to listOf(
                mapOf("action" to "created", "by" to "customer", "timestamp" to System.currentTimeMillis())
            ),
            "createdAt" to FieldValue.serverTimestamp()
        )

        FirebaseFirestore.getInstance().collection("rides")
            .add(rideData)
            .addOnSuccessListener { ref -> onCreated(ref.id) }
    }

    private fun cancelRide(rideId: String) {
        if (rideId.isEmpty()) return
        FirebaseFirestore.getInstance().collection("rides").document(rideId)
            .update(
                mapOf(
                    "status" to "cancelled",
                    "cancelledAt" to System.currentTimeMillis(),
                    "cancelledBy" to "auto_timeout"
                )
            )
    }
}
