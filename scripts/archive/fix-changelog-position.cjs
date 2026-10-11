/**
 * fix-changelog-position.cjs
 * Mueve la entrada [4.5.2] del final del CHANGELOG.md al lugar correcto
 * (después del header "Keep a Changelog", antes de [4.5.0]).
 *
 * Uso: node scripts\fix-changelog-position.cjs
 */

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const FILE = path.join(ROOT, 'CHANGELOG.md');

console.log('\n🔧 Fix CHANGELOG.md — reposicionar entrada [4.5.2]\n');

if (!fs.existsSync(FILE)) {
  console.error('❌ No existe CHANGELOG.md');
  process.exit(1);
}

let content = fs.readFileSync(FILE, 'utf8');
const original = content;

// ── 1. Detectar si la entrada [4.5.2] ya está al inicio ──
const headerMarker = '## 📌 [4.5.0] - 2026-09-21';
const entryMarker = '## 📌 [4.5.2] - 2026-09-22';

const headerIdx = content.indexOf(headerMarker);
const entryIdx = content.indexOf(entryMarker);

if (entryIdx === -1) {
  console.error('❌ No se encontró la entrada [4.5.2] en CHANGELOG.md');
  process.exit(1);
}

if (headerIdx === -1) {
  console.error('❌ No se encontró la entrada [4.5.0] (referencia).');
  process.exit(1);
}

// Si [4.5.2] está ANTES de [4.5.0] → ya está en el lugar correcto
if (entryIdx < headerIdx) {
  console.log('✅ La entrada [4.5.2] ya está en el lugar correcto (antes de [4.5.0]).');
  console.log('   No se hizo nada.');
  process.exit(0);
}

// ── 2. Extraer el bloque [4.5.2] completo ──
// Va desde "## 📌 [4.5.2]" hasta el próximo "## 📌 [" o "---\n\n## 📌"
// (o hasta el fin del archivo si es la última)

const afterEntry = content.slice(entryIdx + entryMarker.length);
const nextEntryRel = afterEntry.search(/\n---\n\n## 📌 \[/);

let entryEndIdx;
if (nextEntryRel === -1) {
  // Es la última entrada del archivo
  entryEndIdx = content.length;
} else {
  // Termina justo antes del próximo "---\n\n## 📌 ["
  entryEndIdx = entryIdx + entryMarker.length + nextEntryRel;
}

const entryBlock = content.slice(entryIdx, entryEndIdx);
console.log(`📦 Bloque [4.5.2] extraído: ${entryBlock.length} bytes`);

// ── 3. Quitar el bloque de su posición actual ──
content = content.slice(0, entryIdx) + content.slice(entryEndIdx);

// ── 4. Insertar el bloque ANTES de [4.5.0] ──
// Buscamos la línea previa a "## 📌 [4.5.0]" que contiene "---" y un \n\n
const beforeHeader = content.slice(0, headerIdx);
const lastSepIdx = beforeHeader.lastIndexOf('---\n\n');

if (lastSepIdx === -1) {
  console.error('❌ No se encontró separador antes de [4.5.0]. Abortando.');
  process.exit(1);
}

const insertAt = lastSepIdx + '---\n\n'.length;
const entryWithSep = entryBlock.trimEnd() + '\n\n---\n\n';

content = content.slice(0, insertAt) + entryWithSep + content.slice(insertAt);

// ── 5. Verificar ──
const newEntryIdx = content.indexOf(entryMarker);
const newHeaderIdx = content.indexOf(headerMarker);

if (newEntryIdx === -1 || newHeaderIdx === -1) {
  console.error('❌ Verificación falló: no encuentro los markers después del fix.');
  process.exit(1);
}

if (newEntryIdx > newHeaderIdx) {
  console.error('❌ Verificación falló: [4.5.2] todavía queda después de [4.5.0].');
  process.exit(1);
}

// ── 6. Backup + escribir ──
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const backup = `${FILE}.bak-fixchangelog-${ts}`;
fs.copyFileSync(FILE, backup);
fs.writeFileSync(FILE, content, 'utf8');

console.log(`⚠️  Backup: ${path.basename(backup)}`);
console.log(`✅ CHANGELOG.md arreglado.`);
console.log(`   Antes: ${original.length} bytes`);
console.log(`   Después: ${content.length} bytes`);
console.log(`   [4.5.2] posición: ${newEntryIdx} (debe ser < ${newHeaderIdx})`);
console.log('');
console.log('📋 Verificar con:');
console.log('   findstr /N /C:"## 📌 [4.5.0]" /C:"## 📌 [4.5.2]" CHANGELOG.md');
console.log('');