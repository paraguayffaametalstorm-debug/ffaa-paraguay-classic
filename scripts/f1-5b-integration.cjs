#!/usr/bin/env node
/**
 * ============================================================================
 *  F1.5b — Script #3: Integración + Cache Bump
 * ============================================================================
 *  Proyecto:  PARAGUAY-FFAA | METALSTORM
 *  Fase:      F1.5b (Modal de Draft — Sprint 8)
 *  Commit:    #3 de 4
 * ============================================================================
 *  OBJETIVO
 *  --------
 *  1. sw.js: bump CACHE_NAME v4.9.0-f1.5a → v4.9.1-f1.5b.
 *  2. index.html: bump assets ?v=4.9.0 → ?v=4.9.1 (28 ocurrencias).
 *
 *  Sin esto, los usuarios con la PWA instalada seguirían viendo el
 *  tournaments.js viejo (cacheado) y el modal de draft NO funcionaría.
 *
 *  USO
 *  ---
 *  node scripts/f1-5b-integration.cjs              → dry-run (default)
 *  node scripts/f1-5b-integration.cjs --apply      → aplicar cambios
 * ============================================================================
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT          = path.resolve(__dirname, '..');
const SW_JS         = path.join(ROOT, 'sw.js');
const INDEX_HTML    = path.join(ROOT, 'index.html');
const BACKUP_SUFFIX = '.bak-f1.5b';

const OLD_VERSION   = '4.9.0';
const NEW_VERSION   = '4.9.1';
const OLD_CACHE     = 'v4.9.0-f1.5a';
const NEW_CACHE     = 'v4.9.1-f1.5b';

const APPLY      = process.argv.includes('--apply');
const IS_DRY_RUN = !APPLY;

function log(prefix, message) {
  const icons = { ok: '✅', fail: '❌', info: 'ℹ️ ', warn: '⚠️ ', step: '🔹' };
  console.log(`${icons[prefix] || '  '} ${message}`);
}

function ensureFile(filePath, label) {
  if (!fs.existsSync(filePath)) {
    log('fail', `${label} no encontrado: ${filePath}`);
    process.exit(1);
  }
  log('ok', `${label} encontrado`);
}

function backup(filePath) {
  const bPath = filePath + BACKUP_SUFFIX;
  if (!fs.existsSync(bPath)) {
    fs.copyFileSync(filePath, bPath);
    log('ok', `Backup: ${path.basename(bPath)}`);
  } else {
    log('info', `Backup ya existe: ${path.basename(bPath)}`);
  }
}

function readNormalized(p) {
  return fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
}

function writeNormalized(p, c) {
  fs.writeFileSync(p, c, 'utf8');
}

function nodeCheck(filePath) {
  try {
    execSync(`node --check "${filePath}"`, { stdio: 'pipe' });
    log('ok', `node --check ${path.basename(filePath)} → OK`);
    return true;
  } catch (err) {
    log('fail', `node --check falló en ${path.basename(filePath)}`);
    console.error(err.stderr ? err.stderr.toString() : err.message);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  A. sw.js — CACHE_NAME bump
// ═══════════════════════════════════════════════════════════════════════════
function applySwJs() {
  log('step', 'A. sw.js — bump CACHE_NAME');

  const content = readNormalized(SW_JS);
  const cachePattern = /const CACHE_NAME\s*=\s*'[^']*';/;
  const match = content.match(cachePattern);
  if (!match) {
    log('fail', 'No se encontró CACHE_NAME en sw.js');
    return { ok: false, content };
  }

  const oldLine = match[0];

  // Idempotencia
  if (oldLine.includes(NEW_CACHE)) {
    log('info', `CACHE_NAME ya está en ${NEW_CACHE} (idempotente)`);
    return { ok: true, content, changed: false };
  }

  if (!oldLine.includes(OLD_CACHE)) {
    log('warn', `CACHE_NAME actual no matchea "${OLD_CACHE}" pero tampoco "${NEW_CACHE}".`);
    log('warn', `Línea actual: ${oldLine}`);
    log('warn', `Reemplazando por ${NEW_CACHE} de todas formas.`);
  }

  const newLine = `const CACHE_NAME = 'PARAGUAY-FFAA-METALSTORM-${NEW_CACHE}';`;
  const finalContent = content.replace(cachePattern, newLine);

  log('ok', `CACHE_NAME: ${OLD_CACHE} → ${NEW_CACHE}`);
  return { ok: true, content: finalContent, changed: true };
}

// ═══════════════════════════════════════════════════════════════════════════
//  B. index.html — bump ?v=4.9.0 → ?v=4.9.1
// ═══════════════════════════════════════════════════════════════════════════
function applyIndexHtml() {
  log('step', 'B. index.html — bump assets ?v=4.9.0 → ?v=4.9.1');

  const content = readNormalized(INDEX_HTML);

  // Buscar todas las ocurrencias de ?v=4.9.0
  const oldPattern = new RegExp(`\\?v=${OLD_VERSION.replace(/\./g, '\\.')}`, 'g');
  const newPattern = `?v=${NEW_VERSION}`;

  const oldCount = (content.match(oldPattern) || []).length;

  if (oldCount === 0) {
    // Verificar si ya está en la nueva versión
    const newCount = (content.match(new RegExp(`\\?v=${NEW_VERSION.replace(/\./g, '\\.')}`, 'g')) || []).length;
    if (newCount > 0) {
      log('info', `Ya está en ?v=${NEW_VERSION} (${newCount} ocurrencias) — idempotente`);
      return { ok: true, content, changed: false };
    }
    log('warn', `No se encontró ?v=${OLD_VERSION} ni ?v=${NEW_VERSION}`);
    return { ok: true, content, changed: false };
  }

  const finalContent = content.replace(oldPattern, newPattern);
  log('ok', `${oldCount} ocurrencias ?v=${OLD_VERSION} → ?v=${NEW_VERSION}`);
  return { ok: true, content: finalContent, changed: true, count: oldCount };
}

// ═══════════════════════════════════════════════════════════════════════════
//  MAIN
// ═══════════════════════════════════════════════════════════════════════════
function main() {
  console.log('');
  console.log('================================================================');
  console.log('  F1.5b — Script #3: Integración + Cache Bump');
  console.log('================================================================');
  console.log('');

  if (IS_DRY_RUN) {
    log('warn', 'Modo --dry-run: NINGÚN archivo será modificado.');
    console.log('');
  }

  log('step', '[1/4] Verificando entorno...');
  ensureFile(SW_JS, 'sw.js');
  ensureFile(INDEX_HTML, 'index.html');

  log('step', '[2/4] Preparando cambios...');
  const rSw = applySwJs();
  if (!rSw.ok) { log('fail', 'Cambio sw.js falló'); process.exit(1); }

  const rIndex = applyIndexHtml();
  if (!rIndex.ok) { log('fail', 'Cambio index.html falló'); process.exit(1); }

  log('step', '[3/4] Ejecutando...');
  if (IS_DRY_RUN) {
    log('info', '[DRY-RUN] No se escribiría nada.');
    log('info', '[DRY-RUN] Ejecutar con `--apply` para aplicar.');
    console.log('');
    console.log('----------------------------------------------------------------');
    console.log('  RESUMEN (dry-run)');
    console.log('----------------------------------------------------------------');
    console.log(`  · sw.js       → CACHE_NAME: ${OLD_CACHE} → ${NEW_CACHE}`);
    console.log(`  · index.html  → ?v=${OLD_VERSION} → ?v=${NEW_VERSION} (${rIndex.count || 0} ocurrencias)`);
    console.log('  Backups:      .bak-f1.5b (x2)');
    console.log('----------------------------------------------------------------');
    console.log('');
    process.exit(0);
  }

  // Backup + escribir
  if (rSw.changed) {
    backup(SW_JS);
    writeNormalized(SW_JS, rSw.content);
    log('ok', 'sw.js actualizado');
  } else {
    log('info', 'sw.js sin cambios (idempotente)');
  }

  if (rIndex.changed) {
    backup(INDEX_HTML);
    writeNormalized(INDEX_HTML, rIndex.content);
    log('ok', `index.html actualizado (${rIndex.count} ocurrencias)`);
  } else {
    log('info', 'index.html sin cambios (idempotente)');
  }

  log('step', '[4/4] Verificando sintaxis sw.js...');
  if (!nodeCheck(SW_JS)) {
    log('fail', 'node --check falló. Restaurar backup.');
    process.exit(1);
  }

  console.log('');
  console.log('----------------------------------------------------------------');
  console.log('  RESUMEN');
  console.log('----------------------------------------------------------------');
  console.log(`  ✅ sw.js       → CACHE_NAME: ${NEW_CACHE}`);
  console.log(`  ✅ index.html  → ?v=${NEW_VERSION} (${rIndex.count || 0} ocurrencias)`);
  console.log('  ✅ node --check sw.js → OK');
  console.log('  ✅ Backups: *.bak-f1.5b (x2)');
  console.log('----------------------------------------------------------------');
  console.log('');
  console.log('PRÓXIMOS PASOS:');
  console.log('  1. Verificar:  findstr /C:"4.9.1" sw.js');
  console.log('                 findstr /C:"?v=4.9.1" index.html');
  console.log('  2. Commit:     git add sw.js index.html scripts/f1-5b-integration.cjs');
  console.log('                 git commit -m "chore(tournaments): integrar F1.5b + bump cache v4.9.1"');
  console.log('  3. Push:       git push origin main');
  console.log('');
}

main();