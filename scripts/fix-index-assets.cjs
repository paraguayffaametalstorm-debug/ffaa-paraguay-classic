// scripts/fix-index-assets.cjs
//
// Fix: los assets de index.html perdieron el "?" antes de "v=X.Y.Z".
// Los repara a "?v=<version>" con la versión correcta.
//
// Uso:
//   node scripts/fix-index-assets.cjs 4.8.1 --dry-run
//   node scripts/fix-index-assets.cjs 4.8.1

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const TARGET_VERSION = args.find(a => /^\d+\.\d+\.\d+$/.test(a)) || '4.8.1';

const PROJECT_ROOT = path.resolve(__dirname, '..');
const FILE = path.join(PROJECT_ROOT, 'index.html');

console.log('══════════════════════════════════════════════════════');
console.log(`  FIX INDEX ASSETS — ${DRY_RUN ? '🔍 SIMULACIÓN' : '🚀 APLICAR'}`);
console.log(`  Versión objetivo: v${TARGET_VERSION}`);
console.log('══════════════════════════════════════════════════════\n');

let content;
try {
  content = fs.readFileSync(FILE, 'utf8');
} catch (err) {
  console.error(`❌ No se pudo leer ${FILE}: ${err.message}`);
  process.exit(1);
}

// Detectar cuántos assets están rotos: `<algo>.extv=X.Y.Z` o `.htmlv=X.Y.Z`
const BROKEN_REGEX = /(\.[a-z]+)v=(\d+\.\d+\.\d+)/g;
const brokenMatches = content.match(BROKEN_REGEX) || [];
const uniqueBroken = [...new Set(brokenMatches)];

console.log(`🔎 Diagnóstico:`);
console.log(`   - Assets rotos detectados: ${brokenMatches.length}`);
console.log(`   - Ejemplos: ${uniqueBroken.slice(0, 3).join(', ')}${uniqueBroken.length > 3 ? '...' : ''}\n`);

if (brokenMatches.length === 0) {
  console.log('⏭️  No hay assets rotos. Nada que hacer.');
  process.exit(0);
}

// Fix: agregar "?" antes de "v=" y reemplazar por la versión objetivo
const newContent = content.replace(BROKEN_REGEX, `$1?v=${TARGET_VERSION}`);

// Verificar cuántos se arreglaron
const fixedMatches = newContent.match(/\?v=\d+\.\d+\.\d+/g) || [];
const uniqueFixed = [...new Set(fixedMatches)];

console.log(`🔧 Cambios:`);
console.log(`   - Assets arreglados: ${brokenMatches.length}`);
console.log(`   - Nuevas referencias: ${fixedMatches.length}`);
console.log(`   - Únicas: ${uniqueFixed.join(', ')}\n`);

if (DRY_RUN) {
  console.log('📝 Ejemplos del cambio:');
  console.log(`   ANTES:  /css/global.cssv=4.8.0`);
  console.log(`   DESPUÉS: /css/global.css?v=${TARGET_VERSION}\n`);
  console.log('ℹ️  Simulación. Corré sin --dry-run para aplicar.');
  process.exit(0);
}

fs.writeFileSync(`${FILE}.bak-fixassets`, content, 'utf8');
fs.writeFileSync(FILE, newContent, 'utf8');

console.log(`✅ Fix aplicado.`);
console.log(`   Backup: index.html.bak-fixassets\n`);
console.log('📋 PRÓXIMOS PASOS:');
console.log(`  1. Verificar: findstr /C:"?v=" index.html | find /C /V ""`);
console.log(`  2. Esperado:  ~30 referencias con ?v=${TARGET_VERSION}`);
console.log(`  3. git add index.html`);
console.log(`  4. git commit -m "fix(index): restaurar cache-busting ?v= en assets"\n`);