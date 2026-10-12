#!/usr/bin/env node
/**
 * ============================================================================
 *  F1.5a — Script #4: Docs de cierre + plan F1.5b
 * ============================================================================
 *  Proyecto:  PARAGUAY-FFAA | METALSTORM
 *  Fase:      F1.5a (Frontend Torneos - Sprint 8)
 *  Commit:    #4 de 4
 *  Ref:       PLAN_TRABAJO_TORNEOS.md §F1.5
 * ============================================================================
 *  OBJETIVO
 *  --------
 *  Cerrar documentalmente F1.5a (frontend + integración) y dejar
 *  preparado el plan de F1.5b (modal de draft).
 *
 *  OPERACIONES (6):
 *    1. PLAN_TRABAJO_TORNEOS.md  → cierre F1.5a + plan F1.5b
 *    2. BACKLOG.md               → BL-034 actualizado
 *    3. PLAN_TRABAJO.md          → tabla Sprint 8 + evidencia F1.5a
 *    4. CURRENT_STATE.md         → nueva entrada al inicio
 *    5. API_REFERENCE.md         → nota de drafts pendientes en §9
 *    6. docs/prompts/prompt-continuacion-torneos-f1.5b.md (NUEVO)
 *
 *  REGLAS DEL PROYECTO APLICADAS
 *  -----------------------------
 *  - NO usar content.replace() con strings multi-línea (HALL-068).
 *  - Usar split(/\r?\n/) + findIndex() + splice() + writeFileSync.
 *  - Backup .bak-f1.5a de cada archivo antes de modificar.
 *  - Script idempotente (2da ejecución no duplica).
 *  - Windows CMD compatible.
 *
 *  USO
 *  ---
 *  node scripts/f1-5a-update-docs.cjs              → dry-run (default)
 *  node scripts/f1-5a-update-docs.cjs --apply      → aplicar cambios
 * ============================================================================
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ─── CONFIGURACIÓN ──────────────────────────────────────────────────────────
const ROOT         = path.resolve(__dirname, '..');
const PLAN_TOURN   = path.join(ROOT, 'docs', 'planning', 'PLAN_TRABAJO_TORNEOS.md');
const BACKLOG      = path.join(ROOT, 'docs', 'planning', 'BACKLOG.md');
const PLAN_TRABAJO = path.join(ROOT, 'docs', 'planning', 'PLAN_TRABAJO.md');
const CURRENT_ST   = path.join(ROOT, 'docs', 'planning', 'CURRENT_STATE.md');
const API_REF      = path.join(ROOT, 'docs', 'architecture', 'API_REFERENCE.md');
const PROMPT_DIR   = path.join(ROOT, 'docs', 'prompts');
const PROMPT_FILE  = path.join(PROMPT_DIR, 'prompt-continuacion-torneos-f1.5b.md');

const BACKUP_SUFFIX = '.bak-f1.5a';

// ─── ARGS ───────────────────────────────────────────────────────────────────
const args       = process.argv.slice(2);
const APPLY      = args.includes('--apply');
const IS_DRY_RUN = !APPLY;

// ─── HELPERS ────────────────────────────────────────────────────────────────
function log(prefix, message) {
  const icons = { ok: '✅', fail: '❌', info: 'ℹ️ ', warn: '⚠️ ', step: '🔹' };
  console.log(`${icons[prefix] || '  '} ${message}`);
}

function ensureFile(filePath, label) {
  if (!fs.existsSync(filePath)) {
    log('fail', `${label} no encontrado: ${filePath}`);
    process.exit(1);
  }
  log('ok', `${label} encontrado`);
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    if (IS_DRY_RUN) {
      log('warn', `[DRY-RUN] Se crearía directorio: ${path.basename(dirPath)}`);
    } else {
      fs.mkdirSync(dirPath, { recursive: true });
      log('ok', `Directorio creado: ${path.basename(dirPath)}`);
    }
  } else {
    log('info', `Directorio ya existe: ${path.basename(dirPath)}`);
  }
}

function backup(filePath) {
  const bPath = filePath + BACKUP_SUFFIX;
  if (!fs.existsSync(bPath)) {
    fs.copyFileSync(filePath, bPath);
    log('ok', `Backup: ${path.basename(bPath)}`);
  } else {
    log('info', `Backup ya existe: ${path.basename(bPath)} (no sobreescrito)`);
  }
}

function readNormalized(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return raw.replace(/\r\n/g, '\n');
}

function writeNormalized(filePath, content) {
  fs.writeFileSync(filePath, content, 'utf8');
}

// ═══════════════════════════════════════════════════════════════════════════
//  CAMBIO 1 — PLAN_TRABAJO_TORNEOS.md
// ═══════════════════════════════════════════════════════════════════════════
function applyPlanTorneos() {
  log('step', 'A. PLAN_TRABAJO_TORNEOS.md — cierre F1.5a + plan F1.5b');

  const content = readNormalized(PLAN_TOURN);
  const lines   = content.split('\n');

  // Idempotencia: si ya está el bloque, abortar
  if (content.includes('**Cierre F1.5a (2026-10-12):**')) {
    log('info', 'Bloque de cierre F1.5a ya existe (idempotente)');
    return { ok: true, content, changed: false };
  }

  // Buscar el anchor: la línea del commit esperado de F1.5
  const anchorRegex = /\*\*Commit esperado:\*\*\s*`feat\(tournaments\): frontend bracket \+ draft F1\.5`/;
  const idxAnchor = lines.findIndex(l => anchorRegex.test(l));
  if (idxAnchor === -1) {
    log('fail', 'No se encontró anchor "Commit esperado: frontend bracket + draft F1.5"');
    return { ok: false, content };
  }
  log('ok', `Anchor encontrado en línea ${idxAnchor + 1}`);

  // Buscar la línea de F1.6 (para insertar antes)
  const idxF16 = lines.findIndex(l => l.includes('### F1.6 — Integración con Discord'));
  if (idxF16 === -1) {
    log('fail', 'No se encontró el header de F1.6');
    return { ok: false, content };
  }
  log('ok', `Header F1.6 encontrado en línea ${idxF16 + 1}`);

  // Construir el bloque a insertar (entre F1.5 y F1.6)
  const bloque = [
    '',
    '**Cierre F1.5a (2026-10-12):**',
    '',
    '- **4 commits aplicados:**',
    '  - `992d0f9` — `feat(tournaments): API client F1.5` (8 wrappers `apiTournaments*`).',
    '  - `b728e29` — `feat(tournaments): vista HTML + módulo JS F1.5a` (652 + 1220 líneas).',
    '  - `b8e73ef` — `feat(tournaments): integración + estilos + cache bump F1.5a` (+262 / -33 líneas).',
    '  - (este commit) — `docs(tournaments): cierre F1.5a + plan F1.5b`.',
    '- **8 de 9 criterios cubiertos.** El restante (modal de draft) se posterga a F1.5b.',
    '- **Archivos nuevos:**',
    '  - `components/tournaments.html` (652 líneas).',
    '  - `js/tournaments.js` (1220 líneas, ~35 funciones exportadas).',
    '- **Archivos modificados:**',
    '  - `js/api.js` (+197 líneas).',
    '  - `js/views.js` (+~15 líneas, 3 cambios quirúrgicos).',
    '  - `css/views.css` (+~230 líneas, bloque `.tournaments-*` + `.bracket-*`).',
    '  - `index.html` (28 ocurrencias `?v=4.8.3` → `?v=4.9.0`, +botón drawer, +script).',
    '  - `sw.js` (`CACHE_NAME` → `v4.9.0-f1.5a`, +2 assets).',
    '- **Hallazgos de la sesión:**',
    '  - H-F15-01: el comentario inline `// ADR-010` en `VETERAN_PANEL:` rompió el regex de inserción de coma. Se resolvió quitándolo previamente.',
    '  - H-F15-02: `Zod 4` valida UUIDs con regex RFC 4122 estricta (versión 1-8, variante 8/9/a/b).',
    '  - H-F15-03: el Service Worker cacheaba HTML viejo en mobile. Se bumpeó `CACHE_NAME` a `v4.9.0-f1.5a`.',
    '- **Suite completa:** 642 passing / 0 failing / 0 skipped.',
    '- **Regresiones:** 0.',
    '- **Push:** `aef6647..b8e73ef main -> main`.',
    '',
    '---',
    '',
    '### F1.5b — Draft (postergado)',
    '',
    '**Duración estimada:** 1-2 días',
    '**Estado:** ⏳ Pendiente (próxima sesión)',
    '',
    '**Motivo de la postergación:**',
    '',
    '`API_REFERENCE.md §9` no expone `GET drafts` para lectura. El wrapper',
    '`apiTournamentsRegisterDraft` ya existe (commit `992d0f9`), pero falta:',
    '',
    '1. **Backend:** endpoint `GET /api/tournaments/:id/matches/:mid/drafts` para',
    '   listar drafts existentes.',
    '2. **Backend:** validación de que `aircraft_id` no esté baneada por el otro equipo.',
    '3. **Frontend:** modal de draft con grilla de aeronaves, timer 5 min, soporte',
    '   para Mirrored Picks y auto-ban del último BM.',
    '',
    '**Referencias:**',
    '',
    '- `docs/normativa/ANEXO-III-torneos.md §7` — Reglas del draft.',
    '- `docs/prompts/prompt-continuacion-torneos-f1.5b.md` — Prompt de continuación.',
    '',
    '---',
    ''
  ];

  // Insertar antes del header F1.6
  lines.splice(idxF16, 0, ...bloque);
  const finalContent = lines.join('\n');

  log('ok', `Bloque de cierre F1.5a + plan F1.5b insertado (${bloque.length} líneas)`);
  return { ok: true, content: finalContent, changed: true };
}

// ═══════════════════════════════════════════════════════════════════════════
//  CAMBIO 2 — BACKLOG.md (BL-034)
// ═══════════════════════════════════════════════════════════════════════════
function applyBacklog() {
  log('step', 'B. BACKLOG.md — actualizar BL-034');

  const content = readNormalized(BACKLOG);
  const lines   = content.split('\n');

  // Idempotencia
  if (content.includes('F1.5a cerrada, F1.5b pendiente')) {
    log('info', 'BL-034 ya está actualizado (idempotente)');
    return { ok: true, content, changed: false };
  }

  // Buscar la fila BL-034 en la tabla de Prioridad Media
  const idx = lines.findIndex(l => l.trim().startsWith('| **BL-034**'));
  if (idx === -1) {
    log('fail', 'No se encontró la fila BL-034 en BACKLOG.md');
    return { ok: false, content };
  }
  log('ok', `Fila BL-034 encontrada en línea ${idx + 1}`);

  // Reemplazar por la versión actualizada
  lines[idx] = "| **BL-034** | ✨ | Sistema de Torneos Internos (F1.5a cerrada, F1.5b pendiente) | 🔨 En progreso | M (2-4 días) | RFC-002 + Anexo III. **F1.1–F1.4 cerrados** · **F1.5a cerrada (4 commits)** · F1.5b pendiente (draft). Commit: `b8e73ef`. Ver `docs/planning/PLAN_TRABAJO_TORNEOS.md`. |";

  const finalContent = lines.join('\n');
  log('ok', 'BL-034 actualizado');
  return { ok: true, content: finalContent, changed: true };
}

// ═══════════════════════════════════════════════════════════════════════════
//  ⚠️  BLOQUE B (Cambios 3-6 + main) SE PEGA A CONTINUACIÓN
// ═══════════════════════════════════════════════════════════════════════════
//  Pegá el Bloque B en este mismo archivo. NO GUARDES NI EJECUTES
//  hasta que el Bloque B esté pegado.
// ═══════════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════
//  CAMBIO 3 — PLAN_TRABAJO.md (tabla Sprint 8 + evidencia F1.5a)
// ═══════════════════════════════════════════════════════════════════════════
function applyPlanTrabajo() {
  log('step', 'C. PLAN_TRABAJO.md — tabla Sprint 8 + evidencia F1.5a');

  const content = readNormalized(PLAN_TRABAJO);
  const lines   = content.split('\n');
  let changes   = 0;

  // ─── C.1: Actualizar fila F1.5 en la tabla resumida ────────
  const idxF15Row = lines.findIndex(l =>
    l.includes('**F1.5**') && l.includes('Frontend (bracket, draft, resultados)')
  );
  if (idxF15Row === -1) {
    log('warn', 'No se encontró fila "F1.5 | Frontend (bracket, draft, resultados)" — se omite C.1');
  } else {
    // Reemplazar por 2 filas: F1.5a (cerrada) + F1.5b (pendiente)
    lines[idxF15Row] = "| **F1.5a** | 🎨 | Frontend (listado + bracket + roster + resultado + moderador) | ✅ Cerrado |";
    lines.splice(idxF15Row + 1, 0,
      "| **F1.5b** | 🎨 | Frontend (modal de draft: bans + picks + timer) | ⏳ Pendiente |"
    );
    log('ok', 'Fila F1.5 → F1.5a (✅) + F1.5b (⏳)');
    changes++;
  }

  // ─── C.2: Actualizar "Progreso:" del Sprint 8 ─────────────
  const idxProgreso = lines.findIndex(l =>
    l.includes('**Progreso:**') && l.includes('F1.1 + F1.2 + F1.3 + F1.4 cerrados')
  );
  if (idxProgreso === -1) {
    log('warn', 'No se encontró línea "Progreso: F1.1 + F1.2 + F1.3 + F1.4 cerrados" — se omite C.2');
  } else {
    lines[idxProgreso] = lines[idxProgreso].replace(
      'F1.1 + F1.2 + F1.3 + F1.4 cerrados.',
      'F1.1 + F1.2 + F1.3 + F1.4 + F1.5a cerrados. F1.5b pendiente.'
    );
    log('ok', 'Línea "Progreso:" actualizada');
    changes++;
  }

  // ─── C.3: Insertar bloque "Evidencia de cierre F1.5a" ──────
  if (content.includes('### Evidencia de cierre F1.5a (2026-10-12)')) {
    log('info', 'Bloque "Evidencia de cierre F1.5a" ya existe (idempotente)');
  } else {
    // Anchor: la línea del header "**Pendiente F1.5:** frontend..."
    const idxPendiente = lines.findIndex(l =>
      l.includes('**Pendiente F1.5:**') && l.includes('frontend (bracket + draft + resultados')
    );
    if (idxPendiente === -1) {
      log('warn', 'No se encontró anchor "Pendiente F1.5:" — se omite C.3');
    } else {
      // Buscar la línea vacía siguiente para insertar después
      let insertAt = idxPendiente + 1;
      while (insertAt < lines.length && lines[insertAt].trim() !== '') {
        insertAt++;
      }
      // Saltar la línea vacía
      insertAt++;

      const bloqueEvidencia = [
        '',
        '### Evidencia de cierre F1.5a (2026-10-12)',
        '',
        '**4 commits aplicados:**',
        '',
        '- `992d0f9` — `feat(tournaments): API client F1.5` (8 wrappers `apiTournaments*`).',
        '- `b728e29` — `feat(tournaments): vista HTML + módulo JS F1.5a`.',
        '- `b8e73ef` — `feat(tournaments): integración + estilos + cache bump F1.5a`.',
        '- (este commit) — `docs(tournaments): cierre F1.5a + plan F1.5b`.',
        '',
        '**Archivos nuevos:**',
        '',
        '- `components/tournaments.html` (652 líneas, ~28.3 KB).',
        '- `js/tournaments.js` (1220 líneas, ~45.8 KB, ~35 funciones exportadas).',
        '',
        '**Verificado:**',
        '',
        '- 8/8 criterios cubiertos (el de draft se posterga a F1.5b).',
        '- Suite completa: 642 passing / 0 failing / 0 skipped.',
        '- 0 regresiones.',
        '- `node --check` limpio en `js/api.js`, `js/tournaments.js`, `js/views.js`, `sw.js`.',
        '- Vista accesible desde mobile drawer.',
        '- RBAC fino funcional: solo ADMIN/OWNER ven botón Nuevo Torneo; solo moderador/ADMIN/OWNER cargan resultados.',
        '',
        '**Pendiente F1.5b:** modal de draft (1-2 días).',
        '',
        '---',
        ''
      ];

      lines.splice(insertAt, 0, ...bloqueEvidencia);
      log('ok', 'Bloque "Evidencia de cierre F1.5a" insertado');
      changes++;
    }
  }

  const finalContent = lines.join('\n');
  return { ok: true, content: finalContent, changes };
}

// ═══════════════════════════════════════════════════════════════════════════
//  CAMBIO 4 — CURRENT_STATE.md (nueva entrada al inicio)
// ═══════════════════════════════════════════════════════════════════════════
function applyCurrentState() {
  log('step', 'D. CURRENT_STATE.md — nueva entrada al inicio');

  const content = readNormalized(CURRENT_ST);

  // Idempotencia
  if (content.includes('## Cambios Recientes (2026-10-12) — F1.5a Torneos (v4.9.0-rc)')) {
    log('info', 'Entrada F1.5a ya existe (idempotente)');
    return { ok: true, content, changed: false };
  }

  const lines = content.split('\n');

  // Buscar el header principal "# 📊 CURRENT STATE - PARAGUAY-FFAA | METALSTORM"
  const idxHeader = lines.findIndex(l => l.includes('# 📊 CURRENT STATE - PARAGUAY-FFAA'));
  if (idxHeader === -1) {
    log('fail', 'No se encontró el header principal "# 📊 CURRENT STATE"');
    return { ok: false, content };
  }
  log('ok', `Header principal encontrado en línea ${idxHeader + 1}`);

  // Buscar el primer "---" después del header (para insertar después)
  let insertAt = idxHeader + 1;
  while (insertAt < lines.length && lines[insertAt].trim() !== '---') {
    insertAt++;
  }
  if (insertAt >= lines.length) {
    log('fail', 'No se encontró el primer "---" después del header');
    return { ok: false, content };
  }
  insertAt++; // Insertar después del "---"
  log('ok', `Punto de inserción en línea ${insertAt + 1}`);

  const nuevaEntrada = [
    '',
    '## Cambios Recientes (2026-10-12) — F1.5a Torneos (v4.9.0-rc)',
    '',
    '### Sistema de Torneos — Frontend F1.5a cerrado',
    '',
    'Se implementó la vista completa del Sistema de Torneos Internos (RFC-002 / ADR-011) con:',
    '',
    '| # | Item | Estado |',
    '|---|------|--------|',
    '| 1 | Vista `components/tournaments.html` (652 líneas) | ✅ |',
    '| 2 | Módulo `js/tournaments.js` (1220 líneas, ~35 funciones) | ✅ |',
    '| 3 | API client `js/api.js` (8 wrappers `apiTournaments*`) | ✅ |',
    '| 4 | Listado con filtros (search/status/scope) | ✅ |',
    '| 5 | Detalle con 3 tabs (Bracket/Roster/Moderador) | ✅ |',
    '| 6 | Bracket Swiss + Single Elimination | ✅ |',
    '| 7 | 5 modales (crear/registrar/resultado/estado/moderador) | ✅ |',
    '| 8 | Integración en `js/views.js` (TOURNAMENTS + aliases) | ✅ |',
    '| 9 | Estilos en `css/views.css` (bloque `.tournaments-*` + `.bracket-*`) | ✅ |',
    '| 10 | Botón en mobile drawer + script en `index.html` | ✅ |',
    '| 11 | Cache bump `?v=4.8.3` → `?v=4.9.0` (28 ocurrencias) | ✅ |',
    '| 12 | Cache bump `sw.js` → `v4.9.0-f1.5a` | ✅ |',
    '| 13 | Modal de draft (postergado a F1.5b) | ⏳ F1.5b |',
    '',
    '**Commits clave:**',
    '- `992d0f9` feat(tournaments): API client F1.5 - 8 wrappers apiTournaments*',
    '- `b728e29` feat(tournaments): vista HTML + módulo JS F1.5a',
    '- `b8e73ef` feat(tournaments): integración + estilos + cache bump F1.5a',
    '',
    '**Estado del sistema:**',
    '- 642 passing / 0 failing / 0 skipped.',
    '- Vista accesible desde mobile drawer (sección "INFORMACIÓN & DOCTRINA").',
    '- RBAC fino funcional (ADMIN/OWNER/moderador designado).',
    '- Responsive mobile/tablet/desktop verificado.',
    '',
    '**Pendiente:**',
    '- F1.5b — Modal de draft (requiere `GET /api/tournaments/:id/matches/:mid/drafts`).',
    '- F1.6 — Integración con Discord (opcional).',
    '',
    '**Referencias:**',
    '- `docs/planning/PLAN_TRABAJO_TORNEOS.md` — Plan F1.1 → F1.6.',
    '- `docs/prompts/prompt-continuacion-torneos-f1.5b.md` — Prompt de continuación.',
    '',
    '---',
    ''
  ];

  lines.splice(insertAt, 0, ...nuevaEntrada);
  const finalContent = lines.join('\n');

  log('ok', `Nueva entrada F1.5a insertada (${nuevaEntrada.length} líneas)`);
  return { ok: true, content: finalContent, changed: true };
}

// ═══════════════════════════════════════════════════════════════════════════
//  CAMBIO 5 — API_REFERENCE.md (nota de drafts pendientes al final de §9)
// ═══════════════════════════════════════════════════════════════════════════
function applyApiReference() {
  log('step', 'E. API_REFERENCE.md — nota de drafts pendientes');

  const content = readNormalized(API_REF);

  // Idempotencia
  if (content.includes('### Notas de F1.5a (frontend)')) {
    log('info', 'Nota de F1.5a ya existe (idempotente)');
    return { ok: true, content, changed: false };
  }

  const lines = content.split('\n');

  // Buscar el footer del archivo: "*Versión: v4.8.15 · Actualizado: 2026-10-11*"
  const idxFooter = lines.findIndex(l =>
    l.trim().startsWith('*Versión:') && l.includes('Actualizado:')
  );
  if (idxFooter === -1) {
    log('fail', 'No se encontró el footer "*Versión: ... Actualizado: ..."');
    return { ok: false, content };
  }
  log('ok', `Footer encontrado en línea ${idxFooter + 1}`);

  const nota = [
    '',
    '### Notas de F1.5a (frontend)',
    '',
    '**Estado del frontend al 2026-10-12:** ✅ F1.5a cerrada (listado + bracket + roster + resultado + moderador).',
    '',
    '**Pendiente F1.5b (draft):**',
    '',
    '- El wrapper `apiTournamentsRegisterDraft()` ya existe (commit `992d0f9`) y funciona para **registrar** una acción de draft (ban/pick).',
    '- **Falta** el endpoint de **lectura** `GET /api/tournaments/:id/matches/:mid/drafts` para listar drafts existentes. Se implementará en F1.5b.',
    '- **Falta** la UI del modal de draft (grilla de aeronaves, timer 5 min, Mirrored Picks, auto-ban del último BM).',
    '',
    '**Referencias:**',
    '',
    '- `docs/planning/PLAN_TRABAJO_TORNEOS.md` — F1.5a cerrada + F1.5b planificada.',
    '- `docs/prompts/prompt-continuacion-torneos-f1.5b.md` — Prompt de continuación.',
    '',
    '---',
    ''
  ];

  // Insertar antes del footer
  lines.splice(idxFooter, 0, ...nota);
  const finalContent = lines.join('\n');

  log('ok', `Nota insertada antes del footer (${nota.length} líneas)`);
  return { ok: true, content: finalContent, changed: true };
}

// ═══════════════════════════════════════════════════════════════════════════
//  CAMBIO 6 — docs/prompts/prompt-continuacion-torneos-f1.5b.md (NUEVO)
// ═══════════════════════════════════════════════════════════════════════════
const PROMPT_CONTENT = `# 🚀 PROMPT DE CONTINUACIÓN — F1.5b Draft de Torneos

## Contexto

Estoy trabajando en el **Sistema de Torneos Internos** (RFC-002 / ADR-011) del
escuadrón PARAGUAY FFAA | METALSTORM.

**F1.5a** (listado + bracket + roster + resultado + moderador) ya está cerrada.
Ahora toca **F1.5b**: el modal de draft.

## Estado actual

| Fase | Descripción | Estado |
|---|---|---|
| F1.1 | Migración SQL (5 tablas) | ✅ Cerrado (commit \`69f988b\`) |
| F1.2 | Schemas Zod (6 schemas + 72 tests) | ✅ Cerrado (commit \`2a51bb2\`) |
| F1.3 | Controller + RBAC fino (8 handlers + 63 tests) | ✅ Cerrado (commit \`683c4ed\`) |
| F1.4 | Router + mount (8 endpoints) | ✅ Cerrado (commit \`345f452\`) |
| **F1.5a** | **Frontend (listado + bracket + roster + resultado + moderador)** | ✅ **Cerrado (commit b8e73ef)** |
| **F1.5b** | **Modal de draft (bans + picks + timer)** | ⏳ **Pendiente (este trabajo)** |
| F1.6 | Integración con Discord (opcional) | ⏳ Pendiente |

**Suite de tests:** 642 passing / 0 failing / 0 skipped.

## Objetivo F1.5b

Implementar el modal de draft (bans + picks) en la vista de torneos.

### Backend (faltante)

1. **Endpoint de lectura:** \`GET /api/tournaments/:id/matches/:mid/drafts\`
   - Retorna todos los drafts del match agrupados por \`game_number\`.
   - Cada draft es \`{ id, game_number, team_id, action, aircraft_id, order_index, created_at }\`.
   - RBAC: \`requireAuth\` (cualquier autenticado puede ver el draft).

2. **Validación adicional en \`apiTournamentsRegisterDraft\` (ya existe):**
   - Verificar que \`aircraft_id\` no esté baneada por el **otro** equipo.
   - Verificar que el **último avión del Black Market** esté auto-baneado.
   - Verificar que \`order_index\` no esté duplicado (ya está en la DB, validar en controller).
   - Verificar que el \`team_id\` pertenezca al \`match_id\`.

### Frontend (faltante)

3. **Modal de draft** (\`#tournamentDraftModal\`):
   - Header: "🎯 Draft — Partida [N] · [Fase] · Bo[3|5]".
   - Info: equipo A vs equipo B, mapa de la partida, timer 5 min por equipo.
   - **Grilla de aeronaves:** reusar \`plane_models\` del catálogo (44 aviones).
     - Filtro: excluir aeronaves ya baneadas en esta partida.
   - **Modo de acción:** dropdown para alternar entre BAN y PICK.
   - **Selección de equipo:** \`team_id\` (A o B).
   - **Confirmación:** botón "Registrar Acción".
   - **Timer:** 5 min por equipo (Anexo III §7.5). Al agotarse, asignar avión por defecto del rol.

4. **Botón "🎯 Draft"** en cada match del bracket:
   - Solo visible si el match está en estado \`PENDING\` o \`LIVE\`.
   - Solo visible para \`canModerateTournament(torneo)\`.

5. **Visualización del draft existente:**
   - En el tab Bracket, cada match con draft registrado muestra un pequeño bloque con
     el resumen (2 bans + N picks).

## Restricciones del Anexo III §7

- **1 ban por equipo.**
- **Mirrored Picks permitidos** (ambos equipos pueden usar la misma aeronave).
- **El último avión de Black Market está baneado automáticamente.**
- **Timer: 5 min por equipo.**
- **Se juega por partida** (\`game_number\` 1..N).
- **Duración:** Bo3 → hasta 3 partidas; Bo5 → hasta 5 partidas.

## Archivos a adjuntar en la nueva sesión

Obligatorios:

- \`components/tournaments.html\` — vista actual (tiene los 5 modales existentes).
- \`js/tournaments.js\` — módulo actual (~35 funciones exportadas).
- \`src/controllers/tournaments.controller.js\` — 8 handlers existentes.
- \`src/routes/tournaments.routes.js\` — 8 rutas montadas.
- \`src/utils/schemas.js\` — schemas Zod del torneo.
- \`docs/normativa/ANEXO-III-torneos.md\` — reglamento (especialmente §7 Draft).
- \`docs/planning/PLAN_TRABAJO_TORNEOS.md\` — plan F1.1 → F1.6.

Opcionales (referencia):

- \`src/controllers/planes.controller.js\` — cómo se leen los 44 aviones del catálogo.
- \`tests/controllers/tournaments.controller.test.js\` — patrón de tests.
- \`tests/helpers/express.js\` — helper de Express para tests.
- \`sql/045_tournaments.sql\` — esquema real de las 5 tablas.

## Comandos de verificación

\`\`\`cmd
cd C:\\Users\\Admin\\proyectos\\ffaa-paraguay-classic
git log --oneline -8
git status
npm test
node --check js\\tournaments.js
node --check src\\controllers\\tournaments.controller.js
\`\`\`

## Recordatorios críticos

1. **Zod 4** valida UUIDs con regex RFC 4122 estricta (versión 1-8, variante 8/9/a/b). Usar UUIDs válidos en tests.
2. **NO usar \`content.replace()\` con strings multi-línea** (HALL-068). Usar \`split(/\\r?\\n/)\` + \`splice()\`.
3. **Servicio Worker:** al modificar \`js/tournaments.js\` o \`components/tournaments.html\`, bumpear \`CACHE_NAME\` en \`sw.js\` a \`v4.9.1-f1.5b\`.
4. **Cache-busting:** bumpear \`?v=4.9.0\` → \`?v=4.9.1\` en \`index.html\` (28 ocurrencias).
5. **RBAC fino:** el draft solo lo puede registrar el moderador o ADMIN/OWNER.
6. **Escapar HTML** en todo render dinámico (\`escapeHTML()\`).
7. **Backups:** \`.bak-f1.5b\` antes de modificar archivos críticos.

## Siguiente fase después de F1.5b

**F1.6 — Integración con Discord (opcional):**

- \`!torneo crear [nombre]\` — crear torneo (solo ADMIN/OWNER).
- \`!torneo status\` — ver torneo activo.
- \`!torneo bracket\` — link al bracket.

**Nota:** F1 puede cerrarse sin F1.6. La integración Discord es complementaria.

---

**PARAGUAY FFAA \`[PRY]\` — Prompt de continuación Torneos F1.5b**
**Generado: 2026-10-12**
`;

function applyCreatePrompt() {
  log('step', 'F. Crear docs/prompts/prompt-continuacion-torneos-f1.5b.md');

  if (fs.existsSync(PROMPT_FILE)) {
    log('warn', `Archivo ya existe: ${path.basename(PROMPT_FILE)}`);
    if (IS_DRY_RUN) {
      log('info', '[DRY-RUN] No se sobreescribiría.');
    } else {
      log('info', 'Se sobreescribirá con la versión nueva.');
    }
  } else {
    log('ok', 'Archivo no existe → se puede crear');
  }

  const lines = PROMPT_CONTENT.split('\n').length;
  log('ok', `Contenido: ${lines} líneas (~${(PROMPT_CONTENT.length / 1024).toFixed(1)} KB)`);

  return { ok: true, content: PROMPT_CONTENT, changed: true };
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════
function main() {
  console.log('');
  console.log('================================================================');
  console.log('  F1.5a — Script #4: Docs de cierre + plan F1.5b');
  console.log('================================================================');
  console.log('');

  if (IS_DRY_RUN) {
    log('warn', 'Modo --dry-run activo: NINGÚN archivo será modificado.');
    console.log('');
  }

  // [1/7] Verificar entorno
  log('step', '[1/7] Verificando entorno...');
  ensureFile(PLAN_TOURN,    'PLAN_TRABAJO_TORNEOS.md');
  ensureFile(BACKLOG,       'BACKLOG.md');
  ensureFile(PLAN_TRABAJO,  'PLAN_TRABAJO.md');
  ensureFile(CURRENT_ST,    'CURRENT_STATE.md');
  ensureFile(API_REF,       'API_REFERENCE.md');
  ensureDir(PROMPT_DIR);

  // [2/7] Cambio 1: PLAN_TRABAJO_TORNEOS.md
  log('step', '[2/7] Cambio 1: PLAN_TRABAJO_TORNEOS.md');
  const r1 = applyPlanTorneos();
  if (!r1.ok) { log('fail', 'Cambio 1 falló. Abortando.'); process.exit(1); }

  // [3/7] Cambio 2: BACKLOG.md
  log('step', '[3/7] Cambio 2: BACKLOG.md');
  const r2 = applyBacklog();
  if (!r2.ok) { log('fail', 'Cambio 2 falló. Abortando.'); process.exit(1); }

  // [4/7] Cambio 3: PLAN_TRABAJO.md
  log('step', '[4/7] Cambio 3: PLAN_TRABAJO.md');
  const r3 = applyPlanTrabajo();
  if (!r3.ok) { log('fail', 'Cambio 3 falló. Abortando.'); process.exit(1); }

  // [5/7] Cambio 4: CURRENT_STATE.md
  log('step', '[5/7] Cambio 4: CURRENT_STATE.md');
  const r4 = applyCurrentState();
  if (!r4.ok) { log('fail', 'Cambio 4 falló. Abortando.'); process.exit(1); }

  // [6/7] Cambio 5: API_REFERENCE.md
  log('step', '[6/7] Cambio 5: API_REFERENCE.md');
  const r5 = applyApiReference();
  if (!r5.ok) { log('fail', 'Cambio 5 falló. Abortando.'); process.exit(1); }

  // [7/7] Cambio 6: crear prompt de continuación
  log('step', '[7/7] Cambio 6: crear prompt de continuación');
  const r6 = applyCreatePrompt();
  if (!r6.ok) { log('fail', 'Cambio 6 falló. Abortando.'); process.exit(1); }

  // ─── Ejecutar o dry-run ─────────────────────────────────────────────────
  console.log('');
  log('step', 'Ejecutando...');

  if (IS_DRY_RUN) {
    log('info', '[DRY-RUN] No se escribiría nada.');
    log('info', '[DRY-RUN] Ejecutar con `--apply` para aplicar.');
    console.log('');
    console.log('----------------------------------------------------------------');
    console.log('  RESUMEN (dry-run)');
    console.log('----------------------------------------------------------------');
    console.log('  Archivos a modificar:  5');
    console.log('    · docs/planning/PLAN_TRABAJO_TORNEOS.md');
    console.log('    · docs/planning/BACKLOG.md');
    console.log('    · docs/planning/PLAN_TRABAJO.md');
    console.log('    · docs/planning/CURRENT_STATE.md');
    console.log('    · docs/architecture/API_REFERENCE.md');
    console.log('  Archivo a crear:       1');
    console.log('    · docs/prompts/prompt-continuacion-torneos-f1.5b.md');
    console.log('  Backups a crear:       .bak-f1.5a (x5)');
    console.log('----------------------------------------------------------------');
    console.log('');
    process.exit(0);
  }

  // Aplicar cambios con backups
  backup(PLAN_TOURN);
  writeNormalized(PLAN_TOURN, r1.content);
  log('ok', 'PLAN_TRABAJO_TORNEOS.md actualizado');

  backup(BACKLOG);
  writeNormalized(BACKLOG, r2.content);
  log('ok', 'BACKLOG.md actualizado');

  backup(PLAN_TRABAJO);
  writeNormalized(PLAN_TRABAJO, r3.content);
  log('ok', 'PLAN_TRABAJO.md actualizado');

  backup(CURRENT_ST);
  writeNormalized(CURRENT_ST, r4.content);
  log('ok', 'CURRENT_STATE.md actualizado');

  backup(API_REF);
  writeNormalized(API_REF, r5.content);
  log('ok', 'API_REFERENCE.md actualizado');

  // Crear el prompt (NUEVO, sin backup)
  fs.writeFileSync(PROMPT_FILE, r6.content, 'utf8');
  log('ok', 'docs/prompts/prompt-continuacion-torneos-f1.5b.md creado');

  // ─── Resumen final ──────────────────────────────────────────────────────
  console.log('');
  console.log('----------------------------------------------------------------');
  console.log('  RESUMEN');
  console.log('----------------------------------------------------------------');
  console.log('  ✅ PLAN_TRABAJO_TORNEOS.md  (cierre F1.5a + plan F1.5b)');
  console.log('  ✅ BACKLOG.md               (BL-034 actualizado)');
  console.log('  ✅ PLAN_TRABAJO.md          (Sprint 8: F1.5a + F1.5b + evidencia)');
  console.log('  ✅ CURRENT_STATE.md         (nueva entrada F1.5a)');
  console.log('  ✅ API_REFERENCE.md         (nota de drafts pendientes en §9)');
  console.log('  ✅ docs/prompts/prompt-continuacion-torneos-f1.5b.md (NUEVO)');
  console.log('  ✅ Backups: *.bak-f1.5a (5 archivos)');
  console.log('----------------------------------------------------------------');
  console.log('');
  console.log('PRÓXIMOS PASOS:');
  console.log('  1. Verificar:  git status');
  console.log('  2. Commit:     git add docs/');
  console.log('                 git commit -m "docs(tournaments): cierre F1.5a + plan F1.5b"');
  console.log('  3. Push:       git push origin main');
  console.log('');
}

main();