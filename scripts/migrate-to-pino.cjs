#!/usr/bin/env node
/**
 * ============================================================================
 * FIX-308 — Migración masiva a Pino
 * ============================================================================
 * Este script:
 *   1. Crea src/config/logger.js (módulo Pino centralizado) si no existe.
 *   2. Agrega LOG_LEVEL a src/config/env.js si no existe.
 *   3. Migra console.log/error/warn → logger.info/error/warn en 20 archivos.
 *   4. Reporta resumen.
 *
 * Uso:
 *   node scripts/migrate-to-pino.cjs             # ejecuta y modifica
 *   node scripts/migrate-to-pino.cjs --dry-run   # no modifica, solo reporta
 *   node scripts/migrate-to-pino.cjs --force     # sobreescribe logger.js si existe
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DRY_RUN = process.argv.includes('--dry-run');
const FORCE = process.argv.includes('--force');

// ============================================================================
// CONFIGURACIÓN
// ============================================================================

const LOGGER_MODULE_PATH = path.join(ROOT, 'src', 'config', 'logger.js');
const ENV_MODULE_PATH = path.join(ROOT, 'src', 'config', 'env.js');

// Archivos a migrar. `importFrom` es la ruta relativa al logger.js
// que corresponde a la profundidad del archivo.
const FILES_TO_MIGRATE = [
  { path: 'server.js',                                  importFrom: './src/config/logger.js' },
  { path: 'src/db/supabase.js',                         importFrom: '../config/logger.js' },
  { path: 'src/utils/eventScheduler.js',                importFrom: '../config/logger.js' },
  { path: 'src/middlewares/correlationId.js',           importFrom: '../config/logger.js' },
  { path: 'src/middlewares/errorHandler.js',            importFrom: '../config/logger.js' },
  { path: 'src/middlewares/deprecation.js',             importFrom: '../config/logger.js' },
  { path: 'src/config/passport.js',                     importFrom: './logger.js' },
  { path: 'src/controllers/auth.controller.js',         importFrom: '../config/logger.js' },
  { path: 'src/controllers/admin.controller.js',        importFrom: '../config/logger.js' },
  { path: 'src/controllers/dashboard.controller.js',    importFrom: '../config/logger.js' },
  { path: 'src/controllers/events.controller.js',       importFrom: '../config/logger.js' },
  { path: 'src/controllers/events-v2.controller.js',    importFrom: '../config/logger.js' },
  { path: 'src/controllers/events-v2-bm.controller.js', importFrom: '../config/logger.js' },
  { path: 'src/controllers/owner.controller.js',        importFrom: '../config/logger.js' },
  { path: 'src/controllers/performances.controller.js', importFrom: '../config/logger.js' },
  { path: 'src/controllers/plane-models.controller.js', importFrom: '../config/logger.js' },
  { path: 'src/controllers/planes.controller.js',       importFrom: '../config/logger.js' },
  { path: 'src/controllers/presence.controller.js',     importFrom: '../config/logger.js' },
  { path: 'src/controllers/profile.controller.js',      importFrom: '../config/logger.js' },
];

// ============================================================================
// CONTENIDO DE logger.js
// ============================================================================

const LOGGER_MODULE_CONTENT = `import pino from 'pino';
import { ENV } from './env.js';

// En development: formato legible con colores.
// En production: JSON puro (parseable por fly logs, agregadores, etc.).
const transport = ENV.NODE_ENV === 'development'
  ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:standard' } }
  : undefined;

export const logger = pino({
  level: ENV.LOG_LEVEL || 'info',
  transport,
  base: {
    service: 'paraguay-ffaa',
    env: ENV.NODE_ENV,
    pid: process.pid
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'password',
      'newPassword',
      'currentPassword',
      'token',
      '*.password_hash',
      '*.google_id',
      '*.access_token',
      '*.refresh_token'
    ],
    censor: '[REDACTED]'
  }
});

// Helper para child logger con request_id (FIX-307)
export function loggerForRequest(req) {
  return req?.id
    ? logger.child({ request_id: req.id })
    : logger;
}

export default logger;
`;

// ============================================================================
// SNIPPET PARA env.js
// ============================================================================

const LOG_LEVEL_SNIPPET = `  // FIX-308: Nivel de logging (trace, debug, info, warn, error, fatal).
  // Default: info. Override en prod: fly secrets set LOG_LEVEL=debug
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
`;

// ============================================================================
// HELPERS
// ============================================================================

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

function countConsoleCalls(content) {
  const matches = content.match(/\bconsole\.(log|error|warn|info|debug)\b/g);
  return matches ? matches.length : 0;
}

function hasLoggerImport(content) {
  return /from\s+['"][^'"]*config\/logger\.js['"]/.test(content) ||
         /from\s+['"]\.\/logger\.js['"]/.test(content);
}

function insertLoggerImport(content, importFrom) {
  // Buscar el ÚLTIMO import del bloque inicial
  const importRegex = /^import\s.+?;?\s*$/gm;
  let lastImportEnd = 0;
  let match;

  while ((match = importRegex.exec(content)) !== null) {
    lastImportEnd = match.index + match[0].length;
  }

  if (lastImportEnd === 0) {
    // No hay imports: insertar tras el header de comentario si existe
    const headerEnd = content.indexOf('*/');
    const insertPos = headerEnd !== -1 ? content.indexOf('\n', headerEnd) + 1 : 0;
    return content.slice(0, insertPos) +
           `import { logger } from '${importFrom}';\n\n` +
           content.slice(insertPos);
  }

  const importLine = `\nimport { logger } from '${importFrom}';`;
  return content.slice(0, lastImportEnd) + importLine + content.slice(lastImportEnd);
}

