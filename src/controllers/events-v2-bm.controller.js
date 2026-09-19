/**
 * ============================================================================
 * PARAGUAY-FFAA | METALSTORM
 * CONTROLADOR UNIFICADO BLACK MARKET — v2 (F4.2.2-B)
 * ============================================================================
 * Propósito:
 *   Manejar el ciclo completo del Black Market sobre el modelo unificado
 *   (events_master + event_participations). Reemplaza bm.controller.js legacy.
 *
 *   NO usa tablas bm_events / bm_missions / bm_progress / bm_discounts.
 *   NO usa fallback en memoria. Si Supabase falla → 500.
 *
 * Endpoints cubiertos (montados en /api/events-v2/bm):
 *   GET    /active                       → getBmActiveEventV2
 *   GET    /:eventId                     → getBmEventByIdV2
 *   POST   /                             → createBmEventV2
 *   PUT    /:eventId                     → updateBmEventV2
 *   GET    /:eventId/progress            → getBmProgressV2
 *   PUT    /:eventId/progress            → updateBmProgressV2
 *   GET    /:eventId/leaderboard         → getBmLeaderboardV2
 *   GET    /:eventId/discount            → getBmDiscountV2
 *
 * Referencias:
 *   - docs/adr/ADR-006-black-market-unificado.md
 *   - src/utils/eventSchemas.js (schemas + calculateBmPoints)
 *
 * Versión: v2.0
 * Fecha: 2026-09-19
 * Autor: PJPIROVANI (OWNER)
 * ============================================================================
 */

import { getSupabase } from '../db/supabase.js';
import { logAuditChange, logSecurityEvent } from '../utils/audit.js';
import {
  BM_MAX_DAYS,
  BM_MISSION_TYPES,
  BM_POINTS_PER_MISSION,
  BM_DAILY_BONUS,
  BM_MAX_POINTS,
  BM_DISCOUNT_PER_POINT,
  BM_MAX_DISCOUNT,
  calculateBmPoints,
  BlackMarketMetadataSchema,
  BlackMarketParticipationDataSchema
} from '../utils/eventSchemas.js';
import { z } from 'zod';

// ============================================================
// CONSTANTES LOCALES
// ============================================================

const BM_TYPE = 'BLACK_MARKET';

// ============================================================
// SCHEMAS DE PAYLOAD ESPECÍFICOS DE BM
// ============================================================

/**
 * Payload para POST /api/events-v2/bm — crear evento BM.
 * Es un subconjunto de CreateEventSchema pero forzando type=BLACK_MARKET
 * y validando metadata con BlackMarketMetadataSchema.
 */
const CreateBmEventSchema = z.object({
  name: z.string().min(3).max(200),
  start_date: z.string().datetime(),
  end_date: z.string().datetime().nullable().optional(),
  status: z.enum(['SCHEDULED', 'OPEN', 'CLOSED', 'CANCELLED']).default('SCHEDULED'),
  metadata: BlackMarketMetadataSchema,
  legacy_event_id: z.string().nullable().optional()
});

/**
 * Payload para PUT /api/events-v2/bm/:eventId — editar evento BM.
 * Todos los campos opcionales. Si viene metadata, se valida completo.
 */
const UpdateBmEventSchema = z.object({
  name: z.string().min(3).max(200).optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().nullable().optional(),
  metadata: BlackMarketMetadataSchema.optional()
});

/**
 * Payload para PUT /api/events-v2/bm/:eventId/progress — actualizar progreso.
 *
 * Modo 1 (toggle granular): { day, mission_type, completed }
 * Modo 2 (reemplazo total): { data: {...}, computed_points? }
 *
 * El modo 2 lo usa el frontend legacy al cargar una participación completa.
 * El modo 1 es el uso normal del piloto marcando/desmarcando misiones.
 */
const UpdateBmProgressSchema = z.union([
  z.object({
    day: z.number().int().min(1).max(BM_MAX_DAYS),
    mission_type: z.enum(BM_MISSION_TYPES),
    completed: z.boolean()
  }),
  z.object({
    data: BlackMarketParticipationDataSchema,
    computed_points: z.number().int().min(0).optional()
  })
]);

// ============================================================
// HELPERS PRIVADOS
// ============================================================

/**
 * Calcula el día actual (1..5) del evento BM según start_date.
 * Clamp duro a [1, BM_MAX_DAYS] porque el BM dura 5 días por contrato.
 *
 * Si el evento no tiene start_date válida → devuelve 1 (día de apertura).
 * Si el evento ya pasó los 5 días → devuelve BM_MAX_DAYS (último día).
 *
 * @param {Object} event - Fila de events_master
 * @returns {number} día actual 1..5
 */
function calculateCurrentDay(event) {
  if (!event || !event.start_date) return 1;
  const start = new Date(event.start_date).getTime();
  if (Number.isNaN(start)) return 1;
  const now = Date.now();
  const diffHours = (now - start) / (3600 * 1000);
  const day = Math.floor(diffHours / 24) + 1;
  return Math.min(Math.max(day, 1), BM_MAX_DAYS);
}

/**
 * Determina si un evento BM está operativo (acepta progreso).
 * Reglas:
 *   - status debe ser 'OPEN'
 *   - NO debe ser un BM histórico legacy (metadata.legacy_bm === true)
 *
 * @param {Object} event
 * @returns {boolean}
 */
function isBmEventOpen(event) {
  if (!event) return false;
  if (event.status !== 'OPEN') return false;
  const metadata = event.metadata || {};
  if (metadata.legacy_bm === true) return false;
  return true;
}

/**
 * Normaliza un evento BM para respuesta HTTP.
 * Inyecta campos derivados sin mutar el original.
 *
 * @param {Object} event - Fila de events_master
 * @returns {Object|null}
 */
function normalizeBmEvent(event) {
  if (!event) return null;
  const metadata = event.metadata || {};
  const currentDay = calculateCurrentDay(event);
  const isLegacy = metadata.legacy_bm === true;

  return {
    ...event,
    // Derivados operacionales
    current_day: currentDay,
    is_open: isBmEventOpen(event),
    is_legacy: isLegacy,
    // Aplanado de metadata para el frontend legacy (compat)
    aircraft_id: metadata.aircraft_id ?? null,
    aircraft_name: metadata.aircraft_name ?? null,
    max_points: metadata.max_points ?? BM_MAX_POINTS,
    max_discount_shards: metadata.max_discount_shards ?? 250,
    discount_per_point: metadata.discount_per_point ?? BM_DISCOUNT_PER_POINT,
    duration_days: metadata.duration_days ?? BM_MAX_DAYS,
    missions: Array.isArray(metadata.missions) ? metadata.missions : []
  };
}

