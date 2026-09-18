-- ============================================================
-- PARAGUAY-FFAA | METALSTORM
-- VERIFICACIÓN: Estado del Sistema de Eventos
-- Archivo: 031_verify_events_system.sql
-- Fase: Documentación (F3.4)
-- ============================================================
-- PROPÓSITO:
--   Script idempotente de verificación del estado del sistema
--   de eventos post-F3. Ejecutable múltiples veces sin error.
--
-- USO:
--   Ejecutar en SQL Editor de Supabase para obtener el estado
--   real del sistema. Usado como fuente de verdad para
--   documentación.
-- ============================================================

-- ============================================================
-- 1. CONTEOS DE EVENTS_MASTER
-- ============================================================

SELECT 
  'EVENTS_MASTER' AS seccion,
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE status = 'OPEN') AS abiertos,
  COUNT(*) FILTER (WHERE status = 'CLOSED') AS cerrados,
  COUNT(*) FILTER (WHERE status = 'SCHEDULED') AS programados,
  COUNT(*) FILTER (WHERE metadata->>'no_data' = 'true') AS sin_datos,
  COUNT(*) FILTER (WHERE metadata->>'backfilled' = 'true') AS backfilled
FROM events_master;

-- ============================================================
-- 2. CONTEOS DE EVENT_PARTICIPATIONS
-- ============================================================

SELECT 
  'EVENT_PARTICIPATIONS' AS seccion,
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE status = 'VALIDATED') AS validated,
  COUNT(*) FILTER (WHERE status = 'PENDING') AS pending,
  COUNT(*) FILTER (WHERE status = 'REJECTED') AS rejected,
  SUM(computed_points) AS total_points
FROM event_participations;

-- ============================================================
-- 3. DISTRIBUCIÓN POR TIPO DE EVENTO
-- ============================================================

SELECT 
  type,
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE status = 'OPEN') AS abiertos,
  COUNT(*) FILTER (WHERE status = 'CLOSED') AS cerrados
FROM events_master
GROUP BY type
ORDER BY type;

-- ============================================================
-- 4. TABLAS LEGACY (preservadas)
-- ============================================================

SELECT 
  'TABLAS LEGACY' AS seccion,
  (SELECT COUNT(*) FROM events) AS events_legacy,
  (SELECT COUNT(*) FROM performances) AS performances_legacy;

-- ============================================================
-- 5. FUNCIONES RPC DEL SCHEDULER
-- ============================================================

SELECT 
  proname AS funcion,
  pg_get_function_result(oid) AS tipo_retorno
FROM pg_proc
WHERE proname IN ('acquire_scheduler_lock', 'release_scheduler_lock')
ORDER BY proname;

-- ============================================================
-- 6. ÍNDICES DE EVENTS_MASTER
-- ============================================================

SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public' 
  AND tablename = 'events_master'
ORDER BY indexname;

-- ============================================================
-- 7. INTEGRIDAD REFERENCIAL
-- ============================================================

SELECT 
  'INTEGRIDAD' AS seccion,
  (SELECT COUNT(*) FROM event_participations ep
   WHERE NOT EXISTS (SELECT 1 FROM events_master em WHERE em.id = ep.event_id)) AS participations_huerfanas_event,
  (SELECT COUNT(*) FROM event_participations ep
   WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = ep.user_id)) AS participations_huerfanas_user;

-- ============================================================
-- 8. RESUMEN CONSOLIDADO DEL SISTEMA
-- ============================================================

SELECT 
  'SISTEMA' AS seccion,
  (SELECT COUNT(*) FROM users) AS users_total,
  (SELECT COUNT(*) FROM users WHERE status = 'ACTIVE') AS users_active,
  (SELECT COUNT(*) FROM users WHERE status = 'INACTIVE') AS users_inactive,
  (SELECT COUNT(*) FROM planes) AS planes_total,
  (SELECT COUNT(*) FROM plane_models) AS plane_models_total,
  (SELECT COUNT(*) FROM events_master) AS events_master_total,
  (SELECT COUNT(*) FROM event_participations) AS event_participations_total;

  -- ============================================================
-- 9. VALORES ESPERADOS (Referencia para Validación Manual)
-- ============================================================
-- Al ejecutar este script, comparar los resultados con:
--
-- events_master:         36 totales
--   - OPEN:               1  (SEM 38, auto_created)
--   - CLOSED:             35
--   - no_data:            11
--   - backfilled:         1  (BM SEM 16)
--
-- event_participations:  639 totales
--   - VALIDATED:          482
--   - PENDING:            52
--   - REJECTED:           105
--   - total_points:       98,750
--
-- Distribución por tipo:
--   - SQUADRON:           35  (1 OPEN, 34 CLOSED)
--   - BLACK_MARKET:       1   (CLOSED)
--
-- Tablas legacy:
--   - events:             35
--   - performances:       639
--
-- Usuarios:               61  (28 activos, 33 inactivos)
-- Planes:                 122
-- Plane_models:           44
--
-- Funciones RPC:          2
-- Índices events_master:  6
--
-- Integridad referencial:
--   - Huérfanos event_id: 0
--   - Huérfanos user_id:  0
--
-- Última verificación:    2026-09-18
-- ============================================================