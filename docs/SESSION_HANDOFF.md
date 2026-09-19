# 🔄 SESSION HANDOFF — PARAGUAY-FFAA | METALSTORM

> **Documento de traspaso entre sesiones de trabajo.**
> **Actualizado:** 2026-09-19
> **Última sesión completada:** F4.2.2-C (93 tests)
> **Próximo paso:** F4.2.2-E (refactor `js/api.js`)

---

## 1. CONTEXTO DEL PROYECTO

**PARAGUAY-FFAA | METALSTORM** es una plataforma táctica del escuadrón paraguayo `PARAGUAY FFAA [PRY]` en MetalStorm.

- **Backend:** Node.js 22 + Express 5 + Supabase PostgreSQL
- **Frontend:** Vanilla JS SPA + PWA
- **Deploy:** Fly.io (región `gru` - São Paulo)
- **Repo:** `paraguayffaametalstorm-debug/ffaa-paraguay-classic`
- **Producción:** `https://paraguay-ffaa-metalstorm.fly.dev`
- **Tests:** Vitest 5.0.1 (93 tests pasando)

**Trabajo activo:** Rediseño de Eventos (Fases F4.1 a F4.4).

---

## 2. ESTADO ACTUAL

| Aspecto | Valor |
|---|---|
| Commit HEAD | `05bea21` |
| Branch | `main` |
| Working tree | Limpio |
| Push | Sincronizado con origin/main |
| Deploy producción | ✅ OK |
| Tests | ✅ 93/93 passed |

**Últimos 5 commits:**
05bea21 test(events-v2-bm): 93 tests con Vitest
2a6cb12 feat(events-v2): BM controller con 8 endpoints sobre events_master
e3770ea docs(session): agregar handoff F4.2.2-A -> F4.2.2-B
6b61852 feat(events-v2): extender schemas BM con missions y calculateBmPoints (F4.2.2-A)
4f88d3f feat(events-v2): agregar cliente API unificado (F4.2.1) + auditoría F4.1

text

---

## 3. PROGRESO DEL REDISEÑO F4

| Fase | Descripción | Estado | Commit |
|---|---|---|---|
| **F4.1** | Auditoría frontend legacy | ✅ CERRADA | `cd77149` |
| **F4.2.1** | Cliente `apiEventsV2*` en `js/api.js` | ✅ CERRADA | `4f88d3f` |
| **F4.2.2-A** | Schemas BM + ADR-006 | ✅ CERRADA | `6b61852` |
| **F4.2.2-B** | Endpoints BM en `/api/events-v2/bm/*` | ✅ CERRADA | `2a6cb12` |
| **F4.2.2-C** | 93 tests con Vitest | ✅ CERRADA | `05bea21` |
| **F4.2.2-D** | Migración BM histórico (`legacy_bm: true`) | ✅ CERRADA | (SQL ejecutado) |
| **F4.2.2-E** | Refactor `js/api.js` (eliminar `apiGetBm*`) | ⏳ **SIGUIENTE** | — |
| **F4.2.2-F** | Refactor `js/bm.js` (consumir `apiEventsV2*`) | ⏳ Pendiente | — |
| **F4.2.2-G** | DROP tablas BM legacy + eliminar `bm.controller.js` | ⏳ Pendiente | — |
| **F4.3** | Vistas adaptativas + UI evento activo | ⏳ Pendiente | — |
| **F4.4** | Deprecación formal + limpieza | ⏳ Pendiente | — |

---

## 4. PRÓXIMO PASO — F4.2.2-E

**Objetivo:** eliminar las 18 funciones legacy `apiGetBm*` de `js/api.js`.

**Las 18 funciones a eliminar:**
1. `apiGetBmEvents()` → `GET /api/bm/events`
2. `apiGetBmActiveEvent()` → `GET /api/bm/events/active`
3. `apiGetBmEventById()` → `GET /api/bm/events/:id`
4. `apiCreateBmEvent()` → `POST /api/bm/events`
5. `apiUpdateBmEvent()` → `PUT /api/bm/events/:id`
6. `apiActivateBmEvent()` → `POST /api/bm/events/:id/activate`
7. `apiDeactivateBmEvent()` → `POST /api/bm/events/:id/deactivate`
8. `apiGetBmMissionsToday()` → `GET /api/bm/missions/today`
9. `apiGetBmMissionsByEvent()` → `GET /api/bm/missions/:eventId`
10. `apiCompleteBmMission()` → `POST /api/bm/missions/:id/complete`
11. `apiCreateBmMission()` → `POST /api/bm/missions`
12. `apiUpdateBmMission()` → `PUT /api/bm/missions/:id`
13. `apiDeleteBmMission()` → `DELETE /api/bm/missions/:id`
14. `apiGetBmProgress()` → `GET /api/bm/progress`
15. `apiGetBmDiscount()` → `GET /api/bm/discount`
16. `apiPurchaseBmDiscount()` → `POST /api/bm/discount/purchase`
17. `apiGetBmStats()` → `GET /api/bm/stats`
18. `apiGetBmLeaderboard()` → `GET /api/bm/leaderboard`

