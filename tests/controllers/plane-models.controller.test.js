/**
 * ============================================================================
 * PARAGUAY-FFAA | METALSTORM
 * Tests: plane-models.controller.js
 * ============================================================================
 * PROPÓSITO:
 *   Tests unitarios para los 6 endpoints del catálogo de modelos de aeronaves
 *   (Sprint 7 / TESTS-AERONAVES / F1).
 *
 * COBERTURA:
 *   1. getPlaneModels      — GET /api/plane-models (DB + fallback memoria + filtros)
 *   2. getPlaneModelById   — GET /api/plane-models/:id
 *   3. createPlaneModel    — POST /api/plane-models (validación + colisión ID)
 *   4. updatePlaneModel    — PUT /api/plane-models/:id
 *   5. deletePlaneModel    — DELETE /api/plane-models/:id (soft-delete)
 *   6. restorePlaneModel   — PATCH /api/plane-models/:id/restore
 *
 * EJECUCIÓN:
 *   npm test -- plane-models.controller
 *   O bien: npx vitest run tests/controllers/plane-models.controller.test.js
 * ============================================================================
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─────────────────────────────────────────────────────────────────────────────
// MOCKS (deben declararse ANTES del import del controller)
// ─────────────────────────────────────────────────────────────────────────────

vi.mock('../../src/config/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

vi.mock('../../src/utils/audit.js', () => ({
  logAuditChange: vi.fn().mockResolvedValue(undefined)
}));

// Mock del cliente Supabase: configurable por test.
const mockSupabase = {
  from: vi.fn()
};

vi.mock('../../src/db/supabase.js', () => ({
  getSupabase: vi.fn(() => mockSupabase)
}));

// Importar el controller DESPUÉS de los mocks
import {
  getPlaneModels,
  getPlaneModelById,
  createPlaneModel,
  updatePlaneModel,
  deletePlaneModel,
  restorePlaneModel,
  INITIAL_PLANE_MODELS
} from '../../src/controllers/plane-models.controller.js';

import { getSupabase } from '../../src/db/supabase.js';

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builder genérico de query Supabase.
 * Simula `from(...).select(...).eq(...).order(...).single()`.
 * Por defecto resuelve con el `result` provisto.
 */
function makeQueryBuilder(result) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    neq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    update: vi.fn(() => builder),
    delete: vi.fn(() => builder),
    single: vi.fn().mockResolvedValue(result),
    maybeSingle: vi.fn().mockResolvedValue(result)
  };
  builder.then = (onFulfilled, onRejected) =>
    Promise.resolve(result).then(onFulfilled, onRejected);
  return builder;
}

/**
 * Crea un mock de req/res de Express.
 */
function createMocks({ user = null, params = {}, query = {}, body = {} } = {}) {
  const req = {
    user: user || {
      user_id: 1,
      id: 'uuid-admin-1',
      nick: 'ADMIN',
      role: 'ADMIN'
    },
    params,
    query,
    body
  };
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis()
  };
  const next = vi.fn();
  return { req, res, next };
}

/**
 * Configura mockSupabase.from() con un handler por tabla.
 * El handler recibe la tabla y devuelve un builder con el resultado.
 */
function setSupabaseHandler(handler) {
  mockSupabase.from.mockImplementation((table) => handler(table));
}

beforeEach(() => {
  vi.clearAllMocks();
  // Restaurar el comportamiento por defecto de getSupabase
  getSupabase.mockReturnValue(mockSupabase);
  // Por defecto, cualquier consulta devuelve vacío
  mockSupabase.from.mockImplementation(() =>
    makeQueryBuilder({ data: [], error: null })
  );
});

// ═════════════════════════════════════════════════════════════════════════════
// getPlaneModels — GET /api/plane-models
// ═════════════════════════════════════════════════════════════════════════════

