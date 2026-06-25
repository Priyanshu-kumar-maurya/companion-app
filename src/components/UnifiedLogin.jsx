import React, { useState } from "react";
import { PAGES } from "../App";
import { FiEye, FiEyeOff } from "react-icons/fi";

function UnifiedLogin({ setPage, setGirlUser, setBoyUser, setAdminUser, defaultRole }) {
    const [step, setStep] = useState("login"); // "login" | "forgot" | "reset" | "verify"
    const [formData, setFormData] = useState({ emailOrPhone: "", password: "" });
    const [forgotEmail, setForgotEmail] = useState("");
    const [resetData, setResetData] = useState({ otp: "", newPassword: "", confirmPassword: "" });
    const [verifyEmail, setVerifyEmail] = useState(""); // for unverified account OTP
    const [verifyOtp, setVerifyOtp] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [loading, setLoading] = useState(false);
    const [loadingMsg, setLoadingMsg] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // ── LOGIN ──────────────────────────────────────────────────
    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const response = await fetch("https://rentgf-and-bf.onrender.com/api/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (response.ok) {
                // Check if account is verified
                if (data.user.is_verified === false) {
                    // Send OTP and go to verify step
                    setVerifyEmail(data.user.email || formData.emailOrPhone);
                    setVerifyOtp("");
                    await fetch("https://rentgf-and-bf.onrender.com/api/send-otp", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ email: data.user.email })
                    });
                    setStep("verify");
                    setError("");
                    return;
                }

                localStorage.setItem("token", data.token);
                localStorage.setItem("user", JSON.stringify(data.user));

                if (data.user.role === 'girl') {
                    if (setGirlUser) setGirlUser(data.user);
                    setPage(PAGES.GIRL_DASHBOARD);
                } else if (data.user.role === 'admin') {
                    if (setAdminUser) setAdminUser(data.user);
                    setPage(PAGES.ADMIN_DASHBOARD);
                } else {
                    if (setBoyUser) setBoyUser(data.user);
                    setPage(PAGES.BOY_DASHBOARD);
                }
            } else {
                setError(data.error || "Login failed. Please try again.");
            }
        } catch (err) {
            setError("Server error. Please try again later.");
        } finally {
            setLoading(false);
        }
    };

    // ── VERIFY OTP (for unverified accounts at login) ──
    const handleVerifyOtpAtLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            const response = await fetch("https://rentgf-and-bf.onrender.com/api/verify-otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: verifyEmail, otp: verifyOtp })
            });
            const data = await response.json();
            if (response.ok) {
                setSuccess("Account verified! Logging you in...");
                setTimeout(() => {
                    localStorage.setItem("token", data.token);
                    localStorage.setItem("user", JSON.stringify(data.user));
                    if (data.user.role === 'girl') { if (setGirlUser) setGirlUser(data.user); setPage(PAGES.GIRL_DASHBOARD); }
                    else { if (setBoyUser) setBoyUser(data.user); setPage(PAGES.BOY_DASHBOARD); }
                }, 1000);
            } else {
                setError(data.error || "Invalid OTP.");
            }
        } catch (err) {
            setError("Verification failed.");
        } finally {
            setLoading(false);
        }
    };

    // ── FORGOT PASSWORD — SEND OTP ─────────────────────────────
    const handleForgotPassword = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        setSuccess("");
        setLoadingMsg("Sending OTP...");

        const sendOtpRequest = async () => {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout
            try {
                const response = await fetch("https://rentgf-and-bf.onrender.com/api/forgot-password", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email: forgotEmail }),
                    signal: controller.signal
                });
                clearTimeout(timeoutId);
                return response;
            } catch (err) {
                clearTimeout(timeoutId);
                throw err;
            }
        };

        try {
            let response;
            try {
                response = await sendOtpRequest();
            } catch (firstErr) {
                if (firstErr.name === "AbortError") {
                    // Auto-retry once — server was waking up
                    setLoadingMsg("Server start ho raha hai... dobara try kar rahe hain (30s)...");
                    await new Promise(r => setTimeout(r, 5000));
                    response = await sendOtpRequest();
                } else {
                    throw firstErr;
                }
            }

            const data = await response.json();
            if (response.ok) {
                setSuccess("OTP sent! Please check your email inbox and spam folder.");
                setTimeout(() => { setSuccess(""); setStep("reset"); }, 2000);
            } else {
                setError(data.error || "Something went wrong. Please try again.");
            }
        } catch (err) {
            if (err.name === "AbortError") {
                setError("Server abhi bhi start ho raha hai. Please 30 seconds baad dobara try karein.");
            } else {
                setError("Server error. Please try again.");
            }
        } finally {
            setLoading(false);
            setLoadingMsg("");
        }
    };

    // ── RESET PASSWORD — VERIFY OTP + SET NEW PASSWORD ─────────
    const handleResetPassword = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        setSuccess("");

        if (resetData.newPassword !== resetData.confirmPassword) {
            setError("Passwords do not match.");
            setLoading(false);
            return;
        }
        if (resetData.newPassword.length < 5) {
            setError("Password must be at least 5 characters.");
            setLoading(false);
            return;
        }

        try {
            const response = await fetch("https://rentgf-and-bf.onrender.com/api/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: forgotEmail,
                    otp: resetData.otp,
                    newPassword: resetData.newPassword
                })
            });

            const data = await response.json();
            if (response.ok) {
                setSuccess("Password reset successfully! Please login.");
                setTimeout(() => {
                    setStep("login");
                    setForgotEmail("");
                    setResetData({ otp: "", newPassword: "", confirmPassword: "" });
                    setSuccess("");
                }, 2000);
            } else {
                setError(data.error || "Password reset failed. Please try again.");
            }
        } catch (err) {
            setError("Server error. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[100dvh] bg-[#0D0D1A] flex items-center justify-center p-4 relative z-0">
            <div className="absolute w-96 h-96 rounded-full blur-[100px] pointer-events-none -z-10 bg-pink-600/10"></div>
            <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full blur-[100px] pointer-events-none -z-10 bg-purple-600/10"></div>

            <div className="bg-[#16162A]/90 w-full max-w-md p-8 rounded-2xl border border-white/10 shadow-[0_15px_50px_rgba(0,0,0,0.8)] backdrop-blur-md relative overflow-hidden transition-colors duration-500">
                <div className="absolute -top-12 -right-12 w-24 h-24 bg-pink-500/5 rounded-full blur-xl pointer-events-none"></div>
                <div className="absolute -bottom-12 -left-12 w-24 h-24 bg-purple-500/5 rounded-full blur-xl pointer-events-none"></div>

                {/* ── VERIFY STEP (unverified account detected at login) ── */}
                {step === "verify" && (
                    <>
                        <div className="w-14 h-14 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-pink-500/20">
                            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                        </div>
                        <h2 className="text-2xl font-extrabold text-center text-white mb-1">Verify Your Email</h2>
                        <p className="text-gray-400 text-center text-sm mb-1">Your account is not verified yet.</p>
                        <p className="text-pink-400 text-center text-sm font-semibold mb-6 break-all">{verifyEmail}</p>

                        {error && <div className="bg-red-500/10 border border-red-500/50 text-red-400 text-sm p-3 rounded-xl mb-4 text-center">{error}</div>}
                        {success && <div className="bg-green-500/10 border border-green-500/50 text-green-400 text-sm p-3 rounded-xl mb-4 text-center">{success}</div>}

                        <form onSubmit={handleVerifyOtpAtLogin} className="space-y-4">
                            <input
                                type="text"
                                required
                                maxLength="6"
                                value={verifyOtp}
                                onChange={(e) => setVerifyOtp(e.target.value.replace(/[^0-9]/g, ''))}
                                className="w-full bg-[#0D0D1A] border border-white/10 rounded-xl px-4 py-4 text-center text-2xl tracking-[0.5em] text-white outline-none focus:border-pink-500 transition font-mono"
                                placeholder="······"
                                autoFocus
                            />
                            <button
                                type="submit"
                                disabled={loading || verifyOtp.length !== 6}
                                className="w-full py-3.5 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl font-bold shadow-lg transition disabled:opacity-50 hover:opacity-90"
                            >
                                {loading ? "Verifying..." : "Verify & Login"}
                            </button>
                        </form>
                        <button onClick={() => { setStep("login"); setError(""); }} className="mt-4 text-xs text-gray-500 hover:text-gray-300 transition w-full text-center">
                            ← Back to Login
                        </button>
                    </>
                )}

                {/* ── LOGIN FORM ── */}
                {step === "login" && (
                    <>
                        {/* Platform Branding */}
                        <div className="flex items-center justify-center gap-2.5 mb-6 cursor-pointer" onClick={() => setPage(PAGES.HOME)}>
                            <svg className="w-8 h-8 drop-shadow-[0_0_8px_rgba(236,72,153,0.5)]" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M49.9999 15L23.157 30.5V61.5L49.9999 77L76.8428 61.5V30.5L49.9999 15Z" stroke="url(#login-logo-grad)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M49.9999 35L36.1436 43V59L49.9999 67L63.8563 59V43L49.9999 35Z" stroke="url(#login-logo-grad)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M23 30.5L50 50M77 30.5L50 50M50 77V50" stroke="url(#login-logo-grad)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                                <defs>
                                    <linearGradient id="login-logo-grad" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
                                        <stop stopColor="#ec4899" />
                                        <stop offset="1" stopColor="#a855f7" />
                                    </linearGradient>
                                </defs>
                            </svg>
                            <span className="text-2xl font-black bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent tracking-wide">RentGF</span>
                        </div>

                        <h2 className="text-2xl font-extrabold text-center text-white mb-1">Welcome Back</h2>
                        <p className="text-gray-400 text-center text-sm mb-6">Login to your account</p>

                        {error && <div className="bg-red-500/10 border border-red-500/50 text-red-400 text-sm p-3 rounded-xl mb-4 text-center">{error}</div>}

                        <form onSubmit={handleLogin} className="space-y-4">
                            <div>
                                <label className="block text-xs text-gray-400 mb-1.5 ml-1">Email or Phone Number</label>
                                <input
                                    type="text"
                                    name="emailOrPhone"
                                    required
                                    value={formData.emailOrPhone}
                                    onChange={handleChange}
                                    className="w-full bg-[#0D0D1A] border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none transition focus:border-pink-500"
                                    placeholder="example@mail.com or 9876543210"
                                />
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
                                        className="w-full bg-[#0D0D1A] border border-white/10 rounded-xl pl-4 pr-12 py-3 text-sm text-white outline-none transition focus:border-pink-500"
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition"
                                    >
                                        {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <div className="text-right">
                                <button
                                    type="button"
                                    onClick={() => { setStep("forgot"); setError(""); }}
                                    className="text-xs text-purple-400 hover:text-purple-300 transition hover:underline"
                                >
                                    Forgot Password?
                                </button>
                            </div>

                            <button type="submit" disabled={loading} className="w-full py-3.5 mt-1 rounded-xl text-white font-bold text-sm shadow-lg hover:-translate-y-0.5 transition bg-gradient-to-r from-blue-500 to-purple-500 disabled:opacity-60">
                                {loading ? "Logging in..." : "Login →"}
                            </button>
                        </form>

                        <div className="mt-6 text-center">
                            <p className="text-gray-400 text-sm">
                                Don't have an account?{' '}
                                <button onClick={() => setPage(PAGES.BOY_REGISTER)} className="font-bold hover:underline text-purple-400">
                                    Register here
                                </button>
                            </p>
                        </div>
                    </>
                )}

                {/* ── FORGOT PASSWORD FORM ── */}
                {step === "forgot" && (
                    <>
                        <button onClick={() => { setStep("login"); setError(""); setSuccess(""); }} className="text-gray-400 hover:text-white text-sm mb-6 flex items-center gap-1 transition">
                            ← Back to Login
                        </button>
                        <h2 className="text-2xl font-extrabold text-white mb-2">Reset Password</h2>
                        <p className="text-gray-400 text-sm mb-6">Enter your registered email — we'll send you an OTP.</p>

                        {error && <div className="bg-red-500/10 border border-red-500/50 text-red-400 text-sm p-3 rounded-xl mb-4 text-center">{error}</div>}
                        {success && <div className="bg-green-500/10 border border-green-500/50 text-green-400 text-sm p-3 rounded-xl mb-4 text-center">{success}</div>}

                        <form onSubmit={handleForgotPassword} className="space-y-4">
                            <div>
                                <label className="block text-xs text-gray-400 mb-1.5 ml-1">Registered Email</label>
                                <input
                                    type="email"
                                    required
                                    value={forgotEmail}
                                    onChange={(e) => setForgotEmail(e.target.value)}
                                    className="w-full bg-[#0D0D1A] border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none transition focus:border-purple-500"
                                    placeholder="example@mail.com"
                                />
                            </div>
                            <button type="submit" disabled={loading} className="w-full py-3.5 rounded-xl text-white font-bold text-sm shadow-lg hover:-translate-y-0.5 transition bg-gradient-to-r from-pink-500 to-purple-500 disabled:opacity-60">
                                {loading ? (loadingMsg || "Sending OTP...") : "Send OTP"}
                            </button>
                        </form>

                        <div className="mt-4 text-center">
                            <button onClick={() => { setStep("reset"); setError(""); }} className="text-xs text-gray-500 hover:text-purple-400 transition">
                                Already have an OTP? Reset now →
                            </button>
                        </div>
                    </>
                )}

                {/* ── RESET PASSWORD FORM ── */}
                {step === "reset" && (
                    <>
                        <button onClick={() => { setStep("forgot"); setError(""); setSuccess(""); }} className="text-gray-400 hover:text-white text-sm mb-6 flex items-center gap-1 transition">
                            ← Back
                        </button>
                        <h2 className="text-2xl font-extrabold text-white mb-2">Set New Password</h2>
                        <p className="text-gray-400 text-sm mb-6">Enter the OTP from your email and choose a new password.</p>

                        {error && <div className="bg-red-500/10 border border-red-500/50 text-red-400 text-sm p-3 rounded-xl mb-4 text-center">{error}</div>}
                        {success && <div className="bg-green-500/10 border border-green-500/50 text-green-400 text-sm p-3 rounded-xl mb-4 text-center">{success}</div>}

                        <form onSubmit={handleResetPassword} className="space-y-4">
                            {!forgotEmail && (
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1.5 ml-1">Registered Email</label>
                                    <input
                                        type="email"
                                        required
                                        value={forgotEmail}
                                        onChange={(e) => setForgotEmail(e.target.value)}
                                        className="w-full bg-[#0D0D1A] border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none transition focus:border-purple-500"
                                        placeholder="example@mail.com"
                                    />
                                </div>
                            )}
                            <div>
                                <label className="block text-xs text-gray-400 mb-1.5 ml-1">OTP Code (from email)</label>
                                <input
                                    type="text"
                                    required
                                    maxLength={6}
                                    value={resetData.otp}
                                    onChange={(e) => setResetData({ ...resetData, otp: e.target.value })}
                                    className="w-full bg-[#0D0D1A] border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none transition focus:border-purple-500 tracking-[0.5rem] text-center font-bold text-lg"
                                    placeholder="000000"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400 mb-1.5 ml-1">New Password</label>
                                <div className="relative">
                                    <input
                                        type={showNewPassword ? "text" : "password"}
                                        required
                                        value={resetData.newPassword}
                                        onChange={(e) => setResetData({ ...resetData, newPassword: e.target.value })}
                                        className="w-full bg-[#0D0D1A] border border-white/10 rounded-xl pl-4 pr-12 py-3 text-sm text-white outline-none transition focus:border-pink-500"
                                        placeholder="Create a strong password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition"
                                    >
                                        {showNewPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400 mb-1.5 ml-1">Confirm Password</label>
                                <div className="relative">
                                    <input
                                        type={showConfirmPassword ? "text" : "password"}
                                        required
                                        value={resetData.confirmPassword}
                                        onChange={(e) => setResetData({ ...resetData, confirmPassword: e.target.value })}
                                        className="w-full bg-[#0D0D1A] border border-white/10 rounded-xl pl-4 pr-12 py-3 text-sm text-white outline-none transition focus:border-pink-500"
                                        placeholder="Repeat your password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition"
                                    >
                                        {showConfirmPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <button type="submit" disabled={loading} className="w-full py-3.5 rounded-xl text-white font-bold text-sm shadow-lg hover:-translate-y-0.5 transition bg-gradient-to-r from-green-500 to-teal-500 disabled:opacity-60">
                                {loading ? "Resetting password..." : "Reset Password"}
                            </button>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
}

export default UnifiedLogin;