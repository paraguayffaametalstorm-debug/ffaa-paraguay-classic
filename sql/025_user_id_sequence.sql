-- ============================================================
-- HALL-024/025: Secuencia atómica para user_id
-- ============================================================
-- Reemplaza la race condition de getNextUserId (SELECT max + INSERT)
-- por una secuencia PostgreSQL atómica y global.
--
-- Fecha de creación: 2026-09-16
-- MAX(user_id) al momento: 1003 → próxima secuencia: 1004
-- Total usuarios: 61
-- Aplicado en Supabase: 2026-09-16
-- ============================================================

-- 1. Crear la secuencia arrancando desde el próximo user_id esperado
CREATE SEQUENCE IF NOT EXISTS user_id_seq
  START WITH 1004
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  CACHE 1;

-- 2. Sincronizar la secuencia con el MAX actual real
--    Si MAX = 1003, entonces nextval() devolverá 1004.
SELECT setval('user_id_seq', (SELECT COALESCE(MAX(user_id), 0) FROM users), true);

-- 3. Crear la función RPC que será llamada desde el backend
CREATE OR REPLACE FUNCTION get_next_user_id()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN nextval('user_id_seq');
END;
$$;

-- 4. Comentarios para documentación
COMMENT ON SEQUENCE user_id_seq IS 'HALL-024/025: Secuencia atómica para user_id de la tabla users. Reemplaza SELECT max + INSERT no atómico.';
COMMENT ON FUNCTION get_next_user_id() IS 'Retorna el siguiente user_id entero de forma atómica. Usado por addMember() y bulkUploadEvent().';

-- ============================================================
-- Rollback (por si hay que revertir)
-- ============================================================
-- DROP FUNCTION IF EXISTS get_next_user_id();
-- DROP SEQUENCE IF EXISTS user_id_seq;