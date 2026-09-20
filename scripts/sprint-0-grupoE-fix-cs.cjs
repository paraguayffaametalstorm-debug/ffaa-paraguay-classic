/* ============================================================================
 * SPRINT 0 — GRUPO E — FIX CURRENT_STATE.md
 * ----------------------------------------------------------------------------
 * Reintento aislado. Usa regex ASCII-pura (sin tildes ni emojis) para evitar
 * problemas de encoding en CMD/Windows.
 *
 * NO commitea. Backup automático.
 * ==========================================================================*/

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
if (!fs.existsSync(path.join(ROOT, 'package.json'))) {
  console.error('❌ No estás en la raíz del repo.');
  process.exit(1);
}

const TS = new Date().toISOString().replace(/[:.]/g, '-');
const REL = 'CURRENT_STATE.md';
const ABS = path.join(ROOT, REL);

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║  SPRINT 0 — GRUPO E — Fix CURRENT_STATE.md                   ║');
console.log('╚══════════════════════════════════════════════════════════════╝');

if (!fs.existsSync(ABS)) {
  console.error(`❌ No existe: ${REL}`);
  process.exit(1);
}

let content = fs.readFileSync(ABS, 'utf8');
const original = content;

// ---------------------------------------------------------------------------
// Regex ASCII-pura: matchea cualquier cosa entre "Timezone:" y "America/Asuncion"
// y entre "C" y "lculo del offset din" y "mico v" y "a `Intl.DateTimeFormat`."
// ---------------------------------------------------------------------------

// Bloque L52-53 completo:
//   - Timezone: `America/Asuncion` (UTC-4 en verano, UTC-3 en invierno).
//   - Cálculo del offset dinámico vía `Intl.DateTimeFormat`.
const reBloque = /- Timezone: `America\/Asuncion`[^\n]*\n- C[^\n]*lculo del offset din[^\n]*mico v[^\n]*a `Intl\.DateTimeFormat`\./;

const bloqueNuevo =
  '- Timezone: **UTC-3 fijo** todo el año (`PY_OFFSET_HOURS = 3`). ' +
  'Paraguay sin DST desde octubre 2024 (Ley 7141/2024).\n' +
  '- Duración del **evento SQ**: 4 días (jue 09:00 PY → lun 08:59 PY).\n' +
  '- Duración de la **ventana de carga SQ**: 7 días (ADR-008). ' +
  'Evento y ventana son conceptos separados.';

if (!reBloque.test(content)) {
  console.error('❌ No matcheó el bloque L52-53 ni siquiera con regex ASCII-pura.');
  console.error('   Revisá manualmente con: type CURRENT_STATE.md | findstr /n "America Intl"');
  process.exit(1);
}

content = content.replace(reBloque, bloqueNuevo);

if (content === original) {
  console.error('❌ El reemplazo no produjo cambios.');
  process.exit(1);
}

// Backup + escritura
const bak = `${ABS}.bak-${TS}`;
fs.copyFileSync(ABS, bak);
fs.writeFileSync(ABS, content, 'utf8');

console.log(`⚠️  Backup: ${REL} → ${path.basename(bak)}`);
console.log(`✅ ${REL} actualizado (L52-53 reemplazadas).`);
console.log('');
console.log('📋 Verificar con:');
console.log('   type CURRENT_STATE.md | findstr /n "Timezone UTC-3 Duraci"');
console.log('');
console.log('📋 Luego commit:');
console.log('   git add CURRENT_STATE.md');
console.log('   git commit -m "docs(sprint-0-grupoE): CURRENT_STATE.md timezone UTC-3 fijo + duraciones evento/ventana (FIX-006/021/022)"');
console.log('');