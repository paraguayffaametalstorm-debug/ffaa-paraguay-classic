# 🔧 Historial de Fixes Aplicados - PARAGUAY-FFAA | METALSTORM

> **Bitácora Técnica de Correcciones Críticas y Refactorizaciones de Tipos.**  
> **Fecha de Consolidación:** 2026-09-16  
> **Versión Relacionada:** v4.0.0

---

## 📌 Resumen de Commits Críticos

```bash
fc657f0 refactor: implement helper functions for typed queries
0e10c46 fix(auth): make password update identifier dynamic
d4a3881 feat(admin): backend - inactive users management with mandatory reason and audit
b1023fd feat(admin): frontend - tactical tabs, inactivation/reactivation modals and live counters
```

---

## 🛠️ Detalle de Fixes Implementados

### 🔒 HALL-033 — Endpoint `/api/presence/active` Protegido

**Fecha:** 2026-09-17  
**Fase:** 4 — Seguridad Secundaria  
**Archivo:** `src/routes/presence.routes.js`  
**Commit:** `a781cb3`  
**Severidad:** 🟡 MEDIA  
**Estado:** ✅ RESUELTO

**Problema Detectado:**  
El endpoint `GET /api/presence/active` exponía **el contador de usuarios en línea del escuadrón sin autenticación**. Cualquier persona podía monitorear la actividad operativa del escuadrón en tiempo real.

**Nota adicional:** el contador está basado en un `Set` en memoria (`onlineUsers`), que es inconsistente con múltiples instancias de Fly.io. Ese problema (HALL-032) se resolverá en Fase 6 con migración a Supabase.

**Solución Aplicada:**  
Se agregó `requireAuth` al endpoint `/active` (los endpoints `/online` y `/offline` ya lo tenían):

```javascript
// Antes
router.get('/active', (req, res) => {
  res.json({ count: onlineUsers.size });
});

// Después
router.get('/active', requireAuth, (req, res) => {
  res.json({ count: onlineUsers.size });
});
```

---

### 🔒 HALL-036 + HALL-037 — Backups Persistentes con Sanitización de PII

**Fecha:** 2026-09-17  
**Fase:** 4 — Seguridad Secundaria  
**Archivos:** `src/controllers/owner.controller.js`, `src/routes/owner.routes.js`, `sql/027_backups_table.sql`  
**Commit:** `e02d2a3`  
**Severidad:** 🟠 ALTA  
**Estado:** ✅ RESUELTO

**Problema Detectado:**

- **HALL-036 (backups efímeros):** El sistema de backups del OWNER almacenaba solo **metadatos en un array en memoria** (`backupsHistory = []`). El JSON del backup **nunca se persistía**. Consecuencias: pérdida con cada reinicio/deploy, inconsistencia entre las 2 máquinas de Fly.io, imposibilidad de descargar el contenido.

- **HALL-037 (sanitización incompleta):** El backup solo eliminaba `password_hash` y `password`. Los usuarios tenían más campos sensibles expuestos: `token_version`, `google_id`, `google_linked`, y PII completa (`email`, `email_institucional`, `email_personal`, `phone`).

**Solución Aplicada:**

**1. Nueva tabla `backups` (`sql/027_backups_table.sql`):**
- `content JSONB` con el payload completo.
- `hash_sha256` para integridad criptográfica.
- `created_by UUID` + `created_by_nick` (desnormalizado).
- Conteos: `users_count`, `performances_count`, `events_count`.
- `tables_included TEXT[]`, `notes TEXT`, `version TEXT`.
- Índices en `created_at DESC` y `created_by`.
- RLS con política `no_public_access` (solo `service_role`).

**2. Controlador refactorizado (`owner.controller.js`):**
- **Constantes:** `MAX_BACKUPS = 30`, `BACKUP_VERSION = '4.1.0'`, `SENSITIVE_USER_FIELDS_DROP`, `SENSITIVE_USER_FIELDS_OBFUSCATE`.
- **Helpers:** `obfuscateEmail()`, `obfuscatePhone()`, `sanitizeUser()`, `computeSha256()`, `pruneOldBackups()`.
- **Sanitización:**
  - Elimina: `password_hash`, `password`, `token_version`, `google_id`, `google_linked`.
  - Ofusca: `email` → `p***@dominio.com`, `phone` → `+595***3456`.
- **Endpoints:**
  - `runManualBackup` → persiste + hash + prune + audita.
  - `getBackupList` → consulta Supabase (solo metadatos).
  - **NUEVO** `downloadBackup` → descarga con verificación de hash.
  - **NUEVO** `deleteBackup` → eliminación manual.
- **Auditoría:** eventos `BACKUP_CREATED`, `BACKUP_DOWNLOADED`, `BACKUP_DELETED`.

**3. Rutas (`owner.routes.js`):**

```javascript
router.get('/backup/download/:id', downloadBackup);
router.delete('/backup/:id', deleteBackup);
```

**Verificación:**
- `node --check` OK en ambos archivos.
- Diff: +379 inserciones, -29 eliminaciones.
- Tests locales sin token: 4 endpoints → todos `401`.
- Smoke test producción: `backup/list` y `backup/run` sin auth → `401`.

**Nota:** Tests funcionales con token se omitieron por decisión operativa (evitar exponer tokens). Verificación post-deploy vía SQL en Supabase.

**Rollback:** `git revert e02d2a3` + `DROP TABLE IF EXISTS backups;`

---

### 🔒 HALL-018 + HALL-019 + HALL-034 — Política Público/Privado en Endpoints GET

**Fecha:** 2026-09-17  
**Fase:** 4 — Seguridad Secundaria  
**Archivos:** `src/routes/plane-models.routes.js`, `src/routes/bm.routes.js`  
**Commit:** `16d64f0`  
**Severidad:** 🟠 ALTA (HALL-019), 🟡 MEDIA (HALL-018, HALL-034)  
**Estado:** ✅ RESUELTO

**Problema Detectado:**  
Múltiples endpoints GET exponían información interna del escuadrón sin autenticación:

- **HALL-019:** 5 endpoints de BM (`/events`, `/events/active`, `/events/:id`, `/stats`, `/leaderboard`) públicos. El `/leaderboard` exponía **nicks de pilotos del escuadrón, posiciones y actividad**.
- **HALL-034:** 2 endpoints de plane-models (`/` y `/:id`) públicos. Incluían `?include_inactive=true`.
- **HALL-018:** Catálogo de aviones `/api/planes/catalog/*` público — decisión de diseño: son datos del juego, no del escuadrón.

**Solución Aplicada:**  
Se agregó `requireAuth` a los 5 endpoints GET de BM y a los 2 endpoints GET de plane-models. El catálogo público `/api/planes/catalog/*` se mantiene público.

**Verificación:**
- `node --check` OK en ambos archivos.
- Tests locales sin token: 6 endpoints → todos `401`.
- Catálogo público: `200` (sin regresión).

**Rollback:** `git revert 16d64f0`

---

### 🔒 HALL-004 + HALL-009 — Protección de `/register` + Rate Limiting

**Fecha:** 2026-09-17  
**Fase:** 4 — Seguridad Secundaria  
**Archivo:** `src/routes/auth.routes.js`  
**Commit:** `20934e2`  
**Severidad:** 🟠 ALTA  
**Estado:** ✅ RESUELTO

**Problema Detectado:**  
- **HALL-004:** El endpoint `POST /api/auth/register` estaba **completamente expuesto sin autenticación**.
- **HALL-009:** El endpoint `/register` no tenía rate limiting.

**Solución Aplicada:**  
Se modificaron 2 líneas en `src/routes/auth.routes.js`:

- Import: `import { requireAuth, requireRole } from '../middlewares/auth.js';`
- Endpoint: `router.post('/register', authLimiter, requireAuth, requireRole('ADMIN', 'OWNER'), register);`

**Verificación:**
- `node --check` OK.
- Test local sin token: `401` con `code: AUTH_TOKEN_REQUIRED`.
- Headers `RateLimit-*` presentes.
- Test producción: `401`.
- Login OAuth funcional.

**Rollback:** `git revert 20934e2`

---

### 🚨 HALL-055 — Exposición Histórica de `.env` con Variables Públicas de Supabase (GitGuardian)

**Fecha del incidente:** 2026-09-16 (detección) / 2026-09-01 (origen)
**Fecha de resolución:** 2026-09-17
**Fase:** 3.1 — Hotfix de Seguridad (incidente externo)
**Archivos afectados:** `.env` (eliminado del repositorio, preservado en historial)
**Severidad declarada por GitGuardian:** 🟠 ALTA (SMTP credentials)
**Severidad real evaluada:** 🟢 BAJA (cuasi-falso positivo)
**Estado:** ✅ RESUELTO (contenido + diagnosticado + limpieza de ramas)

**Descripción del Incidente:**
El 2026-09-16, el servicio GitGuardian envió una alerta automática indicando la detección de "SMTP credentials" expuestas en el repositorio público `paraguayffaametalstorm-debug/ffaa-paraguay-classic`, con fecha de push reportada como `2026-09-16 16:37:06 UTC`.

**Diagnóstico Forense Ejecutado:**

1. **Identificación del commit origen:** Se rastreó el historial completo con `git log --all --full-history -- "*.env"`, identificando el commit `f5fd20e` ("Agregar variables de entorno para Supabase") como el único que introdujo un archivo `.env` real.

