/**
 * ============================================================================
 * generate-v4.5.2-docs.cjs
 * ============================================================================
 * Actualiza TODA la documentación del proyecto para reflejar el hotfix
 * v4.5.2 (cadena HALL-066: 6 bugs entre frontend/backend/DB).
 *
 * Ejecución:
 *   node scripts\generate-v4.5.2-docs.cjs
 *
 * Modo dry-run (no escribe nada):
 *   node scripts\generate-v4.5.2-docs.cjs --dry-run
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

// ── Config ──────────────────────────────────────────────────────────────────
const DRY_RUN = process.argv.includes('--dry-run');
const ROOT = process.cwd();
const NOW = new Date();
const DATE = NOW.toISOString().slice(0, 10);           // 2026-09-22
const DATETIME = NOW.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';

const log = {
  ok:    (msg) => console.log(`  ✓ ${msg}`),
  info:  (msg) => console.log(`  → ${msg}`),
  warn:  (msg) => console.log(`  ⚠ ${msg}`),
  error: (msg) => console.log(`  ✗ ${msg}`),
  title: (msg) => console.log(`\n${msg}`),
};

// ── Helpers ─────────────────────────────────────────────────────────────────
function readFile(rel) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) return null;
  return fs.readFileSync(abs, 'utf8');
}

function writeFile(rel, content) {
  const abs = path.join(ROOT, rel);
  if (DRY_RUN) {
    log.info(`[DRY-RUN] Escribiría ${rel} (${content.length} bytes)`);
    return;
  }
  fs.writeFileSync(abs, content, 'utf8');
}

function ensureDir(rel) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) {
    if (!DRY_RUN) fs.mkdirSync(abs, { recursive: true });
    log.ok(`Carpeta creada: ${rel}`);
  }
}

function backup(rel) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) return;
  const bak = `${abs}.bak-${Date.now()}`;
  if (!DRY_RUN) fs.copyFileSync(abs, bak);
  log.info(`Backup: ${path.basename(bak)}`);
}

// Reemplaza contenido entre dos marcadores (inclusive).
// Si los marcadores no existen, agrega al inicio.
function upsertHeader(content, newHeader, pattern) {
  if (!content) return newHeader + '\n';
  if (pattern.test(content)) {
    return content.replace(pattern, newHeader);
  }
  return newHeader + '\n\n' + content;
}

// ── 1. CHANGELOG.md ─────────────────────────────────────────────────────────
function updateChangelog() {
  log.title('📝 [1/14] CHANGELOG.md');
  const rel = 'CHANGELOG.md';
  let content = readFile(rel);
  if (!content) {
    log.error(`No existe ${rel}. Abortando ese archivo.`);
    return;
  }

  // Si ya existe la entrada, no duplicar
  if (content.includes('## 📌 [4.5.2]')) {
    log.warn('Entrada [4.5.2] ya existe. Saltando.');
    return;
  }

  const entry = `
## 📌 [4.5.2] - ${DATE}

### 🚨 Hotfix crítico — Cadena HALL-066 (6 bugs en 3 capas)

#### Objetivo Cumplido

Resolver la cadena de 6 bugs que impedía a los pilotos cargar
performance del evento **Squadron Event 2026-W38** (en período de gracia).
Los bugs abarcaban frontend, backend y Service Worker.

#### Cadena de Bugs Resueltos

| # | ID | Capa | Descripción | Commit |
|---|---|---|---|---|
| 1 | HALL-066 | Frontend | \`isGracePeriod\` usado antes de declararse en \`displayEventInfo\` | \`1614c13\` |
| 2 | HALL-066-bis | Frontend | \`savePerformance()\` llamaba a \`/api/performances\` (legacy) | \`6d872ae\` |
| 3 | HALL-066-ter | Backend | \`CreateParticipationSchema.user_id\` esperaba UUID, frontend enviaba INTEGER | \`6d09ba3\` |
| 4 | HALL-066-quater | Backend | \`createParticipation\` no resolvía user_id INTEGER → UUID | \`0731c31\` |
| 5 | HALL-066-quinquies | Backend | \`.select()\` no traía \`submission_opens_at/closes_at\` | \`7157492\` |
| 6 | HALL-066-sexies | SW | \`CACHE_NAME\` no bumpeado → navegador servía \`performance.js\` viejo | \`4cab228\` |

#### Cambios Backend

| Archivo | Cambio |
|---|---|
| \`src/utils/eventSchemas.js\` | \`user_id\` acepta \`z.union([number.int, string.uuid])\` |
| \`src/controllers/events-v2.controller.js\` | Resolución INTEGER → UUID + \`validateSubmissionWindow\` + \`.select()\` completo |
| \`src/controllers/events-v2.controller.js\` | \`normalizeEvent\` incluye \`submission_opens_at/closes_at\` |

#### Cambios Frontend

| Archivo | Cambio |
|---|---|
| \`js/views.js\` | \`isGracePeriod\` declarado antes de \`subText\` |
| \`js/performance.js\` | \`savePerformance()\` migrado a \`POST /api/events-v2/:id/participations\` |
| \`js/performance.js\` | \`_targetUserId\` prefiere \`_user.id\` (UUID) sobre \`_user.user_id\` |
| \`sw.js\` | \`CACHE_NAME\` → \`v4.5.2-hotfix\` |

#### Verificación

- ✅ \`node --check\` limpio en los 4 archivos JS/Node modificados.
- ✅ 5 commits mergeados a \`main\` + 3 hotfix = 8 commits desplegados.
- ✅ \`fly deploy\` exitoso sin downtime (\`deployment-01M33KQSV9MYTYV7GS3W8XDW8V\`).
- ✅ Smoke test: piloto carga 100 tokens en W38 con toast verde.
- ✅ Supabase: fila insertada en \`event_participations\`.

#### Lección Arquitectónica

La migración \`events\` → \`events_master\` (ADR-008) quedó a medias en v4.1.0.
El frontend seguía llamando al endpoint legacy \`POST /api/performances\`.
**Conclusión:** toda migración de tablas debe incluir la migración del cliente
en el mismo release.

#### Archivos Nuevos

| Archivo | Propósito |
|---|---|
| \`docs/incidentes/HALL-066-completo.md\` | Post-mortem completo de la cadena |
| \`docs/HANDOFF-v4.5.2-hotfix.md\` | Handoff detallado |
| \`docs/adr/ADR-008-update.md\` | Anexo con lecciones aprendidas |

---

`;

  // Insertar después del header del CHANGELOG
  const headerEnd = content.indexOf('---\n\n## 📌');
  if (headerEnd === -1) {
    content = content + entry;
  } else {
    const insertPos = headerEnd + '---\n\n'.length;
    content = content.slice(0, insertPos) + entry + content.slice(insertPos);
  }

  backup(rel);
  writeFile(rel, content);
  log.ok(`${rel} actualizado con entrada [4.5.2]`);
}

// ── 2. CURRENT_STATE.md ─────────────────────────────────────────────────────
function updateCurrentState() {
  log.title('📝 [2/14] CURRENT_STATE.md');
  const rel = 'CURRENT_STATE.md';
  let content = readFile(rel);
  if (!content) {
    log.error(`No existe ${rel}.`);
    return;
  }

  // Actualizar header de versión
  content = content.replace(
    /> \*\*Versión Activa:\*\* v4\.3\.1[^\n]*/,
    `> **Versión Activa:** v4.5.2-hotfix (HALL-066: cadena de 6 bugs resuelta)`
  );
  content = content.replace(
    /> \*\*Fecha de Congelamiento:\*\* 2026-09-20/,
    `> **Fecha de Congelamiento:** ${DATE}`
  );

  // Agregar sección al final si no existe
  if (!content.includes('## 🚨 Hotfix v4.5.2 — Cadena HALL-066')) {
    const hotfixSection = `

---

## 🚨 Hotfix v4.5.2 — Cadena HALL-066 (${DATE})

### Problema

Los pilotos no podían cargar performance del evento **Squadron Event 2026-W38**
en período de gracia. El formulario aparecía pero el POST fallaba.

### Cadena de 6 Bugs

| # | ID | Capa | Descripción |
|---|---|---|---|
| 1 | HALL-066 | Frontend | \`isGracePeriod\` usado antes de declararse |
| 2 | HALL-066-bis | Frontend | \`savePerformance()\` llamaba a endpoint legacy |
| 3 | HALL-066-ter | Backend | Schema Zod esperaba UUID, recibía INTEGER |
| 4 | HALL-066-quater | Backend | \`user_id\` INTEGER no resuelto a UUID |
| 5 | HALL-066-quinquies | Backend | \`.select()\` incompleto |
| 6 | HALL-066-sexies | SW | Caché no invalidado |

### Estado

- ✅ **8 commits desplegados** en \`origin/main\`.
- ✅ **Deploy exitoso** sin downtime.
- ✅ **Smoke test validado**: piloto carga 100 tokens en W38.
- ✅ **Supabase:** fila insertada en \`event_participations\`.

### Referencias

- \`docs/incidentes/HALL-066-completo.md\`
- \`docs/HANDOFF-v4.5.2-hotfix.md\`
- \`docs/adr/ADR-008-update.md\`
`;
    content += hotfixSection;
  }

  backup(rel);
  writeFile(rel, content);
  log.ok(`${rel} actualizado`);
}

