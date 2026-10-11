// tests/helpers/mockSupabase.js
//
// Sprint 3 — Mock fluido de Supabase compatible con MSW.
//
// Emula la API encadenable de @supabase/supabase-js:
//   supabase.from('tabla').select('*').eq('campo', valor).limit(10)
//
// Internamente hace un `fetch` a una URL canónica bajo `/rest/v1/`,
// que MSW intercepta para devolver datos. De esta forma, los tests
// pueden usar setupServer de MSW con handlers realistas.
//
// Uso típico:
//   import { createMockSupabase } from '../helpers/mockSupabase.js';
//   const mockSupabase = createMockSupabase();
//   getSupabase.mockReturnValue(mockSupabase);
//
// Los handlers de MSW deben matchear `*/rest/v1/{tabla}*` y devolver
// `HttpResponse.json([...])` según la query string.

const SUPABASE_MOCK_BASE = 'http://localhost:54321/rest/v1';

/**
 * Cliente fluido de Supabase para tests.
 * Cada método devuelve `this` para permitir encadenamiento.
 * Cuando se hace `await` sobre la cadena, ejecuta el `fetch` a MSW.
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
    if (f.op === 'eq') params.append(f.column, `eq.${f.value}`);
    else if (f.op === 'neq') params.append(f.column, `neq.${f.value}`);
    else if (f.op === 'gt') params.append(f.column, `gt.${f.value}`);
    else if (f.op === 'gte') params.append(f.column, `gte.${f.value}`);
    else if (f.op === 'lt') params.append(f.column, `lt.${f.value}`);
    else if (f.op === 'lte') params.append(f.column, `lte.${f.value}`);
    else if (f.op === 'like') params.append(f.column, `like.${f.value}`);
    else if (f.op === 'ilike') params.append(f.column, `ilike.${f.value}`);
    else if (f.op === 'in') params.append(f.column, `in.(${f.value.join(',')})`);
    else if (f.op === 'is') params.append(f.column, `is.${f.value}`);
    else if (f.op === 'or') params.append('or', f.value);
  }

  if (state.select) params.append('select', state.select);
  if (state.order) params.append('order', `${state.order.column}.${state.order.ascending ? 'asc' : 'desc'}`);
  if (state.limit !== null) params.append('limit', String(state.limit));
  if (state.offset !== null) params.append('offset', String(state.offset));

  const url = `${SUPABASE_MOCK_BASE}/${state.table}?${params.toString()}`;

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
 * Cliente Supabase completo (con `from`, `rpc`, `storage`).
 */
function createMockSupabase() {
  return {
    from: (table) => createQueryBuilder(table),

    rpc: (fn, args = {}) => {
      // Para RPCs, hacemos fetch a /rest/v1/rpc/{fn}
      return {
        then: (resolve) => {
          const url = `${SUPABASE_MOCK_BASE}/rpc/${fn}`;
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
