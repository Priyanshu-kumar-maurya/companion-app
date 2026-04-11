import React, { useState, useRef, useEffect } from "react";
import { PAGES } from "../../App";
import { io } from "socket.io-client";

const socket = io("http://https://rentgf-and-bf.onrender.com", { autoConnect: false });

function ChatPage({ girl, currentUser, setPage }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const bottomRef = useRef(null);

    const roomId = currentUser?.id < girl?.id
        ? `${currentUser?.id}_${girl?.id}`
        : `${girl?.id}_${currentUser?.id}`;

    useEffect(() => {
        const fetchOldMessages = async () => {
            if (!currentUser || !girl) return;
            try {
                const response = await fetch(`http://https://rentgf-and-bf.onrender.com/api/messages/${currentUser.id}/${girl.id}`);
                if (response.ok) {
                    const dbMessages = await response.json();

                    const formattedMessages = dbMessages.map(msg => {
                        const date = new Date(msg.created_at);
                        const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                        return {
                            id: msg.id,
                            text: msg.message,
                            sent: msg.sender_id === currentUser.id, // Agar current user ne bheja hai toh 'sent: true'
                            time: timeString
                        };
                    });

                    setMessages(formattedMessages);
                }
            } catch (error) {
                console.error("Purane messages fetch nahi hue:", error);
            }
        };

        fetchOldMessages();
    }, [currentUser, girl]);

    useEffect(() => {
        socket.connect();
        socket.emit("join_room", roomId);

        const handleReceiveMessage = (data) => {
            setMessages((prev) => [...prev, {
                id: Date.now(),
                text: data.message,
                sent: false,
                time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            }]);
        };

        socket.on("receive_message", handleReceiveMessage);

        return () => {
            socket.off("receive_message", handleReceiveMessage);
            socket.disconnect();
        };
    }, [roomId]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const sendMessage = () => {
        if (!input.trim() || !currentUser) return;
        const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

        const messageData = {
            sender_id: currentUser.id,
            receiver_id: girl.id,
            message: input,
            room: roomId
        };

        socket.emit("send_message", messageData);

        setMessages((prev) => [...prev, { id: Date.now(), text: input, sent: true, time: now }]);
        setInput("");
    };

    return (
        <div className="pt-16 h-screen flex flex-col bg-[#0D0D1A]">
            <div className="flex items-center gap-3 px-5 py-3.5 bg-[#16162A] border-b border-white/5">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500/30 to-purple-500/30 flex items-center justify-center text-xl flex-shrink-0">
                    😊
                </div>
                <div className="flex-1">
                    <div className="text-sm font-semibold">{girl.name}</div>
                    <div className="text-xs text-green-400 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                        Online · Encrypted
                    </div>
                </div>
                <button
                    onClick={() => alert("📞 In-App Call starting... (Recorded for safety)")}
                    className="px-4 py-1.5 bg-green-500/15 border border-green-500/30 text-green-400 text-xs rounded-xl font-semibold hover:bg-green-500/25 transition"
                >
                    📞 Call
                </button>
                <button
                    onClick={() => setPage(currentUser.role === 'girl' ? PAGES.GIRL_DASHBOARD : PAGES.BOY_DASHBOARD)}
                    className="text-gray-400 hover:text-white text-xl ml-1 transition"
                >
                    ✕
                </button>
            </div>

            <div className="px-5 py-2 bg-purple-500/10 border-b border-purple-500/20 text-xs text-purple-300 flex items-center gap-2">
                🛡️ This conversation is encrypted and recorded for security purposes.
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex flex-col ${msg.sent ? "items-end" : "items-start"} max-w-[70%] ${msg.sent ? "self-end" : "self-start"}`}>
                        <div
                            className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${msg.sent
                                ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-br-sm"
                                : "bg-[#16162A] border border-white/5 rounded-bl-sm"
                                }`}
                        >
                            {msg.text}
                        </div>
                        <div className="text-xs text-gray-500 mt-1 px-1">{msg.time}</div>
                    </div>
                ))}
                <div ref={bottomRef} />
            </div>

            <div className="flex gap-3 px-5 py-4 border-t border-white/5 bg-[#16162A]">
                <input
                    className="flex-1 bg-[#0D0D1A] border border-white/10 rounded-full px-5 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-pink-500 transition"
                    placeholder="Type a message..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                />
                <button
                    onClick={sendMessage}
                    className="w-11 h-11 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 flex items-center justify-center text-white text-lg hover:opacity-85 hover:scale-105 transition flex-shrink-0"
                >
                    ➤
                </button>
            </div>
        </div>
    );
}

export default ChatPage;