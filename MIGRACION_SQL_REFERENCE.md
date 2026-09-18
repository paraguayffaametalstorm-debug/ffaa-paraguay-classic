# 🔄 Referencia de Migración SQL — Rediseño de Eventos

> **Documentación técnica del proceso de migración de datos del rediseño de eventos (F2).**
> **Fecha de ejecución:** 2026-09-17
> **Ejecutor:** PJPIROVANI (OWNER)
> **Proyecto Supabase:** oodzpkloxnylzauimvua
> **Estado:** ✅ COMPLETADO Y VERIFICADO

---

## 📋 Resumen Ejecutivo

Migración completa del sistema de eventos legacy a la nueva arquitectura unificada.

### Antes de la migración

| Tabla | Registros |
|---|---:|
| `events` (legacy) | 35 |
| `performances` (legacy) | 639 |
| `events_master` (nueva) | 0 |
| `event_participations` (nueva) | 0 |

### Después de la migración

| Tabla | Registros |
|---|---:|
| `events` (legacy) | 35 (sin tocar) |
| `performances` (legacy) | 639 (sin tocar) |
| `events_master` (nueva) | **35** ✅ |
| `event_participations` (nueva) | **639** ✅ |

**Integridad referencial:** 100%
**Datos preservados:** 100%

---

## 🎯 Objetivo de la Migración

Migrar los datos del sistema legacy (`events` + `performances`) a la nueva arquitectura unificada (`events_master` + `event_participations`), preservando:
- Integridad referencial.
- Trazabilidad histórica (`legacy_event_id`).
- Datos específicos (metadata JSONB, data JSONB).
- Fechas de creación y actualización.

**Filosofía:** Migración aditiva. Las tablas legacy se preservan intactas para rollback.

---

## 📐 Arquitectura de la Migración

### Mapeo de tablas

```
events (legacy)                →  events_master (nueva)
├── id (TEXT)                  →  legacy_event_id (TEXT)
├── type (TEXT)                →  type (TEXT)
├── status (TEXT)              →  status (TEXT)
├── start_date                 →  start_date
├── end_date                   →  end_date
├── target_members             →  metadata.target_members (JSONB)
├── target_tokens              →  metadata.target_tokens (JSONB)
                               →  metadata.min_tokens_required = 175 (constante)
                               →  metadata.legacy_id (duplicado)

performances (legacy)          →  event_participations (nueva)
├── event_id (TEXT)            →  event_id (UUID, vía legacy_event_id)
├── user_id (INTEGER)          →  user_id (UUID, vía users.id)
├── nick (TEXT)                →  nick (TEXT)
├── tokens (INTEGER)           →  computed_points (INTEGER)
├── tokens (INTEGER)           →  data.tokens (JSONB)
├── days_connected             →  data.days_connected (JSONB)
├── flew_in_group              →  data.flew_in_group (JSONB)
├── notes                      →  data.notes (JSONB)
├── role                       →  data.role (JSONB)
├── user_email                 →  data.user_email (JSONB)
├── status (semáforo)          →  status (VALIDATED/PENDING/REJECTED)
├── status (semáforo)          →  data.perf_status (JSONB)
├── created_at                 →  created_at
├── updated_at                 →  updated_at
```

### Mapeo de status (semáforo → status)

| Semáforo legacy | Status nueva | Justificación |
|---|---|---|
| VERDE | VALIDATED | Cumplió la meta |
| NARANJA | VALIDATED | Cumplió la meta (con advertencia) |
| ROJO | PENDING | En evaluación |
| NEGRO | REJECTED | No cumplió |

---

## 🔵 F2.1 — Migrar `events` → `events_master`

### Query ejecutada

