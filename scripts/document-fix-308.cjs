#!/usr/bin/env node
/**
 * FIX-308 — Documentación automática (versión simple)
 * Uso:
 *   node scripts/document-fix-308.cjs --dry-run
 *   node scripts/document-fix-308.cjs
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DRY_RUN = process.argv.includes('--dry-run');

function readFileSafe(filepath) {
  try {
    return fs.readFileSync(filepath, 'utf8');
  } catch {
    return null;
  }
}

function writeFileSafe(filepath, content) {
  if (DRY_RUN) return;
  fs.writeFileSync(filepath, content, 'utf8');
}

// ============================================================================
// CHANGELOG
// ============================================================================

const CHANGELOG_ENTRY = [
  '## [4.5.10] - 2026-09-23',
  '',
  '### 🎯 FIX-308 — Logging estructurado con Pino',
  '',
  '#### Objetivo Cumplido',
  '',
  'Reemplazar los ~215 `console.log`/`console.error`/`console.warn` del proyecto',
  'por un **logger estructurado con Pino**:',
  '- **Development:** formato legible con colores (`pino-pretty`).',
  '- **Production:** JSON puro (parseable por `fly logs`, agregadores, Datadog).',
  '- **Redacción automática** de secretos: `password`, `token`, `authorization`, `google_id`.',
  '- **Contexto enriquecido:** `service`, `env`, `pid` en cada línea.',
  '- **Helper `loggerForRequest(req)`** para inyectar `request_id` automáticamente (integración FIX-307).',
  '',
  '#### Componentes Nuevos',
  '',
  '| Archivo | Propósito |',
  '|---|---|',
  '| `src/config/logger.js` | Módulo centralizado Pino con config dev/prod |',
  '| `LOG_LEVEL` en `src/config/env.js` | Nivel configurable (default: info) |',
  '',
  '#### Componentes Modificados (19 archivos, 215 ocurrencias)',
  '',
  '| Archivo | Ocurrencias |',
  '|---|---:|',
  '| `server.js` | 14 |',
  '| `src/db/supabase.js` | 11 |',
  '| `src/utils/eventScheduler.js` | 33 |',
  '| `src/middlewares/correlationId.js` | 2 |',
  '| `src/middlewares/errorHandler.js` | 2 |',
  '| `src/middlewares/deprecation.js` | 1 |',
  '| `src/config/passport.js` | 5 |',
  '| `src/controllers/auth.controller.js` | 23 |',
  '| `src/controllers/admin.controller.js` | 3 |',
  '| `src/controllers/dashboard.controller.js` | 1 |',
  '| `src/controllers/events.controller.js` | 3 |',
  '| `src/controllers/events-v2.controller.js` | 17 |',
  '| `src/controllers/events-v2-bm.controller.js` | 15 |',
  '| `src/controllers/owner.controller.js` | 13 |',
  '| `src/controllers/performances.controller.js` | 6 |',
  '| `src/controllers/plane-models.controller.js` | 17 |',
  '| `src/controllers/planes.controller.js` | 26 |',
  '| `src/controllers/presence.controller.js` | 10 |',
  '| `src/controllers/profile.controller.js` | 13 |',
  '| **Total** | **215** |',
  '',
  '#### Incidente Durante la Migración (HALL-070)',
  '',
  '**Bug del script:** insertó el `import { logger }` **dentro** de un import multilínea en 2 archivos.',
  '',
  '**Causa:** el regex `/^import\\s.+?;?\\s*$/gm` no reconoce imports multilínea.',
  '',
  '**Fix aplicado:** reubicación manual del import en `events-v2.controller.js` y `events-v2-bm.controller.js`.',
  '',
  '**Lección:** los scripts que editan código fuente deben ser agnósticos al estilo de import.',
  '',
  '#### Verificación',
  '',
  '- ✅ `node --check` OK en 20 archivos.',
  '- ✅ 187/187 tests passing (Vitest 5.0.1).',
  '- ✅ Logs de tests en formato JSON estructurado.',
  '- ✅ Smoke test /health y /api/health OK.',
  '- ✅ Deploy a Fly.io exitoso.',
  '',
  '#### Variables de Entorno Nuevas',
  '',
  '| Variable | Default | Propósito |',
  '|---|---|---|',
  '| `LOG_LEVEL` | `info` | Nivel de logging (trace, debug, info, warn, error, fatal) |',
  '',
  'Override en producción: `fly secrets set LOG_LEVEL=debug`',
  '',
  '#### Referencias',
  '',
  '- `src/config/logger.js` — Módulo centralizado Pino.',
  '- `scripts/migrate-to-pino.cjs` — Script de migración ad-hoc.',
  '- `HALL-070` — Bug del script con imports multilínea.',
  '',
  '---',
  '',
  ''
].join('\n');

function updateChangelog() {
  console.log('\n📌 Actualizando CHANGELOG.md...');
  const filepath = path.join(ROOT, 'CHANGELOG.md');
  const content = readFileSafe(filepath);

  if (!content) {
    console.log('  ❌ No existe: ' + filepath);
    return { error: 'not found' };
  }

  if (content.indexOf('[4.5.10] - 2026-09-23') !== -1) {
    console.log('  ⏭️  Entrada [4.5.10] ya existe. Saltando.');
    return { skipped: true };
  }

  // Buscar el primer header "## ["
  const marker = '## [';
  const insertPos = content.indexOf(marker);

  if (insertPos === -1) {
    console.log('  ❌ No se encontró header "## [" en CHANGELOG.md');
    return { error: 'no header' };
  }

  const newContent = content.slice(0, insertPos) + CHANGELOG_ENTRY + content.slice(insertPos);
  writeFileSafe(filepath, newContent);
  console.log('  ✅ Entrada [4.5.10] agregada');
  return { updated: true };
}

// ============================================================================
// PLAN_TRABAJO
// ============================================================================

function updatePlanTrabajo() {
  console.log('\n📌 Actualizando PLAN_TRABAJO.md...');
  const filepath = path.join(ROOT, 'PLAN_TRABAJO.md');
  const content = readFileSafe(filepath);

  if (!content) {
    console.log('  ❌ No existe: ' + filepath);
    return { error: 'not found' };
  }

  // Buscar la línea de FIX-308 y reemplazar el estado "⏳ Pendiente" o similar
  // por "✅ **CERRADO**".
  // Regex simple: la fila contiene "FIX-308" y "Logging estructurado con Pino".
  const lines = content.split('\n');
  let updated = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.indexOf('FIX-308') !== -1 && line.indexOf('Logging estructurado') !== -1) {
      // Reemplazar la celda de estado (la penúltima columna antes del esfuerzo)
      // La fila típica: | **FIX-308** | Observabilidad | Logging estructurado con Pino | ⏳ Pendiente | M |
      const newLine = line.replace(/\|\s*[^|]*\|\s*([A-Z]+)\s*\|$/, '| ✅ **CERRADO** | $1 |');
      if (newLine !== line) {
        lines[i] = newLine;
        updated = true;
      }
    }
  }

  if (!updated) {
    console.log('  ⏭️  No se encontró la fila FIX-308 en PLAN_TRABAJO.md (o ya estaba cerrada).');
    return { skipped: true };
  }

  const newContent = lines.join('\n');
  writeFileSafe(filepath, newContent);
  console.log('  ✅ FIX-308 marcado como CERRADO');
  return { updated: true };
}

// ============================================================================
// BACKLOG — HALL-070
// ============================================================================

const HALL_070_LINE = '| **HALL-070** | 🐛 | Script `migrate-to-pino.cjs` inserta imports dentro de imports multilínea | ✅ Resuelto (fix manual) | XS | Bug del regex en la migración masiva a Pino. Afectó `events-v2.controller.js` y `events-v2-bm.controller.js` (SyntaxError). Lección: los scripts que editan código deben manejar imports multilínea. Detectado y resuelto en FIX-308. |';

function updateBacklog() {
  console.log('\n📌 Actualizando BACKLOG.md...');
  const filepath = path.join(ROOT, 'BACKLOG.md');
  const content = readFileSafe(filepath);

  if (!content) {
    console.log('  ❌ No existe: ' + filepath);
    return { error: 'not found' };
  }

  if (content.indexOf('HALL-070') !== -1) {
    console.log('  ⏭️  HALL-070 ya existe. Saltando.');
    return { skipped: true };
  }

  // Buscar "## ✅ Completados" e insertar la fila después de la tabla (que sigue
  // al header "## ✅ Completados" en 2-3 líneas).
  const marker = '## ✅ Completados';
  const markerPos = content.indexOf(marker);

  if (markerPos === -1) {
    console.log('  ⚠️  No se encontró "## ✅ Completados". Agregando al final.');
    const newContent = content + '\n\n### Hallazgos resueltos recientes\n\n' + HALL_070_LINE + '\n';
    writeFileSafe(filepath, newContent);
    return { updated: true };
  }

  // Buscar la primera fila de tabla "| ... |" después del header
  const afterMarker = content.slice(markerPos);
  const firstRowMatch = afterMarker.match(/\n\|[^\n]+\|\n/);

  if (!firstRowMatch) {
    console.log('  ⚠️  No se encontró tabla después de "## ✅ Completados". Agregando al final.');
    const newContent = content + '\n\n' + HALL_070_LINE + '\n';
    writeFileSafe(filepath, newContent);
    return { updated: true };
  }

  // Insertar después de la línea del header de la tabla (la que tiene "|---|")
  const headerRowEnd = afterMarker.indexOf('\n', afterMarker.indexOf('|---|') || afterMarker.indexOf('|---'));
  const absoluteInsertPos = markerPos + (headerRowEnd === -1 ? afterMarker.length : headerRowEnd + 1);

  const newContent = content.slice(0, absoluteInsertPos) + HALL_070_LINE + '\n' + content.slice(absoluteInsertPos);
  writeFileSafe(filepath, newContent);
  console.log('  ✅ HALL-070 agregado a Completados');
  return { updated: true };
}

// ============================================================================
// MAIN
// ============================================================================

function main() {
  console.log('='.repeat(72));
  console.log('📝 FIX-308 — Documentación automática');
  console.log('='.repeat(72));
  console.log('Modo: ' + (DRY_RUN ? '🔍 DRY-RUN (no modifica)' : '✏️  ESCRITURA'));
  console.log('ROOT: ' + ROOT);

  const results = {
    changelog: updateChangelog(),
    plan: updatePlanTrabajo(),
    backlog: updateBacklog()
  };

  console.log('\n' + '='.repeat(72));
  console.log('📊 REPORTE');
  console.log('='.repeat(72));
  console.log('CHANGELOG.md:  ' + (results.changelog.updated ? '✅ actualizado' : results.changelog.skipped ? '⏭️  saltado' : '❌ ' + results.changelog.error));
  console.log('PLAN_TRABAJO:  ' + (results.plan.updated ? '✅ actualizado' : results.plan.skipped ? '⏭️  saltado' : '❌ ' + results.plan.error));
  console.log('BACKLOG.md:    ' + (results.backlog.updated ? '✅ actualizado' : results.backlog.skipped ? '⏭️  saltado' : '❌ ' + results.backlog.error));
  console.log('='.repeat(72));

  if (DRY_RUN) {
    console.log('\n🔍 DRY-RUN completado. Nada se modificó.');
    console.log('   Para aplicar: node scripts/document-fix-308.cjs');
  } else {
    console.log('\n✅ Documentación actualizada.');
    console.log('');
    console.log('🎯 Próximos pasos:');
    console.log('   1. Revisar: git diff CHANGELOG.md PLAN_TRABAJO.md BACKLOG.md');
    console.log('   2. Commit: git add . && git commit -m "docs: cerrar FIX-308 y registrar HALL-070"');
    console.log('   3. Push: git push origin main');
  }
  console.log('='.repeat(72));
}

main();