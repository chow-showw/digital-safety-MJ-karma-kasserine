/* عمل البرنامج دون إنترنت: الصفحة أولًا من الشبكة (لتصل التحديثات)، ثم من الذاكرة عند انقطاعها */
const CACHE = 'fadaa-safe-v1';
const FILES = ['./', 'index.html', 'yaqzan-game.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(FILES.map(f => c.add(f).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

/* المتصفح يطلب الفيديو على أجزاء (Range)، فنقتطع الجزء المطلوب من النسخة المحفوظة */
async function rangeFrom(req, res) {
  const buf = await res.arrayBuffer();
  const m = /bytes=(\d+)-(\d*)/.exec(req.headers.get('range') || '');
  if (!m) return res;
  const start = +m[1], end = m[2] ? Math.min(+m[2], buf.byteLength - 1) : buf.byteLength - 1;
  return new Response(buf.slice(start, end + 1), {
    status: 206, statusText: 'Partial Content',
    headers: { 'Content-Type': 'video/mp4', 'Content-Range': 'bytes ' + start + '-' + end + '/' + buf.byteLength, 'Content-Length': String(end - start + 1) }
  });
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  if (/\.mp4$/i.test(new URL(req.url).pathname)) {
    e.respondWith(caches.match(req.url).then(hit => {
      if (hit) return req.headers.has('range') ? rangeFrom(req, hit.clone()) : hit;
      return fetch(req);
    }));
    return;
  }
  e.respondWith(
    fetch(req).then(res => {
      if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then(hit => hit || caches.match('index.html')))
  );
});
