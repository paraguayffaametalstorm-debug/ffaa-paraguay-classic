# 🔧 PLAN DE TRABAJO — Sistema de Torneos (RFC-002 / F1)

> **Plan de implementación del sistema de torneos internos (Fase 1).**
> **ADR de referencia:** [`docs/adr/ADR-011-sistema-torneos.md`](../adr/ADR-011-sistema-torneos.md)
> **RFC de referencia:** [`docs/rfc/RFC-002-sistema-torneos.md`](../rfc/RFC-002-sistema-torneos.md)
> **Reglamento:** [`docs/normativa/ANEXO-III-torneos.md`](../normativa/ANEXO-III-torneos.md)
> **Fecha:** 2026-10-12
> **Versión objetivo:** v4.9.0
> **Duración estimada:** 5-7 días
> **Estado:** 🔨 En curso (F1.1 cerrado)

---

## 1. Objetivo

Implementar el sistema de torneos internos del escuadrón conforme al
**RFC-002** y al **Anexo III de la normativa v3.0**.

El sistema reemplaza la gestión manual (planillas + Discord) por una
herramienta integrada en la app de control que permite:

- Registrar torneos y equipos.
- Generar y mantener el bracket (Swiss + Single Elimination).
- Coordinar el draft (1 ban + Mirrored Picks + último BM baneado).
- Registrar resultados por partida.
- Otorgar reconocimiento (badge + mención).
- Mantener historial completo de ediciones.

**Alcance F1 (esta fase):**

- Formato Swiss (Día 1) + Single Elimination (Día 2).
- 4-8 equipos.
- 5v5 (5 titulares + 1 suplente).
- Duración: 1 fin de semana.
- Sin premio material (badge + mención).
- Moderador designado por la Administración.

**Fuera de alcance F1 (fases futuras):**

- F2: torneos con anexos (8-16 equipos, fin de semana extendido).
- F3: torneos con aliados (16-32 equipos, 2 fines de semana).
- F4: partner oficial (a definir).
- Integración automática con Discord (bot de comandos).
- Notificaciones push de torneos.

---

## 2. Estado actual del sistema

| Aspecto | Valor |
|---|---|
| RFC-002 | ✅ Accepted (2026-10-11) |
| Anexo III | ✅ v1.0 (2026-10-12) |
| ADR-011 | ✅ Accepted (2026-10-12) |
| Tablas en Supabase | ✅ 5 tablas (F1.1 cerrado) |
| RLS + GRANTs | ✅ Aplicados (5 políticas, 35 grants) |
| `tournaments.controller.js` | ❌ No existe |
| `tournaments.routes.js` | ❌ No existe |
| `requireTournamentModerator` | ❌ No existe |
| Schemas Zod | ❌ No existen |
| Frontend (`tournaments.html`) | ❌ No existe |
| Tests del sistema | ❌ No existen |
| Endpoints activos | 0 de 8 |

---

## 3. Fases de implementación

### F1.1 — Migración SQL ✅ CERRADO (2026-10-12)

**Duración real:** 2 h
**Entregable:** `sql/045_tournaments.sql` aplicado en Supabase.

**Contenido entregado:**

- 5 tablas: `tournaments`, `tournament_participants`, `tournament_matches`,
  `tournament_drafts`, `tournament_moderator_history`.
- 12 índices (incluye 3 parciales con `WHERE ... IS NOT NULL`).
- 15 CHECK constraints para enums y validaciones lógicas.
- 16 comentarios en tablas y columnas críticas.
- 5 GRANTs explícitos a `service_role` (cierra BL-030 para estas tablas).
- 5 políticas RLS `no_public_access` (patrón del proyecto).

**Aplicación:**

- Bloque 1 (5 CREATE TABLE) → OK.
- Bloque 2 (índices + comentarios) → OK.
- Bloque 3 (GRANTs + RLS) → OK.

**Verificación:**

- 5 tablas confirmadas vía `information_schema.tables`.
- Columnas correctas: 14/7/15/8/7.
- RLS: 5/5 con `rowsecurity = true`.
- Políticas: 5 `no_public_access`.
- GRANTs: 35 (20 explícitos + 15 heredados).

