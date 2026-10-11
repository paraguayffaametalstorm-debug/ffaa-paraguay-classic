#!/usr/bin/env node
/**
 * close-fix-310.cjs
 * -----------------------------------------------------------------------------
 * Cierre documental de FIX-310 + FIX-310-bis.
 *
 * Cambios:
 *   - BACKLOG.md: mover FIX-310 a "Completados", agregar FIX-310-bis,
 *     registrar FIX-310-ter en Prioridad Media.
 *   - DEPLOYMENT_STATE.md: agregar la vista v_admin_participations.
 *
 * Uso:
 *   node scripts/close-fix-310.cjs --dry-run
 *   node scripts/close-fix-310.cjs
 * -----------------------------------------------------------------------------
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');
const ROOT    = path.resolve(__dirname, '..');
const FILES = {
  backlog:    path.join(ROOT, 'docs', 'planning', 'BACKLOG.md'),
  deployment: path.join(ROOT, 'docs', 'deployment', 'DEPLOYMENT_STATE.md'),
};

function ok(msg)   { console.log(`✓ ${msg}`); }
function info(msg) { console.log(`  ${msg}`); }
function abort(msg) {
  console.error(`\n✗ ABORTO: ${msg}\n`);
  process.exit(1);
}

console.log('═'.repeat(66));
console.log(`  CIERRE FIX-310 · BACKLOG + DEPLOYMENT — ${DRY_RUN ? '🔍 SIMULACIÓN' : '🚀 APLICAR'}`);
console.log('═'.repeat(66) + '\n');

for (const [k, p] of Object.entries(FILES)) {
  if (!fs.existsSync(p)) abort(`No existe ${k}: ${p}`);
}
ok('Los 2 archivos objetivo existen.\n');

// ============================================================================
// 1. BACKLOG.md
// ============================================================================

console.log('⚙ Procesando BACKLOG.md...\n');

const backlog = fs.readFileSync(FILES.backlog, 'utf8');
const lines = backlog.split('\n');

// Localizar FIX-310 en Prioridad Media
const fix310LineIdx = lines.findIndex(l =>
  l.includes('**FIX-310**') && l.includes('Migrar `loadAllPerformances()`')
);

if (fix310LineIdx === -1) {
  abort('No se encontró FIX-310 en BACKLOG.md.');
}

// Localizar la sección "Completados"
const completadosIdx = lines.findIndex(l => l.includes('## ✅ Completados'));
if (completadosIdx === -1) {
  abort('No se encontró la sección "Completados".');
}

// Localizar el separador |---|---|---|---|---| después del header de Completados
const separatorIdx = lines.findIndex((l, i) =>
  i > completadosIdx && /^\|[\s-:|]+\|$/.test(l.trim()) && l.includes('---')
);

if (separatorIdx === -1) {
  abort('No se encontró el separador de tabla en Completados.');
}

info(`FIX-310 en Prioridad Media: línea ${fix310LineIdx + 1}`);
info(`Sección Completados: línea ${completadosIdx + 1}`);
info(`Separador de tabla: línea ${separatorIdx + 1}\n`);

// ---------------------------------------------------------------------------
// Cambio 1: Reemplazar la línea de FIX-310 con FIX-310-ter
// ---------------------------------------------------------------------------

const FIX_310_TER_LINE = '| **FIX-310-ter** | 🏗️ | Refactorizar otros endpoints para usar `v_admin_participations` (export, dashboard) | 📋 Priorizado | S (2h) | La vista SQL `v_admin_participations` ya existe y resuelve `nick`/`role` desde `users`. Endpoints futuros deberían consumirla directamente en vez de replicar joins en JS. Ref: FIX-310-bis. |';

lines[fix310LineIdx] = FIX_310_TER_LINE;
ok('FIX-310 reemplazado por FIX-310-ter en Prioridad Media.');

// ---------------------------------------------------------------------------
// Cambio 2: Insertar FIX-310 y FIX-310-bis en Completados
// ---------------------------------------------------------------------------

const FIX_310_DONE = '| **FIX-310** | 🔧 | Endpoint v2 `/api/events-v2/admin/participations` (reemplaza legacy) | 2026-10-11 | `2e59c3b` |';
const FIX_310_BIS_DONE = '| **FIX-310-bis** | 🐛 | Resolver `nick`/`role` desde `users` + vista SQL `v_admin_participations` | 2026-10-11 | `d47e194` |';

// Insertar después del separador (que quedó en su posición original)
lines.splice(separatorIdx + 1, 0, FIX_310_DONE, FIX_310_BIS_DONE);
ok('FIX-310 y FIX-310-bis insertados en Completados.');

// ---------------------------------------------------------------------------
// Escribir BACKLOG.md
// ---------------------------------------------------------------------------

if (!DRY_RUN) {
  fs.writeFileSync(FILES.backlog + '.bak-closefix310', backlog, 'utf8');
  fs.writeFileSync(FILES.backlog, lines.join('\n'), 'utf8');
  ok('BACKLOG.md actualizado (backup: .bak-closefix310).\n');
} else {
  info('BACKLOG.md (dry-run, no se escribió).\n');
}

// ============================================================================
// 2. DEPLOYMENT_STATE.md
// ============================================================================

console.log('⚙ Procesando DEPLOYMENT_STATE.md...\n');

const deployment = fs.readFileSync(FILES.deployment, 'utf8');
const depLines = deployment.split('\n');

// Localizar la línea de event_participations en la tabla resumen
const evtPartIdx = depLines.findIndex(l => l.includes('`event_participations`'));
if (evtPartIdx === -1) {
  abort('No se encontró event_participations en DEPLOYMENT_STATE.md.');
}
info(`event_participations: línea ${evtPartIdx + 1}`);

// Insertar la vista justo después
const VIEW_LINE = '| **`v_admin_participations`** | **Vista (FIX-310-bis)** | **—** | ✅ **Documentada (2026-10-11)** |';

depLines.splice(evtPartIdx + 1, 0, VIEW_LINE);
ok('Vista v_admin_participations agregada a la tabla resumen.\n');

if (!DRY_RUN) {
  fs.writeFileSync(FILES.deployment + '.bak-closefix310', deployment, 'utf8');
  fs.writeFileSync(FILES.deployment, depLines.join('\n'), 'utf8');
  ok('DEPLOYMENT_STATE.md actualizado (backup: .bak-closefix310).\n');
} else {
  info('DEPLOYMENT_STATE.md (dry-run, no se escribió).\n');
}

// ============================================================================
// Verificación post
// ============================================================================

console.log('🧪 Verificación post:\n');

const finalBacklog = DRY_RUN ? lines.join('\n') : fs.readFileSync(FILES.backlog, 'utf8');
const finalDeploy  = DRY_RUN ? depLines.join('\n') : fs.readFileSync(FILES.deployment, 'utf8');

const checks = [
  ['BACKLOG: FIX-310-ter en Prioridad Media',
   finalBacklog.includes('**FIX-310-ter**')],
  ['BACKLOG: FIX-310 en Completados',
   finalBacklog.includes('**FIX-310**') && finalBacklog.includes('Endpoint v2 `/api/events-v2/admin/participations`')],
  ['BACKLOG: FIX-310-bis en Completados',
   finalBacklog.includes('**FIX-310-bis**')],
  ['BACKLOG: FIX-310 original (Migrar loadAllPerformances) ya NO está',
   !finalBacklog.includes('Migrar `loadAllPerformances()` de tabla legacy')],
  ['DEPLOYMENT: v_admin_participations documentada',
   finalDeploy.includes('`v_admin_participations`')],
];

let allOk = true;
for (const [label, result] of checks) {
  console.log(`   ${result ? '✓' : '✗'} ${label}`);
  if (!result) allOk = false;
}

if (!allOk) {
  console.error('\n⚠ Alguna verificación falló. Revisar antes de commitear.\n');
  process.exit(2);
}

console.log('\n✅ Cierre documental de FIX-310 aplicado.\n');
console.log('⚠ PRÓXIMOS PASOS MANUALES:');
console.log('   1. git diff --stat');
console.log('   2. Revisar diff: git diff docs/planning/BACKLOG.md');
console.log('   3. Commit:');
console.log('        git add docs/planning/BACKLOG.md docs/deployment/DEPLOYMENT_STATE.md');
console.log('        git commit -m "docs(backlog): cerrar FIX-310 + FIX-310-bis + registrar FIX-310-ter"');
console.log('   4. Push: git push origin main\n');