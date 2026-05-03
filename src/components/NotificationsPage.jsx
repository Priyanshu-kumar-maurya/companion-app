import React, { useState, useEffect } from "react";
import { PAGES } from "../App";

function NotificationsPage({ currentUser, setPage, setSelectedGirl }) {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchNotifications = async () => {
            if (!currentUser) return;
            try {
                const res = await fetch(`https://rentgf-and-bf.onrender.com/api/notifications/${currentUser.id}`);
                if (res.ok) {
                    const data = await res.json();
                    setNotifications(data);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchNotifications();
    }, [currentUser]);

    const formatTime = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 60) return `${diffMins}m`;
        if (diffHours < 24) return `${diffHours}h`;
        return `${diffDays}d`;
    };

    const handleProfileClick = (notif) => {
        if (setSelectedGirl) {
            setSelectedGirl({
                id: notif.sender_id,
                name: notif.sender_name,
                profile_pic: notif.sender_pic,
                role: "user"
            });
            setPage(PAGES.DETAILS);
        }
    };

    if (!currentUser) return null;

    return (
        <div className="pt-24 pb-20 min-h-[100dvh] bg-[#0D0D1A] px-4 sm:px-6 max-w-2xl mx-auto flex flex-col">
            <div className="flex items-center gap-3 mb-6">
                <button onClick={() => setPage(PAGES.HOME)} className="text-white text-2xl hover:text-pink-400 transition">←</button>
                <h1 className="text-3xl font-extrabold text-white">Activity</h1>
            </div>

            <div className="bg-[#16162A] border border-white/5 rounded-3xl shadow-xl overflow-hidden min-h-[300px] flex-1">
                {loading ? (
                    <div className="text-gray-500 text-center py-16 flex flex-col items-center animate-pulse">
                        <span className="text-4xl mb-4">🌀</span>
                        <p>Loading your activity...</p>
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="text-gray-500 text-center py-20 flex flex-col items-center">
                        <span className="text-5xl mb-4">📭</span>
                        <p>No new notifications.</p>
                        <p className="text-sm mt-2">When someone likes or comments on your post, it will show up here.</p>
                    </div>
                ) : (
                    <div className="flex flex-col divide-y divide-white/5">
                        {notifications.map((notif) => (
                            <div key={notif.id} className={`flex items-center justify-between p-4 transition ${notif.is_read ? 'hover:bg-white/5' : 'bg-pink-500/5 hover:bg-pink-500/10'}`}>
                                <div className="flex items-center gap-3 cursor-pointer flex-1" onClick={() => handleProfileClick(notif)}>
                                    <div className="relative">
                                        <img src={notif.sender_pic || "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"} alt={notif.sender_name} className="w-12 h-12 rounded-full object-cover border border-white/10" />
                                        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] bg-[#16162A] border border-[#16162A]">
                                            {notif.type === 'like' && '❤️'}
                                            {notif.type === 'comment' && '💬'}
                                            {notif.type === 'follow' && '👤'}
                                        </div>
                                    </div>
                                    <div className="flex-1 pr-2">
                                        <span className="font-bold text-white text-sm">{notif.sender_name}</span>
                                        <span className="text-gray-300 text-sm ml-1">
                                            {notif.type === 'like' && 'liked your post.'}
                                            {notif.type === 'comment' && 'commented on your post.'}
                                            {notif.type === 'follow' && 'started following you.'}
                                        </span>
                                        <div className="text-xs text-gray-500 mt-0.5">{formatTime(notif.created_at)}</div>
                                    </div>
                                </div>

                                {notif.post_image && (notif.type === 'like' || notif.type === 'comment') && (
                                    <img src={notif.post_image} alt="post thumbnail" className="w-10 h-10 object-cover rounded-md border border-white/10 shrink-0" />
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default NotificationsPage;