package com.khalily.driver.ui.screens.home

import android.Manifest
import android.content.pm.PackageManager
import android.graphics.Color as AndroidColor
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import com.google.android.gms.location.LocationServices
import com.khalily.driver.ui.theme.*
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

@Composable
fun RideTrackingScreen(
    rideData: Map<String, Any>,
    onRideCompleted: (fare: Double, commission: Double) -> Unit,
    onDismiss: () -> Unit
) {
    val context = LocalContext.current
    var ridePhase by remember { mutableStateOf(RidePhase.NAVIGATING_TO_PICKUP) }
    var showCallDialog by remember { mutableStateOf(false) }

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

    Column(modifier = Modifier.fillMaxSize()) {
        // Top info bar
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.surface.copy(alpha = 0.95f)
            ),
            elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Column {
                        Text(
                            text = when (ridePhase) {
                                RidePhase.NAVIGATING_TO_PICKUP -> "الوصول للزبون"
                                RidePhase.AT_PICKUP -> "وصلت للزبون"
                                RidePhase.NAVIGATING_TO_DROPOFF -> "الوجهة النهائية"
                                RidePhase.COMPLETED -> "اكتملت الرحلة"
                            },
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Bold,
                            color = KhalilyPrimaryDark
                        )
                        Text(
                            text = passengerName,
                            fontSize = 14.sp,
                            color = KhalilyTextSecondary
                        )
                    }
                    Card(
                        shape = RoundedCornerShape(10.dp),
                        colors = CardDefaults.cardColors(
                            containerColor = when (ridePhase) {
                                RidePhase.NAVIGATING_TO_PICKUP -> Color(0xFFE3F2FD)
                                RidePhase.AT_PICKUP -> Color(0xFFFFF8E1)
                                RidePhase.NAVIGATING_TO_DROPOFF -> Color(0xFFE8F5E9)
                                RidePhase.COMPLETED -> Color(0xFFF3E5F5)
                            }
                        )
                    ) {
                        Text(
                            text = when (ridePhase) {
                                RidePhase.NAVIGATING_TO_PICKUP -> "١/٢"
                                RidePhase.AT_PICKUP -> "٢/٢"
                                RidePhase.NAVIGATING_TO_DROPOFF -> "٢/٢"
                                RidePhase.COMPLETED -> "✓"
                            },
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Bold,
                            color = when (ridePhase) {
                                RidePhase.NAVIGATING_TO_PICKUP -> KhalilyPrimary
                                RidePhase.AT_PICKUP -> Color(0xFFF57F17)
                                RidePhase.NAVIGATING_TO_DROPOFF -> KhalilySuccess
                                RidePhase.COMPLETED -> Color(0xFF7B1FA2)
                            }
                        )
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))

                // Address info
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Icon(
                        imageVector = Icons.Default.PlayArrow,
                        contentDescription = null,
                        tint = KhalilyGold,
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = pickupAddress.ifEmpty { "نقطة الانطلاق" },
                        fontSize = 13.sp,
                        color = KhalilyTextSecondary
                    )
                }
                if (dropoffAddress.isNotEmpty()) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Icon(
                            imageVector = Icons.Default.Place,
                            contentDescription = null,
                            tint = KhalilyError,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = dropoffAddress,
                            fontSize = 13.sp,
                            color = KhalilyTextSecondary
                        )
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))

                // Fare info
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        text = "السعر: $fare MRU",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        color = KhalilyPrimary
                    )
                    Text(
                        text = "العمولة: $commission MRU",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        color = KhalilyError
                    )
                }
            }
        }

        // Map
        Box(
            modifier = Modifier
                .weight(1f)
                .fillMaxWidth()
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

                        // Pickup marker
                        val pickupIcon = Marker(this).apply {
                            position = GeoPoint(pickupLat, pickupLng)
                            setAnchor(Marker.ANCHOR_CENTER, Marker.ANCHOR_BOTTOM)
                            title = "نقطة الانطلاق"
                            snippet = pickupAddress
                        }
                        overlays.add(pickupIcon)

                        // Dropoff marker
                        if (dropoffLat != pickupLat || dropoffLng != pickupLng) {
                            val dropoffIcon = Marker(this).apply {
                                position = GeoPoint(dropoffLat, dropoffLng)
                                setAnchor(Marker.ANCHOR_CENTER, Marker.ANCHOR_BOTTOM)
                                title = "الوجهة"
                                snippet = dropoffAddress
                            }
                            overlays.add(dropoffIcon)
                        }

                        // Draw route line
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
                                outlinePaint.color = AndroidColor.parseColor("#1565C0")
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

        // Bottom action buttons
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.surface
            ),
            elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                when (ridePhase) {
                    RidePhase.NAVIGATING_TO_PICKUP -> {
                        // Call passenger button
                        if (passengerPhone.isNotEmpty()) {
                            OutlinedButton(
                                onClick = {
                                    val intent = android.content.Intent(
                                        android.content.Intent.ACTION_DIAL,
                                        android.net.Uri.parse("tel:$passengerPhone")
                                    )
                                    context.startActivity(intent)
                                },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(48.dp),
                                shape = RoundedCornerShape(12.dp),
                                colors = ButtonDefaults.outlinedButtonColors(
                                    contentColor = KhalilyPrimary
                                )
                            ) {
                                Icon(Icons.Default.Phone, contentDescription = null, modifier = Modifier.size(18.dp))
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("اتصل بالزبون", fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                            }
                            Spacer(modifier = Modifier.height(8.dp))
                        }

                        Button(
                            onClick = { ridePhase = RidePhase.AT_PICKUP },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(56.dp),
                            shape = RoundedCornerShape(14.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = KhalilyGold)
                        ) {
                            Icon(Icons.Default.CheckCircle, contentDescription = null, modifier = Modifier.size(24.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("وصلت للزبون", fontSize = 16.sp, fontWeight = FontWeight.Bold)
                        }
                    }

                    RidePhase.AT_PICKUP -> {
                        Text(
                            text = "مرحباً بالزبون $passengerName",
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold,
                            color = KhalilyPrimaryDark,
                            textAlign = TextAlign.Center,
                            modifier = Modifier.fillMaxWidth()
                        )
                        Spacer(modifier = Modifier.height(8.dp))

                        Button(
                            onClick = { ridePhase = RidePhase.NAVIGATING_TO_DROPOFF },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(56.dp),
                            shape = RoundedCornerShape(14.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = KhalilySuccess)
                        ) {
                            Icon(Icons.Default.Navigation, contentDescription = null, modifier = Modifier.size(24.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("ابدأ الرحلة", fontSize = 16.sp, fontWeight = FontWeight.Bold)
                        }
                    }

                    RidePhase.NAVIGATING_TO_DROPOFF -> {
                        Text(
                            text = "الوصول إلى: $dropoffAddress",
                            fontSize = 14.sp,
                            color = KhalilyTextSecondary,
                            textAlign = TextAlign.Center,
                            modifier = Modifier.fillMaxWidth()
                        )
                        Spacer(modifier = Modifier.height(8.dp))

                        Button(
                            onClick = {
                                ridePhase = RidePhase.COMPLETED
                                onRideCompleted(fare, commission)
                            },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(56.dp),
                            shape = RoundedCornerShape(14.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF7B1FA2))
                        ) {
                            Icon(Icons.Default.Flag, contentDescription = null, modifier = Modifier.size(24.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("إنهاء الرحلة", fontSize = 16.sp, fontWeight = FontWeight.Bold)
                        }
                    }

                    RidePhase.COMPLETED -> {
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Icon(
                                imageVector = Icons.Default.CheckCircle,
                                contentDescription = null,
                                tint = KhalilySuccess,
                                modifier = Modifier.size(48.dp)
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = "تم إنهاء الرحلة بنجاح!",
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Bold,
                                color = KhalilySuccess
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = "السعر: $fare MRU | العمولة: $commission MRU",
                                fontSize = 14.sp,
                                color = KhalilyTextSecondary
                            )
                            Spacer(modifier = Modifier.height(12.dp))
                            Button(
                                onClick = onDismiss,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(48.dp),
                                shape = RoundedCornerShape(12.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = KhalilyPrimary)
                            ) {
                                Text("العودة للخريطة", fontSize = 14.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }
        }
    }
}

private fun getLastKnownLocation(context: android.content.Context): android.location.Location? {
    try {
        val client = LocationServices.getFusedLocationProviderClient(context)
        var location: android.location.Location? = null
        client.lastLocation.addOnSuccessListener { loc -> location = loc }
        Thread.sleep(500)
        return location
    } catch (e: Exception) {
        return null
    }
}
