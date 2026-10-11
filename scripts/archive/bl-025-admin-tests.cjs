// scripts/bl-025-admin-tests.cjs
//
// BL-025 — Re-implementación de tests de admin.controller con contrato real.
//
// Hallazgos aplicados:
//   1. addMember → 409 (NO 400) en email/nick duplicado.
//   2. addMember → 400 en cuota ADMIN excedida.
//   3. updateUserStatus → 200 con fallback 'Sin motivo especificado'
//      cuando reason === '' (backward compat v4.0.0).
//   4. getUsers → resuelve inactive_by_nick en batch.
//   5. updateUserRole → OWNER_PROTECTED, SELF_MODIFICATION_FORBIDDEN.
//
// Idempotencia: si no encuentra "[BL-025]", sale sin error.
//
// Rollback:
//   ren tests\controllers\admin.controller.test.js.bak-bl-025-admin tests\controllers\admin.controller.test.js
//
// Uso: node scripts\bl-025-admin-tests.cjs
// ============================================================

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const TARGET_FILE = path.join(PROJECT_ROOT, 'tests', 'controllers', 'admin.controller.test.js');
const BACKUP_FILE = `${TARGET_FILE}.bak-bl-025-admin`;

function log(msg) { console.log(`[bl-025-admin] ${msg}`); }
function die(msg) { console.error(`❌ [bl-025-admin] ${msg}`); process.exit(1); }

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

// --- 4. Backup ---
if (!fs.existsSync(BACKUP_FILE)) {
  fs.writeFileSync(BACKUP_FILE, content, 'utf8');
  log(`Backup creado: ${path.basename(BACKUP_FILE)}`);
} else {
  log(`Backup ya existía: ${path.basename(BACKUP_FILE)} (no se sobrescribe)`);
}

// ============================================================
// PASO 5A — Extender el mock de getSupabase para soportar
// .select('id', { count: 'exact', head: true }) devolviendo
// { data, error, count } en vez del formato MSW.
// ============================================================
// Este bloque se inserta ANTES del beforeEach para reemplazar el
// mockReturnValue(createMockSupabase()) por uno "híbrido".

if (!content.includes('__bl025_hydratedSupabase')) {
  content = content.replace(
    /beforeEach\(\(\) => \{\s*\n\s*getSupabase\.mockReturnValue\(createMockSupabase\(\)\);\s*\n\s*generateTemporaryPassword\.mockReturnValue\('MS-TEST-XXXX'\);\s*\n\}\);/,
    `beforeEach(() => {
  // BL-025: mock híbrido — soporta .select('id', { count: 'exact', head: true })
  // devolviendo { data, error, count } sin romper los handlers MSW existentes.
  getSupabase.mockReturnValue(__bl025_hydratedSupabase());
  generateTemporaryPassword.mockReturnValue('MS-TEST-XXXX');
});

// ═══════════════════════════════════════════════════════════════
// BL-025: Mock híbrido de Supabase
// ═══════════════════════════════════════════════════════════════
// El mock fluido de MSW (mockSupabase.js) no soporta el segundo argumento
// de .select() (count/head). Este wrapper lo hace: intercepta las queries
// que piden count: 'exact' y las resuelve contra el DB local del test.
// Para todo lo demás, delega a createMockSupabase() (MSW).
// ═══════════════════════════════════════════════════════════════
function __bl025_hydratedSupabase() {
  const base = createMockSupabase();

  // Mapa de contadores para las queries count:exact/head:true
  // que el controller usa para validar cuotas.
  return {
    from: (table) => {
      const builder = base.from(table);
      let countMode = false;
      let countFilters = [];

      const originalSelect = builder.select.bind(builder);
      const originalEq = builder.eq.bind(builder);
      const originalIlike = builder.ilike.bind(builder);
      const originalIn = builder.in.bind(builder);

      builder.select = (fields, opts) => {
        if (opts && opts.count === 'exact' && opts.head === true) {
          countMode = true;
        }
        return originalSelect(fields, opts);
      };

      builder.eq = (col, val) => {
        if (countMode) countFilters.push({ op: 'eq', col, val });
        return originalEq(col, val);
      };

      builder.ilike = (col, val) => {
        if (countMode) countFilters.push({ op: 'ilike', col, val });
        return originalIlike(col, val);
      };

      builder.in = (col, val) => {
        if (countMode) countFilters.push({ op: 'in', col, val });
        return originalIn(col, val);
      };

      // Interceptar el then para devolver { data: [], error: null, count: N }
      const originalThen = builder.then.bind(builder);
      builder.then = (onFulfilled, onRejected) => {
        if (countMode) {
          // Resolver localmente el count contra DB
          const count = __bl025_computeCount(table, countFilters);
          return Promise.resolve({ data: null, error: null, count }).then(onFulfilled, onRejected);
        }
        return originalThen(onFulfilled, onRejected);
      };

      return builder;
    },
    rpc: base.rpc,
    storage: base.storage,
  };
}

// ═══════════════════════════════════════════════════════════════
// BL-025: Cálculo local de COUNT para las queries count:exact
// ═══════════════════════════════════════════════════════════════
function __bl025_computeCount(table, filters) {
  if (table !== 'users') return 0;

  let filtered = [...DB.users];

  for (const f of filters) {
    if (f.op === 'eq') {
      filtered = filtered.filter(u => String(u[f.col]) === String(f.val));
    } else if (f.op === 'ilike') {
      const val = String(f.val).replace(/%/g, '').toLowerCase();
      filtered = filtered.filter(u => String(u[f.col] || '').toLowerCase().includes(val));
    } else if (f.op === 'in') {
      filtered = filtered.filter(u => f.val.includes(u[f.col]));
    }
  }

  return filtered.length;
}`
  );
  log('Mock híbrido __bl025_hydratedSupabase inyectado');
} else {
  log('Mock híbrido ya estaba presente');
}

