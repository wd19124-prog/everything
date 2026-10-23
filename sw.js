const VERSION = 'rensheng-yicheng-v23';
const APP_SHELL = [
  './',
  './index.html',
  './app-core.js',
  './ui-theme-v3.css',
  './motion.css',
  './china-coords.js',
  './discover-fast.js',
  './poi-source.js',
  './amap-config.js',
  './amap-kit.js',
  './route-map.js',
  './planner-plus.js',
  './drawer.js',
  './mono.js',
  './panels.js',
  './tips.js',
  './place-info.js',
  './theme-minimal.css',
  './pulse-button.js',
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
  event.waitUntil(caches.open(VERSION).then(cache => Promise.all(APP_SHELL.map(url => cache.add(url).catch(() => null)))).then(() => self.skipWaiting()));
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
  const sameCode = /\.(js|css|html|webmanifest)$/.test(new URL(request.url).pathname);
  const store = response => { if (response && response.ok) { const copy = response.clone(); caches.open(VERSION).then(cache => cache.put(request, copy)); } return response; };
  if (sameCode) {
    /* 脚本与样式优先取最新版本 网络慢或离线时再用缓存 避免新旧文件混用 */
    event.respondWith(new Promise(resolve => {
      let done = false;
      const timer = setTimeout(() => caches.match(request).then(c => { if (c && !done) { done = true; resolve(c); } }), 5000);
      fetch(request).then(store).then(r => { if (!done) { done = true; clearTimeout(timer); resolve(r); } }).catch(() => caches.match(request).then(c => { if (!done) { done = true; clearTimeout(timer); resolve(c || Response.error()); } }));
    }));
    return;
  }
  event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(store)));
});
