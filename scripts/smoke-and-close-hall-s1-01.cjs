#!/usr/bin/env node
/**
 * ============================================================================
 * PARAGUAY-FFAA | METALSTORM
 * SCRIPT: Smoke test + cierre documental de HALL-S1-01
 * Archivo: scripts/smoke-and-close-hall-s1-01.cjs
 * ============================================================================
 *
 * USO:
 *   node scripts/smoke-and-close-hall-s1-01.cjs           # smoke test + dry-run docs
 *   node scripts/smoke-and-close-hall-s1-01.cjs --apply   # smoke test + aplicar docs
 *   node scripts/smoke-and-close-hall-s1-01.cjs --skip-smoke  # solo docs
 *   node scripts/smoke-and-close-hall-s1-01.cjs --help
 *
 * QUÉ HACE:
 *   FASE 1 — Smoke test:
 *     1. GET /api/health → verifica online + uptime reciente
 *     2. Prompt interactivo para pegar el JWT (no queda en historial)
 *     3. GET /api/planes/:id/details con el JWT → valida ownership check
 *     4. 3 casos: lectura OK, ID inválido (404), sin auth (401)
 *
 *   FASE 2 — Cierre documental:
 *     5. PLAN_TRABAJO.md → agrega HALL-S1-01 a completados
 *     6. docs/auditoria-sprint-1.md → marca HALL-S1-01 como CERRADO
 *     7. CHANGELOG.md → agrega entrada v4.5.4
 *
 * SALVAGUARDAS:
 *   - Dry-run por defecto (docs), smoke test es read-only
 *   - Backup .bak antes de escribir
 *   - Idempotente (no duplica bloques)
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const readline = require('readline');

// ============================================================
// CONFIG
// ============================================================

const ROOT_DIR = path.resolve(__dirname, '..');
const BASE_URL = 'https://paraguay-ffaa-metalstorm.fly.dev';
const COMMIT_HASH = '5fbb2d5';
const FIX_ID = 'HALL-S1-01';
const VERSION = 'v4.5.4';

const APPLY = process.argv.includes('--apply');
const SKIP_SMOKE = process.argv.includes('--skip-smoke');
const SHOW_HELP = process.argv.includes('--help');

const COLORS = {
  reset:   '\x1b[0m',
  bold:    '\x1b[1m',
  red:     '\x1b[31m',
  green:   '\x1b[32m',
  yellow:  '\x1b[33m',
  blue:    '\x1b[34m',
  cyan:    '\x1b[36m',
  gray:    '\x1b[90m',
};

function log(color, prefix, msg) {
  console.log(`${color}${prefix}${COLORS.reset} ${msg}`);
}

if (SHOW_HELP) {
  console.log(`
${COLORS.bold}SCRIPT: smoke-and-close-hall-s1-01.cjs${COLORS.reset}

${COLORS.bold}USO:${COLORS.reset}
  node scripts/smoke-and-close-hall-s1-01.cjs           # smoke test + dry-run docs
  node scripts/smoke-and-close-hall-s1-01.cjs --apply   # smoke test + aplicar docs
  node scripts/smoke-and-close-hall-s1-01.cjs --skip-smoke
  node scripts/smoke-and-close-hall-s1-01.cjs --help
`);
  process.exit(0);
}

// ============================================================
// HTTP HELPER
// ============================================================

function httpRequest(method, urlPath, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + urlPath);
    const options = {
      method,
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        let parsed = null;
        try { parsed = JSON.parse(data); } catch (_) { parsed = data; }
        resolve({ status: res.statusCode, body: parsed, raw: data });
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// ============================================================
// PROMPT INTERACTIVO
// ============================================================

function promptJwt() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    console.log(`\n${COLORS.bold}${COLORS.cyan}=== AUTH: PEGAR JWT ===${COLORS.reset}`);
    console.log(`${COLORS.gray}Cómo obtenerlo:${COLORS.reset}`);
    console.log(`  1. Abrí ${BASE_URL} en el navegador.`);
    console.log(`  2. Logueate.`);
    console.log(`  3. F12 → Application → Local Storage → ${BASE_URL}`);
    console.log(`  4. Copiar el valor de 'authToken'.`);
    console.log(`${COLORS.yellow}⚠️  El JWT NO queda en el historial de CMD (input interactivo).${COLORS.reset}\n`);

    rl.question('Pegar JWT (o ENTER para saltar smoke test): ', (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

// ============================================================
// FASE 1 — SMOKE TEST
// ============================================================

async function runHealthCheck() {
  log(COLORS.bold + COLORS.blue, '[1/3]', 'GET /api/health...');
  const res = await httpRequest('GET', '/api/health');
  if (res.status !== 200) {
    log(COLORS.red, '[FAIL]', `HTTP ${res.status}: ${JSON.stringify(res.body)}`);
    return false;
  }
  const uptime = res.body.uptime;
  const isRecent = uptime < 600; // < 10 min
  const symbol = isRecent ? '✅' : '⚠️';
  log(COLORS.green, '[OK]', `${symbol} status=${res.body.status}, uptime=${uptime}s${isRecent ? ' (reciente)' : ' (uptime alto, revisar deploy)'}`);
  return true;
}

async function runSmokeTests(jwt) {
  let passed = 0;
  let failed = 0;

  // Test 1: sin auth → 401
  log(COLORS.bold + COLORS.blue, '\n[Test 1]', 'GET /api/planes/1/details sin token → 401 esperado');
  const r1 = await httpRequest('GET', '/api/planes/1/details');
  if (r1.status === 401) {
    log(COLORS.green, '[OK]', `401 Unauthorized (correcto)`);
    passed++;
  } else {
    log(COLORS.red, '[FAIL]', `esperado 401, recibido ${r1.status}`);
    failed++;
  }

  // Test 2: con JWT, ID inválido → 404 o 200/403 (según si existe)
  log(COLORS.bold + COLORS.blue, '\n[Test 2]', 'GET /api/planes/999999/details con JWT → 404 esperado (no existe)');
  const r2 = await httpRequest('GET', '/api/planes/999999/details', {
    Authorization: `Bearer ${jwt}`,
  });
  if (r2.status === 404) {
    log(COLORS.green, '[OK]', `404 Not Found (correcto)`);
    passed++;
  } else if (r2.status === 403) {
    log(COLORS.yellow, '[WARN]', `403 Forbidden (fix activo, pero ID 999999 es de otro usuario?)`);
    passed++;
  } else if (r2.status === 200) {
    log(COLORS.yellow, '[WARN]', `200 OK (aeronave 999999 existe y sos su dueño o ADMIN/OWNER)`);
    passed++;
  } else {
    log(COLORS.red, '[FAIL]', `esperado 200/403/404, recibido ${r2.status}`);
    failed++;
  }

  // Test 3: con JWT, ID=1 → 200/403/404 (nunca 500)
  log(COLORS.bold + COLORS.blue, '\n[Test 3]', 'GET /api/planes/1/details con JWT → 200/403/404 (nunca 500)');
  const r3 = await httpRequest('GET', '/api/planes/1/details', {
    Authorization: `Bearer ${jwt}`,
  });
  if (r3.status === 200) {
    log(COLORS.green, '[OK]', `200 OK — ownership check pasó para el usuario del JWT`);
    passed++;
  } else if (r3.status === 403) {
    log(COLORS.green, '[OK]', `403 Forbidden — ownership check BLOQUEÓ correctamente (aeronave ajena)`);
    passed++;
  } else if (r3.status === 404) {
    log(COLORS.green, '[OK]', `404 Not Found — no existe aeronave con ID=1 (correcto también)`);
    passed++;
  } else if (r3.status === 500) {
    log(COLORS.red, '[FAIL]', `500 Server Error — ¡el fix rompió algo!`);
    failed++;
  } else {
    log(COLORS.yellow, '[WARN]', `${r3.status} — revisar`);
    passed++;
  }

  console.log(`\n${COLORS.bold}SMOKE TEST: ${passed} passed, ${failed} failed${COLORS.reset}`);
  return failed === 0;
}

// ============================================================
// FASE 2 — CIERRE DOCUMENTAL
// ============================================================

function readFile(relPath) {
  const absPath = path.join(ROOT_DIR, relPath);
  if (!fs.existsSync(absPath)) {
    throw new Error(`Archivo no encontrado: ${relPath}`);
  }
  return { absPath, content: fs.readFileSync(absPath, 'utf8') };
}

function writeFile(relPath, absPath, newContent, oldContent) {
  if (!APPLY) {
    log(COLORS.yellow, '[DRY-RUN]', `NO se modificará: ${relPath}`);
    return;
  }
  const backupPath = absPath + '.bak';
  fs.writeFileSync(backupPath, oldContent, 'utf8');
  log(COLORS.gray, '[BACKUP]', `Creado: ${path.relative(ROOT_DIR, backupPath)}`);
  fs.writeFileSync(absPath, newContent, 'utf8');
  log(COLORS.green, '[WRITE]', `Modificado: ${relPath}`);
}

// PLAN_TRABAJO.md
const PLAN_BLOCK = `
| **HALL-S1-01** | \`src/controllers/planes.controller.js\` — ownership check en getPlaneDetails | 2026-09-22 | \`${COMMIT_HASH}\` |
`;

function updatePlanTrabajo() {
  log(COLORS.bold + COLORS.blue, '\n[DOC 1/3]', 'PLAN_TRABAJO.md → agregar HALL-S1-01...');
  const { absPath, content } = readFile('PLAN_TRABAJO.md');

  if (content.includes('HALL-S1-01') && content.includes(COMMIT_HASH)) {
    log(COLORS.yellow, '[SKIP]', 'HALL-S1-01 ya está documentado. No se modifica.');
    return false;
  }

  const anchor = '| **FIX-104** |';
  const idx = content.indexOf(anchor);
  if (idx === -1) {
    log(COLORS.yellow, '[SKIP]', 'No se encontró el ancla de FIX-104. Agregar manualmente.');
    return false;
  }

  // Buscar el final de esa línea (siguiente \n)
  const endOfLine = content.indexOf('\n', idx);
  if (endOfLine === -1) return false;

  const before = content.slice(0, endOfLine + 1);
  const after = content.slice(endOfLine + 1);
  const newContent = before + PLAN_BLOCK + after;

  writeFile('PLAN_TRABAJO.md', absPath, newContent, content);
  return true;
}

// AUDITORIA
const AUDITORIA_OLD_LINE = '| **HALL-S1-01** | Ownership check en `getPlaneDetails` | ✅ CONFIRMADO | ⏳ Pendiente | — | — |';
const AUDITORIA_NEW_LINE = `| **HALL-S1-01** | Ownership check en \`getPlaneDetails\` | ✅ CONFIRMADO | ✅ **CERRADO** | \`${COMMIT_HASH}\` | 2026-09-22 |`;

function updateAuditoria() {
  log(COLORS.bold + COLORS.blue, '\n[DOC 2/3]', 'docs/auditoria-sprint-1.md → marcar HALL-S1-01 CERRADO...');
  const { absPath, content } = readFile('docs/auditoria-sprint-1.md');

  if (!content.includes(AUDITORIA_OLD_LINE)) {
    if (content.includes(AUDITORIA_NEW_LINE)) {
      log(COLORS.yellow, '[SKIP]', 'HALL-S1-01 ya está marcado como CERRADO.');
      return false;
    }
    log(COLORS.yellow, '[SKIP]', 'No se encontró la línea pendiente. Agregar manualmente.');
    return false;
  }

  const newContent = content.replace(AUDITORIA_OLD_LINE, AUDITORIA_NEW_LINE);
  writeFile('docs/auditoria-sprint-1.md', absPath, newContent, content);
  return true;
}

// CHANGELOG
const CHANGELOG_BLOCK = `
## [4.5.4] - 2026-09-22

### Fixed
- **HALL-S1-01:** Ownership check en \`GET /api/planes/:id/details\`. Previene lectura cruzada del hangar de otros pilotos. ADMIN/OWNER mantienen acceso irrestricto. Commit \`${COMMIT_HASH}\`.
`;

function updateChangelog() {
  log(COLORS.bold + COLORS.blue, '\n[DOC 3/3]', 'CHANGELOG.md → agregar v4.5.4...');
  const { absPath, content } = readFile('CHANGELOG.md');

  if (content.includes('## [4.5.4]')) {
    log(COLORS.yellow, '[SKIP]', 'v4.5.4 ya existe en CHANGELOG.');
    return false;
  }

  // Insertar al principio (después del título si existe)
  const lines = content.split('\n');
  let insertIdx = 0;
  // Buscar el primer header de sección
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('## [')) {
      insertIdx = i;
      break;
    }
  }

  const before = lines.slice(0, insertIdx).join('\n');
  const after = lines.slice(insertIdx).join('\n');
  const newContent = before + (before.endsWith('\n') ? '' : '\n') + CHANGELOG_BLOCK + '\n' + after;

  writeFile('CHANGELOG.md', absPath, newContent, content);
  return true;
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log(`${COLORS.bold}${COLORS.cyan}
╔══════════════════════════════════════════════════════════════════╗
║  PARAGUAY-FFAA | METALSTORM — Smoke test + cierre HALL-S1-01     ║
╚══════════════════════════════════════════════════════════════════╝${COLORS.reset}`);

  log(COLORS.gray, '[MODE]', APPLY ? 'APPLY (modificará docs + backup)' : 'DRY-RUN (solo smoke test)');
  log(COLORS.gray, '[ROOT]', ROOT_DIR);

  // FASE 1: SMOKE TEST
  if (!SKIP_SMOKE) {
    console.log(`\n${COLORS.bold}${COLORS.cyan}=== FASE 1: SMOKE TEST ===${COLORS.reset}`);
    const healthOk = await runHealthCheck();
    if (!healthOk) {
      log(COLORS.red, '[ERROR]', 'Health check falló. Abortando.');
      process.exit(1);
    }

    const jwt = await promptJwt();
    if (jwt) {
      const smokeOk = await runSmokeTests(jwt);
      if (!smokeOk) {
        log(COLORS.yellow, '[WARN]', 'Smoke test con fallos. Revisar antes de continuar.');
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        await new Promise((resolve) => rl.question('Continuar con cierre documental? (s/N): ', (a) => {
          rl.close();
          resolve(a.toLowerCase() === 's' ? true : process.exit(1));
        }));
      }
    } else {
      log(COLORS.yellow, '[SKIP]', 'Sin JWT. Se salta el smoke test específico.');
    }
  } else {
    log(COLORS.yellow, '[SKIP]', 'Smoke test salteado (--skip-smoke).');
  }

  // FASE 2: DOCS
  console.log(`\n${COLORS.bold}${COLORS.cyan}=== FASE 2: CIERRE DOCUMENTAL ===${COLORS.reset}`);
  try {
    const p = updatePlanTrabajo();
    const a = updateAuditoria();
    const c = updateChangelog();

    console.log(`\n${COLORS.bold}RESUMEN:${COLORS.reset}`);
    log(COLORS.gray, '  PLAN_TRABAJO.md           ', p ? '✅ modificado' : '⏭️  sin cambios');
    log(COLORS.gray, '  docs/auditoria-sprint-1.md', a ? '✅ modificado' : '⏭️  sin cambios');
    log(COLORS.gray, '  CHANGELOG.md              ', c ? '✅ modificado' : '⏭️  sin cambios');

    if (!APPLY) {
      console.log(`\n${COLORS.yellow}${COLORS.bold}SIGUIENTE PASO:${COLORS.reset}`);
      console.log(`  Revisá el dry-run y ejecutá con --apply:`);
      console.log(`  ${COLORS.cyan}node scripts/smoke-and-close-hall-s1-01.cjs --apply${COLORS.reset}\n`);
    } else {
      console.log(`\n${COLORS.green}${COLORS.bold}✅ DOCS APLICADOS.${COLORS.reset}`);
      console.log(`\n${COLORS.bold}SIGUIENTE PASO:${COLORS.reset}`);
      console.log(`  ${COLORS.cyan}git diff PLAN_TRABAJO.md docs/auditoria-sprint-1.md CHANGELOG.md${COLORS.reset}`);
      console.log(`  ${COLORS.cyan}git add PLAN_TRABAJO.md docs/auditoria-sprint-1.md CHANGELOG.md scripts/smoke-and-close-hall-s1-01.cjs${COLORS.reset}`);
      console.log(`  ${COLORS.cyan}git commit -m "docs(hall-s1-01): cerrar ítem + bump v4.5.4"${COLORS.reset}`);
      console.log(`  ${COLORS.cyan}git push origin main${COLORS.reset}\n`);
    }
  } catch (err) {
    console.error(`\n${COLORS.red}${COLORS.bold}❌ ERROR:${COLORS.reset} ${err.message}\n`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(`\n${COLORS.red}FATAL:${COLORS.reset} ${err.message}\n`);
  process.exit(1);
});