# ADR-011 — Sistema de Torneos Internos

> **ID:** ADR-011 · **Estado:** ✅ Accepted
> **Fecha:** 2026-10-12
> **Decisores:** OWNER + Comando C4ISR
> **Relacionado con:** RFC-002, Anexo III (normativa v3.0), ADR-006, ADR-007, ADR-010

---

## 1. Contexto

El escuadrón PARAGUAY FFAA organiza torneos internos de forma informal desde
sus inicios. La **Normativa v3.0** (Art. 18 bis) y su **Anexo III** formalizan
el régimen: formato Swiss + Single Elimination, 4-8 equipos, 5v5, draft con
bans y Mirrored Picks, un moderador designado por la Administración.

El **RFC-002** (✅ Accepted, 2026-10-11) definió el modelo de datos y los
endpoints de la Fase 1 (F1). La implementación técnica arranca en el **Sprint 8**
con la migración SQL (F1.1), ya cerrada.

**Problema:** el RFC-002 §4 proponía 4 tablas, pero el Anexo III Art. 24.3
introduce la figura del **moderador designado**, con responsabilidades
operativas específicas (coordinar horarios, supervisar drafts, verificar
resultados, escalar incidencias). Esto requiere:

1. Modelar al moderador como entidad de primera clase (no como un simple
   `created_by`).
2. Permitir **reasignación mid-torneo** con trazabilidad (patrón
   `user_nick_changes`, `mentorship_logs`).
3. Habilitar **RBAC fino** para que VETERANO/MIEMBRO designados como
   moderadores puedan operar solo su torneo.

Adicionalmente, se necesita definir cómo se modela el draft (por match o por
partida), cómo se almacena el bracket (snapshot vs reconstrucción) y qué
convenciones seguir para PKs y GRANTs.

---

## 2. Decisión

Se implementa el sistema de torneos con las siguientes decisiones
arquitectónicas:

### D1. PK UUID para todas las tablas de torneos

Todas las tablas del sistema usan `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`.

**Razón:** consistencia con las tablas más recientes (`events_master`,
`event_participations`, `mentorships`). Evita el patrón dual UUID+INTEGER
que históricamente causó problemas (HALL-028, HALL-066-septies, FIX-310-bis).

### D2. Participantes = equipos con roster JSONB

`tournament_participants` modela **equipos**, no pilotos individuales. El
roster se almacena como `JSONB` con estructura:

```json
[
  { "user_id": "uuid-1", "role": "Interceptor", "is_sub": false },
  { "user_id": "uuid-2", "role": "Support",     "is_sub": false },
  { "user_id": "uuid-3", "role": "Heavy",       "is_sub": true  }
]
```

**Razón:** el roster cambia entre partidas (suplente entra, titular sale).
Modelar cada piloto como fila independiente requeriría tabla pivote
`tournament_roster` con N filas por equipo, lo que complica las queries de
bracket. El JSONB se adapta a la realidad: **el equipo es la entidad, el
roster es su atributo variable**.

### D3. Draft por partida (game_number)

`tournament_drafts` referencia `match_id` + `game_number` (1..N).

**Razón:** el Anexo III §7.4 dice que el draft ocurre antes de cada partida,
y §5 define maps distintos por partida (Countdown, Icebound, Crimson Canyon).
Un Bo3 tiene 3 drafts independientes. Un Bo5 tiene 5.

Estructura: `UNIQUE (match_id, game_number, order_index)` garantiza que no
haya dos acciones en el mismo turno de la misma partida.

### D4. Bracket reconstruible desde `tournament_matches`

No se almacena un snapshot del bracket. El frontend y el controller lo
**reconstruyen on-the-fly** desde `tournament_matches` (fase + round + pairing).

**Razón:** evita dos fuentes de verdad. Si el bracket fuera un JSONB en
`tournaments.metadata`, podría desincronizarse con los resultados reales.
La tabla de matches es la fuente única.

**Trade-off:** queries ligeramente más costosas al renderizar el bracket.
Mitigación: índice `idx_tournament_matches_phase ON (tournament_id, phase, round)`.
Para F1 (4-8 equipos, ~12-20 matches), es irrelevante.

### D5. GRANTs + RLS explícitos desde la migración

Cada `CREATE TABLE` incluye:

