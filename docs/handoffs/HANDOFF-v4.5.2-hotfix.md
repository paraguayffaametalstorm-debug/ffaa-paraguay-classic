# HANDOFF — v4.5.2-hotfix (HALL-066)

> **Fecha:** 2026-09-22 04:04:33 UTC
> **Estado:** ✅ FASE 5 completa · FASE 6 (deploy) completa
> **Responsable:** Comando C4ISR

---

## 1. Resumen Ejecutivo

Se resolvió una **cadena de 6 bugs** (frontend, backend, SW) que impedía a los
pilotos cargar performance del evento W38 en período de gracia (ADR-008).

Todos los fixes están en producción. El sistema está 100% operativo.

---

## 2. Cadena de Bugs

| # | ID | Capa | Descripción |
|---|---|---|---|
| 1 | HALL-066 | Frontend | `isGracePeriod` usado antes de declararse |
| 2 | HALL-066-bis | Frontend | `savePerformance()` llamaba a endpoint legacy |
| 3 | HALL-066-ter | Backend | Schema Zod esperaba UUID, recibía INTEGER |
| 4 | HALL-066-quater | Backend | `user_id` INTEGER no resuelto a UUID |
| 5 | HALL-066-quinquies | Backend | `.select()` incompleto |
| 6 | HALL-066-sexies | SW | Caché no invalidado |

---

## 3. Commits Desplegados (8 totales)

| # | Commit | Descripción |
|---|---|---|
| 1 | `1614c13` | fix(views): respeta isGracePeriod |
| 2 | `28e3cf7` | fix(events-v2): normalizeEvent usa ventana real |
| 3 | `6d872ae` | fix(performance): migrar a events-v2 |
| 4 | `b3c1f00` | fix(events-v2): usar validateSubmissionWindow |
| 5 | `4cab228` | chore(sw): bump CACHE_NAME |
| 6 | `6d09ba3` | fix(schemas): user_id acepta INTEGER o UUID |
| 7 | `0731c31` | fix(events-v2): resolver INTEGER → UUID |
| 8 | `7157492` | fix(performance): preferir _user.id (UUID) |

---

## 4. Archivos Modificados

### Backend

- `src/utils/eventSchemas.js`
- `src/controllers/events-v2.controller.js`

### Frontend

- `js/views.js`
- `js/performance.js`

### Service Worker

- `sw.js`

### Documentación

- `CHANGELOG.md`
- `CURRENT_STATE.md`
- `ARCHITECTURE.md`
- `API_REFERENCE.md`
- `DEPLOYMENT_STATE.md`
- `DEPLOYMENT_GUIDE.md`
- `README.md`
- `PWA_SETUP.md`
- `USER_MANUAL.md`
- `BACKLOG.md`
- `PLAN_TRABAJO.md`
- `docs/incidentes/HALL-066-completo.md`
- `docs/HANDOFF-v4.5.2-hotfix.md`
- `docs/adr/ADR-008-update.md`

---

## 5. Verificación

### Tests de sintaxis

```
node --check js\views.js                    → ✓
node --check js\performance.js              → ✓
node --check src\utils\eventSchemas.js     → ✓
node --check src\controllers\events-v2.controller.js → ✓
node --check sw.js                           → ✓
```

### Deploy

- **ID:** `deployment-01M33KQSV9MYTYV7GS3W8XDW8V`
- **Estrategia:** rolling, sin downtime
- **Health:** OK

### Smoke test

- ✅ Formulario muestra "📝 PERÍODO DE CARGA"
- ✅ POST a `/api/events-v2/04feaccb-.../participations` → 201
- ✅ Toast verde
- ✅ Supabase: fila insertada

---

## 6. Reglas de Negocio Consolidadas

1. **La ventana manda, no el status.** Un evento `CLOSED` con ventana abierta
   acepta participaciones.
2. **Los schemas Zod aceptan ambos identificadores.**
3. **Los `.select()` deben traer todo lo que el validador necesita.**
4. **El `CACHE_NAME` se bumpea en cada hotfix de frontend.**
5. **La migración de tablas requiere migrar todos los clientes.**

---

## 7. Pendientes Post-Hotfix

| # | Tarea | Cuándo | Esfuerzo |
|---|---|---|---|
| 1 | Verificar W39 el jueves 24/09 12:00 UTC | Jue 24/09 | 10 min |
| 2 | DROP tablas BM legacy (F4.5) | Post 26/09 | 10 min |
| 3 | Reportar tzdata a Supabase | Asap | 15 min |
| 4 | Sprint 1 del PLAN_TRABAJO (8 hallazgos) | Próximas 2 semanas | 4-6 h |

---

## 8. Referencias

- `docs/incidentes/HALL-066-completo.md` — post-mortem detallado
- `docs/adr/ADR-008-update.md` — anexo con lecciones
- `CHANGELOG.md` — `[4.5.2]`
- `CURRENT_STATE.md` — sección "Hotfix v4.5.2"

---

**PARAGUAY FFAA [PRY] · HANDOFF v4.5.2-hotfix · 2026-09-22**
