import React, { useState, useEffect, useCallback } from "react";
import { PAGES } from "../../App";
import { FiMessageCircle, FiRefreshCw, FiInbox, FiPhone, FiLock, FiUnlock } from "react-icons/fi";
import { isChatLocked } from "../../utils/chatLockManager";
import ChatLockPinModal from "./ChatLockPinModal";

function MessagesPage({ currentUser, setPage, setSelectedGirl, socket }) {
    const [activeTab, setActiveTab] = useState("chats"); // 'chats' | 'calls'
    const [chatHistory, setChatHistory] = useState([]);
    const [callLogs, setCallLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [callsLoading, setCallsLoading] = useState(false);

    // WhatsApp-Style Chat Lock States
    const [isLockedUnlocked, setIsLockedUnlocked] = useState(false);
    const [showPinModal, setShowPinModal] = useState(false);
    const [pinModalMode, setPinModalMode] = useState("verify");
    const [pendingChatToOpen, setPendingChatToOpen] = useState(null);

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

    // Split chats into Unlocked and Locked
    const unlockedChats = chatHistory.filter(p => !isChatLocked(currentUser?.id, p.id));
    const lockedChats = chatHistory.filter(p => isChatLocked(currentUser?.id, p.id));

    const handleChatClick = (person) => {
        if (isChatLocked(currentUser?.id, person.id) && !isLockedUnlocked) {
            setPendingChatToOpen(person);
            setPinModalMode("verify");
            setShowPinModal(true);
            return;
        }

        setChatHistory(prev => prev.map(p => String(p.id) === String(person.id) ? { ...p, unreadCount: 0 } : p));
        setSelectedGirl(person);
        setPage(PAGES.CHAT);
    };

    const handleUnlockLockedSection = () => {
        if (isLockedUnlocked) {
            setIsLockedUnlocked(false);
        } else {
            setPendingChatToOpen(null);
            setPinModalMode("verify");
            setShowPinModal(true);
        }
    };

    const handlePinSuccess = () => {
        setIsLockedUnlocked(true);
        if (pendingChatToOpen) {
            const target = pendingChatToOpen;
            setPendingChatToOpen(null);
            setChatHistory(prev => prev.map(p => String(p.id) === String(target.id) ? { ...p, unreadCount: 0 } : p));
            setSelectedGirl(target);
            setPage(PAGES.CHAT);
        }
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
                            {/* ── WhatsApp-Style "Locked Chats" Top Folder ── */}
                            {lockedChats.length > 0 && (
                                <div
                                    onClick={handleUnlockLockedSection}
                                    className={`p-4 sm:p-5 flex items-center justify-between cursor-pointer transition ${
                                        isLockedUnlocked
                                            ? "bg-emerald-500/10 border-b border-emerald-500/20"
                                            : "bg-purple-950/20 hover:bg-purple-950/40 border-b border-purple-500/20"
                                    }`}
                                >
                                    <div className="flex items-center gap-3.5">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg shadow-inner ${
                                            isLockedUnlocked
                                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                                : "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                                        }`}>
                                            {isLockedUnlocked ? <FiUnlock size={22} /> : <FiLock size={22} />}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-white text-base">Locked Chats</span>
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-500/30 text-purple-300 border border-purple-500/40">
                                                    {lockedChats.length} Private
                                                </span>
                                            </div>
                                            <div className="text-xs text-gray-400 mt-0.5">
                                                {isLockedUnlocked ? "Unlocked · Tap to lock again" : "Protected with 4-Digit PIN · Tap to unlock"}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-xs font-bold text-purple-400 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10">
                                        {isLockedUnlocked ? "Lock 🔒" : "Unlock 🔑"}
                                    </div>
                                </div>
                            )}

                            {/* ── Unlocked Private Chats List (Visible when folder is unlocked) ── */}
                            {isLockedUnlocked && lockedChats.length > 0 && (
                                <div className="bg-purple-950/10 divide-y divide-purple-500/10">
                                    {lockedChats.map((person) => (
                                        <div
                                            key={person.id}
                                            onClick={() => handleChatClick(person)}
                                            className="flex items-center justify-between p-4 sm:p-5 hover:bg-purple-500/10 cursor-pointer transition pl-6 sm:pl-8"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="relative">
                                                    {person.profile_pic ? (
                                                        <img src={person.profile_pic} alt={person.name} className="w-14 h-14 rounded-full object-cover border-2 border-purple-500 shadow-md" />
                                                    ) : (
                                                        <div className="w-14 h-14 rounded-full bg-purple-500/30 flex items-center justify-center text-xl font-bold shadow-inner text-white border-2 border-purple-500">
                                                            {person.name[0]}
                                                        </div>
                                                    )}
                                                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px] shadow">
                                                        <FiLock size={10} />
                                                    </div>
                                                </div>

                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-white text-lg">{person.name}</span>
                                                        <span className="text-[10px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded font-bold">LOCKED</span>
                                                    </div>
                                                    {person.unreadCount > 0 ? (
                                                        <div className="text-sm text-green-400 font-semibold truncate max-w-[180px] sm:max-w-xs">
                                                            {person.lastMessagePreview || "New message received..."}
                                                        </div>
                                                    ) : (
                                                        <div className="text-sm text-gray-400 truncate max-w-[180px] sm:max-w-xs">
                                                            {person.lastMessagePreview || "Tap to view conversation"}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {person.unreadCount > 0 ? (
                                                <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center text-[11px] font-bold text-white shadow-[0_0_10px_rgba(168,85,247,0.6)] animate-pulse">
                                                    {person.unreadCount}
                                                </div>
                                            ) : (
                                                <div className="text-purple-400 text-xl">›</div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* ── Regular Unlocked Chats ── */}
                            {unlockedChats.map((person) => (
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
                                const isMissed = log.status === 'missed';
                                return (
                                    <div key={log.id} className="flex items-center justify-between p-4 sm:p-5 hover:bg-white/5 transition">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg ${
                                                isMissed 
                                                    ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                                                    : isOutgoing 
                                                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
                                                        : 'bg-green-500/20 text-green-400 border border-green-500/30'
                                            }`}>
                                                <FiPhone size={20} />
                                            </div>

                                            <div>
                                                <div className="font-bold text-white text-base">
                                                    {isOutgoing ? log.receiver_name || 'Companion' : log.caller_name || 'Companion'}
                                                </div>
                                                <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-2">
                                                    <span className={isMissed ? 'text-red-400 font-semibold' : ''}>
                                                        {isMissed ? 'Missed Call' : isOutgoing ? 'Outgoing Call' : 'Incoming Call'}
                                                    </span>
                                                    <span>•</span>
                                                    <span>{formatDuration(log.duration_seconds)}</span>
                                                    <span>•</span>
                                                    <span>{new Date(log.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => {
                                                const targetId = isOutgoing ? log.receiver_id : log.caller_id;
                                                const targetName = isOutgoing ? log.receiver_name : log.caller_name;
                                                const targetPic = isOutgoing ? log.receiver_pic : log.caller_pic;
                                                setSelectedGirl({ id: targetId, name: targetName, profile_pic: targetPic });
                                                setPage(PAGES.CHAT);
                                            }}
                                            className="px-3.5 py-1.5 bg-white/5 hover:bg-pink-500/20 text-gray-300 hover:text-pink-400 rounded-xl text-xs font-bold border border-white/10 transition flex items-center gap-1.5"
                                        >
                                            <FiMessageCircle size={13} /> Chat
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )
                )}
            </div>

            {/* WhatsApp-Style Chat Lock PIN Verification Modal */}
            <ChatLockPinModal
                isOpen={showPinModal}
                onClose={() => {
                    setShowPinModal(false);
                    setPendingChatToOpen(null);
                }}
                userId={currentUser?.id}
                mode={pinModalMode}
                onSuccess={handlePinSuccess}
                companionName={pendingChatToOpen ? pendingChatToOpen.name : "Locked Chats"}
            />
        </div>
    );
}

export default MessagesPage;