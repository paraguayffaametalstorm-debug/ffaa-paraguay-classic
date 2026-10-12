-- ============================================================
-- PARAGUAY-FFAA | METALSTORM
-- MIGRACIÓN: Tablas del Sistema de Torneos (RFC-002 / Anexo III)
-- Archivo: 045_tournaments.sql
-- Fase: F1.1 (implementación técnica RFC-002)
-- Autor: Comando C4ISR
-- Fecha: 2026-10-12
-- ============================================================
-- PROPÓSITO:
--   Implementar el modelo de datos del sistema de torneos internos
--   según RFC-002 §4 y el Anexo III del reglamento v3.0.
--
-- ALCANCE:
--   - 5 tablas: tournaments, tournament_participants,
--     tournament_matches, tournament_drafts, tournament_moderator_history.
--   - Índices para queries de bracket, roster, drafts y moderación.
--   - CHECK constraints para enums de estado/fase/acción.
--   - GRANTs explícitos a service_role (BL-030, Supabase 30-oct-2026).
--   - RLS con política no_public_access (patrón del proyecto).
--
-- DECISIONES DE DISEÑO (revisadas con OWNER 2026-10-12):
--   1. PK UUID (consistente con events_master, mentorships).
--   2. Participantes = equipos (roster JSONB).
--   3. Draft por partida (game_number en Bo3/Bo5).
--   4. Bracket reconstruible desde tournament_matches.
--   5. GRANT + RLS explícitos desde esta migración.
--   6. Moderador con historial de cambios (tournament_moderator_history).
-- ============================================================


-- ============================================================
-- 1. TABLA: tournaments
-- ============================================================
CREATE TABLE IF NOT EXISTS tournaments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    format          TEXT NOT NULL,
    scope           TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'DRAFT',
    starts_at       TIMESTAMPTZ NOT NULL,
    ends_at         TIMESTAMPTZ NOT NULL,
    max_teams       INTEGER NOT NULL DEFAULT 8,
    min_teams       INTEGER NOT NULL DEFAULT 4,
    moderator_id    UUID REFERENCES users(id) ON DELETE SET NULL,
    metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT tournaments_status_check
        CHECK (status IN ('DRAFT','REGISTRATION','ONGOING','FINISHED','CANCELLED')),
    CONSTRAINT tournaments_scope_check
        CHECK (scope IN ('F1','F2','F3','F4')),
    CONSTRAINT tournaments_format_check
        CHECK (format IN ('SWISS+SE','ROUND_ROBIN+SE')),
    CONSTRAINT tournaments_dates_check
        CHECK (ends_at > starts_at),
    CONSTRAINT tournaments_teams_check
        CHECK (max_teams >= min_teams AND max_teams <= 32 AND min_teams >= 2)
);

-- ============================================================
-- 2. TABLA: tournament_participants
-- ============================================================
CREATE TABLE IF NOT EXISTS tournament_participants (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id   UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    team_name       TEXT NOT NULL,
    captain_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    roster          JSONB NOT NULL DEFAULT '[]'::jsonb,
    registered_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status          TEXT NOT NULL DEFAULT 'CONFIRMED',

    CONSTRAINT tournament_participants_status_check
        CHECK (status IN ('CONFIRMED','WITHDRAWN','DISQUALIFIED')),
    CONSTRAINT tournament_participants_unique_team
        UNIQUE (tournament_id, team_name)
);

-- ============================================================
-- 3. TABLA: tournament_matches
-- ============================================================
CREATE TABLE IF NOT EXISTS tournament_matches (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id   UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    phase           TEXT NOT NULL,
    round           INTEGER NOT NULL,
    team_a_id       UUID REFERENCES tournament_participants(id) ON DELETE SET NULL,
    team_b_id       UUID REFERENCES tournament_participants(id) ON DELETE SET NULL,
    best_of         INTEGER NOT NULL DEFAULT 3,
    score_a         INTEGER NOT NULL DEFAULT 0,
    score_b         INTEGER NOT NULL DEFAULT 0,
    winner_id       UUID REFERENCES tournament_participants(id) ON DELETE SET NULL,
    status          TEXT NOT NULL DEFAULT 'SCHEDULED',
    scheduled_at    TIMESTAMPTZ,
    metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT tournament_matches_phase_check
        CHECK (phase IN ('SWISS','QF','SF','FINAL')),
    CONSTRAINT tournament_matches_best_of_check
        CHECK (best_of IN (3, 5)),
    CONSTRAINT tournament_matches_status_check
        CHECK (status IN ('SCHEDULED','LIVE','FINISHED','CANCELLED')),
    CONSTRAINT tournament_matches_teams_differ
        CHECK (team_a_id IS NULL OR team_b_id IS NULL OR team_a_id <> team_b_id),
    CONSTRAINT tournament_matches_scores_check
        CHECK (score_a >= 0 AND score_b >= 0)
);

-- ============================================================
-- 4. TABLA: tournament_drafts
-- ============================================================
CREATE TABLE IF NOT EXISTS tournament_drafts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id        UUID NOT NULL REFERENCES tournament_matches(id) ON DELETE CASCADE,
    game_number     INTEGER NOT NULL,
    team_id         UUID NOT NULL REFERENCES tournament_participants(id) ON DELETE CASCADE,
    action          TEXT NOT NULL,
    aircraft_id     TEXT REFERENCES plane_models(id) ON DELETE RESTRICT,
    order_index     INTEGER NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT tournament_drafts_action_check
        CHECK (action IN ('BAN','PICK')),
    CONSTRAINT tournament_drafts_game_check
        CHECK (game_number >= 1 AND game_number <= 5),
    CONSTRAINT tournament_drafts_order_check
        CHECK (order_index >= 1),
    CONSTRAINT tournament_drafts_unique_order
        UNIQUE (match_id, game_number, order_index)
);

