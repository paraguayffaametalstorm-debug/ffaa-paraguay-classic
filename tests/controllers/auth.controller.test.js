// tests/controllers/auth.controller.test.js
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// --- Mocks de Módulos ---
// Mockeamos TODAS las dependencias externas para un test unitario puro.
vi.mock('../../src/config/env.js', () => ({
  ENV: {
    JWT_SECRET: 'test-secret-for-vitest-suite',
    JWT_EXPIRES_IN: '1h',
    USE_ATOMIC_RESET: true, // Forzamos el camino de la RPC por defecto
    FRONTEND_URL: 'http://localhost:3000',
  },
}));
vi.mock('../../src/db/supabase.js');
vi.mock('../../src/utils/audit.js');
vi.mock('../../src/utils/security.js');
vi.mock('../../src/utils/email.js');
vi.mock('bcryptjs', () => {
  const mockCompare = vi.fn().mockResolvedValue(true);
  const mockHash = vi.fn().mockResolvedValue('hashed_new_password');
  return {
    default: { compare: mockCompare, hash: mockHash },
    compare: mockCompare,
    hash: mockHash,
  };
});
vi.mock('jsonwebtoken', () => {
  const mockSign = vi.fn().mockReturnValue('mocked_jwt_token');
  const mockVerify = vi.fn().mockReturnValue({ user_id: 1, role: 'MIEMBRO' });
  return {
    default: { sign: mockSign, verify: mockVerify },
    sign: mockSign,
    verify: mockVerify,
  };
});
vi.mock('../../src/config/passport.js', () => ({
  default: { authenticate: vi.fn() },
  isGoogleConfigured: vi.fn(() => true),
}));
vi.mock('../../src/config/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// --- Importaciones DESPUÉS de los mocks ---
import { login, changePassword, linkAccount, forgotPassword, resetPassword } from '../../src/controllers/auth.controller.js';
import { getSupabase } from '../../src/db/supabase.js';
import { logSecurityEvent } from '../../src/utils/audit.js';
import { generateTemporaryPassword, getNextUserId } from '../../src/utils/security.js';
import { sendPasswordResetEmail } from '../../src/utils/email.js';
import { createMockSupabase } from '../helpers/mockSupabase.js';

// --- Configuración de MSW (Mock Service Worker) ---
// Simula las respuestas de Supabase
const handlers = [
  // Auth: Login
  http.get('*/users', ({ request }) => {
    const url = new URL(request.url);
    const orQuery = url.searchParams.get('or');
    const ilikeQuery = url.searchParams.get('email');
    const nick = orQuery?.match(/nick\.ilike\.([^,]+)/)?.[1];
    const email = orQuery?.match(/email\.ilike\.([^,]+)/)?.[1] || ilikeQuery;
    const institutionalEmail = orQuery?.match(/email_institucional\.ilike\.([^,]+)/)?.[1];

    if (email?.includes('inactive')) {
      return HttpResponse.json([{ id: 'user-uuid-inactive', user_id: 99, email, nick: 'InactivePilot', status: 'INACTIVE', password_hash: 'hashed_password' }]);
    }
    if (email?.includes('expired')) {
      return HttpResponse.json([{ id: 'user-uuid-expired', user_id: 98, email, nick: 'ExpiredPilot', must_change_password: true, temporary_password_expires_at: new Date(Date.now() - 10000).toISOString(), password_hash: 'hashed_password' }]);
    }
    if (email?.includes('wrongpass')) {
      return HttpResponse.json([{ id: 'user-uuid-wrongpass', user_id: 97, email, nick: 'WrongPass', password_hash: 'hashed_wrong_password' }]);
    }
    if (nick || institutionalEmail || email) {
      return HttpResponse.json([{ id: 'user-uuid-1', user_id: 1, email: 'test@example.com', email_institucional: 'test@ffaa.py', nick: 'TestPilot', password_hash: 'hashed_password', role: 'MIEMBRO', token_version: 1, status: 'ACTIVE', must_change_password: false }]);
    }
    return HttpResponse.json([]);
  }),
  // Auth: Change Password (get user)
  http.get('*/users', ({ request }) => {
    const url = new URL(request.url);
    const userId = url.searchParams.get('user_id');
    const id = url.searchParams.get('id');
    if (id === 'user-uuid-1' || userId === '1') {
      return HttpResponse.json([{ id: 'user-uuid-1', user_id: 1, email: 'test@example.com', nick: 'TestPilot', password_hash: 'hashed_password', role: 'MIEMBRO', token_version: 1, must_change_password: false }]);
    }
    return HttpResponse.json([]);
  }),
  // Auth: Change Password (update user)
  http.patch('*/users', async ({ request }) => {
    return HttpResponse.json([{ id: 'user-uuid-1', user_id: 1, email: 'test@example.com', nick: 'TestPilot', role: 'MIEMBRO', token_version: 2, must_change_password: false }]);
  }),
  // Auth: Link Account (check email)
  http.get('*/users', ({ request }) => {
    const url = new URL(request.url);
    const email = url.searchParams.get('email');
    if (email?.includes('already-linked')) {
      return HttpResponse.json([{ id: 'other-uuid', nick: 'OtherUser', email }]);
    }
    return HttpResponse.json([]);
  }),
  // Auth: Link Account (get by nick)
  http.get('*/users', ({ request }) => {
    const url = new URL(request.url);
    const nick = url.searchParams.get('nick');
    if (nick?.includes('linked-user')) {
      return HttpResponse.json([{ id: 'user-uuid-1', user_id: 1, nick, email: 'old@example.com', google_linked: true, password_hash: 'hashed_password', status: 'ACTIVE' }]);
    }
    if (nick?.includes('unlinked-user')) {
      return HttpResponse.json([{ id: 'user-uuid-1', user_id: 1, nick, email: 'old@example.com', google_linked: false, password_hash: 'hashed_password', status: 'ACTIVE' }]);
    }
    return HttpResponse.json([]);
  }),
  // Auth: Link Account (update)
  http.patch('*/users', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json([{ id: 'user-uuid-1', user_id: 1, nick: 'UnlinkedUser', email: body.email, role: 'MIEMBRO', token_version: 1, must_change_password: false, google_linked: true }]);
  }),
  // Auth: Forgot Password (find user)
  http.get('*/users', ({ request }) => {
    const url = new URL(request.url);
    const email = url.searchParams.get('or')?.match(/email\.ilike\.([^,]+)/)?.[1];
    if (email === 'valid@example.com') {
      return HttpResponse.json([{ id: 'user-uuid-1', nick: 'TestPilot', email, token_version: 1, status: 'ACTIVE' }]);
    }
    return HttpResponse.json([]);
  }),
  // Auth: Forgot Password (insert reset token)
  http.post('*/password_resets', () => HttpResponse.json([{ id: 'reset-uuid-1' }])),
  // Auth: Reset Password (RPC)
  http.post('*/rpc/reset_password_atomic', async ({ request }) => {
    const body = await request.json();
    if (body.p_token === 'valid-token') {
      return HttpResponse.json([{ success: true, user_id: 'user-uuid-1', nick: 'TestPilot', token_version: 2 }]);
    }
    if (body.p_token === 'used-token') {
      return HttpResponse.json([{ success: false, error_code: 'TOKEN_ALREADY_USED' }]);
    }
    if (body.p_token === 'expired-token') {
        return HttpResponse.json([{ success: false, error_code: 'TOKEN_EXPIRED' }]);
    }
    return HttpResponse.json([{ success: false, error_code: 'TOKEN_NOT_FOUND' }]);
  }),
];

