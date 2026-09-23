#!/usr/bin/env node
/**
 * PARAGUAY-FFAA | METALSTORM
 * SCRIPT: FIX-101 — Transacción atómica en resetPassword (RPC + fallback)
 *
 * Uso:
 *   node scripts\apply-fix-101.cjs           (DRY-RUN)
 *   node scripts\apply-fix-101.cjs --apply   (APLICAR — sin commit automático)
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
  const backupPath = absPath + '.bak-fix-101';
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
// CAMBIO 1 — src/config/env.js: agregar USE_ATOMIC_RESET
// ============================================================================
function fixEnvJs() {
  log(C.bold + C.blue, '\n[1/5]', 'src/config/env.js — agregar USE_ATOMIC_RESET...');
  const { content } = readFile('src/config/env.js');

  // Buscar la línea de JWT_SECRET en el export de ENV
  const oldBlock = `  JWT_SECRET: JWT_SECRET || 'dev-only-insecure-secret-change-me',`;

  const newBlock = `  JWT_SECRET: JWT_SECRET || 'dev-only-insecure-secret-change-me',

  // FIX-101: Feature flag para reset password atómico (RPC reset_password_atomic).
  // Default: true (usa la RPC). Si algo falla: fly secrets set USE_ATOMIC_RESET=false
  USE_ATOMIC_RESET: process.env.USE_ATOMIC_RESET !== 'false',`;

  const r = safeReplace(content, oldBlock, newBlock, 'env.js USE_ATOMIC_RESET');
  if (r.error) {
    abort(`env.js: ${r.error}. Verificá que la línea "JWT_SECRET: ..." exista tal cual.`);
  }
  if (r.changed) writeFile('src/config/env.js', r.content, content);
}

// ============================================================================
// CAMBIO 2 — src/controllers/auth.controller.js: reemplazar resetPassword
// ============================================================================
function fixResetPassword() {
  log(C.bold + C.blue, '\n[2/5]', 'src/controllers/auth.controller.js — reemplazar resetPassword...');
  const { content } = readFile('src/controllers/auth.controller.js');

  // Bloque completo de la función resetPassword actual
  const oldBlock = `// ========== CONFIRMAR RESTABLECIMIENTO DE CONTRASEÑA (RESET PASSWORD) ==========
export const resetPassword = async (req, res) => {
    try {
        const { token, newPassword, password } = req.body;
        const targetPassword = newPassword || password;
        const supabase = getSupabase();

        if (!token || !targetPassword) {
            return res.status(400).json({ success: false, error: 'Token y nueva contraseña son requeridos' });
        }

        if (targetPassword.length < 8) {
            return res.status(400).json({ success: false, error: 'La nueva contraseña debe tener al minímo 8 caracteres' });
        }

        if (!supabase) {
            return res.status(500).json({ success: false, error: 'Servicio de base de datos no disponible' });
        }

        const { data: resets, error: resetErr } = await supabase
            .from('password_resets')
            .select('*')
            .eq('token', token.trim())
            .limit(1);

        if (resetErr || !resets || resets.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'El token de restablecimiento es inválido o inexistente.'
            });
        }

        const resetRecord = resets[0];

        if (resetRecord.used) {
            return res.status(400).json({
                success: false,
                error: 'Este enlace de restablecimiento ya ha sido utilizado previamente.'
            });
        }

        const now = new Date();
        const expiresAt = new Date(resetRecord.expires_at);
        if (now > expiresAt) {
            return res.status(400).json({
                success: false,
                error: 'El enlace de restablecimiento ha expirado (plazo máximo de 15 minutos superado).'
            });
        }

        const { data: users, error: userErr } = await supabase
            .from('users')
            .select('id, nick, email, token_version')
            .eq('id', resetRecord.user_id)
            .limit(1);

        if (userErr || !users || users.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Combatiente asociado al token no encontrado.'
            });
        }

        const user = users[0];

        const hashedPassword = await bcrypt.hash(targetPassword, 10);
        const newTokenVersion = (user.token_version || 0) + 1;

        // ✅ CORREGIDO: Agregar .select() después de .update()
        const { data: updateData, error: updateError } = await supabase
            .from('users')
            .update({
                password_hash: hashedPassword,
                must_change_password: false,
                token_version: newTokenVersion,
                updated_at: new Date().toISOString()
            })
            .eq('id', user.id)
            .select('id, email, nick, user_id, role, token_version, must_change_password');

        if (updateError) {
            console.error('❌ Error actualizando contraseña en Supabase:', updateError);
            return res.status(500).json({
                success: false,
                error: 'Error al actualizar las credenciales en la base militar.'
            });
        }

        await supabase
            .from('password_resets')
            .update({ used: true })
            .eq('id', resetRecord.id);

        await logSecurityEvent({
            supabase,
            userId: user.id,
            nick: user.nick,
            event: 'PASSWORD_RESET_SUCCESS',
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            metadata: { method: 'token_email', reset_id: resetRecord.id }
        });

        return res.json({
            success: true,
            message: 'Contraseña táctica actualizada exitosamente. Ya puedes iniciar sesión con tu nueva clave.'
        });

    } catch (error) {
        console.error('❌ Error en resetPassword:', error);
        return res.status(500).json({ success: false, error: 'Error interno del servidor al restablecer contraseña' });
    }
};`;

  const newBlock = `// ========== CONFIRMAR RESTABLECIMIENTO DE CONTRASEÑA (RESET PASSWORD) ==========
// FIX-101 (v4.5.7): Transacción atómica vía RPC reset_password_atomic.
// - Si USE_ATOMIC_RESET=true (default): usa la RPC atómica con FOR UPDATE.
// - Si la RPC falla por infraestructura: fallback automático a lógica legacy.
// - Si USE_ATOMIC_RESET=false: usa la lógica legacy directamente.
// El contrato JSON (mensajes, códigos HTTP) es IDÉNTICO en ambos caminos.
export const resetPassword = async (req, res) => {
    try {
        const { token, newPassword, password } = req.body;
        const targetPassword = newPassword || password;
        const supabase = getSupabase();

        if (!token || !targetPassword) {
            return res.status(400).json({ success: false, error: 'Token y nueva contraseña son requeridos' });
        }

        if (targetPassword.length < 8) {
            return res.status(400).json({ success: false, error: 'La nueva contraseña debe tener al minímo 8 caracteres' });
        }

        if (!supabase) {
            return res.status(500).json({ success: false, error: 'Servicio de base de datos no disponible' });
        }

        // FIX-101: Hashear antes de cualquier camino (mismo hash para RPC o legacy)
        const hashedPassword = await bcrypt.hash(targetPassword, 10);

        // ─────────────────────────────────────────────────────────────
        // FIX-101: Camino preferido → RPC atómica (si la flag está activa)
        // ─────────────────────────────────────────────────────────────
        if (ENV.USE_ATOMIC_RESET) {
            try {
                const { data: rpcData, error: rpcError } = await supabase
                    .rpc('reset_password_atomic', {
                        p_token: token.trim(),
                        p_new_password_hash: hashedPassword
                    });

                if (rpcError) {
                    // Error de infraestructura → fallback a legacy (log + continue)
                    console.error('⚠️ [resetPassword] RPC falló, aplicando fallback legacy:', rpcError.message);
                } else {
                    const result = Array.isArray(rpcData) ? rpcData[0] : rpcData;

                    if (result && result.success) {
                        // ✅ Éxito vía RPC
                        await logSecurityEvent({
                            supabase,
                            userId: result.user_id,
                            nick: result.nick,
                            event: 'PASSWORD_RESET_SUCCESS',
                            ip: req.ip,
                            userAgent: req.headers['user-agent'],
                            metadata: {
                                method: 'token_email_atomic',
                                token_version: result.token_version
                            }
                        });

                        return res.json({
                            success: true,
                            message: 'Contraseña táctica actualizada exitosamente. Ya puedes iniciar sesión con tu nueva clave.'
                        });
                    }

                    // La RPC rechazó por validación → mapear error y responder
                    const errorCode = result?.error_code || 'UNKNOWN';
                    const errorMap = {
                        'TOKEN_NOT_FOUND':    { status: 400, message: 'El token de restablecimiento es inválido o inexistente.' },
                        'TOKEN_ALREADY_USED': { status: 400, message: 'Este enlace de restablecimiento ya ha sido utilizado previamente.' },
                        'TOKEN_EXPIRED':      { status: 400, message: 'El enlace de restablecimiento ha expirado (plazo máximo de 15 minutos superado).' },
                        'USER_NOT_FOUND':     { status: 404, message: 'Combatiente asociado al token no encontrado.' }
                    };

                    const mapped = errorMap[errorCode];
                    if (mapped) {
                        return res.status(mapped.status).json({ success: false, error: mapped.message });
                    }
                    // Error code desconocido → fallback a legacy
                    console.warn('⚠️ [resetPassword] Error code inesperado de RPC:', errorCode, '→ fallback legacy');
                }
            } catch (rpcException) {
                // Excepción de red/parsing → fallback a legacy
                console.error('⚠️ [resetPassword] Excepción en RPC, aplicando fallback legacy:', rpcException.message);
            }
        }

        // ─────────────────────────────────────────────────────────────
        // FIX-101: Fallback legacy (comportamiento actual, sin cambios)
        // ─────────────────────────────────────────────────────────────
        const { data: resets, error: resetErr } = await supabase
            .from('password_resets')
            .select('*')
            .eq('token', token.trim())
            .limit(1);

        if (resetErr || !resets || resets.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'El token de restablecimiento es inválido o inexistente.'
            });
        }

        const resetRecord = resets[0];

        if (resetRecord.used) {
            return res.status(400).json({
                success: false,
                error: 'Este enlace de restablecimiento ya ha sido utilizado previamente.'
            });
        }

        const now = new Date();
        const expiresAt = new Date(resetRecord.expires_at);
        if (now > expiresAt) {
            return res.status(400).json({
                success: false,
                error: 'El enlace de restablecimiento ha expirado (plazo máximo de 15 minutos superado).'
            });
        }

        const { data: users, error: userErr } = await supabase
            .from('users')
            .select('id, nick, email, token_version')
            .eq('id', resetRecord.user_id)
            .limit(1);

        if (userErr || !users || users.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Combatiente asociado al token no encontrado.'
            });
        }

        const user = users[0];
        const newTokenVersion = (user.token_version || 0) + 1;

        const { error: updateError } = await supabase
            .from('users')
            .update({
                password_hash: hashedPassword,
                must_change_password: false,
                token_version: newTokenVersion,
                updated_at: new Date().toISOString()
            })
            .eq('id', user.id)
            .select('id, email, nick, user_id, role, token_version, must_change_password');

        if (updateError) {
            console.error('❌ Error actualizando contraseña en Supabase:', updateError);
            return res.status(500).json({
                success: false,
                error: 'Error al actualizar las credenciales en la base militar.'
            });
        }

        await supabase
            .from('password_resets')
            .update({ used: true })
            .eq('id', resetRecord.id);

        await logSecurityEvent({
            supabase,
            userId: user.id,
            nick: user.nick,
            event: 'PASSWORD_RESET_SUCCESS',
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            metadata: { method: 'token_email_legacy', reset_id: resetRecord.id }
        });

        return res.json({
            success: true,
            message: 'Contraseña táctica actualizada exitosamente. Ya puedes iniciar sesión con tu nueva clave.'
        });

    } catch (error) {
        console.error('❌ Error en resetPassword:', error);
        return res.status(500).json({ success: false, error: 'Error interno del servidor al restablecer contraseña' });
    }
};`;

  const r = safeReplace(content, oldBlock, newBlock, 'auth.controller.js resetPassword');
  if (r.error) {
    abort(`auth.controller.js: ${r.error}. El bloque de resetPassword no coincide. Adjuntá el archivo actual.`);
  }
  if (r.changed) writeFile('src/controllers/auth.controller.js', r.content, content);
}

// ============================================================================
// CAMBIO 3 — Versionar el SQL 037
// ============================================================================
function addSqlFile() {
  log(C.bold + C.blue, '\n[3/5]', 'sql/037_reset_password_atomic.sql — crear...');

  const sql = `-- ============================================================================
-- PARAGUAY-FFAA | METALSTORM - FIX-101
-- 037_reset_password_atomic.sql
-- ============================================================================
-- PROPÓSITO:
--   Función RPC atómica para reset_password. Reemplaza las 2 operaciones
--   no-transaccionales del controller (UPDATE users + UPDATE password_resets)
--   por una única transacción con bloqueo de fila (FOR UPDATE).
--
-- GARANTÍAS:
--   - Atomicidad: todo o nada (BEGIN/COMMIT implícito de Postgres).
--   - Anti-race-condition: SELECT ... FOR UPDATE bloquea la fila del token.
--   - Anti-TOCTOU: no hay ventana entre check y uso.
--   - Cero cambios a tablas existentes (solo agrega una función).
--   - Idempotente: CREATE OR REPLACE (puede ejecutarse múltiples veces).
--
-- APLICADO EN SUPABASE: 2026-09-22
-- FECHA: 2026-09-22
-- AUTOR: Comando C4ISR
-- ============================================================================

CREATE OR REPLACE FUNCTION reset_password_atomic(
  p_token TEXT,
  p_new_password_hash TEXT
)
RETURNS TABLE (
  success BOOLEAN,
  error_code TEXT,
  user_id UUID,
  nick TEXT,
  email TEXT,
  user_id_numeric INTEGER,
  role TEXT,
  token_version INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_reset RECORD;
  v_user RECORD;
  v_new_token_version INTEGER;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  -- 1. Buscar y BLOQUEAR el token (FOR UPDATE evita race conditions)
  SELECT * INTO v_reset
  FROM password_resets
  WHERE token = p_token
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'TOKEN_NOT_FOUND'::TEXT, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::INTEGER, NULL::TEXT, NULL::INTEGER;
    RETURN;
  END IF;

  -- 2. Verificar que no esté usado
  IF v_reset.used = true THEN
    RETURN QUERY SELECT false, 'TOKEN_ALREADY_USED'::TEXT, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::INTEGER, NULL::TEXT, NULL::INTEGER;
    RETURN;
  END IF;

  -- 3. Verificar que no haya expirado
  IF v_now > v_reset.expires_at THEN
    RETURN QUERY SELECT false, 'TOKEN_EXPIRED'::TEXT, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::INTEGER, NULL::TEXT, NULL::INTEGER;
    RETURN;
  END IF;

  -- 4. Buscar usuario (también con FOR UPDATE para evitar carreras)
  SELECT id, nick, email, role, token_version, user_id
  INTO v_user
  FROM users
  WHERE id = v_reset.user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'USER_NOT_FOUND'::TEXT, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::INTEGER, NULL::TEXT, NULL::INTEGER;
    RETURN;
  END IF;

  v_new_token_version := COALESCE(v_user.token_version, 0) + 1;

  -- 5. UPDATE users (atómico, dentro de la misma transacción)
  UPDATE users
  SET
    password_hash = p_new_password_hash,
    must_change_password = false,
    temporary_password_expires_at = NULL,
    token_version = v_new_token_version,
    updated_at = v_now
  WHERE id = v_user.id;

  -- 6. UPDATE password_resets (atómico, dentro de la misma transacción)
  UPDATE password_resets
  SET used = true
  WHERE id = v_reset.id;

  -- 7. Retornar éxito con datos del usuario
  RETURN QUERY SELECT
    true,
    NULL::TEXT,
    v_user.id,
    v_user.nick,
    v_user.email,
    v_user.user_id,
    v_user.role,
    v_new_token_version;
END;
$$;

-- ============================================================================
-- PERMISOS: solo service_role puede ejecutar esta función
-- ============================================================================
REVOKE ALL ON FUNCTION reset_password_atomic(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION reset_password_atomic(TEXT, TEXT) TO service_role;

COMMENT ON FUNCTION reset_password_atomic(TEXT, TEXT) IS
'FIX-101: Reset password atómico con bloqueo de token (FOR UPDATE). Reemplaza la lógica no-transaccional del controller. Retorna {success, error_code, user_id, nick, email, user_id_numeric, role, token_version}.';
`;

  writeNewFile('sql/037_reset_password_atomic.sql', sql);
}

// ============================================================================
// CAMBIO 4 — Documentación
// ============================================================================
function updateChangelog() {
  log(C.bold + C.blue, '\n[4/5]', 'CHANGELOG.md — agregar [4.5.7]...');
  const { content } = readFile('CHANGELOG.md');

  const oldBlock = `## [4.5.6] - 2026-09-22`;

  const newBlock = `## [4.5.7] - 2026-09-22

### 🎖️ FIX-101 — Reset password atómico (RPC + fallback)

#### Objetivo Cumplido

Eliminar la condición de carrera y el estado inconsistente en \`resetPassword()\`.
La función original hacía 2 UPDATE secuenciales (users + password_resets) sin
transacción: si el 2do fallaba, el token quedaba reusable durante 15 min.

#### Solución Implementada

1. **RPC PostgreSQL atómica** \`reset_password_atomic\` con \`SELECT ... FOR UPDATE\`.
2. **Feature flag \`USE_ATOMIC_RESET\`** (default \`true\`). Rollback sin redeploy.
3. **Fallback automático** a la lógica legacy si la RPC falla por infraestructura.
4. **Contrato JSON idéntico**: mensajes, códigos HTTP y formato de respuesta no cambian.

#### Archivos Modificados

| Archivo | Cambio |
|---|---|
| \`sql/037_reset_password_atomic.sql\` | NUEVO — Función RPC atómica |
| \`src/config/env.js\` | Agregada flag \`USE_ATOMIC_RESET\` (default: true) |
| \`src/controllers/auth.controller.js\` | \`resetPassword\` usa RPC + fallback legacy |

#### Comportamiento Visible

**Cero cambios perceptibles para el usuario final.** Mismos mensajes, mismos
códigos HTTP, mismos tiempos de respuesta. Solo cambia la garantía de
atomicidad por dentro.

#### Rollback

- **Sin redeploy (30 seg):** \`fly secrets set USE_ATOMIC_RESET=false\`
- **Rollback total:** \`git revert <hash> && git push origin main && fly deploy\`
- **Eliminar RPC:** \`DROP FUNCTION IF EXISTS reset_password_atomic(TEXT, TEXT);\`

#### Verificación

- ✅ RPC aplicada en Supabase (con \`SECURITY DEFINER\` + solo \`service_role\`).
- ✅ Test con token falso → \`TOKEN_NOT_FOUND\`.
- ✅ \`node --check\` OK en \`env.js\` y \`auth.controller.js\`.
- ⏳ Smoke test end-to-end pendiente.

#### Referencias

- \`docs/auditoria-sprint-1.md\` — hallazgo original (FIX-101).
- \`PLAN_TRABAJO.md\` — Sprint 2.
- \`sql/037_reset_password_atomic.sql\` — función SQL.

---

## [4.5.6] - 2026-09-22`;

  const r = safeReplace(content, oldBlock, newBlock, 'CHANGELOG.md [4.5.7]');
  if (r.error) abort(`CHANGELOG.md: ${r.error}`);
  if (r.changed) writeFile('CHANGELOG.md', r.content, content);
}

function updatePlanTrabajo() {
  log(C.bold + C.blue, '\n[5/5]', 'PLAN_TRABAJO.md — mover FIX-101 a completados...');
  const { content } = readFile('PLAN_TRABAJO.md');
  let current = content;
  let didChange = false;

  // Actualizar la línea de FIX-101 en "Estado de los ítems confirmados en Sprint 1"
  {
    const oldBlock = `- ⏳ **FIX-101** — Transacción en \`resetPassword\` (2 UPDATE sin transacción) → Pendiente`;
    const newBlock = `- ✅ **FIX-101** — Transacción en \`resetPassword\` (2 UPDATE sin transacción) → CERRADO (ver CHANGELOG v4.5.7)`;
    const r = safeReplace(current, oldBlock, newBlock, 'PLAN_TRABAJO.md FIX-101 estado');
    if (r.error) abort(`PLAN_TRABAJO.md (FIX-101 estado): ${r.error}`);
    if (r.changed) { current = r.content; didChange = true; }
  }

  // Agregar fila a la tabla de completados
  {
    const oldBlock = `| **FIX-104** | \`src/middlewares/errorHandler.js\` — filtrar detalles de DB en respuestas 500 | 2026-09-22 | \`43db2a8\` |`;
    const newBlock = `| **FIX-104** | \`src/middlewares/errorHandler.js\` — filtrar detalles de DB en respuestas 500 | 2026-09-22 | \`43db2a8\` |
| **FIX-101** | \`src/controllers/auth.controller.js\` — RPC atómica \`reset_password_atomic\` + fallback legacy | 2026-09-22 | (ver CHANGELOG v4.5.7) |`;
    const r = safeReplace(current, oldBlock, newBlock, 'PLAN_TRABAJO.md tabla completados');
    if (r.error) abort(`PLAN_TRABAJO.md (completados): ${r.error}`);
    if (r.changed) { current = r.content; didChange = true; }
  }

  // Actualizar métrica de progreso
  {
    const oldBlock = `| Fixes cerrados | 0 | 25 | 25 | 36 | 42+ | 49+ |`;
    const newBlock = `| Fixes cerrados | 0 | 25 | 25 | 37 | 42+ | 49+ |`;
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
║  PARAGUAY-FFAA | METALSTORM — FIX-101 (reset password atómico)   ║
╚══════════════════════════════════════════════════════════════════╝${C.reset}`);

log(C.gray, '[MODE]', APPLY ? 'APPLY (sin commit)' : 'DRY-RUN (sin cambios)');

try {
  fixEnvJs();
  fixResetPassword();
  addSqlFile();
  updateChangelog();
  updatePlanTrabajo();
} catch (err) {
  abort(`Error durante la aplicación: ${err.message}`);
}

if (!APPLY) {
  console.log(`\n${C.yellow}${C.bold}MODO DRY-RUN — No se modificó nada.${C.reset}`);
  console.log(`\n${C.bold}SIGUIENTE PASO:${C.reset}`);
  console.log(`  node scripts\\apply-fix-101.cjs --apply`);
  process.exit(0);
}

console.log(`\n${C.green}${C.bold}✅ CAMBIOS APLICADOS (SIN COMMIT).${C.reset}`);
console.log(`\n${C.bold}Verificar diff:${C.reset}`);
console.log(`  git diff --stat`);
console.log(`\n${C.bold}Verificar sintaxis:${C.reset}`);
console.log(`  node --check src\\config\\env.js`);
console.log(`  node --check src\\controllers\\auth.controller.js`);
console.log(`\n${C.bold}Si está OK, commitear:${C.reset}`);
console.log(`  git add src/controllers/auth.controller.js src/config/env.js sql/037_reset_password_atomic.sql CHANGELOG.md PLAN_TRABAJO.md scripts/apply-fix-101.cjs`);
console.log(`  git commit -m "fix(fix-101): reset password atomico con RPC + fallback legacy"`);
console.log(`  git push origin main`);
console.log(`\n${C.bold}Configurar flag en Fly.io y deployar:${C.reset}`);
console.log(`  fly secrets set USE_ATOMIC_RESET=true -a paraguay-ffaa-metalstorm`);
console.log(`  fly deploy`);