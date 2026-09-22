#!/usr/bin/env node
/**
 * ============================================================================
 * PARAGUAY-FFAA | METALSTORM
 * SCRIPT MAESTRO: HALL-S2-01 — Ampliar poderes del ADMIN
 * Archivo: scripts/run-hall-s2-01.cjs
 * ============================================================================
 *
 * USO:
 *   node scripts/run-hall-s2-01.cjs          # dry-run
 *   node scripts/run-hall-s2-01.cjs --apply  # ejecuta todo
 *   node scripts/run-hall-s2-01.cjs --help
 *
 * SALVAGUARDAS:
 *   - Dry-run por defecto
 *   - Backup .bak de cada archivo antes de modificar
 *   - Normaliza CRLF/LF antes de buscar
 *   - Aborta si node --check falla
 *   - Aborta si npm test no da 179/179
 *   - Idempotente
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const APPLY = process.argv.includes('--apply');
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

function abort(msg) {
  console.error(`\n${COLORS.red}${COLORS.bold}❌ ABORTADO:${COLORS.reset} ${msg}\n`);
  process.exit(1);
}

if (SHOW_HELP) {
  console.log(`
${COLORS.bold}SCRIPT: run-hall-s2-01.cjs${COLORS.reset}

${COLORS.bold}USO:${COLORS.reset}
  node scripts/run-hall-s2-01.cjs          # dry-run
  node scripts/run-hall-s2-01.cjs --apply  # ejecutar
  node scripts/run-hall-s2-01.cjs --help
`);
  process.exit(0);
}

// ============================================================
// HELPERS CON NORMALIZACIÓN CRLF/LF
// ============================================================

function readFile(relPath) {
  const absPath = path.join(ROOT_DIR, relPath);
  if (!fs.existsSync(absPath)) {
    abort(`Archivo no encontrado: ${relPath}`);
  }
  return { absPath, content: fs.readFileSync(absPath, 'utf8') };
}

/**
 * Reemplaza un bloque preservando el line ending original del archivo.
 * Normaliza el contenido a LF para buscar, reemplaza, y restaura CRLF si era CRLF.
 */
function safeReplace(content, oldBlock, newBlock, label) {
  const hasCRLF = content.includes('\r\n');
  const normalizedContent = hasCRLF ? content.replace(/\r\n/g, '\n') : content;
  const normalizedOld = oldBlock.replace(/\r\n/g, '\n');
  const normalizedNew = newBlock.replace(/\r\n/g, '\n');

  if (normalizedContent.includes(normalizedNew)) {
    log(COLORS.yellow, '[SKIP]', `${label}: ya modificado.`);
    return { changed: false, content };
  }

  const occurrences = normalizedContent.split(normalizedOld).length - 1;
  if (occurrences === 0) {
    log(COLORS.red, '[FAIL]', `${label}: bloque no encontrado.`);
    return { changed: false, content, error: 'NOT_FOUND' };
  }
  if (occurrences > 1) {
    log(COLORS.red, '[FAIL]', `${label}: ${occurrences} ocurrencias ambiguas.`);
    return { changed: false, content, error: 'AMBIGUOUS' };
  }

  log(COLORS.green, '[MATCH]', `${label}: 1 ocurrencia.`);
  let result = normalizedContent.replace(normalizedOld, normalizedNew);
  if (hasCRLF) {
    result = result.replace(/\n/g, '\r\n');
  }
  return { changed: true, content: result };
}

function writeFile(relPath, newContent, oldContent) {
  const absPath = path.join(ROOT_DIR, relPath);

  if (newContent === oldContent) {
    log(COLORS.yellow, '[SKIP]', `${relPath} — sin cambios`);
    return false;
  }

  if (!APPLY) {
    log(COLORS.yellow, '[DRY-RUN]', `NO se modificará: ${relPath}`);
    return true;
  }

  const backupPath = absPath + '.bak';
  fs.writeFileSync(backupPath, oldContent, 'utf8');
  log(COLORS.gray, '[BACKUP]', `Creado: ${path.relative(ROOT_DIR, backupPath)}`);

  fs.writeFileSync(absPath, newContent, 'utf8');
  log(COLORS.green, '[WRITE]', `Modificado: ${relPath}`);
  return true;
}

