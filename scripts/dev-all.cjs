#!/usr/bin/env node
// scripts/dev-all.cjs
// Setup de documentos de desarrollo continuo (Sprint 7 + tests + RFC-002)
// Patrón: DRY-RUN por defecto, --apply para ejecutar. Backup antes de tocar. NO hace push.

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const APPLY = process.argv.includes('--apply');
const SKIP_PUSH = process.argv.includes('--no-push');
const ROOT = process.cwd();
const TS = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const TODAY = new Date().toISOString().slice(0, 10);

const log = (msg, kind = 'info') => {
  const icons = { info: '·', ok: '✅', warn: '⚠️', err: '❌', step: '🔹' };
  console.log(`${icons[kind] || '·'} ${msg}`);
};

const readFile = (rel) => {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) throw new Error(`No existe: ${rel}`);
  return fs.readFileSync(abs, 'utf8').replace(/\r\n/g, '\n');
};

const backup = (rel) => {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) return;
  fs.copyFileSync(abs, `${abs}.bak-devall-${TS}`);
};

const writeFile = (rel, content) => {
  backup(rel);
  fs.writeFileSync(path.join(ROOT, rel), content, 'utf8');
  log(`Modificado: ${rel}`, 'ok');
};

const version = JSON.parse(readFile('package.json')).version;
log(`Versión del proyecto: v${version}`, 'info');
log('', 'info');

// ─── Cambios ───────────────────────────────────────────────
const changes = [];
const newDocs = [];

// 1. ROADMAP.md
try {
  const content = readFile('docs/planning/ROADMAP.md');
  const lines = content.split('\n');
  const idx = lines.findIndex((l) => l.includes('**Última actualización:**'));
  if (idx !== -1) {
    lines[idx] = `> **Última actualización:** ${TODAY}`;
    changes.push({ rel: 'docs/planning/ROADMAP.md', content: lines.join('\n') });
  }
} catch (e) { log(`ROADMAP.md: ${e.message}`, 'warn'); }

// 2. CURRENT_STATE.md
try {
  const content = readFile('docs/planning/CURRENT_STATE.md');
  const lines = content.split('\n');
  const idx = lines.findIndex((l) => l.includes('**Versión Activa:**'));
  if (idx !== -1) {
    lines[idx] = `> **Versión Activa:** v${version}`;
    changes.push({ rel: 'docs/planning/CURRENT_STATE.md', content: lines.join('\n') });
  }
} catch (e) { log(`CURRENT_STATE.md: ${e.message}`, 'warn'); }

// 3. PLAN_TRABAJO.md — Sprint 7
try {
  const content = readFile('docs/planning/PLAN_TRABAJO.md');
  if (!content.includes('## SPRINT 7')) {
    const sprint7 = `

---

## SPRINT 7 — Preparación para Torneos (EN CURSO)

**Estado:** 🔨 En curso
**Objetivo:** dejar la app lista para escalar (prerequisitos del sistema de torneos).
**Criterio de salida:** tests de aeronaves verdes + RFC-002 aprobado.

### Ítems del Sprint 7

| ID | Categoría | Descripción | Esfuerzo |
|---|---|---|---|
| **BL-023** | 🏗️ | Encoding LF (mata warnings CRLF) | XS |
| **BL-033** | 🏗️ | Drift DDL \`users.user_id\` nullability | XS |
| **FIX-316** | 🏗️ | Eliminar \`admin.users.routes.js\` (código muerto) | XS |
| **BL-032** | 🏗️ | Unificar 4 variantes de mock Supabase | M |
| **BL-025** | 🧪 | Re-implementar 39 tests skipeados | M |
| **TESTS-AERONAVES** | 🧪 | Tests de \`planes.controller.js\` + \`plane-models.controller.js\` | L |
| **RFC-002** | 📚 | RFC del sistema de torneos internos | S |

### Documentos de fase

- \`PLAN_TRABAJO_TESTS_AERONAVES.md\` — plan de la fase de tests.
- \`docs/rfc/RFC-002-sistema-torneos.md\` — propuesta del sistema de torneos.

`;
    changes.push({ rel: 'docs/planning/PLAN_TRABAJO.md', content: content + sprint7 });
  }
} catch (e) { log(`PLAN_TRABAJO.md: ${e.message}`, 'warn'); }

// 4. PLAN_TRABAJO_TESTS_AERONAVES.md
newDocs.push({
  rel: 'docs/planning/PLAN_TRABAJO_TESTS_AERONAVES.md',
  content: `# 🧪 PLAN DE TRABAJO — Tests de Sistema de Aeronaves

> **Fase:** Sprint 7 · Preparación para Torneos
> **Fecha:** ${TODAY}
> **Estado:** 📋 Planificado

## 1. Objetivo
Cubrir con tests el sistema de aeronaves (18 endpoints sin cobertura).
Prerequisito declarado para el sistema de torneos.

## 2. Estado actual
| Métrica | Valor |
|---|---|
| Tests existentes | 0 |
| Endpoints sin cobertura | 18 |

## 3. Fases
### F1 — Tests unitarios \`plane-models.controller.js\`
- GET, POST, PUT, DELETE, PATCH restore, fallback memoria.

### F2 — Tests unitarios \`planes.controller.js\`
- Hangar, ownership, stats, upgrades, rutas A/B.

### F3 — Tests de integración del catálogo combinado
- \`getFullCatalogModels()\` con prioridad BD > INITIAL > DEFAULT.

## 4. Criterio de cierre
- [ ] 18 endpoints con al menos 1 test cada uno.
- [ ] \`npm test\` pasa 100%.
- [ ] 0 regresiones.

## 5. Referencias
- \`src/controllers/plane-models.controller.js\`
- \`src/controllers/planes.controller.js\`
- \`tests/controllers/dashboard.controller.test.js\` (patrón)
`
});

