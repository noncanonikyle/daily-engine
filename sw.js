/* ============================================
   DAILY ENGINE — Service Worker (Offline PWA)
   Network-first with offline fallback
   Bump CACHE_VERSION on every deploy!
   ============================================ */

const CACHE_VERSION = 'daily-engine-v10.5';
const ASSETS = [
    './',
    './index.html',
    './styles_v10.css',
    './app_v10.js',
    './manifest.json',
    './icons/icon-192.svg',
    './icons/icon-512.svg'
];

// Install: pre-cache core assets, skip waiting to activate immediately
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_VERSION).then((cache) => cache.addAll(ASSETS))
    );
    self.skipWaiting();
});

// Activate: delete ALL old caches, claim clients immediately
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch: NETWORK-FIRST — always try fresh, fall back to cache for offline
self.addEventListener('fetch', (event) => {
    // Only handle same-origin requests (skip Firebase CDN, analytics, etc.)
    if (!event.request.url.startsWith(self.location.origin)) return;

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Got a fresh response — update the cache
                if (response.status === 200) {
                    const clone = response.clone();
                    caches.open(CACHE_VERSION).then((cache) => {
                        cache.put(event.request, clone);
                    });
                }
                return response;
            })
            .catch(() => {
                // Network failed — serve from cache (offline mode)
                return caches.match(event.request).then((cached) => {
                    return cached || caches.match('./index.html');
                });
            })
    );
});

// Listen for messages from the app (e.g., skip waiting command)
self.addEventListener('message', (event) => {
    if (event.data === 'skipWaiting') {
        self.skipWaiting();
    }
});
