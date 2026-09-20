#!/usr/bin/env node
/**
 * Sprint 0 — Grupo F
 * FIX-007: documentar endpoints submission-window (ADR-008) en API_REFERENCE.md
 *
 * NO commitea. El OWNER revisa diff y commitea manualmente.
 *
 * TOLERANTE a EOL mixto: el archivo mezcla \r\n y \n. Los anclajes
 * multilínea usan regex con \r?\n y el reemplazo preserva el EOL
 * detectado por línea.
 */

const fs = require('fs');
const path = require('path');

// ── Verificación de raíz del repo ───────────────────────────────
if (!fs.existsSync(path.join(process.cwd(), 'package.json'))) {
  console.error('❌ No estás en la raíz del repo (falta package.json).');
  process.exit(1);
}

const TARGET = path.join(process.cwd(), 'API_REFERENCE.md');
const backups = new Set();

// ── Helpers ─────────────────────────────────────────────────────
function log(msg) { console.log(msg); }

function backup(p) {
  if (backups.has(p)) return;
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const bak = `${p}.bak-grupoF-${ts}`;
  fs.copyFileSync(p, bak);
  backups.add(p);
  log(`   🗄️  Backup: ${path.basename(bak)}`);
}

function writeFileSafe(p, content) {
  backup(p);
  fs.writeFileSync(p, content, 'utf8');
}

// Escapa caracteres especiales de regex en un string literal
function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ── Cargar documento ────────────────────────────────────────────
let doc = fs.readFileSync(TARGET, 'utf8');
const eolCountCRLF = (doc.match(/\r\n/g) || []).length;
const eolCountLF = (doc.match(/\n/g) || []).length - eolCountCRLF;
log(`📄 EOL detectado: ${eolCountCRLF} CRLF + ${eolCountLF} LF`);
log('');

const original = doc;

// ── 1. Tabla rápida: insertar 2 filas tras switch-status ────────
function insertarFilasTablaRapida() {
  const anchorLine =
    '| **Events v2** | `/api/events-v2/switch-status` | `GET` | Autenticado | Alias: estado del switch de eventos |';

  if (!doc.includes(anchorLine)) {
    log('   ⚠️  Ancla tabla rápida no encontrada. Abortando item 1.');
    return false;
  }

  // Insertar dos líneas nuevas DESPUÉS de la línea ancla.
  // Mantener el EOL de la línea original (buscamos el \r?\n que sigue).
  const re = new RegExp(
    '(' + escapeRegex(anchorLine) + ')(\r?\n)'
  );
  const nuevo =
    '$1$2' +
    '| **Events v2** | `/api/events-v2/:id/submission-window` | `GET` | Autenticado | Info de ventana de carga SQ (ADR-008) |$2' +
    '| **Events v2** | `/api/events-v2/bm/:eventId/submission-window` | `GET` | Autenticado | Info de ventana de carga BM (ADR-008) |$2';

  if (!re.test(doc)) {
    log('   ⚠️  Regex tabla rápida no matchea. Abortando item 1.');
    return false;
  }

  doc = doc.replace(re, nuevo);
  log('   ✅ Tabla rápida: 2 filas agregadas.');
  return true;
}