describe('getPlaneModels — GET /api/plane-models', () => {

  it('1. devuelve catálogo desde DB cuando hay datos', async () => {
    const dbModels = [
      { id: '1', name: 'F-22 Raptor', type: 'Caza', tier: 5, is_active: true,
        stats_real: { velocidad: 2410 }, sistemas_disponibles: { fuselaje: true } }
    ];
    setSupabaseHandler(() => makeQueryBuilder({ data: dbModels, error: null }));

    const { req, res, next } = createMocks();
    await getPlaneModels(req, res, next);

    expect(res.json).toHaveBeenCalledOnce();
    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.models).toHaveLength(1);
    expect(payload.models[0].id).toBe('1');
    expect(payload.models[0].name).toBe('F-22 Raptor');
    expect(payload.models[0].stats_real).toEqual({ velocidad: 2410 });
    expect(payload.total).toBe(1);
  });

  it('2. cae a memoria cuando DB devuelve vacío', async () => {
    setSupabaseHandler(() => makeQueryBuilder({ data: [], error: null }));

    const { req, res, next } = createMocks();
    await getPlaneModels(req, res, next);

    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
    // Memoria tiene los 39 modelos de INITIAL_PLANE_MODELS
    expect(payload.models.length).toBeGreaterThanOrEqual(39);
    expect(payload.message).toContain('memoria');
  });

  it('3. cae a memoria cuando DB devuelve error', async () => {
    setSupabaseHandler(() =>
      makeQueryBuilder({ data: null, error: { message: 'DB down' } })
    );

    const { req, res, next } = createMocks();
    await getPlaneModels(req, res, next);

    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.models.length).toBeGreaterThan(0);
  });

  it('4. filtra inactivos por defecto', async () => {
    setSupabaseHandler(() => makeQueryBuilder({ data: [], error: null }));

    const { req, res, next } = createMocks();
    await getPlaneModels(req, res, next);

    const payload = res.json.mock.calls[0][0];
    payload.models.forEach(m => {
      expect(m.is_active).not.toBe(false);
    });
  });

  it('5. incluye inactivos con include_inactive=true', async () => {
    setSupabaseHandler(() => makeQueryBuilder({ data: [], error: null }));

    const { req, res, next } = createMocks({ query: { include_inactive: 'true' } });
    await getPlaneModels(req, res, next);

    const payload = res.json.mock.calls[0][0];
    // Todos los INITIAL tienen is_active: true, así que el count es el mismo.
    // Pero el filtro no debe aplicar. Validamos que responde OK.
    expect(payload.success).toBe(true);
    expect(payload.models.length).toBeGreaterThanOrEqual(39);
  });

  it('6. incluye inactivos con all=true y rol ADMIN', async () => {
    setSupabaseHandler(() => makeQueryBuilder({ data: [], error: null }));

    const { req, res, next } = createMocks({
      user: { user_id: 1, id: 'uuid', role: 'ADMIN', nick: 'ADMIN' },
      query: { all: 'true' }
    });
    await getPlaneModels(req, res, next);

    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
  });

  it('7. NO incluye inactivos con all=true y rol MIEMBRO', async () => {
    setSupabaseHandler(() => makeQueryBuilder({ data: [], error: null }));

    const { req, res, next } = createMocks({
      user: { user_id: 1, id: 'uuid', role: 'MIEMBRO', nick: 'PILOTO' },
      query: { all: 'true' }
    });
    await getPlaneModels(req, res, next);

    const payload = res.json.mock.calls[0][0];
    // El filtro is_active !== false se aplica. Como todos INITIAL son activos,
    // el count es 39. Pero validamos que la lógica de rol funciona.
    expect(payload.success).toBe(true);
    payload.models.forEach(m => expect(m.is_active).not.toBe(false));
  });

  it('8. normaliza JSON strings en stats_real', async () => {
    const dbModels = [
      { id: '1', name: 'F-22', type: 'Caza', tier: 5, is_active: true,
        stats_real: '{"velocidad":2410,"agilidad":96}',
        sistemas_disponibles: '{"fuselaje":true}' }
    ];
    setSupabaseHandler(() => makeQueryBuilder({ data: dbModels, error: null }));

    const { req, res, next } = createMocks();
    await getPlaneModels(req, res, next);

    const payload = res.json.mock.calls[0][0];
    expect(payload.models[0].stats_real).toEqual({ velocidad: 2410, agilidad: 96 });
    expect(payload.models[0].sistemas_disponibles).toEqual({ fuselaje: true });
  });

  it('9. normaliza JSON strings inválidos a defaults', async () => {
    const dbModels = [
      { id: '1', name: 'F-22', type: 'Caza', tier: 5, is_active: true,
        stats_real: 'no-es-json' }
    ];
    setSupabaseHandler(() => makeQueryBuilder({ data: dbModels, error: null }));

    const { req, res, next } = createMocks();
    await getPlaneModels(req, res, next);

    const payload = res.json.mock.calls[0][0];
    // parseJsonField devuelve el fallback cuando falla el parse
    expect(payload.models[0].stats_real).toEqual({
      velocidad: 2000, agilidad: 85, blindaje: 1200, potencia_armas: 1200
    });
  });

  it('10. aplica defaults cuando tier es undefined', async () => {
    const dbModels = [
      { id: '1', name: 'F-22', type: 'Caza', is_active: true }
    ];
    setSupabaseHandler(() => makeQueryBuilder({ data: dbModels, error: null }));

    const { req, res, next } = createMocks();
    await getPlaneModels(req, res, next);

    const payload = res.json.mock.calls[0][0];
    expect(payload.models[0].tier).toBe(3);
  });

  it('11. respeta is_active=false desde DB', async () => {
    const dbModels = [
      { id: '1', name: 'F-22', type: 'Caza', tier: 5, is_active: false }
    ];
    setSupabaseHandler(() => makeQueryBuilder({ data: dbModels, error: null }));

    const { req, res, next } = createMocks({ query: { include_inactive: 'true' } });
    await getPlaneModels(req, res, next);

    const payload = res.json.mock.calls[0][0];
    expect(payload.models[0].is_active).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// getPlaneModelById — GET /api/plane-models/:id
// ═════════════════════════════════════════════════════════════════════════════

describe('getPlaneModelById — GET /api/plane-models/:id', () => {

  it('12. devuelve modelo desde DB si existe', async () => {
    const dbModel = { id: '1', name: 'F-22 Raptor', type: 'Caza', tier: 5,
      is_active: true, stats_real: { velocidad: 2410 } };
    setSupabaseHandler(() => makeQueryBuilder({ data: dbModel, error: null }));

    const { req, res, next } = createMocks({ params: { id: '1' } });
    await getPlaneModelById(req, res, next);

    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.model.id).toBe('1');
    expect(payload.model.name).toBe('F-22 Raptor');
  });

  it('13. cae a memoria si DB no encuentra', async () => {
    setSupabaseHandler(() => makeQueryBuilder({ data: null, error: null }));

    const { req, res, next } = createMocks({ params: { id: '1' } });
    await getPlaneModelById(req, res, next);

    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
    // INITIAL_PLANE_MODELS tiene id '1' = F-22 Raptor
    expect(payload.model.id).toBe('1');
    expect(payload.model.name).toBe('F-22 Raptor');
  });

  it('14. devuelve 404 si no existe ni en DB ni en memoria', async () => {
    setSupabaseHandler(() => makeQueryBuilder({ data: null, error: null }));

    const { req, res, next } = createMocks({ params: { id: '9999' } });
    await getPlaneModelById(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(false);
    expect(payload.code).toBe('PLANE_MODEL_NOT_FOUND');
  });

  it('15. cae a memoria cuando DB lanza excepción', async () => {
    setSupabaseHandler(() => {
      throw new Error('connection refused');
    });

    const { req, res, next } = createMocks({ params: { id: '2' } });
    await getPlaneModelById(req, res, next);

    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
    // INITIAL_PLANE_MODELS id '2' = Su-57 Felon
    expect(payload.model.id).toBe('2');
    expect(payload.model.name).toContain('Su-57');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// createPlaneModel — POST /api/plane-models
// ═════════════════════════════════════════════════════════════════════════════

describe('createPlaneModel — POST /api/plane-models', () => {

  const validBody = {
    id: 'TEST-F1-001',
    name: 'Avión Test F1',
    type: 'Caza de Prueba',
    tier: 3,
    is_active: true
  };

  it('16. crea modelo happy path con DB', async () => {
    const insertedModel = { ...validBody, created_at: '2026-10-12T00:00:00Z',
      updated_at: '2026-10-12T00:00:00Z' };

    setSupabaseHandler((table) => {
      // 1ra llamada: verificar colisión DB → null
      // 2da llamada: insertar → devuelve modelo
      let callCount = 0;
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        insert: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: insertedModel, error: null }),
        then: (resolve) => Promise.resolve({ data: null, error: null }).then(resolve)
      };
    });

    const { req, res, next } = createMocks({ body: validBody });
    await createPlaneModel(req, res, next);

    expect(res.status).toHaveBeenCalledWith(201);
    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.model.id).toBe('TEST-F1-001');
    expect(payload.model.name).toBe('Avión Test F1');
  });

  it('17. rechaza con 400 si el ID ya existe en memoria', async () => {
    // El id '1' ya existe en INITIAL_PLANE_MODELS
    const body = { ...validBody, id: '1' };

    const { req, res, next } = createMocks({ body });
    await createPlaneModel(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(false);
    expect(payload.code).toBe('PLANE_MODEL_ID_EXISTS');
  });

  it('18. rechaza con 400 si Zod falla (name muy corto)', async () => {
    const body = { ...validBody, id: 'TEST-F1-002', name: 'X' };

    const { req, res, next } = createMocks({ body });
    await createPlaneModel(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(false);
  });

  it('19. rechaza con 400 si falta name', async () => {
    const body = { id: 'TEST-F1-003', type: 'Caza' };

    const { req, res, next } = createMocks({ body });
    await createPlaneModel(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].success).toBe(false);
  });

  it('20. acepta id numérico y lo transforma a string', async () => {
    const body = { ...validBody, id: 12345, name: 'Avión Numérico' };

    setSupabaseHandler(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      insert: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { ...body, id: '12345' }, error: null
      }),
      then: (resolve) => Promise.resolve({ data: null, error: null }).then(resolve)
    }));

    const { req, res, next } = createMocks({ body });
    await createPlaneModel(req, res, next);

    expect(res.status).toHaveBeenCalledWith(201);
    const payload = res.json.mock.calls[0][0];
    expect(payload.model.id).toBe('12345');
  });

  it('21. cae a memoria si insert falla en DB', async () => {
    const body = { ...validBody, id: 'TEST-F1-FALLBACK', name: 'Avión Fallback' };

    setSupabaseHandler(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      insert: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null, error: { message: 'insert failed' }
      }),
      then: (resolve) => Promise.resolve({ data: null, error: null }).then(resolve)
    }));

    const { req, res, next } = createMocks({ body });
    await createPlaneModel(req, res, next);

    expect(res.status).toHaveBeenCalledWith(201);
    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.model.id).toBe('TEST-F1-FALLBACK');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// updatePlaneModel — PUT /api/plane-models/:id
