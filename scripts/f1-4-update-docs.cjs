#!/usr/bin/env node
// scripts/f1-4-update-docs.cjs
//
// F1.4 — Actualiza la documentación tras cerrar F1.4 (routes + mount).
//
// Uso:
//   node scripts/f1-4-update-docs.cjs           # modo normal
//   node scripts/f1-4-update-docs.cjs --dry-run # solo muestra qué haría
//
// Qué actualiza:
//   - docs/planning/PLAN_TRABAJO.md           → Sprint 8: F1.4 ✅ + evidencia
//   - docs/planning/PLAN_TRABAJO_TORNEOS.md   → F1.4 ✅ CERRADO + bloque de cierre
//   - docs/planning/BACKLOG.md                → BL-034 + histórico F1.4-TOURN
//   - API_REFERENCE.md                        → Sección Torneos + tabla rápida + banner
//   - ARCHITECTURE.md                         → Router + mount en §2.2
//
// Reglas del proyecto respetadas:
//   - Windows CMD friendly (no grep/cat/ls/sed).
//   - .cjs con require (no import).
//   - NUNCA content.replace() con strings multi-línea.
//   - Idempotente: si un doc ya tiene la marca de F1.4, avisa y no duplica.
//
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ============================================================
// CONFIGURACIÓN
// ============================================================

const ROOT = process.cwd();
const DRY_RUN = process.argv.includes('--dry-run');

const PATHS = {
  planTrabajo: path.join(ROOT, 'docs', 'planning', 'PLAN_TRABAJO.md'),
  planTorneos: path.join(ROOT, 'docs', 'planning', 'PLAN_TRABAJO_TORNEOS.md'),
  backlog: path.join(ROOT, 'docs', 'planning', 'BACKLOG.md'),
  apiRef: path.join(ROOT, 'docs', 'architecture', 'API_REFERENCE.md'),
  architecture: path.join(ROOT, 'docs', 'architecture', 'ARCHITECTURE.md'),
  backupsDir: path.join(ROOT, 'backups')
};

const COMMIT_HASH = '345f452';
const COMMIT_MSG = 'feat(tournaments): routes + mount F1.4';
const FECHA = '2026-10-12';
const ROUTER_LINES = 60; // líneas del router generado

// Colores ANSI
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

function ok(msg) { console.log(`${C.green}[OK]${C.reset}   ${msg}`); }
function warn(msg) { console.log(`${C.yellow}[WARN]${C.reset} ${msg}`); }
function fail(msg) { console.log(`${C.red}[FAIL]${C.reset} ${msg}`); }
function info(msg) { console.log(`${C.cyan}[INFO]${C.reset} ${msg}`); }
function skip(msg) { console.log(`${C.gray}[SKIP]${C.reset} ${msg}`); }
function step(n, total, msg) { console.log(`\n${C.blue}[${n}/${total}]${C.reset} ${msg}`); }
function die(msg) { fail(msg); process.exit(1); }

function readFile(filePath) {
  if (!fs.existsSync(filePath)) die(`No existe: ${filePath}`);
  return fs.readFileSync(filePath, 'utf8');
}

function detectEol(content) {
  const crlfCount = (content.match(/\r\n/g) || []).length;
  const lfOnly = (content.match(/(?<!\r)\n/g) || []).length;
  return crlfCount > lfOnly ? '\r\n' : '\n';
}

function writeFile(filePath, content) {
  if (DRY_RUN) {
    info(`[DRY-RUN] No escribiría: ${path.basename(filePath)}`);
    return;
  }
  fs.writeFileSync(filePath, content, 'utf8');
}

function backupDoc(filePath) {
  if (DRY_RUN) return;
  if (!fs.existsSync(PATHS.backupsDir)) {
    fs.mkdirSync(PATHS.backupsDir, { recursive: true });
  }
  const baseName = path.basename(filePath);
  const backupPath = path.join(PATHS.backupsDir, `pre-f14-docs-${baseName}`);
  fs.copyFileSync(filePath, backupPath);
  info(`Backup: backups/pre-f14-docs-${baseName}`);
}

// ============================================================
// PASO 1 — Verificar entorno
// ============================================================

