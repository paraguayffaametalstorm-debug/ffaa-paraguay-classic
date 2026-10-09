/**
 * ═══════════════════════════════════════════════════════════════
 *  FASE 2 — Shell + Sidebar del Panel Admin (TODO-EN-UNO)
 *  ─────────────────────────────────────────────────────────────
 *  Este script hace TODO lo que necesita la Fase 2:
 *
 *    [1] Backup de admin-panel.html → .bak-f2
 *    [2] Extrae los 5 modales existentes
 *    [3] Genera el nuevo shell (sidebar + content + modales)
 *    [4] Escribe components/admin-panel.html
 *    [5] Inserta el stub switchAdminSection() en js/views.js
 *    [6] Appendea el CSS del layout a css/views.css
 *    [7] Verifica sintaxis JS con node --check
 *
 *  Entrada:  components/admin-panel.html
 *            js/views.js
 *            css/views.css
 *
 *  Backups:  *.bak-f2 (uno por archivo, NO se sobreescriben)
 *
 *  Uso:      node scripts/fase-f2-admin-shell.cjs
 *
 *  Rollback (manual):
 *    copy components\admin-panel.html.bak-f2 components\admin-panel.html
 *    copy js\views.js.bak-f2              js\views.js
 *    copy css\views.css.bak-f2            css\views.css
 *  ─────────────────────────────────────────────────────────────
 *  Fecha: 2026-10-09 · Proyecto: PARAGUAY-FFAA | METALSTORM
 * ═══════════════════════════════════════════════════════════════
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ── Rutas ──
const ROOT = path.resolve(__dirname, '..');
const FILE_ADMIN_PANEL = path.join(ROOT, 'components', 'admin-panel.html');
const FILE_VIEWS_JS = path.join(ROOT, 'js', 'views.js');
const FILE_VIEWS_CSS = path.join(ROOT, 'css', 'views.css');

// ── Modales a preservar intactos ──
const MODALES_A_PRESERVAR = [
  'inactivateUserModal',
  'reactivateUserModal',
  'completeReasonModal',
  'uploadEventModal',
  'adminEventCreateModal',
];

// ── Marca única para evitar doble-inyección en views.js ──
const VIEWS_JS_MARKER = '/* ═══════════════════════════════════════════════════════════════\n   FASE 2 — Stub de navegación del Panel Admin';

// ── Marca única para evitar doble-inyección en views.css ──
const VIEWS_CSS_MARKER = '/* ═══════════════════════════════════════════════════════════════\n   FASE 2 — Layout del Panel Admin (sidebar + content)';

// ═══════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════

function log(msg)    { console.log(msg); }
function ok(msg)     { console.log(`   ✅ ${msg}`); }
function warn(msg)   { console.log(`   ⚠️  ${msg}`); }
function err(msg)    { console.error(`   ❌ ${msg}`); }
function title(msg)  { console.log(`\n🔷 ${msg}`); }

/**
 * Crea un backup si no existe. No sobreescribe backups previos.
 */
function crearBackupSiNoExiste(filepath) {
  const backup = filepath + '.bak-f2';
  if (fs.existsSync(backup)) {
    warn(`Backup ya existía: ${path.basename(backup)} (no se toca)`);
    return false;
  }
  const content = fs.readFileSync(filepath, 'utf8');
  fs.writeFileSync(backup, content, 'utf8');
  ok(`Backup creado: ${path.basename(backup)} (${content.length} bytes)`);
  return true;
}

/**
 * Extrae un bloque <div id="...">...</div> balanceado desde el HTML.
 */
