// Moravian Daily Watchwords - offline service worker
// Bump CACHE_NAME whenever app files change.
const CACHE_NAME = "moravian-watchword-pwa-v3";

const APP_SHELL = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-192.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png",
  "./data/files.json"
];

// Cache key without ?v=123 query strings, so the cache does not grow.
function keyFor(request) {
  const url = new URL(request.url);
  url.search = "";
  return new Request(url.toString());
}

async function cacheAllData(cache) {
  const res = await fetch("./data/files.json", { cache: "no-store" });
  if (!res.ok) return;
  await cache.put(keyFor(new Request("./data/files.json")), res.clone());
  const files = await res.json();
  for (const item of files) {
    const name = typeof item === "string" ? item : item && item.name;
    if (!name) continue;
    try {
      const req = new Request("./data/" + encodeURIComponent(name), { cache: "no-store" });
      const r = await fetch(req);
      if (r.ok) await cache.put(keyFor(req), r);
    } catch (e) { /* keep going, one bad file must not stop install */ }
  }
}

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // App shell must succeed.
    await Promise.all(APP_SHELL.map(async path => {
      const req = new Request(path, { cache: "reload" });
      const r = await fetch(req);
      if (!r.ok) throw new Error("Failed to cache " + path);
      await cache.put(keyFor(req), r);
    }));
    // Data files are best effort.
    try { await cacheAllData(cache); } catch (e) {}
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

// Network first (fresh data when online), cache fallback (works in airplane mode).
self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  if (new URL(request.url).origin !== self.location.origin) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const key = keyFor(request);
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(request, { signal: controller.signal });
      clearTimeout(timer);
      if (response && response.ok) cache.put(key, response.clone());
      return response;
    } catch (e) {
      const cached = await cache.match(key);
      if (cached) return cached;
      if (request.mode === "navigate") {
        const shell = await cache.match(keyFor(new Request("./index.html")));
        if (shell) return shell;
      }
      return new Response("Offline", { status: 503, statusText: "Offline" });
    }
  })());
});
