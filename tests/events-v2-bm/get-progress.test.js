/**
 * ============================================================================
 * PARAGUAY-FFAA | METALSTORM
 * Tests — GET /api/events-v2/bm/:eventId/progress [F4.2.2-C]
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
import { participationPartial } from '../fixtures/bm-participations.js';
import { userMember } from '../fixtures/users.js';

const supa = createSupabaseMock();

vi.mock('../../src/db/supabase.js', () => ({
  getSupabase: () => globalThis.__TEST_SUPA__ || null
}));

import { getBmProgressV2 } from '../../src/controllers/events-v2-bm.controller.js';

beforeEach(() => {
  resetSupabaseMock(supa);
  globalThis.__TEST_SUPA__ = supa;
});

describe('GET /api/events-v2/bm/:eventId/progress — getBmProgressV2', () => {

  it('E1: piloto con participación → 200 con stats calculadas', async () => {
    queueResponse(supa, 'events_master', supaOk([bmEventActive]));
    queueResponse(supa, 'event_participations', supaOk([participationPartial]));

    const req = mockReq({
      params: { eventId: bmEventActive.id },
      user: userMember
    });
    const res = mockRes();

    await getBmProgressV2(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.has_participation).toBe(true);
    expect(res.body.participation_id).toBe(participationPartial.id);
    expect(res.body.total_points).toBeGreaterThan(0);
    expect(res.body.completed_missions).toBeGreaterThan(0);
    expect(res.body.current_day).toBeGreaterThanOrEqual(1);

    expect(Object.keys(res.body.by_day).length).toBe(5);

    expect(Array.isArray(res.body.missions)).toBe(true);
    expect(res.body.missions.length).toBe(15);
  });

  it('E2: sin participación → 200 con progreso vacío (no 404)', async () => {
    queueResponse(supa, 'events_master', supaOk([bmEventActive]));
    queueResponse(supa, 'event_participations', supaOk([]));

    const req = mockReq({
      params: { eventId: bmEventActive.id },
      user: userMember
    });
    const res = mockRes();

    await getBmProgressV2(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.has_participation).toBe(false);
    expect(res.body.participation_id).toBe(null);
    expect(res.body.total_points).toBe(0);
    expect(res.body.completed_missions).toBe(0);
  });

  it('E3: filtro ?day=1 → missions solo del día 1', async () => {
    queueResponse(supa, 'events_master', supaOk([bmEventActive]));
    queueResponse(supa, 'event_participations', supaOk([participationPartial]));

    const req = mockReq({
      params: { eventId: bmEventActive.id },
      query: { day: '1' },
      user: userMember
    });
    const res = mockRes();

    await getBmProgressV2(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.missions.length).toBe(3);
    expect(res.body.missions.every(m => m.day === 1)).toBe(true);
    expect(Object.keys(res.body.by_day).length).toBe(5);
  });

  it('E4: evento no existe → 404 EVENT_NOT_FOUND', async () => {
    queueResponse(supa, 'events_master', supaOk([]));

    const req = mockReq({
      params: { eventId: 'no-existe' },
      user: userMember
    });
    const res = mockRes();

    await getBmProgressV2(req, res);

    expect(res.statusCode).toBe(404);
    expect(res.body.code).toBe('EVENT_NOT_FOUND');
  });

  it('E5: getSupabase() → null → 500 DB_UNAVAILABLE', async () => {
    globalThis.__TEST_SUPA__ = null;

    const req = mockReq({
      params: { eventId: bmEventActive.id },
      user: userMember
    });
    const res = mockRes();

    await getBmProgressV2(req, res);

    expect(res.statusCode).toBe(500);
    expect(res.body.code).toBe('DB_UNAVAILABLE');
  });

  it('E6: error de Supabase → 500 INTERNAL_ERROR', async () => {
    queueResponse(supa, 'events_master', supaError('XX000', 'DB exploded'));

    const req = mockReq({
      params: { eventId: bmEventActive.id },
      user: userMember
    });
    const res = mockRes();

    await getBmProgressV2(req, res);

    expect(res.statusCode).toBe(500);
    expect(res.body.code).toBe('INTERNAL_ERROR');
  });

});