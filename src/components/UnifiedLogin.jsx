import React, { useState } from "react";
import { PAGES } from "../App";

function UnifiedLogin({ setPage, setGirlUser, setBoyUser, setAdminUser, defaultRole }) {
    const [step, setStep] = useState("login"); // "login" | "forgot" | "reset"
    const [formData, setFormData] = useState({ emailOrPhone: "", password: "" });
    const [forgotEmail, setForgotEmail] = useState("");
    const [resetData, setResetData] = useState({ otp: "", newPassword: "", confirmPassword: "" });

    const [loading, setLoading] = useState(false);
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

    // ── FORGOT PASSWORD — SEND OTP ─────────────────────────────
    const handleForgotPassword = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        setSuccess("");

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout

        try {
            const response = await fetch("https://rentgf-and-bf.onrender.com/api/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: forgotEmail }),
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            const data = await response.json();
            if (response.ok) {
                setSuccess("OTP sent! Please check your email inbox and spam folder.");
                setTimeout(() => { setSuccess(""); setStep("reset"); }, 2000);
            } else {
                setError(data.error || "Something went wrong. Please try again.");
            }
        } catch (err) {
            clearTimeout(timeoutId);
            if (err.name === "AbortError") {
                setError("Request timed out. The server may be starting up — please wait 30 seconds and try again.");
            } else {
                setError("Server error. Please try again.");
            }
        } finally {
            setLoading(false);
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
            <div className="absolute w-96 h-96 rounded-full blur-[100px] pointer-events-none -z-10 transition-colors duration-500 bg-purple-600/20"></div>

            <div className="bg-[#16162A] w-full max-w-md p-8 rounded-3xl border border-purple-500/20 shadow-[0_0_30px_rgba(168,85,247,0.1)] transition-colors duration-500">

                {/* ── LOGIN FORM ── */}
                {step === "login" && (
                    <>
                        <h2 className="text-3xl font-extrabold text-center text-white mb-2">Welcome Back</h2>
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
                                    className="w-full bg-[#0D0D1A] border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none transition focus:border-purple-500"
                                    placeholder="example@mail.com or 9876543210"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400 mb-1.5 ml-1">Password</label>
                                <input
                                    type="password"
                                    name="password"
                                    required
                                    value={formData.password}
                                    onChange={handleChange}
                                    className="w-full bg-[#0D0D1A] border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none transition focus:border-purple-500"
                                    placeholder="••••••••"
                                />
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
                                {loading ? "Sending OTP..." : "Send OTP"}
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
                                <input
                                    type="password"
                                    required
                                    value={resetData.newPassword}
                                    onChange={(e) => setResetData({ ...resetData, newPassword: e.target.value })}
                                    className="w-full bg-[#0D0D1A] border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none transition focus:border-purple-500"
                                    placeholder="Create a strong password"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400 mb-1.5 ml-1">Confirm Password</label>
                                <input
                                    type="password"
                                    required
                                    value={resetData.confirmPassword}
                                    onChange={(e) => setResetData({ ...resetData, confirmPassword: e.target.value })}
                                    className="w-full bg-[#0D0D1A] border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none transition focus:border-purple-500"
                                    placeholder="Repeat your password"
                                />
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