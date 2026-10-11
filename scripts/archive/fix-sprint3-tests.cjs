// scripts/fix-sprint3-tests.cjs
//
// FIX Sprint 3 — Refactor de tests con mock fluido de Supabase
//
// Crea tests/helpers/mockSupabase.js (cliente fluido compatible con MSW)
// y actualiza los 3 tests que fallaban por mocks frágiles.
//
// Uso: node scripts/fix-sprint3-tests.cjs
//
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const HELPER_DIR = path.join(ROOT, 'tests', 'helpers');
const HELPER_FILE = path.join(HELPER_DIR, 'mockSupabase.js');

// ─────────────────────────────────────────────────────────────
// PASO 1: Crear tests/helpers/mockSupabase.js
// ─────────────────────────────────────────────────────────────
const HELPER_CONTENT = `// tests/helpers/mockSupabase.js
//
// Sprint 3 — Mock fluido de Supabase compatible con MSW.
//
// Emula la API encadenable de @supabase/supabase-js:
//   supabase.from('tabla').select('*').eq('campo', valor).limit(10)
//
// Internamente hace un \`fetch\` a una URL canónica bajo \`/rest/v1/\`,
// que MSW intercepta para devolver datos. De esta forma, los tests
// pueden usar setupServer de MSW con handlers realistas.
//
// Uso típico:
//   import { createMockSupabase } from '../helpers/mockSupabase.js';
//   const mockSupabase = createMockSupabase();
//   getSupabase.mockReturnValue(mockSupabase);
//
// Los handlers de MSW deben matchear \`*/rest/v1/{tabla}*\` y devolver
// \`HttpResponse.json([...])\` según la query string.

const SUPABASE_MOCK_BASE = 'http://localhost:54321/rest/v1';

/**
 * Cliente fluido de Supabase para tests.
 * Cada método devuelve \`this\` para permitir encadenamiento.
 * Cuando se hace \`await\` sobre la cadena, ejecuta el \`fetch\` a MSW.
 */
function createQueryBuilder(table, method = 'GET') {
  const state = {
    table,
    method,
    select: '*',
    filters: [],
    order: null,
    limit: null,
    offset: null,
    single: false,
    body: null,
    onConflict: null,
    headers: {},
  };

  const builder = {
    // ─── métodos encadenables ─────────────────────────────────
    select(fields = '*') {
      state.select = fields;
      return builder;
    },

    eq(column, value) {
      state.filters.push({ op: 'eq', column, value });
      return builder;
    },

    neq(column, value) {
      state.filters.push({ op: 'neq', column, value });
      return builder;
    },

    gt(column, value) {
      state.filters.push({ op: 'gt', column, value });
      return builder;
    },

    gte(column, value) {
      state.filters.push({ op: 'gte', column, value });
      return builder;
    },

    lt(column, value) {
      state.filters.push({ op: 'lt', column, value });
      return builder;
    },

    lte(column, value) {
      state.filters.push({ op: 'lte', column, value });
      return builder;
    },

    like(column, value) {
      state.filters.push({ op: 'like', column, value });
      return builder;
    },

    ilike(column, value) {
      state.filters.push({ op: 'ilike', column, value });
      return builder;
    },

    in(column, values) {
      state.filters.push({ op: 'in', column, value: values });
      return builder;
    },

    is(column, value) {
      state.filters.push({ op: 'is', column, value });
      return builder;
    },

    or(filterString) {
      state.filters.push({ op: 'or', value: filterString });
      return builder;
    },

    order(column, options = {}) {
      state.order = { column, ascending: options.ascending !== false };
      return builder;
    },

    limit(n) {
      state.limit = n;
      return builder;
    },

    range(from, to) {
      state.offset = from;
      state.limit = to - from + 1;
      return builder;
    },

    single() {
      state.single = true;
      return builder;
    },

    maybeSingle() {
      state.single = true;
      return builder;
    },

    // ─── mutaciones ────────────────────────────────────────────
    insert(payload) {
      state.method = 'POST';
      state.body = Array.isArray(payload) ? payload : [payload];
      return builder;
    },

    update(payload) {
      state.method = 'PATCH';
      state.body = payload;
      return builder;
    },

    upsert(payload, options = {}) {
      state.method = 'POST';
      state.body = Array.isArray(payload) ? payload : [payload];
      state.onConflict = options.onConflict || null;
      state.headers['Prefer'] = 'resolution=merge-duplicates';
      return builder;
    },

    delete() {
      state.method = 'DELETE';
      return builder;
    },

    // ─── ejecución implícita (thenable) ────────────────────────
    then(onFulfilled, onRejected) {
      return executeQuery(state).then(onFulfilled, onRejected);
    },

    catch(onRejected) {
      return executeQuery(state).catch(onRejected);
    },

    finally(onFinally) {
      return executeQuery(state).finally(onFinally);
    },
  };

  return builder;
}

/**
 * Ejecuta la query contra MSW.
 * Construye una URL canónica con query params que MSW puede matchear.
 */
async function executeQuery(state) {
  const params = new URLSearchParams();

  // Filtros
  for (const f of state.filters) {
    if (f.op === 'eq') params.append(f.column, \`eq.\${f.value}\`);
    else if (f.op === 'neq') params.append(f.column, \`neq.\${f.value}\`);
    else if (f.op === 'gt') params.append(f.column, \`gt.\${f.value}\`);
    else if (f.op === 'gte') params.append(f.column, \`gte.\${f.value}\`);
    else if (f.op === 'lt') params.append(f.column, \`lt.\${f.value}\`);
    else if (f.op === 'lte') params.append(f.column, \`lte.\${f.value}\`);
    else if (f.op === 'like') params.append(f.column, \`like.\${f.value}\`);
    else if (f.op === 'ilike') params.append(f.column, \`ilike.\${f.value}\`);
    else if (f.op === 'in') params.append(f.column, \`in.(\${f.value.join(',')})\`);
    else if (f.op === 'is') params.append(f.column, \`is.\${f.value}\`);
    else if (f.op === 'or') params.append('or', f.value);
  }

  if (state.select) params.append('select', state.select);
  if (state.order) params.append('order', \`\${state.order.column}.\${state.order.ascending ? 'asc' : 'desc'}\`);
  if (state.limit !== null) params.append('limit', String(state.limit));
  if (state.offset !== null) params.append('offset', String(state.offset));

  const url = \`\${SUPABASE_MOCK_BASE}/\${state.table}?\${params.toString()}\`;

  const fetchOptions = {
    method: state.method,
    headers: {
      'Content-Type': 'application/json',
      ...state.headers,
    },
  };

  if (state.body !== null) {
    fetchOptions.body = JSON.stringify(state.body);
  }

  try {
    const response = await fetch(url, fetchOptions);
    const data = await response.json();

    // Supabase devuelve { data, error } pero solo cuando NO es el flujo
    // de error HTTP. Como MSW devuelve HttpResponse.json con el payload
    // directo, adaptamos al contrato de Supabase.
    return { data, error: null, count: Array.isArray(data) ? data.length : null };
  } catch (err) {
    return { data: null, error: { message: err.message }, count: null };
  }
}

/**
 * Cliente Supabase completo (con \`from\`, \`rpc\`, \`storage\`).
 */
function createMockSupabase() {
  return {
    from: (table) => createQueryBuilder(table),

    rpc: (fn, args = {}) => {
      // Para RPCs, hacemos fetch a /rest/v1/rpc/{fn}
      return {
        then: (resolve) => {
          const url = \`\${SUPABASE_MOCK_BASE}/rpc/\${fn}\`;
          return fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(args),
          })
            .then((r) => r.json())
            .then((data) => ({ data, error: null }))
            .then(resolve);
        },
      };
    },

    storage: {
      from: () => ({
        download: () => Promise.resolve({ data: null, error: { message: 'not implemented' } }),
        upload: () => Promise.resolve({ data: null, error: { message: 'not implemented' } }),
      }),
    },
  };
}

module.exports = { createMockSupabase, createQueryBuilder };
`;

