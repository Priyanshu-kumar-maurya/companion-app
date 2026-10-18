import React, { useState } from "react";
import {
  FiCalendar,
  FiClock,
  FiZap,
  FiCheck,
  FiX,
  FiShield,
  FiAlertCircle,
  FiSave,
} from "react-icons/fi";
import { triggerHaptic } from "../../utils/nativeMobile";

const DAYS_OF_WEEK = [
  { id: "monday", label: "Mon", full: "Monday" },
  { id: "tuesday", label: "Tue", full: "Tuesday" },
  { id: "wednesday", label: "Wed", full: "Wednesday" },
  { id: "thursday", label: "Thu", full: "Thursday" },
  { id: "friday", label: "Fri", full: "Friday" },
  { id: "saturday", label: "Sat", full: "Saturday" },
  { id: "sunday", label: "Sun", full: "Sunday" },
];

const AVAILABLE_SLOTS_DEF = [
  { id: "morning", label: "Morning", time: "10 AM - 12 PM", icon: "☕" },
  { id: "afternoon", label: "Afternoon", time: "1 PM - 3 PM", icon: "☀️" },
  { id: "evening", label: "Evening", time: "4 PM - 6 PM", icon: "🌅" },
  { id: "night", label: "Night", time: "7 PM - 9 PM", icon: "🌙" },
  { id: "late_night", label: "Late Night", time: "9 PM - 11 PM", icon: "✨" },
];

const STATUS_OPTIONS = [
  { id: "available", label: "Accepting Bookings", desc: "Open for dates", icon: "🟢" },
  { id: "busy", label: "Taking a Break / Busy", desc: "Hide from search", icon: "⏸️" },
  { id: "away", label: "On Vacation / Away", desc: "No bookings allowed", icon: "🏖️" },
];

const API_BASE = process.env.REACT_APP_API_URL || "https://rentgf-and-bf.onrender.com";
const API = `${API_BASE}/api`;

