import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string().email('Debe ser un correo electrónico válido'),
  password: z.string().min(1, 'La contraseña es obligatoria')
});

export const ChangePasswordSchema = z.object({
  current_password: z.string().optional(),
  new_password: z.string().min(6, 'La nueva contraseña debe tener al menos 6 caracteres')
});

export const PerformanceSchema = z.object({
  event_id: z.string().min(3, 'Identificador de evento inválido'),
  tokens: z.number().int().min(0, 'Tokens no pueden ser negativos').max(300, 'Máximo 300 tokens por evento'),
  days_connected: z.number().int().min(0).max(7),
  flew_in_group: z.boolean().optional().default(false),
  notes: z.string().max(500, 'Las notas no pueden superar 500 caracteres').optional().nullable(),
  // HALL-028: Validación estricta de user_id (UUID, numérico o "self")
  user_id: z.union([
    z.number().int().positive('user_id numérico debe ser positivo'),
    z.string().regex(
      /^(self|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|\d+)$/i,
      'user_id debe ser "self", un UUID válido o un número entero'
    )
  ]).optional()
});

export const BulkUploadSchema = z.object({
  event_id: z.string().min(3, 'ID de evento requerido'),
  performances: z.array(
    z.object({
      nick: z.string().min(2, 'Nickname de piloto demasiado corto'),
      tokens: z.number().int().min(0).max(300),
      role: z.enum(['MIEMBRO', 'VETERANO', 'ADMIN', 'OWNER']).optional().default('MIEMBRO')
    })
  ).min(1, 'Debe incluir al menos un registro')
});

// ============================================================
// v4.5.0 — Validaciones de Nick y Email Institucional
// ============================================================

/**
 * v4.5.0-hotfix — Regex permisivo de nick militar.
 * Permite: letras Unicode (incluye tildes, ñ, ü), números, espacios, punto, guión bajo, guión medio.
 * Longitud: 3 a 30 caracteres.
 * Nota: los emojis y símbolos raros (@ # [ ] etc.) siguen bloqueados.
 */
export const NICK_REGEX = /^[\p{L}\p{N}._\-\s]{3,30}$/u;

/**
 * Regex oficial del email institucional.
 * Formato: <prefijo>@ffaa.py
 * Prefijo: 3 a 30 caracteres, minúsculas + dígitos + . _ -
 */
export const INSTITUTIONAL_EMAIL_REGEX = /^[a-z0-9._-]{3,30}@ffaa\.py$/;

export const NickFormatSchema = z.string()
  .trim()
  .min(3, 'El nick debe tener al menos 3 caracteres')
  .max(30, 'El nick no puede exceder 30 caracteres')
  .regex(NICK_REGEX, 'Formato inválido: solo letras (incluye tildes/ñ), números, espacios, punto, guión bajo y guión medio (3-30 caracteres)');

export const InstitutionalEmailSchema = z.string()
  .trim()
  .toLowerCase()
  .regex(INSTITUTIONAL_EMAIL_REGEX, 'Email institucional inválido. Formato: usuario@ffaa.py (3-30 caracteres, minúsculas)');

export const AddMemberSchema = z.object({
  nick: NickFormatSchema,
  email: InstitutionalEmailSchema,
  role: z.enum(['MIEMBRO', 'VETERANO', 'ADMIN', 'OWNER']).default('MIEMBRO')
});

export const UpdateMemberStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE'])
});

export const UpdateMemberRoleSchema = z.object({
  role: z.enum(['MIEMBRO', 'VETERANO', 'ADMIN', 'OWNER'])
});

export const PlaneSchema = z.object({
  avion_id: z.string().min(1, 'Modelo de avión requerido'),
  nivel: z.number().int().min(1).max(20),
  especial_nombre: z.string().optional().nullable(),
  pasiva_nombre: z.string().optional().nullable(),
  mod1_id: z.string().optional().nullable(),
  mod1_lvl: z.number().int().min(1).max(5).optional().nullable(),
  mod2_id: z.string().optional().nullable(),
  mod2_lvl: z.number().int().min(1).max(5).optional().nullable(),
  // Upgrades 2.0 (Sistemas mejorables niveles 0-8 y recursos)
  nivel_fuselaje: z.number().int().min(0).max(8).optional().default(0),
  nivel_motor: z.number().int().min(0).max(8).optional().default(0),
  nivel_avionica: z.number().int().min(0).max(8).optional().default(0),
  nivel_armas: z.number().int().min(0).max(8).optional().default(0),
  recursos_piezas: z.number().int().min(0).optional().default(0),
  recursos_avanzadas: z.number().int().min(0).optional().default(0)
});

