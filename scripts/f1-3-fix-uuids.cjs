// scripts/f1-3-fix-uuids.cjs
//
// F1.3 — Fix de UUIDs no-canónicos en tournaments.controller.test.js.
//
// Causa raíz:
//   Zod 4 valida UUIDs contra RFC 4122 estricto:
//     xxxxxxxx-xxxx-Mxxx-Nxxx-xxxxxxxxxxxx
//     donde M ∈ [1-8] y N ∈ [89ab]
//
//   Los UUIDs hardcodeados en el test tenían N ∈ [1-5] (no RFC-compliant).
//   Zod los rechazaba con "debe ser UUID", causando 18 fallos.
//
//   El middleware test pasó porque usa su propio UUID_REGEX permisivo
//   (/^[0-9a-f]{8}-...$/i), que NO valida versión/variante.
//
// Fix:
//   1. Reemplaza las 9 constantes UUID por versiones canónicas.
//   2. Reemplaza los 5 user_id del roster en registerTeam.
//   3. Reemplaza moderator_id en changeModerator.
//   4. Limpia los console.log('DEBUG:'...) agregados con PowerShell.
//   5. Verifica todo post-cambio.
//
// Idempotente: si ya está corregido, no hace nada.
// Uso: node scripts/f1-3-fix-uuids.cjs

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

// ═══════════════════════════════════════════════════════════════
// MAPA DE REEMPLAZOS
// ═══════════════════════════════════════════════════════════════
//
// Cada entrada es { from, to, label }. Reemplazamos por string exacto
// (con verificación de que solo aparece 1 vez por línea, para evitar
// falsos positivos).
//

const REPLACEMENTS = [
  // ─── Constantes de test (declaración top-level) ───
  {
    from: "'11111111-1111-1111-1111-111111111111'",
    to:   "'11111111-1111-4111-8111-111111111111'",
    label: "UUID_TOURNAMENT"
  },
  {
    from: "'22222222-2222-2222-2222-222222222222'",
    to:   "'22222222-2222-4222-8222-222222222222'",
    label: "UUID_MATCH"
  },
  {
    from: "'33333333-3333-3333-3333-333333333333'",
    to:   "'33333333-3333-4333-8333-333333333333'",
    label: "UUID_TEAM_A"
  },
  {
    from: "'44444444-4444-4444-4444-444444444444'",
    to:   "'44444444-4444-4444-8444-444444444444'",
    label: "UUID_TEAM_B"
  },
  {
    from: "'55555555-5555-5555-5555-555555555555'",
    to:   "'55555555-5555-4555-8555-555555555555'",
    label: "UUID_TEAM_X"
  },
  {
    from: "'aaaaaaaa-1111-1111-1111-111111111111'",
    to:   "'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'",
    label: "UUID_USER"
  },
  {
    from: "'dddddddd-4444-4444-4444-444444444444'",
    to:   "'dddddddd-dddd-4ddd-8ddd-dddddddddddd'",
    label: "UUID_ADMIN"
  },
  {
    from: "'ffffffff-0000-0000-0000-000000000000'",
    to:   "'ffffffff-ffff-4fff-8fff-ffffffffffff'",
    label: "UUID_OTHER (en changeModerator.validBody)"
  },

  // ─── UUIDs embebidos en el roster de registerTeam (línea 531-535) ───
  {
    from: "'11111111-1111-1111-1111-111111111111', role: 'Interceptor'",
    to:   "'11111111-1111-4111-8111-111111111111', role: 'Interceptor'",
    label: "roster[0].user_id (Interceptor)"
  },
  {
    from: "'22222222-2222-2222-2222-222222222222', role: 'Support'",
    to:   "'22222222-2222-4222-8222-222222222222', role: 'Support'",
    label: "roster[1].user_id (Support)"
  },
  {
    from: "'33333333-3333-3333-3333-333333333333', role: 'Heavy'",
    to:   "'33333333-3333-4333-8333-333333333333', role: 'Heavy'",
    label: "roster[2].user_id (Heavy)"
  },
  {
    from: "'44444444-4444-4444-4444-444444444444', role: 'Scout'",
    to:   "'44444444-4444-4444-8444-444444444444', role: 'Scout'",
    label: "roster[3].user_id (Scout)"
  },
  {
    from: "'55555555-5555-5555-5555-555555555555', role: 'Assault'",
    to:   "'55555555-5555-4555-8555-555555555555', role: 'Assault'",
    label: "roster[4].user_id (Assault)"
  }
];