// ── 3. ARCHITECTURE.md ──────────────────────────────────────────────────────
function updateArchitecture() {
  log.title('📝 [3/14] ARCHITECTURE.md');
  const rel = 'ARCHITECTURE.md';
  let content = readFile(rel);
  if (!content) {
    log.error(`No existe ${rel}.`);
    return;
  }

  // Actualizar footer
  content = content.replace(
    /\*Versión: v4\.3\.1 · Actualizado: 21 Septiembre 2026\*/,
    `*Versión: v4.5.2-hotfix · Actualizado: ${DATE}*`
  );
  content = content.replace(
    /\(Versión v4\.3\.1\)/,
    `(Versión v4.5.2-hotfix)`
  );

  // Agregar sección 2.2e sobre el hotfix
  if (!content.includes('### 2.2e Hotfix v4.5.2')) {
    const section = `
### 2.2e Hotfix v4.5.2 — Cadena HALL-066 (${DATE})

Resolución de 6 bugs en cascada que impedían cargar performance del evento
W38 en período de gracia (ADR-008).

**Componentes tocados:**

| Capa | Archivo | Cambio |
|---|---|---|
| Frontend | \`js/views.js\` | \`isGracePeriod\` declarado antes de \`subText\` |
| Frontend | \`js/performance.js\` | Migrado a \`POST /api/events-v2/:id/participations\` |
| Frontend | \`js/performance.js\` | \`_targetUserId\` prefiere UUID |
| Backend | \`src/utils/eventSchemas.js\` | \`user_id\` acepta INTEGER o UUID |
| Backend | \`src/controllers/events-v2.controller.js\` | Resolución INTEGER→UUID + \`validateSubmissionWindow\` + select completo |
| SW | \`sw.js\` | \`CACHE_NAME\` → \`v4.5.2-hotfix\` |

**Reglas de negocio consolidadas:**

1. **La ventana de carga manda, no el status.** Un evento \`CLOSED\` con
   ventana abierta acepta participaciones (\`validateSubmissionWindow\`).
2. **El schema Zod acepta ambos identificadores.** \`user_id\` puede ser
   INTEGER (\`users.user_id\`) o UUID (\`users.id\`).
3. **El .select() debe traer todo lo que el validador necesita.**
   \`submission_opens_at\` y \`submission_closes_at\` son obligatorios.
4. **El CACHE_NAME se bumpea en cada hotfix de frontend.**

**Referencias:**

- \`docs/incidentes/HALL-066-completo.md\`
- \`docs/adr/ADR-008-update.md\`

---

`;
    // Insertar después de §2.2d (deprecation)
    const anchor = '**Implementación:** `src/middlewares/deprecation.js`';
    const idx = content.indexOf(anchor);
    if (idx !== -1) {
      const endOfLine = content.indexOf('\n', idx);
      content = content.slice(0, endOfLine + 1) + section + content.slice(endOfLine + 1);
    } else {
      content += section;
    }
  }

  backup(rel);
  writeFile(rel, content);
  log.ok(`${rel} actualizado`);
}

