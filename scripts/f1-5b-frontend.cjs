#!/usr/bin/env node
/**
 * ============================================================================
 *  F1.5b — Script #2: Frontend del Modal de Draft
 * ============================================================================
 *  Proyecto:  PARAGUAY-FFAA | METALSTORM
 *  Fase:      F1.5b (Modal de Draft — Sprint 8)
 *  Commit:    #2 de 4
 *  Ref:       PLAN_TRABAJO_TORNEOS.md §F1.5b
 *             ANEXO-III-torneos.md §7 (Reglas del draft)
 *             ADR-011 (Sistema de Torneos)
 * ============================================================================
 *  OBJETIVO
 *  --------
 *  1. components/tournaments.html:
 *     - Botón "🎯 Draft" en cada match del bracket (visible solo a moderadores).
 *     - Modal #tournamentDraftModal con:
 *       · Header (Partida N · Fase · BoX).
 *       · Selector BAN/PICK + selector de equipo (A/B).
 *       · Timer 5 min por equipo.
 *       · Grilla de aeronaves con imágenes de Cloudinary.
 *       · Lista de acciones ya registradas (bans/picks previos).
 *       · Botón "Registrar Acción".
 *
 *  2. js/tournaments.js:
 *     - ~10 funciones: openDraftModal, loadDraftGrid, selectAircraft,
 *       setDraftAction, setDraftTeam, submitDraftAction, renderExistingDrafts,
 *       startDraftTimer, stopDraftTimer, renderDraftBadgeInBracket.
 *
 *  3. js/api.js:
 *     - Wrapper apiTournamentsGetMatchDrafts(id, mid).
 *
 *  REGLAS DEL PROYECTO APLICADAS
 *  -----------------------------
 *  - NO content.replace() con multi-línea (HALL-068).
 *  - split(/\r?\n/) + findIndex() + splice() + writeFileSync.
 *  - node --check post-modificación.
 *  - Backup .bak-f1.5b de cada archivo antes de modificar.
 *  - Script idempotente.
 *  - Windows CMD compatible.
 *
 *  USO
 *  ---
 *  node scripts/f1-5b-frontend.cjs              → dry-run (default)
 *  node scripts/f1-5b-frontend.cjs --apply      → aplicar cambios
 * ============================================================================
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ─── CONFIGURACIÓN ──────────────────────────────────────────────────────────
const ROOT          = path.resolve(__dirname, '..');
const HTML_PATH     = path.join(ROOT, 'components', 'tournaments.html');
const JS_TOURN      = path.join(ROOT, 'js', 'tournaments.js');
const JS_API        = path.join(ROOT, 'js', 'api.js');
const BACKUP_SUFFIX = '.bak-f1.5b';

// ─── ARGS ───────────────────────────────────────────────────────────────────
const args       = process.argv.slice(2);
const APPLY      = args.includes('--apply');
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
    log('info', `Backup ya existe: ${path.basename(bPath)}`);
  }
}

function readNormalized(filePath) {
  return fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');
}

function writeNormalized(filePath, content) {
  fs.writeFileSync(filePath, content, 'utf8');
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

// ═══════════════════════════════════════════════════════════════════════════
//  CAMBIO 2 — Modal #tournamentDraftModal
// ═══════════════════════════════════════════════════════════════════════════
//  Se inserta ANTES del bloque de estilos inline (al final del HTML).
// ═══════════════════════════════════════════════════════════════════════════

function applyDraftModal(content) {
  log('step', 'B. HTML — Modal #tournamentDraftModal');

  // Idempotencia
  if (content.includes('id="tournamentDraftModal"')) {
    log('info', 'Modal draft ya existe (idempotente)');
    return { ok: true, content, changed: false };
  }

  const lines = content.split('\n');

  // Anchor: el bloque de estilos inline final (<!-- ESTILOS INLINE -->)
  const anchorIdx = lines.findIndex(l =>
    l.includes('ESTILOS INLINE') && l.includes('complementan css/views.css')
  );
  if (anchorIdx === -1) {
    log('fail', 'No se encontró anchor "ESTILOS INLINE" en tournaments.html');
    return { ok: false, content };
  }
  log('ok', `Anchor ESTILOS INLINE en línea ${anchorIdx + 1}`);

  // Buscar el comentario de apertura del bloque estilos
  let insertAt = anchorIdx;
  for (let i = anchorIdx; i >= 0 && i > anchorIdx - 5; i--) {
    if (lines[i].trim().startsWith('<!--')) {
      insertAt = i;
      break;
    }
  }
  log('ok', `Insertando antes del bloque de estilos (línea ${insertAt + 1})`);

  const modalBlock = [
    '',
    '<!-- ═══ MODAL 6: Draft del Match (F1.5b) ═══ -->',
    '<div id="tournamentDraftModal" class="modal">',
    '  <div class="modal-content tactical-corners" style="max-width:1000px;max-height:92vh;overflow:hidden;display:flex;flex-direction:column;">',
    '',
    '    <div class="modal-header">',
    '      <div style="flex:1;min-width:0;">',
    '        <h3 style="font-family:var(--font-tactical);color:#d4af37;margin:0;display:flex;align-items:center;gap:8px;">',
    '          <span>🎯 Draft</span>',
    '          <span id="tDraftGameNumber" style="font-size:0.9rem;color:#cbd5e1;font-weight:normal;">— Partida 1</span>',
    '          <span id="tDraftPhaseBadge" class="badge-tag" style="font-size:0.7rem;">—</span>',
    '          <span id="tDraftBestOfBadge" class="badge-tag" style="font-size:0.7rem;">Bo3</span>',
    '        </h3>',
    '      </div>',
    '      <span class="close-btn" onclick="closeDraftModal()">&times;</span>',
    '    </div>',
    '',
    '    <div class="modal-body" style="flex:1;overflow-y:auto;">',
    '',
    '      <!-- Info del match + timer -->',
    '      <div style="display:grid;grid-template-columns:1fr auto;gap:12px;align-items:center;margin-bottom:1rem;">',
    '        <div id="tDraftMatchInfo" style="background:rgba(15,23,42,0.7);border:1px solid rgba(99,110,130,0.3);border-radius:6px;padding:10px 14px;font-size:0.85rem;color:#cbd5e1;">',
    '          <!-- JS: equipo A vs equipo B · mapa -->',
    '        </div>',
    '        <div id="tDraftTimerBox" style="background:rgba(212,175,55,0.1);border:1px solid rgba(212,175,55,0.4);border-radius:6px;padding:10px 18px;text-align:center;min-width:130px;">',
    '          <div style="font-size:0.7rem;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:2px;">⏱️ Timer</div>',
    '          <div id="tDraftTimerValue" style="font-family:var(--font-mono);font-size:1.4rem;font-weight:700;color:#fde047;line-height:1;">05:00</div>',
    '          <div id="tDraftTimerTeam" style="font-size:0.7rem;color:#94a3b8;margin-top:2px;">Equipo A</div>',
    '        </div>',
    '      </div>',
    '',
    '      <!-- Controles de acción -->',
    '      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:1rem;">',
    '        <div>',
    '          <label style="display:block;font-size:0.75rem;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;font-weight:600;">Acción</label>',
    '          <div style="display:flex;gap:4px;">',
    '            <button id="tDraftBtnBan" onclick="setDraftAction(\'BAN\')" class="btn-secondary" style="flex:1;font-size:0.85rem;padding:6px 10px;">🚫 BAN</button>',
    '            <button id="tDraftBtnPick" onclick="setDraftAction(\'PICK\')" class="btn-secondary" style="flex:1;font-size:0.85rem;padding:6px 10px;">✈️ PICK</button>',
    '          </div>',
    '        </div>',
    '        <div>',
    '          <label style="display:block;font-size:0.75rem;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;font-weight:600;">Equipo</label>',
    '          <div style="display:flex;gap:4px;">',
    '            <button id="tDraftBtnTeamA" onclick="setDraftTeam(\'A\')" class="btn-secondary" style="flex:1;font-size:0.85rem;padding:6px 10px;">🔵 A</button>',
    '            <button id="tDraftBtnTeamB" onclick="setDraftTeam(\'B\')" class="btn-secondary" style="flex:1;font-size:0.85rem;padding:6px 10px;">🔴 B</button>',
    '          </div>',
    '        </div>',
    '        <div>',
    '          <label style="display:block;font-size:0.75rem;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;font-weight:600;">Partida</label>',
    '          <input type="number" id="tDraftGameNumberInput" min="1" max="5" value="1"',
    '                 style="width:100%;padding:6px 10px;background:#0f172a;border:1px solid #334155;border-radius:4px;color:#f8fafc;font-size:0.9rem;text-align:center;" />',
    '        </div>',
    '      </div>',
    '',
    '      <!-- Estado de selección -->',
    '      <div id="tDraftSelectionInfo" style="background:rgba(56,189,248,0.08);border-left:3px solid #38bdf8;border-radius:4px;padding:8px 12px;font-size:0.82rem;color:#bae6fd;line-height:1.5;margin-bottom:1rem;">',
    '        ℹ️ Seleccioná un equipo, modo (BAN/PICK) y luego una aeronave de la grilla.',
    '      </div>',
    '',
    '      <!-- Grilla de aeronaves -->',
    '      <div style="margin-bottom:1rem;">',
    '        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">',
    '          <label style="font-size:0.75rem;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Aeronaves disponibles</label>',
    '          <input type="text" id="tDraftAircraftSearch" placeholder="Buscar..." oninput="filterDraftGrid()"',
    '                 style="padding:4px 10px;background:#0f172a;border:1px solid #334155;border-radius:4px;color:#f8fafc;font-size:0.8rem;width:180px;" />',
    '        </div>',
    '        <div id="tDraftAircraftGrid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(90px,1fr));gap:6px;max-height:280px;overflow-y:auto;padding:4px;">',
    '          <div style="grid-column:1/-1;text-align:center;padding:2rem;color:#94a3b8;">⏳ Cargando aeronaves…</div>',
    '        </div>',
    '      </div>',
    '',
    '      <!-- Draft existente -->',
    '      <div>',
    '        <label style="display:block;font-size:0.75rem;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;margin-bottom:8px;">Acciones registradas en esta partida</label>',
    '        <div id="tDraftExistingList" style="display:flex;flex-direction:column;gap:4px;max-height:180px;overflow-y:auto;">',
    '          <div style="text-align:center;padding:1rem;color:#94a3b8;font-size:0.85rem;">Sin acciones registradas aún.</div>',
    '        </div>',
    '      </div>',
    '',
    '    </div>',
    '',
    '    <div class="modal-footer">',
    '      <button onclick="closeDraftModal()" class="btn-secondary">Cerrar</button>',
    '      <button id="tDraftSubmit" onclick="submitDraftAction()" class="btn-primary">💾 Registrar Acción</button>',
    '    </div>',
    '',
    '  </div>',
    '</div>',
    '',
    ''
  ];

  lines.splice(insertAt, 0, ...modalBlock);
  log('ok', `Modal draft insertado (${modalBlock.length} líneas)`);

  return { ok: true, content: lines.join('\n'), changed: true };
}
// ═══════════════════════════════════════════════════════════════════════════
//  CAMBIO 3 — js/tournaments.js: ~10 funciones del draft
// ═══════════════════════════════════════════════════════════════════════════
//  Se insertan ANTES del `console.log('✅ [Tournaments] Módulo F1.5a cargado`
//  (al final del archivo actual).
// ═══════════════════════════════════════════════════════════════════════════

function applyDraftFunctions(content) {
  log('step', 'C. JS tournaments.js — agregar ~10 funciones del draft');

  // Idempotencia
  if (content.includes('function openDraftModal(')) {
    log('info', 'Funciones draft ya existen (idempotente)');
    return { ok: true, content, changed: false };
  }

  const lines = content.split('\n');

  // Anchor: el console.log final
  const anchorIdx = lines.findIndex(l =>
    l.includes("[Tournaments] Módulo F1.5a cargado")
  );
  if (anchorIdx === -1) {
    log('fail', 'No se encontró anchor console.log final en tournaments.js');
    return { ok: false, content };
  }
  log('ok', `Anchor final en línea ${anchorIdx + 1}`);

  const draftBlock = [
    '',
    '// ═══════════════════════════════════════════════════════════════════════════',
    '// F1.5b — MODAL DE DRAFT',
    '// ═══════════════════════════════════════════════════════════════════════════',
    '//  Anexo III §7: 1 ban por equipo, Mirrored Picks permitidos, último BM',
    '//  auto-baneado, timer 5 min por equipo.',
    '// ═══════════════════════════════════════════════════════════════════════════',
    '',
    'const draftState = {',
    '  matchId: null,',
    '  tournamentId: null,',
    '  match: null,',
    '  teamAId: null,',
    '  teamBId: null,',
    '  bestOf: 3,',
    '  currentAction: \'BAN\',   // \'BAN\' | \'PICK\'',
    '  currentTeam: \'A\',       // \'A\' | \'B\'',
    '  selectedAircraftId: null,',
    '  aircraftList: [],',
    '  aircraftLoaded: false,',
    '  existingDrafts: [],',
    '  timerInterval: null,',
    '  timerSecondsLeft: 300',
    '};',
    '',
    '// ─── Apertura del modal ─────────────────────────────────',
    'async function openDraftModal(matchId) {',
    '  const detail = tournamentsState.currentDetail;',
    '  if (!detail?.matches || !detail?.tournament) {',
    '    showToast(\'⚠️ No hay match seleccionado\', \'warning\');',
    '    return;',
    '  }',
    '',
    '  const match = detail.matches.find(m => String(m.id) === String(matchId));',
    '  if (!match) {',
    '    showToast(\'⚠️ Match no encontrado\', \'warning\');',
    '    return;',
    '  }',
    '',
    '  // RBAC: solo moderador o ADMIN/OWNER',
    '  if (!canModerateTournament(detail.tournament)) {',
    '    showToast(\'⚠️ Solo el moderador puede operar el draft\', \'warning\');',
    '    return;',
    '  }',
    '',
    '  // Reset state',
    '  draftState.matchId = matchId;',
    '  draftState.tournamentId = detail.tournament.id;',
    '  draftState.match = match;',
    '  draftState.teamAId = match.team_a_id;',
    '  draftState.teamBId = match.team_b_id;',
    '  draftState.bestOf = match.best_of || 3;',
    '  draftState.currentAction = \'BAN\';',
    '  draftState.currentTeam = \'A\';',
    '  draftState.selectedAircraftId = null;',
    '  draftState.existingDrafts = [];',
    '',
    '  // Header del modal',
    '  const gn = document.getElementById(\'tDraftGameNumberInput\')?.value || 1;',
    '  const gameNumberEl = document.getElementById(\'tDraftGameNumber\');',
    '  if (gameNumberEl) gameNumberEl.textContent = `— Partida ${gn}`;',
    '',
    '  const phaseEl = document.getElementById(\'tDraftPhaseBadge\');',
    '  if (phaseEl) phaseEl.textContent = formatMatchPhase(match.phase);',
    '',
    '  const boEl = document.getElementById(\'tDraftBestOfBadge\');',
    '  if (boEl) boEl.textContent = `Bo${draftState.bestOf}`;',
    '',
    '  // Info del match',
    '  const teamAName = resolveNickByUserId(match.team_a_id);',
    '  const teamBName = resolveNickByUserId(match.team_b_id);',
    '  const infoEl = document.getElementById(\'tDraftMatchInfo\');',
    '  if (infoEl) {',
    '    infoEl.innerHTML = `',
    '      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;">',
    '        <div style="font-size:0.9rem;color:#f8fafc;font-weight:600;">',
    '          <span style="color:#38bdf8;">${teamAName}</span> vs <span style="color:#ef4444;">${teamBName}</span>',
    '        </div>',
    '        <div style="font-size:0.75rem;color:#94a3b8;">',
    '          📅 Partida 1 · ${escapeHTML(formatMatchPhase(match.phase))} · Ronda ${match.round || 1}',
    '        </div>',
    '      </div>',
    '      <div style="font-size:0.75rem;color:#64748b;margin-top:6px;">',
    '        🗺️ Mapa: <em>ver reglamento</em> (Countdown / Icebound / Crimson Canyon)',
    '      </div>',
    '    `;',
    '  }',
    '',
    '  // Estado inicial de botones',
    '  updateDraftButtonStates();',
    '',
    '  // Seleccionar equipo A por defecto',
    '  setDraftTeam(\'A\', true);',
    '',
    '  // Reset timer',
    '  stopDraftTimer();',
    '  draftState.timerSecondsLeft = 300;',
    '  updateTimerDisplay();',
    '  startDraftTimer();',
    '',
    '  // Mostrar modal',
    '  showModal(\'tournamentDraftModal\');',
    '',
    '  // Cargar aeronaves (async)',
    '  await loadDraftAircraft();',
    '',
    '  // Cargar drafts existentes (async)',
    '  await refreshExistingDrafts();',
    '',
    '  if (typeof refreshLucideIcons === \'function\') setTimeout(refreshLucideIcons, 50);',
    '}',
    'window.openDraftModal = openDraftModal;',
    '',
    '// ─── Cierre del modal ───────────────────────────────────',
    'function closeDraftModal() {',
    '  stopDraftTimer();',
    '  draftState.matchId = null;',
    '  draftState.tournamentId = null;',
    '  draftState.match = null;',
    '  draftState.selectedAircraftId = null;',
    '  closeModal(\'tournamentDraftModal\');',
    '}',
    'window.closeDraftModal = closeDraftModal;',
    '',
    '// ─── Carga de aeronaves ─────────────────────────────────',
    'async function loadDraftAircraft() {',
    '  if (draftState.aircraftLoaded && draftState.aircraftList.length > 0) {',
    '    renderDraftAircraftGrid();',
    '    return;',
    '  }',
    '',
    '  try {',
    '    const res = await apiGetPlaneModels({});',
    '    if (!res.success) {',
    '      console.warn(\'[Draft] No se pudo cargar el catálogo\', res.error);',
    '      draftState.aircraftList = [];',
    '    } else {',
    '      draftState.aircraftList = res.models || res.plane_models || [];',
    '    }',
    '    draftState.aircraftLoaded = true;',
    '    renderDraftAircraftGrid();',
    '  } catch (err) {',
    '    console.error(\'[Draft] loadDraftAircraft error:\', err);',
    '    draftState.aircraftList = [];',
    '    renderDraftAircraftGrid();',
    '  }',
    '}',
    '',
    '// ─── Render de la grilla de aeronaves ───────────────────',
    'function renderDraftAircraftGrid() {',
    '  const grid = document.getElementById(\'tDraftAircraftGrid\');',
    '  if (!grid) return;',
    '',
    '  const list = draftState.aircraftList;',
    '  if (!list || list.length === 0) {',
    '    grid.innerHTML = \'<div style="grid-column:1/-1;text-align:center;padding:2rem;color:#f87171;">⚠️ No se pudo cargar el catálogo de aeronaves.</div>\';',
    '    return;',
    '  }',
    '',
    '  // IDs baneados en esta partida',
    '  const gameNumber = Number(document.getElementById(\'tDraftGameNumberInput\')?.value || 1);',
    '  const bannedIds = new Set(',
    '    draftState.existingDrafts',
    '      .filter(d => d.game_number === gameNumber && d.action === \'BAN\')',
    '      .map(d => String(d.aircraft_id))',
    '  );',
    '',
    '  const search = (document.getElementById(\'tDraftAircraftSearch\')?.value || \'\').toLowerCase().trim();',
    '',
    '  const filtered = list.filter(a => {',
    '    if (search) {',
    '      const name = String(a.name || \'\').toLowerCase();',
    '      if (!name.includes(search)) return false;',
    '    }',
    '    return true;',
    '  });',
    '',
    '  grid.innerHTML = filtered.map(a => {',
    '    const id = String(a.id || \'\');',
    '    const isBanned = bannedIds.has(id);',
    '    const isSelected = String(draftState.selectedAircraftId) === id;',
    '    const imgUrl = a.image_url || \'\';',
    '',
    '    return `',
    '      <div onclick="${isBanned ? \'\' : `selectAircraft(\'${escapeHTML(id)}\')`}"',
    '           style="',
    '             position:relative;',
    '             background:${isSelected ? \'rgba(212,175,55,0.15)\' : \'rgba(15,23,42,0.6)\'};',
    '             border:${isSelected ? \'2px solid #d4af37\' : \'1px solid rgba(99,110,130,0.3)\'};',
    '             border-radius:6px;',
    '             padding:6px;',
    '             cursor:${isBanned ? \'not-allowed\' : \'pointer\'};',
    '             opacity:${isBanned ? \'0.35\' : \'1\'};',
    '             text-align:center;',
    '             transition:all 0.15s;',
    '           "',
    '           title="${escapeHTML(a.name || \'\')}${isBanned ? \' (BANEADA)\' : \'\'}">',
    '        ${isBanned ? \'<div style="position:absolute;top:2px;right:4px;font-size:0.9rem;">🚫</div>\' : \'\'}',
    '        ${imgUrl',
    '          ? `<img src="${escapeHTML(imgUrl)}" alt="${escapeHTML(a.name || \'\')}" style="width:100%;height:60px;object-fit:cover;border-radius:4px;" loading="lazy" />`',
    '          : \'<div style="width:100%;height:60px;background:#1e293b;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:1.5rem;">✈️</div>\'}',
    '        <div style="font-size:0.7rem;color:#cbd5e1;margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${escapeHTML(a.name || \'\')}">',
    '          ${escapeHTML(a.name || \'Sin nombre\')}',
    '        </div>',
    '      </div>',
    '    `;',
    '  }).join(\'\');',
    '}',
    'window.renderDraftAircraftGrid = renderDraftAircraftGrid;',
    '',
    '// ─── Filtro de la grilla ────────────────────────────────',
    'function filterDraftGrid() {',
    '  renderDraftAircraftGrid();',
    '}',
    'window.filterDraftGrid = filterDraftGrid;',
    '',
    '// ─── Selección de aeronave ──────────────────────────────',
    'function selectAircraft(aircraftId) {',
    '  draftState.selectedAircraftId = aircraftId;',
    '',
    '  const aircraft = draftState.aircraftList.find(a => String(a.id) === String(aircraftId));',
    '  const infoEl = document.getElementById(\'tDraftSelectionInfo\');',
    '  if (infoEl && aircraft) {',
    '    const teamLabel = draftState.currentTeam === \'A\' ? \'🔵 Equipo A\' : \'🔴 Equipo B\';',
    '    const actionIcon = draftState.currentAction === \'BAN\' ? \'🚫\' : \'✈️\';',
    '    infoEl.innerHTML = `',
    '      <strong>${actionIcon} ${draftState.currentAction}</strong> · ${teamLabel} · Partida ${document.getElementById(\'tDraftGameNumberInput\')?.value || 1}',
    '      → <span style="color:#fde047;font-weight:700;">${escapeHTML(aircraft.name || \'—\')}</span>',
    '    `;',
    '    infoEl.style.borderLeftColor = draftState.currentAction === \'BAN\' ? \'#ef4444\' : \'#10b981\';',
    '  }',
    '',
    '  renderDraftAircraftGrid();',
    '}',
    'window.selectAircraft = selectAircraft;',
    '',
    '// ─── Set acción (BAN/PICK) ──────────────────────────────',
    'function setDraftAction(action) {',
    '  if (![\'BAN\', \'PICK\'].includes(action)) return;',
    '  draftState.currentAction = action;',
    '  updateDraftButtonStates();',
    '',
    '  // Actualizar info si hay aeronave seleccionada',
    '  if (draftState.selectedAircraftId) {',
    '    selectAircraft(draftState.selectedAircraftId);',
    '  }',
    '}',
    'window.setDraftAction = setDraftAction;',
    '',
    '// ─── Set equipo (A/B) ───────────────────────────────────',
    'function setDraftTeam(team, silent = false) {',
    '  if (![\'A\', \'B\'].includes(team)) return;',
    '  draftState.currentTeam = team;',
    '  updateDraftButtonStates();',
    '',
    '  // Actualizar timer label',
    '  const timerTeamEl = document.getElementById(\'tDraftTimerTeam\');',
    '  if (timerTeamEl) {',
    '    timerTeamEl.textContent = team === \'A\' ? \'Equipo A\' : \'Equipo B\';',
    '  }',
    '',
    '  // Reiniciar timer al cambiar equipo (regla: 5 min POR equipo)',
    '  if (!silent) {',
    '    draftState.timerSecondsLeft = 300;',
    '    updateTimerDisplay();',
    '  }',
    '}',
    'window.setDraftTeam = setDraftTeam;',
    '',
    '// ─── Actualizar estados visuales de los botones ─────────',
    'function updateDraftButtonStates() {',
    '  const btnBan = document.getElementById(\'tDraftBtnBan\');',
    '  const btnPick = document.getElementById(\'tDraftBtnPick\');',
    '  const btnA = document.getElementById(\'tDraftBtnTeamA\');',
    '  const btnB = document.getElementById(\'tDraftBtnTeamB\');',
    '',
    '  const activeStyle = \'background:#d4af37;color:#0f172a;border-color:#d4af37;font-weight:700;\';',
    '  const inactiveStyle = \'\';',
    '',
    '  if (btnBan) btnBan.style.cssText = draftState.currentAction === \'BAN\' ? activeStyle : inactiveStyle;',
    '  if (btnPick) btnPick.style.cssText = draftState.currentAction === \'PICK\' ? activeStyle : inactiveStyle;',
    '  if (btnA) btnA.style.cssText = draftState.currentTeam === \'A\' ? activeStyle : inactiveStyle;',
    '  if (btnB) btnB.style.cssText = draftState.currentTeam === \'B\' ? activeStyle : inactiveStyle;',
    '}',
    '',
    '// ─── Timer 5 min ────────────────────────────────────────',
    'function startDraftTimer() {',
    '  stopDraftTimer();',
    '  draftState.timerInterval = setInterval(() => {',
    '    draftState.timerSecondsLeft--;',
    '    updateTimerDisplay();',
    '',
    '    if (draftState.timerSecondsLeft <= 0) {',
    '      stopDraftTimer();',
    '      showToast(\'⏰ Timer agotado. Se debe asignar aeronave por defecto del rol.\', \'warning\');',
    '      // Según Anexo III §7.6: asignar aeronave por defecto del rol correspondiente.',
    '      // Por ahora solo advertimos (feature futura: auto-pick).',
    '    }',
    '  }, 1000);',
    '}',
    '',
    'function stopDraftTimer() {',
    '  if (draftState.timerInterval) {',
    '    clearInterval(draftState.timerInterval);',
    '    draftState.timerInterval = null;',
    '  }',
    '}',
    '',
    'function updateTimerDisplay() {',
    '  const el = document.getElementById(\'tDraftTimerValue\');',
    '  if (!el) return;',
    '',
    '  const total = draftState.timerSecondsLeft;',
    '  const mm = String(Math.floor(total / 60)).padStart(2, \'0\');',
    '  const ss = String(total % 60).padStart(2, \'0\');',
    '  el.textContent = `${mm}:${ss}`;',
    '',
    '  // Color según tiempo restante',
    '  if (total <= 30) {',
    '    el.style.color = \'#ef4444\';',
    '  } else if (total <= 90) {',
    '    el.style.color = \'#f59e0b\';',
    '  } else {',
    '    el.style.color = \'#fde047\';',
    '  }',
    '}',
    '',
    '// ─── Refrescar lista de drafts existentes ───────────────',
    'async function refreshExistingDrafts() {',
    '  if (!draftState.matchId || !draftState.tournamentId) return;',
    '',
    '  try {',
    '    const res = await apiTournamentsGetMatchDrafts(draftState.tournamentId, draftState.matchId);',
    '    if (!res.success) {',
    '      console.warn(\'[Draft] No se pudieron cargar los drafts\', res.error);',
    '      draftState.existingDrafts = [];',
    '    } else {',
    '      draftState.existingDrafts = res.drafts || [];',
    '    }',
    '  } catch (err) {',
    '    console.error(\'[Draft] refreshExistingDrafts error:\', err);',
    '    draftState.existingDrafts = [];',
    '  }',
    '',
    '  renderExistingDraftsList();',
    '  renderDraftAircraftGrid();  // re-render para actualizar baneadas',
    '}',
    'window.refreshExistingDrafts = refreshExistingDrafts;',
    '',
    '// ─── Render de la lista de acciones existentes ──────────',
    'function renderExistingDraftsList() {',
    '  const listEl = document.getElementById(\'tDraftExistingList\');',
    '  if (!listEl) return;',
    '',
    '  const gameNumber = Number(document.getElementById(\'tDraftGameNumberInput\')?.value || 1);',
    '  const gameDrafts = draftState.existingDrafts',
    '    .filter(d => d.game_number === gameNumber)',
    '    .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));',
    '',
    '  if (gameDrafts.length === 0) {',
    '    listEl.innerHTML = \'<div style="text-align:center;padding:1rem;color:#94a3b8;font-size:0.85rem;">Sin acciones registradas aún.</div>\';',
    '    return;',
    '  }',
    '',
    '  listEl.innerHTML = gameDrafts.map(d => {',
    '    const aircraft = draftState.aircraftList.find(a => String(a.id) === String(d.aircraft_id));',
    '    const aircraftName = aircraft?.name || `#${String(d.aircraft_id).substring(0, 8)}`;',
    '    const teamLabel = String(d.team_id) === String(draftState.teamAId) ? \'🔵 A\' : \'🔴 B\';',
    '    const actionIcon = d.action === \'BAN\' ? \'🚫\' : \'✈️\';',
    '    const actionColor = d.action === \'BAN\' ? \'#ef4444\' : \'#10b981\';',
    '',
    '    return `',
    '      <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 10px;background:rgba(15,23,42,0.5);border-left:3px solid ${actionColor};border-radius:4px;font-size:0.82rem;">',
    '        <span style="color:#cbd5e1;">',
    '          <span style="color:#64748b;font-family:var(--font-mono);font-size:0.75rem;margin-right:6px;">#${d.order_index}</span>',
    '          ${teamLabel} ${actionIcon} <strong>${escapeHTML(d.action)}</strong>',
    '        </span>',
    '        <span style="color:#f8fafc;font-weight:600;">${escapeHTML(aircraftName)}</span>',
    '      </div>',
    '    `;',
    '  }).join(\'\');',
    '}',
    '',
    '// ─── Submit de acción del draft ─────────────────────────',
    'async function submitDraftAction() {',
    '  if (!draftState.matchId || !draftState.tournamentId) {',
    '    showToast(\'⚠️ No hay match seleccionado\', \'warning\');',
    '    return;',
    '  }',
    '',
    '  if (!draftState.selectedAircraftId) {',
    '    showToast(\'⚠️ Seleccioná una aeronave primero\', \'warning\');',
    '    return;',
    '  }',
    '',
    '  const gameNumber = parseInt(document.getElementById(\'tDraftGameNumberInput\')?.value || \'1\', 10);',
    '  if (!gameNumber || gameNumber < 1 || gameNumber > 5) {',
    '    showToast(\'⚠️ Número de partida inválido (1-5)\', \'warning\');',
    '    return;',
    '  }',
    '',
    '  // Calcular order_index: siguiente correlativo',
    '  const gameDrafts = draftState.existingDrafts.filter(d => d.game_number === gameNumber);',
    '  const nextOrderIndex = gameDrafts.length + 1;',
    '',
    '  const teamId = draftState.currentTeam === \'A\' ? draftState.teamAId : draftState.teamBId;',
    '',
    '  const payload = {',
    '    game_number: gameNumber,',
    '    team_id: teamId,',
    '    action: draftState.currentAction,',
    '    aircraft_id: String(draftState.selectedAircraftId),',
    '    order_index: nextOrderIndex',
    '  };',
    '',
    '  const btn = document.getElementById(\'tDraftSubmit\');',
    '  if (btn) { btn.disabled = true; btn.textContent = \'⏳ Registrando…\'; }',
    '',
    '  try {',
    '    const res = await apiTournamentsRegisterDraft(draftState.tournamentId, draftState.matchId, payload);',
    '    if (!res.success) {',
    '      showToast(\'❌ \' + (res.error || \'Error al registrar acción\'), \'error\');',
    '      return;',
    '    }',
    '',
    '    showToast(`✅ ${draftState.currentAction} registrada`, \'success\');',
    '',
    '    // Reset selección',
    '    draftState.selectedAircraftId = null;',
    '',
    '    // Refrescar lista y grilla',
    '    await refreshExistingDrafts();',
    '',
    '    // Info de vuelta',
    '    const infoEl = document.getElementById(\'tDraftSelectionInfo\');',
    '    if (infoEl) {',
    '      infoEl.innerHTML = \'ℹ️ Acción registrada. Seleccioná otra aeronave o cambiá de equipo.\';',
    '      infoEl.style.borderLeftColor = \'#38bdf8\';',
    '    }',
    '',
    '    // Reiniciar timer al confirmar acción (nuevo turno)',
    '    draftState.timerSecondsLeft = 300;',
    '    updateTimerDisplay();',
    '',
    '  } catch (err) {',
    '    console.error(\'[Draft] submitDraftAction error:\', err);',
    '    showToast(\'❌ Error de conexión\', \'error\');',
    '  } finally {',
    '    if (btn) { btn.disabled = false; btn.textContent = \'💾 Registrar Acción\'; }',
    '  }',
    '}',
    'window.submitDraftAction = submitDraftAction;',
    '',
    '// ─── Hook de cambio de número de partida ────────────────',
    'document.addEventListener(\'input\', (e) => {',
    '  if (e.target && e.target.id === \'tDraftGameNumberInput\') {',
    '    const gn = parseInt(e.target.value || \'1\', 10);',
    '    const gameNumberEl = document.getElementById(\'tDraftGameNumber\');',
    '    if (gameNumberEl) gameNumberEl.textContent = `— Partida ${gn}`;',
    '',
    '    // Reset selección al cambiar de partida',
    '    draftState.selectedAircraftId = null;',
    '',
    '    // Re-render',
    '    renderExistingDraftsList();',
    '    renderDraftAircraftGrid();',
    '  }',
    '});',
    '',
    '// ─── Badge de draft en cada match del bracket ───────────',
    '//  El render original (renderBracketMatch) se modifica ligeramente para',
    '//  mostrar un badge con la cantidad de acciones registradas.',
    '//  Como no podemos reescribir renderBracketMatch (ya está definida),',
    '//  usamos un MutationObserver sobre #tournamentTabContent para enriquecer',
    '//  el DOM después del render. Es un hack aceptable para no tocar F1.5a.',
    'function enrichBracketWithDraftBadges() {',
    '  // Implementación diferida: F1.5b avanzada solo muestra el botón.',
    '  // La visualización del draft en el bracket se hace con el contador manual.',
    '}',
    ''
  ];

  // Insertar ANTES del console.log final
  lines.splice(anchorIdx, 0, ...draftBlock);
  log('ok', `Bloque de funciones draft insertado (${draftBlock.length} líneas)`);

  return { ok: true, content: lines.join('\n'), changed: true };
}

// ═══════════════════════════════════════════════════════════════════════════
//  CAMBIO 4 — js/api.js: wrapper apiTournamentsGetMatchDrafts
// ═══════════════════════════════════════════════════════════════════════════

function applyApiWrapper(content) {
  log('step', 'D. JS api.js — wrapper apiTournamentsGetMatchDrafts');

  // Idempotencia
  if (content.includes('async function apiTournamentsGetMatchDrafts')) {
    log('info', 'Wrapper apiTournamentsGetMatchDrafts ya existe (idempotente)');
    return { ok: true, content, changed: false };
  }

  const lines = content.split('\n');

  // Anchor: la función apiTournamentsRegisterDraft existente
  const anchorIdx = lines.findIndex(l =>
    l.includes('async function apiTournamentsRegisterDraft')
  );
  if (anchorIdx === -1) {
    log('fail', 'No se encontró anchor apiTournamentsRegisterDraft en api.js');
    return { ok: false, content };
  }
  log('ok', `Anchor apiTournamentsRegisterDraft en línea ${anchorIdx + 1}`);

  // Buscar el cierre de la función (primer "}" solo después del start)
  let closeIdx = -1;
  let depth = 0;
  for (let i = anchorIdx; i < lines.length; i++) {
    for (const ch of lines[i]) {
      if (ch === '{') depth++;
      else if (ch === '}') depth--;
    }
    if (depth === 0 && i > anchorIdx) {
      closeIdx = i;
      break;
    }
  }
  if (closeIdx === -1) {
    log('fail', 'No se encontró cierre de apiTournamentsRegisterDraft');
    return { ok: false, content };
  }
  log('ok', `apiTournamentsRegisterDraft cierra en línea ${closeIdx + 1}`);

  // Buscar dónde termina el bloque de EXPOSICIÓN GLOBAL de tournaments
  // para meter el nuevo window.* assignment ahí. Por simplicidad, lo hacemos
  // al final del archivo (más robusto).
  const wrapperBlock = [
    '',
    '/**',
    ' * Lista los drafts registrados de un match (F1.5b).',
    ' * @param {string} id - UUID del torneo.',
    ' * @param {string} mid - UUID del match.',
    ' */',
    'async function apiTournamentsGetMatchDrafts(id, mid) {',
    '  if (!id || !mid) {',
    '    return { success: false, error: \'id y mid requeridos\', code: \'MISSING_ID\' };',
    '  }',
    '  return _tournamentsFetch(',
    '    `/api/tournaments/${encodeURIComponent(id)}/matches/${encodeURIComponent(mid)}/drafts`',
    '  );',
    '}',
    '',
    'window.apiTournamentsGetMatchDrafts = apiTournamentsGetMatchDrafts;'
  ];

  // Insertar después del cierre de apiTournamentsRegisterDraft
  lines.splice(closeIdx + 1, 0, ...wrapperBlock);
  log('ok', 'Wrapper insertado después de apiTournamentsRegisterDraft');

  // ─── Modificar renderBracketMatch para agregar el botón Draft ───
  //  Buscamos el botón "Registrar Resultado" en el bloque .bracket-match-actions
  //  y agregamos el botón Draft justo después.
  const contentAfter = lines.join('\n');
  if (!contentAfter.includes('openDraftModal(')) {
    // Buscamos la línea que tiene el botón "Registrar Resultado" dentro de renderBracketMatch
    const resultBtnIdx = lines.findIndex(l =>
      l.includes('openMatchResultModal(') && l.includes('Registrar Resultado')
    );
    if (resultBtnIdx !== -1) {
      // El botón cierra en la línea siguiente con </button>
      let closeIdx = -1;
      for (let i = resultBtnIdx; i < resultBtnIdx + 5; i++) {
        if (lines[i].includes('</button>')) {
          closeIdx = i;
          break;
        }
      }
      if (closeIdx !== -1) {
        const draftBtn = [
          "          <button onclick=\"event.stopPropagation(); openDraftModal(\\'${escapeHTML(match.id)}\\')\"",
          '                  class="btn-secondary btn-sm" style="font-size:0.72rem;padding:4px 10px;width:100%;margin-top:4px;">',
          '            🎯 Draft',
          '          </button>'
        ];
        lines.splice(closeIdx + 1, 0, ...draftBtn);
        log('ok', 'Botón Draft insertado en renderBracketMatch (dentro de tournaments.js)');
      } else {
        log('warn', 'No se encontró cierre del botón Registrar Resultado — botón Draft NO insertado');
      }
    } else {
      log('warn', 'No se encontró el botón Registrar Resultado en renderBracketMatch');
    }
  }
  return { ok: true, content: lines.join('\n'), changed: true };
}