export const UpdatePlaneSystemSchema = z.object({
  sistema: z.enum(['fuselaje', 'motor', 'avionica', 'armas']),
  nivel: z.number().int().min(0).max(8),
  piezas: z.number().int().min(0).optional().default(0),
  avanzadas: z.number().int().min(0).optional().default(0)
});

export const ProfileUpdateSchema = z.object({
  // v4.5.0: nick con validación estricta (formato militar)
  // El límite de cambios se valida en el controller, no acá.
  nick: NickFormatSchema.optional(),
  full_name: z.string().max(100).optional().nullable(),
  email_personal: z.string().email().optional().nullable().or(z.literal('')),
  phone: z.string().max(30).optional().nullable(),
  bio: z.string().max(500).optional().nullable(),
  notifications_enabled: z.boolean().optional()
});

// v4.5.0 — Payload específico para cambio de nick desde Mi Perfil
export const NickChangeSchema = z.object({
  nick: NickFormatSchema
});

export const SettingsUpdateSchema = z.object({
  theme: z.enum(['militar', 'ops', 'clasico']).optional(),
  language: z.enum(['es', 'en', 'pt']).optional(),
  notif_email: z.boolean().optional(),
  notif_whatsapp: z.boolean().optional(),
  notif_status: z.boolean().optional(),
  notif_reminder: z.boolean().optional(),
  notif_announcements: z.boolean().optional()
});

export const NormativaSchema = z.object({
  titulo: z.string().min(5, 'Título muy corto'),
  codigo: z.string().min(3, 'Código de documento requerido'),
  tipo_documento: z.string().min(2),
  categoria: z.string().min(2),
  ambito_aplicacion: z.string().min(2),
  fecha_aprobacion: z.string(),
  fecha_entrada_vigor: z.string(),
  resumen: z.string().min(10),
  nivel_confidencialidad: z.enum(['PUBLICO', 'RESTRINGIDO', 'SECRETO']).default('PUBLICO')
});

export const PlaneModelSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(v => String(v).trim()),
  name: z.string().min(2, 'Nombre de aeronave requerido (mín. 2 caracteres)').max(100),
  type: z.string().min(2, 'Tipo de aeronave requerido').max(80),
  special_name: z.string().optional().nullable(),
  special_levels: z.union([z.record(z.any()), z.array(z.any()), z.string()]).optional().nullable(),
  passive_name: z.string().optional().nullable(),
  passive_levels: z.union([z.record(z.any()), z.array(z.any()), z.string()]).optional().nullable(),
  stats_real: z.union([z.record(z.any()), z.array(z.any()), z.string()]).optional().nullable(),
  sistemas_disponibles: z.union([z.record(z.any()), z.array(z.any()), z.string()]).optional().nullable(),
  tier: z.number().int().min(1).max(6).optional().nullable(),
  is_active: z.boolean().optional().default(true)
});

export const UpdatePlaneModelSchema = PlaneModelSchema.partial().omit({ id: true });

// ============================================================
// ESQUEMAS BLACK MARKET (v3.7.0)
// ============================================================

export const BmEventSchema = z.object({
  name: z.string().min(3, 'El nombre del evento debe tener al menos 3 caracteres').max(120),
  description: z.string().max(1000).optional().nullable(),
  start_date: z.string().min(8, 'Fecha de inicio inválida'),
  end_date: z.string().min(8, 'Fecha de finalización inválida'),
  is_active: z.boolean().optional().default(false),
  aircraft_id: z.union([z.string(), z.number()]).transform(v => String(v).trim()).optional().nullable(),
  max_points: z.number().int().min(50).max(500).optional().default(250),
  max_discount: z.number().int().min(10).max(100).optional().default(50)
});

export const UpdateBmEventSchema = BmEventSchema.partial();

