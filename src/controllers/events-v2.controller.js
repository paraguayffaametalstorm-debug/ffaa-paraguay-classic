/**
 * ============================================================================
 * PARAGUAY-FFAA | METALSTORM
 * CONTROLADOR UNIFICADO DE EVENTOS — v2 (Aditivo, no destructivo)
 * ============================================================================
 * Propósito:
 *   Manejar eventos (SQ, BM, ACE) desde /api/events-v2/*.
 *   NO reemplaza al controlador actual (events.controller.js).
 *   Coexiste en paralelo para validación antes de migrar el frontend.
 *
 * Endpoints cubiertos:
 *   - GET    /api/events-v2               → getEvents
 *   - GET    /api/events-v2/active        → getActiveEvent
 *   - GET    /api/events-v2/open          → getActiveEvent (alias)
 *   - GET    /api/events-v2/:id           → getEventById
 *   - POST   /api/events-v2               → createEvent
 *   - PUT    /api/events-v2/:id           → updateEvent
 *   - PATCH  /api/events-v2/:id/status    → changeEventStatus
 *   - DELETE /api/events-v2/:id           → deleteEvent
 *
 * Versión: v2.0
 * Fecha: 2026-09-17
 * Autor: PJPIROVANI (OWNER)
 * ============================================================================
 */

import { getSupabase } from '../db/supabase.js';
import {
  CreateEventSchema,
  UpdateEventSchema,
  ChangeEventStatusSchema,
  CreateParticipationSchema,
  UpdateParticipationSchema,
  getMetadataSchema,
  getParticipationDataSchema
} from '../utils/eventSchemas.js';
import {
  validateSubmissionWindow,
  getSubmissionWindowStatus
} from '../utils/submissionWindow.js';

// ============================================================
// HELPERS
// ============================================================

function isEventOpen(event) {
  return Boolean(event && event.status === 'OPEN');
}

/**
 * Normaliza un evento para respuesta.
 * Incluye campos desnormalizados desde metadata para compatibilidad
 * con el frontend legacy que espera target_members / target_tokens.
 */
function normalizeEvent(event) {
  if (!event) return null;
  const metadata = event.metadata || {};
  const windowStatus = getSubmissionWindowStatus(event);
  return {
    ...event,
    target_members: metadata.target_members ?? 0,
    target_tokens: metadata.target_tokens ?? 0,
    is_open: isEventOpen(event),
    inWindow: windowStatus.can_submit,
    windowCloseMs: windowStatus.seconds_remaining * 1000,
    submission_opens_at: windowStatus.submission_opens_at,
    submission_closes_at: windowStatus.submission_closes_at
  };
}

// ============================================================
// 1. GET /api/events-v2 — Listar eventos
// ============================================================

export const getEvents = async (req, res) => {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return res.status(500).json({
        success: false,
        error: 'Database client unavailable',
        events: [],
        event: null,
        inWindow: true,
        windowCloseMs: 86400000
      });
    }

    const { type, status, limit } = req.query;
    const maxResults = Math.min(parseInt(limit, 10) || 20, 100);

    let query = supabase
      .from('events_master')
      .select('*')
      .order('start_date', { ascending: false })
      .limit(maxResults);

    if (type) query = query.eq('type', type);
    if (status) query = query.eq('status', status);

    const { data: events, error } = await query;
    if (error) throw error;

    const eventsList = events || [];
    const activeEvent = eventsList.find(e => e.status === 'OPEN') || eventsList[0] || null;
    const normalizedActive = normalizeEvent(activeEvent);

    return res.json({
      success: true,
      events: eventsList.map(normalizeEvent),
      event: normalizedActive,
      inWindow: normalizedActive ? normalizedActive.is_open : true,
      windowCloseMs: normalizedActive ? normalizedActive.windowCloseMs : 86400000
    });
  } catch (error) {
    console.error('❌ [Events-v2] Error en getEvents:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      events: [],
      event: null,
      inWindow: true,
      windowCloseMs: 86400000
    });
  }
};

// ============================================================
// 2. GET /api/events-v2/active — Evento activo (OPEN o grace period)
// ============================================================

/**
 * Devuelve el evento "activo" para el dashboard.
 *
 * Estrategia (HALL-066 / ADR-008):
 *   1. Busca un evento OPEN dentro de su ventana temporal (start_date <= NOW <= end_date).
 *   2. Si no existe, busca el último evento CLOSED cuya submission_closes_at > NOW
 *      (período de gracia: evento cerrado pero ventana de carga abierta).
 *   3. Marca la respuesta con `isGracePeriod` para que el frontend distinga.
 *
 * Respuesta:
 *   {
 *     success: true,
 *     event: {...},
 *     isGracePeriod: boolean,
 *     inWindow: boolean,       // ¿la ventana de submission está abierta?
 *     windowCloseMs: number     // ms restantes hasta submission_closes_at
 *   }
 */