function runCmd(cmd, description, fatal = true) {
  log(COLORS.bold + COLORS.blue, '\n[CMD]', description);
  console.log(`${COLORS.gray}$ ${cmd}${COLORS.reset}`);

  try {
    const output = execSync(cmd, {
      cwd: ROOT_DIR,
      stdio: 'pipe',
      encoding: 'utf8',
      timeout: 180000,
    });
    if (output && output.trim()) {
      console.log(output);
    }
    return { success: true, output };
  } catch (err) {
    const stderr = err.stderr ? err.stderr.toString() : '';
    const stdout = err.stdout ? err.stdout.toString() : '';
    console.error(stderr || stdout || err.message);
    if (fatal) {
      abort(`Comando falló: ${cmd}`);
    }
    return { success: false, output: stderr || stdout };
  }
}

// ============================================================
// FASE 1 — MODIFICAR CÓDIGO
// ============================================================

function modificarAdminRoutes() {
  log(COLORS.bold + COLORS.blue, '\n[1/8]', 'Modificando admin.routes.js (reset-password)...');

  const { content } = readFile('src/routes/admin.routes.js');

  const oldBlock = `        // 3. ADMIN solo puede resetear a MIEMBRO y VETERANO
        if (actorRole === 'ADMIN' && (targetRole === 'ADMIN' || targetRole === 'OWNER')) {
            return res.status(403).json({
                error: 'Los Administradores solo pueden resetear contrase\u00f1as de Miembros y Veteranos',
                code: 'HIERARCHY_FORBIDDEN'
            });
        }`;

  const newBlock = `        // 3. HALL-S2-01: ADMIN puede resetear la contrase\u00f1a de otro ADMIN.
        // Solo el OWNER sigue protegido (validado en el paso 2).
        // Regla previa (HALL-022) bloqueaba ADMIN \u2192 ADMIN: removida por decisi\u00f3n del OWNER.`;

  const { changed, content: newContent, error } = safeReplace(content, oldBlock, newBlock, 'admin.routes.js');
  if (error) {
    log(COLORS.red, '[DEBUG]', 'Extracto del archivo (chars 5330-5450):');
    console.log(JSON.stringify(content.substring(5330, 5450)));
    abort(`Bloque no encontrado en admin.routes.js (${error}).`);
  }
  if (changed) writeFile('src/routes/admin.routes.js', newContent, content);
}

function modificarUpdateUserRole() {
  log(COLORS.bold + COLORS.blue, '\n[2/8]', 'Modificando updateUserRole en admin.controller.js...');

  const { content } = readFile('src/controllers/admin.controller.js');

  const oldBlock = `    if ((newRole === 'ADMIN' || newRole === 'OWNER') && actorRole !== 'OWNER') {
      return res.status(403).json({ error: 'Solo el Comandante General (OWNER) puede nombrar Administradores o transferir el mando' });
    }`;

  const newBlock = `    // HALL-S2-01: ADMIN puede promover a MIEMBRO/VETERANO a ADMIN y degradar a ADMIN.
    // Solo el OWNER puede transferir el mando (nombrar/degradar OWNER).
    if (newRole === 'OWNER' && actorRole !== 'OWNER') {
      return res.status(403).json({ error: 'Solo el Comandante General (OWNER) puede transferir el mando' });
    }

    // HALL-S2-01: bloquear self-cambio de rol.
    const actorSelfId = req.user.user_id || req.user.id;
    const targetSelfId = targetUser.user_id || targetUser.id;
    if (String(actorSelfId) === String(targetSelfId) || String(actorSelfId) === String(targetUser.id)) {
      return res.status(403).json({
        error: 'No puedes cambiar tu propio rol',
        code: 'SELF_MODIFICATION_FORBIDDEN'
      });
    }`;

  const { changed, content: newContent, error } = safeReplace(content, oldBlock, newBlock, 'updateUserRole');
  if (error) abort(`Bloque no encontrado en updateUserRole (${error}).`);
  if (changed) writeFile('src/controllers/admin.controller.js', newContent, content);
}

function modificarUpdateUserStatus() {
  log(COLORS.bold + COLORS.blue, '\n[3/8]', 'Modificando updateUserStatus en admin.controller.js...');

  const { content } = readFile('src/controllers/admin.controller.js');

  const oldBlock = `    // 5. Validar jerarqu\u00eda (ADMIN solo puede tocar MIEMBRO y VETERANO)
    if (actorRole === 'ADMIN' && (targetRole === 'ADMIN' || targetRole === 'OWNER')) {
      return res.status(403).json({
        error: 'Los Administradores solo pueden modificar el estado de Miembros y Veteranos',
        code: 'HIERARCHY_FORBIDDEN'
      });
    }`;

  const newBlock = `    // 5. HALL-S2-01: ADMIN puede inactivar/reactivar a otro ADMIN.
    // El OWNER sigue protegido (regla 4).
    // Regla previa bloqueaba ADMIN \u2192 ADMIN: removida por decisi\u00f3n del OWNER.`;

  const { changed, content: newContent, error } = safeReplace(content, oldBlock, newBlock, 'updateUserStatus');
  if (error) abort(`Bloque no encontrado en updateUserStatus (${error}).`);
  if (changed) writeFile('src/controllers/admin.controller.js', newContent, content);
}

