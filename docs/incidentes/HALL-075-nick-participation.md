# HALL-075 - Nick incorrecto en event_participations

**Fecha:** 2026-10-08
**Severidad:** ALTA
**Estado:** RESUELTO (fix en reporte) / PENDIENTE (auditoria global)
**Version afectada:** Historico (desde F2) -> v4.6.0
**Tiempo de diagnostico:** ~20 min
**Tiempo de resolucion:** ~5 min

---

## Resumen

El reporte visual de rendimiento (v4.6.0) mostraba todos los pilotos con el
nick del OWNER (PJPIROVANI) en lugar de sus nicks reales. Los tokens, dias
y semaforos estaban correctos; solo el nick estaba mal.

## Sintomas

Reporte generado para Squadron Event 2026-W40:

#   Piloto      Tokens  Dias  Estado
1   PJPIROVANI  200     4     VERDE
2   PJPIROVANI  200     4     VERDE
3   PJPIROVANI  200     4     VERDE
...
29  PJPIROVANI  0       0     NEGRO

29 pilotos distintos, todos con el mismo nick.

## Causa Raiz

El campo event_participations.nick guarda el nick del cargador de la
participacion, no el nick del piloto objetivo.

Historico: El endpoint legacy POST /api/performances guardaba el nick
del usuario que ejecutaba la carga (ADMIN/OWNER). Cuando un ADMIN cargaba la
performance de otro piloto, se persistia su propio nick en el registro
del piloto objetivo.

Al migrar de performances a event_participations (Fase F2), ese nick
desnormalizado se preservo tal cual.

Evidencia (query Supabase):
SELECT ep.nick AS nick_guardado, u.nick AS nick_real
FROM event_participations ep
LEFT JOIN users u ON u.id = ep.user_id
WHERE ep.event_id = '4ada9ec7-...' -- W40
LIMIT 5;

| nick_guardado | nick_real |
|---------------|-----------|
| PJPIROVANI    | PABLOFF   |
| PJPIROVANI    | MERWEBO   |
| PJPIROVANI    | RUBEN     |
| PJPIROVANI    | REMASTER  |
| PJPIROVANI    | DARKEDEN  |

Todos los nick_guardado son PJPIROVANI, pero los nick_real son correctos.

## Solucion Aplicada (v4.6.0 - Reporte)

En src/controllers/export.controller.js, invertir la prioridad del nick:

Antes:
nick: p.nick || user?.nick || 'Piloto',

Despues:
nick: user?.nick || p.nick || 'Piloto',

Ahora el reporte siempre resuelve el nick desde users (fuente de verdad),
y solo cae al nick desnormalizado si el usuario no existe.

## Pendiente - Auditoria Global (BL-025)

El bug de event_participations.nick puede afectar otros lugares:

- Vista de historial personal (/api/performances/history).
- Listado de participaciones por evento.
- Dashboards de rendimiento.
- Cualquier lugar que lea nick de event_participations.

Decision de arquitectura sugerida:
event_participations.nick debe considerarse deprecado para lectura.
Siempre resolver el nick via JOIN con users.nick.
Considerar eliminar la columna en una migracion futura (F5+).

Documentado como BL-025 en BACKLOG.md.

## Lecciones Aprendidas

1. No desnormalizar datos sin estrategia de sincronizacion. El nick
   desnormalizado en performances/event_participations nunca se actualizo.
2. Siempre resolver entidades desde su fuente de verdad (users.nick),
   no desde copias.
3. Auditar campos desnormalizados al migrar de tabla (F2 -> F5).
4. Los tests de reportes deben verificar que los nicks sean unicos
   (o al menos distintos entre si) - un test trivial hubiera detectado esto.

## Referencias

- Commit fe0294c - fix(export): priorizar nick real de users
- BL-025 - Auditoria de event_participations.nick
- src/controllers/export.controller.js lineas ~135
