-- ============================================================================
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