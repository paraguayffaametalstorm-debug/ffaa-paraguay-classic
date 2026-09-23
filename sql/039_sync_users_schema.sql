-- ============================================================================
-- PARAGUAY-FFAA | METALSTORM - BL-017 / HALL-061
-- 039_sync_users_schema.sql
-- ============================================================================
-- PROPÓSITO:
--   Sincronizar el DDL sql/001_users.sql con la BD real de Supabase.
--   Resuelve HALL-061 (google_id ausente) + 4 discrepancias de defaults
--   detectadas durante la verificación del 2026-09-23.
--
-- CAMBIOS APLICADOS:
--   1. ADD COLUMN google_id TEXT (nullable) + índice (HALL-061).
--   2. ALTER must_change_password SET DEFAULT false (alinear DDL a BD).
--   3. ALTER token_version SET DEFAULT 1 (alinear BD a DDL).
--   4. ALTER token_version SET NOT NULL (endurecer constraint).
--
-- VERIFICACIÓN PREVIA (2026-09-23):
--   - token_version IS NULL: 0 filas (SET NOT NULL es seguro).
--   - must_change_password: 13 false / 50 true (defaults no afectan filas).
--   - 3 INSERTs en código (register, addMember, bulkUploadEvent) fuerzan
--     must_change_password=true explícitamente → el default nunca se usa.
--
-- IDEMPOTENTE: Sí (usa IF NOT EXISTS y SET DEFAULT).
-- ROLLBACK: Ver al final del archivo.
-- FECHA: 2026-09-23
-- AUTOR: Comando C4ISR
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- CAMBIO 1: Agregar columna google_id (HALL-061)
-- ─────────────────────────────────────────────────────────────────────────────
-- El DDL sql/001_users.sql declaraba esta columna pero la BD real NO la tenía.
-- Se agrega para permitir el flujo OAuth 2.0 completo (vincular sin depender
-- del email, auditoría limpia, estándar OAuth).
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS google_id TEXT;

COMMENT ON COLUMN users.google_id IS
  'Google OAuth 2.0 ID (sub claim). HALL-061: agregado el 2026-09-23.';

-- Índice parcial: solo indexa los google_id no-nulos (mayoría serán null)
CREATE INDEX IF NOT EXISTS idx_users_google_id
  ON users(google_id)
  WHERE google_id IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- CAMBIO 2: must_change_password DEFAULT false
-- ─────────────────────────────────────────────────────────────────────────────
-- El DDL decía `DEFAULT true`. La BD real usa `DEFAULT false`.
-- Verificación: los 3 INSERTs de la app fuerzan `must_change_password: true`
-- explícitamente, así que el default NUNCA se usa en producción.
-- Se alinea DDL a BD (default false).
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE users
  ALTER COLUMN must_change_password SET DEFAULT false;

-- ─────────────────────────────────────────────────────────────────────────────
-- CAMBIO 3: token_version DEFAULT 1
-- ─────────────────────────────────────────────────────────────────────────────
-- El DDL decía `DEFAULT 1`. La BD real usa `DEFAULT 0`.
-- Los INSERTs de register() y addMember() fuerzan `token_version: 1`.
-- Pero bulkUploadEvent() NO lo fuerza → hoy cae a `0` (inconsistente).
-- Se alinea BD a DDL (default 1) para cerrar esa brecha de seguridad.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE users
  ALTER COLUMN token_version SET DEFAULT 1;

-- ─────────────────────────────────────────────────────────────────────────────
-- CAMBIO 4: token_version NOT NULL
-- ─────────────────────────────────────────────────────────────────────────────
-- El DDL decía nullable. La BD real ya tiene NOT NULL.
-- Se sincroniza el DDL al comportamiento real (más estricto, más seguro).
-- Verificación: 0 filas con NULL en producción (63 filas totales).
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE users
  ALTER COLUMN token_version SET NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- VERIFICACIÓN POST-MIGRACIÓN
-- ─────────────────────────────────────────────────────────────────────────────

-- Verificación 1: la columna google_id existe
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'users'
  AND column_name = 'google_id';

-- Verificación 2: el índice idx_users_google_id existe
SELECT indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'users'
  AND indexname = 'idx_users_google_id';

-- Verificación 3: los defaults actualizados
SELECT column_name, column_default, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'users'
  AND column_name IN ('must_change_password', 'token_version')
ORDER BY column_name;

-- Resultado esperado:
--   must_change_password | false           | YES
--   token_version       | 1               | NO

-- ─────────────────────────────────────────────────────────────────────────────
-- ROLLBACK (por si hay que revertir)
-- ─────────────────────────────────────────────────────────────────────────────
-- ALTER TABLE users ALTER COLUMN token_version DROP NOT NULL;
-- ALTER TABLE users ALTER COLUMN token_version SET DEFAULT 0;
-- ALTER TABLE users ALTER COLUMN must_change_password SET DEFAULT true;
-- DROP INDEX IF EXISTS idx_users_google_id;
-- ALTER TABLE users DROP COLUMN IF EXISTS google_id;
-- ============================================================================