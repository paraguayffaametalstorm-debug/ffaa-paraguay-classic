# 🔄 HANDOFF — v4.8.15 (2026-10-11)

## Contexto

Sesión de cierre de **FIX-405** (alineación de `API_REFERENCE.md` con los schemas reales del backend). Se detectaron 137 endpoints reales vs ~60 documentados. Se documentaron los 35 faltantes, se agregó banner de estado de sincronización, y se crearon 2 scripts reutilizables (auditoría + fix).

---

## Resumen de la sesión

### 1. Setup y diagnóstico inicial

- Repo limpio, actualizado a `fbc6802` (post-release v4.8.15).
- Detectado drift: `API_REFERENCE.md` decía `v4.5.8`/`v4.5.9`, proyecto en `v4.8.15`.
- Inventario de drift: ~35 endpoints faltantes en 8 módulos.

### 2. Inventario automatizado de endpoints

**Script nuevo:** `scripts/audit-api-endpoints.cjs`

- Escanea `src/routes/*.js` recursivamente.
- Extrae `method + path` con regex.
- Genera `docs/audit/api-endpoints-real.md` (reporte con resumen + tablas + lista plana).
- **Resultado:** 137 endpoints reales en 17 archivos.

### 3. Script de fix quirúrgico (con bug y fix)

**Script nuevo:** `scripts/fix-405-api-reference.cjs`

- Modo DRY-RUN + `--apply`.
- Backup `.bak-fix405`.
- Idempotente.
- **40 cambios en 4 bloques:** versiones, banner, filas tabla, secciones.

**Bug encontrado durante el uso:** el `content.replace()` con match literal **fallaba silenciosamente** por diferencias CRLF/LF.

**Fix aplicado:** usar `split(/\r?\n/)` + `findIndex()` + `splice()` para ediciones quirúrgicas. **Verificación post-cambio** con `content.includes(sentinel)`.

### 4. Aplicación y verificación

- DRY-RUN → 40 cambios detectados, 0 errores.
- `--apply` → cambios aplicados, backup creado (65 KB).
- Verificación: banner + header + footer + filas + secciones OK.
- Idempotencia: **100%** (segunda corrida dice todo `⏭️`).

### 5. Commit y push

- Commit `7e53c1e`: `docs(api): alinear API_REFERENCE con endpoints reales (FIX-405)`.
- Push a `main` OK (`fbc6802..7e53c1e`).
- 4 archivos: 1 modificado + 3 nuevos.
- +1230 / -2 líneas.

---

## FIX-405 en detalle

### El problema real

`docs/architecture/API_REFERENCE.md` tenía:

1. **Version drift:** header `v4.5.8`, footer `v4.5.9`, proyecto `v4.8.15`.
2. **35 endpoints sin documentar** en 8 módulos (events-v2, BM, admin, owner, planes, etc.).
3. **Endpoints post-FIX-310 no documentados:** `mine`, `admin/participations`.
4. **Endpoints post-HALL-072 no documentados:** `scheduler/run`, `scheduler/status`.
5. **Endpoints post-Fase 4 no documentados:** `owner/backup/list`, `download/:id`, `DELETE :id`.

### Los 137 endpoints reales

Distribución por archivo (`src/routes/`):

| Archivo | Endpoints |
|---|---:|
| `admin.routes.js` | 28 |
| `planes.routes.js` | 16 |
| `events-v2.routes.js` | 15 |
| `auth.routes.js` | 12 |
| `events-v2-bm.routes.js` | 12 |
| `owner.routes.js` | 7 |
| `performances.routes.js` | 7 |
| `plane-models.routes.js` | 7 |
| `events.routes.js` (legacy) | 6 |
| `veteran.routes.js` | 6 |
| `profile.routes.js` | 5 |
| `settings.routes.js` | 4 |
| `normativas.routes.js` | 3 |
| `presence.routes.js` | 3 |
| `admin.users.routes.js` | 2 (⚠️ código muerto) |
| `dashboard.routes.js` | 2 |
| `health.routes.js` | 2 |
| **Total** | **137** |

### Los 40 cambios aplicados