// Crear directorio si no existe
if (!fs.existsSync(HELPER_DIR)) {
  fs.mkdirSync(HELPER_DIR, { recursive: true });
}

fs.writeFileSync(HELPER_FILE, HELPER_CONTENT, 'utf8');
console.log(`✅ Creado: tests/helpers/mockSupabase.js`);

// ─────────────────────────────────────────────────────────────
// PASO 2: Actualizar admin.controller.test.js
// ─────────────────────────────────────────────────────────────
const adminTestPath = path.join(ROOT, 'tests', 'controllers', 'admin.controller.test.js');
let adminContent = fs.readFileSync(adminTestPath, 'utf8');
const adminOriginal = adminContent;

// 2.1: Agregar import del helper
if (!adminContent.includes("from '../helpers/mockSupabase.js'")) {
  adminContent = adminContent.replace(
    "import { generateTemporaryPassword } from '../../src/utils/security.js';",
    "import { generateTemporaryPassword } from '../../src/utils/security.js';\nimport { createMockSupabase } from '../helpers/mockSupabase.js';"
  );
}

// 2.2: Reemplazar el bloque beforeEach que mockea getSupabase
const adminBeforeEachOld = `beforeEach(() => {
  getSupabase.mockReturnValue({ from: vi.fn(), rpc: vi.fn() });
  generateTemporaryPassword.mockReturnValue('MS-TEST-XXXX');
});`;

