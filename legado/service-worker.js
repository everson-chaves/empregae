const CACHE_NAME = "empregae-v1";
const APP_SHELL = [
  "./",
  "./index.html",
  "./playstore.html",
  "./styles.css",
  "./app.js",
  "./manifest.webmanifest",
  "./assets/logo-empregae.svg",
  "./assets/hero-workers.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
});
