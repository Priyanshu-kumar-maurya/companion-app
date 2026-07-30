import React, { useState, useEffect } from "react";
import { PAGES } from "../App";
import { FiHome, FiSearch, FiMessageCircle, FiBell, FiUser, FiCamera, FiTrash2, FiPlusCircle, FiShield, FiX } from "react-icons/fi";

function Navbar({ page, setPage, girlUser, boyUser, adminUser, setGirlUser, setBoyUser, socket }) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [showPostModal, setShowPostModal] = useState(false);
    const [postFile, setPostFile] = useState(null);
    const [postPreview, setPostPreview] = useState(null);
    const [postCaption, setPostCaption] = useState("");
    const [isPosting, setIsPosting] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    // Instagram style post destinations & settings
    const [showOnFeed, setShowOnFeed] = useState(true);
    const [showOnProfile, setShowOnProfile] = useState(true);
    const [followersOnly, setFollowersOnly] = useState(false);
    const [disableComments, setDisableComments] = useState(false);
    const [hideLikes, setHideLikes] = useState(false);

    const currentUser = boyUser || girlUser || adminUser;
    const isBoy = boyUser !== null;
    const isAdmin = adminUser !== null;

    useEffect(() => {
        if (!currentUser) return;

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
            } catch (err) { }
        };

        fetchTotalUnread();

        if (socket) {
            const handleNewMessage = (data) => {
                if (page !== PAGES.CHAT && String(data.receiver_id) === String(currentUser.id)) {
                    setUnreadCount((prev) => prev + 1);
                }
            };

            const handleMessagesRead = (data) => {
                if (String(data.receiver_id) === String(currentUser.id) || String(data.sender_id) === String(currentUser.id)) {
                    fetchTotalUnread();
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
        setShowOnFeed(true);
        setShowOnProfile(true);
        setFollowersOnly(false);
        setDisableComments(false);
        setHideLikes(false);
    };

    const handlePostSubmit = async () => {
        if (!postFile || !currentUser) return;
        setIsPosting(true);
        const formData = new FormData();
        formData.append("post_image", postFile);
        formData.append("caption", postCaption);
        formData.append("show_on_feed", showOnFeed);
        formData.append("show_on_profile", showOnProfile);
        formData.append("followers_only", followersOnly);
        formData.append("disable_comments", disableComments);
        formData.append("hide_likes", hideLikes);

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`https://rentgf-and-bf.onrender.com/api/posts/${currentUser.id}`, {
                method: "POST",
                body: formData,
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                alert("Post shared successfully!");
                closePostModal();
            } else {
                const data = await response.json();
                alert(data.error || "Upload failed.");
            }
        } catch (err) {
            alert("Upload failed. Please try again.");
        } finally {
            setIsPosting(false);
        }
    };

    const activeColor = "text-[#e1306c] drop-shadow-[0_0_8px_rgba(225,48,108,0.5)]";
    const inactiveColor = "text-gray-500 hover:text-gray-300";
    const isHiddenScreen = page === PAGES.CHAT || page === PAGES.DETAILS;

    return (
        <>
            {!isHiddenScreen && (
                <nav className="fixed top-0 left-0 right-0 z-40 bg-black/95 backdrop-blur-xl border-b border-[#262626] hidden md:block shadow-[0_2px_24px_rgba(0,0,0,0.6)]">
                    <div className="max-w-6xl mx-auto px-6 h-[60px] flex items-center justify-between gap-6">

                        {/* ─── LEFT: Logo ─── */}
                        <button onClick={() => handleNavClick(PAGES.HOME)} className="flex items-center gap-2.5 shrink-0">
                            <svg className="w-8 h-8 shrink-0 drop-shadow-[0_0_8px_rgba(225,48,108,0.4)]" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M49.9999 15L23.157 30.5V61.5L49.9999 77L76.8428 61.5V30.5L49.9999 15Z" stroke="url(#ai-grad2)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M49.9999 35L36.1436 43V59L49.9999 67L63.8563 59V43L49.9999 35Z" stroke="url(#ai-grad2)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M23 30.5L50 50M77 30.5L50 50M50 77V50" stroke="url(#ai-grad2)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                                <defs><linearGradient id="ai-grad2" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse"><stop stopColor="#f9ce3f" /><stop offset="0.5" stopColor="#e1306c" /><stop offset="1" stopColor="#833ab4" /></linearGradient></defs>
                            </svg>
                            <span className="text-lg font-black bg-gradient-to-r from-[#f9ce3f] via-[#e1306c] to-[#833ab4] bg-clip-text text-transparent tracking-wide">Coffeely</span>
                        </button>

                        {/* ─── CENTER: Nav Icons ─── */}
                        <div className="flex items-center gap-1 flex-1 justify-center">
                            {!currentUser ? (
                                <>
                                    <button onClick={() => handleNavClick(PAGES.HOME)} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${page === PAGES.HOME ? 'text-[#e1306c] bg-[#e1306c]/10' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>Home</button>
                                    <button onClick={() => handleNavClick(PAGES.ABOUT)} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${page === PAGES.ABOUT ? 'text-[#e1306c] bg-[#e1306c]/10' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>About</button>
                                    <button onClick={() => handleNavClick(PAGES.HELP)} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${page === PAGES.HELP ? 'text-[#e1306c] bg-[#e1306c]/10' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>Help</button>
                                </>
                            ) : (
                                <>
                                    <button onClick={() => handleNavClick(PAGES.HOME)} title="Home" className={`flex flex-col items-center justify-center w-14 h-12 rounded-xl transition-all ${page === PAGES.HOME ? 'text-[#e1306c] bg-[#e1306c]/10' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}>
                                        <FiHome size={20} /><span className="text-[9px] mt-0.5 font-semibold">Home</span>
                                    </button>
                                    <button onClick={() => handleNavClick(PAGES.FIND)} title="Find" className={`flex flex-col items-center justify-center w-14 h-12 rounded-xl transition-all ${page === PAGES.FIND ? 'text-[#e1306c] bg-[#e1306c]/10' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}>
                                        <FiSearch size={20} /><span className="text-[9px] mt-0.5 font-semibold">Find</span>
                                    </button>
                                    <button onClick={() => handleNavClick(PAGES.MESSAGES)} title="Messages" className={`relative flex flex-col items-center justify-center w-14 h-12 rounded-xl transition-all ${page === PAGES.MESSAGES ? 'text-[#e1306c] bg-[#e1306c]/10' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}>
                                        <span className="relative"><FiMessageCircle size={20} />{unreadCount > 0 && <span className="absolute -top-1.5 -right-2.5 bg-red-500 text-white text-[9px] font-bold px-1 rounded-full min-w-[15px] text-center leading-[15px]">{unreadCount}</span>}</span>
                                        <span className="text-[9px] mt-0.5 font-semibold">Inbox</span>
                                    </button>
                                    <button onClick={() => handleNavClick(PAGES.NOTIFICATIONS)} title="Activity" className={`flex flex-col items-center justify-center w-14 h-12 rounded-xl transition-all ${page === PAGES.NOTIFICATIONS ? 'text-[#e1306c] bg-[#e1306c]/10' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}>
                                        <FiBell size={20} /><span className="text-[9px] mt-0.5 font-semibold">Activity</span>
                                    </button>
                                </>
                            )}
                        </div>

                        {/* ─── RIGHT: Actions ─── */}
                        <div className="flex items-center gap-2 shrink-0">
                            {currentUser ? (
                                <>
                                    {isAdmin && (
                                        <button onClick={() => handleNavClick(PAGES.ADMIN_DASHBOARD)} className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs font-bold rounded-lg shadow-md hover:opacity-90 transition shrink-0">
                                            <FiShield size={13} /> Admin
                                        </button>
                                    )}
                                    <button onClick={() => setShowPostModal(true)} className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold bg-white/5 border border-[#262626] hover:bg-white/10 rounded-full text-white transition shrink-0">
                                        <FiPlusCircle size={14} /> Post
                                    </button>
                                    <button
                                        onClick={() => handleNavClick(currentUser.role === 'girl' ? PAGES.GIRL_DASHBOARD : PAGES.BOY_DASHBOARD)}
                                        className={`flex items-center gap-2 pl-1 pr-3 py-1 rounded-full text-sm font-bold transition-all border shrink-0 ${page === PAGES.GIRL_DASHBOARD || page === PAGES.BOY_DASHBOARD ? 'bg-[#e1306c] border-[#e1306c]/50 text-white shadow-[0_0_14px_rgba(225,48,108,0.4)]' : 'bg-gradient-to-r from-[#f9ce3f] via-[#e1306c] to-[#833ab4] border-[#e1306c]/30 text-white shadow-[0_0_14px_rgba(225,48,108,0.2)] hover:opacity-95'}`}
                                    >
                                        {currentUser.profile_pic ? (
                                            <img src={currentUser.profile_pic} alt="" className="w-7 h-7 rounded-full object-cover border-2 border-white/30 shrink-0" />
                                        ) : (
                                            <span className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold border-2 border-white/30 shrink-0">{currentUser.name?.[0]?.toUpperCase()}</span>
                                        )}
                                        {currentUser.name.split(" ")[0]}
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button onClick={() => handleNavClick(PAGES.GIRL_LOGIN)} className="px-4 py-1.5 text-sm border border-[#e1306c]/60 text-[#e1306c] rounded-full hover:bg-[#e1306c] hover:text-white transition font-medium">Join as Girl</button>
                                    <button onClick={() => handleNavClick(PAGES.BOY_LOGIN)} className="px-4 py-1.5 text-sm bg-gradient-to-r from-[#f9ce3f] via-[#e1306c] to-[#833ab4] text-white rounded-full hover:opacity-90 transition font-bold shadow-md">Find Companion</button>
                                </>
                            )}
                        </div>
                    </div>
                </nav>
            )}


            {!isHiddenScreen && (
                <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-black/95 backdrop-blur border-b border-[#262626] h-14 flex items-center justify-between px-4">
                    <h3 className="text-xl font-black bg-gradient-to-r from-[#f9ce3f] via-[#e1306c] to-[#833ab4] bg-clip-text text-transparent tracking-wider">
                        RentGF
                    </h3>

                    {currentUser ? (
                        <button
                            onClick={() => setShowPostModal(true)}
                            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold bg-white/10 border border-[#262626] hover:bg-white/20 rounded-full text-white transition"
                        >
                            <FiPlusCircle size={14} /> Post
                        </button>
                    ) : (
                        <button className="text-2xl text-white outline-none" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                            {isMenuOpen ? "✕" : "☰"}
                        </button>
                    )}
                </div>
            )}

            {isMenuOpen && !isHiddenScreen && !currentUser && (
                <div className="md:hidden fixed top-14 left-0 w-full bg-[#121212] border-b border-[#262626] py-4 px-6 flex flex-col gap-4 shadow-xl z-40">
                    <button onClick={() => handleNavClick(PAGES.HOME)} className={`text-left ${getLinkStyle(PAGES.HOME)} w-fit`}>Home</button>
                    <button onClick={() => handleNavClick(PAGES.ABOUT)} className={`text-left ${getLinkStyle(PAGES.ABOUT)} w-fit`}>About</button>
                    <button onClick={() => handleNavClick(PAGES.HELP)} className={`text-left ${getLinkStyle(PAGES.HELP)} w-fit`}>Help</button>
                    <div className="h-px bg-white/10 w-full my-2"></div>
                    <div className="flex flex-col gap-3">
                        <button onClick={() => handleNavClick(PAGES.GIRL_LOGIN)} className="px-4 py-2 text-sm border border-[#e1306c] text-[#e1306c] rounded-xl text-center">Join as Girl</button>
                        <button onClick={() => handleNavClick(PAGES.BOY_LOGIN)} className="px-4 py-2 text-sm bg-gradient-to-r from-[#f9ce3f] via-[#e1306c] to-[#833ab4] text-white rounded-xl text-center">Find Companion</button>
                    </div>
                </div>
            )}

            {!isHiddenScreen && (
                <div className="fixed bottom-0 left-0 w-full bg-[#121212]/95 backdrop-blur-xl border-t border-[#262626] z-40 md:hidden pb-2 pt-2">
                    <div className="flex justify-around items-center h-14 max-w-md mx-auto px-2">
                        <button onClick={() => handleNavClick(PAGES.HOME)} className={`flex flex-col items-center justify-center w-10 gap-1 transition-all duration-300 ${page === PAGES.HOME ? activeColor + " scale-110 -translate-y-1" : inactiveColor}`}>
                            <FiHome size={21} /><span className="text-[9px] font-bold">Home</span>
                        </button>

                        {currentUser && (
                            <button onClick={() => handleNavClick(PAGES.FIND)} className={`flex flex-col items-center justify-center w-10 gap-1 transition-all duration-300 ${page === PAGES.FIND ? activeColor + " scale-110 -translate-y-1" : inactiveColor}`}>
                                <FiSearch size={21} /><span className="text-[9px] font-bold">Explore</span>
                            </button>
                        )}

                        {currentUser && (
                            <button onClick={() => handleNavClick(PAGES.MESSAGES)} className={`relative flex flex-col items-center justify-center w-10 gap-1 transition-all duration-300 ${page === PAGES.MESSAGES ? activeColor + " scale-110 -translate-y-1" : inactiveColor}`}>
                                <span className="relative">
                                    <FiMessageCircle size={21} />
                                    {unreadCount > 0 && (
                                        <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full animate-bounce shadow-lg">
                                            {unreadCount}
                                        </span>
                                    )}
                                </span>
                                <span className="text-[9px] font-bold">Inbox</span>
                            </button>
                        )}

                        {currentUser && (
                            <button onClick={() => handleNavClick(PAGES.NOTIFICATIONS)} className={`relative flex flex-col items-center justify-center w-10 gap-1 transition-all duration-300 ${page === PAGES.NOTIFICATIONS ? activeColor + " scale-110 -translate-y-1" : inactiveColor}`}>
                                <FiBell size={21} />
                                <span className="text-[9px] font-bold">Activity</span>
                            </button>
                        )}

                        {isAdmin && (
                            <button
                                onClick={() => handleNavClick(PAGES.ADMIN_DASHBOARD)}
                                className="px-2 py-1.5 bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold rounded-lg shadow-lg hover:scale-105 transition ml-1 text-xs flex items-center gap-1"
                            >
                                <FiShield size={14} /> Admin
                            </button>
                        )}
                        {currentUser ? (
                            <button onClick={() => handleNavClick(currentUser.role === 'girl' ? PAGES.GIRL_DASHBOARD : PAGES.BOY_DASHBOARD)} className={`flex flex-col items-center justify-center w-10 gap-1 transition-all duration-300 ${(page === PAGES.BOY_DASHBOARD || page === PAGES.GIRL_DASHBOARD) ? activeColor + " scale-110 -translate-y-1" : inactiveColor}`}>
                                <FiUser size={21} /><span className="text-[9px] font-bold">Profile</span>
                            </button>
                        ) : (
                            <button onClick={() => handleNavClick(PAGES.ABOUT)} className={`flex flex-col items-center justify-center w-12 gap-1 transition-all duration-300 ${page === PAGES.ABOUT ? activeColor + " scale-110 -translate-y-1" : inactiveColor}`}>
                                <FiUser size={21} /><span className="text-[9px] font-bold">About</span>
                            </button>
                        )}
                    </div>
                </div>
            )}

            {showPostModal && (
                <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 sm:p-0">
                    <div className="bg-[#121212] sm:border border-[#262626] sm:rounded-2xl w-full max-w-md h-full sm:h-auto overflow-hidden flex flex-col animate-slide-up sm:animate-none">
                        <div className="flex justify-between items-center px-4 py-3 border-b border-[#262626] bg-black">
                            <button onClick={closePostModal} className="text-white text-2xl hover:text-red-400 transition">✕</button>
                            <h3 className="font-bold text-white text-lg">New Post</h3>
                            <button
                                onClick={handlePostSubmit}
                                disabled={!postFile || isPosting}
                                className="font-bold text-lg transition text-pink-500 hover:text-pink-400"
                            >
                                {isPosting ? "Posting..." : "Share"}
                            </button>
                        </div>

                        <div className="p-4 flex-1 overflow-y-auto flex flex-col gap-4">
                            {!postPreview ? (
                                <label className="w-full aspect-square border-2 border-dashed border-white/20 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition hover:border-pink-500 hover:bg-pink-500/5">
                                    <FiCamera size={48} className="text-pink-400 mb-3" />
                                    <span className="text-white font-bold text-lg">Select Photo</span>
                                    <span className="text-gray-500 text-sm mt-1">Tap to browse files</span>
                                    <input type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
                                </label>
                            ) : (
                                <div className="flex flex-col gap-4 animate-fade-in">
                                    <div className="relative">
                                        <img src={postPreview} alt="Preview" className="w-full aspect-square object-cover rounded-xl border border-white/10 shadow-lg" />
                                        <button onClick={() => { setPostFile(null); setPostPreview(null); }} className="absolute top-3 right-3 bg-black/60 text-white p-2 rounded-full backdrop-blur-md hover:bg-red-500 transition flex items-center gap-1 text-xs">
                                            <FiTrash2 size={13} /> Remove
                                        </button>
                                    </div>
                                    <div className="flex gap-3">
                                        <img src={currentUser?.profile_pic || (isBoy ? "https://cdn-icons-png.flaticon.com/512/3135/3135715.png" : "https://cdn-icons-png.flaticon.com/512/3135/3135768.png")} alt="Profile" className="w-10 h-10 rounded-full object-cover border border-white/10" />
                                        <textarea
                                            placeholder="Write a caption..."
                                            value={postCaption}
                                            onChange={(e) => setPostCaption(e.target.value)}
                                            className={`flex-1 bg-transparent border-b border-white/10 p-2 text-sm text-white resize-none h-20 outline-none transition ${currentUser?.role === 'girl' ? 'focus:border-pink-500' : 'focus:border-blue-500'}`}
                                        />
                                    </div>

                                    {/* Instagram style options block */}
                                    <div className="mt-4 border-t border-white/10 pt-4 flex flex-col gap-3.5 pb-2">
                                        <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Post Settings & Options</h4>
                                        
                                        <div className="flex items-center justify-between gap-4">
                                            <div>
                                                <div className="text-sm font-semibold text-white">Show on Explore Feed</div>
                                                <div className="text-[11px] text-gray-500">Make visible in the global Explore / Find feed.</div>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer shrink-0">
                                                <input 
                                                    type="checkbox" 
                                                    checked={showOnFeed} 
                                                    onChange={(e) => setShowOnFeed(e.target.checked)} 
                                                    className="sr-only peer" 
                                                />
                                                <div className={`w-9 h-5 bg-white/10 rounded-full peer peer-focus:ring-0 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all ${currentUser?.role === 'girl' ? 'peer-checked:bg-pink-500' : 'peer-checked:bg-blue-500'}`}></div>
                                            </label>
                                        </div>

                                        <div className="flex items-center justify-between gap-4">
                                            <div>
                                                <div className="text-sm font-semibold text-white">Show on Profile Grid</div>
                                                <div className="text-[11px] text-gray-500">Show this photo in your profile gallery grid.</div>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer shrink-0">
                                                <input 
                                                    type="checkbox" 
                                                    checked={showOnProfile} 
                                                    onChange={(e) => setShowOnProfile(e.target.checked)} 
                                                    className="sr-only peer" 
                                                />
                                                <div className={`w-9 h-5 bg-white/10 rounded-full peer peer-focus:ring-0 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all ${currentUser?.role === 'girl' ? 'peer-checked:bg-pink-500' : 'peer-checked:bg-blue-500'}`}></div>
                                            </label>
                                        </div>

                                        <div className="flex items-center justify-between gap-4">
                                            <div>
                                                <div className="text-sm font-semibold text-white">Followers Only</div>
                                                <div className="text-[11px] text-gray-500">Only people who follow you can view this post.</div>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer shrink-0">
                                                <input 
                                                    type="checkbox" 
                                                    checked={followersOnly} 
                                                    onChange={(e) => setFollowersOnly(e.target.checked)} 
                                                    className="sr-only peer" 
                                                />
                                                <div className={`w-9 h-5 bg-white/10 rounded-full peer peer-focus:ring-0 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all ${currentUser?.role === 'girl' ? 'peer-checked:bg-pink-500' : 'peer-checked:bg-blue-500'}`}></div>
                                            </label>
                                        </div>

                                        <div className="flex items-center justify-between gap-4">
                                            <div>
                                                <div className="text-sm font-semibold text-white">Turn off Commenting</div>
                                                <div className="text-[11px] text-gray-500">Disable leaving comments on this specific post.</div>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer shrink-0">
                                                <input 
                                                    type="checkbox" 
                                                    checked={disableComments} 
                                                    onChange={(e) => setDisableComments(e.target.checked)} 
                                                    className="sr-only peer" 
                                                />
                                                <div className={`w-9 h-5 bg-white/10 rounded-full peer peer-focus:ring-0 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all ${currentUser?.role === 'girl' ? 'peer-checked:bg-pink-500' : 'peer-checked:bg-blue-500'}`}></div>
                                            </label>
                                        </div>

                                        <div className="flex items-center justify-between gap-4">
                                            <div>
                                                <div className="text-sm font-semibold text-white">Hide Likes count</div>
                                                <div className="text-[11px] text-gray-500">Only you can view the likes count of this post.</div>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer shrink-0">
                                                <input 
                                                    type="checkbox" 
                                                    checked={hideLikes} 
                                                    onChange={(e) => setHideLikes(e.target.checked)} 
                                                    className="sr-only peer" 
                                                />
                                                <div className={`w-9 h-5 bg-white/10 rounded-full peer peer-focus:ring-0 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all ${currentUser?.role === 'girl' ? 'peer-checked:bg-pink-500' : 'peer-checked:bg-blue-500'}`}></div>
                                            </label>
                                        </div>
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