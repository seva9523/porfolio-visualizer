// WealthView Pro — minimal offline cache (educational tool)
const CACHE_NAME = 'wealthview-cache-v1';
const CORE_ASSETS = [
  './',
  './library.html',
  './visualizer.html',
  './themes.html',
  './goals.html',
  './health.html',
  './backtest.html',
  './plan.html',
  './journey.css',
  './journey.js',
  './hv-engine.js',
  './p0-engine.js',
  './goals-engine.js',
  './report.html',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS)).then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => k===CACHE_NAME ? null : caches.delete(k)))).then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(resp => {
        const copy = resp.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, copy)).catch(()=>{});
        return resp;
      }).catch(() => cached || caches.match('./library.html'));
    })
  );
});
