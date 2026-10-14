import React, { useState, useEffect, useMemo, useRef } from "react";
import { FiX, FiSearch, FiCheck, FiLink, FiShare2, FiMessageSquare } from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";
import { RiLoader4Line } from "react-icons/ri";
import VerifiedBadge from "./VerifiedBadge";

const API_BASE = process.env.REACT_APP_API_URL || "https://rentgf-and-bf.onrender.com";
const API = `${API_BASE}/api`;

/**
 * SharePostModal
 * Authentic Instagram-style sharing sheet:
 * 1. Shows recent chat contacts & companions with direct "Send" buttons.
 * 2. Allows adding an optional message note to send with the post.
 * 3. Quick action buttons for Copy Link, Share to (native OS), WhatsApp, SMS.
 */
export default function SharePostModal({
  isOpen,
  post,
  currentUser,
  socket,
  onClose,
  onNavigateToChat,
}) {
  const [contacts, setContacts] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [messageNote, setMessageNote] = useState("");
  const [sendingIds, setSendingIds] = useState(new Set());
  const [sentIds, setSentIds] = useState(new Set());
  const [toastMessage, setToastMessage] = useState(null);
  const searchInputRef = useRef(null);
  const toastTimeoutRef = useRef(null);

  const postUrl = useMemo(() => {
    if (!post?.id) return window.location.href;
    return `${window.location.origin}/#post_${post.id}`;
  }, [post?.id]);

  const showToast = (msg) => {
    setToastMessage(msg);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  // Fetch recent chat partners & companions
  useEffect(() => {
    if (!isOpen || !post) return;
    setSendingIds(new Set());
    setSentIds(new Set());
    setMessageNote("");
    setSearchQuery("");

    let isMounted = true;
    const fetchContacts = async () => {
      setLoadingContacts(true);
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      try {
        let recentChats = [];
        let allUsers = [];

        // 1. Fetch recent chat history
        if (currentUser?.id && token) {
          try {
            const chatRes = await fetch(`${API}/chats/${currentUser.id}`, { headers });
            if (chatRes.ok) {
              recentChats = await chatRes.json();
            }
          } catch (e) {
            console.warn("Could not fetch recent chats:", e);
          }
        }

        // 2. Fetch platform companions/users
        try {
          const usersRes = await fetch(`${API}/users`);
          if (usersRes.ok) {
            allUsers = await usersRes.json();
          }
        } catch (e) {
          console.warn("Could not fetch platform users:", e);
        }

        if (!isMounted) return;

        // Combine and prioritize: recent chats first, then companions
        const combined = [];
        const seenIds = new Set();

        if (currentUser?.id) {
          seenIds.add(String(currentUser.id));
        }

        // Add recent chats first
        if (Array.isArray(recentChats)) {
          recentChats.forEach((u) => {
            const strId = String(u.id);
            if (!seenIds.has(strId)) {
              seenIds.add(strId);
              combined.push({
                ...u,
                isRecent: true,
              });
            }
          });
        }

        // Add remaining companions
        if (Array.isArray(allUsers)) {
          allUsers.forEach((u) => {
            const strId = String(u.id);
            if (!seenIds.has(strId)) {
              seenIds.add(strId);
              combined.push({
                ...u,
                isRecent: false,
              });
            }
          });
        }

        setContacts(combined);
      } catch (err) {
        console.error("Failed to load contacts for share sheet:", err);
      } finally {
        if (isMounted) setLoadingContacts(false);
      }
    };

    fetchContacts();

    return () => {
      isMounted = false;
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, [isOpen, post, currentUser?.id]);

  // Keyboard navigation: ESC to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Filter contacts by search query
  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) return contacts;
    const q = searchQuery.toLowerCase().trim();
    return contacts.filter(
      (c) =>
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.username && c.username.toLowerCase().includes(q)) ||
        (c.city && c.city.toLowerCase().includes(q))
    );
  }, [contacts, searchQuery]);

  // Send post directly to chat with selected contact
  const handleSendToContact = async (contact) => {
    if (!currentUser) {
      showToast("Please log in to send posts in chat.");
      return;
    }

    const targetId = contact.id;
    if (sentIds.has(targetId) || sendingIds.has(targetId)) return;

    // Mark as sending
    setSendingIds((prev) => new Set(prev).add(targetId));

    try {
      const token = localStorage.getItem("token");
      const customNote = messageNote.trim();
      const authorName = post.user_name || "Companion";
      const captionSnippet = post.caption
        ? `"${post.caption.slice(0, 90)}${post.caption.length > 90 ? "..." : ""}"`
        : "";

      const formattedText = customNote
        ? `${customNote}\n\nShared post by @${authorName} ${captionSnippet}\n${postUrl}`
        : `Shared post by @${authorName} ${captionSnippet}\n${postUrl}`;

      // 1. Post to API
      const res = await fetch(`${API}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          receiver_id: targetId,
          text: formattedText,
          image_url: post.image_url || null,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to send message.");
      }

      // 2. Real-time Socket dispatch if connected
      if (socket && socket.connected) {
        socket.emit("send_message", {
          room: `chat_${currentUser.id}_${targetId}`,
          sender_id: currentUser.id,
          receiver_id: targetId,
          text: formattedText,
          image_url: post.image_url || null,
        });
      }

      // Mark as sent
      setSentIds((prev) => new Set(prev).add(targetId));
      showToast(`Sent to ${contact.name}! ✈️`);
    } catch (err) {
      console.error("Error sending post to chat:", err);
      showToast("Failed to send. Please try again.");
    } finally {
      setSendingIds((prev) => {
        const next = new Set(prev);
        next.delete(targetId);
        return next;
      });
    }
  };

  // Copy post link
  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(postUrl);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = postUrl;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      showToast("Link copied to clipboard! 📋");
    } catch (err) {
      showToast("Could not copy link.");
    }
  };

  // External Native OS Share
  const handleExternalShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Post by ${post?.user_name || "Companion"} on RentGF`,
          text: post?.caption || "Check out this post on RentGF!",
          url: postUrl,
        });
      } catch (err) {
        if (err.name !== "AbortError") {
          handleCopyLink();
        }
      }
    } else {
      handleCopyLink();
    }
  };

  // WhatsApp Share
  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(
      `Check out this post by @${post?.user_name || "Companion"} on RentGF:\n${postUrl}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
  };

  // SMS Share
  const handleSmsShare = () => {
    const text = encodeURIComponent(`Check out this post on RentGF: ${postUrl}`);
    window.open(`sms:?body=${text}`, "_blank");
  };

  if (!isOpen || !post) return null;

  return (
    <div className="fixed inset-0 z-[160] bg-black/85 backdrop-blur-sm flex items-center justify-center p-0 sm:p-4 select-none animate-fade-in">
      {/* Modal Card */}
      <div className="bg-[#262626] sm:rounded-2xl border border-white/10 w-full max-w-[440px] h-full sm:h-[600px] max-h-screen flex flex-col overflow-hidden shadow-2xl relative text-white">
        {/* Toast Alert Banner */}
        {toastMessage && (
          <div className="absolute top-14 left-1/2 -translate-x-1/2 z-50 bg-[#121212]/95 border border-white/20 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-2xl backdrop-blur-md animate-fade-in flex items-center gap-2">
            <span>{toastMessage}</span>
          </div>
        )}

        {/* ─── Top Header ─── */}
        <div className="h-12 border-b border-[#363636] flex items-center justify-between px-4 bg-[#262626] shrink-0">
          <div className="w-8"></div>
          <h3 className="font-bold text-base text-white text-center flex-1">Share</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition"
            title="Close"
          >
            <FiX size={20} />
          </button>
        </div>

        {/* ─── Post Mini-Preview Strip ─── */}
        <div className="mx-4 mt-3 p-2.5 bg-[#181818] rounded-xl border border-white/10 flex items-center gap-3 shrink-0">
          <img
            src={post.image_url}
            alt="Post preview"
            className="w-11 h-11 rounded-lg object-cover bg-black shrink-0 border border-white/5"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-xs text-white truncate">
                {post.user_name || "Companion"}
              </span>
              <VerifiedBadge
                isVerified={Boolean(post.is_verified || post.kyc_status === "verified")}
                size="sm"
              />
            </div>
            <p className="text-[11px] text-gray-400 truncate mt-0.5">
              {post.caption || "View photo on RentGF"}
            </p>
          </div>
        </div>

        {/* ─── Search Bar ─── */}
        <div className="px-4 pt-3 pb-2 shrink-0">
          <div className="bg-[#181818] border border-white/10 rounded-xl px-3 py-2 flex items-center gap-2 focus-within:border-[#0095f6] transition">
            <FiSearch size={16} className="text-gray-400 shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search friends or chats..."
              className="bg-transparent text-xs text-white placeholder-gray-500 outline-none w-full"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="text-gray-500 hover:text-white text-xs p-0.5"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* ─── Contact List Section ─── */}
        <div className="flex-1 overflow-y-auto px-4 py-1 custom-scrollbar">
          {loadingContacts ? (
            <div className="space-y-3 py-3">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="flex items-center justify-between animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-white/10" />
                    <div className="space-y-1.5">
                      <div className="w-28 h-3 bg-white/10 rounded" />
                      <div className="w-16 h-2.5 bg-white/5 rounded" />
                    </div>
                  </div>
                  <div className="w-16 h-7 bg-white/10 rounded-lg" />
                </div>
              ))}
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-xs">
              {searchQuery ? `No users found matching "${searchQuery}"` : "No chats found yet."}
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {filteredContacts.map((contact) => {
                const isSent = sentIds.has(contact.id);
                const isSending = sendingIds.has(contact.id);

                return (
                  <div
                    key={contact.id}
                    className="flex items-center justify-between py-2.5 group hover:bg-white/5 px-2 rounded-xl transition"
                  >
                    {/* User Info */}
                    <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
                      <div className="relative shrink-0">
                        <img
                          src={
                            contact.profile_pic ||
                            (contact.role === "boy"
                              ? "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
                              : "https://cdn-icons-png.flaticon.com/512/3135/3135768.png")
                          }
                          alt={contact.name}
                          className="w-11 h-11 rounded-full object-cover border border-white/10"
                        />
                        {contact.isRecent && (
                          <span
                            className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-[#262626] rounded-full"
                            title="Recent chat partner"
                          />
                        )}
                      </div>

                      <div className="min-w-0 flex-1 text-left">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-xs sm:text-sm text-white truncate">
                            {contact.name}
                          </span>
                          <VerifiedBadge
                            isVerified={Boolean(
                              contact.kyc_status === "verified" || contact.is_verified
                            )}
                            size="sm"
                          />
                        </div>
                        <p className="text-[11px] text-gray-400 truncate mt-0.5">
                          {contact.isRecent
                            ? "Recent in chat"
                            : `@${contact.username || contact.role || "user"}`}
                        </p>
                      </div>
                    </div>

                    {/* Send Button */}
                    <div className="shrink-0">
                      {isSent ? (
                        <button
                          disabled
                          className="bg-[#363636] border border-white/15 text-gray-200 font-semibold text-xs px-3.5 py-1.5 rounded-lg flex items-center gap-1 cursor-default animate-fade-in"
                        >
                          <FiCheck size={14} className="text-[#0095f6]" />
                          <span>Sent</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleSendToContact(contact)}
                          disabled={isSending}
                          className={`bg-[#0095f6] hover:bg-[#1877f2] text-white font-semibold text-xs px-4 py-1.5 rounded-lg transition active:scale-95 shadow-sm flex items-center gap-1.5 ${
                            isSending ? "opacity-75 cursor-wait" : ""
                          }`}
                        >
                          {isSending ? (
                            <>
                              <RiLoader4Line size={14} className="animate-spin" />
                              <span>Sending...</span>
                            </>
                          ) : (
                            <span>Send</span>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ─── Optional Message Note Input ─── */}
        <div className="px-4 py-2 border-t border-[#363636] bg-[#202020] shrink-0">
          <input
            type="text"
            value={messageNote}
            onChange={(e) => setMessageNote(e.target.value)}
            placeholder="Write a message..."
            maxLength={180}
            className="w-full bg-[#161616] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 outline-none focus:border-[#0095f6] transition"
          />
        </div>

        {/* ─── Bottom Instagram Quick Action Icons ─── */}
        <div className="px-4 py-3 border-t border-[#363636] bg-[#1a1a1a] flex items-center justify-around gap-2 shrink-0">
          {/* Copy Link */}
          <button
            onClick={handleCopyLink}
            className="flex flex-col items-center gap-1 group focus:outline-none"
            title="Copy post link"
          >
            <div className="w-11 h-11 rounded-full bg-[#262626] hover:bg-[#333] border border-white/10 flex items-center justify-center text-white transition active:scale-95 group-hover:border-white/30">
              <FiLink size={18} />
            </div>
            <span className="text-[10px] text-gray-300 font-medium">Copy link</span>
          </button>

          {/* Share via / System */}
          <button
            onClick={handleExternalShare}
            className="flex flex-col items-center gap-1 group focus:outline-none"
            title="Share via other apps"
          >
            <div className="w-11 h-11 rounded-full bg-[#262626] hover:bg-[#333] border border-white/10 flex items-center justify-center text-white transition active:scale-95 group-hover:border-white/30">
              <FiShare2 size={18} />
            </div>
            <span className="text-[10px] text-gray-300 font-medium">Share to...</span>
          </button>

          {/* WhatsApp */}
          <button
            onClick={handleWhatsAppShare}
            className="flex flex-col items-center gap-1 group focus:outline-none"
            title="Share on WhatsApp"
          >
            <div className="w-11 h-11 rounded-full bg-[#25D366]/20 hover:bg-[#25D366]/30 border border-[#25D366]/40 flex items-center justify-center text-[#25D366] transition active:scale-95">
              <FaWhatsapp size={20} />
            </div>
            <span className="text-[10px] text-gray-300 font-medium">WhatsApp</span>
          </button>

          {/* SMS */}
          <button
            onClick={handleSmsShare}
            className="flex flex-col items-center gap-1 group focus:outline-none"
            title="Send SMS"
          >
            <div className="w-11 h-11 rounded-full bg-[#262626] hover:bg-[#333] border border-white/10 flex items-center justify-center text-white transition active:scale-95 group-hover:border-white/30">
              <FiMessageSquare size={18} />
            </div>
            <span className="text-[10px] text-gray-300 font-medium">SMS</span>
          </button>
        </div>
      </div>
    </div>
  );
}
