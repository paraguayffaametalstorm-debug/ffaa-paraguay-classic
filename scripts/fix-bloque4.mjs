// ============================================================
// PARAGUAY-FFAA | METALSTORM
// Script: fix-bloque4.mjs
// Propósito: Actualizar USER_MANUAL.md (cuota ADMIN 3 → 5)
// Uso: node scripts/fix-bloque4.mjs
// ============================================================

import fs from 'fs';

console.log('');
console.log('======================================================');
console.log(' ACTUALIZACION BLOQUE 4');
console.log('======================================================');
console.log('');

if (!fs.existsSync('USER_MANUAL.md')) {
  console.error('❌ USER_MANUAL.md no encontrado.');
  process.exit(1);
}

let content = fs.readFileSync('USER_MANUAL.md', 'utf8');
let cambios = 0;

console.log('📄 USER_MANUAL.md');

// Cambio: Cuota ADMIN 3 → 5
// Estrategia: buscar la línea que contiene "ADMIN (Oficial de Operaciones)" y "**3**"
const lineas = content.split('\n');
let idx = -1;

for (let i = 0; i < lineas.length; i++) {
  if (lineas[i].includes('ADMIN (Oficial de Operaciones)') && lineas[i].includes('**3**')) {
    idx = i;
    break;
  }
}

if (idx !== -1) {
  const lineOriginal = lineas[idx];
  const lineNueva = lineOriginal.replace('**3**', '**5**');
  
  if (lineOriginal !== lineNueva) {
    lineas[idx] = lineNueva;
    content = lineas.join('\n');
    cambios++;
    console.log(`   ✅ Cuota ADMIN → 5 (línea ${idx + 1}).`);
  } else {
    console.log('   ⚠️  No se pudo reemplazar la cuota.');
  }
} else if (content.includes('ADMIN (Oficial de Operaciones)') && content.includes('**5**')) {
  console.log('   ℹ️  Cuota ADMIN ya está en 5.');
} else {
  console.log('   ⚠️  Línea de cuota ADMIN no encontrada.');
}

// Verificar versión footer
if (content.includes('*Versión: v4.0.5 · Actualizado: 16 Septiembre 2026*')) {
  content = content.replace(
    '*Versión: v4.0.5 · Actualizado: 16 Septiembre 2026*',
    '*Versión: v4.0.5 · Actualizado: 18 Septiembre 2026*'
  );
  cambios++;
  console.log('   ✅ Fecha footer → 18 Septiembre.');
} else if (content.includes('*Versión: v4.0.5 · Actualizado: 18 Septiembre 2026*')) {
  console.log('   ℹ️  Fecha footer ya está en 18 Septiembre.');
}

// Guardar
if (cambios > 0) {
  fs.writeFileSync('USER_MANUAL.md', content, 'utf8');
}

console.log('');
console.log('======================================================');
console.log(` ✅ TOTAL DE CAMBIOS APLICADOS: ${cambios}`);
console.log('======================================================');
console.log('');