/**
 * ============================================================================
 * PARAGUAY-FFAA | METALSTORM
 * Tests — GET /api/events-v2/bm/:eventId/leaderboard [F4.2.2-C]
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
import {
  participationPartial,
  participationFull,
  participationEmpty
} from '../fixtures/bm-participations.js';
import { userMember } from '../fixtures/users.js';

const supa = createSupabaseMock();

vi.mock('../../src/db/supabase.js', () => ({
  getSupabase: () => globalThis.__TEST_SUPA__ || null
}));

import { getBmLeaderboardV2 } from '../../src/controllers/events-v2-bm.controller.js';

beforeEach(() => {
  resetSupabaseMock(supa);
  globalThis.__TEST_SUPA__ = supa;
});

describe('GET /api/events-v2/bm/:eventId/leaderboard — getBmLeaderboardV2', () => {

  it('G1: múltiples pilotos → ordenados por total_points DESC', async () => {
    queueResponse(supa, 'events_master', supaOk([bmEventActive]));
    queueResponse(supa, 'event_participations', supaOk([
      participationPartial,
      participationFull,
      participationEmpty
    ]));

    const req = mockReq({
      params: { eventId: bmEventActive.id },
      user: userMember
    });
    const res = mockRes();

    await getBmLeaderboardV2(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.leaderboard)).toBe(true);

    expect(res.body.leaderboard.length).toBe(2);

    expect(res.body.leaderboard[0].user_id).toBe(participationFull.user_id);
    expect(res.body.leaderboard[0].rank).toBe(1);
    expect(res.body.leaderboard[0].total_points).toBe(250);
    expect(res.body.leaderboard[1].rank).toBe(2);
  });

  it('G2: sin participaciones → leaderboard vacío', async () => {
    queueResponse(supa, 'events_master', supaOk([bmEventActive]));
    queueResponse(supa, 'event_participations', supaOk([]));

    const req = mockReq({
      params: { eventId: bmEventActive.id },
      user: userMember
    });
    const res = mockRes();

    await getBmLeaderboardV2(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.leaderboard.length).toBe(0);
    expect(res.body.total_participants).toBe(0);
  });

  it('G3: evento no existe → 404 EVENT_NOT_FOUND', async () => {
    queueResponse(supa, 'events_master', supaOk([]));

    const req = mockReq({
      params: { eventId: 'no-existe' },
      user: userMember
    });
    const res = mockRes();

    await getBmLeaderboardV2(req, res);

    expect(res.statusCode).toBe(404);
    expect(res.body.code).toBe('EVENT_NOT_FOUND');
  });

  it('G4: getSupabase() → null → 500 DB_UNAVAILABLE', async () => {
    globalThis.__TEST_SUPA__ = null;

    const req = mockReq({
      params: { eventId: bmEventActive.id },
      user: userMember
    });
    const res = mockRes();

    await getBmLeaderboardV2(req, res);

    expect(res.statusCode).toBe(500);
    expect(res.body.code).toBe('DB_UNAVAILABLE');
  });

  it('G5: error de Supabase → 500 INTERNAL_ERROR', async () => {
    queueResponse(supa, 'events_master', supaError('XX000', 'DB exploded'));

    const req = mockReq({
      params: { eventId: bmEventActive.id },
      user: userMember
    });
    const res = mockRes();

    await getBmLeaderboardV2(req, res);

    expect(res.statusCode).toBe(500);
    expect(res.body.code).toBe('INTERNAL_ERROR');
  });

});