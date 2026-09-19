-- ============================================================
-- 032 — DROP tablas BM legacy (F4.2.2-G)
-- ============================================================
-- Propósito:
--   Eliminar las 4 tablas legacy del Black Market, ahora que
--   el módulo BM opera 100% sobre events_master + event_participations.
--
-- Contexto:
--   - ADR-006-black-market-unificado.md
--   - Fases F4.2.2-A a F4.2.2-G
--
-- Ejecución:
--   ⚠️ NO ejecutar hasta que el deploy de F4.2.2-G esté verificado
--      en producción (mínimo 7 días de estabilidad).
--
--   Estas tablas están VACÍAS (0 filas) según verificación del
--   2026-09-19. El DROP es puramente housekeeping.
--
-- Rollback:
--   No aplica — las tablas pueden recrearse desde sql/019-022_*.sql
--   si fuese necesario (aunque su contenido está vacío).
-- ============================================================

-- Verificación previa: confirmar que están vacías
-- SELECT 'bm_events' as tabla, COUNT(*) as filas FROM bm_events
-- UNION ALL SELECT 'bm_missions', COUNT(*) FROM bm_missions
-- UNION ALL SELECT 'bm_progress', COUNT(*) FROM bm_progress
-- UNION ALL SELECT 'bm_discounts', COUNT(*) FROM bm_discounts;

-- DROP de las 4 tablas (orden importa por FKs)
DROP TABLE IF EXISTS bm_discounts CASCADE;
DROP TABLE IF EXISTS bm_progress CASCADE;
DROP TABLE IF EXISTS bm_missions CASCADE;
DROP TABLE IF EXISTS bm_events CASCADE;

-- Verificación post-DROP: estas queries deben devolver 0 filas
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public'
--   AND table_name IN ('bm_events','bm_missions','bm_progress','bm_discounts');
