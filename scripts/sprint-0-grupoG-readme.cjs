#!/usr/bin/env node
/**
 * sprint-0-grupoG-readme.cjs  (v2 — regex agnóstico al EOL)
 * -----------------------------------------------------------------------------
 * Sprint 0 — Grupo G — FIX-002, FIX-023, FIX-024 sobre README.md
 *
 * Reglas (aprendidas del Grupo F):
 *  - EOL mixto: usar regex \r?\n SIEMPRE, no construir bloques con eol fijo.
 *  - Backup timestamped con Set interno (idempotente).
 *  - Aborto TOTAL si algún ítem falla. No hay escritura parcial.
 *  - NO commitear desde el script. El OWNER revisa el diff.
 *
 * FIX-002 (ALTA): árbol lista 2 SQL, hay 35.
 * FIX-023 (BAJA): link "Resumen Ejecutivo" no apunta al ancla de la sección.
 * FIX-024 (BAJA): eliminar mención a metadata.json (legacy AI Studio).
 * -----------------------------------------------------------------------------
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Configuración
// ---------------------------------------------------------------------------

const ROOT       = path.resolve(__dirname, '..');
const TARGET     = path.join(ROOT, 'README.md');
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

if (!fs.existsSync(TARGET)) abort(`No existe el archivo: ${TARGET}`);

const original = fs.readFileSync(TARGET, 'utf8');
const eolInfo  = detectEol(original);

console.log(`\n📄 README.md — ${original.length} bytes`);
console.log(`   EOL: ${eolInfo.crlf} CRLF + ${eolInfo.lf} LF (dominante: ${eolInfo.dominant === '\r\n' ? 'CRLF' : 'LF'})\n`);

// ---------------------------------------------------------------------------
// FIX-002 — Árbol SQL: reemplazo con regex agnóstico al EOL
// ---------------------------------------------------------------------------

// Bloque legacy real (LF puro confirmado en líneas 142-144):
//   ├── sql/
//   │   ├── upgrades_2_0.sql          # Migración DDL para sistemas Upgrades 2.0
//   │   └── password_resets.sql       # Migración DDL para tabla de reset de contraseña

const fix002_regex =
  /├── sql\/\r?\n│   ├── upgrades_2_0\.sql\s+# Migración DDL para sistemas Upgrades 2\.0\r?\n│   └── password_resets\.sql\s+# Migración DDL para tabla de reset de contraseña/;

// Bloque nuevo (con LF; el archivo se escribe tal cual)
const fix002_new =
  `├── sql/                          # 35 migraciones DDL (000_* a 034_*)\n` +
  `│   │                             # → ver MIGRACION_SQL_REFERENCE.md\n` +
  `│   ├── 000_full_schema_dump.sql  # Schema completo (bootstrap inicial)\n` +
  `│   └── ... (34 archivos más)`;

// ---------------------------------------------------------------------------
// FIX-023 — Link "Resumen Ejecutivo" con ancla directa
// ---------------------------------------------------------------------------

// Línea 632 real:
//   - 📊 **[Resumen Ejecutivo de Estado Actual (Current State)](./CURRENT_STATE.md)**

const fix023_regex =
  /- 📊 \*\*\[Resumen Ejecutivo de Estado Actual \(Current State\)\]\(\.\/CURRENT_STATE\.md\)\*\*/;

const fix023_new =
  `- 📊 **[Resumen Ejecutivo de Estado Actual (Current State)](./CURRENT_STATE.md#resumen-ejecutivo)**`;

// ---------------------------------------------------------------------------
// FIX-024 — Eliminar línea de metadata.json del árbol
// ---------------------------------------------------------------------------

// Línea 88 real:
//   ├── metadata.json                 # Metadatos del entorno AI Studio

const fix024_regex =
  /^├── metadata\.json\s+# Metadatos del entorno AI Studio\r?\n/m;

// ---------------------------------------------------------------------------
// ASSERTS
// ---------------------------------------------------------------------------

console.log('🔎 Verificando precondiciones...\n');

// FIX-002
if (!fix002_regex.test(original)) {
  abort('FIX-002: no matchea el bloque SQL legacy. Revisar el regex contra el README.');
}
ok('FIX-002: bloque SQL legacy matcheado.');

