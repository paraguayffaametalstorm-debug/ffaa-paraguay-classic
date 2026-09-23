#!/usr/bin/env node
/**
 * ============================================================================
 * PARAGUAY-FFAA | METALSTORM
 * Script: generate-dashboard-tests.cjs
 * ============================================================================
 * PROPÓSITO:
 *   Generar el archivo tests/controllers/dashboard.controller.test.js
 *   con tests de integración para /api/dashboard/summary (BL-022).
 *
 * USO:
 *   node scripts/generate-dashboard-tests.cjs
 *
 * IDEMPOTENTE:
 *   Sí. Sobreescribe el archivo si ya existe (con backup previo).
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const TARGET = path.join(ROOT, 'tests', 'controllers', 'dashboard.controller.test.js');
const BACKUP = TARGET + '.bak-generate-' + Date.now();

const CONTENT = `/**
 * ============================================================================
 * PARAGUAY-FFAA | METALSTORM
 * Tests: dashboard.controller.js
 * ============================================================================
 * PROPÓSITO:
 *   Tests unitarios para GET /api/dashboard/summary.
 *   Previene recurrencia de HALL-067 (bug 500 por currentProfile mal scopeado).
 *
 * COBERTURA:
 *   1. Status 200 + estructura de respuesta.
 *   2. Campos obligatorios: squadStats.meta_tokens_sq, squadStats.pilots_without_load,
 *      eventType.
 *   3. currentProfile = null (bug original HALL-067).
 *   4. Sin evento activo.
 *   5. Con evento activo.
 *   6. Cálculo correcto de squadStats (avg_tokens, pilots_without_load).
 *   7. Supabase null (degradación elegante).
 *   8. topPilots ordenados por avg_tokens descendente.
 *
 * EJECUCIÓN:
 *   npm test -- dashboard.controller
 *   O bien: npx vitest run tests/controllers/dashboard.controller.test.js
 * ============================================================================
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─────────────────────────────────────────────────────────────────────────────
// MOCK DE SUPABASE
// ─────────────────────────────────────────────────────────────────────────────
// Creamos un mock configurable que simula el cliente de Supabase.
// Cada test puede setear las respuestas que espera.

let mockResponses = {
  events: { data: [], error: null },
  users: { data: [], error: null },
  performances: { data: [], error: null }
};

const mockSupabase = {
  from: vi.fn((table) => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      then: (resolve) => {
        // Permite await sobre la cadena
        const response = mockResponses[table] || { data: null, error: null };
        return Promise.resolve(response).then(resolve);
      }
    };
    return chain;
  })
};

// Mock del módulo db/supabase.js
vi.mock('../../src/db/supabase.js', () => ({
  getSupabase: vi.fn(() => mockSupabase)
}));

// Importar el controller DESPUÉS del mock
import { getSummary } from '../../src/controllers/dashboard.controller.js';

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Crea un mock de req/res/next de Express.
 */
function createMocks(userOverride = null) {
  const req = {
    user: userOverride || {
      user_id: 1,
      id: 'uuid-owner-1',
      email: 'owner@ffaa.py',
      nick: 'OWNER',
      role: 'OWNER',
      perf_status: 'VERDE'
    }
  };
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis()
  };
  const next = vi.fn();
  return { req, res, next };
}

/**
 * Configura las respuestas del mock de Supabase.
 */
function setMockResponses({ events, users, performances }) {
  if (events !== undefined) mockResponses.events = events;
  if (users !== undefined) mockResponses.users = users;
  if (performances !== undefined) mockResponses.performances = performances;
}

