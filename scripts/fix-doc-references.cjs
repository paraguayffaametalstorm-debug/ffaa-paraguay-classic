#!/usr/bin/env node
/**
 * fix-doc-references.cjs
 * 
 * Corrige las referencias cruzadas entre documentos .md después de la
 * reorganización de docs/ en subcarpetas temáticas.
 * 
 * Uso:
 *   node scripts/fix-doc-references.cjs          → DRY RUN (solo reporta)
 *   node scripts/fix-doc-references.cjs --apply  → aplica los cambios
 * 
 * Autor: Comando C4ISR
 * Fecha: 2026-10-11
 */

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------
// CONFIGURACIÓN
// ---------------------------------------------------------------

const ROOT = path.resolve(__dirname, '..');
const APPLY = process.argv.includes('--apply');

// Mapa: nombre de archivo → nueva ruta (relativa desde la raíz)
const MAPA = {
  'ARCHITECTURE.md':              'docs/architecture/ARCHITECTURE.md',
  'API_REFERENCE.md':             'docs/architecture/API_REFERENCE.md',
  'MIGRACION_SQL_REFERENCE.md':   'docs/architecture/MIGRACION_SQL_REFERENCE.md',
  'DEPLOYMENT_GUIDE.md':          'docs/deployment/DEPLOYMENT_GUIDE.md',
  'DEPLOYMENT_STATE.md':          'docs/deployment/DEPLOYMENT_STATE.md',
  'PWA_SETUP.md':                 'docs/deployment/PWA_SETUP.md',
  'RELEASE.md':                   'docs/deployment/RELEASE.md',
  'USER_MANUAL.md':               'docs/operations/USER_MANUAL.md',
  'POLITICA_INACTIVACION.md':     'docs/operations/POLITICA_INACTIVACION.md',
  'FIXES_APPLIED.md':             'docs/operations/FIXES_APPLIED.md',
  'ROADMAP.md':                   'docs/planning/ROADMAP.md',
  'BACKLOG.md':                   'docs/planning/BACKLOG.md',
  'CURRENT_STATE.md':             'docs/planning/CURRENT_STATE.md',
  'PLAN_TRABAJO.md':              'docs/planning/PLAN_TRABAJO.md',
  'PLAN_MEJORA_ADMIN_PANEL.md':   'docs/planning/PLAN_MEJORA_ADMIN_PANEL.md',
  'PLAN_MEJORA_CONTINUA.md':      'docs/planning/PLAN_MEJORA_CONTINUA.md',
  'PLAN_TRABAJO_VETERANOS.md':    'docs/planning/PLAN_TRABAJO_VETERANOS.md',
};

// Archivos que vamos a procesar (rutas relativas a la raíz)
const ARCHIVOS_A_PROCESAR = [
  'README.md',
  'docs/adr/ADR-010-seccion-veteranos.md',
];

// ---------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------

function log(msg, tipo = 'info') {
  const prefix = { info: '  ', ok: '✅', warn: '⚠️ ', err: '❌' }[tipo] || '  ';
  console.log(`${prefix} ${msg}`);
}

/**
 * Calcula la ruta relativa correcta desde `archivoOrigen` hasta `archivoDestino`.
 * Ej: desde "README.md" hasta "docs/planning/ROADMAP.md" → "./docs/planning/ROADMAP.md"
 *     desde "docs/adr/ADR-010.md" hasta "docs/planning/PLAN_TRABAJO.md" → "../planning/PLAN_TRABAJO.md"
 */
function calcularRutaRelativa(archivoOrigen, archivoDestino) {
  const dirOrigen = path.dirname(archivoOrigen);
  let rel = path.relative(dirOrigen, archivoDestino).replace(/\\/g, '/');
  // Asegurar prefijo ./ para rutas que no empiezan con ../
  if (!rel.startsWith('.')) {
    rel = './' + rel;
  }
  return rel;
}

/**
 * Detecta si una ruta de link resuelve al mismo archivo que la ruta correcta.
 * Ignora el prefijo ./ y ../.
 */
function esLinkRoto(rutaActual, rutaCorrecta, archivoOrigen) {
  // Normalizar la ruta actual para resolverla
  const dirOrigen = path.dirname(archivoOrigen);
  const absActual = path.resolve(ROOT, dirOrigen, rutaActual).replace(/\\/g, '/');
  const absCorrecta = path.resolve(ROOT, rutaCorrecta).replace(/\\/g, '/');
  return absActual !== absCorrecta;
}