**Criterio de cierre:**

- [x] 5 tablas creadas en Supabase.
- [x] RLS habilitado en las 5.
- [x] `service_role` con GRANT SELECT/INSERT/UPDATE/DELETE.
- [x] `anon`/`authenticated` sin GRANT.
- [x] Script idempotente (`CREATE TABLE IF NOT EXISTS`).

**Commit:** `69f988b` — `feat(tournaments): migración SQL F1.1 - 5 tablas RFC-002/Anexo III`.

**Riesgo:** bajo (aditivo, no toca tablas existentes).
**Rollback:** `DROP TABLE tournaments CASCADE;` (elimina las 5 por FK).

---

### F1.2 — Schemas Zod

**Duración:** 2-3 h
**Entregable:** schemas en `src/utils/schemas.js` + tests.

**Schemas a crear (6):**

| Schema | Uso | Endpoint |
|---|---|---|
| `TournamentCreateSchema` | Crear torneo | `POST /api/tournaments` |
| `TournamentUpdateStatusSchema` | Cambiar estado | `PATCH /api/tournaments/:id/status` |
| `TournamentRegisterTeamSchema` | Registrar equipo | `POST /api/tournaments/:id/register` |
| `TournamentMatchResultSchema` | Registrar resultado | `POST /api/tournaments/:id/matches/:mid/result` |
| `TournamentDraftActionSchema` | Registrar ban/pick | `POST /api/tournaments/:id/matches/:mid/draft` |
| `TournamentModeratorChangeSchema` | Reasignar moderador | `PATCH /api/tournaments/:id/moderator` |

**Validaciones clave:**

- `name`: 3-120 chars.
- `format`: enum `['SWISS+SE', 'ROUND_ROBIN+SE']`.
- `scope`: enum `['F1', 'F2', 'F3', 'F4']`.
- `status`: enum `['DRAFT', 'REGISTRATION', 'ONGOING', 'FINISHED', 'CANCELLED']`.
- `starts_at` / `ends_at`: ISO datetime + validación `ends_at > starts_at`.
- `min_teams` / `max_teams`: 2-32, `max_teams >= min_teams`.
- `roster`: array de objetos `{ user_id: UUID, role: TEXT, is_sub: BOOLEAN }`.
- `team_name`: 2-40 chars, único por torneo (validación en controller).
- `phase`: enum `['SWISS', 'QF', 'SF', 'FINAL']`.
- `best_of`: enum `[3, 5]`.
- `score_a` / `score_b`: enteros 0..best_of.
- `action`: enum `['BAN', 'PICK']`.
- `game_number`: 1..5.
- `order_index`: ≥1.
- `aircraft_id`: string (FK a `plane_models.id`).
- `moderator_id`: UUID + `reason` (5-500 chars).

**Tests:** `tests/schemas/tournament.schemas.test.js` con **≥12 casos**
(mínimo 2 por schema: 1 válido + 1 inválido).

**Criterio de cierre:**

- [ ] 6 schemas exportados desde `src/utils/schemas.js`.
- [ ] ≥12 casos de test pasando.
- [ ] 0 regresiones en tests existentes.

**Commit esperado:** `feat(tournaments): schemas Zod F1.2`.
**Riesgo:** bajo (aditivo, sin lógica).
**Rollback:** `git revert`.

---

### F1.3 — Controller + RBAC fino

**Duración:** 1-1.5 días
**Entregable:**

- `src/controllers/tournaments.controller.js` (nuevo).
- `src/middlewares/tournamentModerator.js` (nuevo).

**Endpoints a implementar (8):**