**Las funciones nuevas (`apiEventsV2*`) ya están en `js/api.js`** desde F4.2.1. No hay que reescribirlas, solo eliminar las viejas.

**Verificación post-refactor:**
- `findstr "apiGetBm" js\api.js` → 0 ocurrencias.
- `node --check js\api.js` → silencio.
- `git diff --stat` → muestra solo eliminaciones.

**Riesgo:** `js/bm.js` todavía usa las funciones viejas. **Va a romper si corremos la app entre E y F.** Eso está previsto — se corrige en F.

**Plan:**
1. Hacer E (eliminar 18 funciones).
2. NO deployar a Fly.io entre E y F.
3. Hacer F (adaptar `js/bm.js`).
4. Recién ahí deployar.

---

## 5. DECISIONES CLAVE DE LA SESIÓN

### ADR-006 — Black Market Unificado

**Archivo:** `docs/adr/ADR-006-black-market-unificado.md`

**Decisión:** migrar BM al modelo unificado `events_master` + `event_participations`. Eliminar 4 tablas legacy (`bm_events`, `bm_missions`, `bm_progress`, `bm_discounts`) y 18 endpoints `/api/bm/*`.

### Interpretación de `discount_per_point`

**Decisión:** `discount_per_point = 0.2` significa **0.2% por punto** (NO 0.2 shards).

- 250 puntos × 0.2 = 50% de descuento.
- 50% de 500 shards = 250 shards de descuento.
- Precio final: 250 shards (en vez de 500).

**Fix aplicado en F4.2.2-B** (función `getBmDiscountV2`).

### Fix Zod v4: `error.errors` → `error.issues`

**Aplicado en:**
- `src/controllers/events-v2.controller.js` (5 ocurrencias)
- `src/controllers/events-v2-bm.controller.js` (3 ocurrencias)

**Motivo:** Zod 4 renombró `.errors` a `.issues`. El código viejo enviaba `details: undefined`.

### BM histórico (marcado `legacy_bm: true`)

**ID:** `d7cbf035-c861-458d-93b6-68e8ba5fb5f4`

**Aplicado SQL:** `metadata = metadata || jsonb_build_object('legacy_bm', true, 'no_data', true, 'notes', '...')`.

**Comportamiento:** el controlador lo trata como solo-lectura, sin misiones jugables.

### Reglas de negocio BM

| Regla | Valor |
|---|---|
| Duración | 5 días (miércoles a domingo) |
| Misiones por día | 3 (dedication, skill, teamwork) |
| Puntos por misión | 25 (custom desde metadata.missions) |
| Bonus diario | +25 al completar 3/día |
| Máx puntos | 250 |
| Descuento por punto | 0.2% |
| Máx descuento | 50% |
| Progresión de trofeos | 200 → 350 → 500 → 650 → 800 (+150/día) |

---

## 6. ARCHIVOS RELEVANTES

### Backend (creados/modificados en esta sesión)

- ✅ `src/controllers/events-v2-bm.controller.js` (NUEVO — 8 endpoints BM, ~700 líneas)
- ✅ `src/routes/events-v2-bm.routes.js` (NUEVO — 8 rutas)
- ✅ `src/utils/eventSchemas.js` (MODIFICADO — schemas BM + `calculateBmPoints(dayProgress, missions)`)
- ✅ `src/controllers/events-v2.controller.js` (MODIFICADO — fix `error.issues`)
- ✅ `server.js` (MODIFICADO — montaje `/api/events-v2/bm` ANTES que `/api/events-v2`)

### Tests (creados en esta sesión)

- ✅ `vitest.config.js` (config)
- ✅ `tests/mocks/supabase.js` (mock encadenable)
- ✅ `tests/mocks/express.js` (helpers req/res)
- ✅ `tests/fixtures/bm-events.js`
- ✅ `tests/fixtures/bm-participations.js`
- ✅ `tests/fixtures/users.js`
- ✅ `tests/events-v2-bm/calculateBmPoints.test.js` (11 tests)
- ✅ `tests/events-v2-bm/schemas.test.js` (30 tests)
- ✅ `tests/events-v2-bm/get-active.test.js` (5 tests)
- ✅ `tests/events-v2-bm/get-event-by-id.test.js` (7 tests)
- ✅ `tests/events-v2-bm/create-event.test.js` (8 tests)
- ✅ `tests/events-v2-bm/update-event.test.js` (8 tests)
- ✅ `tests/events-v2-bm/get-progress.test.js` (6 tests)
- ✅ `tests/events-v2-bm/update-progress.test.js` (8 tests)
- ✅ `tests/events-v2-bm/get-leaderboard.test.js` (5 tests)
- ✅ `tests/events-v2-bm/get-discount.test.js` (5 tests)

