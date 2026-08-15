import React, { useState } from "react";
import { FiX, FiImage, FiUploadCloud } from "react-icons/fi";

function AddStoryModal({ currentUser, onClose, onStoryCreated }) {
    const [mediaUrl, setMediaUrl] = useState("");
    const [caption, setCaption] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 8 * 1024 * 1024) {
                setError("Image size must be less than 8MB.");
                return;
            }
            const reader = new FileReader();
            reader.onload = (uploadEvent) => {
                setMediaUrl(uploadEvent.target.result);
                setError("");
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!mediaUrl.trim()) {
            setError("Please upload an image or enter an image URL.");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const token = localStorage.getItem("token");
            const res = await fetch("https://rentgf-and-bf.onrender.com/api/stories", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    media_url: mediaUrl,
                    caption: caption
                })
            });

            const data = await res.json();
            if (res.ok) {
                if (onStoryCreated) onStoryCreated();
                onClose();
            } else {
                setError(data.error || "Failed to post story. Try again.");
            }
        } catch (err) {
            console.error("Story create error:", err);
            setError("Network error. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-[#16162A] border border-white/10 w-full max-w-md rounded-3xl p-6 shadow-2xl relative overflow-hidden">
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                            +
                        </div>
                        <h3 className="text-lg font-bold text-white">Create 24h Story</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center transition"
                    >
                        <FiX size={16} />
                    </button>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-3 rounded-xl mb-4 text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Media Preview Box */}
                    {mediaUrl ? (
                        <div className="relative w-full h-56 rounded-2xl overflow-hidden border border-white/10 bg-black group">
                            <img src={mediaUrl} alt="Preview" className="w-full h-full object-cover" />
                            <button
                                type="button"
                                onClick={() => setMediaUrl("")}
                                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 hover:bg-red-500 text-white flex items-center justify-center transition shadow-lg"
                            >
                                <FiX size={14} />
                            </button>
                        </div>
                    ) : (
                        <label className="flex flex-col items-center justify-center w-full h-44 border-2 border-dashed border-white/10 rounded-2xl hover:border-pink-500/50 transition cursor-pointer bg-[#0D0D1A] group">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <FiUploadCloud className="w-10 h-10 text-gray-400 group-hover:text-pink-400 transition mb-2" />
                                <p className="text-xs text-gray-300 font-semibold mb-1">Upload Photo</p>
                                <p className="text-[10px] text-gray-500">PNG, JPG or WebP up to 8MB</p>
                            </div>
                            <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                        </label>
                    )}

                    {/* Or URL input */}
                    <div>
                        <label className="block text-xs text-gray-400 mb-1 ml-1">Or Paste Image URL</label>
                        <div className="relative">
                            <FiImage className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-sm" />
                            <input
                                type="url"
                                placeholder="https://images.unsplash.com/..."
                                value={mediaUrl}
                                onChange={(e) => setMediaUrl(e.target.value)}
                                className="w-full bg-[#0D0D1A] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-gray-500 outline-none focus:border-pink-500 transition"
                            />
                        </div>
                    </div>

                    {/* Caption Input */}
                    <div>
                        <label className="block text-xs text-gray-400 mb-1 ml-1">Story Caption (optional)</label>
                        <input
                            type="text"
                            maxLength={150}
                            placeholder="Add a moment caption... (e.g. Coffee time ☕)"
                            value={caption}
                            onChange={(e) => setCaption(e.target.value)}
                            className="w-full bg-[#0D0D1A] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-500 outline-none focus:border-pink-500 transition"
                        />
                    </div>

                    <p className="text-[10px] text-gray-500 text-center">
                        ✨ Stories disappear automatically after 24 hours.
                    </p>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 text-xs font-bold text-gray-400 hover:text-white bg-white/5 rounded-xl transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !mediaUrl.trim()}
                            className="flex-1 py-3 text-xs font-bold text-white rounded-xl transition bg-gradient-to-r from-pink-500 to-purple-500 hover:opacity-90 shadow-lg disabled:opacity-50"
                        >
                            {loading ? "Posting..." : "Share to Story"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default AddStoryModal;
