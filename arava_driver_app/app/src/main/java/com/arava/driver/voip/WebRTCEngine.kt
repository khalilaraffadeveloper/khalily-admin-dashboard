package com.arava.driver.voip

import android.content.Context
import android.media.AudioManager
import android.util.Log
import org.webrtc.*

enum class CallConnectionState {
    DISCONNECTED,
    CONNECTING,
    CONNECTED,
    FAILED
}

class WebRTCEngine(
    private val context: Context,
    private val signaling: CallSignaling,
    private val onStateChange: (CallConnectionState) -> Unit
) {
    private var peerConnectionFactory: PeerConnectionFactory? = null
    private var peerConnection: PeerConnection? = null
    private var localAudioTrack: AudioTrack? = null
    private var audioSource: AudioSource? = null
    private var audioManager: AudioManager? = null

    companion object {
        private const val TAG = "WebRTCEngine"
    }

    fun initialize() {
        val initOptions = PeerConnectionFactory.InitializationOptions.builder(context)
            .setFieldTrials("")
            .createInitializationOptions()
        PeerConnectionFactory.initialize(initOptions)

        val factoryOptions = PeerConnectionFactory.Options()
        peerConnectionFactory = PeerConnectionFactory.builder()
            .setOptions(factoryOptions)
            .createPeerConnectionFactory()

        createAudioTrack()
        setupAudioManager()
    }

    private fun createAudioTrack() {
        val constraints = MediaConstraints()
        audioSource = peerConnectionFactory?.createAudioSource(constraints)
        localAudioTrack = peerConnectionFactory?.createAudioTrack("ARAVA_audio", audioSource)
        localAudioTrack?.setEnabled(true)
    }

    private fun setupAudioManager() {
        audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
        audioManager?.mode = AudioManager.MODE_IN_COMMUNICATION
        audioManager?.isSpeakerphoneOn = true
    }

    fun startCall() {
        val iceServers = listOf(
            PeerConnection.IceServer.builder("stun:stun.l.google.com:19302").createIceServer(),
            PeerConnection.IceServer.builder("stun:stun1.l.google.com:19302").createIceServer()
        )
        val rtcConfig = PeerConnection.RTCConfiguration(iceServers).apply {
            sdpSemantics = PeerConnection.SdpSemantics.UNIFIED_PLAN
            continualGatheringPolicy = PeerConnection.ContinualGatheringPolicy.GATHER_CONTINUALLY
            iceCandidatePoolSize = 5
        }

        val constraints = MediaConstraints().apply {
            mandatory.add(MediaConstraints.KeyValuePair("OfferToReceiveAudio", "true"))
        }

        peerConnection = peerConnectionFactory?.createPeerConnection(rtcConfig, object : PeerConnection.Observer {
            override fun onIceCandidate(candidate: IceCandidate) {
                Log.d(TAG, "onIceCandidate: ${candidate.sdpMid} ${candidate.sdpMLineIndex}")
                signaling.sendIceCandidate(candidate)
            }

            override fun onIceCandidatesRemoved(candidates: Array<out IceCandidate>) {}

            override fun onIceConnectionChange(state: PeerConnection.IceConnectionState) {
                Log.d(TAG, "onIceConnectionChange: $state")
                when (state) {
                    PeerConnection.IceConnectionState.CONNECTED -> {
                        onStateChange(CallConnectionState.CONNECTED)
                        signaling.updateCallState("connected")
                    }
                    PeerConnection.IceConnectionState.DISCONNECTED,
                    PeerConnection.IceConnectionState.CLOSED -> {
                        onStateChange(CallConnectionState.DISCONNECTED)
                    }
                    PeerConnection.IceConnectionState.FAILED -> {
                        onStateChange(CallConnectionState.FAILED)
                    }
                    else -> {}
                }
            }

            override fun onIceConnectionReceivingChange(receiving: Boolean) {}

            override fun onIceGatheringChange(state: PeerConnection.IceGatheringState) {
                Log.d(TAG, "onIceGatheringChange: $state")
            }

            override fun onAddStream(stream: MediaStream) {
                Log.d(TAG, "onAddStream: ${stream.videoTracks.size} video, ${stream.audioTracks.size} audio")
            }

            override fun onAddTrack(track: RtpReceiver, streams: Array<out MediaStream>) {
                Log.d(TAG, "onAddTrack: ${track.track()?.kind()}")
            }

            override fun onDataChannel(channel: DataChannel) {}
            override fun onRemoveStream(stream: MediaStream) {}
            override fun onRenegotiationNeeded() {}
            override fun onSignalingChange(state: PeerConnection.SignalingState) {}
            override fun onStandardizedIceConnectionChange(state: PeerConnection.IceConnectionState) {}
        })

        peerConnection?.addTrack(localAudioTrack)

        peerConnection?.createOffer(object : SdpObserver {
            override fun onCreateSuccess(sdp: SessionDescription) {
                peerConnection?.setLocalDescription(object : SdpObserver {
                    override fun onSetSuccess() {
                        Log.d(TAG, "Local description set successfully (offer)")
                        signaling.sendOffer(sdp)
                    }
                    override fun onSetFailure(msg: String) {
                        Log.e(TAG, "Failed to set local description: $msg")
                    }
                    override fun onCreateSuccess(sdp: SessionDescription) {}
                    override fun onCreateFailure(msg: String) {}
                }, sdp)
            }

            override fun onCreateFailure(msg: String) {
                Log.e(TAG, "Create offer failed: $msg")
                onStateChange(CallConnectionState.FAILED)
            }

            override fun onSetSuccess() {}
            override fun onSetFailure(msg: String) {}
        }, constraints)
    }

    fun answerCall(remoteSdp: SessionDescription) {
        if (peerConnection == null) {
            val iceServers = listOf(
                PeerConnection.IceServer.builder("stun:stun.l.google.com:19302").createIceServer(),
                PeerConnection.IceServer.builder("stun:stun1.l.google.com:19302").createIceServer()
            )
            val rtcConfig = PeerConnection.RTCConfiguration(iceServers).apply {
                sdpSemantics = PeerConnection.SdpSemantics.UNIFIED_PLAN
                continualGatheringPolicy = PeerConnection.ContinualGatheringPolicy.GATHER_CONTINUALLY
                iceCandidatePoolSize = 5
            }

            peerConnection = peerConnectionFactory?.createPeerConnection(rtcConfig, object : PeerConnection.Observer {
                override fun onIceCandidate(candidate: IceCandidate) {
                    signaling.sendIceCandidate(candidate)
                }
                override fun onIceCandidatesRemoved(candidates: Array<out IceCandidate>) {}
                override fun onIceConnectionChange(state: PeerConnection.IceConnectionState) {
                    when (state) {
                        PeerConnection.IceConnectionState.CONNECTED -> {
                            onStateChange(CallConnectionState.CONNECTED)
                            signaling.updateCallState("connected")
                        }
                        PeerConnection.IceConnectionState.DISCONNECTED,
                        PeerConnection.IceConnectionState.CLOSED -> onStateChange(CallConnectionState.DISCONNECTED)
                        PeerConnection.IceConnectionState.FAILED -> onStateChange(CallConnectionState.FAILED)
                        else -> {}
                    }
                }
                override fun onIceConnectionReceivingChange(receiving: Boolean) {}
                override fun onIceGatheringChange(state: PeerConnection.IceGatheringState) {}
                override fun onAddStream(stream: MediaStream) {}
                override fun onAddTrack(track: RtpReceiver, streams: Array<out MediaStream>) {}
                override fun onDataChannel(channel: DataChannel) {}
                override fun onRemoveStream(stream: MediaStream) {}
                override fun onRenegotiationNeeded() {}
                override fun onSignalingChange(state: PeerConnection.SignalingState) {}
                override fun onStandardizedIceConnectionChange(state: PeerConnection.IceConnectionState) {}
            })
            peerConnection?.addTrack(localAudioTrack)
        }

        peerConnection?.setRemoteDescription(object : SdpObserver {
            override fun onSetSuccess() {
                Log.d(TAG, "Remote description set successfully")
                val constraints = MediaConstraints().apply {
                    mandatory.add(MediaConstraints.KeyValuePair("OfferToReceiveAudio", "true"))
                }
                peerConnection?.createAnswer(object : SdpObserver {
                    override fun onCreateSuccess(sdp: SessionDescription) {
                        peerConnection?.setLocalDescription(object : SdpObserver {
                            override fun onSetSuccess() {
                                Log.d(TAG, "Local answer set successfully")
                                signaling.sendAnswer(sdp)
                            }
                            override fun onSetFailure(msg: String) {}
                            override fun onCreateSuccess(sdp: SessionDescription) {}
                            override fun onCreateFailure(msg: String) {}
                        }, sdp)
                    }
                    override fun onCreateFailure(msg: String) {
                        Log.e(TAG, "Create answer failed: $msg")
                    }
                    override fun onSetSuccess() {}
                    override fun onSetFailure(msg: String) {}
                }, constraints)
            }
            override fun onSetFailure(msg: String) {
                Log.e(TAG, "Failed to set remote description: $msg")
            }
            override fun onCreateSuccess(sdp: SessionDescription) {}
            override fun onCreateFailure(msg: String) {}
        }, remoteSdp)
    }

    fun setRemoteSdp(sdp: SessionDescription) {
        peerConnection?.setRemoteDescription(object : SdpObserver {
            override fun onSetSuccess() {
                Log.d(TAG, "Remote description set successfully (answer)")
            }
            override fun onSetFailure(msg: String) {
                Log.e(TAG, "Failed to set remote description: $msg")
            }
            override fun onCreateSuccess(sdp: SessionDescription) {}
            override fun onCreateFailure(msg: String) {}
        }, sdp)
    }

    fun addIceCandidate(candidate: IceCandidate) {
        peerConnection?.addIceCandidate(candidate)
    }

    fun toggleMute(): Boolean {
        localAudioTrack?.setEnabled(!(localAudioTrack?.enabled() ?: true))
        return localAudioTrack?.enabled() ?: true
    }

    fun toggleSpeaker(): Boolean {
        audioManager?.let {
            val current = it.isSpeakerphoneOn
            it.isSpeakerphoneOn = !current
            it.mode = AudioManager.MODE_IN_COMMUNICATION
            return !current
        }
        return false
    }

    fun endCall() {
        signaling.updateCallState("ended")
        localAudioTrack?.setEnabled(false)
        peerConnection?.close()
        peerConnection = null
        audioManager?.mode = AudioManager.MODE_NORMAL
        onStateChange(CallConnectionState.DISCONNECTED)
    }

    fun release() {
        endCall()
        audioSource?.dispose()
        audioSource = null
        localAudioTrack = null
        peerConnectionFactory?.dispose()
        peerConnectionFactory = null
    }
}
