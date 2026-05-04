// Install Service Worker
self.addEventListener('install', (e) => {
    console.log('[Service Worker] Installed');
});

// Activate Service Worker
self.addEventListener('activate', (e) => {
    console.log('[Service Worker] Activated');
});

// Fetch event (Bina iske "Install App" ka popup nahi aata)
self.addEventListener('fetch', (e) => {
    // Abhi ke liye hum isko simple rakhenge
});