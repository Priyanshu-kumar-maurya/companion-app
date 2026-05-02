import React, { useState, useEffect } from "react";
import { PAGES } from "../App";

function Navbar({ page, setPage, girlUser, boyUser, setGirlUser, setBoyUser, socket }) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    // --- NAYE POST STATES (Instagram Style) ---
    const [showPostModal, setShowPostModal] = useState(false);
    const [postFile, setPostFile] = useState(null);
    const [postPreview, setPostPreview] = useState(null);
    const [postCaption, setPostCaption] = useState("");
    const [isPosting, setIsPosting] = useState(false);

    // --- MESSAGES NOTIFICATION STATE ---
    const [unreadCount, setUnreadCount] = useState(0);

    const currentUser = boyUser || girlUser;
    const isBoy = boyUser !== null;
    const isGirl = girlUser !== null;

    // --- 🚨 GLOBAL UNREAD COUNT LOGIC 🚨 ---
    useEffect(() => {
        if (!currentUser) return;

        // 1. Initial Load: Check backend for unread msgs across all chats
        const fetchTotalUnread = async () => {
            try {
                const res = await fetch(`https://rentgf-and-bf.onrender.com/api/chats/${currentUser.id}`);
                if (res.ok) {
                    const users = await res.json();
                    let totalUnread = 0;

                    await Promise.all(users.map(async (person) => {
                        const msgRes = await fetch(`https://rentgf-and-bf.onrender.com/api/messages/${currentUser.id}/${person.id}`);
                        if (msgRes.ok) {
                            const msgs = await msgRes.json();
                            const unread = msgs.filter(m => String(m.sender_id) === String(person.id) && !m.is_read).length;
                            totalUnread += unread;
                        }
                    }));
                    setUnreadCount(totalUnread);
                }
            } catch (err) {
                console.error("Error fetching unread count:", err);
            }
        };

        fetchTotalUnread();

        // 2. Realtime Listener
        if (socket) {
            const handleNewMessage = (data) => {
                // Agar user ussi ka chat khol kar nahi baitha hai aur message usko hi bheja gaya hai
                if (page !== PAGES.CHAT && String(data.receiver_id) === String(currentUser.id)) {
                    setUnreadCount((prev) => prev + 1);
                }
            };

            const handleMessagesRead = (data) => {
                // Jab receiver_id hum hain aur kisne hamare message read kiye ya humne kisi ke kiye (Chat open kiya)
                if (String(data.receiver_id) === String(currentUser.id) || String(data.sender_id) === String(currentUser.id)) {
                    fetchTotalUnread(); // Recalculate total unread
                }
            };

            socket.on("receive_message", handleNewMessage);
            socket.on("messages_read_update", handleMessagesRead);

            return () => {
                socket.off("receive_message", handleNewMessage);
                socket.off("messages_read_update", handleMessagesRead);
            };
        }
    }, [socket, currentUser, page]);


    const getLinkStyle = (targetPage) => {
        const isActive = page === targetPage;
        return `px-3 py-1.5 text-sm transition-all duration-300 ${isActive
            ? "text-pink-400 font-bold border-b-2 border-pink-500"
            : "text-gray-400 hover:text-white"
            }`;
    };

    const handleNavClick = (targetPage) => {
        // Agar user ne Messages/Chat click kiya, toh temporarily badge hide kar sakte hain
        if (targetPage === PAGES.MESSAGES || targetPage === PAGES.CHAT) {
            // Hum backend se sync kar rahe hain, isliye turant 0 set nahi karenge
            // Padhne ke baad wo automatically update ho jayega
        }
        setPage(targetPage);
        setIsMenuOpen(false);
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            setPostFile(file);
            setPostPreview(URL.createObjectURL(file));
        }
    };

    const closePostModal = () => {
        setShowPostModal(false);
        setPostFile(null);
        setPostPreview(null);
        setPostCaption("");
    };

    const handlePostSubmit = async () => {
        if (!postFile || !currentUser) return;
        setIsPosting(true);
        const formData = new FormData();
        formData.append("post_image", postFile);
        formData.append("caption", postCaption);

        try {
            const response = await fetch(`https://rentgf-and-bf.onrender.com/api/posts/${currentUser.id}`, {
                method: "POST",
                body: formData
            });
            if (response.ok) {
                alert("Post live ho gayi! 📸 (Apne profile par refresh karein)");
                closePostModal();
            }
        } catch (err) {
            console.error(err);
            alert("Upload fail ho gaya, fir se try karein.");
        } finally {
            setIsPosting(false);
        }
    };

    const activeColor = isBoy
        ? "text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.8)]"
        : isGirl
            ? "text-pink-400 drop-shadow-[0_0_8px_rgba(244,114,182,0.8)]"
            : "text-purple-400 drop-shadow-[0_0_8px_rgba(192,132,252,0.8)]";
    const inactiveColor = "text-gray-500 hover:text-gray-300";

    const isHiddenScreen = page === PAGES.CHAT || page === PAGES.DETAILS;

    return (
        <>
            {/* DESKTOP TOP BAR */}
            {!isHiddenScreen && (
                <nav className="fixed top-0 left-0 right-0 z-40 bg-[#0D0D1A]/90 backdrop-blur border-b border-pink-500/20 hidden md:block">
                    <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
                        <h3 className="text-xl font-bold flex items-center gap-2">
                            <svg className="w-8 h-8 shrink-0 drop-shadow-[0_0_8px_rgba(236,72,153,0.5)] cursor-pointer" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" onClick={() => handleNavClick(PAGES.HOME)}>
                                <path d="M49.9999 15L23.157 30.5V61.5L49.9999 77L76.8428 61.5V30.5L49.9999 15Z" stroke="url(#ai-grad)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M49.9999 35L36.1436 43V59L49.9999 67L63.8563 59V43L49.9999 35Z" stroke="url(#ai-grad)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M23 30.5L50 50M77 30.5L50 50M50 77V50" stroke="url(#ai-grad)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                                <defs><linearGradient id="ai-grad" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse"><stop stopColor="#ec4899" /><stop offset="1" stopColor="#a855f7" /></linearGradient></defs>
                            </svg>
                            RentGF
                        </h3>
                        <div className="hidden md:flex items-center gap-4">
                            <button onClick={() => handleNavClick(PAGES.HOME)} className={getLinkStyle(PAGES.HOME)}>Home</button>
                            <button onClick={() => handleNavClick(PAGES.ABOUT)} className={getLinkStyle(PAGES.ABOUT)}>About</button>
                            <button onClick={() => handleNavClick(PAGES.HELP)} className={getLinkStyle(PAGES.HELP)}>Help</button>

                            {currentUser && (
                                <>
                                    <button onClick={() => handleNavClick(PAGES.FIND)} className={getLinkStyle(PAGES.FIND)}>🔍 Find</button>

                                    {/* 🚨 DESKTOP: MESSAGES BUTTON WITH BADGE 🚨 */}
                                    <button
                                        onClick={() => handleNavClick(PAGES.MESSAGES)}
                                        className={`relative flex items-center gap-2 px-3 py-2 rounded-lg font-semibold transition ${page === PAGES.MESSAGES ? "text-pink-400 bg-pink-500/10" : "text-gray-300 hover:text-white hover:bg-white/5"}`}
                                    >
                                        💬 Messages
                                        {unreadCount > 0 && (
                                            <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-bounce">
                                                {unreadCount}
                                            </span>
                                        )}
                                    </button>

                                    {/* Desktop Post Button */}
                                    <button onClick={() => setShowPostModal(true)} className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold bg-white/10 border border-white/20 hover:bg-white/20 rounded-full text-white transition ml-2">
                                        <span className="text-sm">➕</span> Create
                                    </button>
                                </>
                            )}

                            {currentUser ? (
                                <div className="flex items-center gap-3 ml-2 border-l border-white/10 pl-4">
                                    <button
                                        onClick={() => handleNavClick(currentUser.role === 'girl' ? PAGES.GIRL_DASHBOARD : PAGES.BOY_DASHBOARD)}
                                        className={`px-4 py-1.5 text-sm rounded-full transition-all ${page === PAGES.GIRL_DASHBOARD || page === PAGES.BOY_DASHBOARD ? "bg-pink-500 text-white font-bold shadow-[0_0_10px_rgba(236,72,153,0.5)]" : "bg-gradient-to-r from-pink-500/80 to-purple-500/80 hover:from-pink-500 hover:to-purple-500 text-white"}`}
                                    >
                                        👤 {currentUser.name.split(" ")[0]}
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3 ml-2 border-l border-white/10 pl-4">
                                    <button onClick={() => handleNavClick(PAGES.GIRL_LOGIN)} className="px-4 py-1.5 text-sm border border-pink-500 text-pink-400 rounded-full hover:bg-pink-500 hover:text-white transition">Join as Girl</button>
                                    <button onClick={() => handleNavClick(PAGES.BOY_LOGIN)} className="px-4 py-1.5 text-sm bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-full hover:opacity-90 transition">Find Companion</button>
                                </div>
                            )}
                        </div>
                    </div>
                </nav>
            )}

            {/* TOP BAR MOBILE (Logo and Post Button) */}
            {!isHiddenScreen && (
                <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-[#0D0D1A]/90 backdrop-blur border-b border-white/10 h-14 flex items-center justify-between px-4">
                    <h3 className="text-xl font-black bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent tracking-wider">
                        RentGF
                    </h3>

                    {currentUser ? (
                        <button
                            onClick={() => setShowPostModal(true)}
                            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold bg-white/10 border border-white/20 hover:bg-white/20 rounded-full text-white transition"
                        >
                            <span className="text-sm">➕</span> Post
                        </button>
                    ) : (
                        <button className="text-2xl text-white outline-none" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                            {isMenuOpen ? "✕" : "☰"}
                        </button>
                    )}
                </div>
            )}

            {/* MOBILE MENU (Guests Only) */}
            {isMenuOpen && !isHiddenScreen && !currentUser && (
                <div className="md:hidden fixed top-14 left-0 w-full bg-[#16162A] border-b border-pink-500/20 py-4 px-6 flex flex-col gap-4 shadow-xl z-40">
                    <button onClick={() => handleNavClick(PAGES.HOME)} className={`text-left ${getLinkStyle(PAGES.HOME)} w-fit`}>Home</button>
                    <button onClick={() => handleNavClick(PAGES.ABOUT)} className={`text-left ${getLinkStyle(PAGES.ABOUT)} w-fit`}>About</button>
                    <button onClick={() => handleNavClick(PAGES.HELP)} className={`text-left ${getLinkStyle(PAGES.HELP)} w-fit`}>Help</button>
                    <div className="h-px bg-white/10 w-full my-2"></div>
                    <div className="flex flex-col gap-3">
                        <button onClick={() => handleNavClick(PAGES.GIRL_LOGIN)} className="px-4 py-2 text-sm border border-pink-500 text-pink-400 rounded-xl text-center">Join as Girl</button>
                        <button onClick={() => handleNavClick(PAGES.BOY_LOGIN)} className="px-4 py-2 text-sm bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl text-center">Find Companion</button>
                    </div>
                </div>
            )}

            {/* BOTTOM NAVIGATION BAR (Mobile Style) */}
            {!isHiddenScreen && (
                <div className="fixed bottom-0 left-0 w-full bg-[#16162A]/95 backdrop-blur-xl border-t border-white/5 z-40 md:hidden pb-2 pt-2">
                    <div className="flex justify-around items-center h-14 max-w-md mx-auto px-2">
                        <button onClick={() => handleNavClick(PAGES.HOME)} className={`flex flex-col items-center justify-center w-16 gap-1 transition-all duration-300 ${page === PAGES.HOME ? activeColor + " scale-110 -translate-y-1" : inactiveColor}`}>
                            <span className="text-xl">🏠</span><span className="text-[10px] font-bold">Home</span>
                        </button>

                        {currentUser && (
                            <button onClick={() => handleNavClick(PAGES.FIND)} className={`flex flex-col items-center justify-center w-16 gap-1 transition-all duration-300 ${page === PAGES.FIND ? activeColor + " scale-110 -translate-y-1" : inactiveColor}`}>
                                <span className="text-xl">🔍</span><span className="text-[10px] font-bold">Explore</span>
                            </button>
                        )}

                        {/* 🚨 MOBILE: MESSAGES BUTTON WITH BADGE 🚨 */}
                        {currentUser && (
                            <button onClick={() => handleNavClick(PAGES.MESSAGES)} className={`relative flex flex-col items-center justify-center w-16 gap-1 transition-all duration-300 ${page === PAGES.MESSAGES ? activeColor + " scale-110 -translate-y-1" : inactiveColor}`}>
                                <span className="text-xl relative">
                                    💬
                                    {unreadCount > 0 && (
                                        <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full animate-bounce shadow-lg">
                                            {unreadCount}
                                        </span>
                                    )}
                                </span>
                                <span className="text-[10px] font-bold">Inbox</span>
                            </button>
                        )}

                        {currentUser && (
                            <button onClick={() => handleNavClick(isBoy ? PAGES.BOY_DASHBOARD : PAGES.GIRL_DASHBOARD)} className={`flex flex-col items-center justify-center w-16 gap-1 transition-all duration-300 ${(page === PAGES.BOY_DASHBOARD || page === PAGES.GIRL_DASHBOARD) ? activeColor + " scale-110 -translate-y-1" : inactiveColor}`}>
                                <span className="text-xl">👤</span><span className="text-[10px] font-bold">Profile</span>
                            </button>
                        )}

                        {!currentUser && (
                            <button onClick={() => handleNavClick(PAGES.ABOUT)} className={`flex flex-col items-center justify-center w-16 gap-1 transition-all duration-300 ${page === PAGES.ABOUT ? activeColor + " scale-110 -translate-y-1" : inactiveColor}`}>
                                <span className="text-xl">ℹ️</span><span className="text-[10px] font-bold">About</span>
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* 🚨 INSTAGRAM STYLE POST MODAL 🚨 */}
            {showPostModal && (
                <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 sm:p-0">
                    <div className="bg-[#16162A] sm:border border-white/10 sm:rounded-2xl w-full max-w-md h-full sm:h-auto overflow-hidden flex flex-col animate-slide-up sm:animate-none">

                        <div className="flex justify-between items-center px-4 py-3 border-b border-white/10 bg-[#0D0D1A]">
                            <button onClick={closePostModal} className="text-white text-2xl hover:text-red-400 transition">✕</button>
                            <h3 className="font-bold text-white text-lg">New Post</h3>
                            <button
                                onClick={handlePostSubmit}
                                disabled={!postFile || isPosting}
                                className={`font-bold text-lg transition ${postFile && !isPosting ? (isBoy ? 'text-blue-500 hover:text-blue-400' : 'text-pink-500 hover:text-pink-400') : 'text-gray-600'}`}
                            >
                                {isPosting ? "Posting..." : "Share"}
                            </button>
                        </div>

                        <div className="p-4 flex-1 overflow-y-auto flex flex-col gap-4">
                            {!postPreview ? (
                                <label className={`w-full aspect-square border-2 border-dashed border-white/20 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition ${isBoy ? 'hover:border-blue-500 hover:bg-blue-500/5' : 'hover:border-pink-500 hover:bg-pink-500/5'}`}>
                                    <span className="text-5xl mb-3">📸</span>
                                    <span className="text-white font-bold text-lg">Select Photo</span>
                                    <span className="text-gray-500 text-sm mt-1">Tap to browse files</span>
                                    <input type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
                                </label>
                            ) : (
                                <div className="flex flex-col gap-4 animate-fade-in">
                                    <div className="relative">
                                        <img src={postPreview} alt="Preview" className="w-full aspect-square object-cover rounded-xl border border-white/10 shadow-lg" />
                                        <button onClick={() => { setPostFile(null); setPostPreview(null); }} className="absolute top-3 right-3 bg-black/60 text-white p-2 rounded-full backdrop-blur-md hover:bg-red-500 transition text-xs">
                                            🗑️ Remove
                                        </button>
                                    </div>
                                    <div className="flex gap-3">
                                        <img src={currentUser?.profile_pic || (isBoy ? "https://cdn-icons-png.flaticon.com/512/3135/3135715.png" : "https://cdn-icons-png.flaticon.com/512/3135/3135768.png")} alt="Profile" className="w-10 h-10 rounded-full object-cover border border-white/10" />
                                        <textarea
                                            placeholder="Write a caption..."
                                            value={postCaption}
                                            onChange={(e) => setPostCaption(e.target.value)}
                                            className={`flex-1 bg-transparent border-b border-white/10 p-2 text-sm text-white resize-none h-20 outline-none transition ${isBoy ? 'focus:border-blue-500' : 'focus:border-pink-500'}`}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default Navbar;