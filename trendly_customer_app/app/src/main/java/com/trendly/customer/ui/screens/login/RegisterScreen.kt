package com.trendly.customer.ui.screens.login

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.trendly.customer.R
import com.trendly.customer.ui.theme.*
import com.trendly.customer.util.PrefsManager

@Composable
fun RegisterScreen(
    onRegisterSuccess: () -> Unit,
    onGoToLogin: () -> Unit
) {
    var name by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var whatsapp by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var confirmPassword by remember { mutableStateOf("") }
    var error by remember { mutableStateOf("") }
    var loading by remember { mutableStateOf(false) }
    var passwordVisible by remember { mutableStateOf(false) }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Brush.verticalGradient(listOf(TrendlyPurple, TrendlyPink)))
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(modifier = Modifier.height(30.dp))

            Image(
                painter = painterResource(id = R.drawable.trendly1),
                contentDescription = "TRENDLY",
                modifier = Modifier
                    .size(100.dp)
                    .shadow(8.dp, RoundedCornerShape(20.dp))
                    .clip(RoundedCornerShape(20.dp))
            )

            Spacer(modifier = Modifier.height(12.dp))

            Text("حساب جديد", fontSize = 30.sp, fontWeight = FontWeight.ExtraBold, color = Color.White)

            Spacer(modifier = Modifier.height(24.dp))

            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                elevation = CardDefaults.cardElevation(12.dp)
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    OutlinedTextField(
                        value = name, onValueChange = { name = it },
                        label = { Text("الاسم الكامل") },
                        leadingIcon = { Icon(Icons.Default.Person, null, tint = TrendlyPink) },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp),
                        singleLine = true
                    )
                    Spacer(modifier = Modifier.height(10.dp))

                    OutlinedTextField(
                        value = phone, onValueChange = { phone = it },
                        label = { Text("رقم الهاتف") },
                        leadingIcon = { Icon(Icons.Default.Phone, null, tint = TrendlyPink) },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp),
                        singleLine = true
                    )
                    Spacer(modifier = Modifier.height(10.dp))

                    OutlinedTextField(
                        value = whatsapp, onValueChange = { whatsapp = it },
                        label = { Text("رقم الواتساب (اختياري)") },
                        leadingIcon = { Icon(Icons.Default.Chat, null, tint = TrendlyGreen) },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp),
                        singleLine = true
                    )
                    Spacer(modifier = Modifier.height(10.dp))

                    OutlinedTextField(
                        value = password, onValueChange = { password = it },
                        label = { Text("كلمة المرور") },
                        leadingIcon = { Icon(Icons.Default.Lock, null, tint = TrendlyPink) },
                        trailingIcon = {
                            IconButton(onClick = { passwordVisible = !passwordVisible }) {
                                Icon(
                                    if (passwordVisible) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                                    null, tint = TrendlyGray
                                )
                            }
                        },
                        visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp),
                        singleLine = true
                    )
                    Spacer(modifier = Modifier.height(10.dp))

                    OutlinedTextField(
                        value = confirmPassword, onValueChange = { confirmPassword = it },
                        label = { Text("تأكيد كلمة المرور") },
                        leadingIcon = { Icon(Icons.Default.Lock, null, tint = TrendlyPink) },
                        visualTransformation = PasswordVisualTransformation(),
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp),
                        singleLine = true
                    )

                    if (error.isNotEmpty()) {
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(error, color = TrendlyRed, fontSize = 13.sp)
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    Button(
                        onClick = {
                            when {
                                name.isBlank() -> error = "أدخل اسمك"
                                phone.isBlank() -> error = "أدخل رقم الهاتف"
                                password.length < 4 -> error = "كلمة المرور 4 أحرف على الأقل"
                                password != confirmPassword -> error = "كلمتا المرور غير متطابقتين"
                                else -> {
                                    loading = true
                                    error = ""
                                    val auth = FirebaseAuth.getInstance()
                                    val db = FirebaseFirestore.getInstance()
                                    val email = "${phone.trim()}@khalily.app"
                                    val whatsappFinal = if (whatsapp.isBlank()) phone else whatsapp

                                    // Check if phone already exists
                                    db.collection("customers")
                                        .whereEqualTo("phone", phone)
                                        .get()
                                        .addOnSuccessListener { docs ->
                                            if (!docs.isEmpty) {
                                                loading = false
                                                error = "هذا الرقم مسجل مسبقاً"
                                            } else {
                                                // Create Firebase Auth account
                                                auth.createUserWithEmailAndPassword(email, password)
                                                    .addOnSuccessListener { result ->
                                                        val uid = result.user?.uid ?: ""
                                                        val customerData = hashMapOf(
                                                            "name" to name,
                                                            "phone" to phone,
                                                            "whatsapp" to whatsappFinal,
                                                            "authUid" to uid,
                                                            "lat" to 18.0735,
                                                            "lng" to -15.9582,
                                                            "isOnline" to true,
                                                            "credit" to 0.0,
                                                            "totalRides" to 0,
                                                            "createdAt" to System.currentTimeMillis(),
                                                            "lastUpdated" to System.currentTimeMillis()
                                                        )
                                                        db.collection("customers").document(uid)
                                                            .set(customerData)
                                                            .addOnSuccessListener {
                                                                loading = false
                                                                PrefsManager.apply {
                                                                    saveCustomerId(uid)
                                                                    saveCustomerName(name)
                                                                    savePhone(phone)
                                                                    saveWhatsapp(whatsappFinal)
                                                                    setLoggedIn(true)
                                                                    setOnlineStatus(true)
                                                                }
                                                                onRegisterSuccess()
                                                            }
                                                            .addOnFailureListener {
                                                                // Rollback auth
                                                                result.user?.delete()
                                                                loading = false
                                                                error = "خطأ في التسجيل. حاول مرة أخرى."
                                                            }
                                                    }
                                                    .addOnFailureListener { e ->
                                                        loading = false
                                                        error = when {
                                                            e.message?.contains("EMAIL_EXISTS") == true -> "هذا الرقم مسجل مسبقاً"
                                                            else -> "خطأ في التسجيل: ${e.message}"
                                                        }
                                                    }
                                            }
                                        }
                                }
                            }
                        },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(56.dp),
                        shape = RoundedCornerShape(16.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = TrendlyPink),
                        enabled = !loading
                    ) {
                        if (loading) {
                            CircularProgressIndicator(modifier = Modifier.size(24.dp), color = Color.White, strokeWidth = 2.dp)
                        } else {
                            Icon(Icons.Default.PersonAdd, null, modifier = Modifier.size(20.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("تسجيل", fontSize = 18.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            Text(
                "لديك حساب؟ سجّل الدخول",
                color = Color.White,
                fontSize = 15.sp,
                modifier = Modifier.clickable { onGoToLogin() }
            )
        }
    }
}
