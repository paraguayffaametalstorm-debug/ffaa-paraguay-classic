/**
 * ============================================================================
 * FASE F — HALL-066 v4.0 (definitiva, sin copy-paste manual)
 * ============================================================================
 * Este script aplica los 3 cambios de documentación de Fase F.
 * Todo el contenido está hardcodeado. Vos solo lo ejecutás.
 *
 * Uso:
 *   node scripts/fase-f-hall-066-v4.cjs
 *
 * Efectos:
 *   - Backup automático en *.bak-fasef-YYYYMMDD-HHmmss
 *   - Modifica: CHANGELOG.md, CURRENT_STATE.md, ARCHITECTURE.md
 *   - Verifica cada cambio aplicado
 *   - Idempotente (safe to re-run)
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);

const FILES = {
  changelog: path.join(ROOT, 'CHANGELOG.md'),
  currentState: path.join(ROOT, 'CURRENT_STATE.md'),
  architecture: path.join(ROOT, 'ARCHITECTURE.md'),
};

const C = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
};

function log(msg, color = C.reset) { console.log(`${color}${msg}${C.reset}`); }
function readFile(p) { return fs.readFileSync(p, 'utf8'); }
function writeFile(p, content) { fs.writeFileSync(p, content, 'utf8'); }
function getEOL(content) { return content.includes('\r\n') ? '\r\n' : '\n'; }

// ============================================================================
log('\n═══════════════════════════════════════════════════════════', C.magenta);
log('  FASE F — HALL-066 v4.0', C.magenta);
log('═══════════════════════════════════════════════════════════\n', C.magenta);

// ============================================================================
// PASO 1: Verificar archivos
// ============================================================================
log('▸ PASO 1: Verificando archivos...', C.cyan);
for (const [key, p] of Object.entries(FILES)) {
  if (!fs.existsSync(p)) {
    log(`  ❌ No existe: ${p}`, C.red);
    process.exit(1);
  }
  log(`  ✅ ${path.basename(p)}`, C.green);
}

// ============================================================================
// PASO 2: Backups
// ============================================================================
log('\n▸ PASO 2: Creando backups...', C.cyan);
const BACKUPS = {};
for (const [key, p] of Object.entries(FILES)) {
  const bk = `${p}.bak-fasef-${TIMESTAMP}`;
  fs.copyFileSync(p, bk);
  BACKUPS[key] = bk;
  log(`  ✅ ${path.basename(bk)}`, C.green);
}

// ============================================================================
// PASO 3: CHANGELOG.md — Insertar [4.3.1] antes de [4.3.1-docs]
// ============================================================================
log('\n▸ PASO 3: CHANGELOG.md...', C.cyan);
{
  const p = FILES.changelog;
  let content = readFile(p);
  const eol = getEOL(content);

  if (content.includes('## 📌 [4.3.1] - 2026-09-21')) {
    log('  ⚠️  Entrada [4.3.1] ya existe. Saltando.', C.yellow);
  } else {
    // Marcador: la línea que empieza con "## 📌 [4.3.1-docs]"
    const marker = '## 📌 [4.3.1-docs]';
    const markerIdx = content.indexOf(marker);

    if (markerIdx < 0) {
      log('  ❌ No se encontró "## 📌 [4.3.1-docs]"', C.red);
      process.exit(1);
    }

    const entryLines = [
      '## 📌 [4.3.1] - 2026-09-21',
      '',
      '### 🚨 Hotfix — HALL-066: Corrección del scheduler + endpoint /active con período de gracia',
      '',
      '#### Objetivo Cumplido',
      '',
      'Corregir tres bugs del scheduler que causaban que eventos futuros fueran',
      'marcados como `OPEN` antes de su fecha de inicio real, afectando el',
      'countdown del dashboard y el ciclo operativo del escuadrón. Además,',
      'añadir un **período de gracia** al endpoint `/api/events-v2/active` para',
      'que los pilotos puedan seguir cargando performance del evento anterior',
      'durante el hueco entre eventos (ADR-008).',
      '',
      '#### Problema Detectado',
      '',
      'El domingo 20/09/2026 a las ~22:00 PY, el dashboard mostraba un countdown',
      'de **~7 días** para el evento `Squadron Event 2026-W39`, cuando el evento',
      '`Squadron Event 2026-W38` debía cerrar el lunes 21/09/2026 a las 08:59 PY',
      '(~12 horas después).',
      '',
      '**Evidencia forense:** El scheduler v1.1 cerró W38 a las `21/09 00:00 UTC`',
      '(11 horas antes de su `end_date`) y creó W39 como `OPEN` a la misma hora',
      '(3 días antes de su `start_date`).',
      '',
      '#### Causa Raíz',
      '',
      'El scheduler v1.1 mezclaba tres responsabilidades en un solo tick:',
      '',
      '1. **Cerrar el evento de la semana ISO anterior** — por cambio de semana,',
      '   no por `end_date`.',
      '2. **Crear el evento de la semana ISO actual** — siempre como `OPEN`,',
      '   sin verificar si era futuro.',
      '3. **Sin lógica para promover `SCHEDULED → OPEN`** cuando llegara la hora.',
      '',
      'Además, `created_at` se seteaba con `start_date` en lugar de `NOW()`.',
      '',
      '#### Solución Aplicada',
      '',
      '**Scheduler v2.0 (`src/utils/eventScheduler.js`):**',
      '',
      '- **Tarea 1 — `openScheduledEvents()`:** Promueve `SCHEDULED → OPEN` cuando `NOW() >= start_date`.',
      '- **Tarea 2 — `closeExpiredEvents()`:** Cierra `OPEN → CLOSED` cuando `NOW() >= end_date`.',
      '- **Tarea 3 — `ensureNextSquadronEvent()`:** Prepara la próxima semana ISO como `SCHEDULED`.',
      '- **Guarda de seguridad:** Nunca crea evento futuro como `OPEN`.',
      '- **Fix de auditoría:** `created_at` ahora usa `NOW()`.',
      '',
      '**Backend (`src/controllers/events-v2.controller.js`):**',
      '',
      '- `getActiveEvent` con período de gracia (`isGracePeriod`).',
      '- `normalizeEvent` incluye `submission_opens_at`, `submission_closes_at`, `seconds_remaining`, `can_submit`.',
      '',
      '#### Verificación',
      '',
      '- ✅ **179/179 tests pasando** (Vitest 5.0.1).',
      '- ✅ **Deploy sin downtime** (`deployment-01M30T4FFKVMVF63CH8H9G75S9`).',
      '- ✅ **Smoke test:** `/health` → `OK`.',
      '- ✅ **Estado BD:** W38 `OPEN` dentro de ventana, W39 `SCHEDULED`.',
      '- ✅ **Dashboard muestra W38**.',
      '',
      '#### Entregable',
      '',
      'Commits `0fd9961` + `cf67dd6` mergeados a `main` y desplegados.',
      '',
      '---',
      '',
      ''
    ];

    const newEntry = entryLines.join(eol);
    content = content.substring(0, markerIdx) + newEntry + content.substring(markerIdx);
    writeFile(p, content);
    log('  ✅ Entrada [4.3.1] insertada antes de [4.3.1-docs]', C.green);
  }
}

// ============================================================================
// PASO 4: CURRENT_STATE.md — Header + secciones
// ============================================================================
log('\n▸ PASO 4: CURRENT_STATE.md...', C.cyan);
{
  const p = FILES.currentState;
  let content = readFile(p);
  const eol = getEOL(content);

  // Header
  if (content.includes('v4.3.1 (HALL-066')) {
    log('  ⚠️  Header ya actualizado. Saltando.', C.yellow);
  } else {
    content = content.replace(
      'v4.3.0 (ADR-008: ventanas de carga desacopladas)',
      'v4.3.1 (HALL-066: scheduler v2.0 + grace period)'
    );
    log('  ✅ Header actualizado a v4.3.1', C.green);
  }

  // Secciones nuevas
  if (content.includes('Scheduler v2.0 — Arquitectura')) {
    log('  ⚠️  Secciones ya existen. Saltando.', C.yellow);
  } else {
    const marker = '### Scheduler timezone-aware (HALL-065)';
    const markerIdx = content.indexOf(marker);

    if (markerIdx < 0) {
      log('  ❌ No se encontró "### Scheduler timezone-aware (HALL-065)"', C.red);
      process.exit(1);
    }

    const eolIdx = content.indexOf(eol, markerIdx);
    const insertAt = eolIdx >= 0 ? eolIdx + eol.length : content.length;

    const sectionLines = [
      '',
      '### Scheduler v2.0 — Arquitectura de 3 tareas independientes (HALL-066 — v4.3.1)',
      '',
      'El scheduler fue reescrito en v4.3.1 para resolver HALL-066. Ahora ejecuta',
      '**3 tareas independientes** en cada tick, cada una idempotente:',
      '',
      '| Tarea | Función | Cuándo actúa |',
      '|---|---|---|',
      '| **1** | `openScheduledEvents()` | Promueve `SCHEDULED → OPEN` si `NOW() >= start_date` |',
      '| **2** | `closeExpiredEvents()` | Cierra `OPEN → CLOSED` si `NOW() >= end_date` |',
      '| **3** | `ensureNextSquadronEvent()` | Prepara la próxima semana ISO como `SCHEDULED` |',
      '',
      '**Guardas de seguridad:**',
      '',
      '- ⚠️ Un evento futuro **NUNCA** se crea como `OPEN`.',
      '- ⚠️ Un evento `OPEN` **NUNCA** se cierra antes de su `end_date`.',
      '- ⚠️ `created_at` siempre usa `NOW()`.',
      '- ⚠️ `closed_at` siempre es `null` al crear.',
      '',
      '**Modo de operación:**',
      '',
      '- Corre cada hora (`0 * * * *`).',
      '- Advisory lock (`acquire_scheduler_lock`) para multi-réplica.',
      '- Idempotente: ejecutar N ticks = ejecutar 1 tick.',
      '',
      '### Período de gracia en el endpoint `/active` (HALL-066 — v4.3.1)',
      '',
      'El endpoint `GET /api/events-v2/active` ahora distingue entre:',
      '',
      '1. **Evento `OPEN` dentro de su ventana temporal** → `isGracePeriod: false`.',
      '2. **Evento `CLOSED` con ventana de carga abierta** → `isGracePeriod: true`.',
      '',
      '**Caso de uso:** Entre el lunes 08:59 PY (cierre de W38) y el jueves 09:00 PY',
      '(apertura de W39), el dashboard sigue mostrando W38 con un badge de',
      '**"📝 PERÍODO DE CARGA"** y permite cargar performance del evento anterior',
      'hasta el `submission_closes_at` (jueves 08:59 PY).',
      '',
      ''
    ];

    content = content.substring(0, insertAt) + sectionLines.join(eol) + content.substring(insertAt);
    log('  ✅ Secciones HALL-066 agregadas', C.green);
  }

  writeFile(p, content);
}

// ============================================================================
// PASO 5: ARCHITECTURE.md — Header + §2.2c
// ============================================================================
log('\n▸ PASO 5: ARCHITECTURE.md...', C.cyan);
{
  const p = FILES.architecture;
  let content = readFile(p);
  const eol = getEOL(content);

  // Header
  if (content.includes('Versión v4.3.1')) {
    log('  ⚠️  Header ya actualizado. Saltando.', C.yellow);
  } else {
    content = content.replace(/Versión v4\.3\.0/g, 'Versión v4.3.1');
    content = content.replace(
      /Versión: v4\.3\.0 · Actualizado: 20 Septiembre 2026/g,
      'Versión: v4.3.1 · Actualizado: 21 Septiembre 2026'
    );
    log('  ✅ Header actualizado a v4.3.1', C.green);
  }

  // §2.2c
  if (content.includes('### 2.2c Scheduler de Eventos (`eventScheduler.js`) — v2.0')) {
    log('  ⚠️  §2.2c ya actualizado. Saltando.', C.yellow);
  } else {
    const oldHeader = '### 2.2c Scheduler de Eventos';
    const nextHeader = '### 2.2d Middleware';
    const startIdx = content.indexOf(oldHeader);
    const endIdx = content.indexOf(nextHeader, startIdx);

    if (startIdx < 0 || endIdx < 0) {
      log('  ❌ No se encontraron límites de §2.2c', C.red);
      process.exit(1);
    }

    const newLines = [
      '### 2.2c Scheduler de Eventos (`eventScheduler.js`) — v2.0 (HALL-066)',
      '',
      'Componente autónomo que garantiza la existencia y correcta transición de',
      'eventos SQUADRON según el calendario oficial.',
      '',
      '**Ubicación:** `src/utils/eventScheduler.js`',
      '',
      '**Arquitectura v2.0 (2026-09-21):**',
      '',
      'El scheduler fue reescrito tras HALL-066. Ejecuta **3 tareas independientes**',
      'en cada tick:',
      '',
      '| Tarea | Función | Cuándo actúa |',
      '|---|---|---|',
      '| **1** | `openScheduledEvents()` | Promueve `SCHEDULED → OPEN` si `NOW() >= start_date` |',
      '| **2** | `closeExpiredEvents()` | Cierra `OPEN → CLOSED` si `NOW() >= end_date` |',
      '| **3** | `ensureNextSquadronEvent()` | Prepara la próxima semana ISO como `SCHEDULED` |',
      '',
      '**Características:**',
      '',
      '- **Cron:** cada 1 hora (`0 * * * *`).',
      '- **Advisory Lock:** multi-réplica safe.',
      '- **Idempotencia:** detecta eventos existentes por `legacy_event_id`.',
      '- **Backfill:** deshabilitado (F2.9).',
      '- **Timezone:** UTC-3 fijo (`PY_OFFSET_HOURS = 3`).',
      '- **Duración:** evento SQ = 4 días; ventana de carga SQ = 7 días (ADR-008).',
      '',
      '**Guardas de seguridad (HALL-066):**',
      '',
      '- ⚠️ Un evento futuro **NUNCA** se crea como `OPEN`.',
      '- ⚠️ Un evento `OPEN` **NUNCA** se cierra antes de su `end_date`.',
      '- ⚠️ `created_at` siempre usa `NOW()`.',
      '- ⚠️ `closed_at` siempre es `null` al crear.',
      '',
      '**Flujo:**',
      '',
      '1. Scheduler tick (cada 1 hora).',
      '2. Adquirir advisory lock.',
      '3. **TAREA 1:** Buscar `SCHEDULED` con `start_date <= NOW()`. Promover a `OPEN`.',
      '4. **TAREA 2:** Buscar `OPEN` con `end_date <= NOW()`. Cerrar.',
      '5. **TAREA 3:** Preparar la próxima semana ISO como `SCHEDULED`.',
      '6. Liberar advisory lock.',
      '',
      '**Integración:** `server.js` llama a `startEventScheduler()` en el arranque.',
      '',
      '**Referencias:**',
      '',
      '- HALL-066: `docs/incidentes/HALL-066.md`.',
      '- ADR-008: `docs/adr/ADR-008-ventanas-carga-desacopladas.md`.',
      '- Tests: `tests/utils/eventScheduler.test.js` (29 tests).',
      '',
      ''
    ];

    content = content.substring(0, startIdx) + newLines.join(eol) + content.substring(endIdx);
    writeFile(p, content);
    log('  ✅ §2.2c reemplazado con v2.0', C.green);
  }
}

// ============================================================================
// VERIFICACIÓN FINAL
// ============================================================================
log('\n═══════════════════════════════════════════════════════════', C.magenta);
log('  VERIFICACIÓN', C.magenta);
log('═══════════════════════════════════════════════════════════\n', C.magenta);

let allOk = true;

if (readFile(FILES.changelog).includes('## 📌 [4.3.1] - 2026-09-21')) {
  log('  ✅ CHANGELOG.md — entrada [4.3.1]', C.green);
} else { log('  ❌ CHANGELOG.md — falta [4.3.1]', C.red); allOk = false; }

const cs = readFile(FILES.currentState);
if (cs.includes('v4.3.1 (HALL-066')) {
  log('  ✅ CURRENT_STATE.md — header v4.3.1', C.green);
} else { log('  ❌ CURRENT_STATE.md — header', C.red); allOk = false; }

if (cs.includes('Scheduler v2.0 — Arquitectura')) {
  log('  ✅ CURRENT_STATE.md — sección Scheduler v2.0', C.green);
} else { log('  ❌ CURRENT_STATE.md — sección', C.red); allOk = false; }

const arch = readFile(FILES.architecture);
if (arch.includes('Versión v4.3.1')) {
  log('  ✅ ARCHITECTURE.md — header v4.3.1', C.green);
} else { log('  ❌ ARCHITECTURE.md — header', C.red); allOk = false; }

if (arch.includes('### 2.2c Scheduler de Eventos (`eventScheduler.js`) — v2.0')) {
  log('  ✅ ARCHITECTURE.md — §2.2c v2.0', C.green);
} else { log('  ❌ ARCHITECTURE.md — §2.2c', C.red); allOk = false; }

log('');
if (allOk) {
  log('═══════════════════════════════════════════════════════════', C.green);
  log('  ✅ FASE F COMPLETADA', C.green);
  log('═══════════════════════════════════════════════════════════\n', C.green);
} else {
  log('═══════════════════════════════════════════════════════════', C.red);
  log('  ⚠️  CON ADVERTENCIAS', C.red);
  log('═══════════════════════════════════════════════════════════\n', C.red);
}

log('Backups creados:', C.yellow);
for (const bk of Object.values(BACKUPS)) {
  log(`  - ${path.basename(bk)}`, C.yellow);
}

log('\nPróximos pasos:', C.yellow);
log('  git diff --stat', C.reset);
log('  git add CHANGELOG.md CURRENT_STATE.md ARCHITECTURE.md', C.reset);
log('  git commit -m "docs(hall-066): changelog + current_state + architecture v4.3.1"', C.reset);
log('  git push origin main', C.reset);
log('');