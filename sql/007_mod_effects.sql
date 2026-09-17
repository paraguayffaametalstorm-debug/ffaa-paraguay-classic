-- ============================================================
-- PARAGUAY-FFAA | METALSTORM
-- MIGRACIÓN: Tabla `mod_effects`
-- Archivo: 007_mod_effects.sql
-- Fase: 2 (Infraestructura como Código)
-- Hallazgo: HALL-048
-- ============================================================
-- PROPÓSITO:
--   Efectos numéricos de los 10 mods × 5 niveles (50 filas).
--   Usada por `getPlaneStats()` para aplicar bonificaciones
--   a las estadísticas de combate en tiempo real.
-- DEPENDENCIAS:
--   - Ninguna (tabla raíz).
-- ============================================================

CREATE TABLE IF NOT EXISTS mod_effects (
    id SERIAL PRIMARY KEY,
    mod_id TEXT NOT NULL,
    mod_name TEXT NOT NULL,
    mod_type TEXT NOT NULL,
    level INTEGER NOT NULL CHECK (level >= 1 AND level <= 5),
    effects JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_mod_effects_mod_id ON mod_effects(mod_id);
CREATE INDEX IF NOT EXISTS idx_mod_effects_level ON mod_effects(level);
CREATE INDEX IF NOT EXISTS idx_mod_effects_mod_level ON mod_effects(mod_id, level);
CREATE INDEX IF NOT EXISTS idx_mod_effects_is_active ON mod_effects(is_active);

-- Constraint de unicidad (un registro por mod/nivel)
ALTER TABLE mod_effects
    ADD CONSTRAINT mod_effects_mod_level_unique
    UNIQUE (mod_id, level);

-- Comentarios
COMMENT ON TABLE mod_effects IS '50 filas: efectos numéricos de los 10 mods × 5 niveles';
COMMENT ON COLUMN mod_effects.effects IS 'JSONB con magnitudes, unidades y condición de activación';
COMMENT ON COLUMN mod_effects.mod_type IS 'Familias: Agilidad, Defensa, Motor, Señuelos, Arma';