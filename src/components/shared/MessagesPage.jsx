import React, { useState, useEffect } from "react";
import { PAGES } from "../../App";

function MessagesPage({ currentUser, setPage, setSelectedGirl, socket }) {
    const [chatHistory, setChatHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!currentUser) {
            setPage(PAGES.HOME);
            return;
        }

        const fetchChatsAndDetails = async () => {
            setLoading(true);
            try {
                // 1. Backend se un logo ki list laao jinse baat hui hai
                const res = await fetch(`https://rentgf-and-bf.onrender.com/api/chats/${currentUser.id}`);
                if (res.ok) {
                    const users = await res.json();

                    // 2. Har user ke purane messages fetch karke unread count aur last message nikaalo
                    const chatsWithDetails = await Promise.all(users.map(async (person) => {
                        try {
                            const msgRes = await fetch(`https://rentgf-and-bf.onrender.com/api/messages/${currentUser.id}/${person.id}`);
                            if (msgRes.ok) {
                                const msgs = await msgRes.json();
                                const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : null;

                                // Unread messages ginna (jo person ne bheje hain aur is_read false hai)
                                const unreadCount = msgs.filter(m => String(m.sender_id) === String(person.id) && !m.is_read).length;

                                let preview = '';
                                if (lastMsg) {
                                    if (lastMsg.message && (lastMsg.message.includes('✅') || lastMsg.message.includes('❌'))) {
                                        preview = lastMsg.message; // Call history text
                                    } else {
                                        preview = lastMsg.message || (lastMsg.image_url ? '📷 Photo' : 'Attachment');
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
                            console.error("Error fetching msgs for", person.name);
                        }
                        return { ...person, lastMessagePreview: '', lastMessageTime: 0, unreadCount: 0 };
                    }));

                    // 3. Sorting: Jiska sabse latest message hai, usko sabse upar (Top) rakho
                    chatsWithDetails.sort((a, b) => b.lastMessageTime - a.lastMessageTime);
                    setChatHistory(chatsWithDetails);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchChatsAndDetails();
    }, [currentUser, setPage]);

    // --- REALTIME SOCKET LOGIC ---
    useEffect(() => {
        if (!socket || !currentUser) return;

        const handleReceiveMessage = (data) => {
            if (data.sender_id || data.receiver_id) {
                setChatHistory(prev => {
                    const updated = prev.map(p => {
                        // Agar mere pass is person ka message aaya, ya maine isko bheja
                        if (String(p.id) === String(data.sender_id) || String(p.id) === String(data.receiver_id)) {
                            const isUnread = String(p.id) === String(data.sender_id);
                            return {
                                ...p,
                                lastMessagePreview: data.message || data.text || (data.image_url ? '📷 Photo' : 'Attachment'),
                                lastMessageTime: Date.now(), // Turant time update karo taaki upar chala jaye
                                unreadCount: isUnread ? (p.unreadCount || 0) + 1 : (p.unreadCount || 0)
                            };
                        }
                        return p;
                    });

                    // Naya message aane par list ko firse sort karo (Top par bhejo)
                    updated.sort((a, b) => b.lastMessageTime - a.lastMessageTime);
                    return updated;
                });
            }
        };

        socket.on("receive_message", handleReceiveMessage);
        return () => socket.off("receive_message", handleReceiveMessage);
    }, [socket, currentUser]);

    const handleChatClick = (person) => {
        // Click karte hi badge clear kar do
        setChatHistory(prev => prev.map(p => String(p.id) === String(person.id) ? { ...p, unreadCount: 0 } : p));
        setSelectedGirl(person);
        setPage(PAGES.CHAT);
    };

    if (!currentUser) return null;

    return (
        <div className="pt-24 pb-20 min-h-[100dvh] bg-[#0D0D1A] px-6 max-w-3xl mx-auto">
            <h1 className="text-3xl font-extrabold mb-6 text-white flex items-center gap-3">
                💬 Inbox
            </h1>

            <div className="bg-[#16162A] border border-white/5 rounded-3xl shadow-xl overflow-hidden min-h-[300px]">
                {loading ? (
                    <div className="text-gray-500 text-center py-16 flex flex-col items-center animate-pulse">
                        <span className="text-4xl mb-4">🔄</span>
                        <p>Loading your messages...</p>
                    </div>
                ) : chatHistory.length === 0 ? (
                    <div className="text-gray-500 text-center py-16 flex flex-col items-center">
                        <span className="text-5xl mb-4">📭</span>
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
                                        {/* Optional online indicator here */}
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
                )}
            </div>
        </div>
    );
}

export default MessagesPage;