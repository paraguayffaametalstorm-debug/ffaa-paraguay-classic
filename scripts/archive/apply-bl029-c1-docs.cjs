/**
 * BL-029 · Commit #1 — Sincronizar CHANGELOG + SESSION_HANDOFF con BL-027/BL-028
 *
 * Uso:
 *   node scripts\apply-bl029-c1-docs.cjs
 *
 * Rollback:
 *   ren CHANGELOG.md.bak-bl029-c1 CHANGELOG.md
 *   ren docs\SESSION_HANDOFF.md.bak-bl029-c1 docs\SESSION_HANDOFF.md
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CHANGELOG = path.join(ROOT, 'CHANGELOG.md');
const HANDBOFF = path.join(ROOT, 'docs', 'SESSION_HANDOFF.md');

// ============================================================
// UTILIDADES
// ============================================================

function backup(file, suffix) {
  const bak = file + '.' + suffix;
  if (fs.existsSync(bak)) {
    console.log(`   [SKIP-BACKUP] Ya existe ${path.basename(bak)}`);
    return;
  }
  fs.copyFileSync(file, bak);
  console.log(`   [BACKUP] ${path.basename(bak)}`);
}

function readFileSafe(p) {
  if (!fs.existsSync(p)) {
    console.error(`   [ERROR] No existe: ${p}`);
    process.exit(1);
  }
  return fs.readFileSync(p, 'utf8');
}

function writeFileSafe(p, content) {
  fs.writeFileSync(p, content, 'utf8');
}

function check(src, needle, label) {
  const ok = src.includes(needle);
  console.log(`   ${ok ? '✅' : '❌'} ${label}`);
  return ok;
}

// ============================================================
// CHANGELOG — Insertar [4.7.2] después del bloque de higiene
// ============================================================

console.log('\n📄 [1/2] CHANGELOG.md');

let changelog = readFileSafe(CHANGELOG);

if (changelog.includes('## [4.7.2]')) {
  console.log('   [SKIP] Ya contiene [4.7.2]');
} else {
  backup(CHANGELOG, 'bak-bl029-c1');

  // Marcador: la línea de cierre del bloque de higiene es "---"
  // Buscamos el primer "---\n\n## [4.7.1]"
  const marker = '## [4.7.1] - 2026-10-10';
  const markerIdx = changelog.indexOf(marker);

  if (markerIdx === -1) {
    console.error('   [ERROR] No se encontró el marcador "## [4.7.1] - 2026-10-10"');
    process.exit(1);
  }

  const newEntry = `## [4.7.2] - 2026-10-10

### 🧹 Sprint 4 — Housekeeping (BL-027 + BL-028)

#### BL-027 — Eliminar \`savePerformance()\` muerta de \`js/api.js\`

La versión duplicada de \`savePerformance()\` en \`js/api.js\` era **código muerto**:
- No se exportaba a \`window\`.
- La versión viva está en \`js/performance.js\` (línea 738: \`window.savePerformance = savePerformance;\`).
- Además usaba endpoints **inexistentes o legacy**:
  - \`POST /api/performances\` (legacy, escribe en tabla \`performances\`).
  - \`POST /api/admin/performances\` (endpoint inexistente, 404).

**Acción:** eliminada. Reemplazada por un comentario explicativo.

- **Archivos:** \`js/api.js\`.
- **Commit:** \`588b4e8\`.

#### BL-028 — Crear \`GET /api/events-v2/mine\`

Endpoint para que un piloto autenticado consulte **su propio historial de participaciones**
desde el modelo unificado \`event_participations\` + \`events_master\`.

**Características:**
- Autenticado (\`requireAuth\`).
- Filtros opcionales: \`?limit=N&type=SQUADRON&status=CLOSED\`.
- Payload **retrocompatible** con el legacy \`/api/performances/my-history\`:
  incluye \`event_id\`, \`tokens\`, \`days_connected\`, \`flew_in_group\`, \`notes\`, \`status\`, \`created_at\`.
- Campos nuevos: \`event_name\`, \`event_type\`, \`event_status\`, \`event_start_date\`, \`event_end_date\`, \`perf_status\` (semáforo militar, solo SQ).
- Resolución tipada del caller: acepta UUID (\`req.user.id\`) o INTEGER (\`req.user.user_id\`).

**Uso previsto:** reemplaza funcionalmente a \`/api/performances/history\` y \`/api/performances/my-history\` (que serán deprecados en FIX-401).

- **Archivos:** \`src/controllers/events-v2.controller.js\`, \`src/routes/events-v2.routes.js\`.
- **Commit:** \`3413ef3\`.

---

`;

  changelog = changelog.slice(0, markerIdx) + newEntry + changelog.slice(markerIdx);
  writeFileSafe(CHANGELOG, changelog);
  console.log('   ✅ [4.7.2] insertada antes de [4.7.1]');
}

// ============================================================
// SESSION_HANDOFF — Actualizar HEAD, versión y Sprint 4
// ============================================================

console.log('\n📄 [2/2] docs/SESSION_HANDOFF.md');

let handoff = readFileSafe(HANDBOFF);
let modified = false;

// --- Cambio 1: HEAD en el header (actualizado) ---
const headerOld = '> **Actualizado:** 2026-10-10 (post-F6/F7 + Sprint 4 en curso)';
const headerNew = '> **Actualizado:** 2026-10-10 (Sprint 4: BL-027 + BL-028 cerrados)';
if (handoff.includes(headerOld) && !handoff.includes(headerNew)) {
  handoff = handoff.replace(headerOld, headerNew);
  modified = true;
  console.log('   ✅ Header actualizado');
}

// --- Cambio 2: Commit HEAD en sección 2 ---
const headOld = '| **Commit HEAD** | `984c54e` |';
const headNew = '| **Commit HEAD** | `3413ef3` |';
if (handoff.includes(headOld)) {
  handoff = handoff.replace(headOld, headNew);
  modified = true;
  console.log('   ✅ Commit HEAD → 3413ef3');
}

// --- Cambio 3: Añadir BL-027/BL-028 a la tabla del Sprint 4 (sección 6) ---
// Los insertamos justo después de la fila de F4.5
const f45Row = '| **F4.5** | Ejecutar DROP de tablas BM legacy | XS | ✅ Cerrado |';
const newRows = f45Row + '\n| **BL-027** | Eliminar `savePerformance` muerta de `js/api.js` | S | ✅ Cerrado (`588b4e8`) |\n| **BL-028** | Crear `GET /api/events-v2/mine` | M | ✅ Cerrado (`3413ef3`) |';

if (handoff.includes(f45Row) && !handoff.includes('BL-027')) {
  handoff = handoff.replace(f45Row, newRows);
  modified = true;
  console.log('   ✅ BL-027 + BL-028 agregados al Sprint 4');
}

// --- Cambio 4: Próximo paso ---
const nextOld = '**Próximo paso:** F4.5 (DROP BM legacy) · BL-027 (migrar frontend legacy) · BL-025 (tests)';
const nextNew = '**Próximo paso:** BL-029 (migrar frontend legacy a v2) · BL-025 (tests) · BL-024 (CSP)';
if (handoff.includes(nextOld)) {
  handoff = handoff.replace(nextOld, nextNew);
  modified = true;
  console.log('   ✅ Próximo paso actualizado');
}

if (modified) {
  backup(HANDBOFF, 'bak-bl029-c1');
  writeFileSafe(HANDBOFF, handoff);
} else {
  console.log('   [SKIP] Sin cambios aplicables (¿ya estaba actualizado?)');
}

// ============================================================
// VERIFICACIÓN
// ============================================================

console.log('\n🔍 Verificando cambios...');

const changelogFinal = readFileSafe(CHANGELOG);
const handoffFinal = readFileSafe(HANDBOFF);

const checks = [
  [changelogFinal.includes('## [4.7.2] - 2026-10-10'), 'CHANGELOG: [4.7.2] presente'],
  [changelogFinal.includes('BL-027'), 'CHANGELOG: BL-027 mencionado'],
  [changelogFinal.includes('BL-028'), 'CHANGELOG: BL-028 mencionado'],
  [changelogFinal.includes('## [4.7.1]'), 'CHANGELOG: [4.7.1] preservado'],
  [handoffFinal.includes('3413ef3'), 'HANDOFF: HEAD = 3413ef3'],
  [handoffFinal.includes('BL-027'), 'HANDOFF: BL-027 mencionado'],
  [handoffFinal.includes('BL-028'), 'HANDOFF: BL-028 mencionado'],
  [handoffFinal.includes('BL-029'), 'HANDOFF: próximo paso = BL-029'],
];

let allOk = true;
for (const [ok, label] of checks) {
  console.log(`   ${ok ? '✅' : '❌'} ${label}`);
  if (!ok) allOk = false;
}

console.log('\n═══════════════════════════════════════════════════════════════');
if (allOk) {
  console.log('  ✅ COMMIT #1 LISTO — 8 checks OK');
  console.log('');
  console.log('  Próximos pasos:');
  console.log('    1. git diff CHANGELOG.md docs/SESSION_HANDOFF.md');
  console.log('    2. git add CHANGELOG.md docs/SESSION_HANDOFF.md scripts/apply-bl029-c1-docs.cjs');
  console.log('    3. git commit -m "docs(sprint-4): sincronizar CHANGELOG + SESSION_HANDOFF con BL-027/BL-028"');
  console.log('    4. git push origin main');
  console.log('');
  console.log('  Rollback:');
  console.log('    ren CHANGELOG.md.bak-bl029-c1 CHANGELOG.md');
  console.log('    ren docs\\SESSION_HANDOFF.md.bak-bl029-c1 docs\\SESSION_HANDOFF.md');
} else {
  console.log('  ❌ FALTAN CHECKS — revisar antes de commitear');
}
console.log('═══════════════════════════════════════════════════════════════\n');