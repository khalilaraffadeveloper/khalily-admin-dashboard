package com.khalily.driver.ui.screens.settings

import android.content.Intent
import android.net.Uri
import androidx.compose.animation.animateContentSize
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.google.firebase.firestore.ListenerRegistration
import com.google.firebase.firestore.FirebaseFirestore
import com.khalily.driver.R
import com.khalily.driver.ui.theme.*
import com.khalily.driver.util.PrefsManager
import java.text.SimpleDateFormat
import java.util.*
import kotlinx.coroutines.launch

data class RideHistoryItem(
    val rideId: String = "",
    val passengerName: String = "",
    val pickupAddress: String = "",
    val dropoffAddress: String = "",
    val fare: Double = 0.0,
    val commission: Double = 0.0,
    val distanceKm: Double = 0.0,
    val status: String = "",
    val createdAt: String = "",
    val createdAtDate: Date? = null
)

private val DrawerNavy = Color(0xFF0B1849)
private val DrawerGold = Color(0xFFD4A843)
private val DrawerItemBg = Color(0x0DFFFFFF)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    onBack: () -> Unit = {},
    onLogout: () -> Unit = {}
) {
    val context = LocalContext.current
    val db = FirebaseFirestore.getInstance()
    val driverId = PrefsManager.getDriverId(context) ?: ""
    val scope = rememberCoroutineScope()
    val drawerState = rememberDrawerState(initialValue = DrawerValue.Closed)

    var rideHistory by remember { mutableStateOf<List<RideHistoryItem>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var selectedSection by remember { mutableIntStateOf(0) }
    var commissionPercent by remember { mutableDoubleStateOf(10.0) }

    val sectionTitles = listOf("الرحلات", "الرصيد", "التواصل", "نحن")
    val sectionIcons = listOf(
        Icons.Default.TwoWheeler,
        Icons.Default.AccountBalanceWallet,
        Icons.Default.Phone,
        Icons.Default.Info
    )

    DisposableEffect(Unit) {
        var listener: ListenerRegistration? = null
        var listener2: ListenerRegistration? = null
        val rideMap = mutableMapOf<String, com.google.firebase.firestore.DocumentSnapshot>()
        val relevantStatuses = setOf("accepted", "in_progress", "completed", "cancelled")

        fun buildHistory(defaultCommPct: Double) {
            val sdf = SimpleDateFormat("yyyy/MM/dd HH:mm", Locale.US)
            rideHistory = rideMap.values.filter { doc ->
                val status = doc.getString("status") ?: ""
                status in relevantStatuses
            }.mapNotNull { doc ->
                val finalFare = doc.getDouble("finalFare")
                val fareLong = doc.getLong("fare")
                val fareDouble = doc.getDouble("fare")
                val fare = finalFare ?: fareDouble ?: fareLong?.toDouble() ?: 0.0

                val savedCommission = doc.getDouble("commissionAmount")
                val commPct = doc.getDouble("commissionPercent") ?: defaultCommPct
                val commission = savedCommission ?: Math.round(fare * commPct / 100).toDouble()

                val distDouble = doc.getDouble("realDistanceKm")
                val distLong = doc.getLong("realDistanceKm")
                val distFallbackDouble = doc.getDouble("distanceKm")
                val distFallbackLong = doc.getLong("distanceKm")
                val distanceKm = distDouble ?: distLong?.toDouble() ?: distFallbackDouble ?: distFallbackLong?.toDouble() ?: 0.0

                val created = doc.getTimestamp("createdAt")?.toDate()

                RideHistoryItem(
                    rideId = doc.id,
                    passengerName = doc.getString("passengerName") ?: "",
                    pickupAddress = doc.getString("pickupAddress") ?: "",
                    dropoffAddress = doc.getString("dropoffAddress") ?: "",
                    fare = fare,
                    commission = commission,
                    distanceKm = distanceKm,
                    status = doc.getString("status") ?: "",
                    createdAt = if (created != null) sdf.format(created) else "",
                    createdAtDate = created
                )
            }.sortedByDescending { it.createdAtDate }
            isLoading = false
        }

        fun startListening(defaultCommPct: Double) {
            if (driverId.isEmpty()) {
                isLoading = false
                return
            }

            listener = db.collection("rides")
                .whereEqualTo("assignedDriverId", driverId)
                .addSnapshotListener { snapshot, e ->
                    if (e != null) return@addSnapshotListener
                    if (snapshot != null) {
                        for (doc in snapshot.documents) { rideMap[doc.id] = doc }
                    }
                    buildHistory(defaultCommPct)
                }

            listener2 = db.collection("rides")
                .whereArrayContains("notifiedDrivers", driverId)
                .addSnapshotListener { snapshot, e ->
                    if (e != null) return@addSnapshotListener
                    if (snapshot != null) {
                        for (doc in snapshot.documents) { rideMap[doc.id] = doc }
                    }
                    buildHistory(defaultCommPct)
                }
        }

        db.collection("settings").document("app_config")
            .get()
            .addOnSuccessListener { doc ->
                val pct = if (doc.exists()) (doc.getDouble("commissionPercent") ?: 10.0) else 10.0
                commissionPercent = pct
                startListening(pct)
            }
            .addOnFailureListener { startListening(commissionPercent) }

        onDispose {
            listener?.remove()
            listener2?.remove()
        }
    }

    ModalNavigationDrawer(
        drawerState = drawerState,
        drawerContent = {
            ModalDrawerSheet(
                modifier = Modifier.width(280.dp),
                drawerContainerColor = DrawerNavy
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxHeight()
                        .padding(0.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(DrawerNavy)
                            .padding(vertical = 40.dp, horizontal = 20.dp)
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
                            val cairoFont = FontFamily(Font(R.font.cairo_regular, FontWeight.Normal))
                            Box(
                                modifier = Modifier
                                    .size(110.dp)
                                    .shadow(8.dp, RoundedCornerShape(20.dp))
                                    .clip(RoundedCornerShape(20.dp))
                                    .border(4.dp, DrawerGold, RoundedCornerShape(20.dp)),
                                contentAlignment = Alignment.Center
                            ) {
                                Image(
                                    painter = painterResource(id = R.drawable.hamada3),
                                    contentDescription = "Khalily",
                                    modifier = Modifier
                                        .fillMaxSize()
                                        .clip(RoundedCornerShape(16.dp))
                                )
                            }
                            Spacer(modifier = Modifier.height(12.dp))
                            Text(
                                text = "\u062D\u0645\u0627\u062F\u0647",
                                fontSize = 30.sp,
                                fontFamily = cairoFont,
                                fontWeight = FontWeight.Bold,
                                color = DrawerGold
                            )
                            Spacer(modifier = Modifier.height(2.dp))
                            Text(
                                text = "\u0644\u0644\u062A\u0648\u0635\u064A\u0644",
                                fontSize = 14.sp,
                                fontFamily = cairoFont,
                                fontWeight = FontWeight.Normal,
                                color = Color.White.copy(alpha = 0.7f)
                            )
                            Spacer(modifier = Modifier.height(2.dp))
                            Card(
                                shape = RoundedCornerShape(8.dp),
                                colors = CardDefaults.cardColors(containerColor = DrawerGold.copy(alpha = 0.15f))
                            ) {
                                Text(
                                    text = "السائق",
                                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 3.dp),
                                    fontSize = 11.sp,
                                    color = DrawerGold
                                )
                            }
                        }
                    }

                    HorizontalDivider(color = Color.White.copy(alpha = 0.1f))

                    Spacer(modifier = Modifier.height(12.dp))

                    sectionTitles.forEachIndexed { index, title ->
                        val isSelected = selectedSection == index
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 12.dp, vertical = 3.dp)
                                .clip(RoundedCornerShape(14.dp))
                                .background(if (isSelected) DrawerGold.copy(alpha = 0.2f) else Color.Transparent)
                                .clickable {
                                    selectedSection = index
                                    scope.launch { drawerState.close() }
                                }
                                .padding(horizontal = 18.dp, vertical = 15.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(36.dp)
                                    .clip(RoundedCornerShape(10.dp))
                                    .background(if (isSelected) DrawerGold.copy(alpha = 0.25f) else Color.White.copy(alpha = 0.08f)),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    imageVector = sectionIcons[index],
                                    contentDescription = null,
                                    tint = if (isSelected) DrawerGold else Color.White.copy(alpha = 0.5f),
                                    modifier = Modifier.size(20.dp)
                                )
                            }
                            Spacer(modifier = Modifier.width(14.dp))
                            Text(
                                text = title,
                                fontSize = 16.sp,
                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                color = if (isSelected) DrawerGold else Color.White.copy(alpha = 0.8f),
                                modifier = Modifier.weight(1f)
                            )
                            if (isSelected) {
                                Box(
                                    modifier = Modifier
                                        .size(8.dp)
                                        .clip(CircleShape)
                                        .background(DrawerGold)
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.weight(1f))

                    HorizontalDivider(color = Color.White.copy(alpha = 0.1f))

                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 4.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .clickable {
                                scope.launch { drawerState.close() }
                                onLogout()
                            }
                            .padding(horizontal = 16.dp, vertical = 14.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(Icons.Default.Logout, contentDescription = null, tint = Color(0xFFB0BEC5), modifier = Modifier.size(22.dp))
                        Spacer(modifier = Modifier.width(16.dp))
                        Text("تسجيل الخروج", fontSize = 15.sp, fontWeight = FontWeight.Medium, color = Color(0xFFB0BEC5))
                    }

                    Spacer(modifier = Modifier.height(12.dp))
                }
            }
        }
    ) {
        Scaffold(
            topBar = {
                TopAppBar(
                    title = {
                        Text(sectionTitles[selectedSection], fontWeight = FontWeight.Bold, color = Color.White, fontSize = 20.sp)
                    },
                    navigationIcon = {
                        IconButton(onClick = { scope.launch { drawerState.open() } }) {
                            Icon(Icons.Default.Menu, contentDescription = "القائمة", tint = Color.White)
                        }
                    },
                    actions = {
                        IconButton(onClick = onBack) {
                            Icon(Icons.AutoMirrored.Filled.ArrowForward, contentDescription = "الرجوع", tint = Color.White)
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(containerColor = KhalilyNavy)
                )
            },
            containerColor = KhalilySand
        ) { padding ->
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
            ) {
                when (selectedSection) {
                    0 -> RideHistoryTab(rideHistory, isLoading)
                    1 -> TopUpInfoTab(context)
                    2 -> ContactInfoTab(context)
                    3 -> AboutTab()
                }
            }
        }
    }
}

