import React, { useState } from "react";
import { PAGES } from "../../App";

const CITIES = ["Mumbai", "Delhi", "Pune", "Bangalore", "Chennai", "Hyderabad", "Jaipur", "Kolkata", "Noida"];

function SettingsModal({ user, setUser, onClose, setPage }) {
    const [activeView, setActiveView] = useState('menu');

    const [formData, setFormData] = useState({
        age: user.age || "",
        city: user.city || "Mumbai",
        bio: user.bio || "",
        price: user.price || "",
        tags: typeof user.tags === 'string' ? user.tags : (user.tags?.join(', ') || ""),
        is_private: user.is_private || false
    });

    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        setFormData({ ...formData, [e.target.name]: value });
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await fetch(`https://rentgf-and-bf.onrender.com/api/users/${user.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });
            const data = await response.json();
            if (response.ok) {
                setUser({ ...user, ...data.user });
                alert("✅ Settings Updated Successfully!");
                setActiveView('menu'); // Save hone ke baad wapas main menu par bhej do
            } else {
                alert("Update failed!");
            }
        } catch (error) {
            console.error(error);
            alert("Server Error");
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        if (window.confirm("Are you sure you want to logout?")) {
            localStorage.removeItem("token");
            setPage(PAGES.HOME);
        }
    };

    const handleDeleteAccount = async () => {
        const confirmDelete = window.confirm("⚠️ WARNING: This will permanently delete your account, chats, and bookings. Type 'YES' to confirm.");
        if (confirmDelete) {
            try {
                await fetch(`https://rentgf-and-bf.onrender.com/api/users/${user.id}`, { method: "DELETE" });
                localStorage.removeItem("token");
                alert("Account deleted forever.");
                setPage(PAGES.HOME);
            } catch (error) {
                console.error(error);
            }
        }
    };

    const isGirl = user.role === 'girl';

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            {/* Modal Container */}
            <div className="bg-[#16162A] w-full max-w-sm rounded-2xl border border-white/10 shadow-2xl overflow-hidden relative flex flex-col max-h-[90vh]">

                {/* Header (Top Bar) */}
                <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between sticky top-0 bg-[#16162A] z-10">
                    <div className="flex items-center gap-3">
                        {activeView !== 'menu' && (
                            <button onClick={() => setActiveView('menu')} className="text-gray-400 hover:text-white transition text-xl">
                                ←
                            </button>
                        )}
                        <h2 className="text-lg font-bold text-white">
                            {activeView === 'menu' && "⚙️ Settings"}
                            {activeView === 'edit_profile' && "Edit Profile"}
                            {activeView === 'privacy' && "Privacy"}
                            {activeView === 'danger' && "Delete Account"}
                        </h2>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 bg-white/5 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition">
                        ✕
                    </button>
                </div>

                {/* Body (Scrollable) */}
                <div className="overflow-y-auto custom-scrollbar">

                    {/* --- VIEW 1: MAIN MENU (Instagram Style) --- */}
                    {activeView === 'menu' && (
                        <div className="flex flex-col divide-y divide-white/5">
                            <button onClick={() => setActiveView('edit_profile')} className="w-full text-left px-5 py-4 hover:bg-white/5 transition flex justify-between items-center text-sm font-medium">
                                <span className="flex items-center gap-3"><span className="text-lg">👤</span> Edit Profile Details</span>
                                <span className="text-gray-500 text-lg">›</span>
                            </button>
                            <button onClick={() => setActiveView('privacy')} className="w-full text-left px-5 py-4 hover:bg-white/5 transition flex justify-between items-center text-sm font-medium">
                                <span className="flex items-center gap-3"><span className="text-lg">🔒</span> Privacy & Security</span>
                                <span className="text-gray-500 text-lg">›</span>
                            </button>

                            <div className="h-2 bg-[#0D0D1A]"></div> {/* Separator */}

                            <button onClick={handleLogout} className="w-full text-left px-5 py-4 hover:bg-white/5 transition text-sm font-medium text-pink-400">
                                <span className="flex items-center gap-3"><span className="text-lg">🚪</span> Log Out</span>
                            </button>
                            <button onClick={() => setActiveView('danger')} className="w-full text-left px-5 py-4 hover:bg-red-500/10 transition flex justify-between items-center text-sm font-medium text-red-500">
                                <span className="flex items-center gap-3"><span className="text-lg">⚠️</span> Delete Account</span>
                                <span className="text-red-500/50 text-lg">›</span>
                            </button>
                        </div>
                    )}

                    {/* --- VIEW 2: EDIT PROFILE --- */}
                    {activeView === 'edit_profile' && (
                        <form onSubmit={handleSave} className="p-5 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1 ml-1">Age</label>
                                    <input type="number" name="age" value={formData.age} onChange={handleChange} className="w-full bg-[#0D0D1A] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-pink-500" />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1 ml-1">City</label>
                                    <select name="city" value={formData.city} onChange={handleChange} className="w-full bg-[#0D0D1A] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-pink-500">
                                        {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                            </div>

                            {isGirl && (
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1 ml-1">Hourly Rate (₹)</label>
                                    <input type="number" name="price" value={formData.price} onChange={handleChange} className="w-full bg-[#0D0D1A] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-pink-500" />
                                </div>
                            )}

                            <div>
                                <label className="block text-xs text-gray-400 mb-1 ml-1">Bio</label>
                                <textarea name="bio" value={formData.bio} onChange={handleChange} rows="3" className="w-full bg-[#0D0D1A] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-pink-500" placeholder="Tell us about yourself..."></textarea>
                            </div>

                            <div>
                                <label className="block text-xs text-gray-400 mb-1 ml-1">Tags (Comma separated)</label>
                                <input type="text" name="tags" value={formData.tags} onChange={handleChange} className="w-full bg-[#0D0D1A] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-pink-500" placeholder="Coffee Date, Movie, Events" />
                            </div>

                            <button type="submit" disabled={loading} className="w-full py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl font-bold shadow-lg hover:opacity-90 transition mt-4">
                                {loading ? "Saving..." : "Save Profile"}
                            </button>
                        </form>
                    )}

                    {/* --- VIEW 3: PRIVACY SETTINGS --- */}
                    {activeView === 'privacy' && (
                        <form onSubmit={handleSave} className="p-5 space-y-4">
                            <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl">
                                <div>
                                    <div className="text-sm font-semibold text-white">Private Account</div>
                                    <div className="text-xs text-gray-400 mt-1">Hide your profile from search page</div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" name="is_private" checked={formData.is_private} onChange={handleChange} className="sr-only peer" />
                                    <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-500"></div>
                                </label>
                            </div>
                            <button type="submit" disabled={loading} className="w-full py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl font-bold shadow-lg hover:opacity-90 transition mt-4">
                                {loading ? "Saving..." : "Save Privacy Settings"}
                            </button>
                        </form>
                    )}

                    {/* --- VIEW 4: DANGER ZONE --- */}
                    {activeView === 'danger' && (
                        <div className="p-5 space-y-4">
                            <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl">
                                <h3 className="text-red-400 font-bold mb-2 flex items-center gap-2">⚠️ Warning</h3>
                                <p className="text-xs text-gray-400 leading-relaxed">
                                    Deleting your account is permanent and cannot be undone. All your photos, chats, reviews, and booking history will be erased from our servers immediately.
                                </p>
                            </div>
                            <button onClick={handleDeleteAccount} className="w-full py-3.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold shadow-lg shadow-red-500/20 transition">
                                Delete Account Permanently
                            </button>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}

export default SettingsModal;