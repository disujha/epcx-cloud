// EPCX Cloud Service Worker - Field PWA Support
const CACHE_NAME = "epcx-field-v1";
const OFFLINE_URL = "/offline.html";

const PRECACHE_ASSETS = [
  OFFLINE_URL,
  "/favicon.png",
  "/images/icon.png",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  "/icons/apple-touch-icon.png",
];

// Install: precache offline fallback and essential icons
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch: Network-first for navigation, stale-while-revalidate for static assets
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Don't intercept non-GET requests or Firebase API/Firestore/Auth calls
  if (
    request.method !== "GET" ||
    request.url.includes("firestore.googleapis.com") ||
    request.url.includes("identitytoolkit.googleapis.com") ||
    request.url.includes("securetoken.googleapis.com") ||
    request.url.includes("firebasestorage.googleapis.com") ||
    request.url.includes("accounts.google.com") ||
    request.url.includes("/__/auth/") ||
    request.url.includes("/api/")
  ) {
    return;
  }

  // HTML page navigations -> Network first, fallback to cached offline.html
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match(OFFLINE_URL).then((response) => {
          return response || new Response("Offline", { status: 503, statusText: "Service Unavailable" });
        });
      })
    );
    return;
  }

  // Static assets (images, icons, styles, fonts) -> Cache-first with background network revalidate
  if (
    request.destination === "image" ||
    request.destination === "font" ||
    request.destination === "style" ||
    request.destination === "script"
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseToCache);
              });
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
  }
});
