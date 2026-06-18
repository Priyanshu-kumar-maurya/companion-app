import React, { useState } from "react";
import { PAGES } from "../App";
import { FiEye, FiEyeOff, FiMail, FiX, FiRefreshCw, FiCheckCircle } from "react-icons/fi";

function UnifiedRegister({ setPage }) {
    const [formData, setFormData] = useState({
        name: "", email: "", phone: "", dob: "", password: "", role: "boy"
    });
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const [showOtpModal, setShowOtpModal] = useState(false);
    const [otp, setOtp] = useState("");
    const [verifying, setVerifying] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);

    // Store registered user info so we can delete if cancelled
    const [registeredUserId, setRegisteredUserId] = useState(null);
    const [registeredToken, setRegisteredToken] = useState(null);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

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
            alert("You must be at least 18 years old to join.");
            return;
        }

        setLoading(true);
        try {
            const response = await fetch("https://rentgf-and-bf.onrender.com/api/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...formData, age: age })
            });

            const data = await response.json();
            if (response.ok) {
                // Save user id + token — needed for cancel/delete if user backs out
                setRegisteredUserId(data.user?.id || null);
                setRegisteredToken(data.token || null);
                setShowOtpModal(true);
                startResendCooldown();
            } else {
                alert(data.error || "Registration failed.");
            }
        } catch (err) {
            console.error(err);
            alert("Server error. Please try again later.");
        } finally {
            setLoading(false);
        }
    };

    // Cancel registration — deletes the unverified account
    const cancelRegistration = async () => {
        if (registeredUserId && registeredToken) {
            try {
                await fetch(`https://rentgf-and-bf.onrender.com/api/users/${registeredUserId}`, {
                    method: "DELETE",
                    headers: { "Authorization": `Bearer ${registeredToken}` }
                });
            } catch (err) { /* silent fail */ }
        }
        setShowOtpModal(false);
        setOtp("");
        setRegisteredUserId(null);
        setRegisteredToken(null);
    };

    // Start 30s resend cooldown
    const startResendCooldown = () => {
        setResendCooldown(30);
        const interval = setInterval(() => {
            setResendCooldown(prev => {
                if (prev <= 1) { clearInterval(interval); return 0; }
                return prev - 1;
            });
        }, 1000);
    };

    // Resend OTP
    const handleResendOtp = async () => {
        if (resendCooldown > 0) return;
        try {
            await fetch("https://rentgf-and-bf.onrender.com/api/send-otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: formData.email })
            });
            startResendCooldown();
            alert("OTP resent! Please check your email.");
        } catch (err) {
            alert("Failed to resend OTP. Try again.");
        }
    };


    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        if (otp.length !== 6) {
            alert("Please enter a valid 6-digit OTP.");
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
                alert("Account verified successfully! Please login.");
                setShowOtpModal(false);
                setPage(formData.role === 'girl' ? PAGES.GIRL_LOGIN : PAGES.BOY_LOGIN);
            } else {
                alert(data.error || "Invalid OTP.");
            }
        } catch (err) {
            console.error(err);
            alert("Verification failed.");
        } finally {
            setVerifying(false);
        }
    };

    const isBoy = formData.role === 'boy';

    return (
        <div className="min-h-[100dvh] bg-[#0D0D1A] flex items-center justify-center p-4 relative z-0">
            <div className={`absolute w-96 h-96 rounded-full blur-[100px] pointer-events-none -z-10 transition-colors duration-500 ${isBoy ? 'bg-blue-600/20' : 'bg-pink-600/20'}`}></div>

            <div className={`bg-[#16162A] w-full max-w-md p-8 rounded-3xl border shadow-2xl transition-colors duration-500 ${isBoy ? 'border-blue-500/20 shadow-[0_0_30px_rgba(59,130,246,0.1)]' : 'border-pink-500/20 shadow-[0_0_30px_rgba(236,72,153,0.1)]'}`}>

                <h2 className="text-3xl font-extrabold text-center text-white mb-2">Create Account</h2>
                <p className="text-gray-400 text-center text-sm mb-6">Join our platform today</p>

                <form onSubmit={handleRegister} className="space-y-4">
                    <div>
                        <label className="block text-xs text-gray-400 mb-1.5 ml-1">Full Name</label>
                        <input type="text" name="name" required value={formData.name} onChange={handleChange} className={`w-full bg-[#0D0D1A] border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none transition focus:border-${isBoy ? 'blue' : 'pink'}-500`} placeholder="Your full name" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs text-gray-400 mb-1.5 ml-1">Gender</label>
                            <select name="role" required value={formData.role} onChange={handleChange} className={`w-full bg-[#0D0D1A] border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none transition focus:border-${isBoy ? 'blue' : 'pink'}-500`}>
                                <option value="boy">Male</option>
                                <option value="girl">Female</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 mb-1.5 ml-1">Date of Birth</label>
                            <input type="date" name="dob" required value={formData.dob} onChange={handleChange} className={`w-full bg-[#0D0D1A] border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none transition focus:border-${isBoy ? 'blue' : 'pink'}-500`} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs text-gray-400 mb-1.5 ml-1">Email</label>
                            <input type="email" name="email" required value={formData.email} onChange={handleChange} className={`w-full bg-[#0D0D1A] border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none transition focus:border-${isBoy ? 'blue' : 'pink'}-500`} placeholder="example@mail.com" />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 mb-1.5 ml-1">Phone Number</label>
                            <input type="tel" name="phone" required value={formData.phone} onChange={handleChange} className={`w-full bg-[#0D0D1A] border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none transition focus:border-${isBoy ? 'blue' : 'pink'}-500`} placeholder="Enter your number" pattern="[0-9]{10}" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs text-gray-400 mb-1.5 ml-1">Password</label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                name="password"
                                required
                                value={formData.password}
                                onChange={handleChange}
                                className={`w-full bg-[#0D0D1A] border border-white/10 rounded-xl px-4 py-3 pr-12 text-sm text-white outline-none transition focus:border-${isBoy ? 'blue' : 'pink'}-500`}
                                placeholder="Enter your password"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition"
                            >
                                {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                            </button>
                        </div>
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

            {/* ─── OTP VERIFICATION MODAL ─── */}
            {showOtpModal && (
                <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-[#16162A] w-full max-w-sm p-8 rounded-3xl border border-white/10 shadow-2xl text-center relative">

                        {/* Close/Cancel button */}
                        <button
                            onClick={cancelRegistration}
                            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-red-500/20 hover:text-red-400 text-gray-400 flex items-center justify-center transition"
                        >
                            <FiX size={16} />
                        </button>

                        <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-pink-500/20">
                            <FiMail size={28} className="text-white" />
                        </div>

                        <h3 className="text-2xl font-bold text-white mb-1">Verify Email</h3>
                        <p className="text-gray-400 text-sm mb-1">We've sent a 6-digit OTP to</p>
                        <p className="text-pink-400 font-semibold text-sm mb-6 break-all">{formData.email}</p>

                        <form onSubmit={handleVerifyOtp} className="space-y-4">
                            <input
                                type="text"
                                required
                                maxLength="6"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                                className="w-full bg-[#0D0D1A] border border-white/10 rounded-xl px-4 py-4 text-center text-2xl tracking-[0.5em] text-white outline-none focus:border-pink-500 transition font-mono"
                                placeholder="······"
                                autoFocus
                            />
                            <button
                                type="submit"
                                disabled={verifying || otp.length !== 6}
                                className="w-full py-3.5 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl font-bold shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 flex items-center justify-center gap-2"
                            >
                                <FiCheckCircle size={18} />
                                {verifying ? "Verifying..." : "Verify Account"}
                            </button>
                        </form>

                        {/* Resend OTP */}
                        <div className="mt-4">
                            {resendCooldown > 0 ? (
                                <p className="text-gray-500 text-xs">Resend OTP in <span className="text-pink-400 font-bold">{resendCooldown}s</span></p>
                            ) : (
                                <button
                                    onClick={handleResendOtp}
                                    className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-pink-400 transition mx-auto"
                                >
                                    <FiRefreshCw size={12} /> Resend OTP
                                </button>
                            )}
                        </div>

                        <p className="mt-4 text-gray-600 text-xs">
                            Changed your mind?{' '}
                            <button onClick={cancelRegistration} className="text-red-400 hover:underline">Cancel registration</button>
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}

export default UnifiedRegister;