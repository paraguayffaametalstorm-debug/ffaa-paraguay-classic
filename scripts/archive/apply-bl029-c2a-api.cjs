/**
 * BL-029 · Commit #2a — Agregar apiEventsV2Mine() a js/api.js
 *
 * Uso:
 *   node scripts\apply-bl029-c2a-api.cjs
 *
 * Rollback:
 *   ren js\api.js.bak-bl029-2a js\api.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const FILE = path.join(ROOT, 'js', 'api.js');
const BACKUP = FILE + '.bak-bl029-2a';

// ─── Verificación de archivo ─────────────────────────────────
if (!fs.existsSync(FILE)) {
  console.error('❌ No existe:', FILE);
  process.exit(1);
}

let src = fs.readFileSync(FILE, 'utf8');

// ─── Idempotencia ────────────────────────────────────────────
if (src.includes('async function apiEventsV2Mine')) {
  console.log('[SKIP] apiEventsV2Mine ya está definida');
  process.exit(0);
}

if (src.includes('window.apiEventsV2Mine')) {
  console.log('[SKIP] window.apiEventsV2Mine ya está expuesta');
  process.exit(0);
}

// ─── Anclas ──────────────────────────────────────────────────
const anchorDef = `async function apiEventsV2Active() {
  return _eventsV2Fetch('/api/events-v2/active');
}`;

const anchorExport = `window.apiEventsV2Active               = apiEventsV2Active;`;

if (!src.includes(anchorDef)) {
  console.error('❌ No se encontró la función apiEventsV2Active()');
  process.exit(1);
}

if (!src.includes(anchorExport)) {
  console.error('❌ No se encontró window.apiEventsV2Active');
  process.exit(1);
}

// ─── Backup ──────────────────────────────────────────────────
if (!fs.existsSync(BACKUP)) {
  fs.copyFileSync(FILE, BACKUP);
  console.log('💾 Backup:', path.basename(BACKUP));
} else {
  console.log('💾 Backup ya existe:', path.basename(BACKUP));
}

// ─── Insert #1: la función, después de apiEventsV2Active ────
const newFunction = `${anchorDef}

/**
 * Wrapper del endpoint GET /api/events-v2/mine (BL-028).
 * Devuelve las participaciones del piloto autenticado. Payload retrocompatible
 * con el legacy /api/performances/my-history.
 *
 * @param {{limit?:number, type?:string, status?:string}} params
 * @returns {Promise<{success:boolean, participations:Array, total:number, filters:object}>}
 */
async function apiEventsV2Mine(params = {}) {
  const query = new URLSearchParams();
  if (params.limit)  query.set('limit', params.limit);
  if (params.type)   query.set('type', params.type);
  if (params.status) query.set('status', params.status);
  const qs = query.toString();
  return _eventsV2Fetch(\`/api/events-v2/mine\${qs ? \`?\${qs}\` : ''}\`);
}`;

src = src.replace(anchorDef, newFunction);
console.log('✅ Función apiEventsV2Mine() insertada');

// ─── Insert #2: la exposición global, después de apiEventsV2Active ─
const newExport = `${anchorExport}
window.apiEventsV2Mine                 = apiEventsV2Mine;`;

src = src.replace(anchorExport, newExport);
console.log('✅ window.apiEventsV2Mine expuesta');

// ─── Escribir ────────────────────────────────────────────────
fs.writeFileSync(FILE, src, 'utf8');

// ─── Verificación ────────────────────────────────────────────
console.log('\n🔍 Verificando cambios...');

const final = fs.readFileSync(FILE, 'utf8');
const checks = [
  [final.includes('async function apiEventsV2Mine'), 'Función definida'],
  [final.includes("_eventsV2Fetch('/api/events-v2/mine'") || final.includes('events-v2/mine'), 'Endpoint correcto'],
  [final.includes('window.apiEventsV2Mine'), 'Expuesta en window'],
  [final.includes('apiEventsV2Active'), 'apiEventsV2Active intacta'],
  [(final.match(/async function apiEventsV2Mine/g) || []).length === 1, 'Sin duplicados (1 definición)'],
];

let allOk = true;
for (const [ok, label] of checks) {
  console.log(`   ${ok ? '✅' : '❌'} ${label}`);
  if (!ok) allOk = false;
}

console.log('\n═══════════════════════════════════════════════════════════════');
if (allOk) {
  console.log('  ✅ COMMIT 2a LISTO — 5 checks OK');
  console.log('');
  console.log('  Próximos pasos:');
  console.log('    1. node --check js\\api.js');
  console.log('    2. findstr /N /C:"apiEventsV2Mine" js\\api.js');
  console.log('');
  console.log('  Rollback:');
  console.log('    ren js\\api.js.bak-bl029-2a js\\api.js');
} else {
  console.log('  ❌ FALTAN CHECKS — revisar antes de continuar');
  console.log('  Rollback: ren js\\api.js.bak-bl029-2a js\\api.js');
}
console.log('═══════════════════════════════════════════════════════════════\n');