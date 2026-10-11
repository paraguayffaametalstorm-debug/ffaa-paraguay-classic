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
--   Se mantiene el DDL como fuente de verdad.
--   Se elimina el constraint NOT NULL en la BD para alinear.
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

-- Eliminar NOT NULL si existe (idempotente)
ALTER TABLE users
  ALTER COLUMN user_id DROP NOT NULL;

-- Verificación post-cambio
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'users'
  AND column_name = 'user_id';
