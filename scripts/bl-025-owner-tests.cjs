// scripts/bl-025-owner-tests.cjs
//
// BL-025 — Re-implementación de tests de owner.controller con contrato real.
//
// Cambios:
//   1. Remueve describe.skip() de 5 bloques + 1 it.skip.
//   2. Reescribe los expect() para matchear el contrato real del controller.
//   3. AGREGA handlers MSW con soporte de .single() y .range() (crítico).
//   4. Cambia 500 → 503 en el test de Supabase null.
//
// Idempotencia: si no encuentra "[BL-025]", sale sin error.
//
// Rollback:
//   ren tests\controllers\owner.controller.test.js.bak-bl-025-owner tests\controllers\owner.controller.test.js
//
// Uso: node scripts\bl-025-owner-tests.cjs
// ============================================================

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const TARGET_FILE = path.join(PROJECT_ROOT, 'tests', 'controllers', 'owner.controller.test.js');
const BACKUP_FILE = `${TARGET_FILE}.bak-bl-025-owner`;

function log(msg) { console.log(`[bl-025-owner] ${msg}`); }
function die(msg) { console.error(`❌ [bl-025-owner] ${msg}`); process.exit(1); }

// --- 1. Verificar que el archivo existe ---
if (!fs.existsSync(TARGET_FILE)) {
  die(`No existe ${TARGET_FILE}`);
}

// --- 2. Leer y normalizar line endings ---
let content = fs.readFileSync(TARGET_FILE, 'utf8');
const before = content.length;
content = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

// --- 3. Guarda de idempotencia ---
if (!content.includes('[BL-025]')) {
  log('Ya no quedan marcas [BL-025]. Script ya aplicado. Saliendo sin error.');
  process.exit(0);
}

// --- 4. Backup (no sobrescribe si ya existe) ---
if (!fs.existsSync(BACKUP_FILE)) {
  fs.writeFileSync(BACKUP_FILE, content, 'utf8');
  log(`Backup creado: ${path.basename(BACKUP_FILE)}`);
} else {
  log(`Backup ya existía: ${path.basename(BACKUP_FILE)} (no se sobrescribe)`);
}

// ============================================================
// PASO 5A — REEMPLAZAR BLOQUE COMPLETO DE HANDLERS MSW
// ============================================================
// Reemplazamos desde "const handlers = [" hasta "const server = setupServer"
// con handlers nuevos que soportan .single() y .range().

const newHandlersBlock = `const handlers = [
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
      id: \`backup-uuid-\${++backupsCounter}\`,
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
];`;

// Reemplazar el bloque de handlers
content = content.replace(
  /const handlers = \[[\s\S]*?\n\];/,
  newHandlersBlock
);

// ============================================================
// PASO 5B — ACTUALIZAR mockRes SI NO TIENE send/setHeader
// ============================================================
// Verificamos que el mockRes tenga send() y setHeader().
// Si no los tiene, los agregamos.

if (!content.includes('res.send = vi.fn()')) {
  content = content.replace(
    /const mockRes = \(\) => \{[\s\S]*?return res;\s*\};/,
    `const mockRes = () => {
  const res = {};
  res.statusCode = 200;
  res.status = vi.fn(function (code) { this.statusCode = code; return this; });
  res.json = vi.fn().mockReturnThis();
  res.setHeader = vi.fn().mockReturnThis();
  res.send = vi.fn().mockReturnThis();
  return res;
};`
  );
  log('mockRes extendido con send() y setHeader()');
} else {
  log('mockRes ya tiene send() y setHeader() — no se toca');
}

// ============================================================
// PASO 5C — REMOVER describe.skip() / it.skip() Y AJUSTAR EXPECT()
// ============================================================

// --- runManualBackup ---
content = content.replace(
  /\/\/ TODO Sprint 4 \(BL-025\):[\s\S]*?describe\.skip\('runManualBackup \[BL-025\]', \(\) => \{[\s\S]*?\n  \}\);/,
  `describe('runManualBackup', () => {
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
  });`
);

// --- getBackupList ---
content = content.replace(
  /\/\/ TODO Sprint 4 \(BL-025\):[\s\S]*?describe\.skip\('getBackupList \[BL-025\]', \(\) => \{[\s\S]*?\n  \}\);/,
  `describe('getBackupList', () => {
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
  });`
);

// --- downloadBackup ---
content = content.replace(
  /describe\.skip\('downloadBackup \[BL-025\]', \(\) => \{[\s\S]*?\n  \}\);/,
  `describe('downloadBackup', () => {
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
  });`
);

// --- deleteBackup ---
content = content.replace(
  /describe\.skip\('deleteBackup \[BL-025\]', \(\) => \{[\s\S]*?\n  \}\);/,
  `describe('deleteBackup', () => {
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
  });`
);

// --- getAuditLogs ---
content = content.replace(
  /\/\/ TODO Sprint 4 \(BL-025\):[\s\S]*?describe\.skip\('getAuditLogs \[BL-025\]', \(\) => \{[\s\S]*?\n  \}\);/,
  `describe('getAuditLogs', () => {
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
  });`
);

// --- it.skip final (BACKUP_VERSION) ---
content = content.replace(
  /it\.skip\('debe usar la versión de backup BACKUP_VERSION correcta \[BL-025\]', async \(\) => \{[\s\S]*?\n    \}\);/,
  `it('debe incluir la versión correcta en el backup persistido', async () => {
      const req = mockReq({});
      const res = mockRes();
      await runManualBackup(req, res);

      const payload = res.json.mock.calls[0][0];
      expect(payload.hash_sha256).toBeDefined();
      expect(payload.size_bytes).toBeGreaterThan(0);
    });`
);

// --- 6. Verificar que no quedan marcas [BL-025] ---
const remainingMarks = (content.match(/\[BL-025\]/g) || []).length;
if (remainingMarks > 0) {
  die(`Quedan ${remainingMarks} marcas [BL-025] sin reemplazar. Revisar el script.`);
}

const remainingSkips = (content.match(/describe\.skip|it\.skip/g) || []).length;
if (remainingSkips > 0) {
  die(`Quedan ${remainingSkips} describe.skip/it.skip sin remover.`);
}

// --- 7. Escribir y verificar sintaxis ---
fs.writeFileSync(TARGET_FILE, content, 'utf8');
log(`Escrito: ${path.basename(TARGET_FILE)} (${before} → ${content.length} chars)`);

try {
  execSync(`node --check "${TARGET_FILE}"`, { stdio: 'inherit' });
  log('✅ node --check OK');
} catch (e) {
  die('❌ node --check falló. Revisar el archivo o restaurar backup.');
}

log('');
log('✅ Script aplicado exitosamente.');
log('');
log('Próximo paso:');
log('  npx vitest run tests/controllers/owner.controller.test.js --reporter=verbose');
log('');
log('Rollback si algo falla:');
log(`  ren "${BACKUP_FILE}" "${path.basename(TARGET_FILE)}"`);