// ── 4. API_REFERENCE.md ─────────────────────────────────────────────────────
function updateApiReference() {
  log.title('📝 [4/14] API_REFERENCE.md');
  const rel = 'API_REFERENCE.md';
  let content = readFile(rel);
  if (!content) {
    log.error(`No existe ${rel}.`);
    return;
  }

  // Actualizar footer
  content = content.replace(
    /\*Versión: v4\.3\.0 · Actualizado: 20 Septiembre 2026\*/,
    `*Versión: v4.5.2-hotfix · Actualizado: ${DATE}*`
  );

  // Agregar nota si no existe
  if (!content.includes('### Nota v4.5.2 — POST participations')) {
    const note = `
### Nota v4.5.2 — POST /api/events-v2/:id/participations (HALL-066)

A partir del hotfix v4.5.2, el endpoint \`POST /api/events-v2/:id/participations\`
acepta eventos con \`status === 'CLOSED'\` si la ventana de carga está abierta
(\`validateSubmissionWindow\`). El check duro \`status !== 'OPEN'\` fue removido.

**Cambios en el payload:**

- \`user_id\` acepta tanto INTEGER (\`users.user_id\`) como UUID string (\`users.id\`).
- Si se envía INTEGER, el controller resuelve a UUID antes del INSERT.
- El \`.select()\` del evento incluye \`submission_opens_at\` y \`submission_closes_at\`.

**Códigos de error nuevos:**

| Código | HTTP | Cuándo |
|---|---|---|
| \`USER_NOT_FOUND\` | 404 | \`user_id\` INTEGER no existe en \`users\` |
| \`INVALID_USER_ID\` | 400 | \`user_id\` no es UUID ni entero positivo |

---
`;
    // Insertar antes del footer
    const footerIdx = content.lastIndexOf('\n---\n');
    if (footerIdx !== -1) {
      content = content.slice(0, footerIdx) + note + content.slice(footerIdx);
    } else {
      content += note;
    }
  }

  backup(rel);
  writeFile(rel, content);
  log.ok(`${rel} actualizado`);
}

// ── 5. DEPLOYMENT_STATE.md ──────────────────────────────────────────────────
function updateDeploymentState() {
  log.title('📝 [5/14] DEPLOYMENT_STATE.md');
  const rel = 'DEPLOYMENT_STATE.md';
  let content = readFile(rel);
  if (!content) {
    log.error(`No existe ${rel}.`);
    return;
  }

  content = content.replace(
    /> \*\*Versión:\*\* v4\.3\.0/,
    `> **Versión:** v4.5.2-hotfix`
  );
  content = content.replace(
    /> \*\*Fecha de Congelamiento:\*\* 2026-09-18/,
    `> **Fecha de Congelamiento:** ${DATE}`
  );

  backup(rel);
  writeFile(rel, content);
  log.ok(`${rel} actualizado (header)`);
}

// ── 6. DEPLOYMENT_GUIDE.md ──────────────────────────────────────────────────
function updateDeploymentGuide() {
  log.title('📝 [6/14] DEPLOYMENT_GUIDE.md');
  const rel = 'DEPLOYMENT_GUIDE.md';
  let content = readFile(rel);
  if (!content) {
    log.error(`No existe ${rel}.`);
    return;
  }

  content = content.replace(
    /\*Versión: v4\.3\.0 · Actualizado: 20 Septiembre 2026\*/,
    `*Versión: v4.5.2-hotfix · Actualizado: ${DATE}*`
  );
  content = content.replace(
    /\(v4\.3\.0\)\./,
    `(v4.5.2-hotfix).`
  );

  backup(rel);
  writeFile(rel, content);
  log.ok(`${rel} actualizado`);
}

