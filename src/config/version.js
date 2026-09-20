export const APP_VERSION = "2.4.3";
export const APP_VERSION_TAG = "v2.4.3";
export const APP_RELEASE_STAGE = "Latest Stable";
export const APP_BUILD_DATE = "September 2026";
export const IS_LATEST_VERSION = true;

export const APP_CHANGELOG = [
    {
        version: "v2.4.2 (Latest)",
        date: "September 2026",
        features: [
            "☕ Redesigned brand logo: Authentic Coffee Cup with rising Heart Steam",
            "🚀 Fixed login server wake-up cold start messages",
            "🛡️ Enhanced Vercel CI deployment rules and single-page routing rewrites"
        ]
    },
    {
        version: "v2.4.1",
        date: "September 2026",
        features: [
            "🎨 Official Coffeely App Icon across all Android screen resolutions",
            "🌟 Custom branded Coffeely splash launch screen",
            "📹 WebRTC Camera & Microphone auto-grant permissions for video calls",
            "🔙 Android hardware back button gesture navigation",
            "📱 Edge-to-edge safe area notch and navigation bar spacing"
        ]
    },
    {
        version: "v2.4.0",
        date: "September 2026",
        features: [
            "⚡ Enhanced PWA install experience for Laptop, Desktop & Mobile",
            "🛡️ Emergency SOS alert system with live GPS coordinates",
            "💰 Instant wallet balances & automated Escrow protection",
            "🎙️ Real-time voice messaging & HD in-app calling",
            "✨ Real-time dynamic rating & review tracking for companions"
        ]
    }
];

export const getAppPlatform = () => {
    if (typeof window === "undefined") return "Web";
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone;
    if (isStandalone) return "Installed PWA App";
    const ua = navigator.userAgent || "";
    if (/android/i.test(ua)) return "Android Web App";
    if (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) return "iOS Web App";
    if (/Macintosh|MacIntel|MacPPC|Mac68K/.test(ua)) return "macOS Desktop";
    if (/Win32|Win64|Windows|WinCE/.test(ua)) return "Windows Desktop";
    return "Web Browser";
};
