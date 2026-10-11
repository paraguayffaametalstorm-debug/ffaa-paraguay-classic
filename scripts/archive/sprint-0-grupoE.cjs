/* ============================================================================
 * PARAGUAY-FFAA | METALSTORM
 * SPRINT 0 — GRUPO E: Timezone + duración SQ/ventana
 * ----------------------------------------------------------------------------
 * Fixes cubiertos: FIX-006, FIX-021, FIX-022
 *
 * Decisiones del OWNER (2026-09-20):
 *   - Timezone oficial: UTC-3 fijo (Paraguay sin DST desde oct 2024, Ley 7141/2024).
 *   - Evento SQ: 4 días (jue 09:00 PY → lun 08:59 PY).
 *   - Ventana de carga SQ: 7 días (ADR-008). Evento y ventana son conceptos
 *     separados y NO deben mezclarse en la documentación.
 *
 * Reglas:
 *   - NO commitea.
 *   - Backups automáticos *.bak-<timestamp> (ya cubiertos por .gitignore).
 *   - Un backup por archivo por corrida.
 * ==========================================================================*/

'use strict';

const fs = require('fs');
const path = require('path');

// ---------- Verificación de raíz ----------
const ROOT = process.cwd();
if (!fs.existsSync(path.join(ROOT, 'package.json'))) {
  console.error('❌ No estás en la raíz del repo (falta package.json).');
  process.exit(1);
}

// ---------- Constantes ----------
const F = '```'; // fence helper
const TS = new Date().toISOString().replace(/[:.]/g, '-');
const backupsHechos = new Set();

// ---------- Helpers ----------
function log(msg) { console.log(msg); }
function logOK(msg) { console.log(`  ✅ ${msg}`); }
function logWarn(msg) { console.warn(`  ⚠️  ${msg}`); }
function logErr(msg) { console.error(`  ❌ ${msg}`); }

function readFileSafe(rel) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) {
    logErr(`No existe: ${rel}`);
    return null;
  }
  return fs.readFileSync(abs, 'utf8');
}

function backup(rel) {
  if (backupsHechos.has(rel)) return;
  const abs = path.join(ROOT, rel);
  const bak = `${abs}.bak-${TS}`;
  fs.copyFileSync(abs, bak);
  backupsHechos.add(rel);
  logWarn(`Backup: ${rel} → ${path.basename(bak)}`);
}

function writeFileSafe(rel, content) {
  backup(rel);
  fs.writeFileSync(path.join(ROOT, rel), content, 'utf8');
}

/**
 * Reemplaza `buscar` por `reemplazar` en `content`.
 * @returns {{ content: string, hits: number }}
 */
function replaceAll(content, buscar, reemplazar) {
  if (typeof buscar === 'string') {
    const partes = content.split(buscar);
    const hits = partes.length - 1;
    return { content: partes.join(reemplazar), hits };
  }
  // RegExp
  const matches = content.match(buscar);
  const hits = matches ? matches.length : 0;
  return { content: content.replace(buscar, reemplazar), hits };
}

// ============================================================================
// FIX-006 / FIX-021 — TIMEZONE
// ============================================================================

/**
 * Corrige CURRENT_STATE.md:
 *   - L52/53: reemplaza bloque "America/Asuncion dinámico Intl" por UTC-3 fijo.
 *   - Agrega línea de duración evento vs ventana.
 */