function verifyEnvironment() {
  step(1, 7, 'Verificando entorno...');

  const required = [
    ['package.json', path.join(ROOT, 'package.json')],
    ['server.js', path.join(ROOT, 'server.js')],
    ['src/routes/tournaments.routes.js', path.join(ROOT, 'src', 'routes', 'tournaments.routes.js')],
    ['docs/planning/PLAN_TRABAJO.md', PATHS.planTrabajo],
    ['docs/planning/PLAN_TRABAJO_TORNEOS.md', PATHS.planTorneos],
    ['docs/planning/BACKLOG.md', PATHS.backlog],
    ['API_REFERENCE.md', PATHS.apiRef],
    ['ARCHITECTURE.md', PATHS.architecture]
  ];

  for (const [label, filePath] of required) {
    if (!fs.existsSync(filePath)) {
      die(`Falta ${label} (${filePath}). ¿Estás en la raíz del repo?`);
    }
    ok(`${label} encontrado`);
  }

  // Verificar que estamos en el commit esperado
  try {
    const headShort = execSync('git rev-parse --short HEAD', { cwd: ROOT, encoding: 'utf8' }).trim();
    info(`HEAD actual: ${headShort}`);

    if (headShort !== COMMIT_HASH) {
      warn(`HEAD no es ${COMMIT_HASH} (esperado tras cerrar F1.4).`);
      warn(`Asegurate de haber commiteado F1.4 antes de correr este script.`);
      warn(`Si estás en un commit posterior (docs/scripts), está OK.`);
    } else {
      ok(`HEAD coincide con el commit de F1.4`);
    }
  } catch (err) {
    warn(`No se pudo leer git HEAD: ${err.message}`);
  }
}

// ============================================================
// PASO 2 — Actualizar PLAN_TRABAJO.md
// ============================================================

function updatePlanTrabajo() {
  step(2, 7, 'Actualizando docs/planning/PLAN_TRABAJO.md...');

  const original = readFile(PATHS.planTrabajo);
  const eol = detectEol(original);
  const lines = original.split(/\r?\n/);

  // 2a. Detectar idempotencia
  const alreadyUpdated = lines.some((l) =>
    l.includes('F1.4') && l.includes('✅') && l.includes(COMMIT_HASH.slice(0, 7))
  );
  if (alreadyUpdated) {
    skip('PLAN_TRABAJO.md ya tiene la marca de F1.4 ✅ con el commit. No se duplica.');
    return;
  }

  let changes = 0;

  // 2b. Cambiar "| **F1.4** | 🏗️ | Router + mount en `server.js` | ⏳ Pendiente |"
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (/^\|\s*\*\*F1\.4\*\*\s*\|/.test(trimmed) && trimmed.includes('⏳ Pendiente')) {
      lines[i] = trimmed.replace('⏳ Pendiente', '✅ Cerrado');
      changes++;
      info(`Línea ${i + 1}: F1.4 marcado ✅ Cerrado`);
      break;
    }
  }

  // 2c. Actualizar "Progreso:" del Sprint 8 si menciona "F1.1 + F1.2 + F1.3 cerrados"
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('F1.1 + F1.2 + F1.3 cerrados')) {
      lines[i] = lines[i].replace('F1.1 + F1.2 + F1.3 cerrados', 'F1.1 + F1.2 + F1.3 + F1.4 cerrados');
      changes++;
      info(`Línea ${i + 1}: Progreso actualizado`);
      break;
    }
  }

  // 2d. Insertar bloque de evidencia después de la tabla de F1.4
  // Buscar la sección "### Documentos de fase" del Sprint 8 e insertar antes
  let insertIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === '### Documentos de fase' && i > 0) {
      // Verificar que estamos en el contexto del Sprint 8 (buscar hacia atrás)
      for (let j = i; j >= 0 && j > i - 50; j--) {
        if (lines[j].includes('SPRINT 8')) {
          insertIdx = i;
          break;
        }
      }
      if (insertIdx !== -1) break;
    }
  }

  if (insertIdx !== -1) {
    const evidenceBlock = [
      '',
      `### Evidencia de cierre F1.4 (${FECHA})`,
      '',
      `**Commit:** \`${COMMIT_HASH}\` — \`${COMMIT_MSG}\``,
      '',
      `**2 archivos afectados:**`,
      `- \`src/routes/tournaments.routes.js\` (NUEVO, ${ROUTER_LINES} líneas).`,
      `- \`server.js\` (import + mount, +3 líneas: 1 import + 1 blank + 1 mount).`,
      '',
      `**Verificado:**`,
      `- 8 endpoints montados: GET/POST /, GET /:id, PATCH /:id/status, POST /:id/register,`,
      `  POST /:id/matches/:mid/result, POST /:id/matches/:mid/draft, PATCH /:id/moderator.`,
      `- Middlewares encadenados: requireAuth (global) + requireRole (3 endpoints) +`,
      `  requireTournamentModerator (2 endpoints).`,
      `- Suite completa: 642 passing / 0 failing / 0 skipped.`,
      `- 0 regresiones.`,
      `- \`node --check\` limpio en router y server.js.`,
      `- Push: \`52f936d..${COMMIT_HASH} main -> main\`.`,
      '',
      `**Pendiente F1.5:** frontend (bracket + draft + resultados, 2-3 días).`,
      ''
    ];
    lines.splice(insertIdx, 0, ...evidenceBlock);
    changes++;
    info(`Bloque de cierre F1.4 insertado antes de "### Documentos de fase"`);
  } else {
    warn('No se encontró el ancla "### Documentos de fase" en Sprint 8. Bloque no insertado.');
  }

  if (changes === 0) {
    warn('No se aplicaron cambios en PLAN_TRABAJO.md');
    return;
  }

  // 2e. Escribir
  backupDoc(PATHS.planTrabajo);
  const newContent = lines.join(eol);
  writeFile(PATHS.planTrabajo, newContent);
  ok(`PLAN_TRABAJO.md actualizado (${changes} cambios, +${newContent.length - original.length} bytes)`);
}

