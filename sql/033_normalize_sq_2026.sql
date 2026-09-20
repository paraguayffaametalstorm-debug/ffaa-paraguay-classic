-- ============================================================
-- 033_normalize_sq_2026.sql
-- Normalización de eventos SQUADRON 2026
-- Fecha: 2026-09-20
-- Autor: Auditoría DB Supabase
-- ============================================================
-- CONTEXTO:
--   Los eventos SQ 2026 tenían:
--     - 3 gaps: SEM 9 (26-02), SEM 17 (23-04), SEM 37 (10-09)
--     - 1 fix de fechas: SEM 8 (23-02→26-02 erróneas)
--     - Numeración desfasada −1 desde SEM 9 en adelante
--
-- ESTRATEGIA (Opción A - renumerar todo):
--   - Insertar los 3 gaps primero
--   - Corregir fechas de SEM 8
--   - Renombrar 26 eventos por ID explícito (SEM 9-35 → SEM 10-36)
--     * NUNCA usar REPLACE/LIKE masivo (colisiona)
--     * NUNCA usar UPDATEs secuenciales ascendentes (arrastra)
--     * SIEMPRE rename por ID explícito
--
-- CONVENCIÓN FINAL:
--   - SQ: jueves 12:00:00 UTC → lunes 11:59:59 UTC (3d 23h 59m 59s)
--   - SEM N = N-ésimo jueves del año 2026
--
-- BACKUPS PREVIOS:
--   - events_master_backup_20260920      (37 filas)
--   - events_master_backup_20260920_full (37 filas)
--
-- VERIFICACIÓN POST-EJECUCIÓN:
--   - 38 eventos SQ en 2026 (SEM 1-37 + W38)
--   - Sin duplicados de nombre
--   - Todos jueves→lunes con delta 3d 23h 59m 59s
-- ============================================================

BEGIN;

-- ============================================================
-- FASE 1: INSERT gaps
-- ============================================================

-- Gap 1: SEM 9 (26-02-2026)
INSERT INTO events_master (type, name, start_date, end_date, status)
SELECT 'SQUADRON', 'Squadron Event 2026-02 · SEM 9 - SQ',
  '2026-02-26 12:00:00+00'::timestamptz,
  '2026-03-02 11:59:59+00'::timestamptz,
  'CLOSED'
WHERE NOT EXISTS (
  SELECT 1 FROM events_master
  WHERE type = 'SQUADRON' AND start_date = '2026-02-26 12:00:00+00'::timestamptz
);

-- Gap 2: SEM 17 (23-04-2026)
INSERT INTO events_master (type, name, start_date, end_date, status)
SELECT 'SQUADRON', 'Squadron Event 2026-04 · SEM 17 - SQ',
  '2026-04-23 12:00:00+00'::timestamptz,
  '2026-04-27 11:59:59+00'::timestamptz,
  'CLOSED'
WHERE NOT EXISTS (
  SELECT 1 FROM events_master
  WHERE type = 'SQUADRON' AND start_date = '2026-04-23 12:00:00+00'::timestamptz
);

-- Gap 3: SEM 37 (10-09-2026)
INSERT INTO events_master (type, name, start_date, end_date, status)
SELECT 'SQUADRON', 'Squadron Event 2026-09 · SEM 37 - SQ',
  '2026-09-10 12:00:00+00'::timestamptz,
  '2026-09-14 11:59:59+00'::timestamptz,
  'CLOSED'
WHERE NOT EXISTS (
  SELECT 1 FROM events_master
  WHERE type = 'SQUADRON' AND start_date = '2026-09-10 12:00:00+00'::timestamptz
);

-- ============================================================
-- FASE 2: Corregir SEM 8 (fechas erróneas)
-- Antes: 2026-02-23 12:00 → 2026-02-26 11:59:59 (lunes→jueves)
-- Ahora: 2026-02-19 12:00 → 2026-02-23 11:59:59 (jueves→lunes)
-- ============================================================
UPDATE events_master
SET
  start_date = '2026-02-19 12:00:00+00',
  end_date   = '2026-02-23 11:59:59+00'
WHERE id = 'a3c535cf-87b7-4ee3-88c0-46c81f47ab04';

-- ============================================================
-- FASE 3: Rename explícito por ID (26 renames, SEM N → SEM N+1)
-- NO USAR REPLACE/LIKE — colisiona con nombres adyacentes
-- ============================================================

-- 05-03: SEM 9 → SEM 10
UPDATE events_master SET name = 'Squadron Event 2026-02 · SEM 10 - SQ'
WHERE id = '3888bdde-3682-430b-be63-147464d692eb';

-- 12-03: SEM 10 → SEM 11
UPDATE events_master SET name = 'Squadron Event 2026-03 · SEM 11 - SQ'
WHERE id = '2672d4dd-9085-4dfc-b3dc-101edf6f33d1';

-- 19-03: SEM 11 → SEM 12
UPDATE events_master SET name = 'Squadron Event 2026-03 · SEM 12 - SQ'
WHERE id = '2e471248-be79-4ade-99d0-6f3394e1d684';

-- 26-03: SEM 12 → SEM 13
UPDATE events_master SET name = 'Squadron Event 2026-03 · SEM 13 - SQ'
WHERE id = '4a685fea-cbd4-42ed-bb9a-07f4b5ddaa55';

