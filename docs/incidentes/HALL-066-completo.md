# HALL-066 — Cadena de 6 Bugs Bloqueando Carga de W38

> **Incidente P0 · Detectado: 2026-09-21 · Resuelto: 2026-09-22**
> **Versión del fix: v4.5.2-hotfix**
> **Owner: PJPIROVANI**

---

## 1. Síntoma Inicial

Pilotos reportaron: *"No se puede guardar los registros de W38"*.

En el navegador, el formulario de carga mostraba **"🔴 VENTANA CERRADA"**
aunque el evento W38 estaba en período de gracia (ADR-008) con
ventana de carga abierta hasta el 24/09/2026 12:00 UTC.

---

## 2. Cadena de 6 Bugs

Lo que parecía un bug de frontend resultó ser una **cadena de 6 bugs
en 3 capas** (frontend, backend, base de datos/Service Worker).

### Bug #1 — HALL-066 (Frontend)

**Archivo:** `js/views.js` (~línea 1416)
**Commit fix:** `1614c13`

`displayEventInfo` usaba `isGracePeriod` en `subText` **antes** de declararlo
con `const`. Resultado: `ReferenceError` silencioso, la rama de grace period
nunca se ejecutaba, siempre caía en "VENTANA CERRADA".

**Fix:** mover la declaración de `isGracePeriod` 3 posiciones arriba.

### Bug #2 — HALL-066-bis (Frontend)

**Archivo:** `js/performance.js` (~línea 380)
**Commit fix:** `6d872ae`

`savePerformance()` llamaba a `POST /api/performances` (endpoint **legacy**)
que escribía en `performances.event_id` (TEXT, FK → `events.id` legacy).
Pero el frontend enviaba UUIDs de `events_master`. Resultado: FK violada → 500.

**Fix:** migrar a `POST /api/events-v2/:id/participations` (endpoint v2,
escribe en `event_participations`).

### Bug #3 — HALL-066-ter (Backend)

**Archivo:** `src/utils/eventSchemas.js` (línea 242)
**Commit fix:** `6d09ba3`

`CreateParticipationSchema.user_id` esperaba `z.string().uuid()`. Pero el
frontend enviaba `user_id: 1` (INTEGER de `users.user_id`). Zod rechazaba
con 400 "Payload inválido".

**Fix:** `z.union([z.string().uuid(), z.number().int().positive()])`.

### Bug #4 — HALL-066-quater (Backend)

**Archivo:** `src/controllers/events-v2.controller.js` (línea 679)
**Commit fix:** `0731c31`

Aunque el schema Zod ya aceptaba INTEGER, el controller insertaba ese INTEGER
directo en `event_participations.user_id` (columna UUID). Postgres rechazaba
con error de tipo.

**Fix:** resolver `user_id` INTEGER → UUID consultando `users` antes del INSERT.

### Bug #5 — HALL-066-quinquies (Backend)

**Archivo:** `src/controllers/events-v2.controller.js` (línea 648)
**Commit fix:** `7157492`

`.select()` de `createParticipation` solo traía `id, type, status, name`.
Al pasar el evento a `validateSubmissionWindow(event)`, este leía
`submission_opens_at` y `submission_closes_at` — que no venían. Resultado:
`SUBMISSION_WINDOW_NOT_SET`.

**Fix:** expandir el select a `id, type, status, name, submission_opens_at, submission_closes_at`.

### Bug #6 — HALL-066-sexies (Service Worker)

**Archivo:** `sw.js` (línea 12)
**Commit fix:** `4cab228`

El Service Worker servía `js/performance.js` **viejo** desde caché. El fix del
frontend no llegaba al navegador del piloto.

**Fix:** bump `CACHE_NAME` a `PARAGUAY-FFAA-METALSTORM-v4.5.2-hotfix`.

---

## 3. Timeline

