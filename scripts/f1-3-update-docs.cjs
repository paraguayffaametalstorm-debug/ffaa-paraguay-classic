// scripts/f1-3-update-docs.cjs
//
// F1.3 — Actualización de documentación tras cierre de F1.3.
//
// Actualiza:
//   1. docs/planning/PLAN_TRABAJO.md       → Sprint 8: F1.3 ✅
//   2. docs/planning/PLAN_TRABAJO_TORNEOS.md → F1.3 ✅ CERRADO con métricas
//   3. docs/planning/BACKLOG.md             → BL-034: progreso F1.3
//
// Reglas del proyecto:
//   - Windows CMD friendly.
//   - fs.writeFileSync con contenido completo (nunca content.replace()).
//   - Idempotente: si ya está actualizado, no hace nada.
//   - Verificación post-cambio con sentinels.
//   - node --check no aplica (son .md).
//   - Commit + push al final.
//
// Uso:
//   node scripts/f1-3-update-docs.cjs              (aplica + commit + push)
//   node scripts/f1-3-update-docs.cjs --no-push    (aplica + commit, sin push)
//   node scripts/f1-3-update-docs.cjs --dry-run    (solo muestra qué haría)

'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync, execSync } = require('child_process');

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

// ─── Flags ─────────────────────────────────────────────────────
const ROOT = path.resolve(__dirname, '..');
const DRY_RUN = process.argv.includes('--dry-run');
const NO_PUSH = process.argv.includes('--no-push');

// ─── Paths ─────────────────────────────────────────────────────
const FILES = {
  planTrabajo:      path.join(ROOT, 'docs', 'planning', 'PLAN_TRABAJO.md'),
  planTorneos:      path.join(ROOT, 'docs', 'planning', 'PLAN_TRABAJO_TORNEOS.md'),
  backlog:          path.join(ROOT, 'docs', 'planning', 'BACKLOG.md'),
};

// ─── Fecha/hora actual (UTC, formato ISO corto) ────────────────
const NOW = new Date();
const DATE_ISO = NOW.toISOString().split('T')[0]; // YYYY-MM-DD
const DATE_DISPLAY = DATE_ISO; // mismo formato

// ═══════════════════════════════════════════════════════════════
// PASO 1 — Verificar entorno
// ═══════════════════════════════════════════════════════════════
section('PASO 1 — Verificar entorno');

if (!fs.existsSync(path.join(ROOT, 'package.json'))) {
  die('No estás en la raíz del repo.');
}

// Verificar commit F1.3 en el working tree
let lastCommit = '';
try {
  lastCommit = execSync('git log -1 --pretty=format:%h %s', { cwd: ROOT, encoding: 'utf8' }).trim();
} catch (e) {
  log(WARN, `No se pudo leer git log: ${e.message}`);
}
log(OK, `Último commit: ${lastCommit}`);

if (!lastCommit.includes('feat(tournaments)') && !lastCommit.includes('F1.3')) {
  log(WARN, 'El último commit no parece ser el de F1.3. ¿Seguro querés seguir?');
}

// Verificar los 3 docs
for (const [key, filepath] of Object.entries(FILES)) {
  if (!fs.existsSync(filepath)) {
    die(`No existe: ${path.relative(ROOT, filepath)}`);
  }
  log(OK, `Encontrado: ${path.relative(ROOT, filepath)}`);
}

// ═══════════════════════════════════════════════════════════════
// PASO 2 — Actualizar PLAN_TRABAJO.md (Sprint 8: F1.3 ✅)
// ═══════════════════════════════════════════════════════════════
section('PASO 2 — Actualizar PLAN_TRABAJO.md');

