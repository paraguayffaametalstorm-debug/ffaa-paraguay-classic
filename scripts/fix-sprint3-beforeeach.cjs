// scripts/fix-sprint3-beforeeach.cjs
//
// Sprint 3 v2 — Solo reemplaza el mock frágil de getSupabase en beforeEach.
// Asume que el import de createMockSupabase YA está (agregado por v1).
//
// Uso: node scripts/fix-sprint3-beforeeach.cjs
//
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const FILES = [
  'tests/controllers/admin.controller.test.js',
  'tests/controllers/owner.controller.test.js',
];

// Regex ultra-flexible: encuentra getSupabase.mockReturnValue({ from: ..., rpc: ... })
// sin importar whitespace, saltos de línea, o comentarios en el medio.
const PATTERN = /getSupabase\.mockReturnValue\(\s*\{\s*from\s*:\s*vi\.fn\(\s*\)\s*,\s*rpc\s*:\s*vi\.fn\(\s*\)\s*\}\s*\)/g;

const REPLACEMENT = 'getSupabase.mockReturnValue(createMockSupabase())';

let totalChanges = 0;

for (const relPath of FILES) {
  const absPath = path.join(ROOT, relPath);
  if (!fs.existsSync(absPath)) {
    console.log(`⚠️  No existe: ${relPath}`);
    continue;
  }

  let content = fs.readFileSync(absPath, 'utf8');
  const original = content;

  // Verificar que el import esté presente
  const hasImport = content.includes("from '../helpers/mockSupabase.js'");
  if (!hasImport) {
    console.log(`❌ ${relPath}: falta el import de createMockSupabase. Abortando este archivo.`);
    console.log(`   Agregalo manualmente: import { createMockSupabase } from '../helpers/mockSupabase.js';`);
    continue;
  }

  // Contar matches antes
  const matches = content.match(PATTERN);
  const matchCount = matches ? matches.length : 0;

  if (matchCount === 0) {
    // Puede que ya esté aplicado
    if (content.includes('createMockSupabase()')) {
      console.log(`⏭️  ${relPath}: ya usa createMockSupabase(). Saltando.`);
      continue;
    }
    console.log(`❌ ${relPath}: no se encontró el patrón getSupabase.mockReturnValue({ from, rpc })`);
    console.log(`   Diagnosticando...`);
    const lines = content.split('\n');
    lines.forEach((line, i) => {
      if (line.includes('getSupabase.mockReturnValue')) {
        console.log(`   Línea ${i + 1}: ${line.trim()}`);
      }
    });
    continue;
  }

  // Reemplazar
  content = content.replace(PATTERN, REPLACEMENT);

  if (content !== original) {
    // Backup
    const backupPath = absPath + '.bak-v2-' + Date.now();
    fs.writeFileSync(backupPath, original, 'utf8');

    fs.writeFileSync(absPath, content, 'utf8');
    console.log(`✅ ${relPath}: ${matchCount} reemplazo(s) aplicado(s)`);
    totalChanges += matchCount;
  }
}

// ─────────────────────────────────────────────────────────────
// Verificación final
// ─────────────────────────────────────────────────────────────
console.log('');
console.log('═══════════════════════════════════════════════════');
console.log('  VERIFICACIÓN FINAL');
console.log('═══════════════════════════════════════════════════');

for (const relPath of FILES) {
  const absPath = path.join(ROOT, relPath);
  if (!fs.existsSync(absPath)) continue;

  const content = fs.readFileSync(absPath, 'utf8');
  const usesFluid = content.includes('createMockSupabase()');
  const usesFragile = /getSupabase\.mockReturnValue\(\s*\{\s*from\s*:/.test(content);

  console.log(`  ${usesFluid ? '✅' : '❌'} ${relPath}`);
  console.log(`      mock fluido: ${usesFluid ? 'SÍ' : 'NO'} · mock frágil restante: ${usesFragile ? 'SÍ' : 'NO'}`);
}

console.log('');
if (totalChanges > 0) {
  console.log(`  ✅ ${totalChanges} reemplazo(s) aplicado(s) en total.`);
  console.log('');
  console.log('  PRÓXIMOS PASOS:');
  console.log('    1. node --check tests\\controllers\\admin.controller.test.js');
  console.log('    2. node --check tests\\controllers\\owner.controller.test.js');
  console.log('    3. npm test');
} else {
  console.log('  ℹ️  Sin cambios. Los archivos ya estaban correctos o requieren revisión manual.');
}