/**
 * ============================================================================
 * PARAGUAY-FFAA | METALSTORM
 * Tests — GET /api/events-v2/bm/active [F4.2.2-C]
 * ============================================================================
 * Endpoint: getBmActiveEventV2
 * Cubre:
 *   A1 — Happy path: BM OPEN → { success: true, active: true, event }
 *   A2 — No hay BM activo → { success: true, active: false, event: null }
 *   A3 — DB caída (getSupabase → null) → 500 DB_UNAVAILABLE
 *   A4 — Error de Supabase → 500 INTERNAL_ERROR
 *   A5 — Verifica que el query filtra por type=BLACK_MARKET + status=OPEN
 * ============================================================================
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createSupabaseMock,
  queueResponse,
  supaOk,
  supaError,
  resetSupabaseMock
} from '../mocks/supabase.js';
import { mockReq, mockRes } from '../mocks/express.js';
import { bmEventActive } from '../fixtures/bm-events.js';

// ============================================================
// MOCK DE SUPABASE
// ============================================================

const supa = createSupabaseMock();

vi.mock('../../src/db/supabase.js', () => ({
  getSupabase: () => globalThis.__TEST_SUPA__ || null
}));

// Import después del mock (Vitest hoistea vi.mock)
import { getBmActiveEventV2 } from '../../src/controllers/events-v2-bm.controller.js';

// ============================================================
// SETUP
// ============================================================

beforeEach(() => {
  resetSupabaseMock(supa);
  globalThis.__TEST_SUPA__ = supa;
});

// ============================================================
// TESTS
// ============================================================

describe('GET /api/events-v2/bm/active — getBmActiveEventV2', () => {

  // ----------------------------------------------------------
  // A1 — Happy path
  // ----------------------------------------------------------
  it('A1: devuelve el evento BM activo con datos normalizados', async () => {
    queueResponse(supa, 'events_master', supaOk([bmEventActive]));

    const req = mockReq();
    const res = mockRes();

    await getBmActiveEventV2(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.active).toBe(true);
    expect(res.body.event).toBeTruthy();
    expect(res.body.event.id).toBe(bmEventActive.id);
    expect(res.body.event.name).toBe(bmEventActive.name);
    expect(res.body.event.type).toBe('BLACK_MARKET');

    // Campos derivados que agrega normalizeBmEvent
    expect(res.body.event.is_open).toBe(true);
    expect(res.body.event.is_legacy).toBe(false);
    expect(typeof res.body.event.current_day).toBe('number');
    expect(res.body.event.current_day).toBeGreaterThanOrEqual(1);
    expect(res.body.event.current_day).toBeLessThanOrEqual(5);

    // Metadata aplanada para el frontend
    expect(res.body.event.aircraft_id).toBe('125');
    expect(res.body.event.aircraft_name).toBe('F-15EX Eagle II');
    expect(res.body.event.max_points).toBe(250);
    expect(Array.isArray(res.body.event.missions)).toBe(true);
    expect(res.body.event.missions.length).toBe(15);

    // Campos de ventana temporal
    expect(typeof res.body.remaining_ms).toBe('number');
    expect(typeof res.body.days_left).toBe('number');
    expect(res.body.current_day).toBe(res.body.event.current_day);
  });

  // ----------------------------------------------------------
  // A2 — No hay BM activo
  // ----------------------------------------------------------
  it('A2: sin BM activo → active:false, event:null, no error', async () => {
    queueResponse(supa, 'events_master', supaOk([]));

    const req = mockReq();
    const res = mockRes();

    await getBmActiveEventV2(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.active).toBe(false);
    expect(res.body.event).toBe(null);
    expect(res.body.data).toBe(null);
    expect(typeof res.body.message).toBe('string');
    expect(res.body.message).toMatch(/no hay/i);
  });

  // ----------------------------------------------------------
  // A3 — DB caída
  // ----------------------------------------------------------
  it('A3: getSupabase() → null → 500 DB_UNAVAILABLE', async () => {
    globalThis.__TEST_SUPA__ = null;

    const req = mockReq();
    const res = mockRes();

    await getBmActiveEventV2(req, res);

    expect(res.statusCode).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('DB_UNAVAILABLE');
  });

  // ----------------------------------------------------------
  // A4 — Error de Supabase
  // ----------------------------------------------------------
  it('A4: error de Supabase → 500 INTERNAL_ERROR', async () => {
    queueResponse(supa, 'events_master', supaError('XX000', 'DB exploded'));

    const req = mockReq();
    const res = mockRes();

    await getBmActiveEventV2(req, res);

    expect(res.statusCode).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('INTERNAL_ERROR');
    expect(res.body.error).toContain('DB exploded');
  });

  // ----------------------------------------------------------
  // A5 — Verificar filtros aplicados
  // ----------------------------------------------------------
  it('A5: aplica filtros type=BLACK_MARKET y status=OPEN', async () => {
    queueResponse(supa, 'events_master', supaOk([bmEventActive]));

    const req = mockReq();
    const res = mockRes();

    await getBmActiveEventV2(req, res);

    // Inspeccionar la query registrada
    const query = supa._queryHistory[0];
    expect(query.table).toBe('events_master');
    expect(query.filters).toContainEqual({
      type: 'eq', column: 'type', value: 'BLACK_MARKET'
    });
    expect(query.filters).toContainEqual({
      type: 'eq', column: 'status', value: 'OPEN'
    });
    expect(query.limit).toBe(1);
  });

});