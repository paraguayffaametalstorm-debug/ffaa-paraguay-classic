#!/usr/bin/env node
/**
 * FIX-310-ter — Refactorizar exportPerformancesCSV para usar v_admin_participations
 * ============================================================================
 *
 * Problema:
 *   GET /api/performances/export lee de la tabla 'performances' (legacy)
 *   en vez de la vista 'v_admin_participations' (fuente canónica de FIX-310).
 *
 * Solución:
 *   Reemplazar `.from('performances')` por `.from('v_admin_participations')`
 *   en la línea 293 (función exportPerformancesCSV).
 *
 * ⚠️ CAMBIO DE SEMÁNTICA:
 *   - performances.status       →  semáforo (VERDE/NARANJA/ROJO/NEGRO)
 *   - v_admin_participations.status → estado (PENDING/VALIDATED/REJECTED)
 *   El CSV ahora exporta el estado de la participación, no el semáforo.
 *   Esto es intencional: unifica la fuente de verdad (FIX-310-ter).
 *
 * Modo DRY-RUN por defecto. Usar --apply para aplicar cambios.
 *
 * Patrón del proyecto: backup .bak-XXX, idempotente, verificación post-cambio.
 */

const { readFileSync, writeFileSync, copyFileSync, existsSync } = require('fs');
const { resolve } = require('path');

// ─────────────────────────────────────────────────────────────
// Configuración
// ─────────────────────────────────────────────────────────────
const DRY_RUN = !process.argv.includes('--apply');
const FILE = resolve('src/controllers/performances.controller.js');
const BACKUP = FILE + '.bak-fix310ter';

// Marcador de la línea exacta a cambiar (L293)
const OLD_LINE = `      const { data } = await supabase.from('performances').select('*').order('created_at', { ascending: false });`;
const NEW_LINE = `      const { data } = await supabase.from('v_admin_participations').select('*').order('created_at', { ascending: false });`;

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
function log(msg) { console.log(msg); }

function checkFileExists() {
  if (!existsSync(FILE)) {
    log(`❌ Archivo no encontrado: ${FILE}`);
    process.exit(1);
  }
}

function showPlan() {
  log('');
  log('════════════════════════════════════════════════════════════');
  log('  FIX-310-ter — Refactorizar exportPerformancesCSV');
  log('════════════════════════════════════════════════════════════');
  log('');
  log(`  Archivo:  ${FILE}`);
  log(`  Modo:     ${DRY_RUN ? '🔍 DRY-RUN (no modifica)' : '⚡ APPLY (modifica)'}`);
  log('');
  log('  Cambio:');
  log(`    - ANTES:  from('performances')`);
  log(`    + DESPUÉS: from('v_admin_participations')`);
  log('');
}

// ─────────────────────────────────────────────────────────────
// Ejecución
// ─────────────────────────────────────────────────────────────
checkFileExists();
showPlan();

const content = readFileSync(FILE, 'utf8');

// 1. Verificar si ya fue aplicado (idempotencia)
if (content.includes(NEW_LINE) && !content.includes(OLD_LINE)) {
  log('⏭️  Ya aplicado (idempotente). Nada que hacer.');
  process.exit(0);
}

// 2. Verificar que la línea vieja existe
if (!content.includes(OLD_LINE)) {
  log('❌ Marcador OLD_LINE no encontrado.');
  log('   Posibles causas:');
  log('   - El archivo fue modificado manualmente');
  log('   - La línea tiene espacios/indentación distintos');
  log('   - El cambio ya se aplicó con otro formato');
  log('');
  log('   Línea buscada:');
  log(`   ${OLD_LINE}`);
  process.exit(1);
}

// 3. Contar ocurrencias (seguridad: debe ser exactamente 1)
const occurrences = content.split(OLD_LINE).length - 1;
if (occurrences !== 1) {
  log(`❌ Se encontraron ${occurrences} ocurrencias (esperado: 1).`);
  log('   Abortando para no romper otras funciones.');
  process.exit(1);
}

// 4. Aplicar o dry-run
if (DRY_RUN) {
  log('✓ Marcador encontrado (1 ocurrencia).');
  log('');
  log('   Para aplicar:');
  log('   node scripts\\fix-310-ter.cjs --apply');
  log('');
  process.exit(0);
}

// 5. Backup
if (!existsSync(BACKUP)) {
  copyFileSync(FILE, BACKUP);
  log(`📦 Backup creado: ${BACKUP}`);
} else {
  log(`📦 Backup ya existe: ${BACKUP} (no se sobreescribe)`);
}

// 6. Aplicar cambio
const newContent = content.replace(OLD_LINE, NEW_LINE);
writeFileSync(FILE, newContent, 'utf8');

// 7. Verificación post-cambio (leer del disco, no confiar en memoria)
const verifyContent = readFileSync(FILE, 'utf8');
if (!verifyContent.includes(NEW_LINE)) {
  log('❌ Verificación FALLÓ: la línea nueva no está en el archivo.');
  log('   Restaurando backup...');
  copyFileSync(BACKUP, FILE);
  log('   Backup restaurado.');
  process.exit(1);
}

if (verifyContent.includes(OLD_LINE)) {
  log('⚠️  Advertencia: la línea vieja todavía está presente (replace parcial).');
  log('   Revisá manualmente el archivo.');
  process.exit(1);
}

log('✅ Cambio aplicado y verificado.');
log('');
log('   Próximos pasos:');
log('   1. node --check src\\controllers\\performances.controller.js');
log('   2. npm test');
log('   3. git diff src/controllers/performances.controller.js');
log('');