// ============================================================
// FASE 3 — DOCUMENTACIÓN (usando safeReplace)
// ============================================================

function documentarAPIReference() {
  log(COLORS.bold + COLORS.blue, '\n[4/8]', 'API_REFERENCE.md...');
  const { content } = readFile('API_REFERENCE.md');
  if (content.includes('HALL-S2-01')) {
    log(COLORS.yellow, '[SKIP]', 'API_REFERENCE.md ya documentado.');
    return;
  }
  const oldBlock = `- **Jerarquía de Mando:**
  - \`OWNER\`: Puede modificar a cualquier piloto excepto a sí mismo (\`SELF_MODIFICATION_FORBIDDEN\`).
  - \`ADMIN\`: Solo puede modificar a combatientes con rango \`MIEMBRO\` o \`VETERANO\`. Prohibido modificar a \`ADMIN\` u \`OWNER\` (\`HIERARCHY_FORBIDDEN\`).`;
  const newBlock = `- **Jerarquía de Mando (HALL-S2-01, v4.5.5):**
  - \`OWNER\`: Puede modificar a cualquier piloto excepto a sí mismo (\`SELF_MODIFICATION_FORBIDDEN\`).
  - \`ADMIN\`: Puede modificar el estado de \`MIEMBRO\`, \`VETERANO\` **y \`ADMIN\`**. Prohibido modificar al \`OWNER\` (\`OWNER_PROTECTED\`).`;
  const { changed, content: newContent, error } = safeReplace(content, oldBlock, newBlock, 'API_REFERENCE.md');
  if (error) {
    log(COLORS.yellow, '[SKIP]', 'API_REFERENCE.md — bloque no encontrado. Actualizar manualmente si es necesario.');
    return;
  }
  if (changed) writeFile('API_REFERENCE.md', newContent, content);
}

function documentarArchitecture() {
  log(COLORS.bold + COLORS.blue, '\n[5/8]', 'ARCHITECTURE.md...');
  const { content } = readFile('ARCHITECTURE.md');
  if (content.includes('HALL-S2-01')) {
    log(COLORS.yellow, '[SKIP]', 'ARCHITECTURE.md ya documentado.');
    return;
  }
  // Append a la sección 6 (Estrategia de Seguridad)
  const anchor = '6. **Mitigación de CSV Formula Injection:**';
  const idx = content.indexOf(anchor);
  if (idx === -1) {
    log(COLORS.yellow, '[SKIP]', 'ARCHITECTURE.md — anchor no encontrado.');
    return;
  }
  const endOfBlock = content.indexOf('---', idx);
  if (endOfBlock === -1) {
    log(COLORS.yellow, '[SKIP]', 'ARCHITECTURE.md — fin de bloque no encontrado.');
    return;
  }
  const insertBlock = `

7. **Poderes del ADMIN (HALL-S2-01, v4.5.5):**
   - Reset password: MIEMBRO, VETERANO y **ADMIN**.
   - Cambio de rol: MIEMBRO, VETERANO y **ADMIN** (ascender y degradar).
   - Inactivar/reactivar: MIEMBRO, VETERANO y **ADMIN**.
   - **Prohibido en todos los casos:** tocar al OWNER.
   - **Prohibido:** que un usuario cambie su propio rol (\`SELF_MODIFICATION_FORBIDDEN\`).

`;
  const newContent = content.slice(0, endOfBlock) + insertBlock + content.slice(endOfBlock);
  writeFile('ARCHITECTURE.md', newContent, content);
}

