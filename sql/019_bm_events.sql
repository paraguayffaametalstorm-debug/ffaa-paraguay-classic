-- ============================================================
-- PARAGUAY-FFAA | METALSTORM
-- MIGRACIÓN: Tabla `bm_events`
-- Archivo: 019_bm_events.sql
-- Fase: 2 (Infraestructura como Código)
-- Hallazgo: HALL-048
-- ============================================================
-- PROPÓSITO:
--   Eventos Black Market (5 días, miércoles a domingo) con
--   aeronave en promoción. Reemplaza al Squadron Event cada
--   1-2 meses.
-- DEPENDENCIAS:
--   - `plane_models` (FK aircraft_id TEXT)
--   - `users` (FK created_by UUID)
-- ============================================================

CREATE TABLE IF NOT EXISTS bm_events (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN DEFAULT false,
    aircraft_id TEXT REFERENCES plane_models(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_bm_events_is_active ON bm_events(is_active);
CREATE INDEX IF NOT EXISTS idx_bm_events_start_date ON bm_events(start_date DESC);
CREATE INDEX IF NOT EXISTS idx_bm_events_aircraft_id ON bm_events(aircraft_id);

-- Comentarios
COMMENT ON TABLE bm_events IS 'Eventos Black Market (5 días con aeronave en promoción)';
COMMENT ON COLUMN bm_events.is_active IS 'Solo un evento activo a la vez';