// ============================================================
// PASO 3 — Actualizar PLAN_TRABAJO_TORNEOS.md
// ============================================================

function updatePlanTorneos() {
  step(3, 7, 'Actualizando docs/planning/PLAN_TRABAJO_TORNEOS.md...');

  const original = readFile(PATHS.planTorneos);
  const eol = detectEol(original);
  const lines = original.split(/\r?\n/);

  // 3a. Idempotencia
  const alreadyUpdated = lines.some((l) =>
    l.includes('F1.4') && l.includes('CERRADO') && l.includes(COMMIT_HASH.slice(0, 7))
  );
  if (alreadyUpdated) {
    skip('PLAN_TRABAJO_TORNEOS.md ya tiene F1.4 ✅ CERRADO con el commit. No se duplica.');
    return;
  }

  let changes = 0;

  // 3b. Cambiar el título "### F1.4 — Routes + mount en `server.js`" → "### F1.4 — Routes + mount en `server.js` ✅ CERRADO"
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('### F1.4 — Routes + mount') && !lines[i].includes('✅ CERRADO')) {
      lines[i] = lines[i] + ' ✅ CERRADO';
      changes++;
      info(`Línea ${i + 1}: título F1.4 marcado ✅ CERRADO`);
      break;
    }
  }

  // 3c. Marcar los 4 criterios de cierre
  const criterios = [
    '[ ] `GET /api/tournaments` responde 200/401.',
    '[ ] `POST /api/tournaments` sin token responde 401.',
    '[ ] `POST /api/tournaments` con token de MIEMBRO responde 403.',
    '[ ] Smoke test manual con Postman/curl.'
  ];
  for (let i = 0; i < lines.length; i++) {
    for (const crit of criterios) {
      if (lines[i].trim() === crit) {
        lines[i] = lines[i].replace('[ ]', '[x]');
        changes++;
      }
    }
  }

  // 3d. Marcar otros criterios de cierre F1.4 que aparezcan con "[ ]" en la sección F1.4
  // Buscar bloque F1.4 y marcar sus checkboxes
  let inF14 = false;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('### F1.4 — Routes + mount')) {
      inF14 = true;
      continue;
    }
    if (inF14 && lines[i].startsWith('### F1.5')) {
      inF14 = false;
      break;
    }
    if (inF14 && lines[i].includes('- [ ]')) {
      lines[i] = lines[i].replace('- [ ]', '- [x]');
      changes++;
    }
  }

  // 3e. Insertar bloque de cierre F1.4 antes de "### F1.5"
  let insertIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('### F1.5 — Frontend')) {
      insertIdx = i;
      break;
    }
  }

  if (insertIdx !== -1) {
    const cierreBlock = [
      '',
      `**Cierre F1.4 (${FECHA}):**`,
      '',
      `- **Commit:** \`${COMMIT_HASH}\` — \`${COMMIT_MSG}\``,
      `- **Archivos creados:** 1 (\`src/routes/tournaments.routes.js\`, ${ROUTER_LINES} líneas).`,
      `- **Archivos modificados:** 1 (\`server.js\`, +3 líneas: import + blank + mount).`,
      `- **Suite completa:** 642 passing / 0 failing / 0 skipped.`,
      `- **Regresiones:** 0.`,
      `- **Hallazgos de la sesión:**`,
      `  - H-F14-01: Node 24 emite warning DEP0190 al usar \`spawnSync\` con \`shell: true\` en scripts .cjs.`,
      `    No es un bug funcional; es un aviso de seguridad. Fix opcional: usar \`shell: false\` y pasar`,
      `    \`npx.cmd\` en Windows. Aplicar en futuros scripts.`,
      `- **Push:** \`52f936d..${COMMIT_HASH} main -> main\`.`,
      '',
      `**Pendiente F1.5:** frontend (bracket + draft + resultados, 2-3 días).`,
      ''
    ];
    lines.splice(insertIdx, 0, ...cierreBlock);
    changes++;
    info(`Bloque de cierre F1.4 insertado antes de F1.5`);
  } else {
    warn('No se encontró el ancla "### F1.5" en el doc. Bloque no insertado.');
  }

  // 3f. Actualizar tabla del "Estado actual del sistema" si tiene fila de router
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('`tournaments.routes.js`') && lines[i].includes('❌')) {
      lines[i] = lines[i].replace('❌ No existe', '✅ Creado (F1.4)');
      changes++;
      info(`Línea ${i + 1}: tabla "Estado actual" actualizada para tournaments.routes.js`);
    }
  }

  if (changes === 0) {
    warn('No se aplicaron cambios en PLAN_TRABAJO_TORNEOS.md');
    return;
  }

  backupDoc(PATHS.planTorneos);
  const newContent = lines.join(eol);
  writeFile(PATHS.planTorneos, newContent);
  ok(`PLAN_TRABAJO_TORNEOS.md actualizado (${changes} cambios, +${newContent.length - original.length} bytes)`);
}

