const CACHE = "wealthview-cache-v1";
const CORE = [
  "/", "/index.html",
  "/visualizer.html",
  "/themes.html",
  "/goals.html",
  "/health.html",
  "/library.html",
  "/plan.html",
  "/report.html",
  "/manifest.json"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).catch(()=>null));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => (k === CACHE ? null : caches.delete(k)))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  e.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(resp => {
      const copy = resp.clone();
      caches.open(CACHE).then(c => c.put(req, copy)).catch(()=>null);
      return resp;
    }).catch(()=>cached))
  );
});
