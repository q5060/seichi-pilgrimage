const CACHE_NAME = "seichi-v3";
const CACHE_URLS = ["/", "/search", "/spots", "/spots/map", "/api/spots?limit=20"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("push", (event) => {
  let data = { title: "聖地巡禮", body: "", url: "/" };
  try {
    data = { ...data, ...JSON.parse(event.data?.text() ?? "{}") };
  } catch {
    data.body = event.data?.text() ?? "";
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon-192.png",
      data: { url: data.url },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(url) && "focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});

function isMapApiRequest(url) {
  return url.pathname === "/api/spots/map" || url.pathname.startsWith("/api/spots/map?");
}

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  const isCacheable =
    url.pathname === "/api/spots" ||
    url.pathname === "/api/spots/map" ||
    url.pathname === "/api/routes" ||
    url.pathname.startsWith("/api/spots?") ||
    url.pathname.startsWith("/api/spots/map?");

  if (event.request.method !== "GET" || !isCacheable) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(event.request);

      if (!navigator.onLine && cached) {
        return cached;
      }

      try {
        const response = await fetch(event.request);
        if (response.ok) {
          await cache.put(event.request, response.clone());
        }
        return response;
      } catch {
        if (cached) return cached;
        if (isMapApiRequest(url)) {
          const anyMapCache = await caches.match("/api/spots/map");
          if (anyMapCache) return anyMapCache;
        }
        throw new Error("offline");
      }
    })
  );
});
