import React, { useState } from "react";
import { PAGES } from "../App";

function UnifiedLogin({ setPage, setGirlUser, setBoyUser, defaultRole = 'boy' }) {
    const [formData, setFormData] = useState({
        emailOrPhone: "",
        password: "",
        role: defaultRole
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
                setError(data.error || "Login failed");
            }
        } catch (err) {
            console.error(err);
            setError("Server error. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const isBoy = formData.role === 'boy';

    return (
        <div className="min-h-[100dvh] bg-[#0D0D1A] flex items-center justify-center p-4 relative z-0">
            <div className={`absolute w-96 h-96 rounded-full blur-[100px] pointer-events-none -z-10 transition-colors duration-500 ${isBoy ? 'bg-blue-600/20' : 'bg-pink-600/20'}`}></div>

            <div className={`bg-[#16162A] w-full max-w-md p-8 rounded-3xl border shadow-2xl transition-colors duration-500 ${isBoy ? 'border-blue-500/20 shadow-[0_0_30px_rgba(59,130,246,0.1)]' : 'border-pink-500/20 shadow-[0_0_30px_rgba(236,72,153,0.1)]'}`}>

                <h2 className="text-3xl font-extrabold text-center text-white mb-2">Welcome Back</h2>
                <p className="text-gray-400 text-center text-sm mb-6">Login to your account</p>

                <div className="flex bg-[#0D0D1A] p-1 rounded-xl mb-6 border border-white/5">
                    <button
                        type="button"
                        onClick={() => setFormData({ ...formData, role: 'boy' })}
                        className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${isBoy ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                    >
                        👨 Boy Login
                    </button>
                    <button
                        type="button"
                        onClick={() => setFormData({ ...formData, role: 'girl' })}
                        className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${!isBoy ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                    >
                        👩 Girl Login
                    </button>
                </div>

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
                            className={`w-full bg-[#0D0D1A] border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none transition focus:border-${isBoy ? 'blue' : 'pink'}-500`}
                            placeholder="abc@mail.com ya 9876543210"
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
                            className={`w-full bg-[#0D0D1A] border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none transition focus:border-${isBoy ? 'blue' : 'pink'}-500`}
                            placeholder="••••••••"
                        />
                    </div>

                    <button type="submit" disabled={loading} className={`w-full py-3.5 mt-2 rounded-xl text-white font-bold text-sm shadow-lg hover:-translate-y-0.5 transition ${isBoy ? 'bg-gradient-to-r from-blue-500 to-purple-500' : 'bg-gradient-to-r from-pink-500 to-purple-500'}`}>
                        {loading ? "Logging in..." : "Login →"}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <p className="text-gray-400 text-sm">
                        Don't have an account?{' '}
                        <button onClick={() => setPage(isBoy ? PAGES.BOY_REGISTER : PAGES.GIRL_REGISTER)} className={`font-bold hover:underline ${isBoy ? 'text-blue-400' : 'text-pink-400'}`}>
                            Register here
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default UnifiedLogin;