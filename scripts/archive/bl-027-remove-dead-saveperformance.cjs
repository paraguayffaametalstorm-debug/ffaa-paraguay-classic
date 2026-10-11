/**
 * ============================================================================
 * PARAGUAY-FFAA | METALSTORM
 * BL-027 — Eliminar savePerformance muerta de js/api.js
 * ============================================================================
 * Sprint 4 — Deuda técnica
 *
 * Contexto:
 *   - js/api.js tiene una función savePerformance() sin exportar a window.
 *   - js/performance.js tiene la versión VIVA (línea 738: window.savePerformance).
 *   - La versión de api.js es código muerto desde HALL-066 (v4.5.2).
 *   - Además, usa endpoints legacy: /api/performances y /api/admin/performances.
 *   - /api/admin/performances NO EXISTE en el backend (404).
 *
 * Acción:
 *   - Eliminar el bloque completo `// ========== RENDIMIENTO ==========` + la
 *     función `savePerformance()` (líneas 16 a ~126).
 *   - Insertar un comentario explicativo en su lugar.
 *
 * IDEMPOTENTE: si el bloque ya no existe, salta sin error.
 *
 * Uso:
 *   node scripts/bl-027-remove-dead-saveperformance.cjs
 *
 * Rollback:
 *   ren js\api.js.bak-bl027 js\api.js
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const FILE = path.join(ROOT, 'js', 'api.js');

function readFile(p) {
  if (!fs.existsSync(p)) throw new Error(`No existe: ${p}`);
  return fs.readFileSync(p, 'utf8');
}

function writeFile(p, content) {
  fs.writeFileSync(p, content, 'utf8');
}

function backup(p) {
  const bak = p + '.bak-bl027';
  // NO sobrescribir si ya existe
  if (!fs.existsSync(bak)) {
    fs.copyFileSync(p, bak);
    console.log(`   💾 Backup creado: ${path.basename(bak)}`);
  } else {
    console.log(`   ℹ️  Backup ya existe: ${path.basename(bak)}`);
  }
}

function main() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  BL-027 — Eliminar savePerformance muerta de js/api.js');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');

  console.log('📄 Modificando js/api.js');
  backup(FILE);
  let content = readFile(FILE);
  const originalLength = content.length;

  // ── Idempotencia ─────────────────────────────────────────────
  if (!content.includes('async function savePerformance() {')) {
    console.log('   ℹ️  savePerformance ya no existe. Saltando.');
    console.log('');
    return;
  }

  // ── Verificar que la versión de api.js NO se exporta a window ─
  // (Si por algún motivo se exportara, NO eliminamos — es seguridad)
  const exportCheck = content.match(/window\.savePerformance\s*=\s*savePerformance/);
  if (exportCheck) {
    throw new Error('⚠️ ABORTADO: js/api.js SÍ exporta window.savePerformance. NO es código muerto. Revisar.');
  }
  console.log('   ✅ Confirmado: js/api.js NO exporta savePerformance a window (código muerto)');

  // ── Delimitar el bloque exacto ───────────────────────────────
  const START_MARKER = '// ========== RENDIMIENTO ==========\n';
  const END_MARKER = '\n// ========== AERONAVES ==========';

  const startIdx = content.indexOf(START_MARKER);
  if (startIdx === -1) {
    throw new Error(`No se encontró el marcador de inicio: "${START_MARKER}"`);
  }

  const endIdx = content.indexOf(END_MARKER, startIdx);
  if (endIdx === -1) {
    throw new Error(`No se encontró el marcador de fin: "${END_MARKER}"`);
  }

  const blockLength = endIdx - startIdx;
  console.log(`   📏 Bloque detectado: ${blockLength} caracteres`);

  // Seguridad: verificar que el bloque contiene la función a eliminar
  const block = content.substring(startIdx, endIdx);
  if (!block.includes('async function savePerformance() {')) {
    throw new Error('⚠️ ABORTADO: el bloque detectado NO contiene savePerformance. Revisar marcadores.');
  }

  // ── Reemplazar el bloque ─────────────────────────────────────
  const REPLACEMENT =
    '// ========== RENDIMIENTO ==========\n' +
    '// BL-027 (2026-10-10): savePerformance() eliminado.\n' +
    '//\n' +
    '// Motivo: código muerto. No se exportaba a window, y js/performance.js\n' +
    '// define la versión viva (`window.savePerformance = savePerformance;`, línea 738).\n' +
    '//\n' +
    '// Esta versión además usaba endpoints legacy:\n' +
    '//   - POST /api/performances         (legacy, escribe en tabla `performances`)\n' +
    '//   - POST /api/admin/performances   (endpoint inexistente, devolvía 404)\n' +
    '//\n' +
    '// La versión viva en js/performance.js usa el endpoint unificado:\n' +
    '//   - POST /api/events-v2/:id/participations\n' +
    '//\n' +
    '// Ref: HALL-066 (v4.5.2), HALL-066-completo.md (lección #5).\n' +
    '// Reemplaza este comentario si en el futuro se necesita una función auxiliar aquí.\n';

  content = content.substring(0, startIdx) + REPLACEMENT + content.substring(endIdx);

  // ── Guardar ──────────────────────────────────────────────────
  writeFile(FILE, content);

  const newLength = content.length;
  const delta = originalLength - newLength;
  console.log(`   ✅ Bloque eliminado y reemplazado por comentario`);
  console.log(`   📉 Reducción: ${delta} caracteres (~${Math.round(delta / 40)} líneas)`);
  console.log('');

  // ── Verificaciones post-modificación ─────────────────────────
  console.log('🔍 Verificando...');
  const check = readFile(FILE);

  const checks = [
    ['savePerformance ya NO está en api.js', !check.includes('async function savePerformance()')],
    ['Comentario BL-027 insertado', check.includes('BL-027 (2026-10-10)')],
    ['getAuthHeaders intacto', check.includes('function getAuthHeaders() {')],
    ['window.getAuthHeaders intacto', check.includes('window.getAuthHeaders = getAuthHeaders;')],
    ['Sección AERONAVES intacta', check.includes('// ========== AERONAVES ==========')],
    ['savePlane intacta', check.includes('async function savePlane() {')],
    ['apiEventsV2Active intacta', check.includes('async function apiEventsV2Active()')],
    ['apiExportEventResults intacta', check.includes('async function apiExportEventResults(eventId)')],
    ['window.apiLinkAccount intacto', check.includes('window.apiLinkAccount = apiLinkAccount;')],
    ['NO quedan endpoints /api/performances legacy', !check.includes("${API_BASE}/api/performances")],
    ['NO quedan endpoints /api/admin/performances', !check.includes("${API_BASE}/api/admin/performances")],
  ];

  let allOk = true;
  for (const [label, ok] of checks) {
    console.log(`   ${ok ? '✅' : '❌'} ${label}`);
    if (!ok) allOk = false;
  }

  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  if (allOk) {
    console.log('  ✅ BL-027 COMPLETADO — 11 checks OK');
    console.log('');
    console.log('  Próximos pasos:');
    console.log('    1. node --check js\\api.js');
    console.log('    2. git diff js/api.js');
    console.log('    3. git add js/api.js scripts/bl-027-remove-dead-saveperformance.cjs');
    console.log('    4. git commit -m "refactor(bl-027): eliminar savePerformance muerto de js/api.js"');
    console.log('    5. git push origin main');
    console.log('');
    console.log('  Rollback:');
    console.log('    ren js\\api.js.bak-bl027 js\\api.js');
  } else {
    console.log('  ⚠️ CON ERRORES — revisar arriba');
  }
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');

  if (!allOk) process.exit(1);
}

try {
  main();
} catch (err) {
  console.error('');
  console.error('❌ ERROR:', err.message);
  console.error('');
  console.error('   Backup: js\\api.js.bak-bl027');
  console.error('');
  process.exit(1);
}