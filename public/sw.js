// Spill service worker: makes the app installable and keeps the last stories readable offline.
const VERSION = "spill-v27";
const SHELL = ["/", "/config.js", "/spill-db.js", "/install.js", "/push.js", "/cricket.js", "/wire.js", "/desktop.js", "/civic.js", "/weather.js", "/qr.svg", "/favicon.svg", "/icon-192.png", "/icon-512.png", "/manifest.webmanifest"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function networkFirst(req, fallbackKey) {
  const cache = await caches.open(VERSION);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(fallbackKey || req, res.clone());
    return res;
  } catch (err) {
    const hit = await cache.match(fallbackKey || req, { ignoreSearch: true });
    if (hit) return hit;
    throw err;
  }
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // Supabase, fonts and CDNs go straight to the network
  if (url.pathname.startsWith("/admin")) return;
  if (req.mode === "navigate") {
    e.respondWith(networkFirst(req, "/"));
  } else if (url.pathname.startsWith("/data/")) {
    e.respondWith(networkFirst(new Request(url.pathname)));
  } else {
    e.respondWith(networkFirst(req)); // network-first so app updates reach installed users
  }
});

// Push notifications (live cricket alerts and future breaking news).
self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { d = { title: "Spill", body: e.data ? e.data.text() : "" }; }
  e.waitUntil(self.registration.showNotification(d.title || "Spill", {
    body: d.body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: d.tag || "spill",
    renotify: !!d.renotify,
    data: { url: d.url || "/" },
  }));
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || "/", self.location.origin).href;
  e.waitUntil((async () => {
    const all = await clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const c of all) { if (new URL(c.url).origin === self.location.origin) { await c.focus(); c.navigate(url).catch(() => {}); return; } }
    await clients.openWindow(url);
  })());
});
