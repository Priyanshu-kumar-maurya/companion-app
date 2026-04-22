import React, { useState } from "react";
import { PAGES } from "../App";

function UnifiedRegister({ setPage }) {
    const [formData, setFormData] = useState({
        name: "", email: "", phone: "", dob: "", password: "", role: "boy"
    });
    const [loading, setLoading] = useState(false);

    // OTP Modal States
    const [showOtpModal, setShowOtpModal] = useState(false);
    const [otp, setOtp] = useState("");
    const [verifying, setVerifying] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // DOB se Age nikalne ka formula
    const calculateAge = (dobString) => {
        const today = new Date();
        const birthDate = new Date(dobString);
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };

    const handleRegister = async (e) => {
        e.preventDefault();

        const age = calculateAge(formData.dob);
        if (age < 18) {
            alert("🚨 You must be at least 18 years old to join.");
            return;
        }

        setLoading(true);
        try {
            // Frontend se calculated age backend ko bhej rahe hain
            const response = await fetch("https://rentgf-and-bf.onrender.com/api/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...formData, age: age })
            });

            const data = await response.json();
            if (response.ok) {
                // Success! Ab OTP popup dikhao
                setShowOtpModal(true);
            } else {
                alert(data.error || "Registration failed!");
            }
        } catch (err) {
            console.error(err);
            alert("Server Error. Please try again later.");
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        if (otp.length !== 6) {
            alert("Please enter a valid 6-digit OTP");
            return;
        }

        setVerifying(true);
        try {
            const response = await fetch("https://rentgf-and-bf.onrender.com/api/verify-otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: formData.email, otp: otp })
            });

            const data = await response.json();
            if (response.ok) {
                alert("✅ Account Verified Successfully! Please Login.");
                setShowOtpModal(false);
                // Redirect to Login based on role
                setPage(formData.role === 'girl' ? PAGES.GIRL_LOGIN : PAGES.BOY_LOGIN);
            } else {
                alert(data.error || "Invalid OTP!");
            }
        } catch (err) {
            console.error(err);
            alert("Verification Failed.");
        } finally {
            setVerifying(false);
        }
    };

    const isBoy = formData.role === 'boy';

    return (
        <div className="min-h-screen bg-[#0D0D1A] flex items-center justify-center p-4 relative z-0">
            {/* Background Glow */}
            <div className={`absolute w-96 h-96 rounded-full blur-[100px] pointer-events-none -z-10 transition-colors duration-500 ${isBoy ? 'bg-blue-600/20' : 'bg-pink-600/20'}`}></div>

            <div className={`bg-[#16162A] w-full max-w-md p-8 rounded-3xl border shadow-2xl transition-colors duration-500 ${isBoy ? 'border-blue-500/20 shadow-[0_0_30px_rgba(59,130,246,0.1)]' : 'border-pink-500/20 shadow-[0_0_30px_rgba(236,72,153,0.1)]'}`}>

                <h2 className="text-3xl font-extrabold text-center text-white mb-2">Create Account</h2>
                <p className="text-gray-400 text-center text-sm mb-6">Join India's #1 Companion App</p>

                {/* ROLE SELECTOR TOGGLE */}
                <div className="flex bg-[#0D0D1A] p-1 rounded-xl mb-6 border border-white/5">
                    <button
                        type="button"
                        onClick={() => setFormData({ ...formData, role: 'boy' })}
                        className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${isBoy ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                    >
                        👨 Join as Boy
                    </button>
                    <button
                        type="button"
                        onClick={() => setFormData({ ...formData, role: 'girl' })}
                        className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${!isBoy ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                    >
                        👩 Join as Girl
                    </button>
                </div>

                <form onSubmit={handleRegister} className="space-y-4">
                    <div>
                        <label className="block text-xs text-gray-400 mb-1.5 ml-1">Full Name</label>
                        <input type="text" name="name" required value={formData.name} onChange={handleChange} className={`w-full bg-[#0D0D1A] border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none transition focus:border-${isBoy ? 'blue' : 'pink'}-500`} placeholder="Priyanshu..." />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs text-gray-400 mb-1.5 ml-1">Email</label>
                            <input type="email" name="email" required value={formData.email} onChange={handleChange} className={`w-full bg-[#0D0D1A] border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none transition focus:border-${isBoy ? 'blue' : 'pink'}-500`} placeholder="abc@mail.com" />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 mb-1.5 ml-1">Phone Number</label>
                            <input type="tel" name="phone" required value={formData.phone} onChange={handleChange} className={`w-full bg-[#0D0D1A] border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none transition focus:border-${isBoy ? 'blue' : 'pink'}-500`} placeholder="9876543210" pattern="[0-9]{10}" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs text-gray-400 mb-1.5 ml-1">Date of Birth</label>
                        <input type="date" name="dob" required value={formData.dob} onChange={handleChange} className={`w-full bg-[#0D0D1A] border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none transition focus:border-${isBoy ? 'blue' : 'pink'}-500`} />
                    </div>

                    <div>
                        <label className="block text-xs text-gray-400 mb-1.5 ml-1">Password</label>
                        <input type="password" name="password" required value={formData.password} onChange={handleChange} className={`w-full bg-[#0D0D1A] border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none transition focus:border-${isBoy ? 'blue' : 'pink'}-500`} placeholder="••••••••" />
                    </div>

                    <button type="submit" disabled={loading} className={`w-full py-3.5 mt-2 rounded-xl text-white font-bold text-sm shadow-lg hover:-translate-y-0.5 transition ${isBoy ? 'bg-gradient-to-r from-blue-500 to-purple-500' : 'bg-gradient-to-r from-pink-500 to-purple-500'}`}>
                        {loading ? "Sending OTP..." : "Register & Get OTP"}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <p className="text-gray-400 text-sm">
                        Already have an account?{' '}
                        <button onClick={() => setPage(isBoy ? PAGES.BOY_LOGIN : PAGES.GIRL_LOGIN)} className={`font-bold hover:underline ${isBoy ? 'text-blue-400' : 'text-pink-400'}`}>
                            Login here
                        </button>
                    </p>
                </div>
            </div>

            {/* OTP MODAL */}
            {showOtpModal && (
                <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-[#16162A] w-full max-w-sm p-8 rounded-3xl border border-white/10 shadow-2xl animate-fade-in text-center">
                        <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center text-3xl mx-auto mb-4 shadow-lg shadow-green-500/20">
                            ✉️
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2">Verify Email</h3>
                        <p className="text-gray-400 text-sm mb-6">We've sent a 6-digit OTP to <br /><b className="text-white">{formData.email}</b></p>

                        <form onSubmit={handleVerifyOtp} className="space-y-4">
                            <input
                                type="text"
                                required
                                maxLength="6"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                                className="w-full bg-[#0D0D1A] border border-white/10 rounded-xl px-4 py-4 text-center text-2xl tracking-widest text-white outline-none focus:border-green-500 transition"
                                placeholder="------"
                            />
                            <button type="submit" disabled={verifying} className="w-full py-3.5 bg-green-500 hover:bg-green-400 text-white rounded-xl font-bold shadow-lg transition">
                                {verifying ? "Verifying..." : "Verify Account"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default UnifiedRegister;