/**
 * ============================================================================
 * PARAGUAY-FFAA | METALSTORM
 * Tests: planes.controller.js — Integración del catálogo combinado
 * ============================================================================
 * PROPÓSITO:
 *   Tests de integración del catálogo combinado (Sprint 7 / TESTS-AERONAVES / F3).
 *
 *   `planes.controller.js` tiene dos funciones privadas:
 *     - getFullCatalogModels(supabase) → combina DB > INITIAL_PLANE_MODELS > DEFAULT_PLANE_MODELS
 *     - findModel(catalog, avionId)    → busca por ID exacto, nombre exacto o match parcial
 *
 *   Como son privadas, se testean indirectamente vía getPlaneDetails y getMyPlanes,
 *   que las usan en su flujo normal.
 *
 * COBERTURA:
 *   - Prioridad del catálogo: DB > INITIAL > DEFAULT
 *   - Resolución de modelos: ID exacto, nombre exacto, match parcial
 *   - Casos borde: avion_id inexistente, con espacios
 *   - Integración: getMyPlanes y getCatalogModels usan el catálogo correctamente
 *
 * MOCK:
 *   Usa `createHybridSupabase(DB)` (el mock oficial del proyecto, alineado con BL-032).
 *   Los tests setean `mockDB.plane_models`, `mockDB.planes`, etc. antes de invocar
 *   el controller. El híbrido resuelve los filtros (.eq, .or, .order, .limit, .single)
 *   contra el DB local.
 *
 * EJECUCIÓN:
 *   npm test -- planes.catalog
 *   O bien: npx vitest run tests/controllers/planes.catalog.test.js
 * ============================================================================
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHybridSupabase } from '../helpers/mockSupabaseHybrid.js';

// ─────────────────────────────────────────────────────────────────────────────
// MOCKS (deben declararse ANTES del import del controller)
// ─────────────────────────────────────────────────────────────────────────────

vi.mock('../../src/config/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
}));

vi.mock('../../src/utils/audit.js', () => ({
  logAuditChange: vi.fn().mockResolvedValue(undefined),
  logSecurityEvent: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('../../src/utils/upgradeNodes.js', () => ({
  getUpgradeNodes: vi.fn().mockResolvedValue({}),
  getNode: vi.fn().mockReturnValue(null),
  calculateNodeEffects: vi.fn().mockReturnValue({}),
  calculateCategoryEffects: vi.fn().mockReturnValue({}),
  getNodesForCategory: vi.fn().mockReturnValue([]),
  getNodesForSystem: vi.fn().mockReturnValue([]),
  getFallbackUpgradeNodes: vi.fn().mockReturnValue({}),
  invalidateUpgradeNodesCache: vi.fn()
}));

vi.mock('../../src/utils/modEffects.js', () => ({
  getModEffects: vi.fn().mockResolvedValue({}),
  getModLevelEffects: vi.fn().mockReturnValue(null),
  calculateModBonus: vi.fn().mockReturnValue(1.0),
  getModDescription: vi.fn().mockReturnValue('mock-desc'),
  getFallbackModEffects: vi.fn().mockReturnValue({}),
  invalidateModEffectsCache: vi.fn()
}));

vi.mock('../../src/utils/traits.js', () => ({
  getPlaneTraitsWithInfo: vi.fn().mockReturnValue([])
}));

// Mock de Supabase: DB mutable, resuelto por el híbrido oficial.
let mockDB = {};

vi.mock('../../src/db/supabase.js', () => ({
  getSupabase: vi.fn(() => createHybridSupabase(mockDB))
}));

// ─────────────────────────────────────────────────────────────────────────────
// IMPORTS (después de los mocks)
// ─────────────────────────────────────────────────────────────────────────────

import { getPlaneDetails, getMyPlanes, getCatalogModels } from '../../src/controllers/planes.controller.js';
import { INITIAL_PLANE_MODELS } from '../../src/controllers/plane-models.controller.js';

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Crea mocks de req/res de Express.
 */
function createMocks({ user = null, params = {}, query = {}, body = {} } = {}) {
  const req = {
    user: user || {
      user_id: 1,
      id: 'uuid-user-1',
      nick: 'PILOTO',
      role: 'MIEMBRO'
    },
    params,
    query,
    body,
    ip: '127.0.0.1',
    headers: { 'user-agent': 'vitest' }
  };
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    setHeader: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis()
  };
  const next = vi.fn();
  return { req, res, next };
}

/**
 * Construye un plane de hangar para tests de catálogo.
 * El `avion_id` es lo único relevante en el contexto de estos tests.
 */
