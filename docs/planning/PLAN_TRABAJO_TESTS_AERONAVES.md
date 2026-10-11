# 🧪 PLAN DE TRABAJO — Tests de Sistema de Aeronaves

> **Fase:** Sprint 7 · Preparación para Torneos
> **Fecha:** 2026-10-11
> **Estado:** 📋 Planificado

## 1. Objetivo
Cubrir con tests el sistema de aeronaves (18 endpoints sin cobertura).
Prerequisito declarado para el sistema de torneos.

## 2. Estado actual
| Métrica | Valor |
|---|---|
| Tests existentes | 0 |
| Endpoints sin cobertura | 18 |

## 3. Fases
### F1 — Tests unitarios `plane-models.controller.js`
- GET, POST, PUT, DELETE, PATCH restore, fallback memoria.

### F2 — Tests unitarios `planes.controller.js`
- Hangar, ownership, stats, upgrades, rutas A/B.

### F3 — Tests de integración del catálogo combinado
- `getFullCatalogModels()` con prioridad BD > INITIAL > DEFAULT.

## 4. Criterio de cierre
- [ ] 18 endpoints con al menos 1 test cada uno.
- [ ] `npm test` pasa 100%.
- [ ] 0 regresiones.

## 5. Referencias
- `src/controllers/plane-models.controller.js`
- `src/controllers/planes.controller.js`
- `tests/controllers/dashboard.controller.test.js` (patrón)
