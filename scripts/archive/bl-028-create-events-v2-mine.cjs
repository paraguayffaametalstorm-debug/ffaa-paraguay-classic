/**
 * ============================================================================
 * PARAGUAY-FFAA | METALSTORM
 * BL-028 — Crear endpoint GET /api/events-v2/mine
 * ============================================================================
 * Sprint 4 — Deuda técnica (terminar migración legacy)
 *
 * Contexto:
 *   - js/views.js tiene 3 llamadas a /api/performances/history o /my-history
 *     (líneas 743, 940, 6712) que leen de la tabla LEGACY `performances`.
 *   - El objetivo final es migrar todo a event_participations (tabla v2).
 *   - Este paso (BL-028) crea el endpoint NUEVO sin tocar el frontend todavía.
 *   - BL-029 migrará js/views.js para consumirlo.
 *
 * Acción:
 *   1. Agregar función getMyParticipations() al final del controller
 *      src/controllers/events-v2.controller.js
 *   2. Agregar ruta GET /mine en src/routes/events-v2.routes.js
 *      (ANTES de GET /:id para evitar colisión)
 *
 * IDEMPOTENTE: si ya existe el endpoint, salta sin error.
 *
 * Uso:
 *   node scripts/bl-028-create-events-v2-mine.cjs
 *
 * Rollback:
 *   ren src\controllers\events-v2.controller.js.bak-bl028 src\controllers\events-v2.controller.js
 *   ren src\routes\events-v2.routes.js.bak-bl028 src\routes\events-v2.routes.js
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CONTROLLER = path.join(ROOT, 'src', 'controllers', 'events-v2.controller.js');
const ROUTES = path.join(ROOT, 'src', 'routes', 'events-v2.routes.js');

function readFile(p) {
  if (!fs.existsSync(p)) throw new Error(`No existe: ${p}`);
  return fs.readFileSync(p, 'utf8');
}

function writeFile(p, content) {
  fs.writeFileSync(p, content, 'utf8');
}

function backup(p) {
  const bak = p + '.bak-bl028';
  if (!fs.existsSync(bak)) {
    fs.copyFileSync(p, bak);
    console.log(`   💾 Backup: ${path.basename(bak)}`);
  } else {
    console.log(`   ℹ️  Backup ya existe: ${path.basename(bak)}`);
  }
}

function replaceOnce(content, search, replacement, label) {
  const count = content.split(search).length - 1;
  if (count === 0) {
    throw new Error(`[${label}] No se encontró:\n${search.substring(0, 200)}...`);
  }
  if (count > 1) {
    throw new Error(`[${label}] Aparece ${count} veces (debe ser único):\n${search.substring(0, 200)}...`);
  }
  return content.replace(search, replacement);
}

// ── Controller ────────────────────────────────────────────────

function addControllerFunction() {
  console.log('');
  console.log('📄 [1/2] Modificando src/controllers/events-v2.controller.js');
  backup(CONTROLLER);
  let content = readFile(CONTROLLER);

  if (content.includes('getMyParticipations')) {
    console.log('   ℹ️  getMyParticipations ya existe. Saltando.');
    return;
  }

  // La función se inserta al FINAL del archivo (después de deleteParticipation).
  const NEW_FUNCTION = `
// ============================================================
// 12. GET /api/events-v2/mine — Historial de participaciones del piloto autenticado
// ============================================================

/**
 * Devuelve todas las participaciones del piloto autenticado, con datos del evento
 * enriquecidos (nombre, tipo, status, fechas).
 *
 * Reemplaza funcionalmente los endpoints legacy:
 *   - GET /api/performances/history    (lee tabla legacy 'performances')
 *   - GET /api/performances/my-history (alias)
 *
 * Payload retrocompatible con el legacy: incluye event_id, tokens, days_connected,
 * flew_in_group, notes, status, created_at — todos los campos que consume js/views.js
 * en displayHistorial() y renderAllPerformance().
 *
 * Query params opcionales:
 *   - limit  : máximo de resultados (default 50, max 200)
 *   - type   : filtrar por tipo de evento (SQUADRON | BLACK_MARKET | ACE_CHALLENGE)
 *   - status : filtrar por status del evento (SCHEDULED | OPEN | CLOSED | CANCELLED)
 *
 * @since v4.7.3 (BL-028)
 */
