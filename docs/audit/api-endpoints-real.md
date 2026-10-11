# 📡 Inventario Real de Endpoints — 2026-10-11

> Generado automáticamente por `scripts/audit-api-endpoints.cjs`
> **Fuente de verdad** para alinear `docs/architecture/API_REFERENCE.md` (FIX-405).

## 📊 Resumen

| Métrica | Valor |
|---|---|
| Total de endpoints | **137** |
| Archivos escaneados | 17 |
| Archivos con endpoints | 17 |

## 📋 Índice por archivo

- [`src/routes/admin.routes.js`](#srcroutesadminroutesjs) — 28 endpoints
- [`src/routes/admin.users.routes.js`](#srcroutesadminusersroutesjs) — 2 endpoints
- [`src/routes/auth.routes.js`](#srcroutesauthroutesjs) — 12 endpoints
- [`src/routes/dashboard.routes.js`](#srcroutesdashboardroutesjs) — 2 endpoints
- [`src/routes/events-v2-bm.routes.js`](#srcroutesevents-v2-bmroutesjs) — 12 endpoints
- [`src/routes/events-v2.routes.js`](#srcroutesevents-v2routesjs) — 15 endpoints
- [`src/routes/events.routes.js`](#srcrouteseventsroutesjs) — 6 endpoints
- [`src/routes/health.routes.js`](#srcrouteshealthroutesjs) — 2 endpoints
- [`src/routes/normativas.routes.js`](#srcroutesnormativasroutesjs) — 3 endpoints
- [`src/routes/owner.routes.js`](#srcroutesownerroutesjs) — 7 endpoints
- [`src/routes/performances.routes.js`](#srcroutesperformancesroutesjs) — 7 endpoints
- [`src/routes/plane-models.routes.js`](#srcroutesplane-modelsroutesjs) — 7 endpoints
- [`src/routes/planes.routes.js`](#srcroutesplanesroutesjs) — 16 endpoints
- [`src/routes/presence.routes.js`](#srcroutespresenceroutesjs) — 3 endpoints
- [`src/routes/profile.routes.js`](#srcroutesprofileroutesjs) — 5 endpoints
- [`src/routes/settings.routes.js`](#srcroutessettingsroutesjs) — 4 endpoints
- [`src/routes/veteran.routes.js`](#srcroutesveteranroutesjs) — 6 endpoints

---

## `src/routes/admin.routes.js`

**Total:** 28 endpoints

| Método | Path |
|---|---|
| `GET` | `/all-performances` |
| `POST` | `/bulk-upload` |
| `GET` | `/events` |
| `POST` | `/events/activate-bm` |
| `GET` | `/export-performances` |
| `GET` | `/members` |
| `POST` | `/members` |
| `PATCH` | `/members/:id/role` |
| `PUT` | `/members/:id/role` |
| `PATCH` | `/members/:id/status` |
| `PUT` | `/members/:id/status` |
| `GET` | `/members/active` |
| `GET` | `/mentorships` |
| `POST` | `/mentorships` |
| `PATCH` | `/mentorships/:id` |
| `POST` | `/performances` |
| `GET` | `/results/:eventId/export` |
| `POST` | `/scheduler/run` |
| `GET` | `/scheduler/status` |
| `GET` | `/users` |
| `POST` | `/users` |
| `PATCH` | `/users/:id/inactive-reason` |
| `PATCH` | `/users/:id/role` |
| `PUT` | `/users/:id/role` |
| `PATCH` | `/users/:id/status` |
| `PUT` | `/users/:id/status` |
| `POST` | `/users/:userId/reset-password` |
| `GET` | `/users/inactive` |

## `src/routes/admin.users.routes.js`

**Total:** 2 endpoints

| Método | Path |
|---|---|
| `POST` | `/users/reset-password` |
| `GET` | `/users/status` |

## `src/routes/auth.routes.js`

**Total:** 12 endpoints

| Método | Path |
|---|---|
| `POST` | `/change-password` |
| `PUT` | `/change-password` |
| `POST` | `/forgot-password` |
| `GET` | `/google` |
| `GET` | `/google/callback` |
| `GET` | `/google/status` |
| `POST` | `/link-account` |
| `POST` | `/login` |
| `GET` | `/me` |
| `POST` | `/register` |
| `POST` | `/reset-password` |
| `GET` | `/verify` |

## `src/routes/dashboard.routes.js`

**Total:** 2 endpoints

| Método | Path |
|---|---|
| `GET` | `/active-members` |
| `GET` | `/summary` |

## `src/routes/events-v2-bm.routes.js`

**Total:** 12 endpoints

| Método | Path |
|---|---|
| `GET` | `/` |
| `POST` | `/` |
| `GET` | `/:eventId` |
| `PUT` | `/:eventId` |
| `GET` | `/:eventId/discount` |
| `GET` | `/:eventId/leaderboard` |
| `GET` | `/:eventId/progress` |
| `PUT` | `/:eventId/progress` |
| `POST` | `/:eventId/purchase` |
| `GET` | `/:eventId/stats` |
| `GET` | `/:eventId/submission-window` |
| `GET` | `/active` |

## `src/routes/events-v2.routes.js`

**Total:** 15 endpoints

| Método | Path |
|---|---|
| `GET` | `/` |
| `POST` | `/` |
| `DELETE` | `/:id` |
| `GET` | `/:id` |
| `PUT` | `/:id` |
| `GET` | `/:id/participations` |
| `POST` | `/:id/participations` |
| `DELETE` | `/:id/participations/:uid` |
| `PUT` | `/:id/participations/:uid` |
| `PATCH` | `/:id/status` |
| `GET` | `/:id/submission-window` |
| `GET` | `/active` |
| `GET` | `/admin/participations` |
| `GET` | `/mine` |
| `GET` | `/open` |

## `src/routes/events.routes.js`

**Total:** 6 endpoints

| Método | Path |
|---|---|
| `GET` | `/` |
| `GET` | `/active` |
| `GET` | `/active-members` |
| `GET` | `/current` |
| `GET` | `/history` |
| `GET` | `/open` |

## `src/routes/health.routes.js`

**Total:** 2 endpoints

| Método | Path |
|---|---|
| `GET` | `/api/health` |
| `GET` | `/health` |

## `src/routes/normativas.routes.js`

**Total:** 3 endpoints

| Método | Path |
|---|---|
| `GET` | `/` |
| `POST` | `/` |
| `GET` | `/:id/download` |

## `src/routes/owner.routes.js`

**Total:** 7 endpoints

| Método | Path |
|---|---|
| `GET` | `/audit-logs` |
| `GET` | `/audit-summary` |
| `DELETE` | `/backup/:id` |
| `GET` | `/backup/download/:id` |
| `GET` | `/backup/list` |
| `POST` | `/backup/run` |
| `GET` | `/error-logs` |

## `src/routes/performances.routes.js`

**Total:** 7 endpoints

| Método | Path |
|---|---|
| `POST` | `/` |
| `GET` | `/all` |
| `GET` | `/export` |
| `GET` | `/history` |
| `GET` | `/my-history` |
| `GET` | `/pilots` |
| `GET` | `/stats` |

## `src/routes/plane-models.routes.js`

**Total:** 7 endpoints

| Método | Path |
|---|---|
| `GET` | `/` |
| `POST` | `/` |
| `DELETE` | `/:id` |
| `GET` | `/:id` |
| `PUT` | `/:id` |
| `PATCH` | `/:id/restore` |
| `POST` | `/:id/restore` |

## `src/routes/planes.routes.js`

**Total:** 16 endpoints

| Método | Path |
|---|---|
| `GET` | `/` |
| `POST` | `/` |
| `DELETE` | `/:id` |
| `PUT` | `/:id` |
| `GET` | `/:id/details` |
| `GET` | `/:id/recommendation` |
| `GET` | `/:id/recommended-build` |
| `GET` | `/:id/stats` |
| `PUT` | `/:id/system` |
| `PUT` | `/:id/systems` |
| `GET` | `/catalog/plane-models` |
| `GET` | `/catalog/plane-mods` |
| `GET` | `/export` |
| `GET` | `/my-planes` |
| `GET` | `/plane-models` |
| `GET` | `/plane-mods` |

## `src/routes/presence.routes.js`

**Total:** 3 endpoints

| Método | Path |
|---|---|
| `GET` | `/active` |
| `POST` | `/offline` |
| `POST` | `/online` |

## `src/routes/profile.routes.js`

**Total:** 5 endpoints

| Método | Path |
|---|---|
| `GET` | `/` |
| `PUT` | `/` |
| `POST` | `/change-password` |
| `GET` | `/me` |
| `PUT` | `/me` |

## `src/routes/settings.routes.js`

**Total:** 4 endpoints

| Método | Path |
|---|---|
| `GET` | `/` |
| `PUT` | `/` |
| `GET` | `/me` |
| `PUT` | `/me` |

## `src/routes/veteran.routes.js`

**Total:** 6 endpoints

| Método | Path |
|---|---|
| `GET` | `/mentorship/:id` |
| `POST` | `/mentorship/:id/evaluate` |
| `POST` | `/mentorship/:id/log` |
| `GET` | `/my-mentorships` |
| `GET` | `/my-pupilos` |
| `GET` | `/my-stats` |

---

## 🔤 Lista plana (para grep)

```
GET    /
GET    /
GET    /
GET    /
GET    /
GET    /
GET    /
GET    /
POST   /
POST   /
POST   /
POST   /
POST   /
POST   /
PUT    /
PUT    /
GET    /:eventId
PUT    /:eventId
GET    /:eventId/discount
GET    /:eventId/leaderboard
GET    /:eventId/progress
PUT    /:eventId/progress
POST   /:eventId/purchase
GET    /:eventId/stats
GET    /:eventId/submission-window
DELETE /:id
DELETE /:id
DELETE /:id
GET    /:id
GET    /:id
PUT    /:id
PUT    /:id
PUT    /:id
GET    /:id/details
GET    /:id/download
GET    /:id/participations
POST   /:id/participations
DELETE /:id/participations/:uid
PUT    /:id/participations/:uid
GET    /:id/recommendation
GET    /:id/recommended-build
PATCH  /:id/restore
POST   /:id/restore
GET    /:id/stats
PATCH  /:id/status
GET    /:id/submission-window
PUT    /:id/system
PUT    /:id/systems
GET    /active
GET    /active
GET    /active
GET    /active
GET    /active-members
GET    /active-members
GET    /admin/participations
GET    /all
GET    /all-performances
GET    /api/health
GET    /audit-logs
GET    /audit-summary
DELETE /backup/:id
GET    /backup/download/:id
GET    /backup/list
POST   /backup/run
POST   /bulk-upload
GET    /catalog/plane-models
GET    /catalog/plane-mods
POST   /change-password
POST   /change-password
PUT    /change-password
GET    /current
GET    /error-logs
GET    /events
POST   /events/activate-bm
GET    /export
GET    /export
GET    /export-performances
POST   /forgot-password
GET    /google
GET    /google/callback
GET    /google/status
GET    /health
GET    /history
GET    /history
POST   /link-account
POST   /login
GET    /me
GET    /me
GET    /me
PUT    /me
PUT    /me
GET    /members
POST   /members
PATCH  /members/:id/role
PUT    /members/:id/role
PATCH  /members/:id/status
PUT    /members/:id/status
GET    /members/active
GET    /mentorship/:id
POST   /mentorship/:id/evaluate
POST   /mentorship/:id/log
GET    /mentorships
POST   /mentorships
PATCH  /mentorships/:id
GET    /mine
GET    /my-history
GET    /my-mentorships
GET    /my-planes
GET    /my-pupilos
GET    /my-stats
POST   /offline
POST   /online
GET    /open
GET    /open
POST   /performances
GET    /pilots
GET    /plane-models
GET    /plane-mods
POST   /register
POST   /reset-password
GET    /results/:eventId/export
POST   /scheduler/run
GET    /scheduler/status
GET    /stats
GET    /summary
GET    /users
POST   /users
PATCH  /users/:id/inactive-reason
PATCH  /users/:id/role
PUT    /users/:id/role
PATCH  /users/:id/status
PUT    /users/:id/status
POST   /users/:userId/reset-password
GET    /users/inactive
POST   /users/reset-password
GET    /users/status
GET    /verify
```