### Archivos para la próxima sesión

- `js/api.js` (PEGAR EN NUEVA CONVERSACIÓN — 500-800 líneas)
- `js/bm.js` (pegar en F4.2.2-F)
- `docs/adr/ADR-006-black-market-unificado.md`
- `docs/auditoria-frontend-legacy.md`

---

## 7. REGLAS DE TRABAJO

### Sistema operativo

- OS: **Windows 10 con CMD**.
- **NO usar comandos Linux/macOS** (grep, cat, ls, sed, awk).
- SÍ usar: `findstr`, `type`, `dir`, `node --check`, `git`, `curl`, `del`, `type nul >`.
- Para UTF-8: usar PowerShell.

### Comandos críticos

- Crear archivos vacíos: `type nul > ruta\archivo.js`
- Borrar archivo: `del archivo.js`
- Verificar sintaxis: `node --check ruta\archivo.js`
- Buscar string: `findstr /N "texto" archivo.js`
- Commit multilínea: `git commit -m "titulo" -m "detalle 1" -m "detalle 2"`

### Proceso

1. **Una tarea a la vez.** No mezclar.
2. **Verificar antes de avanzar** (`node --check`, `npm test`).
3. **Bloques <100 líneas** (evita truncamiento).
4. **Commits descriptivos:** `tipo(scope): descripción`.
5. **NO pegar bloques de git en CMD si no empiezan con `git`** (son informativos).
6. **Fix antes de F:** NO deployar a Fly.io entre F4.2.2-E y F4.2.2-F.

### Desarrollo

- **NO romper producción** (28 pilotos activos).
- **`node --check`** obligatorio antes de cada commit.
- **`npm test`** antes de cada commit (debe pasar 93/93).
- **`git diff --stat`** para verificar cambios.

### Lecciones aprendidas

- **CMD `findstr` puede corromper UTF-8** → usar PowerShell si hay problemas.
- **Notepad puede no guardar UTF-8** → usar VSCode.
- **Vitest v5.0.1** funciona bien con ESM nativo.
- **Zod v4 usa `.issues`, no `.errors`**.
- **No pegar mensajes de commit en CMD** (se ejecutan como comandos).
- **Mock de Supabase con `globalThis.__TEST_SUPA__`** funciona bien.

---

## 8. CÓMO RETOMAR LA SESIÓN

En una nueva conversación:

1. **Adjuntar este `SESSION_HANDOFF.md`.**
2. **Adjuntar `js/api.js` (completo).**
3. **Escribir:** "Continuemos con F4.2.2-E".

**Opcionalmente adjuntar:**
- `docs/adr/ADR-006-black-market-unificado.md`
- `docs/auditoria-frontend-legacy.md`
- `src/controllers/events-v2-bm.controller.js` (para referencia)
- `tests/mocks/supabase.js` (por si hay que escribir más tests)

---

## 9. COMANDOS DE VERIFICACIÓN RÁPIDA
cd C:\Users\pirov\paraguay-ffaa
git log --oneline -5
git status
npm test
curl -s https://paraguay-ffaa-metalstorm.fly.dev/health

text

**Esperado:**
- Log: `05bea21` en top.
- Status: `up to date with 'origin/main'`, working tree limpio.
- Tests: 93/93 passed.
- Health: `OK`.

---

## 10. CHECKLIST DE CIERRE DE ESTA SESIÓN

- [x] F4.2.2-A cerrado (schemas + ADR)
- [x] F4.2.2-B cerrado (8 endpoints)
- [x] F4.2.2-C cerrado (93 tests)
- [x] F4.2.2-D cerrado (BM histórico legacy)
- [x] Fix `error.issues` aplicado en 2 controladores
- [x] Fix `discount_per_point` aplicado (0.2% por punto)
- [x] Commits pusheados a origin/main
- [x] Working tree limpio
- [x] 93/93 tests pasando

**Sistema: 100% operativo en producción.**

---

## 11. PRÓXIMOS PASOS (visión global)

| Sub-fase | Descripción | Estimación |
|---|---|---|
| **F4.2.2-E** | Refactor `js/api.js` (eliminar 18 funciones) | ~30 min |
| **F4.2.2-F** | Refactor `js/bm.js` (~700 líneas) | ~2 horas |
| **F4.2.2-G** | DROP tablas BM legacy + eliminar `bm.controller.js` | ~30 min |
| F4.3 | Vistas adaptativas + UI evento activo | ~1 día |
| F4.4 | Deprecación formal + limpieza | ~4 horas |

**Total:** ~2-3 días de trabajo efectivo.

---

**PARAGUAY FFAA [PRY] · SESSION HANDOFF · 2026-09-19 · Commit 05bea21**