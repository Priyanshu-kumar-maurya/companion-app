import React, { useState, useRef, useEffect, useCallback } from "react";
import { PAGES } from "../../App";
import { io } from "socket.io-client";
import { FiArrowLeft, FiPhone, FiVideo, FiPaperclip, FiSend, FiMic, FiEdit2, FiTrash2, FiLock, FiX, FiCheck, FiMoreVertical, FiPhoneCall, FiPhoneOff, FiPhoneMissed, FiVideoOff, FiMicOff } from "react-icons/fi";

const socket = io("https://rentgf-and-bf.onrender.com", {
    autoConnect: false,
    transports: ['websocket']
});

function ChatPage({ girl, currentUser, setPage, setSelectedGirl }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [uploadingImage, setUploadingImage] = useState(false);
    const bottomRef = useRef(null);

    const [onlineUsers, setOnlineUsers] = useState([]);
    const [editingMsgId, setEditingMsgId] = useState(null);
    const [hoveredMsgId, setHoveredMsgId] = useState(null);
    const [messageToDelete, setMessageToDelete] = useState(null);
    const [lightboxImg, setLightboxImg] = useState(null); // fullscreen image viewer

    // --- CALLING & WEBRTC STATES ---
    const [callStatus, setCallStatus] = useState("idle"); 
    const [callType, setCallType] = useState(null); 
    const [facingMode, setFacingMode] = useState("user"); 
    
    // Naye States Timer aur Mute ke liye
    const [callDuration, setCallDuration] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    
    const callStatusRef = useRef("idle");
    const callTypeRef = useRef(null);
    const isCallerRef = useRef(false);
    const callStartTimeRef = useRef(null);
    
    const peerConnectionRef = useRef(null);
    const localStreamRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const localVideoRef = useRef(null);

    // 🚨 NAYA: AUDIO (RINGTONE) REFS 🚨
    const incomingRingRef = useRef(typeof Audio !== "undefined" ? new Audio('/ringtone.mp3') : null);
    const outgoingRingRef = useRef(typeof Audio !== "undefined" ? new Audio('/calling.mp3') : null);

    const roomId = currentUser?.id < girl?.id
        ? `${currentUser?.id}_${girl?.id}`
        : `${girl?.id}_${currentUser?.id}`;

    const updateCallStatus = (status) => {
        setCallStatus(status);
        callStatusRef.current = status;
    };

    // --- 🚨 RINGTONE LOGIC 🚨 ---
    useEffect(() => {
        if (incomingRingRef.current && outgoingRingRef.current) {
            incomingRingRef.current.loop = true;
            outgoingRingRef.current.loop = true;

            // Jab tum call mila rahe ho
            if (callStatus === 'calling') {
                outgoingRingRef.current.play().catch(e => console.log("Autoplay blocked:", e));
            } else {
                outgoingRingRef.current.pause();
                outgoingRingRef.current.currentTime = 0;
            }

            // Jab kisi ki call aa rahi ho
            if (callStatus === 'receiving') {
                incomingRingRef.current.play().catch(e => console.log("Autoplay blocked:", e));
            } else {
                incomingRingRef.current.pause();
                incomingRingRef.current.currentTime = 0;
            }
        }
    }, [callStatus]);

    // --- 1. CALL TIMER LOGIC ---
    useEffect(() => {
        let interval;
        if (callStatus === 'active') {
            interval = setInterval(() => {
                if (callStartTimeRef.current) {
                    setCallDuration(Math.floor((Date.now() - callStartTimeRef.current) / 1000));
                }
            }, 1000);
        } else {
            setCallDuration(0);
        }
        return () => clearInterval(interval);
    }, [callStatus]);

    const formatDuration = (seconds) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    // --- 2. CALL HISTORY LOGGER ---
    const logCallToChat = useCallback((messageText) => {
        if (!currentUser || !girl) return;
        const messageData = {
            sender_id: currentUser.id,
            receiver_id: girl.id,
            message: messageText,
            image_url: null,
            room: roomId
        };
        socket.emit("send_message", messageData);
    }, [currentUser, girl, roomId]);

    // --- 3. CLEANUP & LOG FUNCTION (HARDWARE LIGHT OFF LOGIC) ---
    const cleanupCall = useCallback(() => {
        if (isCallerRef.current && callTypeRef.current) {
            if (callStatusRef.current === 'active' && callStartTimeRef.current) {
                const durationMs = Date.now() - callStartTimeRef.current;
                const totalSeconds = Math.floor(durationMs / 1000);
                const mins = Math.floor(totalSeconds / 60);
                const secs = (totalSeconds % 60).toString().padStart(2, '0');
                logCallToChat(`✅ ${callTypeRef.current === 'video' ? 'Video' : 'Audio'} Call - ${mins}m ${secs}s`);
            } else if (callStatusRef.current === 'calling') {
                logCallToChat(`❌ Missed ${callTypeRef.current === 'video' ? 'Video' : 'Audio'} Call`);
            }
        }

        updateCallStatus("idle");
        setFacingMode("user");
        setIsMuted(false);
        setIsVideoOff(false);
        isCallerRef.current = false;
        callStartTimeRef.current = null;
        callTypeRef.current = null;

        // Force stop all tracks to turn off Camera/Mic Light instantly
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop());
            localStreamRef.current = null;
        }

        // Clear HTML video element sources to release hardware memory
        if (localVideoRef.current) {
            if (localVideoRef.current.srcObject) {
                localVideoRef.current.srcObject.getTracks().forEach(t => t.stop());
            }
            localVideoRef.current.srcObject = null;
        }
        if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = null;
        }

        // Close WebRTC Connection
        if (peerConnectionRef.current) {
            peerConnectionRef.current.close();
            peerConnectionRef.current = null;
        }
    }, [logCallToChat]);

    // --- 4. WEBRTC SETUP ---
    const setupWebRTC = useCallback(async (type, isCaller) => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: type === 'video' ? { facingMode: "user" } : false
            });
            localStreamRef.current = stream;

            if (type === 'video' && localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
            }

            const pc = new RTCPeerConnection({
                iceServers: [{ urls: "stun:stun.l.google.com:19302" }] 
            });
            peerConnectionRef.current = pc;

            stream.getTracks().forEach(track => pc.addTrack(track, stream));

            pc.ontrack = (event) => {
                if (remoteVideoRef.current) {
                    remoteVideoRef.current.srcObject = event.streams[0];
                }
            };

            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    socket.emit("webrtc_ice_candidate", { room: roomId, candidate: event.candidate });
                }
            };

            if (isCaller) {
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                socket.emit("webrtc_offer", { room: roomId, offer });
            }

        } catch (err) {
            console.error("Camera/Mic access denied:", err);
            alert("Camera or Microphone permission denied! Cannot start call.");
            cleanupCall();
        }
    }, [roomId, cleanupCall]);

    useEffect(() => {
        if (!currentUser || !girl) return;

        const cacheKey = `chatCache_${currentUser.id}_${girl.id}`;
        const cachedMessages = sessionStorage.getItem(cacheKey);

        if (cachedMessages) {
            setMessages(JSON.parse(cachedMessages));
        }

        const fetchOldMessages = async () => {
            try {
                const response = await fetch(`https://rentgf-and-bf.onrender.com/api/messages/${currentUser.id}/${girl.id}`);
                if (response.ok) {
                    const dbMessages = await response.json();
                    const formattedMessages = dbMessages.map(msg => {
                        const date = new Date(msg.created_at);
                        return {
                            id: msg.id, text: msg.message, imageUrl: msg.image_url,
                            sent: String(msg.sender_id) === String(currentUser.id),
                            time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                            timestamp: date.getTime(), is_read: msg.is_read
                        };
                    });
                    setMessages(formattedMessages);
                    sessionStorage.setItem(cacheKey, JSON.stringify(formattedMessages));
                }
            } catch (error) { }
        };
        fetchOldMessages();
    }, [currentUser, girl]);
    useEffect(() => {
        socket.connect();
        socket.emit("join_room", roomId);
        socket.emit("user_connected", currentUser.id);
        socket.emit("mark_messages_read", { sender_id: girl.id, receiver_id: currentUser.id, room: roomId });

        const handleReceiveMessage = (data) => {
            setMessages((prev) => {
                if (prev.find(m => String(m.id) === String(data.id))) return prev;
                const date = data.created_at ? new Date(data.created_at) : new Date();
                return [...prev, {
                    id: data.id, text: data.text || data.message, imageUrl: data.image_url,
                    sent: String(data.sender_id) === String(currentUser.id),
                    time: date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                    timestamp: date.getTime(), is_read: data.is_read || false
                }];
            });
            if (String(data.sender_id) === String(girl.id)) {
                socket.emit("mark_messages_read", { sender_id: girl.id, receiver_id: currentUser.id, room: roomId });
            }
        };

        const handleMessagesReadUpdate = (data) => {
            if (String(data.receiver_id) === String(girl.id) && String(data.sender_id) === String(currentUser.id)) {
                setMessages(prev => prev.map(msg => msg.sent ? { ...msg, is_read: true } : msg));
            }
        };

        const handleIncomingCall = (data) => {
            setCallType(data.type);
            callTypeRef.current = data.type;
            isCallerRef.current = false;
            callStartTimeRef.current = null;
            updateCallStatus("receiving");
        };

        const handleCallAccepted = async () => {
            updateCallStatus("active");
            callStartTimeRef.current = Date.now();
            await setupWebRTC(callTypeRef.current, true); 
        };

        const handleCallRejected = () => {
            cleanupCall();
        };

        const handleCallEnded = () => {
            cleanupCall();
        };

        const handleWebrtcOffer = async (offer) => {
            try {
                if (peerConnectionRef.current && peerConnectionRef.current.signalingState !== "stable") return; 
                
                updateCallStatus("active");
                callStartTimeRef.current = Date.now();
                await setupWebRTC(callTypeRef.current, false);
                
                if (peerConnectionRef.current) {
                    await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(offer));
                    const answer = await peerConnectionRef.current.createAnswer();
                    await peerConnectionRef.current.setLocalDescription(answer);
                    socket.emit("webrtc_answer", { room: roomId, answer });
                }
            } catch (err) { console.error("WebRTC Offer Error:", err); }
        };

        const handleWebrtcAnswer = async (answer) => {
            try {
                if (peerConnectionRef.current && peerConnectionRef.current.signalingState === "have-local-offer") {
                    await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
                }
            } catch (err) { console.error("WebRTC Answer Error:", err); }
        };

        const handleWebrtcIceCandidate = async (candidate) => {
            try {
                if (peerConnectionRef.current && candidate) {
                    await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
                }
            } catch (err) { console.error("Ice Candidate Error:", err); }
        };

        socket.on("receive_message", handleReceiveMessage);
        socket.on("update_online_users", (usersArray) => setOnlineUsers(usersArray));
        socket.on("message_edited", (data) => setMessages(prev => prev.map(msg => String(msg.id) === String(data.messageId) ? { ...msg, text: data.newText } : msg)));
        socket.on("message_deleted", (deletedId) => setMessages(prev => prev.filter(msg => String(msg.id) !== String(deletedId))));
        socket.on("messages_read_update", handleMessagesReadUpdate);

        socket.on("incoming_call", handleIncomingCall);
        socket.on("call_accepted", handleCallAccepted);
        socket.on("call_rejected", handleCallRejected);
        socket.on("call_ended", handleCallEnded);
        socket.on("webrtc_offer", handleWebrtcOffer);
        socket.on("webrtc_answer", handleWebrtcAnswer);
        socket.on("webrtc_ice_candidate", handleWebrtcIceCandidate);

        return () => {
            cleanupCall();
            socket.off("receive_message", handleReceiveMessage);
            socket.off("update_online_users");
            socket.off("message_edited");
            socket.off("message_deleted");
            socket.off("messages_read_update");
            socket.off("incoming_call");
            socket.off("call_accepted");
            socket.off("call_rejected");
            socket.off("call_ended");
            socket.off("webrtc_offer");
            socket.off("webrtc_answer");
            socket.off("webrtc_ice_candidate");
            socket.disconnect();
        };
    }, [roomId, currentUser.id, girl.id, setupWebRTC, cleanupCall]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // --- 7. CALL ACTIONS ---
    const startCall = (type) => {
        setCallType(type);
        callTypeRef.current = type;
        isCallerRef.current = true;
        callStartTimeRef.current = null;
        updateCallStatus("calling");
        socket.emit("initiate_call", { room: roomId, receiver_id: girl.id, type: type });
    };

    const acceptCall = () => {
        socket.emit("accept_call", { room: roomId, to: girl.id });
    };

    const rejectCall = () => {
        socket.emit("reject_call", { room: roomId, to: girl.id });
        cleanupCall();
    };

    const endCall = () => {
        socket.emit("end_call", { room: roomId, to: girl.id });
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
                oldVideoTrack.stop();
                localStreamRef.current.removeTrack(oldVideoTrack);
            }
            localStreamRef.current.addTrack(newVideoTrack);
            if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;

            if (peerConnectionRef.current) {
                const videoSender = peerConnectionRef.current.getSenders().find(s => s.track && s.track.kind === 'video');
                if (videoSender) videoSender.replaceTrack(newVideoTrack);
            }
        } catch (err) {
            console.error("Error switching camera:", err);
            setFacingMode(facingMode);
        }
    };

    // --- 8. MESSAGING FUNCTIONS ---
    const sendMessage = (imageLink = null) => {
        if (!input.trim() && !imageLink) return;
        if (!currentUser) return;

        if (editingMsgId) {
            socket.emit("edit_message", { messageId: editingMsgId, newText: input, room: roomId, sender_id: currentUser.id });
            setMessages(prev => prev.map(msg => String(msg.id) === String(editingMsgId) ? { ...msg, text: input } : msg));
            setEditingMsgId(null);
            setInput("");
            return;
        }

        socket.emit("send_message", { sender_id: currentUser.id, receiver_id: girl.id, message: input, image_url: imageLink, room: roomId });
        setInput("");
    };

    const handleImageAttachment = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploadingImage(true);
        const formData = new FormData();
        formData.append("image", file);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch("https://rentgf-and-bf.onrender.com/api/chat-image", {
                method: "POST",
                body: formData,
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                sendMessage(data.imageUrl);
            }
        } catch (error) { } finally {
            setUploadingImage(false);
            e.target.value = "";
        }
    };

    const handleDeleteForMe = () => {
        if (!messageToDelete) return;
        socket.emit("delete_for_me", { messageId: messageToDelete.id, userId: currentUser.id });
        setMessages(prev => prev.filter(msg => String(msg.id) !== String(messageToDelete.id)));
        setMessageToDelete(null);
    };

    const handleDeleteForEveryone = () => {
        if (!messageToDelete) return;
        socket.emit("delete_message", { messageId: messageToDelete.id, room: roomId, sender_id: currentUser.id });
        setMessageToDelete(null);
    };

    const editMessage = (id, text) => { setEditingMsgId(id); setInput(text); };
    const handleViewProfile = () => { if (setSelectedGirl) setSelectedGirl(girl); setPage(PAGES.DETAILS); };

    const isOnline = onlineUsers.includes(girl.id) || onlineUsers.includes(String(girl.id));
    const formatMessageDate = (timestamp) => {
        const date = new Date(timestamp);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        if (date.toDateString() === today.toDateString()) return "Today";
        else if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
        else return date.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
    };

    return (
        <div className="fixed inset-0 flex flex-col z-50" style={{ background: '#0D0D1A' }}>

            {/* ─── HEADER ─── */}
            <div className="flex items-center gap-3 px-3 py-2.5 shrink-0 border-b" style={{ background: '#16162A', borderColor: 'rgba(255,255,255,0.08)' }}>
                <button
                    onClick={() => setPage(currentUser.role === 'girl' ? PAGES.GIRL_DASHBOARD : PAGES.BOY_DASHBOARD)}
                    className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-white transition rounded-full hover:bg-white/10"
                >
                    <FiArrowLeft size={22} />
                </button>

                <div onClick={handleViewProfile} className="flex items-center gap-3 flex-1 cursor-pointer">
                    {girl.profile_pic ? (
                        <img src={girl.profile_pic} alt={girl.name} className="w-10 h-10 rounded-full object-cover flex-shrink-0 border border-white/10" />
                    ) : (
                        <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-pink-500/30 to-purple-500/30 border border-white/10">
                            <span className="text-white font-bold text-base">{girl.name?.[0]?.toUpperCase()}</span>
                        </div>
                    )}
                    <div>
                        <div className="text-sm font-semibold text-white">{girl.name}</div>
                        <div className="text-xs mt-0.5" style={{ color: isOnline ? '#4ade80' : '#6b7280' }}>
                            {isOnline ? 'online' : 'last seen recently'}
                        </div>
                    </div>
                </div>

                <div className="flex gap-1">
                    <button onClick={() => startCall('video')} className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-pink-400 transition rounded-full hover:bg-white/10">
                        <FiVideo size={20} />
                    </button>
                    <button onClick={() => startCall('audio')} className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-pink-400 transition rounded-full hover:bg-white/10">
                        <FiPhone size={20} />
                    </button>
                    <button className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-white transition rounded-full hover:bg-white/10">
                        <FiMoreVertical size={20} />
                    </button>
                </div>
            </div>

            {/* ─── Encryption notice ─── */}
            <div className="flex items-center justify-center gap-1.5 py-1.5 text-[11px] shrink-0" style={{ color: '#6b7280' }}>
                <FiLock size={10} />
                <span>Messages are end-to-end encrypted</span>
            </div>

            {/* ─── CHAT MESSAGES ─── */}
            <div className="flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-1" style={{ background: '#0D0D1A' }}>
                {messages.map((msg, index) => {
                    const isWithinTimeLimit = Date.now() - msg.timestamp < 15 * 60 * 1000;
                    const prevMsg = index > 0 ? messages[index - 1] : null;
                    const showDateDivider = !prevMsg || new Date(msg.timestamp).toDateString() !== new Date(prevMsg.timestamp).toDateString();
                    const isMissedCall = msg.text && (msg.text.includes('Missed Video Call') || msg.text.includes('Missed Audio Call'));
                    const isCompletedCall = msg.text && msg.text.includes('Call -');
                    const isCallLog = isMissedCall || isCompletedCall;

                    return (
                        <React.Fragment key={msg.id}>
                            {showDateDivider && (
                                <div className="flex justify-center my-3">
                                    <span className="text-[11px] px-3 py-1 rounded-md font-medium" style={{ background: '#13132A', color: '#6b7280' }}>
                                        {formatMessageDate(msg.timestamp)}
                                    </span>
                                </div>
                            )}

                            {isCallLog ? (
                                <div className="flex justify-center my-1">
                                    <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs border border-white/5" style={{ background: '#16162A', color: '#6b7280' }}>
                                        <FiPhoneMissed size={14} className={isMissedCall ? 'text-red-400' : 'text-green-400'} />
                                        <span style={{ color: isMissedCall ? '#f87171' : '#4ade80' }}>{msg.text.replace('❌ ', '').replace('✅ ', '')}</span>
                                        <span className="ml-1 text-[10px]" style={{ color: '#6b7280' }}>{msg.time}</span>
                                    </div>
                                </div>
                            ) : (
                                <div
                                    className={`flex ${msg.sent ? 'justify-end' : 'justify-start'} group mb-0.5`}
                                    onMouseEnter={() => setHoveredMsgId(msg.id)}
                                    onMouseLeave={() => setHoveredMsgId(null)}
                                >
                                    <div className="relative max-w-[75%] sm:max-w-[60%]">
                                        {/* Hover action buttons */}
                                        {hoveredMsgId === msg.id && (
                                            <div className={`absolute top-1 ${msg.sent ? 'left-0 -translate-x-full pr-2' : 'right-0 translate-x-full pl-2'} flex gap-1 z-10`}>
                                                <div className="flex gap-1 rounded-lg px-1.5 py-1 shadow-lg border border-white/10" style={{ background: '#16162A' }}>
                                                    {msg.sent && isWithinTimeLimit && !msg.imageUrl && (
                                                        <button onClick={() => editMessage(msg.id, msg.text)} className="p-1 text-gray-500 hover:text-pink-400 transition">
                                                            <FiEdit2 size={13} />
                                                        </button>
                                                    )}
                                                    <button onClick={() => setMessageToDelete(msg)} className="p-1 text-gray-500 hover:text-red-400 transition">
                                                        <FiTrash2 size={13} />
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* Message bubble */}
                                        <div
                                            className="relative px-3 py-1.5 text-sm leading-relaxed shadow-sm"
                                            style={{
                                                background: msg.sent ? '#2d1457' : '#16162A',
                                                color: '#f1f5f9',
                                                borderRadius: msg.sent ? '12px 12px 3px 12px' : '12px 12px 12px 3px',
                                                border: msg.sent ? '1px solid rgba(236,72,153,0.15)' : '1px solid rgba(255,255,255,0.06)'
                                            }}
                                        >
                                            {msg.imageUrl && (
                                                <img
                                                    src={msg.imageUrl}
                                                    alt="attachment"
                                                    className="w-full max-w-[220px] rounded-md mb-1 object-contain cursor-pointer active:scale-95 transition-transform"
                                                    onClick={() => setLightboxImg(msg.imageUrl)}
                                                />
                                            )}
                                            {msg.text && <span className="break-words">{msg.text}</span>}

                                            {/* Timestamp + ticks */}
                                            <div className="flex items-center justify-end gap-1 mt-0.5 -mb-0.5 ml-3">
                                                <span className="text-[10px] select-none" style={{ color: '#6b7280' }}>{msg.time}</span>
                                                {msg.sent && (
                                                    <span className="text-[11px]" style={{ color: msg.is_read ? '#a78bfa' : '#6b7280' }}>
                                                        {msg.is_read ? '✓✓' : '✓'}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </React.Fragment>
                    );
                })}

                {uploadingImage && (
                    <div className="flex justify-end mb-1">
                        <div className="px-3 py-2 rounded-lg text-xs flex items-center gap-2 animate-pulse" style={{ background: '#2d1457', color: '#f1f5f9' }}>
                            <div className="w-3 h-3 border-2 border-pink-400/40 border-t-pink-400 rounded-full animate-spin" />
                            Sending...
                        </div>
                    </div>
                )}
                <div ref={bottomRef} />
            </div>

            {/* ─── Editing banner ─── */}
            {editingMsgId && (
                <div className="flex justify-between items-center px-4 py-2 text-xs border-t shrink-0" style={{ background: '#16162A', borderColor: '#ec4899', color: '#ec4899' }}>
                    <div className="flex items-center gap-2">
                        <FiEdit2 size={13} />
                        <span>Editing message</span>
                    </div>
                    <button onClick={() => { setEditingMsgId(null); setInput(''); }} className="hover:text-white transition">
                        <FiX size={15} />
                    </button>
                </div>
            )}

            {/* ─── INPUT BAR ─── */}
            <div className="flex items-end gap-2 px-3 py-2 shrink-0 border-t" style={{ background: '#16162A', borderColor: 'rgba(255,255,255,0.08)' }}>
                <label
                    className="w-10 h-10 flex items-center justify-center rounded-full cursor-pointer transition flex-shrink-0 text-gray-500 hover:text-pink-400 hover:bg-white/10"
                    title="Attach Image"
                >
                    <FiPaperclip size={20} />
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageAttachment} disabled={uploadingImage || !!editingMsgId} />
                </label>

                <div className="flex-1 flex items-end rounded-2xl px-4 py-2.5 border border-white/10" style={{ background: '#0D0D1A', minHeight: 44 }}>
                    <textarea
                        className="flex-1 bg-transparent text-sm outline-none resize-none placeholder-gray-600"
                        style={{ maxHeight: 120, color: '#f1f5f9' }}
                        placeholder="Message..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                        onFocus={(e) => setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth' }), 100)}
                        rows={1}
                    />
                </div>

                <button
                    onClick={() => sendMessage(null)}
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition hover:scale-110 active:scale-95 bg-gradient-to-br from-pink-500 to-purple-600 shadow-lg shadow-pink-500/20"
                >
                    {input.trim() ? <FiSend size={17} className="text-white" /> : <FiMic size={17} className="text-white" />}
                </button>
            </div>

            {/* ─── FULLSCREEN IMAGE LIGHTBOX ─── */}
            {lightboxImg && (
                <div
                    className="fixed inset-0 z-[150] bg-black/95 flex items-center justify-center p-4"
                    onClick={() => setLightboxImg(null)}
                >
                    <button
                        onClick={() => setLightboxImg(null)}
                        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition z-10"
                    >
                        <FiX size={20} />
                    </button>
                    <img
                        src={lightboxImg}
                        alt="Full view"
                        className="max-w-full max-h-full object-contain rounded-lg select-none"
                        onClick={(e) => e.stopPropagation()}
                        style={{ maxWidth: '95vw', maxHeight: '90vh' }}
                    />
                    <a
                        href={lightboxImg}
                        download
                        onClick={(e) => e.stopPropagation()}
                        className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-5 py-2 rounded-full text-xs font-semibold text-white bg-white/10 border border-white/20 hover:bg-white/20 transition"
                    >
                        <FiPaperclip size={13} /> Save Image
                    </a>
                </div>
            )}

            {/* ─── DELETE MODAL ─── */}
            {messageToDelete && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
                    <div className="w-full max-w-xs overflow-hidden shadow-2xl border border-white/10" style={{ background: '#16162A', borderRadius: 16 }}>
                        <div className="px-6 py-5">
                            <h3 className="text-base font-semibold mb-1 text-white">Delete message?</h3>
                            <p className="text-xs mb-5 text-gray-500">This action cannot be undone.</p>
                            <div className="flex flex-col gap-2">
                                {messageToDelete.sent && (Date.now() - messageToDelete.timestamp < 15 * 60 * 1000) && (
                                    <button onClick={handleDeleteForEveryone} className="py-2.5 rounded-lg font-semibold text-sm transition bg-gradient-to-r from-pink-500 to-purple-600 text-white hover:opacity-90">Delete for Everyone</button>
                                )}
                                <button onClick={handleDeleteForMe} className="py-2.5 rounded-lg font-semibold text-sm transition hover:bg-white/10 text-gray-400 border border-white/10">Delete for Me</button>
                                <button onClick={() => setMessageToDelete(null)} className="py-2.5 rounded-lg font-semibold text-sm transition hover:bg-white/10 text-gray-500">Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── CALL UI ─── */}
            {callStatus !== 'idle' && (
                <div className={`fixed inset-0 z-[200] flex flex-col overflow-hidden ${callStatus === 'active' && callType === 'video' ? 'bg-black' : 'bg-[#0D0D1A]'}`}>

                    {/* ── Audio / Ringing / Active-Audio UI ── */}
                    {!(callStatus === 'active' && callType === 'video') && (
                        <>
                            {/* Blurred background */}
                            <div className="absolute inset-0 z-0 pointer-events-none">
                                <img src={girl.profile_pic || 'https://i.pinimg.com/736x/89/90/48/899048ab0cc455154006fdb9676964b3.jpg'} alt="bg" className="w-full h-full object-cover blur-3xl opacity-10 scale-110" />
                                <div className="absolute inset-0" style={{ background: 'rgba(13,13,26,0.88)' }} />
                            </div>

                            {/* Center info */}
                            <div className="z-10 flex flex-col items-center justify-center flex-1 px-6 pb-32">
                                <div className="relative mb-5">
                                    <div className={`absolute inset-0 rounded-full animate-ping opacity-20 scale-125 ${callStatus === 'active' ? 'bg-pink-500' : 'bg-purple-500'}`} />
                                    <img
                                        src={girl.profile_pic || 'https://i.pinimg.com/736x/89/90/48/899048ab0cc455154006fdb9676964b3.jpg'}
                                        alt={girl.name}
                                        className="w-28 h-28 sm:w-36 sm:h-36 rounded-full object-cover border-4 shadow-2xl relative z-10 border-pink-500/30"
                                    />
                                </div>
                                <h2 className="text-xl sm:text-2xl font-bold text-white mb-2 text-center">{girl.name}</h2>
                                <p className="text-sm font-medium text-gray-500 text-center">
                                    {callStatus === 'calling' && 'Calling...'}
                                    {callStatus === 'receiving' && `Incoming ${callType === 'video' ? 'video' : 'voice'} call`}
                                    {callStatus === 'active' && <span className="font-mono text-pink-400 text-base">{formatDuration(callDuration)}</span>}
                                </p>
                            </div>

                            <video ref={remoteVideoRef} autoPlay playsInline className="hidden" />
                            <video ref={localVideoRef} autoPlay playsInline muted className="hidden" />
                        </>
                    )}

                    {/* ── Active Video Call ── */}
                    {callStatus === 'active' && callType === 'video' && (
                        <>
                            <video ref={remoteVideoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover bg-black z-0" />

                            {/* Top bar */}
                            <div className="absolute top-0 left-0 right-0 px-4 sm:px-6 pt-10 sm:pt-10 pb-6 bg-gradient-to-b from-black/70 to-transparent flex justify-between items-start z-20">
                                <div className="text-white">
                                    <div className="font-bold text-base sm:text-lg">{girl.name}</div>
                                    <div className="text-xs font-mono text-pink-400 mt-0.5">{formatDuration(callDuration)}</div>
                                </div>
                                <button
                                    onClick={switchCamera}
                                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition bg-black/50 text-white text-base"
                                >🔄</button>
                            </div>

                            {/* Local video PIP */}
                            <video
                                ref={localVideoRef}
                                autoPlay playsInline muted
                                className="absolute bottom-32 sm:bottom-36 right-3 sm:right-5 w-20 h-28 sm:w-28 sm:h-40 rounded-xl sm:rounded-2xl bg-gray-900 object-cover shadow-2xl border-2 border-pink-500/30 z-10"
                            />
                        </>
                    )}

                    {/* ── Call Controls ── */}
                    <div className="absolute bottom-8 sm:bottom-12 w-full flex justify-center gap-6 sm:gap-8 z-20 px-6">
                        {callStatus === 'receiving' ? (
                            <div className="flex items-end gap-12 sm:gap-16">
                                {/* Reject first (left), Accept right (right) */}
                                <div className="flex flex-col items-center gap-2">
                                    <button onClick={rejectCall} className="w-14 h-14 sm:w-16 sm:h-16 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center shadow-lg transition hover:scale-110 active:scale-95">
                                        <FiPhoneOff size={24} className="text-white" />
                                    </button>
                                    <span className="text-xs text-gray-400">Decline</span>
                                </div>
                                <div className="flex flex-col items-center gap-2">
                                    <button onClick={acceptCall} className="w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center shadow-lg transition hover:scale-110 active:scale-95 animate-bounce bg-gradient-to-br from-pink-500 to-purple-600 shadow-pink-500/30">
                                        {callType === 'video' ? <FiVideo size={24} className="text-white" /> : <FiPhone size={24} className="text-white" />}
                                    </button>
                                    <span className="text-xs text-gray-400">Accept</span>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-5 sm:gap-8">
                                {/* Mute */}
                                <div className="flex flex-col items-center gap-1.5">
                                    <button onClick={toggleMic} className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition active:scale-90" style={{ background: isMuted ? 'white' : 'rgba(255,255,255,0.15)' }}>
                                        {isMuted ? <FiMicOff size={20} className="text-black" /> : <FiMic size={20} className="text-white" />}
                                    </button>
                                    <span className="text-[10px] text-gray-400">{isMuted ? 'Unmute' : 'Mute'}</span>
                                </div>

                                {/* End Call */}
                                <div className="flex flex-col items-center gap-1.5">
                                    <button onClick={endCall} className="w-14 h-14 sm:w-16 sm:h-16 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center shadow-lg transition hover:scale-110 active:scale-95">
                                        <FiPhoneOff size={24} className="text-white" />
                                    </button>
                                    <span className="text-[10px] text-gray-400">End</span>
                                </div>

                                {/* Video / Speaker toggle */}
                                <div className="flex flex-col items-center gap-1.5">
                                    {callType === 'video' ? (
                                        <button onClick={toggleVideo} className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition active:scale-90" style={{ background: isVideoOff ? 'white' : 'rgba(255,255,255,0.15)' }}>
                                            {isVideoOff ? <FiVideoOff size={20} className="text-black" /> : <FiVideo size={20} className="text-white" />}
                                        </button>
                                    ) : (
                                        <button className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.15)' }}>
                                            <FiMic size={20} className="text-white" />
                                        </button>
                                    )}
                                    <span className="text-[10px] text-gray-400">{callType === 'video' ? (isVideoOff ? 'Cam On' : 'Cam Off') : 'Speaker'}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}


export default ChatPage;
