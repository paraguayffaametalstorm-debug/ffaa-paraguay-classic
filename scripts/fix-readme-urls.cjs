// scripts/fix-readme-urls.cjs
//
// Actualiza las URLs viejas de Fly.io → Render en el README.

const fs = require('fs');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');
const FILE = path.resolve(__dirname, '..', 'README.md');

console.log('══════════════════════════════════════════════════════');
console.log(`  FIX README URLs — ${DRY_RUN ? '🔍 SIMULACIÓN' : '🚀 APLICAR'}`);
console.log('══════════════════════════════════════════════════════\n');

let content = fs.readFileSync(FILE, 'utf8');

// Reemplazos
const replacements = [
  {
    from: /paraguay-ffaa-metalstorm\.fly\.dev/g,
    to: 'paraguay-ffaa-metalstorm.onrender.com',
    label: 'URL Fly.io → Render',
  },
  {
    from: /\(Sonda de Salud HTTP \(Fly\.io\)\)/g,
    to: '(Sonda de Salud HTTP (Render))',
    label: 'Etiqueta Fly.io → Render',
  },
];

let changed = content;
for (const r of replacements) {
  const matches = (changed.match(r.from) || []).length;
  console.log(`🔎 ${r.label}: ${matches} coincidencias`);
  changed = changed.replace(r.from, r.to);
}

if (changed === content) {
  console.log('\n⏭️  Nada que cambiar. El README ya está actualizado.\n');
  process.exit(0);
}

if (DRY_RUN) {
  console.log('\nℹ️  Simulación. Corré sin --dry-run para aplicar.\n');
  process.exit(0);
}

fs.writeFileSync(`${FILE}.bak-fixurls`, content, 'utf8');
fs.writeFileSync(FILE, changed, 'utf8');

console.log('\n✅ README.md actualizado.');
console.log('   Backup: README.md.bak-fixurls\n');
console.log('📋 PRÓXIMOS PASOS:');
console.log('  1. Verificar: findstr /C:"onrender" README.md');
console.log('  2. git add README.md');
console.log('  3. git commit -m "docs: actualizar URLs Fly.io -> Render"');
console.log('  4. git push origin main\n');