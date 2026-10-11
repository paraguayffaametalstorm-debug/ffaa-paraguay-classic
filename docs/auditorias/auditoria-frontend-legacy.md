# 🔍 Auditoría del Frontend Legacy — Rediseño de Eventos (F4.1)

> **Documento técnico del mapeo de llamadas legacy a `/api/events/*` y `/api/bm/*` en el frontend.**
> **Fecha:** 2026-09-19
> **Fase:** F4.1 (Rediseño de Eventos)
> **Autor:** PJPIROVANI (OWNER)
> **Estado:** ✅ Aprobado

---

## 1. Objetivo

Mapear exhaustivamente todas las llamadas del frontend a los endpoints legacy
(`/api/events/*` y `/api/bm/*`) para planificar su migración a `/api/events-v2/*`.

**Alcance:** `js/api.js`, `js/bm.js`, `js/performance.js`, `js/views.js`.

---

## 2. Inventario de Llamadas Legacy

### 2.1. Endpoints `/api/events/*` (legacy SQ) — 6 usos

| # | Archivo | Función | Endpoint | Sucesor v2 |
|---|---|---|---|---|
| 1 | `js/views.js` | `loadOpenEvents()` | `GET /api/events/open` | `GET /api/events-v2/active` |
| 2 | `js/views.js` | `loadOpenEvents()` (fallback) | `GET /api/events` | `GET /api/events-v2` |
| 3 | `js/views.js` | `loadAdminEvents()` | `GET /api/events` | `GET /api/events-v2` |
| 4 | `js/performance.js` | `loadCurrentEvent()` | `GET /api/events/open` | `GET /api/events-v2/active` |
| 5 | `js/performance.js` | `loadCurrentEvent()` (fallback) | `GET /api/events` | `GET /api/events-v2` |
| 6 | `js/views.js` | `loadActiveMembers()` (fallback) | `GET /api/events/active-members` | `GET /api/performances/pilots` |

### 2.2. Endpoints `/api/bm/*` (legacy BM) — 18 usos

Todos en `js/api.js`, consumidos por `js/bm.js`.

| # | Función | Endpoint |
|---|---|---|
| 1 | `apiGetBmEvents()` | `GET /api/bm/events` |
| 2 | `apiGetBmActiveEvent()` | `GET /api/bm/events/active` |
| 3 | `apiGetBmEventById()` | `GET /api/bm/events/:id` |
| 4 | `apiCreateBmEvent()` | `POST /api/bm/events` |
| 5 | `apiUpdateBmEvent()` | `PUT /api/bm/events/:id` |
| 6 | `apiActivateBmEvent()` | `POST /api/bm/events/:id/activate` |
| 7 | `apiDeactivateBmEvent()` | `POST /api/bm/events/:id/deactivate` |
| 8 | `apiGetBmMissionsToday()` | `GET /api/bm/missions/today` |
| 9 | `apiGetBmMissionsByEvent()` | `GET /api/bm/missions/:eventId` |
| 10 | `apiCompleteBmMission()` | `POST /api/bm/missions/:id/complete` |
| 11 | `apiCreateBmMission()` | `POST /api/bm/missions` |
| 12 | `apiUpdateBmMission()` | `PUT /api/bm/missions/:id` |
| 13 | `apiDeleteBmMission()` | `DELETE /api/bm/missions/:id` |
| 14 | `apiGetBmProgress()` | `GET /api/bm/progress` |
| 15 | `apiGetBmDiscount()` | `GET /api/bm/discount` |
| 16 | `apiPurchaseBmDiscount()` | `POST /api/bm/discount/purchase` |
| 17 | `apiGetBmStats()` | `GET /api/bm/stats` |
| 18 | `apiGetBmLeaderboard()` | `GET /api/bm/leaderboard` |

### 2.3. Endpoints de escritura de rendimiento — 2 usos

| # | Archivo | Función | Endpoint |
|---|---|---|---|
| 1 | `js/api.js` | `savePerformance()` (modo admin) | `POST /api/admin/performances` |
| 2 | `js/performance.js` | `savePerformance()` | `POST /api/performances` |

---

## 3. Hallazgos Críticos

### 🔴 A4.1-01 — Duplicidad de `savePerformance()`

Existen **dos implementaciones distintas** de `savePerformance()`:

- **`js/api.js` (línea ~17):** Usa `POST /api/performances` (normal) o `POST /api/admin/performances` (admin).
- **`js/performance.js` (línea ~330):** Usa `POST /api/performances` siempre, con `user_id` en body.

**Riesgo:** La que se ejecuta depende del orden de carga. Comportamiento no determinístico.

**Resolución:** Unificar en `performance.js`. Eliminar la de `api.js` en F4.4.

