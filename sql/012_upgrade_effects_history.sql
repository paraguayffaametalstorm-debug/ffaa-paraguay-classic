-- ============================================================
-- PARAGUAY-FFAA | METALSTORM
-- MIGRACIÓN: Tabla `upgrade_effects_history`
-- Archivo: 012_upgrade_effects_history.sql
-- Fase: 2 (Infraestructura como Código)
-- Hallazgo: HALL-048
-- ============================================================
-- PROPÓSITO:
--   Historial de cambios en efectos de upgrades. Auditoría
--   de modificaciones al catálogo de efectos por sistema
--   y nivel.
-- DEPENDENCIAS:
--   - Ninguna (tabla raíz).
-- ============================================================

CREATE TABLE IF NOT EXISTS upgrade_effects_history (
    id SERIAL PRIMARY KEY,
    upgrade_effect_id INTEGER,
    sistema TEXT,
    nivel INTEGER,
    effects_anteriores JSONB,
    effects_nuevos JSONB,
    modificado_por TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_upgrade_effects_history_effect_id ON upgrade_effects_history(upgrade_effect_id);
CREATE INDEX IF NOT EXISTS idx_upgrade_effects_history_created_at ON upgrade_effects_history(created_at DESC);

-- Comentarios
COMMENT ON TABLE upgrade_effects_history IS 'Historial de cambios en el catálogo de efectos de upgrades';