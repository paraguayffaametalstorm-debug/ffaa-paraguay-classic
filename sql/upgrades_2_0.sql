-- ============================================================================
-- PARAGUAY-FFAA | METALSTORM - MIGRACIÓN UPGRADES 2.0
-- Starform Upgrades 2.0 Update (June 2026)
-- ============================================================================

-- 1.1 Agregar columnas a la tabla planes para los 4 sistemas y recursos
ALTER TABLE planes 
ADD COLUMN IF NOT EXISTS nivel_fuselaje INT DEFAULT 0 CHECK (nivel_fuselaje >= 0 AND nivel_fuselaje <= 8),
ADD COLUMN IF NOT EXISTS nivel_motor INT DEFAULT 0 CHECK (nivel_motor >= 0 AND nivel_motor <= 8),
ADD COLUMN IF NOT EXISTS nivel_avionica INT DEFAULT 0 CHECK (nivel_avionica >= 0 AND nivel_avionica <= 8),
ADD COLUMN IF NOT EXISTS nivel_armas INT DEFAULT 0 CHECK (nivel_armas >= 0 AND nivel_armas <= 8),
ADD COLUMN IF NOT EXISTS recursos_piezas INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS recursos_avanzadas INT DEFAULT 0;

-- 1.2 Agregar columna a plane_models para configuración de sistemas
ALTER TABLE plane_models 
ADD COLUMN IF NOT EXISTS sistemas_disponibles JSONB DEFAULT '{"fuselaje": true, "motor": true, "avionica": true, "armas": ["canon", "misiles_corto", "misiles_medio"]}'::jsonb;

-- 1.3 Crear tabla de auditoría para registro histórico de mejoras de sistemas
CREATE TABLE IF NOT EXISTS plane_upgrades (
    id SERIAL PRIMARY KEY,
    plane_id INT REFERENCES planes(id) ON DELETE CASCADE,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    sistema VARCHAR(50) NOT NULL, -- 'fuselaje', 'motor', 'avionica', 'armas'
    nivel_anterior INT NOT NULL DEFAULT 0,
    nivel_nuevo INT NOT NULL,
    piezas_usadas INT DEFAULT 0,
    avanzadas_usadas INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1.4 Índices para optimización de consultas
CREATE INDEX IF NOT EXISTS idx_planes_user_nivel ON planes(user_id, nivel);
CREATE INDEX IF NOT EXISTS idx_plane_upgrades_plane_id ON plane_upgrades(plane_id);
CREATE INDEX IF NOT EXISTS idx_plane_upgrades_user_id ON plane_upgrades(user_id);
