import React, { useState, useEffect, useRef } from "react";
import {
  FiMic,
  FiMicOff,
  FiVideo,
  FiVideoOff,
  FiPhone,
  FiPhoneOff,
  FiRefreshCw,
  FiVolume2,
  FiVolumeX,
  FiShield,
  FiMinimize2,
  FiMaximize2,
  FiHeart,
  FiCheck,
} from "react-icons/fi";

const DEFAULT_ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
    { urls: "stun:stun.services.mozilla.com" },
    {
      urls: [
        "turn:openrelay.metered.ca:80",
        "turn:openrelay.metered.ca:443",
        "turn:openrelay.metered.ca:443?transport=tcp",
      ],
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: [
        "turns:openrelay.metered.ca:443?transport=tcp",
        "turns:openrelay.metered.ca:5349",
        "turns:openrelay.metered.ca:5349?transport=tcp",
      ],
      username: "openrelayproject",
      credential: "openrelayproject",
    },
  ],
  iceCandidatePoolSize: 10,
};

const API_BASE = process.env.REACT_APP_API_URL || "https://rentgf-and-bf.onrender.com";
const API = `${API_BASE}/api`;

const extractIceCandidate = (data) => {
  if (!data) return null;
  let target = data;
  if (data.candidate && typeof data.candidate === "object") {
    target = data.candidate;
  }
  const candidateStr = typeof target === "string" ? target : target.candidate || "";
  if (!candidateStr || candidateStr.trim() === "") return null;

  return {
    candidate: candidateStr,
    sdpMid: target.sdpMid !== undefined ? target.sdpMid : data.sdpMid,
    sdpMLineIndex: target.sdpMLineIndex !== undefined ? target.sdpMLineIndex : data.sdpMLineIndex,
    usernameFragment: target.usernameFragment || data.usernameFragment,
  };
};

