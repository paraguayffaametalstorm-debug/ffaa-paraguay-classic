/**
 * ============================================================================
 * PARAGUAY-FFAA | METALSTORM
 * F4.0b — Actualizar SESSION_HANDOFF.md con estado real post-F6/F7
 * ============================================================================
 * Sprint 4 — Housekeeping (docs)
 *
 * Cambios:
 *   1. Header: fecha, última sesión, próximo paso
 *   2. Sección 2: versión v4.5.12 → v4.7.0, HEAD 84771b2 → 237d86c
 *   3. Sección 3.6 NUEVA: trabajo post-Sprint 3 (F6, F7, normativas)
 *   4. Sección 5: marcar items como históricos (fechas ya pasadas)
 *   5. Sección 6: actualizar tabla Sprint 4 con estado real
 *   6. Sección 8: HEAD en comandos de verificación
 *   7. Footer: fecha + commit
 *
 * Uso:
 *   node scripts/f4.0b-update-session-handoff.cjs
 *
 * Rollback:
 *   ren docs\SESSION_HANDOFF.md.bak-f4.0b docs\SESSION_HANDOFF.md
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const FILE = path.join(ROOT, 'docs', 'SESSION_HANDOFF.md');

function readFile(p) {
  if (!fs.existsSync(p)) throw new Error(`No existe: ${p}`);
  return fs.readFileSync(p, 'utf8');
}

function writeFile(p, content) {
  fs.writeFileSync(p, content, 'utf8');
}

function backup(p) {
  const bak = p + '.bak-f4.0b';
  if (fs.existsSync(bak)) fs.unlinkSync(bak);
  fs.copyFileSync(p, bak);
  console.log(`   💾 Backup: ${path.basename(bak)}`);
}

function replaceOnce(content, search, replacement, label) {
  const count = content.split(search).length - 1;
  if (count === 0) {
    throw new Error(`[${label}] No se encontró:\n${search.substring(0, 150)}...`);
  }
  if (count > 1) {
    throw new Error(`[${label}] Aparece ${count} veces (debe ser único):\n${search.substring(0, 150)}...`);
  }
  return content.replace(search, replacement);
}

function main() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  F4.0b — Actualizar SESSION_HANDOFF.md');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');

  console.log('📄 Modificando docs/SESSION_HANDOFF.md');
  backup(FILE);
  let doc = readFile(FILE);

  // ── Cambio 1: Header ───────────────────────────────────────────
  doc = replaceOnce(
    doc,
    `> **Actualizado:** 2026-10-08 (post-migración a Render)
> **Última sesión:** Fix del scheduler en Render (HALL-072)
> **Próximo paso:** Verificar 24h de funcionamiento + Sprint 4 (Deuda técnica)`,
    `> **Actualizado:** 2026-10-10 (post-F6/F7 + Sprint 4 en curso)
> **Última sesión:** Sprint 4 — Housekeeping (F4.0a + F4.0b)
> **Próximo paso:** F4.5 (DROP BM legacy) · BL-027 (migrar frontend legacy) · BL-025 (tests)`,
    'Header'
  );

  // ── Cambio 2: Sección 2 — versión + HEAD ───────────────────────
  doc = replaceOnce(
    doc,
    `| **Versión en producción** | v4.5.12 |
| **Commit HEAD** | \`84771b2\` |`,
    `| **Versión en producción** | v4.7.0 |
| **Commit HEAD** | \`237d86c\` |`,
    'Sección 2 versión + HEAD'
  );

  // ── Cambio 3: Sección 2 — tabla de estado (mantener)
  // Actualizamos también el "Sprint 3" → "Sprint 3 + F6/F7"
  doc = replaceOnce(
    doc,
    `| **Sprint 3** | ✅ Cerrado |
| **Fix HALL-072** | ✅ Completado |`,
    `| **Sprint 3** | ✅ Cerrado |
| **Fix HALL-072** | ✅ Completado |
| **F6 (Panel Admin v4.7.0)** | ✅ Completado |
| **F7 (Export resultados v4.6.0)** | ✅ Completado |`,
    'Sección 2 estado'
  );

  // ── Cambio 4: Insertar nueva sección 3.6 (post-F6/F7) ──────────
  // La insertamos justo antes de la sección "## 4. DEUDA TÉCNICA"
  doc = replaceOnce(
    doc,
    `## 4. DEUDA TÉCNICA REGISTRADA (BL-025)`,
    `## 3.6. TRABAJO POST-SPRINT 3 (F6 + F7 + Normativas)

### F7 — Exportación de Resultados (v4.6.0 · 2026-10-08)

Feature nueva de exportación visual de resultados de eventos:
- Backend: \`GET /api/admin/results/:eventId/export\` (\`src/controllers/export.controller.js\`).
- Frontend: sección integrada en panel admin + \`apiExportEventResults()\` en \`js/api.js\`.
- Estilos en \`css/views.css\` (report-header, badge-verde, etc.).
- Mockup: \`docs/mockups/mockup-resultados.html\`.

**Bugs resueltos en el proceso:**
- HALL-073 (CORS Render) → var \`ALLOWED_ORIGINS\` actualizada.
- HALL-074 (\`loadExportEventsList\` no invocada) → fix en \`loadAdminPanel()\`.
- HALL-075 (nick incorrecto) → priorizar \`users.nick\` sobre \`event_participations.nick\`.

### F6 — Rediseño del Panel de Comandancia (v4.7.0 · 2026-10-09)

- Sidebar colapsable con 5 secciones.
- Lazy loading de secciones.
- Persistencia en \`localStorage\` (sección activa + estado del sidebar).
- KPIs en tiempo real.
- Distribución de rendimiento (semáforo 4 cuadrantes).
- Modo compacto de tabla.
- Mobile drawer.

**5 bugs corregidos** (ver \`docs/HANDOFF-v4.7.0.md\`).

### Infraestructura

- **Migración completa a Render.com** como único entorno de producción.
- **Fly.io app destruida** (HALL-076, costo \$0/mes).
- **Backup de 19 variables** de entorno en Bitwarden.
- **URL oficial:** \`https://paraguay-ffaa-metalstorm.onrender.com\`.

### Pendientes documentales registrados

- HALL-071: columna \`closed_reason\` documentada pero inexistente en BD.
- \`b48ca91\` (fix normativas) + \`e698cc1\` (scripts F6) no figuran en CHANGELOG.

---

## 4. DEUDA TÉCNICA REGISTRADA (BL-025)`,
    'Sección 3.6 nueva'
  );

  // ── Cambio 5: Sección 5 — marcar items como históricos ────────
  doc = replaceOnce(
    doc,
    `### 🔴 Jueves 24/09/2026 (MAÑANA)

**12:00 UTC (09:00 PY)** → el scheduler v2.0 debe abrir W39 automáticamente.

**Verificación (SQL en Supabase):**
\`\`\`sql
SELECT name, start_date, end_date, status
FROM events_master
WHERE name LIKE '%W39%';
\`\`\`

**Esperado:**
- \`start_date = 2026-09-24 12:00:00+00\`
- \`end_date = 2026-09-28 11:59:59+00\`
- \`status = OPEN\` (el scheduler hace \`SCHEDULED → OPEN\`)

### 🟡 Post-26/09/2026

**F4.5 — DROP tablas BM legacy:**
\`\`\`sql
-- Ejecutar en SQL Editor de Supabase
-- Script: sql/032_drop_bm_legacy_tables.sql
\`\`\`

Tablas: \`bm_events\`, \`bm_missions\`, \`bm_progress\`, \`bm_discounts\` (0 filas cada una).`,
    `### ✅ Jueves 24/09/2026 — COMPLETADO

El scheduler v2.0 abrió W39 correctamente. Verificado en producción.

### 🟡 Post-26/09/2026 — PENDIENTE

**F4.5 — DROP tablas BM legacy:**
\`\`\`sql
-- Ejecutar en SQL Editor de Supabase
-- Script: sql/032_drop_bm_legacy_tables.sql
\`\`\`

Tablas: \`bm_events\`, \`bm_missions\`, \`bm_progress\`, \`bm_discounts\` (0 filas cada una).

**Estado actual:** script listo, pendiente de ejecución (Sprint 4).`,
    'Sección 5 items'
  );

  // ── Cambio 6: Sección 6 — actualizar tabla Sprint 4 ───────────
  doc = replaceOnce(
    doc,
    `## 6. PRÓXIMO PASO — Sprint 4 (Deuda Técnica)

**Objetivo:** Cerrar deuda técnica acumulada del Sprint 2 y Sprint 3.

**Items principales:**

| ID | Descripción | Esfuerzo |
|---|---|---|
| **BL-025** | Re-implementar 69 tests con contrato real de controllers | M (1 día) |
| **BL-024** | Eliminar \`'unsafe-inline'\` del CSP (migrar ~200 onclick) | L (2-3 días) |
| **FIX-305** | Tests de integración con Postgres real (Testcontainers) | L (2-3 días) |
| **F4.5** | Ejecutar DROP de tablas BM legacy | XS (10 min) |
| **BL-016** | Auditar claves localStorage en frontend | S (4h) |
| **BL-018** | Completar §3.5.2-3.5.4 en API_REFERENCE.md | M (4h) |`,
    `## 6. PRÓXIMO PASO — Sprint 4 (Deuda Técnica)

**Objetivo:** Cerrar deuda técnica acumulada + terminar la migración legacy.

**Items principales (ordenados por prioridad):**

| ID | Descripción | Esfuerzo | Estado |
|---|---|---|---|
| **F4.0a** | Actualizar ADR-005 Proposed → Accepted | XS | ✅ Cerrado (\`237d86c\`) |
| **F4.0b** | Actualizar SESSION_HANDOFF.md | XS | 🟡 En curso |
| **F4.0c** | Limpiar .bak-* del disco | XS | ⏳ Pendiente |
| **F4.5** | Ejecutar DROP de tablas BM legacy | XS | ⏳ Pendiente |
| **BL-027** | Eliminar \`savePerformance\` muerta de \`js/api.js\` | S | ⏳ Pendiente |
| **BL-028** | Crear \`GET /api/events-v2/mine\` | M | ⏳ Pendiente |
| **BL-029** | Migrar \`js/views.js\` a v2 (history/my-history) | M | ⏳ Pendiente |
| **BL-025** | Re-implementar 69 tests con contrato real | M (1 día) | ⏳ Pendiente |
| **BL-024** | Eliminar \`'unsafe-inline'\` del CSP | L (2-3 días) | ⏳ Pendiente |
| **FIX-305** | Tests de integración con Postgres real | L (2-3 días) | ⏳ Pendiente |
| **BL-016** | Auditar claves localStorage en frontend | S (4h) | ⏳ Pendiente |
| **BL-018** | Completar §3.5.2-3.5.4 en API_REFERENCE.md | M (4h) | ⏳ Pendiente |

**Contexto crítico:** el proyecto tiene **2 arquitecturas paralelas** vivas (legacy + v2).
La migración frontend/backend quedó al 50%. Antes de tocar legacy hay que completar la migración.`,
    'Sección 6 Sprint 4'
  );

  // ── Cambio 7: Sección 7 — actualizar excepciones ─────────────
  doc = replaceOnce(
    doc,
    `**Excepciones operativas en paralelo:**
- **Jueves 24/09/2026** → verificar W39.
- **Post-26/09/2026** → ejecutar F4.5.`,
    `**Excepciones operativas en paralelo:**
- **Post-26/09/2026** → ejecutar F4.5 (DROP tablas BM legacy).
- **Jueves de cada semana** → verificar que el scheduler abrió el evento semanal.`,
    'Sección 7 excepciones'
  );

  // ── Cambio 8: Sección 8 — HEAD en comandos de verificación ───
  doc = replaceOnce(
    doc,
    `**Esperado:**
- **Log:** \`84771b2\` en top.`,
    `**Esperado:**
- **Log:** \`237d86c\` en top.`,
    'Sección 8 HEAD'
  );

  // ── Cambio 9: Footer ──────────────────────────────────────────
  doc = replaceOnce(
    doc,
    `**PARAGUAY FFAA [PRY] · SESSION HANDOFF · 2026-10-08 · Commit 84771b2**`,
    `**PARAGUAY FFAA [PRY] · SESSION HANDOFF · 2026-10-10 · Commit 237d86c**`,
    'Footer'
  );

  writeFile(FILE, doc);
  console.log('   ✅ SESSION_HANDOFF.md actualizado (9 cambios)');
  console.log('');

  // ── Verificación ───────────────────────────────────────────────
  console.log('🔍 Verificando cambios...');
  const check = readFile(FILE);

  const checks = [
    ['Header: 2026-10-10', check.includes('2026-10-10 (post-F6/F7 + Sprint 4 en curso)')],
    ['Header: próxima sesión F4.0a/b', check.includes('Sprint 4 — Housekeeping (F4.0a + F4.0b)')],
    ['Sección 2: v4.7.0', check.includes('| **Versión en producción** | v4.7.0 |')],
    ['Sección 2: HEAD 237d86c', check.includes('| **Commit HEAD** | `237d86c` |')],
    ['Sección 2: F6/F7 agregados', check.includes('| **F6 (Panel Admin v4.7.0)** | ✅ Completado |')],
    ['Sección 3.6 nueva', check.includes('## 3.6. TRABAJO POST-SPRINT 3 (F6 + F7 + Normativas)')],
    ['Sección 5: W39 completado', check.includes('### ✅ Jueves 24/09/2026 — COMPLETADO')],
    ['Sección 6: F4.0a cerrado', check.includes('| **F4.0a** | Actualizar ADR-005 Proposed → Accepted | XS | ✅ Cerrado (`237d86c`) |')],
    ['Sección 6: BL-027 nuevo', check.includes('| **BL-027** | Eliminar `savePerformance` muerta de `js/api.js`')],
    ['Sección 8: HEAD actualizado', check.includes('- **Log:** `237d86c` en top.')],
    ['Footer: 2026-10-10', check.includes('2026-10-10 · Commit 237d86c')],
  ];

  let allOk = true;
  for (const [label, ok] of checks) {
    console.log(`   ${ok ? '✅' : '❌'} ${label}`);
    if (!ok) allOk = false;
  }

  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  if (allOk) {
    console.log('  ✅ F4.0b COMPLETADO — 11 cambios aplicados y verificados');
    console.log('');
    console.log('  Próximos pasos:');
    console.log('    1. git diff docs/SESSION_HANDOFF.md');
    console.log('    2. git add docs/SESSION_HANDOFF.md scripts/f4.0b-update-session-handoff.cjs');
    console.log('    3. git commit -m "docs(f4.0b): actualizar SESSION_HANDOFF a v4.7.0"');
    console.log('    4. git push origin main  (sube F4.0a + F4.0b)');
    console.log('');
    console.log('  Rollback:');
    console.log('    ren docs\\SESSION_HANDOFF.md.bak-f4.0b docs\\SESSION_HANDOFF.md');
  } else {
    console.log('  ⚠️ F4.0b CON ERRORES — revisar arriba');
  }
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');

  if (!allOk) process.exit(1);
}

try {
  main();
} catch (err) {
  console.error('');
  console.error('❌ ERROR:', err.message);
  console.error('');
  console.error('   Backup disponible en:');
  console.error('     docs\\SESSION_HANDOFF.md.bak-f4.0b');
  console.error('');
  process.exit(1);
}