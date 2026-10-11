#!/usr/bin/env node
/**
 * sprint-0-grupoG-manual.cjs
 * -----------------------------------------------------------------------------
 * Sprint 0 — Grupo G — FIX-016 sobre USER_MANUAL.md
 *
 * Cambios:
 *  1. Header: "Versión v4.0.0" → "Versión v4.3.0"
 *  2. Footer: "*Versión: v4.0.5 · Actualizado: 18 Septiembre 2026*"
 *            → "*Versión: v4.3.0 · Actualizado: 20 Septiembre 2026*"
 *  3. Nueva sub-sección "Ventanas de Carga de Performance (ADR-008)"
 *     insertada después de la sección 2.2 (Registro Semanal de Rendimiento).
 *
 * Reglas (Grupo F):
 *  - EOL: regex \r?\n SIEMPRE (aunque USER_MANUAL.md sea CRLF puro).
 *  - Backup timestamped con Set interno (idempotente).
 *  - Aborto TOTAL si algún ítem falla. Sin escritura parcial.
 *  - NO commitear desde el script.
 * -----------------------------------------------------------------------------
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const ROOT       = path.resolve(__dirname, '..');
const TARGET     = path.join(ROOT, 'USER_MANUAL.md');
const BACKUP_SET = new Set();

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

function timestamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function detectEol(content) {
  const crlf = (content.match(/\r\n/g) || []).length;
  const lf   = (content.match(/(?<!\r)\n/g) || []).length;
  return { dominant: crlf > lf ? '\r\n' : '\n', crlf, lf };
}

function abort(msg) {
  console.error(`\n❌ ABORTO: ${msg}`);
  console.error('   No se escribió ningún archivo.');
  process.exit(1);
}

function ok(msg)  { console.log(`✓ ${msg}`); }
function info(msg){ console.log(`  ${msg}`); }

// ---------------------------------------------------------------------------
// Lectura
// ---------------------------------------------------------------------------

if (!fs.existsSync(TARGET)) abort(`No existe: ${TARGET}`);

const original = fs.readFileSync(TARGET, 'utf8');
const eolInfo  = detectEol(original);
const eol      = eolInfo.dominant;  // \r\n en este caso

console.log(`\n📄 USER_MANUAL.md — ${original.length} bytes`);
console.log(`   EOL: ${eolInfo.crlf} CRLF + ${eolInfo.lf} LF (dominante: ${eol === '\r\n' ? 'CRLF' : 'LF'})\n`);

// ---------------------------------------------------------------------------
// Definición de los cambios
// ---------------------------------------------------------------------------

// --- FIX-016.a: Header versión ---
const header_old = `en MetalStorm (Versión v4.0.0).**`;
const header_new = `en MetalStorm (Versión v4.3.0).**`;

// --- FIX-016.b: Footer versión + fecha ---
const footer_old = `*Versión: v4.0.5 · Actualizado: 18 Septiembre 2026*`;
const footer_new = `*Versión: v4.3.0 · Actualizado: 20 Septiembre 2026*`;

// --- FIX-016.c: Nueva sección ADR-008 ---
// Anclaje: insertar antes del heading "### 2.3 ✈️ Hangar Militar"
// Esto posiciona la nueva sub-sección como 2.2.1 (dentro de la familia 2.2).

const anchor_regex = /^### 2\.3 ✈️ Hangar Militar/m;

// Construimos la nueva sub-sección. El ancla `### 2.3` se conserva.
// Usamos \n que normalizaremos al EOL dominante al final.
const nueva_seccion_raw = [
  '#### Ventanas de Carga de Performance (ADR-008)',
  '',
  'A partir de la versión **v4.3.0**, las **ventanas de carga de performance** están',
  'desacopladas del ciclo del evento. Esto significa que un evento puede figurar',
  'como cerrado y aun así permitir la carga de performance hasta su deadline.',
  '',
  '**Reglas operativas:**',
  '',
  '| Tipo de evento | Duración de la ventana | Cuándo cierra |',
  '|---|---|---|',
  '| **SQUADRON (SQ)** | 7 días | Jueves 09:00 PY (una semana después del inicio) |',
  '| **BLACK_MARKET (BM)** | 6 días | Martes 17:00 PY (seis días después del inicio) |',
  '',
  '**Comportamiento:**',
  '',
  '- **Durante la ventana:** podés cargar y editar tu performance con normalidad.',
  '- **Después del cierre:** tu participación queda en **READ-ONLY** (solo lectura).',
  '  No vas a poder modificar los datos ya cargados.',
  '- **Evento SQ cerrado por BM:** si un evento BM reemplaza al SQ (switch funcional),',
  '  la ventana de carga del SQ **sigue abierta** hasta su deadline original. Podés',
  '  seguir cargando performance del SQ aunque el evento ya no esté activo.',
  '',
  '**Cómo consultar tu ventana:**',
  '',
  'En la vista de eventos activos verás un indicador con el **tiempo restante** para',
  'cargar tu performance. También podés consultar la info detallada vía los endpoints:',
  '',
  '- `GET /api/events-v2/:id/submission-window` — ventana de un evento SQ.',
  '- `GET /api/events-v2/bm/:eventId/submission-window` — ventana de un evento BM.',
  '',
  '**Excepción — reclamo BM:**',
  '',
  'El reclamo (purchase) de un descuento BM **NO valida la ventana**. Esto significa',
  'que podés reclamar tu descuento independientemente del deadline de carga.',
  '',
  '**Referencias:**',
  '',
  '- ADR-008: `docs/adr/ADR-008-ventanas-carga-desacopladas.md`',
  '- API: `API_REFERENCE.md` §3.5.5',
  '',
  '',  // ← línea en blanco extra para separar del heading ### 2.3
].join('\r\n'); // construimos con CRLF porque el archivo es CRLF puro

// ---------------------------------------------------------------------------
// ASSERTS — abortar si algo no está como esperamos
// ---------------------------------------------------------------------------

console.log('🔎 Verificando precondiciones...\n');

// Header
if (!original.includes(header_old)) {
  abort(`FIX-016.a: no se encontró header "${header_old}" en USER_MANUAL.md.`);
}
if (original.includes(header_new)) {
  abort('FIX-016.a: el header ya fue actualizado a v4.3.0. ¿Ya aplicado?');
}
ok('FIX-016.a: header "v4.0.0" encontrado.');

// Footer
if (!original.includes(footer_old)) {
  abort(`FIX-016.b: no se encontró footer "${footer_old}" en USER_MANUAL.md.`);
}
if (original.includes(footer_new)) {
  abort('FIX-016.b: el footer ya fue actualizado. ¿Ya aplicado?');
}
ok('FIX-016.b: footer "v4.0.5 · 18 Septiembre 2026" encontrado.');

// Nueva sección
if (!anchor_regex.test(original)) {
  abort('FIX-016.c: no se encontró el ancla "### 2.3 ✈️ Hangar Militar".');
}
if (original.includes('Ventanas de Carga de Performance (ADR-008)')) {
  abort('FIX-016.c: la sección ADR-008 ya existe. ¿Ya aplicada?');
}
ok('FIX-016.c: ancla "### 2.3 ✈️ Hangar Militar" encontrada, ADR-008 sin duplicar.');

// ---------------------------------------------------------------------------
// Backup
// ---------------------------------------------------------------------------

console.log('\n💾 Generando backup...\n');

const backupPath = `${TARGET}.bak-${timestamp()}`;
if (BACKUP_SET.has(backupPath)) {
  info(`Backup ya generado: ${path.basename(backupPath)}`);
} else {
  fs.writeFileSync(backupPath, original, 'utf8');
  BACKUP_SET.add(backupPath);
  ok(`Backup: ${path.basename(backupPath)}`);
}

// ---------------------------------------------------------------------------
// Aplicar cambios
// ---------------------------------------------------------------------------

console.log('\n🔧 Aplicando fixes...\n');

let result = original;

// a) Header
const before_a = result;
result = result.replace(header_old, header_new);
if (result === before_a) abort('FIX-016.a: replace no tuvo efecto.');
ok('FIX-016.a: header actualizado a v4.3.0.');

// b) Footer
const before_b = result;
result = result.replace(footer_old, footer_new);
if (result === before_b) abort('FIX-016.b: replace no tuvo efecto.');
ok('FIX-016.b: footer actualizado a v4.3.0 · 20 Septiembre 2026.');

// c) Nueva sección — insertar ANTES del heading "### 2.3"
const before_c = result;
result = result.replace(anchor_regex, `${nueva_seccion_raw}### 2.3 ✈️ Hangar Militar`);
if (result === before_c) abort('FIX-016.c: inserción de ADR-008 no tuvo efecto.');
ok('FIX-016.c: sección ADR-008 insertada antes de "### 2.3".');

// ---------------------------------------------------------------------------
// Escribir
// ---------------------------------------------------------------------------

console.log('\n✍️  Escribiendo USER_MANUAL.md...\n');
fs.writeFileSync(TARGET, result, 'utf8');
ok(`USER_MANUAL.md escrito (${result.length} bytes, delta ${result.length - original.length > 0 ? '+' : ''}${result.length - original.length}).`);

// ---------------------------------------------------------------------------
// Verificación post
// ---------------------------------------------------------------------------

console.log('\n🧪 Verificación post:\n');

const final = fs.readFileSync(TARGET, 'utf8');

const a_ok = final.includes(header_new) && !final.includes(header_old);
const b_ok = final.includes(footer_new) && !final.includes(footer_old);
const c_ok = final.includes('#### Ventanas de Carga de Performance (ADR-008)')
          && final.includes('### 2.3 ✈️ Hangar Militar')
          && (final.indexOf('#### Ventanas de Carga de Performance') < final.indexOf('### 2.3 ✈️ Hangar Militar'));

console.log(`   FIX-016.a (header):  ${a_ok ? '✓ OK' : '✗ FALLÓ'}`);
console.log(`   FIX-016.b (footer):  ${b_ok ? '✓ OK' : '✗ FALLÓ'}`);
console.log(`   FIX-016.c (sección): ${c_ok ? '✓ OK' : '✗ FALLÓ'}`);

if (!a_ok || !b_ok || !c_ok) {
  console.error('\n⚠️  Alguna verificación post falló.');
  process.exit(2);
}

console.log('\n✅ FIX-016 aplicado en USER_MANUAL.md.\n');
console.log('⚠️  PRÓXIMOS PASOS MANUALES:');
console.log('   1. git diff USER_MANUAL.md');
console.log('   2. git add USER_MANUAL.md');
console.log('   3. git commit -m "docs(sprint-0-grupoG): USER_MANUAL v4.0.0→v4.3.0 + sección ADR-008 (FIX-016)"');
console.log('   4. git push origin main');
console.log('   5. git add scripts/sprint-0-grupoG-manual.cjs');
console.log('   6. git commit -m "chore(sprint-0-grupoG): versionar script USER_MANUAL (FIX-016)"');
console.log('   7. git push origin main');
console.log('');