#!/usr/bin/env node
/**
 * ============================================================================
 * PARAGUAY-FFAA | METALSTORM
 * SCRIPT: Actualización documental post-cierre de FIX-104
 * Archivo: scripts/update-docs-fix104.cjs
 * ============================================================================
 *
 * USO:
 *   node scripts/update-docs-fix104.cjs          # dry-run (no modifica nada)
 *   node scripts/update-docs-fix104.cjs --apply  # aplica cambios + backup
 *   node scripts/update-docs-fix104.cjs --help   # ayuda
 *
 * QUÉ HACE:
 *   1. Actualiza PLAN_TRABAJO.md → agrega sección Sprint 2 con FIX-104
 *   2. Actualiza docs/auditoria-sprint-1.md → agrega sección "Estado de cierre"
 *   3. Crea backup .bak de cada archivo antes de tocarlo
 *   4. Es idempotente: si el bloque ya existe, no lo duplica
 *
 * QUÉ NO HACE:
 *   - No hace commit ni push (eso lo hacés vos)
 *   - No toca ningún otro documento
 *   - No toca código de producción
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

// ============================================================
// CONFIGURACIÓN
// ============================================================

const ROOT_DIR = path.resolve(__dirname, '..');
const DRY_RUN = !process.argv.includes('--apply');
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

// ============================================================
// HELP
// ============================================================

if (SHOW_HELP) {
  console.log(`
${COLORS.bold}SCRIPT: update-docs-fix104.cjs${COLORS.reset}

${COLORS.bold}USO:${COLORS.reset}
  node scripts/update-docs-fix104.cjs          # dry-run (no modifica nada)
  node scripts/update-docs-fix104.cjs --apply  # aplica cambios + backup
  node scripts/update-docs-fix104.cjs --help   # esta ayuda

${COLORS.bold}DESCRIPCIÓN:${COLORS.reset}
  Actualiza PLAN_TRABAJO.md y docs/auditoria-sprint-1.md
  con la información de cierre de FIX-104 (commit 43db2a8).

${COLORS.bold}SALVAGUARDAS:${COLORS.reset}
  - Dry-run por defecto: solo muestra qué haría
  - Backup automático (.bak) antes de escribir
  - Idempotente: no duplica bloques si ya existen
  - Verificación post-write: diff resumido al final
`);
  process.exit(0);
}

// ============================================================
// UTILIDADES
// ============================================================

/**
 * Lee un archivo y devuelve su contenido como string.
 */
function readFile(relPath) {
  const absPath = path.join(ROOT_DIR, relPath);
  if (!fs.existsSync(absPath)) {
    throw new Error(`Archivo no encontrado: ${relPath}`);
  }
  return { absPath, content: fs.readFileSync(absPath, 'utf8') };
}

/**
 * Escribe un archivo (o simula en dry-run).
 * Crea un backup .bak antes de escribir en modo --apply.
 */
function writeFile(relPath, absPath, newContent, oldContent) {
  if (DRY_RUN) {
    log(COLORS.yellow, '[DRY-RUN]', `NO se modificará: ${relPath}`);
    return;
  }

  // Backup
  const backupPath = absPath + '.bak';
  fs.writeFileSync(backupPath, oldContent, 'utf8');
  log(COLORS.gray, '[BACKUP]', `Creado: ${path.relative(ROOT_DIR, backupPath)}`);

  // Escritura
  fs.writeFileSync(absPath, newContent, 'utf8');
  log(COLORS.green, '[WRITE]', `Modificado: ${relPath}`);
}

/**
 * Calcula cuántas líneas se agregan/eliminan entre dos strings.
 */
function diffStats(oldStr, newStr) {
  const oldLines = oldStr.split('\n').length;
  const newLines = newStr.split('\n').length;
  const delta = newLines - oldLines;
  return { oldLines, newLines, delta };
}

// ============================================================
// BLOQUE 1 — PLAN_TRABAJO.md
// ============================================================

const PLAN_BLOCK = `

---

### Sprint 2 — Fixes de seguridad y correctitud (EN CURSO)

| ID | Descripción | Fecha | Commit |
|---|---|---|---|
| **FIX-104** | \`src/middlewares/errorHandler.js\` — filtrar detalles de DB en respuestas 500 | 2026-09-22 | \`43db2a8\` |
`;