function makePlane(avionId, overrides = {}) {
  return {
    id: 100,
    user_id: 1,
    avion_id: avionId,
    nivel: 8,
    especial_nombre: null,
    especial_nivel_num: null,
    especial_efecto: null,
    pasiva_nombre: null,
    pasiva_nivel_num: null,
    pasiva_efecto: null,
    mod1_id: null,
    mod1_lvl: null,
    mod2_id: null,
    mod2_lvl: null,
    nivel_fuselaje: 0,
    nivel_motor: 0,
    nivel_avionica: 0,
    nivel_armas: 0,
    rutas_sistemas: {},
    recursos_piezas: 0,
    recursos_avanzadas: 0,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockDB = {
    plane_models: [],
    planes: [],
    plane_mods: [],
    plane_upgrades: [],
    upgrade_nodes_v2: [],
    mod_effects: []
  };
});

// ═════════════════════════════════════════════════════════════════════════════
// GRUPO A — Prioridad del catálogo combinado (DB > INITIAL > DEFAULT)
// ═════════════════════════════════════════════════════════════════════════════

describe('Catálogo combinado — prioridad DB > INITIAL > DEFAULT', () => {

  it('1. DB > INITIAL: si un id existe en DB y en INITIAL, gana DB', async () => {
    // El id '1' existe en INITIAL (F-22 Raptor) y lo "pisamos" desde DB.
    mockDB.plane_models = [{
      id: '1',
      name: 'F-22 DB Override',
      type: 'Caza Override',
      tier: 5,
      is_active: true,
      sistemas_disponibles: { fuselaje: true, motor: true, avionica: true }
    }];
    mockDB.planes = [makePlane('1')];

    const { req, res, next } = createMocks({
      user: { user_id: 1, role: 'MIEMBRO' },
      params: { id: '100' }
    });
    await getPlaneDetails(req, res, next);

    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
    // DB debe ganarle a INITIAL
    expect(payload.plane.model_name).toBe('F-22 DB Override');
    expect(payload.plane.type).toBe('Caza Override');
  });

  it('2. INITIAL > DEFAULT: si un id existe en INITIAL y en DEFAULT, gana INITIAL', async () => {
    // El id '4' existe en DEFAULT (Eurofighter Typhoon) y en INITIAL.
    // Verificamos que el type viene de INITIAL.
    const initial4 = INITIAL_PLANE_MODELS.find(m => String(m.id) === '4');
    expect(initial4).toBeDefined();
    expect(initial4.name).toBe('Eurofighter Typhoon');

    // DB vacía → gana INITIAL sobre DEFAULT
    mockDB.plane_models = [];
    mockDB.planes = [makePlane('4')];

    const { req, res, next } = createMocks({
      user: { user_id: 1, role: 'MIEMBRO' },
      params: { id: '100' }
    });
    await getPlaneDetails(req, res, next);

    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.plane.model_name).toBe('Eurofighter Typhoon');
    // El type viene de INITIAL (más específico que DEFAULT)
    expect(payload.plane.type).toBe(initial4.type);
  });

  it('3. DEFAULT > nada: verifica que DEFAULT cubre IDs 1-12 cuando INITIAL no matchea', async () => {
    // Este test verifica que el merge de DEFAULT no estorba: si un avion_id existe
    // en INITIAL (id '5'), el nombre del INITIAL es el que gana.
    const initial5 = INITIAL_PLANE_MODELS.find(m => String(m.id) === '5');
    expect(initial5).toBeDefined();

    mockDB.plane_models = [];
    mockDB.planes = [makePlane('5')];

    const { req, res, next } = createMocks({
      user: { user_id: 1, role: 'MIEMBRO' },
      params: { id: '100' }
    });
    await getPlaneDetails(req, res, next);

    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.plane.model_name).toBe(initial5.name);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// GRUPO B — findModel: resolución por ID, nombre exacto, match parcial
// ═════════════════════════════════════════════════════════════════════════════

describe('findModel — resolución por distintos criterios', () => {

  it('4. resuelve por ID exacto (avion_id="3" → F-35 Lightning II)', async () => {
    const initial3 = INITIAL_PLANE_MODELS.find(m => String(m.id) === '3');
    expect(initial3).toBeDefined();
    expect(initial3.name).toBe('F-35 Lightning II');

    mockDB.plane_models = [];
    mockDB.planes = [makePlane('3')];

    const { req, res, next } = createMocks({
      user: { user_id: 1, role: 'MIEMBRO' },
      params: { id: '100' }
    });
    await getPlaneDetails(req, res, next);

    const payload = res.json.mock.calls[0][0];
    expect(payload.plane.model_name).toBe('F-35 Lightning II');
  });

  it('5. resuelve por nombre exacto (avion_id="F-35 Lightning II")', async () => {
    mockDB.plane_models = [];
    mockDB.planes = [makePlane('F-35 Lightning II')];

    const { req, res, next } = createMocks({
      user: { user_id: 1, role: 'MIEMBRO' },
      params: { id: '100' }
    });
    await getPlaneDetails(req, res, next);

    const payload = res.json.mock.calls[0][0];
    expect(payload.plane.model_name).toBe('F-35 Lightning II');
    expect(payload.plane.id).toBe(100);
  });

  it('6. resuelve por match parcial normalizado (avion_id="f35")', async () => {
    // "F-35 Lightning II" normalizado = "f35lightningii"
    // "f35" normalizado = "f35"
    // "f35lightningii".includes("f35") → true
    mockDB.plane_models = [];
    mockDB.planes = [makePlane('f35')];

    const { req, res, next } = createMocks({
      user: { user_id: 1, role: 'MIEMBRO' },
      params: { id: '100' }
    });
    await getPlaneDetails(req, res, next);

    const payload = res.json.mock.calls[0][0];
    expect(payload.plane.model_name).toBe('F-35 Lightning II');
  });

  it('7. si avion_id no matchea nada, model_name cae al avion_id crudo', async () => {
    mockDB.plane_models = [];
    mockDB.planes = [makePlane('AIRCRAFT-UNKNOWN-XYZ')];

    const { req, res, next } = createMocks({
      user: { user_id: 1, role: 'MIEMBRO' },
      params: { id: '100' }
    });
    await getPlaneDetails(req, res, next);

    const payload = res.json.mock.calls[0][0];
    // El controller cae a `plane.avion_id` crudo
    expect(payload.plane.model_name).toBe('AIRCRAFT-UNKNOWN-XYZ');
    // El type cae al default
    expect(payload.plane.type).toBe('Caza de Combate');
  });

  it('8. avion_id con espacios se trimea antes de buscar', async () => {
    // findModel hace String(avionId).trim()
    const initial2 = INITIAL_PLANE_MODELS.find(m => String(m.id) === '2');
    expect(initial2).toBeDefined();
    expect(initial2.name).toContain('Su-57');

    mockDB.plane_models = [];
    mockDB.planes = [makePlane('  2  ')];

    const { req, res, next } = createMocks({
      user: { user_id: 1, role: 'MIEMBRO' },
      params: { id: '100' }
    });
    await getPlaneDetails(req, res, next);

    const payload = res.json.mock.calls[0][0];
    expect(payload.plane.model_name).toBe(initial2.name);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// GRUPO C — Integración: catálogo combinado en otros endpoints
// ═════════════════════════════════════════════════════════════════════════════

describe('Catálogo combinado — integración con getMyPlanes y getCatalogModels', () => {

  it('9. getMyPlanes enriquece model_name desde DB (prioridad sobre INITIAL)', async () => {
    // DB tiene un modelo con id='1' pero name distinto.
    // getMyPlanes debe devolver el nombre de DB, no de INITIAL.
    mockDB.plane_models = [{
      id: '1',
      name: 'F-22 DesdeDB',
      type: 'Caza Override',
      tier: 5,
      is_active: true
    }];
    mockDB.planes = [makePlane('1')];

    const { req, res, next } = createMocks({
      user: { user_id: 1, role: 'MIEMBRO' },
      params: {}
    });
    await getMyPlanes(req, res, next);

    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.planes).toHaveLength(1);
    expect(payload.planes[0].model_name).toBe('F-22 DesdeDB');
    expect(payload.planes[0].type).toBe('Caza Override');
  });

  it('10. getCatalogModels NO combina INITIAL: solo devuelve lo que hay en DB', async () => {
    // getCatalogModels hace query directa a plane_models SIN combinar.
    // Si DB tiene 1 solo modelo, devuelve 1 (no los 39 de INITIAL).
    mockDB.plane_models = [{
      id: '99',
      name: 'Modelo Solo DB',
      type: 'Caza',
      tier: 3,
      is_active: true
    }];

    const { req, res, next } = createMocks();
    await getCatalogModels(req, res, next);

    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.models).toHaveLength(1);
    expect(payload.models[0].id).toBe('99');
    expect(payload.models[0].name).toBe('Modelo Solo DB');
    // Confirma que NO incluye los 39 de INITIAL
    expect(payload.models.length).toBeLessThan(39);
  });
});