/**
 * ═══════════════════════════════════════════════════════════════
 *  FASE 4 — FIX v3: Remover bloque F2 al final de views.css
 *  ─────────────────────────────────────────────────────────────
 *  El bloque "FASE 2 — Layout del Panel Admin" quedó al FINAL
 *  de views.css (después del bloque HANGAR REDESIGN). Por eso
 *  no había marcador de fin. Este script detecta ese caso y
 *  remueve el bloque hasta EOF, con guardas de seguridad.
 *
 *  Uso:      node scripts/fase-f4-fix-bloque-duplicado.cjs
 *
 *  Rollback:
 *    copy css\views.css.bak-f4-fix css\views.css
 *  ─────────────────────────────────────────────────────────────
 *  Fecha: 2026-10-09
 * ═══════════════════════════════════════════════════════════════
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const FILE_VIEWS_CSS = path.join(ROOT, 'css', 'views.css');

function log(msg)   { console.log(msg); }
function ok(msg)    { console.log(`   ✅ ${msg}`); }
function warn(msg)  { console.log(`   ⚠️  ${msg}`); }
function err(msg)   { console.error(`   ❌ ${msg}`); }

function main() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  🚀 FASE 4 — FIX v3: Remover bloque F2 (al final)');
  console.log('═══════════════════════════════════════════════════════\n');

  if (!fs.existsSync(FILE_VIEWS_CSS)) {
    err('No existe: css/views.css');
    process.exit(1);
  }

  const contentOriginal = fs.readFileSync(FILE_VIEWS_CSS, 'utf8');
  const bytesOriginales = Buffer.byteLength(contentOriginal, 'utf8');
  log(`📖 Leído: css/views.css (${bytesOriginales} bytes)`);

  // ── PASO 1: encontrar inicio del bloque F2 ──
  const inicioMarker = 'FASE 2 — Layout del Panel Admin';
  let startIdx = contentOriginal.indexOf(inicioMarker);
  if (startIdx === -1) {
    // Fallback sin em-dash (por si el encoding lo cambió)
    startIdx = contentOriginal.indexOf('FASE 2 - Layout del Panel Admin');
  }
  if (startIdx === -1) {
    startIdx = contentOriginal.indexOf('FASE 2');
  }
  if (startIdx === -1) {
    err('No se encontró el INICIO del bloque F2. Abortando.');
    process.exit(1);
  }

  // Retroceder al /* que abre el comentario
  const antes = contentOriginal.slice(Math.max(0, startIdx - 500), startIdx);
  const lastComent = antes.lastIndexOf('/*');
  if (lastComent !== -1) {
    startIdx = Math.max(0, startIdx - 500) + lastComent;
  }
  log(`   Inicio del bloque F2: offset ${startIdx}`);

  // ── PASO 2: verificar si el bloque llega hasta EOF ──
  // El bloque F2 termina con las reglas @media (max-width: 767px) que definen
  // el sidebar como drawer. Después de eso no debería haber nada más.

  // Buscamos si hay contenido DESPUÉS de startIdx que contenga selectores
  // de otras secciones (que indicarían que el bloque F2 NO es el último).
  const resto = contentOriginal.slice(startIdx);
  const bytesResto = Buffer.byteLength(resto, 'utf8');

  log(`   Resto del archivo desde el inicio del bloque F2: ${bytesResto} bytes`);
  log('');

  // Mostrar las primeras 3 y últimas 3 líneas no vacías del resto (debug)
  const lineas = resto.split('\n').filter(l => l.trim().length > 0);
  log('   Primeras 3 líneas del bloque a remover:');
  lineas.slice(0, 3).forEach(l => log(`     ${l.substring(0, 80)}`));
  log('   Últimas 3 líneas del bloque a remover:');
  lineas.slice(-3).forEach(l => log(`     ${l.substring(0, 80)}`));
  log('');

  // ── PASO 3: sanity checks ──
  // El bloque F2 debe pesar entre 4 KB y 15 KB
  if (bytesResto < 3000 || bytesResto > 20000) {
    err(`El "resto" pesa ${bytesResto} bytes. Esperado entre 3000 y 20000.`);
    err('Esto sugiere que el bloque F2 no es lo que esperaba.');
    err('Abortando sin modificar.');
    process.exit(1);
  }

  // El resto debe contener selectores de #adminPanel (confirmación)
  if (!resto.includes('#adminPanel')) {
    err('El bloque a remover NO contiene "#adminPanel". Abortando.');
    process.exit(1);
  }

  // El resto NO debe contener bloques que NO pertenezcan a F2
  // (por si el HANGAR REDESIGN o algo más quedó después por error)
  const selosSospechosos = [
    'HANGAR REDESIGN',
    'hangar-carousel',
    '#report',
    'EXPORTACIÓN DE RESULTADOS'
  ];
  for (const s of selosSospechosos) {
    if (resto.includes(s)) {
      err(`El bloque a remover contiene "${s}" que NO pertenece a F2.`);
      err('Abortando para no destruir contenido.');
      process.exit(1);
    }
  }

  ok('Guardas de seguridad pasadas');
  log('');

  // ── PASO 4: crear backup y escribir ──
  const BACKUP = FILE_VIEWS_CSS + '.bak-f4-fix';
  if (fs.existsSync(BACKUP)) {
    warn(`Backup ya existía: ${path.basename(BACKUP)} (no se toca)`);
  } else {
    fs.writeFileSync(BACKUP, contentOriginal, 'utf8');
    ok(`Backup creado: ${path.basename(BACKUP)} (${bytesOriginales} bytes)`);
  }

  // Remover desde startIdx hasta el final
  const nuevoContenido = contentOriginal.slice(0, startIdx);
  const bytesNuevos = Buffer.byteLength(nuevoContenido, 'utf8');
  const bytesEliminados = bytesOriginales - bytesNuevos;

  fs.writeFileSync(FILE_VIEWS_CSS, nuevoContenido, 'utf8');

  console.log('');
  log(`   Bytes originales:  ${bytesOriginales}`);
  log(`   Bytes eliminados:  ${bytesEliminados}`);
  log(`   Bytes restantes:   ${bytesNuevos}`);
  ok(`Escrito: css/views.css`);

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  ✅ Bloque F2 removido de views.css');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');
  console.log('  Próximo paso:');
  console.log('     1. Verificar: findstr /C:"admin-sidebar" css\\views.css');
  console.log('        → Debe devolver VACÍO (ya no hay bloque F2)');
  console.log('     2. Verificar: dir css\\views.css');
  console.log('        → Debe pesar ~35-36 KB (era 43 KB)');
  console.log('     3. Verificar: findstr /C:"hangar-carousel" css\\views.css');
  console.log('        → Debe devolver contenido (HANGAR sigue vivo)');
  console.log('');
  console.log('  🔙 Rollback:');
  console.log('     copy css\\views.css.bak-f4-fix css\\views.css');
  console.log('═══════════════════════════════════════════════════════\n');
}

main();