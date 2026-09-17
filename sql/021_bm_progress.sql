-- ============================================================
-- PARAGUAY-FFAA | METALSTORM
-- MIGRACIÓN: Tabla `bm_progress`
-- Archivo: 021_bm_progress.sql
-- Fase: 2 (Infraestructura como Código)
-- Hallazgo: HALL-048
-- ============================================================
-- PROPÓSITO:
--   Progreso individual de cada piloto en el Black Market.
--   Marca misiones como completadas y acumula puntos.
-- DEPENDENCIAS:
--   - `users` (FK user_id UUID)
--   - `bm_events` (FK bm_event_id INTEGER)
--   - `bm_missions` (FK mission_id INTEGER)
-- ============================================================

CREATE TABLE IF NOT EXISTS bm_progress (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    bm_event_id INTEGER REFERENCES bm_events(id) ON DELETE CASCADE,
    day INTEGER NOT NULL CHECK (day >= 1 AND day <= 5),
    mission_id INTEGER REFERENCES bm_missions(id) ON DELETE CASCADE,
    completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMPTZ,
    points_earned INTEGER DEFAULT 0
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_bm_progress_user_id ON bm_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_bm_progress_bm_event_id ON bm_progress(bm_event_id);
CREATE INDEX IF NOT EXISTS idx_bm_progress_mission_id ON bm_progress(mission_id);
CREATE INDEX IF NOT EXISTS idx_bm_progress_user_event ON bm_progress(user_id, bm_event_id);

-- Constraint de unicidad
ALTER TABLE bm_progress
    ADD CONSTRAINT bm_progress_user_mission_unique
    UNIQUE (user_id, mission_id);

-- Comentarios
COMMENT ON TABLE bm_progress IS 'Progreso individual de pilotos en BM';
COMMENT ON COLUMN bm_progress.points_earned IS 'Puntos ganados por esta misión (0 o 25)';