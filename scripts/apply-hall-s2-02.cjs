#!/usr/bin/env node
/**
 * PARAGUAY-FFAA | METALSTORM
 * SCRIPT: Aplicar HALL-S2-02 (dropdown de rol frontend)
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const APPLY = process.argv.includes('--apply');

const C = { reset:'\x1b[0m', bold:'\x1b[1m', red:'\x1b[31m', green:'\x1b[32m', yellow:'\x1b[33m', blue:'\x1b[34m', cyan:'\x1b[36m', gray:'\x1b[90m' };

function log(color, prefix, msg) { console.log(`${color}${prefix}${C.reset} ${msg}`); }
function abort(msg) { console.error(`\n${C.red}${C.bold}❌ ABORTADO:${C.reset} ${msg}\n`); process.exit(1); }

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
    log(C.yellow, '[SKIP]', `${label}: ya modificado.`);
    return { changed: false, content };
  }

  const count = nc.split(no).length - 1;
  if (count === 0) {
    log(C.red, '[FAIL]', `${label}: bloque no encontrado.`);
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
  if (newContent === oldContent) { log(C.yellow, '[SKIP]', `${relPath} — sin cambios`); return false; }
  if (!APPLY) { log(C.yellow, '[DRY-RUN]', `NO se modificará: ${relPath}`); return true; }
  const backupPath = absPath + '.bak';
  fs.writeFileSync(backupPath, oldContent, 'utf8');
  log(C.gray, '[BACKUP]', `Creado: ${path.relative(ROOT_DIR, backupPath)}`);
  fs.writeFileSync(absPath, newContent, 'utf8');
  log(C.green, '[WRITE]', `Modificado: ${relPath}`);
  return true;
}

// ============================================================
// CAMBIO PRINCIPAL: eliminar disabled de <option value="ADMIN">
// ============================================================

function fixDropdownRol() {
  log(C.bold + C.blue, '\n[1/1]', 'Fix dropdown rol en js/views.js...');
  const { content } = readFile('js/views.js');

  const oldBlock = `<option value="ADMIN" \${currentRole === 'ADMIN' ? 'selected' : ''} \${!isOwner && currentRole !== 'ADMIN' ? 'disabled' : ''}>ADMIN</option>`;

  const newBlock = `<option value="ADMIN" \${currentRole === 'ADMIN' ? 'selected' : ''}>ADMIN</option>`;

  const { changed, content: newContent, error } = safeReplace(content, oldBlock, newBlock, 'views.js (option ADMIN)');
  if (error) {
    // DEBUG: mostrar la línea de option ADMIN
    const idx = content.indexOf('value="ADMIN"');
    if (idx > -1) {
      log(C.red, '[DEBUG]', 'Extracto alrededor de value="ADMIN":');
      console.log(JSON.stringify(content.substring(idx - 50, idx + 200)));
    }
    abort(`Bloque no encontrado en js/views.js (${error}).`);
  }
  if (changed) writeFile('js/views.js', newContent, content);
}

// ============================================================
// MAIN
// ============================================================

console.log(`${C.bold}${C.cyan}
╔══════════════════════════════════════════════════════════════════╗
║  PARAGUAY-FFAA | METALSTORM — HALL-S2-02 (dropdown rol)          ║
╚══════════════════════════════════════════════════════════════════╝${C.reset}`);

log(C.gray, '[MODE]', APPLY ? 'APPLY' : 'DRY-RUN');

fixDropdownRol();

if (!APPLY) {
  console.log(`\n${C.yellow}${C.bold}SIGUIENTE PASO:${C.reset}`);
  console.log(`  node scripts\\apply-hall-s2-02.cjs --apply`);
} else {
  console.log(`\n${C.green}${C.bold}✅ CAMBIOS APLICADOS.${C.reset}`);
  console.log(`\n${C.bold}Verificar diff:${C.reset}`);
  console.log(`  git diff js/views.js`);
  console.log(`\n${C.bold}Si está OK, commitear:${C.reset}`);
  console.log(`  git add js/views.js scripts/apply-hall-s2-02.cjs`);
  console.log(`  git commit -m "fix(hall-s2-02): habilitar opción ADMIN en dropdown de roles"`);
  console.log(`  git push origin main`);
  console.log(`  fly deploy`);
}