#!/usr/bin/env node
/**
 * fix-docs-sync.cjs
 * 
 * Sincronización post-refactor de docs/:
 *   - Corrige referencias rotas en archivos .md dentro de docs/
 *   - Actualiza versiones y fechas desactualizadas
 *   - Agrega sección de refactor al CURRENT_STATE.md
 *   - Valida que no queden referencias sospechosas
 * 
 * Uso:
 *   node scripts/fix-docs-sync.cjs          → DRY RUN (solo reporta)
 *   node scripts/fix-docs-sync.cjs --apply  → aplica los cambios
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

// Mapa de correcciones por archivo
// Estructura: { 'ruta/al/archivo.md': [ { buscar, reemplazar, descripcion } ] }
const CORRECCIONES = {

  // -------------------------------------------------------------
  // docs/planning/CURRENT_STATE.md
  // -------------------------------------------------------------
  'docs/planning/CURRENT_STATE.md': [
    {
      buscar: /\[`docs\/adr\/ADR-009-migracion-render\.md`\]\(\.\/docs\/adr\/ADR-009-migracion-render\.md\)/g,
      reemplazar: '[`docs/adr/ADR-009-migracion-render.md`](../adr/ADR-009-migracion-render.md)',
      descripcion: 'Corregir link a ADR-009',
    },
    {
      buscar: /\[`docs\/incidentes\/HALL-071-closed-reason\.md`\]\(\.\/docs\/incidentes\/HALL-071-closed-reason\.md\)/g,
      reemplazar: '[`docs/incidentes/HALL-071-closed-reason.md`](../incidentes/HALL-071-closed-reason.md)',
      descripcion: 'Corregir link a HALL-071',
    },
    {
      buscar: /\[`docs\/incidentes\/HALL-072-scheduler-render\.md`\]\(\.\/docs\/incidentes\/HALL-072-scheduler-render\.md\)/g,
      reemplazar: '[`docs/incidentes/HALL-072-scheduler-render.md`](../incidentes/HALL-072-scheduler-render.md)',
      descripcion: 'Corregir link a HALL-072',
    },
    {
      buscar: /\*\*Versión Activa:\*\* v4\.5\.10 \(Sprint 3 completado — 287 tests, health checks\)/g,
      reemplazar: '**Versión Activa:** v4.8.7 (Refactorización de docs + Release automático)',
      descripcion: 'Actualizar versión activa v4.5.10 → v4.8.7',
    },
    {
      buscar: /^# 📊 CURRENT STATE - PARAGUAY-FFAA \| METALSTORM$/m,
      reemplazar: `# 📊 CURRENT STATE - PARAGUAY-FFAA | METALSTORM

---

## Cambios Recientes (2026-10-11) — Refactorización de docs/ + Release v4.8.7

### Reorganización de Documentación

- **24 archivos movidos** a \`docs/\` con subcarpetas temáticas:
  - \`docs/architecture/\` (ARCHITECTURE, API_REFERENCE, MIGRACION_SQL_REFERENCE)
  - \`docs/auditorias/\` (auditoria-frontend-legacy, auditoria-sprint-1)
  - \`docs/deployment/\` (DEPLOYMENT_GUIDE, DEPLOYMENT_STATE, PWA_SETUP, RELEASE)
  - \`docs/handoffs/\` (5 archivos handoff)
  - \`docs/operations/\` (USER_MANUAL, POLITICA_INACTIVACION, FIXES_APPLIED)
  - \`docs/planning/\` (7 archivos de planificación)
- **15 links corregidos** en \`README.md\` y \`docs/adr/ADR-010-seccion-veteranos.md\`.
- **1 índice maestro creado** (\`docs/README.md\`).
- **3 archivos basura eliminados**.
- **Release v4.8.7** publicado automáticamente por \`release-please\`.

### Beneficios

- Directorio raíz limpio: solo \`README.md\` y \`CHANGELOG.md\` (de 19 a 2 \`.md\`).
- Navegación clara por categorías temáticas.
- Escalable para futuras adiciones.

### Referencias

- PR #4 (refactor): https://github.com/paraguayffaametalstorm-debug/ffaa-paraguay-classic/pull/4
- PR #5 (release): https://github.com/paraguayffaametalstorm-debug/ffaa-paraguay-classic/pull/5
- Release: https://github.com/paraguayffaametalstorm-debug/ffaa-paraguay-classic/releases/tag/v4.8.7`,
      descripcion: 'Insertar sección de refactor post-header',
    },
  ],

  // -------------------------------------------------------------
  // docs/planning/ROADMAP.md
  // -------------------------------------------------------------
  'docs/planning/ROADMAP.md': [
    {
      buscar: /> \*\*Última actualización:\*\* 2026-09-17/g,
      reemplazar: '> **Última actualización:** 2026-10-11',
      descripcion: 'Actualizar fecha última actualización',
    },
    {
      buscar: /- \[`CHANGELOG\.md`\]\(\.\/CHANGELOG\.md\) — Historial de versiones publicadas\./g,
      reemplazar: '- [`CHANGELOG.md`](../../CHANGELOG.md) — Historial de versiones publicadas.',
      descripcion: 'Corregir link a CHANGELOG',
    },
    {
      buscar: /- \[`docs\/rfc\/`\]\(\.\/docs\/rfc\/\) — Propuestas formales\./g,
      reemplazar: '- [`docs/rfc/`](../rfc/) — Propuestas formales.',
      descripcion: 'Corregir link a docs/rfc/',
    },
    {
      buscar: /- \[`docs\/adr\/`\]\(\.\/docs\/adr\/\) — Decisiones arquitectónicas\./g,
      reemplazar: '- [`docs/adr/`](../adr/) — Decisiones arquitectónicas.',
      descripcion: 'Corregir link a docs/adr/',
    },
    {
      buscar: /- \[`docs\/SESSION_HANDOFF\.md`\]\(\.\/docs\/SESSION_HANDOFF\.md\) — Handoff entre sesiones\./g,
      reemplazar: '- [`docs/handoffs/SESSION_HANDOFF.md`](../handoffs/SESSION_HANDOFF.md) — Handoff entre sesiones.',
      descripcion: 'Corregir link a SESSION_HANDOFF',
    },
  ],

  // -------------------------------------------------------------
  // docs/planning/BACKLOG.md
  // -------------------------------------------------------------
  'docs/planning/BACKLOG.md': [
    {
      buscar: /> \*\*Última actualización:\*\* 2026-09-21/g,
      reemplazar: '> **Última actualización:** 2026-10-11',
      descripcion: 'Actualizar fecha última actualización',
    },
    {
      buscar: /- \[`CHANGELOG\.md`\]\(\.\/CHANGELOG\.md\) — Historial de versiones publicadas\./g,
      reemplazar: '- [`CHANGELOG.md`](../../CHANGELOG.md) — Historial de versiones publicadas.',
      descripcion: 'Corregir link a CHANGELOG',
    },
    {
      buscar: /- \[`docs\/rfc\/`\]\(\.\/docs\/rfc\/\) — Propuestas formales \(Request for Comments\)\./g,
      reemplazar: '- [`docs/rfc/`](../rfc/) — Propuestas formales (Request for Comments).',
      descripcion: 'Corregir link a docs/rfc/',
    },
    {
      buscar: /- \[`docs\/adr\/`\]\(\.\/docs\/adr\/\) — Decisiones arquitectónicas\./g,
      reemplazar: '- [`docs/adr/`](../adr/) — Decisiones arquitectónicas.',
      descripcion: 'Corregir link a docs/adr/',
    },
    {
      buscar: /- \[`docs\/SESSION_HANDOFF\.md`\]\(\.\/docs\/SESSION_HANDOFF\.md\) — Handoff entre sesiones\./g,
      reemplazar: '- [`docs/handoffs/SESSION_HANDOFF.md`](../handoffs/SESSION_HANDOFF.md) — Handoff entre sesiones.',
      descripcion: 'Corregir link a SESSION_HANDOFF',
    },
  ],

  // -------------------------------------------------------------
  // docs/planning/PLAN_TRABAJO.md
  // -------------------------------------------------------------
  'docs/planning/PLAN_TRABAJO.md': [
    {
      buscar: /- \[`docs\/adr\/`\]\(\.\/docs\/adr\/\) — Decisiones arquitectónicas\./g,
      reemplazar: '- [`docs/adr/`](../adr/) — Decisiones arquitectónicas.',
      descripcion: 'Corregir link a docs/adr/',
    },
    {
      buscar: /- \[`docs\/rfc\/`\]\(\.\/docs\/rfc\/\) — Propuestas formales\./g,
      reemplazar: '- [`docs/rfc/`](../rfc/) — Propuestas formales.',
      descripcion: 'Corregir link a docs/rfc/',
    },
    {
      buscar: /- \[`docs\/SESSION_HANDOFF\.md`\]\(\.\/docs\/SESSION_HANDOFF\.md\) — Handoff entre sesiones\./g,
      reemplazar: '- [`docs/handoffs/SESSION_HANDOFF.md`](../handoffs/SESSION_HANDOFF.md) — Handoff entre sesiones.',
      descripcion: 'Corregir link a SESSION_HANDOFF',
    },
  ],

  // -------------------------------------------------------------
  // docs/operations/FIXES_APPLIED.md
  // -------------------------------------------------------------
  'docs/operations/FIXES_APPLIED.md': [
    {
      buscar: /\[`ARCHITECTURE\.md`\]\(\.\/ARCHITECTURE\.md\)/g,
      reemplazar: '[`docs/architecture/ARCHITECTURE.md`](../architecture/ARCHITECTURE.md)',
      descripcion: 'Corregir link a ARCHITECTURE',
    },
    {
      buscar: /\[`API_REFERENCE\.md`\]\(\.\/API_REFERENCE\.md\)/g,
      reemplazar: '[`docs/architecture/API_REFERENCE.md`](../architecture/API_REFERENCE.md)',
      descripcion: 'Corregir link a API_REFERENCE',
    },
  ],

};

// ---------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------

function log(msg, tipo = 'info') {
  const prefix = { info: '  ', ok: '✅', warn: '⚠️ ', err: '❌' }[tipo] || '  ';
  console.log(`${prefix} ${msg}`);
}

function procesarArchivo(archivoRel, correcciones) {
  const absPath = path.join(ROOT, archivoRel);
  if (!fs.existsSync(absPath)) {
    log(`NO EXISTE: ${archivoRel}`, 'warn');
    return { aplicadas: 0, noEncontradas: 0 };
  }

  let contenido = fs.readFileSync(absPath, 'utf8');
  const original = contenido;
  let aplicadas = 0;
  let noEncontradas = 0;

  for (const corr of correcciones) {
    const matches = contenido.match(corr.buscar);
    if (matches && matches.length > 0) {
      contenido = contenido.replace(corr.buscar, corr.reemplazar);
      aplicadas += matches.length;
      log(`  ✅ ${corr.descripcion} (${matches.length} ocurrencia${matches.length > 1 ? 's' : ''})`, 'ok');
    } else {
      noEncontradas++;
      log(`  ⏭️  Ya aplicado o no encontrado: ${corr.descripcion}`, 'info');
    }
  }

  if (contenido !== original && APPLY) {
    fs.writeFileSync(absPath, contenido, 'utf8');
  }

  return { aplicadas, noEncontradas, cambio: contenido !== original };
}

// ---------------------------------------------------------------
// EJECUCIÓN
// ---------------------------------------------------------------

console.log('');
console.log('═══════════════════════════════════════════════════════════════');
console.log('  FIX-DOCS-SYNC — Sincronización post-refactor');
console.log('═══════════════════════════════════════════════════════════════');
console.log(`  Modo: ${APPLY ? '🔴 APPLY (modificará archivos)' : '🟢 DRY RUN (solo reporta)'}`);
console.log(`  Raíz: ${ROOT}`);
console.log('');

let totalAplicadas = 0;
let totalNoEncontradas = 0;
let archivosConCambios = 0;

for (const [archivoRel, correcciones] of Object.entries(CORRECCIONES)) {
  console.log(`📄 Procesando: ${archivoRel}`);
  const result = procesarArchivo(archivoRel, correcciones);
  totalAplicadas += result.aplicadas;
  totalNoEncontradas += result.noEncontradas;
  if (result.cambio) archivosConCambios++;
  console.log('');
}

// ---------------------------------------------------------------
// VERIFICACIÓN DE REFERENCIAS SOSPECHOSAS
// ---------------------------------------------------------------

console.log('═══════════════════════════════════════════════════════════════');
console.log('  VERIFICACIÓN DE REFERENCIAS SOSPECHOSAS');
console.log('═══════════════════════════════════════════════════════════════');
console.log('');

function scanRecursivo(dir, resultados = []) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      scanRecursivo(fullPath, resultados);
    } else if (item.endsWith('.md')) {
      resultados.push(fullPath);
    }
  }
  return resultados;
}

// Patrones sospechosos que indican referencias rotas
const patronesSospechosos = [
  { regex: /\]\(\.\/docs\//g, desc: 'Link a ./docs/ (desde subcarpeta de docs/)' },
  { regex: /\]\(\.\/ARCHITECTURE\.md/g, desc: 'Link a ./ARCHITECTURE.md (archivo movido)' },
  { regex: /\]\(\.\/API_REFERENCE\.md/g, desc: 'Link a ./API_REFERENCE.md (archivo movido)' },
  { regex: /\]\(\.\/USER_MANUAL\.md/g, desc: 'Link a ./USER_MANUAL.md (archivo movido)' },
  { regex: /\]\(\.\/DEPLOYMENT_GUIDE\.md/g, desc: 'Link a ./DEPLOYMENT_GUIDE.md (archivo movido)' },
  { regex: /\]\(\.\/DEPLOYMENT_STATE\.md/g, desc: 'Link a ./DEPLOYMENT_STATE.md (archivo movido)' },
  { regex: /\]\(\.\/PLAN_TRABAJO\.md/g, desc: 'Link a ./PLAN_TRABAJO.md (archivo movido)' },
  { regex: /\]\(\.\/BACKLOG\.md/g, desc: 'Link a ./BACKLOG.md (archivo movido)' },
  { regex: /\]\(\.\/ROADMAP\.md/g, desc: 'Link a ./ROADMAP.md (archivo movido)' },
  { regex: /\]\(\.\/CURRENT_STATE\.md/g, desc: 'Link a ./CURRENT_STATE.md (archivo movido)' },
  { regex: /\]\(\.\/RELEASE\.md/g, desc: 'Link a ./RELEASE.md (archivo movido)' },
  { regex: /\]\(\.\/PWA_SETUP\.md/g, desc: 'Link a ./PWA_SETUP.md (archivo movido)' },
  { regex: /\]\(\.\/FIXES_APPLIED\.md/g, desc: 'Link a ./FIXES_APPLIED.md (archivo movido)' },
  { regex: /\]\(\.\/POLITICA_INACTIVACION\.md/g, desc: 'Link a ./POLITICA_INACTIVACION.md (archivo movido)' },
  { regex: /\]\(\.\/PLAN_MEJORA_CONTINUA\.md/g, desc: 'Link a ./PLAN_MEJORA_CONTINUA.md (archivo movido)' },
  { regex: /\]\(\.\/PLAN_MEJORA_ADMIN_PANEL\.md/g, desc: 'Link a ./PLAN_MEJORA_ADMIN_PANEL.md (archivo movido)' },
  { regex: /\]\(\.\/PLAN_TRABAJO_VETERANOS\.md/g, desc: 'Link a ./PLAN_TRABAJO_VETERANOS.md (archivo movido)' },
  { regex: /\]\(\.\/MIGRACION_SQL_REFERENCE\.md/g, desc: 'Link a ./MIGRACION_SQL_REFERENCE.md (archivo movido)' },
  { regex: /\]\(\.\/CHANGELOG\.md/g, desc: 'Link a ./CHANGELOG.md (desde subcarpeta)' },
];

const docsDir = path.join(ROOT, 'docs');
const archivosMd = scanRecursivo(docsDir);

let sospechosas = 0;

for (const archivo of archivosMd) {
  const contenido = fs.readFileSync(archivo, 'utf8');
  const relPath = path.relative(ROOT, archivo).replace(/\\/g, '/');
  
  for (const patron of patronesSospechosos) {
    const matches = contenido.match(patron.regex);
    if (matches) {
      sospechosas += matches.length;
      log(`${relPath}: ${matches.length}x ${patron.desc}`, 'warn');
    }
  }
}

// También escanear README.md y CHANGELOG.md raíz
for (const archivoRaiz of ['README.md', 'CHANGELOG.md']) {
  const archivo = path.join(ROOT, archivoRaiz);
  if (!fs.existsSync(archivo)) continue;
  const contenido = fs.readFileSync(archivo, 'utf8');
  
  for (const patron of patronesSospechosos) {
    // En raíz, ./docs/ es válido
    if (patron.regex.source.includes('\\.\\/docs\\/')) continue;
    const matches = contenido.match(patron.regex);
    if (matches) {
      sospechosas += matches.length;
      log(`${archivoRaiz}: ${matches.length}x ${patron.desc}`, 'warn');
    }
  }
}

console.log('');
if (sospechosas === 0) {
  console.log('  ✅ No se detectaron referencias sospechosas adicionales.');
} else {
  console.log(`  ⚠️  Se detectaron ${sospechosas} referencias sospechosas adicionales.`);
  console.log('     Revisar manualmente los archivos reportados arriba.');
}
console.log('');

// ---------------------------------------------------------------
// RESUMEN
// ---------------------------------------------------------------

console.log('═══════════════════════════════════════════════════════════════');
console.log('  RESUMEN');
console.log('═══════════════════════════════════════════════════════════════');
console.log(`  Archivos procesados: ${Object.keys(CORRECCIONES).length}`);
console.log(`  Archivos con cambios: ${archivosConCambios}`);
console.log(`  Correcciones aplicadas: ${totalAplicadas}`);
console.log(`  Correcciones no encontradas (ya aplicadas o ausentes): ${totalNoEncontradas}`);
console.log(`  Referencias sospechosas adicionales: ${sospechosas}`);
console.log('');

if (!APPLY && (totalAplicadas > 0 || archivosConCambios > 0)) {
  console.log('  ℹ️  Esto fue un DRY RUN. Para aplicar los cambios:');
  console.log('     node scripts/fix-docs-sync.cjs --apply');
  console.log('');
} else if (APPLY) {
  console.log('  ✅ Cambios aplicados. Verificá con:');
  console.log('     git diff docs/');
  console.log('');
}