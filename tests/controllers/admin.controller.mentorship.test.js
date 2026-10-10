// tests/controllers/admin.controller.mentorship.test.js
//
// ADR-010 — Tests de la auto-asignación de mentor en addMember().
//
// Cubre:
//   - addMember() con Veteranos disponibles → crea mentoría.
//   - addMember() elige el Veterano con MENOS pupilos ACTIVE.
//   - addMember() sin Veteranos → no falla, mentoría queda null.
//   - addMember() con role != MIEMBRO → NO auto-asigna.
//   - Fallo en auto-asignación → el miembro se crea igual (no bloqueante).
//   - Auditoría MENTORSHIP_AUTO_ASSIGNED se registra.

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── MOCKS ───────────────────────────────────────────────────────

const mockSupabase = { from: vi.fn() };

vi.mock('../../src/db/supabase.js', () => ({
  getSupabase: () => mockSupabase
}));

vi.mock('../../src/config/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
}));

vi.mock('../../src/utils/audit.js', () => ({
  logAuditChange: vi.fn().mockResolvedValue(undefined),
  logNickChange: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('../../src/utils/security.js', () => ({
  generateTemporaryPassword: vi.fn(() => 'MS-TEST-1234'),
  getNextUserId: vi.fn().mockResolvedValue(999),
  getTemporaryPasswordExpiry: vi.fn(() => '2026-10-17T00:00:00.000Z')
}));

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('$2b$10$mockhash')
  }
}));

// ─── IMPORTS DESPUÉS DE LOS MOCKS ────────────────────────────────
import { addMember } from '../../src/controllers/admin.controller.js';
import { logAuditChange } from '../../src/utils/audit.js';

// ─── HELPERS ─────────────────────────────────────────────────────

/**
 * Crea un mock de Supabase con respuestas pregrabadas por tabla y método.
 *
 * `responses` = {
 *   users: {
 *     then: [{...}, {...}],     // respuestas para `await builder` (sin .single())
 *     single: [{...}, {...}]    // respuestas para `.single()`
 *   },
 *   mentorships: { ... }
 * }
 *
 * Cada llamada a `.then()` o `.single()` consume la siguiente respuesta
 * de su categoría. Si se agotan, devuelve un default.
 */
function makeStatefulMock(responses = {}) {
  const counters = {}; // { users_then: 0, users_single: 0, ... }

  function nextResponse(table, method) {
    const key = `${table}_${method}`;
    const idx = counters[key] || 0;
    counters[key] = idx + 1;

    const arr = responses[table]?.[method] || [];
    if (idx < arr.length) return arr[idx];
    // Default según método
    if (method === 'single') return { data: null, error: null };
    return { data: [], error: null, count: 0 };
  }

  return {
    from: vi.fn((table) => {
      const builder = {
        select: vi.fn(() => builder),
        eq: vi.fn(() => builder),
        in: vi.fn(() => builder),
        or: vi.fn(() => builder),
        ilike: vi.fn(() => builder),
        order: vi.fn(() => builder),
        limit: vi.fn(() => builder),
        insert: vi.fn(() => builder),
        update: vi.fn(() => builder),

        single: vi.fn(() => {
          const resp = nextResponse(table, 'single');
          return Promise.resolve(resp);
        }),

        then: (onFulfilled, onRejected) => {
          const resp = nextResponse(table, 'then');
          return Promise.resolve(resp).then(onFulfilled, onRejected);
        }
      };
      return builder;
    }),
    _reset: () => {
      Object.keys(counters).forEach(k => delete counters[k]);
    }
  };
}

function mockReq({ user = {}, body = {} } = {}) {
  return { user, body, id: 'req-test-1' };
}

