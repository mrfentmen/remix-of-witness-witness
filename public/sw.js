/* Witness service worker — app-shell cache + background sync bridge.
   Production-only: registration is gated client-side. */
const VERSION = "witness-v1";
const SHELL_CACHE = `shell-${VERSION}`;
const RUNTIME_CACHE = `runtime-${VERSION}`;
const SHELL_URLS = ["/", "/manifest.webmanifest", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((c) => c.addAll(SHELL_URLS)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.filter((n) => !n.endsWith(VERSION)).map((n) => caches.delete(n)));
      await self.clients.claim();
    })(),
  );
});

// Update flow: client posts SKIP_WAITING when the user taps "Tap to update".
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // Never cache server functions, API, or auth callbacks.
  if (
    url.pathname.startsWith("/_serverFn") ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/~oauth")
  ) {
    return;
  }

  // NetworkFirst for HTML navigations — never lock to a stale shell.
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          const cache = await caches.open(SHELL_CACHE);
          cache.put("/", fresh.clone()).catch(() => {});
          return fresh;
        } catch {
          const cache = await caches.open(SHELL_CACHE);
          return (await cache.match("/")) ?? Response.error();
        }
      })(),
    );
    return;
  }

  // CacheFirst for hashed static assets.
  if (
    url.pathname.startsWith("/assets/") ||
    /\.(js|css|woff2?|png|jpg|svg|ico)$/.test(url.pathname)
  ) {
    event.respondWith(
      caches.open(RUNTIME_CACHE).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone()).catch(() => {});
        return res;
      }),
    );
  }
});

// Background Sync: ping all clients to retry the upload queue.
self.addEventListener("sync", (event) => {
  if (event.tag === "witness-upload-sync") {
    event.waitUntil(notifyClients("retry-uploads"));
  }
});

async function notifyClients(type) {
  const clients = await self.clients.matchAll({ includeUncontrolled: true, type: "window" });
  for (const c of clients) c.postMessage({ type });
}

// Web Push: incoming notification.
self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: "Witness", body: event.data ? event.data.text() : "" };
  }
  const title = payload.title || "Witness";
  const options = {
    body: payload.body || "",
    icon: "/icon-512.png",
    badge: "/icon-512.png",
    tag: payload.tag,
    data: { url: payload.url || "/", ...(payload.data || {}) },
    actions: payload.actions || [],
    requireInteraction: payload.data?.type === "sos",
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Click → focus or open the linked URL. Honours action button choices.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  let url = data.url || "/";
  if (event.action === "accept" || event.action === "decline") {
    url = "/sos";
  }
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const c of all) {
        if ("focus" in c) {
          await c.focus();
          if ("navigate" in c) {
            try {
              await c.navigate(url);
            } catch {}
          }
          return;
        }
      }
      await self.clients.openWindow(url);
    })(),
  );
});
