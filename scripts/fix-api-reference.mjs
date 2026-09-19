// ============================================================
// PARAGUAY-FFAA | METALSTORM
// Script: fix-api-reference.mjs
// Propósito: Reparar el corte en API_REFERENCE.md §3.5
// Uso: node scripts/fix-api-reference.mjs
// ============================================================

import fs from 'fs';

const filePath = 'API_REFERENCE.md';

console.log('');
console.log('======================================================');
console.log(' REPARACION API_REFERENCE.md - Corte Seccion 3.5');
console.log('======================================================');
console.log('');

if (!fs.existsSync(filePath)) {
  console.error('❌ Archivo no encontrado: ' + filePath);
  process.exit(1);
}

let content = fs.readFileSync(filePath, 'utf8');

// IDEMPOTENCIA: si ya está reparado, salir
if (content.includes('## 4. Hangar Militar & Upgrades 2.0')) {
  console.log('ℹ️  El corte ya está reparado (## 4. Hangar Militar existe).');
  console.log('   No se hizo ningún cambio.');
  process.exit(0);
}

// Dividir en líneas
const lines = content.split('\n');

// Buscar la línea índice del corte (por ancla de texto parcial, sin acentos)
const corteIdx = lines.findIndex(l => l.includes('Aplica una mejora tecnol'));

if (corteIdx === -1) {
  console.error('❌ Línea de corte NO encontrada.');
  console.error('   Buscar en VSCode: "Aplica una mejora tecnol"');
  process.exit(1);
}

console.log(`🔧 Corte detectado en la línea ${corteIdx + 1}.`);

// Verificar que la línea anterior sea el cierre de un JSON (})
const lineBefore = lines[corteIdx - 1];
const lineBefore2 = lines[corteIdx - 2];

if (lineBefore.trim() !== '}') {
  console.error('❌ La línea anterior al corte no es "}". Estructura inesperada.');
  console.error(`   Línea ${corteIdx}: ${lineBefore}`);
  process.exit(1);
}

// Bloque de reemplazo (texto plano, sin acentos problemáticos en strings críticos)
const bloqueReemplazo = [
  '}',
  '```',
  '',
  '> **Deuda técnica:** §3.5.2 (endpoints restantes), §3.5.3 (participaciones) y §3.5.4 (deprecación) pendientes. Ver `BL-018` en `BACKLOG.md`.',
  '',
  '---',
  '',
  '## 4. Hangar Militar & Upgrades 2.0 (`/api/planes`)',
  '',
  'El módulo gestiona la flota oficial de **44 aeronaves de combate** y subsistemas de mejora mecánica, operando con una arquitectura de dos vistas (Vista 1: Grid Táctico y Vista 2: Pantalla Dedicada).',
  '',
  '### `PUT /api/planes/:id/system`',
  // La línea siguiente (Aplica una mejora...) se conserva tal cual (ya la tenemos en el archivo)
];

// Reemplazar: desde la línea del "}" (corteIdx - 1) hasta la línea anterior a "Aplica..."
// La línea "Aplica una mejora..." SE CONSERVA (no la tocamos)
const inicio = corteIdx - 1;
const fin = corteIdx - 1; // El "}" que se reemplaza (una sola línea)

// Verificar que el bloque siguiente sea correcto:
// lineBefore (índice corteIdx-1) = "}" que cierra el JSON
// Vamos a reemplazar esa línea "}" por:
//   } + ``` + separador + encabezado sección 4 + párrafo + ### PUT... 

// Confirmación visual antes de aplicar
console.log(`   Línea ${corteIdx}: ${lineBefore}   (cierre JSON)`);
console.log(`   Línea ${corteIdx + 1}: ${lines[corteIdx]}   (corte)`);

// Armar nuevo contenido
const nuevasLineas = [
  ...lines.slice(0, corteIdx),      // Todo hasta el "}" inclusive (índice corteIdx-1)
  '```',                            // Cerrar el bloque JSON
  '',
  '> **Deuda técnica:** §3.5.2 (endpoints restantes), §3.5.3 (participaciones) y §3.5.4 (deprecación) pendientes. Ver `BL-018` en `BACKLOG.md`.',
  '',
  '---',
  '',
  '## 4. Hangar Militar & Upgrades 2.0 (`/api/planes`)',
  '',
  'El módulo gestiona la flota oficial de **44 aeronaves de combate** y subsistemas de mejora mecánica, operando con una arquitectura de dos vistas (Vista 1: Grid Táctico y Vista 2: Pantalla Dedicada).',
  '',
  '### `PUT /api/planes/:id/system`',
  ...lines.slice(corteIdx),         // Desde "Aplica una mejora..." hasta el final
];

const nuevoContenido = nuevasLineas.join('\n');

fs.writeFileSync(filePath, nuevoContenido, 'utf8');

console.log('');
console.log('✅ Reparación aplicada exitosamente.');
console.log(`   Líneas antes: ${lines.length}`);
console.log(`   Líneas después: ${nuevasLineas.length}`);
console.log(`   Diferencia: +${nuevasLineas.length - lines.length} líneas`);

console.log('');
console.log('======================================================');
console.log(' REPARACION COMPLETADA');
console.log('======================================================');
console.log('');