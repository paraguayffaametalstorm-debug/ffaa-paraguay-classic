/**
 * ============================================================================
 * PARAGUAY-FFAA | METALSTORM
 * HELPER DE VENTANAS DE CARGA — ADR-008
 * ============================================================================
 * Funciones puras para validar si la ventana de carga de un evento está abierta.
 * No accede a BD ni tiene efectos secundarios → 100% testeable.
 *
 * Reglas (ADR-008):
 *   - SQ: ventana de 7 días (Jue 09:00 PY → Jue 08:59 PY).
 *   - BM: ventana de 6 días (Mié 17:00 PY → Mar 16:59 PY).
 *   - Cierre automático por deadline.
 *
 * Referencias:
 *   - docs/adr/ADR-008-ventanas-carga-desacopladas.md
 *   - src/utils/eventScheduler.js (calculateSubmissionWindow)
 *
 * Versión: v1.0
 * Fecha: 2026-09-20
 * Autor: PJPIROVANI (OWNER)
 * ============================================================================
 */

/**
 * Valida si la ventana de carga de un evento está abierta.
 *
 * @param {Object} event - Fila de events_master con:
 *   - id (UUID)
 *   - status ('OPEN' | 'CLOSED' | 'CANCELLED' | 'SCHEDULED')
 *   - submission_opens_at (ISO string o null)
 *   - submission_closes_at (ISO string o null)
 * @returns {{
 *   valid: boolean,
 *   code?: string,
 *   message?: string,
 *   details?: Object
 * }}
 *
 * Códigos de error posibles:
 *   - SUBMISSION_WINDOW_NOT_SET   → sin fechas de ventana configuradas.
 *   - EVENT_CANCELLED              → evento CANCELLED (no acepta cargas).
 *   - SUBMISSION_WINDOW_NOT_OPEN  → ventana aún no abierta.
 *   - SUBMISSION_WINDOW_CLOSED    → ventana ya cerrada.
 */
export function validateSubmissionWindow(event) {
  if (!event) {
    return {
      valid: false,
      code: 'EVENT_NOT_FOUND',
      message: 'Evento no encontrado.'
    };
  }

  // Guardia 1: evento CANCELLED
  if (event.status === 'CANCELLED') {
    return {
      valid: false,
      code: 'EVENT_CANCELLED',
      message: 'Este evento fue cancelado. No acepta cargas.',
      details: { event_id: event.id }
    };
  }

  // Guardia 2: sin ventana configurada
  if (!event.submission_opens_at || !event.submission_closes_at) {
    return {
      valid: false,
      code: 'SUBMISSION_WINDOW_NOT_SET',
      message: 'Este evento no tiene ventana de carga configurada.',
      details: { event_id: event.id }
    };
  }

  const now = new Date();
  const opensAt = new Date(event.submission_opens_at);
  const closesAt = new Date(event.submission_closes_at);

  // Guardia 3: fechas inválidas
  if (Number.isNaN(opensAt.getTime()) || Number.isNaN(closesAt.getTime())) {
    return {
      valid: false,
      code: 'SUBMISSION_WINDOW_INVALID',
      message: 'La ventana de carga tiene fechas inválidas.',
      details: {
        event_id: event.id,
        submission_opens_at: event.submission_opens_at,
        submission_closes_at: event.submission_closes_at
      }
    };
  }

  // Guardia 4: ventana no abierta aún
  if (now < opensAt) {
    return {
      valid: false,
      code: 'SUBMISSION_WINDOW_NOT_OPEN',
      message: `La ventana de carga abre el ${opensAt.toISOString()}`,
      details: {
        event_id: event.id,
        opens_at: event.submission_opens_at,
        seconds_until_open: Math.floor((opensAt - now) / 1000)
      }
    };
  }

  // Guardia 5: ventana cerrada
  if (now > closesAt) {
    return {
      valid: false,
      code: 'SUBMISSION_WINDOW_CLOSED',
      message: `La ventana de carga cerró el ${closesAt.toISOString()}`,
      details: {
        event_id: event.id,
        closed_at: event.submission_closes_at,
        seconds_since_close: Math.floor((now - closesAt) / 1000)
      }
    };
  }

  // Todo OK
  return { valid: true };
}

/**
 * Devuelve el estado de la ventana de carga con info útil para el frontend.
 * NO valida si el evento es editable, solo describe la ventana.
 *
 * @param {Object} event - Fila de events_master
 * @returns {{
 *   status: 'NOT_SET' | 'NOT_OPEN' | 'OPEN' | 'CLOSED',
 *   submission_opens_at: string|null,
 *   submission_closes_at: string|null,
 *   seconds_remaining: number,
 *   seconds_until_open: number,
 *   can_submit: boolean
 * }}
 */
export function getSubmissionWindowStatus(event) {
  if (!event) {
    return {
      status: 'NOT_SET',
      submission_opens_at: null,
      submission_closes_at: null,
      seconds_remaining: 0,
      seconds_until_open: 0,
      can_submit: false
    };
  }

  const opensAt = event.submission_opens_at ? new Date(event.submission_opens_at) : null;
  const closesAt = event.submission_closes_at ? new Date(event.submission_closes_at) : null;

  if (!opensAt || !closesAt || Number.isNaN(opensAt.getTime()) || Number.isNaN(closesAt.getTime())) {
    return {
      status: 'NOT_SET',
      submission_opens_at: event.submission_opens_at || null,
      submission_closes_at: event.submission_closes_at || null,
      seconds_remaining: 0,
      seconds_until_open: 0,
      can_submit: false
    };
  }

  const now = new Date();
  const isCancelled = event.status === 'CANCELLED';

  if (now < opensAt) {
    return {
      status: 'NOT_OPEN',
      submission_opens_at: opensAt.toISOString(),
      submission_closes_at: closesAt.toISOString(),
      seconds_remaining: 0,
      seconds_until_open: Math.floor((opensAt - now) / 1000),
      can_submit: false
    };
  }

  if (now > closesAt) {
    return {
      status: 'CLOSED',
      submission_opens_at: opensAt.toISOString(),
      submission_closes_at: closesAt.toISOString(),
      seconds_remaining: 0,
      seconds_until_open: 0,
      can_submit: false
    };
  }

  // Ventana abierta
  return {
    status: 'OPEN',
    submission_opens_at: opensAt.toISOString(),
    submission_closes_at: closesAt.toISOString(),
    seconds_remaining: Math.floor((closesAt - now) / 1000),
    seconds_until_open: 0,
    can_submit: !isCancelled
  };
}