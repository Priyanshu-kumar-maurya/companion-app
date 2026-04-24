import React, { useState } from "react";
import { PAGES } from "../App";

function UnifiedLogin({ setPage, setGirlUser, setBoyUser }) {
    const [formData, setFormData] = useState({
        emailOrPhone: "",
        password: ""
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

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
                if (data.user.role === 'girl') {
                    if (setGirlUser) setGirlUser(data.user);
                    setPage(PAGES.GIRL_DASHBOARD);
                } else {
                    if (setBoyUser) setBoyUser(data.user);
                    setPage(PAGES.BOY_DASHBOARD);
                }
            } else {
                setError(data.error || "Login failed.");
            }
        } catch (err) {
            setError("Server error. Please try again later.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[100dvh] bg-[#0D0D1A] flex items-center justify-center p-4 relative z-0">
            <div className="absolute w-96 h-96 rounded-full blur-[100px] pointer-events-none -z-10 transition-colors duration-500 bg-purple-600/20"></div>

            <div className="bg-[#16162A] w-full max-w-md p-8 rounded-3xl border border-purple-500/20 shadow-[0_0_30px_rgba(168,85,247,0.1)] transition-colors duration-500">

                <h2 className="text-3xl font-extrabold text-center text-white mb-2">Welcome Back</h2>
                <p className="text-gray-400 text-center text-sm mb-6">Login to your account</p>

                {error && <div className="bg-red-500/10 border border-red-500/50 text-red-400 text-sm p-3 rounded-xl mb-4 text-center">{error}</div>}

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-xs text-gray-400 mb-1.5 ml-1">Email OR Phone Number</label>
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

                    <button type="submit" disabled={loading} className="w-full py-3.5 mt-2 rounded-xl text-white font-bold text-sm shadow-lg hover:-translate-y-0.5 transition bg-gradient-to-r from-blue-500 to-purple-500">
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
            </div>
        </div>
    );
}

export default UnifiedLogin;