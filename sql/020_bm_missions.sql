-- ============================================================
-- PARAGUAY-FFAA | METALSTORM
-- MIGRACIÓN: Tabla `bm_missions`
-- Archivo: 020_bm_missions.sql
-- Fase: 2 (Infraestructura como Código)
-- Hallazgo: HALL-048
-- ============================================================
-- PROPÓSITO:
--   15 misiones diarias del Black Market (3 tipos × 5 días):
--   Dedicación, Habilidad y Trabajo en equipo. 25 puntos por
--   misión + 25 bonus diario.
-- DEPENDENCIAS:
--   - `bm_events` (FK bm_event_id INTEGER)
-- ============================================================

CREATE TABLE IF NOT EXISTS bm_missions (
    id SERIAL PRIMARY KEY,
    bm_event_id INTEGER REFERENCES bm_events(id) ON DELETE CASCADE,
    day INTEGER NOT NULL CHECK (day >= 1 AND day <= 5),
    type TEXT NOT NULL,
    description TEXT NOT NULL,
    requirement TEXT NOT NULL,
    target_value INTEGER NOT NULL,
    points INTEGER DEFAULT 25,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_bm_missions_bm_event_id ON bm_missions(bm_event_id);
CREATE INDEX IF NOT EXISTS idx_bm_missions_day ON bm_missions(day);
CREATE INDEX IF NOT EXISTS idx_bm_missions_type ON bm_missions(type);

-- Comentarios
COMMENT ON TABLE bm_missions IS '15 misiones diarias del BM (3 tipos × 5 días)';
COMMENT ON COLUMN bm_missions.type IS 'dedication, skill, teamwork';
COMMENT ON COLUMN bm_missions.points IS 'Puntos BM al completar (default 25)';