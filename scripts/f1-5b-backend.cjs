#!/usr/bin/env node
/**
 * ============================================================================
 *  F1.5b — Script #1: Backend de Draft (GET + validaciones)
 * ============================================================================
 *  Proyecto:  PARAGUAY-FFAA | METALSTORM
 *  Fase:      F1.5b (Modal de Draft — Sprint 8)
 *  Commit:    #1 de 4
 *  Ref:       PLAN_TRABAJO_TORNEOS.md §F1.5b
 *             ANEXO-III-torneos.md §7 (Reglas del draft)
 *             ADR-011 (Sistema de Torneos)
 * ============================================================================
 *  OBJETIVO
 *  --------
 *  1. Agregar GET /api/tournaments/:id/matches/:mid/drafts
 *  2. Añadir validaciones adicionales a registerDraftAction:
 *     - aircraft_id debe existir en plane_models
 *     - aircraft_id no debe estar baneada por el OTRO equipo
 *     - último avión BM auto-baneado (si existe evento BM activo)
 *     - order_index no duplicado (ya hay UNIQUE en DB)
 *  3. Añadir tests (tests/controllers/tournaments.drafts.test.js)
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
 *  node scripts/f1-5b-backend.cjs              → dry-run (default)
 *  node scripts/f1-5b-backend.cjs --apply      → aplicar cambios
 * ============================================================================
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ─── CONFIGURACIÓN ──────────────────────────────────────────────────────────
const ROOT           = path.resolve(__dirname, '..');
const CONTROLLER     = path.join(ROOT, 'src', 'controllers', 'tournaments.controller.js');
const ROUTER         = path.join(ROOT, 'src', 'routes', 'tournaments.routes.js');
const TEST_DRAFTS    = path.join(ROOT, 'tests', 'controllers', 'tournaments.drafts.test.js');
const BACKUP_SUFFIX  = '.bak-f1.5b';

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
    log('info', `Backup ya existe: ${path.basename(bPath)} (no sobreescrito)`);
  }
}

function readNormalized(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return raw.replace(/\r\n/g, '\n');
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
//  CAMBIO 1 — Agregar helper getActiveBmEvent al controller
// ═══════════════════════════════════════════════════════════════════════════
//  Detecta el "último avión del Black Market" consultando events_master
//  con type='BLACK_MARKET' y status en ('OPEN','CLOSED'). Cachea el último
//  en memoria por proceso (TTL 5 min) para no pegarle a Supabase en cada
//  acción de draft.
// ═══════════════════════════════════════════════════════════════════════════

function applyControllerHelpers(content) {
  log('step', 'A. Controller — agregar helper getActiveBmAircraft');

  if (content.includes('async function getActiveBmAircraft')) {
    log('info', 'Helper getActiveBmAircraft ya existe (idempotente)');
    return { ok: true, content, changed: false };
  }

  const lines = content.split('\n');

  // Insertar el helper después de safeAudit (buscar el cierre de la función)
  const idxSafeAudit = lines.findIndex(l => l.includes('async function safeAudit'));
  if (idxSafeAudit === -1) {
    log('fail', 'No se encontró safeAudit en el controller');
    return { ok: false, content };
  }

  // Buscar el cierre de safeAudit: la línea con solo '}' tras safeAudit
  let idxEndSafeAudit = -1;
  let depth = 0;
  for (let i = idxSafeAudit; i < lines.length; i++) {
    const line = lines[i];
    for (const ch of line) {
      if (ch === '{') depth++;
      else if (ch === '}') depth--;
    }
    if (depth === 0 && i > idxSafeAudit) {
      idxEndSafeAudit = i;
      break;
    }
  }
  if (idxEndSafeAudit === -1) {
    log('fail', 'No se encontró el cierre de safeAudit');
    return { ok: false, content };
  }
  log('ok', `safeAudit termina en línea ${idxEndSafeAudit + 1}`);

  const helperBlock = [
    '',
    '// ============================================================',
    '// BLACK MARKET — caché de último avión auto-baneado (Anexo III §7.3)',
    '// ============================================================',
    '//  La regla del torneo dice que el último avión del Black Market',
    '//  está auto-baneado. Como el BM es un evento de 5 días, el "último"',
    '//  cambia con cada edición. Para no pegarle a Supabase en cada acción',
    '//  de draft, cacheamos por proceso con TTL corto.',
    '// ============================================================',
    '',
    'const BM_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos',
    'let _bmAircraftCache = { aircraft_id: null, fetched_at: 0 };',
    '',
    '/**',
    ' * Devuelve el aircraft_id del último evento BM finalizado/activo,',
    ' * o null si no hay ninguno o falla la consulta (no bloquea el draft).',
    ' */',
    'async function getActiveBmAircraft(supabase) {',
    '  try {',
    '    const now = Date.now();',
    '    if (_bmAircraftCache.aircraft_id !== null &&',
    '        now - _bmAircraftCache.fetched_at < BM_CACHE_TTL_MS) {',
    '      return _bmAircraftCache.aircraft_id;',
    '    }',
    '',
    '    const { data, error } = await supabase',
    '      .from(\'events_master\')',
    '      .select(\'metadata, start_date\')',
    '      .eq(\'type\', \'BLACK_MARKET\')',
    '      .in(\'status\', [\'OPEN\', \'CLOSED\'])',
    '      .order(\'start_date\', { ascending: false })',
    '      .limit(1)',
    '      .maybeSingle();',
    '',
    '    if (error || !data) {',
    '      _bmAircraftCache = { aircraft_id: null, fetched_at: now };',
    '      return null;',
    '    }',
    '',
    '    const aircraftId = (data.metadata && data.metadata.aircraft_id)',
    '      ? String(data.metadata.aircraft_id).trim()',
    '      : null;',
    '',
    '    _bmAircraftCache = { aircraft_id: aircraftId, fetched_at: now };',
    '    return aircraftId;',
    '  } catch (err) {',
    '    logger.warn(\'⚠️ [Tournaments] getActiveBmAircraft falló:\', err.message);',
    '    return null;',
    '  }',
    '}',
    ''
  ];

  lines.splice(idxEndSafeAudit + 1, 0, ...helperBlock);
  log('ok', `Helper getActiveBmAircraft insertado (${helperBlock.length} líneas)`);

  return { ok: true, content: lines.join('\n'), changed: true };
}