function fixCurrentStateTimezone() {
  log('\n📝 [FIX-006/021] CURRENT_STATE.md — timezone + duración');

  const rel = 'CURRENT_STATE.md';
  let c = readFileSafe(rel);
  if (!c) return false;

  // Bloque a reemplazar (L52-53 en el archivo original)
  const bloqueViejo =
    '- Timezone: `America/Asuncion` (UTC-4 en verano, UTC-3 en invierno).\n' +
    '- Cálculo del offset dinámico vía `Intl.DateTimeFormat`.';

  const bloqueNuevo =
    '- Timezone: **UTC-3 fijo** todo el año (`PY_OFFSET_HOURS = 3`). ' +
    'Paraguay sin DST desde octubre 2024 (Ley 7141/2024).\n' +
    '- Duración del **evento SQ**: 4 días (jue 09:00 PY → lun 08:59 PY).\n' +
    '- Duración de la **ventana de carga SQ**: 7 días (ADR-008). Evento y ventana son conceptos separados.';

  const r = replaceAll(c, bloqueViejo, bloqueNuevo);
  if (r.hits === 0) {
    logErr('No se encontró el bloque de timezone en CURRENT_STATE.md');
    return false;
  }
  writeFileSafe(rel, r.content);
  logOK(`CURRENT_STATE.md actualizado (${r.hits} reemplazo)`);
  return true;
}

/**
 * Corrige ADR-007:
 *   - L41: "lunes 09:00 PY" → "lunes 08:59 PY (evento: 4 días)"
 *   - L49: "jueves 00:00 UTC" → "jueves 12:00 UTC"
 *   - L53/54: elimina mención DST + Intl, deja UTC-3 fijo
 *   - L55: aclara evento 4d vs ventana 7d
 */
function fixADR007Timezone() {
  log('\n📝 [FIX-006/021] ADR-007 — timezone + duración');

  const rel = 'docs/adr/ADR-007-rediseno-eventos-v2.md';
  let c = readFileSafe(rel);
  if (!c) return false;

  let totalHits = 0;

  // L41
  {
    const viejo = '- `SQUADRON`: Evento semanal (jueves 09:00 PY - lunes 09:00 PY).';
    const nuevo = '- `SQUADRON`: Evento semanal (jueves 09:00 PY - lunes 08:59 PY). Duración del evento: **4 días**.';
    const r = replaceAll(c, viejo, nuevo);
    if (r.hits === 0) logWarn('ADR-007 L41 no encontrado');
    else { c = r.content; totalHits += r.hits; logOK(`L41 corregido (${r.hits})`); }
  }

  // L49
  {
    const viejo = '- El scheduler auto-crea el próximo SQ el **jueves 00:00 UTC** (09:00 PY).';
    const nuevo = '- El scheduler auto-crea el próximo SQ el **jueves 12:00 UTC** (09:00 PY, UTC-3 fijo).';
    const r = replaceAll(c, viejo, nuevo);
    if (r.hits === 0) logWarn('ADR-007 L49 no encontrado');
    else { c = r.content; totalHits += r.hits; logOK(`L49 corregido (${r.hits})`); }
  }

  // L53-55: bloque completo
  {
    const viejo =
      '- Paraguay usa **UTC-4 en verano** (oct-mar) y **UTC-3 en invierno** (abr-sep).\n' +
      '- El scheduler calcula el offset dinámicamente vía `Intl.DateTimeFormat` con timezone `America/Asuncion`.\n' +
      '- Duración SQ: **+4 días** (jueves - lunes).';

    const nuevo =
      '- Paraguay usa **UTC-3 fijo todo el año** desde octubre 2024 (DST abolido por Ley 7141/2024).\n' +
      '- El scheduler usa la constante `PY_OFFSET_HOURS = 3` (UTC-3 fijo). No usa `Intl.DateTimeFormat`.\n' +
      '- **Duración del evento SQ:** 4 días (jueves 09:00 PY → lunes 08:59 PY).\n' +
      '- **Duración de la ventana de carga SQ:** 7 días (ADR-008). Evento y ventana son conceptos separados.';

    const r = replaceAll(c, viejo, nuevo);
    if (r.hits === 0) logErr('ADR-007 L53-55 (bloque timezone) no encontrado');
    else { c = r.content; totalHits += r.hits; logOK(`L53-55 corregido (${r.hits})`); }
  }

  if (totalHits === 0) return false;
  writeFileSafe(rel, c);
  return true;
}

