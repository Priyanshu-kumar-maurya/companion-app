import React, { useState, useEffect } from "react";
import { PAGES } from "../../App";

function DetailsPage({ girl: profile, setPage }) {
    const [hours, setHours] = useState(2);
    const [posts, setPosts] = useState([]); 
    useEffect(() => {
        const fetchUserPosts = async () => {
            if (!profile) return;
            try {
                const response = await fetch(`https://rentgf-and-bf.onrender.com/api/posts/${profile.id}`);
                if (response.ok) {
                    setPosts(await response.json());
                }
            } catch (err) {
                console.error("Posts fetch error:", err);
            }
        };
        fetchUserPosts();
    }, [profile]);

    if (!profile) return null;

    let safeTags = ["Coffee Date", "Movie", "Dinner"];
    if (profile.tags) { 
        safeTags = typeof profile.tags === 'string' ? profile.tags.split(',') : profile.tags;
    }
    const safeRating = profile.rating || 4.5;
    const safeReviews = profile.reviews || 24;
    const firstName = profile.name ? profile.name.split(" ")[0] : "User";
    const profileImage = profile.profile_pic || (profile.role === "boy"
        ? "https://i.pinimg.com/736x/89/90/48/899048ab0cc455154006fdb9676964b3.jpg"
        : "https://i.pinimg.com/736x/a9/58/09/a958095418a0b357314288566dd5c96a.jpg");

    return (
        <div className="pt-16 min-h-screen">
            <div className="max-w-4xl mx-auto px-6 py-8">
                <button onClick={() => setPage(PAGES.FIND)} className="text-sm text-gray-400 hover:text-white transition mb-6 flex items-center gap-1">
                    ← Back to Find
                </button>

                <div className="flex flex-col sm:flex-row gap-8 mb-7">
                    <div className="w-full sm:w-64 h-72 bg-gradient-to-br from-pink-500/20 to-purple-500/20 rounded-2xl overflow-hidden flex-shrink-0 border border-white/10 shadow-[0_0_20px_rgba(236,72,153,0.15)]">
                        <img src={profileImage} alt={profile.name} className="w-full h-full object-cover" />
                    </div>

                    <div className="flex-1">
                        <div className="flex items-center gap-3 flex-wrap mb-1">
                            <h1 className="text-3xl font-bold">{profile.name}</h1>
                            <span className="text-xs bg-purple-500/15 border border-purple-500/30 text-purple-300 px-2.5 py-1 rounded-full">✓ Verified</span>
                            <span className="text-xs text-green-400 flex items-center gap-1"><span className="w-1.5 h-1.5 bg-green-400 rounded-full" /> Online</span>
                        </div>
                        <p className="text-sm text-gray-400 mb-3">📍 {profile.city || "Unknown City"} · 🎂 {profile.age || "N/A"} years</p>
                        <div className="text-sm text-yellow-400 mb-4">⭐ {safeRating} <span className="text-gray-500">({safeReviews} reviews)</span></div>
                        <p className="text-sm text-gray-300 leading-relaxed mb-4">
                            {profile.bio || "Hi there! I'm looking forward to having some great conversations and spending quality time together. Feel free to check my posts below!"}
                        </p>

                        <div className="flex flex-wrap gap-2 mb-6">
                            {safeTags.map((tag) => (
                                <span key={tag} className="px-3 py-1 bg-pink-500/10 border border-pink-500/20 text-pink-400 text-xs rounded-full">{tag}</span>
                            ))}
                        </div>

                        <div className="flex gap-3 flex-wrap">
                            <button onClick={() => setPage(PAGES.CHAT)} className="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-full font-semibold text-sm hover:opacity-90 shadow-lg shadow-pink-500/25 transition">
                                💬 Chat with {firstName}
                            </button>
                            <button onClick={() => alert("Calling feature coming soon!")} className="px-6 py-3 border border-white/20 text-white rounded-full font-semibold text-sm hover:border-pink-500 transition">
                                📞 Voice Call
                            </button>
                        </div>
                    </div>
                </div>

                <div className="bg-[#16162A] border border-white/5 rounded-2xl p-6 mb-8">
                    <div className="text-base font-semibold mb-4">📅 Book a Session</div>
                    <div className="flex gap-2 flex-wrap mb-6">
                        {[1, 2, 3, 4, 5].map((h) => (
                            <button key={h} onClick={() => setHours(h)} className={`px-4 py-2 rounded-xl text-sm border transition ${hours === h ? "bg-pink-500/15 border-pink-500 text-pink-300" : "border-white/10 text-gray-400 hover:border-pink-500/30"}`}>
                                {h} hr{h > 1 ? "s" : ""}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div>
                            <div className="text-3xl font-bold text-pink-400">₹{(profile.price || 1000) * hours}</div>
                            <div className="text-xs text-gray-400">for {hours} hour session</div>
                        </div>
                        <button className="px-7 py-3.5 bg-white text-black rounded-full font-bold text-sm hover:bg-gray-200 transition">
                            Confirm Booking
                        </button>
                    </div>
                </div>

                <div className="mb-10">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        📸 {firstName}'s Gallery
                        <span className="text-xs font-normal bg-white/10 text-gray-400 px-2 py-0.5 rounded-full">{posts.length} posts</span>
                    </h2>

                    {posts.length === 0 ? (
                        <div className="bg-[#16162A] border border-white/5 rounded-2xl p-8 text-center text-gray-500 text-sm">
                            No photos posted yet.
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                            {posts.map(post => (
                                <div key={post.id} className="relative group rounded-xl overflow-hidden aspect-square border border-white/10 shadow-lg">
                                    <img src={post.image_url} alt="Post" className="w-full h-full object-cover transition duration-500 group-hover:scale-110" />
                                    {post.caption && (
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition duration-300 flex items-end p-4">
                                            <p className="text-sm text-white font-medium line-clamp-3">{post.caption}</p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}

export default DetailsPage;