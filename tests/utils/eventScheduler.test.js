/**
 * ============================================================================
 * PARAGUAY-FFAA | METALSTORM
 * TESTS UNITARIOS — eventScheduler.js v2.0 (HALL-066 FIX)
 * ============================================================================
 * Runner: Vitest
 * ============================================================================
 */

import { describe, it, expect } from 'vitest';
import {
  getISOWeek,
  getISOYear,
  getSquadronEventDates,
  calculateSubmissionWindow,
  buildEventName,
  buildLegacyEventId,
  PY_OFFSET_HOURS,
  SQ_OPEN_HOUR_PY,
  SQ_CLOSE_HOUR_PY,
  SQ_TYPE
} from '../../src/utils/eventScheduler.js';

// ============================================================
// CONSTANTES
// ============================================================

describe('Constantes del scheduler', () => {
  it('debe tener PY_OFFSET_HOURS = 3 (UTC-3 fijo, Ley 7141/2024)', () => {
    expect(PY_OFFSET_HOURS).toBe(3);
  });

  it('debe tener SQ_OPEN_HOUR_PY = 9 (jueves 09:00 PY)', () => {
    expect(SQ_OPEN_HOUR_PY).toBe(9);
  });

  it('debe tener SQ_CLOSE_HOUR_PY = 8 (lunes 08:59 PY)', () => {
    expect(SQ_CLOSE_HOUR_PY).toBe(8);
  });

  it('debe tener SQ_TYPE igual a SQUADRON', () => {
    expect(SQ_TYPE).toBe('SQUADRON');
  });
});

// ============================================================
// ISO WEEK / YEAR
// ============================================================

describe('getISOWeek', () => {
  it('debe calcular correctamente la semana ISO de una fecha conocida', () => {
    expect(getISOWeek(new Date('2026-01-01T12:00:00Z'))).toBe(1);
  });

  it('debe calcular la semana ISO del 17/09/2026 (W38)', () => {
    expect(getISOWeek(new Date('2026-09-17T12:00:00Z'))).toBe(38);
  });

  it('debe calcular la semana ISO del 24/09/2026 (W39)', () => {
    expect(getISOWeek(new Date('2026-09-24T12:00:00Z'))).toBe(39);
  });

  it('debe calcular la semana ISO del 21/09/2026 (lunes de W39)', () => {
    expect(getISOWeek(new Date('2026-09-21T01:00:00Z'))).toBe(39);
  });

  it('debe calcular la semana ISO del 20/09/2026 (domingo, aun W38)', () => {
    expect(getISOWeek(new Date('2026-09-20T22:00:00Z'))).toBe(38);
  });
});

describe('getISOYear', () => {
  it('debe devolver 2026 para fechas dentro de 2026', () => {
    expect(getISOYear(new Date('2026-06-15T12:00:00Z'))).toBe(2026);
    expect(getISOYear(new Date('2026-12-31T12:00:00Z'))).toBe(2026);
  });

  it('debe devolver un ano ISO consistente para el 01/01/2027', () => {
    const isoYear = getISOYear(new Date('2027-01-01T12:00:00Z'));
    expect([2026, 2027]).toContain(isoYear);
  });
});

// ============================================================
// FECHAS DE EVENTOS SQ
// ============================================================

describe('getSquadronEventDates — fechas conocidas 2026', () => {
  it('W38 2026 debe ser jue 17/09 12:00 UTC hasta lun 21/09 11:59 UTC', () => {
    const { start, end } = getSquadronEventDates(38, 2026);
    expect(start.toISOString()).toBe('2026-09-17T12:00:00.000Z');
    expect(end.toISOString()).toBe('2026-09-21T11:59:59.000Z');
  });

  it('W39 2026 debe ser jue 24/09 12:00 UTC hasta lun 28/09 11:59 UTC', () => {
    const { start, end } = getSquadronEventDates(39, 2026);
    expect(start.toISOString()).toBe('2026-09-24T12:00:00.000Z');
    expect(end.toISOString()).toBe('2026-09-28T11:59:59.000Z');
  });

  it('W40 2026 debe ser jue 01/10 12:00 UTC hasta lun 05/10 11:59 UTC', () => {
    const { start, end } = getSquadronEventDates(40, 2026);
    expect(start.toISOString()).toBe('2026-10-01T12:00:00.000Z');
    expect(end.toISOString()).toBe('2026-10-05T11:59:59.000Z');
  });

  it('debe durar exactamente 4 dias menos 1 segundo', () => {
    const { start, end } = getSquadronEventDates(38, 2026);
    const durationMs = end.getTime() - start.getTime();
    expect(durationMs).toBe(345599000);
  });
});