export default function ScheduleManagerModal({ isOpen, onClose, user, onSave }) {
  const [instantAvailable, setInstantAvailable] = useState(
    Boolean(user?.is_instant_available)
  );
  const [scheduleStatus, setScheduleStatus] = useState(
    user?.schedule_status || "available"
  );
  const [selectedDays, setSelectedDays] = useState(
    Array.isArray(user?.available_days) && user.available_days.length > 0
      ? user.available_days
      : ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
  );
  const [selectedSlots, setSelectedSlots] = useState(
    Array.isArray(user?.available_slots) && user.available_slots.length > 0
      ? user.available_slots
      : ["morning", "afternoon", "evening", "night", "late_night"]
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const toggleDay = (dayId) => {
    triggerHaptic("selection");
    setSelectedDays((prev) =>
      prev.includes(dayId) ? prev.filter((d) => d !== dayId) : [...prev, dayId]
    );
  };

  const toggleSlot = (slotId) => {
    triggerHaptic("selection");
    setSelectedSlots((prev) =>
      prev.includes(slotId) ? prev.filter((s) => s !== slotId) : [...prev, slotId]
    );
  };

  const selectAllDays = () => {
    triggerHaptic("selection");
    setSelectedDays(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]);
  };

  const selectWeekendsOnly = () => {
    triggerHaptic("selection");
    setSelectedDays(["saturday", "sunday"]);
  };

  const selectWeekdaysOnly = () => {
    triggerHaptic("selection");
    setSelectedDays(["monday", "tuesday", "wednesday", "thursday", "friday"]);
  };

  const handleSave = async () => {
    if (selectedDays.length === 0) {
      setError("Kripya kam se kam ek working day select karein");
      return;
    }
    if (selectedSlots.length === 0) {
      setError("Kripya kam se kam ek time slot select karein");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/users/${user.id}/schedule`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          is_instant_available: instantAvailable,
          schedule_status: scheduleStatus,
          available_days: selectedDays,
          available_slots: selectedSlots,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Schedule update failed");
      }

      triggerHaptic("success");
      setSavedSuccess(true);

      const updatedUser = {
        ...user,
        is_instant_available: instantAvailable,
        schedule_status: scheduleStatus,
        available_days: selectedDays,
        available_slots: selectedSlots,
      };

      if (typeof onSave === "function") {
        onSave(updatedUser);
      }

      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 1000);
    } catch (err) {
      console.error("Save schedule error:", err);
      setError(err.message || "Failed to save schedule.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-[#121212] border border-[#262626] rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl relative p-5 sm:p-7 text-white">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-pink-500/20 to-purple-600/20 border border-pink-500/30 flex items-center justify-center text-pink-400">
              <FiCalendar size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white">
                Availability & Work Schedule 📅
              </h2>
              <p className="text-[11px] text-gray-400">
                Choose your working days, hours, and instant booking readiness
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center transition"
          >
            <FiX size={18} />
          </button>
        </div>

        {/* Success Alert */}
        {savedSuccess && (
          <div className="my-4 p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs rounded-xl flex items-center gap-2">
            <FiCheck size={16} />
            <span>Aapka schedule save ho gaya hai! 🎉</span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="my-4 p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-xl flex items-center gap-2">
            <FiAlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-6 pt-5">
          {/* Section 1: Instant Available Today Switch */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-pink-500/10 to-purple-500/10 border border-amber-500/20 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <FiZap size={16} className="text-amber-400" />
                <span className="text-sm font-bold text-white">Available Today (Instant Meetup)</span>
              </div>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Turn ON if you are free for coffee/dates today right now
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                triggerHaptic("selection");
                setInstantAvailable(!instantAvailable);
              }}
              className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 shrink-0 ml-3 ${
                instantAvailable ? "bg-amber-500" : "bg-white/10"
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform duration-300 ${
                  instantAvailable ? "translate-x-6" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Section 2: Overall Booking Readiness Status */}
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2.5">
              General Booking Status:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    triggerHaptic("selection");
                    setScheduleStatus(opt.id);
                  }}
                  className={`p-3 rounded-xl border text-left transition flex flex-col gap-1 ${
                    scheduleStatus === opt.id
                      ? "bg-pink-500/15 border-pink-500 text-white shadow-md shadow-pink-500/10"
                      : "bg-white/[0.02] border-white/10 text-gray-400 hover:border-white/20"
                  }`}
                >
                  <span className="text-xs font-bold flex items-center gap-1.5">
                    <span>{opt.icon}</span>
                    <span>{opt.label}</span>
                  </span>
                  <span className="text-[10px] text-gray-500">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Section 3: Working Days Selector */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Working Days:
              </label>
              <div className="flex gap-1.5 text-[10px]">
                <button
                  type="button"
                  onClick={selectAllDays}
                  className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white"
                >
                  All Days
                </button>
                <button
                  type="button"
                  onClick={selectWeekdaysOnly}
                  className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white"
                >
                  Mon-Fri
                </button>
                <button
                  type="button"
                  onClick={selectWeekendsOnly}
                  className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white"
                >
                  Sat-Sun
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
              {DAYS_OF_WEEK.map((day) => {
                const isSelected = selectedDays.includes(day.id);
                return (
                  <button
                    key={day.id}
                    type="button"
                    onClick={() => toggleDay(day.id)}
                    className={`py-3 rounded-xl border text-center transition flex flex-col items-center justify-center gap-0.5 ${
                      isSelected
                        ? "bg-pink-500/20 border-pink-500 text-white font-bold"
                        : "bg-white/[0.02] border-white/10 text-gray-500 hover:border-white/20"
                    }`}
                  >
                    <span className="text-xs">{day.label}</span>
                    <span className="text-[9px] scale-90">
                      {isSelected ? "✓" : "—"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 4: Preferred Time Slots */}
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2.5">
              Accepted Meeting Time Slots:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {AVAILABLE_SLOTS_DEF.map((slot) => {
                const isSelected = selectedSlots.includes(slot.id);
                return (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => toggleSlot(slot.id)}
                    className={`p-3 rounded-xl border text-left transition flex items-center justify-between ${
                      isSelected
                        ? "bg-purple-500/15 border-purple-500 text-white shadow-sm"
                        : "bg-white/[0.02] border-white/10 text-gray-400 hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">{slot.icon}</span>
                      <div>
                        <div className="text-xs font-bold text-white">{slot.label}</div>
                        <div className="text-[10px] text-gray-500">{slot.time}</div>
                      </div>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center text-xs ${
                        isSelected
                          ? "bg-purple-500 text-white font-bold"
                          : "border border-white/10 text-transparent"
                      }`}
                    >
                      ✓
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-7 pt-4 border-t border-white/5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-3 bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 hover:opacity-95 text-white rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-pink-500/20 disabled:opacity-50"
          >
            {saving ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Saving Schedule...</span>
              </>
            ) : (
              <>
                <FiSave size={15} />
                <span>Save Availability & Schedule</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
