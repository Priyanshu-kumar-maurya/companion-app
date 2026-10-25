import React, { useState } from "react";
import {
  FiCalendar,
  FiClock,
  FiMapPin,
  FiNavigation,
  FiMessageCircle,
  FiPhone,
  FiVideo,
  FiShield,
  FiCheckCircle,
  FiStar,
  FiFileText,
  FiChevronLeft,
  FiChevronRight,
  FiAlertCircle,
  FiExternalLink,
  FiAlertTriangle,
} from "react-icons/fi";
import VerifiedBadge from "./VerifiedBadge";

/**
 * Format relative date/time helper for Meetups
 */
function getMeetupTimingDetails(meetingDate, meetingTime, timeSlot) {
  if (!meetingDate) {
    return {
      label: "Date Scheduled",
      timeText: timeSlot || meetingTime || "Flexible",
      isToday: false,
      isPast: false,
      badgeText: "UPCOMING DATE",
      badgeColor: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    };
  }

  try {
    const targetDate = new Date(meetingDate);
    const today = new Date();
    
    // Zero out hours for date-only comparison
    const targetDateOnly = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const diffDays = Math.round((targetDateOnly - todayDateOnly) / (1000 * 60 * 60 * 24));

    const dateFormatted = targetDate.toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    const displayTime = timeSlot || meetingTime || "Time TBD";

    if (diffDays === 0) {
      return {
        label: "Today's Meetup",
        timeText: displayTime,
        dateFormatted,
        isToday: true,
        isPast: false,
        badgeText: "🔥 HAPPENING TODAY",
        badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/30 animate-pulse",
      };
    } else if (diffDays === 1) {
      return {
        label: "Tomorrow's Meetup",
        timeText: displayTime,
        dateFormatted,
        isToday: false,
        isPast: false,
        badgeText: "🗓️ TOMORROW",
        badgeColor: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
      };
    } else if (diffDays > 1) {
      return {
        label: `In ${diffDays} days`,
        timeText: displayTime,
        dateFormatted,
        isToday: false,
        isPast: false,
        badgeText: `🗓️ IN ${diffDays} DAYS`,
        badgeColor: "bg-purple-500/20 text-purple-300 border-purple-500/30",
      };
    } else {
      return {
        label: "Past Date",
        timeText: displayTime,
        dateFormatted,
        isToday: false,
        isPast: true,
        badgeText: "⚠️ READY TO COMPLETE",
        badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
      };
    }
  } catch (err) {
    return {
      label: "Scheduled Meetup",
      timeText: timeSlot || meetingTime || "Confirmed",
      isToday: false,
      isPast: false,
      badgeText: "UPCOMING DATE",
      badgeColor: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    };
  }
}

