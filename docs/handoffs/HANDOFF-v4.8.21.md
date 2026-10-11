# 🔄 HANDOFF — v4.8.21 (2026-10-12)

## Contexto

Sesión de continuación tras HANDOFF v4.8.20. Se cerró el ítem **TESTS-AERONAVES**
del Sprint 7 (prerequisito del sistema de torneos).

La sesión se ejecutó en 3 fases (F1, F2, F3) siguiendo el plan de
`PLAN_TRABAJO_TESTS_AERONAVES.md`, y se cerró con documentación actualizada.

---

## Resumen de la sesión

### 1. Extensión del mock híbrido

**Commit:** `bc307ae` — `test(aeronaves): extender mockSupabaseHybrid con tablas de aeronaves`

`tests/helpers/mockSupabaseHybrid.js` no conocía las tablas del sistema de
aeronaves. Se agregaron 6 entradas en `getTable()`:

- `plane_models`
- `planes`
- `plane_mods`
- `plane_upgrades`
- `upgrade_nodes_v2`
- `mod_effects`

Este cambio alinea el mock híbrido con las necesidades de F2 y F3, y **avanza
BL-032** (unificar variantes de mock Supabase).

### 2. F1 — Tests de `plane-models.controller.js`

**Commit:** `b544933` — `test(aeronaves): F1 - tests unitarios de plane-models.controller (29 casos)`

**Archivo:** `tests/controllers/plane-models.controller.test.js`

**Cobertura:**
- `getPlaneModels`: DB con datos, fallback memoria, filtros `include_inactive`/`all`, normalización JSON
- `getPlaneModelById`: DB hit, DB miss → memoria, memoria miss → 404, error DB
- `createPlaneModel`: happy path, colisión ID memoria, colisión ID DB, Zod, fallback memoria
- `updatePlaneModel`: happy path, 404, Zod, fallback
- `deletePlaneModel`: soft-delete, idempotencia, error DB
- `restorePlaneModel`: happy path, restauración en memoria

**Patrón de mock:** `makeQueryBuilder(result)` local (builder simple).
**Razón:** los tests no necesitan filtros contra DB, solo simular respuestas fijas.

### 3. F2 — Tests de `planes.controller.js`

**Commit:** `272226e` — `test(aeronaves): F2 - tests unitarios de planes.controller (56 casos)`

**Archivo:** `tests/controllers/planes.controller.test.js`

**Cobertura:** los 12 endpoints, con foco en:
- Ownership checks (MIEMBRO vs ADMIN vs OWNER)
- Zod validation
- `SYSTEM_NOT_AVAILABLE` en `updatePlaneSystem` y `updatePlaneSystems`
- `UPGRADE_LOCKED_LEVEL_TOO_LOW` (nivel < 6)
- Fallback por `avion_id` en `getPlaneStats`
- CSV export con formato sanitizado (comillas dobles por campo)
- Cálculo de breakdown de stats

**Patrón de mock:** `createHybridSupabase(DB)` (mock oficial del proyecto).

### 4. F3 — Tests de integración del catálogo combinado

**Commit:** `480c731` — `test(aeronaves): F3 - tests de integración del catálogo combinado (10 casos)`

**Archivo:** `tests/controllers/planes.catalog.test.js`

**Cobertura:**
- Prioridad DB > INITIAL > DEFAULT
- `findModel` por ID exacto, nombre exacto, match parcial normalizado
- Casos borde: `avion_id` inexistente, con espacios
- Integración con `getMyPlanes` y `getCatalogModels`

**Patrón de mock:** `createHybridSupabase(DB)` (consistencia con F2).

**Nota de proceso:** F3 se escribió inicialmente con `makeQueryBuilder` local y
falló en el test 9 (`getMyPlanes` usa `.or()` que el builder local no soportaba).
Se refactorizó al híbrido. **Decisión correcta**: evita introducir un 5to mock
y alinea con BL-032.

---

## Estado del repositorio al cierre

Branch: `test/sprint7-tests-aeronaves`
480c731 (HEAD) test(aeronaves): F3 - tests de integración del catálogo combinado (10 casos)
272226e test(aeronaves): F2 - tests unitarios de planes.controller (56 casos)
b544933 test(aeronaves): F1 - tests unitarios de plane-models.controller (29 casos)
bc307ae test(aeronaves): extender mockSupabaseHybrid con tablas de aeronaves
a400232 docs(handoff): HANDOFF v4.8.20 (quick wins + Sprint 7 setup) ← main

