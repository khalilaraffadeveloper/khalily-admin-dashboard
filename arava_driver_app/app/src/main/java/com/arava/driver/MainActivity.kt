package com.arava.driver

import android.Manifest
import android.content.pm.PackageManager
import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Call
import androidx.compose.material.icons.filled.CallEnd
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.MicOff
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material.icons.filled.VolumeUp
import androidx.compose.material.icons.filled.VolumeDown
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.ListenerRegistration
import com.arava.driver.service.ARAVAFirebaseMessagingService
import com.arava.driver.service.DriverLocationService
import com.arava.driver.util.SoundPlayer
import com.arava.driver.ui.screens.WebViewScreen
import com.arava.driver.ui.screens.home.DriverHomeScreen
import com.arava.driver.ui.screens.home.RideDetailDialog
import com.arava.driver.ui.screens.home.RideRequestDialog
import com.arava.driver.ui.screens.home.RideTrackingScreen
import com.arava.driver.ui.screens.settings.SettingsScreen
import com.arava.driver.ui.screens.login.LoginScreen
import com.arava.driver.ui.screens.messages.MessagesScreen
import com.arava.driver.ui.theme.ARAVATheme
import com.arava.driver.ui.theme.ARAVAGreen
import com.arava.driver.util.PrefsManager
import com.arava.driver.voip.CallSignaling
import com.arava.driver.voip.WebRTCEngine
import com.arava.driver.voip.CallState
import com.arava.driver.voip.CallConnectionState
import android.content.Intent
import android.os.Handler
import android.os.Looper

class MainActivity : ComponentActivity() {

    private var showRideDialog by mutableStateOf(false)
    private var showRideDetail by mutableStateOf(false)
    private var showRideTracking by mutableStateOf(false)
    private var showSettings by mutableStateOf(false)
    private var showMessages by mutableStateOf(false)
    private var showPromotions by mutableStateOf(false)
    private var showShop by mutableStateOf(false)
    private var showCancelledMsg by mutableStateOf(false)
    private var cancelledRideId by mutableStateOf("")
    private var cancelledMsgText by mutableStateOf("")
    private var currentRideData by mutableStateOf<Map<String, Any>>(emptyMap())
    private var driverCredit by mutableDoubleStateOf(0.0)
    private var isLoggedIn by mutableStateOf(false)
    private var commissionPercent by mutableDoubleStateOf(10.0)
    private var showAcceptLoading by mutableStateOf(false)

    // VoIP state
    private var isCallActive by mutableStateOf(false)
    private var isIncomingCall by mutableStateOf(false)
    private var incomingCallerName by mutableStateOf("")
    private var incomingRideId by mutableStateOf("")
    private var callStateText by mutableStateOf("")
    private var isMuted by mutableStateOf(false)
    private var isSpeakerOn by mutableStateOf(false)
    private var callDurationSec by mutableIntStateOf(0)
    private var callTimerHandler: Handler? = null

    private var webRTCEngine: WebRTCEngine? = null
    private var callSignaling: CallSignaling? = null

    private val db = FirebaseFirestore.getInstance()
    private var rideListener: ListenerRegistration? = null
    private var cancelListener: ListenerRegistration? = null
    private var creditListener: ListenerRegistration? = null
    private var commissionListener: ListenerRegistration? = null

    private val permissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        isLoggedIn = PrefsManager.isLoggedIn(this)
        requestPermissions()

        if (isLoggedIn) {
            val driverId = PrefsManager.getDriverId(this)
            if (!driverId.isNullOrEmpty()) {
                db.collection("drivers").document(driverId)
                    .update("isOnline", false)
                PrefsManager.setOnlineStatus(this, false)
                stopService(android.content.Intent(this, DriverLocationService::class.java))
            }
            setupFirestoreListeners()
            loadCommission()
        }

