# ADR-006: Black Market Unificado sobre events_master

> **Fecha:** 2026-09-19
> **Estado:** ✅ Accepted
> **Autor:** PJPIROVANI (OWNER)
> **Contexto:** Rediseño de Eventos (F4.2.2)

---

## 📋 Contexto

El sistema PARAGUAY-FFAA | METALSTORM está ejecutando el Rediseño de Eventos (F0-F4). La Fase F3 ya unificó los eventos SQ (Squadron) en `events_master` + `event_participations`, con un scheduler automático y switch funcional.

El módulo Black Market (BM) quedó rezagado: sigue operando sobre 4 tablas legacy (`bm_events`, `bm_missions`, `bm_progress`, `bm_discounts`) y 18 endpoints `/api/bm/*` con sunset programado para 2026-12-16 (HALL-058).

**Estado del BM legacy (verificado 2026-09-19):**
- 4 tablas con 0 filas (nunca se usó en producción).
- 18 endpoints `/api/bm/*` operativos pero sin datos.
- 1 evento BM histórico en `events_master` con metadata incompleto (artefacto de migración F2.1).

**El OWNER expresó:** *"No me gustan los parches ni nada temporal. Prefiero las mejores prácticas y busco la excelencia."*

**Consecuencia:** se descarta el enfoque de wrappers temporales y se opta por refactor completo del BM sobre `events_master`.

---

## 🎯 Decisión

**Migrar el Black Market al modelo unificado de eventos:**

1. **Eliminar las 4 tablas BM legacy** (`bm_events`, `bm_missions`, `bm_progress`, `bm_discounts`).
2. **Usar `events_master` con `type = 'BLACK_MARKET'`** para el evento BM:
   - El evento se representa con 1 fila en `events_master`.
   - La configuración completa (aeronave, economía, misiones, progresión) se almacena en `metadata` (JSONB).
3. **Usar `event_participations`** para el progreso individual del piloto:
   - 1 fila por piloto × evento BM.
   - El progreso diario (3 misiones × 5 días) se almacena en `data` (JSONB).
4. **Eliminar los 18 endpoints `/api/bm/*`** y `bm.controller.js`.
5. **Agregar 8 endpoints nuevos** en `/api/events-v2/bm/*` con validación Zod específica.
6. **Refactorizar `js/bm.js`** para consumir `apiEventsV2*` directamente.
7. **Refactorizar `js/api.js`** eliminando las 18 funciones `apiGetBm*`.

---

## 📐 Estructura JSONB

### `events_master.metadata` (evento BM)

