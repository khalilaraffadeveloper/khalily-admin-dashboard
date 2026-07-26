package com.khalily.driver.ui.screens.home

import android.content.Intent
import android.net.Uri
import androidx.compose.animation.core.*
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
import androidx.compose.ui.draw.scale
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.khalily.driver.ui.theme.*
import com.khalily.driver.util.NumberFormatter

@Composable
fun RideRequestDialog(
    rideData: Map<String, Any>,
    onAccept: () -> Unit,
    onDecline: () -> Unit
) {
    val context = LocalContext.current

    val scaleAnim = rememberInfiniteTransition(label = "scale")
    val scale by scaleAnim.animateFloat(
        initialValue = 0.95f, targetValue = 1.0f,
        animationSpec = infiniteRepeatable(tween(800, easing = FastOutSlowInEasing), RepeatMode.Reverse),
        label = "scale"
    )

    val pulseAnim = rememberInfiniteTransition(label = "pulse")
    val pulseScale by pulseAnim.animateFloat(
        initialValue = 1f, targetValue = 1.2f,
        animationSpec = infiniteRepeatable(tween(600, easing = FastOutSlowInEasing), RepeatMode.Reverse),
        label = "pulseScale"
    )

    Dialog(
        onDismissRequest = { },
        properties = DialogProperties(dismissOnBackPress = false, dismissOnClickOutside = false, usePlatformDefaultWidth = false)
    ) {
        Card(
            modifier = Modifier
                .fillMaxWidth(0.92f)
                .padding(16.dp)
                .scale(scale)
                .shadow(16.dp, RoundedCornerShape(28.dp)),
            shape = RoundedCornerShape(28.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White)
        ) {
            Column(
                modifier = Modifier.fillMaxWidth(),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(
                            Brush.horizontalGradient(listOf(KhalilyGold, KhalilyGoldDark)),
                            RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp)
                        )
                        .padding(24.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Box(
                            modifier = Modifier
                                .size(72.dp)
                                .scale(pulseScale)
                                .background(Color.White.copy(alpha = 0.25f), CircleShape),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.TwoWheeler,
                                contentDescription = null,
                                tint = Color.White,
                                modifier = Modifier.size(40.dp)
                            )
                        }
                        Spacer(modifier = Modifier.height(12.dp))
                        Text(
                            text = "طلب رحلة جديد!",
                            fontSize = 22.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                    }
                }

                Column(modifier = Modifier.padding(24.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceEvenly
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(
                                text = "المسافة",
                                fontSize = 12.sp,
                                color = KhalilyTextSecondary
                            )
                            Text(
                                text = "${rideData["realDistanceKm"] ?: rideData["distanceKm"] ?: "0"} km",
                                fontSize = 20.sp,
                                fontWeight = FontWeight.ExtraBold,
                                color = KhalilyTextPrimary
                            )
                        }
                        Box(
                            modifier = Modifier
                                .width(1.dp)
                                .height(40.dp)
                                .background(Color(0xFFE0E0E0))
                        )
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(
                                text = "السعر",
                                fontSize = 12.sp,
                                color = KhalilyTextSecondary
                            )
                            Text(
                                text = "${rideData["fare"] ?: rideData["estimatedFare"] ?: "0"} MRU",
                                fontSize = 20.sp,
                                fontWeight = FontWeight.ExtraBold,
                                color = KhalilyGoldDark
                            )
                        }
                    }

                    HorizontalDivider(modifier = Modifier.padding(vertical = 16.dp))

                    RideInfoRow(icon = Icons.Default.PlayArrow, label = "الانطلاق", value = rideData["pickupAddress"]?.toString() ?: "موقع الزبون")
                    Spacer(modifier = Modifier.height(12.dp))
                    RideInfoRow(icon = Icons.Default.Place, label = "الوجهة", value = rideData["dropoffAddress"]?.toString() ?: "المحدد لاحقاً")

                    Spacer(modifier = Modifier.height(16.dp))

                    Button(
                        onClick = onAccept,
                        modifier = Modifier.fillMaxWidth().height(54.dp),
                        shape = RoundedCornerShape(16.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2E7D32)),
                        elevation = ButtonDefaults.buttonElevation(defaultElevation = 4.dp)
                    ) {
                        Icon(Icons.Default.Check, contentDescription = null, modifier = Modifier.size(22.dp), tint = Color.White)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("قبول الرحلة", fontSize = 17.sp, fontWeight = FontWeight.Bold, color = Color.White)
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    OutlinedButton(
                        onClick = onDecline,
                        modifier = Modifier.fillMaxWidth().height(54.dp),
                        shape = RoundedCornerShape(16.dp),
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = KhalilyError)
                    ) {
                        Icon(Icons.Default.Close, contentDescription = null, modifier = Modifier.size(22.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("رفض", fontSize = 17.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}

@Composable
fun RideDetailDialog(
    rideData: Map<String, Any>,
    onDismiss: () -> Unit,
    onStarted: () -> Unit
) {
    val context = LocalContext.current
    val passengerPhone = rideData["passengerPhone"]?.toString() ?: ""
    var hasArrived by remember { mutableStateOf(false) }

    Dialog(
        onDismissRequest = { },
        properties = DialogProperties(dismissOnBackPress = false, dismissOnClickOutside = false, usePlatformDefaultWidth = false)
    ) {
        Card(
            modifier = Modifier.fillMaxWidth(0.92f).padding(16.dp).shadow(16.dp, RoundedCornerShape(20.dp)),
            shape = RoundedCornerShape(20.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White)
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
                            .size(40.dp)
                            .background(KhalilyGreenSurface, CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(Icons.Default.CheckCircle, contentDescription = null, tint = KhalilyGreen, modifier = Modifier.size(24.dp))
                    }
                    Spacer(modifier = Modifier.width(12.dp))
                    Column {
                        Text("تم قبول الرحلة", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = KhalilyNavy)
                        Text(
                            if (!hasArrived) "اتصل بالزبون ثم وصل لنقطة الانطلاق"
                            else "أنت في نقطة الانطلاق، ابدأ الرحلة",
                            fontSize = 12.sp, color = KhalilyTextSecondary
                        )
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))
                HorizontalDivider(color = Color(0xFFEEEEEE))
                Spacer(modifier = Modifier.height(12.dp))

                CompactInfoRow(icon = Icons.Default.Person, label = "الزبون", value = rideData["passengerName"]?.toString() ?: "زبون")
                CompactInfoRow(icon = Icons.Default.Phone, label = "الهاتف", value = rideData["passengerPhone"]?.toString() ?: "-")
                CompactInfoRow(icon = Icons.Default.PlayArrow, label = "الانطلاق", value = rideData["pickupAddress"]?.toString() ?: "")
                CompactInfoRow(icon = Icons.Default.Place, label = "الوجهة", value = rideData["dropoffAddress"]?.toString() ?: "")
                CompactInfoRow(icon = Icons.Default.AttachMoney, label = "السعر", value = "${rideData["fare"] ?: rideData["estimatedFare"] ?: "0"} MRU")

                Spacer(modifier = Modifier.height(12.dp))
                HorizontalDivider(color = Color(0xFFEEEEEE))
                Spacer(modifier = Modifier.height(12.dp))

                if (passengerPhone.isNotEmpty()) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Button(
                            onClick = {
                                val intent = Intent(Intent.ACTION_DIAL).apply { data = Uri.parse("tel:$passengerPhone") }
                                context.startActivity(intent)
                            },
                            modifier = Modifier.weight(1f).height(46.dp),
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = KhalilyTurquoise)
                        ) {
                            Icon(Icons.Default.Phone, contentDescription = null, modifier = Modifier.size(18.dp), tint = Color.White)
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("اتصال", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = Color.White)
                        }

                        Button(
                            onClick = {
                                val cleanPhone = passengerPhone.replace("[^0-9]".toRegex(), "")
                                val fullPhone = if (cleanPhone.startsWith("222")) cleanPhone else "222$cleanPhone"
                                context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://wa.me/$fullPhone")))
                            },
                            modifier = Modifier.weight(1f).height(46.dp),
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF25D366))
                        ) {
                            Text("WhatsApp", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = Color.White)
                        }
                    }

                    Spacer(modifier = Modifier.height(10.dp))
                }

                Button(
                    onClick = { hasArrived = true },
                    modifier = Modifier.fillMaxWidth().height(50.dp),
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (hasArrived) Color(0xFFB0BEC5) else Color(0xFF1565C0)
                    ),
                    enabled = !hasArrived
                ) {
                    Icon(Icons.Default.CheckCircle, contentDescription = null, modifier = Modifier.size(20.dp), tint = Color.White)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("وصلت للزبون", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Color.White)
                }

                if (hasArrived) {
                    Spacer(modifier = Modifier.height(8.dp))
                    Button(
                        onClick = onStarted,
                        modifier = Modifier.fillMaxWidth().height(50.dp),
                        shape = RoundedCornerShape(14.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2E7D32))
                    ) {
                        Icon(Icons.Default.PlayArrow, contentDescription = null, modifier = Modifier.size(20.dp), tint = Color.White)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("بدأ الرحلة", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Color.White)
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))

                OutlinedButton(
                    onClick = onDismiss,
                    modifier = Modifier.fillMaxWidth().height(42.dp),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text(text = "إغلاق", fontSize = 13.sp)
                }
            }
        }
    }
}

@Composable
private fun CompactInfoRow(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    value: String
) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 5.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(imageVector = icon, contentDescription = null, tint = KhalilyTurquoise, modifier = Modifier.size(16.dp))
        Spacer(modifier = Modifier.width(8.dp))
        Text(text = label, fontSize = 12.sp, color = KhalilyTextSecondary, fontWeight = FontWeight.Medium, modifier = Modifier.width(52.dp))
        Text(text = value, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = KhalilyTextPrimary, maxLines = 1)
    }
}

@Composable
private fun RideInfoRow(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    value: String
) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)
    ) {
        Icon(imageVector = icon, contentDescription = null, tint = KhalilyTurquoise, modifier = Modifier.size(16.dp))
        Spacer(modifier = Modifier.width(8.dp))
        Text(text = label, fontSize = 12.sp, color = KhalilyTextSecondary, fontWeight = FontWeight.Medium)
        Spacer(modifier = Modifier.width(6.dp))
        Text(text = value, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = KhalilyTextPrimary)
    }
}
