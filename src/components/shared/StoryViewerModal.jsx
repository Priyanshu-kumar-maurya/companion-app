import React, { useState, useEffect, useRef } from "react";
import { FiX, FiTrash2, FiChevronLeft, FiChevronRight } from "react-icons/fi";

function StoryViewerModal({ userStoriesList, initialUserIndex = 0, currentUser, onClose, onStoryDeleted }) {
    const [currentUserIndex, setCurrentUserIndex] = useState(initialUserIndex);
    const [currentItemIndex, setCurrentItemIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [progress, setProgress] = useState(0);
    const timerRef = useRef(null);

    const currentUserStoryGroup = userStoriesList[currentUserIndex];
    const currentStoryItem = currentUserStoryGroup?.items[currentItemIndex];

    const DURATION = 5000; // 5 seconds per story

    // Reset progress when item changes
    useEffect(() => {
        setProgress(0);
    }, [currentUserIndex, currentItemIndex]);

    // Story timer & progress
    useEffect(() => {
        if (isPaused) return;

        const intervalTime = 50; // update every 50ms
        const step = (intervalTime / DURATION) * 100;

        timerRef.current = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 100) {
                    handleNext();
                    return 0;
                }
                return prev + step;
            });
        }, intervalTime);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isPaused, currentUserIndex, currentItemIndex, currentUserStoryGroup]);

    const handleNext = () => {
        if (!currentUserStoryGroup) return;
        if (currentItemIndex < currentUserStoryGroup.items.length - 1) {
            setCurrentItemIndex((prev) => prev + 1);
        } else if (currentUserIndex < userStoriesList.length - 1) {
            setCurrentUserIndex((prev) => prev + 1);
            setCurrentItemIndex(0);
        } else {
            onClose();
        }
    };

    const handlePrev = () => {
        if (currentItemIndex > 0) {
            setCurrentItemIndex((prev) => prev - 1);
        } else if (currentUserIndex > 0) {
            setCurrentUserIndex((prev) => prev - 1);
            const prevGroup = userStoriesList[currentUserIndex - 1];
            setCurrentItemIndex(prevGroup.items.length - 1);
        }
    };

    const handleDelete = async () => {
        if (!currentStoryItem) return;
        if (!window.confirm("Are you sure you want to delete this story?")) return;

        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`https://rentgf-and-bf.onrender.com/api/stories/${currentStoryItem.id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.ok) {
                if (onStoryDeleted) onStoryDeleted(currentStoryItem.id);
                handleNext();
            }
        } catch (e) {
            console.error("Failed to delete story:", e);
        }
    };

    if (!currentUserStoryGroup || !currentStoryItem) return null;

    const timeAgo = (() => {
        const diff = Date.now() - new Date(currentStoryItem.created_at).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        return `${hrs}h ago`;
    })();

    return (
        <div className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-2xl flex items-center justify-center select-none animate-fade-in">
            {/* Desktop Navigation Arrows */}
            {currentUserIndex > 0 || currentItemIndex > 0 ? (
                <button
                    onClick={handlePrev}
                    className="hidden sm:flex absolute left-8 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white items-center justify-center transition z-50 shadow-2xl"
                >
                    <FiChevronLeft size={24} />
                </button>
            ) : null}

            {currentUserIndex < userStoriesList.length - 1 || currentItemIndex < currentUserStoryGroup.items.length - 1 ? (
                <button
                    onClick={handleNext}
                    className="hidden sm:flex absolute right-8 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white items-center justify-center transition z-50 shadow-2xl"
                >
                    <FiChevronRight size={24} />
                </button>
            ) : null}

            {/* Main Story Container */}
            <div
                className="relative w-full h-full sm:max-w-md sm:h-[90vh] sm:rounded-3xl overflow-hidden bg-[#121224] border border-white/10 flex flex-col justify-between shadow-2xl"
                onMouseDown={() => setIsPaused(true)}
                onMouseUp={() => setIsPaused(false)}
                onTouchStart={() => setIsPaused(true)}
                onTouchEnd={() => setIsPaused(false)}
            >
                {/* Top Segmented Progress Bars */}
                <div className="absolute top-3 left-3 right-3 z-30 flex gap-1.5">
                    {currentUserStoryGroup.items.map((item, idx) => (
                        <div key={item.id} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-white transition-all duration-75"
                                style={{
                                    width:
                                        idx < currentItemIndex
                                            ? "100%"
                                            : idx === currentItemIndex
                                            ? `${progress}%`
                                            : "0%"
                                }}
                            />
                        </div>
                    ))}
                </div>

                {/* Top User Bar */}
                <div className="absolute top-6 left-4 right-4 z-30 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <img
                            src={currentUserStoryGroup.user_pic || "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"}
                            alt={currentUserStoryGroup.user_name}
                            className="w-10 h-10 rounded-full object-cover border-2 border-pink-500 shadow-md"
                        />
                        <div>
                            <div className="text-white font-bold text-sm leading-tight flex items-center gap-1.5">
                                <span>{currentUserStoryGroup.user_name}</span>
                                <span className="text-[10px] text-gray-400 font-normal">· {timeAgo}</span>
                            </div>
                            <div className="text-[10px] text-gray-400">
                                @{currentUserStoryGroup.user_username || "companion"}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {currentUser?.id === currentUserStoryGroup.user_id && (
                            <button
                                onClick={handleDelete}
                                className="w-8 h-8 rounded-full bg-black/40 hover:bg-red-500/80 text-white flex items-center justify-center transition"
                            >
                                <FiTrash2 size={14} />
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-full bg-black/40 hover:bg-white/20 text-white flex items-center justify-center transition"
                        >
                            <FiX size={18} />
                        </button>
                    </div>
                </div>

                {/* Story Image / Video View */}
                <div className="relative w-full h-full flex items-center justify-center bg-black">
                    <img
                        src={currentStoryItem.media_url}
                        alt="Story content"
                        className="w-full h-full object-cover"
                    />

                    {/* Tap Areas for Previous / Next on Mobile */}
                    <div
                        className="absolute inset-y-0 left-0 w-1/3 z-20 cursor-pointer"
                        onClick={(e) => {
                            e.stopPropagation();
                            handlePrev();
                        }}
                    />
                    <div
                        className="absolute inset-y-0 right-0 w-2/3 z-20 cursor-pointer"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleNext();
                        }}
                    />
                </div>

                {/* Bottom Caption Overlay */}
                {currentStoryItem.caption && (
                    <div className="absolute bottom-0 inset-x-0 p-6 pt-12 bg-gradient-to-t from-black via-black/80 to-transparent z-30">
                        <p className="text-white text-sm leading-relaxed text-center font-medium drop-shadow-md">
                            {currentStoryItem.caption}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default StoryViewerModal;
