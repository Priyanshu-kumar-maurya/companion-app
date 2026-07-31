import React, { useState, useEffect, useRef } from "react";
import { FiMic, FiMicOff, FiVideo, FiVideoOff, FiPhone, FiPhoneOff, FiRefreshCw } from "react-icons/fi";

const ICE_SERVERS = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" }
    ]
};

function CallOverlay({ socket, currentUser }) {
    const [callState, setCallState] = useState("idle"); // 'idle' | 'calling' | 'receiving' | 'active'
    const [callType, setCallType] = useState("video"); // 'audio' | 'video'
    const [partner, setPartner] = useState(null); // { id, name, pic, room }
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [facingMode, setFacingMode] = useState("user");
    const [callDuration, setCallDuration] = useState(0);
    const [statusText, setStatusText] = useState("Calling...");
    const [showBanner, setShowBanner] = useState(true);

    const [netQuality, setNetQuality] = useState({ status: 'good', rtt: 30, label: '🟢 HD Quality (Strong Signal)' });

    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const remoteAudioRef = useRef(null);

    const peerConnectionRef = useRef(null);
    const localStreamRef = useRef(null);
    const iceQueueRef = useRef([]);
    const audioContextRef = useRef(null);
    const ringtoneTimerRef = useRef(null);
    const timerIntervalRef = useRef(null);
    const callingTimeoutRef = useRef(null);
    const statsIntervalRef = useRef(null);

    const hasLoggedCallRef = useRef(false);
    const callDurationRef = useRef(0);

    const logCallHistory = (overrideText) => {
        if (hasLoggedCallRef.current) return;
        hasLoggedCallRef.current = true;

        if (!socket || !partner || !currentUser) return;

        let logText = overrideText;
        let callStatus = 'completed';
        if (!logText) {
            if (callState === 'active' && callDurationRef.current > 0) {
                const m = Math.floor(callDurationRef.current / 60);
                const s = callDurationRef.current % 60;
                const durStr = `${m}m ${s}s`;
                logText = `📞 ${callType === 'video' ? 'Video' : 'Voice'} Call - ${durStr}`;
                callStatus = 'completed';
            } else {
                logText = `📞 Missed ${callType === 'video' ? 'Video' : 'Voice'} Call`;
                callStatus = 'missed';
            }
        }

        socket.emit("send_message", {
            sender_id: currentUser.id,
            receiver_id: partner.id,
            message: logText,
            room: partner.room,
            is_call_log: true
        });

        const token = localStorage.getItem("token");
        fetch("https://rentgf-and-bf.onrender.com/api/call-history", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                caller_id: currentUser.id,
                receiver_id: partner.id,
                call_type: callType,
                duration: callDurationRef.current,
                status: callStatus
            })
        }).catch(err => console.error("Call history DB log error:", err));
    };

    // --- Web Audio Ringtone Synthesizer ---
    const startRingtone = () => {
        try {
            stopRingtone();
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return;
            const ctx = new AudioCtx();
            audioContextRef.current = ctx;

            const playChime = () => {
                if (ctx.state === 'suspended') {
                    ctx.resume();
                }
                const now = ctx.currentTime;
                const osc1 = ctx.createOscillator();
                const osc2 = ctx.createOscillator();
                const gain = ctx.createGain();

                osc1.type = 'sine';
                osc2.type = 'sine';
                osc1.frequency.setValueAtTime(440, now);
                osc2.frequency.setValueAtTime(480, now);

                gain.gain.setValueAtTime(0.15, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);

                osc1.connect(gain);
                osc2.connect(gain);
                gain.connect(ctx.destination);

                osc1.start(now);
                osc2.start(now);
                osc1.stop(now + 1.5);
                osc2.stop(now + 1.5);
            };

            playChime();
            ringtoneTimerRef.current = setInterval(playChime, 2500);
        } catch (e) {
            console.error("Ringtone synth error:", e);
        }
    };

    const stopRingtone = () => {
        if (ringtoneTimerRef.current) {
            clearInterval(ringtoneTimerRef.current);
            ringtoneTimerRef.current = null;
        }
        if (audioContextRef.current) {
            audioContextRef.current.close().catch(() => {});
            audioContextRef.current = null;
        }
    };

    // --- Call Cleanup ---
    const cleanupCall = () => {
        stopRingtone();
        if (callingTimeoutRef.current) {
            clearTimeout(callingTimeoutRef.current);
            callingTimeoutRef.current = null;
        }
        if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
        }
        if (statsIntervalRef.current) {
            clearInterval(statsIntervalRef.current);
            statsIntervalRef.current = null;
        }
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop());
            localStreamRef.current = null;
        }
        if (peerConnectionRef.current) {
            peerConnectionRef.current.close();
            peerConnectionRef.current = null;
        }
        iceQueueRef.current = [];
        setCallState("idle");
        setPartner(null);
        setCallDuration(0);
        setIsMuted(false);
        setIsVideoOff(false);
        setStatusText("Calling...");
        setShowBanner(true);
        setNetQuality({ status: 'good', rtt: 30, label: '🟢 HD Quality (Strong Signal)' });
    };

    // --- WebRTC Peer Setup ---
    const setupWebRTC = async (type, isCaller) => {
        try {
            const constraints = {
                audio: true,
                video: type === 'video' ? { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } : false
            };
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            localStreamRef.current = stream;

            if (localVideoRef.current && type === 'video') {
                localVideoRef.current.srcObject = stream;
            }

            const pc = new RTCPeerConnection(ICE_SERVERS);
            peerConnectionRef.current = pc;

            // Connection state change monitors
            pc.onconnectionstatechange = () => {
                if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
                    setNetQuality({ status: 'reconnecting', rtt: 0, label: '⚠️ Network Drop - Reconnecting...' });
                } else if (pc.connectionState === 'connected') {
                    setNetQuality({ status: 'good', rtt: 30, label: '🟢 HD Quality (Strong Signal)' });
                }
            };

            pc.oniceconnectionstatechange = () => {
                if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
                    setNetQuality({ status: 'reconnecting', rtt: 0, label: '⚠️ Reconnecting Call...' });
                }
            };

            // Periodically check RTT and latency stats
            if (statsIntervalRef.current) clearInterval(statsIntervalRef.current);
            statsIntervalRef.current = setInterval(async () => {
                if (pc && pc.connectionState === 'connected') {
                    try {
                        const stats = await pc.getStats();
                        stats.forEach(report => {
                            if (report.type === 'remote-inbound-rtp' || report.type === 'candidate-pair') {
                                if (report.currentRoundTripTime !== undefined) {
                                    const rttMs = Math.round(report.currentRoundTripTime * 1000);
                                    if (rttMs > 300) {
                                        setNetQuality({ status: 'poor', rtt: rttMs, label: `🔴 High Latency (${rttMs}ms)` });
                                    } else if (rttMs > 120) {
                                        setNetQuality({ status: 'fair', rtt: rttMs, label: `🟡 Fair Connection (${rttMs}ms)` });
                                    } else {
                                        setNetQuality({ status: 'good', rtt: rttMs, label: `🟢 HD Quality (${rttMs}ms)` });
                                    }
                                }
                            }
                        });
                    } catch (e) {}
                }
            }, 3000);

            stream.getTracks().forEach(track => pc.addTrack(track, stream));

            pc.ontrack = (event) => {
                if (event.streams && event.streams[0]) {
                    if (type === 'video' && remoteVideoRef.current) {
                        remoteVideoRef.current.srcObject = event.streams[0];
                    } else if (remoteAudioRef.current) {
                        remoteAudioRef.current.srcObject = event.streams[0];
                    }
                }
            };

            pc.onicecandidate = (event) => {
                if (event.candidate && partner && socket) {
                    socket.emit("webrtc_ice_candidate", {
                        room: partner.room,
                        candidate: event.candidate,
                        to: partner.id
                    });
                }
            };

            if (isCaller) {
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                socket.emit("webrtc_offer", {
                    room: partner.room,
                    offer: offer,
                    to: partner.id
                });
            }

            return pc;
        } catch (err) {
            console.error("WebRTC Setup Error:", err);
            alert("Could not access camera/microphone permissions.");
            cleanupCall();
        }
    };

    // --- Global Call Event Handler ---
    useEffect(() => {
        const handleStartCall = (e) => {
            const { targetUser, type, room } = e.detail;
            hasLoggedCallRef.current = false;
            callDurationRef.current = 0;
            setCallType(type);
            setPartner({
                id: targetUser.id,
                name: targetUser.name || 'Companion',
                pic: targetUser.profile_pic || targetUser.pic || '',
                room: room
            });
            setCallState("calling");
            setStatusText("Calling...");
            socket.emit("initiate_call", {
                room: room,
                receiver_id: targetUser.id,
                type: type,
                caller_name: currentUser?.name || 'User',
                caller_pic: currentUser?.profile_pic || '',
                caller_user_id: currentUser?.id
            });

            // Timeout after 25 sec if unanswered
            if (callingTimeoutRef.current) clearTimeout(callingTimeoutRef.current);
            callingTimeoutRef.current = setTimeout(() => {
                setStatusText("User Unavailable");
                logCallHistory(`📞 Missed ${type === 'video' ? 'Video' : 'Voice'} Call`);
                setTimeout(() => cleanupCall(), 2000);
            }, 25000);
        };

        window.addEventListener("rentgf_start_call", handleStartCall);
        return () => window.removeEventListener("rentgf_start_call", handleStartCall);
    }, [socket, currentUser]);

    // --- Socket Listeners ---
    useEffect(() => {
        if (!socket) return;

        const handleIncomingCall = (data) => {
            // Ignore if I am the caller!
            if (currentUser && data.caller_user_id && String(data.caller_user_id) === String(currentUser.id)) return;
            if (data.caller_id === socket.id) return;
            if (callState !== "idle") return; // Busy
            hasLoggedCallRef.current = false;
            callDurationRef.current = 0;
            setCallType(data.type || "video");
            setPartner({
                id: data.caller_user_id || data.caller_id,
                name: data.caller_name || "Incoming Caller",
                pic: data.caller_pic || "",
                room: data.room
            });
            setCallState("receiving");
            setShowBanner(true);
            startRingtone();
        };

        const handleCallStatusUpdate = (data) => {
            if (data && data.statusText) {
                setStatusText(data.statusText);
            }
        };

        const handleCallAccepted = async () => {
            stopRingtone();
            if (callingTimeoutRef.current) clearTimeout(callingTimeoutRef.current);
            hasLoggedCallRef.current = false;
            callDurationRef.current = 0;
            setCallState("active");
            setCallDuration(0);
            timerIntervalRef.current = setInterval(() => {
                setCallDuration(prev => {
                    callDurationRef.current = prev + 1;
                    return prev + 1;
                });
            }, 1000);
            if (partner) {
                await setupWebRTC(callType, true);
            }
        };

        const handleCallRejected = () => {
            logCallHistory(`📞 Missed ${callType === 'video' ? 'Video' : 'Voice'} Call`);
            cleanupCall();
        };

        const handleCallEnded = () => {
            logCallHistory();
            cleanupCall();
        };

        const handleWebrtcOffer = async (offer) => {
            if (!peerConnectionRef.current) {
                await setupWebRTC(callType, false);
            }
            const pc = peerConnectionRef.current;
            if (pc) {
                await pc.setRemoteDescription(new RTCSessionDescription(offer));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                socket.emit("webrtc_answer", { room: partner.room, answer: answer, to: partner.id });

                while (iceQueueRef.current.length > 0) {
                    const candidate = iceQueueRef.current.shift();
                    try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch (e) { }
                }
            }
        };

        const handleWebrtcAnswer = async (answer) => {
            const pc = peerConnectionRef.current;
            if (pc && pc.signalingState === "have-local-offer") {
                await pc.setRemoteDescription(new RTCSessionDescription(answer));
                while (iceQueueRef.current.length > 0) {
                    const candidate = iceQueueRef.current.shift();
                    try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch (e) { }
                }
            }
        };

        const handleWebrtcIceCandidate = async (candidate) => {
            const pc = peerConnectionRef.current;
            if (pc && pc.remoteDescription && pc.remoteDescription.type) {
                try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch (e) { }
            } else {
                iceQueueRef.current.push(candidate);
            }
        };

        socket.on("incoming_call", handleIncomingCall);
        socket.on("call_status_update", handleCallStatusUpdate);
        socket.on("call_accepted", handleCallAccepted);
        socket.on("call_rejected", handleCallRejected);
        socket.on("call_ended", handleCallEnded);
        socket.on("webrtc_offer", handleWebrtcOffer);
        socket.on("webrtc_answer", handleWebrtcAnswer);
        socket.on("webrtc_ice_candidate", handleWebrtcIceCandidate);

        return () => {
            socket.off("incoming_call", handleIncomingCall);
            socket.off("call_status_update", handleCallStatusUpdate);
            socket.off("call_accepted", handleCallAccepted);
            socket.off("call_rejected", handleCallRejected);
            socket.off("call_ended", handleCallEnded);
            socket.off("webrtc_offer", handleWebrtcOffer);
            socket.off("webrtc_answer", handleWebrtcAnswer);
            socket.off("webrtc_ice_candidate", handleWebrtcIceCandidate);
        };
    }, [socket, callState, callType, partner]);

    // --- User Actions ---
    const acceptCall = async () => {
        stopRingtone();
        if (callingTimeoutRef.current) clearTimeout(callingTimeoutRef.current);
        hasLoggedCallRef.current = false;
        callDurationRef.current = 0;
        setCallState("active");
        setCallDuration(0);
        timerIntervalRef.current = setInterval(() => {
            setCallDuration(prev => {
                callDurationRef.current = prev + 1;
                return prev + 1;
            });
        }, 1000);
        await setupWebRTC(callType, false);
        socket.emit("accept_call", { room: partner.room, to: partner.id });
    };

    const rejectCall = () => {
        logCallHistory(`📞 Missed ${callType === 'video' ? 'Video' : 'Voice'} Call`);
        if (partner && socket) {
            socket.emit("reject_call", { room: partner.room, to: partner.id });
        }
        cleanupCall();
    };

    const endCall = () => {
        logCallHistory();
        if (partner && socket) {
            socket.emit("end_call", { room: partner.room, to: partner.id });
        }
        cleanupCall();
    };

    const toggleMic = () => {
        if (localStreamRef.current) {
            const audioTrack = localStreamRef.current.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsMuted(!audioTrack.enabled);
            }
        }
    };

    const toggleVideo = () => {
        if (localStreamRef.current) {
            const videoTrack = localStreamRef.current.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setIsVideoOff(!videoTrack.enabled);
            }
        }
    };

    const switchCamera = async () => {
        if (!localStreamRef.current || callType !== 'video') return;
        const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
        setFacingMode(newFacingMode);

        try {
            const newStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: newFacingMode } });
            const newVideoTrack = newStream.getVideoTracks()[0];
            const oldVideoTrack = localStreamRef.current.getVideoTracks()[0];
            if (oldVideoTrack) {
                localStreamRef.current.removeTrack(oldVideoTrack);
                oldVideoTrack.stop();
            }
            localStreamRef.current.addTrack(newVideoTrack);
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = localStreamRef.current;
            }
            if (peerConnectionRef.current) {
                const sender = peerConnectionRef.current.getSenders().find(s => s.track && s.track.kind === 'video');
                if (sender) {
                    sender.replaceTrack(newVideoTrack);
                }
            }
        } catch (e) {
            console.error("Switch camera error:", e);
        }
    };

    const formatTimer = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    if (callState === "idle") return null;

    return (
        <>
            {/* ── INSTAGRAM STYLE TOP FLOATING NOTIFICATION BANNER (When Receiving Call) ── */}
            {callState === 'receiving' && showBanner && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[10000] w-[92%] max-w-md bg-[#121212]/95 border border-[#262626] rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.8)] backdrop-blur-xl p-3.5 flex items-center justify-between animate-bounce">
                    <div className="flex items-center gap-3 min-w-0 cursor-pointer" onClick={() => setShowBanner(false)}>
                        <div className="relative shrink-0">
                            <img
                                src={partner?.pic || "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"}
                                alt={partner?.name}
                                className="w-12 h-12 rounded-full object-cover border-2 border-[#0095f6]"
                            />
                            <div className="absolute inset-0 rounded-full bg-[#0095f6]/30 animate-ping" />
                        </div>
                        <div className="min-w-0">
                            <h4 className="text-sm font-bold text-white truncate">{partner?.name}</h4>
                            <p className="text-xs text-[#0095f6] font-medium truncate flex items-center gap-1">
                                {callType === 'video' ? <FiVideo size={12} /> : <FiPhone size={12} />}
                                Incoming {callType === 'video' ? 'Video' : 'Voice'} Call...
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            onClick={rejectCall}
                            className="w-10 h-10 rounded-full bg-[#ff3b30] hover:bg-red-600 text-white flex items-center justify-center shadow-lg transition active:scale-90"
                        >
                            <FiPhoneOff size={18} />
                        </button>
                        <button
                            onClick={acceptCall}
                            className="w-10 h-10 rounded-full bg-[#30d158] hover:bg-green-600 text-white flex items-center justify-center shadow-lg transition active:scale-90 animate-pulse"
                        >
                            {callType === 'video' ? <FiVideo size={18} /> : <FiPhone size={18} />}
                        </button>
                    </div>
                </div>
            )}

            {/* ── FULL SCREEN CALL MODAL ── */}
            <div className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-xl flex flex-col justify-between overflow-hidden animate-fade-in">
                {/* Hidden Audio Element for Voice Calls */}
                <audio ref={remoteAudioRef} autoPlay />

                {/* Top Bar / Caller Header */}
                <div className="pt-10 px-6 flex flex-col items-center z-20 text-center">
                    <div className="flex items-center gap-2 mb-3">
                        <span className="text-[10px] uppercase font-bold tracking-widest text-[#0095f6] bg-[#0095f6]/10 px-3 py-1 rounded-full border border-[#0095f6]/20">
                            {callType === 'video' ? 'HD Video Call' : 'Voice Call'}
                        </span>
                        {callState === 'active' && (
                            <span className={`text-[10px] font-extrabold tracking-wide px-3 py-1 rounded-full border backdrop-blur-md transition-all duration-300 ${
                                netQuality.status === 'good'
                                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                    : netQuality.status === 'fair'
                                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                                        : 'bg-red-500/20 border-red-500/40 text-red-400 animate-pulse'
                            }`}>
                                {netQuality.label}
                            </span>
                        )}
                    </div>

                    {callState === 'active' && (
                        <div className="text-xl font-mono font-bold text-white tracking-widest bg-white/10 px-4 py-1 rounded-full backdrop-blur-md border border-white/10">
                            {formatTimer(callDuration)}
                        </div>
                    )}
                </div>

                {/* Center View: Avatars or Remote Video */}
                <div className="flex-1 relative flex items-center justify-center p-4">
                    {/* Active Video Stream */}
                    {callState === 'active' && callType === 'video' ? (
                        <div className="relative w-full h-full max-w-4xl rounded-3xl overflow-hidden border border-[#262626] bg-[#121212] shadow-2xl flex items-center justify-center">
                            <video
                                ref={remoteVideoRef}
                                autoPlay
                                playsInline
                                className="w-full h-full object-cover"
                            />

                            {/* Local Video Picture-in-Picture */}
                            <div className="absolute top-4 right-4 w-32 h-44 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl bg-black z-30">
                                <video
                                    ref={localVideoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        </div>
                    ) : (
                        /* Avatar Profile View (Calling, Receiving, or Active Audio) */
                        <div className="flex flex-col items-center justify-center text-center z-10">
                            <div className="relative mb-6">
                                {(callState === 'calling' || callState === 'receiving') && (
                                    <div className="absolute inset-0 rounded-full bg-[#0095f6]/30 animate-ping scale-150" />
                                )}
                                <img
                                    src={partner?.pic || "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"}
                                    alt={partner?.name}
                                    className="w-32 h-32 sm:w-40 sm:h-40 rounded-full object-cover border-4 border-[#262626] shadow-[0_0_50px_rgba(0,149,246,0.3)] relative z-10"
                                />
                            </div>

                            <h2 className="text-2xl font-extrabold text-white mb-1">{partner?.name}</h2>
                            <p className="text-sm text-gray-400 font-medium">
                                {callState === 'calling' && statusText}
                                {callState === 'receiving' && `Incoming ${callType} call`}
                                {callState === 'active' && 'Connected'}
                            </p>
                        </div>
                    )}
                </div>

                {/* Bottom Controls Bar */}
                <div className="pb-12 pt-6 px-6 flex items-center justify-center gap-6 z-30 bg-gradient-to-t from-black via-black/80 to-transparent">
                    {callState === 'receiving' ? (
                        <div className="flex items-center gap-10">
                            <button
                                onClick={rejectCall}
                                className="w-16 h-16 rounded-full bg-[#ff3b30] hover:bg-red-600 text-white flex items-center justify-center shadow-xl transition transform hover:scale-110 active:scale-95"
                            >
                                <FiPhoneOff size={26} />
                            </button>

                            <button
                                onClick={acceptCall}
                                className="w-16 h-16 rounded-full bg-[#30d158] hover:bg-green-600 text-white flex items-center justify-center shadow-xl transition transform hover:scale-110 active:scale-95 animate-bounce"
                            >
                                {callType === 'video' ? <FiVideo size={26} /> : <FiPhone size={26} />}
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-4 bg-[#121212] border border-[#262626] p-4 rounded-full shadow-2xl backdrop-blur-md">
                            <button
                                onClick={toggleMic}
                                className={`w-12 h-12 rounded-full flex items-center justify-center transition active:scale-90 ${isMuted ? 'bg-red-500/20 text-red-500 border border-red-500/30' : 'bg-[#262626] text-white hover:bg-[#363636]'}`}
                            >
                                {isMuted ? <FiMicOff size={20} /> : <FiMic size={20} />}
                            </button>

                            {callType === 'video' && (
                                <>
                                    <button
                                        onClick={toggleVideo}
                                        className={`w-12 h-12 rounded-full flex items-center justify-center transition active:scale-90 ${isVideoOff ? 'bg-red-500/20 text-red-500 border border-red-500/30' : 'bg-[#262626] text-white hover:bg-[#363636]'}`}
                                    >
                                        {isVideoOff ? <FiVideoOff size={20} /> : <FiVideo size={20} />}
                                    </button>

                                    <button
                                        onClick={switchCamera}
                                        className="w-12 h-12 rounded-full bg-[#262626] hover:bg-[#363636] text-white flex items-center justify-center transition active:scale-90"
                                    >
                                        <FiRefreshCw size={20} />
                                    </button>
                                </>
                            )}

                            <button
                                onClick={endCall}
                                className="w-14 h-14 rounded-full bg-[#ff3b30] hover:bg-red-600 text-white flex items-center justify-center shadow-xl transition transform hover:scale-110 active:scale-95 ml-2"
                            >
                                <FiPhoneOff size={22} />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

export default CallOverlay;
