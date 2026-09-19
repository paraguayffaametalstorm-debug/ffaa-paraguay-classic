/**
 * ============================================================================
 * PARAGUAY-FFAA | METALSTORM
 * Tests — PUT /api/events-v2/bm/:eventId (editar evento BM) [F4.2.2-C]
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
  bmEventClosed,
  bmEventLegacy,
  sqEventActive
} from '../fixtures/bm-events.js';
import { userOwner } from '../fixtures/users.js';

const supa = createSupabaseMock();

vi.mock('../../src/db/supabase.js', () => ({
  getSupabase: () => globalThis.__TEST_SUPA__ || null
}));

vi.mock('../../src/utils/audit.js', () => ({
  logAuditChange: vi.fn(async () => {}),
  logSecurityEvent: vi.fn(async () => {})
}));

import { updateBmEventV2 } from '../../src/controllers/events-v2-bm.controller.js';

beforeEach(() => {
  resetSupabaseMock(supa);
  globalThis.__TEST_SUPA__ = supa;
});

describe('PUT /api/events-v2/bm/:eventId — updateBmEventV2', () => {

  it('D1: happy path — edita name → 200', async () => {
    queueResponse(supa, 'events_master', supaOk([bmEventActive]));
    const updated = { ...bmEventActive, name: 'Nombre Actualizado' };
    queueResponse(supa, 'events_master', supaOk(updated));

    const req = mockReq({
      params: { eventId: bmEventActive.id },
      body: { name: 'Nombre Actualizado' },
      user: userOwner
    });
    const res = mockRes();

    await updateBmEventV2(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.event.name).toBe('Nombre Actualizado');
  });

  it('D2: evento no existe → 404 EVENT_NOT_FOUND', async () => {
    queueResponse(supa, 'events_master', supaOk([]));

    const req = mockReq({
      params: { eventId: 'no-existe' },
      body: { name: 'Nombre' },
      user: userOwner
    });
    const res = mockRes();

    await updateBmEventV2(req, res);

    expect(res.statusCode).toBe(404);
    expect(res.body.code).toBe('EVENT_NOT_FOUND');
  });

  it('D3: evento SQUADRON → 404 EVENT_NOT_BLACK_MARKET', async () => {
    queueResponse(supa, 'events_master', supaOk([sqEventActive]));

    const req = mockReq({
      params: { eventId: sqEventActive.id },
      body: { name: 'Nombre' },
      user: userOwner
    });
    const res = mockRes();

    await updateBmEventV2(req, res);

    expect(res.statusCode).toBe(404);
    expect(res.body.code).toBe('EVENT_NOT_BLACK_MARKET');
  });

  it('D4: evento legacy → 409 LEGACY_BM_READONLY', async () => {
    queueResponse(supa, 'events_master', supaOk([bmEventLegacy]));

    const req = mockReq({
      params: { eventId: bmEventLegacy.id },
      body: { name: 'Intento editar' },
      user: userOwner
    });
    const res = mockRes();

    await updateBmEventV2(req, res);

    expect(res.statusCode).toBe(409);
    expect(res.body.code).toBe('LEGACY_BM_READONLY');
  });

  it('D5: evento CLOSED → 409 EVENT_NOT_EDITABLE', async () => {
    queueResponse(supa, 'events_master', supaOk([bmEventClosed]));

    const req = mockReq({
      params: { eventId: bmEventClosed.id },
      body: { name: 'Intento editar' },
      user: userOwner
    });
    const res = mockRes();

    await updateBmEventV2(req, res);

    expect(res.statusCode).toBe(409);
    expect(res.body.code).toBe('EVENT_NOT_EDITABLE');
  });

  it('D6: metadata inválida → 400 VALIDATION_ERROR', async () => {
    queueResponse(supa, 'events_master', supaOk([bmEventActive]));

    const req = mockReq({
      params: { eventId: bmEventActive.id },
      body: { metadata: { duration_days: 999 } },
      user: userOwner
    });
    const res = mockRes();

    await updateBmEventV2(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('D7: getSupabase() → null → 500 DB_UNAVAILABLE', async () => {
    globalThis.__TEST_SUPA__ = null;

    const req = mockReq({
      params: { eventId: bmEventActive.id },
      body: { name: 'Nombre' },
      user: userOwner
    });
    const res = mockRes();

    await updateBmEventV2(req, res);

    expect(res.statusCode).toBe(500);
    expect(res.body.code).toBe('DB_UNAVAILABLE');
  });

  it('D8: error de Supabase → 500 INTERNAL_ERROR', async () => {
    queueResponse(supa, 'events_master', supaError('XX000', 'DB exploded'));

    const req = mockReq({
      params: { eventId: bmEventActive.id },
      body: { name: 'Nombre' },
      user: userOwner
    });
    const res = mockRes();

    await updateBmEventV2(req, res);

    expect(res.statusCode).toBe(500);
    expect(res.body.code).toBe('INTERNAL_ERROR');
  });

});