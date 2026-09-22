#!/usr/bin/env node
/**
 * PARAGUAY-FFAA | METALSTORM
 * SCRIPT: Documentar cierre de HALL-S2-02 en 5 archivos + push a GitHub
 *
 * Uso:
 *   node scripts\apply-hall-s2-02-docs.cjs           (DRY-RUN)
 *   node scripts\apply-hall-s2-02-docs.cjs --apply   (APLICAR + COMMIT + PUSH)
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

/**
 * Reemplazo tolerante a CRLF/LF mixtos.
 * Si `newBlock` ya está, skip.
 * Si `oldBlock` no existe, fail.
 * Si `oldBlock` existe más de 1 vez, fail (ambiguo).
 */
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
  const backupPath = absPath + '.bak-hall-s2-02';
  fs.writeFileSync(backupPath, oldContent, 'utf8');
  log(C.gray, '[BACKUP]', `Creado: ${path.relative(ROOT_DIR, backupPath)}`);
  fs.writeFileSync(absPath, newContent, 'utf8');
  log(C.green, '[WRITE]', `Modificado: ${relPath}`);
  return true;
}

// ============================================================================
// CAMBIO 1 — CHANGELOG.md: agregar entrada [4.5.6]
// ============================================================================
function fixChangelog() {
  log(C.bold + C.blue, '\n[1/5]', 'CHANGELOG.md — agregar [4.5.6]...');
  const { content } = readFile('CHANGELOG.md');

  const oldBlock = `## [4.5.5] - 2026-09-22`;

  const newBlock = `## [4.5.6] - 2026-09-22

### 🎖️ HALL-S2-02 — Habilitación de opción ADMIN en dropdown de roles (frontend)

#### Objetivo Cumplido

Alinear el dropdown de cambio de rol del panel de administración con la
política de backend establecida en HALL-S2-01 (v4.5.5). El \`<option value="ADMIN">\`
estaba deshabilitado para actores con rol \`ADMIN\`, aunque el backend ya
permitía la acción. Divergencia frontend/backend resuelta.

#### Causa Raíz

La condición \`\${!isOwner && currentRole !== 'ADMIN' ? 'disabled' : ''}\` en
\`renderAdminMembersTable()\` replicaba la regla VIEJA pre-HALL-S2-01.

#### Cambio Aplicado

| Archivo | Cambio |
|---|---|
| \`js/views.js\` (función \`renderAdminMembersTable\`) | Eliminada la condición \`disabled\` de la opción ADMIN |

#### Política Resultante

El dropdown refleja la política actual:

| Actor | Puede asignar MIEMBRO | Puede asignar VETERANO | Puede asignar ADMIN | Puede asignar OWNER |
|---|:---:|:---:|:---:|:---:|
| **MIEMBRO** | — | — | — | — |
| **VETERANO** | — | — | — | — |
| **ADMIN** | ✅ | ✅ | ✅ | ❌ |
| **OWNER** | ✅ | ✅ | ✅ | ✅ |

La validación de cuota (máximo 5 ADMIN) y jerarquía la sigue aplicando el
backend, que es la única fuente de verdad.

#### Verificación

- ✅ \`node --check js/views.js\` → OK.
- ✅ Dry-run del script: \`[MATCH] views.js (option ADMIN): 1 ocurrencia\`.
- ✅ \`git diff\` quirúrgico: 1 inserción, 1 eliminación.
- ✅ Commit \`13501af\`.
- ✅ Deploy a Fly.io sin downtime: \`deployment-01M35PSP3XQ6QAH86CSXW88X4P\`.

#### Referencias

- \`docs/auditoria-sprint-1.md\` — hallazgo original (Sprint 2).
- \`PLAN_TRABAJO.md\` — sección Sprint 2.
- Commit \`13501af\`.

---

## [4.5.5] - 2026-09-22`;

  const { changed, content: nc, error } = safeReplace(content, oldBlock, newBlock, 'CHANGELOG.md [4.5.6]');
  if (error) abort(`CHANGELOG.md: ${error}`);
  if (changed) writeFile('CHANGELOG.md', nc, content);
}

