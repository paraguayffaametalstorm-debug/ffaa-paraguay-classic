// scripts/f1-3-fix-beforeeach.cjs
//
// F1.3 — Fix del beforeEach en tournaments.controller.test.js.
//
// Causa raíz:
//   El beforeEach hacía `mockSupabase.from.mockReset()`.
//   mockReset() borra la implementación (no solo las llamadas).
//   Cuando corren todos los tests juntos, algunos tests quedan con
//   `from` sin implementación → el handler revienta → next(err) no
//   se llama donde debería → 18 fallos.
//
//   Cuando se corren individualmente (-t "8. happy path"), el test
//   configura su propio mockImplementation y pasa. De ahí que los 3
//   tests problemáticos pasaran solos pero fallaran en conjunto.
//
// Fix:
//   1. Cambiar `mockReset()` → `mockClear()` (limpia llamadas, no impl).
//   2. Agregar un `mockImplementation` default seguro post-clear.
//   3. Limpiar los `console.log('DEBUG...'...)` que el usuario agregó
//      con PowerShell (2 firmas distintas).
//   4. Verificar con node --check + correr los 49 tests + suite completa.
//
// Idempotente: si ya está corregido, no hace nada.
// Uso: node scripts/f1-3-fix-beforeeach.cjs

'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

// ─── Colores ANSI ──────────────────────────────────────────────
const RESET  = '\x1b[0m';
const RED    = '\x1b[31m';
const GREEN  = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN   = '\x1b[36m';
const BOLD   = '\x1b[1m';

const OK   = `${GREEN}✅${RESET}`;
const FAIL = `${RED}❌${RESET}`;
const WARN = `${YELLOW}⚠️${RESET}`;

function log(icon, msg) { console.log(`${icon} ${msg}`); }
function section(title) {
  console.log('');
  console.log(`${BOLD}${CYAN}═══════════════════════════════════════════════════════════${RESET}`);
  console.log(`${BOLD}${CYAN}  ${title}${RESET}`);
  console.log(`${BOLD}${CYAN}═══════════════════════════════════════════════════════════${RESET}`);
}
function die(msg) {
  console.log(`${FAIL} ${RED}${msg}${RESET}`);
  process.exit(1);
}

// ─── Paths ─────────────────────────────────────────────────────
const ROOT = path.resolve(__dirname, '..');
const TEST_FILE = path.join(ROOT, 'tests', 'controllers', 'tournaments.controller.test.js');

// ─── Firmas a reemplazar ───────────────────────────────────────
//
// Los DEBUGs que agregó el usuario con PowerShell tienen 3 formas:
//   1. `console.log('DEBUG:', JSON.stringify(res.body)); expect(...)`
//   2. `console.log('DEBUG 201:', JSON.stringify(res.body)); expect(...)`
//   3. `console.log('DEBUG 200:', JSON.stringify(res.body)); expect(...)`
//
// Los reemplazamos por el `expect(...)` limpio.

const DEBUG_SIGNATURES = [
  "console.log('DEBUG:', JSON.stringify(res.body)); ",
  "console.log('DEBUG 201:', JSON.stringify(res.body)); ",
  "console.log('DEBUG 200:', JSON.stringify(res.body)); ",
];

// ═══════════════════════════════════════════════════════════════
// PASO 1 — Verificar archivo
// ═══════════════════════════════════════════════════════════════
section('PASO 1 — Verificar archivo');

if (!fs.existsSync(TEST_FILE)) {
  die(`No existe ${path.relative(ROOT, TEST_FILE)}`);
}
log(OK, `Encontrado: ${path.relative(ROOT, TEST_FILE)}`);

let content = fs.readFileSync(TEST_FILE, 'utf8');
const originalContent = content;
log(OK, `Tamaño original: ${content.length} bytes`);

// ═══════════════════════════════════════════════════════════════
// PASO 2 — Fix del beforeEach
// ═══════════════════════════════════════════════════════════════
section('PASO 2 — Fix del beforeEach');

const OLD_BEFORE_EACH = [
  'beforeEach(() => {',
  '  vi.clearAllMocks();',
  '  mockSupabase.from.mockReset();',
  '});',
].join('\n');

