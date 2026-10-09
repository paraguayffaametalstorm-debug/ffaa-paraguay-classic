/**
 * ═══════════════════════════════════════════════════════════════
 *  FASE 5 — JS del sidebar con lazy loading (v3 FIX definitivo)
 *  ─────────────────────────────────────────────────────────────
 *  En vez de embeber el HTML del módulo como string, copiamos
 *  un archivo template desde docs/templates/. Cero escapes, cero
 *  conflictos de comillas.
 *
 *  Uso:      node scripts/fase-f5-admin-js.cjs
 *  Rollback: ver bloque al final
 *  ─────────────────────────────────────────────────────────────
 *  Fecha: 2026-10-09 · Proyecto: PARAGUAY-FFAA | METALSTORM
 * ═══════════════════════════════════════════════════════════════
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ── Rutas ──
const ROOT = path.resolve(__dirname, '..');
const FILE_TEMPLATE       = path.join(ROOT, 'docs', 'templates', 'admin-sections.template.js');
const FILE_ADMIN_SECTIONS = path.join(ROOT, 'js', 'admin-sections.js');
const FILE_VIEWS_JS       = path.join(ROOT, 'js', 'views.js');
const FILE_INDEX_HTML     = path.join(ROOT, 'index.html');

// ── Marcadores para el stub de views.js ──
const STUB_MARKERS_INICIO = [
  'FASE 2 — Stub de navegación del Panel Admin',
  'FASE 2 - Stub de navegacion del Panel Admin',
  'FASE 2 — Stub',
  'FASE 2 - Stub'
];
const STUB_MARKERS_FIN = [
  "console.log('✅ [Admin F2] Stub",
  "console.log('OK [Admin F2] Stub",
  "[Admin F2] Stub"
];

// ═══════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════

function log(msg)   { console.log(msg); }
function ok(msg)    { console.log(`   ✅ ${msg}`); }
function warn(msg)  { console.log(`   ⚠️  ${msg}`); }
function err(msg)   { console.error(`   ❌ ${msg}`); }
function title(msg) { console.log(`\n🔷 ${msg}`); }

function crearBackupSiNoExiste(filepath) {
  const backup = filepath + '.bak-f5';
  if (fs.existsSync(backup)) {
    warn(`Backup ya existía: ${path.basename(backup)} (no se toca)`);
    return false;
  }
  const content = fs.readFileSync(filepath, 'utf8');
  fs.writeFileSync(backup, content, 'utf8');
  ok(`Backup creado: ${path.basename(backup)} (${content.length} bytes)`);
  return true;
}

// ═══════════════════════════════════════════════════════════════
//  PASO 1 — Copiar template a js/admin-sections.js
// ═══════════════════════════════════════════════════════════════

function paso1_copiarTemplate() {
  title('PASO 1 — Copiar template a js/admin-sections.js');

  if (!fs.existsSync(FILE_TEMPLATE)) {
    err(`No existe el template: ${FILE_TEMPLATE}`);
    err('Creá docs/templates/admin-sections.template.js primero.');
    process.exit(1);
  }

  if (fs.existsSync(FILE_ADMIN_SECTIONS)) {
    warn('admin-sections.js ya existía, se sobreescribirá');
  }

  // Copiar byte a byte
  const templateContent = fs.readFileSync(FILE_TEMPLATE, 'utf8');
  fs.writeFileSync(FILE_ADMIN_SECTIONS, templateContent, 'utf8');
  const bytes = Buffer.byteLength(templateContent, 'utf8');
  ok(`admin-sections.js copiado (${bytes} bytes)`);

  // node --check
  try {
    execSync(`node --check "${FILE_ADMIN_SECTIONS}"`, { stdio: 'pipe' });
    ok('node --check js/admin-sections.js → sintaxis OK');
  } catch (e) {
    err('node --check falló en js/admin-sections.js');
    err(e.stderr ? e.stderr.toString() : e.message);
    process.exit(1);
  }
}

// ═══════════════════════════════════════════════════════════════
//  PASO 2 — Remover el stub F2 de js/views.js
// ═══════════════════════════════════════════════════════════════

function paso2_removerStubDeViewsJS() {
  title('PASO 2 — Remover stub F2 de js/views.js');

  if (!fs.existsSync(FILE_VIEWS_JS)) {
    err('No existe: js/views.js');
    process.exit(1);
  }

  const content = fs.readFileSync(FILE_VIEWS_JS, 'utf8');
  const bytesOriginales = Buffer.byteLength(content, 'utf8');

  // Buscar inicio
  let startIdx = -1;
  let inicioUsado = null;
  for (const marker of STUB_MARKERS_INICIO) {
    const idx = content.indexOf(marker);
    if (idx !== -1) {
      startIdx = idx;
      inicioUsado = marker;
      break;
    }
  }

  if (startIdx === -1) {
    err('No se encontró el inicio del stub F2 en views.js');
    STUB_MARKERS_INICIO.forEach(m => err('  - "' + m + '"'));
    err('Abortando sin modificar.');
    process.exit(1);
  }

  log(`   Marcador INICIO: "${inicioUsado}" (offset ${startIdx})`);

  // Retroceder al /* del comentario
  const antes = content.slice(Math.max(0, startIdx - 500), startIdx);
  const lastComent = antes.lastIndexOf('/*');
  if (lastComent !== -1) {
    startIdx = Math.max(0, startIdx - 500) + lastComent;
    log(`   Ajustado a /* del comentario: offset ${startIdx}`);
  }

  // Buscar fin del stub
  let endIdxRaw = -1;
  let finUsado = null;
  for (const marker of STUB_MARKERS_FIN) {
    const idx = content.indexOf(marker, startIdx + 10);
    if (idx !== -1) {
      endIdxRaw = idx;
      finUsado = marker;
      break;
    }
  }

  if (endIdxRaw === -1) {
    err('No se encontró el fin del stub F2');
    STUB_MARKERS_FIN.forEach(m => err('  - "' + m + '"'));
    err('Abortando sin modificar.');
    process.exit(1);
  }

  log(`   Marcador FIN: "${finUsado}" (offset ${endIdxRaw})`);

  // Extender hasta el IIFE cierre "})();"
  const restOfFile = content.slice(endIdxRaw);
  const iifeEnd = restOfFile.indexOf('})();');
  let endIdx = endIdxRaw;
  if (iifeEnd === -1) {
    warn('No se encontró "})();" después del console.log');
    endIdx = content.indexOf('\n', endIdxRaw);
    if (endIdx === -1) endIdx = content.length;
  } else {
    endIdx = endIdxRaw + iifeEnd + 5;
    log(`   Ajustado al final del IIFE: offset ${endIdx}`);
  }

  // Verificar contenido del bloque a remover
  const bloque = content.slice(startIdx, endIdx);
  if (!bloque.includes('switchAdminSection') && !bloque.includes('restoreAdminSidebarState')) {
    err('El bloque a remover NO contiene funciones del stub.');
    err('Abortando por seguridad.');
    process.exit(1);
  }

  const stubBytes = Buffer.byteLength(bloque, 'utf8');
  log(`   Bytes del stub: ${stubBytes}`);
  if (stubBytes < 1000 || stubBytes > 10000) {
    err(`El stub pesa ${stubBytes} bytes. Esperado entre 1000 y 10000.`);
    process.exit(1);
  }

  // Backup
  crearBackupSiNoExiste(FILE_VIEWS_JS);

  // Escribir
  const nuevoContenido = content.slice(0, startIdx) + content.slice(endIdx);
  const bytesNuevos = Buffer.byteLength(nuevoContenido, 'utf8');
  const pctRestante = (bytesNuevos / bytesOriginales) * 100;

  log(`   Bytes originales: ${bytesOriginales}`);
  log(`   Bytes eliminados: ${bytesOriginales - bytesNuevos}`);
  log(`   Bytes restantes:  ${bytesNuevos}`);
  log(`   % del original:   ${pctRestante.toFixed(2)}%`);

  if (pctRestante < 98) {
    err(`views.js quedaría con ${pctRestante.toFixed(1)}%. Esperado >98%.`);
    err('Abortando.');
    process.exit(1);
  }

  fs.writeFileSync(FILE_VIEWS_JS, nuevoContenido, 'utf8');
  ok('Escrito: js/views.js');

  try {
    execSync(`node --check "${FILE_VIEWS_JS}"`, { stdio: 'pipe' });
    ok('node --check js/views.js → sintaxis OK');
  } catch (e) {
    err('node --check falló en js/views.js');
    err(e.stderr ? e.stderr.toString() : e.message);
    err('Rollback: copy js\\views.js.bak-f5 js\\views.js');
    process.exit(1);
  }
}

// ═══════════════════════════════════════════════════════════════
//  PASO 3 — Agregar <script> en index.html
// ═══════════════════════════════════════════════════════════════

function paso3_agregarScriptEnIndex() {
  title('PASO 3 — Agregar <script> en index.html');

  if (!fs.existsSync(FILE_INDEX_HTML)) {
    err('No existe: index.html');
    process.exit(1);
  }

  let content = fs.readFileSync(FILE_INDEX_HTML, 'utf8');

  if (content.includes('/js/admin-sections.js')) {
    warn('El script admin-sections.js ya estaba en index.html (skip)');
    return { skipped: true };
  }

  // Buscar el script de views.js
  const marker = '<script src="/js/views.js?v=4.6.1"></script>';
  if (!content.includes(marker)) {
    err('No se encontró el marcador de views.js');
    err('Se buscaba: ' + marker);
    process.exit(1);
  }

  const nuevoScript = '\n  \n  <!-- F5 — Módulo de navegación del Panel Admin (lazy loading) -->\n  <script src="/js/admin-sections.js?v=4.7.0"></script>';
  content = content.replace(marker, marker + nuevoScript);

  crearBackupSiNoExiste(FILE_INDEX_HTML);
  fs.writeFileSync(FILE_INDEX_HTML, content, 'utf8');
  ok('Script agregado a index.html');
  return { skipped: false };
}

// ═══════════════════════════════════════════════════════════════
//  MAIN
// ═══════════════════════════════════════════════════════════════

function main() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  🚀 FASE 5 — JS del sidebar con lazy loading');
  console.log('═══════════════════════════════════════════════════════');

  paso1_copiarTemplate();
  paso2_removerStubDeViewsJS();
  const r3 = paso3_agregarScriptEnIndex();

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  ✅ FASE 5 — Completada');
  console.log('═══════════════════════════════════════════════════════');
  console.log('  js/admin-sections.js:  copiado desde template');
  console.log('  js/views.js:           stub F2 removido');
  console.log(`  index.html:            ${r3.skipped ? 'sin cambios' : 'script agregado'}`);
  console.log('');
  console.log('  📁 Backups:');
  console.log('     js/views.js.bak-f5');
  console.log('     index.html.bak-f5');
  console.log('');
  console.log('  🔙 Rollback:');
  console.log('     copy js\\views.js.bak-f5  js\\views.js');
  console.log('     copy index.html.bak-f5   index.html');
  console.log('     del  js\\admin-sections.js');
  console.log('═══════════════════════════════════════════════════════\n');
}

main();