export const getMyParticipations = async (req, res) => {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return res.status(500).json({
        success: false,
        error: 'Database client unavailable',
        code: 'DB_UNAVAILABLE'
      });
    }

    // 1. Resolver el UUID del caller (puede venir como UUID en req.user.id
    //    o como INTEGER en req.user.user_id)
    let callerUUID = req.user?.id;

    const isUuid = typeof callerUUID === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(callerUUID);

    if (!isUuid && req.user?.user_id) {
      const { data: userRows, error: userErr } = await supabase
        .from('users')
        .select('id')
        .eq('user_id', Number(req.user.user_id))
        .limit(1);

      if (userErr) throw userErr;
      if (userRows && userRows.length > 0) callerUUID = userRows[0].id;
    }

    if (!callerUUID) {
      return res.status(400).json({
        success: false,
        error: 'No se pudo resolver el UUID del piloto autenticado.',
        code: 'USER_NOT_FOUND'
      });
    }

    // 2. Parsear filtros opcionales
    const limitRaw = parseInt(req.query.limit, 10);
    const limit = Number.isFinite(limitRaw) && limitRaw > 0
      ? Math.min(limitRaw, 200)
      : 50;

    const typeFilter = typeof req.query.type === 'string'
      ? req.query.type.toUpperCase().trim()
      : null;

    const statusFilter = typeof req.query.status === 'string'
      ? req.query.status.toUpperCase().trim()
      : null;

    // 3. Query participaciones del piloto
    const { data: participations, error: pErr } = await supabase
      .from('event_participations')
      .select('*')
      .eq('user_id', callerUUID)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (pErr) throw pErr;

    const list = participations || [];
    if (list.length === 0) {
      return res.json({
        success: true,
        participations: [],
        total: 0,
        filters: { limit, type: typeFilter, status: statusFilter }
      });
    }

    // 4. Fetch de los eventos involucrados (en batch, 1 query)
    const eventIds = [...new Set(list.map(p => p.event_id).filter(Boolean))];

    const { data: events, error: eErr } = await supabase
      .from('events_master')
      .select('id, name, type, status, start_date, end_date')
      .in('id', eventIds);

    if (eErr) throw eErr;

    const eventMap = new Map((events || []).map(e => [e.id, e]));

    // 5. Aplicar filtros por type/status del evento (post-fetch)
    let filtered = list;
    if (typeFilter) {
      filtered = filtered.filter(p => {
        const ev = eventMap.get(p.event_id);
        return ev && ev.type === typeFilter;
      });
    }
    if (statusFilter) {
      filtered = filtered.filter(p => {
        const ev = eventMap.get(p.event_id);
        return ev && ev.status === statusFilter;
      });
    }

    // 6. Helper: calcular perf_status (semáforo militar, solo para SQUADRON)
    const calcPerfStatus = (tokens, days) => {
      const t = Number(tokens) || 0;
      const d = Number(days) || 0;
      if (t >= 175 && d >= 4) return 'VERDE';
      if (t >= 130 && d >= 3) return 'NARANJA';
      if (t >= 100 && d >= 2) return 'ROJO';
      return 'NEGRO';
    };

    // 7. Merge + normalizar para el frontend
    const result = filtered.map(p => {
      const ev = eventMap.get(p.event_id) || {};
      const data = p.data || {};

      const tokens = data.tokens ?? p.computed_points ?? 0;
      const days = data.days_connected ?? 0;
      const isSquadron = ev.type === 'SQUADRON';

      return {
        // Identificadores
        id: p.id,
        event_id: p.event_id,
        user_id: p.user_id,

        // Datos del evento (denormalizados)
        event_name: ev.name || null,
        event_type: ev.type || null,
        event_status: ev.status || null,
        event_start_date: ev.start_date || null,
        event_end_date: ev.end_date || null,

        // Datos de la participación (retrocompatibles con legacy)
        tokens,
        days_connected: days,
        flew_in_group: data.flew_in_group ?? false,
        notes: data.notes || null,
        computed_points: p.computed_points ?? 0,
        status: p.status || 'PENDING',

        // Semáforo (solo para SQ; null en BM)
        perf_status: isSquadron ? calcPerfStatus(tokens, days) : null,

        // Timestamps
        created_at: p.created_at,
        updated_at: p.updated_at
      };
    });

    return res.json({
      success: true,
      participations: result,
      total: result.length,
      filters: { limit, type: typeFilter, status: statusFilter }
    });
  } catch (error) {
    logger.error('❌ [Events-v2] Error en getMyParticipations:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      code: 'INTERNAL_ERROR'
    });
  }
};
`;

  // Insertar al final del archivo
  content = content.trimEnd() + '\n' + NEW_FUNCTION;

  writeFile(CONTROLLER, content);
  console.log('   ✅ getMyParticipations insertado al final del controller');
}

// ── Routes ────────────────────────────────────────────────────

function addRoute() {
  console.log('');
  console.log('📄 [2/2] Modificando src/routes/events-v2.routes.js');
  backup(ROUTES);
  let content = readFile(ROUTES);

  if (content.includes("'/mine'")) {
    console.log('   ℹ️  Ruta /mine ya existe. Saltando.');
    return;
  }

  // 1. Agregar getMyParticipations al import
  content = replaceOnce(
    content,
    `  getParticipations,
  createParticipation,`,
    `  getParticipations,
  getMyParticipations,  // ← NUEVO (BL-028)
  createParticipation,`,
    'routes import'
  );

  // 2. Insertar la ruta /mine ANTES de /:id (crítico)
  content = replaceOnce(
    content,
    `router.get('/open', requireAuth, getActiveEvent);  // Alias retrocompatible
