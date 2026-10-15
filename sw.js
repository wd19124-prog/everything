const VERSION = 'rensheng-yicheng-v12';
const APP_SHELL = [
  './',
  './index.html',
  './app-core.js',
  './ui-theme-v3.css',
  './motion.css',
  './china-coords.js',
  './discover-fast.js',
  './manifest.webmanifest',
  './icons/icon-192-v5.png',
  './icons/icon-512-v5.png',
  './assets/station/bus_stop_loop_01.png',
  './assets/station-static.png',
  './assets/empty-next.png',
  './assets/empty-itinerary.png'
  ,'./assets/map-markers/scenic.png'
  ,'./assets/map-markers/food.png'
  ,'./assets/map-markers/leisure.png'
  ,'./assets/vendor/maplibre-gl.css'
  ,'./assets/vendor/maplibre-gl.js'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(VERSION).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== VERSION).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || !request.url.startsWith(self.location.origin)) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then(response => {
      const copy = response.clone();
      caches.open(VERSION).then(cache => cache.put('./index.html', copy));
      return response;
    }).catch(() => caches.match('./index.html')));
    return;
  }
  const refresh = () => fetch(request).then(response => {
    if (response.ok) { const copy = response.clone(); caches.open(VERSION).then(cache => cache.put(request, copy)); }
    return response;
  });
  event.respondWith(caches.match(request).then(cached => {
    if (!cached) return refresh();
    event.waitUntil(refresh().catch(() => {}));
    return cached;
  }));
});