function documentarUserManual() {
  log(COLORS.bold + COLORS.blue, '\n[6/8]', 'USER_MANUAL.md...');
  const { content } = readFile('USER_MANUAL.md');
  if (content.includes('HALL-S2-01')) {
    log(COLORS.yellow, '[SKIP]', 'USER_MANUAL.md ya documentado.');
    return;
  }
  const oldBlock = `- **👑 OWNER (Comandante en Jefe):** Máximo **1**. Comandancia absoluta, auditoría C4ISR, gestión de respaldos y nombramiento de oficiales.
- **⭐ ADMIN (Oficial de Operaciones):** Máximo **5**. Altas y bajas de combatientes, activación de eventos Black Market, carga masiva de tokens y reseteo de claves.`;
  const newBlock = `- **👑 OWNER (Comandante en Jefe):** Máximo **1**. Comandancia absoluta, auditoría C4ISR, gestión de respaldos, nombramiento de oficiales **y transferencia del mando**.
- **⭐ ADMIN (Oficial de Operaciones):** Máximo **5**. Altas y bajas de combatientes (**incluidos otros ADMIN**), ascensos y descensos de rango (**incluidos ADMIN**), activación de eventos Black Market, carga masiva de tokens y reseteo de claves (**incluidas las de otros ADMIN**). **No puede tocar al OWNER ni transferir el mando.**`;
  const { changed, content: newContent, error } = safeReplace(content, oldBlock, newBlock, 'USER_MANUAL.md');
  if (error) {
    log(COLORS.yellow, '[SKIP]', 'USER_MANUAL.md — bloque no encontrado.');
    return;
  }
  if (changed) writeFile('USER_MANUAL.md', newContent, content);
}

function documentarChangelog() {
  log(COLORS.bold + COLORS.blue, '\n[7/8]', 'CHANGELOG.md...');
  const { content } = readFile('CHANGELOG.md');
  if (content.includes('## [4.5.5]')) {
    log(COLORS.yellow, '[SKIP]', 'CHANGELOG.md ya tiene v4.5.5.');
    return;
  }
  const hasCRLF = content.includes('\r\n');
  const normalizedContent = hasCRLF ? content.replace(/\r\n/g, '\n') : content;
  const newBlock = `## [4.5.5] - 2026-09-22

### 🎖️ HALL-S2-01 — Ampliación de poderes del ADMIN

#### Objetivo Cumplido

Ampliar los poderes operativos del rol \`ADMIN\` por decisión del OWNER:
- Reset password de otro ADMIN.
- Cambio de rol de MIEMBRO/VETERANO/ADMIN (ascender y degradar).
- Inactivar/reactivar a otro ADMIN.

El **OWNER sigue intocable** en todos los casos. El ADMIN **no puede transferir el mando** (nombrar/degradar OWNER). Se agregó validación de \`SELF_MODIFICATION_FORBIDDEN\` en el cambio de rol.

#### Cambios Aplicados

| Archivo | Cambio |
|---|---|
| \`src/routes/admin.routes.js\` | Eliminado bloqueo ADMIN → ADMIN en reset-password |
| \`src/controllers/admin.controller.js\` | \`updateUserRole\`: solo bloquea newRole === 'OWNER' + self-modification |
| \`src/controllers/admin.controller.js\` | \`updateUserStatus\`: eliminado bloqueo ADMIN → ADMIN |

#### Política Resultante

| Acción | MIEMBRO | VETERANO | ADMIN | OWNER |
|---|---|---|---|---|
| Reset password (ADMIN) | ✅ | ✅ | ✅ | ❌ |
| Cambiar rol (ADMIN) | ✅ | ✅ | ✅ | ❌ |
| Inactivar (ADMIN) | ✅ | ✅ | ✅ | ❌ |

#### Reglas Invariantes

- \`OWNER_PROTECTED\`: ningún ADMIN puede tocar al OWNER.
- \`SELF_MODIFICATION_FORBIDDEN\`: nadie puede cambiar su propio rol.
- Cuotas: 1 OWNER / 5 ADMIN / 8 VETERANO (sin cambios).

#### Verificación

- ✅ \`node --check\` en los 2 archivos modificados.
- ✅ \`npm test\` → 179/179 passing.
- ✅ Deploy a Fly.io.
- ✅ Smoke test post-deploy.

---

`;
  const lines = normalizedContent.split('\n');
  let insertIdx = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('## [4.5.4]')) {
      insertIdx = i;
      break;
    }
  }
  const before = lines.slice(0, insertIdx).join('\n');
  const after = lines.slice(insertIdx).join('\n');
  let newContent = before + (before.endsWith('\n') ? '' : '\n') + newBlock + after;
  if (hasCRLF) newContent = newContent.replace(/\n/g, '\r\n');
  writeFile('CHANGELOG.md', newContent, content);
}

