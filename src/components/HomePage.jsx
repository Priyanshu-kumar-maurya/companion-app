import React, { useState, useEffect } from "react";
import { PAGES } from "../App";
import Footer from "./Footer";

function HomePage({ setPage, currentUser }) {
    const [featuredProfiles, setFeaturedProfiles] = useState([]);
    const [stats, setStats] = useState({ total: 0, girls: 0, boys: 0, connections: 0 });
    const [loading, setLoading] = useState(true);

    const isLoggedIn = !!localStorage.getItem("token") || !!currentUser;
    const targetRole = currentUser?.role === "girl" ? "boy" : "girl";

    useEffect(() => {
        const fetchHomeData = async () => {
            setLoading(true);
            try {
                if (isLoggedIn) {
                    const response = await fetch(`https://rentgf-and-bf.onrender.com/api/users?role=${targetRole}`);
                    if (response.ok) {
                        const data = await response.json();
                        setFeaturedProfiles(data.slice(0, 3));
                    }
                } else {
                    const girlRes = await fetch("https://rentgf-and-bf.onrender.com/api/users?role=girl");
                    const boyRes = await fetch("https://rentgf-and-bf.onrender.com/api/users?role=boy");

                    let girlCount = 0;
                    let boyCount = 0;

                    if (girlRes.ok) girlCount = (await girlRes.json()).length;
                    if (boyRes.ok) boyCount = (await boyRes.json()).length;

                    setStats({
                        girls: girlCount,
                        boys: boyCount,
                        total: girlCount + boyCount,
                        connections: (girlCount + boyCount) * 15 + 120
                    });
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchHomeData();
    }, [isLoggedIn, targetRole]);

    const handleDashboardClick = () => {
        if (currentUser?.role === 'girl') setPage(PAGES.GIRL_DASHBOARD);
        else setPage(PAGES.BOY_DASHBOARD);
    };

    return (
        <div className="min-h-screen bg-[#0D0D1A] pt-20 pb-10 relative z-0">
            <div className="max-w-5xl mx-auto px-6 text-center mt-10 mb-20">
                <h1 className="text-5xl md:text-6xl font-extrabold mb-6 leading-tight">
                    Find Your Perfect <br />
                    <span className="bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
                        Companion Today
                    </span>
                </h1>
                <p className="text-gray-400 text-lg max-w-2xl mx-auto mb-10">
                    Join our secure and private platform to connect with amazing people for coffee dates, movies, events, and meaningful conversations.
                </p>

                <div className="flex flex-col sm:flex-row justify-center gap-4">
                    {isLoggedIn ? (
                        <>
                            <button
                                onClick={handleDashboardClick}
                                className="px-8 py-4 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-full font-bold text-lg hover:opacity-90 transition shadow-[0_0_20px_rgba(236,72,153,0.3)]"
                            >
                                Go to Dashboard
                            </button>
                            <button
                                onClick={() => setPage(PAGES.FIND)}
                                className="px-8 py-4 bg-white/10 border border-white/20 text-white rounded-full font-bold text-lg hover:bg-white/20 transition"
                            >
                                🔍 Browse Profiles
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={() => setPage(PAGES.BOY_REGISTER)}
                                className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full font-bold text-lg hover:opacity-90 transition shadow-[0_0_20px_rgba(59,130,246,0.3)]"
                            >
                                Looking for a Companion?
                            </button>
                            <button
                                onClick={() => setPage(PAGES.GIRL_REGISTER)}
                                className="px-8 py-4 bg-white/10 border border-white/20 text-white rounded-full font-bold text-lg hover:bg-white/20 transition"
                            >
                                Join as a Companion
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-6">
                {isLoggedIn ? (
                    <>
                        <div className="flex justify-between items-end mb-8">
                            <div>
                                <h2 className="text-2xl font-bold">
                                    Featured {targetRole === "boy" ? "Male Companions" : "Companions"}
                                </h2>
                                <p className="text-sm text-gray-400 mt-1">Meet some of our top-rated profiles</p>
                            </div>
                            <button onClick={() => setPage(PAGES.FIND)} className="text-pink-400 text-sm font-semibold hover:underline">
                                View All →
                            </button>
                        </div>

                        {loading ? (
                            <div className="text-center py-10 text-pink-500 animate-pulse">Loading real profiles...</div>
                        ) : featuredProfiles.length === 0 ? (
                            <div className="text-center py-10 text-gray-500 bg-[#16162A] rounded-2xl border border-white/5">
                                No profiles available right now. Be the first to join!
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                                {featuredProfiles.map((profile) => (
                                    <div key={profile.id} className="bg-[#16162A] border border-white/5 rounded-2xl overflow-hidden group hover:border-pink-500/30 transition duration-300">

                                        <div className="h-56 relative overflow-hidden flex items-center justify-center bg-gradient-to-br from-pink-500/30 to-purple-500/30">
                                            {profile.profile_pic ? (
                                                <img
                                                    src={profile.profile_pic}
                                                    alt={profile.name}
                                                    className="w-full h-full object-cover transition duration-500 group-hover:scale-110"
                                                />
                                            ) : (
                                                <div className="text-5xl text-white/70">😊</div>
                                            )}
                                            <div className="absolute top-3 left-3 bg-black/50 backdrop-blur-md border border-white/10 px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 text-green-400">
                                                <span className="w-1.5 h-1.5 bg-green-400 rounded-full" /> Online
                                            </div>
                                            <div className="absolute bottom-0 w-full bg-gradient-to-t from-[#16162A] to-transparent h-20" />
                                        </div>

                                        <div className="p-5 relative -mt-6 z-10">
                                            <h3 className="text-xl font-bold">{profile.name.split(' ')[0]}</h3>
                                            <p className="text-xs text-gray-400 mt-1">📍 {profile.city || "Unknown"} · 🎂 {profile.age || "N/A"} yrs</p>

                                            <div className="mt-4 flex flex-wrap gap-2">
                                                {(typeof profile.tags === 'string' ? profile.tags.split(',') : ["Coffee Date"]).slice(0, 2).map((tag, i) => (
                                                    <span key={i} className="px-2.5 py-1 bg-pink-500/10 border border-pink-500/20 text-pink-400 text-[10px] uppercase font-bold tracking-wider rounded-md">
                                                        {tag.trim()}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                ) : (
                    <>
                        <div className="text-center mb-10">
                            <h2 className="text-3xl font-bold mb-3">Our Growing Community</h2>
                            <p className="text-gray-400 text-sm">Join thousands of verified users already making meaningful connections.</p>
                        </div>

                        {loading ? (
                            <div className="text-center py-10 text-pink-500 animate-pulse">Loading live statistics...</div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-[#16162A] border border-white/5 rounded-2xl p-6 text-center hover:-translate-y-1 transition duration-300">
                                    <div className="text-4xl font-extrabold text-white mb-2">{stats.total}</div>
                                    <div className="text-xs text-gray-400 uppercase tracking-widest">Total Users</div>
                                </div>
                                <div className="bg-[#16162A] border border-pink-500/20 rounded-2xl p-6 text-center hover:-translate-y-1 transition duration-300 shadow-[0_0_15px_rgba(236,72,153,0.1)]">
                                    <div className="text-4xl font-extrabold text-pink-400 mb-2">{stats.girls}</div>
                                    <div className="text-xs text-pink-400/80 uppercase tracking-widest">Female Companions</div>
                                </div>
                                <div className="bg-[#16162A] border border-blue-500/20 rounded-2xl p-6 text-center hover:-translate-y-1 transition duration-300 shadow-[0_0_15px_rgba(59,130,246,0.1)]">
                                    <div className="text-4xl font-extrabold text-blue-400 mb-2">{stats.boys}</div>
                                    <div className="text-xs text-blue-400/80 uppercase tracking-widest">Male Companions</div>
                                </div>
                                <div className="bg-[#16162A] border border-purple-500/20 rounded-2xl p-6 text-center hover:-translate-y-1 transition duration-300 shadow-[0_0_15px_rgba(168,85,247,0.1)]">
                                    <div className="text-4xl font-extrabold text-purple-400 mb-2">{stats.connections}+</div>
                                    <div className="text-xs text-purple-400/80 uppercase tracking-widest">Happy Connections</div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            <Footer setPage={setPage} />
        </div>
    );
}

export default HomePage;