```sql
INSERT INTO events_master (
  type, name, start_date, end_date, status, metadata, legacy_event_id, created_at
)
SELECT 
  type,
  'Squadron Event ' || id AS name,
  start_date,
  end_date,
  status,
  jsonb_build_object(
    'target_members', COALESCE(target_members, 0),
    'target_tokens', COALESCE(target_tokens, 0),
    'min_tokens_required', 175,
    'legacy_id', id
  ) AS metadata,
  id AS legacy_event_id,
  start_date AS created_at
FROM events
WHERE NOT EXISTS (
  SELECT 1 FROM events_master em WHERE em.legacy_event_id = events.id
);
```

### Resultado verificado

| Métrica | Valor |
|---|---:|
| Total migrados | **35** |
| SQUADRON | 34 |
| BLACK_MARKET | 1 |
| Duplicados (`legacy_event_id`) | 0 |
| Huérfanos | 0 |
| Sin migrar | 0 |

**Validación cruzada:** 35 = 35, 0 sin migrar, 0 huérfanos. ✅

---

## 🔵 F2.2 — Verificar mapeo `user_id` INTEGER → UUID

### Query ejecutada

```sql
SELECT 
  p.user_id, p.nick, COUNT(*) AS registros_afectados
FROM performances p
LEFT JOIN users u ON u.user_id = p.user_id
WHERE u.user_id IS NULL
GROUP BY p.user_id, p.nick;
```

### Resultado verificado

| Métrica | Valor |
|---|---:|
| User IDs únicos en performances | 59 |
| User IDs sin match en users | 0 |
| User IDs NULL | 0 |
| Confirmación UUIDs | 59 = 59 |

**Todos los user_id tienen match. Migración de F2.3 es segura.** ✅

---

## 🔵 F2.3 — Migrar `performances` → `event_participations`

### Query ejecutada

```sql
INSERT INTO event_participations (
  event_id, user_id, nick, data, computed_points, status, created_at, updated_at
)
SELECT 
  em.id AS event_id,
  u.id AS user_id,
  p.nick,
  jsonb_build_object(
    'tokens', p.tokens,
    'days_connected', p.days_connected,
    'flew_in_group', p.flew_in_group,
    'notes', p.notes,
    'role', p.role,
    'user_email', p.user_email,
    'perf_status', p.status
  ) AS data,
  p.tokens AS computed_points,
  CASE 
    WHEN p.status IN ('VERDE', 'NARANJA') THEN 'VALIDATED'
    WHEN p.status = 'ROJO' THEN 'PENDING'
    ELSE 'REJECTED'
  END AS status,
  p.created_at,
  p.updated_at
FROM performances p
INNER JOIN users u ON u.user_id = p.user_id
INNER JOIN events_master em ON em.legacy_event_id = p.event_id
ON CONFLICT (event_id, user_id) DO NOTHING;
```

### Resultado verificado

| Status | Total | Tokens totales | % |
|---|---:|---:|---:|
| VALIDATED | 482 | 90,275 | 75.4% |
| PENDING | 52 | 5,380 | 8.1% |
| REJECTED | 105 | 3,095 | 16.4% |
| **Total** | **639** | **98,750** | **100%** |

---

## 🔵 F2.4 — Validación cruzada

### 7 criterios de aceptación

| # | Criterio | Resultado | Estado |
|---|---|---|---|
| 1 | Conteo `performances` = `event_participations` | 639 = 639, diferencia 0 | ✅ |
| 2 | Suma de tokens igual | 98,750 = 98,750, diferencia 0 | ✅ |
| 3 | Distribución status suma 639 | 482 + 52 + 105 = 639 | ✅ |
| 4 | Distribución perf_status suma 639 | 368 + 114 + 52 + 105 = 639 | ✅ |
| 5 | Sin duplicados (event_id, user_id) | 0 filas | ✅ |
| 6 | Sin huérfanos en `event_id` | 0 | ✅ |
| 7 | Sin huérfanos en `user_id` | 0 | ✅ |

**Los 7 criterios pasaron.** ✅

---

## 🔒 Rollback

**Si es necesario revertir la migración:**

```sql
-- Opción A: Eliminar todo (rollback total)
TRUNCATE TABLE event_participations CASCADE;
TRUNCATE TABLE events_master CASCADE;

-- Opción B: Eliminar solo lo migrado, preservando estructura
DELETE FROM event_participations;
DELETE FROM events_master;
```

