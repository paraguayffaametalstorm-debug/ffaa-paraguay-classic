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

## 📎 Archivos Relacionados

| Documento | Propósito |
|---|---|
| `sql/028_events_master.sql` | DDL de la tabla unificada de eventos |
| `sql/029_event_participations.sql` | DDL de la tabla unificada de participaciones |
| `sql/README.md` | Guía de migraciones actualizada (v1.2) |
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

**PARAGUAY FFAA `[PRY]` — Escuadrón Oficial MetalStorm**
**Documento de migración v1.0 · 2026-09-17**