// scripts/diag-encoding-v2.cjs
// Diagnóstico EXTENDIDO de mojibake. Detecta:
//   - Patrones clásicos (ÃX, âX, ðX, ÂX)
//   - Replacement character (U+FFFD) — pérdida irreversible
//   - Otros patrones sospechosos
//
// Uso: node scripts\diag-encoding-v2.cjs

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const EXTENSIONS = ['.html', '.js', '.css', '.md', '.json'];
const EXCLUDE_DIRS = ['node_modules', '.git', 'scripts', 'dist', 'build', '.fly'];

// Detección de patrones problemáticos
const PATTERNS = {
  // Replacement character U+FFFD — byte perdido irreversible
  replacementChar: /\uFFFD/,
  // Mojibake clásico (UTF-8 leído como Latin-1)
  classicMojibake: /Ã[\x80-\xBF]|â[\x80-\xBF]|ð[\x80-\xBF]|Â[\x80-\xBF]/,
  // Mojibake inverso (Latin-1 leído como UTF-8)
  inverseMojibake: /[\xC2\xC3][\x80-\xBF]{1,2}/g,
  // Secuencias raras de control characters
  controlChars: /[\x00-\x08\x0B\x0C\x0E-\x1F]/,
};

function walkDir(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (EXCLUDE_DIRS.includes(entry.name)) continue;
      walkDir(fullPath, files);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (EXTENSIONS.includes(ext)) files.push(fullPath);
    }
  }
  return files;
}

function analyzeFile(filePath) {
  const relative = path.relative(ROOT, filePath);
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    return { file: relative, status: 'error', error: err.message };
  }

  const findings = [];
  for (const [name, regex] of Object.entries(PATTERNS)) {
    const matches = content.match(new RegExp(regex.source, 'g'));
    if (matches) {
      findings.push({ type: name, count: matches.length });
    }
  }

  if (findings.length === 0) return { file: relative, status: 'clean' };

  // Extraer preview del primer finding
  const allFindings = [];
  for (const [name, regex] of Object.entries(PATTERNS)) {
    const re = new RegExp(regex.source, 'g');
    let match;
    while ((match = re.exec(content)) !== null) {
      const idx = match.index;
      const context = content.slice(Math.max(0, idx - 30), Math.min(content.length, idx + 50));
      allFindings.push({
        type: name,
        position: idx,
        preview: context.replace(/\r?\n/g, '\\n').replace(/[\x00-\x1F\x7F]/g, '?')
      });
      if (allFindings.length >= 10) break; // límite de 10 por archivo
    }
  }

  return { file: relative, status: 'suspect', findings, allFindings };
}

console.log('\n🔍 Diagnóstico EXTENDIDO de mojibake (NO modifica archivos)\n');

const files = walkDir(ROOT);
console.log(`📂 Escaneando ${files.length} archivos...\n`);

const results = files.map(analyzeFile);
const suspects = results.filter(r => r.status === 'suspect');
const errors = results.filter(r => r.status === 'error');
const clean = results.filter(r => r.status === 'clean');

console.log('═══════════════════════════════════════════════════════');
console.log('RESULTADOS');
console.log('═══════════════════════════════════════════════════════\n');

if (suspects.length > 0) {
  console.log(`🚨 ARCHIVOS SOSPECHOSOS (${suspects.length}):\n`);
  suspects.sort((a, b) => {
    const sumA = a.findings.reduce((s, f) => s + f.count, 0);
    const sumB = b.findings.reduce((s, f) => s + f.count, 0);
    return sumB - sumA;
  });
  for (const r of suspects) {
    const summary = r.findings.map(f => `${f.type}=${f.count}`).join(', ');
    console.log(`📄 ${r.file}`);
    console.log(`   Findings: ${summary}`);
    for (const f of r.allFindings.slice(0, 3)) {
      console.log(`   [${f.type}] → ${f.preview}`);
    }
    console.log('');
  }
} else {
  console.log('✅ Ningún archivo con problemas detectado.\n');
}

if (errors.length > 0) {
  console.log(`❌ ERRORES (${errors.length}):`);
  errors.forEach(r => console.log(`   ${r.file}: ${r.error}`));
  console.log('');
}

console.log('═══════════════════════════════════════════════════════');
console.log(`✅ Limpios:      ${clean.length}`);
console.log(`🚨 Sospechosos:  ${suspects.length}`);
console.log(`❌ Errores:      ${errors.length}`);
console.log('═══════════════════════════════════════════════════════\n');