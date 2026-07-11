import React, { useState, useEffect } from "react";
import { FiHeart, FiMessageCircle, FiX, FiTrash2, FiSend, FiShield } from "react-icons/fi";
import { FaHeart } from "react-icons/fa";

function InstagramPostModal({ post: initialPost, postOwner, currentUser, onClose, onDelete }) {
    const [post, setPost] = useState(initialPost);
    const [comments, setComments] = useState([]);
    const [commentsLoading, setCommentsLoading] = useState(false);
    const [newCommentText, setNewCommentText] = useState("");
    const [likeLoading, setLikeLoading] = useState(false);

    const token = localStorage.getItem("token");

    // Fetch comments and fresh post details (likes) on mount
    useEffect(() => {
        if (!post?.id) return;

        const fetchPostDetails = async () => {
            try {
                const headers = {};
                if (token) headers["Authorization"] = `Bearer ${token}`;

                // Fetch likes count and like status
                const res = await fetch(`https://rentgf-and-bf.onrender.com/api/posts/detail/${post.id}`, { headers });
                if (res.ok) {
                    const data = await res.json();
                    setPost(data);
                }
            } catch (err) {
                console.error("Error fetching post details:", err);
            }
        };

        const fetchComments = async () => {
            setCommentsLoading(true);
            try {
                const res = await fetch(`https://rentgf-and-bf.onrender.com/api/comments/${post.id}`);
                if (res.ok) {
                    const data = await res.json();
                    setComments(data);
                }
            } catch (err) {
                console.error("Error fetching comments:", err);
            } finally {
                setCommentsLoading(false);
            }
        };

        fetchPostDetails();
        fetchComments();
    }, [post.id, token]);

    // Handle Like Toggle
    const handleLikeToggle = async () => {
        if (!currentUser) {
            alert("Please login to like this post!");
            return;
        }
        if (likeLoading) return;
        setLikeLoading(true);

        try {
            const res = await fetch("https://rentgf-and-bf.onrender.com/api/like", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ post_id: post.id })
            });

            if (res.ok) {
                const data = await res.json();
                setPost(prev => ({
                    ...prev,
                    is_liked_by_me: data.isLiked,
                    total_likes: data.isLiked 
                        ? Number(prev.total_likes || 0) + 1 
                        : Math.max(0, Number(prev.total_likes || 0) - 1)
                }));
            }
        } catch (err) {
            console.error("Error liking post:", err);
        } finally {
            setLikeLoading(false);
        }
    };

    // Handle Submit Comment
    const handleAddComment = async (e) => {
        e.preventDefault();
        if (!currentUser) {
            alert("Please login to write a comment!");
            return;
        }
        if (!newCommentText.trim()) return;

        try {
            const res = await fetch("https://rentgf-and-bf.onrender.com/api/comment", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ post_id: post.id, text: newCommentText })
            });

            if (res.ok) {
                const newComment = await res.json();
                // Append user name/profile info mock to locally render comment instantly
                const commentObj = {
                    ...newComment,
                    user_name: currentUser.name,
                    user_pic: currentUser.profile_pic
                };
                setComments(prev => [...prev, commentObj]);
                setNewCommentText("");
            } else {
                const err = await res.json();
                alert(err.error || "Inappropriate language found in comment. Please keep it clean.");
            }
        } catch (err) {
            console.error("Error posting comment:", err);
        }
    };

    // Handle Delete Post
    const handleDeleteClick = async () => {
        if (onDelete) {
            onDelete(post.id);
        }
    };

    const isOwner = currentUser?.id === postOwner?.id || currentUser?.id === post?.user_id;

    return (
        <div 
            className="fixed inset-0 z-[160] bg-black/90 backdrop-blur-md flex items-center justify-center p-0 md:p-6"
            onClick={onClose}
        >
            {/* Modal Body Container */}
            <div 
                className="bg-[#000000] md:bg-[#121224] border-0 md:border border-white/10 w-full h-full md:h-auto md:max-h-[90vh] max-w-5xl md:rounded-2xl overflow-hidden flex flex-col md:flex-row relative"
                onClick={(e) => e.stopPropagation()}
            >
                {/* 1. IMAGE COLUMN (Left on desktop, middle on mobile) */}
                <div className="flex-1 bg-black flex items-center justify-center relative min-h-[30vh] max-h-[50vh] md:max-h-none overflow-hidden aspect-square md:aspect-auto">
                    {/* Back Button for mobile top-left */}
                    <button 
                        onClick={onClose}
                        className="absolute top-4 left-4 z-10 w-8 h-8 rounded-full bg-black/60 text-white flex md:hidden items-center justify-center transition"
                    >
                        ✕
                    </button>
                    
                    <img 
                        src={post.image_url} 
                        alt="Instagram Post" 
                        className="w-full h-full object-contain"
                        onDoubleClick={handleLikeToggle}
                    />
                </div>

                {/* 2. DASHBOARD COLUMN (Right on desktop, below image on mobile) */}
                <div className="w-full md:w-[420px] shrink-0 flex flex-col bg-[#121224] border-t md:border-t-0 md:border-l border-white/5 flex-1 md:flex-initial">
                    
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/5 bg-[#16162A]">
                        <div className="flex items-center gap-3">
                            {postOwner?.profile_pic ? (
                                <img src={postOwner.profile_pic} alt="" className="w-8 h-8 rounded-full object-cover border border-white/10" />
                            ) : (
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white text-xs font-black shadow-inner">
                                    {postOwner?.name?.[0]?.toUpperCase()}
                                </div>
                            )}
                            <div>
                                <span className="font-bold text-white text-xs block truncate max-w-[150px]">
                                    {postOwner?.name || post.user_name}
                                </span>
                                <span className="text-[9px] text-gray-500 block">📍 {postOwner?.city || post.user_city || "Companion App"}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {/* Post delete capability */}
                            {isOwner && (
                                <button
                                    onClick={handleDeleteClick}
                                    className="w-8 h-8 rounded-full bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white flex items-center justify-center transition"
                                    title="Delete Post"
                                >
                                    <FiTrash2 size={13} />
                                </button>
                            )}
                            <button
                                onClick={onClose}
                                className="hidden md:flex w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white items-center justify-center transition"
                            >
                                <FiX size={15} />
                            </button>
                        </div>
                    </div>

                    {/* Scrollable Comments/Details list */}
                    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 custom-scrollbar min-h-[150px] md:min-h-0">
                        {/* Post Owner's Caption as the first comment */}
                        {post.caption && (
                            <div className="flex gap-3 items-start pb-3.5 border-b border-white/5">
                                {postOwner?.profile_pic ? (
                                    <img src={postOwner.profile_pic} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
                                ) : (
                                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white text-[10px] font-black shrink-0">
                                        {postOwner?.name?.[0]?.toUpperCase()}
                                    </div>
                                )}
                                <div className="text-xs text-gray-300 leading-relaxed">
                                    <span className="font-extrabold text-white mr-1.5">{postOwner?.name?.split(' ')[0]}</span>
                                    {post.caption}
                                </div>
                            </div>
                        )}

                        {/* Loading comments */}
                        {commentsLoading ? (
                            <div className="text-center py-6 text-xs text-gray-500 animate-pulse">Loading comments...</div>
                        ) : comments.length === 0 ? (
                            <div className="text-center py-8 text-xs text-gray-500">No comments yet. Be the first to reply!</div>
                        ) : (
                            comments.map((comment) => (
                                <div key={comment.id} className="flex gap-3 items-start text-xs text-gray-300">
                                    {comment.user_pic ? (
                                        <img src={comment.user_pic} alt="" className="w-7 h-7 rounded-full object-cover shrink-0 border border-white/5" />
                                    ) : (
                                        <div className="w-7 h-7 rounded-full bg-[#16162A] border border-white/10 flex items-center justify-center text-white text-[9px] font-black shrink-0">
                                            {comment.user_name?.[0]?.toUpperCase()}
                                        </div>
                                    )}
                                    <div className="flex-1 leading-relaxed">
                                        <span className="font-bold text-white mr-1.5">{comment.user_name?.split(' ')[0]}</span>
                                        {comment.text}
                                        <span className="block text-[8px] text-gray-500 mt-1">
                                            {new Date(comment.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Bottom panel (Likes actions, comments counter, comments input form) */}
                    <div className="p-4 border-t border-white/5 bg-[#16162A]/60">
                        {/* Action Buttons Row */}
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex gap-4">
                                <button 
                                    onClick={handleLikeToggle}
                                    className={`focus:scale-125 transition ${post.is_liked_by_me ? 'text-red-500' : 'text-white hover:text-gray-400'}`}
                                >
                                    {post.is_liked_by_me ? (
                                        <FaHeart size={20} className="fill-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.3)]" />
                                    ) : (
                                        <FiHeart size={20} />
                                    )}
                                </button>
                                <button className="text-white hover:text-gray-400">
                                    <FiMessageCircle size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Likes counter text */}
                        <div className="text-xs font-extrabold text-white mb-1.5">
                            {post.total_likes || 0} {(post.total_likes === 1) ? 'like' : 'likes'}
                        </div>

                        {/* Form to submit comments */}
                        <form onSubmit={handleAddComment} className="flex gap-2 items-center mt-3">
                            <input 
                                type="text"
                                value={newCommentText}
                                onChange={(e) => setNewCommentText(e.target.value)}
                                placeholder="Add a comment..."
                                className="flex-1 bg-[#0D0D1A] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-pink-500 transition placeholder-gray-600"
                            />
                            <button 
                                type="submit" 
                                disabled={!newCommentText.trim()}
                                className="w-8 h-8 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white flex items-center justify-center transition disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                            >
                                <FiSend size={12} />
                            </button>
                        </form>
                    </div>

                </div>
            </div>
        </div>
    );
}

export default InstagramPostModal;
