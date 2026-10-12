#!/usr/bin/env node
// scripts/f1-4-create-routes.cjs
//
// F1.4 — Crea src/routes/tournaments.routes.js y monta el router en server.js.
//
// Uso:
//   node scripts/f1-4-create-routes.cjs           # modo normal (idempotente)
//   node scripts/f1-4-create-routes.cjs --force   # sobreescribe el router si existe
//
// Qué hace (7 pasos):
//   [1/7] Verifica entorno (package.json, server.js, src/routes/, controller, middleware, auth).
//   [2/7] Backup del HEAD + working tree en backups/pre-f14-commit.txt.
//   [3/7] Crea src/routes/tournaments.routes.js (con fs.writeFileSync).
//   [4/7] Inserta el import + mount en server.js (con split/splice, sin replace).
//   [5/7] node --check en ambos archivos.
//   [6/7] npx vitest run (espera 642 passing).
//   [7/7] Imprime instrucciones de commit + curl para smoke test manual.
//
// Reglas del proyecto respetadas:
//   - Windows CMD friendly (no grep/cat/ls/sed).
//   - .cjs con require (no import).
//   - node --check después de cada archivo modificado.
//   - NUNCA content.replace() con strings multi-línea.
//   - Idempotente: no sobreescribe sin --force.
//   - No duplica mount si ya existe.
//
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');

// ============================================================
// CONSTANTES
// ============================================================

const ROOT = process.cwd();
const FORCE = process.argv.includes('--force');

const PATHS = {
  packageJson: path.join(ROOT, 'package.json'),
  serverJs: path.join(ROOT, 'server.js'),
  routesDir: path.join(ROOT, 'src', 'routes'),
  routerFile: path.join(ROOT, 'src', 'routes', 'tournaments.routes.js'),
  controllerFile: path.join(ROOT, 'src', 'controllers', 'tournaments.controller.js'),
  middlewareFile: path.join(ROOT, 'src', 'middlewares', 'tournamentModerator.js'),
  authFile: path.join(ROOT, 'src', 'middlewares', 'auth.js'),
  backupsDir: path.join(ROOT, 'backups'),
  backupFile: path.join(ROOT, 'backups', 'pre-f14-commit.txt')
};

// Colores ANSI (Windows CMD moderno los soporta desde Win10)
const C = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

// ============================================================
// HELPERS
// ============================================================

function log(msg) {
  console.log(msg);
}

function ok(msg) {
  log(`${C.green}[OK]${C.reset}   ${msg}`);
}

function warn(msg) {
  log(`${C.yellow}[WARN]${C.reset} ${msg}`);
}

function fail(msg) {
  log(`${C.red}[FAIL]${C.reset} ${msg}`);
}

function info(msg) {
  log(`${C.cyan}[INFO]${C.reset} ${msg}`);
}

function step(n, total, msg) {
  log(`\n${C.blue}[${n}/${total}]${C.reset} ${msg}`);
}

function die(msg) {
  fail(msg);
  process.exit(1);
}

// Detecta el EOL dominante de un string: \r\n (Windows) o \n (Unix).
function detectEol(content) {
  const crlfCount = (content.match(/\r\n/g) || []).length;
  const lfOnly = (content.match(/(?<!\r)\n/g) || []).length;
  return crlfCount > lfOnly ? '\r\n' : '\n';
}

// ============================================================
// PASO 1 — Verificar entorno
// ============================================================

function verifyEnvironment() {
  step(1, 7, 'Verificando entorno...');

  if (!fs.existsSync(PATHS.packageJson)) {
    die(`No existe package.json en ${ROOT}. ¿Estás corriendo el script desde la raíz del repo?`);
  }
  ok('package.json encontrado');

  if (!fs.existsSync(PATHS.serverJs)) {
    die(`No existe server.js en ${ROOT}.`);
  }
  ok('server.js encontrado');

  if (!fs.existsSync(PATHS.routesDir)) {
    die(`No existe src/routes/. ¿Estás en el repo correcto?`);
  }
  ok('src/routes/ encontrado');

  if (!fs.existsSync(PATHS.controllerFile)) {
    die(`No existe src/controllers/tournaments.controller.js (F1.3 no está aplicado).`);
  }
  ok('src/controllers/tournaments.controller.js encontrado');

  if (!fs.existsSync(PATHS.middlewareFile)) {
    die(`No existe src/middlewares/tournamentModerator.js (F1.3 no está aplicado).`);
  }
  ok('src/middlewares/tournamentModerator.js encontrado');

  if (!fs.existsSync(PATHS.authFile)) {
    die(`No existe src/middlewares/auth.js.`);
  }
  ok('src/middlewares/auth.js encontrado');

  // Verificar que estamos en un repo git
  try {
    const head = execSync('git rev-parse --short HEAD', { cwd: ROOT, encoding: 'utf8' }).trim();
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: ROOT, encoding: 'utf8' }).trim();
    info(`HEAD: ${head} (branch: ${branch})`);

    if (branch !== 'main') {
      warn(`Estás en la branch "${branch}", no en "main". Continuá solo si es intencional.`);
    }
  } catch (err) {
    die(`No se pudo ejecutar git rev-parse. ¿Tenés git instalado y estás en un repo?`);
  }
}

