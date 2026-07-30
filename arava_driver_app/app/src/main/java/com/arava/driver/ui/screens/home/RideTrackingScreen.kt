package com.arava.driver.ui.screens.home

import android.graphics.Color as AndroidColor
import android.media.MediaPlayer
import com.arava.driver.R
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.*
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import com.google.android.gms.location.LocationServices
import com.google.firebase.firestore.FirebaseFirestore
import com.arava.driver.ui.theme.*
import com.arava.driver.util.PrefsManager
import kotlinx.coroutines.delay
import org.osmdroid.config.Configuration
import org.osmdroid.tileprovider.tilesource.TileSourceFactory
import org.osmdroid.util.GeoPoint
import org.osmdroid.views.MapView
import org.osmdroid.views.overlay.Marker
import org.osmdroid.views.overlay.Polyline

enum class RidePhase {
    NAVIGATING_TO_PICKUP,
    AT_PICKUP,
    NAVIGATING_TO_DROPOFF,
    COMPLETED
}

private const val TIMER_PICKUP_ARRIVAL_SEC = 25 * 60
private const val TIMER_RIDE_START_SEC = 10 * 60
private const val TIMER_RIDE_COMPLETE_SEC = 15 * 60
private const val REMINDER_WARN_SEC = 5 * 60
private const val REMINDER_URGENT_SEC = 2 * 60