/**
 * Construye un objeto de progreso vacío (5 días × 3 misiones = false).
 * Se usa al crear una participación nueva.
 *
 * @returns {Object} { day_1..day_5, total_points: 0, ... }
 */
function buildEmptyDayProgress() {
  const empty = {
    total_points: 0,
    discount_percentage: 0,
    completed_missions: 0,
    bonus_points: 0,
    screenshot_urls: [],
    verified_by: null,
    verified_at: null,
    notes: null
  };
  for (let d = 1; d <= BM_MAX_DAYS; d++) {
    empty[`day_${d}`] = { dedication: false, skill: false, teamwork: false };
  }
  return empty;
}

/**
 * Aplica un toggle granular sobre el progreso existente.
 * Devuelve un NUEVO objeto (inmutable) con el día/misión actualizado.
 *
 * @param {Object} existingData - data actual de la participación
 * @param {Object} toggle - { day, mission_type, completed }
 * @returns {Object} data actualizada (sin recalcular puntos aún)
 */
function mergeDayProgressToggle(existingData, { day, mission_type, completed }) {
  const base = existingData && typeof existingData === 'object'
    ? { ...existingData }
    : buildEmptyDayProgress();

  const dayKey = `day_${day}`;
  const dayObj = base[dayKey] && typeof base[dayKey] === 'object'
    ? { ...base[dayKey] }
    : { dedication: false, skill: false, teamwork: false };

  dayObj[mission_type] = Boolean(completed);
  base[dayKey] = dayObj;

  return base;
}

/**
 * Extrae el array de misiones del metadata de un evento BM.
 * Si está vacío o ausente, genera 15 misiones por defecto (5 días × 3 tipos)
 * para que el evento sea jugable aunque el admin no las haya definido.
 *
 * El schema Zod BlackMarketMissionSchema garantiza la forma exacta.
 *
 * @param {Object} metadata - event.metadata
 * @returns {Array<Object>} array de misiones validadas
 */
function getMissionsFromMetadata(metadata = {}) {
  const raw = Array.isArray(metadata.missions) ? metadata.missions : [];
  if (raw.length > 0) {
    return raw;
  }
  return buildDefaultMissions();
}

/**
 * Genera las 15 misiones por defecto (5 días × 3 tipos) con
 * los valores del ADR-006. Se usa cuando el evento no trae misiones.
 *
 * NOTA: estos valores son placeholder. Si el OWNER quiere misiones
 * específicas, se definen en metadata.missions al crear el evento.
 *
 * @returns {Array<Object>} 15 misiones validadas
 */
function buildDefaultMissions() {
  const defaults = [];
  const templates = {
    dedication: {
      description: 'Volar 3 partidas con Cazas Ligeros de combate',
      requirement: 'Volar 3 partidas con cazas tácticos ligeros',
      target_value: 3
    },
    skill: {
      description: 'Alcanzar un mínimo de trofeos en combate aéreo',
      requirement: 'Volar aviones con trofeos acumulados',
      target_value: 100
    },
    teamwork: {
      description: 'Jugar partidas en escuadrilla con compañeros',
      requirement: 'Jugar con compañeros de escuadrón en grupo',
      target_value: 2
    }
  };

  for (let day = 1; day <= BM_MAX_DAYS; day++) {
    for (const type of BM_MISSION_TYPES) {
      const tpl = templates[type];
      defaults.push({
        day,
        type,
        description: tpl.description,
        requirement: tpl.requirement,
        target_value: tpl.target_value,
        points: BM_POINTS_PER_MISSION
      });
    }
  }
  return defaults;
}

/**
 * Recalcula los puntos y descuento de un progreso dado.
 * Wrapper que aplica calculateBmPoints y devuelve el objeto data completo
 * con los campos derivados actualizados.
 *
 * IMPORTANTE: cuando calculateBmPoints acepte (dayProgress, missions),
 * hay que pasar missions como 2° arg. Por ahora solo dayProgress.
 *
 * @param {Object} data - progreso del piloto (day_1..day_5 + campos)
 * @param {Array<Object>} missions - misiones del evento (para points custom)
 * @returns {Object} data con total_points, discount_percentage, etc.
 */
function recalcDataWithPoints(data, missions = []) {
  const stats = calculateBmPoints(data, missions);
  return {
    ...data,
    total_points: stats.total_points,
    discount_percentage: stats.discount_percentage,
    completed_missions: stats.completed_missions,
    bonus_points: stats.bonus_points
  };
}
// ============================================================
// 1. GET /api/events-v2/bm/active — Evento BM activo (OPEN)
// ============================================================

/**
 * Devuelve el evento BM activo actual (status=OPEN, no legacy).
 * Si no hay ninguno, devuelve { success: true, active: false, event: null }.
 * NO devuelve 404 porque "no hay BM activo" es un estado válido de negocio.
 */
export const getBmActiveEventV2 = async (req, res) => {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return res.status(500).json({
        success: false,
        error: 'Database client unavailable',
        code: 'DB_UNAVAILABLE'
      });
    }

    const { data: events, error } = await supabase
      .from('events_master')
      .select('*')
      .eq('type', BM_TYPE)
      .eq('status', 'OPEN')
      .limit(1);

    if (error) throw error;

    const activeEvent = events && events.length > 0 ? events[0] : null;

    if (!activeEvent) {
      return res.json({
        success: true,
        active: false,
        event: null,
        data: null,
        message: 'No hay ningún evento Black Market activo en este momento'
      });
    }

    const normalized = normalizeBmEvent(activeEvent);
    const now = Date.now();
    const endMs = normalized.end_date ? new Date(normalized.end_date).getTime() : now;
    const remainingMs = Math.max(0, endMs - now);

    return res.json({
      success: true,
      active: true,
      event: normalized,
      data: normalized,
      current_day: normalized.current_day,
      remaining_ms: remainingMs,
      days_left: Math.ceil(remainingMs / (24 * 3600 * 1000))
    });
  } catch (error) {
    console.error('❌ [Events-v2/BM] Error en getBmActiveEventV2:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      code: 'INTERNAL_ERROR'
    });
  }
};

