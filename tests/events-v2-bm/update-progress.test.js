/**
 * ============================================================================
 * PARAGUAY-FFAA | METALSTORM
 * Tests — PUT /api/events-v2/bm/:eventId/progress [F4.2.2-C]
 * ============================================================================
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createSupabaseMock,
  queueResponse,
  supaOk,
  resetSupabaseMock
} from '../mocks/supabase.js';
import { mockReq, mockRes } from '../mocks/express.js';
import {
  bmEventActive,
  bmEventClosed,
  bmEventLegacy
} from '../fixtures/bm-events.js';
import { participationPartial, buildProgress } from '../fixtures/bm-participations.js';
import { userMember } from '../fixtures/users.js';

const supa = createSupabaseMock();

vi.mock('../../src/db/supabase.js', () => ({
  getSupabase: () => globalThis.__TEST_SUPA__ || null
}));

vi.mock('../../src/utils/audit.js', () => ({
  logAuditChange: vi.fn(async () => {}),
  logSecurityEvent: vi.fn(async () => {})
}));

import { updateBmProgressV2 } from '../../src/controllers/events-v2-bm.controller.js';

beforeEach(() => {
  resetSupabaseMock(supa);
  globalThis.__TEST_SUPA__ = supa;
});

describe('PUT /api/events-v2/bm/:eventId/progress — updateBmProgressV2', () => {

  it('F1: toggle sin participación → 201 (auto-create)', async () => {
    queueResponse(supa, 'events_master', supaOk([bmEventActive]));
    queueResponse(supa, 'event_participations', supaOk([]));
    const created = {
      ...participationPartial,
      id: 'new-part-uuid',
      user_id: userMember.id
    };
    queueResponse(supa, 'event_participations', supaOk(created));

    const req = mockReq({
      params: { eventId: bmEventActive.id },
      body: { day: 1, mission_type: 'dedication', completed: true },
      user: userMember
    });
    const res = mockRes();

    await updateBmProgressV2(req, res);

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.created).toBe(true);
    expect(res.body.total_points).toBeGreaterThanOrEqual(25);
  });

  it('F2: toggle con participación existente → 200 (update)', async () => {
    queueResponse(supa, 'events_master', supaOk([bmEventActive]));
    queueResponse(supa, 'event_participations', supaOk([participationPartial]));
    const updated = { ...participationPartial, updated_at: '2026-09-19T00:00:00Z' };
    queueResponse(supa, 'event_participations', supaOk(updated));

    const req = mockReq({
      params: { eventId: bmEventActive.id },
      body: { day: 2, mission_type: 'teamwork', completed: true },
      user: userMember
    });
    const res = mockRes();

    await updateBmProgressV2(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.created).toBe(false);
  });

  it('F3: reemplazo total (modo 2) → 200/201', async () => {
    const fullData = buildProgress({
      day_1: { dedication: true, skill: true, teamwork: true }
    });

    queueResponse(supa, 'events_master', supaOk([bmEventActive]));
    queueResponse(supa, 'event_participations', supaOk([]));
    queueResponse(supa, 'event_participations', supaOk({
      ...participationPartial,
      data: fullData
    }));

    const req = mockReq({
      params: { eventId: bmEventActive.id },
      body: { data: fullData },
      user: userMember
    });
    const res = mockRes();

    await updateBmProgressV2(req, res);

    expect([200, 201]).toContain(res.statusCode);
    expect(res.body.success).toBe(true);
  });

  it('F4: evento no OPEN → 409 EVENT_NOT_OPEN', async () => {
    queueResponse(supa, 'events_master', supaOk([bmEventClosed]));

    const req = mockReq({
      params: { eventId: bmEventClosed.id },
      body: { day: 1, mission_type: 'dedication', completed: true },
      user: userMember
    });
    const res = mockRes();

    await updateBmProgressV2(req, res);

    expect(res.statusCode).toBe(409);
    expect(res.body.code).toBe('EVENT_NOT_OPEN');
  });

  it('F5: evento legacy → 409 LEGACY_BM_NO_PROGRESS', async () => {
    queueResponse(supa, 'events_master', supaOk([bmEventLegacy]));

    const req = mockReq({
      params: { eventId: bmEventLegacy.id },
      body: { day: 1, mission_type: 'dedication', completed: true },
      user: userMember
    });
    const res = mockRes();

    await updateBmProgressV2(req, res);

    expect(res.statusCode).toBe(409);
    expect(res.body.code).toBe('LEGACY_BM_NO_PROGRESS');
  });

  it('F6: ZodError — day=99 → 400', async () => {
    const req = mockReq({
      params: { eventId: bmEventActive.id },
      body: { day: 99, mission_type: 'dedication', completed: true },
      user: userMember
    });
    const res = mockRes();

    await updateBmProgressV2(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('F7: getSupabase() → null → 500 DB_UNAVAILABLE', async () => {
    globalThis.__TEST_SUPA__ = null;

    const req = mockReq({
      params: { eventId: bmEventActive.id },
      body: { day: 1, mission_type: 'dedication', completed: true },
      user: userMember
    });
    const res = mockRes();

    await updateBmProgressV2(req, res);

    expect(res.statusCode).toBe(500);
    expect(res.body.code).toBe('DB_UNAVAILABLE');
  });

  it('F8: verifica recálculo de puntos al togglear', async () => {
    queueResponse(supa, 'events_master', supaOk([bmEventActive]));
    queueResponse(supa, 'event_participations', supaOk([]));
    queueResponse(supa, 'event_participations', supaOk({
      ...participationPartial,
      id: 'new-uuid',
      computed_points: 25
    }));

    const req = mockReq({
      params: { eventId: bmEventActive.id },
      body: { day: 1, mission_type: 'dedication', completed: true },
      user: userMember
    });
    const res = mockRes();

    await updateBmProgressV2(req, res);

    expect(res.body.total_points).toBe(25);
    expect(res.body.completed_missions).toBe(1);
  });

});