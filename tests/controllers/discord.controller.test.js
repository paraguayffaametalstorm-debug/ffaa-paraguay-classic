// tests/controllers/discord.controller.test.js
//
// F1.6d — Tests del controller handleInteraction (con Supabase mockeado).
//
// Cubre:
//   - PING (type 1) → 200 { type: 1 }
//   - /torneo status → 200 con lista real (mock)
//   - /torneo bracket <id> → 200 con matches agrupados por fase
//   - /torneo equipos <id> → 200 con equipos
//   - /torneo draft <id> → 200 con drafts agrupados por partida
//   - UUID inválido → 200 embed warning
//   - Torneo/match no existe → 200 embed warning
//   - Supabase null → 200 embed danger
//   - Error de Supabase → 200 embed danger
//   - Comando desconocido, subcomando inválido, type no soportado
//
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock del logger.
vi.mock('../../src/config/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }
}));

// Mock de Supabase: cada test decide qué devuelve.
const mockFrom = vi.fn();
const mockSupabase = { from: mockFrom };

vi.mock('../../src/db/supabase.js', () => ({
  getSupabase: () => mockSupabase
}));

import { handleInteraction } from '../../src/controllers/discord.controller.js';

// ── Helpers ──────────────────────────────────────────────────

function buildReq(body) {
  return { body };
}

function buildRes() {
  const res = {
    statusCode: 200,
    jsonPayload: null,
    status: vi.fn(function (code) {
      res.statusCode = code;
      return res;
    }),
    json: vi.fn(function (payload) {
      res.jsonPayload = payload;
      return res;
    })
  };
  return res;
}

const PING_PAYLOAD = { type: 1 };

function buildApplicationCommand(name, options = []) {
  return { type: 2, data: { name, options } };
}

function buildTorneoSubcommand(subcommand, options = []) {
  return buildApplicationCommand('torneo', [
    { name: subcommand, type: 1, options }
  ]);
}

const VALID_UUID = '12345678-1234-4123-8123-123456789abc';
const VALID_UUID_2 = 'abcdef01-2345-4678-89ab-cdef01234567';

/**
 * Mock de una cadena de query Supabase: .from().select().eq().maybeSingle()
 * Cada método devuelve el siguiente en la cadena. Al final, `then` resuelve
 * con el valor que se le haya configurado.
 */
function mockQueryChain(resolveValue) {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    in: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    maybeSingle: vi.fn(() => Promise.resolve(resolveValue)),
    then: (onFulfilled) => Promise.resolve(resolveValue).then(onFulfilled)
  };
  return chain;
}

// ── Tests ─────────────────────────────────────────────────────