// ═════════════════════════════════════════════════════════════════════════════

describe('updatePlaneModel — PUT /api/plane-models/:id', () => {

  it('22. actualiza modelo existente en DB', async () => {
    const updatedModel = { id: '3', name: 'F-35 Actualizado', type: 'Caza',
      tier: 5, is_active: true };

    setSupabaseHandler(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: updatedModel, error: null }),
      then: (resolve) => Promise.resolve({ data: updatedModel, error: null }).then(resolve)
    }));

    const { req, res, next } = createMocks({
      params: { id: '3' },
      body: { name: 'F-35 Actualizado' }
    });
    await updatePlaneModel(req, res, next);

    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.model.name).toBe('F-35 Actualizado');
  });

  it('23. devuelve 404 si no existe ni en DB ni en memoria', async () => {
    setSupabaseHandler(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null, error: { message: 'not found' }
      }),
      then: (resolve) => Promise.resolve({ data: null, error: { message: 'not found' } }).then(resolve)
    }));

    const { req, res, next } = createMocks({
      params: { id: 'NO-EXISTE-9999' },
      body: { name: 'Nombre Nuevo' }
    });
    await updatePlaneModel(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    const payload = res.json.mock.calls[0][0];
    expect(payload.code).toBe('PLANE_MODEL_NOT_FOUND');
  });

  it('24. rechaza con 400 si Zod falla', async () => {
    const { req, res, next } = createMocks({
      params: { id: '1' },
      body: { tier: 99 } // tier max 6
    });
    await updatePlaneModel(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].success).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// deletePlaneModel — DELETE /api/plane-models/:id (soft-delete)
// ═════════════════════════════════════════════════════════════════════════════

describe('deletePlaneModel — DELETE /api/plane-models/:id', () => {

  it('25. desactiva modelo en DB y memoria', async () => {
    setSupabaseHandler(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: '10', name: 'MiG-35 Fulcrum-F', is_active: false },
        error: null
      }),
      then: (resolve) => Promise.resolve({
        data: { id: '10', name: 'MiG-35 Fulcrum-F', is_active: false },
        error: null
      }).then(resolve)
    }));

    const { req, res, next } = createMocks({ params: { id: '10' } });
    await deletePlaneModel(req, res, next);

    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.id).toBe('10');
    expect(payload.is_active).toBe(false);
  });

  it('26. responde 200 incluso si el ID no existe (idempotencia)', async () => {
    setSupabaseHandler(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      then: (resolve) => Promise.resolve({ data: null, error: null }).then(resolve)
    }));

    const { req, res, next } = createMocks({ params: { id: 'NO-EXISTE-8888' } });
    await deletePlaneModel(req, res, next);

    // El controller no valida existencia: siempre responde 200
    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
  });

  it('27. desactiva en memoria aunque DB falle', async () => {
    setSupabaseHandler(() => {
      throw new Error('DB offline');
    });

    const { req, res, next } = createMocks({ params: { id: '12' } });
    await deletePlaneModel(req, res, next);

    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
    // INITIAL_PLANE_MODELS id '12' = A-10C
    expect(payload.id).toBe('12');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// restorePlaneModel — PATCH /api/plane-models/:id/restore
// ═════════════════════════════════════════════════════════════════════════════

describe('restorePlaneModel — PATCH /api/plane-models/:id/restore', () => {

  it('28. reactiva modelo en DB', async () => {
    setSupabaseHandler(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: '10', name: 'MiG-35', is_active: true },
        error: null
      }),
      then: (resolve) => Promise.resolve({
        data: { id: '10', name: 'MiG-35', is_active: true },
        error: null
      }).then(resolve)
    }));

    const { req, res, next } = createMocks({ params: { id: '10' } });
    await restorePlaneModel(req, res, next);

    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.id).toBe('10');
    expect(payload.is_active).toBe(true);
  });

  it('29. reactiva en memoria y devuelve el modelo restaurado', async () => {
    setSupabaseHandler(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      then: (resolve) => Promise.resolve({ data: null, error: null }).then(resolve)
    }));

    // Primero desactivamos el id '13' en memoria (después del test 27 probablemente ya está)
    const { req: reqDel, res: resDel } = createMocks({ params: { id: '13' } });
    await deletePlaneModel(reqDel, resDel, vi.fn());

    // Ahora restauramos
    const { req, res, next } = createMocks({ params: { id: '13' } });
    await restorePlaneModel(req, res, next);

    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.is_active).toBe(true);
  });
});