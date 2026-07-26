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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.khalily.driver.ui.theme.*
import com.khalily.driver.util.SoundPlayer

@Composable
fun RideRequestDialog(
    rideData: Map<String, Any>,
    onAccept: () -> Unit,
    onDecline: () -> Unit
) {
    val context = LocalContext.current
    val pulseAnim = rememberInfiniteTransition(label = "pulse")
    val pulseScale by pulseAnim.animateFloat(
        initialValue = 1f,
        targetValue = 1.15f,
        animationSpec = infiniteRepeatable(
            animation = tween(600, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "pulseScale"
    )

    Dialog(
        onDismissRequest = { },
        properties = DialogProperties(
            dismissOnBackPress = false,
            dismissOnClickOutside = false,
            usePlatformDefaultWidth = false
        )
    ) {
        Card(
            modifier = Modifier
                .fillMaxWidth(0.92f)
                .padding(16.dp),
            shape = RoundedCornerShape(28.dp),
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.surface
            ),
            elevation = CardDefaults.cardElevation(defaultElevation = 16.dp)
        ) {
            Column(
                modifier = Modifier.padding(28.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Box(
                    modifier = Modifier
                        .size(80.dp)
                        .scale(pulseScale)
                        .background(
                            KhalilyGold,
                            CircleShape
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.TwoWheeler,
                        contentDescription = null,
                        tint = Color.White,
                        modifier = Modifier.size(44.dp)
                    )
                }

                Spacer(modifier = Modifier.height(20.dp))

                Text(
                    text = "طلب رحلة جديد!",
                    fontSize = 24.sp,
                    fontWeight = FontWeight.Bold,
                    color = KhalilyPrimaryDark,
                    textAlign = TextAlign.Center
                )

                Spacer(modifier = Modifier.height(20.dp))

                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = KhalilyBackground
                    )
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        RideInfoRow(
                            icon = Icons.Default.PlayArrow,
                            label = "نقطة الانطلاق",
                            value = rideData["pickupAddress"]?.toString() ?: "موقع الزبون"
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        RideInfoRow(
                            icon = Icons.Default.Place,
                            label = "نقطة الوصول",
                            value = rideData["dropoffAddress"]?.toString() ?: "المحدد لاحقاً"
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        RideInfoRow(
                            icon = Icons.Default.Straighten,
                            label = "المسافة",
                            value = "${rideData["distanceKm"] ?: "0"} كم"
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        RideInfoRow(
                            icon = Icons.Default.AttachMoney,
                            label = "سعر الرحلة",
                            value = "${rideData["fare"] ?: rideData["estimatedFare"] ?: "0"} MRU"
                        )
                    }
                }

                Spacer(modifier = Modifier.height(28.dp))

                Button(
                    onClick = onAccept,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(56.dp),
                    shape = RoundedCornerShape(16.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = KhalilySuccess
                    )
                ) {
                    Icon(
                        imageVector = Icons.Default.TwoWheeler,
                        contentDescription = null,
                        modifier = Modifier.size(24.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "قبول الرحلة",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold
                    )
                }

                Spacer(modifier = Modifier.height(12.dp))

                OutlinedButton(
                    onClick = onDecline,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(56.dp),
                    shape = RoundedCornerShape(16.dp),
                    colors = ButtonDefaults.outlinedButtonColors(
                        contentColor = KhalilyError
                    )
                ) {
                    Icon(
                        imageVector = Icons.Default.Close,
                        contentDescription = null,
                        modifier = Modifier.size(24.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "رفض",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }
    }
}

@Composable
fun RideDetailDialog(
    rideData: Map<String, Any>,
    onDismiss: () -> Unit
) {
    val context = LocalContext.current
    val passengerPhone = rideData["passengerPhone"]?.toString() ?: ""

    Dialog(
        onDismissRequest = { },
        properties = DialogProperties(
            dismissOnBackPress = false,
            dismissOnClickOutside = false,
            usePlatformDefaultWidth = false
        )
    ) {
        Card(
            modifier = Modifier
                .fillMaxWidth(0.92f)
                .padding(16.dp),
            shape = RoundedCornerShape(28.dp),
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.surface
            ),
            elevation = CardDefaults.cardElevation(defaultElevation = 16.dp)
        ) {
            Column(
                modifier = Modifier.padding(28.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Icon(
                    imageVector = Icons.Default.CheckCircle,
                    contentDescription = null,
                    tint = KhalilySuccess,
                    modifier = Modifier.size(64.dp)
                )

                Spacer(modifier = Modifier.height(16.dp))

                Text(
                    text = "تم قبول الرحلة!",
                    fontSize = 22.sp,
                    fontWeight = FontWeight.Bold,
                    color = KhalilySuccess
                )

                Spacer(modifier = Modifier.height(8.dp))

                Text(
                    text = "اتصل بالزبون لتأكيد الوصول",
                    fontSize = 14.sp,
                    color = KhalilyTextSecondary
                )

                Spacer(modifier = Modifier.height(20.dp))

                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = KhalilyBackground)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        RideInfoRow(
                            icon = Icons.Default.PlayArrow,
                            label = "الانطلاق",
                            value = rideData["pickupAddress"]?.toString() ?: ""
                        )
                        Spacer(modifier = Modifier.height(10.dp))
                        RideInfoRow(
                            icon = Icons.Default.Place,
                            label = "الوجهة",
                            value = rideData["dropoffAddress"]?.toString() ?: ""
                        )
                        Spacer(modifier = Modifier.height(10.dp))
                        RideInfoRow(
                            icon = Icons.Default.AttachMoney,
                            label = "السعر",
                            value = "${rideData["fare"] ?: rideData["estimatedFare"] ?: "0"} MRU"
                        )
                    }
                }

                Spacer(modifier = Modifier.height(24.dp))

                if (passengerPhone.isNotEmpty()) {
                    Button(
                        onClick = {
                            val intent = Intent(Intent.ACTION_DIAL).apply {
                                data = Uri.parse("tel:$passengerPhone")
                            }
                            context.startActivity(intent)
                        },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(52.dp),
                        shape = RoundedCornerShape(14.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = KhalilyPrimary)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Phone,
                            contentDescription = null,
                            modifier = Modifier.size(22.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "اتصال هاتفي",
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    Button(
                        onClick = {
                            val cleanPhone = passengerPhone.replace("[^0-9]".toRegex(), "")
                            val fullPhone = if (cleanPhone.startsWith("222")) cleanPhone
                            else "222$cleanPhone"
                            val intent = Intent(Intent.ACTION_VIEW).apply {
                                data = Uri.parse("https://wa.me/$fullPhone")
                            }
                            context.startActivity(intent)
                        },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(52.dp),
                        shape = RoundedCornerShape(14.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF25D366))
                    ) {
                        Text(
                            text = "WhatsApp",
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                OutlinedButton(
                    onClick = onDismiss,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(48.dp),
                    shape = RoundedCornerShape(14.dp)
                ) {
                    Text(text = "إغلاق", fontSize = 14.sp)
                }
            }
        }
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
        modifier = Modifier.fillMaxWidth()
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = KhalilyPrimary,
            modifier = Modifier.size(20.dp)
        )
        Spacer(modifier = Modifier.width(12.dp))
        Column {
            Text(
                text = label,
                fontSize = 12.sp,
                color = KhalilyTextSecondary
            )
            Text(
                text = value,
                fontSize = 15.sp,
                fontWeight = FontWeight.SemiBold,
                color = KhalilyTextPrimary
            )
        }
    }
}