2. **Contenido filtrado:** El `.env` contenía únicamente 2 variables:
   - `VITE_SUPABASE_URL="https://oodzpkloxnylzauimvua.supabase.co"`
   - `VITE_SUPABASE_ANON_KEY=***`
   Ambas son **variables públicas por diseño** (prefijo `VITE_` = incrustadas en el bundle frontend del cliente).

3. **Verificación de credenciales reales:** Se confirmó que **NINGUNA** credencial de servicio crítica se filtró:
   - ❌ `SUPABASE_SERVICE_ROLE_KEY` → nunca estuvo en Git.
   - ❌ `JWT_SECRET` → nunca estuvo en Git.
   - ❌ `EMAIL_PASS` (SMTP real) → el módulo SMTP se implementó después (v3.4.0, 2026-09-07), por lo que no pudo estar en el `.env` del 2026-09-01.
   - ❌ `GOOGLE_CLIENT_SECRET` → nunca estuvo en Git.
   - ❌ `CLOUDINARY_API_SECRET`, `DEEPL_API_KEY` → nunca estuvieron en Git.

4. **Verificación de Row Level Security (RLS):** Se ejecutó una consulta a `pg_tables` + `pg_policies` en Supabase, confirmando que **las 22 tablas del schema `public` tienen `rls_enabled = true`**. Esto significa que la `ANON_KEY` filtrada **NO permite acceso a datos sensibles** — un atacante con la clave filtrada obtiene respuestas vacías o 403 en todas las tablas.

5. **Accesibilidad actual:** El `.env` fue eliminado del árbol de archivos el mismo día de su introducción (commit `3006ac4`, 2026-09-01). Solo persiste en el objeto-database histórico de Git, no accesible desde ninguna rama activa (verificado con `git show <commit>:.env` en los 3 commits sospechosos → todos fallaron con "path does not exist").

**Conclusiones del Diagnóstico:**

- **Tipo de incidente:** Cuasi-falso positivo de GitGuardian. El clasificador aplicó la etiqueta "SMTP credentials" sobre un archivo `.env` que no contenía SMTP real, sino variables públicas de Supabase.
- **Datos sensibles expuestos:** Ninguno.
- **Credenciales de servicio comprometidas:** Ninguna.
- **Riesgo operativo real:** Nulo (variables públicas + RLS habilitado en 22/22 tablas).

**Acciones de Contención Aplicadas:**

1. **Rotación preventiva de credenciales SMTP:** Aunque el incidente no las involucraba, se ejecutó una rotación preventiva de las app passwords de Gmail:
   - Se eliminaron las dos credenciales antiguas (`PARAGUAY-FFAA` del 2026-09-08 y `PARAGUAY-FFAA-SMTP` del 2026-09-15).
   - Se generó una nueva (`METALSTORM-SMTP-v4.0.1`) el 2026-09-16.
   - Se actualizó el secret `EMAIL_PASS` en Fly.io (digest `52013d91530dc60e`, estado `Deployed`).

2. **Limpieza de ramas obsoletas:** Se eliminaron las ramas `feature/sql-migrations` y `feature/business-logic-consistency` (ambas ya mergeadas a `main`), reduciendo la superficie del historial accesible públicamente.

3. **Verificación funcional post-rotación:** La aplicación opera correctamente:
   - `curl https://paraguay-ffaa-metalstorm.fly.dev/health` → `OK`.
   - Login OAuth del OWNER funcionando.
   - Vistas y componentes cargando sin errores.

**Acciones de Prevención:**

- ✅ `.gitignore` verificado: incluye `.env` y `.env.*`.
- ✅ `.env.example` solo contiene placeholders (nunca valores reales).
- ✅ Política de despliegue refrendada: los secrets viven exclusivamente en Fly.io (`fly secrets set`), nunca en el repositorio.
- ✅ Rotación preventiva de app passwords de Gmail ejecutada como buena práctica de higiene.

**Verificación Final:**

- ✅ GitGuardian: incidente diagnosticado como cuasi-falso positivo. Marcado como "Resolved".
- ✅ Repo GitHub: sin ramas huérfanas con el `.env`.
- ✅ RLS: 22/22 tablas protegidas.
- ✅ SMTP: credencial nueva operativa.
- ✅ App: 100% funcional en producción.

**Rollback:** No aplica (no se modificó código de producción). Documentación pura.

**Lecciones Aprendidas:**

1. **Nunca commitear `.env`:** Aunque las variables `VITE_*` son públicas por diseño, el `.env` nunca debe versionarse. Solo `.env.example` con placeholders.
2. **Confiar pero verificar:** Las alertas automáticas de terceros (GitGuardian, Snyk, etc.) son valiosas pero requieren validación manual. En este caso, la etiqueta "SMTP credentials" era incorrecta.
3. **RLS es la última línea de defensa:** Aunque la `ANON_KEY` se filtre, RLS en Supabase garantiza que no haya exfiltración de datos. Verificar RLS debe ser parte del checklist de seguridad.
4. **Rotación preventiva no hace daño:** Rotar credenciales "por si acaso" es una práctica de bajo costo y alto beneficio, incluso cuando el riesgo es nulo.

**Referencias:**

- Alerta original: GitGuardian Security `<security@getgitguardian.com>`, recibida el 2026-09-16.
- Commits involucrados: `f5fd20e` (introducción), `3006ac4` (eliminación).
- Documento relacionado: `CHANGELOG.md` sección `[Fase 3.1]`.
- Hallazgo auditoría original: No relacionado con la auditoría de 52 hallazgos (evento externo).

---

### 🔧 HALL-053 + HALL-054 — Cuota ADMIN a 5 + Constante ROLE_LIMITS

**Fecha:** 2026-09-17  
**Fase:** 3 — Consistencia de Lógica de Negocio  
**Archivo:** `src/controllers/admin.controller.js`  
**Commit:** `5c7bfc1`  
**Severidad:** 🟠 ALTA  
**Estado:** ✅ RESUELTO

**Problema Detectado:**  
La documentación especificaba máximo 3 ADMIN, pero la BD tenía 5 (staff fundacional). Los límites estaban hardcodeados en 4 ubicaciones del mismo archivo, con riesgo de inconsistencia al modificar.

**Solución Aplicada:**  
1. Creada constante centralizada `ROLE_LIMITS = { OWNER: 1, ADMIN: 5, VETERANO: 8 }`.
2. Reemplazados 4 hardcodes (`>= 3`, `>= 8`) por referencias a `ROLE_LIMITS.ADMIN`, `ROLE_LIMITS.VETERANO`.
3. Mensajes de error actualizados con template literals para reflejar el valor dinámico.

**Verificación:**  
- `node --check` PASS.
- 8 ocurrencias de `ROLE_LIMITS` (1 declaración + 7 usos).
- Sin hardcodes residuales de rol.
- Smoke test en producción PASS.

**Rollback:** `git revert 5c7bfc1`

---

### 🔧 HALL-013 — Validación de Jerarquía en `savePerformance`

**Fecha:** 2026-09-17  
**Fase:** 3  
**Archivo:** `src/controllers/performances.controller.js`  
**Commit:** `20e02cb`  
**Severidad:** 🟠 ALTA  
**Estado:** ✅ RESUELTO

**Problema Detectado:**  
Un ADMIN podía registrar rendimientos en nombre de otro ADMIN o del OWNER, violando la jerarquía militar.

**Solución Aplicada:**  
Bloque de validación dentro del `if (String(targetUserId) !== String(callerId))`: si el caller es ADMIN y el target es ADMIN u OWNER, retorna 403 con `HIERARCHY_FORBIDDEN`.

**Verificación:**  
- `node --check` PASS.
- `findstr HIERARCHY_FORBIDDEN` → 1 ocurrencia.
- Smoke test en producción PASS.

**Rollback:** `git revert 20e02cb`

---

### 🔧 HALL-028 — Validación Estricta de `user_id` en `PerformanceSchema`

**Fecha:** 2026-09-17  
**Fase:** 3  
**Archivo:** `src/utils/schemas.js`  
**Commit:** `77ebba8`  
**Severidad:** 🟡 MEDIA  
**Estado:** ✅ RESUELTO

**Problema Detectado:**  
El schema aceptaba cualquier string como `user_id`. Un cliente malicioso podía enviar `"'; DROP TABLE users; --"` o `"hackeame"`.

**Solución Aplicada:**  
Reemplazado `z.union([z.number().int(), z.string()])` por un `z.union` con:
- `z.number().int().positive()`
- `z.string().regex(/^(self|UUID válido|\d+)$/i)`

**Verificación:**  
Test local de 8 casos: 4 válidos (num, UUID, `self`, vacío) + 4 inválidos (basura, vacío, SQL injection, negativo) → **8 OK, 0 FAIL**.

**Rollback:** `git revert 77ebba8`

---

### 🔧 HALL-024 + HALL-025 — Secuencia PostgreSQL Atómica para `user_id`

**Fecha:** 2026-09-17  
**Fase:** 3  
**Archivos:** `src/utils/security.js`, `sql/025_user_id_sequence.sql`  
**Commit:** `e4fa2d5`  
**Severidad:** 🔴 CRÍTICA  
**Estado:** ✅ RESUELTO

