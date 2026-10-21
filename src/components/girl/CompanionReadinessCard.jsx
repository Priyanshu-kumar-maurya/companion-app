import React, { useState } from "react";
import {
  FiCheckCircle,
  FiChevronDown,
  FiChevronUp,
  FiCamera,
  FiEdit3,
  FiCalendar,
  FiShield,
  FiZap,
} from "react-icons/fi";

export default function CompanionReadinessCard({
  user,
  onOpenSchedule,
  onOpenSettings,
  onTriggerDpUpload,
  onTriggerKycUpload,
}) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem("coffeely_readiness_collapsed") === "true";
    } catch (e) {
      return false;
    }
  });

  const hasPhoto = Boolean(user?.profile_pic && user.profile_pic.trim().length > 0);
  const hasBioAndPrice = Boolean(user?.bio && user.bio.trim().length >= 10 && (user?.price || 0) > 0);
  const hasSchedule = Boolean(
    user?.is_instant_available ||
    (Array.isArray(user?.available_days) && user.available_days.length > 0)
  );
  const hasKyc = Boolean(
    user?.kyc_status === "verified" || user?.kyc_status === "pending"
  );

  const checklist = [
    {
      id: "photo",
      title: "Add Profile Picture",
      desc: "Profiles with clear photos receive 4x more date invitations.",
      isDone: hasPhoto,
      actionText: "Upload Photo",
      actionIcon: FiCamera,
      onAction: onTriggerDpUpload,
    },
    {
      id: "bio_price",
      title: "Set Hourly Rate & Bio",
      desc: user?.price ? `₹${user.price}/hr set` : "Let clients know your rate and interests.",
      isDone: hasBioAndPrice,
      actionText: "Edit Bio & Rate",
      actionIcon: FiEdit3,
      onAction: onOpenSettings,
    },
    {
      id: "schedule",
      title: "Set Working Days & Slots",
      desc: "Specify your available days and time slots to prevent scheduling conflicts.",
      isDone: hasSchedule,
      actionText: "Set Schedule",
      actionIcon: FiCalendar,
      onAction: onOpenSchedule,
    },
    {
      id: "kyc",
      title: "Verify Identity (Govt ID)",
      desc: user?.kyc_status === "pending"
        ? "ID submitted — Under verification review"
        : user?.kyc_status === "verified"
          ? "Identity Verified — Trust badge unlocked!"
          : "Earn the Verified Badge to build trust with clients.",
      isDone: hasKyc,
      actionText: user?.kyc_status === "pending" ? "In Review" : "Verify ID",
      actionIcon: FiShield,
      onAction: user?.kyc_status === "pending" ? null : onTriggerKycUpload,
      disabled: user?.kyc_status === "pending",
    },
  ];

  const completedCount = checklist.filter((item) => item.isDone).length;
  const scorePercent = Math.round((completedCount / checklist.length) * 100);
  const isAllComplete = scorePercent === 100;

  const toggleCollapse = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    try {
      localStorage.setItem("coffeely_readiness_collapsed", String(next));
    } catch (e) {}
  };

  return (
    <div className="w-full mb-6 rounded-3xl bg-gradient-to-br from-[#16162A] via-[#151528] to-[#121222] border border-white/10 p-4 sm:p-5 shadow-xl transition-all">
      {/* Top Header Row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg ${
              isAllComplete
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : "bg-pink-500/20 text-pink-400 border border-pink-500/30"
            }`}
          >
            {isAllComplete ? "🏆" : "⚡"}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">
                {isAllComplete
                  ? "Profile 100% Ready for Bookings!"
                  : "Companion Readiness Checklist"}
              </h3>
              <span
                className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                  isAllComplete
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : "bg-pink-500/20 text-pink-300 border border-pink-500/30"
                }`}
              >
                {scorePercent}% Complete
              </span>
            </div>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {isAllComplete
                ? "Your companion profile is fully optimized and displayed at top priority to clients."
                : `${checklist.length - completedCount} action item${
                    checklist.length - completedCount > 1 ? "s" : ""
                  } remaining to unlock maximum date bookings.`}
            </p>
          </div>
        </div>

        {/* Expand / Collapse Button */}
        <button
          type="button"
          onClick={toggleCollapse}
          className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center transition active:scale-95 shrink-0"
          title={isCollapsed ? "Expand Checklist" : "Collapse Checklist"}
        >
          {isCollapsed ? <FiChevronDown size={16} /> : <FiChevronUp size={16} />}
        </button>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden mt-3.5 border border-white/5">
        <div
          className={`h-full transition-all duration-500 rounded-full ${
            isAllComplete
              ? "bg-gradient-to-r from-emerald-400 to-teal-400 shadow-[0_0_12px_rgba(52,211,153,0.5)]"
              : "bg-gradient-to-r from-[#f9ce3f] via-[#e1306c] to-[#833ab4]"
          }`}
          style={{ width: `${scorePercent}%` }}
        />
      </div>

      {/* Checklist Items (Collapsible) */}
      {!isCollapsed && (
        <div className="mt-4 pt-3 border-t border-white/5 divide-y divide-white/5">
          {checklist.map((item) => {
            const Icon = item.actionIcon;
            return (
              <div
                key={item.id}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 first:pt-1 last:pb-1"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0">
                    {item.isDone ? (
                      <FiCheckCircle className="text-emerald-400" size={18} />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-gray-500" />
                    )}
                  </div>
                  <div>
                    <div
                      className={`text-xs font-bold ${
                        item.isDone ? "text-gray-300 line-through opacity-75" : "text-white"
                      }`}
                    >
                      {item.title}
                    </div>
                    <div className="text-[11px] text-gray-400 mt-0.5">{item.desc}</div>
                  </div>
                </div>

                {!item.isDone && item.onAction && (
                  <button
                    type="button"
                    onClick={item.onAction}
                    disabled={item.disabled}
                    className="self-end sm:self-auto shrink-0 px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition border border-white/10 hover:border-pink-500/40 flex items-center gap-1.5 active:scale-95"
                  >
                    <Icon size={12} className="text-pink-400" />
                    <span>{item.actionText}</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