export const BmMissionSchema = z.object({
  bm_event_id: z.union([z.string(), z.number()]),
  day: z.number().int().min(1).max(5),
  type: z.enum(['dedication', 'skill', 'teamwork']),
  description: z.string().min(3, 'Descripción de misión requerida').max(255),
  requirement: z.string().min(3, 'Requisito de misión requerido').max(255),
  target_value: z.number().int().min(1).max(5000),
  points: z.number().int().min(5).max(100).optional().default(25),
  is_active: z.boolean().optional().default(true)
});

export const UpdateBmMissionSchema = BmMissionSchema.partial().omit({ bm_event_id: true });

export const CompleteBmMissionSchema = z.object({
  completed: z.boolean().optional().default(true)
});



// === F1.2 TOURNAMENTS (RFC-002) ===
// Sistema de Torneos Internos (RFC-002 / Anexo III) — Fase F1.2
// Fuente de verdad de datos: sql/045_tournaments.sql
// Reglamento: docs/normativa/ANEXO-III-torneos.md
// ADR: docs/adr/ADR-011-sistema-torneos.md
// Requiere Zod 4.x.

// --- Constantes reutilizables ---
export const TOURNAMENT_FORMATS        = ['SWISS+SE', 'ROUND_ROBIN+SE'];
export const TOURNAMENT_SCOPES         = ['F1', 'F2', 'F3', 'F4'];
export const TOURNAMENT_STATUSES       = ['DRAFT', 'REGISTRATION', 'ONGOING', 'FINISHED', 'CANCELLED'];
export const TOURNAMENT_PHASES         = ['SWISS', 'QF', 'SF', 'FINAL'];
export const TOURNAMENT_MATCH_STATUSES = ['SCHEDULED', 'LIVE', 'FINISHED', 'CANCELLED'];
export const TOURNAMENT_DRAFT_ACTIONS  = ['BAN', 'PICK'];
export const TOURNAMENT_BEST_OF        = [3, 5];

// --- Sub-schemas internos ---
const TournamentRosterEntrySchema = z.object({
  user_id: z.string().uuid('user_id debe ser un UUID válido'),
  role: z.string().trim().min(2, 'Rol muy corto').max(40, 'Rol muy largo'),
  is_sub: z.boolean().default(false),
});

const TournamentRosterSchema = z
  .array(TournamentRosterEntrySchema)
  .min(5, 'El roster debe tener al menos 5 pilotos')
  .max(6, 'El roster no puede exceder 6 pilotos (5 titulares + 1 suplente)')
  .superRefine((roster, ctx) => {
    const subs = roster.filter((r) => r.is_sub).length;
    const starters = roster.length - subs;

    if (starters !== 5) {
      ctx.addIssue({
        code: 'custom',
        message: `El roster debe tener exactamente 5 titulares (recibidos: ${starters})`,
      });
    }
    if (subs > 1) {
      ctx.addIssue({
        code: 'custom',
        message: `Máximo 1 suplente permitido (recibidos: ${subs})`,
      });
    }
    const ids = roster.map((r) => r.user_id);
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({
        code: 'custom',
        message: 'No puede haber user_id duplicado en el roster',
      });
    }
  });

// --- 6 schemas públicos (Zod 4.x) ---

export const TournamentCreateSchema = z
  .object({
    name: z.string().trim().min(3, 'Nombre muy corto').max(120, 'Nombre muy largo'),
    format: z.enum(TOURNAMENT_FORMATS, {
      message: `Formato inválido. Válidos: ${TOURNAMENT_FORMATS.join(', ')}`,
    }),
    scope: z.enum(TOURNAMENT_SCOPES, {
      message: `Alcance inválido. Válidos: ${TOURNAMENT_SCOPES.join(', ')}`,
    }),
    starts_at: z
      .string()
      .datetime({ offset: true, message: 'starts_at debe ser ISO 8601 con offset' }),
    ends_at: z
      .string()
      .datetime({ offset: true, message: 'ends_at debe ser ISO 8601 con offset' }),
    min_teams: z.number().int().min(2, 'min_teams >= 2').max(32, 'min_teams <= 32').default(4),
    max_teams: z.number().int().min(2, 'max_teams >= 2').max(32, 'max_teams <= 32').default(8),
    moderator_id: z.string().uuid('moderator_id debe ser UUID').optional().nullable(),
    metadata: z.record(z.string(), z.any()).optional().default({}),
  })
  .superRefine((data, ctx) => {
    if (new Date(data.ends_at) <= new Date(data.starts_at)) {
      ctx.addIssue({
        code: 'custom',
        path: ['ends_at'],
        message: 'La fecha de fin debe ser posterior a la de inicio',
      });
    }
    if (data.max_teams < data.min_teams) {
      ctx.addIssue({
        code: 'custom',
        path: ['max_teams'],
        message: 'max_teams debe ser >= min_teams',
      });
    }
    if (data.scope === 'F1' && (data.min_teams < 4 || data.max_teams > 8)) {
      ctx.addIssue({
        code: 'custom',
        path: ['scope'],
        message: 'F1 admite entre 4 y 8 equipos (Anexo III Art. 8)',
      });
    }
  });