function updatePlanTrabajo() {
  const filepath = FILES.planTrabajo;
  let content = fs.readFileSync(filepath, 'utf8');
  const original = content;

  // 2.1. Sentinels de idempotencia: si F1.3 ya está marcado, no tocar
  const SENTINEL = '| **F1.3** | 🏗️ | Controller `tournaments.controller.js` + RBAC fino | ✅ Cerrado |';
  if (content.includes(SENTINEL)) {
    log(OK, 'PLAN_TRABAJO.md ya tiene F1.3 marcado como cerrado (idempotente).');
    return { changed: false, path: filepath };
  }

  // 2.2. Reemplazar la línea de la tabla del Sprint 8
  // Buscamos la línea original de F1.3 (con ⏳ Pendiente)
  const OLD_F1_3 = '| **F1.3** | 🏗️ | Controller `tournaments.controller.js` + RBAC fino | ⏳ Pendiente |';
  const NEW_F1_3 = '| **F1.3** | 🏗️ | Controller `tournaments.controller.js` + RBAC fino | ✅ Cerrado |';

  if (!content.includes(OLD_F1_3)) {
    log(WARN, 'No se encontró la línea original de F1.3 en PLAN_TRABAJO.md.');
    log(WARN, 'Buscando variante...');

    // Intento alternativo: buscar cualquier línea que empiece con "| **F1.3**"
    const lines = content.split('\n');
    let found = false;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('| **F1.3**')) {
        log(OK, `Encontrado en línea ${i + 1}: ${lines[i].slice(0, 80)}...`);
        lines[i] = NEW_F1_3;
        found = true;
        break;
      }
    }
    if (!found) {
      log(WARN, 'No se pudo encontrar la línea de F1.3. Saltando PLAN_TRABAJO.md.');
      return { changed: false, path: filepath };
    }
    content = lines.join('\n');
  } else {
    content = content.replace(OLD_F1_3, NEW_F1_3);
  }

  // 2.3. Actualizar el bloque "Progreso" del Sprint 8
  const OLD_PROGRESO = '**Progreso:** F1.1 + F1.2 cerrados.';
  const NEW_PROGRESO = '**Progreso:** F1.1 + F1.2 + F1.3 cerrados.';

  if (content.includes(OLD_PROGRESO)) {
    content = content.replace(OLD_PROGRESO, NEW_PROGRESO);
    log(OK, 'Actualizado "Progreso" del Sprint 8.');
  }

  // 2.4. Agregar evidencia de cierre F1.3 al final del bloque Sprint 8
  const CLOSURE_BLOCK = `

### Evidencia de cierre F1.3 (${DATE_DISPLAY})

**Commit:** \`683c4ed\` — \`feat(tournaments): controller + RBAC fino F1.3\`

**4 archivos nuevos:**
- \`src/middlewares/tournamentModerator.js\` (middleware RBAC fino, ADR-011 D7).
- \`src/controllers/tournaments.controller.js\` (8 handlers, Zod, audit, mapeo Postgres).
- \`tests/middlewares/tournamentModerator.test.js\` (14 casos).
- \`tests/controllers/tournaments.controller.test.js\` (49 casos).

**3 scripts auxiliares:**
- \`scripts/f1-3-create-files.cjs\` — crea los 4 archivos (idempotente).
- \`scripts/f1-3-fix-uuids.cjs\` — corrige UUIDs a canónicos RFC 4122.
- \`scripts/f1-3-fix-beforeeach.cjs\` — corrige mockReset→mockClear + default impl.

**Verificado:**
- 14/14 middleware + 49/49 controller = 63 tests nuevos.
- Suite completa: 642 passing (579 previos + 63 nuevos).
- 0 regresiones.
- \`node --check\` limpio en los 4 archivos.
- RBAC fino: VETERANO no-moderador → 403; VETERANO moderador → OK; OWNER → bypass total.
- Push: \`a7b6e8a..683c4ed main -> main\`.

**Pendiente F1.4:** routes + mount en \`server.js\` (1 h).
`;

  // Insertar antes del próximo "---" que cierre el Sprint 8, o al final
  const SPRINT_8_MARKER = '### Documentos de fase';
  if (content.includes(SPRINT_8_MARKER)) {
    // Insertar antes del bloque "### Documentos de fase" del Sprint 8
    const idx = content.indexOf(SPRINT_8_MARKER);
    if (idx !== -1) {
      content = content.slice(0, idx) + CLOSURE_BLOCK + '\n' + content.slice(idx);
      log(OK, 'Bloque de cierre F1.3 insertado en PLAN_TRABAJO.md.');
    }
  }

  if (content === original) {
    log(WARN, 'Sin cambios en PLAN_TRABAJO.md.');
    return { changed: false, path: filepath };
  }

  if (DRY_RUN) {
    log(OK, `[DRY-RUN] PLAN_TRABAJO.md: ${content.length - original.length} bytes de cambio.`);
    return { changed: true, path: filepath, content };
  }

  fs.writeFileSync(filepath, content, 'utf8');
  log(OK, `PLAN_TRABAJO.md actualizado (${content.length - original.length} bytes agregados).`);
  return { changed: true, path: filepath, content };
}