// ============================================================================
// FIX-021 / FIX-022 — ARCHITECTURE.md
// ============================================================================

/**
 * Corrige ARCHITECTURE.md:
 *   - Header L3: v4.0.5 → v4.3.0
 *   - L154: "jueves 00:00 UTC" → "jueves 12:00 UTC"
 *   - §2.2c: inserta bloque timezone + duración
 *   - Footer L792: v4.0.5 → v4.3.0, fecha 20 sept
 */
function fixArchitecture() {
  log('\n📝 [FIX-006/021/022] ARCHITECTURE.md — versión + timezone + duración');

  const rel = 'ARCHITECTURE.md';
  let c = readFileSafe(rel);
  if (!c) return false;

  let totalHits = 0;

  // Header L3
  {
    const viejo = '(Versión v4.0.5).**';
    const nuevo = '(Versión v4.3.0).**';
    const r = replaceAll(c, viejo, nuevo);
    if (r.hits === 0) logWarn('ARCHITECTURE header v4.0.5 no encontrado');
    else { c = r.content; totalHits += r.hits; logOK(`Header corregido (${r.hits})`); }
  }

  // L154
  {
    const viejo = '- El scheduler auto-crea el próximo SQ el jueves 00:00 UTC.';
    const nuevo = '- El scheduler auto-crea el próximo SQ el jueves 12:00 UTC (09:00 PY, UTC-3 fijo).';
    const r = replaceAll(c, viejo, nuevo);
    if (r.hits === 0) logWarn('ARCHITECTURE L154 no encontrado');
    else { c = r.content; totalHits += r.hits; logOK(`L154 corregido (${r.hits})`); }
  }

  // §2.2c — insertar bloque después de "- **Backfill:** deshabilitado (decisión F2.9: no inventar datos)."
  {
    const ancla = '- **Backfill:** deshabilitado (decisión F2.9: no inventar datos).';
    const bloque =
      '\n- **Timezone:** UTC-3 fijo (`PY_OFFSET_HOURS = 3`). Paraguay sin DST desde octubre 2024 (Ley 7141/2024).\n' +
      '- **Duración:** evento SQ = 4 días (jue 09:00 PY → lun 08:59 PY); ventana de carga SQ = 7 días (ADR-008). Conceptos separados.';
    if (!c.includes(ancla)) {
      logWarn('ARCHITECTURE §2.2c ancla de Backfill no encontrada');
    } else if (c.includes('PY_OFFSET_HOURS = 3`. Paraguay sin DST')) {
      logWarn('ARCHITECTURE §2.2c ya tiene el bloque timezone');
    } else {
      c = c.replace(ancla, ancla + bloque);
      totalHits++;
      logOK('§2.2c bloque timezone + duración insertado');
    }
  }

  // Footer L792
  {
    const viejo = '*Versión: v4.0.5 · Actualizado: 18 Septiembre 2026*';
    const nuevo = '*Versión: v4.3.0 · Actualizado: 20 Septiembre 2026*';
    const r = replaceAll(c, viejo, nuevo);
    if (r.hits === 0) logWarn('ARCHITECTURE footer v4.0.5 no encontrado');
    else { c = r.content; totalHits += r.hits; logOK(`Footer corregido (${r.hits})`); }
  }

  if (totalHits === 0) return false;
  writeFileSafe(rel, c);
  return true;
}

// ============================================================================
// CHANGELOG — nueva entrada [4.3.1-docs]
// ============================================================================

