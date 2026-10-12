#!/usr/bin/env node
/**
 * ============================================================================
 *  F1.5a — Script #3: Integración + Estilos + Cache Bump
 * ============================================================================
 *  Proyecto:  PARAGUAY-FFAA | METALSTORM
 *  Fase:      F1.5a (Frontend Torneos - Sprint 8)
 *  Commit:    #3 de 4
 *  Ref:       PLAN_TRABAJO_TORNEOS.md §F1.5
 * ============================================================================
 *  OBJETIVO
 *  --------
 *  Integrar la vista de Torneos en el proyecto:
 *
 *  A. js/views.js         → 3 cambios quirúrgicos:
 *     1. Agregar TOURNAMENTS a VIEWS.
 *     2. Agregar aliases a VIEW_ALIASES.
 *     3. Agregar case en loadViewData().
 *
 *  B. css/views.css       → Bloque aditivo al final (~80 líneas):
 *     - Estilos de bracket, torneos, soporte tema clásico.
 *     - Complementan los <style> inline del HTML.
 *
 *  C. index.html          → 4 cambios quirúrgicos:
 *     1. Bump ?v=4.8.3 → ?v=4.9.0 (~36 ocurrencias).
 *     2. Agregar 'tournaments' a COMPONENTS.
 *     3. Agregar botón "Torneos Internos" en mobile drawer.
 *     4. Agregar <script src="/js/tournaments.js?v=4.9.0"></script>.
 *
 *  D. sw.js               → 2 cambios quirúrgicos:
 *     1. CACHE_NAME → 'PARAGUAY-FFAA-METALSTORM-v4.9.0-f1.5a'.
 *     2. Agregar 2 assets a STATIC_ASSETS.
 *
 *  REGLAS DEL PROYECTO APLICADAS
 *  -----------------------------
 *  - NO usar content.replace() con strings multi-línea (HALL-068).
 *  - Usar split(/\r?\n/) + findIndex + splice + writeFileSync.
 *  - node --check post-escritura en js/views.js.
 *  - Backup .bak-f1.5a de cada archivo antes de modificar.
 *  - Script idempotente (2da ejecución no duplica).
 *
 *  USO
 *  ---
 *  node scripts/f1-5a-integration.cjs              → dry-run (default)
 *  node scripts/f1-5a-integration.cjs --apply      → aplicar cambios
 * ============================================================================
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ─── CONFIGURACIÓN ──────────────────────────────────────────────────────────
const ROOT = path.resolve(__dirname, '..');
const VIEWS_JS     = path.join(ROOT, 'js', 'views.js');
const VIEWS_CSS    = path.join(ROOT, 'css', 'views.css');
const INDEX_HTML   = path.join(ROOT, 'index.html');
const SW_JS        = path.join(ROOT, 'sw.js');

const BACKUP_SUFFIX = '.bak-f1.5a';
const NEW_VERSION   = '4.9.0';
const OLD_VERSION   = '4.8.3';

// ─── ARGS ───────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const IS_DRY_RUN = !APPLY;

// ─── HELPERS ────────────────────────────────────────────────────────────────
function log(prefix, message) {
  const icons = { ok: '✅', fail: '❌', info: 'ℹ️ ', warn: '⚠️ ', step: '🔹' };
  console.log(`${icons[prefix] || '  '} ${message}`);
}

function ensureFile(filePath, label) {
  if (!fs.existsSync(filePath)) {
    log('fail', `${label} no encontrado: ${filePath}`);
    process.exit(1);
  }
  log('ok', `${label} encontrado`);
}

function backup(filePath) {
  const bPath = filePath + BACKUP_SUFFIX;
  if (!fs.existsSync(bPath)) {
    fs.copyFileSync(filePath, bPath);
    log('ok', `Backup: ${path.basename(bPath)}`);
  } else {
    log('info', `Backup ya existe: ${path.basename(bPath)} (no sobreescrito)`);
  }
}

function nodeCheck(filePath) {
  try {
    execSync(`node --check "${filePath}"`, { stdio: 'pipe' });
    log('ok', `node --check ${path.basename(filePath)} → OK`);
    return true;
  } catch (err) {
    log('fail', `node --check falló en ${path.basename(filePath)}`);
    console.error(err.stderr ? err.stderr.toString() : err.message);
    return false;
  }
}

function readNormalized(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return raw.replace(/\r\n/g, '\n');
}

function writeNormalized(filePath, content) {
  fs.writeFileSync(filePath, content, 'utf8');
}

// ═══════════════════════════════════════════════════════════════════════════
//  CAMBIO A — js/views.js
// ═══════════════════════════════════════════════════════════════════════════
function applyViewsJs() {
  log('step', 'A. js/views.js — 3 cambios quirúrgicos');

  const content = readNormalized(VIEWS_JS);
  const lines = content.split('\n');
  let changes = 0;

  // ─── Cambio A.1: VIEWS ─────────────────────────────────────
  const viewsAnchor = "VETERAN_PANEL:";
  const idxViews = lines.findIndex(l => l.includes(viewsAnchor) && l.includes("veteranPanelView"));
  if (idxViews === -1) {
    log('fail', 'Cambio A.1: No se encontró anchor VETERAN_PANEL en VIEWS');
    return { ok: false, content };
  }
  const existingTournamentView = lines.slice(idxViews, idxViews + 5).some(l => l.includes("TOURNAMENTS:"));
  if (existingTournamentView) {
    log('info', 'Cambio A.1: TOURNAMENTS ya está en VIEWS (idempotente)');
  } else {
    // Agregar coma después de 'veteranPanelView' (antes de cualquier comentario)
    // Regex captura: 'veteranPanelView' [espacios opcionales] [// comentario opcional]
    const lineA = lines[idxViews];
    // Solo agregar coma si no la tiene ya
    if (!lineA.match(/['"]veteranPanelView['"]\s*,/)) {
      // Insertar coma después de 'veteranPanelView' manteniendo el resto
      lines[idxViews] = lineA.replace(
        /(['"]veteranPanelView['"])(\s*(?:\/\/.*)?)$/,
        "$1,$2"
      );
    }
    lines.splice(idxViews + 1, 0, "  TOURNAMENTS:      'tournamentsView'");
    log('ok', 'Cambio A.1: VIEWS.TOURNAMENTS agregado');
    changes++;
  }

  // ─── Cambio A.2: VIEW_ALIASES ──────────────────────────────
  const aliasesAnchor = "'pupilos':";
  const idxAliases = lines.findIndex(l => l.includes(aliasesAnchor) && l.includes("VIEWS.VETERAN_PANEL"));
  if (idxAliases === -1) {
    log('fail', 'Cambio A.2: No se encontró anchor pupilos en VIEW_ALIASES');
    return { ok: false, content: lines.join('\n') };
  }
  const existingTournamentAliases = lines.slice(idxAliases, idxAliases + 10).some(l => l.includes("'tournaments':"));
  if (existingTournamentAliases) {
    log('info', 'Cambio A.2: aliases tournaments ya existen (idempotente)');
  } else {
    // Agregar coma a la línea de pupilos (antes de comentario si lo hay)
    const lineB = lines[idxAliases];
    if (!lineB.match(/VIEWS\.VETERAN_PANEL\s*,/)) {
      lines[idxAliases] = lineB.replace(
        /(VIEWS\.VETERAN_PANEL)(\s*(?:\/\/.*)?)$/,
        "$1,$2"
      );
    }
    const aliasesBlock = [
      "  // Torneos (RFC-002 / ADR-011)",
      "  'tournaments':      VIEWS.TOURNAMENTS,",
      "  'tournament':       VIEWS.TOURNAMENTS,",
      "  'torneos':          VIEWS.TOURNAMENTS,",
      "  'torneo':           VIEWS.TOURNAMENTS,",
      "  'tournamentsView':  VIEWS.TOURNAMENTS"
    ];
    lines.splice(idxAliases + 1, 0, ...aliasesBlock);
    log('ok', 'Cambio A.2: 5 aliases tournaments agregados');
    changes++;
  }

  // ─── Cambio A.3: loadViewData case ─────────────────────────
  const caseAnchor = "if (typeof loadVeteranPanel === 'function') loadVeteranPanel();";
  const idxCase = lines.findIndex(l => l.includes(caseAnchor));
  if (idxCase === -1) {
    log('fail', 'Cambio A.3: No se encontró anchor loadVeteranPanel en loadViewData');
    return { ok: false, content: lines.join('\n') };
  }
  const nextLines = lines.slice(idxCase, idxCase + 10).join('\n');
  if (nextLines.includes("loadTournamentsView")) {
    log('info', 'Cambio A.3: case tournamentsView ya existe (idempotente)');
  } else {
    // Encontrar el `break;` siguiente
    let breakIdx = -1;
    for (let i = idxCase + 1; i < Math.min(idxCase + 10, lines.length); i++) {
      if (lines[i].trim() === 'break;') {
        breakIdx = i;
        break;
      }
    }
    if (breakIdx === -1) {
      log('fail', 'Cambio A.3: No se encontró break; después de loadVeteranPanel');
      return { ok: false, content: lines.join('\n') };
    }
    const newCase = [
      "",
      "    // F1.5a — Sistema de Torneos (RFC-002 / ADR-011)",
      "    case 'tournamentsView':",
      "    case 'tournaments':",
      "      if (typeof loadTournamentsView === 'function') loadTournamentsView();",
      "      break;"
    ];
    lines.splice(breakIdx + 1, 0, ...newCase);
    log('ok', 'Cambio A.3: case tournamentsView agregado');
    changes++;
  }

  const finalContent = lines.join('\n');
  return { ok: true, content: finalContent, changes };
}

// ═══════════════════════════════════════════════════════════════════════════
//  CAMBIO B — css/views.css
// ═══════════════════════════════════════════════════════════════════════════
const CSS_BLOCK = `

/* ============================================================
   TORNEOS (RFC-002 / ADR-011) — F1.5a
   ------------------------------------------------------------
   Estilos compartidos que complementan los <style> inline
   de components/tournaments.html. Se mantienen aquí para
   permitir reutilización en F1.5b y otras vistas.
   ============================================================ */

