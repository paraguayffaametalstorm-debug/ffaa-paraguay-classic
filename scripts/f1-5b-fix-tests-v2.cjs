#!/usr/bin/env node
/**
 * ============================================================================
 *  F1.5b — Fix v2 de 2 tests (por tabla, no por call-order)
 * ============================================================================
 *  Arregla:
 *    - tests/controllers/tournaments.controller.test.js → test 43
 *    - tests/controllers/tournaments.drafts.test.js     → test 14
 *
 *  Cambio: reemplazar mockImplementation por callIdx con
 *  mockImplementation por tabla (robusto ante ramas condicionales).
 *
 *  USO
 *  ---
 *  node scripts/f1-5b-fix-tests-v2.cjs              → dry-run
 *  node scripts/f1-5b-fix-tests-v2.cjs --apply      → aplicar
 * ============================================================================
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const ROOT         = path.resolve(__dirname, '..');
const TEST_CTRL    = path.join(ROOT, 'tests', 'controllers', 'tournaments.controller.test.js');
const TEST_DRAFTS  = path.join(ROOT, 'tests', 'controllers', 'tournaments.drafts.test.js');
const BACKUP_SUF   = '.bak-f1.5b-fix2';

const APPLY      = process.argv.includes('--apply');
const IS_DRY_RUN = !APPLY;

function log(prefix, message) {
  const icons = { ok: '✅', fail: '❌', info: 'ℹ️ ', warn: '⚠️ ', step: '🔹' };
  console.log(`${icons[prefix] || '  '} ${message}`);
}

function readNormalized(p) {
  return fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
}

function writeNormalized(p, c) {
  fs.writeFileSync(p, c, 'utf8');
}

function backup(p) {
  const b = p + BACKUP_SUF;
  if (!fs.existsSync(b)) {
    fs.copyFileSync(p, b);
    log('ok', `Backup: ${path.basename(b)}`);
  } else {
    log('info', `Backup ya existe: ${path.basename(b)}`);
  }
}

// Reemplaza el body de un test `it(...)` identificado por su título parcial.
// Devuelve el array de líneas modificado.
function replaceTestBody(lines, titleFragment, newBodyLines) {
  const idxStart = lines.findIndex(l => l.includes(titleFragment));
  if (idxStart === -1) return { ok: false, reason: `No se encontró test "${titleFragment}"` };

  // Encontrar el cierre del `it(...)` — el primer "  });" después del start
  let idxEnd = -1;
  for (let i = idxStart + 1; i < lines.length; i++) {
    if (lines[i].trim() === '});' || lines[i].trim() === '});') {
      // Verificar que sea el cierre del test (indentación de 2 espacios)
      if (lines[i].match(/^  \}\);$/)) {
        idxEnd = i;
        break;
      }
    }
  }
  if (idxEnd === -1) return { ok: false, reason: `No se encontró cierre de "${titleFragment}"` };

  // Reemplazar todo el bloque [idxStart .. idxEnd] con el nuevo body
  lines.splice(idxStart, idxEnd - idxStart + 1, ...newBodyLines);
  return { ok: true, idxStart, idxEnd };
}

// ═══════════════════════════════════════════════════════════════════════════
//  FIX 1 — tournaments.controller.test.js → test 43
// ═══════════════════════════════════════════════════════════════════════════
function fixCtrlTest43() {
  log('step', 'A. tournaments.controller.test.js — test 43 (PICK)');

  const content = readNormalized(TEST_CTRL);
  let lines = content.split('\n');

  // Verificar idempotencia: si ya usa el patrón por tabla, skip
  const idx43 = lines.findIndex(l => l.includes("it('43. happy path PICK"));
  if (idx43 === -1) {
    log('fail', 'No se encontró test 43');
    return { ok: false, content };
  }
  // Chequear si ya está el mock por tabla
  const next10 = lines.slice(idx43, idx43 + 50).join('\n');
  if (next10.includes("if (table === 'tournament_matches')")) {
    log('info', 'Test 43 ya usa mock por tabla (idempotente)');
    return { ok: true, content, changed: false };
  }

  const newTest = [
    "  it('43. happy path PICK → 201', async () => {",
    "    const req = mockReq({",
    "      user: { id: UUID_USER, role: 'ADMIN', user_id: 1, nick: 'CMD' },",
    "      params: { id: UUID_TOURNAMENT, mid: UUID_MATCH },",
    "      body: { ...validBody, action: 'PICK' }",
    "    });",
    "    const res = mockRes();",
    "    const next = mockNext();",
    "",
    "    // Mock por tabla (robusto ante ramas condicionales: BAN llama events_master, PICK no)",
    "    mockSupabase.from.mockImplementation((table) => {",
    "      if (table === 'tournament_matches') {",
    "        return makeBuilder({",
    "          data: {",
    "            id: UUID_MATCH, tournament_id: UUID_TOURNAMENT,",
    "            team_a_id: UUID_TEAM_A, team_b_id: UUID_TEAM_B",
    "          },",
    "          error: null",
    "        });",
    "      }",
    "      if (table === 'plane_models') {",
    "        return makeBuilder({ data: { id: UUID_AIRCRAFT, name: 'Plane' }, error: null });",
    "      }",
    "      if (table === 'tournament_drafts') {",
    "        // Puede ser SELECT (bans oponente) o INSERT (acción). Distinguimos por si ya hay retorno.",
    "        // Truco: devolvemos [] para SELECT, y un objeto para INSERT. Como builder",
    "        // ejecuta el mismo .single()/.maybeSingle(), devolvemos el draft (que es lo que",
    "        // el handler espera cuando hace .insert().select().single()).",
    "        return makeBuilder({ data: { id: 'd1', action: 'PICK', aircraft_id: UUID_AIRCRAFT }, error: null });",
    "      }",
    "      if (table === 'events_master') {",
    "        return makeBuilder({ data: null, error: null });",
    "      }",
    "      return makeBuilder({ data: null, error: null });",
    "    });",
    "",
    "    await registerDraftAction(req, res, next);",
    "",
    "    expect(res.statusCode).toBe(201);",
    "    expect(res.body.draft.action).toBe('PICK');",
    "  });"
  ];

  const r = replaceTestBody(lines, "it('43. happy path PICK", newTest);
  if (!r.ok) {
    log('fail', r.reason);
    return { ok: false, content };
  }
  log('ok', `Test 43 reemplazado (líneas ${r.idxStart + 1}-${r.idxEnd + 1})`);

  return { ok: true, content: lines.join('\n'), changed: true };
}

// ═══════════════════════════════════════════════════════════════════════════
//  FIX 2 — tournaments.drafts.test.js → test 14
// ═══════════════════════════════════════════════════════════════════════════
function fixDraftsTest14() {
  log('step', 'B. tournaments.drafts.test.js — test 14 (BAN sin BM)');

  const content = readNormalized(TEST_DRAFTS);
  let lines = content.split('\n');

  const idx14 = lines.findIndex(l => l.includes("it('14. happy path BAN sin BM activo"));
  if (idx14 === -1) {
    log('fail', 'No se encontró test 14');
    return { ok: false, content };
  }
  const next10 = lines.slice(idx14, idx14 + 50).join('\n');
  if (next10.includes("if (table === 'tournament_matches')")) {
    log('info', 'Test 14 ya usa mock por tabla (idempotente)');
    return { ok: true, content, changed: false };
  }

  const newTest = [
    "  it('14. happy path BAN sin BM activo → 201', async () => {",
    "    const req = mockReq({",
    "      user: { id: UUID_USER, role: 'ADMIN', user_id: 1, nick: 'CMD' },",
    "      params: { id: UUID_TOURNAMENT, mid: UUID_MATCH },",
    "      body: validBody",
    "    });",
    "    const res = mockRes();",
    "    const next = mockNext();",
    "",
    "    // Mock por tabla (robusto ante ramas condicionales)",
    "    mockSupabase.from.mockImplementation((table) => {",
    "      if (table === 'tournament_matches') {",
    "        return makeBuilder({",
    "          data: {",
    "            id: UUID_MATCH, tournament_id: UUID_TOURNAMENT,",
    "            team_a_id: UUID_TEAM_A, team_b_id: UUID_TEAM_B",
    "          },",
    "          error: null",
    "        });",
    "      }",
    "      if (table === 'plane_models') {",
    "        return makeBuilder({ data: { id: '101', name: 'Plane 101' }, error: null });",
    "      }",
    "      if (table === 'tournament_drafts') {",
    "        // SELECT (bans oponente) o INSERT. El handler solo usa .insert().select().single()",
    "        // al final, así que devolvemos el draft insertado.",
    "        return makeBuilder({",
    "          data: { id: 'draft-1', ...validBody, created_at: '2026-10-12T00:00:00Z' },",
    "          error: null",
    "        });",
    "      }",
    "      if (table === 'events_master') {",
    "        // Sin BM activo",
    "        return makeBuilder({ data: null, error: null });",
    "      }",
    "      return makeBuilder({ data: null, error: null });",
    "    });",
    "",
    "    await registerDraftAction(req, res, next);",
    "",
    "    expect(res.statusCode).toBe(201);",
    "    expect(res.body.success).toBe(true);",
    "  });"
  ];

  const r = replaceTestBody(lines, "it('14. happy path BAN sin BM activo", newTest);
  if (!r.ok) {
    log('fail', r.reason);
    return { ok: false, content };
  }
  log('ok', `Test 14 reemplazado (líneas ${r.idxStart + 1}-${r.idxEnd + 1})`);

  return { ok: true, content: lines.join('\n'), changed: true };
}

// ═══════════════════════════════════════════════════════════════════════════
//  MAIN
// ═══════════════════════════════════════════════════════════════════════════
function main() {
  console.log('');
  console.log('================================================================');
  console.log('  F1.5b — Fix v2 de 2 tests (mock por tabla)');
  console.log('================================================================');
  console.log('');

  if (IS_DRY_RUN) {
    log('warn', 'Modo --dry-run: NINGÚN archivo será modificado.');
    console.log('');
  }

  log('step', '[1/3] Verificando archivos...');
  if (!fs.existsSync(TEST_CTRL)) { log('fail', `No existe ${TEST_CTRL}`); process.exit(1); }
  if (!fs.existsSync(TEST_DRAFTS)) { log('fail', `No existe ${TEST_DRAFTS}`); process.exit(1); }
  log('ok', 'tournaments.controller.test.js encontrado');
  log('ok', 'tournaments.drafts.test.js encontrado');

  log('step', '[2/3] Preparando fixes...');
  const fix1 = fixCtrlTest43();
  if (!fix1.ok) { log('fail', 'Fix 1 falló'); process.exit(1); }
  const fix2 = fixDraftsTest14();
  if (!fix2.ok) { log('fail', 'Fix 2 falló'); process.exit(1); }

  log('step', '[3/3] Ejecutando...');
  if (IS_DRY_RUN) {
    log('info', '[DRY-RUN] No se escribiría nada.');
    log('info', '[DRY-RUN] Ejecutar con `--apply`.');
    console.log('');
    console.log('----------------------------------------------------------------');
    console.log('  RESUMEN (dry-run)');
    console.log('----------------------------------------------------------------');
    console.log('  · tournaments.controller.test.js → test 43 (PICK)');
    console.log('  · tournaments.drafts.test.js     → test 14 (BAN sin BM)');
    console.log('----------------------------------------------------------------');
    console.log('');
    process.exit(0);
  }

  backup(TEST_CTRL);
  writeNormalized(TEST_CTRL, fix1.content);
  log('ok', 'tournaments.controller.test.js actualizado');

  backup(TEST_DRAFTS);
  writeNormalized(TEST_DRAFTS, fix2.content);
  log('ok', 'tournaments.drafts.test.js actualizado');

  console.log('');
  console.log('----------------------------------------------------------------');
  console.log('  RESUMEN');
  console.log('----------------------------------------------------------------');
  console.log('  ✅ Test 43 reemplazado en tournaments.controller.test.js');
  console.log('  ✅ Test 14 reemplazado en tournaments.drafts.test.js');
  console.log('  ✅ Backups: *.bak-f1.5b-fix2');
  console.log('----------------------------------------------------------------');
  console.log('');
  console.log('PRÓXIMOS PASOS:');
  console.log('  1. npx vitest run');
  console.log('');
}

main();