// ============================================================
// 2. GET /api/events-v2/bm/:eventId — Detalle BM + misiones
// ============================================================

/**
 * Devuelve el detalle completo de un evento BM por ID.
 * Incluye misiones (del metadata o generadas por defecto).
 * Valida type=BLACK_MARKET (404 si es SQ o ACE).
 */
export const getBmEventByIdV2 = async (req, res) => {
  try {
    const { eventId } = req.params;
    const supabase = getSupabase();
    if (!supabase) {
      return res.status(500).json({
        success: false,
        error: 'Database client unavailable',
        code: 'DB_UNAVAILABLE'
      });
    }

    const { data: events, error } = await supabase
      .from('events_master')
      .select('*')
      .eq('id', eventId)
      .limit(1);

    if (error) throw error;

    if (!events || events.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Evento Black Market no encontrado',
        code: 'EVENT_NOT_FOUND'
      });
    }

    const event = events[0];

    if (event.type !== BM_TYPE) {
      return res.status(404).json({
        success: false,
        error: `El evento ${eventId} no es de tipo BLACK_MARKET (es ${event.type})`,
        code: 'EVENT_NOT_BLACK_MARKET'
      });
    }

    const normalized = normalizeBmEvent(event);

    // BM legacy: no tiene misiones jugables, solo metadata histórica
    const isLegacy = normalized.is_legacy === true;
    const missions = isLegacy ? [] : getMissionsFromMetadata(event.metadata);

    return res.json({
      success: true,
      event: normalized,
      data: normalized,
      missions,
      current_day: normalized.current_day,
      is_legacy: isLegacy,
      ...(isLegacy && {
        message: 'Este es un BM histórico (legacy). No acepta progreso ni misiones.'
      })
    });
  } catch (error) {
    console.error('❌ [Events-v2/BM] Error en getBmEventByIdV2:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      code: 'INTERNAL_ERROR'
    });
  }
};

// ============================================================
// 3. POST /api/events-v2/bm — Crear evento BM (ADMIN/OWNER)
// ============================================================

/**
 * Crea un evento BM. Valida payload con CreateBmEventSchema y metadata
 * con BlackMarketMetadataSchema. Si metadata.missions viene vacío,
 * autogenera las 15 misiones por defecto.
 *
 * NO activa el evento automáticamente. Se activa vía
 * PATCH /api/events-v2/:id/status con { status: 'OPEN' }.
 */
export const createBmEventV2 = async (req, res) => {
  try {
    const payload = CreateBmEventSchema.parse(req.body);
    const supabase = getSupabase();
    if (!supabase) {
      return res.status(500).json({
        success: false,
        error: 'Database client unavailable',
        code: 'DB_UNAVAILABLE'
      });
    }

    // Autogenerar misiones si metadata.missions viene vacío
    const metadata = { ...payload.metadata };
    if (!Array.isArray(metadata.missions) || metadata.missions.length === 0) {
      metadata.missions = buildDefaultMissions();
    }

    // Completar campos opcionales del schema con defaults razonables
    if (!metadata.announced_at && payload.status === 'OPEN') {
      metadata.announced_at = new Date().toISOString();
    }
    if (!metadata.created_by) {
      metadata.created_by = req.user?.nick || req.user?.id || 'system';
    }

    // Re-validar metadata tras enriquecerla
    const validatedMetadata = BlackMarketMetadataSchema.parse(metadata);

    const now = new Date().toISOString();
    const eventData = {
      type: BM_TYPE,
      name: payload.name,
      start_date: payload.start_date,
      end_date: payload.end_date || null,
      status: payload.status,
      metadata: validatedMetadata,
      legacy_event_id: payload.legacy_event_id || null,
      created_at: now,
      updated_at: now,
      created_by: req.user?.id || null
    };

    const { data: created, error } = await supabase
      .from('events_master')
      .insert(eventData)
      .select()
      .single();

    if (error) throw error;

    // Auditoría
    await logAuditChange({
      supabase,
      actorId: req.user?.id,
      actorNick: req.user?.nick || 'Oficial',
      targetId: created.id,
      targetNick: created.name,
      action: 'CREATE_BM_EVENT_V2',
      details: {
        aircraft_id: validatedMetadata.aircraft_id,
        duration_days: validatedMetadata.duration_days,
        missions_count: validatedMetadata.missions.length
      }
    });

    const normalized = normalizeBmEvent(created);

    return res.status(201).json({
      success: true,
      message: `Evento Black Market '${created.name}' creado exitosamente con ${validatedMetadata.missions.length} misiones`,
      event: normalized,
      data: normalized
    });
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: 'Payload inválido',
        code: 'VALIDATION_ERROR',
        details: error.issues
      });
    }
    console.error('❌ [Events-v2/BM] Error en createBmEventV2:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      code: 'INTERNAL_ERROR'
    });
  }
};

// ============================================================
// 4. PUT /api/events-v2/bm/:eventId — Editar BM (ADMIN/OWNER)
// ============================================================

/**
 * Edita un evento BM. Todos los campos son opcionales.
 * Si viene metadata, se valida completo con BlackMarketMetadataSchema.
 * NO permite editar eventos legacy (metadata.legacy_bm === true).
 * NO permite editar eventos CLOSED/CANCELLED (inmutables por auditoría).
 */
