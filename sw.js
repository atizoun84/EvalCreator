// SERVICE WORKER - INT IA PCT (Vite PWA)
const APP_VERSION = '2.0.0';
const CACHE_NAME = `genpct-v${APP_VERSION}`;

// Fichiers de base à mettre en cache immédiatement
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './logoapp.png'
];

// ─── INSTALLATION ───
self.addEventListener('install', event => {
  console.log(`[SW] Installation version ${APP_VERSION}`);
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_ASSETS))
  );
});

// ─── ACTIVATION ───
self.addEventListener('activate', event => {
  console.log(`[SW] Activation version ${APP_VERSION}`);
  event.waitUntil(
    caches.keys().then(cacheNames => Promise.all(
      cacheNames.map(cacheName => {
        if (cacheName !== CACHE_NAME) {
          console.log(`[SW] Suppression ancien cache: ${cacheName}`);
          return caches.delete(cacheName);
        }
      })
    )).then(() => self.clients.claim())
  );
});

// ─── FETCH ───
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // On ignore les requêtes non-GET et les domaines externes (Firebase, etc.)
  if (event.request.method !== 'GET') return;
  if (url.origin !== location.origin) return;

  // Stratégie Network-First pour le HTML (navigation)
  if (event.request.mode === 'navigate' || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request).then(res => res || caches.match('./index.html')))
    );
    return;
  }

  // Ne jamais cacher version.json (doit toujours être frais)
  if (url.pathname.endsWith('version.json')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Stratégie Cache-First pour les assets (JS, CSS, images)
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) return cachedResponse;
      return fetch(event.request).then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      });
    })
  );
});
