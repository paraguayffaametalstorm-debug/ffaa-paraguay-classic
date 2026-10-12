// tests/utils/discordNotifier.test.js
//
// F1.6b — Tests del Discord Notifier.
//
// Cubre:
//   - safeNotify: feature flag, validación, resolución de URL, POST, errores
//   - buildEmbed: 6 templates, un caso mínimo por cada uno
//   - invalidateWebhookCache
//
// Mocking:
//   - global.fetch → vi.fn() por test
//   - getSupabase() → mock con respuesta configurable
//   - DISCORD config → mock con enabled=true y webhookUrl
//   - logger → no-op para no ensuciar stdout
//
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── MOCKS (declarar ANTES del import del módulo) ───

vi.mock('../../src/config/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

vi.mock('../../src/db/supabase.js', () => ({
  getSupabase: vi.fn()
}));

vi.mock('../../src/config/discord.js', () => ({
  DISCORD: {
    enabled: true,
    botToken: 'test-bot-token',
    publicKey: '',
    applicationId: '',
    webhookUrl: '',
    timeoutMs: 3000,
    eventTypes: [
      'TOURNAMENT_CREATED',
      'TOURNAMENT_TEAM_REGISTERED',
      'TOURNAMENT_MATCH_RESULT_RECORDED',
      'TOURNAMENT_DRAFT_ACTION_RECORDED',
      'TOURNAMENT_STATUS_CHANGED',
      'TOURNAMENT_MODERATOR_CHANGED'
    ]
  },
  isDiscordWebhooksReady: () => true,
  isDiscordInteractionsReady: () => false
}));

// Importamos DESPUÉS de los mocks
import { safeNotify, buildEmbed, invalidateWebhookCache } from '../../src/utils/discordNotifier.js';
import { getSupabase } from '../../src/db/supabase.js';
import { DISCORD } from '../../src/config/discord.js';

// ─── FIXTURES ─────────────────────────────────────────────────────

const SAMPLE_DATA = {
  TOURNAMENT_CREATED: {
    tournament_id: '11111111-1111-4111-8111-111111111111',
    name: 'Torneo Test F1.6b',
    format: 'SWISS+SE',
    scope: 'F1',
    starts_at: '2026-11-01T12:00:00+00:00',
    ends_at: '2026-11-03T12:00:00+00:00',
    min_teams: 4,
    max_teams: 8,
    moderator_id: null,
    created_by_nick: 'Viper_PY'
  },
  TOURNAMENT_TEAM_REGISTERED: {
    tournament_id: '11111111-1111-4111-8111-111111111111',
    tournament_name: 'Torneo Test',
    team_id: '22222222-2222-4222-8222-222222222222',
    team_name: 'Alpha Squad',
    captain_user_id: '33333333-3333-4333-8333-333333333333',
    captain_nick: 'Capitan',
    roster_size: 5
  },
  TOURNAMENT_MATCH_RESULT_RECORDED: {
    tournament_id: '11111111-1111-4111-8111-111111111111',
    tournament_name: 'Torneo Test',
    match_id: '44444444-4444-4444-8444-444444444444',
    phase: 'SF',
    best_of: 3,
    score_a: 2,
    score_b: 1,
    winner_id: '22222222-2222-4222-8222-222222222222',
    winner_name: 'Alpha Squad',
    recorded_by_nick: 'Moderador'
  },
  TOURNAMENT_DRAFT_ACTION_RECORDED: {
    tournament_id: '11111111-1111-4111-8111-111111111111',
    tournament_name: 'Torneo Test',
    match_id: '44444444-4444-4444-8444-444444444444',
    game_number: 1,
    order_index: 1,
    action: 'BAN',
    aircraft_id: '101',
    aircraft_name: 'F-5E Tiger II',
    team_id: '22222222-2222-4222-8222-222222222222',
    team_label: 'A',
    recorded_by_nick: 'Moderador'
  },
  TOURNAMENT_STATUS_CHANGED: {
    tournament_id: '11111111-1111-4111-8111-111111111111',
    tournament_name: 'Torneo Test',
    from_status: 'DRAFT',
    to_status: 'REGISTRATION',
    reason: null,
    changed_by_nick: 'Viper_PY'
  },
  TOURNAMENT_MODERATOR_CHANGED: {
    tournament_id: '11111111-1111-4111-8111-111111111111',
    tournament_name: 'Torneo Test',
    previous_moderator_id: '33333333-3333-4333-8333-333333333333',
    previous_moderator_nick: 'ModeradorViejo',
    new_moderator_id: '55555555-5555-4555-8555-555555555555',
    new_moderator_nick: 'ModeradorNuevo',
    reason: 'Rotación reglamentaria',
    changed_by_nick: 'Viper_PY'
  }
};

// ─── HELPERS ─────────────────────────────────────────────────────

function mockSupabaseWithWebhook(url) {
  const maybeSingleMock = vi.fn().mockResolvedValue({
    data: { webhook_url: url },
    error: null
  });
  const limitMock = vi.fn(() => ({ maybeSingle: maybeSingleMock }));
  const eqMock2 = vi.fn(() => ({ limit: limitMock }));
  const eqMock1 = vi.fn(() => ({ eq: eqMock2 }));
  const selectMock = vi.fn(() => ({ eq: eqMock1 }));
  const fromMock = vi.fn(() => ({ select: selectMock }));
  getSupabase.mockReturnValue({ from: fromMock });
}

function mockSupabaseEmpty() {
  const maybeSingleMock = vi.fn().mockResolvedValue({ data: null, error: null });
  const limitMock = vi.fn(() => ({ maybeSingle: maybeSingleMock }));
  const eqMock2 = vi.fn(() => ({ limit: limitMock }));
  const eqMock1 = vi.fn(() => ({ eq: eqMock2 }));
  const selectMock = vi.fn(() => ({ eq: eqMock1 }));
  const fromMock = vi.fn(() => ({ select: selectMock }));
  getSupabase.mockReturnValue({ from: fromMock });
}

function mockSupabaseError() {
  const maybeSingleMock = vi.fn().mockResolvedValue({
    data: null,
    error: { message: 'DB error' }
  });
  const limitMock = vi.fn(() => ({ maybeSingle: maybeSingleMock }));
  const eqMock2 = vi.fn(() => ({ limit: limitMock }));
  const eqMock1 = vi.fn(() => ({ eq: eqMock2 }));
  const selectMock = vi.fn(() => ({ eq: eqMock1 }));
  const fromMock = vi.fn(() => ({ select: selectMock }));
  getSupabase.mockReturnValue({ from: fromMock });
}

const originalFetch = global.fetch;

beforeEach(() => {
  vi.clearAllMocks();
  invalidateWebhookCache();
  DISCORD.enabled = true;
  DISCORD.webhookUrl = '';
});

afterEach(() => {
  global.fetch = originalFetch;
});

// ═══════════════════════════════════════════════════════════════
// safeNotify — feature flag
// ═══════════════════════════════════════════════════════════════

describe('safeNotify — feature flag', () => {
  it('1. DISCORD_ENABLED=false → no-op silencioso', async () => {
    DISCORD.enabled = false;
    const fetchSpy = vi.fn();
    global.fetch = fetchSpy;

    const result = await safeNotify('TOURNAMENT_CREATED', SAMPLE_DATA.TOURNAMENT_CREATED);

    expect(result.sent).toBe(false);
    expect(result.reason).toBe('DISCORD_DISABLED');
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════
// safeNotify — validación
// ═══════════════════════════════════════════════════════════════

describe('safeNotify — validación', () => {
  it('2. event_type desconocido → sent=false, UNKNOWN_EVENT_TYPE', async () => {
    const fetchSpy = vi.fn();
    global.fetch = fetchSpy;

    const result = await safeNotify('FAKE_EVENT', {});

    expect(result.sent).toBe(false);
    expect(result.reason).toBe('UNKNOWN_EVENT_TYPE');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('3. data inválida → sent=false, VALIDATION_ERROR', async () => {
    const fetchSpy = vi.fn();
    global.fetch = fetchSpy;

    const result = await safeNotify('TOURNAMENT_CREATED', { name: 'x' });

    expect(result.sent).toBe(false);
    expect(result.reason).toBe('VALIDATION_ERROR');
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════
// safeNotify — resolución de URL
// ═══════════════════════════════════════════════════════════════

describe('safeNotify — resolución de URL', () => {
  it('4. tabla con webhook → usa esa URL', async () => {
    mockSupabaseWithWebhook('https://discord.com/api/webhooks/table-url');
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, status: 204 });
    global.fetch = fetchSpy;

    const result = await safeNotify('TOURNAMENT_CREATED', SAMPLE_DATA.TOURNAMENT_CREATED);

    expect(result.sent).toBe(true);
    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url] = fetchSpy.mock.calls[0];
    expect(url).toBe('https://discord.com/api/webhooks/table-url');
  });

  it('5. tabla vacía + env var set → usa env var', async () => {
    mockSupabaseEmpty();
    DISCORD.webhookUrl = 'https://discord.com/api/webhooks/env-url';
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, status: 204 });
    global.fetch = fetchSpy;

    const result = await safeNotify('TOURNAMENT_CREATED', SAMPLE_DATA.TOURNAMENT_CREATED);

    expect(result.sent).toBe(true);
    const [url] = fetchSpy.mock.calls[0];
    expect(url).toBe('https://discord.com/api/webhooks/env-url');
  });

  it('6. tabla vacía + env var vacía → sent=false, NO_WEBHOOK_CONFIGURED', async () => {
    mockSupabaseEmpty();
    DISCORD.webhookUrl = '';
    const fetchSpy = vi.fn();
    global.fetch = fetchSpy;

    const result = await safeNotify('TOURNAMENT_CREATED', SAMPLE_DATA.TOURNAMENT_CREATED);

    expect(result.sent).toBe(false);
    expect(result.reason).toBe('NO_WEBHOOK_CONFIGURED');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('7. Supabase error → no crashea, cae a env var', async () => {
    mockSupabaseError();
    DISCORD.webhookUrl = 'https://discord.com/api/webhooks/env-fallback';
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, status: 204 });
    global.fetch = fetchSpy;

    const result = await safeNotify('TOURNAMENT_CREATED', SAMPLE_DATA.TOURNAMENT_CREATED);

    expect(result.sent).toBe(true);
    const [url] = fetchSpy.mock.calls[0];
    expect(url).toBe('https://discord.com/api/webhooks/env-fallback');
  });

  it('8. Supabase null → cae a env var', async () => {
    getSupabase.mockReturnValue(null);
    DISCORD.webhookUrl = 'https://discord.com/api/webhooks/env-fallback';
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, status: 204 });
    global.fetch = fetchSpy;

    const result = await safeNotify('TOURNAMENT_CREATED', SAMPLE_DATA.TOURNAMENT_CREATED);

    expect(result.sent).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════
// safeNotify — POST a Discord
// ═══════════════════════════════════════════════════════════════

describe('safeNotify — POST a Discord', () => {
  it('9. POST exitoso → sent=true', async () => {
    mockSupabaseWithWebhook('https://discord.com/api/webhooks/x');
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, status: 204 });
    global.fetch = fetchSpy;

    const result = await safeNotify('TOURNAMENT_CREATED', SAMPLE_DATA.TOURNAMENT_CREATED);

    expect(result.sent).toBe(true);
    expect(fetchSpy).toHaveBeenCalledOnce();
    const [, init] = fetchSpy.mock.calls[0];
    expect(init.method).toBe('POST');
    expect(init.headers['Content-Type']).toBe('application/json');

    const body = JSON.parse(init.body);
    expect(body.embeds).toBeInstanceOf(Array);
    expect(body.embeds[0].title).toContain('Torneo');
    expect(body.allowed_mentions).toEqual({ parse: [] });
  });

  it('10. 429 rate limit → sent=false, POST_FAILED', async () => {
    mockSupabaseWithWebhook('https://discord.com/api/webhooks/x');
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      text: () => Promise.resolve('Rate limited')
    });

    const result = await safeNotify('TOURNAMENT_CREATED', SAMPLE_DATA.TOURNAMENT_CREATED);

    expect(result.sent).toBe(false);
    expect(result.reason).toBe('POST_FAILED');
  });

  it('11. 500 server error → sent=false, POST_FAILED', async () => {
    mockSupabaseWithWebhook('https://discord.com/api/webhooks/x');
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve('Internal Server Error')
    });

    const result = await safeNotify('TOURNAMENT_CREATED', SAMPLE_DATA.TOURNAMENT_CREATED);

    expect(result.sent).toBe(false);
    expect(result.reason).toBe('POST_FAILED');
  });

  it('12. fetch throws (network error) → sent=false, no lanza', async () => {
    mockSupabaseWithWebhook('https://discord.com/api/webhooks/x');
    global.fetch = vi.fn().mockRejectedValue(new Error('Network failure'));

    const result = await safeNotify('TOURNAMENT_CREATED', SAMPLE_DATA.TOURNAMENT_CREATED);

    expect(result.sent).toBe(false);
    expect(result.reason).toBe('POST_FAILED');
  });
});

// ═══════════════════════════════════════════════════════════════
// safeNotify — caché
// ═══════════════════════════════════════════════════════════════

describe('safeNotify — caché de URLs', () => {
  it('13. llamadas repetidas usan la caché', async () => {
    let supabaseCalls = 0;
    const maybeSingleMock = vi.fn(() => {
      supabaseCalls++;
      return Promise.resolve({ data: { webhook_url: 'https://discord.com/api/webhooks/cached' }, error: null });
    });
    const limitMock = vi.fn(() => ({ maybeSingle: maybeSingleMock }));
    const eqMock2 = vi.fn(() => ({ limit: limitMock }));
    const eqMock1 = vi.fn(() => ({ eq: eqMock2 }));
    const selectMock = vi.fn(() => ({ eq: eqMock1 }));
    getSupabase.mockReturnValue({ from: vi.fn(() => ({ select: selectMock })) });

    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 204 });

    await safeNotify('TOURNAMENT_CREATED', SAMPLE_DATA.TOURNAMENT_CREATED);
    await safeNotify('TOURNAMENT_CREATED', SAMPLE_DATA.TOURNAMENT_CREATED);

    expect(supabaseCalls).toBe(1);
  });

  it('14. invalidateWebhookCache() fuerza re-query', async () => {
    let supabaseCalls = 0;
    const maybeSingleMock = vi.fn(() => {
      supabaseCalls++;
      return Promise.resolve({ data: { webhook_url: 'https://discord.com/api/webhooks/x' }, error: null });
    });
    const limitMock = vi.fn(() => ({ maybeSingle: maybeSingleMock }));
    const eqMock2 = vi.fn(() => ({ limit: limitMock }));
    const eqMock1 = vi.fn(() => ({ eq: eqMock2 }));
    const selectMock = vi.fn(() => ({ eq: eqMock1 }));
    getSupabase.mockReturnValue({ from: vi.fn(() => ({ select: selectMock })) });

    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 204 });

    await safeNotify('TOURNAMENT_CREATED', SAMPLE_DATA.TOURNAMENT_CREATED);
    invalidateWebhookCache();
    await safeNotify('TOURNAMENT_CREATED', SAMPLE_DATA.TOURNAMENT_CREATED);

    expect(supabaseCalls).toBe(2);
  });
});

