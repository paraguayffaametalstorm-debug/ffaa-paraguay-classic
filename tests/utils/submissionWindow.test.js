/**
 * ============================================================================
 * PARAGUAY-FFAA | METALSTORM
 * Tests del helper submissionWindow — ADR-008
 * ============================================================================
 * Cubre las 2 funciones puras del helper:
 *   - validateSubmissionWindow(event)
 *   - getSubmissionWindowStatus(event)
 *
 * Usa vi.useFakeTimers() + vi.setSystemTime() para fijar "ahora" y evitar
 * flakiness por reloj real.
 *
 * Referencias:
 *   - docs/adr/ADR-008-ventanas-carga-desacopladas.md
 *   - src/utils/submissionWindow.js
 *
 * Versión: v1.0
 * Fecha: 2026-09-20
 * Autor: PJPIROVANI (OWNER)
 * ============================================================================
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  validateSubmissionWindow,
  getSubmissionWindowStatus
} from '../../src/utils/submissionWindow.js';

// ============================================================
// HELPERS DE TEST
// ============================================================

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

/**
 * Fecha "ahora" fija usada por todos los tests: 2026-09-20T12:00:00Z
 * (domingo 20-sep-2026, 12:00 UTC = 09:00 PY).
 */
const NOW = new Date('2026-09-20T12:00:00Z');

/** Construye un evento de prueba con fechas relativas a NOW. */
function buildEvent({
  id = 'aaaaaaaa-1111-1111-1111-111111111111',
  status = 'OPEN',
  opensOffsetMs = -2 * DAY_MS,   // por defecto: abrió hace 2 días
  closesOffsetMs = +3 * DAY_MS,  // por defecto: cierra en 3 días
  opensAt = undefined,
  closesAt = undefined
} = {}) {
  return {
    id,
    status,
    submission_opens_at:
      opensAt !== undefined
        ? opensAt
        : new Date(NOW.getTime() + opensOffsetMs).toISOString(),
    submission_closes_at:
      closesAt !== undefined
        ? closesAt
        : new Date(NOW.getTime() + closesOffsetMs).toISOString()
  };
}

// ============================================================
// SETUP / TEARDOWN
// ============================================================

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

// ============================================================
// validateSubmissionWindow
// ============================================================