- `GRANT SELECT, INSERT, UPDATE, DELETE ON <tabla> TO service_role;`
- `ALTER TABLE <tabla> ENABLE ROW LEVEL SECURITY;`
- `CREATE POLICY no_public_access ON <tabla> FOR ALL TO public USING (false) WITH CHECK (false);`

**Razón:** Supabase desde 30-oct-2026 **ya no auto-expone tablas nuevas** al
Data API. Los GRANTs deben ser explícitos. Esto cierra **BL-030** para el
sistema de torneos.

### D6. Moderador con historial de cambios

Se agrega una **5ta tabla** (`tournament_moderator_history`) no contemplada
en el RFC-002 §4.

Estructura:

```sql
tournaments (
  ...,
  moderator_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ...
)

tournament_moderator_history (
  id UUID PRIMARY KEY,
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  previous_user UUID REFERENCES users(id),
  new_user UUID REFERENCES users(id),
  changed_by UUID REFERENCES users(id),
  changed_at TIMESTAMPTZ,
  reason TEXT
)
```

**Razón:** el Anexo III Art. 24.3 requiere trazabilidad de quién modera cada
torneo. Cambios mid-torneo (enfermedad, conflicto de interés, escalamiento)
deben quedar auditados conforme al Art. 22. Patrón consistente con
`user_nick_changes` y `mentorship_logs`.

**Impacto:** 5 tablas en lugar de 4 (RFC-002 §4). Costo: 1 tabla chica.
Beneficio: trazabilidad completa + RBAC fino viable.

### D7. RBAC fino con middleware `requireTournamentModerator`

Se crea un middleware dedicado que permite a VETERANO/MIEMBRO designados como
moderadores operar **solo su torneo**, sin darles poderes globales.

**Reglas:**

| Actor | Puede operar |
|---|---|
| OWNER | Cualquier torneo |
| ADMIN | Cualquier torneo |
| VETERANO | Solo torneos donde `moderator_id === req.user.id` |
| MIEMBRO | Solo torneos donde `moderator_id === req.user.id` |

**Razón:** el Anexo III §24.3 faculta al moderador a supervisar drafts y
verificar resultados. No siempre será un ADMIN. Darle poderes globales sería
violar el principio de mínimo privilegio (Art. 45).

### D8. Endpoint `PATCH /api/tournaments/:id/moderator`

Se agrega un endpoint no contemplado en el RFC-002 §5 para reasignar
moderador con motivo.

**Razón:** el Anexo III Art. 24.3 faculta a la Administración a designar
moderador. La reasignación mid-torneo es una operación legítima que debe
quedar registrada en `tournament_moderator_history` + `audit_logs`.

**Restricción:** solo OWNER y ADMIN pueden ejecutarlo.

---

## 3. Consecuencias

### Positivas

- **Trazabilidad completa** del moderador (quién, cuándo, por qué).
- **RBAC flexible:** el OWNER puede designar a cualquier miembro como
  moderador puntual sin ascenderlo.
- **Consistencia con el resto del proyecto:** UUID, JSONB, RLS
  `no_public_access`, GRANTs explícitos.
- **Fuente única de verdad:** el bracket se reconstruye desde `matches`,
  evitando desincronización.
- **Cierra BL-030** para las 5 tablas de torneos.
- **Documentación canónica** de las 8 decisiones (este ADR).

### Negativas

- **1 tabla más** que el RFC-002 §4 (5 en lugar de 4). Mitigación: la tabla es
  chica (7 columnas), sin índices especiales, sin lógica compleja.
- **Middleware nuevo** (`requireTournamentModerator`) a mantener. Mitigación:
  tests exhaustivos (previstos en F1.3).
- **Query de bracket** requiere reconstrucción. Mitigación: índice
  `(tournament_id, phase, round)`.

### Neutras

- El modelo se reutilizará en F2 (anexos), F3 (aliados), F4 (partner). Los
  cambios futuros serán aditivos (`scope`, `max_teams` se ajustan por fase).

---

## 4. Alternativas consideradas

### Alternativa A — Participantes = pilotos (no equipos)

Modelar cada piloto individualmente en `tournament_participants` con
`team_id` en una columna separada.

**Rechazada:** complica las queries de bracket (agrupar pilotos por equipo
en cada render) y no aporta valor en F1. El roster cambia entre partidas,
lo que hace que la "tabla de pilotos" necesite versionado temporal complejo.
El JSONB es más simple y suficiente.

