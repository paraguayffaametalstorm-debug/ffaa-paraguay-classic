-- ============================================================
-- PARAGUAY-FFAA | METALSTORM
-- MIGRACIÓN: Advisory Locks para el Scheduler
-- Archivo: 030_scheduler_locks.sql
-- Fase: Rediseño de Eventos (F2.8)
-- ============================================================
-- PROPÓSITO:
--   Proveer funciones RPC para coordinación de multi-réplica
--   en el scheduler de eventos.
--
-- USO DESDE NODE:
--   await supabase.rpc('acquire_scheduler_lock');  // boolean
--   await supabase.rpc('release_scheduler_lock');  // boolean
--
-- CONTEXTO:
--   Fly.io corre múltiples réplicas. Si cada una ejecuta el
--   scheduler, habría duplicados de eventos. Los advisory locks
--   de PostgreSQL garantizan que solo 1 réplica ejecute.
-- ============================================================

-- Función: intenta adquirir el advisory lock del scheduler.
-- Devuelve TRUE si lo obtuvo, FALSE si ya está tomado por otra sesión.
CREATE OR REPLACE FUNCTION acquire_scheduler_lock()
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  lock_acquired BOOLEAN;
BEGIN
  -- Lock ID: 12345 (arbitrario, único para el scheduler)
  SELECT pg_try_advisory_lock(12345) INTO lock_acquired;
  RETURN lock_acquired;
END;
$$;

-- Función: libera el advisory lock del scheduler.
CREATE OR REPLACE FUNCTION release_scheduler_lock()
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN pg_advisory_unlock(12345);
END;
$$;

-- Comentarios
COMMENT ON FUNCTION acquire_scheduler_lock() IS 'F2.8: Intenta adquirir el advisory lock del scheduler. Devuelve TRUE si lo obtuvo, FALSE si ya está tomado.';
COMMENT ON FUNCTION release_scheduler_lock() IS 'F2.8: Libera el advisory lock del scheduler.';