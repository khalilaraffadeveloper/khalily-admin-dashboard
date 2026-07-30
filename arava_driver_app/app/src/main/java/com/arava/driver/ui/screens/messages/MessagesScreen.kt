package com.arava.driver.ui.screens.messages

import android.graphics.BitmapFactory
import android.media.MediaPlayer
import android.util.Base64
import androidx.compose.animation.animateContentSize
import androidx.compose.animation.core.*
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.ListenerRegistration
import com.arava.driver.ui.theme.*
import com.arava.driver.util.PrefsManager
import kotlinx.coroutines.delay
import java.text.SimpleDateFormat
import java.util.*

data class DriverMessage(
    val docId: String = "",
    val content: String = "",
    val type: String = "text",
    val sentBy: String = "",
    val recipients: List<String> = emptyList(),
    val readBy: List<String> = emptyList(),
    val timestamp: Long = 0L
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MessagesScreen(
    onBack: () -> Unit = {}
) {
    val context = LocalContext.current
    val driverId = PrefsManager.getDriverId(context) ?: ""
    var messages by remember { mutableStateOf<List<DriverMessage>>(emptyList()) }
    var listener by remember { mutableStateOf<ListenerRegistration?>(null) }

    DisposableEffect(Unit) {
        val db = FirebaseFirestore.getInstance()
        listener = db.collection("messages")
            .whereArrayContains("recipients", driverId)
            .addSnapshotListener { snapshot, e ->
                if (e != null || snapshot == null) return@addSnapshotListener
                val list = snapshot.documents.mapNotNull { doc ->
                    val content = doc.getString("content") ?: return@mapNotNull null
                    val type = doc.getString("type") ?: "text"
                    val sentBy = doc.getString("sentBy") ?: ""
                    @Suppress("UNCHECKED_CAST")
                    val recipients = doc.get("recipients") as? List<String> ?: emptyList()
                    @Suppress("UNCHECKED_CAST")
                    val readBy = doc.get("readBy") as? List<String> ?: emptyList()
                    val ts = doc.getTimestamp("timestamp")?.toInstant()?.toEpochMilli() ?: System.currentTimeMillis()
                    DriverMessage(
                        docId = doc.id,
                        content = content,
                        type = type,
                        sentBy = sentBy,
                        recipients = recipients,
                        readBy = readBy,
                        timestamp = ts
                    )
                }.sortedByDescending { it.timestamp }

                for (msg in list) {
                    if (msg.docId.isNotEmpty() && driverId.isNotEmpty() && driverId !in msg.readBy) {
                        db.collection("messages").document(msg.docId)
                            .update("readBy", com.google.firebase.firestore.FieldValue.arrayUnion(driverId))
                    }
                }

                messages = list
            }

        onDispose {
            listener?.remove()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = "الرسائل",
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowForward,
                            contentDescription = "رجوع",
                            tint = Color.White
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = ARAVANavy
                )
            )
        },
        containerColor = ARAVASand
    ) { padding ->
        if (messages.isEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(
                        imageVector = Icons.Default.MarkEmailUnread,
                        contentDescription = null,
                        tint = ARAVATextSecondary,
                        modifier = Modifier.size(64.dp)
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    Text(
                        text = "لا توجد رسائل جديدة",
                        fontSize = 16.sp,
                        color = ARAVATextSecondary,
                        fontWeight = FontWeight.Medium
                    )
                }
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                items(messages) { msg ->
                    MessageCard(msg) {
                        FirebaseFirestore.getInstance()
                            .collection("messages").document(msg.docId).delete()
                    }
                }
            }
        }
    }
}