// ── 7. README.md ────────────────────────────────────────────────────────────
function updateReadme() {
  log.title('📝 [7/14] README.md');
  const rel = 'README.md';
  let content = readFile(rel);
  if (!content) {
    log.error(`No existe ${rel}.`);
    return;
  }

  // Badge
  content = content.replace(
    /\[!\[Version\]\(https:\/\/img\.shields\.io\/badge\/version-v4\.3\.0-gold\)\]/,
    `[![Version](https://img.shields.io/badge/version-v4.5.2--hotfix-gold)]`
  );

  // Footer
  content = content.replace(
    /\*Versión: v4\.3\.0 · Actualizado: 20 Septiembre 2026\*/,
    `*Versión: v4.5.2-hotfix · Actualizado: ${DATE}*`
  );

  backup(rel);
  writeFile(rel, content);
  log.ok(`${rel} actualizado (badge + footer)`);
}

// ── 8. PWA_SETUP.md ─────────────────────────────────────────────────────────
function updatePwaSetup() {
  log.title('📝 [8/14] PWA_SETUP.md');
  const rel = 'PWA_SETUP.md';
  let content = readFile(rel);
  if (!content) {
    log.error(`No existe ${rel}.`);
    return;
  }

  content = content.replace(
    /Service Worker v4\.3\.0/g,
    `Service Worker v4.5.2-hotfix`
  );
  content = content.replace(
    /\*Versión: v4\.3\.0 · Actualizado: 20 Septiembre 2026\*/,
    `*Versión: v4.5.2-hotfix · Actualizado: ${DATE}*`
  );
  content = content.replace(
    /PARAGUAY-FFAA-METALSTORM-v4\.0\.5/g,
    `PARAGUAY-FFAA-METALSTORM-v4.5.2-hotfix`
  );

  backup(rel);
  writeFile(rel, content);
  log.ok(`${rel} actualizado`);
}

// ── 9. USER_MANUAL.md ───────────────────────────────────────────────────────
function updateUserManual() {
  log.title('📝 [9/14] USER_MANUAL.md');
  const rel = 'USER_MANUAL.md';
  let content = readFile(rel);
  if (!content) {
    log.error(`No existe ${rel}.`);
    return;
  }

  content = content.replace(
    /\(Versión v4\.3\.0\)/,
    `(Versión v4.5.2-hotfix)`
  );
  content = content.replace(
    /\*Versión: v4\.3\.0 · Actualizado: 20 Septiembre 2026\*/,
    `*Versión: v4.5.2-hotfix · Actualizado: ${DATE}*`
  );

  backup(rel);
  writeFile(rel, content);
  log.ok(`${rel} actualizado`);
}

