#!/usr/bin/env node
/**
 * ============================================================================
 * PARAGUAY-FFAA | METALSTORM
 * Script: apply-sprint2-close-2026-09-23.cjs
 * ============================================================================
 * PROPÓSITO:
 *   Cerrar formalmente el Sprint 2 del PLAN_TRABAJO.md.
 *   Documentar FIX-103 como diferido al Sprint 3.
 *   Actualizar BACKLOG con BL-017, BL-023 y BL-024.
 *   Actualizar SESSION_HANDOFF con el estado final.
 *
 * USO:
 *   node scripts/apply-sprint2-close-2026-09-23.cjs
 *
 * IDEMPOTENTE: Sí.
 * FECHA: 2026-09-23
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const DATE = '2026-09-23';
const BACKUP_SUFFIX = '.bak-sprint2-close-' + DATE;

const stats = { applied: 0, skipped: 0, files: 0 };

function readFile(rel) {
  const full = path.join(ROOT, rel);
  if (!fs.existsSync(full)) { console.log('  X No existe: ' + rel); return null; }
  return fs.readFileSync(full, 'utf8');
}

function writeFileWithBackup(rel, content) {
  const full = path.join(ROOT, rel);
  const bak = full + BACKUP_SUFFIX;
  if (!fs.existsSync(bak)) fs.writeFileSync(bak, fs.readFileSync(full, 'utf8'), 'utf8');
  fs.writeFileSync(full, content, 'utf8');
}

function safeReplace(content, search, replacement, label) {
  if (content.includes(replacement) && !content.includes(search)) {
    stats.skipped++; console.log('  SKIP (ya aplicado): ' + label); return content;
  }
  if (!content.includes(search)) {
    stats.skipped++; console.log('  SKIP (patron no encontrado): ' + label); return content;
  }
  stats.applied++; console.log('  OK: ' + label);
  return content.split(search).join(replacement);
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. PLAN_TRABAJO.md — Marcar Sprint 2 cerrado + diferir FIX-103
// ─────────────────────────────────────────────────────────────────────────────
function processPlanTrabajo() {
  const rel = 'PLAN_TRABAJO.md';
  console.log('\n[FILE] ' + rel);
  stats.files++;

  let content = readFile(rel);
  if (!content) return;
  const original = content;

  // 1a. Marcar Sprint 2 cerrado al inicio del bloque de Sprint 2
  const sprint2Status =
    '## SPRINT 2 — Fixes de correctitud y seguridad  ✅ CERRADO (' + DATE + ')\n' +
    '\n' +
    '> **Cerrado el ' + DATE + '.** 7 de 8 fixes completados. FIX-103 diferido al Sprint 3.\n';

  content = safeReplace(
    content,
    '## SPRINT 2 — Fixes de correctitud y seguridad\n',
    sprint2Status,
    'Marcar Sprint 2 como cerrado'
  );

  // 1b. Agregar nota sobre FIX-103 diferido (buscar la sección del Bloque 1)
  const fix103Note =
    '**FIX-103 (CSP unsafe-inline) — DIFERIDO al Sprint 3:**\n' +
    '\n' +
    'El CSP actual mantiene `\'unsafe-inline\'` en `scriptSrc` y `styleSrc` porque la SPA\n' +
    'usa `onclick="..."` inline masivamente (~200 ocurrencias). Migrar a `addEventListener`\n' +
    'requiere un refactor grande + tests visuales exhaustivos.\n' +
    '\n' +
    '**Razón del diferimiento:**\n' +
    '- Los 7 fixes del Sprint 2 ya cerraron los hallazgos CRÍTICOS.\n' +
    '- `\'unsafe-inline\'` es un riesgo residual, no crítico (el CSP ya limita a `\'self\'` + whitelist de CDNs confiables).\n' +
    '- El frontend ya tiene `escapeHtml` para prevenir XSS por input.\n' +
    '- El Sprint 3 (tests + observabilidad) aporta más valor en este momento.\n' +
    '\n' +
    '**Ref:** BL-024 en `BACKLOG.md`.\n' +
    '\n';

  content = safeReplace(
    content,
    'Bloque 1 — ALTO:\n',
    fix103Note + 'Bloque 1 — ALTO:\n',
    'Insertar nota sobre FIX-103 diferido'
  );

  if (content !== original) {
    writeFileWithBackup(rel, content);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. BACKLOG.md — Agregar BL-017, BL-023, BL-024
// ─────────────────────────────────────────────────────────────────────────────
function processBacklog() {
  const rel = 'BACKLOG.md';
  console.log('\n[FILE] ' + rel);
  stats.files++;

  let content = readFile(rel);
  if (!content) return;
  const original = content;

  // 2a. Agregar BL-024 en Prioridad Media
  const bl024Row =
    '| **BL-024** | 🔐 | Eliminar `\'unsafe-inline\'` del CSP (FIX-103) | 📋 Diferido | L (2-3 días) | Requiere migrar ~200 `onclick` inline a `addEventListener` + nonce/hash. Diferido del Sprint 2 al Sprint 3 por bajo riesgo residual y mayor valor del Sprint 3 (tests + observabilidad). |';

  content = safeReplace(
    content,
    '| **BL-023** | 🏗️ | Unificar encoding de archivos JS a LF (.editorconfig + .gitattributes) | 📋 Priorizado | XS (1h) | Causa raíz de HALL-068. Agregar * text=auto eol=lf en .gitattributes y end_of_line = lf en .editorconfig. |',
    '| **BL-023** | 🏗️ | Unificar encoding de archivos JS a LF (.editorconfig + .gitattributes) | 📋 Priorizado | XS (1h) | Causa raíz de HALL-068. Agregar * text=auto eol=lf en .gitattributes y end_of_line = lf en .editorconfig. |\n' + bl024Row,
    'Agregar BL-024 al backlog'
  );

  if (content !== original) {
    writeFileWithBackup(rel, content);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. SESSION_HANDOFF.md — Actualizar con estado final
// ─────────────────────────────────────────────────────────────────────────────
function processSessionHandoff() {
  const rel = 'SESSION_HANDOFF.md';
  console.log('\n[FILE] ' + rel);
  stats.files++;

  let content = readFile(rel);
  if (!content) return;
  const original = content;

  const newHeader =
    '# 🔄 SESSION HANDOFF — PARAGUAY-FFAA | METALSTORM\n' +
    '\n' +
    '> **Documento de traspaso entre sesiones de trabajo.**\n' +
    '> **Actualizado:** ' + DATE + ' (cierre Sprint 2 completo)\n' +
    '> **Última sesión:** BL-023 + BL-017 + BL-022 + FIX-209 + sincronización docs\n' +
    '> **Próximo paso:** Sprint 3 — Tests y observabilidad (o pendientes operativos)\n' +
    '\n' +
    '---\n' +
    '\n' +
    '## 1. ESTADO ACTUAL AL CIERRE DE SESIÓN (' + DATE + ')\n' +
    '\n' +
    '| Aspecto | Valor |\n' +
    '|---|---|\n' +
    '| **Versión en producción** | v4.5.9 |\n' +
    '| **Commit HEAD** | `cb15e94` |\n' +
    '| **Branch** | `main` (sincronizada con origin) |\n' +
    '| **Deploy** | ✅ Activo en Fly.io (`gru`) |\n' +
    '| **Sistema** | 100% funcional |\n' +
    '| **Tests** | 187/187 passing (Vitest 5.0.1) |\n' +
    '| **Sprint 2** | ✅ Cerrado (7 de 8 fixes) |\n' +
    '\n' +
    '## 2. TRABAJO COMPLETADO EN ESTA SESIÓN\n' +
    '\n' +
    '| # | Tarea | Commit |\n' +
    '|---|---|---|\n' +
    '| 1 | BL-023 — Encoding LF | `18c1183` |\n' +
    '| 2 | BL-017 — Sincronizar DDL users (HALL-061) | `aa4e951` |\n' +
    '| 3 | Chore — Versionar script HALL-S2-02 | `8f57a82` |\n' +
    '| 4 | Docs — Sincronización masiva (11 archivos) | `cc837a5` |\n' +
    '| 5 | BL-022 — Tests dashboard.controller | `a1e1c56` |\n' +
    '| 6 | FIX-209 — Migrar presence a Supabase | `cb15e94` |\n' +
    '\n' +
    '## 3. PENDIENTES OPERATIVOS (fechas fijas)\n' +
    '\n' +
    '- 🗓️ **Jueves 24/09 (mañana)** → verificar W39 en Supabase (scheduler).\n' +
    '- 🗓️ **Post-26/09** → F4.5 (DROP tablas BM legacy, `sql/032_drop_bm_legacy_tables.sql`).\n' +
    '- 📧 **ASAP** → Reportar a Supabase el bug de tzdata (`America/Asuncion` devuelve UTC-4).\n' +
    '\n' +
    '## 4. PRÓXIMO PASO — Sprint 3 (tests + observabilidad)\n' +
    '\n' +
    '**Objetivo:** cerrar brechas de cobertura en módulos críticos y mejorar visibilidad operativa.\n' +
    '\n' +
    '**Cobertura actual:** ~50% en módulos críticos.\n' +
    '\n' +
    '**Target:** >60% en auth, admin, owner, RBAC.\n' +
    '\n' +
    '**Items principales (ver `PLAN_TRABAJO.md`):**\n' +
    '- FIX-301 — Tests para `auth.controller.js` (login, reset, change-password, verify).\n' +
    '- FIX-302 — Tests para RBAC (matriz OWNER/ADMIN/VETERANO/MIEMBRO).\n' +
    '- FIX-303 — Tests para `owner.controller.js` (backups, auditoría, sanitización PII).\n' +
    '- FIX-304 — Tests para `admin.controller.js` (promociones, jerarquía, cuotas).\n' +
    '- FIX-306 — Health checks separados (liveness vs readiness).\n' +
    '- FIX-307 — Correlation IDs en logs.\n' +
    '- FIX-308 — Logging estructurado con Pino.\n' +
    '- FIX-309 — Manejadores globales de errores en `server.js`.\n' +
    '\n' +
    '---\n' +
    '\n';

  // Reemplazar el header antiguo si existe
  if (content.includes('# 🔄 SESSION HANDOFF — PARAGUAY-FFAA | METALSTORM\n')) {
    // Reemplazar solo el bloque desde el inicio hasta la primera sección "## 1." o similar
    const firstSectionMatch = content.match(/^# 🔄 SESSION HANDOFF[\s\S]*?(?=^##\s+1\.|\n---\n\n##\s)/m);
    if (firstSectionMatch) {
      content = content.replace(firstSectionMatch[0], newHeader);
      stats.applied++;
      console.log('  OK: Actualizar header de SESSION_HANDOFF');
    }
  } else {
    // Si no existe el header, prepend el nuevo contenido
    content = newHeader + content;
    stats.applied++;
    console.log('  OK: Prepend nuevo contenido a SESSION_HANDOFF');
  }

  if (content !== original) {
    writeFileWithBackup(rel, content);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// EJECUCIÓN
// ─────────────────────────────────────────────────────────────────────────────

console.log('============================================================');
console.log('  PARAGUAY-FFAA | METALSTORM');
console.log('  Script de cierre Sprint 2 - ' + DATE);
console.log('============================================================');

try {
  processPlanTrabajo();
  processBacklog();
  processSessionHandoff();
} catch (err) {
  console.error('ERROR:', err.message);
  console.error(err.stack);
}

console.log('\n============================================================');
console.log('  RESUMEN');
console.log('============================================================');
console.log('  Archivos procesados: ' + stats.files);
console.log('  Cambios aplicados: ' + stats.applied);
console.log('  Cambios saltados: ' + stats.skipped);
console.log('============================================================\n');

if (stats.applied > 0) {
  console.log('Backups: ' + BACKUP_SUFFIX);
  console.log('');
  console.log('Proximos pasos:');
  console.log('  1. Revisar: git diff --stat');
  console.log('  2. git add .');
  console.log('  3. git commit -m "docs(sprint-2): cerrar Sprint 2 + diferir FIX-103 al Sprint 3"');
  console.log('  4. git push origin main');
  console.log('  5. del /S *' + BACKUP_SUFFIX);
  console.log('');
}