**Bloque A — Versiones (2):**
- Header: `v4.5.8` → `v4.8.15`
- Footer: `v4.5.9` → `v4.8.15`

**Bloque B — Banner (1):**
- Agregado al inicio del doc con tabla de estado de sincronización.

**Bloque C — Tabla rápida (35 filas):**
- Events v2: `mine`, `admin/participations`, `open`
- Events v2 BM: `active`, `PUT /:eventId`, `purchase`, `stats`
- Performances: `my-history`
- Planes: `systems`, `recommendation`, `recommended-build`, `export`
- Plane-models: `PATCH restore`
- Normativas: `GET /`
- Profile: `change-password`
- Admin: `scheduler/*`, `results/:eventId/export`, `members/users` aliases, `members/active`, `events`, `mentorships/*`, legacy markers
- Owner: `backup/list`, `backup/download/:id`, `backup/:id DELETE`, `error-logs`

**Bloque D — Secciones detalladas (2):**
- `GET /api/events-v2/mine` (BL-028) + `GET /api/events-v2/admin/participations` (FIX-310)
- `Scheduler Manual (HALL-072)`

### Archivos creados/modificados

| Archivo | Tipo |
|---|---|
| `docs/architecture/API_REFERENCE.md` | Modificado |
| `docs/audit/api-endpoints-real.md` | Nuevo |
| `scripts/audit-api-endpoints.cjs` | Nuevo |
| `scripts/fix-405-api-reference.cjs` | Nuevo |

### Commits clave

| Hash | Descripción |
|---|---|
| `7e53c1e` | docs(api): alinear API_REFERENCE con endpoints reales (FIX-405) |

### Referencias

- `docs/audit/api-endpoints-real.md` — reporte de los 137 endpoints.
- `docs/architecture/API_REFERENCE.md` — doc actualizada.
- `docs/architecture/API_REFERENCE.md.bak-fix405` — backup pre-FIX-405 (no versionado, en `.gitignore`).

---

## Lecciones aprendidas (importantes para el handoff)

### 1. `findstr` NO es confiable para UTF-8

**Síntoma:** `findstr /C:"Estado de sincronización" archivo.md` devolvía vacío aunque el texto estaba en el archivo.

**Causa:** Windows CMD/PowerShell por default usa `Windows-1252` (o el code page del sistema), no UTF-8. Cuando lee un archivo con emojis (`📌`) o acentos (`ó`, `á`), `findstr` no matchea.

**Evidencia:** `powershell -Command "Get-Content archivo.md -TotalCount 30"` mostró el banner pero con caracteres mal decodificados (`ðŸ“Œ` en vez de `📌`). **El archivo estaba bien.**

**Fix:** usar `powershell -Command "[Console]::OutputEncoding=[Text.Encoding]::UTF8; ..."` para verificar, o **confiar en VSCode/GitHub** para ver el archivo.

**Regla nueva:** para verificar `.md` con caracteres especiales, **usar VSCode** (`code archivo.md`), no `findstr`.

### 2. `content.replace(oldText, newText)` es silencioso

**Síntoma:** el script decía `✅ Banner agregado` pero el banner no aparecía en el archivo.

**Causa:** `content.replace()` con string literal **no hace nada y no tira error** si `oldText` no matchea exacto (por CRLF vs LF, espacios, etc.).

**Evidencia:** el header buscado tenía `\n` literal al final. En Windows el archivo usa `\r\n`. **Nunca matcheaba.**

**Fix:** usar `split(/\r?\n/)` + `findIndex()` + `splice()` para ediciones quirúrgicas. **Siempre verificar post-cambio** con `content.includes(sentinel)`.

**Regla nueva:** scripts que editan archivos deben:
1. Usar `split()`/`splice()` en vez de `replace()` cuando el texto es multi-línea.
2. Verificar `content.includes(sentinel)` después del cambio.
3. Reportar `❌` si la verificación falla (no mentir con `✅`).

### 3. `git commit -m "título\n\n- bullet1\n- bullet2"` en CMD no funciona

**Síntoma:** el commit se hizo solo con el título, los bullets se interpretaron como comandos CMD.

