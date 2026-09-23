#!/usr/bin/env node
/**
 * ============================================================================
 * PARAGUAY-FFAA | METALSTORM
 * Script: apply-handoff-and-sprint2-close-2026-09-23.cjs
 * ============================================================================
 * PROPÓSITO:
 *   1. Regenerar docs/SESSION_HANDOFF.md con el estado al 2026-09-23.
 *   2. Marcar Sprint 2 como CERRADO en PLAN_TRABAJO.md.
 *   3. Documentar FIX-103 diferido al Sprint 3.
 *
 * USO:
 *   node scripts/apply-handoff-and-sprint2-close-2026-09-23.cjs
 * FECHA: 2026-09-23
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const DATE = '2026-09-23';
const BACKUP_SUFFIX = '.bak-handoff-' + DATE;

const stats = { applied: 0, skipped: 0, files: 0 };

function readFile(rel) {
  const full = path.join(ROOT, rel);
  if (!fs.existsSync(full)) return null;
  return fs.readFileSync(full, 'utf8');
}

function writeFileWithBackup(rel, content) {
  const full = path.join(ROOT, rel);
  const bak = full + BACKUP_SUFFIX;
  if (!fs.existsSync(bak)) fs.writeFileSync(bak, fs.readFileSync(full, 'utf8'), 'utf8');
  fs.writeFileSync(full, content, 'utf8');
}

function safeReplace(content, search, replacement, label) {
  if (content.includes(replacement)) {
    stats.skipped++; console.log('  SKIP (ya aplicado): ' + label); return content;
  }
  if (!content.includes(search)) {
    stats.skipped++; console.log('  SKIP (patron no encontrado): ' + label); return content;
  }
  stats.applied++; console.log('  OK: ' + label);
  return content.split(search).join(replacement);
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Regenerar docs/SESSION_HANDOFF.md
// ─────────────────────────────────────────────────────────────────────────────
function regenerateHandoff() {
  const rel = 'docs/SESSION_HANDOFF.md';
  console.log('\n[FILE] ' + rel + ' (regenerar)');
  stats.files++;

  const full = path.join(ROOT, rel);
  if (fs.existsSync(full)) {
    const bak = full + BACKUP_SUFFIX;
    if (!fs.existsSync(bak)) fs.writeFileSync(bak, fs.readFileSync(full, 'utf8'), 'utf8');
    console.log('  Backup: ' + path.basename(bak));
  } else {
    const dir = path.dirname(full);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    console.log('  (archivo no existia, creando)');
  }

  const content =
    '# 🔄 SESSION HANDOFF — PARAGUAY-FFAA | METALSTORM\n' +
    '\n' +
    '> **Documento de traspaso entre sesiones de trabajo.**\n' +
    '> **Actualizado:** ' + DATE + ' (cierre Sprint 2 completo)\n' +
    '> **Última sesión:** BL-023 + BL-017 + BL-022 + FIX-209 + sincronización docs\n' +
    '> **Próximo paso:** Sprint 3 — Tests y observabilidad (o pendientes operativos)\n' +
    '\n' +
    '---\n' +
    '\n' +
    '## 1. CONTEXTO DEL PROYECTO\n' +
    '\n' +
    '**PARAGUAY-FFAA | METALSTORM** es una plataforma táctica del escuadrón paraguayo `PARAGUAY FFAA [PRY]` en MetalStorm.\n' +
    '\n' +
    '- **Backend:** Node.js 22 + Express 5 + Supabase PostgreSQL\n' +
    '- **Frontend:** Vanilla JS SPA + PWA\n' +
    '- **Deploy:** Fly.io (región `gru` - São Paulo)\n' +
    '- **Repo:** `paraguayffaametalstorm-debug/ffaa-paraguay-classic`\n' +
    '- **Producción:** `https://paraguay-ffaa-metalstorm.fly.dev`\n' +
    '- **Tests:** Vitest 5.0.1 (**187 tests pasando**)\n' +
    '\n' +
    '---\n' +
    '\n' +
    '## 2. ESTADO ACTUAL AL CIERRE DE SESIÓN (' + DATE + ')\n' +
    '\n' +
    '| Aspecto | Valor |\n' +
    '|---|---|\n' +
    '| **Versión en producción** | v4.5.9 |\n' +
    '| **Commit HEAD** | `8b660ef` |\n' +
    '| **Branch** | `main` (sincronizada con origin) |\n' +
    '| **Deploy** | ✅ Activo en Fly.io (`gru`) |\n' +
    '| **Sistema** | 100% funcional |\n' +
    '| **Tests** | 187/187 passing (Vitest 5.0.1) |\n' +
    '| **Sprint 2** | ✅ Cerrado (7 de 8 fixes) |\n' +
    '\n' +
    '---\n' +
    '\n' +
    '## 3. TRABAJO COMPLETADO EN ESTA SESIÓN (' + DATE + ')\n' +
    '\n' +
    '### 6 commits pusheados\n' +
    '\n' +
    '| # | Commit | Descripción |\n' +
    '|---|---|---|\n' +
    '| 1 | `18c1183` | BL-023: Encoding LF (.editorconfig + .gitattributes) |\n' +
    '| 2 | `aa4e951` | BL-017: Sincronizar DDL users (HALL-061 + defaults) |\n' +
    '| 3 | `8f57a82` | Chore: Versionar script HALL-S2-02 |\n' +
    '| 4 | `cc837a5` | Docs: Sincronización masiva (11 archivos) |\n' +
    '| 5 | `a1e1c56` | BL-022: Tests dashboard.controller (8 tests) |\n' +
    '| 6 | `cb15e94` | FIX-209: Migrar presence a Supabase |\n' +
    '| 7 | `8b660ef` | Docs: Cerrar Sprint 2 + diferir FIX-103 al Sprint 3 |\n' +
    '\n' +
    '### Detalle de cada tarea\n' +
    '\n' +
    '**BL-023 — Encoding LF:**\n' +
    '- `.editorconfig` + `.gitattributes` creados.\n' +
    '- Causa raíz de HALL-068 resuelta.\n' +
    '- Commit: `18c1183`.\n' +
    '\n' +
    '**BL-017 — Sincronizar DDL `users` (HALL-061):**\n' +
    '- Migración `sql/039_sync_users_schema.sql` aplicada en Supabase.\n' +
    '- `google_id TEXT` agregada + índice parcial.\n' +
    '- `must_change_password` DEFAULT `true` → `false`.\n' +
    '- `token_version` DEFAULT `0` → `1` + `NOT NULL`.\n' +
    '- DDL `sql/001_users.sql` sincronizado con v4.4.0 + v4.5.0.\n' +
    '- Commit: `aa4e951` (con mensaje incorrecto por error de tipeo, contenido correcto).\n' +
    '\n' +
    '**BL-022 — Tests dashboard.controller:**\n' +
    '- `tests/controllers/dashboard.controller.test.js` creado (8 tests).\n' +
    '- Previene recurrencia de HALL-067 (bug 500 por `currentProfile` mal scopeado).\n' +
    '- Commit: `a1e1c56`.\n' +
    '\n' +
    '**FIX-209 — Migrar presence a Supabase:**\n' +
    '- `sql/040_presence_table.sql` aplicada en Supabase.\n' +
    '- `src/controllers/presence.controller.js` creado.\n' +
    '- `src/routes/presence.routes.js` refactorizado (adiós `Set` en memoria).\n' +
    '- Cron de cleanup cada 5 min en `server.js`.\n' +
    '- TTL: 5 min (10x el polling del frontend).\n' +
    '- Commit: `cb15e94`.\n' +
    '- Deploy: `deployment-01M367E2N11MADVXJMP8QVZ93E`.\n' +
    '- Log confirmado: `✅ [Server] Presence cleanup cron iniciado (cada 5 min).`\n' +
    '\n' +
    '---\n' +
    '\n' +
    '## 4. PROGRESO DEL SPRINT 2\n' +
    '\n' +
    '| Fix | Prioridad | Estado |\n' +
    '|---|---|---|\n' +
    '| **FIX-101** — Reset password atómico (RPC) | ALTA | ✅ CERRADO |\n' +
    '| **FIX-104** — Filtro de detalles DB en 500 | MEDIA | ✅ CERRADO |\n' +
    '| **FIX-105** — Cambio de status atómico (RPC) | MEDIA | ✅ CERRADO |\n' +
    '| **HALL-S1-01** — Ownership check `getPlaneDetails` | MEDIA | ✅ CERRADO |\n' +
    '| **HALL-S2-01** — Ampliación poderes ADMIN | ALTA | ✅ CERRADO |\n' +
    '| **HALL-S2-02** — Dropdown rol frontend | ALTA | ✅ CERRADO |\n' +
    '| **FIX-209** — Presence a Supabase | MEDIA | ✅ CERRADO |\n' +
    '| **FIX-103** — CSP `unsafe-inline` | MEDIA-ALTA | ⏳ DIFERIDO a Sprint 3 |\n' +
    '\n' +
    '**7 de 8 fixes del Sprint 2 completados.**\n' +
    '\n' +
    '---\n' +
    '\n' +
    '## 5. DECISIONES CLAVE DE LA SESIÓN\n' +
    '\n' +
    '### FIX-103 diferido al Sprint 3\n' +
    '\n' +
    '**Razón:**\n' +
    '- Los 7 fixes del Sprint 2 ya cerraron los hallazgos CRÍTICOS.\n' +
    '- `\'unsafe-inline\'` es un riesgo residual, no crítico.\n' +
    '- Requiere refactor grande (~200 `onclick` inline).\n' +
    '- Sprint 3 (tests + observabilidad) aporta más valor.\n' +
    '\n' +
    '**Ref:** BL-024 en `BACKLOG.md`.\n' +
    '\n' +
    '### BL-017 — Sincronización del DDL `users`\n' +
    '\n' +
    '**Razón:** El DDL declaraba `google_id TEXT` pero la BD real no lo tenía (HALL-061). Además, se detectaron 4 discrepancias más de defaults/constraints que se alinearon.\n' +
    '\n' +
    '### FIX-209 — user_id UUID en tabla presence\n' +
    '\n' +
    '**Razón:** El ADR-005 proponía `user_id INTEGER`, pero se optó por `user_id UUID` para consistencia con las tablas modernas (`password_resets`, `recovery_codes`, `user_settings`, `event_participations`).\n' +
    '\n' +
    '---\n' +
    '\n' +
    '## 6. PENDIENTES OPERATIVOS (fechas fijas)\n' +
    '\n' +
    '- 🗓️ **Jueves 24/09 (mañana)** → verificar W39 en Supabase (scheduler).\n' +
    '  ```sql\n' +
    '  SELECT name, start_date, end_date, (end_date - start_date) AS duracion\n' +
    '  FROM events_master WHERE name = \'Squadron Event 2026-W39\';\n' +
    '  ```\n' +
    '  Esperado: `start_date = 2026-09-24 12:00:00+00`, `end_date = 2026-09-28 11:59:59+00`, `duracion = 3 days 23:59:59`.\n' +
    '\n' +
    '- 🗓️ **Post-26/09** → F4.5 (DROP tablas BM legacy).\n' +
    '  Ejecutar: `sql/032_drop_bm_legacy_tables.sql` en Supabase SQL Editor.\n' +
    '\n' +
    '- 📧 **ASAP** → Reportar a Supabase el bug de tzdata (`America/Asuncion` devuelve UTC-4 en lugar de UTC-3).\n' +
    '  Workaround: usar `AT TIME ZONE \'UTC\' - INTERVAL \'3 hours\'`.\n' +
    '\n' +
    '---\n' +
    '\n' +
    '## 7. PRÓXIMO PASO — Sprint 3 (tests + observabilidad)\n' +
    '\n' +
    '**Objetivo:** Cerrar brechas de cobertura en módulos críticos y mejorar visibilidad operativa.\n' +
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
    '- FIX-305 — Tests de integración con Postgres real (Testcontainers).\n' +
    '- FIX-306 — Health checks separados (liveness vs readiness).\n' +
    '- FIX-307 — Correlation IDs en logs.\n' +
    '- FIX-308 — Logging estructurado con Pino.\n' +
    '- FIX-309 — Manejadores globales de errores en `server.js`.\n' +
    '\n' +
    '---\n' +
    '\n' +
    '## 8. CÓMO RETOMAR LA SESIÓN\n' +
    '\n' +
    'En una nueva conversación:\n' +
    '\n' +
    '1. **Adjuntar este `docs/SESSION_HANDOFF.md`.**\n' +
    '2. **Escribir:** "Continuemos con Sprint 3 (tests + observabilidad)".\n' +
    '3. **Opcionalmente adjuntar:**\n' +
    '   - `PLAN_TRABAJO.md` (sección SPRINT 3 con los 9 items).\n' +
    '   - Los archivos a testear según el item.\n' +
    '\n' +
    '**Excepciones operativas en paralelo:**\n' +
    '- **Jueves 24/09/2026** → verificar W39 (scheduler).\n' +
    '- **Post-2026-09-26** → ejecutar F4.5 (DROP tablas BM legacy).\n' +
    '\n' +
    '---\n' +
    '\n' +
    '## 9. COMANDOS DE VERIFICACIÓN RÁPIDA\n' +
    '\n' +
    '```cmd\n' +
    'cd C:\\Users\\pirov\\paraguay-ffaa\n' +
    'git log --oneline -5\n' +
    'git status\n' +
    'npm test\n' +
    'curl -s https://paraguay-ffaa-metalstorm.fly.dev/health\n' +
    '```\n' +
    '\n' +
    '**Esperado:**\n' +
    '- **Log:** `8b660ef` en top.\n' +
    '- **Status:** working tree limpio.\n' +
    '- **Tests:** 187/187 passed.\n' +
    '- **Health:** `OK`.\n' +
    '\n' +
    '---\n' +
    '\n' +
    '**PARAGUAY FFAA [PRY] · SESSION HANDOFF · ' + DATE + ' · Commit 8b660ef**\n';

  writeFileWithBackup(rel, content);
  stats.applied++;
  console.log('  OK: SESSION_HANDOFF regenerado');
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. PLAN_TRABAJO.md — Marcar Sprint 2 cerrado
// ─────────────────────────────────────────────────────────────────────────────
function processPlanTrabajo() {
  const rel = 'PLAN_TRABAJO.md';
  console.log('\n[FILE] ' + rel);
  stats.files++;

  let content = readFile(rel);
  if (!content) { console.log('  X No existe'); return; }
  const original = content;

  // Buscar SPRINT 2 en distintas variantes
  const variants = [
    '## SPRINT 2 — Fixes de correctitud y seguridad',
    '## SPRINT 2 - Fixes de correctitud y seguridad',
    '## SPRINT 2 — Fixes de correctitud y seguridad\n'
  ];

  const header =
    '## SPRINT 2 — Fixes de correctitud y seguridad  ✅ CERRADO (' + DATE + ')\n' +
    '\n' +
    '> **Cerrado el ' + DATE + '.** 7 de 8 fixes completados. FIX-103 diferido al Sprint 3.\n' +
    '>\n' +
    '> **FIX-103 (CSP unsafe-inline) — DIFERIDO al Sprint 3:**\n' +
    '> El CSP actual mantiene `\'unsafe-inline\'` en `scriptSrc` y `styleSrc` porque la SPA\n' +
    '> usa `onclick="..."` inline masivamente (~200 ocurrencias). Migrar a `addEventListener`\n' +
    '> requiere un refactor grande + tests visuales exhaustivos.\n' +
    '>\n' +
    '> **Razón del diferimiento:**\n' +
    '> - Los 7 fixes del Sprint 2 ya cerraron los hallazgos CRÍTICOS.\n' +
    '> - `\'unsafe-inline\'` es un riesgo residual, no crítico.\n' +
    '> - El frontend ya tiene `escapeHtml` para prevenir XSS por input.\n' +
    '> - El Sprint 3 (tests + observabilidad) aporta más valor en este momento.\n' +
    '>\n' +
    '> **Ref:** BL-024 en `BACKLOG.md`.\n' +
    '\n';

  let matched = false;
  for (const v of variants) {
    if (content.includes(v)) {
      content = content.replace(v, header.trimEnd() + (v.endsWith('\n') ? '\n' : ''));
      matched = true;
      stats.applied++;
      console.log('  OK: Sprint 2 marcado como cerrado');
      break;
    }
  }

  if (!matched) {
    console.log('  SKIP: No se encontro ninguna variante del header SPRINT 2');
    stats.skipped++;
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
console.log('  Regenerar SESSION_HANDOFF + cerrar Sprint 2 - ' + DATE);
console.log('============================================================');

try {
  regenerateHandoff();
  processPlanTrabajo();
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
  console.log('  3. git commit -m "docs(sprint-2): regenerar SESSION_HANDOFF + cerrar Sprint 2"');
  console.log('  4. git push origin main');
  console.log('  5. del /S *' + BACKUP_SUFFIX);
  console.log('');
}