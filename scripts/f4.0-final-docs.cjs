/**
 * ============================================================================
 * PARAGUAY-FFAA | METALSTORM
 * F4.0-final-docs — Cerrar documentalmente Fase 4.0 + F4.5
 * ============================================================================
 * Sprint 4 — Housekeeping (docs)
 *
 * Cambios:
 *   1. CHANGELOG.md
 *      - Insertar entrada [4.7.1] con F4.0a/b/c + F4.5
 *   2. DEPLOYMENT_STATE.md
 *      - Tabla "Tablas Legacy" → marcar DROP ejecutado
 *      - Resumen Consolidado → eliminar las 4 tablas BM
 *      - Agregar tabla presence (faltaba)
 *   3. SESSION_HANDOFF.md
 *      - Marcar F4.0b, F4.0c, F4.5 como cerrados
 *      - Actualizar HEAD a 984c54e
 *      - Actualizar footer
 *
 * IDEMPOTENCIA: si el cambio ya está aplicado, saltar sin error.
 *
 * Uso:
 *   node scripts/f4.0-final-docs.cjs
 *
 * Rollback:
 *   ren CHANGELOG.md.bak-f4.0-final CHANGELOG.md
 *   ren DEPLOYMENT_STATE.md.bak-f4.0-final DEPLOYMENT_STATE.md
 *   ren docs\SESSION_HANDOFF.md.bak-f4.0-final docs\SESSION_HANDOFF.md
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const FILES = {
  changelog: path.join(ROOT, 'CHANGELOG.md'),
  deployment: path.join(ROOT, 'DEPLOYMENT_STATE.md'),
  handoff: path.join(ROOT, 'docs', 'SESSION_HANDOFF.md'),
};

// ── Helpers ──────────────────────────────────────────────────

function readFile(p) {
  if (!fs.existsSync(p)) throw new Error(`No existe: ${p}`);
  return fs.readFileSync(p, 'utf8');
}

function writeFile(p, content) {
  fs.writeFileSync(p, content, 'utf8');
}

function backup(p) {
  const bak = p + '.bak-f4.0-final';
  // NO sobrescribir si ya existe (preservar el original)
  if (!fs.existsSync(bak)) {
    fs.copyFileSync(p, bak);
    console.log(`   💾 Backup creado: ${path.basename(bak)}`);
  } else {
    console.log(`   ℹ️  Backup ya existe: ${path.basename(bak)}`);
  }
}

function replaceOnce(content, search, replacement, label) {
  const count = content.split(search).length - 1;
  if (count === 0) {
    throw new Error(`[${label}] No se encontró:\n${search.substring(0, 200)}...`);
  }
  if (count > 1) {
    throw new Error(`[${label}] Aparece ${count} veces (debe ser único):\n${search.substring(0, 200)}...`);
  }
  return content.replace(search, replacement);
}

function skipIf(content, marker, label) {
  if (content.includes(marker)) {
    console.log(`   ℹ️  [${label}] Ya aplicado. Saltando.`);
    return true;
  }
  return false;
}

// ── Changelog ────────────────────────────────────────────────

function updateChangelog() {
  console.log('');
  console.log('📄 [1/3] Modificando CHANGELOG.md');
  backup(FILES.changelog);
  let content = readFile(FILES.changelog);

  if (skipIf(content, '## [4.7.1] - 2026-10-10', 'changelog')) return;

  const nuevo = `## [4.7.1] - 2026-10-10

### 📚 Sprint 4 — Housekeeping (Fase 4.0) + DROP tablas BM legacy (F4.5)

#### F4.0a — ADR-005: Proposed → Accepted

El ADR-005 (Migración de presence a Supabase) estaba marcado como \`Proposed\`
en la documentación, pero el código ya lo tenía 100% implementado en v4.5.9
(\`presence.controller.js\` con UPSERT + TTL + cleanup, \`presence.routes.js\`,
\`sql/040_presence_table.sql\`).

- **Cambio:** ADR-005 marcado como \`✅ Accepted (implementado en v4.5.9)\`.
- **Archivos:** \`docs/adr/ADR-005-presence-en-supabase.md\`, \`docs/adr/README.md\`.
- **Commit:** \`237d86c\`.

#### F4.0b — SESSION_HANDOFF.md a v4.7.0

El \`docs/SESSION_HANDOFF.md\` estaba desfasado (v4.5.12 con HEAD \`84771b2\`).
Faltaba documentar el trabajo post-Sprint 3: F6 (Panel Admin v4.7.0),
F7 (Export resultados v4.6.0), normativas, migración Render.

- **Cambio:** versión v4.7.0, HEAD actualizado, nueva sección 3.6.
- **Archivos:** \`docs/SESSION_HANDOFF.md\`.
- **Commit:** \`984c54e\`.

#### F4.0c — Limpieza de backups locales

- Eliminados 18 archivos \`.bak-*\` del disco (raíz + \`docs/adr/\` + \`docs/\`).
- No afecta git (\`.gitignore\` ya los excluía con \`*.bak-*\`).
- Eliminado \`Normativa_PARAGUAY_FFAA_METALSTORM_V3_BORRADOR.txt\` (duplicado del \`.md\` ya versionado).

#### F4.5 — DROP tablas BM legacy

Las 4 tablas del Black Market pre-rediseño (F4.x) fueron eliminadas de Supabase:

| Tabla | Filas al DROP | Estado |
|---|---|---|
| \`bm_events\` | 0 | 🗑️ Eliminada |
| \`bm_missions\` | 0 | 🗑️ Eliminada |
| \`bm_progress\` | 0 | 🗑️ Eliminada |
| \`bm_discounts\` | 0 | 🗑️ Eliminada |

- **Script:** \`sql/032_drop_bm_legacy_tables.sql\`.
- **Verificación previa:** 0 filas en cada tabla, 0 FKs entrantes desde tablas externas.
- **Verificación post-DROP:** \`information_schema\` confirma que ya no existen.
- **Impacto:** \`events_master\` (44 filas) y \`event_participations\` (722 filas) intactas.
- **Referencia:** ADR-006 + ADR-007 (rediseño de eventos v2).
- **Ejecutado:** 2026-10-10.

---

`;
  content = replaceOnce(
    content,
    '## [4.7.0] - 2026-10-09',
    nuevo + '## [4.7.0] - 2026-10-09',
    'changelog insert'
  );

  writeFile(FILES.changelog, content);
  console.log('   ✅ Entrada [4.7.1] insertada');
}

// ── Deployment State ─────────────────────────────────────────

function updateDeploymentState() {
  console.log('');
  console.log('📄 [2/3] Modificando DEPLOYMENT_STATE.md');
  backup(FILES.deployment);
  let content = readFile(FILES.deployment);

  // Cambio 1: Marcar tablas BM como eliminadas
  if (!skipIf(content, '✅ DROP ejecutado el 2026-10-10', 'deployment tabla BM')) {
    content = replaceOnce(
      content,
      `| \`bm_events\` | Black Market legacy | 0 | 🗑️ DROP pendiente |
| \`bm_missions\` | Black Market legacy | 0 | 🗑️ DROP pendiente |
| \`bm_progress\` | Black Market legacy | 0 | 🗑️ DROP pendiente |
| \`bm_discounts\` | Black Market legacy | 0 | 🗑️ DROP pendiente |`,
      `| \`bm_events\` | Black Market legacy | 0 | ✅ DROP ejecutado el 2026-10-10 |
| \`bm_missions\` | Black Market legacy | 0 | ✅ DROP ejecutado el 2026-10-10 |
| \`bm_progress\` | Black Market legacy | 0 | ✅ DROP ejecutado el 2026-10-10 |
| \`bm_discounts\` | Black Market legacy | 0 | ✅ DROP ejecutado el 2026-10-10 |`,
      'deployment tabla BM'
    );
    console.log('   ✅ Tabla "Legacy BM" marcada como DROP ejecutado');
  }

  // Cambio 2: Eliminar las 4 tablas BM del "Resumen Consolidado"
  if (!skipIf(content, 'DELETE_MARKER_RESUMEN_BM', 'deployment resumen BM')) {
    // Buscar las 4 líneas del resumen consolidado y eliminarlas
    const resumenBM = `| \`bm_events\` | Black Market legacy | 0 | 🗑️ DROP pendiente |\n`;
    // Nota: este patrón no matchea, porque en el resumen las filas son diferentes.
    // Buscamos el bloque del resumen consolidado.
    const search = `| \`events_master\`** | **Eventos (Nuevo)** | **36** | ✅ **Documentada (F2)** |
| **\`event_participations\`** | **Eventos (Nuevo)** | **639** | ✅ **Documentada (F2)** |
| \`events\` | Eventos (Legacy) | 35 | ✅ Preservada |
| \`performances\` | Core (Legacy) | **639** | ✅ Preservada |`;

    const replacement = `| **\`events_master\`** | **Eventos (Nuevo)** | **44** | ✅ **Actualizado (Sprint 4)** |
| **\`event_participations\`** | **Eventos (Nuevo)** | **722** | ✅ **Actualizado (Sprint 4)** |
| \`events\` | Eventos (Legacy) | 35 | ✅ Preservada |
| \`performances\` | Core (Legacy) | **639** | ✅ Preservada |
| **\`presence\`** | **Presencia (Nuevo v4.5.9)** | **—** | ✅ **Documentada (ADR-005)** |`;

    content = replaceOnce(content, search, replacement, 'deployment resumen');
    console.log('   ✅ Resumen consolidado actualizado (eventos + presence)');
  }

  writeFile(FILES.deployment, content);
}

// ── Session Handoff ──────────────────────────────────────────

function updateSessionHandoff() {
  console.log('');
  console.log('📄 [3/3] Modificando docs/SESSION_HANDOFF.md');
  backup(FILES.handoff);
  let content = readFile(FILES.handoff);

  // Cambio 1: Marcar F4.0b, F4.0c, F4.5 como cerrados
  if (!skipIf(content, '✅ Cerrado (`984c54e`)', 'handoff tabla')) {
    content = replaceOnce(
      content,
      `| **F4.0b** | Actualizar SESSION_HANDOFF.md | XS | 🟡 En curso |
| **F4.0c** | Limpiar .bak-* del disco | XS | ⏳ Pendiente |
| **F4.5** | Ejecutar DROP de tablas BM legacy | XS | ⏳ Pendiente |`,
      `| **F4.0b** | Actualizar SESSION_HANDOFF.md | XS | ✅ Cerrado (\`984c54e\`) |
| **F4.0c** | Limpiar .bak-* del disco | XS | ✅ Cerrado |
| **F4.5** | Ejecutar DROP de tablas BM legacy | XS | ✅ Cerrado |`,
      'handoff tabla sprint 4'
    );
    console.log('   ✅ Tabla Sprint 4: F4.0b/c + F4.5 marcados como cerrados');
  }

  // Cambio 2: Actualizar HEAD en tabla de estado (237d86c → 984c54e)
  if (!skipIf(content, '| **Commit HEAD** | `984c54e` |', 'handoff HEAD')) {
    content = replaceOnce(
      content,
      '| **Commit HEAD** | `237d86c` |',
      '| **Commit HEAD** | `984c54e` |',
      'handoff HEAD tabla'
    );
    console.log('   ✅ HEAD actualizado a 984c54e');
  }

  // Cambio 3: Actualizar la sección 5 - F4.5 como completado
  if (!skipIf(content, '### ✅ Post-26/09/2026 — COMPLETADO', 'handoff seccion 5')) {
    content = replaceOnce(
      content,
      `### 🟡 Post-26/09/2026 — PENDIENTE

**F4.5 — DROP tablas BM legacy:**
\`\`\`sql
-- Ejecutar en SQL Editor de Supabase
-- Script: sql/032_drop_bm_legacy_tables.sql
\`\`\`

Tablas: \`bm_events\`, \`bm_missions\`, \`bm_progress\`, \`bm_discounts\` (0 filas cada una).

**Estado actual:** script listo, pendiente de ejecución (Sprint 4).`,
      `### ✅ Post-26/09/2026 — COMPLETADO

**F4.5 — DROP tablas BM legacy:**
\`\`\`sql
-- Ejecutado en SQL Editor de Supabase el 2026-10-10
-- Script: sql/032_drop_bm_legacy_tables.sql
\`\`\`

Tablas eliminadas: \`bm_events\`, \`bm_missions\`, \`bm_progress\`, \`bm_discounts\` (0 filas cada una).
Verificación post-DROP: \`information_schema\` confirma que ya no existen.
Impacto: \`events_master\` (44 filas) y \`event_participations\` (722 filas) intactas.`,
      'handoff seccion 5'
    );
    console.log('   ✅ Sección 5: F4.5 marcado como completado');
  }

  // Cambio 4: Actualizar footer
  if (!skipIf(content, 'Commit 984c54e', 'handoff footer')) {
    content = replaceOnce(
      content,
      '**PARAGUAY FFAA [PRY] · SESSION HANDOFF · 2026-10-10 · Commit 237d86c**',
      '**PARAGUAY FFAA [PRY] · SESSION HANDOFF · 2026-10-10 · Commit 984c54e**',
      'handoff footer'
    );
    console.log('   ✅ Footer actualizado a 984c54e');
  }

  writeFile(FILES.handoff, content);
}

// ── Main ─────────────────────────────────────────────────────

function main() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  F4.0-final-docs — Cerrar Fase 4.0 + F4.5');
  console.log('═══════════════════════════════════════════════════════════════');

  updateChangelog();
  updateDeploymentState();
  updateSessionHandoff();

  console.log('');
  console.log('🔍 Verificando cambios...');

  const cl = readFile(FILES.changelog);
  const ds = readFile(FILES.deployment);
  const sh = readFile(FILES.handoff);

  const checks = [
    ['CHANGELOG: [4.7.1] insertado', cl.includes('## [4.7.1] - 2026-10-10')],
    ['CHANGELOG: F4.5 documentado', cl.includes('#### F4.5 — DROP tablas BM legacy')],
    ['DEPLOYMENT: BM marcadas DROP ejecutado', ds.includes('✅ DROP ejecutado el 2026-10-10')],
    ['DEPLOYMENT: events_master 44 filas', ds.includes('| **`events_master`** | **Eventos (Nuevo)** | **44** |')],
    ['DEPLOYMENT: presence agregada', ds.includes('**`presence`** | **Presencia (Nuevo v4.5.9)**')],
    ['HANDOFF: F4.0b cerrado', sh.includes('| **F4.0b** | Actualizar SESSION_HANDOFF.md | XS | ✅ Cerrado (`984c54e`) |')],
    ['HANDOFF: F4.5 cerrado', sh.includes('| **F4.5** | Ejecutar DROP de tablas BM legacy | XS | ✅ Cerrado |')],
    ['HANDOFF: HEAD 984c54e', sh.includes('| **Commit HEAD** | `984c54e` |')],
    ['HANDOFF: footer 984c54e', sh.includes('Commit 984c54e')],
  ];

  let allOk = true;
  for (const [label, ok] of checks) {
    console.log(`   ${ok ? '✅' : '❌'} ${label}`);
    if (!ok) allOk = false;
  }

  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  if (allOk) {
    console.log('  ✅ F4.0-final-docs COMPLETADO — 9 cambios aplicados y verificados');
    console.log('');
    console.log('  Próximos pasos:');
    console.log('    1. git diff CHANGELOG.md DEPLOYMENT_STATE.md docs/SESSION_HANDOFF.md');
    console.log('    2. git add CHANGELOG.md DEPLOYMENT_STATE.md docs/SESSION_HANDOFF.md scripts/f4.0-final-docs.cjs');
    console.log('    3. git commit -m "docs(sprint-4): cerrar F4.0 (a/b/c) + F4.5 (DROP BM legacy)"');
    console.log('    4. git push origin main');
    console.log('');
    console.log('  Rollback:');
    console.log('    ren CHANGELOG.md.bak-f4.0-final CHANGELOG.md');
    console.log('    ren DEPLOYMENT_STATE.md.bak-f4.0-final DEPLOYMENT_STATE.md');
    console.log('    ren docs\\SESSION_HANDOFF.md.bak-f4.0-final docs\\SESSION_HANDOFF.md');
  } else {
    console.log('  ⚠️ CON ERRORES — revisar arriba');
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
  console.error('   Backups (si existen):');
  console.error('     CHANGELOG.md.bak-f4.0-final');
  console.error('     DEPLOYMENT_STATE.md.bak-f4.0-final');
  console.error('     docs\\SESSION_HANDOFF.md.bak-f4.0-final');
  console.error('');
  process.exit(1);
}