import React, { useState, useEffect } from "react";
import SettingsModal from '../shared/SettingsModal';

function GirlDashboard({ user, setGirlUser, setPage, setSelectedGirl, socket }) {
    const [stats, setStats] = useState({ earnings: 0, sessions: 0, rating: "4.8" });
    const [myPosts, setMyPosts] = useState([]);
    const [kycUploading, setKycUploading] = useState(false);
    const [expandedPost, setExpandedPost] = useState(null);
    const [myBookings, setMyBookings] = useState([]);
    const [newBookingAlert, setNewBookingAlert] = useState(null);
    const [showSettings, setShowSettings] = useState(false);
    const [followStats, setFollowStats] = useState({ followers: 0, following: 0 });

    // --- NEW STATES FOR MODALS ---
    const [activeStatModal, setActiveStatModal] = useState(null); // 'earnings', 'rating', 'bookings'
    const [reviews, setReviews] = useState([]);

    useEffect(() => {
        const fetchDashboardData = async () => {
            if (!user) return;
            try {
                const statsRes = await fetch(`https://rentgf-and-bf.onrender.com/api/girl/stats/${user.id}`);
                if (statsRes.ok) setStats(await statsRes.json());

                const postsRes = await fetch(`https://rentgf-and-bf.onrender.com/api/posts/${user.id}`);
                if (postsRes.ok) setMyPosts(await postsRes.json());

                const bookingsRes = await fetch(`https://rentgf-and-bf.onrender.com/api/bookings/${user.id}`);
                if (bookingsRes.ok) setMyBookings(await bookingsRes.json());

                const followRes = await fetch(`https://rentgf-and-bf.onrender.com/api/follow-stats/${user.id}`);
                if (followRes.ok) setFollowStats(await followRes.json());

                // Fetch Reviews for the rating modal
                const reviewRes = await fetch(`https://rentgf-and-bf.onrender.com/api/reviews/${user.id}`);
                if (reviewRes.ok) {
                    const data = await reviewRes.json();
                    setReviews(data.reviews);
                }

            } catch (err) {
                console.error("Dashboard error:", err);
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
            fetch(`https://rentgf-and-bf.onrender.com/api/bookings/${user.id}`)
                .then(res => res.json())
                .then(data => setMyBookings(data));
            setTimeout(() => setNewBookingAlert(null), 4000);
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
        const formData = new FormData();
        formData.append("id_document", file);

        try {
            const response = await fetch(`https://rentgf-and-bf.onrender.com/api/kyc/${user.id}`, {
                method: "POST",
                body: formData
            });
            if (response.ok) {
                await response.json();
                if (setGirlUser) setGirlUser({ ...user, kyc_status: 'pending' });
                alert("ID Submitted! Please wait 24 hours for verification. ⏳");
            }
        } catch (err) {
            console.error(err);
        } finally {
            setKycUploading(false);
        }
    };

    const handleBookingStatus = async (bookingId, newStatus) => {
        try {
            const response = await fetch(`https://rentgf-and-bf.onrender.com/api/bookings/${bookingId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus })
            });

            if (response.ok) {
                setMyBookings(myBookings.map(b => b.id === bookingId ? { ...b, status: newStatus } : b));
                if (newStatus === 'completed') {
                    const statsRes = await fetch(`https://rentgf-and-bf.onrender.com/api/girl/stats/${user.id}`);
                    if (statsRes.ok) setStats(await statsRes.json());
                }
            }
        } catch (error) {
            console.error("Error updating booking:", error);
        }
    };

    const handleDeletePost = async (postId) => {
        if (!window.confirm("Are you sure you want to delete this photo?")) return;
        try {
            const response = await fetch(`https://rentgf-and-bf.onrender.com/api/posts/${postId}`, { method: "DELETE" });
            if (response.ok) {
                setMyPosts(myPosts.filter(post => post.id !== postId));
                setExpandedPost(null);
            }
        } catch (err) { console.error("Delete post error:", err); }
    };

    const myTags = user.tags ? user.tags.split(',') : ["Coffee Date", "Movie"];
    const pendingBookings = myBookings.filter(b => b.status === 'pending');

    // --- DERIVED STATS FOR MODALS ---
    const completedBookings = myBookings.filter(b => b.status === 'completed');

    return (
        <div className="pt-16 pb-20 min-h-[100dvh] relative bg-[#0D0D1A]">
            {newBookingAlert && (
                <div className="fixed top-20 right-6 z-50 bg-pink-500 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-bounce">
                    <span className="text-2xl">🔔</span>
                    <div>
                        <div className="font-bold text-sm">New Booking Request!</div>
                        <div className="text-xs">{newBookingAlert.sender_name} requested {newBookingAlert.hours} hrs for ₹{newBookingAlert.amount}</div>
                    </div>
                </div>
            )}

            <div className="max-w-5xl mx-auto px-4 py-6">

                {/* --- MOBILE-OPTIMIZED HEADER --- */}
                <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-4 sm:gap-6">
                        <div className="relative w-20 h-20 sm:w-24 sm:h-24 shrink-0 cursor-pointer" onClick={() => user?.profile_pic && setExpandedPost({ image_url: user.profile_pic, caption: "Profile Picture" })}>
                            <div className="w-full h-full rounded-full overflow-hidden bg-gradient-to-br from-pink-500/30 to-purple-500/30 flex items-center justify-center text-4xl border-4 border-pink-500/20 shadow-lg">
                                {user?.profile_pic ? (
                                    <img src={user.profile_pic} alt={user.name} className="w-full h-full object-cover" />
                                ) : ("😊")}
                            </div>
                        </div>

                        <div className="flex flex-col items-start gap-1">
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl sm:text-2xl font-bold text-white truncate max-w-[150px] sm:max-w-[300px]">{user.name}</h1>
                                {user.kyc_status === 'verified' && <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full font-bold">✓ Verified</span>}
                            </div>

                            <div className="flex items-center gap-4 mt-1">
                                <div className="flex flex-col items-start">
                                    <span className="text-base font-bold text-white leading-tight">{followStats.followers}</span>
                                    <span className="text-[10px] text-gray-400">Followers</span>
                                </div>
                                <div className="flex flex-col items-start">
                                    <span className="text-base font-bold text-white leading-tight">{followStats.following}</span>
                                    <span className="text-[10px] text-gray-400">Following</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <button onClick={() => setShowSettings(true)} className="px-3 py-1.5 bg-white/10 rounded-lg text-xs font-bold hover:bg-white/20 transition flex items-center gap-1.5 shrink-0 mt-2">
                        ⚙️ Edit
                    </button>
                </div>

                <div className="flex flex-wrap gap-2 mb-8 justify-start">
                    {myTags.map((tag, i) => (
                        <span key={i} className="px-3 py-1.5 bg-pink-500/10 border border-pink-500/20 text-pink-400 text-[11px] rounded-full">
                            {tag.trim()}
                        </span>
                    ))}
                </div>

                <div className="mb-6">
                    {(!user.kyc_status || user.kyc_status === 'unverified') && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div>
                                <h3 className="text-red-400 font-bold text-sm flex items-center gap-2">⚠️ KYC Verification Required</h3>
                                <p className="text-xs text-gray-400 mt-1">Upload a valid Govt. ID (Aadhaar/PAN) to get the "Verified" badge and receive more bookings.</p>
                            </div>
                            <label className="shrink-0 px-5 py-2.5 bg-red-500/20 hover:bg-red-500 text-white rounded-lg text-xs font-bold cursor-pointer transition border border-red-500/50">
                                {kycUploading ? "Uploading..." : "Upload ID Proof"}
                                <input type="file" accept="image/*" className="hidden" onChange={handleKycUpload} disabled={kycUploading} />
                            </label>
                        </div>
                    )}
                    {user.kyc_status === 'pending' && (
                        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 flex items-center gap-3">
                            <span className="text-2xl animate-spin">⏳</span>
                            <div>
                                <h3 className="text-yellow-400 font-bold text-sm">KYC Under Review</h3>
                                <p className="text-xs text-gray-400 mt-1">Your ID is being verified by our team. This usually takes 12-24 hours.</p>
                            </div>
                        </div>
                    )}
                    {user.kyc_status === 'verified' && (
                        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex items-center gap-3">
                            <span className="text-2xl">✅</span>
                            <div>
                                <h3 className="text-green-400 font-bold text-sm">Account Verified</h3>
                                <p className="text-xs text-gray-400 mt-1">Your identity is verified. You now have a trust badge on your profile!</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* --- INTERACTIVE STATS SECTION --- */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-7">
                    <div
                        className="bg-[#16162A] border border-white/5 rounded-2xl p-4 cursor-pointer hover:bg-white/5 transition"
                        onClick={() => setActiveStatModal('earnings')}
                    >
                        <div className="text-[11px] text-gray-400 mb-1">💳 Earnings</div>
                        <div className="text-xl font-bold text-pink-400">₹{stats.earnings}</div>
                    </div>

                    <div
                        className="bg-[#16162A] border border-white/5 rounded-2xl p-4 cursor-pointer hover:bg-white/5 transition"
                        onClick={() => setActiveStatModal('rating')}
                    >
                        <div className="text-[11px] text-gray-400 mb-1">⭐ Rating</div>
                        <div className="text-xl font-bold text-yellow-400">{stats.rating} ⭐</div>
                    </div>

                    <div
                        className="bg-[#16162A] border border-white/5 rounded-2xl p-4 cursor-pointer hover:bg-white/5 transition"
                        onClick={() => setActiveStatModal('bookings')}
                    >
                        <div className="text-[11px] text-gray-400 mb-1">📅 Bookings</div>
                        <div className="text-xl font-bold text-green-400">{completedBookings.length}</div>
                    </div>

                    <div className="bg-[#16162A] border border-white/5 rounded-2xl p-4 cursor-default">
                        <div className="text-[11px] text-gray-400 mb-1">🔔 Requests</div>
                        <div className="text-xl font-bold text-purple-400">{pendingBookings.length}</div>
                    </div>
                </div>

                <div className="bg-[#16162A] border border-white/5 rounded-2xl p-5 mb-7 shadow-[0_0_15px_rgba(236,72,153,0.1)]">
                    <div className="text-base font-semibold mb-4 flex items-center gap-2">
                        📅 Pending Requests
                        {pendingBookings.length > 0 && <span className="bg-pink-500 text-white text-[10px] px-2 py-0.5 rounded-full animate-pulse">{pendingBookings.length} New</span>}
                    </div>

                    {pendingBookings.length === 0 ? <div className="text-sm text-gray-500 py-4 text-center">No pending requests.</div> : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {pendingBookings.map((booking) => (
                                <div key={booking.id} className="bg-[#0D0D1A] border border-white/5 p-4 rounded-xl flex flex-col gap-4">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <img src={booking.boy_pic || "https://i.pinimg.com/736x/89/90/48/899048ab0cc455154006fdb9676964b3.jpg"} className="w-12 h-12 rounded-full object-cover border border-white/10" alt="Client" />
                                            <div>
                                                <div className="font-bold text-sm text-white">{booking.boy_name}</div>
                                                <div className="text-xs text-pink-400">{booking.hours} hours • ₹{booking.amount}</div>
                                            </div>
                                        </div>
                                        <div className="text-[10px] text-gray-500">{new Date(booking.created_at).toLocaleDateString()}</div>
                                    </div>
                                    <div className="bg-white/5 border border-white/5 rounded-lg p-3 space-y-2">
                                        <div className="text-[11px] text-gray-400 flex items-center gap-2">📅 <b>Date & Time:</b> {booking.meeting_date ? new Date(booking.meeting_date).toLocaleDateString() : 'N/A'} at {booking.meeting_time || 'N/A'}</div>
                                        <div className="text-[11px] text-gray-400 flex items-center gap-2">📍 <b>Location:</b> {booking.meeting_location || 'Not specified'}</div>
                                        {booking.meeting_details && <div className="text-[11px] text-gray-500 italic px-2 border-l border-white/10">"{booking.meeting_details}"</div>}
                                    </div>
                                    <div className="flex gap-2 justify-end pt-2 border-t border-white/5">
                                        <button onClick={() => handleBookingStatus(booking.id, 'accepted')} className="px-4 py-2 bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg text-xs font-bold hover:bg-green-500 hover:text-white transition">
                                            Accept
                                        </button>
                                        <button onClick={() => handleBookingStatus(booking.id, 'rejected')} className="px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-xs font-bold hover:bg-red-500 hover:text-white transition">
                                            Reject
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="bg-[#16162A] border border-white/5 rounded-2xl p-5 mb-6">
                    <div className="text-base font-semibold mb-4 flex items-center justify-between">
                        <span>🖼️ My Gallery</span>
                        <span className="text-xs text-gray-400 font-normal">Manage photos</span>
                    </div>
                    {myPosts.length === 0 ? <div className="text-sm text-gray-500 py-4 text-center">No photos posted yet.</div> : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                            {myPosts.map(post => (
                                <div key={post.id} onClick={() => setExpandedPost(post)} className="relative group rounded-xl overflow-hidden aspect-square border border-white/10 cursor-pointer">
                                    <img src={post.image_url} alt="Post" className="w-full h-full object-cover transition duration-300 group-hover:scale-110" />
                                    {post.caption && <div className="absolute bottom-0 w-full bg-gradient-to-t from-black/80 to-transparent p-2 pt-5 text-[10px] text-white truncate">{post.caption}</div>}
                                    <button onClick={(e) => { e.stopPropagation(); handleDeletePost(post.id); }} className="absolute top-2 right-2 bg-red-500/80 hover:bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow-lg text-xs" title="Delete Post">🗑️</button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* --- EXPANDED IMAGE MODAL --- */}
            {expandedPost && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[60] flex items-center justify-center p-4" onClick={() => setExpandedPost(null)}>
                    <button className="absolute top-6 right-6 text-white bg-white/10 hover:bg-white/20 w-10 h-10 rounded-full flex items-center justify-center text-xl transition">✕</button>
                    <div className="max-w-3xl w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                        <img src={expandedPost.image_url} alt="Expanded" className="w-full max-h-[80vh] object-contain rounded-xl" />
                        {expandedPost.caption && <p className="text-white text-center mt-4 text-lg bg-black/50 p-3 rounded-lg border border-white/10">{expandedPost.caption}</p>}
                    </div>
                </div>
            )}

            {/* --- SETTINGS MODAL --- */}
            {showSettings && (
                <SettingsModal
                    user={user}
                    setUser={setGirlUser}
                    onClose={() => setShowSettings(false)}
                    setPage={setPage}
                />
            )}

            {/* --- STATS DETAIL MODALS --- */}
            {activeStatModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => setActiveStatModal(null)}>
                    <div className="bg-[#16162A] w-full max-w-md rounded-2xl border border-white/10 shadow-2xl overflow-hidden relative flex flex-col max-h-[80vh]" onClick={(e) => e.stopPropagation()}>

                        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between bg-[#16162A]">
                            <h2 className="text-lg font-bold text-white">
                                {activeStatModal === 'earnings' && "Earnings History"}
                                {activeStatModal === 'rating' && "Reviews & Ratings"}
                                {activeStatModal === 'bookings' && "Completed Bookings"}
                            </h2>
                            <button onClick={() => setActiveStatModal(null)} className="w-8 h-8 bg-white/5 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition">✕</button>
                        </div>

                        <div className="overflow-y-auto p-5 space-y-3 custom-scrollbar">
                            {/* EARNINGS VIEW */}
                            {activeStatModal === 'earnings' && (
                                completedBookings.length === 0 ? <p className="text-gray-500 text-center py-4 text-sm">No earnings recorded yet.</p> :
                                    completedBookings.map(b => (
                                        <div key={b.id} className="flex justify-between items-center bg-[#0D0D1A] p-3 rounded-xl border border-white/5">
                                            <div>
                                                <p className="text-sm font-bold text-white">{b.boy_name}</p>
                                                <p className="text-[10px] text-gray-500">{new Date(b.created_at).toLocaleDateString()} • {b.hours} hrs</p>
                                            </div>
                                            <div className="text-pink-400 font-bold">+₹{b.amount}</div>
                                        </div>
                                    ))
                            )}

                            {/* RATINGS VIEW */}
                            {activeStatModal === 'rating' && (
                                reviews.length === 0 ? <p className="text-gray-500 text-center py-4 text-sm">No reviews yet.</p> :
                                    reviews.map(rev => (
                                        <div key={rev.id} className="bg-[#0D0D1A] border border-white/5 p-4 rounded-xl flex gap-3">
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

                            {/* BOOKINGS VIEW */}
                            {activeStatModal === 'bookings' && (
                                completedBookings.length === 0 ? <p className="text-gray-500 text-center py-4 text-sm">No completed bookings yet.</p> :
                                    completedBookings.map(b => (
                                        <div key={b.id} className="flex justify-between items-center bg-[#0D0D1A] p-3 rounded-xl border border-white/5">
                                            <div className="flex items-center gap-3">
                                                <img src={b.boy_pic || "https://i.pinimg.com/736x/89/90/48/899048ab0cc455154006fdb9676964b3.jpg"} className="w-10 h-10 rounded-full object-cover" alt="Client" />
                                                <div>
                                                    <p className="text-sm font-bold text-white">{b.boy_name}</p>
                                                    <p className="text-[10px] text-gray-500">{new Date(b.created_at).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                            <span className="text-green-400 text-[10px] bg-green-500/10 px-2 py-1 rounded border border-green-500/20">Completed</span>
                                        </div>
                                    ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default GirlDashboard;