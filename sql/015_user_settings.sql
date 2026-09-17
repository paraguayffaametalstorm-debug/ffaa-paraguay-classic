-- ============================================================
-- PARAGUAY-FFAA | METALSTORM
-- MIGRACIÓN: Tabla `user_settings`
-- Archivo: 015_user_settings.sql
-- Fase: 2 (Infraestructura como Código)
-- Hallazgo: HALL-048
-- ============================================================
-- PROPÓSITO:
--   Preferencias individuales de cada piloto: tema visual,
--   idioma, canales de notificación.
-- DEPENDENCIAS:
--   - `users` (FK user_id UUID, UNIQUE)
-- ============================================================

CREATE TABLE IF NOT EXISTS user_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    theme TEXT DEFAULT 'militar',
    language TEXT DEFAULT 'es',
    notif_email BOOLEAN DEFAULT false,
    notif_whatsapp BOOLEAN DEFAULT false,
    notif_status BOOLEAN DEFAULT true,
    notif_reminder BOOLEAN DEFAULT true,
    notif_announcements BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE UNIQUE INDEX IF NOT EXISTS user_settings_user_id_idx ON user_settings(user_id);

-- Comentarios
COMMENT ON TABLE user_settings IS 'Preferencias personales de interfaz y alertas por piloto';
COMMENT ON COLUMN user_settings.theme IS 'Perfil visual: militar, ops, clasico';
COMMENT ON COLUMN user_settings.language IS 'Idioma de interfaz: es, en';