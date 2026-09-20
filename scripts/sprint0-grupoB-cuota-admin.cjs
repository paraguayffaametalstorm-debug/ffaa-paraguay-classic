#!/usr/bin/env node
/**
 * sprint0-grupoB-cuota-admin.cjs
 * Grupo B — Cuota ADMIN 3 → 5.
 * Archivos: README.md, API_REFERENCE.md, CONTEXTO_PROYECTO.md, PLAN_TRABAJO.md
 * Fecha: 2026-09-20 | Commit Grupo A: f32ed11 (FIX-011 ya resuelto ahí)
 * NO COMMITEA. Backup con timestamp por archivo.
 */

const fs = require('fs');
const path = require('path');

// ---- Verificación de raíz del repo ----
if (!fs.existsSync(path.join(process.cwd(), 'package.json'))) {
  console.error('❌ No estás en la raíz del repo (falta package.json).');
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
  log(`    📦 Backup: ${dest}`);
}

// ---- Cambios aplicados ----
const cambios = [];

/**
 * Aplica un reemplazo literal (string → string) en un archivo.
 * Verifica existencia previa, cuenta ocurrencias, aplica, escribe.
 */
function aplicarCambio(archivo, buscar, reemplazar, etiqueta) {
  log(`\n📄 ${archivo}`);
  log(`    Cambio: ${etiqueta}`);

  if (!fs.existsSync(archivo)) {
    log(`    ⚠️  Archivo no existe. Saltando.`);
    return false;
  }

  let contenido = readFileSafe(archivo);
  const ocurrencias = contenido.split(buscar).length - 1;

  if (ocurrencias === 0) {
    log(`    ⚠️  No se encontró el patrón. REVISAR MANUALMENTE.`);
    log(`        Buscado: ${JSON.stringify(buscar)}`);
    return false;
  }
  if (ocurrencias > 1) {
    log(`    ⚠️  Se encontraron ${ocurrencias} ocurrencias. Esperaba 1. ABORTANDO este cambio.`);
    return false;
  }

  contenido = contenido.split(buscar).join(reemplazar);
  backup(archivo);
  writeFileSafe(archivo, contenido);
  log(`    ✅ Reemplazado (1 ocurrencia).`);
  cambios.push({ archivo, etiqueta });
  return true;
}

/**
 * Marca un FIX como completado en la sección 8 de PLAN_TRABAJO.md.
 * Solo si no está ya presente.
 */
