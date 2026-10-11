#!/usr/bin/env node
/**
 * fix-docs-sync-v2.cjs
 * 
 * Correcciones ADICIONALES de referencias rotas que el script v1 no corrigió.
 * 
 * Uso:
 *   node scripts/fix-docs-sync-v2.cjs          → DRY RUN
 *   node scripts/fix-docs-sync-v2.cjs --apply  → aplica
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const APPLY = process.argv.includes('--apply');

const CORRECCIONES = {

  'docs/deployment/DEPLOYMENT_GUIDE.md': [
    {
      buscar: /\[`docs\/adr\/ADR-009-migracion-render\.md`\]\(\.\/docs\/adr\/ADR-009-migracion-render\.md\)/g,
      reemplazar: '[`docs/adr/ADR-009-migracion-render.md`](../adr/ADR-009-migracion-render.md)',
      descripcion: 'Corregir link a ADR-009',
    },
  ],

  'docs/deployment/DEPLOYMENT_STATE.md': [
    {
      buscar: /\[`docs\/adr\/ADR-009-migracion-render\.md`\]\(\.\/docs\/adr\/ADR-009-migracion-render\.md\)/g,
      reemplazar: '[`docs/adr/ADR-009-migracion-render.md`](../adr/ADR-009-migracion-render.md)',
      descripcion: 'Corregir link a ADR-009',
    },
  ],

  'docs/planning/PLAN_TRABAJO.md': [
    {
      buscar: /- \[`CHANGELOG\.md`\]\(\.\/CHANGELOG\.md\) — Histórico de versiones\./g,
      reemplazar: '- [`CHANGELOG.md`](../../CHANGELOG.md) — Histórico de versiones.',
      descripcion: 'Corregir link a CHANGELOG',
    },
    {
      buscar: /Ver \[`RELEASE\.md`\]\(\.\/RELEASE\.md\) para el workflow completo\./g,
      reemplazar: 'Ver [`RELEASE.md`](../deployment/RELEASE.md) para el workflow completo.',
      descripcion: 'Corregir link a RELEASE',
    },
  ],

  'docs/planning/PLAN_TRABAJO_VETERANOS.md': [
    {
      buscar: /\[`docs\/adr\/ADR-010-seccion-veteranos\.md`\]\(\.\/docs\/adr\/ADR-010-seccion-veteranos\.md\)/g,
      reemplazar: '[`docs/adr/ADR-010-seccion-veteranos.md`](../adr/ADR-010-seccion-veteranos.md)',
      descripcion: 'Corregir link a ADR-010',
    },
    {
      buscar: /\[`docs\/adr\/ADR-002-politica-endpoints-publico-privado\.md`\]\(\.\/docs\/adr\/ADR-002-politica-endpoints-publico-privado\.md\)/g,
      reemplazar: '[`docs/adr/ADR-002-politica-endpoints-publico-privado.md`](../adr/ADR-002-politica-endpoints-publico-privado.md)',
      descripcion: 'Corregir link a ADR-002',
    },
    {
      buscar: /\[`docs\/adr\/ADR-004-cuota-admin\.md`\]\(\.\/docs\/adr\/ADR-004-cuota-admin\.md\)/g,
      reemplazar: '[`docs/adr/ADR-004-cuota-admin.md`](../adr/ADR-004-cuota-admin.md)',
      descripcion: 'Corregir link a ADR-004',
    },
    {
      buscar: /\[`admin-sections\.template\.js`\]\(\.\/admin-sections\.template\.js\)/g,
      reemplazar: '[`admin-sections.template.js`](../templates/admin-sections.template.js)',
      descripcion: 'Corregir link a template',
    },
    {
      buscar: /\[`normativa-v3\.0-borrador\.md`\]\(\.\/normativa-v3\.0-borrador\.md\)/g,
      reemplazar: '[`normativa-v3.0-borrador.md`](../normativa/normativa-v3.0-borrador.md)',
      descripcion: 'Corregir link a normativa',
    },
  ],

  'docs/planning/BACKLOG.md': [
    {
      buscar: /- \[`CHANGELOG\.md`\]\(\.\/CHANGELOG\.md\) — Historial de versiones publicadas\./g,
      reemplazar: '- [`CHANGELOG.md`](../../CHANGELOG.md) — Historial de versiones publicadas.',
      descripcion: 'Corregir link a CHANGELOG',
    },
  ],

  'docs/planning/ROADMAP.md': [
    {
      buscar: /- \[`CHANGELOG\.md`\]\(\.\/CHANGELOG\.md\) — Historial de versiones publicadas\./g,
      reemplazar: '- [`CHANGELOG.md`](../../CHANGELOG.md) — Historial de versiones publicadas.',
      descripcion: 'Corregir link a CHANGELOG',
    },
  ],

};

function log(msg, tipo = 'info') {
  const prefix = { info: '  ', ok: '✅', warn: '⚠️ ', err: '❌' }[tipo] || '  ';
  console.log(`${prefix} ${msg}`);
}

function procesarArchivo(archivoRel, correcciones) {
  const absPath = path.join(ROOT, archivoRel);
  if (!fs.existsSync(absPath)) {
    log(`NO EXISTE: ${archivoRel}`, 'warn');
    return { aplicadas: 0 };
  }

  let contenido = fs.readFileSync(absPath, 'utf8');
  const original = contenido;
  let aplicadas = 0;

  for (const corr of correcciones) {
    const matches = contenido.match(corr.buscar);
    if (matches && matches.length > 0) {
      contenido = contenido.replace(corr.buscar, corr.reemplazar);
      aplicadas += matches.length;
      log(`  ✅ ${corr.descripcion} (${matches.length} ocurrencia${matches.length > 1 ? 's' : ''})`, 'ok');
    } else {
      log(`  ⏭️  No encontrado: ${corr.descripcion}`, 'info');
    }
  }

  if (contenido !== original && APPLY) {
    fs.writeFileSync(absPath, contenido, 'utf8');
  }

  return { aplicadas };
}

console.log('');
console.log('═══════════════════════════════════════════════════════════════');
console.log('  FIX-DOCS-SYNC v2 — Correcciones adicionales');
console.log('═══════════════════════════════════════════════════════════════');
console.log(`  Modo: ${APPLY ? '🔴 APPLY' : '🟢 DRY RUN'}`);
console.log('');

let total = 0;
let archivos = 0;

for (const [archivoRel, correcciones] of Object.entries(CORRECCIONES)) {
  console.log(`📄 Procesando: ${archivoRel}`);
  const result = procesarArchivo(archivoRel, correcciones);
  total += result.aplicadas;
  if (result.aplicadas > 0) archivos++;
  console.log('');
}

console.log('═══════════════════════════════════════════════════════════════');
console.log('  RESUMEN');
console.log('═══════════════════════════════════════════════════════════════');
console.log(`  Archivos con cambios: ${archivos}`);
console.log(`  Correcciones aplicadas: ${total}`);
console.log('');

if (!APPLY && total > 0) {
  console.log('  ℹ️  Para aplicar: node scripts/fix-docs-sync-v2.cjs --apply');
  console.log('');
}