**Pendiente**: push de la rama + PR contra `main`.

---

## Estado de Sprint 7

**Progreso:** 4/8 ítems cerrados.

| ID | Categoría | Descripción | Estado |
|---|---|---|---|
| **BL-023** | 🏗️ | Encoding LF (.gitattributes + .editorconfig) | ✅ Cerrado |
| **BL-033** | 🏗️ | Drift DDL `users.user_id` nullability | ✅ Cerrado |
| **FIX-316** | 🏗️ | Eliminar `admin.users.routes.js` (código muerto) | ✅ Cerrado |
| **TESTS-AERONAVES** | 🧪 | Tests de `planes.controller.js` + `plane-models.controller.js` | ✅ Cerrado |
| **BL-025** | 🧪 | Re-implementar 39 tests skipeados | ⏳ Pendiente |
| **BL-032** | 🏗️ | Unificar 4 variantes de mock Supabase | ⏳ Pendiente (depende de BL-025) |
| **RFC-002** | 📚 | RFC del sistema de torneos internos | 📝 Draft (esperando review OWNER) |
| **BL-024** | 🔐 | Eliminar `unsafe-inline` del CSP | ⏳ Diferido |

---

## Dependencias entre ítems pendientes
BL-032 ──depende de──> BL-025
RFC-002 ──solo requiere──> respuestas OWNER (no bloquea código)
BL-025 ──independiente──> RFC-002

---

## Decisión de próximo paso (conforme a la documentación)

**Orden conforme a las reglas del proyecto:**

1. **BL-025** — deuda técnica de tests del Sprint 3 (39 skipeados). Es el ítem
   técnico de mayor prioridad restante, y BL-032 depende de él.
2. **BL-032** — depende de BL-025.
3. **RFC-002** — aprobación OWNER (paralelo, sin código).
4. **BL-024** — diferido a Sprint 8+.

**Razones (de la documentación):**
- `PLAN_TRABAJO.md §0` regla #2: un ítem = un PR.
- `PLAN_TRABAJO.md §13`: no iniciar Sprint 8 sin cerrar Sprint 7.
- BL-032 está explícitamente marcado como "depende de BL-025".

---

## Pendientes para la próxima sesión

### Próximo ítem: BL-025

**Descripción:** Re-implementar 39 tests skipeados en Sprint 3 (FIX-301/302/303/304)
porque asumen schemas de respuesta que no coinciden con el controller real.

**Categorías afectadas:**
- `tests/controllers/auth.controller.test.js` — login/changePassword/linkAccount
- `tests/middlewares/rbac.test.js` — requireAuth/requireRole + matriz de roles

**Estrategia probable:** mapear el contrato real de cada controller y actualizar
los `expect()`. Usar `createHybridSupabase(DB)` para consistencia con F2/F3.

**Esfuerzo:** M (1 día según BACKLOG).

### Sobre RFC-002 (paralelo)

El OWNER puede responder las 5 preguntas de negocio del RFC-002 en cualquier
momento, sin bloquear el trabajo en BL-025:

1. Formato del primer torneo (eliminación / round-robin / ambos).
2. Tamaño (8, 16, variable).
3. Duración (1 fin de semana, 1-2 semanas, 1 mes).
4. Cómo se juegan las partidas.
5. Premios (simbólicos / oro del juego / nada).

---

## Hallazgos de la sesión (H-01 a H-07)

Detectados durante la escritura de tests y el análisis de los controllers.
**Ninguno se arregló en este PR** — se documentan para Sprint 8+.

| ID | Descripción | Severidad | Archivo afectado |
|---|---|---|---|
| **H-01** | `INITIAL_PLANE_MODELS` comentario dice "23 modelos" pero el array tiene 39 | BAJA | `plane-models.controller.js` |
| **H-02** | `005_plane_models.sql` COMMENT dice "44 modelos" pero el código tiene 39 | BAJA | `sql/005_plane_models.sql` |
| **H-03** | `UPGRADE_COSTS` duplicado en `planes.controller.js` (línea ~130 y ~580) | MEDIA | `planes.controller.js` |
| **H-04** | `getFullCatalogModels` y `findModel` son privadas → candidatas a `utils/catalog.js` | BAJA | `planes.controller.js` |
| **H-05** | `mockSupabaseHybrid.js` no conocía tablas de aeronaves → **resuelto en este PR** | — | `tests/helpers/mockSupabaseHybrid.js` |
| **H-06** | `updatePlaneSystems` (plural) no usa Zod → validación manual. `UpdatePlaneSystemSchema` solo acepta 4 sistemas, pero el plural acepta 7. Asimetría. | MEDIA | `planes.controller.js` + `schemas.js` |
| **H-07** | `getRecommendedBuild` redeclara `UPGRADE_COSTS` local (línea ~580) → duplicación real, no solo mismo nombre | MEDIA | `planes.controller.js` |