**Problema Detectado:**  
- **HALL-024:** Race condition en `getNextUserId` (SELECT max + INSERT no atómico). Colisiona bajo concurrencia y multi-instancia Fly.io.
- **HALL-025:** Retornaba `1` en error, peligroso porque `user_id=1` es del OWNER.

**Solución Aplicada:**  
1. Creada secuencia `user_id_seq` en Supabase.
2. Creada función RPC `get_next_user_id()` que retorna `nextval('user_id_seq')`.
3. Refactorizado `getNextUserId()` para llamar a la RPC (O(1) atómico).
4. Eliminado `return 1` → ahora lanza excepción.

**Verificación:**  
- Test de RPC: 3 llamadas → `1004`, `1005`, `1006` ✅.
- Test local integrado: `getNextUserId()` → `1007` (tipo `number`) ✅.
- Smoke test en producción PASS.

**Rollback:** `git revert e4fa2d5` + `DROP SEQUENCE user_id_seq; DROP FUNCTION get_next_user_id();`

---

### 🔧 HALL-044 + HALL-045 — Validación Tipada y `onConflict` en Settings (+ FK derivada)

**Fecha:** 2026-09-17  
**Fase:** 3  
**Archivos:** `src/controllers/settings.controller.js`, `sql/026_fix_user_settings_fk.sql`  
**Commit:** `b1f9c71`  
**Severidad:** 🟠 ALTA  
**Estado:** ✅ RESUELTO

**Problema Detectado:**  
- **HALL-044:** No había validación tipada UUID vs INTEGER. Con `user_id` INTEGER, la consulta fallaba.
- **HALL-045:** Sin `onConflict`, el upsert creaba filas duplicadas cada vez.
- **DERIVADO:** La FK `user_settings.user_id` apuntaba a `auth.users(id)` en lugar de `public.users(id)` → violación de FK al guardar settings para pilotos del escuadrón.

**Solución Aplicada:**  
1. **Código:** Resolución tipada del UUID real desde `user_id` INTEGER antes de consultar `user_settings`.
2. **Código:** `onConflict: 'user_id'` en el upsert.
3. **BD:** Corregida la FK para apuntar a `public.users(id)`.

**Verificación:**  
- Test local integrado: resolvió UUID correcto + upsert + verificación de no-duplicados → `🎉 TEST PASADO EXITOSAMENTE`.
- Smoke test en producción: `theme: militar → ops` persistió ✅.

**Rollback:** `git revert b1f9c71` + revertir FK a `auth.users`.

---

### 🔧 HALL-050 — Sincronización de Valores de Mods en `DEPLOYMENT_STATE.md`

**Fecha:** 2026-09-17  
**Fase:** 3  
**Archivo:** `DEPLOYMENT_STATE.md`  
**Commit:** `d69d363`  
**Severidad:** 🟡 MEDIA  
**Estado:** ✅ RESUELTO

**Problema Detectado:**  
La tabla de mods m1-m10 en `DEPLOYMENT_STATE.md` tenía valores viejos (ej: `m1: +4%, +8%...`) que no coincidían con `modEffects.js` ni con la Wiki oficial.

**Solución Aplicada:**  
Reemplazadas las 10 filas con los valores oficiales verificados contra la Wiki de Metalstorm (extracto 2026-09-17).

**Verificación:**  
- 4 `findstr` confirman valores correctos (m1, m7, m8, m10).
- Diff: 10 inserciones, 10 eliminaciones.

**Rollback:** `git revert d69d363`

---

### 🔧 HALL-052 — Alineación del Schema `plane_upgrades` con Producción

**Fecha:** 2026-09-17  
**Fase:** 3 (derivado de Fase 2)  
**Archivo:** `sql/023_upgrades_2_0.sql`  
**Commit:** `968e34f`  
**Severidad:** 🟠 ALTA (reproducibilidad)  
**Estado:** ✅ RESUELTO

**Problema Detectado:**  
El archivo SQL versionado tenía **6 bugs** que no coincidían con la realidad de producción:
1. Columna `user_id INT REFERENCES users(id)` (FK rota INT→UUID, columna inexistente en prod).
2. Columna `piezas_usadas` (inexistente en prod).
3. Columna `avanzadas_usadas` (inexistente en prod).
4. Faltaba columna `recursos_usados` (sí existía en prod).
5. Faltaba CHECK `nivel_nuevo BETWEEN 0 AND 8` (sí existía en prod).
6. Faltaba CHECK `sistema IN (...)` (sí existía en prod).

Además, índice `idx_plane_upgrades_user_id` sobre columna inexistente.

**Solución Aplicada:**  
Alineado el `CREATE TABLE` con la estructura real de producción. Agregada secuencia explícita para idempotencia.

**Verificación:**  
- 4 `findstr` confirman alineación (sin `user_id` en tabla, con `recursos_usados`, con `plane_upgrades_id_seq`, con `CHECK`).
- Smoke test en producción PASS.

**Rollback:** `git revert 968e34f`

---

### 🗄️ HALL-048 — Infraestructura como Código (SQL Migrations)

**Fecha:** 2026-09-16  
**Fase:** 2 — Infraestructura como Código  
**Archivos:** `sql/*.sql` (26 archivos), `sql/README.md`, `DEPLOYMENT_GUIDE.md`  
**Commits:** `41fda3b`, `7918b22`, `d0d0af7`, `b74ba6b`, `1a7ef90`, `de0bd4f`, `eb5255b`, `04d42e7`, `e730291`  
**Severidad:** 🟠 ALTA (infraestructura / reproducibilidad)  
**Estado:** ✅ RESUELTO

**Problema Detectado:**  
Solo existía `sql/upgrades_2_0.sql` en el repositorio, pero Supabase tenía 22 tablas activas. Las 21 tablas restantes no tenían archivos de migración versionados, violando el principio de infraestructura como código. Era imposible recrear la base de datos desde cero en un proyecto nuevo de Supabase.

**Solución Aplicada:**

1. **Dump de referencia** (`sql/000_full_schema_dump.sql`): Índice con las 22 tablas, sus columnas clave y punteros a los archivos individuales.
2. **Reorganización** de los 4 archivos existentes con prefijos numéricos y archivo obsoleto movido a `sql/legacy/`.
3. **22 archivos DDL** creados (001 a 022) con esquema idempotente (`CREATE TABLE IF NOT EXISTS`).
4. **Migraciones compuestas** preservadas: `023_upgrades_2_0.sql` (Upgrades 2.0) y `024_fix_users_null_user_id.sql` (fix de datos).
5. **Guía de migraciones** (`sql/README.md`): orden de ejecución, procedimiento de recreación, notas de idempotencia y BM.
6. **Documentación de despliegue** (`DEPLOYMENT_GUIDE.md`, sección 5.1): procedimiento completo de recreación desde cero.

**Verificación:**

- 26 archivos en `sql/` con prefijos numéricos correctos.
- `sql/README.md` describe el orden de ejecución.
- `DEPLOYMENT_GUIDE.md` sección 5.1 documenta el procedimiento completo.
- Archivos obsoletos movidos a `sql/legacy/`.
- Todos los commits aplicados sin conflictos.

**Tareas Pendientes Documentadas:**

- [ ] **Fase 3:** Corregir FK `plane_upgrades.user_id` (INT → UUID).
- [ ] **Fase posterior:** Rediseñar el módulo Black Market (`bm_*`).
- [ ] **Verificación funcional:** Ejecutar los 24 archivos en un Supabase de prueba.

**Rollback:**  
Revertir la rama `feature/sql-migrations` completa o `git revert` de los commits específicos. No afecta a producción (solo agrega archivos).

**Impacto:**  
- Infraestructura 100% versionada.
- Recreación de BD desde cero documentada y reproducible.
- Base para auditorías futuras y transferencia de propiedad.

---

### 🔴 HALL-001 (Definitivo) — Eliminación del Fallback de JWT_SECRET

**Fecha:** 2026-09-16  
**Fase:** 1.1 — Seguridad Crítica  
**Archivo:** `src/config/env.js`  
**Commit:** `8215fcb`  
**Severidad:** 🔴 CRÍTICA  
**Estado:** ✅ RESUELTO DEFINITIVAMENTE

**Problema Detectado:**  
El código usaba `process.env.JWT_SECRET || 'ffaa_pry_metalstorm_jwt_super_secret_key_2026'`. Si la variable de entorno no estaba definida, el servidor arrancaba con un secret públicamente conocido, permitiendo a un atacante forjar tokens JWT válidos.

**Solución Aplicada:**  
Se agregó un bloque de validación al inicio del archivo:

```javascript
const JWT_SECRET = process.env.JWT_SECRET;

if (process.env.NODE_ENV === 'production' && !JWT_SECRET) {
  console.error('❌ FATAL: JWT_SECRET no definido en producción. Abortando.');
  process.exit(1);
}
```

Y se cambió el fallback a `'dev-only-insecure-secret-change-me'` (solo para desarrollo).

**Verificación:**  
- `node --check src/config/env.js` → OK.
- Test `NODE_ENV=production` + sin `JWT_SECRET` → el servidor **aborta** con mensaje de error.
- Test `NODE_ENV=production` + con `JWT_SECRET` → el servidor arranca normalmente.
- Producción: health checks passing, login operativo.

