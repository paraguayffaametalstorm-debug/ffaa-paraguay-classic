#!/usr/bin/env node
/**
 * sprint0-grupoC-bm-legacy.cjs (v3 - final)
 * Grupo C — BM legacy (FIX-003, FIX-008, FIX-010).
 * Estrategia: regex ancladas en el contenido único de cada línea.
 * Fecha: 2026-09-20 | NO COMMITEA. Backups con timestamp.
 */

const fs = require('fs');
const path = require('path');

if (!fs.existsSync(path.join(process.cwd(), 'package.json'))) {
  console.error('❌ No estás en la raíz del repo (falta package.json).');
  process.exit(1);
}

function log(m) { console.log(m); }
function timestamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}
function readFileSafe(p) { return fs.readFileSync(p, 'utf8'); }
function writeFileSafe(p, c) { fs.writeFileSync(p, c, 'utf8'); }
function backup(p) {
  const ts = timestamp();
  const ext = path.extname(p);
  const base = p.slice(0, -ext.length);
  const dest = `${base}.bak-${ts}${ext}`;
  fs.copyFileSync(p, dest);
  log(`    📦 Backup: ${dest}`);
}

const cambios = [];

/**
 * Reemplazo por regex (1 match esperado).
 */
function reemplazarRegex(archivo, regex, reemplazo, etiqueta) {
  log(`\n📄 ${archivo}`);
  log(`    Cambio: ${etiqueta}`);
  if (!fs.existsSync(archivo)) {
    log(`    ⚠️  Archivo no existe. Saltando.`);
    return false;
  }
  let c = readFileSafe(archivo);
  const matches = c.match(new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : regex.flags + 'g'));
  const n = matches ? matches.length : 0;
  if (n === 0) {
    log(`    ⚠️  Patrón NO encontrado. REVISAR MANUALMENTE.`);
    log(`        Regex: ${regex}`);
    return false;
  }
  if (n > 1) {
    log(`    ⚠️  ${n} coincidencias. Esperaba 1. ABORTANDO.`);
    return false;
  }
  c = c.replace(regex, reemplazo);
  backup(archivo);
  writeFileSafe(archivo, c);
  log(`    ✅ Reemplazado (1 ocurrencia).`);
  cambios.push({ archivo, etiqueta });
  return true;
}

