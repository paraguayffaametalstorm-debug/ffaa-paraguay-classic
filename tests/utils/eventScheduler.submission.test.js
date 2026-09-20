/**
 * Tests unitarios — calculateSubmissionWindow() [ADR-008]
 * ============================================================
 * Valida la lógica de ventanas de carga desacopladas del ciclo de evento.
 *
 * Reglas (ADR-008):
 *   - SQ: 7 días (Jue 09:00 PY → Jue 08:59 PY).
 *   - BM: 6 días (Mié 17:00 PY → Mar 16:59 PY).
 *   - Fallback: 7 días desde el inicio.
 *
 * Fecha: 2026-09-20
 */

import { describe, it, expect } from 'vitest';
import { calculateSubmissionWindow } from '../../src/utils/eventScheduler.js';

describe('calculateSubmissionWindow — ADR-008', () => {

  // ============================================================
  // GRUPO 1: SQUADRON (ventana de 7 días)
  // ============================================================

  describe('SQUADRON — ventana de 7 días', () => {

    it('S1: W38 2026 (Jue 17-09 12:00 UTC) → cierra Jue 24-09 12:00 UTC', () => {
      const start = new Date('2026-09-17T12:00:00.000Z');
      const result = calculateSubmissionWindow(start, 'SQUADRON');

      expect(result.submission_opens_at).toBe('2026-09-17T12:00:00.000Z');
      expect(result.submission_closes_at).toBe('2026-09-24T12:00:00.000Z');
    });

    it('S2: W39 2026 (Jue 24-09 12:00 UTC) → cierra Jue 01-10 12:00 UTC', () => {
      const start = new Date('2026-09-24T12:00:00.000Z');
      const result = calculateSubmissionWindow(start, 'SQUADRON');

      expect(result.submission_opens_at).toBe('2026-09-24T12:00:00.000Z');
      expect(result.submission_closes_at).toBe('2026-10-01T12:00:00.000Z');
    });

    it('S3: duración exacta de 7 días (168 horas)', () => {
      const start = new Date('2026-09-17T12:00:00.000Z');
      const result = calculateSubmissionWindow(start, 'SQUADRON');

      const openMs = new Date(result.submission_opens_at).getTime();
      const closeMs = new Date(result.submission_closes_at).getTime();
      const diffDays = (closeMs - openMs) / (1000 * 60 * 60 * 24);

      expect(diffDays).toBe(7);
    });

    it('S4: acepta string ISO como input', () => {
      const result = calculateSubmissionWindow('2026-09-17T12:00:00.000Z', 'SQUADRON');

      expect(result.submission_opens_at).toBe('2026-09-17T12:00:00.000Z');
      expect(result.submission_closes_at).toBe('2026-09-24T12:00:00.000Z');
    });

    it('S5: abre y cierra a la MISMA hora UTC (12:00)', () => {
      const start = new Date('2026-09-17T12:00:00.000Z');
      const result = calculateSubmissionWindow(start, 'SQUADRON');

      const openTime = new Date(result.submission_opens_at).getUTCHours();
      const closeTime = new Date(result.submission_closes_at).getUTCHours();

      expect(openTime).toBe(12);
      expect(closeTime).toBe(12);
    });

  });

  // ============================================================
  // GRUPO 2: BLACK_MARKET (ventana de 6 días)
  // ============================================================

  describe('BLACK_MARKET — ventana de 6 días', () => {

    it('B1: BM F-20 (Mié 09-09 20:00 UTC) → cierra Mar 15-09 20:00 UTC', () => {
      const start = new Date('2026-09-09T20:00:00.000Z');
      const result = calculateSubmissionWindow(start, 'BLACK_MARKET');

      expect(result.submission_opens_at).toBe('2026-09-09T20:00:00.000Z');
      expect(result.submission_closes_at).toBe('2026-09-15T20:00:00.000Z');
    });

    it('B2: duración exacta de 6 días (144 horas)', () => {
      const start = new Date('2026-09-09T20:00:00.000Z');
      const result = calculateSubmissionWindow(start, 'BLACK_MARKET');

      const openMs = new Date(result.submission_opens_at).getTime();
      const closeMs = new Date(result.submission_closes_at).getTime();
      const diffDays = (closeMs - openMs) / (1000 * 60 * 60 * 24);

      expect(diffDays).toBe(6);
    });

    it('B3: acepta string ISO como input', () => {
      const result = calculateSubmissionWindow('2026-09-09T20:00:00.000Z', 'BLACK_MARKET');

      expect(result.submission_opens_at).toBe('2026-09-09T20:00:00.000Z');
      expect(result.submission_closes_at).toBe('2026-09-15T20:00:00.000Z');
    });

    it('B4: abre y cierra a la MISMA hora UTC (20:00)', () => {
      const start = new Date('2026-09-09T20:00:00.000Z');
      const result = calculateSubmissionWindow(start, 'BLACK_MARKET');

      const openTime = new Date(result.submission_opens_at).getUTCHours();
      const closeTime = new Date(result.submission_closes_at).getUTCHours();

      expect(openTime).toBe(20);
      expect(closeTime).toBe(20);
    });

  });

  // ============================================================
  // GRUPO 3: Fallback (tipo desconocido → 7 días)
  // ============================================================

  describe('Fallback — tipo desconocido', () => {

    it('F1: ACE_CHALLENGE → aplica fallback de 7 días', () => {
      const start = new Date('2026-09-17T12:00:00.000Z');
      const result = calculateSubmissionWindow(start, 'ACE_CHALLENGE');

      expect(result.submission_opens_at).toBe('2026-09-17T12:00:00.000Z');
      expect(result.submission_closes_at).toBe('2026-09-24T12:00:00.000Z');
    });

    it('F2: tipo null → aplica fallback de 7 días', () => {
      const start = new Date('2026-09-17T12:00:00.000Z');
      const result = calculateSubmissionWindow(start, null);

      expect(result.submission_closes_at).toBe('2026-09-24T12:00:00.000Z');
    });

    it('F3: tipo undefined → aplica fallback de 7 días', () => {
      const start = new Date('2026-09-17T12:00:00.000Z');
      const result = calculateSubmissionWindow(start);

      expect(result.submission_closes_at).toBe('2026-09-24T12:00:00.000Z');
    });

  });

  // ============================================================
  // GRUPO 4: Invariantes
  // ============================================================

  describe('Invariantes', () => {

    it('I1: SQ abre y cierra a la misma hora del día', () => {
      const start = new Date('2026-03-12T15:30:00.000Z'); // hora random
      const result = calculateSubmissionWindow(start, 'SQUADRON');

      const openTime = new Date(result.submission_opens_at).getTime();
      const closeTime = new Date(result.submission_closes_at).getTime();
      const openHour = new Date(openTime).getUTCHours();
      const openMin = new Date(openTime).getUTCMinutes();
      const closeHour = new Date(closeTime).getUTCHours();
      const closeMin = new Date(closeTime).getUTCMinutes();

      expect(openHour).toBe(closeHour);
      expect(openMin).toBe(closeMin);
    });

    it('I2: BM abre y cierra a la misma hora del día', () => {
      const start = new Date('2026-03-04T17:00:00.000Z');
      const result = calculateSubmissionWindow(start, 'BLACK_MARKET');

      const openHour = new Date(result.submission_opens_at).getUTCHours();
      const closeHour = new Date(result.submission_closes_at).getUTCHours();

      expect(openHour).toBe(closeHour);
    });

    it('I3: submission_opens_at coincide SIEMPRE con start_date', () => {
      const start = new Date('2026-09-17T12:00:00.000Z');
      const result = calculateSubmissionWindow(start, 'SQUADRON');

      expect(result.submission_opens_at).toBe(start.toISOString());
    });

    it('I4: submission_closes_at es SIEMPRE posterior a submission_opens_at', () => {
      const start = new Date('2026-09-17T12:00:00.000Z');
      const result = calculateSubmissionWindow(start, 'SQUADRON');

      const openMs = new Date(result.submission_opens_at).getTime();
      const closeMs = new Date(result.submission_closes_at).getTime();

      expect(closeMs).toBeGreaterThan(openMs);
    });

    it('I5: no se ve afectado por el cambio de año (W52 → W01)', () => {
      const start = new Date('2026-12-24T12:00:00.000Z');
      const result = calculateSubmissionWindow(start, 'SQUADRON');

      expect(result.submission_opens_at).toBe('2026-12-24T12:00:00.000Z');
      expect(result.submission_closes_at).toBe('2026-12-31T12:00:00.000Z');
    });

    it('I6: no se ve afectado por el cambio de mes', () => {
      const start = new Date('2026-09-28T12:00:00.000Z');
      const result = calculateSubmissionWindow(start, 'SQUADRON');

      // +7 días = 5 de octubre
      expect(result.submission_closes_at).toBe('2026-10-05T12:00:00.000Z');
    });

  });

});