// ═══════════════════════════════════════════════════════════════════════════
//  CAMBIO 2 — Agregar handler getMatchDrafts al controller
// ═══════════════════════════════════════════════════════════════════════════

function applyGetMatchDrafts(content) {
  log('step', 'B. Controller — agregar handler getMatchDrafts');

  if (content.includes('export async function getMatchDrafts')) {
    log('info', 'Handler getMatchDrafts ya existe (idempotente)');
    return { ok: true, content, changed: false };
  }

  const lines = content.split('\n');

  // Insertar ANTES del handler registerDraftAction
  const idxRegisterDraft = lines.findIndex(l => l.includes('export async function registerDraftAction'));
  if (idxRegisterDraft === -1) {
    log('fail', 'No se encontró registerDraftAction en el controller');
    return { ok: false, content };
  }

  // Buscar el separador de comentarios previo a registerDraftAction (líneas con // =====)
  let insertAt = idxRegisterDraft;
  for (let i = idxRegisterDraft - 1; i >= 0 && i > idxRegisterDraft - 10; i--) {
    if (lines[i].includes('// ============================================================')) {
      insertAt = i;
      break;
    }
  }
  log('ok', `Insertando getMatchDrafts antes de registerDraftAction (línea ${insertAt + 1})`);

  const handlerBlock = [
    '// ============================================================',
    '// 6.bis GET /api/tournaments/:id/matches/:mid/drafts',
    '// ============================================================',
    '//  Lista todos los drafts del match agrupados por game_number.',
    '//',
    '//  RBAC: requireAuth (cualquier autenticado puede ver el draft).',
    '//',
    '//  Response:',
    '//    {',
    '//      success: true,',
    '//      match_id: "uuid",',
    '//      drafts: [ { id, game_number, team_id, action, aircraft_id, order_index, created_at }, ... ],',
    '//      by_game: { "1": [...], "2": [...] }',
    '//    }',
    '// ============================================================',
    'export async function getMatchDrafts(req, res, next) {',
    '  try {',
    '    const supabase = getSupabase();',
    '    if (!supabase) {',
    '      return res.status(500).json({ error: \'Database client unavailable\', code: \'DB_UNAVAILABLE\' });',
    '    }',
    '',
    '    const tournamentId = req.params.id;',
    '    const matchId = req.params.mid;',
    '',
    '    if (!isUuid(tournamentId)) {',
    '      return res.status(400).json({',
    '        error: \'Identificador de torneo inválido\',',
    '        code: \'INVALID_TOURNAMENT_ID\'',
    '      });',
    '    }',
    '    if (!isUuid(matchId)) {',
    '      return res.status(400).json({',
    '        error: \'Identificador de match inválido\',',
    '        code: \'INVALID_MATCH_ID\'',
    '      });',
    '    }',
    '',
    '    // 1. Validar que el match exista y pertenezca al torneo',
    '    const { data: match, error: mErr } = await supabase',
    '      .from(\'tournament_matches\')',
    '      .select(\'id, tournament_id, team_a_id, team_b_id, best_of, phase\')',
    '      .eq(\'id\', matchId)',
    '      .maybeSingle();',
    '',
    '    if (mErr) throw mErr;',
    '    if (!match) {',
    '      return res.status(404).json({',
    '        error: \'Match no encontrado\',',
    '        code: \'MATCH_NOT_FOUND\'',
    '      });',
    '    }',
    '    if (String(match.tournament_id) !== String(tournamentId)) {',
    '      return res.status(404).json({',
    '        error: \'Match no pertenece a este torneo\',',
    '        code: \'MATCH_NOT_FOUND\'',
    '      });',
    '    }',
    '',
    '    // 2. Leer drafts ordenados por game_number y order_index',
    '    const { data: drafts, error: dErr } = await supabase',
    '      .from(\'tournament_drafts\')',
    '      .select(\'id, match_id, game_number, team_id, action, aircraft_id, order_index, created_at\')',
    '      .eq(\'match_id\', matchId)',
    '      .order(\'game_number\', { ascending: true })',
    '      .order(\'order_index\', { ascending: true });',
    '',
    '    if (dErr) throw dErr;',
    '',
    '    // 3. Agrupar por game_number (1..N)',
    '    const byGame = {};',
    '    (drafts || []).forEach(d => {',
    '      const gn = String(d.game_number);',
    '      if (!byGame[gn]) byGame[gn] = [];',
    '      byGame[gn].push(d);',
    '    });',
    '',
    '    return res.json({',
    '      success: true,',
    '      match_id: matchId,',
    '      tournament_id: tournamentId,',
    '      best_of: match.best_of || 3,',
    '      phase: match.phase || null,',
    '      team_a_id: match.team_a_id,',
    '      team_b_id: match.team_b_id,',
    '      total: (drafts || []).length,',
    '      drafts: drafts || [],',
    '      by_game: byGame',
    '    });',
    '',
    '  } catch (err) {',
    '    logger.error(\'❌ [Tournaments] getMatchDrafts:\', err.message);',
    '    next(err);',
    '  }',
    '}',
    '',
    ''
  ];

  lines.splice(insertAt, 0, ...handlerBlock);
  log('ok', `Handler getMatchDrafts insertado (${handlerBlock.length} líneas)`);

  return { ok: true, content: lines.join('\n'), changed: true };
}
// ═══════════════════════════════════════════════════════════════════════════
//  CAMBIO 3 — Validaciones adicionales en registerDraftAction
// ═══════════════════════════════════════════════════════════════════════════
//  Se agregan, ANTES del INSERT:
//    (a) Validar que aircraft_id exista en plane_models.
//    (b) Validar que aircraft_id no esté baneada por el OTRO equipo
//        en el mismo game_number.
//    (c) Validar que aircraft_id no sea el último avión del BM
//        (auto-baneado, Anexo III §7.3).
//
//  Estrategia: encontrar el anchor "// 3. Insertar acción" y meter un
//  bloque de validaciones ANTES de ese comentario, renumerando el
//  comentario a "// 6. Insertar acción (validaciones previas: 3,4,5)".
// ═══════════════════════════════════════════════════════════════════════════

