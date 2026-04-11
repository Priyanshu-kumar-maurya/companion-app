import React, { useState } from "react";
import { PAGES } from "../App";

function Navbar({ page, setPage, girlUser, boyUser, setGirlUser, setBoyUser }) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const currentUser = boyUser || girlUser;

    const handleLogout = () => {
        localStorage.removeItem("token");
        if (setGirlUser) setGirlUser(null);
        if (setBoyUser) setBoyUser(null);
        setPage(PAGES.HOME);
        setIsMenuOpen(false);
    };

    const getLinkStyle = (targetPage) => {
        const isActive = page === targetPage;
        return `px-3 py-1.5 text-sm transition-all duration-300 ${isActive
            ? "text-pink-400 font-bold border-b-2 border-pink-500"
            : "text-gray-400 hover:text-white"
            }`;
    };

    const handleNavClick = (targetPage) => {
        setPage(targetPage);
        setIsMenuOpen(false);
    };

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0D0D1A]/90 backdrop-blur border-b border-pink-500/20">
            <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
                <h3 className="text-xl font-bold flex items-center gap-2">
                <svg
                    className="w-8 h-8 shrink-0 drop-shadow-[0_0_8px_rgba(236,72,153,0.5)] cursor-pointer"
                    viewBox="0 0 100 100"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    onClick={() => handleNavClick(PAGES.HOME)}
                >
                    <path
                        d="M49.9999 15L23.157 30.5V61.5L49.9999 77L76.8428 61.5V30.5L49.9999 15Z"
                        stroke="url(#ai-grad)"
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    <path
                        d="M49.9999 35L36.1436 43V59L49.9999 67L63.8563 59V43L49.9999 35Z"
                        stroke="url(#ai-grad)"
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    <path
                        d="M23 30.5L50 50M77 30.5L50 50M50 77V50"
                        stroke="url(#ai-grad)"
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    <defs>
                        <linearGradient id="ai-grad" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
                            <stop stopColor="#ec4899" />
                            <stop offset="1" stopColor="#a855f7" />
                        </linearGradient>
                    </defs>
                </svg>
                    RentGF</h3>
                <div className="hidden md:flex items-center gap-4">
                    <button onClick={() => handleNavClick(PAGES.HOME)} className={getLinkStyle(PAGES.HOME)}>Home</button>
                    <button onClick={() => handleNavClick(PAGES.ABOUT)} className={getLinkStyle(PAGES.ABOUT)}>About</button>
                    <button onClick={() => handleNavClick(PAGES.HELP)} className={getLinkStyle(PAGES.HELP)}>Help</button>

                    {currentUser && (
                        <button onClick={() => handleNavClick(PAGES.FIND)} className={getLinkStyle(PAGES.FIND)}>
                            🔍 Find
                        </button>
                    )}

                    {currentUser ? (
                        <div className="flex items-center gap-3 ml-2 border-l border-white/10 pl-4">
                            <button
                                onClick={() => handleNavClick(currentUser.role === 'girl' ? PAGES.GIRL_DASHBOARD : PAGES.BOY_DASHBOARD)}
                                className={`px-4 py-1.5 text-sm rounded-full transition-all ${page === PAGES.GIRL_DASHBOARD || page === PAGES.BOY_DASHBOARD
                                    ? "bg-pink-500 text-white font-bold shadow-[0_0_10px_rgba(236,72,153,0.5)]"
                                    : "bg-gradient-to-r from-pink-500/80 to-purple-500/80 hover:from-pink-500 hover:to-purple-500 text-white"
                                    }`}
                            >
                                👤 {currentUser.name.split(" ")[0]}
                            </button>
                            <button onClick={handleLogout} className="px-3 py-1.5 text-sm text-gray-400 hover:text-red-400 transition">
                                Logout
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-3 ml-2 border-l border-white/10 pl-4">
                            <button
                                onClick={() => handleNavClick(PAGES.GIRL_LOGIN)}
                                className="px-4 py-1.5 text-sm border border-pink-500 text-pink-400 rounded-full hover:bg-pink-500 hover:text-white transition"
                            >
                                Join as Girl
                            </button>
                            <button
                                onClick={() => handleNavClick(PAGES.BOY_LOGIN)}
                                className="px-4 py-1.5 text-sm bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-full hover:opacity-90 transition"
                            >
                                Find Companion
                            </button>
                        </div>
                    )}
                </div>

                <button
                    className="md:hidden text-2xl text-white outline-none"
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                >
                    {isMenuOpen ? "✕" : "☰"}
                </button>
            </div>

            {isMenuOpen && (
                <div className="md:hidden absolute top-16 left-0 w-full bg-[#16162A] border-b border-pink-500/20 py-4 px-6 flex flex-col gap-4 shadow-xl">
                    <button onClick={() => handleNavClick(PAGES.HOME)} className={`text-left ${getLinkStyle(PAGES.HOME)} w-fit`}>Home</button>
                    <button onClick={() => handleNavClick(PAGES.ABOUT)} className={`text-left ${getLinkStyle(PAGES.ABOUT)} w-fit`}>About</button>
                    <button onClick={() => handleNavClick(PAGES.HELP)} className={`text-left ${getLinkStyle(PAGES.HELP)} w-fit`}>Help</button>

                    {currentUser && (
                        <button onClick={() => handleNavClick(PAGES.FIND)} className={`text-left ${getLinkStyle(PAGES.FIND)} w-fit`}>
                            🔍 Find
                        </button>
                    )}

                    <div className="h-px bg-white/10 w-full my-2"></div>

                    {currentUser ? (
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={() => handleNavClick(currentUser.role === 'girl' ? PAGES.GIRL_DASHBOARD : PAGES.BOY_DASHBOARD)}
                                className="px-4 py-2 text-sm bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl text-left"
                            >
                                👤 Profile ({currentUser.name})
                            </button>
                            <button onClick={handleLogout} className="px-4 py-2 text-sm text-red-400 bg-red-500/10 rounded-xl text-left">
                                Logout
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            <button onClick={() => handleNavClick(PAGES.GIRL_LOGIN)} className="px-4 py-2 text-sm border border-pink-500 text-pink-400 rounded-xl text-center">
                                Join as Girl
                            </button>
                            <button onClick={() => handleNavClick(PAGES.BOY_LOGIN)} className="px-4 py-2 text-sm bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl text-center">
                                Find Companion
                            </button>
                        </div>
                    )}
                </div>
            )}
        </nav>
    );
}

export default Navbar;