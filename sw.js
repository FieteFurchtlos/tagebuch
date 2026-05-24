// Service Worker — Mein Tagebuch
// Version bei jeder Änderung erhöhen, damit das Update auf dem Handy zieht.
const CACHE_VERSION = 'tagebuch-v3';
const APP_SHELL = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return (
        cached ||
        fetch(event.request)
          .then((resp) => {
            // Nur erfolgreich geladene, gleicher-Ursprung Ressourcen cachen
            if (
              resp &&
              resp.status === 200 &&
              new URL(event.request.url).origin === self.location.origin
            ) {
              const copy = resp.clone();
              caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, copy));
            }
            return resp;
          })
          .catch(() => cached)
      );
    })
  );
});