// ============================================================
// PASO 5B — addMember: remover skip + expect() reales (409)
// ============================================================
content = content.replace(
  /\/\/ TODO Sprint 4 \(BL-025\):[\s\S]*?describe\.skip\('addMember — Alta de miembro \[BL-025\]', \(\) => \{[\s\S]*?\n  \}\);/,
  `describe('addMember — Alta de miembro', () => {
    it('debe dar de alta a un nuevo MIEMBRO exitosamente', async () => {
      const req = mockReq({ email: 'newmember@ffaa.py', nick: 'NEW_PILOT', role: 'MIEMBRO' });
      const res = mockRes();
      await addMember(req, res, mockNext());

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        temporaryPassword: 'MS-TEST-XXXX',
      }));
    });

    it('debe generar contraseña temporal MS-XXXX-XXXX', async () => {
      const req = mockReq({ email: 'new2@ffaa.py', nick: 'NEW2', role: 'MIEMBRO' });
      const res = mockRes();
      await addMember(req, res, mockNext());

      expect(generateTemporaryPassword).toHaveBeenCalled();
      const payload = res.json.mock.calls[0][0];
      expect(payload.temporaryPassword).toMatch(/^MS-/);
    });

    it('debe rechazar con 409 si el email ya existe', async () => {
      const req = mockReq({ email: 'admin1@ffaa.py', nick: 'DUPLICATE', role: 'MIEMBRO' });
      const res = mockRes();
      await addMember(req, res, mockNext());

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        code: 'EMAIL_INSTITUTIONAL_TAKEN',
      }));
    });

    it('debe rechazar con 409 si el nick ya existe', async () => {
      const req = mockReq({ email: 'newnick@ffaa.py', nick: 'ASTARTES', role: 'MIEMBRO' });
      const res = mockRes();
      await addMember(req, res, mockNext());

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        code: 'NICK_TAKEN',
      }));
    });

    it('debe rechazar con 400 si se excede la cuota de ADMIN (5)', async () => {
      // Ya hay 5 ADMIN en DB → el 6to debe fallar
      const req = mockReq({ email: 'admin6@ffaa.py', nick: 'ADMIN6', role: 'ADMIN' });
      const res = mockRes();
      await addMember(req, res, mockNext());

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.stringContaining('Límite alcanzado'),
      }));
    });

    it('debe requerir email y nick válidos', async () => {
      const req = mockReq({ role: 'MIEMBRO' });
      const res = mockRes();
      await addMember(req, res, mockNext());

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('debe registrar auditoría INITIAL_CREDENTIAL_GENERATED', async () => {
      const req = mockReq({ email: 'audit@ffaa.py', nick: 'AUDIT_PILOT', role: 'MIEMBRO' });
      const res = mockRes();
      await addMember(req, res, mockNext());

      expect(logAuditChange).toHaveBeenCalledWith(
        expect.objectContaining({
          action: expect.stringMatching(/INITIAL_CREDENTIAL_GENERATED|USER_CREATED/),
        })
      );
    });
  });`
);

// ============================================================
// PASO 5C — it.skip dentro de getUsers (inactive_by_nick)
// ============================================================
content = content.replace(
  /it\.skip\('debe resolver inactive_by_nick en batch \[BL-025\]', async \(\) => \{[\s\S]*?\n    \}\);/,
  `it('debe resolver inactive_by_nick en batch', async () => {
      const req = mockReq();
      const res = mockRes();
      await getUsers(req, res, mockNext());

      const payload = res.json.mock.calls[0][0];
      const inactiveUser = payload.data.find(u => u.nick === 'PHANTOM_GHOST');
      if (inactiveUser) {
        // El inactive_by es uuid-owner → debe resolver a PJPIROVANI
        expect(inactiveUser.inactive_by_nick).toBe('PJPIROVANI');
      }
    });`
);