function CallOverlay({ socket, currentUser }) {
  const [callState, setCallState] = useState("idle"); // 'idle' | 'calling' | 'receiving' | 'active'
  const [callType, setCallType] = useState("video"); // 'audio' | 'video'
  const [partner, setPartner] = useState(null); // { id, name, pic, room }
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showReactionsMenu, setShowReactionsMenu] = useState(false);
  const [floatingReactions, setFloatingReactions] = useState([]);
  const [facingMode, setFacingMode] = useState("user");
  const [callDuration, setCallDuration] = useState(0);
  const [statusText, setStatusText] = useState("Calling...");
  const [showBanner, setShowBanner] = useState(true);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);

  const [netQuality, setNetQuality] = useState({
    status: "good",
    rtt: 25,
    label: "🟢 HD Signal (25ms)",
  });

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);

  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const partnerRef = useRef(null);
  const isCallerRef = useRef(false);
  const callTypeRef = useRef("video");
  const callStateRef = useRef("idle");
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

    if (!isCallerRef.current) return;

    const p = partnerRef.current || partner;
    const currentType = callTypeRef.current || callType;
    if (!socket || !p || !currentUser) return;

    let logText = overrideText;
    let callStatus = "completed";
    if (!logText) {
      if (callStateRef.current === "active" && callDurationRef.current > 0) {
        const m = Math.floor(callDurationRef.current / 60);
        const s = callDurationRef.current % 60;
        const durStr = `${m}m ${s}s`;
        logText = `📞 ${currentType === "video" ? "Video" : "Voice"} Call - ${durStr}`;
        callStatus = "completed";
      } else {
        logText = `📞 Missed ${currentType === "video" ? "Video" : "Voice"} Call`;
        callStatus = "missed";
      }
    }

    socket.emit("send_message", {
      sender_id: currentUser.id,
      receiver_id: p.id,
      message: logText,
      room: p.room,
      is_call_log: true,
    });

    const token = localStorage.getItem("token");
    fetch(`${API}/call-history`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        caller_id: currentUser.id,
        receiver_id: p.id,
        call_type: currentType,
        duration: callDurationRef.current,
        status: callStatus,
      }),
    }).catch((err) => console.error("Call history DB log error:", err));
  };

  // --- Sound Synthesizers for Ringtone & Ringback Tone ---
  const stopAllAudio = () => {
    if (ringtoneTimerRef.current) {
      clearInterval(ringtoneTimerRef.current);
      ringtoneTimerRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close().catch(() => {});
      } catch (e) {}
      audioContextRef.current = null;
    }
  };

  const startIncomingRingtone = () => {
    try {
      stopAllAudio();
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const playChime = () => {
        if (ctx.state === "suspended") ctx.resume();
        const now = ctx.currentTime;
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = "sine";
        osc2.type = "sine";
        osc1.frequency.setValueAtTime(440, now);
        osc2.frequency.setValueAtTime(554.37, now);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.6);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 1.6);
        osc2.stop(now + 1.6);
      };

      playChime();
      ringtoneTimerRef.current = setInterval(playChime, 2400);
    } catch (e) {
      console.warn("Incoming ringtone warning:", e);
    }
  };

  const startOutgoingTone = () => {
    try {
      stopAllAudio();
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const playRingback = () => {
        if (ctx.state === "suspended") ctx.resume();
        const now = ctx.currentTime;
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = "sine";
        osc2.type = "sine";
        osc1.frequency.setValueAtTime(440, now);
        osc2.frequency.setValueAtTime(480, now);

        gain.gain.setValueAtTime(0.06, now);
        gain.gain.setValueAtTime(0.06, now + 1.2);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.3);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 1.3);
        osc2.stop(now + 1.3);
      };

      playRingback();
      ringtoneTimerRef.current = setInterval(playRingback, 3500);
    } catch (e) {
      console.warn("Outgoing tone warning:", e);
    }
  };

  const cleanupCall = () => {
    stopAllAudio();
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
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    setLocalStream(null);
    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach((track) => track.stop());
      remoteStreamRef.current = null;
    }
    setRemoteStream(null);
    if (peerConnectionRef.current) {
      try {
        peerConnectionRef.current.close();
      } catch (e) {}
      peerConnectionRef.current = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    iceQueueRef.current = [];
    partnerRef.current = null;
    isCallerRef.current = false;
    callStateRef.current = "idle";
    setCallState("idle");
    setPartner(null);
    setCallDuration(0);
    setIsMuted(false);
    setIsVideoOff(false);
    setIsSpeakerOn(true);
    setIsMinimized(false);
    setShowReactionsMenu(false);
    setFloatingReactions([]);
    setStatusText("Calling...");
    setShowBanner(true);
    setNetQuality({ status: "good", rtt: 25, label: "🟢 HD Signal (25ms)" });
  };

  const setupWebRTC = async (type, isCaller) => {
    try {
      let stream = localStreamRef.current;
      const hasValidVideo =
        stream &&
        stream.getVideoTracks().length > 0 &&
        stream.getVideoTracks()[0].readyState === "live";
      const hasValidAudio =
        stream &&
        stream.getAudioTracks().length > 0 &&
        stream.getAudioTracks()[0].readyState === "live";

      if (!stream || (type === "video" && !hasValidVideo) || !hasValidAudio) {
        if (stream) {
          stream.getTracks().forEach((t) => t.stop());
        }
        const constraints = {
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video:
            type === "video"
              ? {
                  facingMode: facingMode || "user",
                  width: { min: 320, ideal: 640, max: 1280 },
                  height: { min: 240, ideal: 480, max: 720 },
                  frameRate: { ideal: 24, max: 30 },
                }
              : false,
        };
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (mediaErr) {
          console.warn("Retrying getUserMedia with standard constraints:", mediaErr);
          stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: type === "video",
          });
        }
        localStreamRef.current = stream;
        setLocalStream(stream);
      }

      if (localVideoRef.current && type === "video") {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.play().catch(() => {});
      }

      const pc = new RTCPeerConnection(DEFAULT_ICE_SERVERS);
      peerConnectionRef.current = pc;

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
          setNetQuality({
            status: "reconnecting",
            rtt: 0,
            label: "⚠️ Reconnecting...",
          });
        } else if (pc.connectionState === "connected") {
          setNetQuality({ status: "good", rtt: 25, label: "🟢 HD P2P Active" });
        }
      };

      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === "failed") {
          setNetQuality({ status: "reconnecting", rtt: 0, label: "⚠️ Reconnecting Stream..." });
          if (pc.restartIce) {
            try {
              pc.restartIce();
            } catch (e) {}
          }
        } else if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
          setNetQuality({ status: "good", rtt: 25, label: "🟢 HD Encrypted P2P" });
        }
      };

      if (statsIntervalRef.current) clearInterval(statsIntervalRef.current);
      statsIntervalRef.current = setInterval(async () => {
        if (pc && pc.connectionState === "connected") {
          try {
            const stats = await pc.getStats();
            stats.forEach((report) => {
              if (report.type === "remote-inbound-rtp" || report.type === "candidate-pair") {
                if (report.currentRoundTripTime !== undefined) {
                  const rttMs = Math.round(report.currentRoundTripTime * 1000);
                  if (rttMs > 300) {
                    setNetQuality({
                      status: "poor",
                      rtt: rttMs,
                      label: `🔴 High Latency (${rttMs}ms)`,
                    });
                  } else if (rttMs > 120) {
                    setNetQuality({
                      status: "fair",
                      rtt: rttMs,
                      label: `🟡 Fair (${rttMs}ms)`,
                    });
                  } else {
                    setNetQuality({
                      status: "good",
                      rtt: rttMs,
                      label: `🟢 HD Quality (${rttMs}ms)`,
                    });
                  }
                }
              }
            });
          } catch (e) {}
        }
      }, 3000);

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        let incomingStream = null;
        if (event.streams && event.streams[0]) {
          incomingStream = event.streams[0];
        } else if (event.track) {
          if (!remoteStreamRef.current) {
            remoteStreamRef.current = new MediaStream();
          }
          if (!remoteStreamRef.current.getTracks().some((t) => t.id === event.track.id)) {
            remoteStreamRef.current.addTrack(event.track);
          }
          incomingStream = remoteStreamRef.current;
        }

        if (incomingStream) {
          remoteStreamRef.current = incomingStream;
          setRemoteStream(incomingStream);

          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = incomingStream;
            remoteVideoRef.current.play().catch((err) => {
              console.warn("Remote video play warning:", err);
            });
          }
          if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = incomingStream;
            remoteAudioRef.current.play().catch((err) => {
              console.warn("Remote audio play warning:", err);
            });
          }
        }
      };

      pc.onicecandidate = (event) => {
        const p = partnerRef.current || partner;
        if (event.candidate && event.candidate.candidate && p && socket) {
          const candData = {
            candidate: event.candidate.candidate,
            sdpMid: event.candidate.sdpMid,
            sdpMLineIndex: event.candidate.sdpMLineIndex,
            usernameFragment: event.candidate.usernameFragment,
          };
          socket.emit("webrtc_ice_candidate", {
            room: p.room,
            candidate: candData,
            to: p.id,
          });
        }
      };

      if (isCaller) {
        const p = partnerRef.current || partner;
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: type === "video",
        });
        await pc.setLocalDescription(offer);
        if (p && socket) {
          socket.emit("webrtc_offer", {
            room: p.room,
            offer: offer,
            to: p.id,
          });
        }
      }

      return pc;
    } catch (err) {
      console.error("WebRTC Setup Error:", err);
      alert(
        "Camera or Microphone permission was denied or unavailable. Please enable permissions to make calls."
      );
      cleanupCall();
    }
  };

  // --- Global Call Event Handler ---
  useEffect(() => {
    const handleStartCall = async (e) => {
      const { targetUser, type, room } = e.detail;
      hasLoggedCallRef.current = false;
      callDurationRef.current = 0;
      isCallerRef.current = true;
      const p = {
        id: targetUser.id,
        name: targetUser.name || "Companion",
        pic: targetUser.profile_pic || targetUser.pic || "",
        room: room,
      };
      partnerRef.current = p;
      callTypeRef.current = type;
      callStateRef.current = "calling";
      setCallType(type);
      setPartner(p);
      setCallState("calling");
      setStatusText("Calling...");
      setIsMinimized(false);
      startOutgoingTone();

      try {
        const constraints = {
          audio: { echoCancellation: true, noiseSuppression: true },
          video:
            type === "video"
              ? {
                  facingMode: "user",
                  width: { min: 320, ideal: 640, max: 1280 },
                  height: { min: 240, ideal: 480, max: 720 },
                  frameRate: { ideal: 24, max: 30 },
                }
              : false,
        };
        const preStream = await navigator.mediaDevices.getUserMedia(constraints);
        localStreamRef.current = preStream;
        setLocalStream(preStream);
      } catch (err) {
        console.warn("Pre-warm media warning:", err);
      }

      if (socket && room) {
        socket.emit("join_room", room);
      }

      socket.emit("initiate_call", {
        room: room,
        receiver_id: targetUser.id,
        to: targetUser.id,
        type: type,
        caller_name: currentUser?.name || "User",
        caller_pic: currentUser?.profile_pic || "",
        caller_user_id: currentUser?.id,
      });

      if (callingTimeoutRef.current) clearTimeout(callingTimeoutRef.current);
      callingTimeoutRef.current = setTimeout(() => {
        setStatusText("User Unavailable");
        logCallHistory(`📞 Missed ${type === "video" ? "Video" : "Voice"} Call`);
        setTimeout(() => cleanupCall(), 2000);
      }, 30000);
    };

    window.addEventListener("rentgf_start_call", handleStartCall);
    return () => window.removeEventListener("rentgf_start_call", handleStartCall);
  }, [socket, currentUser]);

  // --- Real-Time Floating Reactions ---
  const sendReaction = (emoji) => {
    const id = Date.now() + Math.random();
    const newReaction = { id, emoji, left: Math.floor(Math.random() * 40) + 30 };
    setFloatingReactions((prev) => [...prev, newReaction]);
    setTimeout(() => {
      setFloatingReactions((prev) => prev.filter((r) => r.id !== id));
    }, 2400);

    const p = partnerRef.current || partner;
    if (socket && p) {
      socket.emit("call_reaction", { to: p.id, room: p.room, emoji });
    }
    setShowReactionsMenu(false);
  };

  // --- Socket Listeners ---
  useEffect(() => {
    if (!socket) return;

    const handleIncomingCall = (data) => {
      if (
        currentUser &&
        data.caller_user_id &&
        String(data.caller_user_id) === String(currentUser.id)
      ) {
        return;
      }
      if (data.caller_id === socket.id) return;
      if (callStateRef.current !== "idle") return;

      hasLoggedCallRef.current = false;
      callDurationRef.current = 0;
      isCallerRef.current = false;
      const callTypeVal = data.type || "video";
      const p = {
        id: data.caller_user_id || data.caller_id,
        name: data.caller_name || "Incoming Caller",
        pic: data.caller_pic || "",
        room: data.room,
      };
      partnerRef.current = p;
      callTypeRef.current = callTypeVal;
      callStateRef.current = "receiving";
      setCallType(callTypeVal);
      setPartner(p);
      setCallState("receiving");
      setIsMinimized(false);
      setShowBanner(true);
      startIncomingRingtone();

      if (data.room) {
        socket.emit("join_room", data.room);
      }
    };

    const handleCallStatusUpdate = (data) => {
      if (data && data.statusText) {
        setStatusText(data.statusText);
      }
    };

    const handleCallAccepted = async () => {
      if (callStateRef.current === "active") return;
      stopAllAudio();
      if (callingTimeoutRef.current) {
        clearTimeout(callingTimeoutRef.current);
        callingTimeoutRef.current = null;
      }
      hasLoggedCallRef.current = false;
      callDurationRef.current = 0;
      callStateRef.current = "active";
      setCallState("active");
      setCallDuration(0);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = setInterval(() => {
        setCallDuration((prev) => {
          callDurationRef.current = prev + 1;
          return prev + 1;
        });
      }, 1000);

      const type = callTypeRef.current || "video";
      await setupWebRTC(type, true);
    };

    const handleCallRejected = () => {
      const currentType = callTypeRef.current || callType;
      logCallHistory(`📞 Missed ${currentType === "video" ? "Video" : "Voice"} Call`);
      cleanupCall();
    };

    const handleCallEnded = () => {
      logCallHistory();
      cleanupCall();
    };

    const handleWebrtcOffer = async (data) => {
      const offer = data?.offer || data;
      if (!offer || !offer.sdp) return;
      const type = callTypeRef.current || callType;
      const p = partnerRef.current || partner;

      if (!peerConnectionRef.current) {
        await setupWebRTC(type, false);
      }
      const pc = peerConnectionRef.current;
      if (pc && offer) {
        try {
          if (pc.signalingState !== "stable" && pc.signalingState !== "have-local-offer") {
            console.warn("Ignoring duplicate offer; signalingState is:", pc.signalingState);
            return;
          }
          await pc.setRemoteDescription(new RTCSessionDescription(offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          if (p && socket) {
            socket.emit("webrtc_answer", { room: p.room, answer: answer, to: p.id });
          }

          while (iceQueueRef.current.length > 0) {
            const rawCand = iceQueueRef.current.shift();
            const parsed = extractIceCandidate(rawCand);
            if (parsed && parsed.candidate) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(parsed));
              } catch (e) {}
            }
          }
        } catch (err) {
          console.error("handleWebrtcOffer error:", err);
        }
      }
    };

    const handleWebrtcAnswer = async (data) => {
      const answer = data?.answer || data;
      if (!answer || !answer.sdp) return;
      const pc = peerConnectionRef.current;
      if (pc && answer && pc.signalingState === "have-local-offer") {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
          while (iceQueueRef.current.length > 0) {
            const rawCand = iceQueueRef.current.shift();
            const parsed = extractIceCandidate(rawCand);
            if (parsed && parsed.candidate) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(parsed));
              } catch (e) {}
            }
          }
        } catch (err) {
          console.error("handleWebrtcAnswer error:", err);
        }
      }
    };

    const handleWebrtcIceCandidate = async (data) => {
      const parsed = extractIceCandidate(data);
      if (!parsed || !parsed.candidate) return;
      const pc = peerConnectionRef.current;
      if (pc && pc.remoteDescription && pc.remoteDescription.type) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(parsed));
        } catch (e) {
          console.warn("addIceCandidate error:", e);
        }
      } else {
        iceQueueRef.current.push(parsed);
      }
    };

    const handleRemoteReaction = (data) => {
      if (data && data.emoji) {
        const id = Date.now() + Math.random();
        const newReaction = { id, emoji: data.emoji, left: Math.floor(Math.random() * 40) + 30 };
        setFloatingReactions((prev) => [...prev, newReaction]);
        setTimeout(() => {
          setFloatingReactions((prev) => prev.filter((r) => r.id !== id));
        }, 2400);
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
    socket.on("call_reaction", handleRemoteReaction);

    return () => {
      socket.off("incoming_call", handleIncomingCall);
      socket.off("call_status_update", handleCallStatusUpdate);
      socket.off("call_accepted", handleCallAccepted);
      socket.off("call_rejected", handleCallRejected);
      socket.off("call_ended", handleCallEnded);
      socket.off("webrtc_offer", handleWebrtcOffer);
      socket.off("webrtc_answer", handleWebrtcAnswer);
      socket.off("webrtc_ice_candidate", handleWebrtcIceCandidate);
      socket.off("call_reaction", handleRemoteReaction);
    };
  }, [socket, currentUser]);

  // Stream re-attachment
  useEffect(() => {
    const stream = localStream || localStreamRef.current;
    if (callState === "active" && stream && localVideoRef.current) {
      if (localVideoRef.current.srcObject !== stream) {
        localVideoRef.current.srcObject = stream;
      }
      localVideoRef.current.play().catch(() => {});
    }
  }, [localStream, callState]);

  useEffect(() => {
    const stream = remoteStream || remoteStreamRef.current;
    if (callState === "active" && stream) {
      if (remoteVideoRef.current && remoteVideoRef.current.srcObject !== stream) {
        remoteVideoRef.current.srcObject = stream;
      }
      if (remoteVideoRef.current) {
        remoteVideoRef.current.play().catch((err) => {
          console.warn("Remote video play error:", err);
        });
      }
      if (remoteAudioRef.current && remoteAudioRef.current.srcObject !== stream) {
        remoteAudioRef.current.srcObject = stream;
      }
      if (remoteAudioRef.current) {
        remoteAudioRef.current.play().catch((err) => {
          console.warn("Remote audio play error:", err);
        });
      }
    }
  }, [remoteStream, callState]);

  const acceptCall = async () => {
    stopAllAudio();
    if (callingTimeoutRef.current) {
      clearTimeout(callingTimeoutRef.current);
      callingTimeoutRef.current = null;
    }
    hasLoggedCallRef.current = false;
    callDurationRef.current = 0;
    callStateRef.current = "active";
    setCallState("active");
    setCallDuration(0);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = setInterval(() => {
      setCallDuration((prev) => {
        callDurationRef.current = prev + 1;
        return prev + 1;
      });
    }, 1000);

    const p = partnerRef.current || partner;
    const currentType = callTypeRef.current || callType;

    if (p?.room && socket) {
      socket.emit("join_room", p.room);
    }

    await setupWebRTC(currentType, false);
    if (p && socket) {
      socket.emit("accept_call", { room: p.room, to: p.id });
    }
  };

  const rejectCall = () => {
    const p = partnerRef.current || partner;
    const currentType = callTypeRef.current || callType;
    logCallHistory(`📞 Missed ${currentType === "video" ? "Video" : "Voice"} Call`);
    if (p && socket) {
      socket.emit("reject_call", { room: p.room, to: p.id });
    }
    cleanupCall();
  };

  const endCall = () => {
    const p = partnerRef.current || partner;
    logCallHistory();
    if (p && socket) {
      socket.emit("end_call", { room: p.room, to: p.id });
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

  const toggleSpeaker = () => {
    setIsSpeakerOn((prev) => {
      const next = !prev;
      if (remoteAudioRef.current) {
        remoteAudioRef.current.volume = next ? 1.0 : 0.25;
      }
      if (remoteVideoRef.current) {
        remoteVideoRef.current.volume = next ? 1.0 : 0.25;
      }
      return next;
    });
  };

  const switchCamera = async () => {
    if (!localStreamRef.current || callType !== "video") return;
    const newFacingMode = facingMode === "user" ? "environment" : "user";
    setFacingMode(newFacingMode);

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newFacingMode },
      });
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
        const sender = peerConnectionRef.current
          .getSenders()
          .find((s) => s.track && s.track.kind === "video");
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
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  if (callState === "idle") return null;

  return (
    <>
      {/* ── TOP FLOATING NOTIFICATION BANNER (When Receiving Call) ── */}
      {callState === "receiving" && showBanner && !isMinimized && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[10000] w-[92%] max-w-md bg-[#16162A]/90 border border-white/15 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] backdrop-blur-2xl p-4 flex items-center justify-between animate-bounce">
          <div
            className="flex items-center gap-3.5 min-w-0 cursor-pointer"
            onClick={() => setShowBanner(false)}
          >
            <div className="relative shrink-0">
              <img
                src={partner?.pic || "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"}
                alt={partner?.name}
                className="w-13 h-13 rounded-full object-cover border-2 border-[#FF4B72] shadow-[0_0_15px_rgba(255,75,114,0.4)]"
              />
              <div className="absolute inset-0 rounded-full bg-[#FF4B72]/30 animate-ping" />
            </div>
            <div className="min-w-0">
              <h4 className="text-base font-extrabold text-white truncate flex items-center gap-1.5">
                {partner?.name}
                <span className="w-4 h-4 rounded-full bg-blue-500 text-white flex items-center justify-center text-[9px] font-black">
                  ✓
                </span>
              </h4>
              <p className="text-xs text-[#FF4B72] font-semibold truncate flex items-center gap-1.5 mt-0.5">
                {callType === "video" ? <FiVideo size={13} /> : <FiPhone size={13} />}
                Incoming {callType === "video" ? "Video" : "Voice"} Call...
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={rejectCall}
              className="w-11 h-11 rounded-full bg-rose-600/90 hover:bg-rose-600 text-white flex items-center justify-center shadow-lg shadow-rose-600/30 transition transform hover:scale-105 active:scale-95"
              aria-label="Decline Call"
            >
              <FiPhoneOff size={19} />
            </button>
            <button
              onClick={acceptCall}
              className="w-11 h-11 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white flex items-center justify-center shadow-lg shadow-emerald-500/40 transition transform hover:scale-105 active:scale-95 animate-pulse"
              aria-label="Accept Call"
            >
              {callType === "video" ? <FiVideo size={19} /> : <FiPhone size={19} />}
            </button>
          </div>
        </div>
      )}

      {/* ── MINIMIZED COMPACT FLOATING PIP WIDGET ── */}
      {isMinimized && (
        <div className="fixed bottom-6 right-6 z-[10000] bg-[#16162A]/90 border border-white/20 backdrop-blur-2xl rounded-3xl p-3 px-4 shadow-[0_20px_50px_rgba(0,0,0,0.85)] flex items-center gap-3.5 animate-slide-up hover:border-[#FF4B72]/50 transition-all select-none">
          <div className="relative cursor-pointer" onClick={() => setIsMinimized(false)}>
            <img
              src={partner?.pic || "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"}
              alt={partner?.name}
              className="w-11 h-11 rounded-full object-cover border-2 border-[#FF4B72] shadow-[0_0_15px_rgba(255,75,114,0.3)]"
            />
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 rounded-full border-2 border-[#16162A] animate-pulse" />
          </div>

          <div className="min-w-[85px] cursor-pointer" onClick={() => setIsMinimized(false)}>
            <h4 className="text-sm font-bold text-white truncate">{partner?.name}</h4>
            <p className="text-xs font-mono font-semibold text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              {formatTimer(callDuration)}
            </p>
          </div>

          <div className="flex items-center gap-1.5 ml-1">
            <button
              onClick={toggleMic}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition active:scale-90 ${isMuted ? "bg-rose-500/25 text-rose-400 border border-rose-500/40" : "bg-white/10 hover:bg-white/20 text-white"}`}
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <FiMicOff size={15} /> : <FiMic size={15} />}
            </button>

            <button
              onClick={() => setIsMinimized(false)}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition active:scale-90"
              title="Expand Call"
            >
              <FiMaximize2 size={15} />
            </button>

            <button
              onClick={endCall}
              className="w-9 h-9 rounded-full bg-gradient-to-tr from-rose-600 to-red-500 hover:from-rose-500 hover:to-red-400 text-white flex items-center justify-center transition shadow-md shadow-rose-600/30 active:scale-90"
              title="End Call"
            >
              <FiPhoneOff size={15} />
            </button>
          </div>
        </div>
      )}

      {/* ── FULL SCREEN LUXURY CALL MODAL ── */}
      {!isMinimized && (
        <div className="fixed inset-0 z-[9999] bg-[#0D0D1A] flex flex-col justify-between overflow-hidden animate-fade-in select-none">
          {/* Hidden Audio Element for Voice Calls (UNMUTED) */}
          <audio
            ref={remoteAudioRef}
            autoPlay
            playsInline
            className="opacity-0 pointer-events-none absolute -top-[9999px]"
          />

          {/* ── ATMOSPHERIC AMBIENT BACKGROUND GLOW ── */}
          <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
            {/* Soft Ambient Blurred Avatar Glow */}
            <img
              src={partner?.pic || "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"}
              alt=""
              className="w-full h-full object-cover scale-150 filter blur-[110px] opacity-25 brightness-50"
            />
            {/* Animated Sunset & Violet Gradient Radial Orbs */}
            <div className="absolute -top-32 -left-32 w-[550px] h-[550px] bg-gradient-to-tr from-[#FF4B72]/20 via-purple-600/15 to-transparent rounded-full blur-[130px] animate-pulse" />
            <div
              className="absolute -bottom-32 -right-32 w-[550px] h-[550px] bg-gradient-to-bl from-cyan-500/15 via-[#FF4B72]/15 to-transparent rounded-full blur-[130px] animate-pulse"
              style={{ animationDelay: "2.5s" }}
            />
            <div className="absolute inset-0 bg-[#0D0D1A]/70 backdrop-blur-2xl" />
          </div>

          {/* ── FLOATING HEARTS & REACTION ANIMATION LAYER ── */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-40">
            {floatingReactions.map((r) => (
              <div
                key={r.id}
                style={{ left: `${r.left}%` }}
                className="absolute bottom-32 text-4xl animate-float-up drop-shadow-[0_10px_20px_rgba(255,75,114,0.5)] transition-all"
              >
                {r.emoji}
              </div>
            ))}
          </div>

          {/* ── TOP HEADER / SECURITY & STATUS BAR ── */}
          <div className="pt-8 sm:pt-10 px-6 flex items-center justify-between z-30 w-full max-w-4xl mx-auto">
            {/* Left: Security Shield */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/10 backdrop-blur-xl shadow-lg">
              <FiShield className="text-emerald-400 text-xs" />
              <span className="text-[11px] font-semibold text-gray-300 tracking-wide">
                End-to-End Encrypted
              </span>
            </div>

            {/* Center: Dynamic Signal Quality */}
            <div className="flex items-center gap-2">
              <span
                className={`text-[11px] font-bold px-3 py-1.5 rounded-full border backdrop-blur-xl transition-all shadow-lg flex items-center gap-1.5 ${
                  netQuality.status === "good"
                    ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                    : netQuality.status === "fair"
                      ? "bg-amber-500/15 border-amber-500/30 text-amber-400"
                      : "bg-rose-500/20 border-rose-500/40 text-rose-400 animate-pulse"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${netQuality.status === "good" ? "bg-emerald-400 animate-ping" : "bg-amber-400"}`}
                />
                {callType === "video" ? "HD Video" : "HD Audio"} • {netQuality.rtt}ms
              </span>
            </div>

            {/* Right: Minimize to Floating PiP */}
            <button
              onClick={() => setIsMinimized(true)}
              className="w-9 h-9 rounded-full bg-white/[0.08] hover:bg-white/[0.18] border border-white/10 text-gray-300 hover:text-white flex items-center justify-center transition active:scale-90 shadow-lg"
              title="Minimize Call"
            >
              <FiMinimize2 size={16} />
            </button>
          </div>

          {/* ── CENTER VIEW: AVATAR / EQUALIZER OR ACTIVE VIDEO ── */}
          <div className="flex-1 relative flex items-center justify-center p-4 z-20">
            {callState === "active" && callType === "video" ? (
              /* ── VIDEO CALL CINEMATIC VIEW ── */
              <div className="relative w-full h-full max-w-4xl rounded-3xl overflow-hidden border border-white/15 bg-black shadow-2xl flex items-center justify-center">
                {/* Remote Video is UNMUTED */}
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />

                {/* Local Video Picture-in-Picture */}
                <div className="absolute top-5 right-5 w-28 h-40 sm:w-36 sm:h-52 rounded-2xl overflow-hidden border-2 border-white/30 shadow-[0_15px_35px_rgba(0,0,0,0.8)] bg-black z-30 group">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  {/* Quick Camera Flip on PiP hover/tap */}
                  <button
                    onClick={switchCamera}
                    className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center opacity-80 hover:opacity-100 transition active:scale-90"
                    title="Switch Camera"
                  >
                    <FiRefreshCw size={13} />
                  </button>
                </div>

                {/* Video Duration Floating Pill */}
                <div className="absolute top-5 left-5 px-3 py-1 rounded-full bg-black/50 border border-white/15 backdrop-blur-md text-white font-mono text-xs font-semibold tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  {formatTimer(callDuration)}
                </div>
              </div>
            ) : (
              /* ── VOICE CALL / CALLING / RECEIVING LUXURY SHOWCASE ── */
              <div className="flex flex-col items-center justify-center text-center max-w-sm w-full mx-auto">
                {/* Live Call Duration Glow Pill */}
                {callState === "active" && (
                  <div className="mb-6 px-4 py-1.5 rounded-full bg-white/[0.08] border border-white/15 backdrop-blur-2xl shadow-[0_0_30px_rgba(255,75,114,0.25)] flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span className="text-xl sm:text-2xl font-mono font-extrabold text-white tracking-widest">
                      {formatTimer(callDuration)}
                    </span>
                  </div>
                )}

                {/* Triple Concentric Soundwave Ripple Rings */}
                <div className="relative mb-7">
                  {callState !== "idle" && (
                    <>
                      <div className="absolute -inset-4 rounded-full bg-gradient-to-tr from-[#FF4B72]/20 to-[#8A2BE2]/20 animate-ping opacity-40" />
                      <div
                        className="absolute -inset-9 rounded-full border border-[#FF4B72]/25 animate-pulse opacity-60"
                        style={{ animationDuration: "2.8s" }}
                      />
                      <div
                        className="absolute -inset-14 rounded-full border border-purple-500/15 animate-pulse opacity-40"
                        style={{ animationDuration: "3.6s" }}
                      />
                    </>
                  )}

                  <div className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-full p-1.5 bg-gradient-to-tr from-[#FF4B72] via-purple-500 to-indigo-500 shadow-[0_0_55px_rgba(255,75,114,0.35)]">
                    <img
                      src={
                        partner?.pic || "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
                      }
                      alt={partner?.name}
                      className="w-full h-full rounded-full object-cover border-4 border-[#0D0D1A]"
                    />
                  </div>
                </div>

                {/* Companion Name & Verified Badge */}
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-1.5 tracking-wide flex items-center justify-center gap-2">
                  {partner?.name}
                  <span className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[11px] font-black shadow-md shadow-blue-500/30">
                    <FiCheck />
                  </span>
                </h2>

                {/* Status Subtitle */}
                <p className="text-sm font-semibold text-gray-300 flex items-center justify-center gap-2">
                  {callState === "calling" && (
                    <span className="text-rose-400 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
                      {statusText}
                    </span>
                  )}
                  {callState === "receiving" && (
                    <span className="text-emerald-400 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      Incoming {callType === "video" ? "Video" : "Voice"} Call...
                    </span>
                  )}
                  {callState === "active" && (
                    <span className="text-gray-400">Connected • High Fidelity</span>
                  )}
                </p>

                {/* Animated Voice Equalizer Waveform Bars (Active Call) */}
                {callState === "active" && !isMuted && (
                  <div className="flex items-center justify-center gap-1.5 mt-5 h-8">
                    {[40, 75, 100, 60, 90, 50, 80].map((h, i) => (
                      <span
                        key={i}
                        className="w-1 bg-gradient-to-t from-[#FF4B72] to-[#8A2BE2] rounded-full animate-pulse shadow-[0_0_8px_rgba(255,75,114,0.6)]"
                        style={{
                          height: `${h}%`,
                          animationDuration: `${0.7 + (i % 3) * 0.25}s`,
                          animationDelay: `${i * 0.08}s`,
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── QUICK FLOATING REACTION POPUP ── */}
          {showReactionsMenu && (
            <div className="z-40 mx-auto mb-3 bg-[#16162A]/95 border border-white/20 backdrop-blur-2xl px-4 py-2.5 rounded-full shadow-[0_15px_40px_rgba(0,0,0,0.8)] flex items-center gap-3 animate-slide-up">
              {["❤️", "🔥", "💋", "✨", "😍", "👏"].map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => sendReaction(emoji)}
                  className="text-2xl hover:scale-130 active:scale-95 transition-transform"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          {/* ── LUXURY GLASS DOCK CONTROLS (BOTTOM) ── */}
          <div className="pb-10 sm:pb-12 pt-4 px-6 flex items-center justify-center z-30">
            {callState === "receiving" ? (
              /* Receiving Call Decision Buttons */
              <div className="flex items-center gap-12 sm:gap-16">
                <div className="flex flex-col items-center gap-2">
                  <button
                    onClick={rejectCall}
                    className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-gradient-to-tr from-rose-600 to-red-500 hover:from-rose-500 hover:to-red-400 text-white flex items-center justify-center shadow-[0_10px_35px_rgba(244,63,94,0.45)] transition transform hover:scale-110 active:scale-95"
                    aria-label="Decline Call"
                  >
                    <FiPhoneOff size={26} />
                  </button>
                  <span className="text-xs text-gray-400 font-semibold tracking-wide">Decline</span>
                </div>

                <div className="flex flex-col items-center gap-2">
                  <button
                    onClick={acceptCall}
                    className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-white flex items-center justify-center shadow-[0_10px_35px_rgba(16,185,129,0.5)] transition transform hover:scale-110 active:scale-95 animate-bounce"
                    aria-label="Accept Call"
                  >
                    {callType === "video" ? <FiVideo size={26} /> : <FiPhone size={26} />}
                  </button>
                  <span className="text-xs text-emerald-400 font-bold tracking-wide">Accept</span>
                </div>
              </div>
            ) : (
              /* Active / Calling Dock Controls */
              <div className="flex items-center gap-3 sm:gap-5 bg-white/[0.07] border border-white/15 px-6 sm:px-8 py-3.5 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.7)] backdrop-blur-2xl">
                {/* 1. Mute Mic */}
                <div className="flex flex-col items-center gap-1.5">
                  <button
                    onClick={toggleMic}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition active:scale-90 shadow-md ${
                      isMuted
                        ? "bg-rose-500/25 border border-rose-500/50 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.3)]"
                        : "bg-white/10 hover:bg-white/20 border border-white/10 text-white"
                    }`}
                    aria-label={isMuted ? "Unmute" : "Mute"}
                  >
                    {isMuted ? <FiMicOff size={20} /> : <FiMic size={20} />}
                  </button>
                  <span className="text-[10px] text-gray-400 font-medium">
                    {isMuted ? "Unmute" : "Mute"}
                  </span>
                </div>

                {/* 2. Speaker Volume Boost */}
                <div className="flex flex-col items-center gap-1.5">
                  <button
                    onClick={toggleSpeaker}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition active:scale-90 shadow-md ${
                      !isSpeakerOn
                        ? "bg-white/5 border border-white/10 text-gray-400"
                        : "bg-white/10 hover:bg-white/20 border border-white/10 text-white"
                    }`}
                    aria-label="Toggle Speaker"
                  >
                    {isSpeakerOn ? <FiVolume2 size={20} /> : <FiVolumeX size={20} />}
                  </button>
                  <span className="text-[10px] text-gray-400 font-medium">Speaker</span>
                </div>

                {/* 3. Camera Toggle (Video Call) */}
                {callType === "video" && (
                  <>
                    <div className="flex flex-col items-center gap-1.5">
                      <button
                        onClick={toggleVideo}
                        className={`w-12 h-12 rounded-full flex items-center justify-center transition active:scale-90 shadow-md ${
                          isVideoOff
                            ? "bg-rose-500/25 border border-rose-500/50 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.3)]"
                            : "bg-white/10 hover:bg-white/20 border border-white/10 text-white"
                        }`}
                        aria-label="Toggle Camera"
                      >
                        {isVideoOff ? <FiVideoOff size={20} /> : <FiVideo size={20} />}
                      </button>
                      <span className="text-[10px] text-gray-400 font-medium">Camera</span>
                    </div>

                    <div className="flex flex-col items-center gap-1.5">
                      <button
                        onClick={switchCamera}
                        className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 text-white flex items-center justify-center transition active:scale-90 shadow-md"
                        aria-label="Flip Camera"
                      >
                        <FiRefreshCw size={19} />
                      </button>
                      <span className="text-[10px] text-gray-400 font-medium">Flip</span>
                    </div>
                  </>
                )}

                {/* 4. Quick Heart Reactions */}
                <div className="flex flex-col items-center gap-1.5">
                  <button
                    onClick={() => setShowReactionsMenu(!showReactionsMenu)}
                    className="w-12 h-12 rounded-full bg-gradient-to-tr from-pink-500/20 to-purple-500/20 hover:from-pink-500/30 hover:to-purple-500/30 border border-pink-500/30 text-[#FF4B72] flex items-center justify-center transition active:scale-90 shadow-[0_0_20px_rgba(255,75,114,0.25)]"
                    aria-label="Send Reaction"
                  >
                    <FiHeart size={20} className="fill-current" />
                  </button>
                  <span className="text-[10px] text-gray-400 font-medium">React</span>
                </div>

                {/* 5. End Call Button */}
                <div className="flex flex-col items-center gap-1.5 ml-2">
                  <button
                    onClick={endCall}
                    className="w-14 h-14 rounded-full bg-gradient-to-tr from-rose-600 to-red-500 hover:from-rose-500 hover:to-red-400 text-white flex items-center justify-center shadow-[0_0_35px_rgba(244,63,94,0.6)] transition transform hover:scale-105 active:scale-90"
                    aria-label="End Call"
                  >
                    <FiPhoneOff size={22} />
                  </button>
                  <span className="text-[10px] text-rose-400 font-bold tracking-wide">End</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default CallOverlay;
