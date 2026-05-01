import React, { useState, useEffect } from "react";
import { PAGES } from '../../App';
function MessagesPage({ currentUser, setPage, setSelectedGirl, socket }) {
    const [chatHistory, setChatHistory] = useState([]);
    const [unreadCounts, setUnreadCounts] = useState({});

    useEffect(() => {
        if (!currentUser) {
            setPage(PAGES.HOME);
            return;
        }
        const fetchChats = async () => {
            try {
                const res = await fetch(`https://rentgf-and-bf.onrender.com/api/chats/${currentUser.id}`);
                if (res.ok) setChatHistory(await res.json());
            } catch (err) {
                console.error(err);
            }
        };
        fetchChats();
    }, [currentUser, setPage]);

    useEffect(() => {
        if (!socket || !currentUser) return;
        const handleReceiveMessage = (data) => {
            if (data.sender_id) {
                setUnreadCounts(prev => ({
                    ...prev,
                    [data.sender_id]: (prev[data.sender_id] || 0) + 1
                }));
            }
        };
        socket.on("receive_message", handleReceiveMessage);
        return () => socket.off("receive_message", handleReceiveMessage);
    }, [socket, currentUser]);

    const handleChatClick = (person) => {
        setUnreadCounts(prev => {
            const newState = { ...prev };
            delete newState[person.id]; // Mark as read locally
            return newState;
        });
        setSelectedGirl(person);
        setPage(PAGES.CHAT);
    };

    if (!currentUser) return null;

    return (
        <div className="pt-24 pb-20 min-h-[100dvh] bg-[#0D0D1A] px-6 max-w-3xl mx-auto">
            <h1 className="text-3xl font-extrabold mb-6 text-white flex items-center gap-3">
                💬 Inbox
            </h1>

            <div className="bg-[#16162A] border border-white/5 rounded-2xl shadow-xl overflow-hidden">
                {chatHistory.length === 0 ? (
                    <div className="text-gray-500 text-center py-16 flex flex-col items-center">
                        <span className="text-5xl mb-4">📭</span>
                        <p>No messages yet. Start a conversation!</p>
                        <button onClick={() => setPage(PAGES.FIND)} className="mt-4 px-6 py-2 bg-pink-500/20 text-pink-400 rounded-full font-bold hover:bg-pink-500 hover:text-white transition">
                            Find Companions
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col divide-y divide-white/5">
                        {chatHistory.map((person) => (
                            <div key={person.id} onClick={() => handleChatClick(person)} className="flex items-center justify-between p-4 hover:bg-white/5 cursor-pointer transition">
                                <div className="flex items-center gap-4">

                                    {/* 🚨 CHANGED: Showing actual User DP instead of just name initial 🚨 */}
                                    <div className="relative">
                                        {person.profile_pic ? (
                                            <img src={person.profile_pic} alt={person.name} className="w-14 h-14 rounded-full object-cover border border-white/10" />
                                        ) : (
                                            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500/30 to-pink-500/30 flex items-center justify-center text-xl font-bold shadow-inner text-white">
                                                {person.name[0]}
                                            </div>
                                        )}
                                        {/* Green dot for online status could go here in future */}
                                    </div>

                                    <div>
                                        <div className="font-bold text-white text-lg">{person.name}</div>
                                        {unreadCounts[person.id] ? (
                                            <div className="text-sm text-gray-300 font-medium truncate max-w-[180px] sm:max-w-xs">New message received...</div>
                                        ) : (
                                            <div className="text-sm text-gray-500 truncate max-w-[180px] sm:max-w-xs">Tap to view conversation</div>
                                        )}
                                    </div>
                                </div>

                                {/* 🚨 CHANGED: WhatsApp/Insta style RED Notification Badge 🚨 */}
                                {unreadCounts[person.id] ? (
                                    <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-[11px] font-bold text-white shadow-[0_0_10px_rgba(239,68,68,0.6)] animate-pulse">
                                        {unreadCounts[person.id]}
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