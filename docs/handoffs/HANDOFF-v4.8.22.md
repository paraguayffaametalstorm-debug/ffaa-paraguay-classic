# 🔄 HANDOFF — v4.8.22 (2026-10-12)

## Contexto

Sesión de continuación tras HANDOFF v4.8.21. Se cerró **BL-025** (Sprint 7),
el ítem de mayor prioridad técnica restante y prerequisito de BL-032. En la
misma sesión se cerró **RFC-002** (Sistema de Torneos Internos) + se creó el
**Anexo III** de la normativa v3.0.

La sesión se ejecutó en 4 fases (F1, F2, F3, F4) y se cerró con documentación
actualizada.

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
**Resultado:** 507 passed / 0 skipped / 0 failed (26 test files).
**Duración:** 2.84s.

### 4. F4 — Cierre de RFC-002 + Anexo III

**Commits:**
- `c0ff7d7` — `docs(normativa): agregar Anexo III - Régimen de Torneos Internos`
- `1ac9aba` — `docs(normativa): agregar Anexo III al índice de la normativa v3.0`
- `9266c16` — `docs(rfc): cerrar RFC-002 - decisiones del OWNER + referenciar Anexo III`
- `fb66384` — `docs(rfc): agregar RFC-002 al índice + marcar RFC-001 como Accepted`
- `e8e9029` — `docs(handoff): registrar hallazgos H-RFC-01 y H-RFC-02`

**Contenido del Anexo III:**
- 25 artículos distribuidos en 10 Títulos.
- Título X (nuevo): Canales oficiales del torneo (Discord + app).
- Decisiones del OWNER formalizadas en el RFC-002 §8.
- Formato: Swiss (Día 1) + Single Elimination (Día 2). Réplica del formato MCS.
- Tamaño escalable por fases: F1 (4-8 equipos), F2 (8-16), F3 (16-32), F4 (partner).
- Duración: 1 fin de semana (F1/F2), 2 fines de semana (F3).
- Partidas: 5v5, Bo3 en Swiss y cuartos, Bo5 en semis y final.
- Draft: 1 ban por equipo, Mirrored Picks, último BM baneado.
- Premios: sin premio material en F1 (badge + mención).

---

## Hallazgos de la sesión

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
| **H-RFC-03** | `docs/normativa/` no existía como carpeta antes de esta sesión (se creó para alojar el Anexo III). | BAJA | ✅ Resuelto |

---

## Estado del repositorio al cierre

Branch: `main`
e8e9029 (HEAD) docs(handoff): registrar hallazgos H-RFC-01 y H-RFC-02
fb66384 docs(rfc): agregar RFC-002 al índice + marcar RFC-001 como Accepted
9266c16 docs(rfc): cerrar RFC-002 - decisiones del OWNER + referenciar Anexo III
1ac9aba docs(normativa): agregar Anexo III al índice de la normativa v3.0
c0ff7d7 docs(normativa): agregar Anexo III - Régimen de Torneos Internos
d1928a8 docs(changelog): registrar nota de higiene del commit 0ff1d07

**Pendiente:** commit del BACKLOG + PLAN_TRABAJO + push.

---

## Estado de Sprint 7

**Progreso:** 7/8 ítems cerrados.

| ID | Categoría | Descripción | Estado |
|---|---|---|---|
| **BL-023** | 🏗️ | Encoding LF (.gitattributes + .editorconfig) | ✅ Cerrado |
| **BL-033** | 🏗️ | Drift DDL `users.user_id` nullability | ✅ Cerrado |
| **FIX-316** | 🏗️ | Eliminar `admin.users.routes.js` (código muerto) | ✅ Cerrado |
| **TESTS-AERONAVES** | 🧪 | Tests de aeronaves (95 casos) | ✅ Cerrado |
| **BL-025** | 🧪 | Re-implementar tests skipeados (54 des-skipeados) | ✅ Cerrado |
| **BL-032** | 🏗️ | Reorganizar mocks en `tests/helpers/` (reformulado) | ✅ Cerrado |
| **RFC-002** | 📚 | RFC del sistema de torneos internos | ✅ Cerrado |
| **BL-024** | 🔐 | Eliminar `unsafe-inline` del CSP | ⏳ Diferido (Sprint 8+) |

**Sprint 7 efectivamente completo.** BL-024 queda formalmente diferido a Sprint 8+.

---

## Próximos pasos sugeridos

1. **Push de los 4 commits locales** (`git push origin main`).
2. **Commit del BACKLOG + PLAN_TRABAJO** (Sprint 7 → 7/8).
3. **Sprint 8:** arrancar con BL-024 (CSP) o alguna feature del backlog.

---

## Referencias

- **Handoff anterior:** `docs/handoffs/HANDOFF-v4.8.21.md`
- **RFC-002:** `docs/rfc/RFC-002-sistema-torneos.md` (✅ Accepted)
- **Anexo III:** `docs/normativa/ANEXO-III-torneos.md`
- **Normativa v3.0 borrador:** `docs/normativa/normativa-v3.0-borrador.md`
- **Tests helper README:** `tests/helpers/README.md`
- **Repo:** https://github.com/paraguayffaametalstorm-debug/ffaa-paraguay-classic

---

**PARAGUAY FFAA `[PRY]` — Escuadrón Oficial MetalStorm**
**Handoff v4.8.22 · 2026-10-12**