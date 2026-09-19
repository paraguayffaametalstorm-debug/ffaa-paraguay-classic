// ============================================================
// PARAGUAY-FFAA | METALSTORM
// Script: add-bl018.mjs
// Propósito: Agregar BL-018 (deuda técnica API_REFERENCE) al BACKLOG
// Uso: node scripts/add-bl018.mjs
// ============================================================

import fs from 'fs';

const filePath = 'BACKLOG.md';

console.log('');
console.log('======================================================');
console.log(' AGREGAR BL-018 AL BACKLOG');
console.log('======================================================');
console.log('');

if (!fs.existsSync(filePath)) {
  console.error('❌ Archivo no encontrado: ' + filePath);
  process.exit(1);
}

let content = fs.readFileSync(filePath, 'utf8');

// IDEMPOTENCIA
if (content.includes('BL-018')) {
  console.log('ℹ️  BL-018 ya está en el BACKLOG. No se hizo ningún cambio.');
  process.exit(0);
}

// Marca de referencia: buscar BL-017
const bl017Marker = '| **BL-017** | 🏗️ | Sincronizar DDL `sql/001_users.sql` con BD real (HALL-061) | 📋 Priorizado | S (4h) |';

if (!content.includes(bl017Marker)) {
  console.error('❌ Marcador BL-017 no encontrado. Estructura inesperada.');
  process.exit(1);
}

// Nueva fila BL-018 (se inserta después de BL-017)
const bl018Row = '\n| **BL-018** | 📚 | Completar §3.5.2, §3.5.3 y §3.5.4 en `API_REFERENCE.md` | 📋 Priorizado | M (4h) | Agregar endpoints faltantes de events-v2 (GET /active, POST, PATCH, participaciones) y sección de deprecación legacy con sunset 2026-12-16. |';

// Buscar la línea completa de BL-017 y agregar BL-018 después
const lines = content.split('\n');
const idx = lines.findIndex(l => l.includes('BL-017'));

if (idx === -1) {
  console.error('❌ Línea BL-017 no encontrada por búsqueda lineal.');
  process.exit(1);
}

lines.splice(idx + 1, 0, bl018Row.trim());
content = lines.join('\n');

fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ BL-018 agregado exitosamente al BACKLOG.');
console.log(`   Ubicación: después de BL-017 (línea ${idx + 1}).`);
console.log('');

console.log('======================================================');
console.log(' COMPLETADO');
console.log('======================================================');
console.log('');