@Composable
fun RideTrackingScreen(
    rideData: Map<String, Any>,
    onRideCompleted: (fare: Double, commission: Double) -> Unit,
    onDismiss: () -> Unit,
    onVoipCall: (() -> Unit)? = null
) {
    val context = LocalContext.current
    var ridePhase by remember { mutableStateOf(RidePhase.AT_PICKUP) }

    val pickupLat = rideData["pickupLat"]?.toString()?.toDoubleOrNull() ?: 18.0735
    val pickupLng = rideData["pickupLng"]?.toString()?.toDoubleOrNull() ?: -15.9582
    val dropoffLat = rideData["dropoffLat"]?.toString()?.toDoubleOrNull() ?: pickupLat
    val dropoffLng = rideData["dropoffLng"]?.toString()?.toDoubleOrNull() ?: pickupLng
    val fare = rideData["fare"]?.toString()?.toDoubleOrNull() ?: 0.0
    val commissionPct = rideData["commissionPercent"]?.toString()?.toDoubleOrNull() ?: 10.0
    val commission = Math.round(fare * commissionPct / 100).toDouble()
    val passengerPhone = rideData["passengerPhone"]?.toString() ?: ""
    val passengerName = rideData["passengerName"]?.toString() ?: "الزبون"
    val pickupAddress = rideData["pickupAddress"]?.toString() ?: ""
    val dropoffAddress = rideData["dropoffAddress"]?.toString() ?: ""
    val rideId = rideData["rideId"]?.toString() ?: ""

    val maxTimeSeconds = when (ridePhase) {
        RidePhase.NAVIGATING_TO_PICKUP -> TIMER_PICKUP_ARRIVAL_SEC
        RidePhase.AT_PICKUP -> TIMER_RIDE_START_SEC
        RidePhase.NAVIGATING_TO_DROPOFF -> TIMER_RIDE_COMPLETE_SEC
        RidePhase.COMPLETED -> 0
    }

    var timeRemaining by remember { mutableIntStateOf(maxTimeSeconds) }
    var reminderPlayed by remember { mutableStateOf(false) }
    var urgentPlayed by remember { mutableStateOf(false) }
    var showAutoCompleteDialog by remember { mutableStateOf(false) }

    LaunchedEffect(ridePhase) {
        if (ridePhase == RidePhase.COMPLETED) return@LaunchedEffect
        timeRemaining = maxTimeSeconds
        reminderPlayed = false
        urgentPlayed = false

        val db = FirebaseFirestore.getInstance()
        val driverId = PrefsManager.getDriverId(context) ?: ""
        if (rideId.isNotEmpty() && driverId.isNotEmpty()) {
            val phaseName = when (ridePhase) {
                RidePhase.NAVIGATING_TO_PICKUP -> "navigating_to_pickup"
                RidePhase.AT_PICKUP -> "at_pickup"
                RidePhase.NAVIGATING_TO_DROPOFF -> "navigating_to_dropoff"
                else -> "completed"
            }
            db.collection("rides").document(rideId)
                .update(
                    mapOf(
                        "timerPhase" to phaseName,
                        "timerStartedAt" to com.google.firebase.firestore.FieldValue.serverTimestamp(),
                        "timerMaxSeconds" to maxTimeSeconds
                    )
                )
        }

        while (timeRemaining > 0 && ridePhase != RidePhase.COMPLETED) {
            delay(1000)
            timeRemaining--

            if (timeRemaining == REMINDER_WARN_SEC && !reminderPlayed) {
                reminderPlayed = true
                try {
                    val mp = MediaPlayer.create(context, R.raw.soundreality_notification_tone)
                    mp?.setOnCompletionListener { player -> player.release() }
                    mp?.start()
                } catch (_: Exception) {}
            }

            if (timeRemaining == REMINDER_URGENT_SEC && !urgentPlayed) {
                urgentPlayed = true
                try {
                    val mp = MediaPlayer.create(context, R.raw.soundreality_notification_tone)
                    mp?.setOnCompletionListener { player -> player.release() }
                    mp?.start()
                } catch (_: Exception) {}
            }

            if (timeRemaining <= 0) {
                showAutoCompleteDialog = true
            }
        }
    }

    val timerColor = when {
        timeRemaining > maxTimeSeconds * 0.5 -> ARAVAGreen
        timeRemaining > maxTimeSeconds * 0.2 -> ARAVAGold
        else -> ARAVAError
    }

    Column(modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState())) {
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            shape = RoundedCornerShape(20.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            elevation = CardDefaults.cardElevation(defaultElevation = 6.dp)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                        AnimatedContent(targetState = ridePhase, label = "phaseIcon", transitionSpec = { fadeIn() togetherWith fadeOut() }) { phase ->
                            Box(
                                modifier = Modifier.size(40.dp).background(
                                    when (phase) {
                                        RidePhase.NAVIGATING_TO_PICKUP -> ARAVATurquoiseSurface
                                        RidePhase.AT_PICKUP -> ARAVAGreenSurface
                                        RidePhase.NAVIGATING_TO_DROPOFF -> ARAVAGoldLight
                                        RidePhase.COMPLETED -> ARAVAGreenSurface
                                    },
                                    RoundedCornerShape(12.dp)
                                ),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    imageVector = when (phase) {
                                        RidePhase.NAVIGATING_TO_PICKUP -> Icons.Default.Navigation
                                        RidePhase.AT_PICKUP -> Icons.Default.PersonPin
                                        RidePhase.NAVIGATING_TO_DROPOFF -> Icons.Default.Place
                                        RidePhase.COMPLETED -> Icons.Default.CheckCircle
                                    },
                                    contentDescription = null,
                                    tint = when (phase) {
                                        RidePhase.NAVIGATING_TO_PICKUP -> ARAVATurquoise
                                        RidePhase.AT_PICKUP -> ARAVAGreen
                                        RidePhase.NAVIGATING_TO_DROPOFF -> ARAVAGold
                                        RidePhase.COMPLETED -> ARAVAGreen
                                    },
                                    modifier = Modifier.size(22.dp)
                                )
                            }
                        }
                        Spacer(modifier = Modifier.width(10.dp))
                        Column {
                            AnimatedContent(targetState = ridePhase, label = "phaseTitle", transitionSpec = { fadeIn() togetherWith fadeOut() }) { phase ->
                                Text(
                                    text = when (phase) {
                                        RidePhase.NAVIGATING_TO_PICKUP -> "الوصول للزبون"
                                        RidePhase.AT_PICKUP -> "وصلت للزبون"
                                        RidePhase.NAVIGATING_TO_DROPOFF -> "الوجهة النهائية"
                                        RidePhase.COMPLETED -> "اكتملت الرحلة"
                                    },
                                    fontSize = 16.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = ARAVANavy
                                )
                            }
                            Text(text = passengerName, fontSize = 12.sp, color = ARAVATextSecondary)
                        }
                    }

                    if (ridePhase != RidePhase.COMPLETED) {
                        val minutes = timeRemaining / 60
                        val seconds = timeRemaining % 60
                        Surface(
                            shape = RoundedCornerShape(14.dp),
                            color = timerColor.copy(alpha = 0.1f)
                        ) {
                            Column(
                                modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp),
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                Text(
                                    text = "%d:%02d".format(minutes, seconds),
                                    fontSize = 24.sp,
                                    fontWeight = FontWeight.ExtraBold,
                                    color = timerColor
                                )
                                Text(
                                    text = "متبقي",
                                    fontSize = 9.sp,
                                    color = timerColor,
                                    fontWeight = FontWeight.Medium
                                )
                            }
                        }
                    } else {
                        Box(
                            modifier = Modifier
                                .size(44.dp)
                                .background(ARAVAGreenSurface, CircleShape),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(Icons.Default.CheckCircle, contentDescription = null, tint = ARAVAGreen, modifier = Modifier.size(28.dp))
                        }
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))
                HorizontalDivider(color = Color(0xFFEEEEEE))
                Spacer(modifier = Modifier.height(12.dp))

                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
                    Box(
                        modifier = Modifier.size(28.dp).background(ARAVATurquoiseSurface, RoundedCornerShape(8.dp)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(Icons.Default.PlayArrow, contentDescription = null, tint = ARAVATurquoise, modifier = Modifier.size(14.dp))
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    Column {
                        Text("نقطة الانطلاق", fontSize = 10.sp, color = ARAVATextSecondary)
                        Text(pickupAddress.ifEmpty { "موقع الزبون" }, fontSize = 12.sp, fontWeight = FontWeight.Medium, color = ARAVATextPrimary)
                    }
                }
                if (dropoffAddress.isNotEmpty()) {
                    Spacer(modifier = Modifier.height(8.dp))
                    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
                        Box(
                            modifier = Modifier.size(28.dp).background(ARAVAErrorSurface, RoundedCornerShape(8.dp)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(Icons.Default.Place, contentDescription = null, tint = ARAVAError, modifier = Modifier.size(14.dp))
                        }
                        Spacer(modifier = Modifier.width(8.dp))
                        Column {
                            Text("الوجهة", fontSize = 10.sp, color = ARAVATextSecondary)
                            Text(dropoffAddress, fontSize = 12.sp, fontWeight = FontWeight.Medium, color = ARAVATextPrimary)
                        }
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))
                HorizontalDivider(color = Color(0xFFEEEEEE))
                Spacer(modifier = Modifier.height(12.dp))

                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Column {
                        Text("السعر", fontSize = 10.sp, color = ARAVATextSecondary)
                        Text("$fare MRU", fontSize = 16.sp, fontWeight = FontWeight.ExtraBold, color = ARAVAGreen)
                    }
                    Column(horizontalAlignment = Alignment.End) {
                        Text("العمولة", fontSize = 10.sp, color = ARAVATextSecondary)
                        Text("$commission MRU", fontSize = 16.sp, fontWeight = FontWeight.ExtraBold, color = ARAVAError)
                    }
                }
            }
        }

        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(300.dp)
                .padding(horizontal = 12.dp)
        ) {
            AndroidView(
                factory = { ctx ->
                    Configuration.getInstance().userAgentValue = ctx.packageName
                    MapView(ctx).apply {
                        setTileSource(TileSourceFactory.MAPNIK)
                        setMultiTouchControls(true)
                        controller.setZoom(15.0)

                        val targetPoint = when (ridePhase) {
                            RidePhase.NAVIGATING_TO_PICKUP, RidePhase.AT_PICKUP ->
                                GeoPoint(pickupLat, pickupLng)
                            RidePhase.NAVIGATING_TO_DROPOFF ->
                                GeoPoint(dropoffLat, dropoffLng)
                            else -> GeoPoint(pickupLat, pickupLng)
                        }
                        controller.setCenter(targetPoint)

                        val pickupIcon = Marker(this).apply {
                            position = GeoPoint(pickupLat, pickupLng)
                            setAnchor(Marker.ANCHOR_CENTER, Marker.ANCHOR_BOTTOM)
                            title = "نقطة الانطلاق"
                            snippet = pickupAddress
                        }
                        overlays.add(pickupIcon)

                        if (dropoffLat != pickupLat || dropoffLng != pickupLng) {
                            val dropoffIcon = Marker(this).apply {
                                position = GeoPoint(dropoffLat, dropoffLng)
                                setAnchor(Marker.ANCHOR_CENTER, Marker.ANCHOR_BOTTOM)
                                title = "الوجهة"
                                snippet = dropoffAddress
                            }
                            overlays.add(dropoffIcon)
                        }

                        val points = when (ridePhase) {
                            RidePhase.NAVIGATING_TO_PICKUP, RidePhase.AT_PICKUP -> {
                                val currentLoc = getLastKnownLocation(ctx)
                                if (currentLoc != null) {
                                    listOf(
                                        GeoPoint(currentLoc.latitude, currentLoc.longitude),
                                        GeoPoint(pickupLat, pickupLng)
                                    )
                                } else {
                                    listOf(GeoPoint(pickupLat, pickupLng))
                                }
                            }
                            RidePhase.NAVIGATING_TO_DROPOFF -> {
                                listOf(
                                    GeoPoint(pickupLat, pickupLng),
                                    GeoPoint(dropoffLat, dropoffLng)
                                )
                            }
                            else -> emptyList()
                        }

                        if (points.size >= 2) {
                            val polyline = Polyline().apply {
                                setPoints(points)
                                outlinePaint.color = AndroidColor.parseColor("#00838F")
                                outlinePaint.strokeWidth = 8f
                                outlinePaint.isAntiAlias = true
                            }
                            overlays.add(polyline)
                        }
                    }
                },
                modifier = Modifier.fillMaxSize(),
                update = { mapView ->
                    val targetPoint = when (ridePhase) {
                        RidePhase.NAVIGATING_TO_PICKUP, RidePhase.AT_PICKUP ->
                            GeoPoint(pickupLat, pickupLng)
                        RidePhase.NAVIGATING_TO_DROPOFF ->
                            GeoPoint(dropoffLat, dropoffLng)
                        else -> GeoPoint(pickupLat, pickupLng)
                    }
                    mapView.controller.animateTo(targetPoint)
                }
            )
        }

        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            shape = RoundedCornerShape(20.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            elevation = CardDefaults.cardElevation(defaultElevation = 6.dp)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                if (ridePhase != RidePhase.COMPLETED && timeRemaining <= REMINDER_WARN_SEC) {
                    Surface(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        color = Color(0xFFFFF3E0)
                    ) {
                        Row(
                            modifier = Modifier.padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Box(
                                modifier = Modifier.size(32.dp).background(Color(0xFFEF6C00).copy(alpha = 0.15f), CircleShape),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(Icons.Default.Warning, contentDescription = null, tint = Color(0xFFEF6C00), modifier = Modifier.size(18.dp))
                            }
                            Spacer(modifier = Modifier.width(10.dp))
                            Column {
                                Text("الوقت ينفد!", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color(0xFFEF6C00))
                                Text(
                                    if (timeRemaining <= REMINDER_URGENT_SEC) "بضع دقائق متبقية فقط" else "باقي ${timeRemaining / 60} دقائق",
                                    fontSize = 11.sp, color = Color(0xFFEF6C00).copy(alpha = 0.8f)
                                )
                            }
                        }
                    }
                    Spacer(modifier = Modifier.height(12.dp))
                }

                AnimatedContent(targetState = ridePhase, label = "phaseActions", transitionSpec = { fadeIn() togetherWith fadeOut() }) { phase ->
                    Column {
                        when (phase) {
                            RidePhase.NAVIGATING_TO_PICKUP -> {
                                Button(
                                    onClick = {
                                        val uri = android.net.Uri.parse("google.navigation:q=$pickupLat,$pickupLng&mode=d")
                                        val intent = android.content.Intent(android.content.Intent.ACTION_VIEW, uri)
                                        intent.setPackage("com.google.android.apps.maps")
                                        try { context.startActivity(intent) } catch (_: Exception) {
                                            context.startActivity(android.content.Intent(android.content.Intent.ACTION_VIEW, android.net.Uri.parse("https://www.google.com/maps/dir/?api=1&destination=$pickupLat,$pickupLng")))
                                        }
                                    },
                                    modifier = Modifier.fillMaxWidth().height(50.dp),
                                    shape = RoundedCornerShape(14.dp),
                                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1565C0))
                                ) {
                                    Icon(Icons.Default.Navigation, contentDescription = null, modifier = Modifier.size(20.dp), tint = Color.White)
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text("الملاحة لنقطة الانطلاق", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = Color.White)
                                }

                                if (passengerPhone.isNotEmpty()) {
                                    Spacer(modifier = Modifier.height(10.dp))
                                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                                        OutlinedButton(
                                            onClick = {
                                                context.startActivity(android.content.Intent(android.content.Intent.ACTION_DIAL, android.net.Uri.parse("tel:$passengerPhone")))
                                            },
                                            modifier = Modifier.weight(1f).height(46.dp),
                                            shape = RoundedCornerShape(12.dp),
                                            colors = ButtonDefaults.outlinedButtonColors(contentColor = ARAVATurquoise)
                                        ) {
                                            Icon(Icons.Default.Phone, contentDescription = null, modifier = Modifier.size(16.dp))
                                            Spacer(modifier = Modifier.width(6.dp))
                                            Text("اتصال", fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                                        }
                                        if (onVoipCall != null) {
                                            Button(
                                                onClick = onVoipCall,
                                                modifier = Modifier.weight(1f).height(46.dp),
                                                shape = RoundedCornerShape(12.dp),
                                                colors = ButtonDefaults.buttonColors(containerColor = ARAVAGreen)
                                            ) {
                                                Icon(Icons.Default.VoiceChat, contentDescription = null, modifier = Modifier.size(16.dp), tint = Color.White)
                                                Spacer(modifier = Modifier.width(6.dp))
                                                Text("VoIP", fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = Color.White)
                                            }
                                        }
                                    }
                                }

                                Spacer(modifier = Modifier.height(12.dp))
                                HorizontalDivider(color = Color(0xFFEEEEEE))
                                Spacer(modifier = Modifier.height(12.dp))

                                Button(
                                    onClick = { ridePhase = RidePhase.AT_PICKUP },
                                    modifier = Modifier.fillMaxWidth().height(54.dp),
                                    shape = RoundedCornerShape(14.dp),
                                    colors = ButtonDefaults.buttonColors(containerColor = ARAVAGold),
                                    elevation = ButtonDefaults.buttonElevation(defaultElevation = 4.dp)
                                ) {
                                    Icon(Icons.Default.CheckCircle, contentDescription = null, modifier = Modifier.size(22.dp), tint = Color.White)
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text("وصلت للزبون", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Color.White)
                                }
                            }

                            RidePhase.AT_PICKUP -> {
                                Box(
                                    modifier = Modifier.fillMaxWidth().background(ARAVAGreenSurface, RoundedCornerShape(12.dp)).padding(16.dp),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Icon(Icons.Default.PersonPin, contentDescription = null, tint = ARAVAGreen, modifier = Modifier.size(24.dp))
                                        Spacer(modifier = Modifier.width(10.dp))
                                        Column {
                                            Text("مرحباً بالزبون", fontSize = 12.sp, color = ARAVAGreen.copy(alpha = 0.7f))
                                            Text(passengerName, fontSize = 16.sp, fontWeight = FontWeight.Bold, color = ARAVANavy)
                                        }
                                    }
                                }

                                Spacer(modifier = Modifier.height(12.dp))

                                Button(
                                    onClick = { ridePhase = RidePhase.NAVIGATING_TO_DROPOFF },
                                    modifier = Modifier.fillMaxWidth().height(54.dp),
                                    shape = RoundedCornerShape(14.dp),
                                    colors = ButtonDefaults.buttonColors(containerColor = ARAVAGreenLight),
                                    elevation = ButtonDefaults.buttonElevation(defaultElevation = 4.dp)
                                ) {
                                    Icon(Icons.Default.Navigation, contentDescription = null, modifier = Modifier.size(22.dp), tint = Color.White)
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text("ابدأ الرحلة", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Color.White)
                                }
                            }

                            RidePhase.NAVIGATING_TO_DROPOFF -> {
                                Button(
                                    onClick = {
                                        val uri = android.net.Uri.parse("google.navigation:q=$dropoffLat,$dropoffLng&mode=d")
                                        val intent = android.content.Intent(android.content.Intent.ACTION_VIEW, uri)
                                        intent.setPackage("com.google.android.apps.maps")
                                        try { context.startActivity(intent) } catch (_: Exception) {
                                            context.startActivity(android.content.Intent(android.content.Intent.ACTION_VIEW, android.net.Uri.parse("https://www.google.com/maps/dir/?api=1&destination=$dropoffLat,$dropoffLng")))
                                        }
                                    },
                                    modifier = Modifier.fillMaxWidth().height(50.dp),
                                    shape = RoundedCornerShape(14.dp),
                                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1565C0))
                                ) {
                                    Icon(Icons.Default.Navigation, contentDescription = null, modifier = Modifier.size(20.dp), tint = Color.White)
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text("الملاحة للوجهة", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = Color.White)
                                }

                                Spacer(modifier = Modifier.height(12.dp))
                                HorizontalDivider(color = Color(0xFFEEEEEE))
                                Spacer(modifier = Modifier.height(12.dp))

                                Button(
                                    onClick = {
                                        ridePhase = RidePhase.COMPLETED
                                        onRideCompleted(fare, commission)
                                    },
                                    modifier = Modifier.fillMaxWidth().height(54.dp),
                                    shape = RoundedCornerShape(14.dp),
                                    colors = ButtonDefaults.buttonColors(containerColor = ARAVAGreenLight),
                                    elevation = ButtonDefaults.buttonElevation(defaultElevation = 4.dp)
                                ) {
                                    Icon(Icons.Default.Flag, contentDescription = null, modifier = Modifier.size(22.dp), tint = Color.White)
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text("إنهاء الرحلة", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Color.White)
                                }
                            }

                            RidePhase.COMPLETED -> {
                                Column(
                                    horizontalAlignment = Alignment.CenterHorizontally,
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Box(
                                        modifier = Modifier.size(64.dp).background(ARAVAGreenSurface, RoundedCornerShape(18.dp)),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Icon(Icons.Default.CheckCircle, contentDescription = null, tint = ARAVAGreen, modifier = Modifier.size(40.dp))
                                    }
                                    Spacer(modifier = Modifier.height(10.dp))
                                    Text("تم إنهاء الرحلة بنجاح!", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = ARAVAGreen)
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Text("السعر: $fare MRU | العمولة: $commission MRU | الصافي: ${fare - commission} MRU", fontSize = 13.sp, color = ARAVATextSecondary)
                                    Spacer(modifier = Modifier.height(16.dp))
                                    Button(
                                        onClick = onDismiss,
                                        modifier = Modifier.fillMaxWidth().height(50.dp),
                                        shape = RoundedCornerShape(14.dp),
                                        colors = ButtonDefaults.buttonColors(containerColor = ARAVATurquoise)
                                    ) {
                                        Text("العودة للخريطة", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = Color.White)
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    if (showAutoCompleteDialog) {
        AlertDialog(
            onDismissRequest = {
                if (rideId.isNotEmpty()) PrefsManager.markAutoCompleteSeen(context, rideId)
                showAutoCompleteDialog = false
                ridePhase = RidePhase.COMPLETED
                onRideCompleted(fare, commission)
            },
            icon = { Icon(Icons.Default.Info, contentDescription = null, tint = ARAVAGold, modifier = Modifier.size(40.dp)) },
            title = {
                Text("تم إنهاء الرحلة آلياً", fontWeight = FontWeight.Bold, textAlign = TextAlign.Center)
            },
            text = {
                Text(
                    text = "تم إنهاء إجراءات الرحلة تلقائياً بسبب تأخرك في إكمالها. تم احتساب السعر والعمولة بناءً على الرحلة الفعلية.",
                    textAlign = TextAlign.Center,
                    fontSize = 15.sp,
                    lineHeight = 24.sp
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (rideId.isNotEmpty()) PrefsManager.markAutoCompleteSeen(context, rideId)
                        showAutoCompleteDialog = false
                        ridePhase = RidePhase.COMPLETED
                        onRideCompleted(fare, commission)
                    },
                    modifier = Modifier.fillMaxWidth().height(48.dp),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = ARAVAGold)
                ) {
                    Text("حسناً", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Color.White)
                }
            },
            containerColor = Color.White
        )
    }
}

private fun getLastKnownLocation(context: android.content.Context): android.location.Location? {
    try {
        val client = LocationServices.getFusedLocationProviderClient(context)
        val task = client.lastLocation
        while (!task.isComplete) {
            Thread.sleep(50)
        }
        return task.result
    } catch (e: Exception) {
        return null
    }
}
