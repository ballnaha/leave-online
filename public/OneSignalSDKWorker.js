// OneSignal Service Worker with PWA support
// This is the main service worker for the app
importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");

const APP_VERSION = '1.0.9';
const CACHE_NAME = `leave-online-v${APP_VERSION}`;

// Assets to cache (minimal - only essential static assets)
const STATIC_ASSETS = [
  '/manifest.json',
  '/images/psc-logo.png',
];

// Install event - cache essential assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing:', APP_VERSION);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating:', APP_VERSION);
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names
          .filter((n) => n.startsWith('leave-online-') && n !== CACHE_NAME)
          .map((n) => caches.delete(n))
      ))
      .then(() => self.clients.claim())
  );
});

// Fetch event - Network First for all requests
self.addEventListener('fetch', (event) => {
  const request = event.request;
  
  // Skip non-GET, API, and OneSignal requests
  if (request.method !== 'GET' || 
      request.url.includes('/api/') || 
      request.url.includes('onesignal')) {
    return;
  }

  // For navigation requests - Network First
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match(request))
    );
    return;
  }

  // For other requests - Network First with cache fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.status === 200 && isStaticAsset(request.url)) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});

function isStaticAsset(url) {
  return ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2'].some(ext => url.includes(ext));
}
