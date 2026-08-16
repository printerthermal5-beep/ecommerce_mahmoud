// =============================================
// Service Worker - متجر النور
// =============================================

const CACHE_NAME = 'alnour-store-v2';
const STATIC_ASSETS = [
    './',
    './index.html',
    './product.html',
    './cart.html',
    './wishlist.html',
    './orders.html',
    './checkout.html',
    './css/style.css',
    './js/config.js',
    './js/store.js',
    './js/product.js',
    './js/cart.js',
    './js/wishlist.js',
    './js/orders.js',
    './js/checkout.js',
    './manifest.json'
];

// Install - Cache static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

// Activate - Clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        })
    );
    self.clients.claim();
});

// Fetch - Network first, fallback to cache
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') return;

    // Skip non-HTTP(S) schemes (e.g. chrome-extension://)
    if (!event.request.url.startsWith('http://') && !event.request.url.startsWith('https://')) return;

    // Skip Supabase API requests (always go to network)
    if (event.request.url.includes('supabase.co')) return;

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Clone and cache successful responses
                if (response.status === 200) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return response;
            })
            .catch(() => {
                // Fallback to cache
                return caches.match(event.request);
            })
    );
});