@Composable
private fun RideHistoryTab(rides: List<RideHistoryItem>, isLoading: Boolean) {
    if (isLoading) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator(color = KhalilyTurquoise)
        }
        return
    }

    if (rides.isEmpty()) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Box(
                    modifier = Modifier.size(80.dp).background(KhalilyTurquoiseSurface, CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(Icons.Default.TwoWheeler, contentDescription = null, tint = KhalilyTurquoise, modifier = Modifier.size(40.dp))
                }
                Spacer(modifier = Modifier.height(16.dp))
                Text("لا توجد رحلات بعد", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = KhalilyTextPrimary)
                Spacer(modifier = Modifier.height(4.dp))
                Text("فعّل وضعك على الخريطة لبدء استقبال الطلبات", fontSize = 13.sp, color = KhalilyTextSecondary)
            }
        }
        return
    }

    val grouped = rides.groupBy { item ->
        val sdf = SimpleDateFormat("yyyy/MM/dd", Locale.US)
        if (item.createdAtDate != null) sdf.format(item.createdAtDate) else item.createdAt.take(10)
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        grouped.forEach { (date, dateRides) ->
            item {
                Text(
                    text = date,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold,
                    color = KhalilyNavy,
                    modifier = Modifier.padding(vertical = 4.dp, horizontal = 4.dp)
                )
            }
            items(dateRides) { ride ->
                val cardBg = when (ride.status) {
                    "completed" -> Color(0xFFF0F9F1)
                    "cancelled" -> Color(0xFFFFF3F3)
                    "in_progress" -> Color(0xFFFFFBF0)
                    else -> Color(0xFFF8F8FA)
                }
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .shadow(8.dp, RoundedCornerShape(20.dp)),
                    shape = RoundedCornerShape(20.dp),
                    colors = CardDefaults.cardColors(containerColor = cardBg)
                ) {
                    Row(modifier = Modifier.fillMaxWidth()) {
                        Box(
                            modifier = Modifier
                                .width(5.dp)
                                .fillMaxHeight()
                                .background(
                                    when (ride.status) {
                                        "completed" -> Color(0xFF2E7D32)
                                        "cancelled" -> Color(0xFFC62828)
                                        "in_progress" -> KhalilyGold
                                        else -> Color(0xFFB0BEC5)
                                    }
                                )
                        )

                        Column(modifier = Modifier.padding(16.dp).weight(1f)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(ride.passengerName, fontSize = 15.sp, fontWeight = FontWeight.Bold, color = KhalilyTextPrimary)
                                val statusText = when (ride.status) {
                                    "completed" -> "مكتملة"
                                    "cancelled" -> "ملغاة"
                                    "in_progress" -> "جارية"
                                    "accepted" -> "مقبولة"
                                    else -> ride.status
                                }
                                Card(
                                    shape = RoundedCornerShape(8.dp),
                                    colors = CardDefaults.cardColors(
                                        containerColor = when (ride.status) {
                                            "completed" -> Color(0xFFE8F5E9)
                                            "cancelled" -> Color(0xFFFFEBEE)
                                            "in_progress" -> Color(0xFFFFF8E1)
                                            else -> Color(0xFFF3E5F5)
                                        }
                                    )
                                ) {
                                    Text(
                                        text = statusText,
                                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = when (ride.status) {
                                            "completed" -> Color(0xFF2E7D32)
                                            "cancelled" -> Color(0xFFC62828)
                                            "in_progress" -> Color(0xFFEF6C00)
                                            else -> Color(0xFF7B1FA2)
                                        }
                                    )
                                }
                            }

                            Spacer(modifier = Modifier.height(10.dp))

                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.PlayArrow, contentDescription = null, tint = KhalilyTurquoise, modifier = Modifier.size(14.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(ride.pickupAddress.ifEmpty { "-" }, fontSize = 12.sp, color = KhalilyTextSecondary)
                            }
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.Place, contentDescription = null, tint = Color(0xFFC62828), modifier = Modifier.size(14.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(ride.dropoffAddress.ifEmpty { "-" }, fontSize = 12.sp, color = KhalilyTextSecondary)
                            }

                            Spacer(modifier = Modifier.height(12.dp))
                            HorizontalDivider(color = Color(0xFFE0E0E0))
                            Spacer(modifier = Modifier.height(12.dp))

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text("السعر:", fontSize = 13.sp, fontWeight = FontWeight.Medium, color = KhalilyTextSecondary)
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text(
                                        "${ride.fare} MRU",
                                        fontSize = 14.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = KhalilyTextPrimary
                                    )
                                }
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text("العمولة:", fontSize = 13.sp, fontWeight = FontWeight.Medium, color = KhalilyTextSecondary)
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text(
                                        "- ${ride.commission} MRU",
                                        fontSize = 14.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = Color(0xFFC62828)
                                    )
                                }
                            }

                            Spacer(modifier = Modifier.height(8.dp))

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text("الصافي:", fontSize = 13.sp, fontWeight = FontWeight.Medium, color = KhalilyTextSecondary)
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(
                                    "${ride.fare - ride.commission} MRU",
                                    fontSize = 16.sp,
                                    fontWeight = FontWeight.ExtraBold,
                                    color = Color(0xFF2E7D32)
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ContactInfoTab(context: android.content.Context) {
    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .shadow(6.dp, RoundedCornerShape(20.dp)),
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White)
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier.size(44.dp).background(KhalilyTurquoiseSurface, RoundedCornerShape(12.dp)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(Icons.Default.Phone, contentDescription = null, tint = KhalilyTurquoise, modifier = Modifier.size(24.dp))
                        }
                        Spacer(modifier = Modifier.width(12.dp))
                        Text("التواصل عبر الهاتف", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = KhalilyTextPrimary)
                    }
                    Spacer(modifier = Modifier.height(16.dp))
                    Text("47717983", fontSize = 28.sp, fontWeight = FontWeight.ExtraBold, color = KhalilyTurquoise)
                    Spacer(modifier = Modifier.height(16.dp))
                    Button(
                        onClick = { context.startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:47717983"))) },
                        modifier = Modifier.fillMaxWidth().height(50.dp),
                        shape = RoundedCornerShape(14.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = KhalilyTurquoise)
                    ) {
                        Icon(Icons.Default.Phone, contentDescription = null, tint = Color.White)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("اتصل الآن", fontWeight = FontWeight.Bold, color = Color.White, fontSize = 16.sp)
                    }
                }
            }
        }

        item {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .shadow(6.dp, RoundedCornerShape(20.dp)),
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White)
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier.size(44.dp).background(Color(0xFFE8F5E9), RoundedCornerShape(12.dp)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(Icons.Default.Whatsapp, contentDescription = null, tint = Color(0xFF25D366), modifier = Modifier.size(24.dp))
                        }
                        Spacer(modifier = Modifier.width(12.dp))
                        Text("واتساب لشحن الرصيد", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = KhalilyTextPrimary)
                    }
                    Spacer(modifier = Modifier.height(16.dp))
                    Text("26067036", fontSize = 28.sp, fontWeight = FontWeight.ExtraBold, color = Color(0xFF25D366))
                    Spacer(modifier = Modifier.height(16.dp))
                    Button(
                        onClick = { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://wa.me/22226067036"))) },
                        modifier = Modifier.fillMaxWidth().height(50.dp),
                        shape = RoundedCornerShape(14.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF25D366))
                    ) {
                        Text("فتح واتساب", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Color.White)
                    }
                }
            }
        }
    }
}