export default function ActiveMeetupCard({
  bookings = [],
  currentUser,
  onOpenChat,
  onComplete,
  onOpenInvoice,
  onOpenReview,
  onReschedule,
  onCancel,
}) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Filter for active or accepted bookings only
  const activeBookings = (bookings || []).filter(
    (b) => b && (b.status === "accepted" || b.status === "active")
  );

  if (activeBookings.length === 0) return null;

  // Bound index safely
  const safeIndex = Math.min(currentIndex, activeBookings.length - 1);
  const booking = activeBookings[safeIndex];
  if (!booking) return null;

  const isClient = currentUser?.id === booking.boy_id;
  const partner = isClient
    ? {
        id: booking.girl_id,
        name: booking.girl_name || "Companion",
        profile_pic: booking.girl_pic || "",
        role: "girl",
      }
    : {
        id: booking.boy_id,
        name: booking.boy_name || "Client",
        profile_pic: booking.boy_pic || "",
        role: "boy",
      };

  const timing = getMeetupTimingDetails(
    booking.meeting_date,
    booking.meeting_time,
    booking.time_slot
  );

  const mapsQuery = booking.meeting_location
    ? encodeURIComponent(booking.meeting_location)
    : "";

  const openGoogleMaps = () => {
    if (booking.meeting_location) {
      const url = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;
      window.open(url, "_blank", "noopener,noreferrer");
    } else {
      alert("No specific location was specified for this booking.");
    }
  };

  const handleStartVoiceCall = () => {
    if (!currentUser || !partner?.id) return;
    const roomId = [Number(currentUser.id), Number(partner.id)].sort((a, b) => a - b).join("_");

    window.dispatchEvent(
      new CustomEvent("rentgf_start_call", {
        detail: { targetUser: partner, type: "audio", room: roomId },
      })
    );
  };

  const handleStartVideoCall = () => {
    if (!currentUser || !partner?.id) return;
    const roomId = [Number(currentUser.id), Number(partner.id)].sort((a, b) => a - b).join("_");

    window.dispatchEvent(
      new CustomEvent("rentgf_start_call", {
        detail: { targetUser: partner, type: "video", room: roomId },
      })
    );
  };

  const handleTriggerSOS = () => {
    window.dispatchEvent(new CustomEvent("open-sos"));
  };

  const handleCompleteAndRate = async () => {
    const confirmMessage = isClient
      ? "Are you sure you want to mark this meetup as completed and release escrow funds to companion?"
      : "Are you sure you want to mark this date session as completed?";

    const proceed = window.showConfirm
      ? await window.showConfirm(confirmMessage)
      : window.confirm(confirmMessage);

    if (!proceed) return;

    if (onComplete) {
      await onComplete(booking.id, "completed");
    }

    // If client, prompt review modal directly
    if (isClient && onOpenReview) {
      setTimeout(() => {
        onOpenReview(booking);
      }, 300);
    }
  };

  return (
    <div className="relative mb-6 rounded-3xl overflow-hidden border border-pink-500/30 bg-gradient-to-br from-[#16162E] via-[#121226] to-[#1A112C] shadow-2xl p-5 sm:p-6 text-left animate-fade-in">
      {/* Background ambient decorative glow */}
      <div className="absolute -top-20 -right-20 w-56 h-56 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-56 h-56 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* ── Top Bar: Status Badge, Pagination Counter & Escrow Badge ── */}
      <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-white/10 flex-wrap">
        <div className="flex items-center gap-2">
          <span
            className={`px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider border ${timing.badgeColor} flex items-center gap-1.5`}
          >
            {timing.badgeText}
          </span>
          {activeBookings.length > 1 && (
            <span className="text-xs text-gray-400 font-semibold">
              ({safeIndex + 1} of {activeBookings.length})
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Escrow Protected Pill */}
          <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold flex items-center gap-1">
            <FiShield size={12} className="text-emerald-400 shrink-0" />
            <span>₹{booking.amount} Escrow Protected</span>
          </span>

          {/* Carousel Next / Prev if multiple bookings */}
          {activeBookings.length > 1 && (
            <div className="flex items-center gap-1">
              <button
                disabled={safeIndex === 0}
                onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center text-white transition"
              >
                <FiChevronLeft size={14} />
              </button>
              <button
                disabled={safeIndex === activeBookings.length - 1}
                onClick={() =>
                  setCurrentIndex((prev) => Math.min(activeBookings.length - 1, prev + 1))
                }
                className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center text-white transition"
              >
                <FiChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Partner Profile & Timing Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        {/* Partner Info */}
        <div className="flex items-center gap-3.5">
          <div className="relative">
            <img
              src={
                partner.profile_pic ||
                "https://cdn-icons-png.flaticon.com/512/3135/3135768.png"
              }
              alt={partner.name}
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover border-2 border-pink-500/40 shadow-lg"
            />
            <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-[#16162E] rounded-full" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-white leading-tight">
                {partner.name}
              </h3>
              <VerifiedBadge size="sm" />
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              {isClient ? "Your Confirmed Companion" : "Your Client Reservation"}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[11px] bg-white/5 text-gray-300 px-2 py-0.5 rounded-md border border-white/10 font-medium">
                {booking.hours} Hours Session
              </span>
              <span className="text-[11px] text-pink-400 font-bold">
                Booking #{booking.id}
              </span>
            </div>
          </div>
        </div>

        {/* Date & Time Slot Box */}
        <div className="bg-[#191936] border border-white/10 rounded-2xl p-3 sm:px-4 flex items-center justify-between sm:justify-start gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-pink-500/20 border border-pink-500/30 flex items-center justify-center text-pink-400 shrink-0">
              <FiCalendar size={18} />
            </div>
            <div>
              <div className="text-xs font-bold text-white">
                {timing.dateFormatted || "Scheduled Date"}
              </div>
              <div className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                <FiClock size={11} className="text-pink-400 shrink-0" />
                <span>{timing.timeText}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Venue & Navigation Section ── */}
      <div className="bg-black/30 border border-white/10 rounded-2xl p-3.5 sm:p-4 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <FiMapPin size={18} className="text-pink-400 shrink-0 mt-0.5" />
          <div>
            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Meetup Venue / Location
            </div>
            <div className="text-xs sm:text-sm font-semibold text-gray-100 mt-0.5 line-clamp-2">
              {booking.meeting_location || "Location to be coordinated in chat"}
            </div>
            {booking.meeting_details && (
              <div className="text-[11px] text-gray-400 italic mt-1 bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">
                "{booking.meeting_details}"
              </div>
            )}
          </div>
        </div>

        {/* 1-Tap Google Maps Button */}
        {booking.meeting_location && (
          <button
            onClick={openGoogleMaps}
            className="shrink-0 px-3.5 py-2 rounded-xl bg-gradient-to-r from-pink-500/20 to-purple-500/20 hover:from-pink-500/30 hover:to-purple-500/30 border border-pink-500/40 text-pink-300 hover:text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
            title="Open in Google Maps for turn-by-turn navigation"
          >
            <FiNavigation size={13} className="text-pink-400" />
            <span>Open in Maps</span>
            <FiExternalLink size={11} className="opacity-70" />
          </button>
        )}
      </div>

      {/* ── Action Toolbar: Chat, Calls, SOS, Invoice & Mark Done ── */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2">
        {/* Left Side: Communication Shortcuts */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Chat Button */}
          <button
            onClick={() => onOpenChat && onOpenChat(partner)}
            className="px-3 py-2 rounded-xl bg-[#202042] hover:bg-[#2A2A56] text-white text-xs font-bold border border-white/10 transition flex items-center gap-1.5 active:scale-95 shadow-sm"
          >
            <FiMessageCircle size={14} className="text-pink-400" />
            <span>Chat</span>
          </button>

          {/* Voice Call */}
          <button
            onClick={handleStartVoiceCall}
            className="w-9 h-9 rounded-xl bg-[#202042] hover:bg-[#2A2A56] text-gray-300 hover:text-emerald-400 border border-white/10 transition flex items-center justify-center active:scale-95 shadow-sm"
            title="Private Voice Call"
          >
            <FiPhone size={14} />
          </button>

          {/* Video Call */}
          <button
            onClick={handleStartVideoCall}
            className="w-9 h-9 rounded-xl bg-[#202042] hover:bg-[#2A2A56] text-gray-300 hover:text-purple-400 border border-white/10 transition flex items-center justify-center active:scale-95 shadow-sm"
            title="Private Video Call"
          >
            <FiVideo size={14} />
          </button>

          {/* Invoice / Receipt Modal */}
          {onOpenInvoice && (
            <button
              onClick={() => onOpenInvoice(booking)}
              className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold border border-white/10 transition flex items-center gap-1.5 active:scale-95"
              title="View Escrow Receipt / Tax Invoice"
            >
              <FiFileText size={13} className="text-pink-400" />
              <span className="hidden sm:inline">Receipt</span>
            </button>
          )}

          {/* SOS Emergency Trigger */}
          <button
            onClick={handleTriggerSOS}
            className="px-2.5 py-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 text-xs font-bold transition flex items-center gap-1 active:scale-95"
            title="Trigger Safety SOS"
          >
            <FiAlertTriangle size={13} className="text-red-400" />
            <span>SOS</span>
          </button>
        </div>

        {/* Right Side: Primary Completion & Review / Management Actions */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Reschedule option */}
          {onReschedule && booking.reschedule_status !== "pending" && (
            <button
              onClick={() => onReschedule(booking.id)}
              className="px-2.5 py-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl text-xs font-medium transition border border-white/5"
            >
              Reschedule
            </button>
          )}

          {/* Cancel option */}
          {onCancel && (
            <button
              onClick={() => onCancel(booking.id)}
              className="px-2.5 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl text-xs font-medium transition border border-red-500/20"
            >
              Cancel
            </button>
          )}

          {/* Complete & Rate Button */}
          <button
            onClick={handleCompleteAndRate}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-extrabold transition flex items-center gap-1.5 shadow-lg shadow-emerald-500/25 active:scale-95"
          >
            <FiCheckCircle size={14} />
            <span>{isClient ? "Complete & Rate ⭐" : "Mark Done ✅"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
