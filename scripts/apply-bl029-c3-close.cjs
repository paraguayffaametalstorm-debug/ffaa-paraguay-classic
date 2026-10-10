/**
 * BL-029 · Cierre — SESSION_HANDOFF + BACKLOG + CHANGELOG
 *
 * Cambios:
 *   1. docs/SESSION_HANDOFF.md: BL-027/BL-028/BL-029 → ✅ Cerrado + HEAD → f001224
 *   2. BACKLOG.md: registrar FIX-310
 *   3. CHANGELOG.md: agregar [4.7.3] con BL-029
 *
 * Uso:
 *   node scripts\apply-bl029-c3-close.cjs
 *
 * Rollback:
 *   ren docs\SESSION_HANDOFF.md.bak-bl029-c3 docs\SESSION_HANDOFF.md
 *   ren BACKLOG.md.bak-bl029-c3 BACKLOG.md
 *   ren CHANGELOG.md.bak-bl029-c3 CHANGELOG.md
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const HANDOFF = path.join(ROOT, 'docs', 'SESSION_HANDOFF.md');
const BACKLOG = path.join(ROOT, 'BACKLOG.md');
const CHANGELOG = path.join(ROOT, 'CHANGELOG.md');

function backup(file) {
  const bak = file + '.bak-bl029-c3';
  if (!fs.existsSync(bak)) {
    fs.copyFileSync(file, bak);
    console.log(`   💾 Backup: ${path.basename(bak)}`);
  }
}

function read(p) {
  if (!fs.existsSync(p)) { console.error('❌ No existe:', p); process.exit(1); }
  return fs.readFileSync(p, 'utf8');
}

// ═══════════════════════════════════════════════════════════════
// 1) SESSION_HANDOFF.md
// ═══════════════════════════════════════════════════════════════
console.log('\n📄 [1/3] docs/SESSION_HANDOFF.md');
let handoff = read(HANDOFF);
let handoffMods = 0;

// 1a — Header: Última sesión + Próximo paso
const headerOld = `> **Última sesión:** Sprint 4 — Housekeeping (F4.0a + F4.0b)
> **Próximo paso:** BL-029 (migrar frontend legacy a v2) · BL-025 (tests) · BL-024 (CSP)`;
const headerNew = `> **Última sesión:** Sprint 4 — Housekeeping (F4.0a/b/c + F4.5 + BL-027 + BL-028 + BL-029)
> **Próximo paso:** BL-025 (tests) · BL-024 (CSP) · FIX-310 (loadAllPerformances)`;
if (handoff.includes(headerOld)) {
  handoff = handoff.replace(headerOld, headerNew);
  handoffMods++;
  console.log('   ✅ Header actualizado');
}

// 1b — Commit HEAD → f001224 (2 ocurrencias: tabla sección 2 + footer)
const headOld = '`3413ef3`';
const headOldFooter = 'Commit 984c54e**';
const headNewFooter = 'Commit f001224**';
let headCount = 0;
handoff = handoff.replace(/`3413ef3`/g, (match) => { headCount++; return '`f001224`'; });
if (headCount > 0) { handoffMods++; console.log(`   ✅ HEAD: ${headCount} ocurrencia(s) → f001224`); }
if (handoff.includes(headOldFooter)) {
  handoff = handoff.replace(headOldFooter, headNewFooter);
  handoffMods++;
  console.log('   ✅ Footer → f001224');
}

// 1c — Sección 6: filas BL-027/028/029 con ✅ Cerrado
const row027Old = '| **BL-027** | Eliminar `savePerformance` muerta de `js/api.js` | S | ⏳ Pendiente |';
const row027New = '| **BL-027** | Eliminar `savePerformance` muerta de `js/api.js` | S | ✅ Cerrado (`588b4e8`) |';
if (handoff.includes(row027Old)) {
  handoff = handoff.replace(row027Old, row027New);
  handoffMods++;
  console.log('   ✅ BL-027 → ✅ Cerrado');
}

const row028Old = '| **BL-028** | Crear `GET /api/events-v2/mine` | M | ⏳ Pendiente |';
const row028New = '| **BL-028** | Crear `GET /api/events-v2/mine` | M | ✅ Cerrado (`3413ef3`) |';
if (handoff.includes(row028Old)) {
  handoff = handoff.replace(row028Old, row028New);
  handoffMods++;
  console.log('   ✅ BL-028 → ✅ Cerrado');
}

const row029Old = '| **BL-029** | Migrar `js/views.js` a v2 (history/my-history) | M | ⏳ Pendiente |';
const row029New = '| **BL-029** | Migrar `js/views.js` a v2 (history/my-history) | M | ✅ Cerrado (`f001224`) |';
if (handoff.includes(row029Old)) {
  handoff = handoff.replace(row029Old, row029New);
  handoffMods++;
  console.log('   ✅ BL-029 → ✅ Cerrado');
}

// 1d — Sección 2: agregar filas BL-029 al estado
const sprintRowOld = '| **BL-027 + BL-028** | ✅ Cerrados |';
const sprintRowNew = '| **BL-027 + BL-028 + BL-029** | ✅ Cerrados |';
if (handoff.includes(sprintRowOld)) {
  handoff = handoff.replace(sprintRowOld, sprintRowNew);
  handoffMods++;
  console.log('   ✅ Sección 2: BL-027/028/029 todos cerrados');
}

// 1e — Agregar FIX-310 a la tabla del Sprint 4
const after029 = row029New;
const fix310Row = '| **FIX-310** | `loadAllPerformances()` usa endpoint roto `/api/admin/all-performances` | S | ⏳ Pendiente |';
if (!handoff.includes('FIX-310')) {
  handoff = handoff.replace(after029, after029 + '\n' + fix310Row);
  handoffMods++;
  console.log('   ✅ FIX-310 agregado al Sprint 4');
}

if (handoffMods > 0) {
  backup(HANDOFF);
  fs.writeFileSync(HANDOFF, handoff, 'utf8');
  console.log(`   📝 ${handoffMods} modificación(es) aplicadas`);
} else {
  console.log('   [SKIP] SESSION_HANDOFF sin cambios aplicables');
}

// ═══════════════════════════════════════════════════════════════
// 2) BACKLOG.md — Registrar FIX-310
// ═══════════════════════════════════════════════════════════════
console.log('\n📄 [2/3] BACKLOG.md');
let backlog = read(BACKLOG);

if (backlog.includes('FIX-310')) {
  console.log('   [SKIP] FIX-310 ya existe');
} else {
  // Insertar en la tabla de "Prioridad Media (Should Have)"
  const anchor = '| **BL-025** | 🧪 | Re-implementar tests';
  const idxAnchor = backlog.indexOf(anchor);
  if (idxAnchor === -1) {
    console.log('   [WARN] No se encontró ancla BL-025. Insertando al final del backlog.');
    backlog += `\n\n## 14. FIX-310 — loadAllPerformances() roto\n\n**Fecha:** 2026-10-10\n**Severidad:** MEDIA\n\n\`js/views.js\` (\`loadAllPerformances\`) usa el endpoint \`/api/admin/all-performances\`, que no existe en el backend. Cae al fallback \`/api/performances/my-history\` (legacy, solo del piloto autenticado).\n\n**Impacto:** la vista "Todos los Rendimientos" solo muestra las participaciones del admin/owner logueado, no las del escuadrón completo.\n\n**Solución propuesta:** crear endpoint v2 \`GET /api/events-v2/admin/participations\` que devuelva TODAS las participaciones con \`nick\` + \`role\`.\n\n**Referencia:** BL-029 (dejado fuera de alcance).\n`;
  } else {
    // Encontrar el fin de la fila de BL-025
    const lineEnd = backlog.indexOf('\n', idxAnchor);
    const fix310Block = '\n| **FIX-310** | 🔧 | `loadAllPerformances()` usa endpoint roto `/api/admin/all-performances` | 📋 Priorizado | S (4h) | Crear endpoint v2 `GET /api/events-v2/admin/participations` que devuelva TODAS las participaciones con `nick` + `role`. Dejado fuera de BL-029. Ref: `js/views.js` línea ~6708. |';
    backlog = backlog.slice(0, lineEnd) + fix310Block + backlog.slice(lineEnd);
  }
  backup(BACKLOG);
  fs.writeFileSync(BACKLOG, backlog, 'utf8');
  console.log('   ✅ FIX-310 registrado en el backlog');
}

// ═══════════════════════════════════════════════════════════════
// 3) CHANGELOG.md — Agregar [4.7.3]
// ═══════════════════════════════════════════════════════════════
console.log('\n📄 [3/3] CHANGELOG.md');
let changelog = read(CHANGELOG);

if (changelog.includes('## [4.7.3]')) {
  console.log('   [SKIP] [4.7.3] ya existe');
} else {
  const marker = '## [4.7.2] - 2026-10-10';
  const idx = changelog.indexOf(marker);
  if (idx === -1) {
    console.error('   ❌ No se encontró [4.7.2]');
    process.exit(1);
  }

  const newEntry = `## [4.7.3] - 2026-10-10

### 🚀 Sprint 4 — BL-029: Migración del frontend legacy a events-v2

Migración de las llamadas legacy a \`/api/performances/*\` (que leen de la tabla
\`performances\`) hacia el endpoint unificado \`/api/events-v2/mine\` (BL-028).

#### Cambios aplicados

**\`js/api.js\`**
- Nueva función \`apiEventsV2Mine({ limit, type, status })\` como wrapper del endpoint \`GET /api/events-v2/mine\`.
- Expuesta globalmente: \`window.apiEventsV2Mine\`.

**\`js/views.js\`**
- \`loadDashboardData()\`: migrado de \`/api/performances/history\` → \`apiEventsV2Mine({ limit: 10 })\`.
- \`loadHistorial()\`: migrado de \`/api/performances/my-history\` → \`apiEventsV2Mine()\`.
- **NO se tocó** \`loadAllPerformances()\` (línea ~6708): queda con el legacy hasta crear FIX-310.
- **NO se tocó** \`loadActiveMembers()\` (línea 1115): endpoint \`/api/performances/pilots\` sigue activo.

**\`sw.js\`**
- Bump \`CACHE_NAME\` de \`v4.7.3\` → \`v4.7.4\` (invalida caché del navegador).

#### Verificación en producción

- ✅ \`GET /api/events-v2/mine\` → **200 OK** con 26 participaciones (retrocompatible).
- ✅ \`loadDashboardData()\` → gráfico de tendencia OK.
- ✅ \`loadHistorial()\` → historial completo OK.
- ✅ \`window.apiEventsV2Mine\` disponible en el frontend.
- ✅ Legacy (\`/api/performances/my-history\`) sigue devolviendo 23 registros (deprecado en FIX-401).

#### Backlog

- **FIX-310** registrado: \`loadAllPerformances()\` usa endpoint roto \`/api/admin/all-performances\`.

- **Archivos:** \`js/api.js\`, \`js/views.js\`, \`sw.js\`.
- **Commit:** \`f001224\`.

---

`;

  changelog = changelog.slice(0, idx) + newEntry + changelog.slice(idx);
  backup(CHANGELOG);
  fs.writeFileSync(CHANGELOG, changelog, 'utf8');
  console.log('   ✅ [4.7.3] insertado antes de [4.7.2]');
}

// ═══════════════════════════════════════════════════════════════
// Verificación final
// ═══════════════════════════════════════════════════════════════
console.log('\n🔍 Verificando cambios...');

const hFinal = read(HANDOFF);
const bFinal = read(BACKLOG);
const cFinal = read(CHANGELOG);

const checks = [
  [hFinal.includes('BL-029') && hFinal.includes('✅ Cerrado (`f001224`)'), 'HANDOFF: BL-029 cerrado'],
  [hFinal.includes('f001224'), 'HANDOFF: HEAD actualizado'],
  [hFinal.includes('FIX-310'), 'HANDOFF: FIX-310 agregado'],
  [bFinal.includes('FIX-310'), 'BACKLOG: FIX-310 registrado'],
  [cFinal.includes('## [4.7.3]'), 'CHANGELOG: [4.7.3] presente'],
  [cFinal.includes('## [4.7.2]'), 'CHANGELOG: [4.7.2] preservado'],
  [cFinal.includes('apiEventsV2Mine'), 'CHANGELOG: BL-029 documentado'],
];

let allOk = true;
for (const [ok, label] of checks) {
  console.log(`   ${ok ? '✅' : '❌'} ${label}`);
  if (!ok) allOk = false;
}

console.log('\n═══════════════════════════════════════════════════════════════');
if (allOk) {
  console.log('  ✅ CIERRE BL-029 LISTO — 7 checks OK');
  console.log('');
  console.log('  Próximos pasos:');
  console.log('    1. git diff docs/SESSION_HANDOFF.md BACKLOG.md CHANGELOG.md');
  console.log('    2. git add docs/SESSION_HANDOFF.md BACKLOG.md CHANGELOG.md scripts/apply-bl029-c3-close.cjs');
  console.log('    3. git commit -m "docs(sprint-4): cerrar BL-029 + registrar FIX-310"');
  console.log('    4. git push origin main');
  console.log('');
  console.log('  Rollback:');
  console.log('    ren docs\\SESSION_HANDOFF.md.bak-bl029-c3 docs\\SESSION_HANDOFF.md');
  console.log('    ren BACKLOG.md.bak-bl029-c3 BACKLOG.md');
  console.log('    ren CHANGELOG.md.bak-bl029-c3 CHANGELOG.md');
} else {
  console.log('  ❌ FALTAN CHECKS');
}
console.log('═══════════════════════════════════════════════════════════════\n');