function extraerBloqueDiv(html, id) {
  const reApertura = new RegExp(`<div\\s+id=["']${id}["'][^>]*>`, 'i');
  const match = reApertura.exec(html);
  if (!match) return null;

  const startIdx = match.index;
  let i = startIdx;
  let depth = 0;
  let inString = false;
  let stringChar = null;

  while (i < html.length) {
    const ch = html[i];

    if (!inString && (ch === '"' || ch === "'")) {
      inString = true;
      stringChar = ch;
      i++;
      continue;
    }
    if (inString) {
      if (ch === stringChar && html[i - 1] !== '\\') {
        inString = false;
        stringChar = null;
      }
      i++;
      continue;
    }

    if (html.slice(i, i + 4).toLowerCase() === '<div') {
      depth++;
      i += 4;
      continue;
    }
    if (html.slice(i, i + 6).toLowerCase() === '</div>') {
      depth--;
      i += 6;
      if (depth === 0) {
        return html.slice(startIdx, i);
      }
      continue;
    }
    i++;
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════
//  PASO 1 — REFACTOR DE admin-panel.html
// ═══════════════════════════════════════════════════════════════

function generarShellF2(modalesPreservados) {
  const modalesHtml = modalesPreservados
    .map(({ id, html }) => `<!-- ═══ MODAL PRESERVADO: ${id} ═══ -->\n${html}`)
    .join('\n\n');

  return `<div id="adminPanel" class="view" style="display:none;">
  <!-- ═══════════════════════════════════════════════════════════════
       PANEL ADMIN v4.7.0 — FASE 2: Shell + Sidebar
       ─────────────────────────────────────────────────────────────
       Estructura:
         .admin-layout
           ├── .admin-sidebar  (5 secciones navegables)
           └── .admin-content  (contenedor dinámico de secciones)

       Las secciones se inyectan vía switchAdminSection() en F3/F5.
       Estado actual F2: contenedor con placeholder "en construcción".
       ─────────────────────────────────────────────────────────────
       Rollback: copiar admin-panel.html.bak-f2 sobre este archivo.
       ═══════════════════════════════════════════════════════════════ -->

  <div class="admin-layout">

    <!-- ═══════════════════════════════════════════════════════
         SIDEBAR DE COMANDANCIA
         ═══════════════════════════════════════════════════════ -->
    <aside class="admin-sidebar" id="adminSidebar" aria-label="Navegación del Panel de Comandancia">

      <!-- Header del sidebar -->
      <div class="admin-sidebar-header">
        <div class="admin-sidebar-logo" aria-hidden="true">🛡️</div>
        <div class="admin-sidebar-title">
          <strong>COMANDANCIA</strong>
          <small>Panel Admin · v4.7</small>
        </div>
      </div>

      <!-- Navegación entre secciones -->
      <nav class="admin-sidebar-nav" aria-label="Secciones del panel">
        <button type="button"
                class="admin-sidebar-btn active"
                data-section="resumen"
                onclick="switchAdminSection('resumen')"
                aria-current="page">
          <span class="asb-icon" aria-hidden="true">📊</span>
          <span class="asb-label">Resumen</span>
        </button>

        <button type="button"
                class="admin-sidebar-btn"
                data-section="dotacion"
                onclick="switchAdminSection('dotacion')">
          <span class="asb-icon" aria-hidden="true">👥</span>
          <span class="asb-label">Dotación</span>
          <span class="asb-badge" id="sidebarDotacionCount">—</span>
        </button>

        <button type="button"
                class="admin-sidebar-btn"
                data-section="eventos"
                onclick="switchAdminSection('eventos')">
          <span class="asb-icon" aria-hidden="true">📅</span>
          <span class="asb-label">Eventos</span>
        </button>

        <button type="button"
                class="admin-sidebar-btn"
                data-section="catalogo"
                onclick="switchAdminSection('catalogo')">
          <span class="asb-icon" aria-hidden="true">✈️</span>
          <span class="asb-label">Catálogo</span>
        </button>

        <button type="button"
                class="admin-sidebar-btn"
                data-section="estado"
                onclick="switchAdminSection('estado')">
          <span class="asb-icon" aria-hidden="true">⚙️</span>
          <span class="asb-label">Estado</span>
        </button>
      </nav>

      <!-- Toggle colapsable -->
      <div class="admin-sidebar-footer">
        <button type="button"
                class="admin-sidebar-toggle"
                id="adminSidebarToggle"
                onclick="toggleAdminSidebar()"
                aria-label="Colapsar o expandir sidebar">
          <span class="toggle-icon" aria-hidden="true">◀</span>
          <span class="toggle-label">Colapsar</span>
        </button>
      </div>

    </aside>

    <!-- ═══════════════════════════════════════════════════════
         CONTENIDO DINÁMICO DE SECCIONES
         ═══════════════════════════════════════════════════════ -->
    <main class="admin-content" id="adminContent" role="main">

      <!-- Overlay para mobile drawer -->
      <div class="admin-mobile-overlay" id="adminMobileOverlay" onclick="closeAdminMobileSidebar()" aria-hidden="true"></div>

      <!-- Botón hamburguesa mobile -->
      <button type="button"
              class="admin-mobile-trigger btn-secondary"
              onclick="openAdminMobileSidebar()"
              aria-label="Abrir menú lateral">
        ☰
      </button>

      <!-- Contenedor donde se inyectan las secciones -->
      <div id="adminSectionContent" aria-live="polite">
        <!-- F2: placeholder · F3 inyectará aquí las 5 secciones -->
        <div class="admin-f2-placeholder" style="
          display:flex;
          flex-direction:column;
          align-items:center;
          justify-content:center;
          min-height:60vh;
          text-align:center;
          padding:3rem 1.5rem;
          color:#94a3b8;
        ">
          <div style="font-size:3rem;margin-bottom:1rem;">🛡️</div>
          <h2 style="
            font-family:var(--font-display);
            color:var(--pry-gold);
            font-size:1.6rem;
            letter-spacing:2px;
            margin:0 0 0.75rem 0;
          ">PANEL DE COMANDANCIA</h2>
          <p style="
            font-size:0.95rem;
            max-width:520px;
            line-height:1.6;
            color:#cbd5e1;
            margin:0 0 0.5rem 0;
          ">
            <strong style="color:#38BDF8;">Fase 2 completada</strong> · Shell + Sidebar operativos.
          </p>
          <p style="
            font-size:0.85rem;
            max-width:520px;
            line-height:1.6;
            color:#94a3b8;
            margin:0;
          ">
            Las 5 secciones se construirán en <strong style="color:#D4AF37;">Fase 3</strong>
            y se inyectarán en <code style="
              background:rgba(15,23,42,0.8);
              padding:2px 6px;
              border-radius:4px;
              font-family:var(--font-mono);
              font-size:0.8rem;
              color:#60a5fa;
            ">#adminSectionContent</code>.
          </p>
          <div style="
            margin-top:1.5rem;
            padding:10px 16px;
            background:rgba(212,175,55,0.08);
            border:1px dashed rgba(212,175,55,0.4);
            border-radius:6px;
            font-family:var(--font-mono);
            font-size:0.78rem;
            color:#d4af37;
            letter-spacing:0.5px;
          ">
            ⚠️ El panel real estará operativo al cierre de F5
          </div>
        </div>
      </div>

    </main>

  </div>

  <!-- ═══════════════════════════════════════════════════════════════
       MODALES PRESERVADOS INTACTOS (no se tocan en F2)
       ═══════════════════════════════════════════════════════════════ -->

${modalesHtml}
</div>
`;
}

function paso1_refactorAdminPanel() {
  title('PASO 1 — Refactor de components/admin-panel.html');

  if (!fs.existsSync(FILE_ADMIN_PANEL)) {
    err(`No existe: ${FILE_ADMIN_PANEL}`);
    process.exit(1);
  }

  const htmlOriginal = fs.readFileSync(FILE_ADMIN_PANEL, 'utf8');
  log(`📖 Leído: components/admin-panel.html (${htmlOriginal.length} bytes)`);

  // Backup
  crearBackupSiNoExiste(FILE_ADMIN_PANEL);

  // Extraer modales
  log(`\n🔍 Extrayendo ${MODALES_A_PRESERVAR.length} modales...`);
  const modalesPreservados = [];
  const faltantes = [];

  for (const id of MODALES_A_PRESERVAR) {
    const bloque = extraerBloqueDiv(htmlOriginal, id);
    if (bloque) {
      modalesPreservados.push({ id, html: bloque });
      ok(`${id} (${bloque.length} bytes)`);
    } else {
      faltantes.push(id);
      warn(`${id} NO encontrado (se omite)`);
    }
  }

  if (modalesPreservados.length === 0) {
    err('No se encontró ningún modal para preservar. Abortando.');
    process.exit(1);
  }

  // Generar nuevo shell
  log(`\n🔨 Generando nuevo shell F2...`);
  const nuevoHtml = generarShellF2(modalesPreservados);
  log(`   Nuevo shell: ${nuevoHtml.length} bytes`);

  fs.writeFileSync(FILE_ADMIN_PANEL, nuevoHtml, 'utf8');
  ok(`Escrito: components/admin-panel.html`);

  return { modalesPreservados, faltantes };
}

// ═══════════════════════════════════════════════════════════════
//  PASO 2 — STUB switchAdminSection() en js/views.js
// ═══════════════════════════════════════════════════════════════

const VIEWS_JS_STUB = `

/* ═══════════════════════════════════════════════════════════════
   FASE 2 — Stub de navegación del Panel Admin
   ─────────────────────────────────────────────────────────────
   En F5 estas funciones se reemplazan por las versiones reales
   con lazy loading + persistencia + inyección en #adminSectionContent.
   Por ahora solo actualizan el estado visual del sidebar.
   ═══════════════════════════════════════════════════════════════ */

(function() {
  'use strict';

  const LS_ADMIN_ACTIVE_SECTION = 'admin_active_section';
  const LS_ADMIN_SIDEBAR_COLLAPSED = 'admin_sidebar_collapsed';

  /**
   * Cambia la sección activa del panel admin (STUB F2).
   * @param {string} sectionId - 'resumen' | 'dotacion' | 'eventos' | 'catalogo' | 'estado'
   */
  function switchAdminSection(sectionId) {
    const validas = ['resumen', 'dotacion', 'eventos', 'catalogo', 'estado'];
    if (!validas.includes(sectionId)) {
      console.warn('[Admin F2] Sección inválida:', sectionId);
      return;
    }

    document.querySelectorAll('.admin-sidebar-btn').forEach(btn => {
      const isActive = btn.dataset.section === sectionId;
      btn.classList.toggle('active', isActive);
      if (isActive) {
        btn.setAttribute('aria-current', 'page');
      } else {
        btn.removeAttribute('aria-current');
      }
    });

    try {
      localStorage.setItem(LS_ADMIN_ACTIVE_SECTION, sectionId);
    } catch (e) { /* localStorage no disponible */ }

    if (window.innerWidth < 768 && typeof closeAdminMobileSidebar === 'function') {
      closeAdminMobileSidebar();
    }

    console.log('[Admin F2] Sección activa (stub):', sectionId);
  }

  /**
   * Colapsa/expande el sidebar (STUB F2).
   */
  function toggleAdminSidebar() {
    if (window.innerWidth < 768) return;

    const sidebar = document.getElementById('adminSidebar');
    if (!sidebar) return;

    const isCollapsed = sidebar.classList.toggle('collapsed');

    const icon = sidebar.querySelector('.toggle-icon');
    if (icon) icon.textContent = isCollapsed ? '▶' : '◀';

    const label = sidebar.querySelector('.toggle-label');
    if (label) label.textContent = isCollapsed ? 'Expandir' : 'Colapsar';

    try {
      localStorage.setItem(LS_ADMIN_SIDEBAR_COLLAPSED, String(isCollapsed));
    } catch (e) { /* noop */ }

    console.log('[Admin F2] Sidebar colapsado:', isCollapsed);
  }

  /**
   * Abre el sidebar como drawer en mobile (STUB F2).
   */
  function openAdminMobileSidebar() {
    const sidebar = document.getElementById('adminSidebar');
    const overlay = document.getElementById('adminMobileOverlay');
    if (!sidebar) return;
    sidebar.classList.add('mobile-open');
    if (overlay) {
      overlay.classList.add('open');
      overlay.setAttribute('aria-hidden', 'false');
    }
  }

  /**
   * Cierra el sidebar drawer en mobile (STUB F2).
   */
  function closeAdminMobileSidebar() {
    const sidebar = document.getElementById('adminSidebar');
    const overlay = document.getElementById('adminMobileOverlay');
    if (sidebar) sidebar.classList.remove('mobile-open');
    if (overlay) {
      overlay.classList.remove('open');
      overlay.setAttribute('aria-hidden', 'true');
    }
  }

  /**
   * Restaura el estado persistido del sidebar al cargar el panel (STUB F2).
   */
  function restoreAdminSidebarState() {
    try {
      const collapsed = localStorage.getItem(LS_ADMIN_SIDEBAR_COLLAPSED) === 'true';
      const activeSection = localStorage.getItem(LS_ADMIN_ACTIVE_SECTION) || 'resumen';

      const sidebar = document.getElementById('adminSidebar');
      if (sidebar && collapsed && window.innerWidth >= 768) {
        sidebar.classList.add('collapsed');
        const icon = sidebar.querySelector('.toggle-icon');
        if (icon) icon.textContent = '▶';
        const label = sidebar.querySelector('.toggle-label');
        if (label) label.textContent = 'Expandir';
      }

      document.querySelectorAll('.admin-sidebar-btn').forEach(btn => {
        const isActive = btn.dataset.section === activeSection;
        btn.classList.toggle('active', isActive);
        if (isActive) btn.setAttribute('aria-current', 'page');
      });
    } catch (e) { /* noop */ }
  }

  window.switchAdminSection = switchAdminSection;
  window.toggleAdminSidebar = toggleAdminSidebar;
  window.openAdminMobileSidebar = openAdminMobileSidebar;
  window.closeAdminMobileSidebar = closeAdminMobileSidebar;
  window.restoreAdminSidebarState = restoreAdminSidebarState;

  console.log('✅ [Admin F2] Stub de navegación del sidebar cargado');
})();
`;

function paso2_inyectarStubViewsJS() {
  title('PASO 2 — Insertar stub en js/views.js');

  if (!fs.existsSync(FILE_VIEWS_JS)) {
    err(`No existe: ${FILE_VIEWS_JS}`);
    process.exit(1);
  }

  let contenido = fs.readFileSync(FILE_VIEWS_JS, 'utf8');

  // ¿Ya estaba inyectado?
  if (contenido.includes(VIEWS_JS_MARKER)) {
    warn('El stub ya estaba en views.js (skip)');
    return { skipped: true };
  }

  // Backup
  crearBackupSiNoExiste(FILE_VIEWS_JS);

  // Insertar antes del último console.log(...) que contiene "[Views]"
  // o al final si no lo encuentra.
  const anchor = contenido.lastIndexOf("console.log('✅ [Views]");
  if (anchor !== -1) {
    // Insertar ANTES de ese console.log
    const antes = contenido.slice(0, anchor);
    const despues = contenido.slice(anchor);
    contenido = antes + VIEWS_JS_STUB + '\n' + despues;
    ok('Stub insertado antes del console.log final');
  } else {
    // Append al final
    contenido += VIEWS_JS_STUB;
    ok('Stub append al final (no se encontró anchor)');
  }

  fs.writeFileSync(FILE_VIEWS_JS, contenido, 'utf8');
  ok('Escrito: js/views.js');

  // Verificar sintaxis
  try {
    execSync(`node --check "${FILE_VIEWS_JS}"`, { stdio: 'pipe' });
    ok('node --check js/views.js → sintaxis OK');
  } catch (e) {
    err('node --check falló en js/views.js');
    err(e.stderr ? e.stderr.toString() : e.message);
    err('Revertí con: copy js\\views.js.bak-f2 js\\views.js');
    process.exit(1);
  }

  return { skipped: false };
}

// ═══════════════════════════════════════════════════════════════
//  PASO 3 — CSS del layout en css/views.css
// ═══════════════════════════════════════════════════════════════

const VIEWS_CSS_BLOCK = `

/* ═══════════════════════════════════════════════════════════════
   FASE 2 — Layout del Panel Admin (sidebar + content)
   ─────────────────────────────────────────────────────────────
   Estilos mínimos para F2. En F4 se pulen y se agregan
   animaciones, transiciones y el modo compacto.
   ═══════════════════════════════════════════════════════════════ */

/* Variables locales del sidebar */
:root {
  --admin-sidebar-w: 240px;
  --admin-sidebar-collapsed-w: 64px;
}

/* ── Layout principal ── */
#adminPanel .admin-layout {
  display: flex;
  min-height: calc(100vh - 8rem);
  position: relative;
  gap: 0;
}

/* ── SIDEBAR ── */
#adminPanel .admin-sidebar {
  width: var(--admin-sidebar-w);
  flex-shrink: 0;
  background: linear-gradient(180deg, #0B132B 0%, #0F172A 100%);
  border-right: 1.5px solid rgba(212, 175, 55, 0.25);
  display: flex;
  flex-direction: column;
  transition: width 0.28s cubic-bezier(0.16, 1, 0.3, 1);
  position: sticky;
  top: 0;
  height: calc(100vh - 8rem);
  overflow-y: auto;
  overflow-x: hidden;
  z-index: 50;
}

#adminPanel .admin-sidebar.collapsed {
  width: var(--admin-sidebar-collapsed-w);
}

#adminPanel .admin-sidebar-header {
  padding: var(--sp-4) var(--sp-3);
  border-bottom: 1px solid rgba(212, 175, 55, 0.2);
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 4rem;
  overflow: hidden;
}

#adminPanel .admin-sidebar-logo {
  font-size: 1.4rem;
  flex-shrink: 0;
  width: 2.4rem;
  height: 2.4rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(212, 175, 55, 0.1);
  border: 1px solid rgba(212, 175, 55, 0.4);
  border-radius: var(--radius);
  box-shadow: 0 0 12px rgba(212, 175, 55, 0.2);
}

#adminPanel .admin-sidebar-title {
  display: flex;
  flex-direction: column;
  min-width: 0;
  transition: opacity 0.2s ease;
}

#adminPanel .admin-sidebar.collapsed .admin-sidebar-title {
  opacity: 0;
  pointer-events: none;
  width: 0;
}

#adminPanel .admin-sidebar-title strong {
  font-family: var(--font-display);
  font-size: 0.95rem;
  color: var(--pry-gold);
  letter-spacing: 1px;
  white-space: nowrap;
  line-height: 1;
}

#adminPanel .admin-sidebar-title small {
  font-family: var(--font-mono);
  font-size: 0.62rem;
  color: #64748B;
  letter-spacing: 1px;
  text-transform: uppercase;
  white-space: nowrap;
  margin-top: 2px;
}

#adminPanel .admin-sidebar-nav {
  flex: 1;
  padding: var(--sp-3) var(--sp-2);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

#adminPanel .admin-sidebar-btn {
  width: 100%;
  min-height: 44px;
  background: transparent;
  border: 1px solid transparent;
  border-left: 3px solid transparent;
  border-radius: var(--radius);
  padding: 8px 12px;
  display: flex;
  align-items: center;
  gap: 12px;
  color: #CBD5E1;
  font-family: var(--font-body);
  font-size: 0.9rem;
  font-weight: 600;
  text-align: left;
  justify-content: flex-start;
  transition: all 0.18s ease;
  position: relative;
  cursor: pointer;
  overflow: hidden;
}

#adminPanel .admin-sidebar-btn:hover {
  background: rgba(30, 41, 59, 0.5);
  color: #FFFFFF;
}

#adminPanel .admin-sidebar-btn.active {
  background: linear-gradient(90deg, rgba(0, 56, 168, 0.45) 0%, rgba(15, 23, 42, 0.7) 100%);
  color: #FFFFFF;
  border-left-color: var(--pry-gold);
  box-shadow: inset 0 0 15px rgba(0, 56, 168, 0.3);
}

#adminPanel .admin-sidebar-btn .asb-icon {
  font-size: 1.15rem;
  flex-shrink: 0;
  width: 1.5rem;
  text-align: center;
  transition: transform 0.2s ease;
}

#adminPanel .admin-sidebar-btn.active .asb-icon {
  transform: scale(1.12);
  filter: drop-shadow(0 0 6px rgba(212, 175, 55, 0.6));
}

#adminPanel .admin-sidebar-btn .asb-label {
  flex: 1;
  white-space: nowrap;
  transition: opacity 0.2s ease;
}

#adminPanel .admin-sidebar.collapsed .asb-label,
#adminPanel .admin-sidebar.collapsed .asb-badge {
  opacity: 0;
  pointer-events: none;
  width: 0;
  overflow: hidden;
}

#adminPanel .admin-sidebar-btn .asb-badge {
  font-family: var(--font-mono);
  font-size: 0.68rem;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 10px;
  background: rgba(56, 189, 248, 0.15);
  color: #38BDF8;
  border: 1px solid rgba(56, 189, 248, 0.3);
  flex-shrink: 0;
  transition: opacity 0.2s ease;
}

#adminPanel .admin-sidebar-footer {
  padding: var(--sp-3) var(--sp-2);
  border-top: 1px solid rgba(212, 175, 55, 0.2);
}

#adminPanel .admin-sidebar-toggle {
  width: 100%;
  min-height: 40px;
  background: rgba(30, 41, 59, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: var(--radius);
  color: #94A3B8;
  font-family: var(--font-mono);
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 1px;
  text-transform: uppercase;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 0;
}

#adminPanel .admin-sidebar-toggle:hover {
  color: var(--pry-gold);
  border-color: rgba(212, 175, 55, 0.4);
  background: rgba(212, 175, 55, 0.08);
}

#adminPanel .admin-sidebar.collapsed .admin-sidebar-toggle .toggle-label {
  display: none;
}

#adminPanel .admin-sidebar-toggle .toggle-icon {
  transition: transform 0.3s ease;
  font-size: 0.9rem;
}

/* ── CONTENIDO ── */
#adminPanel .admin-content {
  flex: 1;
  min-width: 0;
  padding: var(--sp-5) var(--sp-6);
  max-width: 1400px;
  width: 100%;
  position: relative;
}

#adminPanel .admin-mobile-overlay {
  display: none;
}

#adminPanel .admin-mobile-trigger {
  display: none;
  position: fixed;
  top: calc(var(--sat, 0px) + 5.5rem);
  left: var(--sp-3);
  z-index: 60;
  width: 44px;
  height: 44px;
  min-height: 44px;
  padding: 0;
  border-radius: var(--radius);
  font-size: 1.2rem;
  background: rgba(30, 41, 59, 0.9);
  border: 1px solid rgba(212, 175, 55, 0.4);
  color: var(--pry-gold);
  align-items: center;
  justify-content: center;
}

/* ── RESPONSIVE: Tablet 768-1024px → sidebar colapsado ── */
@media (min-width: 768px) and (max-width: 1024px) {
  #adminPanel .admin-sidebar {
    width: var(--admin-sidebar-collapsed-w);
  }
  #adminPanel .admin-sidebar .asb-label,
  #adminPanel .admin-sidebar .asb-badge,
  #adminPanel .admin-sidebar .admin-sidebar-title {
    opacity: 0;
    pointer-events: none;
    width: 0;
    overflow: hidden;
  }
  #adminPanel .admin-sidebar-toggle .toggle-label {
    display: none;
  }
}

/* ── RESPONSIVE: Mobile < 768px → sidebar = drawer ── */
@media (max-width: 767px) {
  #adminPanel .admin-layout {
    min-height: auto;
  }

  #adminPanel .admin-sidebar {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    width: min(300px, 85vw);
    height: 100vh;
    transform: translateX(-105%);
    transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    z-index: 1000;
    box-shadow: 10px 0 40px rgba(0, 0, 0, 0.8);
    padding-top: var(--sat, 0px);
  }

  #adminPanel .admin-sidebar.mobile-open {
    transform: translateX(0);
  }

  #adminPanel .admin-sidebar.collapsed {
    width: min(300px, 85vw);
  }
  #adminPanel .admin-sidebar.collapsed .asb-label,
  #adminPanel .admin-sidebar.collapsed .asb-badge,
  #adminPanel .admin-sidebar.collapsed .admin-sidebar-title {
    opacity: 1;
    pointer-events: auto;
    width: auto;
    overflow: visible;
  }
  #adminPanel .admin-sidebar.collapsed .admin-sidebar-toggle .toggle-label {
    display: inline;
  }

  #adminPanel .admin-content {
    padding: var(--sp-4);
    padding-top: 5rem;
  }

  #adminPanel .admin-mobile-trigger {
    display: inline-flex;
  }

  #adminPanel .admin-mobile-overlay {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(7, 11, 25, 0.8);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    z-index: 999;
    opacity: 0;
    visibility: hidden;
    transition: opacity 0.28s ease, visibility 0.28s ease;
  }

  #adminPanel .admin-mobile-overlay.open {
    opacity: 1;
    visibility: visible;
  }
}
`;

function paso3_inyectarCSSViewsCSS() {
  title('PASO 3 — Insertar CSS del layout en css/views.css');

  if (!fs.existsSync(FILE_VIEWS_CSS)) {
    err(`No existe: ${FILE_VIEWS_CSS}`);
    process.exit(1);
  }

  let contenido = fs.readFileSync(FILE_VIEWS_CSS, 'utf8');

  // ¿Ya estaba inyectado?
  if (contenido.includes(VIEWS_CSS_MARKER)) {
    warn('El bloque CSS ya estaba en views.css (skip)');
    return { skipped: true };
  }

  // Backup
  crearBackupSiNoExiste(FILE_VIEWS_CSS);

  // Append al final
  contenido += VIEWS_CSS_BLOCK;
  fs.writeFileSync(FILE_VIEWS_CSS, contenido, 'utf8');
  ok('Escrito: css/views.css');

  return { skipped: false };
}

// ═══════════════════════════════════════════════════════════════
//  MAIN
// ═══════════════════════════════════════════════════════════════

function main() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  🚀 FASE 2 — Refactor del Panel Admin (script único)');
  console.log('═══════════════════════════════════════════════════════');

  const r1 = paso1_refactorAdminPanel();
  const r2 = paso2_inyectarStubViewsJS();
  const r3 = paso3_inyectarCSSViewsCSS();

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  ✅ FASE 2 — Aplicada correctamente');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  admin-panel.html:  refactorizado (shell + sidebar)`);
  console.log(`  Modales preservados: ${r1.modalesPreservados.length}/${MODALES_A_PRESERVAR.length}`);
  if (r1.faltantes.length > 0) {
    console.log(`  ⚠️  Faltantes: ${r1.faltantes.join(', ')}`);
  }
  console.log(`  js/views.js:       ${r2.skipped ? 'ya tenía el stub (skip)' : 'stub inyectado + verificado'}`);
  console.log(`  css/views.css:     ${r3.skipped ? 'ya tenía el CSS (skip)' : 'CSS del layout inyectado'}`);
  console.log('');
  console.log('  📁 Backups creados:');
  console.log('     components/admin-panel.html.bak-f2');
  console.log('     js/views.js.bak-f2');
  console.log('     css/views.css.bak-f2');
  console.log('');
  console.log('  🌐 Próximo paso:');
  console.log('     1. Abrir la app en el navegador');
  console.log('     2. Ir al Panel Admin');
  console.log('     3. Verificar: sidebar visible + 5 botones + toggle');
  console.log('     4. Probar responsive (F12 → mobile/tablet/desktop)');
  console.log('');
  console.log('  🔙 Rollback:');
  console.log('     copy components\\admin-panel.html.bak-f2 components\\admin-panel.html');
  console.log('     copy js\\views.js.bak-f2              js\\views.js');
  console.log('     copy css\\views.css.bak-f2            css\\views.css');
  console.log('═══════════════════════════════════════════════════════\n');
}

main();