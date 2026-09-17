-- ============================================================
-- PARAGUAY-FFAA | METALSTORM
-- MIGRACIÓN: Tabla `event_participations`
-- Archivo: 029_event_participations.sql
-- Fase: Rediseño de Eventos (F1)
-- ============================================================
-- PROPÓSITO:
--   Tabla unificada de participaciones. Almacena el rendimiento
--   de cada piloto en cada evento (SQ, BM o futuros).
--   Reemplaza funcionalmente a `performances` (SQ) y `bm_progress` (BM).
-- DEPENDENCIAS:
--   - `events_master` (FK event_id UUID)
--   - `users` (FK user_id, created_by UUID)
-- ============================================================

CREATE TABLE IF NOT EXISTS event_participations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events_master(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  nick TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  computed_points INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'VALIDATED', 'REJECTED')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  UNIQUE(event_id, user_id)
);

-- Índices operativos
CREATE INDEX IF NOT EXISTS idx_event_participations_event
  ON event_participations (event_id);

CREATE INDEX IF NOT EXISTS idx_event_participations_user
  ON event_participations (user_id);

CREATE INDEX IF NOT EXISTS idx_event_participations_status
  ON event_participations (status);

CREATE INDEX IF NOT EXISTS idx_event_participations_event_user
  ON event_participations (event_id, user_id);

-- Comentarios
COMMENT ON TABLE event_participations IS 'Participaciones de pilotos en eventos (SQ, BM, futuros). Rediseño 2026-09-17.';
COMMENT ON COLUMN event_participations.data IS 'Datos específicos por tipo de evento (JSONB)';
COMMENT ON COLUMN event_participations.computed_points IS 'Puntos calculados (SQ: tokens, BM: puntos)';
COMMENT ON COLUMN event_participations.status IS 'Estado: PENDING, VALIDATED, REJECTED';
COMMENT ON COLUMN event_participations.nick IS 'Desnormalizado para consultas rápidas';