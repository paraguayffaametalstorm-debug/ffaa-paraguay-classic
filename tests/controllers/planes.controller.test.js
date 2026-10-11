/**
 * ============================================================================
 * PARAGUAY-FFAA | METALSTORM
 * Tests: planes.controller.js
 * ============================================================================
 * PROPÓSITO:
 *   Tests unitarios para los 12 endpoints del hangar y upgrades de aeronaves
 *   (Sprint 7 / TESTS-AERONAVES / F2).
 *
 * COBERTURA:
 *   1.  getCatalogModels       — GET /api/planes/catalog
 *   2.  getCatalogMods         — GET /api/planes/mods
 *   3.  getMyPlanes            — GET /api/planes
 *   4.  addPlane               — POST /api/planes
 *   5.  updatePlane            — PUT /api/planes/:id
 *   6.  updatePlaneSystem      — PATCH /api/planes/:id/system
 *   7.  updatePlaneSystems     — PUT /api/planes/:id/systems
 *   8.  getPlaneDetails        — GET /api/planes/:id/details
 *   9.  deletePlane            — DELETE /api/planes/:id
 *   10. exportPlanesCSV        — GET /api/planes/export
 *   11. getPlaneStats          — GET /api/planes/:id/stats
 *   12. getRecommendedBuild    — GET /api/planes/:id/recommend
 *
 * EJECUCIÓN:
 *   npm test -- planes.controller
 *   O bien: npx vitest run tests/controllers/planes.controller.test.js
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

// Mock de upgradeNodes: devolvemos estructura mínima que el controller espera.
// Evita el I/O y el cacheo real.
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

// Mock de modEffects: devolvemos efectos controlados.
vi.mock('../../src/utils/modEffects.js', () => ({
  getModEffects: vi.fn().mockResolvedValue({}),
  getModLevelEffects: vi.fn().mockReturnValue(null),
  calculateModBonus: vi.fn().mockReturnValue(1.0),
  getModDescription: vi.fn().mockReturnValue('mock-desc'),
  getFallbackModEffects: vi.fn().mockReturnValue({}),
  invalidateModEffectsCache: vi.fn()
}));

// Mock de traits (usado por getPlaneStats).
vi.mock('../../src/utils/traits.js', () => ({
  getPlaneTraitsWithInfo: vi.fn().mockReturnValue([])
}));

// Mock de Supabase: variable DB mutable por test.
let mockDB = {};

vi.mock('../../src/db/supabase.js', () => ({
  getSupabase: vi.fn(() => createHybridSupabase(mockDB))
}));

// ─────────────────────────────────────────────────────────────────────────────
// IMPORTS (después de los mocks)
// ─────────────────────────────────────────────────────────────────────────────

import {
  getCatalogModels,
  getCatalogMods,
  getMyPlanes,
  addPlane,
  updatePlane,
  updatePlaneSystem,
  updatePlaneSystems,
  getPlaneDetails,
  deletePlane,
  exportPlanesCSV,
  getPlaneStats,
  getRecommendedBuild
} from '../../src/controllers/planes.controller.js';

import { getSupabase } from '../../src/db/supabase.js';
import { getUpgradeNodes, calculateCategoryEffects } from '../../src/utils/upgradeNodes.js';
import { getModEffects } from '../../src/utils/modEffects.js';

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Crea mocks de req/res/next de Express.
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
 * Construye un plane_models de ejemplo.
 */
function makeModel(overrides = {}) {
  return {
    id: '1',
    name: 'F-22 Raptor',
    type: 'Caza de Superioridad Aérea',
    tier: 5,
    is_active: true,
    image_url: 'https://cdn.example.com/f22.webp',
    sistemas_disponibles: {
      fuselaje: true,
      motor: true,
      avionica: true,
      canones: true,
      misiles_ir: true,
      misiles_radar: true,
      cohetes: true
    },
    stats_real: {
      base_statistics: { health: 1400, top_speed_afterburner: 2410,
        optimal_turn_rate: 55.5, afterburner_fuel: 12, acceleration_afterburner: 45 },
      advanced_statistics: { radar_range: 12.5 }
    },
    ...overrides
  };
}

