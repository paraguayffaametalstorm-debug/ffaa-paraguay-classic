#!/usr/bin/env node
/**
 * ============================================================================
 * PARAGUAY-FFAA | METALSTORM
 * fix-405-api-reference.cjs
 * ============================================================================
 * Alinea docs/architecture/API_REFERENCE.md con los 137 endpoints reales
 * detectados en src/routes/ (ver docs/audit/api-endpoints-real.md).
 *
 * Uso:
 *   node scripts/fix-405-api-reference.cjs           # DRY-RUN
 *   node scripts/fix-405-api-reference.cjs --apply   # aplica cambios
 *
 * Patrón del proyecto: marcadores + idempotencia + backup + verificación.
 *
 * Autor: Comando C4ISR
 * Fecha: 2026-10-11
 * ============================================================================
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const TARGET = path.join(ROOT, 'docs', 'architecture', 'API_REFERENCE.md');
const BACKUP = TARGET + '.bak-fix405';
const APPLY = process.argv.includes('--apply');

// ─────────────────────────────────────────────────────────────
// 0. Validaciones previas
// ─────────────────────────────────────────────────────────────
if (!fs.existsSync(TARGET)) {
  console.error(`❌ No existe: ${TARGET}`);
  process.exit(1);
}

let content = fs.readFileSync(TARGET, 'utf8');
const original = content;
const changes = [];

function replace(oldText, newText, label, idempotenceCheck) {
  // idempotenceCheck: string opcional que si ya está presente → skip
  if (idempotenceCheck && content.includes(idempotenceCheck)) {
    changes.push(`⏭️  ${label} (ya aplicado)`);
    return;
  }
  if (!content.includes(oldText)) {
    changes.push(`❌ ${label}: marcador no encontrado`);
    return;
  }
  content = content.replace(oldText, newText);
  changes.push(`✅ ${label}`);
}

// ─────────────────────────────────────────────────────────────
// BLOQUE A — Versiones
// ─────────────────────────────────────────────────────────────

// A.1 — Header
replace(
  'para la versión v4.5.8 del núcleo táctico.',
  'para la versión v4.8.15 del núcleo táctico.',
  'Header: v4.5.8 → v4.8.15',
  'para la versión v4.8.15 del núcleo táctico.'
);

// A.2 — Footer
replace(
  '*Versión: v4.5.9 · Actualizado: 2026-09-23*',
  '*Versión: v4.8.15 · Actualizado: 2026-10-11*',
  'Footer: v4.5.9 → v4.8.15',
  '*Versión: v4.8.15 · Actualizado: 2026-10-11*'
);

// ─────────────────────────────────────────────────────────────
// BLOQUE B — Banner de estado de sincronización
// ─────────────────────────────────────────────────────────────
// Enfoque robusto: split por líneas, insertar banner en la línea correcta.

const bannerSentinel = '📌 Estado de sincronización de este documento';

if (content.includes(bannerSentinel)) {
  changes.push('⏭️  Banner de estado de sincronización (ya aplicado)');
} else {
  const lines = content.split(/\r?\n/);
  const headerIdx = lines.findIndex(l =>
    l.includes('Documentación exhaustiva de endpoints') &&
    l.includes('núcleo táctico')
  );

  if (headerIdx === -1) {
    changes.push('❌ Banner: header no encontrado (split por líneas)');
  } else {
    const bannerLines = [
      '',
      '> **📌 Estado de sincronización de este documento**',
      '>',
      '> | Aspecto | Estado | Última verificación |',
      '> |---|---|---|',
      '> | Lista de endpoints | ✅ Sincronizada | FIX-405 (2026-10-11) |',
      '> | Métodos y paths | ✅ Sincronizados | FIX-405 (2026-10-11) |',
      '> | Niveles de acceso (RBAC) | ✅ Sincronizados | FIX-405 (2026-10-11) |',
      '> | Query params | ⚠️ Parcialmente verificados | FIX-405 (2026-10-11) |',
      '> | Request/response schemas | ⚠️ Requieren verificación contra Zod | Pendiente |',
      '> | Ejemplos de payload | ⚠️ Pueden estar desactualizados | Pendiente |',
      '>',
      '> **Fuente de verdad de endpoints:** `docs/audit/api-endpoints-real.md` (generado por `scripts/audit-api-endpoints.cjs`).',
      '>',
      '> **Próxima revisión:** al cerrar el Sprint 8.',
      ''
    ];
    // Insertar después del header
    lines.splice(headerIdx + 1, 0, ...bannerLines);
    content = lines.join('\n');

    if (content.includes(bannerSentinel)) {
      changes.push('✅ Banner de estado de sincronización agregado (verificado)');
    } else {
      changes.push('❌ Banner: se intentó agregar pero no quedó en el contenido');
    }
  }
}

// ─────────────────────────────────────────────────────────────
// BLOQUE C — Filas nuevas en la Tabla Rápida
// ─────────────────────────────────────────────────────────────
// Convención: agregar cada fila DESPUÉS de la última fila del mismo módulo.
// Idempotencia: verificar que el path no esté ya en la tabla.

function addRow(afterText, newRow, label, idempotencePath) {
  if (idempotencePath && content.includes(idempotencePath)) {
    changes.push(`⏭️  ${label} (ya aplicado)`);
    return;
  }
  if (!content.includes(afterText)) {
    changes.push(`❌ ${label}: fila ancla no encontrada`);
    return;
  }
  content = content.replace(afterText, afterText + '\n' + newRow);
  changes.push(`✅ ${label}`);
}

// --- Events v2: agregar mine, admin/participations, open después de submission-window ---
const eventsV2Anchor = '| **Events v2** | `/api/events-v2/bm/:eventId/submission-window` | `GET` | Autenticado | Info de ventana de carga BM (ADR-008) |';
addRow(eventsV2Anchor,
  '| **Events v2** | `/api/events-v2/mine` | `GET` | Autenticado | Historial de participaciones del piloto (BL-028) |',
  'Tabla: /events-v2/mine',
  '`/api/events-v2/mine` | `GET` | Autenticado');
addRow('| **Events v2** | `/api/events-v2/mine` | `GET` | Autenticado | Historial de participaciones del piloto (BL-028) |',
  '| **Events v2** | `/api/events-v2/admin/participations` | `GET` | `ADMIN` / `OWNER` | Vista global de participaciones (FIX-310) |',
  'Tabla: /events-v2/admin/participations',
  '`/api/events-v2/admin/participations` | `GET` | `ADMIN`');
addRow('| **Events v2** | `/api/events-v2/admin/participations` | `GET` | `ADMIN` / `OWNER` | Vista global de participaciones (FIX-310) |',
  '| **Events v2** | `/api/events-v2/open` | `GET` | Autenticado | Alias de `/active` (compatibilidad) |',
  'Tabla: /events-v2/open',
  '`/api/events-v2/open` | `GET`');

// --- Events v2 BM: agregar active, purchase, stats, PUT después de submission-window ---
const eventsV2BmAnchor = '| **Events v2** | `/api/events-v2/open` | `GET` | Autenticado | Alias de `/active` (compatibilidad) |';
addRow(eventsV2BmAnchor,
  '| **Events v2 BM** | `/api/events-v2/bm/active` | `GET` | Autenticado | Evento BM activo |',
  'Tabla: /events-v2/bm/active',
  '`/api/events-v2/bm/active` | `GET`');
addRow('| **Events v2 BM** | `/api/events-v2/bm/active` | `GET` | Autenticado | Evento BM activo |',
  '| **Events v2 BM** | `/api/events-v2/bm/:eventId` | `PUT` | `ADMIN` / `OWNER` | Editar evento BM |',
  'Tabla: /events-v2/bm/:eventId PUT',
  '`/api/events-v2/bm/:eventId` | `PUT` | `ADMIN`');
addRow('| **Events v2 BM** | `/api/events-v2/bm/:eventId` | `PUT` | `ADMIN` / `OWNER` | Editar evento BM |',
  '| **Events v2 BM** | `/api/events-v2/bm/:eventId/purchase` | `POST` | Autenticado | Adquirir caza con descuento BM |',
  'Tabla: /events-v2/bm/:eventId/purchase',
  '`/api/events-v2/bm/:eventId/purchase` | `POST`');
addRow('| **Events v2 BM** | `/api/events-v2/bm/:eventId/purchase` | `POST` | Autenticado | Adquirir caza con descuento BM |',
  '| **Events v2 BM** | `/api/events-v2/bm/:eventId/stats` | `GET` | `ADMIN` / `OWNER` | KPIs consolidados del evento BM |',
  'Tabla: /events-v2/bm/:eventId/stats',
  '`/api/events-v2/bm/:eventId/stats` | `GET`');

// --- Performances: agregar my-history ---
const perfAnchor = '| **Performances**| `/api/performances/export` | `GET` | `ADMIN` / `OWNER` | Descargar reporte CSV sanitizado |';
addRow(perfAnchor,
  '| **Performances**| `/api/performances/my-history` | `GET` | Autenticado | Alias de `/history` (compatibilidad) |',
  'Tabla: /performances/my-history',
  '`/api/performances/my-history` | `GET`');

// --- Planes: agregar recommendation, recommended-build, systems, export ---
const planesAnchor = '| **Planes** | `/api/planes/:id/system` | `PUT` | Autenticado | **Upgrades 2.0**: Mejorar Fuselaje/Motor/Aviónica/Armas |';
addRow(planesAnchor,
  '| **Planes** | `/api/planes/:id/systems` | `PUT` | Autenticado | Actualización múltiple de sistemas (batch) |',
  'Tabla: /planes/:id/systems',
  '`/api/planes/:id/systems` | `PUT` | Autenticado');
addRow('| **Planes** | `/api/planes/:id/systems` | `PUT` | Autenticado | Actualización múltiple de sistemas (batch) |',
  '| **Planes** | `/api/planes/:id/recommendation` | `GET` | Autenticado | IA de recomendación táctica (playstyle) |',
  'Tabla: /planes/:id/recommendation',
  '`/api/planes/:id/recommendation` | `GET`');
addRow('| **Planes** | `/api/planes/:id/recommendation` | `GET` | Autenticado | IA de recomendación táctica (playstyle) |',
  '| **Planes** | `/api/planes/:id/recommended-build` | `GET` | Autenticado | Build recomendada (alias) |',
  'Tabla: /planes/:id/recommended-build',
  '`/api/planes/:id/recommended-build` | `GET`');
addRow('| **Planes** | `/api/planes/:id/recommended-build` | `GET` | Autenticado | Build recomendada (alias) |',
  '| **Planes** | `/api/planes/export` | `GET` | Autenticado | Export CSV de hangar personal |',
  'Tabla: /planes/export',
  '`/api/planes/export` | `GET`');

// --- Plane-models: agregar POST /:id/restore ---
const pmAnchor = '| **Catalog** | `/api/plane-models/:id/restore` | `POST` | `ADMIN` / `OWNER` | Reactivar modelo en el catálogo |';
addRow(pmAnchor,
  '| **Catalog** | `/api/plane-models/:id/restore` | `PATCH` | `ADMIN` / `OWNER` | Alias PATCH de restore |',
  'Tabla: plane-models PATCH restore',
  '`/api/plane-models/:id/restore` | `PATCH` | `ADMIN`');

// --- Normativas: agregar GET / (listar) ---
const normAnchor = '| **Normativas** | `/api/normativas/:id/download` | `GET` | Autenticado | Descargar archivo de normativa oficial |';
addRow(normAnchor,
  '| **Normativas** | `/api/normativas/` | `GET` | Autenticado | Listar reglamentos y circulares |',
  'Tabla: normativas GET /',
  '`/api/normativas/` | `GET` | Autenticado');

// --- Profile: agregar /me y /change-password ---
const profileAnchor = '| **Profile** | `/api/profile` o `/me` | `PUT` | Autenticado | Actualizar Callsign, teléfono o bio. Acepta cambio de nick (v4.5.0). |';
addRow(profileAnchor,
  '| **Profile** | `/api/profile/change-password` | `POST` | Autenticado | Cambio de contraseña desde perfil |',
  'Tabla: profile/change-password',
  '`/api/profile/change-password` | `POST`');

// --- Settings: ya usa ` o /me`, verificar que exista la fila PUT ---
// (la fila ya existe en la tabla, no hace falta agregar)

// --- Admin: agregar scheduler, results, y filas de members/users alternativos ---
const adminAnchor = '| **Admin** | `/api/admin/users/:id/reset-password`| `POST`| `ADMIN` / `OWNER` | Generar clave aleatoria `MS-XXXX-XXXX` |';
addRow(adminAnchor,
  '| **Admin** | `/api/admin/scheduler/run` | `POST` | `OWNER` | Forzar tick del scheduler (HALL-072) |',
  'Tabla: admin/scheduler/run',
  '`/api/admin/scheduler/run` | `POST` | `OWNER`');
addRow('| **Admin** | `/api/admin/scheduler/run` | `POST` | `OWNER` | Forzar tick del scheduler (HALL-072) |',
  '| **Admin** | `/api/admin/scheduler/status` | `GET` | `ADMIN` / `OWNER` | Estado del scheduler |',
  'Tabla: admin/scheduler/status',
  '`/api/admin/scheduler/status` | `GET`');
addRow('| **Admin** | `/api/admin/scheduler/status` | `GET` | `ADMIN` / `OWNER` | Estado del scheduler |',
  '| **Admin** | `/api/admin/results/:eventId/export` | `GET` | `ADMIN` / `OWNER` | Payload de reporte visual del evento (v4.6.0) |',
  'Tabla: admin/results/:eventId/export',
  '`/api/admin/results/:eventId/export` | `GET`');
addRow('| **Admin** | `/api/admin/results/:eventId/export` | `GET` | `ADMIN` / `OWNER` | Payload de reporte visual del evento (v4.6.0) |',
  '| **Admin** | `/api/admin/members` o `/users` | `GET` | `ADMIN` / `OWNER` | Listado completo de miembros (alias) |',
  'Tabla: admin members/users GET',
  '`/api/admin/members` o `/users` | `GET`');
addRow('| **Admin** | `/api/admin/members` o `/users` | `GET` | `ADMIN` / `OWNER` | Listado completo de miembros (alias) |',
  '| **Admin** | `/api/admin/members` o `/users` | `POST` | `ADMIN` / `OWNER` | Alta de nuevo piloto (alias) |',
  'Tabla: admin members/users POST',
  '`/api/admin/members` o `/users` | `POST`');
addRow('| **Admin** | `/api/admin/members` o `/users` | `POST` | `ADMIN` / `OWNER` | Alta de nuevo piloto (alias) |',
  '| **Admin** | `/api/admin/members/:id/status` o `/users/:id/status` | `PUT`/`PATCH` | `ADMIN` / `OWNER` | Cambiar status (alias) |',
  'Tabla: admin members/users status',
  '`/api/admin/members/:id/status`');
addRow('| **Admin** | `/api/admin/members/:id/status` o `/users/:id/status` | `PUT`/`PATCH` | `ADMIN` / `OWNER` | Cambiar status (alias) |',
  '| **Admin** | `/api/admin/members/:id/role` o `/users/:id/role` | `PUT`/`PATCH` | `ADMIN` / `OWNER` | Cambiar rol (alias) |',
  'Tabla: admin members/users role',
  '`/api/admin/members/:id/role`');
addRow('| **Admin** | `/api/admin/members/:id/role` o `/users/:id/role` | `PUT`/`PATCH` | `ADMIN` / `OWNER` | Cambiar rol (alias) |',
  '| **Admin** | `/api/admin/members/active` | `GET` | `ADMIN` / `OWNER` | Listar solo pilotos activos |',
  'Tabla: admin members/active',
  '`/api/admin/members/active`');
addRow('| **Admin** | `/api/admin/members/active` | `GET` | `ADMIN` / `OWNER` | Listar solo pilotos activos |',
  '| **Admin** | `/api/admin/events` | `GET` | `ADMIN` / `OWNER` | Listar eventos (tabla legacy) |',
  'Tabla: admin events GET',
  '`/api/admin/events` | `GET` | `ADMIN`');
addRow('| **Admin** | `/api/admin/events` | `GET` | `ADMIN` / `OWNER` | Listar eventos (tabla legacy) |',
  '| **Admin** | `/api/admin/all-performances` | `GET` | `ADMIN` / `OWNER` | ⚠️ LEGACY — usar `/api/events-v2/admin/participations` |',
  'Tabla: admin all-performances',
  '`/api/admin/all-performances` | `GET`');
addRow('| **Admin** | `/api/admin/all-performances` | `GET` | `ADMIN` / `OWNER` | ⚠️ LEGACY — usar `/api/events-v2/admin/participations` |',
  '| **Admin** | `/api/admin/performances` | `POST` | `ADMIN` / `OWNER` | ⚠️ LEGACY — usar `/api/events-v2/:id/participations` |',
  'Tabla: admin performances POST',
  '`/api/admin/performances` | `POST`');
addRow('| **Admin** | `/api/admin/performances` | `POST` | `ADMIN` / `OWNER` | ⚠️ LEGACY — usar `/api/events-v2/:id/participations` |',
  '| **Admin** | `/api/admin/export-performances` | `GET` | `ADMIN` / `OWNER` | ⚠️ LEGACY — export CSV |',
  'Tabla: admin export-performances',
  '`/api/admin/export-performances` | `GET`');
addRow('| **Admin** | `/api/admin/export-performances` | `GET` | `ADMIN` / `OWNER` | ⚠️ LEGACY — export CSV |',
  '| **Admin** | `/api/admin/events/activate-bm` | `POST` | `ADMIN` / `OWNER` | ⚠️ LEGACY — usar `POST /api/events-v2` (type=BM) |',
  'Tabla: admin events/activate-bm',
  '`/api/admin/events/activate-bm` | `POST`');
addRow('| **Admin** | `/api/admin/events/activate-bm` | `POST` | `ADMIN` / `OWNER` | ⚠️ LEGACY — usar `POST /api/events-v2` (type=BM) |',
  '| **Admin** | `/api/admin/mentorships` | `GET` | `ADMIN` / `OWNER` | Listar mentorías (ADR-010) |',
  'Tabla: admin mentorships GET',
  '`/api/admin/mentorships` | `GET`');
addRow('| **Admin** | `/api/admin/mentorships` | `GET` | `ADMIN` / `OWNER` | Listar mentorías (ADR-010) |',
  '| **Admin** | `/api/admin/mentorships` | `POST` | `ADMIN` / `OWNER` | Crear mentoría manualmente |',
  'Tabla: admin mentorships POST',
  '`/api/admin/mentorships` | `POST`');
addRow('| **Admin** | `/api/admin/mentorships` | `POST` | `ADMIN` / `OWNER` | Crear mentoría manualmente |',
  '| **Admin** | `/api/admin/mentorships/:id` | `PATCH` | `ADMIN` / `OWNER` | Cerrar/reasignar mentoría |',
  'Tabla: admin mentorships PATCH',
  '`/api/admin/mentorships/:id` | `PATCH`');

// --- Owner: agregar backup list/download/delete y error-logs ---
const ownerAnchor = '| **Owner** | `/api/owner/backup/run` | `POST` | `OWNER` | Ejecución de volcado manual de datos |';
addRow(ownerAnchor,
  '| **Owner** | `/api/owner/backup/list` | `GET` | `OWNER` | Listar backups persistidos (máx 30) |',
  'Tabla: owner/backup/list',
  '`/api/owner/backup/list` | `GET`');
addRow('| **Owner** | `/api/owner/backup/list` | `GET` | `OWNER` | Listar backups persistidos (máx 30) |',
  '| **Owner** | `/api/owner/backup/download/:id` | `GET` | `OWNER` | Descargar JSON con verificación de hash SHA-256 |',
  'Tabla: owner/backup/download',
  '`/api/owner/backup/download/:id` | `GET`');
addRow('| **Owner** | `/api/owner/backup/download/:id` | `GET` | `OWNER` | Descargar JSON con verificación de hash SHA-256 |',
  '| **Owner** | `/api/owner/backup/:id` | `DELETE` | `OWNER` | Eliminar backup manualmente |',
  'Tabla: owner/backup DELETE',
  '`/api/owner/backup/:id` | `DELETE`');
addRow('| **Owner** | `/api/owner/backup/:id` | `DELETE` | `OWNER` | Eliminar backup manualmente |',
  '| **Owner** | `/api/owner/error-logs` | `GET` | `OWNER` | Consultar `error_logs` del sistema |',
  'Tabla: owner/error-logs',
  '`/api/owner/error-logs` | `GET`');

// ─────────────────────────────────────────────────────────────
// BLOQUE D — Secciones detalladas nuevas
// ─────────────────────────────────────────────────────────────

// D.1 — Sección admin/participations + mine (antes de Deprecación)
const sectionAdminPart = `#### \`GET /api/events-v2/mine\`

Historial de participaciones del piloto autenticado (BL-028, v4.7.3).

- **Acceso:** Autenticado (\`requireAuth\`).
- **Query Params:** \`?limit=N&type=SQUADRON&status=CLOSED\` (todos opcionales).
- **Payload:** retrocompatible con el legacy \`/api/performances/my-history\`.
- **Response Exitosa (200 OK):**
  \`\`\`json
  {
    "success": true,
    "participations": [
      {
        "id": "uuid",
        "event_id": "uuid",
        "event_name": "Squadron Event 2026-W38",
        "event_type": "SQUADRON",
        "event_status": "CLOSED",
        "tokens": 185,
        "days_connected": 6,
        "computed_points": 185,
        "perf_status": "VERDE",
        "created_at": "2026-09-21T14:30:00Z"
      }
    ],
    "total": 1,
    "filters": { "limit": 50, "type": null, "status": null }
  }
  \`\`\`

#### \`GET /api/events-v2/admin/participations\`

Vista global de participaciones (ADMIN/OWNER). Reemplaza el legacy \`GET /api/admin/all-performances\` (FIX-310).

- **Acceso:** \`ADMIN\` / \`OWNER\`.
- **Query Params:**
  | Param | Tipo | Default | Descripción |
  |---|---|---|---|
  | \`event_id\` | UUID | (todos) | Filtrar por evento |
  | \`status\` | \`PENDING\` \\| \`VALIDATED\` \\| \`REJECTED\` | (todos) | Filtrar por status |
  | \`limit\` | int | 200 | Máx 500 |
  | \`offset\` | int | 0 | Paginación |
- **Fuente:** Vista SQL \`v_admin_participations\` (ver \`sql/042_admin_participations_view.sql\`).
- **⚠️ FIX-310-bis:** El \`nick\` y \`role\` se resuelven desde \`users\` (no desde \`event_participations\`) para evitar el bug de participaciones corruptas.
- **Response Exitosa (200 OK):**
  \`\`\`json
  {
    "success": true,
    "participations": [
      {
        "id": "uuid",
        "event_id": "uuid",
        "user_id": "uuid",
        "nick": "AIRJUMP",
        "role": "MIEMBRO",
        "data": { "tokens": 185, "days_connected": 6 },
        "computed_points": 185,
        "status": "PENDING",
        "created_at": "2026-10-05T14:30:00Z"
      }
    ],
    "total": 722,
    "limit": 200,
    "offset": 0
  }
  \`\`\`

`;

const insertionMarker = '### 3.5.4 Deprecación de Endpoints Legacy';
if (!content.includes('#### `GET /api/events-v2/mine`')) {
  if (content.includes(insertionMarker)) {
    content = content.replace(insertionMarker, sectionAdminPart + insertionMarker);
    changes.push('✅ Sección nueva: mine + admin/participations documentadas');
  } else {
    changes.push('❌ Sección admin/participations: marcador no encontrado');
  }
} else {
  changes.push('⏭️  Sección admin/participations (ya aplicada)');
}

// D.2 — Sección Scheduler (bajo §5 Admin)
const sectionScheduler = `### Scheduler Manual (HALL-072)

Endpoints para forzar y consultar el scheduler de eventos SQ cuando Render duerme la app (cold start).

#### \`POST /api/admin/scheduler/run\`

Fuerza un tick del scheduler a demanda.

- **Acceso:** \`OWNER\` exclusivamente.
- **Response Exitosa (200 OK):**
  \`\`\`json
  {
    "success": true,
    "message": "Tick del scheduler ejecutado",
    "scheduler_status": { "status": "OK", "last_tick_at": "..." }
  }
  \`\`\`

#### \`GET /api/admin/scheduler/status\`

Consulta el estado del scheduler sin ejecutarlo.

- **Acceso:** \`ADMIN\` / \`OWNER\`.
- **Response Exitosa (200 OK):**
  \`\`\`json
  {
    "success": true,
    "scheduler_status": {
      "status": "OK",
      "last_tick_at": "2026-10-11T20:00:00Z",
      "last_tick_ago_seconds": 26
    }
  }
  \`\`\`

**Referencia:** \`docs/incidentes/HALL-072-scheduler-render.md\`.

`;

const schedulerAnchor = '### `POST /api/admin/users/:userId/reset-password`';
if (!content.includes('### Scheduler Manual (HALL-072)')) {
  if (content.includes(schedulerAnchor)) {
    content = content.replace(schedulerAnchor, sectionScheduler + schedulerAnchor);
    changes.push('✅ Sección nueva: Scheduler Manual (HALL-072)');
  } else {
    changes.push('❌ Sección Scheduler: marcador no encontrado');
  }
} else {
  changes.push('⏭️  Sección Scheduler (ya aplicada)');
}

// ─────────────────────────────────────────────────────────────
// REPORTE FINAL
// ─────────────────────────────────────────────────────────────
console.log('\n📋 REPORTE FIX-405\n');
changes.forEach(c => console.log('   ' + c));

const errores = changes.filter(c => c.startsWith('❌'));
if (errores.length > 0) {
  console.log(`\n❌ ${errores.length} errores detectados. NO se aplican cambios.\n`);
  process.exit(1);
}

if (content === original) {
  console.log('\n✅ No hay cambios pendientes. Documento ya alineado.\n');
  process.exit(0);
}

if (!APPLY) {
  console.log('\n⚠️  DRY-RUN: no se aplicaron cambios.');
  console.log('   Para aplicar: node scripts/fix-405-api-reference.cjs --apply\n');
  process.exit(0);
}

// Aplicar
fs.copyFileSync(TARGET, BACKUP);
fs.writeFileSync(TARGET, content, 'utf8');
console.log(`\n✅ Cambios aplicados.`);
console.log(`   Backup: ${path.relative(ROOT, BACKUP)}`);
console.log(`   Modificado: ${path.relative(ROOT, TARGET)}\n`);