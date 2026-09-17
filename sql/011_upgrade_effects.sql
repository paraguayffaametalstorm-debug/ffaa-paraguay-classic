-- ============================================================
-- PARAGUAY-FFAA | METALSTORM
-- MIGRACIÓN: Tabla `upgrade_effects`
-- Archivo: 011_upgrade_effects.sql
-- Fase: 2 (Infraestructura como Código)
-- Hallazgo: HALL-048
-- ============================================================
-- PROPÓSITO:
--   Efectos consolidados de upgrades por nivel (44 filas).
--   Usada por `upgradeEffects.js` para calcular bonos
--   aplicados a las estadísticas de combate.
-- DEPENDENCIAS:
--   - Ninguna (tabla raíz).
-- ============================================================

CREATE TABLE IF NOT EXISTS upgrade_effects (
    id SERIAL PRIMARY KEY,
    sistema TEXT NOT NULL,
    nivel INTEGER NOT NULL CHECK (nivel >= 0 AND nivel <= 8),
    effects JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_upgrade_effects_sistema ON upgrade_effects(sistema);
CREATE INDEX IF NOT EXISTS idx_upgrade_effects_nivel ON upgrade_effects(nivel);
CREATE INDEX IF NOT EXISTS idx_upgrade_effects_sistema_nivel ON upgrade_effects(sistema, nivel);

-- Comentarios
COMMENT ON TABLE upgrade_effects IS 'Efectos consolidados de Upgrades 2.0 por sistema y nivel';