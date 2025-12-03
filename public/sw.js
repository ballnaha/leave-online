const CACHE_NAME = 'leave-online-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Simple fetch strategy to satisfy PWA requirements
  // In a real app, you might want to cache assets here
  event.respondWith(fetch(event.request));
});
