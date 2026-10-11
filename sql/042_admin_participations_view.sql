CREATE OR REPLACE VIEW v_admin_participations AS
SELECT
  ep.id,
  ep.event_id,
  ep.user_id,
  em.name   AS event_name,
  em.type   AS event_type,
  em.status AS event_status,
  em.start_date AS event_start_date,
  em.end_date   AS event_end_date,
  -- FIX-310-bis: prioriza users.nick (fuente de verdad) sobre ep.nick (puede estar corrupto)
  COALESCE(
    NULLIF(TRIM(u.nick), ''),
    NULLIF(TRIM(ep.nick), ''),
    'Desconocido'
  ) AS nick,
  COALESCE(u.role, 'MIEMBRO') AS role,
  COALESCE((ep.data->>'tokens')::int, 0)         AS tokens,
  COALESCE((ep.data->>'days_connected')::int, 0) AS days_connected,
  COALESCE((ep.data->>'flew_in_group')::boolean, false) AS flew_in_group,
  ep.data->>'notes'                              AS notes,
  COALESCE(ep.computed_points, 0) AS computed_points,
  COALESCE(ep.status, 'PENDING')  AS status,
  ep.created_at,
  ep.updated_at
FROM event_participations ep
LEFT JOIN events_master em ON em.id = ep.event_id
LEFT JOIN users u ON u.id = ep.user_id;