function migrateConsoleCalls(content) {
  let migrated = content;
  migrated = migrated.replace(/\bconsole\.log\(/g, 'logger.info(');
  migrated = migrated.replace(/\bconsole\.error\(/g, 'logger.error(');
  migrated = migrated.replace(/\bconsole\.warn\(/g, 'logger.warn(');
  return migrated;
}

// ============================================================================
// PASO 1: crear logger.js
// ============================================================================

function step1CreateLogger() {
  console.log('\n📌 PASO 1 — Módulo logger.js');

  if (fs.existsSync(LOGGER_MODULE_PATH) && !FORCE) {
    console.log(`  ⏭️  Ya existe: ${path.relative(ROOT, LOGGER_MODULE_PATH)}`);
    console.log(`      (Usar --force para sobreescribir)`);
    return { skipped: true };
  }

  if (DRY_RUN) {
    console.log(`  [DRY-RUN] crear ${path.relative(ROOT, LOGGER_MODULE_PATH)}`);
    return { dryRun: true };
  }

  writeFileSafe(LOGGER_MODULE_PATH, LOGGER_MODULE_CONTENT);
  console.log(`  ✅ Creado: ${path.relative(ROOT, LOGGER_MODULE_PATH)}`);
  return { created: true };
}

// ============================================================================
// PASO 2: agregar LOG_LEVEL a env.js
// ============================================================================

function step2AddLogLevel() {
  console.log('\n📌 PASO 2 — LOG_LEVEL en env.js');

  const content = readFileSafe(ENV_MODULE_PATH);
  if (!content) {
    console.log(`  ❌ No existe: ${path.relative(ROOT, ENV_MODULE_PATH)}`);
    return { error: 'not found' };
  }

  if (/LOG_LEVEL\s*:/.test(content)) {
    console.log(`  ⏭️  LOG_LEVEL ya definido. Saltando.`);
    return { skipped: true };
  }

  const envBlockRegex = /(export\s+const\s+ENV\s*=\s*\{)/;
  const match = content.match(envBlockRegex);

  if (!match) {
    console.log(`  ❌ No se encontró 'export const ENV = {'`);
    return { error: 'ENV block not found' };
  }

  const insertPos = match.index + match[0].length;
  const newContent =
    content.slice(0, insertPos) +
    '\n' +
    LOG_LEVEL_SNIPPET +
    content.slice(insertPos);

  if (DRY_RUN) {
    console.log(`  [DRY-RUN] insertar LOG_LEVEL en env.js`);
    return { dryRun: true };
  }

  writeFileSafe(ENV_MODULE_PATH, newContent);
  console.log(`  ✅ LOG_LEVEL agregado a env.js`);
  return { updated: true };
}

// ============================================================================
// PASO 3: migrar archivos
// ============================================================================

function step3MigrateFiles() {
  console.log('\n📌 PASO 3 — Migrar console.* → logger.*');

  const results = { migrated: [], skipped: [], errors: [], totalMigrated: 0 };

  for (const file of FILES_TO_MIGRATE) {
    const fullPath = path.join(ROOT, file.path);
    const content = readFileSafe(fullPath);

    if (content === null) {
      console.log(`  ❌ No existe: ${file.path}`);
      results.errors.push({ path: file.path, reason: 'not found' });
      continue;
    }

    const consoleCount = countConsoleCalls(content);
    if (consoleCount === 0) {
      console.log(`  ⏭️  ${file.path} — sin console.*`);
      results.skipped.push({ path: file.path, reason: 'no console calls' });
      continue;
    }

    if (hasLoggerImport(content)) {
      console.log(`  ⏭️  ${file.path} — ya tiene import logger`);
      results.skipped.push({ path: file.path, reason: 'already migrated' });
      continue;
    }

    let migrated = migrateConsoleCalls(content);
    migrated = insertLoggerImport(migrated, file.importFrom);

    if (DRY_RUN) {
      console.log(`  [DRY-RUN] ${file.path} — ${consoleCount} ocurrencias`);
      results.migrated.push({ path: file.path, count: consoleCount });
      results.totalMigrated += consoleCount;
      continue;
    }

    writeFileSafe(fullPath, migrated);
    console.log(`  ✅ ${file.path} — ${consoleCount} ocurrencias`);
    results.migrated.push({ path: file.path, count: consoleCount });
    results.totalMigrated += consoleCount;
  }

  return results;
}

// ============================================================================
// PASO 4: reporte
// ============================================================================

function step4Report(report) {
  console.log('\n' + '='.repeat(72));
  console.log('📊 REPORTE FINAL — FIX-308' + (DRY_RUN ? ' (DRY-RUN)' : ''));
  console.log('='.repeat(72));

  console.log('\n📁 logger.js:');
  console.log(`   ${report.logger.created ? '✅ creado' : report.logger.dryRun ? '🔍 se creará' : '⏭️  ya existe'}`);

  console.log('\n⚙️  env.js:');
  console.log(`   ${report.env.updated ? '✅ LOG_LEVEL agregado' : report.env.dryRun ? '🔍 se agregará' : '⏭️  ya existía'}`);

  console.log(`\n📦 Archivos migrados: ${report.files.migrated.length}`);
  for (const f of report.files.migrated) {
    console.log(`   ✅ ${f.path} — ${f.count}`);
  }

  if (report.files.skipped.length > 0) {
    console.log(`\n⏭️  Saltados: ${report.files.skipped.length}`);
    for (const f of report.files.skipped) {
      console.log(`   ⏭️  ${f.path} — ${f.reason}`);
    }
  }

  if (report.files.errors.length > 0) {
    console.log(`\n❌ Errores: ${report.files.errors.length}`);
    for (const f of report.files.errors) {
      console.log(`   ❌ ${f.path} — ${f.reason}`);
    }
  }

  console.log(`\n📈 TOTAL: ${report.files.totalMigrated} ocurrencias en ${report.files.migrated.length} archivos.`);

  console.log('\n' + '='.repeat(72));
  if (DRY_RUN) {
    console.log('🔍 DRY-RUN completado. Nada se modificó.');
    console.log('   Para aplicar: node scripts/migrate-to-pino.cjs');
  } else {
    console.log('✅ Migración completada.');
    console.log('');
    console.log('🎯 Próximos pasos:');
    console.log('   1. node --check server.js');
    console.log('   2. node --check src/config/logger.js');
    console.log('   3. node --check src/config/env.js');
    console.log('   4. npm test');
    console.log('   5. npm start');
    console.log('   6. curl -i http://localhost:3000/api/health');
  }
  console.log('='.repeat(72));
}

// ============================================================================
// MAIN
// ============================================================================

function main() {
  console.log('='.repeat(72));
  console.log('🚀 FIX-308 — Migración masiva a Pino');
  console.log('='.repeat(72));
  console.log(`Modo: ${DRY_RUN ? '🔍 DRY-RUN (no modifica)' : '✏️  ESCRITURA'}`);
  console.log(`ROOT: ${ROOT}`);

  const report = {
    logger: step1CreateLogger(),
    env: step2AddLogLevel(),
    files: step3MigrateFiles(),
  };

  step4Report(report);
}

main();