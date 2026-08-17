import React, { useState, useEffect, useRef } from "react";
import { PAGES } from "../../App";
import { io } from "socket.io-client";
import InstagramPostModal from "./InstagramPostModal";
import { FiArrowLeft, FiMapPin, FiMessageCircle, FiStar, FiGrid, FiLock, FiShield, FiX, FiCalendar, FiClock, FiMoreVertical, FiFlag, FiSlash, FiShare2, FiAlertTriangle, FiCheckCircle, FiTrash2, FiVideo, FiPhone, FiHeart } from "react-icons/fi";

const socket = io("https://rentgf-and-bf.onrender.com", {
    autoConnect: false,
    transports: ['websocket']
});

const TIME_SLOTS = [
    { id: "morning", label: "Morning", timeRange: "10:00 AM - 12:00 PM", icon: "☕" },
    { id: "afternoon", label: "Afternoon", timeRange: "01:00 PM - 03:00 PM", icon: "☀️" },
    { id: "evening", label: "Evening", timeRange: "04:00 PM - 06:00 PM", icon: "🌅" },
    { id: "night", label: "Night", timeRange: "07:00 PM - 09:00 PM", icon: "🌙" },
    { id: "late_night", label: "Late Night", timeRange: "09:00 PM - 11:00 PM", icon: "✨" }
];

