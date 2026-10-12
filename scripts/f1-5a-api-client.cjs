#!/usr/bin/env node
/**
 * ============================================================================
 *  F1.5a — Script #1: API Client Torneos
 * ============================================================================
 *  Proyecto:  PARAGUAY-FFAA | METALSTORM
 *  Fase:      F1.5a (Frontend Torneos - Sprint 8)
 *  Commit:    #1 de 4
 *  Ref:       PLAN_TRABAJO_TORNEOS.md §F1.5
 *             API_REFERENCE.md §9 (Módulo de Torneos)
 *             ADR-011 (Sistema de Torneos)
 * ============================================================================
 *  OBJETIVO
 *  --------
 *  Agregar 8 wrappers `apiTournaments*` al final de `js/api.js`,
 *  siguiendo el patrón `_xxxFetch` establecido por `_veteranFetch`
 *  y `_eventsV2Fetch`.
 *
 *  REGLAS DEL PROYECTO APLICADAS
 *  -----------------------------
 *  - NO usar content.replace() con strings multi-línea (HALL-068).
 *  - Usar split(/\r?\n/) + push + join('\n') + writeFileSync.
 *  - node --check post-escritura.
 *  - Backup .bak-f1.5a antes de modificar.
 *  - Script idempotente (segunda ejecución no duplica).
 *
 *  USO
 *  ---
 *  node scripts/f1-5a-api-client.cjs              → dry-run (default)
 *  node scripts/f1-5a-api-client.cjs --apply      → aplicar cambios
 * ============================================================================
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ─── CONFIGURACIÓN ──────────────────────────────────────────────────────────
const ROOT = path.resolve(__dirname, '..');
const TARGET = path.join(ROOT, 'js', 'api.js');
const BACKUP_SUFFIX = '.bak-f1.5a';
const MARKER = '// ============================================================\n' +
               '// TOURNAMENTS — API CLIENT (F1.5)';

// ─── ARGS ───────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const IS_DRY_RUN = !APPLY;

// ─── HELPERS ────────────────────────────────────────────────────────────────
function log(prefix, message) {
  const icons = { ok: '✅', fail: '❌', info: 'ℹ️ ', warn: '⚠️ ', step: '🔹' };
  console.log(`${icons[prefix] || '  '} ${message}`);
}

function ensureFile(filePath) {
  if (!fs.existsSync(filePath)) {
    log('fail', `Archivo no encontrado: ${filePath}`);
    process.exit(1);
  }
}

function backup(filePath) {
  const backupPath = filePath + BACKUP_SUFFIX;
  if (!fs.existsSync(backupPath)) {
    fs.copyFileSync(filePath, backupPath);
    log('ok', `Backup creado: ${path.basename(backupPath)}`);
  } else {
    log('info', `Backup ya existe: ${path.basename(backupPath)} (no sobreescrito)`);
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

// ─── CONTENIDO A INSERTAR ───────────────────────────────────────────────────
const TOURNAMENTS_BLOCK = `
// ============================================================
// TOURNAMENTS — API CLIENT (F1.5)
// ============================================================
// 8 wrappers sobre /api/tournaments/*.
//
// Referencias:
//   - API_REFERENCE.md §9 (Módulo de Torneos).
//   - ADR-011 (arquitectura RBAC + convenciones).
//   - PLAN_TRABAJO_TORNEOS.md §F1.5 (frontend).
//
// Patrón: retorna { success: true, ...data } o { success: false, error, code }.
// NO lanza excepciones no capturadas.
// ============================================================

async function _tournamentsFetch(path, options = {}) {
  try {
    const res = await fetch(\`\${API_BASE}\${path}\`, {
      method: options.method || 'GET',
      headers: getAuthHeaders(),
      ...(options.body && { body: JSON.stringify(options.body) })
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      return {
        success: false,
        error: json.error || \`Error HTTP \${res.status}\`,
        code: json.code || 'HTTP_ERROR',
        details: json.details || null
      };
    }

    return { success: true, ...json };
  } catch (err) {
    console.error(\`❌ [Tournaments] Error en \${path}:\`, err);
    return {
      success: false,
      error: err.message || 'Error de conexión',
      code: 'NETWORK_ERROR'
    };
  }
}

// ─── LECTURA ────────────────────────────────────────────────

/**
 * Lista torneos con filtros opcionales.
 * @param {{status?:string, scope?:string}} params
 */
