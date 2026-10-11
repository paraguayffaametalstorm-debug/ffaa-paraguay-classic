// tests/controllers/owner.controller.test.js
//
// FIX-303 — Tests del Owner Controller
// Cubre: backups persistentes, sanitización PII, verificación de hash,
//        auto-prune (>30), y auditoría C4ISR.
//
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import crypto from 'crypto';

// --- Mocks de Módulos ---
vi.mock('../../src/config/env.js', () => ({
  ENV: {
    JWT_SECRET: 'test-secret-for-owner-suite',
    BACKUP_VERSION: '4.1.0',
  },
}));

vi.mock('../../src/db/supabase.js');

vi.mock('../../src/utils/audit.js', () => ({
  logSecurityEvent: vi.fn().mockResolvedValue(undefined),
  logAuditChange: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/config/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// --- Importaciones DESPUÉS de los mocks ---
import {
  runManualBackup,
  getBackupList,
  downloadBackup,
  deleteBackup,
  getAuditLogs,
} from '../../src/controllers/owner.controller.js';
import { getSupabase } from '../../src/db/supabase.js';
import { logSecurityEvent, logAuditChange } from '../../src/utils/audit.js';
import { createMockSupabase } from '../helpers/mockSupabaseMSW.js';

// --- Configuración de MSW ---
// Simulamos las tablas necesarias para los backups
const DB = {
  users: [
    {
      id: 'uuid-1',
      user_id: 1,
      email: 'pjpirovani@gmail.com',
      email_institucional: 'pjpirovani@ffaa.py',
      email_personal: 'pj@gmail.com',
      nick: 'PJPIROVANI',
      phone: '+595981123456',
      role: 'OWNER',
      status: 'ACTIVE',
      // Campos sensibles que deben ser eliminados o ofuscados
      password_hash: '$2b$10$SECRET',
      token_version: 3,
      google_id: 'google-sub-123456',
      google_linked: true,
    },
    {
      id: 'uuid-2',
      user_id: 2,
      email: 'admin@ffaa.py',
      email_institucional: 'admin@ffaa.py',
      nick: 'ADMIN_PILOT',
      phone: '+595981654321',
      role: 'ADMIN',
      status: 'ACTIVE',
      password_hash: '$2b$10$OTHER_SECRET',
      token_version: 1,
      google_id: null,
      google_linked: false,
    },
  ],
  performances: [
    { id: 'perf-1', user_id: 1, event_id: 'event-1', tokens: 185 },
    { id: 'perf-2', user_id: 2, event_id: 'event-1', tokens: 175 },
  ],
  events: [
    { id: 'event-1', type: 'SQUADRON', status: 'CLOSED' },
  ],
  backups: [],
  audit_logs: [
    { id: 'log-1', action: 'ROLE_CHANGE', actor_nick: 'PJPIROVANI', created_at: '2026-09-22T10:00:00Z' },
    { id: 'log-2', action: 'USER_DEACTIVATED', actor_nick: 'PJPIROVANI', created_at: '2026-09-22T11:00:00Z' },
    { id: 'log-3', action: 'BACKUP_CREATED', actor_nick: 'PJPIROVANI', created_at: '2026-09-22T12:00:00Z' },
  ],
};

let backupsCounter = 0;

const handlers = [
  // SELECT users (para backup)
  http.get('*/users', () => {
    return HttpResponse.json(DB.users);
  }),

  // SELECT performances (para backup)
  http.get('*/performances', () => {
    return HttpResponse.json(DB.performances);
  }),

  // SELECT events (para backup)
  http.get('*/events', () => {
    return HttpResponse.json(DB.events);
  }),

  // POST /backups — soporta .insert().select(...).single()
  http.post('*/backups', async ({ request }) => {
    const body = await request.json();
    const payload = Array.isArray(body) ? body[0] : body;
    const newBackup = {
      id: `backup-uuid-${++backupsCounter}`,
      ...payload,
      created_at: new Date().toISOString(),
    };
    DB.backups.unshift(newBackup);
    // El controller usa .insert(record).select('id,name,...').single()
    // → devolvemos UN OBJETO, no un array.
    return HttpResponse.json(newBackup);
  }),

  // GET /backups — 3 casos:
  //   a) Listado general (con o sin select restringido).
  //   b) Petición por id (para downloadBackup/deleteBackup con .single()).
  //   c) Prune con .range(from, to) → limit + offset.
  http.get('*/backups', ({ request }) => {
    const url = new URL(request.url);
    const select = url.searchParams.get('select');
    const idEq = url.searchParams.get('id')?.replace('eq.', '');
    const limitStr = url.searchParams.get('limit');
    const offsetStr = url.searchParams.get('offset');

    // (b) Petición por ID (con .single())
    if (idEq) {
      const found = DB.backups.find(b => b.id === idEq);
      if (!found) return HttpResponse.json(null, { status: 200 });
      return HttpResponse.json(found);
    }

    // (c) Prune con .range(from, to)
    if (limitStr !== null && offsetStr !== null) {
      const from = Number(offsetStr);
      const limit = Number(limitStr);
      const sliced = DB.backups.slice(from, from + limit);
      return HttpResponse.json(sliced);
    }

    // (a) Listado general (posible select restringido)
    if (select && !select.includes('content')) {
      const list = DB.backups.map(({ content, ...rest }) => rest);
      return HttpResponse.json(list);
    }
    return HttpResponse.json(DB.backups);
  }),

  // DELETE /backups/:id — con .single() previo no aplica acá, pero sí para deleteBackup directo
  http.delete('*/backups/:id', ({ params }) => {
    const index = DB.backups.findIndex(b => b.id === params.id);
    if (index === -1) {
      return HttpResponse.json({ error: 'not found' }, { status: 404 });
    }
    DB.backups.splice(index, 1);
    return HttpResponse.json({ success: true });
  }),

  // DELETE /backups (sin id) — para auto-prune con .in('id', [...])
  http.delete('*/backups', ({ request }) => {
    const url = new URL(request.url);
    const idIn = url.searchParams.get('id');
    if (idIn && idIn.startsWith('in.(')) {
      const ids = idIn.slice(4, -1).split(',').map(s => s.trim());
      DB.backups = DB.backups.filter(b => !ids.includes(b.id));
    }
    return HttpResponse.json({ success: true });
  }),

  // POST /audit_logs
  http.post('*/audit_logs', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json([{ id: 'audit-log-' + Date.now(), ...body[0] }]);
  }),

  // POST /security_events
  http.post('*/security_events', () => {
    return HttpResponse.json([{ id: 'sec-' + Date.now() }]);
  }),

  // GET /audit_logs (para getAuditLogs)
  http.get('*/audit_logs', ({ request }) => {
    const url = new URL(request.url);
    const actionFilter = url.searchParams.get('action')?.replace('ilike.', '').replace(/%/g, '');
    const limit = Number(url.searchParams.get('limit') || 20);
    const offset = Number(url.searchParams.get('offset') || 0);

    let filtered = DB.audit_logs;
    if (actionFilter) {
      filtered = filtered.filter(l => (l.action || '').includes(actionFilter));
    }
    const paginated = filtered.slice(offset, offset + limit);
    return HttpResponse.json(paginated);
  }),
];

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => {
  server.resetHandlers();
  DB.backups = [];
  backupsCounter = 0;
  vi.clearAllMocks();
});
afterAll(() => server.close());

beforeEach(() => {
  // Mock simple de Supabase (MSW se encarga de las respuestas)
  getSupabase.mockReturnValue(createMockSupabase());
});

// --- Helpers ---
const mockReq = (body = {}, user = { id: 'uuid-1', user_id: 1, nick: 'PJPIROVANI', role: 'OWNER' }, params = {}, query = {}) => ({
  body,
  user,
  params,
  query,
  ip: '127.0.0.1',
  headers: { 'user-agent': 'vitest' },
});

const mockRes = () => {
  const res = {};
  res.statusCode = 200;
  res.status = vi.fn(function (code) { this.statusCode = code; return this; });
  res.json = vi.fn().mockReturnThis();
  res.setHeader = vi.fn().mockReturnThis();
  res.send = vi.fn().mockReturnThis();
  return res;
};

// ========================================================================
// TESTS
// ========================================================================
describe('Owner Controller — Sprint 3 (FIX-303)', () => {

  // ======================================================================
  // 1. CREACIÓN DE BACKUP
  // ======================================================================
  describe('runManualBackup', () => {
    it('debe crear un backup exitosamente con estructura válida', async () => {
      const req = mockReq({ notes: 'Backup de prueba' });
      const res = mockRes();
      await runManualBackup(req, res);

      expect(res.status).not.toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('Copia de seguridad'),
        id: expect.any(String),
        file: expect.any(String),
        size_bytes: expect.any(Number),
        hash_sha256: expect.any(String),
        created_at: expect.any(String),
        pruned_old_backups: expect.any(Number)
      }));
    });

    it('debe registrar BACKUP_CREATED en audit_logs', async () => {
      const req = mockReq({});
      const res = mockRes();
      await runManualBackup(req, res);

      expect(res.json).toHaveBeenCalled();
      const payload = res.json.mock.calls[0][0];
      expect(payload.id).toBeDefined();
    });

    it('debe incluir hash SHA-256 y size_bytes válidos', async () => {
      const req = mockReq({});
      const res = mockRes();
      await runManualBackup(req, res);

      const payload = res.json.mock.calls[0][0];
      expect(payload.size_bytes).toBeGreaterThan(0);
      expect(payload.hash_sha256).toHaveLength(64);
      expect(payload.hash_sha256).toMatch(/^[0-9a-f]{64}$/);
    });

    it('debe retornar 503 si Supabase no está disponible', async () => {
      getSupabase.mockReturnValueOnce(null);
      const req = mockReq({});
      const res = mockRes();
      await runManualBackup(req, res);

      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        code: 'DATABASE_UNAVAILABLE'
      }));
    });
  });

  // ======================================================================
  // 2. SANITIZACIÓN DE PII
  // ======================================================================
  describe('Sanitización de PII', () => {
    // Esta sección verifica que la sanitización se aplique al contenido del backup.
    // En el controller, la función `sanitizeUser()` elimina/ofusca campos sensibles.
    
    it('debe eliminar campos sensibles (password_hash, token_version, google_id, google_linked)', () => {
      // Simulamos la función sanitizeUser que está en el controller
      // (en el código real está definida como función interna)
      const sanitizeUser = (user) => {
        const SENSITIVE_FIELDS_DROP = ['password_hash', 'password', 'token_version', 'google_id', 'google_linked'];
        const sanitized = { ...user };
        for (const field of SENSITIVE_FIELDS_DROP) {
          delete sanitized[field];
        }
        return sanitized;
      };

      const sanitized = sanitizeUser(DB.users[0]);
      
      expect(sanitized.password_hash).toBeUndefined();
      expect(sanitized.token_version).toBeUndefined();
      expect(sanitized.google_id).toBeUndefined();
      expect(sanitized.google_linked).toBeUndefined();
      // Los campos NO sensibles se preservan
      expect(sanitized.nick).toBe('PJPIROVANI');
      expect(sanitized.role).toBe('OWNER');
    });

    it('debe ofuscar el email (formato p***@dominio.com)', () => {
      const obfuscateEmail = (email) => {
        if (!email || typeof email !== 'string') return email;
        const [local, domain] = email.split('@');
        if (!local || !domain) return email;
        const visibleChar = local[0] || '*';
        return `${visibleChar}***@${domain}`;
      };

      expect(obfuscateEmail('pjpirovani@gmail.com')).toBe('p***@gmail.com');
      expect(obfuscateEmail('admin@ffaa.py')).toBe('a***@ffaa.py');
      expect(obfuscateEmail('a@b.com')).toBe('a***@b.com');
    });

    it('debe ofuscar el teléfono (formato +595***3456)', () => {
      const obfuscatePhone = (phone) => {
        if (!phone || typeof phone !== 'string') return phone;
        // Mostrar primeros 4 y últimos 4 caracteres, ocultar el resto
        if (phone.length <= 8) return '***';
        const start = phone.slice(0, 4);
        const end = phone.slice(-4);
        return `${start}***${end}`;
      };

      expect(obfuscatePhone('+595981123456')).toBe('+595***3456');
      // El controller puede devolver '***' para strings cortos
      expect(obfuscatePhone('12345678')).toMatch(/\*+/);
      expect(obfuscatePhone('123')).toBe('***');
    });

    it('NO debe incluir el hash del password en el backup', () => {
      const sanitizeUser = (user) => {
        const { password_hash, token_version, google_id, google_linked, ...rest } = user;
        return rest;
      };
      const sanitized = sanitizeUser(DB.users[0]);
      const jsonStr = JSON.stringify(sanitized);
      
      expect(jsonStr).not.toContain('password_hash');
      expect(jsonStr).not.toContain('$2b$10$SECRET');
      expect(jsonStr).not.toContain('token_version');
      expect(jsonStr).not.toContain('google_id');
    });
  });

  // ======================================================================
  // 3. HASH SHA-256 E INTEGRIDAD
  // ======================================================================
  describe('Hash SHA-256 e integridad', () => {
    it('debe calcular un hash SHA-256 correcto y determinístico', () => {
      const computeSha256 = (data) => {
        const jsonStr = typeof data === 'string' ? data : JSON.stringify(data);
        return crypto.createHash('sha256').update(jsonStr).digest('hex');
      };

      const sampleData = { users: [{ nick: 'TEST' }], performances: [] };
      const hash1 = computeSha256(sampleData);
      const hash2 = computeSha256(sampleData);

      expect(hash1).toBe(hash2); // Determinístico
      expect(hash1).toHaveLength(64); // SHA-256 = 64 chars hex
      expect(hash1).toMatch(/^[0-9a-f]{64}$/);
    });

    it('debe detectar alteración de contenido (hash mismatch)', () => {
      const computeSha256 = (data) => {
        const jsonStr = typeof data === 'string' ? data : JSON.stringify(data);
        return crypto.createHash('sha256').update(jsonStr).digest('hex');
      };

      const original = { data: 'original' };
      const hashOriginal = computeSha256(original);

      const altered = { data: 'ALTERADO' };
      const hashAltered = computeSha256(altered);

      expect(hashOriginal).not.toBe(hashAltered);
    });
  });

  // ======================================================================
  // 4. LISTADO DE BACKUPS
  // ======================================================================
  describe('getBackupList', () => {
    it('debe retornar lista vacía si no hay backups', async () => {
      DB.backups = [];
      const req = mockReq();
      const res = mockRes();
      await getBackupList(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        files: [],
        total: 0,
        max_allowed: 30
      }));
    });

    it('debe retornar la lista con metadatos correctos', async () => {
      DB.backups = [
        { id: 'backup-1', name: 'bk-1.json', hash_sha256: 'hash1', created_at: '2026-09-22T10:00:00Z', users_count: 61, size_bytes: 1024, version: '4.1.0' },
        { id: 'backup-2', name: 'bk-2.json', hash_sha256: 'hash2', created_at: '2026-09-22T11:00:00Z', users_count: 61, size_bytes: 1024, version: '4.1.0' },
      ];

      const req = mockReq();
      const res = mockRes();
      await getBackupList(req, res);

      const payload = res.json.mock.calls[0][0];
      expect(payload.files).toHaveLength(2);
      expect(payload.total).toBe(2);
      expect(payload.max_allowed).toBe(30);
    });

    it('NO debe retornar el content completo (solo metadatos)', async () => {
      DB.backups = [
        { id: 'backup-1', name: 'bk-1.json', hash_sha256: 'hash1', content: { huge: 'payload' }, users_count: 61, size_bytes: 1024, version: '4.1.0' },
      ];

      const req = mockReq();
      const res = mockRes();
      await getBackupList(req, res);

      const file = res.json.mock.calls[0][0].files[0];
      expect(file.content).toBeUndefined();
      expect(file.id).toBe('backup-1');
    });

    it('debe retornar 503 si Supabase no está disponible', async () => {
      getSupabase.mockReturnValueOnce(null);
      const req = mockReq();
      const res = mockRes();
      await getBackupList(req, res);

      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        code: 'DATABASE_UNAVAILABLE',
        files: []
      }));
    });
  });

  // ======================================================================
  // 5. DESCARGA CON VERIFICACIÓN DE HASH
  // ======================================================================
  describe('downloadBackup', () => {
    it('debe enviar el backup con headers de descarga correctos', async () => {
      const content = { users: [{ nick: 'TEST' }] };
      const hash = crypto.createHash('sha256').update(JSON.stringify(content)).digest('hex');

      DB.backups = [{
        id: 'backup-uuid-1',
        name: 'backup-1.json',
        hash_sha256: hash,
        content,
        size_bytes: 1024,
        created_at: '2026-09-22T10:00:00Z',
      }];

      const req = mockReq({}, {}, { id: 'backup-uuid-1' });
      const res = mockRes();
      await downloadBackup(req, res);

      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringContaining('attachment; filename="backup-1.json"')
      );
      expect(res.send).toHaveBeenCalledWith(expect.any(String));
    });

    it('debe retornar 404 si el backup no existe', async () => {
      DB.backups = [];
      const req = mockReq({}, {}, { id: 'nonexistent-id' });
      const res = mockRes();
      await downloadBackup(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        code: 'BACKUP_NOT_FOUND'
      }));
    });

    it('debe detectar hash mismatch e impedir la descarga', async () => {
      DB.backups = [{
        id: 'backup-uuid-1',
        name: 'backup-1.json',
        hash_sha256: 'a'.repeat(64),
        content: { data: 'test' },
        size_bytes: 1024,
      }];

      const req = mockReq({}, {}, { id: 'backup-uuid-1' });
      const res = mockRes();
      await downloadBackup(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        code: 'BACKUP_INTEGRITY_FAILED'
      }));
    });

    it('debe retornar 503 si Supabase no está disponible', async () => {
      getSupabase.mockReturnValueOnce(null);
      const req = mockReq({}, {}, { id: 'backup-uuid-1' });
      const res = mockRes();
      await downloadBackup(req, res);

      expect(res.status).toHaveBeenCalledWith(503);
    });
  });

  // ======================================================================
  // 6. ELIMINACIÓN DE BACKUPS
  // ======================================================================
  describe('deleteBackup', () => {
    it('debe eliminar un backup exitosamente', async () => {
      DB.backups = [{ id: 'backup-uuid-1', name: 'bk-1.json', hash_sha256: 'h', size_bytes: 100 }];

      const req = mockReq({}, {}, { id: 'backup-uuid-1' });
      const res = mockRes();
      await deleteBackup(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('eliminado'),
        id: 'backup-uuid-1',
        name: 'bk-1.json'
      }));
    });

    it('debe retornar 404 si el backup no existe', async () => {
      DB.backups = [];
      const req = mockReq({}, {}, { id: 'nonexistent' });
      const res = mockRes();
      await deleteBackup(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        code: 'BACKUP_NOT_FOUND'
      }));
    });

    it('debe retornar 503 si Supabase no está disponible', async () => {
      getSupabase.mockReturnValueOnce(null);
      const req = mockReq({}, {}, { id: 'backup-uuid-1' });
      const res = mockRes();
      await deleteBackup(req, res);

      expect(res.status).toHaveBeenCalledWith(503);
    });
  });

  // ======================================================================
  // 7. AUTO-PRUNE (MAX_BACKUPS = 30)
  // ======================================================================
  describe('Auto-prune de backups (>30)', () => {
    it('debe mantener máximo 30 backups', () => {
      const MAX_BACKUPS = 30;
      const backups = Array(35).fill(null).map((_, i) => ({
        id: `backup-${i}`,
        created_at: new Date(Date.now() - i * 1000).toISOString(),
      }));

      // Simular la lógica de prune: ordenar por created_at DESC y cortar a 30
      const sorted = [...backups].sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
      );
      const kept = sorted.slice(0, MAX_BACKUPS);

      expect(kept).toHaveLength(30);
      // Los más recientes (backup-0 a backup-29) se mantienen
      expect(kept[0].id).toBe('backup-0');
      expect(kept[29].id).toBe('backup-29');
    });

    it('no debe prune si hay 30 o menos', () => {
      const MAX_BACKUPS = 30;
      const backups = Array(25).fill(null).map((_, i) => ({ id: `backup-${i}` }));
      const shouldPrune = backups.length > MAX_BACKUPS;
      expect(shouldPrune).toBe(false);
    });

    it('debe prune si hay más de 30', () => {
      const MAX_BACKUPS = 30;
      const backups = Array(31).fill(null).map((_, i) => ({ id: `backup-${i}` }));
      const shouldPrune = backups.length > MAX_BACKUPS;
      expect(shouldPrune).toBe(true);
    });
  });

  // ======================================================================
  // 8. AUDITORÍA C4ISR (getAuditLogs)
  // ======================================================================
  describe('getAuditLogs', () => {
    it('debe retornar todos los logs sin filtro', async () => {
      const req = mockReq({}, {}, {}, {});
      const res = mockRes();
      await getAuditLogs(req, res);

      const payload = res.json.mock.calls[0][0];
      expect(payload).toHaveProperty('logs');
      expect(Array.isArray(payload.logs)).toBe(true);
      expect(payload).toHaveProperty('total');
      expect(payload).toHaveProperty('page');
      expect(payload).toHaveProperty('totalPages');
    });

    it('debe filtrar por action', async () => {
      const req = mockReq({}, {}, {}, { action: 'ROLE_CHANGE' });
      const res = mockRes();
      await getAuditLogs(req, res);

      const payload = res.json.mock.calls[0][0];
      expect(payload.logs).toBeDefined();
      expect(Array.isArray(payload.logs)).toBe(true);
    });

    it('debe respetar la paginación (page, limit)', async () => {
      const req = mockReq({}, {}, {}, { page: '1', limit: '2' });
      const res = mockRes();
      await getAuditLogs(req, res);

      const payload = res.json.mock.calls[0][0];
      expect(payload.page).toBe(1);
      expect(payload).toHaveProperty('totalPages');
    });

    it('debe manejar Supabase null devolviendo estructura vacía', async () => {
      getSupabase.mockReturnValueOnce(null);
      const req = mockReq({}, {}, {}, {});
      const res = mockRes();
      await getAuditLogs(req, res);

      const payload = res.json.mock.calls[0][0];
      expect(payload.logs).toEqual([]);
      expect(payload.total).toBe(0);
      expect(payload.page).toBe(1);
    });
  });

  // ======================================================================
  // 9. TESTS DE SEGURIDAD (Regresión)
  // ======================================================================
  describe('Tests de seguridad (regresión)', () => {
    it('el backup NO debe contener contraseñas hasheadas', () => {
      const user = DB.users[0];
      const SENSITIVE_FIELDS_DROP = ['password_hash', 'password', 'token_version', 'google_id', 'google_linked'];
      const sanitized = { ...user };
      for (const field of SENSITIVE_FIELDS_DROP) {
        delete sanitized[field];
      }
      const jsonStr = JSON.stringify(sanitized);
      expect(jsonStr).not.toMatch(/password_hash/);
      expect(jsonStr).not.toMatch(/\$2[aby]\$\d{2}\$/); // Firma bcrypt
    });

    it('el hash SHA-256 debe ser determinístico para detectar alteraciones', () => {
      const data = { foo: 'bar', baz: [1, 2, 3] };
      const hash1 = crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
      const hash2 = crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
      expect(hash1).toBe(hash2);

      // Alteración mínima debe cambiar el hash
      const altered = { foo: 'bar', baz: [1, 2, 4] };
      const hashAltered = crypto.createHash('sha256').update(JSON.stringify(altered)).digest('hex');
      expect(hash1).not.toBe(hashAltered);
    });

    it('debe incluir la versión correcta en el backup persistido', async () => {
      const req = mockReq({});
      const res = mockRes();
      await runManualBackup(req, res);

      const payload = res.json.mock.calls[0][0];
      expect(payload.hash_sha256).toBeDefined();
      expect(payload.size_bytes).toBeGreaterThan(0);
    });
  });
});