function applyRegisterDraftValidations(content) {
  log('step', 'C. Controller — validaciones adicionales en registerDraftAction');

  // Idempotencia: detectar el bloque único
  if (content.includes('// 3. Validar aircraft existe en plane_models')) {
    log('info', 'Validaciones adicionales ya existen (idempotente)');
    return { ok: true, content, changed: false };
  }

  const lines = content.split('\n');

  // Anchor: el comentario "// 3. Insertar acción" (puede variar levemente)
  let idxAnchor = -1;
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (t.startsWith('// 3. Insertar acción') || t.startsWith('// 3. Insertar accion')) {
      idxAnchor = i;
      break;
    }
  }
  if (idxAnchor === -1) {
    log('fail', 'No se encontró anchor "// 3. Insertar acción" en registerDraftAction');
    return { ok: false, content };
  }
  log('ok', `Anchor encontrado en línea ${idxAnchor + 1}`);

  // Renumerar el comentario "// 3. Insertar acción" → "// 6. Insertar acción"
  const original = lines[idxAnchor];
  lines[idxAnchor] = original.replace(/^(\s*)\/\/ 3\. Insertar acci[oó]n/, '$1// 6. Insertar acción');

  // Bloque de validaciones a insertar ANTES del anchor
  const validationsBlock = [
    '    // 3. Validar aircraft existe en plane_models',
    '    const aircraftIdStr = String(data.aircraft_id).trim();',
    '    const { data: aircraftRow, error: aErr } = await supabase',
    '      .from(\'plane_models\')',
    '      .select(\'id, name\')',
    '      .eq(\'id\', aircraftIdStr)',
    '      .maybeSingle();',
    '',
    '    if (aErr) {',
    '      logger.warn(\'⚠️ [Tournaments] Error validando aircraft_id:\', aErr.message);',
    '    }',
    '    if (!aircraftRow) {',
    '      return res.status(400).json({',
    '        error: \'La aeronave no existe en el catálogo\',',
    '        code: \'AIRCRAFT_NOT_FOUND\',',
    '        details: { aircraft_id: aircraftIdStr }',
    '      });',
    '    }',
    '',
    '    // 4. Validar que aircraft_id no esté baneada por el OTRO equipo',
    '    //    en el mismo game_number. Mirrored Picks permite que AMBOS',
    '    //    equipos usen la misma aeronave en PICK, pero NO en BAN.',
    '    const otherTeamId = String(data.team_id) === String(match.team_a_id)',
    '      ? match.team_b_id',
    '      : match.team_a_id;',
    '',
    '    const { data: opponentBans, error: bErr } = await supabase',
    '      .from(\'tournament_drafts\')',
    '      .select(\'id, aircraft_id, action\')',
    '      .eq(\'match_id\', matchId)',
    '      .eq(\'game_number\', data.game_number)',
    '      .eq(\'team_id\', otherTeamId)',
    '      .eq(\'action\', \'BAN\');',
    '',
    '    if (bErr) {',
    '      logger.warn(\'⚠️ [Tournaments] Error validando bans oponente:\', bErr.message);',
    '    }',
    '    const bannedByOpponent = (opponentBans || []).some(',
    '      b => String(b.aircraft_id) === aircraftIdStr',
    '    );',
    '    if (bannedByOpponent) {',
    '      return res.status(409).json({',
    '        error: \'La aeronave está baneada por el equipo contrario en esta partida\',',
    '        code: \'AIRCRAFT_BANNED_BY_OPPONENT\',',
    '        details: { aircraft_id: aircraftIdStr, game_number: data.game_number }',
    '      });',
    '    }',
    '',
    '    // 5. Validar que aircraft_id no sea el último avión del Black Market',
    '    //    (auto-baneado, Anexo III §7.3).',
    '    //    IMPORTANTE: la validación aplica SOLO a BAN (para impedir banear',
    '    //    lo que ya está auto-baneado). En PICK sí se permite (Mirrored Picks).',
    '    if (data.action === \'BAN\') {',
    '      const bmAircraftId = await getActiveBmAircraft(supabase);',
    '      if (bmAircraftId && String(bmAircraftId) === aircraftIdStr) {',
    '        return res.status(409).json({',
    '          error: \'La aeronave es el último avión del Black Market y está auto-baneada (Anexo III §7.3)\',',
    '          code: \'AIRCRAFT_BM_AUTO_BANNED\',',
    '          details: { aircraft_id: aircraftIdStr, rule: \'Anexo III §7.3\' }',
    '        });',
    '      }',
    '    }',
    '',
    '    // 6. Insertar acción (UNIQUE match_id+game_number+order_index → 23505)',
  ];

  // Insertar antes del anchor (que ahora está renumerado a "// 6.")
  lines.splice(idxAnchor, 0, ...validationsBlock);
  log('ok', `Bloque de validaciones insertado (${validationsBlock.length} líneas)`);

  return { ok: true, content: lines.join('\n'), changed: true };
}

// ═══════════════════════════════════════════════════════════════════════════
//  CAMBIO 4 — Router: nueva ruta GET drafts
// ═══════════════════════════════════════════════════════════════════════════

