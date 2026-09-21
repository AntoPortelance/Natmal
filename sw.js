// Change le numéro de version à chaque mise à jour du jeu
const CACHE = "natmal-v4";
const CORE = ["./", "./index.html", "./manifest.webmanifest", "./icon-180.png", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  // Page du jeu : réseau d'abord (mises à jour immédiates), cache si hors ligne ou réseau trop lent
  if (req.mode === "navigate") {
    e.respondWith((async () => {
      const cache = await caches.open(CACHE);
      try {
        const res = await Promise.race([fetch(req), new Promise((_, rej) => setTimeout(() => rej(), 3000))]);
        if (res && res.ok) cache.put("./index.html", res.clone());
        return res;
      } catch (_) {
        return (await cache.match("./index.html")) || (await cache.match("./")) || Response.error();
      }
    })());
    return;
  }
  // Le reste (icônes, polices) : cache d'abord, mise à jour en arrière-plan
  e.respondWith(caches.open(CACHE).then(async cache => {
    const cached = await cache.match(req);
    const net = fetch(req).then(res => {
      if (res && (res.ok || res.type === "opaque")) cache.put(req, res.clone());
      return res;
    }).catch(() => null);
    if (cached) { e.waitUntil(net); return cached; }
    return (await net) || Response.error();
  }));
});
