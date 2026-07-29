package com.khalily.driver.ui.screens.home

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import com.khalily.driver.R
import com.khalily.driver.service.DriverLocationService
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.ListenerRegistration
import com.khalily.driver.ui.theme.*
import com.khalily.driver.util.NumberFormatter
import com.khalily.driver.util.PrefsManager
import org.osmdroid.config.Configuration
import org.osmdroid.tileprovider.tilesource.TileSourceFactory
import org.osmdroid.util.BoundingBox
import org.osmdroid.util.GeoPoint
import org.osmdroid.views.MapView

private val NOUAKCHOTT_CENTER = GeoPoint(18.0735, -15.9582)
private val NOUAKCHOTT_BOUNDS = BoundingBox(
    18.22, -15.75,
    17.92, -16.18
)

@Composable
fun DriverHomeScreen(
    onNavigateToSettings: () -> Unit = {},
    onNavigateToMessages: () -> Unit = {},
    onNavigateToPromotions: () -> Unit = {},
    onNavigateToShop: () -> Unit = {}
) {
    val context = LocalContext.current
    val driverId = PrefsManager.getDriverId(context) ?: ""
    var isOnline by remember { mutableStateOf(PrefsManager.isOnline(context)) }
    var driverCredit by remember { mutableDoubleStateOf(0.0) }
    var showCreditAlert by remember { mutableStateOf(false) }
    var unreadCount by remember { mutableIntStateOf(0) }
    var hasLocationPermission by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(
                context, Manifest.permission.ACCESS_FINE_LOCATION
            ) == PackageManager.PERMISSION_GRANTED
        )
    }

    // Listen for unread messages
    DisposableEffect(driverId) {
        if (driverId.isEmpty()) return@DisposableEffect onDispose {}
        val db = FirebaseFirestore.getInstance()
        var msgListener: ListenerRegistration? = null
        msgListener = db.collection("messages")
            .whereArrayContains("recipients", driverId)
            .addSnapshotListener { snapshot, _ ->
                if (snapshot == null) return@addSnapshotListener
                val unread = snapshot.documents.count { doc ->
                    @Suppress("UNCHECKED_CAST")
                    val readBy = doc.get("readBy") as? List<String> ?: emptyList()
                    driverId !in readBy
                }
                unreadCount = unread
            }
        onDispose {
            msgListener?.remove()
        }
    }

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
        targetValue = if (isOnline) Color(0xFF00C853) else Color(0xFFB0BEC5),
        label = "onlineColor"
    )

    Box(modifier = Modifier.fillMaxSize()) {
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

        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
                .shadow(8.dp, RoundedCornerShape(20.dp)),
            shape = RoundedCornerShape(20.dp),
            colors = CardDefaults.cardColors(containerColor = KhalilyNavy)
        ) {
            Column(
                modifier = Modifier.padding(20.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .size(50.dp)
                            .clip(RoundedCornerShape(14.dp))
                            .border(2.dp, KhalilyGold, RoundedCornerShape(14.dp))
                            .background(Color.White),
                        contentAlignment = Alignment.Center
                    ) {
                        Image(
                            painter = painterResource(id = R.drawable.trendly1),
                            contentDescription = "Khalily",
                            modifier = Modifier
                                .size(42.dp)
                                .clip(RoundedCornerShape(12.dp))
                        )
                    }
                    Spacer(modifier = Modifier.width(12.dp))
                    Text(
                        text = "مرحباً، ${PrefsManager.getDriverName(context)}",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        color = KhalilyGold
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))
                HorizontalDivider(color = Color.White.copy(alpha = 0.2f))
                Spacer(modifier = Modifier.height(16.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.AccountBalanceWallet,
                            contentDescription = null,
                            tint = KhalilyGold,
                            modifier = Modifier.size(22.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "الرصيد: ",
                            fontSize = 15.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = Color.White.copy(alpha = 0.8f)
                        )
                        Text(
                            text = "${NumberFormatter.format(driverCredit)} MRU",
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold,
                            color = if (driverCredit > 0) Color(0xFF81C784) else Color(0xFFEF9A9A)
                        )
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))
                HorizontalDivider(color = Color.White.copy(alpha = 0.2f))
                Spacer(modifier = Modifier.height(16.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.SignalCellularAlt,
                            contentDescription = null,
                            tint = if (isOnline) Color(0xFF81C784) else Color(0xFFEF9A9A),
                            modifier = Modifier.size(20.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = if (isOnline) "متصل — جاهز للرحلات" else "غير متصل",
                            fontSize = 14.sp,
                            color = if (isOnline) Color(0xFF81C784) else Color(0xFFEF9A9A),
                            fontWeight = FontWeight.SemiBold
                        )
                    }

                    Row {
                        // Messages icon with badge
                        Box {
                            IconButton(onClick = onNavigateToMessages) {
                                Icon(
                                    imageVector = Icons.Default.Email,
                                    contentDescription = "الرسائل",
                                    tint = KhalilyGold,
                                    modifier = Modifier.size(24.dp)
                                )
                            }
                            if (unreadCount > 0) {
                                Surface(
                                    modifier = Modifier
                                        .align(Alignment.TopEnd)
                                        .padding(end = 2.dp, top = 2.dp)
                                        .size(16.dp),
                                    shape = CircleShape,
                                    color = Color(0xFFE53935)
                                ) {
                                    Text(
                                        text = if (unreadCount > 9) "9+" else "$unreadCount",
                                        color = Color.White,
                                        fontSize = 9.sp,
                                        fontWeight = FontWeight.Bold,
                                        textAlign = TextAlign.Center,
                                        modifier = Modifier.align(Alignment.Center)
                                    )
                                }
                            }
                        }
                        IconButton(onClick = onNavigateToPromotions) {
                            Icon(
                                imageVector = Icons.Default.Info,
                                contentDescription = "العروض",
                                tint = KhalilyGold,
                                modifier = Modifier.size(24.dp)
                            )
                        }
                        IconButton(onClick = onNavigateToShop) {
                            Icon(
                                imageVector = Icons.Default.ShoppingCart,
                                contentDescription = "المتجر",
                                tint = KhalilyGold,
                                modifier = Modifier.size(24.dp)
                            )
                        }
                        IconButton(onClick = onNavigateToSettings) {
                            Icon(
                                imageVector = Icons.Default.Settings,
                                contentDescription = "الإعدادات",
                                tint = KhalilyGold,
                                modifier = Modifier.size(24.dp)
                            )
                        }
                    }
                }
            }
        }

        Button(
            onClick = {
                if (!isOnline && driverCredit <= 0) {
                    showCreditAlert = true
                    return@Button
                }
                isOnline = !isOnline
                PrefsManager.setOnlineStatus(context, isOnline)

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
                .padding(24.dp)
                .shadow(8.dp, RoundedCornerShape(28.dp)),
            colors = ButtonDefaults.buttonColors(
                containerColor = if (isOnline) KhalilyError else KhalilyNavy
            ),
            shape = RoundedCornerShape(28.dp),
            contentPadding = PaddingValues(horizontal = 36.dp, vertical = 18.dp)
        ) {
            Icon(
                imageVector = Icons.Default.PowerSettingsNew,
                contentDescription = null,
                tint = if (isOnline) Color.White else KhalilyGold,
                modifier = Modifier.size(24.dp)
            )
            Spacer(modifier = Modifier.width(12.dp))
            Text(
                text = if (isOnline) "إيقاف الخدمة" else "تشغيل الخدمة",
                color = if (isOnline) Color.White else KhalilyGold,
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold
            )
        }
    }

    if (showCreditAlert) {
        AlertDialog(
            onDismissRequest = { showCreditAlert = false },
            title = {
                Text(
                    text = "رصيد غير كافٍ",
                    fontWeight = FontWeight.Bold,
                    color = KhalilyTextPrimary
                )
            },
            text = {
                Text(
                    text = "رصيدك غير كافٍ لاستلام الطلبات. يرجى مراجعة الإدارة لشحن الرصيد.",
                    color = KhalilyTextSecondary
                )
            },
            confirmButton = {
                Button(
                    onClick = { showCreditAlert = false },
                    colors = ButtonDefaults.buttonColors(containerColor = KhalilyTurquoise),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text("حسناً")
                }
            }
        )
    }
}
