package com.khalily.driver.ui.screens.home

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.animateColorAsState
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import com.google.android.gms.location.LocationServices
import com.khalily.driver.service.DriverLocationService
import com.khalily.driver.ui.theme.*
import com.khalily.driver.util.PrefsManager
import org.osmdroid.config.Configuration
import org.osmdroid.tileprovider.tilesource.TileSourceFactory
import org.osmdroid.util.BoundingBox
import org.osmdroid.util.GeoPoint
import org.osmdroid.views.MapView
import org.osmdroid.views.overlay.Marker

private val NOUAKCHOTT_CENTER = GeoPoint(18.0735, -15.9582)
private val NOUAKCHOTT_BOUNDS = BoundingBox(
    18.22, -15.75,
    17.92, -16.18
)

@Composable
fun DriverHomeScreen(
    onNavigateToSettings: () -> Unit = {}
) {
    val context = LocalContext.current
    var isOnline by remember { mutableStateOf(PrefsManager.isOnline(context)) }
    var driverCredit by remember { mutableDoubleStateOf(0.0) }
    var showCreditAlert by remember { mutableStateOf(false) }
    var hasLocationPermission by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(
                context, Manifest.permission.ACCESS_FINE_LOCATION
            ) == PackageManager.PERMISSION_GRANTED
        )
    }

    // Fetch driver credit from Firebase on load
    LaunchedEffect(Unit) {
        val driverId = PrefsManager.getDriverId(context) ?: ""
        if (driverId.isNotEmpty()) {
            try {
                val db = com.google.firebase.firestore.FirebaseFirestore.getInstance()
                db.collection("drivers").document(driverId).get()
                    .addOnSuccessListener { doc ->
                        if (doc.exists()) {
                            driverCredit = doc.getDouble("credit") ?: 0.0
                        }
                    }
            } catch (_: Exception) {}
        }
    }

    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        hasLocationPermission = permissions[Manifest.permission.ACCESS_FINE_LOCATION] == true ||
                permissions[Manifest.permission.ACCESS_COARSE_LOCATION] == true
    }

    LaunchedEffect(Unit) {
        if (!hasLocationPermission) {
            permissionLauncher.launch(
                arrayOf(
                    Manifest.permission.ACCESS_FINE_LOCATION,
                    Manifest.permission.ACCESS_COARSE_LOCATION
                )
            )
        }
    }

    val onlineColor by animateColorAsState(
        targetValue = if (isOnline) KhalilyOnline else KhalilyOffline,
        label = "onlineColor"
    )

    Box(modifier = Modifier.fillMaxSize()) {
        // Map - centered on Nouakchott
        AndroidView(
            factory = { ctx ->
                Configuration.getInstance().userAgentValue = ctx.packageName
                MapView(ctx).apply {
                    setTileSource(TileSourceFactory.MAPNIK)
                    setMultiTouchControls(true)
                    controller.setZoom(13.0)
                    controller.setCenter(NOUAKCHOTT_CENTER)
                    setScrollableAreaLimitDouble(NOUAKCHOTT_BOUNDS)
                }
            },
            modifier = Modifier.fillMaxSize()
        )

        // Top status card
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            shape = RoundedCornerShape(20.dp),
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
                            text = "مرحباً، ${PrefsManager.getDriverName(context)}",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                modifier = Modifier
                                    .size(10.dp)
                                    .background(onlineColor, CircleShape)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = if (isOnline) "متاح للرحلات" else "غير متاح",
                                style = MaterialTheme.typography.bodyMedium,
                                color = onlineColor
                            )
                        }
                    }

                    Row(verticalAlignment = Alignment.CenterVertically) {
                        // Settings button
                        IconButton(onClick = onNavigateToSettings) {
                            Icon(
                                imageVector = Icons.Default.Settings,
                                contentDescription = "الإعدادات",
                                tint = KhalilyTextSecondary,
                                modifier = Modifier.size(24.dp)
                            )
                        }

                        // Credit display
                        Card(
                            shape = RoundedCornerShape(12.dp),
                            colors = CardDefaults.cardColors(
                                containerColor = if (driverCredit > 0) KhalilySuccess.copy(alpha = 0.1f)
                                else KhalilyError.copy(alpha = 0.1f)
                            )
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(
                                    imageVector = Icons.Default.AccountBalanceWallet,
                                    contentDescription = null,
                                    tint = if (driverCredit > 0) KhalilySuccess else KhalilyError,
                                    modifier = Modifier.size(18.dp)
                                )
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(
                                    text = "${String.format("%.0f", driverCredit)} MRU",
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = if (driverCredit > 0) KhalilySuccess else KhalilyError
                                )
                            }
                        }
                    }
                }
            }
        }

        // Bottom toggle button
        Button(
            onClick = {
                if (!isOnline && driverCredit <= 0) {
                    showCreditAlert = true
                    return@Button
                }
                isOnline = !isOnline
                PrefsManager.setOnlineStatus(context, isOnline)

                // Update isOnline in Firestore
                val driverId = PrefsManager.getDriverId(context)
                if (!driverId.isNullOrEmpty()) {
                    com.google.firebase.firestore.FirebaseFirestore.getInstance()
                        .collection("drivers").document(driverId)
                        .update("isOnline", isOnline)
                }

                val serviceIntent = Intent(context, DriverLocationService::class.java)
                if (isOnline) {
                    context.startForegroundService(serviceIntent)
                } else {
                    context.stopService(serviceIntent)
                }
            },
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(24.dp),
            colors = ButtonDefaults.buttonColors(
                containerColor = if (isOnline) KhalilyError else KhalilySuccess
            ),
            shape = RoundedCornerShape(28.dp),
            contentPadding = PaddingValues(horizontal = 32.dp, vertical = 16.dp)
        ) {
            Icon(
                imageVector = Icons.Default.PowerSettingsNew,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.surface,
                modifier = Modifier.size(24.dp)
            )
            Spacer(modifier = Modifier.width(12.dp))
            Text(
                text = if (isOnline) "إيقاف الخدمة" else "تشغيل الخدمة",
                color = MaterialTheme.colorScheme.surface,
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold
            )
        }
    }

    // Credit insufficient alert
    if (showCreditAlert) {
        AlertDialog(
            onDismissRequest = { showCreditAlert = false },
            title = {
                Text(
                    text = "رصيد غير كافٍ",
                    fontWeight = FontWeight.Bold
                )
            },
            text = {
                Text(
                    text = "رصيدك غير كافٍ لاستلام الطلبات، يرجى مراجعة الإدارة لشحن الرصيد."
                )
            },
            confirmButton = {
                Button(
                    onClick = { showCreditAlert = false },
                    colors = ButtonDefaults.buttonColors(containerColor = KhalilyGold)
                ) {
                    Text("حسناً")
                }
            }
        )
    }
}