// ---------------------------------------------------------------
// LÓGICA PRINCIPAL
// ---------------------------------------------------------------

/**
 * Procesa un archivo: detecta links a archivos del MAPA y los corrige.
 * Retorna un array de cambios { old, new, linea }.
 */
function procesarArchivo(archivoRel) {
  const absPath = path.join(ROOT, archivoRel);
  if (!fs.existsSync(absPath)) {
    log(`NO EXISTE: ${archivoRel}`, 'warn');
    return [];
  }

  const contenido = fs.readFileSync(absPath, 'utf8');
  const lineas = contenido.split(/\r?\n/);
  const cambios = [];
  const nuevasLineas = [];

  // Regex para capturar links markdown: [texto](ruta)
  const regexLink = /\[([^\]]+)\]\(([^)]+)\)/g;

  for (let i = 0; i < lineas.length; i++) {
    const lineaOriginal = lineas[i];
    let lineaModificada = lineaOriginal;

    // Buscar todos los links en esta línea
    let match;
    const matches = [];
    // Reset del regex por si acaso
    regexLink.lastIndex = 0;
    while ((match = regexLink.exec(lineaOriginal)) !== null) {
      matches.push({
        full: match[0],
        texto: match[1],
        ruta: match[2],
        index: match.index,
      });
    }

    // Procesar cada link (de atrás hacia adelante para no romper índices)
    for (let j = matches.length - 1; j >= 0; j--) {
      const m = matches[j];
      const rutaLimpia = m.ruta.split('#')[0].replace(/\.\//g, '');
      const hash = m.ruta.includes('#') ? '#' + m.ruta.split('#')[1] : '';

      // ¿La ruta corresponde a un archivo del MAPA?
      const nombreArchivo = path.basename(rutaLimpia);
      if (MAPA[nombreArchivo]) {
        const rutaCorrecta = calcularRutaRelativa(archivoRel, MAPA[nombreArchivo]) + hash;

        if (esLinkRoto(m.ruta, MAPA[nombreArchivo] + hash, archivoRel)) {
          // Reemplazar el link completo
          const linkNuevo = `[${m.texto}](${rutaCorrecta})`;
          lineaModificada = lineaModificada.replace(m.full, linkNuevo);
          cambios.push({
            linea: i + 1,
            old: m.full,
            new: linkNuevo,
          });
        }
      }
    }

    nuevasLineas.push(lineaModificada);
  }

  if (cambios.length > 0 && APPLY) {
    fs.writeFileSync(absPath, nuevasLineas.join('\n'), 'utf8');
  }

  return cambios;
}

// ---------------------------------------------------------------
// EJECUCIÓN
// ---------------------------------------------------------------

console.log('');
console.log('═══════════════════════════════════════════════════════════════');
console.log('  FIX-DOC-REFERENCES — Corrección de referencias cruzadas');
console.log('═══════════════════════════════════════════════════════════════');
console.log(`  Modo: ${APPLY ? '🔴 APPLY (modificará archivos)' : '🟢 DRY RUN (solo reporta)'}`);
console.log(`  Raíz: ${ROOT}`);
console.log('');

let totalCambios = 0;
let archivosModificados = 0;

for (const archivoRel of ARCHIVOS_A_PROCESAR) {
  console.log(`📄 Procesando: ${archivoRel}`);
  const cambios = procesarArchivo(archivoRel);
  
  if (cambios.length === 0) {
    log('Sin cambios necesarios', 'ok');
  } else {
    for (const c of cambios) {
      log(`Línea ${c.linea}:`, 'warn');
      console.log(`      ANTES: ${c.old}`);
      console.log(`      DESPUÉS: ${c.new}`);
    }
    totalCambios += cambios.length;
    archivosModificados++;
  }
  console.log('');
}

console.log('═══════════════════════════════════════════════════════════════');
console.log(`  RESUMEN`);
console.log('═══════════════════════════════════════════════════════════════');
console.log(`  Archivos procesados: ${ARCHIVOS_A_PROCESAR.length}`);
console.log(`  Archivos con cambios: ${archivosModificados}`);
console.log(`  Total de links corregidos: ${totalCambios}`);
console.log('');

if (!APPLY && totalCambios > 0) {
  console.log('  ℹ️  Esto fue un DRY RUN. Para aplicar los cambios:');
  console.log('     node scripts/fix-doc-references.cjs --apply');
  console.log('');
}