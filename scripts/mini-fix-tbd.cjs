/* mini-fix-tbd.cjs — reemplaza _(pendiente)_ por dd5d17d en PLAN_TRABAJO.md */
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = process.cwd();
const REL = 'PLAN_TRABAJO.md';
const ABS = path.join(ROOT, REL);
const TS = new Date().toISOString().replace(/[:.]/g, '-');

let c = fs.readFileSync(ABS, 'utf8');
const antes = c;
// Solo las 3 filas de Grupo E (FIX-006/021/022) tienen _(pendiente)_
c = c.split('| `_(pendiente)_` |').join('| `dd5d17d` |');

if (c === antes) { console.log('⚠️ No hubo cambios (¿ya reemplazado?)'); process.exit(0); }
fs.copyFileSync(ABS, `${ABS}.bak-${TS}`);
fs.writeFileSync(ABS, c, 'utf8');
console.log(`✅ TBD reemplazados por dd5d17d. Backup: ${path.basename(ABS)}.bak-${TS}`);
console.log('\n📋 Commit:');
console.log('   git add PLAN_TRABAJO.md');
console.log('   git commit -m "docs(sprint-0-grupoE): reemplazar TBD por commit real dd5d17d en COMPLETADOS"');
console.log('   git push origin main');