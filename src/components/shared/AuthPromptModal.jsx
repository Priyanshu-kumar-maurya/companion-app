import React from "react";
import { FiX, FiLock, FiHeart, FiMessageCircle, FiShield, FiUserCheck } from "react-icons/fi";
import { PAGES } from "../../App";

function AuthPromptModal({ isOpen, onClose, setPage, title, subtitle, iconType = "heart" }) {
  if (!isOpen) return null;

  const handleAction = (targetPage) => {
    onClose();
    if (typeof setPage === "function") {
      setPage(targetPage);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="bg-[#121212] w-full max-w-md rounded-t-3xl sm:rounded-3xl border border-white/10 shadow-2xl p-6 relative overflow-hidden animate-slide-up sm:animate-scale-up">
        {/* Subtle Ambient Sunset Glow */}
        <div className="absolute -top-14 -right-14 w-36 h-36 bg-gradient-to-br from-[#f9ce3f]/20 via-[#e1306c]/20 to-[#833ab4]/20 rounded-full blur-2xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white p-2 rounded-full hover:bg-white/10 transition"
          aria-label="Close"
        >
          <FiX size={20} />
        </button>

        {/* Header Icon */}
        <div className="flex flex-col items-center text-center mt-2 mb-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#f9ce3f] via-[#e1306c] to-[#833ab4] p-[2px] shadow-[0_0_20px_rgba(225,48,108,0.4)] mb-4">
            <div className="w-full h-full bg-[#121212] rounded-[14px] flex items-center justify-center text-white">
              {iconType === "message" ? (
                <FiMessageCircle size={28} className="text-pink-400" />
              ) : iconType === "lock" ? (
                <FiLock size={28} className="text-yellow-400" />
              ) : iconType === "shield" ? (
                <FiShield size={28} className="text-sky-400" />
              ) : (
                <FiHeart size={28} className="text-[#ed4956]" />
              )}
            </div>
          </div>

          <h3 className="text-xl font-black text-white tracking-tight">
            {title || "Join Coffeely to Continue"}
          </h3>
          <p className="text-xs text-gray-400 max-w-xs mt-1.5 leading-relaxed">
            {subtitle || "Connect with safe & verified companions for coffee dates, movie outings, and meaningful chats."}
          </p>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-2 gap-2 mb-6 text-[11px] text-gray-300">
          <div className="bg-white/5 border border-white/5 rounded-xl p-2.5 flex items-center gap-2">
            <FiUserCheck className="text-emerald-400 shrink-0" size={16} />
            <span>100% KYC Verified</span>
          </div>
          <div className="bg-white/5 border border-white/5 rounded-xl p-2.5 flex items-center gap-2">
            <FiShield className="text-sky-400 shrink-0" size={16} />
            <span>End-to-End Privacy</span>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-2.5">
          <button
            onClick={() => handleAction(PAGES.BOY_LOGIN)}
            className="w-full py-3.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-[#f9ce3f] via-[#e1306c] to-[#833ab4] shadow-lg shadow-pink-500/25 hover:opacity-95 active:scale-95 transition"
          >
            Log In to Account
          </button>

          <button
            onClick={() => handleAction(PAGES.BOY_REGISTER)}
            className="w-full py-3 rounded-xl font-bold text-sm text-gray-200 bg-white/10 hover:bg-white/15 border border-white/10 active:scale-95 transition"
          >
            Create Free Account
          </button>

          <button
            onClick={() => handleAction(PAGES.GIRL_REGISTER)}
            className="text-center text-xs text-pink-400 hover:text-pink-300 font-semibold pt-2 transition"
          >
            Want to offer companionship? <span className="underline">Become a Companion</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default AuthPromptModal;