describe('validateSubmissionWindow — ADR-008', () => {

  // -------- Caso feliz --------

  describe('Ventana abierta → valid: true', () => {
    it('V1: evento OPEN dentro de la ventana → { valid: true }', () => {
      const result = validateSubmissionWindow(buildEvent());
      expect(result).toEqual({ valid: true });
    });

    it('V2: justo en el instante de apertura → válido', () => {
      const event = buildEvent({ opensOffsetMs: 0 });
      const result = validateSubmissionWindow(event);
      expect(result.valid).toBe(true);
    });

    it('V3: justo en el instante de cierre → válido (now === closesAt, no > )', () => {
      const event = buildEvent({ closesOffsetMs: 0 });
      const result = validateSubmissionWindow(event);
      expect(result.valid).toBe(true);
    });

    it('V4: no depende del status OPEN vs CLOSED (solo la ventana importa)', () => {
      const event = buildEvent({ status: 'CLOSED' });
      const result = validateSubmissionWindow(event);
      expect(result.valid).toBe(true);
    });
  });

  // -------- Guardia 1: EVENT_NOT_FOUND --------

  describe('Evento nulo → EVENT_NOT_FOUND', () => {
    it('V5: event = null → EVENT_NOT_FOUND', () => {
      const result = validateSubmissionWindow(null);
      expect(result.valid).toBe(false);
      expect(result.code).toBe('EVENT_NOT_FOUND');
      expect(result.message).toBe('Evento no encontrado.');
    });

    it('V6: event = undefined → EVENT_NOT_FOUND', () => {
      const result = validateSubmissionWindow(undefined);
      expect(result.valid).toBe(false);
      expect(result.code).toBe('EVENT_NOT_FOUND');
    });
  });

  // -------- Guardia 2: EVENT_CANCELLED --------

  describe('Evento CANCELLED → EVENT_CANCELLED', () => {
    it('V7: status = CANCELLED rechaza aunque la ventana esté abierta', () => {
      const event = buildEvent({ status: 'CANCELLED' });
      const result = validateSubmissionWindow(event);
      expect(result.valid).toBe(false);
      expect(result.code).toBe('EVENT_CANCELLED');
      expect(result.details.event_id).toBe(event.id);
    });

    it('V8: CANCELLED tiene prioridad sobre SUBMISSION_WINDOW_NOT_SET', () => {
      const event = {
        id: 'x',
        status: 'CANCELLED',
        submission_opens_at: null,
        submission_closes_at: null
      };
      const result = validateSubmissionWindow(event);
      expect(result.code).toBe('EVENT_CANCELLED');
    });
  });

  // -------- Guardia 3: SUBMISSION_WINDOW_NOT_SET --------

  describe('Sin fechas configuradas → SUBMISSION_WINDOW_NOT_SET', () => {
    it('V9: submission_opens_at = null → NOT_SET', () => {
      const event = buildEvent({ opensAt: null });
      const result = validateSubmissionWindow(event);
      expect(result.valid).toBe(false);
      expect(result.code).toBe('SUBMISSION_WINDOW_NOT_SET');
      expect(result.details.event_id).toBe(event.id);
    });

    it('V10: submission_closes_at = null → NOT_SET', () => {
      const event = buildEvent({ closesAt: null });
      const result = validateSubmissionWindow(event);
      expect(result.code).toBe('SUBMISSION_WINDOW_NOT_SET');
    });

    it('V11: ambas null → NOT_SET', () => {
      const event = buildEvent({ opensAt: null, closesAt: null });
      const result = validateSubmissionWindow(event);
      expect(result.code).toBe('SUBMISSION_WINDOW_NOT_SET');
    });

    it('V12: string vacío → NOT_SET (falsy check)', () => {
      const event = buildEvent({ opensAt: '' });
      const result = validateSubmissionWindow(event);
      expect(result.code).toBe('SUBMISSION_WINDOW_NOT_SET');
    });
  });

  // -------- Guardia 4: SUBMISSION_WINDOW_INVALID --------

  describe('Fechas inválidas → SUBMISSION_WINDOW_INVALID', () => {
    it('V13: opens_at = "no-es-fecha" → INVALID', () => {
      const event = buildEvent({ opensAt: 'no-es-fecha' });
      const result = validateSubmissionWindow(event);
      expect(result.valid).toBe(false);
      expect(result.code).toBe('SUBMISSION_WINDOW_INVALID');
      expect(result.details.submission_opens_at).toBe('no-es-fecha');
    });

    it('V14: closes_at = "tampoco" → INVALID', () => {
      const event = buildEvent({ closesAt: 'tampoco' });
      const result = validateSubmissionWindow(event);
      expect(result.code).toBe('SUBMISSION_WINDOW_INVALID');
    });
  });

  // -------- Guardia 5: SUBMISSION_WINDOW_NOT_OPEN --------

  describe('Ventana futura → SUBMISSION_WINDOW_NOT_OPEN', () => {
    it('V15: abre en 1 día → NOT_OPEN con seconds_until_open', () => {
      const event = buildEvent({ opensOffsetMs: +1 * DAY_MS });
      const result = validateSubmissionWindow(event);
      expect(result.valid).toBe(false);
      expect(result.code).toBe('SUBMISSION_WINDOW_NOT_OPEN');
      expect(result.details.seconds_until_open).toBe(DAY_MS / 1000);
    });

    it('V16: abre en 1 hora → seconds_until_open = 3600', () => {
      const event = buildEvent({ opensOffsetMs: +1 * HOUR_MS });
      const result = validateSubmissionWindow(event);
      expect(result.details.seconds_until_open).toBe(3600);
    });

    it('V17: abre en 1 segundo → seconds_until_open = 1', () => {
      const event = buildEvent({ opensOffsetMs: 1000 });
      const result = validateSubmissionWindow(event);
      expect(result.details.seconds_until_open).toBe(1);
    });
  });

  // -------- Guardia 6: SUBMISSION_WINDOW_CLOSED --------

  describe('Ventana pasada → SUBMISSION_WINDOW_CLOSED', () => {
    it('V18: cerró hace 1 día → CLOSED con seconds_since_close', () => {
      const event = buildEvent({ closesOffsetMs: -1 * DAY_MS });
      const result = validateSubmissionWindow(event);
      expect(result.valid).toBe(false);
      expect(result.code).toBe('SUBMISSION_WINDOW_CLOSED');
      expect(result.details.seconds_since_close).toBe(DAY_MS / 1000);
    });

    it('V19: cerró hace 1 hora → seconds_since_close = 3600', () => {
      const event = buildEvent({ closesOffsetMs: -1 * HOUR_MS });
      const result = validateSubmissionWindow(event);
      expect(result.details.seconds_since_close).toBe(3600);
    });

    it('V20: cerró hace 1 segundo → seconds_since_close = 1', () => {
      const event = buildEvent({ closesOffsetMs: -1000 });
      const result = validateSubmissionWindow(event);
      expect(result.details.seconds_since_close).toBe(1);
    });
  });
});

