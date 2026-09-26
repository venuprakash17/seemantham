/* GitHub Pages–safe service worker: relative paths, soft install, no huge assets. */
const CACHE = 'lavanya-album-v5';
const SHELL = [
  './',
  './index.html',
  './cinema.html',
  './styles.css',
  './script.js',
  './cinema.css',
  './cinema.js',
  './config.js',
  './favicon.svg',
  './manifest.webmanifest',
  './vendor/page-flip.browser.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then(async (cache) => {
      await Promise.all(
        SHELL.map((url) => cache.add(url).catch(() => undefined))
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

function isAppShell(url) {
  return /(?:index\.html|cinema\.html|styles\.css|script\.js|cinema\.css|cinema\.js|config\.js|page-flip\.browser\.js|manifest\.webmanifest)(?:\?|$)/.test(url) ||
    /\/$/.test(new URL(url).pathname);
}

function isHugeAsset(url) {
  return /\.pdf(?:\?|$)/i.test(url) || /seemantham-theme\.mp3(?:\?|$)/i.test(url);
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = request.url;
  if (isHugeAsset(url)) return; // let browser stream PDF/audio normally

  if (isAppShell(url)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, clone)).catch(() => {});
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response && response.ok && url.includes('/assets/pages/')) {
            const clone = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, clone)).catch(() => {});
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