-- ============================================================
-- 5. TABLA: tournament_moderator_history
-- ============================================================
CREATE TABLE IF NOT EXISTS tournament_moderator_history (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id   UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    previous_user   UUID REFERENCES users(id) ON DELETE SET NULL,
    new_user        UUID REFERENCES users(id) ON DELETE SET NULL,
    changed_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    changed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reason          TEXT
);

-- ============================================================
-- ÍNDICES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_tournaments_status
    ON tournaments(status);
CREATE INDEX IF NOT EXISTS idx_tournaments_dates
    ON tournaments(starts_at, ends_at);
CREATE INDEX IF NOT EXISTS idx_tournaments_moderator
    ON tournaments(moderator_id) WHERE moderator_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tournament_participants_t
    ON tournament_participants(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_participants_captain
    ON tournament_participants(captain_user_id) WHERE captain_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tournament_matches_t
    ON tournament_matches(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_matches_phase
    ON tournament_matches(tournament_id, phase, round);
CREATE INDEX IF NOT EXISTS idx_tournament_matches_status
    ON tournament_matches(status);
CREATE INDEX IF NOT EXISTS idx_tournament_matches_winner
    ON tournament_matches(winner_id) WHERE winner_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tournament_drafts_match
    ON tournament_drafts(match_id, game_number, order_index);
CREATE INDEX IF NOT EXISTS idx_tournament_drafts_aircraft
    ON tournament_drafts(aircraft_id) WHERE aircraft_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tournament_moderator_history_t
    ON tournament_moderator_history(tournament_id, changed_at DESC);

-- ============================================================
-- COMENTARIOS
-- ============================================================
COMMENT ON TABLE tournaments IS
    'Torneos internos PARAGUAY FFAA (RFC-002 / Anexo III)';
COMMENT ON COLUMN tournaments.format IS
    'SWISS+SE (formato MCS) | ROUND_ROBIN+SE (alternativa F1 con pocos equipos)';
COMMENT ON COLUMN tournaments.scope IS
    'F1 (principal) | F2 (anexos) | F3 (aliados) | F4 (partner)';
COMMENT ON COLUMN tournaments.moderator_id IS
    'Moderador designado por la Administración (Anexo III Art. 24.3)';
COMMENT ON COLUMN tournaments.metadata IS
    'Datos extra: maps, mode, premios, config de bracket, etc.';

COMMENT ON TABLE tournament_participants IS
    'Equipos participantes de cada torneo (Anexo III Art. 6)';
COMMENT ON COLUMN tournament_participants.roster IS
    'Array JSONB: [{ user_id: UUID, role: TEXT, is_sub: BOOLEAN }]';

COMMENT ON TABLE tournament_matches IS
    'Matches del bracket (Swiss + Single Elimination)';
COMMENT ON COLUMN tournament_matches.phase IS
    'SWISS (Día 1) | QF | SF | FINAL (Día 2)';
COMMENT ON COLUMN tournament_matches.round IS
    'Ronda dentro de la fase (1..N)';
COMMENT ON COLUMN tournament_matches.metadata IS
    'Datos extra: maps jugados, replays, notas del moderador';

COMMENT ON TABLE tournament_drafts IS
    'Draft de aeronaves por partida (Anexo III Art. 7)';
COMMENT ON COLUMN tournament_drafts.game_number IS
    'Partida dentro del Bo3/Bo5 (1..N)';
COMMENT ON COLUMN tournament_drafts.action IS
    'BAN (prohibición) | PICK (selección)';
COMMENT ON COLUMN tournament_drafts.order_index IS
    'Orden del turno de draft (1..N)';

COMMENT ON TABLE tournament_moderator_history IS
    'Auditoría de cambios de moderador (Anexo III Art. 24.3)';

-- ============================================================
-- GRANTs EXPLÍCITOS (BL-030 — Supabase post 30-oct-2026)
-- ============================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON tournaments                    TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON tournament_participants        TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON tournament_matches             TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON tournament_drafts              TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON tournament_moderator_history   TO service_role;

-- ============================================================
-- RLS (patrón del proyecto: no_public_access)
-- ============================================================
ALTER TABLE tournaments                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_participants       ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_matches            ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_drafts             ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_moderator_history  ENABLE ROW LEVEL SECURITY;

CREATE POLICY no_public_access ON tournaments
    FOR ALL TO public USING (false) WITH CHECK (false);
CREATE POLICY no_public_access ON tournament_participants
    FOR ALL TO public USING (false) WITH CHECK (false);
CREATE POLICY no_public_access ON tournament_matches
    FOR ALL TO public USING (false) WITH CHECK (false);
CREATE POLICY no_public_access ON tournament_drafts
    FOR ALL TO public USING (false) WITH CHECK (false);
CREATE POLICY no_public_access ON tournament_moderator_history
    FOR ALL TO public USING (false) WITH CHECK (false);

-- ============================================================
-- FIN DE LA MIGRACIÓN 045
-- ============================================================