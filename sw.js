// =============================================
// Service Worker - الرايق لبيع الانتيكات والتحف
// =============================================

const CACHE_NAME = 'elrayek-store-v4';
const STATIC_ASSETS = [
    './',
    './index.html',
    './product.html',
    './cart.html',
    './wishlist.html',
    './orders.html',
    './checkout.html',
    './favicon.ico',
    './assets/icons/icon-192.png',
    './assets/icons/icon-512.png',
    './css/style.css',
    './js/config.js',
    './js/store.js',
    './js/product.js',
    './js/cart.js',
    './js/wishlist.js',
    './js/orders.js',
    './js/checkout.js',
    './manifest.json',
    './robots.txt',
    './sitemap.xml'
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
    if (event.request.method !== 'GET') return;
    if (!event.request.url.startsWith('http://') && !event.request.url.startsWith('https://')) return;
    if (event.request.url.includes('supabase.co')) return;

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                if (response.status === 200) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return response;
            })
            .catch(() => {
                return caches.match(event.request);
            })
    );
});