export const TournamentUpdateStatusSchema = z
  .object({
    status: z.enum(TOURNAMENT_STATUSES, {
      message: `Estado inválido. Válidos: ${TOURNAMENT_STATUSES.join(', ')}`,
    }),
    reason: z.string().trim().min(5, 'Motivo muy corto').max(500, 'Motivo muy largo').optional(),
  })
  .superRefine((data, ctx) => {
    if (data.status === 'CANCELLED' && !data.reason) {
      ctx.addIssue({
        code: 'custom',
        path: ['reason'],
        message: 'CANCELLED requiere un motivo (trazabilidad Art. 22)',
      });
    }
  });

export const TournamentRegisterTeamSchema = z.object({
  team_name: z.string().trim().min(2, 'Nombre de equipo muy corto').max(40, 'Nombre de equipo muy largo'),
  captain_user_id: z.string().uuid('captain_user_id debe ser UUID'),
  roster: TournamentRosterSchema,
});

export const TournamentMatchResultSchema = z
  .object({
    score_a: z.number().int().min(0, 'Score no puede ser negativo').max(5, 'Score máximo 5'),
    score_b: z.number().int().min(0, 'Score no puede ser negativo').max(5, 'Score máximo 5'),
    best_of: z.union([z.literal(3), z.literal(5)]).optional(),
    winner_id: z.string().uuid('winner_id debe ser UUID').optional().nullable(),
    notes: z.string().trim().max(500, 'Notas no pueden superar 500 chars').optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.score_a === data.score_b) {
      ctx.addIssue({
        code: 'custom',
        path: ['score_a'],
        message: 'No puede haber empate en Bo3/Bo5',
      });
    }
    if (data.best_of === undefined) return;

    if (data.score_a > data.best_of) {
      ctx.addIssue({
        code: 'custom',
        path: ['score_a'],
        message: `score_a no puede superar best_of (${data.best_of})`,
      });
    }
    if (data.score_b > data.best_of) {
      ctx.addIssue({
        code: 'custom',
        path: ['score_b'],
        message: `score_b no puede superar best_of (${data.best_of})`,
      });
    }

    const threshold = Math.ceil((data.best_of + 1) / 2);
    const winnerScore = Math.max(data.score_a, data.score_b);
    if (winnerScore < threshold) {
      ctx.addIssue({
        code: 'custom',
        path: ['score_a'],
        message: `El ganador debe alcanzar al menos ${threshold} partidas en Bo${data.best_of}`,
      });
    }
  });

export const TournamentDraftActionSchema = z.object({
  action: z.enum(TOURNAMENT_DRAFT_ACTIONS, {
    message: `Acción inválida. Válidas: ${TOURNAMENT_DRAFT_ACTIONS.join(', ')}`,
  }),
  aircraft_id: z
    .union([z.string(), z.number()])
    .transform((v) => String(v).trim())
    .refine((v) => v.length > 0, 'aircraft_id no puede estar vacío'),
  game_number: z.number().int().min(1, 'game_number >= 1').max(5, 'game_number <= 5'),
  team_id: z.string().uuid('team_id debe ser UUID'),
  order_index: z.number().int().min(1, 'order_index >= 1'),
});

export const TournamentModeratorChangeSchema = z.object({
  moderator_id: z.string().uuid('moderator_id debe ser UUID'),
  reason: z
    .string()
    .trim()
    .min(5, 'Motivo muy corto (mínimo 5 caracteres)')
    .max(500, 'Motivo muy largo (máximo 500 caracteres)'),
});

// === END F1.2 TOURNAMENTS ===
