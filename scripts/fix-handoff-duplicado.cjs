#!/usr/bin/env node
/**
 * Reparación del SESSION_HANDOFF.md
 * Elimina las repeticiones 2 y 3 del bloque "Estrategia para el Grupo G"
 * dejando solo la primera ocurrencia. Preserva absolutamente todo el resto.
 *
 * Uso:  node scripts/fix-handoff-duplicado.cjs
 *
 * NO commitea. El OWNER revisa diff y commitea manualmente.
 */

const fs = require('fs');
const path = require('path');

// ── Verificación de raíz del repo ───────────────────────────────
if (!fs.existsSync(path.join(process.cwd(), 'package.json'))) {
  console.error('❌ No estás en la raíz del repo (falta package.json).');
  process.exit(1);
}

const TARGET = path.join(process.cwd(), 'docs/SESSION_HANDOFF.md');

if (!fs.existsSync(TARGET)) {
  console.error(`❌ No existe ${TARGET}`);
  process.exit(1);
}

// ── Helpers ─────────────────────────────────────────────────────
function log(msg) { console.log(msg); }

function backup(p) {
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const bak = `${p}.bak-fix-${ts}`;
  fs.copyFileSync(p, bak);
  log(`   🗄️  Backup: ${path.basename(bak)}`);
}

// ── Cargar documento ────────────────────────────────────────────
let doc = fs.readFileSync(TARGET, 'utf8');
const original = doc;

const crlfCount = (doc.match(/\r\n/g) || []).length;
const lfCount = (doc.match(/\n/g) || []).length - crlfCount;
log(`📄 EOL: ${crlfCount} CRLF + ${lfCount} LF`);
log('');

// ── Diagnóstico: contar ocurrencias ─────────────────────────────
const marker1 = '### Estrategia para el Grupo G';
const marker2 = '### Registro de fixes del Sprint 0';
const markerEnd = '## 2. ESTADO ACTUAL';

const count1 = (doc.match(new RegExp(marker1.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
const count2 = (doc.match(new RegExp(marker2.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
const countEnd = (doc.match(new RegExp(markerEnd.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;

log(`🔍 Diagnóstico:`);
log(`   "${marker1}": ${count1} ocurrencia(s)`);
log(`   "${marker2}": ${count2} ocurrencia(s)`);
log(`   "${markerEnd}": ${countEnd} ocurrencia(s)`);
log('');

if (count1 < 2) {
  log('✅ No hay duplicación. Nada que hacer.');
  process.exit(0);
}

if (countEnd !== 1) {
  log(`❌ Esperaba 1 ocurrencia de "${markerEnd}", encontré ${countEnd}.`);
  log('   Abortando — la estructura no es la esperada.');
  process.exit(1);
}

// ── Estrategia: split por líneas, ubicar índices ────────────────
// Usamos split con regex que consume \r?\n y NO preserva EOL.
// Después reconstruimos con EOL uniforme (\r\n).
// Pero para preservar al máximo el archivo original, mejor
// trabajamos con split(/(\r?\n)/) que SÍ preserva los separadores.
//
// Alternativa más simple: encontrar índices por string directo.

// Encontrar posiciones de las 3 ocurrencias del bloque a eliminar.
// El "bloque a eliminar" empieza en el 2do "### Estrategia para el Grupo G"
// y termina justo antes de "## 2. ESTADO ACTUAL".

function findNthIndex(str, search, n) {
  let idx = -1;
  for (let i = 0; i < n; i++) {
    idx = str.indexOf(search, idx + 1);
    if (idx === -1) return -1;
  }
  return idx;
}

const secondOccurrence = findNthIndex(doc, marker1, 2);
if (secondOccurrence === -1) {
  log('❌ No pude encontrar la 2da ocurrencia. Abortando.');
  process.exit(1);
}

// Retroceder hasta el inicio de la línea donde está la 2da ocurrencia.
// Así no dejamos un "\r\n" o "\n" huérfano antes.
let inicioEliminar = secondOccurrence;
while (inicioEliminar > 0 && doc[inicioEliminar - 1] !== '\n') {
  inicioEliminar--;
}
// Retroceder un `\r` si existe (CRLF)
if (inicioEliminar > 0 && doc[inicioEliminar - 1] === '\r') {
  inicioEliminar--;
}

// Encontrar el inicio de "## 2. ESTADO ACTUAL"
const finEliminar = doc.indexOf(markerEnd);
if (finEliminar === -1) {
  log('❌ No encontré "## 2. ESTADO ACTUAL". Abortando.');
  process.exit(1);
}

// El bloque a eliminar va desde inicioEliminar hasta finEliminar (sin incluir el marker final).
const bloqueEliminado = doc.slice(inicioEliminar, finEliminar);
const lineasEliminadas = (bloqueEliminado.match(/\n/g) || []).length;

log(`🗑️  Bloque a eliminar:`);
log(`   Desde: índice ${inicioEliminar}`);
log(`   Hasta: índice ${finEliminar}`);
log(`   Tamaño: ${bloqueEliminado.length} chars, ${lineasEliminadas} líneas`);
log('');

// Reconstruir: preservar el primer bloque + el separador `---` + `## 2. ESTADO ACTUAL...`
// El primer bloque termina con "...del <archivo>.bak-*).\r\n\r\n---\r\n\r\n" antes de la 2da ocurrencia.
// Verificamos qué hay justo antes de inicioEliminar.

const antes = doc.slice(Math.max(0, inicioEliminar - 40), inicioEliminar);
log(`🔎 Contexto antes del corte: ${JSON.stringify(antes)}`);
log('');

// Construir el nuevo doc
const nuevoDoc = doc.slice(0, inicioEliminar) + doc.slice(finEliminar);

if (nuevoDoc === doc) {
  log('⚠️  No cambió nada. Abortando.');
  process.exit(0);
}

// Verificación: no deben quedar más de 1 ocurrencia del marker1
const nuevasCount1 = (nuevoDoc.match(new RegExp(marker1.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
if (nuevasCount1 !== 1) {
  log(`❌ Tras el fix, "${marker1}" aparece ${nuevasCount1} veces (esperaba 1).`);
  log('   Abortando — NO se escribió el archivo.');
  process.exit(1);
}

// Escribir con backup
backup(TARGET);
fs.writeFileSync(TARGET, nuevoDoc, 'utf8');

log(`✅ Reparación aplicada.`);
log(`   "${marker1}": ${count1} → ${nuevasCount1}`);
log(`   "${marker2}": ${count2} → 1`);
log(`   Líneas eliminadas: ~${lineasEliminadas}`);
log('');
log('📋 Instrucciones de commit:');
log('   1. git diff docs/SESSION_HANDOFF.md');
log('   2. git add docs/SESSION_HANDOFF.md');
log('   3. git commit -m "docs(sprint-0): reparar handoff duplicado post-Grupo F"');
log('   4. git push origin main');
log('   5. del docs\\SESSION_HANDOFF.md.bak-fix-*');