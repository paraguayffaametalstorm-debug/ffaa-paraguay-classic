# 🔄 HANDOFF — v4.8.20 (2026-10-11)

## Contexto

Sesión de continuación tras HANDOFF v4.8.19. Se cerraron 3 ítems del Sprint 7
(quick wins de deuda técnica) + se declaró el Sprint 7 formalmente + se creó
el RFC-002 del sistema de torneos.

La sesión empezó con la decisión de avanzar en 3 frentes simultáneos
(A: quick wins, B: tests de aeronaves, C: RFC del torneo) y se ejecutaron
los pasos previos obligatorios (documentación de gobierno + quick wins).

---

## Resumen de la sesión

### 1. Setup documental — Sprint 7 declarado

Se creó el script `scripts/dev-all.cjs` que:

- Actualiza `ROADMAP.md` con fecha actual.
- Actualiza `CURRENT_STATE.md` con versión real.
- Agrega el **Sprint 7** formal a `PLAN_TRABAJO.md`.
- Crea 2 documentos nuevos.

**Documentos creados:**
- `docs/planning/PLAN_TRABAJO_TESTS_AERONAVES.md` — plan de la fase de tests del sistema de aeronaves.
- `docs/rfc/RFC-002-sistema-torneos.md` — propuesta del sistema de torneos (estado Draft).

**Commit:** `98e77f1` — `docs: setup Sprint 7 + plan tests de aeronaves + RFC-002 torneos`.

### 2. Scripts de automatización

Se agregaron 2 scripts al repo (patrón del proyecto: DRY-RUN por defecto, `--apply`, backup, verificación post-cambio):

- `scripts/dev-all.cjs` — setup de documentos de desarrollo continuo.
- `scripts/dev-quickwins.cjs` — aplicación de quick wins del Sprint 7.

**Commit:** `e17819f` — `chore(scripts): agregar scripts de setup documental y quick wins`.

### 3. Quick wins — 3 ítems cerrados

**BL-023 — Encoding LF:**
- Creado `.gitattributes` (normaliza LF en todo el repo).
- Creado `.editorconfig` (end_of_line=lf por defecto).
- Efecto inmediato: los warnings CRLF dejaron de aparecer en commits subsecuentes.

**BL-033 — Drift DDL `users.user_id` nullability:**
- Creado `sql/044_fix_users_user_id_nullable.sql`.
- Aplicado en Supabase: `user_id` ahora es `NOT NULL` (alineado al DDL).
- Verificado en SQL Editor: `user_id | integer | NO`.

**FIX-316 — Código muerto:**
- Eliminado `src/routes/admin.users.routes.js` (no montado en `server.js`, usaba middleware inexistente, exponía `password_hash`).

**Commits:**
- `059a32a` — `chore(sprint7): quick wins — encoding LF + drift user_id + código muerto`
- `8cdd8b5` — `fix(sql): BL-033 - user_id NOT NULL (alinear BD al DDL)`

### 4. BACKLOG.md actualizado

- BL-023, BL-033, FIX-316 movidos a ✅ Completados.
- Métricas: **16 activos / 14 completados** (era 19/11).

**Commit:** `1b97ebc` — `docs(backlog): cerrar BL-023 + BL-033 + FIX-316 (quick wins Sprint 7)`.

---

## Estado del repositorio al cierre
8cdd8b5 (HEAD -> main, origin/main) fix(sql): BL-033 - user_id NOT NULL (alinear BD al DDL)
1b97ebc docs(backlog): cerrar BL-023 + BL-033 + FIX-316 (quick wins Sprint 7)
059a32a chore(sprint7): quick wins — encoding LF + drift user_id + código muerto
e17819f chore(scripts): agregar scripts de setup documental y quick wins
98e77f1 docs: setup Sprint 7 + plan tests de aeronaves + RFC-002 torneos
e92babc Merge pull request #17 from release-please
230d762 chore(main): release 4.8.19


**Todo pusheado a `origin/main`.**

---

## Estado de Sprint 7

**Progreso:** 3/8 ítems cerrados.

| ID | Categoría | Descripción | Estado |
|---|---|---|---|
| **BL-023** | 🏗️ | Encoding LF (.gitattributes + .editorconfig) | ✅ Cerrado |
| **BL-033** | 🏗️ | Drift DDL `users.user_id` nullability | ✅ Cerrado |
| **FIX-316** | 🏗️ | Eliminar `admin.users.routes.js` (código muerto) | ✅ Cerrado |
| **BL-025** | 🧪 | Re-implementar 39 tests skipeados | ⏳ Pendiente |
| **BL-032** | 🏗️ | Unificar 4 variantes de mock Supabase | ⏳ Pendiente (depende de BL-025) |
| **TESTS-AERONAVES** | 🧪 | Tests de `planes.controller.js` + `plane-models.controller.js` | ⏳ Pendiente |
| **RFC-002** | 📚 | RFC del sistema de torneos internos | 📝 Draft (esperando review OWNER) |
| **BL-024** | 🔐 | Eliminar `unsafe-inline` del CSP | ⏳ Diferido |