export const updateBmEventV2 = async (req, res) => {
  try {
    const { eventId } = req.params;
    const payload = UpdateBmEventSchema.parse(req.body);
    const supabase = getSupabase();
    if (!supabase) {
      return res.status(500).json({
        success: false,
        error: 'Database client unavailable',
        code: 'DB_UNAVAILABLE'
      });
    }

    // 1. Fetch evento existente
    const { data: existing, error: queryErr } = await supabase
      .from('events_master')
      .select('id, type, status, name, metadata')
      .eq('id', eventId)
      .limit(1);

    if (queryErr) throw queryErr;
    if (!existing || existing.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Evento Black Market no encontrado',
        code: 'EVENT_NOT_FOUND'
      });
    }

    const event = existing[0];

    if (event.type !== BM_TYPE) {
      return res.status(404).json({
        success: false,
        error: `El evento ${eventId} no es de tipo BLACK_MARKET (es ${event.type})`,
        code: 'EVENT_NOT_BLACK_MARKET'
      });
    }

    // 2. Guardas de inmutabilidad
    const existingMetadata = event.metadata || {};
    if (existingMetadata.legacy_bm === true) {
      return res.status(409).json({
        success: false,
        error: 'No se puede editar un BM histórico (legacy).',
        code: 'LEGACY_BM_READONLY'
      });
    }

    if (event.status === 'CLOSED' || event.status === 'CANCELLED') {
      return res.status(409).json({
        success: false,
        error: `No se puede editar un evento en estado ${event.status}.`,
        code: 'EVENT_NOT_EDITABLE'
      });
    }

    // 3. Construir updateData preservando campos no provistos
    const now = new Date().toISOString();
    const updateData = {
      updated_at: now
    };

    if (payload.name !== undefined) updateData.name = payload.name;
    if (payload.start_date !== undefined) updateData.start_date = payload.start_date;
    if (payload.end_date !== undefined) updateData.end_date = payload.end_date;

    if (payload.metadata !== undefined) {
      // Preservar marcas de migración que no deben perderse en un update
      const mergedMetadata = {
        ...payload.metadata,
        // Preservar created_by original si el payload no lo trae
        created_by: payload.metadata.created_by || existingMetadata.created_by,
        // Preservar anuncio original
        announced_at: payload.metadata.announced_at || existingMetadata.announced_at
      };
      updateData.metadata = BlackMarketMetadataSchema.parse(mergedMetadata);
    }

    // 4. Ejecutar update
    const { data: updated, error } = await supabase
      .from('events_master')
      .update(updateData)
      .eq('id', eventId)
      .select()
      .single();

    if (error) throw error;

    // 5. Auditoría
    await logAuditChange({
      supabase,
      actorId: req.user?.id,
      actorNick: req.user?.nick || 'Oficial',
      targetId: eventId,
      targetNick: updated.name,
      action: 'UPDATE_BM_EVENT_V2',
      details: {
        fields_updated: Object.keys(payload),
        has_metadata: payload.metadata !== undefined
      }
    });

    const normalized = normalizeBmEvent(updated);

    return res.json({
      success: true,
      message: `Evento Black Market '${updated.name}' actualizado exitosamente`,
      event: normalized,
      data: normalized
    });
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: 'Payload inválido',
        code: 'VALIDATION_ERROR',
        details: error.issues
      });
    }
    console.error('❌ [Events-v2/BM] Error en updateBmEventV2:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      code: 'INTERNAL_ERROR'
    });
  }
};

// ============================================================
// 5. GET /api/events-v2/bm/:eventId/progress — Progreso del piloto
// ============================================================

/**
 * Devuelve el progreso completo del piloto autenticado en el evento BM.
 * Incluye: progreso por día, puntos, descuento, misiones enriquecidas.
 *
 * Query params:
 *   ?day=N (opcional) — filtra el array `missions` al día N. El by_day
 *                       completo siempre se devuelve.
 *
 * Si el piloto no tiene participación creada, devuelve progreso vacío
 * (NO 404) para que el frontend pueda renderizar el tablero desde cero.
 */
export const getBmProgressV2 = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user?.id;
    const supabase = getSupabase();
    if (!supabase) {
      return res.status(500).json({
        success: false,
        error: 'Database client unavailable',
        code: 'DB_UNAVAILABLE'
      });
    }

    // 1. Fetch evento
    const { data: events, error: evErr } = await supabase
      .from('events_master')
      .select('*')
      .eq('id', eventId)
      .limit(1);

    if (evErr) throw evErr;
    if (!events || events.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Evento Black Market no encontrado',
        code: 'EVENT_NOT_FOUND'
      });
    }

    const event = events[0];
    if (event.type !== BM_TYPE) {
      return res.status(404).json({
        success: false,
        error: `El evento ${eventId} no es de tipo BLACK_MARKET`,
        code: 'EVENT_NOT_BLACK_MARKET'
      });
    }

    const normalized = normalizeBmEvent(event);
    const isLegacy = normalized.is_legacy === true;

    // 2. Fetch participación (si existe)
    const { data: parts, error: pErr } = await supabase
      .from('event_participations')
      .select('*')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .limit(1);

    if (pErr) throw pErr;

    const participation = parts && parts.length > 0 ? parts[0] : null;
    const rawData = participation?.data && typeof participation.data === 'object'
      ? participation.data
      : buildEmptyDayProgress();

    // 3. Recalcular puntos con las misiones del evento (por si el metadata cambió)
    const missions = isLegacy ? [] : getMissionsFromMetadata(event.metadata);
    const dataWithPoints = recalcDataWithPoints(rawData, missions);

    // 4. Construir by_day enriquecido (misiones + estado del piloto)
    const dayFilter = req.query.day ? parseInt(req.query.day, 10) : null;
    const byDay = {};
    for (let d = 1; d <= BM_MAX_DAYS; d++) {
      byDay[d] = [];
    }

    for (const mission of missions) {
      const day = mission.day;
      const type = mission.type;
      const dayProgress = dataWithPoints[`day_${day}`] || {};
      const completed = Boolean(dayProgress[type]);

      byDay[day].push({
        ...mission,
        completed,
        points_earned: completed ? (mission.points ?? BM_POINTS_PER_MISSION) : 0
      });
    }

    // 5. Array plano `missions` (opcionalmente filtrado por day)
    let flatMissions = [];
    for (const d of Object.keys(byDay)) {
      flatMissions.push(...byDay[d]);
    }
    if (dayFilter && dayFilter >= 1 && dayFilter <= BM_MAX_DAYS) {
      flatMissions = byDay[dayFilter] || [];
    }

    return res.json({
      success: true,
      event: normalized,
      event_id: eventId,
      event_name: event.name,
      participation_id: participation?.id || null,
      has_participation: Boolean(participation),
      current_day: normalized.current_day,
      is_legacy: isLegacy,
      is_open: normalized.is_open,

      // Stats agregadas
      total_points: dataWithPoints.total_points,
      max_points: normalized.max_points,
      discount_percentage: dataWithPoints.discount_percentage,
      max_discount_shards: normalized.max_discount_shards,
      completed_missions: dataWithPoints.completed_missions,
      bonus_points: dataWithPoints.bonus_points,

      // Detalle
      data: dataWithPoints,
      missions: flatMissions,
      by_day: byDay
    });
  } catch (error) {
    console.error('❌ [Events-v2/BM] Error en getBmProgressV2:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      code: 'INTERNAL_ERROR'
    });
  }
};
// ============================================================
// 6. PUT /api/events-v2/bm/:eventId/progress — Actualizar progreso
// ============================================================