| Método | Endpoint | Middleware | Función |
|---|---|---|---|
| GET | `/api/tournaments` | `requireAuth` | Listar torneos con filtros |
| POST | `/api/tournaments` | `requireRole('ADMIN','OWNER')` | Crear torneo |
| GET | `/api/tournaments/:id` | `requireAuth` | Detalle + bracket + roster |
| PATCH | `/api/tournaments/:id/status` | `requireRole('ADMIN','OWNER')` | Cambiar estado |
| POST | `/api/tournaments/:id/register` | `requireAuth` | Registrar equipo |
| POST | `/api/tournaments/:id/matches/:mid/result` | `requireAuth` + `requireTournamentModerator` | Registrar resultado |
| POST | `/api/tournaments/:id/matches/:mid/draft` | `requireAuth` + `requireTournamentModerator` | Registrar ban/pick |
| PATCH | `/api/tournaments/:id/moderator` | `requireRole('ADMIN','OWNER')` | Reasignar moderador |

**RBAC fino (`requireTournamentModerator`):**

```javascript
export async function requireTournamentModerator(req, res, next) {
  const { id: tournamentId } = req.params;
  const { id: userId, role } = req.user;

  // OWNER/ADMIN pasan siempre
  if (role === 'OWNER' || role === 'ADMIN') return next();

  // Otros roles: verificar que sean moderadores del torneo
  const { data, error } = await getSupabase()
    .from('tournaments')
    .select('moderator_id')
    .eq('id', tournamentId)
    .single();

  if (error || !data) {
    return res.status(404).json({ code: 'TOURNAMENT_NOT_FOUND' });
  }

  if (String(data.moderator_id) === String(userId)) {
    return next();
  }

  return res.status(403).json({ code: 'TOURNAMENT_NOT_MODERATED_BY_YOU' });
}
```

**Lógica de negocio:**

- **Crear torneo:** valida fechas, `max_teams` según scope (F1: 4-8).
- **Registrar equipo:** valida que no exista `team_name` duplicado, que el
  torneo esté en `REGISTRATION`, y que el `captain_user_id` no esté ya
  inscripto en otro equipo del mismo torneo.
- **Cambiar estado:** transiciones válidas:
  `DRAFT → REGISTRATION → ONGOING → FINISHED` o `→ CANCELLED` (desde
  cualquier estado excepto `FINISHED`).
- **Registrar resultado:** valida Bo3/Bo5, actualiza `score_a`/`score_b`,
  marca `winner_id` cuando alguien gana, auto-avanza el bracket.
- **Registrar draft:** valida `game_number`, `order_index`, que la aeronave
  no esté baneada, que el último BM esté baneado automáticamente.
- **Reasignar moderador:** registra en `tournament_moderator_history` y en
  `audit_logs`.

**Criterio de cierre:**

- [ ] 8 endpoints operativos.
- [ ] Middleware `requireTournamentModerator` funcionando.
- [ ] Tests: VETERANO no-moderador recibe 403.
- [ ] Tests: VETERANO moderador puede registrar draft.
- [ ] Tests: OWNER puede operar cualquier torneo.
- [ ] Tests: MIEMBRO sin designación recibe 403.

**Commit esperado:** `feat(tournaments): controller + RBAC fino F1.3`.
**Riesgo:** medio (RBAC fino es sensible).
**Rollback:** `git revert` + quitar mount de rutas.

---

### F1.4 — Routes + mount en `server.js`

**Duración:** 1 h
**Entregable:**

- `src/routes/tournaments.routes.js` (nuevo).
- Mount en `server.js` (`app.use('/api/tournaments', tournamentsRoutes)`).

**Contenido del router:**

- Importar los 8 handlers del controller.
- Encadenar middlewares (`requireAuth`, `requireRole`,
  `requireTournamentModerator`).
- Sin lógica (solo enrutamiento).

**Criterio de cierre:**

- [ ] `GET /api/tournaments` responde 200/401.
- [ ] `POST /api/tournaments` sin token responde 401.
- [ ] `POST /api/tournaments` con token de MIEMBRO responde 403.
- [ ] Smoke test manual con Postman/curl.

**Commit esperado:** `feat(tournaments): routes + mount F1.4`.
**Riesgo:** bajo.
**Rollback:** `git revert`.

---

### F1.5 — Frontend (bracket + draft + resultados)

**Duración:** 2-3 días
**Entregable:**