// 5. RFC-002-sistema-torneos.md
newDocs.push({
  rel: 'docs/rfc/RFC-002-sistema-torneos.md',
  content: `# RFC-002 — Sistema de Torneos Internos

> **ID:** RFC-002 · **Estado:** 📝 Draft · **Autor:** OWNER + Comando C4ISR
> **Fecha:** ${TODAY}
> **Relacionado con:** Normativa v3.0 Art. 18 bis, 7 ter, 7 quater, 42

## 1. Contexto
El escuadrón organiza torneos informalmente. La Normativa v3.0 los formaliza.
Matcherino es la plataforma oficial de Metalstorm (MCS).

## 2. Objetivo
Sistema de torneos recreativos con draft de aeronaves, incremental por fases.

## 3. Alcance por fases
- **F1:** torneo interno del principal (5v5, brackets, draft).
- **F2:** torneo del conjunto (principal + anexos).
- **F3:** torneo abierto (aliados + terceros).
- **F4:** partner oficial (visión).

## 4. Modelo de datos propuesto (F1)
- \`tournaments\` (id, name, format, scope, status, starts_at, ends_at).
- \`tournament_participants\` (user_id nullable, guest_identifier nullable).
- \`tournament_matches\` (bracket, scores).
- \`tournament_drafts\` (pick/ban de aeronaves).

## 5. Endpoints propuestos (F1)
- \`GET/POST /api/tournaments\`
- \`GET /api/tournaments/:id\`
- \`PATCH /api/tournaments/:id/status\`
- \`POST /api/tournaments/:id/register\`
- \`POST /api/tournaments/:id/matches/:mid/result\`
- \`POST /api/tournaments/:id/matches/:mid/draft\`

## 6. Restricciones (Normativa Art. 18 bis)
- ❌ No afecta evaluación, aporte, ascensos, vacantes.
- ✅ Participación voluntaria.
- ✅ Reglas publicadas antes.

## 7. Prerequisitos
1. Tests de aeronaves verdes.
2. Decisión OWNER: formato, tamaño, duración, premios.

## 8. Preguntas abiertas para el OWNER
1. Formato (eliminación / round-robin / ambos).
2. Tamaño (8, 16, variable).
3. Duración.
4. Cómo se juegan las partidas.
5. Premios.

## 9. Próximos pasos
1. Aprobación del RFC-002.
2. Respuesta a las 5 preguntas.
3. Creación de \`PLAN_TRABAJO_TORNEOS.md\`.
4. Implementación F1.

## 10. Referencias
- Normativa v3.0 (borrador).
- ADR-007, ADR-010.
- \`PLAN_TRABAJO_TESTS_AERONAVES.md\`.
`
});

// ─── Aplicar ───────────────────────────────────────────────
log(`Cambios a aplicar: ${changes.length}`, 'info');
log(`Documentos nuevos: ${newDocs.length}`, 'info');
log('', 'info');

if (!APPLY) {
  log('DRY-RUN. Para aplicar:', 'warn');
  log('  node scripts/dev-all.cjs --apply', 'warn');
  process.exit(0);
}

for (const c of changes) writeFile(c.rel, c.content);

for (const d of newDocs) {
  const abs = path.join(ROOT, d.rel);
  if (fs.existsSync(abs)) { log(`Ya existe: ${d.rel}`, 'warn'); continue; }
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, d.content, 'utf8');
  log(`Creado: ${d.rel}`, 'ok');
}

// ─── Git ───────────────────────────────────────────────────
log('', 'info');
log('Commiteando...', 'step');

try {
  execSync('git add -A docs/', { cwd: ROOT, stdio: 'inherit' });
  const msg = 'docs: setup Sprint 7 + plan tests de aeronaves + RFC-002 torneos';
  execSync(`git commit -m "${msg}"`, { cwd: ROOT, stdio: 'inherit' });

  if (!SKIP_PUSH) {
    log('Pusheando...', 'step');
    execSync('git push origin main', { cwd: ROOT, stdio: 'inherit' });
    log('Push OK', 'ok');
  } else {
    log('Push omitido (--no-push)', 'warn');
  }

  const hash = execSync('git rev-parse --short HEAD', { cwd: ROOT, encoding: 'utf8' }).trim();
  log('', 'info');
  log(`✅ Completado. Commit: ${hash}`, 'ok');
} catch (e) {
  log(`Error git: ${e.message}`, 'err');
  log('Archivos modificados localmente. Revisá con git status.', 'warn');
  process.exit(2);
}