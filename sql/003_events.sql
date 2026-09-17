-- ============================================================
-- PARAGUAY-FFAA | METALSTORM
-- MIGRACIÓN: Tabla `events`
-- Archivo: 003_events.sql
-- Fase: 2 (Infraestructura como Código)
-- Hallazgo: HALL-048
-- ============================================================
-- PROPÓSITO:
--   Ventanas operativas (Squadron Events) con metas del
--   escuadrón, fechas de inicio/fin y estado.
-- DEPENDENCIAS:
--   - Ninguna (tabla raíz).
-- ============================================================

CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL DEFAULT 'SQUADRON',
    status TEXT NOT NULL DEFAULT 'OPEN',
    target_members INTEGER DEFAULT 0,
    target_tokens INTEGER DEFAULT 0,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
CREATE INDEX IF NOT EXISTS idx_events_start_date ON events(start_date DESC);

-- Comentarios
COMMENT ON TABLE events IS 'Eventos operativos del escuadrón (SQUADRON)';
COMMENT ON COLUMN events.status IS 'Estado: OPEN, CLOSED';
COMMENT ON COLUMN events.type IS 'Tipo: SQUADRON, BLACK_MARKET';