// ─── Firma de DEBUG que agregó el usuario con PowerShell ────────
const DEBUG_SIGNATURE = "console.log('DEBUG:', JSON.stringify(res.body)); ";

// ═══════════════════════════════════════════════════════════════
// PASO 1 — Verificar archivo
// ═══════════════════════════════════════════════════════════════
section('PASO 1 — Verificar archivo');

if (!fs.existsSync(TEST_FILE)) {
  die(`No existe ${path.relative(ROOT, TEST_FILE)}`);
}
log(OK, `Encontrado: ${path.relative(ROOT, TEST_FILE)}`);

const originalContent = fs.readFileSync(TEST_FILE, 'utf8');
log(OK, `Tamaño original: ${originalContent.length} bytes`);

// ═══════════════════════════════════════════════════════════════
// PASO 2 — Aplicar reemplazos con splice (no replace global)
// ═══════════════════════════════════════════════════════════════
section('PASO 2 — Aplicar reemplazos de UUIDs');

let lines = originalContent.split('\n');
let totalReplacements = 0;
let replacementsByLabel = {};

for (const { from, to, label } of REPLACEMENTS) {
  let count = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(from)) {
      // Reemplazar solo la PRIMERA ocurrencia en esa línea
      // (evita romper si el mismo string aparece 2 veces y no queremos)
      const idx = lines[i].indexOf(from);
      if (idx !== -1) {
        lines[i] = lines[i].slice(0, idx) + to + lines[i].slice(idx + from.length);
        count++;
      }
    }
  }
  if (count === 0) {
    log(WARN, `${label}: no encontrado (¿ya aplicado?)`);
  } else {
    log(OK, `${label}: ${count} reemplazo(s)`);
    totalReplacements += count;
    replacementsByLabel[label] = count;
  }
}

// ─── Filtro adicional: si quedan residuos de UUIDs viejos, avisar ──
// Después del loop principal, hacemos una pasada defensiva por si
// el script se ejecuta en un archivo con estado mixto.
const residuals = [
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333',
  '44444444-4444-4444-4444-444444444444',
  '55555555-5555-5555-5555-555555555555',
  'aaaaaaaa-1111-1111-1111-111111111111',
  'dddddddd-4444-4444-4444-444444444444',
  'ffffffff-0000-0000-0000-000000000000'
];
let residualCount = 0;
for (let i = 0; i < lines.length; i++) {
  for (const r of residuals) {
    if (lines[i].includes(r)) {
      residualCount++;
      log(WARN, `Residuo en línea ${i + 1}: ${r.slice(0, 18)}...`);
    }
  }
}
if (residualCount > 0) {
  log(WARN, `${residualCount} residuo(s) de UUIDs viejos.`);
}

// ═══════════════════════════════════════════════════════════════
// PASO 3 — Limpiar console.log('DEBUG:'...) del usuario
// ═══════════════════════════════════════════════════════════════
section('PASO 3 — Limpiar console.log DEBUG');

let debugCleaned = 0;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes(DEBUG_SIGNATURE)) {
    // Quitar solo el prefijo, dejando el resto del código
    lines[i] = lines[i].replace(DEBUG_SIGNATURE, '');
    debugCleaned++;
  }
}
if (debugCleaned > 0) {
  log(OK, `Eliminados ${debugCleaned} console.log('DEBUG:'...)`);
} else {
  log(OK, 'No había DEBUGs (ya limpio).');
}

// ═══════════════════════════════════════════════════════════════
// PASO 4 — Escribir archivo
// ═══════════════════════════════════════════════════════════════
section('PASO 4 — Guardar archivo');

const newContent = lines.join('\n');
const changed = newContent !== originalContent;

if (!changed) {
  log(OK, 'Sin cambios (idempotente). Nada que guardar.');
} else {
  fs.writeFileSync(TEST_FILE, newContent, 'utf8');
  log(OK, `Archivo guardado (${newContent.length} bytes, Δ ${newContent.length - originalContent.length})`);
}

// ═══════════════════════════════════════════════════════════════
// PASO 5 — Verificación post-cambio
// ═══════════════════════════════════════════════════════════════
section('PASO 5 — Verificación post-cambio');

const finalContent = fs.readFileSync(TEST_FILE, 'utf8');

