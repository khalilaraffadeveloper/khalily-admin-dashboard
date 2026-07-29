package com.trendly.customer.ui.screens.home

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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.trendly.customer.ui.theme.*
import com.trendly.customer.util.NumberFormatter

@Composable
fun RideTrackingScreen(
    rideStatus: String,
    driverName: String,
    driverPhone: String,
    driverWhatsapp: String,
    pickupAddress: String,
    dropoffAddress: String,
    fare: Double,
    onRideCompleted: () -> Unit
) {
    val context = LocalContext.current

    val statusText = when (rideStatus) {
        "accepted" -> "السائق في طريقه إليك"
        "in_progress" -> "الرحلة قيد التنفيذ"
        "completed" -> "تمت الرحلة!"
        else -> "في الانتظار..."
    }

    val statusColor = when (rideStatus) {
        "accepted" -> StatusAccepted
        "in_progress" -> StatusInProgress
        "completed" -> StatusCompleted
        else -> TrendlyGray
    }

    val statusIcon = when (rideStatus) {
        "accepted" -> Icons.Default.DirectionsBike
        "in_progress" -> Icons.Default.Navigation
        "completed" -> Icons.Default.CheckCircle
        else -> Icons.Default.HourglassEmpty
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(TrendlyPinkSurface)
            .verticalScroll(rememberScrollState())
    ) {
        // Status header
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(bottomStart = 24.dp, bottomEnd = 24.dp),
            colors = CardDefaults.cardColors(containerColor = statusColor),
            elevation = CardDefaults.cardElevation(8.dp)
        ) {
            Column(
                modifier = Modifier.padding(24.dp).fillMaxWidth(),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Icon(statusIcon, null, modifier = Modifier.size(48.dp), tint = Color.White)
                Spacer(modifier = Modifier.height(12.dp))
                Text(statusText, fontSize = 22.sp, fontWeight = FontWeight.Bold, color = Color.White)
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Ride info
        Card(
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            elevation = CardDefaults.cardElevation(4.dp),
            modifier = Modifier.padding(horizontal = 16.dp).fillMaxWidth()
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.LocationOn, null, tint = TrendlyGreen, modifier = Modifier.size(20.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Column {
                        Text("من:", fontSize = 12.sp, color = TrendlyTextSecondary)
                        Text(pickupAddress, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = TrendlyTextPrimary)
                    }
                }
                Spacer(modifier = Modifier.height(12.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Flag, null, tint = TrendlyRed, modifier = Modifier.size(20.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Column {
                        Text("إلى:", fontSize = 12.sp, color = TrendlyTextSecondary)
                        Text(dropoffAddress, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = TrendlyTextPrimary)
                    }
                }
                HorizontalDivider(modifier = Modifier.padding(vertical = 12.dp), color = TrendlyGrayLight)
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Text("الأجرة:", fontSize = 14.sp, color = TrendlyTextSecondary)
                    Text("${NumberFormatter.format(fare)} MRU", fontSize = 20.sp, fontWeight = FontWeight.Bold, color = TrendlyGold)
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Driver info (visible after accepted)
        if (rideStatus in listOf("accepted", "in_progress", "completed") && driverName.isNotEmpty()) {
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                elevation = CardDefaults.cardElevation(4.dp),
                modifier = Modifier.padding(horizontal = 16.dp).fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("معلومات السائق", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = TrendlyPink)
                    Spacer(modifier = Modifier.height(8.dp))

                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Person, null, tint = TrendlyPink, modifier = Modifier.size(20.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(driverName, fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
                    }

                    if (driverPhone.isNotEmpty()) {
                        Spacer(modifier = Modifier.height(8.dp))
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Phone, null, tint = TrendlyGreen, modifier = Modifier.size(20.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(driverPhone, fontSize = 14.sp)
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        if (driverPhone.isNotEmpty()) {
                            Button(
                                onClick = {
                                    val intent = Intent(Intent.ACTION_DIAL, Uri.parse("tel:$driverPhone"))
                                    context.startActivity(intent)
                                },
                                modifier = Modifier.weight(1f).height(48.dp),
                                shape = RoundedCornerShape(12.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = TrendlyGreen)
                            ) {
                                Icon(Icons.Default.Call, null, modifier = Modifier.size(18.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("اتصل", fontSize = 14.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                        if (driverWhatsapp.isNotEmpty()) {
                            Button(
                                onClick = {
                                    val intent = Intent(Intent.ACTION_VIEW, Uri.parse("https://wa.me/222${driverWhatsapp}"))
                                    context.startActivity(intent)
                                },
                                modifier = Modifier.weight(1f).height(48.dp),
                                shape = RoundedCornerShape(12.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = TrendlyGreen)
                            ) {
                                Icon(Icons.Default.Chat, null, modifier = Modifier.size(18.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("واتساب", fontSize = 14.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }
        }

        if (rideStatus == "completed") {
            Spacer(modifier = Modifier.height(24.dp))
            Button(
                onClick = onRideCompleted,
                modifier = Modifier.padding(horizontal = 16.dp).fillMaxWidth().height(56.dp),
                shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.buttonColors(containerColor = TrendlyPink)
            ) {
                Icon(Icons.Default.Home, null, modifier = Modifier.size(20.dp))
                Spacer(modifier = Modifier.width(8.dp))
                Text("العودة للرئيسية", fontSize = 18.sp, fontWeight = FontWeight.Bold)
            }
        }

        Spacer(modifier = Modifier.height(24.dp))
    }
}
