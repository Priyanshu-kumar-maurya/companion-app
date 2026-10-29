import React, { useState, useEffect, useRef } from "react";
import { PAGES } from "../App";
import StoriesBar from "./shared/StoriesBar";
import VerifiedBadge from "./shared/VerifiedBadge";
import SharePostModal from "./shared/SharePostModal";
import PostMediaCarousel from "./shared/PostMediaCarousel";
import AuthPromptModal from "./shared/AuthPromptModal";
import { FeedPostSkeleton } from "./shared/SkeletonLoaders";
import { AiFillHeart, AiOutlineHeart } from "react-icons/ai";
import { FaRegComment } from "react-icons/fa";
import { RiShareForwardLine, RiLoader4Line } from "react-icons/ri";
import { BsBookmarkFill, BsBookmark } from "react-icons/bs";
import { FiMoreHorizontal, FiCalendar, FiArrowRight } from "react-icons/fi";
import { formatCapitalize, formatLocation } from "../utils/formatUtils";

// Backend API Base Configuration
const API_BASE = process.env.REACT_APP_API_URL || "https://rentgf-and-bf.onrender.com";
const API = `${API_BASE}/api`;

const DEFAULT_FEATURED_COMPANIONS = [
  {
    id: "default_1",
    name: "Ananya Sharma",
    age: 22,
    city: "Mumbai, Maharashtra",
    rating: "4.9",
    profile_pic: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400",
    tags: ["Coffee Date", "Movie Partner"],
    role: "girl",
    kyc_status: "verified",
    price: 1200,
  },
  {
    id: "default_2",
    name: "Pooja Verma",
    age: 23,
    city: "New Delhi, Delhi",
    rating: "4.8",
    profile_pic: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400",
    tags: ["Events", "Dinner"],
    role: "girl",
    kyc_status: "verified",
    price: 1500,
  },
  {
    id: "default_3",
    name: "Aarav Patel",
    age: 24,
    city: "Bengaluru, Karnataka",
    rating: "4.9",
    profile_pic: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400",
    tags: ["Fitness", "Conversations"],
    role: "boy",
    kyc_status: "verified",
    price: 1000,
  },
  {
    id: "default_4",
    name: "Sneha Reddy",
    age: 21,
    city: "Hyderabad, Telangana",
    rating: "4.9",
    profile_pic: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400",
    tags: ["Cafe Outings", "Travel"],
    role: "girl",
    kyc_status: "verified",
    price: 1300,
  },
];

