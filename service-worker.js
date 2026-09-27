const CACHE_NAME = "moravian-watchword-pwa-v1";

const APP_SHELL = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./data/files.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => cacheWatchwordFiles())
      .then(() => self.skipWaiting())
  );
});

async function cacheWatchwordFiles() {
  try {
    const response = await fetch("./data/files.json?v=" + Date.now(), {
      cache: "no-store"
    });

    if (!response.ok) {
      return;
    }

    const files = await response.json();

    if (!Array.isArray(files)) {
      return;
    }

    const cache = await caches.open(CACHE_NAME);

    for (const filename of files) {
      const url =
        "./data/" +
        encodeURIComponent(filename);

      try {
        await cache.add(url);
      } catch (error) {
        console.warn("Could not cache:", filename, error);
      }
    }
  } catch (error) {
    console.warn("Could not cache Watchword files:", error);
  }
}

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  // Navigation: network first, cached app shell if offline.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();

          caches.open(CACHE_NAME)
            .then(cache =>
              cache.put("./index.html", copy)
            );

          return response;
        })
        .catch(() =>
          caches.match("./index.html")
            .then(cached =>
              cached || caches.match("./")
            )
        )
    );

    return;
  }

  // Static files and Watchword TXT files:
  // network first, then cache.
  event.respondWith(
    fetch(request)
      .then(response => {
        if (response.ok) {
          const copy = response.clone();

          caches.open(CACHE_NAME)
            .then(cache =>
              cache.put(request, copy)
            );
        }

        return response;
      })
      .catch(() =>
        caches.match(request)
          .then(cached => cached || Response.error())
      )
  );
});
