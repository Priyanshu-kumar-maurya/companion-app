import React, { useState, useEffect } from "react";
import { PAGES } from "../../App";
import { io } from "socket.io-client";
import { FiArrowLeft, FiMapPin, FiMessageCircle, FiStar, FiGrid, FiLock, FiShield, FiX, FiCalendar, FiClock } from "react-icons/fi";

const socket = io("https://rentgf-and-bf.onrender.com", {
    autoConnect: false,
    transports: ['websocket']
});

function DetailsPage({ girl: profile, currentUser, setPage }) {
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

    const [showBookingModal, setShowBookingModal] = useState(false);
    const [meetingInfo, setMeetingInfo] = useState({
        date: "",
        time: "",
        location: ""
    });

    useEffect(() => {
        if (!socket.connected) socket.connect();
        // Don't disconnect on unmount — booking notification needs time to send
    }, []);

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

            if (!profile.is_private) {
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

            try {
                const currentUserId = currentUser ? currentUser.id : '';
                const statsRes = await fetch(`https://rentgf-and-bf.onrender.com/api/follow-stats/${profile.id}?currentUserId=${currentUserId}`);
                if (statsRes.ok) {
                    fetchedFollowStats = await statsRes.json();
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
            const response = await fetch('https://rentgf-and-bf.onrender.com/api/reviews', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    reviewer_id: currentUser.id,
                    companion_id: profile.id,
                    rating: newRating,
                    comment: newReviewText
                })
            });

            if (response.ok) {
                setNewReviewText("");
                const reviewRes = await fetch(`https://rentgf-and-bf.onrender.com/api/reviews/${profile.id}`);
                const data = await reviewRes.json();
                setReviews(data.reviews);
                setAvgRating(data.avgRating);
            }
        } catch (error) {
            console.error(error);
        }
    };

    if (!profile) return null;

    let safeTags = profile.tags ? (typeof profile.tags === 'string' ? profile.tags.split(',') : profile.tags) : ["Coffee Date", "Movie"];
    const firstName = profile.name ? profile.name.split(" ")[0] : "User";
    const accentColor = profile.role === 'boy' ? '#3b82f6' : '#ec4899';
    const accentGrad = profile.role === 'boy' ? 'from-blue-500 to-purple-600' : 'from-pink-500 to-purple-600';

    return (
        <div className="min-h-[100dvh] relative bg-[#0D0D1A] pb-20">

            {/* ── COVER BANNER ── */}
            <div className="relative h-52 sm:h-64 overflow-hidden">
                {profile.profile_pic ? (
                    <img src={profile.profile_pic} alt="cover" className="w-full h-full object-cover scale-110" style={{ filter: 'blur(18px) brightness(0.45)' }} />
                ) : (
                    <div className={`w-full h-full bg-gradient-to-br ${accentGrad} opacity-30`} />
                )}
                {/* gradient fade bottom */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0D0D1A]" />

                {/* Back button */}
                <button
                    onClick={() => setPage(PAGES.FIND)}
                    className="absolute top-4 left-4 w-9 h-9 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-md text-white hover:bg-black/60 transition z-10"
                >
                    <FiArrowLeft size={18} />
                </button>
            </div>

            {/* ── PROFILE PIC + NAME ── */}
            <div className="max-w-2xl mx-auto px-4">
                <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 -mt-16 sm:-mt-20 mb-4">

                    {/* Profile pic with gradient ring */}
                    <div
                        className={`relative w-28 h-28 sm:w-36 sm:h-36 rounded-full p-[3px] shadow-2xl cursor-pointer shrink-0 bg-gradient-to-br ${accentGrad}`}
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
                        {/* Online dot */}
                        <span className="absolute bottom-1 right-1 w-4 h-4 bg-green-400 border-2 border-[#0D0D1A] rounded-full" />
                    </div>

                    {/* Name + verified + action buttons (sm: side-by-side) */}
                    <div className="flex-1 text-center sm:text-left pb-1">
                        <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                            <h1 className="text-2xl sm:text-3xl font-bold text-white">{profile.name}</h1>
                            {profile.kyc_status === 'verified' && (
                                <span className="flex items-center gap-1 text-[10px] bg-blue-500/20 text-blue-400 px-2.5 py-1 rounded-full font-bold border border-blue-500/30">
                                    <FiShield size={10} /> Verified
                                </span>
                            )}
                        </div>
                        <div className="flex items-center justify-center sm:justify-start gap-2 text-xs text-gray-400 mb-3">
                            <FiMapPin size={11} /> {profile.city || 'Unknown'}
                            <span className="w-1 h-1 bg-gray-600 rounded-full" />
                            {profile.age || 'N/A'} yrs
                            <span className="w-1 h-1 bg-gray-600 rounded-full" />
                            <span className="text-green-400 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" /> Online
                            </span>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center justify-center sm:justify-start gap-2">
                            {currentUser && currentUser.id !== profile.id && (
                                <button
                                    onClick={handleFollowToggle}
                                    disabled={followLoading}
                                    className={`px-5 py-2 rounded-lg font-bold text-sm transition ${followStats.isFollowing
                                        ? 'bg-white/10 text-white hover:bg-white/15 border border-white/20'
                                        : `bg-gradient-to-r ${accentGrad} text-white hover:opacity-90 shadow-lg`}`}
                                >
                                    {followLoading ? '...' : followStats.isFollowing ? 'Following' : 'Follow'}
                                </button>
                            )}
                            <button
                                onClick={() => setPage(PAGES.CHAT)}
                                className="px-5 py-2 bg-white/10 border border-white/20 text-white rounded-lg font-bold text-sm hover:bg-white/15 transition flex items-center gap-1.5"
                            >
                                <FiMessageCircle size={14} /> Message
                            </button>
                        </div>
                    </div>
                </div>

                {/* ── STATS ROW ── */}
                <div className="flex items-center justify-around border-y border-white/5 py-4 mb-5">
                    <div className="flex flex-col items-center">
                        <span className="text-lg font-bold text-white">{posts.length}</span>
                        <span className="text-[11px] text-gray-400">Posts</span>
                    </div>
                    <div className="w-px h-8 bg-white/5" />
                    <div className="flex flex-col items-center">
                        <span className="text-lg font-bold text-white">{followStats.followers}</span>
                        <span className="text-[11px] text-gray-400">Followers</span>
                    </div>
                    <div className="w-px h-8 bg-white/5" />
                    <div className="flex flex-col items-center">
                        <span className="text-lg font-bold text-white">{followStats.following}</span>
                        <span className="text-[11px] text-gray-400">Following</span>
                    </div>
                    <div className="w-px h-8 bg-white/5" />
                    <div className="flex flex-col items-center">
                        <span className="text-lg font-bold text-yellow-400 flex items-center gap-1">
                            <FiStar size={14} className="fill-yellow-400" />
                            {avgRating > 0 ? Number(avgRating).toFixed(1) : 'New'}
                        </span>
                        <span className="text-[11px] text-gray-400">{reviews.length} Reviews</span>
                    </div>
                </div>

                {/* Bio */}
                {profile.bio && (
                    <p className="text-sm text-gray-300 leading-relaxed mb-4">{profile.bio}</p>
                )}

                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-6">
                    {safeTags.map((tag) => (
                        <span key={tag} className="px-3 py-1.5 text-[11px] font-medium rounded-full" style={{ background: `${accentColor}18`, color: accentColor, border: `1px solid ${accentColor}30` }}>
                            {tag.trim()}
                        </span>
                    ))}
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
                    {profile.is_private ? (
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

                    {currentUser && currentUser.id !== profile.id && (
                        <div className="rounded-2xl p-5 mb-5 border border-white/5" style={{ background: '#16162A' }}>
                            <div className="text-xs text-gray-400 uppercase tracking-wider font-bold mb-3">Rate your experience</div>
                            <div className="flex gap-2 mb-3">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button key={star} onClick={() => setNewRating(star)} className={`text-2xl transition-transform ${newRating >= star ? 'text-yellow-400 scale-110' : 'text-gray-700 hover:text-yellow-400/40'}`}>
                                        ★
                                    </button>
                                ))}
                            </div>
                            <textarea
                                value={newReviewText}
                                onChange={(e) => setNewReviewText(e.target.value)}
                                placeholder="Share your experience..."
                                rows={3}
                                className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none resize-none mb-3 border border-white/10 transition"
                                style={{ background: '#0D0D1A', color: '#e9edef' }}
                            />
                            <button
                                onClick={submitReview}
                                disabled={!newReviewText.trim()}
                                className={`px-5 py-2 rounded-lg text-sm font-bold transition ${newReviewText.trim() ? `bg-gradient-to-r ${accentGrad} text-white shadow-lg` : 'bg-white/5 text-gray-600 cursor-not-allowed'}`}
                            >
                                Submit
                            </button>
                        </div>
                    )}

                    <div className="space-y-3">
                        {reviews.length === 0 ? (
                            <div className="py-10 text-center text-gray-600 text-sm">No reviews yet. Be the first!</div>
                        ) : reviews.map((rev) => (
                            <div key={rev.id} className="flex gap-3 p-4 rounded-2xl border border-white/5 hover:bg-white/5 transition" style={{ background: '#16162A' }}>
                                <img src={rev.reviewer_pic || 'https://i.pinimg.com/736x/89/90/48/899048ab0cc455154006fdb9676964b3.jpg'} alt={rev.reviewer_name} className="w-10 h-10 rounded-full object-cover shrink-0" />
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-semibold text-sm text-white">{rev.reviewer_name}</span>
                                        <span className="text-yellow-400 text-xs bg-yellow-400/10 px-2 py-0.5 rounded-full border border-yellow-400/20">{rev.rating} ★</span>
                                    </div>
                                    <p className="text-gray-400 text-sm">{rev.comment}</p>
                                </div>
                            </div>
                        ))}
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
                <div className="fixed inset-0 bg-black/95 z-[120] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setExpandedPost(null)}>
                    <button className="absolute top-5 right-5 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition">
                        <FiX size={18} />
                    </button>
                    <div className="max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
                        <img src={expandedPost.image_url} alt="Expanded" className="w-full max-h-[85vh] object-contain rounded-xl shadow-2xl" />
                        {expandedPost.caption && (
                            <p className="text-white text-center mt-4 text-sm bg-black/50 px-5 py-2.5 rounded-full border border-white/10 backdrop-blur-md mx-auto w-fit">
                                {expandedPost.caption}
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default DetailsPage;