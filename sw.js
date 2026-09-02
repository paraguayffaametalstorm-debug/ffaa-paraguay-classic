// Service Worker - PARAGUAY-FFAA | METALSTORM PWA
// ⬇️ BUMP DE VERSIÓN EN CADA DEPLOY
const CACHE_NAME = 'PARAGUAY-FFAA-METALSTORM-v3.3.1';

// ✅ Assets versionados
const STATIC_ASSETS = [
  '/css/global.css',
  '/css/components.css',
  '/css/views.css',
  '/js/utils.js',
  '/js/auth.js',
  '/js/api.js',
  '/js/views.js',
  '/js/performance.js',
  '/js/profile.js',
  '/js/settings.js',
  '/js/main.js',
  '/logo-escuadron.png',
  '/components/header.html',
  '/components/footer.html',
  '/components/dashboard.html',
  '/components/performance-form.html',
  '/components/planes-view.html',
  '/components/historial-view.html',
  '/components/profile-view.html',
  '/components/normativas-view.html',
  '/components/admin-panel.html',
  '/components/all-performances.html',
  '/components/settings-view.html',
  '/components/help-modal.html',
  '/components/session-warning.html',
  '/components/forgot-password-modal.html',
  '/components/aircraft-stats-modal.html'
];

// Instalación - Precache de assets
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Cacheando assets estáticos');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Instalación completada');
        return self.skipWaiting();
      })
      .catch((err) => {
        console.error('[SW] Error en instalación:', err);
        return self.skipWaiting();
      })
  );
});

// Activación - Limpieza de caches antiguos
self.addEventListener('activate', (event) => {
  console.log('[SW] Activando...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Eliminando cache antiguo:', name);
            return caches.delete(name);
          })
      );
    }).then(() => {
      console.log('[SW] Activación completada');
      return self.clients.claim();
    })
  );
});

// ✅ Network-first para navegación, Cache-first para assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // No interceptar llamadas a API ni Supabase
  if (url.pathname.includes('/api/') || 
      url.hostname.includes('supabase.co') ||
      request.method !== 'GET') {
    return;
  }

  // ✅ Network-first para navegación (index.html) — SIEMPRE la versión más nueva
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          return res;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // ✅ Cache-first para assets estáticos versionados
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(res => {
        if (res.ok) {
          caches.open(CACHE_NAME).then(cache => cache.put(request, res.clone()));
        }
        return res;
      });
    })
  );
});

// Manejar mensajes desde la app (para skipWaiting manual)
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});