@Composable
private fun TopUpInfoTab(context: android.content.Context) {
    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .shadow(6.dp, RoundedCornerShape(20.dp)),
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White)
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier.size(44.dp).background(KhalilyGoldLight, RoundedCornerShape(12.dp)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(Icons.Default.AccountBalanceWallet, contentDescription = null, tint = KhalilyGold, modifier = Modifier.size(24.dp))
                        }
                        Spacer(modifier = Modifier.width(12.dp))
                        Text("كيفية تزويد الرصيد", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = KhalilyTextPrimary)
                    }

                    Spacer(modifier = Modifier.height(24.dp))

                    StepItem(stepNumber = "1", title = "إرسال المبلغ", description = "قم بإرسال مبلغ التزويد الذي يجب أن لا يقل عن 100 أوقية إلى الرقم:")
                    Spacer(modifier = Modifier.height(8.dp))
                    Card(
                        modifier = Modifier.fillMaxWidth().shadow(3.dp, RoundedCornerShape(14.dp)),
                        shape = RoundedCornerShape(14.dp),
                        colors = CardDefaults.cardColors(containerColor = Color(0xFFE0F7FA))
                    ) {
                        Text("26067036", modifier = Modifier.fillMaxWidth().padding(16.dp), fontSize = 24.sp, fontWeight = FontWeight.ExtraBold, color = KhalilyTurquoise, textAlign = TextAlign.Center)
                    }

                    Spacer(modifier = Modifier.height(24.dp))

                    StepItem(stepNumber = "2", title = "طرق الدفع", description = "يمكنك الدفع عبر:")
                    Spacer(modifier = Modifier.height(14.dp))

                    PaymentMethodCard("بنكيلي", Icons.Default.AccountBalance, Color(0xFF1565C0), Color(0xFFE3F2FD))
                    Spacer(modifier = Modifier.height(12.dp))
                    PaymentMethodCard("السداد", Icons.Default.Receipt, Color(0xFF2E7D32), Color(0xFFE8F5E9))
                    Spacer(modifier = Modifier.height(12.dp))
                    PaymentMethodCard("مصرفي", Icons.Default.CreditCard, Color(0xFF6A1B9A), Color(0xFFF3E5F5))
                    Spacer(modifier = Modifier.height(12.dp))
                    PaymentMethodCard("بيم بانك", Icons.Default.Savings, Color(0xFFE65100), Color(0xFFFFF3E0))
                    Spacer(modifier = Modifier.height(12.dp))
                    PaymentMethodCard("كليك", Icons.Default.TouchApp, Color(0xFF00838F), Color(0xFFE0F7FA))

                    Spacer(modifier = Modifier.height(24.dp))

                    StepItem(stepNumber = "3", title = "إرسال الإثبات", description = "قم بإرسال لقطة من الشاشة إلى رقم الواتساب:")
                    Spacer(modifier = Modifier.height(8.dp))
                    Card(
                        modifier = Modifier.fillMaxWidth().shadow(3.dp, RoundedCornerShape(14.dp)),
                        shape = RoundedCornerShape(14.dp),
                        colors = CardDefaults.cardColors(containerColor = Color(0xFFE8F5E9))
                    ) {
                        Text("26067036", modifier = Modifier.fillMaxWidth().padding(16.dp), fontSize = 24.sp, fontWeight = FontWeight.ExtraBold, color = Color(0xFF25D366), textAlign = TextAlign.Center)
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    StepItem(stepNumber = "4", title = "إرفاق رقم الحساب", description = "أرفق لقطة الشاشة مع رقم حسابك وسيتم شحن رصيدك خلال دقائق")

                    Spacer(modifier = Modifier.height(24.dp))

                    Button(
                        onClick = { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://wa.me/22226067036"))) },
                        modifier = Modifier.fillMaxWidth().height(52.dp),
                        shape = RoundedCornerShape(14.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF25D366))
                    ) {
                        Icon(Icons.Default.Send, contentDescription = null, tint = Color.White)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("إرسال عبر واتساب", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Color.White)
                    }
                }
            }
        }
    }
}