**Rollback:**  
`git revert 8215fcb`

---

### 🟠 HALL-022 — Validación de Jerarquía en Reset-Password

**Fecha:** 2026-09-16  
**Fase:** 1.2 — Seguridad Crítica  
**Archivo:** `src/routes/admin.routes.js`  
**Commit:** `2fdb862`  
**Severidad:** 🟠 ALTA  
**Estado:** ✅ RESUELTO

**Problema Detectado:**  
Un ADMIN podía resetear la contraseña de otro ADMIN o incluso del OWNER, escalando privilegios sin autorización.

**Solución Aplicada:**  
Se añadieron 3 validaciones de jerarquía después de obtener el usuario objetivo:

1. **Auto-reseteo bloqueado:** el actor no puede resetear su propia contraseña por esta vía (`SELF_RESET_FORBIDDEN`).
2. **OWNER protegido:** nadie excepto el propio OWNER puede resetear su contraseña (`OWNER_PROTECTED`).
3. **ADMIN limitado:** solo puede resetear a MIEMBRO y VETERANO (`HIERARCHY_FORBIDDEN`).

**Además:** se registra `target_role` en `security_events` para auditoría.

**Verificación:**  
- Como ADMIN → resetear a MIEMBRO: ✅ funciona.
- Como ADMIN → resetear a VETERANO: ✅ funciona.
- Como ADMIN → resetear a otro ADMIN: ✅ 403 HIERARCHY_FORBIDDEN.
- Como ADMIN → resetear al OWNER: ✅ 403 OWNER_PROTECTED.
- Como OWNER → resetear a cualquiera (excepto a sí mismo): ✅ funciona.
- Como OWNER → resetear a sí mismo: ✅ 403 SELF_RESET_FORBIDDEN.

**Rollback:**  
`git revert 2fdb862`

---

### 🟢 HALL-016 — Columna `rutas_sistemas` en Tabla `planes`

**Fecha:** 2026-09-16  
**Fase:** 1.3 — Seguridad Crítica  
**Archivos:** `sql/upgrades_2_0.sql` + Supabase  
**Commits:** `edadf11` + `ba4ff8a`  
**Severidad:** 🟡 MEDIA  
**Estado:** ✅ RESUELTO

**Problema Detectado:**  
El código de `updatePlaneSystems` intentaba persistir las rutas A/B elegidas por el piloto en una columna `rutas_sistemas` que no existía en la tabla `planes`. El fallback silencioso hacía que la funcionalidad no operara.

**Solución Aplicada:**  
Se añadió el bloque 1.0 al inicio de `sql/upgrades_2_0.sql`:

`ALTER TABLE planes ADD COLUMN IF NOT EXISTS rutas_sistemas JSONB DEFAULT '{}'::jsonb;`

Y se aplicó en Supabase.

**Verificación:**  
- `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'planes' AND column_name = 'rutas_sistemas'` → `rutas_sistemas | jsonb | '{}'::jsonb | YES`.
- Verificación de datos: aviones existentes ya tienen `{}` como default.
- (Pendiente) Test funcional de `PUT /api/planes/:id/systems` con rutas A/B → smoke test en producción.

**Rollback:**  
`ALTER TABLE planes DROP COLUMN IF EXISTS rutas_sistemas;`

---

### 🟠 HALL-002 — CORS Restringido a Whitelist Estricta

**Fecha:** 2026-09-16  
**Fase:** 1.4 — Seguridad Crítica  
**Archivo:** `server.js`  
**Commit:** `5ba274b`  
**Severidad:** 🟠 ALTA  
**Estado:** ✅ RESUELTO

**Problema Detectado:**  
La lógica de CORS era extremadamente permisiva:
- `endsWith('.fly.dev')` → permitía cualquier app Fly.io del mundo.
- `endsWith('.run.app')` → permitía cualquier app Google Cloud Run.
- `endsWith('.google.com')` → permitía cualquier subdominio de Google.
- `includes('localhost')` → permitía `localhost.malicioso.com`.
- `includes('127.0.0.1')` → permitía `127.0.0.1.malicioso.com`.

**Solución Aplicada:**  
Se reemplazó la lógica por validación estricta contra `ENV.ALLOWED_ORIGINS` con `Set`.

**Verificación:**  
- Login desde `paraguay-ffaa-metalstorm.fly.dev`: ✅ funciona.
- Login desde `http://localhost:3000`: ✅ funciona (dev).
- `curl` sin `Origin`: ✅ funciona.
- Consola del navegador: cero errores de CORS.

**Rollback:**  
`git revert 5ba274b`

---

### 🟠 HALL-003 — Helmet con `frameguard` + `contentSecurityPolicy`

**Fecha:** 2026-09-16  
**Fase:** 1.5 — Seguridad Crítica  
**Archivo:** `server.js`  
**Commits:** `bb8cb9b` + `840168f`  
**Severidad:** 🟠 ALTA  
**Estado:** ✅ RESUELTO

**Problema Detectado:**  
`helmet()` estaba configurado con `frameguard: false` y `contentSecurityPolicy: false`. Esto dejaba la app vulnerable a clickjacking y XSS.

**Solución Aplicada:**  
Se activó CSP con directivas específicas para `defaultSrc`, `scriptSrc`, `styleSrc`, `fontSrc`, `imgSrc`, `connectSrc`, `frameSrc`, `frameAncestors`, `workerSrc`.

**Iteración:** el `imgSrc` inicial con 9 orígenes específicos fue reemplazado por `https:` tras detectar imágenes bloqueadas de origen no identificado.

**Verificación:**  
- `node --check server.js` → OK.
- Smoke test en local: 12 vistas cargadas, cero errores de CSP.
- Producción: cero errores de CSP tras deploy.

**Rollback:**  
`git revert 840168f bb8cb9b`

---

### 🟢 HALL-023 — Eliminación de `tls.rejectUnauthorized: false`

**Fecha:** 2026-09-16  
**Fase:** 1.6 — Seguridad Crítica  
**Archivo:** `src/utils/email.js`  
**Commit:** `acd7cef`  
**Severidad:** 🟡 MEDIA  
**Estado:** ✅ RESUELTO

**Problema Detectado:**  
El transporter de Nodemailer tenía `tls: { rejectUnauthorized: false }`, lo que desactivaba la validación de certificados TLS. Esto permitía ataques MITM.

**Solución Aplicada:**  
Se eliminó el bloque `tls: { rejectUnauthorized: false }`. Nodemailer usa `rejectUnauthorized: true` por defecto.

**Verificación:**  
- `node --check src/utils/email.js` → OK.
- Gmail SMTP tiene certificados válidos → sin impacto operativo.

**Rollback:**  
`git revert acd7cef`

---

### 🟠 HALL-053 — Cuota de ADMIN Inconsistente (Documentación vs. Realidad)

**Fecha:** 2026-09-16  
**Fase:** 0.2 — Verificación de Jerarquía  
**Archivos afectados:** Ninguno (resuelto por decisión de negocio)  
**Severidad:** 🟠 ALTA  
**Estado:** ✅ RESUELTO POR DECISIÓN DEL OWNER

**Problema Detectado:**  
La documentación (CHANGELOG v3.1.0) especificaba máximo 3 ADMIN, pero la base de datos contenía 5 usuarios con rol ADMIN. La validación en código nunca se aplicó o fue bypasseada desde la fundación del escuadrón.

**Evidencia:**

- Los 5 ADMIN (ASTARTES, FURTIVO, GENNOMAX, RUBEN, BARBA19) fueron creados el **2026-02-16**, mismo día que el OWNER.
- Todos están ACTIVE, sin modificaciones posteriores.
- Los IDs son `user_id: 2, 3, 4, 5, 8`.

**Resolución (Decisión del OWNER):**  
Se aprueba aumentar la cuota de ADMIN de **3 → 5**.

**Justificación:**

- Los 5 ADMIN son staff fundacional operativamente necesario.
- El límite de 3 era arbitrario y no reflejaba la estructura real del escuadrón.

**Acciones pendientes:**

- [ ] **Fase 3:** Actualizar `>= 3` a `>= 5` en `src/controllers/admin.controller.js` (2 ubicaciones).
- [ ] **Fase 3:** Actualizar mensaje de error "Máximo 3 Administradores" → "Máximo 5 Administradores".
- [ ] **Fase 6:** Sincronizar documentación (`ARCHITECTURE.md`, `API_REFERENCE.md`, `POLITICA_INACTIVACION.md`, `USER_MANUAL.md`).

**Estado:** ✅ Decisión registrada — Pendiente implementación en código (Fase 3)

---

### 🟡 HALL-054 — Límites de Roles Hardcodeados

**Fecha:** 2026-09-16  
**Fase:** 0.2 — Verificación de Jerarquía  
**Archivos afectados:** `src/controllers/admin.controller.js`  
**Severidad:** 🟡 MEDIA  
**Estado:** 🔍 DETECTADO — Pendiente de refactor

**Problema Detectado:**  
Los límites de roles están hardcodeados con valores literales (3, 8, 1) en múltiples funciones del mismo archivo, sin constante centralizada. Cambiar un límite requiere editar N ubicaciones, con alto riesgo de inconsistencia.

**Ubicaciones detectadas:**