// ============================================================
// PASO 4 — Actualizar BACKLOG.md
// ============================================================

function updateBacklog() {
  step(4, 7, 'Actualizando docs/planning/BACKLOG.md...');

  const original = readFile(PATHS.backlog);
  const eol = detectEol(original);
  const lines = original.split(/\r?\n/);

  // 4a. Idempotencia
  const alreadyUpdated = lines.some((l) =>
    l.includes('F1.4-TOURN') && l.includes(COMMIT_HASH.slice(0, 7))
  );
  if (alreadyUpdated) {
    skip('BACKLOG.md ya tiene F1.4-TOURN en el histórico. No se duplica.');
    return;
  }

  let changes = 0;

  // 4b. Actualizar nota de BL-034
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('**BL-034**') && lines[i].includes('F1.4 → F1.6')) {
      // Actualizar la nota agregando F1.4
      if (lines[i].includes('**F1.3 cerrado')) {
        lines[i] = lines[i].replace(
          '**F1.3 cerrado (controller + RBAC fino)**',
          '**F1.4 cerrado (routes + mount)** · F1.3 cerrado previamente'
        );
        changes++;
        info(`Línea ${i + 1}: BL-034 actualizado con F1.4`);
      }
      break;
    }
  }

  // 4c. Insertar entrada en el histórico "Completados"
  // Buscar la fila "F1.3-TOURN" y agregar F1.4-TOURN arriba
  let insertIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('**F1.3-TOURN**')) {
      insertIdx = i;
      break;
    }
  }

  if (insertIdx !== -1) {
    const newRow = `| **F1.4-TOURN** | 🏗️ | Router torneos + mount en server.js (8 endpoints montados) | ${FECHA} | \`${COMMIT_HASH.slice(0, 7)}\` |`;
    lines.splice(insertIdx, 0, newRow);
    changes++;
    info(`Fila F1.4-TOURN insertada en histórico de Completados`);
  } else {
    warn('No se encontró "F1.3-TOURN" en el histórico. Fila no insertada.');
  }

  // 4d. Actualizar contador de "Items completados" si existe
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('Items completados') && lines[i].includes('19')) {
      lines[i] = lines[i].replace('| 19 |', '| 20 |');
      changes++;
      info(`Línea ${i + 1}: contador de completados incrementado (19 → 20)`);
      break;
    }
  }

  if (changes === 0) {
    warn('No se aplicaron cambios en BACKLOG.md');
    return;
  }

  backupDoc(PATHS.backlog);
  const newContent = lines.join(eol);
  writeFile(PATHS.backlog, newContent);
  ok(`BACKLOG.md actualizado (${changes} cambios, +${newContent.length - original.length} bytes)`);
}

// ============================================================
// PASO 5 — Actualizar API_REFERENCE.md
// ============================================================

