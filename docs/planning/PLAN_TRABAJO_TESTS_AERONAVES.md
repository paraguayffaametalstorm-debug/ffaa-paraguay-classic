# 🧪 PLAN DE TRABAJO — Tests de Sistema de Aeronaves

> **Fase:** Sprint 7 · Preparación para Torneos
> **Fecha inicio:** 2026-10-11
> **Fecha cierre:** 2026-10-12
> **Estado:** ✅ Completado

## 1. Objetivo
Cubrir con tests el sistema de aeronaves (18 endpoints sin cobertura).
Prerequisito declarado para el sistema de torneos.

## 2. Estado inicial
| Métrica | Valor |
|---|---|
| Tests existentes | 0 |
| Endpoints sin cobertura | 18 |

## 3. Fases
### F1 — Tests unitarios `plane-models.controller.js`
- GET, POST, PUT, DELETE, PATCH restore, fallback memoria.
- **Entregado:** 29 tests en `tests/controllers/plane-models.controller.test.js`

### F2 — Tests unitarios `planes.controller.js`
- Hangar, ownership, stats, upgrades, rutas A/B.
- **Entregado:** 56 tests en `tests/controllers/planes.controller.test.js`

### F3 — Tests de integración del catálogo combinado
- `getFullCatalogModels()` con prioridad BD > INITIAL > DEFAULT.
- `findModel()` por ID, nombre exacto y match parcial.
- **Entregado:** 10 tests en `tests/controllers/planes.catalog.test.js`

## 4. Criterio de cierre
- [x] 18 endpoints con al menos 1 test cada uno.
- [x] `npm test` pasa 100%.
- [x] 0 regresiones.

## 5. Resultado (cerrado 2026-10-12)

**Estado:** ✅ Completado

**Cobertura entregada:**
| Fase | Archivo | Tests |
|---|---|---|
| F1 | `plane-models.controller.test.js` | 29 |
| F2 | `planes.controller.test.js` | 56 |
| F3 | `planes.catalog.test.js` | 10 |
| **Total** | | **95** |

**Tests en la suite al cierre:** 469 passed / 39 skipped / 0 failed.

**Cobertura de endpoints:** 18/18 (6 de `plane-models.controller` + 12 de `planes.controller`).

**Commits:**
- `bc307ae` — `test(aeronaves): extender mockSupabaseHybrid con tablas de aeronaves`
- `b544933` — `test(aeronaves): F1 - tests unitarios de plane-models.controller (29 casos)`
- `272226e` — `test(aeronaves): F2 - tests unitarios de planes.controller (56 casos)`
- `480c731` — `test(aeronaves): F3 - tests de integración del catálogo combinado (10 casos)`

**Cambios de infraestructura de tests:**
- `tests/helpers/mockSupabaseHybrid.js` extendido con 6 tablas nuevas:
  `plane_models`, `planes`, `plane_mods`, `plane_upgrades`, `upgrade_nodes_v2`, `mod_effects`.
- F2 y F3 migrados al patrón `createHybridSupabase(DB)` (alineado con BL-032).

**Hallazgos documentados:** H-01 a H-07 (ver `HANDOFF-v4.8.21.md`).

## 6. Referencias
- `src/controllers/plane-models.controller.js`
- `src/controllers/planes.controller.js`
- `tests/controllers/dashboard.controller.test.js` (patrón inicial)
- `tests/helpers/mockSupabaseHybrid.js` (patrón adoptado)