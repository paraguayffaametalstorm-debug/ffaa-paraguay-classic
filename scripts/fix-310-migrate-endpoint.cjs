#!/usr/bin/env node
/**
 * fix-310-migrate-endpoint.cjs
 * -----------------------------------------------------------------------------
 * FIX-310: Migrar loadAllPerformances() del endpoint legacy roto hacia
 * el nuevo endpoint v2 /api/events-v2/admin/participations.
 *
 * Contexto (diagnóstico corregido):
 *   - El endpoint /api/admin/all-performances EXISTE (admin.routes.js:60).
 *   - Pero lee de la tabla LEGACY 'performances' (congelada desde F4.2.2-G).
 *   - El frontend sigue llamándolo → ve datos obsoletos.
 *
 * Cambios aplicados:
 *   1. events-v2.controller.js → agregar getAllParticipationsAdmin()
 *   2. events-v2.routes.js     → registrar ruta GET /admin/participations
 *                                 ANTES de /:id (crítico).
 *   3. js/views.js             → migrar loadAllPerformances() al nuevo endpoint.
 *   4. docs/planning/BACKLOG.md → corregir el diagnóstico del FIX-310.
 *
 * Reglas (aprendidas de los scripts previos):
 *   - EOL mixto: usar regex \r?\n SIEMPRE.
 *   - Backup timestamped con Set interno (idempotente).
 *   - Aborto TOTAL si algún ítem falla. No hay escritura parcial.
 *   - NO commitear desde el script. El OWNER revisa el diff.
 * -----------------------------------------------------------------------------
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Configuración
// ---------------------------------------------------------------------------

const DRY_RUN = process.argv.includes('--dry-run');
const ROOT    = path.resolve(__dirname, '..');
const BACKUP_SET = new Set();

const FILES = {
  controller: path.join(ROOT, 'src', 'controllers', 'events-v2.controller.js'),
  routes:     path.join(ROOT, 'src', 'routes', 'events-v2.routes.js'),
  views:      path.join(ROOT, 'js', 'views.js'),
  backlog:    path.join(ROOT, 'docs', 'planning', 'BACKLOG.md'),
};

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

function timestamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function abort(msg) {
  console.error(`\n✗ ABORTO: ${msg}`);
  console.error('   No se escribió ningún archivo.\n');
  process.exit(1);
}

function ok(msg)   { console.log(`✓ ${msg}`); }
function info(msg) { console.log(`  ${msg}`); }
function warn(msg) { console.log(`⚠ ${msg}`); }

function backup(filePath) {
  const tag = path.basename(filePath) + '.bak-fix310';
  const backupPath = path.join(path.dirname(filePath), tag);
  if (BACKUP_SET.has(backupPath)) {
    info(`Backup ya generado: ${tag}`);
    return;
  }
  const content = fs.readFileSync(filePath, 'utf8');
  fs.writeFileSync(backupPath, content, 'utf8');
  BACKUP_SET.add(backupPath);
  ok(`Backup: ${tag}`);
}

// ---------------------------------------------------------------------------
// Banner
// ---------------------------------------------------------------------------

console.log('═'.repeat(66));
console.log(`  FIX-310 · MIGRAR loadAllPerformances() A ENDPOINT v2 — ${DRY_RUN ? '🔍 SIMULACIÓN' : '🚀 APLICAR'}`);
console.log('═'.repeat(66) + '\n');

// ---------------------------------------------------------------------------
// Verificar precondiciones
// ---------------------------------------------------------------------------

console.log('🔎 Verificando precondiciones...\n');

for (const [key, filePath] of Object.entries(FILES)) {
  if (!fs.existsSync(filePath)) abort(`No existe ${key}: ${filePath}`);
}
ok('Los 4 archivos objetivo existen.');

// Verificar que los cambios NO estén ya aplicados (idempotencia)
const controllerContent = fs.readFileSync(FILES.controller, 'utf8');
const routesContent     = fs.readFileSync(FILES.routes, 'utf8');
const viewsContent      = fs.readFileSync(FILES.views, 'utf8');

if (controllerContent.includes('getAllParticipationsAdmin')) {
  warn('El controller YA tiene getAllParticipationsAdmin(). Posible re-ejecución.');
}
if (routesContent.includes('/admin/participations')) {
  warn('El router YA tiene /admin/participations. Posible re-ejecución.');
}
if (viewsContent.includes('/api/events-v2/admin/participations')) {
  warn('El frontend YA usa el nuevo endpoint. Posible re-ejecución.');
}

// ---------------------------------------------------------------------------
// Bloque 1: Controller — agregar getAllParticipationsAdmin
// ---------------------------------------------------------------------------

const CONTROLLER_MARKER = 'export const getMyParticipations = async (req, res) => {';
if (!controllerContent.includes(CONTROLLER_MARKER)) {
  abort('No se encontró el marcador esperado en events-v2.controller.js (getMyParticipations).');
}

const NEW_CONTROLLER_FN = `
// ============================================================
// 13. GET /api/events-v2/admin/participations — Vista ADMIN/OWNER
// ============================================================

/**
 * Devuelve TODAS las participaciones del sistema (vista ADMIN/OWNER).
 * Reemplaza el legacy /api/admin/all-performances (FIX-310).
 *
 * Filtros opcionales:
 *   - event_id: UUID del evento
 *   - status:   PENDING | VALIDATED | REJECTED
 *   - limit:    default 200, max 500
 *   - offset:   default 0
 */