function HomePage({ setPage, currentUser, setSelectedGirl, socket }) {
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(false);
  const [followingState, setFollowingState] = useState({});
  const [sharingPost, setSharingPost] = useState(null);
  const [commentModal, setCommentModal] = useState({ isOpen: false, postId: null, comments: [] });
  const [newComment, setNewComment] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const [savedPosts, setSavedPosts] = useState([]);
  const [featuredCompanions, setFeaturedCompanions] = useState(() => {
    const cached = sessionStorage.getItem("homeFeaturedCache");
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return DEFAULT_FEATURED_COMPANIONS;
  });

  const [authModal, setAuthModal] = useState({
    isOpen: false,
    title: "",
    subtitle: "",
    iconType: "heart",
  });

  const openAuthPrompt = (title, subtitle, iconType = "heart") => {
    setAuthModal({ isOpen: true, title, subtitle, iconType });
  };

  // Listen for newly published posts
  useEffect(() => {
    const handlePostCreated = (e) => {
      const newPost = e.detail;
      if (newPost) {
        setFeed((prevFeed) => {
          const updated = [newPost, ...prevFeed.filter((p) => p.id !== newPost.id)];
          try {
            sessionStorage.setItem("homeFeedCache", JSON.stringify(updated));
          } catch (err) {}
          return updated;
        });
      }
    };
    window.addEventListener("post-created", handlePostCreated);
    return () => window.removeEventListener("post-created", handlePostCreated);
  }, []);

  // Fetch Feed & Companions (Unified for both logged-in and guest users)
  useEffect(() => {
    const cachedFeed = sessionStorage.getItem("homeFeedCache");
    const cachedFollowing = sessionStorage.getItem("followingStateCache");

    if (cachedFeed) {
      try {
        setFeed(JSON.parse(cachedFeed));
        if (cachedFollowing) setFollowingState(JSON.parse(cachedFollowing));
        setLoading(false);
      } catch (e) {
        setLoading(true);
      }
    } else {
      setLoading(true);
    }

    const fetchData = async () => {
      try {
        // 1. Fetch live feed (public feed if guest, personalized if logged in)
        const feedUrl = currentUser?.id
          ? `${API}/feed?currentUserId=${currentUser.id}`
          : `${API}/feed`;
        const response = await fetch(feedUrl);
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data)) {
            setFeed(data);
            try {
              sessionStorage.setItem("homeFeedCache", JSON.stringify(data));
            } catch (e) {}

            if (currentUser) {
              const followData = {};
              data.forEach((post) => {
                followData[post.user_id] = post.is_followed_by_me;
              });
              setFollowingState(followData);
              try {
                sessionStorage.setItem("followingStateCache", JSON.stringify(followData));
              } catch (e) {}
            }
          }
        }

        // 2. Fetch saved posts if logged in
        if (currentUser) {
          const token = localStorage.getItem("token");
          if (token) {
            const savedRes = await fetch(`${API}/posts/saved`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (savedRes.ok) {
              const savedData = await savedRes.json();
              if (Array.isArray(savedData)) {
                setSavedPosts(savedData.map((p) => p.id));
              }
            }
          }
        }

        // 3. Fetch verified companion list for suggested shelf
        const res = await fetch(`${API}/users`);
        if (res.ok) {
          const allUsers = await res.json();
          if (Array.isArray(allUsers) && allUsers.length > 0) {
            const isUserVerified = (u) =>
              Boolean(
                u.kyc_status === "verified" ||
                u.kyc_status === "approved" ||
                u.is_verified === true ||
                u.is_verified === 1
              );
            const verifiedCompanions = allUsers
              .filter((u) => u.role === "girl" || u.role === "boy")
              .sort((a, b) => (isUserVerified(b) ? 1 : 0) - (isUserVerified(a) ? 1 : 0));

            const mapped = verifiedCompanions.slice(0, 8).map((u, index) => {
              const avgRat = parseFloat(u.avg_rating);
              const displayRating = avgRat > 0 ? avgRat.toFixed(1) : "4.9";
              const cleanName = formatCapitalize(u.name || u.username || "Companion");
              const cleanLocation = formatLocation(u.city || u.location);
              return {
                id: u.id,
                name: cleanName,
                age: u.age || 22,
                city: cleanLocation,
                rating: displayRating,
                profile_pic:
                  u.profile_pic ||
                  DEFAULT_FEATURED_COMPANIONS[index % DEFAULT_FEATURED_COMPANIONS.length]
                    .profile_pic,
                role: u.role,
                kyc_status: u.kyc_status || "verified",
                price: u.price || 1200,
                userObj: {
                  ...u,
                  city: cleanLocation,
                },
              };
            });

            if (mapped.length > 0) {
              setFeaturedCompanions(mapped);
              try {
                sessionStorage.setItem("homeFeaturedCache", JSON.stringify(mapped));
              } catch (e) {}
            }
          }
        }
      } catch (err) {
        console.error("Home fetchData error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUser?.id]);

  // Like Handler (Guarded with Auth Prompt for guests)
  const handleLike = async (postId, isLikedByMe) => {
    if (!currentUser) {
      openAuthPrompt(
        "Log In to Like Posts",
        "Double-tap and heart your favorite companion updates.",
        "heart"
      );
      return;
    }

    setFeed((prevFeed) =>
      prevFeed.map((post) => {
        if (post.id === postId) {
          return {
            ...post,
            is_liked_by_me: !isLikedByMe,
            total_likes: isLikedByMe
              ? Math.max(0, parseInt(post.total_likes) - 1)
              : parseInt(post.total_likes) + 1,
          };
        }
        return post;
      })
    );

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/like`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ post_id: postId }),
      });
      if (!res.ok) {
        setFeed((prevFeed) =>
          prevFeed.map((post) => {
            if (post.id === postId) {
              return {
                ...post,
                is_liked_by_me: isLikedByMe,
                total_likes: isLikedByMe
                  ? parseInt(post.total_likes) + 1
                  : Math.max(0, parseInt(post.total_likes) - 1),
              };
            }
            return post;
          })
        );
      }
    } catch (err) {
      console.error("Like error:", err);
    }
  };

  const handleDoubleTap = (e, postId, isLikedByMe) => {
    if (!currentUser) {
      openAuthPrompt(
        "Log In to Like Posts",
        "Double-tap and heart your favorite companion updates.",
        "heart"
      );
      return;
    }
    if (!isLikedByMe) {
      handleLike(postId, false);
    }
  };

  const handleFollowToggle = async (targetUserId) => {
    if (!currentUser) {
      openAuthPrompt(
        "Log In to Follow",
        "Follow companions to see their exclusive stories and updates first.",
        "shield"
      );
      return;
    }

    const isCurrentlyFollowing = followingState[targetUserId];
    const endpoint = isCurrentlyFollowing ? "/api/unfollow" : "/api/follow";

    setFollowingState((prev) => ({
      ...prev,
      [targetUserId]: !isCurrentlyFollowing,
    }));

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          follower_id: currentUser.id,
          following_id: targetUserId,
        }),
      });
      if (!res.ok) {
        setFollowingState((prev) => ({
          ...prev,
          [targetUserId]: isCurrentlyFollowing,
        }));
      }
    } catch (err) {
      setFollowingState((prev) => ({
        ...prev,
        [targetUserId]: isCurrentlyFollowing,
      }));
      console.error("Follow error:", err);
    }
  };

  const openComments = async (postId) => {
    setCommentModal({ isOpen: true, postId, comments: [] });
    setLoadingComments(true);
    try {
      const res = await fetch(`${API}/comments/${postId}`);
      if (res.ok) {
        const data = await res.json();
        setCommentModal({ isOpen: true, postId, comments: data });
      }
    } catch (err) {
      console.error("Fetch comments error:", err);
    } finally {
      setLoadingComments(false);
    }
  };

  const submitComment = async () => {
    if (!currentUser) {
      openAuthPrompt(
        "Log In to Comment",
        "Join the conversation and connect with companions directly.",
        "message"
      );
      return;
    }
    if (!newComment.trim() || !commentModal.postId) return;

    const commentData = {
      post_id: commentModal.postId,
      text: newComment.trim(),
    };

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/comment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(commentData),
      });

      if (res.ok) {
        const savedComment = await res.json();
        setCommentModal((prev) => ({
          ...prev,
          comments: [
            ...prev.comments,
            { ...savedComment, user_name: currentUser.name, user_pic: currentUser.profile_pic },
          ],
        }));
        setNewComment("");

        setFeed((prevFeed) =>
          prevFeed.map((post) =>
            post.id === commentModal.postId
              ? { ...post, total_comments: parseInt(post.total_comments) + 1 }
              : post
          )
        );
      }
    } catch (err) {
      console.error("Submit comment error:", err);
    }
  };

  const toggleSave = async (postId) => {
    if (!currentUser) {
      openAuthPrompt(
        "Log In to Bookmark",
        "Save your favorite companion posts to your private profile.",
        "lock"
      );
      return;
    }

    const isSaved = savedPosts.includes(postId);
    if (isSaved) {
      setSavedPosts(savedPosts.filter((id) => id !== postId));
    } else {
      setSavedPosts([...savedPosts, postId]);
    }

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/posts/save`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ post_id: postId }),
      });
      if (!res.ok) {
        if (isSaved) {
          setSavedPosts((prev) => [...prev, postId]);
        } else {
          setSavedPosts((prev) => prev.filter((id) => id !== postId));
        }
      }
    } catch (err) {
      console.error("Save toggle error:", err);
    }
  };

  const handleShare = (post) => {
    setSharingPost(post);
  };

  const handleProfileClick = (post) => {
    if (post.user_id === currentUser?.id) {
      setPage(currentUser.role === "girl" ? PAGES.GIRL_DASHBOARD : PAGES.BOY_DASHBOARD);
    } else {
      if (typeof setSelectedGirl === "function") {
        setSelectedGirl({
          id: post.user_id,
          name: post.user_name,
          profile_pic: post.user_pic,
          role: post.user_role,
          city: post.user_city,
        });
      }
      setPage(PAGES.DETAILS);
    }
  };

  const handleBookCompanion = (postOrComp) => {
    const userObj = postOrComp.userObj || {
      id: postOrComp.user_id || postOrComp.id,
      name: postOrComp.user_name || postOrComp.name,
      profile_pic: postOrComp.user_pic || postOrComp.profile_pic,
      city: postOrComp.user_city || postOrComp.city,
      role: postOrComp.user_role || postOrComp.role || "girl",
      price: postOrComp.price || 1200,
    };
    if (typeof setSelectedGirl === "function") {
      setSelectedGirl(userObj);
    }
    setPage(PAGES.DETAILS);
  };

  const formatTime = (dateString) => {
    if (!dateString) return "RECENTLY";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${Math.max(1, diffMins)}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  // ─── Swipe Left (Right-to-Left) to Open Direct Messages ───
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);

  const handleTouchStart = (e) => {
    if (!e.touches || e.touches.length === 0) return;
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    if (!e.changedTouches || e.changedTouches.length === 0) return;

    const diffX = touchStartX.current - e.changedTouches[0].clientX;
    const diffY = touchStartY.current - e.changedTouches[0].clientY;

    touchStartX.current = null;
    touchStartY.current = null;

    if (e.target && e.target.closest("button, input, textarea, a, select, [data-prevent-swipe]")) {
      return;
    }

    if (diffX > 75 && Math.abs(diffX) > Math.abs(diffY) * 1.4) {
      if (currentUser && typeof setPage === "function") {
        setPage(PAGES.MESSAGES);
      }
    }
  };

  return (
    <div
      className="min-h-[100dvh] bg-[#000000] text-white pt-16 sm:pt-20 pb-24 flex justify-center"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="w-full max-w-lg flex flex-col gap-4 px-2 sm:px-4">
        {/* ─── GUEST WELCOME BANNER (Shown to new/visitor users) ─── */}
        {!currentUser && (
          <div className="bg-[#121212] border border-[#262626] rounded-2xl p-3.5 mb-2 shadow-xl relative overflow-hidden flex items-center justify-between gap-3 animate-fade-in">
            <div className="absolute -left-10 -top-10 w-28 h-28 bg-[#e1306c]/15 rounded-full blur-xl pointer-events-none" />
            <div className="min-w-0 z-10">
              <h4 className="font-extrabold text-sm text-white flex items-center gap-1.5">
                <span className="text-base">☕</span> Coffeely
              </h4>
              <p className="text-[11px] text-gray-400 truncate mt-0.5">
                India's verified companion platform. Log in to chat, post &amp; book dates.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0 z-10">
              <button
                onClick={() => setPage(PAGES.BOY_LOGIN)}
                className="px-3.5 py-1.5 rounded-full bg-gradient-to-r from-[#f9ce3f] via-[#e1306c] to-[#833ab4] text-white text-xs font-bold shadow-md hover:opacity-95 active:scale-95 transition"
              >
                Log In
              </button>
              <button
                onClick={() => setPage(PAGES.BOY_REGISTER)}
                className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/15 text-gray-200 text-xs font-semibold border border-white/10 active:scale-95 transition hidden sm:inline-block"
              >
                Sign Up
              </button>
            </div>
          </div>
        )}

        {/* ─── 24-HOUR INSTAGRAM STORIES TRAY ─── */}
        <StoriesBar currentUser={currentUser} />

        {/* ─── FEED POSTS OR SKELETON LOADERS ─── */}
        {loading && feed.length === 0 ? (
          <FeedPostSkeleton count={3} />
        ) : feed.length === 0 ? (
          /* Empty Feed State + Suggested Companions */
          <div className="bg-[#121212] rounded-3xl border border-[#262626] p-6 text-center shadow-xl my-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#f9ce3f]/20 via-[#e1306c]/20 to-[#833ab4]/20 border border-[#e1306c]/30 flex items-center justify-center mx-auto mb-4 text-3xl">
              ☕
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Welcome to Coffeely!</h3>
            <p className="text-xs sm:text-sm text-gray-400 max-w-sm mx-auto mb-6 leading-relaxed">
              Discover verified companions, explore lifestyle moments, and book safe coffee dates.
            </p>

            <button
              onClick={() => setPage(PAGES.FIND)}
              className="px-6 py-3 rounded-full bg-gradient-to-r from-[#f9ce3f] via-[#e1306c] to-[#833ab4] text-white font-bold text-xs uppercase tracking-wider shadow-lg hover:opacity-95 active:scale-95 transition inline-flex items-center gap-2 mb-6"
            >
              <span>Explore Companions</span>
              <span>→</span>
            </button>

            {/* Suggested Companions Shelf */}
            {featuredCompanions && featuredCompanions.length > 0 && (
              <div className="border-t border-[#262626] pt-5 text-left">
                <div className="flex items-center justify-between mb-3 px-1">
                  <span className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                    <span>✨</span>
                    <span>Suggested Verified Companions</span>
                  </span>
                  <button
                    onClick={() => setPage(PAGES.FIND)}
                    className="text-[11px] font-bold text-[#e1306c] hover:underline"
                  >
                    See All
                  </button>
                </div>

                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
                  {featuredCompanions.map((comp) => (
                    <div
                      key={comp.id}
                      onClick={() => handleBookCompanion(comp)}
                      className="w-36 shrink-0 bg-[#181818] border border-[#262626] rounded-2xl p-3 flex flex-col items-center text-center cursor-pointer hover:border-[#e1306c]/50 transition group"
                    >
                      <div className="relative w-16 h-16 rounded-full overflow-hidden mb-2 p-[2px] bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] group-hover:scale-105 transition-transform">
                        <img
                          src={comp.profile_pic}
                          alt={comp.name}
                          className="w-full h-full object-cover rounded-full border-2 border-black"
                        />
                      </div>
                      <div className="font-bold text-xs text-white truncate w-full flex items-center justify-center gap-1">
                        <span className="truncate">{comp.name.split(" ")[0]}</span>
                        <VerifiedBadge size="xs" />
                      </div>
                      <div className="text-[10px] text-gray-400 truncate w-full mt-0.5">
                        {comp.city ? comp.city.split(",")[0] : "Verified"}
                      </div>
                      <div className="mt-2 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full w-fit">
                        ₹{comp.price}/hr
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          feed.map((post, index) => (
            <React.Fragment key={post.id}>
              {/* ─── INSTAGRAM POST CARD ─── */}
              <div className="bg-[#000000] border border-[#262626] rounded-2xl overflow-hidden shadow-2xl mb-4 transition duration-300">
                {/* 1. Header: Avatar + Username + Location + Follow */}
                <div className="flex items-center justify-between p-3.5 border-b border-[#1A1A1A]">
                  <div
                    className="flex items-center gap-3 cursor-pointer group"
                    onClick={() => handleProfileClick(post)}
                  >
                    <div className="relative p-[1.5px] rounded-full bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] shrink-0">
                      <img
                        src={
                          post.user_pic || "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
                        }
                        alt={post.user_name}
                        className="w-10 h-10 rounded-full object-cover border-2 border-black group-hover:scale-105 transition-transform"
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-sm text-white group-hover:text-pink-400 transition truncate max-w-[140px] sm:max-w-[200px]">
                          {post.user_name}
                        </span>
                        <VerifiedBadge size="xs" />
                        <span className="text-gray-500 text-xs font-mono">
                          • {formatTime(post.created_at)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                        <span className="uppercase tracking-wider text-[9px] font-bold text-pink-400">
                          {post.user_role === "girl" ? "Companion" : "Member"}
                        </span>
                        {(post.location || post.user_city) && (
                          <span className="truncate max-w-[140px]">
                            • 📍 {post.location || post.user_city}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {post.user_id !== currentUser?.id && (
                      <button
                        onClick={() => handleFollowToggle(post.user_id)}
                        className={`px-3.5 py-1 text-xs font-bold rounded-lg transition ${
                          followingState[post.user_id]
                            ? "bg-[#262626] text-gray-300 hover:bg-[#333]"
                            : "bg-[#0095f6] text-white hover:bg-[#1877f2]"
                        }`}
                      >
                        {followingState[post.user_id] ? "Following" : "Follow"}
                      </button>
                    )}
                  </div>
                </div>

                {/* 2. Media Carousel with Double-Tap to Heart */}
                <PostMediaCarousel
                  post={post}
                  onDoubleTap={handleDoubleTap}
                  aspectRatio="aspect-square"
                  objectFit="object-cover"
                />

                {/* 3. Action Bar: Like, Comment, Share, Bookmark */}
                <div className="p-3.5 pt-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-4">
                      {/* Like Heart */}
                      <button
                        onClick={() => handleLike(post.id, post.is_liked_by_me)}
                        className="text-2xl hover:scale-110 active:scale-90 transition-transform"
                        aria-label="Like"
                      >
                        {post.is_liked_by_me ? (
                          <AiFillHeart className="text-[#ed4956] text-2xl drop-shadow-[0_0_8px_rgba(237,73,86,0.6)] animate-pulse" />
                        ) : (
                          <AiOutlineHeart className="text-white text-2xl hover:text-gray-300" />
                        )}
                      </button>

                      {/* Comment Bubble */}
                      {!post.disable_comments && (
                        <button
                          onClick={() => openComments(post.id)}
                          className="hover:scale-110 active:scale-90 transition-transform text-white opacity-95"
                          aria-label="Comment"
                        >
                          <FaRegComment className="text-2xl" />
                        </button>
                      )}

                      {/* Share */}
                      <button
                        onClick={() => handleShare(post)}
                        className="hover:scale-110 active:scale-90 transition-transform text-white opacity-95"
                        title="Share post"
                        aria-label="Share"
                      >
                        <RiShareForwardLine className="text-2xl" />
                      </button>
                    </div>

                    {/* Bookmark Save */}
                    <button
                      onClick={() => toggleSave(post.id)}
                      className="hover:scale-110 active:scale-90 transition-transform text-white opacity-95"
                      aria-label="Save"
                    >
                      {savedPosts.includes(post.id) ? (
                        <BsBookmarkFill className="text-white text-xl" />
                      ) : (
                        <BsBookmark className="text-white text-xl" />
                      )}
                    </button>
                  </div>

                  {/* 4. Total Likes */}
                  {!post.hide_likes && (
                    <div className="font-extrabold text-sm text-white mb-1.5">
                      {parseInt(post.total_likes) || 0} likes
                    </div>
                  )}

                  {/* 5. Caption */}
                  <div className="text-sm text-gray-200 leading-relaxed mb-2.5">
                    <span
                      className="font-bold mr-2 text-white hover:text-pink-400 cursor-pointer"
                      onClick={() => handleProfileClick(post)}
                    >
                      {post.user_name}
                    </span>
                    <span>{post.caption}</span>
                  </div>

                  {/* 6. Companion Meetup Booking Action Pill */}
                  <div className="my-2 py-2 border-t border-[#1A1A1A] flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span>Available for Dates</span>
                    </div>
                    <button
                      onClick={() => handleBookCompanion(post)}
                      className="px-3.5 py-1.5 rounded-full bg-gradient-to-r from-[#f9ce3f] via-[#e1306c] to-[#833ab4] hover:opacity-95 text-white font-bold text-xs shadow-md shadow-pink-500/20 active:scale-95 transition flex items-center gap-1.5"
                    >
                      <span>☕ Book Meetup</span>
                      <FiArrowRight size={12} />
                    </button>
                  </div>

                  {/* 7. Comments Link */}
                  {!post.disable_comments && parseInt(post.total_comments) > 0 && (
                    <div
                      onClick={() => openComments(post.id)}
                      className="text-gray-500 text-xs mt-1.5 cursor-pointer hover:text-gray-300 font-medium"
                    >
                      View all {post.total_comments} comments
                    </div>
                  )}

                  {/* 8. Timestamp */}
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider mt-2 font-mono">
                    {formatTime(post.created_at)}
                  </div>
                </div>
              </div>

              {/* In-feed Suggested Companions Shelf after 3rd post */}
              {index === 2 && featuredCompanions && featuredCompanions.length > 0 && (
                <div className="bg-[#121212] border border-[#262626] rounded-2xl p-4 my-2 mb-4">
                  <div className="flex items-center justify-between mb-3 px-1">
                    <span className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                      <span>✨</span>
                      <span>Suggested Verified Companions</span>
                    </span>
                    <button
                      onClick={() => setPage(PAGES.FIND)}
                      className="text-[11px] font-bold text-[#e1306c] hover:underline"
                    >
                      See All
                    </button>
                  </div>

                  <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
                    {featuredCompanions.map((comp) => (
                      <div
                        key={comp.id}
                        onClick={() => handleBookCompanion(comp)}
                        className="w-32 shrink-0 bg-[#181818] border border-[#262626] rounded-2xl p-2.5 flex flex-col items-center text-center cursor-pointer hover:border-[#e1306c]/50 transition group"
                      >
                        <div className="relative w-14 h-14 rounded-full overflow-hidden mb-2 p-[2px] bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] group-hover:scale-105 transition-transform">
                          <img
                            src={comp.profile_pic}
                            alt={comp.name}
                            className="w-full h-full object-cover rounded-full border-2 border-black"
                          />
                        </div>
                        <div className="font-bold text-xs text-white truncate w-full flex items-center justify-center gap-1">
                          <span className="truncate">{comp.name.split(" ")[0]}</span>
                          <VerifiedBadge size="xs" />
                        </div>
                        <div className="mt-1.5 text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                          ₹{comp.price}/hr
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </React.Fragment>
          ))
        )}
      </div>

      {/* ─── INSTAGRAM COMMENTS DRAWER MODAL ─── */}
      {commentModal.isOpen && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4">
          <div className="bg-[#121212] w-full max-w-lg h-[70vh] sm:h-[80vh] sm:rounded-2xl rounded-t-3xl border border-[#262626] flex flex-col animate-slide-up sm:animate-none">
            <div className="flex justify-between items-center p-4 border-b border-[#262626]">
              <h3 className="font-bold text-white text-base w-full text-center">Comments</h3>
              <button
                onClick={() => setCommentModal({ isOpen: false, postId: null, comments: [] })}
                className="text-gray-400 hover:text-white absolute right-4 text-xl"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
              {loadingComments ? (
                <div className="flex justify-center items-center my-10">
                  <RiLoader4Line className="text-[#e1306c] text-3xl animate-spin" />
                </div>
              ) : commentModal.comments.length === 0 ? (
                <div className="text-center text-gray-500 my-10 text-xs">
                  No comments yet. Start the conversation!
                </div>
              ) : (
                commentModal.comments.map((c) => (
                  <div key={c.id} className="flex gap-3">
                    <img
                      src={
                        c.user_pic || "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
                      }
                      className="w-8 h-8 rounded-full object-cover shrink-0"
                      alt=""
                    />
                    <div className="min-w-0 flex-1">
                      <span className="font-bold text-xs text-white mr-2">{c.user_name}</span>
                      <span className="text-xs text-gray-300">{c.text}</span>
                      <div className="text-[10px] text-gray-500 mt-0.5">
                        {formatTime(c.created_at)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-3.5 border-t border-[#262626] bg-[#000000] flex gap-3 items-center pb-8 sm:pb-3.5">
              <img
                src={
                  currentUser?.profile_pic ||
                  "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
                }
                className="w-8 h-8 rounded-full object-cover shrink-0"
                alt=""
              />
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder={currentUser ? "Add a comment..." : "Log in to add a comment..."}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submitComment()}
                  className="w-full bg-[#181818] border border-[#262626] rounded-full pl-4 pr-14 py-2 text-xs text-white outline-none focus:border-[#e1306c]"
                />
                <button
                  onClick={submitComment}
                  disabled={!newComment.trim()}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 font-bold text-xs ${
                    newComment.trim() ? "text-[#e1306c]" : "text-gray-600"
                  }`}
                >
                  Post
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── INSTAGRAM SHARE SHEET MODAL ─── */}
      {sharingPost && (
        <SharePostModal
          isOpen={Boolean(sharingPost)}
          post={sharingPost}
          currentUser={currentUser}
          socket={socket}
          onClose={() => setSharingPost(null)}
        />
      )}

      {/* ─── GUEST AUTH PROMPT MODAL ─── */}
      <AuthPromptModal
        isOpen={authModal.isOpen}
        title={authModal.title}
        subtitle={authModal.subtitle}
        iconType={authModal.iconType}
        setPage={setPage}
        onClose={() => setAuthModal({ ...authModal, isOpen: false })}
      />
    </div>
  );
}

export default HomePage;