@Composable
private fun StepItem(stepNumber: String, title: String, description: String) {
    Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.Top) {
        Box(
            modifier = Modifier.size(32.dp).background(KhalilyNavy, CircleShape),
            contentAlignment = Alignment.Center
        ) {
            Text(stepNumber, fontSize = 14.sp, fontWeight = FontWeight.Bold, color = Color.White)
        }
        Spacer(modifier = Modifier.width(14.dp))
        Column {
            Text(title, fontSize = 15.sp, fontWeight = FontWeight.Bold, color = KhalilyTextPrimary)
            Spacer(modifier = Modifier.height(2.dp))
            Text(description, fontSize = 13.sp, color = KhalilyTextSecondary)
        }
    }
}

@Composable
private fun PaymentMethodCard(method: String, icon: ImageVector, accentColor: Color, bgColor: Color) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .shadow(8.dp, RoundedCornerShape(20.dp)),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = bgColor)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp, vertical = 20.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.Center
        ) {
            Box(
                modifier = Modifier.size(42.dp).background(accentColor.copy(alpha = 0.15f), RoundedCornerShape(12.dp)),
                contentAlignment = Alignment.Center
            ) {
                Icon(icon, contentDescription = null, tint = accentColor, modifier = Modifier.size(22.dp))
            }
            Spacer(modifier = Modifier.width(14.dp))
            Text(method, fontSize = 18.sp, fontWeight = FontWeight.Bold, color = accentColor)
            Spacer(modifier = Modifier.width(10.dp))
            Icon(Icons.Default.CheckCircle, contentDescription = null, tint = accentColor, modifier = Modifier.size(20.dp))
        }
    }
}

