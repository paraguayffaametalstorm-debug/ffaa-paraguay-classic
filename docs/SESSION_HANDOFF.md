# 🔄 SESSION HANDOFF — PARAGUAY-FFAA | METALSTORM

> **Documento de traspaso entre sesiones de trabajo.**
> **Actualizado:** 2026-09-19
> **Última sesión completada:** F4.2.2-G (eliminación backend BM legacy + deploy)
> **Próximo paso:** F4.3 (vistas adaptativas + UI evento activo)

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
| Commit HEAD | `42867fd` |
| Branch | `main` |
| Working tree | Limpio |
| Push | Sincronizado con origin/main |
| Deploy producción | ✅ **OK - deployment-01M2XE2FXSAFWXTKBWM3DBNKFR** |
| Tests | ✅ 93/93 passed |
| Service Worker | v4.1.0 |
| Frontend api.js/bm.js | v4.1.0 (cache-busted) |

**Últimos 5 commits:**
42867fd refactor(events-v2-bm): eliminar backend BM legacy (F4.2.2-G)
bad0e28 chore(sw): bump cache a v4.1.0 (post F4.2.2-F)
9b8ea0e feat(events-v2-bm): agregar 3 endpoints backend faltantes (F4.2.2-F.0)
647bd9f docs(session): actualizar handoff a F4.2.2-E (post C+D)
7387d3c refactor(events-v2-bm): js/bm.js consume apiEventsV2Bm* (F4.2.2-F)

text

---

## 3. PROGRESO DEL REDISEÑO F4

| Fase | Descripción | Estado | Commit |
|---|---|---|---|
| **F4.1** | Auditoría frontend legacy | ✅ CERRADA | `cd77149` |
| **F4.2.1** | Cliente `apiEventsV2*` en `js/api.js` | ✅ CERRADA | `4f88d3f` |
| **F4.2.2-A** | Schemas BM + ADR-006 | ✅ CERRADA | `6b61852` |
| **F4.2.2-B** | 8 endpoints BM en `/api/events-v2/bm/*` | ✅ CERRADA | `2a6cb12` |
| **F4.2.2-C** | 93 tests con Vitest | ✅ CERRADA | `05bea21` |
| **F4.2.2-D** | Migración BM histórico (`legacy_bm: true`) | ✅ CERRADA | (SQL ejecutado) |
| **F4.2.2-E** | Refactor `js/api.js` (eliminar 18 `apiGetBm*`) | ✅ CERRADA | `7ca8450` |
| **F4.2.2-F** | Refactor `js/bm.js` (consumir `apiEventsV2Bm*`) | ✅ CERRADA | `7387d3c` + `9b8ea0e` |
| **F4.2.2-G** | DROP tablas BM legacy + eliminar backend legacy | ✅ CERRADA | `42867fd` |
| **F4.3** | Vistas adaptativas + UI evento activo | ⏳ **SIGUIENTE** | — |
| **F4.4** | Deprecación formal + limpieza | ⏳ Pendiente | — |

---

## 4. PRÓXIMO PASO — F4.3

**Objetivo:** crear vistas adaptativas según tipo de evento + UI explícita del evento activo.

**Alcance (estimado ~1 día):**

1. **Widget "Evento Activo" en dashboard:**
   - Mostrar el evento `OPEN` actual (SQ o BM).
   - Nombre, tipo, tiempo restante, progreso.
   - Link directo a la vista correspondiente.

2. **Vistas adaptativas por tipo:**
   - **SQ** → formulario de tokens + días + `flew_in_group`.
   - **BM** → grid de misiones diarias (ya implementado).
   - Adaptar según `currentEvent.type`.

3. **Switch funcional en UI:**
   - Bloquear cargas incompatibles (no SQ durante BM).
   - Mostrar mensaje claro si el usuario intenta algo no permitido.

4. **Panel admin unificado de eventos:**
   - Lista de eventos (SQ + BM) con filtros.
   - Botón "Crear evento" (tipo seleccionable).
   - Botón "Activar/Cerrar" con lógica del switch.

**Archivos a tocar (estimados):**
- `components/dashboard.html` (widget evento activo).
- `js/views.js` (lógica adaptativa).
- `js/performance.js` (adaptar validaciones según tipo).
- `components/admin-panel.html` (panel unificado).

**Referencias:**
- `docs/auditoria-frontend-legacy.md` (F4.1)
- `docs/adr/ADR-006-black-market-unificado.md`