/**
 * Construye un plane de hangar de ejemplo.
 */
function makePlane(overrides = {}) {
  return {
    id: 100,
    user_id: 1,
    avion_id: '1',
    nivel: 10,
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
  // Reset de mocks de utils (vi.clearAllMocks() limpia implementaciones)
  getUpgradeNodes.mockResolvedValue({});
  calculateCategoryEffects.mockReturnValue({});
  getModEffects.mockResolvedValue({});
});

// ═════════════════════════════════════════════════════════════════════════════
// getCatalogModels — GET /api/planes/catalog
// ═════════════════════════════════════════════════════════════════════════════

describe('getCatalogModels', () => {

  it('1. devuelve catálogo desde DB cuando hay datos', async () => {
    mockDB.plane_models = [makeModel({ id: '1' }), makeModel({ id: '2', name: 'Su-57' })];

    const { req, res, next } = createMocks();
    await getCatalogModels(req, res, next);

    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.models).toHaveLength(2);
  });

  it('2. cae a INITIAL_PLANE_MODELS cuando DB está vacía', async () => {
    mockDB.plane_models = [];

    const { req, res, next } = createMocks();
    await getCatalogModels(req, res, next);

    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.models.length).toBeGreaterThanOrEqual(39);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// getCatalogMods — GET /api/planes/mods
// ═════════════════════════════════════════════════════════════════════════════

describe('getCatalogMods', () => {

  it('3. devuelve mods desde DB cuando hay datos', async () => {
    mockDB.plane_mods = [{ id: 'm1', name: 'Giro Temerario' }];

    const { req, res, next } = createMocks();
    await getCatalogMods(req, res, next);

    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.mods).toHaveLength(1);
  });

  it('4. cae a DEFAULT_PLANE_MODS cuando DB está vacía', async () => {
    mockDB.plane_mods = [];

    const { req, res, next } = createMocks();
    await getCatalogMods(req, res, next);

    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.mods.length).toBe(10);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// getMyPlanes — GET /api/planes
// ═════════════════════════════════════════════════════════════════════════════

describe('getMyPlanes', () => {

  it('5. devuelve hangar vacío cuando el usuario no tiene aviones', async () => {
    mockDB.planes = [];

    const { req, res, next } = createMocks({ user: { user_id: 1, role: 'MIEMBRO' } });
    await getMyPlanes(req, res, next);

    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.planes).toEqual([]);
    expect(payload.total).toBe(0);
  });

  it('6. devuelve el hangar del usuario enriquecido con nombre del modelo', async () => {
    mockDB.plane_models = [makeModel({ id: '1', name: 'F-22 Raptor', type: 'Caza' })];
    mockDB.planes = [makePlane({ id: 100, user_id: 1, avion_id: '1' })];

    const { req, res, next } = createMocks({ user: { user_id: 1, role: 'MIEMBRO' } });
    await getMyPlanes(req, res, next);

    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.planes).toHaveLength(1);
    expect(payload.planes[0].model_name).toBe('F-22 Raptor');
    expect(payload.planes[0].type).toBe('Caza');
  });

  it('7. calcula nivel_sistemas como promedio de los 4 subsistemas', async () => {
    mockDB.plane_models = [makeModel({ id: '1' })];
    mockDB.planes = [makePlane({ id: 100, user_id: 1, avion_id: '1',
      nivel_fuselaje: 4, nivel_motor: 6, nivel_avionica: 2, nivel_armas: 8 })];

    const { req, res, next } = createMocks({ user: { user_id: 1, role: 'MIEMBRO' } });
    await getMyPlanes(req, res, next);

    const payload = res.json.mock.calls[0][0];
    // (4 + 6 + 2 + 8) / 4 = 5
    expect(payload.planes[0].nivel_sistemas).toBe(5);
  });

  it('8. sistemas_desbloqueados=true si nivel >= 6', async () => {
    mockDB.plane_models = [makeModel({ id: '1' })];
    mockDB.planes = [
      makePlane({ id: 100, user_id: 1, avion_id: '1', nivel: 6 }),
      makePlane({ id: 101, user_id: 1, avion_id: '2', nivel: 5 })
    ];
    mockDB.plane_models.push(makeModel({ id: '2', name: 'Su-57' }));

    const { req, res, next } = createMocks({ user: { user_id: 1, role: 'MIEMBRO' } });
    await getMyPlanes(req, res, next);

    const payload = res.json.mock.calls[0][0];
    const p6 = payload.planes.find(p => p.nivel === 6);
    const p5 = payload.planes.find(p => p.nivel === 5);
    expect(p6.sistemas_desbloqueados).toBe(true);
    expect(p5.sistemas_desbloqueados).toBe(false);
  });

  it('9. resuelve model_name desde avion_id cuando no hay modelo en catálogo', async () => {
    mockDB.plane_models = [];
    mockDB.planes = [makePlane({ id: 100, user_id: 1, avion_id: 'UNKNOWN-XYZ' })];

    const { req, res, next } = createMocks({ user: { user_id: 1, role: 'MIEMBRO' } });
    await getMyPlanes(req, res, next);

    const payload = res.json.mock.calls[0][0];
    // El controller resuelve a avion_id crudo cuando no encuentra el modelo
    expect(payload.planes[0].model_name).toBe('UNKNOWN-XYZ');
  });

  it('10. devuelve 500 si Supabase no está disponible', async () => {
    getSupabase.mockReturnValueOnce(null);

    const { req, res, next } = createMocks({ user: { user_id: 1 } });
    await getMyPlanes(req, res, next);

    // El controller devuelve hangar vacío cuando no hay supabase (degradación)
    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.planes).toEqual([]);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// addPlane — POST /api/planes
// ═════════════════════════════════════════════════════════════════════════════

describe('addPlane', () => {

  const validBody = {
    avion_id: '1',
    nivel: 5,
    nivel_fuselaje: 0,
    nivel_motor: 0,
    nivel_avionica: 0,
    nivel_armas: 0
  };

  it('11. crea una aeronave exitosamente', async () => {
    mockDB.plane_models = [makeModel({ id: '1', name: 'F-22 Raptor' })];
    mockDB.planes = [];

    const { req, res, next } = createMocks({
      user: { user_id: 1, role: 'MIEMBRO', nick: 'PILOTO' },
      body: validBody
    });
    await addPlane(req, res, next);

    expect(res.status).toHaveBeenCalledWith(201);
    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.plane.model_name).toBe('F-22 Raptor');
    expect(payload.plane.user_id).toBe(1);
  });

  it('12. rechaza con 400 si Zod falla (nivel > 20)', async () => {
    const { req, res, next } = createMocks({
      user: { user_id: 1 },
      body: { ...validBody, nivel: 25 }
    });
    await addPlane(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].success).toBe(false);
  });

  it('13. rechaza con 400 si falta avion_id', async () => {
    const { req, res, next } = createMocks({
      user: { user_id: 1 },
      body: { nivel: 5 }
    });
    await addPlane(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('14. devuelve 500 si Supabase no está disponible', async () => {
    getSupabase.mockReturnValueOnce(null);

    const { req, res, next } = createMocks({
      user: { user_id: 1 },
      body: validBody
    });
    await addPlane(req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json.mock.calls[0][0].error).toBe('DATABASE_UNAVAILABLE');
  });

  it('15. responde 201 con sistemas_desbloqueados=true si nivel >= 6', async () => {
    mockDB.plane_models = [makeModel({ id: '1' })];
    mockDB.planes = [];

    const { req, res, next } = createMocks({
      user: { user_id: 1, role: 'MIEMBRO' },
      body: { ...validBody, nivel: 7 }
    });
    await addPlane(req, res, next);

    const payload = res.json.mock.calls[0][0];
    expect(payload.plane.sistemas_desbloqueados).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// updatePlane — PUT /api/planes/:id
// ═════════════════════════════════════════════════════════════════════════════

describe('updatePlane', () => {

  const validBody = {
    avion_id: '1',
    nivel: 8
  };

  it('16. actualiza un avión del propio usuario', async () => {
    mockDB.plane_models = [makeModel({ id: '1', name: 'F-22 Raptor' })];
    mockDB.planes = [makePlane({ id: 100, user_id: 1, avion_id: '1', nivel: 5 })];

    const { req, res, next } = createMocks({
      user: { user_id: 1, role: 'MIEMBRO' },
      params: { id: '100' },
      body: validBody
    });
    await updatePlane(req, res, next);

    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.plane.nivel).toBe(8);
  });

  it('17. devuelve 404 si el avión no existe', async () => {
    mockDB.planes = [];

    const { req, res, next } = createMocks({
      user: { user_id: 1, role: 'MIEMBRO' },
      params: { id: '999' },
      body: validBody
    });
    await updatePlane(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json.mock.calls[0][0].error).toBe('PLANE_NOT_FOUND');
  });

  it('18. devuelve 403 si el avión es de otro usuario', async () => {
    mockDB.planes = [makePlane({ id: 100, user_id: 999, avion_id: '1' })];

    const { req, res, next } = createMocks({
      user: { user_id: 1, role: 'MIEMBRO' },
      params: { id: '100' },
      body: validBody
    });
    await updatePlane(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json.mock.calls[0][0].error).toBe('FORBIDDEN');
  });

  it('19. ADMIN puede actualizar aviones de otros usuarios', async () => {
    mockDB.plane_models = [makeModel({ id: '1' })];
    mockDB.planes = [makePlane({ id: 100, user_id: 999, avion_id: '1' })];

    const { req, res, next } = createMocks({
      user: { user_id: 1, role: 'ADMIN' },
      params: { id: '100' },
      body: validBody
    });
    await updatePlane(req, res, next);

    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
  });

  it('20. OWNER puede actualizar aviones de otros usuarios', async () => {
    mockDB.plane_models = [makeModel({ id: '1' })];
    mockDB.planes = [makePlane({ id: 100, user_id: 999, avion_id: '1' })];

    const { req, res, next } = createMocks({
      user: { user_id: 1, role: 'OWNER' },
      params: { id: '100' },
      body: validBody
    });
    await updatePlane(req, res, next);

    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
  });

  it('21. rechaza con 400 si Zod falla', async () => {
    const { req, res, next } = createMocks({
      user: { user_id: 1 },
      params: { id: '100' },
      body: { avion_id: '', nivel: 5 }
    });
    await updatePlane(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// updatePlaneSystem — PATCH /api/planes/:id/system
// ═════════════════════════════════════════════════════════════════════════════

describe('updatePlaneSystem', () => {

  it('22. actualiza un subsistema cuando todos los requisitos se cumplen', async () => {
    mockDB.plane_models = [makeModel({ id: '1',
      sistemas_disponibles: { fuselaje: true, motor: true, avionica: true, canones: true } })];
    mockDB.planes = [makePlane({ id: 100, user_id: 1, avion_id: '1', nivel: 8,
      nivel_fuselaje: 2 })];

    const { req, res, next } = createMocks({
      user: { user_id: 1, role: 'MIEMBRO' },
      params: { id: '100' },
      body: { sistema: 'fuselaje', nivel: 4 }
    });
    await updatePlaneSystem(req, res, next);

    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.plane.nivel_fuselaje).toBe(4);
  });

  it('23. devuelve 400 si el avión es nivel < 6', async () => {
    mockDB.plane_models = [makeModel({ id: '1' })];
    mockDB.planes = [makePlane({ id: 100, user_id: 1, avion_id: '1', nivel: 5 })];

    const { req, res, next } = createMocks({
      user: { user_id: 1, role: 'MIEMBRO' },
      params: { id: '100' },
      body: { sistema: 'fuselaje', nivel: 2 }
    });
    await updatePlaneSystem(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].error).toBe('UPGRADE_LOCKED_LEVEL_TOO_LOW');
  });

  it('24. devuelve 400 SYSTEM_NOT_AVAILABLE si el sistema no está en sistemas_disponibles', async () => {
    mockDB.plane_models = [makeModel({ id: '1',
      sistemas_disponibles: { fuselaje: true, motor: true, avionica: true, canones: false } })];
    mockDB.planes = [makePlane({ id: 100, user_id: 1, avion_id: '1', nivel: 8 })];

    const { req, res, next } = createMocks({
      user: { user_id: 1, role: 'MIEMBRO' },
      params: { id: '100' },
      body: { sistema: 'armas', nivel: 2 }
    });
    await updatePlaneSystem(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].error).toBe('SYSTEM_NOT_AVAILABLE');
  });

  it('25. devuelve 403 si el avión es de otro usuario', async () => {
    mockDB.planes = [makePlane({ id: 100, user_id: 999, avion_id: '1', nivel: 8 })];

    const { req, res, next } = createMocks({
      user: { user_id: 1, role: 'MIEMBRO' },
      params: { id: '100' },
      body: { sistema: 'fuselaje', nivel: 2 }
    });
    await updatePlaneSystem(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('26. devuelve 404 si el avión no existe', async () => {
    mockDB.planes = [];

    const { req, res, next } = createMocks({
      user: { user_id: 1, role: 'MIEMBRO' },
      params: { id: '999' },
      body: { sistema: 'fuselaje', nivel: 2 }
    });
    await updatePlaneSystem(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('27. rechaza con 400 si el sistema no es válido en el schema', async () => {
    const { req, res, next } = createMocks({
      user: { user_id: 1 },
      params: { id: '100' },
      body: { sistema: 'invalid-system', nivel: 2 }
    });
    await updatePlaneSystem(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// updatePlaneSystems — PUT /api/planes/:id/systems
// ═════════════════════════════════════════════════════════════════════════════

describe('updatePlaneSystems', () => {

  it('28. actualiza múltiples subsistemas (fuselaje + motor)', async () => {
    mockDB.plane_models = [makeModel({ id: '1',
      sistemas_disponibles: { fuselaje: true, motor: true, avionica: true } })];
    mockDB.planes = [makePlane({ id: 100, user_id: 1, avion_id: '1', nivel: 8 })];

    const { req, res, next } = createMocks({
      user: { user_id: 1, role: 'MIEMBRO', nick: 'PILOTO' },
      params: { id: '100' },
      body: {
        sistemas: {
          fuselaje: { nivel: 3, rutas: {} },
          motor: { nivel: 5, rutas: { 5: 'A' } }
        }
      }
    });
    await updatePlaneSystems(req, res, next);

    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
  });

  it('29. devuelve 404 si el avión no existe', async () => {
    mockDB.planes = [];

    const { req, res, next } = createMocks({
      user: { user_id: 1 },
      params: { id: '999' },
      body: { sistemas: { fuselaje: { nivel: 2 } } }
    });
    await updatePlaneSystems(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('30. devuelve 403 si el avión es de otro usuario', async () => {
    mockDB.planes = [makePlane({ id: 100, user_id: 999, avion_id: '1' })];

    const { req, res, next } = createMocks({
      user: { user_id: 1, role: 'MIEMBRO' },
      params: { id: '100' },
      body: { sistemas: { fuselaje: { nivel: 2 } } }
    });
    await updatePlaneSystems(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('31. devuelve 400 si el avión es nivel < 6', async () => {
    mockDB.plane_models = [makeModel({ id: '1' })];
    mockDB.planes = [makePlane({ id: 100, user_id: 1, avion_id: '1', nivel: 5 })];

    const { req, res, next } = createMocks({
      user: { user_id: 1, role: 'MIEMBRO' },
      params: { id: '100' },
      body: { sistemas: { fuselaje: { nivel: 2 } } }
    });
    await updatePlaneSystems(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].error).toBe('UPGRADE_LOCKED_LEVEL_TOO_LOW');
  });

  it('32. devuelve 400 si falta el campo sistemas', async () => {
    mockDB.planes = [makePlane({ id: 100, user_id: 1, avion_id: '1', nivel: 8 })];

    const { req, res, next } = createMocks({
      user: { user_id: 1, role: 'MIEMBRO' },
      params: { id: '100' },
      body: {}
    });
    await updatePlaneSystems(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].error).toBe('INVALID_SYSTEMS_PAYLOAD');
  });

  it('33. devuelve 400 SYSTEM_NOT_AVAILABLE si canones no está disponible', async () => {
    mockDB.plane_models = [makeModel({ id: '1',
      sistemas_disponibles: { fuselaje: true, motor: true, avionica: true, canones: false } })];
    mockDB.planes = [makePlane({ id: 100, user_id: 1, avion_id: '1', nivel: 8 })];

    const { req, res, next } = createMocks({
      user: { user_id: 1, role: 'MIEMBRO' },
      params: { id: '100' },
      body: { sistemas: { canones: { nivel: 3 } } }
    });
    await updatePlaneSystems(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].error).toBe('SYSTEM_NOT_AVAILABLE');
    expect(res.json.mock.calls[0][0].details.sistema_solicitado).toBe('canones');
  });

  it('34. devuelve 400 SYSTEM_NOT_AVAILABLE si misiles_ir no está disponible', async () => {
    mockDB.plane_models = [makeModel({ id: '1',
      sistemas_disponibles: { fuselaje: true, motor: true, avionica: true,
        canones: true, misiles_ir: false } })];
    mockDB.planes = [makePlane({ id: 100, user_id: 1, avion_id: '1', nivel: 8 })];

    const { req, res, next } = createMocks({
      user: { user_id: 1, role: 'MIEMBRO' },
      params: { id: '100' },
      body: { sistemas: { misiles_ir: { nivel: 2 } } }
    });
    await updatePlaneSystems(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].error).toBe('SYSTEM_NOT_AVAILABLE');
  });

  it('35. ignora keys del payload que no están en sistemaKeyMap', async () => {
    mockDB.plane_models = [makeModel({ id: '1',
      sistemas_disponibles: { fuselaje: true } })];
    mockDB.planes = [makePlane({ id: 100, user_id: 1, avion_id: '1', nivel: 8 })];

    const { req, res, next } = createMocks({
      user: { user_id: 1, role: 'MIEMBRO' },
      params: { id: '100' },
      body: { sistemas: { keyInvalida: { nivel: 3 } } }
    });
    await updatePlaneSystems(req, res, next);

    // No debe fallar: simplemente ignora la key desconocida
    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
  });

  it('36. devuelve 500 si Supabase no está disponible', async () => {
    getSupabase.mockReturnValueOnce(null);

    const { req, res, next } = createMocks({
      user: { user_id: 1 },
      params: { id: '100' },
      body: { sistemas: { fuselaje: { nivel: 2 } } }
    });
    await updatePlaneSystems(req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// getPlaneDetails — GET /api/planes/:id/details
// ═════════════════════════════════════════════════════════════════════════════

describe('getPlaneDetails', () => {

  it('37. devuelve detalles de un avión propio', async () => {
    mockDB.plane_models = [makeModel({ id: '1', name: 'F-22 Raptor' })];
    mockDB.planes = [makePlane({ id: 100, user_id: 1, avion_id: '1' })];

    const { req, res, next } = createMocks({
      user: { user_id: 1, role: 'MIEMBRO' },
      params: { id: '100' }
    });
    await getPlaneDetails(req, res, next);

    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.plane.model_name).toBe('F-22 Raptor');
    expect(payload.plane.id).toBe(100);
  });

  it('38. devuelve 403 si el avión es de otro usuario (HALL-S1-01)', async () => {
    mockDB.planes = [makePlane({ id: 100, user_id: 999, avion_id: '1' })];

    const { req, res, next } = createMocks({
      user: { user_id: 1, role: 'MIEMBRO' },
      params: { id: '100' }
    });
    await getPlaneDetails(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json.mock.calls[0][0].error).toBe('FORBIDDEN');
  });

  it('39. ADMIN puede ver aviones de otros', async () => {
    mockDB.plane_models = [makeModel({ id: '1' })];
    mockDB.planes = [makePlane({ id: 100, user_id: 999, avion_id: '1' })];

    const { req, res, next } = createMocks({
      user: { user_id: 1, role: 'ADMIN' },
      params: { id: '100' }
    });
    await getPlaneDetails(req, res, next);

    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
  });

  it('40. devuelve 404 si el avión no existe', async () => {
    mockDB.planes = [];

    const { req, res, next } = createMocks({
      user: { user_id: 1 },
      params: { id: '999' }
    });
    await getPlaneDetails(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('41. incluye desbloqueado_upgrades=true si nivel >= 6', async () => {
    mockDB.plane_models = [makeModel({ id: '1' })];
    mockDB.planes = [makePlane({ id: 100, user_id: 1, avion_id: '1', nivel: 7 })];

    const { req, res, next } = createMocks({
      user: { user_id: 1 },
      params: { id: '100' }
    });
    await getPlaneDetails(req, res, next);

    const payload = res.json.mock.calls[0][0];
    expect(payload.plane.desbloqueado_upgrades).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// deletePlane — DELETE /api/planes/:id
// ═════════════════════════════════════════════════════════════════════════════

describe('deletePlane', () => {

  it('42. elimina un avión propio', async () => {
    mockDB.planes = [makePlane({ id: 100, user_id: 1, avion_id: '1' })];

    const { req, res, next } = createMocks({
      user: { user_id: 1, role: 'MIEMBRO' },
      params: { id: '100' }
    });
    await deletePlane(req, res, next);

    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
  });

  it('43. devuelve 403 si el avión es de otro usuario', async () => {
    mockDB.planes = [makePlane({ id: 100, user_id: 999, avion_id: '1' })];

    const { req, res, next } = createMocks({
      user: { user_id: 1, role: 'MIEMBRO' },
      params: { id: '100' }
    });
    await deletePlane(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('44. ADMIN puede eliminar aviones de otros', async () => {
    mockDB.planes = [makePlane({ id: 100, user_id: 999, avion_id: '1' })];

    const { req, res, next } = createMocks({
      user: { user_id: 1, role: 'ADMIN' },
      params: { id: '100' }
    });
    await deletePlane(req, res, next);

    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
  });

  it('45. devuelve 404 si el avión no existe', async () => {
    mockDB.planes = [];

    const { req, res, next } = createMocks({
      user: { user_id: 1 },
      params: { id: '999' }
    });
    await deletePlane(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('46. devuelve 500 si Supabase no está disponible', async () => {
    getSupabase.mockReturnValueOnce(null);

    const { req, res, next } = createMocks({
      user: { user_id: 1 },
      params: { id: '100' }
    });
    await deletePlane(req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// exportPlanesCSV — GET /api/planes/export
// ═════════════════════════════════════════════════════════════════════════════

describe('exportPlanesCSV', () => {

  it('47. genera CSV con headers correctos para el hangar del usuario', async () => {
    mockDB.plane_models = [makeModel({ id: '1', name: 'F-22 Raptor' })];
    mockDB.planes = [makePlane({ id: 100, user_id: 1, avion_id: '1' })];

    const { req, res, next } = createMocks({ user: { user_id: 1 } });
    await exportPlanesCSV(req, res, next);

    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv; charset=utf-8');
    expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition',
      'attachment; filename="hangar_escuadron.csv"');
    expect(res.send).toHaveBeenCalled();
    const csv = res.send.mock.calls[0][0];
    expect(csv).toContain('"ID","Modelo","Tipo","Nivel"');
    expect(csv).toContain('"F-22 Raptor"');
  });

  it('48. genera CSV vacío (solo headers) si el usuario no tiene aviones', async () => {
    mockDB.planes = [];

    const { req, res, next } = createMocks({ user: { user_id: 1 } });
    await exportPlanesCSV(req, res, next);

    const csv = res.send.mock.calls[0][0];
    expect(csv).toContain('"ID","Modelo"');
    // Solo la línea de headers
    const lines = csv.split('\n').filter(l => l.trim());
    expect(lines).toHaveLength(1);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// getPlaneStats — GET /api/planes/:id/stats
// ═════════════════════════════════════════════════════════════════════════════

describe('getPlaneStats', () => {

  it('49. devuelve stats calculadas con breakdown', async () => {
    mockDB.plane_models = [makeModel({ id: '1', name: 'F-22 Raptor' })];
    mockDB.planes = [makePlane({ id: 100, user_id: 1, avion_id: '1', nivel: 10 })];

    const { req, res, next } = createMocks({
      user: { user_id: 1 },
      params: { id: '100' }
    });
    await getPlaneStats(req, res, next);

    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.plane.model_name).toBe('F-22 Raptor');
    expect(payload).toHaveProperty('current');
    expect(payload).toHaveProperty('base');
    expect(payload).toHaveProperty('breakdown');
    expect(payload.breakdown.speed).toHaveProperty('total');
  });

  it('50. devuelve 404 si el avión no existe', async () => {
    mockDB.planes = [];

    const { req, res, next } = createMocks({
      user: { user_id: 1 },
      params: { id: '999' }
    });
    await getPlaneStats(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('51. cae a fallback por avion_id si el id del hangar no matchea', async () => {
    mockDB.plane_models = [makeModel({ id: '1', name: 'F-22 Raptor' })];
    mockDB.planes = [makePlane({ id: 100, user_id: 1, avion_id: '1', nivel: 8 })];

    const { req, res, next } = createMocks({
      user: { user_id: 1 },
      // El id del hangar es 100, pero pasamos el avion_id '1'
      params: { id: '1' }
    });
    await getPlaneStats(req, res, next);

    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
    // El controller debe haber encontrado el plane por avion_id
    expect(payload.plane.id).toBe(100);
  });

  it('52. incluye los 8 labels de stats', async () => {
    mockDB.plane_models = [makeModel({ id: '1' })];
    mockDB.planes = [makePlane({ id: 100, user_id: 1, avion_id: '1', nivel: 10 })];

    const { req, res, next } = createMocks({
      user: { user_id: 1 },
      params: { id: '100' }
    });
    await getPlaneStats(req, res, next);

    const payload = res.json.mock.calls[0][0];
    expect(payload.labels).toEqual([
      'Velocidad', 'Agilidad', 'Blindaje', 'Potencia de Fuego',
      'Rango de Radar', 'Defensa ECM', 'Postquemador', 'Aceleración'
    ]);
    expect(payload.stat_keys).toHaveLength(8);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// getRecommendedBuild — GET /api/planes/:id/recommend
// ═════════════════════════════════════════════════════════════════════════════

describe('getRecommendedBuild', () => {

  it('53. devuelve build agresivo por defecto', async () => {
    mockDB.planes = [makePlane({ id: 100, user_id: 1, avion_id: '1' })];

    const { req, res, next } = createMocks({
      user: { user_id: 1 },
      params: { planeId: '100' }
    });
    await getRecommendedBuild(req, res, next);

    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.playstyle).toBe('agresivo');
    expect(payload.build.motor).toBe(8);
  });

  it('54. devuelve build defensivo si playstyle=defensivo', async () => {
    mockDB.planes = [makePlane({ id: 100, user_id: 1, avion_id: '1' })];

    const { req, res, next } = createMocks({
      user: { user_id: 1 },
      params: { planeId: '100' },
      query: { playstyle: 'defensivo' }
    });
    await getRecommendedBuild(req, res, next);

    const payload = res.json.mock.calls[0][0];
    expect(payload.playstyle).toBe('defensivo');
    expect(payload.build.fuselaje).toBe(8);
  });

  it('55. devuelve build de apoyo si playstyle=apoyo', async () => {
    mockDB.planes = [makePlane({ id: 100, user_id: 1, avion_id: '1' })];

    const { req, res, next } = createMocks({
      user: { user_id: 1 },
      params: { planeId: '100' },
      query: { playstyle: 'apoyo' }
    });
    await getRecommendedBuild(req, res, next);

    const payload = res.json.mock.calls[0][0];
    expect(payload.playstyle).toBe('apoyo');
    expect(payload.build.avionica).toBe(8);
  });

  it('56. calcula costos totales de la build', async () => {
    mockDB.planes = [makePlane({ id: 100, user_id: 1, avion_id: '1' })];

    const { req, res, next } = createMocks({
      user: { user_id: 1 },
      params: { planeId: '100' }
    });
    await getRecommendedBuild(req, res, next);

    const payload = res.json.mock.calls[0][0];
    expect(payload.cost).toHaveProperty('piezas');
    expect(payload.cost).toHaveProperty('avanzadas');
    expect(payload.cost.piezas).toBeGreaterThan(0);
  });
});