// ═══════════════════════════════════════════════════════════════
// PASO 3 — Actualizar PLAN_TRABAJO_TORNEOS.md (F1.3 ✅ CERRADO)
// ═══════════════════════════════════════════════════════════════
section('PASO 3 — Actualizar PLAN_TRABAJO_TORNEOS.md');

function updatePlanTorneos() {
  const filepath = FILES.planTorneos;
  let content = fs.readFileSync(filepath, 'utf8');
  const original = content;

  // 3.1. Sentinels de idempotencia
  const SENTINEL = '### F1.3 — Controller + RBAC fino ✅ CERRADO';
  if (content.includes(SENTINEL)) {
    log(OK, 'PLAN_TRABAJO_TORNEOS.md ya tiene F1.3 marcado como cerrado (idempotente).');
    return { changed: false, path: filepath };
  }

  // 3.2. Reemplazar título "### F1.3 — Controller + RBAC fino"
  const OLD_TITLE = '### F1.3 — Controller + RBAC fino';
  const NEW_TITLE = '### F1.3 — Controller + RBAC fino ✅ CERRADO';

  if (!content.includes(OLD_TITLE)) {
    log(WARN, 'No se encontró el título original de F1.3.');
    return { changed: false, path: filepath };
  }

  content = content.replace(OLD_TITLE, NEW_TITLE);
  log(OK, 'Título F1.3 actualizado.');

  // 3.3. Actualizar "**Duración:** 1-1.5 días" → "**Duración real:** X días"
  const OLD_DURACION = '**Duración:** 1-1.5 días';
  const NEW_DURACION = '**Duración real:** 1 día (múltiples iteraciones de debug por UUIDs y mock)';
  if (content.includes(OLD_DURACION)) {
    content = content.replace(OLD_DURACION, NEW_DURACION);
    log(OK, 'Duración actualizada.');
  }

  // 3.4. Marcar los 6 criterios de cierre F1.3 como [x]
  const CIERRE_REPLACEMENTS = [
    ['- [ ] 8 endpoints operativos.', '- [x] 8 endpoints operativos.'],
    ['- [ ] Middleware `requireTournamentModerator` funcionando.', '- [x] Middleware `requireTournamentModerator` funcionando.'],
    ['- [ ] Tests: VETERANO no-moderador recibe 403.', '- [x] Tests: VETERANO no-moderador recibe 403.'],
    ['- [ ] Tests: VETERANO moderador puede registrar draft.', '- [x] Tests: VETERANO moderador puede registrar draft.'],
    ['- [ ] Tests: OWNER puede operar cualquier torneo.', '- [x] Tests: OWNER puede operar cualquier torneo.'],
    ['- [ ] Tests: MIEMBRO sin designación recibe 403.', '- [x] Tests: MIEMBRO sin designación recibe 403.'],
  ];
  let markedCount = 0;
  for (const [from, to] of CIERRE_REPLACEMENTS) {
    if (content.includes(from)) {
      content = content.replace(from, to);
      markedCount++;
    }
  }
  if (markedCount > 0) {
    log(OK, `${markedCount}/6 criterios de cierre marcados como [x].`);
  }

  // 3.5. Agregar bloque de evidencia al final del bloque F1.3
  const CLOSURE_BLOCK = `

**Cierre F1.3 (${DATE_DISPLAY}):**

- **Commit:** \`683c4ed\` — \`feat(tournaments): controller + RBAC fino F1.3\`
- **Archivos creados:** 4 (\`tournamentModerator.js\`, \`tournaments.controller.js\`, 2 test files).
- **Scripts auxiliares:** 3 (\`f1-3-create-files.cjs\`, \`f1-3-fix-uuids.cjs\`, \`f1-3-fix-beforeeach.cjs\`).
- **Tests nuevos:** 63 (14 middleware + 49 controller).
- **Suite completa:** 642 passing / 0 failing / 0 skipped.
- **Regresiones:** 0.
- **Hallazgos de la sesión:**
  - H-F13-01: Zod 4 valida UUIDs con regex RFC 4122 estricta (versión 1-8, variante 8/9/a/b).
  - H-F13-02: \`vi.clearAllMocks()\` + \`mockReset()\` destruye la implementación del mock. Usar \`mockClear()\` + default impl.
  - H-F13-03: El helper de Express vive en \`tests/helpers/express.js\`, no en \`tests/mocks/express.js\`.
- **Push:** \`a7b6e8a..683c4ed main -> main\`.
`;

  // Insertar antes del próximo "### F1.4" o al final del bloque
  const F14_MARKER = '### F1.4 — Routes + mount';
  if (content.includes(F14_MARKER)) {
    const idx = content.indexOf(F14_MARKER);
    if (idx !== -1) {
      content = content.slice(0, idx) + CLOSURE_BLOCK + '\n---\n\n' + content.slice(idx);
      log(OK, 'Bloque de cierre insertado antes de F1.4.');
    }
  } else {
    content += CLOSURE_BLOCK;
    log(OK, 'Bloque de cierre agregado al final.');
  }

  if (content === original) {
    log(WARN, 'Sin cambios en PLAN_TRABAJO_TORNEOS.md.');
    return { changed: false, path: filepath };
  }

  if (DRY_RUN) {
    log(OK, `[DRY-RUN] PLAN_TRABAJO_TORNEOS.md: ${content.length - original.length} bytes de cambio.`);
    return { changed: true, path: filepath, content };
  }

  fs.writeFileSync(filepath, content, 'utf8');
  log(OK, `PLAN_TRABAJO_TORNEOS.md actualizado (${content.length - original.length} bytes agregados).`);
  return { changed: true, path: filepath, content };
}

