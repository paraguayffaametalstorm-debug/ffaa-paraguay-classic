-- ============================================================================
-- PARAGUAY-FFAA | METALSTORM - FIX-209
-- 040_presence_table.sql
-- ============================================================================
-- PROPÓSITO:
--   Migrar el estado de presencia de pilotos desde un Set en memoria
--   (incompatible con multi-réplica) a una tabla persistente en Supabase.
--
-- RESUELVE:
--   - Bug multi-réplica: Fly.io corre 2 máquinas, cada una con su propio Set.
--   - Bug de volatilidad: un redeploy borra el Set.
--   - Bug de conteo: /api/presence/active devuelve valores incorrectos.
--
-- VERIFICACIÓN PREVIA (2026-09-23):
--   - Fly.io: 2 réplicas (1 stopped, 1 started).
--   - Frontend: polling cada 30s al endpoint /active.
--   - TTL elegido: 5 min (10x el intervalo de polling).
--   - Cleanup elegido: 1h (evita acumulación infinita).
--
-- IDEMPOTENTE: Sí (usa IF NOT EXISTS).
-- ROLLBACK: Ver al final del archivo.
-- FECHA: 2026-09-23
-- AUTOR: Comando C4ISR
-- REF: ADR-005-presence-en-supabase.md
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. TABLA PRESENCE
-- ─────────────────────────────────────────────────────────────────────────────
-- Diseño:
--   - user_id UUID PK → UN registro por usuario (UPSERT).
--   - last_seen TIMESTAMPTZ → Para calcular TTL y cleanup.
--   - status TEXT → ONLINE / IDLE / OFFLINE.
--   - created_at / updated_at → Auditoría.
--
-- Nota: se usa user_id UUID (no INTEGER) por consistencia con las tablas
-- modernas (password_resets, recovery_codes, user_settings, event_participations).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS presence (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'ONLINE'
        CHECK (status IN ('ONLINE', 'IDLE', 'OFFLINE')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. ÍNDICES
-- ─────────────────────────────────────────────────────────────────────────────

-- Índice para ordenamientos por last_seen (útil para dashboards)
CREATE INDEX IF NOT EXISTS idx_presence_last_seen
    ON presence(last_seen DESC);

-- Índice compuesto para el query del endpoint /active
CREATE INDEX IF NOT EXISTS idx_presence_status_last_seen
    ON presence(status, last_seen DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────────────────────
-- Bloquea todo acceso anónimo/autenticado estándar. Solo el backend con
-- service_role (que bypasea RLS) puede leer/escribir.
-- Mismo patrón que password_resets, recovery_codes y backups.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE presence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "no_public_access" ON presence;
CREATE POLICY "no_public_access" ON presence
    FOR ALL USING (false) WITH CHECK (false);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. COMENTARIOS
-- ─────────────────────────────────────────────────────────────────────────────

COMMENT ON TABLE presence IS
    'FIX-209: Estado de presencia de pilotos. Reemplaza el Set en memoria del router.';

COMMENT ON COLUMN presence.user_id IS
    'UUID del piloto (FK a users.id). PK: 1 registro por usuario.';

COMMENT ON COLUMN presence.last_seen IS
    'Timestamp del último heartbeat. Si last_seen > NOW() - 5 min, se considera ONLINE.';

COMMENT ON COLUMN presence.status IS
    'Estado explícito: ONLINE, IDLE, OFFLINE.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. VERIFICACIÓN POST-MIGRACIÓN
-- ─────────────────────────────────────────────────────────────────────────────

SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'presence'
ORDER BY ordinal_position;

-- ─────────────────────────────────────────────────────────────────────────────
-- ROLLBACK (por si hay que revertir)
-- ─────────────────────────────────────────────────────────────────────────────
-- DROP TABLE IF EXISTS presence CASCADE;
-- ============================================================================