---

## Dependencias entre ítems pendientes
BL-032 ──depende de──> BL-025
TESTS-AERONAVES ──bloquea──> RFC-002 (implementación del torneo)
RFC-002 ──solo requiere──> respuestas OWNER (no bloquea código

**RFC-002** es independiente del código. Se puede aprobar en paralelo mientras se trabaja en otro ítem.

---

## Decisión de próximo paso (conforme a la documentación)

**Orden conforme a las reglas del proyecto:**

1. **TESTS-AERONAVES** — prerequisito del torneo, deuda técnica más grande del proyecto (18 endpoints sin cobertura).
2. **BL-025** — deuda técnica de tests del Sprint 3 (39 skipeados).
3. **BL-032** — depende de BL-025.
4. **RFC-002** — aprobación OWNER (paralelo, sin código).
5. **BL-024** — diferido a Sprint 8+.

**Razones (de la documentación):**
- `RFC-002 §7` declara TESTS-AERONAVES como prerequisito obligatorio.
- `PLAN_TRABAJO.md §0` regla #2: un ítem = un PR.
- `PLAN_TRABAJO.md §0` regla #3: criterio de aceptación medible.
- `PLAN_TRABAJO.md §13`: no iniciar Sprint 8 sin cerrar Sprint 7.

---

## Pendientes para la próxima sesión

### Próximo ítem: TESTS-AERONAVES

**Plan:** ver `docs/planning/PLAN_TRABAJO_TESTS_AERONAVES.md`.

**Fases:**
- **F1:** tests unitarios de `plane-models.controller.js` (~15 casos).
- **F2:** tests unitarios de `planes.controller.js` (~40 casos).
- **F3:** tests de integración del catálogo combinado (`getFullCatalogModels`).

**Esfuerzo:** L (3-5 días según estimación).

**Criterio de cierre:**
- 18 endpoints con al menos 1 test cada uno.
- `npm test` pasa 100%.
- 0 regresiones.

### Sobre RFC-002 (paralelo)

El OWNER puede responder las 5 preguntas de negocio del RFC-002 en cualquier
momento, sin bloquear el trabajo en TESTS-AERONAVES:

1. Formato del primer torneo (eliminación / round-robin / ambos).
2. Tamaño (8, 16, variable).
3. Duración (1 fin de semana, 1-2 semanas, 1 mes).
4. Cómo se juegan las partidas.
5. Premios (simbólicos / oro del juego / nada).

---

## Scripts de automatización disponibles

| Script | Propósito | Uso |
|---|---|---|
| `scripts/dev-all.cjs` | Setup de documentos de desarrollo continuo | `node scripts/dev-all.cjs --apply` |
| `scripts/dev-quickwins.cjs` | Aplicación de quick wins del Sprint 7 | `node scripts/dev-quickwins.cjs --apply` |

**Patrón:** DRY-RUN por defecto. `--apply` para ejecutar. `--no-push` para commit local sin push.

---

## Notas para la próxima sesión

1. **`release-please` puede pushear mientras trabajamos.** Resolución estándar: `git pull --rebase origin main && git push origin main`.

2. **Los scripts tienen `CRLF will be replaced by LF` warnings** al hacer `git add`. Eso es de ahora en más normal — `.gitattributes` los normaliza al commitear.

3. **Todos los SQL nuevos deben incluir `GRANT` explícito para `service_role`** (política Supabase post-30-oct-2026, ref: BL-030).

4. **El script `dev-quickwins.cjs` verificó 4 checks post-cambio.** Todos pasaron. El patrón de verificación es robusto y reusable.

5. **El commit `8cdd8b5` corrigió el error inicial** de `sql/044` (DROP NOT NULL → SET NOT NULL). Lección aprendida: **el DDL es la fuente de verdad, no la BD**.

---

## Referencias

- **Handoff anterior:** `docs/handoffs/HANDOFF-v4.8.19.md`
- **CHANGELOG:** `CHANGELOG.md`
- **BACKLOG:** `docs/planning/BACKLOG.md` (16 activos / 14 completados)
- **PLAN_TRABAJO:** `docs/planning/PLAN_TRABAJO.md` (Sprint 7 en curso)
- **PLAN_TRABAJO_TESTS_AERONAVES:** `docs/planning/PLAN_TRABAJO_TESTS_AERONAVES.md`
- **RFC-002:** `docs/rfc/RFC-002-sistema-torneos.md` (Draft)
- **Scripts nuevos:** `scripts/dev-all.cjs`, `scripts/dev-quickwins.cjs`
- **SQL nuevo:** `sql/044_fix_users_user_id_nullable.sql`
- **Repo:** https://github.com/paraguayffaametalstorm-debug/ffaa-paraguay-classic

---

**PARAGUAY FFAA `[PRY]` — Escuadrón Oficial MetalStorm**
**Handoff v4.8.20 · 2026-10-11**