@Composable
private fun MessageCard(msg: DriverMessage, onDelete: () -> Unit = {}) {
    val timeText = remember(msg.timestamp) {
        val sdf = SimpleDateFormat("dd/MM/yyyy  hh:mm a", Locale.getDefault())
        sdf.format(Date(msg.timestamp))
    }

    val typeBadgeText = when (msg.type) {
        "image" -> "صورة"
        "audio" -> "رسالة صوتية"
        else -> "نص"
    }
    val typeColor = when (msg.type) {
        "image" -> Color(0xFF2196F3)
        "audio" -> Color(0xFF9C27B0)
        else -> ARAVATurquoise
    }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .animateContentSize(),
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Row(modifier = Modifier.fillMaxWidth()) {
            Box(
                modifier = Modifier
                    .width(4.dp)
                    .fillMaxHeight()
                    .background(typeColor.copy(alpha = 0.5f))
            )

            Column(modifier = Modifier.padding(start = 12.dp, end = 16.dp, top = 14.dp, bottom = 14.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Surface(
                        shape = RoundedCornerShape(6.dp),
                        color = typeColor.copy(alpha = 0.12f)
                    ) {
                        Text(
                            text = typeBadgeText,
                            color = typeColor,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                        )
                    }
                    Text(
                        text = timeText,
                        fontSize = 11.sp,
                        color = ARAVATextSecondary
                    )
                }

                Spacer(modifier = Modifier.height(12.dp))

                when (msg.type) {
                    "image" -> {
                        var showFullImage by remember { mutableStateOf(false) }
                        val bitmap = remember(msg.content) {
                            try {
                                val base64Str = if (msg.content.contains(",")) msg.content.substringAfter(",") else msg.content
                                val bytes = Base64.decode(base64Str, Base64.DEFAULT)
                                BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
                            } catch (_: Exception) { null }
                        }
                        if (bitmap != null) {
                            Image(
                                bitmap = bitmap.asImageBitmap(),
                                contentDescription = "صورة",
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .heightIn(max = 220.dp)
                                    .clip(RoundedCornerShape(12.dp))
                                    .clickable { showFullImage = true },
                                contentScale = ContentScale.Crop
                            )
                            if (showFullImage) {
                                Dialog(
                                    onDismissRequest = { showFullImage = false },
                                    properties = DialogProperties(usePlatformDefaultWidth = false)
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .fillMaxSize()
                                            .background(Color.Black)
                                            .clickable { showFullImage = false },
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Image(
                                            bitmap = bitmap.asImageBitmap(),
                                            contentDescription = "صورة كاملة",
                                            modifier = Modifier.fillMaxWidth().padding(16.dp),
                                            contentScale = ContentScale.Fit
                                        )
                                        IconButton(
                                            onClick = { showFullImage = false },
                                            modifier = Modifier.align(Alignment.TopEnd).padding(8.dp)
                                        ) {
                                            Icon(Icons.Default.Close, contentDescription = "إغلاق", tint = Color.White)
                                        }
                                    }
                                }
                            }
                        } else {
                            Text("الصورة غير متوفرة", color = ARAVATextSecondary, fontSize = 13.sp)
                        }
                    }
                    "audio" -> AudioPlayerView(base64Content = msg.content)
                    else -> {
                        Text(
                            text = msg.content,
                            fontSize = 14.sp,
                            color = ARAVATextPrimary,
                            lineHeight = 22.sp
                        )
                    }
                }

                Spacer(modifier = Modifier.height(10.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = "من: ${msg.sentBy.ifEmpty { "الإدارة" }}",
                            fontSize = 11.sp,
                            color = ARAVATextSecondary
                        )
                        val readCount = msg.readBy.size
                        val totalCount = msg.recipients.size
                        if (readCount >= totalCount && totalCount > 0) {
                            Spacer(modifier = Modifier.width(8.dp))
                            Surface(
                                shape = RoundedCornerShape(6.dp),
                                color = ARAVAGreenSurface
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Icon(Icons.Default.DoneAll, contentDescription = null, tint = ARAVAGreen, modifier = Modifier.size(12.dp))
                                    Spacer(modifier = Modifier.width(3.dp))
                                    Text("مقروءة", color = ARAVAGreen, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }
                    IconButton(
                        onClick = onDelete,
                        modifier = Modifier.size(32.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Delete,
                            contentDescription = "حذف",
                            tint = Color(0xFFE53935).copy(alpha = 0.7f),
                            modifier = Modifier.size(18.dp)
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun AudioPlayerView(base64Content: String) {
    val context = LocalContext.current
    var isPlaying by remember { mutableStateOf(false) }
    var mediaPlayer by remember { mutableStateOf<MediaPlayer?>(null) }

    val pulseAnim = rememberInfiniteTransition(label = "pulse")
    val pulseAlpha by pulseAnim.animateFloat(
        initialValue = 0.3f, targetValue = 1.0f,
        animationSpec = infiniteRepeatable(tween(600, easing = FastOutSlowInEasing), RepeatMode.Reverse),
        label = "pulseAlpha"
    )

    DisposableEffect(Unit) {
        onDispose {
            try { mediaPlayer?.release() } catch (_: Exception) {}
            mediaPlayer = null
        }
    }

    Surface(
        shape = RoundedCornerShape(14.dp),
        color = Color(0xFFF3E5F5),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(44.dp)
                    .clip(CircleShape)
                    .background(Color(0xFF9C27B0))
                    .clickable {
                        try {
                            if (isPlaying) {
                                mediaPlayer?.stop()
                                mediaPlayer?.release()
                                mediaPlayer = null
                                isPlaying = false
                            } else {
                                val bytes = Base64.decode(base64Content, Base64.DEFAULT)
                                val tempFile = java.io.File.createTempFile("audio", ".mp3", context.cacheDir)
                                tempFile.writeBytes(bytes)
                                val mp = MediaPlayer()
                                mp.setDataSource(tempFile.absolutePath)
                                mp.prepare()
                                mp.start()
                                mp.setOnCompletionListener {
                                    isPlaying = false
                                    it.release()
                                    mediaPlayer = null
                                    tempFile.delete()
                                }
                                mediaPlayer = mp
                                isPlaying = true
                            }
                        } catch (_: Exception) {}
                    },
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = if (isPlaying) Icons.Default.Pause else Icons.Default.PlayArrow,
                    contentDescription = if (isPlaying) "إيقاف" else "تشغيل",
                    tint = Color.White,
                    modifier = Modifier.size(24.dp)
                )
            }

            Spacer(modifier = Modifier.width(14.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = if (isPlaying) "جاري التشغيل..." else "رسالة صوتية",
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Medium,
                    color = Color(0xFF7B1FA2)
                )
                if (isPlaying) {
                    Spacer(modifier = Modifier.height(6.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        repeat(4) {
                            Box(
                                modifier = Modifier
                                    .width(3.dp)
                                    .height(16.dp)
                                    .padding(end = 3.dp)
                                    .background(Color(0xFF9C27B0).copy(alpha = pulseAlpha), RoundedCornerShape(2.dp))
                            )
                        }
                    }
                }
            }

            Text(
                text = if (isPlaying) "إيقاف" else "تشغيل",
                fontSize = 11.sp,
                color = Color(0xFF9C27B0),
                fontWeight = FontWeight.Medium
            )
        }
    }
}
