// scripts/bl-025-admin-tests-fix3.cjs
//
// BL-025 v3 — Fix de contaminación de estado en admin.controller.test.js.
//
// Causa: los tests mutan DB.users en-place (vía el UPDATE del mock v2).
// El afterEach solo filtra por 'uuid-new-', no resetea el array completo.
// Resultado: 'uuid-target-1' queda con role='OWNER' tras el test de
// transferencia de mando → los tests posteriores de updateUserStatus
// reciben OWNER_PROTECTED falsamente.
//
// Fix:
//   1. Snapshot profundo de DB.users al cargar el test file.
//   2. afterEach resetea DB.users al snapshot.
//   3. addMember test: cambia expect(400) → expect(mockNext llamado).
//
// Idempotencia: si ya está aplicado (contiene __bl025_v3), sale sin error.
// ============================================================

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const TARGET_FILE = path.join(PROJECT_ROOT, 'tests', 'controllers', 'admin.controller.test.js');

function log(msg) { console.log(`[bl-025-admin-fix3] ${msg}`); }
function die(msg) { console.error(`❌ [bl-025-admin-fix3] ${msg}`); process.exit(1); }

if (!fs.existsSync(TARGET_FILE)) die(`No existe ${TARGET_FILE}`);

let content = fs.readFileSync(TARGET_FILE, 'utf8');
const before = content.length;
content = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

// Guarda de idempotencia
if (content.includes('__bl025_v3')) {
  log('Fix v3 ya aplicado. Saliendo sin error.');
  process.exit(0);
}

// ============================================================
// FIX 1 — Snapshot + restore en afterEach
// ============================================================
// El `afterEach` actual:
//   afterEach(() => {
//     server.resetHandlers();
//     insertCounter = 0;
//     vi.clearAllMocks();
//     DB.users = DB.users.filter(u => !u.id.startsWith('uuid-new-'));
//   });
//
// Lo reemplazamos por un snapshot profundo.

// Guardar el snapshot justo después de declarar DB
content = content.replace(
  /(let insertCounter = 0;)/,
  `// BL-025 v3: snapshot profundo para resetear DB.users entre tests.
// Sin esto, los UPDATEs mutan el array en-place y contaminan tests posteriores.
const __bl025_v3_USERS_SNAPSHOT = JSON.parse(JSON.stringify(DB.users));

$1`
);

// Reemplazar el afterEach
content = content.replace(
  /afterEach\(\(\) => \{\s*\n\s*server\.resetHandlers\(\);\s*\n\s*insertCounter = 0;\s*\n\s*vi\.clearAllMocks\(\);\s*\n\s*\/\/ Resetear el estado mutable de DB entre tests\s*\n\s*DB\.users = DB\.users\.filter\(u => !u\.id\.startsWith\('uuid-new-'\)\);\s*\n\}\);/,
  `afterEach(() => {
  server.resetHandlers();
  insertCounter = 0;
  vi.clearAllMocks();
  // BL-025 v3: reset completo del array users a su estado original.
  DB.users.length = 0;
  DB.users.push(...JSON.parse(JSON.stringify(__bl025_v3_USERS_SNAPSHOT)));
  DB.audit_logs.length = 0;
});`
);

// ============================================================
// FIX 2 — Test "addMember sin email/nick" → usar mockNext
// ============================================================
// El controller delega a next(err) con ZodError, no responde 400.

content = content.replace(
  /it\('debe requerir email y nick válidos', async \(\) => \{\s*\n\s*const req = mockReq\(\{ role: 'MIEMBRO' \}\);\s*\n\s*const res = mockRes\(\);\s*\n\s*await addMember\(req, res, mockNext\(\)\);\s*\n\s*\n\s*expect\(res\.status\)\.toHaveBeenCalledWith\(400\);\s*\n\s*\}\);/,
  `it('debe requerir email y nick válidos (delega a errorHandler vía next)', async () => {
      const req = mockReq({ role: 'MIEMBRO' });
      const res = mockRes();
      const next = mockNext();
      await addMember(req, res, next);

      // El controller usa Zod + next(err); el errorHandler global responde.
      expect(next).toHaveBeenCalled();
      const err = next.mock.calls[0][0];
      expect(err).toBeDefined();
      expect(err.name).toBe('ZodError');
    });`
);

// Verificación
if (!content.includes('__bl025_v3')) {
  die('No se pudo inyectar el fix v3.');
}

fs.writeFileSync(TARGET_FILE, content, 'utf8');
log(`Escrito: ${path.basename(TARGET_FILE)} (${before} → ${content.length} chars)`);

try {
  execSync(`node --check "${TARGET_FILE}"`, { stdio: 'inherit' });
  log('✅ node --check OK');
} catch (e) {
  die('❌ node --check falló.');
}

log('');
log('✅ Fix v3 aplicado.');
log('');
log('Próximo paso:');
log('  npx vitest run tests/controllers/admin.controller.test.js --reporter=verbose');