/**
 * Actualiza el progreso del piloto autenticado en el evento BM.
 *
 * Modos soportados (validados por UpdateBmProgressSchema):
 *   Modo 1 (toggle granular): { day, mission_type, completed }
 *   Modo 2 (reemplazo total): { data, computed_points? }
 *
 * Comportamiento:
 *   - Auto-crea participación si el piloto no tiene una (Opción A confirmada).
 *   - Rechaza eventos que no están OPEN o son legacy.
 *   - Recalcula puntos/descuento con calculateBmPoints ANTES de persistir.
 *   - Persiste data + computed_points. discount_percentage NO se persiste
 *     (se deriva siempre en lectura para evitar drift).
 *
 * Status codes:
 *   201 — participación creada por primera vez
 *   200 — participación existente actualizada
 *   409 — evento no OPEN / legacy
 *   400 — payload inválido (ZodError)
 */
export const updateBmProgressV2 = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user?.id;
    const userNick = req.user?.nick || 'Piloto';
    const payload = UpdateBmProgressSchema.parse(req.body);
    const supabase = getSupabase();
    if (!supabase) {
      return res.status(500).json({
        success: false,
        error: 'Database client unavailable',
        code: 'DB_UNAVAILABLE'
      });
    }

    // 1. Fetch evento + validaciones operativas
    const { data: events, error: evErr } = await supabase
      .from('events_master')
      .select('*')
      .eq('id', eventId)
      .limit(1);

    if (evErr) throw evErr;
    if (!events || events.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Evento Black Market no encontrado',
        code: 'EVENT_NOT_FOUND'
      });
    }

    const event = events[0];
    if (event.type !== BM_TYPE) {
      return res.status(404).json({
        success: false,
        error: `El evento ${eventId} no es de tipo BLACK_MARKET`,
        code: 'EVENT_NOT_BLACK_MARKET'
      });
    }

    if (!isBmEventOpen(event)) {
      const metadata = event.metadata || {};
      const isLegacy = metadata.legacy_bm === true;
      return res.status(409).json({
        success: false,
        error: isLegacy
          ? 'No se puede cargar progreso en un BM histórico (legacy).'
          : `El evento no está OPEN (status actual: ${event.status}).`,
        code: isLegacy ? 'LEGACY_BM_NO_PROGRESS' : 'EVENT_NOT_OPEN'
      });
    }

    // 2. Fetch participación existente (si la hay)
    const { data: parts, error: pErr } = await supabase
      .from('event_participations')
      .select('*')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .limit(1);

    if (pErr) throw pErr;

    const existing = parts && parts.length > 0 ? parts[0] : null;
    const currentData = existing?.data && typeof existing.data === 'object'
      ? existing.data
      : buildEmptyDayProgress();

    // 3. Aplicar el cambio según modo
    let newData;
    if ('day' in payload && 'mission_type' in payload && 'completed' in payload) {
      // Modo 1: toggle granular
      newData = mergeDayProgressToggle(currentData, {
        day: payload.day,
        mission_type: payload.mission_type,
        completed: payload.completed
      });
    } else {
      // Modo 2: reemplazo total
      newData = { ...payload.data };
    }

    // 4. Recalcular puntos/descuento con las misiones del evento
    const missions = getMissionsFromMetadata(event.metadata);
    const finalData = recalcDataWithPoints(newData, missions);

    // 5. Upsert participación
    const now = new Date().toISOString();
    const participationPayload = {
      event_id: eventId,
      user_id: userId,
      nick: userNick,
      data: finalData,
      computed_points: finalData.total_points,
      status: existing?.status || 'PENDING',
      updated_at: now,
      ...(existing ? {} : {
        created_at: now,
        created_by: req.user?.id || null
      })
    };

    let savedParticipation;
    let wasCreated = false;

    if (existing) {
      const { data: updated, error: upErr } = await supabase
        .from('event_participations')
        .update({
          data: finalData,
          computed_points: finalData.total_points,
          updated_at: now
        })
        .eq('id', existing.id)
        .select()
        .single();
      if (upErr) throw upErr;
      savedParticipation = updated;
    } else {
      const { data: inserted, error: inErr } = await supabase
        .from('event_participations')
        .insert(participationPayload)
        .select()
        .single();
      if (inErr) {
        // Race condition: otro request creó la participación en paralelo
        if (inErr.code === '23505') {
          const { data: retry, error: retryErr } = await supabase
            .from('event_participations')
            .update({
              data: finalData,
              computed_points: finalData.total_points,
              updated_at: now
            })
            .eq('event_id', eventId)
            .eq('user_id', userId)
            .select()
            .single();
          if (retryErr || !retry) {
            throw retryErr || new Error('Race condition retry returned null participation');
          }
          savedParticipation = retry;
        } else {
          throw inErr;
        }
      } else {
        savedParticipation = inserted;
        wasCreated = true;
      }
    }

    // 6. Auditoría (security_events)
    await logSecurityEvent({
      supabase,
      userId,
      nick: userNick,
      event: wasCreated ? 'CREATE_BM_PARTICIPATION_V2' : 'UPDATE_BM_PROGRESS_V2',
      metadata: {
        event_id: eventId,
        mode: 'day' in payload ? 'toggle' : 'replace',
        day: payload.day ?? null,
        mission_type: payload.mission_type ?? null,
        completed: payload.completed ?? null,
        total_points: finalData.total_points,
        discount_percentage: finalData.discount_percentage
      }
    });

    console.log(
      `🎯 [Events-v2/BM] ${userNick} ${wasCreated ? 'inició' : 'actualizó'} progreso en ${event.name} ` +
      `→ ${finalData.total_points} pts (${finalData.discount_percentage}%)`
    );

    return res.status(wasCreated ? 201 : 200).json({
      success: true,
      message: wasCreated
        ? 'Participación iniciada en el Black Market'
        : 'Progreso actualizado exitosamente',
      created: wasCreated,
      participation: savedParticipation,
      data: finalData,
      total_points: finalData.total_points,
      discount_percentage: finalData.discount_percentage,
      completed_missions: finalData.completed_missions,
      bonus_points: finalData.bonus_points
    });
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: 'Payload inválido',
        code: 'VALIDATION_ERROR',
        details: error.issues
      });
    }
    console.error('❌ [Events-v2/BM] Error en updateBmProgressV2:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      code: 'INTERNAL_ERROR'
    });
  }
};