const server = setupServer(...handlers);

// --- Ciclo de Vida de los Tests ---
beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

beforeEach(() => {
  // Resetear mocks antes de cada test
  vi.clearAllMocks();
  // Configurar valores por defecto para los mocks
  getSupabase.mockReturnValue(createMockSupabase()); // Mock básico, MSW se encarga de la lógica
  getNextUserId.mockResolvedValue(100);
  generateTemporaryPassword.mockReturnValue('MS-TEST-XXXX');
  bcrypt.compare.mockResolvedValue(true); // Por defecto, la contraseña es válida
  bcrypt.hash.mockResolvedValue('hashed_new_password');
  jwt.sign.mockReturnValue('mocked_jwt_token');
  sendPasswordResetEmail.mockResolvedValue({ success: true, simulated: true });
});

// --- Tests ---
describe('Auth Controller - Sprint 3 (FIX-301)', () => {

  describe('login', () => {
    const mockReq = (body) => ({ body, ip: '127.0.0.1', headers: { 'user-agent': 'vitest' } });
    const mockRes = () => {
      const res = {};
      res.status = vi.fn().mockReturnThis();
      res.json = vi.fn().mockReturnThis();
      return res;
    };

    it('debe autenticar exitosamente con email institucional', async () => {
      const req = mockReq({ email: 'test@ffaa.py', password: 'correct_password' });
      const res = mockRes();
      await login(req, res);
      expect(res.status).not.toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ token: 'mocked_jwt_token' }));
      expect(logSecurityEvent).toHaveBeenCalledWith(expect.objectContaining({ event: 'LOGIN_SUCCESS' }));
    });

    it('debe autenticar exitosamente con Gmail vinculado', async () => {
        const req = mockReq({ email: 'test@gmail.com', password: 'correct_password' });
        const res = mockRes();
        await login(req, res);
        expect(res.status).not.toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ token: 'mocked_jwt_token' }));
    });

    it('debe autenticar exitosamente con nick', async () => {
        const req = mockReq({ email: 'TestPilot', password: 'correct_password' });
        const res = mockRes();
        await login(req, res);
        expect(res.status).not.toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ token: 'mocked_jwt_token' }));
    });

    it.skip('debe rechazar un login con usuario no encontrado [BL-025]', async () => {
      const req = mockReq({ email: 'notfound@example.com', password: 'any_password' });
      const res = mockRes();
      await login(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(logSecurityEvent).toHaveBeenCalledWith(expect.objectContaining({ event: 'LOGIN_FAILED', metadata: { reason: 'user_not_found', email: 'notfound@example.com' } }));
    });

    it('debe rechazar un login con contraseña incorrecta', async () => {
      bcrypt.compare.mockResolvedValue(false);
      const req = mockReq({ email: 'wrongpass@example.com', password: 'wrong_password' });
      const res = mockRes();
      await login(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(logSecurityEvent).toHaveBeenCalledWith(expect.objectContaining({ event: 'LOGIN_FAILED', metadata: { reason: 'invalid_password' } }));
    });

    it('debe rechazar el login de una cuenta inactiva', async () => {
      const req = mockReq({ email: 'inactive@example.com', password: 'correct_password' });
      const res = mockRes();
      await login(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('cuenta ha sido desactivada') }));
      expect(logSecurityEvent).toHaveBeenCalledWith(expect.objectContaining({ event: 'LOGIN_FAILED_INACTIVE' }));
    });

    it('debe rechazar el login con credencial temporal expirada', async () => {
      const req = mockReq({ email: 'expired@example.com', password: 'correct_password' });
      const res = mockRes();
      await login(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'TEMPORARY_CREDENTIAL_EXPIRED' }));
      expect(logSecurityEvent).toHaveBeenCalledWith(expect.objectContaining({ event: 'LOGIN_FAILED_EXPIRED_CREDENTIAL' }));
    });
  });

  // TODO Sprint 4 (BL-025): El controller usa Supabase fluido con filtros
  // tipados UUID/INTEGER que el mock actual no matchea correctamente.
  describe.skip('changePassword [BL-025]', () => {
    const mockReq = (body) => ({ body, user: { id: 'user-uuid-1', user_id: 1, email: 'test@example.com' }, ip: '127.0.0.1', headers: { 'user-agent': 'vitest' } });
    const mockRes = () => {
      const res = {};
      res.status = vi.fn().mockReturnThis();
      res.json = vi.fn().mockReturnThis();
      return res;
    };

    it('debe cambiar la contraseña en modo forzado (primer login)', async () => {
      const req = mockReq({ newPassword: 'NewPass123', isForced: true });
      const res = mockRes();
      await changePassword(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: expect.objectContaining({ token_version: 2 }) }));
      expect(logSecurityEvent).toHaveBeenCalledWith(expect.objectContaining({ event: 'PASSWORD_CHANGED', metadata: { forced_change: true } }));
    });

    it('debe rechazar el cambio forzado si la nueva contraseña no cumple la política', async () => {
        const req = mockReq({ newPassword: 'weak', isForced: true });
        const res = mockRes();
        await changePassword(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('al menos 8 caracteres') }));
    });

    it('debe cambiar la contraseña en modo voluntario', async () => {
        const req = mockReq({ newPassword: 'NewPass123', currentPassword: 'old_password', isForced: false });
        const res = mockRes();
        await changePassword(req, res);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        expect(logSecurityEvent).toHaveBeenCalledWith(expect.objectContaining({ event: 'PASSWORD_CHANGED', metadata: { forced_change: false } }));
    });

    it('debe rechazar el cambio voluntario si la contraseña actual es incorrecta', async () => {
        bcrypt.compare.mockResolvedValue(false);
        const req = mockReq({ newPassword: 'NewPass123', currentPassword: 'wrong_old_password', isForced: false });
        const res = mockRes();
        await changePassword(req, res);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Contraseña actual incorrecta' }));
    });

    it('debe rechazar el cambio voluntario si falta la contraseña actual', async () => {
        const req = mockReq({ newPassword: 'NewPass123', isForced: false });
        const res = mockRes();
        await changePassword(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'CURRENT_PASSWORD_REQUIRED' }));
    });
  });
  
  describe.skip('linkAccount [BL-025]', () => {
    const mockReq = (body) => ({ body, ip: '127.0.0.1', headers: { 'user-agent': 'vitest' } });
    const mockRes = () => {
      const res = {};
      res.status = vi.fn().mockReturnThis();
      res.json = vi.fn().mockReturnThis();
      return res;
    };

    it('debe vincular exitosamente un Gmail a un usuario no vinculado', async () => {
        const req = mockReq({ callsign: 'UnlinkedUser', password: 'correct_password', email: 'new@gmail.com' });
        const res = mockRes();
        await linkAccount(req, res);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, token: 'mocked_jwt_token' }));
        expect(logSecurityEvent).toHaveBeenCalledWith(expect.objectContaining({ event: 'ACCOUNT_GOOGLE_LINKED' }));
    });

    it('debe rechazar si el Gmail ya está vinculado a otro usuario', async () => {
        const req = mockReq({ callsign: 'AnyUser', password: 'correct_password', email: 'already-linked@gmail.com' });
        const res = mockRes();
        await linkAccount(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('ya se encuentra vinculado') }));
    });

    it('debe rechazar si el combatiente no existe', async () => {
        const req = mockReq({ callsign: 'NonExistentUser', password: 'correct_password', email: 'new@gmail.com' });
        const res = mockRes();
        await linkAccount(req, res);
        expect(res.status).toHaveBeenCalledWith(404);
    });

    it('debe rechazar si el combatiente ya tiene un Gmail vinculado', async () => {
        const req = mockReq({ callsign: 'LinkedUser', password: 'correct_password', email: 'new@gmail.com' });
        const res = mockRes();
        await linkAccount(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('ya tiene una cuenta de Google vinculada') }));
    });

    it('debe rechazar si la contraseña es incorrecta', async () => {
        bcrypt.compare.mockResolvedValue(false);
        const req = mockReq({ callsign: 'UnlinkedUser', password: 'wrong_password', email: 'new@gmail.com' });
        const res = mockRes();
        await linkAccount(req, res);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(logSecurityEvent).toHaveBeenCalledWith(expect.objectContaining({ event: 'LOGIN_GOOGLE_LINK_FAILED_PASSWORD' }));
    });
  });

  describe('forgotPassword & resetPassword', () => {
    const mockReq = (body) => ({ body, ip: '127.0.0.1', headers: { 'user-agent': 'vitest' } });
    const mockRes = () => {
      const res = {};
      res.status = vi.fn().mockReturnThis();
      res.json = vi.fn().mockReturnThis();
      return res;
    };

    it('forgotPassword debe generar un token y enviar un correo', async () => {
        const req = mockReq({ email: 'valid@example.com' });
        const res = mockRes();
        await forgotPassword(req, res);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        expect(sendPasswordResetEmail).toHaveBeenCalled();
        expect(logSecurityEvent).toHaveBeenCalledWith(expect.objectContaining({ event: 'PASSWORD_RESET_REQUESTED' }));
    });

    it('resetPassword debe usar la RPC atómica y actualizar la contraseña con un token válido', async () => {
        const req = mockReq({ token: 'valid-token', newPassword: 'NewPass123' });
        const res = mockRes();
        await resetPassword(req, res);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        expect(logSecurityEvent).toHaveBeenCalledWith(expect.objectContaining({ event: 'PASSWORD_RESET_SUCCESS', metadata: expect.objectContaining({ method: 'token_email_atomic' }) }));
    });

    it('resetPassword debe rechazar un token ya usado', async () => {
        const req = mockReq({ token: 'used-token', newPassword: 'NewPass123' });
        const res = mockRes();
        await resetPassword(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('ya ha sido utilizado') }));
    });

    it('resetPassword debe rechazar un token expirado', async () => {
        const req = mockReq({ token: 'expired-token', newPassword: 'NewPass123' });
        const res = mockRes();
        await resetPassword(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('expirado') }));
    });
  });
});