// ── 10. docs/incidentes/HALL-066-completo.md ────────────────────────────────
function createHall066Complete() {
  log.title('📄 [10/14] docs/incidentes/HALL-066-completo.md');
  ensureDir('docs/incidentes');
  const rel = 'docs/incidentes/HALL-066-completo.md';

  const content = `# HALL-066 — Cadena de 6 Bugs Bloqueando Carga de W38

> **Incidente P0 · Detectado: 2026-09-21 · Resuelto: 2026-09-22**
> **Versión del fix: v4.5.2-hotfix**
> **Owner: PJPIROVANI**

---

## 1. Síntoma Inicial

Pilotos reportaron: *"No se puede guardar los registros de W38"*.

En el navegador, el formulario de carga mostraba **"🔴 VENTANA CERRADA"**
aunque el evento W38 estaba en período de gracia (ADR-008) con
ventana de carga abierta hasta el 24/09/2026 12:00 UTC.

---

## 2. Cadena de 6 Bugs

Lo que parecía un bug de frontend resultó ser una **cadena de 6 bugs
en 3 capas** (frontend, backend, base de datos/Service Worker).

### Bug #1 — HALL-066 (Frontend)

**Archivo:** \`js/views.js\` (~línea 1416)
**Commit fix:** \`1614c13\`

\`displayEventInfo\` usaba \`isGracePeriod\` en \`subText\` **antes** de declararlo
con \`const\`. Resultado: \`ReferenceError\` silencioso, la rama de grace period
nunca se ejecutaba, siempre caía en "VENTANA CERRADA".

**Fix:** mover la declaración de \`isGracePeriod\` 3 posiciones arriba.

### Bug #2 — HALL-066-bis (Frontend)

**Archivo:** \`js/performance.js\` (~línea 380)
**Commit fix:** \`6d872ae\`

\`savePerformance()\` llamaba a \`POST /api/performances\` (endpoint **legacy**)
que escribía en \`performances.event_id\` (TEXT, FK → \`events.id\` legacy).
Pero el frontend enviaba UUIDs de \`events_master\`. Resultado: FK violada → 500.

**Fix:** migrar a \`POST /api/events-v2/:id/participations\` (endpoint v2,
escribe en \`event_participations\`).

### Bug #3 — HALL-066-ter (Backend)

**Archivo:** \`src/utils/eventSchemas.js\` (línea 242)
**Commit fix:** \`6d09ba3\`

\`CreateParticipationSchema.user_id\` esperaba \`z.string().uuid()\`. Pero el
frontend enviaba \`user_id: 1\` (INTEGER de \`users.user_id\`). Zod rechazaba
con 400 "Payload inválido".

**Fix:** \`z.union([z.string().uuid(), z.number().int().positive()])\`.

### Bug #4 — HALL-066-quater (Backend)

**Archivo:** \`src/controllers/events-v2.controller.js\` (línea 679)
**Commit fix:** \`0731c31\`

Aunque el schema Zod ya aceptaba INTEGER, el controller insertaba ese INTEGER
directo en \`event_participations.user_id\` (columna UUID). Postgres rechazaba
con error de tipo.

**Fix:** resolver \`user_id\` INTEGER → UUID consultando \`users\` antes del INSERT.

### Bug #5 — HALL-066-quinquies (Backend)

**Archivo:** \`src/controllers/events-v2.controller.js\` (línea 648)
**Commit fix:** \`7157492\`

\`.select()\` de \`createParticipation\` solo traía \`id, type, status, name\`.
Al pasar el evento a \`validateSubmissionWindow(event)\`, este leía
\`submission_opens_at\` y \`submission_closes_at\` — que no venían. Resultado:
\`SUBMISSION_WINDOW_NOT_SET\`.

**Fix:** expandir el select a \`id, type, status, name, submission_opens_at, submission_closes_at\`.

### Bug #6 — HALL-066-sexies (Service Worker)

**Archivo:** \`sw.js\` (línea 12)
**Commit fix:** \`4cab228\`

El Service Worker servía \`js/performance.js\` **viejo** desde caché. El fix del
frontend no llegaba al navegador del piloto.

**Fix:** bump \`CACHE_NAME\` a \`PARAGUAY-FFAA-METALSTORM-v4.5.2-hotfix\`.

---

## 3. Timeline

| Fecha/Hora | Evento |
|---|---|
| 2026-09-21 ~22:00 PY | Detección inicial (bug #1: form no aparece) |
| 2026-09-21 ~23:00 PY | Fix #1 aplicado + deploy |
| 2026-09-21 ~23:30 PY | Form aparece pero POST falla (bug #2) |
| 2026-09-22 00:00 UTC | Diagnóstico completo de la cadena de 6 bugs |
| 2026-09-22 01:00 UTC | Aplicados los 5 fixes restantes |
| 2026-09-22 02:00 UTC | Commit + push + deploy |
| 2026-09-22 02:15 UTC | Smoke test OK |

---

## 4. Causa Raíz Arquitectónica

**Migración incompleta \`events\` → \`events_master\` (ADR-008).**

- La tabla legacy \`events\` (id TEXT, 8 columnas) siguió viva.
- La tabla nueva \`events_master\` (id UUID, 40+ columnas) se creó en v4.1.0.
- El endpoint legacy \`POST /api/performances\` seguía insertando en \`performances.event_id\` (TEXT, FK → \`events.id\`).
- Pero el frontend ya enviaba UUIDs de \`events_master\`.

**Conclusión:** toda migración de tablas debe incluir la migración de **todos
los clientes** en el mismo release. Dejar la mitad migrada es una bomba de tiempo.

---

## 5. Fix Aplicado (v4.5.2-hotfix)

### Commits

| # | Commit | Descripción |
|---|---|---|
| 1 | \`1614c13\` | fix(views): respeta isGracePeriod en displayEventInfo |
| 2 | \`28e3cf7\` | fix(events-v2): normalizeEvent usa ventana real |
| 3 | \`6d872ae\` | fix(performance): migrar savePerformance a events-v2 |
| 4 | \`b3c1f00\` | fix(events-v2): relajar check de status, usar validateSubmissionWindow |
| 5 | \`4cab228\` | chore(sw): bump CACHE_NAME a v4.5.2-hotfix |
| 6 | \`6d09ba3\` | fix(schemas): user_id acepta INTEGER o UUID |
| 7 | \`0731c31\` | fix(events-v2): resolver user_id INTEGER a UUID |
| 8 | \`7157492\` | fix(performance): preferir _user.id (UUID) en payload |

### Archivos modificados

| Archivo | Cambio |
|---|---|
| \`js/views.js\` | \`isGracePeriod\` declarado antes de \`subText\` |
| \`js/performance.js\` | Migrado a \`POST /api/events-v2/:id/participations\` |
| \`js/performance.js\` | \`_targetUserId\` prefiere \`_user.id\` (UUID) |
| \`src/utils/eventSchemas.js\` | \`user_id\` acepta INTEGER o UUID |
| \`src/controllers/events-v2.controller.js\` | Resolución INTEGER→UUID + \`validateSubmissionWindow\` + select completo |
| \`sw.js\` | \`CACHE_NAME\` → \`v4.5.2-hotfix\` |

---

## 6. Verificación

### Tests de sintaxis

\`\`\`
node --check js\\views.js                    → ✓ silencio
node --check js\\performance.js              → ✓ silencio
node --check src\\utils\\eventSchemas.js     → ✓ silencio
node --check src\\controllers\\events-v2.controller.js → ✓ silencio
node --check sw.js                           → ✓ silencio
\`\`\`

### Deploy

- **Deployment ID:** \`deployment-01M33KQSV9MYTYV7GS3W8XDW8V\`
- **Rolling deploy:** \`[1/2]\` y \`[2/2]\` OK
- **DNS:** verificado
- **Health check:** OK

### Smoke test

- ✅ Formulario muestra "📝 PERÍODO DE CARGA"
- ✅ POST a \`/api/events-v2/04feaccb-.../participations\` → **201 Created**
- ✅ Toast "✅ Rendimiento registrado correctamente"
- ✅ Supabase: fila insertada en \`event_participations\`

---

## 7. Lecciones Aprendidas

1. **La ventana manda, no el status.** Un evento \`CLOSED\` con ventana abierta
   acepta cargas.
2. **Los schemas Zod deben tolerar ambos identificadores.** El proyecto tiene
   \`users.user_id\` (INTEGER) y \`users.id\` (UUID).
3. **Los \`.select()\` deben traer todo lo que el validador necesita.**
4. **El \`CACHE_NAME\` se bumpea en cada hotfix de frontend.**
5. **La migración de tablas requiere migrar todos los clientes.**

---

## 8. Referencias

- \`docs/HANDOFF-v4.5.2-hotfix.md\`
- \`docs/adr/ADR-008-update.md\`
- \`CHANGELOG.md\` — sección \`[4.5.2]\`
- \`CURRENT_STATE.md\` — sección "Hotfix v4.5.2"

---

**PARAGUAY FFAA [PRY] · HALL-066-completo · ${DATE}**
`;

  backup(rel);
  writeFile(rel, content);
  log.ok(`${rel} creado`);
}

