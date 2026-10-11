#!/usr/bin/env node
/**
 * ============================================================================
 * PARAGUAY-FFAA | METALSTORM
 * audit-api-endpoints.cjs
 * ============================================================================
 * Escanea src/routes/ y extrae todos los endpoints reales (method + path).
 * Genera docs/audit/api-endpoints-real.md como fuente de verdad para FIX-405.
 *
 * Uso:
 *   node scripts/audit-api-endpoints.cjs
 *
 * Autor: Comando C4ISR
 * Fecha: 2026-10-11
 * ============================================================================
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ROUTES_DIR = path.join(ROOT, 'src', 'routes');
const OUT_DIR = path.join(ROOT, 'docs', 'audit');
const OUT_FILE = path.join(OUT_DIR, 'api-endpoints-real.md');

// ─────────────────────────────────────────────────────────────
// 0. Validaciones previas
// ─────────────────────────────────────────────────────────────
if (!fs.existsSync(ROUTES_DIR)) {
  console.error(`❌ No existe: ${ROUTES_DIR}`);
  process.exit(1);
}

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  console.log(`📁 Creado: ${OUT_DIR}`);
}

// ─────────────────────────────────────────────────────────────
// 1. Recolectar archivos .js (recursivo, por si hay subcarpetas)
// ─────────────────────────────────────────────────────────────
function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      files.push(...walk(full));
    } else if (e.isFile() && e.name.endsWith('.js')) {
      files.push(full);
    }
  }
  return files;
}

const routeFiles = walk(ROUTES_DIR);
console.log(`📂 Archivos .js encontrados: ${routeFiles.length}`);

// ─────────────────────────────────────────────────────────────
// 2. Extraer endpoints de cada archivo
// ─────────────────────────────────────────────────────────────
const endpoints = [];
const errors = [];

for (const file of routeFiles) {
  const relPath = path.relative(ROOT, file).replace(/\\/g, '/');
  const content = fs.readFileSync(file, 'utf8');

  // Match: router.get('/path', ...) | router.post('/path', ...)
  // Soporta comillas simples, dobles y backticks.
  const re = /router\s*\.\s*(get|post|put|patch|delete|use)\s*\(\s*['"`]([^'"`]+)['"`]/g;
  let m;
  let countInFile = 0;
  while ((m = re.exec(content)) !== null) {
    endpoints.push({
      method: m[1].toUpperCase(),
      path: m[2],
      file: relPath,
    });
    countInFile++;
  }

  if (countInFile === 0) {
    errors.push(`⚠️  ${relPath}: no se encontraron endpoints (¿el router usa otro patrón?)`);
  }
}

// ─────────────────────────────────────────────────────────────
// 3. Agrupar por archivo
// ─────────────────────────────────────────────────────────────
const byFile = {};
for (const ep of endpoints) {
  if (!byFile[ep.file]) byFile[ep.file] = [];
  byFile[ep.file].push(ep);
}

// ─────────────────────────────────────────────────────────────
// 4. Generar Markdown
// ─────────────────────────────────────────────────────────────
const today = new Date().toISOString().slice(0, 10);

let md = `# 📡 Inventario Real de Endpoints — ${today}\n\n`;
md += `> Generado automáticamente por \`scripts/audit-api-endpoints.cjs\`\n`;
md += `> **Fuente de verdad** para alinear \`docs/architecture/API_REFERENCE.md\` (FIX-405).\n\n`;
md += `## 📊 Resumen\n\n`;
md += `| Métrica | Valor |\n|---|---|\n`;
md += `| Total de endpoints | **${endpoints.length}** |\n`;
md += `| Archivos escaneados | ${routeFiles.length} |\n`;
md += `| Archivos con endpoints | ${Object.keys(byFile).length} |\n\n`;

md += `## 📋 Índice por archivo\n\n`;
for (const [file, eps] of Object.entries(byFile).sort()) {
  md += `- [\`${file}\`](#${file.replace(/[\/.]/g, '').toLowerCase()}) — ${eps.length} endpoints\n`;
}
md += `\n---\n\n`;

// Detalle por archivo
for (const [file, eps] of Object.entries(byFile).sort()) {
  md += `## \`${file}\`\n\n`;
  md += `**Total:** ${eps.length} endpoints\n\n`;
  md += `| Método | Path |\n|---|---|\n`;
  const sorted = [...eps].sort((a, b) => {
    if (a.path !== b.path) return a.path.localeCompare(b.path);
    return a.method.localeCompare(b.method);
  });
  for (const ep of sorted) {
    md += `| \`${ep.method}\` | \`${ep.path}\` |\n`;
  }
  md += `\n`;
}

// Lista plana para grep rápido
md += `---\n\n## 🔤 Lista plana (para grep)\n\n\`\`\`\n`;
const flat = [...endpoints].sort((a, b) => {
  if (a.path !== b.path) return a.path.localeCompare(b.path);
  return a.method.localeCompare(b.method);
});
for (const ep of flat) {
  md += `${ep.method.padEnd(6)} ${ep.path}\n`;
}
md += `\`\`\`\n\n`;

// Warnings
if (errors.length > 0) {
  md += `---\n\n## ⚠️ Warnings\n\n`;
  for (const e of errors) md += `- ${e}\n`;
}

// ─────────────────────────────────────────────────────────────
// 5. Escribir archivo
// ─────────────────────────────────────────────────────────────
fs.writeFileSync(OUT_FILE, md, 'utf8');

console.log(`\n✅ Reporte generado: ${path.relative(ROOT, OUT_FILE)}`);
console.log(`   Total de endpoints: ${endpoints.length}`);
console.log(`   Archivos con endpoints: ${Object.keys(byFile).length}`);
if (errors.length > 0) {
  console.log(`\n⚠️  ${errors.length} warnings:`);
  errors.forEach(e => console.log('   ' + e));
}
console.log('');