#!/usr/bin/env node
/**
 * ============================================================================
 * PARAGUAY-FFAA | METALSTORM
 * Script: apply-docs-sync-2026-09-23.cjs
 * ============================================================================
 * PROPÓSITO: Sincronización masiva de documentación post BL-017/BL-023.
 * USO: node scripts/apply-docs-sync-2026-09-23.cjs
 * IDEMPOTENTE: Sí (detecta cambios ya aplicados).
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

const VERSION_OLD = 'v4.5.8';
const VERSION_NEW = 'v4.5.9';
const DATE = '2026-09-23';

const ROOT = process.cwd();
const BACKUP_SUFFIX = '.bak-docs-sync-' + DATE;

const stats = {
  filesProcessed: 0,
  filesModified: 0,
  changesApplied: 0,
  changesSkipped: 0,
  errors: 0
};

function readFile(relPath) {
  const fullPath = path.join(ROOT, relPath);
  if (!fs.existsSync(fullPath)) {
    console.log('  X No existe: ' + relPath);
    return null;
  }
  return fs.readFileSync(fullPath, 'utf8');
}

function writeFileWithBackup(relPath, content) {
  const fullPath = path.join(ROOT, relPath);
  const backupPath = fullPath + BACKUP_SUFFIX;
  if (!fs.existsSync(backupPath)) {
    fs.writeFileSync(backupPath, fs.readFileSync(fullPath, 'utf8'), 'utf8');
  }
  fs.writeFileSync(fullPath, content, 'utf8');
}

function safeReplace(content, search, replacement, label) {
  if (content.includes(replacement) && !content.includes(search)) {
    stats.changesSkipped++;
    console.log('  SKIP (ya aplicado): ' + label);
    return content;
  }
  if (!content.includes(search)) {
    stats.changesSkipped++;
    console.log('  SKIP (patron no encontrado): ' + label);
    return content;
  }
  stats.changesApplied++;
  console.log('  OK: ' + label);
  return content.split(search).join(replacement);
}

function updateHeaderVersion(content) {
  // Footer: "*Versión: v4.5.8 · Actualizado: 2026-09-22*"
  content = content.replace(
    /\*Versión:\s*v4\.5\.8\s*·\s*Actualizado:\s*2026-09-22\*/g,
    '*Versión: ' + VERSION_NEW + ' · Actualizado: ' + DATE + '*'
  );
  // Blockquote "> **Versión Activa:** v4.5.8"
  content = content.replace(
    />\s*\*\*Versión Activa:\*\*\s*v4\.5\.8/g,
    '> **Versión Activa:** ' + VERSION_NEW
  );
  // "Versión: v4.5.8"
  content = content.replace(
    /\bVersión:\s*v4\.5\.8\b/g,
    'Versión: ' + VERSION_NEW
  );
  // "> **Versión:** v4.5.8"
  content = content.replace(
    />\s*\*\*Versión:\*\*\s*v4\.5\.8/g,
    '> **Versión:** ' + VERSION_NEW
  );
  // Badge "version-v4.5.8-gold"
  content = content.replace(
    /version-v4\.5\.8-gold/g,
    'version-' + VERSION_NEW + '-gold'
  );
  return content;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. CHANGELOG.md