describe('getSquadronEventDates — invariantes', () => {
  it('start_date siempre debe ser jueves 12:00 UTC (09:00 PY)', () => {
    for (let week = 1; week <= 52; week++) {
      const { start } = getSquadronEventDates(week, 2026);
      expect(start.getUTCDay()).toBe(4);
      expect(start.getUTCHours()).toBe(12);
      expect(start.getUTCMinutes()).toBe(0);
    }
  });

  it('end_date siempre debe ser lunes 11:59:59 UTC (08:59:59 PY)', () => {
    for (let week = 1; week <= 52; week++) {
      const { end } = getSquadronEventDates(week, 2026);
      expect(end.getUTCDay()).toBe(1);
      expect(end.getUTCHours()).toBe(11);
      expect(end.getUTCMinutes()).toBe(59);
      expect(end.getUTCSeconds()).toBe(59);
    }
  });
});

// ============================================================
// VENTANAS DE CARGA (ADR-008)
// ============================================================

describe('calculateSubmissionWindow — SQ', () => {
  it('debe calcular ventana de 7 dias exactos para SQUADRON', () => {
    const start = new Date('2026-09-17T12:00:00Z');
    const { submission_opens_at, submission_closes_at } =
      calculateSubmissionWindow(start, SQ_TYPE);

    expect(submission_opens_at).toBe('2026-09-17T12:00:00.000Z');
    expect(submission_closes_at).toBe('2026-09-24T12:00:00.000Z');

    const opens = new Date(submission_opens_at);
    const closes = new Date(submission_closes_at);
    expect(closes.getTime() - opens.getTime()).toBe(7 * 24 * 3600 * 1000);
  });

  it('submission_closes_at de W38 debe coincidir con start_date de W39', () => {
    const w38 = getSquadronEventDates(38, 2026);
    const w39 = getSquadronEventDates(39, 2026);
    const w38Window = calculateSubmissionWindow(w38.start, SQ_TYPE);

    expect(w38Window.submission_closes_at).toBe(w39.start.toISOString());
  });
});

describe('calculateSubmissionWindow — BM', () => {
  it('debe calcular ventana de 6 dias exactos para BLACK_MARKET', () => {
    const start = new Date('2026-09-09T20:00:00Z');
    const { submission_opens_at, submission_closes_at } =
      calculateSubmissionWindow(start, 'BLACK_MARKET');

    const opens = new Date(submission_opens_at);
    const closes = new Date(submission_closes_at);
    expect(closes.getTime() - opens.getTime()).toBe(6 * 24 * 3600 * 1000);
  });
});

// ============================================================
// NOMBRE Y LEGACY_ID
// ============================================================

describe('buildEventName', () => {
  it('debe generar el patron Squadron Event YYYY-Www con padding', () => {
    expect(buildEventName(38, 2026)).toBe('Squadron Event 2026-W38');
    expect(buildEventName(39, 2026)).toBe('Squadron Event 2026-W39');
    expect(buildEventName(1, 2026)).toBe('Squadron Event 2026-W01');
    expect(buildEventName(9, 2026)).toBe('Squadron Event 2026-W09');
  });
});

describe('buildLegacyEventId', () => {
  it('debe generar el patron YYYY-MM - SEM NN - SQ', () => {
    const { start } = getSquadronEventDates(38, 2026);
    expect(buildLegacyEventId(38, 2026, start)).toBe('2026-09 · SEM 38 - SQ');
  });

  it('debe usar el mes del jueves de apertura', () => {
    const { start } = getSquadronEventDates(40, 2026);
    expect(buildLegacyEventId(40, 2026, start)).toBe('2026-10 · SEM 40 - SQ');
  });

  it('debe hacer padding correcto en semanas de 1 digito', () => {
    const { start } = getSquadronEventDates(1, 2026);
    expect(buildLegacyEventId(1, 2026, start)).toBe('2026-01 · SEM 01 - SQ');
  });
});

// ============================================================
// GUARDA DE SEGURIDAD HALL-066
// ============================================================

describe('Guarda HALL-066 — evento futuro nunca como OPEN', () => {
  it('debe detectar que W39 es futuro cuando NOW es anterior a start_date', () => {
    const now = new Date('2026-09-21T01:00:00Z');
    const { start } = getSquadronEventDates(39, 2026);
    expect(start > now).toBe(true);
  });

  it('debe detectar que W38 ya comenzo cuando NOW es posterior a start_date', () => {
    const now = new Date('2026-09-21T01:00:00Z');
    const { start } = getSquadronEventDates(38, 2026);
    expect(start <= now).toBe(true);
  });
});

// ============================================================
// CASOS DE BORDE
// ============================================================

describe('Casos de borde', () => {
  it('getSquadronEventDates debe manejar bien el cambio de ano', () => {
    const { start } = getSquadronEventDates(1, 2026);
    expect(start.getUTCFullYear()).toBe(2026);

    const { end } = getSquadronEventDates(52, 2026);
    expect(end.getUTCFullYear()).toBe(2026);
  });

  it('W38 de 2026 debe caer en septiembre', () => {
    const { start } = getSquadronEventDates(38, 2026);
    expect(start.getUTCMonth()).toBe(8);
  });

  it('W40 de 2026 debe caer en octubre', () => {
    const { start } = getSquadronEventDates(40, 2026);
    expect(start.getUTCMonth()).toBe(9);
  });
});