// ============================================================
// getSubmissionWindowStatus
// ============================================================

describe('getSubmissionWindowStatus — ADR-008', () => {

  // -------- NOT_SET --------

  describe('Sin datos → status: NOT_SET', () => {
    it('G1: event = null → NOT_SET con todo en 0/null', () => {
      const result = getSubmissionWindowStatus(null);
      expect(result).toEqual({
        status: 'NOT_SET',
        submission_opens_at: null,
        submission_closes_at: null,
        seconds_remaining: 0,
        seconds_until_open: 0,
        can_submit: false
      });
    });

    it('G2: event = undefined → NOT_SET', () => {
      const result = getSubmissionWindowStatus(undefined);
      expect(result.status).toBe('NOT_SET');
    });

    it('G3: sin fechas → NOT_SET pero preserva los strings originales', () => {
      const event = { id: 'x', status: 'OPEN' };
      const result = getSubmissionWindowStatus(event);
      expect(result.status).toBe('NOT_SET');
      expect(result.submission_opens_at).toBeNull();
      expect(result.submission_closes_at).toBeNull();
    });

    it('G4: fechas inválidas → NOT_SET (no revienta)', () => {
      const event = buildEvent({ opensAt: 'basura' });
      const result = getSubmissionWindowStatus(event);
      expect(result.status).toBe('NOT_SET');
      expect(result.can_submit).toBe(false);
    });
  });

  // -------- NOT_OPEN --------

  describe('Ventana futura → status: NOT_OPEN', () => {
    it('G5: abre en 2 horas → NOT_OPEN, seconds_until_open = 7200', () => {
      const event = buildEvent({ opensOffsetMs: +2 * HOUR_MS });
      const result = getSubmissionWindowStatus(event);
      expect(result.status).toBe('NOT_OPEN');
      expect(result.seconds_until_open).toBe(7200);
      expect(result.seconds_remaining).toBe(0);
      expect(result.can_submit).toBe(false);
    });

    it('G6: NOT_OPEN normaliza fechas a ISO string', () => {
      const event = buildEvent({ opensOffsetMs: +1 * DAY_MS });
      const result = getSubmissionWindowStatus(event);
      expect(result.submission_opens_at).toBe(event.submission_opens_at);
      expect(result.submission_closes_at).toBe(event.submission_closes_at);
    });
  });

  // -------- CLOSED --------

  describe('Ventana pasada → status: CLOSED', () => {
    it('G7: cerró hace 1 hora → CLOSED, seconds_remaining = 0', () => {
      const event = buildEvent({ closesOffsetMs: -1 * HOUR_MS });
      const result = getSubmissionWindowStatus(event);
      expect(result.status).toBe('CLOSED');
      expect(result.seconds_remaining).toBe(0);
      expect(result.seconds_until_open).toBe(0);
      expect(result.can_submit).toBe(false);
    });
  });

  // -------- OPEN --------

  describe('Ventana abierta → status: OPEN', () => {
    it('G8: dentro de la ventana → OPEN con seconds_remaining > 0', () => {
      const event = buildEvent({ closesOffsetMs: +2 * DAY_MS });
      const result = getSubmissionWindowStatus(event);
      expect(result.status).toBe('OPEN');
      expect(result.seconds_remaining).toBe((2 * DAY_MS) / 1000);
      expect(result.seconds_until_open).toBe(0);
      expect(result.can_submit).toBe(true);
    });

    it('G9: cierra en 30 min → seconds_remaining = 1800', () => {
      const event = buildEvent({ closesOffsetMs: 30 * 60 * 1000 });
      const result = getSubmissionWindowStatus(event);
      expect(result.seconds_remaining).toBe(1800);
    });

    it('G10: evento CANCELLED dentro de ventana → OPEN pero can_submit: false', () => {
      const event = buildEvent({ status: 'CANCELLED' });
      const result = getSubmissionWindowStatus(event);
      expect(result.status).toBe('OPEN');
      expect(result.can_submit).toBe(false);
    });

    it('G11: evento OPEN dentro de ventana → can_submit: true', () => {
      const event = buildEvent({ status: 'OPEN' });
      const result = getSubmissionWindowStatus(event);
      expect(result.status).toBe('OPEN');
      expect(result.can_submit).toBe(true);
    });

    it('G12: evento CLOSED dentro de ventana → status OPEN, can_submit: true (solo importa la ventana)', () => {
      const event = buildEvent({ status: 'CLOSED' });
      const result = getSubmissionWindowStatus(event);
      expect(result.status).toBe('OPEN');
      expect(result.can_submit).toBe(true);
    });
  });

  // -------- Bordes exactos --------

  describe('Bordes temporales exactos', () => {
    it('G13: exactamente en opensAt → OPEN, can_submit: true', () => {
      const event = buildEvent({ opensOffsetMs: 0 });
      const result = getSubmissionWindowStatus(event);
      expect(result.status).toBe('OPEN');
      expect(result.can_submit).toBe(true);
    });

    it('G14: exactamente en closesAt → OPEN (now === closesAt, no > )', () => {
      const event = buildEvent({ closesOffsetMs: 0 });
      const result = getSubmissionWindowStatus(event);
      expect(result.status).toBe('OPEN');
    });
  });

  // -------- Normalización de fechas --------

  describe('Normalización de fechas a ISO', () => {
    it('G15: fechas con offset distinto → ISO UTC canónico', () => {
      const event = buildEvent({
        opensAt: '2026-09-18T09:00:00-03:00',   // PY local
        closesAt: '2026-09-22T08:59:59-03:00'   // PY local
      });
      const result = getSubmissionWindowStatus(event);
      expect(result.submission_opens_at).toBe('2026-09-18T12:00:00.000Z');
      expect(result.submission_closes_at).toBe('2026-09-22T11:59:59.000Z');
    });
  });
});

