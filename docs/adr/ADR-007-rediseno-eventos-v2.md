# ADR-007: Rediseño de Eventos v2 (Unificación SQ + BM)

> **Estado:** Aceptado
> **Fecha:** 2026-09-20
> **Autor:** Comando C4ISR
> **Reemplaza a:** ADR-006 (Black Market Unificado)
> **Supersede parcialmente:** Arquitectura dual `/api/events/*` + `/api/bm/*`

---

## 1. Contexto

El sistema original mantenía **dos módulos de eventos completamente separados**:

| Módulo | Tablas | Endpoints | Propósito |
|---|---|---|---|
| **Squadron Event (SQ)** | `events`, `performances` | `/api/events/*` | Evento semanal (jueves-domingo) |
| **Black Market (BM)** | `bm_events`, `bm_missions`, `bm_progress`, `bm_discounts` | `/api/bm/*` | Evento especial 5 días |

**Problemas detectados:**

1. **Duplicación de lógica:** dos schedulers, dos formatos de respuesta, dos conjuntos de validaciones Zod.
2. **Race conditions:** ambos módulos podían tener un evento activo simultáneamente, causando conflictos en el registro de participaciones.
3. **Inconsistencia de IDs:** SQ usaba IDs string (`SQUADRON-2026-36`), BM usaba INTEGER autoincremental.
4. **Deuda técnica acumulada:** 18 endpoints BM legacy + 1577 líneas en `bm.controller.js` sin tests automatizados.
5. **Timezone bugs:** el scheduler SQ creaba eventos a las 09:00 UTC en vez de 09:00 PY (HALL-065).

---

## 2. Decisión

Migrar **AMBOS módulos** a una arquitectura unificada sobre dos tablas maestras:

| Tabla | Propósito |
|---|---|
| `events_master` | Eventos unificados (UUID, `type`, `status`, `metadata` JSONB) |
| `event_participations` | Participaciones unificadas (UUID, `event_id`, `user_id`, `data` JSONB, `computed_points`, `status`) |

### 2.1 Tipos de evento soportados

- `SQUADRON`: Evento semanal (jueves 09:00 PY - lunes 09:00 PY).
- `BLACK_MARKET`: Evento especial de 5 días (miércoles - domingo).
- `ACE_CHALLENGE`: Reservado para futuro (estructura documentada, no implementada).

### 2.2 Regla del switch (1 evento OPEN a la vez)

- Solo puede existir **1 evento OPEN** en todo el sistema (índice UNIQUE parcial `idx_events_master_single_open`).
- Al activar un BM, el SQ se cierra con `closed_reason = 'BM_REPLACED'`.
- El scheduler auto-crea el próximo SQ el **jueves 00:00 UTC** (09:00 PY).

### 2.3 Scheduler timezone-aware

- Paraguay usa **UTC-4 en verano** (oct-mar) y **UTC-3 en invierno** (abr-sep).
- El scheduler calcula el offset dinámicamente vía `Intl.DateTimeFormat` con timezone `America/Asuncion`.
- Duración SQ: **+4 días** (jueves - lunes).

### 2.4 Widget evento activo timezone-aware

- Frontend usa `undefined` en `toLocaleDateString` (locale del navegador).
- Referencia UTC explícita para evitar ambigüedades.

---

## 3. Consecuencias

### Positivas

- ✅ **1 sola fuente de verdad** para eventos y participaciones.
- ✅ **Switch funcional** elimina race conditions entre SQ y BM.
- ✅ **Scheduler timezone-aware** corrige HALL-065 (eventos cierran 1 día antes).
- ✅ **Widget timezone-aware** corrige BL-020 (pilotos en otros países ven fecha incorrecta).
- ✅ **93 tests automatizados** (Vitest 5.0.1) cubren schemas, controladores y reglas de negocio.
- ✅ **~1666 líneas eliminadas** (bm.controller.js 1577 + bm.routes.js 89).

### Negativas

- ⚠️ **Migración irreversible:** los IDs BM pasaron de INTEGER a UUID.
- ⚠️ **Deprecación legacy:** `/api/events/*` y `/api/bm/*` siguen operativos hasta **2026-12-16** (sunset).
- ⚠️ **DROP tablas legacy:** `sql/032_drop_bm_legacy_tables.sql` pendiente post-2026-09-26 (7 días de gracia).

### Neutrales

- 📝 BM histórico marcado con `metadata.legacy_bm: true` (solo-lectura).
- 📝 Pricing migrado de Tokens a Shards (`base_price_shards`, `discount_shards`, `final_price_shards`).

---

## 4. Archivos afectados

### Backend

| Archivo | Cambio |
|---|---|
| `src/controllers/events-v2.controller.js` | NUEVO (8 endpoints unificados) |
| `src/controllers/events-v2-bm.controller.js` | NUEVO (8 endpoints BM unificados) |
| `src/routes/events-v2.routes.js` | NUEVO |
| `src/routes/events-v2-bm.routes.js` | NUEVO |
| `src/utils/eventScheduler.js` | MODIFICADO (timezone PY + duración 4 días — HALL-065) |
| `src/controllers/bm.controller.js` | ELIMINADO (1577 líneas) |
| `src/routes/bm.routes.js` | ELIMINADO (89 líneas) |
| `server.js` | MODIFICADO (eliminado mount `/api/bm`) |

### Frontend

| Archivo | Cambio |
|---|---|
| `js/api.js` | MODIFICADO (11 wrappers `apiEventsV2Bm*`) |
| `js/bm.js` | MODIFICADO (refactor completo ~600 líneas) |
| `js/views.js` | MODIFICADO (widget timezone-aware — BL-020) |
| `sw.js` | MODIFICADO (CACHE_NAME v4.1.0) |

### SQL

| Archivo | Estado |
|---|---|
| `sql/030_events_master.sql` | Ejecutado |
| `sql/031_event_participations.sql` | Ejecutado |
| `sql/032_drop_bm_legacy_tables.sql` | PENDIENTE (post-2026-09-26) |

### Docs

| Archivo | Estado |
|---|---|
| `docs/adr/ADR-006-black-market-unificado.md` | Reemplazado por ADR-007 |
| `docs/adr/ADR-007-rediseno-eventos-v2.md` | Este documento |

---

## 5. Alternativas consideradas

### Alternativa A: Mantener arquitectura dual + sincronización manual

- ❌ Rechazada: race conditions persisten, deuda técnica no se reduce.

### Alternativa B: Migrar solo BM al modelo de SQ

- ❌ Rechazada: SQ también tiene bugs (HALL-065), migrar ambos es más limpio.

### Alternativa C: Modelo polimórfico con herencia de tablas (PostgreSQL INHERITS)

- ❌ Rechazada: complejidad excesiva para 2 tipos de evento, dificulta queries.

---

## 6. Referencias

- `docs/adr/ADR-006-black-market-unificado.md` (superseded)
- `docs/auditoria-frontend-legacy.md` (F4.1)
- `src/utils/eventScheduler.js` (scheduler timezone-aware)
- `CHANGELOG.md` (entrada [4.1.0])
- `API_REFERENCE.md` (§3.5)
- `BACKLOG.md` (HALL-065, BL-020, BL-018)

---

**PARAGUAY FFAA [PRY] · ADR-007 · 2026-09-20**