function applyRouterChanges(content) {
  log('step', 'D. Router — agregar GET /:id/matches/:mid/drafts');

  let working = content;
  let changes = 0;

  // ─── D.1: Import de getMatchDrafts ──────────────────────────
  if (working.includes('getMatchDrafts')) {
    log('info', 'Import de getMatchDrafts ya existe (idempotente)');
  } else {
    const lines = working.split('\n');
    const idxImport = lines.findIndex(l => l.includes('registerDraftAction'));
    if (idxImport === -1) {
      log('fail', 'No se encontró registerDraftAction en los imports del router');
      return { ok: false, content: working };
    }
    // Insertar `getMatchDrafts,` ANTES de registerDraftAction (mantiene orden alfabético aproximado)
    lines.splice(idxImport, 0, '  getMatchDrafts,');
    working = lines.join('\n');
    log('ok', 'Import getMatchDrafts agregado');
    changes++;
  }

  // ─── D.2: Nueva ruta GET /:id/matches/:mid/drafts ───────────
  if (working.includes("router.get('/:id/matches/:mid/drafts'")) {
    log('info', 'Ruta GET drafts ya existe (idempotente)');
  } else {
    const lines = working.split('\n');
    // Anchor: la línea con `router.post('/:id/matches/:mid/draft'`
    const idxDraft = lines.findIndex(l => l.includes("router.post('/:id/matches/:mid/draft'"));
    if (idxDraft === -1) {
      log('fail', 'No se encontró anchor del POST draft en el router');
      return { ok: false, content: working };
    }

    // Insertar la nueva ruta GET inmediatamente ANTES del POST draft
    const newRoute = [
      '// ========== 7.bis. LISTAR DRAFTS DEL MATCH (cualquier autenticado) ==========',
      "router.get('/:id/matches/:mid/drafts', getMatchDrafts);",
      ''
    ];
    lines.splice(idxDraft, 0, ...newRoute);
    working = lines.join('\n');
    log('ok', 'Ruta GET /:id/matches/:mid/drafts agregada');
    changes++;
  }

  return { ok: true, content: working, changed: changes > 0 };
}

// ═══════════════════════════════════════════════════════════════════════════
//  CAMBIO 5 — Nuevo archivo de tests
// ═══════════════════════════════════════════════════════════════════════════

