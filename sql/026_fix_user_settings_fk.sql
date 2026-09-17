-- ============================================================
-- HALL-044: Corregir FK de user_settings.user_id
-- ============================================================
-- PROBLEMA: La FK apuntaba a auth.users(id) en lugar de public.users(id).
-- Esto causaba violación de FK al insertar settings para pilotos
-- que NO existen en auth.users (todos los del escuadrón).
--
-- Fecha de creación: 2026-09-16
-- Aplicado en Supabase: 2026-09-16
-- Estado verificado antes del fix: user_settings = 0 filas
-- ============================================================

-- 1. Eliminar la FK incorrecta
ALTER TABLE public.user_settings
  DROP CONSTRAINT IF EXISTS user_settings_user_id_fkey;

-- 2. Limpiar registros huérfanos (no-op si la tabla está vacía, defensivo)
DELETE FROM public.user_settings
WHERE user_id NOT IN (SELECT id FROM public.users);

-- 3. Crear la FK correcta apuntando a public.users(id)
ALTER TABLE public.user_settings
  ADD CONSTRAINT user_settings_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES public.users(id)
  ON DELETE CASCADE;

-- ============================================================
-- Rollback (por si hay que revertir)
-- ============================================================
-- ALTER TABLE public.user_settings DROP CONSTRAINT IF EXISTS user_settings_user_id_fkey;
-- ALTER TABLE public.user_settings
--   ADD CONSTRAINT user_settings_user_id_fkey
--   FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;