// ============================================================================
// CAMBIO 2 — PLAN_TRABAJO.md: 3 reemplazos independientes
// ============================================================================
function fixPlanTrabajo() {
  log(C.bold + C.blue, '\n[2/5]', 'PLAN_TRABAJO.md — tabla completados + métricas + estado Sprint 2...');
  const { content } = readFile('PLAN_TRABAJO.md');
  let current = content;
  let didChange = false;

  // --- 2.1: Tabla de completados, agregar 3 filas ---
  {
    const oldBlock = `| **FIX-104** | \`src/middlewares/errorHandler.js\` — filtrar detalles de DB en respuestas 500 | 2026-09-22 | \`43db2a8\` |`;
    const newBlock = `| **FIX-104** | \`src/middlewares/errorHandler.js\` — filtrar detalles de DB en respuestas 500 | 2026-09-22 | \`43db2a8\` |
| **HALL-S1-01** | Ownership check en \`getPlaneDetails\` | 2026-09-22 | \`5fbb2d5\` |
| **HALL-S2-01** | Ampliación de poderes del ADMIN (reset, rol, status) — backend | 2026-09-22 | \`d496f5c\` |
| **HALL-S2-02** | Dropdown de rol frontend — habilitar opción ADMIN | 2026-09-22 | \`13501af\` |`;
    const r = safeReplace(current, oldBlock, newBlock, 'PLAN_TRABAJO.md completados');
    if (r.error) abort(`PLAN_TRABAJO.md (completados): ${r.error}`);
    if (r.changed) { current = r.content; didChange = true; }
  }

  // --- 2.2: Métricas de progreso ---
  {
    const oldBlock = `| Fixes cerrados | 0 | 25 | 25 | 33+ | 42+ | 49+ |`;
    const newBlock = `| Fixes cerrados | 0 | 25 | 25 | 36 | 42+ | 49+ |`;
    const r = safeReplace(current, oldBlock, newBlock, 'PLAN_TRABAJO.md métricas');
    if (r.error) abort(`PLAN_TRABAJO.md (métricas): ${r.error}`);
    if (r.changed) { current = r.content; didChange = true; }
  }

  // --- 2.3: Ítems placeholder del Sprint 2 ---
  {
    const oldBlock = `### Ítems placeholder (se llenan tras Sprint 1)

- [ ] **FIX-201** — _(pendiente confirmación FIX-101)_
- [ ] **FIX-202** — _(pendiente confirmación FIX-102)_
- [ ] **FIX-203** — _(pendiente confirmación FIX-103)_
- [ ] **FIX-204** — _(pendiente confirmación FIX-104)_
- [ ] **FIX-205** — _(pendiente confirmación FIX-105)_
- [ ] **FIX-206** — _(pendiente confirmación FIX-106)_
- [ ] **FIX-207** — _(pendiente confirmación FIX-107)_
- [ ] **FIX-208** — _(pendiente confirmación FIX-108)_
- [ ] **FIX-209** — **Presence en memoria no escala** (ADR-005). El router usa un \`Set\` local que no se comparte entre las 2 réplicas de Fly.io y se pierde en redeploys. Requiere migrar a tabla \`presence\` en Supabase.`;

    const newBlock = `### Estado de los ítems confirmados en Sprint 1

- ✅ **FIX-104** — Filtro de detalles de DB en respuestas 500 → CERRADO (\`43db2a8\`)
- ✅ **HALL-S1-01** — Ownership check en \`getPlaneDetails\` → CERRADO (\`5fbb2d5\`)
- ✅ **HALL-S2-01** — Ampliación de poderes ADMIN (backend) → CERRADO (\`d496f5c\`)
- ✅ **HALL-S2-02** — Dropdown de rol frontend → CERRADO (\`13501af\`)
- ⏳ **FIX-101** — Transacción en \`resetPassword\` (2 UPDATE sin transacción) → Pendiente
- ⏳ **FIX-105** — Transacción en \`changeEventStatus\` (SELECT+UPDATE sin transacción) → Pendiente
- ⏳ **FIX-209** — Presence en memoria no escala → Sprint 2/Sprint 3`;

    const r = safeReplace(current, oldBlock, newBlock, 'PLAN_TRABAJO.md estado Sprint 2');
    if (r.error) abort(`PLAN_TRABAJO.md (estado Sprint 2): ${r.error}`);
    if (r.changed) { current = r.content; didChange = true; }
  }

  if (didChange) writeFile('PLAN_TRABAJO.md', current, content);
}

