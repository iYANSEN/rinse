// App-shell cache so Rinse opens with no signal. Photos live in IndexedDB; /api/* and client galleries (/g/*) are never cached here.
const C = 'rinse-v5', SHELL = ['./', 'index.html', 'styles.css', 'app.js', 'flair.js', 'pairing.js', 'gallery-template.js', 'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'apple-touch-icon.png', 'fonts/figtree.woff2'];
self.addEventListener('install', (e) => e.waitUntil(
  caches.open(C)
    // Cache each file on its own so one bad asset can never leave the shell empty.
    .then((c) => Promise.all(SHELL.map((u) => c.add(new Request(u, { cache: 'reload' })).catch(() => {}))))
    .then(() => self.skipWaiting())
));
self.addEventListener('activate', (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== C).map((k) => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin || u.pathname.startsWith('/api/') || u.pathname.startsWith('/g/')) return;
  e.respondWith(fetch(e.request).then((r) => { if (r.ok) { const k = r.clone(); caches.open(C).then((c) => c.put(e.request, k)); } return r; }).catch(() => caches.match(e.request).then((m) => m || caches.match('index.html'))));
});