const NEW_BEFORE_EACH = [
  'beforeEach(() => {',
  '  vi.clearAllMocks();',
  '  mockSupabase.from.mockClear();',
  '  // Default seguro: builder vacío. Cada test sobreescribe el suyo.',
  '  mockSupabase.from.mockImplementation(() => makeBuilder({ data: [], error: null }));',
  '});',
].join('\n');

if (content.includes(NEW_BEFORE_EACH)) {
  log(OK, 'beforeEach ya tiene el fix (idempotente).');
} else if (content.includes(OLD_BEFORE_EACH)) {
  content = content.replace(OLD_BEFORE_EACH, NEW_BEFORE_EACH);
  log(OK, 'beforeEach corregido: mockReset() → mockClear() + default implementation.');
} else {
  // Fallback: reemplazo línea a línea con split/splice (por si CRLF)
  const lines = content.split('\n');
  let changed = false;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('mockSupabase.from.mockReset()')) {
      lines[i] = lines[i].replace('mockSupabase.from.mockReset()', 'mockSupabase.from.mockClear()');
      // Insertar la línea de default después
      const insertAt = i + 1;
      const indent = lines[i].match(/^(\s*)/)[1];
      lines.splice(insertAt, 0,
        `${indent}// Default seguro: builder vacío. Cada test sobreescribe el suyo.`,
        `${indent}mockSupabase.from.mockImplementation(() => makeBuilder({ data: [], error: null }));`
      );
      changed = true;
      log(OK, 'beforeEach corregido (fallback línea-a-línea).');
      break;
    }
  }
  if (!changed) {
    log(WARN, 'No se encontró `mockSupabase.from.mockReset()`. Verificá manualmente.');
  }
  content = lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════
// PASO 3 — Limpiar DEBUGs de PowerShell
// ═══════════════════════════════════════════════════════════════
section('PASO 3 — Limpiar DEBUGs');

let debugCleaned = 0;
for (const sig of DEBUG_SIGNATURES) {
  let count = 0;
  while (content.includes(sig)) {
    content = content.replace(sig, '');
    count++;
    if (count > 100) break; // safety
  }
  if (count > 0) {
    log(OK, `Eliminada firma "${sig.slice(0, 30)}..." × ${count}`);
    debugCleaned += count;
  }
}
if (debugCleaned === 0) {
  log(OK, 'No había DEBUGs.');
} else {
  log(OK, `Total DEBUGs eliminados: ${debugCleaned}`);
}

// ═══════════════════════════════════════════════════════════════
// PASO 4 — Guardar archivo
// ═══════════════════════════════════════════════════════════════
section('PASO 4 — Guardar');

if (content === originalContent) {
  log(OK, 'Sin cambios (idempotente).');
} else {
  fs.writeFileSync(TEST_FILE, content, 'utf8');
  log(OK, `Guardado. Δ ${content.length - originalContent.length} bytes.`);
}

// ═══════════════════════════════════════════════════════════════
// PASO 5 — Verificación post-cambio
// ═══════════════════════════════════════════════════════════════
section('PASO 5 — Verificación');

const finalContent = fs.readFileSync(TEST_FILE, 'utf8');

// 5.1 Verificar que YA NO hay mockReset
if (finalContent.includes('mockSupabase.from.mockReset()')) {
  die('Todavía hay `mockSupabase.from.mockReset()`. Fix falló.');
}
log(OK, 'No hay mockReset().');

// 5.2 Verificar que SÍ hay mockClear
if (!finalContent.includes('mockSupabase.from.mockClear()')) {
  die('No hay `mockSupabase.from.mockClear()`. Fix falló.');
}
log(OK, 'mockClear() presente.');

// 5.3 Verificar default implementation
if (!finalContent.includes("mockSupabase.from.mockImplementation(() => makeBuilder({ data: [], error: null }))")) {
  die('No se agregó el default mockImplementation. Fix falló.');
}
log(OK, 'Default mockImplementation presente.');

