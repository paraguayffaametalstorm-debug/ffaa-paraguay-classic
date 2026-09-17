-- ============================================================
-- PARAGUAY-FFAA | METALSTORM
-- MIGRACIÓN: Tabla `security_events`
-- Archivo: 016_security_events.sql
-- Fase: 2 (Infraestructura como Código)
-- Hallazgo: HALL-048
-- ============================================================
-- PROPÓSITO:
--   Registro de eventos de seguridad: autenticaciones,
--   intentos fallidos, cambios de clave, reseteos admin.
--   Incluye IP y User-Agent para forense.
-- DEPENDENCIAS:
--   - `users` (FK user_id UUID)
-- ============================================================

CREATE TABLE IF NOT EXISTS security_events (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    nick TEXT,
    event_type TEXT NOT NULL,
    description TEXT,
    ip TEXT,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_event_type ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON security_events(created_at DESC);

-- Comentarios
COMMENT ON TABLE security_events IS '214 eventos de seguridad (logins, resets, cambios de clave)';
COMMENT ON COLUMN security_events.event_type IS 'LOGIN_SUCCESS, PASSWORD_CHANGED, PASSWORD_RESET_REQUESTED, etc.';
COMMENT ON COLUMN security_events.metadata IS 'Contexto adicional: target_role, IP, etc.';