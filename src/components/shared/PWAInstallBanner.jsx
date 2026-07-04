import React, { useState, useEffect } from "react";

function PWAInstallBanner() {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [showBanner, setShowBanner] = useState(false);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        // Check if already dismissed this session
        if (sessionStorage.getItem('pwa-dismissed')) return;

        const handler = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
            // Show banner after 5 seconds
            setTimeout(() => setShowBanner(true), 5000);
        };

        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setShowBanner(false);
        }
        setDeferredPrompt(null);
    };

    const handleDismiss = () => {
        setShowBanner(false);
        setDismissed(true);
        sessionStorage.setItem('pwa-dismissed', 'true');
    };

    if (!showBanner || dismissed) return null;

    return (
        <div className="fixed bottom-20 left-4 right-4 z-[90] max-w-md mx-auto animate-slide-up">
            <div className="bg-gradient-to-r from-[#1a1a35] to-[#16162A] border border-pink-500/30 rounded-2xl p-4 shadow-2xl shadow-pink-500/10 flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-600 rounded-xl flex items-center justify-center text-2xl shrink-0 shadow-lg">
                    💝
                </div>
                <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-bold">Install RentGF App</div>
                    <div className="text-gray-400 text-[10px] mt-0.5">Faster access, offline support, notifications!</div>
                </div>
                <div className="flex gap-1.5 shrink-0">
                    <button
                        onClick={handleInstall}
                        className="px-3 py-1.5 bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs font-bold rounded-lg hover:opacity-90 transition"
                    >
                        Install
                    </button>
                    <button
                        onClick={handleDismiss}
                        className="px-2 py-1.5 text-gray-500 hover:text-gray-300 text-xs transition"
                    >
                        ✕
                    </button>
                </div>
            </div>
        </div>
    );
}

export default PWAInstallBanner;