```json
{
  "aircraft_id": "125",
  "aircraft_name": "F-15EX Eagle II",
  "base_price_shards": 500,
  "max_discount_shards": 250,
  "max_points": 250,
  "discount_per_point": 0.2,
  "duration_days": 5,
  "purchase_window_hours": 24,
  "trophy_progression": {
    "day_1": 200, "day_2": 350, "day_3": 500, "day_4": 650, "day_5": 800
  },
  "missions": [
    {
      "day": 1,
      "type": "dedication",
      "description": "Volar 3 partidas con Cazas Ligeros",
      "requirement": "Volar 3 partidas con cazas tácticos ligeros",
      "target_value": 3,
      "points": 25
    }
  ],
  "announced_at": "2026-09-19T00:00:00Z",
  "created_by": "PJPIROVANI",
  "notes": null
}
event_participations.data (progreso individual)
json
{
  "day_1": { "dedication": true, "skill": true, "teamwork": false },
  "day_2": { "dedication": true, "skill": true, "teamwork": true },
  "day_3": { "dedication": true, "skill": false, "teamwork": true },
  "day_4": { "dedication": true, "skill": true, "teamwork": true },
  "day_5": { "dedication": false, "skill": false, "teamwork": false },
  "total_points": 175,
  "discount_percentage": 35,
  "completed_missions": 11,
  "bonus_points": 75,
  "screenshot_urls": [],
  "verified_by": null,
  "verified_at": null,
  "notes": null
}
⚖️ Consecuencias
Positivas
✅ Consistencia arquitectónica total: todos los tipos de evento (SQ, BM, ACE_CHALLENGE) viven en events_master.

✅ Eliminación de 4 tablas legacy + 18 endpoints + 1 controlador + 1 archivo de rutas.

✅ Flexibilidad: agregar campos al BM no requiere migración DDL, solo JSONB.

✅ Un solo switch funcional (el de events_master con idx_events_master_single_open).

✅ Una sola política RLS para todos los eventos.

✅ Simplificación del frontend: js/bm.js consume los mismos endpoints que SQ.

Negativas / Riesgos
⚠️ Refactor grande: ~700 líneas de js/bm.js + 18 funciones de js/api.js + bm.controller.js.

⚠️ Pérdida de constraints de BD: las validaciones de rango (día 1-5, tipo de misión) ya no las hace PostgreSQL, las hace Zod en backend.

⚠️ Sin queries SQL nativas para BM: para análisis ad-hoc hay que usar operadores JSONB (metadata->'missions', data->'day_1').

⚠️ BM histórico incompleto: requiere decisión explícita (ver §BM Histórico).

Mitigación: validación Zod estricta + tests exhaustivos + ADR + migración idempotente.

🔄 BM Histórico
Existe 1 evento BM histórico en events_master (id d7cbf035-c861-458d-93b6-68e8ba5fb5f4):

json
{
  "id": "d7cbf035-c861-458d-93b6-68e8ba5fb5f4",
  "name": "Squadron Event 2026-04 · SEM 16 - BM",
  "type": "BLACK_MARKET",
  "status": "CLOSED",
  "metadata": {
    "notes": "BM histórico migrado de tabla events legacy. Sin datos de participaciones.",
    "source": "MIGRATION_RECONSTRUCTION",
    "no_data": false,
    "legacy_id": "2026-04 · SEM 16 - BM",
    "backfilled": true,
    "target_tokens": 0,
    "target_members": 0,
    "min_tokens_required": 175
  },
  "legacy_event_id": "2026-04 · SEM 16 - BM"
}
Problema: su metadata es un artefacto de la migración F2.1 — tiene estructura de SQ aplicada a un BM, sin campos BM reales.

Decisión: marcarlo como legacy_bm: true y NO normalizarlo con datos inventados. El schema Zod BlackMarketMetadataSchema acepta legacy_bm: true como caso especial.

Migración (F4.2.2-D):

sql
UPDATE events_master
SET metadata = metadata || jsonb_build_object(
  'legacy_bm', true,
  'no_data', true,
  'notes', 'BM histórico migrado de events legacy. Sin datos reales. Excluido de validación de schema nuevo.'
)
WHERE type = 'BLACK_MARKET'
  AND metadata->>'legacy_id' = '2026-04 · SEM 16 - BM';
🎯 Reglas de negocio BM
Regla	Valor
Duración	5 días (miércoles a domingo)
Misiones por día	3 (dedication, skill, teamwork)
Puntos por misión	25
Bonus diario	+25 al completar 3/día
Máx puntos	250
Descuento por punto	0.2%
Máx descuento	50%
Progresión de trofeos	200 → 350 → 500 → 650 → 800 (+150/día)
Fórmula de puntos:

text
puntos_día = (misiones_cumplidas × 25) + (bonus_día si misiones == 3)
puntos_total = min(Σ puntos_día, 250)
descuento = min(puntos_total × 0.2%, 50%)
Implementación: calculateBmPoints(dayProgress) en src/utils/eventSchemas.js.

🔀 Alternativas consideradas
Alternativa A — Wrappers temporales en js/api.js
Rechazada: viola el principio "sin parches ni temporales" del OWNER.

Alternativa B — Tablas dedicadas bm_* + events_master como índice
Rechazada: duplica la fuente de verdad. Dos esquemas para el mismo concepto.

Alternativa C — Schema JSONB con campos planos (metadata.missions como objeto indexado por tipo)
Rechazada: complica las queries. El array de misiones es más simple y natural.

📅 Plan de ejecución (F4.2.2)
Sub-fase	Descripción	Estado
F4.2.2-A	Schemas Zod + ADR (esta sub-fase)	✅ Completada
F4.2.2-B	Endpoints /api/events-v2/bm/* (8 endpoints)	⏳ Siguiente
F4.2.2-C	Tests exhaustivos de los 8 endpoints	⏳ Pendiente
F4.2.2-D	Migración del BM histórico (marcar como legacy_bm: true)	⏳ Pendiente
F4.2.2-E	Refactor js/api.js (eliminar apiGetBm*)	⏳ Pendiente
F4.2.2-F	Refactor js/bm.js (consumir apiEventsV2*)	⏳ Pendiente
F4.2.2-G	DROP tablas BM legacy + eliminar bm.controller.js	⏳ Pendiente
Estimación total: 5 días.

✅ Criterios de cierre
□ 4 tablas BM legacy eliminadas (DROP).
□ 18 endpoints /api/bm/* eliminados.
□ bm.controller.js eliminado.
□ 8 endpoints /api/events-v2/bm/* operativos con tests.
□ js/bm.js consume apiEventsV2*.
□ js/api.js sin funciones apiGetBm*.
□ BM histórico marcado como legacy_bm: true.
□ BlackMarketMetadataSchema y BlackMarketParticipationDataSchema validando correctamente.
□ Documentación sincronizada (API_REFERENCE.md, ARCHITECTURE.md, CHANGELOG.md).
PARAGUAY FFAA [PRY] · ADR-006 · 2026-09-19