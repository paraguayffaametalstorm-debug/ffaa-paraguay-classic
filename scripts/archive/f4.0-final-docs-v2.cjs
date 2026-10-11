/**
 * ============================================================================
 * PARAGUAY-FFAA | METALSTORM
 * F4.0-final-docs-v2 — Continuación de F4.0-final-docs
 * ============================================================================
 * El script v1 falló en el cambio 3 (resumen consolidado).
 * Los cambios 1 (CHANGELOG) y 2a (tabla BM DROP) SÍ se aplicaron.
 *
 * Este script v2:
 *   - Continúa desde el cambio 3 (resumen consolidado).
 *   - Ejecuta los cambios restantes de DEPLOYMENT_STATE.md.
 *   - Ejecuta los 4 cambios de SESSION_HANDOFF.md.
 *
 * IDEMPOTENTE: salta cambios ya aplicados.
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const FILES = {
  deployment: path.join(ROOT, 'DEPLOYMENT_STATE.md'),
  handoff: path.join(ROOT, 'docs', 'SESSION_HANDOFF.md'),
};

function readFile(p) {
  if (!fs.existsSync(p)) throw new Error(`No existe: ${p}`);
  return fs.readFileSync(p, 'utf8');
}

function writeFile(p, content) {
  fs.writeFileSync(p, content, 'utf8');
}

function backup(p) {
  const bak = p + '.bak-f4.0-final-v2';
  if (!fs.existsSync(bak)) {
    fs.copyFileSync(p, bak);
    console.log(`   💾 Backup creado: ${path.basename(bak)}`);
  }
}

function replaceOnce(content, search, replacement, label) {
  const count = content.split(search).length - 1;
  if (count === 0) {
    throw new Error(`[${label}] No se encontró:\n${search.substring(0, 250)}...`);
  }
  if (count > 1) {
    throw new Error(`[${label}] Aparece ${count} veces (debe ser único):\n${search.substring(0, 250)}...`);
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

// ── Deployment State ─────────────────────────────────────────

function updateDeploymentState() {
  console.log('');
  console.log('📄 [1/2] Modificando DEPLOYMENT_STATE.md (continuación)');
  backup(FILES.deployment);
  let content = readFile(FILES.deployment);

  // Cambio 3: Actualizar el resumen consolidado
  // Patrón corregido: incluye los asteriscos dobles al inicio de events_master
  if (!skipIf(content, '**Actualizado (Sprint 4)**', 'deployment resumen')) {
    const search = `| **\`events_master\`** | **Eventos (Nuevo)** | **36** | ✅ **Documentada (F2)** |
| **\`event_participations\`** | **Eventos (Nuevo)** | **639** | ✅ **Documentada (F2)** |`;

    const replacement = `| **\`events_master\`** | **Eventos (Nuevo)** | **44** | ✅ **Actualizado (Sprint 4)** |
| **\`event_participations\`** | **Eventos (Nuevo)** | **722** | ✅ **Actualizado (Sprint 4)** |`;

    content = replaceOnce(content, search, replacement, 'deployment resumen');
    console.log('   ✅ Resumen consolidado actualizado (44 + 722 filas)');
  }

  // Cambio 4: Agregar la tabla `presence` al resumen consolidado
  if (!skipIf(content, '**`presence`** | **Presencia (Nuevo v4.5.9)**', 'deployment presence')) {
    // Insertar después de la fila de `performances`
    const search = `| \`performances\` | Core (Legacy) | **639** | ✅ Preservada |`;
    const replacement = `| \`performances\` | Core (Legacy) | **639** | ✅ Preservada |
| **\`presence\`** | **Presencia (Nuevo v4.5.9)** | **—** | ✅ **Documentada (ADR-005)** |`;

    content = replaceOnce(content, search, replacement, 'deployment presence');
    console.log('   ✅ Fila `presence` agregada al resumen');
  }

  writeFile(FILES.deployment, content);
}

// ── Session Handoff ──────────────────────────────────────────

function updateSessionHandoff() {
  console.log('');
  console.log('📄 [2/2] Modificando docs/SESSION_HANDOFF.md');
  backup(FILES.handoff);
  let content = readFile(FILES.handoff);

  // Cambio 5: Marcar F4.0b, F4.0c, F4.5 como cerrados
  if (!skipIf(content, '✅ Cerrado (`984c54e`)', 'handoff tabla sprint 4')) {
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

  // Cambio 6: Actualizar HEAD (237d86c → 984c54e)
  if (!skipIf(content, '| **Commit HEAD** | `984c54e` |', 'handoff HEAD')) {
    content = replaceOnce(
      content,
      '| **Commit HEAD** | `237d86c` |',
      '| **Commit HEAD** | `984c54e` |',
      'handoff HEAD'
    );
    console.log('   ✅ HEAD actualizado a 984c54e');
  }

  // Cambio 7: Sección 5 - F4.5 como completado
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

  // Cambio 8: Footer
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
  console.log('  F4.0-final-docs-v2 — Continuación');
  console.log('═══════════════════════════════════════════════════════════════');

  updateDeploymentState();
  updateSessionHandoff();

  console.log('');
  console.log('🔍 Verificando cambios finales...');

  const ds = readFile(FILES.deployment);
  const sh = readFile(FILES.handoff);

  const checks = [
    ['DEPLOYMENT: BM DROP ejecutado', ds.includes('✅ DROP ejecutado el 2026-10-10')],
    ['DEPLOYMENT: events_master 44 filas', ds.includes('**44** | ✅ **Actualizado (Sprint 4)**')],
    ['DEPLOYMENT: event_participations 722 filas', ds.includes('**722** | ✅ **Actualizado (Sprint 4)**')],
    ['DEPLOYMENT: presence agregada', ds.includes('**`presence`** | **Presencia (Nuevo v4.5.9)**')],
    ['HANDOFF: F4.0b cerrado', sh.includes('| **F4.0b** | Actualizar SESSION_HANDOFF.md | XS | ✅ Cerrado (`984c54e`) |')],
    ['HANDOFF: F4.0c cerrado', sh.includes('| **F4.0c** | Limpiar .bak-* del disco | XS | ✅ Cerrado |')],
    ['HANDOFF: F4.5 cerrado', sh.includes('| **F4.5** | Ejecutar DROP de tablas BM legacy | XS | ✅ Cerrado |')],
    ['HANDOFF: HEAD 984c54e', sh.includes('| **Commit HEAD** | `984c54e` |')],
    ['HANDOFF: sección 5 completada', sh.includes('### ✅ Post-26/09/2026 — COMPLETADO')],
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
    console.log('  ✅ F4.0-final-docs-v2 COMPLETADO');
    console.log('');
    console.log('  Estado final:');
    console.log('    - CHANGELOG.md: [4.7.1] insertado (por v1)');
    console.log('    - DEPLOYMENT_STATE.md: BM DROP + resumen (por v1 + v2)');
    console.log('    - docs/SESSION_HANDOFF.md: Sprint 4 cerrado (por v2)');
    console.log('');
    console.log('  Próximos pasos:');
    console.log('    1. git diff CHANGELOG.md DEPLOYMENT_STATE.md docs/SESSION_HANDOFF.md');
    console.log('    2. git add CHANGELOG.md DEPLOYMENT_STATE.md docs/SESSION_HANDOFF.md scripts/');
    console.log('    3. git commit -m "docs(sprint-4): cerrar F4.0 (a/b/c) + F4.5 (DROP BM legacy)"');
    console.log('    4. git push origin main');
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
  console.error('   Backups disponibles:');
  console.error('     DEPLOYMENT_STATE.md.bak-f4.0-final      (v1, antes de tabla BM)');
  console.error('     DEPLOYMENT_STATE.md.bak-f4.0-final-v2   (v2, después de tabla BM)');
  console.error('     docs\\SESSION_HANDOFF.md.bak-f4.0-final   (v1, antes de nada)');
  console.error('     docs\\SESSION_HANDOFF.md.bak-f4.0-final-v2 (v2, antes de v2)');
  console.error('');
  process.exit(1);
}