function updateApiReference() {
  step(5, 7, 'Actualizando API_REFERENCE.md...');

  const original = readFile(PATHS.apiRef);
  const eol = detectEol(original);
  const lines = original.split(/\r?\n/);

  // 5a. Idempotencia
  const alreadyUpdated = lines.some((l) =>
    l.includes('Módulo de Torneos') && l.includes('/api/tournaments')
  );
  if (alreadyUpdated) {
    skip('API_REFERENCE.md ya tiene la sección de Torneos. No se duplica.');
    return;
  }

  let changes = 0;

  // 5b. Agregar filas en la tabla rápida de rutas
  // Buscar el final del bloque Events v2 BM y agregar 8 filas de Tournaments
  let insertTableIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('**Events v2 BM**') && lines[i].includes('/api/events-v2/bm/:eventId/stats')) {
      insertTableIdx = i + 1;
      break;
    }
  }

  if (insertTableIdx !== -1) {
    const tournamentRows = [
      `| **Tournaments** | \`/api/tournaments\` | \`GET\` | Autenticado | Listar torneos con filtros \`status\` y \`scope\` |`,
      `| **Tournaments** | \`/api/tournaments\` | \`POST\` | \`ADMIN\` / \`OWNER\` | Crear torneo |`,
      `| **Tournaments** | \`/api/tournaments/:id\` | \`GET\` | Autenticado | Detalle + bracket + roster + historial moderador |`,
      `| **Tournaments** | \`/api/tournaments/:id/status\` | \`PATCH\` | \`ADMIN\` / \`OWNER\` | Cambiar estado (DRAFT → REGISTRATION → ONGOING → FINISHED / CANCELLED) |`,
      `| **Tournaments** | \`/api/tournaments/:id/register\` | \`POST\` | Autenticado | Registrar equipo (capitán propio o ADMIN/OWNER) |`,
      `| **Tournaments** | \`/api/tournaments/:id/matches/:mid/result\` | \`POST\` | Autenticado + \`requireTournamentModerator\` | Registrar resultado de match |`,
      `| **Tournaments** | \`/api/tournaments/:id/matches/:mid/draft\` | \`POST\` | Autenticado + \`requireTournamentModerator\` | Registrar ban/pick del draft |`,
      `| **Tournaments** | \`/api/tournaments/:id/moderator\` | \`PATCH\` | \`ADMIN\` / \`OWNER\` | Reasignar moderador con motivo |`
    ];
    lines.splice(insertTableIdx, 0, ...tournamentRows);
    changes++;
    info(`8 filas de Tournaments insertadas en tabla rápida`);
  } else {
    warn('No se encontró el ancla "Events v2 BM" en la tabla rápida.');
  }

  // 5c. Insertar la sección completa al final, antes del footer
  // Buscar "*Versión: v4.8.15"
  let sectionIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('*Versión:') && lines[i].includes('Actualizado:')) {
      sectionIdx = i;
      break;
    }
  }

  if (sectionIdx !== -1) {
    const tournamentSection = [
      '',
      '---',
      '',
      '## 9. Módulo de Torneos (`/api/tournaments`) — F1 (ADR-011)',
      '',
      '> **Módulo nuevo (v4.9.0, F1.4)** — Sistema de Torneos Internos según RFC-002 + Anexo III + ADR-011.',
      '>',
      '> **Fuente de verdad del reglamento:** [`docs/normativa/ANEXO-III-torneos.md`](docs/normativa/ANEXO-III-torneos.md).',
      '> **Decisión arquitectónica:** [`docs/adr/ADR-011-sistema-torneos.md`](docs/adr/ADR-011-sistema-torneos.md).',
      '',
      '### Política de acceso',
      '',
      '| Rol | Puede operar |',
      '|---|---|',
      '| `OWNER` | Cualquier torneo (bypass total en `requireTournamentModerator`) |',
      '| `ADMIN` | Cualquier torneo (bypass total en `requireTournamentModerator`) |',
      '| `VETERANO` | Solo torneos donde `moderator_id === req.user.id` |',
      '| `MIEMBRO` | Solo torneos donde `moderator_id === req.user.id` |',
      '',
      '### `GET /api/tournaments`',
      '',
      'Listar torneos con filtros opcionales.',
      '',
      '- **Acceso:** Autenticado.',
      '- **Query Params:**',
      '  | Param | Valores | Descripción |',
      '  |---|---|---|',
      '  | `status` | `DRAFT` \\| `REGISTRATION` \\| `ONGOING` \\| `FINISHED` \\| `CANCELLED` | Filtrar por estado |',
      '  | `scope` | `F1` \\| `F2` \\| `F3` \\| `F4` | Filtrar por fase |',
      '- **Response Exitosa (200 OK):**',
      '  ```json',
      '  {',
      '    "success": true,',
      '    "total": 2,',
      '    "tournaments": [ { "id": "uuid", "name": "Torneo Test F1", "format": "SWISS+SE", "scope": "F1", "status": "DRAFT", ... } ]',
      '  }',
      '  ```',
      '- **Errores Posibles:**',
      '  - `400 INVALID_STATUS_FILTER`: status no permitido.',
      '  - `400 INVALID_SCOPE_FILTER`: scope no permitido.',
      '  - `401 AUTH_TOKEN_REQUIRED`: sin token.',
      '',
      '### `POST /api/tournaments`',
      '',
      'Crear un nuevo torneo (estado inicial DRAFT).',
      '',
      '- **Acceso:** `ADMIN` / `OWNER`.',
      '- **Validación:** Zod (`TournamentCreateSchema`).',
      '- **Request Body:**',
      '  ```json',
      '  {',
      '    "name": "Torneo Interno W45",',
      '    "format": "SWISS+SE",',
      '    "scope": "F1",',
      '    "starts_at": "2026-11-01T00:00:00Z",',
      '    "ends_at": "2026-11-03T00:00:00Z",',
      '    "min_teams": 4,',
      '    "max_teams": 8,',
      '    "moderator_id": "uuid-opcional",',
      '    "metadata": {}',
      '  }',
      '  ```',
      '- **Response Exitosa (201 Created):**',
      '  ```json',
      '  { "success": true, "message": "Torneo creado", "tournament": { "id": "uuid", "status": "DRAFT", ... } }',
      '  ```',
      '- **Errores Posibles:**',
      '  - `400 VALIDATION_ERROR`: body no cumple Zod (Anexo III Art. 8: F1 → 4-8 equipos).',
      '  - `403 INSUFFICIENT_PERMISSIONS`: rol no es ADMIN/OWNER.',
      '',
      '### `GET /api/tournaments/:id`',
      '',
      'Detalle completo de un torneo.',
      '',
      '- **Acceso:** Autenticado.',
      '- **Response Exitosa (200 OK):**',
      '  ```json',
      '  {',
      '    "success": true,',
      '    "tournament": { ... },',
      '    "participants": [ ... ],',
      '    "matches": [ ... ],',
      '    "moderator_history": [ ... ]',
      '  }',
      '  ```',
      '- **Errores Posibles:** `400 INVALID_TOURNAMENT_ID`, `404 TOURNAMENT_NOT_FOUND`.',
      '',
      '### `PATCH /api/tournaments/:id/status`',
      '',
      'Cambiar el estado del torneo.',
      '',
      '- **Acceso:** `ADMIN` / `OWNER`.',
      '- **Transiciones válidas:**',
      '  - `DRAFT` → `REGISTRATION` \\| `CANCELLED`',
      '  - `REGISTRATION` → `ONGOING` \\| `CANCELLED`',
      '  - `ONGOING` → `FINISHED` \\| `CANCELLED`',
      '  - `FINISHED`, `CANCELLED`: terminales.',
      '- **Request Body:**',
      '  ```json',
      '  { "status": "REGISTRATION", "reason": "motivo-opcional" }',
      '  ```',
      '  - `reason` es obligatorio cuando `status = "CANCELLED"` (trazabilidad Anexo III Art. 22).',
      '- **Errores Posibles:**',
      '  - `400 INVALID_STATUS_TRANSITION`: transición no permitida.',
      '  - `400 VALIDATION_ERROR`: CANCELLED sin motivo.',
      '',
      '### `POST /api/tournaments/:id/register`',
      '',
      'Registrar un equipo (5 titulares + 1 suplente opcional).',
      '',
      '- **Acceso:** Autenticado + capitán propio o `ADMIN`/`OWNER`.',
      '- **Request Body:**',
      '  ```json',
      '  {',
      '    "team_name": "Alpha Squad",',
      '    "captain_user_id": "uuid",',
      '    "roster": [',
      '      { "user_id": "uuid", "role": "Interceptor", "is_sub": false },',
      '      { "user_id": "uuid", "role": "Support",     "is_sub": false },',
      '      { "user_id": "uuid", "role": "Heavy",       "is_sub": true  }',
      '    ]',
      '  }',
      '  ```',
      '- **Errores Posibles:**',
      '  - `400 TOURNAMENT_NOT_IN_REGISTRATION`: el torneo no está en REGISTRATION.',
      '  - `400 VALIDATION_ERROR`: roster inválido (Zod).',
      '  - `403 NOT_TEAM_CAPTAIN`: no sos capitán ni privilegiado.',
      '  - `409 TEAM_NAME_ALREADY_EXISTS`: team_name duplicado en el torneo.',
      '',
      '### `POST /api/tournaments/:id/matches/:mid/result`',
      '',
      'Registrar el resultado de un match (Bo3 / Bo5).',
      '',
      '- **Acceso:** Autenticado + `requireTournamentModerator` (OWNER/ADMIN bypass, VETERANO/MIEMBRO solo si son moderador del torneo).',
      '- **Request Body:**',
      '  ```json',
      '  { "score_a": 2, "score_b": 1, "best_of": 3, "notes": "opcional" }',
      '  ```',
      '- **Errores Posibles:**',
      '  - `400 BEST_OF_MISMATCH`: best_of inconsistente con el match.',
      '  - `400 VALIDATION_ERROR`: empate o score inválido (Zod superRefine).',
      '  - `403 TOURNAMENT_NOT_MODERATED_BY_YOU`: no sos el moderador.',
      '  - `404 MATCH_NOT_FOUND`: el match no existe o no pertenece al torneo.',
      '',
      '### `POST /api/tournaments/:id/matches/:mid/draft`',
      '',
      'Registrar una acción del draft (ban/pick).',
      '',
      '- **Acceso:** Autenticado + `requireTournamentModerator`.',
      '- **Request Body:**',
      '  ```json',
      '  {',
      '    "game_number": 1,',
      '    "team_id": "uuid",',
      '    "action": "BAN",',
      '    "aircraft_id": "101",',
      '    "order_index": 1',
      '  }',
      '  ```',
      '- **Errores Posibles:**',
      '  - `400 TEAM_NOT_IN_MATCH`: team_id no pertenece al match.',
      '  - `409 DRAFT_ORDER_ALREADY_USED`: order_index duplicado.',
      '',
      '### `PATCH /api/tournaments/:id/moderator`',
      '',
      'Reasignar el moderador designado (ADR-011 D8).',
      '',
      '- **Acceso:** `ADMIN` / `OWNER`.',
      '- **Request Body:**',
      '  ```json',
      '  { "moderator_id": "uuid", "reason": "motivo 5-500 chars" }',
      '  ```',
      '- **Errores Posibles:**',
      '  - `400 SAME_MODERATOR`: el nuevo moderador es el mismo que el actual.',
      '  - `400 VALIDATION_ERROR`: motivo inválido.',
      '',
      '### Referencias',
      '',
      '- [`docs/adr/ADR-011-sistema-torneos.md`](docs/adr/ADR-011-sistema-torneos.md)',
      '- [`docs/normativa/ANEXO-III-torneos.md`](docs/normativa/ANEXO-III-torneos.md)',
      '- [`docs/rfc/RFC-002-sistema-torneos.md`](docs/rfc/RFC-002-sistema-torneos.md)',
      '- [`docs/planning/PLAN_TRABAJO_TORNEOS.md`](docs/planning/PLAN_TRABAJO_TORNEOS.md)',
      '- [`sql/045_tournaments.sql`](sql/045_tournaments.sql)',
      ''
    ];
    lines.splice(sectionIdx, 0, ...tournamentSection);
    changes++;
    info(`Sección "## 9. Módulo de Torneos" insertada antes del footer`);
  } else {
    warn('No se encontró el ancla "*Versión:" en API_REFERENCE.md.');
  }

  // 5d. Actualizar banner de sincronización (mención a Sprint 8)
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('Próxima revisión:** al cerrar el Sprint 8')) {
      // No lo tocamos, ya menciona Sprint 8
      break;
    }
  }

  if (changes === 0) {
    warn('No se aplicaron cambios en API_REFERENCE.md');
    return;
  }

  backupDoc(PATHS.apiRef);
  const newContent = lines.join(eol);
  writeFile(PATHS.apiRef, newContent);
  ok(`API_REFERENCE.md actualizado (${changes} cambios, +${newContent.length - original.length} bytes)`);
}