function addChangelogEntry() {
  log('\n📝 [FIX-006/021/022] CHANGELOG.md — entrada [4.3.1-docs]');

  const rel = 'CHANGELOG.md';
  let c = readFileSafe(rel);
  if (!c) return false;

  if (c.includes('[4.3.1-docs]')) {
    logWarn('CHANGELOG ya tiene entrada [4.3.1-docs]');
    return true;
  }

  const ancla = '## 📌 [4.3.0] - 2026-09-20';
  if (!c.includes(ancla)) {
    logErr('CHANGELOG ancla [4.3.0] no encontrada');
    return false;
  }

  const entrada =
    '## 📌 [4.3.1-docs] - 2026-09-20\n' +
    '\n' +
    '### 📚 Sincronización Documental — Timezone + Duración SQ (Sprint 0 · Grupo E)\n' +
    '\n' +
    '> **Solo documentación. Cero cambios de código. Cero cambios de runtime.**\n' +
    '> **El runtime sigue siendo v4.3.0.** El badge del README y `sw.js` no se modifican.\n' +
    '\n' +
    '#### Objetivo Cumplido\n' +
    '\n' +
    'Alinear la documentación con el código real del scheduler (`src/utils/eventScheduler.js`) tras el fix HALL-065 v2 (v4.1.1). Tres fixes del Sprint 0:\n' +
    '\n' +
    '- **FIX-006:** Documentos afirmaban "timezone dinámico con `Intl.DateTimeFormat`" cuando el código usa `PY_OFFSET_HOURS = 3` hardcodeado.\n' +
    '- **FIX-021:** Decisión oficial de timezone y propagación a todos los documentos.\n' +
    '- **FIX-022:** Decisión oficial de duración SQ (evento vs ventana de carga) y propagación.\n' +
    '\n' +
    '#### Decisiones del OWNER (2026-09-20)\n' +
    '\n' +
    '| Concepto | Valor oficial | Fundamento |\n' +
    '|---|---|---|\n' +
    '| **Timezone oficial** | UTC-3 fijo (`PY_OFFSET_HOURS = 3`) | Paraguay sin DST desde octubre 2024 (Ley 7141/2024). Coincide con el código real. |\n' +
    '| **Duración evento SQ** | 4 días (jue 09:00 PY → lun 08:59 PY) | Ciclo competitivo semanal. |\n' +
    '| **Duración ventana de carga SQ** | 7 días (jue 09:00 PY → jue 08:59 PY) | ADR-008. Desacoplada del evento. |\n' +
    '\n' +
    '> **Nota clave:** "Evento SQ" y "ventana de carga SQ" son conceptos **distintos** (4d vs 7d). La documentación previa los mezclaba.\n' +
    '\n' +
    '#### Archivos Modificados\n' +
    '\n' +
    '| Archivo | Cambio |\n' +
    '|---|---|\n' +
    '| `CURRENT_STATE.md` | L52-53: reemplazado bloque "America/Asuncion dinámico Intl" por UTC-3 fijo + duraciones evento/ventana. |\n' +
    '| `ARCHITECTURE.md` | Header v4.0.5 → v4.3.0; L154 "jueves 00:00 UTC" → "jueves 12:00 UTC"; §2.2c bloque timezone + duración; footer v4.3.0. |\n' +
    '| `docs/adr/ADR-007-rediseno-eventos-v2.md` | §2.1 (duración evento), §2.2 (jue 12:00 UTC), §2.3 (UTC-3 fijo, sin Intl, evento 4d + ventana 7d). |\n' +
    '| `PLAN_TRABAJO.md` | Sección 1 (commit HEAD, versión, duraciones, ADRs); FIX-006/021/022 movidos a Completados. |\n' +
    '\n' +
    '#### Archivos NO Modificados\n' +
    '\n' +
    '- `README.md` — badge sigue en v4.3.0.\n' +
    '- `sw.js` — `CACHE_NAME` sigue en v4.3.0 (no hay assets cacheados nuevos).\n' +
    '- `src/utils/eventScheduler.js` — código ya correcto.\n' +
    '- `src/utils/submissionWindow.js` — código ya correcto.\n' +
    '\n' +
    '#### Verificación\n' +
    '\n' +
    '- ✅ Tests: 167/167 passing (sin cambios, Vitest 5.0.1).\n' +
    '- ✅ Contradicciones sobre timezone eliminadas de docs.\n' +
    '- ✅ Duración evento SQ (4d) y ventana SQ (7d) diferenciadas explícitamente.\n' +
    '\n' +
    '---\n' +
    '\n';

  c = c.replace(ancla, entrada + ancla);
  writeFileSafe(rel, c);
  logOK('Entrada [4.3.1-docs] insertada');
  return true;
}

