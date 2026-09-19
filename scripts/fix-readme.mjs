// ============================================================
// PARAGUAY-FFAA | METALSTORM
// Script: fix-readme.mjs
// Propósito: Actualizar README.md
//   - Badge versión v4.0.0 → v4.0.5
//   - Cuota ADMIN 3 → 5
//   - Footer versión v4.0.0 → v4.0.5
//   - Feature "Rediseño del Sistema de Eventos"
// Uso: node scripts/fix-readme.mjs
// ============================================================

import fs from 'fs';

const filePath = 'README.md';

console.log('');
console.log('======================================================');
console.log(' ACTUALIZACION README.md');
console.log('======================================================');
console.log('');

if (!fs.existsSync(filePath)) {
  console.error('❌ Archivo no encontrado: ' + filePath);
  process.exit(1);
}

let content = fs.readFileSync(filePath, 'utf8');
let changes = 0;

// ============================================================
// CAMBIO 1: Badge versión v4.0.0 → v4.0.5
// ============================================================
if (content.includes('badge/version-v4.0.0-gold')) {
  content = content.replace(
    'badge/version-v4.0.0-gold',
    'badge/version-v4.0.5-gold'
  );
  changes++;
  console.log('✅ Cambio 1: Badge de versión → v4.0.5.');
} else if (content.includes('badge/version-v4.0.5-gold')) {
  console.log('ℹ️  Cambio 1: Badge ya está en v4.0.5.');
} else {
  console.log('⚠️  Cambio 1: Badge de versión no encontrado.');
}

// ============================================================
// CAMBIO 2: Cuota ADMIN 3 → 5
// ============================================================
if (content.includes('**Cuota:** Máximo **3** administradores autorizados.')) {
  content = content.replace(
    '**Cuota:** Máximo **3** administradores autorizados.',
    '**Cuota:** Máximo **5** administradores autorizados.'
  );
  changes++;
  console.log('✅ Cambio 2: Cuota ADMIN → 5.');
} else if (content.includes('**Cuota:** Máximo **5** administradores autorizados.')) {
  console.log('ℹ️  Cambio 2: Cuota ADMIN ya está en 5.');
} else {
  console.log('⚠️  Cambio 2: Cuota ADMIN no encontrada.');
}

// ============================================================
// CAMBIO 3: Footer versión v4.0.0 → v4.0.5
// ============================================================
if (content.includes('*Versión: v4.0.0 · Actualizado: 16 Septiembre 2026*')) {
  content = content.replace(
    '*Versión: v4.0.0 · Actualizado: 16 Septiembre 2026*',
    '*Versión: v4.0.5 · Actualizado: 18 Septiembre 2026*'
  );
  changes++;
  console.log('✅ Cambio 3: Footer → v4.0.5.');
} else if (content.includes('*Versión: v4.0.5 · Actualizado: 18 Septiembre 2026*')) {
  console.log('ℹ️  Cambio 3: Footer ya está en v4.0.5.');
} else {
  console.log('⚠️  Cambio 3: Footer no encontrado.');
}

// ============================================================
// CAMBIO 4: Agregar feature "Rediseño del Sistema de Eventos"
// ============================================================
const featureMarker = '- **Sistema de Eventos Black Market (BM) (v3.7.0):**';
const featureText = '- **Rediseño del Sistema de Eventos (v4.1.0 - F3):** Módulo unificado `/api/events-v2/*` (12 endpoints) que reemplaza la lógica dual legacy SQ + BM. Scheduler automático de eventos SQ (jueves 00:00 UTC). Deprecación ordenada de `/api/events/*` y `/api/bm/*` con sunset programado para 2026-12-16. Switch funcional que garantiza un solo evento `OPEN` a la vez.\n';

if (content.includes(featureMarker) && !content.includes('Rediseño del Sistema de Eventos (v4.1.0 - F3)')) {
  content = content.replace(featureMarker, featureText + featureMarker);
  changes++;
  console.log('✅ Cambio 4: Feature "Rediseño del Sistema de Eventos" agregada.');
} else if (content.includes('Rediseño del Sistema de Eventos (v4.1.0 - F3)')) {
  console.log('ℹ️  Cambio 4: Feature ya existe.');
} else {
  console.log('⚠️  Cambio 4: Marcador no encontrado.');
}

// ============================================================
// Escribir
// ============================================================
fs.writeFileSync(filePath, content, 'utf8');

console.log('');
console.log(`✅ Total de cambios aplicados: ${changes}`);
console.log(`   Tamaño nuevo: ${content.length} bytes.`);
console.log('');
console.log('======================================================');
console.log(' ACTUALIZACION COMPLETADA');
console.log('======================================================');
console.log('');