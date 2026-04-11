import React, { useState, useEffect } from "react";
import { PAGES } from "../../App";

const reviews = [
    { name: "Neha Gupta", rating: 5, text: "Such a gentleman! Had a great time at the cafe." },
    { name: "Priya Sharma", rating: 4, text: "Very polite and fun to talk to. Highly recommended!" }
];

function BoyDashboard({ user, setBoyUser, setPage, setSelectedGirl }) {
    const [chatHistory, setChatHistory] = useState([]);
    const [myPosts, setMyPosts] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [postUploading, setPostUploading] = useState(false);
    const [newPostCaption, setNewPostCaption] = useState("");

    const [showEditModal, setShowEditModal] = useState(false);
    const [editForm, setEditForm] = useState({
        age: user?.age || "",
        city: user?.city || "",
        bio: user?.bio || "",
        price: user?.price || "",
        tags: user?.tags || "" 
    });

    const stats = { spent: "12,500", sessions: 8, rating: "4.9" };

    useEffect(() => {
        const fetchDashboardData = async () => {
            if (!user) return;
            try {
                const chatRes = await fetch(`https://rentgf-and-bf.onrender.com/api/chats/${user.id}`);
                if (chatRes.ok) setChatHistory(await chatRes.json());

                const postsRes = await fetch(`https://rentgf-and-bf.onrender.com/api/posts/${user.id}`);
                if (postsRes.ok) setMyPosts(await postsRes.json());
            } catch (err) { console.error(err); }
        };
        fetchDashboardData();
    }, [user]);

    const handleChatClick = (person) => {
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
                alert("Profile Updated! ✅");
            }
        } catch (err) { console.error(err); }
    };

    const handleDeletePost = async (postId) => {
        if (!window.confirm("Are you sure you want to delete this photo?")) return;
        try {
            const response = await fetch(`https://rentgf-and-bf.onrender.com/api/posts/${postId}`, { method: "DELETE" });
            if (response.ok) setMyPosts(myPosts.filter(post => post.id !== postId));
        } catch (err) { console.error(err); }
    };

    const handleDeleteAccount = async () => {
        if (!window.confirm("🚨 WARNING: Delete account permanently?")) return;
        try {
            const response = await fetch(`https://rentgf-and-bf.onrender.com/api/users/${user.id}`, { method: "DELETE" });
            if (response.ok) {
                localStorage.removeItem("token");
                setBoyUser(null);
                setPage(PAGES.HOME);
            }
        } catch (err) { console.error(err); }
    };

    const myTags = user.tags ? user.tags.split(',') : ["Coffee Date", "Movie"];

    return (
        <div className="pt-16 min-h-screen relative">
            <div className="max-w-5xl mx-auto px-6 py-8">

                <div className="mb-6 flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                        <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-blue-500 flex-shrink-0 group">
                            <img src={user.profile_pic || "https://i.pinimg.com/736x/89/90/48/899048ab0cc455154006fdb9676964b3.jpg"} alt="Profile" className="w-full h-full object-cover" />
                            <label className="absolute inset-0 bg-black/60 flex items-center justify-center text-xs font-bold text-white opacity-0 group-hover:opacity-100 cursor-pointer transition">
                                {uploading ? "Wait..." : "CHANGE"}
                                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
                            </label>
                        </div>
                        <div className="text-center sm:text-left mt-2 sm:mt-0">
                            <h1 className="text-3xl font-bold">Hey, {user.name} 👋</h1>
                            <p className="text-sm text-gray-400 mt-1">Manage your dates, chats, and profile here.</p>
                            <div className="text-xs text-blue-400 mt-2">
                                📍 {user.city || "City not set"} · 🎂 {user.age || "Age not set"}
                            </div>

                            <div className="flex flex-wrap gap-2 mt-3 justify-center sm:justify-start">
                                {myTags.map((tag, i) => (
                                    <span key={i} className="px-2.5 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs rounded-full">
                                        {tag.trim()}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    <button onClick={() => setShowEditModal(true)} className="px-5 py-2 bg-white/10 border border-white/20 text-white rounded-xl text-sm font-semibold hover:bg-white/20 transition flex items-center gap-2">
                        ⚙️ Edit Profile
                    </button>
                </div>

                <button onClick={() => setPage(PAGES.FIND)} className="mb-8 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full font-semibold text-sm hover:opacity-90 transition shadow-lg">
                    🔍 Browse Companions
                </button>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-7">
                    <div className="bg-[#16162A] border border-white/5 rounded-2xl p-5"><div className="text-xs text-gray-400 mb-2">💸 Total Spent</div><div className="text-2xl font-bold text-green-400">₹{stats.spent}</div></div>
                    <div className="bg-[#16162A] border border-white/5 rounded-2xl p-5"><div className="text-xs text-gray-400 mb-2">⭐ Your Rating</div><div className="text-2xl font-bold text-yellow-400">{stats.rating} ⭐</div></div>
                    <div className="bg-[#16162A] border border-white/5 rounded-2xl p-5"><div className="text-xs text-gray-400 mb-2">📅 Total Dates</div><div className="text-2xl font-bold text-blue-400">{stats.sessions}</div></div>
                    <div className="bg-[#16162A] border border-white/5 rounded-2xl p-5"><div className="text-xs text-gray-400 mb-2">💬 Active Chats</div><div className="text-2xl font-bold text-purple-400">{chatHistory.length}</div></div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                    <div className="lg:col-span-2 bg-[#16162A] border border-white/5 rounded-2xl p-6">
                        <div className="text-base font-semibold mb-4">💬 Your Conversations</div>
                        {chatHistory.length === 0 ? <div className="text-sm text-gray-500 text-center py-4">No messages yet.</div> : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {chatHistory.map(person => (
                                    <div key={person.id} onClick={() => handleChatClick(person)} className="flex items-center gap-3 py-3 px-4 bg-white/5 border border-white/5 rounded-xl cursor-pointer hover:border-blue-500/30 transition">
                                        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-sm font-bold text-blue-300">{person.name[0]}</div>
                                        <div className="flex-1"><div className="text-sm font-semibold">{person.name}</div></div>
                                        <div className="text-blue-400">➤</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="bg-[#16162A] border border-white/5 rounded-2xl p-6">
                        <div className="text-base font-semibold mb-4 text-blue-400">📸 Update Gallery</div>
                        <textarea placeholder="Add a caption..." className="w-full bg-[#0D0D1A] border border-white/10 rounded-xl p-3 text-sm text-white resize-none h-20 outline-none focus:border-blue-500 mb-3" value={newPostCaption} onChange={(e) => setNewPostCaption(e.target.value)} />
                        <label className="w-full py-2.5 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-semibold text-sm flex justify-center cursor-pointer hover:opacity-90 transition">
                            {postUploading ? "Posting..." : "Select Photo & Post"}
                            <input type="file" accept="image/*" className="hidden" onChange={handlePostUpload} disabled={postUploading} />
                        </label>
                    </div>
                </div>

                <div className="bg-[#16162A] border border-white/5 rounded-2xl p-6 mb-6">
                    <div className="text-base font-semibold mb-4">🖼️ My Gallery</div>
                    {myPosts.length === 0 ? <div className="text-sm text-gray-500 py-4 text-center">Your gallery is empty.</div> : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                            {myPosts.map(post => (
                                <div key={post.id} className="relative group rounded-xl overflow-hidden aspect-square border border-white/10">
                                    <img src={post.image_url} alt="Post" className="w-full h-full object-cover transition duration-300 group-hover:scale-110" />
                                    {post.caption && <div className="absolute bottom-0 w-full bg-gradient-to-t from-black/80 to-transparent p-3 pt-6 text-xs text-white">{post.caption}</div>}
                                    <button onClick={() => handleDeletePost(post.id)} className="absolute top-2 right-2 bg-red-500/80 hover:bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow-lg">🗑️</button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="bg-[#16162A] border border-white/5 rounded-2xl p-6 mb-6">
                    <div className="text-base font-semibold mb-4">⭐ Recent Reviews</div>
                    {reviews.map((r) => (
                        <div key={r.name} className="py-3 border-b border-white/5 last:border-0">
                            <div className="flex justify-between mb-1">
                                <span className="text-sm font-semibold">{r.name}</span>
                                <span className="text-yellow-400 text-sm">{"⭐".repeat(r.rating)}</span>
                            </div>
                            <p className="text-xs text-gray-400">{r.text}</p>
                        </div>
                    ))}
                </div>

                <button onClick={() => { localStorage.removeItem("token"); setBoyUser(null); setPage(PAGES.HOME); }} className="px-5 py-2.5 bg-white/5 border border-white/10 text-gray-400 rounded-xl text-sm hover:text-red-400 transition">Logout</button>
            </div>

            {showEditModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#16162A] border border-white/10 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
                        <div className="px-6 py-5 border-b border-white/5 flex justify-between items-center">
                            <h3 className="text-xl font-bold">⚙️ Edit Profile</h3>
                            <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-white text-xl">✕</button>
                        </div>

                        <form onSubmit={handleEditProfile} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1.5">Age</label>
                                    <input type="number" value={editForm.age} onChange={(e) => setEditForm({ ...editForm, age: e.target.value })} className="w-full bg-[#0D0D1A] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1.5">Hourly Rate (₹)</label>
                                    <input type="number" value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: e.target.value })} placeholder="e.g. 1000" className="w-full bg-[#0D0D1A] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs text-gray-400 mb-1.5">City</label>
                                <input type="text" value={editForm.city} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} className="w-full bg-[#0D0D1A] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500" />
                            </div>

                            <div>
                                <label className="block text-xs text-gray-400 mb-1.5">Interests (Comma separated)</label>
                                <input type="text" value={editForm.tags} onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })} placeholder="e.g. Movie, Long Drive, Cafe" className="w-full bg-[#0D0D1A] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500" />
                            </div>

                            <div>
                                <label className="block text-xs text-gray-400 mb-1.5">About Me (Bio)</label>
                                <textarea value={editForm.bio} onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })} className="w-full bg-[#0D0D1A] border border-white/10 rounded-xl px-4 py-3 text-sm text-white resize-none h-24 outline-none focus:border-blue-500" placeholder="Write something about yourself..." />
                            </div>

                            <button type="submit" className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold transition mt-2">
                                Save Changes
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