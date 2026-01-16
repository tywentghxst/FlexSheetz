
const CACHE_NAME = 'flexsheetz-v3';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.map(key => caches.delete(key)));
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Network first strategy to ensure latest code is seen during debugging
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
