-- ============================================================
-- PARAGUAY-FFAA | METALSTORM
-- MIGRACIÓN: Tabla `events_master`
-- Archivo: 028_events_master.sql
-- Fase: Rediseño de Eventos (F1)
-- ============================================================
-- PROPÓSITO:
--   Tabla unificada de eventos. Absorbe los tipos SQUADRON,
--   BLACK_MARKET y futuros (ACE_CHALLENGE).
--   Reemplaza funcionalmente a `events` y `bm_events`.
-- DEPENDENCIAS:
--   - `users` (FK created_by UUID)
-- ============================================================

CREATE TABLE IF NOT EXISTS events_master (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('SQUADRON', 'BLACK_MARKET', 'ACE_CHALLENGE')),
  name TEXT NOT NULL,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'SCHEDULED' 
    CHECK (status IN ('SCHEDULED', 'OPEN', 'CLOSED', 'CANCELLED')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  legacy_event_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Índice único parcial: garantiza que solo haya UN evento OPEN a la vez.
-- Reemplaza al constraint EXCLUDE USING gist (que no funciona con boolean).
CREATE UNIQUE INDEX IF NOT EXISTS idx_events_master_single_open
  ON events_master (status)
  WHERE status = 'OPEN';

-- Índices operativos
CREATE INDEX IF NOT EXISTS idx_events_master_type_status
  ON events_master (type, status);

CREATE INDEX IF NOT EXISTS idx_events_master_dates
  ON events_master (start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_events_master_legacy_event_id
  ON events_master (legacy_event_id);

-- Comentarios
COMMENT ON TABLE events_master IS 'Tabla unificada de eventos (SQ, BM, futuros). Rediseño 2026-09-17.';
COMMENT ON COLUMN events_master.type IS 'Tipo: SQUADRON, BLACK_MARKET, ACE_CHALLENGE';
COMMENT ON COLUMN events_master.status IS 'Estado: SCHEDULED, OPEN, CLOSED, CANCELLED';
COMMENT ON COLUMN events_master.metadata IS 'Datos específicos por tipo (JSONB)';
COMMENT ON COLUMN events_master.legacy_event_id IS 'ID original del evento en la tabla events (ej: 2026-XX-SEMNN-SQ)';