### Alternativa B — Draft por match (no por partida)

Modelar un solo draft por match (Bo3 completo).

**Rechazada:** contradice el Anexo III §7.4 ("draft previa a cada partida")
y §5 (maps distintos por partida). Un draft único para Bo3 sería
reglamentariamente incorrecto.

### Alternativa C — Bracket como snapshot JSONB

Guardar el bracket en `tournaments.metadata.bracket` al momento de generar.

**Rechazada:** dos fuentes de verdad. Si se registra un resultado y no se
actualiza el snapshot, hay inconsistencia. Reconstruir desde `matches` es más
robusto aunque ligeramente más costoso.

### Alternativa D — PK INTEGER (consistente con `performances`)

Usar `id INTEGER` como PK, consistente con tablas legacy.

**Rechazada:** las tablas legacy con INTEGER son deuda técnica conocida. Los
módulos nuevos (events-v2, mentorías) usan UUID. Adoptar UUID mantiene la
coherencia del código nuevo.

### Alternativa E — Moderador sin historial (solo `moderator_id`)

Solo campo `moderator_id` en `tournaments`, sin tabla de historial.

**Rechazada:** pierde trazabilidad. Si el moderador cambia a mitad de
torneo, no queda registro de quién moderó antes ni por qué se cambió.
Contradice el Art. 22 (trazabilidad de decisiones).

---

## 5. Impacto en el sistema

### Nuevas tablas (5)

| Tabla | Filas estimadas F1 | Uso |
|---|---|---|
| `tournaments` | ~1-2 por edición | Ciclo de vida del torneo |
| `tournament_participants` | 4-8 por torneo | Equipos inscriptos |
| `tournament_matches` | 12-20 por torneo | Bracket completo |
| `tournament_drafts` | ~30-60 por torneo (Bo3/Bo5 × 2 acciones) | Draft por partida |
| `tournament_moderator_history` | 1-3 por torneo | Auditoría de moderación |

### Nuevos endpoints (8, dos más que el RFC-002 §5)

Del RFC-002 §5 (6 endpoints) + 1 nuevo (D8):

1. `GET /api/tournaments`
2. `POST /api/tournaments`
3. `GET /api/tournaments/:id`
4. `PATCH /api/tournaments/:id/status`
5. `POST /api/tournaments/:id/register`
6. `POST /api/tournaments/:id/matches/:mid/result`
7. `POST /api/tournaments/:id/matches/:mid/draft`
8. **`PATCH /api/tournaments/:id/moderator`** ← nuevo (D8)

### Nuevo middleware (1)

- `src/middlewares/tournamentModerator.js` — `requireTournamentModerator`.

### Nuevo controller (1)

- `src/controllers/tournaments.controller.js`.

### Nuevo router (1)

- `src/routes/tournaments.routes.js`.

### Frontend nuevo (2)

- `components/tournaments.html` — vista principal (bracket, roster, drafts).
- `js/tournaments.js` — lógica de interacción.

---

## 6. Referencias

- **RFC-002:** `docs/rfc/RFC-002-sistema-torneos.md` (✅ Accepted)
- **Anexo III:** `docs/normativa/ANEXO-III-torneos.md` (v1.0)
- **Normativa v3.0 borrador:** `docs/normativa/normativa-v3.0-borrador.md`
- **ADR-006:** Lógica de puntos BM
- **ADR-007:** Rediseño eventos v2
- **ADR-010:** Sección Veteranos
- **BL-030:** Auditar GRANTs explícitos en tablas `public/`
- **Migración aplicada:** `sql/045_tournaments.sql`
- **Handoff de cierre:** `docs/handoffs/HANDOFF-v4.8.23.md`

---

## 7. Estado

**✅ Accepted — 2026-10-12.**

Decisiones aprobadas por OWNER + Comando C4ISR. La implementación técnica
arranca con la migración SQL (`sql/045_tournaments.sql`), ya aplicada en
Supabase. Las siguientes fases (F1.2 → F1.6) se ejecutan según
`docs/planning/PLAN_TRABAJO_TORNEOS.md`.

---

**PARAGUAY FFAA `[PRY]` — Escuadrón Oficial MetalStorm**
**ADR-011 · Sistema de Torneos Internos · 2026-10-12**