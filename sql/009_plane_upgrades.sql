-- ============================================================
-- PARAGUAY-FFAA | METALSTORM
-- MIGRACIÓN: Tabla `plane_upgrades`
-- Archivo: 009_plane_upgrades.sql
-- Fase: 2 (Infraestructura como Código)
-- Hallazgo: HALL-048
-- ============================================================
-- PROPÓSITO:
--   Auditoría histórica de mejoras aplicadas a aeronaves.
--   Registra cada cambio de nivel de Fuselaje, Motor,
--   Aviónica o Armas con costos en piezas y avanzadas.
-- DEPENDENCIAS:
--   - `planes` (FK plane_id)
--   - `users` (FK user_id INTEGER)
-- ⚠️  NOTA:
--   Esta tabla también se define en `023_upgrades_2_0.sql`.
--   Ambos son idempotentes (CREATE TABLE IF NOT EXISTS).
--   Ejecutar cualquiera de los dos sin problema.
-- ============================================================

CREATE TABLE IF NOT EXISTS plane_upgrades (
    id SERIAL PRIMARY KEY,
    plane_id INTEGER REFERENCES planes(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    sistema VARCHAR(50) NOT NULL,
    nivel_anterior INTEGER NOT NULL DEFAULT 0,
    nivel_nuevo INTEGER NOT NULL,
    piezas_usadas INTEGER DEFAULT 0,
    avanzadas_usadas INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_plane_upgrades_plane_id ON plane_upgrades(plane_id);
CREATE INDEX IF NOT EXISTS idx_plane_upgrades_user_id ON plane_upgrades(user_id);
CREATE INDEX IF NOT EXISTS idx_plane_upgrades_sistema ON plane_upgrades(sistema);
CREATE INDEX IF NOT EXISTS idx_plane_upgrades_created_at ON plane_upgrades(created_at DESC);

-- Comentarios
COMMENT ON TABLE plane_upgrades IS 'Auditoría histórica de mejoras Upgrades 2.0 aplicadas a aeronaves';
COMMENT ON COLUMN plane_upgrades.sistema IS 'Sistema mejorado: fuselaje, motor, avionica, armas';