export const getActiveEvent = async (req, res) => {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return res.status(500).json({
        success: false,
        error: 'Database client unavailable',
        event: null,
        isGracePeriod: false
      });
    }

    const now = new Date().toISOString();

    // -------------------------------------------------------------
    // PASO 1: Buscar evento OPEN dentro de su ventana temporal
    // -------------------------------------------------------------
    const { data: openEvents, error: openErr } = await supabase
      .from('events_master')
      .select('*')
      .eq('status', 'OPEN')
      .lte('start_date', now)
      .gte('end_date', now)
      .order('start_date', { ascending: false })
      .limit(1);

    if (openErr) throw openErr;

    let activeEvent = openEvents && openEvents.length > 0 ? openEvents[0] : null;
    let isGracePeriod = false;

    // -------------------------------------------------------------
    // PASO 2: Si no hay OPEN, buscar último CLOSED con ventana abierta
    // (período de gracia — ADR-008)
    // -------------------------------------------------------------
    if (!activeEvent) {
      const { data: graceEvents, error: graceErr } = await supabase
        .from('events_master')
        .select('*')
        .eq('status', 'CLOSED')
        .gt('submission_closes_at', now)   // ventana aún abierta
        .order('end_date', { ascending: false })
        .limit(1);

      if (graceErr) throw graceErr;

      if (graceEvents && graceEvents.length > 0) {
        activeEvent = graceEvents[0];
        isGracePeriod = true;
      }
    }

    // -------------------------------------------------------------
    // PASO 3: Log de diagnóstico si no hay nada
    // -------------------------------------------------------------
    if (!activeEvent) {
      console.log(
        '⚠️ [Events-v2] Sin evento activo. ' +
        '(No hay OPEN dentro de ventana ni CLOSED con ventana abierta).'
      );
    }

    // -------------------------------------------------------------
    // PASO 4: Normalizar y responder
    // -------------------------------------------------------------
    const normalized = normalizeEvent(activeEvent);

    return res.json({
      success: true,
      event: normalized,
      isGracePeriod,
      inWindow: normalized ? normalized.inWindow : false,
      windowCloseMs: normalized ? normalized.windowCloseMs : 0
    });

  } catch (error) {
    console.error('❌ [Events-v2] Error en getActiveEvent:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      event: null,
      isGracePeriod: false
    });
  }
};

// ============================================================
// 3. GET /api/events-v2/:id — Detalle de un evento
// ============================================================