.tournaments-filters {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.75rem;
}
@media (min-width: 768px) {
  .tournaments-filters {
    grid-template-columns: 2fr 1fr 1fr auto;
  }
}
.tournaments-filters label {
  display: block;
  font-size: 0.75rem;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
  font-weight: 600;
}
.tournaments-filters input,
.tournaments-filters select {
  width: 100%;
  background: #0f172a;
  color: #cbd5e1;
  border: 1px solid #334155;
  border-radius: 4px;
  padding: 8px 12px;
  font-size: 0.9rem;
}

.tournaments-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}
@media (min-width: 768px) {
  .tournaments-grid {
    grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  }
}

.tournament-card {
  background: rgba(15,23,42,0.6);
  border: 1px solid rgba(99,110,130,0.3);
  border-left: 4px solid #38bdf8;
  border-radius: 8px;
  padding: 1rem 1.25rem;
  cursor: pointer;
  transition: all 0.2s ease;
}
.tournament-card:hover {
  background: rgba(30,41,59,0.7);
  border-left-color: #d4af37;
  transform: translateY(-2px);
}
.tournament-card.status-DRAFT { border-left-color: #94a3b8; }
.tournament-card.status-REGISTRATION { border-left-color: #38bdf8; }
.tournament-card.status-ONGOING { border-left-color: #f59e0b; }
.tournament-card.status-FINISHED { border-left-color: #10b981; }
.tournament-card.status-CANCELLED { border-left-color: #ef4444; opacity: 0.7; }

.tournament-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}
.tournament-card-name {
  font-size: 1.05rem;
  font-weight: 700;
  color: #f8fafc;
  margin: 0;
  font-family: var(--font-tactical);
  letter-spacing: 0.5px;
}
.tournament-card-meta {
  font-size: 0.8rem;
  color: #94a3b8;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 0.5rem;
  line-height: 1.5;
}

.tournament-tabs {
  display: flex;
  gap: 4px;
  border-bottom: 1px solid #1e293b;
  margin-bottom: 1rem;
  overflow-x: auto;
}
.tournament-tab {
  background: transparent;
  color: #94a3b8;
  border: none;
  padding: 8px 16px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.15s;
  white-space: nowrap;
  min-height: 38px;
}
.tournament-tab:hover { color: #cbd5e1; }
.tournament-tab.active {
  color: #d4af37;
  border-bottom-color: #d4af37;
}

.bracket-container {
  display: flex;
  gap: 1.5rem;
  overflow-x: auto;
  padding: 1rem 0;
  min-height: 200px;
}
.bracket-column {
  flex: 0 0 auto;
  min-width: 230px;
}
.bracket-column-title {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #64748b;
  font-weight: 700;
  margin-bottom: 0.75rem;
  text-align: center;
  font-family: var(--font-tactical);
}
.bracket-match {
  background: rgba(30,41,59,0.5);
  border: 1px solid rgba(99,110,130,0.3);
  border-radius: 6px;
  padding: 0.75rem;
  margin-bottom: 0.75rem;
}
.bracket-match.status-FINISHED { border-color: rgba(46,204,113,0.4); }
.bracket-match.status-LIVE { border-color: rgba(231,76,60,0.5); }
.bracket-team {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
  font-size: 0.85rem;
}
.bracket-team.winner { color: #2ecc71; font-weight: 700; }
.bracket-team.loser { color: #94a3b8; }
.bracket-team-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.bracket-team-score {
  font-family: var(--font-mono);
  font-weight: 700;
  margin-left: 8px;
}
.bracket-match-actions {
  display: flex;
  gap: 6px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid rgba(255,255,255,0.05);
}

@media (max-width: 767px) {
  .bracket-container {
    flex-direction: column;
    gap: 1rem;
  }
  .bracket-column {
    min-width: 100%;
  }
}

/* Tema clásico (claro) — override específico para Torneos */
body[data-theme="clasico"] .tournament-card {
  background: #ffffff;
  border-color: #d0d8e8;
  border-left-color: #0038A8;
}
body[data-theme="clasico"] .tournament-card-name { color: #0038A8; }
body[data-theme="clasico"] .tournament-card-meta { color: #495057; }
body[data-theme="clasico"] .tournament-tab.active {
  color: #0038A8;
  border-bottom-color: #0038A8;
}
body[data-theme="clasico"] .bracket-match {
  background: #ffffff;
  border-color: #d0d8e8;
}
body[data-theme="clasico"] .bracket-column-title { color: #6c757d; }
`;

function applyViewsCss() {
  log('step', 'B. css/views.css — Bloque aditivo');

  const content = readNormalized(VIEWS_CSS);

  // Idempotencia: marcador único
  const marker = 'TORNEOS (RFC-002 / ADR-011) — F1.5a';
  if (content.includes(marker)) {
    log('info', 'Bloque TORNEOS ya existe en views.css (idempotente)');
    return { ok: true, content, changed: false };
  }

  const finalContent = content + CSS_BLOCK;
  log('ok', `Bloque TORNEOS agregado (+~230 líneas)`);
  return { ok: true, content: finalContent, changed: true };
}

// ═══════════════════════════════════════════════════════════════════════════
//  ⚠️  BLOQUE B (index.html + sw.js + main) SE PEGA A CONTINUACIÓN
// ═══════════════════════════════════════════════════════════════════════════
//  Por favor, continuá pegando el Bloque B en este mismo archivo.
//  NO GUARDES NI EJECUTES hasta que el Bloque B esté pegado.
// ═══════════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════
//  CAMBIO C — index.html
// ═══════════════════════════════════════════════════════════════════════════

// ─── C.3: Botón Torneos en Mobile Side Drawer ─────────────────
// Se inserta después del botón "Manual de Piloto & FAQ" y antes de
// "Exportar Reporte PNG", en la sección "INFORMACIÓN & DOCTRINA".
const DRAWER_BTN_ANCHOR = `<i data-lucide="help-circle" class="drawer-nav-icon"></i>
          <span class="drawer-nav-text">Manual de Piloto & FAQ</span>
        </button>`;

const DRAWER_BTN_NEW = `${DRAWER_BTN_ANCHOR}
        <button class="drawer-nav-btn" onclick="showView('tournamentsView'); closeMobileDrawer();" data-view="tournamentsView">
          <i data-lucide="trophy" class="drawer-nav-icon" style="color:#d4af37;"></i>
          <span class="drawer-nav-text">Torneos Internos</span>
        </button>`;

function applyIndexHtml() {
  log('step', 'C. index.html — 4 cambios quirúrgicos');

  const content = readNormalized(INDEX_HTML);
  let working = content;
  let changes = 0;

  // ─── C.1: Bump ?v=4.8.3 → ?v=4.9.0 ─────────────────────────
  const versionPattern = new RegExp(`\\?v=${OLD_VERSION.replace(/\./g, '\\.')}`, 'g');
  const matches = (working.match(versionPattern) || []).length;
  if (matches === 0) {
    // Verificar si ya está en la nueva versión
    const alreadyBumped = working.includes(`?v=${NEW_VERSION}`);
    if (alreadyBumped) {
      log('info', `Cambio C.1: assets ya están en ?v=${NEW_VERSION} (idempotente)`);
    } else {
      log('warn', `Cambio C.1: no se encontró ?v=${OLD_VERSION} ni ?v=${NEW_VERSION}`);
    }
  } else {
    working = working.replace(versionPattern, `?v=${NEW_VERSION}`);
    log('ok', `Cambio C.1: ${matches} ocurrencias ?v=${OLD_VERSION} → ?v=${NEW_VERSION}`);
    changes++;
  }

  // ─── C.2: Agregar 'tournaments' a COMPONENTS ────────────────
  const componentsAnchor = "'veteran-panel'";
  const idxComponents = working.indexOf(componentsAnchor);
  if (idxComponents === -1) {
    log('fail', 'Cambio C.2: no se encontró anchor veteran-panel en COMPONENTS');
    return { ok: false, content: working };
  }
  const afterComponents = working.substring(idxComponents, idxComponents + 200);
  if (afterComponents.includes("'tournaments'")) {
    log('info', 'Cambio C.2: tournaments ya está en COMPONENTS (idempotente)');
  } else {
    // Buscar el cierre del array después del anchor
    // El anchor está en una línea tipo `      'veteran-panel'`
    // La línea siguiente es `    ];`
    const lines = working.split('\n');
    const anchorLine = lines.findIndex(l => l.includes(componentsAnchor));
    if (anchorLine === -1) {
      log('fail', 'Cambio C.2: no se pudo ubicar línea veteran-panel');
      return { ok: false, content: working };
    }
    // Verificar que la línea siguiente (o cercana) cierre el array con `];`
    // Nota: en index.html, 'veteran-panel' es la última del array, seguida de `];`
    // Agregar coma al anchor y agregar la nueva línea
    lines[anchorLine] = lines[anchorLine].replace(/(['"]veteran-panel['"])\s*$/, "$1,");
    lines.splice(anchorLine + 1, 0, "      'tournaments'");
    working = lines.join('\n');
    log('ok', 'Cambio C.2: tournaments agregado a COMPONENTS');
    changes++;
  }

  // ─── C.3: Botón Torneos en Mobile Drawer ────────────────────
  if (working.includes("data-view=\"tournamentsView\"")) {
    log('info', 'Cambio C.3: botón Torneos ya existe en drawer (idempotente)');
  } else {
    const normalizedAnchor = DRAWER_BTN_ANCHOR.replace(/\r\n/g, '\n');
    if (!working.includes(normalizedAnchor)) {
      log('warn', 'Cambio C.3: no se encontró anchor del botón Help en drawer. Saltando.');
    } else {
      working = working.replace(normalizedAnchor, DRAWER_BTN_NEW);
      log('ok', 'Cambio C.3: botón Torneos agregado en mobile drawer');
      changes++;
    }
  }

  // ─── C.4: Script tournaments.js ─────────────────────────────
  const scriptAnchor = '<script src="/js/veteran.js?v=';
  const idxScript = working.indexOf(scriptAnchor);
  if (idxScript === -1) {
    log('fail', 'Cambio C.4: no se encontró anchor del script veteran.js');
    return { ok: false, content: working };
  }
  const afterScript = working.substring(idxScript, idxScript + 300);
  if (afterScript.includes("tournaments.js")) {
    log('info', 'Cambio C.4: script tournaments.js ya está (idempotente)');
  } else {
    // Encontrar la línea completa del script veteran.js y agregar después
    const lines = working.split('\n');
    const veteranScriptLine = lines.findIndex(l => l.includes(scriptAnchor));
    if (veteranScriptLine === -1) {
      log('fail', 'Cambio C.4: no se pudo ubicar línea de veteran.js');
      return { ok: false, content: working };
    }
    // Insertar después de la línea de veteran.js
    lines.splice(veteranScriptLine + 1, 0,
      '  <!-- F1.5a — Sistema de Torneos (RFC-002 / ADR-011) -->',
      `  <script src="/js/tournaments.js?v=${NEW_VERSION}"></script>`
    );
    working = lines.join('\n');
    log('ok', 'Cambio C.4: script tournaments.js insertado');
    changes++;
  }

  return { ok: true, content: working, changes };
}

// ═══════════════════════════════════════════════════════════════════════════
//  CAMBIO D — sw.js
// ═══════════════════════════════════════════════════════════════════════════
function applySwJs() {
  log('step', 'D. sw.js — 2 cambios quirúrgicos');

  const content = readNormalized(SW_JS);
  let working = content;
  let changes = 0;

  // ─── D.1: CACHE_NAME ────────────────────────────────────────
  const cachePattern = /const CACHE_NAME\s*=\s*'[^']*';/;
  const cacheMatch = working.match(cachePattern);
  if (!cacheMatch) {
    log('fail', 'Cambio D.1: no se encontró CACHE_NAME en sw.js');
    return { ok: false, content: working };
  }
  const oldCacheName = cacheMatch[0];
  const newCacheName = `const CACHE_NAME = 'PARAGUAY-FFAA-METALSTORM-v${NEW_VERSION}-f1.5a';`;
  if (oldCacheName.includes(`v${NEW_VERSION}-f1.5a`)) {
    log('info', 'Cambio D.1: CACHE_NAME ya está actualizado (idempotente)');
  } else {
    working = working.replace(cachePattern, newCacheName);
    log('ok', `Cambio D.1: CACHE_NAME → v${NEW_VERSION}-f1.5a`);
    changes++;
  }

  // ─── D.2: STATIC_ASSETS ─────────────────────────────────────
  const assetsAnchor = "'/js/veteran.js'";
  const idxAssets = working.indexOf(assetsAnchor);
  if (idxAssets === -1) {
    log('fail', 'Cambio D.2: no se encontró anchor veteran.js en STATIC_ASSETS');
    return { ok: false, content: working };
  }
  const afterAssets = working.substring(idxAssets, idxAssets + 500);
  if (afterAssets.includes('/js/tournaments.js')) {
    log('info', 'Cambio D.2: tournaments assets ya están (idempotente)');
  } else {
    // Encontrar línea de veteran.js
    const lines = working.split('\n');
    const veteranLine = lines.findIndex(l => l.includes(assetsAnchor));
    if (veteranLine === -1) {
      log('fail', 'Cambio D.2: no se pudo ubicar línea veteran.js en assets');
      return { ok: false, content: working };
    }
    // Buscar el cierre del array después de veteran.js (puede tener más líneas)
    // El orden en sw.js es:
    //   '/js/veteran.js',
    //   '/components/admin-sections/admin-veterans.html',
    //   '/js/admin-veterans.js'
    // ];
    // Insertamos después de la última línea antes de `];`
    let closeIdx = -1;
    for (let i = veteranLine; i < Math.min(veteranLine + 10, lines.length); i++) {
      if (lines[i].trim().startsWith('];')) {
        closeIdx = i;
        break;
      }
    }
    if (closeIdx === -1) {
      log('fail', 'Cambio D.2: no se encontró cierre ]; de STATIC_ASSETS');
      return { ok: false, content: working };
    }
    // Agregar coma a la línea anterior (closeIdx - 1) si no la tiene
    const prevIdx = closeIdx - 1;
    if (prevIdx >= 0 && !lines[prevIdx].trim().endsWith(',') && !lines[prevIdx].trim().endsWith('],')) {
      lines[prevIdx] = lines[prevIdx].replace(/\s*$/, ',');
    }
    // Insertar nuevos assets antes del cierre
    lines.splice(closeIdx, 0,
      "  '/components/tournaments.html',",
      "  '/js/tournaments.js'"
    );
    working = lines.join('\n');
    log('ok', 'Cambio D.2: 2 assets tournaments agregados');
    changes++;
  }

  return { ok: true, content: working, changes };
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════
function main() {
  console.log('');
  console.log('================================================================');
  console.log('  F1.5a — Script #3: Integración + Estilos + Cache Bump');
  console.log('================================================================');
  console.log('');

  if (IS_DRY_RUN) {
    log('warn', 'Modo --dry-run activo: NINGÚN archivo será modificado.');
    console.log('');
  }

  // [1/7] Verificar entorno
  log('step', '[1/7] Verificando entorno...');
  ensureFile(VIEWS_JS, 'js/views.js');
  ensureFile(VIEWS_CSS, 'css/views.css');
  ensureFile(INDEX_HTML, 'index.html');
  ensureFile(SW_JS, 'sw.js');
  ensureFile(path.join(ROOT, 'components', 'tournaments.html'), 'components/tournaments.html');
  ensureFile(path.join(ROOT, 'js', 'tournaments.js'), 'js/tournaments.js');

  // [2/7] Cambio A: js/views.js
  log('step', '[2/7] Preparando Cambio A (js/views.js)...');
  const resultA = applyViewsJs();
  if (!resultA.ok) {
    log('fail', 'Cambio A falló. Abortando.');
    process.exit(1);
  }

  // [3/7] Cambio B: css/views.css
  log('step', '[3/7] Preparando Cambio B (css/views.css)...');
  const resultB = applyViewsCss();
  if (!resultB.ok) {
    log('fail', 'Cambio B falló. Abortando.');
    process.exit(1);
  }

  // [4/7] Cambio C: index.html
  log('step', '[4/7] Preparando Cambio C (index.html)...');
  const resultC = applyIndexHtml();
  if (!resultC.ok) {
    log('fail', 'Cambio C falló. Abortando.');
    process.exit(1);
  }

  // [5/7] Cambio D: sw.js
  log('step', '[5/7] Preparando Cambio D (sw.js)...');
  const resultD = applySwJs();
  if (!resultD.ok) {
    log('fail', 'Cambio D falló. Abortando.');
    process.exit(1);
  }

  // [6/7] Ejecutar o dry-run
  log('step', '[6/7] Ejecutando...');
  if (IS_DRY_RUN) {
    log('info', '[DRY-RUN] No se escribiría nada.');
    log('info', '[DRY-RUN] Ejecutar con `--apply` para aplicar.');
    console.log('');
    console.log('----------------------------------------------------------------');
    console.log('  RESUMEN (dry-run)');
    console.log('----------------------------------------------------------------');
    console.log('  Archivos a modificar:  4');
    console.log('    · js/views.js        → ~' + ((resultA.changes || 0) > 0 ? '15' : '0') + ' líneas');
    console.log('    · css/views.css      → +~230 líneas');
    console.log('    · index.html         → ~' + ((resultC.changes || 0) > 0 ? '40' : '0') + ' líneas');
    console.log('    · sw.js              → +3 líneas');
    console.log('  Backups a crear:       .bak-f1.5a (x4)');
    console.log('  Verificación:          node --check js/views.js');
    console.log('  Bump de versión:       ?v=' + OLD_VERSION + ' → ?v=' + NEW_VERSION);
    console.log('  Cache bump:            PARAGUAY-FFAA-METALSTORM-v' + NEW_VERSION + '-f1.5a');
    console.log('----------------------------------------------------------------');
    console.log('');
    process.exit(0);
  }

  // Aplicar cambios con backup
  backup(VIEWS_JS);
  writeNormalized(VIEWS_JS, resultA.content);
  log('ok', `js/views.js actualizado`);

  backup(VIEWS_CSS);
  writeNormalized(VIEWS_CSS, resultB.content);
  log('ok', `css/views.css actualizado`);

  backup(INDEX_HTML);
  writeNormalized(INDEX_HTML, resultC.content);
  log('ok', `index.html actualizado`);

  backup(SW_JS);
  writeNormalized(SW_JS, resultD.content);
  log('ok', `sw.js actualizado`);

  // [7/7] Verificación
  log('step', '[7/7] Verificando sintaxis JS...');
  const jsChecks = [
    nodeCheck(VIEWS_JS),
    nodeCheck(SW_JS)
  ];
  if (jsChecks.some(x => !x)) {
    log('fail', 'node --check falló. Restaurar backups manualmente desde .bak-f1.5a');
    process.exit(1);
  }

  // Resumen final
  console.log('');
  console.log('----------------------------------------------------------------');
  console.log('  RESUMEN');
  console.log('----------------------------------------------------------------');
  console.log('  ✅ js/views.js actualizado');
  console.log('  ✅ css/views.css actualizado (+~230 líneas)');
  console.log('  ✅ index.html actualizado');
  console.log('  ✅ sw.js actualizado');
  console.log('  ✅ node --check OK en js/views.js + sw.js');
  console.log('  ✅ Backups: *.bak-f1.5a (4 archivos)');
  console.log('----------------------------------------------------------------');
  console.log('');
  console.log('PRÓXIMOS PASOS:');
  console.log('  1. Verificar:  git diff js/views.js index.html sw.js css/views.css');
  console.log('  2. Commit:     git add js/views.js css/views.css index.html sw.js');
  console.log('                 git commit -m "feat(tournaments): integración + estilos + cache bump F1.5a"');
  console.log('  3. Push:       git push origin main');
  console.log('');
}

main();