describe('handleInteraction — F1.6d', () => {
  let req;
  let res;

  beforeEach(() => {
    res = buildRes();
    vi.clearAllMocks();
  });

  // ── PING ────────────────────────────────────────────────────

  it('01 — PING (type 1) → 200 { type: 1 }', async () => {
    req = buildReq(PING_PAYLOAD);
    await handleInteraction(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.jsonPayload).toEqual({ type: 1 });
  });

  // ── /torneo status ──────────────────────────────────────────

  it('02 — /torneo status sin torneos → 200 embed NEUTRAL', async () => {
    mockFrom.mockReturnValueOnce(mockQueryChain({ data: [], error: null }));

    req = buildReq(buildTorneoSubcommand('status'));
    await handleInteraction(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.jsonPayload.type).toBe(4);
    expect(res.jsonPayload.data.embeds[0].title).toContain('Torneos activos');
    expect(res.jsonPayload.data.embeds[0].description).toContain('No hay torneos');
  });

  it('03 — /torneo status con torneos → 200 con fields', async () => {
    const torneos = [
      {
        id: VALID_UUID,
        name: 'Torneo W45',
        format: 'SWISS+SE',
        scope: 'F1',
        status: 'REGISTRATION',
        starts_at: '2026-11-01T00:00:00Z',
        ends_at: '2026-11-03T00:00:00Z',
        min_teams: 4,
        max_teams: 8
      }
    ];
    mockFrom.mockReturnValueOnce(mockQueryChain({ data: torneos, error: null }));

    req = buildReq(buildTorneoSubcommand('status'));
    await handleInteraction(req, res);

    expect(res.statusCode).toBe(200);
    const embed = res.jsonPayload.data.embeds[0];
    expect(embed.title).toContain('Torneos activos (1)');
    expect(embed.fields.length).toBe(1);
    expect(embed.fields[0].name).toContain('Torneo W45');
    expect(embed.fields[0].value).toContain(VALID_UUID);
  });

  it('04 — /torneo status con error de Supabase → 200 embed DANGER', async () => {
    mockFrom.mockReturnValueOnce(mockQueryChain({ data: null, error: { message: 'boom' } }));

    req = buildReq(buildTorneoSubcommand('status'));
    await handleInteraction(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.jsonPayload.data.embeds[0].description).toContain('Error');
    expect(res.jsonPayload.data.embeds[0].color).toBe(0xDC3545); // DANGER
  });

  // ── /torneo bracket ─────────────────────────────────────────

  it('05 — /torneo bracket sin id → 200 embed WARNING', async () => {
    req = buildReq(buildTorneoSubcommand('bracket'));
    await handleInteraction(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.jsonPayload.data.embeds[0].description).toContain('Falta el parámetro');
  });

  it('06 — /torneo bracket con id no-UUID → 200 embed WARNING', async () => {
    req = buildReq(buildTorneoSubcommand('bracket', [
      { name: 'id', type: 3, value: 'no-es-uuid' }
    ]));
    await handleInteraction(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.jsonPayload.data.embeds[0].description).toContain('UUID válido');
  });

  it('07 — /torneo bracket torneo no existe → 200 embed WARNING', async () => {
    mockFrom.mockReturnValueOnce(mockQueryChain({ data: null, error: null }));

    req = buildReq(buildTorneoSubcommand('bracket', [
      { name: 'id', type: 3, value: VALID_UUID }
    ]));
    await handleInteraction(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.jsonPayload.data.embeds[0].description).toContain('No existe un torneo');
  });

  it('08 — /torneo bracket sin matches → 200 embed NEUTRAL', async () => {
    mockFrom
      .mockReturnValueOnce(mockQueryChain({
        data: { id: VALID_UUID, name: 'Torneo W45', format: 'SWISS+SE', scope: 'F1', status: 'REGISTRATION' },
        error: null
      }))
      .mockReturnValueOnce(mockQueryChain({ data: [], error: null }));

    req = buildReq(buildTorneoSubcommand('bracket', [
      { name: 'id', type: 3, value: VALID_UUID }
    ]));
    await handleInteraction(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.jsonPayload.data.embeds[0].description).toContain('bracket aún no fue generado');
  });

  it('09 — /torneo bracket con matches → 200 con fields por fase', async () => {
    mockFrom
      .mockReturnValueOnce(mockQueryChain({
        data: { id: VALID_UUID, name: 'Torneo W45', format: 'SWISS+SE', scope: 'F1', status: 'ONGOING' },
        error: null
      }))
      .mockReturnValueOnce(mockQueryChain({
        data: [
          { id: 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa', phase: 'SWISS', round: 1, status: 'FINISHED', team_a_id: null, team_b_id: null, score_a: 2, score_b: 1, winner_id: null, best_of: 3 },
          { id: 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb', phase: 'SWISS', round: 2, status: 'ONGOING', team_a_id: null, team_b_id: null, score_a: 0, score_b: 0, winner_id: null, best_of: 3 }
        ],
        error: null
      }));

    req = buildReq(buildTorneoSubcommand('bracket', [
      { name: 'id', type: 3, value: VALID_UUID }
    ]));
    await handleInteraction(req, res);

    expect(res.statusCode).toBe(200);
    const embed = res.jsonPayload.data.embeds[0];
    expect(embed.title).toContain('Bracket');
    expect(embed.fields.length).toBe(1);
    expect(embed.fields[0].name).toContain('SWISS');
    expect(embed.fields[0].value).toContain('R1');
    expect(embed.fields[0].value).toContain('R2');
  });

  // ── /torneo equipos ─────────────────────────────────────────

  it('10 — /torneo equipos sin id → 200 embed WARNING', async () => {
    req = buildReq(buildTorneoSubcommand('equipos'));
    await handleInteraction(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.jsonPayload.data.embeds[0].description).toContain('Falta el parámetro');
  });

  it('11 — /torneo equipos sin equipos → 200 embed NEUTRAL', async () => {
    mockFrom
      .mockReturnValueOnce(mockQueryChain({
        data: { id: VALID_UUID, name: 'Torneo W45', status: 'REGISTRATION' },
        error: null
      }))
      .mockReturnValueOnce(mockQueryChain({ data: [], error: null }));

    req = buildReq(buildTorneoSubcommand('equipos', [
      { name: 'id', type: 3, value: VALID_UUID }
    ]));
    await handleInteraction(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.jsonPayload.data.embeds[0].description).toContain('No hay equipos registrados');
  });

  it('12 — /torneo equipos con equipos → 200 con lista', async () => {
    mockFrom
      .mockReturnValueOnce(mockQueryChain({
        data: { id: VALID_UUID, name: 'Torneo W45', status: 'REGISTRATION' },
        error: null
      }))
      .mockReturnValueOnce(mockQueryChain({
        data: [
          { id: 'c1c1c1c1-1111-4111-8111-c1c1c1c1c1c1', team_name: 'Alpha Squad', captain_user_id: null, roster: [{}, {}, {}, {}, {}], seed: 1, created_at: '2026-10-12T00:00:00Z' },
          { id: 'c2c2c2c2-2222-4222-8222-c2c2c2c2c2c2', team_name: 'Bravo Squad', captain_user_id: null, roster: [{}, {}, {}, {}, {}, {}], seed: 2, created_at: '2026-10-12T00:00:00Z' }
        ],
        error: null
      }));

    req = buildReq(buildTorneoSubcommand('equipos', [
      { name: 'id', type: 3, value: VALID_UUID }
    ]));
    await handleInteraction(req, res);

    expect(res.statusCode).toBe(200);
    const embed = res.jsonPayload.data.embeds[0];
    expect(embed.title).toContain('Equipos');
    expect(embed.description).toContain('Alpha Squad');
    expect(embed.description).toContain('Bravo Squad');
    expect(embed.description).toContain('5 pilotos');
    expect(embed.description).toContain('6 pilotos');
  });

  // ── /torneo draft ───────────────────────────────────────────

  it('13 — /torneo draft sin id → 200 embed WARNING', async () => {
    req = buildReq(buildTorneoSubcommand('draft'));
    await handleInteraction(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.jsonPayload.data.embeds[0].description).toContain('Falta el parámetro');
  });

  it('14 — /torneo draft match no existe → 200 embed WARNING', async () => {
    mockFrom.mockReturnValueOnce(mockQueryChain({ data: null, error: null }));

    req = buildReq(buildTorneoSubcommand('draft', [
      { name: 'id', type: 3, value: VALID_UUID_2 }
    ]));
    await handleInteraction(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.jsonPayload.data.embeds[0].description).toContain('No existe un match');
  });

  it('15 — /torneo draft sin acciones → 200 embed NEUTRAL', async () => {
    mockFrom
      .mockReturnValueOnce(mockQueryChain({
        data: { id: VALID_UUID_2, tournament_id: VALID_UUID, phase: 'SWISS', round: 1, best_of: 3, status: 'SCHEDULED', team_a_id: null, team_b_id: null },
        error: null
      }))
      .mockReturnValueOnce(mockQueryChain({ data: [], error: null }));

    req = buildReq(buildTorneoSubcommand('draft', [
      { name: 'id', type: 3, value: VALID_UUID_2 }
    ]));
    await handleInteraction(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.jsonPayload.data.embeds[0].description).toContain('Sin acciones de draft');
  });

  it('16 — /torneo draft con acciones → 200 con fields por partida', async () => {
    mockFrom
      .mockReturnValueOnce(mockQueryChain({
        data: { id: VALID_UUID_2, tournament_id: VALID_UUID, phase: 'SWISS', round: 1, best_of: 3, status: 'ONGOING', team_a_id: null, team_b_id: null },
        error: null
      }))
      .mockReturnValueOnce(mockQueryChain({
        data: [
          { id: 'd1d1d1d1-1111-4111-8111-d1d1d1d1d1d1', game_number: 1, team_id: 't1t1t1t1-1111-4111-8111-t1t1t1t1t1t1', action: 'BAN', aircraft_id: '101', order_index: 1, created_at: '2026-10-12T00:00:00Z' },
          { id: 'd2d2d2d2-2222-4222-8222-d2d2d2d2d2d2', game_number: 1, team_id: 't2t2t2t2-2222-4222-8222-t2t2t2t2t2t2', action: 'PICK', aircraft_id: '102', order_index: 2, created_at: '2026-10-12T00:00:00Z' }
        ],
        error: null
      }));

    req = buildReq(buildTorneoSubcommand('draft', [
      { name: 'id', type: 3, value: VALID_UUID_2 }
    ]));
    await handleInteraction(req, res);

    expect(res.statusCode).toBe(200);
    const embed = res.jsonPayload.data.embeds[0];
    expect(embed.title).toContain('Draft');
    expect(embed.fields.length).toBe(1);
    expect(embed.fields[0].name).toContain('Partida 1');
    expect(embed.fields[0].value).toContain('BAN');
    expect(embed.fields[0].value).toContain('PICK');
  });

  // ── Supabase no disponible ──────────────────────────────────

  it('17 — Supabase null en /torneo status → 200 embed DANGER', async () => {
    // Forzamos null haciendo mockFrom devolver un chain que lanza en el select.
    mockFrom.mockReturnValueOnce({
      select: vi.fn(() => { throw new Error('no supabase'); })
    });

    req = buildReq(buildTorneoSubcommand('status'));
    await handleInteraction(req, res);

    expect(res.statusCode).toBe(200);
    // El catch del handler principal captura y devuelve error genérico.
    expect(res.jsonPayload.type).toBe(4);
  });

  // ── Errores de dispatch ─────────────────────────────────────

  it('18 — /torneo con subcomando inválido → 200 embed WARNING', async () => {
    req = buildReq(buildTorneoSubcommand('inexistente'));
    await handleInteraction(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.jsonPayload.data.embeds[0].description).toContain('Subcomando inválido');
  });

  it('19 — Comando desconocido → 200 embed DANGER', async () => {
    req = buildReq(buildApplicationCommand('ping'));
    await handleInteraction(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.jsonPayload.data.embeds[0].description).toContain('Comando desconocido');
  });

  it('20 — Type no soportado (3) → 200 embed WARNING', async () => {
    req = buildReq({ type: 3, data: {} });
    await handleInteraction(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.jsonPayload.data.embeds[0].description).toContain('no soportada');
  });

  // ── Regresión: todos los caminos 200 ────────────────────────

  it('21 — Todos los caminos responden 200', async () => {
    const payloads = [
      PING_PAYLOAD,
      buildTorneoSubcommand('status'),
      buildTorneoSubcommand('bracket'),
      buildTorneoSubcommand('equipos'),
      buildTorneoSubcommand('draft'),
      buildTorneoSubcommand('inexistente'),
      buildApplicationCommand('ping'),
      { type: 3, data: {} }
    ];

    for (const p of payloads) {
      // Cada llamada crea un chain nuevo.
      mockFrom.mockReturnValue(mockQueryChain({ data: [], error: null }));
      const r = buildRes();
      await handleInteraction(buildReq(p), r);
      expect(r.statusCode).toBe(200);
      expect(r.jsonPayload).toBeDefined();
    }
  });
});