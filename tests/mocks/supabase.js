/**
 * ============================================================================
 * PARAGUAY-FFAA | METALSTORM
 * Mock de Supabase — API encadenable [F4.2.2-C]
 * ============================================================================
 * Simula el cliente @supabase/supabase-js para tests unitarios.
 *
 * El cliente real expone una API fluent (encadenable) tipo:
 *   supabase.from('table').select('*').eq('id', x).limit(1)
 *
 * Este mock replica esa API y permite:
 *   - Definir respuestas por tabla + operación.
 *   - Simular errores ({ data: null, error: { code, message } }).
 *   - Inspeccionar qué queries se ejecutaron (spy).
 *
 * Uso típico:
 *   import { createSupabaseMock, queueResponse } from '../mocks/supabase.js';
 *
 *   const supa = createSupabaseMock();
 *   queueResponse(supa, 'events_master', 'select', { data: [event], error: null });
 *
 *   // en el test:
 *   vi.mock('../../src/db/supabase.js', () => ({
 *     getSupabase: () => supa
 *   }));
 * ============================================================================
 */

import { vi } from 'vitest';

// ============================================================
// QUERY BUILDER MOCK
// ============================================================

/**
 * Crea un query builder encadenable.
 * Cada método devuelve `this` excepto los terminales (`single`, `maybeSingle`)
 * y los que disparan la query (`then`, `await`).
 *
 * @param {Object} state - { table, op, filters, data, error }
 * @returns {Object} Query builder
 */
function createQueryBuilder(state) {
  const builder = {
    // ----------------------------------------------------------
    // Filtros / modifiers (encadenables)
    // ----------------------------------------------------------
    select: vi.fn((columns = '*') => {
      state.select = columns;
      return builder;
    }),
    insert: vi.fn((rows) => {
      state.op = 'insert';
      state.payload = Array.isArray(rows) ? rows : [rows];
      return builder;
    }),
    update: vi.fn((values) => {
      state.op = 'update';
      state.payload = values;
      return builder;
    }),
    delete: vi.fn(() => {
      state.op = 'delete';
      return builder;
    }),
    upsert: vi.fn((values, options) => {
      state.op = 'upsert';
      state.payload = Array.isArray(values) ? values : [values];
      state.upsertOptions = options;
      return builder;
    }),
    eq: vi.fn((column, value) => {
      state.filters.push({ type: 'eq', column, value });
      return builder;
    }),
    neq: vi.fn((column, value) => {
      state.filters.push({ type: 'neq', column, value });
      return builder;
    }),
    in: vi.fn((column, values) => {
      state.filters.push({ type: 'in', column, values });
      return builder;
    }),
    order: vi.fn((column, options) => {
      state.order = { column, options };
      return builder;
    }),
    limit: vi.fn((n) => {
      state.limit = n;
      return builder;
    }),
    maybeSingle: vi.fn(async () => state.response),
    single: vi.fn(async () => state.response),

    // ----------------------------------------------------------
    // Thenable (para `await query`)
    // ----------------------------------------------------------
    then: vi.fn((resolve, reject) => {
      return Promise.resolve(state.response).then(resolve, reject);
    })
  };

  return builder;
}

// ============================================================
// SUPABASE MOCK
// ============================================================

/**
 * Crea un mock de Supabase con cola de respuestas por tabla.
 *
 * @returns {Object} Mock con métodos de Supabase + helpers
 */
export function createSupabaseMock() {
  // Cola de respuestas: { tableName: [response1, response2, ...] }
  const responseQueue = {};

  // Historial de queries (para inspección en tests)
  const queryHistory = [];

  /**
   * Resuelve la próxima respuesta en la cola para una tabla.
   * Si no hay respuesta → devuelve { data: null, error: null }.
   */
  function nextResponse(table) {
    if (!responseQueue[table] || responseQueue[table].length === 0) {
      return { data: null, error: null };
    }
    return responseQueue[table].shift();
  }

  const supabaseMock = {
    from: vi.fn((table) => {
      const state = {
        table,
        op: 'select',
        filters: [],
        select: null,
        payload: null,
        order: null,
        limit: null,
        response: nextResponse(table)
      };

      // Registrar la query en el historial (referencia al state)
      queryHistory.push(state);

      return createQueryBuilder(state);
    }),

    // Expuesto para inspección en tests
    _queryHistory: queryHistory,
    _responseQueue: responseQueue
  };

  return supabaseMock;
}

// ============================================================
// HELPERS
// ============================================================

/**
 * Encola una respuesta para la próxima query a `table`.
 *
 * @param {Object} supa - Mock creado con createSupabaseMock()
 * @param {string} table - Nombre de la tabla
 * @param {Object} response - { data, error }
 */
export function queueResponse(supa, table, response) {
  if (!supa._responseQueue[table]) {
    supa._responseQueue[table] = [];
  }
  supa._responseQueue[table].push(response);
}

/**
 * Encola varias respuestas de golpe (ordenadas).
 */
export function queueResponses(supa, table, responses) {
  for (const r of responses) {
    queueResponse(supa, table, r);
  }
}

/**
 * Simula un error de Supabase.
 */
export function supaError(code, message = 'Simulated error') {
  return { data: null, error: { code, message } };
}

/**
 * Simula una respuesta exitosa.
 */
export function supaOk(data) {
  return { data, error: null };
}

/**
 * Limpia la cola y el historial del mock.
 * Llamar en beforeEach() o afterEach().
 */
export function resetSupabaseMock(supa) {
  if (!supa) return;
  Object.keys(supa._responseQueue).forEach((key) => {
    delete supa._responseQueue[key];
  });
  supa._queryHistory.length = 0;
  supa.from.mockClear();
}