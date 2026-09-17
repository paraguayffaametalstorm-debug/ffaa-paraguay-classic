-- ============================================================
-- PARAGUAY-FFAA | METALSTORM
-- MIGRACIÓN: Tabla `plane_mods`
-- Archivo: 006_plane_mods.sql
-- Fase: 2 (Infraestructura como Código)
-- Hallazgo: HALL-048
-- ============================================================
-- PROPÓSITO:
--   Catálogo maestro de los 10 mods tácticos oficiales
--   (m1 a m10) con nombres ES/EN, tipo, descripción,
--   costos de mejora e iconos servidos desde Cloudinary.
-- DEPENDENCIAS:
--   - Ninguna (tabla raíz).
-- ============================================================

CREATE TABLE IF NOT EXISTS plane_mods (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    name_en TEXT,
    type TEXT,
    type_en TEXT,
    description_es TEXT,
    description_en TEXT,
    levels JSONB DEFAULT '{}'::jsonb,
    upgrade_costs JSONB DEFAULT '{}'::jsonb,
    image_url TEXT,
    wiki_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_plane_mods_type ON plane_mods(type);
CREATE INDEX IF NOT EXISTS idx_plane_mods_is_active ON plane_mods(is_active);

-- Comentarios
COMMENT ON TABLE plane_mods IS 'Catálogo de los 10 mods tácticos oficiales (m1-m10)';
COMMENT ON COLUMN plane_mods.upgrade_costs IS 'Costos por nivel: Mod Tokens (1-5) + Mod Materials (50-325)';
COMMENT ON COLUMN plane_mods.image_url IS 'Icono servido desde Cloudinary (w_256,h_256,f_webp)';