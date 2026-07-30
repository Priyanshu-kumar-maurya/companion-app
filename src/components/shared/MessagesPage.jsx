import React, { useState, useEffect, useCallback } from "react";
import { PAGES } from "../../App";
import { FiMessageCircle, FiRefreshCw, FiInbox, FiPhone, FiVideo, FiPhoneIncoming, FiPhoneOutgoing, FiPhoneMissed } from "react-icons/fi";

function MessagesPage({ currentUser, setPage, setSelectedGirl, socket }) {
    const [activeTab, setActiveTab] = useState("chats"); // 'chats' | 'calls'
    const [chatHistory, setChatHistory] = useState([]);
    const [callLogs, setCallLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [callsLoading, setCallsLoading] = useState(false);

    useEffect(() => {
        if (!currentUser) {
            setPage(PAGES.HOME);
            return;
        }

        const cachedInbox = sessionStorage.getItem("inboxCache");
        if (cachedInbox) {
            setChatHistory(JSON.parse(cachedInbox));
            setLoading(false);
        } else {
            setLoading(true);
        }

        const fetchChatsAndDetails = async () => {
            try {
                const token = localStorage.getItem('token');
                const headers = {};
                if (token) headers['Authorization'] = `Bearer ${token}`;
                
                const res = await fetch(`https://rentgf-and-bf.onrender.com/api/chats/${currentUser.id}`, { headers });
                if (res.ok) {
                    const users = await res.json();

                    const chatsWithDetails = await Promise.all(users.map(async (person) => {
                        try {
                            const msgRes = await fetch(`https://rentgf-and-bf.onrender.com/api/messages/${currentUser.id}/${person.id}`, { headers });
                            if (msgRes.ok) {
                                const msgs = await msgRes.json();
                                const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : null;

                                const unreadCount = msgs.filter(m => String(m.sender_id) === String(person.id) && !m.is_read).length;

                                let preview = '';
                                if (lastMsg) {
                                    if (lastMsg.message && (lastMsg.message.includes('✅') || lastMsg.message.includes('❌'))) {
                                        preview = lastMsg.message;
                                    } else {
                                        preview = lastMsg.message || (lastMsg.image_url ? 'Photo' : 'Attachment');
                                    }
                                }

                                return {
                                    ...person,
                                    lastMessagePreview: preview,
                                    lastMessageTime: lastMsg ? new Date(lastMsg.created_at).getTime() : 0,
                                    unreadCount: unreadCount
                                };
                            }
                        } catch (e) {
                            console.error(e);
                        }
                        return { ...person, lastMessagePreview: '', lastMessageTime: 0, unreadCount: 0 };
                    }));

                    chatsWithDetails.sort((a, b) => b.lastMessageTime - a.lastMessageTime);
                    setChatHistory(chatsWithDetails);
                    sessionStorage.setItem("inboxCache", JSON.stringify(chatsWithDetails));
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchChatsAndDetails();
    }, [currentUser, setPage]);

    const fetchCallLogs = useCallback(async () => {
        if (!currentUser) return;
        setCallsLoading(true);
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`https://rentgf-and-bf.onrender.com/api/call-history/${currentUser.id}`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) {
                setCallLogs(await res.json());
            }
        } catch (e) {
            console.error("Fetch call history error:", e);
        } finally {
            setCallsLoading(false);
        }
    }, [currentUser]);

    useEffect(() => {
        if (activeTab === 'calls') {
            fetchCallLogs();
        }
    }, [activeTab, fetchCallLogs]);

    useEffect(() => {
        if (!socket || !currentUser) return;

        const handleReceiveMessage = (data) => {
            if (data.sender_id || data.receiver_id) {
                setChatHistory(prev => {
                    const updated = prev.map(p => {
                        if (String(p.id) === String(data.sender_id) || String(p.id) === String(data.receiver_id)) {
                            const isUnread = String(p.id) === String(data.sender_id);
                            return {
                                ...p,
                                lastMessagePreview: data.message || data.text || (data.image_url ? 'Photo' : 'Attachment'),
                                lastMessageTime: Date.now(),
                                unreadCount: isUnread ? (p.unreadCount || 0) + 1 : (p.unreadCount || 0)
                            };
                        }
                        return p;
                    });
                    updated.sort((a, b) => b.lastMessageTime - a.lastMessageTime);
                    return updated;
                });
            }
        };

        socket.on("receive_message", handleReceiveMessage);
        return () => socket.off("receive_message", handleReceiveMessage);
    }, [socket, currentUser]);

    const handleChatClick = (person) => {
        setChatHistory(prev => prev.map(p => String(p.id) === String(person.id) ? { ...p, unreadCount: 0 } : p));
        setSelectedGirl(person);
        setPage(PAGES.CHAT);
    };

    const formatDuration = (secs) => {
        if (!secs || secs <= 0) return 'Missed';
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${m}m ${s}s`;
    };

    if (!currentUser) return null;

    return (
        <div className="pt-24 pb-20 min-h-[100dvh] bg-[#0D0D1A] px-6 max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
                    <FiMessageCircle className="text-pink-500" /> Communications
                </h1>

                {/* Tab Switcher */}
                <div className="flex bg-[#16162A] p-1 rounded-2xl border border-white/10">
                    <button
                        onClick={() => setActiveTab('chats')}
                        className={`px-4 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                            activeTab === 'chats' 
                                ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg' 
                                : 'text-gray-400 hover:text-white'
                        }`}
                    >
                        <FiMessageCircle size={14} /> Messages
                    </button>
                    <button
                        onClick={() => setActiveTab('calls')}
                        className={`px-4 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                            activeTab === 'calls' 
                                ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg' 
                                : 'text-gray-400 hover:text-white'
                        }`}
                    >
                        <FiPhone size={14} /> Call History
                    </button>
                </div>
            </div>

            <div className="bg-[#16162A] border border-white/5 rounded-3xl shadow-xl overflow-hidden min-h-[300px]">
                {activeTab === 'chats' ? (
                    loading ? (
                        <div className="text-gray-500 text-center py-16 flex flex-col items-center">
                            <FiRefreshCw className="text-pink-500 text-4xl mb-4 animate-spin" />
                            <p>Loading your messages...</p>
                        </div>
                    ) : chatHistory.length === 0 ? (
                        <div className="text-gray-500 text-center py-16 flex flex-col items-center">
                            <FiInbox className="text-pink-500 text-5xl mb-4" />
                            <p>No messages yet. Start a conversation!</p>
                            <button onClick={() => setPage(PAGES.FIND)} className="mt-4 px-6 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-full font-bold hover:opacity-90 transition">
                                Find Companions
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col divide-y divide-white/5">
                            {chatHistory.map((person) => (
                                <div key={person.id} onClick={() => handleChatClick(person)} className="flex items-center justify-between p-4 sm:p-5 hover:bg-white/5 cursor-pointer transition">
                                    <div className="flex items-center gap-4">
                                        <div className="relative">
                                            {person.profile_pic ? (
                                                <img src={person.profile_pic} alt={person.name} className="w-14 h-14 rounded-full object-cover border border-white/10" />
                                            ) : (
                                                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500/30 to-pink-500/30 flex items-center justify-center text-xl font-bold shadow-inner text-white">
                                                    {person.name[0]}
                                                </div>
                                            )}
                                        </div>

                                        <div>
                                            <div className="font-bold text-white text-lg">{person.name}</div>
                                            {person.unreadCount > 0 ? (
                                                <div className="text-sm text-green-400 font-semibold truncate max-w-[180px] sm:max-w-xs">
                                                    {person.lastMessagePreview || "New message received..."}
                                                </div>
                                            ) : (
                                                <div className="text-sm text-gray-500 truncate max-w-[180px] sm:max-w-xs">
                                                    {person.lastMessagePreview || "Tap to view conversation"}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {person.unreadCount > 0 ? (
                                        <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-[11px] font-bold text-white shadow-[0_0_10px_rgba(239,68,68,0.6)] animate-pulse">
                                            {person.unreadCount}
                                        </div>
                                    ) : (
                                        <div className="text-gray-600 text-xl">›</div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )
                ) : (
                    /* Call History Tab Content */
                    callsLoading ? (
                        <div className="text-gray-500 text-center py-16 flex flex-col items-center">
                            <FiRefreshCw className="text-pink-500 text-4xl mb-4 animate-spin" />
                            <p>Loading call history...</p>
                        </div>
                    ) : callLogs.length === 0 ? (
                        <div className="text-gray-500 text-center py-16 flex flex-col items-center">
                            <FiPhone className="text-pink-500 text-5xl mb-4" />
                            <p>No calls recorded yet.</p>
                        </div>
                    ) : (
                        <div className="flex flex-col divide-y divide-white/5">
                            {callLogs.map((log) => {
                                const isOutgoing = parseInt(log.caller_id) === parseInt(currentUser.id);
                                const partnerName = isOutgoing ? log.receiver_name : log.caller_name;
                                const partnerPic = isOutgoing ? log.receiver_pic : log.caller_pic;
                                const partnerId = isOutgoing ? log.receiver_id : log.caller_id;
                                const isMissed = log.status === 'missed' || log.status === 'rejected';

                                return (
                                    <div key={log.id} className="flex items-center justify-between p-4 sm:p-5 hover:bg-white/5 transition">
                                        <div className="flex items-center gap-4">
                                            <div className="relative">
                                                <img 
                                                    src={partnerPic || "https://cdn-icons-png.flaticon.com/512/3135/3135768.png"} 
                                                    alt={partnerName} 
                                                    className="w-12 h-12 rounded-full object-cover border border-white/10" 
                                                />
                                            </div>

                                            <div>
                                                <div className="font-bold text-white text-base">{partnerName}</div>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    {isMissed ? (
                                                        <span className="text-red-400 text-xs font-semibold flex items-center gap-1">
                                                            <FiPhoneMissed size={12} /> Missed Call
                                                        </span>
                                                    ) : isOutgoing ? (
                                                        <span className="text-blue-400 text-xs font-semibold flex items-center gap-1">
                                                            <FiPhoneOutgoing size={12} /> Outgoing • {formatDuration(log.duration_seconds)}
                                                        </span>
                                                    ) : (
                                                        <span className="text-green-400 text-xs font-semibold flex items-center gap-1">
                                                            <FiPhoneIncoming size={12} /> Incoming • {formatDuration(log.duration_seconds)}
                                                        </span>
                                                    )}
                                                    <span className="text-gray-500 text-[10px]">
                                                        • {new Date(log.created_at).toLocaleDateString()} {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => handleChatClick({ id: partnerId, name: partnerName, profile_pic: partnerPic })}
                                            className="px-3.5 py-1.5 bg-pink-500/10 hover:bg-pink-500 text-pink-400 hover:text-white border border-pink-500/20 rounded-full text-xs font-bold transition flex items-center gap-1"
                                        >
                                            {log.call_type === 'video' ? <FiVideo size={13} /> : <FiPhone size={13} />} Call Back
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )
                )}
            </div>
        </div>
    );
}

export default MessagesPage;