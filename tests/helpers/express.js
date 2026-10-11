/**
 * ============================================================================
 * PARAGUAY-FFAA | METALSTORM
 * Mock de Express req/res [F4.2.2-C]
 * ============================================================================
 * Helpers para construir objetos `req` y `res` falsos que se comporten
 * como los de Express 5, permitiendo testear los handlers sin levantar
 * el servidor HTTP.
 *
 * Uso:
 *   import { mockReq, mockRes } from '../mocks/express.js';
 *
 *   const req = mockReq({ params: { eventId: 'abc' }, user: { id: 'u1' } });
 *   const res = mockRes();
 *   await getBmActiveEventV2(req, res);
 *   expect(res.statusCode).toBe(200);
 *   expect(res.body.success).toBe(true);
 * ============================================================================
 */

import { vi } from 'vitest';

/**
 * Crea un objeto `req` simulado.
 *
 * @param {Object} overrides - { params, query, body, user, headers }
 * @returns {Object} req simulado
 */
export function mockReq(overrides = {}) {
  return {
    params: overrides.params || {},
    query: overrides.query || {},
    body: overrides.body || {},
    user: overrides.user || { id: 'test-user-uuid', nick: 'TestPilot', role: 'MIEMBRO' },
    headers: overrides.headers || {},
    ...overrides
  };
}

/**
 * Crea un objeto `res` simulado que captura las llamadas de Express.
 *
 * Expone:
 *   - res.statusCode → último status enviado
 *   - res.body → último JSON enviado
 *   - res.headers → headers seteados
 *   - res.status, res.json, res.send, res.end (funciones espiadas)
 *
 * @returns {Object} res simulado
 */
export function mockRes() {
  const res = {
    statusCode: 200,
    body: null,
    headers: {},

    status: vi.fn(function (code) {
      res.statusCode = code;
      return res;
    }),

    json: vi.fn(function (payload) {
      res.body = payload;
      return res;
    }),

    send: vi.fn(function (payload) {
      res.body = payload;
      return res;
    }),

    end: vi.fn(function () {
      return res;
    }),

    setHeader: vi.fn(function (key, value) {
      res.headers[key] = value;
      return res;
    }),

    // Reset para reusar el mismo res en varios asserts
    _reset: function () {
      res.statusCode = 200;
      res.body = null;
      res.headers = {};
      res.status.mockClear();
      res.json.mockClear();
      res.send.mockClear();
      res.end.mockClear();
      res.setHeader.mockClear();
    }
  };

  return res;
}