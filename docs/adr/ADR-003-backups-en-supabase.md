# ADR-003: Backups en Supabase

- **Fecha:** 2026-09-17
- **Estado:** Accepted
- **Decisores:** PJPIROVANI (OWNER) + Comando C4ISR
- **Relacionado con:** HALL-036, HALL-037

## Estado

Accepted (vigente desde 2026-09-17).

## Contexto y problema

El panel del OWNER (`/api/owner`) incluye la capacidad de generar **respaldos manuales** de las tablas críticas (`users`, `performances`, `events`). Originalmente, la implementación generaba el backup y lo devolvía como descarga JSON, **sin persistirlo en ningún lado**.

Esto generaba varios problemas:

1. **Sin historial:** si el OWNER perdía el archivo descargado, no había forma de recuperar un backup antiguo.
2. **Sin verificación de integridad:** no había forma de saber si un backup fue alterado.
3. **Sin política de retención:** los backups se acumulaban en el disco local del navegador (o se perdían).
4. **Fuga de PII:** los backups contenían datos sensibles (email, hash de contraseña) sin sanitización.

Los hallazgos fueron registrados como **HALL-036** (backups no persistentes) y **HALL-037** (falta de sanitización PII).

## Factores de decisión

- **Persistencia:** los backups deben sobrevivir a la sesión del navegador.
- **Integridad:** debe poder detectarse si un backup fue alterado.
- **Seguridad:** PII debe ser eliminada o enmascarada en los backups.
- **Retención:** debe haber un límite para evitar crecimiento indefinido.
- **Simplicidad:** la solución debe apoyarse en la infraestructura ya existente (Supabase), sin agregar servicios externos.

## Opciones consideradas

1. **Guardar backups en disco local del servidor**
   - **Pros:** simple.
   - **Contras:** no escala en Fly.io (contenedor efímero, múltiples réplicas).

2. **Guardar backups en Cloudinary (ya integrado)**
   - **Pros:** storage externo ya disponible.
   - **Contras:** Cloudinary está pensado para imágenes, no para JSON. Costo innecesario.

3. **Guardar backups en una tabla `backups` de Supabase** *(elegida)*
   - **Pros:** usa la infraestructura existente. Persistencia garantizada. RLS protege los datos. Índices para consultas rápidas.
   - **Contras:** agrega carga a la base de datos (mitigado por retención de 30 backups).

## Decisión

**Elegimos la Opción 3.** Se crea una tabla `backups` en Supabase con:

- **Columnas:**
  - `id` (UUID, PK)
  - `file_name` (TEXT)
  - `content` (JSONB) — el backup sanitizado
  - `hash` (TEXT) — SHA-256 del contenido, para verificación de integridad
  - `created_at` (TIMESTAMPTZ)
  - `created_by` (UUID, FK a `users.id`)

- **RLS:** habilitado con política `no_public_access` — solo `service_role` puede leer/escribir.
- **Índices:** en `created_at DESC` y `created_by`.
- **Retención:** máximo **30 backups**. Al crear uno nuevo, se **auto-prunea** el más antiguo.
- **Sanitización:** se eliminan por completo los campos `password_hash`, `reset_token`, `token_version` y otros sensibles antes de persistir el backup.
- **Endpoints:**
  - `POST /api/owner/backup/run` — genera + persiste.
  - `GET /api/owner/backup/list` — lista backups del OWNER.
  - `GET /api/owner/backup/download/:id` — descarga con verificación de hash.
  - `DELETE /api/owner/backup/:id` — eliminación manual.

## Consecuencias

### Positivas

- **Historial completo:** el OWNER puede acceder a cualquier backup de los últimos 30.
- **Verificación de integridad:** el hash SHA-256 detecta alteraciones.
- **Sin fuga de PII:** sanitización obligatoria antes de persistir.
- **Auto-gestión:** retención automática evita crecimiento indefinido.
- **Auditoría:** cada operación registra `BACKUP_CREATED`, `BACKUP_DOWNLOADED`, `BACKUP_DELETED` en `audit_logs`.

### Negativas

- Ocupa espacio en Supabase (mitigado por retención de 30).
- `download` debe verificar el hash en cada descarga (leve costo de CPU).

### Neutrales

- El hash se calcula con `crypto.createHash('sha256')`.

## Implementación

- `sql/027_backups_table.sql` — DDL de la tabla + RLS + índices.
- `src/controllers/owner.controller.js:8` — `const BACKUP_VERSION = '4.1.0';`
- `src/controllers/owner.controller.js:10` — campos sensibles eliminados del backup.
- `src/controllers/owner.controller.js:95, 104, 135, 219` — consultas a tabla `backups`.
- `src/controllers/owner.controller.js:241-340` — `runManualBackup` (crea + persiste + auto-prune).
- `src/controllers/owner.controller.js:349-410` — `downloadBackup` (verifica hash SHA-256).
- `src/controllers/owner.controller.js:410-455` — `deleteBackup`.
- `src/routes/owner.routes.js:25-28` — 4 endpoints de backup.
- Commit `e02d2a3` — HALL-036/037: backups persistentes + sanitización PII.

## Pendiente de verificar

Nada pendiente. Evidencia directa en código y migración SQL.

## Fuentes y trazabilidad

| Afirmación | Fuente |
|---|---|
| Auditoría HALL-036/037 menciona backups | `CHANGELOG.md:609` |
| Sanitización PII en backups | `CHANGELOG.md:622` |
| 4 endpoints definidos | `CHANGELOG.md:638-664` |
| Tabla `backups` en Supabase | `sql/027_backups_table.sql` |
| Retención de 30 backups | `CHANGELOG.md:649` |
| Hash SHA-256 para integridad | `CHANGELOG.md:651` |
| Commit `e02d2a3` | `CHANGELOG.md:701` |
| RLS `no_public_access` | `CHANGELOG.md:648` |

## Referencias

- `docs/adr/README.md`
- `DEPLOYMENT_STATE.md` — listado de tablas

---

> ADR redactado según formato **MADR 4.0** (https://adr.github.io/madr/).
> Recuperado con asistencia IA a partir de evidencia verificable el 2026-09-20.
> Sin información inventada.