**Post-rollback:** Las tablas legacy (`events`, `performances`) siguen intactas. El sistema legacy sigue operativo.

**Backup completo (F0) en Google Drive:**
`Escuadrón Paraguay FFAA [PRY]/Backups/2026-09-17-PreRedisenoEventos/`

---

## 📊 Estado Post-Migración

| Tabla | Registros | Estado |
|---|---:|---|
| `events` (legacy) | 35 | ✅ Preservada |
| `performances` (legacy) | 639 | ✅ Preservada |
| `events_master` (nueva) | 35 | ✅ Migrada |
| `event_participations` (nueva) | 639 | ✅ Migrada |
| `bm_events` | 0 | ✅ Sin tocar |
| `bm_missions` | 0 | ✅ Sin tocar |
| `bm_progress` | 0 | ✅ Sin tocar |
| `bm_discounts` | 0 | ✅ Sin tocar |
| `users` | 61 | ✅ Sin tocar |

**Sistema 100% operativo. Rediseño reversible.**

---

## 🎯 Hallazgos Documentados

### HALL-056 — `DEPLOYMENT_STATE.md` desactualizado

- Doc dice: `performances`=26, `events`=1.
- Real: `performances`=639, `events`=35.
- Acción: Corregir en F6.

### HALL-057 — `009_plane_upgrades.sql` desactualizado

- Archivo: 9 columnas.
- Real: 7 columnas (alineado con `023_upgrades_2_0.sql`).
- Acción: Corregir o eliminar en F6.

### HALL-058 — Módulo BM duplicado

- Existe `/api/events/*` (5 endpoints, SQ).
- Existe `/api/bm/*` (15 endpoints, BM).
- Acción: Unificar en `/api/events/*` en F3.

### HALL-061 — 12 eventos históricos sin performances

Eventos sin datos de participaciones (semanas inactivas o BM sin uso):
- `2026-04 · SEM 16 - BM` (BM histórico)
- `2026-04 · SEM 17 - SQ`
- `2026-06 · SEM 24, 25, 26 - SQ`
- `2026-07 · SEM 28-32 - SQ`
- `2026-08 · SEM 33, 34 - SQ`

**Interpretación:** No es un error. Son eventos históricos sin datos.

---
## 🔵 F2.6 — Análisis de eventos sin participaciones

### Hallazgo

Durante el análisis de F2.6, se detectaron **11 eventos** en `events_master` **sin participaciones asociadas**:

- `2026-04 · SEM 17 - SQ`
- `2026-06 · SEM 24, 25, 26 - SQ`
- `2026-07 · SEM 28, 29, 30, 31 - SQ`
- `2026-08 · SEM 32, 33, 34 - SQ`

**Inicialmente se interpretó** que eran eventos faltantes (a crear).
**Verificación posterior** reveló que estos 11 eventos **YA EXISTÍAN** en `events_master` desde F2.1.

### Interpretación corregida

No son eventos faltantes. Son eventos **sin participaciones cargadas** (semanas sin actividad).

**Filosofía:** No inventar datos. Documentar la realidad.

### Acción ejecutada