const adminBeforeEachNew = `beforeEach(() => {
  // Sprint 3 fix: usar mock fluido que MSW intercepta
  getSupabase.mockReturnValue(createMockSupabase());
  generateTemporaryPassword.mockReturnValue('MS-TEST-XXXX');
});`;

if (adminContent.includes(adminBeforeEachOld)) {
  adminContent = adminContent.replace(adminBeforeEachOld, adminBeforeEachNew);
  console.log('✅ admin.controller.test.js: mock fluido inyectado en beforeEach');
} else {
  // Intento alternativo: usar regex flexible
  const regex = /beforeEach\(\(\)\s*=>\s*\{[\s\S]*?getSupabase\.mockReturnValue\([^)]*\);[\s\S]*?\}\);/;
  if (regex.test(adminContent)) {
    adminContent = adminContent.replace(regex, adminBeforeEachNew);
    console.log('✅ admin.controller.test.js: mock fluido inyectado (regex flexible)');
  } else {
    console.log('⚠️  admin.controller.test.js: no se encontró el bloque beforeEach esperado');
  }
}

if (adminContent !== adminOriginal) {
  fs.writeFileSync(adminTestPath + '.bak-sprint3', adminOriginal, 'utf8');
  fs.writeFileSync(adminTestPath, adminContent, 'utf8');
}

// ─────────────────────────────────────────────────────────────
// PASO 3: Actualizar owner.controller.test.js
// ─────────────────────────────────────────────────────────────
const ownerTestPath = path.join(ROOT, 'tests', 'controllers', 'owner.controller.test.js');
let ownerContent = fs.readFileSync(ownerTestPath, 'utf8');
const ownerOriginal = ownerContent;

if (!ownerContent.includes("from '../helpers/mockSupabase.js'")) {
  ownerContent = ownerContent.replace(
    "import { logSecurityEvent, logAuditChange } from '../../src/utils/audit.js';",
    "import { logSecurityEvent, logAuditChange } from '../../src/utils/audit.js';\nimport { createMockSupabase } from '../helpers/mockSupabase.js';"
  );
}

const ownerBeforeEachOld = `beforeEach(() => {
  // Mock simple de Supabase (MSW se encarga de las respuestas)
  getSupabase.mockReturnValue({ from: vi.fn(), rpc: vi.fn() });
});`;

const ownerBeforeEachNew = `beforeEach(() => {
  // Sprint 3 fix: usar mock fluido que MSW intercepta
  getSupabase.mockReturnValue(createMockSupabase());
});`;

if (ownerContent.includes(ownerBeforeEachOld)) {
  ownerContent = ownerContent.replace(ownerBeforeEachOld, ownerBeforeEachNew);
  console.log('✅ owner.controller.test.js: mock fluido inyectado');
} else {
  const regex = /beforeEach\(\(\)\s*=>\s*\{[\s\S]*?getSupabase\.mockReturnValue\([^)]*\);[\s\S]*?\}\);/;
  if (regex.test(ownerContent)) {
    ownerContent = ownerContent.replace(regex, ownerBeforeEachNew);
    console.log('✅ owner.controller.test.js: mock fluido inyectado (regex flexible)');
  } else {
    console.log('⚠️  owner.controller.test.js: no se encontró el bloque beforeEach esperado');
  }
}

