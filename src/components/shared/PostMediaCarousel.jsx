import React, { useState, useMemo, useRef } from "react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { AiFillHeart } from "react-icons/ai";

/**
 * PostMediaCarousel
 * Instagram-Style Swipeable Multi-Photo Post Carousel
 *
 * @param {Object} props
 * @param {Object} props.post - The post object containing media_urls and/or image_url
 * @param {Function} [props.onDoubleTap] - Double tap handler: (e, postId, isLiked) => void
 * @param {string} [props.aspectRatio="aspect-square"] - Tailwind aspect-ratio or sizing class
 * @param {string} [props.objectFit="object-contain"] - CSS object fit: "object-contain" | "object-cover"
 * @param {boolean} [props.rounded=false] - Whether to apply rounded corners
 */
export default function PostMediaCarousel({
  post,
  onDoubleTap,
  aspectRatio = "aspect-square",
  objectFit = "object-contain",
  rounded = false,
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showHeartAnim, setShowHeartAnim] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Touch Swipe tracking refs
  const touchStartXRef = useRef(0);
  const touchStartYRef = useRef(0);
  const touchDeltaXRef = useRef(0);
  const isSwipingRef = useRef(false);

  // Normalize image list
  const images = useMemo(() => {
    if (!post) return [];
    if (Array.isArray(post.media_urls) && post.media_urls.length > 0) {
      return post.media_urls.filter(Boolean);
    }
    if (typeof post.media_urls === "string" && post.media_urls.trim()) {
      try {
        const parsed = JSON.parse(post.media_urls);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed.filter(Boolean);
      } catch (e) {
        // Postgres array string format {url1,url2}
        if (post.media_urls.startsWith("{") && post.media_urls.endsWith("}")) {
          const list = post.media_urls
            .slice(1, -1)
            .split(",")
            .map((s) => s.trim().replace(/^"|"$/g, ""))
            .filter(Boolean);
          if (list.length > 0) return list;
        }
      }
    }
    return post.image_url ? [post.image_url] : [];
  }, [post?.media_urls, post?.image_url]);

  const hasMultiple = images.length > 1;

  // Next / Previous navigation
  const handlePrev = (e) => {
    e?.stopPropagation();
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNext = (e) => {
    e?.stopPropagation();
    setCurrentIndex((prev) => Math.min(images.length - 1, prev + 1));
  };

  // Double tap to like
  const handleDoubleClick = (e) => {
    setShowHeartAnim(true);
    setTimeout(() => setShowHeartAnim(false), 900);
    if (onDoubleTap && post) {
      onDoubleTap(e, post.id, post.is_liked_by_me);
    }
  };

  // Touch handlers for mobile swipe
  const handleTouchStart = (e) => {
    if (!hasMultiple) return;
    const touch = e.touches[0];
    touchStartXRef.current = touch.clientX;
    touchStartYRef.current = touch.clientY;
    touchDeltaXRef.current = 0;
    isSwipingRef.current = true;
  };

  const handleTouchMove = (e) => {
    if (!isSwipingRef.current || !hasMultiple) return;
    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartXRef.current;
    const deltaY = touch.clientY - touchStartYRef.current;

    // Only swipe horizontally if movement is predominantly horizontal
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      touchDeltaXRef.current = deltaX;
    }
  };

  const handleTouchEnd = () => {
    if (!isSwipingRef.current || !hasMultiple) return;
    isSwipingRef.current = false;
    const deltaX = touchDeltaXRef.current;

    if (deltaX < -45 && currentIndex < images.length - 1) {
      // Swiped left -> next
      setCurrentIndex((prev) => prev + 1);
    } else if (deltaX > 45 && currentIndex > 0) {
      // Swiped right -> prev
      setCurrentIndex((prev) => prev - 1);
    }
    touchDeltaXRef.current = 0;
  };

  if (images.length === 0) {
    return (
      <div
        className={`relative w-full bg-neutral-900 ${aspectRatio} flex items-center justify-center text-gray-500 text-xs ${
          rounded ? "rounded-xl overflow-hidden" : ""
        }`}
      >
        <span>No media available</span>
      </div>
    );
  }

  return (
    <div
      className={`relative w-full bg-black ${aspectRatio} overflow-hidden select-none group cursor-pointer ${
        rounded ? "rounded-xl" : ""
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onDoubleClick={handleDoubleClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* ─── SLIDES TRACK ─── */}
      <div
        className="w-full h-full flex transition-transform duration-300 ease-out"
        style={{
          transform: `translateX(-${currentIndex * 100}%)`,
        }}
      >
        {images.map((imgUrl, idx) => (
          <div
            key={idx}
            className="min-w-full w-full h-full flex items-center justify-center bg-black overflow-hidden relative"
          >
            <img
              src={imgUrl}
              alt={post?.caption || `Slide ${idx + 1}`}
              className={`w-full h-full ${objectFit} pointer-events-none select-none`}
              loading={idx === 0 ? "eager" : "lazy"}
              draggable={false}
            />
          </div>
        ))}
      </div>

      {/* ─── FLOATING DOUBLE-TAP HEART ANIMATION ─── */}
      {showHeartAnim && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
          <AiFillHeart className="text-white text-8xl drop-shadow-[0_0_20px_rgba(237,73,86,0.9)] animate-ping" />
        </div>
      )}

      {/* ─── TOP RIGHT MULTI-IMAGE BADGE (Instagram Style) ─── */}
      {hasMultiple && (
        <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] font-bold text-white tracking-wide shadow-lg z-20 pointer-events-none select-none border border-white/10 flex items-center gap-1">
          <span>
            {currentIndex + 1}/{images.length}
          </span>
        </div>
      )}

      {/* ─── PREVIOUS ARROW BUTTON ─── */}
      {hasMultiple && currentIndex > 0 && (
        <button
          type="button"
          onClick={handlePrev}
          className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center shadow-lg backdrop-blur-sm z-20 transition-all duration-200 border border-white/15 active:scale-90 ${
            isHovered ? "opacity-100" : "opacity-0 md:group-hover:opacity-100"
          }`}
          aria-label="Previous image"
        >
          <FiChevronLeft size={20} />
        </button>
      )}

      {/* ─── NEXT ARROW BUTTON ─── */}
      {hasMultiple && currentIndex < images.length - 1 && (
        <button
          type="button"
          onClick={handleNext}
          className={`absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center shadow-lg backdrop-blur-sm z-20 transition-all duration-200 border border-white/15 active:scale-90 ${
            isHovered ? "opacity-100" : "opacity-0 md:group-hover:opacity-100"
          }`}
          aria-label="Next image"
        >
          <FiChevronRight size={20} />
        </button>
      )}

      {/* ─── BOTTOM DOT INDICATORS (Instagram Style) ─── */}
      {hasMultiple && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20 pointer-events-none">
          {images.map((_, idx) => (
            <span
              key={idx}
              className={`rounded-full transition-all duration-300 ${
                idx === currentIndex
                  ? "w-2 h-2 bg-[#0095f6] shadow-[0_0_8px_rgba(0,149,246,0.9)] scale-110"
                  : "w-1.5 h-1.5 bg-white/50 backdrop-blur-sm"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
