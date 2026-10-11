#!/usr/bin/env node
/**
 * classify-scripts.cjs
 * 
 * Analiza los scripts en scripts/ y los clasifica según:
 *   - Activos (mencionados en package.json, docs, o usados recientemente)
 *   - One-shot (aplicaron fixes específicos en el pasado)
 *   - Mantenimiento (bump-version, sync-package-version)
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SCRIPTS_DIR = path.join(ROOT, 'scripts');
const ARCHIVE_DIR = path.join(SCRIPTS_DIR, 'archive');

// Scripts que sabemos que son activos (mantenimiento recurrente)
const ACTIVOS_CONOCIDOS = [
  'bump-version.cjs',
  'sync-package-version.cjs',
  'check_health.py',
];

// Patrones de scripts one-shot
const PATRONES_ONESHOT = [
  /^apply-/,           // apply-fix-*.cjs, apply-bl*.cjs
  /^fase-f/,           // fase-f2-admin-shell.cjs
  /^sprint-?0/,        // sprint-0-grupo*.cjs
  /^sprint0-/,         // sprint0-grupo*.cjs
  /^f4\.0/,            // f4.0-final-docs.cjs
  /^f7-/,              // f7-b-c-docs-bump.cjs
  /^fix-/,             // fix-admin-tests.cjs
  /^bl-/,              // bl-025-*.cjs
  /^hall-/,            // hall-071-072-docs.cjs
  /^generate-/,        // generate-dashboard-tests.cjs
  /^document-/,        // document-migration-render.cjs
  /^docs-/,            // docs-v4.5.0.cjs
  /^update-docs/,      // update-docs-fix104.cjs
  /^diag-/,            // diag-encoding-v2.cjs
  /^mini-fix/,         // mini-fix-tbd.cjs
  /^reorganize-/,      // reorganize-admin-panel.cjs
  /^analyze-/,         // analyze-fffd.cjs
  /^check-/,           // check-history.cjs
  /^smoke-/,           // smoke-and-close-hall-s1-01.cjs
  /^run-/,             // run-hall-s2-01.cjs
  /^add-/,             // add-bl018.mjs
  /^fix-/,             // fix-api-reference.mjs
  /^traducir-/,        // traducir-aviones.cjs
  /^migrate-/,         // migrate-to-pino.cjs
  /^fase-/,            // fase-f6-*.cjs
];

function esActivo(nombre) {
  return ACTIVOS_CONOCIDOS.includes(nombre);
}

function esOneShot(nombre) {
  return PATRONES_ONESHOT.some(p => p.test(nombre));
}

const archivos = fs.readdirSync(SCRIPTS_DIR).filter(f => {
  const full = path.join(SCRIPTS_DIR, f);
  return fs.statSync(full).isFile();
});

const activos = [];
const oneShots = [];
const otros = [];

for (const f of archivos) {
  if (esActivo(f)) activos.push(f);
  else if (esOneShot(f)) oneShots.push(f);
  else otros.push(f);
}

console.log('');
console.log('═══════════════════════════════════════════════════════════════');
console.log('  CLASIFICACIÓN DE SCRIPTS');
console.log('═══════════════════════════════════════════════════════════════');
console.log('');
console.log(`📌 ACTIVOS (mantener en scripts/): ${activos.length}`);
for (const f of activos) console.log(`   ✅ ${f}`);
console.log('');
console.log(`🗄️  ONE-SHOT (mover a scripts/archive/): ${oneShots.length}`);
for (const f of oneShots) console.log(`   📦 ${f}`);
console.log('');
console.log(`❓ OTROS (revisar manualmente): ${otros.length}`);
for (const f of otros) console.log(`   🔍 ${f}`);
console.log('');