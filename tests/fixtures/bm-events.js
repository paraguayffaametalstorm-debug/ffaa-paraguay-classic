/**
 * ============================================================================
 * PARAGUAY-FFAA | METALSTORM
 * Fixtures de eventos BM [F4.2.2-C + ADR-008]
 * ============================================================================
 * Eventos BM de prueba en distintas variantes:
 *   - bmEventActive     -> OPEN, con misiones completas y ventana ABIERTA
 *   - bmEventScheduled  -> SCHEDULED, sin participantes
 *   - bmEventClosed     -> CLOSED, histórico
 *   - bmEventLegacy     -> legacy_bm: true (artefacto de migración)
 *   - bmEventNoMissions -> OPEN pero sin missions (fallback 15 default)
 *   - sqEventActive     -> tipo SQUADRON (para probar rechazos)
 *
 * ADR-008: las fechas de start_date/end_date/submission_* son DINÁMICAS
 * (relativas a Date.now()) para que la ventana de carga esté siempre
 * abierta cuando corren los tests. NO fijar fechas absolutas.
 * ============================================================================
 */

// ============================================================
// FECHAS DINÁMICAS (ADR-008)
// ============================================================

const NOW = Date.now();
const DAY_MS = 24 * 60 * 60 * 1000;

/** Evento activo: empezó hace 2 días, termina en 3 días. */
const ACTIVE_START = new Date(NOW - 2 * DAY_MS).toISOString();
const ACTIVE_END = new Date(NOW + 3 * DAY_MS).toISOString();
/** Ventana BM: abre cuando el evento empieza, cierra 6 días después. */
const ACTIVE_SUB_OPEN = ACTIVE_START;
const ACTIVE_SUB_CLOSE = new Date(NOW + 4 * DAY_MS).toISOString();

/** Evento programado: empieza en 10 días. */
const SCHEDULED_START = new Date(NOW + 10 * DAY_MS).toISOString();
const SCHEDULED_END = new Date(NOW + 15 * DAY_MS).toISOString();

/** Evento cerrado: empezó hace 30 días, terminó hace 25 días. */
const CLOSED_START = new Date(NOW - 30 * DAY_MS).toISOString();
const CLOSED_END = new Date(NOW - 25 * DAY_MS).toISOString();
const CLOSED_SUB_OPEN = CLOSED_START;
const CLOSED_SUB_CLOSE = new Date(NOW - 24 * DAY_MS).toISOString();

/** SQ activo: empezó ayer, termina en 3 días. */
const SQ_START = new Date(NOW - 1 * DAY_MS).toISOString();
const SQ_END = new Date(NOW + 3 * DAY_MS).toISOString();
const SQ_SUB_CLOSE = new Date(NOW + 6 * DAY_MS).toISOString();

// ============================================================
// HELPERS
// ============================================================

export function buildMissions15(pointsPerMission = 25) {
  const missions = [];
  for (let day = 1; day <= 5; day++) {
    for (const type of ['dedication', 'skill', 'teamwork']) {
      missions.push({
        day,
        type,
        description: `Misión día ${day} tipo ${type}`,
        requirement: `Completar ${type} día ${day}`,
        target_value: 3,
        points: pointsPerMission
      });
    }
  }
  return missions;
}

// ============================================================
// EVENTOS
// ============================================================

export const bmEventActive = {
  id: 'aaaaaaaa-1111-1111-1111-111111111111',
  type: 'BLACK_MARKET',
  name: 'Operación Tormenta Negra · BM 2026-W38',
  start_date: ACTIVE_START,
  end_date: ACTIVE_END,
  submission_opens_at: ACTIVE_SUB_OPEN,
  submission_closes_at: ACTIVE_SUB_CLOSE,
  status: 'OPEN',
  metadata: {
    aircraft_id: '125',
    aircraft_name: 'F-15EX Eagle II',
    base_price_shards: 500,
    max_discount_shards: 250,
    max_points: 250,
    discount_per_point: 0.2,
    duration_days: 5,
    purchase_window_hours: 24,
    trophy_progression: {
      day_1: 200, day_2: 350, day_3: 500, day_4: 650, day_5: 800
    },
    missions: buildMissions15(),
    announced_at: ACTIVE_START,
    created_by: 'PJPIROVANI'
  },
  legacy_event_id: null,
  created_at: ACTIVE_START,
  updated_at: ACTIVE_START
};

export const bmEventScheduled = {
  ...bmEventActive,
  id: 'bbbbbbbb-2222-2222-2222-222222222222',
  name: 'Operación Futura · BM 2026-W40',
  status: 'SCHEDULED',
  start_date: SCHEDULED_START,
  end_date: SCHEDULED_END
};

export const bmEventClosed = {
  ...bmEventActive,
  id: 'cccccccc-3333-3333-3333-333333333333',
  name: 'Operación Pasada · BM 2026-W30',
  status: 'CLOSED',
  start_date: CLOSED_START,
  end_date: CLOSED_END,
  submission_opens_at: CLOSED_SUB_OPEN,
  submission_closes_at: CLOSED_SUB_CLOSE
};

export const bmEventLegacy = {
  id: 'd7cbf035-c861-458d-93b6-68e8ba5fb5f4',
  type: 'BLACK_MARKET',
  name: 'Squadron Event 2026-04 · SEM 16 - BM',
  start_date: '2026-04-16T00:00:00Z',
  end_date: '2026-04-20T23:59:59Z',
  submission_opens_at: '2026-04-16T00:00:00Z',
  submission_closes_at: '2026-04-22T00:00:00Z',
  status: 'CLOSED',
  metadata: {
    legacy_bm: true,
    no_data: true,
    source: 'MIGRATION_RECONSTRUCTION',
    legacy_id: '2026-04 · SEM 16 - BM',
    backfilled: true,
    notes: 'BM histórico migrado de events legacy. Sin datos reales.',
    target_tokens: 0,
    target_members: 0,
    min_tokens_required: 175
  },
  legacy_event_id: '2026-04 · SEM 16 - BM'
};

export const bmEventNoMissions = {
  ...bmEventActive,
  id: 'dddddddd-4444-4444-4444-444444444444',
  metadata: {
    ...bmEventActive.metadata,
    missions: []
  }
};

export const sqEventActive = {
  id: 'eeeeeeee-5555-5555-5555-555555555555',
  type: 'SQUADRON',
  name: 'Squadron Event 2026-W38',
  start_date: SQ_START,
  end_date: SQ_END,
  submission_opens_at: SQ_START,
  submission_closes_at: SQ_SUB_CLOSE,
  status: 'OPEN',
  metadata: {
    target_members: 27,
    target_tokens: 200,
    min_tokens_required: 175
  },
  legacy_event_id: '2026-09 · SEM 38 - SQ'
};
