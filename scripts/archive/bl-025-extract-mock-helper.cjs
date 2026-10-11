// scripts/bl-025-extract-mock-helper.cjs
//
// BL-025 · Script 3A v2 — Extrae el mock híbrido de admin a un helper compartido.
//
// v2: verifica con el exit code de vitest, no con regex sobre el output.
//
// Rollback manual:
//   copy /Y tests\controllers\admin.controller.test.js.bak-bl-025-extract tests\controllers\admin.controller.test.js
//   del tests\helpers\mockSupabaseHybrid.js
//
// Uso: node scripts\bl-025-extract-mock-helper.cjs
// ============================================================

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const ADMIN_TEST   = path.join(PROJECT_ROOT, 'tests', 'controllers', 'admin.controller.test.js');
const ADMIN_BACKUP = `${ADMIN_TEST}.bak-bl-025-extract`;
const HELPER_FILE  = path.join(PROJECT_ROOT, 'tests', 'helpers', 'mockSupabaseHybrid.js');

function log(msg)  { console.log(`[bl-025-extract] ${msg}`); }
function die(msg)  { console.error(`❌ [bl-025-extract] ${msg}`); process.exit(1); }

if (!fs.existsSync(ADMIN_TEST)) die(`No existe ${ADMIN_TEST}`);

// ─── 1. Leer admin test y normalizar ──────────────────────────
let adminContent = fs.readFileSync(ADMIN_TEST, 'utf8').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
const adminBefore = adminContent.length;

// Guarda de idempotencia
if (adminContent.includes("from '../helpers/mockSupabaseHybrid.js'")) {
  log('Ya está aplicado. Saliendo sin error.');
  process.exit(0);
}

// ─── 2. Verificar que el bloque del mock existe ───────────────
const startMarker = '// ═══════════════════════════════════════════════════════════════\n// BL-025 v2: Mock híbrido de Supabase (resuelve contra DB local)';
const endMarker = 'function __bl025_v2_applyFilters(data, filters) {';

const startIdx = adminContent.indexOf(startMarker);
if (startIdx === -1) die('No se encontró el bloque del mock híbrido v2 en admin test.');

const endIdx = adminContent.indexOf(endMarker, startIdx);
if (endIdx === -1) die('No se encontró el inicio de applyFilters.');

// Balancear llaves de applyFilters
let braceCount = 0;
let endFinalIdx = -1;
for (let i = endIdx; i < adminContent.length; i++) {
  if (adminContent[i] === '{') braceCount++;
  else if (adminContent[i] === '}') {
    braceCount--;
    if (braceCount === 0) { endFinalIdx = i + 1; break; }
  }
}
if (endFinalIdx === -1) die('No se pudo balancear las llaves de applyFilters.');