// ── 11. docs/HANDOFF-v4.5.2-hotfix.md ───────────────────────────────────────
function createHandoff() {
  log.title('📄 [11/14] docs/HANDOFF-v4.5.2-hotfix.md');
  ensureDir('docs');
  const rel = 'docs/HANDOFF-v4.5.2-hotfix.md';

  const content = `# HANDOFF — v4.5.2-hotfix (HALL-066)

> **Fecha:** ${DATETIME}
> **Estado:** ✅ FASE 5 completa · FASE 6 (deploy) completa
> **Responsable:** Comando C4ISR

---

## 1. Resumen Ejecutivo

Se resolvió una **cadena de 6 bugs** (frontend, backend, SW) que impedía a los
pilotos cargar performance del evento W38 en período de gracia (ADR-008).

Todos los fixes están en producción. El sistema está 100% operativo.

---

## 2. Cadena de Bugs

| # | ID | Capa | Descripción |
|---|---|---|---|
| 1 | HALL-066 | Frontend | \`isGracePeriod\` usado antes de declararse |
| 2 | HALL-066-bis | Frontend | \`savePerformance()\` llamaba a endpoint legacy |
| 3 | HALL-066-ter | Backend | Schema Zod esperaba UUID, recibía INTEGER |
| 4 | HALL-066-quater | Backend | \`user_id\` INTEGER no resuelto a UUID |
| 5 | HALL-066-quinquies | Backend | \`.select()\` incompleto |
| 6 | HALL-066-sexies | SW | Caché no invalidado |

---

## 3. Commits Desplegados (8 totales)

| # | Commit | Descripción |
|---|---|---|
| 1 | \`1614c13\` | fix(views): respeta isGracePeriod |
| 2 | \`28e3cf7\` | fix(events-v2): normalizeEvent usa ventana real |
| 3 | \`6d872ae\` | fix(performance): migrar a events-v2 |
| 4 | \`b3c1f00\` | fix(events-v2): usar validateSubmissionWindow |
| 5 | \`4cab228\` | chore(sw): bump CACHE_NAME |
| 6 | \`6d09ba3\` | fix(schemas): user_id acepta INTEGER o UUID |
| 7 | \`0731c31\` | fix(events-v2): resolver INTEGER → UUID |
| 8 | \`7157492\` | fix(performance): preferir _user.id (UUID) |

---

## 4. Archivos Modificados

### Backend

- \`src/utils/eventSchemas.js\`
- \`src/controllers/events-v2.controller.js\`

### Frontend

- \`js/views.js\`
- \`js/performance.js\`

### Service Worker

- \`sw.js\`

### Documentación

- \`CHANGELOG.md\`
- \`CURRENT_STATE.md\`
- \`ARCHITECTURE.md\`
- \`API_REFERENCE.md\`
- \`DEPLOYMENT_STATE.md\`
- \`DEPLOYMENT_GUIDE.md\`
- \`README.md\`
- \`PWA_SETUP.md\`
- \`USER_MANUAL.md\`
- \`BACKLOG.md\`
- \`PLAN_TRABAJO.md\`
- \`docs/incidentes/HALL-066-completo.md\`
- \`docs/HANDOFF-v4.5.2-hotfix.md\`
- \`docs/adr/ADR-008-update.md\`

---

## 5. Verificación

### Tests de sintaxis

\`\`\`
node --check js\\views.js                    → ✓
node --check js\\performance.js              → ✓
node --check src\\utils\\eventSchemas.js     → ✓
node --check src\\controllers\\events-v2.controller.js → ✓
node --check sw.js                           → ✓
\`\`\`

### Deploy

- **ID:** \`deployment-01M33KQSV9MYTYV7GS3W8XDW8V\`
- **Estrategia:** rolling, sin downtime
- **Health:** OK

### Smoke test

- ✅ Formulario muestra "📝 PERÍODO DE CARGA"
- ✅ POST a \`/api/events-v2/04feaccb-.../participations\` → 201
- ✅ Toast verde
- ✅ Supabase: fila insertada

---

## 6. Reglas de Negocio Consolidadas

1. **La ventana manda, no el status.** Un evento \`CLOSED\` con ventana abierta
   acepta participaciones.
2. **Los schemas Zod aceptan ambos identificadores.**
3. **Los \`.select()\` deben traer todo lo que el validador necesita.**
4. **El \`CACHE_NAME\` se bumpea en cada hotfix de frontend.**
5. **La migración de tablas requiere migrar todos los clientes.**

---

## 7. Pendientes Post-Hotfix

| # | Tarea | Cuándo | Esfuerzo |
|---|---|---|---|
| 1 | Verificar W39 el jueves 24/09 12:00 UTC | Jue 24/09 | 10 min |
| 2 | DROP tablas BM legacy (F4.5) | Post 26/09 | 10 min |
| 3 | Reportar tzdata a Supabase | Asap | 15 min |
| 4 | Sprint 1 del PLAN_TRABAJO (8 hallazgos) | Próximas 2 semanas | 4-6 h |

---

## 8. Referencias

- \`docs/incidentes/HALL-066-completo.md\` — post-mortem detallado
- \`docs/adr/ADR-008-update.md\` — anexo con lecciones
- \`CHANGELOG.md\` — \`[4.5.2]\`
- \`CURRENT_STATE.md\` — sección "Hotfix v4.5.2"

---

**PARAGUAY FFAA [PRY] · HANDOFF v4.5.2-hotfix · ${DATE}**
`;

  backup(rel);
  writeFile(rel, content);
  log.ok(`${rel} creado`);
}

