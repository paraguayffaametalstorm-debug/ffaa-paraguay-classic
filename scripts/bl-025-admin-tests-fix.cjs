// scripts/bl-025-admin-tests-fix.cjs
//
// BL-025 — Fix del mock híbrido en admin.controller.test.js.
//
// Causa: el mock híbrido no discriminaba por .or(), .ilike(), .eq()
// en queries NO-count, causando 409 falsos en addMember.
//
// Fix: interceptar TODAS las queries de lectura sobre `users` y
// resolverlas contra DB.users local (respetando los filtros).
//
// Idempotencia: si ya está aplicado (contiene __bl025_v2), sale sin error.
//
// Uso: node scripts\bl-025-admin-tests-fix.cjs
// ============================================================

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const TARGET_FILE = path.join(PROJECT_ROOT, 'tests', 'controllers', 'admin.controller.test.js');

function log(msg) { console.log(`[bl-025-admin-fix] ${msg}`); }
function die(msg) { console.error(`❌ [bl-025-admin-fix] ${msg}`); process.exit(1); }

if (!fs.existsSync(TARGET_FILE)) die(`No existe ${TARGET_FILE}`);

let content = fs.readFileSync(TARGET_FILE, 'utf8');
const before = content.length;
content = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

// Guarda de idempotencia
if (content.includes('__bl025_v2')) {
  log('Fix v2 ya aplicado. Saliendo sin error.');
  process.exit(0);
}