const TEST_DRAFTS_CONTENT = `// tests/controllers/tournaments.drafts.test.js
//
// F1.5b — Tests del endpoint GET /drafts + validaciones extra en registerDraftAction.
//
// Cobertura:
//   getMatchDrafts (9 casos):
//     1. :id no-UUID → 400 INVALID_TOURNAMENT_ID
//     2. :mid no-UUID → 400 INVALID_MATCH_ID
//     3. match no existe → 404 MATCH_NOT_FOUND
//     4. match no pertenece al torneo → 404 MATCH_NOT_FOUND
//     5. sin drafts → 200, total=0, by_game={}
//     6. drafts en 1 partida → 200, by_game con key "1"
//     7. drafts en múltiples partidas (Bo3) → by_game con "1","2","3"
//     8. error de query en drafts → next(err)
//     9. metadata (best_of, phase, team_a_id, team_b_id) correcta
//
//   registerDraftAction — validaciones adicionales (6 casos):
//    10. aircraft_id inexistente → 400 AIRCRAFT_NOT_FOUND
//    11. aircraft_id baneada por el oponente → 409 AIRCRAFT_BANNED_BY_OPPONENT
//    12. aircraft_id es el último BM (acción BAN) → 409 AIRCRAFT_BM_AUTO_BANNED
//    13. aircraft_id es el último BM (acción PICK) → 201 (Mirrored Picks permitido)
//    14. happy path BAN sin BM activo → 201
//    15. happy path PICK con Mirrored Picks → 201

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── MOCK GLOBAL ────────────────────────────────────────────────
const mockSupabase = { from: vi.fn() };

vi.mock('../../src/db/supabase.js', () => ({
  getSupabase: () => mockSupabase
}));

vi.mock('../../src/config/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
}));

vi.mock('../../src/utils/audit.js', () => ({
  logAuditChange: vi.fn().mockResolvedValue(undefined)
}));

import {
  getMatchDrafts,
  registerDraftAction
} from '../../src/controllers/tournaments.controller.js';
import { mockReq, mockRes } from '../helpers/express.js';

// ─── CONSTANTES ─────────────────────────────────────────────────
const UUID_TOURNAMENT = '11111111-1111-4111-8111-111111111111';
const UUID_MATCH      = '22222222-2222-4222-8222-222222222222';
const UUID_TEAM_A     = '33333333-3333-4333-8333-333333333333';
const UUID_TEAM_B     = '44444444-4444-4444-8444-444444444444';
const UUID_TEAM_X     = '55555555-5555-4555-8555-555555555555';
const UUID_USER       = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const UUID_BM         = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

// ─── HELPER: builder awaitable ──────────────────────────────────
function makeBuilder(result) {
  const normalized =
    result && typeof result === 'object' && ('data' in result || 'error' in result)
      ? { data: result.data ?? null, error: result.error ?? null, count: result.count ?? null }
      : { data: result, error: null, count: Array.isArray(result) ? result.length : null };

  const builder = {
    _result: normalized,
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    in: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    update: vi.fn(() => builder),
    maybeSingle: vi.fn().mockResolvedValue(normalized),
    single: vi.fn().mockResolvedValue(normalized),
    then: (onF, onR) => Promise.resolve(normalized).then(onF, onR)
  };
  return builder;
}

function mockNext() {
  return vi.fn();
}

beforeEach(() => {
  vi.clearAllMocks();
  mockSupabase.from.mockReset();
});

// ═══════════════════════════════════════════════════════════════
// getMatchDrafts
// ═══════════════════════════════════════════════════════════════
describe('getMatchDrafts', () => {

  it('1. :id no-UUID → 400 INVALID_TOURNAMENT_ID', async () => {
    const req = mockReq({
      user: { id: UUID_USER, role: 'MIEMBRO' },
      params: { id: 'nope', mid: UUID_MATCH }
    });
    const res = mockRes();
    const next = mockNext();

    await getMatchDrafts(req, res, next);

    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe('INVALID_TOURNAMENT_ID');
    expect(next).not.toHaveBeenCalled();
  });

  it('2. :mid no-UUID → 400 INVALID_MATCH_ID', async () => {
    const req = mockReq({
      user: { id: UUID_USER, role: 'MIEMBRO' },
      params: { id: UUID_TOURNAMENT, mid: 'no' }
    });
    const res = mockRes();
    const next = mockNext();

    await getMatchDrafts(req, res, next);

    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe('INVALID_MATCH_ID');
  });

  it('3. match no existe → 404 MATCH_NOT_FOUND', async () => {
    const req = mockReq({
      user: { id: UUID_USER, role: 'MIEMBRO' },
      params: { id: UUID_TOURNAMENT, mid: UUID_MATCH }
    });
    const res = mockRes();
    const next = mockNext();

    mockSupabase.from.mockImplementation(() => makeBuilder({ data: null, error: null }));

    await getMatchDrafts(req, res, next);

    expect(res.statusCode).toBe(404);
    expect(res.body.code).toBe('MATCH_NOT_FOUND');
  });

  it('4. match no pertenece al torneo → 404 MATCH_NOT_FOUND', async () => {
    const req = mockReq({
      user: { id: UUID_USER, role: 'MIEMBRO' },
      params: { id: UUID_TOURNAMENT, mid: UUID_MATCH }
    });
    const res = mockRes();
    const next = mockNext();

    mockSupabase.from.mockImplementation(() =>
      makeBuilder({
        data: {
          id: UUID_MATCH,
          tournament_id: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
          team_a_id: UUID_TEAM_A, team_b_id: UUID_TEAM_B,
          best_of: 3, phase: 'SWISS'
        },
        error: null
      })
    );

    await getMatchDrafts(req, res, next);

    expect(res.statusCode).toBe(404);
    expect(res.body.code).toBe('MATCH_NOT_FOUND');
  });

  it('5. sin drafts → 200, total=0, by_game={}', async () => {
    const req = mockReq({
      user: { id: UUID_USER, role: 'MIEMBRO' },
      params: { id: UUID_TOURNAMENT, mid: UUID_MATCH }
    });
    const res = mockRes();
    const next = mockNext();

    let callIdx = 0;
    mockSupabase.from.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) {
        return makeBuilder({
          data: {
            id: UUID_MATCH, tournament_id: UUID_TOURNAMENT,
            team_a_id: UUID_TEAM_A, team_b_id: UUID_TEAM_B,
            best_of: 3, phase: 'SWISS'
          },
          error: null
        });
      }
      return makeBuilder({ data: [], error: null });
    });

    await getMatchDrafts(req, res, next);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.total).toBe(0);
    expect(res.body.drafts).toEqual([]);
    expect(res.body.by_game).toEqual({});
  });

  it('6. drafts en 1 partida → 200, by_game con key "1"', async () => {
    const req = mockReq({
      user: { id: UUID_USER, role: 'MIEMBRO' },
      params: { id: UUID_TOURNAMENT, mid: UUID_MATCH }
    });
    const res = mockRes();
    const next = mockNext();

    const drafts = [
      { id: 'd1', match_id: UUID_MATCH, game_number: 1, team_id: UUID_TEAM_A, action: 'BAN', aircraft_id: '101', order_index: 1 },
      { id: 'd2', match_id: UUID_MATCH, game_number: 1, team_id: UUID_TEAM_B, action: 'BAN', aircraft_id: '102', order_index: 2 },
      { id: 'd3', match_id: UUID_MATCH, game_number: 1, team_id: UUID_TEAM_A, action: 'PICK', aircraft_id: '103', order_index: 3 }
    ];

    let callIdx = 0;
    mockSupabase.from.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) {
        return makeBuilder({
          data: {
            id: UUID_MATCH, tournament_id: UUID_TOURNAMENT,
            team_a_id: UUID_TEAM_A, team_b_id: UUID_TEAM_B,
            best_of: 3, phase: 'SWISS'
          },
          error: null
        });
      }
      return makeBuilder({ data: drafts, error: null });
    });

    await getMatchDrafts(req, res, next);

    expect(res.statusCode).toBe(200);
    expect(res.body.total).toBe(3);
    expect(res.body.by_game['1']).toHaveLength(3);
    expect(res.body.by_game['1'][0].action).toBe('BAN');
  });

  it('7. drafts en múltiples partidas (Bo3) → by_game con "1","2","3"', async () => {
    const req = mockReq({
      user: { id: UUID_USER, role: 'MIEMBRO' },
      params: { id: UUID_TOURNAMENT, mid: UUID_MATCH }
    });
    const res = mockRes();
    const next = mockNext();

    const drafts = [
      { id: 'd1', game_number: 1, action: 'BAN' },
      { id: 'd2', game_number: 1, action: 'PICK' },
      { id: 'd3', game_number: 2, action: 'BAN' },
      { id: 'd4', game_number: 2, action: 'PICK' },
      { id: 'd5', game_number: 3, action: 'BAN' }
    ];

    let callIdx = 0;
    mockSupabase.from.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) {
        return makeBuilder({
          data: {
            id: UUID_MATCH, tournament_id: UUID_TOURNAMENT,
            team_a_id: UUID_TEAM_A, team_b_id: UUID_TEAM_B,
            best_of: 3, phase: 'FINAL'
          },
          error: null
        });
      }
      return makeBuilder({ data: drafts, error: null });
    });

    await getMatchDrafts(req, res, next);

    expect(res.statusCode).toBe(200);
    expect(Object.keys(res.body.by_game).sort()).toEqual(['1', '2', '3']);
    expect(res.body.by_game['1']).toHaveLength(2);
    expect(res.body.by_game['3']).toHaveLength(1);
  });

  it('8. error de query en drafts → next(err)', async () => {
    const req = mockReq({
      user: { id: UUID_USER, role: 'MIEMBRO' },
      params: { id: UUID_TOURNAMENT, mid: UUID_MATCH }
    });
    const res = mockRes();
    const next = mockNext();

    let callIdx = 0;
    mockSupabase.from.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) {
        return makeBuilder({
          data: {
            id: UUID_MATCH, tournament_id: UUID_TOURNAMENT,
            team_a_id: UUID_TEAM_A, team_b_id: UUID_TEAM_B,
            best_of: 3, phase: 'SWISS'
          },
          error: null
        });
      }
      return makeBuilder({ data: null, error: { code: 'XX000', message: 'boom' } });
    });

    await getMatchDrafts(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('9. metadata (best_of, phase, team_a_id, team_b_id) correcta', async () => {
    const req = mockReq({
      user: { id: UUID_USER, role: 'MIEMBRO' },
      params: { id: UUID_TOURNAMENT, mid: UUID_MATCH }
    });
    const res = mockRes();
    const next = mockNext();

    let callIdx = 0;
    mockSupabase.from.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) {
        return makeBuilder({
          data: {
            id: UUID_MATCH, tournament_id: UUID_TOURNAMENT,
            team_a_id: UUID_TEAM_A, team_b_id: UUID_TEAM_B,
            best_of: 5, phase: 'SF'
          },
          error: null
        });
      }
      return makeBuilder({ data: [], error: null });
    });

    await getMatchDrafts(req, res, next);

    expect(res.body.best_of).toBe(5);
    expect(res.body.phase).toBe('SF');
    expect(res.body.team_a_id).toBe(UUID_TEAM_A);
    expect(res.body.team_b_id).toBe(UUID_TEAM_B);
    expect(res.body.match_id).toBe(UUID_MATCH);
  });
});

// ═══════════════════════════════════════════════════════════════
// registerDraftAction — validaciones adicionales F1.5b
// ═══════════════════════════════════════════════════════════════
describe('registerDraftAction — validaciones F1.5b', () => {

  const validBody = {
    action: 'BAN',
    aircraft_id: '101',
    game_number: 1,
    team_id: UUID_TEAM_A,
    order_index: 1
  };

  it('10. aircraft_id inexistente → 400 AIRCRAFT_NOT_FOUND', async () => {
    const req = mockReq({
      user: { id: UUID_USER, role: 'ADMIN' },
      params: { id: UUID_TOURNAMENT, mid: UUID_MATCH },
      body: validBody
    });
    const res = mockRes();
    const next = mockNext();

    let callIdx = 0;
    mockSupabase.from.mockImplementation(() => {
      callIdx++;
      // 1: match
      if (callIdx === 1) {
        return makeBuilder({
          data: {
            id: UUID_MATCH, tournament_id: UUID_TOURNAMENT,
            team_a_id: UUID_TEAM_A, team_b_id: UUID_TEAM_B
          },
          error: null
        });
      }
      // 2: plane_models lookup → no existe
      if (callIdx === 2) {
        return makeBuilder({ data: null, error: null });
      }
      return makeBuilder({ data: [], error: null });
    });

    await registerDraftAction(req, res, next);

    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe('AIRCRAFT_NOT_FOUND');
  });

  it('11. aircraft_id baneada por el oponente → 409 AIRCRAFT_BANNED_BY_OPPONENT', async () => {
    const req = mockReq({
      user: { id: UUID_USER, role: 'ADMIN' },
      params: { id: UUID_TOURNAMENT, mid: UUID_MATCH },
      body: { ...validBody, aircraft_id: '999' }
    });
    const res = mockRes();
    const next = mockNext();

    let callIdx = 0;
    mockSupabase.from.mockImplementation(() => {
      callIdx++;
      // 1: match
      if (callIdx === 1) {
        return makeBuilder({
          data: {
            id: UUID_MATCH, tournament_id: UUID_TOURNAMENT,
            team_a_id: UUID_TEAM_A, team_b_id: UUID_TEAM_B
          },
          error: null
        });
      }
      // 2: plane_models → existe
      if (callIdx === 2) {
        return makeBuilder({ data: { id: '999', name: 'Some Plane' }, error: null });
      }
      // 3: opponent bans → el oponente ya baneó 999
      if (callIdx === 3) {
        return makeBuilder({
          data: [{ id: 'b1', aircraft_id: '999', action: 'BAN' }],
          error: null
        });
      }
      return makeBuilder({ data: [], error: null });
    });

    await registerDraftAction(req, res, next);

    expect(res.statusCode).toBe(409);
    expect(res.body.code).toBe('AIRCRAFT_BANNED_BY_OPPONENT');
  });

  it('12. aircraft_id es el último BM (acción BAN) → 409 AIRCRAFT_BM_AUTO_BANNED', async () => {
    const req = mockReq({
      user: { id: UUID_USER, role: 'ADMIN' },
      params: { id: UUID_TOURNAMENT, mid: UUID_MATCH },
      body: { ...validBody, aircraft_id: '126', action: 'BAN' }
    });
    const res = mockRes();
    const next = mockNext();

    let callIdx = 0;
    mockSupabase.from.mockImplementation((table) => {
      callIdx++;
      if (table === 'tournament_matches') {
        return makeBuilder({
          data: {
            id: UUID_MATCH, tournament_id: UUID_TOURNAMENT,
            team_a_id: UUID_TEAM_A, team_b_id: UUID_TEAM_B
          },
          error: null
        });
      }
      if (table === 'plane_models') {
        return makeBuilder({ data: { id: '126', name: 'F-15EX' }, error: null });
      }
      if (table === 'tournament_drafts') {
        // El ban del oponente está vacío
        return makeBuilder({ data: [], error: null });
      }
      if (table === 'events_master') {
        // El último BM tiene aircraft_id = 126
        return makeBuilder({
          data: {
            metadata: { aircraft_id: '126' },
            start_date: '2026-10-01T00:00:00Z'
          },
          error: null
        });
      }
      return makeBuilder({ data: [], error: null });
    });

    await registerDraftAction(req, res, next);

    expect(res.statusCode).toBe(409);
    expect(res.body.code).toBe('AIRCRAFT_BM_AUTO_BANNED');
  });

  it('13. aircraft_id es el último BM (acción PICK) → 201 (Mirrored Picks permitido)', async () => {
    const req = mockReq({
      user: { id: UUID_USER, role: 'ADMIN', user_id: 1, nick: 'CMD' },
      params: { id: UUID_TOURNAMENT, mid: UUID_MATCH },
      body: { ...validBody, aircraft_id: '126', action: 'PICK', order_index: 3 }
    });
    const res = mockRes();
    const next = mockNext();

    mockSupabase.from.mockImplementation((table) => {
      if (table === 'tournament_matches') {
        return makeBuilder({
          data: {
            id: UUID_MATCH, tournament_id: UUID_TOURNAMENT,
            team_a_id: UUID_TEAM_A, team_b_id: UUID_TEAM_B
          },
          error: null
        });
      }
      if (table === 'plane_models') {
        return makeBuilder({ data: { id: '126', name: 'F-15EX' }, error: null });
      }
      if (table === 'tournament_drafts') {
        // El ban del oponente está vacío
        return makeBuilder({ data: [], error: null });
      }
      if (table === 'events_master') {
        // El último BM tiene aircraft_id = 126, pero como es PICK, NO se bloquea
        return makeBuilder({
          data: {
            metadata: { aircraft_id: '126' },
            start_date: '2026-10-01T00:00:00Z'
          },
          error: null
        });
      }
      return makeBuilder({ data: [], error: null });
    });

    // Mockear el INSERT exitoso
    mockSupabase.from.mockImplementationOnce((table) => {
      return makeBuilder({
        data: {
          id: UUID_MATCH, tournament_id: UUID_TOURNAMENT,
          team_a_id: UUID_TEAM_A, team_b_id: UUID_TEAM_B
        },
        error: null
      });
    });
    mockSupabase.from.mockImplementationOnce(() =>
      makeBuilder({ data: { id: '126', name: 'F-15EX' }, error: null })
    );
    mockSupabase.from.mockImplementationOnce(() =>
      makeBuilder({ data: [], error: null })
    );
    mockSupabase.from.mockImplementationOnce(() =>
      makeBuilder({
        data: { id: 'draft-uuid', action: 'PICK', aircraft_id: '126' },
        error: null
      })
    );

    await registerDraftAction(req, res, next);

    // PICK no valida BM → debe pasar
    expect([201, 200]).toContain(res.statusCode);
  });

  it('14. happy path BAN sin BM activo → 201', async () => {
    const req = mockReq({
      user: { id: UUID_USER, role: 'ADMIN', user_id: 1, nick: 'CMD' },
      params: { id: UUID_TOURNAMENT, mid: UUID_MATCH },
      body: validBody
    });
    const res = mockRes();
    const next = mockNext();

    // Simulamos con mockImplementation secuencial por call order
    mockSupabase.from
      // 1: match
      .mockImplementationOnce(() =>
        makeBuilder({
          data: {
            id: UUID_MATCH, tournament_id: UUID_TOURNAMENT,
            team_a_id: UUID_TEAM_A, team_b_id: UUID_TEAM_B
          },
          error: null
        })
      )
      // 2: plane_models → existe
      .mockImplementationOnce(() =>
        makeBuilder({ data: { id: '101', name: 'Plane 101' }, error: null })
      )
      // 3: opponent bans → vacío
      .mockImplementationOnce(() => makeBuilder({ data: [], error: null }))
      // 4: events_master (BM) → vacío, no hay BM activo
      .mockImplementationOnce(() => makeBuilder({ data: null, error: null }))
      // 5: INSERT draft → éxito
      .mockImplementationOnce(() =>
        makeBuilder({
          data: { id: 'draft-1', ...validBody, created_at: '2026-10-12T00:00:00Z' },
          error: null
        })
      );

    await registerDraftAction(req, res, next);

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('15. happy path PICK con Mirrored Picks → 201', async () => {
    const req = mockReq({
      user: { id: UUID_USER, role: 'ADMIN', user_id: 1, nick: 'CMD' },
      params: { id: UUID_TOURNAMENT, mid: UUID_MATCH },
      body: { ...validBody, action: 'PICK', order_index: 3, aircraft_id: '150' }
    });
    const res = mockRes();
    const next = mockNext();

    mockSupabase.from
      .mockImplementationOnce(() =>
        makeBuilder({
          data: {
            id: UUID_MATCH, tournament_id: UUID_TOURNAMENT,
            team_a_id: UUID_TEAM_A, team_b_id: UUID_TEAM_B
          },
          error: null
        })
      )
      .mockImplementationOnce(() =>
        makeBuilder({ data: { id: '150', name: 'Plane 150' }, error: null })
      )
      // opponent bans → distinto al 150
      .mockImplementationOnce(() =>
        makeBuilder({ data: [{ id: 'b', aircraft_id: '999', action: 'BAN' }], error: null })
      )
      .mockImplementationOnce(() =>
        makeBuilder({
          data: { id: 'draft-pick', action: 'PICK', aircraft_id: '150' },
          error: null
        })
      );

    await registerDraftAction(req, res, next);

    expect(res.statusCode).toBe(201);
    expect(res.body.draft.action).toBe('PICK');
  });
});
`;

