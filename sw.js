// ═══ sw.js — JL-OBKLADY CN — Service Worker ═══
// Účel:
//  1) Splnit PWA installability kritéria → "Přidat na plochu" otevře appku
//     ve standalone módu (bez adresního řádku Chrome).
//  2) Minimální offline fallback — network-first, bez agresivní cache,
//     aby appka vždy ukázala nejnovější nahranou verzi po refreshi.

const CACHE_NAME = 'jl-obklady-cn-v1';
const OFFLINE_URL = './index.html';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.add(OFFLINE_URL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)).catch(() => {});
        return response;
      })
      .catch(() =>
        caches.match(event.request).then((cached) => cached || caches.match(OFFLINE_URL))
      )
  );
});