// ─────────────────────────────────────────────────────────────────────────────
function processChangelog() {
  const rel = 'CHANGELOG.md';
  console.log('\n[FILE] ' + rel);
  stats.filesProcessed++;

  let content = readFile(rel);
  if (!content) return;
  const original = content;

  const hygieneNote =
    '> **Nota de higiene del repo (' + DATE + '):** El commit `aa4e951` contiene\n' +
    '> los archivos de **BL-017** (`sql/001_users.sql` + `sql/039_sync_users_schema.sql`)\n' +
    '> pero su mensaje dice `chore(hall-s2-02)` por un error de tipeo durante el\n' +
    '> commit. El codigo es correcto, funcional y desplegado; solo el mensaje del\n' +
    '> commit es cosmeticamente incorrecto. No se reescribe la historia (sin force\n' +
    '> push sobre `main`). El script `apply-hall-s2-02.cjs` fue versionado\n' +
    '> correctamente en `8f57a82`.\n' +
    '\n' +
    '---\n' +
    '\n' +
    '## [4.5.9] - ' + DATE + '\n' +
    '\n' +
    '### Sincronizacion del Schema `users` + Higiene del Repo\n' +
    '\n' +
    '#### Objetivo Cumplido\n' +
    '\n' +
    '1. **BL-023 - Encoding LF:** Unificar line endings a LF en todo el repo (causa raiz de HALL-068).\n' +
    '2. **BL-017 - Sincronizacion DDL `users`:** Alinear `sql/001_users.sql` con la BD real (HALL-061 + 4 discrepancias adicionales detectadas durante la verificacion).\n' +
    '\n' +
    '#### BL-023 - Encoding LF\n' +
    '\n' +
    '| Archivo | Cambio |\n' +
    '|---|---|\n' +
    '| `.editorconfig` | NUEVO. `end_of_line = lf` para todo el repo. |\n' +
    '| `.gitattributes` | NUEVO. `text=auto eol=lf` + binarios explicitos. |\n' +
    '| Commit | `18c1183` |\n' +
    '\n' +
    '**Objetivo:** eliminar la causa raiz de HALL-068 (scripts `.cjs` con anchors fragiles por CRLF/LF mixtos).\n' +
    '\n' +
    '#### BL-017 - Sincronizacion DDL `users` (HALL-061)\n' +
    '\n' +
    '| Cambio | DDL antes | DDL despues | BD real | Accion |\n' +
    '|---|---|---|---|---|\n' +
    '| `google_id` | `TEXT` (declarado) | `TEXT` | Ausente | **Agregado a BD** + indice parcial |\n' +
    '| `must_change_password` | `DEFAULT true` | `DEFAULT false` | `DEFAULT false` | DDL alineado a BD |\n' +
    '| `token_version` | `DEFAULT 1` | `DEFAULT 1 NOT NULL` | `DEFAULT 0` | BD alineada a DDL |\n' +
    '| `last_activity` | `TIMESTAMP` | `TIMESTAMPTZ` | `TIMESTAMPTZ` | DDL alineado a BD |\n' +
    '| `created_at` | `TIMESTAMP` | `TIMESTAMPTZ` | `TIMESTAMPTZ` | DDL alineado a BD |\n' +
    '| `updated_at` | `TIMESTAMP` | `TIMESTAMPTZ` | `TIMESTAMPTZ` | DDL alineado a BD |\n' +
    '| `temporary_password_expires_at` | Ausente | `TIMESTAMPTZ` | Presente (v4.4.0) | Reflejado en DDL |\n' +
    '| `nick_self_changed_at` | Ausente | `TIMESTAMPTZ` | Presente (v4.5.0) | Reflejado en DDL |\n' +
    '\n' +
    '#### Verificacion Previa\n' +
    '\n' +
    '- `token_version IS NULL`: **0 filas** (63 totales) -> `SET NOT NULL` seguro.\n' +
    '- `must_change_password`: 13 `false` / 50 `true` -> cambio de default no afecta filas existentes.\n' +
    '- **3 INSERTs en codigo** (`register`, `addMember`, `bulkUploadEvent`) fuerzan `must_change_password: true` explicitamente -> default nunca se usa.\n' +
    '\n' +
    '#### Archivos Modificados\n' +
    '\n' +
    '| Archivo | Cambio |\n' +
    '|---|---|\n' +
    '| `sql/039_sync_users_schema.sql` | NUEVO. Migracion idempotente. |\n' +
    '| `sql/001_users.sql` | DDL sincronizado con BD real + v4.4.0 + v4.5.0. |\n' +
    '| Commit | `aa4e951` (mensaje incorrecto, contenido correcto) |\n' +
    '\n' +
    '#### Verificacion Post-Migracion\n' +
    '\n' +
    '- BD: 63 usuarios, 0 filas con `token_version = NULL`.\n' +
    '- Defaults: `must_change_password=false`, `token_version=1 NOT NULL`.\n' +
    '- `google_id` agregada + indice `idx_users_google_id`.\n' +
    '- Health check: `OK`.\n' +
    '- Sistema 100% operativo.\n' +
    '\n' +
    '#### Referencias\n' +
    '\n' +
    '- `sql/039_sync_users_schema.sql`\n' +
    '- `sql/001_users.sql`\n' +
    '- `BACKLOG.md` - BL-017, BL-023 (movidos a Completados)\n' +
    '- Commits: `18c1183`, `aa4e951`, `8f57a82`\n' +
    '\n' +
    '---\n' +
    '\n';

  content = safeReplace(
    content,
    '## [4.5.9] - 2026-09-22',
    hygieneNote + '## [4.5.9] - 2026-09-22',
    'Insertar nota de higiene + entrada [4.5.9]'
  );

  if (content !== original) {
    writeFileWithBackup(rel, content);
    stats.filesModified++;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. API_REFERENCE.md
// ─────────────────────────────────────────────────────────────────────────────
function processApiReference() {
  const rel = 'API_REFERENCE.md';
  console.log('\n[FILE] ' + rel);
  stats.filesProcessed++;

  let content = readFile(rel);
  if (!content) return;
  const original = content;

  content = updateHeaderVersion(content);

  const googleIdNote =
    '> **Campo `google_id` (v4.5.8+):** La tabla `users` incluye la columna\n' +
    '> `google_id TEXT` (nullable) con indice parcial `idx_users_google_id`. Almacena el\n' +
    '> `sub` claim de Google OAuth 2.0. Agregado el 2026-09-23 como parte de BL-017 (HALL-061).\n' +
    '\n';

  content = safeReplace(
    content,
    '### `PUT /api/profile` — Actualización con cambio de nick (v4.5.0)',
    googleIdNote + '### `PUT /api/profile` — Actualización con cambio de nick (v4.5.0)',
    'Insertar nota sobre google_id'
  );

  if (content !== original) {
    writeFileWithBackup(rel, content);
    stats.filesModified++;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. ARCHITECTURE.md
// ─────────────────────────────────────────────────────────────────────────────
function processArchitecture() {
  const rel = 'ARCHITECTURE.md';
  console.log('\n[FILE] ' + rel);
  stats.filesProcessed++;

  let content = readFile(rel);
  if (!content) return;
  const original = content;

  content = updateHeaderVersion(content);

  const note =
    '---\n' +
    '\n' +
    '## 9. Sincronizacion del Schema `users` (BL-017 - ' + DATE + ')\n' +
    '\n' +
    'Como parte del Sprint 0 (higiene tecnica), se sincronizo el DDL `sql/001_users.sql`\n' +
    'con la BD real de Supabase. Detalles completos en `CHANGELOG.md` seccion `[4.5.9]`\n' +
    'y en la migracion `sql/039_sync_users_schema.sql`.\n' +
    '\n' +
    '**Cambios aplicados:**\n' +
    '\n' +
    '| Columna | Cambio | Estado |\n' +
    '|---|---|---|\n' +
    '| `google_id` | Agregada (HALL-061) | OK en BD + indice |\n' +
    '| `must_change_password` | DEFAULT `true` -> `false` | Alineado |\n' +
    '| `token_version` | DEFAULT `0` -> `1` + `NOT NULL` | Alineado |\n' +
    '| `last_activity` | `TIMESTAMP` -> `TIMESTAMPTZ` en DDL | Alineado |\n' +
    '| `temporary_password_expires_at` | Reflejado en DDL (v4.4.0) | Documentado |\n' +
    '| `nick_self_changed_at` | Reflejado en DDL (v4.5.0) | Documentado |\n' +
    '\n' +
    '**Leccion aprendida (BL-023):** los scripts automatizados deben usar regex\n' +
    '`\\r?\\n` en lugar de `\\n` fijo para ser resilientes ante line endings mixtos\n' +
    '(CRLF/LF). Ver `HALL-068`.\n' +
    '\n' +
    '*Version: ' + VERSION_NEW + ' - Actualizado: ' + DATE + '*\n';

  content = safeReplace(
    content,
    '*Versión: v4.5.8 · Actualizado: 2026-09-22*',
    note,
    'Insertar seccion 9 sobre BL-017'
  );

  if (content !== original) {
    writeFileWithBackup(rel, content);
    stats.filesModified++;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. CURRENT_STATE.md
// ─────────────────────────────────────────────────────────────────────────────
function processCurrentState() {
  const rel = 'CURRENT_STATE.md';
  console.log('\n[FILE] ' + rel);
  stats.filesProcessed++;

  let content = readFile(rel);
  if (!content) return;
  const original = content;

  content = updateHeaderVersion(content);

  const section =
    '\n---\n' +
    '\n' +
    '## Cambios Recientes (' + DATE + ')\n' +
    '\n' +
    '### BL-017 + BL-023 Completados\n' +
    '\n' +
    '| Tarea | Descripcion | Commit |\n' +
    '|---|---|---|\n' +
    '| **BL-023** | Encoding LF unificado (`.editorconfig` + `.gitattributes`) | `18c1183` |\n' +
    '| **BL-017** | Sincronizacion DDL `users` con BD real (HALL-061 + defaults) | `aa4e951` |\n' +
    '| **Higiene** | Versionar script historico HALL-S2-02 | `8f57a82` |\n' +
    '\n' +
    '**Migracion `sql/039_sync_users_schema.sql` aplicada en Supabase:**\n' +
    '\n' +
    '- `google_id TEXT` agregada + indice parcial (HALL-061).\n' +
    '- `must_change_password` DEFAULT `true` -> `false`.\n' +
    '- `token_version` DEFAULT `0` -> `1` + `NOT NULL`.\n' +
    '\n' +
    '**Verificacion:** 63 usuarios, 0 filas con `token_version = NULL`, health check `OK`.\n' +
    '\n' +
    '---\n' +
    '\n';

  content = safeReplace(
    content,
    '# 📊 CURRENT STATE - PARAGUAY-FFAA | METALSTORM\n',
    '# 📊 CURRENT STATE - PARAGUAY-FFAA | METALSTORM\n' + section,
    'Insertar seccion de cambios recientes'
  );

  if (content !== original) {
    writeFileWithBackup(rel, content);
    stats.filesModified++;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. DEPLOYMENT_STATE.md
// ─────────────────────────────────────────────────────────────────────────────
function processDeploymentState() {
  const rel = 'DEPLOYMENT_STATE.md';
  console.log('\n[FILE] ' + rel);
  stats.filesProcessed++;

  let content = readFile(rel);
  if (!content) return;
  const original = content;

  content = updateHeaderVersion(content);

  const note =
    '\n> **Actualizacion BL-017 (' + DATE + '):** Se sincronizo el schema `users` con la BD\n' +
    '> real. Cambios aplicados via `sql/039_sync_users_schema.sql`:\n' +
    '>\n' +
    '> - `google_id TEXT` agregada + indice `idx_users_google_id` (HALL-061).\n' +
    '> - `must_change_password` DEFAULT `true` -> `false`.\n' +
    '> - `token_version` DEFAULT `0` -> `1` + `NOT NULL`.\n' +
    '>\n' +
    '> **Verificacion:** 63 usuarios, 0 filas con `token_version = NULL`.\n' +
    '\n';

  content = safeReplace(
    content,
    '# 🚀 DEPLOYMENT STATE - PARAGUAY-FFAA | METALSTORM\n',
    '# 🚀 DEPLOYMENT STATE - PARAGUAY-FFAA | METALSTORM\n' + note,
    'Insertar nota BL-017'
  );

  if (content !== original) {
    writeFileWithBackup(rel, content);
    stats.filesModified++;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 6-9. Headers simples
// ─────────────────────────────────────────────────────────────────────────────
function processSimpleHeader(rel) {
  console.log('\n[FILE] ' + rel);
  stats.filesProcessed++;

  let content = readFile(rel);
  if (!content) return;
  const original = content;

  content = updateHeaderVersion(content);

  if (content !== original) {
    writeFileWithBackup(rel, content);
    stats.filesModified++;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 10. BACKLOG.md
// ─────────────────────────────────────────────────────────────────────────────
function processBacklog() {
  const rel = 'BACKLOG.md';
  console.log('\n[FILE] ' + rel);
  stats.filesProcessed++;

  let content = readFile(rel);
  if (!content) return;
  const original = content;

  const row1 = '| **BL-023** | 🏗️ | Unificar encoding de archivos JS a LF (.editorconfig + .gitattributes) | ✅ Completado | 2026-09-23 | `18c1183` |';
  const row2 = '| **BL-017** | 🏗️ | Sincronizar DDL `sql/001_users.sql` con BD real (HALL-061) | ✅ Completado | 2026-09-23 | `aa4e951` |';

  content = safeReplace(
    content,
    '| ID | Categoría | Título | Completado | Commit |\n|---|---|---|---|---|',
    '| ID | Categoría | Título | Completado | Commit |\n|---|---|---|---|---|\n' + row1 + '\n' + row2,
    'Agregar BL-017 y BL-023 a Completados'
  );

  if (content !== original) {
    writeFileWithBackup(rel, content);
    stats.filesModified++;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 11. PLAN_TRABAJO.md
// ─────────────────────────────────────────────────────────────────────────────
function processPlanTrabajo() {
  const rel = 'PLAN_TRABAJO.md';
  console.log('\n[FILE] ' + rel);
  stats.filesProcessed++;

  let content = readFile(rel);
  if (!content) return;
  const original = content;

  const note =
    '\n> **Actualizacion ' + DATE + ':** BL-017 (Sincronizacion DDL `users`) y BL-023 (Encoding LF)\n' +
    '> cerrados. Ambos items se movieron a la seccion "Completados" de `BACKLOG.md`.\n' +
    '> Ver `CHANGELOG.md` `[4.5.9]` para detalles completos.\n' +
    '\n';

  content = safeReplace(
    content,
    '# 🔧 PLAN DE TRABAJO — SPRINTS ACTIVOS',
    '# 🔧 PLAN DE TRABAJO — SPRINTS ACTIVOS' + note,
    'Insertar nota de actualizacion'
  );

  if (content !== original) {
    writeFileWithBackup(rel, content);
    stats.filesModified++;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 12. SESSION_HANDOFF.md
// ─────────────────────────────────────────────────────────────────────────────
function processSessionHandoff() {
  const rel = 'SESSION_HANDOFF.md';
  console.log('\n[FILE] ' + rel);
  stats.filesProcessed++;

  let content = readFile(rel);
  if (!content) return;
  const original = content;

  content = updateHeaderVersion(content);

  if (content !== original) {
    writeFileWithBackup(rel, content);
    stats.filesModified++;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 13. sql/README.md
// ─────────────────────────────────────────────────────────────────────────────
function processSqlReadme() {
  const rel = 'sql/README.md';
  console.log('\n[FILE] ' + rel);
  stats.filesProcessed++;

  let content = readFile(rel);
  if (!content) return;
  const original = content;

  const entry = '| 039 | `039_sync_users_schema.sql` | Sincronizacion DDL `users` con BD real (HALL-061 + defaults) |';

  content = safeReplace(
    content,
    '| 030 | `030_scheduler_locks.sql` | Advisory locks para scheduler de eventos |',
    '| 030 | `030_scheduler_locks.sql` | Advisory locks para scheduler de eventos |\n' + entry,
    'Agregar entrada 039 al indice'
  );

  if (content !== original) {
    writeFileWithBackup(rel, content);
    stats.filesModified++;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// EJECUCION
// ─────────────────────────────────────────────────────────────────────────────

console.log('============================================================');
console.log('  PARAGUAY-FFAA | METALSTORM');
console.log('  Script de sincronizacion documental - ' + DATE);
console.log('============================================================');

try {
  processChangelog();
  processApiReference();
  processArchitecture();
  processCurrentState();
  processDeploymentState();
  processSimpleHeader('DEPLOYMENT_GUIDE.md');
  processSimpleHeader('PWA_SETUP.md');
  processSimpleHeader('README.md');
  processSimpleHeader('USER_MANUAL.md');
  processBacklog();
  processPlanTrabajo();
  processSessionHandoff();
  processSqlReadme();
} catch (err) {
  console.error('\nERROR EN EJECUCION:', err.message);
  console.error(err.stack);
  stats.errors++;
}

console.log('\n============================================================');
console.log('  RESUMEN');
console.log('============================================================');
console.log('  Archivos procesados: ' + stats.filesProcessed);
console.log('  Archivos modificados: ' + stats.filesModified);
console.log('  Cambios aplicados: ' + stats.changesApplied);
console.log('  Cambios saltados: ' + stats.changesSkipped);
console.log('  Errores: ' + stats.errors);
console.log('============================================================');
console.log('');

if (stats.filesModified > 0) {
  console.log('Backups creados con sufijo: ' + BACKUP_SUFFIX);
  console.log('');
  console.log('Proximos pasos:');
  console.log('  1. Verificar: git diff --stat');
  console.log('  2. Revisar en VS Code.');
  console.log('  3. git add .');
  console.log('  4. git commit -m "docs: sincronizacion masiva post BL-017/BL-023"');
  console.log('  5. git push origin main');
  console.log('  6. del /S *' + BACKUP_SUFFIX);
  console.log('');
}