---

## Lecciones aprendidas

1. **`buildSanitizedCSV` envuelve cada campo entre comillas dobles** (RFC 4180).
   Los tests de F2 debieron ajustarse. **Regla para futuros tests de CSV:**
   usar `'"campo"'` en los `expect()`.

2. **El mock local `makeQueryBuilder(result)` no implementa toda la API de
   Supabase.** Cuando un controller usa `.or()`, `.range()`, etc., falla
   silenciosamente. **Regla:** para tests de controllers con queries reales,
   usar `createHybridSupabase(DB)`.

3. **La prioridad del catálogo combinado (DB > INITIAL > DEFAULT) es sutil.**
   El código lo implementa con un `Map` que respeta el orden de inserción:
   `DEFAULT` → `INITIAL` → `DB`. El último en escribirse gana.

4. **`plane-models.controller.js` tiene dos fuentes de verdad**: la tabla
   `plane_models` (DB) y el array `INITIAL_PLANE_MODELS` (memoria). Cada
   operación CRUD tiene fallback explícito a memoria. Esto es intencional
   (resiliencia) pero complica el razonamiento sobre "cuál es el estado real".

5. **Un ítem = un PR, pero varios commits.** La rama
   `test/sprint7-tests-aeronaves` tiene 4 commits (1 infraestructura + 3 fases)
   y va a sumar 1 commit de docs. Todos van al mismo PR.

---

## Scripts de automatización disponibles

| Script | Propósito | Uso |
|---|---|---|
| `scripts/dev-all.cjs` | Setup de documentos de desarrollo continuo | `node scripts/dev-all.cjs --apply` |
| `scripts/dev-quickwins.cjs` | Aplicación de quick wins del Sprint 7 | `node scripts/dev-quickwins.cjs --apply` |

**Patrón:** DRY-RUN por defecto. `--apply` para ejecutar. `--no-push` para commit local sin push.

---

## Notas para la próxima sesión

1. **`release-please` puede pushear mientras trabajamos.** Resolución estándar:
   `git pull --rebase origin main && git push origin main`.

2. **Los scripts tienen `CRLF will be replaced by LF` warnings** al hacer `git add`.
   Eso es normal — `.gitattributes` los normaliza al commitear.

3. **Todos los SQL nuevos deben incluir `GRANT` explícito para `service_role`**
   (política Supabase post-30-oct-2026, ref: BL-030).

4. **El patrón `createHybridSupabase(DB)` es ahora el estándar** para tests de
   controllers con queries reales. Los builders locales quedan solo para tests
   de controllers sin queries (o con queries triviales).

5. **El comando `npm test` tarda ~3 segundos** con 26 archivos de test.
   Usar `npx vitest run <archivo>` durante desarrollo para feedback rápido.

---

## Referencias

- **Handoff anterior:** `docs/handoffs/HANDOFF-v4.8.20.md`
- **CHANGELOG:** `CHANGELOG.md`
- **BACKLOG:** `docs/planning/BACKLOG.md` (15 activos / 15 completados)
- **PLAN_TRABAJO:** `docs/planning/PLAN_TRABAJO.md` (Sprint 7 en curso, 4/8)
- **PLAN_TRABAJO_TESTS_AERONAVES:** `docs/planning/PLAN_TRABAJO_TESTS_AERONAVES.md` ✅ Cerrado
- **RFC-002:** `docs/rfc/RFC-002-sistema-torneos.md` (Draft)
- **Mock híbrido extendido:** `tests/helpers/mockSupabaseHybrid.js`
- **Repo:** https://github.com/paraguayffaametalstorm-debug/ffaa-paraguay-classic

---

**PARAGUAY FFAA `[PRY]` — Escuadrón Oficial MetalStorm**
**Handoff v4.8.21 · 2026-10-12**