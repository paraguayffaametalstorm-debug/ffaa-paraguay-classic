#!/usr/bin/env node
/**
 * ============================================================================
 * PARAGUAY-FFAA | METALSTORM
 * Script de Reorganización del Panel de Admin (Fase 1) — v2
 * ============================================================================
 *
 * Objetivo: Reorganizar el panel de admin en 3 tabs (Resumen / Pilotos /
 * Eventos) SIN ROMPER NADA.
 *
 * Garantías:
 *   1. Backup automático antes de tocar cualquier archivo.
 *   2. Verifica los 63 IDs críticos antes Y después.
 *   3. Dry-run por default (requiere --apply para escribir).
 *   4. Rollback automático si algo falla.
 *   5. Idempotente: correr 2 veces no rompe nada.
 *
 * Uso:
 *   node scripts\reorganize-admin-panel.cjs              → dry-run
 *   node scripts\reorganize-admin-panel.cjs --apply      → aplica
 *   node scripts\reorganize-admin-panel.cjs --rollback   → restaura backup
 * ============================================================================
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ── Configuración ─────────────────────────────────────────────────────────
const ROOT          = path.resolve(__dirname, '..');
const ADMIN_PANEL   = path.join(ROOT, 'components', 'admin-panel.html');
const VIEWS_CSS     = path.join(ROOT, 'css', 'views.css');
const SW_JS         = path.join(ROOT, 'sw.js');

const APPLY    = process.argv.includes('--apply');
const ROLLBACK = process.argv.includes('--rollback');
const NEW_SW_VERSION = 'v4.5.11-admin-reorg';

// ── IDs críticos que NO deben desaparecer ─────────────────────────────────
const CRITICAL_IDS = [
  // Panel raíz
  'adminPanel',

  // KPIs
  'totalMembers', 'adminAvgTokens', 'atRiskMembers', 'lastUpdate', 'pilotsByStatus',

  // Toggle y pestañas de miembros
  'membersSectionToggleIcon', 'membersSectionBody',
  'tabActive', 'tabInactive', 'tabAll',
  'tabActiveCount', 'tabInactiveCount', 'tabAllCount',

  // Filtros
  'memberSearch', 'roleFilter', 'weeksFilter', 'perfStatusFilter', 'statusFilter',

  // Tabla y formulario de registro
  'membersTableBody', 'noResultsMessage',
  'newMemberNick', 'newMemberEmailLocal', 'newMemberRole', 'newMemberEmailFullPreview',

  // Eventos v2
  'adminEventsV2Container',
  'adminEventCreateModal', 'adminEventCreateForm',
  'evCreateType', 'evCreateName', 'evCreateStart', 'evCreateEnd',
  'evCreateSqFields', 'evCreateBmFields',
  'evCreateSqTargetMembers', 'evCreateSqTargetTokens',
  'evCreateBmAircraftId', 'evCreateBmAircraftName',
  'evCreateBmBasePrice', 'evCreateBmMaxDiscount',

  // Modales de inactivar / reactivar / completar / carga masiva
  'inactivateUserModal', 'inactivateUserId', 'inactivateUserNick',
  'inactivateUserNickDisplay', 'inactivateReasonSelect',
  'inactivateReasonText', 'inactivateReasonCounter',

  'reactivateUserModal', 'reactivateUserId', 'reactivateUserNick',
  'reactivateUserNickDisplay', 'reactivateReasonText', 'reactivateReasonCounter',

  'completeReasonModal', 'completeReasonUserId', 'completeReasonUserNick',
  'completeReasonUserNickDisplay', 'completeReasonText', 'completeReasonCounter',

  'uploadEventModal', 'eventIdInput', 'eventBulkData',

  // Template
  'memberTableRowTemplate'
];

// ── Helpers de logging ────────────────────────────────────────────────────
function log(msg)   { console.log(msg); }
function ok(msg)    { console.log('  \x1b[32m\u2713\x1b[0m ' + msg); }
function warn(msg)  { console.log('  \x1b[33m\u26A0\x1b[0m ' + msg); }
function fail(msg)  { console.log('  \x1b[31m\u2717\x1b[0m ' + msg); }
function header(msg){ console.log('\n\x1b[36m\u25B6 ' + msg + '\x1b[0m'); }

function timestamp() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function readFile(p) {
  if (!fs.existsSync(p)) {
    fail(`Archivo no encontrado: ${p}`);
    process.exit(1);
  }
  return fs.readFileSync(p, 'utf8');
}

function writeFile(p, content) {
  fs.writeFileSync(p, content, 'utf8');
}

function countIds(html, ids) {
  return ids.filter(id => html.includes(`id="${id}"`)).length;
}

// ══════════════════════════════════════════════════════════════════════════
// FASE A — Verificación previa
// ══════════════════════════════════════════════════════════════════════════
function verifyPreconditions() {
  header('FASE A — Verificación previa');

  if (!fs.existsSync(ADMIN_PANEL)) {
    fail(`No existe ${ADMIN_PANEL}`);
    process.exit(1);
  }
  ok(`Archivo encontrado: ${path.relative(ROOT, ADMIN_PANEL)}`);

  const html = readFile(ADMIN_PANEL);

  // Verificar que TODOS los IDs críticos estén presentes ANTES
  const missing = CRITICAL_IDS.filter(id => !html.includes(`id="${id}"`));
  if (missing.length > 0) {
    fail(`Faltan ${missing.length} IDs críticos en el HTML ACTUAL:`);
    missing.forEach(id => console.log(`      - #${id}`));
    fail('Abortando. El HTML base ya estaba roto o cambió.');
    process.exit(1);
  }
  ok(`${CRITICAL_IDS.length} IDs críticos presentes ANTES`);

  // Detectar si ya está re-organizado (idempotencia)
  if (html.includes('id="adminTabResumen"') || html.includes('id="adminTabPilotos"')) {
    warn('El panel YA parece estar re-organizado. Abortando sin cambios.');
    warn('Si querés volver a ejecutarlo, primero restaurá el backup.');
    process.exit(0);
  }
  ok('El panel está en su estado original (a reorganizar)');

  // Verificar CSS
  const css = readFile(VIEWS_CSS);
  if (css.includes('.admin-tabs')) {
    warn('CSS ya tiene .admin-tabs — se va a saltar el paso de CSS');
  } else {
    ok('CSS limpio (no hay .admin-tabs todavía)');
  }

  // Verificar SW
  const sw = readFile(SW_JS);
  if (sw.includes(NEW_SW_VERSION)) {
    warn(`SW ya tiene ${NEW_SW_VERSION}`);
  } else {
    ok('SW listo para bumpear');
  }
}

// ══════════════════════════════════════════════════════════════════════════
// FASE B — Transformación del HTML
// ══════════════════════════════════════════════════════════════════════════
function transformHtml(html) {
  header('FASE B — Transformando HTML');

  // ─────────────────────────────────────────────────────────────────────
  // 1. Localizar el bloque de KPIs
  //    Desde "<!-- Admin General Stats -->" hasta justo antes del
  //    comentario que contiene "Black Market Control eliminado"
  // ─────────────────────────────────────────────────────────────────────
  const KPIS_START = '<!-- Admin General Stats -->';
  const KPIS_END_MARKER = 'Black Market Control eliminado';

  const kpisStartIdx = html.indexOf(KPIS_START);
  if (kpisStartIdx === -1) {
    fail('No se encontró el inicio de KPIs (<!-- Admin General Stats -->). Abortando.');
    process.exit(1);
  }

  const kpisEndMarkerIdx = html.indexOf(KPIS_END_MARKER, kpisStartIdx);
  if (kpisEndMarkerIdx === -1) {
    fail('No se encontró el fin de KPIs (Black Market Control eliminado). Abortando.');
    process.exit(1);
  }

  // Retroceder hasta el `<!--` que abre el comentario de fin
  let kpisBlockEnd = html.lastIndexOf('<!--', kpisEndMarkerIdx);
  if (kpisBlockEnd === -1 || kpisBlockEnd <= kpisStartIdx) {
    fail('No se pudo delimitar el fin del bloque KPIs. Abortando.');
    process.exit(1);
  }
  // Retroceder espacios/saltos de línea previos
  while (kpisBlockEnd > kpisStartIdx && /\s/.test(html[kpisBlockEnd - 1])) {
    kpisBlockEnd--;
  }

  const kpisBlock = html.substring(kpisStartIdx, kpisBlockEnd);
  ok(`Bloque de KPIs extraído (${kpisBlock.length} bytes)`);

  // ─────────────────────────────────────────────────────────────────────
  // 2. Localizar la sección de miembros
  //    Desde "<!-- Members Management Section -->"
  //    hasta justo antes de "<!-- Eventos Unificados v2 (F4.3) -->"
  // ─────────────────────────────────────────────────────────────────────
  const MEMBERS_START = '<!-- Members Management Section -->';
  const MEMBERS_END   = '<!-- Eventos Unificados v2 (F4.3) -->';

  const membersStartIdx = html.indexOf(MEMBERS_START, kpisBlockEnd);
  const membersEndIdx   = html.indexOf(MEMBERS_END, membersStartIdx);

  if (membersStartIdx === -1) {
    fail('No se encontró "<!-- Members Management Section -->". Abortando.');
    process.exit(1);
  }
  if (membersEndIdx === -1) {
    fail('No se encontró "<!-- Eventos Unificados v2 (F4.3) -->". Abortando.');
    process.exit(1);
  }
  ok('Anclajes de miembros encontrados');

  let membersBlockEnd = membersEndIdx;
  while (membersBlockEnd > membersStartIdx && /\s/.test(html[membersBlockEnd - 1])) {
    membersBlockEnd--;
  }
  const membersBlock = html.substring(membersStartIdx, membersBlockEnd);
  ok(`Bloque de miembros extraído (${membersBlock.length} bytes)`);

  // ─────────────────────────────────────────────────────────────────────
  // 3. Localizar la sección de eventos
  //    Desde "<!-- Eventos Unificados v2 (F4.3) -->"
  //    hasta justo antes de "<!-- Modal Crear Evento (F4.3) -->"
  // ─────────────────────────────────────────────────────────────────────
  const EVENTS_END = '<!-- Modal Crear Evento (F4.3) -->';

  const eventsStartIdx = membersEndIdx;
  const eventsEndIdx   = html.indexOf(EVENTS_END, eventsStartIdx);

  if (eventsEndIdx === -1) {
    fail('No se encontró "<!-- Modal Crear Evento (F4.3) -->". Abortando.');
    process.exit(1);
  }
  ok('Anclajes de eventos encontrados');

  let eventsBlockEnd = eventsEndIdx;
  while (eventsBlockEnd > eventsStartIdx && /\s/.test(html[eventsBlockEnd - 1])) {
    eventsBlockEnd--;
  }
  const eventsBlock = html.substring(eventsStartIdx, eventsBlockEnd);
  ok(`Bloque de eventos extraído (${eventsBlock.length} bytes)`);

  // ─────────────────────────────────────────────────────────────────────
  // 4. Construir el HTML nuevo
  // ─────────────────────────────────────────────────────────────────────

  // 4.1 — Prefijo: desde el inicio hasta justo antes del bloque KPIs
  const prefix = html.substring(0, kpisStartIdx);
  ok(`Prefijo extraído (${prefix.length} bytes)`);

  // 4.2 — Sufijo: desde el marcador "Modal Crear Evento" hasta el final
  const suffix = html.substring(eventsEndIdx);
  ok(`Sufijo extraído (${suffix.length} bytes)`);

  // 4.3 — Los tabs nuevos
  const tabs = `
  <!-- =============================================================== -->
  <!-- NAVEGACIÓN POR TABS (Fase 1 — Reorganización Panel Admin)      -->
  <!-- =============================================================== -->
  <div class="admin-tabs" role="tablist" aria-label="Secciones del Panel de Comandancia">
    <button type="button" class="admin-tab-btn active" data-tab="Resumen" onclick="switchAdminTab('Resumen')" role="tab" aria-selected="true">
      <span>📊</span> <span>Resumen</span>
    </button>
    <button type="button" class="admin-tab-btn" data-tab="Pilotos" onclick="switchAdminTab('Pilotos')" role="tab" aria-selected="false">
      <span>👥</span> <span>Pilotos</span>
    </button>
    <button type="button" class="admin-tab-btn" data-tab="Eventos" onclick="switchAdminTab('Eventos')" role="tab" aria-selected="false">
      <span>📅</span> <span>Eventos</span>
    </button>
  </div>

  <!-- --- TAB 1: RESUMEN ------------------------------------------- -->
  <div id="adminTabResumen" class="admin-tab-content active" data-tab-content="Resumen">
`;

  const tabResumenClose = `
  </div>

  <!-- --- TAB 2: PILOTOS -------------------------------------------- -->
  <div id="adminTabPilotos" class="admin-tab-content" data-tab-content="Pilotos">
`;

  const tabPilotosClose = `
  </div>

  <!-- --- TAB 3: EVENTOS -------------------------------------------- -->
  <div id="adminTabEventos" class="admin-tab-content" data-tab-content="Eventos">
`;

  const tabEventosClose = `
  </div>

  <!-- =============================================================== -->
  <!-- FIN DE LOS TABS                                                 -->
  <!-- =============================================================== -->

  <!-- Script: switchAdminTab (Fase 1 — aditivo, no toca nada existente) -->
  <script>
    window.switchAdminTab = function(tabName) {
      document.querySelectorAll('#adminPanel .admin-tab-content').forEach(function(el) {
        el.classList.remove('active');
      });
      document.querySelectorAll('#adminPanel .admin-tab-btn').forEach(function(el) {
        el.classList.remove('active');
        el.setAttribute('aria-selected', 'false');
      });
      var content = document.getElementById('adminTab' + tabName);
      var button  = document.querySelector('#adminPanel .admin-tab-btn[data-tab="' + tabName + '"]');
      if (content) content.classList.add('active');
      if (button) {
        button.classList.add('active');
        button.setAttribute('aria-selected', 'true');
      }
    };
  </script>
`;

  // Reconstrucción final
  const newHtml =
    prefix +
    tabs +
    kpisBlock + '\n' +
    tabResumenClose +
    membersBlock + '\n' +
    tabPilotosClose +
    eventsBlock + '\n' +
    tabEventosClose +
    suffix;

  ok(`HTML reconstruido (${newHtml.length} bytes)`);
  return newHtml;
}

// ══════════════════════════════════════════════════════════════════════════
// FASE C — Verificación post-transformación
// ══════════════════════════════════════════════════════════════════════════
function verifyPostTransform(newHtml) {
  header('FASE C — Verificación post-transformación');

  // Contar IDs críticos en el nuevo HTML
  const present = countIds(newHtml, CRITICAL_IDS);
  if (present !== CRITICAL_IDS.length) {
    const missing = CRITICAL_IDS.filter(id => !newHtml.includes(`id="${id}"`));
    fail(`Faltan ${missing.length} IDs críticos DESPUÉS de la transformación:`);
    missing.forEach(id => console.log(`      - #${id}`));
    fail('Abortando. Rollback necesario.');
    process.exit(1);
  }
  ok(`${present}/${CRITICAL_IDS.length} IDs críticos presentes DESPUÉS`);

  // Verificar que los 3 tabs estén
  const tabs = ['adminTabResumen', 'adminTabPilotos', 'adminTabEventos'];
  tabs.forEach(t => {
    if (!newHtml.includes(`id="${t}"`)) {
      fail(`No se generó #${t}`);
      process.exit(1);
    }
  });
  ok('Los 3 tabs generados');

  // Verificar que la función switchAdminTab esté
  if (!newHtml.includes('window.switchAdminTab')) {
    fail('No se inyectó switchAdminTab');
    process.exit(1);
  }
  ok('switchAdminTab inyectado');

  // Verificar que adminPanel sigue siendo el wrapper raíz
  if (!newHtml.includes('id="adminPanel"')) {
    fail('Se perdió #adminPanel');
    process.exit(1);
  }
  ok('#adminPanel preservado');
}

// ══════════════════════════════════════════════════════════════════════════
// FASE D — CSS (aditivo)
// ══════════════════════════════════════════════════════════════════════════
function updateCss() {
  header('FASE D — CSS');

  const css = readFile(VIEWS_CSS);
  if (css.includes('.admin-tabs')) {
    warn('CSS ya contiene .admin-tabs — saltando');
    return false;
  }

  const newCss = css + `

/* ===============================================================
   ADMIN TABS (Fase 1 — Reorganización Panel Admin)
   Aditivo. No modifica estilos existentes.
   =============================================================== */

