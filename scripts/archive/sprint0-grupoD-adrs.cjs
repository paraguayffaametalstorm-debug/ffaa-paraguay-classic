#!/usr/bin/env node
/**
 * sprint0-grupoD-adrs.cjs
 * Grupo D — ADRs (FIX-012, FIX-013) + FIX-209 nuevo (Sprint 2).
 * Formato: MADR 4.0 (https://adr.github.io/madr/)
 * Crea: TEMPLATE + ADR-001..005
 * Modifica: docs/adr/README.md, PLAN_TRABAJO.md
 * Fecha: 2026-09-20 | NO COMMITEA. Backups con timestamp.
 */

const fs = require('fs');
const path = require('path');

if (!fs.existsSync(path.join(process.cwd(), 'package.json'))) {
  console.error('❌ No estás en la raíz del repo (falta package.json).');
  process.exit(1);
}

// ---- Helpers ----
function log(m) { console.log(m); }
function timestamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}
function readFileSafe(p) { return fs.readFileSync(p, 'utf8'); }
function writeFileSafe(p, c) { fs.writeFileSync(p, c, 'utf8'); }

const backedUp = new Set();
function backup(p) {
  if (backedUp.has(p)) return;
  backedUp.add(p);
  const ts = timestamp();
  const ext = path.extname(p);
  const base = p.slice(0, -ext.length);
  const dest = `${base}.bak-${ts}${ext}`;
  fs.copyFileSync(p, dest);
  log(`    📦 Backup: ${dest}`);
}

const cambios = [];

/**
 * Crea un archivo SOLO si no existe. Si existe, avisa y salta.
 */
function crearArchivo(archivo, contenido, etiqueta) {
  log(`\n📄 ${archivo}`);
  log(`    Acción: ${etiqueta}`);
  if (fs.existsSync(archivo)) {
    log(`    ⚠️  Ya existe. NO se sobreescribe. Saltando.`);
    return false;
  }
  // Crear directorio si no existe
  const dir = path.dirname(archivo);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    log(`    📁 Directorio creado: ${dir}`);
  }
  writeFileSafe(archivo, contenido);
  log(`    ✅ Archivo creado (${contenido.length} bytes).`);
  cambios.push({ archivo, etiqueta });
  return true;
}

/**
 * Reemplaza una única ocurrencia literal. Falla si 0 o >1.
 */
function reemplazarUnico(archivo, buscar, reemplazar, etiqueta) {
  log(`\n📄 ${archivo}`);
  log(`    Cambio: ${etiqueta}`);
  if (!fs.existsSync(archivo)) {
    log(`    ⚠️  Archivo no existe. Saltando.`);
    return false;
  }
  let c = readFileSafe(archivo);
  const n = c.split(buscar).length - 1;
  if (n === 0) {
    log(`    ⚠️  Patrón NO encontrado.`);
    return false;
  }
  if (n > 1) {
    log(`    ⚠️  ${n} ocurrencias. Esperaba 1. ABORTANDO.`);
    return false;
  }
  c = c.split(buscar).join(reemplazar);
  backup(archivo);
  writeFileSafe(archivo, c);
  log(`    ✅ Reemplazado (1 ocurrencia).`);
  cambios.push({ archivo, etiqueta });
  return true;
}

