#!/usr/bin/env node
/**
 * PARAGUAY-FFAA | METALSTORM
 * SCRIPT: Documentar FIX-PARTICIPATION-EDIT en 4 archivos
 *
 * Uso:
 *   node scripts\docs-participation-edit.cjs           (DRY-RUN)
 *   node scripts\docs-participation-edit.cjs --apply   (APLICAR + COMMIT + PUSH)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const APPLY = process.argv.includes('--apply');

const C = {
  reset: '\x1b[0m', bold: '\x1b[1m',
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m',
  blue: '\x1b[34m', cyan: '\x1b[36m', gray: '\x1b[90m'
};

function log(color, prefix, msg) { console.log(`${color}${prefix}${C.reset} ${msg}`); }
function abort(msg) {
  console.error(`\n${C.red}${C.bold}❌ ABORTADO:${C.reset} ${msg}\n`);
  process.exit(1);
}

function readFile(relPath) {
  const absPath = path.join(ROOT_DIR, relPath);
  if (!fs.existsSync(absPath)) abort(`Archivo no encontrado: ${relPath}`);
  return { absPath, content: fs.readFileSync(absPath, 'utf8') };
}

function safeReplace(content, oldBlock, newBlock, label) {
  const hasCRLF = content.includes('\r\n');
  const nc = hasCRLF ? content.replace(/\r\n/g, '\n') : content;
  const no = oldBlock.replace(/\r\n/g, '\n');
  const nn = newBlock.replace(/\r\n/g, '\n');

  if (nc.includes(nn)) {
    log(C.yellow, '[SKIP]', `${label}: ya aplicado.`);
    return { changed: false, content };
  }

  const count = nc.split(no).length - 1;
  if (count === 0) {
    log(C.red, '[FAIL]', `${label}: bloque original no encontrado.`);
    return { changed: false, content, error: 'NOT_FOUND' };
  }
  if (count > 1) {
    log(C.red, '[FAIL]', `${label}: ${count} ocurrencias ambiguas.`);
    return { changed: false, content, error: 'AMBIGUOUS' };
  }

  log(C.green, '[MATCH]', `${label}: 1 ocurrencia.`);
  let result = nc.replace(no, nn);
  if (hasCRLF) result = result.replace(/\n/g, '\r\n');
  return { changed: true, content: result };
}

function writeFile(relPath, newContent, oldContent) {
  const absPath = path.join(ROOT_DIR, relPath);
  if (newContent === oldContent) {
    log(C.yellow, '[SKIP]', `${relPath} — sin cambios`);
    return false;
  }
  if (!APPLY) {
    log(C.yellow, '[DRY-RUN]', `NO se modificará: ${relPath}`);
    return true;
  }
  const backupPath = absPath + '.bak-docs-participation-edit';
  fs.writeFileSync(backupPath, oldContent, 'utf8');
  log(C.gray, '[BACKUP]', `Creado: ${path.relative(ROOT_DIR, backupPath)}`);
  fs.writeFileSync(absPath, newContent, 'utf8');
  log(C.green, '[WRITE]', `Modificado: ${relPath}`);
  return true;
}

// ============================================================================
// [1/4] CHANGELOG.md — agregar [4.5.9]
// ============================================================================
function fixChangelog() {
  log(C.bold + C.blue, '\n[1/4]', 'CHANGELOG.md — agregar [4.5.9]...');
  const { content } = readFile('CHANGELOG.md');

  const oldBlock = `## [4.5.8] - 2026-09-22`;

  const newBlock = `## [4.5.9] - 2026-09-22

### 🎖️ FIX-PARTICIPATION-EDIT — Edición de participaciones existentes

#### Objetivo Cumplido

Permitir que un ADMIN/OWNER pueda **modificar una participación existente** cuando
un piloto ya fue registrado en un evento. Antes, la API devolvía un 409 seco
sin información del registro previo, y el frontend no ofrecía resolverlo.

Se aplican **mejores prácticas de diseño de API (RFC 9110)**:
- El \`409 Conflict\` incluye el **registro existente** para permitir al cliente
  resolver el conflicto con contexto.
- Solo ADMIN/OWNER pueden modificar (Principio de Menor Privilegio).
- Ningún ADMIN/OWNER puede modificar su **propio registro** (Separación de Deberes).

#### Problema Detectado

- **Backend:** \`createParticipation\` devolvía \`409 PARTICIPATION_EXISTS\`
  sin el registro existente en el body.
- **Backend:** \`updateParticipation\` no validaba jerarquía ni self-modification.
- **Frontend:** \`savePerformance()\` mostraba solo un toast de error al 409,
  sin ofrecer al usuario actualizar el registro.

#### Solución Implementada

**Capa 1 — Backend (\`createParticipation\`):**

En el \`409 PARTICIPATION_EXISTS\`, ahora se devuelve el registro existente
completo en el campo \`existing\`:

\`\`\`json
{
  "success": false,
  "error": "Ya existe una participación para este piloto en este evento.",
  "code": "PARTICIPATION_EXISTS",
  "existing": {
    "id": "uuid-participacion",
    "event_id": "uuid-evento",
    "user_id": "uuid-piloto",
    "nick": "Viper_PY",
    "data": { "tokens": 185, "days_connected": 6, ... },
    "computed_points": 185,
    "status": "PENDING",
    "created_at": "...",
    "updated_at": "..."
  }
}
\`\`\`

**Capa 2 — Backend (\`updateParticipation\`):**

Se agregaron 2 validaciones al inicio:

1. **\`UPDATE_FORBIDDEN\` (403):** Solo \`ADMIN\` y \`OWNER\` pueden modificar
   participaciones. MIEMBRO/VETERANO reciben 403 con mensaje claro.
2. **\`SELF_MODIFICATION_FORBIDDEN\` (403):** Un ADMIN/OWNER no puede modificar
   su **propio registro**. Debe pedirle a otro ADMIN.

**Capa 3 — Frontend (\`savePerformance\`):**

Cuando el POST devuelve \`409 PARTICIPATION_EXISTS\`:

1. Toast informativo: *"⚠️ Ya existe un registro previo para este piloto..."*
2. \`confirm()\` con **comparación lado a lado**:
   \`\`\`
   📊 Registro actual:
     • Tokens:       185
     • Días:         6
     • Grupo:        Sí
     • Estado:       PENDING
     • Creado:       2026-09-22 14:30
     • Actualizado:  2026-09-22 15:45
     • Notas:        "Patrulla CAP"

   🆕 Datos nuevos a cargar:
     • Tokens:       210
     • Días:         7
     • Grupo:        Sí
     • Notas:        "Revisión post-misión"

   ¿Reemplazar el registro anterior?
   \`\`\`
3. Si confirma → \`PUT /api/events-v2/:id/participations/:uid\` con los nuevos datos.
4. Si cancela → toast informativo sin cambios.

#### Archivos Modificados

| Archivo | Cambio |
|---|---|
| \`src/controllers/events-v2.controller.js\` | \`createParticipation\` incluye \`existing\` en 409. \`updateParticipation\` con validación jerarquía + self-mod. |
| \`js/performance.js\` | \`savePerformance\` maneja 409 con confirm + PUT. |

#### Comportamiento Visible (UI)

- **Antes:** el usuario veía *"Ya existe una participación..."* y no podía hacer nada.
- **Ahora:** ve el registro previo completo, puede decidir reemplazarlo o cancelar.
- **MIEMBRO/VETERANO:** reciben un error claro si intentan modificar (no aplica desde el form).
- **ADMIN/OWNER:** pueden modificar registros ajenos, pero **no el propio**.

#### Rollback

- **Sin redeploy (30 seg):** \`git revert <hash> && git push origin main && fly deploy\`
- Los backups de código están en \`*.bak-participation-edit\`.

#### Verificación

- ✅ \`node --check\` OK en los 2 archivos modificados.
- ✅ \`git diff --stat\`: 2 files changed, +157 insertions, -1 deletion.
- ✅ Commit \`ed6b45e\`.
- ⏳ Smoke test end-to-end pendiente.

#### Referencias

- \`API_REFERENCE.md\` — actualizado con \`existing\` en 409 y \`SELF_MODIFICATION_FORBIDDEN\` en PUT.
- Commit \`ed6b45e\`.

---

## [4.5.8] - 2026-09-22`;

  const r = safeReplace(content, oldBlock, newBlock, 'CHANGELOG.md [4.5.9]');
  if (r.error) abort(`CHANGELOG.md: ${r.error}`);
  if (r.changed) writeFile('CHANGELOG.md', r.content, content);
}

// ============================================================================
// [2/4] PLAN_TRABAJO.md — completados + métrica
// ============================================================================
function fixPlanTrabajo() {
  log(C.bold + C.blue, '\n[2/4]', 'PLAN_TRABAJO.md — completados + métrica...');
  const { content } = readFile('PLAN_TRABAJO.md');
  let current = content;
  let didChange = false;

  // Agregar fila a la tabla de completados
  {
    const oldBlock = `| **FIX-105** | \`src/controllers/events-v2.controller.js\` — RPC atómica \`change_event_status_atomic\` + fallback legacy | 2026-09-22 | (ver CHANGELOG v4.5.8) |`;
    const newBlock = `| **FIX-105** | \`src/controllers/events-v2.controller.js\` — RPC atómica \`change_event_status_atomic\` + fallback legacy | 2026-09-22 | (ver CHANGELOG v4.5.8) |
| **FIX-PARTICIPATION-EDIT** | \`src/controllers/events-v2.controller.js\` + \`js/performance.js\` — 409 con \`existing\` + self-mod check + confirm + PUT | 2026-09-22 | \`ed6b45e\` |`;
    const r = safeReplace(current, oldBlock, newBlock, 'PLAN_TRABAJO.md tabla completados');
    if (r.error) abort(`PLAN_TRABAJO.md (completados): ${r.error}`);
    if (r.changed) { current = r.content; didChange = true; }
  }

  // Actualizar métrica de progreso
  {
    const oldBlock = `| Fixes cerrados | 0 | 25 | 25 | 38 | 42+ | 49+ |`;
    const newBlock = `| Fixes cerrados | 0 | 25 | 25 | 39 | 42+ | 49+ |`;
    const r = safeReplace(current, oldBlock, newBlock, 'PLAN_TRABAJO.md métrica');
    if (r.error) abort(`PLAN_TRABAJO.md (métrica): ${r.error}`);
    if (r.changed) { current = r.content; didChange = true; }
  }

  if (didChange) writeFile('PLAN_TRABAJO.md', current, content);
}

// ============================================================================
// [3/4] API_REFERENCE.md — 409 con existing + PUT con self-mod
// ============================================================================
function fixApiReference() {
  log(C.bold + C.blue, '\n[3/4]', 'API_REFERENCE.md — 409 + PUT...');
  const { content } = readFile('API_REFERENCE.md');
  let current = content;
  let didChange = false;

  // 3.1 Actualizar la sección POST /participations
  {
    const oldBlock = `#### \`POST /api/events-v2/:id/participations\`

Carga una participación (tokens para SQ, misiones para BM).

- **Acceso:** Autenticado.
- **Reglas:**
  - Solo en eventos \`OPEN\`.
  - Un usuario puede tener máximo **1 participación activa** por evento.
  - Los \`computed_points\` se calculan según tipo de evento (SQ: tokens; BM: fórmula 25 pts/misión + bonus diario).`;

    const newBlock = `#### \`POST /api/events-v2/:id/participations\`

Carga una participación (tokens para SQ, misiones para BM).

- **Acceso:** Autenticado.
- **Reglas:**
  - Solo en eventos \`OPEN\` (o \`CLOSED\` con ventana de carga abierta — ADR-008).
  - Un usuario puede tener máximo **1 participación activa** por evento.
  - Los \`computed_points\` se calculan según tipo de evento (SQ: tokens; BM: fórmula 25 pts/misión + bonus diario).

**Conflicto de duplicado (FIX-PARTICIPATION-EDIT, v4.5.9):**

Si el piloto ya tiene una participación en el evento, el endpoint devuelve
\`409\` con el **registro existente** en el campo \`existing\`, para que el
cliente pueda resolver el conflicto (sobrescribir vía PUT o cancelar).
Sigue las recomendaciones de **RFC 9110 §15.5.10**.

\`\`\`json
{
  "success": false,
  "error": "Ya existe una participación para este piloto en este evento.",
  "code": "PARTICIPATION_EXISTS",
  "existing": {
    "id": "uuid",
    "user_id": "uuid-piloto",
    "nick": "Viper_PY",
    "data": { "tokens": 185, "days_connected": 6, "flew_in_group": true, "notes": "..." },
    "computed_points": 185,
    "status": "PENDING",
    "created_at": "2026-09-22T14:30:00Z",
    "updated_at": "2026-09-22T14:30:00Z"
  }
}
\`\`\``;

    const r = safeReplace(current, oldBlock, newBlock, 'API_REFERENCE.md POST /participations');
    if (r.error) abort(`API_REFERENCE.md (POST): ${r.error}`);
    if (r.changed) { current = r.content; didChange = true; }
  }

  // 3.2 Actualizar la sección PUT /participations/:uid
  {
    const oldBlock = `#### \`PUT /api/events-v2/:id/participations/:userId\`

Edita una participación existente.

- **Acceso:** Autenticado (solo el propio usuario o \`ADMIN\`/\`OWNER\`).
- **Request Body:** igual que el POST pero con modo reemplazo total.
- **Response Exitosa (200 OK):**
  \`\`\`json
  {
    "success": true,
    "participation": { "...participación actualizada..." }
  }
  \`\`\``;

    const newBlock = `#### \`PUT /api/events-v2/:id/participations/:userId\`

Edita una participación existente.

- **Acceso:** Solo \`ADMIN\` o \`OWNER\` (FIX-PARTICIPATION-EDIT, v4.5.9).
- **Restricción de jerarquía:**
  - Solo ADMIN/OWNER pueden modificar participaciones existentes.
  - Un ADMIN/OWNER **NO puede modificar su propio registro** (Separación de Deberes).
- **Request Body:** igual que el POST pero con modo reemplazo total.
- **Response Exitosa (200 OK):**
  \`\`\`json
  {
    "success": true,
    "message": "Participación actualizada exitosamente",
    "participation": { "...participación actualizada..." }
  }
  \`\`\`
- **Errores Posibles:**
  - \`403 UPDATE_FORBIDDEN\`: MIEMBRO/VETERANO intenta modificar un registro existente.
  - \`403 SELF_MODIFICATION_FORBIDDEN\`: un ADMIN/OWNER intenta modificar su propio registro.
  - \`404 PARTICIPATION_NOT_FOUND\`: la participación no existe.
  - \`409 SUBMISSION_WINDOW_CLOSED\`: la ventana de carga ya cerró (ADR-008).`;

    const r = safeReplace(current, oldBlock, newBlock, 'API_REFERENCE.md PUT /participations');
    if (r.error) abort(`API_REFERENCE.md (PUT): ${r.error}`);
    if (r.changed) { current = r.content; didChange = true; }
  }

  if (didChange) writeFile('API_REFERENCE.md', current, content);
}

// ============================================================================
// [4/4] BACKLOG.md — agregar a completados
// ============================================================================
function fixBacklog() {
  log(C.bold + C.blue, '\n[4/4]', 'BACKLOG.md — agregar a completados...');
  const { content } = readFile('BACKLOG.md');
  let current = content;
  let didChange = false;

  {
    const oldBlock = `| **HALL-S2-02** | 🐛 | Dropdown de rol frontend no permitía seleccionar ADMIN | 2026-09-22 | \`13501af\` |`;
    const newBlock = `| **HALL-S2-02** | 🐛 | Dropdown de rol frontend no permitía seleccionar ADMIN | 2026-09-22 | \`13501af\` |
| **FIX-PARTICIPATION-EDIT** | ✨ | Edición de participaciones existentes con jerarquía + self-mod check | 2026-09-22 | \`ed6b45e\` |`;
    const r = safeReplace(current, oldBlock, newBlock, 'BACKLOG.md completados');
    if (r.error) abort(`BACKLOG.md: ${r.error}`);
    if (r.changed) { current = r.content; didChange = true; }
  }

  {
    const oldBlock = `| Items activos | 17 |
| Items completados | 8 |`;
    const newBlock = `| Items activos | 17 |
| Items completados | 9 |`;
    const r = safeReplace(current, oldBlock, newBlock, 'BACKLOG.md métrica');
    if (r.error) abort(`BACKLOG.md (métrica): ${r.error}`);
    if (r.changed) { current = r.content; didChange = true; }
  }

  if (didChange) writeFile('BACKLOG.md', current, content);
}

// ============================================================================
// GIT PUSH AUTOMÁTICO
// ============================================================================
function gitPush() {
  const files = [
    'CHANGELOG.md',
    'PLAN_TRABAJO.md',
    'API_REFERENCE.md',
    'BACKLOG.md',
    'scripts/docs-participation-edit.cjs'
  ];

  log(C.bold + C.cyan, '\n[git]', 'Agregando archivos al stage...');
  files.forEach(f => {
    try {
      execSync(`git add "${f}"`, { cwd: ROOT_DIR, stdio: 'inherit' });
      log(C.gray, '[git add]', f);
    } catch (e) {
      log(C.red, '[git add FAIL]', f);
      throw e;
    }
  });

  log(C.bold + C.cyan, '\n[git]', 'Creando commit...');
  const commitMsg = 'docs(participation-edit): documentar fix en CHANGELOG + PLAN + API_REFERENCE + BACKLOG';
  try {
    execSync(`git commit -m "${commitMsg}"`, { cwd: ROOT_DIR, stdio: 'inherit' });
  } catch (e) {
    log(C.yellow, '[git commit]', 'Sin cambios o ya commiteado. Continuando.');
  }

  log(C.bold + C.cyan, '\n[git]', 'Push a origin/main...');
  try {
    execSync('git push origin main', { cwd: ROOT_DIR, stdio: 'inherit' });
  } catch (e) {
    log(C.red, '[git push FAIL]', 'Error en push. Revisá manualmente.');
    throw e;
  }

  log(C.green, '\n[git]', '✅ Push exitoso.');
}

// ============================================================================
// MAIN
// ============================================================================
console.log(`${C.bold}${C.cyan}
╔══════════════════════════════════════════════════════════════════╗
║  PARAGUAY-FFAA | METALSTORM — Docs FIX-PARTICIPATION-EDIT        ║
╚══════════════════════════════════════════════════════════════════╝${C.reset}`);

log(C.gray, '[MODE]', APPLY ? 'APPLY + COMMIT + PUSH' : 'DRY-RUN (sin cambios)');

try {
  fixChangelog();
  fixPlanTrabajo();
  fixApiReference();
  fixBacklog();
} catch (err) {
  abort(`Error durante la aplicación: ${err.message}`);
}

if (!APPLY) {
  console.log(`\n${C.yellow}${C.bold}MODO DRY-RUN — No se modificó nada.${C.reset}`);
  console.log(`\n${C.bold}SIGUIENTE PASO (aplicar + commit + push):${C.reset}`);
  console.log(`  node scripts\\docs-participation-edit.cjs --apply`);
  process.exit(0);
}

gitPush();

console.log(`\n${C.green}${C.bold}✅ DOCUMENTACIÓN ACTUALIZADA Y SUBIDA A GITHUB.${C.reset}`);
console.log(`\n${C.bold}Rollback si algo falla:${C.reset}`);
console.log(`  git revert HEAD && git push origin main`);
console.log(`\n${C.bold}Limpiar backups tras verificar:${C.reset}`);
console.log(`  del /s *.bak-docs-participation-edit`);