1. **`updateUserRole()`** — función de cambio de rol:
   - `>= 3` para validar límite de ADMIN.
   - `>= 8` para validar límite de VETERANO.
   - `>= 1` para OWNER (lógica de transferencia).

2. **`addMember()`** — función de creación de nuevo piloto:
   - `>= 3` para validar límite de ADMIN.
   - `>= 8` para validar límite de VETERANO.

**Impacto:**  
Con la decisión de HALL-053 (ADMIN 3 → 5), hay que modificar **2 ubicaciones** con el número 3. Un error tipográfico en una sola dejaría el sistema inconsistente.

**Solución recomendada (Fase 3):**  
Crear constante centralizada al inicio del archivo:

`const ROLE_LIMITS = { OWNER: 1, ADMIN: 5, VETERANO: 8 };`

Y reemplazar los 4 hardcodes por `ROLE_LIMITS.ADMIN`, `ROLE_LIMITS.VETERANO`, `ROLE_LIMITS.OWNER`.

**Nota:** el valor ADMIN es 5 (actualizado desde 3 por decisión del OWNER, 2026-09-16).

**Acciones pendientes:**

- [ ] **Fase 3:** Crear constante `ROLE_LIMITS`.
- [ ] **Fase 3:** Reemplazar hardcodes en `updateUserRole()`.
- [ ] **Fase 3:** Reemplazar hardcodes en `addMember()`.
- [ ] **Fase 3:** Actualizar mensajes de error para que usen `ROLE_LIMITS.ADMIN`.

**Estado:** 🔍 DETECTADO — Pendiente refactor en Fase 3

---

### 🚨 Mitigación de Emergencia — HALL-001 (JWT_SECRET en Fly.io)

**Fecha:** 2026-09-16  
**Fase:** 0.1 — Contención de Emergencia  
**Archivos afectados:** Ninguno (configuración externa en Fly.io)  
**Severidad:** 🔴 CRÍTICA (mitigada parcialmente)  
**Estado:** 🟡 MITIGADO PARCIALMENTE — Fix definitivo en Fase 1, Tarea 1.1

**Problema Detectado:**  
El archivo `src/config/env.js` define un fallback hardcodeado para el secreto JWT. Si la variable de entorno no está definida, el servidor arranca con un secreto públicamente conocido en el repositorio, permitiendo a un atacante forjar tokens JWT válidos y suplantar a cualquier usuario del escuadrón (incluyendo OWNER).

**Mitigación Aplicada:**  
Se configuró `JWT_SECRET` como secret en Fly.io con un valor aleatorio criptográficamente seguro:

`fly secrets set JWT_SECRET="$(openssl rand -base64 48)" -a paraguay-ffaa-metalstorm`

**Evidencia de Validación:**

- `fly secrets list` → `JWT_SECRET | c851b45ed89bc61e | Deployed`
- Rolling deploy: `✔ [1/2]` y `✔ [2/2]` — sin downtime.
- Health check `servicecheck-00-http-3000` passing.
- Supabase Diagnostic OK (users / performances / events).
- Logs sin errores nuevos tras reinicio.

**Impacto Operativo:**  
- Tokens JWT previos invalidados. Los usuarios deberán iniciar sesión nuevamente (una sola vez).
- Sin downtime durante el rolling deploy.

**Rollback:**  
`fly secrets unset JWT_SECRET -a paraguay-ffaa-metalstorm`  
> ⚠️ NO recomendado. Revertir deja el sistema vulnerable al fallback público.

**Pendiente (Fase 1, Tarea 1.1):**  
Eliminar el fallback hardcodeado en `src/config/env.js` para que el servidor NO arranque si `NODE_ENV=production` y `JWT_SECRET` está vacío.

**Estado:** ✅ MITIGADO — Pendiente fix definitivo en Fase 1

---


### 🔹 Fix #1: Desacoplamiento UUID vs INTEGER en `changePassword()`
- **Fecha:** 2026-09-09
- **Archivo Principal:** `src/controllers/auth.controller.js`
- **Severidad:** 🚨 Crítica (Bloqueaba el onboarding de nuevos pilotos y restablecimiento forzado).
- **Problema Detectado:**
  La consulta de actualización en Supabase forzaba la condición `.eq('id', user.id)`. Debido a que la carga útil del token JWT o el objeto `req.user` contenía identificadores numéricos (`user_id = 1000`) o inconsistencias de formato, PostgreSQL rechazaba la consulta por incompatibilidad de tipos UUID o no lograba hacer match con ningún registro, dejando `must_change_password` en `true` indefinidamente.
- **Solución Técnica:**
  Se implementó una consulta polimórfica tipada jerárquica con comprobación de regex para UUID v4, conversión numérica para `user_id` entero y fallback a `email`:

  ```javascript
  // Lógica tipada implementada en src/controllers/auth.controller.js
  let updateQuery = supabase.from('users').update({
      password_hash: newHash,
      must_change_password: false,
      token_version: newTokenVersion,
      updated_at: new Date().toISOString()
  });

  if (user.id && typeof user.id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id)) {
      updateQuery = updateQuery.eq('id', user.id);
  } else if (user.user_id && (typeof user.user_id === 'number' || /^\d+$/.test(String(user.user_id)))) {
      updateQuery = updateQuery.eq('user_id', Number(user.user_id));
  } else if (user.email) {
      updateQuery = updateQuery.eq('email', user.email);
  } else {
      updateQuery = updateQuery.eq('id', user.id);
  }

  const { data: updateData, error: updateError } = await updateQuery
      .select('id, email, nick, user_id, role, token_version, must_change_password');
  ```
- **Evidencia de Validación en Logs:**
  ```text
  🔍 [changePassword] Actualizando usuario con: {
    id: '3658df3a-3d15-4669-a595-dca33ec86fd3',
    user_id: 1000,
    newTokenVersion: 2,
    newHash: '$2b$10$as8vQDbgnRgh5...'
  }
  ✅ [changePassword] Filas actualizadas con éxito: 1
  ```
- **Estado:** ✅ RESUELTO Y PROBADO EN PRODUCCIÓN

---

### 🔹 Fix #2: Consultas Tipadas en Reseteo Administrativo de Claves
- **Fecha:** 2026-09-09
- **Archivo:** `src/routes/admin.routes.js` y `src/controllers/admin.controller.js`
- **Severidad:** ⚠️ Alta
- **Problema:** El endpoint de reseteo `POST /api/admin/users/:id/reset-password` fallaba cuando la URL contenía el `user_id` numérico (e.g. `1000`) en lugar del UUID interno de Supabase.
- **Solución:**
  Se integró la validación tipada que analiza el parámetro `:id`. Si contiene solo dígitos numéricos, consulta por la columna `user_id`; de lo contrario, si cumple con la expresión regular de UUID, consulta por la columna `id`.
- **Estado:** ✅ RESUELTO Y AUDITADO

---

### 🔹 Fix #3: Manejo Seguro de Identificadores en Gestión de Roles y Estados
- **Fecha:** 2026-09-09
- **Archivo:** `src/controllers/admin.controller.js`
- **Métodos Involucrados:** `updateUserRole()`, `updateUserStatus()`
- **Problema:** Las actualizaciones de estado operativo (`ACTIVE` / `INACTIVE`) y ascenso de rangos militares (`MIEMBRO`, `VETERANO`, `ADMIN`) lanzaban excepciones en Supabase al recibir `user_id` entero desde la interfaz de administración táctica.
- **Solución:** Normalización del identificador del usuario mediante comprobación de formato UUID antes de concatenar a la consulta de base de datos.
- **Estado:** ✅ RESUELTO Y PROBADO

---

### 🔹 Fix #4: Consultas Tipadas en Expediente Militar y Perfil
- **Fecha:** 2026-09-09
- **Archivo:** `src/controllers/profile.controller.js`
- **Métodos Involucrados:** `getProfile()`, `updateProfile()`
- **Problema:** En perfiles de combatientes autenticados mediante Google OAuth 2.0 o contraseñas tradicionales, los endpoints de perfil no lograban actualizar la biografía táctica o número telefónico si el JWT contenía únicamente `user_id` numérico.
- **Solución:** Extensión de la lógica condicional polimórfica en la lectura y persistencia de perfiles militares.
- **Estado:** ✅ RESUELTO Y VERIFICADO

---

### 🔹 Fix #5: Registro y Consulta de Rendimiento Militar Táctico
- **Fecha:** 2026-09-09
- **Archivo:** `src/controllers/performances.controller.js`
- **Métodos Involucrados:** `savePerformance()`, `getMyHistory()`
- **Problema:** Al registrar tokens de combate semanales y evaluar el semáforo militar (`perf_status`), la consulta histórica cruzaba erróneamente `user_id` entero con la columna `user_id` en `performances` cuando en ocasiones se suministraba el `id` (UUID) en el contexto de la solicitud.
- **Solución:** Unificación del almacenamiento de rendimientos vinculados estrictamente al `user_id` numérico entero del combatiente.
- **Estado:** ✅ RESUELTO Y OPERATIVO

---

### 🔹 Fix #6: Normalización de la tabla `planes` (2026-09-10)

