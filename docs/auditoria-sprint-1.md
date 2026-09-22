# Auditoría Sprint 1 — Verificación de hallazgos externos

> **Fecha:** 2026-09-22
> **Auditor:** Arquitecto de Software Senior + OWNER
> **Fuente de hallazgos:** Auditoría externa (Gemini) sin acceso verificado al repo
> **Regla aplicada:** un hallazgo sin evidencia pegada NO es un hallazgo

---

## Resumen Ejecutivo

**8 hallazgos** reportados por la auditoría externa. Resultado:

| Categoría | Cantidad | Porcentaje |
|---|---|---|
| **CONFIRMADOS (totales o parciales)** | 4 | 50% |
| **DESCARTADOS (falsos positivos)** | 4 | 50% |
| **NO VERIFICABLES** | 0 | 0% |

**Conclusión crítica:** la auditoría externa tuvo **50% de alucinación**. La decisión de invertir el Sprint 1 en verificación **antes de tocar código** evitó ~40h de fixes inexistentes + riesgo de romper producción.

**Hallazgos adicionales** detectados por la verificación interna: 1 (HALL-S1-01).

**Regla respetada:** NO se modificó ningún archivo de código de producción durante el Sprint 1.

---

## Detalle de cada hallazgo

### [FIX-101] Reset password no atómico + falta invalidar sesiones
- **Estado:** 🟡 CONFIRMADO PARCIAL
- **Severidad real:** BAJA-MEDIA
- **Archivo verificado:** `src/controllers/auth.controller.js` (existe: sí)
- **Sub-afirmaciones:**
  - ✅ **CONFIRMADO** — "Reset no atómico": dos `UPDATE` secuenciales (`users`, luego `password_resets`) sin transacción. Si el segundo falla, el token queda reusable.
  - ❌ **DESCARTADO** — "Falta invalidar sesiones": `token_version++` está implementado y es funcional. Las sesiones previas SÍ quedan invalidadas por el middleware `requireAuth`.
- **Evidencia:**

  auth.controller.js:532 newTokenVersion = (user.token_version || 0) + 1
  auth.controller.js:539-549 UPDATE users (sin transacción)
  auth.controller.js:551-554 UPDATE password_resets (operación separada)

- **Acción:** pasa a Sprint 2. Fix propuesto: envolver en RPC de Postgres.
- **Esfuerzo:** S (4h).

---

