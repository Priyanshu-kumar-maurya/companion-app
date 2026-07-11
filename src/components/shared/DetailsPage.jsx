import React, { useState, useEffect, useRef } from "react";
import { PAGES } from "../../App";
import { io } from "socket.io-client";
import { FiArrowLeft, FiMapPin, FiMessageCircle, FiStar, FiGrid, FiLock, FiShield, FiX, FiCalendar, FiClock, FiMoreVertical, FiFlag, FiSlash, FiShare2, FiAlertTriangle, FiCheckCircle, FiTrash2 } from "react-icons/fi";

const socket = io("https://rentgf-and-bf.onrender.com", {
    autoConnect: false,
    transports: ['websocket']
});

function DetailsPage({ girl: profile, currentUser, setPage, setSelectedGirl }) {
    const [hours, setHours] = useState(2);
    const [posts, setPosts] = useState([]);
    const [expandedPost, setExpandedPost] = useState(null);

    const [bookingStatus, setBookingStatus] = useState(null);
    const [reviews, setReviews] = useState([]);
    const [avgRating, setAvgRating] = useState(0);
    const [newReviewText, setNewReviewText] = useState("");
    const [newRating, setNewRating] = useState(5);

    const [followStats, setFollowStats] = useState({ followers: 0, following: 0, isFollowing: false });
    const [followLoading, setFollowLoading] = useState(false);
    const [isOnline, setIsOnline] = useState(false);

    // Followers / Following Modal States
    const [showFollowModal, setShowFollowModal] = useState(null); // 'followers' | 'following' | null
    const [followList, setFollowList] = useState([]);
    const [followListLoading, setFollowListLoading] = useState(false);

    const canViewList = !profile.is_private || followStats.isFollowing || profile.id === currentUser?.id;

    const handleOpenFollowModal = async (type) => {
        if (!canViewList) {
            alert("🔒 This account is private. Follow them to see their followers and following list.");
            return;
        }
        setShowFollowModal(type);
        setFollowListLoading(true);
        try {
            const response = await fetch(`https://rentgf-and-bf.onrender.com/api/${type === 'followers' ? 'followers-list' : 'following-list'}/${profile.id}`);
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
    const [meetingInfo, setMeetingInfo] = useState({ date: "", time: "", location: "" });

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
                    const postRes = await fetch(`https://rentgf-and-bf.onrender.com/api/posts/${profile.id}`);
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
        if (!meetingInfo.date || !meetingInfo.time) return alert("Please select Date and Time!");

        setBookingStatus('loading');
        const amount = (profile.price || 1000) * hours;

        const boy_id = currentUser.role === 'boy' ? currentUser.id : profile.id;
        const girl_id = currentUser.role === 'girl' ? currentUser.id : profile.id;

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
                    meeting_time: meetingInfo.time,
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
                alert("Review submitted! ⭐");
            } else {
                const err = await response.json().catch(() => ({}));
                alert(err.error || "Review submit nahi hua, try again.");
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
                    <span className="font-bold text-sm tracking-wide text-gray-200">
                        {profile.name?.split(' ')[0]}'s Profile
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
            <div className="max-w-4xl mx-auto px-4 pt-6 md:pt-10">
                <div className="flex flex-col md:flex-row gap-6 md:gap-20 items-center md:items-start pb-8 border-b border-white/5 mb-6">
                    
                    {/* Left: Avatar with gradient ring */}
                    <div 
                        className={`relative w-28 h-28 md:w-36 md:h-36 rounded-full p-[3px] shadow-2xl cursor-pointer shrink-0 bg-gradient-to-br ${accentGrad}`}
                        onClick={() => profile.profile_pic && setExpandedPost({ image_url: profile.profile_pic, caption: `${firstName}'s Photo` })}
                    >
                        <div className="w-full h-full rounded-full overflow-hidden bg-[#0D0D1A]">
                            {profile.profile_pic ? (
                                <img src={profile.profile_pic} alt={profile.name} className="w-full h-full object-cover" />
                            ) : (
                                <div className={`w-full h-full bg-gradient-to-br ${accentGrad} flex items-center justify-center`}>
                                    <span className="text-white font-bold text-4xl">{profile.name?.[0]?.toUpperCase()}</span>
                                </div>
                            )}
                        </div>
                        {isOnline && <span className="absolute bottom-1 right-1 w-4 h-4 bg-green-400 border-2 border-[#0D0D1A] rounded-full" />}
                    </div>

                    {/* Right: Profile Info Block */}
                    <div className="flex-1 w-full flex flex-col items-center md:items-start text-center md:text-left">
                        
                        {/* Row 1: Username & Action Buttons */}
                        <div className="flex flex-col sm:flex-row items-center gap-3.5 mb-4 w-full justify-center md:justify-start">
                            <span className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                                {profile.name?.toLowerCase().replace(/\s+/g, '')}
                                {profile.kyc_status === 'verified' && (
                                    <span className="text-blue-400" title="Verified Companion">✔</span>
                                )}
                            </span>
                            
                            <div className="flex gap-2">
                                {currentUser && currentUser.id !== profile.id && (
                                    <button
                                        onClick={handleFollowToggle}
                                        disabled={followLoading}
                                        className={`px-6 py-1.5 rounded-lg font-bold text-xs transition min-w-[90px] ${followStats.isFollowing
                                            ? 'bg-white/10 text-white hover:bg-white/15 border border-white/10'
                                            : `bg-gradient-to-r ${accentGrad} text-white hover:opacity-90 shadow-md`}`}
                                    >
                                        {followLoading ? '...' : followStats.isFollowing ? 'Following' : 'Follow'}
                                    </button>
                                )}
                                <button
                                    onClick={() => setPage(PAGES.CHAT)}
                                    className="px-6 py-1.5 bg-[#262626] hover:bg-[#363636] border border-white/5 text-white rounded-lg font-bold text-xs transition flex items-center gap-1.5"
                                >
                                    Message
                                </button>
                            </div>
                        </div>

                        {/* Row 2: Inline Stats (like Instagram: 0 posts  30 followers  60 following) */}
                        <div className="w-full flex justify-around md:justify-start gap-8 py-3.5 md:py-0 mb-4 border-y md:border-none border-white/5 text-xs text-gray-300">
                            <div className="flex flex-col md:flex-row items-center gap-0.5 md:gap-1.5">
                                <span className="font-extrabold text-white text-sm">{posts.length}</span>
                                <span className="text-gray-400">posts</span>
                            </div>
                            
                            <button
                                onClick={() => handleOpenFollowModal('followers')}
                                className={`flex flex-col md:flex-row items-center gap-0.5 md:gap-1.5 outline-none ${canViewList ? 'cursor-pointer hover:text-white transition' : 'opacity-60 cursor-not-allowed'}`}
                            >
                                <span className="font-extrabold text-white text-sm">{followStats.followers}</span>
                                <span className="text-gray-400">followers</span>
                            </button>

                            <button
                                onClick={() => handleOpenFollowModal('following')}
                                className={`flex flex-col md:flex-row items-center gap-0.5 md:gap-1.5 outline-none ${canViewList ? 'cursor-pointer hover:text-white transition' : 'opacity-60 cursor-not-allowed'}`}
                            >
                                <span className="font-extrabold text-white text-sm">{followStats.following}</span>
                                <span className="text-gray-400">following</span>
                            </button>

                            <div className="flex flex-col md:flex-row items-center gap-0.5 md:gap-1.5">
                                <span className="font-extrabold text-yellow-400 text-sm flex items-center gap-0.5">
                                    ⭐ {avgRating > 0 ? Number(avgRating).toFixed(1) : 'New'}
                                </span>
                                <span className="text-gray-400">({reviews.length} reviews)</span>
                            </div>
                        </div>

                        {/* Row 3 & 4: Full Name, Location, Age, Bio & Tags */}
                        <div className="w-full space-y-1.5 text-xs md:text-sm text-gray-300">
                            <div className="font-extrabold text-white text-sm">{profile.name}</div>
                            
                            <div className="flex items-center justify-center md:justify-start gap-1.5 text-gray-400 text-xs">
                                <span>📍 {profile.city || 'Unknown'}</span>
                                <span className="w-1 h-1 bg-gray-600 rounded-full" />
                                <span>{profile.age || 'N/A'} yrs</span>
                                <span className="w-1 h-1 bg-gray-600 rounded-full" />
                                {isOnline ? (
                                    <span className="text-green-400 font-bold">Online</span>
                                ) : (
                                    <span className="text-gray-500">Offline</span>
                                )}
                            </div>

                            {profile.bio && (
                                <p className="text-gray-300 leading-relaxed pt-1.5 text-xs">{profile.bio}</p>
                            )}

                            {/* Tags */}
                            <div className="flex flex-wrap gap-1.5 pt-2 justify-center md:justify-start">
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

                    </div>
                </div>

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
                                Submit Review ⭐
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
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] text-gray-500 uppercase font-bold block mb-1">Date</label>
                                    <input type="date" value={meetingInfo.date} onChange={(e) => setMeetingInfo({ ...meetingInfo, date: e.target.value })} className="w-full rounded-xl px-4 py-2.5 text-sm text-white outline-none border border-white/10 focus:border-pink-500 transition" style={{ background: '#0D0D1A' }} />
                                </div>
                                <div>
                                    <label className="text-[10px] text-gray-500 uppercase font-bold block mb-1">Time</label>
                                    <input type="time" value={meetingInfo.time} onChange={(e) => setMeetingInfo({ ...meetingInfo, time: e.target.value })} className="w-full rounded-xl px-4 py-2.5 text-sm text-white outline-none border border-white/10 focus:border-pink-500 transition" style={{ background: '#0D0D1A' }} />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] text-gray-500 uppercase font-bold block mb-1">Location (optional)</label>
                                <input type="text" placeholder="e.g., Starbucks, Café, etc." value={meetingInfo.location} onChange={(e) => setMeetingInfo({ ...meetingInfo, location: e.target.value })} className="w-full rounded-xl px-4 py-2.5 text-sm text-white outline-none border border-white/10 focus:border-pink-500 transition" style={{ background: '#0D0D1A' }} />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button onClick={() => setShowBookingModal(false)} className="flex-1 py-3 text-sm font-bold text-gray-400 hover:text-white bg-white/5 rounded-xl transition">Cancel</button>
                                <button
                                    onClick={handleBookingSubmit}
                                    disabled={bookingStatus === 'loading'}
                                    className={`flex-1 py-3 font-bold text-sm text-white rounded-xl transition bg-gradient-to-r ${accentGrad} hover:opacity-90 shadow-lg`}
                                >
                                    {bookingStatus === 'loading' ? 'Sending...' : 'Send Request'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── EXPANDED POST ── */}
            {expandedPost && (
                <div 
                    className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[120] flex items-center justify-center p-4 animate-fade-in"
                    onClick={() => setExpandedPost(null)}
                >
                    <div 
                        className="bg-[#121224] border border-white/10 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col relative"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/5 bg-[#16162A]">
                            <div className="flex items-center gap-3">
                                {profile.profile_pic ? (
                                    <img src={profile.profile_pic} alt="" className="w-8 h-8 rounded-full object-cover border border-white/10" />
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white text-xs font-black shadow-inner">
                                        {profile.name?.[0]?.toUpperCase()}
                                    </div>
                                )}
                                <div>
                                    <span className="font-bold text-white text-xs block">{profile.name.split(' ')[0]}</span>
                                    <span className="text-[9px] text-gray-500 block">📍 {profile.city || "India"}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {/* Delete button in modal if viewed profile is the current logged-in user */}
                                {expandedPost.id && profile.id === currentUser?.id && (
                                    <button
                                        onClick={() => handleDeletePost(expandedPost.id)}
                                        className="w-8 h-8 rounded-full bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white flex items-center justify-center transition"
                                        title="Delete Post"
                                    >
                                        <FiTrash2 size={14} />
                                    </button>
                                )}
                                <button
                                    onClick={() => setExpandedPost(null)}
                                    className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center transition"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>

                        {/* Image Area */}
                        <div className="bg-black/40 flex items-center justify-center aspect-square overflow-hidden relative">
                            <img 
                                src={expandedPost.image_url} 
                                alt="Expanded" 
                                className="w-full h-full object-contain"
                            />
                        </div>

                        {/* Footer (Caption) */}
                        {expandedPost.caption && (
                            <div className="p-4 border-t border-white/5 bg-[#121224]">
                                <p className="text-xs text-gray-300 leading-relaxed">
                                    <span className="font-bold text-white mr-1.5">{profile.name.split(' ')[0]}</span>
                                    {expandedPost.caption}
                                </p>
                            </div>
                        )}
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
