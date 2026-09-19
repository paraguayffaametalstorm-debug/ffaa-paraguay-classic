/**
 * ============================================================================
 * PARAGUAY-FFAA | METALSTORM
 * Fixtures de participaciones BM [F4.2.2-C]
 * ============================================================================
 */

// ============================================================
// HELPERS
// ============================================================

/**
 * Construye una data de progreso BM.
 * @param {Object} dayFlags - { day_1: {...}, ..., day_5: {...} }
 */
export function buildProgress(dayFlags = {}) {
  const data = {
    total_points: 0,
    discount_percentage: 0,
    completed_missions: 0,
    bonus_points: 0,
    screenshot_urls: [],
    verified_by: null,
    verified_at: null,
    notes: null
  };
  for (let d = 1; d <= 5; d++) {
    data[`day_${d}`] = dayFlags[`day_${d}`] || { dedication: false, skill: false, teamwork: false };
  }
  return data;
}

// ============================================================
// PARTICIPACIONES
// ============================================================

/** Piloto con progreso parcial (3 misiones día 1 + 2 misiones día 2). */
export const participationPartial = {
  id: 'p1111111-1111-1111-1111-111111111111',
  event_id: 'aaaaaaaa-1111-1111-1111-111111111111',
  user_id: 'u1111111-1111-1111-1111-111111111111',
  nick: 'Viper_PY',
  data: buildProgress({
    day_1: { dedication: true, skill: true, teamwork: true },  // 3/3 → +bonus
    day_2: { dedication: true, skill: true, teamwork: false }  // 2/3
  }),
  computed_points: 125,  // 3×25 + 25 bonus + 2×25 = 125
  status: 'PENDING',
  created_at: '2026-09-16T10:00:00Z',
  updated_at: '2026-09-17T10:00:00Z',
  created_by: 'u1111111-1111-1111-1111-111111111111'
};

/** Piloto con progreso completo (5 días × 3 misiones). */
export const participationFull = {
  id: 'p2222222-2222-2222-2222-222222222222',
  event_id: 'aaaaaaaa-1111-1111-1111-111111111111',
  user_id: 'u2222222-2222-2222-2222-222222222222',
  nick: 'Condor_01',
  data: buildProgress({
    day_1: { dedication: true, skill: true, teamwork: true },
    day_2: { dedication: true, skill: true, teamwork: true },
    day_3: { dedication: true, skill: true, teamwork: true },
    day_4: { dedication: true, skill: true, teamwork: true },
    day_5: { dedication: true, skill: true, teamwork: true }
  }),
  computed_points: 250,
  status: 'VALIDATED',
  created_at: '2026-09-16T10:00:00Z',
  updated_at: '2026-09-20T22:00:00Z',
  created_by: 'u2222222-2222-2222-2222-222222222222'
};

/** Piloto que no inició (sin data). */
export const participationEmpty = {
  id: 'p3333333-3333-3333-3333-333333333333',
  event_id: 'aaaaaaaa-1111-1111-1111-111111111111',
  user_id: 'u3333333-3333-3333-3333-333333333333',
  nick: 'Halcon_99',
  data: buildProgress(),
  computed_points: 0,
  status: 'PENDING',
  created_at: '2026-09-18T10:00:00Z',
  updated_at: '2026-09-18T10:00:00Z',
  created_by: 'u3333333-3333-3333-3333-333333333333'
};

/** Piloto con purchased: true (ya compró la aeronave). */
export const participationPurchased = {
  ...participationFull,
  data: {
    ...participationFull.data,
    purchased: true,
    purchased_at: '2026-09-20T22:30:00Z'
  }
};