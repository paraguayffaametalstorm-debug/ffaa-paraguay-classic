-- ============================================================
-- PARAGUAY-FFAA | METALSTORM
-- MIGRACIÓN: Tabla `recovery_codes`
-- Archivo: 014_recovery_codes.sql
-- Fase: 2 (Infraestructura como Código)
-- Hallazgo: HALL-048
-- ============================================================
-- PROPÓSITO:
--   Códigos de recuperación alternativos generados por
--   oficiales. Permiten recuperar cuenta si el piloto
--   pierde acceso a su correo.
-- DEPENDENCIAS:
--   - `users` (FK user_id UUID)
-- ============================================================

CREATE TABLE IF NOT EXISTS recovery_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    code_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_by UUID,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_recovery_codes_user_id ON recovery_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_recovery_codes_expires_at ON recovery_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_recovery_codes_used_at ON recovery_codes(used_at);

-- Comentarios
COMMENT ON TABLE recovery_codes IS 'Códigos de recuperación alternativos generados por oficiales';
COMMENT ON COLUMN recovery_codes.code_hash IS 'Hash criptográfico del código (nunca en texto plano)';
COMMENT ON COLUMN recovery_codes.used_at IS 'NULL si no ha sido usado (anti-replay)';