// ============================================================================
// PLAN_TRABAJO.md — Sección 1 + Completados
// ============================================================================

/**
 * Actualiza la tabla de la Sección 1 (Estado Actual de Referencia).
 */
function updatePlanTrabajoSeccion1() {
  log('\n📝 [FIX-006/021/022] PLAN_TRABAJO.md — Sección 1');

  const rel = 'PLAN_TRABAJO.md';
  let c = readFileSafe(rel);
  if (!c) return false;

  let totalHits = 0;

  // Commit HEAD
  {
    const viejo = '| **Commit HEAD** | `0d04571` (Sprint 0 Grupo A) |';
    const nuevo = '| **Commit HEAD** | `26e3bf4` (Sprint 0 Grupo D) |';
    const r = replaceAll(c, viejo, nuevo);
    if (r.hits === 0) logWarn('Sección 1: Commit HEAD no encontrado');
    else { c = r.content; totalHits += r.hits; logOK('Commit HEAD actualizado'); }
  }

  // Versión real (agregar sufijo -docs)
  {
    const viejo = '| **Versión real** | v4.3.0 (según `CHANGELOG.md`) |';
    const nuevo = '| **Versión real** | v4.3.0 runtime · v4.3.1-docs (documentación, Sprint 0) |';
    const r = replaceAll(c, viejo, nuevo);
    if (r.hits === 0) logWarn('Sección 1: Versión real no encontrada');
    else { c = r.content; totalHits += r.hits; logOK('Versión real actualizada'); }
  }

  // Fila Timezone scheduler — agregar duraciones después
  {
    const viejo = '| **Timezone scheduler** | UTC-3 hardcodeado (`PY_OFFSET_HOURS = 3`) |';
    const nuevo =
      '| **Timezone scheduler** | UTC-3 fijo (`PY_OFFSET_HOURS = 3`, Paraguay sin DST desde oct-2024) |\n' +
      '| **Duración evento SQ** | 4 días (jue 09:00 PY → lun 08:59 PY) |\n' +
      '| **Duración ventana SQ** | 7 días (ADR-008) |\n' +
      '| **Duración evento BM** | 5 días (mié → dom) |\n' +
      '| **Duración ventana BM** | 6 días (ADR-008) |';
    const r = replaceAll(c, viejo, nuevo);
    if (r.hits === 0) logWarn('Sección 1: Timezone scheduler no encontrado');
    else { c = r.content; totalHits += r.hits; logOK('Filas de duración agregadas'); }
  }

  // ADRs cerrados
  {
    const viejo = '| **ADR cerrados** | ADR-006, ADR-007, ADR-008 |';
    const nuevo = '| **ADR cerrados** | ADR-001 a ADR-005 (Sprint 0 Grupo D) + ADR-006, ADR-007, ADR-008 |';
    const r = replaceAll(c, viejo, nuevo);
    if (r.hits === 0) logWarn('Sección 1: ADR cerrados no encontrado');
    else { c = r.content; totalHits += r.hits; logOK('ADR cerrados actualizados'); }
  }

  if (totalHits === 0) return false;
  writeFileSafe(rel, c);
  return true;
}

/**
 * Mueve FIX-006, FIX-021, FIX-022 a la sección 8 (Completados).
 * Los elimina de la tabla del Sprint 0 y agrega filas en Completados.
 */