function marcarCompletado(contenido, fixId, descripcion, commit) {
  const m = contenido.match(/## 8\. ✅ COMPLETADOS[\s\S]*?(?=\n## )/);
  if (!m) return contenido;
  const seccion = m[0];
  if (seccion.includes(`| **${fixId}** |`)) return contenido;
  const fila = `| **${fixId}** | ${descripcion} | 2026-09-20 | \`${commit}\` |`;
  const tablaFin = seccion.lastIndexOf('|');
  const lineaFin = seccion.indexOf('\n', tablaFin);
  const nueva = seccion.slice(0, lineaFin) + '\n' + fila + seccion.slice(lineaFin);
  return contenido.replace(seccion, nueva);
}

// ============================================================
// MAIN
// ============================================================
log('\n=== Sprint 0 — Grupo D: ADRs (MADR 4.0) ===\n');

// ---------- 1. TEMPLATE.md ----------
const templateMd = `# ADR-XXX: [Título corto y descriptivo de la decisión]

- **Fecha:** YYYY-MM-DD
- **Estado:** Proposed | Accepted | Rejected | Deprecated | Superseded by ADR-YYY
- **Decisores:** [OWNER] + [Comando C4ISR] + [otros]
- **Relacionado con:** [ADR-YYY, HALL-ZZZ, FIX-XXX, PR #NNN]

## Estado

[Descripción breve del estado actual. Ej: "Accepted (vigente desde YYYY-MM-DD, validado por OWNER)"]

## Contexto y problema

[2-5 párrafos describiendo la situación que motiva la decisión. Incluir:
- ¿Qué problema hay?
- ¿Por qué importa?
- ¿Qué restricciones existen (técnicas, de negocio, regulatorias)?]

## Factores de decisión

- [Factor 1: ej "Seguridad"]
- [Factor 2: ej "Mantenibilidad"]
- [Factor 3: ej "Performance"]
- [Factor 4: ej "Complejidad operativa"]

## Opciones consideradas

1. **[Opción A]**
   - **Pros:** ...
   - **Contras:** ...

2. **[Opción B]**
   - **Pros:** ...
   - **Contras:** ...

3. **[Opción C]**
   - **Pros:** ...
   - **Contras:** ...

## Decisión

**Elegimos [Opción X]** porque [justificación principal en 2-4 líneas].

[Detalles adicionales de cómo se implementa la decisión, 1-3 párrafos.]

## Consecuencias

### Positivas

- ...

### Negativas

- ...

### Neutrales

- ...

## Implementación

[Referencias concretas a archivos y líneas:
- \\\`src/path/file.js:NNN\\\` — descripción
- \\\`sql/NNN_*.sql\\\` — descripción
- Commit \\\`abc1234\\\` — mensaje]

## Pendiente de verificar

[Si hay aspectos sin evidencia, listarlos acá. Si todo está verificado, escribir "Nada pendiente."]

## Fuentes y trazabilidad

| Afirmación | Fuente |
|---|---|
| [Afirmación 1] | [\\\`archivo:línea\\\` o \\\`CHANGELOG.md:NNN\\\`] |
| [Afirmación 2] | [...] |

## Referencias

- [Enlaces externos si aplica]
- [\\\`docs/adr/README.md\\\`](README.md)

---

> ADR redactado según formato **MADR 4.0** (https://adr.github.io/madr/).
> Documento vivo — actualizar cuando cambie el estado o se agregue información relevante.
`;

crearArchivo(
  path.join('docs', 'adr', 'TEMPLATE.md'),
  templateMd,
  'Template MADR 4.0 reutilizable'
);

// ---------- 2. ADR-001 ----------
const adr001 = `# ADR-001: No usar fallback de JWT_SECRET

- **Fecha:** 2026-09-16
- **Estado:** Accepted
- **Decisores:** PJPIROVANI (OWNER) + Comando C4ISR
- **Relacionado con:** HALL-001

## Estado

Accepted (vigente desde 2026-09-16, validado por OWNER).

## Contexto y problema

El servidor backend utiliza JSON Web Tokens (JWT) firmados con una clave secreta (\`JWT_SECRET\`) para autenticar todas las peticiones a la API. Originalmente el código incluía un **fallback hardcodeado** (\`'ffaa_pry_metalstorm_jwt_super_secret_key_2026'\`) que se usaba cuando la variable de entorno \`JWT_SECRET\` no estaba definida.

Este fallback representaba un **riesgo crítico de seguridad**:

1. La clave era **pública** (visible en el repositorio).
2. Cualquier persona con acceso al código fuente podía **forjar tokens JWT válidos** y suplantar a cualquier usuario, incluido el OWNER.
3. La ausencia de \`JWT_SECRET\` en producción **no se detectaba al arrancar** — el servidor levantaba silenciosamente con la clave insegura.

El hallazgo fue registrado como **HALL-001** durante la auditoría de seguridad de la Fase 2.

## Factores de decisión

- **Seguridad:** prioridad máxima. Cero tolerancia a claves hardcodeadas.
- **Fail-fast:** el servidor debe **abortar el arranque** si la configuración está incompleta, en lugar de operar en estado inseguro.
- **Experiencia de desarrollo:** el modo \`development\` no debe requerir configurar \`JWT_SECRET\` manualmente.
- **Compatibilidad con Fly.io:** el secreto debe poder inyectarse vía \`fly secrets set\`.

## Opciones consideradas

1. **Mantener el fallback hardcodeado (status quo)**
   - **Pros:** cero fricción al desarrollar en local.
   - **Contras:** riesgo crítico de seguridad en producción. Inaceptable.

2. **Eliminar el fallback y abortar si falta en cualquier entorno**
   - **Pros:** máxima seguridad.
   - **Contras:** rompe la experiencia de desarrollo local (cada dev tendría que generar un secreto antes de arrancar).

3. **Eliminar el fallback en producción, mantener uno distinto para desarrollo** *(elegida)*
   - **Pros:** seguridad en producción + cero fricción en local.
   - **Contras:** requiere que el dev-only-secret sea claramente inseguro y no se use nunca en prod.

## Decisión

**Elegimos la Opción 3.** El servidor:

1. **Aborta el arranque** si \`NODE_ENV === 'production'\` y \`JWT_SECRET\` no está definido.
2. En \`development\`, si \`JWT_SECRET\` no está definido, usa un valor **explícitamente inseguro** (\`'dev-only-insecure-secret-change-me'\`) que no puede confundirse con un secreto real.
3. En Fly.io, el secreto se inyecta vía \`fly secrets set JWT_SECRET="$(openssl rand -base64 48)"\`.

El fallback hardcodeado \`'ffaa_pry_metalstorm_jwt_super_secret_key_2026'\` fue **eliminado por completo**.

## Consecuencias

### Positivas

- Elimina la posibilidad de forjar tokens con una clave conocida.
- El servidor **falla rápido** (fail-fast) si falta configuración crítica en producción.
- El secreto de producción se genera con \`openssl rand -base64 48\` (384 bits de entropía).
- Auditoría de seguridad pasa sin hallazgos CRÍTICOS relacionados con JWT.

### Negativas

- Un deploy sin \`JWT_SECRET\` configurado **no arranca**. Esto es deseado, pero requiere atención en el checklist de deploy.

### Neutrales

- El modo \`development\` sigue siendo "plug-and-play" (sin configuración obligatoria).

## Implementación

- \`src/config/env.js:5\` — comentario \`// HALL-001: Prevenir arranque sin JWT_SECRET en producción.\`
- \`src/config/env.js:9-10\` — \`if (process.env.NODE_ENV === 'production' && !JWT_SECRET) { console.error('FATAL...'); process.exit(1); }\`
- \`src/config/env.js:18\` — \`JWT_SECRET: JWT_SECRET || 'dev-only-insecure-secret-change-me'\`
- \`src/middlewares/auth.js:22\` — \`jwt.verify(token, ENV.JWT_SECRET)\`
- \`CHANGELOG.md:791-797\` — sección \`HALL-001 (definitivo) → Eliminación del fallback de JWT_SECRET\`
- \`CHANGELOG.md:928-937\` — configuración del secreto en Fly.io
- Commit \`e02d2a3\` — HALL-036/037: backups persistentes + sanitización PII (contexto de la auditoría)

## Pendiente de verificar

Nada pendiente. Evidencia directa en código y CHANGELOG.

## Fuentes y trazabilidad

| Afirmación | Fuente |
|---|---|
| Fallback hardcodeado existía | \`CHANGELOG.md:795\` |
| Fallback eliminado definitivamente | \`CHANGELOG.md:791-797\` |
| Servidor aborta si \`NODE_ENV=production\` sin JWT_SECRET | \`src/config/env.js:9-10\` |
| Polyfill solo en dev | \`src/config/env.js:18\` |
| Secreto de producción vía \`fly secrets\` | \`CHANGELOG.md:928-937\` |
| Verificación en código de firma JWT | \`src/middlewares/auth.js:22\` |

## Referencias

- \`docs/adr/README.md\`
- Hallazgo **HALL-001** en \`CHANGELOG.md\`

---

> ADR redactado según formato **MADR 4.0** (https://adr.github.io/madr/).
> Recuperado con asistencia IA a partir de evidencia verificable el 2026-09-20.
> Sin información inventada.
`;

crearArchivo(
  path.join('docs', 'adr', 'ADR-001-no-fallback-jwt-secret.md'),
  adr001,
  'ADR-001: No usar fallback de JWT_SECRET'
);

// ---------- 3. ADR-002 ----------
const adr002 = `# ADR-002: Política público/privado en endpoints

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

- \`GET /health\` (probe Fly.io)
- \`GET /api/health\` (telemetría JSON)
- \`POST /api/auth/login\`
- \`POST /api/auth/register\`
- \`POST /api/auth/reset-password\`
- \`POST /api/auth/change-password\` (con token temporal del flujo)
- \`GET /api/auth/google/*\` (OAuth)
- \`GET /link-account\` (HTML)
- \`GET /reset-password\` (HTML)
- Assets estáticos (\`/\`, \`/css/*\`, \`/js/*\`, \`/components/*\`)

### Endpoints privados (requieren \`requireAuth\`)

- Todos los demás bajo \`/api/*\` y \`/auth/*\`.

### Endpoints con control de rol (\`requireRole\`)

- \`/api/admin/*\` → \`ADMIN\` o \`OWNER\`
- \`/api/owner/*\` → \`OWNER\`
- \`/api/events-v2/*\`, \`/api/events-v2/bm/*\` → \`ADMIN\` o \`OWNER\` para escritura
- \`/api/plane-models/*\` → \`ADMIN\` o \`OWNER\` para escritura
- \`/api/normativas/*\` (POST/PUT/DELETE) → \`ADMIN\` o \`OWNER\`
- \`/api/performances/pilots\`, \`/api/performances/all\`, \`/api/performances/export\` → \`ADMIN\` o \`OWNER\`

### Middleware

- **\`requireAuth\`** — verifica JWT, valida \`token_version\`, bloquea cuentas INACTIVE, adjunta \`req.user\`.
- **\`requireRole(...roles)\`** — verifica que \`req.user.role\` esté en la lista permitida.
- **\`authenticate\`** — alias de \`requireAuth\` (legacy, mantenido por compatibilidad).

## Consecuencias

### Positivas

- **Deny by default:** endpoints nuevos son privados salvo declaración explícita.
- **Consistencia:** todos los archivos de rutas importan \`requireAuth\` del mismo módulo.
- **Auditoría simplificada:** es trivial verificar que un endpoint tenga middleware.
- **Rol adicional en escritura:** los endpoints sensibles requieren además \`requireRole\`.

### Negativas

- Declarar cada endpoint público requiere atención (no hay "default público").

### Neutrales

- El alias \`authenticate\` se mantiene para no romper rutas existentes.

## Implementación

### Archivos de rutas y sus middlewares

| Archivo | Middleware importado |
|---|---|
| \`src/routes/admin.routes.js:15\` | \`requireAuth, requireRole\` |
| \`src/routes/admin.users.routes.js:4\` | \`authenticate, requireRole\` |
| \`src/routes/auth.routes.js:14\` | \`requireAuth, requireRole\` |
| \`src/routes/dashboard.routes.js:2\` | \`requireAuth\` |
| \`src/routes/events-v2.routes.js:30\` | \`requireAuth, requireRole\` |
| \`src/routes/events-v2-bm.routes.js:56\` | \`requireAuth, requireRole\` |
| \`src/routes/events.routes.js:7\` | \`requireAuth\` |
| \`src/routes/normativas.routes.js:3\` | \`requireAuth, requireRole\` |
| \`src/routes/owner.routes.js:11\` | \`requireAuth, requireRole\` |
| \`src/routes/performances.routes.js:10\` | \`requireAuth, requireRole\` |
| \`src/routes/plane-models.routes.js:18\` | \`requireAuth, requireRole\` |
| \`src/routes/planes.routes.js:16\` | \`requireAuth\` |
| \`src/routes/presence.routes.js:2\` | \`requireAuth\` |
| \`src/routes/profile.routes.js:4\` | \`requireAuth\` |
| \`src/routes/settings.routes.js:3\` | \`requireAuth\` |

### Middleware \`requireAuth\` (src/middlewares/auth.js)

- Líneas 9-157: valida JWT, \`token_version\`, estado de cuenta.
- Línea 169: \`export const authenticate = requireAuth;\` (alias).
- Líneas 175-200: \`requireRole\`.

## Pendiente de verificar

Nada pendiente. Evidencia directa en código.

## Fuentes y trazabilidad

| Afirmación | Fuente |
|---|---|
| Auditoría HALL-036 define política | \`CHANGELOG.md:609\` |
| Lista de endpoints privados | \`CHANGELOG.md:634\` |
| Middlewares por archivo de rutas | \`findstr\` sobre \`src/routes/*.js\` |
| \`authenticate\` es alias de \`requireAuth\` | \`src/middlewares/auth.js:169\` |
| \`requireRole\` implementado | \`src/middlewares/auth.js:175-200\` |

## Referencias

- \`docs/adr/README.md\`
- \`API_REFERENCE.md\` — sección de permisos por endpoint

---

> ADR redactado según formato **MADR 4.0** (https://adr.github.io/madr/).
> Recuperado con asistencia IA a partir de evidencia verificable el 2026-09-20.
> Sin información inventada.
`;

crearArchivo(
  path.join('docs', 'adr', 'ADR-002-politica-endpoints-publico-privado.md'),
  adr002,
  'ADR-002: Política público/privado en endpoints'
);

// ---------- 4. ADR-003 ----------
const adr003 = `# ADR-003: Backups en Supabase

- **Fecha:** 2026-09-17
- **Estado:** Accepted
- **Decisores:** PJPIROVANI (OWNER) + Comando C4ISR
- **Relacionado con:** HALL-036, HALL-037

## Estado

Accepted (vigente desde 2026-09-17).

## Contexto y problema

El panel del OWNER (\`/api/owner\`) incluye la capacidad de generar **respaldos manuales** de las tablas críticas (\`users\`, \`performances\`, \`events\`). Originalmente, la implementación generaba el backup y lo devolvía como descarga JSON, **sin persistirlo en ningún lado**.

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

3. **Guardar backups en una tabla \`backups\` de Supabase** *(elegida)*
   - **Pros:** usa la infraestructura existente. Persistencia garantizada. RLS protege los datos. Índices para consultas rápidas.
   - **Contras:** agrega carga a la base de datos (mitigado por retención de 30 backups).

## Decisión

**Elegimos la Opción 3.** Se crea una tabla \`backups\` en Supabase con:

- **Columnas:**
  - \`id\` (UUID, PK)
  - \`file_name\` (TEXT)
  - \`content\` (JSONB) — el backup sanitizado
  - \`hash\` (TEXT) — SHA-256 del contenido, para verificación de integridad
  - \`created_at\` (TIMESTAMPTZ)
  - \`created_by\` (UUID, FK a \`users.id\`)

- **RLS:** habilitado con política \`no_public_access\` — solo \`service_role\` puede leer/escribir.
- **Índices:** en \`created_at DESC\` y \`created_by\`.
- **Retención:** máximo **30 backups**. Al crear uno nuevo, se **auto-prunea** el más antiguo.
- **Sanitización:** se eliminan por completo los campos \`password_hash\`, \`reset_token\`, \`token_version\` y otros sensibles antes de persistir el backup.
- **Endpoints:**
  - \`POST /api/owner/backup/run\` — genera + persiste.
  - \`GET /api/owner/backup/list\` — lista backups del OWNER.
  - \`GET /api/owner/backup/download/:id\` — descarga con verificación de hash.
  - \`DELETE /api/owner/backup/:id\` — eliminación manual.

## Consecuencias

### Positivas

- **Historial completo:** el OWNER puede acceder a cualquier backup de los últimos 30.
- **Verificación de integridad:** el hash SHA-256 detecta alteraciones.
- **Sin fuga de PII:** sanitización obligatoria antes de persistir.
- **Auto-gestión:** retención automática evita crecimiento indefinido.
- **Auditoría:** cada operación registra \`BACKUP_CREATED\`, \`BACKUP_DOWNLOADED\`, \`BACKUP_DELETED\` en \`audit_logs\`.

### Negativas

- Ocupa espacio en Supabase (mitigado por retención de 30).
- \`download\` debe verificar el hash en cada descarga (leve costo de CPU).

### Neutrales

- El hash se calcula con \`crypto.createHash('sha256')\`.

## Implementación

- \`sql/027_backups_table.sql\` — DDL de la tabla + RLS + índices.
- \`src/controllers/owner.controller.js:8\` — \`const BACKUP_VERSION = '4.1.0';\`
- \`src/controllers/owner.controller.js:10\` — campos sensibles eliminados del backup.
- \`src/controllers/owner.controller.js:95, 104, 135, 219\` — consultas a tabla \`backups\`.
- \`src/controllers/owner.controller.js:241-340\` — \`runManualBackup\` (crea + persiste + auto-prune).
- \`src/controllers/owner.controller.js:349-410\` — \`downloadBackup\` (verifica hash SHA-256).
- \`src/controllers/owner.controller.js:410-455\` — \`deleteBackup\`.
- \`src/routes/owner.routes.js:25-28\` — 4 endpoints de backup.
- Commit \`e02d2a3\` — HALL-036/037: backups persistentes + sanitización PII.

## Pendiente de verificar

Nada pendiente. Evidencia directa en código y migración SQL.

## Fuentes y trazabilidad

| Afirmación | Fuente |
|---|---|
| Auditoría HALL-036/037 menciona backups | \`CHANGELOG.md:609\` |
| Sanitización PII en backups | \`CHANGELOG.md:622\` |
| 4 endpoints definidos | \`CHANGELOG.md:638-664\` |
| Tabla \`backups\` en Supabase | \`sql/027_backups_table.sql\` |
| Retención de 30 backups | \`CHANGELOG.md:649\` |
| Hash SHA-256 para integridad | \`CHANGELOG.md:651\` |
| Commit \`e02d2a3\` | \`CHANGELOG.md:701\` |
| RLS \`no_public_access\` | \`CHANGELOG.md:648\` |

## Referencias

- \`docs/adr/README.md\`
- \`DEPLOYMENT_STATE.md\` — listado de tablas

---

> ADR redactado según formato **MADR 4.0** (https://adr.github.io/madr/).
> Recuperado con asistencia IA a partir de evidencia verificable el 2026-09-20.
> Sin información inventada.
`;

crearArchivo(
  path.join('docs', 'adr', 'ADR-003-backups-en-supabase.md'),
  adr003,
  'ADR-003: Backups en Supabase'
);

// ---------- 5. ADR-004 ----------
const adr004 = `# ADR-004: Cuota de ADMIN de 3 a 5

- **Fecha:** 2026-09-16
- **Estado:** Accepted
- **Decisores:** PJPIROVANI (OWNER) + Comando C4ISR
- **Relacionado con:** HALL-053, HALL-054

## Estado

Accepted (vigente desde 2026-09-16, validado por OWNER).

## Contexto y problema

El sistema aplica **cuotas institucionales estrictas** por rango militar para reflejar la estructura real del escuadrón:

- **1 OWNER** (Comandante en Jefe).
- **N ADMIN** (Oficiales de Operaciones).
- **8 VETERANO** (Pilotos Experimentados).

Históricamente, la cuota de ADMIN estaba fijada en **3**. Durante la auditoría de Fase 2 se detectaron dos problemas:

1. **HALL-053:** la cuota real de ADMIN era inconsistente entre documentación y realidad. El código, la doc pública y las decisiones del OWNER no coincidían.
2. **HALL-054:** los límites de roles estaban **hardcodeados en múltiples ubicaciones** de \`admin.controller.js\` sin constante centralizada, lo que dificultaba su mantenimiento.

Adicionalmente, el OWNER determinó que **el límite de 3 era arbitrario** y no reflejaba la estructura real del escuadrón — la realidad operativa demanda **5 oficiales ADMIN**.

## Factores de decisión

- **Alineación con la realidad:** la cuota debe reflejar la estructura real del escuadrón.
- **Mantenibilidad:** los límites deben estar en una **constante centralizada** para evitar inconsistencias futuras.
- **Auditoría:** los cambios de cuota deben generar eventos auditables.
- **Errores claros:** cuando se supera la cuota, el sistema debe devolver un error específico (\`ROLE_LIMIT_REACHED\`).

## Opciones consideradas

1. **Mantener cuota en 3 y documentar la realidad por separado**
   - **Pros:** cero cambios de código.
   - **Contras:** la doc seguiría siendo falsa. La estructura real del escuadrón no se refleja.

2. **Subir cuota a 5 sin centralizar la constante**
   - **Pros:** solución rápida.
   - **Contras:** perpetúa HALL-054. El próximo cambio tendría que tocar múltiples lugares.

3. **Subir cuota a 5 + centralizar en constante \`ROLE_LIMITS\`** *(elegida)*
   - **Pros:** resuelve HALL-053 y HALL-054 simultáneamente.
   - **Contras:** requiere refactor de \`admin.controller.js\`.

## Decisión

**Elegimos la Opción 3.**

1. **Cuota de ADMIN sube de 3 a 5.**
2. Se crea la constante centralizada **\`ROLE_LIMITS\`** en \`admin.controller.js\`:

   \`\`\`js
   const ROLE_LIMITS = {
     OWNER: 1,
     ADMIN: 5,
     VETERANO: 8
   };
   \`\`\`

3. Los errores al superar la cuota devuelven \`code: 'ROLE_LIMIT_REACHED'\` con **mensaje dinámico** que indica el rol y la cuota.

4. Se actualiza la documentación pública (\`README.md\`, \`API_REFERENCE.md\`, \`ARCHITECTURE.md\`) y \`docs/rediseno_eventos/CONTEXTO_PROYECTO.md\`.

## Consecuencias

### Positivas

- La cuota refleja la realidad operativa del escuadrón.
- Los límites viven en **un solo lugar** (\`ROLE_LIMITS\`).
- Cualquier cambio futuro es **1 línea + redeploy**.
- Los mensajes de error son **dinámicos** (indican el rol y la cuota actual).
- Auditoría: el cambio de cuota está registrado en el historial de versiones.

### Negativas

- Requirió actualizar la documentación pública (12 archivos entre código y docs).
- Los tests existentes que asumían \`ADMIN = 3\` debieron actualizarse.

### Neutrales

- La cuota de VETERANO (8) y OWNER (1) no cambian.

## Implementación

- \`src/controllers/admin.controller.js:242, 254\` — \`code: 'ROLE_LIMIT_REACHED'\`.
- \`src/controllers/admin.controller.js\` — constante \`ROLE_LIMITS\` (usada en ascensos).
- \`CHANGELOG.md:440\` — contexto del cambio (auditoría Fase 2).
- \`CHANGELOG.md:475\` — \`Constante ROLE_LIMITS + cuota ADMIN 5 + mensajes dinámicos\`.
- \`CHANGELOG.md:906\` — \`El límite de 3 era arbitrario y no reflejaba la estructura real del escuadrón.\`
- \`CHANGELOG.md:916\` — HALL-053.
- \`CHANGELOG.md:917\` — HALL-054.
- \`ARCHITECTURE.md:464\` — \`ADMIN: Máximo 5 (actualizado desde 3 por decisión del OWNER, 2026-09-16).\`
- **Sprint 0 Grupo B** (commits \`fbf4852\` + \`0b92605\`) — sincronización de cuota en docs: \`README.md\`, \`API_REFERENCE.md\`, \`CONTEXTO_PROYECTO.md\`.

## Pendiente de verificar

Nada pendiente. Evidencia directa en código y CHANGELOG.

## Fuentes y trazabilidad

| Afirmación | Fuente |
|---|---|
| Auditoría Fase 2 resuelve inconsistencias | \`CHANGELOG.md:440\` |
| Constante \`ROLE_LIMITS\` + cuota ADMIN 5 | \`CHANGELOG.md:475\` |
| El límite 3 era arbitrario | \`CHANGELOG.md:906\` |
| HALL-053 (cuota inconsistente) | \`CHANGELOG.md:916\` |
| HALL-054 (límites hardcodeados) | \`CHANGELOG.md:917\` |
| Código devuelve \`ROLE_LIMIT_REACHED\` | \`src/controllers/admin.controller.js:242, 254\` |
| Cuota actual documentada en ARCHITECTURE | \`ARCHITECTURE.md:464\` |

## Referencias

- \`docs/adr/README.md\`
- \`ARCHITECTURE.md\` — sección jerarquía militar
- \`PLAN_TRABAJO.md\` — FIX-004, FIX-009, FIX-011, FIX-018 (Sprint 0 Grupo B)

---

> ADR redactado según formato **MADR 4.0** (https://adr.github.io/madr/).
> Recuperado con asistencia IA a partir de evidencia verificable el 2026-09-20.
> Sin información inventada.
`;

crearArchivo(
  path.join('docs', 'adr', 'ADR-004-cuota-admin.md'),
  adr004,
  'ADR-004: Cuota de ADMIN de 3 a 5'
);

// ---------- 6. ADR-005 ----------
const adr005 = `# ADR-005: Migración de presence a Supabase

- **Fecha:** 2026-09-17
- **Estado:** Proposed
- **Decisores:** PJPIROVANI (OWNER) + Comando C4ISR
- **Relacionado con:** FIX-209 (Sprint 2)

## Estado

**Proposed** — decisión propuesta, pendiente de implementación.
Requiere diseño de esquema de tabla + refactor del router.

## Contexto y problema

El sistema expone 3 endpoints bajo \`/api/presence/*\` para monitorear pilotos en línea:

- \`POST /api/presence/online\` — marca al usuario como conectado.
- \`POST /api/presence/offline\` — marca al usuario como desconectado.
- \`GET /api/presence/active\` — devuelve el conteo de usuarios conectados.

**La implementación actual usa un \`Set\` en memoria del proceso:**

\`\`\`js
const onlineUsers = new Set();

router.post('/online', requireAuth, (req, res) => {
  if (req.user?.user_id) {
    onlineUsers.add(req.user.user_id);
  }
  res.json({ success: true, count: onlineUsers.size });
});
\`\`\`

Este diseño **no escala** por tres razones:

1. **Multi-réplica:** Fly.io corre **2 máquinas** del servidor. Cada una tiene su propio \`Set\`. El conteo de \`/active\` es **incorrecto** (cada máquina ve solo a sus usuarios).
2. **Volatilidad:** un redeploy borra el \`Set\`. Todos los usuarios aparecen offline hasta que vuelvan a llamar \`/online\`.
3. **Sin trazabilidad:** no queda registro histórico de conexiones/desconexiones.

## Factores de decisión

- **Multi-réplica:** la solución debe compartir estado entre las 2 máquinas de Fly.io.
- **Persistencia:** el estado debe sobrevivir a un redeploy.
- **Simplicidad:** evitar introducir infraestructura adicional (Redis, etc.).
- **Performance:** las consultas de presence deben ser rápidas (< 50ms).
- **Auditoría:** idealmente registrar histórico de conexiones.

## Opciones consideradas

1. **Mantener el \`Set\` en memoria (status quo)**
   - **Pros:** cero cambios.
   - **Contras:** incorrecto en multi-réplica, volátil, sin histórico.

2. **Migrar a Redis (Upstash, etc.)**
   - **Pros:** solución estándar para presence en memoria distribuida.
   - **Contras:** introduce nueva dependencia. Costo extra. Overkill para el volumen del escuadrón (~30-50 pilotos).

3. **Migrar a una tabla \`presence\` en Supabase** *(elegida)*
   - **Pros:** usa la infraestructura existente. Persistencia garantizada. Sin dependencias nuevas.
   - **Contras:** introduce carga a la DB (mitiguable con TTL + cleanup periódico).

## Decisión

**Elegimos la Opción 3** — migrar el estado a una tabla \`presence\` en Supabase.

**Esquema propuesto (pendiente de diseño final):**

\`\`\`sql
CREATE TABLE presence (
  user_id INTEGER PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
  last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'ONLINE' CHECK (status IN ('ONLINE', 'IDLE', 'OFFLINE'))
);
CREATE INDEX idx_presence_last_seen ON presence(last_seen DESC);
\`\`\`

**Refactor propuesto:**

- \`POST /api/presence/online\` → UPSERT en \`presence\` con \`last_seen = NOW()\`, \`status = 'ONLINE'\`.
- \`POST /api/presence/offline\` → UPDATE a \`status = 'OFFLINE'\`.
- \`GET /api/presence/active\` → \`SELECT COUNT(*) FROM presence WHERE status = 'ONLINE' AND last_seen > NOW() - INTERVAL '5 minutes'\`.
- **Cleanup:** cron job que elimina registros con \`last_seen < NOW() - INTERVAL '1 hour'\` (o los marca OFFLINE).

**Pendiente para aceptación:**

- Definir TTL exacto (¿5 min? ¿10 min?).
- Definir si se necesita tabla de histórico separada (\`presence_log\`).
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
- **Latencia** mayor que un \`Set\` en memoria (~20-50ms por operación).
- Requiere **mecanismo de cleanup** (cron o trigger).

### Neutrales (mientras está Proposed)

- El sistema actual **funciona** para una sola réplica.
- El bug es **silencioso** — no lanza errores, solo devuelve conteos incorrectos.

## Implementación

**Estado actual (código):**

- \`src/routes/presence.routes.js:1-25\` — router con \`Set\` en memoria.
- \`server.js:129\` — \`app.use('/api/presence', presenceRoutes);\`

**Pendiente (una vez aceptado):**

- \`sql/0NN_presence_table.sql\` — crear tabla (no existe aún).
- \`src/controllers/presence.controller.js\` — crear controlador (no existe aún).
- \`src/routes/presence.routes.js\` — refactor para usar Supabase.
- \`server.js\` — agregar cron de cleanup.
- Tests de integración.

## Pendiente de verificar

- ¿El frontend actual llama a \`/online\` y \`/offline\` en qué momentos (login/logout, focus/blur)?
- ¿Hay otros consumidores del endpoint \`/active\` (dashboards, etc.)?
- ¿Cuántas réplicas corre Fly.io en producción actualmente?

## Fuentes y trazabilidad

| Afirmación | Fuente |
|---|---|
| Endpoints \`/api/presence/*\` existen | \`CHANGELOG.md:1325\` |
| Implementación usa \`Set\` en memoria | \`src/routes/presence.routes.js:5\` |
| Router montado en \`server.js\` | \`server.js:129\` |
| No existe tabla \`presence\` en SQL | \`dir sql\\*presence*\` → vacío |
| No existe controlador \`presence.controller.js\` | \`findstr presence src/controllers\` → vacío |
| Fly.io corre múltiples réplicas | \`CHANGELOG.md:484\` — "2 máquinas" |

## Referencias

- \`docs/adr/README.md\`
- \`PLAN_TRABAJO.md\` — FIX-209 (Sprint 2)

---

> ADR redactado según formato **MADR 4.0** (https://adr.github.io/madr/).
> Estado **Proposed** — pendiente de aceptación e implementación.
> Documento vivo — actualizar al implementar.
`;

crearArchivo(
  path.join('docs', 'adr', 'ADR-005-presence-en-supabase.md'),
  adr005,
  'ADR-005: Migración de presence a Supabase (Proposed)'
);

// ---------- 7. Modificar docs/adr/README.md ----------
log('\n📄 docs/adr/README.md');

let readmeAdr = readFileSafe(path.join('docs', 'adr', 'README.md'));

// 7a. Cambiar ADR-008 de Proposed a Accepted
const adr008LineaVieja = '| ADR-008 | Ventanas de Carga Desacopladas del Ciclo de Evento | 2026-09-20 | Proposed |';
const adr008LineaNueva = '| ADR-008 | Ventanas de Carga Desacopladas del Ciclo de Evento | 2026-09-20 | Accepted |';
if (readmeAdr.includes(adr008LineaVieja)) {
  readmeAdr = readmeAdr.replace(adr008LineaVieja, adr008LineaNueva);
  log('    ✅ ADR-008: Proposed → Accepted');
} else {
  log('    ⚠️  No se encontró la línea de ADR-008. REVISAR MANUALMENTE.');
}

// 7b. Agregar sección "Cómo crear un nuevo ADR" antes de "## Próximos ADRs Planificados"
const anclaProximos = '## Próximos ADRs Planificados';
const seccionComoCrear = `## Cómo crear un nuevo ADR

1. Copiar \`TEMPLATE.md\` a \`ADR-XXX-slug-corto.md\` (donde XXX es el siguiente número secuencial).
2. Completar todas las secciones del template (**MADR 4.0**).
3. Agregar la fila correspondiente a la tabla de **Listado** en este documento.
4. Si el ADR cambia el estado de otro, actualizar el estado del original a \`Superseded by ADR-XXX\`.
5. Commit con mensaje \`docs(adr-XXX): <descripción breve>\`.
6. Si el ADR está \`Proposed\`, mantenerlo así hasta que sea validado por el OWNER.

**Reglas:**

- Un ADR es **inmutable** una vez aceptado. Los cambios se hacen creando un ADR nuevo que lo supersede.
- Los ADRs se numeran secuencialmente sin saltos.
- Los ADRs deben citar **fuentes verificables** (archivo:línea, CHANGELOG, commits).

---

`;
if (readmeAdr.includes('## Cómo crear un nuevo ADR')) {
  log('    ℹ️  Sección "Cómo crear un nuevo ADR" ya presente. No se agrega.');
} else if (readmeAdr.includes(anclaProximos)) {
  readmeAdr = readmeAdr.replace(anclaProximos, seccionComoCrear + anclaProximos);
  log('    ✅ Sección "Cómo crear un nuevo ADR" agregada.');
} else {
  log('    ⚠️  No se encontró ancla "## Próximos ADRs Planificados". REVISAR MANUALMENTE.');
}

// 7c. Actualizar "Próximos ADRs Planificados"
const proximosViejo = '| → | (Sin ADRs planificados al 2026-09-20) | → |';
const proximosNuevo = '| ADR-005 | Migración de presence a Supabase | Pendiente de aceptación (ver FIX-209 en Sprint 2) |';
if (readmeAdr.includes(proximosViejo)) {
  readmeAdr = readmeAdr.replace(proximosViejo, proximosNuevo);
  log('    ✅ "Próximos ADRs Planificados": ADR-005 marcado como pendiente.');
} else if (readmeAdr.includes('ADR-005') && readmeAdr.includes('Pendiente de aceptación')) {
  log('    ℹ️  "Próximos ADRs Planificados" ya actualizado.');
} else {
  log('    ⚠️  No se encontró la fila "(Sin ADRs planificados...)". REVISAR MANUALMENTE.');
}

backup(path.join('docs', 'adr', 'README.md'));
writeFileSafe(path.join('docs', 'adr', 'README.md'), readmeAdr);
log('    💾 docs/adr/README.md actualizado.');
cambios.push({ archivo: 'docs/adr/README.md', etiqueta: 'FIX-012 + sección crear + próximos' });

// ---------- 8. Modificar PLAN_TRABAJO.md ----------
log('\n📄 PLAN_TRABAJO.md');

let plan = readFileSafe('PLAN_TRABAJO.md');

// 8a. Marcar FIX-012, FIX-013 en COMPLETADOS
plan = marcarCompletado(plan, 'FIX-012', '`docs/adr/README.md` ADR-008 marcado como Accepted', 'TBD');
plan = marcarCompletado(plan, 'FIX-013', '5 ADRs creados (001-005) en formato MADR 4.0 + TEMPLATE', 'TBD');

// 8b. Métrica 9/10 → 10/10
const metricaVieja = '| Docs alineados con versión real | 9/10 |';
const metricaNueva = '| Docs alineados con versión real | 10/10 |';
if (plan.includes(metricaVieja)) {
  plan = plan.replace(metricaVieja, metricaNueva);
  log('    ✅ Métrica Docs alineados: 9/10 → 10/10');
}

// 8c. Agregar FIX-209 a Sprint 2
const anclaSprint2 = '- [ ] **FIX-208** — _(pendiente confirmación FIX-108)_';
const fix209Linea = '\n- [ ] **FIX-209** — **Presence en memoria no escala** (ADR-005). El router usa un `Set` local que no se comparte entre las 2 réplicas de Fly.io y se pierde en redeploys. Requiere migrar a tabla `presence` en Supabase.';
if (plan.includes(anclaSprint2) && !plan.includes('FIX-209')) {
  plan = plan.replace(anclaSprint2, anclaSprint2 + fix209Linea);
  log('    ✅ FIX-209 agregado a Sprint 2.');
} else if (plan.includes('FIX-209')) {
  log('    ℹ️  FIX-209 ya presente en PLAN_TRABAJO.md.');
} else {
  log('    ⚠️  No se encontró ancla FIX-208 en Sprint 2. FIX-209 NO agregado.');
}

backup('PLAN_TRABAJO.md');
writeFileSafe('PLAN_TRABAJO.md', plan);
log('    💾 PLAN_TRABAJO.md actualizado.');
cambios.push({ archivo: 'PLAN_TRABAJO.md', etiqueta: 'FIX-012/013 + FIX-209 + métrica' });

// ============================================================
// RESUMEN
// ============================================================
log('\n=== Resumen ===');
for (const ch of cambios) log(`  • ${ch.archivo} — ${ch.etiqueta}`);

log('\n📌 Próximos pasos:');
log('   1. Verificar archivos creados: dir docs\\adr');
log('   2. Ver el diff: git --no-pager diff docs/adr/README.md PLAN_TRABAJO.md');
log('   3. Ver archivos nuevos: dir docs\\adr\\*.md');
log('   4. Si OK, staging + commit:');
log('        git add docs/adr/ PLAN_TRABAJO.md');
log('        git commit -m "docs(sprint-0-grupoD): ADRs 001-005 en formato MADR 4.0 + fix estado ADR-008"');
log('\n🚫 Este script NO commitea.');