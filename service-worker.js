const CACHE_NAME = "moravian-watchword-pwa-v2";

const APP_SHELL = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./data/files.json"
];

// ------------------------------------------------------------
// INSTALL
// ------------------------------------------------------------

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(async cache => {
        await cache.addAll(APP_SHELL);

        // Also cache every TXT file listed in files.json.
        try {
          const response = await fetch("./data/files.json", {
            cache: "no-store"
          });

          if (!response.ok) {
            return;
          }

          const files = await response.json();

          const txtRequests = files.map(filename => {
            return new Request(
              "./data/" + encodeURIComponent(filename),
              { cache: "no-store" }
            );
          });

          await cache.addAll(txtRequests);
        } catch (error) {
          console.log("Could not pre-cache Watchword TXT files:", error);
        }
      })
      .then(() => self.skipWaiting())
  );
});


// ------------------------------------------------------------
// ACTIVATE
// ------------------------------------------------------------

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => {
        return Promise.all(
          keys
            .filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
        );
      })
      .then(() => self.clients.claim())
  );
});


// ------------------------------------------------------------
// FETCH
// ------------------------------------------------------------

self.addEventListener("fetch", event => {
  const request = event.request;

  // Only handle GET requests.
  if (request.method !== "GET") {
    return;
  }

  event.respondWith(
    fetch(request)
      .then(response => {
        // Save successful responses in the current cache.
        if (response && response.ok) {
          const responseClone = response.clone();

          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseClone);
          });
        }

        return response;
      })
      .catch(() => {
        // IMPORTANT:
        // Ignore query strings such as ?v=123456789.
        //
        // This allows:
        // data/2026%20English.txt?v=123
        //
        // to use the cached:
        // data/2026%20English.txt
        //
        return caches.match(request, {
          ignoreSearch: true
        }).then(cachedResponse => {

          if (cachedResponse) {
            return cachedResponse;
          }

          // If the exact request was not cached, try the app shell.
          return caches.match("./index.html");
        });
      })
  );
});