```sql
UPDATE events_master
SET metadata = metadata || jsonb_build_object(
  'no_data', true,
  'backfilled', false,
  'source', 'MIGRATION_ANALYSIS',
  'notes', 'Evento sin participaciones cargadas. No es un error.'
),
updated_at = NOW()
WHERE legacy_event_id IN (
  '2026-04 · SEM 17 - SQ',
  '2026-06 · SEM 24 - SQ',
  '2026-06 · SEM 25 - SQ',
  '2026-06 · SEM 26 - SQ',
  '2026-07 · SEM 28 - SQ',
  '2026-07 · SEM 29 - SQ',
  '2026-07 · SEM 30 - SQ',
  '2026-07 · SEM 31 - SQ',
  '2026-08 · SEM 32 - SQ',
  '2026-08 · SEM 33 - SQ',
  '2026-08 · SEM 34 - SQ'
);

### Resultado verificado

| Métrica | Valor |
|---|---:|
| `events_master` total | 35 |
| Eventos con `no_data: true` | 11 |
| Eventos con `backfilled: true` | 1 (BM SEM 16) |
| Eventos `OPEN` | 1 |
| Eventos `CLOSED` | 34 |
| Duplicados | 0 |
| Pérdida de datos | 0 |

### Hallazgo documentado

**HALLAZGO-063:** "Semanas huérfanas" son eventos sin participaciones, no eventos faltantes.

---

## 🔵 F2.7 — Columnas de auditoría en `events_master`

### Columnas agregadas

| Columna | Tipo | Descripción |
|---|---|---|
| `closed_at` | TIMESTAMPTZ | Timestamp de cierre del evento. |
| `closed_by` | UUID (FK `users.id`) | Usuario que cerró el evento. |
| `updated_at` | TIMESTAMPTZ DEFAULT NOW() | Timestamp de última actualización. |

### Índices agregados

| Índice | Tipo | Definición |
|---|---|---|
| `idx_events_master_closed_at` | Parcial | `WHERE closed_at IS NOT NULL` |
| `idx_events_master_legacy_event_id` | **UNIQUE Parcial** | `WHERE legacy_event_id IS NOT NULL` |

**⚠️ Cambio importante:** El índice `legacy_event_id` pasó de `CREATE INDEX` a **`CREATE UNIQUE INDEX`** para soportar `ON CONFLICT` y garantizar unicidad.

### Query ejecutada

```sql
ALTER TABLE events_master 
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS closed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

DROP INDEX IF EXISTS idx_events_master_legacy_event_id;
CREATE UNIQUE INDEX idx_events_master_legacy_event_id
  ON events_master (legacy_event_id)
  WHERE legacy_event_id IS NOT NULL;