function marcarCompletado(contenido, fixId, descripcion, commit) {
  const m = contenido.match(/## 8\. ✅ COMPLETADOS[\s\S]*?(?=\n## )/);
  if (!m) {
    log(`    ⚠️  No se encontró la sección "## 8. ✅ COMPLETADOS".`);
    return contenido;
  }
  const seccion = m[0];
  if (seccion.includes(`| **${fixId}** |`)) {
    log(`    ℹ️  ${fixId} ya presente en COMPLETADOS. No se agrega.`);
    return contenido;
  }
  const fila = `| **${fixId}** | ${descripcion} | 2026-09-20 | \`${commit}\` |`;
  const tablaFin = seccion.lastIndexOf('|');
  const lineaFin = seccion.indexOf('\n', tablaFin);
  const nuevaSeccion = seccion.slice(0, lineaFin) + '\n' + fila + seccion.slice(lineaFin);
  contenido = contenido.replace(seccion, nuevaSeccion);
  log(`    ➕ ${fixId} agregado a COMPLETADOS.`);
  return contenido;
}

// ============================================================
// 1. README.md — FIX-003
// ============================================================

// 1a. Eliminar la línea de bm.controller.js (anclada en "bm.controller.js ... # Eventos Black Market")
reemplazarRegex(
  'README.md',
  /^.*bm\.controller\.js\s+#\s+Eventos Black Market[^\n]*\n/m,
  '',
  'FIX-003a: eliminar bm.controller.js del árbol'
);

// 1b. Insertar events-v2.controller.js y events-v2-bm.controller.js después de events.controller.js
if (fs.existsSync('README.md')) {
  let c = readFileSafe('README.md');
  if (c.includes('events-v2.controller.js') && c.includes('events-v2-bm.controller.js')) {
    log('\n📄 README.md');
    log('    ℹ️  events-v2.controller.js y events-v2-bm.controller.js ya presentes. No se agregan.');
  } else {
    // Capturamos la línea completa de events.controller.js (incluyendo prefijo y \n)
    const regexEventsV1 = /^.*events\.controller\.js\s+#\s+Ventanas operativas[^\n]*\n/m;
    const m = c.match(regexEventsV1);
    if (!m) {
      log('\n📄 README.md');
      log('    ⚠️  No se encontró la línea de events.controller.js. NO se agregaron los v2.');
    } else {
      const lineaOriginal = m[0];
      // Detectar el prefijo (todo lo que va antes de "events.controller.js")
      const prefijoMatch = lineaOriginal.match(/^(.*?)events\.controller\.js/);
      const prefijo = prefijoMatch ? prefijoMatch[1] : '    │   ├── ';

      const lineaV2 = `${prefijo}events-v2.controller.js   # Módulo unificado de eventos SQ/BM (F3.1)\n`;
      const lineaV2Bm = `${prefijo}events-v2-bm.controller.js# Submódulo BM del rediseño de eventos (F3.2)\n`;

      c = c.replace(regexEventsV1, lineaOriginal + lineaV2 + lineaV2Bm);
      backup('README.md');
      writeFileSafe('README.md', c);
      log('\n📄 README.md');
      log(`    ✅ Agregadas events-v2.controller.js y events-v2-bm.controller.js (prefijo detectado: ${JSON.stringify(prefijo)})`);
      cambios.push({ archivo: 'README.md', etiqueta: 'agregar controllers v2 al árbol' });
    }
  }
}

// ============================================================
// 2. API_REFERENCE.md — FIX-008 (banner)
// ============================================================
const regexAnclaBm = /^###\s+`GET \/api\/bm\/events`\s*$/m;
const bannerEliminado =
  '> ⚠️ **ELIMINADO en v4.3.0 (sunset 2026-12-16).** Estos endpoints fueron reemplazados por el submódulo unificado `/api/events-v2/bm/*` (ver sección superior). El contenido a continuación se conserva como referencia histórica para migración.\n\n';

if (fs.existsSync('API_REFERENCE.md')) {
  let c = readFileSafe('API_REFERENCE.md');
  if (c.includes('ELIMINADO en v4.3.0 (sunset 2026-12-16)')) {
    log('\n📄 API_REFERENCE.md');
    log('    ℹ️  Banner ya presente. No se agrega.');
  } else {
    const m = c.match(regexAnclaBm);
    if (m) {
      c = c.replace(regexAnclaBm, bannerEliminado + m[0]);
      backup('API_REFERENCE.md');
      writeFileSafe('API_REFERENCE.md', c);
      log('\n📄 API_REFERENCE.md');
      log('    ✅ Banner ELIMINADO insertado antes de "### GET /api/bm/events"');
      cambios.push({ archivo: 'API_REFERENCE.md', etiqueta: 'banner ELIMINADO en sección legacy' });
    } else {
      log('\n📄 API_REFERENCE.md');
      log('    ⚠️  No se encontró la línea "### `GET /api/bm/events`". REVISAR MANUALMENTE.');
    }
  }
}

// ============================================================
// 3. ARCHITECTURE.md — FIX-010
// ============================================================
reemplazarRegex(
  'ARCHITECTURE.md',
  /`\/api\/events\/\*` \(5 endpoints\) y `\/api\/bm\/\*` \(15 endpoints\) siguen operativos pero \*\*deprecados\*\*/,
  '`/api/events/*` (5 endpoints) y `/api/bm/*` (15 endpoints) fueron **retirados** en v4.3.0 (F4.2.2-F). Sucesor: `/api/events-v2/*`. Sunset formal: **2026-12-16**',
  'FIX-010: reformular estado de endpoints legacy'
);

// ============================================================
// 4. PLAN_TRABAJO.md — marcar FIX-003, 008, 010 + métrica
// ============================================================
log('\n📄 PLAN_TRABAJO.md');
if (fs.existsSync('PLAN_TRABAJO.md')) {
  let c = readFileSafe('PLAN_TRABAJO.md');

  c = marcarCompletado(c, 'FIX-003', '`README.md` eliminar `bm.controller.js` del árbol + agregar v2', 'TBD');
  c = marcarCompletado(c, 'FIX-008', '`API_REFERENCE.md` banner ELIMINADO en sección legacy `/api/bm/*`', 'TBD');
  c = marcarCompletado(c, 'FIX-010', '`ARCHITECTURE.md` reformular estado endpoints legacy', 'TBD');

  const metricaVieja = '| Docs alineados con versión real | 7/10 |';
  const metricaNueva = '| Docs alineados con versión real | 9/10 |';
  if (c.includes(metricaVieja)) {
    c = c.replace(metricaVieja, metricaNueva);
    log('    ✅ Métrica Docs alineados: 7/10 → 9/10');
  } else {
    log('    ⚠️  No se encontró la métrica 7/10. REVISAR MANUALMENTE.');
  }

  backup('PLAN_TRABAJO.md');
  writeFileSafe('PLAN_TRABAJO.md', c);
  log('    💾 PLAN_TRABAJO.md actualizado.');
}

// ============================================================
// RESUMEN
// ============================================================
log('\n=== Resumen ===');
if (cambios.length === 0) {
  log('⚠️  No se aplicó ningún cambio de archivo.');
} else {
  for (const ch of cambios) log(`  • ${ch.archivo} — ${ch.etiqueta}`);
}

log('\n📌 Próximos pasos:');
log('   1. git --no-pager diff README.md API_REFERENCE.md ARCHITECTURE.md PLAN_TRABAJO.md');
log('   2. git add README.md API_REFERENCE.md ARCHITECTURE.md PLAN_TRABAJO.md');
log('   3. git commit -m "docs(sprint-0-grupoC): retirar BM legacy de README/API_REFERENCE/ARCHITECTURE"');
log('\n🚫 Este script NO commitea.');