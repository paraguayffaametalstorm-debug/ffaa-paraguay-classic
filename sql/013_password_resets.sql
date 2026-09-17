-- ============================================================================
-- PARAGUAY-FFAA | METALSTORM - MIGRACIÓN DE TABLA password_resets
-- Almacena tokens criptográficos de un solo uso para restablecimiento de
-- contraseñas con vigencia estricta de 15 minutos.
-- Versión: v4.0.0
-- Fecha: 2026-09-16
-- ============================================================================

-- 1. Crear la tabla password_resets
CREATE TABLE IF NOT EXISTS password_resets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Índices para optimización de consultas
CREATE INDEX IF NOT EXISTS idx_password_resets_token
    ON password_resets(token);

CREATE INDEX IF NOT EXISTS idx_password_resets_user_id
    ON password_resets(user_id);

CREATE INDEX IF NOT EXISTS idx_password_resets_expires_at
    ON password_resets(expires_at);

CREATE INDEX IF NOT EXISTS idx_password_resets_used
    ON password_resets(used);

-- 3. Habilitar Row Level Security (RLS)
ALTER TABLE password_resets ENABLE ROW LEVEL SECURITY;

-- 4. Política RLS: Solo el service_role (backend) puede leer/escribir.
--    Ningún usuario con anon key o authenticated puede acceder directamente.
DROP POLICY IF EXISTS no_public_access ON password_resets;
CREATE POLICY no_public_access
    ON password_resets
    FOR ALL
    TO public
    USING (false)
    WITH CHECK (false);