import React, { useState, useEffect } from "react";
import { PAGES } from "../../App";
import {
  FiSearch,
  FiUsers,
  FiUser,
  FiMapPin,
  FiStar,
  FiFilter,
  FiRotateCcw,
  FiNavigation,
  FiHeart,
  FiGrid,
  FiMap,
  FiZap,
  FiCheckCircle,
  FiGlobe,
  FiX,
  FiSliders,
} from "react-icons/fi";
import StoriesBar from "./StoriesBar";
import CompanionMapView from "./CompanionMapView";
import VerifiedBadge from "./VerifiedBadge";
import { CompanionGridSkeleton } from "./SkeletonLoaders";
import { formatLocation } from "../../utils/formatUtils";

// Backend API Base Configuration
const API_BASE = process.env.REACT_APP_API_URL || "https://rentgf-and-bf.onrender.com";
const API = `${API_BASE}/api`;

const CITIES = ["All", "Mumbai", "Delhi", "Pune", "Bangalore", "Chennai", "Hyderabad", "Jaipur"];
const ALL_TAGS = [
  "All",
  "Coffee Date",
  "Movie",
  "Shopping",
  "Study Partner",
  "Dinner",
  "Events",
  "Walk",
  "Gaming",
];
const AGE_RANGES = ["All", "18-22", "23-27", "28+"];
const LANGUAGES = [
  "All",
  "Hindi",
  "English",
  "Punjabi",
  "Marathi",
  "Bengali",
  "Gujarati",
  "Tamil",
  "Telugu",
];

const QUICK_CATEGORIES = [
  { id: "all", label: "✨ All", type: "all" },
  { id: "Coffee Date", label: "☕ Coffee Date", type: "tag", value: "Coffee Date" },
  { id: "Movie", label: "🎬 Movies", type: "tag", value: "Movie" },
  { id: "Dinner", label: "🍽️ Dinner", type: "tag", value: "Dinner" },
  { id: "today", label: "⚡ Available Today", type: "today" },
  { id: "verified", label: "🛡️ Verified", type: "verified" },
  { id: "online", label: "🟢 Online Now", type: "online" },
  { id: "Shopping", label: "🛍️ Shopping", type: "tag", value: "Shopping" },
  { id: "Gaming", label: "🎮 Gaming", type: "tag", value: "Gaming" },
  { id: "top_rated", label: "⭐ Top Rated", type: "sort", value: "rating" },
  { id: "Study Partner", label: "📚 Study Partner", type: "tag", value: "Study Partner" },
  { id: "Events", label: "🎉 Events", type: "tag", value: "Events" },
  { id: "Walk", label: "🚶 Walk", type: "tag", value: "Walk" },
];

function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371; // Radius of earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return Math.round(d * 10) / 10;
}