export const getEventById = async (req, res) => {
  try {
    const { id } = req.params;
    const supabase = getSupabase();
    if (!supabase) {
      return res.status(500).json({
        success: false,
        error: 'Database client unavailable'
      });
    }

    const { data: events, error } = await supabase
      .from('events_master')
      .select('*')
      .eq('id', id)
      .limit(1);

    if (error) throw error;

    if (!events || events.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Evento no encontrado',
        code: 'EVENT_NOT_FOUND'
      });
    }

    const normalized = normalizeEvent(events[0]);
    return res.json({
      success: true,
      event: normalized,
      data: normalized
    });
  } catch (error) {
    console.error('❌ [Events-v2] Error en getEventById:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ============================================================
// 4. POST /api/events-v2 — Crear evento (ADMIN/OWNER)
// ============================================================

export const createEvent = async (req, res) => {
  try {
    const payload = CreateEventSchema.parse(req.body);
    const supabase = getSupabase();
    if (!supabase) {
      return res.status(500).json({
        success: false,
        error: 'Database client unavailable'
      });
    }

    const metadataSchema = getMetadataSchema(payload.type);
    const validatedMetadata = metadataSchema.parse(payload.metadata || {});

    const eventData = {
      type: payload.type,
      name: payload.name,
      start_date: payload.start_date || new Date().toISOString(),
      end_date: payload.end_date || null,
      status: payload.status,
      metadata: validatedMetadata,
      legacy_event_id: payload.legacy_event_id || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: req.user?.id || null
    };

    const { data: created, error } = await supabase
      .from('events_master')
      .insert(eventData)
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json({
      success: true,
      message: `Evento ${payload.type} creado exitosamente`,
      event: normalizeEvent(created),
      data: normalizeEvent(created)
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
    console.error('❌ [Events-v2] Error en createEvent:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ============================================================
// 5. PUT /api/events-v2/:id — Editar evento (ADMIN/OWNER)
// ============================================================

export const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const payload = UpdateEventSchema.parse(req.body);
    const supabase = getSupabase();
    if (!supabase) {
      return res.status(500).json({
        success: false,
        error: 'Database client unavailable'
      });
    }

    const { data: existing, error: queryErr } = await supabase
      .from('events_master')
      .select('id, type, metadata')
      .eq('id', id)
      .limit(1);

    if (queryErr) throw queryErr;
    if (!existing || existing.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Evento no encontrado',
        code: 'EVENT_NOT_FOUND'
      });
    }

    const existingEvent = existing[0];
    let validatedMetadata = existingEvent.metadata;
    if (payload.metadata) {
      const metadataSchema = getMetadataSchema(existingEvent.type);
      validatedMetadata = metadataSchema.parse(payload.metadata);
    }

    const updateData = {
      ...(payload.name && { name: payload.name }),
      ...(payload.start_date && { start_date: payload.start_date }),
      ...(payload.end_date && { end_date: payload.end_date }),
      ...(payload.metadata && { metadata: validatedMetadata }),
      updated_at: new Date().toISOString()
    };

    const { data: updated, error } = await supabase
      .from('events_master')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return res.json({
      success: true,
      message: `Evento actualizado exitosamente`,
      event: normalizeEvent(updated),
      data: normalizeEvent(updated)
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
    console.error('❌ [Events-v2] Error en updateEvent:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ============================================================
// 6. PATCH /api/events-v2/:id/status — Cambiar status (switch funcional)
// ============================================================

export const changeEventStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = ChangeEventStatusSchema.parse(req.body);
    const supabase = getSupabase();
    if (!supabase) {
      return res.status(500).json({
        success: false,
        error: 'Database client unavailable'
      });
    }

    const { data: existing, error: queryErr } = await supabase
      .from('events_master')
      .select('id, type, status, name')
      .eq('id', id)
      .limit(1);

    if (queryErr) throw queryErr;
    if (!existing || existing.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Evento no encontrado',
        code: 'EVENT_NOT_FOUND'
      });
    }

    const event = existing[0];

    if (status === 'OPEN') {
      const { data: openEvents, error: openErr } = await supabase
        .from('events_master')
        .select('id')
        .eq('status', 'OPEN')
        .neq('id', id);

      if (openErr) throw openErr;

      if (openEvents && openEvents.length > 0) {
        const now = new Date().toISOString();
        const { error: closeErr } = await supabase
          .from('events_master')
          .update({ status: 'CLOSED', closed_at: now, updated_at: now })
          .eq('id', openEvents[0].id);

        if (closeErr) throw closeErr;
      }
    }

    const now = new Date().toISOString();
    const updateData = {
      status,
      updated_at: now,
      ...(status === 'CLOSED' && { closed_at: now, closed_by: req.user?.id || null })
    };

    const { data: updated, error } = await supabase
      .from('events_master')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return res.json({
      success: true,
      message: `Evento ${event.name} cambiado a ${status}`,
      event: normalizeEvent(updated),
      data: normalizeEvent(updated)
    });
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: 'Status inválido',
        code: 'VALIDATION_ERROR',
        details: error.issues
      });
    }
    console.error('❌ [Events-v2] Error en changeEventStatus:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ============================================================
// 7. DELETE /api/events-v2/:id — Eliminar evento (solo SCHEDULED)
// ============================================================

export const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const supabase = getSupabase();
    if (!supabase) {
      return res.status(500).json({
        success: false,
        error: 'Database client unavailable'
      });
    }

    const { data: existing, error: queryErr } = await supabase
      .from('events_master')
      .select('id, name, status')
      .eq('id', id)
      .limit(1);

    if (queryErr) throw queryErr;
    if (!existing || existing.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Evento no encontrado',
        code: 'EVENT_NOT_FOUND'
      });
    }

    const event = existing[0];

    if (event.status !== 'SCHEDULED') {
      return res.status(409).json({
        success: false,
        error: `Solo se pueden eliminar eventos en estado SCHEDULED. Este está en ${event.status}.`,
        code: 'EVENT_NOT_DELETABLE'
      });
    }

    const { error: deleteErr } = await supabase
      .from('events_master')
      .delete()
      .eq('id', id);

    if (deleteErr) throw deleteErr;

    return res.json({
      success: true,
      message: `Evento ${event.name} eliminado exitosamente`,
      deleted_id: id
    });
  } catch (error) {
    console.error('❌ [Events-v2] Error en deleteEvent:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
// ============================================================
// 8. GET /api/events-v2/:id/participations — Listar participaciones
// ============================================================

export const getParticipations = async (req, res) => {
  try {
    const { id: eventId } = req.params;
    const supabase = getSupabase();
    if (!supabase) {
      return res.status(500).json({
        success: false,
        error: 'Database client unavailable'
      });
    }

    // Verificar que el evento existe
    const { data: events, error: eventErr } = await supabase
      .from('events_master')
      .select('id, type, name')
      .eq('id', eventId)
      .limit(1);

    if (eventErr) throw eventErr;
    if (!events || events.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Evento no encontrado',
        code: 'EVENT_NOT_FOUND'
      });
    }

    const { data: participations, error } = await supabase
      .from('event_participations')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return res.json({
      success: true,
      event: events[0],
      participations: participations || [],
      count: (participations || []).length
    });
  } catch (error) {
    console.error('❌ [Events-v2] Error en getParticipations:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ============================================================
// 9. POST /api/events-v2/:id/participations — Crear participación
// ============================================================

export const createParticipation = async (req, res) => {
  try {
    const { id: eventId } = req.params;
    const payload = CreateParticipationSchema.parse(req.body);
    const supabase = getSupabase();
    if (!supabase) {
      return res.status(500).json({
        success: false,
        error: 'Database client unavailable'
      });
    }

    // 1. Verificar que el evento existe y está OPEN
    const { data: events, error: eventErr } = await supabase
      .from('events_master')
      .select('id, type, status, name')
      .eq('id', eventId)
      .limit(1);

    if (eventErr) throw eventErr;
    if (!events || events.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Evento no encontrado',
        code: 'EVENT_NOT_FOUND'
      });
    }

    const event = events[0];

    // 2. ADR-008: validar ventana de carga (independiente del status).
    // Un evento CLOSED con ventana abierta (grace period) TAMBIÉN acepta cargas.
    const windowCheck = validateSubmissionWindow(event);
    if (!windowCheck.valid) {
      return res.status(409).json({
        success: false,
        error: windowCheck.message,
        code: windowCheck.code,
        details: windowCheck.details
      });
    }

    // 3. Validar data según el tipo de evento
    const dataSchema = getParticipationDataSchema(event.type);
    const validatedData = dataSchema.parse(payload.data);

    // 4. Determinar user_id (propio o target por ADMIN/OWNER)
    // v4.5.2-hotfix: event_participations.user_id es UUID.
    // Si payload.user_id viene como INTEGER (users.user_id), resolver a users.id (UUID).
    let rawUserId = payload.user_id !== undefined ? payload.user_id : req.user?.id;
    let targetNick = payload.nick || req.user?.nick;

    let targetUserId = rawUserId;

    // Si rawUserId es un número (INTEGER), resolver a UUID
    const isNumeric = typeof rawUserId === 'number' ||
      (typeof rawUserId === 'string' && /^\d+$/.test(rawUserId));
    const isUuid = typeof rawUserId === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawUserId);

    if (isNumeric) {
      const { data: userRows, error: userErr } = await supabase
        .from('users')
        .select('id, nick')
        .eq('user_id', Number(rawUserId))
        .limit(1);

      if (userErr) throw userErr;
      if (!userRows || userRows.length === 0) {
        return res.status(404).json({
          success: false,
          error: `No existe un usuario con user_id = ${rawUserId}.`,
          code: 'USER_NOT_FOUND'
        });
      }
      targetUserId = userRows[0].id;
      if (!targetNick) targetNick = userRows[0].nick;
    } else if (!isUuid) {
      return res.status(400).json({
        success: false,
        error: 'user_id debe ser un UUID o un entero positivo.',
        code: 'INVALID_USER_ID'
      });
    }

    // 5. Insertar participación
    const participationData = {
      event_id: eventId,
      user_id: targetUserId,
      nick: targetNick,
      data: validatedData,
      computed_points: payload.computed_points ?? 0,
      status: payload.status || 'PENDING',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: req.user?.id || null
    };

    const { data: created, error } = await supabase
      .from('event_participations')
      .insert(participationData)
      .select()
      .single();

    if (error) {
      // Manejar conflicto de duplicado (UNIQUE event_id + user_id)
      if (error.code === '23505') {
        return res.status(409).json({
          success: false,
          error: 'Ya existe una participación para este piloto en este evento.',
          code: 'PARTICIPATION_EXISTS'
        });
      }
      throw error;
    }

    return res.status(201).json({
      success: true,
      message: `Participación creada exitosamente`,
      participation: created,
      data: created
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
    console.error('❌ [Events-v2] Error en createParticipation:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ============================================================
// 10. PUT /api/events-v2/:id/participations/:uid — Editar participación
// ============================================================

export const updateParticipation = async (req, res) => {
  try {
    const { id: eventId, uid: userId } = req.params;
    const payload = UpdateParticipationSchema.parse(req.body);
    const supabase = getSupabase();
    if (!supabase) {
      return res.status(500).json({
        success: false,
        error: 'Database client unavailable'
      });
    }

    // ADR-008: fetch + validar ventana de carga (updateParticipation)
    const { data: evData, error: evErr } = await supabase
      .from('events_master')
      .select('id, type, status, submission_opens_at, submission_closes_at')
      .eq('id', eventId)
      .limit(1);

    if (evErr) throw evErr;
    if (!evData || evData.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Evento no encontrado',
        code: 'EVENT_NOT_FOUND'
      });
    }

    const windowCheck = validateSubmissionWindow(evData[0]);
    if (!windowCheck.valid) {
      return res.status(409).json({
        success: false,
        error: windowCheck.message,
        code: windowCheck.code,
        details: windowCheck.details
      });
    }

    // Verificar que la participación existe
    const { data: existing, error: queryErr } = await supabase
      .from('event_participations')
      .select('id, data, status')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .limit(1);

    if (queryErr) throw queryErr;
    if (!existing || existing.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Participación no encontrada',
        code: 'PARTICIPATION_NOT_FOUND'
      });
    }

    const updateData = {
      ...(payload.data && { data: payload.data }),
      ...(payload.computed_points !== undefined && { computed_points: payload.computed_points }),
      ...(payload.status && { status: payload.status }),
      updated_at: new Date().toISOString()
    };

    const { data: updated, error } = await supabase
      .from('event_participations')
      .update(updateData)
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    return res.json({
      success: true,
      message: `Participación actualizada exitosamente`,
      participation: updated,
      data: updated
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
    console.error('❌ [Events-v2] Error en updateParticipation:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ============================================================
// 10.5. GET /api/events-v2/:id/submission-window — Ventana de carga
// ============================================================

/**
 * Devuelve el estado de la ventana de carga del evento.
 * ADR-008: la ventana está desacoplada del ciclo del evento.
 *   - SQ: 7 días (Jue 09:00 PY → Jue 08:59 PY).
 *   - BM: 6 días (Mié 17:00 PY → Mar 16:59 PY).
 */
export const getSubmissionWindow = async (req, res) => {
  try {
    const { id: eventId } = req.params;
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
      .select('id, type, name, status, submission_opens_at, submission_closes_at')
      .eq('id', eventId)
      .limit(1);

    if (error) throw error;
    if (!events || events.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Evento no encontrado',
        code: 'EVENT_NOT_FOUND'
      });
    }

    const event = events[0];
    const windowStatus = getSubmissionWindowStatus(event);

    return res.json({
      success: true,
      event_id: event.id,
      event_type: event.type,
      event_name: event.name,
      event_status: event.status,
      submission_opens_at: windowStatus.submission_opens_at,
      submission_closes_at: windowStatus.submission_closes_at,
      status: windowStatus.status,
      seconds_remaining: windowStatus.seconds_remaining,
      seconds_until_open: windowStatus.seconds_until_open,
      can_submit: windowStatus.can_submit
    });
  } catch (error) {
    console.error('❌ [Events-v2] Error en getSubmissionWindow:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      code: 'INTERNAL_ERROR'
    });
  }
};

// ============================================================
// 11. DELETE /api/events-v2/:id/participations/:uid — Eliminar participación
// ============================================================

export const deleteParticipation = async (req, res) => {
  try {
    const { id: eventId, uid: userId } = req.params;
    const supabase = getSupabase();
    if (!supabase) {
      return res.status(500).json({
        success: false,
        error: 'Database client unavailable'
      });
    }

    const { data: existing, error: queryErr } = await supabase
      .from('event_participations')
      .select('id, nick')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .limit(1);

    if (queryErr) throw queryErr;
    if (!existing || existing.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Participación no encontrada',
        code: 'PARTICIPATION_NOT_FOUND'
      });
    }

    const { error: deleteErr } = await supabase
      .from('event_participations')
      .delete()
      .eq('event_id', eventId)
      .eq('user_id', userId);

    if (deleteErr) throw deleteErr;

    return res.json({
      success: true,
      message: `Participación de ${existing[0].nick} eliminada exitosamente`,
      deleted_user_id: userId
    });
  } catch (error) {
    console.error('❌ [Events-v2] Error en deleteParticipation:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};