// ─── 3. Crear el helper compartido ────────────────────────────
const helperContent = `// tests/helpers/mockSupabaseHybrid.js
//
// BL-025 — Mock híbrido de Supabase reutilizable entre tests de controllers.
//
// Motivación:
//   El mock fluido original (mockSupabase.js, sobre MSW) no soporta:
//     - .select('id', { count: 'exact', head: true }) → { count }
//     - .or('email.ilike.X,email_institucional.ilike.X') → filtros complejos
//     - .in('nick', [...]) → array matching
//
//   Este helper resuelve todas las queries contra un objeto DB local que el
//   test provee. No usa MSW, no usa red, no usa Supabase real.
//
// Uso:
//   import { createHybridSupabase } from '../helpers/mockSupabaseHybrid.js';
//   const DB = { users: [...], performances: [...], audit_logs: [] };
//   getSupabase.mockReturnValue(createHybridSupabase(DB));
//
// Importante:
//   - El DB se pasa por parámetro para que cada test file mantenga su propio estado.
//   - El helper NO modifica el DB por fuera de lo que pida el controller.
//   - El helper NO toca Supabase, ni Postgres, ni red. Es 100% en memoria.
// ============================================================

/**
 * Crea un cliente Supabase híbrido que resuelve contra DB local.
 * @param {Object} DB - Estructura con { users: [], performances: [], audit_logs: [] }
 * @returns {Object} Cliente con .from(), .rpc(), .storage
 */
export function createHybridSupabase(DB) {
  if (!DB || typeof DB !== 'object') {
    throw new Error('createHybridSupabase requiere un objeto DB');
  }

  function makeBuilder(table) {
    const state = {
      table,
      method: 'GET',
      select: '*',
      filters: [],
      isCountMode: false,
      isSingle: false,
      limit: null,
      order: null,
      body: null,
    };

    const builder = {
      select(fields, opts) {
        state.select = fields;
        if (opts && opts.count === 'exact' && opts.head === true) {
          state.isCountMode = true;
        }
        return builder;
      },
      eq(col, val)    { state.filters.push({ op: 'eq', col, val }); return builder; },
      neq(col, val)   { state.filters.push({ op: 'neq', col, val }); return builder; },
      gt(col, val)    { state.filters.push({ op: 'gt', col, val }); return builder; },
      gte(col, val)   { state.filters.push({ op: 'gte', col, val }); return builder; },
      lt(col, val)    { state.filters.push({ op: 'lt', col, val }); return builder; },
      lte(col, val)   { state.filters.push({ op: 'lte', col, val }); return builder; },
      like(col, val)  { state.filters.push({ op: 'like', col, val }); return builder; },
      ilike(col, val) { state.filters.push({ op: 'ilike', col, val }); return builder; },
      in(col, val)    { state.filters.push({ op: 'in', col, val }); return builder; },
      is(col, val)    { state.filters.push({ op: 'is', col, val }); return builder; },
      or(filterStr)   { state.filters.push({ op: 'or', val: filterStr }); return builder; },
      order(col, opts){ state.order = { col, asc: opts?.ascending !== false }; return builder; },
      limit(n)        { state.limit = n; return builder; },
      range(from, to) { state.filters.push({ op: 'range', from, to }); return builder; },
      single()        { state.isSingle = true; return builder; },
      maybeSingle()   { state.isSingle = true; return builder; },

      insert(payload) {
        state.method = 'INSERT';
        state.body = Array.isArray(payload) ? payload : [payload];
        return builder;
      },
      update(payload) { state.method = 'UPDATE'; state.body = payload; return builder; },
      upsert(payload) {
        state.method = 'INSERT';
        state.body = Array.isArray(payload) ? payload : [payload];
        return builder;
      },
      delete() { state.method = 'DELETE'; return builder; },

      then(onF, onR)         { return executeQuery(state, DB).then(onF, onR); },
      catch(onR)             { return executeQuery(state, DB).catch(onR); },
      finally(onFinally)     { return executeQuery(state, DB).finally(onFinally); },
    };

    return builder;
  }

  return {
    from: (table) => makeBuilder(table),

    rpc: (fn, args = {}) => ({
      then: (resolve) => {
        if (fn === 'get_next_user_id') {
          return Promise.resolve({ data: 999, error: null }).then(resolve);
        }
        return Promise.resolve({ data: null, error: null }).then(resolve);
      },
    }),

    storage: {
      from: () => ({
        download: () => Promise.resolve({ data: null, error: { message: 'not implemented' } }),
        upload:   () => Promise.resolve({ data: null, error: { message: 'not implemented' } }),
      }),
    },
  };
}

// ─── Ejecutor de queries contra DB local ─────────────────────

function executeQuery(state, DB) {
  try {
    const tableData = getTable(state.table, DB);

    if (state.method === 'INSERT') {
      const records = state.body.map(rec => ({
        ...rec,
        id: rec.id || \`uuid-gen-\${Date.now()}-\${Math.random().toString(36).slice(2, 8)}\`,
      }));
      if (Array.isArray(tableData)) tableData.push(...records);
      return Promise.resolve({ data: state.isSingle ? records[0] : records, error: null, count: records.length });
    }

    if (state.method === 'UPDATE') {
      const matched = applyFilters(tableData, state.filters);
      matched.forEach(item => Object.assign(item, state.body));
      return Promise.resolve({ data: state.isSingle ? (matched[0] || null) : matched, error: null, count: matched.length });
    }

    if (state.method === 'DELETE') {
      const matched = applyFilters(tableData, state.filters);
      const matchedIds = new Set(matched.map(m => m.id));
      const remaining = tableData.filter(item => !matchedIds.has(item.id));
      if (Array.isArray(tableData)) {
        tableData.length = 0;
        tableData.push(...remaining);
      }
      return Promise.resolve({ data: null, error: null, count: matched.length });
    }

    if (state.isCountMode) {
      const matched = applyFilters(tableData, state.filters);
      return Promise.resolve({ data: null, error: null, count: matched.length });
    }

    let result = applyFilters(tableData, state.filters);

    if (state.order) {
      const { col, asc } = state.order;
      result = [...result].sort((a, b) => {
        const va = a[col], vb = b[col];
        if (va === vb) return 0;
        if (va == null) return 1;
        if (vb == null) return -1;
        return (va < vb ? -1 : 1) * (asc ? 1 : -1);
      });
    }

    if (state.limit !== null) result = result.slice(0, state.limit);
    if (state.isSingle) return Promise.resolve({ data: result[0] || null, error: null, count: null });

    return Promise.resolve({ data: result, error: null, count: result.length });
  } catch (err) {
    return Promise.resolve({ data: null, error: { message: err.message }, count: null });
  }
}

function getTable(table, DB) {
  if (table === 'users')           return DB.users           || [];
  if (table === 'performances')    return DB.performances    || [];
  if (table === 'audit_logs')      return DB.audit_logs      || [];
  if (table === 'security_events') return DB.security_events || [];
  return [];
}

function applyFilters(data, filters) {
  if (!Array.isArray(data)) return [];
  let result = [...data];

  for (const f of filters) {
    if (f.op === 'eq') {
      result = result.filter(item => String(item[f.col]) === String(f.val));
    } else if (f.op === 'neq') {
      result = result.filter(item => String(item[f.col]) !== String(f.val));
    } else if (f.op === 'ilike') {
      const pattern = String(f.val).replace(/%/g, '').toLowerCase();
      result = result.filter(item => String(item[f.col] || '').toLowerCase().includes(pattern));
    } else if (f.op === 'like') {
      const pattern = String(f.val).replace(/%/g, '');
      result = result.filter(item => String(item[f.col] || '').includes(pattern));
    } else if (f.op === 'in') {
      const set = new Set(f.val.map(v => String(v)));
      result = result.filter(item => set.has(String(item[f.col])));
    } else if (f.op === 'is') {
      if (f.val === null) result = result.filter(item => item[f.col] === null || item[f.col] === undefined);
      else result = result.filter(item => item[f.col] === f.val);
    } else if (f.op === 'or') {
      const clauses = f.val.split(',').map(s => s.trim());
      result = result.filter(item => {
        return clauses.some(clause => {
          const m = clause.match(/^([a-z_]+)\\.(ilike|eq|in)\\.(.+)$/i);
          if (!m) return false;
          const [, col, op, val] = m;
          const itemVal = String(item[col] || '').toLowerCase();
          const targetVal = String(val).toLowerCase();
          if (op === 'ilike') return itemVal.includes(targetVal.replace(/%/g, ''));
          if (op === 'eq')    return itemVal === targetVal;
          return false;
        });
      });
    }
  }

  return result;
}
`;