// ─────────────────────────────────────────────────────────────────────────────
// TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe('getSummary (dashboard.controller)', () => {

  beforeEach(() => {
    // Resetear respuestas entre tests
    mockResponses = {
      events: { data: [], error: null },
      users: { data: [], error: null },
      performances: { data: [], error: null }
    };
    vi.clearAllMocks();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Test 1: Estructura básica de respuesta
  // ───────────────────────────────────────────────────────────────────────────
  it('devuelve status 200 con la estructura completa de respuesta', async () => {
    setMockResponses({
      events: { data: [], error: null },
      users: { data: [], error: null },
      performances: { data: [], error: null }
    });

    const { req, res, next } = createMocks();
    await getSummary(req, res, next);

    expect(res.json).toHaveBeenCalledTimes(1);
    const payload = res.json.mock.calls[0][0];

    expect(payload.success).toBe(true);
    expect(payload).toHaveProperty('currentEvent');
    expect(payload).toHaveProperty('eventType');
    expect(payload).toHaveProperty('userStats');
    expect(payload).toHaveProperty('squadStats');
    expect(payload).toHaveProperty('topPilots');
    expect(Array.isArray(payload.topPilots)).toBe(true);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Test 2: Campos obligatorios en squadStats
  // ───────────────────────────────────────────────────────────────────────────
  it('incluye los campos obligatorios en squadStats (BL-022)', async () => {
    setMockResponses({
      events: { data: [], error: null },
      users: { data: [], error: null },
      performances: { data: [], error: null }
    });

    const { req, res, next } = createMocks();
    await getSummary(req, res, next);

    const payload = res.json.mock.calls[0][0];

    // Campos críticos que causaron HALL-067
    expect(payload.squadStats).toHaveProperty('meta_tokens_sq');
    expect(payload.squadStats.meta_tokens_sq).toBe(175);

    expect(payload.squadStats).toHaveProperty('pilots_without_load');
    expect(typeof payload.squadStats.pilots_without_load).toBe('number');

    expect(payload).toHaveProperty('eventType');
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Test 3: currentProfile = null (HALL-067 - bug original)
  // ───────────────────────────────────────────────────────────────────────────
  it('maneja currentProfile = null sin lanzar error (HALL-067)', async () => {
    // Escenario: hay usuarios activos, pero NINGUNO coincide con el usuario actual
    setMockResponses({
      events: { data: [], error: null },
      users: {
        data: [
          { id: 'uuid-1', user_id: 10, email: 'otro1@ffaa.py', nick: 'OTRO1', role: 'MIEMBRO', status: 'ACTIVE', perf_status: 'VERDE', avg_tokens: 100, weeks_evaluated: 1 },
          { id: 'uuid-2', user_id: 20, email: 'otro2@ffaa.py', nick: 'OTRO2', role: 'MIEMBRO', status: 'ACTIVE', perf_status: 'VERDE', avg_tokens: 200, weeks_evaluated: 1 }
        ],
        error: null
      },
      performances: { data: [], error: null }
    });

    // El usuario actual NO está en la lista (user_id=999)
    const { req, res, next } = createMocks({
      user_id: 999,
      id: 'uuid-nonexistent',
      email: 'fantasma@ffaa.py',
      nick: 'FANTASMA',
      role: 'MIEMBRO'
    });

    await getSummary(req, res, next);

    // DEBE responder 200 (NO 500) — este era el bug HALL-067
    expect(res.json).toHaveBeenCalledTimes(1);
    expect(next).not.toHaveBeenCalled();

    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);

    // userStats.avg_tokens debe ser 0 (currentProfile = null)
    expect(payload.userStats.avg_tokens).toBe(0);

    // perf_status debe caer al fallback del user
    expect(payload.userStats.perf_status).toBe('VERDE');
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Test 4: Sin evento activo
  // ───────────────────────────────────────────────────────────────────────────
  it('devuelve currentEvent = null y eventType = null cuando no hay eventos', async () => {
    setMockResponses({
      events: { data: [], error: null },
      users: { data: [], error: null },
      performances: { data: [], error: null }
    });

    const { req, res, next } = createMocks();
    await getSummary(req, res, next);

    const payload = res.json.mock.calls[0][0];
    expect(payload.currentEvent).toBeNull();
    expect(payload.eventType).toBeNull();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Test 5: Con evento activo
  // ───────────────────────────────────────────────────────────────────────────
  it('expone eventType = SQUADRON cuando hay evento activo', async () => {
    const evento = {
      id: 'event-uuid-1',
      type: 'SQUADRON',
      name: 'Squadron Event 2026-W39',
      status: 'OPEN',
      start_date: '2026-09-24T12:00:00Z',
      end_date: '2026-09-28T11:59:59Z'
    };

    setMockResponses({
      events: { data: [evento], error: null },
      users: { data: [], error: null },
      performances: { data: [], error: null }
    });

    const { req, res, next } = createMocks();
    await getSummary(req, res, next);

    const payload = res.json.mock.calls[0][0];
    expect(payload.currentEvent).not.toBeNull();
    expect(payload.currentEvent.id).toBe('event-uuid-1');
    expect(payload.eventType).toBe('SQUADRON');
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Test 6: Cálculo correcto de squadStats
  // ───────────────────────────────────────────────────────────────────────────
  it('calcula squadStats correctamente (avg_tokens, pilots_without_load)', async () => {
    // 3 usuarios activos: 100, 200, 0 (sin carga)
    setMockResponses({
      events: { data: [], error: null },
      users: {
        data: [
          { id: 'uuid-1', user_id: 10, email: 'u1@ffaa.py', nick: 'U1', role: 'MIEMBRO', status: 'ACTIVE', perf_status: 'VERDE', avg_tokens: 0, weeks_evaluated: 0 },
          { id: 'uuid-2', user_id: 20, email: 'u2@ffaa.py', nick: 'U2', role: 'MIEMBRO', status: 'ACTIVE', perf_status: 'VERDE', avg_tokens: 0, weeks_evaluated: 0 },
          { id: 'uuid-3', user_id: 30, email: 'u3@ffaa.py', nick: 'U3', role: 'MIEMBRO', status: 'ACTIVE', perf_status: 'VERDE', avg_tokens: 0, weeks_evaluated: 0 }
        ],
        error: null
      },
      performances: {
        data: [
          { user_id: 10, tokens: 100, nick: 'U1' },
          { user_id: 20, tokens: 200, nick: 'U2' }
          // U3 no tiene performance → avg = 0
        ],
        error: null
      }
    });

    const { req, res, next } = createMocks();
    await getSummary(req, res, next);

    const payload = res.json.mock.calls[0][0];

    // 3 miembros activos
    expect(payload.squadStats.active_members).toBe(3);
    expect(payload.squadStats.total_members).toBe(3);

    // avgSquad = (100 + 200 + 0) / 3 = 100
    expect(payload.squadStats.avg_tokens).toBe(100);

    // 1 piloto sin carga (U3)
    expect(payload.squadStats.pilots_without_load).toBe(1);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Test 7: Supabase null (degradación elegante)
  // ───────────────────────────────────────────────────────────────────────────
  it('maneja supabase = null sin lanzar error', async () => {
    // Re-mockear getSupabase para devolver null
    const { getSupabase } = await import('../../src/db/supabase.js');
    getSupabase.mockReturnValueOnce(null);

    const { req, res, next } = createMocks();
    await getSummary(req, res, next);

    expect(res.json).toHaveBeenCalledTimes(1);
    const payload = res.json.mock.calls[0][0];

    // Estructura vacía pero válida
    expect(payload.success).toBe(true);
    expect(payload.currentEvent).toBeNull();
    expect(payload.eventType).toBeNull();
    expect(payload.squadStats.active_members).toBe(0);
    expect(payload.squadStats.meta_tokens_sq).toBe(175);
    expect(payload.squadStats.pilots_without_load).toBe(0);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Test 8: topPilots ordenados por avg_tokens descendente
  // ───────────────────────────────────────────────────────────────────────────
  it('ordena topPilots por avg_tokens descendente y limita a 5', async () => {
    setMockResponses({
      events: { data: [], error: null },
      users: {
        data: [
          { id: 'uuid-1', user_id: 1, email: 'p1@ffaa.py', nick: 'P1', role: 'MIEMBRO', status: 'ACTIVE', perf_status: 'VERDE', avg_tokens: 0, weeks_evaluated: 0 },
          { id: 'uuid-2', user_id: 2, email: 'p2@ffaa.py', nick: 'P2', role: 'MIEMBRO', status: 'ACTIVE', perf_status: 'VERDE', avg_tokens: 0, weeks_evaluated: 0 },
          { id: 'uuid-3', user_id: 3, email: 'p3@ffaa.py', nick: 'P3', role: 'MIEMBRO', status: 'ACTIVE', perf_status: 'VERDE', avg_tokens: 0, weeks_evaluated: 0 },
          { id: 'uuid-4', user_id: 4, email: 'p4@ffaa.py', nick: 'P4', role: 'MIEMBRO', status: 'ACTIVE', perf_status: 'VERDE', avg_tokens: 0, weeks_evaluated: 0 },
          { id: 'uuid-5', user_id: 5, email: 'p5@ffaa.py', nick: 'P5', role: 'MIEMBRO', status: 'ACTIVE', perf_status: 'VERDE', avg_tokens: 0, weeks_evaluated: 0 },
          { id: 'uuid-6', user_id: 6, email: 'p6@ffaa.py', nick: 'P6', role: 'MIEMBRO', status: 'ACTIVE', perf_status: 'VERDE', avg_tokens: 0, weeks_evaluated: 0 }
        ],
        error: null
      },
      performances: {
        data: [
          { user_id: 1, tokens: 100, nick: 'P1' },
          { user_id: 2, tokens: 300, nick: 'P2' },
          { user_id: 3, tokens: 200, nick: 'P3' },
          { user_id: 4, tokens: 500, nick: 'P4' },
          { user_id: 5, tokens: 400, nick: 'P5' },
          { user_id: 6, tokens: 50,  nick: 'P6' }
        ],
        error: null
      }
    });

    const { req, res, next } = createMocks();
    await getSummary(req, res, next);

    const payload = res.json.mock.calls[0][0];

    // Debe tener exactamente 5 (top 5)
    expect(payload.topPilots.length).toBe(5);

    // Orden descendente por avg_tokens: 500, 400, 300, 200, 100
    expect(payload.topPilots[0].avg_tokens).toBe(500);
    expect(payload.topPilots[1].avg_tokens).toBe(400);
    expect(payload.topPilots[2].avg_tokens).toBe(300);
    expect(payload.topPilots[3].avg_tokens).toBe(200);
    expect(payload.topPilots[4].avg_tokens).toBe(100);
  });
});
`;

// ─────────────────────────────────────────────────────────────────────────────
// EJECUCIÓN
// ─────────────────────────────────────────────────────────────────────────────

console.log('============================================================');
console.log('  PARAGUAY-FFAA | METALSTORM');
console.log('  Generador de tests: dashboard.controller.test.js');
console.log('============================================================');

// Crear carpeta si no existe
const dir = path.dirname(TARGET);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
  console.log('  + Carpeta creada: ' + dir);
}

// Backup si existe
if (fs.existsSync(TARGET)) {
  fs.copyFileSync(TARGET, BACKUP);
  console.log('  + Backup creado: ' + path.basename(BACKUP));
}

// Escribir el archivo
fs.writeFileSync(TARGET, CONTENT, 'utf8');
console.log('  + Archivo creado: ' + path.relative(ROOT, TARGET));
console.log('');
console.log('Proximos pasos:');
console.log('  1. Ejecutar: npm test -- dashboard.controller');
console.log('  2. Verificar que los 8 tests pasan.');
console.log('  3. Si todo OK: git add tests/ scripts/ && git commit');
console.log('');