export const APP_VERSION = "2.4.0";
export const APP_VERSION_TAG = "v2.4.0";
export const APP_RELEASE_STAGE = "Latest Stable";
export const APP_BUILD_DATE = "September 2026";
export const IS_LATEST_VERSION = true;

export const APP_CHANGELOG = [
    {
        version: "v2.4.0 (Latest)",
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