function mockRes() {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

const next = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── DATOS DE PRUEBA ─────────────────────────────────────────────

const ADMIN_USER = {
  id: 'aaaaaaaa-1111-1111-1111-111111111111',
  user_id: 1,
  nick: 'COMANDANTE',
  role: 'OWNER'
};

const VALID_MEMBER_BODY = {
  nick: 'PUPILO_NUEVO',
  email: 'pupilo_nuevo@ffaa.py',
  role: 'MIEMBRO'
};

const VET_A = { id: 'vvvvvvvv-1111-1111-1111-111111111111', nick: 'VIEJO_A' };
const VET_B = { id: 'vvvvvvvv-2222-2222-2222-222222222222', nick: 'VIEJO_B' };
const VET_C = { id: 'vvvvvvvv-3333-3333-3333-333333333333', nick: 'VIEJO_C' };

const NEW_USER_ROW = {
  id: 'nnnnnnnn-9999-9999-9999-999999999999',
  user_id: 999,
  nick: 'PUPILO_NUEVO',
  email: 'pupilo_nuevo@ffaa.py',
  role: 'MIEMBRO',
  status: 'ACTIVE'
};

const NEW_MENTORSHIP_ROW = {
  id: 'mmmmmmmm-1111-1111-1111-111111111111',
  mentor_id: VET_A.id,
  mentee_id: NEW_USER_ROW.id,
  status: 'ACTIVE',
  created_by: ADMIN_USER.id
};

// ═══════════════════════════════════════════════════════════════
describe('addMember — Auto-asignación de mentor (ADR-010)', () => {

  it('1. con Veteranos disponibles → crea mentoría automáticamente', async () => {
    const req = mockReq({ user: ADMIN_USER, body: VALID_MEMBER_BODY });
    const res = mockRes();

    // Orden de las calls (según admin.controller.js:addMember):
    //  users.then   → #0 count ACTIVE, #1 email check, #2 nick check, #3 list Veteranos
    //  users.single → #0 insert user
    //  mentorships.then   → #0 count VET_A, #1 count VET_B, #2 count VET_C
    //  mentorships.single → #0 insert mentorship
    const mock = makeStatefulMock({
      users: {
        then: [
          { count: 5, error: null },                    // count ACTIVE
          { data: [], error: null },                    // email check
          { data: [], error: null },                    // nick check
          { data: [VET_A, VET_B, VET_C], error: null }  // list Veteranos
        ],
        single: [
          { data: NEW_USER_ROW, error: null }           // insert user
        ]
      },
      mentorships: {
        then: [
          { count: 0, error: null },                    // VET_A: 0 pupilos
          { count: 2, error: null },                    // VET_B: 2 pupilos
          { count: 1, error: null }                     // VET_C: 1 pupilo
        ],
        single: [
          { data: NEW_MENTORSHIP_ROW, error: null }     // insert mentorship
        ]
      }
    });

    mockSupabase.from.mockImplementation(mock.from);

    await addMember(req, res, next);

    expect(res.status).toHaveBeenCalledWith(201);
    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.mentor_assigned).toBeDefined();
    expect(payload.mentor_assigned).not.toBeNull();
    expect(payload.mentor_assigned.mentor_nick).toBe('VIEJO_A'); // el de 0 pupilos
    expect(payload.mentor_assigned.mentorship_id).toBe(NEW_MENTORSHIP_ROW.id);
  });

  it('2. elige el Veterano con MENOS pupilos ACTIVE', async () => {
    const req = mockReq({ user: ADMIN_USER, body: VALID_MEMBER_BODY });
    const res = mockRes();

    // VET_A=3, VET_B=0, VET_C=1 → debe elegir VET_B
    const mock = makeStatefulMock({
      users: {
        then: [
          { count: 5, error: null },
          { data: [], error: null },
          { data: [], error: null },
          { data: [VET_A, VET_B, VET_C], error: null }
        ],
        single: [
          { data: NEW_USER_ROW, error: null }
        ]
      },
      mentorships: {
        then: [
          { count: 3, error: null },                    // VET_A
          { count: 0, error: null },                    // VET_B
          { count: 1, error: null }                     // VET_C
        ],
        single: [
          { data: { ...NEW_MENTORSHIP_ROW, mentor_id: VET_B.id }, error: null }
        ]
      }
    });

    mockSupabase.from.mockImplementation(mock.from);

    await addMember(req, res, next);

    expect(res.status).toHaveBeenCalledWith(201);
    const payload = res.json.mock.calls[0][0];
    expect(payload.mentor_assigned).not.toBeNull();
    expect(payload.mentor_assigned.mentor_nick).toBe('VIEJO_B');
    expect(payload.mentor_assigned.previous_pupilos).toBe(0);
  });

  it('3. sin Veteranos disponibles → no falla, mentor_assigned = null', async () => {
    const req = mockReq({ user: ADMIN_USER, body: VALID_MEMBER_BODY });
    const res = mockRes();

    const mock = makeStatefulMock({
      users: {
        then: [
          { count: 5, error: null },
          { data: [], error: null },
          { data: [], error: null },
          { data: [], error: null }                     // sin Veteranos
        ],
        single: [
          { data: NEW_USER_ROW, error: null }
        ]
      },
      mentorships: {
        then: [],
        single: []
      }
    });

    mockSupabase.from.mockImplementation(mock.from);

    await addMember(req, res, next);

    expect(res.status).toHaveBeenCalledWith(201);
    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.mentor_assigned).toBeNull();
    expect(payload.message).toMatch(/registrado/);
  });

  it('4. con role != MIEMBRO → NO auto-asigna mentor', async () => {
    const req = mockReq({
      user: ADMIN_USER,
      body: { nick: 'NUEVO_VET', email: 'nuevovet@ffaa.py', role: 'VETERANO' }
    });
    const res = mockRes();

    const mock = makeStatefulMock({
      users: {
        then: [
          { count: 5, error: null },
          { data: [], error: null },
          { data: [], error: null }
          // No hay list de Veteranos porque no se llama a assignMentorAuto
        ],
        single: [
          { data: { ...NEW_USER_ROW, role: 'VETERANO' }, error: null }
        ]
      },
      mentorships: {
        then: [],
        single: []
      }
    });

    mockSupabase.from.mockImplementation(mock.from);

    await addMember(req, res, next);

    expect(res.status).toHaveBeenCalledWith(201);
    const payload = res.json.mock.calls[0][0];
    expect(payload.mentor_assigned).toBeNull();
  });

  it('5. auditoría MENTORSHIP_AUTO_ASSIGNED se registra', async () => {
    const req = mockReq({ user: ADMIN_USER, body: VALID_MEMBER_BODY });
    const res = mockRes();

    const mock = makeStatefulMock({
      users: {
        then: [
          { count: 5, error: null },
          { data: [], error: null },
          { data: [], error: null },
          { data: [VET_A, VET_B, VET_C], error: null }
        ],
        single: [
          { data: NEW_USER_ROW, error: null }
        ]
      },
      mentorships: {
        then: [
          { count: 0, error: null },
          { count: 2, error: null },
          { count: 1, error: null }
        ],
        single: [
          { data: NEW_MENTORSHIP_ROW, error: null }
        ]
      }
    });

    mockSupabase.from.mockImplementation(mock.from);

    await addMember(req, res, next);

    const calls = logAuditChange.mock.calls;
    const mentorshipAudit = calls.find(c => c[0]?.action === 'MENTORSHIP_AUTO_ASSIGNED');
    expect(mentorshipAudit).toBeDefined();
    expect(mentorshipAudit[0].details.mentor_id).toBe(VET_A.id);
    expect(mentorshipAudit[0].details.mentee_id).toBe(NEW_USER_ROW.id);
  });

  it('6. si la auto-asignación falla → miembro se crea igual (no bloqueante)', async () => {
    const req = mockReq({ user: ADMIN_USER, body: VALID_MEMBER_BODY });
    const res = mockRes();

    const mock = makeStatefulMock({
      users: {
        then: [
          { count: 5, error: null },
          { data: [], error: null },
          { data: [], error: null },
          { data: [VET_A, VET_B, VET_C], error: null }
        ],
        single: [
          { data: NEW_USER_ROW, error: null }
        ]
      },
      mentorships: {
        then: [
          { count: 0, error: null },
          { count: 2, error: null },
          { count: 1, error: null }
        ],
        single: [
          // Forzar error en el insert
          { data: null, error: { code: 'XX000', message: 'boom' } }
        ]
      }
    });

    mockSupabase.from.mockImplementation(mock.from);

    await addMember(req, res, next);

    expect(res.status).toHaveBeenCalledWith(201);
    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.mentor_assigned).toBeNull();
  });

  it('7. si el pupilo ya tiene mentor ACTIVE (23505) → no falla', async () => {
    const req = mockReq({ user: ADMIN_USER, body: VALID_MEMBER_BODY });
    const res = mockRes();

    const mock = makeStatefulMock({
      users: {
        then: [
          { count: 5, error: null },
          { data: [], error: null },
          { data: [], error: null },
          { data: [VET_A, VET_B, VET_C], error: null }
        ],
        single: [
          { data: NEW_USER_ROW, error: null }
        ]
      },
      mentorships: {
        then: [
          { count: 0, error: null },
          { count: 2, error: null },
          { count: 1, error: null }
        ],
        single: [
          // Error 23505 (unique violation)
          { data: null, error: { code: '23505', message: 'duplicate key' } }
        ]
      }
    });

    mockSupabase.from.mockImplementation(mock.from);

    await addMember(req, res, next);

    expect(res.status).toHaveBeenCalledWith(201);
    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.mentor_assigned).toBeNull();
  });
});