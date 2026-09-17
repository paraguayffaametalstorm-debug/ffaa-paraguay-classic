-- ============================================================================
-- PARAGUAY-FFAA | METALSTORM - MIGRACIÓN UPGRADES 2.0
-- Starform Upgrades 2.0 Update (June 2026)
-- ============================================================================

-- 1.0 Agregar columna rutas_sistemas a la tabla planes
-- Almacena las rutas A/B elegidas por nivel (5-8) para cada sistema.
-- Ejemplo: {"fuselaje": {"5": "A", "6": "B", "7": "A", "8": "B"}, "motor": {...}}
-- HALL-016: necesario para persistir elecciones de rutas de mejora.
ALTER TABLE planes 
ADD COLUMN IF NOT EXISTS rutas_sistemas JSONB DEFAULT '{}'::jsonb;

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
-- HALL-052 (Fase 3): Schema alineado con producción real de Supabase.
-- Correcciones aplicadas:
--   - Eliminada columna user_id (no existe en producción; se obtiene vía plane_id → planes → users).
--   - Eliminadas columnas piezas_usadas y avanzadas_usadas (reemplazadas por recursos_usados).
--   - Agregada columna recursos_usados (INTEGER DEFAULT 0).
--   - Agregados CHECK constraints (nivel_nuevo 0-8, sistema válido).
--   - Eliminado índice idx_plane_upgrades_user_id (columna inexistente).
CREATE TABLE IF NOT EXISTS plane_upgrades (
    id INTEGER PRIMARY KEY DEFAULT nextval('plane_upgrades_id_seq'),
    plane_id INTEGER REFERENCES planes(id) ON DELETE CASCADE,
    sistema TEXT NOT NULL CHECK (sistema IN ('fuselaje', 'motor', 'avionica', 'armas')),
    nivel_anterior INTEGER DEFAULT 0,
    nivel_nuevo INTEGER NOT NULL CHECK (nivel_nuevo >= 0 AND nivel_nuevo <= 8),
    recursos_usados INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Secuencia explícita (para idempotencia y compatibilidad con CREATE TABLE IF NOT EXISTS)
CREATE SEQUENCE IF NOT EXISTS plane_upgrades_id_seq;

-- 1.4 Índices para optimización de consultas
CREATE INDEX IF NOT EXISTS idx_planes_user_nivel ON planes(user_id, nivel);
CREATE INDEX IF NOT EXISTS idx_plane_upgrades_plane_id ON plane_upgrades(plane_id);