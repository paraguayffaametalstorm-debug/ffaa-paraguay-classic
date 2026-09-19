// ============================================================
// PARAGUAY-FFAA | METALSTORM
// Script: fix-bloque5.mjs
// Propósito: Actualizar ROADMAP, DEPLOYMENT_GUIDE, PWA_SETUP
// Uso: node scripts/fix-bloque5.mjs
// ============================================================

import fs from 'fs';

console.log('');
console.log('======================================================');
console.log(' ACTUALIZACION BLOQUE 5');
console.log('======================================================');
console.log('');

let totalCambios = 0;

// ============================================================
// ARCHIVO 1: ROADMAP.md
// ============================================================
if (fs.existsSync('ROADMAP.md')) {
  let content = fs.readFileSync('ROADMAP.md', 'utf8');
  let cambios = 0;

  console.log('📄 ROADMAP.md');

  // Cambio 1.1: v4.0.2 → v4.0.5
  if (content.includes('v4.0.2 en producción')) {
    content = content.replace('v4.0.2 en producción', 'v4.0.5 en producción');
    cambios++;
    console.log('   ✅ v4.0.2 → v4.0.5.');
  }

  // Cambio 1.2: v4.0.3 → v4.0.5 (marcar como completado)
  if (content.includes('[ ] Versionado unificado (v4.0.3)')) {
    content = content.replace(
      '[ ] Versionado unificado (v4.0.3)',
      '[x] Versionado unificado (v4.0.5)'
    );
    cambios++;
    console.log('   ✅ Versionado unificado → [x] v4.0.5.');
  }

  if (cambios > 0) {
    fs.writeFileSync('ROADMAP.md', content, 'utf8');
    totalCambios += cambios;
  }
  console.log('');
} else {
  console.log('⚠️  ROADMAP.md no encontrado.');
  console.log('');
}

// ============================================================
// ARCHIVO 2: DEPLOYMENT_GUIDE.md
// ============================================================
if (fs.existsSync('DEPLOYMENT_GUIDE.md')) {
  let content = fs.readFileSync('DEPLOYMENT_GUIDE.md', 'utf8');
  let cambios = 0;

  console.log('📄 DEPLOYMENT_GUIDE.md');

  // Cambio 2.1: Todos los v4.0.0 → v4.0.5
  // Cuidado: preservar el contexto histórico "(v4.0.0)" en Campos de Inactivación
  const matches = content.match(/v4\.0\.0/g);
  const total = matches ? matches.length : 0;
  
  if (total > 0) {
    content = content.replace(/v4\.0\.0/g, 'v4.0.5');
    cambios++;
    console.log(`   ✅ ${total} ocurrencias de v4.0.0 → v4.0.5.`);
  } else if (content.includes('v4.0.5')) {
    console.log('   ℹ️  Ya está en v4.0.5.');
  }

  // Cambio 2.2: Fecha footer 16 → 18 Septiembre
  if (content.includes('16 Septiembre 2026')) {
    content = content.replace(/16 Septiembre 2026/g, '18 Septiembre 2026');
    cambios++;
    console.log('   ✅ Fecha footer 16 → 18 Septiembre.');
  } else if (content.includes('18 Septiembre 2026')) {
    console.log('   ℹ️  Fecha footer ya está en 18 Septiembre.');
  }

  if (cambios > 0) {
    fs.writeFileSync('DEPLOYMENT_GUIDE.md', content, 'utf8');
    totalCambios += cambios;
  }
  console.log('');
} else {
  console.log('⚠️  DEPLOYMENT_GUIDE.md no encontrado.');
  console.log('');
}

// ============================================================
// ARCHIVO 3: PWA_SETUP.md
// ============================================================
if (fs.existsSync('PWA_SETUP.md')) {
  let content = fs.readFileSync('PWA_SETUP.md', 'utf8');
  let cambios = 0;

  console.log('📄 PWA_SETUP.md');

  // Cambio 3.1: Todos los v4.0.0 → v4.0.5
  const matches = content.match(/v4\.0\.0/g);
  const total = matches ? matches.length : 0;
  
  if (total > 0) {
    content = content.replace(/v4\.0\.0/g, 'v4.0.5');
    cambios++;
    console.log(`   ✅ ${total} ocurrencias de v4.0.0 → v4.0.5.`);
  } else if (content.includes('v4.0.5')) {
    console.log('   ℹ️  Ya está en v4.0.5.');
  }

  // Cambio 3.2: Fecha footer 16 → 18 Septiembre
  if (content.includes('16 Septiembre 2026')) {
    content = content.replace(/16 Septiembre 2026/g, '18 Septiembre 2026');
    cambios++;
    console.log('   ✅ Fecha footer 16 → 18 Septiembre.');
  } else if (content.includes('18 Septiembre 2026')) {
    console.log('   ℹ️  Fecha footer ya está en 18 Septiembre.');
  }

  if (cambios > 0) {
    fs.writeFileSync('PWA_SETUP.md', content, 'utf8');
    totalCambios += cambios;
  }
  console.log('');
} else {
  console.log('⚠️  PWA_SETUP.md no encontrado.');
  console.log('');
}

console.log('======================================================');
console.log(` ✅ TOTAL DE CAMBIOS APLICADOS: ${totalCambios}`);
console.log('======================================================');
console.log('');