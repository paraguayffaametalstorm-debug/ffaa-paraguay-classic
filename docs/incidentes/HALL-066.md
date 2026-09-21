# HALL-066 — Scheduler crea eventos futuros como OPEN

> **Incidente en producción detectado el domingo 20/09/2026.**
> **Severidad:** 🟠 ALTA
> **Estado:** ✅ RESUELTO
> **Versión del fix:** v4.3.1

---

## 1. Síntoma

El domingo 20/09/2026 a las ~21:38 PY, el dashboard mostraba un countdown
de **~7 días** para el evento `Squadron Event 2026-W39`, cuando el evento
`Squadron Event 2026-W38` debía cerrar el **lunes 21/09/2026 a las 08:59 PY**
(~12 horas después).

El bug era evidente: el widget mostraba el evento futuro (W39) como si fuera
el evento actualmente operativo.

## 2. Diagnóstico

### Evidencia forense (SQL)

Al consultar la BD en producción el 20/09/2026 22:00 PY:

| Evento | status | start_date | end_date | created_at |
|---|---|---|---|---|
| **W39** | **`OPEN`** 🚨 | 24/09/2026 12:00 UTC | 28/09/2026 11:59 UTC | 24/09/2026 12:00 UTC 🚨 |
| W38 | `CLOSED` 🚨 | 17/09/2026 12:00 UTC | 21/09/2026 11:59 UTC | 17/09/2026 09:00 UTC |

**Anomalías detectadas:**

1. **W39 estaba `OPEN`** cuando su `start_date` (24/09) era **futuro**.
2. **W39.created_at** = 24/09/2026 (fecha futura, imposible).
3. **W38 estaba `CLOSED`** el 20/09 a las 22:00 PY, pero su deadline real
   era el 21/09 a las 08:59 PY. **Se cerró 11 horas antes.**

## 3. Causa raíz

El scheduler de eventos (`src/utils/eventScheduler.js` v1.1) mezclaba tres
responsabilidades en un solo tick:

```javascript
// Código problemático
const isoWeek = getISOWeek(now);  // Si es lunes, devuelve la semana nueva
if (!eventExists(isoWeek)) {
  await closeCurrentOpenEvent(supabase);        // ⚠️ Cierra por semana ISO
  await createSquadronEvent(isoWeek, 'OPEN');   // ⚠️ Crea como OPEN
}