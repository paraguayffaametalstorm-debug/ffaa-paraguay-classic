/**
 * ============================================================================
 * PARAGUAY-FFAA | METALSTORM
 * Tests unitarios — Schemas Zod BM [F4.2.2-C]
 * ============================================================================
 * Valida los 3 schemas Zod del Black Market definidos en eventSchemas.js:
 *   - BlackMarketMissionSchema
 *   - BlackMarketMetadataSchema
 *   - BlackMarketParticipationDataSchema
 *
 * Cada schema se testea con:
 *   - Caso válido (happy path)
 *   - Defaults aplicados
 *   - Validaciones de tipo
 *   - Rangos (min/max)
 *   - Casos inválidos (deben rechazar)
 *   - Passthrough (acepta campos extra)
 * ============================================================================
 */

import { describe, it, expect } from 'vitest';
import {
  BlackMarketMissionSchema,
  BlackMarketMetadataSchema,
  BlackMarketParticipationDataSchema
} from '../../src/utils/eventSchemas.js';

// ============================================================
// BlackMarketMissionSchema
// ============================================================

describe('BlackMarketMissionSchema', () => {

  const validMission = {
    day: 1,
    type: 'dedication',
    description: 'Volar 3 partidas con Cazas Ligeros',
    requirement: 'Volar 3 partidas con cazas tácticos ligeros',
    target_value: 3,
    points: 25
  };

  it('M1: acepta una misión válida completa', () => {
    const result = BlackMarketMissionSchema.safeParse(validMission);
    expect(result.success).toBe(true);
    expect(result.data.day).toBe(1);
    expect(result.data.type).toBe('dedication');
    expect(result.data.points).toBe(25);
  });

  it('M2: aplica default 25 a points si se omite', () => {
    const { points, ...missionWithoutPoints } = validMission;
    const result = BlackMarketMissionSchema.safeParse(missionWithoutPoints);
    expect(result.success).toBe(true);
    expect(result.data.points).toBe(25);
  });

  it('M3: rechaza day fuera de rango [1, 5]', () => {
    expect(BlackMarketMissionSchema.safeParse({ ...validMission, day: 0 }).success).toBe(false);
    expect(BlackMarketMissionSchema.safeParse({ ...validMission, day: 6 }).success).toBe(false);
    expect(BlackMarketMissionSchema.safeParse({ ...validMission, day: -1 }).success).toBe(false);
  });

  it('M4: rechaza type no permitido', () => {
    const result = BlackMarketMissionSchema.safeParse({ ...validMission, type: 'invalid_type' });
    expect(result.success).toBe(false);
  });

  it('M5: acepta los 3 tipos válidos (dedication, skill, teamwork)', () => {
    for (const type of ['dedication', 'skill', 'teamwork']) {
      const result = BlackMarketMissionSchema.safeParse({ ...validMission, type });
      expect(result.success).toBe(true);
    }
  });

  it('M6: rechaza description demasiado corta (<3 chars)', () => {
    const result = BlackMarketMissionSchema.safeParse({ ...validMission, description: 'ab' });
    expect(result.success).toBe(false);
  });

  it('M7: rechaza description demasiado larga (>500 chars)', () => {
    const result = BlackMarketMissionSchema.safeParse({
      ...validMission,
      description: 'a'.repeat(501)
    });
    expect(result.success).toBe(false);
  });

  it('M8: rechaza target_value negativo o cero', () => {
    expect(BlackMarketMissionSchema.safeParse({ ...validMission, target_value: 0 }).success).toBe(false);
    expect(BlackMarketMissionSchema.safeParse({ ...validMission, target_value: -5 }).success).toBe(false);
  });

  it('M9: rechaza points negativo o cero', () => {
    expect(BlackMarketMissionSchema.safeParse({ ...validMission, points: 0 }).success).toBe(false);
    expect(BlackMarketMissionSchema.safeParse({ ...validMission, points: -10 }).success).toBe(false);
  });

});

// ============================================================
// BlackMarketMetadataSchema
// ============================================================

