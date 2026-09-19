/**
 * ============================================================================
 * PARAGUAY-FFAA | METALSTORM
 * Tests unitarios — calculateBmPoints() [F4.2.2-C]
 * ============================================================================
 * Valida la lógica de cálculo de puntos y descuento del Black Market
 * definida en src/utils/eventSchemas.js según ADR-006.
 *
 * Casos cubiertos:
 *   T1 — Fallback 25 flat (sin missions)
 *   T2 — Custom points desde metadata.missions
 *   T3 — Progreso vacío
 *   T4 — Full 5 días → cap 250 puntos / 50% descuento
 *   T5 — Bonus diario solo si 3/3 misiones
 *   T6 — Cap de puntos a 250
 *   T7 — Cap de descuento a 50%
 *   T8 — Missions parciales (solo algunas definidas)
 *   T9 — Robustez: input inválido → no crashea
 *   T10 — dayProgress con días parciales (solo day_1)
 * ============================================================================
 */

import { describe, it, expect } from 'vitest';
import { calculateBmPoints } from '../../src/utils/eventSchemas.js';

// ============================================================
// HELPERS DE FIXTURES
// ============================================================

/**
 * Genera un progreso completo (todos los días, todas las misiones true/false).
 */
function buildFullProgress(value = true) {
  const progress = {};
  for (let d = 1; d <= 5; d++) {
    progress[`day_${d}`] = {
      dedication: value,
      skill: value,
      teamwork: value
    };
  }
  return progress;
}

/**
 * Genera un día específico con flags custom.
 */
function buildDay(dedication = false, skill = false, teamwork = false) {
  return { dedication, skill, teamwork };
}

/**
 * Genera 15 misiones con points custom.
 */
function buildMissions(pointsPerMission = 25) {
  const missions = [];
  for (let day = 1; day <= 5; day++) {
    for (const type of ['dedication', 'skill', 'teamwork']) {
      missions.push({ day, type, points: pointsPerMission });
    }
  }
  return missions;
}

// ============================================================
// TESTS
// ============================================================

