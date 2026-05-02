import React, { useState, useRef, useEffect, useCallback } from "react";
import { PAGES } from "../../App";
import { io } from "socket.io-client";

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

    // --- 5. FETCH MESSAGES ---
    useEffect(() => {
        const fetchOldMessages = async () => {
            if (!currentUser || !girl) return;
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
                }
            } catch (error) { }
        };
        fetchOldMessages();
    }, [currentUser, girl]);

    // --- 6. SOCKET LISTENERS ---
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
            const response = await fetch("https://rentgf-and-bf.onrender.com/api/chat-image", { method: "POST", body: formData });
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
        <div className="fixed inset-0 pt-16 flex flex-col bg-[#0D0D1A] z-50">
            {/* HEADER */}
            <div className="flex items-center gap-3 px-5 py-3.5 bg-[#16162A] border-b border-white/5 shrink-0 relative z-[40]">
                <div onClick={handleViewProfile} className="flex items-center gap-3 flex-1 cursor-pointer hover:bg-white/5 p-1 rounded-xl transition duration-200">
                    {girl.profile_pic ? (
                        <img src={girl.profile_pic} alt={girl.name} className="w-10 h-10 rounded-full object-cover flex-shrink-0 border border-white/10 shadow-[0_0_10px_rgba(255,255,255,0.1)]" />
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500/30 to-purple-500/30 flex items-center justify-center text-xl flex-shrink-0">😊</div>
                    )}
                    <div>
                        <div className="text-sm font-semibold text-white">{girl.name}</div>
                        {isOnline ? (
                            <div className="text-xs text-green-400 flex items-center gap-1.5 mt-0.5"><span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />Online</div>
                        ) : (
                            <div className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5"><span className="w-1.5 h-1.5 bg-gray-500 rounded-full" />Offline</div>
                        )}
                    </div>
                </div>

                <div className="flex gap-2">
                    <button onClick={() => startCall('audio')} className="w-10 h-10 bg-green-500/15 border border-green-500/30 text-green-400 rounded-full flex items-center justify-center hover:bg-green-500/25 transition text-lg" title="Voice Call">📞</button>
                    <button onClick={() => startCall('video')} className="w-10 h-10 bg-blue-500/15 border border-blue-500/30 text-blue-400 rounded-full flex items-center justify-center hover:bg-blue-500/25 transition text-lg" title="Video Call">📹</button>
                    <button onClick={() => setPage(currentUser.role === 'girl' ? PAGES.GIRL_DASHBOARD : PAGES.BOY_DASHBOARD)} className="w-10 h-10 bg-white/5 border border-white/10 text-white rounded-full flex items-center justify-center hover:bg-white/10 transition ml-1 text-lg">✕</button>
                </div>
            </div>

            <div className="px-5 py-2 bg-purple-500/10 border-b border-purple-500/20 text-[11px] font-medium tracking-wide text-purple-300 flex items-center justify-center gap-2 shrink-0">
                🔒 End-to-end encrypted chat
            </div>

            {/* CHAT MESSAGES */}
            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
                {messages.map((msg, index) => {
                    const isWithinTimeLimit = Date.now() - msg.timestamp < 15 * 60 * 1000;
                    const prevMsg = index > 0 ? messages[index - 1] : null;
                    const showDateDivider = !prevMsg || new Date(msg.timestamp).toDateString() !== new Date(prevMsg.timestamp).toDateString();

                    const isCallLog = msg.text && (msg.text.includes("✅") || msg.text.includes("❌"));

                    return (
                        <React.Fragment key={msg.id}>
                            {showDateDivider && (
                                <div className="flex justify-center my-2">
                                    <span className="text-[10px] bg-white/5 text-gray-400 px-3 py-1 rounded-lg border border-white/10 shadow-sm font-medium tracking-wide">{formatMessageDate(msg.timestamp)}</span>
                                </div>
                            )}

                            {isCallLog ? (
                                <div className="flex justify-center my-1 w-full">
                                    <div className="px-4 py-2 rounded-xl bg-[#16162A] border border-white/10 flex items-center gap-2 shadow-sm">
                                        <span className="text-xs text-gray-300 font-semibold">{msg.text}</span>
                                        <span className="text-[10px] text-gray-500 ml-2">{msg.time}</span>
                                    </div>
                                </div>
                            ) : (
                                <div className={`flex flex-col ${msg.sent ? "items-end" : "items-start"} max-w-[80%] ${msg.sent ? "self-end" : "self-start"} group`} onMouseEnter={() => setHoveredMsgId(msg.id)} onMouseLeave={() => setHoveredMsgId(null)}>
                                    <div className={`flex items-center gap-2 ${msg.sent ? "flex-row" : "flex-row-reverse"}`}>
                                        {hoveredMsgId === msg.id && (
                                            <div className="flex gap-2 bg-[#16162A] px-2 py-1 rounded-lg border border-white/10 shadow-lg animate-fadeIn">
                                                {msg.sent && isWithinTimeLimit && !msg.imageUrl && (
                                                    <button onClick={() => editMessage(msg.id, msg.text)} className="text-[11px] hover:text-pink-400 transition" title="Edit">✏️</button>
                                                )}
                                                <button onClick={() => setMessageToDelete(msg)} className="text-[11px] hover:text-red-400 transition" title="Delete">🗑️</button>
                                            </div>
                                        )}

                                        <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${msg.sent ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-br-sm" : "bg-[#16162A] border border-white/5 text-gray-100 rounded-bl-sm"}`}>
                                            {msg.imageUrl && <img src={msg.imageUrl} alt="chat-attachment" className="w-full max-w-[250px] rounded-lg mb-2 object-contain cursor-pointer" onClick={() => window.open(msg.imageUrl, '_blank')} />}
                                            {msg.text && <span>{msg.text}</span>}
                                        </div>
                                    </div>
                                    <div className="text-[10px] text-gray-500 mt-1 px-2 font-medium flex items-center justify-end gap-1">
                                        {msg.time}
                                        {msg.sent && <span className={msg.is_read ? "text-blue-400 font-bold text-xs" : "text-gray-400 font-bold text-xs"}>{msg.is_read ? "✓✓" : "✓"}</span>}
                                    </div>
                                </div>
                            )}
                        </React.Fragment>
                    );
                })}
                {uploadingImage && <div className="self-end max-w-[70%] mb-2"><div className="px-4 py-2 rounded-2xl bg-gradient-to-r from-pink-500/50 to-purple-500/50 text-white rounded-br-sm text-xs flex items-center gap-2 animate-pulse">⏳ Sending photo...</div></div>}
                <div ref={bottomRef} />
            </div>

            {/* INPUT AREA */}
            {editingMsgId && (
                <div className="bg-pink-500/20 text-pink-300 text-xs px-4 py-2 flex justify-between items-center border-t border-pink-500/30">
                    <span>✏️ Editing message...</span><button onClick={() => { setEditingMsgId(null); setInput(""); }} className="hover:text-white font-bold px-2 py-1">Cancel</button>
                </div>
            )}

            <div className="flex items-end gap-2 px-4 py-3 border-t border-white/5 bg-[#16162A] shrink-0 z-[40]">
                <label className="w-11 h-11 bg-white/5 hover:bg-white/10 text-gray-400 rounded-full flex items-center justify-center text-xl cursor-pointer transition shrink-0 border border-white/10" title="Attach Image">
                    📎 <input type="file" accept="image/*" className="hidden" onChange={handleImageAttachment} disabled={uploadingImage || editingMsgId} />
                </label>
                <textarea
                    className="flex-1 bg-[#0D0D1A] border border-white/10 rounded-2xl px-5 py-3 text-sm text-white placeholder-gray-500 outline-none focus:border-pink-500 transition resize-none min-h-[44px] max-h-32"
                    placeholder="Message..." value={input} onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                    onFocus={(e) => setTimeout(() => e.target.scrollIntoView({ behavior: "smooth" }), 100)} rows="1"
                />
                <button onClick={() => sendMessage(null)} disabled={!input.trim()} className={`w-11 h-11 rounded-full flex items-center justify-center text-white text-lg transition flex-shrink-0 ${input.trim() ? 'bg-gradient-to-r from-pink-500 to-purple-500 hover:scale-105 shadow-[0_0_15px_rgba(236,72,153,0.3)] cursor-pointer' : 'bg-white/10 text-gray-500 cursor-not-allowed'}`}>
                    {editingMsgId ? "✓" : "➤"}
                </button>
            </div>

            {/* DELETE MODAL */}
            {messageToDelete && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
                    <div className="bg-[#16162A] border border-white/10 rounded-2xl w-full max-w-xs overflow-hidden shadow-2xl p-5 text-center">
                        <h3 className="text-lg font-bold mb-4 text-white">Delete Message</h3>
                        <div className="flex flex-col gap-3">
                            {messageToDelete.sent && (Date.now() - messageToDelete.timestamp < 15 * 60 * 1000) && (
                                <button onClick={handleDeleteForEveryone} className="py-2.5 bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white border border-red-500/30 rounded-xl font-semibold transition">Delete for Everyone</button>
                            )}
                            <button onClick={handleDeleteForMe} className="py-2.5 bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10 rounded-xl font-semibold transition">Delete for Me</button>
                            <button onClick={() => setMessageToDelete(null)} className="py-2.5 mt-2 text-gray-500 hover:text-white font-semibold transition">Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 🚨 PREMIUM WHATSAPP/INSTA CALL UI 🚨 */}
            {callStatus !== "idle" && (
                <div className={`fixed inset-0 z-[200] ${callStatus === 'active' && callType === 'video' ? 'bg-[#000000]' : 'bg-[#0D0D1A]'} animate-fade-in overflow-hidden flex flex-col justify-center`}>
                    
                    {/* 1. AUDIO CALL & RINGING UI */}
                    {!(callStatus === 'active' && callType === 'video') && (
                        <>
                            <div className="absolute inset-0 z-0 pointer-events-none">
                                <img src={girl.profile_pic || "https://i.pinimg.com/736x/89/90/48/899048ab0cc455154006fdb9676964b3.jpg"} alt="bg" className="w-full h-full object-cover blur-3xl opacity-20 scale-110" />
                                <div className="absolute inset-0 bg-black/50"></div>
                            </div>

                            <div className="z-10 flex flex-col items-center mt-[-10vh]">
                                <div className="relative mb-6">
                                    <div className={`absolute inset-0 rounded-full animate-ping opacity-30 ${callStatus === 'active' ? 'bg-green-500' : 'bg-pink-500'} scale-125`}></div>
                                    <img src={girl.profile_pic || "https://i.pinimg.com/736x/89/90/48/899048ab0cc455154006fdb9676964b3.jpg"} alt={girl.name} className="w-40 h-40 rounded-full object-cover border-4 border-gray-800 shadow-2xl relative z-10" />
                                </div>

                                <h2 className="text-3xl font-bold text-white mb-2 tracking-wide">{girl.name}</h2>
                                <p className="text-gray-400 font-medium tracking-widest text-sm h-6">
                                    {callStatus === "calling" && "Calling..."}
                                    {callStatus === "receiving" && `Incoming ${callType} Call`}
                                    {callStatus === "active" && <span className="font-mono text-gray-200">{formatDuration(callDuration)}</span>}
                                </p>
                            </div>

                            <video ref={remoteVideoRef} autoPlay playsInline className="hidden" />
                            <video ref={localVideoRef} autoPlay playsInline muted className="hidden" />
                        </>
                    )}

                    {/* 2. ACTIVE VIDEO CALL UI (FULL SCREEN) */}
                    {callStatus === 'active' && callType === 'video' && (
                        <>
                            <video ref={remoteVideoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover bg-black z-0 pointer-events-none" />
                            
                            <div className="absolute top-0 left-0 right-0 px-6 py-10 bg-gradient-to-b from-black/70 to-transparent flex justify-between items-start z-20">
                                <div className="text-white drop-shadow-md">
                                    <div className="font-bold text-xl mb-1">{girl.name}</div>
                                    <div className="text-sm font-mono bg-black/40 px-2 py-0.5 rounded backdrop-blur-sm inline-block">{formatDuration(callDuration)}</div>
                                </div>
                                <button onClick={switchCamera} className="w-10 h-10 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center text-xl transition text-white backdrop-blur-md">🔄</button>
                            </div>

                            <video ref={localVideoRef} autoPlay playsInline muted className="absolute bottom-36 right-6 w-28 h-40 sm:w-36 sm:h-48 rounded-2xl bg-gray-900 object-cover shadow-[0_10px_30px_rgba(0,0,0,0.6)] border-2 border-white/20 z-10 pointer-events-none" />
                        </>
                    )}

                    {/* 3. BOTTOM CONTROLS ROW */}
                    <div className="absolute bottom-12 w-full px-6 flex justify-center gap-6 z-20">
                        {callStatus === "receiving" ? (
                            <>
                                <button onClick={acceptCall} className="w-16 h-16 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center text-3xl shadow-[0_0_20px_rgba(34,197,94,0.5)] transition hover:scale-110 animate-bounce">
                                    {callType === 'video' ? '📹' : '📞'}
                                </button>
                                <button onClick={rejectCall} className="w-16 h-16 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-3xl shadow-[0_0_20px_rgba(239,68,68,0.5)] transition hover:scale-110">📵</button>
                            </>
                        ) : (
                            <>
                                {/* Floating Premium Controls for Active/Calling */}
                                <button onClick={toggleMic} className={`w-14 h-14 rounded-full flex items-center justify-center text-xl transition ${isMuted ? 'bg-white text-black shadow-lg' : 'bg-gray-800/80 text-white backdrop-blur-md border border-white/10'}`}>
                                    {isMuted ? '🔇' : '🎙️'}
                                </button>
                                
                                <button onClick={endCall} className="w-16 h-16 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-3xl shadow-[0_0_20px_rgba(239,68,68,0.5)] transition hover:scale-110">
                                    📵
                                </button>

                                {/* Show Video toggle button if in video call OR if we want to turn video on in audio call */}
                                {callType === 'video' ? (
                                    <button onClick={toggleVideo} className={`w-14 h-14 rounded-full flex items-center justify-center text-xl transition ${isVideoOff ? 'bg-white text-black shadow-lg' : 'bg-gray-800/80 text-white backdrop-blur-md border border-white/10'}`}>
                                        {isVideoOff ? '🚫' : '📹'}
                                    </button>
                                ) : (
                                    // Audio Call 'Speaker' placeholder button to keep layout balanced
                                    <button className="w-14 h-14 bg-gray-800/80 text-white backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center text-xl transition pointer-events-none">
                                        🔊
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default ChatPage;