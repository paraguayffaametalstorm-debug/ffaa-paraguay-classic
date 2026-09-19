/**
 * ============================================================================
 * PARAGUAY-FFAA | METALSTORM
 * Tests — GET /api/events-v2/bm/:eventId/discount [F4.2.2-C]
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
import { participationFull } from '../fixtures/bm-participations.js';
import { userMember } from '../fixtures/users.js';

const supa = createSupabaseMock();

vi.mock('../../src/db/supabase.js', () => ({
  getSupabase: () => globalThis.__TEST_SUPA__ || null
}));

import { getBmDiscountV2 } from '../../src/controllers/events-v2-bm.controller.js';

beforeEach(() => {
  resetSupabaseMock(supa);
  globalThis.__TEST_SUPA__ = supa;
});

describe('GET /api/events-v2/bm/:eventId/discount — getBmDiscountV2', () => {

  it('H1: happy path → pricing calculado con descuento', async () => {
    queueResponse(supa, 'events_master', supaOk([bmEventActive]));
    queueResponse(supa, 'event_participations', supaOk([participationFull]));
    queueResponse(supa, 'plane_models', supaOk({
      id: '125',
      name: 'F-15EX Eagle II',
      type: 'Caza Pesado',
      tier: 4
    }));

    const req = mockReq({
      params: { eventId: bmEventActive.id },
      user: userMember
    });
    const res = mockRes();

    await getBmDiscountV2(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.aircraft_id).toBe('125');
    expect(res.body.total_points).toBe(250);

    expect(res.body.pricing.base_price_shards).toBe(500);
    expect(res.body.pricing.discount_shards).toBe(250);
    expect(res.body.pricing.final_price_shards).toBe(250);
    expect(res.body.discount_percentage).toBe(50);

    expect(res.body.purchased).toBe(false);
  });

  it('H2: sin participación → discount 0, precio base', async () => {
    queueResponse(supa, 'events_master', supaOk([bmEventActive]));
    queueResponse(supa, 'event_participations', supaOk([]));
    queueResponse(supa, 'plane_models', supaOk(null));

    const req = mockReq({
      params: { eventId: bmEventActive.id },
      user: userMember
    });
    const res = mockRes();

    await getBmDiscountV2(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.total_points).toBe(0);
    expect(res.body.discount_shards).toBe(0);
    expect(res.body.pricing.final_price_shards).toBe(500);
  });

  it('H3: evento no existe → 404 EVENT_NOT_FOUND', async () => {
    queueResponse(supa, 'events_master', supaOk([]));

    const req = mockReq({
      params: { eventId: 'no-existe' },
      user: userMember
    });
    const res = mockRes();

    await getBmDiscountV2(req, res);

    expect(res.statusCode).toBe(404);
    expect(res.body.code).toBe('EVENT_NOT_FOUND');
  });

  it('H4: getSupabase() → null → 500 DB_UNAVAILABLE', async () => {
    globalThis.__TEST_SUPA__ = null;

    const req = mockReq({
      params: { eventId: bmEventActive.id },
      user: userMember
    });
    const res = mockRes();

    await getBmDiscountV2(req, res);

    expect(res.statusCode).toBe(500);
    expect(res.body.code).toBe('DB_UNAVAILABLE');
  });

  it('H5: error de Supabase → 500 INTERNAL_ERROR', async () => {
    queueResponse(supa, 'events_master', supaError('XX000', 'DB exploded'));

    const req = mockReq({
      params: { eventId: bmEventActive.id },
      user: userMember
    });
    const res = mockRes();

    await getBmDiscountV2(req, res);

    expect(res.statusCode).toBe(500);
    expect(res.body.code).toBe('INTERNAL_ERROR');
  });

});