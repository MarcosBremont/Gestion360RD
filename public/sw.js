/* Service worker mínimo, offline-first para el shell y el contenido visitado.
   Versionar CACHE al cambiar la estrategia. */
const CACHE = "jarabacoa-v2";
const SHELL = ["/", "/reportar", "/mis-reportes", "/mapa", "/explorar", "/offline"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => Promise.allSettled(SHELL.map((u) => c.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Nunca interceptar Firebase/Google: el SDK gestiona su propio offline.
  if (url.origin !== self.location.origin) {
    // Tiles de mapa e imágenes remotas: cache-first
    if (/tile|openstreetmap|firebasestorage/.test(url.hostname)) {
      e.respondWith(
        caches.match(req).then(
          (hit) =>
            hit ||
            fetch(req).then((res) => {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copy));
              return res;
            })
        )
      );
    }
    return;
  }

  // Assets estáticos de Next: cache-first (llevan hash en el nombre)
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/") || url.pathname.startsWith("/maplibre-")) {
    e.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
            return res;
          })
      )
    );
    return;
  }

  // Navegación: red primero, caché si falla
  if (req.mode === "navigate" || req.headers.get("accept")?.includes("text/html")) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((hit) => hit || caches.match("/offline")))
    );
  }
});

// ── Notificaciones push (FCM, mensajes solo-datos) ──
self.addEventListener("push", (e) => {
  let p = {};
  try { p = e.data ? e.data.json() : {}; } catch { /* payload no JSON */ }
  const d = p.data || p.notification || p;
  e.waitUntil(
    self.registration.showNotification(d.title || "Jarabacoa Conecta", {
      body: d.body || "",
      icon: "/icons/icon.svg",
      data: { url: d.url || "/" },
    })
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "/";
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ("focus" in c) {
          c.navigate(url);
          return c.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