### 🔴 A4.1-02 — `/api/events/active-members` sin sucesor v2

`js/views.js` (`loadActiveMembers` fallback) llama a un endpoint que no existe en `events-v2`.

**Resolución adoptada:** Reemplazar por `GET /api/performances/pilots` (ya devuelve lista de pilotos ACTIVE con RBAC).

### 🔴 A4.1-03 — `js/bm.js` usa 100% endpoints legacy

18 llamadas a `/api/bm/*`. Requiere refactor completo en F4.2.2.

### 🔴 A4.1-04 — Estructura de datos de `bmState` incompatible

`bmState.missionsByDay`, `bmState.progress`, `bmState.discount` tienen estructura de tablas `bm_*` (legacy). El nuevo modelo usa `events_master.metadata` + `event_participations.data` (JSONB).

**Resolución:** Adaptar estructura en F4.2.2.

### 🟠 A4.1-05 — Duplicidad de `loadCurrentEvent()`

`js/performance.js` y `js/views.js` (`loadOpenEvents`) tienen lógica duplicada.

**Resolución:** Consolidar en `js/events.js` (F4.2.3).

### 🟠 A4.1-06 — `POST /api/admin/performances` sin equivalente v2

Flujo admin de `api.js` usa endpoint que no existe en `events-v2`.

**Resolución adoptada:** Rediseñar a `POST /api/events-v2/:id/participations` con `user_id` en body.

### 🟡 A4.1-07 — `formatEventTitle()` con formato legacy

`js/performance.js` y `js/views.js` calculan títulos tipo `2026-09 · SEM 38 - SQ`. El nuevo modelo usa `events_master.name` + `metadata.iso_week`.

### 🟡 A4.1-08 — `window.currentEvent` global compartido

`performance.js` y `views.js` leen/escriben `window.currentEvent`. El nuevo `events-v2` devuelve `status` en lugar de `is_open`. Normalizar.

**Resolución:** Crear `js/events.js` como fuente única.

---

## 4. Decisiones Adoptadas

| # | Decisión | Adoptado |
|---|---|---|
| 1 | `/api/events/active-members` | **(b)** Reemplazar por `GET /api/performances/pilots` |
| 2 | `POST /api/admin/performances` | **(b)** Rediseñar con `POST /api/events-v2/:id/participations` |
| 3 | `window.currentEvent` | **(b)** Crear `js/events.js` dedicado |

---

## 5. Plan de Refactor (F4.2-F4.4)

### F4.2 — Clientes API (1 día)

| Sub-fase | Archivo | Tarea |
|---|---|---|
| F4.2.1 | `js/api.js` | Agregar 11 funciones `apiEventsV2*` (aditivo, no destructivo) |
| F4.2.2 | `js/bm.js` + `js/api.js` | Refactor: reemplazar 18 llamadas `apiGetBm*` |
| F4.2.3 | `js/performance.js` + `js/events.js` | Unificar `savePerformance()` y crear módulo `events.js` |
| F4.2.4 | `js/views.js` | Refactor: `loadOpenEvents()`, `loadAdminEvents()`, `loadActiveMembers()` |

### F4.3 — Vistas adaptativas + UI evento activo (1.5 días)

- Widget "Evento Activo" en dashboard.
- Vistas adaptativas por tipo (SQ: tokens; BM: misiones).
- Switch funcional: bloquear cargas incompatibles.
- Panel admin unificado.

### F4.4 — Deprecación formal (0.5 día)

- Actualizar `API_REFERENCE.md` (BL-018).
- Actualizar `CHANGELOG.md`.
- Crear `docs/adr/ADR-005-rediseno-eventos.md`.
- Eliminar funciones legacy de `js/api.js`.

---

## 6. Matriz de Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Romper carga de evento activo | Media | Alto | Tests manuales antes de deploy |
| Romper módulo BM completo | Alta | Alto | Refactor incremental + pruebas |
| PWA cacheada sirve JS viejo | Media | Medio | Bump `sw.js` a `v4.1.0` |
| `window.currentEvent` inconsistente | Media | Medio | Normalizar en `events.js` |

---

## 7. Criterios de Cierre F4

- [ ] 0 llamadas a `/api/events/*` en frontend.
- [ ] 0 llamadas a `/api/bm/*` en frontend.
- [ ] 0 llamadas a `/api/admin/performances` en frontend.
- [ ] `window.currentEvent` normalizado en `js/events.js`.
- [ ] Módulo BM funciona con `events-v2`.
- [ ] Formulario de rendimiento funciona con `events-v2`.
- [ ] `sw.js` bumpeado a `v4.1.0`.
- [ ] Deploy exitoso y smoke test en producción.

---

**PARAGUAY FFAA `[PRY]` · Auditoría F4.1 · 2026-09-19**