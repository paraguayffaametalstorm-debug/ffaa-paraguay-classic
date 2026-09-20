# ADR-005: Migración de presence a Supabase

- **Fecha:** 2026-09-17
- **Estado:** Proposed
- **Decisores:** PJPIROVANI (OWNER) + Comando C4ISR
- **Relacionado con:** FIX-209 (Sprint 2)

## Estado

**Proposed** — decisión propuesta, pendiente de implementación.
Requiere diseño de esquema de tabla + refactor del router.

## Contexto y problema

El sistema expone 3 endpoints bajo `/api/presence/*` para monitorear pilotos en línea:

- `POST /api/presence/online` — marca al usuario como conectado.
- `POST /api/presence/offline` — marca al usuario como desconectado.
- `GET /api/presence/active` — devuelve el conteo de usuarios conectados.

**La implementación actual usa un `Set` en memoria del proceso:**

```js
const onlineUsers = new Set();

router.post('/online', requireAuth, (req, res) => {
  if (req.user?.user_id) {
    onlineUsers.add(req.user.user_id);
  }
  res.json({ success: true, count: onlineUsers.size });
});
```

Este diseño **no escala** por tres razones:

1. **Multi-réplica:** Fly.io corre **2 máquinas** del servidor. Cada una tiene su propio `Set`. El conteo de `/active` es **incorrecto** (cada máquina ve solo a sus usuarios).
2. **Volatilidad:** un redeploy borra el `Set`. Todos los usuarios aparecen offline hasta que vuelvan a llamar `/online`.
3. **Sin trazabilidad:** no queda registro histórico de conexiones/desconexiones.

## Factores de decisión

- **Multi-réplica:** la solución debe compartir estado entre las 2 máquinas de Fly.io.
- **Persistencia:** el estado debe sobrevivir a un redeploy.
- **Simplicidad:** evitar introducir infraestructura adicional (Redis, etc.).
- **Performance:** las consultas de presence deben ser rápidas (< 50ms).
- **Auditoría:** idealmente registrar histórico de conexiones.

## Opciones consideradas

1. **Mantener el `Set` en memoria (status quo)**
   - **Pros:** cero cambios.
   - **Contras:** incorrecto en multi-réplica, volátil, sin histórico.

2. **Migrar a Redis (Upstash, etc.)**
   - **Pros:** solución estándar para presence en memoria distribuida.
   - **Contras:** introduce nueva dependencia. Costo extra. Overkill para el volumen del escuadrón (~30-50 pilotos).

3. **Migrar a una tabla `presence` en Supabase** *(elegida)*
   - **Pros:** usa la infraestructura existente. Persistencia garantizada. Sin dependencias nuevas.
   - **Contras:** introduce carga a la DB (mitiguable con TTL + cleanup periódico).

## Decisión

**Elegimos la Opción 3** — migrar el estado a una tabla `presence` en Supabase.

**Esquema propuesto (pendiente de diseño final):**

```sql
CREATE TABLE presence (
  user_id INTEGER PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
  last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'ONLINE' CHECK (status IN ('ONLINE', 'IDLE', 'OFFLINE'))
);
CREATE INDEX idx_presence_last_seen ON presence(last_seen DESC);
```

**Refactor propuesto:**

- `POST /api/presence/online` → UPSERT en `presence` con `last_seen = NOW()`, `status = 'ONLINE'`.
- `POST /api/presence/offline` → UPDATE a `status = 'OFFLINE'`.
- `GET /api/presence/active` → `SELECT COUNT(*) FROM presence WHERE status = 'ONLINE' AND last_seen > NOW() - INTERVAL '5 minutes'`.
- **Cleanup:** cron job que elimina registros con `last_seen < NOW() - INTERVAL '1 hour'` (o los marca OFFLINE).

**Pendiente para aceptación:**

- Definir TTL exacto (¿5 min? ¿10 min?).
- Definir si se necesita tabla de histórico separada (`presence_log`).
- Definir si el heartbeat debe ser automático (frontend) o manual (cada acción).
- Tests de integración.

## Consecuencias

### Positivas (una vez implementado)

- Estado **compartido entre las 2 réplicas** de Fly.io.
- **Persistencia** ante redeploys.
- Posibilidad de **histórico de conexiones** (si se agrega tabla separada).
- Uso de la infraestructura existente (Supabase).

### Negativas (una vez implementado)

- **Carga adicional** a Supabase (mitigable con TTL + cleanup).
- **Latencia** mayor que un `Set` en memoria (~20-50ms por operación).
- Requiere **mecanismo de cleanup** (cron o trigger).

### Neutrales (mientras está Proposed)

- El sistema actual **funciona** para una sola réplica.
- El bug es **silencioso** — no lanza errores, solo devuelve conteos incorrectos.

## Implementación

**Estado actual (código):**

- `src/routes/presence.routes.js:1-25` — router con `Set` en memoria.
- `server.js:129` — `app.use('/api/presence', presenceRoutes);`

**Pendiente (una vez aceptado):**

- `sql/0NN_presence_table.sql` — crear tabla (no existe aún).
- `src/controllers/presence.controller.js` — crear controlador (no existe aún).
- `src/routes/presence.routes.js` — refactor para usar Supabase.
- `server.js` — agregar cron de cleanup.
- Tests de integración.

## Pendiente de verificar

- ¿El frontend actual llama a `/online` y `/offline` en qué momentos (login/logout, focus/blur)?
- ¿Hay otros consumidores del endpoint `/active` (dashboards, etc.)?
- ¿Cuántas réplicas corre Fly.io en producción actualmente?

## Fuentes y trazabilidad

| Afirmación | Fuente |
|---|---|
| Endpoints `/api/presence/*` existen | `CHANGELOG.md:1325` |
| Implementación usa `Set` en memoria | `src/routes/presence.routes.js:5` |
| Router montado en `server.js` | `server.js:129` |
| No existe tabla `presence` en SQL | `dir sql\*presence*` → vacío |
| No existe controlador `presence.controller.js` | `findstr presence src/controllers` → vacío |
| Fly.io corre múltiples réplicas | `CHANGELOG.md:484` — "2 máquinas" |

## Referencias

- `docs/adr/README.md`
- `PLAN_TRABAJO.md` — FIX-209 (Sprint 2)

---

> ADR redactado según formato **MADR 4.0** (https://adr.github.io/madr/).
> Estado **Proposed** — pendiente de aceptación e implementación.
> Documento vivo — actualizar al implementar.
