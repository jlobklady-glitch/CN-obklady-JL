// ═══ sw.js — JL-OBKLADY CN — Service Worker ═══
// Účel:
//  1) Splnit PWA installability kritéria → "Přidat na plochu" otevře appku
//     ve standalone okně (bez adresního řádku prohlížeče), ne jako záložku.
//  2) Základní offline fallback — appka se otevře i bez signálu.
//
// Strategie: network-first (vždy zkusí nejnovější verzi), při výpadku sítě
// vrátí poslední uloženou verzi z cache. Cizí domény (fonty, CDN) necachuje.

const CACHE_NAME = 'jl-obklady-cn-v1'; // při velkém releasu zvyš číslo verze

const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
];

// ── Install — předem nahřej cache základními soubory ──────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .catch(() => {}) // neblokovat instalaci, pokud něco chybí
  );
  self.skipWaiting();
});

// ── Activate — ukliď staré verze cache ─────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch — network-first, fallback na cache / index.html ──
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return; // necachovat fonty/CDN

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)).catch(() => {});
        return response;
      })
      .catch(() =>
        caches.match(event.request).then((cached) => cached || caches.match('./index.html'))
      )
  );
});
