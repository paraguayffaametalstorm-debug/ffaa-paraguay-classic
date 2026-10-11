// tests/controllers/auth.controller.test.js
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// --- Mocks de Módulos ---
vi.mock('../../src/config/env.js', () => ({
  ENV: {
    JWT_SECRET: 'test-secret-for-vitest-suite',
    JWT_EXPIRES_IN: '1h',
    USE_ATOMIC_RESET: true,
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
// BL-025: Un SOLO handler para */users, con matching explícito por query param.
const handlers = [
  http.get('*/users', ({ request }) => {
    const url = new URL(request.url);

    // Limpia prefijos que agrega el serializador del mock ("eq.", "ilike.")
    const clean = (val) => (val || '').replace(/^(eq\.|ilike\.)/, '');

    const email = clean(url.searchParams.get('email'));
    const nick = clean(url.searchParams.get('nick'));
    const userId = clean(url.searchParams.get('user_id'));
    const id = clean(url.searchParams.get('id'));
    const role = clean(url.searchParams.get('role'));

    // Parsear or=email.ilike.X,nick.ilike.Y,email_institucional.ilike.Z
    const orQuery = url.searchParams.get('or') || '';
    const orEmail = orQuery.match(/(?:^|,|\()email\.ilike\.([^,)]+)/)?.[1] || '';
    const orEmailInst = orQuery.match(/email_institucional\.ilike\.([^,)]+)/)?.[1] || '';
    const orNick = orQuery.match(/nick\.ilike\.([^,)]+)/)?.[1] || '';

    // "email buscado" unificando direct + or=. Se usa SOLO en login/forgot.
    const emailBusqueda = email || orEmail || orEmailInst;
    // "nick buscado" unificando direct + or=. Se usa SOLO en linkAccount.
    const nickBusqueda = nick || orNick;

    // ═══ linkAccount: check email duplicado ═══════════════════════
    if (email && email.includes('already-linked')) {
      return HttpResponse.json([{ id: 'other-uuid', nick: 'OtherUser', email }]);
    }

    // ═══ linkAccount: buscar por nick (dos queries) ═══════════════
    // Normalizar: quitar guiones para que "LinkedUser", "linked-user" y "Linked_User" matcheen.
    const nickNorm = nickBusqueda.toLowerCase().replace(/[-_]/g, '');
    if (nickNorm === 'unlinkeduser') {
      return HttpResponse.json([{ id: 'user-uuid-1', user_id: 1, nick: nickBusqueda, email: 'old@example.com', google_linked: false, password_hash: 'hashed_password', status: 'ACTIVE' }]);
    }
    if (nickNorm === 'linkeduser') {
      return HttpResponse.json([{ id: 'user-uuid-1', user_id: 1, nick: nickBusqueda, email: 'old@example.com', google_linked: true, password_hash: 'hashed_password', status: 'ACTIVE' }]);
    }
    if (nickBusqueda === 'NonExistentUser') {
      return HttpResponse.json([]);
    }

    // ═══ login: casos de error ═════════════════════════════════════
    if (emailBusqueda.includes('inactive')) {
      return HttpResponse.json([{ id: 'user-uuid-inactive', user_id: 99, email: emailBusqueda, nick: 'InactivePilot', status: 'INACTIVE', password_hash: 'hashed_password' }]);
    }
    if (emailBusqueda.includes('expired')) {
      return HttpResponse.json([{ id: 'user-uuid-expired', user_id: 98, email: emailBusqueda, nick: 'ExpiredPilot', must_change_password: true, temporary_password_expires_at: new Date(Date.now() - 10000).toISOString(), password_hash: 'hashed_password' }]);
    }
    if (emailBusqueda.includes('wrongpass')) {
      return HttpResponse.json([{ id: 'user-uuid-wrongpass', user_id: 97, email: emailBusqueda, nick: 'WrongPass', password_hash: 'hashed_wrong_password' }]);
    }
    if (emailBusqueda.includes('notfound')) {
      return HttpResponse.json([]);
    }

    // ═══ forgotPassword: buscar por email ═════════════════════════
    if (emailBusqueda === 'valid@example.com') {
      return HttpResponse.json([{ id: 'user-uuid-1', nick: 'TestPilot', email: emailBusqueda, token_version: 1, status: 'ACTIVE' }]);
    }

    // ═══ changePassword: buscar por id / user_id ══════════════════
    if (id === 'user-uuid-1' || userId === '1') {
      return HttpResponse.json([{ id: 'user-uuid-1', user_id: 1, email: 'test@example.com', nick: 'TestPilot', password_hash: 'hashed_password', role: 'MIEMBRO', token_version: 1, must_change_password: false }]);
    }

    // ═══ updateUserRole / cuotas: contar por rol ══════════════════
    if (role) {
      return HttpResponse.json([{ id: 'dummy', role }]);
    }

    // ═══ login: caso genérico ═════════════════════════════════════
    // BL-025: solo devolver un user genérico si el nick NO está vacío
    // Y es un test de login (email='test@gmail.com', 'test@ffaa.py', 'TestPilot').
    // Si NO hay nick, devolvemos [] — el controller de linkAccount
    // interpreta "hay user" como "el email ya está vinculado".
    if (nickBusqueda) {
      return HttpResponse.json([{ id: 'user-uuid-1', user_id: 1, email: 'test@example.com', email_institucional: 'test@ffaa.py', nick: 'TestPilot', password_hash: 'hashed_password', role: 'MIEMBRO', token_version: 1, status: 'ACTIVE', must_change_password: false }]);
    }

    // ═══ login por email (sin nick) ═══════════════════════════════
    // Los tests de login siempre incluyen nick en el or= de la búsqueda,
    // pero si por alguna razón el email es 'test@gmail.com' o 'test@ffaa.py',
    // devolvemos el user genérico.
    if (emailBusqueda === 'test@gmail.com' || emailBusqueda === 'test@ffaa.py' || emailBusqueda === 'TestPilot') {
      return HttpResponse.json([{ id: 'user-uuid-1', user_id: 1, email: 'test@example.com', email_institucional: 'test@ffaa.py', nick: 'TestPilot', password_hash: 'hashed_password', role: 'MIEMBRO', token_version: 1, status: 'ACTIVE', must_change_password: false }]);
    }

    return HttpResponse.json([]);
  }),
  // Auth: Change Password (update user)
  http.patch('*/users', async () => {
    return HttpResponse.json([{ id: 'user-uuid-1', user_id: 1, email: 'test@example.com', nick: 'TestPilot', role: 'MIEMBRO', token_version: 2, must_change_password: false }]);
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
  vi.clearAllMocks();
  getSupabase.mockReturnValue(createMockSupabase());
  getNextUserId.mockResolvedValue(100);
  generateTemporaryPassword.mockReturnValue('MS-TEST-XXXX');
  bcrypt.compare.mockResolvedValue(true);
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

    it('debe rechazar un login con usuario no encontrado [BL-025]', async () => {
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

  describe('changePassword [BL-025]', () => {
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

  describe('linkAccount [BL-025]', () => {
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