// ============================================================
// 7. GET /api/events-v2/bm/:eventId/leaderboard — Ranking BM
// ============================================================

/**
 * Tabla de posiciones del evento BM. Ordena por total_points DESC,
 * desempata por completed_missions DESC.
 *
 * Solo incluye pilotos con participación real (data.total_points > 0
 * o completed_missions > 0). Los pilotos sin participación no aparecen.
 *
 * El campo `data.total_points` se recalcula en runtime desde `data.day_N`
 * para evitar drift si el admin editó metadata.missions.
 */
export const getBmLeaderboardV2 = async (req, res) => {
  try {
    const { eventId } = req.params;
    const supabase = getSupabase();
    if (!supabase) {
      return res.status(500).json({
        success: false,
        error: 'Database client unavailable',
        code: 'DB_UNAVAILABLE'
      });
    }

    // 1. Fetch evento
    const { data: events, error: evErr } = await supabase
      .from('events_master')
      .select('id, type, name, metadata, status, start_date')
      .eq('id', eventId)
      .limit(1);

    if (evErr) throw evErr;
    if (!events || events.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Evento Black Market no encontrado',
        code: 'EVENT_NOT_FOUND'
      });
    }

    const event = events[0];
    if (event.type !== BM_TYPE) {
      return res.status(404).json({
        success: false,
        error: `El evento ${eventId} no es de tipo BLACK_MARKET`,
        code: 'EVENT_NOT_BLACK_MARKET'
      });
    }

    const missions = getMissionsFromMetadata(event.metadata);

    // 2. Fetch todas las participaciones del evento
    const { data: parts, error: pErr } = await supabase
      .from('event_participations')
      .select('user_id, nick, data, computed_points, status, created_at')
      .eq('event_id', eventId);

    if (pErr) throw pErr;

    // 3. Recalcular puntos desde data en runtime (evita drift)
    const rows = (parts || []).map((p) => {
      const rawData = p.data && typeof p.data === 'object' ? p.data : {};
      const stats = calculateBmPoints(rawData, missions);
      const daysActive = [1, 2, 3, 4, 5].filter((d) => {
        const day = rawData[`day_${d}`];
        return day && (day.dedication || day.skill || day.teamwork);
      }).length;

      return {
        user_id: p.user_id,
        nick: p.nick || 'Piloto',
        total_points: stats.total_points,
        discount_percentage: stats.discount_percentage,
        completed_missions: stats.completed_missions,
        bonus_points: stats.bonus_points,
        days_active: daysActive,
        participation_status: p.status,
        joined_at: p.created_at
      };
    });

    // 4. Filtrar participantes reales y ordenar
    const leaderboard = rows
      .filter((r) => r.total_points > 0 || r.completed_missions > 0)
      .sort((a, b) => {
        if (b.total_points !== a.total_points) return b.total_points - a.total_points;
        if (b.completed_missions !== a.completed_missions) return b.completed_missions - a.completed_missions;
        return a.nick.localeCompare(b.nick);
      })
      .map((r, i) => ({ ...r, rank: i + 1 }));

    const totalPointsSum = leaderboard.reduce((s, r) => s + r.total_points, 0);
    const avgPoints = leaderboard.length > 0
      ? Math.round(totalPointsSum / leaderboard.length)
      : 0;

    return res.json({
      success: true,
      event_id: eventId,
      event_name: event.name,
      event_status: event.status,
      total_participants: leaderboard.length,
      average_points: avgPoints,
      leaderboard,
      data: leaderboard
    });
  } catch (error) {
    console.error('❌ [Events-v2/BM] Error en getBmLeaderboardV2:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      code: 'INTERNAL_ERROR'
    });
  }
};

// ============================================================
// 8. GET /api/events-v2/bm/:eventId/discount — Descuento + aeronave
// ============================================================

/**
 * Devuelve el descuento acumulado del piloto autenticado y la ficha
 * de la aeronave en oferta, con pricing final calculado.
 *
 * IMPORTANTE (ADR-006 §Estructura JSONB):
 *   - La economía vive en metadata: base_price_shards, max_discount_shards,
 *     discount_per_point, max_points.
 *   - El "descuento" se mide en SHARDS, no en porcentaje.
 *   - discount_percentage es un campo DERIVADO (total_points × discount_per_point).
 *   - El precio final se calcula contra base_price_shards.
 *
 * El estado `purchased` se lee de data.purchased (bool) si existe.
 * NO se persiste en tabla aparte (ADR-006 §Alternativas rechazadas).
 */