// ═══════════════════════════════════════════════════════════════
// buildEmbed — templates
// ═══════════════════════════════════════════════════════════════

describe('buildEmbed — templates', () => {
  const cases = [
    ['TOURNAMENT_CREATED',                /Nuevo Torneo/i],
    ['TOURNAMENT_TEAM_REGISTERED',        /Equipo Registrado/i],
    ['TOURNAMENT_MATCH_RESULT_RECORDED',  /Resultado Registrado/i],
    ['TOURNAMENT_DRAFT_ACTION_RECORDED',  /Acción de Draft/i],
    ['TOURNAMENT_STATUS_CHANGED',         /Estado del Torneo/i],
    ['TOURNAMENT_MODERATOR_CHANGED',      /Moderador Reasignado/i]
  ];

  it.each(cases)('15. %s → embed con título esperado', (eventType, pattern) => {
    const payload = buildEmbed(eventType, SAMPLE_DATA[eventType]);
    expect(payload.embeds).toBeInstanceOf(Array);
    expect(payload.embeds[0].title).toMatch(pattern);
    expect(payload.embeds[0].color).toBeTypeOf('number');
    expect(payload.embeds[0].fields).toBeInstanceOf(Array);
  });

  it('16. event_type desconocido → payload de fallback', () => {
    const payload = buildEmbed('UNKNOWN_EVENT', {});
    expect(payload.content).toContain('UNKNOWN_EVENT');
  });

  it('17. TOURNAMENT_STATUS_CHANGED con CANCELLED usa color rojo', () => {
    const data = { ...SAMPLE_DATA.TOURNAMENT_STATUS_CHANGED, to_status: "CANCELLED", reason: "Cancelado por clima" };
    const payload = buildEmbed('TOURNAMENT_STATUS_CHANGED', data);
    expect(payload.embeds[0].color).toBe(0xEF4444);
  });

  it('18. TOURNAMENT_MATCH_RESULT_RECORDED usa color verde', () => {
    const payload = buildEmbed('TOURNAMENT_MATCH_RESULT_RECORDED', SAMPLE_DATA.TOURNAMENT_MATCH_RESULT_RECORDED);
    expect(payload.embeds[0].color).toBe(0x10B981);
  });
});