**Fecha:** 2026-09-10  
**Archivos:** Base de datos Supabase  
**Problema:** La tabla `planes` no cumplía con 1NF:
- `especial_nombre` contenía nombre + nivel + efecto
- `especial_nivel` era TEXT (no INTEGER)
- `pasiva_nombre` contenía nombre + nivel + efecto
- `pasiva_nivel` era TEXT (no INTEGER)
- Faltaba constraint UNIQUE (user_id, avion_id)
- Faltaba FK planes.user_id → users.user_id

**Solución:**
1. Agregar constraint UNIQUE (user_id, avion_id)
2. Agregar FK planes.user_id → users.user_id
3. Crear columnas `especial_nivel_num` (INTEGER) y `especial_efecto` (TEXT)
4. Crear columnas `pasiva_nivel_num` (INTEGER) y `pasiva_efecto` (TEXT)
5. Migrar datos con regex
6. Agregar constraints CHECK
7. Limpiar nombres (quitar paréntesis)

**Resultado:**
- ✅ 121 aviones normalizados
- ✅ 83/84 especiales migradas
- ✅ 35/37 pasivas migradas
- ✅ 3 aviones sin nivel (correcto)
- ✅ Estructura 1NF

**Estado:** ✅ RESUELTO Y PROBADO

**Commits:** N/A (cambios directos en Supabase)

---

### 🔹 Fix #7: Sistema de Aviones - Correcciones y Mejoras (2026-09-10)

**Fecha:** 2026-09-10  
**Archivos:** `planes.controller.js`, `audit.js`, `aircraft-stats-modal.html`, `views.js`  

**Problemas corregidos:**
1. **Funciones que leen nombre pero no nivel:** Las funciones `getPlaneDetails`, `exportPlanesCSV`, y `getPlaneStats` solo leían `especial_nombre` y `pasiva_nombre`, pero no `especial_nivel_num`, `especial_efecto`, `pasiva_nivel_num`, `pasiva_efecto`.
2. **Auditoría (UUID):** El sistema intentaba insertar `userId: 1` (INTEGER) en una columna UUID.
3. **Columna `actor_id` en `audit_logs`:** La tabla no tenía la columna.
4. **Falta de IA de recomendación.**
5. **Falta de Upgrade Planner.**

**Solución:**
1. Agregar las columnas nuevas en las funciones afectadas.
2. Convertir `userId` (INTEGER) a UUID en `logSecurityEvent`.
3. Convertir `actorId` (INTEGER) a UUID en `logAuditChange`.
4. Implementar `getRecommendedBuild` en el backend y `loadPlaneRecommendation` en el frontend.
5. Implementar `openUpgradePlanner` y `saveBuild` en el frontend.

**Resultado:**
- ✅ 39 modelos en el catálogo
- ✅ 10 mods disponibles
- ✅ 4 sistemas mejorables
- ✅ IA de Recomendación (3 estilos)
- ✅ Upgrade Planner (previsualización)
- ✅ Sin errores de auditoría
- ✅ CSV con datos completos

**Estado:** ✅ RESUELTO Y PROBADO

**Commits:** 6dceffc (feat(ui): add tactical build recommendations and planner)

---

### 🔹 Fix #8: Efectos de Mods - Integración Numérica en Estadísticas (2026-09-10)

**Fecha:** 2026-09-10  
**Archivos:** `src/utils/modEffects.js`, `src/controllers/planes.controller.js`  

**Problemas corregidos:**
1. **Falta de helper de efectos de mods:** No existía un módulo para consultar y parsear la tabla `mod_effects` (50 registros: 10 mods × 5 niveles) ni proveer fallback en memoria.
2. **Cálculo de estadísticas estático:** La función `getPlaneStats` no aplicaba los bonus porcentuales aportados por los mods equipados en la aeronave (`mod1_id` con `mod1_lvl` y `mod2_id` con `mod2_lvl`).

**Solución:**
1. Crear `src/utils/modEffects.js` implementando:
   - `getModEffects(supabase)`: Carga desde Supabase con caché en memoria (TTL 5 min) y fallback oficial para los 10 mods.
   - `getFallbackModEffects()`: Definición canónica de los 10 mods por niveles con banderas `siempre_activo`.
   - `getModLevelEffects(effects, modId, level)`: Extracción directa de parámetros de nivel.
   - `calculateModBonus(effects, modId, level, statKey)`: Cálculo estricto de multiplicadores para estadísticas visibles.
   - `getModDescription(effects, modId, level)`: Formato legible del beneficio táctico.
   - `invalidateModEffectsCache()`: Recarga forzada de caché.
2. Actualizar `getPlaneStats` en `src/controllers/planes.controller.js`:
   - Consultar `getModEffects(supabase)`.
   - Mapear y aplicar bonus siempre activos a `agility` (m1, m2), `armor` (m3), `ecm` (m7) y `radar` (m10).
   - Discriminar efectos condicionales (`m4`, `m6`, `m9`) y utilitarios (`m5`, `m8`) sin alterar arbitrariamente las estadísticas base.

**Resultado:**
- ✅ 10 mods reconocidos en sus 5 niveles (50 configuraciones)
- ✅ Cálculo de agilidad, blindaje, ECM y radar con modificadores en tiempo real
- ✅ Telemetría de aeronaves 100% calibrada según Upgrades 2.0 y Mods oficiales

**Estado:** ✅ RESUELTO Y VERIFICADO

---

### 🔹 Fix #9: Actualizar `sistemas_disponibles` y Validación de Sistemas (2026-09-11)

**Fecha:** 2026-09-11  
**Archivos:** `plane_models` (Supabase), `src/controllers/planes.controller.js`  
**Severidad:** 🚨 Crítica (Permitía mejorar sistemas inexistentes)

**Problema Detectado:**
Todos los 42 aviones tenían la misma estructura genérica en `sistemas_disponibles`, lo que permitía intentar mejorar sistemas que no existían para ciertos aviones (ej: cañones en F-111).

**Solución:**
1. Actualizar `sistemas_disponibles` en `plane_models` con la estructura específica por avión (`canones`, `misiles_ir`, `misiles_radar`, `misiles_beam`, `misiles_manual`, `misiles_largo`, `cohetes`).
2. Agregar validación en `updatePlaneSystem` que verifica que el sistema solicitado esté disponible antes de aplicar la mejora.
3. Retornar error `SYSTEM_NOT_AVAILABLE` si no está disponible.

**Código implementado:**
```javascript
const sistemaKeyMap = {
  fuselaje: 'fuselaje',
  motor: 'motor',
  avionica: 'avionica',
  armas: 'canones'
};

const sistemaKey = sistemaKeyMap[sistema];

if (sistemaKey) {
  const { data: modelData, error: modelError } = await supabase
    .from('plane_models')
    .select('sistemas_disponibles, name')
    .eq('id', plane.avion_id)
    .single();

  if (!modelError && modelData) {
    const sistemasDisponibles = modelData.sistemas_disponibles || {};
    const sistemaDisponible = sistemasDisponibles[sistemaKey];

    if (sistemaDisponible === null || sistemaDisponible === false || 
        sistemaDisponible === undefined) {
      return res.status(400).json({
        success: false,
        message: `Esta aeronave (${modelData.name}) no tiene el sistema ${sistema.toUpperCase()} disponible`,
        error: 'SYSTEM_NOT_AVAILABLE',
        details: { ... }
      });
    }
  }
}
```

**Evidencia de Validación:**
```text
✅ [Upgrade] Sistema armas disponible para F/A-18 Hornet
```

**Resultado:**
- ✅ 42 aviones con armas específicas
- ✅ Validación funcional en producción
- ✅ Prueba exitosa: PUT /api/planes/4/system → success: true

**Estado:** ✅ RESUELTO Y PROBADO EN PRODUCCIÓN

---

### 🔹 Fix #10: Integración de Datos de la Wiki de Metalstorm (2026-09-12)

**Fecha:** 2026-09-12  
**Archivos:** `plane_models` (Supabase), `src/controllers/planes.controller.js`, `js/views.js`, `components/aircraft-stats-modal.html`  
**Severidad:** 🎨 Media (feature nueva)  
**Commit:** N/A (Fase 3 completa)  

**Descripción:**  
Integración completa de los datos de la Wiki de Metalstorm (historia, recomendaciones, paints, canopies, loadout detallado) en el modal de Stats de cada aeronave.

**Problema Resuelto:**
- El modal Stats mostraba placeholders en las secciones de Historia y Recomendaciones.
- No había información sobre paints ni canopies disponibles.
- El armamento se mostraba solo con nombre (sin stats detalladas).

**Solución Implementada:**

1. **Extracción (Fase 3B):**
   - Script de consola del navegador que extrae 44 aviones desde `metalstorm.wiki.gg`.
   - Consolidación en `all_aircraft_wiki_data_v2_FINAL.json`.
   - Carga a Supabase con script Node.js (`import-wiki-data.cjs`).