function FindPage({ setPage, setSelectedGirl, currentUser, socket, onBack }) {
  const [searchQ, setSearchQ] = useState("");
  const [filterCity, setFilterCity] = useState("All");
  const [filterTag, setFilterTag] = useState("All");
  const [maxPrice, setMaxPrice] = useState(5000);
  const [budgetPreset, setBudgetPreset] = useState("all"); // 'all' | 'under1000' | '1000-2500' | '2500plus'
  const [ageRange, setAgeRange] = useState("All");
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [availableTodayOnly, setAvailableTodayOnly] = useState(false);
  const [languageFilter, setLanguageFilter] = useState("All");
  const [showFilterModal, setShowFilterModal] = useState(false);

  // Real-time online users set via Socket
  const [liveOnlineIds, setLiveOnlineIds] = useState(new Set());

  const [userLoc, setUserLoc] = useState(null);
  const [locLoading, setLocLoading] = useState(false);
  const [sortBy, setSortBy] = useState("default");

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [favIds, setFavIds] = useState(new Set());
  const [viewMode, setViewMode] = useState("insta"); // 'insta' | 'grid' | 'map'

  const [genderFilter, setGenderFilter] = useState(currentUser?.role === "girl" ? "boy" : "girl");

  // Fetch favorited IDs
  useEffect(() => {
    if (!currentUser) return;
    const token = localStorage.getItem("token");
    if (!token) return;

    fetch(`${API}/favorites`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data)) {
          setFavIds(new Set(data.map((f) => f.id)));
        }
      })
  }, [currentUser]);

  // Real-time online user tracking via Socket
  useEffect(() => {
    if (!socket) return;

    const handleUpdateOnlineUsers = (onlineList) => {
      if (Array.isArray(onlineList)) {
        setLiveOnlineIds(new Set(onlineList.map(String)));
      }
    };

    socket.on("update_online_users", handleUpdateOnlineUsers);

    return () => {
      socket.off("update_online_users", handleUpdateOnlineUsers);
    };
  }, [socket]);

  const handleQuickFavorite = async (e, companionId) => {
    e.stopPropagation();
    if (!currentUser) {
      alert("Please login first to add companions to your favorites!");
      return;
    }

    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API}/favorites/toggle`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ companion_id: companionId }),
      });
      const data = await res.json();
      if (res.ok) {
        setFavIds((prev) => {
          const next = new Set(prev);
          if (data.isFavorited) next.add(companionId);
          else next.delete(companionId);
          return next;
        });
      }
    } catch (err) {
      console.error("Quick favorite error:", err);
    }
  };

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
          fetch(`${API}/users/${currentUser.id}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
            }),
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
        const url = genderFilter === "all" ? `${API}/users` : `${API}/users?role=${genderFilter}`;

        const response = await fetch(url, { headers });
        const data = await response.json();

        if (response.ok) {
          const formattedData = data.map((user) => ({
            ...user,
            tags: user.tags
              ? typeof user.tags === "string"
                ? user.tags.split(",")
                : user.tags
              : ["Coffee Date", "Movie"],
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
    setBudgetPreset("all");
    setAgeRange("All");
    setOnlineOnly(false);
    setVerifiedOnly(false);
    setAvailableTodayOnly(false);
    setLanguageFilter("All");
    setSortBy("default");
  };

  const activeFilterCount =
    (filterCity !== "All" ? 1 : 0) +
    (filterTag !== "All" ? 1 : 0) +
    (maxPrice < 5000 || budgetPreset !== "all" ? 1 : 0) +
    (ageRange !== "All" ? 1 : 0) +
    (onlineOnly ? 1 : 0) +
    (verifiedOnly ? 1 : 0) +
    (availableTodayOnly ? 1 : 0) +
    (languageFilter !== "All" ? 1 : 0) +
    (sortBy !== "default" ? 1 : 0);

  const handleCategoryClick = (cat) => {
    if (cat.type === "all") {
      setFilterTag("All");
      setAvailableTodayOnly(false);
      setVerifiedOnly(false);
      setOnlineOnly(false);
      if (sortBy === "rating") setSortBy("default");
    } else if (cat.type === "tag") {
      setFilterTag((prev) => (prev === cat.value ? "All" : cat.value));
    } else if (cat.type === "today") {
      setAvailableTodayOnly((prev) => !prev);
    } else if (cat.type === "verified") {
      setVerifiedOnly((prev) => !prev);
    } else if (cat.type === "online") {
      setOnlineOnly((prev) => !prev);
    } else if (cat.type === "sort") {
      setSortBy((prev) => (prev === cat.value ? "default" : cat.value));
    }
  };

  const isCategoryActive = (cat) => {
    if (cat.type === "all") {
      return (
        filterTag === "All" &&
        !availableTodayOnly &&
        !verifiedOnly &&
        !onlineOnly &&
        sortBy !== "rating"
      );
    }
    if (cat.type === "tag") return filterTag === cat.value;
    if (cat.type === "today") return availableTodayOnly;
    if (cat.type === "verified") return verifiedOnly;
    if (cat.type === "online") return onlineOnly;
    if (cat.type === "sort") return sortBy === cat.value;
    return false;
  };

  const filtered = users
    .map((u) => {
      let dist = null;
      if (userLoc && u.latitude && u.longitude) {
        dist = getDistanceFromLatLonInKm(
          userLoc.lat,
          userLoc.lng,
          parseFloat(u.latitude),
          parseFloat(u.longitude)
        );
      }
      return { ...u, distanceKm: dist };
    })
    .filter((u) => {
      if (filterCity !== "All" && u.city !== filterCity) return false;
      if (filterTag !== "All" && !u.tags.some((tag) => tag.trim() === filterTag)) return false;
      if (searchQ) {
        const q = searchQ.toLowerCase();
        const nameMatch = u.name && u.name.toLowerCase().includes(q);
        const cityMatch = u.city && u.city.toLowerCase().includes(q);
        const bioMatch = u.bio && u.bio.toLowerCase().includes(q);
        if (!nameMatch && !cityMatch && !bioMatch) return false;
      }

      // Verified only filter
      if (verifiedOnly && !(u.kyc_status === "verified" || u.is_verified)) return false;

      // Online only filter (Check real-time socket online status if available, fallback to u.show_online)
      if (onlineOnly) {
        const isLive = liveOnlineIds.has(String(u.id));
        if (liveOnlineIds.size > 0 ? !isLive : u.show_online === false) return false;
      }

      // Available Today / Instant Meetup filter
      if (availableTodayOnly) {
        const tagsStr = Array.isArray(u.tags) ? u.tags.join(" ") : u.tags || "";
        const bioStr = u.bio || "";
        const combined = `${tagsStr} ${bioStr}`.toLowerCase();
        const isAvailableToday =
          combined.includes("today") ||
          combined.includes("instant") ||
          combined.includes("coffee") ||
          combined.includes("now") ||
          u.is_instant_available;
        if (!isAvailableToday) return false;
      }

      // Language filter
      if (languageFilter !== "All") {
        const combined = `${u.bio || ""} ${Array.isArray(u.tags) ? u.tags.join(" ") : u.tags || ""}`.toLowerCase();
        if (!combined.includes(languageFilter.toLowerCase())) return false;
      }

      // Budget filter
      const price = parseInt(u.price || 1000);
      if (budgetPreset === "under1000" && price > 1000) return false;
      if (budgetPreset === "1000-2500" && (price < 1000 || price > 2500)) return false;
      if (budgetPreset === "2500plus" && price < 2500) return false;
      if (price > maxPrice) return false;

      if (ageRange !== "All" && u.age) {
        const age = parseInt(u.age);
        if (ageRange === "18-22" && (age < 18 || age > 22)) return false;
        if (ageRange === "23-27" && (age < 23 || age > 27)) return false;
        if (ageRange === "28+" && age < 28) return false;
      }

      return true;
    })
    .sort((a, b) => {
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

  const hasActiveFilters = activeFilterCount > 0 || Boolean(searchQ);

  const handleProfileClick = (profile) => {
    setSelectedGirl(profile);
    setPage(PAGES.DETAILS);
  };

  return (
    <div className="pt-16 min-h-[100dvh] bg-[#0D0D1A]">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-4">
          <button
            type="button"
            onClick={() => {
              if (typeof onBack === "function") {
                onBack();
              } else {
                window.dispatchEvent(new CustomEvent("app_go_back"));
              }
            }}
            className="inline-flex items-center gap-2 text-xs font-semibold text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 px-3.5 py-2 rounded-xl transition border border-white/5 active:scale-95"
          >
            <span>←</span>
            <span>Back</span>
          </button>
        </div>
        <h1 className="text-3xl font-bold mb-1">
          Find a{" "}
          <span className="bg-gradient-to-r from-[#f9ce3f] via-[#e1306c] to-[#833ab4] bg-clip-text text-transparent">
            Companion
          </span>
        </h1>
        <p className="text-sm text-gray-400 mb-4">{filtered.length} profiles available</p>

        {/* 24-Hour Ephemeral Stories Bar */}
        <StoriesBar currentUser={currentUser} />

        {/* ─── UNIFIED SEARCH & CONTROLS BAR (Single Row) ─── */}
        <div className="flex items-center gap-2 mb-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-sm" />
            <input
              type="text"
              className="w-full bg-[#121212] border border-[#262626] rounded-xl pl-9 pr-8 py-2.5 text-xs sm:text-sm text-white placeholder-gray-500 outline-none focus:border-[#e1306c] transition"
              placeholder="Search companion, city, vibes..."
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
            />
            {searchQ && (
              <button
                type="button"
                onClick={() => setSearchQ("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition"
              >
                <FiX size={14} />
              </button>
            )}
          </div>

          {/* Near Me Geo Button */}
          <button
            type="button"
            onClick={getUserLocation}
            disabled={locLoading}
            className={`px-3 py-2.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition shrink-0 ${
              userLoc
                ? "bg-pink-500/20 border-pink-500 text-pink-300 shadow-sm"
                : "bg-[#121212] border-[#262626] text-gray-300 hover:border-[#e1306c]/40 hover:text-white"
            }`}
            title={userLoc ? "Near Me Active" : "Find Near Me"}
          >
            <FiNavigation
              size={13}
              className={locLoading ? "animate-spin" : userLoc ? "text-pink-400" : ""}
            />
            <span className="hidden sm:inline">
              {locLoading ? "Locating..." : userLoc ? "Near Me" : "Near Me"}
            </span>
          </button>

          {/* Filters Sheet Trigger Button */}
          <button
            type="button"
            onClick={() => setShowFilterModal(true)}
            className={`px-3 py-2.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition shrink-0 ${
              activeFilterCount > 0
                ? "bg-gradient-to-r from-[#f9ce3f]/20 via-[#e1306c]/20 to-[#833ab4]/20 border-[#e1306c] text-pink-300 shadow-md"
                : "bg-[#121212] border-[#262626] text-gray-300 hover:border-white/20"
            }`}
            title="Open Filters and Preferences"
          >
            <FiSliders size={13} />
            <span className="hidden sm:inline">Filters</span>
            {activeFilterCount > 0 && (
              <span className="w-4 h-4 bg-gradient-to-tr from-[#f9ce3f] to-[#e1306c] text-white rounded-full text-[10px] font-extrabold flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* View Switcher: Insta 3x3 Grid | Cards | Map */}
          <div className="flex items-center bg-[#121212] border border-[#262626] rounded-xl p-0.5 shrink-0">
            <button
              type="button"
              onClick={() => setViewMode("insta")}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition ${
                viewMode === "insta"
                  ? "bg-gradient-to-r from-[#f9ce3f] via-[#e1306c] to-[#833ab4] text-white shadow-sm"
                  : "text-gray-400 hover:text-white"
              }`}
              title="Instagram 3x3 Explore Grid"
            >
              <span>📸</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition ${
                viewMode === "grid"
                  ? "bg-[#262626] text-white shadow-sm"
                  : "text-gray-400 hover:text-white"
              }`}
              title="Cards View"
            >
              <FiGrid size={13} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("map")}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition ${
                viewMode === "map"
                  ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-sm"
                  : "text-gray-400 hover:text-white"
              }`}
              title="Interactive Map"
            >
              <FiMap size={13} />
            </button>
          </div>
        </div>

        {/* ─── SINGLE ROW HORIZONTAL CATEGORIES (Instagram Explore Style) ─── */}
        <div
          className="flex items-center gap-2 overflow-x-auto pb-2 mb-5 scrollbar-none"
          style={{ scrollbarWidth: "none" }}
        >
          {QUICK_CATEGORIES.map((cat) => {
            const active = isCategoryActive(cat);
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleCategoryClick(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 border shrink-0 active:scale-95 ${
                  active
                    ? "bg-gradient-to-r from-[#f9ce3f] via-[#e1306c] to-[#833ab4] text-white border-transparent shadow-md"
                    : "bg-[#121212] border-[#262626] text-gray-300 hover:border-white/25 hover:text-white"
                }`}
              >
                {cat.label}
              </button>
            );
          })}

          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-3 py-1.5 rounded-full text-xs font-bold text-rose-400 hover:text-rose-300 bg-rose-500/10 border border-rose-500/20 whitespace-nowrap transition shrink-0 flex items-center gap-1 active:scale-95"
            >
              <FiRotateCcw size={11} />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* ─── FILTER BOTTOM SHEET / MODAL ─── */}
        {showFilterModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in p-0 sm:p-4">
            <div
              className="absolute inset-0"
              onClick={() => setShowFilterModal(false)}
            />

            <div
              className="relative z-10 w-full sm:max-w-lg bg-[#121212] border border-[#262626] rounded-t-3xl sm:rounded-2xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#262626]">
                <div className="flex items-center gap-2">
                  <FiSliders size={16} className="text-[#e1306c]" />
                  <h2 className="text-base font-bold text-white">Filters & Preferences</h2>
                  {activeFilterCount > 0 && (
                    <span className="text-[10px] bg-gradient-to-r from-[#f9ce3f] to-[#e1306c] text-white px-2 py-0.5 rounded-full font-bold">
                      {activeFilterCount} Active
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {activeFilterCount > 0 && (
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="text-xs text-gray-400 hover:text-rose-400 font-semibold transition"
                    >
                      Reset
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowFilterModal(false)}
                    className="w-8 h-8 rounded-full bg-[#1e1e1e] hover:bg-[#2a2a2a] flex items-center justify-center text-gray-400 hover:text-white transition"
                  >
                    <FiX size={16} />
                  </button>
                </div>
              </div>

              {/* Scrollable Body */}
              <div className="px-5 py-4 overflow-y-auto space-y-5 text-xs text-gray-300">
                {/* 1. Companion Type (Gender) */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                    Companion Type
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { v: "girl", l: "Girls Only", icon: <FiUser size={13} /> },
                      { v: "boy", l: "Boys Only", icon: <FiUser size={13} /> },
                      { v: "all", l: "Show All", icon: <FiUsers size={13} /> },
                    ].map((g) => (
                      <button
                        key={g.v}
                        type="button"
                        onClick={() => setGenderFilter(g.v)}
                        className={`py-2 px-3 rounded-xl font-bold border transition flex items-center justify-center gap-1.5 ${
                          genderFilter === g.v
                            ? "bg-gradient-to-r from-[#f9ce3f]/20 via-[#e1306c]/20 to-[#833ab4]/20 border-[#e1306c] text-white shadow-sm"
                            : "bg-[#181818] border-[#262626] text-gray-400 hover:text-white"
                        }`}
                      >
                        {g.icon}
                        <span>{g.l}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Sort Companions By */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                    Sort Companions By
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      { id: "default", l: "Default" },
                      { id: "distance", l: "Nearest First 📍" },
                      { id: "rating", l: "Highest Rated ⭐" },
                      { id: "price_low", l: "Price: Low to High" },
                      { id: "price_high", l: "Price: High to Low" },
                    ].map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSortBy(s.id)}
                        className={`py-2 px-2.5 rounded-xl text-center font-semibold border transition ${
                          sortBy === s.id
                            ? "bg-[#e1306c]/20 border-[#e1306c] text-pink-300 font-bold"
                            : "bg-[#181818] border-[#262626] text-gray-400 hover:text-white"
                        }`}
                      >
                        {s.l}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. City Selection */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                    City
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {CITIES.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setFilterCity(c)}
                        className={`px-3 py-1.5 rounded-full border transition font-medium ${
                          filterCity === c
                            ? "bg-[#e1306c]/20 border-[#e1306c] text-pink-300 font-bold"
                            : "bg-[#181818] border-[#262626] text-gray-400 hover:text-white"
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. Quick Status & Verification */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                    Status & Verification
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {/* Verified Only */}
                    <button
                      type="button"
                      onClick={() => setVerifiedOnly((prev) => !prev)}
                      className={`p-2.5 rounded-xl border flex items-center justify-between text-left transition ${
                        verifiedOnly
                          ? "bg-sky-500/20 border-sky-400 text-sky-300"
                          : "bg-[#181818] border-[#262626] text-gray-400 hover:text-white"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold">
                        <VerifiedBadge size="xs" />
                        <span>Verified Only</span>
                      </div>
                      <div className={`w-3.5 h-3.5 rounded-full border ${verifiedOnly ? "bg-sky-400 border-sky-400" : "border-gray-500"}`} />
                    </button>

                    {/* Online Now */}
                    <button
                      type="button"
                      onClick={() => setOnlineOnly((prev) => !prev)}
                      className={`p-2.5 rounded-xl border flex items-center justify-between text-left transition ${
                        onlineOnly
                          ? "bg-emerald-500/20 border-emerald-400 text-emerald-300"
                          : "bg-[#181818] border-[#262626] text-gray-400 hover:text-white"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span>Online Now</span>
                      </div>
                      <div className={`w-3.5 h-3.5 rounded-full border ${onlineOnly ? "bg-emerald-400 border-emerald-400" : "border-gray-500"}`} />
                    </button>

                    {/* Available Today */}
                    <button
                      type="button"
                      onClick={() => setAvailableTodayOnly((prev) => !prev)}
                      className={`p-2.5 rounded-xl border flex items-center justify-between text-left transition ${
                        availableTodayOnly
                          ? "bg-amber-500/20 border-amber-400 text-amber-300"
                          : "bg-[#181818] border-[#262626] text-gray-400 hover:text-white"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold">
                        <FiZap size={13} className="text-amber-400" />
                        <span>Available Today</span>
                      </div>
                      <div className={`w-3.5 h-3.5 rounded-full border ${availableTodayOnly ? "bg-amber-400 border-amber-400" : "border-gray-500"}`} />
                    </button>
                  </div>
                </div>

                {/* 5. Hourly Budget */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                      Hourly Budget
                    </label>
                    <span className="text-xs font-bold text-pink-400">
                      {budgetPreset === "under1000"
                        ? "Under ₹1,000/hr"
                        : budgetPreset === "1000-2500"
                        ? "₹1,000 – ₹2,500/hr"
                        : budgetPreset === "2500plus"
                        ? "₹2,500+/hr"
                        : `Up to ₹${maxPrice.toLocaleString()}/hr`}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-2 mb-3">
                    {[
                      { id: "all", label: "All Rates" },
                      { id: "under1000", label: "Under ₹1k" },
                      { id: "1000-2500", label: "₹1k - ₹2.5k" },
                      { id: "2500plus", label: "₹2.5k+" },
                    ].map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => {
                          setBudgetPreset(b.id);
                          if (b.id === "under1000") setMaxPrice(1000);
                          else if (b.id === "1000-2500") setMaxPrice(2500);
                          else if (b.id === "2500plus") setMaxPrice(5000);
                          else setMaxPrice(5000);
                        }}
                        className={`py-1.5 px-1 rounded-xl text-center font-medium border transition ${
                          budgetPreset === b.id
                            ? "bg-[#e1306c]/20 border-[#e1306c] text-pink-300 font-bold"
                            : "bg-[#181818] border-[#262626] text-gray-400 hover:text-white"
                        }`}
                      >
                        {b.label}
                      </button>
                    ))}
                  </div>

                  <input
                    type="range"
                    min="300"
                    max="5000"
                    step="100"
                    value={maxPrice}
                    onChange={(e) => {
                      setMaxPrice(parseInt(e.target.value));
                      setBudgetPreset("all");
                    }}
                    className="w-full accent-[#e1306c] bg-white/10 h-1.5 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                    <span>₹300</span>
                    <span>₹2,500</span>
                    <span>₹5,000+</span>
                  </div>
                </div>

                {/* 6. Age Bracket */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                    Age Bracket
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {AGE_RANGES.map((range) => (
                      <button
                        key={range}
                        type="button"
                        onClick={() => setAgeRange(range)}
                        className={`px-3 py-1.5 rounded-xl border transition font-medium ${
                          ageRange === range
                            ? "bg-[#e1306c]/20 border-[#e1306c] text-pink-300 font-bold"
                            : "bg-[#181818] border-[#262626] text-gray-400 hover:text-white"
                        }`}
                      >
                        {range === "All" ? "All Ages" : `${range} yrs`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 7. Languages Spoken */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                    Languages Spoken
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {LANGUAGES.map((lang) => (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => setLanguageFilter(lang)}
                        className={`px-3 py-1.5 rounded-xl border transition font-medium ${
                          languageFilter === lang
                            ? "bg-[#e1306c]/20 border-[#e1306c] text-pink-300 font-bold"
                            : "bg-[#181818] border-[#262626] text-gray-400 hover:text-white"
                        }`}
                      >
                        {lang === "All" ? "All Languages" : lang}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Modal Sticky Bottom Action */}
              <div className="p-4 border-t border-[#262626] bg-[#121212]/95 backdrop-blur-md">
                <button
                  type="button"
                  onClick={() => setShowFilterModal(false)}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[#f9ce3f] via-[#e1306c] to-[#833ab4] text-white font-bold text-sm shadow-lg shadow-[#e1306c]/20 hover:opacity-95 active:scale-98 transition flex items-center justify-center gap-2"
                >
                  <span>Show {filtered.length} Companions</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <CompanionGridSkeleton count={6} />
        ) : viewMode === "map" ? (
          <CompanionMapView
            companions={filtered}
            userLoc={userLoc}
            onSelectProfile={handleProfileClick}
            onLocateMe={getUserLocation}
            favIds={favIds}
            onToggleFavorite={handleQuickFavorite}
          />
        ) : filtered.length === 0 ? (
          <div className="bg-[#16162A]/60 border border-white/5 rounded-3xl p-10 text-center flex flex-col items-center justify-center my-8 shadow-xl max-w-lg mx-auto backdrop-blur-md">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-pink-500/20 to-purple-500/20 border border-pink-500/30 flex items-center justify-center text-pink-400 mb-4 shadow-inner">
              <FiSearch size={28} />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">
              No Companions Found
            </h3>
            <p className="text-xs text-gray-400 max-w-xs mb-5 leading-relaxed">
              {hasActiveFilters
                ? "We couldn't find any profiles matching your search filters. Try clearing some filters to see more profiles."
                : "There are currently no companion profiles available in this view."}
            </p>
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold text-xs shadow-lg transition active:scale-95"
              >
                Reset All Filters
              </button>
            )}
          </div>
        ) : viewMode === "insta" ? (
          <div className="grid grid-cols-3 gap-1 sm:gap-2.5">
            {filtered.map((u) => (
              <div
                key={u.id}
                onClick={() => handleProfileClick(u)}
                className="group relative aspect-square bg-[#121212] overflow-hidden rounded-lg sm:rounded-xl cursor-pointer border border-[#262626] hover:border-[#e1306c]/60 transition-all duration-300 shadow-md"
              >
                {u.profile_pic ? (
                  <img
                    src={u.profile_pic}
                    alt={u.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-600 text-3xl">
                    <FiUser />
                  </div>
                )}

                {/* Ambient dark gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/30 opacity-80 group-hover:opacity-95 transition-opacity" />

                {/* Top Badges */}
                <div className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 flex items-center gap-1 z-10">
                  {(u.kyc_status === "verified" || u.is_verified) && (
                    <VerifiedBadge size="xs" />
                  )}
                  {liveOnlineIds.has(String(u.id)) && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-black animate-pulse" />
                  )}
                </div>

                {/* Bottom Companion Details */}
                <div className="absolute bottom-1.5 left-1.5 right-1.5 sm:bottom-2.5 sm:left-2.5 sm:right-2.5 z-10">
                  <div className="font-extrabold text-xs sm:text-sm text-white truncate drop-shadow">
                    {u.name?.split(" ")[0]}, {u.age || 22}
                  </div>
                  <div className="flex items-center justify-between text-[9px] sm:text-[10px] text-gray-300 mt-0.5">
                    <span className="truncate max-w-[65px] sm:max-w-[100px]">
                      {u.city ? u.city.split(",")[0] : "Verified"}
                    </span>
                    <span className="font-bold text-emerald-400 bg-emerald-500/20 px-1 rounded font-mono">
                      ₹{u.price || 1000}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((u) => {
              const isTargetGirl = u.role === "girl";
              return (
                <div
                  key={u.id}
                  className={`group bg-[#16162A]/90 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden cursor-pointer hover:-translate-y-1.5 transition-all duration-300 flex flex-col shadow-lg hover:shadow-2xl ${
                    isTargetGirl
                      ? "hover:border-pink-500/40 hover:shadow-pink-500/15"
                      : "hover:border-blue-500/40 hover:shadow-blue-500/15"
                  }`}
                  onClick={() => handleProfileClick(u)}
                >
                  <div
                    className={`relative h-52 flex items-center justify-center overflow-hidden bg-gradient-to-br ${isTargetGirl ? "from-pink-500/20 to-purple-500/20" : "from-blue-500/20 to-indigo-500/20"}`}
                  >
                    {u.profile_pic ? (
                      <img
                        src={u.profile_pic}
                        alt={u.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="text-5xl text-white/30 flex items-center justify-center">
                        <FiUser />
                      </div>
                    )}

                    {/* Badges overlay: Verified & Live Online */}
                    <div className="absolute top-3 left-3 flex flex-col gap-1.5 items-start z-10">
                      {(u.kyc_status === "verified" || u.is_verified) && (
                        <div className="bg-black/60 backdrop-blur-md border border-sky-400/30 rounded-full pl-1.5 pr-2.5 py-0.5 text-[10px] font-bold text-white flex items-center gap-1 shadow-md">
                          <VerifiedBadge size="xs" />
                          <span>Verified</span>
                        </div>
                      )}
                      {liveOnlineIds.has(String(u.id)) && (
                        <div className="bg-emerald-950/80 backdrop-blur-md border border-emerald-500/40 rounded-full px-2 py-0.5 text-[10px] font-bold text-emerald-300 flex items-center gap-1.5 shadow-md">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span>Online</span>
                        </div>
                      )}
                      {u.is_instant_available && (
                        <div className="bg-amber-950/80 backdrop-blur-md border border-amber-500/40 rounded-full px-2 py-0.5 text-[10px] font-bold text-amber-300 flex items-center gap-1 shadow-md">
                          <FiZap size={10} className="text-amber-400" />
                          <span>Available Today</span>
                        </div>
                      )}
                    </div>

                    {currentUser && currentUser.id !== u.id && (
                      <button
                        onClick={(e) => handleQuickFavorite(e, u.id)}
                        className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 backdrop-blur-md hover:bg-black/75 flex items-center justify-center transition-all duration-200 shadow-lg text-white active:scale-90 z-10"
                        title={favIds.has(u.id) ? "Remove Favorite" : "Save Favorite"}
                      >
                        <FiHeart
                          size={14}
                          className={
                            favIds.has(u.id)
                              ? "fill-rose-500 text-rose-500"
                              : "text-gray-300 hover:text-white"
                          }
                        />
                      </button>
                    )}
                    <div className="absolute bottom-0 w-full bg-gradient-to-t from-[#16162A] via-[#16162A]/60 to-transparent h-20" />
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-base font-bold text-white leading-tight truncate group-hover:text-pink-300 transition-colors capitalize">
                          {(u.name || "").trim()}
                        </span>
                        {u.distanceKm !== null && (
                          <span className="text-[10px] font-bold text-pink-400 bg-pink-500/10 px-2 py-0.5 rounded-full border border-pink-500/25 shrink-0">
                            📍 {u.distanceKm} km
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-400 font-semibold tracking-wide block mt-0.5">
                        @{u.username || (u.name || "").toLowerCase().replace(/\s+/g, "")}
                      </span>

                      <div className="text-xs text-gray-400 mt-2 flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <FiMapPin size={12} className="text-pink-400 shrink-0" />
                          <span className="capitalize">
                            {formatLocation(u.city)} · {u.age || "N/A"} yrs
                          </span>
                        </div>
                        <div className="text-xs text-yellow-400 flex items-center gap-1 font-semibold">
                          <FiStar size={12} className="text-yellow-400 fill-yellow-400 shrink-0" />
                          <span>
                            {u.avg_rating > 0 ? `${u.avg_rating}` : "New"}
                            <span className="text-gray-500 text-[10px] font-normal ml-0.5">
                              {u.avg_rating > 0 ? `(${u.review_count})` : ""}
                            </span>
                          </span>
                        </div>
                      </div>

                      {/* Companion Tags / Activities preview */}
                      {Array.isArray(u.tags) && u.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2.5">
                          {u.tags.slice(0, 2).map((tag, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-gray-300 font-medium truncate max-w-[120px]"
                            >
                              {tag}
                            </span>
                          ))}
                          {u.tags.length > 2 && (
                            <span className="text-[10px] text-gray-500 self-center">
                              +{u.tags.length - 2}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                      <div>
                        <span className="text-xs text-gray-400 block -mb-0.5">Rate</span>
                        <span
                          className={`text-base font-extrabold ${isTargetGirl ? "text-pink-400" : "text-blue-400"}`}
                        >
                          ₹{u.price || 1000}
                        </span>
                        <span className="text-[11px] text-gray-500">/hr</span>
                      </div>
                      <button
                        className={`px-4 py-1.5 text-white text-xs rounded-xl font-bold shadow-md hover:opacity-95 active:scale-95 transition-all ${
                          isTargetGirl
                            ? "bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 shadow-pink-500/25 hover:shadow-pink-500/40"
                            : "bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-600 shadow-blue-500/25 hover:shadow-blue-500/40"
                        }`}
                      >
                        Book Date
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
