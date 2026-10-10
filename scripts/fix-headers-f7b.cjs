// scripts/fix-headers-f7b.cjs
//
// Fix correctivo post-F7-B: corrige headers duplicados en API_REFERENCE.md y ARCHITECTURE.md.
// Causado por un anchor que matcheó ANTES del header correcto.
//
// Uso:
//   node scripts/fix-headers-f7b.cjs --dry-run
//   node scripts/fix-headers-f7b.cjs

const fs = require('fs');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');
const PROJECT_ROOT = path.resolve(__dirname, '..');

function readFile(relPath) {
  return fs.readFileSync(path.join(PROJECT_ROOT, relPath), 'utf8');
}

function writeFileWithBackup(abs, newContent, originalContent) {
  if (DRY_RUN) return true;
  try {
    fs.writeFileSync(`${abs}.bak-f7b-fix`, originalContent, 'utf8');
    fs.writeFileSync(abs, newContent, 'utf8');
    return true;
  } catch (err) {
    console.error(`   ❌ ${err.message}`);
    return false;
  }
}

const fixes = [
  {
    file: 'API_REFERENCE.md',
    description: 'Corregir "## 7. ## 8. Módulo de Veteranos" → "## 8. Módulo de Veteranos"',
    apply: (content) => {
      // 1. Arreglar el header duplicado
      content = content.replace(
        '## 7. ## 8. Módulo de Veteranos',
        '## 8. Módulo de Veteranos'
      );
      // 2. Renumerar "## 7. Gestión de Catálogo de Aeronaves" a "## 9. Gestión de Catálogo..."
      content = content.replace(
        '## 7. Gestión de Catálogo de Aeronaves',
        '## 9. Gestión de Catálogo de Aeronaves'
      );
      return content;
    },
  },
  {
    file: 'ARCHITECTURE.md',
    description: 'Corregir "## 7. ## 8.5. Sistema de Mentorías" → "## 8.5. Sistema de Mentorías"',
    apply: (content) => {
      // 1. Arreglar el header duplicado
      content = content.replace(
        '## 7. ## 8.5. Sistema de Mentorías',
        '## 8.5. Sistema de Mentorías'
      );
      // 2. Renumerar "## 7. Integración con la Wiki" a "## 9. Integración con la Wiki"
      content = content.replace(
        '## 7. Integración con la Wiki de Metalstorm',
        '## 9. Integración con la Wiki de Metalstorm'
      );
      return content;
    },
  },
];

console.log('══════════════════════════════════════════════════════');
console.log(`  FIX HEADERS F7-B — ${DRY_RUN ? '🔍 SIMULACIÓN' : '🚀 APLICAR'}`);
console.log('══════════════════════════════════════════════════════\n');

let applied = 0;
let skipped = 0;

for (const fix of fixes) {
  const abs = path.join(PROJECT_ROOT, fix.file);
  const original = readFile(fix.file);
  const updated = fix.apply(original);

  if (original === updated) {
    console.log(`⏭️  [ SKIP   ] ${fix.file}`);
    skipped++;
    continue;
  }

  console.log(`✅ [ APPLY  ] ${fix.file} → ${fix.description}`);
  if (!DRY_RUN) {
    writeFileWithBackup(abs, updated, original);
  }
  applied++;
}

console.log('\n══════════════════════════════════════════════════════');
console.log(`   ✅ Aplicados: ${applied}`);
console.log(`   ⏭️  Skipeados: ${skipped}`);
console.log('══════════════════════════════════════════════════════\n');

if (DRY_RUN) {
  console.log('ℹ️  Simulación. Corré sin --dry-run para aplicar.\n');
} else {
  console.log('ℹ️  Backups guardados como *.bak-f7b-fix\n');
}