// Reemplazar el bloque del mock híbrido completo con la versión v2
const newMockBlock = `// ═══════════════════════════════════════════════════════════════
// BL-025 v2: Mock híbrido de Supabase (resuelve contra DB local)
// ═══════════════════════════════════════════════════════════════
// El mock fluido de MSW no soporta:
//   1. .select('id', { count: 'exact', head: true }) → devuelve { count }
//   2. .or('email.ilike.X,email_institucional.ilike.X') → filtros complejos
//   3. .in('nick', [...]) → array matching
//
// Este wrapper intercepta TODO y resuelve contra DB.users local.
// ═══════════════════════════════════════════════════════════════
function __bl025_hydratedSupabase() {
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
      eq(col, val) { state.filters.push({ op: 'eq', col, val }); return builder; },
      neq(col, val) { state.filters.push({ op: 'neq', col, val }); return builder; },
      gt(col, val) { state.filters.push({ op: 'gt', col, val }); return builder; },
      gte(col, val) { state.filters.push({ op: 'gte', col, val }); return builder; },
      lt(col, val) { state.filters.push({ op: 'lt', col, val }); return builder; },
      lte(col, val) { state.filters.push({ op: 'lte', col, val }); return builder; },
      like(col, val) { state.filters.push({ op: 'like', col, val }); return builder; },
      ilike(col, val) { state.filters.push({ op: 'ilike', col, val }); return builder; },
      in(col, val) { state.filters.push({ op: 'in', col, val }); return builder; },
      is(col, val) { state.filters.push({ op: 'is', col, val }); return builder; },
      or(filterStr) { state.filters.push({ op: 'or', val: filterStr }); return builder; },
      order(col, opts) { state.order = { col, asc: opts?.ascending !== false }; return builder; },
      limit(n) { state.limit = n; return builder; },
      range(from, to) { state.filters.push({ op: 'range', from, to }); return builder; },
      single() { state.isSingle = true; return builder; },
      maybeSingle() { state.isSingle = true; return builder; },

      insert(payload) { state.method = 'INSERT'; state.body = Array.isArray(payload) ? payload : [payload]; return builder; },
      update(payload) { state.method = 'UPDATE'; state.body = payload; return builder; },
      upsert(payload) { state.method = 'INSERT'; state.body = Array.isArray(payload) ? payload : [payload]; return builder; },
      delete() { state.method = 'DELETE'; return builder; },

      then(onFulfilled, onRejected) {
        return __bl025_v2_execute(state).then(onFulfilled, onRejected);
      },
      catch(onRejected) {
        return __bl025_v2_execute(state).catch(onRejected);
      },
      finally(onFinally) {
        return __bl025_v2_execute(state).finally(onFinally);
      },
    };

    return builder;
  }

  return {
    from: (table) => makeBuilder(table),

    rpc: (fn, args = {}) => {
      return {
        then: (resolve) => {
          // RPCs simples
          if (fn === 'get_next_user_id') {
            return Promise.resolve({ data: 999, error: null }).then(resolve);
          }
          return Promise.resolve({ data: null, error: null }).then(resolve);
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

// ═══════════════════════════════════════════════════════════════
// Ejecutor v2: resuelve queries contra DB local (users/performances)
// ═══════════════════════════════════════════════════════════════
function __bl025_v2_execute(state) {
  try {
    const tableData = __bl025_v2_getTable(state.table);

    // ── INSERT ──
    if (state.method === 'INSERT') {
      const records = state.body.map(rec => ({
        ...rec,
        id: rec.id || \`uuid-gen-\${Date.now()}-\${Math.random().toString(36).slice(2, 8)}\`,
      }));
      if (Array.isArray(tableData)) {
        tableData.push(...records);
      }
      return Promise.resolve({ data: state.isSingle ? records[0] : records, error: null, count: records.length });
    }

    // ── UPDATE ──
    if (state.method === 'UPDATE') {
      const matched = __bl025_v2_applyFilters(tableData, state.filters);
      matched.forEach(item => Object.assign(item, state.body));
      return Promise.resolve({ data: state.isSingle ? (matched[0] || null) : matched, error: null, count: matched.length });
    }

    // ── DELETE ──
    if (state.method === 'DELETE') {
      const matched = __bl025_v2_applyFilters(tableData, state.filters);
      const matchedIds = new Set(matched.map(m => m.id));
      const remaining = tableData.filter(item => !matchedIds.has(item.id));
      if (Array.isArray(tableData)) {
        tableData.length = 0;
        tableData.push(...remaining);
      }
      return Promise.resolve({ data: null, error: null, count: matched.length });
    }

    // ── SELECT (con count:exact/head:true) ──
    if (state.isCountMode) {
      const matched = __bl025_v2_applyFilters(tableData, state.filters);
      return Promise.resolve({ data: null, error: null, count: matched.length });
    }

    // ── SELECT normal ──
    let result = __bl025_v2_applyFilters(tableData, state.filters);

    // Order
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

    // Limit
    if (state.limit !== null) {
      result = result.slice(0, state.limit);
    }

    // Single
    if (state.isSingle) {
      return Promise.resolve({ data: result[0] || null, error: null, count: null });
    }

    return Promise.resolve({ data: result, error: null, count: result.length });
  } catch (err) {
    return Promise.resolve({ data: null, error: { message: err.message }, count: null });
  }
}

// ═══════════════════════════════════════════════════════════════
// Helpers de resolución local
// ═══════════════════════════════════════════════════════════════
function __bl025_v2_getTable(table) {
  if (table === 'users') return DB.users;
  if (table === 'performances') return DB.performances;
  if (table === 'audit_logs') return DB.audit_logs;
  // Para otras tablas, devolver array vacío pero mutable
  return [];
}

function __bl025_v2_applyFilters(data, filters) {
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
      // Formato Supabase: "email.ilike.X,email_institucional.ilike.X"
      const clauses = f.val.split(',').map(s => s.trim());
      result = result.filter(item => {
        return clauses.some(clause => {
          const m = clause.match(/^([a-z_]+)\.(ilike|eq|in)\.(.+)$/i);
          if (!m) return false;
          const [, col, op, val] = m;
          const itemVal = String(item[col] || '').toLowerCase();
          const targetVal = String(val).toLowerCase();
          if (op === 'ilike') return itemVal.includes(targetVal.replace(/%/g, ''));
          if (op === 'eq') return itemVal === targetVal;
          return false;
        });
      });
    }
  }

  return result;
}`;

// Reemplazar TODO el bloque del mock híbrido anterior
content = content.replace(
  /\/\/ ═+\n\/\/ BL-025: Mock híbrido de Supabase[\s\S]*?(?=\n\/\/ ═+\n\/\/ BL-025: Cálculo local de COUNT)/,
  newMockBlock + '\n'
);

// Reemplazar la función __bl025_computeCount (ya no se usa)
content = content.replace(
  /\/\/ ═+\n\/\/ BL-025: Cálculo local de COUNT[\s\S]*?\n\}\n/,
  ''
);

// Actualizar la llamada en beforeEach para usar la firma con __bl025_v2
content = content.replace(
  /getSupabase\.mockReturnValue\(__bl025_hydratedSupabase\(\)\);/,
  'getSupabase.mockReturnValue(__bl025_hydratedSupabase());'
);

// Verificación
if (!content.includes('__bl025_v2')) {
  die('No se pudo inyectar el fix v2. Revisar el script.');
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
log('✅ Fix aplicado.');
log('');
log('Próximo paso:');
log('  npx vitest run tests/controllers/admin.controller.test.js --reporter=verbose');