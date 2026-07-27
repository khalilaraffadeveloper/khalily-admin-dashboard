package com.khalily.driver.ui.screens.settings

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
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

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    onBack: () -> Unit = {},
    onLogout: () -> Unit = {}
) {
    val context = LocalContext.current
    val db = FirebaseFirestore.getInstance()
    val driverId = PrefsManager.getDriverId(context) ?: ""

    var rideHistory by remember { mutableStateOf<List<RideHistoryItem>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var selectedTab by remember { mutableIntStateOf(0) }
    var commissionPercent by remember { mutableDoubleStateOf(10.0) }

    DisposableEffect(Unit) {
        var listener: ListenerRegistration? = null

        fun startListening(defaultCommPct: Double) {
            if (driverId.isEmpty()) { isLoading = false; return }
            val sdf = SimpleDateFormat("yyyy/MM/dd HH:mm", Locale.US)
            listener = db.collection("rides")
                .whereEqualTo("assignedDriverId", driverId)
                .addSnapshotListener { snapshot, e ->
                    if (e != null) {
                        android.util.Log.e("Settings", "Ride history error: ${e.message}")
                        return@addSnapshotListener
                    }
                    if (snapshot == null) return@addSnapshotListener
                    rideHistory = snapshot.documents.mapNotNull { doc ->
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
                        val status = doc.getString("status") ?: ""

                        if (status.isEmpty()) return@mapNotNull null

                        RideHistoryItem(
                            rideId = doc.id,
                            passengerName = doc.getString("passengerName") ?: "",
                            pickupAddress = doc.getString("pickupAddress") ?: "",
                            dropoffAddress = doc.getString("dropoffAddress") ?: "",
                            fare = fare,
                            commission = commission,
                            distanceKm = distanceKm,
                            status = status,
                            createdAt = if (created != null) sdf.format(created) else "",
                            createdAtDate = created
                        )
                    }.sortedByDescending { it.createdAtDate }
                    isLoading = false
                }
        }

        db.collection("settings").document("app_config")
            .get()
            .addOnSuccessListener { doc ->
                val pct = if (doc.exists()) (doc.getDouble("commissionPercent") ?: 10.0) else 10.0
                commissionPercent = pct
                startListening(pct)
            }
            .addOnFailureListener {
                startListening(commissionPercent)
            }

        onDispose {
            listener?.remove()
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.White)
    ) {
        TopAppBar(
            title = {
                Text("الإعدادات", fontWeight = FontWeight.Bold, color = Color.White, fontSize = 20.sp)
            },
            navigationIcon = {
                IconButton(onClick = onBack) {
                    Icon(Icons.Default.ArrowBack, contentDescription = "رجوع", tint = Color.White)
                }
            },
            colors = TopAppBarDefaults.topAppBarColors(containerColor = KhalilyNavy)
        )

        TabRow(
            selectedTabIndex = selectedTab,
            containerColor = Color(0xFF1B4F72),
            contentColor = KhalilyTurquoise
        ) {
            Tab(selected = selectedTab == 0, onClick = { selectedTab = 0 }) {
                Text(
                    "الرحلات",
                    modifier = Modifier.padding(12.dp),
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    color = KhalilyGold
                )
            }
            Tab(selected = selectedTab == 1, onClick = { selectedTab = 1 }) {
                Text(
                    "التواصل",
                    modifier = Modifier.padding(12.dp),
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    color = KhalilyGold
                )
            }
            Tab(selected = selectedTab == 2, onClick = { selectedTab = 2 }) {
                Text(
                    "الرصيد",
                    modifier = Modifier.padding(12.dp),
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    color = KhalilyGold
                )
            }
            Tab(selected = selectedTab == 3, onClick = { selectedTab = 3 }) {
                Text(
                    "حول",
                    modifier = Modifier.padding(12.dp),
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    color = KhalilyGold
                )
            }
        }

        Column(modifier = Modifier.weight(1f)) {
            when (selectedTab) {
                0 -> RideHistoryTab(rideHistory, isLoading)
                1 -> ContactInfoTab(context)
                2 -> TopUpInfoTab(context)
                3 -> AboutTab()
            }
        }

        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
                .shadow(4.dp, RoundedCornerShape(14.dp)),
            shape = RoundedCornerShape(14.dp),
            colors = CardDefaults.cardColors(containerColor = Color(0xFFC62828))
        ) {
            Button(
                onClick = { onLogout() },
                modifier = Modifier.fillMaxWidth().height(52.dp),
                shape = RoundedCornerShape(14.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent),
                elevation = null
            ) {
                Icon(Icons.Default.Logout, contentDescription = null, tint = Color.White, modifier = Modifier.size(22.dp))
                Spacer(modifier = Modifier.width(10.dp))
                Text("تسجيل الخروج", fontSize = 17.sp, fontWeight = FontWeight.Bold, color = Color.White)
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
                    modifier = Modifier.size(80.dp).background(Color(0xFFE0F7FA), CircleShape),
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
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        grouped.forEach { (date, dateRides) ->
            item {
                Text(
                    text = date,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold,
                    color = KhalilyTextSecondary,
                    modifier = Modifier.padding(vertical = 4.dp, horizontal = 4.dp)
                )
            }
            items(dateRides) { ride ->
                Card(
                    modifier = Modifier.fillMaxWidth().shadow(2.dp, RoundedCornerShape(14.dp)),
                    shape = RoundedCornerShape(14.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White)
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
                            HorizontalDivider(color = Color(0xFFEEEEEE))
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
                modifier = Modifier.fillMaxWidth().shadow(3.dp, RoundedCornerShape(16.dp)),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White)
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Phone, contentDescription = null, tint = KhalilyTurquoise, modifier = Modifier.size(28.dp))
                        Spacer(modifier = Modifier.width(12.dp))
                        Text("التواصل عبر الهاتف", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = KhalilyGold)
                    }
                    Spacer(modifier = Modifier.height(12.dp))
                    Text("47717983", fontSize = 24.sp, fontWeight = FontWeight.ExtraBold, color = KhalilyTurquoise)
                    Spacer(modifier = Modifier.height(12.dp))
                    Button(
                        onClick = { context.startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:47717983"))) },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = KhalilyTurquoise)
                    ) {
                        Icon(Icons.Default.Phone, contentDescription = null, tint = Color.White)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("اتصل الآن", fontWeight = FontWeight.Bold, color = Color.White)
                    }
                }
            }
        }

        item {
            Card(
                modifier = Modifier.fillMaxWidth().shadow(3.dp, RoundedCornerShape(16.dp)),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White)
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Whatsapp, contentDescription = null, tint = Color(0xFF25D366), modifier = Modifier.size(28.dp))
                        Spacer(modifier = Modifier.width(12.dp))
                        Text("واتساب لشحن الرصيد", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = KhalilyGold)
                    }
                    Spacer(modifier = Modifier.height(12.dp))
                    Text("26067036", fontSize = 24.sp, fontWeight = FontWeight.ExtraBold, color = Color(0xFF25D366))
                    Spacer(modifier = Modifier.height(12.dp))
                    Button(
                        onClick = { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://wa.me/22226067036"))) },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
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
                modifier = Modifier.fillMaxWidth().shadow(3.dp, RoundedCornerShape(16.dp)),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White)
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.AccountBalanceWallet, contentDescription = null, tint = KhalilyGold, modifier = Modifier.size(28.dp))
                        Spacer(modifier = Modifier.width(12.dp))
                        Text("كيفية تزويد الرصيد", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = KhalilyTextPrimary)
                    }

                    Spacer(modifier = Modifier.height(24.dp))

                    StepItem(stepNumber = "1", title = "إرسال المبلغ", description = "قم بإرسال مبلغ التزويد الذي يجب أن لا يقل عن 100 أوقية إلى الرقم:")
                    Spacer(modifier = Modifier.height(8.dp))
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(containerColor = Color(0xFFE0F7FA))
                    ) {
                        Text("26067036", modifier = Modifier.fillMaxWidth().padding(14.dp), fontSize = 22.sp, fontWeight = FontWeight.ExtraBold, color = KhalilyTurquoise, textAlign = TextAlign.Center)
                    }

                    Spacer(modifier = Modifier.height(20.dp))

                    StepItem(stepNumber = "2", title = "طرق الدفع", description = "يمكنك الدفع عبر:")
                    Spacer(modifier = Modifier.height(10.dp))
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        PaymentMethodChip("بنكيلي", Modifier.weight(1f))
                        PaymentMethodChip("السداد", Modifier.weight(1f))
                        PaymentMethodChip("مصرفي", Modifier.weight(1f))
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        PaymentMethodChip("بيم بانك", Modifier.weight(1f))
                        PaymentMethodChip("كليك", Modifier.weight(1f))
                    }

                    Spacer(modifier = Modifier.height(20.dp))

                    StepItem(stepNumber = "3", title = "إرسال الإثبات", description = "قم بإرسال لقطة من الشاشة إلى رقم الواتساب:")
                    Spacer(modifier = Modifier.height(8.dp))
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(containerColor = Color(0xFFE8F5E9))
                    ) {
                        Text("26067036", modifier = Modifier.fillMaxWidth().padding(14.dp), fontSize = 22.sp, fontWeight = FontWeight.ExtraBold, color = Color(0xFF25D366), textAlign = TextAlign.Center)
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    StepItem(stepNumber = "4", title = "إرفاق رقم الحساب", description = "أرفق لقطة الشاشة مع رقم حسابك وسيتم شحن رصيدك خلال دقائق")

                    Spacer(modifier = Modifier.height(24.dp))

                    Button(
                        onClick = { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://wa.me/22226067036"))) },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF25D366))
                    ) {
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
            modifier = Modifier.size(30.dp).background(KhalilyNavy, CircleShape),
            contentAlignment = Alignment.Center
        ) {
            Text(stepNumber, fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color.White)
        }
        Spacer(modifier = Modifier.width(14.dp))
        Column {
            Text(title, fontSize = 15.sp, fontWeight = FontWeight.Bold, color = KhalilyTextPrimary)
            Text(description, fontSize = 13.sp, color = KhalilyTextSecondary)
        }
    }
}

