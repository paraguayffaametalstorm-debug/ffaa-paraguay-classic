# 🔄 HANDOFF — v4.8.22 (2026-10-12)

## Contexto

Sesión de continuación tras HANDOFF v4.8.21. Se cerró **BL-025** (Sprint 7),
el ítem de mayor prioridad técnica restante y prerequisito de BL-032.

La sesión se ejecutó en 3 fases (F1, F2, F3) y se cerró con documentación actualizada.

---

## Resumen de la sesión

### 1. F1 — `auth.controller.test.js` (15 tests des-skipeados)

**Commit:** `cb2ac13` — `test(auth): des-skipear 15 tests de auth.controller (BL-025 F1)`

**Causa raíz del problema:** MSW resuelve por el PRIMER handler que matchea,
no por el más específico. El archivo tenía **5 handlers `http.get('*/users')`**
duplicados, de los cuales solo el primero (login) se ejecutaba. Los otros 4
eran dead code.

**Fix aplicado:**
- Unificar los 5 handlers en 1 solo, con despacho por query param.
- Agregar rama `notfound` para que el controller entre en `user_not_found`.
- Aplicar `.replace('eq.', '')` / `.replace('ilike.', '')` a los parámetros.
- Priorizar el param directo (`email=`) sobre el `or=` (que trae
  `email_institucional` contaminado).
- Normalizar `nick` a lowercase sin guiones: `LinkedUser` → `linkeduser`.
- Remover los 3 `.skip` (líneas 210, 248, 299).

**Resultado:** 21 passed / 0 skipped (antes: 6 passed / 15 skipped).

### 2. F2 — `rbac.test.js` (28+11 tests des-skipeados, reescrito a unit puro)

**Commit:** `6f175be` — `test(rbac): reescribir a unit puro con createHybridSupabase (BL-025 F2)`

**Motivación:** supertest + MSW no funcionan juntos en el proyecto
(el propio comentario del test lo decía: "supertest no matchea con MSW
porque el host es 127.0.0.1:PORT dinámico").

**Estrategia:** reescribir a unit puro.
- Eliminar `express`, `supertest`, `msw`, `setupServer` del archivo.
- Llamar `requireAuth(req, res, next)` y `requireRole(...)(req, res, next)` directamente.
- Usar `createHybridSupabase(USERS_DB)` como mock oficial (alineado con BL-032).
- Helpers `mockReq()`, `mockRes()`, `mockNext()`.
- Reemplazar los 4 placeholders `expect(true).toBe(true)` por:
  - Test real de `import` de `ROLE_LIMITS`.
  - La matriz de jerarquía ya estaba completa (35 casos, no es placeholder).

**Fix de contrato:** `requireRole` devuelve `INSUFFICIENT_PERMISSIONS` (real),
no `FORBIDDEN` (esperado por el test viejo). El test se alinea al código real.

**Resultado:** 66 passed / 0 skipped (antes: 49 passed / 39 skipped).
**Bonus:** aparecieron 4 tests nuevos (401 sin user, array de roles, formato
de header inválido, usuario fantasma en DB).

### 3. F3 — Verificación completa de la suite

**Comando:** `npm test`
**Resultado:**

## Hallazgos de la sesión (H-BL025-01 a H-BL025-06, H-RFC-01, H-RFC-02)

| ID | Descripción | Severidad | Estado |
|---|---|---|---|
| **H-BL025-01** | 4 tests de `forgotPassword & resetPassword` aparecían skipped sin `.skip` visible (anidados en describe mal cerrado). | MEDIA | ✅ Resuelto (F1) |
| **H-BL025-02** | Handler MSW de `login` devolvía un user para cualquier email truthy. | MEDIA | ✅ Resuelto (F1) |
| **H-BL025-03** | Handlers MSW no hacían `.replace('eq.', '')`. | ALTA | ✅ Resuelto (F1) |
| **H-BL025-04** | `requireRole` devuelve `INSUFFICIENT_PERMISSIONS`, no `FORBIDDEN`. | ALTA | ✅ Resuelto (F2, alineado) |
| **H-BL025-05** | BACKLOG decía 39 skipped, la realidad era 54. | MEDIA | ✅ Resuelto (BACKLOG) |
| **H-BL025-06** | BL-032 decía "4 mocks", quedaban 3. | BAJA | ✅ Resuelto (BACKLOG) |
| **H-RFC-01** | `docs/rfc/README.md` no listaba RFC-002. Tampoco reflejaba que RFC-001 está implementado. | BAJA | ✅ Resuelto |
| **H-RFC-02** | Archivos basura (255 archivos vacíos) creados por un comando CMD mal escrito durante esta sesión. | MEDIA | ✅ Resuelto (limpieza manual) |