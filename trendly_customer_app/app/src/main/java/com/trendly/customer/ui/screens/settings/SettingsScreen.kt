package com.trendly.customer.ui.screens.settings

import android.content.Intent
import android.net.Uri
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.trendly.customer.R
import com.trendly.customer.ui.theme.*
import com.trendly.customer.util.NumberFormatter
import com.trendly.customer.util.PrefsManager
import com.google.firebase.firestore.FirebaseFirestore

@Composable
fun SettingsScreen(
    customerName: String,
    customerPhone: String,
    customerWhatsapp: String,
    credit: Double,
    totalRides: Int,
    onLogout: () -> Unit
) {
    val context = LocalContext.current
    var selectedTab by remember { mutableIntStateOf(0) }
    val tabs = listOf("معلوماتي", "شحن الرصيد", "التواصل", "تسجيل الخروج")

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(TrendlyPinkSurface)
    ) {
        // Header
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(bottomStart = 24.dp, bottomEnd = 24.dp),
            colors = CardDefaults.cardColors(containerColor = TrendlyPink),
            elevation = CardDefaults.cardElevation(8.dp)
        ) {
            Column(
                modifier = Modifier.padding(20.dp).fillMaxWidth(),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Image(
                    painter = painterResource(id = R.drawable.hamada3),
                    contentDescription = null,
                    modifier = Modifier
                        .size(80.dp)
                        .shadow(8.dp, CircleShape)
                        .clip(CircleShape)
                        .background(Color.White)
                        .padding(4.dp)
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(customerName, fontSize = 22.sp, fontWeight = FontWeight.Bold, color = Color.White)
                Text("الرصيد: ${NumberFormatter.format(credit)} MRU", fontSize = 14.sp, color = TrendlyGoldLight)
            }
        }

        Spacer(modifier = Modifier.height(8.dp))

        // Tabs
        Row(
            modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()).padding(horizontal = 12.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            tabs.forEachIndexed { index, title ->
                FilterChip(
                    selected = selectedTab == index,
                    onClick = {
                        if (index == 3) {
                            PrefsManager.clear()
                            onLogout()
                        } else {
                            selectedTab = index
                        }
                    },
                    label = { Text(title, fontSize = 13.sp) },
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = TrendlyPink,
                        selectedLabelColor = Color.White
                    )
                )
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        when (selectedTab) {
            0 -> MyInfoTab(customerName, customerPhone, customerWhatsapp, totalRides, credit)
            1 -> CreditTab()
            2 -> ContactTab(context)
        }
    }
}

@Composable
private fun MyInfoTab(name: String, phone: String, whatsapp: String, totalRides: Int, credit: Double) {
    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(4.dp),
        modifier = Modifier.padding(horizontal = 16.dp).fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            InfoRow(Icons.Default.Person, "الاسم", name)
            InfoRow(Icons.Default.Phone, "الهاتف", phone)
            InfoRow(Icons.Default.Chat, "الواتساب", whatsapp)
            InfoRow(Icons.Default.TwoWheeler, "الرحلات", "$totalRides رحلة")
            InfoRow(Icons.Default.AccountBalanceWallet, "الرصيد", "${NumberFormatter.format(credit)} MRU")
        }
    }
}

@Composable
private fun InfoRow(icon: androidx.compose.ui.graphics.vector.ImageVector, label: String, value: String) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(icon, null, tint = TrendlyPink, modifier = Modifier.size(20.dp))
        Spacer(modifier = Modifier.width(12.dp))
        Text(label, fontSize = 14.sp, color = TrendlyTextSecondary, modifier = Modifier.weight(1f))
        Text(value, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = TrendlyTextPrimary)
    }
}

@Composable
private fun CreditTab() {
    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(4.dp),
        modifier = Modifier.padding(horizontal = 16.dp).fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text("شحن الرصيد", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = TrendlyPink)
            Spacer(modifier = Modifier.height(12.dp))

            val steps = listOf(
                "1. أرسل المبلغ (الحد الأدنى 100 MRU) على الرقم 26067036",
                "2. طرق الدفع: بنكيلي، السداد، مصرفي، بيم بانك، كлик",
                "3. أرسل لقطة الشاشة على واتساب 26067036",
                "4. أرفق رقم حسابك"
            )
            steps.forEach { step ->
                Text(step, fontSize = 13.sp, color = TrendlyTextPrimary, modifier = Modifier.padding(vertical = 4.dp))
            }
        }
    }
}

@Composable
private fun ContactTab(context: android.content.Context) {
    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(4.dp),
        modifier = Modifier.padding(horizontal = 16.dp).fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text("التواصل مع الشركة", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = TrendlyPink)
            Spacer(modifier = Modifier.height(12.dp))

            Button(
                onClick = { context.startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:47717983"))) },
                modifier = Modifier.fillMaxWidth().height(48.dp),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(containerColor = TrendlyGreen)
            ) {
                Icon(Icons.Default.Call, null, modifier = Modifier.size(18.dp))
                Spacer(modifier = Modifier.width(8.dp))
                Text("47717983 — اتصل بالشركة", fontSize = 14.sp, fontWeight = FontWeight.Bold)
            }

            Spacer(modifier = Modifier.height(8.dp))

            Button(
                onClick = { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://wa.me/22226067036"))) },
                modifier = Modifier.fillMaxWidth().height(48.dp),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(containerColor = TrendlyGreen)
            ) {
                Icon(Icons.Default.Chat, null, modifier = Modifier.size(18.dp))
                Spacer(modifier = Modifier.width(8.dp))
                Text("واتساب: 26067036", fontSize = 14.sp, fontWeight = FontWeight.Bold)
            }

            Spacer(modifier = Modifier.height(16.dp))

            Text("لإلغاء الرحلة، اتصل بالشركة مباشرة.", fontSize = 13.sp, color = TrendlyTextSecondary)
            Text("الحد الأدنى للشحن: 100 MRU", fontSize = 13.sp, color = TrendlyTextSecondary)
        }
    }
}