export const getAllParticipationsAdmin = async (req, res) => {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return res.status(503).json({
        success: false,
        error: 'Database client unavailable',
        code: 'DB_UNAVAILABLE'
      });
    }

    const { event_id, status, limit = 200, offset = 0 } = req.query;
    const lim = Math.min(parseInt(limit, 10) || 200, 500);
    const off = Math.max(parseInt(offset, 10) || 0, 0);

    let query = supabase
      .from('event_participations')
      .select(\`
        id,
        event_id,
        user_id,
        nick,
        data,
        computed_points,
        status,
        created_at,
        updated_at,
        events_master (name, type, status, start_date, end_date)
      \`, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(off, off + lim - 1);

    if (event_id) query = query.eq('event_id', event_id);
    if (status)   query = query.eq('status', status);

    const { data, error, count } = await query;
    if (error) throw error;

    // Resolver role de cada participación (batch, sin N+1)
    const userIds = [...new Set((data || []).map(p => p.user_id).filter(Boolean))];
    let roleMap = new Map();

    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from('users')
        .select('id, role')
        .in('id', userIds);
      (users || []).forEach(u => roleMap.set(u.id, u.role));
    }

    const participations = (data || []).map(p => ({
      id: p.id,
      event_id: p.event_id,
      event_name: p.events_master?.name || null,
      event_type: p.events_master?.type || null,
      user_id: p.user_id,
      nick: p.nick || null,
      role: roleMap.get(p.user_id) || 'MIEMBRO',
      tokens: p.data?.tokens ?? 0,
      days_connected: p.data?.days_connected ?? 0,
      flew_in_group: p.data?.flew_in_group ?? false,
      notes: p.data?.notes ?? null,
      computed_points: p.computed_points || 0,
      status: p.status || 'PENDING',
      created_at: p.created_at,
      updated_at: p.updated_at
    }));

    return res.json({
      success: true,
      participations,
      total: count ?? participations.length,
      limit: lim,
      offset: off
    });
  } catch (err) {
    logger.error('❌ [Events-v2] Error en getAllParticipationsAdmin:', err.message);
    return res.status(500).json({
      success: false,
      error: err.message,
      code: 'INTERNAL_ERROR'
    });
  }
};
`;

// ---------------------------------------------------------------------------
// Bloque 2: Router — registrar la ruta antes de /:id
// ---------------------------------------------------------------------------

const ROUTER_IMPORT_MARKER = `import {
  getEvents,
  getActiveEvent,
  getEventById,
  getSubmissionWindow,     // ← NUEVO (ADR-008)
  createEvent,
  updateEvent,
  changeEventStatus,
  deleteEvent,
  getParticipations,
  getMyParticipations,  // ← NUEVO (BL-028)
  createParticipation,
  updateParticipation,
  deleteParticipation
} from '../controllers/events-v2.controller.js';`;

const ROUTER_IMPORT_NEW = `import {
  getEvents,
  getActiveEvent,
  getEventById,
  getSubmissionWindow,     // ← NUEVO (ADR-008)
  createEvent,
  updateEvent,
  changeEventStatus,
  deleteEvent,
  getParticipations,
  getMyParticipations,           // ← NUEVO (BL-028)
  getAllParticipationsAdmin,     // ← NUEVO (FIX-310)
  createParticipation,
  updateParticipation,
  deleteParticipation
} from '../controllers/events-v2.controller.js';`;

const ROUTER_ROUTE_MARKER = `router.get('/mine', requireAuth, getMyParticipations);  // ← NUEVO (BL-028)
router.get('/:id', requireAuth, getEventById);`;

const ROUTER_ROUTE_NEW = `router.get('/mine', requireAuth, getMyParticipations);  // ← NUEVO (BL-028)
router.get('/admin/participations', requireAuth, requireRole('ADMIN', 'OWNER'), getAllParticipationsAdmin);  // ← NUEVO (FIX-310)
router.get('/:id', requireAuth, getEventById);`;

// ---------------------------------------------------------------------------
// Bloque 3: Frontend — migrar loadAllPerformances()
// ---------------------------------------------------------------------------

const VIEWS_MARKER = `    const res = await fetch(\`\${API_BASE}/api/admin/all-performances\`, { headers: getAuthHeaders() });
    let performances = [];
    if (res.ok) {
      const data = await res.json();
      performances = data.performances || (Array.isArray(data) ? data : []);
    } else {
      const fallback = await fetch(\`\${API_BASE}/api/performances/my-history\`, { headers: getAuthHeaders() });
      if (fallback.ok) {
        const fbData = await fallback.json();
        performances = fbData.history || fbData.performances || (Array.isArray(fbData) ? fbData : []);
      }
    }`;

const VIEWS_NEW = `    // FIX-310: migrado de /api/admin/all-performances (legacy) a /api/events-v2/admin/participations
    const res = await fetch(\`\${API_BASE}/api/events-v2/admin/participations?limit=500\`, { headers: getAuthHeaders() });
    let performances = [];
    if (res.ok) {
      const data = await res.json();
      performances = data.participations || (Array.isArray(data) ? data : []);
    } else {
      console.warn('[AllPerformances] Endpoint v2 falló con HTTP', res.status);
    }`;

// ---------------------------------------------------------------------------
// Bloque 4: BACKLOG.md — corregir el diagnóstico
// ---------------------------------------------------------------------------

const BACKLOG_MARKER = /(\|\s\*\*FIX-310\*\*\s\|\s[^|]*\|\s)`loadAllPerformances\(\)` usa endpoint roto `\/api\/admin\/all-performances`[^\n]*(\n)/;

const BACKLOG_NEW = `| **FIX-310** | 🔧 | Migrar \`loadAllPerformances()\` de tabla legacy a \`event_participations\` | 📋 Priorizado | S (4h) | El endpoint \`/api/admin/all-performances\` **existe** pero lee de la tabla **legacy \`performances\`** (congelada desde F4.2.2-G). Solución: crear \`GET /api/events-v2/admin/participations\` y migrar el frontend. Ref: \`js/views.js\` línea ~6721. |
`;

// ---------------------------------------------------------------------------
// Aplicar cambios
// ---------------------------------------------------------------------------

console.log('\n⚙ Aplicando cambios...\n');

let newController = controllerContent;
let newRoutes     = routesContent;
let newViews      = viewsContent;
let newBacklog    = fs.readFileSync(FILES.backlog, 'utf8');

// 1) Controller
if (!controllerContent.includes('getAllParticipationsAdmin')) {
  newController = controllerContent + '\n' + NEW_CONTROLLER_FN;
  ok('Controller: getAllParticipationsAdmin agregado.');
} else {
  info('Controller: ya tiene getAllParticipationsAdmin, skip.');
}

// 2) Router (import + ruta)
if (!routesContent.includes('getAllParticipationsAdmin')) {
  if (!routesContent.includes(ROUTER_IMPORT_MARKER)) {
    abort('Router: no matchea el bloque de imports esperado.');
  }
  newRoutes = newRoutes.replace(ROUTER_IMPORT_MARKER, ROUTER_IMPORT_NEW);
  ok('Router: import agregado.');
} else {
  info('Router: import ya presente, skip.');
}

if (!routesContent.includes('/admin/participations')) {
  if (!newRoutes.includes(ROUTER_ROUTE_MARKER)) {
    abort('Router: no matchea el bloque de rutas esperado.');
  }
  newRoutes = newRoutes.replace(ROUTER_ROUTE_MARKER, ROUTER_ROUTE_NEW);
  ok('Router: ruta /admin/participations agregada ANTES de /:id.');
} else {
  info('Router: ruta ya presente, skip.');
}

// 3) Frontend
if (!viewsContent.includes('/api/events-v2/admin/participations')) {
  if (!viewsContent.includes(VIEWS_MARKER)) {
    abort('Frontend: no matchea el bloque de loadAllPerformances() esperado.');
  }
  newViews = newViews.replace(VIEWS_MARKER, VIEWS_NEW);
  ok('Frontend: loadAllPerformances() migrado al endpoint v2.');
} else {
  info('Frontend: ya usa el endpoint v2, skip.');
}

// 4) BACKLOG.md
if (BACKLOG_MARKER.test(newBacklog)) {
  newBacklog = newBacklog.replace(BACKLOG_MARKER, BACKLOG_NEW);
  ok('BACKLOG.md: diagnóstico de FIX-310 corregido.');
} else if (newBacklog.includes('event_participations` y migrar el frontend')) {
  info('BACKLOG.md: ya corregido, skip.');
} else {
  warn('BACKLOG.md: no matchea el patrón esperado, skip (revisar manualmente).');
}

// ---------------------------------------------------------------------------
// Escribir archivos (o no, si es dry-run)
// ---------------------------------------------------------------------------

if (DRY_RUN) {
  console.log('\n✓ DRY-RUN completado. Corré sin --dry-run para aplicar.\n');
  process.exit(0);
}

console.log('\n💾 Generando backups y escribiendo...\n');

backup(FILES.controller);
backup(FILES.routes);
backup(FILES.views);
backup(FILES.backlog);

fs.writeFileSync(FILES.controller, newController, 'utf8');
fs.writeFileSync(FILES.routes,     newRoutes,     'utf8');
fs.writeFileSync(FILES.views,      newViews,      'utf8');
fs.writeFileSync(FILES.backlog,    newBacklog,    'utf8');

ok('events-v2.controller.js actualizado.');
ok('events-v2.routes.js actualizado.');
ok('js/views.js actualizado.');
ok('docs/planning/BACKLOG.md actualizado.');

// ---------------------------------------------------------------------------
// Verificación post
// ---------------------------------------------------------------------------

console.log('\n🧪 Verificación post:\n');

const finalController = fs.readFileSync(FILES.controller, 'utf8');
const finalRoutes     = fs.readFileSync(FILES.routes, 'utf8');
const finalViews      = fs.readFileSync(FILES.views, 'utf8');
const finalBacklog    = fs.readFileSync(FILES.backlog, 'utf8');

const checks = [
  ['Controller tiene getAllParticipationsAdmin', finalController.includes('getAllParticipationsAdmin')],
  ['Router tiene /admin/participations',         finalRoutes.includes('/admin/participations')],
  ['Router importa getAllParticipationsAdmin',   finalRoutes.includes('getAllParticipationsAdmin')],
  ['Frontend usa /api/events-v2/admin/participations', finalViews.includes('/api/events-v2/admin/participations')],
  ['Frontend ya no llama a /api/admin/all-performances', 
 !finalViews.match(/fetch\s*\([^)]*\/api\/admin\/all-performances/)],
  ['BACKLOG.md menciona event_participations', 
 finalBacklog.includes('Migrar `loadAllPerformances()` de tabla legacy a `event_participations`')],
];

let allOk = true;
for (const [label, result] of checks) {
  console.log(`   ${result ? '✓' : '✗'} ${label}`);
  if (!result) allOk = false;
}

if (!allOk) {
  console.error('\n⚠ Alguna verificación post falló. Revisar antes de commitear.\n');
  process.exit(2);
}

console.log('\n✅ FIX-310 aplicado correctamente.\n');
console.log('⚠ PRÓXIMOS PASOS MANUALES:');
console.log('   1. node --check src/controllers/events-v2.controller.js');
console.log('   2. node --check src/routes/events-v2.routes.js');
console.log('   3. node --check js/views.js');
console.log('   4. git diff --stat');
console.log('   5. Revisar diff manualmente: git diff');
console.log('   6. Commit:');
console.log('        git add src/controllers/events-v2.controller.js \\');
console.log('                src/routes/events-v2.routes.js \\');
console.log('                js/views.js \\');
console.log('                docs/planning/BACKLOG.md');
console.log('        git commit -m "fix(events-v2): crear endpoint admin/participations (FIX-310)"');
console.log('   7. Push: git push origin main\n');