#!/usr/bin/env node
/**
 * sprint0-grupoA-plan.cjs
 * Actualiza PLAN_TRABAJO.md con los ítems cerrados del Grupo A del Sprint 0.
 * Fecha cierre: 2026-09-20 | Commit: f32ed11
 * NO COMMITEA. Solo modifica + backup con timestamp.
 */

const fs = require('fs');
const path = require('path');

// ---- Verificación de raíz del repo ----
if (!fs.existsSync(path.join(process.cwd(), 'package.json'))) {
  console.error('❌ No estás en la raíz del repo (falta package.json).');
  process.exit(1);
}

const TARGET = 'PLAN_TRABAJO.md';
if (!fs.existsSync(TARGET)) {
  console.error(`❌ No existe ${TARGET} en la raíz.`);
  process.exit(1);
}

// ---- Helpers ----
function log(msg) { console.log(msg); }

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
  log(`  📦 Backup: ${dest}`);
  return dest;
}

// ---- Estado de cambios ----
const cambios = [];
function registrarCambio(nombre, ocurrencias) {
  cambios.push({ nombre, ocurrencias });
}

// ---- Main ----
log('\n=== Sprint 0 — Grupo A: actualizar PLAN_TRABAJO.md ===\n');
log(`📄 Target: ${TARGET}`);
backup(TARGET);

let c = readFileSafe(TARGET);

// ============================================================
// 1) Reemplazar placeholder de sección 8 por tabla real
// ============================================================
const PLACEHOLDER_COMPLETADOS = '| _(vacío al inicio)_ | | | |';

const filasCompletados = [
  '| **FIX-001** | `README.md` badge v4.0.5 → v4.3.0 | 2026-09-20 | `f32ed11` |',
  '| **FIX-005** | `CURRENT_STATE.md` resumen v4.0.2 → v4.3.0 | 2026-09-20 | `f32ed11` |',
  '| **FIX-014** | `DEPLOYMENT_STATE.md` v4.0.5 → v4.3.0 | 2026-09-20 | `f32ed11` |',
  '| **FIX-015** | `DEPLOYMENT_GUIDE.md` v4.0.5 → v4.3.0 + cache invalidation | 2026-09-20 | `f32ed11` |',
  '| **FIX-017** | `PWA_SETUP.md` v4.0.5 → v4.3.0 + CACHE_NAME real | 2026-09-20 | `f32ed11` |',
  '| **FIX-026** | `sw.js` CACHE_NAME v4.2.5 → v4.3.0 (hallazgo nuevo) | 2026-09-20 | `f32ed11` |',
].join('\n');

if (c.includes(PLACEHOLDER_COMPLETADOS)) {
  c = c.replace(PLACEHOLDER_COMPLETADOS, filasCompletados);
  log('  ✅ Sección 8 (COMPLETADOS): placeholder reemplazado por 6 filas.');
  registrarCambio('Sección 8 — 6 filas de Grupo A', 1);
} else if (c.includes('FIX-001') && c.includes('FIX-026')) {
  log('  ℹ️  La sección 8 ya parece tener filas. No se toca.');
} else {
  log('  ⚠️  No se encontró el placeholder de la sección 8. REVISAR MANUALMENTE.');
}

// ============================================================
// 2) Agregar FIX-026 a la tabla del Sprint 0 (si no está)
// ============================================================
// Buscamos la fila de FIX-025 (última de la tabla) y agregamos FIX-026 después.
const FIX025_LINE = '| **FIX-025** | BAJA | `DEPLOYMENT_STATE.md` | Confirmar si `sql/032_drop_bm_legacy_tables.sql` se ejecutó | XS |';
const FIX026_LINE = '| **FIX-026** | ALTA | `sw.js` | `CACHE_NAME` decía v4.2.5, debía ser v4.3.0 (hallazgo nuevo) | XS |';

if (c.includes('**FIX-026**')) {
  log('  ℹ️  FIX-026 ya está en el documento. No se agrega de nuevo.');
} else if (c.includes(FIX025_LINE)) {
  c = c.replace(FIX025_LINE, FIX025_LINE + '\n' + FIX026_LINE);
  log('  ✅ Tabla Sprint 0: fila FIX-026 agregada después de FIX-025.');
  registrarCambio('Tabla Sprint 0 — fila FIX-026', 1);
} else {
  log('  ⚠️  No se encontró la fila de FIX-025. FIX-026 NO se agregó. REVISAR MANUALMENTE.');
}

// ============================================================
// 3) Actualizar métrica: "Docs alineados" Actual 4/10 → 6/10
// ============================================================
const METRICA_VIEJA = '| Docs alineados con versión real | 4/10 |';
const METRICA_NUEVA = '| Docs alineados con versión real | 6/10 |';

if (c.includes(METRICA_VIEJA)) {
  c = c.replace(METRICA_VIEJA, METRICA_NUEVA);
  log('  ✅ Métrica "Docs alineados" Actual: 4/10 → 6/10 (meta Sprint 0 queda en 10/10).');
  registrarCambio('Métrica Docs alineados 4/10 → 6/10', 1);
} else {
  log('  ⚠️  No se encontró la métrica "Docs alineados ... 4/10". REVISAR MANUALMENTE.');
}

// ============================================================
// Escribir
// ============================================================
writeFileSafe(TARGET, c);

log('\n=== Resumen ===');
if (cambios.length === 0) {
  log('⚠️  No se aplicó ningún cambio. Revisar el archivo manualmente.');
} else {
  for (const ch of cambios) {
    log(`  • ${ch.nombre} (${ch.ocurrencias})`);
  }
}

log('\n📌 Próximo paso: revisá el diff con:');
log(`   git diff ${TARGET}`);
log('\n📌 Si está OK, commiteá manualmente con:');
log(`   git add ${TARGET}`);
log(`   git commit -m "docs(sprint-0-grupoA): marcar FIX-001/005/014/015/017/026 como completados"`);
log('\n🚫 Este script NO commitea.');