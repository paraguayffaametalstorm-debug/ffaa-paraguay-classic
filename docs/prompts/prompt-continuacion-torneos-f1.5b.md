# 🚀 PROMPT DE CONTINUACIÓN — F1.5b Draft de Torneos

## Contexto

Estoy trabajando en el **Sistema de Torneos Internos** (RFC-002 / ADR-011) del
escuadrón PARAGUAY FFAA | METALSTORM.

**F1.5a** (listado + bracket + roster + resultado + moderador) ya está cerrada.
Ahora toca **F1.5b**: el modal de draft.

## Estado actual

| Fase | Descripción | Estado |
|---|---|---|
| F1.1 | Migración SQL (5 tablas) | ✅ Cerrado (commit `69f988b`) |
| F1.2 | Schemas Zod (6 schemas + 72 tests) | ✅ Cerrado (commit `2a51bb2`) |
| F1.3 | Controller + RBAC fino (8 handlers + 63 tests) | ✅ Cerrado (commit `683c4ed`) |
| F1.4 | Router + mount (8 endpoints) | ✅ Cerrado (commit `345f452`) |
| **F1.5a** | **Frontend (listado + bracket + roster + resultado + moderador)** | ✅ **Cerrado (commit b8e73ef)** |
| **F1.5b** | **Modal de draft (bans + picks + timer)** | ⏳ **Pendiente (este trabajo)** |
| F1.6 | Integración con Discord (opcional) | ⏳ Pendiente |

**Suite de tests:** 642 passing / 0 failing / 0 skipped.

## Objetivo F1.5b

Implementar el modal de draft (bans + picks) en la vista de torneos.

### Backend (faltante)

1. **Endpoint de lectura:** `GET /api/tournaments/:id/matches/:mid/drafts`
   - Retorna todos los drafts del match agrupados por `game_number`.
   - Cada draft es `{ id, game_number, team_id, action, aircraft_id, order_index, created_at }`.
   - RBAC: `requireAuth` (cualquier autenticado puede ver el draft).

2. **Validación adicional en `apiTournamentsRegisterDraft` (ya existe):**
   - Verificar que `aircraft_id` no esté baneada por el **otro** equipo.
   - Verificar que el **último avión del Black Market** esté auto-baneado.
   - Verificar que `order_index` no esté duplicado (ya está en la DB, validar en controller).
   - Verificar que el `team_id` pertenezca al `match_id`.

### Frontend (faltante)

3. **Modal de draft** (`#tournamentDraftModal`):
   - Header: "🎯 Draft — Partida [N] · [Fase] · Bo[3|5]".
   - Info: equipo A vs equipo B, mapa de la partida, timer 5 min por equipo.
   - **Grilla de aeronaves:** reusar `plane_models` del catálogo (44 aviones).
     - Filtro: excluir aeronaves ya baneadas en esta partida.
   - **Modo de acción:** dropdown para alternar entre BAN y PICK.
   - **Selección de equipo:** `team_id` (A o B).
   - **Confirmación:** botón "Registrar Acción".
   - **Timer:** 5 min por equipo (Anexo III §7.5). Al agotarse, asignar avión por defecto del rol.

4. **Botón "🎯 Draft"** en cada match del bracket:
   - Solo visible si el match está en estado `PENDING` o `LIVE`.
   - Solo visible para `canModerateTournament(torneo)`.

5. **Visualización del draft existente:**
   - En el tab Bracket, cada match con draft registrado muestra un pequeño bloque con
     el resumen (2 bans + N picks).

## Restricciones del Anexo III §7

- **1 ban por equipo.**
- **Mirrored Picks permitidos** (ambos equipos pueden usar la misma aeronave).
- **El último avión de Black Market está baneado automáticamente.**
- **Timer: 5 min por equipo.**
- **Se juega por partida** (`game_number` 1..N).
- **Duración:** Bo3 → hasta 3 partidas; Bo5 → hasta 5 partidas.

## Archivos a adjuntar en la nueva sesión

Obligatorios:

- `components/tournaments.html` — vista actual (tiene los 5 modales existentes).
- `js/tournaments.js` — módulo actual (~35 funciones exportadas).
- `src/controllers/tournaments.controller.js` — 8 handlers existentes.
- `src/routes/tournaments.routes.js` — 8 rutas montadas.
- `src/utils/schemas.js` — schemas Zod del torneo.
- `docs/normativa/ANEXO-III-torneos.md` — reglamento (especialmente §7 Draft).
- `docs/planning/PLAN_TRABAJO_TORNEOS.md` — plan F1.1 → F1.6.

Opcionales (referencia):

- `src/controllers/planes.controller.js` — cómo se leen los 44 aviones del catálogo.
- `tests/controllers/tournaments.controller.test.js` — patrón de tests.
- `tests/helpers/express.js` — helper de Express para tests.
- `sql/045_tournaments.sql` — esquema real de las 5 tablas.

## Comandos de verificación

```cmd
cd C:\Users\Admin\proyectos\ffaa-paraguay-classic
git log --oneline -8
git status
npm test
node --check js\tournaments.js
node --check src\controllers\tournaments.controller.js
```

## Recordatorios críticos

1. **Zod 4** valida UUIDs con regex RFC 4122 estricta (versión 1-8, variante 8/9/a/b). Usar UUIDs válidos en tests.
2. **NO usar `content.replace()` con strings multi-línea** (HALL-068). Usar `split(/\r?\n/)` + `splice()`.
3. **Servicio Worker:** al modificar `js/tournaments.js` o `components/tournaments.html`, bumpear `CACHE_NAME` en `sw.js` a `v4.9.1-f1.5b`.
4. **Cache-busting:** bumpear `?v=4.9.0` → `?v=4.9.1` en `index.html` (28 ocurrencias).
5. **RBAC fino:** el draft solo lo puede registrar el moderador o ADMIN/OWNER.
6. **Escapar HTML** en todo render dinámico (`escapeHTML()`).
7. **Backups:** `.bak-f1.5b` antes de modificar archivos críticos.

## Siguiente fase después de F1.5b

**F1.6 — Integración con Discord (opcional):**

- `!torneo crear [nombre]` — crear torneo (solo ADMIN/OWNER).
- `!torneo status` — ver torneo activo.
- `!torneo bracket` — link al bracket.

**Nota:** F1 puede cerrarse sin F1.6. La integración Discord es complementaria.

---

**PARAGUAY FFAA `[PRY]` — Prompt de continuación Torneos F1.5b**
**Generado: 2026-10-12**
