/**
 * ============================================================================
 * FIX COUNTDOWN v2 — HALL-066 (AGREGA ventana de carga, no reemplaza)
 * ============================================================================
 * Uso: node scripts/fix-countdown-hall-066.cjs
 *
 * Qué hace:
 *  1. components/dashboard.html → agrega bloque "Ventana de carga"
 *     entre aeCountdown y aeCta, y renombra "Tiempo restante" a
 *     "Cierre del evento".
 *  2. js/views.js → agrega función startSubmissionCountdown() y la
 *     llama desde renderActiveEventWidget() justo después de
 *     startEventCountdown().
 *  3. sw.js → bump CACHE_NAME.
 *  4. index.html → bump assets ?v=X.X.X.
 *
 * Preserva: startEventCountdown() intacto. Countdown de cierre del evento
 * sigue funcionando como antes.
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);

const FILES = {
  dashboard: path.join(ROOT, 'components', 'dashboard.html'),
  views:     path.join(ROOT, 'js', 'views.js'),
  sw:        path.join(ROOT, 'sw.js'),
  index:     path.join(ROOT, 'index.html'),
};

const C = {
  reset: '\x1b[0m', cyan: '\x1b[36m', green: '\x1b[32m',
  yellow: '\x1b[33m', red: '\x1b[31m', magenta: '\x1b[35m',
};

function log(msg, color = C.reset) { console.log(`${color}${msg}${C.reset}`); }
function readFile(p) { return fs.readFileSync(p, 'utf8'); }
function writeFile(p, content) { fs.writeFileSync(p, content, 'utf8'); }
function fileExists(p) { return fs.existsSync(p); }

log('\n═══════════════════════════════════════════════════════════', C.magenta);
log('  FIX COUNTDOWN v2 — HALL-066', C.magenta);
log('  (AGREGA ventana de carga · NO reemplaza countdown existente)', C.magenta);
log('═══════════════════════════════════════════════════════════\n', C.magenta);

// ────────────────────────────────────────────────────────────
// PASO 1: Verificar
// ────────────────────────────────────────────────────────────
log('▸ PASO 1: Verificando archivos...', C.cyan);
for (const [key, p] of Object.entries(FILES)) {
  if (!fileExists(p)) {
    log(`  ❌ No existe: ${p}`, C.red);
    process.exit(1);
  }
  log(`  ✅ ${path.relative(ROOT, p)}`, C.green);
}

// ────────────────────────────────────────────────────────────
// PASO 2: Backups
// ────────────────────────────────────────────────────────────
log('\n▸ PASO 2: Backups...', C.cyan);
for (const [key, p] of Object.entries(FILES)) {
  const bk = `${p}.bak-countdown-${TIMESTAMP}`;
  fs.copyFileSync(p, bk);
  log(`  ✅ ${path.basename(bk)}`, C.green);
}

// ────────────────────────────────────────────────────────────
// PASO 3: components/dashboard.html
// ────────────────────────────────────────────────────────────
log('\n▸ PASO 3: components/dashboard.html...', C.cyan);
{
  const p = FILES.dashboard;
  let content = readFile(p);
  let changed = 0;

  // 3.1 — Renombrar "Tiempo restante" → "Cierre del evento"
  const oldLabel = '<div style="font-size:0.72rem;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">\n          Tiempo restante\n        </div>';
  const newLabel = '<div style="font-size:0.72rem;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">\n          Cierre del evento\n        </div>';

  if (content.includes('Cierre del evento</div>') || content.includes('Cierre del evento\n')) {
    log('  ⚠️  Label ya renombrado a "Cierre del evento".', C.yellow);
  } else if (content.includes(oldLabel)) {
    content = content.replace(oldLabel, newLabel);
    changed++;
    log('  ✅ Label "Tiempo restante" → "Cierre del evento"', C.green);
  } else {
    // Fallback: reemplazo simple por si los saltos de línea no matchean
    const oldSimple = 'Tiempo restante';
    if (content.includes(oldSimple)) {
      content = content.replace(oldSimple, 'Cierre del evento');
      changed++;
      log('  ✅ Label renombrado (fallback simple)', C.green);
    } else {
      log('  ❌ No se encontró el label "Tiempo restante"', C.red);
    }
  }

  // 3.2 — Insertar bloque "Ventana de carga" antes del botón aeCta
  if (content.includes('id="aeSubmissionBlock"')) {
    log('  ⚠️  El bloque aeSubmissionBlock ya existe.', C.yellow);
  } else {
    const submissionBlock = `
        <!-- HALL-066: Bloque de ventana de carga (ADR-008) -->
        <div id="aeSubmissionBlock" style="display:none;margin-top:10px;padding-top:10px;border-top:1px solid rgba(148,163,184,0.15);">
          <div style="display:flex;align-items:center;justify-content:flex-end;gap:5px;font-size:0.72rem;color:#2ecc71;text-transform:uppercase;letter-spacing:0.5px;">
            <i data-lucide="clock" style="width:12px;height:12px;"></i>
            <span>Ventana de carga</span>
          </div>
          <div id="aeSubmissionCountdown" style="font-size:1.35rem;font-weight:700;color:#2ecc71;font-variant-numeric:tabular-nums;font-family:'JetBrains Mono',monospace;margin:4px 0;">
            --:--:--
          </div>
          <div id="aeSubmissionMeta" style="font-size:0.72rem;color:#94a3b8;line-height:1.4;"></div>
        </div>
        `;

    // Buscar el botón aeCta y meter el bloque antes
    const ctaMarker = '<button id="aeCta"';
    const idx = content.indexOf(ctaMarker);
    if (idx === -1) {
      log('  ❌ No se encontró el marcador <button id="aeCta"', C.red);
    } else {
      content = content.slice(0, idx) + submissionBlock.trim() + '\n        ' + content.slice(idx);
      changed++;
      log('  ✅ Bloque "aeSubmissionBlock" insertado antes del botón aeCta', C.green);
    }
  }

  if (changed > 0) {
    writeFile(p, content);
  } else {
    log('  ⚠️  No se aplicó ningún cambio en dashboard.html.', C.yellow);
  }
}

// ────────────────────────────────────────────────────────────
// PASO 4: js/views.js
// ────────────────────────────────────────────────────────────
log('\n▸ PASO 4: js/views.js...', C.cyan);
{
  const p = FILES.views;
  let content = readFile(p);
  let changed = 0;

  // 4.1 — Insertar llamada startSubmissionCountdown(event) justo después de startEventCountdown(event.end_date);
  const callMarker = 'startEventCountdown(event.end_date);';
  const callNew = `startEventCountdown(event.end_date);

    // HALL-066: countdown paralelo para la ventana de carga de tokens (ADR-008)
    startSubmissionCountdown(event);`;

  if (content.includes('startSubmissionCountdown(event);')) {
    log('  ⚠️  La llamada a startSubmissionCountdown(event) ya existe.', C.yellow);
  } else if (content.includes(callMarker)) {
    content = content.replace(callMarker, callNew);
    changed++;
    log('  ✅ Llamada a startSubmissionCountdown() insertada', C.green);
  } else {
    log('  ❌ No se encontró "startEventCountdown(event.end_date);"', C.red);
  }

  // 4.2 — Insertar definición de startSubmissionCountdown() después del cierre de startEventCountdown()
  if (content.includes('function startSubmissionCountdown(')) {
    log('  ⚠️  La función startSubmissionCountdown ya está definida.', C.yellow);
  } else {
    const fnDef = `

/**
 * HALL-066 — Countdown paralelo para la ventana de carga de tokens.
 * Usa event.submission_closes_at (ADR-008). Aditivo, no toca startEventCountdown.
 * Si submission_closes_at no viene, oculta el bloque y no hace nada.
 */