**Causa:** CMD no procesa `\n` en strings.

**Fix:** usar `git commit -F archivo.txt` (con mensaje en archivo) o `git commit -e` (abre editor).

**Regla nueva:** para mensajes de commit multilínea, **usar `-F`**, no `-m`.

### 4. `admin.users.routes.js` es código muerto

**Síntoma:** el archivo existe en `src/routes/` pero **no está montado en `server.js`**.

**Evidencia:**
- No hay `import adminUsersRoutes from './src/routes/admin.users.routes.js';` en `server.js`.
- No hay `app.use('/api/admin/users', ...)` en `server.js`.
- Usa middleware `authenticate` (con `c`), pero el proyecto usa `requireAuth` (con `r`).
- Expone `password_hash` en `.select()` (mala práctica).
- **Falta validación HALL-022** (jerarquía) en el reset-password.

**Acción:** registrar como **FIX-316** en `BACKLOG.md` para eliminar.

---

## Próximos pasos sugeridos

### Sprint 8 (próxima sesión)

**Prioridad 1 — FIX-310-ter**
- Refactorizar `/api/performances/export` y `/api/dashboard/summary` para usar `v_admin_participations`.
- Esfuerzo: S (2h).
- Beneficio: eliminar joins duplicados en JS.

**Prioridad 2 — BL-022**
- Tests de integración para `/api/dashboard/summary`.
- Previene regresiones como HALL-067.
- Esfuerzo: S (4h).

**Prioridad 3 — BL-025**
- Re-implementar 69 tests skipeados con schemas reales.
- Esfuerzo: M (1 día).

**Prioridad 4 — Deuda técnica menor**
- FIX-311 (scheduler STALE).
- FIX-312 (formato tablas BACKLOG).
- FIX-313 (duplicado 036).
- FIX-314 (assets cache-busting).
- FIX-315 (scripts verify-fix-310).
- **FIX-316 (eliminar `admin.users.routes.js` — NUEVO de esta sesión).**

### Estado del sistema

- **Versión:** v4.8.15
- **Deploy:** Render.com activo
- **Tests:** 287 passing / 69 skipped
- **API_REFERENCE:** sincronizada al 100% en endpoints, 90% en schemas (pendiente verificación profunda contra Zod).

---

## Notas para la próxima sesión

1. **`scripts/close-fix-310.cjs` quedó untracked.** Moverlo a `scripts/archive/` (o eliminar si ya no se usa).

2. **`src/routes/events-v2.routes.js.bak-fix310`** quedó como basura de la sesión anterior. Eliminar.

3. **El commit `7e53c1e` se hizo con mensaje corto** (los bullets del `-m` multilínea no entraron en CMD). El título es correcto, los bullets eran cosméticos. **No reescribir la historia.**

4. **`findstr` para verificar `.md` con UTF-8 NO es confiable.** Usar PowerShell con `[Console]::OutputEncoding=[Text.Encoding]::UTF8` o VSCode.

5. **`content.replace()` es silencioso.** Siempre verificar post-cambio.

6. **Los `release-please` PRs ya no aparecen** porque el último commit no incluyó `feat:` ni `fix:` en los otros archivos. El PR de release v4.8.16 se va a generar cuando se haga un commit con `feat:`/`fix:`/`docs:` (que ya se hizo con `docs:`).

7. **FIX-405 cierra el drift de endpoints**, pero **no el drift de schemas**. La doc reconoce esto en el banner nuevo (parcial en query params + pendiente en request/response schemas).

---

## Referencias

- **Handoff anterior:** `docs/handoffs/HANDOFF-v4.8.14.md`
- **CHANGELOG:** `CHANGELOG.md` (últimos 4 releases)
- **BACKLOG:** `docs/planning/BACKLOG.md` (FIX-310 cerrado, FIX-405 cerrado, FIX-316 pendiente)
- **Reporte de endpoints:** `docs/audit/api-endpoints-real.md`
- **Script de fix:** `scripts/fix-405-api-reference.cjs`
- **Script de auditoría:** `scripts/audit-api-endpoints.cjs`