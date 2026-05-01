import React, { useState, useEffect } from "react";
import { PAGES } from "../../App";
import { io } from "socket.io-client";

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

    // --- FOLLOW STATE ---
    const [followStats, setFollowStats] = useState({ followers: 0, following: 0, isFollowing: false });
    const [followLoading, setFollowLoading] = useState(false);

    const [showBookingModal, setShowBookingModal] = useState(false);
    const [meetingInfo, setMeetingInfo] = useState({
        date: "",
        time: "",
        location: ""
    });

    useEffect(() => {
        socket.connect();
        return () => socket.disconnect();
    }, []);

    useEffect(() => {
        const fetchUserData = async () => {
            if (!profile) return;

            // Fetch Posts
            if (!profile.is_private) {
                try {
                    const postRes = await fetch(`https://rentgf-and-bf.onrender.com/api/posts/${profile.id}`);
                    if (postRes.ok) setPosts(await postRes.json());
                } catch (err) { }
            }

            // Fetch Reviews
            try {
                const reviewRes = await fetch(`https://rentgf-and-bf.onrender.com/api/reviews/${profile.id}`);
                if (reviewRes.ok) {
                    const data = await reviewRes.json();
                    setReviews(data.reviews);
                    setAvgRating(data.avgRating);
                }
            } catch (err) { }

            // Fetch Follow Stats
            try {
                const currentUserId = currentUser ? currentUser.id : '';
                const statsRes = await fetch(`https://rentgf-and-bf.onrender.com/api/follow-stats/${profile.id}?currentUserId=${currentUserId}`);
                if (statsRes.ok) {
                    const statsData = await statsRes.json();
                    setFollowStats(statsData);
                }
            } catch (err) { }
        };
        fetchUserData();
    }, [profile, currentUser]);

    // --- FOLLOW/UNFOLLOW FUNCTION ---
    const handleFollowToggle = async () => {
        if (!currentUser) return alert("Please login to follow!");
        if (currentUser.id === profile.id) return alert("You cannot follow yourself.");

        setFollowLoading(true);
        const endpoint = followStats.isFollowing ? '/api/unfollow' : '/api/follow';

        try {
            const res = await fetch(`https://rentgf-and-bf.onrender.com${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ follower_id: currentUser.id, following_id: profile.id })
            });

            if (res.ok) {
                setFollowStats(prev => ({
                    ...prev,
                    isFollowing: !prev.isFollowing,
                    followers: prev.isFollowing ? prev.followers - 1 : prev.followers + 1
                }));
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
            const response = await fetch('https://rentgf-and-bf.onrender.com/api/bookings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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
            }
        } catch (error) {
            setBookingStatus(null);
            alert("Booking failed. Please try again.");
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
        } catch (error) { }
    };

    if (!profile) return null;

    let safeTags = profile.tags ? (typeof profile.tags === 'string' ? profile.tags.split(',') : profile.tags) : ["Coffee Date", "Movie"];
    const firstName = profile.name ? profile.name.split(" ")[0] : "User";

    // Yahan hum decide karenge ki ring ka color kaisa hoga (Boy ke liye Blue, Girl ke liye Pink)
    const ringColor = profile.role === 'boy' ? "border-blue-500/30" : "border-pink-500/30";
    const gradientBg = profile.role === 'boy' ? "from-blue-500/30 to-purple-500/30" : "from-pink-500/30 to-purple-500/30";

    return (
        <div className="pt-20 min-h-[100dvh] relative bg-[#0D0D1A]">
            <div className="max-w-3xl mx-auto px-6 py-8">
                <button onClick={() => setPage(PAGES.FIND)} className="text-sm text-gray-400 hover:text-white transition mb-6 flex items-center gap-1">← Back to Explore</button>

                {/* --- 🚨 NAYA CLEAN PROFILE HEADER (DASHBOARD STYLE) 🚨 --- */}
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-8 text-center sm:text-left">

                    {/* DP - Gol aur choti, bina kisi badde dibbe ke */}
                    <div
                        className={`w-32 h-32 sm:w-40 sm:h-40 rounded-full flex-shrink-0 border-[3px] ${ringColor} p-1 cursor-pointer`}
                        onClick={() => profile.profile_pic && setExpandedPost({ image_url: profile.profile_pic, caption: `${firstName}'s Profile Picture` })}
                    >
                        <div className={`w-full h-full rounded-full overflow-hidden bg-gradient-to-br ${gradientBg} flex items-center justify-center text-6xl shadow-lg`}>
                            {profile.profile_pic ? (
                                <img src={profile.profile_pic} alt={profile.name} className="w-full h-full object-cover transition hover:scale-105" />
                            ) : ("😊")}
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col justify-center sm:pt-2">
                        <div className="flex flex-col sm:flex-row items-center gap-3 mb-2">
                            <h1 className="text-2xl sm:text-3xl font-bold text-white">{profile.name}</h1>
                            {profile.kyc_status === 'verified' && <span className="text-[10px] bg-green-500/20 text-green-400 px-2.5 py-1 rounded-full font-bold uppercase tracking-wide">✓ Verified</span>}
                        </div>

                        <p className="text-sm text-gray-400 mb-4 flex items-center justify-center sm:justify-start gap-2">
                            📍 {profile.city || "Unknown City"}
                            <span className="w-1 h-1 bg-gray-600 rounded-full"></span>
                            🎂 {profile.age || "N/A"} years
                            <span className="w-1 h-1 bg-gray-600 rounded-full"></span>
                            <span className="text-xs text-green-400 flex items-center gap-1"><span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" /> Online</span>
                        </p>

                        {/* Stats Row */}
                        <div className="flex gap-6 justify-center sm:justify-start mb-5 items-center bg-[#16162A] w-fit sm:mx-0 mx-auto px-6 py-3 rounded-2xl border border-white/5 shadow-sm">
                            <div className="flex flex-col items-center">
                                <span className="text-lg font-bold text-white">{followStats.followers}</span>
                                <span className="text-[10px] uppercase tracking-wider text-gray-500">Followers</span>
                            </div>
                            <div className="w-px h-8 bg-white/10"></div>
                            <div className="flex flex-col items-center">
                                <span className="text-lg font-bold text-white">{followStats.following}</span>
                                <span className="text-[10px] uppercase tracking-wider text-gray-500">Following</span>
                            </div>
                            <div className="w-px h-8 bg-white/10"></div>
                            <div className="flex flex-col items-center">
                                <span className="text-lg font-bold text-yellow-400">⭐ {avgRating > 0 ? avgRating : "New"}</span>
                                <span className="text-[10px] uppercase tracking-wider text-gray-500">{reviews.length} Reviews</span>
                            </div>
                        </div>

                        <p className="text-sm text-gray-300 leading-relaxed max-w-md mx-auto sm:mx-0">{profile.bio || "Hi there! I'm looking forward to having some great conversations."}</p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-8 justify-center sm:justify-start border-b border-white/5 pb-8">
                    {safeTags.map((tag) => <span key={tag} className={`px-3 py-1.5 bg-white/5 border text-xs font-medium rounded-full ${profile.role === 'boy' ? 'border-blue-500/20 text-blue-400' : 'border-pink-500/20 text-pink-400'}`}>{tag.trim()}</span>)}
                </div>

                {/* --- ACTION BUTTONS --- */}
                <div className="flex gap-3 flex-wrap justify-center sm:justify-start mb-10">
                    {currentUser && currentUser.id !== profile.id && (
                        <button
                            onClick={handleFollowToggle}
                            disabled={followLoading}
                            className={`px-8 py-3.5 rounded-xl font-bold text-sm shadow-lg transition flex items-center justify-center min-w-[140px] ${followStats.isFollowing
                                ? "bg-white/10 text-white hover:bg-white/20 border border-white/20"
                                : `bg-${profile.role === 'boy' ? 'blue' : 'pink'}-500 text-white hover:opacity-90`
                                }`}
                        >
                            {followLoading ? "Wait..." : followStats.isFollowing ? "Unfollow" : "Follow"}
                        </button>
                    )}
                    <button onClick={() => setPage(PAGES.CHAT)} className="px-8 py-3.5 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl font-bold text-sm hover:opacity-90 shadow-lg shadow-pink-500/20 transition flex items-center gap-2">
                        💬 Message
                    </button>
                </div>

                {/* --- BOOKING SECTION --- */}
                <div className="bg-[#16162A] border border-white/5 rounded-3xl p-6 md:p-8 mb-8 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/10 rounded-bl-full pointer-events-none"></div>
                    <div className="text-xl font-extrabold mb-6 text-white relative z-10">📅 Book a Session</div>
                    <div className="flex gap-2 flex-wrap mb-8 relative z-10">
                        {[1, 2, 3, 4, 5].map((h) => (
                            <button key={h} onClick={() => setHours(h)} className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition ${hours === h ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-md border-transparent" : "bg-white/5 border border-white/10 text-gray-400 hover:border-pink-500/30 hover:text-white"}`}>
                                {h} hr{h > 1 ? "s" : ""}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center justify-between flex-wrap gap-6 border-t border-white/10 pt-6 relative z-10">
                        <div>
                            <div className="text-sm text-gray-400 font-medium mb-1">Total Amount</div>
                            <div className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400">₹{(profile.price || 1000) * hours}</div>
                        </div>
                        <button
                            onClick={() => setShowBookingModal(true)}
                            className="px-8 py-4 bg-white text-black rounded-xl font-extrabold text-sm hover:bg-gray-200 transition shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                        >
                            {bookingStatus === 'success' ? 'Request Sent! ✅' : 'Confirm Booking'}
                        </button>
                    </div>
                </div>

                {showBookingModal && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                        <div className="bg-[#16162A] border border-white/10 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6">
                            <h3 className="text-xl font-bold mb-5 text-white">📅 Setup Meeting</h3>
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] text-gray-500 uppercase font-bold ml-1">Select Date</label>
                                        <input type="date" value={meetingInfo.date} onChange={(e) => setMeetingInfo({ ...meetingInfo, date: e.target.value })} className="w-full bg-[#0D0D1A] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-pink-500 outline-none" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-gray-500 uppercase font-bold ml-1">Select Time</label>
                                        <input type="time" value={meetingInfo.time} onChange={(e) => setMeetingInfo({ ...meetingInfo, time: e.target.value })} className="w-full bg-[#0D0D1A] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-pink-500 outline-none" />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] text-gray-500 uppercase font-bold ml-1">Location (Optional)</label>
                                    <input type="text" placeholder="e.g., Starbucks, Mall, etc." value={meetingInfo.location} onChange={(e) => setMeetingInfo({ ...meetingInfo, location: e.target.value })} className="w-full bg-[#0D0D1A] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-pink-500 outline-none" />
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <button onClick={() => setShowBookingModal(false)} className="flex-1 py-3 text-sm font-bold text-gray-400 hover:text-white transition bg-white/5 rounded-xl">Cancel</button>
                                    <button onClick={handleBookingSubmit} disabled={bookingStatus === 'loading'} className="flex-1 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-pink-500/20 hover:opacity-90 transition">
                                        {bookingStatus === 'loading' ? 'Sending...' : 'Send Request'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="mb-10 pt-8">
                    <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 text-white">📸 {firstName}'s Gallery</h2>
                    {profile.is_private ? (
                        <div className="bg-[#16162A] border border-white/5 rounded-2xl p-16 text-center shadow-inner">
                            <span className="text-4xl block mb-2">🔒</span>
                            <p className="text-gray-400 font-medium">This account is private.</p>
                        </div>
                    ) : posts.length === 0 ? (
                        <div className="bg-[#16162A] border border-white/5 rounded-2xl p-10 text-center shadow-inner text-gray-500 text-sm">
                            No photos posted yet.
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            {posts.map(post => (
                                <div key={post.id} onClick={() => setExpandedPost(post)} className="rounded-2xl overflow-hidden aspect-square border border-white/10 cursor-pointer relative group">
                                    <img src={post.image_url} alt="Post" className="w-full h-full object-cover transition duration-500 group-hover:scale-110" />
                                    {post.caption && <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 to-transparent text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">{post.caption}</div>}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="mb-10 border-t border-white/10 pt-10">
                    <div className="flex items-center gap-3 mb-6">
                        <h2 className="text-2xl font-bold text-white">⭐ Reviews</h2>
                        <span className="text-xs font-bold bg-white/10 text-gray-300 px-3 py-1 rounded-full">{reviews.length} total</span>
                    </div>

                    {currentUser && currentUser.id !== profile.id && (
                        <div className="bg-[#16162A] border border-white/5 rounded-3xl p-6 mb-8 shadow-lg">
                            <div className="text-sm font-semibold text-gray-300 mb-3">Leave a Rating</div>
                            <div className="flex gap-2 mb-4">
                                {[1, 2, 3, 4, 5].map((star) => <button key={star} onClick={() => setNewRating(star)} className={`text-3xl transition ${newRating >= star ? "text-yellow-400 scale-110 drop-shadow-[0_0_5px_rgba(250,204,21,0.5)]" : "text-gray-600 hover:text-yellow-400/50"}`}>★</button>)}
                            </div>
                            <textarea value={newReviewText} onChange={(e) => setNewReviewText(e.target.value)} className="w-full bg-[#0D0D1A] border border-white/10 rounded-2xl p-4 text-sm text-white outline-none focus:border-pink-500 mb-4 resize-none transition" placeholder="Tell others about your experience..." rows="3" />
                            <button onClick={submitReview} disabled={!newReviewText.trim()} className={`px-6 py-2.5 rounded-xl text-sm font-bold transition ${newReviewText.trim() ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg" : "bg-white/5 text-gray-500 cursor-not-allowed"}`}>Submit Review</button>
                        </div>
                    )}

                    <div className="space-y-4">
                        {reviews.length === 0 ? (
                            <div className="bg-[#16162A] border border-white/5 rounded-2xl p-8 text-center shadow-inner text-gray-500 text-sm">
                                No reviews yet. Be the first to review!
                            </div>
                        ) : reviews.map((rev) => (
                            <div key={rev.id} className="bg-[#16162A] border border-white/5 p-5 rounded-2xl flex gap-4 hover:bg-white/5 transition">
                                <img src={rev.reviewer_pic || "https://i.pinimg.com/736x/89/90/48/899048ab0cc455154006fdb9676964b3.jpg"} alt={rev.reviewer_name} className="w-12 h-12 rounded-full object-cover shrink-0 border border-white/10" />
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-bold text-sm text-white">{rev.reviewer_name}</span>
                                        <span className="text-yellow-400 text-[10px] bg-yellow-400/10 px-2 py-0.5 rounded-full border border-yellow-400/20 flex items-center gap-1">
                                            {rev.rating} ★
                                        </span>
                                    </div>
                                    <p className="text-gray-400 text-sm mt-2">{rev.comment}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {expandedPost && (
                <div className="fixed inset-0 bg-black/95 z-[120] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setExpandedPost(null)}>
                    <button className="absolute top-6 right-6 text-white bg-white/10 hover:bg-red-500 w-12 h-12 rounded-full flex items-center justify-center text-xl transition">✕</button>
                    <div className="max-w-4xl w-full max-h-[90vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
                        <img src={expandedPost.image_url} alt="Expanded" className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl border border-white/10" />
                        {expandedPost.caption && <p className="text-white text-center mt-6 text-base bg-black/60 px-6 py-3 rounded-full border border-white/10 backdrop-blur-md">{expandedPost.caption}</p>}
                    </div>
                </div>
            )}
        </div>
    );
}

export default DetailsPage;