describe('calculateBmPoints — Lógica BM (ADR-006)', () => {

  // ----------------------------------------------------------
  // T1 — Fallback 25 flat (sin missions)
  // ----------------------------------------------------------
  it('T1: fallback 25 flat cuando no se pasan missions', () => {
    const progress = {
      day_1: buildDay(true, true, true)
    };
    const result = calculateBmPoints(progress);

    // 3 misiones × 25 = 75 base + 25 bonus diario (3/3) = 100
    expect(result.total_points).toBe(100);
    // 100 pts × 0.2% = 20%
    expect(result.discount_percentage).toBe(20);
    expect(result.completed_missions).toBe(3);
    expect(result.bonus_points).toBe(25);
  });

  // ----------------------------------------------------------
  // T2 — Custom points desde metadata.missions
  // ----------------------------------------------------------
  it('T2: respeta mission.points custom (10 pts flat)', () => {
    const progress = {
      day_1: buildDay(true, true, true)
    };
    const missions = [
      { day: 1, type: 'dedication', points: 10 },
      { day: 1, type: 'skill', points: 10 },
      { day: 1, type: 'teamwork', points: 10 }
    ];
    const result = calculateBmPoints(progress, missions);

    // 3 misiones × 10 = 30 base + 25 bonus = 55
    expect(result.total_points).toBe(55);
    // 55 × 0.2 = 11%
    expect(result.discount_percentage).toBe(11);
    expect(result.completed_missions).toBe(3);
    expect(result.bonus_points).toBe(25);
  });

  // ----------------------------------------------------------
  // T3 — Progreso vacío
  // ----------------------------------------------------------
  it('T3: progreso vacío devuelve ceros', () => {
    const result = calculateBmPoints({});

    expect(result.total_points).toBe(0);
    expect(result.discount_percentage).toBe(0);
    expect(result.completed_missions).toBe(0);
    expect(result.bonus_points).toBe(0);
  });

  // ----------------------------------------------------------
  // T4 — Full 5 días → cap 250 puntos / 50% descuento
  // ----------------------------------------------------------
  it('T4: 5 días completos → cap 250 pts / 50% descuento', () => {
    const progress = buildFullProgress(true);
    const result = calculateBmPoints(progress);

    // 15 misiones × 25 = 375 base + 125 bonus = 500 → cap a 250
    expect(result.total_points).toBe(250);
    // 250 × 0.2 = 50% (tope exacto)
    expect(result.discount_percentage).toBe(50);
    expect(result.completed_missions).toBe(15);
    // bonus_points NO se clampea (es informativo)
    expect(result.bonus_points).toBe(125);
  });

  // ----------------------------------------------------------
  // T5 — Bonus diario solo con 3/3
  // ----------------------------------------------------------
  it('T5: sin bonus si NO se completan las 3 misiones del día', () => {
    const progress = {
      day_1: buildDay(true, true, false)  // 2/3
    };
    const result = calculateBmPoints(progress);

    // 2 × 25 = 50 base, SIN bonus
    expect(result.total_points).toBe(50);
    expect(result.bonus_points).toBe(0);
    expect(result.completed_missions).toBe(2);
  });

  // ----------------------------------------------------------
  // T6 — Cap de puntos a 250 (no 500)
  // ----------------------------------------------------------
  it('T6: el total nunca supera 250 pts', () => {
    const progress = buildFullProgress(true);
    const result = calculateBmPoints(progress);

    expect(result.total_points).toBeLessThanOrEqual(250);
    expect(result.total_points).toBe(250);
  });

  // ----------------------------------------------------------
  // T7 — Cap de descuento a 50%
  // ----------------------------------------------------------
  it('T7: el descuento nunca supera 50%', () => {
    const progress = buildFullProgress(true);
    const result = calculateBmPoints(progress);

    expect(result.discount_percentage).toBeLessThanOrEqual(50);
    expect(result.discount_percentage).toBe(50);
  });

  // ----------------------------------------------------------
  // T8 — Missions parciales (solo algunas definidas)
  // ----------------------------------------------------------
  it('T8: missions parciales — usa default 25 para las no definidas', () => {
    const progress = {
      day_1: buildDay(true, true, true)
    };
    // Solo 1 misión tiene points custom; las otras 2 usan fallback 25
    const missions = [
      { day: 1, type: 'dedication', points: 50 }
    ];
    const result = calculateBmPoints(progress, missions);

    // 50 (custom) + 25 (default) + 25 (default) = 100 base + 25 bonus = 125
    expect(result.total_points).toBe(125);
    expect(result.completed_missions).toBe(3);
    expect(result.bonus_points).toBe(25);
  });

  // ----------------------------------------------------------
  // T9 — Robustez con input inválido
  // ----------------------------------------------------------
  it('T9a: missions no-array → usa fallback 25', () => {
    const progress = { day_1: buildDay(true, true, true) };
    const result = calculateBmPoints(progress, 'no soy array');

    expect(result.total_points).toBe(100); // mismo que T1
  });

  it('T9b: missions con elementos inválidos → ignora los inválidos', () => {
    const progress = { day_1: buildDay(true, true, true) };
    const missions = [
      null,
      { day: 'wrong', type: 'dedication', points: 100 },
      { day: 1, type: 'skill', points: 10 },
      undefined
    ];
    const result = calculateBmPoints(progress, missions);

    // 25 (dedication fallback) + 10 (skill custom) + 25 (teamwork fallback) = 60 + 25 bonus = 85
    expect(result.total_points).toBe(85);
  });

  // ----------------------------------------------------------
  // T10 — Solo day_1 definido (días parciales)
  // ----------------------------------------------------------
  it('T10: días parciales — solo cuenta los días presentes', () => {
    const progress = {
      day_1: buildDay(true, true, true),
      day_2: buildDay(true, false, false)
    };
    const result = calculateBmPoints(progress);

    // Día 1: 75 + 25 = 100. Día 2: 25 + 0 = 25. Total = 125
    expect(result.total_points).toBe(125);
    expect(result.completed_missions).toBe(4);
    expect(result.bonus_points).toBe(25); // solo día 1 tuvo bonus
  });

});