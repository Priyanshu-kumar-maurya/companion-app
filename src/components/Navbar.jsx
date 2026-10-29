import React, { useState, useEffect } from "react";
import { PAGES } from "../App";
import {
  FiHome,
  FiSearch,
  FiMessageCircle,
  FiBell,
  FiUser,
  FiCamera,
  FiTrash2,
  FiPlusCircle,
  FiShield,
  FiCreditCard,
  FiHeart,
  FiMenu,
  FiPlusSquare,
  FiLock,
  FiCrop,
  FiLogIn,
  FiUserPlus,
} from "react-icons/fi";
import { APP_VERSION_TAG } from "../config/version";
import VerifiedBadge from "./shared/VerifiedBadge";
import CreatePostModal from "./shared/CreatePostModal";
import { triggerHaptic } from "../utils/nativeMobile";

const API_BASE = process.env.REACT_APP_API_URL || "https://rentgf-and-bf.onrender.com";
const API = `${API_BASE}/api`;

function Navbar({ page, setPage, girlUser, boyUser, adminUser, setGirlUser, setBoyUser, socket }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState(0);

  const currentUser = boyUser || girlUser || adminUser;
  const isBoy = boyUser !== null;
  const isAdmin = adminUser !== null;
  const hasDocument = Boolean(
    currentUser?.id_proof_url ||
    currentUser?.kyc_status === "verified" ||
    currentUser?.kyc_status === "pending"
  );
  const isProfilePage =
    page === PAGES.BOY_DASHBOARD || page === PAGES.GIRL_DASHBOARD || page === PAGES.ADMIN_DASHBOARD;

  useEffect(() => {
    if (!currentUser) return;

    const fetchTotalUnread = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        const headers = { Authorization: `Bearer ${token}` };

        // ⚡ Direct high-performance single query
        const fastRes = await fetch(`${API}/unread-messages-count`, { headers });
        if (fastRes.ok) {
          const data = await fastRes.json();
          setUnreadCount(data.count || 0);
          return;
        }

        // Fallback with auth headers
        const res = await fetch(`${API}/chats/${currentUser.id}`, { headers });
        if (res.ok) {
          const users = await res.json();
          let totalUnread = 0;

          await Promise.all(
            users.map(async (person) => {
              const msgRes = await fetch(`${API}/messages/${currentUser.id}/${person.id}`, {
                headers,
              });
              if (msgRes.ok) {
                const msgs = await msgRes.json();
                const unread = msgs.filter(
                  (m) => String(m.sender_id) === String(person.id) && !m.is_read
                ).length;
                totalUnread += unread;
              }
            })
          );
          setUnreadCount(totalUnread);
        }
      } catch (err) {}
    };

    const fetchTotalUnreadNotifs = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API}/notifications/${currentUser.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const notifs = await res.json();
          if (Array.isArray(notifs)) {
            setUnreadNotifsCount(notifs.filter((n) => !n.is_read).length);
          }
        }
      } catch (err) {}
    };

    fetchTotalUnread();
    fetchTotalUnreadNotifs();

    if (socket) {
      const handleNewMessage = (data) => {
        if (page !== PAGES.CHAT && String(data.receiver_id) === String(currentUser.id)) {
          setUnreadCount((prev) => prev + 1);
        }
      };

      const handleMessagesRead = (data) => {
        if (
          String(data.receiver_id) === String(currentUser.id) ||
          String(data.sender_id) === String(currentUser.id)
        ) {
          fetchTotalUnread();
        }
      };

      const handleNewNotif = () => {
        setUnreadNotifsCount((prev) => prev + 1);
      };

      socket.on("receive_message", handleNewMessage);
      socket.on("messages_read_update", handleMessagesRead);
      socket.on("new_notification", handleNewNotif);
      socket.on("notification_received", handleNewNotif);

      return () => {
        socket.off("receive_message", handleNewMessage);
        socket.off("messages_read_update", handleMessagesRead);
        socket.off("new_notification", handleNewNotif);
        socket.off("notification_received", handleNewNotif);
      };
    }
  }, [socket, currentUser, page]);

  const getLinkStyle = (targetPage) => {
    const isActive = page === targetPage;
    return `px-3 py-1.5 text-sm transition-all duration-300 ${
      isActive
        ? "text-pink-400 font-bold border-b-2 border-pink-500"
        : "text-gray-400 hover:text-white"
    }`;
  };

  const handleNavClick = (targetPage) => {
    try {
      triggerHaptic("selection");
    } catch (e) {}
    setPage(targetPage);
    setIsMenuOpen(false);
  };

  useEffect(() => {
    const handleOpenCreatePost = () => {
      setShowPostModal(true);
    };
    window.addEventListener("open-create-post", handleOpenCreatePost);
    return () => window.removeEventListener("open-create-post", handleOpenCreatePost);
  }, []);

  const activeColor = "text-[#e1306c] drop-shadow-[0_0_8px_rgba(225,48,108,0.5)]";
  const inactiveColor = "text-gray-500 hover:text-gray-300";
  const isHiddenScreen =
    page === PAGES.CHAT ||
    page === PAGES.DETAILS ||
    page === PAGES.BOY_LOGIN ||
    page === PAGES.GIRL_LOGIN ||
    page === PAGES.BOY_REGISTER ||
    page === PAGES.GIRL_REGISTER;

  return (
    <>
      {!isHiddenScreen && (
        <nav className="fixed top-0 left-0 right-0 z-40 bg-[#0D0D1A]/90 backdrop-blur-xl border-b border-white/5 hidden md:block shadow-[0_2px_24px_rgba(0,0,0,0.6)]">
          <div className="max-w-6xl mx-auto px-6 h-[60px] flex items-center justify-between gap-6">
            {/* ─── LEFT: Logo ─── */}
            <button
              onClick={() => handleNavClick(PAGES.HOME)}
              className="flex items-center gap-2.5 shrink-0"
            >
              <svg
                className="w-8 h-8 shrink-0 drop-shadow-[0_0_8px_rgba(225,48,108,0.4)]"
                viewBox="0 0 100 100"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M22 40H68C68 40 69 68 45 68C21 68 22 40 22 40Z"
                  stroke="url(#ai-grad2)"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M68 45H75C80 45 83 48 83 53C83 58 80 61 75 61H66"
                  stroke="url(#ai-grad2)"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path d="M18 75H72" stroke="url(#ai-grad2)" strokeWidth="6" strokeLinecap="round" />
                <path
                  d="M45 29C40 23 32 30 39 37L45 42L51 37C58 30 50 23 45 29Z"
                  fill="url(#ai-grad2)"
                />
                <path
                  d="M31 27C30 24 31 21 33 19"
                  stroke="url(#ai-grad2)"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
                <path
                  d="M59 27C60 24 59 21 57 19"
                  stroke="url(#ai-grad2)"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient
                    id="ai-grad2"
                    x1="0"
                    y1="0"
                    x2="100"
                    y2="100"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop stopColor="#f9ce3f" />
                    <stop offset="0.5" stopColor="#e1306c" />
                    <stop offset="1" stopColor="#833ab4" />
                  </linearGradient>
                </defs>
              </svg>
              <span className="text-lg font-black bg-gradient-to-r from-[#f9ce3f] via-[#e1306c] to-[#833ab4] bg-clip-text text-transparent tracking-wide">
                Coffeely
              </span>
            </button>

            {/* ─── CENTER: Nav Icons (Unified for all users) ─── */}
            <div className="flex items-center gap-1 flex-1 justify-center">
              <button
                onClick={() => handleNavClick(PAGES.HOME)}
                title="Home"
                className={`flex flex-col items-center justify-center w-14 h-12 rounded-xl transition-all ${page === PAGES.HOME ? "text-[#e1306c] bg-[#e1306c]/10" : "text-gray-400 hover:text-white hover:bg-white/5"}`}
              >
                <FiHome size={20} />
                <span className="text-[9px] mt-0.5 font-semibold">Home</span>
              </button>
              <button
                onClick={() => handleNavClick(PAGES.FIND)}
                title="Explore"
                className={`flex flex-col items-center justify-center w-14 h-12 rounded-xl transition-all ${page === PAGES.FIND ? "text-[#e1306c] bg-[#e1306c]/10" : "text-gray-400 hover:text-white hover:bg-white/5"}`}
              >
                <FiSearch size={20} />
                <span className="text-[9px] mt-0.5 font-semibold">Explore</span>
              </button>
              <button
                onClick={() => handleNavClick(currentUser ? PAGES.MESSAGES : PAGES.BOY_LOGIN)}
                title="Messages"
                className={`relative flex flex-col items-center justify-center w-14 h-12 rounded-xl transition-all ${page === PAGES.MESSAGES ? "text-[#e1306c] bg-[#e1306c]/10" : "text-gray-400 hover:text-white hover:bg-white/5"}`}
              >
                <span className="relative">
                  <FiMessageCircle size={20} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-2.5 bg-red-500 text-white text-[9px] font-bold px-1 rounded-full min-w-[15px] text-center leading-[15px]">
                      {unreadCount}
                    </span>
                  )}
                </span>
                <span className="text-[9px] mt-0.5 font-semibold">Inbox</span>
              </button>
              {currentUser && hasDocument && (
                <button
                  onClick={() => handleNavClick(PAGES.WALLET)}
                  title="Wallet"
                  className={`flex flex-col items-center justify-center w-14 h-12 rounded-xl transition-all ${page === PAGES.WALLET ? "text-[#e1306c] bg-[#e1306c]/10" : "text-gray-400 hover:text-white hover:bg-white/5"}`}
                >
                  <FiCreditCard size={20} />
                  <span className="text-[9px] mt-0.5 font-semibold">Wallet</span>
                </button>
              )}
              <button
                onClick={() => handleNavClick(currentUser ? PAGES.NOTIFICATIONS : PAGES.BOY_LOGIN)}
                title="Activity"
                className={`relative flex flex-col items-center justify-center w-14 h-12 rounded-xl transition-all ${page === PAGES.NOTIFICATIONS ? "text-[#e1306c] bg-[#e1306c]/10" : "text-gray-400 hover:text-white hover:bg-white/5"}`}
              >
                <span className="relative">
                  <FiBell size={20} />
                  {unreadNotifsCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full ring-2 ring-black animate-pulse" />
                  )}
                </span>
                <span className="text-[9px] mt-0.5 font-semibold">Activity</span>
              </button>
            </div>

            {/* ─── RIGHT: Actions ─── */}
            <div className="flex items-center gap-2 shrink-0">
              {currentUser ? (
                <>
                  {isAdmin && (
                    <button
                      onClick={() => handleNavClick(PAGES.ADMIN_DASHBOARD)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs font-bold rounded-lg shadow-md hover:opacity-90 transition shrink-0"
                    >
                      <FiShield size={13} /> Admin
                    </button>
                  )}
                  {hasDocument && (
                    <button
                      onClick={() => handleNavClick(PAGES.WALLET)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold bg-pink-500/10 border border-pink-500/30 hover:bg-pink-500/20 rounded-full text-pink-300 transition shrink-0 shadow-sm"
                    >
                      <FiCreditCard size={13} /> Wallet
                    </button>
                  )}
                  <button
                    onClick={() => setShowPostModal(true)}
                    className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold bg-white/5 border border-[#262626] hover:bg-white/10 rounded-full text-white transition shrink-0"
                  >
                    <FiPlusCircle size={14} /> Post
                  </button>
                  <button
                    onClick={() =>
                      handleNavClick(
                        currentUser.role === "girl" ? PAGES.GIRL_DASHBOARD : PAGES.BOY_DASHBOARD
                      )
                    }
                    className={`flex items-center gap-2 pl-1 pr-3 py-1 rounded-full text-sm font-bold transition-all border shrink-0 ${page === PAGES.GIRL_DASHBOARD || page === PAGES.BOY_DASHBOARD ? "bg-[#e1306c] border-[#e1306c]/50 text-white shadow-[0_0_14px_rgba(225,48,108,0.4)]" : "bg-gradient-to-r from-[#f9ce3f] via-[#e1306c] to-[#833ab4] border-[#e1306c]/30 text-white shadow-[0_0_14px_rgba(225,48,108,0.2)] hover:opacity-95"}`}
                  >
                    {currentUser.profile_pic ? (
                      <img
                        src={currentUser.profile_pic}
                        alt=""
                        className="w-7 h-7 rounded-full object-cover border-2 border-white/30 shrink-0"
                      />
                    ) : (
                      <span className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold border-2 border-white/30 shrink-0">
                        {currentUser.name?.[0]?.toUpperCase()}
                      </span>
                    )}
                    {currentUser.name.split(" ")[0]}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => handleNavClick(PAGES.BOY_LOGIN)}
                    className="px-3.5 py-1.5 text-sm text-gray-300 hover:text-white transition font-medium"
                  >
                    Log In
                  </button>
                  <button
                    onClick={() => handleNavClick(PAGES.GIRL_REGISTER)}
                    className="px-3.5 py-1.5 text-sm border border-[#e1306c]/60 text-[#e1306c] rounded-full hover:bg-[#e1306c] hover:text-white transition font-medium"
                  >
                    Become a Companion
                  </button>
                  <button
                    onClick={() => handleNavClick(PAGES.FIND)}
                    className="px-4 py-1.5 text-sm bg-gradient-to-r from-[#f9ce3f] via-[#e1306c] to-[#833ab4] text-white rounded-full hover:opacity-90 transition font-bold shadow-md"
                  >
                    Find a Companion
                  </button>
                </>
              )}
            </div>
          </div>
        </nav>
      )}

      {/* ─── MOBILE TOP BAR: Instagram Header for ALL Users ─── */}
      {!isHiddenScreen && (
        <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-[#000000]/95 backdrop-blur-xl border-b border-[#262626] pt-[env(safe-area-inset-top,0px)] h-[calc(3.5rem+env(safe-area-inset-top,0px))] flex items-center justify-between px-4">
          {currentUser && isProfilePage ? (
            <>
              {/* Instagram Profile Top Header: Username on Left */}
              <div className="flex items-center gap-1.5 min-w-0">
                {currentUser.is_private && <FiLock size={14} className="text-gray-400 shrink-0" />}
                <h3 className="text-lg font-black text-white tracking-tight truncate max-w-[210px]">
                  {currentUser.username ? `@${currentUser.username}` : currentUser.name}
                </h3>
                {currentUser.kyc_status === "verified" && <VerifiedBadge size="sm" />}
              </div>

              {/* Instagram Profile Top Header: Wallet (if verified), Create Post (+) & Settings Menu (☰) on Right */}
              <div className="flex items-center gap-1">
                {hasDocument && (
                  <button
                    onClick={() => handleNavClick(PAGES.WALLET)}
                    className={`w-11 h-11 min-w-[44px] min-h-[44px] rounded-full hover:bg-white/10 flex items-center justify-center transition active:scale-90 ${page === PAGES.WALLET ? "text-pink-500" : "text-amber-400 hover:text-amber-300"}`}
                    title="Wallet & Earnings"
                    aria-label="Wallet & Earnings"
                  >
                    <FiCreditCard size={22} />
                  </button>
                )}
                <button
                  onClick={() => setShowPostModal(true)}
                  className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full hover:bg-white/10 text-white flex items-center justify-center transition active:scale-90"
                  title="New Post"
                  aria-label="New Post"
                >
                  <FiPlusSquare size={23} />
                </button>
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent("open-settings"))}
                  className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full hover:bg-white/10 text-white flex items-center justify-center transition active:scale-90"
                  title="Settings & Menu"
                  aria-label="Settings & Menu"
                >
                  <FiMenu size={25} />
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Instagram Feed Top Header: Coffeely on Left */}
              <button
                onClick={() => handleNavClick(PAGES.HOME)}
                className="flex items-center gap-2 outline-none group"
              >
                <h3 className="text-2xl font-black bg-gradient-to-r from-[#f9ce3f] via-[#e1306c] to-[#833ab4] bg-clip-text text-transparent tracking-wide select-none">
                  Coffeely
                </h3>
              </button>

              {/* Instagram Feed Top Header: SOS + Notification (Heart) + DM (Message) on Right */}
              <div className="flex items-center gap-1">
                {/* Emergency Safety SOS Button */}
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent("open-sos"))}
                  className="relative w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-red-400 hover:text-red-300 transition active:scale-90"
                  title="Emergency SOS"
                  aria-label="Emergency SOS"
                >
                  <FiShield size={22} />
                </button>

                {/* Wallet Shortcut for Companions / ID Verified */}
                {currentUser && hasDocument && (
                  <button
                    onClick={() => handleNavClick(PAGES.WALLET)}
                    className={`relative w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full transition active:scale-90 ${page === PAGES.WALLET ? "text-[#e1306c]" : "text-amber-400 hover:text-amber-300"}`}
                    title="Wallet"
                    aria-label="Wallet"
                  >
                    <FiCreditCard size={22} />
                  </button>
                )}

                {/* Notifications (Instagram-Style Heart Activity) */}
                <button
                  onClick={() => handleNavClick(currentUser ? PAGES.NOTIFICATIONS : PAGES.BOY_LOGIN)}
                  className={`relative w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full transition active:scale-90 ${page === PAGES.NOTIFICATIONS ? "text-[#e1306c]" : "text-white hover:text-gray-300"}`}
                  title="Notifications"
                  aria-label="Notifications"
                >
                  <FiHeart
                    size={24}
                    className={page === PAGES.NOTIFICATIONS ? "fill-[#e1306c] text-[#e1306c]" : ""}
                  />
                  {unreadNotifsCount > 0 && (
                    <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-black animate-pulse" />
                  )}
                </button>

                {/* Direct Messages Icon */}
                <button
                  onClick={() => handleNavClick(currentUser ? PAGES.MESSAGES : PAGES.BOY_LOGIN)}
                  className={`relative w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full transition active:scale-90 ${page === PAGES.MESSAGES ? "text-[#e1306c]" : "text-white hover:text-gray-300"}`}
                  title="Direct Messages"
                  aria-label="Direct Messages"
                >
                  <FiMessageCircle size={24} />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 bg-red-500 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full min-w-[16px] h-4 flex items-center justify-center ring-2 ring-black">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {!isHiddenScreen && (
        <div className="fixed bottom-0 left-0 w-full bg-[#000000]/95 backdrop-blur-2xl border-t border-[#262626] z-40 md:hidden pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] pt-1.5 shadow-[0_-8px_30px_rgba(0,0,0,0.8)]">
          <div className="flex justify-around items-center h-14 max-w-md mx-auto px-1">
            {/* 1. Home */}
            <button
              onClick={() => handleNavClick(PAGES.HOME)}
              className={`flex flex-col items-center justify-center w-14 py-1 gap-1 transition-all duration-300 relative group ${page === PAGES.HOME ? activeColor + " scale-105" : inactiveColor}`}
              title="Home"
            >
              <FiHome size={22} className="transition-transform group-hover:scale-110" />
              <span className="text-[10px] font-bold tracking-tight">Home</span>
              {page === PAGES.HOME && (
                <span className="absolute bottom-0 w-1.5 h-1.5 rounded-full bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 shadow-[0_0_6px_rgba(225,48,108,0.8)]" />
              )}
            </button>

            {/* 2. Explore */}
            <button
              onClick={() => handleNavClick(PAGES.FIND)}
              className={`flex flex-col items-center justify-center w-14 py-1 gap-1 transition-all duration-300 relative group ${page === PAGES.FIND ? activeColor + " scale-105" : inactiveColor}`}
              title="Explore"
            >
              <FiSearch size={22} className="transition-transform group-hover:scale-110" />
              <span className="text-[10px] font-bold tracking-tight">Explore</span>
              {page === PAGES.FIND && (
                <span className="absolute bottom-0 w-1.5 h-1.5 rounded-full bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 shadow-[0_0_6px_rgba(225,48,108,0.8)]" />
              )}
            </button>

            {/* 3. Center Create Action (+) */}
            <button
              onClick={() => {
                try {
                  triggerHaptic("medium");
                } catch (e) {}
                if (currentUser) {
                  setShowPostModal(true);
                } else {
                  handleNavClick(PAGES.BOY_LOGIN);
                }
              }}
              className="flex flex-col items-center justify-center w-14 -translate-y-2 group active:scale-90 transition-transform"
              title="New Post"
              aria-label="New Post"
            >
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#f9ce3f] via-[#e1306c] to-[#833ab4] p-[1.5px] shadow-[0_0_18px_rgba(225,48,108,0.5)] group-hover:scale-110 transition-transform flex items-center justify-center">
                <div className="w-full h-full bg-[#121212] rounded-[14px] flex items-center justify-center group-hover:bg-transparent transition-colors">
                  <FiPlusSquare size={22} className="text-white drop-shadow" />
                </div>
              </div>
              <span className="text-[9px] font-bold text-gray-400 group-hover:text-white transition-colors mt-0.5">Post</span>
            </button>

            {/* 4. Messages / Chats (with Real-time Unread Badge) */}
            <button
              onClick={() => handleNavClick(currentUser ? PAGES.MESSAGES : PAGES.BOY_LOGIN)}
              className={`flex flex-col items-center justify-center w-14 py-1 gap-1 transition-all duration-300 relative group ${page === PAGES.MESSAGES ? activeColor + " scale-105" : inactiveColor}`}
              title="Messages"
            >
              <div className="relative">
                <FiMessageCircle size={22} className="transition-transform group-hover:scale-110" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-gradient-to-r from-red-500 to-pink-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full min-w-[16px] h-4 flex items-center justify-center ring-2 ring-black shadow-md animate-pulse">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-bold tracking-tight">Chats</span>
              {page === PAGES.MESSAGES && (
                <span className="absolute bottom-0 w-1.5 h-1.5 rounded-full bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 shadow-[0_0_6px_rgba(225,48,108,0.8)]" />
              )}
            </button>

            {/* 5. Profile / Log In */}
            <button
              onClick={() => {
                if (currentUser) {
                  handleNavClick(
                    currentUser.role === "girl" ? PAGES.GIRL_DASHBOARD : PAGES.BOY_DASHBOARD
                  );
                } else {
                  handleNavClick(PAGES.BOY_LOGIN);
                }
              }}
              className={`flex flex-col items-center justify-center w-14 py-1 gap-1 transition-all duration-300 relative group ${
                page === PAGES.BOY_DASHBOARD || page === PAGES.GIRL_DASHBOARD || (!currentUser && (page === PAGES.BOY_LOGIN || page === PAGES.BOY_REGISTER))
                  ? activeColor + " scale-105"
                  : inactiveColor
              }`}
              title="Profile"
            >
              {currentUser?.profile_pic ? (
                <img
                  src={currentUser.profile_pic}
                  alt=""
                  className={`w-6 h-6 rounded-full object-cover transition-all ${
                    page === PAGES.BOY_DASHBOARD || page === PAGES.GIRL_DASHBOARD
                      ? "ring-2 ring-[#e1306c] ring-offset-1 ring-offset-black"
                      : "border border-white/20"
                  }`}
                />
              ) : (
                <FiUser size={22} className="transition-transform group-hover:scale-110" />
              )}
              <span className="text-[10px] font-bold tracking-tight">
                {currentUser ? "Profile" : "Log In"}
              </span>
              {(page === PAGES.BOY_DASHBOARD || page === PAGES.GIRL_DASHBOARD || (!currentUser && (page === PAGES.BOY_LOGIN || page === PAGES.BOY_REGISTER))) && (
                <span className="absolute bottom-0 w-1.5 h-1.5 rounded-full bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 shadow-[0_0_6px_rgba(225,48,108,0.8)]" />
              )}
            </button>
          </div>
        </div>
      )}

      <CreatePostModal
        isOpen={showPostModal}
        onClose={() => setShowPostModal(false)}
        currentUser={currentUser}
      />
    </>
  );
}

export default Navbar;
