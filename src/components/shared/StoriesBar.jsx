import React, { useState, useEffect } from "react";
import { FiPlus } from "react-icons/fi";
import StoryViewerModal from "./StoryViewerModal";
import AddStoryModal from "./AddStoryModal";

function StoriesBar({ currentUser }) {
    const [stories, setStories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewingUserIndex, setViewingUserIndex] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);

    const fetchStories = async () => {
        try {
            const res = await fetch("https://rentgf-and-bf.onrender.com/api/stories");
            if (res.ok) {
                const data = await res.json();
                setStories(data);
            }
        } catch (err) {
            console.error("Stories fetch error:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStories();
    }, []);

    const userHasStory = currentUser && stories.some(s => s.user_id === currentUser.id);

    return (
        <div className="w-full mb-6 select-none">
            <div className="flex gap-4 overflow-x-auto py-2 px-1 scrollbar-none" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
                {/* Current User Story Circle / Add Button */}
                <div className="flex flex-col items-center gap-1.5 shrink-0">
                    <div className="relative cursor-pointer group" onClick={() => setShowAddModal(true)}>
                        <div className={`w-16 h-16 rounded-full p-[2.5px] transition-transform duration-300 group-hover:scale-105 ${
                            userHasStory 
                                ? "bg-gradient-to-tr from-pink-500 via-purple-500 to-amber-400 shadow-md shadow-pink-500/20" 
                                : "bg-white/10 border border-white/5"
                        }`}>
                            <img
                                src={currentUser?.profile_pic || "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"}
                                alt="Your profile"
                                className="w-full h-full rounded-full object-cover border-2 border-[#0D0D1A]"
                            />
                        </div>
                        <div className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 text-white flex items-center justify-center border-2 border-[#0D0D1A] shadow-md">
                            <FiPlus size={12} />
                        </div>
                    </div>
                    <span className="text-[11px] font-medium text-gray-300 truncate max-w-[64px]">
                        Your Story
                    </span>
                </div>

                {/* Companion Active Stories List */}
                {stories.map((storyGroup, idx) => {
                    const isSelf = currentUser && storyGroup.user_id === currentUser.id;
                    if (isSelf) return null; // Already shown in first avatar

                    return (
                        <div
                            key={storyGroup.user_id}
                            className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer group"
                            onClick={() => setViewingUserIndex(idx)}
                        >
                            <div className="w-16 h-16 rounded-full p-[2.5px] bg-gradient-to-tr from-pink-500 via-purple-500 to-amber-400 shadow-md shadow-pink-500/20 transition-transform duration-300 group-hover:scale-105">
                                <img
                                    src={storyGroup.user_pic || "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"}
                                    alt={storyGroup.user_name}
                                    className="w-full h-full rounded-full object-cover border-2 border-[#0D0D1A]"
                                />
                            </div>
                            <span className="text-[11px] font-medium text-gray-300 truncate max-w-[64px] text-center">
                                {storyGroup.user_name.split(" ")[0]}
                            </span>
                        </div>
                    );
                })}

                {/* Loading Placeholders */}
                {loading && stories.length === 0 && (
                    [1, 2, 3, 4].map((n) => (
                        <div key={n} className="flex flex-col items-center gap-1.5 shrink-0 animate-pulse">
                            <div className="w-16 h-16 rounded-full bg-white/5 border border-white/5" />
                            <div className="w-10 h-2.5 bg-white/5 rounded-full" />
                        </div>
                    ))
                )}
            </div>

            {/* Story Viewer Modal */}
            {viewingUserIndex !== null && (
                <StoryViewerModal
                    userStoriesList={stories}
                    initialUserIndex={viewingUserIndex}
                    currentUser={currentUser}
                    onClose={() => setViewingUserIndex(null)}
                    onStoryDeleted={() => {
                        fetchStories();
                        setViewingUserIndex(null);
                    }}
                />
            )}

            {/* Add Story Modal */}
            {showAddModal && (
                <AddStoryModal
                    currentUser={currentUser}
                    onClose={() => setShowAddModal(false)}
                    onStoryCreated={fetchStories}
                />
            )}
        </div>
    );
}

export default StoriesBar;
