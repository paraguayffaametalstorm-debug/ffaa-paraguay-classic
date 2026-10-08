/**
 * ============================================================================
 * PARAGUAY-FFAA | METALSTORM
 * SCRIPT DE DOCUMENTACION — HALL-071 + HALL-072
 * ============================================================================
 * Idempotente. Ejecutar: node scripts/hall-071-072-docs.cjs
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const log = (msg) => console.log('  ' + msg);

function readFile(relPath) {
  const fullPath = path.join(ROOT, relPath);
  if (!fs.existsSync(fullPath)) return null;
  return fs.readFileSync(fullPath, 'utf8');
}

function writeFile(relPath, content) {
  const fullPath = path.join(ROOT, relPath);
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(fullPath, content, 'utf8');
  log('OK Escrito: ' + relPath);
}

function fileExists(relPath) {
  return fs.existsSync(path.join(ROOT, relPath));
}

// ============================================================
// 1. HALL-071
// ============================================================

const HALL_071 = [
  '# HALL-071 — Columna closed_reason documentada pero inexistente',
  '',
  '> **Detectado:** 2026-10-08',
  '> **Severidad:** BAJA',
  '> **Estado:** DETECTADO - Pendiente fix',
  '> **Categoria:** Documentacion / Schema drift',
  '',
  '---',
  '',
  '## 1. Sintoma',
  '',
  'Al intentar ejecutar el SQL para abrir el evento W41 durante la verificacion',
  'post-migracion a Render, el comando fallo:',
  '',
  '    ERROR: 42703: column "closed_reason" of relation "events_master" does not exist',
  '',
  '## 2. Diagnostico',
  '',
  'La columna closed_reason esta documentada en:',
  '',
  '- ARCHITECTURE.md (seccion 5, tabla events_master)',
  '- API_REFERENCE.md (seccion 3.5.2, respuesta de eventos)',
  '- ADR-007 (seccion de consecuencias)',
  '- CHANGELOG.md (mencionada varias veces)',
  '',
  'Pero NO existe en la BD real.',
  '',
  '### Columnas reales de events_master',
  '',
  'Verificado con:',
  '',
  '    SELECT column_name, data_type',
  '    FROM information_schema.columns',
  '    WHERE table_name = \'events_master\';',
  '',
  '15 columnas: id, type, name, start_date, end_date, status, metadata,',
  'legacy_event_id, created_at, created_by, closed_at, closed_by, updated_at,',
  'submission_opens_at, submission_closes_at.',
  '',
  'Ausente: closed_reason.',
  '',
  '## 3. Causa Raiz',
  '',
  'La columna se documento en el ADR-007 y se propago a la documentacion,',
  'pero nunca se agrego al script de migracion sql/030_events_master.sql.',
  '',
  'Es un caso clasico de schema drift: documentacion por delante del codigo.',
  '',
  '## 4. Impacto',
  '',
  '- BAJO. La columna no se usa en ningun controlador actual.',
  '- La logica de cierre funciona sin ella (closed_at + closed_by).',
  '- No hay queries dependientes.',
  '- La documentacion esta desactualizada.',
  '',
  '## 5. Opciones de Fix',
  '',
  '### Opcion A (recomendada) — Agregar la columna',
  '',
  '    ALTER TABLE events_master',
  '    ADD COLUMN IF NOT EXISTS closed_reason TEXT;',
  '',
  'Valores posibles: NORMAL, BM_REPLACED, MANUAL, SCHEDULER.',
  '',
  'Ventaja: alinea la BD con la documentacion.',
  'Riesgo: bajo (columna nullable).',
  '',
  '### Opcion B — Eliminar la referencia de la documentacion',
  '',
  'Actualizar ARCHITECTURE.md, API_REFERENCE.md, ADR-007 y CHANGELOG.md',
  'para reflejar que la columna no existe.',
  '',
  'Ventaja: cero cambios en BD.',
  'Riesgo: se pierde la funcionalidad de trazabilidad de cierre.',
  '',
  '## 6. Decision',
  '',
  'Pendiente de decision del OWNER.',
  '',
  'Mi recomendacion: Opcion A (agregar la columna).',
  '',
  '## 7. Referencias',
  '',
  '- sql/030_events_master.sql — Script de migracion original.',
  '- ADR-007-rediseno-eventos-v2.md — Menciona la columna.',
  '- ARCHITECTURE.md — Tabla events_master documentada.',
  '- Fecha de deteccion: 2026-10-08.',
  '',
  '---',
  '',
  'PARAGUAY FFAA [PRY] · HALL-071 · 2026-10-08',
  ''
].join('\n');

// ============================================================
// 2. HALL-072
// ============================================================

const HALL_072 = [
  '# HALL-072 — Scheduler no corre en Render (cold start)',
  '',
  '> **Detectado:** 2026-10-08',
  '> **Severidad:** ALTA',
  '> **Estado:** RESUELTO',
  '> **Categoria:** Infraestructura / Scheduler',
  '',
  '---',
  '',
  '## 1. Sintoma',
  '',
  'Despues de la migracion de Fly.io a Render.com (ADR-009), el scheduler',
  'de eventos SQ dejo de funcionar.',
  '',
  'Evidencia:',
  '',
  '- El ultimo evento auto-creado por el scheduler fue el 2026-10-05.',
  '- El 2026-10-08 (3 dias despues), el evento W41 seguia en SCHEDULED',
  '  cuando deberia estar OPEN.',
  '- El countdown del dashboard mostraba el evento incorrecto.',
  '- La query de verificacion mostro eventos_open_actuales = 0 (ninguno abierto).',
  '',
  '## 2. Diagnostico',
  '',
  'El scheduler corre cada 1 hora mediante node-cron en eventScheduler.js.',
  'Se inicializa en server.js al arrancar la app.',
  '',
  'El problema: Render Free duerme la app despues de 15 minutos de inactividad.',
  '',
  '- Cuando la app se duerme, el proceso de Node.js se pausa.',
  '- Los cron jobs node-cron NO se ejecutan mientras la app esta dormida.',
  '- Los ticks perdidos NO se recuperan al despertar.',
  '- Resultado: los eventos nunca se abren/cierran automaticamente.',
  '',
  'En Fly.io esto no pasaba porque min_machines_running = 1 mantenia la app',
  'siempre encendida (pero costaba ~US$5.62/mes).',
  '',
  '## 3. Causa Raiz',
  '',
  'Render Free no permite cron jobs internos persistentes.',
  '',
  '- min_machines_running = 0 en el plan Free.',
  '- La app se duerme a los 15 min de inactividad.',
  '- No hay forma de mantener el proceso vivo sin pings externos.',
  '',
  '## 4. Solucion Aplicada (3 capas)',
  '',
  '### Capa 1 — Endpoint manual de emergencia',
  '',
  'Endpoint: POST /api/admin/scheduler/run (solo OWNER)',
  '',
  'Fuerza un tick del scheduler a demanda. Util si la app estuvo dormida',
  'mucho tiempo y hay que recuperar el estado.',
  '',
  'Codigo: src/routes/admin.routes.js (lineas ~200-230)',
  '',
  '### Capa 2 — Cron externo (cron-job.org)',
  '',
  'Servicio: https://cron-job.org (gratis, sin tarjeta)',
  '',
  'Configuracion:',
  '- URL: https://paraguay-ffaa-metalstorm.onrender.com/api/health',
  '- Intervalo: cada 10 minutos',
  '- Metodo: GET',
  '- Timeout: 60 segundos',
  '',
  'Efecto: mantiene la app despierta -> el scheduler interno corre cada 1h.',
  '',
  '### Capa 3 — Health check extendido',
  '',
  'Endpoint: GET /api/health (readiness)',
  '',
  'Ahora incluye info del scheduler. Campos: status, started, last_tick_at,',
  'last_tick_ago_seconds, last_tick_status.',
  '',
  'Regla STALE: si el ultimo tick fue hace mas de 2h -> status "STALE".',
  '',
  'Codigo: src/controllers/health.controller.js',
  '',
  '## 5. Archivos Modificados',
  '',
  '| Archivo | Cambio |',
  '|---|---|',
  '| src/routes/admin.routes.js | Endpoints /scheduler/run y /scheduler/status |',
  '| src/controllers/health.controller.js | buildSchedulerCheck() + integracion |',
  '',
  '## 6. Verificacion',
  '',
  'Test 1 — Health muestra scheduler: OK',
  '',
  '    curl -s https://paraguay-ffaa-metalstorm.onrender.com/api/health',
  '',
  'Resultado (2026-10-08 01:59 UTC): scheduler.status = "OK",',
  'last_tick_ago_seconds = 26, last_tick_status = "OK".',
  '',
  'Test 2 — Tick manual: OK',
  '',
  '    curl -X POST .../api/admin/scheduler/run -H "Authorization: Bearer TOKEN"',
  '',
  'Resultado: success = true, last_tick_status = "OK".',
  '',
  'Test 3 — Eventos en Supabase:',
  '',
  '- W41 -> OPEN',
  '- W42 -> SCHEDULED',
  '',
  '## 7. Pendiente de Verificacion (24h)',
  '',
  '- Confirmar que cron-job.org mantiene la app despierta 24h.',
  '- Confirmar que el scheduler corre cada 1h sin intervencion.',
  '- Confirmar que W43 se crea automaticamente el lunes 12/10.',
  '- Confirmar que W42 se abre automaticamente el jueves 15/10.',
  '',
  '## 8. Lecciones Aprendidas',
  '',
  '1. Render Free duerme apps. Todo cron interno debe complementarse con',
  '   un ping externo para no perder ticks.',
  '2. Los cron jobs en serverless/Free tier NO son confiables. Para tareas',
  '   criticas, usar servicios externos (cron-job.org, UptimeRobot).',
  '3. Los health checks extendidos son oro. Sin el scheduler.status en',
  '   /api/health, el bug paso desapercibido 3 dias.',
  '4. Un endpoint manual de emergencia es barato y salva vidas.',
  '5. Migrar de plataforma requiere re-verificar TODOS los cron jobs.',
  '',
  '## 9. Referencias',
  '',
  '- ADR-009-migracion-render.md — Migracion de Fly.io a Render.',
  '- eventScheduler.js — Scheduler v2.0.',
  '- admin.routes.js — Endpoint manual.',
  '- health.controller.js — Health check extendido.',
  '',
  '---',
  '',
  'PARAGUAY FFAA [PRY] · HALL-072 · 2026-10-08',
  ''
].join('\n');

// ============================================================
// 3. CHANGELOG entry
// ============================================================

const CHANGELOG_ENTRY = [
  '## [4.5.12] - 2026-10-08',
  '',
  '### HALL-072 — Fix del scheduler en Render (cold start)',
  '',
  '#### Objetivo Cumplido',
  '',
  'Restaurar el funcionamiento del scheduler de eventos SQ despues de la',
  'migracion a Render.com (ADR-009). El scheduler dejo de correr porque',
  'Render Free duerme la app despues de 15 min de inactividad.',
  '',
  '#### Solucion Aplicada (3 capas)',
  '',
  '**Capa 1 — Endpoint manual de emergencia:**',
  '- POST /api/admin/scheduler/run (solo OWNER).',
  '- Fuerza un tick del scheduler a demanda.',
  '',
  '**Capa 2 — Cron externo (cron-job.org):**',
  '- Ping a /api/health cada 10 minutos.',
  '- Mantiene la app despierta -> el scheduler corre cada 1h.',
  '- Costo: $0.',
  '',
  '**Capa 3 — Health check extendido:**',
  '- /api/health ahora reporta el estado del scheduler.',
  '- Campos: status, started, last_tick_at, last_tick_ago_seconds, last_tick_status.',
  '- Regla STALE: si el ultimo tick fue hace >2h -> status "STALE".',
  '',
  '#### Archivos Modificados',
  '',
  '| Archivo | Cambio |',
  '|---|---|',
  '| src/routes/admin.routes.js | Endpoints /scheduler/run y /scheduler/status |',
  '| src/controllers/health.controller.js | buildSchedulerCheck() + integracion |',
  '',
  '#### Fix Adicional — HALL-071',
  '',
  'Detectado: la columna closed_reason esta documentada en ARCHITECTURE.md,',
  'API_REFERENCE.md, ADR-007 y CHANGELOG.md, pero no existe en events_master.',
  '',
  '- Severidad: BAJA.',
  '- Accion: Documentado para fix posterior.',
  '',
  '#### Verificacion',
  '',
  '- OK POST /api/admin/scheduler/run -> 200 con last_tick_at actualizado.',
  '- OK GET /api/health -> scheduler.status "OK", last_tick_ago_seconds 26.',
  '- OK Evento W41 en OPEN, W42 en SCHEDULED.',
  '- OK Cron-job.org configurado cada 10 min.',
  '- Pendiente verificar 24h de funcionamiento continuo.',
  '',
  '#### Referencias',
  '',
  '- docs/incidentes/HALL-071-closed-reason.md',
  '- docs/incidentes/HALL-072-scheduler-render.md',
  '- docs/adr/ADR-009-migracion-render.md',
  '',
  '---',
  '',
  ''
].join('\n');

// ============================================================
// MAIN
// ============================================================

console.log('\nIniciando script de documentacion HALL-071 + HALL-072\n');

// 1. HALL-071
console.log('1. Creando HALL-071...');
if (fileExists('docs/incidentes/HALL-071-closed-reason.md')) {
  log('Ya existe, saltando.');
} else {
  writeFile('docs/incidentes/HALL-071-closed-reason.md', HALL_071);
}

// 2. HALL-072
console.log('\n2. Creando HALL-072...');
if (fileExists('docs/incidentes/HALL-072-scheduler-render.md')) {
  log('Ya existe, saltando.');
} else {
  writeFile('docs/incidentes/HALL-072-scheduler-render.md', HALL_072);
}

// 3. CHANGELOG.md
console.log('\n3. Actualizando CHANGELOG.md...');
const changelog = readFile('CHANGELOG.md');
if (!changelog) {
  log('ERROR: No se encontro CHANGELOG.md');
} else if (changelog.includes('## [4.5.12]')) {
  log('Ya tiene la entrada v4.5.12, saltando.');
} else {
  const marker = '## [4.5.11]';
  if (changelog.includes(marker)) {
    const updated = changelog.replace(marker, CHANGELOG_ENTRY + marker);
    writeFile('CHANGELOG.md', updated);
  } else {
    log('No se encontro el marcador ## [4.5.11]');
  }
}

// 4. CURRENT_STATE.md
console.log('\n4. Actualizando CURRENT_STATE.md...');
const currentState = readFile('CURRENT_STATE.md');
if (!currentState) {
  log('ERROR: No se encontro CURRENT_STATE.md');
} else if (currentState.includes('HALL-072')) {
  log('Ya tiene info de HALL-072, saltando.');
} else {
  const insertion = [
    '## Cambios Recientes (2026-10-08)',
    '',
    '### HALL-071 + HALL-072 Completados',
    '',
    '| Hallazgo | Descripcion | Estado |',
    '|---|---|---|',
    '| **HALL-071** | Columna closed_reason documentada pero inexistente en BD | Detectado |',
    '| **HALL-072** | Scheduler no corria en Render (cold start) | Resuelto |',
    '',
    '**Fix HALL-072 (3 capas):**',
    '',
    '1. Endpoint manual POST /api/admin/scheduler/run (solo OWNER).',
    '2. Cron externo (cron-job.org) -> ping a /api/health cada 10 min.',
    '3. Health check extendido con scheduler.status (OK | STALE | ERROR).',
    '',
    '**Estado del sistema (2026-10-08 01:59 UTC):**',
    '',
    '- scheduler.status: "OK"',
    '- last_tick_ago_seconds: 26',
    '- W41 en OPEN, W42 en SCHEDULED',
    '',
    '**Referencias:**',
    '',
    '- docs/incidentes/HALL-071-closed-reason.md',
    '- docs/incidentes/HALL-072-scheduler-render.md',
    '',
    '---',
    '',
    ''
  ].join('\n');

  const lines = currentState.split('\n');
  const idx = lines.findIndex((l, i) => i > 0 && l.startsWith('# '));
  if (idx > 0) {
    lines.splice(idx, 0, insertion);
    writeFile('CURRENT_STATE.md', lines.join('\n'));
  } else {
    log('No se encontro el punto de insercion');
  }
}

// 5. BACKLOG.md
console.log('\n5. Actualizando BACKLOG.md...');
const backlog = readFile('BACKLOG.md');
if (!backlog) {
  log('ERROR: No se encontro BACKLOG.md');
} else if (backlog.includes('HALL-072')) {
  log('Ya menciona HALL-072, saltando.');
} else {
  const completadosEntry = [
    '| **HALL-071** | bug | Columna closed_reason documentada pero inexistente en BD | 2026-10-08 | (detectado) |',
    '| **HALL-072** | bug | Scheduler no corria en Render (cold start) -> fix con cron externo | 2026-10-08 | 2c7e8df |',
    ''
  ].join('\n');

  const marker = '## ✅ Completados';
  const idx = backlog.indexOf(marker);
  if (idx !== -1) {
    const rest = backlog.slice(idx);
    const nextSectionIdx = rest.search(/\n## [^✅]/);
    const insertAt = nextSectionIdx === -1 ? backlog.length : idx + nextSectionIdx;
    const updated = backlog.slice(0, insertAt) + '\n' + completadosEntry + backlog.slice(insertAt);
    writeFile('BACKLOG.md', updated);
  } else {
    log('No se encontro la seccion de completados');
  }
}

// 6. SESSION_HANDOFF.md
console.log('\n6. Actualizando SESSION_HANDOFF.md...');
const handoff = readFile('SESSION_HANDOFF.md');
if (!handoff) {
  log('No se encontro SESSION_HANDOFF.md, saltando.');
} else if (handoff.includes('HALL-072')) {
  log('Ya menciona HALL-072, saltando.');
} else {
  const insertion = [
    '## 3.5. TRABAJO COMPLETADO — Sesion 2026-10-08 (Post-Migracion Render)',
    '',
    '### HALL-072 — Fix del scheduler en Render',
    '',
    '**Contexto:** Despues de la migracion a Render.com, el scheduler dejo de',
    'correr porque Render Free duerme la app a los 15 min de inactividad.',
    '',
    '**Fix aplicado (3 capas):**',
    '',
    '| Capa | Componente | Archivo |',
    '|---|---|---|',
    '| 1 | Endpoint manual | src/routes/admin.routes.js |',
    '| 2 | Cron externo (cron-job.org) | config externa |',
    '| 3 | Health check extendido | src/controllers/health.controller.js |',
    '',
    '**Verificacion:** /api/health muestra scheduler.status: "OK".',
    '',
    '### HALL-071 — Schema drift (detectado)',
    '',
    '- Columna closed_reason documentada pero inexistente en events_master.',
    '- Pendiente decision: agregar columna o corregir docs.',
    '',
    '**Pendiente de verificacion 24h:**',
    '- Cron-job.org mantiene la app despierta.',
    '- W42 se abre solo el jueves 15/10.',
    '- W43 se crea solo el lunes 12/10.',
    '',
    '---',
    '',
    ''
  ].join('\n');

  const marker = '## 4. ';
  const idx = handoff.indexOf(marker);
  if (idx !== -1) {
    const updated = handoff.slice(0, idx) + insertion + '\n' + handoff.slice(idx);
    writeFile('SESSION_HANDOFF.md', updated);
  } else {
    log('No se encontro el marcador para insertar');
  }
}

// 7. ADR-009
console.log('\n7. Actualizando ADR-009...');
const adr009 = readFile('docs/adr/ADR-009-migracion-render.md');
if (!adr009) {
  log('ERROR: No se encontro ADR-009');
} else if (adr009.includes('HALL-072')) {
  log('Ya menciona HALL-072, saltando.');
} else {
  const insertion = [
    '## Lecciones Aprendidas (actualizado 2026-10-08)',
    '',
    '### HALL-072 — El cold start rompio el scheduler',
    '',
    'La migracion a Render.com Free tuvo un efecto colateral no anticipado:',
    'el scheduler de eventos dejo de correr.',
    '',
    '**Causa:** Render Free duerme la app despues de 15 min de inactividad.',
    'Los cron jobs node-cron internos no se ejecutan mientras la app esta dormida.',
    '',
    '**Solucion (3 capas):**',
    '',
    '1. Endpoint manual POST /api/admin/scheduler/run (solo OWNER).',
    '2. Cron externo (cron-job.org) -> ping a /api/health cada 10 min.',
    '3. Health check extendido con info del scheduler.',
    '',
    '**Regla para futuras migraciones:**',
    '',
    '> Antes de migrar de plataforma, verificar TODOS los cron jobs internos.',
    '> En plataformas serverless/Free tier, los cron jobs internos NO son confiables.',
    '',
    '**Referencia:** docs/incidentes/HALL-072-scheduler-render.md.',
    '',
    '---',
    '',
    ''
  ].join('\n');

  const marker = '---\n\n> ADR redactado según formato';
  const idx = adr009.indexOf(marker);
  if (idx !== -1) {
    const updated = adr009.slice(0, idx) + insertion + adr009.slice(idx);
    writeFile('docs/adr/ADR-009-migracion-render.md', updated);
  } else {
    log('No se encontro el marcador final, agregando al final');
    writeFile('docs/adr/ADR-009-migracion-render.md', adr009 + '\n' + insertion);
  }
}

console.log('\nScript completado.\n');
console.log('Siguiente:');
console.log('  git status');
console.log('  git diff --stat');
console.log('  git add .');
console.log('  git commit -m "docs(hall-071-072): documentar fix del scheduler + schema drift"');
console.log('  git push origin main\n');