-- ============================================================
-- PARAGUAY-FFAA | METALSTORM
-- MIGRACIÓN: Tabla `planes`
-- Archivo: 008_planes.sql
-- Fase: 2 (Infraestructura como Código)
-- Hallazgo: HALL-048
-- ============================================================
-- PROPÓSITO:
--   Hangar personal de cada piloto. Registra los cazas
--   adquiridos con sus niveles, habilidades especiales y
--   pasivas, mods equipados (2 slots), Upgrades 2.0 (4
--   sistemas de nivel 0-8) y recursos disponibles.
-- DEPENDENCIAS:
--   - `users` (FK user_id INTEGER)
--   - `plane_models` (FK avion_id TEXT)
--   - `plane_mods` (FK mod1_id, mod2_id TEXT)
-- NOTA:
--   Esta es la ÚNICA tabla con FK a `users.user_id` (INTEGER)
--   en lugar de `users.id` (UUID).
-- ============================================================

CREATE TABLE IF NOT EXISTS planes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    avion_id TEXT REFERENCES plane_models(id) ON DELETE CASCADE,
    nivel INTEGER DEFAULT 1 CHECK (nivel >= 1 AND nivel <= 20),
    especial_nombre TEXT,
    especial_nivel_num INTEGER CHECK (especial_nivel_num IS NULL OR (especial_nivel_num >= 1 AND especial_nivel_num <= 3)),
    especial_efecto TEXT,
    pasiva_nombre TEXT,
    pasiva_nivel_num INTEGER CHECK (pasiva_nivel_num IS NULL OR (pasiva_nivel_num >= 1 AND pasiva_nivel_num <= 5)),
    pasiva_efecto TEXT,
    mod1_id TEXT REFERENCES plane_mods(id) ON DELETE SET NULL,
    mod1_lvl INTEGER CHECK (mod1_lvl IS NULL OR (mod1_lvl >= 1 AND mod1_lvl <= 5)),
    mod2_id TEXT REFERENCES plane_mods(id) ON DELETE SET NULL,
    mod2_lvl INTEGER CHECK (mod2_lvl IS NULL OR (mod2_lvl >= 1 AND mod2_lvl <= 5)),
    nivel_fuselaje INTEGER DEFAULT 0 CHECK (nivel_fuselaje >= 0 AND nivel_fuselaje <= 8),
    nivel_motor INTEGER DEFAULT 0 CHECK (nivel_motor >= 0 AND nivel_motor <= 8),
    nivel_avionica INTEGER DEFAULT 0 CHECK (nivel_avionica >= 0 AND nivel_avionica <= 8),
    nivel_armas INTEGER DEFAULT 0 CHECK (nivel_armas >= 0 AND nivel_armas <= 8),
    rutas_sistemas JSONB DEFAULT '{}'::jsonb,
    recursos_piezas INTEGER DEFAULT 0,
    recursos_avanzadas INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_planes_user_id ON planes(user_id);
CREATE INDEX IF NOT EXISTS idx_planes_avion_id ON planes(avion_id);
CREATE INDEX IF NOT EXISTS idx_planes_user_nivel ON planes(user_id, nivel);
CREATE INDEX IF NOT EXISTS idx_planes_mod1_id ON planes(mod1_id);
CREATE INDEX IF NOT EXISTS idx_planes_mod2_id ON planes(mod2_id);

-- Constraint de unicidad (un avión por piloto)
ALTER TABLE planes
    ADD CONSTRAINT planes_user_avion_unique
    UNIQUE (user_id, avion_id);

-- Comentarios
COMMENT ON TABLE planes IS 'Hangar personal de cada piloto (122 registros)';
COMMENT ON COLUMN planes.user_id IS 'INTEGER FK -> users.user_id (excepción del sistema)';
COMMENT ON COLUMN planes.rutas_sistemas IS 'Rutas A/B elegidas por nivel (5-8) para cada sistema';
COMMENT ON COLUMN planes.recursos_piezas IS 'Piezas estándar para mejoras';
COMMENT ON COLUMN planes.recursos_avanzadas IS 'Componentes avanzados para mejoras nivel 3+';