router.get('/:id', requireAuth, getEventById);`,
    `router.get('/open', requireAuth, getActiveEvent);  // Alias retrocompatible
router.get('/mine', requireAuth, getMyParticipations);  // ← NUEVO (BL-028)
router.get('/:id', requireAuth, getEventById);`,
    'routes /mine'
  );

  writeFile(ROUTES, content);
  console.log('   ✅ Ruta GET /mine insertada antes de /:id');
}

// ── Main ─────────────────────────────────────────────────────

function main() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  BL-028 — Crear GET /api/events-v2/mine');
  console.log('═══════════════════════════════════════════════════════════════');

  addControllerFunction();
  addRoute();

  console.log('');
  console.log('🔍 Verificando cambios...');

  const ctrl = readFile(CONTROLLER);
  const rt = readFile(ROUTES);

  const checks = [
    ['Controller: getMyParticipations definido', ctrl.includes('export const getMyParticipations = async')],
    ['Controller: sin duplicado', (ctrl.split('export const getMyParticipations').length - 1) === 1],
    ['Controller: usa event_participations', ctrl.includes(".from('event_participations')")],
    ['Controller: usa events_master', ctrl.includes(".from('events_master')")],
    ['Controller: calcula perf_status', ctrl.includes('calcPerfStatus')],
    ['Controller: no rompió deleteParticipation', ctrl.includes('export const deleteParticipation = async')],
    ['Routes: import agregado', rt.includes('getMyParticipations,  // ← NUEVO (BL-028)')],
    ['Routes: ruta /mine presente', rt.includes("router.get('/mine', requireAuth, getMyParticipations)")],
    ['Routes: /mine antes de /:id', rt.indexOf("router.get('/mine'") < rt.indexOf("router.get('/:id'")],
    ['Routes: rutas existentes intactas', rt.includes("router.get('/active', requireAuth, getActiveEvent)")],
  ];

  let allOk = true;
  for (const [label, ok] of checks) {
    console.log(`   ${ok ? '✅' : '❌'} ${label}`);
    if (!ok) allOk = false;
  }

  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  if (allOk) {
    console.log('  ✅ BL-028 COMPLETADO — 10 checks OK');
    console.log('');
    console.log('  Próximos pasos:');
    console.log('    1. node --check src\\controllers\\events-v2.controller.js');
    console.log('    2. node --check src\\routes\\events-v2.routes.js');
    console.log('    3. git diff src/controllers/events-v2.controller.js src/routes/events-v2.routes.js');
    console.log('    4. git add src/controllers/events-v2.controller.js src/routes/events-v2.routes.js scripts/bl-028-create-events-v2-mine.cjs');
    console.log('    5. git commit -m "feat(bl-028): crear endpoint GET /api/events-v2/mine"');
    console.log('    6. git push origin main');
    console.log('');
    console.log('  Rollback:');
    console.log('    ren src\\controllers\\events-v2.controller.js.bak-bl028 src\\controllers\\events-v2.controller.js');
    console.log('    ren src\\routes\\events-v2.routes.js.bak-bl028 src\\routes\\events-v2.routes.js');
  } else {
    console.log('  ⚠️ CON ERRORES — revisar arriba');
  }
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');

  if (!allOk) process.exit(1);
}

try {
  main();
} catch (err) {
  console.error('');
  console.error('❌ ERROR:', err.message);
  console.error('');
  console.error('   Backups disponibles:');
  console.error('     src\\controllers\\events-v2.controller.js.bak-bl028');
  console.error('     src\\routes\\events-v2.routes.js.bak-bl028');
  console.error('');
  process.exit(1);
}