- `components/tournaments.html` (nuevo).
- `js/tournaments.js` (nuevo).
- Entrada en `js/views.js` para mostrar en el menú.
- Estilos en `css/views.css` (o `components.css`).

**Estructura de la vista:**

```
┌────────────────────────────────────────────────┐
│  🏆 Torneos                                     │
│  C4ISR-Tournaments | PARAGUAY-FFAA             │
│  ─────────────────────────────────────────────  │
│                                                 │
│  [+ Nuevo Torneo]  [Filtro: Todos / Activos]   │
│                                                 │
│  📋 TORNEOS ACTIVOS                             │
│  ┌───────────────────────────────────────────┐ │
│  │ [Nombre] · Swiss+SE · F1 · 6/8 equipos    │ │
│  │ Moderador: [NICK] · 2026-10-12             │ │
│  │ [Ver bracket] [Ver roster]                 │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
│  🔀 BRACKET (al hacer click en un torneo)       │
│  ┌───────────────────────────────────────────┐ │
│  │ SWISS                                       │ │
│  │  R1: Team A (2) - Team B (1)               │ │
│  │  R1: Team C (2) - Team D (0)               │ │
│  │  R2: Team A vs Team C ...                  │ │
│  │                                             │ │
│  │ QUARTERFINALS / SEMIS / FINAL              │ │
│  │  QF1: ...                                   │ │
│  │  SF1: ...                                   │ │
│  │  FINAL: ...                                 │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
│  🎯 DRAFT (dentro de un match)                  │
│  ┌───────────────────────────────────────────┐ │
│  │ Game 1 (Countdown)                          │ │
│  │  Team A BAN: [Aircraft X]                  │ │
│  │  Team B BAN: [Aircraft Y]                  │ │
│  │  Team A PICK: [Aircraft Z]                 │ │
│  │  ...                                        │ │
│  └───────────────────────────────────────────┘ │
└────────────────────────────────────────────────┘
```

**Componentes a reutilizar:**

- `.card` — tarjetas de torneo.
- `.data-table` — tabla de roster.
- `.status-badge` — estado del torneo (DRAFT/REGISTRATION/ONGOING/FINISHED).
- `.role-badge` — rol del capitán.
- `.btn-primary` / `.btn-secondary` — acciones.

**Criterio de cierre:**

- [ ] Vista accesible desde el menú.
- [ ] Listado de torneos con filtro.
- [ ] Bracket visible y correcto para 4-8 equipos.
- [ ] Modal de draft funcional (bans + picks).
- [ ] Formulario de resultado funcional.
- [ ] Responsive (mobile <768px, tablet, desktop).
- [ ] Solo ADMIN/OWNER ven botones de crear/editar.

**Commit esperado:** `feat(tournaments): frontend bracket + draft F1.5`.
**Riesgo:** medio (bracket y draft tienen UX compleja).
**Rollback:** `git revert` + eliminar archivos nuevos.

---

### F1.6 — Integración con Discord (opcional)

**Duración:** 1-2 días (si se decide hacerla en F1).
**Entregable:** comando de bot (opcional, puede postergarse a F2).

**Comandos candidatos:**

- `!torneo crear [nombre]` — crear torneo (solo ADMIN/OWNER).
- `!torneo status` — ver torneo activo.
- `!torneo bracket` — link al bracket.

**Criterio de cierre:**

- [ ] Bot responde a comandos básicos.
- [ ] Autorización por rol de Discord.
- [ ] Logs en `#torneo-general`.

**Commit esperado:** `feat(tournaments): bot Discord F1.6`.
**Riesgo:** bajo.
**Rollback:** desactivar el bot.

**Nota:** F1 **puede cerrarse sin F1.6**. La integración Discord es
complementaria, no bloqueante. Si el presupuesto de tiempo aprieta, se
posterga a F2.

---

## 4. Riesgos y mitigaciones