### [FIX-102] IDOR en delete/update de aviones
- **Estado:** ❌ DESCARTADO
- **Razón:** los 4 endpoints que mutan aviones tienen ownership check explícito.
- **Evidencia:** los 4 endpoints (`updatePlane`, `deletePlane`, `updatePlaneSystem`, `updatePlaneSystems`) contienen:
  ```javascript
  if (String(existing.user_id) !== String(userId) && req.user.role !== 'ADMIN' && req.user.role !== 'OWNER') {
    return res.status(403).json({ ... error: 'FORBIDDEN' });
  }
Acción: no se toca código.

[FIX-103] CSP con unsafe-inline / unsafe-eval
Estado: 🟡 CONFIRMADO PARCIAL

Severidad real: MEDIA-ALTA

Archivo verificado: server.js (existe: sí)

Sub-afirmaciones:

✅ CONFIRMADO — 'unsafe-inline' en scriptSrc (línea 83).

✅ CONFIRMADO — 'unsafe-inline' en styleSrc (línea 93).

❌ DESCARTADO — 'unsafe-eval' no aparece en el archivo (verificado con findstr /I "unsafe-eval" server.js → sin coincidencias).

Análisis: unsafe-inline es deliberado: la SPA usa onclick="..." inline masivamente. Sin él, la app se rompe.

Acción: pasa a Sprint 2. Fix propuesto: migrar progresivamente a addEventListener + nonce/hash.

Esfuerzo: L (2-3 días).

[FIX-104] Fuga de detalles de DB en respuestas 500
Estado: ✅ CONFIRMADO

Severidad real: MEDIA

Archivo verificado: src/middlewares/errorHandler.js (existe: sí)

Evidencia:

javascript
errorHandler.js:44   error: err.message || 'Error interno del servidor táctico',
errorHandler.js:46   ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
Análisis: el err.message de errores de Supabase llega al cliente. stack solo se filtra en dev (✅ mitigado).

Acción: pasa a Sprint 2. Fix propuesto: mensaje genérico cuando statusCode >= 500.

Esfuerzo: XS (30 min).

[FIX-105] Race condition al abrir evento
Estado: 🟡 CONFIRMADO PARCIAL

Severidad real: MEDIA

Archivo verificado: src/controllers/events-v2.controller.js (existe: sí)

Evidencia:

events-v2.controller.js:355-372 SELECT OPEN actual + UPDATE a CLOSED (sin transacción)
events-v2.controller.js:378-388 UPDATE nuevo a OPEN (operación separada)

Análisis: la operación NO es atómica. El índice único idx_events_master_single_open previene corrupción, pero el request perdedor recibe 500 y puede quedar en estado inconsistente.

Acción: pasa a Sprint 2. Fix propuesto: transacción RPC o advisory lock.

Esfuerzo: S (4h).

[FIX-106] XSS por innerHTML sin escape
Estado: ❌ DESCARTADO

Razón: las funciones escapeHTML (views.js), escapeHtml (utils.js y bm.js) están correctamente definidas, exportadas globalmente y usadas consistentemente en todos los templates con datos de usuario.

Evidencia: findstr /I "escapeHtml" js\*.js muestra:

js\utils.js:function escapeHtml(text) { window.escapeHtml = escapeHtml; }
js\bm.js:function escapeHtml(text) { window.escapeHtml = escapeHtml; }
js\views.js:window.escapeHTML = function(str) { ... };

Y se invoca ~80 veces en views.js con datos de usuario (m.nick, p.event_id, plane.model_name, etc.).

Sub-verificación: el único lugar sin escapar es user.role en updateDashboardTacticalUI, pero el rol es controlado por el backend (lista blanca: MIEMBRO, VETERANO, ADMIN, OWNER). Riesgo BAJO.

Acción: no se toca código.

[FIX-107] RLS permisivo / falta bloqueo a anon
Estado: ❌ DESCARTADO

Razón: RLS está habilitado en ambas tablas con política deny-all (implícita).

Evidencia:

Query 1: relrowsecurity = true en events_master y event_participations.

Query 2: SELECT * FROM pg_policies WHERE tablename IN (...) → No rows returned.

Análisis técnico: cuando RLS está habilitado sin políticas, todos los roles excepto service_role (que tiene BYPASSRLS) quedan bloqueados. El backend usa service_role. El rol anon está bloqueado. El estado actual es seguro.

Nota (cosmética, no urgente): password_resets tiene una política explícita no_public_access; events_master y event_participations no. Ambos son seguros, pero por consistencia de estilo se podría agregar la política explícita en Sprint 4.

Acción: no se toca código en Sprint 2.

[FIX-108] N+1 en stats del escuadrón
Estado: ❌ DESCARTADO

Razón: no hay patrón N+1.

Evidencia: getStats ejecuta 2 queries (1 a users, 1 a performances). Todos los cálculos de stats (filter, reduce, find) se hacen en memoria sobre el array.

Acción: no se toca código.

Hallazgos derivados del Sprint 1 (no reportados por Gemini)
[HALL-S1-01] getPlaneDetails sin ownership check (lectura cruzada)
Estado: ✅ CONFIRMADO

Severidad real: MEDIA

Archivo: src/controllers/planes.controller.js (getPlaneDetails, línea ~600)

Descripción: cualquier usuario autenticado puede leer detalles (/api/planes/:id/details) de aviones de otros pilotos.

Impacto: privacidad de hangar comprometida.

Acción: pasa a Sprint 2. Fix propuesto: agregar check de ownership o restringir a ADMIN/OWNER.

Esfuerzo: XS (30 min).

Métricas del Sprint 1
Métrica	Valor
Hallazgos externos verificados	8/8
CONFIRMADOS	4 (50%)
DESCARTADOS	4 (50%)
NO VERIFICABLES	0
Hallazgos internos derivados	1 (HALL-S1-01)
Archivos de producción modificados	0
Duración real	~5h
Próximos pasos (Sprint 2)
Bloque 1 — ALTO:

FIX-103 — CSP unsafe-inline (L, 2-3 días)

Bloque 2 — MEDIO:

FIX-104 — Fuga de detalles en 500 (XS, 30 min)

FIX-105 — Race condition al abrir evento (S, 4h)

FIX-101 — Reset password no atómico (S, 4h)

HALL-S1-01 — Ownership check en getPlaneDetails (XS, 30 min)

Total estimado Sprint 2: 1-2 días de trabajo efectivo + tests + deploy.

Documento generado por el Sprint 1 — Verificación de código crítico.
NO se modificó ningún archivo de producción.


---

## Estado de cierre (actualizado 2026-09-22)

Verificación de los fixes confirmados en el Sprint 1, con sus commits de resolución en Sprint 2:

| ID | Hallazgo | Estado Sprint 1 | Estado Sprint 2 | Commit | Fecha |
|---|---|---|---|---|---|
| **FIX-104** | Filtro de detalles de DB en 500 | ✅ CONFIRMADO | ✅ **CERRADO** | `43db2a8` | 2026-09-22 |
| **HALL-S1-01** | Ownership check en `getPlaneDetails` | ✅ CONFIRMADO | ✅ **CERRADO** | `5fbb2d5` | 2026-09-22 |
| **HALL-S2-01** | Ampliación de poderes del ADMIN (reset, rol, status) | ➕ NUEVO | ✅ **CERRADO** | (ver CHANGELOG v4.5.5) | 2026-09-22 |
| **HALL-S2-02** | Dropdown de rol frontend no permite seleccionar ADMIN | ➕ NUEVO | ✅ **CERRADO** | `13501af` | 2026-09-22 |
| **FIX-101** | Transacción en `resetPassword` | 🟡 CONFIRMADO PARCIAL | ⏳ Pendiente | — | — |
| **FIX-105** | Transacción en `changeEventStatus` | 🟡 CONFIRMADO PARCIAL | ⏳ Pendiente | — | — |
| **FIX-103** | CSP unsafe-inline → nonce/hash | 🟡 CONFIRMADO PARCIAL | ⏳ Sprint 3 | — | — |

**Los 4 hallazgos descartados** (FIX-102, FIX-106, FIX-107, FIX-108) no requieren acción y quedan documentados en la sección principal.

---

## Evidencia de cierre — FIX-104

- **Commit:** `43db2a8` — `fix(fix-104): filtrar detalles de DB en respuestas 500`
- **Archivo:** `src/middlewares/errorHandler.js` (16 insertions, 3 deletions)
- **Tests:** 179/179 passing (Vitest 5.0.1)
- **Sintaxis:** `node --check` → OK
- **Deploy:** Fly.io `deployment-01M34FDGV3NYHVMEHHGKKYW95G`
- **Smoke test 1:** `/api/health` → `online` + uptime 4379s
- **Smoke test 2:** Login inválido → 401 con mensaje específico (4xx intacto)
- **Rollback:** `git revert 43db2a8 && git push origin main`

---

## Evidencia de cierre — HALL-S2-02

- **Commit:** `13501af` — `fix(hall-s2-02): habilitar opción ADMIN en dropdown de roles`
- **Archivo:** `js/views.js` (función `renderAdminMembersTable`, ~línea 5110)
- **Cambio:** Eliminada la condición `disabled` de la opción `ADMIN` del `<select>`.
- **Sintaxis:** `node --check js/views.js` → OK
- **Diff:** 1 inserción, 1 eliminación (cambio quirúrgico)
- **Deploy:** Fly.io `deployment-01M35PSP3XQ6QAH86CSXW88X4P`
- **Deploy sin downtime:** rolling deploy `[1/2]` y `[2/2]` OK
- **Smoke test:** Pendiente verificación visual del dropdown por el OWNER.
- **Rollback:** `git revert 13501af && git push origin main && fly deploy`
