-- ============================================================================
-- PARAGUAY-FFAA | METALSTORM - ACTUALIZACIÓN DE BASE DE DATOS v3.4.0
-- Módulo: Password Resets (Recuperación de Contraseña por Email) y C4ISR
-- ============================================================================

-- 1. Tabla de tokens temporales de restablecimiento de contraseña
CREATE TABLE IF NOT EXISTS password_resets (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMP WITH TIME ZONE,
    ip VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Índices de alta velocidad para validación y auditoría
CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token);
CREATE INDEX IF NOT EXISTS idx_password_resets_email ON password_resets(email);
CREATE INDEX IF NOT EXISTS idx_password_resets_expires ON password_resets(expires_at);
CREATE INDEX IF NOT EXISTS idx_password_resets_used ON password_resets(used);

-- 3. Documentación de esquema militar en PostgreSQL
COMMENT ON TABLE password_resets IS 'Almacén de tokens de un solo uso para restablecimiento criptoseguro de contraseñas por correo (15 min)';
COMMENT ON COLUMN password_resets.token IS 'Token aleatorio criptográfico generado con crypto.randomBytes(32).toString("hex")';
COMMENT ON COLUMN password_resets.used IS 'Indicador booleano que previene ataques de repetición/reutilización';
COMMENT ON COLUMN password_resets.expires_at IS 'Marca de tiempo de expiración estricta de 15 minutos';
