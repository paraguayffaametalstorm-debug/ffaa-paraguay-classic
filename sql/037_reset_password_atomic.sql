-- ============================================================================
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
  -- ─────────────────────────────────────────────────────────────
  -- 1. Buscar y BLOQUEAR el token (FOR UPDATE evita race conditions)
  -- ─────────────────────────────────────────────────────────────
  SELECT * INTO v_reset
  FROM password_resets
  WHERE token = p_token
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'TOKEN_NOT_FOUND'::TEXT, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::INTEGER, NULL::TEXT, NULL::INTEGER;
    RETURN;
  END IF;

  -- ─────────────────────────────────────────────────────────────
  -- 2. Verificar que no esté usado
  -- ─────────────────────────────────────────────────────────────
  IF v_reset.used = true THEN
    RETURN QUERY SELECT false, 'TOKEN_ALREADY_USED'::TEXT, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::INTEGER, NULL::TEXT, NULL::INTEGER;
    RETURN;
  END IF;

  -- ─────────────────────────────────────────────────────────────
  -- 3. Verificar que no haya expirado
  -- ─────────────────────────────────────────────────────────────
  IF v_now > v_reset.expires_at THEN
    RETURN QUERY SELECT false, 'TOKEN_EXPIRED'::TEXT, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::INTEGER, NULL::TEXT, NULL::INTEGER;
    RETURN;
  END IF;

  -- ─────────────────────────────────────────────────────────────
  -- 4. Buscar usuario (también con FOR UPDATE para evitar carreras)
  -- ─────────────────────────────────────────────────────────────
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

  -- ─────────────────────────────────────────────────────────────
  -- 5. UPDATE users (atómico, dentro de la misma transacción)
  -- ─────────────────────────────────────────────────────────────
  UPDATE users
  SET
    password_hash = p_new_password_hash,
    must_change_password = false,
    temporary_password_expires_at = NULL,
    token_version = v_new_token_version,
    updated_at = v_now
  WHERE id = v_user.id;

  -- ─────────────────────────────────────────────────────────────
  -- 6. UPDATE password_resets (atómico, dentro de la misma transacción)
  -- ─────────────────────────────────────────────────────────────
  UPDATE password_resets
  SET used = true
  WHERE id = v_reset.id;

  -- ─────────────────────────────────────────────────────────────
  -- 7. Retornar éxito con datos del usuario
  -- ─────────────────────────────────────────────────────────────
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