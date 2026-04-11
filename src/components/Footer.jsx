import React from "react";
import { PAGES } from "../App"; // Agar App.js bahar hai toh path check kar lena ('../App' ho sakta hai)

function Footer({ setPage }) {
    return (
        <footer className="bg-[#16162A] border-t border-white/5 pt-12 pb-8 mt-20">
            <div className="max-w-5xl mx-auto px-6">

                {/* Top Section */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
                    {/* Brand Info */}
                    <div className="md:col-span-2">
                        <h2 className="text-2xl font-bold flex items-center gap-2 mb-4">
                            <span className="text-pink-500">💕</span> RentGF
                        </h2>
                        <p className="text-sm text-gray-400 max-w-sm leading-relaxed">
                            Find your perfect companion for coffee dates, movies, events, and meaningful conversations. A secure, private, and premium platform for genuine connections.
                        </p>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h3 className="font-semibold mb-4 text-white">Quick Links</h3>
                        <ul className="space-y-2 text-sm text-gray-400">
                            <li><button onClick={() => setPage && setPage(PAGES.HOME)} className="hover:text-pink-400 transition">Home</button></li>
                            <li><button onClick={() => setPage && setPage(PAGES.FIND)} className="hover:text-pink-400 transition">Browse Companions</button></li>
                            <li><button onClick={() => setPage && setPage(PAGES.GIRL_REGISTER)} className="hover:text-pink-400 transition">Join as Companion</button></li>
                        </ul>
                    </div>

                    {/* Legal & Support */}
                    <div>
                        <h3 className="font-semibold mb-4 text-white">Legal & Support</h3>
                        <ul className="space-y-2 text-sm text-gray-400">
                            <li><span className="hover:text-pink-400 transition cursor-pointer">Help Center</span></li>
                            <li><span className="hover:text-pink-400 transition cursor-pointer">Privacy Policy</span></li>
                            <li><span className="hover:text-pink-400 transition cursor-pointer">Terms of Service</span></li>
                        </ul>
                    </div>
                </div>

                {/* Bottom Section (Copyright & Socials) */}
                <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-xs text-gray-500">
                        © {new Date().getFullYear()} RentGF. All rights reserved.
                    </p>
                    <div className="flex gap-4 text-sm text-gray-400">
                        <a href="https://www.instagram.com/rentgf.in?igsh=b29iNDkxejFnaDJt"><span className="hover:text-pink-400 cursor-pointer transition">📸 Instagram</span></a> 
                    </div>
                </div>

            </div>
        </footer>
    );
}

export default Footer;