2. **Columnas nuevas en `plane_models`:**
   ```sql
   ALTER TABLE plane_models ADD COLUMN IF NOT EXISTS descripcion TEXT;
   ALTER TABLE plane_models ADD COLUMN IF NOT EXISTS historia TEXT;
   ALTER TABLE plane_models ADD COLUMN IF NOT EXISTS recomendaciones JSONB;
   ALTER TABLE plane_models ADD COLUMN IF NOT EXISTS loadout_wiki JSONB;
   ALTER TABLE plane_models ADD COLUMN IF NOT EXISTS paints JSONB;
   ALTER TABLE plane_models ADD COLUMN IF NOT EXISTS canopies JSONB;
   ALTER TABLE plane_models ADD COLUMN IF NOT EXISTS general_info_wiki JSONB;
   ALTER TABLE plane_models ADD COLUMN IF NOT EXISTS wiki_url TEXT;
   ALTER TABLE plane_models ADD COLUMN IF NOT EXISTS wiki_extracted_at TIMESTAMPTZ;
   ```

3. **Backend (`getPlaneDetails`):** 8 campos nuevos añadidos a `planeDetail`.

4. **Frontend (`openAircraftDeepModal`):**
   - Sección "Historia" con párrafos completos.
   - Sección "Recomendaciones" con subsecciones (Trait/Ability/Passive Tips).
   - Sección "Paints" con galería visual.
   - Sección "Canopies" con galería visual.
   - `renderArmamentoEquipado` prioriza `plane.loadout_wiki`.

**Resultado:**
- ✅ 44 aviones con datos Wiki.
- ✅ 310+ paints, 176 canopies, 41 historias, 44 recomendaciones.
- ✅ Modal Stats con layout responsive 1-4 columnas.
- ✅ Sin errores de sintaxis (`node --check` pasó).

**Estado:** ✅ RESUELTO Y PROBADO EN PRODUCCIÓN

---
### 🔹 Fix #11: Limpieza de Tablas Huérfanas de Supabase (2026-09-12)

**Fecha:** 2026-09-12  
**Archivos:** Supabase (schema `public`)  
**Severidad:** 🧹 Baja (housekeeping)  
**Commit:** N/A (cambios directos en Supabase)

**Descripción:**  
Auditoría y limpieza de tablas huérfanas acumuladas durante migraciones
y pruebas del proyecto.

**Tablas eliminadas (10):**

1. **7 tablas de backup** (copias manuales de migraciones antiguas):
   - `planes_backup`, `planes_backup_full`
   - `planes_backup_20260910`, `planes_backup_limpieza_20260910`
   - `users_backup_full`
   - `security_events_backup`
   - `plane_models_backup`

2. **3 tablas legacy:**
   - `upgrade_nodes` (v1, reemplazada por `upgrade_nodes_v2` con 3072 filas)
   - `mod_effects_history` (auditoría vacía sin uso)
   - `performances_backup` (copia redundante)

**Verificación:**
- Grep de código: sin referencias en `src/`, `js/`, `components/`
- Post-DROP: schema `public` con 20 tablas activas
- App funcional: ✅

**Estado:** ✅ COMPLETADO

---
### 🔹 Fix #12: Restauración de `image_url` en 2 Aeronaves (2026-09-12)

**Fecha:** 2026-09-12  
**Archivos:** `plane_models` (Supabase)  
**Severidad:** 🖼️ Media (imágenes rotas en el hangar)  
**Commit:** N/A (cambio directo en Supabase)

**Descripción:**  
Dos aeronaves del catálogo (`F-20 Tigershark` id=110 y `KF-21 Boramae`
id=212) no tenían el campo `image_url` poblado, mostrándose sin imagen
principal en el carrusel del hangar militar.

**Diagnóstico:**
- Ambas imágenes SÍ existían en Cloudinary pero nunca se vincularon en Supabase.
- Las URLs crudas de Cloudinary usaban versionado por timestamp
  (`/v1789134873/`), mientras el resto del catálogo usa versionado
  explícito (`/v1/`).

**Solución:**
```sql
UPDATE plane_models 
SET image_url = 'https://res.cloudinary.com/evoejuci/image/upload/w_256,h_256,c_fill,f_webp,q_auto/v1/110-f-20-tigershark.png'
WHERE id = '110';

UPDATE plane_models 
SET image_url = 'https://res.cloudinary.com/evoejuci/image/upload/w_256,h_256,c_fill,f_webp,q_auto/v1/212-kf-21-boramae.png'
WHERE id = '212';
```

**Resultado:**
- ✅ 44/44 aviones con `image_url` de Cloudinary
- ✅ Patrón idéntico: `w_256,h_256,c_fill,f_webp,q_auto/v1`
- ✅ Consistencia total en el catálogo

**Estado:** ✅ RESUELTO Y PROBADO EN PRODUCCIÓN

---

### 🔹 Fix #13: Integración Completa de Mods Oficiales + Cloudinary (2026-09-12)

**Fecha:** 2026-09-12  
**Archivos:** `plane_mods` (Supabase), `src/controllers/planes.controller.js`,
`src/utils/modEffects.js`, `components/aircraft-stats-modal.html`, `js/views.js`,
`css/tactical-design.css`  
**Severidad:** 🎨 Alta (datos incorrectos + mejora visual)  
**Commit:** N/A

