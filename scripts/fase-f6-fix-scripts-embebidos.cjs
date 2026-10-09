/**
 * ═══════════════════════════════════════════════════════════════
 *  FASE 6 — Fix: scripts embebidos en secciones no se ejecutan
 *  ─────────────────────────────────────────────────────────────
 *  Problema: los <script> dentro del HTML inyectado vía innerHTML
 *  NO se ejecutan (comportamiento estándar de los navegadores).
 *
 *  Solución: mover las funciones switchEventoTab y
 *  toggleDotacionCompactMode a js/admin-sections.js (que sí se
 *  ejecuta siempre al cargar).
 *
 *  Uso:      node scripts/fase-f6-fix-scripts-embebidos.cjs
 *  Rollback: copy js\admin-sections.js.bak-f6-scripts js\admin-sections.js
 * ═══════════════════════════════════════════════════════════════
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const FILE_ADMIN_SECTIONS = path.join(ROOT, 'js', 'admin-sections.js');

function log(msg)   { console.log(msg); }
function ok(msg)    { console.log(`   ✅ ${msg}`); }
function warn(msg)  { console.log(`   ⚠️  ${msg}`); }
function err(msg)   { console.error(`   ❌ ${msg}`); }
function title(msg) { console.log(`\n🔷 ${msg}`); }

function crearBackup(filepath, suffix) {
  const backup = filepath + suffix;
  if (fs.existsSync(backup)) {
    warn(`Backup ya existía: ${path.basename(backup)}`);
    return;
  }
  fs.copyFileSync(filepath, backup);
  ok(`Backup: ${path.basename(backup)}`);
}

function main() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  🚀 FASE 6 — Fix: scripts embebidos en secciones');
  console.log('═══════════════════════════════════════════════════════');

  if (!fs.existsSync(FILE_ADMIN_SECTIONS)) {
    err('No existe: js/admin-sections.js');
    process.exit(1);
  }

  let content = fs.readFileSync(FILE_ADMIN_SECTIONS, 'utf8');
  const bytesOriginales = Buffer.byteLength(content, 'utf8');

  // ─── PASO 1: Verificar que el bloque a insertar no existe ya ───
  title('PASO 1 — Verificar estado');

  if (content.includes('window.switchEventoTab')) {
    warn('window.switchEventoTab ya estaba definido. Se reemplazará.');
  }
  if (content.includes('window.toggleDotacionCompactMode')) {
    warn('window.toggleDotacionCompactMode ya estaba definido. Se reemplazará.');
  }

  // ─── PASO 2: Definir el bloque de funciones auxiliares ───
  title('PASO 2 — Insertar funciones auxiliares');

  const funcionesAuxiliares = [
    '',
    '  // ═══════════════════════════════════════════════════════════════',
    '  //  FUNCIONES AUXILIARES DE SECCIONES (F6-FIX)',
    '  //  ─────────────────────────────────────────────────────────────',
    '  //  Estas funciones estaban dentro de <script> embebidos en el',
    '  //  HTML inyectado vía innerHTML. Como el navegador NO ejecuta',
    '  //  los <script> de innerHTML, hay que definirlas acá.',
    '  // ═══════════════════════════════════════════════════════════════',
    '',
    '  /**',
    '   * Cambia el sub-tab dentro de la sección Eventos.',
    '   * Tabs: "lista" | "carga" | "export"',
    '   */',
    '  function switchEventoTab(tab) {',
    '    // Actualizar botones de tabs',
    "    document.querySelectorAll('#eventosTabsContainer .admin-tab-btn').forEach(function(btn) {",
    "      btn.classList.toggle('active', btn.dataset.etab === tab);",
    '    });',
    '    // Ocultar todos los panels',
    "    document.querySelectorAll('.evento-panel').forEach(function(p) {",
    "      p.style.display = 'none';",
    '    });',
    '    // Mostrar el panel seleccionado',
    "    const target = document.getElementById('evento-panel-' + tab);",
    "    if (target) target.style.display = 'block';",
    '',
    '    // Si se abre el tab "export", cargar la lista de eventos',
    "    if (tab === 'export' && typeof window.loadExportEventsList === 'function') {",
    '      window.loadExportEventsList();',
    '    }',
    '',
    '    // Refrescar iconos Lucide del panel nuevo',
    "    if (typeof window.refreshLucideIcons === 'function') {",
    '      setTimeout(window.refreshLucideIcons, 30);',
    '    }',
    '',
    "    console.log('[Admin][Eventos] Sub-tab activado:', tab);",
    '  }',
    '',
    '  /**',
    '   * Toggle del modo compacto en la tabla de Dotación.',
    '   */',
    '  let _compactMode = false;',
    '  function toggleDotacionCompactMode() {',
    '    _compactMode = !_compactMode;',
    "    const wrapper = document.getElementById('dotacionTableWrapper');",
    "    if (wrapper) wrapper.classList.toggle('table-compact', _compactMode);",
    "    const label = document.getElementById('compactToggleLabel');",
    "    if (label) label.textContent = _compactMode ? '✅ Modo Compacto' : '⬜ Modo Compacto';",
    "    console.log('[Admin][Dotación] Modo compacto:', _compactMode);",
    '  }',
    '',
    '  // Exponer globalmente',
    '  window.switchEventoTab = switchEventoTab;',
    '  window.toggleDotacionCompactMode = toggleDotacionCompactMode;',
    ''
  ].join('\n');

  // Insertar antes del bloque "EXPONER GLOBAL" o al final
  const markerExponer = '  // ═══════════════════════════════════════════════════════════════\n  //  EXPOSICIÓN GLOBAL';
  const markerExponerIdx = content.indexOf(markerExponer);

  if (markerExponerIdx === -1) {
    // Si no encuentra el marker, insertar antes del cierre final
    const cierreIdx = content.lastIndexOf('})();');
    if (cierreIdx === -1) {
      err('No se encontró cierre del IIFE en admin-sections.js');
      process.exit(1);
    }
    content = content.slice(0, cierreIdx) + funcionesAuxiliares + '\n' + content.slice(cierreIdx);
    ok('Funciones auxiliares insertadas antes del cierre IIFE');
  } else {
    content = content.slice(0, markerExponerIdx) + funcionesAuxiliares + '\n' + content.slice(markerExponerIdx);
    ok('Funciones auxiliares insertadas antes de EXPOSICIÓN GLOBAL');
  }

  // ─── PASO 3: Escribir el archivo ───
  title('PASO 3 — Escribir js/admin-sections.js');

  crearBackup(FILE_ADMIN_SECTIONS, '.bak-f6-scripts');

  const bytesNuevos = Buffer.byteLength(content, 'utf8');
  log(`   Bytes originales: ${bytesOriginales}`);
  log(`   Bytes nuevos:     ${bytesNuevos}`);
  log(`   Diferencia:       +${bytesNuevos - bytesOriginales}`);

  fs.writeFileSync(FILE_ADMIN_SECTIONS, content, 'utf8');
  ok('Escrito: js/admin-sections.js');

  try {
    execSync(`node --check "${FILE_ADMIN_SECTIONS}"`, { stdio: 'pipe' });
    ok('node --check js/admin-sections.js → sintaxis OK');
  } catch (e) {
    err('node --check falló');
    err(e.stderr ? e.stderr.toString() : e.message);
    err('Rollback: copy js\\admin-sections.js.bak-f6-scripts js\\admin-sections.js');
    process.exit(1);
  }

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  ✅ Fix aplicado');
  console.log('═══════════════════════════════════════════════════════');
  console.log('  window.switchEventoTab       → definida globalmente');
  console.log('  window.toggleDotacionCompactMode → definida globalmente');
  console.log('');
  console.log('  Próximo paso:');
  console.log('     git add js/admin-sections.js');
  console.log('     git commit -m "fix(admin): mover scripts embebidos a admin-sections.js"');
  console.log('     git push origin main');
  console.log('');
  console.log('  🔙 Rollback:');
  console.log('     copy js\\admin-sections.js.bak-f6-scripts js\\admin-sections.js');
  console.log('═══════════════════════════════════════════════════════\n');
}

main();