---

## 5. DECISIONES CLAVE DE LA SESIÓN

### ADR-006 — Black Market Unificado

**Archivo:** `docs/adr/ADR-006-black-market-unificado.md`

**Decisión:** migrar BM al modelo unificado `events_master` + `event_participations`. **Eliminadas** 4 tablas legacy (`bm_events`, `bm_missions`, `bm_progress`, `bm_discounts`) y 18 endpoints `/api/bm/*`.

### Interpretación de `discount_per_point`

**Decisión:** `discount_per_point = 0.2` significa **0.2% por punto** (NO 0.2 shards).

- 250 puntos × 0.2 = 50% de descuento.
- 50% de 500 shards = 250 shards de descuento.
- Precio final: 250 shards (en vez de 500).

### Fix Zod v4: `error.errors` → `error.issues`

**Aplicado en:**
- `src/controllers/events-v2.controller.js` (5 ocurrencias)
- `src/controllers/events-v2-bm.controller.js` (3 ocurrencias)

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

### IDs migrados de INTEGER a UUID

- Eventos BM: UUID (antes INTEGER auto-incremental).
- Misiones: sin ID propio, se identifican por `(day, type)` sintético.
- Participaciones: UUID (ya era).

### Pricing migrado de Tokens a Shards

- `pricing.base_price_shards` (antes `base_price`).
- `pricing.discount_shards` (antes `discount_amount`).
- `pricing.final_price_shards` (antes `final_price`).

---

## 6. ARCHIVOS RELEVANTES

### Backend (creados/modificados en esta sesión)

- ✅ `src/controllers/events-v2-bm.controller.js` (MODIFICADO — 3 handlers nuevos, ~390 líneas añadidas)
- ✅ `src/routes/events-v2-bm.routes.js` (MODIFICADO — 3 rutas nuevas + import actualizado)
- ✅ `server.js` (MODIFICADO — eliminado import + mount `/api/bm` + deprecationMiddleware)
- ❌ `src/controllers/bm.controller.js` (ELIMINADO — 1577 líneas)
- ❌ `src/routes/bm.routes.js` (ELIMINADO — 89 líneas)

### Frontend (modificados)

- ✅ `js/api.js` (MODIFICADO — 11 wrappers `apiEventsV2Bm*` + limpieza de duplicados)
- ✅ `js/bm.js` (MODIFICADO — refactor completo, ~600 líneas reescritas)
- ✅ `sw.js` (MODIFICADO — CACHE_NAME v4.1.0)
- ✅ `index.html` (MODIFICADO — cache-busting `?v=4.1.0` para api.js y bm.js)

### SQL (nuevo)

- ✅ `sql/032_drop_bm_legacy_tables.sql` (NUEVO — **NO ejecutado todavía**, pendiente post-deploy)

### Tests (sin cambios, 93/93)

- Todos los tests existentes siguen pasando.

---

## 7. REGLAS DE TRABAJO

### Sistema operativo

- OS: **Windows 10 con CMD**.
- **NO usar comandos Linux/macOS** (grep, cat, ls, sed, awk).
- SÍ usar: `findstr`, `type`, `dir`, `node --check`, `git`, `curl`, `del`, `type nul >`.
- Para UTF-8: usar PowerShell.
- **Para archivos grandes**: usar scripts `.cjs` con `node` (evita el pegado manual en el chat).

### Comandos críticos

- Crear archivos vacíos: `type nul > ruta\archivo.js`
- Borrar archivo: `del archivo.js`
- Verificar sintaxis: `node --check ruta\archivo.js`
- Buscar string: `findstr /N "texto" archivo.js`
- Commit multilínea: `git commit -m "titulo" -m "detalle 1" -m "detalle 2"`
- **Push:** `git push origin main`

### Proceso

1. **Una tarea a la vez.** No mezclar.
2. **Verificar antes de avanzar** (`node --check`, `npm test`).
3. **Bloques <100 líneas** (evita truncamiento).
4. **Para archivos grandes (>100 líneas)**: usar **script Node `.cjs`** en vez de copy-paste manual. **Lección aprendida en F4.2.2**.
5. **Commits descriptivos:** `tipo(scope): descripción`.
6. **NO pegar bloques de git en CMD si no empiezan con `git`**.
7. **Deploy tras cada fase grande.**

### Desarrollo

