package com.trendly.customer

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.animation.core.*
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.trendly.customer.ui.theme.TrendlyCustomerTheme
import com.trendly.customer.ui.theme.TrendlyPink
import com.trendly.customer.ui.theme.TrendlyPurple
import com.trendly.customer.ui.theme.TrendlyGold
import com.trendly.customer.ui.theme.TrendlyPinkDark
import com.trendly.customer.util.PrefsManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

class SplashActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        PrefsManager.init(this)

        setContent {
            TrendlyCustomerTheme {
                SplashContent()
            }
        }

        CoroutineScope(Dispatchers.Main).launch {
            delay(3000)
            val intent = if (PrefsManager.isLoggedIn()) {
                Intent(this@SplashActivity, MainActivity::class.java)
            } else {
                Intent(this@SplashActivity, MainActivity::class.java)
            }
            intent.putExtra("start_screen", if (PrefsManager.isLoggedIn()) "home" else "login")
            startActivity(intent)
            finish()
        }
    }
}

@Composable
private fun SplashContent() {
    val infiniteTransition = rememberInfiniteTransition(label = "splash")
    val alpha by infiniteTransition.animateFloat(
        initialValue = 0.4f, targetValue = 1.0f,
        animationSpec = infiniteRepeatable(tween(1500, easing = FastOutSlowInEasing), RepeatMode.Reverse),
        label = "alpha"
    )
    val scale by infiniteTransition.animateFloat(
        initialValue = 0.95f, targetValue = 1.05f,
        animationSpec = infiniteRepeatable(tween(2000, easing = FastOutSlowInEasing), RepeatMode.Reverse),
        label = "scale"
    )

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Brush.verticalGradient(listOf(TrendlyPink, TrendlyPurple, TrendlyPinkDark))),
        contentAlignment = Alignment.Center
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Image(
                painter = painterResource(id = R.drawable.hamada3),
                contentDescription = "TRENDLY",
                modifier = Modifier
                    .size(200.dp)
                    .alpha(alpha)
                    .shadow(12.dp, RoundedCornerShape(28.dp))
                    .clip(RoundedCornerShape(28.dp))
                    .background(Color.Transparent)
            )

            Spacer(modifier = Modifier.height(20.dp))

            Text(
                text = "TRENDLY",
                fontSize = 44.sp,
                fontWeight = FontWeight.ExtraBold,
                color = Color.White,
                modifier = Modifier.alpha(alpha)
            )

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = "توصيل سريع وموثوق",
                fontSize = 18.sp,
                fontWeight = FontWeight.SemiBold,
                color = TrendlyGold,
                modifier = Modifier.alpha(alpha)
            )

            Spacer(modifier = Modifier.height(30.dp))

            Text(
                text = "● ● ●",
                fontSize = 16.sp,
                color = TrendlyGold,
                modifier = Modifier.alpha(alpha)
            )

            Spacer(modifier = Modifier.height(40.dp))

            Text(
                text = "© 2026 TRENDLY",
                fontSize = 12.sp,
                color = Color.White.copy(alpha = 0.5f)
            )
        }
    }
}
