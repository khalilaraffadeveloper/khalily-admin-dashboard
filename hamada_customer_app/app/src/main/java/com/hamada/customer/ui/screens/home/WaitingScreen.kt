package com.hamada.customer.ui.screens.home

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
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.hamada.customer.R
import com.hamada.customer.ui.theme.*
import com.hamada.customer.util.NumberFormatter
import kotlinx.coroutines.delay

@Composable
fun WaitingScreen(
    searchRadius: Int,
    pickupAddress: String,
    dropoffAddress: String,
    fare: Double,
    onTimeout: () -> Unit
) {
    val totalSeconds = 240 // 4 minutes
    var remainingSeconds by remember { mutableIntStateOf(totalSeconds) }
    val minutes = remainingSeconds / 60
    val seconds = remainingSeconds % 60

    val infiniteTransition = rememberInfiniteTransition(label = "wait")
    val rotation by infiniteTransition.animateFloat(
        initialValue = 0f, targetValue = 360f,
        animationSpec = infiniteRepeatable(tween(3000, easing = LinearEasing), RepeatMode.Restart),
        label = "rotation"
    )
    val alpha by infiniteTransition.animateFloat(
        initialValue = 0.5f, targetValue = 1.0f,
        animationSpec = infiniteRepeatable(tween(1000, easing = FastOutSlowInEasing), RepeatMode.Reverse),
        label = "alpha"
    )

    LaunchedEffect(Unit) {
        while (remainingSeconds > 0) {
            delay(1000L)
            remainingSeconds--
        }
        onTimeout()
    }

    val timerColor = when {
        remainingSeconds > 120 -> HamadaGreen
        remainingSeconds > 60 -> HamadaGold
        else -> HamadaRed
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(HamadaPinkSurface),
        contentAlignment = Alignment.Center
    ) {
        Column(
            modifier = Modifier.padding(32.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Spinning motorcycle
            Icon(
                Icons.Default.TwoWheeler, null,
                modifier = Modifier
                    .size(80.dp)
                    .rotate(rotation)
                    .alpha(alpha),
                tint = HamadaPink
            )

            Spacer(modifier = Modifier.height(24.dp))

            Text("جاري البحث عن سائق", fontSize = 24.sp, fontWeight = FontWeight.Bold, color = HamadaTextPrimary)

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                "في نطاق ${searchRadius} كم منك",
                fontSize = 16.sp, color = HamadaTextSecondary
            )

            Spacer(modifier = Modifier.height(32.dp))

            // Timer
            Card(
                shape = CircleShape,
                colors = CardDefaults.cardColors(containerColor = timerColor),
                elevation = CardDefaults.cardElevation(12.dp),
                modifier = Modifier.size(120.dp)
            ) {
                Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            "${minutes}:${String.format("%02d", seconds)}",
                            fontSize = 32.sp, fontWeight = FontWeight.ExtraBold, color = Color.White
                        )
                        Text("متبقي", fontSize = 12.sp, color = Color.White.copy(alpha = 0.8f))
                    }
                }
            }

            Spacer(modifier = Modifier.height(32.dp))

            // Ride info card
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                elevation = CardDefaults.cardElevation(4.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.LocationOn, null, tint = HamadaGreen, modifier = Modifier.size(20.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(pickupAddress, fontSize = 14.sp, color = HamadaTextPrimary)
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Flag, null, tint = HamadaRed, modifier = Modifier.size(20.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(dropoffAddress, fontSize = 14.sp, color = HamadaTextPrimary)
                    }
                    HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp), color = HamadaGrayLight)
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("الأجرة:", fontSize = 14.sp, color = HamadaTextSecondary)
                        Text("${NumberFormatter.format(fare)} MRU", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = HamadaGold)
                    }
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            Text(
                "لم يتم قبول طلبك؟\nاتصل بالشركة: 47717983",
                fontSize = 13.sp, color = HamadaTextSecondary, textAlign = TextAlign.Center
            )
        }
    }
}