// ============================================================================
// CAMBIO 3 — docs/auditoria-sprint-1.md: tabla + evidencia
// ============================================================================
function fixAuditoriaSprint1() {
  log(C.bold + C.blue, '\n[3/5]', 'docs/auditoria-sprint-1.md — tabla cierre + evidencia HALL-S2-02...');
  const { content } = readFile('docs/auditoria-sprint-1.md');
  let current = content;
  let didChange = false;

  // --- 3.1: Tabla de cierre, agregar fila HALL-S2-02 ---
  {
    const oldBlock = `| **HALL-S2-01** | Ampliación de poderes del ADMIN (reset, rol, status) | ➕ NUEVO | ✅ **CERRADO** | (ver CHANGELOG v4.5.5) | 2026-09-22 |`;
    const newBlock = `| **HALL-S2-01** | Ampliación de poderes del ADMIN (reset, rol, status) | ➕ NUEVO | ✅ **CERRADO** | (ver CHANGELOG v4.5.5) | 2026-09-22 |
| **HALL-S2-02** | Dropdown de rol frontend no permite seleccionar ADMIN | ➕ NUEVO | ✅ **CERRADO** | \`13501af\` | 2026-09-22 |`;
    const r = safeReplace(current, oldBlock, newBlock, 'auditoria-sprint-1.md tabla');
    if (r.error) abort(`auditoria-sprint-1.md (tabla): ${r.error}`);
    if (r.changed) { current = r.content; didChange = true; }
  }

  // --- 3.2: Sección de evidencia al final ---
  {
    const oldBlock = `- **Rollback:** \`git revert 43db2a8 && git push origin main\``;
    const newBlock = `- **Rollback:** \`git revert 43db2a8 && git push origin main\`

---

## Evidencia de cierre — HALL-S2-02

- **Commit:** \`13501af\` — \`fix(hall-s2-02): habilitar opción ADMIN en dropdown de roles\`
- **Archivo:** \`js/views.js\` (función \`renderAdminMembersTable\`, ~línea 5110)
- **Cambio:** Eliminada la condición \`disabled\` de la opción \`ADMIN\` del \`<select>\`.
- **Sintaxis:** \`node --check js/views.js\` → OK
- **Diff:** 1 inserción, 1 eliminación (cambio quirúrgico)
- **Deploy:** Fly.io \`deployment-01M35PSP3XQ6QAH86CSXW88X4P\`
- **Deploy sin downtime:** rolling deploy \`[1/2]\` y \`[2/2]\` OK
- **Smoke test:** Pendiente verificación visual del dropdown por el OWNER.
- **Rollback:** \`git revert 13501af && git push origin main && fly deploy\``;

    const r = safeReplace(current, oldBlock, newBlock, 'auditoria-sprint-1.md evidencia');
    if (r.error) abort(`auditoria-sprint-1.md (evidencia): ${r.error}`);
    if (r.changed) { current = r.content; didChange = true; }
  }

  if (didChange) writeFile('docs/auditoria-sprint-1.md', current, content);
}

// ============================================================================
// CAMBIO 4 — BACKLOG.md: completados + métrica
// ============================================================================
function fixBacklog() {
  log(C.bold + C.blue, '\n[4/5]', 'BACKLOG.md — completados + métrica...');
  const { content } = readFile('BACKLOG.md');
  let current = content;
  let didChange = false;

  // --- 4.1: Agregar HALL-S2-02 a completados ---
  {
    const oldBlock = `| **HALL-066** | 🐛 | Cadena de 6 bugs bloqueando carga de W38 (v4.5.2-hotfix) | 2026-09-22 | \`7157492\` |`;
    const newBlock = `| **HALL-066** | 🐛 | Cadena de 6 bugs bloqueando carga de W38 (v4.5.2-hotfix) | 2026-09-22 | \`7157492\` |
| **HALL-S2-02** | 🐛 | Dropdown de rol frontend no permitía seleccionar ADMIN | 2026-09-22 | \`13501af\` |`;
    const r = safeReplace(current, oldBlock, newBlock, 'BACKLOG.md completados');
    if (r.error) abort(`BACKLOG.md (completados): ${r.error}`);
    if (r.changed) { current = r.content; didChange = true; }
  }

  // --- 4.2: Métrica de completados ---
  {
    const oldBlock = `| Items activos | 17 |
| Items completados | 7 |`;
    const newBlock = `| Items activos | 17 |
| Items completados | 8 |`;
    const r = safeReplace(current, oldBlock, newBlock, 'BACKLOG.md métrica');
    if (r.error) abort(`BACKLOG.md (métrica): ${r.error}`);
    if (r.changed) { current = r.content; didChange = true; }
  }

  if (didChange) writeFile('BACKLOG.md', current, content);
}