// ============================================================
// PASO 2 — Backup
// ============================================================

function createBackup() {
  step(2, 7, 'Creando backup...');

  if (!fs.existsSync(PATHS.backupsDir)) {
    fs.mkdirSync(PATHS.backupsDir, { recursive: true });
    info(`Directorio backups/ creado.`);
  }

  let headHash = '(desconocido)';
  let headMsg = '(desconocido)';
  let gitStatus = '';

  try {
    headHash = execSync('git rev-parse HEAD', { cwd: ROOT, encoding: 'utf8' }).trim();
    headMsg = execSync('git log -1 --pretty=%s', { cwd: ROOT, encoding: 'utf8' }).trim();
    gitStatus = execSync('git status --porcelain', { cwd: ROOT, encoding: 'utf8' }).trim();
  } catch (err) {
    warn(`No se pudo obtener info completa de git: ${err.message}`);
  }

  const timestamp = new Date().toISOString();
  const content = [
    '='.repeat(64),
    'BACKUP PRE-F1.4 — Sistema de Torneos (routes + mount)',
    '='.repeat(64),
    '',
    `Timestamp:  ${timestamp}`,
    `Commit:     ${headHash}`,
    `Mensaje:    ${headMsg}`,
    `Branch:     main`,
    '',
    '--- git status --porcelain ---',
    gitStatus || '(working tree limpio)',
    '',
    '='.repeat(64),
    ''
  ].join('\n');

  fs.writeFileSync(PATHS.backupFile, content, 'utf8');
  ok(`Backup guardado en backups/pre-f14-commit.txt (HEAD: ${headHash.slice(0, 8)})`);
}

// ============================================================
// PASO 3 — Crear src/routes/tournaments.routes.js
// ============================================================

const ROUTER_CONTENT = `// src/routes/tournaments.routes.js
//
// ADR-011 — Router del Sistema de Torneos (F1.4).
//
// Monta los 8 handlers de tournaments.controller.js con su cadena de
// middlewares. Sin lógica: solo enrutamiento.
//
// Política de acceso (ADR-011 D7, D8 + Anexo III Art. 24.3):
//   - Todo el router requiere autenticación (requireAuth global).
//   - POST /, PATCH /:id/status, PATCH /:id/moderator → ADMIN/OWNER.
//   - POST /:id/matches/:mid/result y /draft → requireTournamentModerator
//     (RBAC fino: OWNER/ADMIN bypass, VETERANO/MIEMBRO solo si son el
//     moderador designado del torneo).
//   - GET /, GET /:id, POST /:id/register → solo requireAuth.
//
import { Router } from 'express';
import {
  getTournaments,
  createTournament,
  getTournamentById,
  updateTournamentStatus,
  registerTeam,
  registerMatchResult,
  registerDraftAction,
  changeModerator
} from '../controllers/tournaments.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.js';
import { requireTournamentModerator } from '../middlewares/tournamentModerator.js';

const router = Router();

// Auth global del router
router.use(requireAuth);

// ========== 1. LISTAR TORNEOS ==========
router.get('/', getTournaments);

// ========== 2. CREAR TORNEO (solo ADMIN/OWNER) ==========
router.post('/', requireRole('ADMIN', 'OWNER'), createTournament);

// ========== 3. DETALLE DEL TORNEO ==========
router.get('/:id', getTournamentById);

// ========== 4. CAMBIAR ESTADO (solo ADMIN/OWNER) ==========
router.patch('/:id/status', requireRole('ADMIN', 'OWNER'), updateTournamentStatus);

// ========== 5. REGISTRAR EQUIPO ==========
router.post('/:id/register', registerTeam);

// ========== 6. REGISTRAR RESULTADO (RBAC fino) ==========
router.post('/:id/matches/:mid/result', requireTournamentModerator, registerMatchResult);

// ========== 7. REGISTRAR DRAFT (RBAC fino) ==========
router.post('/:id/matches/:mid/draft', requireTournamentModerator, registerDraftAction);

// ========== 8. REASIGNAR MODERADOR (solo ADMIN/OWNER) ==========
router.patch('/:id/moderator', requireRole('ADMIN', 'OWNER'), changeModerator);

export default router;
`;