@Composable
private fun AboutTab() {
    val context = LocalContext.current
    val versionName = try {
        context.packageManager.getPackageInfo(context.packageName, 0).versionName ?: "1.0.0"
    } catch (_: Exception) { "1.0.0" }

    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        item {
            Card(
                modifier = Modifier.fillMaxWidth().shadow(6.dp, RoundedCornerShape(20.dp)),
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = KhalilyNavy)
            ) {
                Column(
                    modifier = Modifier.padding(28.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    val cairoFont = FontFamily(Font(R.font.cairo_regular, FontWeight.Normal))
                    Box(
                        modifier = Modifier
                            .size(150.dp)
                            .shadow(10.dp, RoundedCornerShape(26.dp))
                            .clip(RoundedCornerShape(26.dp))
                            .border(4.dp, KhalilyGold, RoundedCornerShape(26.dp)),
                        contentAlignment = Alignment.Center
                    ) {
                        Image(
                            painter = painterResource(id = R.drawable.hamada3),
                            contentDescription = "Khalily",
                            modifier = Modifier
                                .fillMaxSize()
                                .clip(RoundedCornerShape(22.dp))
                        )
                    }
                    Spacer(modifier = Modifier.height(14.dp))
                    Text(
                        "\u062D\u0645\u0627\u062F\u0647",
                        fontSize = 38.sp,
                        fontFamily = cairoFont,
                        fontWeight = FontWeight.Bold,
                        color = KhalilyGold,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.fillMaxWidth()
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text("\u0644\u0644\u062A\u0648\u0635\u064A\u0644", fontSize = 14.sp, fontFamily = cairoFont, fontWeight = FontWeight.Normal, color = Color.White.copy(alpha = 0.7f), textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth())
                    Spacer(modifier = Modifier.height(10.dp))
                    Card(
                        shape = RoundedCornerShape(10.dp),
                        colors = CardDefaults.cardColors(containerColor = Color.White.copy(alpha = 0.15f)),
                        modifier = Modifier.align(Alignment.CenterHorizontally)
                    ) {
                        Text(
                            "الإصدار $versionName",
                            modifier = Modifier.padding(horizontal = 14.dp, vertical = 6.dp),
                            fontSize = 12.sp,
                            color = KhalilyGold,
                            textAlign = TextAlign.Center
                        )
                    }
                }
            }
        }

        item {
            Card(
                modifier = Modifier.fillMaxWidth().shadow(8.dp, RoundedCornerShape(20.dp)),
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White)
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Text("معلومات التطبيق", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = KhalilyNavy)
                    Spacer(modifier = Modifier.height(16.dp))
                    AboutInfoRow(icon = Icons.Default.Business, label = "الشركة", value = "\u062D\u0645\u0627\u062F\u0647 \u0644\u0644\u062A\u0648\u0635\u064A\u0644")
                    AboutInfoRow(icon = Icons.Default.LocationOn, label = "المدينة", value = "نواكشط، موريتانيا")
                    AboutInfoRow(icon = Icons.Default.Phone, label = "التواصل", value = "47717983")
                    AboutInfoRow(icon = Icons.Default.Code, label = "الإصدار", value = versionName)
                }
            }
        }

        item {
            Card(
                modifier = Modifier.fillMaxWidth().shadow(8.dp, RoundedCornerShape(20.dp)),
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White)
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Text("رسالتنا", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = KhalilyNavy)
                    Spacer(modifier = Modifier.height(10.dp))
                    Text(
                        "في خَلِيلِي، نؤمن بأن خدمة الزبون وإرضائه هو جوهر عملنا. رضا الزبون يعني رضا السائق والشركة معاً — وهذا مصلحتنا مشتركة.",
                        fontSize = 13.sp, color = KhalilyTextSecondary, lineHeight = 22.sp
                    )
                }
            }
        }

        item {
            Card(
                modifier = Modifier.fillMaxWidth().shadow(8.dp, RoundedCornerShape(20.dp)),
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White)
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Text("تعهداتنا مع السائقين", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = KhalilyNavy)
                    Spacer(modifier = Modifier.height(10.dp))
                    PolicyItem(
                        icon = Icons.Default.Favorite,
                        title = "نقدّركم ونفخر بكم",
                        text = "الشركة تقدّر السائقين وتعتبر بأن مصلحتهم ومصلحتها متكاملة. أنتم شركاء حقيقيون في هذا العمل."
                    )
                    Spacer(modifier = Modifier.height(10.dp))
                    PolicyItem(
                        icon = Icons.Default.Shield,
                        title = "لن نطلب أي إجراء تعسفي",
                        text = "لن نستخدم أي إجراءات تعسفية تهمّ حصل. نحترم طبيعة العمل وتحدياته، وسنبقى داعمين لهم في صفهم لمساعدتهم."
                    )
                    Spacer(modifier = Modifier.height(10.dp))
                    PolicyItem(
                        icon = Icons.Default.SupportAgent,
                        title = "ندعمكم في كل الظروف",
                        text = "الشركة مستعدة داعمة لمساعدة السائقين في تعيين خسائرهم إلزماً لزم الأثر. نحن شركاء في النجاح وسنحتشد الصعوبات معاً."
                    )
                    Spacer(modifier = Modifier.height(10.dp))
                    PolicyItem(
                        icon = Icons.Default.Handshake,
                        title = "نفهم طبيعة عملكم",
                        text = "ندرك أن العمل في التوصيل يحمل تحديات كثيرة، ونحن متفهّمون لذلك بعد. هدفنا أن نسهّل عليكم العمل ونحيل مصالحتكم."
                    )
                }
            }
        }

        item {
            Card(
                modifier = Modifier.fillMaxWidth().shadow(8.dp, RoundedCornerShape(20.dp)),
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White)
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Text("منشورات وتنبيهات", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = KhalilyNavy)
                    Spacer(modifier = Modifier.height(10.dp))
                    PolicyItem(
                        icon = Icons.Default.Warning,
                        title = "اللطف في الإجراءات",
                        text = "نذكرك بلطف بأن الإجراءات في أي من إجراءات التتبع أو محولة خضاع النظام. جمع العمليات مراعاة لحقوق الزبون والሳائقين والشركة معاً. أي محولة ستؤدي إلى اتخاذ إجراءات لحماية الجميع."
                    )
                    Spacer(modifier = Modifier.height(10.dp))
                    PolicyItem(
                        icon = Icons.Default.Timer,
                        title = "الالتزام بالمواعيد",
                        text = "يُرجى إكمال إجراءات الرحلة في الوقت المحدد. إذا حدث شيء غير متوقع، يُرجى التواصل مع الإدارة فوراً. نحن هنا لمساعدتكم وليس لمهاجمتكم."
                    )
                    Spacer(modifier = Modifier.height(10.dp))
                    PolicyItem(
                        icon = Icons.Default.VerifiedUser,
                        title = "النزاهة والثقة",
                        text = "الثقة هي أساس عملنا. نثق بكم ونرجو أن تكونون عند حسن ظننا جميعاً. الخدمة المخلصة للزبون هي مفتاح نجاحنا المشترك."
                    )

                    Spacer(modifier = Modifier.height(16.dp))
                    HorizontalDivider(color = Color(0xFFEEEEEE))
                    Spacer(modifier = Modifier.height(12.dp))
                    Text("\u00A9 2026 \u062D\u0645\u0627\u062F\u0647 \u2014 \u062C\u0645\u064A\u0639 \u0627\u0644\u062D\u0642\u0648\u0642 \u0645\u062D\u0641\u0648\u0638\u0629", fontSize = 12.sp, color = KhalilyTextSecondary, textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth())
                }
            }
        }
    }
}

