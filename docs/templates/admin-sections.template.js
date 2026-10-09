/**
 * ═══════════════════════════════════════════════════════════════
 *  PARAGUAY-FFAA | METALSTORM
 *  admin-sections.js — Navegación del Panel Admin con lazy loading
 *  ─────────────────────────────────────────────────────────────
 *  Módulo F5 (v4.7.0) · 2026-10-09
 * ═══════════════════════════════════════════════════════════════
 */

(function() {
  'use strict';

  // ── Constantes ──
  const LS_ADMIN_ACTIVE_SECTION = 'admin_active_section';
  const LS_ADMIN_SIDEBAR_COLLAPSED = 'admin_sidebar_collapsed';

  // ── Configuración de las 5 secciones ──
  const ADMIN_SECTIONS = {
    resumen:  { url: '/components/admin-sections/admin-summary.html', init: 'initAdminSummarySection', label: 'Resumen' },
    dotacion: { url: '/components/admin-sections/admin-members.html', init: 'initAdminMembersSection', label: 'Dotación' },
    eventos:  { url: '/components/admin-sections/admin-events.html',  init: 'initAdminEventsSection',  label: 'Eventos' },
    catalogo: { url: '/components/admin-sections/admin-catalog.html', init: 'initAdminCatalogSection', label: 'Catálogo' },
    estado:   { url: '/components/admin-sections/admin-status.html',  init: 'initAdminStatusSection',  label: 'Estado' }
  };

  // ── Caché en memoria (RAM) ──
  const _sectionCache = new Map();

  // ── Estado interno ──
  const state = {
    currentSection: null,
    loading: false
  };

  // ═══════════════════════════════════════════════════════════════
  //  HELPERS
  // ═══════════════════════════════════════════════════════════════

  function isValidSection(sectionId) {
    return Object.prototype.hasOwnProperty.call(ADMIN_SECTIONS, sectionId);
  }

  function getContainer()     { return document.getElementById('adminSectionContent'); }
  function getSidebar()       { return document.getElementById('adminSidebar'); }
  function getMobileOverlay() { return document.getElementById('adminMobileOverlay'); }
  function isMobile()         { return window.innerWidth < 768; }

  // ═══════════════════════════════════════════════════════════════
  //  SKELETON + EMPTY STATE
  // ═══════════════════════════════════════════════════════════════

  function renderSkeleton(container) {
    container.innerHTML = [
      '<div class="admin-skeleton" style="padding:2rem;display:flex;flex-direction:column;gap:1rem;">',
        '<div class="skeleton-line" style="width:45%;height:22px;"></div>',
        '<div class="skeleton-line" style="width:70%;height:14px;"></div>',
        '<div style="height:1.5rem;"></div>',
        '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1rem;">',
          '<div class="skeleton-line" style="height:100px;"></div>',
          '<div class="skeleton-line" style="height:100px;"></div>',
          '<div class="skeleton-line" style="height:100px;"></div>',
          '<div class="skeleton-line" style="height:100px;"></div>',
        '</div>',
        '<div style="height:1.5rem;"></div>',
        '<div class="skeleton-line" style="width:100%;height:200px;"></div>',
      '</div>'
    ].join('');
  }

  function renderError(container, sectionId, errorMessage) {
    const sectionLabel = (ADMIN_SECTIONS[sectionId] && ADMIN_SECTIONS[sectionId].label) || sectionId;
    const msg = errorMessage || 'Verificá tu conexión e intentá de nuevo.';

    container.innerHTML = [
      '<div class="empty-state" style="padding:3rem 1.5rem;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;color:#94a3b8;background:rgba(15,23,42,0.5);border:1px dashed rgba(100,116,139,0.3);border-radius:12px;">',
        '<div style="font-size:3rem;margin-bottom:1rem;opacity:0.6;">⚠️</div>',
        '<h3 style="font-family:Rajdhani,sans-serif;font-size:1.2rem;color:#e2e8f0;margin:0 0 0.5rem 0;">No se pudo cargar la sección ' + sectionLabel + '</h3>',
        '<p style="font-size:0.9rem;color:#94a3b8;margin:0 0 1.5rem 0;max-width:420px;line-height:1.5;">' + msg + '</p>',
        '<button type="button" onclick="window.switchAdminSection(\'' + sectionId + '\')" class="btn-primary" style="padding:0.6rem 1.2rem;font-size:0.9rem;background:linear-gradient(135deg,#0038A8 0%,#002570 100%);color:#fff;border:1px solid rgba(212,175,55,0.4);border-radius:6px;cursor:pointer;font-weight:700;">🔄 Reintentar</button>',
      '</div>'
    ].join('');
  }

  // ═══════════════════════════════════════════════════════════════
  //  CARGA DE SECCIÓN
  // ═══════════════════════════════════════════════════════════════

  async function loadSectionHTML(sectionId) {
    if (_sectionCache.has(sectionId)) {
      return _sectionCache.get(sectionId).html;
    }

    const config = ADMIN_SECTIONS[sectionId];
    if (!config) throw new Error('Sección desconocida: ' + sectionId);

    const url = config.url + '?v=4.7.0';
    const res = await fetch(url, { headers: { 'Accept': 'text/html' } });

    if (!res.ok) {
      throw new Error('HTTP ' + res.status + ' al cargar ' + config.url);
    }

    const html = await res.text();

    if (!html || html.length < 100) {
      throw new Error('Respuesta vacía o demasiado corta');
    }

    _sectionCache.set(sectionId, { html: html, timestamp: Date.now() });
    return html;
  }

  // ═══════════════════════════════════════════════════════════════
  //  SWITCH DE SECCIÓN
  // ═══════════════════════════════════════════════════════════════

  async function switchAdminSection(sectionId) {
    if (!isValidSection(sectionId)) {
      console.warn('[Admin] Sección inválida:', sectionId);
      return;
    }

    const container = getContainer();
    if (!container) {
      console.warn('[Admin] Contenedor #adminSectionContent no encontrado');
      return;
    }

    if (state.loading && state.currentSection === sectionId) {
      console.log('[Admin] Carga ya en progreso para:', sectionId);
      return;
    }

    state.loading = true;
    state.currentSection = sectionId;

    // 1. Actualizar sidebar
    document.querySelectorAll('.admin-sidebar-btn').forEach(function(btn) {
      const isActive = btn.dataset.section === sectionId;
      btn.classList.toggle('active', isActive);
      if (isActive) btn.setAttribute('aria-current', 'page');
      else btn.removeAttribute('aria-current');
    });

    // 2. Persistir
    try { localStorage.setItem(LS_ADMIN_ACTIVE_SECTION, sectionId); } catch (e) { /* noop */ }

    // 3. Cerrar drawer mobile
    if (isMobile()) closeAdminMobileSidebar();

    // 4. Skeleton si no está en caché
    const isCached = _sectionCache.has(sectionId);
    if (!isCached) renderSkeleton(container);

    // 5. Cargar e inyectar
    try {
      const html = await loadSectionHTML(sectionId);
      container.innerHTML = html;

      // 6. Refrescar iconos
      if (typeof window.refreshLucideIcons === 'function') {
        setTimeout(window.refreshLucideIcons, 30);
      }

      // 7. Init de la sección
      const config = ADMIN_SECTIONS[sectionId];
      if (config && config.init && typeof window[config.init] === 'function') {
        try {
          await window[config.init]();
        } catch (initErr) {
          console.error('[Admin] Error en init de ' + sectionId + ':', initErr);
        }
      } else {
        console.warn('[Admin] Init ' + (config && config.init) + ' no disponible para ' + sectionId);
      }

      console.log('[Admin] Sección ' + sectionId + ' ' + (isCached ? 'desde caché' : 'cargada') + ' correctamente');
    } catch (err) {
      console.error('[Admin] Error cargando sección ' + sectionId + ':', err);
      renderError(container, sectionId, err.message || 'Error de conexión');
    } finally {
      state.loading = false;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  //  INITS DE LAS 5 SECCIONES
  // ═══════════════════════════════════════════════════════════════

  async function initAdminSummarySection() {
    console.log('[Admin][Resumen] Init');
    const cache = window.adminMembersCache || [];
    if (cache.length > 0) {
      if (typeof window.renderAdminStats === 'function') window.renderAdminStats(cache);
      if (typeof window.renderPilotsByStatus === 'function') window.renderPilotsByStatus(cache);
    }
  }

  async function initAdminMembersSection() {
    console.log('[Admin][Dotación] Init');
    if (typeof window.switchMembersTab === 'function') {
      window.switchMembersTab('active');
    } else if (typeof window.filterMembers === 'function') {
      window.filterMembers();
    }
  }

  async function initAdminEventsSection() {
    console.log('[Admin][Eventos] Init');
    if (typeof window.adminEventsLoad === 'function') {
      try { await window.adminEventsLoad(); } catch (e) { console.warn('[Admin][Eventos] Error:', e); }
    }
    if (typeof window.loadExportEventsList === 'function') {
      try { await window.loadExportEventsList(); } catch (e) { console.warn('[Admin][Eventos] Error export:', e); }
    }
  }

  async function initAdminCatalogSection() {
    console.log('[Admin][Catálogo] Init');
    if (typeof window.loadAdminPlaneModels === 'function') {
      try { await window.loadAdminPlaneModels(); } catch (e) { console.warn('[Admin][Catálogo] Error:', e); }
    }
  }

  async function initAdminStatusSection() {
    console.log('[Admin][Estado] Init');
    if (typeof window.renderAdminStatusSection === 'function') {
      window.renderAdminStatusSection();
    }
  }

  // ═══════════════════════════════════════════════════════════════
  //  SIDEBAR TOGGLE + DRAWER MOBILE
  // ═══════════════════════════════════════════════════════════════

  function toggleAdminSidebar() {
    if (isMobile()) return;
    const sidebar = getSidebar();
    if (!sidebar) return;
    const isCollapsed = sidebar.classList.toggle('collapsed');
    const icon = sidebar.querySelector('.toggle-icon');
    if (icon) icon.textContent = isCollapsed ? '▶' : '◀';
    const label = sidebar.querySelector('.toggle-label');
    if (label) label.textContent = isCollapsed ? 'Expandir' : 'Colapsar';
    try { localStorage.setItem(LS_ADMIN_SIDEBAR_COLLAPSED, String(isCollapsed)); } catch (e) { /* noop */ }
  }

  function openAdminMobileSidebar() {
    const sidebar = getSidebar();
    const overlay = getMobileOverlay();
    if (!sidebar) return;
    sidebar.classList.add('mobile-open');
    if (overlay) {
      overlay.classList.add('open');
      overlay.setAttribute('aria-hidden', 'false');
    }
  }

  function closeAdminMobileSidebar() {
    const sidebar = getSidebar();
    const overlay = getMobileOverlay();
    if (sidebar) sidebar.classList.remove('mobile-open');
    if (overlay) {
      overlay.classList.remove('open');
      overlay.setAttribute('aria-hidden', 'true');
    }
  }

  // ═══════════════════════════════════════════════════════════════
  //  RESTORE STATE
  // ═══════════════════════════════════════════════════════════════

  function restoreAdminSidebarState() {
    try {
      const collapsed = localStorage.getItem(LS_ADMIN_SIDEBAR_COLLAPSED) === 'true';
      const activeSection = localStorage.getItem(LS_ADMIN_ACTIVE_SECTION) || 'resumen';

      const sidebar = getSidebar();
      if (sidebar && collapsed && !isMobile()) {
        sidebar.classList.add('collapsed');
        const icon = sidebar.querySelector('.toggle-icon');
        if (icon) icon.textContent = '▶';
        const label = sidebar.querySelector('.toggle-label');
        if (label) label.textContent = 'Expandir';
      }

      document.querySelectorAll('.admin-sidebar-btn').forEach(function(btn) {
        const isActive = btn.dataset.section === activeSection;
        btn.classList.toggle('active', isActive);
        if (isActive) btn.setAttribute('aria-current', 'page');
      });

      switchAdminSection(activeSection);
    } catch (e) {
      console.warn('[Admin] Error restaurando estado:', e);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  //  EXPOSICIÓN GLOBAL
  // ═══════════════════════════════════════════════════════════════

  window.switchAdminSection = switchAdminSection;
  window.toggleAdminSidebar = toggleAdminSidebar;
  window.openAdminMobileSidebar = openAdminMobileSidebar;
  window.closeAdminMobileSidebar = closeAdminMobileSidebar;
  window.restoreAdminSidebarState = restoreAdminSidebarState;

  window.initAdminSummarySection = initAdminSummarySection;
  window.initAdminMembersSection = initAdminMembersSection;
  window.initAdminEventsSection = initAdminEventsSection;
  window.initAdminCatalogSection = initAdminCatalogSection;
  window.initAdminStatusSection = initAdminStatusSection;

  window._adminSectionsDebug = function() {
    return {
      currentSection: state.currentSection,
      loading: state.loading,
      cache: Array.from(_sectionCache.keys()),
      sections: Object.keys(ADMIN_SECTIONS)
    };
  };

  console.log('✅ [Admin] Módulo admin-sections.js cargado (F5 con lazy loading)');
})();