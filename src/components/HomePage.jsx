import React, { useState, useEffect } from "react";
import { PAGES } from "../App";
import Footer from "./Footer";
import { AiFillHeart, AiOutlineHeart } from "react-icons/ai";
import { FaRegComment, FaInbox } from "react-icons/fa";
import { RiShareForwardLine, RiLoader4Line } from "react-icons/ri";
import { BsBookmarkFill, BsBookmark } from "react-icons/bs";
import { FiWifi, FiBattery, FiMic, FiMicOff, FiPhoneOff, FiVideoOff, FiShield, FiCheckCircle, FiStar, FiClock } from "react-icons/fi";

function HomePage({ setPage, currentUser, setSelectedGirl }) {
    const [feed, setFeed] = useState([]);
    const [stats, setStats] = useState({ total: 0, girls: 0, boys: 0, connections: 0 });
    const [loading, setLoading] = useState(true);
    const [followingState, setFollowingState] = useState({});
    const [commentModal, setCommentModal] = useState({ isOpen: false, postId: null, comments: [] });
    const [newComment, setNewComment] = useState("");
    const [loadingComments, setLoadingComments] = useState(false);
    const [savedPosts, setSavedPosts] = useState([]);

    const isLoggedIn = !!localStorage.getItem("token") || !!currentUser;
    const [activeSlide, setActiveSlide] = useState(0);

    useEffect(() => {
        if (!isLoggedIn) {
            const interval = setInterval(() => {
                setActiveSlide((prev) => (prev + 1) % 3);
            }, 3000);
            return () => clearInterval(interval);
        }
    }, [isLoggedIn]);

    useEffect(() => {
        if (isLoggedIn && currentUser) {
            const cachedFeed = sessionStorage.getItem("homeFeedCache");
            const cachedFollowing = sessionStorage.getItem("followingStateCache");

            if (cachedFeed && cachedFollowing) {
                setFeed(JSON.parse(cachedFeed));
                setFollowingState(JSON.parse(cachedFollowing));
                setLoading(false);
            } else {
                setLoading(true);
            }
        } else {
            const cachedStats = sessionStorage.getItem("homeStatsCache");
            if (cachedStats) {
                setStats(JSON.parse(cachedStats));
                setLoading(false);
            } else {
                setLoading(true);
            }
        }

        const fetchData = async () => {
            try {
                if (isLoggedIn && currentUser) {
                    const response = await fetch(`https://rentgf-and-bf.onrender.com/api/feed?currentUserId=${currentUser.id}`);
                    if (response.ok) {
                        const data = await response.json();
                        setFeed(data);
                        sessionStorage.setItem("homeFeedCache", JSON.stringify(data));

                        const followData = {};
                        data.forEach(post => {
                            followData[post.user_id] = post.is_followed_by_me;
                        });
                        setFollowingState(followData);
                        sessionStorage.setItem("followingStateCache", JSON.stringify(followData));
                    }

                    // Fetch saved post IDs
                    const token = localStorage.getItem("token");
                    const savedRes = await fetch("https://rentgf-and-bf.onrender.com/api/posts/saved", {
                        headers: { "Authorization": `Bearer ${token}` }
                    });
                    if (savedRes.ok) {
                        const savedData = await savedRes.json();
                        setSavedPosts(savedData.map(p => p.id));
                    }
                } else {
                    const girlRes = await fetch("https://rentgf-and-bf.onrender.com/api/users?role=girl");
                    const boyRes = await fetch("https://rentgf-and-bf.onrender.com/api/users?role=boy");

                    let girlCount = 0;
                    let boyCount = 0;

                    if (girlRes.ok) girlCount = (await girlRes.json()).length;
                    if (boyRes.ok) boyCount = (await boyRes.json()).length;

                    const newStats = {
                        girls: girlCount,
                        boys: boyCount,
                        total: girlCount + boyCount,
                        connections: (girlCount + boyCount) * 15 + 120
                    };

                    setStats(newStats);
                    sessionStorage.setItem("homeStatsCache", JSON.stringify(newStats));
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [isLoggedIn, currentUser]);

    const handleLike = async (postId, isLikedByMe) => {
        if (!currentUser) return;

        setFeed(prevFeed => prevFeed.map(post => {
            if (post.id === postId) {
                return {
                    ...post,
                    is_liked_by_me: !isLikedByMe,
                    total_likes: isLikedByMe ? parseInt(post.total_likes) - 1 : parseInt(post.total_likes) + 1
                };
            }
            return post;
        }));

        try {
            const token = localStorage.getItem("token");
            await fetch("https://rentgf-and-bf.onrender.com/api/like", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ post_id: postId })
            });
        } catch (err) {
            console.error(err);
        }
    };

    const handleDoubleTap = (e, postId, isLikedByMe) => {
        if (!isLikedByMe) {
            handleLike(postId, isLikedByMe);
        }
    };

    const handleFollowToggle = async (targetUserId) => {
        if (!currentUser) return;

        const isCurrentlyFollowing = followingState[targetUserId];
        const endpoint = isCurrentlyFollowing ? "/api/unfollow" : "/api/follow";

        setFollowingState(prev => ({
            ...prev,
            [targetUserId]: !isCurrentlyFollowing
        }));

        try {
            const token = localStorage.getItem("token");
            await fetch(`https://rentgf-and-bf.onrender.com${endpoint}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    follower_id: currentUser.id,
                    following_id: targetUserId
                })
            });
        } catch (err) {
            setFollowingState(prev => ({
                ...prev,
                [targetUserId]: isCurrentlyFollowing
            }));
            console.error(err);
        }
    };

    const openComments = async (postId) => {
        setCommentModal({ isOpen: true, postId, comments: [] });
        setLoadingComments(true);
        try {
            const res = await fetch(`https://rentgf-and-bf.onrender.com/api/comments/${postId}`);
            if (res.ok) {
                const data = await res.json();
                setCommentModal({ isOpen: true, postId, comments: data });
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingComments(false);
        }
    };

    const submitComment = async () => {
        if (!newComment.trim() || !currentUser || !commentModal.postId) return;

        const commentData = {
            post_id: commentModal.postId,
            text: newComment
        };

        try {
            const token = localStorage.getItem("token");
            const res = await fetch("https://rentgf-and-bf.onrender.com/api/comment", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(commentData)
            });

            if (res.ok) {
                const savedComment = await res.json();
                setCommentModal(prev => ({
                    ...prev,
                    comments: [...prev.comments, { ...savedComment, user_name: currentUser.name, user_pic: currentUser.profile_pic }]
                }));
                setNewComment("");

                setFeed(prevFeed => prevFeed.map(post =>
                    post.id === commentModal.postId
                        ? { ...post, total_comments: parseInt(post.total_comments) + 1 }
                        : post
                ));
            }
        } catch (err) {
            console.error(err);
        }
    };

    const toggleSave = async (postId) => {
        const isSaved = savedPosts.includes(postId);
        if (isSaved) {
            setSavedPosts(savedPosts.filter(id => id !== postId));
        } else {
            setSavedPosts([...savedPosts, postId]);
        }

        try {
            const token = localStorage.getItem("token");
            await fetch("https://rentgf-and-bf.onrender.com/api/posts/save", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ post_id: postId })
            });
        } catch (err) {
            console.error("Save toggle error:", err);
            if (isSaved) {
                setSavedPosts(prev => [...prev, postId]);
            } else {
                setSavedPosts(prev => prev.filter(id => id !== postId));
            }
        }
    };

    const handleShare = async (postId) => {
        const shareUrl = `${window.location.origin}/#post_${postId}`;
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Check out this post on RentGF',
                    url: shareUrl
                });
            } catch (err) {
                console.error(err);
            }
        } else {
            navigator.clipboard.writeText(shareUrl);
            alert("Link copied to clipboard!");
        }
    };

    const handleProfileClick = (post) => {
        if (post.user_id === currentUser?.id) {
            setPage(currentUser.role === 'girl' ? PAGES.GIRL_DASHBOARD : PAGES.BOY_DASHBOARD);
        } else {
            if (typeof setSelectedGirl === 'function') {
                setSelectedGirl({
                    id: post.user_id,
                    name: post.user_name,
                    profile_pic: post.user_pic,
                    role: post.user_role
                });
            }
            setPage(PAGES.DETAILS);
        }
    };

    const formatTime = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 60) return `${diffMins}m`;
        if (diffHours < 24) return `${diffHours}h`;
        return `${diffDays}d`;
    };

    if (isLoggedIn) {
        return (
            <div className="min-h-[100dvh] bg-[#0D0D1A] pt-20 pb-20 flex justify-center">
                <div className="w-full max-w-lg flex flex-col gap-6 px-4">
                    {loading ? (
                        <div className="flex justify-center items-center h-64">
                            <RiLoader4Line className="text-pink-500 text-5xl animate-spin" />
                        </div>
                    ) : feed.length === 0 ? (
                        <div className="text-center py-20 bg-[#16162A] rounded-2xl border border-white/5">
                            <FaInbox className="text-5xl text-gray-500 mx-auto mb-4" />
                            <h3 className="text-xl font-bold text-white mb-2">No Posts Yet</h3>
                            <p className="text-gray-400">Be the first to share a moment!</p>
                        </div>
                    ) : (
                        feed.map(post => (
                            <div key={post.id} className="bg-[#16162A] border border-white/10 rounded-2xl overflow-hidden shadow-lg">
                                <div className="flex items-center justify-between p-3 border-b border-white/5">
                                    <div
                                        className="flex items-center gap-3 cursor-pointer group"
                                        onClick={() => handleProfileClick(post)}
                                    >
                                        <img
                                            src={post.user_pic || "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"}
                                            alt={post.user_name}
                                            className="w-10 h-10 rounded-full object-cover border border-white/20 group-hover:border-pink-500 transition"
                                        />
                                        <div>
                                            <div className="flex items-center gap-1">
                                                <span className="font-bold text-sm text-white group-hover:text-pink-400 transition">{post.user_name}</span>
                                                <span className="text-gray-500 text-xs">• {formatTime(post.created_at)}</span>
                                            </div>
                                            <span className="text-[10px] text-gray-400 uppercase tracking-widest">{post.user_role}</span>
                                        </div>
                                    </div>

                                    {post.user_id !== currentUser?.id && (
                                        <button
                                            onClick={() => handleFollowToggle(post.user_id)}
                                            className={`px-4 py-1.5 text-xs font-bold rounded-full transition ${followingState[post.user_id] ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-pink-500 text-white hover:bg-pink-600'}`}
                                        >
                                            {followingState[post.user_id] ? "Following" : "Follow"}
                                        </button>
                                    )}
                                </div>

                                <div
                                    className="relative w-full bg-black aspect-square cursor-pointer flex items-center justify-center"
                                    onDoubleClick={(e) => handleDoubleTap(e, post.id, post.is_liked_by_me)}
                                >
                                    <img src={post.image_url} alt="Post" className="w-full h-full object-contain" />
                                </div>

                                <div className="p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-4">
                                            <button
                                                onClick={() => handleLike(post.id, post.is_liked_by_me)}
                                                className="text-2xl hover:scale-110 transition active:scale-90"
                                            >
                                                {post.is_liked_by_me
                                                    ? <AiFillHeart className="text-pink-500 text-2xl" />
                                                    : <AiOutlineHeart className="text-white text-2xl" />
                                                }
                                            </button>
                                            {!post.disable_comments && (
                                                <button onClick={() => openComments(post.id)} className="hover:scale-110 transition active:scale-90 opacity-90">
                                                    <FaRegComment className="text-white text-2xl" />
                                                </button>
                                            )}
                                            <button onClick={() => handleShare(post.id)} className="hover:scale-110 transition active:scale-90 opacity-90">
                                                <RiShareForwardLine className="text-white text-2xl" />
                                            </button>
                                        </div>
                                        <button onClick={() => toggleSave(post.id)} className="hover:scale-110 transition active:scale-90 opacity-90">
                                            {savedPosts.includes(post.id)
                                                ? <BsBookmarkFill className="text-pink-400 text-xl" />
                                                : <BsBookmark className="text-white text-xl" />
                                            }
                                        </button>
                                    </div>

                                    {!post.hide_likes && (
                                        <div className="font-bold text-sm text-white mb-1">
                                            {post.total_likes} likes
                                        </div>
                                    )}

                                    <div className="text-sm text-gray-200">
                                        <span className="font-bold mr-2 cursor-pointer hover:text-pink-400" onClick={() => handleProfileClick(post)}>
                                            {post.user_name}
                                        </span>
                                        {post.caption}
                                    </div>

                                    {!post.disable_comments && parseInt(post.total_comments) > 0 && (
                                        <div
                                            onClick={() => openComments(post.id)}
                                            className="text-gray-500 text-sm mt-2 cursor-pointer hover:text-gray-400"
                                        >
                                            View all {post.total_comments} comments
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {commentModal.isOpen && (
                    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4">
                        <div className="bg-[#16162A] w-full max-w-lg h-[70vh] sm:h-[80vh] sm:rounded-2xl rounded-t-3xl border border-white/10 flex flex-col animate-slide-up sm:animate-none">
                            <div className="flex justify-between items-center p-4 border-b border-white/10">
                                <h3 className="font-bold text-white text-lg w-full text-center">Comments</h3>
                                <button onClick={() => setCommentModal({ isOpen: false, postId: null, comments: [] })} className="text-gray-400 hover:text-white absolute right-4 text-2xl">✕</button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                                {loadingComments ? (
                                    <div className="flex justify-center items-center my-10">
                                        <RiLoader4Line className="text-pink-500 text-3xl animate-spin" />
                                    </div>
                                ) : commentModal.comments.length === 0 ? (
                                    <div className="text-center text-gray-500 my-10">No comments yet. Be the first!</div>
                                ) : (
                                    commentModal.comments.map(c => (
                                        <div key={c.id} className="flex gap-3">
                                            <img src={c.user_pic || "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"} className="w-8 h-8 rounded-full object-cover" alt="" />
                                            <div>
                                                <span className="font-bold text-sm text-white mr-2">{c.user_name}</span>
                                                <span className="text-sm text-gray-200">{c.text}</span>
                                                <div className="text-[10px] text-gray-500 mt-0.5">{formatTime(c.created_at)}</div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className="p-4 border-t border-white/10 bg-[#0D0D1A] flex gap-3 pb-8 sm:pb-4">
                                <img src={currentUser.profile_pic || "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"} className="w-10 h-10 rounded-full object-cover" alt="" />
                                <div className="flex-1 relative">
                                    <input
                                        type="text"
                                        placeholder="Add a comment..."
                                        value={newComment}
                                        onChange={(e) => setNewComment(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && submitComment()}
                                        className="w-full bg-transparent border border-white/20 rounded-full pl-4 pr-12 py-2.5 text-sm text-white outline-none focus:border-pink-500"
                                    />
                                    <button
                                        onClick={submitComment}
                                        disabled={!newComment.trim()}
                                        className={`absolute right-3 top-1/2 -translate-y-1/2 font-bold text-sm ${newComment.trim() ? 'text-pink-500' : 'text-gray-600'}`}
                                    >
                                        Post
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    const featuredCompanions = [
        {
            id: 101,
            name: "Ananya Sharma",
            age: 21,
            city: "Mumbai",
            rating: 4.9,
            reviewsCount: 42,
            profile_pic: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=250&auto=format&fit=crop&q=80",
            tags: ["Coffee Date", "Movies", "Concerts"],
            role: "girl"
        },
        {
            id: 102,
            name: "Rohan Malhotra",
            age: 23,
            city: "Delhi",
            rating: 4.8,
            reviewsCount: 31,
            profile_pic: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=250&auto=format&fit=crop&q=80",
            tags: ["Cafe Hangout", "Concerts", "Events"],
            role: "boy"
        },
        {
            id: 103,
            name: "Priya Patel",
            age: 22,
            city: "Bangalore",
            rating: 4.9,
            reviewsCount: 56,
            profile_pic: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=250&auto=format&fit=crop&q=80",
            tags: ["Fine Dining", "Sightseeing", "Comedy Show"],
            role: "girl"
        },
        {
            id: 104,
            name: "Sneha Reddy",
            age: 24,
            city: "Hyderabad",
            rating: 4.7,
            reviewsCount: 28,
            profile_pic: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=250&auto=format&fit=crop&q=80",
            tags: ["Long Drives", "Street Food", "Live Music"],
            role: "girl"
        }
    ];

    return (
        <div className="min-h-[100dvh] bg-[#0D0D1A] pt-24 pb-10">
            {/* Main Hero Container */}
            <div className="max-w-5xl mx-auto px-6 mt-6 md:mt-12 mb-16 relative">
                {/* Ambient lights */}
                <div className="absolute top-[-10%] left-[-10%] w-[350px] h-[350px] bg-pink-600/10 rounded-full blur-[100px] pointer-events-none"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[350px] h-[350px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none"></div>
 
                {/* Two Column Layout: Left (Phone Mockup) | Right (Login/Signup Box) */}
                <div className="flex flex-col lg:flex-row items-center justify-center gap-12 lg:gap-20 relative z-10 w-full">
                    
                    {/* LEFT COLUMN: Phone Mockup */}
                    <div className="shrink-0 scale-90 sm:scale-100 flex justify-center order-2 lg:order-1">
                        <div className="relative w-[280px] h-[550px] bg-black rounded-[45px] p-[10px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] border-[6px] border-[#22223b] overflow-hidden">
                            {/* Notch */}
                            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-28 h-4 bg-black rounded-full z-30 flex items-center justify-center">
                                <div className="w-10 h-1 bg-gray-800 rounded-full"></div>
                                <div className="w-2 h-2 bg-gray-900 rounded-full ml-2 border border-gray-700"></div>
                            </div>
                            
                            {/* Side Buttons for Phone Mockup */}
                            <div className="absolute left-0 top-24 w-[3px] h-10 bg-gray-800 rounded-r-md"></div>
                            <div className="absolute left-0 top-38 w-[3px] h-14 bg-gray-800 rounded-r-md"></div>
                            <div className="absolute right-0 top-32 w-[3px] h-16 bg-gray-800 rounded-l-md"></div>
 
                            {/* Inner Screen */}
                            <div className="relative w-full h-full rounded-[38px] overflow-hidden bg-[#0D0D1A]">
                                {/* Slide 0: Discover Profiles */}
                                <div className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${activeSlide === 0 ? "opacity-100 z-10" : "opacity-0 z-0"}`}>
                                    <div className="h-full w-full bg-[#111122] flex flex-col p-4 justify-between relative overflow-hidden">
                                        <div className="flex justify-between items-center text-[9px] text-gray-400 z-10 pt-2">
                                            <span>09:41</span>
                                            <div className="flex gap-1.5 items-center">
                                                <FiWifi size={10} />
                                                <FiBattery size={10} />
                                            </div>
                                        </div>
                                        
                                        <div className="flex-1 flex flex-col justify-center my-3 z-10">
                                            <div className="bg-[#1C1C36] rounded-2xl overflow-hidden border border-pink-500/20 shadow-xl relative h-full flex flex-col justify-between">
                                                <div className="absolute inset-0 bg-gradient-to-tr from-pink-500/25 to-purple-500/25 z-0"></div>
                                                
                                                <div className="flex-1 relative z-10 flex items-center justify-center p-3">
                                                    <div className="w-20 h-20 rounded-full overflow-hidden shadow-lg border-2 border-white/20">
                                                        <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150" className="w-full h-full object-cover" alt="" />
                                                    </div>
                                                </div>
                                                
                                                <div className="bg-black/60 backdrop-blur-md p-3 relative z-10 border-t border-white/5">
                                                    <div className="flex items-center gap-1.5 mb-0.5">
                                                        <span className="font-extrabold text-[12px] text-white">Ananya, 21</span>
                                                        <span className="bg-pink-500 text-white text-[7px] px-1.5 py-0.5 rounded-full font-bold">VERIFIED</span>
                                                    </div>
                                                    <p className="text-[9px] text-gray-300 flex items-center gap-1">
                                                        Mumbai • <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block animate-pulse"></span> Online
                                                    </p>
                                                    <div className="flex gap-1 mt-1.5 flex-wrap">
                                                        <span className="bg-pink-500/30 text-pink-300 text-[7px] px-1.5 py-0.5 rounded-full font-bold">Coffee</span>
                                                        <span className="bg-purple-500/30 text-purple-300 text-[7px] px-1.5 py-0.5 rounded-full font-bold">Movies</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-[8px] text-center text-gray-500 z-10 font-bold mb-1">Swipe to explore →</div>
                                    </div>
                                </div>
 
                                {/* Slide 1: Premium Chat */}
                                <div className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${activeSlide === 1 ? "opacity-100 z-10" : "opacity-0 z-0"}`}>
                                    <div className="h-full w-full bg-[#0E0E1F] flex flex-col p-4 justify-between">
                                        <div className="flex justify-between items-center text-[9px] text-gray-400 pt-2">
                                            <span>09:42</span>
                                            <div className="flex gap-1.5 items-center">
                                                <FiWifi size={10} />
                                                <FiBattery size={10} />
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-2 border-b border-white/10 pb-2 mt-2">
                                            <div className="w-6 h-6 rounded-full overflow-hidden shadow">
                                                <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80" className="w-full h-full object-cover" alt="" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-[10px] text-white">Ananya</h4>
                                                <span className="text-[7px] text-green-400">typing...</span>
                                            </div>
                                        </div>
                                        
                                        <div className="flex-1 flex flex-col gap-2 justify-end my-3 text-[9px]">
                                            <div className="bg-[#1C1C36] text-white p-2 rounded-2xl rounded-tl-none max-w-[85%] self-start border border-white/5">
                                                Hey! Ready for our coffee date?
                                            </div>
                                            <div className="bg-pink-500 text-white p-2 rounded-2xl rounded-tr-none max-w-[85%] self-end shadow-md font-medium">
                                                Absolutely! See you at 5.
                                            </div>
                                            <div className="bg-[#1C1C36] text-white p-2 rounded-2xl rounded-tl-none max-w-[85%] self-start border border-white/5 animate-pulse">
                                                Great! I'm on my way.
                                            </div>
                                        </div>
                                        
                                        <div className="bg-white/5 rounded-full px-3 py-1 flex justify-between items-center border border-white/10 mb-1">
                                            <span className="text-[8px] text-gray-500">Message...</span>
                                            <span className="text-pink-500 text-[8px] font-bold">Send</span>
                                        </div>
                                    </div>
                                </div>
 
                                {/* Slide 2: Video Calling */}
                                <div className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${activeSlide === 2 ? "opacity-100 z-10" : "opacity-0 z-0"}`}>
                                    <div className="h-full w-full bg-[#111122] flex flex-col p-4 justify-between relative overflow-hidden">
                                        <div className="absolute inset-0 bg-gradient-to-b from-purple-900/20 via-[#0D0D1A] to-pink-900/20 z-0"></div>
                                        
                                        <div className="flex justify-between items-center text-[9px] text-gray-400 z-10 pt-2 w-full">
                                            <span>09:43</span>
                                            <span className="font-bold text-white uppercase tracking-wider text-[7px] bg-pink-500/25 px-1.5 py-0.5 rounded-full border border-pink-500/30">HD Video</span>
                                            <div className="flex gap-1.5 items-center text-gray-400">
                                                <FiWifi size={10} />
                                                <FiBattery size={10} />
                                            </div>
                                        </div>
                                        
                                        <div className="flex-1 flex flex-col items-center justify-center gap-1.5 z-10">
                                            <div className="w-16 h-16 rounded-full overflow-hidden shadow-[0_0_20px_rgba(236,72,153,0.35)] border-2 border-white/30 animate-pulse relative">
                                                <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150" className="w-full h-full object-cover" alt="" />
                                                <span className="absolute bottom-0 right-0 bg-green-500 w-4 h-4 rounded-full border border-[#111122] flex items-center justify-center">
                                                    <FiMic className="text-white text-[8px]" size={8} />
                                                </span>
                                            </div>
                                            <h4 className="font-bold text-[11px] text-white">Ananya Sharma</h4>
                                            <span className="text-[8px] text-gray-400">Connected • 02:45</span>
                                        </div>
                                        
                                        <div className="absolute top-10 right-4 w-10 h-14 bg-[#16162A] rounded-lg border border-white/20 z-20 overflow-hidden shadow-lg">
                                            <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100" className="w-full h-full object-cover" alt="" />
                                        </div>
                                        
                                        <div className="flex justify-center gap-3 items-center z-10 mb-1">
                                            <div className="w-6 h-6 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-white">
                                                <FiMicOff size={9} />
                                            </div>
                                            <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white shadow-lg animate-bounce">
                                                <FiPhoneOff size={11} />
                                            </div>
                                            <div className="w-6 h-6 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-white">
                                                <FiVideoOff size={9} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
 
                    {/* RIGHT COLUMN: Premium Card */}
                    <div className="w-full max-w-[360px] flex flex-col gap-4 animate-fade-in order-1 lg:order-2">
                        <div className="bg-[#16162A]/95 border border-white/10 rounded-3xl p-6 md:p-8 shadow-[0_0_50px_rgba(236,72,153,0.15)] backdrop-blur-md relative overflow-hidden flex flex-col items-center">
                            
                            {/* Ambient card glows */}
                            <div className="absolute -top-12 -right-12 w-24 h-24 bg-pink-500/10 rounded-full blur-xl pointer-events-none"></div>
                            <div className="absolute -bottom-12 -left-12 w-24 h-24 bg-purple-500/10 rounded-full blur-xl pointer-events-none"></div>
                            
                            {/* Platform Branding */}
                            <div className="flex items-center gap-2.5 mb-6">
                                <svg className="w-9 h-9 drop-shadow-[0_0_8px_rgba(236,72,153,0.5)]" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M49.9999 15L23.157 30.5V61.5L49.9999 77L76.8428 61.5V30.5L49.9999 15Z" stroke="url(#hero-logo-grad)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M49.9999 35L36.1436 43V59L49.9999 67L63.8563 59V43L49.9999 35Z" stroke="url(#hero-logo-grad)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M23 30.5L50 50M77 30.5L50 50M50 77V50" stroke="url(#hero-logo-grad)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                                    <defs>
                                        <linearGradient id="hero-logo-grad" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
                                            <stop stopColor="#ec4899" />
                                            <stop offset="1" stopColor="#a855f7" />
                                        </linearGradient>
                                    </defs>
                                </svg>
                                <span className="text-3xl font-black bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent tracking-wide">RentGF</span>
                            </div>
 
                            {/* Short Intro */}
                            <p className="text-gray-300 text-sm text-center mb-8 leading-relaxed px-1">
                                India's Premium Companion Platform. Connect with safe &amp; verified partners for coffee dates, movies, events, and meaningful conversations.
                            </p>
 
                            {/* Login / Signup Buttons */}
                            <div className="w-full flex flex-col gap-4">
                                <button
                                    onClick={() => setPage(PAGES.BOY_LOGIN)}
                                    className="w-full py-3.5 rounded-xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 hover:opacity-95 text-sm text-white shadow-lg shadow-pink-500/20 transition transform hover:-translate-y-0.5 active:scale-95"
                                >
                                    Log In
                                </button>
                                
                                <button
                                    onClick={() => setPage(PAGES.BOY_REGISTER)}
                                    className="w-full py-3.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl font-bold transition-all transform hover:-translate-y-0.5 active:scale-95 text-sm"
                                >
                                    Create New Account
                                </button>
                            </div>
 
                            {/* Verified Trust Badge */}
                            <div className="mt-8 flex items-center gap-1.5 text-[10px] text-gray-500">
                                <span>🔒 Secure &amp; Encrypted</span>
                                <span>•</span>
                                <span>💯 Verified Profiles</span>
                            </div>
                        </div>
                    </div>
 
                </div>
            </div>

            {/* Premium Trust & Safety Row */}
            <div className="max-w-5xl mx-auto px-6 mb-20">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-[#16162A]/60 border border-white/5 rounded-2xl p-6 flex flex-col items-center text-center">
                        <div className="w-12 h-12 rounded-xl bg-pink-500/10 flex items-center justify-center text-pink-400 mb-4 border border-pink-500/25">
                            <FiShield size={24} />
                        </div>
                        <h4 className="font-bold text-white text-base mb-1.5">100% Safe &amp; Private</h4>
                        <p className="text-xs text-gray-400 leading-relaxed">Your data and personal identity are encrypted. Complete privacy guaranteed.</p>
                    </div>
                    <div className="bg-[#16162A]/60 border border-white/5 rounded-2xl p-6 flex flex-col items-center text-center">
                        <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 mb-4 border border-purple-500/25">
                            <FiCheckCircle size={24} />
                        </div>
                        <h4 className="font-bold text-white text-base mb-1.5">KYC Verified Profiles</h4>
                        <p className="text-xs text-gray-400 leading-relaxed">Companions undergo government ID verification check for absolute authenticity.</p>
                    </div>
                    <div className="bg-[#16162A]/60 border border-white/5 rounded-2xl p-6 flex flex-col items-center text-center">
                        <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 mb-4 border border-blue-500/25">
                            <FiClock size={24} />
                        </div>
                        <h4 className="font-bold text-white text-base mb-1.5">Instant Connectivity</h4>
                        <p className="text-xs text-gray-400 leading-relaxed">Fast matchmaking booking and high quality real-time WebRTC audio &amp; video calls.</p>
                    </div>
                </div>
            </div>

            {/* CURATED FEATURED COMPANIONS GRID */}
            <div className="max-w-5xl mx-auto px-6 mb-20">
                <div className="text-center mb-10">
                    <span className="text-xs font-bold tracking-widest text-pink-500 uppercase">Discover</span>
                    <h2 className="text-3xl font-bold mb-3 mt-1">Featured Companions</h2>
                    <p className="text-gray-400 text-sm">Have a look at some of our popular companion profiles.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {featuredCompanions.map((comp) => (
                        <div 
                            key={comp.id}
                            className="bg-[#16162A]/90 border border-white/10 rounded-2xl overflow-hidden shadow-xl hover:-translate-y-1.5 transition duration-300 flex flex-col justify-between group"
                        >
                            {/* Profile Image Column */}
                            <div className="relative aspect-[4/5] overflow-hidden bg-black shrink-0">
                                <img src={comp.profile_pic} alt={comp.name} className="w-full h-full object-cover transition duration-500 group-hover:scale-105 group-hover:brightness-95" />
                                <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md text-[10px] text-yellow-400 font-bold border border-white/10 flex items-center gap-1 shadow-md">
                                    <FiStar size={11} className="fill-yellow-400" /> {comp.rating}
                                </div>
                                <span className="absolute bottom-3 left-3 bg-pink-500 text-white text-[8px] px-2 py-0.5 rounded-full font-bold tracking-wider uppercase shadow-md flex items-center gap-1 border border-white/10">
                                    <FiCheckCircle size={9} /> Verified
                                </span>
                            </div>

                            {/* Profile Meta Column */}
                            <div className="p-4 flex-1 flex flex-col justify-between">
                                <div className="space-y-1.5">
                                    <h4 className="font-extrabold text-white text-sm tracking-wide">{comp.name}, {comp.age}</h4>
                                    <p className="text-[10px] text-gray-400">{comp.city} • Companion</p>
                                    
                                    <div className="flex flex-wrap gap-1 pt-1.5">
                                        {comp.tags.slice(0, 2).map((tag) => (
                                            <span 
                                                key={tag} 
                                                className="px-2 py-0.5 text-[8px] font-bold rounded-md bg-pink-500/10 text-pink-400 border border-pink-500/10"
                                            >
                                                #{tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <button
                                    onClick={() => setPage(PAGES.BOY_LOGIN)}
                                    className="w-full mt-4 py-2 rounded-lg text-center font-bold text-[10px] bg-white/5 hover:bg-pink-500/20 text-white border border-white/10 hover:border-pink-500/30 transition shadow-sm"
                                >
                                    Connect Now
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
 
            <div className="max-w-5xl mx-auto px-6">
                <div className="text-center mb-10">
                    <h2 className="text-3xl font-bold mb-3">Our Growing Community</h2>
                    <p className="text-gray-400 text-sm">Join thousands of verified users already making meaningful connections.</p>
                </div>
 
                {loading ? (
                    <div className="flex justify-center items-center py-10">
                        <RiLoader4Line className="text-pink-500 text-4xl animate-spin" />
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-[#16162A]/80 border border-white/5 rounded-2xl p-6 text-center hover:-translate-y-1 transition duration-300">
                            <div className="text-4xl font-extrabold text-white mb-2">{stats.total}</div>
                            <div className="text-xs text-gray-400 uppercase tracking-widest">Total Users</div>
                        </div>
                        <div className="bg-[#16162A]/80 border border-pink-500/10 rounded-2xl p-6 text-center hover:-translate-y-1 transition duration-300 shadow-[0_0_15px_rgba(236,72,153,0.05)]">
                            <div className="text-4xl font-extrabold text-pink-400 mb-2">{stats.girls}</div>
                            <div className="text-xs text-pink-400/80 uppercase tracking-widest">Female Companions</div>
                        </div>
                        <div className="bg-[#16162A]/80 border border-blue-500/10 rounded-2xl p-6 text-center hover:-translate-y-1 transition duration-300 shadow-[0_0_15px_rgba(59,130,246,0.05)]">
                            <div className="text-4xl font-extrabold text-blue-400 mb-2">{stats.boys}</div>
                            <div className="text-xs text-blue-400/80 uppercase tracking-widest">Male Companions</div>
                        </div>
                        <div className="bg-[#16162A]/80 border border-purple-500/10 rounded-2xl p-6 text-center hover:-translate-y-1 transition duration-300 shadow-[0_0_15px_rgba(168,85,247,0.05)]">
                            <div className="text-4xl font-extrabold text-purple-400 mb-2">{stats.connections}+</div>
                            <div className="text-xs text-purple-400/80 uppercase tracking-widest">Happy Connections</div>
                        </div>
                    </div>
                )}
            </div>
 
            <Footer setPage={setPage} />
        </div>
    );
}

export default HomePage;