@Composable
private fun PolicyItem(
    icon: ImageVector,
    title: String,
    text: String
) {
    Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.Top) {
        Box(
            modifier = Modifier
                .size(36.dp)
                .background(KhalilyTurquoise.copy(alpha = 0.1f), RoundedCornerShape(10.dp)),
            contentAlignment = Alignment.Center
        ) {
            Icon(icon, contentDescription = null, tint = KhalilyTurquoise, modifier = Modifier.size(18.dp))
        }
        Spacer(modifier = Modifier.width(12.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(title, fontSize = 14.sp, fontWeight = FontWeight.Bold, color = KhalilyNavy)
            Spacer(modifier = Modifier.height(3.dp))
            Text(text, fontSize = 12.sp, color = KhalilyTextSecondary, lineHeight = 20.sp)
        }
    }
}

@Composable
private fun AboutInfoRow(
    icon: ImageVector,
    label: String,
    value: String
) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(icon, contentDescription = null, tint = KhalilyTurquoise, modifier = Modifier.size(20.dp))
        Spacer(modifier = Modifier.width(10.dp))
        Text(label, fontSize = 13.sp, color = KhalilyTextSecondary)
        Spacer(modifier = Modifier.width(8.dp))
        Text(value, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = KhalilyTextPrimary)
    }
}
