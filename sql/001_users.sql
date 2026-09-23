-- ============================================================
-- PARAGUAY-FFAA | METALSTORM
-- MIGRACIÓN: Tabla `users`
-- Archivo: 001_users.sql
-- Fase: 2 (Infraestructura como Código)
-- Hallazgo: HALL-048
-- ============================================================
-- PROPÓSITO:
--   Tabla maestra de combatientes del escuadrón. Contiene
--   credenciales, roles RBAC, estado operativo, vinculación
--   Google OAuth y trazabilidad de bajas militares.
-- REGLAS CRÍTICAS:
--   - `id` (UUID): clave primaria interna de Supabase.
--   - `user_id` (INTEGER): identificador numérico visible.
--   - `token_version`: invalida JWT al cambiar contraseña.
--   - `must_change_password`: fuerza cambio en primer login.
-- DEPENDENCIAS:
--   - Ninguna (tabla raíz).
-- ACTUALIZACIONES:
--   - v4.0.0: inactive_reason, inactive_by, inactive_at
--   - v4.4.0: temporary_password_expires_at
--   - v4.5.0: nick_self_changed_at
--   - v4.5.8: google_id (HALL-061) + sincronización de defaults (BL-017)
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    email_institucional TEXT,
    nick TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'MIEMBRO',
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    must_change_password BOOLEAN DEFAULT false,
    token_version INTEGER NOT NULL DEFAULT 1,
    google_linked BOOLEAN DEFAULT false,
    google_id TEXT,
    full_name TEXT,
    email_personal TEXT,
    phone TEXT,
    bio TEXT,
    notifications_enabled BOOLEAN DEFAULT false,
    avg_tokens INTEGER DEFAULT 0,
    weeks_evaluated INTEGER DEFAULT 0,
    perf_status TEXT DEFAULT 'VERDE',
    inactive_reason TEXT,
    inactive_by UUID REFERENCES users(id) ON DELETE SET NULL,
    inactive_at TIMESTAMPTZ,
    temporary_password_expires_at TIMESTAMPTZ,
    nick_self_changed_at TIMESTAMPTZ,
    last_activity TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_email_institucional ON users(email_institucional);
CREATE INDEX IF NOT EXISTS idx_users_nick ON users(nick);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_last_activity ON users(last_activity);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id) WHERE google_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_temp_password_expires_at ON users(temporary_password_expires_at) WHERE temporary_password_expires_at IS NOT NULL;

-- Comentarios
COMMENT ON TABLE users IS 'Padrón militar de combatientes del escuadrón PARAGUAY FFAA [PRY]';
COMMENT ON COLUMN users.user_id IS 'Identificador numérico visible (nunca UUID)';
COMMENT ON COLUMN users.token_version IS 'Incrementa en cada cambio de clave para invalidar JWT';
COMMENT ON COLUMN users.google_id IS 'Google OAuth 2.0 ID (sub claim). HALL-061.';
COMMENT ON COLUMN users.inactive_reason IS 'Motivo documentado de la baja militar (v4.0.0)';
COMMENT ON COLUMN users.inactive_by IS 'UUID del oficial que ejecutó la baja (v4.0.0)';
COMMENT ON COLUMN users.inactive_at IS 'Timestamp de la baja militar (v4.0.0)';
COMMENT ON COLUMN users.temporary_password_expires_at IS 'Vencimiento de credencial temporal (v4.4.0)';
COMMENT ON COLUMN users.nick_self_changed_at IS 'Tracking de cambio de nick autogestionado (v4.5.0)';