export const getBmDiscountV2 = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user?.id;
    const supabase = getSupabase();
    if (!supabase) {
      return res.status(500).json({
        success: false,
        error: 'Database client unavailable',
        code: 'DB_UNAVAILABLE'
      });
    }

    // 1. Fetch evento
    const { data: events, error: evErr } = await supabase
      .from('events_master')
      .select('*')
      .eq('id', eventId)
      .limit(1);

    if (evErr) throw evErr;
    if (!events || events.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Evento Black Market no encontrado',
        code: 'EVENT_NOT_FOUND'
      });
    }

    const event = events[0];
    if (event.type !== BM_TYPE) {
      return res.status(404).json({
        success: false,
        error: `El evento ${eventId} no es de tipo BLACK_MARKET`,
        code: 'EVENT_NOT_BLACK_MARKET'
      });
    }

    const metadata = event.metadata || {};
    const normalized = normalizeBmEvent(event);
    const missions = getMissionsFromMetadata(metadata);

    // 2. Fetch participación del piloto
    const { data: parts, error: pErr } = await supabase
      .from('event_participations')
      .select('*')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .limit(1);

    if (pErr) throw pErr;

    const participation = parts && parts.length > 0 ? parts[0] : null;
    const rawData = participation?.data && typeof participation.data === 'object'
      ? participation.data
      : buildEmptyDayProgress();

    const finalData = recalcDataWithPoints(rawData, missions);

    // 3. Economía desde metadata (con fallbacks)
    const basePrice = Number.isFinite(metadata.base_price_shards)
      ? metadata.base_price_shards
      : 500;
    const maxDiscountShards = Number.isFinite(metadata.max_discount_shards)
      ? metadata.max_discount_shards
      : 250;
    const discountPerPoint = Number.isFinite(metadata.discount_per_point)
      ? metadata.discount_per_point
      : BM_DISCOUNT_PER_POINT;

    // 4. Cálculo de descuento (ADR-006)
    // discount_per_point es un PORCENTAJE por punto.
    // Ej: 250 puntos × 0.2 = 50% de descuento.
    // Cap a 50% por diseño (máximo del BM).
    const discountPercentageRaw = finalData.total_points * discountPerPoint;
    const discountPercentage = Math.min(
      Math.round(discountPercentageRaw * 10) / 10,
      50
    );

    // Convertir el porcentaje a shards según el precio base
    const discountShardsRaw = Math.round(basePrice * (discountPercentage / 100));
    const discountShards = Math.min(discountShardsRaw, maxDiscountShards);
    const finalPrice = Math.max(0, basePrice - discountShards);

    // 5. Ficha de aeronave (fetch desde plane_models si hay aircraft_id)
    const aircraftId = metadata.aircraft_id || null;
    let aircraft = null;
    if (aircraftId) {
      try {
        const { data: planeDb } = await supabase
          .from('plane_models')
          .select('*')
          .eq('id', aircraftId)
          .maybeSingle();
        if (planeDb) aircraft = planeDb;
      } catch (planeErr) {
        console.warn('⚠️ [Events-v2/BM] No se pudo leer plane_models:', planeErr.message);
      }
    }

    const purchased = Boolean(rawData.purchased);
    const purchasedAt = rawData.purchased_at || null;

    return res.json({
      success: true,
      event_id: eventId,
      event_name: event.name,
      event_status: event.status,
      is_open: normalized.is_open,
      aircraft_id: aircraftId,
      aircraft_name: metadata.aircraft_name || null,
      aircraft,

      // Puntos
      total_points: finalData.total_points,
      max_points: metadata.max_points ?? BM_MAX_POINTS,
      completed_missions: finalData.completed_missions,
      bonus_points: finalData.bonus_points,

      // Descuento (shards + porcentaje derivado)
      discount_shards: discountShards,
      max_discount_shards: maxDiscountShards,
      discount_percentage: discountPercentage,
      discount_per_point: discountPerPoint,

      // Pricing
      pricing: {
        base_price_shards: basePrice,
        discount_shards: discountShards,
        final_price_shards: finalPrice,
        currency: 'SHARDS'
      },

      // Estado de compra
      purchased,
      purchased_at: purchasedAt,

      data: finalData
    });
  } catch (error) {
    console.error('❌ [Events-v2/BM] Error en getBmDiscountV2:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      code: 'INTERNAL_ERROR'
    });
  }
};

// ============================================================
// 9. GET /api/events-v2/bm — Listar todos los eventos BM (ADMIN)
// ============================================================

/**
 * Devuelve la lista completa de eventos BM (históricos + activos).
 * Usado por la consola administrativa (bmPanelView) para renderizar
 * la tabla de eventos y elegir el activo.
 *
 * Query params:
 *   ?status=OPEN|CLOSED|SCHEDULED|CANCELLED (opcional, filtra)
 *   ?limit=N (opcional, default 50, max 200)
 *
 * Orden: start_date DESC (más recientes primero).
 */
export const getBmEventsV2 = async (req, res) => {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return res.status(500).json({
        success: false,
        error: 'Database client unavailable',
        code: 'DB_UNAVAILABLE',
        events: []
      });
    }

    const { status } = req.query;
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);

    let query = supabase
      .from('events_master')
      .select('*')
      .eq('type', BM_TYPE)
      .order('start_date', { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: events, error } = await query;
    if (error) throw error;

    const normalized = (events || []).map(normalizeBmEvent);
    const activeEvent = normalized.find((e) => e.is_open) || null;

    return res.json({
      success: true,
      events: normalized,
      count: normalized.length,
      active_event: activeEvent,
      data: normalized
    });
  } catch (error) {
    console.error('❌ [Events-v2/BM] Error en getBmEventsV2:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      code: 'INTERNAL_ERROR',
      events: []
    });
  }
};

// ============================================================
// 10. GET /api/events-v2/bm/:eventId/stats — KPIs admin del evento
// ============================================================

/**
 * KPIs agregados del evento BM para la consola administrativa.
 * Calcula en runtime desde event_participations (no hay tabla pre-agregada).
 */
export const getBmStatsV2 = async (req, res) => {
  try {
    const { eventId } = req.params;
    const supabase = getSupabase();
    if (!supabase) {
      return res.status(500).json({
        success: false,
        error: 'Database client unavailable',
        code: 'DB_UNAVAILABLE'
      });
    }

    const { data: events, error: evErr } = await supabase
      .from('events_master')
      .select('id, type, name, status, metadata, start_date')
      .eq('id', eventId)
      .limit(1);

    if (evErr) throw evErr;
    if (!events || events.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Evento Black Market no encontrado',
        code: 'EVENT_NOT_FOUND'
      });
    }

    const event = events[0];
    if (event.type !== BM_TYPE) {
      return res.status(404).json({
        success: false,
        error: `El evento ${eventId} no es de tipo BLACK_MARKET`,
        code: 'EVENT_NOT_BLACK_MARKET'
      });
    }

    const missions = getMissionsFromMetadata(event.metadata);

    const { data: parts, error: pErr } = await supabase
      .from('event_participations')
      .select('user_id, data, computed_points, status')
      .eq('event_id', eventId);

    if (pErr) throw pErr;

    const rows = (parts || []).map((p) => {
      const rawData = p.data && typeof p.data === 'object' ? p.data : {};
      const stats = calculateBmPoints(rawData, missions);
      const daysActive = [1, 2, 3, 4, 5].filter((d) => {
        const day = rawData[`day_${d}`];
        return day && (day.dedication || day.skill || day.teamwork);
      }).length;

      return {
        total_points: stats.total_points,
        completed_missions: stats.completed_missions,
        days_active: daysActive,
        purchased: Boolean(rawData.purchased)
      };
    });

    const realParticipants = rows.filter(
      (r) => r.total_points > 0 || r.completed_missions > 0
    );

    const totalParticipants = realParticipants.length;
    const totalPoints = realParticipants.reduce((s, r) => s + r.total_points, 0);
    const totalMissions = realParticipants.reduce((s, r) => s + r.completed_missions, 0);
    const purchasedCount = realParticipants.filter((r) => r.purchased).length;
    const avgPoints = totalParticipants > 0
      ? Math.round(totalPoints / totalParticipants)
      : 0;
    const maxPoints = realParticipants.reduce(
      (m, r) => Math.max(m, r.total_points),
      0
    );
    const avgDaysActive = totalParticipants > 0
      ? Math.round(
          (realParticipants.reduce((s, r) => s + r.days_active, 0) /
            totalParticipants) *
            10
        ) / 10
      : 0;

    return res.json({
      success: true,
      event_id: eventId,
      event_name: event.name,
      event_status: event.status,
      stats: {
        total_participants: totalParticipants,
        total_points_accumulated: totalPoints,
        aircraft_purchased_count: purchasedCount,
        missions_completed_total: totalMissions,
        average_points: avgPoints,
        max_points_reached: maxPoints,
        days_active_average: avgDaysActive,
        total_participations_raw: rows.length
      },
      data: {
        total_participants: totalParticipants,
        total_points_accumulated: totalPoints,
        aircraft_purchased_count: purchasedCount,
        missions_completed_total: totalMissions,
        average_points: avgPoints,
        max_points_reached: maxPoints,
        days_active_average: avgDaysActive
      }
    });
  } catch (error) {
    console.error('❌ [Events-v2/BM] Error en getBmStatsV2:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      code: 'INTERNAL_ERROR'
    });
  }
};

