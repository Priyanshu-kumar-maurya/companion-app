import React, { useState, useEffect } from "react";
import { PAGES } from "../App";
import Footer from "./Footer";

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

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                if (isLoggedIn && currentUser) {
                    const response = await fetch(`https://rentgf-and-bf.onrender.com/api/feed?currentUserId=${currentUser.id}`);
                    if (response.ok) {
                        const data = await response.json();
                        setFeed(data);

                        const followData = {};
                        data.forEach(post => {
                            followData[post.user_id] = post.is_followed_by_me;
                        });
                        setFollowingState(followData);
                    }
                } else {
                    const girlRes = await fetch("https://rentgf-and-bf.onrender.com/api/users?role=girl");
                    const boyRes = await fetch("https://rentgf-and-bf.onrender.com/api/users?role=boy");

                    let girlCount = 0;
                    let boyCount = 0;

                    if (girlRes.ok) girlCount = (await girlRes.json()).length;
                    if (boyRes.ok) boyCount = (await boyRes.json()).length;

                    setStats({
                        girls: girlCount,
                        boys: boyCount,
                        total: girlCount + boyCount,
                        connections: (girlCount + boyCount) * 15 + 120
                    });
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
            await fetch("https://rentgf-and-bf.onrender.com/api/like", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user_id: currentUser.id, post_id: postId })
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
            await fetch(`https://rentgf-and-bf.onrender.com${endpoint}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
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
            user_id: currentUser.id,
            post_id: commentModal.postId,
            text: newComment
        };

        try {
            const res = await fetch("https://rentgf-and-bf.onrender.com/api/comment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
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

    const toggleSave = (postId) => {
        if (savedPosts.includes(postId)) {
            setSavedPosts(savedPosts.filter(id => id !== postId));
        } else {
            setSavedPosts([...savedPosts, postId]);
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
                            <span className="text-4xl animate-spin">🌀</span>
                        </div>
                    ) : feed.length === 0 ? (
                        <div className="text-center py-20 bg-[#16162A] rounded-2xl border border-white/5">
                            <span className="text-5xl mb-4 block">📭</span>
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
                                                {post.is_liked_by_me ? "❤️" : "🤍"}
                                            </button>
                                            <button onClick={() => openComments(post.id)} className="text-2xl hover:scale-110 transition active:scale-90 opacity-90">
                                                💬
                                            </button>
                                            <button onClick={() => handleShare(post.id)} className="text-2xl hover:scale-110 transition active:scale-90 opacity-90">
                                                ↗️
                                            </button>
                                        </div>
                                        <button onClick={() => toggleSave(post.id)} className="text-2xl hover:scale-110 transition active:scale-90 opacity-90">
                                            {savedPosts.includes(post.id) ? "📥" : "🔖"}
                                        </button>
                                    </div>

                                    <div className="font-bold text-sm text-white mb-1">
                                        {post.total_likes} likes
                                    </div>

                                    <div className="text-sm text-gray-200">
                                        <span className="font-bold mr-2 cursor-pointer hover:text-pink-400" onClick={() => handleProfileClick(post)}>
                                            {post.user_name}
                                        </span>
                                        {post.caption}
                                    </div>

                                    {parseInt(post.total_comments) > 0 && (
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
                                    <div className="text-center text-gray-500 my-10">Loading comments...</div>
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

    return (
        <div className="min-h-[100dvh] bg-[#0D0D1A] pt-24 pb-10">
            <div className="max-w-5xl mx-auto px-6 text-center mt-10 mb-20 relative">

                <div className="absolute top-[-20%] left-[-10%] w-96 h-96 bg-pink-600/20 rounded-full blur-[100px] pointer-events-none"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-96 h-96 bg-blue-600/20 rounded-full blur-[100px] pointer-events-none"></div>

                <div className="inline-block px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-pink-400 text-sm font-semibold mb-6 shadow-[0_0_15px_rgba(236,72,153,0.15)] relative z-10">
                    ✨ India's #1 Companion App
                </div>

                <h1 className="text-5xl md:text-6xl font-extrabold mb-6 leading-tight relative z-10">
                    Find Your Perfect <br />
                    <span className="bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
                        Companion Today
                    </span>
                </h1>

                <p className="text-gray-400 text-lg max-w-2xl mx-auto mb-12 relative z-10">
                    Join our secure and private platform to connect with amazing people for coffee dates, movies, events, and meaningful conversations.
                </p>

                <div className="flex flex-col sm:flex-row justify-center gap-6 relative z-10">
                    <div className="flex flex-col items-center w-full max-w-2xl mx-auto">
                        <div className="flex flex-col sm:flex-row gap-6 w-full mb-8">
                            <div className="flex-1 flex flex-col gap-3 p-6 bg-[#16162A] border border-pink-500/20 rounded-2xl shadow-lg hover:border-pink-500/50 transition duration-300">
                                <h3 className="text-pink-400 font-bold text-xl">For Girls 👩</h3>
                                <p className="text-sm text-gray-400 mb-2 flex-grow">Earn money by spending time as a companion.</p>
                                <button
                                    onClick={() => setPage(PAGES.GIRL_REGISTER)}
                                    className="w-full px-6 py-3.5 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl font-bold shadow-md hover:-translate-y-0.5 transition"
                                >
                                    Register as a Girl
                                </button>
                            </div>

                            <div className="flex-1 flex flex-col gap-3 p-6 bg-[#16162A] border border-blue-500/20 rounded-2xl shadow-lg hover:border-blue-500/50 transition duration-300">
                                <h3 className="text-blue-400 font-bold text-xl">For Boys 👨</h3>
                                <p className="text-sm text-gray-400 mb-2 flex-grow">Find companions for dates, events & hangouts.</p>
                                <button
                                    onClick={() => setPage(PAGES.BOY_REGISTER)}
                                    className="w-full px-6 py-3.5 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-bold shadow-md hover:-translate-y-0.5 transition"
                                >
                                    Register as a Boy
                                </button>
                            </div>
                        </div>

                        <div className="text-center bg-[#16162A] border border-white/5 py-4 px-10 rounded-2xl w-full sm:w-auto shadow-lg hover:border-white/10 transition">
                            <p className="text-gray-400 text-sm mb-2">Already have an account?</p>
                            <button
                                onClick={() => setPage(PAGES.BOY_LOGIN)}
                                className="text-white font-bold text-lg hover:text-pink-400 transition flex items-center justify-center gap-2 w-full"
                            >
                                Login to your account <span className="text-xl">➔</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-6">
                <div className="text-center mb-10">
                    <h2 className="text-3xl font-bold mb-3">Our Growing Community</h2>
                    <p className="text-gray-400 text-sm">Join thousands of verified users already making meaningful connections.</p>
                </div>

                {loading ? (
                    <div className="text-center py-10 text-pink-500 animate-pulse">Loading live statistics...</div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-[#16162A] border border-white/5 rounded-2xl p-6 text-center hover:-translate-y-1 transition duration-300">
                            <div className="text-4xl font-extrabold text-white mb-2">{stats.total}</div>
                            <div className="text-xs text-gray-400 uppercase tracking-widest">Total Users</div>
                        </div>
                        <div className="bg-[#16162A] border border-pink-500/20 rounded-2xl p-6 text-center hover:-translate-y-1 transition duration-300 shadow-[0_0_15px_rgba(236,72,153,0.1)]">
                            <div className="text-4xl font-extrabold text-pink-400 mb-2">{stats.girls}</div>
                            <div className="text-xs text-pink-400/80 uppercase tracking-widest">Female Companions</div>
                        </div>
                        <div className="bg-[#16162A] border border-blue-500/20 rounded-2xl p-6 text-center hover:-translate-y-1 transition duration-300 shadow-[0_0_15px_rgba(59,130,246,0.1)]">
                            <div className="text-4xl font-extrabold text-blue-400 mb-2">{stats.boys}</div>
                            <div className="text-xs text-blue-400/80 uppercase tracking-widest">Male Companions</div>
                        </div>
                        <div className="bg-[#16162A] border border-purple-500/20 rounded-2xl p-6 text-center hover:-translate-y-1 transition duration-300 shadow-[0_0_15px_rgba(168,85,247,0.1)]">
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