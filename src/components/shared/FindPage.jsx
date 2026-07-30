import React, { useState, useEffect } from "react";
import { PAGES } from "../../App";
import { FiSearch, FiUsers, FiUser, FiMapPin, FiStar, FiFilter, FiRotateCcw } from "react-icons/fi";

const CITIES = ["All", "Mumbai", "Delhi", "Pune", "Bangalore", "Chennai", "Hyderabad", "Jaipur"];
const ALL_TAGS = ["All", "Coffee Date", "Movie", "Shopping", "Study Partner", "Dinner", "Events", "Walk", "Gaming"];
const AGE_RANGES = ["All", "18-22", "23-27", "28+"];

function FindPage({ setPage, setSelectedGirl, currentUser }) {
    const [searchQ, setSearchQ] = useState("");
    const [filterCity, setFilterCity] = useState("All");
    const [filterTag, setFilterTag] = useState("All");
    const [maxPrice, setMaxPrice] = useState(5000);
    const [ageRange, setAgeRange] = useState("All");
    const [onlineOnly, setOnlineOnly] = useState(false);
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    const [genderFilter, setGenderFilter] = useState(currentUser?.role === "girl" ? "boy" : "girl");

    useEffect(() => {
        const cacheKey = `findPageCache_${genderFilter}`;
        const cachedUsers = sessionStorage.getItem(cacheKey);

        if (cachedUsers) {
            setUsers(JSON.parse(cachedUsers));
            setLoading(false);
        } else {
            setLoading(true);
        }

        const fetchProfiles = async () => {
            try {
                const token = localStorage.getItem("token");
                const headers = {};
                if (token) {
                    headers["Authorization"] = `Bearer ${token}`;
                }
                const url = genderFilter === "all" 
                    ? `https://rentgf-and-bf.onrender.com/api/users`
                    : `https://rentgf-and-bf.onrender.com/api/users?role=${genderFilter}`;
                
                const response = await fetch(url, { headers });
                const data = await response.json();

                if (response.ok) {
                    const formattedData = data.map(user => ({
                        ...user,
                        tags: user.tags ? (typeof user.tags === 'string' ? user.tags.split(',') : user.tags) : ["Coffee Date", "Movie"]
                    }));
                    setUsers(formattedData);
                    sessionStorage.setItem(cacheKey, JSON.stringify(formattedData));
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchProfiles();
    }, [genderFilter]);

    const handleResetFilters = () => {
        setSearchQ("");
        setFilterCity("All");
        setFilterTag("All");
        setMaxPrice(5000);
        setAgeRange("All");
        setOnlineOnly(false);
    };

    const activeFilterCount = (filterCity !== "All" ? 1 : 0) + 
                              (filterTag !== "All" ? 1 : 0) + 
                              (maxPrice < 5000 ? 1 : 0) + 
                              (ageRange !== "All" ? 1 : 0) + 
                              (onlineOnly ? 1 : 0);

    const filtered = users.filter((u) => {
        if (filterCity !== "All" && u.city !== filterCity) return false;
        if (filterTag !== "All" && !u.tags.some(tag => tag.trim() === filterTag)) return false;
        if (searchQ) {
            const q = searchQ.toLowerCase();
            const nameMatch = u.name && u.name.toLowerCase().includes(q);
            const cityMatch = u.city && u.city.toLowerCase().includes(q);
            if (!nameMatch && !cityMatch) return false;
        }

        const price = parseInt(u.price || 1000);
        if (price > maxPrice) return false;

        if (ageRange !== "All" && u.age) {
            const age = parseInt(u.age);
            if (ageRange === "18-22" && (age < 18 || age > 22)) return false;
            if (ageRange === "23-27" && (age < 23 || age > 27)) return false;
            if (ageRange === "28+" && age < 28) return false;
        }

        if (onlineOnly && u.show_online === false) return false;

        return true;
    });

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
        <div className="pt-16 min-h-[100dvh] bg-[#0D0D1A]">
            <div className="max-w-5xl mx-auto px-6 py-8">
                <h1 className="text-3xl font-bold mb-1">
                    Find a{" "}
                    <span className="bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
                        Companion
                    </span>
                </h1>
                <p className="text-sm text-gray-400 mb-6">{filtered.length} profiles available</p>

                <div className="relative mb-4">
                    <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-base" />
                    <input
                        className="w-full bg-[#16162A] border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-gray-500 outline-none focus:border-pink-500 transition"
                        placeholder="Search by name or city..."
                        value={searchQ}
                        onChange={(e) => setSearchQ(e.target.value)}
                    />
                </div>

                <div className="flex gap-2 flex-wrap items-center mb-5 pb-3 border-b border-white/5">
                    <span className="text-xs text-gray-500">View:</span>
                    {[
                        { v: "girl", l: "Girls Only", icon: <FiUser size={13} /> },
                        { v: "boy", l: "Boys Only", icon: <FiUser size={13} /> },
                        { v: "all", l: "Show All", icon: <FiUsers size={13} /> }
                    ].map((g) => (
                        <button
                            key={g.v}
                            onClick={() => setGenderFilter(g.v)}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all duration-300 flex items-center gap-1.5 ${genderFilter === g.v
                                ? g.v === "girl"
                                    ? "bg-pink-500/10 border-pink-500 text-pink-400 shadow-[0_0_12px_rgba(236,72,153,0.2)]"
                                    : g.v === "boy"
                                        ? "bg-blue-500/10 border-blue-500 text-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.2)]"
                                        : "bg-purple-500/10 border-purple-500 text-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.2)]"
                                : "border-white/5 bg-[#121224]/30 text-gray-400 hover:border-white/20 hover:text-white"
                            }`}
                        >
                            {g.icon}
                            {g.l}
                        </button>
                    ))}
                </div>

                {/* Advanced Filters Toggle Bar */}
                <div className="flex items-center justify-between mb-4">
                    <button
                        onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold border flex items-center gap-2 transition ${
                            showAdvancedFilters || activeFilterCount > 0
                                ? "bg-pink-500/10 border-pink-500 text-pink-400 shadow-md"
                                : "bg-[#16162A] border-white/10 text-gray-300 hover:border-white/20"
                        }`}
                    >
                        <FiFilter size={14} />
                        <span>Filters</span>
                        {activeFilterCount > 0 && (
                            <span className="w-5 h-5 bg-pink-500 text-white rounded-full text-[10px] font-extrabold flex items-center justify-center">
                                {activeFilterCount}
                            </span>
                        )}
                    </button>

                    {activeFilterCount > 0 && (
                        <button
                            onClick={handleResetFilters}
                            className="text-xs text-gray-400 hover:text-red-400 flex items-center gap-1.5 transition"
                        >
                            <FiRotateCcw size={12} /> Reset All
                        </button>
                    )}
                </div>

                {/* Collapsible Filters Card */}
                {showAdvancedFilters && (
                    <div className="bg-[#16162A] border border-white/10 rounded-2xl p-5 mb-6 space-y-4 animate-fadeIn">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {/* Max Hourly Rate Filter */}
                            <div>
                                <div className="flex justify-between items-center mb-1.5">
                                    <label className="text-xs font-semibold text-gray-300">Max Price Per Hour</label>
                                    <span className="text-xs font-bold text-pink-400">₹{maxPrice}</span>
                                </div>
                                <input
                                    type="range"
                                    min="300"
                                    max="5000"
                                    step="100"
                                    value={maxPrice}
                                    onChange={(e) => setMaxPrice(parseInt(e.target.value))}
                                    className="w-full accent-pink-500 bg-white/10 h-1.5 rounded-lg appearance-none cursor-pointer"
                                />
                            </div>

                            {/* Age Bracket Filter */}
                            <div>
                                <label className="text-xs font-semibold text-gray-300 block mb-1.5">Age Range</label>
                                <div className="flex gap-1.5">
                                    {AGE_RANGES.map((range) => (
                                        <button
                                            key={range}
                                            onClick={() => setAgeRange(range)}
                                            className={`px-3 py-1 rounded-lg text-xs font-bold border transition ${
                                                ageRange === range
                                                    ? "bg-pink-500/20 border-pink-500 text-pink-300"
                                                    : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
                                            }`}
                                        >
                                            {range}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Instant Online Availability Toggle */}
                            <div className="flex items-center justify-between sm:justify-start gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
                                <div>
                                    <div className="text-xs font-semibold text-white">Online Now Only</div>
                                    <div className="text-[10px] text-gray-400">Show active companions</div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer select-none ml-auto">
                                    <input
                                        type="checkbox"
                                        checked={onlineOnly}
                                        onChange={(e) => setOnlineOnly(e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-9 h-5 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-pink-500"></div>
                                </label>
                            </div>
                        </div>
                    </div>
                )}

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
                            {filtered.map((u) => {
                                const isTargetGirl = u.role === 'girl';
                                return (
                                    <div
                                        key={u.id}
                                        className={`bg-[#16162A] border border-white/5 rounded-2xl overflow-hidden cursor-pointer hover:-translate-y-1 transition flex flex-col ${isTargetGirl ? 'hover:border-pink-500/30' : 'hover:border-blue-500/30'}`}
                                        onClick={() => handleProfileClick(u)}
                                    >
                                        <div className={`relative h-48 flex items-center justify-center bg-gradient-to-br ${isTargetGirl ? 'from-pink-500/20 to-purple-500/20' : 'from-blue-500/20 to-indigo-500/20'}`}>
                                            {u.profile_pic ? (
                                                <img
                                                    src={u.profile_pic}
                                                    alt={u.name}
                                                    className="w-full h-full object-cover transition duration-500 hover:scale-110"
                                                />
                                            ) : (
                                                <div className="text-5xl text-white/30 flex items-center justify-center">
                                                    <FiUser />
                                                </div>
                                            )}

                                            {u.kyc_status === 'verified' && (
                                                <div className="absolute top-3 left-3 bg-purple-500/20 border border-purple-500/40 rounded-full px-2 py-0.5 text-xs text-purple-300 backdrop-blur-sm">
                                                    ✓ Verified
                                                </div>
                                            )}
                                            <div className="absolute bottom-0 w-full bg-gradient-to-t from-[#16162A] to-transparent h-16" />
                                        </div>

                                        <div className="p-4 flex-1 flex flex-col">
                                            <div className="flex flex-col">
                                                <span className="text-base font-bold text-white leading-tight">{u.name}</span>
                                                <span className="text-[10px] text-gray-400 font-semibold tracking-wide">@{u.username || u.name.toLowerCase().replace(/\s+/g, '')}</span>
                                            </div>
                                            <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-0.5">
                                                <FiMapPin size={12} className="text-gray-500 shrink-0" />
                                                <span>{u.city || "Unknown"} · {u.age || "N/A"} years</span>
                                            </div>
                                            <div className="text-xs text-yellow-400 mt-1 flex items-center gap-0.5">
                                                <FiStar size={12} className="text-yellow-400 fill-yellow-400 shrink-0" />
                                                <span>
                                                    {u.avg_rating > 0 ? `${u.avg_rating} ` : "New "}
                                                    <span className="text-gray-500">
                                                        {u.avg_rating > 0 ? `(${u.review_count} reviews)` : ""}
                                                    </span>
                                                </span>
                                            </div>

                                            <div className="mt-auto pt-4 flex items-center justify-between">
                                                <div>
                                                    <span className={`text-lg font-bold ${isTargetGirl ? 'text-pink-400' : 'text-blue-400'}`}>₹{u.price || 1000}</span>
                                                    <span className="text-xs text-gray-500">/hr</span>
                                                </div>
                                                <button className={`px-3 py-1.5 text-white text-xs rounded-xl font-semibold hover:opacity-85 transition ${isTargetGirl ? 'bg-gradient-to-r from-pink-500 to-purple-500' : 'bg-gradient-to-r from-blue-500 to-indigo-500'}`}>
                                                    View Profile
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                    </div>
                )}
            </div>
        </div>
    );
}

export default FindPage;