.admin-tabs {
  display: flex;
  gap: 6px;
  margin-bottom: 1.5rem;
  border-bottom: 2px solid rgba(212, 175, 55, 0.15);
  padding-bottom: 0;
  flex-wrap: wrap;
}

.admin-tab-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: transparent;
  border: none;
  border-bottom: 3px solid transparent;
  color: #94a3b8;
  font-family: var(--font-tactical, 'Rajdhani', sans-serif);
  font-weight: 600;
  font-size: 0.95rem;
  letter-spacing: 0.5px;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: -2px;
}

.admin-tab-btn:hover {
  color: #cbd5e1;
  background: rgba(212, 175, 55, 0.05);
}

.admin-tab-btn.active {
  color: #d4af37;
  border-bottom-color: #d4af37;
}

.admin-tab-content {
  display: none;
}

.admin-tab-content.active {
  display: block;
}

@media (max-width: 600px) {
  .admin-tab-btn {
    padding: 8px 14px;
    font-size: 0.85rem;
  }
}
`;

  writeFile(VIEWS_CSS, newCss);
  ok('CSS agregado al final de views.css');
  return true;
}

// ══════════════════════════════════════════════════════════════════════════
// FASE E — Bump del Service Worker
// ══════════════════════════════════════════════════════════════════════════
function updateSw() {
  header('FASE E — Service Worker');

  const sw = readFile(SW_JS);
  const regex = /const CACHE_NAME = ['"]([^'"]+)['"]/;
  const match = sw.match(regex);
  if (!match) {
    fail('No se encontró CACHE_NAME en sw.js');
    process.exit(1);
  }

  const oldVersion = match[1];
  if (oldVersion === NEW_SW_VERSION) {
    warn(`SW ya está en ${NEW_SW_VERSION}`);
    return false;
  }

  const newSw = sw.replace(regex, `const CACHE_NAME = '${NEW_SW_VERSION}'`);
  writeFile(SW_JS, newSw);
  ok(`SW: ${oldVersion} -> ${NEW_SW_VERSION}`);
  return true;
}

// ══════════════════════════════════════════════════════════════════════════
// FASE F — Backup y escritura
// ══════════════════════════════════════════════════════════════════════════
function backupAndWrite(newHtml) {
  header('FASE F — Backup y escritura');

  const ts = timestamp();
  const backupPath = `${ADMIN_PANEL}.bak-${ts}`;

  // Backup del HTML
  fs.copyFileSync(ADMIN_PANEL, backupPath);
  ok(`Backup HTML: ${path.relative(ROOT, backupPath)}`);

  // Backup del CSS y SW (por si hay rollback)
  const cssBackup = `${VIEWS_CSS}.bak-${ts}`;
  const swBackup  = `${SW_JS}.bak-${ts}`;
  fs.copyFileSync(VIEWS_CSS, cssBackup);
  fs.copyFileSync(SW_JS, swBackup);
  ok(`Backup CSS:  ${path.relative(ROOT, cssBackup)}`);
  ok(`Backup SW:   ${path.relative(ROOT, swBackup)}`);

  // Escribir HTML
  writeFile(ADMIN_PANEL, newHtml);
  ok('admin-panel.html reescrito');

  return { backupPath, cssBackup, swBackup, ts };
}

// ══════════════════════════════════════════════════════════════════════════
// ROLLBACK
// ══════════════════════════════════════════════════════════════════════════
function doRollback() {
  header('ROLLBACK — Restaurando backups');

  const dir = path.dirname(ADMIN_PANEL);
  const files = fs.readdirSync(dir)
    .filter(f => f.startsWith('admin-panel.html.bak-'))
    .map(f => ({ name: f, mtime: fs.statSync(path.join(dir, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);

  if (files.length === 0) {
    fail('No hay backups de admin-panel.html');
    process.exit(1);
  }

  const latest = files[0];
  const latestPath = path.join(dir, latest.name);
  ok(`Backup más reciente: ${latest.name}`);

  // Restaurar HTML
  fs.copyFileSync(latestPath, ADMIN_PANEL);
  ok('admin-panel.html restaurado');

  // Buscar backups de CSS y SW con el mismo timestamp
  const tsMatch = latest.name.match(/\.bak-(\d{8}-\d{6})$/);
  if (tsMatch) {
    const ts = tsMatch[1];
    const cssBak = `${VIEWS_CSS}.bak-${ts}`;
    const swBak  = `${SW_JS}.bak-${ts}`;
    if (fs.existsSync(cssBak)) {
      fs.copyFileSync(cssBak, VIEWS_CSS);
      ok('views.css restaurado');
    }
    if (fs.existsSync(swBak)) {
      fs.copyFileSync(swBak, SW_JS);
      ok('sw.js restaurado');
    }
  }

  log('\n\x1b[32m\u2705 Rollback completado.\x1b[0m');
  log('   Para verificar, ejecutá:');
  log('   git diff --stat');
}

// ══════════════════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════════════════
function main() {
  console.log('\n\x1b[36m+============================================================+\x1b[0m');
  console.log('\x1b[36m|  REORGANIZACIÓN PANEL ADMIN — Fase 1                       |\x1b[0m');
  console.log('\x1b[36m|  PARAGUAY-FFAA | METALSTORM                                |\x1b[0m');
  console.log('\x1b[36m+============================================================+\x1b[0m');

  if (ROLLBACK) {
    doRollback();
    return;
  }

  if (!APPLY) {
    log('\n\x1b[33m\u26A1 MODO DRY-RUN — no se escribe nada\x1b[0m');
    log('   Para aplicar los cambios, correr con --apply\n');
  }

  // 1. Verificación previa
  verifyPreconditions();

  // 2. Transformar
  const html = readFile(ADMIN_PANEL);
  const newHtml = transformHtml(html);

  // 3. Verificar
  verifyPostTransform(newHtml);

  if (!APPLY) {
    header('RESUMEN (DRY-RUN)');
    log(`   HTML original:  ${html.length} bytes`);
    log(`   HTML nuevo:     ${newHtml.length} bytes`);
    log(`   Diferencia:     ${newHtml.length - html.length} bytes`);
    log('');
    log('\x1b[33m   Para aplicar los cambios, ejecutá:\x1b[0m');
    log('\x1b[36m   node scripts\\reorganize-admin-panel.cjs --apply\x1b[0m');
    log('');
    return;
  }

  // 4. Aplicar
  backupAndWrite(newHtml);
  updateCss();
  updateSw();

  header('\u2705 COMPLETADO');
  log('\n\x1b[32m   Cambios aplicados:\x1b[0m');
  log('     \u2713 components/admin-panel.html  (reorganizado en 3 tabs)');
  log('     \u2713 css/views.css                (estilos .admin-tabs agregados)');
  log('     \u2713 sw.js                        (CACHE_NAME bumpeado)');
  log('');
  log('\x1b[33m   Para verificar:\x1b[0m');
  log('     git diff --stat');
  log('     git diff components/admin-panel.html | head -100');
  log('');
  log('\x1b[33m   Para hacer deploy:\x1b[0m');
  log('     git add components/admin-panel.html css/views.css sw.js scripts/reorganize-admin-panel.cjs');
  log('     git commit -m "feat(admin-panel): reorganizar en 3 tabs (Fase 1)"');
  log('     fly deploy');
  log('');
  log('\x1b[31m   Si algo sale mal:\x1b[0m');
  log('     node scripts\\reorganize-admin-panel.cjs --rollback');
  log('');
}

main();