@Composable
private fun PaymentMethodChip(method: String, modifier: Modifier = Modifier) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(10.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFFF5F5F5))
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(Icons.Default.CheckCircle, contentDescription = null, tint = Color(0xFF2E7D32), modifier = Modifier.size(16.dp))
            Spacer(modifier = Modifier.width(8.dp))
            Text(method, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = KhalilyTextPrimary)
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
                modifier = Modifier.fillMaxWidth().shadow(4.dp, RoundedCornerShape(20.dp)),
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = KhalilyNavy)
            ) {
                Column(
                    modifier = Modifier.padding(28.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Box(
                        modifier = Modifier
                            .size(140.dp)
                            .clip(CircleShape)
                            .border(4.dp, KhalilyGold, CircleShape)
                            .background(Color.White),
                        contentAlignment = Alignment.Center
                    ) {
                        androidx.compose.foundation.Image(
                            painter = painterResource(id = R.mipmap.ic_launcher),
                            contentDescription = "Khalily",
                            modifier = Modifier
                                .size(120.dp)
                                .clip(CircleShape)
                        )
                    }
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        "\u062E\u064E\u0644\u0650\u064A\u0644\u0650\u064A",
                        fontSize = 40.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = KhalilyGold,
                        textAlign = TextAlign.Center
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text("\u062E\u062F\u0645\u0629 \u0627\u0644\u062A\u0648\u0635\u064A\u0644 \u0639\u0628\u0631 \u0627\u0644\u062F\u0631\u0627\u062C\u0627\u062A", fontSize = 14.sp, color = Color.White.copy(alpha = 0.7f))
                    Spacer(modifier = Modifier.height(10.dp))
                    Card(
                        shape = RoundedCornerShape(10.dp),
                        colors = CardDefaults.cardColors(containerColor = Color.White.copy(alpha = 0.15f))
                    ) {
                        Text(
                            "\u0627\u0644\u0625\u0635\u062F\u0627\u0631 $versionName",
                            modifier = Modifier.padding(horizontal = 14.dp, vertical = 6.dp),
                            fontSize = 12.sp,
                            color = KhalilyGold
                        )
                    }
                }
            }
        }

        item {
            Card(
                modifier = Modifier.fillMaxWidth().shadow(2.dp, RoundedCornerShape(16.dp)),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White)
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Text("معلومات التطبيق", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = KhalilyNavy)
                    Spacer(modifier = Modifier.height(16.dp))
                    AboutInfoRow(icon = Icons.Default.Business, label = "الشركة", value = "خَلِيلِي")
                    AboutInfoRow(icon = Icons.Default.LocationOn, label = "المدينة", value = "نواكشط، موريتانيا")
                    AboutInfoRow(icon = Icons.Default.Phone, label = "التواصل", value = "47717983")
                    AboutInfoRow(icon = Icons.Default.Code, label = "الإصدار", value = versionName)
                }
            }
        }

        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White)
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Text("\u0631\u0633\u0627\u0644\u062A\u0646\u0627", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = KhalilyNavy)
                    Spacer(modifier = Modifier.height(10.dp))
                    Text(
                        "\u0641\u064A \u062E\u064E\u0644\u0650\u064A\u0644\u0650\u064A\u060C \u0646\u0624\u0645\u0646 \u0623\u0646 \u062E\u062F\u0645\u0629 \u0627\u0644\u0632\u0628\u0648\u0646 \u0648\u0625\u0631\u0636\u0627\u0626\u0647 \u0647\u0648 \u062C\u0648\u0647\u0631 \u0639\u0645\u0644\u0646\u0627. \u0631\u0636\u0627 \u0627\u0644\u0632\u0628\u0648\u0646 \u064A\u0639\u0646\u064A \u0631\u0636\u0627 \u0627\u0644\u0633\u0627\u0626\u0642 \u0648\u0631\u0636\u0627 \u0627\u0644\u0634\u0631\u0643\u0629 \u0645\u0639\u0627 \u2014 \u0648\u0647\u0630\u0647 \u0645\u0635\u0644\u062D\u0629 \u0645\u0634\u062A\u0631\u0643\u0629 \u064A\u0633\u0639\u062F \u0641\u064A\u0647\u0627 \u0627\u0644\u062C\u0645\u064A\u0639.",
                        fontSize = 13.sp, color = KhalilyTextSecondary, lineHeight = 22.sp
                    )
                }
            }
        }

        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White)
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Text("\u0645\u0639\u0627\u0645\u0644\u062A\u0646\u0627 \u0645\u0639 \u0627\u0644\u0633\u0627\u0626\u0642\u064A\u0646", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = KhalilyNavy)
                    Spacer(modifier = Modifier.height(10.dp))
                    PolicyItem(
                        icon = Icons.Default.Favorite,
                        title = "\u0646\u0642\u062F\u0651\u0631\u0643\u0645 \u0648\u0646\u0641\u062E\u0631 \u0628\u0643\u0645",
                        text = "\u0627\u0644\u0634\u0631\u0643\u0629 \u062A\u0642\u062F\u0631 \u0627\u0644\u0633\u0627\u0626\u0642\u064A\u0646 \u0648\u062A\u0639\u062A\u0631\u0641 \u0628\u0623\u0646 \u0645\u0635\u0644\u062D\u062A\u0647\u0645 \u0648\u0645\u0635\u0644\u062D\u062A\u0647\u0627 \u0645\u062A\u0643\u0627\u0645\u0644\u062A\u0627\u0646. \u0623\u0646\u062A\u0645 \u0634\u0631\u0643\u0627\u0621 \u062D\u0642\u064A\u0642\u064A\u0648\u0646 \u0641\u064A \u0647\u0630\u0627 \u0627\u0644\u0639\u0645\u0644."
                    )
                    Spacer(modifier = Modifier.height(10.dp))
                    PolicyItem(
                        icon = Icons.Default.Shield,
                        title = "\u0644\u0646 \u0646\u0644\u062C\u0623 \u0644\u0623\u064A \u0625\u062C\u0631\u0627\u0621 \u062A\u0639\u0633\u0641\u064A",
                        text = "\u0644\u0646 \u0646\u0633\u062A\u062E\u062F\u0645 \u0623\u064A \u0625\u062C\u0631\u0627\u0621\u0627\u062A \u062A\u0639\u0633\u0641\u064A\u0629 \u0645\u0647\u0645\u0627 \u062D\u0635\u0644. \u0646\u062A\u0641\u0647\u0645 \u0637\u0628\u064A\u0639\u0629 \u0627\u0644\u0639\u0645\u0644 \u0648\u062A\u062D\u062F\u064A\u0627\u062A\u0647\u060C \u0648\u0633\u0646\u0628\u0642\u064A \u062F\u0627\u0626\u0645\u0627\u064B \u0641\u064A \u0635\u0641\u0647\u0645 \u0644\u0645\u0633\u0627\u0639\u062F\u062A\u0647\u0645."
                    )
                    Spacer(modifier = Modifier.height(10.dp))
                    PolicyItem(
                        icon = Icons.Default.SupportAgent,
                        title = "\u0646\u062F\u0639\u0645\u0643\u0645 \u0641\u064A \u0643\u0644 \u0627\u0644\u0638\u0631\u0648\u0641",
                        text = "\u0627\u0644\u0634\u0631\u0643\u0629 \u0645\u0633\u062A\u0639\u062F\u0629 \u062F\u0627\u0626\u0645\u0627\u064B \u0644\u0645\u0633\u0627\u0639\u062F\u0629 \u0627\u0644\u0633\u0627\u0626\u0642\u064A\u0646 \u0641\u064A \u062A\u0639\u0648\u064A\u0636 \u062E\u0633\u0627\u0626\u0631\u0647\u0645 \u0625\u0630\u0644\u0645 \u0644\u0632\u0645 \u0627\u0644\u0623\u0645\u0631. \u0646\u062D\u0646 \u0634\u0631\u0643\u0627\u0621 \u0641\u064A \u0627\u0644\u0646\u062C\u0627\u062D \u0648\u0633\u0646\u062A\u062D\u062F\u064A \u0627\u0644\u0635\u0639\u0648\u0628\u0627\u062A \u0645\u0639\u0627\u064B."
                    )
                    Spacer(modifier = Modifier.height(10.dp))
                    PolicyItem(
                        icon = Icons.Default.Handshake,
                        title = "\u0646\u0641\u0647\u0645 \u0637\u0628\u064A\u0639\u0629 \u0639\u0645\u0644\u0643\u0645",
                        text = "\u0646\u062F\u0631\u0643 \u0623\u0646 \u0627\u0644\u0639\u0645\u0644 \u0641\u064A \u0627\u0644\u062A\u0648\u0635\u064A\u0644 \u064A\u062D\u0645\u0644 \u062A\u062D\u062F\u064A\u0627\u062A \u0643\u062B\u064A\u0631\u0629\u060C \u0648\u0646\u062D\u0646 \u0645\u062A\u0641\u0647\u0645\u0648\u0646 \u0644\u0630\u0644\u0643 \u0628\u0639\u062F. \u0647\u062F\u0641\u0646\u0627 \u0623\u0646 \u0646\u0633\u0647\u0651\u0644 \u0627\u0644\u0639\u0645\u0644 \u0639\u0644\u064A\u0643\u0645 \u0648\u0646\u062D\u0645\u064A \u0645\u0635\u0627\u0644\u062D\u062A\u0643\u0645."
                    )
                }
            }
        }

        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White)
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Text("\u0645\u0646\u0634\u0648\u0631\u0627\u062A \u0648\u062A\u0646\u0628\u064A\u0647\u0627\u062A", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = KhalilyNavy)
                    Spacer(modifier = Modifier.height(10.dp))
                    PolicyItem(
                        icon = Icons.Default.Warning,
                        title = "\u062A\u0644\u0627\u0639\u0628 \u0641\u064A \u0627\u0644\u0625\u062C\u0631\u0627\u0621\u0627\u062A",
                        text = "\u0646\u0630\u0643\u0631\u0643\u0645 \u0628\u0644\u0637\u0641 \u0628\u0623\u0646 \u0627\u0644\u062A\u0644\u0627\u0639\u0628 \u0641\u064A \u0623\u064A \u0645\u0646 \u0625\u062C\u0631\u0627\u0621\u0627\u062A \u0627\u0644\u062A\u0637\u0628\u064A\u0642 \u0623\u0648 \u0645\u062D\u0627\u0648\u0644\u0629 \u062E\u0636\u0627\u0639 \u0627\u0644\u0646\u0638\u0627\u0645. \u062C\u0645\u064A\u0639 \u0627\u0644\u0639\u0645\u0644\u064A\u0627\u062A \u0645\u0631\u0627\u0642\u0628\u0629 \u0644\u062D\u0645\u0627\u064A\u0629 \u062D\u0642\u0648\u0642 \u0627\u0644\u0632\u0628\u0627\u0626\u0646 \u0648\u0627\u0644\u0633\u0627\u0626\u0642\u064A\u0646 \u0648\u0627\u0644\u0634\u0631\u0643\u0629 \u0645\u0639\u0627\u064B. \u0623\u064A \u0645\u062D\u0627\u0648\u0644\u0629 \u0633\u062A\u0623\u062F\u064A \u0625\u0644\u0649 \u0627\u062A\u062E\u0630 \u0625\u062C\u0631\u0627\u0621\u0627\u062A \u0644\u062D\u0645\u0627\u064A\u0629 \u0627\u0644\u062C\u0645\u064A\u0639."
                    )
                    Spacer(modifier = Modifier.height(10.dp))
                    PolicyItem(
                        icon = Icons.Default.Timer,
                        title = "\u0627\u0644\u0627\u0644\u062A\u0632\u0627\u0645 \u0628\u0627\u0644\u0645\u0648\u0627\u0639\u064A\u062F",
                        text = "\u064A\u064F\u0631\u062C\u0649 \u0625\u0643\u0645\u0627\u0644 \u0625\u062C\u0631\u0627\u0621\u0627\u062A \u0627\u0644\u0631\u062D\u0644\u0629 \u0641\u064A \u0627\u0644\u0648\u0642\u062A \u0627\u0644\u0645\u062D\u062F\u062F. \u0625\u0630\u0627 \u062D\u062F\u062B \u0634\u064A\u0621 \u063A\u064A\u0631 \u0645\u062A\u0648\u0642\u0639\u060C \u064A\u064F\u0631\u062C\u0649 \u0627\u0644\u062A\u0648\u0627\u0635\u0644 \u0645\u0639 \u0627\u0644\u0625\u062F\u0627\u0631\u0629 \u0641\u0648\u0631\u0627\u064B. \u0646\u062D\u0646 \u0647\u0646\u0627 \u0644\u0645\u0633\u0627\u0639\u062F\u062A\u0643\u0645 \u0648\u0644\u064A\u0633 \u0644\u0645\u0639\u0627\u0642\u0628\u062A\u0643\u0645."
                    )
                    Spacer(modifier = Modifier.height(10.dp))
                    PolicyItem(
                        icon = Icons.Default.VerifiedUser,
                        title = "\u0627\u0644\u0646\u0632\u0627\u0647\u0629 \u0648\u0627\u0644\u062B\u0642\u0629",
                        text = "\u0627\u0644\u062B\u0642\u0629 \u0647\u064A \u0623\u0633\u0627\u0633 \u0639\u0645\u0644\u0646\u0627. \u0646\u062B\u0642 \u0628\u0643\u0645 \u0648\u0646\u0631\u062C\u0648 \u0623\u0646 \u062A\u0643\u0648\u0646\u0648\u0627 \u0639\u0646\u062F \u062D\u0633\u0646 \u0638\u0646\u0646\u0627 \u062C\u0645\u064A\u0639\u0627\u064B. \u0627\u0644\u062E\u062F\u0645\u0629 \u0627\u0644\u0645\u062E\u0644\u0635\u0629 \u0644\u0644\u0632\u0628\u0648\u0646 \u0647\u064A \u0645\u0641\u062A\u0627\u062D \u0646\u062C\u0627\u062D\u0646\u0627 \u0627\u0644\u0645\u0634\u062A\u0631\u0643."
                    )

                    Spacer(modifier = Modifier.height(16.dp))
                    HorizontalDivider(color = Color(0xFFEEEEEE))
                    Spacer(modifier = Modifier.height(12.dp))
                    Text("\u00A9 2026 \u062E\u064E\u0644\u0650\u064A\u0644\u0650\u064A \u2014 \u062C\u0645\u064A\u0639 \u0627\u0644\u062D\u0642\u0648\u0642 \u0645\u062D\u0641\u0648\u0638\u0629", fontSize = 12.sp, color = KhalilyTextSecondary, textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth())
                }
            }
        }
    }
}

@Composable
private fun PolicyItem(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
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
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    value: String
) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(icon, contentDescription = null, tint = KhalilyTurquoise, modifier = Modifier.size(20.dp))
        Spacer(modifier = Modifier.width(14.dp))
        Text(label, fontSize = 14.sp, color = KhalilyTextSecondary, modifier = Modifier.weight(1f))
        Text(value, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = KhalilyTextPrimary)
    }
}
