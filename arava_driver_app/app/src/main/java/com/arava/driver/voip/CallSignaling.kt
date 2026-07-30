package com.arava.driver.voip

import android.util.Log
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.ListenerRegistration
import org.webrtc.IceCandidate
import org.webrtc.SessionDescription

enum class CallState {
    IDLE,
    RINGING,
    CONNECTED,
    ENDED
}

data class CallStatus(
    val state: CallState = CallState.IDLE,
    val caller: String = "",
    val startedAt: Long = 0,
    val endedAt: Long = 0
)

class CallSignaling(
    private val db: FirebaseFirestore,
    private val rideId: String,
    private val myRole: String
) {
    private val callRef = db.collection("rides").document(rideId).collection("call")
    private val stateRef = callRef.document("status")
    private val signalingRef = callRef.document("signaling")
    private var stateListener: ListenerRegistration? = null
    private var offerListener: ListenerRegistration? = null
    private var answerListener: ListenerRegistration? = null
    private var candidateListener: ListenerRegistration? = null

    fun initiateCall() {
        stateRef.set(mapOf(
            "state" to "ringing",
            "caller" to myRole,
            "startedAt" to FieldValue.serverTimestamp(),
            "endedAt" to null
        ))
    }

    fun acceptCall() {
        stateRef.update("state", "ringing")
    }

    fun updateCallState(state: String) {
        when (state) {
            "connected" -> stateRef.update(
                "state", "connected",
                "connectedAt", FieldValue.serverTimestamp()
            )
            "ended" -> stateRef.update(
                "state", "ended",
                "endedAt", FieldValue.serverTimestamp()
            )
        }
    }

    fun sendOffer(sdp: SessionDescription) {
        signalingRef.set(mapOf(
            "type" to "offer",
            "sender" to myRole,
            "sdp" to sdp.description,
            "timestamp" to FieldValue.serverTimestamp()
        ))
    }

    fun sendAnswer(sdp: SessionDescription) {
        signalingRef.update(mapOf(
            "answerSdp" to sdp.description,
            "answerSender" to myRole,
            "answerTimestamp" to FieldValue.serverTimestamp()
        ))
    }

    fun sendIceCandidate(candidate: IceCandidate) {
        val fieldName = when (myRole) {
            "driver" -> "driverCandidates"
            else -> "customerCandidates"
        }
        signalingRef.update(
            fieldName, FieldValue.arrayUnion(mapOf(
                "sdp" to candidate.sdp,
                "sdpMid" to candidate.sdpMid,
                "sdpMLineIndex" to candidate.sdpMLineIndex,
                "sender" to myRole,
                "timestamp" to System.currentTimeMillis()
            ))
        )
    }

    fun listenForState(onState: (CallState, String) -> Unit) {
        stateListener = stateRef.addSnapshotListener { snap, e ->
            if (e != null) return@addSnapshotListener
            snap?.let {
                val s = it.getString("state")
                val caller = it.getString("caller") ?: ""
                if (s != null && caller != myRole) {
                    val state = when (s) {
                        "ringing" -> CallState.RINGING
                        "connected" -> CallState.CONNECTED
                        "ended" -> CallState.ENDED
                        else -> CallState.IDLE
                    }
                    if (state != CallState.IDLE) onState(state, caller)
                }
            }
        }
    }

    fun listenForOffer(onOffer: (SessionDescription) -> Unit) {
        offerListener = signalingRef.addSnapshotListener { snap, e ->
            if (e != null) return@addSnapshotListener
            snap?.let {
                val sender = it.getString("sender")
                val sdp = it.getString("sdp")
                if (sender != null && sender != myRole && sdp != null) {
                    val type = it.getString("type")
                    if (type == "offer") {
                        onOffer(SessionDescription(SessionDescription.Type.OFFER, sdp))
                    }
                }
            }
        }
    }

    fun listenForAnswer(onAnswer: (SessionDescription) -> Unit) {
        answerListener = signalingRef.addSnapshotListener { snap, e ->
            if (e != null) return@addSnapshotListener
            snap?.let {
                val sender = it.getString("answerSender")
                val sdp = it.getString("answerSdp")
                if (sender != null && sender != myRole && sdp != null) {
                    onAnswer(SessionDescription(SessionDescription.Type.ANSWER, sdp))
                }
            }
        }
    }

    fun listenForIceCandidates(onCandidate: (IceCandidate) -> Unit) {
        candidateListener = signalingRef.addSnapshotListener { snap, e ->
            if (e != null) return@addSnapshotListener
            snap?.let {
                val fieldName = when (myRole) {
                    "driver" -> "customerCandidates"
                    else -> "driverCandidates"
                }
                val candidates = it.get(fieldName) as? List<Map<String, Any>> ?: return@addSnapshotListener
                val lastSeen = lastCandidateIndex
                candidates.drop(lastSeen).forEach { c ->
                    val sdp = c["sdp"] as? String ?: return@forEach
                    val sdpMid = c["sdpMid"] as? String ?: return@forEach
                    val idx = (c["sdpMLineIndex"] as? Long)?.toInt() ?: return@forEach
                    val sender = c["sender"] as? String ?: return@forEach
                    if (sender != myRole) {
                        onCandidate(IceCandidate(sdpMid, idx, sdp))
                    }
                }
                lastCandidateIndex = candidates.size
            }
        }
    }

    private var lastCandidateIndex = 0

    fun checkCallState(onResult: (CallStatus) -> Unit) {
        stateRef.get().addOnSuccessListener { snap ->
            if (snap.exists()) {
                val s = snap.getString("state") ?: "idle"
                val caller = snap.getString("caller") ?: ""
                val startedAt = snap.getLong("startedAt") ?: 0
                onResult(CallStatus(
                    state = when (s) {
                        "ringing" -> CallState.RINGING
                        "connected" -> CallState.CONNECTED
                        "ended" -> CallState.ENDED
                        else -> CallState.IDLE
                    },
                    caller = caller,
                    startedAt = startedAt
                ))
            }
        }
    }

    fun cleanup() {
        stateListener?.remove()
        offerListener?.remove()
        answerListener?.remove()
        candidateListener?.remove()
        stateListener = null
        offerListener = null
        answerListener = null
        candidateListener = null
    }
}
