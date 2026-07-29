package com.trendly.customer.ui.screens.home

import android.Manifest
import android.content.pm.PackageManager
import android.graphics.drawable.Drawable
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.core.*
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import com.trendly.customer.R
import com.trendly.customer.ui.theme.*
import com.trendly.customer.util.*
import org.osmdroid.config.Configuration
import org.osmdroid.tileprovider.tilesource.TileSourceFactory
import org.osmdroid.util.BoundingBox
import org.osmdroid.util.GeoPoint
import org.osmdroid.views.MapView
import org.osmdroid.views.overlay.Marker
import org.osmdroid.views.overlay.Polygon

@Composable
fun HomeScreen(
    customerName: String,
    credit: Double,
    onRequestRide: (pickupAddress: String, dropoffAddress: String, radiusKm: Int, fare: Double, commission: Double) -> Unit
) {
    val context = LocalContext.current
    val nouakchottCenter = GeoPoint(18.0735, -15.9582)
    var pickupAddress by remember { mutableStateOf("") }
    var dropoffAddress by remember { mutableStateOf("") }
    var searchRadius by remember { mutableFloatStateOf(5f) }
    var pickupLat by remember { mutableDoubleStateOf(18.0735) }
    var pickupLng by remember { mutableDoubleStateOf(-15.9582) }
    var hasLocationPermission by remember { mutableStateOf(false) }

    val radius = searchRadius.toInt()
    val fare = (100 + radius * 5).coerceIn(100, 200)
    val commission = (10 + radius).coerceIn(10, 30)

    val permLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { results ->
        hasLocationPermission = results[Manifest.permission.ACCESS_FINE_LOCATION] == true ||
                results[Manifest.permission.ACCESS_COARSE_LOCATION] == true
    }

    LaunchedEffect(Unit) {
        val fine = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
        val coarse = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
        if (!fine && !coarse) {
            permLauncher.launch(arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION))
        } else {
            hasLocationPermission = true
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(TrendlyPinkSurface)
    ) {
        // Top bar
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(bottomStart = 24.dp, bottomEnd = 24.dp),
            colors = CardDefaults.cardColors(containerColor = TrendlyPink),
            elevation = CardDefaults.cardElevation(8.dp)
        ) {
            Row(
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 14.dp).fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Image(
                        painter = painterResource(id = R.drawable.hamada3),
                        contentDescription = null,
                        modifier = Modifier
                            .size(44.dp)
                            .shadow(4.dp, CircleShape)
                            .clip(CircleShape)
                            .background(Color.White)
                            .padding(2.dp)
                    )
                    Spacer(modifier = Modifier.width(10.dp))
                    Column {
                        Text("مرحباً، $customerName", color = Color.White, fontSize = 16.sp, fontWeight = FontWeight.Bold)
                        Text(
                            "الرصيد: ${NumberFormatter.format(credit)} MRU",
                            color = if (credit >= 10) TrendlyGoldLight else Color.White.copy(alpha = 0.8f),
                            fontSize = 13.sp
                        )
                    }
                }
                Surface(
                    shape = CircleShape,
                    color = if (credit >= 10) TrendlyGreen else TrendlyRed,
                    modifier = Modifier.size(12.dp)
                ) {}
            }
        }

        // Map
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f)
                .padding(12.dp)
                .clip(RoundedCornerShape(20.dp))
                .shadow(6.dp, RoundedCornerShape(20.dp))
        ) {
            AndroidView(
                factory = { ctx ->
                    Configuration.getInstance().userAgentValue = ctx.packageName
                    MapView(ctx).apply {
                        setTileSource(TileSourceFactory.MAPNIK)
                        controller.setZoom(14.0)
                        controller.setCenter(nouakchottCenter)
                        setMinZoomLevel(12.0)
                        setMaxZoomLevel(18.0)

                        val marker = Marker(this).apply {
                            position = nouakchottCenter
                            setAnchor(Marker.ANCHOR_CENTER, Marker.ANCHOR_CENTER)
                            title = "موقعك"
                            snippet = "نقطة الانطلاق"
                            icon = ContextCompat.getDrawable(ctx, R.drawable.ic_customer_marker)
                                ?: resources.getDrawable(android.R.drawable.star_on)
                        }
                        overlays.add(marker)

                        val circle = Polygon().apply {
                            val points = mutableListOf<GeoPoint>()
                            val radiusMeters = searchRadius * 1000.0
                            for (i in 0 until 64) {
                                val angle = Math.toRadians((i * 360.0 / 64))
                                points.add(GeoPoint(
                                    nouakchottCenter.latitude + radiusMeters * Math.cos(angle) / 111320.0,
                                    nouakchottCenter.longitude + radiusMeters * Math.sin(angle) / (111320.0 * Math.cos(Math.toRadians(nouakchottCenter.latitude)))
                                ))
                            }
                            this.points = points
                            fillColor = TrendlyPink.copy(alpha = 0.15f).toArgb()
                            outlinePaint.color = TrendlyPink.toArgb()
                            outlinePaint.strokeWidth = 3f
                        }
                        overlays.add(circle)

                        setMultiTouchControls(true)
                    }
                },
                modifier = Modifier.fillMaxSize()
            )
        }

        // Bottom card
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp)
                .padding(bottom = 12.dp),
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            elevation = CardDefaults.cardElevation(8.dp)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                OutlinedTextField(
                    value = pickupAddress, onValueChange = { pickupAddress = it },
                    label = { Text("من أين؟") },
                    leadingIcon = { Icon(Icons.Default.LocationOn, null, tint = TrendlyGreen) },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    singleLine = true
                )

                Spacer(modifier = Modifier.height(8.dp))

                OutlinedTextField(
                    value = dropoffAddress, onValueChange = { dropoffAddress = it },
                    label = { Text("إلى أين؟") },
                    leadingIcon = { Icon(Icons.Default.Flag, null, tint = TrendlyRed) },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    singleLine = true
                )

                Spacer(modifier = Modifier.height(12.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("نطاق البحث:", fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = TrendlyTextPrimary)
                    Text("${searchRadius.toInt()} كم", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = TrendlyPink)
                }

                Slider(
                    value = searchRadius,
                    onValueChange = { searchRadius = it },
                    valueRange = 1f..20f,
                    steps = 18,
                    colors = SliderDefaults.colors(
                        thumbColor = TrendlyPink,
                        activeTrackColor = TrendlyPink,
                        inactiveTrackColor = TrendlyPinkLight
                    ),
                    modifier = Modifier.fillMaxWidth()
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text("1 كم", fontSize = 11.sp, color = TrendlyGray)
                    Text("10 كم", fontSize = 11.sp, color = TrendlyGray)
                    Text("20 كم", fontSize = 11.sp, color = TrendlyGray)
                }

                Spacer(modifier = Modifier.height(8.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("الأجرة", fontSize = 12.sp, color = TrendlyTextSecondary)
                        Text("${NumberFormatter.format(fare)} MRU", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = TrendlyGold)
                    }
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("عمولة الخدمة", fontSize = 12.sp, color = TrendlyTextSecondary)
                        Text("${NumberFormatter.format(commission)} MRU", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = TrendlyPink)
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                Button(
                    onClick = {
                        if (pickupAddress.isBlank()) pickupAddress = "موقعي الحالي"
                        onRequestRide(pickupAddress, dropoffAddress, radius, fare.toDouble(), commission.toDouble())
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(56.dp),
                    shape = RoundedCornerShape(16.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = TrendlyPink),
                    enabled = dropoffAddress.isNotBlank() && credit >= 10
                ) {
                    Icon(Icons.Default.Send, null, modifier = Modifier.size(20.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("اطلب رحلة", fontSize = 18.sp, fontWeight = FontWeight.Bold)
                }

                if (credit < 10) {
                    Spacer(modifier = Modifier.height(4.dp))
                    Text("رصيدك غير كافٍ. الحد الأدنى 10 MRU.", color = TrendlyRed, fontSize = 12.sp, modifier = Modifier.align(Alignment.CenterHorizontally))
                }
            }
        }
    }
}
