// ============================================================
// PARAGUAY-FFAA | METALSTORM
// Script: update-docs.mjs
// Propósito: Automatización documental completa
//           (verificar + reparar + commit + push)
// Uso: node scripts/update-docs.mjs --files "API_REFERENCE.md" --message "docs: reparar"
// ============================================================

import fs from 'fs';
import { execSync } from 'child_process';

// Parsear argumentos
const args = process.argv.slice(2);
const filesArg = args.includes('--files') ? args[args.indexOf('--files') + 1] : null;
const messageArg = args.includes('--message') ? args[args.indexOf('--message') + 1] : null;

if (!filesArg || !messageArg) {
  console.error('❌ Uso: node scripts/update-docs.mjs --files "archivo1.md,archivo2.md" --message "docs: mensaje"');
  process.exit(1);
}

const files = filesArg.split(',').map(f => f.trim());

console.log('');
console.log('======================================================');
console.log(' AUTOMATED DOCUMENTATION UPDATE - PARAGUAY-FFAA');
console.log('======================================================');
console.log('Archivos: ' + files.join(', '));
console.log('Mensaje:  ' + messageArg);
console.log('');

// PASO 1: Ejecutar reparaciones específicas si aplica
for (const file of files) {
  if (file === 'API_REFERENCE.md') {
    console.log('🔧 Ejecutando reparación de API_REFERENCE.md...');
    try {
      execSync('node scripts/fix-api-reference.mjs', { stdio: 'inherit' });
    } catch (err) {
      console.error('❌ Error en reparación de API_REFERENCE.md');
      process.exit(1);
    }
  }
}

// PASO 2: Verificar que los archivos existen
console.log('🔍 Verificando archivos...');
for (const file of files) {
  if (!fs.existsSync(file)) {
    console.error('❌ Archivo no encontrado: ' + file);
    process.exit(1);
  }
  console.log('   ✅ ' + file);
}
console.log('');

// PASO 3: git add
console.log('📦 [1/3] git add...');
try {
  execSync(`git add ${files.join(' ')}`, { stdio: 'inherit' });
  console.log('   ✅ Archivos agregados al staging.');
} catch (err) {
  console.error('❌ Error en git add');
  process.exit(1);
}
console.log('');

// PASO 4: git commit
console.log('💾 [2/3] git commit...');
try {
  execSync(`git commit -m "${messageArg}"`, { stdio: 'inherit' });
  console.log('   ✅ Commit creado.');
} catch (err) {
  console.error('❌ Error en git commit (¿nada que commitear?)');
  process.exit(1);
}
console.log('');

// PASO 5: git push
console.log('🚀 [3/3] git push...');
try {
  execSync('git push origin main', { stdio: 'inherit' });
  console.log('   ✅ Push exitoso a origin/main.');
} catch (err) {
  console.error('❌ Error en git push');
  process.exit(1);
}

console.log('');
console.log('======================================================');
console.log(' ✅ AUTOMATED DOCUMENTATION UPDATE COMPLETADO');
console.log('======================================================');
console.log('');