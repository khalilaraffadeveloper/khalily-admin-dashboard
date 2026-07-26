package com.khalily.driver.ui.screens.settings

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.google.firebase.firestore.FirebaseFirestore
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
    val createdAt: String = ""
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    onBack: () -> Unit = {}
) {
    val context = LocalContext.current
    val db = FirebaseFirestore.getInstance()
    val driverId = PrefsManager.getDriverId(context) ?: ""

    var rideHistory by remember { mutableStateOf<List<RideHistoryItem>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var selectedTab by remember { mutableIntStateOf(0) }

    LaunchedEffect(Unit) {
        if (driverId.isNotEmpty()) {
            db.collection("rides")
                .whereEqualTo("assignedDriverId", driverId)
                .orderBy("createdAt", com.google.firebase.firestore.Query.Direction.DESCENDING)
                .limit(50)
                .get()
                .addOnSuccessListener { snapshot ->
                    val sdf = SimpleDateFormat("yyyy/MM/dd HH:mm", Locale.getDefault())
                    rideHistory = snapshot.documents.map { doc ->
                        val created = doc.getTimestamp("createdAt")?.toDate()
                        val fare = doc.getDouble("fare") ?: 0.0
                        val commPct = doc.getDouble("commissionPercent") ?: 10.0
                        RideHistoryItem(
                            rideId = doc.id,
                            passengerName = doc.getString("passengerName") ?: "",
                            pickupAddress = doc.getString("pickupAddress") ?: "",
                            dropoffAddress = doc.getString("dropoffAddress") ?: "",
                            fare = fare,
                            commission = Math.round(fare * commPct / 100).toDouble(),
                            distanceKm = doc.getDouble("distanceKm") ?: 0.0,
                            status = doc.getString("status") ?: "",
                            createdAt = if (created != null) sdf.format(created) else ""
                        )
                    }
                    isLoading = false
                }
                .addOnFailureListener { isLoading = false }
        }
    }

    Column(modifier = Modifier.fillMaxSize()) {
        // Top bar
        TopAppBar(
            title = { Text("الإعدادات", fontWeight = FontWeight.Bold) },
            navigationIcon = {
                IconButton(onClick = onBack) {
                    Icon(Icons.Default.ArrowBack, contentDescription = "رجوع")
                }
            },
            colors = TopAppBarDefaults.topAppBarColors(
                containerColor = KhalilyPrimary,
                titleContentColor = Color.White,
                navigationIconContentColor = Color.White
            )
        )

        // Tabs
        TabRow(
            selectedTabIndex = selectedTab,
            containerColor = MaterialTheme.colorScheme.surface,
            contentColor = KhalilyPrimary
        ) {
            Tab(
                selected = selectedTab == 0,
                onClick = { selectedTab = 0 },
                text = { Text("الرحلات", fontWeight = FontWeight.Bold) },
                icon = { Icon(Icons.Default.History, contentDescription = null) }
            )
            Tab(
                selected = selectedTab == 1,
                onClick = { selectedTab = 1 },
                text = { Text("التواصل", fontWeight = FontWeight.Bold) },
                icon = { Icon(Icons.Default.ContactPhone, contentDescription = null) }
            )
            Tab(
                selected = selectedTab == 2,
                onClick = { selectedTab = 2 },
                text = { Text("تزويد الرصيد", fontWeight = FontWeight.Bold) },
                icon = { Icon(Icons.Default.AccountBalanceWallet, contentDescription = null) }
            )
        }

        when (selectedTab) {
            0 -> RideHistoryTab(rideHistory, isLoading)
            1 -> ContactInfoTab(context)
            2 -> TopUpInfoTab(context)
        }
    }
}

@Composable
private fun RideHistoryTab(rides: List<RideHistoryItem>, isLoading: Boolean) {
    if (isLoading) {
        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center
        ) {
            CircularProgressIndicator(color = KhalilyPrimary)
        }
        return
    }

    if (rides.isEmpty()) {
        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Icon(
                    imageVector = Icons.Default.History,
                    contentDescription = null,
                    tint = KhalilyTextSecondary,
                    modifier = Modifier.size(64.dp)
                )
                Spacer(modifier = Modifier.height(16.dp))
                Text(
                    text = "لا توجد رحلات سابقة",
                    fontSize = 16.sp,
                    color = KhalilyTextSecondary
                )
            }
        }
        return
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        items(rides) { ride ->
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(14.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = ride.passengerName,
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold,
                            color = KhalilyTextPrimary
                        )
                        val statusColor = when (ride.status) {
                            "completed" -> KhalilySuccess
                            "cancelled" -> KhalilyError
                            "in_progress" -> KhalilyGold
                            else -> KhalilyTextSecondary
                        }
                        val statusText = when (ride.status) {
                            "completed" -> "مكتملة"
                            "cancelled" -> "ملغاة"
                            "in_progress" -> "جارية"
                            "accepted" -> "مقبولة"
                            else -> ride.status
                        }
                        Card(
                            shape = RoundedCornerShape(8.dp),
                            colors = CardDefaults.cardColors(containerColor = statusColor.copy(alpha = 0.1f))
                        ) {
                            Text(
                                text = statusText,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = statusColor
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.PlayArrow, contentDescription = null, tint = KhalilyGold, modifier = Modifier.size(14.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(ride.pickupAddress.ifEmpty { "-" }, fontSize = 13.sp, color = KhalilyTextSecondary)
                    }
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Place, contentDescription = null, tint = KhalilyError, modifier = Modifier.size(14.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(ride.dropoffAddress.ifEmpty { "-" }, fontSize = 13.sp, color = KhalilyTextSecondary)
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    Divider(color = Color(0xFFEEEEEE))

                    Spacer(modifier = Modifier.height(8.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Column {
                            Text("السعر", fontSize = 11.sp, color = KhalilyTextSecondary)
                            Text(
                                "${ride.fare} MRU",
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Bold,
                                color = KhalilyPrimary
                            )
                        }
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("العمولة", fontSize = 11.sp, color = KhalilyTextSecondary)
                            Text(
                                "${ride.commission} MRU",
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Bold,
                                color = KhalilyError
                            )
                        }
                        Column(horizontalAlignment = Alignment.End) {
                            Text("التاريخ", fontSize = 11.sp, color = KhalilyTextSecondary)
                            Text(
                                ride.createdAt,
                                fontSize = 12.sp,
                                color = KhalilyTextSecondary
                            )
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
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = Color(0xFFE3F2FD))
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Icon(
                        imageVector = Icons.Default.Phone,
                        contentDescription = null,
                        tint = KhalilyPrimary,
                        modifier = Modifier.size(32.dp)
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    Text(
                        text = "التواصل عبر الهاتف",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        color = KhalilyPrimaryDark
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "47717983",
                        fontSize = 24.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = KhalilyPrimary
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Button(
                        onClick = {
                            val intent = Intent(Intent.ACTION_DIAL).apply {
                                data = Uri.parse("tel:47717983")
                            }
                            context.startActivity(intent)
                        },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = KhalilyGold)
                    ) {
                        Icon(Icons.Default.Phone, contentDescription = null)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("اتصل الآن", fontWeight = FontWeight.Bold)
                    }
                }
            }
        }

        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = Color(0xFFE8F5E9))
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Icon(
                        imageVector = Icons.Default.Whatsapp,
                        contentDescription = null,
                        tint = Color(0xFF25D366),
                        modifier = Modifier.size(32.dp)
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    Text(
                        text = "واتساب لشحن الرصيد",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF1B5E20)
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "26067036",
                        fontSize = 24.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = Color(0xFF25D366)
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Button(
                        onClick = {
                            val intent = Intent(Intent.ACTION_VIEW).apply {
                                data = Uri.parse("https://wa.me/22226067036")
                            }
                            context.startActivity(intent)
                        },
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
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.AccountBalanceWallet,
                            contentDescription = null,
                            tint = KhalilyGold,
                            modifier = Modifier.size(28.dp)
                        )
                        Spacer(modifier = Modifier.width(12.dp))
                        Text(
                            text = "كيفية تزويد الرصيد",
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Bold,
                            color = KhalilyPrimaryDark
                        )
                    }

                    Spacer(modifier = Modifier.height(20.dp))

                    // Step 1
                    StepItem(
                        stepNumber = "١",
                        title = "إرسال المبلغ",
                        description = "قم بإرسال مبلغ التزويد الذي يجب أن لا يقل عن 100 أوقية إلى الرقم:"
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(10.dp),
                        colors = CardDefaults.cardColors(containerColor = Color(0xFFE3F2FD))
                    ) {
                        Text(
                            text = "26067036",
                            modifier = Modifier.padding(12.dp),
                            fontSize = 20.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = KhalilyPrimary,
                            textAlign = TextAlign.Center
                        )
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    // Step 2
                    StepItem(
                        stepNumber = "٢",
                        title = "طرق الدفع",
                        description = "يمكنك الدفع عبر:"
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    PaymentMethodChip("بنكيلي")
                    Spacer(modifier = Modifier.height(4.dp))
                    PaymentMethodChip("السداد المصرفي")
                    Spacer(modifier = Modifier.height(4.dp))
                    PaymentMethodChip("بيم بانك")
                    Spacer(modifier = Modifier.height(4.dp))
                    PaymentMethodChip("اكليك")

                    Spacer(modifier = Modifier.height(16.dp))

                    // Step 3
                    StepItem(
                        stepNumber = "٣",
                        title = "إرسال الإثبات",
                        description = "قم بإرسال لقطة من الشاشة (Screen Shot) إلى رقم الواتساب:"
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(10.dp),
                        colors = CardDefaults.cardColors(containerColor = Color(0xFFE8F5E9))
                    ) {
                        Text(
                            text = "26067036",
                            modifier = Modifier.padding(12.dp),
                            fontSize = 20.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = Color(0xFF25D366),
                            textAlign = TextAlign.Center
                        )
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    // Step 4
                    StepItem(
                        stepNumber = "٤",
                        title = "إرفاق رقم الحساب",
                        description = "أرفق لقطة الشاشة مع رقم حسابك في التطبيق وسيتم شحن رصيدك خلال دقائق"
                    )

                    Spacer(modifier = Modifier.height(20.dp))

                    Button(
                        onClick = {
                            val intent = Intent(Intent.ACTION_VIEW).apply {
                                data = Uri.parse("https://wa.me/22226067036")
                            }
                            context.startActivity(intent)
                        },
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
    Row(modifier = Modifier.fillMaxWidth()) {
        Card(
            shape = CircleShape,
            colors = CardDefaults.cardColors(containerColor = KhalilyPrimary),
            modifier = Modifier.size(28.dp)
        ) {
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier.fillMaxSize()
            ) {
                Text(
                    text = stepNumber,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
            }
        }
        Spacer(modifier = Modifier.width(12.dp))
        Column {
            Text(
                text = title,
                fontSize = 15.sp,
                fontWeight = FontWeight.Bold,
                color = KhalilyTextPrimary
            )
            Text(
                text = description,
                fontSize = 13.sp,
                color = KhalilyTextSecondary
            )
        }
    }
}

@Composable
private fun PaymentMethodChip(method: String) {
    Card(
        shape = RoundedCornerShape(8.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFFF5F5F5))
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = Icons.Default.CheckCircle,
                contentDescription = null,
                tint = KhalilySuccess,
                modifier = Modifier.size(16.dp)
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = method,
                fontSize = 14.sp,
                fontWeight = FontWeight.SemiBold,
                color = KhalilyTextPrimary
            )
        }
    }
}
