import React from "react";
import { PAGES } from "../App";

function HomePage({ setPage }) {
    return (
        <div className="pt-16 min-h-screen">
            <div className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_40%,rgba(255,45,110,0.12)_0%,transparent_70%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_80%_60%,rgba(168,85,247,0.08)_0%,transparent_60%)]" />

                <div className="relative text-center max-w-2xl px-6">
                    <div className="inline-flex items-center gap-2 bg-pink-500/10 border border-pink-500/30 rounded-full px-4 py-1.5 text-sm text-pink-300 mb-6">
                        💕 India's Safest Companionship Platform
                    </div>

                    <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-5">
                        Find Your Perfect{" "}
                        <span className="bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
                            Companion
                        </span>
                    </h1>

                    <p className="text-gray-400 text-lg leading-relaxed mb-9 max-w-lg mx-auto">
                        Connect with verified, genuine girls for companionship. Safe,
                        respectful, and fully secure with recorded sessions.
                    </p>

                    <div className="flex gap-3 justify-center flex-wrap mb-10">
                        <button
                            onClick={() => setPage(PAGES.BOY_LOGIN)}
                            className="px-7 py-3.5 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-full font-semibold hover:opacity-90 hover:-translate-y-0.5 transition shadow-lg shadow-pink-500/30"
                        >
                            🔍 Find a Companion
                        </button>
                        <button
                            onClick={() => setPage(PAGES.GIRL_REGISTER)}
                            className="px-7 py-3.5 border border-white/20 text-white rounded-full font-semibold hover:border-pink-500 hover:text-pink-400 transition"
                        >
                            💁‍♀️ Join as a Girl
                        </button>
                    </div>

                    <div className="flex gap-8 justify-center flex-wrap">
                        {[
                            ["2,400+", "Verified Girls"],
                            ["98%", "Safety Rating"],
                            ["50K+", "Happy Users"],
                            ["24/7", "Support"],
                        ].map(([val, label]) => (
                            <div key={label} className="text-center">
                                <div className="text-2xl font-bold text-pink-400">{val}</div>
                                <div className="text-xs text-gray-500 mt-1">{label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-6 py-20">
                <div className="text-center mb-12">
                    <h2 className="text-4xl font-bold mb-3">
                        How It{" "}
                        <span className="bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
                            Works
                        </span>
                    </h2>
                    <p className="text-gray-400">Simple, safe, and straightforward process</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {[
                        { icon: "🔐", step: "01", title: "Register & Verify", desc: "Create your account. We verify all users for a safe community." },
                        { icon: "🔍", step: "02", title: "Browse & Choose", desc: "Explore profiles, read reviews, and find your ideal companion." },
                        { icon: "💬", step: "03", title: "Connect & Meet", desc: "Chat via secured channels and schedule your time together." },
                        { icon: "⭐", step: "04", title: "Rate & Review", desc: "After your experience, rate and review for the community." },
                        { icon: "🛡️", step: "05", title: "Stay Safe", desc: "All calls and chats are recorded. Data is never shared publicly." },
                        { icon: "💳", step: "06", title: "Secure Payment", desc: "Pay securely per hour. Transparent pricing, no hidden fees." },
                    ].map((item) => (
                        <div
                            key={item.step}
                            className="bg-[#16162A] border border-white/5 rounded-2xl p-6 hover:border-pink-500/30 hover:-translate-y-1 transition"
                        >
                            <div className="text-3xl mb-3">{item.icon}</div>
                            <div className="text-xs text-pink-400 font-bold tracking-widest mb-2">STEP {item.step}</div>
                            <div className="text-base font-semibold mb-2">{item.title}</div>
                            <div className="text-sm text-gray-400 leading-relaxed">{item.desc}</div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-6 pb-24">
                <div className="text-center mb-12">
                    <h2 className="text-4xl font-bold mb-3">
                        Platform{" "}
                        <span className="bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
                            Rules
                        </span>
                    </h2>
                    <p className="text-gray-400">Respect is non-negotiable. Everyone deserves dignity.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                        ["✅", "Treat companions with full respect at all times"],
                        ["✅", "Do not share personal contact information outside the app"],
                        ["✅", "Meetings in public places only for first interactions"],
                        ["✅", "No physical contact without explicit consent"],
                        ["🚫", "No harassment, threats or inappropriate requests"],
                        ["🚫", "No sharing of recorded calls or chats — ever"],
                        ["🚫", "No meeting outside booked and paid hours"],
                        ["🚫", "Fake profiles result in immediate permanent ban"],
                    ].map(([icon, rule]) => (
                        <div
                            key={rule}
                            className="flex items-start gap-3 bg-[#16162A] border border-white/5 rounded-xl px-5 py-3.5 text-sm leading-relaxed"
                        >
                            <span className="text-lg">{icon}</span>
                            <span>{rule}</span>
                        </div>
                    ))}
                </div>
            </div>

            <footer className="border-t border-white/5 py-10 text-center text-gray-500 text-sm">
                <p>💞 RentGF — Safe, Verified & Respectful Companionship</p>
                <p className="mt-2">All conversations are recorded for safety. User data is strictly private.</p>
                <p className="mt-2 text-xs">© 2026 RentGF. All rights reserved.</p>
            </footer>
        </div>
    );
}

export default HomePage;