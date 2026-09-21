-- ============================================================
-- 036 — Verificación HALL-066
-- ============================================================
-- Script idempotente para verificar el estado del sistema
-- tras la corrección quirúrgica del scheduler.
--
-- Ejecutar en SQL Editor de Supabase.
-- ============================================================

-- 1. Estado de eventos recientes
SELECT 
  'ESTADO_EVENTOS' AS seccion,
  name,
  status,
  start_date,
  end_date,
  submission_closes_at,
  (status = 'OPEN') AS es_open,
  (start_date <= NOW() AND end_date >= NOW()) AS dentro_de_ventana,
  (submission_closes_at > NOW()) AS ventana_carga_abierta
FROM events_master
WHERE start_date >= NOW() - INTERVAL '30 days'
ORDER BY start_date DESC
LIMIT 10;

-- 2. Verificar que solo hay 1 OPEN
SELECT 
  'UNICO_OPEN' AS seccion,
  COUNT(*) AS total_open,
  CASE 
    WHEN COUNT(*) = 1 THEN 'OK ✅'
    WHEN COUNT(*) = 0 THEN 'Sin evento activo'
    ELSE 'ERROR: múltiples OPEN 🚨'
  END AS diagnostico
FROM events_master
WHERE status = 'OPEN';

-- 3. Verificar created_at (nunca debe ser start_date)
SELECT 
  'CREATED_AT_OK' AS seccion,
  name,
  start_date,
  created_at,
  CASE 
    WHEN created_at = start_date AND created_at > NOW() THEN 'ERROR: created_at = start_date futuro 🚨'
    WHEN created_at > NOW() THEN 'ERROR: created_at futuro 🚨'
    ELSE 'OK ✅'
  END AS diagnostico
FROM events_master
WHERE start_date >= NOW() - INTERVAL '30 days'
ORDER BY start_date DESC;

-- 4. Eventos SCHEDULED (futuros preparados)
SELECT 
  'SCHEDULED_PREPARADOS' AS seccion,
  name,
  start_date,
  submission_closes_at,
  created_at
FROM events_master
WHERE status = 'SCHEDULED'
ORDER BY start_date ASC;

-- 5. Verificación de coherencia de ventanas
-- El submission_closes_at de un evento debe coincidir con el start_date del siguiente
SELECT 
  'COHERENCIA_VENTANAS' AS seccion,
  a.name AS evento_actual,
  a.submission_closes_at,
  b.name AS proximo_evento,
  b.start_date AS proximo_start,
  CASE 
    WHEN a.submission_closes_at = b.start_date THEN 'OK ✅'
    WHEN b.id IS NULL THEN 'Sin siguiente evento'
    ELSE 'Diferencia: ' || EXTRACT(EPOCH FROM (a.submission_closes_at - b.start_date)) || ' seg'
  END AS diagnostico
FROM events_master a
LEFT JOIN events_master b 
  ON b.type = a.type 
  AND b.start_date > a.start_date 
  AND b.id != a.id
WHERE a.type = 'SQUADRON'
  AND a.start_date >= NOW() - INTERVAL '30 days'
ORDER BY a.start_date DESC
LIMIT 5;