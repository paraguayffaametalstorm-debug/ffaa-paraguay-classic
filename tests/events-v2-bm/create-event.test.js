/**
 * ============================================================================
 * PARAGUAY-FFAA | METALSTORM
 * Tests — POST /api/events-v2/bm (crear evento BM) [F4.2.2-C]
 * ============================================================================
 * Endpoint: createBmEventV2
 * Cubre:
 *   C1 — Happy path: payload válido completo → 201
 *   C2 — Autogenera 15 misiones si metadata.missions vacío
 *   C3 — ZodError: name faltante → 400 VALIDATION_ERROR
 *   C4 — ZodError: start_date inválido → 400
 *   C5 — ZodError: metadata inválida (duration_days > 30) → 400
 *   C6 — DB caída → 500 DB_UNAVAILABLE
 *   C7 — Error de Supabase → 500 INTERNAL_ERROR
 *   C8 — Verifica que el insert incluye type=BLACK_MARKET + auditoría
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
import { bmEventActive, buildMissions15 } from '../fixtures/bm-events.js';
import { userOwner } from '../fixtures/users.js';

const supa = createSupabaseMock();

vi.mock('../../src/db/supabase.js', () => ({
  getSupabase: () => globalThis.__TEST_SUPA__ || null
}));

vi.mock('../../src/utils/audit.js', () => ({
  logAuditChange: vi.fn(async () => {}),
  logSecurityEvent: vi.fn(async () => {})
}));

import { createBmEventV2 } from '../../src/controllers/events-v2-bm.controller.js';

function buildValidPayload(overrides = {}) {
  return {
    name: 'Operación Test BM 2026-W40',
    start_date: '2026-09-30T00:00:00Z',
    end_date: '2026-10-04T23:59:59Z',
    status: 'SCHEDULED',
    metadata: {
      aircraft_id: '125',
      aircraft_name: 'F-15EX Eagle II',
      missions: buildMissions15()
    },
    ...overrides
  };
}

beforeEach(() => {
  resetSupabaseMock(supa);
  globalThis.__TEST_SUPA__ = supa;
});

describe('POST /api/events-v2/bm — createBmEventV2', () => {

  it('C1: crea evento BM con payload válido → 201', async () => {
    const createdEvent = {
      ...bmEventActive,
      id: 'new-uuid-created-1111',
      name: 'Operación Test BM 2026-W40',
      status: 'SCHEDULED'
    };
    queueResponse(supa, 'events_master', supaOk(createdEvent));

    const req = mockReq({ body: buildValidPayload(), user: userOwner });
    const res = mockRes();

    await createBmEventV2(req, res);

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.event.id).toBe('new-uuid-created-1111');
    expect(res.body.event.type).toBe('BLACK_MARKET');
    expect(res.body.event.name).toBe('Operación Test BM 2026-W40');
    expect(res.body.message).toMatch(/creado/i);
  });

  it('C2: autogenera 15 misiones si metadata.missions está vacío', async () => {
    const payload = buildValidPayload();
    payload.metadata.missions = [];

    const createdEvent = {
      ...bmEventActive,
      id: 'new-uuid-autogen',
      metadata: {
        ...bmEventActive.metadata,
        missions: buildMissions15()
      }
    };
    queueResponse(supa, 'events_master', supaOk(createdEvent));

    const req = mockReq({ body: payload, user: userOwner });
    const res = mockRes();

    await createBmEventV2(req, res);

    expect(res.statusCode).toBe(201);
    expect(res.body.message).toMatch(/15 misiones/i);
  });

  it('C3: payload sin name → 400 VALIDATION_ERROR', async () => {
    const payload = buildValidPayload();
    delete payload.name;

    const req = mockReq({ body: payload, user: userOwner });
    const res = mockRes();

    await createBmEventV2(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(Array.isArray(res.body.details)).toBe(true);
  });

  it('C4: start_date no-ISO → 400 VALIDATION_ERROR', async () => {
    const payload = buildValidPayload({ start_date: 'no-soy-fecha' });

    const req = mockReq({ body: payload, user: userOwner });
    const res = mockRes();

    await createBmEventV2(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('C5: metadata.duration_days > 30 → 400 VALIDATION_ERROR', async () => {
    const payload = buildValidPayload();
    payload.metadata.duration_days = 31;

    const req = mockReq({ body: payload, user: userOwner });
    const res = mockRes();

    await createBmEventV2(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('C6: getSupabase() → null → 500 DB_UNAVAILABLE', async () => {
    globalThis.__TEST_SUPA__ = null;

    const req = mockReq({ body: buildValidPayload(), user: userOwner });
    const res = mockRes();

    await createBmEventV2(req, res);

    expect(res.statusCode).toBe(500);
    expect(res.body.code).toBe('DB_UNAVAILABLE');
  });

  it('C7: error de Supabase en insert → 500 INTERNAL_ERROR', async () => {
    queueResponse(supa, 'events_master', supaError('23505', 'duplicate key'));

    const req = mockReq({ body: buildValidPayload(), user: userOwner });
    const res = mockRes();

    await createBmEventV2(req, res);

    expect(res.statusCode).toBe(500);
    expect(res.body.code).toBe('INTERNAL_ERROR');
  });

  it('C8: insert incluye type=BLACK_MARKET y llama auditoría', async () => {
    const createdEvent = { ...bmEventActive, id: 'new-uuid-verify' };
    queueResponse(supa, 'events_master', supaOk(createdEvent));

    const req = mockReq({ body: buildValidPayload(), user: userOwner });
    const res = mockRes();

    await createBmEventV2(req, res);

    const query = supa._queryHistory[0];
    expect(query.table).toBe('events_master');
    expect(query.op).toBe('insert');
    expect(Array.isArray(query.payload)).toBe(true);
    expect(query.payload[0].type).toBe('BLACK_MARKET');
    expect(query.payload[0].name).toBe('Operación Test BM 2026-W40');
    expect(query.payload[0].status).toBe('SCHEDULED');
    expect(query.payload[0].metadata).toBeTruthy();
    expect(query.payload[0].created_by).toBe(userOwner.id);

    const { logAuditChange } = await import('../../src/utils/audit.js');
    expect(logAuditChange).toHaveBeenCalled();
    const auditCall = logAuditChange.mock.calls[0][0];
    expect(auditCall.action).toBe('CREATE_BM_EVENT_V2');
  });

});