// scripts/fix-health-version.cjs
//
// Fix: endpoint /api/health debe leer la versión de package.json
// en vez de tenerla hardcodeada.
//
// Uso:
//   node scripts/fix-health-version.cjs --dry-run
//   node scripts/fix-health-version.cjs

const fs = require('fs');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');
const PROJECT_ROOT = path.resolve(__dirname, '..');
const FILE = path.join(PROJECT_ROOT, 'src/controllers/health.controller.js');

console.log('══════════════════════════════════════════════════════');
console.log(`  FIX HEALTH VERSION — ${DRY_RUN ? '🔍 SIMULACIÓN' : '🚀 APLICAR'}`);
console.log('══════════════════════════════════════════════════════\n');

let content;
try {
  content = fs.readFileSync(FILE, 'utf8');
} catch (err) {
  console.error(`❌ No se pudo leer ${FILE}: ${err.message}`);
  process.exit(1);
}

// Ya aplicado?
if (content.includes("pkg.version")) {
  console.log('⏭️  El fix ya está aplicado.');
  process.exit(0);
}

const OLD_LINE = "const APP_VERSION = process.env.APP_VERSION || '4.5.9';";
if (!content.includes(OLD_LINE)) {
  console.error(`❌ No se encontró la línea esperada.`);
  console.error(`   Buscando: ${OLD_LINE}`);
  process.exit(1);
}

const NEW_BLOCK = `// Fix: leer versión desde package.json (fuente única de verdad)
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pkg = JSON.parse(readFileSync(join(__dirname, '../../package.json'), 'utf8'));
const APP_VERSION = process.env.APP_VERSION || pkg.version;`;

const newContent = content.replace(OLD_LINE, NEW_BLOCK);

if (newContent === content) {
  console.error('❌ El replace no cambió nada. Abortando.');
  process.exit(1);
}

console.log('📝 Cambio a aplicar:\n');
console.log(`   ANTES:  ${OLD_LINE}`);
console.log(`   DESPUÉS: const APP_VERSION = process.env.APP_VERSION || pkg.version;\n`);

if (DRY_RUN) {
  console.log('ℹ️  Simulación. Corré sin --dry-run para aplicar.');
  process.exit(0);
}

fs.writeFileSync(`${FILE}.bak-fixversion`, content, 'utf8');
fs.writeFileSync(FILE, newContent, 'utf8');

console.log('✅ Fix aplicado.');
console.log(`   Backup: ${path.basename(FILE)}.bak-fixversion\n`);