function updatePlanTrabajo() {
  log(COLORS.bold + COLORS.blue, '\n[1/2]', 'Actualizando PLAN_TRABAJO.md...');

  const { absPath, content } = readFile('PLAN_TRABAJO.md');

  // Verificar idempotencia: si ya tiene el bloque del Sprint 2 con FIX-104, skip.
  if (content.includes('### Sprint 2 — Fixes de seguridad y correctitud') &&
      content.includes('FIX-104') &&
      content.includes('43db2a8')) {
    log(COLORS.yellow, '[SKIP]', 'El bloque Sprint 2 ya existe con FIX-104. No se modifica.');
    return false;
  }

  // Estrategia: insertar después de la sección "## 9. ❌ DESCARTADOS"
  // (o al final de la sección "## 8. ✅ COMPLETADOS" si existe).
  // Buscamos el marcador "## 9. ❌ DESCARTADOS" y metemos el bloque antes.

  const anchor = '## 9. ❌ DESCARTADOS';
  const anchorIndex = content.indexOf(anchor);

  if (anchorIndex === -1) {
    throw new Error('No se encontró el ancla "## 9. ❌ DESCARTADOS" en PLAN_TRABAJO.md');
  }

  const before = content.slice(0, anchorIndex);
  const after = content.slice(anchorIndex);

  // Insertar el bloque justo antes del anchor
  const newContent = before.trimEnd() + '\n' + PLAN_BLOCK + '\n' + after;

  const stats = diffStats(content, newContent);
  log(COLORS.cyan, '[INFO]', `Líneas antes: ${stats.oldLines} → después: ${stats.newLines} (Δ ${stats.delta >= 0 ? '+' : ''}${stats.delta})`);

  writeFile('PLAN_TRABAJO.md', absPath, newContent, content);
  return true;
}

// ============================================================
// BLOQUE 2 — docs/auditoria-sprint-1.md
// ============================================================

const AUDITORIA_BLOCK = `

---

## Estado de cierre (actualizado 2026-09-22)

Verificación de los fixes confirmados en el Sprint 1, con sus commits de resolución en Sprint 2:

| ID | Hallazgo | Estado Sprint 1 | Estado Sprint 2 | Commit | Fecha |
|---|---|---|---|---|---|
| **FIX-104** | Filtro de detalles de DB en 500 | ✅ CONFIRMADO | ✅ **CERRADO** | \`43db2a8\` | 2026-09-22 |
| **HALL-S1-01** | Ownership check en \`getPlaneDetails\` | ✅ CONFIRMADO | ⏳ Pendiente | — | — |
| **FIX-101** | Transacción en \`resetPassword\` | 🟡 CONFIRMADO PARCIAL | ⏳ Pendiente | — | — |
| **FIX-105** | Transacción en \`changeEventStatus\` | 🟡 CONFIRMADO PARCIAL | ⏳ Pendiente | — | — |
| **FIX-103** | CSP unsafe-inline → nonce/hash | 🟡 CONFIRMADO PARCIAL | ⏳ Sprint 3 | — | — |

**Los 4 hallazgos descartados** (FIX-102, FIX-106, FIX-107, FIX-108) no requieren acción y quedan documentados en la sección principal.

---

## Evidencia de cierre — FIX-104

- **Commit:** \`43db2a8\` — \`fix(fix-104): filtrar detalles de DB en respuestas 500\`
- **Archivo:** \`src/middlewares/errorHandler.js\` (16 insertions, 3 deletions)
- **Tests:** 179/179 passing (Vitest 5.0.1)
- **Sintaxis:** \`node --check\` → OK
- **Deploy:** Fly.io \`deployment-01M34FDGV3NYHVMEHHGKKYW95G\`
- **Smoke test 1:** \`/api/health\` → \`online\` + uptime 4379s
- **Smoke test 2:** Login inválido → 401 con mensaje específico (4xx intacto)
- **Rollback:** \`git revert 43db2a8 && git push origin main\`
`;

