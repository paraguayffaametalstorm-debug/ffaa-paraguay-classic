-- ============================================================
-- PARAGUAY-FFAA | METALSTORM
-- MIGRACIÓN: Tabla `error_logs`
-- Archivo: 018_error_logs.sql
-- Fase: 2 (Infraestructura como Código)
-- Hallazgo: HALL-048
-- ============================================================
-- PROPÓSITO:
--   Registro centralizado de errores del sistema para
--   diagnóstico post-mortem. Sin FK para asegurar captura
--   de fallos sin bloqueos de integridad.
-- DEPENDENCIAS:
--   - Ninguna (tabla desacoplada).
-- ============================================================

CREATE TABLE IF NOT EXISTS error_logs (
    id BIGSERIAL PRIMARY KEY,
    level TEXT NOT NULL DEFAULT 'error',
    message TEXT NOT NULL,
    stack TEXT,
    route TEXT,
    user_id TEXT,
    nick TEXT,
    meta JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_level ON error_logs(level);
CREATE INDEX IF NOT EXISTS idx_error_logs_route ON error_logs(route);

-- Comentarios
COMMENT ON TABLE error_logs IS '3 registros de errores del sistema';
COMMENT ON COLUMN error_logs.level IS 'error, warn, info, fatal';
COMMENT ON COLUMN error_logs.meta IS 'Contexto: headers, payload, IP (JSONB)';