// tests/utils/eventScheduler.test.js
import { describe, it, expect } from 'vitest';

// Importamos las funciones reales del scheduler.
// Si el import falla, revisar que las funciones estén exportadas en el archivo original.
import {
  getISOWeek,
  getISOYear,
  getSquadronEventDates,
  PY_OFFSET_HOURS,
  SQ_OPEN_HOUR_PY,
  SQ_CLOSE_HOUR_PY,
  SQ_CLOSE_MINUTE_PY
} from '../../src/utils/eventScheduler.js';

describe('eventScheduler — HALL-065 fix v2 (UTC-3)', () => {

  describe('Constantes de timezone', () => {
    it('C1: PY_OFFSET_HOURS = 3 (UTC-3)', () => {
      expect(PY_OFFSET_HOURS).toBe(3);
    });

    it('C2: SQ_OPEN_HOUR_PY = 9', () => {
      expect(SQ_OPEN_HOUR_PY).toBe(9);
    });

    it('C3: SQ_CLOSE_HOUR_PY = 8, SQ_CLOSE_MINUTE_PY = 59', () => {
      expect(SQ_CLOSE_HOUR_PY).toBe(8);
      expect(SQ_CLOSE_MINUTE_PY).toBe(59);
    });
  });

  describe('getISOWeek / getISOYear', () => {
    it('W1: 2026-09-17 (jueves) → ISO week 38', () => {
      const d = new Date(Date.UTC(2026, 8, 17));
      expect(getISOWeek(d)).toBe(38);
      expect(getISOYear(d)).toBe(2026);
    });

    it('W2: 2026-01-01 (jueves) → ISO week 1', () => {
      const d = new Date(Date.UTC(2026, 0, 1));
      expect(getISOWeek(d)).toBe(1);
      expect(getISOYear(d)).toBe(2026);
    });

    it('W3: 2026-12-31 (jueves) → ISO week 53', () => {
      const d = new Date(Date.UTC(2026, 11, 31));
      // 2026-12-31 es jueves. ISO 2026 tiene 53 semanas.
      expect(getISOWeek(d)).toBe(53);
    });
  });

  describe('getSquadronEventDates — W38 2026 (validación HALL-065)', () => {
    it('D1: start = Jue 17-09-2026 12:00 UTC (09:00 PY con UTC-3)', () => {
      const { start } = getSquadronEventDates(38, 2026);
      expect(start.toISOString()).toBe('2026-09-17T12:00:00.000Z');
    });

    it('D2: end = Lun 21-09-2026 11:59:59 UTC (08:59 PY con UTC-3)', () => {
      const { end } = getSquadronEventDates(38, 2026);
      expect(end.toISOString()).toBe('2026-09-21T11:59:59.000Z');
    });

    it('D3: duración ~4 días (3d 23h 59m 59s)', () => {
      const { start, end } = getSquadronEventDates(38, 2026);
      const diffMs = end.getTime() - start.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      expect(diffHours).toBeGreaterThan(95.99);
      expect(diffHours).toBeLessThan(96);
    });
  });

  describe('getSquadronEventDates — W39 2026 (próximo evento)', () => {
    it('E1: start = Jue 24-09-2026 12:00 UTC', () => {
      const { start } = getSquadronEventDates(39, 2026);
      expect(start.toISOString()).toBe('2026-09-24T12:00:00.000Z');
    });

    it('E2: end = Lun 28-09-2026 11:59:59 UTC', () => {
      const { end } = getSquadronEventDates(39, 2026);
      expect(end.toISOString()).toBe('2026-09-28T11:59:59.000Z');
    });
  });

  describe('getSquadronEventDates — invariantes', () => {
    it('I1: start siempre es jueves (UTC day = 4)', () => {
      for (const week of [1, 10, 20, 30, 38, 45, 52]) {
        const { start } = getSquadronEventDates(week, 2026);
        expect(start.getUTCDay()).toBe(4);
      }
    });

    it('I2: end siempre es lunes (UTC day = 1)', () => {
      for (const week of [1, 10, 20, 30, 38, 45, 52]) {
        const { end } = getSquadronEventDates(week, 2026);
        expect(end.getUTCDay()).toBe(1);
      }
    });

    it('I3: start PY siempre son las 09:00 (UTC-3)', () => {
      for (const week of [1, 10, 20, 30, 38, 45, 52]) {
        const { start } = getSquadronEventDates(week, 2026);
        // Hora UTC = 12 → PY = 12 - 3 = 9
        const pyHour = start.getUTCHours() - PY_OFFSET_HOURS;
        expect(pyHour).toBe(9);
      }
    });

    it('I4: end PY siempre son las 08:59 (UTC-3)', () => {
      for (const week of [1, 10, 20, 30, 38, 45, 52]) {
        const { end } = getSquadronEventDates(week, 2026);
        const pyHour = end.getUTCHours() - PY_OFFSET_HOURS;
        expect(pyHour).toBe(8);
        expect(end.getUTCMinutes()).toBe(59);
      }
    });

    it('I5: cambio de año (W52 2026 → W01 2027) no rompe', () => {
      const w52 = getSquadronEventDates(52, 2026);
      const w01 = getSquadronEventDates(1, 2027);
      expect(w52.end.getTime()).toBeLessThan(w01.start.getTime());
    });

    it('I6: semanas consecutivas no se solapan', () => {
      const w38 = getSquadronEventDates(38, 2026);
      const w39 = getSquadronEventDates(39, 2026);
      // w38.end (Lun 21-09 11:59) < w39.start (Jue 24-09 12:00)
      expect(w38.end.getTime()).toBeLessThan(w39.start.getTime());
    });
  });
});