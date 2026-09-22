/**
 * ============================================================================
 * PARAGUAY-FFAA | METALSTORM
 * SCHEMAS DE VALIDACIÓN — Eventos y Participaciones
 * ============================================================================
 * Propósito:
 *   Definir los schemas Zod para validar:
 *   - Metadata de eventos por tipo (SQUADRON, BLACK_MARKET, ACE_CHALLENGE).
 *   - Data de participaciones por tipo.
 *   - Payloads de creación/edición de eventos.
 *
 * Versión: v1.0
 * Fecha: 2026-09-17
 * Autor: PJPIROVANI (OWNER)
 * ============================================================================
 */

import { z } from 'zod';

// ============================================================
// CONSTANTES
// ============================================================

export const EVENT_TYPES = ['SQUADRON', 'BLACK_MARKET', 'ACE_CHALLENGE'];
export const EVENT_STATUSES = ['SCHEDULED', 'OPEN', 'CLOSED', 'CANCELLED'];
export const PARTICIPATION_STATUSES = ['PENDING', 'VALIDATED', 'REJECTED'];

// ============================================================
// SCHEMAS DE METADATA (por tipo de evento)
// ============================================================

/**
 * Metadata para SQUADRON.
 */
export const SquadronMetadataSchema = z.object({
  target_members: z.number().int().min(0).max(30).default(27),
  target_tokens: z.number().int().min(0).max(200).default(200),
  min_tokens_required: z.number().int().min(0).max(200).default(175),
  iso_week: z.number().int().min(1).max(53).optional(),
  iso_year: z.number().int().min(2020).max(2100).optional(),
  historical_legacy_id: z.string().optional(),
  auto_created: z.boolean().default(false),
  backfilled: z.boolean().default(false),
  no_data: z.boolean().default(false),
  source: z.string().optional(),
  notes: z.string().max(500).nullable().optional()
}).passthrough();

/**
 * Metadata para BLACK_MARKET.
 *
 * Estructura extendida del Rediseño de Eventos (F4.2.2-A).
 * Ver: docs/adr/ADR-006-black-market-unificado.md
 */
export const BlackMarketMissionSchema = z.object({
  day: z.number().int().min(1).max(5),
  type: z.enum(['dedication', 'skill', 'teamwork']),
  description: z.string().min(3).max(500),
  requirement: z.string().min(3).max(500),
  target_value: z.number().int().positive(),
  points: z.number().int().positive().default(25)
});

export const BlackMarketMetadataSchema = z.object({
  // Aeronave en promoción (opcional: puede asignarse después)
  aircraft_id: z.string().min(1).nullable().optional(),
  aircraft_name: z.string().min(1).nullable().optional(),

  // Economía
  base_price_shards: z.number().int().min(0).default(500),
  max_discount_shards: z.number().int().min(0).default(250),
  max_points: z.number().int().min(0).default(250),
  discount_per_point: z.number().positive().default(0.2),

  // Duración
  duration_days: z.number().int().min(1).max(30).default(5),
  purchase_window_hours: z.number().int().min(1).max(168).default(24),

  // Progresión de trofeos por día
  trophy_progression: z.object({
    day_1: z.number().int().min(0).default(200),
    day_2: z.number().int().min(0).default(350),
    day_3: z.number().int().min(0).default(500),
    day_4: z.number().int().min(0).default(650),
    day_5: z.number().int().min(0).default(800)
  }).optional(),

  // Misiones (máx 15 = 5 días × 3)
  missions: z.array(BlackMarketMissionSchema).max(15).default([]),

  // Auditoría
  announced_at: z.string().datetime().optional(),
  created_by: z.string().optional(),
  notes: z.string().max(1000).nullable().optional(),

  // Marcas de migración (para BM histórico)
  legacy_bm: z.boolean().optional(),
  source: z.string().optional(),
  legacy_id: z.string().optional(),
  backfilled: z.boolean().optional(),
  no_data: z.boolean().optional()
}).passthrough();

/**
 * Metadata para ACE_CHALLENGE (documentada, no implementada).
 */
export const AceChallengeMetadataSchema = z.object({
  operation_name: z.string().min(1),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('hard'),
  max_stars: z.number().int().min(1).max(3).default(3),
  ticket_count: z.number().int().min(1).max(10).default(3),
  rewards: z.object({
    pilot_icon: z.string().optional(),
    trophy_case_memento: z.string().optional(),
    bonus_multipliers: z.array(z.string()).optional()
  }).optional()
}).passthrough();

/**
 * Metadata genérica (para ACE_CHALLENGE y futuros tipos).
 */
export const GenericMetadataSchema = z.record(z.any());

/**
 * Selector de schema de metadata por tipo.
 */
