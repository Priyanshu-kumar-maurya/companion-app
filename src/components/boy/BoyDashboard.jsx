import React, { useState, useEffect } from "react";
import { PAGES } from "../../App";

function BoyDashboard({ user, setBoyUser, setPage, setSelectedGirl, socket }) {
    const [chatHistory, setChatHistory] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [myPosts, setMyPosts] = useState([]);
    const [newPostCaption, setNewPostCaption] = useState("");
    const [postUploading, setPostUploading] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [unreadCounts, setUnreadCounts] = useState({});

    const [editForm, setEditForm] = useState({
        age: user?.age || "",
        city: user?.city || "",
        bio: user?.bio || "",
        tags: user?.tags || ""
    });

    useEffect(() => {
        const fetchDashboardData = async () => {
            if (!user) return;
            try {
                const chatRes = await fetch(`https://rentgf-and-bf.onrender.com/api/chats/${user.id}`);
                if (chatRes.ok) setChatHistory(await chatRes.json());

                const postsRes = await fetch(`https://rentgf-and-bf.onrender.com/api/posts/${user.id}`);
                if (postsRes.ok) setMyPosts(await postsRes.json());
            } catch (err) {
                console.error("Dashboard error:", err);
            }
        };
        fetchDashboardData();
    }, [user]);

    useEffect(() => {
        if (!socket) return;

        const handleReceiveMessage = (data) => {
            if (data.sender_id) {
                setUnreadCounts(prev => ({
                    ...prev,
                    [data.sender_id]: (prev[data.sender_id] || 0) + 1
                }));
            }
        };

        socket.on("receive_message", handleReceiveMessage);

        return () => {
            socket.off("receive_message", handleReceiveMessage);
        };
    }, [socket]);

    const handleChatClick = (person) => {
        setUnreadCounts(prev => {
            const newState = { ...prev };
            delete newState[person.id];
            return newState;
        });
        setSelectedGirl(person);
        setPage(PAGES.CHAT);
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploading(true);
        const formData = new FormData();
        formData.append("profile_pic", file);
        try {
            const response = await fetch(`https://rentgf-and-bf.onrender.com/api/upload/${user.id}`, { method: "POST", body: formData });
            if (response.ok) {
                const data = await response.json();
                setBoyUser({ ...user, profile_pic: data.imageUrl });
                alert("Profile picture updated! 📸");
            }
        } catch (err) { console.error(err); } finally { setUploading(false); }
    };

    const handlePostUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setPostUploading(true);
        const formData = new FormData();
        formData.append("post_image", file);
        formData.append("caption", newPostCaption);
        try {
            const response = await fetch(`https://rentgf-and-bf.onrender.com/api/posts/${user.id}`, { method: "POST", body: formData });
            if (response.ok) {
                const data = await response.json();
                setMyPosts([data.post, ...myPosts]);
                setNewPostCaption("");
                alert("New photo posted! 📸");
            }
        } catch (err) { console.error(err); } finally { setPostUploading(false); }
    };

    const handleEditProfile = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch(`https://rentgf-and-bf.onrender.com/api/users/${user.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(editForm)
            });
            if (response.ok) {
                const data = await response.json();
                setBoyUser({ ...user, ...data.user });
                setShowEditModal(false);
                alert("Profile Settings Updated! ✅");
            }
        } catch (err) { console.error("Edit error:", err); }
    };

    const handleDeletePost = async (postId) => {
        if (!window.confirm("Are you sure you want to delete this photo?")) return;
        try {
            const response = await fetch(`https://rentgf-and-bf.onrender.com/api/posts/${postId}`, { method: "DELETE" });
            if (response.ok) {
                setMyPosts(myPosts.filter(post => post.id !== postId));
            }
        } catch (err) { console.error("Delete post error:", err); }
    };

    const handleDeleteAccount = async () => {
        if (!window.confirm("🚨 WARNING: Are you sure you want to PERMANENTLY delete your account? All messages and photos will be lost.")) return;
        try {
            const response = await fetch(`https://rentgf-and-bf.onrender.com/api/users/${user.id}`, { method: "DELETE" });
            if (response.ok) {
                localStorage.removeItem("token");
                setBoyUser(null);
                setPage(PAGES.HOME);
                alert("Account deleted. We will miss you! 👋");
            }
        } catch (err) { console.error("Delete account error:", err); }
    };

    const myTags = user.tags ? user.tags.split(',') : ["Coffee Date", "Movie"];

    return (
        <div className="pt-16 min-h-screen relative">
            <div className="max-w-5xl mx-auto px-6 py-8">
                <div className="mb-6 flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                        <div className="relative w-24 h-24 shrink-0 mx-auto sm:mx-0">
                            <div className="w-full h-full rounded-full overflow-hidden bg-gradient-to-br from-blue-500/30 to-purple-500/30 flex items-center justify-center text-4xl border-4 border-blue-500/20 shadow-lg">
                                {user?.profile_pic ? (
                                    <img
                                        src={user.profile_pic}
                                        alt={user.name}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    "😎"
                                )}
                            </div>
                            <label className="absolute bottom-0 right-0 bg-blue-500 text-white w-8 h-8 rounded-full flex items-center justify-center cursor-pointer hover:scale-110 transition shadow-lg border-2 border-[#16162A] text-sm" title="Upload Profile Picture">
                                {uploading ? "⏳" : "📷"}
                                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
                            </label>
                        </div>
                        <div className="text-center sm:text-left mt-2 sm:mt-0">
                            <h1 className="text-3xl font-bold">Welcome back, {user.name} 🚀</h1>
                            <p className="text-sm text-gray-400 mt-1">Here's your dashboard overview</p>
                            <div className="flex flex-wrap gap-2 mt-3 justify-center sm:justify-start">
                                {myTags.map((tag, i) => (
                                    <span key={i} className="px-2.5 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs rounded-full">
                                        {tag.trim()}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowEditModal(true)}
                        className="px-5 py-2 bg-white/10 border border-white/20 text-white rounded-xl text-sm font-semibold hover:bg-white/20 transition flex items-center gap-2"
                    >
                        ⚙️ Settings
                    </button>
                </div>

                <button
                    onClick={() => setPage(PAGES.FIND)}
                    className="mb-8 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full font-semibold text-sm hover:opacity-90 hover:-translate-y-0.5 transition shadow-lg shadow-blue-500/20"
                >
                    🔍 Find Companions
                </button>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-7">
                    <div className="bg-[#16162A] border border-white/5 rounded-2xl p-5"><div className="text-xs text-gray-400 mb-2">⭐ Status</div><div className="text-2xl font-bold text-yellow-400">Verified</div></div>
                    <div className="bg-[#16162A] border border-white/5 rounded-2xl p-5"><div className="text-xs text-gray-400 mb-2">📅 Total Connections</div><div className="text-2xl font-bold text-green-400">{chatHistory.length}</div></div>
                    <div className="bg-[#16162A] border border-white/5 rounded-2xl p-5"><div className="text-xs text-gray-400 mb-2">📸 Total Photos</div><div className="text-2xl font-bold text-blue-400">{myPosts.length}</div></div>
                    <div className="bg-[#16162A] border border-white/5 rounded-2xl p-5"><div className="text-xs text-gray-400 mb-2">🔔 Messages</div><div className="text-2xl font-bold text-purple-400">{chatHistory.length}</div></div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                    <div className="lg:col-span-2 bg-[#16162A] border border-white/5 rounded-2xl p-6">
                        <div className="text-base font-semibold mb-4 flex items-center gap-2">💬 Your Messages</div>
                        {chatHistory.length === 0 ? <div className="text-sm text-gray-500 py-4 text-center">No messages yet. Start exploring!</div> : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {chatHistory.map((person) => (
                                    <div key={person.id} onClick={() => handleChatClick(person)} className="flex items-center gap-3 py-3 px-4 bg-white/5 border border-white/5 rounded-xl cursor-pointer hover:border-blue-500/30 transition">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500/30 to-blue-500/30 flex items-center justify-center text-sm font-bold">{person.name[0]}</div>
                                        <div className="flex-1">
                                            <div className="text-sm font-semibold">{person.name}</div>
                                            {unreadCounts[person.id] ? (
                                                <div className="text-xs text-green-400 font-bold animate-pulse">New Message!</div>
                                            ) : (
                                                <div className="text-xs text-gray-400">Click to chat</div>
                                            )}
                                        </div>
                                        {unreadCounts[person.id] ? (
                                            <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-[0_0_8px_rgba(34,197,94,0.6)]">
                                                {unreadCounts[person.id]}
                                            </div>
                                        ) : (
                                            <div className="text-blue-400">➤</div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="bg-[#16162A] border border-white/5 rounded-2xl p-6">
                        <div className="text-base font-semibold mb-4 text-blue-400">📸 Create a Post</div>
                        <textarea placeholder="Write a caption..." className="w-full bg-[#0D0D1A] border border-white/10 rounded-xl p-3 text-sm text-white resize-none h-20 outline-none focus:border-blue-500 mb-3 transition" value={newPostCaption} onChange={(e) => setNewPostCaption(e.target.value)} />
                        <label className="w-full py-2.5 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-semibold text-sm flex justify-center cursor-pointer hover:opacity-90 transition">
                            {postUploading ? "Posting..." : "Select Photo & Post"}
                            <input type="file" accept="image/*" className="hidden" onChange={handlePostUpload} disabled={postUploading} />
                        </label>
                    </div>
                </div>

                <div className="bg-[#16162A] border border-white/5 rounded-2xl p-6 mb-6">
                    <div className="text-base font-semibold mb-4">🖼️ My Gallery</div>
                    {myPosts.length === 0 ? <div className="text-sm text-gray-500 py-4 text-center">No photos posted yet.</div> : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                            {myPosts.map(post => (
                                <div key={post.id} className="relative group rounded-xl overflow-hidden aspect-square border border-white/10">
                                    <img src={post.image_url} alt="Post" className="w-full h-full object-cover transition duration-300 group-hover:scale-110" />
                                    {post.caption && <div className="absolute bottom-0 w-full bg-gradient-to-t from-black/80 to-transparent p-3 pt-6 text-xs text-white">{post.caption}</div>}
                                    <button
                                        onClick={() => handleDeletePost(post.id)}
                                        className="absolute top-2 right-2 bg-red-500/80 hover:bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow-lg"
                                        title="Delete Post"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <button onClick={() => { localStorage.removeItem("token"); setBoyUser(null); setPage(PAGES.HOME); }} className="px-5 py-2.5 bg-white/5 border border-white/10 text-gray-400 rounded-xl text-sm hover:text-red-400 transition">Logout</button>
            </div>

            {showEditModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#16162A] border border-white/10 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
                        <div className="px-6 py-5 border-b border-white/5 flex justify-between items-center">
                            <h3 className="text-xl font-bold">⚙️ Settings</h3>
                            <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-white text-xl">✕</button>
                        </div>
                        <form onSubmit={handleEditProfile} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1.5">Age</label>
                                    <input type="number" value={editForm.age} onChange={(e) => setEditForm({ ...editForm, age: e.target.value })} className="w-full bg-[#0D0D1A] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1.5">City</label>
                                    <input type="text" value={editForm.city} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} className="w-full bg-[#0D0D1A] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400 mb-1.5">Interests (Comma separated)</label>
                                <input type="text" value={editForm.tags} onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })} placeholder="e.g. Movies, Gaming, Travel" className="w-full bg-[#0D0D1A] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500" />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400 mb-1.5">About Me (Bio)</label>
                                <textarea value={editForm.bio} onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })} className="w-full bg-[#0D0D1A] border border-white/10 rounded-xl px-4 py-3 text-sm text-white resize-none h-24 outline-none focus:border-blue-500" />
                            </div>
                            <button type="submit" className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-bold transition mt-2">
                                Save Settings
                            </button>
                        </form>
                        <div className="p-6 bg-red-500/5 border-t border-red-500/20">
                            <h4 className="text-red-400 text-sm font-bold mb-2">Danger Zone</h4>
                            <button onClick={handleDeleteAccount} className="w-full py-3 border border-red-500/50 text-red-400 hover:bg-red-500 hover:text-white rounded-xl font-bold text-sm transition">
                                Delete Account Permanently
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default BoyDashboard;