describe('BlackMarketMetadataSchema', () => {

  const minimalMetadata = {};

  it('MD1: aplica defaults con metadata vacío', () => {
    const result = BlackMarketMetadataSchema.safeParse(minimalMetadata);
    expect(result.success).toBe(true);
    expect(result.data.base_price_shards).toBe(500);
    expect(result.data.max_discount_shards).toBe(250);
    expect(result.data.max_points).toBe(250);
    expect(result.data.discount_per_point).toBe(0.2);
    expect(result.data.duration_days).toBe(5);
    expect(result.data.purchase_window_hours).toBe(24);
    expect(result.data.missions).toEqual([]);
  });

  it('MD2: acepta metadata BM completa', () => {
    const full = {
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
      missions: [
        {
          day: 1, type: 'dedication',
          description: 'Volar 3 partidas',
          requirement: 'Volar 3 partidas con ligeros',
          target_value: 3,
          points: 25
        }
      ],
      announced_at: '2026-09-19T00:00:00Z',
      created_by: 'PJPIROVANI',
      notes: null
    };
    const result = BlackMarketMetadataSchema.safeParse(full);
    expect(result.success).toBe(true);
    expect(result.data.aircraft_id).toBe('125');
    expect(result.data.missions).toHaveLength(1);
  });

  it('MD3: acepta legacy_bm true (BM histórico)', () => {
    const legacy = {
      legacy_bm: true,
      no_data: true,
      source: 'MIGRATION_RECONSTRUCTION',
      legacy_id: '2026-04 · SEM 16 - BM',
      backfilled: true,
      notes: 'BM histórico migrado de events legacy.'
    };
    const result = BlackMarketMetadataSchema.safeParse(legacy);
    expect(result.success).toBe(true);
    expect(result.data.legacy_bm).toBe(true);
  });

  it('MD4: passthrough permite campos extra (target_tokens, target_members)', () => {
    const withExtra = {
      ...minimalMetadata,
      target_tokens: 0,
      target_members: 0,
      min_tokens_required: 175
    };
    const result = BlackMarketMetadataSchema.safeParse(withExtra);
    expect(result.success).toBe(true);
    // .passthrough() preserva los campos no declarados
    expect(result.data.target_tokens).toBe(0);
    expect(result.data.target_members).toBe(0);
    expect(result.data.min_tokens_required).toBe(175);
  });

  it('MD5: rechaza duration_days > 30', () => {
    const result = BlackMarketMetadataSchema.safeParse({ duration_days: 31 });
    expect(result.success).toBe(false);
  });

  it('MD6: rechaza purchase_window_hours > 168', () => {
    const result = BlackMarketMetadataSchema.safeParse({ purchase_window_hours: 169 });
    expect(result.success).toBe(false);
  });

  it('MD7: rechaza missions > 15', () => {
    const tooMany = Array.from({ length: 16 }, (_, i) => ({
      day: (i % 5) + 1,
      type: 'dedication',
      description: 'Misión',
      requirement: 'Requisito',
      target_value: 1,
      points: 25
    }));
    const result = BlackMarketMetadataSchema.safeParse({ missions: tooMany });
    expect(result.success).toBe(false);
  });

  it('MD8: acepta aircraft_id null (evento sin avión asignado)', () => {
    const result = BlackMarketMetadataSchema.safeParse({ aircraft_id: null });
    expect(result.success).toBe(true);
  });

  it('MD9: trophy_progression aplica defaults por día', () => {
    const result = BlackMarketMetadataSchema.safeParse({
      trophy_progression: {}
    });
    expect(result.success).toBe(true);
    expect(result.data.trophy_progression.day_1).toBe(200);
    expect(result.data.trophy_progression.day_5).toBe(800);
  });

});

// ============================================================
// BlackMarketParticipationDataSchema
// ============================================================

