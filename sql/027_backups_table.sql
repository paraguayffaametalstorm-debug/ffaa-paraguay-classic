-- ============================================================================
-- 027_backups_table.sql
-- PARAGUAY-FFAA | METALSTORM
-- ============================================================================
-- Propósito: Persistencia de copias de seguridad generadas por el OWNER.
--
-- Hallazgos resueltos:
--   - HALL-036: Backups en memoria efímeros → persistencia real en Supabase.
--   - HALL-037: Backups no sanitizaban PII → sanitización ampliada en el
--               controlador (capa de aplicación, no BD).
--
-- Fase: 4 — Seguridad Secundaria
-- Creado: 2026-09-17
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Tabla principal de backups
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS backups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_by_nick TEXT,
    size_bytes INTEGER NOT NULL,
    hash_sha256 TEXT NOT NULL,
    content JSONB NOT NULL,
    version TEXT NOT NULL DEFAULT '4.1.0',
    tables_included TEXT[] NOT NULL,
    users_count INTEGER NOT NULL DEFAULT 0,
    performances_count INTEGER NOT NULL DEFAULT 0,
    events_count INTEGER NOT NULL DEFAULT 0,
    notes TEXT
);

-- ----------------------------------------------------------------------------
-- 2. Índices para consultas rápidas
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_backups_created_at ON backups (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_backups_created_by ON backups (created_by);

-- ----------------------------------------------------------------------------
-- 3. Row Level Security
-- ----------------------------------------------------------------------------
-- Bloquea todo acceso anónimo/autenticado estándar. Solo el backend con
-- service_role (que bypasea RLS) puede leer/escribir esta tabla.
-- Mismo patrón usado en `password_resets` y `recovery_codes`.
-- ----------------------------------------------------------------------------
ALTER TABLE backups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "no_public_access" ON backups;
CREATE POLICY "no_public_access" ON backups
    FOR ALL USING (false) WITH CHECK (false);

-- ----------------------------------------------------------------------------
-- 4. Documentación
-- ----------------------------------------------------------------------------
COMMENT ON TABLE backups IS 'Copia de seguridad persistida generada por el OWNER. Solo service_role accede (RLS bloquea todo lo demás).';
COMMENT ON COLUMN backups.hash_sha256 IS 'Hash SHA-256 del contenido serializado, para verificación de integridad.';
COMMENT ON COLUMN backups.content IS 'Payload JSONB completo del backup (usuarios, performances, eventos sanitizados).';
COMMENT ON COLUMN backups.notes IS 'Nota opcional del OWNER para contextualizar el backup (ej: "pre-migración").';