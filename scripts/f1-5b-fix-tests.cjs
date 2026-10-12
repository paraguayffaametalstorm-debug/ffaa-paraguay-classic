#!/usr/bin/env node
/**
 * ============================================================================
 *  F1.5b — Fix quirúrgico de 4 tests desalineados
 * ============================================================================
 *  Ajusta los mocks de:
 *    - tests/controllers/tournaments.controller.test.js (tests 41, 42, 43)
 *    - tests/controllers/tournaments.drafts.test.js  (test 14)
 *
 *  Razón: las validaciones F1.5b agregadas a registerDraftAction
 *  introducen 2 queries nuevas (plane_models + opponent bans) ANTES
 *  del INSERT. Los tests viejos mockean solo 2 llamadas.
 *
 *  Estrategia: reemplazo quirúrgico por bloque (split + splice).
 *
 *  USO
 *  ---
 *  node scripts/f1-5b-fix-tests.cjs              → dry-run
 *  node scripts/f1-5b-fix-tests.cjs --apply      → aplicar
 * ============================================================================
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const ROOT           = path.resolve(__dirname, '..');
const TEST_CTRL      = path.join(ROOT, 'tests', 'controllers', 'tournaments.controller.test.js');
const TEST_DRAFTS    = path.join(ROOT, 'tests', 'controllers', 'tournaments.drafts.test.js');
const BACKUP_SUFFIX  = '.bak-f1.5b-fix';

const args       = process.argv.slice(2);
const APPLY      = args.includes('--apply');
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
  const b = p + BACKUP_SUFFIX;
  if (!fs.existsSync(b)) {
    fs.copyFileSync(p, b);
    log('ok', `Backup: ${path.basename(b)}`);
  } else {
    log('info', `Backup ya existe: ${path.basename(b)}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  FIX 1 — Reemplazar los 3 tests 41/42/43 en tournaments.controller.test.js
// ═══════════════════════════════════════════════════════════════════════════
function fixControllerTest() {
  log('step', 'A. tournaments.controller.test.js — tests 41/42/43');

  const content = readNormalized(TEST_CTRL);

  // Buscamos el bloque completo del describe registerDraftAction
  // y reemplazamos los 3 tests problemáticos.
  //
  // Anchor de inicio: "it('41. order_index duplicado"
  // Anchor de fin: el cierre del test 43 + `});`

  const lines = content.split('\n');

  // Localizar el inicio del test 41
  const idx41 = lines.findIndex(l => l.includes("it('41. order_index duplicado"));
  if (idx41 === -1) {
    log('fail', 'No se encontró test 41 en tournaments.controller.test.js');
    return { ok: false, content };
  }
  log('ok', `Test 41 en línea ${idx41 + 1}`);

  // Localizar el fin del test 43 (la línea con `});` que cierra el 3er test)
  // El test 43 empieza con "it('43. happy path PICK → 201'"
  const idx43 = lines.findIndex(l => l.includes("it('43. happy path PICK"));
  if (idx43 === -1) {
    log('fail', 'No se encontró test 43');
    return { ok: false, content };
  }
  log('ok', `Test 43 en línea ${idx43 + 1}`);

  // Encontrar el cierre del test 43 (el `});` que cierra el `it`)
  let idxEnd43 = -1;
  let depth = 0;
  for (let i = idx43; i < lines.length; i++) {
    for (const ch of lines[i]) {
      if (ch === '{') depth++;
      else if (ch === '}') depth--;
    }
    if (depth === 0 && i > idx43) {
      // El primer cierre "});" después del it
      if (lines[i].trim() === '});') {
        idxEnd43 = i;
        break;
      }
    }
  }
  if (idxEnd43 === -1) {
    log('fail', 'No se encontró el cierre del test 43');
    return { ok: false, content };
  }
  log('ok', `Test 43 cierra en línea ${idxEnd43 + 1}`);

  // Bloque de reemplazo: los 3 tests nuevos con mocks alineados
  const newTests = [
    "  it('41. order_index duplicado (23505) → 409', async () => {",
    "    const req = mockReq({",
    "      user: { id: UUID_USER, role: 'ADMIN' },",
    "      params: { id: UUID_TOURNAMENT, mid: UUID_MATCH },",
    "      body: validBody",
    "    });",
    "    const res = mockRes();",
    "    const next = mockNext();",
    "",
    "    let callIdx = 0;",
    "    mockSupabase.from.mockImplementation(() => {",
    "      callIdx++;",
    "      // 1: match",
    "      if (callIdx === 1) {",
    "        return makeBuilder({",
    "          data: {",
    "            id: UUID_MATCH, tournament_id: UUID_TOURNAMENT,",
    "            team_a_id: UUID_TEAM_A, team_b_id: UUID_TEAM_B",
    "          },",
    "          error: null",
    "        });",
    "      }",
    "      // 2: plane_models → existe",
    "      if (callIdx === 2) {",
    "        return makeBuilder({ data: { id: UUID_AIRCRAFT, name: 'Plane' }, error: null });",
    "      }",
    "      // 3: opponent bans → vacío",
    "      if (callIdx === 3) {",
    "        return makeBuilder({ data: [], error: null });",
    "      }",
    "      // 4: events_master (BM) → sin BM",
    "      if (callIdx === 4) {",
    "        return makeBuilder({ data: null, error: null });",
    "      }",
    "      // 5: INSERT draft → 23505 duplicado",
    "      return makeBuilder({ data: null, error: { code: '23505', message: 'duplicate' } });",
    "    });",
    "",
    "    await registerDraftAction(req, res, next);",
    "",
    "    expect(res.statusCode).toBe(409);",
    "    expect(res.body.code).toBe('DRAFT_ORDER_ALREADY_USED');",
    "  });",
    "",
    "  it('42. happy path BAN → 201', async () => {",
    "    const req = mockReq({",
    "      user: { id: UUID_USER, role: 'ADMIN', user_id: 1, nick: 'CMD' },",
    "      params: { id: UUID_TOURNAMENT, mid: UUID_MATCH },",
    "      body: validBody",
    "    });",
    "    const res = mockRes();",
    "    const next = mockNext();",
    "",
    "    let callIdx = 0;",
    "    mockSupabase.from.mockImplementation(() => {",
    "      callIdx++;",
    "      if (callIdx === 1) {",
    "        return makeBuilder({",
    "          data: {",
    "            id: UUID_MATCH, tournament_id: UUID_TOURNAMENT,",
    "            team_a_id: UUID_TEAM_A, team_b_id: UUID_TEAM_B",
    "          },",
    "          error: null",
    "        });",
    "      }",
    "      if (callIdx === 2) {",
    "        return makeBuilder({ data: { id: UUID_AIRCRAFT, name: 'Plane' }, error: null });",
    "      }",
    "      if (callIdx === 3) {",
    "        return makeBuilder({ data: [], error: null });",
    "      }",
    "      if (callIdx === 4) {",
    "        return makeBuilder({ data: null, error: null });",
    "      }",
    "      return makeBuilder({ data: { id: 'd1', ...validBody }, error: null });",
    "    });",
    "",
    "    await registerDraftAction(req, res, next);",
    "",
    "    expect(res.statusCode).toBe(201);",
    "    expect(res.body.draft.action).toBe('BAN');",
    "  });",
    "",
    "  it('43. happy path PICK → 201', async () => {",
    "    const req = mockReq({",
    "      user: { id: UUID_USER, role: 'ADMIN', user_id: 1, nick: 'CMD' },",
    "      params: { id: UUID_TOURNAMENT, mid: UUID_MATCH },",
    "      body: { ...validBody, action: 'PICK' }",
    "    });",
    "    const res = mockRes();",
    "    const next = mockNext();",
    "",
    "    let callIdx = 0;",
    "    mockSupabase.from.mockImplementation(() => {",
    "      callIdx++;",
    "      if (callIdx === 1) {",
    "        return makeBuilder({",
    "          data: {",
    "            id: UUID_MATCH, tournament_id: UUID_TOURNAMENT,",
    "            team_a_id: UUID_TEAM_A, team_b_id: UUID_TEAM_B",
    "          },",
    "          error: null",
    "        });",
    "      }",
    "      if (callIdx === 2) {",
    "        return makeBuilder({ data: { id: UUID_AIRCRAFT, name: 'Plane' }, error: null });",
    "      }",
    "      if (callIdx === 3) {",
    "        return makeBuilder({ data: [], error: null });",
    "      }",
    "      if (callIdx === 4) {",
    "        return makeBuilder({ data: null, error: null });",
    "      }",
    "      return makeBuilder({ data: { id: 'd1', action: 'PICK' }, error: null });",
    "    });",
    "",
    "    await registerDraftAction(req, res, next);",
    "",
    "    expect(res.statusCode).toBe(201);",
    "    expect(res.body.draft.action).toBe('PICK');",
    "  });"
  ];

  // Reemplazar el rango [idx41 .. idxEnd43] con el nuevo bloque
  lines.splice(idx41, idxEnd43 - idx41 + 1, ...newTests);
  log('ok', `Tests 41/42/43 reemplazados con mocks alineados`);

  return { ok: true, content: lines.join('\n') };
}

// ═══════════════════════════════════════════════════════════════════════════
//  FIX 2 — Reemplazar el test 14 en tournaments.drafts.test.js
// ═══════════════════════════════════════════════════════════════════════════
function fixDraftsTest() {
  log('step', 'B. tournaments.drafts.test.js — test 14');

  const content = readNormalized(TEST_DRAFTS);
  const lines = content.split('\n');

  const idx14 = lines.findIndex(l => l.includes("it('14. happy path BAN sin BM activo"));
  if (idx14 === -1) {
    log('fail', 'No se encontró test 14 en tournaments.drafts.test.js');
    return { ok: false, content };
  }
  log('ok', `Test 14 en línea ${idx14 + 1}`);

  // Encontrar el cierre del test 14
  let idxEnd14 = -1;
  let depth = 0;
  for (let i = idx14; i < lines.length; i++) {
    for (const ch of lines[i]) {
      if (ch === '{') depth++;
      else if (ch === '}') depth--;
    }
    if (depth === 0 && i > idx14) {
      if (lines[i].trim() === '});') {
        idxEnd14 = i;
        break;
      }
    }
  }
  if (idxEnd14 === -1) {
    log('fail', 'No se encontró el cierre del test 14');
    return { ok: false, content };
  }
  log('ok', `Test 14 cierra en línea ${idxEnd14 + 1}`);

  // Reemplazo con mock alineado por call-order
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
    "    let callIdx = 0;",
    "    mockSupabase.from.mockImplementation(() => {",
    "      callIdx++;",
    "      if (callIdx === 1) {",
    "        return makeBuilder({",
    "          data: {",
    "            id: UUID_MATCH, tournament_id: UUID_TOURNAMENT,",
    "            team_a_id: UUID_TEAM_A, team_b_id: UUID_TEAM_B",
    "          },",
    "          error: null",
    "        });",
    "      }",
    "      if (callIdx === 2) {",
    "        return makeBuilder({ data: { id: '101', name: 'Plane 101' }, error: null });",
    "      }",
    "      if (callIdx === 3) {",
    "        return makeBuilder({ data: [], error: null });",
    "      }",
    "      if (callIdx === 4) {",
    "        return makeBuilder({ data: null, error: null });",
    "      }",
    "      return makeBuilder({",
    "        data: { id: 'draft-1', ...validBody, created_at: '2026-10-12T00:00:00Z' },",
    "        error: null",
    "      });",
    "    });",
    "",
    "    await registerDraftAction(req, res, next);",
    "",
    "    expect(res.statusCode).toBe(201);",
    "    expect(res.body.success).toBe(true);",
    "  });"
  ];

  lines.splice(idx14, idxEnd14 - idx14 + 1, ...newTest);
  log('ok', 'Test 14 reemplazado con mock alineado');

  return { ok: true, content: lines.join('\n') };
}

// ═══════════════════════════════════════════════════════════════════════════
//  MAIN
// ═══════════════════════════════════════════════════════════════════════════
function main() {
  console.log('');
  console.log('================================================================');
  console.log('  F1.5b — Fix quirúrgico de 4 tests desalineados');
  console.log('================================================================');
  console.log('');

  if (IS_DRY_RUN) {
    log('warn', 'Modo --dry-run: NINGÚN archivo será modificado.');
    console.log('');
  }

  // [1/3] Verificaciones
  log('step', '[1/3] Verificando archivos...');
  if (!fs.existsSync(TEST_CTRL)) {
    log('fail', `No existe ${TEST_CTRL}`);
    process.exit(1);
  }
  if (!fs.existsSync(TEST_DRAFTS)) {
    log('fail', `No existe ${TEST_DRAFTS}`);
    process.exit(1);
  }
  log('ok', 'tournaments.controller.test.js encontrado');
  log('ok', 'tournaments.drafts.test.js encontrado');

  // [2/3] Aplicar fixes
  log('step', '[2/3] Preparando fixes...');
  const fix1 = fixControllerTest();
  if (!fix1.ok) { log('fail', 'Fix 1 falló'); process.exit(1); }

  const fix2 = fixDraftsTest();
  if (!fix2.ok) { log('fail', 'Fix 2 falló'); process.exit(1); }

  // [3/3] Aplicar o dry-run
  log('step', '[3/3] Ejecutando...');
  if (IS_DRY_RUN) {
    log('info', '[DRY-RUN] No se escribiría nada.');
    log('info', '[DRY-RUN] Ejecutar con `--apply`.');
    console.log('');
    console.log('----------------------------------------------------------------');
    console.log('  RESUMEN (dry-run)');
    console.log('----------------------------------------------------------------');
    console.log('  · tournaments.controller.test.js → 3 tests reemplazados (41/42/43)');
    console.log('  · tournaments.drafts.test.js     → 1 test reemplazado (14)');
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
  console.log('  ✅ Tests 41/42/43 reemplazados en tournaments.controller.test.js');
  console.log('  ✅ Test 14 reemplazado en tournaments.drafts.test.js');
  console.log('  ✅ Backups: *.bak-f1.5b-fix');
  console.log('----------------------------------------------------------------');
  console.log('');
  console.log('PRÓXIMOS PASOS:');
  console.log('  1. node --check tests/controllers/tournaments.controller.test.js');
  console.log('  2. node --check tests/controllers/tournaments.drafts.test.js');
  console.log('  3. npx vitest run');
  console.log('');
}

main();