// ═══════════════════════════════════════════════════════════════
// PASO 4 — Actualizar BACKLOG.md (BL-034)
// ═══════════════════════════════════════════════════════════════
section('PASO 4 — Actualizar BACKLOG.md');

function updateBacklog() {
  const filepath = FILES.backlog;
  let content = fs.readFileSync(filepath, 'utf8');
  const original = content;

  // 4.1. Sentinels de idempotencia
  const SENTINEL = 'F1.3 cerrado (controller + RBAC fino)';
  if (content.includes(SENTINEL)) {
    log(OK, 'BACKLOG.md ya tiene F1.3 marcado (idempotente).');
    return { changed: false, path: filepath };
  }

  // 4.2. Actualizar la línea de BL-034 en la tabla "Prioridad Media"
  const OLD_BL_034 = '| **BL-034** | ✨ | Sistema de Torneos Internos (F1.3 → F1.6) | 🔨 En progreso | L (4-6 días) | Implementación del RFC-002 + Anexo III. F1.1 + F1.2 cerrados (migración SQL + schemas Zod). Ver `docs/planning/PLAN_TRABAJO_TORNEOS.md` y `docs/adr/ADR-011-sistema-torneos.md`. |';
  const NEW_BL_034 = '| **BL-034** | ✨ | Sistema de Torneos Internos (F1.4 → F1.6) | 🔨 En progreso | M (2-4 días) | RFC-002 + Anexo III. **F1.3 cerrado (controller + RBAC fino)** · F1.1 + F1.2 cerrados previamente. Commit: `683c4ed`. 63 tests nuevos (14 middleware + 49 controller). Ver `docs/planning/PLAN_TRABAJO_TORNEOS.md` y `docs/adr/ADR-011-sistema-torneos.md`. |';

  if (content.includes(OLD_BL_034)) {
    content = content.replace(OLD_BL_034, NEW_BL_034);
    log(OK, 'BL-034 actualizado (F1.1 + F1.2 + F1.3 cerrados).');
  } else {
    // Intento alternativo: buscar la línea que empiece con "| **BL-034**"
    const lines = content.split('\n');
    let found = false;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('| **BL-034**')) {
        lines[i] = NEW_BL_034;
        found = true;
        log(OK, `BL-034 actualizado (línea ${i + 1}).`);
        break;
      }
    }
    if (!found) {
      log(WARN, 'No se encontró BL-034 en BACKLOG.md. Saltando.');
      return { changed: false, path: filepath };
    }
    content = lines.join('\n');
  }

  // 4.3. Agregar F1.3 al histórico de Completados
  const HISTORICO_MARKER = '| **F1.2-TOURN** | 🧪 | Schemas Zod sistema de torneos (6 schemas + 72 tests) | 2026-10-12 | `2a51bb2` |';
  const NEW_HISTORICO_LINE = `| **F1.3-TOURN** | 🏗️ | Controller torneos + RBAC fino (8 handlers + 63 tests) | ${DATE_DISPLAY} | \`683c4ed\` |`;

  if (content.includes(HISTORICO_MARKER) && !content.includes('F1.3-TOURN')) {
    content = content.replace(HISTORICO_MARKER, HISTORICO_MARKER + '\n' + NEW_HISTORICO_LINE);
    log(OK, 'F1.3 agregado al histórico de Completados.');
  } else if (content.includes('F1.3-TOURN')) {
    log(OK, 'F1.3 ya está en el histórico (idempotente).');
  } else {
    log(WARN, 'No se encontró el marker de F1.2-TOURN en el histórico.');
  }

  if (content === original) {
    log(WARN, 'Sin cambios en BACKLOG.md.');
    return { changed: false, path: filepath };
  }

  if (DRY_RUN) {
    log(OK, `[DRY-RUN] BACKLOG.md: ${content.length - original.length} bytes de cambio.`);
    return { changed: true, path: filepath, content };
  }

  fs.writeFileSync(filepath, content, 'utf8');
  log(OK, `BACKLOG.md actualizado (${content.length - original.length} bytes agregados).`);
  return { changed: true, path: filepath, content };
}