// ── 12. docs/adr/ADR-008-update.md ──────────────────────────────────────────
function createAdrUpdate() {
  log.title('📄 [12/14] docs/adr/ADR-008-update.md');
  ensureDir('docs/adr');
  const rel = 'docs/adr/ADR-008-update.md';

  const content = `# ADR-008 — Anexo: Lecciones del Hotfix v4.5.2 (HALL-066)

> **Fecha:** ${DATE}
> **ADR original:** ADR-008 (Ventanas de Carga Desacopladas)
> **Contexto:** HALL-066 (cadena de 6 bugs)
> **Estado:** Anexo aplicado, sin cambios a la decisión original

---

## 1. Decisión Original (ADR-008)

> Desacoplar la ventana de carga del ciclo del evento. Cada evento tiene su
> propia ventana configurable:
> - SQUADRON: 7 días
> - BLACK_MARKET: 6 días
> La ventana manda, no el status.

---

## 2. Qué Falló en la Implementación

La decisión arquitectónica de ADR-008 **es correcta**. Pero la
**implementación** dejó 6 bugs en cascada que se manifestaron cuando el
piloto intentó cargar W38 en período de gracia.

### Bug de fondo

El endpoint \`createParticipation\` aplicaba \`validateSubmissionWindow(event)\`
pero **con un evento incompleto** (le faltaban \`submission_opens_at\` y
\`submission_closes_at\` en el \`.select()\`). El helper devolvía
\`SUBMISSION_WINDOW_NOT_SET\` silenciosamente.

---

## 3. Lecciones Aprendidas

### ✅ Lección 1: "La ventana manda, no el status"

**Antes:**

\`\`\`js
if (event.status !== 'OPEN') {
  return res.status(409).json({ code: 'EVENT_NOT_OPEN' });
}
\`\`\`

**Después:**

\`\`\`js
const windowCheck = validateSubmissionWindow(event);
if (!windowCheck.valid) {
  return res.status(409).json({
    code: windowCheck.code,
    error: windowCheck.message
  });
}
\`\`\`

**Regla:** un evento \`CLOSED\` con ventana de carga abierta (grace period)
**SÍ acepta** participaciones. El status es cosmético; la ventana es la
fuente de verdad.

### ✅ Lección 2: "Los .select() deben traer todo lo que el validador necesita"

**Antes:**

\`\`\`js
.select('id, type, status, name')  // ← falta submission_opens_at/closes_at
\`\`\`

**Después:**

\`\`\`js
.select('id, type, status, name, submission_opens_at, submission_closes_at')
\`\`\`

**Regla:** cuando pasás un objeto a un validador, ese objeto debe tener
**todos** los campos que el validador lee. Documentar el contrato implícito.

### ✅ Lección 3: "Los schemas Zod deben tolerar ambos identificadores"

**Antes:**

\`\`\`js
user_id: z.string().uuid()
\`\`\`

**Después:**

\`\`\`js
user_id: z.union([
  z.string().uuid(),
  z.number().int().positive()
])
\`\`\`

**Regla:** el proyecto tiene \`users.user_id\` (INTEGER, visible) y
\`users.id\` (UUID, técnico). Los schemas deben aceptar ambos y el controller
resuelve. Esto evita romper clientes viejos.

### ✅ Lección 4: "Un CACHE_NAME nuevo por cada hotfix de frontend"

**Regla:** cuando cambiás JS del frontend servido por el SW, **siempre**
bumpear \`CACHE_NAME\` en \`sw.js\`. Si no, el piloto sigue con el código
viejo hasta que el SW expire (24h+).

### ✅ Lección 5: "La migración de tablas requiere migrar TODOS los clientes"

**Regla:** si vas a deprecar \`performances\` y usar \`event_participations\`,
hay que **migrar el frontend en el mismo release**. Dejar la mitad migrada
es una bomba de tiempo.

---

## 4. Consecuencias para v4.6.0

1. **Deprecar** \`performances\` (legacy) — eliminar el endpoint
   \`POST /api/performances\` una vez confirmado que ningún cliente lo usa.
2. **Migrar** los 639 registros históricos de \`performances\` a
   \`event_participations\`.
3. **Eliminar** \`events\` (legacy) cuando ya no tenga FK entrante.
4. **Documentar** el contrato de \`CreateParticipationSchema\` como
   "acepta user_id INTEGER | UUID".

---

## 5. Referencias

- \`docs/adr/ADR-008-ventanas-carga-desacopladas.md\` (original)
- \`docs/incidentes/HALL-066-completo.md\` (post-mortem)
- \`docs/HANDOFF-v4.5.2-hotfix.md\` (handoff)

---

**PARAGUAY FFAA [PRY] · ADR-008 Anexo v4.5.2 · ${DATE}**
`;

  backup(rel);
  writeFile(rel, content);
  log.ok(`${rel} creado`);
}

