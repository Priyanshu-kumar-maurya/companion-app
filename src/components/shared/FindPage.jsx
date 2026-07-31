import React, { useState, useEffect } from "react";
import { PAGES } from "../../App";
import { FiSearch, FiUsers, FiUser, FiMapPin, FiStar, FiFilter, FiRotateCcw, FiNavigation } from "react-icons/fi";

const CITIES = ["All", "Mumbai", "Delhi", "Pune", "Bangalore", "Chennai", "Hyderabad", "Jaipur"];
const ALL_TAGS = ["All", "Coffee Date", "Movie", "Shopping", "Study Partner", "Dinner", "Events", "Walk", "Gaming"];
const AGE_RANGES = ["All", "18-22", "23-27", "28+"];

function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371; // Radius of earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c;
    return Math.round(d * 10) / 10;
}

function FindPage({ setPage, setSelectedGirl, currentUser }) {
    const [searchQ, setSearchQ] = useState("");
    const [filterCity, setFilterCity] = useState("All");
    const [filterTag, setFilterTag] = useState("All");
    const [maxPrice, setMaxPrice] = useState(5000);
    const [ageRange, setAgeRange] = useState("All");
    const [onlineOnly, setOnlineOnly] = useState(false);
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

    const [userLoc, setUserLoc] = useState(null);
    const [locLoading, setLocLoading] = useState(false);
    const [sortBy, setSortBy] = useState("default");

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    const [genderFilter, setGenderFilter] = useState(currentUser?.role === "girl" ? "boy" : "girl");

    const getUserLocation = () => {
        if (!navigator.geolocation) {
            alert("Geolocation is not supported by your browser.");
            return;
        }
        setLocLoading(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                setUserLoc(loc);
                setLocLoading(false);
                setSortBy("distance");

                if (currentUser) {
                    const token = localStorage.getItem("token");
                    fetch(`https://rentgf-and-bf.onrender.com/api/users/${currentUser.id}`, {
                        method: "PUT",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            latitude: pos.coords.latitude,
                            longitude: pos.coords.longitude
                        })
                    }).catch(console.error);
                }
            },
            (err) => {
                console.error("Location error:", err);
                setLocLoading(false);
                alert("Please allow location access to find nearby companions.");
            },
            { enableHighAccuracy: true }
        );
    };

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
        setSortBy("default");
    };

    const activeFilterCount = (filterCity !== "All" ? 1 : 0) + 
                              (filterTag !== "All" ? 1 : 0) + 
                              (maxPrice < 5000 ? 1 : 0) + 
                              (ageRange !== "All" ? 1 : 0) + 
                              (onlineOnly ? 1 : 0) +
                              (sortBy !== "default" ? 1 : 0);

    const filtered = users.map((u) => {
        let dist = null;
        if (userLoc && u.latitude && u.longitude) {
            dist = getDistanceFromLatLonInKm(userLoc.lat, userLoc.lng, parseFloat(u.latitude), parseFloat(u.longitude));
        }
        return { ...u, distanceKm: dist };
    }).filter((u) => {
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
    }).sort((a, b) => {
        if (sortBy === "distance") {
            if (a.distanceKm !== null && b.distanceKm !== null) return a.distanceKm - b.distanceKm;
            if (a.distanceKm !== null) return -1;
            if (b.distanceKm !== null) return 1;
            return 0;
        }
        if (sortBy === "rating") return (b.avg_rating || 0) - (a.avg_rating || 0);
        if (sortBy === "price_low") return (a.price || 1000) - (b.price || 1000);
        if (sortBy === "price_high") return (b.price || 1000) - (a.price || 1000);
        return 0;
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

                {/* Search Bar + Geolocation Button */}
                <div className="flex flex-col sm:flex-row gap-3 mb-4">
                    <div className="relative flex-1">
                        <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-base" />
                        <input
                            className="w-full bg-[#16162A] border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-gray-500 outline-none focus:border-pink-500 transition"
                            placeholder="Search by name or city..."
                            value={searchQ}
                            onChange={(e) => setSearchQ(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={getUserLocation}
                        disabled={locLoading}
                        className={`px-4 py-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-2 transition shrink-0 ${
                            userLoc
                                ? "bg-pink-500/20 border-pink-500 text-pink-300 shadow-[0_0_12px_rgba(236,72,153,0.3)]"
                                : "bg-[#16162A] border-white/10 text-gray-300 hover:border-pink-500/40 hover:text-white"
                        }`}
                    >
                        <FiNavigation size={14} className={locLoading ? "animate-spin" : (userLoc ? "text-pink-400" : "")} />
                        <span>{locLoading ? "Locating..." : userLoc ? "📍 Near Me Active" : "📍 Find Near Me"}</span>
                    </button>
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

                {/* Advanced Filters Toggle Bar + Sort Dropdown */}
                <div className="flex items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-2">
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
                                className="text-xs text-gray-400 hover:text-red-400 flex items-center gap-1.5 transition ml-1"
                            >
                                <FiRotateCcw size={12} /> Reset All
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 hidden sm:inline">Sort:</span>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="bg-[#16162A] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-pink-500 transition cursor-pointer"
                        >
                            <option value="default">Default</option>
                            <option value="distance">Nearest First 📍</option>
                            <option value="rating">Highest Rated ⭐</option>
                            <option value="price_low">Price: Low to High 📈</option>
                            <option value="price_high">Price: High to Low 📉</option>
                        </select>
                    </div>
                </div>

                {/* Collapsible Filters Card */}
                {showAdvancedFilters && (
                    <div className="bg-[#16162A] border border-pink-500/20 rounded-2xl p-5 mb-6 space-y-5 animate-fade-in shadow-xl">
                        {/* Price Range Slider */}
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-xs font-semibold text-gray-300">Max Hourly Rate</label>
                                <span className="text-xs font-bold text-pink-400">Up to ₹{maxPrice.toLocaleString()}/hr</span>
                            </div>
                            <input
                                type="range"
                                min="300"
                                max="5000"
                                step="100"
                                value={maxPrice}
                                onChange={(e) => setMaxPrice(parseInt(e.target.value))}
                                className="w-full accent-pink-500 bg-white/10 h-1.5 rounded-lg cursor-pointer"
                            />
                            <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                                <span>₹300</span>
                                <span>₹2,500</span>
                                <span>₹5,000+</span>
                            </div>
                        </div>

                        {/* Age Bracket Filter */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-300 mb-2">Age Bracket</label>
                            <div className="flex gap-2 flex-wrap">
                                {AGE_RANGES.map((range) => (
                                    <button
                                        key={range}
                                        onClick={() => setAgeRange(range)}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition ${
                                            ageRange === range
                                                ? "bg-purple-500/20 border-purple-500 text-purple-300 font-bold"
                                                : "border-white/10 text-gray-400 hover:border-white/20"
                                        }`}
                                    >
                                        {range === "All" ? "All Ages" : `${range} yrs`}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Online Status Toggle */}
                        <div className="flex items-center justify-between pt-2 border-t border-white/5">
                            <div>
                                <div className="text-xs font-semibold text-gray-300">Online Now Only</div>
                                <div className="text-[10px] text-gray-500">Show only active companions currently online</div>
                            </div>
                            <button
                                onClick={() => setOnlineOnly(!onlineOnly)}
                                className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ${
                                    onlineOnly ? "bg-emerald-500" : "bg-white/10"
                                }`}
                            >
                                <div
                                    className={`w-4 h-4 rounded-full bg-white transition-transform duration-300 ${
                                        onlineOnly ? "translate-x-6" : "translate-x-0"
                                    }`}
                                />
                            </button>
                        </div>
                    </div>
                )}

                {/* Cities Quick Filter Pills */}
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
                                            <div className="text-xs text-gray-400 mt-0.5 flex items-center justify-between">
                                                <div className="flex items-center gap-0.5">
                                                    <FiMapPin size={12} className="text-gray-500 shrink-0" />
                                                    <span>{u.city || "Unknown"} · {u.age || "N/A"} yrs</span>
                                                </div>
                                                {u.distanceKm !== null && (
                                                    <span className="text-[10px] font-bold text-pink-400 bg-pink-500/10 px-2 py-0.5 rounded-full border border-pink-500/20">
                                                        📍 {u.distanceKm} km away
                                                    </span>
                                                )}
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