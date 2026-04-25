import React, { useState, useEffect } from "react";
import SettingsModal from '../shared/SettingsModal';

function BoyDashboard({ user, setBoyUser, setPage, setSelectedGirl, socket }) {
    const [uploading, setUploading] = useState(false);
    const [myPosts, setMyPosts] = useState([]);
    const [expandedPost, setExpandedPost] = useState(null);
    const [kycUploading, setKycUploading] = useState(false);
    const [myBookings, setMyBookings] = useState([]);
    const [newBookingAlert, setNewBookingAlert] = useState(null);
    const [showSettings, setShowSettings] = useState(false);

    useEffect(() => {
        const fetchDashboardData = async () => {
            if (!user) return;
            try {
                const postsRes = await fetch(`https://rentgf-and-bf.onrender.com/api/posts/${user.id}`);
                if (postsRes.ok) setMyPosts(await postsRes.json());

                const bookingsRes = await fetch(`https://rentgf-and-bf.onrender.com/api/bookings/${user.id}`);
                if (bookingsRes.ok) setMyBookings(await bookingsRes.json());
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
        const formData = new FormData();
        formData.append("id_document", file);

        try {
            const response = await fetch(`https://rentgf-and-bf.onrender.com/api/kyc/${user.id}`, {
                method: "POST",
                body: formData
            });
            if (response.ok) {
                await response.json();
                if (setBoyUser) setBoyUser({ ...user, kyc_status: 'pending' });
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
            }
        } catch (error) {
            console.error("Error updating booking:", error);
        }
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploading(true);
        const formData = new FormData();
        formData.append("profile_pic", file);
        try {
            const response = await fetch(`https://rentgf-and-bf.onrender.com/api/upload/${user.id}`, { method: "POST", body: formData });
            if (response.ok) {
                const data = await response.json();
                setBoyUser({ ...user, profile_pic: data.imageUrl });
                alert("Profile picture updated! 📸");
            }
        } catch (err) { console.error(err); } finally { setUploading(false); }
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
    const completedBookings = myBookings.filter(b => b.status === 'completed');
    const totalEarnings = completedBookings.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
    const completedSessions = completedBookings.length;

    return (
        <div className="pt-16 min-h-[100dvh] relative">
            {newBookingAlert && (
                <div className="fixed top-20 right-6 z-50 bg-blue-500 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-bounce">
                    <span className="text-2xl">🔔</span>
                    <div>
                        <div className="font-bold text-sm">New Booking Update!</div>
                        <div className="text-xs">{newBookingAlert.sender_name} sent a request for {newBookingAlert.hours} hrs</div>
                    </div>
                </div>
            )}

            <div className="max-w-5xl mx-auto px-6 py-8">
                <div className="mb-6 flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                        <div className="relative w-24 h-24 shrink-0 mx-auto sm:mx-0 cursor-pointer" onClick={() => user?.profile_pic && setExpandedPost({ image_url: user.profile_pic, caption: "Profile Picture" })}>
                            <div className="w-full h-full rounded-full overflow-hidden bg-gradient-to-br from-blue-500/30 to-purple-500/30 flex items-center justify-center text-4xl border-4 border-blue-500/20 shadow-lg hover:border-blue-500 transition">
                                {user?.profile_pic ? (
                                    <img src={user.profile_pic} alt={user.name} className="w-full h-full object-cover" />
                                ) : ("😎")}
                            </div>
                            <label className="absolute bottom-0 right-0 bg-blue-500 text-white w-8 h-8 rounded-full flex items-center justify-center cursor-pointer hover:scale-110 transition shadow-lg border-2 border-[#16162A] text-sm" onClick={(e) => e.stopPropagation()} title="Upload Profile Picture">
                                {uploading ? "⏳" : "📷"}
                                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
                            </label>
                        </div>
                        <div className="text-center sm:text-left mt-2 sm:mt-0">
                            <h1 className="text-3xl font-bold">Welcome back, {user.name} 🚀</h1>
                            <p className="text-sm text-gray-400 mt-1">Here's your dashboard overview</p>
                            <div className="flex flex-wrap gap-2 mt-3 justify-center sm:justify-start">
                                {myTags.map((tag, i) => (
                                    <span key={i} className="px-2.5 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs rounded-full">
                                        {tag.trim()}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                    <button onClick={() => setShowSettings(true)} className="px-5 py-2 bg-white/10 border border-white/20 text-white rounded-xl text-sm font-semibold hover:bg-white/20 transition flex items-center gap-2">
                        ⚙️ Settings
                    </button>
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

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-7">
                    <div className="bg-[#16162A] border border-white/5 rounded-2xl p-5"><div className="text-xs text-gray-400 mb-2">💳 Total Earnings</div><div className="text-2xl font-bold text-blue-400">₹{totalEarnings}</div></div>
                    <div className="bg-[#16162A] border border-white/5 rounded-2xl p-5"><div className="text-xs text-gray-400 mb-2">⭐ Rating</div><div className="text-2xl font-bold text-yellow-400">4.8 ⭐</div></div>
                    <div className="bg-[#16162A] border border-white/5 rounded-2xl p-5"><div className="text-xs text-gray-400 mb-2">📅 Completed Sessions</div><div className="text-2xl font-bold text-green-400">{completedSessions}</div></div>
                    <div className="bg-[#16162A] border border-white/5 rounded-2xl p-5"><div className="text-xs text-gray-400 mb-2">🔔 Pending Requests</div><div className="text-2xl font-bold text-purple-400">{pendingBookings.length}</div></div>
                </div>

                <div className="bg-[#16162A] border border-white/5 rounded-2xl p-6 mb-7 shadow-[0_0_15px_rgba(59,130,246,0.1)]">
                    <div className="text-base font-semibold mb-4 flex items-center gap-2">
                        📅 My Bookings
                        {pendingBookings.length > 0 && <span className="bg-blue-500 text-white text-[10px] px-2 py-0.5 rounded-full animate-pulse">{pendingBookings.length} Active</span>}
                    </div>

                    {myBookings.length === 0 ? <div className="text-sm text-gray-500 py-4 text-center">No bookings yet.</div> : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {myBookings.map((booking) => (
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
                                        <div className="text-[11px] text-gray-400 flex items-center gap-2">📅 <b>Date & Time:</b> {booking.meeting_date ? new Date(booking.meeting_date).toLocaleDateString() : 'N/A'} at {booking.meeting_time || 'N/A'}</div>
                                        <div className="text-[11px] text-gray-400 flex items-center gap-2">📍 <b>Location:</b> {booking.meeting_location || 'Not specified'}</div>
                                        {booking.meeting_details && <div className="text-[11px] text-gray-500 italic px-2 border-l border-white/10">"{booking.meeting_details}"</div>}
                                    </div>

                                    <div className="flex gap-2 justify-end pt-2 border-t border-white/5">
                                        {booking.status === 'pending' && (
                                            (booking.sender_id === user.id || (!booking.sender_id && user.role === 'boy')) ? (
                                                <>
                                                    <span className="text-yellow-400 text-xs font-bold border border-yellow-400/20 px-3 py-2 rounded-lg bg-yellow-400/10">
                                                        ⏳ Pending Approval
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
                                        {booking.status === 'completed' && <span className="text-green-400 text-xs font-bold border border-green-400/20 px-3 py-1.5 rounded-lg bg-green-400/10">✅ Completed</span>}
                                        {booking.status === 'rejected' && <span className="text-red-400 text-xs font-bold border border-red-400/20 px-3 py-1.5 rounded-lg bg-red-400/10">❌ Canceled / Rejected</span>}
                                    </div>

                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="bg-[#16162A] border border-white/5 rounded-2xl p-6 mb-6">
                    <div className="text-base font-semibold mb-4 flex items-center justify-between">
                        <span>🖼️ My Gallery</span>
                        <span className="text-xs text-gray-400 font-normal">Upload new photos using the + button above</span>
                    </div>
                    {myPosts.length === 0 ? <div className="text-sm text-gray-500 py-4 text-center">No photos posted yet.</div> : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                            {myPosts.map(post => (
                                <div key={post.id} onClick={() => setExpandedPost(post)} className="relative group rounded-xl overflow-hidden aspect-square border border-white/10 cursor-pointer">
                                    <img src={post.image_url} alt="Post" className="w-full h-full object-cover transition duration-300 group-hover:scale-110" />
                                    {post.caption && <div className="absolute bottom-0 w-full bg-gradient-to-t from-black/80 to-transparent p-3 pt-6 text-xs text-white truncate">{post.caption}</div>}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDeletePost(post.id); }}
                                        className="absolute top-2 right-2 bg-red-500/80 hover:bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow-lg"
                                        title="Delete Post"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>

            {expandedPost && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[60] flex items-center justify-center p-4" onClick={() => setExpandedPost(null)}>
                    <button className="absolute top-6 right-6 text-white bg-white/10 hover:bg-white/20 w-10 h-10 rounded-full flex items-center justify-center text-xl transition">✕</button>
                    <div className="max-w-3xl w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                        <img src={expandedPost.image_url} alt="Expanded" className="w-full max-h-[80vh] object-contain rounded-xl" />
                        {expandedPost.caption && <p className="text-white text-center mt-4 text-lg bg-black/50 p-3 rounded-lg border border-white/10">{expandedPost.caption}</p>}
                    </div>
                </div>
            )}

            {showSettings && (
                <SettingsModal
                    user={user}
                    setUser={setBoyUser}
                    onClose={() => setShowSettings(false)}
                    setPage={setPage}
                />
            )}
        </div>
    );
}

export default BoyDashboard;