function createRouterFile() {
  step(3, 7, 'Creando src/routes/tournaments.routes.js...');

  if (fs.existsSync(PATHS.routerFile)) {
    if (!FORCE) {
      warn(`El archivo ${PATHS.routerFile} ya existe. Usá --force para sobreescribir.`);
      info('Saltando creación del router (idempotente).');
      return false;
    }
    warn(`--force activo: sobreescribiendo ${PATHS.routerFile}.`);
  }

  fs.writeFileSync(PATHS.routerFile, ROUTER_CONTENT, 'utf8');
  ok(`Router creado: src/routes/tournaments.routes.js (${ROUTER_CONTENT.split('\n').length} líneas)`);
  return true;
}

// ============================================================
// PASO 4 — Modificar server.js (import + mount)
// ============================================================

function modifyServerJs() {
  step(4, 7, 'Modificando server.js (import + mount)...');

  const original = fs.readFileSync(PATHS.serverJs, 'utf8');
  const eol = detectEol(original);
  const lines = original.split(/\r?\n/);

  info(`EOL detectado: ${eol === '\r\n' ? 'CRLF (Windows)' : 'LF (Unix)'}`);

  // --- 4a. Insertar import ---
  const importLine = "import tournamentsRoutes from './src/routes/tournaments.routes.js';";
  const importAlreadyExists = lines.some((line) => line.trim() === importLine);

  if (importAlreadyExists) {
    info('El import de tournamentsRoutes ya existe en server.js. No se duplica.');
  } else {
    // Buscar el último import de un router de './src/routes/...'
    let lastRouteImportIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (/^import\s+\w+\s+from\s+['"]\.\/src\/routes\/.*['"];?\s*$/.test(lines[i])) {
        lastRouteImportIdx = i;
      }
    }

    if (lastRouteImportIdx === -1) {
      die('No se encontró ningún import de ./src/routes/ en server.js. Abortando para no romper el archivo.');
    }

    // Insertar justo después del último import de routes
    lines.splice(lastRouteImportIdx + 1, 0, importLine);
    ok(`Import insertado después de la línea ${lastRouteImportIdx + 1}.`);
  }

  // --- 4b. Insertar mount ---
  const mountLine = "app.use('/api/tournaments', tournamentsRoutes);";
  const mountAlreadyExists = lines.some((line) => line.trim() === mountLine);

  if (mountAlreadyExists) {
    info('El mount de /api/tournaments ya existe en server.js. No se duplica.');
  } else {
    // Buscar la línea del mount de veteranRoutes (ancla)
    const veteranMountLine = "app.use('/api/veteran', veteranRoutes);";
    let anchorIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim() === veteranMountLine) {
        anchorIdx = i;
        break;
      }
    }

    if (anchorIdx === -1) {
      die(`No se encontró la línea "${veteranMountLine}" en server.js. Abortando para no insertar en el lugar equivocado.`);
    }

    // Insertar justo después del mount de veteran
    lines.splice(anchorIdx + 1, 0, '', mountLine);
    ok(`Mount insertado después de la línea ${anchorIdx + 1} (después de /api/veteran).`);
  }

  // --- 4c. Escribir el archivo ---
  const newContent = lines.join(eol);
  if (newContent === original) {
    info('server.js no cambió (idempotente).');
    return;
  }

  fs.writeFileSync(PATHS.serverJs, newContent, 'utf8');
  ok(`server.js actualizado (${original.length} → ${newContent.length} bytes).`);
}

// ============================================================
// PASO 5 — node --check
// ============================================================

function checkSyntax() {
  step(5, 7, 'Verificando sintaxis con node --check...');

  const files = [
    'src/routes/tournaments.routes.js',
    'server.js'
  ];

  for (const file of files) {
    const result = spawnSync('node', ['--check', file], {
      cwd: ROOT,
      encoding: 'utf8'
    });

    if (result.status !== 0) {
      fail(`node --check falló en ${file}:`);
      if (result.stderr) log(result.stderr);
      if (result.stdout) log(result.stdout);
      die(`Sintaxis inválida en ${file}. No se puede continuar.`);
    }
    ok(`node --check ${file}`);
  }
}

// ============================================================
// PASO 6 — npx vitest run
// ============================================================