if (!fs.existsSync(path.dirname(HELPER_FILE))) {
  fs.mkdirSync(path.dirname(HELPER_FILE), { recursive: true });
}
fs.writeFileSync(HELPER_FILE, helperContent, 'utf8');
log(`Helper creado: tests/helpers/mockSupabaseHybrid.js`);

// ─── 4. Reemplazar el bloque del mock por un comentario ───────
const importLine = `// ═══════════════════════════════════════════════════════════════
// BL-025 · El mock híbrido de Supabase ahora vive en:
//   tests/helpers/mockSupabaseHybrid.js → createHybridSupabase(DB)
// Se importa arriba junto al resto de helpers. Ver import.
// ═══════════════════════════════════════════════════════════════`;

adminContent =
  adminContent.slice(0, startIdx) +
  importLine +
  adminContent.slice(endFinalIdx);

// ─── 5. Agregar el import del helper ──────────────────────────
adminContent = adminContent.replace(
  /(import \{ createMockSupabase \} from '\.\.\/helpers\/mockSupabase\.js';)/,
  `$1
import { createHybridSupabase } from '../helpers/mockSupabaseHybrid.js';`
);

// ─── 6. Reemplazar el uso en beforeEach ───────────────────────
adminContent = adminContent.replace(
  /getSupabase\.mockReturnValue\(__bl025_hydratedSupabase\(\)\);/,
  'getSupabase.mockReturnValue(createHybridSupabase(DB));'
);