// ═══════════════════════════════════════════════════════════════════════════
//  MAIN
// ═══════════════════════════════════════════════════════════════════════════
function main() {
  console.log('');
  console.log('================================================================');
  console.log('  F1.5b — Script #2: Frontend del Modal de Draft');
  console.log('================================================================');
  console.log('');

  if (IS_DRY_RUN) {
    log('warn', 'Modo --dry-run activo: NINGÚN archivo será modificado.');
    console.log('');
  }

  // [1/7] Verificar entorno
  log('step', '[1/7] Verificando entorno...');
  ensureFile(HTML_PATH, 'components/tournaments.html');
  ensureFile(JS_TOURN, 'js/tournaments.js');
  ensureFile(JS_API, 'js/api.js');

  // [2/7] Cambio 1 (eliminado): el botón Draft va en JS, no en HTML
  log('step', '[2/7] Cambio 1: omitido (botón Draft va en JS)');

  // [3/7] Cambio 2: modal draft
  log('step', '[3/7] Cambio 2: modal #tournamentDraftModal');
  const c2 = applyDraftModal(readNormalized(HTML_PATH));
  if (!c2.ok) { log('fail', 'Cambio 2 falló. Abortando.'); process.exit(1); }

  // [4/7] Cambio 3: funciones draft en tournaments.js
  log('step', '[4/7] Cambio 3: funciones draft en js/tournaments.js');
  const c3 = applyDraftFunctions(readNormalized(JS_TOURN));
  if (!c3.ok) { log('fail', 'Cambio 3 falló. Abortando.'); process.exit(1); }

  // [5/7] Cambio 4: wrapper en api.js
  log('step', '[5/7] Cambio 4: wrapper apiTournamentsGetMatchDrafts en js/api.js');
  const c4 = applyApiWrapper(readNormalized(JS_API));
  if (!c4.ok) { log('fail', 'Cambio 4 falló. Abortando.'); process.exit(1); }

  // [6/7] Resumen dry-run o aplicar
  log('step', '[6/7] Ejecutando...');

  if (IS_DRY_RUN) {
    log('info', '[DRY-RUN] No se escribiría nada.');
    log('info', '[DRY-RUN] Ejecutar con `--apply` para aplicar.');
    console.log('');
    console.log('----------------------------------------------------------------');
    console.log('  RESUMEN (dry-run)');
    console.log('----------------------------------------------------------------');
    console.log('  Archivos a modificar:  3');
    console.log('    · components/tournaments.html  (+botón Draft, +modal)');
    console.log('    · js/tournaments.js            (+~10 funciones draft)');
    console.log('    · js/api.js                    (+wrapper GET /drafts)');
    console.log('  Backups a crear:       .bak-f1.5b (x3)');
    console.log('  Verificación:          node --check en tournaments.js y api.js');
    console.log('----------------------------------------------------------------');
    console.log('');
    process.exit(0);
  }

  // ─── APLICAR ────────────────────────────────────────────────────────────
  backup(HTML_PATH);
  writeNormalized(HTML_PATH, c2.content);
  log('ok', 'components/tournaments.html actualizado');

  backup(JS_TOURN);
  writeNormalized(JS_TOURN, c3.content);
  log('ok', 'js/tournaments.js actualizado');

  backup(JS_API);
  writeNormalized(JS_API, c4.content);
  log('ok', 'js/api.js actualizado');

  // [7/7] Verificación
  log('step', '[7/7] Verificando sintaxis JS...');
  const okTourn = nodeCheck(JS_TOURN);
  const okApi = nodeCheck(JS_API);

  if (!okTourn || !okApi) {
    log('fail', 'node --check falló. Restaurar desde .bak-f1.5b');
    process.exit(1);
  }

  // Resumen final
  console.log('');
  console.log('----------------------------------------------------------------');
  console.log('  RESUMEN');
  console.log('----------------------------------------------------------------');
  console.log('  ✅ components/tournaments.html  (+botón Draft, +modal)');
  console.log('  ✅ js/tournaments.js            (+~10 funciones draft)');
  console.log('  ✅ js/api.js                    (+wrapper GET /drafts)');
  console.log('  ✅ node --check OK');
  console.log('  ✅ Backups: *.bak-f1.5b (x3)');
  console.log('----------------------------------------------------------------');
  console.log('');
  console.log('PRÓXIMOS PASOS:');
  console.log('  1. Verificar:  git diff components/tournaments.html js/tournaments.js js/api.js');
  console.log('  2. Commit:     git add components/tournaments.html js/tournaments.js js/api.js');
  console.log('                 git commit -m "feat(tournaments): modal de draft F1.5b"');
  console.log('  3. Push:       git push origin main');
  console.log('');
}

main();