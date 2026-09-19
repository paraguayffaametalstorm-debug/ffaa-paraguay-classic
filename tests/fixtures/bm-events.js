/**
 * ============================================================================
 * PARAGUAY-FFAA | METALSTORM
 * Fixtures de eventos BM [F4.2.2-C]
 * ============================================================================
 * Eventos BM de prueba en distintas variantes:
 *   - bmEventActive     → OPEN, con misiones completas
 *   - bmEventScheduled  → SCHEDULED, sin participantes
 *   - bmEventClosed     → CLOSED, histórico
 *   - bmEventLegacy     → legacy_bm: true (artefacto de migración)
 *   - bmEventNoMissions → OPEN pero sin missions (fallback 15 default)
 *   - sqEventActive     → tipo SQUADRON (para probar rechazos)
 * ============================================================================
 */

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
  start_date: '2026-09-16T00:00:00Z',
  end_date: '2026-09-20T23:59:59Z',
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
    announced_at: '2026-09-15T00:00:00Z',
    created_by: 'PJPIROVANI'
  },
  legacy_event_id: null,
  created_at: '2026-09-15T00:00:00Z',
  updated_at: '2026-09-15T00:00:00Z'
};

export const bmEventScheduled = {
  ...bmEventActive,
  id: 'bbbbbbbb-2222-2222-2222-222222222222',
  name: 'Operación Futura · BM 2026-W40',
  status: 'SCHEDULED',
  start_date: '2026-09-30T00:00:00Z',
  end_date: '2026-10-04T23:59:59Z'
};

export const bmEventClosed = {
  ...bmEventActive,
  id: 'cccccccc-3333-3333-3333-333333333333',
  name: 'Operación Pasada · BM 2026-W30',
  status: 'CLOSED',
  start_date: '2026-07-22T00:00:00Z',
  end_date: '2026-07-26T23:59:59Z'
};

export const bmEventLegacy = {
  id: 'd7cbf035-c861-458d-93b6-68e8ba5fb5f4',
  type: 'BLACK_MARKET',
  name: 'Squadron Event 2026-04 · SEM 16 - BM',
  start_date: '2026-04-16T00:00:00Z',
  end_date: '2026-04-20T23:59:59Z',
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
  start_date: '2026-09-17T00:00:00Z',
  end_date: '2026-09-20T23:59:59Z',
  status: 'OPEN',
  metadata: {
    target_members: 27,
    target_tokens: 200,
    min_tokens_required: 175
  },
  legacy_event_id: '2026-09 · SEM 38 - SQ'
};