// ═══════════════════════════════════════════════════════════════
// PASO 5 — Ejecutar todas las actualizaciones
// ═══════════════════════════════════════════════════════════════
section('PASO 5 — Actualizando documentos');

const results = {
  planTrabajo: updatePlanTrabajo(),
  planTorneos: updatePlanTorneos(),
  backlog: updateBacklog(),
};

const changedCount = Object.values(results).filter(r => r.changed).length;
log(changedCount > 0 ? OK : WARN, `${changedCount}/3 documentos modificados.`);

if (DRY_RUN) {
  console.log('');
  log(OK, '[DRY-RUN] Nada escrito. Ejecutá sin --dry-run para aplicar.');
  process.exit(0);
}

if (changedCount === 0) {
  console.log('');
  log(OK, 'Todo ya estaba actualizado (idempotente). Nada para commitear.');
  process.exit(0);
}

// ═══════════════════════════════════════════════════════════════
// PASO 6 — Verificación post-cambio (sentinels)
// ═══════════════════════════════════════════════════════════════
section('PASO 6 — Verificar sentinels');

const SENTINELS = [
  { path: FILES.planTrabajo, sentinel: 'F1.3** | 🏗️ | Controller `tournaments.controller.js` + RBAC fino | ✅ Cerrado', label: 'PLAN_TRABAJO.md' },
  { path: FILES.planTorneos, sentinel: 'F1.3 — Controller + RBAC fino ✅ CERRADO', label: 'PLAN_TRABAJO_TORNEOS.md' },
  { path: FILES.backlog, sentinel: 'F1.3 cerrado (controller + RBAC fino)', label: 'BACKLOG.md' },
];

