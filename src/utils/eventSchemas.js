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
 */
export const BlackMarketMetadataSchema = z.object({
  aircraft_id: z.string().min(1),
  aircraft_name: z.string().min(1),
  base_price_shards: z.number().int().min(0).default(500),
  max_discount_shards: z.number().int().min(0).default(250),
  max_points: z.number().int().min(0).default(250),
  duration_days: z.number().int().min(1).max(30).default(5),
  purchase_window_hours: z.number().int().min(1).max(168).default(24),
  trophy_progression: z.object({
    day_1: z.number().int().min(0),
    day_2: z.number().int().min(0),
    day_3: z.number().int().min(0),
    day_4: z.number().int().min(0),
    day_5: z.number().int().min(0)
  }).optional(),
  announced_at: z.string().datetime().optional(),
  created_by: z.string().optional(),
  notes: z.string().max(500).nullable().optional()
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
 * Data para participaciones de BLACK_MARKET.
 */
export const BlackMarketParticipationDataSchema = z.object({
  day_1: z.object({
    dedication: z.boolean().default(false),
    skill: z.boolean().default(false),
    teamwork: z.boolean().default(false)
  }).optional(),
  day_2: z.object({
    dedication: z.boolean().default(false),
    skill: z.boolean().default(false),
    teamwork: z.boolean().default(false)
  }).optional(),
  day_3: z.object({
    dedication: z.boolean().default(false),
    skill: z.boolean().default(false),
    teamwork: z.boolean().default(false)
  }).optional(),
  day_4: z.object({
    dedication: z.boolean().default(false),
    skill: z.boolean().default(false),
    teamwork: z.boolean().default(false)
  }).optional(),
  day_5: z.object({
    dedication: z.boolean().default(false),
    skill: z.boolean().default(false),
    teamwork: z.boolean().default(false)
  }).optional(),
  total_points: z.number().int().min(0).max(250).default(0),
  discount_percentage: z.number().int().min(0).max(50).default(0),
  screenshot_urls: z.array(z.string().url()).optional(),
  verified_by: z.string().nullable().optional(),
  verified_at: z.string().datetime().nullable().optional(),
  notes: z.string().max(500).nullable().optional()
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
  user_id: z.string().uuid().optional(),
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
// EXPORTACIONES
// ============================================================

export default {
  EVENT_TYPES,
  EVENT_STATUSES,
  PARTICIPATION_STATUSES,
  SquadronMetadataSchema,
  BlackMarketMetadataSchema,
  AceChallengeMetadataSchema,
  GenericMetadataSchema,
  getMetadataSchema,
  SquadronParticipationDataSchema,
  BlackMarketParticipationDataSchema,
  GenericParticipationDataSchema,
  getParticipationDataSchema,
  CreateEventSchema,
  UpdateEventSchema,
  ChangeEventStatusSchema,
  CreateParticipationSchema,
  UpdateParticipationSchema
};