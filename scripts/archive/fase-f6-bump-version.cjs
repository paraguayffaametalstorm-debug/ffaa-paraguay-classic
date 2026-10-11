/**
 * ═══════════════════════════════════════════════════════════════
 *  FASE 6 — Bump de versión a v4.7.0 (FIX: v duplicada)
 *  ─────────────────────────────────────────────────────────────
 *  Uso:      node scripts/fase-f6-bump-version.cjs
 *  Rollback: copy sw.js.bak-f6 sw.js
 *            copy index.html.bak-f6 index.html
 * ═══════════════════════════════════════════════════════════════
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const FILE_SW = path.join(ROOT, 'sw.js');
const FILE_INDEX = path.join(ROOT, 'index.html');

// Versión SIN la 'v' para usar en query strings (?v=X.Y.Z)
const NEW_VERSION = '4.7.0';
// Versión CON la 'v' para usar en sw.js (CACHE_NAME)
const NEW_VERSION_FULL = 'v4.7.0';

function log(msg)   { console.log(msg); }
function ok(msg)    { console.log(`   ✅ ${msg}`); }
function warn(msg)  { console.log(`   ⚠️  ${msg}`); }
function err(msg)   { console.error(`   ❌ ${msg}`); }
function title(msg) { console.log(`\n🔷 ${msg}`); }

function crearBackup(filepath) {
  const backup = filepath + '.bak-f6';
  if (fs.existsSync(backup)) {
    warn(`Backup ya existía: ${path.basename(backup)}`);
    return;
  }
  fs.copyFileSync(filepath, backup);
  ok(`Backup: ${path.basename(backup)}`);
}

function main() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log(`  🚀 FASE 6 — Bump de versión a ${NEW_VERSION_FULL}`);
  console.log('═══════════════════════════════════════════════════════');

  // ─── PASO 1: sw.js ───
  title('PASO 1 — Actualizar sw.js');
  if (!fs.existsSync(FILE_SW)) {
    err('No existe: sw.js');
    process.exit(1);
  }
  let sw = fs.readFileSync(FILE_SW, 'utf8');
  const swBefore = (sw.match(/PARAGUAY-FFAA-METALSTORM-v4\.6\.1/g) || []).length;
  sw = sw.replace(
    /PARAGUAY-FFAA-METALSTORM-v4\.6\.1/g,
    `PARAGUAY-FFAA-METALSTORM-${NEW_VERSION_FULL}`
  );
  crearBackup(FILE_SW);
  fs.writeFileSync(FILE_SW, sw, 'utf8');
  ok(`sw.js: ${swBefore} ocurrencia(s) reemplazada(s)`);

  // ─── PASO 2: index.html ───
  title('PASO 2 — Actualizar index.html');
  if (!fs.existsSync(FILE_INDEX)) {
    err('No existe: index.html');
    process.exit(1);
  }
  let html = fs.readFileSync(FILE_INDEX, 'utf8');
  const htmlBefore = (html.match(/\?v=4\.6\.1/g) || []).length;
  // El reemplazo usa la versión SIN la 'v' → produce '?v=4.7.0'
  html = html.replace(/\?v=4\.6\.1/g, `?v=${NEW_VERSION}`);
  crearBackup(FILE_INDEX);
  fs.writeFileSync(FILE_INDEX, html, 'utf8');
  ok(`index.html: ${htmlBefore} ocurrencia(s) reemplazada(s)`);

  // ─── Resumen ───
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  ✅ Bump de versión completado');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  sw.js:       v4.6.1 → ${NEW_VERSION_FULL}`);
  console.log(`  index.html:  ${htmlBefore} assets actualizados a ?v=${NEW_VERSION}`);
  console.log('');
  console.log('  Próximo paso:');
  console.log('     git add .');
  console.log('     git commit -m "feat(admin): rediseño del Panel de Comandancia v4.7.0"');
  console.log('     git push origin main');
  console.log('');
  console.log('  🔙 Rollback:');
  console.log('     copy sw.js.bak-f6 sw.js');
  console.log('     copy index.html.bak-f6 index.html');
  console.log('═══════════════════════════════════════════════════════\n');
}

main();