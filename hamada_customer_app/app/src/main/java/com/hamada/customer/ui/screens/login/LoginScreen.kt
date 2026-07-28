package com.hamada.customer.ui.screens.login

import androidx.compose.animation.core.*
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
import androidx.compose.ui.draw.alpha
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
import com.hamada.customer.R
import com.hamada.customer.ui.theme.*
import com.hamada.customer.util.PrefsManager

@Composable
fun LoginScreen(
    onLoginSuccess: () -> Unit,
    onGoToRegister: () -> Unit
) {
    var phone by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var error by remember { mutableStateOf("") }
    var loading by remember { mutableStateOf(false) }
    var passwordVisible by remember { mutableStateOf(false) }

    fun legacyLogin(db: FirebaseFirestore, phone: String, password: String, onSuccess: () -> Unit, onError: (String) -> Unit) {
        db.collection("customers")
            .whereEqualTo("phone", phone)
            .whereEqualTo("password", password)
            .get()
            .addOnSuccessListener { docs ->
                if (docs.isEmpty) {
                    onError("رقم الهاتف أو كلمة المرور غير صحيحة")
                    return@addOnSuccessListener
                }
                val doc = docs.documents[0]
                val customerId = doc.id
                val deviceId = doc.getString("deviceId") ?: ""
                val currentDeviceId = "${phone}_${password}_${android.os.Build.BOARD}_${android.os.Build.DEVICE}".hashCode().toString()
                if (deviceId.isNotEmpty() && deviceId != currentDeviceId) {
                    onError("هذا الحساب مسجل على جهاز آخر")
                } else {
                    PrefsManager.apply {
                        if (deviceId.isEmpty()) {
                            doc.reference.update("deviceId", currentDeviceId)
                        }
                        saveCustomerId(customerId)
                        saveCustomerName(doc.getString("name") ?: "")
                        savePhone(doc.getString("phone") ?: "")
                        saveWhatsapp(doc.getString("whatsapp") ?: "")
                        setLoggedIn(true)
                        setOnlineStatus(true)
                    }
                    onSuccess()
                    // Auto-migrate to Firebase Auth
                    val auth = FirebaseAuth.getInstance()
                    auth.createUserWithEmailAndPassword("${phone}@khalily.app", password)
                }
            }
            .addOnFailureListener { onError("خطأ في الاتصال. حاول مرة أخرى.") }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Brush.verticalGradient(listOf(HamadaPink, HamadaPinkDark)))
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(modifier = Modifier.height(40.dp))

            Image(
                painter = painterResource(id = R.drawable.hamada3),
                contentDescription = "حماده",
                modifier = Modifier
                    .size(140.dp)
                    .shadow(10.dp, RoundedCornerShape(24.dp))
                    .clip(RoundedCornerShape(24.dp))
            )

            Spacer(modifier = Modifier.height(16.dp))

            Text("عيط أل حماده", fontSize = 36.sp, fontWeight = FontWeight.ExtraBold, color = Color.White)

            Spacer(modifier = Modifier.height(40.dp))

            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                elevation = CardDefaults.cardElevation(12.dp)
            ) {
                Column(modifier = Modifier.padding(24.dp)) {
                    Text("تسجيل الدخول", fontSize = 22.sp, fontWeight = FontWeight.Bold, color = HamadaPink)

                    Spacer(modifier = Modifier.height(20.dp))

                    OutlinedTextField(
                        value = phone, onValueChange = { phone = it },
                        label = { Text("رقم الهاتف") },
                        leadingIcon = { Icon(Icons.Default.Phone, null, tint = HamadaPink) },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp),
                        singleLine = true
                    )

                    Spacer(modifier = Modifier.height(12.dp))

                    OutlinedTextField(
                        value = password, onValueChange = { password = it },
                        label = { Text("كلمة المرور") },
                        leadingIcon = { Icon(Icons.Default.Lock, null, tint = HamadaPink) },
                        trailingIcon = {
                            IconButton(onClick = { passwordVisible = !passwordVisible }) {
                                Icon(
                                    if (passwordVisible) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                                    null, tint = HamadaGray
                                )
                            }
                        },
                        visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp),
                        singleLine = true
                    )

                    if (error.isNotEmpty()) {
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(error, color = HamadaRed, fontSize = 13.sp)
                    }

                    Spacer(modifier = Modifier.height(20.dp))

                    Button(
                        onClick = {
                            if (phone.isBlank() || password.isBlank()) {
                                error = "أدخل رقم الهاتف وكلمة المرور"
                                return@Button
                            }
                            loading = true
                            error = ""
                            val auth = FirebaseAuth.getInstance()
                            val db = FirebaseFirestore.getInstance()
                            val email = "${phone.trim()}@khalily.app"

                            auth.signInWithEmailAndPassword(email, password.trim())
                                .addOnSuccessListener { result ->
                                    val uid = result.user?.uid ?: ""
                                    db.collection("customers").document(uid).get()
                                        .addOnSuccessListener { doc ->
                                            if (doc.exists()) {
                                                val customerId = doc.id
                                                val deviceId = doc.getString("deviceId") ?: ""
                                                val currentDeviceId = "${phone}_${password}_${android.os.Build.BOARD}_${android.os.Build.DEVICE}".hashCode().toString()
                                                if (deviceId.isNotEmpty() && deviceId != currentDeviceId) {
                                                    loading = false
                                                    error = "هذا الحساب مسجل على جهاز آخر"
                                                    auth.signOut()
                                                    return@addOnSuccessListener
                                                }
                                                PrefsManager.apply {
                                                    if (deviceId.isEmpty()) {
                                                        doc.reference.update("deviceId", currentDeviceId)
                                                    }
                                                    saveCustomerId(customerId)
                                                    saveCustomerName(doc.getString("name") ?: "")
                                                    savePhone(doc.getString("phone") ?: "")
                                                    saveWhatsapp(doc.getString("whatsapp") ?: "")
                                                    setLoggedIn(true)
                                                    setOnlineStatus(true)
                                                }
                                                loading = false
                                                onLoginSuccess()
                                            } else {
                                                loading = false
                                                legacyLogin(db, phone.trim(), password.trim(), onLoginSuccess, { loading = false; error = it })
                                            }
                                        }
                                }
                                .addOnFailureListener {
                                    legacyLogin(db, phone.trim(), password.trim(), onLoginSuccess, { loading = false; error = it })
                                }
                        },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(56.dp),
                        shape = RoundedCornerShape(16.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = HamadaPink),
                        enabled = !loading
                    ) {
                        if (loading) {
                            CircularProgressIndicator(modifier = Modifier.size(24.dp), color = Color.White, strokeWidth = 2.dp)
                        } else {
                            Icon(Icons.Default.Login, null, modifier = Modifier.size(20.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("دخول", fontSize = 18.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            Text(
                "ليس لديك حساب؟ سجّل الآن",
                color = Color.White,
                fontSize = 15.sp,
                modifier = Modifier.clickable { onGoToRegister() }
            )
        }
    }
}