function updateAuditoriaSprint1() {
  log(COLORS.bold + COLORS.blue, '\n[2/2]', 'Actualizando docs/auditoria-sprint-1.md...');

  const { absPath, content } = readFile('docs/auditoria-sprint-1.md');

  // Idempotencia
  if (content.includes('## Estado de cierre (actualizado 2026-09-22)') &&
      content.includes('43db2a8')) {
    log(COLORS.yellow, '[SKIP]', 'La sección "Estado de cierre" ya existe. No se modifica.');
    return false;
  }

  // Estrategia: append al final del documento.
  const newContent = content.trimEnd() + '\n' + AUDITORIA_BLOCK;

  const stats = diffStats(content, newContent);
  log(COLORS.cyan, '[INFO]', `Líneas antes: ${stats.oldLines} → después: ${stats.newLines} (Δ ${stats.delta >= 0 ? '+' : ''}${stats.delta})`);

  writeFile('docs/auditoria-sprint-1.md', absPath, newContent, content);
  return true;
}

// ============================================================
// MAIN
// ============================================================

function main() {
  console.log(`${COLORS.bold}${COLORS.cyan}
╔══════════════════════════════════════════════════════════════════╗
║  PARAGUAY-FFAA | METALSTORM — Actualización documental FIX-104   ║
╚══════════════════════════════════════════════════════════════════╝${COLORS.reset}`);

  if (DRY_RUN) {
    log(COLORS.yellow, '\n[MODE]', 'DRY-RUN (no se modifica nada). Ejecutá con --apply para aplicar.');
  } else {
    log(COLORS.green, '\n[MODE]', 'APPLY (se van a modificar los archivos + backup automático).');
  }

  log(COLORS.gray, '[ROOT]', ROOT_DIR);

  try {
    const planChanged = updatePlanTrabajo();
    const auditChanged = updateAuditoriaSprint1();

    console.log(`\n${COLORS.bold}RESUMEN:${COLORS.reset}`);
    log(COLORS.gray, '  PLAN_TRABAJO.md              ', planChanged ? '✅ modificado' : '⏭️  sin cambios (ya estaba)');
    log(COLORS.gray, '  docs/auditoria-sprint-1.md   ', auditChanged ? '✅ modificado' : '⏭️  sin cambios (ya estaba)');

    if (DRY_RUN) {
      console.log(`\n${COLORS.yellow}${COLORS.bold}SIGUIENTE PASO:${COLORS.reset}`);
      console.log(`  ${COLORS.gray}Revisá el dry-run. Si todo está OK, ejecutá:${COLORS.reset}`);
      console.log(`  ${COLORS.cyan}node scripts/update-docs-fix104.cjs --apply${COLORS.reset}\n`);
    } else {
      console.log(`\n${COLORS.green}${COLORS.bold}✅ CAMBIOS APLICADOS.${COLORS.reset}`);
      console.log(`\n${COLORS.bold}SIGUIENTE PASO:${COLORS.reset}`);
      console.log(`  ${COLORS.gray}1. Revisá los cambios con:${COLORS.reset}`);
      console.log(`     ${COLORS.cyan}git diff PLAN_TRABAJO.md docs/auditoria-sprint-1.md${COLORS.reset}`);
      console.log(`  ${COLORS.gray}2. Si todo está OK, commiteá:${COLORS.reset}`);
      console.log(`     ${COLORS.cyan}git add PLAN_TRABAJO.md docs/auditoria-sprint-1.md${COLORS.reset}`);
      console.log(`     ${COLORS.cyan}git commit -m "docs(fix-104): cerrar ítem en plan de trabajo + auditoría"${COLORS.reset}`);
      console.log(`     ${COLORS.cyan}git push origin main${COLORS.reset}`);
      console.log(`  ${COLORS.gray}3. Si algo salió mal, restaurá desde .bak:${COLORS.reset}`);
      console.log(`     ${COLORS.cyan}copy PLAN_TRABAJO.md.bak PLAN_TRABAJO.md${COLORS.reset}`);
      console.log(`     ${COLORS.cyan}copy docs\\auditoria-sprint-1.md.bak docs\\auditoria-sprint-1.md${COLORS.reset}\n`);
    }
  } catch (err) {
    console.error(`\n${COLORS.red}${COLORS.bold}❌ ERROR:${COLORS.reset} ${err.message}\n`);
    process.exit(1);
  }
}

main();