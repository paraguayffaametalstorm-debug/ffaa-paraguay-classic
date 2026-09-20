// scripts/analyze-fffd.cjs
// Analiza cuántos U+FFFD hay y cómo están agrupados en un archivo.
// También extrae TODOS los contextos únicos.
//
// Uso: node scripts\analyze-fffd.cjs js\main.js

const fs = require('fs');
const path = require('path');

const fileName = process.argv[2];
if (!fileName) {
  console.error('Uso: node scripts\\analyze-fffd.cjs <archivo>');
  process.exit(1);
}

const filePath = path.join(__dirname, '..', fileName);
const content = fs.readFileSync(filePath, 'utf8');

const groups = new Map();
const examples = new Map();

const regex = /\uFFFD+/g;
let match;
while ((match = regex.exec(content)) !== null) {
  const len = match[0].length;
  groups.set(len, (groups.get(len) || 0) + 1);
  if (!examples.has(len)) {
    examples.set(len, []);
  }
  // Guardar hasta 20 contextos por longitud
  if (examples.get(len).length < 20) {
    const start = Math.max(0, match.index - 40);
    const end = Math.min(content.length, match.index + match[0].length + 40);
    const context = content.slice(start, end).replace(/\r?\n/g, '\\n');
    examples.get(len).push({
      position: match.index,
      context
    });
  }
}

console.log('');
console.log(`📄 Archivo: ${fileName}`);
console.log(`📏 Tamaño: ${content.length} chars`);
console.log(`🔢 Total de secuencias U+FFFD: ${[...groups.values()].reduce((a, b) => a + b, 0)}`);
console.log(`🔢 Total de U+FFFD individuales: ${[...groups.entries()].reduce((a, [len, count]) => a + len * count, 0)}`);
console.log('');

console.log('═══════════════════════════════════════════════════════');
console.log('DISTRIBUCIÓN POR LONGITUD');
console.log('═══════════════════════════════════════════════════════');
console.log('');

const sorted = [...groups.entries()].sort((a, b) => a[0] - b[0]);
for (const [len, count] of sorted) {
  console.log(`Len ${len}: ${count} ocurrencias`);
}

console.log('');
console.log('═══════════════════════════════════════════════════════');
console.log('TODOS LOS CONTEXTOS (ordenados por posición)');
console.log('═══════════════════════════════════════════════════════');
console.log('');

// Juntar todos los contextos y ordenar por posición
const all = [];
for (const [len, ctxs] of examples.entries()) {
  for (const c of ctxs) {
    all.push({ len, ...c });
  }
}
all.sort((a, b) => a.position - b.position);

for (const e of all) {
  console.log(`[pos ${e.position}, len ${e.len}]`);
  console.log(`   ${e.context}`);
  console.log('');
}