// FIX-023
if (!fix023_regex.test(original)) {
  abort('FIX-023: no matchea el link "Resumen Ejecutivo".');
}
if (original.includes('./CURRENT_STATE.md#resumen-ejecutivo')) {
  abort('FIX-023: el link con ancla ya existe. ¿Ya fue aplicado?');
}
ok('FIX-023: link original matcheado, sin ancla previa.');

// FIX-024
const fix024_matches = original.match(new RegExp(fix024_regex.source, 'gm'));
if (!fix024_matches || fix024_matches.length === 0) {
  abort('FIX-024: no matchea la línea de metadata.json.');
}
if (fix024_matches.length > 1) {
  abort(`FIX-024: metadata.json aparece ${fix024_matches.length} veces. Abortar.`);
}
ok('FIX-024: línea de metadata.json matcheada (1 ocurrencia).');

// ---------------------------------------------------------------------------
// Backup
// ---------------------------------------------------------------------------

console.log('\n💾 Generando backup...\n');

const backupPath = `${TARGET}.bak-${timestamp()}`;
if (BACKUP_SET.has(backupPath)) {
  info(`Backup ya generado en esta corrida: ${path.basename(backupPath)}`);
} else {
  fs.writeFileSync(backupPath, original, 'utf8');
  BACKUP_SET.add(backupPath);
  ok(`Backup: ${path.basename(backupPath)}`);
}

// ---------------------------------------------------------------------------
// Aplicar cambios
// ---------------------------------------------------------------------------

console.log('\n🔧 Aplicando fixes...\n');

let result = original;

// FIX-002
const before002 = result;
result = result.replace(fix002_regex, fix002_new);
if (result === before002) abort('FIX-002: replace no tuvo efecto.');
ok('FIX-002: bloque SQL reemplazado (2 → 35, resumen + link).');

// FIX-023
const before023 = result;
result = result.replace(fix023_regex, fix023_new);
if (result === before023) abort('FIX-023: replace no tuvo efecto.');
ok('FIX-023: link "Resumen Ejecutivo" con ancla #resumen-ejecutivo.');

// FIX-024
const before024 = result;
result = result.replace(fix024_regex, '');
if (result === before024) abort('FIX-024: no se pudo eliminar la línea de metadata.json.');
ok('FIX-024: línea de metadata.json eliminada del árbol.');

// ---------------------------------------------------------------------------
// Escribir
// ---------------------------------------------------------------------------

console.log('\n✍️  Escribiendo README.md...\n');
fs.writeFileSync(TARGET, result, 'utf8');
ok(`README.md escrito (${result.length} bytes, delta ${result.length - original.length > 0 ? '+' : ''}${result.length - original.length}).`);

// ---------------------------------------------------------------------------
// Verificación post
// ---------------------------------------------------------------------------

console.log('\n🧪 Verificación post:\n');

const final = fs.readFileSync(TARGET, 'utf8');

const fix002_ok = !fix002_regex.test(final) && final.includes('35 migraciones DDL');
const fix023_ok = final.includes('./CURRENT_STATE.md#resumen-ejecutivo') && !final.includes('](./CURRENT_STATE.md)**');
const fix024_ok = !fix024_regex.test(final);

console.log(`   FIX-002: ${fix002_ok ? '✓ OK' : '✗ FALLÓ'}`);
console.log(`   FIX-023: ${fix023_ok ? '✓ OK' : '✗ FALLÓ'}`);
console.log(`   FIX-024: ${fix024_ok ? '✓ OK' : '✗ FALLÓ'}`);

if (!fix002_ok || !fix023_ok || !fix024_ok) {
  console.error('\n⚠️  Alguna verificación post falló. Revisar antes de commitear.');
  process.exit(2);
}

console.log('\n✅ Los 3 fixes del README fueron aplicados.\n');
console.log('⚠️  PRÓXIMOS PASOS MANUALES:');
console.log('   1. Revisar diff:  git diff README.md');
console.log('   2. Eliminar metadata.json del repo:  git rm metadata.json');
console.log('   3. Commit:');
console.log('        git add README.md');
console.log('        git commit -m "docs(sprint-0-grupoG): README — árbol SQL 2→35 + ancla + drop metadata.json (FIX-002/023/024)"');
console.log('   4. Push: git push origin main');
console.log('   5. Versionar este script + mini-commit TBD.');
console.log('');