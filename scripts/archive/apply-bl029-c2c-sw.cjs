/**
 * BL-029 · Commit #2c — Bump CACHE_NAME en sw.js
 *
 * Cambios:
 *   1. v4.7.3 → v4.7.4 (constante CACHE_NAME, línea 10)
 *   2. console.log del install: v4.6.0 → v4.7.4 (por consistencia)
 *
 * Uso:
 *   node scripts\apply-bl029-c2c-sw.cjs
 *
 * Rollback:
 *   ren sw.js.bak-bl029-2c sw.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const FILE = path.join(ROOT, 'sw.js');
const BACKUP = FILE + '.bak-bl029-2c';

if (!fs.existsSync(FILE)) {
  console.error('❌ No existe:', FILE);
  process.exit(1);
}

let src = fs.readFileSync(FILE, 'utf8');

// ─── Idempotencia ────────────────────────────────────────────
if (src.includes("'PARAGUAY-FFAA-METALSTORM-v4.7.4'")) {
  console.log('[SKIP] CACHE_NAME ya está en v4.7.4');
  process.exit(0);
}

// ─── Verificación previa ─────────────────────────────────────
const oldVersion = "'PARAGUAY-FFAA-METALSTORM-v4.7.3'";
const newVersion = "'PARAGUAY-FFAA-METALSTORM-v4.7.4'";

if (!src.includes(oldVersion)) {
  console.error('❌ No se encontró CACHE_NAME con v4.7.3');
  console.error('   Buscado:', oldVersion);
  process.exit(1);
}

const occurrences = (src.split(oldVersion).length - 1);
if (occurrences !== 1) {
  console.error(`❌ Se esperaba 1 ocurrencia de v4.7.3, se encontraron ${occurrences}`);
  process.exit(1);
}

// ─── Backup ──────────────────────────────────────────────────
if (!fs.existsSync(BACKUP)) {
  fs.copyFileSync(FILE, BACKUP);
  console.log('💾 Backup:', path.basename(BACKUP));
}

// ─── Cambio 1: CACHE_NAME ────────────────────────────────────
src = src.replace(oldVersion, newVersion);
console.log('✅ Cambio 1: CACHE_NAME → v4.7.4');

// ─── Cambio 2: console.log del install (bump cosmético) ──────
const oldLog = "console.log('[SW] Cacheando assets estáticos v4.6.0');";
const newLog = "console.log('[SW] Cacheando assets estáticos v4.7.4');";

if (src.includes(oldLog)) {
  src = src.replace(oldLog, newLog);
  console.log('✅ Cambio 2: console.log del install → v4.7.4');
} else {
  console.log('ℹ️  Cambio 2: console.log ya estaba actualizado (o cambió de formato)');
}

// ─── Escribir ────────────────────────────────────────────────
fs.writeFileSync(FILE, src, 'utf8');

// ─── Verificación final ──────────────────────────────────────
console.log('\n🔍 Verificando cambios...');

const final = fs.readFileSync(FILE, 'utf8');
const checks = [
  [final.includes("'PARAGUAY-FFAA-METALSTORM-v4.7.4'"), 'CACHE_NAME en v4.7.4'],
  [(final.match(/v4\.7\.3/g) || []).length === 0, 'Sin más referencias a v4.7.3'],
  [(final.match(/v4\.7\.4/g) || []).length >= 1, 'Al menos 1 referencia a v4.7.4'],
  [final.includes('CACHE_NAME'), 'Constante CACHE_NAME intacta'],
  [final.includes('STATIC_ASSETS'), 'STATIC_ASSETS intacto'],
];

let allOk = true;
for (const [ok, label] of checks) {
  console.log(`   ${ok ? '✅' : '❌'} ${label}`);
  if (!ok) allOk = false;
}

console.log('\n═══════════════════════════════════════════════════════════════');
if (allOk) {
  console.log('  ✅ COMMIT 2c LISTO — 5 checks OK');
  console.log('');
  console.log('  Próximos pasos:');
  console.log('    1. node --check sw.js');
  console.log('    2. findstr /N /C:"CACHE_NAME" sw.js');
  console.log('');
  console.log('  Rollback:');
  console.log('    ren sw.js.bak-bl029-2c sw.js');
} else {
  console.log('  ❌ FALTAN CHECKS — revisar antes de continuar');
  console.log('  Rollback: ren sw.js.bak-bl029-2c sw.js');
}
console.log('═══════════════════════════════════════════════════════════════\n');