function marcarCompletado(contenido, fixId, descripcion, commit) {
  if (contenido.includes(`| **${fixId}** |`)) {
    log(`    ℹ️  ${fixId} ya presente en COMPLETADOS. No se agrega.`);
    return contenido;
  }
  const fila = `| **${fixId}** | ${descripcion} | 2026-09-20 | \`${commit}\` |`;
  // Insertar antes de la línea que empieza la siguiente sección después de COMPLETADOS
  const marcador = '| _(vacío al inicio)_ | | | |';
  if (contenido.includes(marcador)) {
    // Primer llenado: reemplazar placeholder
    contenido = contenido.replace(marcador, fila);
  } else {
    // Ya hay filas: insertar después de la última fila de la tabla COMPLETADOS
    const seccion = /(## 8\. ✅ COMPLETADOS[\s\S]*?\|.*\|\n)(\s*\n---)/;
    const m = contenido.match(seccion);
    if (m) {
      contenido = contenido.replace(m[1], m[1] + fila + '\n');
    } else {
      log(`    ⚠️  No se pudo insertar ${fixId} en COMPLETADOS. REVISAR MANUALMENTE.`);
      return contenido;
    }
  }
  log(`    ➕ ${fixId} agregado a COMPLETADOS.`);
  return contenido;
}

// ============================================================
// MAIN
// ============================================================
log('\n=== Sprint 0 — Grupo B: Cuota ADMIN 3 → 5 ===\n');

// ---------- 1. README.md ----------
aplicarCambio(
  'README.md',
  'máximo 3 Oficiales `ADMIN`',
  'máximo 5 Oficiales `ADMIN`',
  'FIX-004: cuota ADMIN 3 → 5'
);

// ---------- 2. API_REFERENCE.md ----------
aplicarCambio(
  'API_REFERENCE.md',
  'Máximo **3 ADMIN**',
  'Máximo **5 ADMIN**',
  'FIX-009: cuota ADMIN 3 → 5'
);

// ---------- 3. CONTEXTO_PROYECTO.md ----------
aplicarCambio(
  path.join('docs', 'rediseno_eventos', 'CONTEXTO_PROYECTO.md'),
  '3 (ampliado a 5 por decisión del OWNER)',
  '5',
  'FIX-018: simplificar cuota ADMIN a 5'
);

// ---------- 4. PLAN_TRABAJO.md ----------
log('\n📄 PLAN_TRABAJO.md');

let plan = readFileSafe('PLAN_TRABAJO.md');

// 4a. Marcar FIX-004, FIX-009, FIX-011, FIX-018 en COMPLETADOS
plan = marcarCompletado(plan, 'FIX-004', '`README.md` cuota ADMIN 3 → 5', 'TBD');
plan = marcarCompletado(plan, 'FIX-009', '`API_REFERENCE.md` cuota ADMIN 3 → 5', 'TBD');
plan = marcarCompletado(plan, 'FIX-011', '`ARCHITECTURE.md` cuota ADMIN ya estaba en 5 (verificado)', 'f32ed11');
plan = marcarCompletado(plan, 'FIX-018', '`CONTEXTO_PROYECTO.md` cuota ADMIN simplificada a 5', 'TBD');

// 4b. Actualizar Commit HEAD en sección 1
const headViejo = '| **Commit HEAD** | `bc01972` (fix views timezone) |';
const headNuevo = '| **Commit HEAD** | `0d04571` (Sprint 0 Grupo A) |';
if (plan.includes(headViejo)) {
  plan = plan.replace(headViejo, headNuevo);
  log('    ✅ Commit HEAD: bc01972 → 0d04571');
} else {
  log('    ⚠️  No se encontró Commit HEAD con bc01972. REVISAR MANUALMENTE.');
}

// 4c. Métrica Docs alineados: 6/10 → 7/10
const metricaVieja = '| Docs alineados con versión real | 6/10 |';
const metricaNueva = '| Docs alineados con versión real | 7/10 |';
if (plan.includes(metricaVieja)) {
  plan = plan.replace(metricaVieja, metricaNueva);
  log('    ✅ Métrica Docs alineados: 6/10 → 7/10');
} else {
  log('    ⚠️  No se encontró la métrica 6/10. REVISAR MANUALMENTE.');
}

// Escribir PLAN_TRABAJO.md
backup('PLAN_TRABAJO.md');
writeFileSafe('PLAN_TRABAJO.md', plan);
log('    💾 PLAN_TRABAJO.md actualizado.');

// ============================================================
// RESUMEN
// ============================================================
log('\n=== Resumen ===');
if (cambios.length === 0) {
  log('⚠️  No se aplicó ningún cambio de archivo.');
} else {
  for (const ch of cambios) {
    log(`  • ${ch.archivo} — ${ch.etiqueta}`);
  }
}

log('\n📌 Próximos pasos:');
log('   1. Revisá los diffs:');
log('        git --no-pager diff README.md API_REFERENCE.md PLAN_TRABAJO.md');
log('        git --no-pager diff docs/rediseno_eventos/CONTEXTO_PROYECTO.md');
log('   2. Si OK, staging:');
log('        git add README.md API_REFERENCE.md PLAN_TRABAJO.md docs/rediseno_eventos/CONTEXTO_PROYECTO.md');
log('   3. Commit:');
log('        git commit -m "docs(sprint-0-grupoB): cuota ADMIN 3 -> 5 en README/API_REFERENCE/CONTEXTO_PROYECTO"');
log('\n🚫 Este script NO commitea.');
log('⚠️  Los FIX-004/009/018 quedaron con commit "TBD" en PLAN_TRABAJO.md.');
log('   Después del commit, reemplazá "TBD" por el hash real.');