for (const { path: filepath, sentinel, label } of SENTINELS) {
  const content = fs.readFileSync(filepath, 'utf8');
  if (content.includes(sentinel)) {
    log(OK, `${label}: sentinel OK.`);
  } else {
    die(`${label}: sentinel NO encontrado. Fix falló.`);
  }
}

// ═══════════════════════════════════════════════════════════════
// PASO 7 — Git add + commit
// ═══════════════════════════════════════════════════════════════
section('PASO 7 — Git add + commit');

const gitAdd = spawnSync('git', ['add',
  'docs/planning/PLAN_TRABAJO.md',
  'docs/planning/PLAN_TRABAJO_TORNEOS.md',
  'docs/planning/BACKLOG.md',
], { cwd: ROOT, encoding: 'utf8' });

if (gitAdd.status !== 0) {
  console.log(gitAdd.stderr || gitAdd.stdout);
  die('git add falló.');
}
log(OK, 'git add OK.');

const commitMsg = `docs(tournaments): cerrar F1.3 en plan y backlog`;
const gitCommit = spawnSync('git', ['commit', '-m', commitMsg], { cwd: ROOT, encoding: 'utf8' });

if (gitCommit.status !== 0) {
  console.log(gitCommit.stderr || gitCommit.stdout);
  die('git commit falló.');
}
log(OK, `Commit: ${commitMsg}`);

// Obtener hash del nuevo commit
let newCommit = '';
try {
  newCommit = execSync('git rev-parse --short HEAD', { cwd: ROOT, encoding: 'utf8' }).trim();
  log(OK, `Nuevo HEAD: ${newCommit}`);
} catch (e) {
  log(WARN, 'No se pudo obtener el hash del nuevo commit.');
}

// ═══════════════════════════════════════════════════════════════
// PASO 8 — Git push (si no --no-push)
// ═══════════════════════════════════════════════════════════════
section('PASO 8 — Git push');

if (NO_PUSH) {
  log(WARN, '--no-push activo. Commit local, no se pushea.');
  console.log('');
  console.log(`${BOLD}Para pushear:${RESET}`);
  console.log('   git push origin main');
  process.exit(0);
}

const gitPush = spawnSync('git', ['push', 'origin', 'main'], { cwd: ROOT, encoding: 'utf8' });

if (gitPush.status !== 0) {
  console.log(gitPush.stderr || gitPush.stdout);
  die('git push falló. Commiteaste local pero no pudiste pushear.');
}
console.log(gitPush.stdout || gitPush.stderr);
log(OK, 'Push OK.');

// ═══════════════════════════════════════════════════════════════
// PASO 9 — Resumen final
// ═══════════════════════════════════════════════════════════════
section('PASO 9 — Resumen');

console.log('');
console.log(`${BOLD}${GREEN}🎉 Docs actualizados y pusheados.${RESET}`);
console.log('');
console.log(`${BOLD}Resumen:${RESET}`);
console.log(`  - PLAN_TRABAJO.md:         Sprint 8 marcado F1.3 ✅ + evidencia`);
console.log(`  - PLAN_TRABAJO_TORNEOS.md: F1.3 ✅ CERRADO + hallazgos H-F13-01/02/03`);
console.log(`  - BACKLOG.md:              BL-034 actualizado + F1.3 en histórico`);
console.log('');
console.log(`${BOLD}Commit:${RESET} ${newCommit} — docs(tournaments): cerrar F1.3 en plan y backlog`);
console.log(`${BOLD}Push:${RESET}   origin/main ✅`);
console.log('');
console.log(`${BOLD}Siguiente paso:${RESET} F1.4 — Routes + mount en \`server.js\` (~1 h).`);
console.log('');
log(OK, 'Script completado sin errores.');
process.exit(0);