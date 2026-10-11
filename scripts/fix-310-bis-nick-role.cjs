#!/usr/bin/env node
/**
 * fix-310-bis-nick-role.cjs
 * -----------------------------------------------------------------------------
 * FIX-310-bis: corrige dos bugs del rediseño de eventos.
 *
 * Bug 1 — createParticipation (línea ~780):
 *   El nick se guardaba como `payload.nick || req.user?.nick`. Cuando el
 *   frontend no manda `payload.nick`, cae al nick del CALLER (OWNER/ADMIN),
 *   no al del piloto target. Esto corrompió ~80 participaciones entre
 *   2026-09-21 y 2026-10-05.
 *
 * Bug 2 — getAllParticipationsAdmin:
 *   El SELECT pedía `nick` a event_participations (columna que existe pero
 *   puede estar desactualizada). Se delega todo a la vista SQL
 *   v_admin_participations (sql/042_*) que prioriza users.nick.
 *
 * Cambios aplicados:
 *   1. events-v2.controller.js → createParticipation: resolver targetNick
 *      desde users por UUID.
 *   2. events-v2.controller.js → getAllParticipationsAdmin: simplificar
 *      delegando a v_admin_participations.
 *
 * Reglas (aprendidas de los scripts previos):
 *   - EOL mixto: no usamos regex multilínea acá.
 *   - Backup timestamped.
 *   - Aborto TOTAL si algún ítem falla. No hay escritura parcial.
 *   - NO commitear desde el script. El OWNER revisa el diff.
 * -----------------------------------------------------------------------------
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');
const ROOT    = path.resolve(__dirname, '..');
const CONTROLLER = path.join(ROOT, 'src', 'controllers', 'events-v2.controller.js');

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

function abort(msg) {
  console.error(`\n✗ ABORTO: ${msg}`);
  console.error('   No se escribió ningún archivo.\n');
  process.exit(1);
}

function ok(msg)   { console.log(`✓ ${msg}`); }
function info(msg) { console.log(`  ${msg}`); }

// ---------------------------------------------------------------------------
// Banner
// ---------------------------------------------------------------------------

console.log('═'.repeat(66));
console.log(`  FIX-310-bis · RESOLVER NICK DESDE USERS — ${DRY_RUN ? '🔍 SIMULACIÓN' : '🚀 APLICAR'}`);
console.log('═'.repeat(66) + '\n');

// ---------------------------------------------------------------------------
// Precondiciones
// ---------------------------------------------------------------------------

console.log('🔎 Verificando precondiciones...\n');

if (!fs.existsSync(CONTROLLER)) {
  abort(`No existe el controller: ${CONTROLLER}`);
}
ok(`Controller existe: src/controllers/events-v2.controller.js`);

let content = fs.readFileSync(CONTROLLER, 'utf8');

// ---------------------------------------------------------------------------
// Bloque 1: createParticipation — resolver targetNick desde users
// ---------------------------------------------------------------------------

// Bloque original (líneas 780-806)
const BUG1_MARKER = `    let rawUserId = payload.user_id !== undefined ? payload.user_id : req.user?.id;
    let targetNick = payload.nick || req.user?.nick;

    let targetUserId = rawUserId;

    // Si rawUserId es un número (INTEGER), resolver a UUID
    const isNumeric = typeof rawUserId === 'number' ||
      (typeof rawUserId === 'string' && /^\\d+$/.test(rawUserId));
    const isUuid = typeof rawUserId === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawUserId);

    if (isNumeric) {
      const { data: userRows, error: userErr } = await supabase
        .from('users')
        .select('id, nick')
        .eq('user_id', Number(rawUserId))
        .limit(1);

      if (userErr) throw userErr;
      if (!userRows || userRows.length === 0) {
        return res.status(404).json({
          success: false,
          error: \`No existe un usuario con user_id = \${rawUserId}.\`,
          code: 'USER_NOT_FOUND'
        });
      }
      targetUserId = userRows[0].id;
      if (!targetNick) targetNick = userRows[0].nick;
    } else if (!isUuid) {
      return res.status(400).json({
        success: false,
        error: 'user_id debe ser un UUID o un entero positivo.',
        code: 'INVALID_USER_ID'
      });
    }`;

const BUG1_FIX = `    let rawUserId = payload.user_id !== undefined ? payload.user_id : req.user?.id;
    // FIX-310-bis: NO usar req.user.nick como fallback (era el bug — el nick del caller
    // se guardaba en vez del nick del piloto target). Se resuelve targetNick desde users.
    let targetNick = payload.nick || null;

    let targetUserId = rawUserId;

    // Si rawUserId es un número (INTEGER), resolver a UUID
    const isNumeric = typeof rawUserId === 'number' ||
      (typeof rawUserId === 'string' && /^\\d+$/.test(rawUserId));
    const isUuid = typeof rawUserId === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawUserId);

    if (isNumeric) {
      const { data: userRows, error: userErr } = await supabase
        .from('users')
        .select('id, nick')
        .eq('user_id', Number(rawUserId))
        .limit(1);

      if (userErr) throw userErr;
      if (!userRows || userRows.length === 0) {
        return res.status(404).json({
          success: false,
          error: \`No existe un usuario con user_id = \${rawUserId}.\`,
          code: 'USER_NOT_FOUND'
        });
      }
      targetUserId = userRows[0].id;
      if (!targetNick) targetNick = userRows[0].nick;
    } else if (isUuid) {
      // FIX-310-bis: resolver nick desde users por UUID (antes no se hacía,
      // y se caía al nick del caller cuando el payload no traía nick).
      if (!targetNick) {
        const { data: userRows, error: userErr } = await supabase
          .from('users')
          .select('nick')
          .eq('id', rawUserId)
          .limit(1);

        if (userErr) throw userErr;
        if (userRows && userRows.length > 0) {
          targetNick = userRows[0].nick;
        }
      }
      // Fallback final: si el usuario no existe en la tabla
      if (!targetNick) targetNick = 'Desconocido';
    } else {
      return res.status(400).json({
        success: false,
        error: 'user_id debe ser un UUID o un entero positivo.',
        code: 'INVALID_USER_ID'
      });
    }`;

// ---------------------------------------------------------------------------
// Bloque 2: getAllParticipationsAdmin — delegar a la vista
// ---------------------------------------------------------------------------

// Marcadores para reemplazo del cuerpo de la función
const FUNC_START = `export const getAllParticipationsAdmin = async (req, res) => {`;
const FUNC_END_MARKER = `// ============================================================\n// FIN getAllParticipationsAdmin\n// ============================================================`;

// Buscamos el inicio de la función
const funcStartIdx = content.indexOf(FUNC_START);
if (funcStartIdx === -1) {
  abort('No se encontró getAllParticipationsAdmin en el controller.');
}

// Buscamos el cierre de la función (el primer "};" después del inicio)
let funcEndIdx = content.indexOf('\n};', funcStartIdx);
if (funcEndIdx === -1) {
  abort('No se encontró el cierre de getAllParticipationsAdmin.');
}
funcEndIdx += 3; // Incluir el "};"

const FUNC_ORIGINAL = content.substring(funcStartIdx, funcEndIdx);

const FUNC_FIX = `export const getAllParticipationsAdmin = async (req, res) => {
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

    // FIX-310-bis: delegamos todo el JOIN y la resolución de nick/role a la vista SQL
    // v_admin_participations (ver sql/042_admin_participations_view.sql).
    let query = supabase
      .from('v_admin_participations')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(off, off + lim - 1);

    if (event_id) query = query.eq('event_id', event_id);
    if (status)   query = query.eq('status', status);

    const { data, error, count } = await query;
    if (error) throw error;

    return res.json({
      success: true,
      participations: data || [],
      total: count ?? (data || []).length,
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
};`;

// ---------------------------------------------------------------------------
// Aplicar cambios
// ---------------------------------------------------------------------------

console.log('⚙ Aplicando cambios...\n');

let newContent = content;

// Bloque 1: createParticipation
if (newContent.includes('let targetNick = payload.nick || req.user?.nick;')) {
  if (!newContent.includes(BUG1_MARKER)) {
    abort('FIX-1: no matchea el bloque createParticipation esperado.');
  }
  newContent = newContent.replace(BUG1_MARKER, BUG1_FIX);
  ok('createParticipation: targetNick ahora se resuelve desde users.');
} else if (newContent.includes('let targetNick = payload.nick || null;')) {
  info('createParticipation: ya está parcheado, skip.');
} else {
  abort('FIX-1: no se encontró el patrón de targetNick.');
}

// Bloque 2: getAllParticipationsAdmin
if (newContent.includes("from('event_participations')") && newContent.includes("events_master (name, type, status, start_date, end_date)")) {
  if (newContent.length === content.length - (FUNC_ORIGINAL.length - FUNC_FIX.length)) {
    info('getAllParticipationsAdmin: ya usa la vista, skip.');
  }
}

// Recalcular el bloque después del reemplazo 1
const funcStartIdx2 = newContent.indexOf(FUNC_START);
const funcEndIdx2 = newContent.indexOf('\n};', funcStartIdx2) + 3;

if (funcStartIdx2 === -1 || funcEndIdx2 === 2) {
  abort('FIX-2: no se pudo localizar getAllParticipationsAdmin post-replace.');
}

const FUNC_ACTUAL = newContent.substring(funcStartIdx2, funcEndIdx2);

if (FUNC_ACTUAL.includes("v_admin_participations")) {
  info('getAllParticipationsAdmin: ya usa la vista, skip.');
} else {
  newContent = newContent.substring(0, funcStartIdx2) + FUNC_FIX + newContent.substring(funcEndIdx2);
  ok('getAllParticipationsAdmin: ahora delega a v_admin_participations.');
}

// ---------------------------------------------------------------------------
// Escribir (o no)
// ---------------------------------------------------------------------------

if (DRY_RUN) {
  console.log('\n✓ DRY-RUN completado. Corré sin --dry-run para aplicar.\n');
  process.exit(0);
}

console.log('\n💾 Generando backup y escribiendo...\n');

const backupPath = CONTROLLER + '.bak-fix310bis';
fs.writeFileSync(backupPath, content, 'utf8');
ok(`Backup: ${path.basename(backupPath)}`);

fs.writeFileSync(CONTROLLER, newContent, 'utf8');
ok('events-v2.controller.js actualizado.');

// ---------------------------------------------------------------------------
// Verificación post
// ---------------------------------------------------------------------------

console.log('\n🧪 Verificación post:\n');

const final = fs.readFileSync(CONTROLLER, 'utf8');

const checks = [
  ['createParticipation NO usa req.user.nick como fallback',
   !final.includes('let targetNick = payload.nick || req.user?.nick;')],
  ['createParticipation usa fallback a null',
   final.includes('let targetNick = payload.nick || null;')],
  ['createParticipation resuelve nick por UUID',
   final.includes("if (!targetNick) targetNick = 'Desconocido';")],
  ['getAllParticipationsAdmin consulta la vista',
   final.includes("from('v_admin_participations')")],
  ['getAllParticipationsAdmin NO consulta event_participations directo',
   !final.includes("from('event_participations')\n      .select(`")],
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

console.log('\n✅ FIX-310-bis aplicado correctamente.\n');
console.log('⚠ PRÓXIMOS PASOS MANUALES:');
console.log('   1. node --check src/controllers/events-v2.controller.js');
console.log('   2. git diff --stat');
console.log('   3. Revisar diff: git diff src/controllers/events-v2.controller.js');
console.log('   4. Commit:');
console.log('        git add src/controllers/events-v2.controller.js \\');
console.log('                sql/042_admin_participations_view.sql \\');
console.log('                sql/043_backfill_participations_nick.sql \\');
console.log('                scripts/fix-310-bis-nick-role.cjs');
console.log('        git commit -m "fix(events-v2): resolver nick desde users + delegar admin a vista (FIX-310-bis)"');
console.log('   5. Push: git push origin main\n');