async function apiTournamentsList(params = {}) {
  const query = new URLSearchParams();
  if (params.status) query.set('status', params.status);
  if (params.scope)  query.set('scope', params.scope);
  const qs = query.toString();
  return _tournamentsFetch(\`/api/tournaments\${qs ? \`?\${qs}\` : ''}\`);
}

/**
 * Obtiene detalle de un torneo (con participants, matches, moderator_history).
 * @param {string} id - UUID del torneo.
 */
async function apiTournamentsGetById(id) {
  if (!id) return { success: false, error: 'ID requerido', code: 'MISSING_ID' };
  return _tournamentsFetch(\`/api/tournaments/\${encodeURIComponent(id)}\`);
}

// ─── ESCRITURA (ADMIN / OWNER) ──────────────────────────────

/**
 * Crea un torneo (estado inicial DRAFT).
 * @param {object} payload - { name, format, scope, starts_at, ends_at, min_teams, max_teams, moderator_id?, metadata? }
 */
async function apiTournamentsCreate(payload) {
  if (!payload || !payload.name || !payload.format || !payload.scope) {
    return { success: false, error: 'name, format y scope son obligatorios', code: 'MISSING_FIELDS' };
  }
  return _tournamentsFetch('/api/tournaments', { method: 'POST', body: payload });
}

/**
 * Cambia el estado de un torneo (transiciones válidas en controller).
 * @param {string} id
 * @param {string} status - DRAFT | REGISTRATION | ONGOING | FINISHED | CANCELLED
 * @param {string|null} reason - Obligatorio si status = CANCELLED.
 */
async function apiTournamentsUpdateStatus(id, status, reason = null) {
  if (!id || !status) {
    return { success: false, error: 'id y status requeridos', code: 'MISSING_FIELDS' };
  }
  const body = { status };
  if (reason) body.reason = reason;
  return _tournamentsFetch(\`/api/tournaments/\${encodeURIComponent(id)}/status\`, {
    method: 'PATCH',
    body
  });
}

/**
 * Reasigna el moderador de un torneo (ADR-011 D8).
 * @param {string} id
 * @param {string} moderatorId - UUID del nuevo moderador.
 * @param {string} reason - Motivo (5-500 chars).
 */
async function apiTournamentsChangeModerator(id, moderatorId, reason) {
  if (!id || !moderatorId || !reason) {
    return { success: false, error: 'id, moderator_id y reason requeridos', code: 'MISSING_FIELDS' };
  }
  return _tournamentsFetch(\`/api/tournaments/\${encodeURIComponent(id)}/moderator\`, {
    method: 'PATCH',
    body: { moderator_id: moderatorId, reason }
  });
}

// ─── REGISTRO DE EQUIPO ─────────────────────────────────────

/**
 * Registra un equipo en un torneo (torneo debe estar en REGISTRATION).
 * @param {string} id - UUID del torneo.
 * @param {object} payload - { team_name, captain_user_id, roster[] }
 */
async function apiTournamentsRegisterTeam(id, payload) {
  if (!id || !payload?.team_name || !payload?.captain_user_id || !Array.isArray(payload?.roster)) {
    return {
      success: false,
      error: 'team_name, captain_user_id y roster son obligatorios',
      code: 'MISSING_FIELDS'
    };
  }
  return _tournamentsFetch(\`/api/tournaments/\${encodeURIComponent(id)}/register\`, {
    method: 'POST',
    body: payload
  });
}

// ─── RESULTADO DE MATCH (requireTournamentModerator) ────────

/**
 * Registra el resultado de un match (Bo3 / Bo5).
 * RBAC fino: OWNER/ADMIN bypass; VETERANO/MIEMBRO solo si son moderador.
 * @param {string} id  - UUID del torneo.
 * @param {string} mid - UUID del match.
 * @param {object} payload - { score_a, score_b, best_of?, notes? }
 */
async function apiTournamentsRegisterMatchResult(id, mid, payload) {
  if (!id || !mid) {
    return { success: false, error: 'id y mid requeridos', code: 'MISSING_ID' };
  }
  if (typeof payload?.score_a !== 'number' || typeof payload?.score_b !== 'number') {
    return { success: false, error: 'score_a y score_b deben ser números', code: 'MISSING_FIELDS' };
  }
  return _tournamentsFetch(
    \`/api/tournaments/\${encodeURIComponent(id)}/matches/\${encodeURIComponent(mid)}/result\`,
    { method: 'POST', body: payload }
  );
}

// ─── DRAFT (requireTournamentModerator) — F1.5b ────────────

/**
 * Registra una acción del draft (ban/pick).
 * ⚠️ F1.5b: este wrapper está listo pero la UI de draft
 * se implementa en F1.5b (requiere GET endpoint no existente aún).
 * @param {string} id  - UUID del torneo.
 * @param {string} mid - UUID del match.
 * @param {object} payload - { game_number, team_id, action, aircraft_id, order_index }
 */
async function apiTournamentsRegisterDraft(id, mid, payload) {
  if (!id || !mid) {
    return { success: false, error: 'id y mid requeridos', code: 'MISSING_ID' };
  }
  if (!payload?.game_number || !payload?.team_id || !payload?.action || !payload?.aircraft_id) {
    return {
      success: false,
      error: 'game_number, team_id, action y aircraft_id son obligatorios',
      code: 'MISSING_FIELDS'
    };
  }
  return _tournamentsFetch(
    \`/api/tournaments/\${encodeURIComponent(id)}/matches/\${encodeURIComponent(mid)}/draft\`,
    { method: 'POST', body: payload }
  );
}

// ─── EXPOSICIÓN GLOBAL ──────────────────────────────────────

window.apiTournamentsList                = apiTournamentsList;
window.apiTournamentsGetById             = apiTournamentsGetById;
window.apiTournamentsCreate              = apiTournamentsCreate;
window.apiTournamentsUpdateStatus        = apiTournamentsUpdateStatus;
window.apiTournamentsChangeModerator     = apiTournamentsChangeModerator;
window.apiTournamentsRegisterTeam        = apiTournamentsRegisterTeam;
window.apiTournamentsRegisterMatchResult = apiTournamentsRegisterMatchResult;
window.apiTournamentsRegisterDraft       = apiTournamentsRegisterDraft;

console.log('✅ [Tournaments API] 8 funciones apiTournaments* expuestas en window');
`;

// ─── MAIN ───────────────────────────────────────────────────────────────────
function main() {
  console.log('');
  console.log('================================================================');
  console.log('  F1.5a — Script #1: API Client Torneos');
  console.log('================================================================');
  console.log('');

  if (IS_DRY_RUN) {
    log('warn', 'Modo --dry-run activo: NINGÚN archivo será modificado.');
    console.log('');
  }

  // [1/5] Verificar entorno
  log('step', '[1/5] Verificando entorno...');
  ensureFile(TARGET);
  log('ok', `js/api.js encontrado (${(fs.statSync(TARGET).size / 1024).toFixed(1)} KB)`);

  // [2/5] Leer y verificar
  log('step', '[2/5] Leyendo js/api.js...');
  const original = fs.readFileSync(TARGET, 'utf8');
  const normalized = original.replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');
  log('ok', `Archivo leído: ${lines.length} líneas`);

  // [3/5] Idempotencia
  log('step', '[3/5] Verificando idempotencia...');
  const existingIdx = normalized.indexOf(MARKER);
  if (existingIdx !== -1) {
    log('warn', 'Bloque TOURNAMENTS ya existe en js/api.js.');
    log('info', 'Si querés re-aplicar, eliminá el bloque manualmente y volvé a ejecutar.');
    log('info', 'Abortando para evitar duplicación.');
    process.exit(0);
  }
  log('ok', 'Bloque TOURNAMENTS no existe → se puede insertar');

  // [4/5] Preparar contenido
  log('step', '[4/5] Preparando inserción...');
  let finalContent;
  // Detectar si el archivo termina con salto de línea
  if (normalized.endsWith('\n')) {
    finalContent = normalized + TOURNAMENTS_BLOCK;
  } else {
    finalContent = normalized + '\n' + TOURNAMENTS_BLOCK;
  }
  const addedLines = (finalContent.match(/\n/g) || []).length - (normalized.match(/\n/g) || []).length;
  log('ok', `Se agregarán ~${addedLines} líneas al final`);

  // [5/5] Escribir o dry-run
  log('step', '[5/5] Ejecutando...');
  if (IS_DRY_RUN) {
    log('info', '[DRY-RUN] No se escribiría nada.');
    log('info', '[DRY-RUN] Ejecutar con `--apply` para aplicar.');
    console.log('');
    console.log('----------------------------------------------------------------');
    console.log('  RESUMEN (dry-run)');
    console.log('----------------------------------------------------------------');
    console.log('  Archivo objetivo:   js/api.js');
    console.log('  Backup a crear:     js/api.js.bak-f1.5a');
    console.log('  Líneas a agregar:   ~' + addedLines);
    console.log('  Wrappers nuevos:    8 (apiTournamentsList, ..., RegisterDraft)');
    console.log('  Verificación:       node --check js/api.js');
    console.log('----------------------------------------------------------------');
    console.log('');
    process.exit(0);
  }

  // Aplicar backup + escritura
  backup(TARGET);
  fs.writeFileSync(TARGET, finalContent, 'utf8');
  log('ok', `js/api.js actualizado (+${addedLines} líneas)`);

  // Verificación
  if (!nodeCheck(TARGET)) {
    log('fail', 'Verificación falló. Restaurando backup...');
    fs.copyFileSync(TARGET + BACKUP_SUFFIX, TARGET);
    log('ok', 'Backup restaurado. Revisar el bloque insertado.');
    process.exit(1);
  }

  // Resumen final
  console.log('');
  console.log('----------------------------------------------------------------');
  console.log('  RESUMEN');
  console.log('----------------------------------------------------------------');
  console.log('  ✅ Archivo actualizado:   js/api.js');
  console.log('  ✅ Backup creado:         js/api.js.bak-f1.5a');
  console.log('  ✅ Líneas agregadas:      ~' + addedLines);
  console.log('  ✅ node --check:          OK');
  console.log('  ✅ 8 wrappers expuestos:  apiTournaments*');
  console.log('----------------------------------------------------------------');
  console.log('');
  console.log('PRÓXIMOS PASOS:');
  console.log('  1. Verificar:  git diff js/api.js');
  console.log('  2. Commit:     git add js/api.js');
  console.log('                 git commit -m "feat(tournaments): API client F1.5"');
  console.log('  3. Push:       git push origin main');
  console.log('');
}

main();