// ── 2. Sección 3.5.5 ────────────────────────────────────────────
function insertarSeccion355() {
  // Ancla regex: el bloque `> **Reglas de negocio BM:** ... \n\n---\n\n## 4. Hangar`
  // con EOL tolerante (\r?\n).
  const anchorRe = new RegExp(
    '> \\*\\*Reglas de negocio BM:\\*\\* ver ADR-007 §2 o `docs/adr/ADR-007-rediseno-eventos-v2\\.md`\\.\\r?\\n' +
    '\\r?\\n' +
    '---\\r?\\n' +
    '\\r?\\n' +
    '## 4\\. Hangar Militar & Upgrades 2\\.0 \\(`/api/planes`\\)'
  );

  if (!anchorRe.test(doc)) {
    log('   ⚠️  Ancla sección 3.5.5 no encontrada. Abortando item 2.');
    return false;
  }

  // Detectar EOL dominante para las líneas nuevas (usamos CRLF, es Windows).
  const EOL = '\r\n';

  const bloque = [
    '> **Reglas de negocio BM:** ver ADR-007 §2 o `docs/adr/ADR-007-rediseno-eventos-v2.md`.',
    '',
    '---',
    '',
    '### 3.5.5 Submission Window (ADR-008)',
    '',
    '> **Contexto:** las ventanas de carga están **desacopladas del ciclo del evento** (ADR-008). Un evento puede estar `CLOSED` y su ventana de carga seguir abierta hasta el deadline. Después del cierre, la participación queda en **READ-ONLY automáticamente**.',
    '',
    '#### `GET /api/events-v2/:id/submission-window`',
    '',
    'Devuelve el estado de la ventana de carga de un evento SQUADRON.',
    '',
    '- **Acceso:** Autenticado (`requireAuth`).',
    '- **Helper asociado:** `getSubmissionWindowStatus()` en `src/utils/submissionWindow.js`.',
    '- **Reglas de negocio:**',
    '  - Ventana SQ: **7 días** (jue 09:00 PY → jue 08:59 PY).',
    '  - Al cerrar la ventana, la participación queda **READ-ONLY**.',
    '  - Si el SQ fue cerrado por un BM (`closed_reason = \'BM_REPLACED\'`), la ventana del SQ **sigue abierta** hasta su deadline original.',
    '- **Response Exitosa (200 OK):**',
    '  ```json',
    '  {',
    '    "success": true,',
    '    "status": "OPEN",',
    '    "submission_opens_at": "2026-09-17T12:00:00Z",',
    '    "submission_closes_at": "2026-09-24T11:59:59Z",',
    '    "seconds_remaining": 345600,',
    '    "seconds_until_open": 0,',
    '    "can_submit": true',
    '  }',
    '  ```',
    '',
    '#### `GET /api/events-v2/bm/:eventId/submission-window`',
    '',
    'Devuelve el estado de la ventana de carga de un evento BLACK_MARKET.',
    '',
    '- **Acceso:** Autenticado (`requireAuth`).',
    '- **Helper asociado:** `getSubmissionWindowStatus()` en `src/utils/submissionWindow.js`.',
    '- **Reglas de negocio:**',
    '  - Ventana BM: **6 días** (mié 17:00 PY → mar 16:59 PY).',
    '  - Al cerrar la ventana, la participación queda **READ-ONLY**.',
    '  - **Excepción:** el `purchase` de BM **NO** valida la ventana (BM es opcional y no determinante para el escuadrón).',
    '- **Response:** mismo esquema que el endpoint SQ.',
    '',
    '#### Estados de `status`',
    '',
    '| Valor | Significado |',
    '|---|---|',
    '| `NOT_SET` | El evento no tiene `submission_opens_at` / `submission_closes_at` (backfill pendiente) |',
    '| `NOT_OPEN` | La ventana aún no abrió (`now < submission_opens_at`) |',
    '| `OPEN` | Dentro de la ventana, se puede cargar |',
    '| `CLOSED` | La ventana cerró, la participación ya no admite cambios (READ-ONLY) |',
    '',
    '#### Campos del schema de respuesta',
    '',
    '| Campo | Tipo | Descripción |',
    '|---|---|---|',
    '| `status` | `NOT_SET` \\| `NOT_OPEN` \\| `OPEN` \\| `CLOSED` | Estado actual de la ventana |',
    '| `submission_opens_at` | ISO8601 \\| null | Cuándo abre la ventana |',
    '| `submission_closes_at` | ISO8601 \\| null | Cuándo cierra la ventana |',
    '| `seconds_remaining` | int \\| null | Segundos hasta el cierre (null si `NOT_SET`) |',
    '| `seconds_until_open` | int \\| null | Segundos hasta la apertura (null si `NOT_SET` o ya abrió) |',
    '| `can_submit` | boolean | `true` solo si `status === \'OPEN\'` |',
    '',
    '#### Códigos de Error',
    '',
    '| Código | HTTP | Cuándo |',
    '|---|---|---|',
    '| `EVENT_NOT_FOUND` | 404 | El ID no existe |',
    '| `EVENT_CANCELLED` | 409 | El evento está `CANCELLED` |',
    '| `SUBMISSION_WINDOW_NOT_SET` | 422 | El evento no tiene las columnas de ventana pobladas |',
    '| `SUBMISSION_WINDOW_NOT_OPEN` | 403 | Intento de carga antes de `submission_opens_at` |',
    '| `SUBMISSION_WINDOW_CLOSED` | 403 | Intento de carga después de `submission_closes_at` |',
    '| `SUBMISSION_WINDOW_INVALID` | 400 | Estructura de ventana inválida (`opens_at >= closes_at`) |',
    '',
    '#### Helper `src/utils/submissionWindow.js`',
    '',
    'Dos funciones puras, testeadas en 39 casos (Vitest):',
    '',
    '| Función | Retorno | Uso |',
    '|---|---|---|',
    '| `validateSubmissionWindow(event, now)` | `{ valid: boolean, reason: string \\| null }` | Usado por los controladores para aceptar/rechazar cargas |',
    '| `getSubmissionWindowStatus(event, now)` | `{ status, submission_opens_at, submission_closes_at, seconds_remaining, seconds_until_open, can_submit }` | Usado por los endpoints `GET /submission-window` |',
    '',
    '#### Referencias',
    '',
    '- ADR-008: `docs/adr/ADR-008-ventanas-carga-desacopladas.md`',
    '- Código: `src/utils/submissionWindow.js`, `src/controllers/events-v2.controller.js`, `src/controllers/events-v2-bm.controller.js`',
    '- SQL: `sql/034_submission_windows.sql`',
    '',
    '---',
    '',
    '## 4. Hangar Militar & Upgrades 2.0 (`/api/planes`)',
  ].join(EOL);

  doc = doc.replace(anchorRe, bloque);
  log('   ✅ Sección 3.5.5 insertada.');
  return true;
}

