// JL-OBKLADY CN — Service Worker
// Verzi změň při každém nahrání nové verze HTML → telefon stáhne aktualizaci
const CACHE_NAME = 'jl-obklady-v1';

const ASSETS = [
  '/cn-obklady/',
  '/cn-obklady/index.html',
  '/cn-obklady/manifest.json',
  '/cn-obklady/icon-192.png',
  '/cn-obklady/icon-512.png',
  'https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Serif+Display&display=swap',
];

// Instalace — uloží základní soubory do cache
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS).catch(err => {
        console.warn('SW: cache addAll partial fail', err);
      });
    })
  );
  self.skipWaiting();
});

// Aktivace — smaže staré cache
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch — Network first, fallback na cache
self.addEventListener('fetch', event => {
  // Ignoruj non-GET a chrome-extension requesty
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Ulož čerstvou odpověď do cache
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        // Offline → servíruj z cache
        return caches.match(event.request).then(cached => {
          if (cached) return cached;
          // Fallback na hlavní stránku pro navigaci
          if (event.request.mode === 'navigate') {
            return caches.match('/cn-obklady/');
          }
        });
      })
  );
});
