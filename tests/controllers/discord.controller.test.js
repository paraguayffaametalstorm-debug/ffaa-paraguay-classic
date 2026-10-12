// tests/controllers/discord.controller.test.js
//
// F1.6d — Tests del controller handleInteraction.
//
// Cubre:
//   - PING (type 1) → 200 { type: 1 }
//   - /torneo status|bracket|equipos|draft → 200 con embed
//   - Subcomando inválido → 200 efímero con error
//   - Comando desconocido → 200 efímero con error
//   - Type no soportado → 200 efímero con error
//   - Error interno → 200 efímero con error (no dejamos colgado a Discord)
//
// Mockea el logger para no ensuciar la salida.
//
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock del logger para silenciar logs durante los tests.
vi.mock('../../src/config/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }
}));

import { handleInteraction } from '../../src/controllers/discord.controller.js';

// ── Helper: simular req/res de Express ────────────────────────

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

// ── Fixtures ──────────────────────────────────────────────────

const PING_PAYLOAD = { type: 1 };

function buildApplicationCommand(name, options = []) {
  return {
    type: 2,
    data: { name, options }
  };
}

function buildTorneoSubcommand(subcommand, options = []) {
  return buildApplicationCommand('torneo', [
    { name: subcommand, type: 1, options }
  ]);
}

// ── Tests ─────────────────────────────────────────────────────

describe('handleInteraction', () => {
  let req;
  let res;

  beforeEach(() => {
    res = buildRes();
  });

  // ── PING ────────────────────────────────────────────────────

  it('01 — PING (type 1) → 200 { type: 1 }', async () => {
    req = buildReq(PING_PAYLOAD);
    await handleInteraction(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.jsonPayload).toEqual({ type: 1 });
  });

  // ── /torneo status ──────────────────────────────────────────

  it('02 — /torneo status → 200 embed con título correcto', async () => {
    req = buildReq(buildTorneoSubcommand('status'));
    await handleInteraction(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.jsonPayload.type).toBe(4);
    expect(res.jsonPayload.data.embeds[0].title).toContain('Torneos');
  });

  // ── /torneo bracket ─────────────────────────────────────────

  it('03 — /torneo bracket <uuid> → 200 embed con id en descripción', async () => {
    const uuid = '12345678-1234-4123-8123-123456789abc';
    req = buildReq(buildTorneoSubcommand('bracket', [
      { name: 'id', type: 3, value: uuid }
    ]));
    await handleInteraction(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.jsonPayload.type).toBe(4);
    expect(res.jsonPayload.data.embeds[0].description).toContain(uuid);
  });

  it('04 — /torneo bracket sin id → 200 con aviso de parámetro faltante', async () => {
    req = buildReq(buildTorneoSubcommand('bracket'));
    await handleInteraction(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.jsonPayload.data.embeds[0].description).toContain('Falta el parámetro');
  });

  // ── /torneo equipos ─────────────────────────────────────────

  it('05 — /torneo equipos <uuid> → 200 embed con id en descripción', async () => {
    const uuid = '12345678-1234-4123-8123-123456789abc';
    req = buildReq(buildTorneoSubcommand('equipos', [
      { name: 'id', type: 3, value: uuid }
    ]));
    await handleInteraction(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.jsonPayload.type).toBe(4);
    expect(res.jsonPayload.data.embeds[0].title).toContain('Equipos');
  });

  // ── /torneo draft ───────────────────────────────────────────

  it('06 — /torneo draft <uuid> → 200 embed con título correcto', async () => {
    const uuid = '12345678-1234-4123-8123-123456789abc';
    req = buildReq(buildTorneoSubcommand('draft', [
      { name: 'id', type: 3, value: uuid }
    ]));
    await handleInteraction(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.jsonPayload.type).toBe(4);
    expect(res.jsonPayload.data.embeds[0].title).toContain('draft');
  });

  // ── Errores de dispatch ─────────────────────────────────────

  it('07 — /torneo con subcomando inválido → 200 efímero con error', async () => {
    req = buildReq(buildTorneoSubcommand('inexistente'));
    await handleInteraction(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.jsonPayload.type).toBe(4);
    expect(res.jsonPayload.data.content).toContain('Subcomando inválido');
    expect(res.jsonPayload.data.flags).toBe(64); // EPHEMERAL
  });

  it('08 — /torneo sin subcomando (options vacías) → 200 efímero con error', async () => {
    req = buildReq(buildApplicationCommand('torneo', []));
    await handleInteraction(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.jsonPayload.type).toBe(4);
    expect(res.jsonPayload.data.content).toContain('Subcomando inválido');
  });

  it('09 — Comando desconocido (ej: /ping) → 200 efímero con error', async () => {
    req = buildReq(buildApplicationCommand('ping'));
    await handleInteraction(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.jsonPayload.type).toBe(4);
    expect(res.jsonPayload.data.content).toContain('Comando desconocido');
    expect(res.jsonPayload.data.flags).toBe(64);
  });

  // ── Otros types ─────────────────────────────────────────────

  it('10 — Type no soportado (MESSAGE_COMPONENT=3) → 200 efímero con error', async () => {
    req = buildReq({ type: 3, data: {} });
    await handleInteraction(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.jsonPayload.type).toBe(4);
    expect(res.jsonPayload.data.content).toContain('no soportada');
  });

  // ── Errores internos ────────────────────────────────────────

  it('11 — Body malformado (type: 2, data: null) → 200 efímero, no crashea', async () => {
    req = buildReq({ type: 2, data: null });
    await handleInteraction(req, res);

    // No debe crashear. Debe responder algo.
    expect(res.statusCode).toBe(200);
    expect(res.jsonPayload).toBeDefined();
    expect(res.jsonPayload.type).toBe(4);
  });

  // ── Metadata de embeds ──────────────────────────────────────

  it('12 — Los embeds incluyen color, timestamp y footer institucional', async () => {
    req = buildReq(buildTorneoSubcommand('status'));
    await handleInteraction(req, res);

    const embed = res.jsonPayload.data.embeds[0];
    expect(embed).toHaveProperty('color');
    expect(embed).toHaveProperty('timestamp');
    expect(embed).toHaveProperty('footer');
    expect(embed.footer.text).toContain('PARAGUAY FFAA');
  });

  it('13 — El color del embed de /torneo status es INFO (azul institucional)', async () => {
    req = buildReq(buildTorneoSubcommand('status'));
    await handleInteraction(req, res);

    const embed = res.jsonPayload.data.embeds[0];
    // EMBED_COLORS.INFO === 0x0038A8
    expect(embed.color).toBe(0x0038A8);
  });

  // ── Regresión: todos los caminos terminan en 200 ────────────

  it('14 — Todos los caminos responden 200 (nunca dejamos colgado a Discord)', async () => {
    const payloads = [
      PING_PAYLOAD,
      buildTorneoSubcommand('status'),
      buildTorneoSubcommand('bracket'),
      buildTorneoSubcommand('equipos'),
      buildTorneoSubcommand('draft'),
      buildTorneoSubcommand('inexistente'),
      buildApplicationCommand('ping'),
      { type: 3, data: {} },
      { type: 2, data: null }
    ];

    for (const p of payloads) {
      const r = buildRes();
      await handleInteraction(buildReq(p), r);
      expect(r.statusCode).toBe(200);
      expect(r.jsonPayload).toBeDefined();
    }
  });

  it('15 — El payload de error incluye flag EPHEMERAL (64)', async () => {
    req = buildReq(buildApplicationCommand('comando-inexistente'));
    await handleInteraction(req, res);

    expect(res.jsonPayload.data.flags).toBe(64);
  });
});