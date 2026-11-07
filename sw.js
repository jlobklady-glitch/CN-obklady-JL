// Service worker: síť má přednost (nová verze se načte hned po připojení), offline se bere z mezipaměti.
const CACHE = 'jl-obklady-v34'; // 0.38.6 – při každé verzi zvýšit, aby se služba aktualizovala
const SHELL = ['./', 'index.html', 'css/app.css', 'js/main.js', 'vendor/supabase.js', 'manifest.webmanifest'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Supabase a ostatní se necachuje
  e.respondWith((async () => {
    const net = fetch(req, { cache: 'no-cache' }).then((res) => {
      if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    });
    net.catch(() => {});
    try {
      // slabý signál: po 4 s se použije verze z mezipaměti
      return await Promise.race([net, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 4000))]);
    } catch (_) {
      const cached = await caches.match(req);
      if (cached) return cached;
      try { return await net; } catch (__) { return (await caches.match('index.html')) || Response.error(); }
    }
  })());
});

// Push upozornění (nové poptávky z webu)
self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { d = { body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'JL-OBKLADY', {
    body: d.body || '',
    icon: 'icons/icon-192.png',
    badge: 'icons/icon-192.png',
    tag: 'poptavka',
    renotify: true,
    data: { url: d.url || './#/poptavky' },
  }));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const target = new URL((e.notification.data && e.notification.data.url) || './#/poptavky', self.registration.scope).href;
  e.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) {
      if (c.url.startsWith(self.registration.scope)) { await c.focus(); if ('navigate' in c) { try { await c.navigate(target); } catch (_) { /* nic */ } } return; }
    }
    await self.clients.openWindow(target);
  })());
});
