// scripts/sync-package-version.cjs
//
// Sincroniza package.json "version" con la versión real del proyecto.
// Se usa UNA SOLA VEZ para alinear la fuente de verdad.
//
// Uso:
//   node scripts/sync-package-version.cjs --dry-run
//   node scripts/sync-package-version.cjs

const fs = require('fs');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');
const PROJECT_ROOT = path.resolve(__dirname, '..');

// Detectar la "versión real" desde sw.js (que es la más confiable)
function detectRealVersion() {
  const swPath = path.join(PROJECT_ROOT, 'sw.js');
  const content = fs.readFileSync(swPath, 'utf8');
  const match = content.match(/PARAGUAY-FFAA-METALSTORM-v(\d+\.\d+\.\d+)/);
  return match ? match[1] : null;
}

const REAL_VERSION = detectRealVersion();
if (!REAL_VERSION) {
  console.error('❌ No se pudo detectar la versión real desde sw.js.');
  process.exit(1);
}

console.log('══════════════════════════════════════════════════════');
console.log(`  SYNC PACKAGE VERSION — ${DRY_RUN ? '🔍 SIMULACIÓN' : '🚀 APLICAR'}`);
console.log('══════════════════════════════════════════════════════\n');

const pkgPath = path.join(PROJECT_ROOT, 'package.json');
const content = fs.readFileSync(pkgPath, 'utf8');
const pkg = JSON.parse(content);
const OLD_VERSION = pkg.version;
const NEW_VERSION = REAL_VERSION;

console.log(`🔎 Detección:`);
console.log(`   - sw.js CACHE_NAME:    v${REAL_VERSION}`);
console.log(`   - package.json actual: ${OLD_VERSION}`);
console.log(`   - Sincronizar a:       ${NEW_VERSION}\n`);

if (OLD_VERSION === NEW_VERSION) {
  console.log('⏭️  Ya están sincronizados. Nada que hacer.');
  process.exit(0);
}

const newContent = content.replace(
  `"version": "${OLD_VERSION}"`,
  `"version": "${NEW_VERSION}"`
);

if (newContent === content) {
  console.error('❌ El replace no cambió nada. Abortando.');
  process.exit(1);
}

if (DRY_RUN) {
  console.log('📝 Cambio a aplicar:');
  console.log(`   ANTES:  "version": "${OLD_VERSION}"`);
  console.log(`   DESPUÉS: "version": "${NEW_VERSION}"\n`);
  console.log('ℹ️  Simulación. Corré sin --dry-run para aplicar.');
  process.exit(0);
}

fs.writeFileSync(`${pkgPath}.bak-sync`, content, 'utf8');
fs.writeFileSync(pkgPath, newContent, 'utf8');

console.log(`✅ package.json sincronizado: ${OLD_VERSION} → ${NEW_VERSION}`);
console.log(`   Backup: ${path.basename(pkgPath)}.bak-sync\n`);