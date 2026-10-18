// ============================================================
// SERVICE WORKER — INT IA Générateur d'Épreuve PCT
// Stratégie : Cache versionné + Auto-update forcée
// ============================================================

// ⚠️ INCRÉMENTER CETTE VERSION À CHAQUE DÉPLOIEMENT
const APP_VERSION = '1.0.11';
const CACHE_NAME = `int-ia-pct-v${APP_VERSION}`;

const ASSETS = [
  './',
  './index.html',
  './admin.html',
  './grille_correction.html',
  './manifest.json',
  './logoapp.png',
  './connaissances_techniques.json',
  './base_methodo.json'
];

// ─── INSTALLATION ───
self.addEventListener('install', event => {
  console.log(`[SW] Installation version ${APP_VERSION}`);
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Mise en cache des assets');
        return cache.addAll(ASSETS);
      })
      .catch(err => console.error('[SW] Erreur cache:', err))
  );
});

// ─── ACTIVATION ───
self.addEventListener('activate', event => {
  console.log(`[SW] Activation version ${APP_VERSION}`);
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log(`[SW] Suppression ancien cache: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      ))
      .then(() => {
        console.log('[SW] Prise de contrôle des clients');
        return self.clients.claim();
      })
  );
});

// ─── FETCH ───
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  if (event.request.method !== 'GET') return;
  if (url.origin !== location.origin) return;
  
  const isCritical = url.pathname.endsWith('.html') 
                   || url.pathname.endsWith('.json')
                   || url.pathname === '/';
  
  if (isCritical) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
  } else {
    event.respondWith(
      caches.match(event.request).then(cached => cached || fetch(event.request))
    );
  }
});

// ─── MESSAGE ───
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
