-- ============================================================================
-- PARAGUAY-FFAA | METALSTORM - v4.5.0
-- Tracking de cambios de nick autogestionados
-- ============================================================================

-- 1. Columna en users
ALTER TABLE users
ADD COLUMN IF NOT EXISTS nick_self_changed_at TIMESTAMPTZ NULL;

-- 2. Tabla de auditoría
CREATE TABLE IF NOT EXISTS user_nick_changes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    previous_nick TEXT NOT NULL,
    new_nick TEXT NOT NULL,
    previous_institutional_email TEXT NULL,
    new_institutional_email TEXT NULL,
    change_type TEXT NOT NULL CHECK (change_type IN ('SELF', 'ADMIN')),
    changed_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
    reason TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_nick_changes_user_id
    ON user_nick_changes(user_id, created_at DESC);

ALTER TABLE user_nick_changes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS no_public_access ON user_nick_changes;
CREATE POLICY no_public_access ON user_nick_changes
    FOR ALL TO public USING (false) WITH CHECK (false);