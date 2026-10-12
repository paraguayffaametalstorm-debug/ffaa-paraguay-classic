#!/usr/bin/env node
/**
 * ============================================================================
 *  F1.5b — Script #5: Botón "Torneos" en el menú desktop
 * ============================================================================
 *  Proyecto:  PARAGUAY-FFAA | METALSTORM
 *  Fase:      F1.5b (Modal de Draft — Sprint 8)
 *  Commit:    #5 de 5
 * ============================================================================
 *  OBJETIVO
 *  --------
 *  Agregar el botón "Torneos Internos" al menú de navegación desktop
 *  (clase .nav-tab), replicando el que ya existe en el drawer mobile
 *  (.drawer-nav-btn). El botón se inserta después de "Catálogo Cazas"
 *  en la segunda fila del menú.
 *
 *  OPERACIONES (2):
 *    1. components/header.html  → insertar botón nav-tab
 *    2. index.html + sw.js      → bump cache v4.9.1 → v4.9.2
 *
 *  USO
 *  ---
 *  node scripts/f1-5b-menu-torneos.cjs           → dry-run
 *  node scripts/f1-5b-menu-torneos.cjs --apply   → aplicar
 * ============================================================================
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const ROOT    = path.resolve(__dirname, '..');
const HEADER  = path.join(ROOT, 'components', 'header.html');
const INDEX   = path.join(ROOT, 'index.html');
const SW      = path.join(ROOT, 'sw.js');

const APPLY      = process.argv.includes('--apply');
const IS_DRY_RUN = !APPLY;

function log(prefix, message) {
  const icons = { ok: '✅', fail: '❌', info: 'ℹ️ ', warn: '⚠️ ', step: '🔹' };
  console.log(`${icons[prefix] || '  '} ${message}`);
}

function readNormalized(p) { return fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n'); }
function writeNormalized(p, c) { fs.writeFileSync(p, c, 'utf8'); }

function backup(p) {
  const b = p + '.bak-f1.5b-menu';
  if (!fs.existsSync(b)) {
    fs.copyFileSync(p, b);
    log('ok', `Backup: ${path.basename(b)}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// CAMBIO 1 — components/header.html: insertar botón "Torneos Internos"
// ═══════════════════════════════════════════════════════════════════════════
function applyHeader() {
  log('step', 'A. components/header.html — insertar botón nav-tab');

  const content = readNormalized(HEADER);

  // Idempotencia: si ya existe el botón, salir
  if (content.includes('data-view="tournamentsView"') &&
      content.includes('class="nav-tab"')) {
    log('info', 'El botón "Torneos" ya existe en header.html (idempotente)');
    return { ok: true, content, changed: false };
  }

  // Anchor: buscar el botón de "Catálogo Cazas" o "Rendimientos Globales" como referencia
  // para insertar el nuevo botón después
  const anchorRegex = /(<button[^>]*data-view="adminPlaneModels"[^>]*>[\s\S]*?<\/button>)/;
  const match = content.match(anchorRegex);

  if (!match) {
    log('warn', 'No se encontró anchor "Catálogo Cazas" (adminPlaneModels)');
    log('info', 'Buscando anchor alternativo "Rendimientos Globales" (allPerformancesView)...');

    const altAnchor = /(<button[^>]*data-view="allPerformancesView"[^>]*>[\s\S]*?<\/button>)/;
    const altMatch = content.match(altAnchor);

    if (!altMatch) {
      log('fail', 'No se encontró ningún anchor para insertar el botón');
      return { ok: false, content };
    }

    const nuevoBoton = `
    <button onclick="showView('tournamentsView')" class="nav-tab" data-view="tournamentsView" style="color:#d4af37;">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-lucide="trophy" aria-hidden="true" class="lucide lucide-trophy lucide-icon" style="color:#d4af37;"><path d="M10 14.66V17a1 1 0 0 1-1 1 2 2 0 0 0-2 2v2"></path><path d="M14 14.66V17a1 1 0 0 0 1 1 2 2 0 0 1 2 2v2"></path><path d="M17.916 10H19.5A2.5 2.5 0 0 0 22 7.5V5a1 1 0 0 0-1-1h-3"></path><path d="M4 22h16"></path><path d="M6 9a6 6 0 0 0 12 0V3a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1z"></path><path d="M6.084 10H4.5A2.5 2.5 0 0 1 2 7.5V5a1 1 0 0 1 1-1h3"></path></svg> Torneos
    </button>`;

    const newContent = content.replace(altMatch[1], altMatch[1] + nuevoBoton);
    log('ok', 'Botón "Torneos" insertado después de "Rendimientos Globales"');
    return { ok: true, content: newContent, changed: true };
  }

  const nuevoBoton = `
    <button onclick="showView('tournamentsView')" class="nav-tab" data-view="tournamentsView" style="color:#d4af37;">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-lucide="trophy" aria-hidden="true" class="lucide lucide-trophy lucide-icon" style="color:#d4af37;"><path d="M10 14.66V17a1 1 0 0 1-1 1 2 2 0 0 0-2 2v2"></path><path d="M14 14.66V17a1 1 0 0 0 1 1 2 2 0 0 1 2 2v2"></path><path d="M17.916 10H19.5A2.5 2.5 0 0 0 22 7.5V5a1 1 0 0 0-1-1h-3"></path><path d="M4 22h16"></path><path d="M6 9a6 6 0 0 0 12 0V3a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1z"></path><path d="M6.084 10H4.5A2.5 2.5 0 0 1 2 7.5V5a1 1 0 0 1 1-1h3"></path></svg> Torneos
    </button>`;

  const newContent = content.replace(match[1], match[1] + nuevoBoton);
  log('ok', 'Botón "Torneos" insertado después de "Catálogo Cazas"');
  return { ok: true, content: newContent, changed: true };
}

// ═══════════════════════════════════════════════════════════════════════════
// CAMBIO 2 — sw.js: bump CACHE_NAME v4.9.1 → v4.9.2
// ═══════════════════════════════════════════════════════════════════════════
function applySw() {
  log('step', 'B. sw.js — bump CACHE_NAME v4.9.1 → v4.9.2');

  const content = readNormalized(SW);

  if (content.includes('v4.9.2-f1.5b')) {
    log('info', 'sw.js ya está en v4.9.2 (idempotente)');
    return { ok: true, content, changed: false };
  }

  if (!content.includes('v4.9.1-f1.5b')) {
    log('fail', 'No se encontró v4.9.1-f1.5b en sw.js');
    return { ok: false, content };
  }

  const newContent = content.replace(
    /v4\.9\.1-f1\.5b/g,
    'v4.9.2-f1.5b'
  );
  log('ok', 'CACHE_NAME: v4.9.1-f1.5b → v4.9.2-f1.5b');
  return { ok: true, content: newContent, changed: true };
}

// ═══════════════════════════════════════════════════════════════════════════
// CAMBIO 3 — index.html: bump ?v=4.9.1 → ?v=4.9.2
// ═══════════════════════════════════════════════════════════════════════════
function applyIndex() {
  log('step', 'C. index.html — bump assets ?v=4.9.1 → ?v=4.9.2');

  const content = readNormalized(INDEX);

  if (content.includes('?v=4.9.2')) {
    log('info', 'index.html ya está en ?v=4.9.2 (idempotente)');
    return { ok: true, content, changed: false };
  }

  if (!content.includes('?v=4.9.1')) {
    log('fail', 'No se encontró ?v=4.9.1 en index.html');
    return { ok: false, content };
  }

  const count = (content.match(/\?v=4\.9\.1/g) || []).length;
  const newContent = content.replace(/\?v=4\.9\.1/g, '?v=4.9.2');
  log('ok', `${count} ocurrencias ?v=4.9.1 → ?v=4.9.2`);
  return { ok: true, content: newContent, changed: true };
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════
function main() {
  console.log('');
  console.log('================================================================');
  console.log('  F1.5b — Script #5: Botón Torneos en menú desktop');
  console.log('================================================================');
  console.log('');

  if (IS_DRY_RUN) {
    log('warn', 'Modo --dry-run: NINGÚN archivo será modificado.');
    console.log('');
  }

  log('step', '[1/4] Verificando archivos...');
  for (const [label, p] of [['header.html', HEADER], ['sw.js', SW], ['index.html', INDEX]]) {
    if (!fs.existsSync(p)) {
      log('fail', `No existe ${label}: ${p}`);
      process.exit(1);
    }
    log('ok', `${label} encontrado`);
  }

  log('step', '[2/4] Preparando cambios...');
  const r1 = applyHeader();
  if (!r1.ok) { log('fail', 'Cambio 1 falló'); process.exit(1); }
  const r2 = applySw();
  if (!r2.ok) { log('fail', 'Cambio 2 falló'); process.exit(1); }
  const r3 = applyIndex();
  if (!r3.ok) { log('fail', 'Cambio 3 falló'); process.exit(1); }

  log('step', '[3/4] Ejecutando...');
  if (IS_DRY_RUN) {
    log('info', '[DRY-RUN] No se escribiría nada.');
    log('info', '[DRY-RUN] Ejecutar con `--apply`.');
    console.log('');
    console.log('----------------------------------------------------------------');
    console.log('  RESUMEN (dry-run)');
    console.log('----------------------------------------------------------------');
    console.log('  · components/header.html → +botón "🏆 Torneos" (nav-tab)');
    console.log('  · sw.js                  → v4.9.1-f1.5b → v4.9.2-f1.5b');
    console.log('  · index.html             → ?v=4.9.1 → ?v=4.9.2 (~29)');
    console.log('  Backups:                 *.bak-f1.5b-menu (x3)');
    console.log('----------------------------------------------------------------');
    console.log('');
    process.exit(0);
  }

  if (r1.changed) { backup(HEADER); writeNormalized(HEADER, r1.content); log('ok', 'header.html actualizado'); }
  if (r2.changed) { backup(SW); writeNormalized(SW, r2.content); log('ok', 'sw.js actualizado'); }
  if (r3.changed) { backup(INDEX); writeNormalized(INDEX, r3.content); log('ok', 'index.html actualizado'); }

  console.log('');
  console.log('----------------------------------------------------------------');
  console.log('  RESUMEN');
  console.log('----------------------------------------------------------------');
  console.log('  ✅ components/header.html → +botón "🏆 Torneos"');
  console.log('  ✅ sw.js                  → v4.9.2-f1.5b');
  console.log('  ✅ index.html             → ?v=4.9.2');
  console.log('  ✅ Backups: *.bak-f1.5b-menu');
  console.log('----------------------------------------------------------------');
  console.log('');
  console.log('PRÓXIMOS PASOS:');
  console.log('  1. Verificar:  findstr /C:"Torneos" components\\header.html');
  console.log('  2. Commit:     git add components/header.html sw.js index.html scripts/f1-5b-menu-torneos.cjs');
  console.log('                 git commit -m "feat(nav): botón Torneos en menú desktop + cache v4.9.2"');
  console.log('  3. Push:       git push origin main');
  console.log('  4. 🏆 F1.5b cerrada definitivamente con acceso visible.');
  console.log('');
}

main();