```

---

## 🔵 F2.8 — Scheduler de eventos SQ

### Componente nuevo: `src/utils/eventScheduler.js`

**Propósito:** Auto-crear eventos SQ cada jueves 00:00 UTC.

**Características:**
- Cron job cada 1 hora (`0 * * * *`).
- Advisory Lock multi-réplica (vía RPC).
- Idempotencia por `legacy_event_id`.
- Sin backfill (decisión F2.9).

### Funciones RPC nuevas

**Archivo:** `sql/030_scheduler_locks.sql`

| Función | Retorno | Propósito |
|---|---|---|
| `acquire_scheduler_lock()` | BOOLEAN | Adquiere advisory lock (ID 12345). |
| `release_scheduler_lock()` | BOOLEAN | Libera advisory lock. |

### Dependencia agregada

- `node-cron` (^4.x) en `package.json`.

### Commits

| Commit | Descripción |
|---|---|
| `ca784ab` | feat(scheduler): crear eventScheduler |
| `2e84e3a` | feat(scheduler): versionar advisory locks |

---

## 🔵 F2.9 — Integración del scheduler en `server.js`

### Cambios en `server.js`

**Import agregado:**
```javascript
import { startEventScheduler } from './src/utils/eventScheduler.js';
```

**Modificación en `app.listen`:**
```javascript
app.listen(ENV.PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor PARAGUAY-FFAA | METALSTORM activo en puerto ${ENV.PORT}`);

  // START EVENT SCHEDULER (F2.9)
  try {
    startEventScheduler();
    console.log('✅ [Server] Event Scheduler iniciado.');
  } catch (err) {
    console.error('❌ [Server] Error iniciando Event Scheduler:', err.message);
    // No bloquea el arranque del servidor.
  }
});
```

### Decisión arquitectónica: backfill DESHABILITADO

**Problema detectado en test local:** El backfill original creaba eventos para semanas sin actividad real (SEM 36, SEM 37), **inventando datos históricos**.

**Solución aplicada:** Backfill **deshabilitado** (`// backfillRecentWeeks(12)`). Solo el `schedulerTick` (cron) crea el evento actual/futuro.

**Filosofía:** El histórico es lo que es. El scheduler respeta la realidad.

### Fix aplicado a `eventExists`

**Antes:** Buscaba por `metadata->>iso_week` y `metadata->>iso_year`.
**Problema:** Los eventos migrados en F2.1 **NO tienen** esos campos en metadata.
**Solución:** Buscar por `legacy_event_id` (único, cubre migrados y nuevos).

### Commits

| Commit | Descripción |
|---|---|
| `4b26266` | fix(scheduler): detectar migrados por legacy_event_id |
| `d08327d` | fix(scheduler): deshabilitar backfill |

### Test local verificado

```
🚀 Servidor PARAGUAY-FFAA | METALSTORM activo en puerto 3000
🕐 [Scheduler] Iniciando scheduler de eventos SQ...
✅ [Scheduler] Scheduler iniciado. Cron: cada 1 hora.
✅ [Server] Event Scheduler iniciado.
✅ [Supabase Diagnostic] Tabla "users" accesible.
✅ [Supabase Diagnostic] Tabla "performances" accesible.
✅ [Supabase Diagnostic] Tabla "events" accesible.
```

**Sin errores. Sin creación de eventos fantasmas.** ✅

---

## 📊 Resumen Final de F2 (Extendido)

### Commits de F2

| Fase | Commit | Descripción |
|---|---|---|
| F2.5 | `66d0221` | docs(migracion): documentar migración |
| F2.7 | `f7b3597` | feat: columnas closed_at/closed_by |
| F2.6+7 | `86296bb` | fix: sincronizar 028_events_master.sql |
| F2.8 | `ca784ab` | feat: eventScheduler |
| F2.8 | `2e84e3a` | feat: advisory locks SQL |
| F2.9 | `4b26266` | fix: detectar migrados por legacy_event_id |
| F2.9 | `d08327d` | fix: deshabilitar backfill |

### Estado Final de la BD (al cierre de F2)

| Tabla | Registros | Estado |
|---|---:|---|
| `events_master` | 35 | ✅ Migrado |
| `event_participations` | 639 | ✅ Migrado |
| `events` (legacy) | 35 | ✅ Preservada |
| `performances` (legacy) | 639 | ✅ Preservada |
| `bm_*` | 0 | ✅ Sin tocar |
| `users` | 61 | ✅ Sin tocar |

### Hallazgos documentados en F2

- **HALL-056:** `DEPLOYMENT_STATE.md` desactualizado.
- **HALL-057:** `009_plane_upgrades.sql` desactualizado.
- **HALL-058:** Módulo BM duplicado.
- **HALL-061:** 12 eventos sin participaciones.
- **HALL-062:** `ON CONFLICT` no funciona con índices parciales.
- **HALL-063:** "Semanas huérfanas" son eventos sin participaciones.

---

## 📎 Archivos Relacionados

| Documento | Propósito |
|---|---|
| `sql/028_events_master.sql` | DDL de la tabla unificada de eventos |
| `sql/029_event_participations.sql` | DDL de la tabla unificada de participaciones |
| `sql/030_scheduler_locks.sql` | DDL de advisory locks del scheduler |
| `sql/README.md` | Guía de migraciones actualizada (v1.3) |
| `BACKUP_INSTRUCTIONS.md` | Guía del backup F0 |
| `PROMPT_MAESTRO_REDISEÑO.md` | Plan completo del rediseño |

---

## 🎖️ Conclusión

Migración completada con **éxito total**.

- **0 pérdida de datos.**
- **0 inconsistencias.**
- **0 huérfanos.**
- **100% integridad referencial.**
- **100% reversibilidad.**

**El rediseño está listo para F3 (refactor backend).**

---

**PARAGUAY FFAA `[PRY]` — Escuadrón Oficial Metalstorm**
**Documento de migración v1.1 · 2026-09-17**