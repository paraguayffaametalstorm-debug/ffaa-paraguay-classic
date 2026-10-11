# 🔄 HANDOFF — v4.8.19 (2026-10-11)

## Contexto

Sesión de continuación tras HANDOFF v4.8.17. Se cerraron tres ítems
encadenados: **BL-022** (tests de `/api/dashboard/summary`), **HALL-077**
(documentación de divergencia de datos) y **FIX-310-quater** (refactor de
`getSummary` para usar la vista canónica `v_admin_participations`).

La sesión empezó como refactor técnico y derivó en el descubrimiento de un
hallazgo importante: las dos fuentes de datos de participaciones
(`performances` legacy vs `v_admin_participations` vista) **divergen en ~18%**
para 28 de 29 usuarios activos.

---

## Resumen de la sesión

### 1. BL-022 — Verificación y cierre formal

El archivo `tests/controllers/dashboard.controller.test.js` **ya existía** con
commit `c8e143c` (8 tests, todos verdes) pero seguía listado como `📋 Priorizado`
en `BACKLOG.md`. Fue un problema de tracking, no de código.

**Acción:** se movió BL-022 a `✅ Completados` en `BACKLOG.md`.

**Commit:** `ae7e0dd` — `docs(backlog): cerrar BL-022 + registrar BL-032/BL-033`.

### 2. Descubrimiento — Divergencia de datos (HALL-077)

Durante el análisis del refactor se corrió una query de comparación contra
Supabase. Hallazgo:

| Métrica | `performances` (legacy) | `v_admin_participations` (vista) | Delta |
|---|---|---|---|
| Usuarios activos con datos | 26 | 29 | +3 |
| Usuarios con divergencia | — | 28 / 29 | 96.5% |
| Suma total de tokens | 71.365 | 84.500 | **+13.135 (+18.4%)** |

**Causa raíz:** `performances` (tabla legacy) dejó de recibir escrituras
cuando se introdujo `event_participations` como tabla canónica (FIX-310-bis).
Los eventos cargados desde entonces existen solo en la vista.

**Documentado en:** `docs/incidentes/HALL-077-divergencia-performances-vista.md`.

**Commit:** `71bb388` — `docs(incidentes): HALL-077 divergencia performances vs v_admin_participations`.

**Decisión OWNER:** confirmada el 2026-10-11. Los números de la vista son los
correctos. El refactor procede; los números del dashboard van a subir ~18%.

### 3. FIX-310-quater — Refactor de `getSummary`

**Cambios en `src/controllers/dashboard.controller.js`:**

```diff
-          // Obtener performances para calcular promedios actualizados
+          // FIX-310-quater: leer de v_admin_participations (fuente canónica).
+          // La vista devuelve user_id como UUID (users.id), no como INTEGER.
+          // Ref: HALL-077.
           const { data: perfData } = await supabase
-            .from('performances')
+            .from('v_admin_participations')
             .select('user_id, tokens, nick');