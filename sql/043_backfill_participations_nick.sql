-- Corrige event_participations.nick para que refleje users.nick real
UPDATE event_participations ep
SET nick = u.nick
FROM users u
WHERE ep.user_id = u.id
  AND ep.nick IS DISTINCT FROM u.nick;

-- Verificación post-backfill:
-- SELECT COUNT(*) FILTER (WHERE ep.nick = u.nick) AS correctas,
--        COUNT(*) FILTER (WHERE ep.nick IS DISTINCT FROM u.nick) AS incorrectas
-- FROM event_participations ep LEFT JOIN users u ON u.id = ep.user_id;