-- 02-04: SEM 13 → SEM 14
UPDATE events_master SET name = 'Squadron Event 2026-03 · SEM 14 - SQ'
WHERE id = '66cfa86f-a25d-4796-b57b-2af0eb05ccd6';

-- 09-04: SEM 14 → SEM 15
UPDATE events_master SET name = 'Squadron Event 2026-04 · SEM 15 - SQ'
WHERE id = 'a624e162-1183-44c0-ae4e-8463a6dccc00';

-- 16-04: SEM 15 → SEM 16
UPDATE events_master SET name = 'Squadron Event 2026-04 · SEM 16 - SQ'
WHERE id = '24321426-a264-4631-9ea1-6c082d2867d4';

-- 30-04: SEM 17 → SEM 18
UPDATE events_master SET name = 'Squadron Event 2026-04 · SEM 18 - SQ'
WHERE id = '1e882a7e-bebb-4767-b47b-36adc8b72ea5';

-- 07-05: SEM 18 → SEM 19
UPDATE events_master SET name = 'Squadron Event 2026-04 · SEM 19 - SQ'
WHERE id = 'a274ca7f-5c34-4a51-a59a-6bd977d795d8';

-- 14-05: SEM 19 → SEM 20
UPDATE events_master SET name = 'Squadron Event 2026-05 · SEM 20 - SQ'
WHERE id = 'ef0fc11c-1dd5-481e-a624-3db3bf744a6a';

-- 21-05: SEM 20 → SEM 21
UPDATE events_master SET name = 'Squadron Event 2026-05 · SEM 21 - SQ'
WHERE id = '280a6800-39ab-414d-90a7-6213c2c28969';

-- 28-05: SEM 21 → SEM 22
UPDATE events_master SET name = 'Squadron Event 2026-05 · SEM 22 - SQ'
WHERE id = '29db3d70-8ebf-47d3-b834-721990fa1a3a';

-- 04-06: SEM 22 → SEM 23
UPDATE events_master SET name = 'Squadron Event 2026-05 · SEM 23 - SQ'
WHERE id = 'c0ccea45-7192-4f8c-aa00-c1a0d87e7717';

-- 11-06: SEM 23 → SEM 24
UPDATE events_master SET name = 'Squadron Event 2026-06 · SEM 24 - SQ'
WHERE id = '22678a59-f65f-4582-a0d2-7edc4eaf1a82';

-- 18-06: SEM 24 → SEM 25
UPDATE events_master SET name = 'Squadron Event 2026-06 · SEM 25 - SQ'
WHERE id = 'fcdc8d11-9ae8-427f-bce0-0f3fb3e75869';

-- 25-06: SEM 25 → SEM 26
UPDATE events_master SET name = 'Squadron Event 2026-06 · SEM 26 - SQ'
WHERE id = 'd3a5be08-97cc-4840-8033-d718f8523734';

-- 02-07: SEM 26 → SEM 27
UPDATE events_master SET name = 'Squadron Event 2026-06 · SEM 27 - SQ'
WHERE id = '75702081-98e1-47e0-a6ae-45aa1f8f9787';

-- 09-07: SEM 27 → SEM 28
UPDATE events_master SET name = 'Squadron Event 2026-07 · SEM 28 - SQ'
WHERE id = '4e91973d-24db-4857-a119-3d20f5a884f1';

-- 16-07: SEM 28 → SEM 29
UPDATE events_master SET name = 'Squadron Event 2026-07 · SEM 29 - SQ'
WHERE id = 'd7dbba17-4b1f-4440-9b80-6b7811f396dd';

-- 23-07: SEM 29 → SEM 30
UPDATE events_master SET name = 'Squadron Event 2026-07 · SEM 30 - SQ'
WHERE id = '43b7ed8e-f704-4f8b-9ae4-9b85c49f374a';

-- 30-07: SEM 30 → SEM 31
UPDATE events_master SET name = 'Squadron Event 2026-07 · SEM 31 - SQ'
WHERE id = '7702bcb7-a12f-46c1-9427-150eaf185520';

-- 06-08: SEM 31 → SEM 32
UPDATE events_master SET name = 'Squadron Event 2026-07 · SEM 32 - SQ'
WHERE id = 'd4d34dbe-ee78-4a17-8ce7-8cd77fcd92ce';

-- 13-08: SEM 32 → SEM 33
UPDATE events_master SET name = 'Squadron Event 2026-08 · SEM 33 - SQ'
WHERE id = '8364ecbd-a45c-4357-96eb-86203f86c087';

-- 20-08: SEM 33 → SEM 34
UPDATE events_master SET name = 'Squadron Event 2026-08 · SEM 34 - SQ'
WHERE id = 'bb8f58ea-b015-496c-9e3e-cb6dbd9d0a97';

-- 27-08: SEM 34 → SEM 35
UPDATE events_master SET name = 'Squadron Event 2026-08 · SEM 35 - SQ'
WHERE id = '9f297179-0419-481e-a6c6-5c655356b8c5';

-- 03-09: SEM 35 → SEM 36
UPDATE events_master SET name = 'Squadron Event 2026-08 · SEM 36 - SQ'
WHERE id = '60da591c-245a-42a8-b5e9-6347434829c6';

COMMIT;