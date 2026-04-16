import React, { useState, useRef, useEffect } from "react";
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

    const roomId = currentUser?.id < girl?.id
        ? `${currentUser?.id}_${girl?.id}`
        : `${girl?.id}_${currentUser?.id}`;

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
                            id: msg.id,
                            text: msg.message,
                            imageUrl: msg.image_url,
                            sent: msg.sender_id === currentUser.id,
                            time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        };
                    });

                    setMessages(formattedMessages);
                }
            } catch (error) {
                console.error(error);
            }
        };

        fetchOldMessages();
    }, [currentUser, girl]);

    useEffect(() => {
        socket.connect();
        socket.emit("join_room", roomId);

        socket.emit("user_connected", currentUser.id);

        const handleReceiveMessage = (data) => {
            setMessages((prev) => {
                if (prev.find(m => m.id === data.id)) return prev;
                const date = data.created_at ? new Date(data.created_at) : new Date();
                return [...prev, {
                    id: data.id || Date.now(),
                    text: data.text || data.message,
                    imageUrl: data.image_url,
                    sent: data.sender_id === currentUser.id,
                    time: date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                }];
            });
        };

        const handleUpdateOnlineUsers = (usersArray) => {
            setOnlineUsers(usersArray);
        };

        const handleMessageEdited = (data) => {
            setMessages(prev => prev.map(msg => msg.id === data.messageId ? { ...msg, text: data.newText } : msg));
        };

        const handleMessageDeleted = (deletedId) => {
            setMessages(prev => prev.filter(msg => msg.id !== deletedId));
        };

        socket.on("receive_message", handleReceiveMessage);
        socket.on("update_online_users", handleUpdateOnlineUsers);
        socket.on("message_edited", handleMessageEdited);
        socket.on("message_deleted", handleMessageDeleted);

        return () => {
            socket.off("receive_message", handleReceiveMessage);
            socket.off("update_online_users", handleUpdateOnlineUsers);
            socket.off("message_edited", handleMessageEdited);
            socket.off("message_deleted", handleMessageDeleted);
            socket.disconnect();
        };
    }, [roomId, currentUser.id]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const sendMessage = (imageLink = null) => {
        if (!input.trim() && !imageLink) return;
        if (!currentUser) return;

        if (editingMsgId) {
            socket.emit("edit_message", {
                messageId: editingMsgId,
                newText: input,
                room: roomId,
                sender_id: currentUser.id
            });
            setMessages(prev => prev.map(msg => msg.id === editingMsgId ? { ...msg, text: input } : msg));
            setEditingMsgId(null);
            setInput("");
            return;
        }

        const messageData = {
            sender_id: currentUser.id,
            receiver_id: girl.id,
            message: input,
            image_url: imageLink,
            room: roomId
        };

        socket.emit("send_message", messageData);
        setInput(""); 
    };

    const handleImageAttachment = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploadingImage(true);
        const formData = new FormData();
        formData.append("image", file);

        try {
            const response = await fetch("https://rentgf-and-bf.onrender.com/api/chat-image", {
                method: "POST",
                body: formData
            });

            if (response.ok) {
                const data = await response.json();
                sendMessage(data.imageUrl);
            } else {
                alert("Failed to upload image.");
            }
        } catch (error) {
            console.error("Image upload error:", error);
        } finally {
            setUploadingImage(false);
            e.target.value = "";
        }
    };

    const deleteMessage = (id) => {
        if (window.confirm("Delete this message?")) {
            socket.emit("delete_message", { messageId: id, room: roomId, sender_id: currentUser.id });
            setMessages(prev => prev.filter(msg => msg.id !== id));
        }
    };

    const editMessage = (id, text) => {
        setEditingMsgId(id);
        setInput(text);
    };

    const handleViewProfile = () => {
        if (setSelectedGirl) setSelectedGirl(girl);
        setPage(PAGES.DETAILS);
    };

    const isOnline = onlineUsers.includes(girl.id) || onlineUsers.includes(girl.id.toString());

    return (
        <div className="fixed inset-0 pt-16 flex flex-col bg-[#0D0D1A] z-50">
            <div className="flex items-center gap-3 px-5 py-3.5 bg-[#16162A] border-b border-white/5 shrink-0 relative">
                <div onClick={handleViewProfile} className="flex items-center gap-3 flex-1 cursor-pointer hover:bg-white/5 p-1 rounded-xl transition duration-200">
                    {girl.profile_pic ? (
                        <img
                            src={girl.profile_pic}
                            alt={girl.name}
                            className="w-10 h-10 rounded-full object-cover flex-shrink-0 border border-white/10 shadow-[0_0_10px_rgba(255,255,255,0.1)]"
                        />
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500/30 to-purple-500/30 flex items-center justify-center text-xl flex-shrink-0">
                            😊
                        </div>
                    )}
                    <div>
                        <div className="text-sm font-semibold">{girl.name}</div>
                        {isOnline ? (
                            <div className="text-xs text-green-400 flex items-center gap-1.5 mt-0.5">
                                <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                                Online
                            </div>
                        ) : (
                            <div className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                                <span className="w-1.5 h-1.5 bg-gray-500 rounded-full" />
                                Offline
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex gap-2">
                    <button onClick={() => alert("📞 In-App Call starting...")} className="w-10 h-10 bg-green-500/15 border border-green-500/30 text-green-400 rounded-full flex items-center justify-center hover:bg-green-500/25 transition" title="Voice Call">📞</button>
                    <button onClick={() => setPage(currentUser.role === 'girl' ? PAGES.GIRL_DASHBOARD : PAGES.BOY_DASHBOARD)} className="w-10 h-10 bg-white/5 border border-white/10 text-white rounded-full flex items-center justify-center hover:bg-white/10 transition ml-1 text-lg">✕</button>
                </div>
            </div>

            <div className="px-5 py-2 bg-purple-500/10 border-b border-purple-500/20 text-[11px] font-medium tracking-wide text-purple-300 flex items-center justify-center gap-2 shrink-0">
                🔒 End-to-end encrypted chat
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`flex flex-col ${msg.sent ? "items-end" : "items-start"} max-w-[80%] ${msg.sent ? "self-end" : "self-start"} group`}
                        onMouseEnter={() => msg.sent && setHoveredMsgId(msg.id)}
                        onMouseLeave={() => setHoveredMsgId(null)}
                    >
                        <div className="flex items-center gap-2">
                            {msg.sent && hoveredMsgId === msg.id && !msg.imageUrl && (
                                <div className="flex gap-2 bg-[#16162A] px-2 py-1 rounded-lg border border-white/10 shadow-lg animate-fadeIn">
                                    <button onClick={() => editMessage(msg.id, msg.text)} className="text-[11px] hover:text-pink-400 transition" title="Edit">✏️</button>
                                    <button onClick={() => deleteMessage(msg.id)} className="text-[11px] hover:text-red-400 transition" title="Delete">🗑️</button>
                                </div>
                            )}

                            <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${msg.sent ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-br-sm" : "bg-[#16162A] border border-white/5 text-gray-100 rounded-bl-sm"}`}>
                                {msg.imageUrl && (
                                    <img src={msg.imageUrl} alt="chat-attachment" className="w-full max-w-[250px] rounded-lg mb-2 object-contain cursor-pointer" onClick={() => window.open(msg.imageUrl, '_blank')} />
                                )}
                                {msg.text && <span>{msg.text}</span>}
                            </div>
                        </div>
                        <div className="text-[10px] text-gray-500 mt-1 px-2 font-medium">{msg.time} {msg.sent && "✓"}</div>
                    </div>
                ))}

                {uploadingImage && (
                    <div className="self-end max-w-[70%] mb-2">
                        <div className="px-4 py-2 rounded-2xl bg-gradient-to-r from-pink-500/50 to-purple-500/50 text-white rounded-br-sm text-xs flex items-center gap-2 animate-pulse">⏳ Sending photo...</div>
                    </div>
                )}
                <div ref={bottomRef} />
            </div>

            {editingMsgId && (
                <div className="bg-pink-500/20 text-pink-300 text-xs px-4 py-2 flex justify-between items-center border-t border-pink-500/30">
                    <span>✏️ Editing message...</span>
                    <button onClick={() => { setEditingMsgId(null); setInput(""); }} className="hover:text-white font-bold px-2 py-1">Cancel</button>
                </div>
            )}

            <div className="flex items-end gap-2 px-4 py-3 border-t border-white/5 bg-[#16162A] shrink-0">
                <label className="w-11 h-11 bg-white/5 hover:bg-white/10 text-gray-400 rounded-full flex items-center justify-center text-xl cursor-pointer transition shrink-0 border border-white/10" title="Attach Image">
                    📎
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageAttachment} disabled={uploadingImage || editingMsgId} />
                </label>

                <textarea
                    className="flex-1 bg-[#0D0D1A] border border-white/10 rounded-2xl px-5 py-3 text-sm text-white placeholder-gray-500 outline-none focus:border-pink-500 transition resize-none min-h-[44px] max-h-32"
                    placeholder="Message..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            sendMessage();
                        }
                    }}
                    onFocus={(e) => setTimeout(() => e.target.scrollIntoView({ behavior: "smooth" }), 100)}
                    rows="1"
                />
                <button
                    onClick={() => sendMessage(null)}
                    disabled={!input.trim()}
                    className={`w-11 h-11 rounded-full flex items-center justify-center text-white text-lg transition flex-shrink-0 ${input.trim()
                            ? 'bg-gradient-to-r from-pink-500 to-purple-500 hover:scale-105 shadow-[0_0_15px_rgba(236,72,153,0.3)] cursor-pointer'
                            : 'bg-white/10 text-gray-500 cursor-not-allowed'
                        }`}
                >
                    {editingMsgId ? "✓" : "➤"}
                </button>
            </div>
        </div>
    );
}

export default ChatPage;