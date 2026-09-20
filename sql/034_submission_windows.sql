-- ============================================================
-- 034_submission_windows.sql
-- Migracion: Ventanas de carga desacopladas del ciclo de evento
-- ADR-008: submission_opens_at + submission_closes_at
-- Autor: Comando C4ISR
-- Fecha: 2026-09-20
-- Idempotente: si (usa IF NOT EXISTS)
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 0. VERIFICACION PRE-MIGRACION
-- ─────────────────────────────────────────────────────────────

-- 0.1 Total de eventos en events_master
SELECT
  COUNT(*) AS total_eventos,
  COUNT(*) FILTER (WHERE type = 'SQUADRON') AS total_sq,
  COUNT(*) FILTER (WHERE type = 'BLACK_MARKET') AS total_bm
FROM events_master;

-- ─────────────────────────────────────────────────────────────
-- 1. AGREGAR COLUMNAS
-- ─────────────────────────────────────────────────────────────

ALTER TABLE events_master
  ADD COLUMN IF NOT EXISTS submission_opens_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS submission_closes_at TIMESTAMPTZ;

COMMENT ON COLUMN events_master.submission_opens_at IS
  'Momento (UTC) en que se abre la ventana de carga de performance. Desacoplado del ciclo del evento (ADR-008).';

COMMENT ON COLUMN events_master.submission_closes_at IS
  'Momento (UTC) en que se cierra la ventana de carga. Despues de esta fecha, la participacion queda en solo-lectura.';

-- ─────────────────────────────────────────────────────────────
-- 2. INDICE PARCIAL PARA QUERIES RAPIDAS
-- ─────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_events_master_submission_window
  ON events_master (submission_opens_at, submission_closes_at)
  WHERE status IN ('OPEN', 'CLOSED');

-- ─────────────────────────────────────────────────────────────
-- 3. BACKFILL DE EVENTOS SQ (ventana de 7 dias)
-- Regla ADR-008: submission_opens_at = start_date
--                submission_closes_at = start_date + 7 dias
-- ─────────────────────────────────────────────────────────────

UPDATE events_master
SET
  submission_opens_at = start_date,
  submission_closes_at = start_date + INTERVAL '7 days'
WHERE type = 'SQUADRON'
  AND submission_opens_at IS NULL;

-- ─────────────────────────────────────────────────────────────
-- 4. BACKFILL DE EVENTOS BM (ventana de 6 dias)
-- Regla ADR-008: submission_opens_at = start_date
--                submission_closes_at = start_date + 6 dias
-- ─────────────────────────────────────────────────────────────

UPDATE events_master
SET
  submission_opens_at = start_date,
  submission_closes_at = start_date + INTERVAL '6 days'
WHERE type = 'BLACK_MARKET'
  AND submission_opens_at IS NULL;

-- ─────────────────────────────────────────────────────────────
-- 5. VERIFICACION POST-MIGRACION
-- ─────────────────────────────────────────────────────────────

-- 5.1 Total de eventos con ventana asignada (deberia ser 100%)
SELECT
  COUNT(*) AS total_eventos,
  COUNT(submission_opens_at) AS con_opens_at,
  COUNT(submission_closes_at) AS con_closes_at,
  COUNT(*) FILTER (WHERE submission_opens_at IS NULL) AS sin_opens_at,
  COUNT(*) FILTER (WHERE submission_closes_at IS NULL) AS sin_closes_at
FROM events_master;

-- 5.2 Eventos SIN ventana (deberia ser 0 filas)
SELECT id, name, type, status
FROM events_master
WHERE submission_opens_at IS NULL
   OR submission_closes_at IS NULL;

-- 5.3 Muestra de las ultimas 5 ventanas calculadas
SELECT
  name,
  type,
  status,
  start_date,
  submission_opens_at,
  submission_closes_at,
  (submission_closes_at - submission_opens_at) AS duracion
FROM events_master
ORDER BY start_date DESC
LIMIT 5;

-- 5.4 Verificar que la ventana del SQ SEM 39 sea de 7 dias
SELECT
  name,
  start_date,
  submission_opens_at,
  submission_closes_at,
  (submission_closes_at - submission_opens_at) AS duracion
FROM events_master
WHERE name = 'Squadron Event 2026-W39';