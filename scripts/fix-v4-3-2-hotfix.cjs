/**
 * HOTFIX v4.3.2 — currentProfile fuera de scope
 * Uso: node scripts\fix-v4-3-2-hotfix.cjs
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const FILE = path.join(ROOT, 'src', 'controllers', 'dashboard.controller.js');
const TS = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);

const log = (m, c = '\x1b[0m') => console.log(`${c}${m}\x1b[0m`);
const norm = (s) => s.replace(/\r\n/g, '\n');

log('\n══════════════════════════════════════════════', '\x1b[35m');
log('  HOTFIX v4.3.2 — currentProfile en scope', '\x1b[35m');
log('══════════════════════════════════════════════\n', '\x1b[35m');

fs.copyFileSync(FILE, `${FILE}.bak-hotfix-${TS}`);
log('▸ Backup creado ✅', '\x1b[32m');

let src = norm(fs.readFileSync(FILE, 'utf8'));

// Verificar si ya está aplicado
if (src.includes('let currentProfile = null;')) {
  log('▸ Fix ya aplicado, nada que hacer', '\x1b[33m');
  process.exit(0);
}

// Cambio 1: declarar currentProfile fuera del if
const anchor1 = `        if (activeUsersList.length > 0) {`;
if (!src.includes(anchor1)) {
  log('❌ No encontré anchor del if (activeUsersList)', '\x1b[31m');
  process.exit(1);
}
src = src.replace(anchor1, `        let currentProfile = null;

        if (activeUsersList.length > 0) {`);
log('▸ ✅ currentProfile declarada fuera del if', '\x1b[32m');

// Cambio 2: cambiar 'const currentProfile' a 'currentProfile'
const anchor2 = `          const currentProfile = usersWithAvg.find(u =>`;
if (src.includes(anchor2)) {
  src = src.replace(anchor2, `          currentProfile = usersWithAvg.find(u =>`);
  log('▸ ✅ const currentProfile → currentProfile (asignación)', '\x1b[32m');
} else {
  log('▸ ⚠  No encontré "const currentProfile" (¿ya fue cambiado?)', '\x1b[33m');
}

fs.writeFileSync(FILE, src, 'utf8');
log('\n══════════════════════════════════════════════', '\x1b[35m');
log('  HOTFIX APLICADO', '\x1b[35m');
log('══════════════════════════════════════════════\n', '\x1b[35m');