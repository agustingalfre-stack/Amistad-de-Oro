self.addEventListener("install", event => {
  console.log("Service worker instalado");
  event.waitUntil(
    caches.open("torneo-cache").then(cache => {
      return cache.addAll([
        "/index.html",
        "/estilos.css",   // si tenés estilos
        "/main.js",         // tu script principal
        "/icons/icon-192.png",
        "/icons/icon-512.png",
        "/manifest.json"
      ]);
    })
  );
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
