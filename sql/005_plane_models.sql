-- ============================================================
-- PARAGUAY-FFAA | METALSTORM
-- MIGRACIÓN: Tabla `plane_models`
-- Archivo: 005_plane_models.sql
-- Fase: 2 (Infraestructura como Código)
-- Hallazgo: HALL-048
-- ============================================================
-- PROPÓSITO:
--   Catálogo maestro de los 44 modelos de combate oficiales.
--   Incluye stats, habilidades, i18n (columnas _es), datos
--   de la Wiki (historia, paints, canopies, loadout) y
--   configuración de sistemas disponibles por avión.
-- DEPENDENCIAS:
--   - Ninguna (tabla raíz).
-- ============================================================

CREATE TABLE IF NOT EXISTS plane_models (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT,
    tier INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    image_url TEXT,
    special_name TEXT,
    special_levels JSONB DEFAULT '{}'::jsonb,
    passive_name TEXT,
    passive_levels JSONB DEFAULT '{}'::jsonb,
    stats_real JSONB DEFAULT '{}'::jsonb,
    sistemas_disponibles JSONB DEFAULT '{}'::jsonb,
    descripcion TEXT,
    descripcion_es TEXT,
    historia TEXT,
    historia_es TEXT,
    recomendaciones JSONB DEFAULT '{}'::jsonb,
    recomendaciones_es JSONB DEFAULT '{}'::jsonb,
    loadout_wiki JSONB DEFAULT '{}'::jsonb,
    paints JSONB DEFAULT '[]'::jsonb,
    canopies JSONB DEFAULT '[]'::jsonb,
    general_info_wiki JSONB DEFAULT '{}'::jsonb,
    wiki_url TEXT,
    wiki_extracted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_plane_models_tier ON plane_models(tier);
CREATE INDEX IF NOT EXISTS idx_plane_models_type ON plane_models(type);
CREATE INDEX IF NOT EXISTS idx_plane_models_is_active ON plane_models(is_active);

-- Comentarios
COMMENT ON TABLE plane_models IS 'Catálogo oficial de los 44 modelos de combate';
COMMENT ON COLUMN plane_models.sistemas_disponibles IS 'Configuración JSONB de subsistemas por avión (v3.9.3)';
COMMENT ON COLUMN plane_models.descripcion_es IS 'Traducción al español con DeepL (v3.9.8)';
COMMENT ON COLUMN plane_models.historia_es IS 'Trivia histórica traducida (v3.9.8)';
COMMENT ON COLUMN plane_models.loadout_wiki IS 'Armamento detallado extraído de la Wiki';
COMMENT ON COLUMN plane_models.paints IS 'Galería de 310+ paints oficiales';
COMMENT ON COLUMN plane_models.canopies IS '176 cabinas tácticas (4 por avión)';