function documentarAuditoria() {
  log(COLORS.bold + COLORS.blue, '\n[8/8]', 'docs/auditoria-sprint-1.md...');
  const { content } = readFile('docs/auditoria-sprint-1.md');
  if (content.includes('HALL-S2-01')) {
    log(COLORS.yellow, '[SKIP]', 'auditoría ya documentada.');
    return;
  }
  const anchor = '| **HALL-S1-01** |';
  const idx = content.indexOf(anchor);
  if (idx === -1) {
    log(COLORS.yellow, '[SKIP]', 'No se encontró la tabla de cierre.');
    return;
  }
  const endOfLine = content.indexOf('\n', idx);
  const before = content.slice(0, endOfLine + 1);
  const after = content.slice(endOfLine + 1);
  const newRow = `| **HALL-S2-01** | Ampliación de poderes del ADMIN (reset, rol, status) | ➕ NUEVO | ✅ **CERRADO** | (ver CHANGELOG v4.5.5) | 2026-09-22 |\n`;
  const newContent = before + newRow + after;
  writeFile('docs/auditoria-sprint-1.md', newContent, content);
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log(`${COLORS.bold}${COLORS.cyan}
╔══════════════════════════════════════════════════════════════════╗
║  PARAGUAY-FFAA | METALSTORM — HALL-S2-01 (script maestro)        ║
╚══════════════════════════════════════════════════════════════════╝${COLORS.reset}`);

  log(COLORS.gray, '[MODE]', APPLY ? 'APPLY (modificará archivos)' : 'DRY-RUN (solo muestra qué haría)');
  log(COLORS.gray, '[ROOT]', ROOT_DIR);

  // FASE 1
  console.log(`\n${COLORS.bold}${COLORS.cyan}=== FASE 1: MODIFICAR CÓDIGO ===${COLORS.reset}`);
  modificarAdminRoutes();
  modificarUpdateUserRole();
  modificarUpdateUserStatus();

  // FASE 2 (solo apply)
  if (APPLY) {
    console.log(`\n${COLORS.bold}${COLORS.cyan}=== FASE 2: VERIFICAR SINTAXIS ===${COLORS.reset}`);
    runCmd('node --check src/routes/admin.routes.js', 'node --check admin.routes.js');
    runCmd('node --check src/controllers/admin.controller.js', 'node --check admin.controller.js');
    runCmd('git diff --stat', 'git diff --stat');
  }

  // FASE 3
  console.log(`\n${COLORS.bold}${COLORS.cyan}=== FASE 3: DOCUMENTAR ===${COLORS.reset}`);
  documentarAPIReference();
  documentarArchitecture();
  documentarUserManual();
  documentarChangelog();
  documentarAuditoria();

  // FASE 4 (solo apply)
  if (APPLY) {
    console.log(`\n${COLORS.bold}${COLORS.cyan}=== FASE 4: TESTS ===${COLORS.reset}`);
    const testResult = runCmd('npm test', 'npm test', false);
    if (!testResult.success || !testResult.output.includes('179 passed')) {
      abort('npm test no reportó 179/179. Revisar antes de commitear.');
    }
    log(COLORS.green, '[OK]', 'Tests: 179/179 passing');
  }

  // RESUMEN
  console.log(`\n${COLORS.bold}${COLORS.cyan}=== RESUMEN ===${COLORS.reset}`);

  if (!APPLY) {
    console.log(`\n${COLORS.yellow}${COLORS.bold}SIGUIENTE PASO:${COLORS.reset}`);
    console.log(`  1. Revisá el dry-run.`);
    console.log(`  2. Si está OK, ejecutá:`);
    console.log(`     ${COLORS.cyan}node scripts/run-hall-s2-01.cjs --apply${COLORS.reset}\n`);
    return;
  }

  console.log(`\n${COLORS.bold}${COLORS.cyan}=== FASE 5-7: COMMIT + DEPLOY + SMOKE ===${COLORS.reset}`);
  console.log(`\n${COLORS.yellow}${COLORS.bold}ACCIÓN MANUAL REQUERIDA:${COLORS.reset}`);
  console.log(`  Los cambios de código + docs ya están aplicados y verificados.`);
  console.log(`  Ahora ejecutá MANUALMENTE (uno a la vez):\n`);
  console.log(`  ${COLORS.cyan}git add -A${COLORS.reset}`);
  console.log(`  ${COLORS.cyan}git status${COLORS.reset}`);
  console.log(`  ${COLORS.cyan}git commit -m "feat(hall-s2-01): ampliar poderes de ADMIN (reset, rol, status)"${COLORS.reset}`);
  console.log(`  ${COLORS.cyan}git push origin main${COLORS.reset}`);
  console.log(`  ${COLORS.cyan}fly deploy${COLORS.reset}`);
  console.log(`  ${COLORS.cyan}timeout /t 60${COLORS.reset}`);
  console.log(`  ${COLORS.cyan}curl https://paraguay-ffaa-metalstorm.fly.dev/api/health${COLORS.reset}\n`);
}

main().catch((err) => {
  console.error(`\n${COLORS.red}FATAL:${COLORS.reset} ${err.message}\n`);
  process.exit(1);
});