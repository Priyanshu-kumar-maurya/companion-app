import React, { useState, useEffect } from "react";
import { PAGES } from "../../App";

const CITIES = ["All", "Mumbai", "Delhi", "Pune", "Bangalore", "Chennai", "Hyderabad", "Jaipur"];
const ALL_TAGS = ["All", "Coffee Date", "Movie", "Shopping", "Study Partner", "Dinner", "Events", "Walk", "Gaming"];

function FindPage({ setPage, setSelectedGirl, currentUser }) {
    const [searchQ, setSearchQ] = useState("");
    const [filterCity, setFilterCity] = useState("All");
    const [filterTag, setFilterTag] = useState("All");

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    const targetRole = currentUser?.role === "girl" ? "boy" : "girl";

    useEffect(() => {
        const fetchProfiles = async () => {
            try {
                const response = await fetch(`https://rentgf-and-bf.onrender.com/api/users?role=${targetRole}`);
                const data = await response.json();

                if (response.ok) {
                    const formattedData = data.map(user => ({
                        ...user,
                        tags: user.tags ? (typeof user.tags === 'string' ? user.tags.split(',') : user.tags) : ["Coffee Date", "Movie"]
                    }));
                    setUsers(formattedData);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchProfiles();
    }, [targetRole]);

    const filtered = users.filter(
        (u) =>
            (filterCity === "All" || u.city === filterCity) &&
            (filterTag === "All" || u.tags.some(tag => tag.trim() === filterTag)) &&
            (u.name.toLowerCase().includes(searchQ.toLowerCase()) ||
                (u.city && u.city.toLowerCase().includes(searchQ.toLowerCase())))
    );

    const handleProfileClick = (profile) => {
        if (!currentUser) {
            alert("Please Login or Register first to view profiles or chat!");
            setPage(PAGES.BOY_REGISTER);
            return;
        }
        setSelectedGirl(profile);
        setPage(PAGES.DETAILS);
    };

    return (
        <div className="pt-16 min-h-screen bg-[#0D0D1A]">
            <div className="max-w-5xl mx-auto px-6 py-8">
                <h1 className="text-3xl font-bold mb-1">
                    Find a{" "}
                    <span className="bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
                        Companion
                    </span>
                </h1>
                <p className="text-sm text-gray-400 mb-6">{filtered.length} profiles available</p>

                <input
                    className="w-full bg-[#16162A] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 outline-none focus:border-pink-500 transition mb-4"
                    placeholder="🔍 Search by name or city..."
                    value={searchQ}
                    onChange={(e) => setSearchQ(e.target.value)}
                />

                <div className="flex gap-2 flex-wrap items-center mb-3">
                    <span className="text-xs text-gray-500">City:</span>
                    {CITIES.map((c) => (
                        <button
                            key={c}
                            onClick={() => setFilterCity(c)}
                            className={`px-3 py-1 rounded-full text-xs border transition ${filterCity === c
                                ? "bg-pink-500/15 border-pink-500 text-pink-300"
                                : "border-white/10 text-gray-400 hover:border-pink-500/30"
                                }`}
                        >
                            {c}
                        </button>
                    ))}
                </div>

                <div className="flex gap-2 flex-wrap items-center mb-8">
                    <span className="text-xs text-gray-500">Activity:</span>
                    {ALL_TAGS.map((t) => (
                        <button
                            key={t}
                            onClick={() => setFilterTag(t)}
                            className={`px-3 py-1 rounded-full text-xs border transition ${filterTag === t
                                ? "bg-pink-500/15 border-pink-500 text-pink-300"
                                : "border-white/10 text-gray-400 hover:border-pink-500/30"
                                }`}
                        >
                            {t}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="text-center py-20 text-pink-500 animate-pulse">Loading profiles...</div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-20 text-gray-500">No companions found. Try different filters.</div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {filtered.map((u) => (
                            <div
                                key={u.id}
                                className="bg-[#16162A] border border-white/5 rounded-2xl overflow-hidden cursor-pointer hover:border-pink-500/30 hover:-translate-y-1 transition flex flex-col"
                                onClick={() => handleProfileClick(u)}
                            >
                                <div className="relative h-48 flex items-center justify-center bg-gradient-to-br from-pink-500/30 to-purple-500/30">
                                    {u.profile_pic ? (
                                        <img
                                            src={u.profile_pic}
                                            alt={u.name}
                                            className="w-full h-full object-cover transition duration-500 hover:scale-110"
                                        />
                                    ) : (
                                        <div className="text-6xl text-white/70">😊</div>
                                    )}

                                    {u.kyc_status === 'verified' && (
                                        <div className="absolute top-3 left-3 bg-purple-500/20 border border-purple-500/40 rounded-full px-2 py-0.5 text-xs text-purple-300 backdrop-blur-sm">
                                            ✓ Verified
                                        </div>
                                    )}
                                    <div className="absolute bottom-0 w-full bg-gradient-to-t from-[#16162A] to-transparent h-16" />
                                </div>

                                <div className="p-4 flex-1 flex flex-col">
                                    <div className="text-base font-semibold">{u.name.split(' ')[0]}</div>
                                    <div className="text-xs text-gray-400 mt-0.5">📍 {u.city || "Unknown"} · {u.age || "N/A"} years</div>
                                    <div className="text-xs text-yellow-400 mt-1">
                                        ⭐ {u.avg_rating > 0 ? `${u.avg_rating} ` : "New "}
                                        <span className="text-gray-500">
                                            {u.avg_rating > 0 ? `(${u.review_count} reviews)` : ""}
                                        </span>
                                    </div>

                                    <div className="mt-auto pt-4 flex items-center justify-between">
                                        <div>
                                            <span className="text-lg font-bold text-pink-400">₹{u.price || 1000}</span>
                                            <span className="text-xs text-gray-500">/hr</span>
                                        </div>
                                        <button className="px-3 py-1.5 bg-gradient-to-r from-pink-500 to-purple-500 text-white text-xs rounded-xl font-semibold hover:opacity-85 transition">
                                            View Profile
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default FindPage;