// 5.1 Todos los UUIDs nuevos están presentes
const expectedNew = [
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222',
  '33333333-3333-4333-8333-333333333333',
  '44444444-4444-4444-8444-444444444444',
  '55555555-5555-4555-8555-555555555555',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  'ffffffff-ffff-4fff-8fff-ffffffffffff'
];
let missingNew = 0;
for (const u of expectedNew) {
  if (!finalContent.includes(u)) {
    log(WARN, `Falta UUID nuevo: ${u}`);
    missingNew++;
  }
}
if (missingNew === 0) {
  log(OK, `Todos los ${expectedNew.length} UUIDs nuevos están presentes.`);
}

// 5.2 No quedan UUIDs viejos
let remainingOld = 0;
for (const r of residuals) {
  if (finalContent.includes(r)) {
    log(FAIL, `Todavía aparece: ${r}`);
    remainingOld++;
  }
}
if (remainingOld === 0) {
  log(OK, 'No quedan UUIDs no-canónicos.');
}

// 5.3 No quedan DEBUGs
if (finalContent.includes(DEBUG_SIGNATURE)) {
  log(WARN, 'Todavía hay console.log(DEBUG) sin limpiar.');
} else {
  log(OK, 'Sin rastros de DEBUG.');
}

if (missingNew > 0 || remainingOld > 0) {
  die('Verificación falló. El archivo quedó inconsistente.');
}

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
// PASO 7 — Correr los 49 tests del archivo
// ═══════════════════════════════════════════════════════════════
section('PASO 7 — Correr tests de tournaments.controller.test.js');

const vitestCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const testRes = spawnSync(
  vitestCmd,
  ['vitest', 'run', 'tests/controllers/tournaments.controller.test.js'],
  { cwd: ROOT, encoding: 'utf8', stdio: 'inherit' }
);

if (testRes.status !== 0) {
  console.log('');
  log(FAIL, 'Tests todavía fallan. Revisá la salida de arriba.');
  console.log('');
  console.log(`${BOLD}Si los errores son OTROS (no VALIDATION_ERROR sobre UUID):${RESET}`);
  console.log(`  - Compartí la salida para diagnosticar.`);
  console.log('');
  console.log(`${BOLD}Si todavía ves VALIDATION_ERROR sobre UUIDs:${RESET}`);
  console.log(`  - Verificá con: findstr /C:"11111111-1111-1111" tests\\controllers\\tournaments.controller.test.js`);
  console.log(`  - Si aparece, es un residuo que mi script no detectó (improbable).`);
  process.exit(1);
}

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
  log(FAIL, 'Suite completa falló. Revisá la salida de arriba.');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════
// PASO 9 — Instrucciones de commit
// ═══════════════════════════════════════════════════════════════
section('PASO 9 — Instrucciones de commit');

console.log('');
console.log(`${BOLD}${GREEN}🎉 F1.3 completo. Próximos pasos:${RESET}`);
console.log('');
console.log(`${BOLD}1. Revisar cambios:${RESET}`);
console.log(`   git status`);
console.log('');
console.log(`${BOLD}2. Commit:${RESET}`);
console.log(`   git add src/middlewares/tournamentModerator.js`);
console.log(`           src/controllers/tournaments.controller.js`);
console.log(`           tests/middlewares/tournamentModerator.test.js`);
console.log(`           tests/controllers/tournaments.controller.test.js`);
console.log(`           scripts/f1-3-create-files.cjs`);
console.log(`           scripts/f1-3-fix-express-import.cjs`);
console.log(`           scripts/f1-3-fix-uuids.cjs`);
console.log('');
console.log(`   git commit -m "feat(tournaments): controller + RBAC fino F1.3" \\`);
console.log(`     -m "8 handlers: getTournaments, createTournament, getTournamentById, updateTournamentStatus, registerTeam, registerMatchResult, registerDraftAction, changeModerator." \\`);
console.log(`     -m "Middleware requireTournamentModerator (ADR-011 D7): OWNER/ADMIN bypass; VETERANO/MIEMBRO solo si moderator_id === req.user.id." \\`);
console.log(`     -m "Tests: 14 middleware + 49 controller = 63 nuevos."`);
console.log('');
console.log(`${BOLD}3. Push:${RESET}`);
console.log(`   git push origin main`);
console.log('');
console.log(`${BOLD}4. Reportar resultado${RESET} (pegame la salida final de vitest).`);
console.log('');
log(OK, 'Script completado sin errores.');
process.exit(0);