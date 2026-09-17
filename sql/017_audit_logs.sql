-- ============================================================
-- PARAGUAY-FFAA | METALSTORM
-- MIGRACIÓN: Tabla `audit_logs`
-- Archivo: 017_audit_logs.sql
-- Fase: 2 (Infraestructura como Código)
-- Hallazgo: HALL-048
-- ============================================================
-- PROPÓSITO:
--   Auditoría de cambios administrativos (ascensos, bajas,
--   activaciones, cambios de rol, reseteos).
-- DEPENDENCIAS:
--   - Ninguna (usa TEXT para user_id para desacoplar).
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    user_id TEXT,
    nick TEXT,
    role TEXT,
    action TEXT NOT NULL,
    entity TEXT,
    entity_id TEXT,
    details JSONB,
    ip TEXT,
    result TEXT NOT NULL DEFAULT 'SUCCESS'
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity);
CREATE INDEX IF NOT EXISTS idx_audit_logs_result ON audit_logs(result);

-- Comentarios
COMMENT ON TABLE audit_logs IS '6 registros de auditoría administrativa';
COMMENT ON COLUMN audit_logs.action IS 'USER_DEACTIVATED, ROLE_CHANGE, CREATE_PLANE_MODEL, etc.';
COMMENT ON COLUMN audit_logs.result IS 'SUCCESS o FAILED';
COMMENT ON COLUMN audit_logs.user_id IS 'TEXT (permite UUID o user_id numérico)';