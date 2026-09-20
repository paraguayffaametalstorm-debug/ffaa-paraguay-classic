// Service Worker - PARAGUAY-FFAA | METALSTORM PWA
// ⬇️ BUMP DE VERSIÓN EN CADA DEPLOY

// ============================================================
// HALL-059 FIX: Actualización de versión de caché (v4.0.3)
// Purga automática de cachés obsoletas que causaban falsos 404 
// en recursos estáticos (componentes HTML) tras redirección 
// post-vinculación.
// ============================================================
const CACHE_NAME = 'PARAGUAY-FFAA-METALSTORM-v4.3.0';

// ✅ Assets versionados
const STATIC_ASSETS = [
  '/css/global.css',
  '/css/components.css',
  '/css/views.css',
  '/js/utils.js',
  '/js/auth.js',
  '/js/api.js',
  '/js/views.js',
  '/js/bm.js',
    '/js/admin-events.js',
  '/js/performance.js',
  '/js/profile.js',
  '/js/settings.js',
  '/js/main.js',
  '/logo-escuadron.png',
  '/privacy.html',
  '/terms.html',
  '/components/header.html',
  '/components/footer.html',
  '/components/dashboard.html',
  '/components/performance-form.html',
  '/components/planes-view.html',
  '/components/historial-view.html',
  '/components/profile-view.html',
  '/components/normativas-view.html',
  '/components/admin-panel.html',
  '/components/admin-plane-models.html',
  '/components/bm-missions.html',
  '/components/bm-progress.html',
  '/components/bm-discount.html',
  '/components/bm-leaderboard.html',
  '/components/bm-panel.html',
  '/components/all-performances.html',
  '/components/settings-view.html',
  '/components/help-modal.html',
  '/components/session-warning.html',
  '/components/forgot-password-modal.html',
  '/components/aircraft-stats-modal.html',
  '/components/change-password-modal.html'
];

// Instalación - Precache de assets
self.addEventListener('install', (event) => {
  // Forzar activación inmediata para evitar esperar a que se cierren las pestañas antiguas
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Cacheando assets estáticos v4.1.0');
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

// Activación - Limpieza de caches antiguos
self.addEventListener('activate', (event) => {
  console.log('[SW] Activando y limpiando cachés obsoletas...');
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => {
          console.log('[SW] Eliminando cache antiguo:', k);
          return caches.delete(k);
        })
      )
    ).then(() => {
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
          if (res && res.ok) {
            try {
              const clone = res.clone();
              caches.open(CACHE_NAME).then(cache => cache.put(request, clone)).catch(() => {});
            } catch (cloneErr) {
              console.warn('[SW] No se pudo clonar respuesta de navegación:', cloneErr);
            }
          }
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
        if (res && res.ok) {
          try {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone)).catch(() => {});
          } catch (cloneErr) {
            console.warn('[SW] No se pudo clonar el asset para cachear:', cloneErr);
          }
        }
        return res;
      });
    })
  );
});

// Manejar mensajes desde la app (para skipWaiting manual si fuera necesario)
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});