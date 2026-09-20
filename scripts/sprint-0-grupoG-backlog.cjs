#!/usr/bin/env node
/**
 * sprint-0-grupoG-backlog.cjs
 * -----------------------------------------------------------------------------
 * Sprint 0 — Grupo G — FIX-019 + FIX-020 sobre BACKLOG.md
 *
 * FIX-019 (MEDIA): contador "Items completados: 7" vs "hay 8".
 *   → DECISIÓN: NO APLICAR. El relevamiento confirma 7 filas únicas en la
 *     tabla de Completados. El handoff estaba mal. Se documenta como
 *     "no aplicable" en el commit.
 *
 * FIX-020 (MEDIA): referencia BL-059 ambigua + hash pendiente.
 *   → APLICAR: limpiar título (quitar prefijo "HALL-059:") y reemplazar
 *     `<hash-pendiente>` por el commit real `a82b5b0`.
 *
 * Reglas (Grupo F):
 *  - EOL mixto: regex \r?\n SIEMPRE (BACKLOG.md tiene 152 CRLF + 26 LF).
 *  - Backup timestamped con Set interno (idempotente).
 *  - Aborto TOTAL si algún ítem falla. Sin escritura parcial.
 *  - NO commitear desde el script.
 * -----------------------------------------------------------------------------
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const ROOT       = path.resolve(__dirname, '..');
const TARGET     = path.join(ROOT, 'BACKLOG.md');
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

console.log(`\n📄 BACKLOG.md — ${original.length} bytes`);
console.log(`   EOL: ${eolInfo.crlf} CRLF + ${eolInfo.lf} LF (dominante: ${eol === '\r\n' ? 'CRLF' : 'LF'})\n`);

// ---------------------------------------------------------------------------
// FIX-019 — Contador "Items completados"
// ---------------------------------------------------------------------------

// Decisión: NO MODIFICAR.
// El relevamiento confirma 7 filas únicas en la tabla de Completados.
// El handoff decía "hay 8" pero no se justifica.
// Solo verificamos que el valor actual sea el esperado (7).

const FIX019_ESPERADO = 7;

const fix019_regex = /\|\s*Items completados\s*\|\s*(\d+)\s*\|/;
const fix019_match = original.match(fix019_regex);

if (!fix019_match) {
  abort('FIX-019: no se encontró la fila "| Items completados | N |".');
}
const fix019_valorActual = parseInt(fix019_match[1], 10);
if (fix019_valorActual !== FIX019_ESPERADO) {
  abort(`FIX-019: contador actual es ${fix019_valorActual}, esperado ${FIX019_ESPERADO}. Revisar antes de aplicar.`);
}

// ---------------------------------------------------------------------------
// FIX-020 — Línea de BL-059 (título + hash)
// ---------------------------------------------------------------------------

// Línea 137 real:
//   | **BL-059** | 🐛 | HALL-059: Inconsistencia claves `localStorage` en vinculación Google | 2026-09-17 (Hotfix) | `<hash-pendiente>` |
//
// Cambio:
//   - Quitar prefijo "HALL-059: "
//   - Reemplazar `<hash-pendiente>` por `a82b5b0`

const fix020_regex = /\| \*\*BL-059\*\* \| 🐛 \| HALL-059: Inconsistencia claves `localStorage` en vinculación Google \| 2026-09-17 \(Hotfix\) \| `<hash-pendiente>` \|/;

const fix020_new = `| **BL-059** | 🐛 | Inconsistencia claves \`localStorage\` en vinculación Google | 2026-09-17 (Hotfix) | \`a82b5b0\` |`;

// ---------------------------------------------------------------------------
// ASSERTS
// ---------------------------------------------------------------------------

console.log('🔎 Verificando precondiciones...\n');

// FIX-019: solo info (no se modifica)
ok(`FIX-019: contador "Items completados" = ${fix019_valorActual}. NO SE MODIFICA (relevamiento confirma 7).`);

// FIX-020
if (!fix020_regex.test(original)) {
  abort('FIX-020: no matchea la línea de BL-059 con `<hash-pendiente>`.');
}
if (original.includes('`a82b5b0`') && original.includes('| **BL-059** | 🐛 | Inconsistencia claves')) {
  abort('FIX-020: la línea ya fue corregida. ¿Ya aplicado?');
}
ok('FIX-020: línea de BL-059 matcheada (con `<hash-pendiente>`).');

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
// Aplicar cambios
// ---------------------------------------------------------------------------

console.log('\n🔧 Aplicando fixes...\n');

let result = original;

// FIX-019 → NO APLICAR
info('FIX-019: sin cambios (contador correcto según relevamiento).');

// FIX-020
const before020 = result;
result = result.replace(fix020_regex, fix020_new);
if (result === before020) abort('FIX-020: replace no tuvo efecto.');
ok('FIX-020: línea BL-059 corregida (título limpio + hash real).');

// ---------------------------------------------------------------------------
// Escribir
// ---------------------------------------------------------------------------

console.log('\n✍️  Escribiendo BACKLOG.md...\n');
fs.writeFileSync(TARGET, result, 'utf8');
ok(`BACKLOG.md escrito (${result.length} bytes, delta ${result.length - original.length > 0 ? '+' : ''}${result.length - original.length}).`);

// ---------------------------------------------------------------------------
// Verificación post
// ---------------------------------------------------------------------------

console.log('\n🧪 Verificación post:\n');

const final = fs.readFileSync(TARGET, 'utf8');

const fix019_ok = /\|\s*Items completados\s*\|\s*7\s*\|/.test(final);
const fix020_ok = !final.includes('HALL-059: Inconsistencia claves')
              &&  final.includes('| **BL-059** | 🐛 | Inconsistencia claves')
              &&  final.includes('`a82b5b0`')
              && !final.includes('`<hash-pendiente>`');

console.log(`   FIX-019 (contador): ${fix019_ok ? '✓ OK (sin cambios)' : '✗ FALLÓ'}`);
console.log(`   FIX-020 (BL-059):   ${fix020_ok ? '✓ OK' : '✗ FALLÓ'}`);

if (!fix019_ok || !fix020_ok) {
  console.error('\n⚠️  Alguna verificación post falló.');
  process.exit(2);
}

// ---------------------------------------------------------------------------
// Cierre
// ---------------------------------------------------------------------------

console.log('\n✅ FIX-020 aplicado. FIX-019 confirmado como no-aplicable.\n');
console.log('⚠️  PRÓXIMOS PASOS MANUALES:');
console.log('   1. git diff BACKLOG.md');
console.log('   2. git add BACKLOG.md');
console.log('   3. git commit -m "docs(sprint-0-grupoG): BACKLOG BL-059 limpio + hash real (FIX-020); FIX-019 no aplicable"');
console.log('   4. git push origin main');
console.log('   5. git add scripts/sprint-0-grupoG-backlog.cjs');
console.log('   6. git commit -m "chore(sprint-0-grupoG): versionar script BACKLOG (FIX-019 no aplicable / FIX-020)"');
console.log('   7. git push origin main');
console.log('');