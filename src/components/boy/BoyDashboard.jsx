import React, { useState, useEffect } from "react";
import SettingsModal from '../shared/SettingsModal';
import SOSButton from '../shared/SOSButton';
import InstagramPostModal from '../shared/InstagramPostModal';
import { FiBell, FiSettings, FiLink, FiAlertTriangle, FiCheckCircle, FiClock, FiCreditCard, FiStar, FiCalendar, FiGrid, FiTrash2, FiMapPin, FiX, FiUser, FiShield } from "react-icons/fi";
import imageCompression from 'browser-image-compression';

function BoyDashboard({ user, setBoyUser, setPage, setSelectedGirl, socket }) {
    const [myPosts, setMyPosts] = useState([]);
    const [expandedPost, setExpandedPost] = useState(null);
    const [kycUploading, setKycUploading] = useState(false);
    const [myBookings, setMyBookings] = useState([]);
    const [newBookingAlert, setNewBookingAlert] = useState(null);
    const [showSettings, setShowSettings] = useState(false);
    const [followStats, setFollowStats] = useState({ followers: 0, following: 0 });

    const [activeStatModal, setActiveStatModal] = useState(null);
    const [bookingFilter, setBookingFilter] = useState('all');
    const [reviews, setReviews] = useState([]);
    const [showVerifiedBanner, setShowVerifiedBanner] = useState(() => {
        return localStorage.getItem('verifiedBannerClosed') !== 'true';
    });
    const [followList, setFollowList] = useState([]);
    const [followListLoading, setFollowListLoading] = useState(false);


    useEffect(() => {
        if (!user) return;

        const cacheKey = `boyDashboardCache_${user.id}`;
        const cachedData = sessionStorage.getItem(cacheKey);

        if (cachedData) {
            const parsedData = JSON.parse(cachedData);
            if (parsedData.myPosts) setMyPosts(parsedData.myPosts);
            if (parsedData.myBookings) setMyBookings(parsedData.myBookings);
            if (parsedData.followStats) setFollowStats(parsedData.followStats);
            if (parsedData.reviews) setReviews(parsedData.reviews);
        }

        const fetchDashboardData = async () => {
            try {
                let fetchedPosts = [];
                let fetchedBookings = [];
                let fetchedFollowStats = { followers: 0, following: 0 };
                let fetchedReviews = [];

                const token = localStorage.getItem("token");
                const postsHeaders = {};
                if (token) postsHeaders["Authorization"] = `Bearer ${token}`;
                const postsRes = await fetch(`https://rentgf-and-bf.onrender.com/api/posts/${user.id}`, { headers: postsHeaders });
                if (postsRes.ok) fetchedPosts = await postsRes.json();

                const bookingsRes = await fetch(`https://rentgf-and-bf.onrender.com/api/bookings/${user.id}`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                });
                if (bookingsRes.ok) fetchedBookings = await bookingsRes.json();


                const statsRes = await fetch(`https://rentgf-and-bf.onrender.com/api/follow-stats/${user.id}`);
                if (statsRes.ok) fetchedFollowStats = await statsRes.json();

                const reviewRes = await fetch(`https://rentgf-and-bf.onrender.com/api/reviews/${user.id}`);
                if (reviewRes.ok) {
                    const data = await reviewRes.json();
                    fetchedReviews = data.reviews;
                }

                setMyPosts(fetchedPosts);
                setMyBookings(fetchedBookings);
                setFollowStats(fetchedFollowStats);
                setReviews(fetchedReviews);

                sessionStorage.setItem(cacheKey, JSON.stringify({
                    myPosts: fetchedPosts,
                    myBookings: fetchedBookings,
                    followStats: fetchedFollowStats,
                    reviews: fetchedReviews
                }));
            } catch (err) {
                console.error(err);
            }
        };
        fetchDashboardData();
    }, [user]);

    useEffect(() => {
        if (!socket || !user) return;

        socket.emit("join_room", user.id.toString());
        socket.emit("join_own_room", user.id);

        const handleReceiveBooking = (data) => {
            setNewBookingAlert(data);
            fetch(`https://rentgf-and-bf.onrender.com/api/bookings/${user.id}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            })
                .then(res => res.json())
                .then(data => setMyBookings(data));
            setTimeout(() => setNewBookingAlert(null), 5000);
        };


        socket.on("receive_booking_notification", handleReceiveBooking);

        return () => {
            socket.off("receive_booking_notification", handleReceiveBooking);
        };
    }, [socket, user]);

    const handleKycUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setKycUploading(true);

        try {
            const options = {
                maxSizeMB: 0.5,
                maxWidthOrHeight: 1024,
                useWebWorker: true
            };
            const compressedFile = await imageCompression(file, options);

            const formData = new FormData();
            formData.append("id_document", compressedFile);

            const token = localStorage.getItem('token');
            const response = await fetch(`https://rentgf-and-bf.onrender.com/api/kyc/${user.id}`, {
                method: "POST",
                body: formData,
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                await response.json();
                setBoyUser({ ...user, kyc_status: 'pending' });
                alert("ID Submitted! Please wait 24 hours for verification. ⏳");
            }
        } catch (err) {
            console.error(err);
            alert("Upload failed. Try again.");
        } finally {
            setKycUploading(false);
        }
    };

    const handleBookingStatus = async (bookingId, newStatus) => {
        try {
            const response = await fetch(`https://rentgf-and-bf.onrender.com/api/bookings/${bookingId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ status: newStatus })
            });


            if (response.ok) {
                setMyBookings(myBookings.map(b => b.id === bookingId ? { ...b, status: newStatus } : b));
            }
        } catch (error) {
            console.error(error);
        }
    };

    const openFollowList = async (type) => {
        setFollowList([]);
        setFollowListLoading(true);
        setActiveStatModal(type);
        try {
            const endpoint = type === 'followers'
                ? `/api/followers-list/${user.id}`
                : `/api/following-list/${user.id}`;
            const res = await fetch(`https://rentgf-and-bf.onrender.com${endpoint}`);
            if (res.ok) setFollowList(await res.json());
        } catch (e) { console.error(e); }
        setFollowListLoading(false);
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
                setMyPosts(myPosts.filter(post => post.id !== postId));
                setExpandedPost(null);
            }
        } catch (err) { console.error("Delete post error:", err); }
    };

    const myTags = user.tags ? user.tags.split(',') : ["Coffee Date", "Movie"];
    const pendingBookings = myBookings.filter(b => b.status === 'pending');
    const completedBookings = myBookings.filter(b => b.status === 'completed');
    const totalEarnings = completedBookings.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);

    const filteredBookings = myBookings.filter(b => {
        if (bookingFilter === 'all') return true;
        if (bookingFilter === 'canceled') return b.status === 'rejected';
        return b.status === bookingFilter;
    });

    const notificationsList = pendingBookings.map(b => ({
        id: `booking-${b.id}`,
        type: 'booking',
        message: `${b.girl_name || 'Someone'} requested a booking for ${b.hours} hrs.`,
        time: b.created_at,
        pic: b.girl_pic
    }));

    return (
        <div className="pt-16 pb-20 min-h-[100dvh] relative bg-[#0D0D1A]">
            {newBookingAlert && (
                <div className="fixed top-20 right-6 z-50 bg-blue-500 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-bounce">
                    <FiBell size={22} />
                    <div>
                        <div className="font-bold text-sm">New Booking Update!</div>
                        <div className="text-xs">{newBookingAlert.sender_name} sent a request for {newBookingAlert.hours} hrs</div>
                    </div>
                </div>
            )}

            <div className="max-w-3xl mx-auto px-4 py-6">
                {/* ── Instagram-style Profile Header ── */}
                <div className="flex flex-col gap-4 mb-6 pb-6 border-b border-white/5">
                    {/* Top Row: Avatar on Left, Stats on Right */}
                    <div className="flex items-center justify-between sm:justify-start gap-6 w-full">
                        {/* Profile Pic */}
                        <div
                            className="relative w-20 h-20 sm:w-28 sm:h-28 shrink-0 cursor-pointer"
                            onClick={() => user?.profile_pic && setExpandedPost({ image_url: user.profile_pic, caption: "Profile Picture" })}
                        >
                            <div className="w-full h-full rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 p-[3px] shadow-xl shadow-blue-500/20">
                                <div className="w-full h-full rounded-full overflow-hidden bg-[#0D0D1A] flex items-center justify-center">
                                    {user?.profile_pic ? (
                                        <img src={user.profile_pic} alt={user.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <FiUser size={36} className="text-gray-400" />
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Stats columns */}
                        <div className="flex-1 flex justify-around sm:justify-start sm:gap-12 max-w-sm">
                            <div className="flex flex-col items-center sm:items-start">
                                <span className="text-sm sm:text-base font-bold text-white leading-none">{myPosts.length}</span>
                                <span className="text-[10px] sm:text-[11px] text-gray-500 mt-1 uppercase tracking-wider">Posts</span>
                            </div>
                            <button
                                className="flex flex-col items-center sm:items-start cursor-pointer hover:opacity-70 transition"
                                onClick={() => openFollowList('followers')}
                            >
                                <span className="text-sm sm:text-base font-bold text-white leading-none">{followStats.followers}</span>
                                <span className="text-[10px] sm:text-[11px] text-gray-500 mt-1 uppercase tracking-wider">Followers</span>
                            </button>
                            <button
                                className="flex flex-col items-center sm:items-start cursor-pointer hover:opacity-70 transition"
                                onClick={() => openFollowList('following')}
                            >
                                <span className="text-sm sm:text-base font-bold text-white leading-none">{followStats.following}</span>
                                <span className="text-[10px] sm:text-[11px] text-gray-500 mt-1 uppercase tracking-wider">Following</span>
                            </button>
                        </div>
                    </div>

                    {/* Name + Bio + Link (Left-aligned) */}
                    <div className="text-left w-full">
                        <div className="flex items-center gap-2 mb-1.5">
                            <h1 className="text-base sm:text-lg font-bold text-white">{user.name}</h1>
                            {user.kyc_status === 'verified' && (
                                <span className="flex items-center gap-1 text-[9px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full font-bold border border-blue-500/20">
                                    <FiShield size={9} /> Verified
                                </span>
                            )}
                        </div>
                        {user.bio && <p className="text-gray-300 text-sm leading-relaxed mb-1">{user.bio}</p>}
                        {user.social_link && (
                            <a
                                href={user.social_link.startsWith('http') ? user.social_link : `https://${user.social_link}`}
                                target="_blank" rel="noreferrer"
                                className="text-blue-400 text-xs hover:underline flex items-center gap-1 w-fit mt-1.5"
                            >
                                <FiLink size={12} /> {user.social_link}
                            </a>
                        )}
                    </div>

                    {/* Full-width action button for Edit Profile */}
                    <div className="w-full flex gap-3">
                        <button
                            onClick={() => setShowSettings(true)}
                            className="flex-1 py-2 bg-white/10 border border-white/20 text-white rounded-xl text-xs font-bold hover:bg-white/20 transition flex items-center justify-center gap-1.5"
                        >
                            <FiSettings size={13} /> Edit Profile
                        </button>
                    </div>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-2 justify-start mb-5">
                    {myTags.map((tag, i) => (
                        <span key={i} className="px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[11px] rounded-full">
                            {tag.trim()}
                        </span>
                    ))}
                </div>

                {/* empty — bio/tags now inside header */}

                <div className="mb-5">
                    {(!user.kyc_status || user.kyc_status === 'unverified') && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="flex items-start gap-3">
                                <FiAlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" />
                                <div>
                                    <h3 className="text-red-400 font-bold text-sm">KYC Verification Required</h3>
                                    <p className="text-xs text-gray-400 mt-1">Upload a valid Govt. ID (Aadhaar/PAN) to get the Verified badge.</p>
                                </div>
                            </div>
                            <label className="shrink-0 px-5 py-2.5 bg-red-500/20 hover:bg-red-500 text-white rounded-lg text-xs font-bold cursor-pointer transition border border-red-500/50">
                                Upload ID Proof
                                <input type="file" accept="image/*" className="hidden" onChange={handleKycUpload} disabled={kycUploading} />
                            </label>
                        </div>
                    )}
                    {user.kyc_status === 'pending' && (
                        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 flex items-center gap-3">
                            <FiClock size={20} className="text-yellow-400 shrink-0 animate-spin" />
                            <div>
                                <h3 className="text-yellow-400 font-bold text-sm">KYC Under Review</h3>
                                <p className="text-xs text-gray-400 mt-1">Your ID is being verified. Usually takes 12-24 hours.</p>
                            </div>
                        </div>
                    )}
                    {user.kyc_status === 'verified' && showVerifiedBanner && (
                        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex items-center gap-3">
                            <FiCheckCircle size={20} className="text-green-400 shrink-0" />
                            <div className="flex-1">
                                <h3 className="text-green-400 font-bold text-sm">Account Verified</h3>
                                <p className="text-xs text-gray-400 mt-1">Your identity is verified. Trust badge is active on your profile!</p>
                            </div>
                            <button
                                onClick={() => { setShowVerifiedBanner(false); localStorage.setItem('verifiedBannerClosed', 'true'); }}
                                className="shrink-0 w-9 h-9 flex items-center justify-center text-gray-400 hover:text-white transition rounded-full hover:bg-white/10 active:bg-white/20"
                                style={{ minWidth: 36, minHeight: 36 }}
                            >
                                <FiX size={18} />
                            </button>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-7">
                    <div className="bg-[#16162A] border border-white/5 rounded-2xl p-4 cursor-pointer hover:bg-white/5 transition group" onClick={() => setActiveStatModal('earnings')}>
                        <div className="flex items-center gap-1.5 text-[11px] text-gray-400 mb-2"><FiCreditCard size={12} className="text-blue-400" /> Earnings</div>
                        <div className="text-xl font-bold text-blue-400">₹{totalEarnings}</div>
                    </div>
                    <div className="bg-[#16162A] border border-white/5 rounded-2xl p-4 cursor-pointer hover:bg-white/5 transition group" onClick={() => setActiveStatModal('rating')}>
                        <div className="flex items-center gap-1.5 text-[11px] text-gray-400 mb-2"><FiStar size={12} className="text-yellow-400" /> Rating</div>
                        <div className="text-xl font-bold text-yellow-400">
                            {reviews.length > 0 
                                ? (reviews.reduce((acc, curr) => acc + curr.rating, 0) / reviews.length).toFixed(1) 
                                : "No Rating"
                            }
                        </div>
                    </div>
                    <div className="bg-[#16162A] border border-white/5 rounded-2xl p-4 cursor-pointer hover:bg-white/5 transition relative group" onClick={() => setActiveStatModal('my_bookings')}>
                        <div className="flex items-center gap-1.5 text-[11px] text-gray-400 mb-2"><FiCalendar size={12} className="text-green-400" /> Bookings</div>
                        <div className="text-xl font-bold text-green-400">{completedBookings.length}</div>
                        {pendingBookings.length > 0 && (
                            <span className="absolute top-2 right-2 flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                            </span>
                        )}
                    </div>
                    <div className="bg-[#16162A] border border-white/5 rounded-2xl p-4 cursor-pointer hover:bg-white/5 transition group" onClick={() => setActiveStatModal('notifications')}>
                        <div className="flex items-center gap-1.5 text-[11px] text-gray-400 mb-2"><FiBell size={12} className="text-purple-400" /> Alerts</div>
                        <div className="text-xl font-bold text-purple-400">{notificationsList.length}</div>
                    </div>
                </div>

                {/* ── Instagram-style Posts Grid ── */}
                <div className="mb-6">
                    <div className="flex items-center gap-2 text-white font-semibold mb-4 border-t border-white/5 pt-5">
                        <FiGrid size={16} className="text-gray-400" />
                        <span className="text-sm uppercase tracking-wider text-gray-300">Posts</span>
                    </div>
                    {myPosts.length === 0 ? (
                        <div className="text-sm text-gray-500 py-12 text-center flex flex-col items-center gap-2">
                            <FiGrid size={40} className="text-gray-600" />
                            <p>No photos posted yet.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 gap-0.5">
                            {myPosts.map(post => (
                                <div key={post.id} onClick={() => setExpandedPost(post)} className="relative group aspect-square cursor-pointer overflow-hidden">
                                    <img src={post.image_url} alt="Post" className="w-full h-full object-cover transition duration-300 group-hover:brightness-75" />
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDeletePost(post.id); }}
                                        className="absolute top-2 right-2 bg-red-500/90 text-white w-7 h-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow-lg"
                                        title="Delete Post"
                                    >
                                        <FiTrash2 size={13} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>

            {expandedPost && (
                <InstagramPostModal 
                    posts={myPosts}
                    initialPostId={expandedPost.id}
                    postOwner={user}
                    currentUser={user}
                    onClose={() => setExpandedPost(null)}
                    onDelete={handleDeletePost}
                />
            )}

            {showSettings && (
                <SettingsModal
                    user={user}
                    setUser={setBoyUser}
                    onClose={() => setShowSettings(false)}
                    setPage={setPage}
                    socket={socket}
                />
            )}

            {activeStatModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => { setActiveStatModal(null); setBookingFilter('all'); }}>
                    <div className="bg-[#16162A] w-full max-w-md rounded-2xl border border-white/10 shadow-2xl overflow-hidden relative flex flex-col max-h-[80vh]" onClick={(e) => e.stopPropagation()}>

                        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between bg-[#16162A] sticky top-0 z-20">
                            <h2 className="text-lg font-bold text-white">
                                {activeStatModal === 'earnings' && "Earnings History"}
                                {activeStatModal === 'rating' && "Reviews & Ratings"}
                                {activeStatModal === 'my_bookings' && "My Bookings"}
                                {activeStatModal === 'notifications' && "Notifications"}
                                {activeStatModal === 'followers' && `Followers (${followStats.followers})`}
                                {activeStatModal === 'following' && `Following (${followStats.following})`}
                            </h2>
                            <button onClick={() => { setActiveStatModal(null); setBookingFilter('all'); }} className="w-8 h-8 bg-white/5 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition">✕</button>
                        </div>

                        <div className="overflow-y-auto p-5 space-y-4 custom-scrollbar">

                            {activeStatModal === 'my_bookings' && (
                                <>
                                    <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar shrink-0 sticky top-0 bg-[#16162A] z-10 -mt-2 pt-2">
                                        {['all', 'pending', 'accepted', 'completed', 'canceled'].map(filter => (
                                            <button
                                                key={filter}
                                                onClick={() => setBookingFilter(filter)}
                                                className={`px-4 py-1.5 rounded-full text-[11px] font-bold capitalize whitespace-nowrap transition-all ${bookingFilter === filter
                                                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                                                    : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/5'
                                                    }`}
                                            >
                                                {filter}
                                            </button>
                                        ))}
                                    </div>

                                    {filteredBookings.length === 0 ? (
                                        <div className="text-sm text-gray-500 py-10 text-center">No {bookingFilter !== 'all' ? bookingFilter : ''} bookings found.</div>
                                    ) : (
                                        <div className="flex flex-col gap-4">
                                            {filteredBookings.map((booking) => (
                                                <div key={booking.id} className="bg-[#0D0D1A] border border-white/5 p-4 rounded-xl flex flex-col gap-4">
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <img src={booking.girl_pic || "https://cdn-icons-png.flaticon.com/512/3135/3135768.png"} className="w-12 h-12 rounded-full object-cover border border-white/10" alt="Companion" />
                                                            <div>
                                                                <div className="font-bold text-sm text-white">{booking.girl_name}</div>
                                                                <div className="text-xs text-blue-400">{booking.hours} hours • ₹{booking.amount}</div>
                                                            </div>
                                                        </div>
                                                        <div className="text-[10px] text-gray-500">{new Date(booking.created_at).toLocaleDateString()}</div>
                                                    </div>
                                                    <div className="bg-white/5 border border-white/5 rounded-lg p-3 space-y-2">
                                                        <div className="text-[11px] text-gray-400 flex items-center gap-2"><FiCalendar size={11} className="text-blue-400" /> <b>Date & Time:</b> {booking.meeting_date ? new Date(booking.meeting_date).toLocaleDateString() : 'N/A'} at {booking.meeting_time || 'N/A'}</div>
                                                        <div className="text-[11px] text-gray-400 flex items-center gap-2"><FiMapPin size={11} className="text-red-400" /> <b>Location:</b> {booking.meeting_location || 'Not specified'}</div>
                                                        {booking.meeting_details && <div className="text-[11px] text-gray-500 italic px-2 border-l border-white/10">"{booking.meeting_details}"</div>}
                                                    </div>

                                                    <div className="flex gap-2 justify-end pt-2 border-t border-white/5">
                                                        {booking.status === 'pending' && (
                                                            (booking.sender_id === user.id || (!booking.sender_id && user.role === 'boy')) ? (
                                                                <>
                                                                    <span className="text-yellow-400 text-xs font-bold border border-yellow-400/20 px-3 py-2 rounded-lg bg-yellow-400/10 flex items-center gap-1">
                                                                        <FiClock size={11} /> Pending Approval
                                                                    </span>
                                                                    <button onClick={() => handleBookingStatus(booking.id, 'rejected')} className="px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-xs font-bold hover:bg-red-500 hover:text-white transition">
                                                                        Cancel Request
                                                                    </button>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <button onClick={() => handleBookingStatus(booking.id, 'accepted')} className="px-4 py-2 bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg text-xs font-bold hover:bg-green-500 hover:text-white transition">
                                                                        Accept
                                                                    </button>
                                                                    <button onClick={() => handleBookingStatus(booking.id, 'rejected')} className="px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-xs font-bold hover:bg-red-500 hover:text-white transition">
                                                                        Reject
                                                                    </button>
                                                                </>
                                                            )
                                                        )}
                                                        {booking.status === 'accepted' && (
                                                            <button onClick={() => handleBookingStatus(booking.id, 'completed')} className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg text-xs font-bold shadow-lg">
                                                                Mark Done
                                                            </button>
                                                        )}
                                                        {booking.status === 'completed' && <span className="text-green-400 text-xs font-bold border border-green-400/20 px-3 py-1.5 rounded-lg bg-green-400/10 flex items-center gap-1"><FiCheckCircle size={12} /> Completed</span>}
                                                        {booking.status === 'rejected' && <span className="text-red-400 text-xs font-bold border border-red-400/20 px-3 py-1.5 rounded-lg bg-red-400/10 flex items-center gap-1"><FiX size={12} /> Canceled</span>}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}

                            {activeStatModal === 'earnings' && (
                                completedBookings.length === 0 ? <p className="text-gray-500 text-center py-4 text-sm">No earnings recorded yet.</p> :
                                    completedBookings.map(b => (
                                        <div key={b.id} className="flex justify-between items-center bg-[#0D0D1A] p-3 rounded-xl border border-white/5 hover:bg-white/5 transition">
                                            <div>
                                                <p className="text-sm font-bold text-white">{b.girl_name}</p>
                                                <p className="text-[10px] text-gray-500">{new Date(b.created_at).toLocaleDateString()} • {b.hours} hrs</p>
                                            </div>
                                            <div className="text-blue-400 font-bold">+₹{b.amount}</div>
                                        </div>
                                    ))
                            )}

                            {activeStatModal === 'rating' && (
                                reviews.length === 0 ? <p className="text-gray-500 text-center py-4 text-sm">No reviews yet.</p> :
                                    reviews.map(rev => (
                                        <div key={rev.id} className="bg-[#0D0D1A] border border-white/5 p-4 rounded-xl flex gap-3 hover:bg-white/5 transition">
                                            <img src={rev.reviewer_pic || "https://i.pinimg.com/736x/89/90/48/899048ab0cc455154006fdb9676964b3.jpg"} alt={rev.reviewer_name} className="w-10 h-10 rounded-full object-cover shrink-0" />
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-semibold text-sm text-white">{rev.reviewer_name}</span>
                                                    <span className="text-yellow-400 text-xs">{"★".repeat(rev.rating)}</span>
                                                </div>
                                                <p className="text-gray-300 text-xs">{rev.comment}</p>
                                            </div>
                                        </div>
                                    ))
                            )}

                            {activeStatModal === 'notifications' && (
                                notificationsList.length === 0 ? <p className="text-gray-500 text-center py-4 text-sm">No new notifications.</p> :
                                    notificationsList.map(notif => (
                                        <div key={notif.id} className="flex justify-between items-center bg-[#0D0D1A] p-3 rounded-xl border border-white/5 hover:bg-white/5 cursor-pointer transition">
                                            <div className="flex items-center gap-3">
                                                <img src={notif.pic || "https://i.pinimg.com/736x/89/90/48/899048ab0cc455154006fdb9676964b3.jpg"} className="w-10 h-10 rounded-full object-cover" alt="User" />
                                                <div>
                                                    <p className="text-sm text-white">{notif.message}</p>
                                                    <p className="text-[10px] text-gray-500">{new Date(notif.time).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                            {notif.type === 'booking' && <span className="text-blue-400 text-[10px] bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20 shrink-0">Action Needed</span>}
                                        </div>
                                    ))
                            )}
                            {(activeStatModal === 'followers' || activeStatModal === 'following') && (
                                followListLoading ? (
                                    <div className="flex items-center justify-center py-10">
                                        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                    </div>
                                ) : followList.length === 0 ? (
                                    <div className="text-center py-10 text-gray-500 text-sm">
                                        <FiUser size={36} className="mx-auto mb-2 text-gray-600" />
                                        No {activeStatModal} yet.
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-3">
                                        {followList.map(u => (
                                            <div key={u.id} className="flex items-center gap-3 bg-[#0D0D1A] p-3 rounded-xl border border-white/5 hover:bg-white/5 transition">
                                                <img
                                                    src={u.profile_pic || "https://cdn-icons-png.flaticon.com/512/3135/3135768.png"}
                                                    alt={u.name}
                                                    className="w-11 h-11 rounded-full object-cover border border-white/10 shrink-0"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-white truncate">{u.name}</p>
                                                    <p className="text-[10px] text-gray-500 capitalize mt-0.5">{u.role}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )
                            )}

                        </div>
                    </div>
                </div>
            )}
            <SOSButton user={user} socket={socket} />
        </div>
    );
}

export default BoyDashboard;