export function getMetadataSchema(type) {
  switch (type) {
    case 'SQUADRON': return SquadronMetadataSchema;
    case 'BLACK_MARKET': return BlackMarketMetadataSchema;
    case 'ACE_CHALLENGE': return AceChallengeMetadataSchema;
    default: return GenericMetadataSchema;
  }
}

// ============================================================
// SCHEMAS DE DATA DE PARTICIPACIONES (por tipo de evento)
// ============================================================

/**
 * Data para participaciones de SQUADRON.
 */
export const SquadronParticipationDataSchema = z.object({
  tokens: z.number().int().min(0).max(300),
  days_connected: z.number().int().min(0).max(7),
  flew_in_group: z.boolean(),
  notes: z.string().max(500).nullable().optional(),
  perf_status: z.enum(['VERDE', 'NARANJA', 'ROJO', 'NEGRO', 'PENDIENTE']).optional(),
  role: z.string().optional(),
  user_email: z.string().nullable().optional()
}).passthrough();

/**
 * Progreso de un día específico del Black Market (3 misiones).
 */
export const BlackMarketDayProgressSchema = z.object({
  dedication: z.boolean().default(false),
  skill: z.boolean().default(false),
  teamwork: z.boolean().default(false)
});

/**
 * Data para participaciones de BLACK_MARKET.
 *
 * Estructura extendida del Rediseño de Eventos (F4.2.2-A).
 * Ver: docs/adr/ADR-006-black-market-unificado.md
 */
export const BlackMarketParticipationDataSchema = z.object({
  // Progreso por día (5 días)
  day_1: BlackMarketDayProgressSchema.optional(),
  day_2: BlackMarketDayProgressSchema.optional(),
  day_3: BlackMarketDayProgressSchema.optional(),
  day_4: BlackMarketDayProgressSchema.optional(),
  day_5: BlackMarketDayProgressSchema.optional(),

  // Cálculos derivados (los completa el backend)
  total_points: z.number().int().min(0).max(250).default(0),
  discount_percentage: z.number().min(0).max(50).default(0),
  completed_missions: z.number().int().min(0).max(15).default(0),
  bonus_points: z.number().int().min(0).default(0),

  // Auditoría
  screenshot_urls: z.array(z.string().url()).max(20).default([]),
  verified_by: z.string().uuid().nullable().default(null),
  verified_at: z.string().datetime().nullable().default(null),
  notes: z.string().max(1000).nullable().default(null)
}).passthrough();

/**
 * Data genérica para participaciones (ACE_CHALLENGE y futuros).
 */
export const GenericParticipationDataSchema = z.record(z.any());

/**
 * Selector de schema de data por tipo.
 */
export function getParticipationDataSchema(type) {
  switch (type) {
    case 'SQUADRON': return SquadronParticipationDataSchema;
    case 'BLACK_MARKET': return BlackMarketParticipationDataSchema;
    default: return GenericParticipationDataSchema;
  }
}

// ============================================================
// SCHEMAS DE PAYLOAD (crear/editar)
// ============================================================

/**
 * Payload para crear un evento.
 */
export const CreateEventSchema = z.object({
  type: z.enum(EVENT_TYPES),
  name: z.string().min(3).max(200),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  status: z.enum(EVENT_STATUSES).default('SCHEDULED'),
  metadata: z.record(z.any()).default({}),
  legacy_event_id: z.string().nullable().optional()
});

/**
 * Payload para editar un evento.
 */
export const UpdateEventSchema = z.object({
  name: z.string().min(3).max(200).optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  metadata: z.record(z.any()).optional()
});

/**
 * Payload para cambiar el status de un evento.
 */
export const ChangeEventStatusSchema = z.object({
  status: z.enum(EVENT_STATUSES)
});

/**
 * Payload para crear/editar una participación.
 */
export const CreateParticipationSchema = z.object({
  // v4.5.2-hotfix-2 (HALL-066-septies):
  // El <select> HTML del modo oficial devuelve user_id como STRING ("10").
  // Zod rechazaba con 400 "Invalid UUID" porque no aceptaba strings numéricos.
  // Ahora aceptamos 3 formatos:
  //   1. number INTEGER: 1 (users.user_id, self mode)
  //   2. string UUID: "45217610-..." (users.id, self mode)
  //   3. string numérico: "10" (del <select>, se convierte a number)
  user_id: z.union([
    z.number().int().positive(),
    z.string().uuid(),
    z.string().regex(/^\d+$/).transform(Number)  // "10" → 10
  ]).optional(),
  nick: z.string().min(1).max(100).optional(),
  data: z.record(z.any()),
  computed_points: z.number().int().min(0).optional(),
  status: z.enum(PARTICIPATION_STATUSES).default('PENDING')
});

