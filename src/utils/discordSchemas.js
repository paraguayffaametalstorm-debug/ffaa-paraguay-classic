// src/utils/discordSchemas.js
//
// ADR-012 — Schemas Zod para el payload de cada evento de Discord (F1.6).
//
// Estos schemas validan los datos que el notifier envía a la API de Discord
// (embeds). NO son los mismos que los schemas de la API REST (esos están
// en src/utils/schemas.js).
//
// Patrón: Zod 4.x, mensajes en español, .superRefine para reglas de negocio.
//
import { z } from 'zod';

// ─── Sub-schema: Embed de Discord ────────────────────────────────
// Referencia: https://discord.com/developers/docs/resources/channel#embed-object

const DiscordEmbedFieldSchema = z.object({
  name: z.string().trim().min(1).max(256),
  value: z.string().trim().min(1).max(1024),
  inline: z.boolean().optional().default(false)
});

const DiscordEmbedFooterSchema = z.object({
  text: z.string().trim().min(1).max(2048),
  icon_url: z.string().url().optional()
});

export const DiscordEmbedSchema = z.object({
  title: z.string().trim().min(1).max(256).optional(),
  description: z.string().trim().min(1).max(4096).optional(),
  url: z.string().url().optional(),
  color: z.number().int().min(0).max(0xFFFFFF).optional(),
  timestamp: z.string().datetime({ offset: true }).optional(),
  footer: DiscordEmbedFooterSchema.optional(),
  fields: z.array(DiscordEmbedFieldSchema).max(25).optional()
});

// ─── Schema raíz del payload ─────────────────────────────────────
// Acepta tanto { content } como { embeds } como ambos.

export const DiscordWebhookPayloadSchema = z.object({
  content: z.string().trim().max(2000).optional(),
  username: z.string().trim().max(80).optional(),
  avatar_url: z.string().url().optional(),
  embeds: z.array(DiscordEmbedSchema).max(10).optional(),
  // Desactiva menciones: nunca queremos pingear @everyone por accidente.
  allowed_mentions: z.object({
    parse: z.array(z.enum(['users', 'roles', 'everyone'])).optional().default([])
  }).optional().default({ parse: [] })
}).superRefine((data, ctx) => {
  const hasContent = Boolean(data.content && data.content.length > 0);
  const hasEmbeds  = Boolean(data.embeds && data.embeds.length > 0);
  if (!hasContent && !hasEmbeds) {
    ctx.addIssue({
      code: 'custom',
      path: ['content'],
      message: 'El payload debe tener al menos content o embeds'
    });
  }
});

// ─── Constantes de color ─────────────────────────────────────────
// Inspirados en la paleta institucional (--pry-red, --pry-blue, gold).

export const DISCORD_COLORS = Object.freeze({
  GOLD:   0xD4AF37, // #d4af37 — Torneo creado / celebración
  BLUE:   0x38BDF8, // #38bdf8 — Equipo registrado / info
  GREEN:  0x10B981, // #10b981 — Resultado / éxito
  RED:    0xEF4444, // #ef4444 — Cancelación / error
  YELLOW: 0xF59E0B  // #f59e0b — Draft / advertencia
});

// ─── Sub-schemas de cada evento ──────────────────────────────────

/**
 * TOURNAMENT_CREATED — cuando se crea un torneo.
 * Campos obligatorios: tournament_id (uuid), name, format, scope, starts_at.
 */
export const TournamentCreatedDataSchema = z.object({
  tournament_id: z.string().uuid('tournament_id debe ser UUID'),
  name: z.string().trim().min(3).max(120),
  format: z.string().trim().min(2).max(40),
  scope: z.string().trim().min(2).max(10),
  starts_at: z.string().datetime({ offset: true }),
  ends_at: z.string().datetime({ offset: true }).optional().nullable(),
  min_teams: z.number().int().min(2).max(32),
  max_teams: z.number().int().min(2).max(32),
  moderator_id: z.string().uuid().optional().nullable(),
  created_by_nick: z.string().trim().max(80).optional().nullable()
});

/**
 * TOURNAMENT_TEAM_REGISTERED — cuando se registra un equipo.
 */
export const TournamentTeamRegisteredDataSchema = z.object({
  tournament_id: z.string().uuid(),
  tournament_name: z.string().trim().min(3).max(120),
  team_id: z.string().uuid(),
  team_name: z.string().trim().min(2).max(40),
  captain_user_id: z.string().uuid(),
  captain_nick: z.string().trim().max(80).optional().nullable(),
  roster_size: z.number().int().min(5).max(6)
});

