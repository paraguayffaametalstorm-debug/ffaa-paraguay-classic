#!/usr/bin/env node
/**
 * cleanup-scripts.cjs
 * 
 * Mueve los scripts one-shot a scripts/archive/ y deja solo los activos.
 * 
 * Uso:
 *   node scripts/cleanup-scripts.cjs          → DRY RUN
 *   node scripts/cleanup-scripts.cjs --apply  → aplica
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SCRIPTS_DIR = path.join(ROOT, 'scripts');
const ARCHIVE_DIR = path.join(SCRIPTS_DIR, 'archive');
const APPLY = process.argv.includes('--apply');

// Scripts que se quedan en scripts/
const ACTIVOS = [
  'bump-version.cjs',
  'check_health.py',
  'sync-package-version.cjs',
];

// Scripts a revisar manualmente (no mover por ahora)
const REVISAR = [
  'document_session_fly_audit.py',
  'document_session_v460.py',
];

// Asegurar que archive/ exista
if (!fs.existsSync(ARCHIVE_DIR)) {
  fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
}

const archivos = fs.readdirSync(SCRIPTS_DIR).filter(f => {
  const full = path.join(SCRIPTS_DIR, f);
  return fs.statSync(full).isFile();
});

let movidos = 0;
let activosCount = 0;
let revisarCount = 0;

console.log('');
console.log('═══════════════════════════════════════════════════════════════');
console.log('  CLEANUP SCRIPTS');
console.log('═══════════════════════════════════════════════════════════════');
console.log(`  Modo: ${APPLY ? '🔴 APPLY' : '🟢 DRY RUN'}`);
console.log('');

for (const f of archivos) {
  if (ACTIVOS.includes(f)) {
    console.log(`  ✅ ACTIVO (no tocar): ${f}`);
    activosCount++;
    continue;
  }

  if (REVISAR.includes(f)) {
    console.log(`  🔍 REVISAR (no tocar): ${f}`);
    revisarCount++;
    continue;
  }

  // Mover a archive/
  const origen = path.join(SCRIPTS_DIR, f);
  const destino = path.join(ARCHIVE_DIR, f);

  if (APPLY) {
    if (fs.existsSync(destino)) {
      console.log(`  ⚠️  YA EXISTE en archive/: ${f}`);
    } else {
      fs.renameSync(origen, destino);
      console.log(`  📦 MOVIDO: ${f}`);
    }
  } else {
    console.log(`  📦 Movería: ${f}`);
  }
  movidos++;
}

console.log('');
console.log('═══════════════════════════════════════════════════════════════');
console.log('  RESUMEN');
console.log('═══════════════════════════════════════════════════════════════');
console.log(`  Activos (sin tocar): ${activosCount}`);
console.log(`  A revisar (sin tocar): ${revisarCount}`);
console.log(`  ${APPLY ? 'Movidos' : 'Se moverían'}: ${movidos}`);
console.log('');

if (!APPLY && movidos > 0) {
  console.log('  ℹ️  Para aplicar: node scripts/cleanup-scripts.cjs --apply');
  console.log('');
}