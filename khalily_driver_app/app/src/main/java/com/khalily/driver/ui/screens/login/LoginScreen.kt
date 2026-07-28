package com.khalily.driver.ui.screens.login

import android.os.Build
import android.telephony.TelephonyManager
import androidx.compose.animation.core.*
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseUser
import com.google.firebase.firestore.FirebaseFirestore
import com.khalily.driver.R
import com.khalily.driver.ui.theme.*
import com.khalily.driver.util.PrefsManager

@Composable
fun LoginScreen(onLoginSuccess: () -> Unit) {
    val context = LocalContext.current
    var phone by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var passwordVisible by remember { mutableStateOf(false) }
    var isLoading by remember { mutableStateOf(false) }
    var errorMsg by remember { mutableStateOf<String?>(null) }

    val infiniteTransition = rememberInfiniteTransition(label = "pulse")
    val iconScale by infiniteTransition.animateFloat(
        initialValue = 0.9f, targetValue = 1.05f,
        animationSpec = infiniteRepeatable(tween(1500, easing = FastOutSlowInEasing), RepeatMode.Reverse),
        label = "iconScale"
    )

    fun getDeviceId(): String {
        return try {
            val tm = context.getSystemService(android.content.Context.TELEPHONY_SERVICE) as TelephonyManager
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                tm.imei ?: android.provider.Settings.Secure.getString(context.contentResolver, android.provider.Settings.Secure.ANDROID_ID)
            } else {
                @Suppress("DEPRECATION")
                tm.deviceId ?: android.provider.Settings.Secure.getString(context.contentResolver, android.provider.Settings.Secure.ANDROID_ID)
            }
        } catch (e: Exception) {
            android.provider.Settings.Secure.getString(context.contentResolver, android.provider.Settings.Secure.ANDROID_ID)
        }
    }

    fun legacyLogin(db: FirebaseFirestore, phone: String, password: String, ctx: android.content.Context, success: () -> Unit, fail: (String) -> Unit) {
        db.collection("drivers")
            .whereEqualTo("phone", phone)
            .whereEqualTo("password", password)
            .get()
            .addOnSuccessListener { docs ->
                if (docs.isEmpty) {
                    fail("رقم الهاتف أو كلمة السر غير صحيحة")
                    return@addOnSuccessListener
                }
                val doc = docs.documents[0]
                val driverId = doc.id
                val driverName = doc.getString("name") ?: "سائق"
                val storedDeviceId = doc.getString("deviceId") ?: ""
                val currentDeviceId = getDeviceId()
                if (storedDeviceId.isNotEmpty() && storedDeviceId != currentDeviceId) {
                    fail("هذا الحساب مسجل على جهاز آخر")
                    return@addOnSuccessListener
                }
                if (storedDeviceId.isEmpty()) {
                    doc.reference.update("deviceId", currentDeviceId)
                }
                PrefsManager.saveDriverId(ctx, driverId)
                PrefsManager.saveDriverName(ctx, driverName)
                PrefsManager.setPhone(ctx, phone)
                PrefsManager.setLoggedIn(ctx, true)
                success()
                // Auto-migrate to Firebase Auth
                val auth = FirebaseAuth.getInstance()
                auth.createUserWithEmailAndPassword("${phone}@khalily.app", password)
                    .addOnSuccessListener { result ->
                        doc.reference.update("authUid", result.user?.uid ?: "")
                    }
            }
            .addOnFailureListener { e ->
                fail("خطأ: ${e.message}")
            }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    colors = listOf(KhalilyNavy, Color(0xFF1A2D5E))
                )
            )
            .verticalScroll(rememberScrollState())
            .imePadding()
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(modifier = Modifier.height(40.dp))

            Box(
                modifier = Modifier
                    .size(160.dp)
                    .shadow(12.dp, RoundedCornerShape(24.dp))
                    .clip(RoundedCornerShape(24.dp))
                    .border(5.dp, KhalilyGold, RoundedCornerShape(24.dp)),
                contentAlignment = Alignment.Center
            ) {
                Image(
                    painter = painterResource(id = R.drawable.hamada3),
                    contentDescription = "Khalily",
                    modifier = Modifier
                        .fillMaxSize()
                        .clip(RoundedCornerShape(20.dp))
                )
            }

            Spacer(modifier = Modifier.height(20.dp))
            val cairoFont = FontFamily(Font(R.font.cairo_regular, FontWeight.Normal))
            Text(
                text = "\u062D\u0645\u0627\u062F\u0647",
                fontSize = 44.sp,
                fontFamily = cairoFont,
                fontWeight = FontWeight.Bold,
                color = Color.White
            )
            Spacer(modifier = Modifier.height(2.dp))
            Text(
                text = "\u0644\u0644\u062A\u0648\u0635\u064A\u0644",
                fontSize = 18.sp,
                fontFamily = cairoFont,
                fontWeight = FontWeight.Normal,
                color = KhalilyGold
            )

            Spacer(modifier = Modifier.height(48.dp))

            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
            ) {
                Column(modifier = Modifier.padding(28.dp)) {
                    OutlinedTextField(
                        value = phone,
                        onValueChange = { phone = it; errorMsg = null },
                        label = { Text("رقم الهاتف") },
                        placeholder = { Text("مثال: 22111111", fontSize = 14.sp) },
                        leadingIcon = {
                            Icon(Icons.Default.Phone, contentDescription = null, tint = KhalilyNavy)
                        },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                        singleLine = true,
                        shape = RoundedCornerShape(16.dp),
                        modifier = Modifier.fillMaxWidth(),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = KhalilyNavy,
                            unfocusedBorderColor = Color(0xFFDEE2E6),
                            focusedContainerColor = Color(0xFFF8F9FA),
                            unfocusedContainerColor = Color(0xFFF8F9FA),
                            focusedLabelColor = KhalilyNavy,
                            cursorColor = KhalilyNavy
                        )
                    )

                    Spacer(modifier = Modifier.height(16.dp))

                    OutlinedTextField(
                        value = password,
                        onValueChange = { password = it; errorMsg = null },
                        label = { Text("كلمة السر") },
                        placeholder = { Text("أدخل كلمة السر", fontSize = 14.sp) },
                        leadingIcon = {
                            Icon(Icons.Default.Lock, contentDescription = null, tint = KhalilyNavy)
                        },
                        trailingIcon = {
                            IconButton(onClick = { passwordVisible = !passwordVisible }) {
                                Icon(
                                    imageVector = if (passwordVisible) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                                    contentDescription = null,
                                    tint = KhalilyTextSecondary
                                )
                            }
                        },
                        visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                        singleLine = true,
                        shape = RoundedCornerShape(16.dp),
                        modifier = Modifier.fillMaxWidth(),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = KhalilyNavy,
                            unfocusedBorderColor = Color(0xFFDEE2E6),
                            focusedContainerColor = Color(0xFFF8F9FA),
                            unfocusedContainerColor = Color(0xFFF8F9FA),
                            focusedLabelColor = KhalilyNavy,
                            cursorColor = KhalilyNavy
                        )
                    )

                    if (errorMsg != null) {
                        Spacer(modifier = Modifier.height(12.dp))
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp),
                            colors = CardDefaults.cardColors(containerColor = KhalilyErrorSurface)
                        ) {
                            Text(
                                text = errorMsg!!,
                                color = KhalilyError,
                                style = MaterialTheme.typography.bodySmall,
                                modifier = Modifier.padding(12.dp),
                                textAlign = TextAlign.Center,
                                fontWeight = FontWeight.Medium
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(28.dp))

                    Button(
                        onClick = {
                            if (phone.isBlank()) {
                                errorMsg = "يرجى إدخال رقم الهاتف"
                                return@Button
                            }
                            if (password.isBlank()) {
                                errorMsg = "يرجى إدخال كلمة السر"
                                return@Button
                            }
                            isLoading = true
                            errorMsg = null
                            val auth = FirebaseAuth.getInstance()
                            val db = FirebaseFirestore.getInstance()
                            val email = "${phone.trim()}@khalily.app"

                            // Try Firebase Auth first
                            auth.signInWithEmailAndPassword(email, password.trim())
                                .addOnSuccessListener { result ->
                                    val authUid = result.user?.uid ?: ""
                                    db.collection("drivers")
                                        .whereEqualTo("phone", phone.trim())
                                        .get()
                                        .addOnSuccessListener { docs ->
                                            if (docs.isEmpty) {
                                                isLoading = false
                                                errorMsg = "رقم الهاتف أو كلمة السر غير صحيحة"
                                                auth.signOut()
                                                return@addOnSuccessListener
                                            }
                                            val doc = docs.documents[0]
                                            val driverId = doc.id
                                            val driverName = doc.getString("name") ?: "سائق"
                                            val storedDeviceId = doc.getString("deviceId") ?: ""
                                            val currentDeviceId = getDeviceId()
                                            if (storedDeviceId.isNotEmpty() && storedDeviceId != currentDeviceId) {
                                                isLoading = false
                                                errorMsg = "هذا الحساب مسجل على جهاز آخر"
                                                auth.signOut()
                                                return@addOnSuccessListener
                                            }
                                            if (storedDeviceId.isEmpty()) {
                                                doc.reference.update("deviceId", currentDeviceId)
                                            }
                                            doc.reference.update("authUid", authUid)
                                            PrefsManager.saveDriverId(context, driverId)
                                            PrefsManager.saveDriverName(context, driverName)
                                            PrefsManager.setPhone(context, phone.trim())
                                            PrefsManager.setLoggedIn(context, true)
                                            isLoading = false
                                            onLoginSuccess()
                                        }
                                        .addOnFailureListener {
                                            isLoading = false
                                            errorMsg = "خطأ في قاعدة البيانات"
                                        }
                                }
                                .addOnFailureListener {
                                    // Firebase Auth failed - try legacy Firestore auth
                                    legacyLogin(db, phone.trim(), password.trim(), context, onLoginSuccess, { isLoading = false; errorMsg = it })
                                }
                        },
                        enabled = !isLoading,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(56.dp),
                        shape = RoundedCornerShape(16.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = KhalilyNavy
                        ),
                        elevation = ButtonDefaults.buttonElevation(defaultElevation = 4.dp)
                    ) {
                        if (isLoading) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(24.dp),
                                color = Color.White,
                                strokeWidth = 2.dp
                            )
                        } else {
                            Text(
                                text = "تسجيل الدخول",
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(32.dp))
            Text(
                text = "© 2026 Khalily",
                fontSize = 12.sp,
                color = Color.White.copy(alpha = 0.4f)
            )
        }
    }
}