/**
 * TOURNAMENT_MATCH_RESULT_RECORDED — cuando se registra un resultado.
 */
export const TournamentMatchResultDataSchema = z.object({
  tournament_id: z.string().uuid(),
  tournament_name: z.string().trim().min(3).max(120),
  match_id: z.string().uuid(),
  phase: z.string().trim().max(20).optional().nullable(),
  best_of: z.union([z.literal(3), z.literal(5)]),
  score_a: z.number().int().min(0).max(5),
  score_b: z.number().int().min(0).max(5),
  winner_id: z.string().uuid().optional().nullable(),
  winner_name: z.string().trim().max(80).optional().nullable(),
  recorded_by_nick: z.string().trim().max(80).optional().nullable()
});

/**
 * TOURNAMENT_DRAFT_ACTION_RECORDED — cuando se registra una acción de draft.
 */
export const TournamentDraftActionDataSchema = z.object({
  tournament_id: z.string().uuid(),
  tournament_name: z.string().trim().min(3).max(120),
  match_id: z.string().uuid(),
  game_number: z.number().int().min(1).max(5),
  order_index: z.number().int().min(1),
  action: z.enum(['BAN', 'PICK']),
  aircraft_id: z.string().trim().min(1).max(50),
  aircraft_name: z.string().trim().max(120).optional().nullable(),
  team_id: z.string().uuid(),
  team_label: z.enum(['A', 'B']).optional(),
  recorded_by_nick: z.string().trim().max(80).optional().nullable()
});

/**
 * TOURNAMENT_STATUS_CHANGED — cuando cambia el estado del torneo.
 */
export const TournamentStatusChangedDataSchema = z.object({
  tournament_id: z.string().uuid(),
  tournament_name: z.string().trim().min(3).max(120),
  from_status: z.enum(['DRAFT', 'REGISTRATION', 'ONGOING', 'FINISHED', 'CANCELLED']),
  to_status:   z.enum(['DRAFT', 'REGISTRATION', 'ONGOING', 'FINISHED', 'CANCELLED']),
  reason: z.string().trim().max(500).optional().nullable(),
  changed_by_nick: z.string().trim().max(80).optional().nullable()
});

/**
 * TOURNAMENT_MODERATOR_CHANGED — cuando se reasigna el moderador.
 */
export const TournamentModeratorChangedDataSchema = z.object({
  tournament_id: z.string().uuid(),
  tournament_name: z.string().trim().min(3).max(120),
  previous_moderator_id: z.string().uuid().optional().nullable(),
  previous_moderator_nick: z.string().trim().max(80).optional().nullable(),
  new_moderator_id: z.string().uuid(),
  new_moderator_nick: z.string().trim().max(80).optional().nullable(),
  reason: z.string().trim().min(5).max(500),
  changed_by_nick: z.string().trim().max(80).optional().nullable()
});

// ─── Mapa event_type → schema ────────────────────────────────────

export const DISCORD_EVENT_SCHEMAS = Object.freeze({
  TOURNAMENT_CREATED:                  TournamentCreatedDataSchema,
  TOURNAMENT_TEAM_REGISTERED:          TournamentTeamRegisteredDataSchema,
  TOURNAMENT_MATCH_RESULT_RECORDED:    TournamentMatchResultDataSchema,
  TOURNAMENT_DRAFT_ACTION_RECORDED:    TournamentDraftActionDataSchema,
  TOURNAMENT_STATUS_CHANGED:           TournamentStatusChangedDataSchema,
  TOURNAMENT_MODERATOR_CHANGED:        TournamentModeratorChangedDataSchema
});

/**
 * Valida los datos de un evento específico contra su schema.
 * @param {string} eventType
 * @param {object} data
 * @returns {{ ok: true, data: object } | { ok: false, error: object }}
 */
export function validateDiscordEventData(eventType, data) {
  const schema = DISCORD_EVENT_SCHEMAS[eventType];
  if (!schema) {
    return {
      ok: false,
      error: {
        code: 'UNKNOWN_EVENT_TYPE',
        message: `event_type desconocido: ${eventType}`,
        valid: Object.keys(DISCORD_EVENT_SCHEMAS)
      }
    };
  }
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Datos de evento Discord inválidos',
        issues: parsed.error.issues.map(i => ({
          path: i.path,
          message: i.message
        }))
      }
    };
  }
  return { ok: true, data: parsed.data };
}