// 5.4 Verificar que no quedan DEBUGs
let residualDebug = 0;
for (const sig of DEBUG_SIGNATURES) {
  if (finalContent.includes(sig)) {
    residualDebug++;
  }
}
if (residualDebug > 0) {
  die(`Quedan ${residualDebug} firma(s) de DEBUG sin limpiar.`);
}
log(OK, 'Sin DEBUGs residuales.');

// ═══════════════════════════════════════════════════════════════
// PASO 6 — node --check
// ═══════════════════════════════════════════════════════════════
section('PASO 6 — node --check');

const checkRes = spawnSync('node', ['--check', TEST_FILE], { encoding: 'utf8' });
if (checkRes.status !== 0) {
  console.log(checkRes.stderr || checkRes.stdout);
  die('node --check falló.');
}
log(OK, 'Sintaxis OK.');

// ═══════════════════════════════════════════════════════════════
// PASO 7 — Correr los 49 tests
// ═══════════════════════════════════════════════════════════════
section('PASO 7 — Tests del controller (49)');

const vitestCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const testRes = spawnSync(
  vitestCmd,
  ['vitest', 'run', 'tests/controllers/tournaments.controller.test.js'],
  { cwd: ROOT, encoding: 'utf8', stdio: 'inherit' }
);

if (testRes.status !== 0) {
  console.log('');
  log(FAIL, 'Algunos tests del controller fallan.');
  console.log('');
  console.log(`${BOLD}Si los errores son OTROS (no relacionados con beforeEach):${RESET}`);
  console.log(`  - Compartí la salida para diagnosticar el siguiente caso.`);
  console.log('');
  console.log(`${BOLD}Si todavía ves "expected 400 to be 201" en test 8:${RESET}`);
  console.log(`  - Puede ser el orden de ejecución. Probá: npx vitest run --no-isolate tests/controllers/tournaments.controller.test.js`);
  process.exit(1);
}

log(OK, 'Los 49 tests pasan.');

// ═══════════════════════════════════════════════════════════════
// PASO 8 — Suite completa
// ═══════════════════════════════════════════════════════════════
section('PASO 8 — Suite completa');

const fullRes = spawnSync(
  vitestCmd,
  ['vitest', 'run'],
  { cwd: ROOT, encoding: 'utf8', stdio: 'inherit' }
);

if (fullRes.status !== 0) {
  console.log('');
  log(FAIL, 'Suite completa falló.');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════
// PASO 9 — Instrucciones de commit
// ═══════════════════════════════════════════════════════════════
section('PASO 9 — Instrucciones de commit');

console.log('');
console.log(`${BOLD}${GREEN}🎉 F1.3 COMPLETO — 8 endpoints + RBAC fino + 63 tests nuevos, todo verde.${RESET}`);
console.log('');
console.log(`${BOLD}Próximos pasos:${RESET}`);
console.log('');
console.log(`${BOLD}1. Revisar cambios:${RESET}`);
console.log('   git status');
console.log('');
console.log(`${BOLD}2. Agregar archivos (los 4 de F1.3 + los 3 scripts):${RESET}`);
console.log('   git add src/middlewares/tournamentModerator.js');
console.log('   git add src/controllers/tournaments.controller.js');
console.log('   git add tests/middlewares/tournamentModerator.test.js');
console.log('   git add tests/controllers/tournaments.controller.test.js');
console.log('   git add scripts/f1-3-create-files.cjs');
console.log('   git add scripts/f1-3-fix-express-import.cjs');
console.log('   git add scripts/f1-3-fix-uuids.cjs');
console.log('   git add scripts/f1-3-fix-beforeeach.cjs');
console.log('');
console.log(`${BOLD}3. Commit (single-line para evitar problemas con CMD):${RESET}`);
console.log('   git commit -m "feat(tournaments): controller + RBAC fino F1.3"');
console.log('');
console.log(`${BOLD}4. Push:${RESET}`);
console.log('   git push origin main');
console.log('');
console.log(`${BOLD}5. Reportar resultado a la IA${RESET} (pegar el resumen final de vitest).`);
console.log('');
log(OK, 'Script finalizado sin errores.');
process.exit(0);