import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  FiArrowLeft,
  FiX,
  FiCheck,
  FiMaximize2,
  FiZoomIn,
  FiRotateCw,
  FiRefreshCw,
  FiSmile,
  FiMapPin,
  FiChevronDown,
  FiChevronUp,
  FiSliders,
} from "react-icons/fi";
import { BsGrid3X3, BsImages } from "react-icons/bs";
import VerifiedBadge from "./VerifiedBadge";

const API_BASE = process.env.REACT_APP_API_URL || "https://rentgf-and-bf.onrender.com";
const API = `${API_BASE}/api`;

// Instagram Filter Presets
export const INSTAGRAM_FILTERS = [
  { id: "normal", name: "Normal", filter: "none" },
  { id: "clarendon", name: "Clarendon", filter: "contrast(1.2) saturate(1.3) brightness(1.05)" },
  { id: "gingham", name: "Gingham", filter: "brightness(1.05) hue-rotate(-10deg) contrast(0.95)" },
  { id: "moon", name: "Moon", filter: "grayscale(1) contrast(1.15) brightness(1.1)" },
  { id: "lark", name: "Lark", filter: "contrast(0.95) brightness(1.15) saturate(1.2)" },
  {
    id: "reyes",
    name: "Reyes",
    filter: "sepia(0.25) brightness(1.1) contrast(0.85) saturate(0.75)",
  },
  { id: "juno", name: "Juno", filter: "contrast(1.15) brightness(1.1) saturate(1.35) sepia(0.12)" },
  { id: "slumber", name: "Slumber", filter: "saturate(0.66) brightness(1.05) sepia(0.35)" },
  { id: "crema", name: "Crema", filter: "sepia(0.4) contrast(1.2) brightness(1.1) saturate(0.9)" },
  { id: "ludwig", name: "Ludwig", filter: "saturate(1.25) contrast(1.1) brightness(1.02)" },
  {
    id: "aden",
    name: "Aden",
    filter: "hue-rotate(-20deg) contrast(0.9) saturate(0.85) brightness(1.18)",
  },
  { id: "perpetua", name: "Perpetua", filter: "contrast(1.1) brightness(1.05) saturate(1.1)" },
  { id: "valencia", name: "Valencia", filter: "sepia(0.25) contrast(1.08) brightness(1.08)" },
  { id: "xpro2", name: "X-Pro II", filter: "contrast(1.3) saturate(1.25) sepia(0.15)" },
];

const POPULAR_EMOJIS = [
  "😀",
  "❤️",
  "🔥",
  "✨",
  "☕",
  "😍",
  "👏",
  "📸",
  "🌸",
  "🎉",
  "💯",
  "🙌",
  "💕",
  "🌟",
  "😎",
  "🥳",
];

// Helper to compute combined CSS filter string
export function computeCombinedFilter(filterId, adjustments) {
  const preset = INSTAGRAM_FILTERS.find((f) => f.id === filterId);
  const baseFilter = preset && preset.filter !== "none" ? preset.filter : "";
  const parts = [];

  if (adjustments.brightness !== 0) {
    parts.push(`brightness(${1 + adjustments.brightness / 100})`);
  }
  if (adjustments.contrast !== 0) {
    parts.push(`contrast(${1 + adjustments.contrast / 100})`);
  }
  if (adjustments.saturation !== 0) {
    parts.push(`saturate(${1 + adjustments.saturation / 100})`);
  }
  if (adjustments.sepia > 0) {
    parts.push(`sepia(${adjustments.sepia / 100})`);
  }

  const combined = [baseFilter, ...parts].filter(Boolean).join(" ");
  return combined || "none";
}

