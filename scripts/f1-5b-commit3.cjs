#!/usr/bin/env node
/**
 * ============================================================================
 *  F1.5b — Script #3: Integración completa (Commit #3)
 * ============================================================================
 *  Proyecto:  PARAGUAY-FFAA | METALSTORM
 *  Fase:      F1.5b (Modal de Draft — Sprint 8)
 *  Commit:    #3 de 4
 * ============================================================================
 *  OBJETIVO (3 tareas en un solo script):
 *
 *  A. js/tournaments.js → Insertar el botón "🎯 Draft" en renderBracketMatch
 *     (el fix-button.cjs anterior falló porque el anchor estaba en 2 líneas).
 *
 *  B. sw.js → Bump CACHE_NAME v4.9.0-f1.5a → v4.9.1-f1.5b.
 *
 *  C. index.html → Bump ?v=4.9.0 → ?v=4.9.1 (28 ocurrencias).
 *
 *  USO
 *  ---
 *  node scripts/f1-5b-commit3.cjs              → dry-run (default)
 *  node scripts/f1-5b-commit3.cjs --apply      → aplicar cambios
 * ============================================================================
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT       = path.resolve(__dirname, '..');
const JS_TOURN   = path.join(ROOT, 'js', 'tournaments.js');
const SW_JS      = path.join(ROOT, 'sw.js');
const INDEX_HTML = path.join(ROOT, 'index.html');

const OLD_VERSION = '4.9.0';
const NEW_VERSION = '4.9.1';
const OLD_CACHE   = 'v4.9.0-f1.5a';
const NEW_CACHE   = 'v4.9.1-f1.5b';

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
  const bPath = filePath + '.bak-f1.5b-commit3';
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
//  A. Insertar botón "🎯 Draft" en renderBracketMatch
// ═══════════════════════════════════════════════════════════════════════════
function applyDraftButton() {
  log('step', 'A. js/tournaments.js — Insertar botón Draft en bracket');

  const content = readNormalized(JS_TOURN);

  // Idempotencia: si ya hay una llamada a openDraftModal en un botón, abortar
  if (content.includes("openDraftModal('${escapeHTML(match.id)}')")) {
    log('info', 'Botón Draft ya existe (idempotente)');
    return { ok: true, content, changed: false };
  }

  const lines = content.split('\n');

  // Anchor: la línea con "🎯 Registrar Resultado" (el texto, no el onclick)
  // Estrategia: buscar la línea con "Registrar Resultado" y luego buscar el </button> siguiente.
  const idxTextResult = lines.findIndex(l => l.includes('🎯 Registrar Resultado'));
  if (idxTextResult === -1) {
    log('fail', 'No se encontró la línea "🎯 Registrar Resultado"');
    return { ok: false, content };
  }
  log('ok', `Texto "Registrar Resultado" en línea ${idxTextResult + 1}`);

  // Buscar el cierre </button> siguiente
  let idxCloseBtn = -1;
  for (let i = idxTextResult; i < idxTextResult + 5; i++) {
    if (lines[i].includes('</button>')) {
      idxCloseBtn = i;
      break;
    }
  }
  if (idxCloseBtn === -1) {
    log('fail', 'No se encontró </button> después del texto');
    return { ok: false, content };
  }
  log('ok', `Cierre </button> en línea ${idxCloseBtn + 1}`);

  // Detectar indentación del bloque padre
  const indentMatch = lines[idxTextResult].match(/^(\s*)/);
  const indent = indentMatch ? indentMatch[1] : '          ';

  // Bloque del botón Draft (4 líneas)
  // Las comillas externas del JS string son " (dobles) para permitir ' (simples) internas.
  const draftBtn = [
    `${indent}<button onclick="event.stopPropagation(); openDraftModal('${'${escapeHTML(match.id)}'}')"`,
    `${indent}        class="btn-secondary btn-sm" style="font-size:0.72rem;padding:4px 10px;width:100%;margin-top:4px;">`,
    `${indent}  🎯 Draft`,
    `${indent}</button>`
  ];

  lines.splice(idxCloseBtn + 1, 0, ...draftBtn);
  log('ok', `Botón Draft insertado después de línea ${idxCloseBtn + 1}`);

  return { ok: true, content: lines.join('\n'), changed: true };
}

// ═══════════════════════════════════════════════════════════════════════════
//  B. sw.js — CACHE_NAME bump
// ═══════════════════════════════════════════════════════════════════════════
function applySwJs() {
  log('step', 'B. sw.js — bump CACHE_NAME');

  const content = readNormalized(SW_JS);
  const cachePattern = /const CACHE_NAME\s*=\s*'[^']*';/;
  const match = content.match(cachePattern);
  if (!match) {
    log('fail', 'No se encontró CACHE_NAME');
    return { ok: false, content };
  }

  if (match[0].includes(NEW_CACHE)) {
    log('info', `CACHE_NAME ya está en ${NEW_CACHE} (idempotente)`);
    return { ok: true, content, changed: false };
  }

  const newLine = `const CACHE_NAME = 'PARAGUAY-FFAA-METALSTORM-${NEW_CACHE}';`;
  const finalContent = content.replace(cachePattern, newLine);
  log('ok', `CACHE_NAME: ${OLD_CACHE} → ${NEW_CACHE}`);
  return { ok: true, content: finalContent, changed: true };
}

// ═══════════════════════════════════════════════════════════════════════════
//  C. index.html — bump ?v=
// ═══════════════════════════════════════════════════════════════════════════
function applyIndexHtml() {
  log('step', 'C. index.html — bump assets');

  const content = readNormalized(INDEX_HTML);
  const oldPattern = new RegExp(`\\?v=${OLD_VERSION.replace(/\./g, '\\.')}`, 'g');
  const oldCount = (content.match(oldPattern) || []).length;

  if (oldCount === 0) {
    const newCount = (content.match(new RegExp(`\\?v=${NEW_VERSION.replace(/\./g, '\\.')}`, 'g')) || []).length;
    if (newCount > 0) {
      log('info', `Ya está en ?v=${NEW_VERSION} (${newCount} ocurrencias) — idempotente`);
      return { ok: true, content, changed: false };
    }
    log('warn', `No se encontró ?v=${OLD_VERSION} ni ?v=${NEW_VERSION}`);
    return { ok: true, content, changed: false };
  }

  const finalContent = content.replace(oldPattern, `?v=${NEW_VERSION}`);
  log('ok', `${oldCount} ocurrencias ?v=${OLD_VERSION} → ?v=${NEW_VERSION}`);
  return { ok: true, content: finalContent, changed: true, count: oldCount };
}

// ═══════════════════════════════════════════════════════════════════════════
//  MAIN
// ═══════════════════════════════════════════════════════════════════════════
function main() {
  console.log('');
  console.log('================================================================');
  console.log('  F1.5b — Script #3: Integración completa');
  console.log('================================================================');
  console.log('');

  if (IS_DRY_RUN) {
    log('warn', 'Modo --dry-run: NINGÚN archivo será modificado.');
    console.log('');
  }

  log('step', '[1/5] Verificando archivos...');
  ensureFile(JS_TOURN, 'js/tournaments.js');
  ensureFile(SW_JS, 'sw.js');
  ensureFile(INDEX_HTML, 'index.html');

  log('step', '[2/5] Preparando cambios...');
  const rA = applyDraftButton();
  if (!rA.ok) { log('fail', 'Cambio A falló'); process.exit(1); }

  const rB = applySwJs();
  if (!rB.ok) { log('fail', 'Cambio B falló'); process.exit(1); }

  const rC = applyIndexHtml();
  if (!rC.ok) { log('fail', 'Cambio C falló'); process.exit(1); }

  log('step', '[3/5] Ejecutando...');
  if (IS_DRY_RUN) {
    log('info', '[DRY-RUN] No se escribiría nada.');
    log('info', '[DRY-RUN] Ejecutar con `--apply` para aplicar.');
    console.log('');
    console.log('----------------------------------------------------------------');
    console.log('  RESUMEN (dry-run)');
    console.log('----------------------------------------------------------------');
    console.log(`  · js/tournaments.js → ${rA.changed ? 'Insertar botón Draft en renderBracketMatch' : '(sin cambios)'}`);
    console.log(`  · sw.js             → CACHE_NAME: ${OLD_CACHE} → ${NEW_CACHE}`);
    console.log(`  · index.html        → ?v=${OLD_VERSION} → ?v=${NEW_VERSION} (${rC.count || 0} ocurrencias)`);
    console.log('  Backups:            *.bak-f1.5b-commit3 (x3)');
    console.log('----------------------------------------------------------------');
    console.log('');
    process.exit(0);
  }

  // Backup + aplicar
  if (rA.changed) {
    backup(JS_TOURN);
    writeNormalized(JS_TOURN, rA.content);
    log('ok', 'js/tournaments.js actualizado');
  } else {
    log('info', 'js/tournaments.js sin cambios');
  }

  if (rB.changed) {
    backup(SW_JS);
    writeNormalized(SW_JS, rB.content);
    log('ok', 'sw.js actualizado');
  } else {
    log('info', 'sw.js sin cambios');
  }

  if (rC.changed) {
    backup(INDEX_HTML);
    writeNormalized(INDEX_HTML, rC.content);
    log('ok', `index.html actualizado (${rC.count} ocurrencias)`);
  } else {
    log('info', 'index.html sin cambios');
  }

  log('step', '[4/5] Verificando sintaxis...');
  const okT = nodeCheck(JS_TOURN);
  const okSw = nodeCheck(SW_JS);

  if (!okT || !okSw) {
    log('fail', 'node --check falló. Restaurar backups *.bak-f1.5b-commit3');
    process.exit(1);
  }

  log('step', '[5/5] Verificaciones finales...');
  const tournContent = readNormalized(JS_TOURN);
  const draftBtnCount = (tournContent.match(/openDraftModal/g) || []).length;
  log('ok', `openDraftModal en tournaments.js: ${draftBtnCount} ocurrencias (esperado: 3 = definición + export + botón)`);

  console.log('');
  console.log('----------------------------------------------------------------');
  console.log('  RESUMEN');
  console.log('----------------------------------------------------------------');
  console.log('  ✅ js/tournaments.js → botón Draft en renderBracketMatch');
  console.log(`  ✅ sw.js             → CACHE_NAME: ${NEW_CACHE}`);
  console.log(`  ✅ index.html        → ?v=${NEW_VERSION} (${rC.count} ocurrencias)`);
  console.log('  ✅ node --check OK');
  console.log('  ✅ Backups: *.bak-f1.5b-commit3');
  console.log('----------------------------------------------------------------');
  console.log('');
  console.log('PRÓXIMOS PASOS:');
  console.log('  1. Verificar:  findstr /C:"openDraftModal" js\\tournaments.js   → 3 líneas');
  console.log('                 findstr /C:"4.9.1-f1.5b" sw.js                 → 1 línea');
  console.log('                 findstr /C:"?v=4.9.1" index.html               → ~28 líneas');
  console.log('  2. Commit:     git add js/tournaments.js sw.js index.html scripts/f1-5b-commit3.cjs');
  console.log('                 git commit -m "chore(tournaments): botón draft + integración F1.5b + cache v4.9.1"');
  console.log('  3. Push:       git push origin main');
  console.log('');
}

main();