// ============================================================
// 11. POST /api/events-v2/bm/:eventId/purchase — Reclamar aeronave
// ============================================================

/**
 * Marca la aeronave del BM como reclamada por el piloto autenticado.
 *
 * ALCANCE (suposición S1):
 *   - Actualiza data.purchased = true y data.purchased_at = now() en la participación.
 *   - NO inserta en user_planes.
 *   - NO descuenta shards.
 *
 * Reglas:
 *   - El evento debe estar OPEN y no ser legacy.
 *   - El piloto debe tener participación con total_points > 0.
 *   - Si ya está purchased=true → 409 ALREADY_PURCHASED.
 */
export const purchaseBmDiscountV2 = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user?.id;
    const supabase = getSupabase();
    if (!supabase) {
      return res.status(500).json({
        success: false,
        error: 'Database client unavailable',
        code: 'DB_UNAVAILABLE'
      });
    }

    const { data: events, error: evErr } = await supabase
      .from('events_master')
      .select('*')
      .eq('id', eventId)
      .limit(1);

    if (evErr) throw evErr;
    if (!events || events.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Evento Black Market no encontrado',
        code: 'EVENT_NOT_FOUND'
      });
    }

    const event = events[0];
    if (event.type !== BM_TYPE) {
      return res.status(404).json({
        success: false,
        error: `El evento ${eventId} no es de tipo BLACK_MARKET`,
        code: 'EVENT_NOT_BLACK_MARKET'
      });
    }

    if (!isBmEventOpen(event)) {
      const metadata = event.metadata || {};
      const isLegacy = metadata.legacy_bm === true;
      return res.status(409).json({
        success: false,
        error: isLegacy
          ? 'No se puede comprar en un BM histórico (legacy).'
          : `El evento no está OPEN (status actual: ${event.status}).`,
        code: isLegacy ? 'LEGACY_BM_NO_PURCHASE' : 'EVENT_NOT_OPEN'
      });
    }

    const { data: parts, error: pErr } = await supabase
      .from('event_participations')
      .select('*')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .limit(1);

    if (pErr) throw pErr;
    if (!parts || parts.length === 0) {
      return res.status(409).json({
        success: false,
        error: 'No tienes participación en este evento. Debes completar al menos una misión primero.',
        code: 'NO_PARTICIPATION'
      });
    }

    const participation = parts[0];
    const rawData =
      participation.data && typeof participation.data === 'object'
        ? participation.data
        : buildEmptyDayProgress();

    if (rawData.purchased === true) {
      return res.status(409).json({
        success: false,
        error: 'Ya has reclamado la aeronave de este evento.',
        code: 'ALREADY_PURCHASED',
        purchased_at: rawData.purchased_at || null
      });
    }

    const missions = getMissionsFromMetadata(event.metadata);
    const stats = calculateBmPoints(rawData, missions);
    if (stats.total_points <= 0) {
      return res.status(409).json({
        success: false,
        error: 'No puedes reclamar la aeronave sin haber acumulado puntos.',
        code: 'INSUFFICIENT_POINTS'
      });
    }

    const now = new Date().toISOString();
    const newData = {
      ...rawData,
      purchased: true,
      purchased_at: now
    };

    const { data: updated, error: upErr } = await supabase
      .from('event_participations')
      .update({
        data: newData,
        updated_at: now
      })
      .eq('id', participation.id)
      .select()
      .single();

    if (upErr) throw upErr;

    await logSecurityEvent({
      supabase,
      userId,
      nick: req.user?.nick || 'Piloto',
      event: 'PURCHASE_BM_AIRCRAFT_V2',
      metadata: {
        event_id: eventId,
        aircraft_id: event.metadata?.aircraft_id || null,
        total_points: stats.total_points,
        discount_percentage: stats.discount_percentage
      }
    });

    console.log(
      `💎 [Events-v2/BM] ${req.user?.nick || 'Piloto'} reclamó aeronave de ${event.name} ` +
        `con ${stats.total_points} pts (${stats.discount_percentage}%)`
    );

    return res.json({
      success: true,
      message: '¡Aeronave reclamada exitosamente!',
      purchased: true,
      purchased_at: now,
      total_points: stats.total_points,
      discount_percentage: stats.discount_percentage,
      participation: updated,
      data: newData
    });
  } catch (error) {
    console.error('❌ [Events-v2/BM] Error en purchaseBmDiscountV2:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      code: 'INTERNAL_ERROR'
    });
  }
};

// ============================================================
// EXPORT DEFAULT CONSOLIDADO
// ============================================================

export default {
  // Lectura
  getBmActiveEventV2,
  getBmEventByIdV2,
  getBmEventsV2,
  getBmProgressV2,
  getBmLeaderboardV2,
  getBmDiscountV2,
  getBmStatsV2,
  // Escritura
  createBmEventV2,
  updateBmEventV2,
  updateBmProgressV2,
  purchaseBmDiscountV2
};