function DetailsPage({ girl: profile, currentUser, setPage, setSelectedGirl }) {
    const [hours, setHours] = useState(2);
    const [posts, setPosts] = useState([]);
    const [expandedPost, setExpandedPost] = useState(null);
    const [showDpModal, setShowDpModal] = useState(false);

    const [bookingStatus, setBookingStatus] = useState(null);
    const [reviews, setReviews] = useState([]);
    const [avgRating, setAvgRating] = useState(0);
    const [newReviewText, setNewReviewText] = useState("");
    const [newRating, setNewRating] = useState(5);

    const [followStats, setFollowStats] = useState({ followers: 0, following: 0, isFollowing: false });
    const [followLoading, setFollowLoading] = useState(false);
    const [isOnline, setIsOnline] = useState(false);

    const [isFavorited, setIsFavorited] = useState(false);
    const [favLoading, setFavLoading] = useState(false);

    // Followers / Following Modal States
    const [showFollowModal, setShowFollowModal] = useState(null); // 'followers' | 'following' | null
    const [followList, setFollowList] = useState([]);
    const [followListLoading, setFollowListLoading] = useState(false);

    const canViewList = !profile.is_private || followStats.isFollowing || profile.id === currentUser?.id;

    const handleOpenFollowModal = async (type) => {
        if (!canViewList) {
            alert("This account is private. Follow them to see their followers and following list.");
            return;
        }
        setShowFollowModal(type);
        setFollowListLoading(true);
        try {
            const token = localStorage.getItem('token');
            const headers = {};
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const response = await fetch(`https://rentgf-and-bf.onrender.com/api/${type === 'followers' ? 'followers-list' : 'following-list'}/${profile.id}`, { headers });
            if (response.ok) {
                const data = await response.json();
                setFollowList(data);
            }
        } catch (err) {
            console.error("Error fetching follow list:", err);
        } finally {
            setFollowListLoading(false);
        }
    };

    const handleUserClick = (targetUser) => {
        setShowFollowModal(null);
        setFollowList([]);
        if (setSelectedGirl) {
            setSelectedGirl(targetUser);
        }
    };

    // 3-dot menu state
    const [showMenu, setShowMenu] = useState(false);
    const [isBlocked, setIsBlocked] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);
    const [reportReason, setReportReason] = useState('');
    const [reportDesc, setReportDesc] = useState('');
    const [reportSubmitting, setReportSubmitting] = useState(false);
    const [reportDone, setReportDone] = useState(false);
    const [blockLoading, setBlockLoading] = useState(false);
    const menuRef = useRef(null);

    const [showBookingModal, setShowBookingModal] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState(TIME_SLOTS[2].id);
    const [bookedSlots, setBookedSlots] = useState([]);
    const [loadingSlots, setLoadingSlots] = useState(false);

    useEffect(() => {
        if (!currentUser || !profile?.id || currentUser.id === profile.id) return;
        const token = localStorage.getItem('token');
        if (!token) return;

        fetch(`https://rentgf-and-bf.onrender.com/api/favorites/check/${profile.id}`, {
            headers: { Authorization: `Bearer ${token}` }
        })
        .then(r => r.ok ? r.json() : { isFavorited: false })
        .then(data => setIsFavorited(!!data.isFavorited))
        .catch(() => {});
    }, [currentUser, profile?.id]);

    const handleToggleFavorite = async () => {
        if (!currentUser) return alert("Please login first to save companions to your favorites!");
        setFavLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch("https://rentgf-and-bf.onrender.com/api/favorites/toggle", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ companion_id: profile.id })
            });
            const data = await res.json();
            if (res.ok) {
                setIsFavorited(data.isFavorited);
            }
        } catch (err) {
            console.error("Toggle favorite failed:", err);
        } finally {
            setFavLoading(false);
        }
    };

    const handleMessageClick = () => {
        if (!currentUser) {
            alert("Please login first to chat with companions!");
            setPage(PAGES.BOY_LOGIN);
            return;
        }
        setPage(PAGES.CHAT);
    };

    const handleCallClick = (type) => {
        if (!currentUser) {
            alert(`Please login first to make ${type} calls!`);
            setPage(PAGES.BOY_LOGIN);
            return;
        }
        const roomId = [currentUser.id, profile.id].sort((a, b) => a - b).join('_');
        window.dispatchEvent(new CustomEvent("rentgf_start_call", { detail: { targetUser: profile, type, room: roomId } }));
    };

    const handleFollowClick = () => {
        if (!currentUser) {
            alert("Please login first to follow companions!");
            setPage(PAGES.BOY_LOGIN);
            return;
        }
        handleFollowToggle();
    };

    const [meetingInfo, setMeetingInfo] = useState(() => {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        return { date: `${yyyy}-${mm}-${dd}`, time: "18:00", location: "" };
    });
    const [timeHour, setTimeHour] = useState("06");
    const [timeMin, setTimeMin] = useState("00");
    const [timeAmpm, setTimeAmpm] = useState("PM");

    const [locationSuggestions, setLocationSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [searchLoading, setSearchLoading] = useState(false);
    const [userCoords, setUserCoords] = useState(null);

    useEffect(() => {
        if (!showBookingModal || !profile?.id || !meetingInfo.date) return;
        setLoadingSlots(true);
        fetch(`https://rentgf-and-bf.onrender.com/api/bookings/booked-slots/${profile.id}?date=${meetingInfo.date}`)
            .then(res => res.ok ? res.json() : { bookedSlots: [] })
            .then(data => {
                setBookedSlots(data.bookedSlots || []);
            })
            .catch(() => setBookedSlots([]))
            .finally(() => setLoadingSlots(false));
    }, [showBookingModal, profile?.id, meetingInfo.date]);

    useEffect(() => {
        if (showBookingModal && navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    setUserCoords({
                        lat: pos.coords.latitude,
                        lon: pos.coords.longitude
                    });
                },
                (err) => console.log("Geolocation error:", err),
                { enableHighAccuracy: true, timeout: 5000 }
            );
        }
    }, [showBookingModal]);

    const handleLocationChange = async (val) => {
        setMeetingInfo(prev => ({ ...prev, location: val }));
        
        if (val.trim().length < 3) {
            setLocationSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        setSearchLoading(true);
        try {
            let url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(val)}&format=json&limit=5&addressdetails=1`;
            if (userCoords) {
                url += `&lat=${userCoords.lat}&lon=${userCoords.lon}`;
            } else if (profile.city) {
                // If profile city is available, append it to search string
                url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(val + ", " + profile.city)}&format=json&limit=5&addressdetails=1`;
            }

            const res = await fetch(url, {
                headers: { 'Accept-Language': 'en' }
            });
            if (res.ok) {
                const data = await res.json();
                const formatted = data.map(item => {
                    const name = item.display_name;
                    const address = item.address || {};
                    const mainName = address.amenity || address.shop || address.cafe || address.restaurant || address.road || item.name || name.split(',')[0];
                    const details = name.replace(mainName + ',', '').trim();
                    return {
                        label: mainName,
                        description: details || name
                    };
                });
                setLocationSuggestions(formatted);
                setShowSuggestions(true);
            }
        } catch (err) {
            console.error("Nominatim API error:", err);
        } finally {
            setSearchLoading(false);
        }
    };

    const updateTimeValue = (h, m, ap) => {
        let hoursNum = parseInt(h);
        if (ap === "PM" && hoursNum < 12) {
            hoursNum += 12;
        } else if (ap === "AM" && hoursNum === 12) {
            hoursNum = 0;
        }
        const formattedHour = String(hoursNum).padStart(2, '0');
        setMeetingInfo(prev => ({
            ...prev,
            time: `${formattedHour}:${m}`
        }));
    };

    const handleHourChange = (val) => {
        setTimeHour(val);
        updateTimeValue(val, timeMin, timeAmpm);
    };

    const handleMinChange = (val) => {
        setTimeMin(val);
        updateTimeValue(timeHour, val, timeAmpm);
    };

    const handleAmpmChange = (val) => {
        setTimeAmpm(val);
        updateTimeValue(timeHour, timeMin, val);
    };

    const handleDeletePost = async (postId) => {
        if (!await window.showConfirm("Are you sure you want to delete this photo?")) return;
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`https://rentgf-and-bf.onrender.com/api/posts/${postId}`, { 
                method: "DELETE",
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (response.ok) {
                setPosts(prev => prev.filter(post => post.id !== postId));
                setExpandedPost(null);
            }
        } catch (err) { console.error("Delete post error:", err); }
    };

    useEffect(() => {
        if (!socket.connected) socket.connect();
        if (currentUser) socket.emit('user_connected', currentUser.id);

        const handleOnlineUsers = (onlineIds) => {
            if (profile) setIsOnline(onlineIds.map(String).includes(String(profile.id)));
        };
        socket.on('update_online_users', handleOnlineUsers);
        return () => socket.off('update_online_users', handleOnlineUsers);
    }, [profile, currentUser]);

    // Fetch block status
    useEffect(() => {
        if (!currentUser || !profile || currentUser.id === profile.id) return;
        const token = localStorage.getItem('token');
        if (!token) return;
        fetch(`https://rentgf-and-bf.onrender.com/api/block-status/${profile.id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data) setIsBlocked(data.isBlocked); })
        .catch(() => {});
    }, [profile, currentUser]);

    // Close menu on outside click
    useEffect(() => {
        const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Block / Unblock
    const handleBlockToggle = async () => {
        if (!currentUser) return;
        setBlockLoading(true);
        setShowMenu(false);
        const token = localStorage.getItem('token');
        const endpoint = isBlocked ? '/api/unblock' : '/api/block';
        try {
            const res = await fetch(`https://rentgf-and-bf.onrender.com${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ blocked_id: profile.id })
            });
            if (res.ok) {
                setIsBlocked(!isBlocked);
                if (!isBlocked) {
                    // Blocked — unfollow locally too
                    setFollowStats(prev => ({ ...prev, isFollowing: false }));
                    alert(`${profile.name} has been blocked. They won't appear in your feed.`);
                } else {
                    alert(`${profile.name} has been unblocked.`);
                }
            }
        } catch (e) { /* silent */ } finally { setBlockLoading(false); }
    };

    // Submit Report
    const handleReportSubmit = async (e) => {
        e.preventDefault();
        if (!reportReason) return;
        setReportSubmitting(true);
        const token = localStorage.getItem('token');
        try {
            const res = await fetch('https://rentgf-and-bf.onrender.com/api/report', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ reported_id: profile.id, reason: reportReason, description: reportDesc })
            });
            if (res.ok) {
                setReportDone(true);
                setTimeout(() => { setShowReportModal(false); setReportDone(false); setReportReason(''); setReportDesc(''); }, 2500);
            }
        } catch (e) { /* silent */ } finally { setReportSubmitting(false); }
    };

    // Share Profile
    const handleShare = () => {
        const url = window.location.href;
        if (navigator.share) {
            navigator.share({ title: `${profile.name}'s Profile`, url });
        } else {
            navigator.clipboard.writeText(url);
            alert('Profile link copied!');
        }
        setShowMenu(false);
    };

    useEffect(() => {
        if (!profile) return;

        const cacheKey = `profile_data_${profile.id}`;
        const cachedData = sessionStorage.getItem(cacheKey);

        if (cachedData) {
            const parsedData = JSON.parse(cachedData);
            if (parsedData.posts) setPosts(parsedData.posts);
            if (parsedData.reviews) setReviews(parsedData.reviews);
            if (parsedData.avgRating !== undefined) setAvgRating(parsedData.avgRating);
            if (parsedData.followStats) setFollowStats(parsedData.followStats);
        }

        const fetchUserData = async () => {
            let fetchedPosts = [];
            let fetchedReviews = [];
            let fetchedAvgRating = 0;
            let fetchedFollowStats = { followers: 0, following: 0, isFollowing: false };

            try {
                const currentUserId = currentUser ? currentUser.id : '';
                const statsRes = await fetch(`https://rentgf-and-bf.onrender.com/api/follow-stats/${profile.id}?currentUserId=${currentUserId}`);
                if (statsRes.ok) {
                    fetchedFollowStats = await statsRes.json();
                }
            } catch (err) {
                console.error(err);
            }

            const canViewPrivate = !profile.is_private || fetchedFollowStats.isFollowing || profile.id === currentUser?.id;
            if (canViewPrivate) {
                try {
                    const token = localStorage.getItem("token");
                    const headers = {};
                    if (token) headers["Authorization"] = `Bearer ${token}`;
                    const postRes = await fetch(`https://rentgf-and-bf.onrender.com/api/posts/${profile.id}`, { headers });
                    if (postRes.ok) fetchedPosts = await postRes.json();
                } catch (err) {
                    console.error(err);
                }
            }

            try {
                const reviewRes = await fetch(`https://rentgf-and-bf.onrender.com/api/reviews/${profile.id}`);
                if (reviewRes.ok) {
                    const data = await reviewRes.json();
                    fetchedReviews = data.reviews;
                    fetchedAvgRating = data.avgRating;
                }
            } catch (err) {
                console.error(err);
            }

            setPosts(fetchedPosts);
            setReviews(fetchedReviews);
            setAvgRating(fetchedAvgRating);
            setFollowStats(fetchedFollowStats);

            sessionStorage.setItem(cacheKey, JSON.stringify({
                posts: fetchedPosts,
                reviews: fetchedReviews,
                avgRating: fetchedAvgRating,
                followStats: fetchedFollowStats
            }));
        };

        fetchUserData();
    }, [profile, currentUser]);

    const handleFollowToggle = async () => {
        if (!currentUser) return alert("Please login to follow!");
        if (currentUser.id === profile.id) return alert("You cannot follow yourself.");

        setFollowLoading(true);
        const endpoint = followStats.isFollowing ? '/api/unfollow' : '/api/follow';
        const token = localStorage.getItem('token');

        try {
            const res = await fetch(`https://rentgf-and-bf.onrender.com${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ follower_id: currentUser.id, following_id: profile.id })
            });

            if (res.ok) {
                setFollowStats(prev => ({
                    ...prev,
                    isFollowing: !prev.isFollowing,
                    followers: prev.isFollowing ? prev.followers - 1 : prev.followers + 1
                }));
            } else {
                const data = await res.json();
                alert(data.error || "Action failed. Please try again.");
            }
        } catch (err) {
            console.error("Follow action failed:", err);
        } finally {
            setFollowLoading(false);
        }
    };

    const handleBookingSubmit = async () => {
        if (!currentUser) return alert("Please login first!");
        if (!meetingInfo.date) return alert("Please select a date!");

        setBookingStatus('loading');
        const amount = (profile.price || 1000) * hours;

        const boy_id = currentUser.role === 'boy' ? currentUser.id : profile.id;
        const girl_id = currentUser.role === 'girl' ? currentUser.id : profile.id;

        const activeSlotObj = TIME_SLOTS.find(s => s.id === selectedSlot);
        const slotLabel = activeSlotObj ? `${activeSlotObj.label} (${activeSlotObj.timeRange})` : meetingInfo.time;
        const meetingTimeFormatted = activeSlotObj ? activeSlotObj.timeRange.split(' - ')[0] : meetingInfo.time;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch('https://rentgf-and-bf.onrender.com/api/bookings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    boy_id,
                    girl_id,
                    hours,
                    amount,
                    meeting_date: meetingInfo.date,
                    meeting_time: meetingTimeFormatted,
                    time_slot: slotLabel,
                    meeting_location: meetingInfo.location,
                    sender_id: currentUser.id
                })
            });

            if (response.ok) {
                setBookingStatus('success');
                socket.emit("send_booking_notification", {
                    receiver_id: profile.id,
                    sender_name: currentUser.name,
                    hours: hours,
                    amount: amount
                });
                setShowBookingModal(false);
                setTimeout(() => setBookingStatus(null), 3000);
            } else {
                const errData = await response.json().catch(() => ({}));
                setBookingStatus(null);
                alert(errData.error || "Booking failed. Please try again.");
            }
        } catch (error) {
            setBookingStatus(null);
            alert("Network error. Please check your connection and try again.");
        }
    };


    const submitReview = async () => {
        if (!newReviewText.trim() || !currentUser) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch('https://rentgf-and-bf.onrender.com/api/reviews', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    companion_id: profile.id,
                    rating: newRating,
                    comment: newReviewText
                })
            });

            if (response.ok) {
                setNewReviewText("");
                setNewRating(5);
                const reviewRes = await fetch(`https://rentgf-and-bf.onrender.com/api/reviews/${profile.id}`);
                const data = await reviewRes.json();
                setReviews(data.reviews);
                setAvgRating(data.avgRating);
                alert("Review submitted successfully!");
            } else {
                const err = await response.json().catch(() => ({}));
                alert(err.error || "Failed to submit review, try again.");
            }
        } catch (error) {
            console.error(error);
            alert("Network error, try again.");
        }
    };

    if (!profile) return null;

    let safeTags = profile.tags ? (typeof profile.tags === 'string' ? profile.tags.split(',') : profile.tags) : ["Coffee Date", "Movie"];
    const firstName = profile.name ? profile.name.split(" ")[0] : "User";
    const accentColor = profile.role === 'boy' ? '#3b82f6' : '#ec4899';
    const accentGrad = profile.role === 'boy' ? 'from-blue-500 to-purple-600' : 'from-pink-500 to-purple-600';

    return (
        <div className="min-h-[100dvh] relative bg-[#0D0D1A] pb-20 text-white">

            {/* ── TOP NAV BAR ── */}
            <div className="sticky top-0 bg-[#0D0D1A]/85 backdrop-blur-md z-30 border-b border-white/5">
                <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
                    <button
                        onClick={() => setPage(PAGES.FIND)}
                        className="w-9 h-9 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white transition"
                    >
                        <FiArrowLeft size={18} />
                    </button>
                    <span className="font-bold text-xs tracking-wide text-gray-200">
                        {profile.username || profile.name?.toLowerCase().replace(/\s+/g, '')}
                    </span>
                    
                    {/* 3-DOT MENU BUTTON */}
                    {currentUser && currentUser.id !== profile.id ? (
                        <div ref={menuRef} className="relative">
                            <button
                                onClick={() => setShowMenu(prev => !prev)}
                                className="w-9 h-9 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white transition"
                            >
                                <FiMoreVertical size={18} />
                            </button>

                            {/* Dropdown */}
                            {showMenu && (
                                <div className="absolute right-0 top-11 w-52 bg-[#16162A] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 animate-fade-in">
                                    <button
                                        onClick={handleBlockToggle}
                                        disabled={blockLoading}
                                        className="w-full flex items-center gap-3 px-4 py-3.5 text-sm text-left hover:bg-white/5 transition group"
                                    >
                                        <FiSlash size={16} className={isBlocked ? 'text-green-400' : 'text-red-400'} />
                                        <span className={isBlocked ? 'text-green-300' : 'text-red-300'}>
                                            {blockLoading ? 'Please wait...' : isBlocked ? `Unblock ${profile.name?.split(' ')[0]}` : `Block ${profile.name?.split(' ')[0]}`}
                                        </span>
                                    </button>
                                    <div className="h-px bg-white/5 mx-3" />
                                    <button
                                        onClick={() => { setShowReportModal(true); setShowMenu(false); }}
                                        className="w-full flex items-center gap-3 px-4 py-3.5 text-sm text-left hover:bg-white/5 transition"
                                    >
                                        <FiFlag size={16} className="text-orange-400" />
                                        <span className="text-orange-300">Report {profile.name?.split(' ')[0]}</span>
                                    </button>
                                    <div className="h-px bg-white/5 mx-3" />
                                    <button
                                        onClick={handleShare}
                                        className="w-full flex items-center gap-3 px-4 py-3.5 text-sm text-left hover:bg-white/5 transition"
                                    >
                                        <FiShare2 size={16} className="text-blue-400" />
                                        <span className="text-blue-300">Share Profile</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="w-9 h-9"></div>
                    )}
                </div>
            </div>

            {/* ── INSTAGRAM LAYOUT HEADER ── */}
            <div className="max-w-4xl mx-auto px-4 pt-6 md:pt-10 pb-6 border-b border-white/5 mb-6">
                {/* Mobile: Avatar & Stats side-by-side. Desktop: Left avatar, right content */}
                <div className="flex items-center md:items-start gap-6 md:gap-20 mb-4 md:mb-6">
                    {/* Avatar */}
                    <div 
                        className={`relative w-20 h-20 md:w-36 md:h-36 rounded-full p-[3px] shadow-2xl cursor-pointer shrink-0 bg-gradient-to-br ${accentGrad}`}
                        onClick={() => profile.profile_pic && setShowDpModal(true)}
                    >
                        <div className="w-full h-full rounded-full overflow-hidden bg-[#0D0D1A]">
                            {profile.profile_pic ? (
                                <img src={profile.profile_pic} alt={profile.name} className="w-full h-full object-cover" />
                            ) : (
                                <div className={`w-full h-full bg-gradient-to-br ${accentGrad} flex items-center justify-center`}>
                                    <span className="text-white font-bold text-2xl md:text-4xl">{profile.name?.[0]?.toUpperCase()}</span>
                                </div>
                            )}
                        </div>
                        {isOnline && <span className="absolute bottom-1 right-1 w-3 h-3 md:w-4 md:h-4 bg-green-400 border-2 border-[#0D0D1A] rounded-full" />}
                    </div>

                    {/* Stats for Mobile (hidden on desktop) */}
                    <div className="flex-1 flex justify-around md:hidden text-xs text-gray-300">
                        <div className="flex flex-col items-center">
                            <span className="font-extrabold text-white text-sm">{posts.length}</span>
                            <span className="text-gray-400">posts</span>
                        </div>
                        <button
                            onClick={() => handleOpenFollowModal('followers')}
                            className={`flex flex-col items-center outline-none ${canViewList ? 'cursor-pointer hover:text-white transition' : 'opacity-60 cursor-not-allowed'}`}
                        >
                            <span className="font-extrabold text-white text-sm">{followStats.followers}</span>
                            <span className="text-gray-400">followers</span>
                        </button>
                        <button
                            onClick={() => handleOpenFollowModal('following')}
                            className={`flex flex-col items-center outline-none ${canViewList ? 'cursor-pointer hover:text-white transition' : 'opacity-60 cursor-not-allowed'}`}
                        >
                            <span className="font-extrabold text-white text-sm">{followStats.following}</span>
                            <span className="text-gray-400">following</span>
                        </button>
                    </div>

                    {/* Desktop Content (hidden on mobile, right side of avatar) */}
                    <div className="hidden md:flex flex-col flex-1 space-y-4">
                        {/* Name & Handle */}
                        <div>
                            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                                {profile.name}
                                {profile.kyc_status === 'verified' && (
                                    <span className="text-blue-400" title="Verified Companion">✔</span>
                                )}
                            </h1>
                            <span className="text-xs text-gray-500 mt-0.5 font-semibold block">
                                @{profile.username || profile.name?.toLowerCase().replace(/\s+/g, '')}
                            </span>
                        </div>

                        {/* Stats */}
                        <div className="flex gap-8 text-xs text-gray-300">
                            <div className="flex items-center gap-1">
                                <span className="font-extrabold text-white text-sm">{posts.length}</span>
                                <span className="text-gray-400">posts</span>
                            </div>
                            <button
                                onClick={() => handleOpenFollowModal('followers')}
                                className={`flex items-center gap-1 outline-none ${canViewList ? 'cursor-pointer hover:text-white transition' : 'opacity-60 cursor-not-allowed'}`}
                            >
                                <span className="font-extrabold text-white text-sm">{followStats.followers}</span>
                                <span className="text-gray-400">followers</span>
                            </button>
                            <button
                                onClick={() => handleOpenFollowModal('following')}
                                className={`flex items-center gap-1 outline-none ${canViewList ? 'cursor-pointer hover:text-white transition' : 'opacity-60 cursor-not-allowed'}`}
                            >
                                <span className="font-extrabold text-white text-sm">{followStats.following}</span>
                                <span className="text-gray-400">following</span>
                            </button>
                            <div className="flex items-center gap-1">
                                <span className="font-extrabold text-yellow-400 text-sm flex items-center gap-1">
                                    <FiStar size={13} className="text-yellow-400 fill-yellow-400" /> {avgRating > 0 ? Number(avgRating).toFixed(1) : 'New'}
                                </span>
                                <span className="text-gray-400">({reviews.length} reviews)</span>
                            </div>
                        </div>

                        {/* Bio, tags etc */}
                        <div className="space-y-2 text-sm text-gray-300">
                            <div className="flex items-center gap-1.5 text-gray-400 text-xs">
                                <span className="flex items-center gap-0.5"><FiMapPin size={12} /> {profile.city || 'Unknown'}</span>
                                <span className="w-1 h-1 bg-gray-600 rounded-full" />
                                <span>{profile.age || 'N/A'} yrs</span>
                                <span className="w-1 h-1 bg-gray-600 rounded-full" />
                                {isOnline ? (
                                    <span className="text-green-400 font-bold">Online</span>
                                ) : (
                                    <span className="text-gray-500">Offline</span>
                                )}
                            </div>

                            {profile.bio && <p className="text-gray-300 leading-relaxed text-xs">{profile.bio}</p>}

                            {profile.social_link && (
                                <a 
                                    href={profile.social_link.startsWith('http') ? profile.social_link : `https://${profile.social_link}`}
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-pink-400 font-extrabold hover:underline block text-xs"
                                >
                                    🔗 {profile.social_link.replace(/^https?:\/\/(www\.)?/, '')}
                                </a>
                            )}

                            {/* Tags */}
                            <div className="flex flex-wrap gap-1.5 pt-1">
                                {safeTags.map((tag) => (
                                    <span 
                                        key={tag} 
                                        className="px-2.5 py-1 text-[10px] font-bold rounded-md" 
                                        style={{ background: `${accentColor}12`, color: accentColor, border: `1px solid ${accentColor}25` }}
                                    >
                                        #{tag.trim()}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Buttons below the bio on Desktop */}
                        <div className="flex gap-2 pt-2">
                            {(!currentUser || currentUser.id !== profile.id) && (
                                <button
                                    onClick={handleFollowClick}
                                    disabled={followLoading}
                                    className={`px-6 py-2 rounded-lg font-bold text-xs transition min-w-[120px] ${followStats.isFollowing
                                        ? 'bg-white/10 text-white hover:bg-white/15 border border-white/10'
                                        : `bg-gradient-to-r ${accentGrad} text-white hover:opacity-90 shadow-md`}`}
                                >
                                    {followLoading ? '...' : followStats.isFollowing ? 'Following' : 'Follow'}
                                </button>
                            )}
                            <button
                                onClick={handleMessageClick}
                                className="px-5 py-2 bg-[#262626] hover:bg-[#363636] border border-white/5 text-white rounded-lg font-bold text-xs transition flex items-center justify-center gap-1.5"
                            >
                                Message
                            </button>
                            {(!currentUser || currentUser.id !== profile.id) && (
                                <>
                                    <button
                                        onClick={() => handleCallClick('video')}
                                        className="w-9 h-9 bg-[#0095f6]/10 hover:bg-[#0095f6]/20 border border-[#0095f6]/30 text-[#0095f6] rounded-lg font-bold transition flex items-center justify-center"
                                        title="Video Call"
                                    >
                                        <FiVideo size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleCallClick('audio')}
                                        className="w-9 h-9 bg-[#0095f6]/10 hover:bg-[#0095f6]/20 border border-[#0095f6]/30 text-[#0095f6] rounded-lg font-bold transition flex items-center justify-center"
                                        title="Voice Call"
                                    >
                                        <FiPhone size={16} />
                                    </button>
                                    <button
                                        onClick={handleToggleFavorite}
                                        disabled={favLoading}
                                        className={`w-9 h-9 border rounded-lg font-bold transition flex items-center justify-center ${
                                            isFavorited
                                                ? 'bg-red-500/20 border-red-500/40 text-red-400 shadow-md shadow-red-500/10'
                                                : 'bg-white/5 hover:bg-white/10 border-white/10 text-gray-400 hover:text-white'
                                        }`}
                                        title={isFavorited ? "Saved to Favorites" : "Save to Favorites"}
                                    >
                                        <FiHeart size={16} className={isFavorited ? "fill-red-500 text-red-500" : ""} />
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Mobile Content Block (below avatar row, hidden on desktop) */}
                <div className="md:hidden space-y-4">
                    {/* Name & Handle */}
                    <div>
                        <h1 className="text-lg font-bold text-white flex items-center gap-2">
                            {profile.name}
                            {profile.kyc_status === 'verified' && (
                                <span className="text-blue-400" title="Verified Companion">✔</span>
                            )}
                        </h1>
                        <span className="text-[11px] text-gray-500 font-semibold block">
                            @{profile.username || profile.name?.toLowerCase().replace(/\s+/g, '')}
                        </span>
                    </div>

                    {/* Bio, location, tags */}
                    <div className="space-y-2 text-xs text-gray-300">
                        <div className="flex items-center gap-1.5 text-gray-400">
                            <span className="flex items-center gap-0.5"><FiMapPin size={12} /> {profile.city || 'Unknown'}</span>
                            <span className="w-1 h-1 bg-gray-600 rounded-full" />
                            <span>{profile.age || 'N/A'} yrs</span>
                            <span className="w-1 h-1 bg-gray-600 rounded-full" />
                            {isOnline ? (
                                <span className="text-green-400 font-bold">Online</span>
                            ) : (
                                <span className="text-gray-500">Offline</span>
                            )}
                            <span className="w-1 h-1 bg-gray-600 rounded-full" />
                            <span className="text-yellow-400 flex items-center gap-0.5">
                                <FiStar size={12} className="text-yellow-400 fill-yellow-400" /> {avgRating > 0 ? Number(avgRating).toFixed(1) : 'New'}
                            </span>
                            <span className="text-gray-500">({reviews.length})</span>
                        </div>

                        {profile.bio && <p className="text-gray-300 leading-relaxed text-xs">{profile.bio}</p>}

                        {profile.social_link && (
                            <a 
                                href={profile.social_link.startsWith('http') ? profile.social_link : `https://${profile.social_link}`}
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-pink-400 font-extrabold hover:underline block text-xs"
                            >
                                🔗 {profile.social_link.replace(/^https?:\/\/(www\.)?/, '')}
                            </a>
                        )}

                        {/* Tags */}
                        <div className="flex flex-wrap gap-1.5 pt-1">
                            {safeTags.map((tag) => (
                                <span 
                                    key={tag} 
                                    className="px-2.5 py-1 text-[10px] font-bold rounded-md" 
                                    style={{ background: `${accentColor}12`, color: accentColor, border: `1px solid ${accentColor}25` }}
                                >
                                    #{tag.trim()}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Action buttons at the bottom on Mobile */}
                    <div className="flex gap-2 pt-2">
                        {(!currentUser || currentUser.id !== profile.id) && (
                            <button
                                onClick={handleFollowClick}
                                disabled={followLoading}
                                className={`flex-1 py-2 rounded-lg font-bold text-xs transition ${followStats.isFollowing
                                    ? 'bg-white/10 text-white hover:bg-white/15 border border-white/10'
                                    : `bg-gradient-to-r ${accentGrad} text-white hover:opacity-90 shadow-md`}`}
                            >
                                {followLoading ? '...' : followStats.isFollowing ? 'Following' : 'Follow'}
                            </button>
                        )}
                        <button
                            onClick={handleMessageClick}
                            className="flex-1 py-2 bg-[#262626] hover:bg-[#363636] border border-white/5 text-white rounded-lg font-bold text-xs transition flex items-center justify-center gap-1.5"
                        >
                            Message
                        </button>
                        {(!currentUser || currentUser.id !== profile.id) && (
                            <>
                                <button
                                    onClick={() => handleCallClick('video')}
                                    className="w-9 h-9 bg-[#0095f6]/10 hover:bg-[#0095f6]/20 border border-[#0095f6]/30 text-[#0095f6] rounded-lg font-bold transition flex items-center justify-center shrink-0"
                                    title="Video Call"
                                >
                                    <FiVideo size={16} />
                                </button>
                                <button
                                    onClick={() => handleCallClick('audio')}
                                    className="w-9 h-9 bg-[#0095f6]/10 hover:bg-[#0095f6]/20 border border-[#0095f6]/30 text-[#0095f6] rounded-lg font-bold transition flex items-center justify-center shrink-0"
                                    title="Voice Call"
                                >
                                    <FiPhone size={16} />
                                </button>
                                <button
                                    onClick={handleToggleFavorite}
                                    disabled={favLoading}
                                    className={`w-9 h-9 border rounded-lg font-bold transition flex items-center justify-center shrink-0 ${
                                        isFavorited
                                            ? 'bg-red-500/20 border-red-500/40 text-red-400 shadow-md shadow-red-500/10'
                                            : 'bg-white/5 hover:bg-white/10 border-white/10 text-gray-400 hover:text-white'
                                    }`}
                                    title={isFavorited ? "Saved to Favorites" : "Save to Favorites"}
                                >
                                    <FiHeart size={16} className={isFavorited ? "fill-red-500 text-red-500" : ""} />
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* ── NON-LOGGED IN USER CTA BANNER ── */}
                {!currentUser && (
                    <div className="rounded-2xl overflow-hidden mb-6 p-6 border border-pink-500/20 bg-gradient-to-r from-[#16162A] to-[#201633] flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
                        <div>
                            <h3 className="font-bold text-white text-base flex items-center gap-2">
                                <span>☕ Connect with {profile.name}</span>
                            </h3>
                            <p className="text-xs text-gray-400 mt-1">Log in or create a free account to book dates, chat live, and make audio/video calls.</p>
                        </div>
                        <button
                            onClick={() => setPage(PAGES.BOY_LOGIN)}
                            className={`px-6 py-3 rounded-xl font-bold text-xs bg-gradient-to-r ${accentGrad} text-white shadow-md hover:opacity-90 transition whitespace-nowrap`}
                        >
                            Log In / Register
                        </button>
                    </div>
                )}

                {/* ── BOOKING SECTION ── */}
                {currentUser && currentUser.id !== profile.id && (
                    <div className="rounded-2xl overflow-hidden mb-6 border border-white/5" style={{ background: '#16162A' }}>
                        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-2 font-bold text-white">
                                <FiCalendar size={16} style={{ color: accentColor }} />
                                Book a Session
                            </div>
                            <span className="text-xs text-gray-400">₹{profile.price || 1000}/hr</span>
                        </div>
                        <div className="px-5 py-4">
                            <div className="flex gap-2 flex-wrap mb-5">
                                {[1, 2, 3, 4, 5].map((h) => (
                                    <button
                                        key={h}
                                        onClick={() => setHours(h)}
                                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${hours === h
                                            ? `bg-gradient-to-r ${accentGrad} text-white shadow-md`
                                            : 'bg-white/5 text-gray-400 hover:text-white border border-white/10'}`}
                                    >
                                        {h} hr{h > 1 ? 's' : ''}
                                    </button>
                                ))}
                            </div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-xs text-gray-400 mb-1">Total</div>
                                    <div className="text-3xl font-extrabold text-transparent bg-clip-text" style={{ backgroundImage: `linear-gradient(135deg, ${accentColor}, #a855f7)` }}>
                                        ₹{(profile.price || 1000) * hours}
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowBookingModal(true)}
                                    className={`px-6 py-3 rounded-xl font-bold text-sm bg-gradient-to-r ${accentGrad} text-white hover:opacity-90 transition shadow-lg`}
                                >
                                    {bookingStatus === 'success' ? 'Request Sent ✓' : 'Book Now'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── POSTS GRID (Instagram style) ── */}
                <div className="mb-8">
                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3 pt-2 border-t border-white/5">
                        <FiGrid size={15} />
                        Posts
                    </div>
                    {(profile.is_private && !followStats.isFollowing && profile.id !== currentUser?.id) ? (
                        <div className="py-16 text-center flex flex-col items-center gap-3">
                            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                                <FiLock size={24} className="text-gray-500" />
                            </div>
                            <p className="text-gray-400 text-sm font-medium">This account is private</p>
                            <p className="text-gray-600 text-xs">Follow to see their photos</p>
                        </div>
                    ) : posts.length === 0 ? (
                        <div className="py-16 text-center flex flex-col items-center gap-2">
                            <FiGrid size={36} className="text-gray-700" />
                            <p className="text-gray-500 text-sm">No posts yet</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 gap-0.5">
                            {posts.map(post => (
                                <div
                                    key={post.id}
                                    onClick={() => setExpandedPost(post)}
                                    className="relative group aspect-square cursor-pointer overflow-hidden"
                                >
                                    <img src={post.image_url} alt="Post" className="w-full h-full object-cover transition duration-300 group-hover:brightness-75" />
                                    {post.caption && (
                                        <div className="absolute inset-0 flex items-end opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-2">
                                            <p className="text-white text-[10px] line-clamp-2">{post.caption}</p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* ── REVIEWS ── */}
                <div className="mb-10 border-t border-white/5 pt-6">
                    <div className="flex items-center gap-3 mb-5">
                        <h2 className="font-bold text-white text-base flex items-center gap-2">
                            <FiStar size={16} className="text-yellow-400" /> Reviews
                        </h2>
                        <span className="text-xs bg-white/5 text-gray-400 px-2.5 py-1 rounded-full border border-white/10">{reviews.length}</span>
                    </div>

                    {/* ── Rating Summary ── */}
                    {reviews.length > 0 && (
                        <div className="rounded-2xl p-5 mb-5 border border-white/5 flex gap-6 items-center" style={{ background: '#16162A' }}>
                            {/* Big average */}
                            <div className="text-center shrink-0">
                                <div className="text-4xl font-black text-white">{avgRating || 0}</div>
                                <div className="flex gap-0.5 justify-center mt-1">
                                    {[1,2,3,4,5].map(s => (
                                        <span key={s} className={`text-sm ${s <= Math.round(avgRating) ? 'text-yellow-400' : 'text-gray-700'}`}>★</span>
                                    ))}
                                </div>
                                <div className="text-[10px] text-gray-500 mt-1">{reviews.length} reviews</div>
                            </div>
                            {/* Star distribution bars */}
                            <div className="flex-1 space-y-1">
                                {[5,4,3,2,1].map(star => {
                                    const count = reviews.filter(r => r.rating === star).length;
                                    const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                                    return (
                                        <div key={star} className="flex items-center gap-2">
                                            <span className="text-[10px] text-gray-400 w-3 text-right">{star}</span>
                                            <span className="text-yellow-400 text-[10px]">★</span>
                                            <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                                                <div className="h-full bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                                            </div>
                                            <span className="text-[10px] text-gray-500 w-6 text-right">{count}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* ── Write Review ── */}
                    {currentUser && currentUser.id !== profile.id && (
                        <div className="rounded-2xl p-5 mb-5 border border-white/5" style={{ background: '#16162A' }}>
                            <div className="text-xs text-gray-400 uppercase tracking-wider font-bold mb-3">Rate your experience</div>
                            <div className="flex gap-2 mb-3">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button key={star} onClick={() => setNewRating(star)} className={`text-2xl transition-transform ${newRating >= star ? 'text-yellow-400 scale-110' : 'text-gray-700 hover:text-yellow-400/40'}`}>
                                        ★
                                    </button>
                                ))}
                                <span className="text-xs text-gray-500 ml-2 self-center">{newRating}/5</span>
                            </div>
                            <textarea
                                value={newReviewText}
                                onChange={(e) => setNewReviewText(e.target.value)}
                                placeholder="Share your experience..."
                                rows={3}
                                maxLength={500}
                                className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none resize-none mb-1 border border-white/10 transition focus:border-pink-500"
                                style={{ background: '#0D0D1A', color: '#e9edef' }}
                            />
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-[10px] text-gray-600">{newReviewText.length}/500</span>
                            </div>
                            <button
                                onClick={submitReview}
                                disabled={!newReviewText.trim()}
                                className={`px-5 py-2 rounded-lg text-sm font-bold transition ${newReviewText.trim() ? `bg-gradient-to-r ${accentGrad} text-white shadow-lg` : 'bg-white/5 text-gray-600 cursor-not-allowed'}`}
                            >
                                Submit Review
                            </button>
                        </div>
                    )}

                    {/* ── Review Cards ── */}
                    <div className="space-y-3">
                        {reviews.length === 0 ? (
                            <div className="py-10 text-center text-gray-600 text-sm">No reviews yet. Be the first!</div>
                        ) : reviews.map((rev) => {
                            const timeAgo = rev.created_at ? (() => {
                                const diff = Date.now() - new Date(rev.created_at).getTime();
                                const mins = Math.floor(diff / 60000);
                                if (mins < 60) return `${mins}m ago`;
                                const hrs = Math.floor(mins / 60);
                                if (hrs < 24) return `${hrs}h ago`;
                                const days = Math.floor(hrs / 24);
                                if (days < 30) return `${days}d ago`;
                                return `${Math.floor(days/30)}mo ago`;
                            })() : '';
                            return (
                                <div key={rev.id} className="flex gap-3 p-4 rounded-2xl border border-white/5 hover:bg-white/5 transition" style={{ background: '#16162A' }}>
                                    <img src={rev.reviewer_pic || 'https://i.pinimg.com/736x/89/90/48/899048ab0cc455154006fdb9676964b3.jpg'} alt={rev.reviewer_name} className="w-10 h-10 rounded-full object-cover shrink-0" />
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-semibold text-sm text-white">{rev.reviewer_name}</span>
                                            <span className="text-yellow-400 text-xs bg-yellow-400/10 px-2 py-0.5 rounded-full border border-yellow-400/20">
                                                {rev.rating} ★
                                            </span>
                                            {timeAgo && <span className="text-[10px] text-gray-600 ml-auto">{timeAgo}</span>}
                                        </div>
                                        <p className="text-gray-400 text-sm">{rev.comment}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ── BOOKING MODAL ── */}
            {showBookingModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center">
                    <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 border border-white/10 shadow-2xl" style={{ background: '#16162A' }}>
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <FiCalendar size={18} style={{ color: accentColor }} /> Setup Meeting
                            </h3>
                            <button onClick={() => setShowBookingModal(false)} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-gray-400 hover:text-white transition">
                                <FiX size={16} />
                            </button>
                        </div>
                        <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
                            {/* Date Picker */}
                            <div>
                                <label className="text-[10px] text-gray-500 uppercase font-bold block mb-1.5">1. Select Date</label>
                                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                                    {(() => {
                                        const days = [];
                                        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                                        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
                                        for (let i = 0; i < 10; i++) {
                                            const d = new Date();
                                            d.setDate(d.getDate() + i);
                                            const yyyy = d.getFullYear();
                                            const mm = String(d.getMonth() + 1).padStart(2, '0');
                                            const dd = String(d.getDate()).padStart(2, '0');
                                            const dateStr = `${yyyy}-${mm}-${dd}`;
                                            days.push({
                                                dateStr,
                                                dayName: i === 0 ? "Today" : i === 1 ? "Tomorrow" : dayNames[d.getDay()],
                                                dayNum: d.getDate(),
                                                month: monthNames[d.getMonth()]
                                            });
                                        }
                                        return days.map((item) => {
                                            const isSelected = meetingInfo.date === item.dateStr;
                                            return (
                                                <button
                                                    key={item.dateStr}
                                                    type="button"
                                                    onClick={() => setMeetingInfo({ ...meetingInfo, date: item.dateStr })}
                                                    className={`flex flex-col items-center justify-center min-w-[68px] h-[78px] rounded-xl border transition-all ${
                                                        isSelected 
                                                            ? `bg-gradient-to-br ${accentGrad} border-transparent text-white shadow-lg scale-105` 
                                                            : 'bg-[#0D0D1A] border-white/10 text-gray-400 hover:border-pink-500/50'
                                                    }`}
                                                >
                                                    <span className="text-[9px] font-bold uppercase opacity-85">{item.dayName}</span>
                                                    <span className="text-lg font-black my-0.5">{item.dayNum}</span>
                                                    <span className="text-[8px] font-bold uppercase tracking-wider opacity-85">{item.month}</span>
                                                </button>
                                            );
                                        });
                                    })()}
                                </div>
                            </div>
                            
                            {/* Time Slot Scheduler */}
                            <div>
                                <div className="flex justify-between items-center mb-1.5">
                                    <label className="text-[10px] text-gray-500 uppercase font-bold">2. Available Time Slots</label>
                                    {loadingSlots && <span className="text-[10px] text-pink-400 animate-pulse">Checking slots...</span>}
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {TIME_SLOTS.map((slot) => {
                                        const isBooked = bookedSlots.some(b => b && b.toLowerCase().includes(slot.label.toLowerCase()));
                                        const isSelected = selectedSlot === slot.id;
                                        return (
                                            <button
                                                key={slot.id}
                                                type="button"
                                                disabled={isBooked}
                                                onClick={() => setSelectedSlot(slot.id)}
                                                className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                                                    isBooked
                                                        ? 'bg-red-500/5 border-red-500/20 text-gray-500 cursor-not-allowed opacity-60'
                                                        : isSelected
                                                            ? `bg-gradient-to-r ${accentGrad} text-white border-transparent shadow-md scale-[1.02]`
                                                            : 'bg-[#0D0D1A] border-white/10 text-gray-300 hover:border-pink-500/40 hover:text-white'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    <span className="text-base">{slot.icon}</span>
                                                    <div>
                                                        <div className="text-xs font-bold leading-tight">{slot.label}</div>
                                                        <div className={`text-[10px] ${isSelected ? 'text-white/80' : 'text-gray-400'}`}>{slot.timeRange}</div>
                                                    </div>
                                                </div>
                                                {isBooked ? (
                                                    <span className="text-[9px] font-bold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20">Booked</span>
                                                ) : isSelected ? (
                                                    <span className="text-xs font-bold">✓</span>
                                                ) : null}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Meeting Location */}
                            <div className="relative">
                                <label className="text-[10px] text-gray-500 uppercase font-bold block mb-1">3. Meeting Location (optional)</label>
                                <div className="relative">
                                    <input 
                                        type="text" 
                                        placeholder="e.g., Starbucks Coffee, Phoenix Mall, etc." 
                                        value={meetingInfo.location} 
                                        onChange={(e) => handleLocationChange(e.target.value)} 
                                        onFocus={() => { if (locationSuggestions.length > 0) setShowSuggestions(true); }}
                                        className="w-full rounded-xl px-4 py-2.5 text-sm text-white outline-none border border-white/10 focus:border-pink-500 transition" 
                                        style={{ background: '#0D0D1A' }} 
                                    />
                                    {searchLoading && (
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
                                            <div className="w-4 h-4 border-2 border-pink-500/20 border-t-pink-500 rounded-full animate-spin" />
                                        </div>
                                    )}
                                </div>

                                {showSuggestions && locationSuggestions.length > 0 && (
                                    <>
                                        <div 
                                            className="fixed inset-0 z-30" 
                                            onClick={() => setShowSuggestions(false)} 
                                        />
                                        <div className="absolute left-0 right-0 mt-1.5 max-h-48 overflow-y-auto rounded-xl border border-white/10 shadow-2xl z-40 bg-[#0D0D1A] divide-y divide-white/5 scrollbar-thin">
                                            {locationSuggestions.map((sug, i) => (
                                                <div 
                                                    key={i}
                                                    onClick={() => {
                                                        setMeetingInfo({ ...meetingInfo, location: sug.label + ", " + sug.description });
                                                        setShowSuggestions(false);
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

                            {/* Booking Price Summary */}
                            <div className="p-3.5 rounded-2xl bg-[#0D0D1A] border border-white/5 flex items-center justify-between">
                                <div>
                                    <div className="text-xs font-semibold text-gray-300">Estimated Total</div>
                                    <div className="text-[10px] text-gray-500">₹{profile.price || 1000}/hr × {hours} hours</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-lg font-black text-pink-400">₹{((profile.price || 1000) * hours).toLocaleString()}</div>
                                    <div className="text-[9px] text-emerald-400">Escrow Protected</div>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-1">
                                <button onClick={() => setShowBookingModal(false)} className="flex-1 py-3 text-sm font-bold text-gray-400 hover:text-white bg-white/5 rounded-xl transition">Cancel</button>
                                <button
                                    onClick={handleBookingSubmit}
                                    disabled={bookingStatus === 'loading'}
                                    className={`flex-1 py-3 font-bold text-sm text-white rounded-xl transition bg-gradient-to-r ${accentGrad} hover:opacity-90 shadow-lg`}
                                >
                                    {bookingStatus === 'loading' ? 'Sending...' : 'Confirm & Request'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── EXPANDED POST ── */}
            {expandedPost && (
                <InstagramPostModal 
                    posts={posts}
                    initialPostId={expandedPost.id}
                    postOwner={profile}
                    currentUser={currentUser}
                    onClose={() => setExpandedPost(null)}
                    onDelete={handleDeletePost}
                />
            )}

            {/* ── PROFILE PICTURE MODAL ── */}
            {showDpModal && profile.profile_pic && (
                <div 
                    className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 transition-all duration-300"
                    onClick={() => setShowDpModal(false)}
                >
                    <style>{`
                        @keyframes scaleIn {
                            from { transform: scale(0.9); opacity: 0; }
                            to { transform: scale(1); opacity: 1; }
                        }
                    `}</style>
                    <div 
                        className="relative max-w-3xl w-full flex flex-col items-center" 
                        style={{ animation: 'scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Close button */}
                        <button 
                            onClick={() => setShowDpModal(false)}
                            className="absolute -top-12 right-0 md:top-4 md:-right-12 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition shadow-lg cursor-pointer"
                        >
                            <FiX size={20} />
                        </button>
                        
                        {/* Image Frame */}
                        <div className="bg-[#16162A] p-2 rounded-3xl border border-white/10 shadow-2xl max-w-[90vw] max-h-[80vh] overflow-hidden">
                            <img 
                                src={profile.profile_pic} 
                                alt={profile.name} 
                                className="max-w-full max-h-[70vh] rounded-2xl object-contain"
                            />
                        </div>
                        
                        {/* Label */}
                        <div className="mt-4 text-center">
                            <span className="text-white font-bold text-sm">{profile.name}</span>
                            <span className="text-gray-400 text-xs block mt-0.5">Profile Picture</span>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── REPORT MODAL ─── */}
            {showReportModal && (
                <div className="fixed inset-0 z-[150] bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
                    <div className="w-full sm:max-w-md bg-[#16162A] rounded-t-3xl sm:rounded-3xl border border-white/10 shadow-2xl p-6">

                        {reportDone ? (
                            <div className="py-8 flex flex-col items-center gap-3">
                                <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                                    <FiCheckCircle size={32} className="text-green-400" />
                                </div>
                                <h3 className="text-lg font-bold text-white">Report Submitted</h3>
                                <p className="text-gray-400 text-sm text-center">Our team will review this report within 24 hours.</p>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center justify-between mb-5">
                                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                        <FiAlertTriangle size={18} className="text-orange-400" />
                                        Report {profile.name?.split(' ')[0]}
                                    </h3>
                                    <button onClick={() => setShowReportModal(false)} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-gray-400 hover:text-white transition">
                                        <FiX size={15} />
                                    </button>
                                </div>

                                <form onSubmit={handleReportSubmit} className="space-y-4">
                                    <p className="text-gray-400 text-xs mb-3">Select a reason for reporting this account:</p>

                                    {/* Reason chips */}
                                    <div className="flex flex-wrap gap-2">
                                        {['Fake Profile', 'Harassment', 'Spam', 'Inappropriate Content', 'Scam', 'Underage', 'Other'].map(reason => (
                                            <button
                                                key={reason}
                                                type="button"
                                                onClick={() => setReportReason(reason)}
                                                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                                                    reportReason === reason
                                                        ? 'bg-orange-500/20 border-orange-500/60 text-orange-300'
                                                        : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/30'
                                                }`}
                                            >
                                                {reason}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Description */}
                                    <textarea
                                        value={reportDesc}
                                        onChange={(e) => setReportDesc(e.target.value)}
                                        placeholder="Additional details (optional)..."
                                        rows={3}
                                        maxLength={300}
                                        className="w-full bg-[#0D0D1A] border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-orange-500 transition resize-none placeholder-gray-600"
                                    />

                                    <button
                                        type="submit"
                                        disabled={!reportReason || reportSubmitting}
                                        className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-bold text-sm transition disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
                                    >
                                        {reportSubmitting ? 'Submitting...' : 'Submit Report'}
                                    </button>
                                </form>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* ── FOLLOWERS / FOLLOWING LIST MODAL ── */}
            {showFollowModal && (
                <div 
                    className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
                    onClick={() => { setShowFollowModal(null); setFollowList([]); }}
                >
                    <div 
                        className="bg-[#121224] border border-white/10 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-scale-up"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="bg-gradient-to-r from-[#181832] to-[#121224] px-5 py-4 border-b border-white/5 flex justify-between items-center">
                            <h3 className="font-extrabold text-white text-sm capitalize">
                                {showFollowModal === 'followers' ? 'Followers' : 'Following'}
                            </h3>
                            <button 
                                onClick={() => { setShowFollowModal(null); setFollowList([]); }}
                                className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center transition"
                            >
                                <FiX size={15} />
                            </button>
                        </div>

                        {/* List Area */}
                        <div className="p-4 max-h-[50vh] overflow-y-auto custom-scrollbar space-y-3">
                            {followListLoading ? (
                                <div className="text-center py-8 text-pink-400 animate-pulse text-xs font-bold">
                                    Loading list...
                                </div>
                            ) : followList.length === 0 ? (
                                <div className="text-center py-8 text-gray-500 text-xs">
                                    {showFollowModal === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}
                                </div>
                            ) : (
                                followList.map(u => {
                                    const isTargetGirl = u.role === 'girl';
                                    return (
                                        <div 
                                            key={u.id}
                                            onClick={() => handleUserClick(u)}
                                            className="flex items-center justify-between p-2.5 rounded-xl hover:bg-white/5 transition cursor-pointer border border-transparent hover:border-white/5"
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                {u.profile_pic ? (
                                                    <img src={u.profile_pic} alt="" className="w-9 h-9 rounded-full object-cover border border-white/10" />
                                                ) : (
                                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white text-xs font-black shadow-inner shrink-0">
                                                        {u.name?.[0]?.toUpperCase()}
                                                    </div>
                                                )}
                                                <div className="min-w-0">
                                                    <span className="font-bold text-white text-xs block truncate">{u.name}</span>
                                                    <span className={`inline-block text-[8px] font-black uppercase tracking-wider px-1 py-0.2 rounded mt-0.5 ${isTargetGirl ? 'bg-pink-500/10 text-pink-400' : 'bg-blue-500/10 text-blue-400'}`}>
                                                        {u.role}
                                                    </span>
                                                </div>
                                            </div>
                                            <span className="text-[10px] text-pink-400 font-extrabold hover:underline">
                                                View Profile →
                                            </span>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default DetailsPage;
