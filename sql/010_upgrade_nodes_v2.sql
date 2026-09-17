
-- ============================================================
-- PARAGUAY-FFAA | METALSTORM
-- MIGRACIÓN: Tabla `upgrade_nodes_v2`
-- Archivo: 010_upgrade_nodes_v2.sql
-- Fase: 2 (Infraestructura como Código)
-- Hallazgo: HALL-048
-- ============================================================
-- PROPÓSITO:
--   Árbol de nodos Starform Upgrades 2.0 (3072 filas).
--   Modela las bifurcaciones de ruta A/B en niveles 5-8
--   por avión y sistema, con efectos, stats afectadas y
--   costos.
-- DEPENDENCIAS:
--   - `plane_models` (FK referencial avion_id TEXT)
-- ============================================================

CREATE TABLE IF NOT EXISTS upgrade_nodes_v2 (
    id SERIAL PRIMARY KEY,
    avion_id TEXT REFERENCES plane_models(id) ON DELETE CASCADE,
    sistema_web TEXT NOT NULL,
    sistema_categoria TEXT,
    nivel INTEGER NOT NULL CHECK (nivel >= 0 AND nivel <= 8),
    ruta TEXT CHECK (ruta IS NULL OR ruta IN ('A', 'B')),
    node_name TEXT NOT NULL,
    requirement_level INTEGER DEFAULT 0,
    effects JSONB DEFAULT '{}'::jsonb,
    stats_afectadas JSONB DEFAULT '{}'::jsonb,
    cost_piezas INTEGER DEFAULT 0,
    cost_avanzadas INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_upgrade_nodes_v2_avion_id ON upgrade_nodes_v2(avion_id);
CREATE INDEX IF NOT EXISTS idx_upgrade_nodes_v2_sistema ON upgrade_nodes_v2(sistema_web);
CREATE INDEX IF NOT EXISTS idx_upgrade_nodes_v2_nivel ON upgrade_nodes_v2(nivel);
CREATE INDEX IF NOT EXISTS idx_upgrade_nodes_v2_ruta ON upgrade_nodes_v2(ruta);
CREATE INDEX IF NOT EXISTS idx_upgrade_nodes_v2_avion_sistema_nivel
    ON upgrade_nodes_v2(avion_id, sistema_web, nivel, ruta);

-- Comentarios
COMMENT ON TABLE upgrade_nodes_v2 IS '3072 nodos del árbol Starform Upgrades 2.0';
COMMENT ON COLUMN upgrade_nodes_v2.sistema_web IS 'Sistema base: fuselaje, motor, avionica, armas';
COMMENT ON COLUMN upgrade_nodes_v2.sistema_categoria IS 'Categoría específica: canones, misiles_ir, etc.';
COMMENT ON COLUMN upgrade_nodes_v2.ruta IS 'Ruta A/B en niveles 5-8 (NULL en niveles 0-4)';
COMMENT ON COLUMN upgrade_nodes_v2.effects IS 'Efectos cuantitativos del nodo (JSONB)';
COMMENT ON COLUMN upgrade_nodes_v2.stats_afectadas IS 'Stats impactadas (velocidad, agilidad, etc.)';