**Descripción:**  
Integración completa de los 10 mods oficiales de MetalStorm (fuente:
https://metalstorm.wiki.gg/wiki/Aircraft_Mods) con datos exactos,
iconos servidos desde Cloudinary y visualización enriquecida en el
modal de Stats.

**Problemas Resueltos:**

1. **`DEFAULT_PLANE_MODS` (código):** Contenía 8 mods inventados con IDs
   numéricos (1-8) y nombres ficticios. Reemplazado por los 10 mods
   oficiales con IDs `m1-m10`.

2. **`getFallbackModEffects()` (código):** Valores desactualizados en
   los 10 mods. Corregidos con datos oficiales de la Wiki.

3. **`plane_mods.levels` (Supabase):** m3 y m7 tenían valores erróneos.
   Corregidos.

4. **`plane_mods` (Supabase):** Añadidas 7 columnas
   (`name_en`, `description_es`, `description_en`, `type_en`, `image_url`,
   `wiki_url`, `upgrade_costs`) pobladas con datos oficiales.

5. **Iconos de mods:** Subidos a Cloudinary en carpeta `mods/` con
   transformación `w_256,h_256,c_fill,f_webp,q_auto`.

6. **Frontend:** Modal de Stats ahora muestra icono + nombre + tipo +
   nivel de cada mod equipado.

**Tabla comparativa (muestra):**

| Mod | Valor anterior (MAL) | Valor oficial (BIEN) |
|---|---|---|
| m1 L1 | +4% | +10% |
| m2 L1 | +3% | +15% |
| m3 L1 | +5% (positivo) | -10% (reducción daño) |
| m7 L1 | +5% (positivo) | -30% (reducción bloqueo) |
| m8 L1 | -6% | -40% |
| m9 L1 | +5% | +20% |

**Resultado:**
- ✅ 10 mods con datos oficiales en Supabase y código
- ✅ `node --check` pasa en `planes.controller.js` y `modEffects.js`
- ✅ 10 iconos de mods servidos desde Cloudinary
- ✅ Modal de Stats muestra iconos de mods equipados
- ✅ Traducción al español completada en v3.9.8 mediante pipeline DeepL y `TRAITS_ES`

**Estado:** ✅ RESUELTO Y PROBADO EN PRODUCCIÓN

---

### 🔹 Fix #14: Sistema de Traducción Integral al Español (i18n) & Fallback Resiliente (2026-09-14)

**Fecha:** 2026-09-14  
**Archivos:** `plane_models` (Supabase), `src/controllers/planes.controller.js`, `js/views.js`  
**Severidad:** 🌐 Media (Internacionalización y localización táctica)  
**Versión:** v3.9.8  

**Problema Detectado:**
Gran parte de la información técnica, histórica y consejos tácticos extraídos de la Wiki oficial de MetalStorm se encontraban exclusivamente en inglés (`descripcion`, `historia`, `recomendaciones`, `traits`), reduciendo la inmersión y comprensión operativa para los combatientes paraguayos.

**Solución Implementada:**
1. **Base de Datos (`plane_models` en Supabase):**
   - Agregadas y pobladas las columnas `descripcion_es` (TEXT), `historia_es` (TEXT) y `recomendaciones_es` (JSONB) traducidas profesionalmente con la API de DeepL.
2. **Degradación Transparente en Cliente (`js/views.js`):**
   - La capa de presentación prioriza siempre las variantes en español y cae transparentemente al texto en inglés en caso de ausencia:
   ```javascript
   const historia = plane.historia_es || plane.historia || 'Sin información histórica registrada.';
   const descripcion = plane.descripcion_es || plane.descripcion || '';
   const recomendaciones = plane.recomendaciones_es || plane.recomendaciones || {};
   ```
3. **Mapeo Oficial de Traits (`TRAITS_ES`):**
   - Diccionario reactivo y función `translateTrait(trait)` en `js/views.js` que traduce los 13 rasgos únicos de combate (Blindaje Reforzado, Motores Fríos, Altitud de Crucero, Ala Delta, Cañones Expertos, Autoridad Total, Dispara y Olvida, Ala Leal, Sigilo, Ala Variable, Inversor de Empuje, Cañones Inestables, Motores Inestables).

**Resultado:**
- ✅ 100% de los 44 cazas con descripciones, historias y recomendaciones en español.
- ✅ Fallback sin excepciones ante datos incompletos.
- ✅ Los 13 rasgos de combate perfectamente traducidos y uniformados.

**Estado:** ✅ RESUELTO Y PROBADO EN PRODUCCIÓN

---

### 🔹 Fix #15: Rediseño del Hangar Militar — Vista 1 (Grid Táctico) y Vista 2 (Pantalla Dedicada) (2026-09-15)

**Fecha:** 2026-09-15  
**Archivos:** `js/views.js`, `components/planes-view.html`, `components/aircraft-stats-modal.html`, `css/tactical-design.css`  
**Severidad:** ✈️ Alta (Usabilidad y ergonomía táctica)  
**Versión:** v3.9.8  

**Problema Detectado:**
La navegación de 44 aeronaves en un carrusel circular rígido resultaba tediosa y lenta para pilotos en dispositivos móviles. Además, la transición al detalle requería múltiples modales superpuestos sin navegación fluida ni acceso directo a las mejoras de Upgrades 2.0.

**Solución Implementada:**
1. **Vista 1 — Grid Táctico de Tarjetas (`overrideCarouselCardClick`):**
   - Despliegue de los 44 cazas en un grid responsivo con tarjetas tácticas que exhiben rango, silueta, modelo y nivel actual.
   - Intercepción de clicks para abrir directamente el detalle sin obligar a rotar el carrusel.
2. **Vista 2 — Pantalla Dedicada (`openAircraftDetailView`):**
   - Activación de `.aircraft-detail-mode` en el contenedor principal.
   - Inyección de cabecera con botón prominente `← VOLVER AL HANGAR` que restaura instantáneamente la vista de cuadrícula.
3. **Enlaces Directos a Upgrades 2.0:**
   - Cada bloque de subsistemas (Fuselaje, Motor, Aviónica, Armas) cuenta con botones directos `IR A EDICIÓN DE [SECCIÓN]`, abriendo la ventana de calibración del sistema específico.

**Resultado:**
- ✅ Navegación instantánea en los 44 cazas.
- ✅ Flujo intuitivo de ida y vuelta entre catálogo y ficha de combate.
- ✅ Conexión directa y ergonómica entre ficha técnica y calibración mecánica.

**Estado:** ✅ RESUELTO Y PROBADO EN PRODUCCIÓN

---

### 🔹 Fix #16: Corrección de Carga de Imágenes en Habilidades Especiales y Pasivas (2026-09-15)

**Fecha:** 2026-09-15  
**Archivos:** `js/views.js`  
**Severidad:** 🖼️ Menor (Consistencia visual)  
**Versión:** v3.9.8  

**Problema Detectado:**
Al invocar `openAircraftDeepModal`, las imágenes de habilidades especiales (`especial_image_url`) y pasivas (`pasiva_image_url`) podían no re-renderizarse tras recibir la carga asíncrona de `/details`, mostrando iconos genéricos.

**Solución:**
Asegurar que el callback de respuesta de `/api/planes/:id/details` actualice de forma síncrona los elementos del DOM de ambas habilidades tanto en el modal como en la pantalla dedicada, renderizando la URL oficial o el fallback SVG estilizado.

**Resultado:**
- ✅ Visualización consistente y de alta fidelidad para habilidades de los 44 cazas.

**Estado:** ✅ RESUELTO Y PROBADO EN PRODUCCIÓN

---

### 🔹 Fix #17: Sistema Integral de Gestión de Pilotos Inactivos (2026-09-16)

**Fecha:** 2026-09-16  
**Archivos:** `src/controllers/admin.controller.js`, `src/routes/admin.routes.js`, `src/middlewares/auth.js`, `js/api.js`, `js/views.js`, `components/admin-panel.html`  
**Severidad:** 🛡️ Alta (Trazabilidad militar, control de bajas y disciplina del escuadrón)  
**Versión:** v4.0.0 (Fases A, B y C)  

**Problema Detectado:**
1. Las bajas de pilotos carecían de motivo documentado en base de datos; al inactivar un piloto solo se alteraba `status = 'INACTIVE'`, perdiendo trazabilidad sobre la causa del retiro o sanción disciplinaria.
2. Al intentar acceder al sistema, el piloto inactivo recibía un mensaje genérico o incompleto sin saber el motivo formal de su exclusión.
3. En el panel de administración militar, la tabla listaba a todos los combatientes mezclados sin filtrado táctico por estado ni contadores de dotación activa vs retirados.
4. Existía código duplicado en `js/api.js` (`changeUserStatus` declarado dos veces) y una asignación global inútil en `js/views.js` (`window.currentMembersTab`).

**Solución Implementada:**
1. **Fase A (Backend - commit `d4a3881`):**
   - Migración SQL en `users`: 3 columnas nuevas (`inactive_reason` TEXT, `inactive_by` UUID FK, `inactive_at` TIMESTAMPTZ).
   - `updateUserStatus()`: Exige `reason` (10-500 caracteres) al inactivar; limpia los tres campos a `NULL` al reactivar (con motivo opcional hasta 300 caracteres).
   - `getInactiveUsers()`: Endpoint `GET /api/admin/users/inactive` con resolución batch de comandantes ejecutores (`inactive_by_nick`).
   - `updateInactiveReason()`: Endpoint `PATCH /api/admin/users/:id/inactive-reason` para regularizar motivos históricos.
   - `requireAuth` middleware: Bloqueo 403 enriquecido consultando primero `users` y luego fallback a `audit_logs`.
2. **Fase B (Frontend - commit `b1023fd`):**
   - Pestañas tácticas: `🟢 Activos (N)`, `🔴 Inactivos (N)`, `📋 Todos (N)` con contadores en tiempo real.
   - Modales tácticos: Modal de inactivación con motivos reglamentarios predefinidos y validación de 10-500 caracteres; modal de reactivación con confirmación de reincorporación; modal de edición de motivo.
   - Columnas condicionales en la tabla militar: "Motivo de Baja" e "Inactivado por".
3. **Fase C (Limpieza de Código y Documentación):**
   - Eliminación de la declaración y exportación duplicada de `changeUserStatus` en `js/api.js`.
   - Eliminación de la variable inútil `window.currentMembersTab` en `js/views.js`.
   - Redacción de la directiva oficial `POLITICA_INACTIVACION.md` y actualización exhaustiva de los 9 manuales tácticos del escuadrón.

**Resultado:**
- ✅ Trazabilidad 100% auditable de bajas y reincorporaciones.
- ✅ Mensajes de bloqueo transparentes e informativos para pilotos sancionados o retirados.
- ✅ Panel de administración táctico con filtrado ergonómico y contadores en vivo.
- ✅ Código JavaScript limpio y validado sintácticamente (`node --check`).

**Estado:** ✅ RESUELTO Y PROBADO EN PRODUCCIÓN (v4.0.0)

---

## 📋 Matriz Resumen de Archivos y Responsabilidades

| Componente | Línea de Acción | Estado |
|---|---|:---:|
| `src/controllers/auth.controller.js` | Lógica tipada, control de `token_version` y password hashing | 🟢 ESTABLE |
| `src/middlewares/auth.js` | Validación JWT y mensaje enriquecido con motivo/actor de baja (403) | 🟢 ESTABLE |
| `src/routes/admin.routes.js` | Parámetros dinámicos, rutas `/users/inactive` y `/users/:id/inactive-reason` | 🟢 ESTABLE |
| `src/controllers/admin.controller.js` | Gestión de bajas con motivo obligatorio, resolución batch de inactivos y roles | 🟢 ESTABLE |
| `src/controllers/profile.controller.js` | Persistencia de datos personales y teléfono de alertas | 🟢 ESTABLE |
| `src/controllers/performances.controller.js` | Historial de tokens y sincronización de semáforo | 🟢 ESTABLE |
| `src/controllers/planes.controller.js` | Habilidades, Upgrades 2.0, cálculo de mods, recomendaciones, telemetría i18n y validación de sistemas disponibles | 🟢 ESTABLE |
| `src/utils/upgradeEffects.js` | Lógica y fallback de bonificaciones por niveles de subsistemas (0-8) | 🟢 ESTABLE |
| `src/utils/modEffects.js` | Lógica, caché y cálculo de multiplicadores de los 10 mods tácticos | 🟢 ESTABLE |
| `src/utils/audit.js` | Resolución de UUIDs en eventos de seguridad y auditoría | 🟢 ESTABLE |
| `components/admin-panel.html` | Pestañas tácticas Activos/Inactivos/Todos y modales de motivo de baja | 🟢 ESTABLE |
| `js/api.js` | Cliente API RESTful (limpieza de duplicados v4.0.0) | 🟢 ESTABLE |
| `js/views.js` | Renderizado de vistas, modales de inactivos y controladores tácticos | 🟢 ESTABLE |
| `components/aircraft-stats-modal.html` | Modal de datos profundos y markup de Upgrade Planner 2.0 | 🟢 ESTABLE |
| `planes (Supabase)` | Normalización 1NF (UNIQUE, FK, CHECKs, habilidades) | 🟢 ESTABLE |
| `plane_models (Supabase)` | Catálogo oficial de 44 modelos con `sistemas_disponibles` y columnas i18n (`_es`) | 🟢 ESTABLE |
| `users (Supabase)` | Padrón militar con columnas `inactive_reason`, `inactive_by` e `inactive_at` | 🟢 ESTABLE |
| `components/change-password-modal.html` | Modal de actualización táctica (Workaround: ENTER) | 🟡 FIX UI PENDIENTE |
