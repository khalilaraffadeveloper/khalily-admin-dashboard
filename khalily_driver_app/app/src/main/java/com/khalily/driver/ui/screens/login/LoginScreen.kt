package com.khalily.driver.ui.screens.login

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.telephony.TelephonyManager
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material.icons.filled.TwoWheeler
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import com.google.firebase.firestore.FirebaseFirestore
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
    val alpha by infiniteTransition.animateFloat(
        initialValue = 0.6f, targetValue = 1.0f,
        animationSpec = infiniteRepeatable(tween(1200, easing = FastOutSlowInEasing), RepeatMode.Reverse),
        label = "alpha"
    )

    fun getDevicePhoneNumber(): String {
        return try {
            val tm = context.getSystemService(android.content.Context.TELEPHONY_SERVICE) as TelephonyManager
            val number = tm.line1Number
            if (!number.isNullOrBlank()) {
                number.replace("[^0-9]".toRegex(), "")
            } else ""
        } catch (e: Exception) {
            ""
        }
    }

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

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(KhalilyPrimary)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Card(
                modifier = Modifier
                    .size(90.dp)
                    .alpha(alpha),
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White.copy(alpha = 0.15f))
            ) {
                Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                    Icon(
                        imageVector = Icons.Default.TwoWheeler,
                        contentDescription = null,
                        tint = Color.White,
                        modifier = Modifier.size(50.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(20.dp))
            Text(
                text = "Khalily",
                fontSize = 36.sp,
                fontWeight = FontWeight.ExtraBold,
                color = Color.White
            )
            Text(
                text = "تطبيق السائقين",
                fontSize = 16.sp,
                color = Color.White.copy(alpha = 0.8f)
            )
            Spacer(modifier = Modifier.height(48.dp))

            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White)
            ) {
                Column(modifier = Modifier.padding(24.dp)) {
                    OutlinedTextField(
                        value = phone,
                        onValueChange = { phone = it; errorMsg = null },
                        label = { Text("رقم الهاتف") },
                        placeholder = { Text("مثال: 22111111", fontSize = 14.sp) },
                        leadingIcon = {
                            Icon(Icons.Default.Phone, contentDescription = null, tint = KhalilyPrimary)
                        },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                        singleLine = true,
                        shape = RoundedCornerShape(14.dp),
                        modifier = Modifier.fillMaxWidth(),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = KhalilyPrimary,
                            unfocusedBorderColor = Color(0xFFE0E0E0),
                            focusedContainerColor = Color(0xFFF8F9FF),
                            unfocusedContainerColor = Color(0xFFF5F5F5)
                        )
                    )

                    Spacer(modifier = Modifier.height(16.dp))

                    OutlinedTextField(
                        value = password,
                        onValueChange = { password = it; errorMsg = null },
                        label = { Text("كلمة السر") },
                        placeholder = { Text("أدخل كلمة السر", fontSize = 14.sp) },
                        leadingIcon = {
                            Icon(Icons.Default.Lock, contentDescription = null, tint = KhalilyPrimary)
                        },
                        trailingIcon = {
                            IconButton(onClick = { passwordVisible = !passwordVisible }) {
                                Icon(
                                    imageVector = if (passwordVisible) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                                    contentDescription = null,
                                    tint = KhalilyPrimary
                                )
                            }
                        },
                        visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                        singleLine = true,
                        shape = RoundedCornerShape(14.dp),
                        modifier = Modifier.fillMaxWidth(),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = KhalilyPrimary,
                            unfocusedBorderColor = Color(0xFFE0E0E0),
                            focusedContainerColor = Color(0xFFF8F9FF),
                            unfocusedContainerColor = Color(0xFFF5F5F5)
                        )
                    )

                    if (errorMsg != null) {
                        Spacer(modifier = Modifier.height(12.dp))
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(10.dp),
                            colors = CardDefaults.cardColors(containerColor = KhalilyError.copy(alpha = 0.08f))
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

                    Spacer(modifier = Modifier.height(24.dp))

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
                            val db = FirebaseFirestore.getInstance()
                            db.collection("drivers")
                                .whereEqualTo("phone", phone.trim())
                                .whereEqualTo("password", password.trim())
                                .get()
                                .addOnSuccessListener { docs ->
                                    if (docs.isEmpty) {
                                        isLoading = false
                                        errorMsg = "رقم الهاتف أو كلمة السر غير صحيحة"
                                        return@addOnSuccessListener
                                    }
                                    val doc = docs.documents[0]
                                    val driverId = doc.id
                                    val driverName = doc.getString("name") ?: "سائق"
                                    val registeredPhone = doc.getString("phone") ?: ""

                                    val storedDeviceId = doc.getString("deviceId") ?: ""
                                    val currentDeviceId = getDeviceId()

                                    if (storedDeviceId.isNotEmpty() && storedDeviceId != currentDeviceId) {
                                        isLoading = false
                                        errorMsg = "هذا الحساب مسجل على جهاز آخر. يرجى الاتصال بالإدارة."
                                        return@addOnSuccessListener
                                    }

                                    if (storedDeviceId.isEmpty()) {
                                        db.collection("drivers").document(driverId)
                                            .update("deviceId", currentDeviceId)
                                    }

                                    PrefsManager.saveDriverId(context, driverId)
                                    PrefsManager.saveDriverName(context, driverName)
                                    PrefsManager.setPhone(context, phone.trim())
                                    PrefsManager.setLoggedIn(context, true)
                                    isLoading = false
                                    android.util.Log.d("Login", "Logged in as $driverName (ID: $driverId)")
                                    onLoginSuccess()
                                }
                                .addOnFailureListener { e ->
                                    isLoading = false
                                    errorMsg = "خطأ: ${e.message}"
                                }
                        },
                        enabled = !isLoading,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(56.dp),
                        shape = RoundedCornerShape(14.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = KhalilyGold,
                            contentColor = KhalilyPrimary
                        )
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
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(24.dp))
            Text(
                text = "© 2026 Khalily — تطبيق نقل الدراجات النارية",
                fontSize = 12.sp,
                color = Color.White.copy(alpha = 0.5f)
            )
        }
    }
}
