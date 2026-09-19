/**
 * ============================================================================
 * PARAGUAY-FFAA | METALSTORM
 * Tests — GET /api/events-v2/bm/:eventId [F4.2.2-C]
 * ============================================================================
 * Endpoint: getBmEventByIdV2
 * Cubre:
 *   B1 — Happy path: BM existente → 200 con event + missions
 *   B2 — Evento no existe → 404 EVENT_NOT_FOUND
 *   B3 — Evento existe pero es SQUADRON → 404 EVENT_NOT_BLACK_MARKET
 *   B4 — BM legacy (legacy_bm: true) → 200, missions: [], message
 *   B5 — BM sin missions en metadata → 200, missions generadas default
 *   B6 — DB caída (getSupabase → null) → 500 DB_UNAVAILABLE
 *   B7 — Error de Supabase → 500 INTERNAL_ERROR
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
import {
  bmEventActive,
  bmEventLegacy,
  bmEventNoMissions,
  sqEventActive
} from '../fixtures/bm-events.js';

// ============================================================
// MOCK DE SUPABASE
// ============================================================

const supa = createSupabaseMock();

vi.mock('../../src/db/supabase.js', () => ({
  getSupabase: () => globalThis.__TEST_SUPA__ || null
}));

// Import después del mock
import { getBmEventByIdV2 } from '../../src/controllers/events-v2-bm.controller.js';

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

describe('GET /api/events-v2/bm/:eventId — getBmEventByIdV2', () => {

  // ----------------------------------------------------------
  // B1 — Happy path
  // ----------------------------------------------------------
  it('B1: devuelve el evento BM con misiones', async () => {
    queueResponse(supa, 'events_master', supaOk([bmEventActive]));

    const req = mockReq({ params: { eventId: bmEventActive.id } });
    const res = mockRes();

    await getBmEventByIdV2(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.event.id).toBe(bmEventActive.id);
    expect(res.body.event.type).toBe('BLACK_MARKET');
    expect(res.body.event.is_legacy).toBe(false);

    // Misiones: 15 (del metadata)
    expect(Array.isArray(res.body.missions)).toBe(true);
    expect(res.body.missions.length).toBe(15);
    expect(res.body.missions[0]).toHaveProperty('day');
    expect(res.body.missions[0]).toHaveProperty('type');
    expect(res.body.missions[0]).toHaveProperty('points');

    expect(res.body.is_legacy).toBe(false);
    expect(typeof res.body.current_day).toBe('number');

    // No debe tener el mensaje legacy
    expect(res.body.message).toBeUndefined();
  });

  // ----------------------------------------------------------
  // B2 — Evento no existe
  // ----------------------------------------------------------
  it('B2: evento no existe → 404 EVENT_NOT_FOUND', async () => {
    queueResponse(supa, 'events_master', supaOk([]));

    const req = mockReq({ params: { eventId: 'no-existe-uuid' } });
    const res = mockRes();

    await getBmEventByIdV2(req, res);

    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('EVENT_NOT_FOUND');
  });

  // ----------------------------------------------------------
  // B3 — Evento es SQUADRON
  // ----------------------------------------------------------
  it('B3: evento existe pero es SQUADRON → 404 EVENT_NOT_BLACK_MARKET', async () => {
    queueResponse(supa, 'events_master', supaOk([sqEventActive]));

    const req = mockReq({ params: { eventId: sqEventActive.id } });
    const res = mockRes();

    await getBmEventByIdV2(req, res);

    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('EVENT_NOT_BLACK_MARKET');
    expect(res.body.error).toMatch(/BLACK_MARKET/);
    expect(res.body.error).toMatch(/SQUADRON/);
  });

  // ----------------------------------------------------------
  // B4 — BM legacy
  // ----------------------------------------------------------
  it('B4: BM legacy → 200, missions: [], message explicativo', async () => {
    queueResponse(supa, 'events_master', supaOk([bmEventLegacy]));

    const req = mockReq({ params: { eventId: bmEventLegacy.id } });
    const res = mockRes();

    await getBmEventByIdV2(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.event.is_legacy).toBe(true);
    expect(res.body.is_legacy).toBe(true);

    // Legacy: no tiene misiones jugables
    expect(Array.isArray(res.body.missions)).toBe(true);
    expect(res.body.missions.length).toBe(0);

    // Mensaje explicativo presente
    expect(typeof res.body.message).toBe('string');
    expect(res.body.message).toMatch(/legacy|histórico/i);
  });

  // ----------------------------------------------------------
  // B5 — BM sin misiones en metadata → genera 15 default
  // ----------------------------------------------------------
  it('B5: metadata.missions vacío → 15 misiones por defecto', async () => {
    queueResponse(supa, 'events_master', supaOk([bmEventNoMissions]));

    const req = mockReq({ params: { eventId: bmEventNoMissions.id } });
    const res = mockRes();

    await getBmEventByIdV2(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.missions.length).toBe(15);

    // Verificar estructura de misión default
    const first = res.body.missions[0];
    expect(first.day).toBe(1);
    expect(first.type).toBe('dedication');
    expect(first.points).toBe(25);
  });

  // ----------------------------------------------------------
  // B6 — DB caída
  // ----------------------------------------------------------
  it('B6: getSupabase() → null → 500 DB_UNAVAILABLE', async () => {
    globalThis.__TEST_SUPA__ = null;

    const req = mockReq({ params: { eventId: bmEventActive.id } });
    const res = mockRes();

    await getBmEventByIdV2(req, res);

    expect(res.statusCode).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('DB_UNAVAILABLE');
  });

  // ----------------------------------------------------------
  // B7 — Error de Supabase
  // ----------------------------------------------------------
  it('B7: error de Supabase → 500 INTERNAL_ERROR', async () => {
    queueResponse(supa, 'events_master', supaError('XX000', 'DB exploded'));

    const req = mockReq({ params: { eventId: bmEventActive.id } });
    const res = mockRes();

    await getBmEventByIdV2(req, res);

    expect(res.statusCode).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('INTERNAL_ERROR');
  });

});