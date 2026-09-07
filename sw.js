const CACHE_NAME = 'territori-cache-v38';
const ASSETS = [
    './',
    'index.html',
    'css/style.css',
    'css/fontawesome.min.css',
    'js/app.js',
    'js/alpine.min.js',
    'js/tailwind.min.js',
    'js/tailwind-config.js',
    'webfonts/fa-solid-900.woff2',
    'webfonts/fa-solid-900.ttf',
    'webfonts/fa-regular-400.woff2',
    'webfonts/fa-regular-400.ttf',
    'webfonts/fa-brands-400.woff2',
    'webfonts/fa-brands-400.ttf',
    'icons/icon-192.png',
    'icons/icon-512.png',
    'icons/apple-touch-icon.png',
    'favicon.ico',
    'favicon.png',
    'img/empty_map_dark.png',
    'img/empty_map_light.png',
    'img/pwa/pwa_step1.png',
    'img/pwa/pwa_step2.png',
    'img/pwa/pwa_step3.png',
    'img/pwa/pwa_step4.png',
    'manifest.json'
];

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        fetch(event.request)
            .then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
                }
                return networkResponse;
            })
            .catch(() => caches.match(event.request))
    );
});