// ============================================================
// PASO 6 — Actualizar ARCHITECTURE.md
// ============================================================

function updateArchitecture() {
  step(6, 7, 'Actualizando ARCHITECTURE.md...');

  const original = readFile(PATHS.architecture);
  const eol = detectEol(original);
  const lines = original.split(/\r?\n/);

  // 6a. Idempotencia
  const alreadyUpdated = lines.some((l) =>
    l.includes('tournaments.routes.js') && l.includes('Sistema de Torneos')
  );
  if (alreadyUpdated) {
    skip('ARCHITECTURE.md ya tiene tournaments.routes.js listado. No se duplica.');
    return;
  }

  let changes = 0;

  // 6b. Agregar a la lista de routers en "/src/routes/"
  // Buscar la línea de veteran.routes.js y agregar la nueva después
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('veteran.routes.js') && lines[i].includes('mentor')) {
      const newLine = `  - \`tournaments.routes.js\`: **Sistema de Torneos Internos (RFC-002 / ADR-011).** 8 endpoints montados con requireAuth global + requireRole en 3 + requireTournamentModerator en 2.`;
      lines.splice(i + 1, 0, newLine);
      changes++;
      info(`Línea ${i + 2}: tournaments.routes.js agregado a lista de routers`);
      break;
    }
  }

  // 6c. Agregar mount en el diagrama de "/api/..."
  // Buscar "└── /api/presence, /api/profile, /api/settings, /api/normativas"
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('/api/presence') && lines[i].includes('/api/normativas')) {
      // Insertar una línea antes, agregando /api/tournaments
      const newLine = "  │  ├── /api/tournaments (Sistema de Torneos — RFC-002 / ADR-011)            │";
      lines.splice(i, 0, newLine);
      changes++;
      info(`Línea ${i + 1}: mount /api/tournaments agregado al diagrama`);
      break;
    }
  }

  if (changes === 0) {
    warn('No se aplicaron cambios en ARCHITECTURE.md');
    return;
  }

  backupDoc(PATHS.architecture);
  const newContent = lines.join(eol);
  writeFile(PATHS.architecture, newContent);
  ok(`ARCHITECTURE.md actualizado (${changes} cambios, +${newContent.length - original.length} bytes)`);
}