export default function CreatePostModal({ isOpen, onClose, currentUser, onPostCreated }) {
  // Step workflow: "upload" | "crop" | "filter" | "details" | "sharing" | "success"
  const [step, setStep] = useState("upload");
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // Uploaded media state
  const [rawImageSrc, setRawImageSrc] = useState(null);
  const [imageMeta, setImageMeta] = useState({ width: 0, height: 0 });
  const [isDragOver, setIsDragOver] = useState(false);

  // Crop / Transform state
  const [aspectRatio, setAspectRatio] = useState("1:1"); // "original" | "1:1" | "4:5" | "16:9"
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [showAspectMenu, setShowAspectMenu] = useState(false);
  const [showZoomSlider, setShowZoomSlider] = useState(false);

  // Filter & Adjustments state
  const [selectedFilter, setSelectedFilter] = useState("normal");
  const [activeTab, setActiveTab] = useState("filters"); // "filters" | "adjustments"
  const [adjustments, setAdjustments] = useState({
    brightness: 0,
    contrast: 0,
    saturation: 0,
    sepia: 0,
  });

  // Post Details state
  const [caption, setCaption] = useState("");
  const [location, setLocation] = useState(currentUser?.city || "");
  const [altText, setAltText] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [showAccessibility, setShowAccessibility] = useState(false);

  // Instagram Settings Toggles
  const [showOnFeed, setShowOnFeed] = useState(true);
  const [showOnProfile, setShowOnProfile] = useState(true);
  const [followersOnly, setFollowersOnly] = useState(false);
  const [disableComments, setDisableComments] = useState(false);
  const [hideLikes, setHideLikes] = useState(false);

  // Progress & Sharing state
  const [uploadProgress, setUploadProgress] = useState(0);
  const [sharingError, setSharingError] = useState(null);

  // Refs
  const fileInputRef = useRef(null);
  const containerRef = useRef(null);
  const imageRef = useRef(null);
  const captionRef = useRef(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const initialOffsetRef = useRef({ x: 0, y: 0 });
  const touchDistanceRef = useRef(null);
  const gridTimeoutRef = useRef(null);

  // Reset all state
  const handleFullReset = useCallback(() => {
    setStep("upload");
    setShowDiscardConfirm(false);
    setRawImageSrc(null);
    setImageMeta({ width: 0, height: 0 });
    setAspectRatio("1:1");
    setZoom(1);
    setRotation(0);
    setOffset({ x: 0, y: 0 });
    setIsDragging(false);
    setShowGrid(false);
    setShowAspectMenu(false);
    setShowZoomSlider(false);
    setSelectedFilter("normal");
    setActiveTab("filters");
    setAdjustments({ brightness: 0, contrast: 0, saturation: 0, sepia: 0 });
    setCaption("");
    setLocation(currentUser?.city || "");
    setAltText("");
    setShowEmojiPicker(false);
    setShowAdvancedSettings(false);
    setShowAccessibility(false);
    setShowOnFeed(true);
    setShowOnProfile(true);
    setFollowersOnly(false);
    setDisableComments(false);
    setHideLikes(false);
    setUploadProgress(0);
    setSharingError(null);
  }, [currentUser]);

  // Handle Close with Discard Warning
  const handleRequestClose = () => {
    if (step === "sharing") return; // cannot cancel during upload
    if (step === "success" || step === "upload" || !rawImageSrc) {
      handleFullReset();
      onClose();
    } else {
      setShowDiscardConfirm(true);
    }
  };

  const handleConfirmDiscard = () => {
    handleFullReset();
    onClose();
  };

  // Flash 3x3 grid when user touches or drags crop area
  const triggerGrid = () => {
    setShowGrid(true);
    if (gridTimeoutRef.current) clearTimeout(gridTimeoutRef.current);
    gridTimeoutRef.current = setTimeout(() => {
      setShowGrid(false);
    }, 1000);
  };

  // File loading
  const processFile = (file) => {
    if (!file || !file.type.startsWith("image/")) {
      alert("Please select a valid image file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      const img = new Image();
      img.onload = () => {
        setImageMeta({ width: img.naturalWidth, height: img.naturalHeight });
        setRawImageSrc(dataUrl);
        setStep("crop");
        setZoom(1);
        setRotation(0);
        setOffset({ x: 0, y: 0 });
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  // Offset Clamping to prevent black gaps
  const clampOffset = useCallback(
    (candX, candY, currentZoom = zoom) => {
      if (!containerRef.current || !imageRef.current) return { x: candX, y: candY };
      const container = containerRef.current.getBoundingClientRect();
      const img = imageRef.current;
      if (!img.naturalWidth || !img.naturalHeight) return { x: candX, y: candY };

      const isSideways = rotation % 180 !== 0;
      const naturalW = isSideways ? img.naturalHeight : img.naturalWidth;
      const naturalH = isSideways ? img.naturalWidth : img.naturalHeight;

      const scaleToCover =
        Math.max(container.width / naturalW, container.height / naturalH) * currentZoom;
      const dispW = naturalW * scaleToCover;
      const dispH = naturalH * scaleToCover;

      const maxX = Math.max(0, (dispW - container.width) / 2);
      const maxY = Math.max(0, (dispH - container.height) / 2);

      return {
        x: Math.min(Math.max(candX, -maxX), maxX),
        y: Math.min(Math.max(candY, -maxY), maxY),
      };
    },
    [zoom, rotation]
  );

  // Mouse drag handlers
  const handleMouseDown = (e) => {
    if (step !== "crop") return;
    e.preventDefault();
    setIsDragging(true);
    triggerGrid();
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    initialOffsetRef.current = { ...offset };
  };

  const handleMouseMove = useCallback(
    (e) => {
      if (!isDragging) return;
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      setOffset(clampOffset(initialOffsetRef.current.x + dx, initialOffsetRef.current.y + dy));
    },
    [isDragging, clampOffset]
  );

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      setShowGrid(false);
    }
  }, [isDragging]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Touch drag & pinch zoom
  const handleTouchStart = (e) => {
    if (step !== "crop") return;
    if (e.touches.length === 1) {
      setIsDragging(true);
      triggerGrid();
      dragStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      initialOffsetRef.current = { ...offset };
    } else if (e.touches.length === 2) {
      setIsDragging(false);
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchDistanceRef.current = dist;
    }
  };

  const handleTouchMove = (e) => {
    if (step !== "crop") return;
    if (e.touches.length === 1 && isDragging) {
      const dx = e.touches[0].clientX - dragStartRef.current.x;
      const dy = e.touches[0].clientY - dragStartRef.current.y;
      setOffset(clampOffset(initialOffsetRef.current.x + dx, initialOffsetRef.current.y + dy));
    } else if (e.touches.length === 2 && touchDistanceRef.current !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const delta = dist - touchDistanceRef.current;
      touchDistanceRef.current = dist;
      setZoom((prev) => {
        const nextZoom = Math.min(Math.max(prev + delta * 0.008, 1), 3);
        setOffset((prevOff) => clampOffset(prevOff.x, prevOff.y, nextZoom));
        return nextZoom;
      });
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    touchDistanceRef.current = null;
    setShowGrid(false);
  };

  // Mouse wheel zoom
  const handleWheel = (e) => {
    if (step !== "crop") return;
    e.preventDefault();
    triggerGrid();
    const delta = -e.deltaY * 0.0015;
    setZoom((prev) => {
      const nextZoom = Math.min(Math.max(prev + delta, 1), 3);
      setOffset((prevOff) => clampOffset(prevOff.x, prevOff.y, nextZoom));
      return nextZoom;
    });
  };

  // Rotation
  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
    setOffset({ x: 0, y: 0 });
    triggerGrid();
  };

  // Reset Crop
  const handleResetCrop = () => {
    setZoom(1);
    setRotation(0);
    setOffset({ x: 0, y: 0 });
    setShowGrid(false);
  };

  // Compute aspect ratio CSS style for preview box
  const getAspectRatioStyle = () => {
    switch (aspectRatio) {
      case "4:5":
        return { aspectRatio: "4 / 5" };
      case "16:9":
        return { aspectRatio: "16 / 9" };
      case "original":
        if (imageMeta.width && imageMeta.height) {
          const isSideways = rotation % 180 !== 0;
          const w = isSideways ? imageMeta.height : imageMeta.width;
          const h = isSideways ? imageMeta.width : imageMeta.height;
          return { aspectRatio: `${w} / ${h}` };
        }
        return { aspectRatio: "1 / 1" };
      case "1:1":
      default:
        return { aspectRatio: "1 / 1" };
    }
  };

  // Rasterize image with Crop, Rotation & CSS Filters onto Canvas
  const rasterizeFinalImage = async () => {
    return new Promise((resolve, reject) => {
      try {
        const img = imageRef.current;
        const container = containerRef.current?.getBoundingClientRect();
        if (!img || !container) {
          return reject(new Error("Image element not ready"));
        }

        const naturalW = img.naturalWidth;
        const naturalH = img.naturalHeight;

        let targetW = 1080;
        let targetH = 1080;
        if (aspectRatio === "4:5") {
          targetW = 1080;
          targetH = 1350;
        } else if (aspectRatio === "16:9") {
          targetW = 1080;
          targetH = 608;
        } else if (aspectRatio === "original") {
          const isSideways = rotation % 180 !== 0;
          const srcW = isSideways ? naturalH : naturalW;
          const srcH = isSideways ? naturalW : naturalH;
          const r = srcW / srcH;
          if (r >= 1) {
            targetW = 1080;
            targetH = Math.round(1080 / r);
          } else {
            targetH = 1080;
            targetW = Math.round(1080 * r);
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Unable to create canvas context"));

        // Fill background
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, targetW, targetH);

        // Apply CSS Filter
        const filterStr = computeCombinedFilter(selectedFilter, adjustments);
        if (filterStr && filterStr !== "none") {
          ctx.filter = filterStr;
        }

        ctx.save();
        ctx.translate(targetW / 2, targetH / 2);
        ctx.rotate((rotation * Math.PI) / 180);

        const containerScale = targetW / container.width;
        const isSideways = rotation % 180 !== 0;
        const effectiveSrcW = isSideways ? naturalH : naturalW;
        const effectiveSrcH = isSideways ? naturalW : naturalH;

        const scaleToCover =
          Math.max(container.width / effectiveSrcW, container.height / effectiveSrcH) * zoom;
        const totalScale = scaleToCover * containerScale;

        const drawW = naturalW * totalScale;
        const drawH = naturalH * totalScale;

        const offX = offset.x * containerScale;
        const offY = offset.y * containerScale;

        let finalOffX = offX;
        let finalOffY = offY;
        if (rotation === 90) {
          finalOffX = offY;
          finalOffY = -offX;
        } else if (rotation === 180) {
          finalOffX = -offX;
          finalOffY = -offY;
        } else if (rotation === 270) {
          finalOffX = -offY;
          finalOffY = offX;
        }

        ctx.drawImage(img, -drawW / 2 + finalOffX, -drawH / 2 + finalOffY, drawW, drawH);
        ctx.restore();

        canvas.toBlob(
          (blob) => {
            if (!blob) return reject(new Error("Canvas export failed"));
            const file = new File([blob], `insta_post_${Date.now()}.jpg`, {
              type: "image/jpeg",
              lastModified: Date.now(),
            });
            resolve(file);
          },
          "image/jpeg",
          0.92
        );
      } catch (err) {
        reject(err);
      }
    });
  };

  // Final Submit / Share
  const handlePostSubmit = async () => {
    if (!currentUser) return;
    setStep("sharing");
    setSharingError(null);
    setUploadProgress(15);

    try {
      const finalImageFile = await rasterizeFinalImage();
      setUploadProgress(45);

      const formData = new FormData();
      formData.append("post_image", finalImageFile);
      formData.append("caption", caption.trim());
      formData.append("location", location.trim());
      formData.append("show_on_feed", showOnFeed);
      formData.append("show_on_profile", showOnProfile);
      formData.append("followers_only", followersOnly);
      formData.append("disable_comments", disableComments);
      formData.append("hide_likes", hideLikes);

      setUploadProgress(70);

      const token = localStorage.getItem("token");
      const response = await fetch(`${API}/posts/${currentUser.id}`, {
        method: "POST",
        body: formData,
        headers: { Authorization: `Bearer ${token}` },
      });

      setUploadProgress(95);

      if (response.ok) {
        const data = await response.json();
        const createdPost = data.post || {};

        // Dispatch instant event for feed update
        const formattedPost = {
          ...createdPost,
          user_name: currentUser.name,
          user_pic: currentUser.profile_pic,
          user_role: currentUser.role,
          user_city: location || currentUser.city,
          location: location || currentUser.city,
          total_likes: 0,
          total_comments: 0,
          is_liked_by_me: false,
          is_followed_by_me: false,
          is_saved_by_me: false,
        };

        window.dispatchEvent(
          new CustomEvent("post-created", {
            detail: formattedPost,
          })
        );

        if (onPostCreated) {
          onPostCreated(formattedPost);
        }

        setUploadProgress(100);
        setStep("success");
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to publish post.");
      }
    } catch (err) {
      console.error("Post creation error:", err);
      setSharingError(err.message || "An unexpected error occurred while sharing.");
      setStep("details");
    }
  };

  // Insert Emoji into caption
  const handleInsertEmoji = (emoji) => {
    const textarea = captionRef.current;
    if (!textarea) {
      setCaption((prev) => prev + emoji);
      return;
    }
    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || 0;
    const nextCaption = caption.substring(0, start) + emoji + caption.substring(end);
    if (nextCaption.length <= 500) {
      setCaption(nextCaption);
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + emoji.length;
        textarea.focus();
      }, 0);
    }
  };

  // Keyboard navigation (ESC to close)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      if (e.key === "Escape") {
        handleRequestClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, step, rawImageSrc]);

  if (!isOpen) return null;

  const combinedFilter = computeCombinedFilter(selectedFilter, adjustments);

  return (
    <div className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-md flex items-center justify-center p-0 sm:p-4 select-none animate-fade-in">
      {/* Floating Outside Close Button (Instagram Desktop) */}
      <button
        onClick={handleRequestClose}
        className="absolute top-4 right-4 z-50 text-white/80 hover:text-white p-2 rounded-full hover:bg-white/10 transition"
        title="Close (Esc)"
      >
        <FiX size={26} />
      </button>

      {/* Main Instagram Modal Box */}
      <div
        className={`bg-[#262626] text-white flex flex-col overflow-hidden shadow-2xl transition-all duration-300 w-full sm:rounded-2xl border border-white/10 ${
          step === "upload" || step === "sharing" || step === "success"
            ? "max-w-[480px] h-[520px] rounded-none sm:rounded-2xl"
            : "max-w-[940px] h-full sm:h-[620px] max-h-screen"
        }`}
      >
        {/* ─── Top Instagram Navigation Header ─── */}
        <div className="h-12 border-b border-[#363636] flex items-center justify-between px-4 bg-[#262626] shrink-0 z-20">
          {/* Left Button */}
          <div className="w-16 flex items-center">
            {step === "crop" && (
              <button
                onClick={() => setStep("upload")}
                className="text-white hover:text-gray-300 transition p-1"
                title="Back to file selection"
              >
                <FiArrowLeft size={22} />
              </button>
            )}
            {step === "filter" && (
              <button
                onClick={() => setStep("crop")}
                className="text-white hover:text-gray-300 transition p-1"
                title="Back to crop"
              >
                <FiArrowLeft size={22} />
              </button>
            )}
            {step === "details" && (
              <button
                onClick={() => setStep("filter")}
                className="text-white hover:text-gray-300 transition p-1"
                title="Back to filters"
              >
                <FiArrowLeft size={22} />
              </button>
            )}
          </div>

          {/* Center Title */}
          <h3 className="font-bold text-sm sm:text-base text-white text-center flex-1 truncate">
            {step === "upload" && "Create new post"}
            {step === "crop" && "Crop"}
            {step === "filter" && "Edit"}
            {step === "details" && "Create new post"}
            {step === "sharing" && "Sharing"}
            {step === "success" && "Post Shared"}
          </h3>

          {/* Right Action Button */}
          <div className="w-16 flex items-center justify-end">
            {step === "crop" && (
              <button
                onClick={() => setStep("filter")}
                className="text-[#0095f6] hover:text-[#1877f2] font-semibold text-sm transition"
              >
                Next
              </button>
            )}
            {step === "filter" && (
              <button
                onClick={() => setStep("details")}
                className="text-[#0095f6] hover:text-[#1877f2] font-semibold text-sm transition"
              >
                Next
              </button>
            )}
            {step === "details" && (
              <button
                onClick={handlePostSubmit}
                className="text-[#0095f6] hover:text-[#1877f2] font-semibold text-sm transition"
              >
                Share
              </button>
            )}
          </div>
        </div>

        {/* ─── Error Notification Banner (if any) ─── */}
        {sharingError && (
          <div className="bg-red-500/20 text-red-300 px-4 py-2 text-xs flex items-center justify-between border-b border-red-500/30">
            <span>{sharingError}</span>
            <button onClick={() => setSharingError(null)} className="text-white font-bold ml-2">
              ✕
            </button>
          </div>
        )}

        {/* ─── STEP 1: MEDIA UPLOAD / DROPZONE ─── */}
        {step === "upload" && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            className={`flex-1 flex flex-col items-center justify-center p-8 text-center transition bg-[#181818] ${
              isDragOver ? "bg-[#0095f6]/10 border-2 border-dashed border-[#0095f6]" : ""
            }`}
          >
            {/* Instagram Photo / Media SVG Graphic */}
            <div className="w-24 h-24 mb-4 text-gray-300 flex items-center justify-center">
              <svg
                aria-label="Media icon"
                className="w-20 h-20 fill-current text-white/90"
                viewBox="0 0 97.6 77.3"
              >
                <path d="M16.3 24h.3c2.8-.2 4.9-2.6 4.8-5.4-.2-2.8-2.6-4.9-5.4-4.8s-4.9 2.6-4.8 5.4c.1 2.7 2.4 4.8 5.1 4.8zm-2.4-7.2c.5-.6 1.3-1 2.1-1h.2c1.7 0 3.1 1.4 3.1 3.1 0 1.7-1.4 3.1-3.1 3.1-1.7 0-3.1-1.4-3.1-3.1 0-.8.3-1.5.8-2.1z" />
                <path d="M84.7 18.4L58 16.9l-.2-3c-.3-5.7-5.2-10.1-11-9.8L12.9 6c-5.7.3-10.1 5.3-9.8 11L5 51v.1c.7 6.7 6.2 11.9 12.9 11.9.7 0 1.4 0 2.1-.1l58.6-2.9c6.7-.7 11.9-6.2 11.9-12.9V28.4c.1-5.5-4.2-10-9.8-10zm-4.7 39.4c0 3.6-2.9 6.6-6.5 6.8l-58.6 3c-.5 0-.9 0-1.4-.1-3.6 0-6.6-2.9-6.9-6.5L4.5 17.1c-.2-3.6 2.6-6.6 6.2-6.8l33.9-1.9c3.6-.2 6.6 2.6 6.8 6.2l.2 3-21.7 1.1c-5.7.3-10.1 5.3-9.8 11l2 34.3c.3 5.7 5.3 10.1 11 9.8l40.1-2c3.6-.2 6.6 2.6 6.8 6.2l.1 1.4zm13.6-11.8c0 3.6-2.9 6.6-6.5 6.8l-40.1 2c-3.6.2-6.6-2.6-6.8-6.2l-2-34.3c-.2-3.6 2.6-6.6 6.2-6.8l42.7-2.1c3.6-.2 6.6 2.6 6.8 6.2l-.3 34.4z" />
              </svg>
            </div>

            <p className="text-xl text-white font-light mb-2">Drag photos and videos here</p>
            <p className="text-xs text-gray-400 mb-6">Supports High Quality JPG, PNG, WEBP</p>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-[#0095f6] hover:bg-[#1877f2] text-white font-semibold text-sm px-4 py-2 rounded-lg transition active:scale-95 shadow-md flex items-center gap-2"
            >
              <BsImages size={16} />
              Select from computer
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileInputChange}
            />
          </div>
        )}

        {/* ─── STEP 2: CROP & ADJUST VIEW ─── */}
        {step === "crop" && (
          <div className="flex-1 bg-black relative flex items-center justify-center overflow-hidden">
            {/* Aspect container wrapper */}
            <div
              ref={containerRef}
              style={getAspectRatioStyle()}
              className="relative max-h-full max-w-full w-full h-full flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing select-none"
              onMouseDown={handleMouseDown}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onWheel={handleWheel}
            >
              {/* Scalable & Draggable Image */}
              {rawImageSrc && (
                <img
                  ref={imageRef}
                  src={rawImageSrc}
                  alt="Crop preview"
                  draggable={false}
                  className="max-w-none pointer-events-none select-none"
                  style={{
                    transform: `translate(${offset.x}px, ${offset.y}px) rotate(${rotation}deg) scale(${zoom})`,
                    transformOrigin: "center center",
                    transition: isDragging ? "none" : "transform 0.15s ease-out",
                  }}
                />
              )}

              {/* 3x3 Rule-of-Thirds Grid Overlay */}
              {showGrid && (
                <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 border border-white/20 animate-fade-in">
                  <div className="border-r border-b border-white/25"></div>
                  <div className="border-r border-b border-white/25"></div>
                  <div className="border-b border-white/25"></div>
                  <div className="border-r border-b border-white/25"></div>
                  <div className="border-r border-b border-white/25"></div>
                  <div className="border-b border-white/25"></div>
                  <div className="border-r border-white/25"></div>
                  <div className="border-r border-white/25"></div>
                  <div></div>
                </div>
              )}
            </div>

            {/* Bottom-Left Controls Bar */}
            <div className="absolute bottom-4 left-4 z-20 flex items-center gap-3">
              {/* Aspect Ratio Selector Button */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowAspectMenu((prev) => !prev);
                    setShowZoomSlider(false);
                  }}
                  className={`w-9 h-9 rounded-full bg-black/75 hover:bg-black text-white flex items-center justify-center backdrop-blur-md border border-white/10 transition shadow-lg ${
                    showAspectMenu ? "bg-white text-black" : ""
                  }`}
                  title="Select aspect ratio"
                >
                  <FiMaximize2 size={16} />
                </button>

                {/* Aspect Ratio Menu Popup */}
                {showAspectMenu && (
                  <div className="absolute bottom-12 left-0 bg-[#262626] rounded-xl border border-white/15 p-1.5 shadow-2xl flex flex-col gap-1 w-32 z-30 animate-fade-in">
                    {[
                      { id: "original", label: "Original" },
                      { id: "1:1", label: "1:1 Square" },
                      { id: "4:5", label: "4:5 Portrait" },
                      { id: "16:9", label: "16:9 Wide" },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => {
                          setAspectRatio(opt.id);
                          setShowAspectMenu(false);
                          setOffset({ x: 0, y: 0 });
                          triggerGrid();
                        }}
                        className={`text-left px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                          aspectRatio === opt.id
                            ? "bg-white/20 text-white font-bold"
                            : "text-gray-300 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Zoom Selector Button */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowZoomSlider((prev) => !prev);
                    setShowAspectMenu(false);
                  }}
                  className={`w-9 h-9 rounded-full bg-black/75 hover:bg-black text-white flex items-center justify-center backdrop-blur-md border border-white/10 transition shadow-lg ${
                    showZoomSlider ? "bg-white text-black" : ""
                  }`}
                  title="Zoom"
                >
                  <FiZoomIn size={16} />
                </button>

                {/* Zoom Slider Popup */}
                {showZoomSlider && (
                  <div className="absolute bottom-12 left-0 bg-[#262626] rounded-xl border border-white/15 px-4 py-2.5 shadow-2xl flex items-center gap-3 w-48 z-30 animate-fade-in">
                    <input
                      type="range"
                      min="1"
                      max="3"
                      step="0.05"
                      value={zoom}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setZoom(val);
                        setOffset((prevOff) => clampOffset(prevOff.x, prevOff.y, val));
                        triggerGrid();
                      }}
                      className="w-full accent-white h-1 bg-white/20 rounded-lg cursor-pointer"
                    />
                    <span className="text-[10px] text-gray-300 font-mono w-6 text-right">
                      {zoom.toFixed(1)}x
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom-Right Controls Bar */}
            <div className="absolute bottom-4 right-4 z-20 flex items-center gap-2">
              <button
                onClick={handleRotate}
                className="w-9 h-9 rounded-full bg-black/75 hover:bg-black text-white flex items-center justify-center backdrop-blur-md border border-white/10 transition shadow-lg"
                title="Rotate 90°"
              >
                <FiRotateCw size={16} />
              </button>
              <button
                onClick={handleResetCrop}
                className="w-9 h-9 rounded-full bg-black/75 hover:bg-black text-white flex items-center justify-center backdrop-blur-md border border-white/10 transition shadow-lg"
                title="Reset Crop"
              >
                <FiRefreshCw size={14} />
              </button>
            </div>
          </div>
        )}

        {/* ─── STEP 3: EDIT (FILTERS & ADJUSTMENTS) ─── */}
        {step === "filter" && (
          <div className="flex-1 flex flex-col sm:flex-row overflow-hidden bg-[#121212]">
            {/* Left: Filtered Image Live Preview */}
            <div className="flex-1 bg-black flex items-center justify-center overflow-hidden p-2 sm:p-4">
              <div
                style={getAspectRatioStyle()}
                className="relative max-h-full max-w-full w-full h-full flex items-center justify-center overflow-hidden"
              >
                {rawImageSrc && (
                  <img
                    src={rawImageSrc}
                    alt="Filter Preview"
                    draggable={false}
                    className="max-w-none pointer-events-none select-none transition-[filter] duration-150"
                    style={{
                      transform: `translate(${offset.x}px, ${offset.y}px) rotate(${rotation}deg) scale(${zoom})`,
                      transformOrigin: "center center",
                      filter: combinedFilter,
                    }}
                  />
                )}
              </div>
            </div>

            {/* Right: Filters & Adjustments Tabs Panel */}
            <div className="w-full sm:w-[320px] bg-[#262626] border-t sm:border-t-0 sm:border-l border-[#363636] flex flex-col shrink-0 h-[260px] sm:h-full">
              {/* Tab Navigation */}
              <div className="flex border-b border-[#363636]">
                <button
                  onClick={() => setActiveTab("filters")}
                  className={`flex-1 py-3 text-xs font-semibold uppercase tracking-wider text-center transition ${
                    activeTab === "filters"
                      ? "text-white border-b-2 border-white"
                      : "text-gray-400 hover:text-gray-200"
                  }`}
                >
                  Filters
                </button>
                <button
                  onClick={() => setActiveTab("adjustments")}
                  className={`flex-1 py-3 text-xs font-semibold uppercase tracking-wider text-center transition ${
                    activeTab === "adjustments"
                      ? "text-white border-b-2 border-white"
                      : "text-gray-400 hover:text-gray-200"
                  }`}
                >
                  Adjustments
                </button>
              </div>

              {/* Filters Grid */}
              {activeTab === "filters" && (
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                  <div className="grid grid-cols-3 gap-3">
                    {INSTAGRAM_FILTERS.map((f) => (
                      <button
                        key={f.id}
                        onClick={() => setSelectedFilter(f.id)}
                        className="flex flex-col items-center group focus:outline-none"
                      >
                        <div
                          className={`w-20 h-20 rounded-lg overflow-hidden border-2 transition mb-1 bg-black flex items-center justify-center ${
                            selectedFilter === f.id
                              ? "border-[#0095f6] ring-2 ring-[#0095f6]/50 scale-105"
                              : "border-transparent group-hover:border-white/40"
                          }`}
                        >
                          <img
                            src={rawImageSrc}
                            alt={f.name}
                            className="w-full h-full object-cover"
                            style={{ filter: f.filter }}
                          />
                        </div>
                        <span
                          className={`text-[11px] truncate max-w-full ${
                            selectedFilter === f.id ? "text-[#0095f6] font-bold" : "text-gray-400"
                          }`}
                        >
                          {f.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Adjustments Panel */}
              {activeTab === "adjustments" && (
                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                  {/* Brightness */}
                  <div>
                    <div className="flex justify-between text-xs text-gray-300 mb-1.5">
                      <span>Brightness</span>
                      <span className="font-mono text-gray-400">
                        {adjustments.brightness > 0
                          ? `+${adjustments.brightness}`
                          : adjustments.brightness}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="-50"
                      max="50"
                      value={adjustments.brightness}
                      onChange={(e) =>
                        setAdjustments((prev) => ({
                          ...prev,
                          brightness: parseInt(e.target.value),
                        }))
                      }
                      className="w-full accent-[#0095f6] h-1 bg-white/10 rounded-lg cursor-pointer"
                    />
                  </div>

                  {/* Contrast */}
                  <div>
                    <div className="flex justify-between text-xs text-gray-300 mb-1.5">
                      <span>Contrast</span>
                      <span className="font-mono text-gray-400">
                        {adjustments.contrast > 0
                          ? `+${adjustments.contrast}`
                          : adjustments.contrast}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="-50"
                      max="50"
                      value={adjustments.contrast}
                      onChange={(e) =>
                        setAdjustments((prev) => ({
                          ...prev,
                          contrast: parseInt(e.target.value),
                        }))
                      }
                      className="w-full accent-[#0095f6] h-1 bg-white/10 rounded-lg cursor-pointer"
                    />
                  </div>

                  {/* Saturation */}
                  <div>
                    <div className="flex justify-between text-xs text-gray-300 mb-1.5">
                      <span>Saturation</span>
                      <span className="font-mono text-gray-400">
                        {adjustments.saturation > 0
                          ? `+${adjustments.saturation}`
                          : adjustments.saturation}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="-50"
                      max="50"
                      value={adjustments.saturation}
                      onChange={(e) =>
                        setAdjustments((prev) => ({
                          ...prev,
                          saturation: parseInt(e.target.value),
                        }))
                      }
                      className="w-full accent-[#0095f6] h-1 bg-white/10 rounded-lg cursor-pointer"
                    />
                  </div>

                  {/* Warmth / Sepia */}
                  <div>
                    <div className="flex justify-between text-xs text-gray-300 mb-1.5">
                      <span>Warmth</span>
                      <span className="font-mono text-gray-400">+{adjustments.sepia}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="50"
                      value={adjustments.sepia}
                      onChange={(e) =>
                        setAdjustments((prev) => ({
                          ...prev,
                          sepia: parseInt(e.target.value),
                        }))
                      }
                      className="w-full accent-[#0095f6] h-1 bg-white/10 rounded-lg cursor-pointer"
                    />
                  </div>

                  {/* Reset Adjustments button */}
                  <div className="pt-2 text-center">
                    <button
                      onClick={() =>
                        setAdjustments({
                          brightness: 0,
                          contrast: 0,
                          saturation: 0,
                          sepia: 0,
                        })
                      }
                      className="text-xs text-[#0095f6] hover:text-[#1877f2] font-semibold"
                    >
                      Reset Adjustments
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── STEP 4: DETAILS, CAPTION, LOCATION & SETTINGS ─── */}
        {step === "details" && (
          <div className="flex-1 flex flex-col sm:flex-row overflow-hidden bg-[#121212]">
            {/* Left: Final Photo Preview */}
            <div className="hidden sm:flex flex-1 bg-black items-center justify-center p-4 overflow-hidden">
              <div
                style={getAspectRatioStyle()}
                className="relative max-h-full max-w-full w-full h-full flex items-center justify-center overflow-hidden rounded-lg shadow-inner"
              >
                {rawImageSrc && (
                  <img
                    src={rawImageSrc}
                    alt="Final preview"
                    className="max-w-none pointer-events-none select-none"
                    style={{
                      transform: `translate(${offset.x}px, ${offset.y}px) rotate(${rotation}deg) scale(${zoom})`,
                      transformOrigin: "center center",
                      filter: combinedFilter,
                    }}
                  />
                )}
              </div>
            </div>

            {/* Right: Caption, Location, Advanced Settings */}
            <div className="w-full sm:w-[380px] bg-[#262626] border-l border-[#363636] flex flex-col h-full overflow-y-auto custom-scrollbar">
              {/* User Header */}
              <div className="p-4 border-b border-[#363636] flex items-center gap-3">
                <img
                  src={
                    currentUser?.profile_pic ||
                    (currentUser?.role === "boy"
                      ? "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
                      : "https://cdn-icons-png.flaticon.com/512/3135/3135768.png")
                  }
                  alt={currentUser?.name}
                  className="w-9 h-9 rounded-full object-cover border border-white/10"
                />
                <div className="flex items-center gap-1.5 flex-1 truncate">
                  <span className="font-semibold text-sm text-white truncate">
                    {currentUser?.name}
                  </span>
                  <VerifiedBadge
                    isVerified={Boolean(
                      currentUser?.kyc_status === "verified" || currentUser?.is_verified
                    )}
                    size="sm"
                  />
                </div>
              </div>

              {/* Caption Input Section */}
              <div className="p-4 flex flex-col gap-2">
                <textarea
                  ref={captionRef}
                  value={caption}
                  maxLength={500}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Write a caption..."
                  rows={4}
                  className="w-full bg-transparent text-sm text-white placeholder-gray-500 resize-none outline-none focus:ring-0 custom-scrollbar"
                />

                {/* Character Counter & Emoji Toggle */}
                <div className="flex items-center justify-between pt-1 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker((prev) => !prev)}
                    className="text-gray-400 hover:text-white p-1 rounded transition"
                    title="Insert emoji"
                  >
                    <FiSmile size={18} />
                  </button>
                  <span className="text-[11px] text-gray-500 font-mono">{caption.length}/500</span>
                </div>

                {/* Quick Emoji Bar */}
                {showEmojiPicker && (
                  <div className="bg-[#1e1e1e] p-2 rounded-xl border border-white/10 flex flex-wrap gap-1.5 animate-fade-in">
                    {POPULAR_EMOJIS.map((em) => (
                      <button
                        key={em}
                        type="button"
                        onClick={() => handleInsertEmoji(em)}
                        className="text-lg hover:scale-125 transition p-1"
                      >
                        {em}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Location Input Section */}
              <div className="px-4 py-3 border-t border-[#363636] flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1">
                  <FiMapPin size={17} className="text-gray-400 shrink-0" />
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Add location"
                    className="bg-transparent text-sm text-white placeholder-gray-500 outline-none w-full"
                  />
                </div>
                {currentUser?.city && location !== currentUser.city && (
                  <button
                    type="button"
                    onClick={() => setLocation(currentUser.city)}
                    className="text-[11px] text-[#0095f6] hover:underline shrink-0 font-medium ml-2"
                  >
                    Use {currentUser.city}
                  </button>
                )}
              </div>

              {/* Accessibility (Alt text) Accordion */}
              <div className="border-t border-[#363636]">
                <button
                  type="button"
                  onClick={() => setShowAccessibility((prev) => !prev)}
                  className="w-full px-4 py-3 flex items-center justify-between text-sm text-gray-200 hover:bg-white/5 transition"
                >
                  <span>Accessibility</span>
                  {showAccessibility ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
                </button>
                {showAccessibility && (
                  <div className="px-4 pb-3 animate-fade-in">
                    <p className="text-[11px] text-gray-400 mb-2">
                      Alt text describes your photos for people with visual impairments.
                    </p>
                    <input
                      type="text"
                      value={altText}
                      onChange={(e) => setAltText(e.target.value)}
                      placeholder="Write alt text..."
                      className="w-full bg-[#181818] border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 outline-none focus:border-[#0095f6]"
                    />
                  </div>
                )}
              </div>

              {/* Advanced Settings Accordion */}
              <div className="border-t border-[#363636]">
                <button
                  type="button"
                  onClick={() => setShowAdvancedSettings((prev) => !prev)}
                  className="w-full px-4 py-3 flex items-center justify-between text-sm text-gray-200 hover:bg-white/5 transition"
                >
                  <span>Advanced settings</span>
                  {showAdvancedSettings ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
                </button>

                {showAdvancedSettings && (
                  <div className="px-4 pb-4 space-y-4 animate-fade-in">
                    {/* Show on Feed */}
                    <div className="flex items-center justify-between">
                      <div className="pr-2">
                        <div className="text-xs font-semibold text-white">Show on Explore Feed</div>
                        <div className="text-[11px] text-gray-400">
                          Make visible in global Explore feed
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          checked={showOnFeed}
                          onChange={(e) => setShowOnFeed(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-white/15 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#0095f6]"></div>
                      </label>
                    </div>

                    {/* Show on Profile Grid */}
                    <div className="flex items-center justify-between">
                      <div className="pr-2">
                        <div className="text-xs font-semibold text-white">Show on Profile Grid</div>
                        <div className="text-[11px] text-gray-400">
                          Show this photo in your profile grid
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          checked={showOnProfile}
                          onChange={(e) => setShowOnProfile(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-white/15 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#0095f6]"></div>
                      </label>
                    </div>

                    {/* Followers Only */}
                    <div className="flex items-center justify-between">
                      <div className="pr-2">
                        <div className="text-xs font-semibold text-white">Followers Only</div>
                        <div className="text-[11px] text-gray-400">
                          Only your followers can see this post
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          checked={followersOnly}
                          onChange={(e) => setFollowersOnly(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-white/15 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#0095f6]"></div>
                      </label>
                    </div>

                    {/* Turn off commenting */}
                    <div className="flex items-center justify-between">
                      <div className="pr-2">
                        <div className="text-xs font-semibold text-white">Turn off commenting</div>
                        <div className="text-[11px] text-gray-400">
                          You can change this later from post menu
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          checked={disableComments}
                          onChange={(e) => setDisableComments(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-white/15 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#0095f6]"></div>
                      </label>
                    </div>

                    {/* Hide likes count */}
                    <div className="flex items-center justify-between">
                      <div className="pr-2">
                        <div className="text-xs font-semibold text-white">
                          Hide like and view counts
                        </div>
                        <div className="text-[11px] text-gray-400">
                          Only you will see total likes on this post
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          checked={hideLikes}
                          onChange={(e) => setHideLikes(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-white/15 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#0095f6]"></div>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─── STEP 5: SHARING PROGRESS ─── */}
        {step === "sharing" && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#181818] animate-fade-in">
            {/* Instagram pulsing gradient spinner */}
            <div className="w-20 h-20 rounded-full p-[3px] bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] animate-spin mb-6">
              <div className="w-full h-full bg-[#181818] rounded-full flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#f09433] to-[#bc1888] opacity-80 animate-pulse"></div>
              </div>
            </div>

            <h4 className="text-lg font-semibold text-white mb-2">Sharing your post...</h4>
            <p className="text-xs text-gray-400 mb-6 max-w-xs">
              Applying filters, optimizing resolution, and publishing to feed.
            </p>

            {/* Smooth animated progress bar */}
            <div className="w-64 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#0095f6] to-[#bc1888] transition-all duration-300 rounded-full"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* ─── STEP 6: SUCCESS CHECKMARK ─── */}
        {step === "success" && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#181818] animate-fade-in">
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mb-5 animate-bounce">
              <FiCheck size={38} />
            </div>

            <h4 className="text-xl font-bold text-white mb-2">Your post has been shared.</h4>
            <p className="text-xs text-gray-400 mb-6">
              It is now visible on your profile and explore feed.
            </p>

            <button
              onClick={() => {
                handleFullReset();
                onClose();
              }}
              className="bg-[#0095f6] hover:bg-[#1877f2] text-white font-semibold text-sm px-6 py-2.5 rounded-lg transition active:scale-95 shadow-md"
            >
              Done
            </button>
          </div>
        )}
      </div>

      {/* ─── Authentic Instagram Discard Post Confirmation Dialog ─── */}
      {showDiscardConfirm && (
        <div className="fixed inset-0 z-[130] bg-black/60 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#262626] rounded-2xl w-full max-w-[340px] text-center overflow-hidden border border-white/10 shadow-2xl">
            <div className="p-6">
              <h4 className="text-lg font-bold text-white mb-1.5">Discard post?</h4>
              <p className="text-xs text-gray-400 leading-relaxed">
                If you leave, your edits won't be saved.
              </p>
            </div>
            <div className="border-t border-[#363636] flex flex-col">
              <button
                type="button"
                onClick={handleConfirmDiscard}
                className="py-3 text-sm font-bold text-[#ed4956] hover:bg-white/5 active:bg-white/10 transition border-b border-[#363636]"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={() => setShowDiscardConfirm(false)}
                className="py-3 text-sm text-white hover:bg-white/5 active:bg-white/10 transition font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
