# 📝 Registro de Versiones y Cambios (Changelog) - PARAGUAY-FFAA | METALSTORM

Todas las modificaciones notables, correcciones de errores, mejoras de seguridad y despliegues del sistema táctico **PARAGUAY-FFAA | METALSTORM** se documentan en este archivo.

El formato se basa en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y este proyecto se adhiere a [Semantic Versioning](https://semver.org/lang/es/).

---

## 📌 [4.3.1] - 2026-09-21

### 🚨 Hotfix — HALL-066: Corrección del scheduler + endpoint /active con período de gracia

#### Objetivo Cumplido

Corregir tres bugs del scheduler que causaban que eventos futuros fueran
marcados como `OPEN` antes de su fecha de inicio real, afectando el
countdown del dashboard y el ciclo operativo del escuadrón. Además,
añadir un **período de gracia** al endpoint `/api/events-v2/active` para
que los pilotos puedan seguir cargando performance del evento anterior
durante el hueco entre eventos (ADR-008).

#### Problema Detectado

El domingo 20/09/2026 a las ~22:00 PY, el dashboard mostraba un countdown
de **~7 días** para el evento `Squadron Event 2026-W39`, cuando el evento
`Squadron Event 2026-W38` debía cerrar el lunes 21/09/2026 a las 08:59 PY
(~12 horas después).

**Evidencia forense:** El scheduler v1.1 cerró W38 a las `21/09 00:00 UTC`
(11 horas antes de su `end_date`) y creó W39 como `OPEN` a la misma hora
(3 días antes de su `start_date`).

#### Causa Raíz

El scheduler v1.1 mezclaba tres responsabilidades en un solo tick:

1. **Cerrar el evento de la semana ISO anterior** — por cambio de semana,
   no por `end_date`.
2. **Crear el evento de la semana ISO actual** — siempre como `OPEN`,
   sin verificar si era futuro.
3. **Sin lógica para promover `SCHEDULED → OPEN`** cuando llegara la hora.

Además, `created_at` se seteaba con `start_date` en lugar de `NOW()`.

#### Solución Aplicada

**Scheduler v2.0 (`src/utils/eventScheduler.js`):**

- **Tarea 1 — `openScheduledEvents()`:** Promueve `SCHEDULED → OPEN` cuando `NOW() >= start_date`.
- **Tarea 2 — `closeExpiredEvents()`:** Cierra `OPEN → CLOSED` cuando `NOW() >= end_date`.
- **Tarea 3 — `ensureNextSquadronEvent()`:** Prepara la próxima semana ISO como `SCHEDULED`.
- **Guarda de seguridad:** Nunca crea evento futuro como `OPEN`.
- **Fix de auditoría:** `created_at` ahora usa `NOW()`.

**Backend (`src/controllers/events-v2.controller.js`):**

- `getActiveEvent` con período de gracia (`isGracePeriod`).
- `normalizeEvent` incluye `submission_opens_at`, `submission_closes_at`, `seconds_remaining`, `can_submit`.

#### Verificación

- ✅ **179/179 tests pasando** (Vitest 5.0.1).
- ✅ **Deploy sin downtime** (`deployment-01M30T4FFKVMVF63CH8H9G75S9`).
- ✅ **Smoke test:** `/health` → `OK`.
- ✅ **Estado BD:** W38 `OPEN` dentro de ventana, W39 `SCHEDULED`.
- ✅ **Dashboard muestra W38**.

#### Entregable

Commits `0fd9961` + `cf67dd6` mergeados a `main` y desplegados.

---

## 📌 [4.3.1-docs] - 2026-09-20

### 📚 Sincronización Documental — Timezone + Duración SQ (Sprint 0 · Grupo E)

> **Solo documentación. Cero cambios de código. Cero cambios de runtime.**
> **El runtime sigue siendo v4.3.0.** El badge del README y `sw.js` no se modifican.

#### Objetivo Cumplido

Alinear la documentación con el código real del scheduler (`src/utils/eventScheduler.js`) tras el fix HALL-065 v2 (v4.1.1). Tres fixes del Sprint 0:

- **FIX-006:** Documentos afirmaban "timezone dinámico con `Intl.DateTimeFormat`" cuando el código usa `PY_OFFSET_HOURS = 3` hardcodeado.
- **FIX-021:** Decisión oficial de timezone y propagación a todos los documentos.
- **FIX-022:** Decisión oficial de duración SQ (evento vs ventana de carga) y propagación.

#### Decisiones del OWNER (2026-09-20)

| Concepto | Valor oficial | Fundamento |
|---|---|---|
| **Timezone oficial** | UTC-3 fijo (`PY_OFFSET_HOURS = 3`) | Paraguay sin DST desde octubre 2024 (Ley 7141/2024). Coincide con el código real. |
| **Duración evento SQ** | 4 días (jue 09:00 PY → lun 08:59 PY) | Ciclo competitivo semanal. |
| **Duración ventana de carga SQ** | 7 días (jue 09:00 PY → jue 08:59 PY) | ADR-008. Desacoplada del evento. |

> **Nota clave:** "Evento SQ" y "ventana de carga SQ" son conceptos **distintos** (4d vs 7d). La documentación previa los mezclaba.

#### Archivos Modificados

| Archivo | Cambio |
|---|---|
| `CURRENT_STATE.md` | L52-53: reemplazado bloque "America/Asuncion dinámico Intl" por UTC-3 fijo + duraciones evento/ventana. |
| `ARCHITECTURE.md` | Header v4.0.5 → v4.3.0; L154 "jueves 00:00 UTC" → "jueves 12:00 UTC"; §2.2c bloque timezone + duración; footer v4.3.0. |
| `docs/adr/ADR-007-rediseno-eventos-v2.md` | §2.1 (duración evento), §2.2 (jue 12:00 UTC), §2.3 (UTC-3 fijo, sin Intl, evento 4d + ventana 7d). |
| `PLAN_TRABAJO.md` | Sección 1 (commit HEAD, versión, duraciones, ADRs); FIX-006/021/022 movidos a Completados. |

#### Archivos NO Modificados

- `README.md` — badge sigue en v4.3.0.
- `sw.js` — `CACHE_NAME` sigue en v4.3.0 (no hay assets cacheados nuevos).
- `src/utils/eventScheduler.js` — código ya correcto.
- `src/utils/submissionWindow.js` — código ya correcto.

#### Verificación

- ✅ Tests: 167/167 passing (sin cambios, Vitest 5.0.1).
- ✅ Contradicciones sobre timezone eliminadas de docs.
- ✅ Duración evento SQ (4d) y ventana SQ (7d) diferenciadas explícitamente.

---

## 📌 [4.3.0] - 2026-09-20

### 🗓️ ADR-008 — Ventanas de Carga Desacopladas del Ciclo de Evento (F5.1 a F5.7)

#### Objetivo Cumplido

Desacoplar la ventana de carga de performance del ciclo del evento. Antes, la ventana estaba atada al ciclo (4 días, desfasada 1 evento, bloqueada por BM). Ahora cada evento tiene su propia ventana configurable y más generosa:

- **SQUADRON:** 7 días (jue 09:00 PY → jue 08:59 PY).
- **BLACK_MARKET:** 6 días (mié 17:00 PY → mar 16:59 PY).

#### Problema Resuelto

| # | Problema anterior | Solución |
|---|---|---|
| 1 | Ventana desfasada 1 evento | Ventana abre con el `start_date` del propio evento |
| 2 | Ventana corta (4 días) | 7 días (SQ) / 6 días (BM) |
| 3 | Bloqueo por BM | La ventana del SQ sigue abierta durante el BM |
| 4 | Pérdida de data | +3 días de gracia por evento |
| 5 | Confusión operativa | `submission_opens_at` / `submission_closes_at` explícitos |

#### Sub-fases Completadas

| Sub-fase | Descripción | Commit |
|---|---|---|
| **5.1** | ADR-008 aprobado por OWNER | `a42aad9` |
| **5.2** | Migración SQL 034 + backfill de eventos históricos | (SQL ejecutado) |
| **5.3** | Scheduler `calculateSubmissionWindow()` | `679e961` |
| **5.4.1** | Helper `submissionWindow.js` (2 funciones puras) | (con 5.4.2) |
| **5.4.2** | Validación en BM progress | `9ecd92f` |
| **5.4.3** | Validación en SQ participations | `5cb4784` |
| **5.4.4** | Rutas `GET /submission-window` (SQ + BM) | `dc232f0` |
| **5.4.5** | 39 tests unitarios (helper + scheduler) | `0834eb4` |
| **5.5** | Frontend wrappers en `js/api.js` | `b2fab4c` |
| **5.6** | Backfill de eventos históricos | (incluido en SQL 034) |
| **5.7** | Docs + Deploy + Smoke test | (esta entrada) |

#### Arquitectura Técnica

**Nuevas columnas en `events_master`:**

| Columna | Tipo | Semántica |
|---|---|---|
| `submission_opens_at` | TIMESTAMPTZ | Cuándo se puede empezar a cargar |
| `submission_closes_at` | TIMESTAMPTZ | Deadline de carga (después → READ-ONLY) |

**Nuevos endpoints:**

- `GET /api/events-v2/:id/submission-window` (SQ)
- `GET /api/events-v2/bm/:eventId/submission-window` (BM)

**Excepción de negocio:** el purchase de BM (`POST /api/events-v2/bm/:eventId/purchase`) **NO** valida la ventana (el BM es opcional y no determinante para el escuadrón).

#### Archivos Modificados

| Archivo | Cambio |
|---|---|
| `sql/034_submission_windows.sql` | NUEVO. ALTER TABLE + índice parcial + backfill SQ/BM |
| `src/utils/eventScheduler.js` | `calculateSubmissionWindow()` exportada |
| `src/utils/submissionWindow.js` | NUEVO. `validateSubmissionWindow()` + `getSubmissionWindowStatus()` |
| `src/controllers/events-v2.controller.js` | Validación en participations SQ + endpoint window |
| `src/controllers/events-v2-bm.controller.js` | Validación en progress BM + endpoint window |
| `src/routes/events-v2.routes.js` | Ruta `GET /:id/submission-window` |
| `src/routes/events-v2-bm.routes.js` | Ruta `GET /bm/:eventId/submission-window` |
| `js/api.js` | Wrappers `apiEventsV2SubmissionWindow` + `apiEventsV2BmSubmissionWindow` |
| `docs/adr/ADR-008-ventanas-carga-desacopladas.md` | NUEVO |
| `docs/adr/README.md` | ADR-008 marcado como Accepted |

#### Tests

- ✅ **167/167 tests pasando** (128 previos + 39 nuevos ADR-008).
- Cobertura nueva: helper `submissionWindow` (V1-V20, G1-G15, I1-I4), scheduler `calculateSubmissionWindow` (S1-S5, B1-B4, F1-F3, I1-I6), validación en BM progress (F1-F8).

#### ✅ Criterios de Cierre Cumplidos

- ✅ Columnas `submission_opens_at` / `submission_closes_at` en `events_master`.
- ✅ Scheduler calcula ventanas SQ (+7d) y BM (+6d).
- ✅ Helper con 2 funciones puras + 39 tests.
- ✅ Endpoints de carga (SQ + BM) validan la ventana.
- ✅ Purchase BM exento (decisión de negocio §2.4).
- ✅ 2 endpoints `GET /submission-window` operativos.
- ✅ Backfill de 40 eventos históricos.
- ✅ 167/167 tests.
- ✅ Documentación actualizada.
- ✅ Deploy a producción (ver 5.7.2).
- ✅ Smoke test post-deploy (ver 5.7.3).

Rama `main` con 8 commits de Fase 5. Backend + frontend 100%, docs actualizadas. Deploy y smoke test completados en producción.

---

## 📌 [4.2.0] - 2026-09-20

### 🔧 Auditoría y normalización de eventos SQ 2026

#### Objetivo Cumplido

Normalizar los 35 eventos SQUADRON históricos de 2026 en Supabase, eliminar huecos, corregir fechas erróneas y alinear la numeración con el calendario real.

#### Problema Detectado

- **35 eventos SQ** con numeración desfasada (SEM N no coincidía con el N-ésimo jueves del año).
- **3 gaps** sin cargar: SEM 9 (26-02), SEM 17 (23-04), SEM 37 (10-09).
- **1 fix de fechas:** SEM 8 tenía fechas invertidas (lunes 23-02 → jueves 26-02 en lugar de jueves 19-02 → lunes 23-02).

#### Estrategia Aplicada (Opción A — Renumerar todo)

1. **Insertar los 3 gaps** primero (SEM 9, SEM 17, SEM 37).
2. **Corregir fechas de SEM 8** (id `a3c535cf`).
3. **Renombrar 26 eventos por ID explícito** (SEM 9-35 → SEM 10-36).

#### Lección Crítica Aprendida

**NUNCA usar `REPLACE`/`LIKE` masivo para renombres consecutivos.** El ensayo v1 falló estrepitosamente: cada `UPDATE` arrastraba eventos ya renombrados, generando colisiones (`SEM 16` repetido 6 veces, `SEM 36` repetido 20 veces).

**Solución:** `UPDATE` explícito por `id` — cero ambigüedad, cero colisiones.

#### Verificación Post-COMMIT

| Check | Resultado |
|---|---|
| P1: Total SQ 2026 | 38 ✅ |
| P2: Calendario completo | Sin huecos ✅ |
| P3: Sin duplicados | 0 filas ✅ |
| P4: IDs renombrados | OK ✅ |
| P5: BM intactos | KF-21, F-20 ✅ |

#### Cambios Aplicados

- **26 renames** (SEM 9-35 → SEM 10-36, preservando `id`).
- **3 INSERTs** (SEM 9, SEM 17, SEM 37).
- **1 UPDATE de fechas** (SEM 8).
- **Total:** 30 cambios atómicos en transacción.

#### Entregable

- `sql/033_normalize_sq_2026.sql` — script de normalización.
- **38 eventos SQ 2026** (SEM 1 → SEM 37 + W38), calendario completo y consistente.
- **FK preservada:** `event_participations.event_id → events_master.id` intacta.

---

## 📌 [4.1.1] - 2026-09-20

### 🚨 Hotfix — HALL-065 v2: Offset PY corregido (UTC-4 → UTC-3)

#### Objetivo Cumplido

Corregir el offset horario de Paraguay usado por el scheduler de eventos SQ. El sistema asumía UTC-4 cuando Paraguay abolió el DST en octubre 2024 y usa **UTC-3 permanente**. Esto causaba que los eventos SQ abrieran 1 hora más tarde de lo esperado (10:00 PY en vez de 09:00 PY).

#### Descripción del Bug

**Síntoma detectado:** el widget del dashboard mostraba eventos SQ con duración incorrecta y fechas que no coincidían con la regla de negocio (jueves 09:00 PY → lunes 08:59 PY).

**Diagnóstico:**
- El scheduler (`src/utils/eventScheduler.js`) tenía hardcodeado `PY_OFFSET_HOURS = 4`.
- Paraguay abolio el DST en octubre 2024 y usa UTC-3 todo el ano desde entonces.
- Los eventos creados **antes del fix** (W38 y anteriores) tenían `start_date = 09:00 UTC` (debería ser `12:00 UTC`).
- Los eventos creados **después del fix** (W39+) tendrán las fechas correctas.

#### Cambios Aplicados

| Archivo | Cambio |
|---|---|
| `src/utils/eventScheduler.js` | `PY_OFFSET_HOURS`: `4` → `3`. Comentarios actualizados. Bloque `export` para tests. |
| `tests/utils/eventScheduler.test.js` | NUEVO. 17 tests automatizados que validan constantes, ISO week/year, fechas W38/W39 2026 e invariantes. |

#### Corrección de Datos Históricos

**Evento W38 corregido en producción** vía SQL:

```sql
UPDATE events_master
SET
  start_date = '2026-09-17 12:00:00+00',
  end_date = '2026-09-21 11:59:59+00',
  ...
WHERE name = 'Squadron Event 2026-W38';
```

**Verificación:** `start_date = 2026-09-17 12:00:00+00`, `end_date = 2026-09-21 11:59:59+00`, `duracion = 3 days 23:59:59`.

#### Tests

- ✅ **110/110 tests pasando** (93 previos + 17 nuevos).
- ✅ `node --check src/utils/eventScheduler.js` sin errores.
- ✅ Deploy a Fly.io exitoso (rolling, sin downtime).

#### Hallazgo Adicional: tzdata de Supabase desactualizado

Durante el diagnóstico se detectó que **Supabase tiene la timezone database desactualizada**:

```sql
SELECT NOW() AT TIME ZONE 'America/Asuncion';
-- Devuelve 04:42-4h = 00:42 (UTC-4), pero debería ser 01:42 (UTC-3).
```

**Impacto:** solo afecta a queries SQL manuales con `AT TIME ZONE 'America/Asuncion'`. El sistema operativo (backend + frontend) usa UTC internamente y offsets hardcodeados correctos.

**Acción recomendada:** abrir ticket con Supabase. **Workaround:** usar `AT TIME ZONE 'UTC' - INTERVAL '3 hours'` en queries manuales.

#### ✅ Criterios de Cierre Cumplidos

- ✅ Offset corregido: `PY_OFFSET_HOURS = 3`.
- ✅ W38 corregido en BD con fechas consistentes.
- ✅ 17 tests automatizados agregados.
- ✅ 110/110 tests pasando.
- ✅ Deploy sin downtime.
- ✅ Log del scheduler muestra `UTC-3`.

#### 🎯 Entregable

Commit `074fdc3` mergeado a `main` y desplegado. Deploy: `deployment-01M2YHNVV30YCWSKBFA3RSM5R4`.

---


## 📌 [4.1.0] - 2026-09-20

### 🎯 Rediseño de Eventos v2 — Unificación SQ + BM (F4.1 a F4.4)

#### Objetivo Cumplido

Unificar los dos módulos de eventos del sistema (Squadron Event + Black Market) sobre una arquitectura única basada en `events_master` + `event_participations`, eliminando la deuda técnica acumulada (1577 líneas de `bm.controller.js` + 89 líneas de `bm.routes.js` + 18 endpoints legacy) y corrigiendo dos bugs de timezone detectados durante el rediseño.

#### Sub-fases Completadas

| Sub-fase | Descripción | Commit |
|---|---|---|
| **F4.1** | Auditoría frontend legacy | `cd77149` |
| **F4.2.1** | Cliente `apiEventsV2*` en `js/api.js` | `4f88d3f` |
| **F4.2.2-A** | Schemas BM + ADR-006 | `6b61852` |
| **F4.2.2-B** | 8 endpoints BM en `/api/events-v2/bm/*` | `2a6cb12` |
| **F4.2.2-C** | 93 tests con Vitest | `05bea21` |
| **F4.2.2-D** | Migración BM histórico (`legacy_bm: true`) | (SQL ejecutado) |
| **F4.2.2-E** | Refactor `js/api.js` (eliminar 18 `apiGetBm*`) | `7ca8450` |
| **F4.2.2-F** | Refactor `js/bm.js` (consumir `apiEventsV2Bm*`) | `7387d3c` + `9b8ea0e` |
| **F4.2.2-G** | DROP tablas BM legacy + eliminar backend legacy | `42867fd` |
| **F4.3** | Vistas adaptativas + UI evento activo | `b5d542b` |
| **F4.3 (fix)** | HALL-065: scheduler SQ timezone PY + duración 4 días | `7f1ce93` |
| **F4.3 (fix)** | BL-020: widget evento activo timezone-aware | `4ab67cd` |

#### Hallazgos Resueltos

| Hallazgo | Descripción | Commit |
|---|---|---|
| HALL-065 | Scheduler SQ creaba eventos a las 09:00 UTC en vez de 09:00 PY (UTC-4/UTC-3), y `end_date` con +3 días en vez de +4 días. Eventos cerraban 1 día antes de lo esperado. | `7f1ce93` |
| BL-020 | Widget de evento activo usaba `.toLocaleDateString('es-PY', ...)` hardcodeado. Pilotos en otros países veían fecha/hora incorrecta. | `4ab67cd` |

#### Arquitectura Nueva

**Tablas maestras:**

| Tabla | Propósito |
|---|---|
| `events_master` | Eventos unificados (UUID, `type`, `status`, `metadata` JSONB) |
| `event_participations` | Participaciones unificadas (UUID, `event_id`, `user_id`, `data` JSONB, `computed_points`, `status`) |

**Tipos de evento:** `SQUADRON` (semanal jueves-lunes), `BLACK_MARKET` (5 días miércoles-domingo), `ACE_CHALLENGE` (reservado).

**Regla del switch:** Solo 1 evento `OPEN` a la vez (índice UNIQUE parcial `idx_events_master_single_open`). Al activar un BM, el SQ se cierra con `closed_reason = 'BM_REPLACED'`.

**Endpoints nuevos:** `/api/events-v2/*` (8 endpoints) + `/api/events-v2/bm/*` (8 endpoints).

#### Archivos Eliminados

| Archivo | Líneas |
|---|---|
| `src/controllers/bm.controller.js` | 1577 |
| `src/routes/bm.routes.js` | 89 |
| **Total** | **1666** |

#### Archivos Modificados

| Archivo | Cambio |
|---|---|
| `src/utils/eventScheduler.js` | Timezone PY (`America/Asuncion`) + duración 4 días (HALL-065) |
| `server.js` | Eliminado mount `/api/bm` + `deprecationMiddleware` |
| `js/api.js` | 11 wrappers `apiEventsV2Bm*` |
| `js/bm.js` | Refactor completo ~600 líneas |
| `js/views.js` | Widget timezone-aware (BL-020) |
| `sw.js` | CACHE_NAME v4.1.0 |
| `index.html` | Cache-busting `?v=4.1.0` |

#### SQL Versionado

| Archivo | Estado |
|---|---|
| `sql/030_events_master.sql` | Ejecutado |
| `sql/031_event_participations.sql` | Ejecutado |
| `sql/032_drop_bm_legacy_tables.sql` | **PENDIENTE** (post-2026-09-26) |

#### Tests

- ✅ **93/93 tests pasando** (Vitest 5.0.1, 10 test files).
- Cobertura: schemas BM, controladores events-v2-bm (create/update/progress/discount/leaderboard), lógica de puntos.

#### Documentación

- ➕ `docs/adr/ADR-007-rediseno-eventos-v2.md` (nuevo, reemplaza ADR-006).
- ✏️ `API_REFERENCE.md` — §3.5 completado (endpoints + participaciones + deprecación).
- ✏️ `CURRENT_STATE.md` — sección eventos v2 unificados.
- ✏️ `BACKLOG.md` — HALL-065 + BL-020 movidos a completados.
- ✏️ `SESSION_HANDOFF.md` — regenerado.

#### Deprecación Formal

Los siguientes endpoints quedan **deprecados** con sunset programado para **2026-12-16**:

- `/api/events/*` (legacy SQ)
- `/api/bm/*` (legacy BM — eliminado en F4.2.2-G)

#### ✅ Criterios de Cierre Cumplidos

- ✅ Arquitectura unificada `events_master` + `event_participations`.
- ✅ Switch funcional (1 evento OPEN a la vez).
- ✅ Scheduler timezone-aware (HALL-065).
- ✅ Widget timezone-aware (BL-020).
- ✅ 93/93 tests pasando.
- ✅ Backend BM legacy eliminado (~1666 líneas).
- ✅ ADR-007 documentado.
- ✅ API_REFERENCE §3.5 completado.
- ✅ Deploy a producción sin downtime.
- ✅ Smoke test post-deploy OK.

#### 🎯 Entregable

Rama `main` con commits mergeados. Deploy consolidado de F4.4.

**Total:** 14 commits, ~1666 líneas eliminadas, 16 endpoints unificados, 93 tests.

---

## 📌 [4.0.5] - 2026-09-18

### 🚨 Hotfix Definitivo — Vinculación Google OAuth operativa (HALL-059 + HALL-060)

#### Objetivo Cumplido

Completar la resolución del flujo de vinculación de cuentas Google OAuth (`/link-account`), que presentaba dos bugs adicionales no cubiertos por la entrada `[4.0.3]`:

1. `ReferenceError: API_BASE is not defined` en el frontend (HALL-059, fix definitivo).
2. `500 Internal Server Error` en el backend por columna `google_id` inexistente (HALL-060).

#### Hallazgos Resueltos

| Hallazgo | Descripción | Commit |
|---|---|---|
| HALL-059 | `API_BASE` no definido en `link-account.html` (definido inline en `index.html`) | `71fbda2` |
| HALL-060 | Columna `google_id` inexistente en BD pero incluida en `.select()` | `9678d98` |
| HALL-061 | Discrepancia entre DDL `sql/001_users.sql` y BD real | Pendiente |

#### Archivos Modificados

| Archivo | Cambio |
|---|---|
| `link-account.html` | Definir `API_BASE` inline antes de `api.js` (replica `index.html:129`) |
| `src/controllers/auth.controller.js` | Eliminar `google_id` del `.select()` en `linkAccount` |
| `js/api.js` | Función `apiLinkAccount()` con ruta relativa |
| `sw.js` | Cache bump `v3.9.8` → `v4.0.3` |

#### Verificación en Producción

- ✅ `GET /health` → `200 OK`
- ✅ `POST /api/auth/link-account` con usuario inexistente → `404` con mensaje apropiado
- ✅ `POST /api/auth/link-account` con usuario real (`TestPilot`) → `200 OK` y vinculación exitosa
- ✅ Sin errores `ReferenceError` ni `500` en consola
- ✅ Sin errores de `google_id` en logs de Fly.io

#### Documentación Adicional

Detalle completo del incidente en `docs/incidentes/HALL-059-HALL-060-HALL-061.md`.

#### 🎯 Entregable

Rama `main` con commits mergeados. Deploy exitoso `deployment-01M2SB9K4EASK5ZDNRKW171NYK`.

---

## 📌 [4.0.3] - 2026-09-17

### 🚨 Hotfix — HALL-059: Inconsistencia de Claves en Vinculación Google OAuth

#### Objetivo Cumplido

Resolver el fallo reportado en el flujo de vinculación de cuentas Google (`/link-account`), donde aparecía un error `404` en consola sobre `/api/auth/link-account`. Tras auditoría exhaustiva, se determinó que el backend **nunca estuvo roto** y el problema real era doble:

1. Inconsistencia de claves en `localStorage` (`auth_token` vs `authToken`).
2. Falso positivo de `404` por caché obsoleta del Service Worker (`v3.9.8`).

#### Descripción del Incidente

**Síntoma reportado:** Error `Failed to load resource: the server responded with a status of 404 ()` en la consola del navegador durante el flujo de vinculación de cuentas Google OAuth (`/link-account`).

**Diagnóstico:**
- Endpoint backend `POST /api/auth/link-account`: ✅ **FUNCIONAL**.
- Frontend `link-account.html`: ❌ **BUG** en claves de `localStorage`.
- Service Worker `sw.js`: ⚠️ **Caché obsoleta** causando 404 en recursos.

#### Archivos Modificados

| Archivo | Cambio |
|---|---|
| `link-account.html` | Token guardado como `authToken`; eliminado paso de token por URL; uso de `window.apiLinkAccount()` |
| `js/api.js` | Nueva función `apiLinkAccount(payload)` centralizada |
| `sw.js` | `CACHE_NAME` actualizado `v3.9.8` → `v4.0.3` |

#### Verificación

- ✅ Backend sin cambios (endpoint intacto y funcional).
- ✅ Clave `authToken` estandarizada en 5 archivos.
- ✅ Token eliminado de URLs (mejora de seguridad).
- ✅ Smoke test en producción: `/health` → `200 OK`.
- 🔄 Pendiente prueba end-to-end con usuario real.

#### 🎯 Entregable

Rama `hotfix/hall-059-link-account` con commits:
- `fix(hall-059): estandarizar claves localStorage en link-account.html`
- `feat(api): agregar apiLinkAccount() como helper centralizado`
- `chore(sw): bump cache version v3.9.8 → v4.0.3`
- `docs(hall-059): documentar incidente en FIXES_APPLIED y CHANGELOG`

---

## 📌 [Fase 3] - 2026-09-17

### 🔧 Consistencia de Lógica de Negocio — 9 hallazgos resueltos + 2 derivados

#### Objetivo Cumplido

Resolver inconsistencias en la lógica de negocio, eliminar fuentes de verdad duales y reforzar la jerarquía militar en los controladores del backend. Cerrar la brecha de reproducibilidad de Fase 2.

#### Hallazgos Resueltos

| Hallazgo | Descripción | Commit |
|---|---|---|
| HALL-053 | Cuota ADMIN actualizada de 3 → 5 (decisión del OWNER) | `5c7bfc1` |
| HALL-054 | Constante centralizada `ROLE_LIMITS` | `5c7bfc1` |
| HALL-013 | Validación de jerarquía en `savePerformance` | `20e02cb` |
| HALL-028 | Validación estricta de `user_id` en `PerformanceSchema` | `77ebba8` |
| HALL-024 | Race condition resuelta con secuencia PostgreSQL | `e4fa2d5` |
| HALL-025 | `getNextUserId` lanza excepción en error (antes: `return 1`) | `e4fa2d5` |
| HALL-044 | Validación tipada en `getSettings` / `updateSettings` | `b1f9c71` |
| HALL-045 | `onConflict: 'user_id'` en upsert de settings | `b1f9c71` |
| HALL-050 | Sincronización de valores m1-m10 en `DEPLOYMENT_STATE.md` | `d69d363` |
| HALL-051 | Verificado: `Expert Cannons` ya presente en `TRAITS_ES` | (no requería cambio) |
| HALL-052 | Alineación del schema `plane_upgrades` con producción | `968e34f` |

#### Hallazgos Derivados (descubiertos durante Fase 3)

| Derivado | Descripción | Commit |
|---|---|---|
| FK `user_settings` | FK mal apuntada a `auth.users` corregida a `public.users` | `b1f9c71` |
| Schema `plane_upgrades` | 6 bugs en `sql/023_upgrades_2_0.sql` corregidos (columna fantasma, FK rota, índices inexistentes, CHECK faltantes) | `968e34f` |

#### Archivos SQL Versionados

- ➕ `sql/025_user_id_sequence.sql` — Secuencia atómica `user_id_seq` + RPC `get_next_user_id()` (HALL-024/025)
- ➕ `sql/026_fix_user_settings_fk.sql` — Corrección de FK a `public.users` (HALL-044 derivado)
- ✏️ `sql/023_upgrades_2_0.sql` — Alineado con producción (eliminadas columnas fantasma, CHECK constraints agregados, secuencia explícita)

#### Archivos de Código Modificados

| Archivo | Cambio |
|---|---|
| `src/controllers/admin.controller.js` | Constante `ROLE_LIMITS` + cuota ADMIN 5 + mensajes dinámicos |
| `src/controllers/performances.controller.js` | Validación de jerarquía en `savePerformance` |
| `src/controllers/settings.controller.js` | Validación tipada UUID/INTEGER + `onConflict` + resolución de UUID real |
| `src/utils/schemas.js` | Validación estricta de `user_id` en `PerformanceSchema` |
| `src/utils/security.js` | `getNextUserId` refactorizado para usar RPC atómica |
| `DEPLOYMENT_STATE.md` | Valores de mods m1-m10 sincronizados con la Wiki oficial |

#### Verificación en Producción

- ✅ **Deploy a Fly.io exitoso** (2 máquinas, rolling strategy, sin downtime, 60 MB de imagen).
- ✅ **Smoke test 8/8 PASS:**
  - Dashboard `GET /api/dashboard/summary` → OK
  - Settings `GET/PUT /api/settings` → OK (persistencia verificada)
  - Admin `GET /api/admin/users` → 61 usuarios (28 activos, 33 inactivos)
  - Admin `GET /api/admin/users/inactive` → 33 inactivos
  - Performances `GET /api/performances/pilots` → 28 pilotos
- ✅ **Tests locales previos:**
  - `PerformanceSchema`: 8/8 casos PASS (4 válidos, 4 inválidos)
  - `getNextUserId` integrado: devolvió `1007` (tipo `number`)
  - `settings` upsert: UUID resuelto + upsert + verificación de no-duplicados

#### ✅ Criterios de Cierre Cumplidos

- ✅ HALL-013: Validación de jerarquía en `savePerformance`.
- ✅ HALL-024: Race condition eliminada por diseño (secuencia atómica).
- ✅ HALL-025: Excepción en lugar de `return 1`.
- ✅ HALL-028: Validación estricta de `user_id`.
- ✅ HALL-044: Validación tipada en settings.
- ✅ HALL-045: `onConflict` especificado.
- ✅ HALL-050/051/052: Documentación sincronizada.
- ✅ HALL-053/054: Cuota ADMIN 5 + constante centralizada.
- ✅ Smoke test en producción (8/8 PASS).
- ✅ Deploy exitoso sin downtime.

### 🎯 Entregable

Rama `feature/business-logic-consistency` mergeada a `main` (fast-forward) y desplegada en producción.

Commits de Fase 3:
- `5c7bfc1` — HALL-053/054: ROLE_LIMITS + cuota ADMIN 5
- `20e02cb` — HALL-013: jerarquía en savePerformance
- `77ebba8` — HALL-028: validación user_id en PerformanceSchema
- `e4fa2d5` — HALL-024/025: secuencia PostgreSQL atómica
- `b1f9c71` — HALL-044/045: settings tipado + onConflict + FK fix
- `d69d363` — HALL-050: sincronización de mods
- `968e34f` — HALL-052: alineación de plane_upgrades

**Total:** 7 commits, 9 archivos modificados, 215 inserciones, 66 eliminaciones.

---

## 📌 [Fase 3.1] - 2026-09-17

### 🚨 Hotfix de Seguridad — HALL-055 (Incidente GitGuardian)

#### Objetivo Cumplido

Atender, diagnosticar y contener una alerta externa de GitGuardian sobre "SMTP credentials" expuestas en el repositorio público. Se determinó que se trató de un **cuasi-falso positivo** (variables públicas de Supabase en un `.env` histórico), sin exposición real de credenciales sensibles.

#### Descripción del Incidente

El 2026-09-16 a las 16:37 UTC, GitGuardian envió una alerta automática indicando la detección de credenciales SMTP expuestas en el repositorio público `paraguayffaametalstorm-debug/ffaa-paraguay-classic`.

#### Diagnóstico Forense

| Aspecto | Resultado |
|---|---|
| **Commit origen** | `f5fd20e` ("Agregar variables de entorno para Supabase", 2026-09-01) |
| **Commit de eliminación** | `3006ac4` (mismo día, 2026-09-01) |
| **Variables filtradas** | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` |
| **Naturaleza** | 🟢 Públicas por diseño (prefijo `VITE_` = bundle frontend) |
| **Credenciales SMTP reales** | ❌ NO filtradas (el SMTP se implementó en v3.4.0, 2026-09-07) |
| **Credenciales de servicio** | ❌ Ninguna filtrada (`SERVICE_ROLE_KEY`, `JWT_SECRET`, `GOOGLE_CLIENT_SECRET`, etc.) |
| **RLS en Supabase** | ✅ 22/22 tablas con `rls_enabled = true` |
| **Accesibilidad actual** | ❌ No alcanzable desde ninguna rama activa |
| **Riesgo operativo real** | 🟢 Nulo |

#### Acciones de Contención Aplicadas

1. **Rotación preventiva de credenciales SMTP:**
   - Eliminadas las 2 app passwords antiguas (`PARAGUAY-FFAA` del 08/09 y `PARAGUAY-FFAA-SMTP` del 15/09).
   - Generada nueva app password `METALSTORM-SMTP-v4.0.1` (16/09).
   - Secret `EMAIL_PASS` actualizado en Fly.io (digest `52013d91530dc60e`, estado `Deployed`).

2. **Limpieza de ramas obsoletas:**
   - Eliminadas las ramas locales y remotas `feature/sql-migrations` y `feature/business-logic-consistency` (ambas mergeadas a `main`).

3. **Verificación funcional post-contención:**
   - `curl https://paraguay-ffaa-metalstorm.fly.dev/health` → `OK`.
   - Login OAuth del OWNER funcionando.
   - Rotación de app passwords de Gmail operativa.
   - Sin errores nuevos en logs de producción.

#### Acciones de Prevención

- ✅ `.gitignore` verificado: incluye `.env` y `.env.*`.
- ✅ `.env.example` solo contiene placeholders (nunca valores reales).
- ✅ Política de despliegue refrendada: los secrets viven exclusivamente en Fly.io, nunca en el repositorio.
- ✅ Rotación preventiva de app passwords de Gmail ejecutada como buena práctica de higiene.

#### Lecciones Aprendidas

1. **Nunca commitear `.env`:** Aunque las variables `VITE_*` son públicas por diseño, el `.env` nunca debe versionarse.
2. **Confiar pero verificar:** Las alertas automáticas de terceros requieren validación manual. En este caso, la etiqueta "SMTP credentials" era incorrecta.
3. **RLS es la última línea de defensa:** Aunque la `ANON_KEY` se filtre, RLS en Supabase garantiza que no haya exfiltración de datos.
4. **Rotación preventiva no hace daño:** Es una práctica de bajo costo y alto beneficio.

#### ✅ Criterios de Cierre Cumplidos

- ✅ Incidente diagnosticado como cuasi-falso positivo.
- ✅ Credenciales SMTP rotadas preventivamente.
- ✅ Secret `EMAIL_PASS` activo en Fly.io.
- ✅ Ramas obsoletas eliminadas.
- ✅ RLS verificado: 22/22 tablas protegidas.
- ✅ App 100% funcional en producción.
- ✅ Documentación de HALL-055 en `FIXES_APPLIED.md`.

#### 🎯 Entregable

Documentación completa del incidente en `FIXES_APPLIED.md` (bloque HALL-055). Sin cambios de código de producción.

**Hallazgo:** HALL-055 (incidente externo, no relacionado con la auditoría original de 52 hallazgos).

**Rama:** `feature/security-secondary`.

---


## 📌 [Fase 4] - 2026-09-17

### 🔐 Seguridad Secundaria — 8 hallazgos resueltos

#### Objetivo Cumplido

Cerrar los hallazgos de seguridad de severidad MEDIA de la auditoría, reforzando la superficie de ataque restante: protección de endpoints de escritura, rate limiting, decisión de política público/privado en endpoints GET, y persistencia + sanitización de backups del OWNER.

#### Hallazgos Resueltos

| Hallazgo | Descripción | Commit |
|---|---|---|
| HALL-004 | `/register` protegido con `requireAuth` + `requireRole('ADMIN', 'OWNER')` | `20934e2` |
| HALL-009 | `authLimiter` aplicado a `/register` | `20934e2` |
| HALL-018 | Catálogo público `/api/planes/catalog/*` — decisión: **mantener público** (data del juego) | `16d64f0` |
| HALL-019 | 5 endpoints GET de BM ahora requieren `requireAuth` | `16d64f0` |
| HALL-034 | 2 endpoints GET de plane-models ahora requieren `requireAuth` | `16d64f0` |
| HALL-033 | `/api/presence/active` ahora requiere `requireAuth` | `a781cb3` |
| HALL-036 | Backups del OWNER persistidos en Supabase (antes: en memoria) | `e02d2a3` |
| HALL-037 | Sanitización ampliada de PII en backups | `e02d2a3` |

#### Decisiones de Arquitectura

**Política público/privado en endpoints GET:**

- **Públicos (data del juego, sin info del escuadrón):**
  - `GET /api/planes/catalog/plane-models` — catálogo oficial de 44 aviones.
  - `GET /api/planes/catalog/plane-mods` — 10 mods oficiales.
  - `GET /api/planes/plane-models` (alias).
  - `GET /api/planes/plane-mods` (alias).

- **Privados (requieren autenticación):**
  - `GET /api/plane-models/` y `GET /api/plane-models/:id` (catálogo administrativo con `?include_inactive=true`).
  - `GET /api/bm/events`, `/events/active`, `/events/:id`, `/stats`, `/leaderboard` (info interna del escuadrón).
  - `GET /api/presence/active` (contador de pilotos en línea).
  - `GET /api/owner/backup/list` (solo OWNER).

**Sanitización de backups:**

- **Campos eliminados por completo:** `password_hash`, `password`, `token_version`, `google_id`, `google_linked`.
- **Campos ofuscados parcialmente:** `email` → `p***@dominio.com`, `phone` → `+595***3456`, `email_institucional`, `email_personal`.
- **Preservado:** `nick`, `role`, `status`, `user_id`, `id`, timestamps.

#### Infraestructura Nueva

- ➕ `sql/027_backups_table.sql` — Tabla `backups` con JSONB, hash SHA-256, RLS `no_public_access`, índices en `created_at DESC` y `created_by`.
- **Política de retención:** máximo 30 backups, auto-prune de los más antiguos.
- **Endpoints nuevos:**
  - `GET /api/owner/backup/download/:id` — descarga el JSON con verificación de hash.
  - `DELETE /api/owner/backup/:id` — eliminación manual.
- **Auditoría:** eventos `BACKUP_CREATED`, `BACKUP_DOWNLOADED`, `BACKUP_DELETED` en `audit_logs`.

#### Archivos Modificados

| Archivo | Cambio |
|---|---|
| `src/routes/auth.routes.js` | Import de `requireRole` + `/register` protegido |
| `src/routes/plane-models.routes.js` | 2 endpoints GET con `requireAuth` |
| `src/routes/bm.routes.js` | 5 endpoints GET con `requireAuth` |
| `src/routes/presence.routes.js` | `/active` con `requireAuth` |
| `src/controllers/owner.controller.js` | Refactor completo: persistencia + sanitización + hash + endpoints nuevos |
| `src/routes/owner.routes.js` | 2 endpoints nuevos para backups |

#### Verificación en Producción

- ✅ **Deploy a Fly.io exitoso** (2 deploys incrementales: `deployment-01M2PQRWCB7TF2KQGRBSW0SEX3` y `deployment-01M2PSC0HFJ7HBQE34SY9AA4XE`).
- ✅ **Smoke test 7/7 PASS:**
  - `GET /health` → `200`
  - `GET /api/owner/backup/list` sin auth → `401`
  - `POST /api/owner/backup/run` sin auth → `401`
  - `GET /api/presence/active` sin auth → `401`
  - `GET /api/plane-models/` sin auth → `401`
  - `GET /api/bm/leaderboard` sin auth → `401`
  - `GET /api/catalog/plane-models` público → `200`
- ✅ **Tests locales sin token:** 9 endpoints probados → todos `401` correctamente.
- ✅ **Sin regresiones:** catálogo público sigue accesible, login OAuth funcional.

#### Criterios de Cierre Cumplidos

- ✅ HALL-004: `/register` protegido con auth + role.
- ✅ HALL-009: `authLimiter` aplicado.
- ✅ HALL-018: Decisión documentada (público).
- ✅ HALL-019: 5 endpoints BM protegidos.
- ✅ HALL-034: 2 endpoints plane-models protegidos.
- ✅ HALL-033: `/active` protegido.
- ✅ HALL-036: Backups persistidos en Supabase.
- ✅ HALL-037: Sanitización ampliada de PII.
- ✅ Smoke test 7/7 PASS en producción.
- ✅ Deploy sin downtime.

### 🎯 Entregable

Rama `feature/security-secondary` con 5 commits mergeada a `main`.

Commits de Fase 4:
- `20934e2` — HALL-004/009: `/register` + rate limiting
- `16d64f0` — HALL-018/019/034: política público/privado
- `a781cb3` — HALL-033: `/api/presence/active` protegido
- `e02d2a3` — HALL-036/037: backups persistentes + sanitización PII

**Total:** 5 commits (incluye `facb3ae` de Fase 3.1), 8 hallazgos resueltos, ~50 archivos afectados.

---


## 📌 [Fase 2] - 2026-09-16

### 🗄️ Infraestructura como Código — HALL-048 resuelto

#### Objetivo Cumplido

Versionar el esquema completo de las 22 tablas activas de Supabase en el repositorio, permitiendo recrear la base de datos desde cero.

#### Acciones Ejecutadas

- **Dump de referencia:** Creado `sql/000_full_schema_dump.sql` (índice de las 22 tablas con columnas clave y punteros a archivos individuales). Commit `41fda3b`.
- **Reorganización de `sql/`:** 4 archivos existentes renombrados con prefijos numéricos y archivo obsoleto movido a `sql/legacy/`. Commit `7918b22`.
- **22 archivos DDL creados** (`001_users.sql` a `022_bm_discounts.sql`): Cada tabla del schema `public` tiene su archivo de migración idempotente. Commits `d0d0af7` → `eb5255b`.
- **Guía de migraciones:** Creado `sql/README.md` con índice completo, orden de ejecución y procedimiento de recreación. Commit `04d42e7`.
- **Documentación de despliegue:** Añadida sección 5.1 en `DEPLOYMENT_GUIDE.md` con procedimiento de recreación desde cero. Commit `e730291`.

#### Estructura Final de `sql/`
sql/
├── 000_full_schema_dump.sql # Índice de referencia
├── 001_users.sql # Padrón militar
├── 002_performances.sql # Rendimiento semanal
├── 003_events.sql # Eventos operativos
├── 004_normativas.sql # Reglamentos
├── 005_plane_models.sql # Catálogo de 44 modelos
├── 006_plane_mods.sql # 10 mods oficiales
├── 007_mod_effects.sql # 50 efectos de mods
├── 008_planes.sql # Hangar personal
├── 009_plane_upgrades.sql # Auditoría de mejoras
├── 010_upgrade_nodes_v2.sql # Árbol Starform 2.0
├── 011_upgrade_effects.sql # Efectos de upgrades
├── 012_upgrade_effects_history.sql # Historial de efectos
├── 013_password_resets.sql # Tokens de reset (15 min)
├── 014_recovery_codes.sql # Códigos de recuperación
├── 015_user_settings.sql # Preferencias
├── 016_security_events.sql # Eventos de seguridad
├── 017_audit_logs.sql # Auditoría administrativa
├── 018_error_logs.sql # Logs de errores
├── 019_bm_events.sql # BM - Eventos
├── 020_bm_missions.sql # BM - Misiones
├── 021_bm_progress.sql # BM - Progreso
├── 022_bm_discounts.sql # BM - Descuentos
├── 023_upgrades_2_0.sql # Migración compuesta Upgrades 2.0
├── 024_fix_users_null_user_id.sql # Fix de datos
├── README.md # Guía completa
└── legacy/
└── updates_v3.4.0.sql # (Histórico, no ejecutar)

text

#### ✅ Criterios de Cierre Cumplidos

- ✅ Dump completo del esquema generado (índice de las 22 tablas).
- ✅ 22 archivos `.sql` creados (uno por tabla).
- ✅ `sql/013_password_resets.sql` integrado (HALL-030).
- ✅ `sql/README.md` documentado con guía completa.
- ✅ `DEPLOYMENT_GUIDE.md` actualizado con sección 5.1.
- ✅ Archivos obsoletos movidos a `sql/legacy/`.

#### ⚠️ Tareas Pendientes Documentadas

- **Rediseño BM:** Las tablas `bm_*` están marcadas con `TODO: REDISEÑO BM PENDIENTE`. El módulo Black Market se reescribirá en una fase posterior.
- **Bug de tipos en `023_upgrades_2_0.sql`:** La FK `plane_upgrades.user_id INT REFERENCES users(id)` apunta a `users.id` (que es UUID). Debe corregirse en Fase 3.
- **Verificación funcional:** Pendiente ejecutar los 24 archivos en un proyecto Supabase de prueba para validar la idempotencia y la recreación completa.

#### 🎯 Entregable

Rama `feature/sql-migrations` con 9 commits:
- `41fda3b` — dump de referencia
- `7918b22` — reorganización de `sql/`
- `d0d0af7` — DDL 001-004
- `b74ba6b` — DDL 005-008
- `1a7ef90` — DDL 009-012
- `de0bd4f` — DDL 014-018
- `eb5255b` — DDL 019-022
- `04d42e7` — `sql/README.md`
- `e730291` — `DEPLOYMENT_GUIDE.md`

---

## 📌 [Fase 1] - 2026-09-16

### 🛡️ Seguridad Crítica — 6 hallazgos resueltos

#### HALL-001 (definitivo) — Eliminación del fallback de JWT_SECRET

- **Archivo:** `src/config/env.js`
- **Commit:** `8215fcb`
- **Acción:** Eliminado el fallback hardcodeado `'ffaa_pry_metalstorm_jwt_super_secret_key_2026'`.
- **Validación:** El servidor **aborta** si `NODE_ENV=production` y `JWT_SECRET` está vacío.
- **Verificación:** Test local con `NODE_ENV=production` sin JWT_SECRET → servidor no arranca.

#### HALL-022 — Validación de jerarquía en reset-password

- **Archivo:** `src/routes/admin.routes.js`
- **Commit:** `2fdb862`
- **Acción:** 4 validaciones de jerarquía en `POST /users/:userId/reset-password`:
  - Auto-reseteo bloqueado (`SELF_RESET_FORBIDDEN`).
  - OWNER protegido de reseteo por otros (`OWNER_PROTECTED`).
  - ADMIN no puede resetear a otro ADMIN ni a OWNER (`HIERARCHY_FORBIDDEN`).
- **Metadatos:** Se registra `target_role` en `security_events`.
- **Verificación:** Test funcional pasado (OWNER resetea MIEMBRO → OK; ADMIN intenta resetear OWNER → 403).

#### HALL-016 — Columna `rutas_sistemas` en `planes`

- **Archivos:** `sql/upgrades_2_0.sql` + Supabase
- **Commits:** `edadf11` + `ba4ff8a`
- **Acción:** Añadida columna `rutas_sistemas JSONB DEFAULT '{}'::jsonb`.
- **Verificación:** Columna creada en Supabase; 121+ aviones migrados con default `{}`.

#### HALL-002 — CORS restringido a whitelist estricta

- **Archivo:** `server.js`
- **Commit:** `5ba274b`
- **Acción:** Reemplazada la lógica permisiva (`.endsWith()`, `.includes()`) por validación estricta contra `ENV.ALLOWED_ORIGINS`.
- **Eliminado:** Permisividad para cualquier `.fly.dev`, `.run.app`, `.google.com`, `localhost.*`, `127.0.0.1.*`.
- **Verificación:** Test funcional pasado (login desde `paraguay-ffaa-metalstorm.fly.dev` → OK).

#### HALL-003 — Helmet con `frameguard` + `contentSecurityPolicy`

- **Archivo:** `server.js`
- **Commits:** `bb8cb9b` + `840168f`
- **Acción:** Activados `frameguard` y `contentSecurityPolicy` con directivas específicas:
  - `script-src`, `style-src`, `font-src`, `img-src`, `connect-src`, `frame-src`, `frame-ancestors`, `worker-src`.
  - `img-src` simplificado a `'self' data: blob: https:` tras iteración (imágenes de cualquier CDN HTTPS).
- **Verificación:** App funcional end-to-end (24 aviones, 3072 nodos, imágenes, iconos, PWA).

#### HALL-023 — Eliminación de `tls.rejectUnauthorized: false`

- **Archivo:** `src/utils/email.js`
- **Commit:** `acd7cef`
- **Acción:** Eliminada la línea `tls: { rejectUnauthorized: false }` del transporter Nodemailer.
- **Verificación:** SMTP Gmail sigue funcionando (certificados válidos).
- **Impacto:** Sin riesgo de MITM en el canal SMTP.

---

### ✅ Criterios de Cierre Cumplidos

- ✅ HALL-001: Fallback eliminado. Servidor no arranca sin JWT_SECRET en producción.
- ✅ HALL-022: Jerarquía validada en reset-password.
- ✅ HALL-016: Columna `rutas_sistemas` creada y funcional.
- ✅ HALL-002: CORS restringido a lista blanca.
- ✅ HALL-003: Helmet con `frameguard` y CSP activos.
- ✅ HALL-023: `tls.rejectUnauthorized` eliminado.
- ✅ Smoke test pasado (login, navegación, imágenes, sin errores de CSP/CORS).
- ✅ Deploy exitoso en Fly.io.
- ✅ Monitoreo en producción sin errores nuevos.

### 🎯 Entregable

Rama `feature/security-critical-fixes` mergeada a `main` y desplegada en producción.
Commit final: `840168f`.

---


## 📌 [Fase 0.3] - 2026-09-16

### 📢 Comunicación al Escuadrón

Se envió comunicado oficial al Comando Central y miembros del escuadrón
informando el inicio del ciclo de mejoras técnicas (Plan de Mejora
Continua v1.0).

**Canales utilizados:** WhatsApp y/o Discord oficial del escuadrón.

**Impacto operativo informado:**
- Reinicio único del servicio (ya ejecutado).
- Reautenticación única de usuarios.
- Sin cambios visibles en funcionalidad.

---


## 📌 [Fase 0.2] - 2026-09-16

### 🔍 Verificación de Jerarquía y Decisión de Negocio (ADMIN max 5)

#### 📊 Estado detectado en Supabase

| Rol | Cantidad | Límite Documentado | Estado |
|---|---|---|---|
| OWNER | 1 | 1 | ✅ OK |
| ADMIN | 5 | 3 | 🔴 EXCEDIDO |
| VETERANO | 6 | 8 | ✅ OK |

#### 🔍 Análisis

- Los 5 ADMIN (ASTARTES, FURTIVO, GENNOMAX, RUBEN, BARBA19) fueron creados el **2026-02-16**, mismo día que el OWNER (PJPIROVANI).
- Todos están ACTIVE, sin modificaciones posteriores (`updated_at` = `created_at`).
- **Conclusión:** la regla "máximo 3 ADMIN" documentada en v3.1.0 nunca se aplicó operativamente. Los 5 ADMIN son staff fundacional.

#### 🎯 Decisión del OWNER (Comandante PJPIROVANI)

**Actualizar la cuota de ADMIN: de 3 a 5.**

**Justificación:**
- Los 5 ADMIN son staff fundacional operativamente necesario.
- El límite de 3 era arbitrario y no reflejaba la estructura real del escuadrón.
- Decisión oficial registrada en este changelog.

**Límites finales confirmados:**
- OWNER: 1
- ADMIN: 5 (actualizado desde 3)
- VETERANO: 8

#### 🐛 Hallazgos derivados

- **HALL-053** — Cuota de ADMIN inconsistente entre documentación y realidad.
- **HALL-054** — Límites de roles hardcodeados en múltiples ubicaciones de `admin.controller.js` sin constante centralizada.

Ambos se resolverán en **Fase 3 — Consistencia de Lógica de Negocio**.

---


## 📌 [Fase 0.1] - 2026-09-16

### 🔒 Contención de Emergencia — Mitigación Parcial de HALL-001

#### 🛡️ Configuración de JWT_SECRET en Fly.io

- **Hallazgo abordado:** HALL-001 — JWT_SECRET Fallback Hardcodeado (mitigación parcial).
- **Acción ejecutada:** `fly secrets set JWT_SECRET="$(openssl rand -base64 48)" -a paraguay-ffaa-metalstorm`
- **Valor generado:** 48 bytes aleatorios en base64.
- **Digest Fly.io:** `c851b45ed89bc61e` (estado: `Deployed`).
- **Rolling deploy:** 2/2 máquinas actualizadas sin downtime.
- **Verificación:** Health check `servicecheck-00-http-3000` passing, Supabase Diagnostic OK, logs sin errores.
- **Impacto operativo:** Tokens JWT previos invalidados. Los usuarios deberán iniciar sesión nuevamente (una sola vez).
- **Rollback:** `fly secrets unset JWT_SECRET -a paraguay-ffaa-metalstorm` (⚠️ NO recomendado).
- **Contexto:** Inicio del Plan de Mejora Continua v1.0. Fix definitivo agendado en Fase 1, Tarea 1.1.

---

## 📌 [4.0.0] - 2026-09-16

### 🛡️ Sistema Táctico Integral de Gestión de Pilotos Inactivos (Fases A, B y C)

#### 🗄️ Migración de Base de Datos (Supabase PostgreSQL)
- **3 columnas nuevas en tabla `users`:**
  - `inactive_reason` (`TEXT`, `NULL`): Motivo oficial de la baja/inactivación.
  - `inactive_by` (`UUID`, `NULL`, FK a `users.id` con `ON DELETE SET NULL`): Identificador del oficial de mando que ejecutó la baja.
  - `inactive_at` (`TIMESTAMPTZ`, `NULL`): Timestamp exacto de la inactivación.
- Al reactivar a un piloto (`status = 'ACTIVE'`), estos tres campos se limpian a `NULL`.

#### ⚙️ FASE A (Backend — Commit `d4a3881`)
- **`src/controllers/admin.controller.js`:**
  - `updateUserStatus()` actualizado para recibir `{ status, reason }`:
    - Valida motivo obligatorio al inactivar (10 a 500 caracteres; código de error `REASON_REQUIRED` o `REASON_TOO_LONG`).
    - Permite motivo opcional al reactivar (máximo 300 caracteres).
    - Persiste `inactive_reason`, `inactive_by` (`req.user.id`) y `inactive_at` (`NOW()`) en Supabase al inactivar.
    - Limpia los 3 campos a `NULL` al reactivar.
    - Jerarquía de permisos estricta: `OWNER` puede modificar a cualquier usuario excepto a sí mismo (`SELF_MODIFICATION_FORBIDDEN`); `ADMIN` solo puede modificar a `MIEMBRO` y `VETERANO` (`HIERARCHY_FORBIDDEN`).
    - Registra con redundancia en `audit_logs` (`USER_DEACTIVATED` / `USER_ACTIVATED`) y `security_events`.
    - Retrocompatibilidad asegurada: si no se envía `reason`, asigna `"Sin motivo especificado"`.
  - `getInactiveUsers()`: nuevo controlador que retorna exclusivamente pilotos con `status = 'INACTIVE'`, ordenados por `inactive_at DESC` y `updated_at DESC`, resolviendo `inactive_by_nick` en batch.
  - `updateInactiveReason()`: nuevo controlador para completar o corregir el motivo de pilotos inactivos (requiere 10 a 500 caracteres, registra `USER_INACTIVE_REASON_UPDATED` en auditoría).
  - `getUsers()`: ampliado para proyectar `inactive_reason`, `inactive_by`, `inactive_at` y resolver `inactive_by_nick` en batch.
- **`src/routes/admin.routes.js`:**
  - Nueva ruta `GET /users/inactive` (protegida por `requireAuth` y `requireRole(['ADMIN', 'OWNER'])`).
  - Nueva ruta `PATCH /users/:id/inactive-reason` (protegida por `requireAuth` y `requireRole(['ADMIN', 'OWNER'])`).
- **`src/middlewares/auth.js`:**
  - `requireAuth` optimizado para consultar primero `users.inactive_reason`, `users.inactive_by` y `users.inactive_at`.
  - Fallback a `audit_logs` con columnas correctas (`target_id`, `actor_nick`) para inactivos históricos con campos `NULL`.
  - Retorna 403 enriquecido con objeto `details: { inactive_by, inactive_at, inactive_reason, contact }`.

#### 🖥️ FASE B (Frontend — Commit `b1023fd`)
- **`components/admin-panel.html`:**
  - Pestañas tácticas de filtrado de dotación: `🟢 Activos`, `🔴 Inactivos` y `📋 Todos` con contadores dinámicos `#tabActiveCount`, `#tabInactiveCount`, `#tabAllCount`.
  - Modal táctico de inactivación `#inactivateUserModal` con selector de causas predefinidas (Baja temporal, Bajo rendimiento, Inactividad prolongada, Expulsión disciplinaria, Renuncia voluntaria), campo de texto libre obligatorio y contador de caracteres en vivo (10/500).
  - Modal táctico de reactivación `#reactivateUserModal` con textarea opcional de motivo y contador (0/300).
  - Modal `#completeReasonModal` para regularizar motivos en inactivos históricos.
- **`js/views.js`:**
  - Estado de pestaña activa `currentMembersTab` (`'all'`, `'active'`, `'inactive'`) y función `switchMembersTab()`.
  - `filterMembers()` actualizado para aplicar primero el filtro de pestaña de estado y luego los filtros combinados existentes.
  - `renderAdminMembersTable()` enriquecido con columnas dinámicas para la pestaña de inactivos: *"Motivo de Baja"* (con truncado a 60 caracteres, tooltip y botón `✏️ Completar` si no tiene motivo) e *"Inactivado por"* (indicativo del comandante y fecha/hora `DD/MM/YYYY HH:mm`).
  - Funciones tácticas `promptInactivateUser()`, `confirmInactivateUser()`, `promptReactivateUser()`, `confirmReactivateUser()`, `promptCompleteReason()`, `confirmCompleteReason()`.
  - `changeUserStatus()` frontend actualizado para aceptar 4to parámetro `reason` y consumir modales tácticos con fallback seguro a `confirm()`.
- **`js/api.js`:**
  - Integración de llamada a `PATCH /api/admin/users/:id/inactive-reason` y soporte de motivo en `changeUserStatus()`.

#### 📚 FASE C (Documentación y Limpieza)
- **Depuración de código:**
  - Eliminación de función redundante `changeUserStatus` y export `window.changeUserStatus` en `js/api.js`.
  - Eliminación de asignación residual `window.currentMembersTab` en `js/views.js`.
- **Nueva directiva oficial:**
  - Creación de `POLITICA_INACTIVACION.md` con las 12 secciones normativas reglamentarias.
- **Actualización de documentación:**
  - Sincronización completa de los 9 manuales y guías del repositorio a la versión v4.0.0.

---

## 📌 [3.9.9] - 2026-09-15

### 🔐 Flujo de Recuperación de Contraseña por Email & Mensaje Enriquecido de Inactivos

#### 🔐 Recuperación de Contraseña por Email (Forgot Password)

- **Tabla `password_resets` creada en Supabase:**
  - Esquema: `id` (UUID PK), `user_id` (UUID FK a `users.id` con `ON DELETE CASCADE`), `token` (TEXT UNIQUE), `expires_at` (TIMESTAMPTZ), `used` (BOOLEAN default `false`), `created_at` (TIMESTAMPTZ default `now()`).
  - Índices: `idx_password_resets_token`, `idx_password_resets_user_id`, `idx_password_resets_expires_at`, `idx_password_resets_used`.
  - RLS habilitado con política `no_public_access` (solo `service_role` puede leer/escribir).
- **SMTP Gmail configurado en Fly.io:**
  - Cuenta emisora: `paraguayffaa.metalstorm@gmail.com`.
  - Secrets configurados: `EMAIL_HOST` (`smtp.gmail.com`), `EMAIL_PORT` (`587`), `EMAIL_SECURE` (`false`), `EMAIL_USER`, `EMAIL_PASS` (contraseña de aplicación de 16 caracteres), `EMAIL_FROM`.
  - Contraseña de aplicación guardada en Bitwarden.
- **Flujo de reset operativo end-to-end:**
  - `POST /api/auth/forgot-password`: genera token criptográfico (`crypto.randomBytes(32)`), calcula `expires_at = NOW() + 15 min`, inserta en `password_resets`, envía correo HTML militar C4ISR vía Nodemailer y registra `PASSWORD_RESET_REQUESTED` en `security_events`.
  - `POST /api/auth/reset-password`: valida token (`used = false` + vigencia), verifica complejidad de nueva contraseña, actualiza `password_hash`, incrementa `token_version` (+1), setea `must_change_password = false`, marca `password_resets.used = true` y registra `PASSWORD_RESET_SUCCESS`.
  - Correos se envían con diseño militar C4ISR (colores institucionales #0038A8, #D52B1E, #0B132B).
  - Token expira estrictamente a los 15 minutos.
- **Prueba end-to-end exitosa:**
  - `simulated: false` en respuesta del endpoint (SMTP funcionando).
  - Correo recibido con enlace funcional.
  - Reset completado: `token_version` incrementado de `1` a `2`, `used: true` en `password_resets`.

#### ⚠️ Limitación Crítica Documentada

- **Solo ~2% de los pilotos tienen Gmail real vinculado** (únicamente `PJPIROVANI`).
- El 98% restante tiene emails `@ffaa.py` ficticios que rebotan (el dominio no existe en internet).
- **Método principal de recuperación:** reset administrativo desde el Panel Admin (genera clave temporal `MS-XXXX-XXXX`).
- Campaña de vinculación de Gmail planificada a futuro.

#### 🔒 Mensaje Enriquecido al Bloquear Usuarios Inactivos

- **Cambio en `src/middlewares/auth.js`:**
  - Cuando un piloto con `status = 'INACTIVE'` intenta acceder, el backend devuelve un mensaje detallado.
  - Consulta `audit_logs` para obtener la última acción `USER_DEACTIVATED` o `USER_STATUS_CHANGE` sobre el usuario.
  - Extrae el `nick` del comandante y la fecha de inactivación.
  - Construye un mensaje con información de contacto al Comando Central.
- **Ejemplo de respuesta:**
  ```json
  {
    "error": "⚠️ ACCESO DENEGADO: Su cuenta ha sido inactivada por el Comandante [NICK] el [FECHA]. No tiene acceso a la plataforma del escuadrón. Comuníquese con el Comando Central para más información.",
    "code": "USER_INACTIVE",
    "details": {
      "inactive_by": "el Comandante [NICK]",
      "inactive_at": "2026-09-10T01:15:01.048Z",
      "contact": "comando.central@ffaa.py"
    }
  }
  ```
- **Fallback:** Si no existe registro en `audit_logs`, el mensaje dice genéricamente "el Comando Central".

#### 📚 Documentación Actualizada

- **`DEPLOYMENT_STATE.md`:** Documentadas las tablas `password_resets` y `upgrade_nodes_v2`. Corregidos esquemas de `normativas` (28 columnas), `error_logs` (`meta` en vez de `metadata`, `user_id`, `nick`). Formalizada la regla de FKs (UUID para BM/recovery/security/password_resets, INTEGER para planes/user_settings). Agregada columna `mod_effects.is_active`. Actualizado listado consolidado con conteos reales.
- **`ARCHITECTURE.md`:** Agregada sección §6.6 (Flujo completo de recuperación de contraseña por email), §6.7 (Mensaje enriquecido al bloquear inactivos), §6.8 (Limitación crítica del reset por email). Ampliada sección §5 con arquitectura de `upgrade_nodes_v2`.
- **`API_REFERENCE.md`:** Confirmados endpoints de recuperación operativos. Agregado código `USER_INACTIVE` al formato de errores.
- **`USER_MANUAL.md`:** Agregada subsección §1.5 con limitación del reset. Nueva §1.6 "Si tu cuenta fue inactivada". Ampliada §2.3 con `upgrade_nodes_v2`.
- **`CHANGELOG.md`:** Esta entrada.

#### ✈️ Catálogo y Hangar

- **`upgrade_nodes_v2` documentada:** Tabla con 3.072 filas, 13 columnas, catálogo maestro del árbol de mejoras Starform Upgrades 2.0.
- **`plane_mods` confirmada con 10 filas:** Los 10 mods tácticos oficiales están correctamente poblados en Supabase.

#### 🔧 Correcciones

- **Verificación de datos:** Corregido el conteo real de tablas tras falsos positivos de `pg_stat_user_tables`.

---

## 📌 [3.9.8] - 2026-09-15

### ✈️ Rediseño del Hangar Militar (Grid + Pantalla Dedicada) & Sistema i18n

- **Rediseño Integral del Hangar Militar:**
  - **Arquitectura de Doble Vista:**
    - **Vista 1 (Grid Táctico de Aeronaves):** Implementación de `overrideCarouselCardClick` para transformar la navegación de cazas en un grid interactivo de tarjetas tácticas, con acceso ágil y filtrado responsive.
    - **Vista 2 (Pantalla Dedicada / Detalle de Aeronave):** Función `openAircraftDetailView(planeId)` que activa la clase `.aircraft-detail-mode`.
    - **Botón de Retroceso al Hangar:** Inyección de botón `← VOLVER AL HANGAR` en la cabecera para regresar instantáneamente a la selección general.
    - **Accesos Directos a Upgrades 2.0:** Botones `IR A EDICIÓN DE [SECCIÓN]` que transportan al piloto directamente al modal de calibración de Fuselaje, Motor, Aviónica o Armamento.
    - **Renderizado Completo de Habilidades:** Corrección en el visor para actualizar las habilidades especiales y pasivas con imágenes oficiales y descripciones completas al recibir `/details`.
- **Sistema de Traducción Integral (i18n):**
  - **Columnas en Supabase (`plane_models`):** `descripcion_es`, `historia_es` y `recomendaciones_es` traducidas mediante **DeepL API**.
  - **Estrategia de Fallback en Frontend (`js/views.js`):** El cliente evalúa primero las columnas en español (`plane.historia_es || plane.historia`, `plane.descripcion_es || plane.descripcion`, `plane.recomendaciones_es || plane.recomendaciones`). Si no hay traducción disponible, recurre transparentemente al texto original en inglés.
  - **Traducción de 13 Traits Oficiales (`TRAITS_ES`):** Diccionario en cliente y helper `translateTrait(trait)` para traducir los 13 rasgos tácticos oficiales del simulador (Blindaje Reforzado, Motores Fríos, Altitud de Crucero, Ala Delta, Cañones Expertos, Autoridad Total, Dispara y Olvida, Ala Leal, Sigilo, Ala Variable, Inversor de Empuje, Cañones Inestables, Motores Inestables).
- **Consolidación del Catálogo:** Catálogo oficial normalizado con **44 modelos de combate** activos.
- **PWA / Service Worker:** Cache-busting y actualización de versión a `v3.9.8` (`PARAGUAY-FFAA-METALSTORM-v3.9.8`).

---

## 📌 [3.9.7] - 2026-09-14

### ⚡ Telemetría y Rendimiento de Vistas
- Optimización en la resolución de promesas en `getPlaneDetails`.
- Manejo mejorado de estado en el carrusel de aeronaves y preservación de selección activa.
- Ajustes en el scroll interno del modal de estadísticas y pantalla de detalle.

---

## 📌 [3.9.6] - 2026-09-13

### 🎯 Fix de Imágenes de Habilidades Especiales y Pasivas
- **Corrección en `openAircraftDeepModal`:** Las imágenes de habilidades (`especial_image_url`, `pasiva_image_url`) ahora se actualizan correctamente tras consultar `/details`, evitando caídas a iconos por defecto.
- Refuerzo de fallback visual con insignias SVG tácticas cuando una habilidad carece de icono externo.

---

## 📌 [3.9.5] - 2026-09-13

### 📱 Responsive Design y PWA Cache
- Ajustes en media queries del grid de cards tácticas para pantallas de ancho ultra-estrecho (<380px).
- Sincronización de activos cacheados en el Service Worker.

---

## 📌 [3.9.4] - 2026-09-13

### 🎯 Telemetría Balística de Armamento
- Mejora en la visualización de DPS, rango de retícula y tiempo de sobrecalentamiento de cañones y misiles.
- Desglose de tipos de guiado en loadout wiki (Heat-seeking, Radar, etc.).

---

## 📌 [3.9.3] - 2026-09-12

### ✈️ Consolidación de Flota (44 Cazas)
- Normalización en base de datos de los 44 modelos oficiales de combate.
- Sincronización de tipos de subsistemas disponibles por modelo (`sistemas_disponibles`).

---

## 📌 [3.9.2] - 2026-09-12

### 🎨 Mejoras en Galería de Paints y Canopies
- Ajuste del grid interno de pinturas y cabinas con badges de rareza militar.
- Visualización de requisitos de desbloqueo oficiales de la Wiki.

---

## 📌 [3.9.1] - 2026-09-12

### 🔧 Mods Oficiales + Cloudinary + Fix de Datos

- **Mods oficiales sincronizados:** Los 10 mods tácticos (`m1`-`m10`)
  ahora usan valores exactos de la Wiki de MetalStorm.
  - Corregidos `m1`, `m2`, `m3`, `m7`, `m8`, `m9` (valores obsoletos).
  - Añadidas columnas a `plane_mods`: `name_en`, `description_es`,
    `description_en`, `type_en`, `image_url`, `wiki_url`, `upgrade_costs`.
  - Fallback en `modEffects.js` sincronizado con Supabase.
  - `DEFAULT_PLANE_MODS` corregido (era un array de 8 mods ficticios).
- **Cloudinary como CDN oficial:** Todas las imágenes de aviones (44)
  y mods (10) se sirven desde Cloudinary con transformación
  `w_256,h_256,c_fill,f_webp,q_auto`.
- **Frontend — Modal Stats:** La sección de Mods Equipados ahora
  muestra icono + nombre + tipo + nivel de cada mod.
- **Costos de mejora oficiales:** Mod Tokens (1-5) + Mod Materials
  (50-325) por nivel.

---

## 📌 [3.9.0] - 2026-09-12

### 🎨 Integración Completa con la Wiki de Metalstorm
- **Extracción de datos:** Script de consola ejecutado en https://metalstorm.wiki.gg/wiki/Aircraft que extrae información de los 44 aviones del juego.
- **Nuevas columnas en plane_models:** `descripcion`, `historia`, `recomendaciones` (JSONB), `loadout_wiki` (JSONB), `paints` (JSONB), `canopies` (JSONB), `general_info_wiki` (JSONB), `wiki_url`, `wiki_extracted_at`.
- **Datos cargados:** 310+ paints, 176 canopies, 41 historias, 44 recomendaciones, 44 loadouts.
- **Backend:** `getPlaneDetails` ahora devuelve los 8 campos nuevos al frontend.
- **Frontend — Modal Stats:**
  - Sección "Historia de la Aeronave" con párrafos completos.
  - Sección "Recomendaciones de Uso" con Trait Tips, Ability Tips y Passive Tips.
  - Sección "Paints" con galería visual de imágenes y raridades.
  - Sección "Canopies" con galería visual de imágenes y niveles.
  - `renderArmamentoEquipado` prioriza `plane.loadout_wiki` (stats detalladas de cada arma).

---

## 📌 [3.8.0] - 2026-09-12

### 🃏 Grid Responsive de Cards en el Modal Stats
- **Layout:** `.modal-body` ahora usa `display:grid` con `grid-template-columns: repeat(auto-fill, minmax(320px, 1fr))`.
- **Cards flotantes:** cada `.deep-section` es una card visual con borde, fondo oscuro y hover dorado.
- **Clases de span:** `.span-2` y `.span-3` para cards anchas.
- **Responsive:** desktop (>1000px) 3-4 cards por fila; tablet (700-1000px) 2 cards; mobile (<700px) 1 columna.
- **Colapsables:** todas las cards se expanden/contraen sin perder su posición en el grid.
- **Paints y Canopies:** grid interno ajustado a `minmax(150px, 1fr)`.

---

## 📌 [3.7.5] - 2026-09-12

### 🎯 Rediseño y Ampliación del Modal de Stats
- **Modal `#aircraftDeepModal` rediseñado:** ancho 1400px, alto 92vh, header sticky, footer sticky, scroll interno optimizado.
- **Sección "Armamento Equipado":** con datos de `plane.sistemas` + `plane.loadout_wiki`.
- **Secciones colapsables:** con headers clickeables y chevron dinámico.
- **Fix de cálculo de nivel de armamento:** ahora lee `sistema.nivel` y `sistema.rutas` correctamente (antes mostraba Nv. 0/8 siempre).
- **Fix scroll doble:** `.modal-content` con `overflow:hidden`, `.modal-body` con `overflow-y:auto`.
- **Fix `min-height:0`:** en `.modal-body` para flex scroll.
- **Scrollbar dorada custom:** en `.modal-body`.

---

## 📌 [3.7.0] - 2026-09-08

### 🔥 Sistema Completo de Black Market (BM)
- **Controlador Maestro de Black Market (`src/controllers/bm.controller.js`):**
  - Gestión integral de eventos Black Market de 5 días de duración (miércoles a domingo) con sincronización dual Supabase / memoria.
  - 3 tipos de misiones diarias: **Dedicación** (roles específicos de aeronave), **Habilidad** (trofeos mínimos de combate de 100 a 800) y **Trabajo en equipo** (vuelo con 2 a 6 compañeros).
  - Sistema de puntuación táctica: 25 pts por misión cumplida más **bonus diario de +25 pts** al cumplir las 3 misiones del día (50 pts/día, máx 250 pts).
  - Cálculo de descuento progresivo: 1 punto = 0.2% de descuento, alcanzando hasta **50% de descuento** con 250 puntos.
  - Flujo de adquisición del caza en promoción con descuento militar integrado directamente al Hangar personal del piloto.
  - Auditoría C4ISR militar en `security_events` y `audit_logs` para activación de eventos, completado de misiones y adquisiciones.
- **Rutas de API RESTful (`src/routes/bm.routes.js`, `server.js`):**
  - 15 endpoints especializados bajo `/api/bm/*` para eventos, misiones, progreso individual, cotizaciones de descuento, adquisiciones, tabla de clasificación y estadísticas.
  - Validación estricta con Zod (`CreateBmEventSchema`, `UpdateBmEventSchema`, `CreateBmMissionSchema`, `UpdateBmMissionSchema`, `CompleteBmMissionSchema`).
- **Controlador Frontend y Cliente API (`js/bm.js`, `js/api.js`):**
  - Estado reactivo centralizado `bmState` con soporte offline, actualización en vivo y control de permisos por roles (`ADMIN`/`OWNER`).
  - Funciones de cliente API con cabeceras Bearer JWT (`apiGetBmActiveEvent`, `apiCompleteBmMission`, `apiPurchaseBmDiscount`, etc.).
- **Vistas y Componentes Tácticos (`components/bm-*.html`):**
  - `bm-missions.html`: Selector táctico de los 5 días de combate, misiones con badges de tipo e insignias de bonus diario.
  - `bm-progress.html`: Barra de progreso calibrada al 50%, KPI de puntos y misiones, y desglose día por día.
  - `bm-discount.html`: Ficha técnica de la aeronave en oferta (F-15EX Eagle II), desglose de precio base/ahorro/precio final y botón de adquisición.
  - `bm-leaderboard.html`: Podio Top 3 de combate, tabla clasificatoria con búsqueda en tiempo real y badges de estado.
  - `bm-panel.html`: Consola de mando oficial para crear y activar eventos, configurar misiones diarias y monitorear telemetría.
- **Navegación e Integración SPA (`index.html`, `components/header.html`, `components/dashboard.html`, `js/views.js`):**
  - Registro de vistas `bmMissionsView`, `bmProgressView`, `bmDiscountView`, `bmLeaderboardView` y `bmPanelView` en el enrutador SPA.
  - Acceso directo desde barra de navegación de escritorio, cajón lateral móvil y botón de acción rápida en el Cuadro de Mando Operacional.

---

## 📌 [3.6.0] - 2026-09-08

### ✈️ Sistema de Gestión de Catálogo de Aeronaves (CRUD ADMIN / OWNER)
- **Controlador Maestro de Catálogo (`src/controllers/plane-models.controller.js`):**
  - Implementación completa de CRUD sobre modelos de aeronaves militares con fallback en memoria `INITIAL_PLANE_MODELS` y sincronización Supabase (`plane_models`).
  - Lógica de desactivación suave (**Soft-Delete**) mediante `is_active: false` protegiendo el historial y los hangares existentes de los pilotos.
  - Endpoint de reactivación (`POST /api/plane-models/:id/restore`).
  - Registro forense en `audit_logs` para cada operación de creación, actualización, desactivación y reactivación.
- **Rutas y Seguridad RBAC (`src/routes/plane-models.routes.js`):**
  - Rutas protegidas mediante `requireAuth` y `requireRole('ADMIN', 'OWNER')`.
  - Validación de esquemas con Zod (`PlaneModelSchema`, `UpdatePlaneModelSchema`).
- **Vista de Administración Táctica (`components/admin-plane-models.html`):**
  - Panel visual de catálogo con métricas KPI (Total Modelos, Activos, Desactivados, Cazas Tier 4/5).
  - Búsqueda en tiempo real por texto, filtrado por Tier militar (1 al 5) y filtrado por estado operacional.
  - Tarjetas tácticas con visualización de Tier, velocidad, agilidad, blindaje, potencia de fuego, habilidades especial y pasiva, y estado operativo.
  - Modal táctico para registrar nuevos cazas y editar parámetros técnicos oficiales.
  - Modal de inspección de ficha técnica militar.
- **Cliente API Frontend (`js/api.js`):**
  - Funciones `apiGetPlaneModels`, `apiGetPlaneModelById`, `apiCreatePlaneModel`, `apiUpdatePlaneModel`, `apiDeletePlaneModel`, `apiRestorePlaneModel`.
- **Integración SPA (`js/views.js`, `index.html`, `components/header.html`):**
  - Registro de la vista `adminPlaneModels` en `VIEWS` y `VIEW_ALIASES`.
  - Botones de acceso rápido en Desktop Navigation Strip, Mobile Side Drawer, Panel de Administración y Centro de Control Owner.
  - Sincronización automática con el selector de aeronaves del hangar de pilotos (`loadPlaneModels()`).

---

## 📌 [3.5.0] - 2026-09-08

### 🚀 Autenticación Militar Dual & Vinculación de Cuentas (v3.5.0)
- **Login Dual (Institucional + Gmail):** El login tradicional ahora permite iniciar sesión usando el correo institucional (`@ffaa.py`) o el Gmail real vinculado, contrastando contra `email` y `email_institucional`.
- **Autenticación Federada Google OAuth 2.0 (Passport.js):** Rutas `/api/auth/google`, `/api/auth/google/callback` y `/api/auth/google/status` con soporte para selección de cuenta Google e intercambio de credenciales.
- **Flujo de Vinculación de Cuentas Google (`/link-account`):** Cuando un piloto autentica con una cuenta de Google no registrada previamente, es redirigido automáticamente a la terminal de vinculación (`/link-account?email=...`) para asociar su indicativo de combate (Callsign) y contraseña existente con su cuenta de Google de forma permanente (`google_linked: true`).
- **Restablecimiento Criptográfico de Contraseñas (Tokens de 15 Minutos):** Flujo criptoseguro con tokens de un solo uso generados con `crypto.randomBytes(32)` y expiración estricta a los 15 minutos en la tabla `password_resets`.
- **Plantilla de Correo C4ISR Militar:** Módulo de correo táctico (#0038A8, #D52B1E, #0B132B) mediante `nodemailer` (`src/utils/email.js`) y función exportada `generateResetEmailHTML()`.
- **Endpoints Tácticos de Autenticación:**
  - `POST /api/auth/link-account`: Vincula un Gmail real con el combatiente tras validar indicativo y clave actual.
  - `POST /api/auth/forgot-password`: Genera token de 15 min y despacha correo militar seguro (búsqueda dual en correo institucional y Gmail).
  - `POST /api/auth/reset-password`: Valida token, vigencia, actualiza contraseña con bcrypt e incrementa `token_version` para invalidar sesiones activas.
  - `GET /api/auth/google/status`: Provee estado de disponibilidad del servicio OAuth y estado de vinculación de correo.

### 🎖️ Selector Táctico de Pilotos para ADMIN / OWNER (Modo Oficial)
- **Endpoint Táctico `/api/performances/pilots`:** Endpoint con control de acceso por rangos (RBAC):
  - Para oficiales `ADMIN` y `OWNER`: Devuelve la lista completa de combatientes activos (`status = 'ACTIVE'`) ordenados alfabéticamente por indicativo (`nick`), junto con sus métricas acumuladas.
  - Para combatientes regulares `MIEMBRO` y `VETERANO`: Devuelve exclusivamente su propio registro individual protegiendo la privacidad y evitando cargas delegadas no autorizadas.
- **Selector en Interfaz `#performanceTarget`:** Integración en `components/performance-form.html` permitiendo a los oficiales registrar tokens en nombre de camaradas ausentes.
- **Banner de Alerta C4ISR:** Despliegue de advertencia en tiempo real en la interfaz: `⚠️ Modo Oficial Activo: Estás cargando datos para [CALLSIGN]`, con registro de auditoría de la operación.

### 📊 Panel de Administración Militar & Métricas C4ISR
- **Cálculo en Tiempo Real de Rendimiento:** Enriquecimiento del controlador `admin.controller.js` (`getUsers` y `getMembers`) con cálculo dinámico de:
  - `avg_tokens`: Promedio de tokens acumulado a través de todas las semanas operativas.
  - `weeks_evaluated`: Conteo total de eventos en los que el combatiente ha reportado tokens.
  - `perf_status`: Estado oficial del semáforo militar (`VERDE`, `NARANJA`, `ROJO`, `NEGRO`, `PENDIENTE`) calculado según las directivas del Artículo 26.
- **Filtros Dinámicos en Panel de Oficiales:** Selector y filtros por jerarquía de rango y estado del semáforo en `components/admin-panel.html`.

### ✈️ Hangar Militar & Flota de Combate
- **Catálogo de 23 Aeronaves Operativas:** Catálogo completo en base de datos y memoria que abarca cazas de 3ª, 4ª y 5ª generación (F-22 Raptor, Su-57 Felon, F-35 Lightning II, Eurofighter Typhoon, Rafale, JAS 39 Gripen, J-20, Su-35, A-10C Thunderbolt II, etc.).
- **Sistemas Mecánicos Starform Upgrades 2.0:** Gestión de Fuselaje, Motor, Aviónica y Armas en niveles de 0 a 8 con validación matemática de piezas y componentes avanzados.

### 🔧 Correcciones de Frontend & Estabilidad
- **Corrección de `squadStatus` en Expediente Militar (`js/profile.js`):** Solucionado error `ReferenceError: squadStatus is not defined` en `loadPersonalProfile` al inicializar la variable con `const squadStatus = (profile.status || currentUser.status || 'ACTIVE').toUpperCase();`.
- **Service Worker v3.5.0:** Actualización de caché y precarga de terminales tácticas (`link-account.html`, `reset-password.html`, `components/forgot-password-modal.html`).

---

## 📌 [3.4.0] - 2026-09-08

### 🔑 Autenticación Militar Google OAuth 2.0
- **Botón Táctico en Modal de Login:** Integrado botón con el emblema de Google y estilos tácticos militares (`.btn-google`, `.auth-divider`) con retroalimentación visual al hacer clic.
- **Flujo de Autenticación con Passport.js:** Rutas `/api/auth/google`, `/api/auth/google/callback` y `/api/auth/google/status` con verificación estricta de cuentas activas registradas en la base de datos de escuadrón.
- **Auditoría de Acceso OAuth:** Registro en `security_events` de accesos concedidos (`LOGIN_SUCCESS_GOOGLE`) o denegados (`LOGIN_GOOGLE_DENIED_NOT_FOUND`, `LOGIN_GOOGLE_DENIED_INACTIVE`).
- **Manejo Dinámico de Callback en Frontend:** Función `handleOAuthCallback()` en `js/auth.js` que captura parámetros de autenticación, almacena tokens JWT en almacenamiento local y sanitiza la URL mediante `history.replaceState`.
- **Páginas Institucionales Estáticas:** Despliegue de Política de Privacidad (`/privacy.html`) y Términos de Servicio (`/terms.html`) para cumplimiento normativo de Google OAuth y Fly.io.

---

## 📌 [3.3.2] - 2026-09-07

### 🛡️ Seguridad & Anti-Sesión Fantasma (C4ISR Security Update)
- **Invalidación Criptográfica con `token_version`:** Implementada invalidación instantánea de tokens JWT en el middleware `requireAuth`. Cuando un piloto cambia su clave o un administrador ejecuta un reset, se incrementa `token_version`, invalidando de inmediato cualquier sesión activa previa con error `TOKEN_VERSION_MISMATCH`.
- **Generador Criptoseguro de Claves Temporales:** Nueva función `generateTemporaryPassword()` en `src/utils/security.js` con entropía militar mediante `crypto.randomInt()`. Genera códigos `MS-XXXX-XXXX` excluyendo caracteres ambiguos (`I`, `O`, `0`, `1`) y bloqueando explícitamente secuencias inseguras como `123456`.
- **Auditoría de Reseteo Administrativo:** El endpoint `POST /api/admin/users/:userId/reset-password` ahora registra en `security_events` quién ejecutó el reseteo, su rol, dirección IP y huella digital (User-Agent). La clave generada se entrega en el payload una sola vez para canal seguro (WhatsApp/Discord).
- **Longitud Mínima de Contraseña:** Elevado el estándar mínimo de contraseñas de 6 a 8 caracteres en `auth.controller.js` y `schemas.js`.

### ⚡ Rendimiento & PWA
- **Service Worker v3.3.2:** Actualizado el nombre de caché a `PARAGUAY-FFAA-METALSTORM-v3.3.2` en `sw.js` con precarga completa de los nuevos modales tácticos (`aircraft-stats-modal.html`, `performance-export.html`).
- **Cache-Busting Táctico:** Añadidos identificadores de versión `v=3.3.0` a todas las hojas de estilo modulares en `index.html` para evitar inconsistencias en navegadores móviles.
- **Probe Ligera de Salud:** Nuevo endpoint `GET /health` de respuesta instantánea en texto plano (`200 OK`) diseñado específicamente para los health checks de Fly.io antes de cargar middlewares pesados.

---

## 📌 [3.3.0] - 2026-08-20

### 🚀 Novedades Operativas
- **Centro de Exportación de Rendimientos:** Nuevo componente `performance-export.html` montado en el router dinámico para generar reportes analíticos de escuadrón.
- **Sanitización Contra CSV Injection:** Función `buildSanitizedCSV()` y `sanitizeCSVField()` en `src/utils/csv.js` que neutraliza fórmulas maliciosas (`=`, `+`, `-`, `@`, `\t`, `%`) anteponiendo apóstrofes seguros.
- **Rutas de Presencia de Pilotos:** Nuevos endpoints `/api/presence/online`, `/api/presence/offline` y `/api/presence/active` para monitoreo de escuadrilla activa en tiempo real.

### 🔧 Correcciones
- Corregida la respuesta 404 en la API: Ahora garantiza un payload JSON estructurado (`code: API_ENDPOINT_NOT_FOUND`) sin filtrar jamás páginas HTML de la SPA en rutas `/api/*`.

---

## 📌 [3.2.0] - 2026-06-15 (Starform Upgrades 2.0 Update)

### ✈️ Hangar Militar & Upgrades 2.0
- **Actualización MetalStorm Upgrades 2.0:** Integración de los 4 subsistemas de mejora mecánica por aeronave:
  - **Fuselaje:** Integridad estructural y blindaje (Niveles 0 a 8).
  - **Motor:** Potencia, velocidad de postcombustión y empuje vectorial (Niveles 0 a 8).
  - **Aviónica:** Radar AESA, contramedidas electrónicas ECM y enlace de datos (Niveles 0 a 8).
  - **Armas:** Potencia de fuego de cañón rotativo y misiles aire-aire (Niveles 0 a 8).
- **Economía de Recursos Militares:** Control en base de datos (`sql/upgrades_2_0.sql`) de piezas estándar (`recursos_piezas`) y componentes avanzados (`recursos_avanzadas`), con matriz matemática de costos por nivel (`UPGRADE_COSTS`).
- **Auditoría de Mejoras:** Creación de la tabla `plane_upgrades` para trazabilidad de cada nivel adquirido por cada piloto.
- **Respaldo de Datos Manual (Owner):** Implementado endpoint `POST /api/owner/backup/run` con volcado estructurado de tablas `users`, `performances` y `events`.

---

## 📌 [3.1.0] - 2026-04-10

### 🛡️ Cuotas Militares & RBAC Estricto
- **Validación de Límites Jerárquicos en `admin.controller.js`:**
  - Máximo 1 `OWNER` (degradación automática del comandante previo a `ADMIN` si se transfiere el mando).
  - Máximo 3 `ADMIN` (retorno HTTP 400 `ROLE_LIMIT_REACHED` al intentar exceder el cupo).
  - Máximo 8 `VETERANO` (retorno HTTP 400 `ROLE_LIMIT_REACHED` al intentar exceder el cupo).
- **Protección del Comandante:** Prohibida explícitamente la desactivación de cuentas con rol `OWNER` y blindaje contra modificaciones no autorizadas por administradores estándar.

---

## 📌 [3.0.0] - 2026-02-01

### 🏗️ Arquitectura Modular
- Migración integral a **Node.js ES Modules (`import/export`)**.
- Segregación modular de controladores y rutas (`admin`, `auth`, `dashboard`, `events`, `normativas`, `owner`, `performances`, `planes`, `profile`, `settings`).
- Integración de Supabase PostgreSQL con fallback in-memory ante desconexión.
- Rate limiters dedicados para autenticación, API global y operaciones masivas.
