# 🔄 HANDOFF — v4.8.23 (2026-10-12)

## Contexto

Sesión de continuación tras HANDOFF v4.8.22. Se cerró el **Sprint 7** (Preparación
para Torneos, 7/8 ítems) y se arrancó la **implementación técnica del sistema
de torneos (RFC-002 / Anexo III)**, comenzando por la Fase F1.1 (migración SQL).

La sesión se ejecutó en 2 bloques:
1. **Reconocimiento del entorno** (Fase 0 — sin código).
2. **Implementación F1.1** (migración SQL de las 5 tablas del modelo de torneos).

---

## Resumen de la sesión

### 1. Fase 0 — Reconocimiento (sin código)

**Objetivo:** entender el modelo de datos actual y definir el contrato de las
tablas nuevas antes de escribir una sola línea de SQL.

**Verificado:**

- Versión `v4.8.22`, commit `5e4f1bd`.
- Tests: **507 passed / 0 skipped / 0 failed** (26 files, 3.01s).
- Última migración en `sql/`: `044_fix_users_user_id_nullable.sql`.
- Directorio `scripts/`: 9 archivos `.cjs` (ninguno de backup pre-migración).
- Plan de Supabase: **Free** (sin backups automáticos).
- `psql` local: **no instalado**.
- Las 5 tablas de torneos: **NO existían** antes de la migración.

**Decisiones tomadas con el OWNER (8 decisiones):**

| # | Decisión | Valor |
|---|---|---|
| 1 | PK de `tournaments` | **UUID** (consistente con `events_master`, `mentorships`) |
| 2 | Participantes | **Equipos** con roster JSONB (no pilotos individuales) |
| 3 | Draft | **Por partida** (`game_number` en Bo3/Bo5) |
| 4 | Bracket | **Reconstruible** desde `tournament_matches` (sin snapshot) |
| 5 | GRANT + RLS | **Explícitos** desde la migración (BL-030) |
| 6 | Moderador | **Campo `moderator_id` + tabla de historial** |
| 7 | Middleware RBAC | **`requireTournamentModerator`** (VETERANO/MIEMBRO pueden moderar 1 torneo) |
| 8 | Endpoint de moderador | **`PATCH /api/tournaments/:id/moderator`** |

**Justificación de las 5 tablas (no 4):** el RFC-002 §4 proponía 4 tablas, pero
la figura del moderador (Anexo III Art. 24.3) requiere trazabilidad de cambios.
Se agregó `tournament_moderator_history` como tabla de auditoría, siguiendo
el patrón de `user_nick_changes` y `mentorship_logs`.

---

### 2. F1.1 — Migración SQL (cerrada)

**Entregable:** `sql/045_tournaments.sql` (12.327 bytes).

**Contenido:**

- **5 tablas:** `tournaments`, `tournament_participants`, `tournament_matches`,
  `tournament_drafts`, `tournament_moderator_history`.
- **12 índices** (incluye 3 índices parciales `WHERE ... IS NOT NULL`).
- **15 CHECK constraints** para enums (`status`, `format`, `scope`, `phase`,
  `action`) y validaciones lógicas (`ends_at > starts_at`, `max_teams >= min_teams`).
- **16 comentarios** en tablas y columnas críticas.
- **5 GRANTs explícitos** a `service_role` (cumple BL-030).
- **5 políticas RLS** `no_public_access` (patrón del proyecto).

**Aplicación en Supabase:**

Se aplicó en **3 bloques** vía SQL Editor del Dashboard:

| Bloque | Contenido | Resultado |
|---|---|---|
| 1 | 5 CREATE TABLE + constraints | `Success. No rows returned.` |
| 2 | Índices + comentarios | `Success. No rows returned.` |
| 3 | GRANTs + RLS | `Success. No rows returned.` |

**Verificación post-migración:**

| Query | Resultado | Estado |
|---|---|---|
| `information_schema.tables LIKE 'tournament%'` | 5 tablas | ✅ |
| Columnas por tabla | 14/7/15/8/7 (correctas) | ✅ |
| `pg_tables.rowsecurity` | 5/5 con `true` | ✅ |
| `pg_policies` con nombre `no_public_access` | 5 filas | ✅ |
| `role_table_grants` a `service_role` | 35 grants (20 explícitos + 15 heredados) | ✅ |

**Commits:**

- `69f988b` — `feat(tournaments): migración SQL F1.1 - 5 tablas RFC-002/Anexo III`

**Backup pre-migración:**

- `backups/pre-045-commit.txt` (snapshot del HEAD antes de aplicar).
- `backups/pre-045-status.txt` (estado del working tree antes).

**Nota:** no fue un backup de datos real (Plan Free sin `pg_dump`), pero la
migración fue **puramente aditiva** (sin DROP/ALTER/UPDATE a tablas existentes),
por lo que el riesgo de pérdida de datos fue cero.

---

## Hallazgos de la sesión

| ID | Descripción | Severidad | Estado |
|---|---|---|---|
| **H-TORN-01** | No existe script `backup-before-migration.cjs` en el repo. El proyecto no tiene ritual de backup pre-migración. | BAJA | 📝 Documentar en HANDOFF |
| **H-TORN-02** | Dos archivos `036_*.sql` comparten número (`036_nick_change_tracking.sql` + `036_verify_hall_066.sql`). La convención `NNN_nombre.sql` se rompe. | BAJA | 📝 No urgente |
| **H-TORN-03** | El SQL Editor de Supabase solo muestra el resultado de la ÚLTIMA query cuando se ejecutan múltiples. Hubo que correr 4 queries por separado. | BAJA | 📝 Documentar |
| **H-TORN-04** | `information_schema.role_table_grants` reporta 35 filas en lugar de 20. Los 15 extra son grants heredados de Supabase. No es un problema, pero conviene saberlo. | INFO | ✅ Verificado |