| Riesgo | Prob. | Impacto | Mitigación |
|---|---|---|---|
| RBAC fino con bug (Veterano sin permiso puede operar) | Media | Alto | Tests exhaustivos en F1.3 |
| Draft mal modelado (perder acción) | Baja | Alto | Constraint `UNIQUE(match_id, game_number, order_index)` |
| Bracket desincronizado con matches | Baja | Medio | Bracket reconstruido on-the-fly (D4) |
| Frontend bracket complejo (UX) | Media | Medio | Reusar componentes existentes; prototipo con mockup |
| Moderador con permisos residuales al cambiar | Baja | Alto | Middleware revalida en cada request |
| GRANT olvidado en nuevas tablas | Baja | Alto | Checklist obligatorio en cada migración |
| Normativa v3.0 cambia el modelo a mitad de F1 | Baja | Medio | ADR-011 deja explícito el alcance F1 |
| Tokens IA al 95% a mitad de fase | Alta | Bajo | Protocolo al 95% (§6) |
| Service Worker cachea JS viejo | Alta | Medio | Bump `CACHE_NAME` en `sw.js` al cerrar F1.5 |

---

## 5. Lo que NO se toca

- `src/controllers/admin.controller.js` — sin cambios.
- `src/middlewares/auth.js` — sin cambios. `requireRole` sigue igual.
- `src/controllers/events-v2.controller.js` — sin cambios.
- `src/controllers/veteran.controller.js` — sin cambios.
- Endpoints existentes — sin cambios de contrato.
- Tablas existentes — 0 migraciones.
- Panel de Comandancia — solo se agrega entrada al menú "Torneos".
- Hangar, Veteranos, Dashboard, Rendimiento — sin cambios.

---

## 6. Protocolo al 95% de tokens

Si durante la implementación la sesión de IA llega al 95% de tokens:

1. La IA debe avisar: `⚠️ Tokens al 95%. Generando prompt de continuación.`
2. Generar `docs/prompts/prompt-continuacion-torneos-fase-N.md`.
3. Incluir: contexto, fase actual, próximo paso, archivos a adjuntar.
4. Guardar en `docs/prompts/`.

---

## 7. Cronograma

| Día | Fase | Entregable |
|---|---|---|
| D+0 | F1.1 | Migración SQL ejecutada ✅ |
| D+0 | Formalización | Handoff + ADR-011 + PLAN_TORNEOS |
| D+1 | F1.2 | Schemas Zod |
| D+1 | F1.3 (parte 1) | Controller (endpoints base) |
| D+2 | F1.3 (parte 2) | RBAC fino + tests |
| D+2 | F1.4 | Routes + mount |
| D+3-4 | F1.5 | Frontend bracket + draft |
| D+5 | F1.6 | Integración Discord (opcional) |
| D+5 | Cierre | Tests + docs + deploy |

**Total:** 5-7 días con dedicación parcial.

---

## 8. Referencias

- [`docs/rfc/RFC-002-sistema-torneos.md`](../rfc/RFC-002-sistema-torneos.md) — RFC aceptado.
- [`docs/adr/ADR-011-sistema-torneos.md`](../adr/ADR-011-sistema-torneos.md) — ADR del sistema.
- [`docs/normativa/ANEXO-III-torneos.md`](../normativa/ANEXO-III-torneos.md) — Reglamento.
- [`docs/normativa/normativa-v3.0-borrador.md`](../normativa/normativa-v3.0-borrador.md) — Normativa v3.0.
- [`docs/handoffs/HANDOFF-v4.8.23.md`](../handoffs/HANDOFF-v4.8.23.md) — Handoff de cierre F1.1.
- [`sql/045_tournaments.sql`](../../sql/045_tournaments.sql) — Migración aplicada.
- [`PLAN_TRABAJO_VETERANOS.md`](./PLAN_TRABAJO_VETERANOS.md) — Patrón de plan de feature.
- [`tests/helpers/README.md`](../../tests/helpers/README.md) — Mock oficial de tests.

---

**PARAGUAY FFAA `[PRY]` — Escuadrón Oficial MetalStorm**
**Plan de Trabajo Torneos v1.0 · 2026-10-12 · Documento vivo**