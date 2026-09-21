/**
 * ============================================================================
 * FIX COUNTDOWN — HALL-066 (uso de submission_closes_at)
 * ============================================================================
 * Corrige el frontend para que el countdown use submission_closes_at
 * en lugar de end_date. Aplica la lógica de ADR-008 al dashboard.
 *
 * Uso:
 *   node scripts/fix-countdown-hall-066.cjs
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);

const FILES = {
  views: path.join(ROOT, 'js', 'views.js'),
  sw: path.join(ROOT, 'sw.js'),
  index: path.join(ROOT, 'index.html'),
};

const C = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
};

function log(msg, color = C.reset) { console.log(`${color}${msg}${C.reset}`); }
function readFile(p) { return fs.readFileSync(p, 'utf8'); }
function writeFile(p, content) { fs.writeFileSync(p, content, 'utf8'); }

log('\n═══════════════════════════════════════════════════════════', C.magenta);
log('  FIX COUNTDOWN — HALL-066', C.magenta);
log('═══════════════════════════════════════════════════════════\n', C.magenta);

// Verificar archivos
log('▸ PASO 1: Verificando archivos...', C.cyan);
for (const [key, p] of Object.entries(FILES)) {
  if (!fs.existsSync(p)) {
    log(`  ❌ No existe: ${p}`, C.red);
    process.exit(1);
  }
  log(`  ✅ ${path.relative(ROOT, p)}`, C.green);
}

// Backups
log('\n▸ PASO 2: Backups...', C.cyan);
const BACKUPS = {};
for (const [key, p] of Object.entries(FILES)) {
  const bk = `${p}.bak-countdown-${TIMESTAMP}`;
  fs.copyFileSync(p, bk);
  BACKUPS[key] = bk;
  log(`  ✅ ${path.basename(bk)}`, C.green);
}

// ============================================================================
// PASO 3: js/views.js
// ============================================================================
log('\n▸ PASO 3: js/views.js...', C.cyan);
{
  const p = FILES.views;
  let content = readFile(p);

  // 3.1 — renderActiveEventWidget: cambiar el countdown
  const oldLine1 = 'startEventCountdown(event.end_date);';
  const newLine1 = [
    '// HALL-066: usar submission_closes_at si está disponible (ADR-008)',
    '    startEventCountdown(event.submission_closes_at || event.end_date);'
  ].join('\n');

  if (content.includes('startEventCountdown(event.submission_closes_at')) {
    log('  ⚠️  renderActiveEventWidget ya usa submission_closes_at. Saltando.', C.yellow);
  } else if (content.includes(oldLine1)) {
    content = content.replace(oldLine1, newLine1);
    log('  ✅ renderActiveEventWidget actualizado', C.green);
  } else {
    log('  ❌ No se encontró "startEventCountdown(event.end_date);" en views.js', C.red);
  }

  // 3.2 — displayEventInfo: cambiar subText para usar submission_closes_at
  const oldSubText = 'const subText = inWindow\n    ? `Cierra el ${endDate.toLocaleDateString(undefined, { weekday:\'long\', day:\'numeric\', month:\'short\', timeZone: TZ_PY })} a las ${endDate.toLocaleTimeString(undefined, { hour:\'2-digit\', minute:\'2-digit\', timeZone: TZ_PY })} (hora PY)`\n    : `Próxima apertura: ${nextWindowOpenLabel()}`;';
  const newSubText = 'const deadlineDate = event.submission_closes_at ? new Date(event.submission_closes_at) : endDate;\n  const subText = inWindow\n    ? `Cierra el ${deadlineDate.toLocaleDateString(undefined, { weekday:\'long\', day:\'numeric\', month:\'short\', timeZone: TZ_PY })} a las ${deadlineDate.toLocaleTimeString(undefined, { hour:\'2-digit\', minute:\'2-digit\', timeZone: TZ_PY })} (hora PY)`\n    : `Próxima apertura: ${nextWindowOpenLabel()}`;';

  if (content.includes('const deadlineDate = event.submission_closes_at')) {
    log('  ⚠️  displayEventInfo ya usa submission_closes_at. Saltando.', C.yellow);
  } else if (content.includes(oldSubText)) {
    content = content.replace(oldSubText, newSubText);
    log('  ✅ displayEventInfo actualizado', C.green);
  } else {
    log('  ⚠️  No se encontró el bloque subText exacto. Puede que el formato sea distinto.', C.yellow);
    log('  ℹ️  Continuá y verificá manualmente.', C.yellow);
  }

  writeFile(p, content);
}

// ============================================================================
// PASO 4: sw.js — Bump cache
// ============================================================================
log('\n▸ PASO 4: sw.js (bump cache)...', C.cyan);
{
  const p = FILES.sw;
  let content = readFile(p);

  const match = content.match(/const CACHE_NAME = ['"`]PARAGUAY-FFAA-METALSTORM-(v[\d.]+)['"`]/);

  if (!match) {
    log('  ⚠️  No se encontró CACHE_NAME. Saltando.', C.yellow);
  } else {
    const oldVersion = match[1];
    const parts = oldVersion.substring(1).split('.').map(n => parseInt(n, 10));
    parts[2] = (parts[2] || 0) + 1;
    const newVersion = 'v' + parts.join('.');

    content = content.replace(
      `PARAGUAY-FFAA-METALSTORM-${oldVersion}`,
      `PARAGUAY-FFAA-METALSTORM-${newVersion}`
    );
    writeFile(p, content);
    log(`  ✅ CACHE_NAME: ${oldVersion} → ${newVersion}`, C.green);
  }
}

// ============================================================================
// PASO 5: index.html — Bump assets
// ============================================================================
log('\n▸ PASO 5: index.html (bump assets)...', C.cyan);
{
  const p = FILES.index;
  let content = readFile(p);

  const versionRegex = /\?v=(\d+\.\d+\.\d+)/g;
  const versions = new Set();
  let m;
  while ((m = versionRegex.exec(content)) !== null) {
    versions.add(m[1]);
  }

  if (versions.size === 0) {
    log('  ⚠️  No se encontraron assets con ?v=X.X.X. Saltando.', C.yellow);
  } else {
    // Tomar la versión más alta
    const versionsArray = Array.from(versions).sort();
    const latest = versionsArray[versionsArray.length - 1];
    const parts = latest.split('.').map(n => parseInt(n, 10));
    parts[2] = (parts[2] || 0) + 1;
    const newVersion = parts.join('.');

    // Reemplazar todas las ocurrencias
    content = content.replace(/\?v=\d+\.\d+\.\d+/g, `?v=${newVersion}`);
    writeFile(p, content);
    log(`  ✅ Assets: ${latest} → ${newVersion}`, C.green);
  }
}

// ============================================================================
// VERIFICACIÓN
// ============================================================================
log('\n═══════════════════════════════════════════════════════════', C.magenta);
log('  VERIFICACIÓN', C.magenta);
log('═══════════════════════════════════════════════════════════\n', C.magenta);

const viewsFinal = readFile(FILES.views);
if (viewsFinal.includes('event.submission_closes_at || event.end_date')) {
  log('  ✅ js/views.js — countdown usa submission_closes_at', C.green);
} else {
  log('  ⚠️  js/views.js — countdown NO actualizado. Verificar manualmente.', C.yellow);
}

log('\nBackups:', C.yellow);
for (const bk of Object.values(BACKUPS)) {
  log(`  - ${path.basename(bk)}`, C.yellow);
}

log('\nPróximos pasos:', C.yellow);
log('  1. Verificar en VS Code: git diff js/views.js', C.reset);
log('  2. git add js/views.js sw.js index.html', C.reset);
log('  3. git commit -m "fix(hall-066): countdown usa submission_closes_at"', C.reset);
log('  4. git push origin main', C.reset);
log('  5. fly deploy', C.reset);
log('');