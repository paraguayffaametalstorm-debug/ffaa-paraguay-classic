# ADR-002: Política público/privado en endpoints

- **Fecha:** 2026-09-17
- **Estado:** Accepted
- **Decisores:** PJPIROVANI (OWNER) + Comando C4ISR
- **Relacionado con:** HALL-036

## Estado

Accepted (vigente desde 2026-09-17).

## Contexto y problema

Durante la auditoría de seguridad de Fase 2 se identificó la necesidad de **formalizar la política de qué endpoints son públicos y cuáles requieren autenticación**. Sin una política clara:

1. Algunos endpoints quedaban expuestos **por olvido**.
2. Otros endpoints "públicos" por diseño filtraban datos que no debían.
3. No había una regla uniforme para decidir si un nuevo endpoint debía requerir auth.

El hallazgo fue registrado como **HALL-036** (parte de la auditoría HALL-036/037).

## Factores de decisión

- **Seguridad:** ningún endpoint que exponga datos de pilotos o escuadrón debe ser público.
- **Consistencia:** todos los endpoints privados deben usar el mismo middleware.
- **Simplicidad:** el desarrollador debe poder saber en 1 segundo si un endpoint es privado o público, mirando el código.
- **Flexibilidad:** los endpoints de escritura sensible requieren además **control por rol**.

## Opciones consideradas

1. **Sin política formal, decidir caso por caso**
   - **Pros:** flexibilidad máxima.
   - **Contras:** inconsistencias inevitables. Es lo que ya estaba pasando.

2. **Todo público por defecto, proteger solo lo crítico**
   - **Pros:** menos código de middleware.
   - **Contras:** alto riesgo de exponer datos por olvido.

3. **Todo privado por defecto, whitelist explícita de públicos** *(elegida)*
   - **Pros:** "deny by default" — principio de menor privilegio. Errores se manifiestan como 401, no como filtración.
   - **Contras:** requiere declarar explícitamente cada endpoint público.

## Decisión

**Elegimos la Opción 3.** La política es:

### Endpoints públicos (sin auth)

- `GET /health` (probe Fly.io)
- `GET /api/health` (telemetría JSON)
- `POST /api/auth/login`
- `POST /api/auth/register`
- `POST /api/auth/reset-password`
- `POST /api/auth/change-password` (con token temporal del flujo)
- `GET /api/auth/google/*` (OAuth)
- `GET /link-account` (HTML)
- `GET /reset-password` (HTML)
- Assets estáticos (`/`, `/css/*`, `/js/*`, `/components/*`)

### Endpoints privados (requieren `requireAuth`)

- Todos los demás bajo `/api/*` y `/auth/*`.

### Endpoints con control de rol (`requireRole`)

- `/api/admin/*` → `ADMIN` o `OWNER`
- `/api/owner/*` → `OWNER`
- `/api/events-v2/*`, `/api/events-v2/bm/*` → `ADMIN` o `OWNER` para escritura
- `/api/plane-models/*` → `ADMIN` o `OWNER` para escritura
- `/api/normativas/*` (POST/PUT/DELETE) → `ADMIN` o `OWNER`
- `/api/performances/pilots`, `/api/performances/all`, `/api/performances/export` → `ADMIN` o `OWNER`

### Middleware

- **`requireAuth`** — verifica JWT, valida `token_version`, bloquea cuentas INACTIVE, adjunta `req.user`.
- **`requireRole(...roles)`** — verifica que `req.user.role` esté en la lista permitida.
- **`authenticate`** — alias de `requireAuth` (legacy, mantenido por compatibilidad).

## Consecuencias

### Positivas

- **Deny by default:** endpoints nuevos son privados salvo declaración explícita.
- **Consistencia:** todos los archivos de rutas importan `requireAuth` del mismo módulo.
- **Auditoría simplificada:** es trivial verificar que un endpoint tenga middleware.
- **Rol adicional en escritura:** los endpoints sensibles requieren además `requireRole`.

### Negativas

- Declarar cada endpoint público requiere atención (no hay "default público").

### Neutrales

- El alias `authenticate` se mantiene para no romper rutas existentes.

## Implementación

### Archivos de rutas y sus middlewares

| Archivo | Middleware importado |
|---|---|
| `src/routes/admin.routes.js:15` | `requireAuth, requireRole` |
| `src/routes/admin.users.routes.js:4` | `authenticate, requireRole` |
| `src/routes/auth.routes.js:14` | `requireAuth, requireRole` |
| `src/routes/dashboard.routes.js:2` | `requireAuth` |
| `src/routes/events-v2.routes.js:30` | `requireAuth, requireRole` |
| `src/routes/events-v2-bm.routes.js:56` | `requireAuth, requireRole` |
| `src/routes/events.routes.js:7` | `requireAuth` |
| `src/routes/normativas.routes.js:3` | `requireAuth, requireRole` |
| `src/routes/owner.routes.js:11` | `requireAuth, requireRole` |
| `src/routes/performances.routes.js:10` | `requireAuth, requireRole` |
| `src/routes/plane-models.routes.js:18` | `requireAuth, requireRole` |
| `src/routes/planes.routes.js:16` | `requireAuth` |
| `src/routes/presence.routes.js:2` | `requireAuth` |
| `src/routes/profile.routes.js:4` | `requireAuth` |
| `src/routes/settings.routes.js:3` | `requireAuth` |

### Middleware `requireAuth` (src/middlewares/auth.js)

- Líneas 9-157: valida JWT, `token_version`, estado de cuenta.
- Línea 169: `export const authenticate = requireAuth;` (alias).
- Líneas 175-200: `requireRole`.

## Pendiente de verificar

Nada pendiente. Evidencia directa en código.

## Fuentes y trazabilidad

| Afirmación | Fuente |
|---|---|
| Auditoría HALL-036 define política | `CHANGELOG.md:609` |
| Lista de endpoints privados | `CHANGELOG.md:634` |
| Middlewares por archivo de rutas | `findstr` sobre `src/routes/*.js` |
| `authenticate` es alias de `requireAuth` | `src/middlewares/auth.js:169` |
| `requireRole` implementado | `src/middlewares/auth.js:175-200` |

## Referencias

- `docs/adr/README.md`
- `API_REFERENCE.md` — sección de permisos por endpoint

---

> ADR redactado según formato **MADR 4.0** (https://adr.github.io/madr/).
> Recuperado con asistencia IA a partir de evidencia verificable el 2026-09-20.
> Sin información inventada.