- **NO romper producción** (28 pilotos activos).
- **`node --check`** obligatorio antes de cada commit.
- **`npm test`** antes de cada commit (debe pasar 93/93).
- **`git diff --stat`** para verificar cambios.

### Lecciones aprendidas (esta sesión)

- **CMD `findstr` puede corromper UTF-8** → usar PowerShell si hay problemas.
- **Scripts `.cjs` son la mejor herramienta para reemplazos masivos** en archivos grandes (evitan el pegado manual y son idempotentes).
- **El Service Worker cachea agresivamente** → siempre bumpear `CACHE_NAME` después de cambios grandes en JS.
- **Al editar `server.js`**, tener cuidado con mounts multi-línea (`app.use('/path', mid1, mid2, router)`).
- **Los IDs sintéticos** (`${day}-${type}`) son útiles cuando el modelo de datos ya no expone IDs estables.
- **Express route ordering:** `router.get('/')` **antes** de `router.get('/:id')`.
- **Zod v4 usa `.issues`**, no `.errors`.
- **Vitest v5.0.1** funciona bien con ESM nativo.

---

## 8. CÓMO RETOMAR LA SESIÓN

En una nueva conversación:

1. **Adjuntar este `SESSION_HANDOFF.md`.**
2. **Escribir:** "Continuemos con F4.3 (vistas adaptativas + UI evento activo)".
3. **Opcionalmente adjuntar:**
   - `js/views.js` (si vas a tocar vistas).
   - `components/dashboard.html` (para el widget).
   - `src/controllers/events-v2.controller.js` (para referencia).
   - `docs/adr/ADR-006-black-market-unificado.md`.

**La IA leerá el handoff, entenderá el contexto y arrancará con F4.3.**

---

## 9. COMANDOS DE VERIFICACIÓN RÁPIDA

```cmd
cd C:\Users\pirov\paraguay-ffaa
git log --oneline -5
git status
npm test
curl -s https://paraguay-ffaa-metalstorm.fly.dev/health
Esperado:

Log: 42867fd en top.

Status: up to date with 'origin/main', working tree limpio.

Tests: 93/93 passed.

Health: OK.

10. CHECKLIST DE CIERRE DE ESTA SESIÓN
☑ F4.2.2-A cerrado (schemas + ADR)
☑ F4.2.2-B cerrado (8 endpoints)
☑ F4.2.2-C cerrado (93 tests)
☑ F4.2.2-D cerrado (BM histórico legacy)
☑ F4.2.2-E cerrado (refactor js/api.js)
☑ F4.2.2-F cerrado (refactor js/bm.js + 3 endpoints backend faltantes)
☑ F4.2.2-G cerrado (backend BM legacy eliminado)
☑ Deploy a producción exitoso (deployment-01M2XE2FXSAFWXTKBWM3DBNKFR)
☑ Smoke test en producción OK (health checks + apiEventsV2BmActive())
☑ Service Worker v4.1.0 sirviendo archivos nuevos
☑ 93/93 tests pasando
☑ Working tree limpio
☑ Todos los commits pusheados a origin/main
Sistema: 100% operativo en producción.

11. PRÓXIMOS PASOS (visión global)
Sub-fase	Descripción	Estimación
F4.3	Vistas adaptativas + UI evento activo	~1 día
F4.4	Deprecación formal + limpieza	~4 horas
Post-deploy	Ejecutar sql/032_drop_bm_legacy_tables.sql (esperar 7 días)	~5 min
Total: ~1.5 días de trabajo efectivo.

12. NOTAS POST-DEPLOY
Monitoreo 24-48h
Verificar:

fly logs -a paraguay-ffaa-metalstorm sin errores.

Dashboard Supabase sin picos.

Pilotos activos sin reportes de bugs.

DROP de tablas (7 días)
Una vez confirmada estabilidad:

Abrir Supabase SQL Editor.

Pegar contenido de sql/032_drop_bm_legacy_tables.sql.

Ejecutar.

Riesgo: bajo. Tablas vacías.

Rollback de emergencia
Si algo se rompe en producción:

cmd
fly releases -a paraguay-ffaa-metalstorm
fly deploy --image <IMAGEN_PREVIA>
Imagen previa: deployment-01M2PSC0HFJ7HBQE34SY9AA4XE (versión pre-F4.2.2).

PARAGUAY FFAA [PRY] · SESSION HANDOFF · 2026-09-19 · Commit 42867fd