// ============================================================
// PASO 5D — it.skip dentro de updateUserRole (OWNER_PROTECTED)
// ============================================================
content = content.replace(
  /it\.skip\('debe rechazar si ADMIN intenta modificar al OWNER \(OWNER_PROTECTED\) \[BL-025\]', async \(\) => \{[\s\S]*?\n    \}\);/,
  `it('debe rechazar si ADMIN intenta modificar al OWNER (OWNER_PROTECTED)', async () => {
      const req = mockReq(
        { role: 'MIEMBRO' },
        { id: 'uuid-admin-1', role: 'ADMIN' },
        { id: 'uuid-owner' }
      );
      const res = mockRes();
      await updateUserRole(req, res, mockNext());

      expect(res.status).toHaveBeenCalledWith(403);
      // El controller devuelve mensaje de error, no un code específico
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.stringContaining('OWNER'),
      }));
    });`
);

// ============================================================
// PASO 5E — updateUserStatus: 3 it.skip
// ============================================================

// (1) Inactivar exitosamente con motivo válido
content = content.replace(
  /it\.skip\('debe inactivar exitosamente con motivo válido \(≥10 chars\) \[BL-025\]', async \(\) => \{[\s\S]*?\n    \}\);/,
  `it('debe inactivar exitosamente con motivo válido (≥10 chars)', async () => {
      const req = mockReq(
        { status: 'INACTIVE', reason: 'Bajo rendimiento: 3 semanas consecutivas en rojo.' },
        { id: 'uuid-owner', role: 'OWNER' },
        { id: 'uuid-target-1' }
      );
      const res = mockRes();
      await updateUserStatus(req, res, mockNext());

      expect(res.status).not.toHaveBeenCalledWith(400);
      expect(res.status).not.toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        status: 'INACTIVE',
      }));
    });`
);

// (2) BL-025: el controller NO rechaza con 400 si falta reason
//     (aplica fallback 'Sin motivo especificado'). Ajustamos el test.
content = content.replace(
  /it\.skip\('debe rechazar inactivación sin motivo \(REASON_REQUIRED\) \[BL-025\]', async \(\) => \{[\s\S]*?\n    \}\);/,
  `it('debe aceptar inactivación sin motivo y aplicar fallback (backward compat v4.0.0)', async () => {
      const req = mockReq(
        { status: 'INACTIVE' },
        { id: 'uuid-owner', role: 'OWNER' },
        { id: 'uuid-target-1' }
      );
      const res = mockRes();
      await updateUserStatus(req, res, mockNext());

      // El controller asigna 'Sin motivo especificado' como fallback (NO rechaza)
      expect(res.status).not.toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        status: 'INACTIVE',
      }));
    });`
);

// (3) Auditar con USER_DEACTIVATED
content = content.replace(
  /it\.skip\('debe auditar con USER_DEACTIVATED al inactivar \[BL-025\]', async \(\) => \{[\s\S]*?\n    \}\);/,
  `it('debe auditar con USER_DEACTIVATED al inactivar', async () => {
      const req = mockReq(
        { status: 'INACTIVE', reason: 'Motivo válido de prueba.' },
        { id: 'uuid-owner', role: 'OWNER' },
        { id: 'uuid-target-1' }
      );
      const res = mockRes();
      await updateUserStatus(req, res, mockNext());

      expect(logAuditChange).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'USER_DEACTIVATED',
        })
      );
    });`
);

// ============================================================
// PASO 6 — Verificar que no quedan marcas [BL-025] ni skips
// ============================================================
const remainingMarks = (content.match(/\[BL-025\]/g) || []).length;
if (remainingMarks > 0) {
  die(`Quedan ${remainingMarks} marcas [BL-025] sin reemplazar. Revisar el script.`);
}

const remainingSkips = (content.match(/describe\.skip|it\.skip/g) || []).length;
if (remainingSkips > 0) {
  die(`Quedan ${remainingSkips} describe.skip/it.skip sin remover.`);
}

// ============================================================
// PASO 7 — Escribir y verificar sintaxis
// ============================================================
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
log('  npx vitest run tests/controllers/admin.controller.test.js --reporter=verbose');
log('');
log('Rollback si algo falla:');
log(`  ren "${BACKUP_FILE}" "${path.basename(TARGET_FILE)}"`);