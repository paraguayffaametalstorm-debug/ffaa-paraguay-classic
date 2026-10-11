# HALL-077 — Divergencia entre `performances` y `v_admin_participations`

**Fecha de detección:** 2026-10-11
**Detectado durante:** FIX-310-quater (refactor de `getSummary`)
**Severidad:** MEDIA
**Estado:** ABIERTO — autorización OWNER obtenida, refactor pendiente

---

## Hallazgo

Comparación directa contra Supabase (SQL Editor, 2026-10-11):

| Métrica | `performances` (legacy) | `v_admin_participations` (vista) | Delta |
|---|---|---|---|
| Usuarios activos con datos | 26 | 29 | +3 |
| Usuarios con divergencia | — | 28 de 29 | 96.5% |
| Suma total de tokens | 71.365 | 84.500 | **+13.135 (+18.4%)** |

**Solo 1 de 29 usuarios activos tiene valores idénticos en ambas fuentes.**

---

## Patrones observados

### Grupo 1 — Delta constante +600

Usuarios con top de tokens (`RomanovPY`, `BARBA19`, `CARL.PY`, `PABLOFF`,
`PJPIROVANI`, `REMASTER`) presentan **exactamente +600 tokens** en la vista.
Sugiere un **evento completo** registrado solo en `event_participations`.

### Grupo 2 — Delta ~+500 a +585

`RUBEN` (+585), `GENNOMAX` (+550), `IGUANA` (+550), `DARKEDEN` (+550),
`ASTARTES` (+510), `AIRJUMP` (+500). Probablemente el mismo evento con
rendimiento individual distinto, más ajustes adicionales.

### Grupo 3 — Usuarios solo en la vista (no existen en `performances`)

- `Macktavish` (user_id=1003): legacy 0, vista 600
- `MARIANO_PY` (user_id=1012): legacy 0, vista 350
- `DerangedOrangeMan` (user_id=1011): legacy 0, vista 250

Los tres tienen `user_id > 1000` (altas recientes). Sus participaciones
fueron registradas en `event_participations` (código nuevo, FIX-310-bis)
pero nunca se copiaron a `performances` legacy.

### Grupo 4 — Sin patrón claro

`TEMPLARIO` (user_id=34): +200. Sin agrupación evidente.

---

## Causa raíz (hipótesis)

`performances` (tabla legacy) **dejó de recibir escrituras** en algún
punto entre FIX-310 y FIX-310-bis, cuando se introdujo `event_participations`
como tabla canónica. Los eventos cargados desde ese momento existen solo
en `event_participations` → `v_admin_participations`.

**La vista NO está "inflando" los datos — está leyendo los datos que
`performances` nunca recibió.**

---

## Implicancia para FIX-310-quater

Al refactorizar `getSummary` (`performances` → `v_admin_participations`),
el dashboard va a mostrar:

- `squadStats.avg_tokens`: pasa de ~2.460 a ~2.914 (**+18.4%**).
- `topPilots`: 3 usuarios nuevos entran al ranking.
- `pilots_without_load`: baja (los 3 nuevos tienen carga).
- `userStats.avg_tokens`: sube para 28 de 29 usuarios.

**Esto es corrección de bug preexistente, NO regresión del refactor.**

---

## Decisión OWNER

**Fecha:** 2026-10-11
**Decisión:** ✅ **Autorizado.** El OWNER confirma que los números de
`v_admin_participations` son los correctos. El refactor procede.

**Acción complementaria:** se recomienda comunicar el cambio visible
a los pilotos tras el deploy, con una nota breve del tipo
"Dashboard actualizado con datos históricos faltantes".

---

## Referencias

- FIX-310 (endpoint v2 admin/participations)
- FIX-310-bis (resolución nick/role + vista SQL)
- FIX-310-ter (exportPerformancesCSV → vista)
- FIX-310-quater (este fix, refactor de getSummary)
- `docs/adr/ADR-008-update.md` (rediseño eventos)
- `sql/042_admin_participations_view.sql`
- `sql/043_backfill_participations_nick.sql`

---

**Detectado por:** Comando C4ISR + asistencia IA
**Documento vivo — actualizar al cerrar FIX-310-quater.**