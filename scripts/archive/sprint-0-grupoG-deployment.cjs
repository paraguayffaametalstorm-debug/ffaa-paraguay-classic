#!/usr/bin/env node
/**
 * sprint-0-grupoG-deployment.cjs
 * -----------------------------------------------------------------------------
 * Sprint 0 — Grupo G — FIX-025 sobre DEPLOYMENT_STATE.md
 *
 * Problema: el doc no refleja que las 4 tablas BM legacy están pendientes
 * de DROP (F4.5). El handoff pedía "confirmar si se ejecutó 032".
 *
 * Solución (mejores prácticas):
 *  1. Separar las 4 filas `bm_*` de la tabla consolidada de tablas activas
 *     (mezclar legacy con activo confunde).
 *  2. Agregar sub-sección "Tablas Legacy — DROP Planificado" con su propia
 *     tabla y notas.
 *  3. Agregar entrada F4.5 en §7 "Tareas Pendientes".
 *
 * NO se toca la línea 598 (describe FKs técnicas, sigue válida hasta el DROP).
 *
 * Reglas (Grupo F):
 *  - EOL mixto: regex \r?\n SIEMPRE (DEPLOYMENT_STATE.md es CRLF puro, pero
 *    por consistencia con la lección del Grupo F).
 *  - Backup timestamped con Set interno (idempotente).
 *  - Aborto TOTAL si algún ítem falla.
 *  - NO commitear desde el script.
 * -----------------------------------------------------------------------------
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const ROOT       = path.resolve(__dirname, '..');
const TARGET     = path.join(ROOT, 'DEPLOYMENT_STATE.md');
const BACKUP_SET = new Set();

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

function timestamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function detectEol(content) {
  const crlf = (content.match(/\r\n/g) || []).length;
  const lf   = (content.match(/(?<!\r)\n/g) || []).length;
  return { dominant: crlf > lf ? '\r\n' : '\n', crlf, lf };
}

function abort(msg) {
  console.error(`\n❌ ABORTO: ${msg}`);
  console.error('   No se escribió ningún archivo.');
  process.exit(1);
}

function ok(msg)  { console.log(`✓ ${msg}`); }
function info(msg){ console.log(`  ${msg}`); }

// ---------------------------------------------------------------------------
// Lectura
// ---------------------------------------------------------------------------

if (!fs.existsSync(TARGET)) abort(`No existe: ${TARGET}`);

const original = fs.readFileSync(TARGET, 'utf8');
const eolInfo  = detectEol(original);
const eol      = eolInfo.dominant;

console.log(`\n📄 DEPLOYMENT_STATE.md — ${original.length} bytes`);
console.log(`   EOL: ${eolInfo.crlf} CRLF + ${eolInfo.lf} LF (dominante: ${eol === '\r\n' ? 'CRLF' : 'LF'})\n`);

// ---------------------------------------------------------------------------
// Cambio 1 — Quitar las 4 filas BM legacy de la tabla consolidada
// ---------------------------------------------------------------------------

const bloque1_old_raw = [
  '| `bm_events` | Black Market | 0 | ✅ Documentada |',
  '| `bm_missions` | Black Market | 0 | ✅ Documentada |',
  '| `bm_progress` | Black Market | 0 | ✅ Documentada |',
  '| `bm_discounts` | Black Market | 0 | ✅ Documentada |',
].join('\r\n') + '\r\n';

const bloque1_new = ''; // se elimina completo

// ---------------------------------------------------------------------------
// Cambio 2 — Nueva sub-sección legacy insertada después de la tabla consolidada
// ---------------------------------------------------------------------------

// Ancla: la línea `| user_settings | Configuración | 0 | ✅ Documentada |`
// seguida de una línea vacía. Insertamos justo después.

const bloque2_anchor = '| `user_settings` | Configuración | 0 | ✅ Documentada |';

const bloque2_new_raw = [
  '',
  '#### 🗑️ Tablas Legacy — DROP Planificado',
  '',
  'Las siguientes tablas son **legacy** del módulo Black Market pre-rediseño (F4.x).',
  'Están **vacías (0 filas)** y su DROP está planificado para **post-2026-09-26**',
  '(7 días de gracia post-deploy F4.4 v4.3.0), según ADR-006.',
  '',
  '| Tabla | Origen | Filas | Estado |',
  '|---|---|---|---|',
  '| `bm_events` | Black Market legacy | 0 | 🗑️ DROP pendiente |',
  '| `bm_missions` | Black Market legacy | 0 | 🗑️ DROP pendiente |',
  '| `bm_progress` | Black Market legacy | 0 | 🗑️ DROP pendiente |',
  '| `bm_discounts` | Black Market legacy | 0 | 🗑️ DROP pendiente |',
  '',
  '> **Script de DROP:** `sql/032_drop_bm_legacy_tables.sql`',
  '> **Referencia:** ADR-006, fases F4.2.2-A a F4.2.2-G',
  '> **Rollback:** No aplica — las tablas pueden recrearse desde `sql/019-022_*.sql` (aunque su contenido está vacío).',
  '',
].join('\r\n');

// ---------------------------------------------------------------------------
// Cambio 3 — Entrada F4.5 en §7 "Tareas Pendientes"
// ---------------------------------------------------------------------------

// Ancla: la línea del fix planificado del bug de UI.
const bloque3_anchor = 'asegurando que el botón `btnChangePasswordSubmit` ("Actualizar Credencial") mantenga visibilidad sticky en dispositivos móviles y resoluciones compactas.';

const bloque3_new_raw = [
  bloque3_anchor,
  '',
  '### 🗑️ F4.5 — DROP tablas BM legacy',
  '',
  '- **Descripción:** Eliminar las 4 tablas legacy del Black Market (`bm_events`, `bm_missions`, `bm_progress`, `bm_discounts`), ahora que el módulo BM opera 100% sobre `events_master` + `event_participations`.',
  '- **Script:** `sql/032_drop_bm_legacy_tables.sql`.',
  '- **Fecha:** post-2026-09-26 (7 días de gracia post-deploy F4.4).',
  '- **Estado:** ⏳ Pendiente.',
  '- **Referencia:** ADR-006, F4.2.2-G.',
].join('\r\n');

// ---------------------------------------------------------------------------
// ASSERTS
// ---------------------------------------------------------------------------

console.log('🔎 Verificando precondiciones...\n');

// Cambio 1
if (!original.includes(bloque1_old_raw)) {
  abort('Cambio 1: no matchea el bloque de 4 filas BM legacy.');
}
if (original.includes('Tablas Legacy — DROP Planificado')) {
  abort('Cambio 2: la sección "Tablas Legacy" ya existe. ¿Ya aplicado?');
}
ok('Cambio 1: bloque de 4 filas BM legacy encontrado.');

// Cambio 2
if (!original.includes(bloque2_anchor)) {
  abort('Cambio 2: no matchea la línea `| user_settings | Configuración | 0 | ✅ Documentada |`.');
}
ok('Cambio 2: ancla "user_settings" encontrada.');

// Cambio 3
if (!original.includes(bloque3_anchor)) {
  abort('Cambio 3: no matchea el ancla "btnChangePasswordSubmit".');
}
if (original.includes('F4.5 — DROP tablas BM legacy')) {
  abort('Cambio 3: la entrada F4.5 ya existe. ¿Ya aplicado?');
}
ok('Cambio 3: ancla "btnChangePasswordSubmit" encontrada.');

// ---------------------------------------------------------------------------
// Backup
// ---------------------------------------------------------------------------

console.log('\n💾 Generando backup...\n');

const backupPath = `${TARGET}.bak-${timestamp()}`;
if (BACKUP_SET.has(backupPath)) {
  info(`Backup ya generado: ${path.basename(backupPath)}`);
} else {
  fs.writeFileSync(backupPath, original, 'utf8');
  BACKUP_SET.add(backupPath);
  ok(`Backup: ${path.basename(backupPath)}`);
}

// ---------------------------------------------------------------------------
// Aplicar
// ---------------------------------------------------------------------------

console.log('\n🔧 Aplicando fixes...\n');

let result = original;

// Cambio 1: quitar las 4 filas BM legacy de la tabla consolidada
const before1 = result;
result = result.replace(bloque1_old_raw, bloque1_new);
if (result === before1) abort('Cambio 1: replace no tuvo efecto.');
ok('Cambio 1: 4 filas BM legacy removidas de la tabla consolidada.');

// Cambio 2: insertar sub-sección legacy después de user_settings
// Reemplazamos la línea de user_settings por ella misma + bloque nuevo
const before2 = result;
result = result.replace(bloque2_anchor, bloque2_anchor + '\r\n' + bloque2_new_raw);
if (result === before2) abort('Cambio 2: replace no tuvo efecto.');
ok('Cambio 2: sub-sección "Tablas Legacy — DROP Planificado" insertada.');

// Cambio 3: agregar F4.5 en Tareas Pendientes
const before3 = result;
result = result.replace(bloque3_anchor, bloque3_new_raw);
if (result === before3) abort('Cambio 3: replace no tuvo efecto.');
ok('Cambio 3: entrada F4.5 agregada en §7 Tareas Pendientes.');

// ---------------------------------------------------------------------------
// Escribir
// ---------------------------------------------------------------------------

console.log('\n✍️  Escribiendo DEPLOYMENT_STATE.md...\n');
fs.writeFileSync(TARGET, result, 'utf8');
ok(`DEPLOYMENT_STATE.md escrito (${result.length} bytes, delta ${result.length - original.length > 0 ? '+' : ''}${result.length - original.length}).`);

// ---------------------------------------------------------------------------
// Verificación post
// ---------------------------------------------------------------------------

console.log('\n🧪 Verificación post:\n');

const final = fs.readFileSync(TARGET, 'utf8');

const c1_ok = !final.includes('| `bm_events` | Black Market | 0 | ✅ Documentada |');
const c2_ok = final.includes('Tablas Legacy — DROP Planificado')
           && final.includes('| `bm_events` | Black Market legacy | 0 | 🗑️ DROP pendiente |')
           && final.includes('sql/032_drop_bm_legacy_tables.sql');
const c3_ok = final.includes('F4.5 — DROP tablas BM legacy')
           && final.includes('post-2026-09-26');

console.log(`   Cambio 1 (quitar BM de tabla consolidada): ${c1_ok ? '✓ OK' : '✗ FALLÓ'}`);
console.log(`   Cambio 2 (sub-sección legacy):             ${c2_ok ? '✓ OK' : '✗ FALLÓ'}`);
console.log(`   Cambio 3 (F4.5 en Tareas Pendientes):      ${c3_ok ? '✓ OK' : '✗ FALLÓ'}`);

if (!c1_ok || !c2_ok || !c3_ok) {
  console.error('\n⚠️  Alguna verificación post falló.');
  process.exit(2);
}

// ---------------------------------------------------------------------------
// Cierre
// ---------------------------------------------------------------------------

console.log('\n✅ FIX-025 aplicado en DEPLOYMENT_STATE.md.\n');
console.log('⚠️  PRÓXIMOS PASOS MANUALES:');
console.log('   1. git diff DEPLOYMENT_STATE.md');
console.log('   2. git add DEPLOYMENT_STATE.md');
console.log('   3. git commit -m "docs(sprint-0-grupoG): DEPLOYMENT_STATE sección legacy BM + F4.5 pendiente (FIX-025)"');
console.log('   4. git push origin main');
console.log('   5. git add scripts/sprint-0-grupoG-deployment.cjs');
console.log('   6. git commit -m "chore(sprint-0-grupoG): versionar script DEPLOYMENT_STATE (FIX-025)"');
console.log('   7. git push origin main');
console.log('');