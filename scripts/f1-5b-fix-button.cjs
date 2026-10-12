#!/usr/bin/env node
/**
 * F1.5b — Fix: insertar el botón Draft en renderBracketMatch
 *
 * El script anterior buscaba el anchor en js/api.js por error. Este script
 * lo inserta correctamente en js/tournaments.js, dentro de la función
 * renderBracketMatch.
 *
 * USO:
 *   node scripts/f1-5b-fix-button.cjs              → dry-run
 *   node scripts/f1-5b-fix-button.cjs --apply      → aplicar
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const ROOT      = path.resolve(__dirname, '..');
const JS_TOURN  = path.join(ROOT, 'js', 'tournaments.js');
const APPLY     = process.argv.includes('--apply');
const DRY_RUN   = !APPLY;

function log(prefix, message) {
  const icons = { ok: '✅', fail: '❌', info: 'ℹ️ ', warn: '⚠️ ', step: '🔹' };
  console.log(`${icons[prefix] || '  '} ${message}`);
}

function readNormalized(p) {
  return fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
}

function writeNormalized(p, c) {
  fs.writeFileSync(p, c, 'utf8');
}

function main() {
  console.log('');
  console.log('================================================================');
  console.log('  F1.5b — Fix: botón Draft en renderBracketMatch');
  console.log('================================================================');
  console.log('');

  if (DRY_RUN) log('warn', 'Modo --dry-run: NINGÚN archivo será modificado.');

  log('step', '[1/3] Verificando archivo...');
  if (!fs.existsSync(JS_TOURN)) {
    log('fail', `No existe ${JS_TOURN}`);
    process.exit(1);
  }
  log('ok', 'js/tournaments.js encontrado');

  const content = readNormalized(JS_TOURN);

  // Idempotencia
  if (content.includes("openDraftModal('${escapeHTML(match.id)}')")) {
    log('info', 'Botón Draft ya existe en tournaments.js (idempotente)');
    process.exit(0);
  }

  log('step', '[2/3] Buscando anchor en renderBracketMatch...');
  const lines = content.split('\n');

  // Anchor: la línea del botón "Registrar Resultado" — combinamos ambos criterios
  const anchorIdx = lines.findIndex(l =>
    l.includes('openMatchResultModal(') && l.includes('Registrar Resultado')
  );
  if (anchorIdx === -1) {
    log('fail', 'No se encontró anchor "openMatchResultModal(...Registrar Resultado"');
    log('info', 'Listando líneas con "openMatchResultModal" para diagnóstico:');
    lines.forEach((l, i) => {
      if (l.includes('openMatchResultModal')) {
        console.log(`  ${i + 1}: ${l.trim().substring(0, 120)}`);
      }
    });
    process.exit(1);
  }
  log('ok', `Anchor encontrado en línea ${anchorIdx + 1}: ${lines[anchorIdx].trim().substring(0, 80)}...`);

  // Encontrar el cierre </button> del mismo bloque
  let closeIdx = -1;
  for (let i = anchorIdx; i < anchorIdx + 6; i++) {
    if (lines[i].includes('</button>')) {
      closeIdx = i;
      break;
    }
  }
  if (closeIdx === -1) {
    log('fail', 'No se encontró cierre </button> en las 5 líneas siguientes');
    process.exit(1);
  }
  log('ok', `Cierre </button> en línea ${closeIdx + 1}`);

  log('step', '[3/3] Preparando inserción...');

  // Detectar indentación del anchor para replicarla
  const indentMatch = lines[anchorIdx].match(/^(\s*)/);
  const indent = indentMatch ? indentMatch[1] : '          ';

  // Bloque del botón Draft — OUTER con comillas dobles, INNER con comillas simples.
  // Los \" son comillas dobles escapadas (que se escriben literalmente al output).
  // Los ' son comillas simples normales (que se escriben literalmente).
  const draftBtn = [
    `${indent}<button onclick="event.stopPropagation(); openDraftModal('` + '${escapeHTML(match.id)}' + `')"`,
    `${indent}        class="btn-secondary btn-sm" style="font-size:0.72rem;padding:4px 10px;width:100%;margin-top:4px;">`,
    `${indent}  🎯 Draft`,
    `${indent}</button>`
  ];

  console.log('');
  console.log('  Bloque a insertar:');
  draftBtn.forEach(l => console.log('  │ ' + l));
  console.log('');

  if (DRY_RUN) {
    log('info', '[DRY-RUN] Ejecutar con --apply para insertar.');
    process.exit(0);
  }

  // Backup
  const backup = JS_TOURN + '.bak-f1.5b-button';
  if (!fs.existsSync(backup)) {
    fs.copyFileSync(JS_TOURN, backup);
    log('ok', `Backup: ${path.basename(backup)}`);
  }

  // Insertar después del cierre </button> del botón "Registrar Resultado"
  lines.splice(closeIdx + 1, 0, ...draftBtn);
  writeNormalized(JS_TOURN, lines.join('\n'));
  log('ok', `Botón Draft insertado después de línea ${closeIdx + 1}`);

  // Verificación con node --check
  try {
    const { execSync } = require('child_process');
    execSync(`node --check "${JS_TOURN}"`, { stdio: 'pipe' });
    log('ok', 'node --check OK');

    // Verificación final con findstr
    const verify = readNormalized(JS_TOURN);
    const occurrences = (verify.match(/openDraftModal/g) || []).length;
    log('ok', `openDraftModal aparece ${occurrences} veces (esperado: 2)`);
  } catch (err) {
    log('fail', 'node --check falló. Restaurar backup.');
    fs.copyFileSync(backup, JS_TOURN);
    process.exit(1);
  }

  console.log('');
  console.log('----------------------------------------------------------------');
  console.log('  ✅ Botón Draft insertado en renderBracketMatch');
  console.log('  ✅ Backup: tournaments.js.bak-f1.5b-button');
  console.log('----------------------------------------------------------------');
  console.log('');
  console.log('PRÓXIMOS PASOS:');
  console.log('  1. findstr /C:"openDraftModal" js\\tournaments.js   → debe dar 2 líneas');
  console.log('  2. npx vitest run                                    → 655/0/2 esperado');
  console.log('  3. git add + commit + push');
  console.log('');
}

main();