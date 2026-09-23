// scripts/fix-admin-tests.cjs
//
// FIX-304 v3 — Script ultra-simple que solo aplica FIX 3B
// (agregar mockNext() a las invocaciones de los controladores).
//
// mockNext ya está definido en el archivo (línea 299). Este script
// NO lo toca. Solo reemplaza `await fn(req, res);` → `await fn(req, res, mockNext());`
//
const fs = require('fs');
const path = require('path');

const TEST_FILE = path.join(__dirname, '..', 'tests', 'controllers', 'admin.controller.test.js');

if (!fs.existsSync(TEST_FILE)) {
  console.error(`❌ No existe el archivo: ${TEST_FILE}`);
  process.exit(1);
}

let content = fs.readFileSync(TEST_FILE, 'utf8');
const original = content;

// ─────────────────────────────────────────────────────────────
// Sanity check: mockNext debe estar definido
// ─────────────────────────────────────────────────────────────
if (!content.includes('const mockNext = () => vi.fn();')) {
  console.error('❌ mockNext no está definido en el archivo.');
  console.error('   Buscá esta línea en el test y agregala si falta:');
  console.error('   const mockNext = () => vi.fn();');
  process.exit(1);
}
console.log('✅ mockNext ya está definido. Procediendo con FIX 3B...');

// ─────────────────────────────────────────────────────────────
// FIX 3B — Pasar `mockNext()` a las invocaciones de los controladores
// ─────────────────────────────────────────────────────────────
const FUNCTIONS_TO_FIX = [
  'getUsers',
  'addMember',
  'updateUserRole',
  'updateUserStatus',
  'getInactiveUsers',
  'updateInactiveReason',
];

let totalReplacements = 0;
const replacementLog = {};

for (const fn of FUNCTIONS_TO_FIX) {
  // Regex flexible: `await fn(req, res);` con cualquier whitespace
  const regex = new RegExp(`await\\s+${fn}\\s*\\(\\s*req\\s*,\\s*res\\s*\\);`, 'g');
  const before = content;
  content = content.replace(regex, `await ${fn}(req, res, mockNext());`);
  const matches = (before.match(regex) || []).length;
  if (matches > 0) {
    totalReplacements += matches;
    replacementLog[fn] = matches;
  }
}

if (totalReplacements === 0) {
  console.log('ℹ️  No se encontraron invocaciones pendientes de corregir.');
  const alreadyFixed = (content.match(/, mockNext\(\)\)/g) || []).length;
  console.log(`   Invocaciones ya corregidas: ${alreadyFixed}`);
} else {
  console.log('');
  console.log('✅ FIX 3B: Invocaciones actualizadas:');
  for (const [fn, count] of Object.entries(replacementLog)) {
    console.log(`   - ${fn}: ${count} ocurrencias`);
  }
  console.log(`   Total: ${totalReplacements} reemplazos.`);
}

// ─────────────────────────────────────────────────────────────
// Guardar el archivo si hubo cambios
// ─────────────────────────────────────────────────────────────
if (content !== original) {
  const backupPath = TEST_FILE + '.bak-' + Date.now();
  fs.writeFileSync(backupPath, original, 'utf8');
  console.log(`💾 Backup del original: ${path.basename(backupPath)}`);

  fs.writeFileSync(TEST_FILE, content, 'utf8');
  console.log(`✅ Archivo actualizado: ${path.basename(TEST_FILE)}`);
} else {
  console.log('ℹ️  No hubo cambios. El archivo ya estaba corregido.');
}

// ─────────────────────────────────────────────────────────────
// Verificación final
// ─────────────────────────────────────────────────────────────
console.log('');
console.log('═══════════════════════════════════════════════════');
console.log('  VERIFICACIÓN POST-SCRIPT');
console.log('═══════════════════════════════════════════════════');

const finalContent = fs.readFileSync(TEST_FILE, 'utf8');
const hasMockNext = finalContent.includes('const mockNext = () => vi.fn();');
const invocationsWithMockNext = (finalContent.match(/, mockNext\(\)\)/g) || []).length;
const invocationsWithoutMockNext = (finalContent.match(/await (getUsers|addMember|updateUserRole|updateUserStatus|getInactiveUsers|updateInactiveReason)\s*\(\s*req\s*,\s*res\s*\);/g) || []).length;

console.log(`  mockNext definido:                    ${hasMockNext ? '✅' : '❌'}`);
console.log(`  Invocaciones CON mockNext:            ${invocationsWithMockNext}`);
console.log(`  Invocaciones SIN mockNext (debería 0): ${invocationsWithoutMockNext}`);

if (hasMockNext && invocationsWithoutMockNext === 0) {
  console.log('');
  console.log('  ✅ FIX-304 aplicado correctamente.');
  console.log('');
  console.log('  PRÓXIMOS PASOS:');
  console.log('    1. node --check tests\\controllers\\admin.controller.test.js');
  console.log('    2. npm test -- tests/controllers/admin.controller.test.js');
} else {
  console.log('');
  console.log('  ⚠️  Verificación fallida.');
  if (!hasMockNext) {
    console.log('      → mockNext no está definido.');
  }
  if (invocationsWithoutMockNext > 0) {
    console.log(`      → Quedan ${invocationsWithoutMockNext} invocaciones sin mockNext.`);
  }
  process.exit(1);
}