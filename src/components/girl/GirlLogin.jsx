import React, { useState } from "react";
import { PAGES } from "../../App";

function GirlLogin({ setPage, setGirlUser }) {
    const [form, setForm] = useState({ email: "", password: "" });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const response = await fetch("http://localhost:5000/api/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email: form.email,
                    password: form.password,
                    role: "girl" 
                }),
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem("token", data.token);
                setGirlUser(data.user);
                setPage(PAGES.GIRL_DASHBOARD);
            } else {
                setError(data.error);
            }
        } catch (err) {
            console.error(err);
            setError("Server se connect nahi ho paya.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="pt-16 min-h-screen flex items-center justify-center px-4">
            <div className="bg-[#16162A] border border-white/5 rounded-3xl p-10 w-full max-w-md">
                <h2 className="text-2xl font-bold mb-1">💖 Companion Login</h2>
                <p className="text-sm text-gray-400 mb-7">Welcome back! Login to manage your profile.</p>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-sm px-4 py-2 rounded-lg mb-4 text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs text-gray-400 mb-1.5">Email</label>
                        <input
                            type="email"
                            placeholder="your@email.com"
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                            required
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 outline-none focus:border-pink-500 transition"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-400 mb-1.5">Password</label>
                        <input
                            type="password"
                            placeholder="••••••••"
                            value={form.password}
                            onChange={(e) => setForm({ ...form, password: e.target.value })}
                            required
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 outline-none focus:border-pink-500 transition"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full py-3.5 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl font-semibold text-base transition ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'}`}
                    >
                        {loading ? "Logging in..." : "Login →"}
                    </button>
                </form>

                <p className="text-center text-sm text-gray-400 mt-5">
                    New companion?{" "}
                    <span
                        className="text-pink-400 cursor-pointer font-semibold"
                        onClick={() => setPage(PAGES.GIRL_REGISTER)}
                    >
                        Apply here
                    </span>
                </p>
            </div>
        </div>
    );
}

export default GirlLogin;