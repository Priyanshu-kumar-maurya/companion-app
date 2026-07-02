import React, { useState, useEffect } from "react";
import { FiAlertTriangle, FiPhone, FiMapPin, FiX, FiPlus, FiTrash2, FiShield, FiLoader } from "react-icons/fi";

const API = "https://rentgf-and-bf.onrender.com/api";

function SOSButton({ user, socket }) {
    const [showPanel, setShowPanel] = useState(false);
    const [showContactForm, setShowContactForm] = useState(false);
    const [contacts, setContacts] = useState([]);
    const [alertTriggered, setAlertTriggered] = useState(false);
    const [loading, setLoading] = useState(false);
    const [countdown, setCountdown] = useState(null);
    const [locationStatus, setLocationStatus] = useState("");
    const [formData, setFormData] = useState({ name: "", phone: "", email: "", relationship: "" });

    const token = localStorage.getItem("token");
    const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

    // Fetch emergency contacts
    useEffect(() => {
        if (user) fetchContacts();
    }, [user]);

    const fetchContacts = async () => {
        try {
            const res = await fetch(`${API}/sos/emergency-contacts`, { headers });
            if (res.ok) setContacts(await res.json());
        } catch (e) { console.error(e); }
    };

    // Add contact
    const handleAddContact = async (e) => {
        e.preventDefault();
        if (!formData.name || !formData.phone) return;
        setLoading(true);
        try {
            const res = await fetch(`${API}/sos/emergency-contacts`, {
                method: "POST", headers,
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                await fetchContacts();
                setFormData({ name: "", phone: "", email: "", relationship: "" });
                setShowContactForm(false);
            } else {
                const data = await res.json();
                alert(data.error || "Failed to add contact");
            }
        } catch (e) { alert("Error adding contact"); }
        finally { setLoading(false); }
    };

    // Delete contact
    const handleDeleteContact = async (id) => {
        try {
            await fetch(`${API}/sos/emergency-contacts/${id}`, { method: "DELETE", headers });
            setContacts(prev => prev.filter(c => c.id !== id));
        } catch (e) { console.error(e); }
    };

    // SOS Trigger with 5-second countdown
    const handleSOSTrigger = () => {
        if (countdown !== null) {
            // Cancel SOS
            setCountdown(null);
            return;
        }
        setCountdown(5);
    };

    // Countdown timer
    useEffect(() => {
        if (countdown === null) return;
        if (countdown === 0) {
            triggerSOS();
            setCountdown(null);
            return;
        }
        const timer = setTimeout(() => setCountdown(prev => prev - 1), 1000);
        return () => clearTimeout(timer);
    }, [countdown]);

    // Actual SOS trigger
    const triggerSOS = async () => {
        setLoading(true);
        setLocationStatus("📍 Getting your location...");

        try {
            // Get location
            let latitude = null, longitude = null;
            try {
                const pos = await new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, {
                        enableHighAccuracy: true, timeout: 10000
                    });
                });
                latitude = pos.coords.latitude;
                longitude = pos.coords.longitude;
                setLocationStatus("✅ Location captured!");
            } catch (e) {
                setLocationStatus("⚠️ Location not available — alert sent without location");
            }

            // Send SOS to backend
            const res = await fetch(`${API}/sos/trigger`, {
                method: "POST", headers,
                body: JSON.stringify({ latitude, longitude, message: "Emergency SOS triggered!" })
            });

            if (res.ok) {
                setAlertTriggered(true);

                // Emit socket event for real-time admin notification
                if (socket) {
                    socket.emit("sos_alert", {
                        userId: user.id,
                        userName: user.name,
                        latitude, longitude,
                        timestamp: new Date().toISOString()
                    });
                }

                // Auto-reset after 30 seconds
                setTimeout(() => {
                    setAlertTriggered(false);
                    setLocationStatus("");
                }, 30000);
            }
        } catch (e) {
            alert("Failed to send SOS. Try calling emergency services directly.");
        }
        finally { setLoading(false); }
    };

    if (!user) return null;

    return (
        <>
            {/* ── Floating SOS Button ── */}
            <button
                onClick={() => setShowPanel(true)}
                className="fixed bottom-24 right-4 z-[80] w-14 h-14 bg-gradient-to-br from-red-500 to-red-700 rounded-full shadow-lg shadow-red-500/40 flex items-center justify-center text-white hover:scale-110 active:scale-95 transition-all duration-200 animate-pulse hover:animate-none print:hidden"
                title="Emergency SOS"
            >
                <FiShield size={24} />
            </button>

            {/* ── SOS Panel Modal ── */}
            {showPanel && (
                <div className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setShowPanel(false)}>
                    <div
                        className="bg-[#16162A] w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl border border-white/10 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="bg-gradient-to-r from-red-600 to-red-800 px-5 py-4 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <FiShield size={22} className="text-white" />
                                <div>
                                    <h2 className="text-white font-bold text-lg">Emergency SOS</h2>
                                    <p className="text-red-200 text-xs">Safety is our top priority</p>
                                </div>
                            </div>
                            <button onClick={() => setShowPanel(false)} className="text-white/70 hover:text-white">
                                <FiX size={22} />
                            </button>
                        </div>

                        <div className="overflow-y-auto flex-1 p-5 space-y-5">
                            {/* ── SOS Trigger Section ── */}
                            <div className="text-center space-y-3">
                                {alertTriggered ? (
                                    <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-6 animate-fade-in">
                                        <div className="text-4xl mb-2">✅</div>
                                        <h3 className="text-green-400 font-bold text-lg">SOS Alert Sent!</h3>
                                        <p className="text-green-300/70 text-xs mt-1">{locationStatus}</p>
                                        <p className="text-gray-400 text-xs mt-3">Emergency contacts ko alert bhej diya gaya hai. Agar aap danger mein hain toh seedha police ko call karein: <a href="tel:112" className="text-red-400 font-bold underline">112</a></p>
                                    </div>
                                ) : (
                                    <>
                                        <p className="text-gray-400 text-xs">Press and hold the SOS button to send your location to emergency contacts</p>

                                        {/* Big SOS Button */}
                                        <button
                                            onClick={handleSOSTrigger}
                                            disabled={loading}
                                            className={`relative mx-auto w-32 h-32 rounded-full flex items-center justify-center text-white font-black text-2xl transition-all duration-300 shadow-2xl ${
                                                countdown !== null
                                                    ? 'bg-gradient-to-br from-yellow-500 to-orange-600 scale-110 shadow-orange-500/50 animate-pulse'
                                                    : 'bg-gradient-to-br from-red-500 to-red-800 hover:scale-105 shadow-red-500/40 active:scale-95'
                                            } disabled:opacity-50`}
                                        >
                                            {loading ? (
                                                <FiLoader size={32} className="animate-spin" />
                                            ) : countdown !== null ? (
                                                <div className="flex flex-col items-center">
                                                    <span className="text-4xl font-black">{countdown}</span>
                                                    <span className="text-[10px] font-medium mt-0.5">TAP TO CANCEL</span>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center">
                                                    <FiAlertTriangle size={32} />
                                                    <span className="text-sm mt-1">SOS</span>
                                                </div>
                                            )}

                                            {/* Pulse rings */}
                                            {countdown !== null && (
                                                <>
                                                    <span className="absolute inset-0 rounded-full border-4 border-orange-400 animate-ping opacity-30"></span>
                                                    <span className="absolute inset-[-8px] rounded-full border-2 border-red-400 animate-ping opacity-20" style={{ animationDelay: '0.5s' }}></span>
                                                </>
                                            )}
                                        </button>

                                        {countdown !== null && (
                                            <p className="text-orange-400 text-xs font-bold animate-pulse">
                                                ⚠️ SOS {countdown} second mein send hoga — cancel karne ke liye dobara tap karo
                                            </p>
                                        )}
                                    </>
                                )}
                            </div>

                            {/* ── Quick Actions ── */}
                            <div className="grid grid-cols-2 gap-2">
                                <a href="tel:112" className="flex items-center justify-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl py-3 text-red-400 text-xs font-bold hover:bg-red-500/20 transition">
                                    <FiPhone size={16} /> Call 112 (Police)
                                </a>
                                <a href="tel:1091" className="flex items-center justify-center gap-2 bg-pink-500/10 border border-pink-500/30 rounded-xl py-3 text-pink-400 text-xs font-bold hover:bg-pink-500/20 transition">
                                    <FiPhone size={16} /> Women Helpline
                                </a>
                            </div>

                            {/* ── Emergency Contacts ── */}
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-white font-bold text-sm flex items-center gap-1.5">
                                        <FiPhone size={14} className="text-red-400" /> Emergency Contacts
                                    </h3>
                                    {contacts.length < 3 && (
                                        <button
                                            onClick={() => setShowContactForm(!showContactForm)}
                                            className="text-xs text-pink-400 font-bold flex items-center gap-1 hover:text-pink-300"
                                        >
                                            <FiPlus size={12} /> Add
                                        </button>
                                    )}
                                </div>

                                {/* Add Contact Form */}
                                {showContactForm && (
                                    <form onSubmit={handleAddContact} className="bg-white/5 rounded-xl p-3 mb-3 space-y-2 border border-white/10">
                                        <input
                                            value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            placeholder="Name *" required
                                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-pink-500"
                                        />
                                        <input
                                            value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                            placeholder="Phone Number *" required type="tel"
                                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-pink-500"
                                        />
                                        <input
                                            value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })}
                                            placeholder="Email (optional)" type="email"
                                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-pink-500"
                                        />
                                        <select
                                            value={formData.relationship} onChange={e => setFormData({ ...formData, relationship: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-pink-500"
                                        >
                                            <option value="">Relationship</option>
                                            <option value="Parent">Parent</option>
                                            <option value="Sibling">Sibling</option>
                                            <option value="Friend">Friend</option>
                                            <option value="Spouse">Spouse</option>
                                            <option value="Other">Other</option>
                                        </select>
                                        <div className="flex gap-2">
                                            <button type="submit" disabled={loading}
                                                className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600 text-white py-2 rounded-lg text-xs font-bold disabled:opacity-50">
                                                {loading ? "Saving..." : "Save Contact"}
                                            </button>
                                            <button type="button" onClick={() => setShowContactForm(false)}
                                                className="px-4 bg-white/10 text-gray-300 py-2 rounded-lg text-xs">
                                                Cancel
                                            </button>
                                        </div>
                                    </form>
                                )}

                                {/* Contact List */}
                                {contacts.length === 0 ? (
                                    <div className="bg-white/5 rounded-xl p-4 text-center text-gray-500 text-xs border border-dashed border-white/10">
                                        <FiPhone size={20} className="mx-auto mb-2 text-gray-600" />
                                        Koi emergency contact nahi hai. Safety ke liye add karo!
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {contacts.map(c => (
                                            <div key={c.id} className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 flex items-center justify-between">
                                                <div>
                                                    <div className="text-white text-xs font-medium">{c.name}</div>
                                                    <div className="text-gray-400 text-[10px] flex items-center gap-2">
                                                        <span>{c.phone}</span>
                                                        {c.relationship && <span className="text-pink-400">• {c.relationship}</span>}
                                                    </div>
                                                </div>
                                                <button onClick={() => handleDeleteContact(c.id)}
                                                    className="text-red-400/50 hover:text-red-400 transition p-1">
                                                    <FiTrash2 size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <p className="text-gray-600 text-[10px] mt-2">
                                    * Max 3 contacts. SOS alert trigger karne pe inhe notification jaayega.
                                </p>
                            </div>

                            {/* ── Safety Tips ── */}
                            <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-3">
                                <h4 className="text-blue-400 text-xs font-bold mb-2">🛡️ Safety Tips</h4>
                                <ul className="text-gray-400 text-[10px] space-y-1 list-disc list-inside">
                                    <li>Hamesha public place pe milein</li>
                                    <li>Family/friends ko batayein kahan ja rahe hain</li>
                                    <li>Pehli meeting pe kisi ko saath le jaayein</li>
                                    <li>Apni location share rakhein</li>
                                    <li>Emergency helpline: <b className="text-red-400">112</b></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default SOSButton;
