-- ============================================================================
-- PARAGUAY-FFAA | METALSTORM - Migración: vencimiento de credenciales temporales
-- Añade columna temporary_password_expires_at a la tabla users.
-- Comportamiento:
--   - NULL = sin vencimiento (compatibilidad hacia atrás).
--   - Con fecha = la contraseña temporal expira en ese momento (UTC).
-- Versión: v4.4.0
-- Fecha: 2026-09-21
-- ============================================================================

-- 1. Columna de vencimiento
ALTER TABLE users
ADD COLUMN IF NOT EXISTS temporary_password_expires_at TIMESTAMPTZ;

-- 2. Índice parcial para consultas de vencimiento
CREATE INDEX IF NOT EXISTS idx_users_temp_password_expires_at
ON users(temporary_password_expires_at)
WHERE temporary_password_expires_at IS NOT NULL;

-- 3. Comentario de columna (documental)
COMMENT ON COLUMN users.temporary_password_expires_at IS
'Fecha/hora UTC de vencimiento de la contraseña temporal. NULL = sin vencimiento (legacy).';