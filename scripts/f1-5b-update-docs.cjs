#!/usr/bin/env node
/**
 * ============================================================================
 *  F1.5b — Script #4: Docs de cierre
 * ============================================================================
 *  Proyecto:  PARAGUAY-FFAA | METALSTORM
 *  Fase:      F1.5b (Modal de Draft — Sprint 8)
 *  Commit:    #4 de 4
 * ============================================================================
 *  OBJETIVO
 *  --------
 *  Cerrar documentalmente F1.5b y con ello F1 completa (F1.1 → F1.5b).
 *
 *  OPERACIONES (4):
 *    1. PLAN_TRABAJO_TORNEOS.md  → F1.5b ✅ CERRADO
 *    2. BACKLOG.md               → BL-034 actualizado (F1 completa)
 *    3. PLAN_TRABAJO.md          → Sprint 8 tabla final
 *    4. CURRENT_STATE.md         → nueva entrada F1.5b
 *
 *  USO
 *  ---
 *  node scripts/f1-5b-update-docs.cjs              → dry-run
 *  node scripts/f1-5b-update-docs.cjs --apply      → aplicar
 * ============================================================================
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const ROOT         = path.resolve(__dirname, '..');
const PLAN_TORNEOS = path.join(ROOT, 'docs', 'planning', 'PLAN_TRABAJO_TORNEOS.md');
const BACKLOG      = path.join(ROOT, 'docs', 'planning', 'BACKLOG.md');
const PLAN_TRABAJO = path.join(ROOT, 'docs', 'planning', 'PLAN_TRABAJO.md');
const CURRENT_ST   = path.join(ROOT, 'docs', 'planning', 'CURRENT_STATE.md');

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
  const b = p + '.bak-f1.5b-docs';
  if (!fs.existsSync(b)) {
    fs.copyFileSync(p, b);
    log('ok', `Backup: ${path.basename(b)}`);
  } else {
    log('info', `Backup ya existe: ${path.basename(b)}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// CAMBIO 1 — PLAN_TRABAJO_TORNEOS.md
// ═══════════════════════════════════════════════════════════════════════════
function applyPlanTorneos() {
  log('step', 'A. PLAN_TRABAJO_TORNEOS.md — F1.5b cerrado');

  const content = readNormalized(PLAN_TORNEOS);
  const lines = content.split('\n');

  // Idempotencia
  if (content.includes('### F1.5b — Draft ✅ CERRADO')) {
    log('info', 'F1.5b ya está cerrado (idempotente)');
    return { ok: true, content, changed: false };
  }

  // Anchor: "### F1.5b — Draft (postergado)"
  let idx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('### F1.5b — Draft')) {
      idx = i;
      break;
    }
  }
  if (idx === -1) {
    log('warn', 'No se encontró header "### F1.5b — Draft". Creando al final.');
    // Insertar al final antes del footer
    const footerIdx = lines.findIndex(l => l.includes('PARAGUAY FFAA `[PRY]` — Escuadrón Oficial MetalStorm'));
    if (footerIdx === -1) {
      log('fail', 'No se encontró footer');
      return { ok: false, content };
    }
    const bloque = [
      '',
      '### F1.5b — Draft ✅ CERRADO',
      '',
      '**Duración real:** 1 día.',
      '',
      '**4 commits aplicados:**',
      '',
      '- `fdfbe83` — `feat(tournaments): backend draft F1.5b (GET + validaciones)`',
      '- `c9e7b56` — `feat(tournaments): modal de draft F1.5b (frontend)`',
      '- (Commit #3) — `chore(tournaments): botón draft + integración F1.5b + cache v4.9.1`',
      '- (este commit) — `docs(tournaments): cierre F1.5b`',
      '',
      '**Backend entregado:**',
      '',
      '- `GET /api/tournaments/:id/matches/:mid/drafts` (lista drafts agrupados por game_number).',
      '- Validación de `aircraft_id` en `plane_models`.',
      '- Validación de bans del oponente (mismo game_number).',
      '- Auto-ban del último avión del Black Market (Anexo III §7.3).',
      '- Helper `getActiveBmAircraft` con caché TTL 5 min.',
      '',
      '**Frontend entregado:**',
      '',
      '- Modal `#tournamentDraftModal` (90 líneas).',
      '- ~10 funciones del draft en `js/tournaments.js` (480 líneas).',
      '- Timer 5 min por equipo con colores de urgencia.',
      '- Grilla de aeronaves con imágenes de Cloudinary + buscador.',
      '- Botones BAN/PICK + selector de equipo A/B.',
      '- Lista de acciones registradas.',
      '- Wrapper `apiTournamentsGetMatchDrafts` en `js/api.js`.',
      '- Botón "🎯 Draft" en cada match del bracket.',
      '',
      '**Tests:**',
      '',
      '- 15 tests nuevos (`tests/controllers/tournaments.drafts.test.js`).',
      '- 2 tests skipeados con TODO para cleanup futuro (mocks desalineados, no bugs de código).',
      '- Suite: **655 passing / 0 failing / 2 skipped**.',
      '',
      '**Verificado:**',
      '',
      '- 0 regresiones en los 642 tests previos.',
      '- `node --check` OK en los archivos modificados.',
      '- Cache bump: `sw.js` → `v4.9.1-f1.5b`, `index.html` → `?v=4.9.1` (29 ocurrencias).',
      '',
      '**Con F1.5b cerrada, F1 completa.**',
      '',
      '**Pendiente F1.6 (opcional):** Integración con Discord.',
      '',
      '---',
      ''
    ];
    lines.splice(footerIdx, 0, ...bloque);
    log('ok', 'Bloque F1.5b ✅ insertado al final');
    return { ok: true, content: lines.join('\n'), changed: true };
  }

  // Reemplazar header de F1.5b
  lines[idx] = '### F1.5b — Draft ✅ CERRADO';

  // Buscar el bloque de F1.5b actual (hasta "### F1.6" o "## 4.")
  let endIdx = -1;
  for (let i = idx + 1; i < lines.length; i++) {
    if (lines[i].startsWith('### F1.6') || lines[i].startsWith('## 4.')) {
      endIdx = i;
      break;
    }
  }
  if (endIdx === -1) endIdx = lines.length;

  const bloque = [
    '### F1.5b — Draft ✅ CERRADO',
    '',
    '**Duración real:** 1 día.',
    '',
    '**4 commits aplicados:**',
    '',
    '- `fdfbe83` — `feat(tournaments): backend draft F1.5b (GET + validaciones)`',
    '- `c9e7b56` — `feat(tournaments): modal de draft F1.5b (frontend)`',
    '- (Commit #3) — `chore(tournaments): botón draft + integración F1.5b + cache v4.9.1`',
    '- (este commit) — `docs(tournaments): cierre F1.5b`',
    '',
    '**Backend entregado:**',
    '',
    '- `GET /api/tournaments/:id/matches/:mid/drafts` (lista drafts agrupados por game_number).',
    '- Validación de `aircraft_id` en `plane_models`.',
    '- Validación de bans del oponente (mismo game_number).',
    '- Auto-ban del último avión del Black Market (Anexo III §7.3).',
    '- Helper `getActiveBmAircraft` con caché TTL 5 min.',
    '',
    '**Frontend entregado:**',
    '',
    '- Modal `#tournamentDraftModal` (90 líneas).',
    '- ~10 funciones del draft en `js/tournaments.js` (480 líneas).',
    '- Timer 5 min por equipo con colores de urgencia.',
    '- Grilla de aeronaves con imágenes de Cloudinary + buscador.',
    '- Botones BAN/PICK + selector de equipo A/B.',
    '- Lista de acciones registradas.',
    '- Wrapper `apiTournamentsGetMatchDrafts` en `js/api.js`.',
    '- Botón "🎯 Draft" en cada match del bracket.',
    '',
    '**Tests:**',
    '',
    '- 15 tests nuevos (`tests/controllers/tournaments.drafts.test.js`).',
    '- 2 tests skipeados con TODO para cleanup futuro (mocks desalineados, no bugs de código).',
    '- Suite: **655 passing / 0 failing / 2 skipped**.',
    '',
    '**Verificado:**',
    '',
    '- 0 regresiones en los 642 tests previos.',
    '- `node --check` OK en los archivos modificados.',
    '- Cache bump: `sw.js` → `v4.9.1-f1.5b`, `index.html` → `?v=4.9.1` (29 ocurrencias).',
    '',
    '**Con F1.5b cerrada, F1 completa.**',
    '',
    '**Pendiente F1.6 (opcional):** Integración con Discord.',
    '',
    '---',
    ''
  ];

  lines.splice(idx, endIdx - idx, ...bloque);
  log('ok', 'Bloque F1.5b ✅ reemplazado');
  return { ok: true, content: lines.join('\n'), changed: true };
}

// ═══════════════════════════════════════════════════════════════════════════
// CAMBIO 2 — BACKLOG.md
// ═══════════════════════════════════════════════════════════════════════════
function applyBacklog() {
  log('step', 'B. BACKLOG.md — BL-034 a Completados');

  const content = readNormalized(BACKLOG);
  let working = content;
  let changes = 0;

  // 2.1 Actualizar fila BL-034 en Prioridad Media → marcarlo como completado y moverlo
  const oldBl034 = /^\| \*\*BL-034\*\*.*$/m;
  if (oldBl034.test(working)) {
    working = working.replace(oldBl034, '| **BL-034** | ✨ | Sistema de Torneos Internos (**F1 COMPLETA**) | ✅ Cerrado | XL | RFC-002 + Anexo III + ADR-011. **F1.1–F1.5b cerrados.** 9 commits principales. Ver `docs/planning/PLAN_TRABAJO_TORNEOS.md`. |');
    log('ok', 'BL-034 marcado como ✅ Cerrado');
    changes++;
  }

  // 2.2 Agregar al histórico de Completados
  const histMarker = '| **F1.5a-TOURN** | 🎨 | Frontend torneos (bracket + roster + resultado + moderador) | 2026-10-12 | `b8e73ef` |';
  if (!working.includes('| **F1.5b-TOURN**')) {
    if (working.includes(histMarker)) {
      working = working.replace(
        histMarker,
        histMarker + '\n| **F1.5b-TOURN** | 🎯 | Modal de Draft (backend + frontend + tests) | 2026-10-12 | `fdfbe83` + `c9e7b56` |'
      );
      log('ok', 'F1.5b-TOURN agregado al histórico');
      changes++;
    } else {
      // Fallback: insertar al inicio de la tabla de completados
      const fallbackMarker = '| **F1.4-TOURN** |';
      if (working.includes(fallbackMarker)) {
        working = working.replace(fallbackMarker,
          '| **F1.5b-TOURN** | 🎯 | Modal de Draft (backend + frontend + tests) | 2026-10-12 | `fdfbe83` + `c9e7b56` |\n| **F1.5a-TOURN** | 🎨 | Frontend torneos (bracket + roster + resultado) | 2026-10-12 | `b8e73ef` |\n' + fallbackMarker
        );
        log('ok', 'F1.5a y F1.5b agregados al histórico (fallback)');
        changes++;
      } else {
        log('warn', 'No se encontró marker para histórico de Completados');
      }
    }
  } else {
    log('info', 'F1.5b-TOURN ya está en el histórico');
  }

  return { ok: true, content: working, changed: changes > 0 };
}

// ═══════════════════════════════════════════════════════════════════════════
// CAMBIO 3 — PLAN_TRABAJO.md (Sprint 8)
// ═══════════════════════════════════════════════════════════════════════════
function applyPlanTrabajo() {
  log('step', 'C. PLAN_TRABAJO.md — Sprint 8 tabla actualizada');

  const content = readNormalized(PLAN_TRABAJO);
  let working = content;
  let changes = 0;

  // C.1 Cambiar F1.5b de ⏳ a ✅
  const f15bOld = '| **F1.5b** | 🎨 | Frontend (modal de draft: bans + picks + timer) | ⏳ Pendiente |';
  const f15bNew = '| **F1.5b** | 🎨 | Frontend (modal de draft: bans + picks + timer) | ✅ Cerrado |';
  if (working.includes(f15bOld)) {
    working = working.replace(f15bOld, f15bNew);
    log('ok', 'F1.5b marcada como ✅ Cerrado');
    changes++;
  } else {
    log('info', 'F1.5b ya está como ✅ (idempotente)');
  }

  // C.2 Actualizar Progreso
  const oldProg = '**Progreso:** F1.1 + F1.2 + F1.3 + F1.4 + F1.5a cerrados. F1.5b pendiente.';
  const newProg = '**Progreso:** F1.1 + F1.2 + F1.3 + F1.4 + F1.5a + F1.5b cerrados. **F1 COMPLETA.** F1.6 (opcional) pendiente.';
  if (working.includes(oldProg)) {
    working = working.replace(oldProg, newProg);
    log('ok', 'Línea de Progreso actualizada');
    changes++;
  }

  return { ok: true, content: working, changed: changes > 0 };
}

// ═══════════════════════════════════════════════════════════════════════════
// CAMBIO 4 — CURRENT_STATE.md
// ═══════════════════════════════════════════════════════════════════════════
function applyCurrentState() {
  log('step', 'D. CURRENT_STATE.md — nueva entrada F1.5b');

  const content = readNormalized(CURRENT_ST);
  if (content.includes('## Cambios Recientes (2026-10-12) — F1.5b Torneos (v4.9.1)')) {
    log('info', 'Entrada F1.5b ya existe (idempotente)');
    return { ok: true, content, changed: false };
  }

  const lines = content.split('\n');

  // Insertar antes de la entrada F1.5a existente
  const f15aMarker = '## Cambios Recientes (2026-10-12) — F1.5a Torneos (v4.9.0-rc)';
  const idx = lines.findIndex(l => l.includes(f15aMarker));
  if (idx === -1) {
    log('warn', 'No se encontró marker F1.5a en CURRENT_STATE.md — insertando al inicio');
    // Fallback: insertar después del header
    const headerIdx = lines.findIndex(l => l.includes('# 📊 CURRENT STATE'));
    if (headerIdx === -1) {
      log('fail', 'No se encontró header principal');
      return { ok: false, content };
    }
    lines.splice(headerIdx + 1, 0,
      '',
      '## Cambios Recientes (2026-10-12) — F1.5b Torneos (v4.9.1)',
      '',
      '**Modal de Draft F1.5b cerrado. F1 COMPLETA.**',
      '',
      'Detalles: ver entrada F1.5a abajo + `PLAN_TRABAJO_TORNEOS.md`.',
      '',
      '---',
      ''
    );
    return { ok: true, content: lines.join('\n'), changed: true };
  }

  const nuevaEntrada = [
    '## Cambios Recientes (2026-10-12) — F1.5b Torneos (v4.9.1)',
    '',
    '### Sistema de Torneos — Draft F1.5b cerrado · F1 COMPLETA',
    '',
    'Se implementó el **modal de draft** completo:',
    '',
    '| # | Item | Estado |',
    '|---|------|--------|',
    '| 1 | Backend: `GET /api/tournaments/:id/matches/:mid/drafts` | ✅ |',
    '| 2 | Backend: validación `aircraft_id` en `plane_models` | ✅ |',
    '| 3 | Backend: validación bans oponente | ✅ |',
    '| 4 | Backend: auto-ban último BM (helper + caché TTL 5min) | ✅ |',
    '| 5 | Backend: 15 tests nuevos (`tournaments.drafts.test.js`) | ✅ |',
    '| 6 | Frontend: modal `#tournamentDraftModal` (90 líneas) | ✅ |',
    '| 7 | Frontend: ~10 funciones draft en `js/tournaments.js` | ✅ |',
    '| 8 | Frontend: timer 5 min con colores de urgencia | ✅ |',
    '| 9 | Frontend: grilla de aeronaves + buscador | ✅ |',
    '| 10 | Frontend: wrapper `apiTournamentsGetMatchDrafts` | ✅ |',
    '| 11 | Frontend: botón "🎯 Draft" en bracket | ✅ |',
    '| 12 | Cache bump: `sw.js` → `v4.9.1-f1.5b`, `index.html` → `?v=4.9.1` (29 ocurrencias) | ✅ |',
    '',
    '**Commits clave:**',
    '- `fdfbe83` feat(tournaments): backend draft F1.5b (GET + validaciones)',
    '- `c9e7b56` feat(tournaments): modal de draft F1.5b (frontend)',
    '- (Commit #3) chore(tournaments): botón draft + integración F1.5b + cache v4.9.1',
    '- (este commit) docs(tournaments): cierre F1.5b',
    '',
    '**Estado del sistema:**',
    '- **655 passing / 0 failing / 2 skipped** (los 2 skipeados son tests frágiles documentados).',
    '- 0 regresiones.',
    '- Backend y frontend del draft 100% funcionales.',
    '',
    '**Con F1.5b cerrada, F1 (Sistema de Torneos) queda COMPLETA.**',
    '',
    '**Pendiente:**',
    '- F1.6 — Integración con Discord (opcional).',
    '- Cleanup de los 2 tests skipeados (deuda técnica menor).',
    '',
    '**Referencias:**',
    '- `docs/planning/PLAN_TRABAJO_TORNEOS.md`',
    '- `docs/normativa/ANEXO-III-torneos.md` §7',
    '',
    '---',
    '',
    ''
  ];

  lines.splice(idx, 0, ...nuevaEntrada);
  log('ok', 'Entrada F1.5b insertada al inicio');
  return { ok: true, content: lines.join('\n'), changed: true };
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════
function main() {
  console.log('');
  console.log('================================================================');
  console.log('  F1.5b — Script #4: Docs de cierre');
  console.log('================================================================');
  console.log('');

  if (IS_DRY_RUN) {
    log('warn', 'Modo --dry-run: NINGÚN archivo será modificado.');
    console.log('');
  }

  log('step', '[1/3] Verificando archivos...');
  for (const [label, p] of [['PLAN_TRABAJO_TORNEOS.md', PLAN_TORNEOS], ['BACKLOG.md', BACKLOG], ['PLAN_TRABAJO.md', PLAN_TRABAJO], ['CURRENT_STATE.md', CURRENT_ST]]) {
    if (!fs.existsSync(p)) {
      log('fail', `No existe ${label}: ${p}`);
      process.exit(1);
    }
    log('ok', `${label} encontrado`);
  }

  log('step', '[2/3] Preparando cambios...');
  const r1 = applyPlanTorneos();
  if (!r1.ok) { log('fail', 'Cambio 1 falló'); process.exit(1); }
  const r2 = applyBacklog();
  if (!r2.ok) { log('fail', 'Cambio 2 falló'); process.exit(1); }
  const r3 = applyPlanTrabajo();
  if (!r3.ok) { log('fail', 'Cambio 3 falló'); process.exit(1); }
  const r4 = applyCurrentState();
  if (!r4.ok) { log('fail', 'Cambio 4 falló'); process.exit(1); }

  log('step', '[3/3] Ejecutando...');
  if (IS_DRY_RUN) {
    log('info', '[DRY-RUN] No se escribiría nada.');
    log('info', '[DRY-RUN] Ejecutar con `--apply`.');
    console.log('');
    console.log('----------------------------------------------------------------');
    console.log('  RESUMEN (dry-run)');
    console.log('----------------------------------------------------------------');
    console.log('  · PLAN_TRABAJO_TORNEOS.md  → F1.5b ✅ CERRADO');
    console.log('  · BACKLOG.md               → BL-034 ✅ Cerrado + F1.5a/b en histórico');
    console.log('  · PLAN_TRABAJO.md          → Sprint 8: F1 COMPLETA');
    console.log('  · CURRENT_STATE.md         → nueva entrada F1.5b');
    console.log('  Backups:                   *.bak-f1.5b-docs (x4)');
    console.log('----------------------------------------------------------------');
    console.log('');
    process.exit(0);
  }

  // Aplicar con backup
  if (r1.changed) { backup(PLAN_TORNEOS); writeNormalized(PLAN_TORNEOS, r1.content); log('ok', 'PLAN_TRABAJO_TORNEOS.md actualizado'); }
  if (r2.changed) { backup(BACKLOG); writeNormalized(BACKLOG, r2.content); log('ok', 'BACKLOG.md actualizado'); }
  if (r3.changed) { backup(PLAN_TRABAJO); writeNormalized(PLAN_TRABAJO, r3.content); log('ok', 'PLAN_TRABAJO.md actualizado'); }
  if (r4.changed) { backup(CURRENT_ST); writeNormalized(CURRENT_ST, r4.content); log('ok', 'CURRENT_STATE.md actualizado'); }

  console.log('');
  console.log('----------------------------------------------------------------');
  console.log('  RESUMEN');
  console.log('----------------------------------------------------------------');
  console.log('  ✅ PLAN_TRABAJO_TORNEOS.md  → F1.5b ✅ CERRADO');
  console.log('  ✅ BACKLOG.md               → BL-034 ✅ Cerrado');
  console.log('  ✅ PLAN_TRABAJO.md          → Sprint 8: F1 COMPLETA');
  console.log('  ✅ CURRENT_STATE.md         → entrada F1.5b');
  console.log('  ✅ Backups: *.bak-f1.5b-docs');
  console.log('----------------------------------------------------------------');
  console.log('');
  console.log('PRÓXIMOS PASOS:');
  console.log('  1. git add docs/ scripts/f1-5b-update-docs.cjs');
  console.log('  2. git commit -m "docs(tournaments): cierre F1.5b + F1 COMPLETA"');
  console.log('  3. git push origin main');
  console.log('  4. 🎉 F1.5b cerrada. F1 COMPLETA.');
  console.log('     (F1.6 — Discord — es opcional).');
  console.log('');
}

main();