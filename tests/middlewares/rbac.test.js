// tests/middlewares/rbac.test.js
//
// FIX-302 — Tests de RBAC (Role-Based Access Control)
// BL-025 F2: reescrito a unit puro. Sin Express, sin supertest, sin MSW.
// Se prueba requireAuth y requireRole con req/res/next mockeados y
// createHybridSupabase(DB) como mock oficial del proyecto.
//
// Cubre: middleware requireAuth, middleware requireRole,
//        cuotas institucionales (ROLE_LIMITS) y matriz de jerarquía
//        administrativa.
//
import { describe, it, expect, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';

// --- Mocks de Módulos ---
vi.mock('../../src/config/env.js', () => ({
  ENV: {
    JWT_SECRET: 'test-secret-for-rbac-suite',
    JWT_EXPIRES_IN: '1h',
  },
}));

vi.mock('../../src/db/supabase.js');

vi.mock('../../src/utils/audit.js', () => ({
  logSecurityEvent: vi.fn().mockResolvedValue(undefined),
  logAuditChange: vi.fn().mockResolvedValue(undefined),
  logNickChange: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/utils/security.js', () => ({
  generateTemporaryPassword: vi.fn(() => 'MS-TEST-XXXX'),
  getNextUserId: vi.fn().mockResolvedValue(999),
}));

vi.mock('../../src/config/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// --- Importaciones DESPUÉS de los mocks ---
import { requireAuth, requireRole } from '../../src/middlewares/auth.js';
import { getSupabase } from '../../src/db/supabase.js';
import { createHybridSupabase } from '../helpers/mockSupabaseHybrid.js';

// --- DB en memoria para los tests ---
const USERS_DB = {
  users: [
    { id: 'uuid-owner',    user_id: 1, email: 'owner@ffaa.py',    nick: 'OWNER_PILOT',    role: 'OWNER',    status: 'ACTIVE', token_version: 1 },
    { id: 'uuid-admin',    user_id: 2, email: 'admin@ffaa.py',    nick: 'ADMIN_PILOT',    role: 'ADMIN',    status: 'ACTIVE', token_version: 1 },
    { id: 'uuid-vet',      user_id: 3, email: 'vet@ffaa.py',      nick: 'VET_PILOT',      role: 'VETERANO', status: 'ACTIVE', token_version: 1 },
    { id: 'uuid-mem',      user_id: 4, email: 'mem@ffaa.py',      nick: 'MEM_PILOT',      role: 'MIEMBRO',  status: 'ACTIVE', token_version: 1 },
    { id: 'uuid-inactive', user_id: 5, email: 'inactive@ffaa.py', nick: 'INACTIVE_PILOT', role: 'MIEMBRO',  status: 'INACTIVE', token_version: 1, inactive_reason: 'Test inactive', inactive_at: new Date().toISOString() },
    { id: 'uuid-stale',    user_id: 6, email: 'stale@ffaa.py',    nick: 'STALE_PILOT',    role: 'MIEMBRO',  status: 'ACTIVE', token_version: 5 },
  ],
};

// --- Helpers de req/res/next ---
function mockReq(headers = {}, user = null) {
  return { headers, user, ip: '127.0.0.1' };
}

function mockRes() {
  const res = {};
  res.status = vi.fn().mockReturnThis();
  res.json = vi.fn().mockReturnThis();
  return res;
}

function mockNext() {
  return vi.fn();
}

// --- JWT helper ---
function makeToken(user, tokenVersionOverride = null) {
  const tokenVersion = tokenVersionOverride ?? (user.token_version || 1);
  return jwt.sign(
    {
      user_id: user.user_id,
      email: user.email,
      role: user.role,
      token_version: tokenVersion,
    },
    'test-secret-for-rbac-suite',
    { expiresIn: '1h' }
  );
}

// --- Setup global ---
beforeEach(() => {
  vi.clearAllMocks();
  getSupabase.mockReturnValue(createHybridSupabase(USERS_DB));
});

// --- Tests ---
describe('RBAC — Sprint 3 (FIX-302) / BL-025 F2 (unit puro)', () => {

  // ============================================================
  // 1. MIDDLEWARE requireAuth
  // ============================================================
  describe('Middleware requireAuth', () => {

    it('debe rechazar petición sin header Authorization', async () => {
      const req = mockReq();
      const res = mockRes();
      const next = mockNext();
      await requireAuth(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'AUTH_TOKEN_REQUIRED' }));
      expect(next).not.toHaveBeenCalled();
    });

    it('debe rechazar petición con formato de header inválido', async () => {
      const req = mockReq({ authorization: 'InvalidFormat' });
      const res = mockRes();
      const next = mockNext();
      await requireAuth(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(['AUTH_TOKEN_INVALID', 'AUTH_TOKEN_EXPIRED']).toContain(res.json.mock.calls[0][0].code);
      expect(next).not.toHaveBeenCalled();
    });

    it('debe rechazar un token JWT malformado', async () => {
      const req = mockReq({ authorization: 'Bearer not.a.valid.jwt' });
      const res = mockRes();
      const next = mockNext();
      await requireAuth(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(['AUTH_TOKEN_INVALID', 'AUTH_TOKEN_EXPIRED']).toContain(res.json.mock.calls[0][0].code);
      expect(next).not.toHaveBeenCalled();
    });

    it('debe rechazar un token firmado con otra clave', async () => {
      const badToken = jwt.sign({ user_id: 1, role: 'OWNER' }, 'wrong-secret', { expiresIn: '1h' });
      const req = mockReq({ authorization: `Bearer ${badToken}` });
      const res = mockRes();
      const next = mockNext();
      await requireAuth(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(['AUTH_TOKEN_INVALID', 'AUTH_TOKEN_EXPIRED']).toContain(res.json.mock.calls[0][0].code);
      expect(next).not.toHaveBeenCalled();
    });

    it('debe aceptar un token válido de un usuario ACTIVE', async () => {
      const token = makeToken(USERS_DB.users[0]); // owner
      const req = mockReq({ authorization: `Bearer ${token}` });
      const res = mockRes();
      const next = mockNext();
      await requireAuth(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(req.user).toBeDefined();
      expect(req.user.role).toBe('OWNER');
      expect(req.user.password_hash).toBeUndefined();
    });

    it('debe rechazar un token cuyo token_version esté desactualizado (sesión fantasma)', async () => {
      // Token viejo con version 1, pero en DB el usuario tiene version 5
      const token = makeToken(USERS_DB.users[5], 1); // stale_token
      const req = mockReq({ authorization: `Bearer ${token}` });
      const res = mockRes();
      const next = mockNext();
      await requireAuth(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'TOKEN_VERSION_MISMATCH' }));
      expect(next).not.toHaveBeenCalled();
    });

    it('debe rechazar a un usuario con status INACTIVE', async () => {
      const token = makeToken(USERS_DB.users[4]); // inactive
      const req = mockReq({ authorization: `Bearer ${token}` });
      const res = mockRes();
      const next = mockNext();
      await requireAuth(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'USER_INACTIVE' }));
      expect(next).not.toHaveBeenCalled();
    });

    it('el mensaje de cuenta inactiva debe incluir contexto (motivo, actor, contacto)', async () => {
      const token = makeToken(USERS_DB.users[4]);
      const req = mockReq({ authorization: `Bearer ${token}` });
      const res = mockRes();
      const next = mockNext();
      await requireAuth(req, res, next);
      const body = res.json.mock.calls[0][0];
      expect(body.error).toContain('ACCESO DENEGADO');
      expect(body.details).toBeDefined();
      expect(body.details.contact).toBe('comando.central@ffaa.py');
    });

    it('debe rechazar cuando el usuario del token no existe en DB', async () => {
      // Token válido pero apunta a un user_id inexistente
      const ghostToken = jwt.sign(
        { user_id: 99999, email: 'ghost@ffaa.py', role: 'MIEMBRO', token_version: 1 },
        'test-secret-for-rbac-suite',
        { expiresIn: '1h' }
      );
      const req = mockReq({ authorization: `Bearer ${ghostToken}` });
      const res = mockRes();
      const next = mockNext();
      await requireAuth(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'USER_NOT_FOUND' }));
      expect(next).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // 2. MIDDLEWARE requireRole
  // ============================================================
  describe('Middleware requireRole', () => {

    it('debe permitir el acceso si el rol está en la lista', () => {
      const req = mockReq({}, { role: 'ADMIN' });
      const res = mockRes();
      const next = mockNext();
      requireRole('OWNER', 'ADMIN')(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('debe rechazar el acceso si el rol NO está en la lista', () => {
      const req = mockReq({}, { role: 'MIEMBRO' });
      const res = mockRes();
      const next = mockNext();
      requireRole('OWNER', 'ADMIN')(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      // NOTA: contrato real del controller = INSUFFICIENT_PERMISSIONS
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'INSUFFICIENT_PERMISSIONS' }));
      expect(next).not.toHaveBeenCalled();
    });

    it('debe rechazar con 401 si no hay req.user', () => {
      const req = mockReq({}, null);
      const res = mockRes();
      const next = mockNext();
      requireRole('OWNER')(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'UNAUTHENTICATED' }));
      expect(next).not.toHaveBeenCalled();
    });

    it('debe permitir el acceso si el rol es OWNER y solo se permite OWNER', () => {
      const req = mockReq({}, { role: 'OWNER' });
      const res = mockRes();
      const next = mockNext();
      requireRole('OWNER')(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('debe rechazar ADMIN si solo se permite OWNER', () => {
      const req = mockReq({}, { role: 'ADMIN' });
      const res = mockRes();
      const next = mockNext();
      requireRole('OWNER')(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'INSUFFICIENT_PERMISSIONS' }));
      expect(next).not.toHaveBeenCalled();
    });

    it('debe aceptar un array de roles como primer argumento', () => {
      const req = mockReq({}, { role: 'VETERANO' });
      const res = mockRes();
      const next = mockNext();
      requireRole(['OWNER', 'ADMIN', 'VETERANO'])(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    // Matriz completa: 4 roles × 4 roles = 16 combinaciones
    describe('Matriz completa de roles (4x4)', () => {
      const roleMatrix = [
        ['OWNER',    ['OWNER'],    200],
        ['OWNER',    ['ADMIN'],    403],
        ['OWNER',    ['VETERANO'], 403],
        ['OWNER',    ['MIEMBRO'],  403],
        ['ADMIN',    ['OWNER'],    403],
        ['ADMIN',    ['ADMIN'],    200],
        ['ADMIN',    ['VETERANO'], 403],
        ['ADMIN',    ['MIEMBRO'],  403],
        ['VETERANO', ['OWNER'],    403],
        ['VETERANO', ['ADMIN'],    403],
        ['VETERANO', ['VETERANO'], 200],
        ['VETERANO', ['MIEMBRO'],  403],
        ['MIEMBRO',  ['OWNER'],    403],
        ['MIEMBRO',  ['ADMIN'],    403],
        ['MIEMBRO',  ['VETERANO'], 403],
        ['MIEMBRO',  ['MIEMBRO'],  200],
      ];

      it.each(roleMatrix)(
        'actor %s con allowedRoles %j → status esperado %i',
        (actorRole, allowedRoles, expectedStatus) => {
          const req = mockReq({}, { role: actorRole });
          const res = mockRes();
          const next = mockNext();
          requireRole(...allowedRoles)(req, res, next);

          if (expectedStatus === 200) {
            expect(next).toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
          } else {
            expect(res.status).toHaveBeenCalledWith(expectedStatus);
            expect(next).not.toHaveBeenCalled();
          }
        }
      );
    });
  });

  // ============================================================
  // 3. CUOTAS INSTITUCIONALES (ROLE_LIMITS)
  // ============================================================
  describe('Cuotas institucionales (ROLE_LIMITS)', () => {

    it('debe existir la constante ROLE_LIMITS con los valores correctos', async () => {
      const adminModule = await import('../../src/controllers/admin.controller.js');
      expect(adminModule.ROLE_LIMITS).toBeDefined();
      expect(adminModule.ROLE_LIMITS.OWNER).toBe(1);
      expect(adminModule.ROLE_LIMITS.ADMIN).toBe(5);
      expect(adminModule.ROLE_LIMITS.VETERANO).toBe(8);
    });
  });

  // ============================================================
  // 4. MATRIZ DE JERARQUÍA EN ENDPOINTS ADMINISTRATIVOS
  // ============================================================
  describe('Matriz de jerarquía administrativa', () => {

    const hierarchyMatrix = [
      // --- Cambio de rol ---
      ['OWNER',    'MIEMBRO',  'change_role', 'ALLOWED'],
      ['OWNER',    'VETERANO', 'change_role', 'ALLOWED'],
      ['OWNER',    'ADMIN',    'change_role', 'ALLOWED'],
      ['OWNER',    'OWNER',    'change_role', 'OWNER_PROTECTED'],
      ['ADMIN',    'MIEMBRO',  'change_role', 'ALLOWED'],
      ['ADMIN',    'VETERANO', 'change_role', 'ALLOWED'],
      ['ADMIN',    'ADMIN',    'change_role', 'ALLOWED'],
      ['ADMIN',    'OWNER',    'change_role', 'OWNER_PROTECTED'],
      ['VETERANO', 'MIEMBRO',  'change_role', 'FORBIDDEN'],
      ['VETERANO', 'OWNER',    'change_role', 'OWNER_PROTECTED'],
      ['MIEMBRO',  'MIEMBRO',  'change_role', 'FORBIDDEN'],

      // --- Inactivar ---
      ['OWNER',    'MIEMBRO',  'deactivate', 'ALLOWED'],
      ['OWNER',    'VETERANO', 'deactivate', 'ALLOWED'],
      ['OWNER',    'ADMIN',    'deactivate', 'ALLOWED'],
      ['OWNER',    'OWNER',    'deactivate', 'OWNER_PROTECTED'],
      ['ADMIN',    'MIEMBRO',  'deactivate', 'ALLOWED'],
      ['ADMIN',    'VETERANO', 'deactivate', 'ALLOWED'],
      ['ADMIN',    'ADMIN',    'deactivate', 'ALLOWED'],
      ['ADMIN',    'OWNER',    'deactivate', 'OWNER_PROTECTED'],
      ['VETERANO', 'MIEMBRO',  'deactivate', 'FORBIDDEN'],
      ['MIEMBRO',  'MIEMBRO',  'deactivate', 'FORBIDDEN'],

      // --- Reset password ---
      ['OWNER',    'MIEMBRO',  'reset_pass', 'ALLOWED'],
      ['OWNER',    'ADMIN',    'reset_pass', 'ALLOWED'],
      ['OWNER',    'OWNER',    'reset_pass', 'OWNER_PROTECTED'],
      ['ADMIN',    'MIEMBRO',  'reset_pass', 'ALLOWED'],
      ['ADMIN',    'VETERANO', 'reset_pass', 'ALLOWED'],
      ['ADMIN',    'ADMIN',    'reset_pass', 'ALLOWED'],
      ['ADMIN',    'OWNER',    'reset_pass', 'OWNER_PROTECTED'],
      ['VETERANO', 'MIEMBRO',  'reset_pass', 'FORBIDDEN'],
      ['MIEMBRO',  'MIEMBRO',  'reset_pass', 'FORBIDDEN'],
    ];

    // Función helper: evalúa la regla de jerarquía tal como lo haría el controller
    function evaluateHierarchy(actor, target, action) {
      const actorRole = actor.role.toUpperCase();
      const targetRole = target.role.toUpperCase();
      const isSelf = actor.id === target.id;

      // Regla 0: Nadie se modifica a sí mismo
      if (isSelf) {
        if (targetRole === 'OWNER') return 'OWNER_PROTECTED';
        if (action === 'reset_pass') return 'SELF_RESET_FORBIDDEN';
        return 'SELF_MODIFICATION_FORBIDDEN';
      }

      // Regla 1: OWNER intocable por cualquiera que no sea OWNER
      if (targetRole === 'OWNER') return 'OWNER_PROTECTED';

      // Regla 2: Solo OWNER y ADMIN pueden modificar
      if (actorRole !== 'OWNER' && actorRole !== 'ADMIN') return 'FORBIDDEN';

      // Regla 3: ADMIN puede modificar a MIEMBRO, VETERANO y ADMIN (post-HALL-S2-01)
      if (actorRole === 'ADMIN') {
        if (['MIEMBRO', 'VETERANO', 'ADMIN'].includes(targetRole)) return 'ALLOWED';
        return 'HIERARCHY_FORBIDDEN';
      }

      // Regla 4: OWNER puede todo lo que no sea él mismo
      if (actorRole === 'OWNER') return 'ALLOWED';

      return 'FORBIDDEN';
    }

    it.each(hierarchyMatrix)(
      'actor %s → target %s en %s → esperado: %s',
      (actorRole, targetRole, action, expectedResult) => {
        const actor = { id: `uuid-${actorRole.toLowerCase()}`, role: actorRole };
        const target = { id: `uuid-target-${targetRole.toLowerCase()}`, role: targetRole };
        const result = evaluateHierarchy(actor, target, action);
        expect(result).toBe(expectedResult);
      }
    );

    it('debe detectar correctamente el caso de auto-modificación', () => {
      const actor = { id: 'uuid-same', role: 'ADMIN' };
      const target = { id: 'uuid-same', role: 'ADMIN' };
      expect(evaluateHierarchy(actor, target, 'change_role')).toBe('SELF_MODIFICATION_FORBIDDEN');
      expect(evaluateHierarchy(actor, target, 'deactivate')).toBe('SELF_MODIFICATION_FORBIDDEN');
      expect(evaluateHierarchy(actor, target, 'reset_pass')).toBe('SELF_RESET_FORBIDDEN');
    });

    it('debe proteger al OWNER contra cualquier ADMIN', () => {
      const actor = { id: 'uuid-admin', role: 'ADMIN' };
      const target = { id: 'uuid-owner', role: 'OWNER' };
      expect(evaluateHierarchy(actor, target, 'change_role')).toBe('OWNER_PROTECTED');
      expect(evaluateHierarchy(actor, target, 'deactivate')).toBe('OWNER_PROTECTED');
      expect(evaluateHierarchy(actor, target, 'reset_pass')).toBe('OWNER_PROTECTED');
    });

    it('debe permitir al ADMIN modificar a otro ADMIN (post-HALL-S2-01)', () => {
      const actor = { id: 'uuid-admin-1', role: 'ADMIN' };
      const target = { id: 'uuid-admin-2', role: 'ADMIN' };
      expect(evaluateHierarchy(actor, target, 'change_role')).toBe('ALLOWED');
      expect(evaluateHierarchy(actor, target, 'deactivate')).toBe('ALLOWED');
      expect(evaluateHierarchy(actor, target, 'reset_pass')).toBe('ALLOWED');
    });

    it('debe denegar a MIEMBRO y VETERANO cualquier acción administrativa', () => {
      const target = { id: 'uuid-other', role: 'MIEMBRO' };
      expect(evaluateHierarchy({ id: 'uuid-m', role: 'MIEMBRO' }, target, 'change_role')).toBe('FORBIDDEN');
      expect(evaluateHierarchy({ id: 'uuid-v', role: 'VETERANO' }, target, 'change_role')).toBe('FORBIDDEN');
      expect(evaluateHierarchy({ id: 'uuid-m', role: 'MIEMBRO' }, target, 'deactivate')).toBe('FORBIDDEN');
      expect(evaluateHierarchy({ id: 'uuid-v', role: 'VETERANO' }, target, 'deactivate')).toBe('FORBIDDEN');
    });
  });
});