// ============================================================================
// CAMBIO 5 — CURRENT_STATE.md: header + tabla módulos
// ============================================================================
function fixCurrentState() {
  log(C.bold + C.blue, '\n[5/5]', 'CURRENT_STATE.md — header + tabla módulos...');
  const { content } = readFile('CURRENT_STATE.md');
  let current = content;
  let didChange = false;

  // --- 5.1: Header versión activa ---
  {
    const oldBlock = `> **Versión Activa:** v4.5.3 (HALL-066-septies: user_id string numérico)`;
    const newBlock = `> **Versión Activa:** v4.5.6 (HALL-S2-02: dropdown de roles frontend)`;
    const r = safeReplace(current, oldBlock, newBlock, 'CURRENT_STATE.md header');
    if (r.error) abort(`CURRENT_STATE.md (header): ${r.error}`);
    if (r.changed) { current = r.content; didChange = true; }
  }

  // --- 5.2: Tabla de módulos, agregar fila ---
  {
    const oldBlock = `| **Cambio de Nick Autogestionado (v4.5.0)** | ✅ Funcional | MIEMBRO/VETERANO: 1 cambio. ADMIN/OWNER: ilimitado. Auditoría en \`user_nick_changes\`. Regex permisivo con Unicode (\`ñ\`, tildes, espacios). |`;
    const newBlock = `| **Cambio de Nick Autogestionado (v4.5.0)** | ✅ Funcional | MIEMBRO/VETERANO: 1 cambio. ADMIN/OWNER: ilimitado. Auditoría en \`user_nick_changes\`. Regex permisivo con Unicode (\`ñ\`, tildes, espacios). |
| **Dropdown de Roles (HALL-S2-02, v4.5.6)** | ✅ Funcional | Opción ADMIN siempre habilitada en el \`<select>\` de \`renderAdminMembersTable\`. Backend valida cuota (5) y jerarquía. |`;
    const r = safeReplace(current, oldBlock, newBlock, 'CURRENT_STATE.md módulos');
    if (r.error) abort(`CURRENT_STATE.md (módulos): ${r.error}`);
    if (r.changed) { current = r.content; didChange = true; }
  }

  if (didChange) writeFile('CURRENT_STATE.md', current, content);
}

// ============================================================================
// PASO FINAL — git add + commit + push
// ============================================================================
function gitPush() {
  const files = [
    'CHANGELOG.md',
    'PLAN_TRABAJO.md',
    'docs/auditoria-sprint-1.md',
    'BACKLOG.md',
    'CURRENT_STATE.md',
    'scripts/apply-hall-s2-02-docs.cjs'
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
  const commitMsg = 'docs(hall-s2-02): documentar cierre del fix en 5 archivos';
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
║  PARAGUAY-FFAA | METALSTORM — Docs HALL-S2-02 (5 archivos)       ║
╚══════════════════════════════════════════════════════════════════╝${C.reset}`);

log(C.gray, '[MODE]', APPLY ? 'APPLY + COMMIT + PUSH' : 'DRY-RUN (sin cambios)');

try {
  fixChangelog();
  fixPlanTrabajo();
  fixAuditoriaSprint1();
  fixBacklog();
  fixCurrentState();
} catch (err) {
  abort(`Error durante la aplicación de cambios: ${err.message}`);
}

if (!APPLY) {
  console.log(`\n${C.yellow}${C.bold}MODO DRY-RUN — No se modificó nada.${C.reset}`);
  console.log(`\n${C.bold}SIGUIENTE PASO (aplicar + commit + push automático):${C.reset}`);
  console.log(`  node scripts\\apply-hall-s2-02-docs.cjs --apply`);
  process.exit(0);
}

// Modo APPLY: commit y push automático
gitPush();

console.log(`\n${C.green}${C.bold}✅ DOCUMENTACIÓN ACTUALIZADA Y SUBIDA A GITHUB.${C.reset}`);
console.log(`\n${C.bold}Rollback si algo falla:${C.reset}`);
console.log(`  git revert HEAD && git push origin main`);
console.log(`\n${C.bold}Backups de seguridad creados (por si acaso):${C.reset}`);
console.log(`  *.bak-hall-s2-02 (en cada archivo modificado)`);
console.log(`\n${C.bold}Limpiar backups tras verificar:${C.reset}`);
console.log(`  del *.bak-hall-s2-02`);