---

## Estado del repositorio al cierre
Branch: main
69f988b (HEAD) feat(tournaments): migración SQL F1.1 - 5 tablas RFC-002/Anexo III
5e4f1bd Merge pull request #21 from release-please
945a791 chore(main): release 4.8.22
539df74 docs(plan-trabajo): Sprint 7 7/8 + RFC-002 cerrado
164fe82 docs(backlog): cerrar RFC-002
d1f04c7 docs(handoff): corregir estructura (F3 truncada + footer + RFC-002)

**Pendiente:** commit del plan formal (HANDOFF + ADR-011 + PLAN_TRABAJO_TORNEOS).

---

## Estado del Sprint 7

**Progreso:** 7/8 ítems cerrados. Sprint 7 formalmente completo.

| ID | Categoría | Descripción | Estado |
|---|---|---|---|
| BL-023 | 🏗️ | Encoding LF (.gitattributes + .editorconfig) | ✅ Cerrado |
| BL-033 | 🏗️ | Drift DDL `users.user_id` nullability | ✅ Cerrado |
| FIX-316 | 🏗️ | Eliminar `admin.users.routes.js` (código muerto) | ✅ Cerrado |
| TESTS-AERONAVES | 🧪 | Tests de aeronaves (95 casos) | ✅ Cerrado |
| BL-025 | 🧪 | Re-implementar tests skipeados (54 des-skipeados) | ✅ Cerrado |
| BL-032 | 🏗️ | Reorganizar mocks en `tests/helpers/` | ✅ Cerrado |
| RFC-002 | 📚 | RFC del sistema de torneos internos | ✅ Cerrado |
| BL-024 | 🔐 | Eliminar `unsafe-inline` del CSP | ⏳ Diferido (Sprint 8+) |

---

## Estado del Sprint 8 (recién abierto)

**Sprint 8 — Sistema de Torneos (RFC-002 / F1)**

**Progreso:** F1.1 cerrado.

| ID | Categoría | Descripción | Estado |
|---|---|---|---|
| F1.1 | 🗄️ | Migración SQL (5 tablas + RLS + GRANTs) | ✅ Cerrado |
| F1.2 | 🧪 | Schemas Zod para los 6 endpoints | ⏳ Pendiente |
| F1.3 | 🏗️ | Controller `tournaments.controller.js` + endpoints | ⏳ Pendiente |
| F1.4 | 🏗️ | Routes + mount en `server.js` | ⏳ Pendiente |
| F1.5 | 🎨 | Frontend (bracket, draft, resultados) | ⏳ Pendiente |
| F1.6 | 🤖 | Integración Discord (opcional) | ⏳ Pendiente |

**Documentos de fase:**

- `docs/planning/PLAN_TRABAJO_TORNEOS.md` (a crear en esta sesión).
- `docs/adr/ADR-011-sistema-torneos.md` (a crear en esta sesión).
- `docs/rfc/RFC-002-sistema-torneos.md` (✅ Accepted).
- `docs/normativa/ANEXO-III-torneos.md` (v1.0).

---

## Próximos pasos sugeridos

1. **Formalizar Sprint 8** (esta sesión):
   - Crear `PLAN_TRABAJO_TORNEOS.md`.
   - Crear `ADR-011-sistema-torneos.md`.
   - Actualizar `PLAN_TRABAJO.md` (Sprint 8).
   - Actualizar `BACKLOG.md` (F1.1 → Completados).
   - Commit único `docs(tournaments): plan F1 + ADR-011`.

2. **Arrancar F1.2** (schemas Zod):
   - 6 schemas en `src/utils/schemas.js`.
   - Tests en `tests/schemas/tournament.schemas.test.js` (≥12 casos).
   - Commit `feat(tournaments): schemas Zod F1.2`.

3. **F1.3 → F1.6** en sesiones siguientes.

---

## Nomenclatura institucional adoptada

Tras análisis de marketing y consistencia, se adoptó **estructura de 3 niveles**:

| Nivel | Nombre | Uso |
|---|---|---|
| **Institucional** | `C4ISR-Tournaments \| PARAGUAY-FFAA` | Docs, RFC, header de vista |
| **Operativo** | `🏆 Torneos` | Menú del piloto, título de vista |
| **Técnico** | `tournaments` | Endpoints, tablas, código |

**Razón:** consistencia con la marca `C4ISR` ya instalada + mantención de
convención en inglés para el código + brevedad en UI.

---

## Referencias

- **Handoff anterior:** `docs/handoffs/HANDOFF-v4.8.22.md`
- **RFC-002:** `docs/rfc/RFC-002-sistema-torneos.md` (✅ Accepted)
- **Anexo III:** `docs/normativa/ANEXO-III-torneos.md` (v1.0)
- **Normativa v3.0 borrador:** `docs/normativa/normativa-v3.0-borrador.md`
- **Migración aplicada:** `sql/045_tournaments.sql`
- **Tests helper README:** `tests/helpers/README.md`
- **Repo:** https://github.com/paraguayffaametalstorm-debug/ffaa-paraguay-classic

---

**PARAGUAY FFAA `[PRY]` — Escuadrón Oficial MetalStorm**
**Handoff v4.8.23 · 2026-10-12**