/**
 * Payload para editar una participación.
 */
export const UpdateParticipationSchema = z.object({
  data: z.record(z.any()).optional(),
  computed_points: z.number().int().min(0).optional(),
  status: z.enum(PARTICIPATION_STATUSES).optional()
});

// ============================================================
// HELPERS DE NEGOCIO — BLACK MARKET (F4.2.2-A)
// ============================================================

/**
 * Constantes del Black Market.
 */
export const BM_MISSION_TYPES = ['dedication', 'skill', 'teamwork'];
export const BM_MAX_DAYS = 5;
export const BM_MISSIONS_PER_DAY = 3;
export const BM_POINTS_PER_MISSION = 25;
export const BM_DAILY_BONUS = 25;
export const BM_MAX_POINTS = 250;
export const BM_DISCOUNT_PER_POINT = 0.2;
export const BM_MAX_DISCOUNT = 50;

/**
 * Calcula los puntos totales y el descuento de un piloto BM
 * a partir de su progreso por día.
 *
 * @param {Object} dayProgress - Objeto con day_1 a day_5, cada uno {dedication, skill, teamwork}
 * @param {Array<Object>} missions - Array opcional de misiones del evento (metadata.missions).
 *                                    Si se provee, usa mission.points de cada misión.
 *                                    Si no, usa BM_POINTS_PER_MISSION (25) flat.
 * @returns {{total_points: number, discount_percentage: number, completed_missions: number, bonus_points: number}}
 */
export function calculateBmPoints(dayProgress = {}, missions = []) {
  let totalPoints = 0;
  let totalBonus = 0;
  let completedMissions = 0;

  // Indexar misiones por (day, type) para lookup O(1).
  // Si el evento define points custom en metadata.missions, se respeta.
  // Si no, se usa BM_POINTS_PER_MISSION (25) como fallback.
  const missionPointsMap = {};
  if (Array.isArray(missions)) {
    for (const m of missions) {
      if (m && Number.isInteger(m.day) && typeof m.type === 'string') {
        missionPointsMap[`${m.day}:${m.type}`] = Number.isFinite(m.points)
          ? m.points
          : BM_POINTS_PER_MISSION;
      }
    }
  }

  for (let d = 1; d <= BM_MAX_DAYS; d++) {
    const day = dayProgress[`day_${d}`] || {};
    const completed = [day.dedication, day.skill, day.teamwork].filter(Boolean).length;

    completedMissions += completed;

    // Sumar puntos por cada misión completada (respeta mission.points custom)
    if (day.dedication) {
      totalPoints += missionPointsMap[`${d}:dedication`] ?? BM_POINTS_PER_MISSION;
    }
    if (day.skill) {
      totalPoints += missionPointsMap[`${d}:skill`] ?? BM_POINTS_PER_MISSION;
    }
    if (day.teamwork) {
      totalPoints += missionPointsMap[`${d}:teamwork`] ?? BM_POINTS_PER_MISSION;
    }

    if (completed === BM_MISSIONS_PER_DAY) {
      totalBonus += BM_DAILY_BONUS;
    }
  }

  totalPoints = Math.min(totalPoints + totalBonus, BM_MAX_POINTS);
  const discount = Math.min(totalPoints * BM_DISCOUNT_PER_POINT, BM_MAX_DISCOUNT);

  return {
    total_points: totalPoints,
    discount_percentage: Math.round(discount * 10) / 10,
    completed_missions: completedMissions,
    bonus_points: totalBonus
  };
}

// ============================================================
// EXPORTACIONES
// ============================================================
export default {
  EVENT_TYPES,
  EVENT_STATUSES,
  PARTICIPATION_STATUSES,
  SquadronMetadataSchema,
  BlackMarketMetadataSchema,
  BlackMarketMissionSchema,
  AceChallengeMetadataSchema,
  GenericMetadataSchema,
  getMetadataSchema,
  SquadronParticipationDataSchema,
  BlackMarketParticipationDataSchema,
  BlackMarketDayProgressSchema,
  GenericParticipationDataSchema,
  getParticipationDataSchema,
  CreateEventSchema,
  UpdateEventSchema,
  ChangeEventStatusSchema,
  CreateParticipationSchema,
  UpdateParticipationSchema,
  // Constantes BM
  BM_MISSION_TYPES,
  BM_MAX_DAYS,
  BM_MISSIONS_PER_DAY,
  BM_POINTS_PER_MISSION,
  BM_DAILY_BONUS,
  BM_MAX_POINTS,
  BM_DISCOUNT_PER_POINT,
  BM_MAX_DISCOUNT,
  // Helpers BM
  calculateBmPoints
};