// scripts/fix-readme-cosmetic.cjs
//
// Fix cosmético final del README: badge Platform, etiqueta sonda, ALLOWED_ORIGINS.

const fs = require('fs');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');
const FILE = path.resolve(__dirname, '..', 'README.md');

console.log('══════════════════════════════════════════════════════');
console.log(`  FIX README COSMETIC — ${DRY_RUN ? '🔍 SIMULACIÓN' : '🚀 APLICAR'}`);
console.log('══════════════════════════════════════════════════════\n');

let content = fs.readFileSync(FILE, 'utf8');

const replacements = [
  {
    from: 'badge/deploy-Fly.io_gru-purple?logo=flydotio',
    to: 'badge/deploy-Render_oregon-blue?logo=render',
    label: 'Badge Platform: Fly.io → Render',
  },
  {
    from: 'Probe de Salud HTTP (Fly.io)',
    to: 'Probe de Salud HTTP (Render)',
    label: 'Etiqueta sonda: (Fly.io) → (Render)',
  },
  {
    from: '`*(localhost, fly.dev)*`',
    to: '`*(localhost, onrender.com)*`',
    label: 'ALLOWED_ORIGINS: fly.dev → onrender.com',
  },
];

let changed = content;
for (const r of replacements) {
  if (changed.includes(r.from)) {
    console.log(`✅ [ APPLY ] ${r.label}`);
    changed = changed.split(r.from).join(r.to);
  } else {
    console.log(`⏭️  [ SKIP  ] ${r.label} (ya aplicado)`);
  }
}

if (changed === content) {
  console.log('\nℹ️  Nada que cambiar. El README ya está limpio.\n');
  process.exit(0);
}

if (DRY_RUN) {
  console.log('\nℹ️  Simulación. Corré sin --dry-run para aplicar.\n');
  process.exit(0);
}

fs.writeFileSync(`${FILE}.bak-fixcosmetic`, content, 'utf8');
fs.writeFileSync(FILE, changed, 'utf8');

console.log('\n✅ README.md actualizado.');
console.log('   Backup: README.md.bak-fixcosmetic\n');