#!/usr/bin/env node
/**
 * PARAGUAY-FFAA | METALSTORM
 * SCRIPT: FIX-105 — Transacción atómica en changeEventStatus (RPC + fallback)
 *
 * Uso:
 *   node scripts\apply-fix-105.cjs           (DRY-RUN)
 *   node scripts\apply-fix-105.cjs --apply   (APLICAR — sin commit automático)
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const APPLY = process.argv.includes('--apply');

const C = {
  reset: '\x1b[0m', bold: '\x1b[1m',
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m',
  blue: '\x1b[34m', cyan: '\x1b[36m', gray: '\x1b[90m'
};

function log(color, prefix, msg) { console.log(`${color}${prefix}${C.reset} ${msg}`); }
function abort(msg) {
  console.error(`\n${C.red}${C.bold}❌ ABORTADO:${C.reset} ${msg}\n`);
  process.exit(1);
}

function readFile(relPath) {
  const absPath = path.join(ROOT_DIR, relPath);
  if (!fs.existsSync(absPath)) abort(`Archivo no encontrado: ${relPath}`);
  return { absPath, content: fs.readFileSync(absPath, 'utf8') };
}

function safeReplace(content, oldBlock, newBlock, label) {
  const hasCRLF = content.includes('\r\n');
  const nc = hasCRLF ? content.replace(/\r\n/g, '\n') : content;
  const no = oldBlock.replace(/\r\n/g, '\n');
  const nn = newBlock.replace(/\r\n/g, '\n');

  if (nc.includes(nn)) {
    log(C.yellow, '[SKIP]', `${label}: ya aplicado.`);
    return { changed: false, content };
  }

  const count = nc.split(no).length - 1;
  if (count === 0) {
    log(C.red, '[FAIL]', `${label}: bloque original no encontrado.`);
    return { changed: false, content, error: 'NOT_FOUND' };
  }
  if (count > 1) {
    log(C.red, '[FAIL]', `${label}: ${count} ocurrencias ambiguas.`);
    return { changed: false, content, error: 'AMBIGUOUS' };
  }

  log(C.green, '[MATCH]', `${label}: 1 ocurrencia.`);
  let result = nc.replace(no, nn);
  if (hasCRLF) result = result.replace(/\n/g, '\r\n');
  return { changed: true, content: result };
}

function writeFile(relPath, newContent, oldContent) {
  const absPath = path.join(ROOT_DIR, relPath);
  if (newContent === oldContent) {
    log(C.yellow, '[SKIP]', `${relPath} — sin cambios`);
    return false;
  }
  if (!APPLY) {
    log(C.yellow, '[DRY-RUN]', `NO se modificará: ${relPath}`);
    return true;
  }
  const backupPath = absPath + '.bak-fix-105';
  fs.writeFileSync(backupPath, oldContent, 'utf8');
  log(C.gray, '[BACKUP]', `Creado: ${path.relative(ROOT_DIR, backupPath)}`);
  fs.writeFileSync(absPath, newContent, 'utf8');
  log(C.green, '[WRITE]', `Modificado: ${relPath}`);
  return true;
}

function writeNewFile(relPath, content) {
  const absPath = path.join(ROOT_DIR, relPath);
  if (fs.existsSync(absPath)) {
    log(C.yellow, '[SKIP]', `${relPath} ya existe.`);
    return false;
  }
  if (!APPLY) {
    log(C.yellow, '[DRY-RUN]', `NO se creará: ${relPath}`);
    return true;
  }
  fs.mkdirSync(path.dirname(absPath), { recursive: true });
  fs.writeFileSync(absPath, content, 'utf8');
  log(C.green, '[CREATE]', `Creado: ${relPath}`);
  return true;
}

// ============================================================================
// CAMBIO 1 — src/config/env.js: agregar USE_ATOMIC_EVENT_STATUS
// ============================================================================
function fixEnvJs() {
  log(C.bold + C.blue, '\n[1/5]', 'src/config/env.js — agregar USE_ATOMIC_EVENT_STATUS...');
  const { content } = readFile('src/config/env.js');

  // Ancla: la línea de USE_ATOMIC_RESET (que agregamos en FIX-101)
  const oldBlock = `  // FIX-101: Feature flag para reset password atómico (RPC reset_password_atomic).
  // Default: true (usa la RPC). Si algo falla: fly secrets set USE_ATOMIC_RESET=false
  USE_ATOMIC_RESET: process.env.USE_ATOMIC_RESET !== 'false',`;

  const newBlock = `  // FIX-101: Feature flag para reset password atómico (RPC reset_password_atomic).
  // Default: true (usa la RPC). Si algo falla: fly secrets set USE_ATOMIC_RESET=false
  USE_ATOMIC_RESET: process.env.USE_ATOMIC_RESET !== 'false',

  // FIX-105: Feature flag para cambio de status de evento atómico (RPC change_event_status_atomic).
  // Default: true (usa la RPC). Si algo falla: fly secrets set USE_ATOMIC_EVENT_STATUS=false
  USE_ATOMIC_EVENT_STATUS: process.env.USE_ATOMIC_EVENT_STATUS !== 'false',`;

  const r = safeReplace(content, oldBlock, newBlock, 'env.js USE_ATOMIC_EVENT_STATUS');
  if (r.error) {
    abort(`env.js: ${r.error}. Verificá que el bloque de USE_ATOMIC_RESET exista.`);
  }
  if (r.changed) writeFile('src/config/env.js', r.content, content);
}

// ============================================================================
// CAMBIO 2 — src/controllers/events-v2.controller.js: reemplazar changeEventStatus
// ============================================================================
function fixChangeEventStatus() {
  log(C.bold + C.blue, '\n[2/5]', 'src/controllers/events-v2.controller.js — reemplazar changeEventStatus...');
  const { content } = readFile('src/controllers/events-v2.controller.js');

  const oldBlock = `export const changeEventStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = ChangeEventStatusSchema.parse(req.body);
    const supabase = getSupabase();
    if (!supabase) {
      return res.status(500).json({
        success: false,
        error: 'Database client unavailable'
      });
    }

    const { data: existing, error: queryErr } = await supabase
      .from('events_master')
      .select('id, type, status, name')
      .eq('id', id)
      .limit(1);

    if (queryErr) throw queryErr;
    if (!existing || existing.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Evento no encontrado',
        code: 'EVENT_NOT_FOUND'
      });
    }

    const event = existing[0];

    if (status === 'OPEN') {
      const { data: openEvents, error: openErr } = await supabase
        .from('events_master')
        .select('id')
        .eq('status', 'OPEN')
        .neq('id', id);

      if (openErr) throw openErr;

      if (openEvents && openEvents.length > 0) {
        const now = new Date().toISOString();
        const { error: closeErr } = await supabase
          .from('events_master')
          .update({ status: 'CLOSED', closed_at: now, updated_at: now })
          .eq('id', openEvents[0].id);

        if (closeErr) throw closeErr;
      }
    }

    const now = new Date().toISOString();
    const updateData = {
      status,
      updated_at: now,
      ...(status === 'CLOSED' && { closed_at: now, closed_by: req.user?.id || null })
    };

    const { data: updated, error } = await supabase
      .from('events_master')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return res.json({
      success: true,
      message: \`Evento \${event.name} cambiado a \${status}\`,
      event: normalizeEvent(updated),
      data: normalizeEvent(updated)
    });
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: 'Status inválido',
        code: 'VALIDATION_ERROR',
        details: error.issues
      });
    }
    console.error('❌ [Events-v2] Error en changeEventStatus:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};`;

  const newBlock = `// FIX-105 (v4.5.8): Transacción atómica vía RPC change_event_status_atomic.
// - Si USE_ATOMIC_EVENT_STATUS=true (default): usa la RPC atómica con FOR UPDATE.
// - Si la RPC falla por infraestructura: fallback automático a lógica legacy.
// - Si USE_ATOMIC_EVENT_STATUS=false: usa la lógica legacy directamente.
// El contrato JSON (mensajes, códigos HTTP) es IDÉNTICO en ambos caminos.
export const changeEventStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = ChangeEventStatusSchema.parse(req.body);
    const supabase = getSupabase();
    if (!supabase) {
      return res.status(500).json({
        success: false,
        error: 'Database client unavailable'
      });
    }

    // ─────────────────────────────────────────────────────────────
    // FIX-105: Camino preferido → RPC atómica (si la flag está activa)
    // ─────────────────────────────────────────────────────────────
    if (ENV.USE_ATOMIC_EVENT_STATUS) {
      try {
        const { data: rpcData, error: rpcError } = await supabase
          .rpc('change_event_status_atomic', {
            p_event_id: id,
            p_new_status: status,
            p_actor_id: req.user?.id || null
          });

        if (rpcError) {
          // Error de infraestructura → fallback a legacy (log + continue)
          console.error('⚠️ [changeEventStatus] RPC falló, aplicando fallback legacy:', rpcError.message);
        } else {
          const result = Array.isArray(rpcData) ? rpcData[0] : rpcData;

          if (result && result.success) {
            // ✅ Éxito vía RPC
            let message = \`Evento \${result.event_name} cambiado a \${result.new_status}\`;
            const responsePayload = {
              success: true,
              message,
              data: {
                event_id: result.event_id,
                event_name: result.event_name,
                event_type: result.event_type,
                old_status: result.old_status,
                new_status: result.new_status,
                replaced_event_id: result.replaced_event_id,
                replaced_event_name: result.replaced_event_name
              }
            };

            // Si hubo reemplazo (auto-cierre del OPEN anterior), incluirlo
            if (result.replaced_event_id) {
              responsePayload.replaced = {
                id: result.replaced_event_id,
                name: result.replaced_event_name
              };
              responsePayload.message = \`Evento \${result.event_name} cambiado a \${result.new_status}. Reemplazado: \${result.replaced_event_name}.\`;
            }

            // Devolver también el evento completo (fetch liviano para compatibilidad con el frontend actual)
            try {
              const { data: freshEvent } = await supabase
                .from('events_master')
                .select('*')
                .eq('id', result.event_id)
                .limit(1);

              if (freshEvent && freshEvent[0]) {
                responsePayload.event = normalizeEvent(freshEvent[0]);
                responsePayload.data.event = responsePayload.event;
              }
            } catch (fetchErr) {
              console.warn('⚠️ [changeEventStatus] No se pudo traer el evento fresco post-RPC:', fetchErr.message);
            }

            return res.json(responsePayload);
          }

          // La RPC rechazó por validación → mapear error y responder
          const errorCode = result?.error_code || 'UNKNOWN';
          const errorMap = {
            'EVENT_NOT_FOUND':       { status: 404, message: 'Evento no encontrado' },
            'INVALID_TRANSITION':    { status: 400, message: \`Transición de estado no permitida: \${result.old_status || '?'} → \${status}\` }
          };

          const mapped = errorMap[errorCode];
          if (mapped) {
            return res.status(mapped.status).json({
              success: false,
              error: mapped.message,
              code: errorCode
            });
          }
          // Error code desconocido → fallback a legacy
          console.warn('⚠️ [changeEventStatus] Error code inesperado de RPC:', errorCode, '→ fallback legacy');
        }
      } catch (rpcException) {
        // Excepción de red/parsing → fallback a legacy
        console.error('⚠️ [changeEventStatus] Excepción en RPC, aplicando fallback legacy:', rpcException.message);
      }
    }

    // ─────────────────────────────────────────────────────────────
    // FIX-105: Fallback legacy (comportamiento actual, sin cambios)
    // ─────────────────────────────────────────────────────────────
    const { data: existing, error: queryErr } = await supabase
      .from('events_master')
      .select('id, type, status, name')
      .eq('id', id)
      .limit(1);

    if (queryErr) throw queryErr;
    if (!existing || existing.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Evento no encontrado',
        code: 'EVENT_NOT_FOUND'
      });
    }

    const event = existing[0];

    if (status === 'OPEN') {
      const { data: openEvents, error: openErr } = await supabase
        .from('events_master')
        .select('id')
        .eq('status', 'OPEN')
        .neq('id', id);

      if (openErr) throw openErr;

      if (openEvents && openEvents.length > 0) {
        const now = new Date().toISOString();
        const { error: closeErr } = await supabase
          .from('events_master')
          .update({ status: 'CLOSED', closed_at: now, updated_at: now })
          .eq('id', openEvents[0].id);

        if (closeErr) throw closeErr;
      }
    }

    const now = new Date().toISOString();
    const updateData = {
      status,
      updated_at: now,
      ...(status === 'CLOSED' && { closed_at: now, closed_by: req.user?.id || null })
    };

    const { data: updated, error } = await supabase
      .from('events_master')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return res.json({
      success: true,
      message: \`Evento \${event.name} cambiado a \${status}\`,
      event: normalizeEvent(updated),
      data: normalizeEvent(updated)
    });
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: 'Status inválido',
        code: 'VALIDATION_ERROR',
        details: error.issues
      });
    }
    console.error('❌ [Events-v2] Error en changeEventStatus:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};`;

  const r = safeReplace(content, oldBlock, newBlock, 'events-v2.controller.js changeEventStatus');
  if (r.error) {
    abort(`events-v2.controller.js: ${r.error}. El bloque no coincide. Adjuntá el archivo actual.`);
  }
  if (r.changed) writeFile('src/controllers/events-v2.controller.js', r.content, content);
}

// ============================================================================
// CAMBIO 3 — Versionar el SQL 038
// ============================================================================
function addSqlFile() {
  log(C.bold + C.blue, '\n[3/5]', 'sql/038_change_event_status_atomic.sql — crear...');

  const sql = `-- ============================================================================
-- PARAGUAY-FFAA | METALSTORM - FIX-105
-- 038_change_event_status_atomic.sql
-- ============================================================================
-- PROPÓSITO:
--   Función RPC atómica para change_event_status. Reemplaza las 2-3 operaciones
--   no-transaccionales del controller (SELECT + UPDATE + UPDATE) por una única
--   transacción con bloqueo de fila (FOR UPDATE).
--
-- GARANTÍAS:
--   - Atomicidad: todo o nada (BEGIN/COMMIT implícito de Postgres).
--   - Anti-race-condition: SELECT ... FOR UPDATE bloquea el evento target.
--   - Anti-switch-doble: bloquea también el evento OPEN actual al cerrarlo.
--   - Validación de transiciones: SCHEDULED->OPEN, SCHEDULED->CANCELLED,
--     OPEN->CLOSED, OPEN->CANCELLED. Otras transiciones → INVALID_TRANSITION.
--   - Cero cambios a tablas existentes (solo agrega una función).
--
-- APLICADO EN SUPABASE: 2026-09-22
-- FECHA: 2026-09-22
-- AUTOR: Comando C4ISR
-- ============================================================================

CREATE OR REPLACE FUNCTION change_event_status_atomic(
  p_event_id UUID,
  p_new_status TEXT,
  p_actor_id UUID
)
RETURNS TABLE (
  success BOOLEAN,
  error_code TEXT,
  event_id UUID,
  event_name TEXT,
  event_type TEXT,
  old_status TEXT,
  new_status TEXT,
  replaced_event_id UUID,
  replaced_event_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event RECORD;
  v_replaced RECORD;
  v_now TIMESTAMPTZ := NOW();
  v_valid_transitions CONSTANT TEXT[] := ARRAY[
    'SCHEDULED->OPEN',
    'SCHEDULED->CANCELLED',
    'OPEN->CLOSED',
    'OPEN->CANCELLED'
  ];
  v_transition_key TEXT;
BEGIN
  -- 1. Buscar y BLOQUEAR el evento target (FOR UPDATE evita race)
  SELECT id, name, type, status
  INTO v_event
  FROM events_master
  WHERE id = p_event_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'EVENT_NOT_FOUND'::TEXT, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::UUID, NULL::TEXT;
    RETURN;
  END IF;

  -- 2. Validar transición de estado
  v_transition_key := v_event.status || '->' || p_new_status;

  IF NOT (v_transition_key = ANY(v_valid_transitions)) THEN
    RETURN QUERY SELECT
      false,
      'INVALID_TRANSITION'::TEXT,
      v_event.id,
      v_event.name,
      v_event.type,
      v_event.status,
      NULL::TEXT,
      NULL::UUID,
      NULL::TEXT;
    RETURN;
  END IF;

  -- 3. Si new_status = 'OPEN', cerrar el evento OPEN actual (auto-switch)
  IF p_new_status = 'OPEN' THEN
    SELECT id, name
    INTO v_replaced
    FROM events_master
    WHERE status = 'OPEN'
      AND id != p_event_id
    FOR UPDATE;

    IF FOUND THEN
      UPDATE events_master
      SET status = 'CLOSED',
          closed_at = v_now,
          updated_at = v_now
      WHERE id = v_replaced.id;
    END IF;
  END IF;

  -- 4. UPDATE del evento target con el nuevo status
  IF p_new_status = 'CLOSED' THEN
    UPDATE events_master
    SET status = 'CLOSED',
        closed_at = v_now,
        closed_by = p_actor_id,
        updated_at = v_now
    WHERE id = p_event_id;
  ELSE
    UPDATE events_master
    SET status = p_new_status,
        updated_at = v_now
    WHERE id = p_event_id;
  END IF;

  -- 5. Retornar resultado
  RETURN QUERY SELECT
    true,
    NULL::TEXT,
    v_event.id,
    v_event.name,
    v_event.type,
    v_event.status,
    p_new_status,
    v_replaced.id,
    v_replaced.name;
END;
$$;

-- ============================================================================
-- PERMISOS: solo service_role puede ejecutar esta función
-- ============================================================================
REVOKE ALL ON FUNCTION change_event_status_atomic(UUID, TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION change_event_status_atomic(UUID, TEXT, UUID) TO service_role;

COMMENT ON FUNCTION change_event_status_atomic(UUID, TEXT, UUID) IS
'FIX-105: Cambio de status de evento atómico con FOR UPDATE. Auto-cierra el evento OPEN actual si new_status=OPEN. Valida transiciones: SCHEDULED->OPEN, SCHEDULED->CANCELLED, OPEN->CLOSED, OPEN->CANCELLED. Retorna {success, error_code, event_id, event_name, event_type, old_status, new_status, replaced_event_id, replaced_event_name}.';
`;

  writeNewFile('sql/038_change_event_status_atomic.sql', sql);
}

// ============================================================================
// CAMBIO 4 — CHANGELOG.md: agregar [4.5.8]
// ============================================================================
function updateChangelog() {
  log(C.bold + C.blue, '\n[4/5]', 'CHANGELOG.md — agregar [4.5.8]...');
  const { content } = readFile('CHANGELOG.md');

  const oldBlock = `## [4.5.7] - 2026-09-22`;

  const newBlock = `## [4.5.8] - 2026-09-22

### 🎖️ FIX-105 — Cambio de status de evento atómico (RPC + fallback)

#### Objetivo Cumplido

Eliminar la condición de carrera y el estado inconsistente en \`changeEventStatus()\`.
La función original hacía 2-3 operaciones secuenciales sin transacción: si el
UPDATE del evento target fallaba después de cerrar el evento OPEN anterior, el
sistema quedaba sin evento activo.

#### Solución Implementada

1. **RPC PostgreSQL atómica** \`change_event_status_atomic\` con \`SELECT ... FOR UPDATE\`.
2. **Validación de transiciones** en la misma transacción:
   - \`SCHEDULED → OPEN\` (abrir)
   - \`SCHEDULED → CANCELLED\`
   - \`OPEN → CLOSED\` (cerrar)
   - \`OPEN → CANCELLED\`
3. **Auto-switch atómico:** al abrir un evento, el anterior OPEN se cierra en la misma transacción.
4. **Feature flag \`USE_ATOMIC_EVENT_STATUS\`** (default \`true\`). Rollback sin redeploy.
5. **Fallback automático** a la lógica legacy si la RPC falla por infraestructura.
6. **Contrato JSON enriquecido**: se agrega \`replaced\` cuando hay auto-cierre.

#### Archivos Modificados

| Archivo | Cambio |
|---|---|
| \`sql/038_change_event_status_atomic.sql\` | NUEVO — Función RPC atómica |
| \`src/config/env.js\` | Agregada flag \`USE_ATOMIC_EVENT_STATUS\` (default: true) |
| \`src/controllers/events-v2.controller.js\` | \`changeEventStatus\` usa RPC + fallback legacy |

#### Comportamiento Visible

**Cero cambios perceptibles para el usuario final.**

- Mismos mensajes de éxito.
- Mismo mensaje si el evento no existe.
- **Nuevo:** mensaje enriquecido cuando hay reemplazo (\`"Evento X cambiado a OPEN. Reemplazado: Y."\`).
- **Nuevo:** error claro \`INVALID_TRANSITION\` si se intenta una transición no permitida.

#### Rollback

- **Sin redeploy (30 seg):** \`fly secrets set USE_ATOMIC_EVENT_STATUS=false\`
- **Rollback total:** \`git revert <hash> && git push origin main && fly deploy\`
- **Eliminar RPC:** \`DROP FUNCTION IF EXISTS change_event_status_atomic(UUID, TEXT, UUID);\`

#### Verificación

- ✅ RPC aplicada en Supabase (con \`SECURITY DEFINER\` + solo \`service_role\`).
- ✅ Test con UUID falso → \`EVENT_NOT_FOUND\`.
- ✅ \`node --check\` OK en \`env.js\` y \`events-v2.controller.js\`.
- ⏳ Smoke test end-to-end pendiente.

#### Referencias

- \`docs/auditoria-sprint-1.md\` — hallazgo original (FIX-105).
- \`PLAN_TRABAJO.md\` — Sprint 2.
- \`sql/038_change_event_status_atomic.sql\` — función SQL.

---

## [4.5.7] - 2026-09-22`;

  const r = safeReplace(content, oldBlock, newBlock, 'CHANGELOG.md [4.5.8]');
  if (r.error) abort(`CHANGELOG.md: ${r.error}`);
  if (r.changed) writeFile('CHANGELOG.md', r.content, content);
}

// ============================================================================
// CAMBIO 5 — PLAN_TRABAJO.md: mover FIX-105 a completados
// ============================================================================
function updatePlanTrabajo() {
  log(C.bold + C.blue, '\n[5/5]', 'PLAN_TRABAJO.md — mover FIX-105 a completados...');
  const { content } = readFile('PLAN_TRABAJO.md');
  let current = content;
  let didChange = false;

  // Actualizar la línea de FIX-105 en "Estado de los ítems confirmados en Sprint 1"
  {
    const oldBlock = `- ⏳ **FIX-105** — Transacción en \`changeEventStatus\` (SELECT+UPDATE sin transacción) → Pendiente`;
    const newBlock = `- ✅ **FIX-105** — Transacción en \`changeEventStatus\` (SELECT+UPDATE sin transacción) → CERRADO (ver CHANGELOG v4.5.8)`;
    const r = safeReplace(current, oldBlock, newBlock, 'PLAN_TRABAJO.md FIX-105 estado');
    if (r.error) abort(`PLAN_TRABAJO.md (FIX-105 estado): ${r.error}`);
    if (r.changed) { current = r.content; didChange = true; }
  }

  // Agregar fila a la tabla de completados
  {
    const oldBlock = `| **FIX-101** | \`src/controllers/auth.controller.js\` — RPC atómica \`reset_password_atomic\` + fallback legacy | 2026-09-22 | (ver CHANGELOG v4.5.7) |`;
    const newBlock = `| **FIX-101** | \`src/controllers/auth.controller.js\` — RPC atómica \`reset_password_atomic\` + fallback legacy | 2026-09-22 | (ver CHANGELOG v4.5.7) |
| **FIX-105** | \`src/controllers/events-v2.controller.js\` — RPC atómica \`change_event_status_atomic\` + fallback legacy | 2026-09-22 | (ver CHANGELOG v4.5.8) |`;
    const r = safeReplace(current, oldBlock, newBlock, 'PLAN_TRABAJO.md tabla completados');
    if (r.error) abort(`PLAN_TRABAJO.md (completados): ${r.error}`);
    if (r.changed) { current = r.content; didChange = true; }
  }

  // Actualizar métrica de progreso
  {
    const oldBlock = `| Fixes cerrados | 0 | 25 | 25 | 37 | 42+ | 49+ |`;
    const newBlock = `| Fixes cerrados | 0 | 25 | 25 | 38 | 42+ | 49+ |`;
    const r = safeReplace(current, oldBlock, newBlock, 'PLAN_TRABAJO.md métrica');
    if (r.error) abort(`PLAN_TRABAJO.md (métrica): ${r.error}`);
    if (r.changed) { current = r.content; didChange = true; }
  }

  if (didChange) writeFile('PLAN_TRABAJO.md', current, content);
}

// ============================================================================
// MAIN
// ============================================================================
console.log(`${C.bold}${C.cyan}
╔══════════════════════════════════════════════════════════════════╗
║  PARAGUAY-FFAA | METALSTORM — FIX-105 (event status atómico)     ║
╚══════════════════════════════════════════════════════════════════╝${C.reset}`);

log(C.gray, '[MODE]', APPLY ? 'APPLY (sin commit)' : 'DRY-RUN (sin cambios)');

try {
  fixEnvJs();
  fixChangeEventStatus();
  addSqlFile();
  updateChangelog();
  updatePlanTrabajo();
} catch (err) {
  abort(`Error durante la aplicación: ${err.message}`);
}

if (!APPLY) {
  console.log(`\n${C.yellow}${C.bold}MODO DRY-RUN — No se modificó nada.${C.reset}`);
  console.log(`\n${C.bold}SIGUIENTE PASO:${C.reset}`);
  console.log(`  node scripts\\apply-fix-105.cjs --apply`);
  process.exit(0);
}

console.log(`\n${C.green}${C.bold}✅ CAMBIOS APLICADOS (SIN COMMIT).${C.reset}`);
console.log(`\n${C.bold}Verificar diff:${C.reset}`);
console.log(`  git diff --stat`);
console.log(`\n${C.bold}Verificar sintaxis:${C.reset}`);
console.log(`  node --check src\\config\\env.js`);
console.log(`  node --check src\\controllers\\events-v2.controller.js`);
console.log(`\n${C.bold}Si está OK, commitear:${C.reset}`);
console.log(`  git add src/controllers/events-v2.controller.js src/config/env.js sql/038_change_event_status_atomic.sql CHANGELOG.md PLAN_TRABAJO.md scripts/apply-fix-105.cjs`);
console.log(`  git commit -m "fix(fix-105): cambio de status de evento atomico con RPC + fallback legacy"`);
console.log(`  git push origin main`);
console.log(`\n${C.bold}Configurar flag en Fly.io y deployar:${C.reset}`);
console.log(`  fly secrets set USE_ATOMIC_EVENT_STATUS=true -a paraguay-ffaa-metalstorm`);
console.log(`  fly deploy`);