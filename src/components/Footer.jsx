import React from "react";
import { PAGES } from "../App";

function Footer({ setPage }) {
    return (
        <footer className="bg-[#16162A] border-t border-white/5 pt-12 pb-8 mt-20">
            <div className="max-w-5xl mx-auto px-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
                    <div className="md:col-span-2">
                        <h2 className="text-2xl font-bold flex items-center gap-2 mb-4">
                            <svg
                                className="w-8 h-8 shrink-0 drop-shadow-[0_0_8px_rgba(236,72,153,0.5)]"
                                viewBox="0 0 100 100"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
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
                            RentGF
                        </h2>
                        <p className="text-sm text-gray-400 max-w-sm leading-relaxed">
                            Find your perfect companion for coffee dates, movies, events, and meaningful conversations. A secure, private, and premium platform for genuine connections.
                        </p>
                    </div>

                    <div>
                        <h3 className="font-semibold mb-4 text-white">Quick Links</h3>
                        <ul className="space-y-2 text-sm text-gray-400">
                            <li><button onClick={() => setPage && setPage(PAGES.HOME)} className="hover:text-pink-400 transition">Home</button></li>
                            <li><button onClick={() => setPage && setPage(PAGES.FIND)} className="hover:text-pink-400 transition">Browse Companions</button></li>
                            <li><button onClick={() => setPage && setPage(PAGES.GIRL_REGISTER)} className="hover:text-pink-400 transition">Join as Companion</button></li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="font-semibold mb-4 text-white">Legal & Support</h3>
                        <ul className="space-y-2 text-sm text-gray-400">
                            <li><span className="hover:text-pink-400 transition cursor-pointer">Help Center</span></li>
                            <li><span className="hover:text-pink-400 transition cursor-pointer">Privacy Policy</span></li>
                            <li><span className="hover:text-pink-400 transition cursor-pointer">Terms of Service</span></li>
                        </ul>
                    </div>
                </div>
                <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-xs text-gray-500">
                        © {new Date().getFullYear()} RentGF. All rights reserved.
                    </p>
                    <div className="flex gap-4 text-sm text-gray-400">
                        <a href="https://www.instagram.com/rentgf.in?igsh=b29iNDkxejFnaDJt" target="_blank" rel="noreferrer">
                            <span className="hover:text-pink-400 cursor-pointer transition">📸 Instagram</span>
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    );
}

export default Footer;