        ARAVAFirebaseMessagingService.onRideRequestReceived = { rideData ->
            if (driverCredit > 0) {
                currentRideData = rideData
                showRideDialog = true
            }
        }

        ARAVAFirebaseMessagingService.onIncomingCall = { rideId, callerName ->
            incomingRideId = rideId
            incomingCallerName = callerName
            isIncomingCall = true
        }

        ARAVAFirebaseMessagingService.onCallEnded = { rideId ->
            if (isCallActive) {
                endVoipCall()
            }
        }

        handleIntent(intent)

        setContent {
            ARAVATheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    when {
                        showMessages -> {
                            MessagesScreen(
                                onBack = { showMessages = false }
                            )
                        }
                        showPromotions -> {
                            WebViewScreen(
                                url = "https://khalilaraffadeveloper.github.io/khalily-admin-dashboard/promotions.html",
                                title = "العروض والنشاطات",
                                onBack = { showPromotions = false }
                            )
                        }
                        showShop -> {
                            WebViewScreen(
                                url = "https://khalilaraffadeveloper.github.io/khalily-admin-dashboard/shop.html",
                                title = "المتجر",
                                onBack = { showShop = false }
                            )
                        }
                        showSettings -> {
                            SettingsScreen(
                                onBack = { showSettings = false },
                                onLogout = {
                                    showSettings = false
                                    isLoggedIn = false
                                    SoundPlayer.stopSound()
                                    rideListener?.remove()
                                    cancelListener?.remove()
                                    creditListener?.remove()
                                    commissionListener?.remove()
                                    val driverId = PrefsManager.getDriverId(this@MainActivity)
                                    if (!driverId.isNullOrEmpty()) {
                                        db.collection("drivers").document(driverId)
                                            .update("isOnline", false)
                                    }
                                    PrefsManager.setLoggedIn(this@MainActivity, false)
                                    PrefsManager.setOnlineStatus(this@MainActivity, false)
                                    PrefsManager.saveDriverId(this@MainActivity, "")
                                    PrefsManager.saveDriverName(this@MainActivity, "")
                                    stopService(android.content.Intent(this@MainActivity, DriverLocationService::class.java))
                                }
                            )
                        }
                        showRideTracking -> {
                            RideTrackingScreen(
                                rideData = currentRideData,
                                onRideCompleted = { fare, commission ->
                                    completeRideFirestore(fare, commission)
                                },
                                onDismiss = {
                                    showRideTracking = false
                                },
                                onVoipCall = {
                                    val rideId = currentRideData["rideId"]?.toString() ?: return@RideTrackingScreen
                                    val passengerName = currentRideData["passengerName"]?.toString() ?: "الزبون"
                                    startVoipCall(rideId, passengerName)
                                }
                            )
                        }
                        isLoggedIn -> {
                            DriverHomeScreen(
                                onNavigateToSettings = { showSettings = true },
                                onNavigateToMessages = { showMessages = true },
                                onNavigateToPromotions = { showPromotions = true },
                                onNavigateToShop = { showShop = true }
                            )

                            if (showRideDialog) {
                                RideRequestDialog(
                                    rideData = currentRideData,
                                    onAccept = {
                                        SoundPlayer.stopSound()
                                        showAcceptLoading = true
                                        acceptRideFirestore()
                                    },
                                    onDecline = {
                                        SoundPlayer.stopSound()
                                        showRideDialog = false
                                    },
                                    isLoading = showAcceptLoading
                                )
                            }

                            if (showRideDetail) {
                                RideDetailDialog(
                                    rideData = currentRideData,
                                    onDismiss = {
                                        showRideDetail = false
                                    },
                                    onStarted = {
                                        showRideDetail = false
                                        showRideTracking = true
                                    }
                                )
                            }

                            if (showCancelledMsg) {
                                AlertDialog(
                                    onDismissRequest = { showCancelledMsg = false },
                                    icon = {
                                        Icon(
                                            Icons.Filled.Warning,
                                            contentDescription = null,
                                            tint = Color(0xFFE57373),
                                            modifier = Modifier.size(40.dp)
                                        )
                                    },
                                    title = {
                                        Text("تم إلغاء الرحلة", textAlign = TextAlign.Center, fontWeight = FontWeight.Bold)
                                    },
                                    text = {
                                        Text(
                                            cancelledMsgText,
                                            textAlign = TextAlign.Center,
                                            fontSize = 16.sp,
                                            fontWeight = FontWeight.Medium,
                                            lineHeight = 28.sp
                                        )
                                    },
                                    confirmButton = {
                                        Button(
                                            onClick = { showCancelledMsg = false },
                                            colors = ButtonDefaults.buttonColors(
                                                containerColor = Color(0xFF006A5E)
                                            ),
                                            modifier = Modifier.fillMaxWidth().height(50.dp)
                                        ) {
                                            Text("حسناً", fontSize = 16.sp, fontWeight = FontWeight.Bold)
                                        }
                                    },
                                    containerColor = Color.White
                                )
                            }
                        }
                        else -> {
                            LoginScreen(onLoginSuccess = {
                                isLoggedIn = true
                                setupFirestoreListeners()
                                loadCommission()
                            })
                        }
                    }

                    if (isIncomingCall) {
                        IncomingCallDialog(
                            callerName = incomingCallerName,
                            onAccept = { acceptIncomingCall(incomingRideId, incomingCallerName) },
                            onDecline = {
                                isIncomingCall = false
                                callSignaling?.cleanup()
                                callSignaling = null
                            }
                        )
                    }

                    if (isCallActive) {
                        ActiveCallScreen(
                            callStateText = callStateText,
                            durationSec = callDurationSec,
                            isMuted = isMuted,
                            isSpeakerOn = isSpeakerOn,
                            onToggleMute = { toggleMute() },
                            onToggleSpeaker = { toggleSpeaker() },
                            onEndCall = { endVoipCall() }
                        )
                    }
                }
            }
        }
    }

    override fun onNewIntent(intent: android.content.Intent) {
        super.onNewIntent(intent)
        handleIntent(intent)
    }

    override fun onDestroy() {
        super.onDestroy()
        rideListener?.remove()
        cancelListener?.remove()
        creditListener?.remove()
        commissionListener?.remove()
    }

    private fun loadCommission() {
        commissionListener?.remove()
        commissionListener = db.collection("settings").document("app_config")
            .addSnapshotListener { doc, e ->
                if (e != null) {
                    android.util.Log.e("MainActivity", "Commission listener error: ${e.message}")
                    return@addSnapshotListener
                }
                if (doc != null && doc.exists()) {
                    commissionPercent = doc.getDouble("commissionPercent") ?: 10.0
                }
            }
    }

    private fun setupFirestoreListeners() {
        val driverId = PrefsManager.getDriverId(this) ?: return
        listenForCredit(driverId)
        listenForRideRequests(driverId)
        listenForCancellations(driverId)
    }

    private fun listenForCredit(driverId: String) {
        creditListener?.remove()
        creditListener = db.collection("drivers").document(driverId)
            .addSnapshotListener { snapshot, e ->
                if (e != null) {
                    android.util.Log.e("MainActivity", "Credit listener error: ${e.message}")
                    return@addSnapshotListener
                }
                snapshot?.let {
                    driverCredit = it.getDouble("credit") ?: 0.0
                }
            }
    }

    private fun listenForRideRequests(driverId: String) {
        rideListener?.remove()
        var isFirstSnapshot = true

        rideListener = db.collection("rides")
            .whereArrayContains("notifiedDrivers", driverId)
            .addSnapshotListener { snapshot, e ->
                if (e != null) {
                    android.util.Log.e("MainActivity", "Ride listener error: ${e.message}")
                    return@addSnapshotListener
                }
                if (isFirstSnapshot) {
                    isFirstSnapshot = false
                    return@addSnapshotListener
                }
                if (snapshot == null || snapshot.isEmpty) return@addSnapshotListener

                val pendingDoc = snapshot.documents.filter {
                    it.getString("status") == "pending"
                }.firstOrNull() ?: return@addSnapshotListener

                if (showRideDialog || showRideDetail || showRideTracking) return@addSnapshotListener

                val credit = driverCredit
                if (credit <= 0) return@addSnapshotListener

                val rideData = mapOf(
                    "rideId" to pendingDoc.id,
                    "passengerName" to (pendingDoc.getString("passengerName") ?: "زبون"),
                    "passengerPhone" to (pendingDoc.getString("passengerPhone") ?: ""),
                    "pickupLat" to (pendingDoc.getDouble("pickupLat") ?: 0.0),
                    "pickupLng" to (pendingDoc.getDouble("pickupLng") ?: 0.0),
                    "pickupAddress" to (pendingDoc.getString("pickupAddress") ?: ""),
                    "dropoffLat" to (pendingDoc.getDouble("dropoffLat") ?: 0.0),
                    "dropoffLng" to (pendingDoc.getDouble("dropoffLng") ?: 0.0),
                    "dropoffAddress" to (pendingDoc.getString("dropoffAddress") ?: ""),
                    "realDistanceKm" to (pendingDoc.getDouble("realDistanceKm")?.toString() ?: "0"),
                    "distanceKm" to (pendingDoc.getDouble("realDistanceKm")?.toString() ?: pendingDoc.getDouble("distanceKm")?.toString() ?: pendingDoc.getDouble("searchRadiusKm")?.toString() ?: "0"),
                    "fare" to (pendingDoc.getLong("fare")?.toString() ?: pendingDoc.getDouble("fare")?.toString() ?: "0"),
                    "commissionPercent" to commissionPercent.toString()
                )
                SoundPlayer.playRideRequestSound(this)
                currentRideData = rideData
                showRideDialog = true
            }
    }

    private fun listenForCancellations(driverId: String) {
        cancelListener?.remove()
        var isFirstCancelSnapshot = true
        cancelListener = db.collection("rides")
            .whereArrayContains("notifiedDrivers", driverId)
            .addSnapshotListener { snapshot, e ->
                if (isFirstCancelSnapshot) {
                    isFirstCancelSnapshot = false
                    return@addSnapshotListener
                }
                if (e != null || snapshot == null || snapshot.isEmpty) return@addSnapshotListener

                val seen = PrefsManager.getSeenCancellations(this@MainActivity)

                for (change in snapshot.documentChanges) {
                    if (change.type == com.google.firebase.firestore.DocumentChange.Type.MODIFIED) {
                        val doc = change.document
                        val rideId = doc.id
                        val status = doc.getString("status")
                        if (status != "cancelled") continue
                        if (seen.contains(rideId)) continue

                        val currentRideId = currentRideData["rideId"]?.toString()
                        if (currentRideId == rideId) {
                            showRideDialog = false
                            showRideDetail = false
                            showRideTracking = false
                            SoundPlayer.stopSound()
                        }

                        val driverIdCurrent = PrefsManager.getDriverId(this@MainActivity)
                        val assignedDriver = doc.getString("assignedDriverId")
                        if (assignedDriver == driverIdCurrent) {
                            cancelledMsgText = "تم إلغاء رحلتك من قبل الإدارة. لن يُخصم أي مبلغ من رصيدك."
                        } else {
                            cancelledMsgText = "تم إلغاء إحدى الرحلات القريبة منك."
                        }
                        cancelledRideId = rideId
                        PrefsManager.markCancellationSeen(this@MainActivity, rideId)
                        showCancelledMsg = true
                        SoundPlayer.stopSound()
                    }
                }
            }
    }

    private fun handleIntent(intent: android.content.Intent?) {
        if (intent?.getBooleanExtra("ride_request", false) == true) {
            val rideData = mapOf(
                "rideId" to (intent.getStringExtra("rideId") ?: ""),
                "passengerName" to (intent.getStringExtra("passengerName") ?: "زبون"),
                "passengerPhone" to (intent.getStringExtra("passengerPhone") ?: ""),
                "pickupLat" to (intent.getDoubleExtra("pickupLat", 0.0)),
                "pickupLng" to (intent.getDoubleExtra("pickupLng", 0.0)),
                "pickupAddress" to (intent.getStringExtra("pickupAddress") ?: ""),
                "dropoffLat" to (intent.getDoubleExtra("dropoffLat", 0.0)),
                "dropoffLng" to (intent.getDoubleExtra("dropoffLng", 0.0)),
                "dropoffAddress" to (intent.getStringExtra("dropoffAddress") ?: ""),
                "realDistanceKm" to (intent.getStringExtra("realDistanceKm") ?: "0"),
                "distanceKm" to (intent.getStringExtra("realDistanceKm") ?: intent.getStringExtra("distanceKm") ?: "0"),
                "fare" to (intent.getStringExtra("fare") ?: "0"),
                "commissionPercent" to commissionPercent.toString()
            )
            if (driverCredit > 0) {
                currentRideData = rideData
                showRideDialog = true
            }
        }
    }

    private fun acceptRideFirestore() {
        val rideId = currentRideData["rideId"]?.toString() ?: return
        val driverId = PrefsManager.getDriverId(this) ?: return
        val phone = currentRideData["passengerPhone"]?.toString() ?: ""

        val rideRef = db.collection("rides").document(rideId)
        val driverRef = db.collection("drivers").document(driverId)

        val rideUpdates = mapOf(
            "status" to "accepted",
            "assignedDriverId" to driverId,
            "commissionPercent" to commissionPercent,
            "acceptedAt" to com.google.firebase.firestore.FieldValue.serverTimestamp()
        )
        val driverUpdates = mapOf(
            "currentRideId" to rideId
        )

        rideRef.update(rideUpdates)
            .addOnSuccessListener {
                driverRef.update(driverUpdates)
                android.util.Log.d("MainActivity", "ACCEPT RIDE OK: $rideId")
                currentRideData = currentRideData.toMutableMap().apply {
                    put("passengerPhone", phone)
                    put("commissionPercent", commissionPercent.toString())
                }
                showAcceptLoading = false
                showRideDialog = false
                showRideDetail = true
            }
            .addOnFailureListener { e ->
                android.util.Log.e("MainActivity", "ACCEPT RIDE FAILED: $rideId error=${e.message}")
                showAcceptLoading = false
                showAcceptError("حدث خطأ أثناء قبول الرحلة: ${e.message}")
            }
    }

    private fun completeRideFirestore(fare: Double, commission: Double) {
        val rideId = currentRideData["rideId"]?.toString() ?: return
        val driverId = PrefsManager.getDriverId(this) ?: return

        val rideRef = db.collection("rides").document(rideId)
        val driverRef = db.collection("drivers").document(driverId)

        rideRef.update(
            mapOf(
                "status" to "completed",
                "completedBy" to "driver",
                "completedAt" to com.google.firebase.firestore.FieldValue.serverTimestamp(),
                "commissionAmount" to commission,
                "commissionPercent" to commissionPercent,
                "finalFare" to fare,
                "assignedDriverId" to driverId
            )
        ).addOnSuccessListener {
            driverRef.update(
                mapOf(
                    "credit" to com.google.firebase.firestore.FieldValue.increment(-commission),
                    "currentRideId" to null,
                    "totalRides" to com.google.firebase.firestore.FieldValue.increment(1)
                )
            )
            android.util.Log.d("MainActivity", "Ride completed OK: $rideId")
        }.addOnFailureListener { e ->
            android.util.Log.e("MainActivity", "COMPLETE RIDE FAILED: $rideId error=${e.message}")
        }
    }

    private fun showAcceptError(message: String) {
        showRideDialog = false
        showRideDetail = false
        showRideTracking = false
        android.widget.Toast.makeText(this, message, android.widget.Toast.LENGTH_LONG).show()
    }

    private fun requestPermissions() {
        val permissions = mutableListOf(
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION,
        )

        if (android.os.Build.VERSION.SDK_INT >= 33) {
            permissions.add(Manifest.permission.POST_NOTIFICATIONS)
        }

        val notGranted = permissions.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }

        if (notGranted.isNotEmpty()) {
            permissionLauncher.launch(notGranted.toTypedArray())
        }
    }

    // ===================== VoIP Methods =====================

    private fun startVoipCall(rideId: String, targetName: String) {
        callSignaling = CallSignaling(db, rideId, "driver")
        callSignaling?.initiateCall()
        webRTCEngine = WebRTCEngine(
            context = applicationContext,
            signaling = callSignaling!!,
            onStateChange = { state ->
                when (state) {
                    CallConnectionState.CONNECTED -> {
                        callStateText = "المكالمة متصلة"
                    }
                    CallConnectionState.DISCONNECTED -> {
                        endVoipCall()
                    }
                    CallConnectionState.FAILED -> {
                        callStateText = "فشل الاتصال"
                        Toast.makeText(this, "فشل الاتصال الصوتي", Toast.LENGTH_SHORT).show()
                    }
                    else -> {}
                }
            }
        )
        webRTCEngine?.initialize()
        callStateText = "جارٍ الاتصال..."
        isCallActive = true
        isMuted = false
        isSpeakerOn = false
        startCallTimer()
        webRTCEngine?.startCall()
        callSignaling?.listenForAnswer { answer ->
            webRTCEngine?.setRemoteSdp(answer)
        }
        callSignaling?.listenForIceCandidates { candidate ->
            webRTCEngine?.addIceCandidate(candidate)
        }
    }

    private fun acceptIncomingCall(rideId: String, callerName: String) {
        isIncomingCall = false
        callSignaling = CallSignaling(db, rideId, "driver")
        callSignaling?.acceptCall()
        webRTCEngine = WebRTCEngine(
            context = applicationContext,
            signaling = callSignaling!!,
            onStateChange = { state ->
                when (state) {
                    CallConnectionState.CONNECTED -> {
                        callStateText = "المكالمة متصلة"
                    }
                    CallConnectionState.DISCONNECTED -> {
                        endVoipCall()
                    }
                    CallConnectionState.FAILED -> {
                        callStateText = "فشل الاتصال"
                        Toast.makeText(this, "فشل الاتصال الصوتي", Toast.LENGTH_SHORT).show()
                    }
                    else -> {}
                }
            }
        )
        webRTCEngine?.initialize()
        callStateText = "المكالمة متصلة"
        isCallActive = true
        isMuted = false
        isSpeakerOn = false
        startCallTimer()
        callSignaling?.listenForOffer { offer ->
            webRTCEngine?.answerCall(offer)
        }
        callSignaling?.listenForIceCandidates { candidate ->
            webRTCEngine?.addIceCandidate(candidate)
        }
    }

    private fun endVoipCall() {
        callTimerHandler?.removeCallbacksAndMessages(null)
        callTimerHandler = null
        callDurationSec = 0
        webRTCEngine?.release()
        webRTCEngine = null
        callSignaling?.cleanup()
        callSignaling = null
        isCallActive = false
        isIncomingCall = false
        callStateText = ""
        isMuted = false
        isSpeakerOn = false
    }

    private fun toggleMute() {
        isMuted = webRTCEngine?.toggleMute() ?: false
    }

    private fun toggleSpeaker() {
        isSpeakerOn = webRTCEngine?.toggleSpeaker() ?: false
    }

    private fun startCallTimer() {
        callDurationSec = 0
        callTimerHandler = Handler(Looper.getMainLooper())
        callTimerHandler?.post(object : Runnable {
            override fun run() {
                callDurationSec++
                callTimerHandler?.postDelayed(this, 1000)
            }
        })
    }

    @Composable
    private fun IncomingCallDialog(callerName: String, onAccept: () -> Unit, onDecline: () -> Unit) {
        AlertDialog(
            onDismissRequest = onDecline,
            icon = {
                Icon(Icons.Default.Phone, contentDescription = null, tint = ARAVAGreen, modifier = Modifier.size(48.dp))
            },
            title = { Text("مكالمة واردة", fontWeight = FontWeight.Bold) },
            text = { Text("مكالمة من $callerName") },
            confirmButton = {
                Button(onClick = onAccept, colors = ButtonDefaults.buttonColors(containerColor = ARAVAGreen)) {
                    Icon(Icons.Default.Call, contentDescription = null)
                    Spacer(Modifier.width(6.dp))
                    Text("رد", fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                Button(onClick = onDecline, colors = ButtonDefaults.buttonColors(containerColor = Color.Red)) {
                    Icon(Icons.Default.CallEnd, contentDescription = null)
                    Spacer(Modifier.width(6.dp))
                    Text("إنهاء", fontWeight = FontWeight.Bold, color = Color.White)
                }
            },
            containerColor = Color.White
        )
    }

    @Composable
    private fun ActiveCallScreen(
        callStateText: String,
        durationSec: Int,
        isMuted: Boolean,
        isSpeakerOn: Boolean,
        onToggleMute: () -> Unit,
        onToggleSpeaker: () -> Unit,
        onEndCall: () -> Unit
    ) {
        AlertDialog(
            onDismissRequest = {},
            title = {
                Text(
                    text = "المكالمة الصوتية",
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.fillMaxWidth(),
                    textAlign = TextAlign.Center
                )
            },
            text = {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    val minutes = durationSec / 60
                    val seconds = durationSec % 60
                    Text(
                        text = "%02d:%02d".format(minutes, seconds),
                        fontSize = 32.sp,
                        fontWeight = FontWeight.Bold,
                        color = if (callStateText == "المكالمة متصلة") ARAVAGreen else Color.Gray
                    )
                    Text(text = callStateText, fontSize = 14.sp, color = Color.Gray)
                    Spacer(Modifier.height(20.dp))
                    Row(
                        horizontalArrangement = Arrangement.SpaceEvenly,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Button(
                            onClick = onToggleMute,
                            colors = ButtonDefaults.buttonColors(containerColor = if (isMuted) Color.Red else Color.Gray),
                            modifier = Modifier.size(56.dp),
                            shape = CircleShape
                        ) {
                            Icon(if (isMuted) Icons.Default.MicOff else Icons.Default.Mic, contentDescription = null, tint = Color.White)
                        }
                        Button(
                            onClick = onToggleSpeaker,
                            colors = ButtonDefaults.buttonColors(containerColor = if (isSpeakerOn) ARAVAGreen else Color.Gray),
                            modifier = Modifier.size(56.dp),
                            shape = CircleShape
                        ) {
                            Icon(
                                if (isSpeakerOn) Icons.Default.VolumeUp else Icons.Default.VolumeDown,
                                contentDescription = null, tint = Color.White
                            )
                        }
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = onEndCall,
                    colors = ButtonDefaults.buttonColors(containerColor = Color.Red),
                    modifier = Modifier.fillMaxWidth().height(50.dp)
                ) {
                    Icon(Icons.Default.CallEnd, contentDescription = null, tint = Color.White)
                    Spacer(Modifier.width(6.dp))
                    Text("إنهاء المكالمة", fontWeight = FontWeight.Bold, color = Color.White)
                }
            },
            containerColor = Color.White
        )
    }
}