function startSubmissionCountdown(event) {
  const block = document.getElementById('aeSubmissionBlock');
  const countdownEl = document.getElementById('aeSubmissionCountdown');
  const metaEl = document.getElementById('aeSubmissionMeta');
  if (!block || !countdownEl) return;

  if (window._aeSubmissionInterval) {
    clearInterval(window._aeSubmissionInterval);
    window._aeSubmissionInterval = null;
  }

  const closesAtIso = event && event.submission_closes_at ? event.submission_closes_at : null;
  if (!closesAtIso) {
    block.style.display = 'none';
    return;
  }

  const closesMs = new Date(closesAtIso).getTime();
  if (isNaN(closesMs)) {
    block.style.display = 'none';
    return;
  }

  block.style.display = 'block';

  if (metaEl) {
    const closesDate = new Date(closesMs);
    const opts = {
      weekday: 'long', day: 'numeric', month: 'short',
      hour: '2-digit', minute: '2-digit', timeZone: TZ_PY
    };
    metaEl.textContent = 'Hasta ' + closesDate.toLocaleDateString(undefined, opts) + ' (PY)';
  }

  function tick() {
    const rem = Math.max(0, closesMs - Date.now());
    const d = Math.floor(rem / 86400000);
    const h = Math.floor((rem % 86400000) / 3600000);
    const m = Math.floor((rem % 3600000) / 60000);
    const s = Math.floor((rem % 60000) / 1000);
    const pad = n => String(n).padStart(2, '0');

    // > 1 día: formato largo (3d 14h 22m) · < 1 día: formato HH:MM:SS
    countdownEl.textContent = d > 0
      ? d + 'd ' + pad(h) + 'h ' + pad(m) + 'm'
      : pad(h) + ':' + pad(m) + ':' + pad(s);

    if (rem <= 0) {
      clearInterval(window._aeSubmissionInterval);
      window._aeSubmissionInterval = null;
    }
  }
  tick();
  window._aeSubmissionInterval = setInterval(tick, 1000);

  // Refrescar iconos Lucide del bloque nuevo
  if (typeof refreshLucideIcons === 'function') {
    setTimeout(refreshLucideIcons, 30);
  }
}
window.startSubmissionCountdown = startSubmissionCountdown;
`;

    // Buscar el cierre exacto de startEventCountdown: la línea con setInterval(tick, 1000);\n} seguida de \nwindow.renderActiveEventWidget
    const insertMarker = "  window._aeCountdownInterval = setInterval(tick, 1000);\n}\n\nwindow.renderActiveEventWidget = renderActiveEventWidget;";
    if (content.includes(insertMarker)) {
      const replacement = "  window._aeCountdownInterval = setInterval(tick, 1000);\n}\n" + fnDef + "\nwindow.renderActiveEventWidget = renderActiveEventWidget;";
      content = content.replace(insertMarker, replacement);
      changed++;
      log('  ✅ Función startSubmissionCountdown() insertada', C.green);
    } else {
      log('  ❌ No se encontró el marcador de cierre de startEventCountdown()', C.red);
      log('     Buscando alternativa...', C.yellow);

      // Fallback: buscar "window.renderActiveEventWidget = renderActiveEventWidget;"
      const altMarker = 'window.renderActiveEventWidget = renderActiveEventWidget;';
      if (content.includes(altMarker)) {
        content = content.replace(altMarker, fnDef.trim() + '\n\n' + altMarker);
        changed++;
        log('  ✅ Función insertada (fallback)', C.green);
      } else {
        log('  ❌ Tampoco se encontró el marcador alternativo', C.red);
      }
    }
  }

  if (changed > 0) {
    writeFile(p, content);
  }
}

// ────────────────────────────────────────────────────────────
// PASO 5: sw.js
// ────────────────────────────────────────────────────────────
log('\n▸ PASO 5: sw.js...', C.cyan);
{
  const p = FILES.sw;
  let content = readFile(p);
  const match = content.match(/const CACHE_NAME = ['"`]PARAGUAY-FFAA-METALSTORM-(v[\d.]+)['"`]/);
  if (!match) {
    log('  ⚠️  No se encontró CACHE_NAME con el formato esperado.', C.yellow);
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

// ────────────────────────────────────────────────────────────
// PASO 6: index.html
// ────────────────────────────────────────────────────────────
log('\n▸ PASO 6: index.html...', C.cyan);
{
  const p = FILES.index;
  let content = readFile(p);
  const versions = new Set();
  const regex = /\?v=(\d+\.\d+\.\d+)/g;
  let m;
  while ((m = regex.exec(content)) !== null) versions.add(m[1]);

  if (versions.size === 0) {
    log('  ⚠️  No se encontraron assets con ?v=X.X.X.', C.yellow);
  } else {
    const versionsArray = Array.from(versions).sort();
    const latest = versionsArray[versionsArray.length - 1];
    const parts = latest.split('.').map(n => parseInt(n, 10));
    parts[2] = (parts[2] || 0) + 1;
    const newVersion = parts.join('.');
    content = content.replace(/\?v=\d+\.\d+\.\d+/g, `?v=${newVersion}`);
    writeFile(p, content);
    log(`  ✅ Assets: ${latest} → ${newVersion}`, C.green);
  }
}

// ────────────────────────────────────────────────────────────
// VERIFICACIÓN
// ────────────────────────────────────────────────────────────
log('\n═══════════════════════════════════════════════════════════', C.magenta);
log('  VERIFICACIÓN', C.magenta);
log('═══════════════════════════════════════════════════════════\n', C.magenta);

const dashFinal = readFile(FILES.dashboard);
const viewsFinal = readFile(FILES.views);

const checks = [
  ['dashboard.html — label "Cierre del evento"', dashFinal.includes('Cierre del evento')],
  ['dashboard.html — bloque aeSubmissionBlock',  dashFinal.includes('id="aeSubmissionBlock"')],
  ['dashboard.html — countdown aeSubmissionCountdown', dashFinal.includes('id="aeSubmissionCountdown"')],
  ['views.js — función startSubmissionCountdown', viewsFinal.includes('function startSubmissionCountdown(')],
  ['views.js — llamada startSubmissionCountdown(event)', viewsFinal.includes('startSubmissionCountdown(event);')],
  ['views.js — startEventCountdown intacto',      viewsFinal.includes("startEventCountdown(event.end_date);")],
  ['views.js — uso de submission_closes_at',      viewsFinal.includes('event.submission_closes_at')],
];

let allOk = true;
for (const [label, ok] of checks) {
  if (ok) {
    log(`  ✅ ${label}`, C.green);
  } else {
    log(`  ❌ ${label}`, C.red);
    allOk = false;
  }
}

log('\n═══════════════════════════════════════════════════════════', C.magenta);
if (allOk) {
  log('  ✅ FIX APLICADO CORRECTAMENTE', C.green);
} else {
  log('  ⚠️  ALGUNOS CHECKS FALLARON — revisar git diff', C.yellow);
}
log('═══════════════════════════════════════════════════════════\n', C.magenta);

log('Próximos pasos:', C.yellow);
log('  git diff components/dashboard.html', C.reset);
log('  git diff js/views.js', C.reset);
log('  git add components/dashboard.html js/views.js sw.js index.html', C.reset);
log('  git commit -m "feat(hall-066): agregar countdown ventana de carga"', C.reset);
log('  git push origin main', C.reset);
log('  fly deploy', C.reset);
log('');
log('Después del deploy, smoke test:', C.yellow);
log('  curl https://paraguay-ffaa-metalstorm.fly.dev/health', C.reset);
log('');