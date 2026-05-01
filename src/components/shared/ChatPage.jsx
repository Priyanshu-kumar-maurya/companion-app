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
    const callTypeRef = useRef(null);
    const [facingMode, setFacingMode] = useState("user"); // 'user' (Front) or 'environment' (Back)

    // WebRTC Refs
    const peerConnectionRef = useRef(null);
    const localStreamRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const localVideoRef = useRef(null);

    const roomId = currentUser?.id < girl?.id
        ? `${currentUser?.id}_${girl?.id}`
        : `${girl?.id}_${currentUser?.id}`;

    // --- 1. CLEANUP FUNCTION ---
    const cleanupCall = useCallback(() => {
        setCallStatus("idle");
        setFacingMode("user"); // Reset to front camera
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop());
            localStreamRef.current = null;
        }
        if (peerConnectionRef.current) {
            peerConnectionRef.current.close();
            peerConnectionRef.current = null;
        }
    }, []);

    // --- 2. WEBRTC SETUP FUNCTION ---
    const setupWebRTC = useCallback(async (type, isCaller) => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: type === 'video' ? { facingMode: "user" } : false // Default front camera
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

    // --- 3. FETCH MESSAGES ---
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

    // --- 4. SOCKET LISTENERS ---
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

        socket.on("receive_message", handleReceiveMessage);
        socket.on("update_online_users", (usersArray) => setOnlineUsers(usersArray));
        socket.on("message_edited", (data) => setMessages(prev => prev.map(msg => String(msg.id) === String(data.messageId) ? { ...msg, text: data.newText } : msg)));
        socket.on("message_deleted", (deletedId) => setMessages(prev => prev.filter(msg => String(msg.id) !== String(deletedId))));
        socket.on("messages_read_update", handleMessagesReadUpdate);

        // Call & WebRTC Signals
        socket.on("incoming_call", (data) => {
            setCallType(data.type);
            callTypeRef.current = data.type;
            setCallStatus("receiving");
        });

        socket.on("call_accepted", async () => {
            setCallStatus("active");
            await setupWebRTC(callTypeRef.current, true);
        });

        socket.on("call_rejected", () => {
            alert("Call declined");
            cleanupCall();
        });

        socket.on("call_ended", cleanupCall);

        socket.on("webrtc_offer", async (offer) => {
            await setupWebRTC(callTypeRef.current, false);
            if (peerConnectionRef.current) {
                await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(offer));
                const answer = await peerConnectionRef.current.createAnswer();
                await peerConnectionRef.current.setLocalDescription(answer);
                socket.emit("webrtc_answer", { room: roomId, answer });
            }
        });

        socket.on("webrtc_answer", async (answer) => {
            if (peerConnectionRef.current) {
                await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
            }
        });

        socket.on("webrtc_ice_candidate", async (candidate) => {
            if (peerConnectionRef.current && candidate) {
                await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
            }
        });

        return () => {
            cleanupCall();
            socket.disconnect();
        };
    }, [roomId, currentUser.id, girl.id, setupWebRTC, cleanupCall]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // --- 5. CALL ACTIONS ---
    const startCall = (type) => {
        setCallType(type);
        callTypeRef.current = type;
        setCallStatus("calling");
        socket.emit("initiate_call", { room: roomId, receiver_id: girl.id, type: type });
    };

    const acceptCall = () => {
        setCallStatus("active");
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
            localStreamRef.current.getAudioTracks().forEach(track => track.enabled = !track.enabled);
        }
    };

    const toggleVideo = () => {
        if (localStreamRef.current) {
            localStreamRef.current.getVideoTracks().forEach(track => track.enabled = !track.enabled);
        }
    };

    // --- 🚨 NAYA CAMERA SWITCH LOGIC 🚨 ---
    const switchCamera = async () => {
        if (!localStreamRef.current || callType !== 'video') return;

        const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
        setFacingMode(newFacingMode);

        try {
            // Get new video stream from the other camera
            const newStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: newFacingMode }
            });

            const newVideoTrack = newStream.getVideoTracks()[0];

            // Stop the old video track
            const oldVideoTrack = localStreamRef.current.getVideoTracks()[0];
            if (oldVideoTrack) {
                oldVideoTrack.stop();
                localStreamRef.current.removeTrack(oldVideoTrack);
            }

            // Add the new track to local stream
            localStreamRef.current.addTrack(newVideoTrack);

            // Update local video element
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = localStreamRef.current;
            }

            // Replace the video track in the active WebRTC peer connection
            if (peerConnectionRef.current) {
                const videoSender = peerConnectionRef.current.getSenders().find(s => s.track && s.track.kind === 'video');
                if (videoSender) {
                    videoSender.replaceTrack(newVideoTrack);
                }
            }
        } catch (err) {
            console.error("Error switching camera:", err);
            alert("Could not switch camera. Device might not support it.");
            setFacingMode(facingMode); // Revert state if failed
        }
    };

    // --- 6. MESSAGING FUNCTIONS ---
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
            <div className="flex items-center gap-3 px-5 py-3.5 bg-[#16162A] border-b border-white/5 shrink-0 relative">
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

                    return (
                        <React.Fragment key={msg.id}>
                            {showDateDivider && (
                                <div className="flex justify-center my-2">
                                    <span className="text-[10px] bg-white/5 text-gray-400 px-3 py-1 rounded-lg border border-white/10 shadow-sm font-medium tracking-wide">{formatMessageDate(msg.timestamp)}</span>
                                </div>
                            )}

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

            <div className="flex items-end gap-2 px-4 py-3 border-t border-white/5 bg-[#16162A] shrink-0">
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

            {/* 🚨 ACTIVE CALLING / WEBRTC OVERLAY MODAL 🚨 */}
            {callStatus !== "idle" && (
                <div className="fixed inset-0 z-[200] bg-[#0D0D1A]/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 animate-fade-in">

                    {/* VIDEO/AUDIO DISPLAY */}
                    <div className={`relative mb-8 w-full max-w-md flex flex-col items-center gap-4 ${callStatus === 'active' && callType === 'video' ? 'h-96' : 'h-32'}`}>
                        {/* Remote Video */}
                        <video ref={remoteVideoRef} autoPlay playsInline className={`rounded-2xl bg-black object-cover w-full h-full shadow-2xl ${callStatus === 'active' && callType === 'video' ? 'block' : 'hidden'}`} />
                        {/* Local Video */}
                        <video ref={localVideoRef} autoPlay playsInline muted className={`absolute bottom-4 right-4 w-24 h-32 rounded-xl bg-gray-900 object-cover shadow-lg border-2 border-white/20 ${callStatus === 'active' && callType === 'video' ? 'block' : 'hidden'}`} />

                        {(callStatus !== 'active' || callType === 'audio') && (
                            <div className="relative">
                                <div className={`absolute inset-0 rounded-full animate-ping opacity-20 ${callStatus === 'active' ? 'bg-green-500' : 'bg-pink-500'}`}></div>
                                <img src={girl.profile_pic || "https://i.pinimg.com/736x/89/90/48/899048ab0cc455154006fdb9676964b3.jpg"} alt={girl.name} className="w-32 h-32 rounded-full object-cover border-4 border-white/20 relative z-10 shadow-2xl" />
                            </div>
                        )}
                    </div>

                    <h2 className="text-3xl font-extrabold text-white mb-2">{girl.name}</h2>
                    <p className="text-gray-400 mb-12 uppercase tracking-widest text-sm font-semibold">
                        {callStatus === "calling" && `Calling...`}
                        {callStatus === "receiving" && `Incoming ${callType} Call`}
                        {callStatus === "active" && `Connected`}
                    </p>

                    <div className="flex gap-6">
                        {callStatus === "receiving" && (
                            <button onClick={acceptCall} className="w-16 h-16 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center text-3xl shadow-[0_0_20px_rgba(34,197,94,0.5)] transition hover:scale-110">
                                {callType === 'video' ? '📹' : '📞'}
                            </button>
                        )}
                        <button onClick={callStatus === "receiving" ? rejectCall : endCall} className="w-16 h-16 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-3xl shadow-[0_0_20px_rgba(239,68,68,0.5)] transition hover:scale-110">📵</button>
                    </div>

                    {/* 🚨 NAYA CAMERA SWITCH BUTTON 🚨 */}
                    {callStatus === "active" && (
                        <div className="flex gap-4 mt-8">
                            <button onClick={toggleMic} className="w-14 h-14 bg-white/10 rounded-full flex items-center justify-center text-xl hover:bg-white/20 transition backdrop-blur-md" title="Mute/Unmute">🎙️</button>
                            {callType === 'video' && (
                                <>
                                    <button onClick={toggleVideo} className="w-14 h-14 bg-white/10 rounded-full flex items-center justify-center text-xl hover:bg-white/20 transition backdrop-blur-md" title="Camera On/Off">📷</button>
                                    <button onClick={switchCamera} className="w-14 h-14 bg-white/10 rounded-full flex items-center justify-center text-xl hover:bg-white/20 transition backdrop-blur-md" title="Switch Front/Back Camera">🔄</button>
                                </>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default ChatPage;