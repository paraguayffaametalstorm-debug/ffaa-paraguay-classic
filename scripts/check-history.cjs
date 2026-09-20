// scripts/check-history.cjs
// Recorre el historial de git de un archivo y reporta cuáles commits están corruptos.
// Uso: node scripts\check-history.cjs <archivo> <N>
//   Ejemplo: node scripts\check-history.cjs index.html 10

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const file = process.argv[2];
const N = parseInt(process.argv[3] || '10', 10);

if (!file) {
  console.error('Uso: node scripts\\check-history.cjs <archivo> <N>');
  process.exit(1);
}

const MOJIBAKE_RE = /\uFFFD/;  // replacement char
const CTRL_RE = /[\x00-\x08\x0B\x0C\x0E-\x1F]/;

console.log(`\n🔍 Buscando corrupción en el historial de: ${file}\n`);

// Obtener commits que tocaron este archivo
const log = execSync(`git log --format="%H %h %s" -${N} -- "${file}"`, { encoding: 'utf8' });
const commits = log.trim().split('\n').filter(Boolean);

if (commits.length === 0) {
  console.error('❌ No se encontraron commits para ese archivo.');
  process.exit(1);
}

console.log(`📜 Analizando ${commits.length} commits...\n`);

const results = [];
for (const line of commits) {
  const [fullHash, shortHash, ...subjectParts] = line.split(' ');
  const subject = subjectParts.join(' ');
  try {
    const content = execSync(`git show ${fullHash}:"${file}"`, { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 });
    const replCount = (content.match(/\uFFFD/g) || []).length;
    const ctrlCount = (content.match(CTRL_RE) || []).length;
    results.push({
      hash: shortHash,
      subject: subject.slice(0, 60),
      replCount,
      ctrlCount,
      status: replCount === 0 && ctrlCount === 0 ? 'clean' : 'corrupt'
    });
  } catch (err) {
    results.push({
      hash: shortHash,
      subject: subject.slice(0, 60),
      status: 'error',
      error: err.message.slice(0, 60)
    });
  }
}

console.log('═══════════════════════════════════════════════════════');
console.log(`RESULTADOS para ${file}`);
console.log('═══════════════════════════════════════════════════════\n');

for (const r of results) {
  if (r.status === 'clean') {
    console.log(`✅ ${r.hash}  ${r.subject}  (LIMPIO)`);
  } else if (r.status === 'corrupt') {
    console.log(`❌ ${r.hash}  ${r.subject}  (repl=${r.replCount}, ctrl=${r.ctrlCount})`);
  } else {
    console.log(`⚠️  ${r.hash}  ${r.subject}  ERROR: ${r.error}`);
  }
}

console.log('\n═══════════════════════════════════════════════════════');
const clean = results.filter(r => r.status === 'clean');
console.log(`✅ Limpios: ${clean.length}/${results.length}`);
if (clean.length > 0) {
  console.log(`\n💡 El commit MÁS ANTIGUO limpio encontrado: ${clean[clean.length - 1].hash}`);
  console.log('   Verificar si todos los commits previos también están limpios.');
}
console.log('═══════════════════════════════════════════════════════\n');