function markFixesCompleted() {
  log('\n📝 [FIX-006/021/022] PLAN_TRABAJO.md — marcar Completados');

  const rel = 'PLAN_TRABAJO.md';
  let c = readFileSafe(rel);
  if (!c) return false;

  // 1) Eliminar filas de la tabla de Sprint 0
  const filasEliminar = [
    /^\| \*\*FIX-006\*\*.*\n/m,
    /^\| \*\*FIX-021\*\*.*\n/m,
    /^\| \*\*FIX-022\*\*.*\n/m
  ];

  let eliminadas = 0;
  for (const re of filasEliminar) {
    const antes = c.length;
    c = c.replace(re, '');
    if (c.length < antes) eliminadas++;
  }
  logOK(`Filas eliminadas de Sprint 0: ${eliminadas}/3`);

  // 2) Insertar en sección 8 (Completados)
  const ancla = '| **FIX-013** | 5 ADRs creados (001-005) en formato MADR 4.0 + TEMPLATE | 2026-09-20 | `079889f` |';
  if (!c.includes(ancla)) {
    logErr('PLAN_TRABAJO: ancla FIX-013 (Completados) no encontrada');
    return false;
  }

  const nuevasFilas =
    '\n' +
    '| **FIX-006** | Timezone en docs: "Intl dinámico" → UTC-3 fijo (`PY_OFFSET_HOURS = 3`) | 2026-09-20 | _(pendiente)_ |\n' +
    '| **FIX-021** | Timezone oficial (UTC-3 fijo) propagado a CURRENT_STATE, ARCHITECTURE, ADR-007 | 2026-09-20 | _(pendiente)_ |\n' +
    '| **FIX-022** | Duración SQ: evento 4d vs ventana 7d diferenciadas en docs | 2026-09-20 | _(pendiente)_ |';

  c = c.replace(ancla, ancla + nuevasFilas);
  writeFileSafe(rel, c);
  logOK('Filas agregadas a Completados');
  return true;
}

// ============================================================================
// MAIN
// ============================================================================

function main() {
  log('╔══════════════════════════════════════════════════════════════╗');
  log('║  SPRINT 0 — GRUPO E: Timezone + Duración SQ/BM               ║');
  log('║  Fixes: FIX-006, FIX-021, FIX-022                            ║');
  log('╚══════════════════════════════════════════════════════════════╝');
  log(`Raíz: ${ROOT}`);
  log(`Timestamp backups: ${TS}`);

  const resultados = [];

  resultados.push(['CURRENT_STATE.md',        fixCurrentStateTimezone()]);
  resultados.push(['ADR-007',                 fixADR007Timezone()]);
  resultados.push(['ARCHITECTURE.md',         fixArchitecture()]);
  resultados.push(['CHANGELOG.md',            addChangelogEntry()]);
  resultados.push(['PLAN_TRABAJO Sección 1',  updatePlanTrabajoSeccion1()]);
  resultados.push(['PLAN_TRABAJO Completados', markFixesCompleted()]);

  log('\n════════════════════════════════════════════════════════════════');
  log('RESUMEN');
  log('════════════════════════════════════════════════════════════════');
  for (const [nombre, ok] of resultados) {
    log(`${ok ? '✅' : '❌'}  ${nombre}`);
  }

  log('\n📋 PRÓXIMOS PASOS (manual):');
  log('  1. Revisar el diff:  git diff');
  log('  2. Verificar backups:  dir *.bak-* /s');
  log('  3. Commit:');
  log('     git add CURRENT_STATE.md ARCHITECTURE.md CHANGELOG.md PLAN_TRABAJO.md docs/adr/ADR-007-rediseno-eventos-v2.md');
  log('     git commit -m "docs(sprint-0-grupoE): timezone UTC-3 fijo + duración SQ evento 4d / ventana 7d (FIX-006/021/022)"');
  log('  4. Push: git push origin main');
  log('\n  ⚠️  Después del commit, correr mini-commit para reemplazar _(pendiente)_');
  log('     por el hash real en la tabla de Completados.');
  log('');
}

main();