// ============================================================
// PASO 7 — Instrucciones finales
// ============================================================

function printInstructions() {
  step(7, 7, 'Instrucciones finales');

  console.log('');
  console.log(`${C.green}${'='.repeat(64)}${C.reset}`);
  console.log(`${C.green}  F1.4 DOCS COMPLETADO${C.reset}`);
  console.log(`${C.green}${'='.repeat(64)}${C.reset}`);
  console.log('');

  if (DRY_RUN) {
    console.log(`${C.yellow}Modo --dry-run: ningún archivo fue modificado.${C.reset}`);
    console.log(`${C.gray}Corré sin --dry-run para aplicar los cambios.${C.reset}`);
    return;
  }

  console.log(`${C.cyan}Documentos actualizados:${C.reset}`);
  console.log('  ~ docs/planning/PLAN_TRABAJO.md');
  console.log('  ~ docs/planning/PLAN_TRABAJO_TORNEOS.md');
  console.log('  ~ docs/planning/BACKLOG.md');
  console.log('  ~ API_REFERENCE.md');
  console.log('  ~ ARCHITECTURE.md');
  console.log('');
  console.log(`${C.cyan}Backups:${C.reset}`);
  console.log('  ~ backups/pre-f14-docs-*.md');
  console.log('');
  console.log(`${C.cyan}PASO 1 — Verificar cambios:${C.reset}`);
  console.log('  git status');
  console.log('  git diff docs/planning/PLAN_TRABAJO_TORNEOS.md');
  console.log('');
  console.log(`${C.cyan}PASO 2 — Commit:${C.reset}`);
  console.log('  git add docs/planning/PLAN_TRABAJO.md docs/planning/PLAN_TRABAJO_TORNEOS.md docs/planning/BACKLOG.md API_REFERENCE.md ARCHITECTURE.md');
  console.log('  git commit -m "docs(tournaments): cerrar F1.4 en plan, backlog y API reference"');
  console.log('');
  console.log(`${C.cyan}PASO 3 — Push:${C.reset}`);
  console.log('  git push origin main');
  console.log('');
  console.log(`${C.cyan}PASO 4 — (Opcional) Commit de backups:${C.reset}`);
  console.log('  git add backups/pre-f14-docs-*.md');
  console.log('  git commit -m "chore(tournaments): snapshot docs pre-F1.4"');
  console.log('  git push origin main');
  console.log('');
  console.log(`${C.cyan}PASO 5 — (Opcional) Commit de scripts auxiliares:${C.reset}`);
  console.log('  git add scripts/f1-3-update-docs.cjs scripts/f1-4-create-routes.cjs scripts/f1-4-update-docs.cjs');
  console.log('  git commit -m "chore(scripts): helpers F1.3 y F1.4"');
  console.log('  git push origin main');
  console.log('');
  console.log(`${C.green}Siguiente paso: F1.5 — Frontend (bracket + draft + resultados).${C.reset}`);
  console.log('');
}

// ============================================================
// MAIN
// ============================================================

function main() {
  console.log('');
  console.log(`${C.cyan}${'='.repeat(64)}${C.reset}`);
  console.log(`${C.cyan}  F1.4 — Actualización de documentación tras cierre${C.reset}`);
  console.log(`${C.cyan}${'='.repeat(64)}${C.reset}`);

  if (DRY_RUN) {
    console.log('');
    warn('Modo --dry-run activo: NINGÚN archivo será modificado.');
  }

  try {
    verifyEnvironment();
    updatePlanTrabajo();
    updatePlanTorneos();
    updateBacklog();
    updateApiReference();
    updateArchitecture();
    printInstructions();
  } catch (err) {
    fail(`Excepción no controlada: ${err.message}`);
    if (err.stack) console.log(err.stack);
    process.exit(1);
  }
}

main();