describe('BlackMarketParticipationDataSchema', () => {

  it('PD1: aplica defaults con data vacía', () => {
    const result = BlackMarketParticipationDataSchema.safeParse({});
    expect(result.success).toBe(true);
    expect(result.data.total_points).toBe(0);
    expect(result.data.discount_percentage).toBe(0);
    expect(result.data.completed_missions).toBe(0);
    expect(result.data.bonus_points).toBe(0);
    expect(result.data.screenshot_urls).toEqual([]);
    expect(result.data.verified_by).toBe(null);
    expect(result.data.verified_at).toBe(null);
    expect(result.data.notes).toBe(null);
  });

  it('PD2: acepta progreso de 1 día', () => {
    const result = BlackMarketParticipationDataSchema.safeParse({
      day_1: { dedication: true, skill: true, teamwork: false }
    });
    expect(result.success).toBe(true);
    expect(result.data.day_1.dedication).toBe(true);
    expect(result.data.day_1.teamwork).toBe(false);
  });

  it('PD3: día sin flags explícitos aplica defaults false', () => {
    const result = BlackMarketParticipationDataSchema.safeParse({
      day_1: {}
    });
    expect(result.success).toBe(true);
    expect(result.data.day_1.dedication).toBe(false);
    expect(result.data.day_1.skill).toBe(false);
    expect(result.data.day_1.teamwork).toBe(false);
  });

  it('PD4: acepta los 5 días completos', () => {
    const data = {};
    for (let d = 1; d <= 5; d++) {
      data[`day_${d}`] = { dedication: true, skill: true, teamwork: true };
    }
    const result = BlackMarketParticipationDataSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('PD5: rechaza total_points > 250', () => {
    const result = BlackMarketParticipationDataSchema.safeParse({
      total_points: 251
    });
    expect(result.success).toBe(false);
  });

  it('PD6: rechaza discount_percentage > 50', () => {
    const result = BlackMarketParticipationDataSchema.safeParse({
      discount_percentage: 51
    });
    expect(result.success).toBe(false);
  });

  it('PD7: rechaza completed_missions > 15', () => {
    const result = BlackMarketParticipationDataSchema.safeParse({
      completed_missions: 16
    });
    expect(result.success).toBe(false);
  });

  it('PD8: valida screenshot_urls como array de URLs', () => {
    const good = {
      screenshot_urls: [
        'https://example.com/screen1.jpg',
        'https://example.com/screen2.jpg'
      ]
    };
    expect(BlackMarketParticipationDataSchema.safeParse(good).success).toBe(true);

    const bad = { screenshot_urls: ['no-soy-url'] };
    expect(BlackMarketParticipationDataSchema.safeParse(bad).success).toBe(false);
  });

  it('PD9: rechaza screenshot_urls > 20', () => {
    const tooMany = Array.from({ length: 21 }, (_, i) =>
      `https://example.com/screen${i}.jpg`
    );
    const result = BlackMarketParticipationDataSchema.safeParse({
      screenshot_urls: tooMany
    });
    expect(result.success).toBe(false);
  });

  it('PD10: verified_by acepta UUID válido o null', () => {
    const withUUID = {
      verified_by: '3658df3a-3d15-4669-a595-dca33ec86fd3'
    };
    expect(BlackMarketParticipationDataSchema.safeParse(withUUID).success).toBe(true);

    const withNull = { verified_by: null };
    expect(BlackMarketParticipationDataSchema.safeParse(withNull).success).toBe(true);

    const invalid = { verified_by: 'no-soy-uuid' };
    expect(BlackMarketParticipationDataSchema.safeParse(invalid).success).toBe(false);
  });

  it('PD11: verified_at acepta datetime ISO o null', () => {
    const validDT = { verified_at: '2026-09-19T12:00:00Z' };
    expect(BlackMarketParticipationDataSchema.safeParse(validDT).success).toBe(true);

    const nullDT = { verified_at: null };
    expect(BlackMarketParticipationDataSchema.safeParse(nullDT).success).toBe(true);

    const invalidDT = { verified_at: 'no-soy-fecha' };
    expect(BlackMarketParticipationDataSchema.safeParse(invalidDT).success).toBe(false);
  });

  it('PD12: passthrough permite campos extra (purchased, purchased_at)', () => {
    const result = BlackMarketParticipationDataSchema.safeParse({
      purchased: true,
      purchased_at: '2026-09-19T12:00:00Z'
    });
    expect(result.success).toBe(true);
    expect(result.data.purchased).toBe(true);
    expect(result.data.purchased_at).toBe('2026-09-19T12:00:00Z');
  });

});