function runTestSuite() {
  step(6, 7, 'Corriendo suite completa (npx vitest run)...');
  info('Esto puede tardar 30-90 segundos. Esperá...\n');

  const result = spawnSync('npx', ['vitest', 'run'], {
    cwd: ROOT,
    encoding: 'utf8',
    shell: true,
    stdio: 'inherit'
  });

  if (result.status !== 0) {
    fail('La suite de tests falló (exit code != 0).');
    fail('Los archivos creados NO se borraron para que puedas inspeccionar.');
    fail('Revisá la salida de arriba. Una vez resuelto, podés re-ejecutar el script.');
    process.exit(1);
  }

  ok('Suite completa pasó (exit code 0).');
  info('Verificá manualmente que el output diga "642 passing" (o el número esperado).');
}

// ============================================================
// PASO 7 — Instrucciones
// ============================================================

function printInstructions() {
  step(7, 7, 'Instrucciones finales');

  const baseUrl = 'http://localhost:3000';

  log('');
  log(`${C.green}${'='.repeat(64)}${C.reset}`);
  log(`${C.green}  F1.4 COMPLETADO — routes + mount listos${C.reset}`);
  log(`${C.green}${'='.repeat(64)}${C.reset}`);
  log('');
  log(`${C.cyan}Archivos afectados:${C.reset}`);
  log('  + src/routes/tournaments.routes.js  (NUEVO)');
  log('  ~ server.js                          (import + mount)');
  log('');
  log(`${C.cyan}PASO 1 — Verificar estado:${C.reset}`);
  log('  git status');
  log('  git diff server.js');
  log('');
  log(`${C.cyan}PASO 2 — Smoke test manual (levantar server primero):${C.reset}`);
  log('  npm run dev      # o: node server.js');
  log('');
  log(`  ${C.gray}# 2.1 — GET sin token → 401${C.reset}`);
  log(`  curl -i ${baseUrl}/api/tournaments`);
  log('');
  log(`  ${C.gray}# 2.2 — GET con token inválido → 401${C.reset}`);
  log(`  curl -i -H "Authorization: Bearer INVALID" ${baseUrl}/api/tournaments`);
  log('');
  log(`  ${C.gray}# 2.3 — POST sin token → 401${C.reset}`);
  log(`  curl -i -X POST ${baseUrl}/api/tournaments`);
  log('');
  log(`  ${C.gray}# 2.4 — POST con token MIEMBRO → 403${C.reset}`);
  log(`  curl -i -X POST -H "Authorization: Bearer <MIEMBRO_TOKEN>" -H "Content-Type: application/json" -d "{}" ${baseUrl}/api/tournaments`);
  log('');
  log(`  ${C.gray}# 2.5 — POST con token OWNER → 201/400 según body${C.reset}`);
  log(`  curl -i -X POST -H "Authorization: Bearer <OWNER_TOKEN>" -H "Content-Type: application/json" -d "{\\"name\\":\\"Test Torneo\\",\\"format\\":\\"SWISS+SE\\",\\"scope\\":\\"F1\\",\\"starts_at\\":\\"2026-11-01T00:00:00Z\\",\\"ends_at\\":\\"2026-11-03T00:00:00Z\\",\\"min_teams\\":4,\\"max_teams\\":8}" ${baseUrl}/api/tournaments`);
  log('');
  log(`${C.cyan}PASO 3 — Commit:${C.reset}`);
  log('  git add src/routes/tournaments.routes.js server.js');
  log('  git commit -m "feat(tournaments): routes + mount F1.4"');
  log('');
  log(`${C.cyan}PASO 4 — Push:${C.reset}`);
  log('  git push origin main');
  log('');
  log(`${C.gray}Recordá: el smoke test 2.5 con OWNER debe devolver 201 (torneo creado).${C.reset}`);
  log(`${C.gray}Si devuelve 400, es porque el body no matchea el Zod schema — revisá el payload.${C.reset}`);
  log('');
  log(`${C.green}Todo verde. Podés commitear y pushear.${C.reset}`);
  log('');
}

// ============================================================
// MAIN
// ============================================================

function main() {
  log('');
  log(`${C.cyan}${'='.repeat(64)}${C.reset}`);
  log(`${C.cyan}  F1.4 — Routes + mount del Sistema de Torneos (ADR-011)${C.reset}`);
  log(`${C.cyan}${'='.repeat(64)}${C.reset}`);

  if (FORCE) {
    warn('Modo --force activo: se sobreescribirán archivos existentes.');
  }

  try {
    verifyEnvironment();
    createBackup();
    createRouterFile();
    modifyServerJs();
    checkSyntax();
    runTestSuite();
    printInstructions();
  } catch (err) {
    fail(`Excepción no controlada: ${err.message}`);
    if (err.stack) log(err.stack);
    process.exit(1);
  }
}

main();