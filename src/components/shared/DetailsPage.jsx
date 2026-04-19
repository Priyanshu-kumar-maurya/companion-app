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

            if (!profile.is_private) {
                try {
                    const postRes = await fetch(`https://rentgf-and-bf.onrender.com/api/posts/${profile.id}`);
                    if (postRes.ok) setPosts(await postRes.json());
                } catch (err) { }
            }

            try {
                const reviewRes = await fetch(`https://rentgf-and-bf.onrender.com/api/reviews/${profile.id}`);
                if (reviewRes.ok) {
                    const data = await reviewRes.json();
                    setReviews(data.reviews);
                    setAvgRating(data.avgRating);
                }
            } catch (err) { }
        };
        fetchUserData();
    }, [profile]);

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
                    meeting_location: meetingInfo.location
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
    const profileImage = profile.profile_pic || (profile.role === "boy" ? "https://i.pinimg.com/736x/89/90/48/899048ab0cc455154006fdb9676964b3.jpg" : "https://i.pinimg.com/736x/a9/58/09/a958095418a0b357314288566dd5c96a.jpg");

    return (
        <div className="pt-16 min-h-screen relative">
            <div className="max-w-4xl mx-auto px-6 py-8">
                <button onClick={() => setPage(PAGES.FIND)} className="text-sm text-gray-400 hover:text-white transition mb-6 flex items-center gap-1">← Back to Find</button>

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
                        <div className="text-sm text-yellow-400 mb-4">⭐ {avgRating > 0 ? avgRating : "New"} <span className="text-gray-500">({reviews.length} reviews)</span></div>
                        <p className="text-sm text-gray-300 leading-relaxed mb-4">{profile.bio || "Hi there! I'm looking forward to having some great conversations."}</p>
                        <div className="flex flex-wrap gap-2 mb-6">
                            {safeTags.map((tag) => <span key={tag} className="px-3 py-1 bg-pink-500/10 border border-pink-500/20 text-pink-400 text-xs rounded-full">{tag.trim()}</span>)}
                        </div>
                        <div className="flex gap-3 flex-wrap">
                            <button onClick={() => setPage(PAGES.CHAT)} className="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-full font-semibold text-sm hover:opacity-90 shadow-lg shadow-pink-500/25 transition">💬 Chat with {firstName}</button>
                        </div>
                    </div>
                </div>

                <div className="bg-[#16162A] border border-white/5 rounded-2xl p-6 mb-8">
                    <div className="text-base font-semibold mb-4">📅 Book a Session</div>
                    <div className="flex gap-2 flex-wrap mb-6">
                        {[1, 2, 3, 4, 5].map((h) => (
                            <button key={h} onClick={() => setHours(h)} className={`px-4 py-2 rounded-xl text-sm border transition ${hours === h ? "bg-pink-500/15 border-pink-500 text-pink-300" : "border-white/10 text-gray-400 hover:border-pink-500/30"}`}>{h} hr{h > 1 ? "s" : ""}</button>
                        ))}
                    </div>
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div>
                            <div className="text-3xl font-bold text-pink-400">₹{(profile.price || 1000) * hours}</div>
                            <div className="text-xs text-gray-400">for {hours} hour session</div>
                        </div>
                        <button
                            onClick={() => setShowBookingModal(true)}
                            className="px-7 py-3.5 bg-white text-black rounded-full font-bold text-sm hover:bg-gray-200 transition"
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

                <div className="mb-10 pt-8 border-t border-white/10">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">📸 {firstName}'s Gallery</h2>
                    {profile.is_private ? (
                        <div className="bg-[#16162A] border border-white/5 rounded-2xl p-16 text-center">🔒 Private Account</div>
                    ) : posts.length === 0 ? (
                        <div className="text-gray-500 text-sm">No photos yet.</div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            {posts.map(post => (
                                <div key={post.id} onClick={() => setExpandedPost(post)} className="rounded-xl overflow-hidden aspect-square border border-white/10 cursor-pointer">
                                    <img src={post.image_url} alt="Post" className="w-full h-full object-cover transition hover:scale-110" />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="mb-10 border-t border-white/10 pt-8">
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2">⭐ Ratings & Reviews <span className="text-xs font-normal bg-white/10 text-gray-400 px-2 py-0.5 rounded-full">{reviews.length}</span></h2>
                    {currentUser && currentUser.id !== profile.id && (
                        <div className="bg-[#16162A] border border-white/5 rounded-2xl p-5 mb-6">
                            <div className="flex gap-2 mb-3">
                                {[1, 2, 3, 4, 5].map((star) => <button key={star} onClick={() => setNewRating(star)} className={`text-2xl ${newRating >= star ? "text-yellow-400" : "text-gray-600"}`}>★</button>)}
                            </div>
                            <textarea value={newReviewText} onChange={(e) => setNewReviewText(e.target.value)} className="w-full bg-[#0D0D1A] border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-pink-500 mb-3" placeholder="How was your experience?" rows="3" />
                            <button onClick={submitReview} disabled={!newReviewText.trim()} className="px-5 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg text-sm font-semibold">Submit Review</button>
                        </div>
                    )}
                    <div className="space-y-4">
                        {reviews.length === 0 ? <div className="text-gray-500 text-sm text-center py-4 bg-[#16162A] rounded-2xl">No reviews yet.</div> : reviews.map((rev) => (
                            <div key={rev.id} className="bg-[#16162A] border border-white/5 p-4 rounded-xl flex gap-4">
                                <img src={rev.reviewer_pic || "https://i.pinimg.com/736x/89/90/48/899048ab0cc455154006fdb9676964b3.jpg"} alt={rev.reviewer_name} className="w-10 h-10 rounded-full object-cover shrink-0" />
                                <div>
                                    <div className="flex items-center gap-2 mb-1"><span className="font-semibold text-sm">{rev.reviewer_name}</span><span className="text-yellow-400 text-xs">{"★".repeat(rev.rating)}</span></div>
                                    <p className="text-gray-300 text-sm">{rev.comment}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {expandedPost && (
                <div className="fixed inset-0 bg-black/90 z-[120] flex items-center justify-center p-4" onClick={() => setExpandedPost(null)}>
                    <img src={expandedPost.image_url} alt="Expanded" className="max-w-full max-h-full object-contain rounded-xl" />
                </div>
            )}
        </div>
    );
}

export default DetailsPage;