// ============================================================
// INTEGRACIÓN — validate + status sobre el mismo evento
// ============================================================

describe('Integración validateSubmissionWindow + getSubmissionWindowStatus', () => {
  it('I1: ventana abierta → validate.valid=true && status=OPEN && can_submit=true', () => {
    const event = buildEvent();
    expect(validateSubmissionWindow(event).valid).toBe(true);
    const s = getSubmissionWindowStatus(event);
    expect(s.status).toBe('OPEN');
    expect(s.can_submit).toBe(true);
  });

  it('I2: ventana futura → validate.code=NOT_OPEN && status=NOT_OPEN', () => {
    const event = buildEvent({ opensOffsetMs: +DAY_MS });
    expect(validateSubmissionWindow(event).code).toBe('SUBMISSION_WINDOW_NOT_OPEN');
    expect(getSubmissionWindowStatus(event).status).toBe('NOT_OPEN');
  });

  it('I3: ventana pasada → validate.code=CLOSED && status=CLOSED', () => {
    const event = buildEvent({ closesOffsetMs: -DAY_MS });
    expect(validateSubmissionWindow(event).code).toBe('SUBMISSION_WINDOW_CLOSED');
    expect(getSubmissionWindowStatus(event).status).toBe('CLOSED');
  });

  it('I4: CANCELLED → validate.code=CANCELLED && status=OPEN pero can_submit=false', () => {
    const event = buildEvent({ status: 'CANCELLED' });
    expect(validateSubmissionWindow(event).code).toBe('EVENT_CANCELLED');
    const s = getSubmissionWindowStatus(event);
    expect(s.status).toBe('OPEN');
    expect(s.can_submit).toBe(false);
  });
});