// ── 3. Header + footer ──────────────────────────────────────────
function bumpearHeaderFooter() {
  const beforeH = doc;
  doc = doc.replace(
    'para la versión v4.0.0 del núcleo táctico',
    'para la versión v4.3.0 del núcleo táctico'
  );
  const okHeader = beforeH !== doc;

  const beforeF = doc;
  doc = doc.replace(
    '*Versión: v4.0.5 · Actualizado: 18 Septiembre 2026*',
    '*Versión: v4.3.0 · Actualizado: 20 Septiembre 2026*'
  );
  const okFooter = beforeF !== doc;

  log(`   ${okHeader ? '✅' : '⚠️ '} Header (v4.0.0 → v4.3.0)`);
  log(`   ${okFooter ? '✅' : '⚠️ '} Footer (v4.0.5 → v4.3.0)`);
  return okHeader && okFooter;
}

// ── Ejecutar ────────────────────────────────────────────────────
log('🛠️  Sprint 0 — Grupo F (FIX-007)');
log('');

const ok1 = insertarFilasTablaRapida();
const ok2 = insertarSeccion355();
const ok3 = bumpearHeaderFooter();

if (!ok1 || !ok2 || !ok3) {
  log('');
  log('❌ Algún ítem falló. NO se escribió el archivo. Nada cambió.');
  process.exit(1);
}

if (doc === original) {
  log('');
  log('⚠️  No se aplicó ningún cambio. Revisá los anclajes.');
  process.exit(0);
}

writeFileSafe(TARGET, doc);

log('');
log('📋 Instrucciones de commit:');
log('   1. git diff API_REFERENCE.md');
log('   2. git add API_REFERENCE.md');
log('   3. git commit -m "docs(sprint-0-grupoF): documentar endpoints submission-window (FIX-007)"');
log('   4. git push origin main');
log('');
log('   Después del commit:');
log('   5. Mini-commit para reemplazar TBD en PLAN_TRABAJO.md');
log('   6. git add scripts/sprint-0-grupoF.cjs');
log('   7. git commit -m "chore(sprint-0): versionar script .cjs del Grupo F"');