-- ============================================================
-- PARAGUAY-FFAA | METALSTORM
-- MIGRACIÓN: Tabla `bm_discounts`
-- Archivo: 022_bm_discounts.sql
-- Fase: 2 (Infraestructura como Código)
-- Hallazgo: HALL-048
-- ============================================================
-- PROPÓSITO:
--   Descuento acumulado y adquisición de la aeronave en
--   promoción del Black Market. 250 puntos = 50% descuento.
-- DEPENDENCIAS:
--   - `users` (FK user_id UUID)
--   - `bm_events` (FK bm_event_id INTEGER)
--   - `plane_models` (FK aircraft_id TEXT)
-- ============================================================

CREATE TABLE IF NOT EXISTS bm_discounts (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    bm_event_id INTEGER REFERENCES bm_events(id) ON DELETE CASCADE,
    total_points INTEGER DEFAULT 0,
    discount_percentage INTEGER DEFAULT 0,
    aircraft_id TEXT REFERENCES plane_models(id) ON DELETE SET NULL,
    purchased BOOLEAN DEFAULT false,
    purchased_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_bm_discounts_user_id ON bm_discounts(user_id);
CREATE INDEX IF NOT EXISTS idx_bm_discounts_bm_event_id ON bm_discounts(bm_event_id);
CREATE INDEX IF NOT EXISTS idx_bm_discounts_purchased ON bm_discounts(purchased);

-- Constraint de unicidad
ALTER TABLE bm_discounts
    ADD CONSTRAINT bm_discounts_user_event_unique
    UNIQUE (user_id, bm_event_id);

-- Comentarios
COMMENT ON TABLE bm_discounts IS 'Descuento acumulado y compra en BM';
COMMENT ON COLUMN bm_discounts.discount_percentage IS '1 punto = 0.2% de descuento (máx 50%)';
COMMENT ON COLUMN bm_discounts.purchased_at IS 'NULL si no se ha efectuado la compra';