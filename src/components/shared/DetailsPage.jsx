import React, { useState, useEffect } from "react";
import { PAGES } from "../../App";
import { io } from "socket.io-client";

// NAYA: Socket.io connection for sending booking notifications
const socket = io("https://rentgf-and-bf.onrender.com", { autoConnect: false });

function DetailsPage({ girl: profile, currentUser, setPage }) { // Dhyan do: currentUser add kiya hai
    const [hours, setHours] = useState(2);
    const [posts, setPosts] = useState([]);
    const [expandedPost, setExpandedPost] = useState(null);

    // 🟢 NAYE STATES: Bookings aur Reviews ke liye
    const [bookingStatus, setBookingStatus] = useState(null); // 'loading', 'success', null
    const [reviews, setReviews] = useState([]);
    const [avgRating, setAvgRating] = useState(0);
    const [newReviewText, setNewReviewText] = useState("");
    const [newRating, setNewRating] = useState(5);

    useEffect(() => {
        socket.connect();
        return () => socket.disconnect();
    }, []);

    useEffect(() => {
        const fetchUserData = async () => {
            if (!profile) return;

            // 1. Fetch Posts (Agar private nahi hai toh)
            if (!profile.is_private) {
                try {
                    const postRes = await fetch(`https://rentgf-and-bf.onrender.com/api/posts/${profile.id}`);
                    if (postRes.ok) setPosts(await postRes.json());
                } catch (err) { console.error("Posts fetch error:", err); }
            }

            // 2. Fetch Reviews aur Rating
            try {
                const reviewRes = await fetch(`https://rentgf-and-bf.onrender.com/api/reviews/${profile.id}`);
                if (reviewRes.ok) {
                    const data = await reviewRes.json();
                    setReviews(data.reviews);
                    setAvgRating(data.avgRating);
                }
            } catch (err) { console.error("Reviews fetch error:", err); }
        };
        fetchUserData();
    }, [profile]);

    // 🟢 NAYA: Booking handle karne ka function
    const handleBooking = async () => {
        if (!currentUser) return alert("Please login first!");

        setBookingStatus('loading');
        const amount = (profile.price || 1000) * hours;

        // Tumhare purane format ke hisaab se boy_id aur girl_id set kar rahe hain
        const boy_id = currentUser.role === 'boy' ? currentUser.id : profile.id;
        const girl_id = currentUser.role === 'girl' ? currentUser.id : profile.id;

        try {
            const response = await fetch('https://rentgf-and-bf.onrender.com/api/bookings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ boy_id, girl_id, hours, amount })
            });

            if (response.ok) {
                setBookingStatus('success');

                // Socket.io se Notification Bhejna
                socket.emit("send_booking_notification", {
                    receiver_id: profile.id,
                    sender_name: currentUser.name,
                    hours: hours,
                    amount: amount
                });

                // 3 second baad button wapas normal kar do
                setTimeout(() => setBookingStatus(null), 3000);
            }
        } catch (error) {
            console.error("Booking failed:", error);
            setBookingStatus(null);
            alert("Booking failed. Please try again.");
        }
    };

    // 🟢 NAYA: Review Submit karne ka function
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
                setNewReviewText(""); // Box khali kar do
                // Naye reviews database se wapas mangwa lo
                const reviewRes = await fetch(`https://rentgf-and-bf.onrender.com/api/reviews/${profile.id}`);
                const data = await reviewRes.json();
                setReviews(data.reviews);
                setAvgRating(data.avgRating);
            }
        } catch (error) {
            console.error("Review submission failed:", error);
        }
    };

    if (!profile) return null;

    let safeTags = ["Coffee Date", "Movie", "Dinner"];
    if (profile.tags) {
        safeTags = typeof profile.tags === 'string' ? profile.tags.split(',') : profile.tags;
    }

    const firstName = profile.name ? profile.name.split(" ")[0] : "User";
    const profileImage = profile.profile_pic || (profile.role === "boy"
        ? "https://i.pinimg.com/736x/89/90/48/899048ab0cc455154006fdb9676964b3.jpg"
        : "https://i.pinimg.com/736x/a9/58/09/a958095418a0b357314288566dd5c96a.jpg");

    return (
        <div className="pt-16 min-h-screen relative">
            <div className="max-w-4xl mx-auto px-6 py-8">
                <button onClick={() => setPage(PAGES.FIND)} className="text-sm text-gray-400 hover:text-white transition mb-6 flex items-center gap-1">
                    ← Back to Find
                </button>

                {/* Profile Header (Same as before) */}
                <div className="flex flex-col sm:flex-row gap-8 mb-7">
                    <div className="w-full sm:w-64 h-72 bg-gradient-to-br from-pink-500/20 to-purple-500/20 rounded-2xl overflow-hidden flex-shrink-0 border border-white/10 shadow-[0_0_20px_rgba(236,72,153,0.15)] cursor-pointer" onClick={() => setExpandedPost({ image_url: profileImage, caption: `${firstName}'s Profile Picture` })}>
                        <img src={profileImage} alt={profile.name} className="w-full h-full object-cover hover:scale-105 transition" />
                    </div>

                    <div className="flex-1">
                        <div className="flex items-center gap-3 flex-wrap mb-1">
                            <h1 className="text-3xl font-bold">{profile.name}</h1>
                            <span className="text-xs bg-purple-500/15 border border-purple-500/30 text-purple-300 px-2.5 py-1 rounded-full">✓ Verified</span>
                            <span className="text-xs text-green-400 flex items-center gap-1"><span className="w-1.5 h-1.5 bg-green-400 rounded-full" /> Online</span>
                        </div>
                        <p className="text-sm text-gray-400 mb-3">📍 {profile.city || "Unknown City"} · 🎂 {profile.age || "N/A"} years</p>

                        {/* 🟢 NAYA: Asli Rating display */}
                        <div className="text-sm text-yellow-400 mb-4">⭐ {avgRating > 0 ? avgRating : "New"} <span className="text-gray-500">({reviews.length} reviews)</span></div>

                        <p className="text-sm text-gray-300 leading-relaxed mb-4">
                            {profile.bio || "Hi there! I'm looking forward to having some great conversations and spending quality time together."}
                        </p>

                        <div className="flex flex-wrap gap-2 mb-6">
                            {safeTags.map((tag) => (
                                <span key={tag} className="px-3 py-1 bg-pink-500/10 border border-pink-500/20 text-pink-400 text-xs rounded-full">{tag.trim()}</span>
                            ))}
                        </div>

                        <div className="flex gap-3 flex-wrap">
                            <button onClick={() => setPage(PAGES.CHAT)} className="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-full font-semibold text-sm hover:opacity-90 shadow-lg shadow-pink-500/25 transition">
                                💬 Chat with {firstName}
                            </button>
                        </div>
                    </div>
                </div>

                {/* 🟢 NAYA: Booking Section with functionality */}
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

                        {/* Dynamic Booking Button */}
                        <button
                            onClick={handleBooking}
                            disabled={bookingStatus !== null}
                            className={`px-7 py-3.5 rounded-full font-bold text-sm transition ${bookingStatus === 'success' ? 'bg-green-500 text-white' :
                                    bookingStatus === 'loading' ? 'bg-gray-500 text-white cursor-not-allowed' :
                                        'bg-white text-black hover:bg-gray-200'
                                }`}
                        >
                            {bookingStatus === 'success' ? 'Request Sent! ✅' : bookingStatus === 'loading' ? 'Booking...' : 'Confirm Booking'}
                        </button>
                    </div>
                </div>

                {/* Gallery (Same as before) */}
                <div className="mb-10">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        📸 {firstName}'s Gallery
                        {!profile.is_private && <span className="text-xs font-normal bg-white/10 text-gray-400 px-2 py-0.5 rounded-full">{posts.length} posts</span>}
                    </h2>

                    {profile.is_private ? (
                        <div className="bg-[#16162A] border border-white/5 rounded-2xl p-16 text-center flex flex-col items-center justify-center">
                            <div className="text-6xl mb-4 bg-white/5 w-24 h-24 flex items-center justify-center rounded-full border border-white/10">🔒</div>
                            <h3 className="text-2xl font-bold text-white mb-2">This Account is Private</h3>
                            <p className="text-gray-400 text-sm">You need to chat with them to learn more.</p>
                        </div>
                    ) : posts.length === 0 ? (
                        <div className="bg-[#16162A] border border-white/5 rounded-2xl p-8 text-center text-gray-500 text-sm">
                            No photos posted yet.
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                            {posts.map(post => (
                                <div key={post.id} onClick={() => setExpandedPost(post)} className="relative group rounded-xl overflow-hidden aspect-square border border-white/10 shadow-lg cursor-pointer">
                                    <img src={post.image_url} alt="Post" className="w-full h-full object-cover transition duration-500 group-hover:scale-110" />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* 🟢 NAYA: Reviews & Ratings Section */}
                <div className="mb-10 border-t border-white/10 pt-8">
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                        ⭐ Ratings & Reviews
                        <span className="text-xs font-normal bg-white/10 text-gray-400 px-2 py-0.5 rounded-full">{reviews.length}</span>
                    </h2>

                    {/* Write a Review Box */}
                    {currentUser && currentUser.id !== profile.id && (
                        <div className="bg-[#16162A] border border-white/5 rounded-2xl p-5 mb-6">
                            <div className="text-sm font-semibold mb-2">Leave a Review</div>
                            <div className="flex gap-2 mb-3">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        onClick={() => setNewRating(star)}
                                        className={`text-2xl ${newRating >= star ? "text-yellow-400" : "text-gray-600"} hover:scale-110 transition`}
                                    >
                                        ★
                                    </button>
                                ))}
                            </div>
                            <textarea
                                value={newReviewText}
                                onChange={(e) => setNewReviewText(e.target.value)}
                                className="w-full bg-[#0D0D1A] border border-white/10 rounded-xl p-3 text-sm text-white placeholder-gray-500 outline-none focus:border-pink-500 transition resize-none mb-3"
                                placeholder={`How was your experience with ${firstName}?`}
                                rows="3"
                            ></textarea>
                            <button
                                onClick={submitReview}
                                disabled={!newReviewText.trim()}
                                className="px-5 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg font-semibold text-sm hover:opacity-90 transition disabled:opacity-50"
                            >
                                Submit Review
                            </button>
                        </div>
                    )}

                    {/* Reviews List */}
                    {reviews.length === 0 ? (
                        <div className="text-gray-500 text-sm text-center py-4 bg-[#16162A] rounded-2xl border border-white/5">
                            No reviews yet. Be the first to leave one!
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {reviews.map((rev) => (
                                <div key={rev.id} className="bg-[#16162A] border border-white/5 p-4 rounded-xl flex gap-4">
                                    <img src={rev.reviewer_pic || "https://i.pinimg.com/736x/89/90/48/899048ab0cc455154006fdb9676964b3.jpg"} alt={rev.reviewer_name} className="w-10 h-10 rounded-full object-cover shrink-0" />
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-semibold text-sm">{rev.reviewer_name}</span>
                                            <span className="text-yellow-400 text-xs">{"★".repeat(rev.rating)}{"☆".repeat(5 - rev.rating)}</span>
                                        </div>
                                        <p className="text-gray-300 text-sm">{rev.comment}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>

            {/* Fullscreen Post Modal */}
            {expandedPost && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[60] flex items-center justify-center p-4" onClick={() => setExpandedPost(null)}>
                    <button className="absolute top-6 right-6 text-white bg-white/10 hover:bg-white/20 w-10 h-10 rounded-full flex items-center justify-center text-xl transition">✕</button>
                    <div className="max-w-3xl w-full max-h-[90vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
                        <img src={expandedPost.image_url} alt="Expanded" className="w-full max-h-[80vh] object-contain rounded-xl" />
                    </div>
                </div>
            )}
        </div>
    );
}

export default DetailsPage;