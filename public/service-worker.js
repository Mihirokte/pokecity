/**
 * PokéCity Service Worker
 * Provides offline support and asset caching for PWA experience
 */

const CACHE_NAME = 'pokecity-v1';
const ASSETS_TO_CACHE = [
  '/pokecity/',
  '/pokecity/index.html',
  '/pokecity/manifest.json',
];

/**
 * Install event - cache essential assets
 */
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching app shell');
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn('[SW] Error caching assets:', err);
        // Don't fail the install if some assets can't be cached
      });
    })
  );
  // Activate immediately without waiting
  self.skipWaiting();
});

/**
 * Activate event - clean up old caches
 */
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

/**
 * Fetch event - serve from cache, fallback to network
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip external API calls (Google Sheets, PokeAPI, etc.)
  if (request.url.includes('googleapis.com') ||
      request.url.includes('pokeapi.co') ||
      request.url.includes('accounts.google.com')) {
    return;
  }

  // Cache-first strategy for same-origin requests
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        return cached;
      }

      return fetch(request)
        .then((response) => {
          // Only cache successful responses
          if (!response || response.status !== 200 || response.type === 'error') {
            return response;
          }

          // Clone the response to cache it
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });

          return response;
        })
        .catch(() => {
          // If offline and not cached, return offline page or cached response
          console.log('[SW] Request failed (offline?):', request.url);
          // You could return a custom offline page here
          return new Response(
            'You appear to be offline. Some features may not work.',
            {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({
                'Content-Type': 'text/plain',
              }),
            }
          );
        });
    })
  );
});

/**
 * Message event - handle messages from clients
 */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
