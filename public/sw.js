// sw.js
const CACHE_NAME = 'acik-ogretim-cache-v1';

// Assets to pre-cache (Shell)
const PRECACHE_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.svg',
  '/offline' // We need to create this fallback page
];

// Install Event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Precaching app shell');
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate Event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Clearing old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event (Network First, Fallback to Cache)
// Strategy:
// 1. Try Network
// 2. If valid response, clone and cache it, then return it.
// 3. If network fails (offline), try accessing cache.
// 4. If not in cache and it's a navigational request, show offline page.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    (async () => {
      try {
        const networkResponse = await fetch(event.request);

        // Cache valid responses (excluding chrome-extension schemes etc.)
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic' && event.request.url.startsWith('http')) {
             const responseToCache = networkResponse.clone();
             const cache = await caches.open(CACHE_NAME);
             cache.put(event.request, responseToCache);
        }

        return networkResponse;
      } catch (error) {
        console.log('[Service Worker] Fetch failed; returning offline cache', error);

        const cache = await caches.open(CACHE_NAME);
        const cachedResponse = await cache.match(event.request);

        if (cachedResponse) {
          return cachedResponse;
        }

        // If it's a page navigation, return the offline page
        if (event.request.mode === 'navigate') {
            return cache.match('/offline');
        }

        return new Response('Network error and no cache', { status: 503, statusText: 'Service Unavailable' });
      }
    })()
  );
});
