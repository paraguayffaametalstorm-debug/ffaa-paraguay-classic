#!/usr/bin/env node
/**
 * sprint0-grupoD-fix.cjs
 * Corrige las 2 líneas que el script original no pudo actualizar
 * por diferencia de emojis/símbolos entre la copia pegada al chat
 * y el archivo real en disco.
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

function reemplazarRegex(archivo, regex, reemplazo, etiqueta) {
  log(`\n📄 ${archivo}`);
  log(`    Cambio: ${etiqueta}`);
  let c = readFileSafe(archivo);
  const matches = c.match(new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : regex.flags + 'g'));
  const n = matches ? matches.length : 0;
  if (n === 0) {
    log(`    ⚠️  Patrón NO encontrado.`);
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

// ============================================================
// CORRECCIÓN 1: ADR-008 — 📝 Proposed → ✅ Accepted
// ============================================================
// Regex: captura la línea completa de ADR-008 sin importar el emoji delante de Proposed
reemplazarRegex(
  path.join('docs', 'adr', 'README.md'),
  /^(\| ADR-008 \|.*\| 2026-09-20 \| ).+?( Proposed \|)$/m,
  '$1✅ Accepted |',
  'ADR-008: 📝 Proposed → ✅ Accepted'
);

// ============================================================
// CORRECCIÓN 2: "Próximos ADRs Planificados" — fila vacía → ADR-005 pendiente
// ============================================================
// La fila real es: | — | (Sin ADRs planificados al 2026-09-20) | — |
// La reemplazamos por la referencia a ADR-005
reemplazarRegex(
  path.join('docs', 'adr', 'README.md'),
  /^\| .+? \| \(Sin ADRs planificados al 2026-09-20\) \| .+? \|$/m,
  '| ADR-005 | Migración de presence a Supabase | Pendiente de aceptación (ver FIX-209 en Sprint 2) |',
  'Próximos ADRs: fila vacía → ADR-005'
);

// ============================================================
// RESUMEN
// ============================================================
log('\n=== Resumen ===');
if (cambios.length === 0) {
  log('⚠️  No se aplicó ningún cambio.');
} else {
  for (const ch of cambios) log(`  • ${ch.archivo} — ${ch.etiqueta}`);
}

log('\n📌 Próximos pasos:');
log('   1. git --no-pager diff docs/adr/README.md');
log('   2. Verificar con: findstr /n "ADR-008" docs\\adr\\README.md');
log('   3. Si OK, staging + commit:');
log('        git add docs/adr/ PLAN_TRABAJO.md');
log('        git commit -m "docs(sprint-0-grupoD): ADRs 001-005 en formato MADR 4.0 + fix estado ADR-008"');
log('\n🚫 Este script NO commitea.');