// ─── 7. Backup + escritura ────────────────────────────────────
if (!fs.existsSync(ADMIN_BACKUP)) {
  fs.writeFileSync(ADMIN_BACKUP, fs.readFileSync(ADMIN_TEST, 'utf8'), 'utf8');
  log(`Backup creado: ${path.basename(ADMIN_BACKUP)}`);
} else {
  log(`Backup ya existía: ${path.basename(ADMIN_BACKUP)} (no se sobrescribe)`);
}

fs.writeFileSync(ADMIN_TEST, adminContent, 'utf8');
log(`Escrito: admin.controller.test.js (${adminBefore} → ${adminContent.length} chars)`);

// ─── 8. node --check ──────────────────────────────────────────
try {
  execSync(`node --check "${ADMIN_TEST}"`, { stdio: 'inherit' });
  log('✅ node --check OK');
} catch (e) {
  die('❌ node --check falló. Rollback manual requerido.');
}

// ─── 9. Verificación con vitest por EXIT CODE ─────────────────
log('');
log('🔍 Verificando con vitest (rollback automático si falla)...');
log('');

let vitestOk = false;
try {
  execSync(
    `npx vitest run tests/controllers/admin.controller.test.js --reporter=dot`,
    { stdio: 'inherit', cwd: PROJECT_ROOT }
  );
  vitestOk = true;
} catch (e) {
  vitestOk = false;
}

// ─── 10. Rollback automático si falló ─────────────────────────
if (!vitestOk) {
  log('');
  log('🔄 Ejecutando rollback automático...');

  try {
    fs.copyFileSync(ADMIN_BACKUP, ADMIN_TEST);
    log('✅ admin.controller.test.js restaurado desde backup');

    if (fs.existsSync(HELPER_FILE)) {
      fs.unlinkSync(HELPER_FILE);
      log('✅ helper eliminado');
    }
  } catch (rb) {
    die(`❌ Rollback falló: ${rb.message}. Rollback manual: copy /Y "${ADMIN_BACKUP}" "${ADMIN_TEST}"`);
  }

  die('El refactor NO quedó estable. Rollback completado. Revisar.');
}

// ─── 11. Éxito ────────────────────────────────────────────────
log('');
log('✅ Script 3A aplicado exitosamente. admin.controller.test.js sigue en 44/44.');
log('');
log('Próximo paso:');
log('  Script 3B → bl-025-auth-tests.cjs (usará el helper compartido).');
log('');
log('Rollback manual si querés volver atrás:');
log(`  copy /Y "${ADMIN_BACKUP}" "${ADMIN_TEST}"`);
log(`  del "${HELPER_FILE}"`);