if (ownerContent !== ownerOriginal) {
  fs.writeFileSync(ownerTestPath + '.bak-sprint3', ownerOriginal, 'utf8');
  fs.writeFileSync(ownerTestPath, ownerContent, 'utf8');
}

// ─────────────────────────────────────────────────────────────
// PASO 4: Actualizar auth.controller.test.js
// ─────────────────────────────────────────────────────────────
const authTestPath = path.join(ROOT, 'tests', 'controllers', 'auth.controller.test.js');
let authContent = fs.readFileSync(authTestPath, 'utf8');
const authOriginal = authContent;

if (!authContent.includes("from '../helpers/mockSupabase.js'")) {
  authContent = authContent.replace(
    "import { sendPasswordResetEmail } from '../../src/utils/email.js';",
    "import { sendPasswordResetEmail } from '../../src/utils/email.js';\nimport { createMockSupabase } from '../helpers/mockSupabase.js';"
  );
}

const authBeforeEachOld = `  // Configurar valores por defecto para los mocks
  getSupabase.mockReturnValue({ from: vi.fn(), rpc: vi.fn() }); // Mock básico, MSW se encarga de la lógica`;

const authBeforeEachNew = `  // Configurar valores por defecto para los mocks
  // Sprint 3 fix: usar mock fluido que MSW intercepta
  getSupabase.mockReturnValue(createMockSupabase());`;

if (authContent.includes(authBeforeEachOld)) {
  authContent = authContent.replace(authBeforeEachOld, authBeforeEachNew);
  console.log('✅ auth.controller.test.js: mock fluido inyectado');
} else {
  const regex = /getSupabase\.mockReturnValue\(\{\s*from:\s*vi\.fn\(\),\s*rpc:\s*vi\.fn\(\)\s*\}\);/;
  if (regex.test(authContent)) {
    authContent = authContent.replace(regex, 'getSupabase.mockReturnValue(createMockSupabase());');
    console.log('✅ auth.controller.test.js: mock fluido inyectado (regex flexible)');
  } else {
    console.log('⚠️  auth.controller.test.js: no se encontró el mock de getSupabase');
  }
}

if (authContent !== authOriginal) {
  fs.writeFileSync(authTestPath + '.bak-sprint3', authOriginal, 'utf8');
  fs.writeFileSync(authTestPath, authContent, 'utf8');
}

// ─────────────────────────────────────────────────────────────
// VERIFICACIÓN FINAL
// ─────────────────────────────────────────────────────────────
console.log('');
console.log('═══════════════════════════════════════════════════');
console.log('  VERIFICACIÓN POST-SCRIPT');
console.log('═══════════════════════════════════════════════════');

const checks = [
  { file: HELPER_FILE, name: 'tests/helpers/mockSupabase.js', markers: ['createMockSupabase', 'createQueryBuilder'] },
  { file: adminTestPath, name: 'admin.controller.test.js', markers: ['createMockSupabase'] },
  { file: ownerTestPath, name: 'owner.controller.test.js', markers: ['createMockSupabase'] },
  { file: authTestPath, name: 'auth.controller.test.js', markers: ['createMockSupabase'] },
];

let allOk = true;
for (const c of checks) {
  if (!fs.existsSync(c.file)) {
    console.log(`  ❌ ${c.name}: NO existe`);
    allOk = false;
    continue;
  }
  const content = fs.readFileSync(c.file, 'utf8');
  const found = c.markers.every((m) => content.includes(m));
  console.log(`  ${found ? '✅' : '❌'} ${c.name}`);
  if (!found) allOk = false;
}

console.log('');
if (allOk) {
  console.log('  ✅ Refactor Sprint 3 aplicado correctamente.');
  console.log('');
  console.log('  PRÓXIMOS PASOS:');
  console.log('    1. node --check tests\\controllers\\admin.controller.test.js');
  console.log('    2. node --check tests\\controllers\\owner.controller.test.js');
  console.log('    3. node --check tests\\controllers\\auth.controller.test.js');
  console.log('    4. npm test');
} else {
  console.log('  ⚠️  Revisar manualmente los archivos que fallaron.');
  process.exit(1);
}