// ── 13. BACKLOG.md ──────────────────────────────────────────────────────────
function updateBacklog() {
  log.title('📝 [13/14] BACKLOG.md');
  const rel = 'BACKLOG.md';
  let content = readFile(rel);
  if (!content) {
    log.error(`No existe ${rel}.`);
    return;
  }

  if (content.includes('HALL-066')) {
    log.warn('HALL-066 ya está en BACKLOG.md. Saltando.');
    return;
  }

  // Buscar la sección "Completados" y agregar la fila
  const completadosHeader = '## ✅ Completados';
  const idx = content.indexOf(completadosHeader);
  if (idx === -1) {
    log.warn('No se encontró sección "Completados". Agregando al final.');
    content += `\n\n${completadosHeader}\n\n| ID | Categoría | Título | Completado | Commit |\n|---|---|---|---|---|\n| **HALL-066** | 🐛 | Cadena de 6 bugs bloqueando carga de W38 (v4.5.2-hotfix) | ${DATE} | \`7157492\` |\n`;
  } else {
    // Insertar después de la línea del header (que puede tener un párrafo)
    const afterHeader = content.indexOf('\n\n', idx);
    if (afterHeader === -1) {
      content += `\n| **HALL-066** | 🐛 | Cadena de 6 bugs bloqueando carga de W38 (v4.5.2-hotfix) | ${DATE} | \`7157492\` |\n`;
    } else {
      const insertionPoint = afterHeader + 2;
      const row = `| **HALL-066** | 🐛 | Cadena de 6 bugs bloqueando carga de W38 (v4.5.2-hotfix) | ${DATE} | \`7157492\` |\n`;
      content = content.slice(0, insertionPoint) + row + content.slice(insertionPoint);
    }
  }

  backup(rel);
  writeFile(rel, content);
  log.ok(`${rel} actualizado`);
}

// ── 14. PLAN_TRABAJO.md ─────────────────────────────────────────────────────
function updatePlanTrabajo() {
  log.title('📝 [14/14] PLAN_TRABAJO.md');
  const rel = 'PLAN_TRABAJO.md';
  let content = readFile(rel);
  if (!content) {
    log.error(`No existe ${rel}.`);
    return;
  }

  if (content.includes('HALL-066-completo')) {
    log.warn('HALL-066 ya está en PLAN_TRABAJO.md. Saltando.');
    return;
  }

  const section = `## 16. HOTFIX v4.5.2 — Cadena HALL-066 (${DATE})

**Estado:** ✅ CERRADO

**Contexto:** 6 bugs en cascada que impedían cargar performance de W38 en
período de gracia (ADR-008). Bugs en frontend, backend y SW.

**Commits:** \`1614c13\`, \`28e3cf7\`, \`6d872ae\`, \`b3c1f00\`, \`4cab228\`,
\`6d09ba3\`, \`0731c31\`, \`7157492\`.

**Deploy:** \`deployment-01M33KQSV9MYTYV7GS3W8XDW8V\` (rolling, sin downtime).

**Referencias:**

- \`docs/incidentes/HALL-066-completo.md\`
- \`docs/HANDOFF-v4.5.2-hotfix.md\`
- \`docs/adr/ADR-008-update.md\`
- \`CHANGELOG.md\` — \`[4.5.2]\`

---

`;

  // Insertar antes de la sección final "REFERENCIAS" o al final
  const refIdx = content.lastIndexOf('## 15. REFERENCIAS');
  if (refIdx !== -1) {
    content = content.slice(0, refIdx) + section + content.slice(refIdx);
  } else {
    content += `\n\n${section}`;
  }

  backup(rel);
  writeFile(rel, content);
  log.ok(`${rel} actualizado`);
}

// ── Main ────────────────────────────────────────────────────────────────────
function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  Generador de documentación — Hotfix v4.5.2 (HALL-066)      ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log(`Modo: ${DRY_RUN ? 'DRY-RUN (no escribe)' : 'ESCRITURA REAL'}`);
  console.log(`Root: ${ROOT}`);
  console.log(`Fecha: ${DATE}`);

  if (!fs.existsSync(path.join(ROOT, 'package.json'))) {
    console.log('\n⚠ No parece ser la raíz del proyecto (falta package.json).');
    console.log('  Ejecutar desde la raíz de paraguay-ffaa.');
    process.exit(1);
  }

  const tasks = [
    updateChangelog,
    updateCurrentState,
    updateArchitecture,
    updateApiReference,
    updateDeploymentState,
    updateDeploymentGuide,
    updateReadme,
    updatePwaSetup,
    updateUserManual,
    createHall066Complete,
    createHandoff,
    createAdrUpdate,
    updateBacklog,
    updatePlanTrabajo,
  ];

  let ok = 0, fail = 0;
  for (const task of tasks) {
    try {
      task();
      ok++;
    } catch (err) {
      log.error(`Error en ${task.name}: ${err.message}`);
      fail++;
    }
  }

  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log(`║  Resultado: ${ok} OK · ${fail} FAIL`);
  console.log('╚══════════════════════════════════════════════════════════════╝');

  console.log('\n📋 Próximos pasos:');
  console.log('  1. git status                                    (revisar)');
  console.log('  2. git diff --stat                               (resumen)');
  console.log('  3. git add .                                     (stage)');
  console.log('  4. git commit -m "docs(v4.5.2): documentar hotfix HALL-066"');
  console.log('  5. git push origin main');
  console.log('');

  if (DRY_RUN) {
    console.log('ℹ  Modo DRY-RUN: no se escribió ningún archivo.');
    console.log('   Ejecutá sin --dry-run para aplicar los cambios.');
  }
}

main();