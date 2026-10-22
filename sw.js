const CACHE_NAME = 'jl-obklady-cn-v1';
const OFFLINE_URL = './index.html';
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE_NAME).then(c => c.add(OFFLINE_URL))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', e => { if (e.request.method!=='GET') return; e.respondWith(fetch(e.request).then(r=>{const c=r.clone();caches.open(CACHE_NAME).then(ca=>ca.put(e.request,c)).catch(()=>{});return r;}).catch(()=>caches.match(e.request).then(c=>c||caches.match(OFFLINE_URL)))); });
