-- ============================================================
-- PARAGUAY-FFAA | METALSTORM
-- FIX: BL-033 — Drift DDL vs BD real
-- Archivo: sql/044_fix_users_user_id_nullable.sql
-- Fecha: 2026-10-11
-- ============================================================
-- PROPÓSITO:
--   Alinear el DDL con la realidad de la BD.
--   El DDL declaraba user_id INTEGER UNIQUE NOT NULL,
--   pero la BD real lo tiene como nullable (verificado 2026-10-11).
--
-- DECISIÓN:
--   Se mantiene el DDL como fuente de verdad (user_id NOT NULL).
--   Se agrega el constraint NOT NULL en la BD para alinear.
--   Verificado: 0 filas con user_id NULL al momento del fix.
-- ============================================================

-- Verificación previa
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'users'
  AND column_name = 'user_id';

-- Asegurar NOT NULL (idempotente)
-- Precondición: 0 filas con user_id NULL
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM users WHERE user_id IS NULL
  ) THEN
    ALTER TABLE users ALTER COLUMN user_id SET NOT NULL;
  ELSE
    RAISE EXCEPTION 'Hay filas con user_id NULL. Abortando SET NOT NULL.';
  END IF;
END $$;

-- Verificación post-cambio
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'users'
  AND column_name = 'user_id';
