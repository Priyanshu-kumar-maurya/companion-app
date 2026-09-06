import React, { useState, useRef } from "react";
import { PAGES } from "../../App";
import { FiSettings, FiUser, FiLock, FiBookmark, FiHeart, FiSlash, FiHelpCircle, FiInfo, FiLogOut, FiAlertTriangle, FiCamera, FiLoader, FiMessageCircle, FiPlus, FiTrash2, FiCheckCircle, FiRefreshCw, FiSmartphone } from "react-icons/fi";
import { APP_VERSION_TAG, APP_RELEASE_STAGE, APP_BUILD_DATE, APP_CHANGELOG, getAppPlatform } from "../../config/version";


function SettingsModal({ user, setUser, onClose, setPage, socket }) {
    const [activeView, setActiveView] = useState('menu');

    const [formData, setFormData] = useState({
        name: user.name || "",
        username: user.username || "",
        age: user.age || "",
        city: user.city || "Mumbai",
        bio: user.bio || "",
        price: user.price || "",
        tags: typeof user.tags === 'string' ? user.tags : (user.tags?.join(', ') || ""),
        link: user.social_link || user.link || "",
        is_private: user.is_private || false,
        show_online: user.show_online !== false
    });

    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);

    // Instagram/WhatsApp settings states
    const [savedPosts, setSavedPosts] = useState([]);
    const [likedPosts, setLikedPosts] = useState([]);
    const [blockedUsers, setBlockedUsers] = useState([]);
    const [listLoading, setListLoading] = useState(false);
    const [expandedPost, setExpandedPost] = useState(null);

    // Location Autocomplete states/refs
    const [citySuggestions, setCitySuggestions] = useState([]);
    const [citySearchLoading, setCitySearchLoading] = useState(false);
    const [showCitySuggestions, setShowCitySuggestions] = useState(false);
    const citySearchTimeoutRef = useRef(null);

    // Gallery Photo management states
    const [galleryPhotos, setGalleryPhotos] = useState([]);
    const [galleryLoading, setGalleryLoading] = useState(false);
    const [newPhotoFile, setNewPhotoFile] = useState(null);
    const [newPhotoPreview, setNewPhotoPreview] = useState(null);
    const [newPhotoCaption, setNewPhotoCaption] = useState("");
    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
    const [checkingUpdate, setCheckingUpdate] = useState(false);
    const [updateStatus, setUpdateStatus] = useState(null);

    const handleCheckUpdate = () => {
        setCheckingUpdate(true);
        setUpdateStatus(null);
        setTimeout(() => {
            setCheckingUpdate(false);
            setUpdateStatus({
                latest: true,
                message: `You're using the latest version of Coffeely (${APP_VERSION_TAG})!`
            });
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(registrations => {
                    registrations.forEach(r => r.update());
                }).catch(() => {});
            }
        }, 1200);
    };

    const handleChange = (e) => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        setFormData({ ...formData, [e.target.name]: value });
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`https://rentgf-and-bf.onrender.com/api/users/${user.id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });
            const data = await response.json();
            if (response.ok) {
                const updatedUser = { ...user, ...data.user, link: data.user.social_link };
                setUser(updatedUser);
                localStorage.setItem('user', JSON.stringify(updatedUser));
                if (socket) {
                    socket.emit("active_status_changed");
                }
                alert("Settings Updated Successfully!");
                setActiveView('menu');
            } else {
                alert(data.error || "Update failed!");
            }
        } catch (error) {
            console.error(error);
            alert("Server Error");
        } finally {
            setLoading(false);
        }
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploading(true);
        const uploadFormData = new FormData();
        uploadFormData.append("profile_pic", file);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`https://rentgf-and-bf.onrender.com/api/upload/${user.id}`, {
                method: "POST",
                body: uploadFormData,
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setUser({ ...user, profile_pic: data.imageUrl });
                alert("Profile picture updated!");
            }
        } catch (err) { console.error(err); } finally { setUploading(false); }
    };

    const handleLogout = async () => {
        if (await window.showConfirm("Are you sure you want to logout?")) {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            sessionStorage.clear();
            // Full reload to clear ALL React state (girlUser, boyUser, adminUser)
            window.location.href = window.location.origin + '/#home';
            window.location.reload();
        }
    };

    const handleDeleteAccount = async () => {
        const confirmDelete = await window.showConfirm("WARNING: This will permanently delete your account, chats, and bookings.");
        if (confirmDelete) {
            try {
                const token = localStorage.getItem('token');
                await fetch(`https://rentgf-and-bf.onrender.com/api/users/${user.id}`, {
                    method: "DELETE",
                    headers: { "Authorization": `Bearer ${token}` }
                });
                localStorage.removeItem("token");
                localStorage.removeItem("user");
                sessionStorage.clear();
                setUser(null);
                alert("Account deleted forever.");
                setPage(PAGES.HOME);
            } catch (error) {
                console.error(error);
            }
        }
    };

    // Instagram / WhatsApp Settings APIs
    const fetchSavedPosts = async () => {
        setListLoading(true);
        try {
            const token = localStorage.getItem("token");
            const res = await fetch("https://rentgf-and-bf.onrender.com/api/posts/saved", {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) {
                setSavedPosts(await res.json());
            }
        } catch (e) {
            console.error(e);
        } finally {
            setListLoading(false);
        }
    };

    const fetchLikedPosts = async () => {
        setListLoading(true);
        try {
            const token = localStorage.getItem("token");
            const res = await fetch("https://rentgf-and-bf.onrender.com/api/posts/liked", {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) {
                setLikedPosts(await res.json());
            }
        } catch (e) {
            console.error(e);
        } finally {
            setListLoading(false);
        }
    };

    const fetchBlockedUsers = async () => {
        setListLoading(true);
        try {
            const token = localStorage.getItem("token");
            const res = await fetch("https://rentgf-and-bf.onrender.com/api/blocked-users", {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) {
                setBlockedUsers(await res.json());
            }
        } catch (e) {
            console.error(e);
        } finally {
            setListLoading(false);
        }
    };

    const handleUnsave = async (postId) => {
        try {
            const token = localStorage.getItem("token");
            const res = await fetch("https://rentgf-and-bf.onrender.com/api/posts/save", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ post_id: postId })
            });
            if (res.ok) {
                setSavedPosts(savedPosts.filter(p => p.id !== postId));
                setExpandedPost(null);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleUnlike = async (postId) => {
        try {
            const token = localStorage.getItem("token");
            const res = await fetch("https://rentgf-and-bf.onrender.com/api/like", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ post_id: postId })
            });
            if (res.ok) {
                setLikedPosts(likedPosts.filter(p => p.id !== postId));
                setExpandedPost(null);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleUnblock = async (blockedId) => {
        if (!await window.showConfirm("Are you sure you want to unblock this user?")) return;
        try {
            const token = localStorage.getItem("token");
            const res = await fetch("https://rentgf-and-bf.onrender.com/api/unblock", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ blocked_id: blockedId })
            });
            if (res.ok) {
                setBlockedUsers(blockedUsers.filter(u => u.id !== blockedId));
                alert("User unblocked successfully!");
            }
        } catch (e) {
            console.error(e);
        }
    };

    // Nominatim Location Autocomplete handler
    const handleCityChange = (val) => {
        setFormData(prev => ({ ...prev, city: val }));
        
        if (citySearchTimeoutRef.current) clearTimeout(citySearchTimeoutRef.current);
        
        if (!val.trim()) {
            setCitySuggestions([]);
            return;
        }

        setCitySearchLoading(true);
        citySearchTimeoutRef.current = setTimeout(() => {
            const query = encodeURIComponent(val + ", India"); // Bias to India
            fetch(`https://nominatim.openstreetmap.org/search?q=${query}&format=json&addressdetails=1&limit=5`, {
                headers: {
                    'User-Agent': 'RentGFCompanionApp/1.0'
                }
            })
            .then(res => res.json())
            .then(data => {
                const mapped = data.map(item => ({
                    label: item.display_name.split(',')[0],
                    description: item.display_name.split(',').slice(1).join(',').trim(),
                    lat: parseFloat(item.lat),
                    lon: parseFloat(item.lon)
                }));
                
                navigator.geolocation.getCurrentPosition((pos) => {
                    const { latitude, longitude } = pos.coords;
                    const sorted = mapped.map(item => {
                        const dist = Math.sqrt(Math.pow(item.lat - latitude, 2) + Math.pow(item.lon - longitude, 2));
                        return { ...item, dist };
                    }).sort((a, b) => a.dist - b.dist);
                    setCitySuggestions(sorted);
                    setCitySearchLoading(false);
                    setShowCitySuggestions(true);
                }, () => {
                    setCitySuggestions(mapped);
                    setCitySearchLoading(false);
                    setShowCitySuggestions(true);
                });
            })
            .catch(() => {
                setCitySearchLoading(false);
            });
        }, 800);
    };

    // Gallery Photo management handlers
    const fetchGalleryPhotos = async () => {
        setGalleryLoading(true);
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`https://rentgf-and-bf.onrender.com/api/posts/${user.id}`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) {
                setGalleryPhotos(await res.json());
            }
        } catch (e) {
            console.error(e);
        } finally {
            setGalleryLoading(false);
        }
    };

    const handlePhotoSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            setNewPhotoFile(file);
            setNewPhotoPreview(URL.createObjectURL(file));
        }
    };

    const handleUploadPhoto = async (e) => {
        e.preventDefault();
        if (!newPhotoFile) return;
        setIsUploadingPhoto(true);

        const uploadData = new FormData();
        uploadData.append("post_image", newPhotoFile);
        uploadData.append("caption", newPhotoCaption);
        uploadData.append("show_on_feed", true);
        uploadData.append("show_on_profile", true);

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`https://rentgf-and-bf.onrender.com/api/posts/${user.id}`, {
                method: "POST",
                body: uploadData,
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                alert("Photo uploaded to gallery successfully!");
                setNewPhotoFile(null);
                setNewPhotoPreview(null);
                setNewPhotoCaption("");
                fetchGalleryPhotos();
            } else {
                const errData = await response.json();
                alert(errData.error || "Upload failed.");
            }
        } catch (err) {
            alert("Upload failed. Try again.");
        } finally {
            setIsUploadingPhoto(false);
        }
    };

    const handleDeletePhoto = async (postId) => {
        if (!await window.showConfirm("Are you sure you want to delete this photo?")) return;
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`https://rentgf-and-bf.onrender.com/api/posts/${postId}`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (response.ok) {
                setGalleryPhotos(galleryPhotos.filter(p => p.id !== postId));
                alert("Photo deleted.");
            }
        } catch (err) {
            console.error("Delete photo error:", err);
        }
    };

    const isGirl = user.role === 'girl';

    return (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#16162A] w-full max-w-sm rounded-2xl border border-white/10 shadow-2xl overflow-hidden relative flex flex-col max-h-[90vh]">

                <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between sticky top-0 bg-[#16162A] z-10">
                    <div className="flex items-center gap-3">
                        {activeView !== 'menu' && (
                            <button onClick={() => setActiveView('menu')} className="text-gray-400 hover:text-white transition text-xl">
                                ←
                            </button>
                        )}
                        <h2 className="text-lg font-bold text-white">
                            {activeView === 'menu' && <span className="flex items-center gap-2"><FiSettings size={18} className="text-pink-500" /> Settings</span>}
                            {activeView === 'edit_profile' && "Edit Profile"}
                            {activeView === 'privacy' && "Privacy & Visibility"}
                            {activeView === 'manage_gallery' && <span className="flex items-center gap-2"><FiCamera size={18} className="text-pink-500" /> Manage My Gallery</span>}
                            {activeView === 'saved_posts' && <span className="flex items-center gap-2"><FiBookmark size={18} className="text-pink-500" /> Saved Posts</span>}
                            {activeView === 'liked_posts' && <span className="flex items-center gap-2"><FiHeart size={18} className="text-pink-500" /> Liked Posts</span>}
                            {activeView === 'blocked_accounts' && <span className="flex items-center gap-2"><FiSlash size={18} className="text-pink-500" /> Blocked Accounts</span>}
                            {activeView === 'app_version' && <span className="flex items-center gap-2"><FiCheckCircle size={18} className="text-emerald-400" /> App Version & Updates</span>}
                            {activeView === 'danger' && "Delete Account"}
                        </h2>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 bg-white/5 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition">
                        ✕
                    </button>
                </div>

                <div className="overflow-y-auto custom-scrollbar flex-1">

                    {activeView === 'menu' && (
                        <div className="flex flex-col divide-y divide-white/5">
                            <button onClick={() => setActiveView('edit_profile')} className="w-full text-left px-5 py-4 hover:bg-white/5 transition flex justify-between items-center text-sm font-medium">
                                <span className="flex items-center gap-3"><FiUser size={18} className="text-gray-400" /> Edit Profile Details</span>
                                <span className="text-gray-500 text-lg">›</span>
                            </button>
                            <button onClick={() => setActiveView('privacy')} className="w-full text-left px-5 py-4 hover:bg-white/5 transition flex justify-between items-center text-sm font-medium">
                                <span className="flex items-center gap-3"><FiLock size={18} className="text-gray-400" /> Privacy & Security</span>
                                <span className="text-gray-500 text-lg">›</span>
                            </button>

                            <div className="pt-2 pb-2 bg-[#121222]/50 border-t border-b border-white/5">
                                <h3 className="text-[10px] font-bold text-gray-500 px-5 mb-1.5 tracking-wider uppercase">My Activity</h3>
                                <button onClick={() => { setActiveView('manage_gallery'); fetchGalleryPhotos(); }} className="w-full text-left px-5 py-3.5 hover:bg-white/5 transition flex justify-between items-center text-sm font-medium">
                                    <span className="flex items-center gap-3"><FiCamera size={18} className="text-gray-400" /> Manage My Gallery</span>
                                    <span className="text-gray-500 text-lg">›</span>
                                </button>
                                <button onClick={() => { setActiveView('saved_posts'); fetchSavedPosts(); }} className="w-full text-left px-5 py-3.5 hover:bg-white/5 transition flex justify-between items-center text-sm font-medium">
                                    <span className="flex items-center gap-3"><FiBookmark size={18} className="text-gray-400" /> Saved Posts</span>
                                    <span className="text-gray-500 text-lg">›</span>
                                </button>
                                <button onClick={() => { setActiveView('liked_posts'); fetchLikedPosts(); }} className="w-full text-left px-5 py-3.5 hover:bg-white/5 transition flex justify-between items-center text-sm font-medium">
                                    <span className="flex items-center gap-3"><FiHeart size={18} className="text-gray-400" /> Liked Posts</span>
                                    <span className="text-gray-500 text-lg">›</span>
                                </button>
                                <button onClick={() => { setActiveView('blocked_accounts'); fetchBlockedUsers(); }} className="w-full text-left px-5 py-3.5 hover:bg-white/5 transition flex justify-between items-center text-sm font-medium">
                                    <span className="flex items-center gap-3"><FiSlash size={18} className="text-gray-400" /> Blocked Accounts</span>
                                    <span className="text-gray-500 text-lg">›</span>
                                </button>
                            </div>

                            <div className="pt-4 pb-2 bg-[#121222]">
                                <h3 className="text-xs font-bold text-gray-500 px-5 mb-2 tracking-wider uppercase">Support & Info</h3>
                                <button onClick={() => setPage(PAGES.HELP)} className="w-full text-left px-5 py-3 hover:bg-white/5 transition flex justify-between items-center text-sm font-medium">
                                    <span className="flex items-center gap-3"><FiHelpCircle size={18} className="text-gray-400" /> Help Center</span>
                                    <span className="text-gray-500 text-lg">›</span>
                                </button>
                                <button onClick={() => setPage(PAGES.ABOUT)} className="w-full text-left px-5 py-3 hover:bg-white/5 transition flex justify-between items-center text-sm font-medium">
                                    <span className="flex items-center gap-3"><FiInfo size={18} className="text-gray-400" /> About Us</span>
                                    <span className="text-gray-500 text-lg">›</span>
                                </button>
                                <button onClick={() => { setActiveView('app_version'); setUpdateStatus(null); }} className="w-full text-left px-5 py-3 hover:bg-white/5 transition flex justify-between items-center text-sm font-medium">
                                    <span className="flex items-center gap-3"><FiCheckCircle size={18} className="text-emerald-400" /> App Version</span>
                                    <span className="flex items-center gap-2">
                                        <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 font-bold">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                            {APP_VERSION_TAG} (Latest)
                                        </span>
                                        <span className="text-gray-500 text-lg">›</span>
                                    </span>
                                </button>
                            </div>

                            <div className="h-2 bg-[#0D0D1A] border-t border-white/5"></div>

                            <button onClick={handleLogout} className="w-full text-left px-5 py-4 hover:bg-white/5 transition text-sm font-medium text-pink-400">
                                <span className="flex items-center gap-3"><FiLogOut size={18} className="text-pink-400" /> Log Out</span>
                            </button>
                            <button onClick={() => setActiveView('danger')} className="w-full text-left px-5 py-4 hover:bg-red-500/10 transition flex justify-between items-center text-sm font-medium text-red-500">
                                <span className="flex items-center gap-3"><FiAlertTriangle size={18} className="text-red-500" /> Delete Account</span>
                                <span className="text-red-500/50 text-lg">›</span>
                            </button>
                        </div>
                    )}

                    {activeView === 'edit_profile' && (
                        <form onSubmit={handleSave} className="p-5 space-y-4">

                            <div className="flex flex-col items-center mb-6">
                                <div className="relative w-24 h-24 mb-3">
                                    <div className={`w-full h-full rounded-full overflow-hidden bg-gradient-to-br ${isGirl ? 'from-pink-500/30 to-purple-500/30 border-pink-500/20' : 'from-blue-500/30 to-purple-500/30 border-blue-500/20'} flex items-center justify-center border-4 shadow-lg`}>
                                        {user?.profile_pic ? (
                                            <img src={user.profile_pic} alt={user.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <FiUser size={38} className="text-white/60" />
                                        )}
                                    </div>
                                    <label className={`absolute bottom-0 right-0 text-white w-8 h-8 rounded-full flex items-center justify-center cursor-pointer hover:scale-110 transition shadow-lg border-2 border-[#16162A] text-sm ${isGirl ? 'bg-pink-500' : 'bg-blue-500'}`} title="Upload Profile Picture">
                                        {uploading ? <FiLoader className="animate-spin" size={13} /> : <FiCamera size={13} />}
                                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
                                    </label>
                                </div>
                                <span className="text-xs text-gray-400">Tap icon to change photo</span>
                            </div>

                            <div>
                                <label className="block text-xs text-gray-400 mb-1 ml-1 font-semibold">Username</label>
                                <input 
                                    type="text" 
                                    name="username" 
                                    value={formData.username} 
                                    onChange={(e) => {
                                        const val = e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, '');
                                        setFormData({ ...formData, username: val });
                                    }} 
                                    required 
                                    placeholder="e.g. your_username"
                                    className={`w-full bg-[#0D0D1A] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none transition ${isGirl ? 'focus:border-pink-500' : 'focus:border-blue-500'}`} 
                                />
                                <span className="text-[10px] text-gray-500 block mt-1 ml-1">Must be unique. Lowercase, numbers, underscores ( _ ) and dots ( . ) only.</span>
                            </div>

                            <div>
                                <label className="block text-xs text-gray-400 mb-1 ml-1 font-semibold">Name (Display Name)</label>
                                <input 
                                    type="text" 
                                    name="name" 
                                    value={formData.name} 
                                    onChange={handleChange} 
                                    required 
                                    placeholder="e.g. Alka Patel"
                                    className={`w-full bg-[#0D0D1A] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none transition ${isGirl ? 'focus:border-pink-500' : 'focus:border-blue-500'}`} 
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1 ml-1">Age</label>
                                    <input type="number" name="age" value={formData.age} onChange={handleChange} className={`w-full bg-[#0D0D1A] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none transition ${isGirl ? 'focus:border-pink-500' : 'focus:border-blue-500'}`} />
                                </div>
                                <div className="relative">
                                    <label className="block text-xs text-gray-400 mb-1 ml-1">City / Location</label>
                                    <div className="relative">
                                        <input 
                                            type="text" 
                                            name="city" 
                                            value={formData.city} 
                                            onChange={(e) => handleCityChange(e.target.value)} 
                                            onFocus={() => { if (citySuggestions.length > 0) setShowCitySuggestions(true); }}
                                            className={`w-full bg-[#0D0D1A] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none transition ${isGirl ? 'focus:border-pink-500' : 'focus:border-blue-500'}`} 
                                        />
                                        {citySearchLoading && (
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
                                                <div className="w-4 h-4 border-2 border-pink-500/20 border-t-pink-500 rounded-full animate-spin" />
                                            </div>
                                        )}
                                    </div>

                                    {showCitySuggestions && citySuggestions.length > 0 && (
                                        <>
                                            <div 
                                                className="fixed inset-0 z-30" 
                                                onClick={() => setShowCitySuggestions(false)} 
                                            />
                                            <div className="absolute left-0 right-0 mt-1.5 max-h-48 overflow-y-auto rounded-xl border border-white/10 shadow-2xl z-40 bg-[#0D0D1A] divide-y divide-white/5 scrollbar-thin">
                                                {citySuggestions.map((sug, i) => (
                                                    <div 
                                                        key={i}
                                                        onClick={() => {
                                                            setFormData(prev => ({ ...prev, city: sug.label + ", " + sug.description }));
                                                            setShowCitySuggestions(false);
                                                        }}
                                                        className="px-4 py-2 hover:bg-white/5 cursor-pointer text-left transition"
                                                    >
                                                        <div className="text-xs font-bold text-white truncate">{sug.label}</div>
                                                        <div className="text-[10px] text-gray-500 truncate mt-0.5">{sug.description}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs text-gray-400 mb-1 ml-1">Hourly Rate (₹)</label>
                                <input type="number" name="price" value={formData.price} onChange={handleChange} placeholder="e.g. 500" className={`w-full bg-[#0D0D1A] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none transition ${isGirl ? 'focus:border-pink-500' : 'focus:border-blue-500'}`} />
                            </div>

                            <div>
                                <label className="block text-xs text-gray-400 mb-1 ml-1">Bio</label>
                                <textarea name="bio" value={formData.bio} onChange={handleChange} rows="3" className={`w-full bg-[#0D0D1A] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none transition resize-none ${isGirl ? 'focus:border-pink-500' : 'focus:border-blue-500'}`} placeholder="Tell us about yourself..."></textarea>
                            </div>

                            <div>
                                <label className="block text-xs text-gray-400 mb-1 ml-1">Social Link / Website</label>
                                <input type="url" name="link" value={formData.link} onChange={handleChange} className={`w-full bg-[#0D0D1A] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none transition ${isGirl ? 'focus:border-pink-500' : 'focus:border-blue-500'}`} placeholder="https://instagram.com/yourprofile" />
                            </div>

                            <div>
                                <label className="block text-xs text-gray-400 mb-1 ml-1">Tags (Comma separated)</label>
                                <input type="text" name="tags" value={formData.tags} onChange={handleChange} className={`w-full bg-[#0D0D1A] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none transition ${isGirl ? 'focus:border-pink-500' : 'focus:border-blue-500'}`} placeholder="Coffee Date, Movie, Events" />
                            </div>

                            <button type="submit" disabled={loading} className={`w-full py-3 text-white rounded-xl font-bold shadow-lg hover:opacity-90 transition mt-4 ${isGirl ? 'bg-gradient-to-r from-pink-500 to-purple-500' : 'bg-gradient-to-r from-blue-500 to-purple-500'}`}>
                                {loading ? "Saving..." : "Save Profile"}
                            </button>
                        </form>
                    )}

                    {activeView === 'privacy' && (
                        <form onSubmit={handleSave} className="p-5 space-y-4">
                            {/* Private account toggle */}
                            <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl">
                                <div>
                                    <div className="text-sm font-semibold text-white">Private Account</div>
                                    <div className="text-xs text-gray-400 mt-1">Hide your profile from search page</div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer select-none">
                                    <input type="checkbox" name="is_private" checked={formData.is_private} onChange={handleChange} className="sr-only peer" />
                                    <div className={`w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${isGirl ? 'peer-checked:bg-pink-500' : 'peer-checked:bg-blue-500'}`}></div>
                                </label>
                            </div>

                            {/* Online status toggle */}
                            <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl">
                                <div>
                                    <div className="text-sm font-semibold text-white">Show Active Status</div>
                                    <div className="text-xs text-gray-400 mt-1">Allow others to see when you're online</div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer select-none">
                                    <input type="checkbox" name="show_online" checked={formData.show_online} onChange={handleChange} className="sr-only peer" />
                                    <div className={`w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${isGirl ? 'peer-checked:bg-pink-500' : 'peer-checked:bg-blue-500'}`}></div>
                                </label>
                            </div>

                            <button type="submit" disabled={loading} className={`w-full py-3 text-white rounded-xl font-bold shadow-lg hover:opacity-90 transition mt-4 ${isGirl ? 'bg-gradient-to-r from-pink-500 to-purple-500' : 'bg-gradient-to-r from-blue-500 to-purple-500'}`}>
                                {loading ? "Saving..." : "Save Privacy Settings"}
                            </button>
                        </form>
                    )}

                    {activeView === 'manage_gallery' && (
                        <div className="p-4 space-y-4">
                            {/* Upload New Photo Form */}
                            <form onSubmit={handleUploadPhoto} className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3 text-left">
                                <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                                    <FiPlus size={14} className={isGirl ? 'text-pink-400' : 'text-blue-400'} /> Add New Photo
                                </h3>

                                <div className="flex gap-3 items-center">
                                    {newPhotoPreview ? (
                                        <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-white/10">
                                            <img src={newPhotoPreview} alt="Preview" className="w-full h-full object-cover" />
                                            <button 
                                                type="button" 
                                                onClick={() => { setNewPhotoFile(null); setNewPhotoPreview(null); }}
                                                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-[10px] text-white"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ) : (
                                        <label className={`w-16 h-16 rounded-lg border border-dashed border-white/20 flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 transition shrink-0 ${isGirl ? 'hover:border-pink-500' : 'hover:border-blue-500'}`}>
                                            <FiCamera size={18} className="text-gray-400" />
                                            <span className="text-[9px] text-gray-500 mt-1">Select</span>
                                            <input type="file" accept="image/*" onChange={handlePhotoSelect} className="hidden" />
                                        </label>
                                    )}

                                    <div className="flex-1">
                                        <textarea
                                            placeholder="Write a caption..."
                                            value={newPhotoCaption}
                                            onChange={(e) => setNewPhotoCaption(e.target.value)}
                                            rows="2"
                                            className={`w-full bg-[#0D0D1A] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none resize-none transition ${isGirl ? 'focus:border-pink-500' : 'focus:border-blue-500'}`}
                                        />
                                    </div>
                                </div>

                                {newPhotoFile && (
                                    <button 
                                        type="submit" 
                                        disabled={isUploadingPhoto}
                                        className={`w-full py-2 text-white rounded-lg text-xs font-bold transition shadow-md ${
                                            isGirl ? 'bg-gradient-to-r from-pink-500 to-purple-500' : 'bg-gradient-to-r from-blue-500 to-purple-500'
                                        }`}
                                    >
                                        {isUploadingPhoto ? "Uploading..." : "Share Photo"}
                                    </button>
                                )}
                            </form>

                            {/* Gallery Photos Grid */}
                            <div className="border-t border-white/5 pt-4">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 text-left">
                                    Current Gallery ({galleryPhotos.length})
                                </h3>

                                {galleryLoading ? (
                                    <div className="text-center py-8 text-xs text-gray-500 animate-pulse">Loading gallery...</div>
                                ) : galleryPhotos.length === 0 ? (
                                    <div className="text-center py-8 text-xs text-gray-500">No photos in gallery. Upload one above!</div>
                                ) : (
                                    <div className="grid grid-cols-3 gap-2">
                                        {galleryPhotos.map(photo => (
                                            <div key={photo.id} className="relative aspect-square rounded-lg overflow-hidden border border-white/5 group">
                                                <img src={photo.image_url} alt="" className="w-full h-full object-cover" />
                                                <button
                                                    onClick={() => handleDeletePhoto(photo.id)}
                                                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition duration-200"
                                                >
                                                    <FiTrash2 size={16} className="text-red-400 hover:scale-125 transition" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeView === 'saved_posts' && (
                        <div className="p-4">
                            {listLoading ? (
                                <div className="text-center py-10 text-pink-500 animate-pulse text-sm">Loading saved posts...</div>
                            ) : savedPosts.length === 0 ? (
                                <div className="text-center py-12 text-gray-500 text-xs flex flex-col items-center gap-2">
                                    <FiBookmark size={24} className="text-gray-600" />
                                    <span>No saved posts yet. Bookmarked posts will show up here!</span>
                                </div>
                            ) : (
                                <div className="grid grid-cols-3 gap-1">
                                    {savedPosts.map(post => (
                                        <div key={post.id} onClick={() => setExpandedPost({ ...post, type: 'saved' })} className="aspect-square cursor-pointer overflow-hidden border border-white/5 rounded-lg">
                                            <img src={post.image_url} alt="Saved" className="w-full h-full object-cover hover:brightness-75 transition duration-300" />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeView === 'liked_posts' && (
                        <div className="p-4">
                            {listLoading ? (
                                <div className="text-center py-10 text-pink-500 animate-pulse text-sm">Loading liked posts...</div>
                            ) : likedPosts.length === 0 ? (
                                <div className="text-center py-12 text-gray-500 text-xs flex flex-col items-center gap-2">
                                    <FiHeart size={24} className="text-gray-600" />
                                    <span>No liked posts yet.</span>
                                </div>
                            ) : (
                                <div className="grid grid-cols-3 gap-1">
                                    {likedPosts.map(post => (
                                        <div key={post.id} onClick={() => setExpandedPost({ ...post, type: 'liked' })} className="aspect-square cursor-pointer overflow-hidden border border-white/5 rounded-lg">
                                            <img src={post.image_url} alt="Liked" className="w-full h-full object-cover hover:brightness-75 transition duration-300" />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeView === 'blocked_accounts' && (
                        <div className="p-4 space-y-2.5">
                            {listLoading ? (
                                <div className="text-center py-10 text-pink-500 animate-pulse text-sm">Loading blocked list...</div>
                            ) : blockedUsers.length === 0 ? (
                                <div className="text-center py-12 text-gray-500 text-xs flex flex-col items-center gap-2">
                                    <FiSlash size={24} className="text-gray-600" />
                                    <span>No blocked users.</span>
                                </div>
                            ) : (
                                blockedUsers.map(u => (
                                    <div key={u.id} className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/10">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <img src={u.profile_pic || "https://cdn-icons-png.flaticon.com/512/3135/3135768.png"} alt={u.name} className="w-9 h-9 rounded-full object-cover border border-white/10 flex-shrink-0" />
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-semibold text-white truncate">{u.name}</p>
                                                <p className="text-[10px] text-gray-400 capitalize">{u.role}</p>
                                            </div>
                                        </div>
                                        <button onClick={() => handleUnblock(u.id)} className="px-3.5 py-1.5 bg-red-500/20 hover:bg-red-500 text-white rounded-lg text-xs font-bold transition flex-shrink-0">
                                            Unblock
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {activeView === 'danger' && (
                        <div className="p-5 space-y-4">
                            <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl">
                                <h3 className="text-red-400 font-bold mb-2 flex items-center gap-2">
                                    <FiAlertTriangle size={16} /> Warning
                                </h3>
                                <p className="text-xs text-gray-400 leading-relaxed">
                                    Deleting your account is permanent and cannot be undone. All your photos, chats, reviews, and booking history will be erased from our servers immediately.
                                </p>
                            </div>
                            <button onClick={handleDeleteAccount} className="w-full py-3.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold shadow-lg shadow-red-500/20 transition">
                                Delete Account Permanently
                            </button>
                        </div>
                    )}

                    {activeView === 'app_version' && (
                        <div className="p-5 flex flex-col items-center text-center">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-pink-500 via-purple-600 to-indigo-600 flex items-center justify-center text-3xl shadow-xl shadow-pink-500/25 mb-3">
                                💝
                            </div>
                            <h3 className="text-xl font-extrabold text-white tracking-wide">Coffeely</h3>
                            <div className="flex items-center gap-2 mt-1 mb-4">
                                <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 shadow-sm">
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                                    {APP_VERSION_TAG} • {APP_RELEASE_STAGE}
                                </span>
                            </div>

                            {/* Device & Platform Info */}
                            <div className="w-full bg-[#0D0D1A] rounded-xl border border-white/5 p-4 text-left space-y-2.5 mb-4 text-xs">
                                <div className="flex justify-between items-center text-gray-400">
                                    <span>Running On</span>
                                    <span className="text-white font-semibold flex items-center gap-1.5">
                                        <FiSmartphone size={13} className="text-pink-400" /> {getAppPlatform()}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-gray-400 border-t border-white/5 pt-2">
                                    <span>Release Date</span>
                                    <span className="text-white font-semibold">{APP_BUILD_DATE}</span>
                                </div>
                                <div className="flex justify-between items-center text-gray-400 border-t border-white/5 pt-2">
                                    <span>Status</span>
                                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                                        <FiCheckCircle size={13} /> Up to Date (Latest)
                                    </span>
                                </div>
                            </div>

                            {/* Check for Updates button */}
                            <button
                                onClick={handleCheckUpdate}
                                disabled={checkingUpdate}
                                className="w-full py-2.5 px-4 bg-gradient-to-r from-pink-500 to-purple-600 hover:opacity-90 active:scale-[0.99] disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg shadow-pink-500/20 flex items-center justify-center gap-2 transition"
                            >
                                <FiRefreshCw size={13} className={checkingUpdate ? "animate-spin" : ""} />
                                {checkingUpdate ? "Checking for updates..." : "Check for Updates"}
                            </button>

                            {updateStatus && (
                                <div className="w-full mt-3 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs font-medium flex items-center justify-center gap-2 animate-fade-in">
                                    <FiCheckCircle size={14} className="shrink-0 text-emerald-400" />
                                    <span>{updateStatus.message}</span>
                                </div>
                            )}

                            {/* What's new in this version */}
                            <div className="w-full mt-5 text-left border-t border-white/10 pt-4">
                                <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2.5">What's new in {APP_VERSION_TAG}</h4>
                                <div className="space-y-2">
                                    {APP_CHANGELOG[0]?.features.map((feat, idx) => (
                                        <div key={idx} className="text-[11px] text-gray-300 flex items-start gap-2 leading-relaxed">
                                            <span className="text-pink-400 font-bold">•</span>
                                            <span>{feat}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>

            {/* Sub-view: Post detail expanded view */}
            {expandedPost && (
                <div className="fixed inset-0 bg-black/95 z-[150] flex flex-col items-center justify-center p-4 backdrop-blur-sm animate-fade-in" onClick={() => setExpandedPost(null)}>
                    <button className="absolute top-5 right-5 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition">
                        ✕
                    </button>
                    <div className="max-w-md w-full bg-[#16162A] rounded-2xl border border-white/10 overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-3 p-3 border-b border-white/5 bg-[#121222]">
                            <img src={expandedPost.user_pic || "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"} alt={expandedPost.user_name} className="w-8 h-8 rounded-full object-cover border border-white/10" />
                            <div>
                                <span className="font-bold text-sm text-white block">{expandedPost.user_name}</span>
                                <span className="text-gray-500 text-[10px] block capitalize">{expandedPost.user_role}</span>
                            </div>
                        </div>
                        <div className="aspect-square bg-black flex items-center justify-center">
                            <img src={expandedPost.image_url} alt="Expanded" className="w-full h-full object-contain" />
                        </div>
                        <div className="p-4 bg-[#16162A]">
                            <div className="flex justify-between items-center mb-3">
                                <span className="text-xs text-gray-400 flex items-center gap-2">
                                    <span className="flex items-center gap-1"><FiHeart size={12} className="text-red-500 fill-red-500" /> {expandedPost.total_likes} Likes</span>
                                    <span>•</span>
                                    <span className="flex items-center gap-1"><FiMessageCircle size={12} className="text-gray-400" /> {expandedPost.total_comments} Comments</span>
                                </span>
                                {expandedPost.type === 'saved' ? (
                                    <button onClick={() => handleUnsave(expandedPost.id)} className="px-3 py-1 bg-pink-500/20 border border-pink-500/40 text-pink-400 hover:bg-pink-500 hover:text-white rounded-lg text-xs font-bold transition">
                                        Unsave Post
                                    </button>
                                ) : (
                                    <button onClick={() => handleUnlike(expandedPost.id)} className="px-3 py-1 bg-pink-500/20 border border-pink-500/40 text-pink-400 hover:bg-pink-500 hover:text-white rounded-lg text-xs font-bold transition">
                                        Unlike Post
                                    </button>
                                )}
                            </div>
                            {expandedPost.caption && (
                                <p className="text-gray-200 text-sm leading-relaxed mt-2 border-t border-white/5 pt-2">
                                    <span className="font-bold mr-2 text-pink-400">{expandedPost.user_name}</span>
                                    {expandedPost.caption}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default SettingsModal;