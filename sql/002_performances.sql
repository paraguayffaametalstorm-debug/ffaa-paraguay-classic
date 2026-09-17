-- ============================================================
-- PARAGUAY-FFAA | METALSTORM
-- MIGRACIÓN: Tabla `performances`
-- Archivo: 002_performances.sql
-- Fase: 2 (Infraestructura como Código)
-- Hallazgo: HALL-048
-- ============================================================
-- PROPÓSITO:
--   Registro de rendimiento semanal de cada piloto (tokens,
--   días conectados, vuelo en grupo) por evento operativo.
-- DEPENDENCIAS:
--   - `users` (FK user_id INTEGER)
--   - `events` (FK event_id TEXT)
-- ============================================================

CREATE TABLE IF NOT EXISTS performances (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    event_id TEXT REFERENCES events(id) ON DELETE CASCADE,
    nick TEXT,
    role TEXT,
    tokens INTEGER NOT NULL DEFAULT 0,
    days_connected INTEGER NOT NULL DEFAULT 0,
    flew_in_group BOOLEAN DEFAULT false,
    notes TEXT,
    perf_status TEXT DEFAULT 'PENDIENTE',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_performances_user_id ON performances(user_id);
CREATE INDEX IF NOT EXISTS idx_performances_event_id ON performances(event_id);
CREATE INDEX IF NOT EXISTS idx_performances_perf_status ON performances(perf_status);
CREATE INDEX IF NOT EXISTS idx_performances_created_at ON performances(created_at DESC);

-- Constraint de unicidad (un registro por usuario/evento)
ALTER TABLE performances
    ADD CONSTRAINT performances_user_event_unique
    UNIQUE (user_id, event_id);

-- Comentarios
COMMENT ON TABLE performances IS 'Registro semanal de tokens y rendimiento militar por piloto';
COMMENT ON COLUMN performances.perf_status IS 'Semáforo militar: VERDE, NARANJA, ROJO, NEGRO, PENDIENTE';