| Fecha/Hora | Evento |
|---|---|
| 2026-09-21 ~22:00 PY | Detección inicial (bug #1: form no aparece) |
| 2026-09-21 ~23:00 PY | Fix #1 aplicado + deploy |
| 2026-09-21 ~23:30 PY | Form aparece pero POST falla (bug #2) |
| 2026-09-22 00:00 UTC | Diagnóstico completo de la cadena de 6 bugs |
| 2026-09-22 01:00 UTC | Aplicados los 5 fixes restantes |
| 2026-09-22 02:00 UTC | Commit + push + deploy |
| 2026-09-22 02:15 UTC | Smoke test OK |

---

## 4. Causa Raíz Arquitectónica

**Migración incompleta `events` → `events_master` (ADR-008).**

- La tabla legacy `events` (id TEXT, 8 columnas) siguió viva.
- La tabla nueva `events_master` (id UUID, 40+ columnas) se creó en v4.1.0.
- El endpoint legacy `POST /api/performances` seguía insertando en `performances.event_id` (TEXT, FK → `events.id`).
- Pero el frontend ya enviaba UUIDs de `events_master`.

**Conclusión:** toda migración de tablas debe incluir la migración de **todos
los clientes** en el mismo release. Dejar la mitad migrada es una bomba de tiempo.

---

## 5. Fix Aplicado (v4.5.2-hotfix)

### Commits

| # | Commit | Descripción |
|---|---|---|
| 1 | `1614c13` | fix(views): respeta isGracePeriod en displayEventInfo |
| 2 | `28e3cf7` | fix(events-v2): normalizeEvent usa ventana real |
| 3 | `6d872ae` | fix(performance): migrar savePerformance a events-v2 |
| 4 | `b3c1f00` | fix(events-v2): relajar check de status, usar validateSubmissionWindow |
| 5 | `4cab228` | chore(sw): bump CACHE_NAME a v4.5.2-hotfix |
| 6 | `6d09ba3` | fix(schemas): user_id acepta INTEGER o UUID |
| 7 | `0731c31` | fix(events-v2): resolver user_id INTEGER a UUID |
| 8 | `7157492` | fix(performance): preferir _user.id (UUID) en payload |

### Archivos modificados

| Archivo | Cambio |
|---|---|
| `js/views.js` | `isGracePeriod` declarado antes de `subText` |
| `js/performance.js` | Migrado a `POST /api/events-v2/:id/participations` |
| `js/performance.js` | `_targetUserId` prefiere `_user.id` (UUID) |
| `src/utils/eventSchemas.js` | `user_id` acepta INTEGER o UUID |
| `src/controllers/events-v2.controller.js` | Resolución INTEGER→UUID + `validateSubmissionWindow` + select completo |
| `sw.js` | `CACHE_NAME` → `v4.5.2-hotfix` |

---

## 6. Verificación

### Tests de sintaxis

```
node --check js\views.js                    → ✓ silencio
node --check js\performance.js              → ✓ silencio
node --check src\utils\eventSchemas.js     → ✓ silencio
node --check src\controllers\events-v2.controller.js → ✓ silencio
node --check sw.js                           → ✓ silencio
```

### Deploy

- **Deployment ID:** `deployment-01M33KQSV9MYTYV7GS3W8XDW8V`
- **Rolling deploy:** `[1/2]` y `[2/2]` OK
- **DNS:** verificado
- **Health check:** OK

### Smoke test

- ✅ Formulario muestra "📝 PERÍODO DE CARGA"
- ✅ POST a `/api/events-v2/04feaccb-.../participations` → **201 Created**
- ✅ Toast "✅ Rendimiento registrado correctamente"
- ✅ Supabase: fila insertada en `event_participations`

---

## 7. Lecciones Aprendidas

1. **La ventana manda, no el status.** Un evento `CLOSED` con ventana abierta
   acepta cargas.
2. **Los schemas Zod deben tolerar ambos identificadores.** El proyecto tiene
   `users.user_id` (INTEGER) y `users.id` (UUID).
3. **Los `.select()` deben traer todo lo que el validador necesita.**
4. **El `CACHE_NAME` se bumpea en cada hotfix de frontend.**
5. **La migración de tablas requiere migrar todos los clientes.**

---

## 8. Referencias

- `docs/HANDOFF-v4.5.2-hotfix.md`
- `docs/adr/ADR-008-update.md`
- `CHANGELOG.md` — sección `[4.5.2]`
- `CURRENT_STATE.md` — sección "Hotfix v4.5.2"

---

**PARAGUAY FFAA [PRY] · HALL-066-completo · 2026-09-22**