// ═══════════════════════════════════════════════════════════════════════════
//  MAIN
// ═══════════════════════════════════════════════════════════════════════════
function main() {
  console.log('');
  console.log('================================================================');
  console.log('  F1.5b — Script #1: Backend de Draft');
  console.log('================================================================');
  console.log('');

  if (IS_DRY_RUN) {
    log('warn', 'Modo --dry-run activo: NINGÚN archivo será modificado.');
    console.log('');
  }

  // [1/8] Verificar entorno
  log('step', '[1/8] Verificando entorno...');
  ensureFile(CONTROLLER, 'tournaments.controller.js');
  ensureFile(ROUTER, 'tournaments.routes.js');
  ensureFile(path.join(ROOT, 'tests', 'helpers', 'express.js'), 'tests/helpers/express.js');

  // [2/8] Cambio 1: helper getActiveBmAircraft
  log('step', '[2/8] Cambio 1: helper getActiveBmAircraft');
  const c1 = applyControllerHelpers(readNormalized(CONTROLLER));
  if (!c1.ok) { log('fail', 'Cambio 1 falló. Abortando.'); process.exit(1); }

  // [3/8] Cambio 2: handler getMatchDrafts
  log('step', '[3/8] Cambio 2: handler getMatchDrafts');
  const c2 = applyGetMatchDrafts(c1.content);
  if (!c2.ok) { log('fail', 'Cambio 2 falló. Abortando.'); process.exit(1); }

  // [4/8] Cambio 3: validaciones en registerDraftAction
  log('step', '[4/8] Cambio 3: validaciones adicionales en registerDraftAction');
  const c3 = applyRegisterDraftValidations(c2.content);
  if (!c3.ok) { log('fail', 'Cambio 3 falló. Abortando.'); process.exit(1); }

  // [5/8] Cambio 4: router (import + ruta)
  log('step', '[5/8] Cambio 4: router (import + ruta GET)');
  const c4 = applyRouterChanges(readNormalized(ROUTER));
  if (!c4.ok) { log('fail', 'Cambio 4 falló. Abortando.'); process.exit(1); }

  // [6/8] Cambio 5: crear archivo de tests
  log('step', '[6/8] Cambio 5: crear tests/controllers/tournaments.drafts.test.js');
  const testExists = fs.existsSync(TEST_DRAFTS);
  if (testExists) {
    log('info', `Archivo de tests ya existe (${(fs.statSync(TEST_DRAFTS).size / 1024).toFixed(1)} KB)`);
  } else {
    log('ok', 'Archivo de tests no existe → se puede crear');
  }

  // [7/8] Dry-run summary o apply
  log('step', '[7/8] Ejecutando...');

  if (IS_DRY_RUN) {
    log('info', '[DRY-RUN] No se escribiría nada.');
    log('info', '[DRY-RUN] Ejecutar con `--apply` para aplicar.');
    console.log('');
    console.log('----------------------------------------------------------------');
    console.log('  RESUMEN (dry-run)');
    console.log('----------------------------------------------------------------');
    console.log('  Archivos a modificar:  2');
    console.log('    · src/controllers/tournaments.controller.js  (+helper, +handler, +validaciones)');
    console.log('    · src/routes/tournaments.routes.js           (+import, +ruta GET)');
    console.log('  Archivo a crear:       1');
    console.log('    · tests/controllers/tournaments.drafts.test.js  (15 casos)');
    console.log('  Backups a crear:       .bak-f1.5b (x2)');
    console.log('  Verificación:          node --check en controller y router');
    console.log('----------------------------------------------------------------');
    console.log('');
    process.exit(0);
  }

  // ─── APLICAR ────────────────────────────────────────────────────────────
  backup(CONTROLLER);
  writeNormalized(CONTROLLER, c3.content);
  log('ok', 'tournaments.controller.js actualizado');

  backup(ROUTER);
  writeNormalized(ROUTER, c4.content);
  log('ok', 'tournaments.routes.js actualizado');

  if (!testExists) {
    fs.writeFileSync(TEST_DRAFTS, TEST_DRAFTS_CONTENT, 'utf8');
    log('ok', `tests/controllers/tournaments.drafts.test.js creado (${(TEST_DRAFTS_CONTENT.length / 1024).toFixed(1)} KB)`);
  } else {
    log('info', 'Tests no sobreescritos (ya existían)');
  }

  // [8/8] Verificación node --check
  log('step', '[8/8] Verificando sintaxis JS...');
  const okCtrl = nodeCheck(CONTROLLER);
  const okRouter = nodeCheck(ROUTER);
  const okTest = nodeCheck(TEST_DRAFTS);

  if (!okCtrl || !okRouter || !okTest) {
    log('fail', 'node --check falló. Restaurar desde .bak-f1.5b');
    process.exit(1);
  }

  // Resumen final
  console.log('');
  console.log('----------------------------------------------------------------');
  console.log('  RESUMEN');
  console.log('----------------------------------------------------------------');
  console.log('  ✅ tournaments.controller.js    (helper + handler + validaciones)');
  console.log('  ✅ tournaments.routes.js        (import + ruta GET /drafts)');
  console.log('  ✅ tournaments.drafts.test.js   (15 casos nuevos)');
  console.log('  ✅ node --check OK en los 3 archivos');
  console.log('  ✅ Backups: *.bak-f1.5b (x2)');
  console.log('----------------------------------------------------------------');
  console.log('');
  console.log('PRÓXIMOS PASOS:');
  console.log('  1. Correr tests:      npx vitest run');
  console.log('  2. Verificar:         git diff src/controllers/tournaments.controller.js');
  console.log('                        git diff src/routes/tournaments.routes.js');
  console.log('  3. Commit:            git add src/controllers/tournaments.controller.js');
  console.log('                        git add src/routes/tournaments.routes.js');
  console.log('                        git add tests/controllers/tournaments.drafts.test.js');
  console.log('                        git add scripts/f1-5b-backend.cjs');
  console.log('                        git commit -m "feat(tournaments): backend draft F1.5b (GET + validaciones)"');
  console.log('  4. Push:              git push origin main');
  console.log('');
}

main();