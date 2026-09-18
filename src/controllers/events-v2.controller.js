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
  getMetadataSchema
} from '../utils/eventSchemas.js';

// ============================================================
// HELPERS
// ============================================================

function calculateWindowCloseMs(event) {
  if (!event || !event.end_date) return 86400000;
  const now = Date.now();
  const endDate = new Date(event.end_date).getTime();
  return Math.max(0, endDate - now);
}

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
  return {
    ...event,
    target_members: metadata.target_members ?? 0,
    target_tokens: metadata.target_tokens ?? 0,
    is_open: isEventOpen(event),
    inWindow: isEventOpen(event),
    windowCloseMs: calculateWindowCloseMs(event)
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
// 2. GET /api/events-v2/active — Evento activo (OPEN)
// ============================================================

export const getActiveEvent = async (req, res) => {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return res.status(500).json({
        success: false,
        error: 'Database client unavailable',
        event: null
      });
    }

    const { data: events, error } = await supabase
      .from('events_master')
      .select('*')
      .eq('status', 'OPEN')
      .limit(1);

    if (error) throw error;

    const activeEvent = events && events.length > 0 ? events[0] : null;
    const normalized = normalizeEvent(activeEvent);

    return res.json({
      success: true,
      event: normalized,
      inWindow: normalized ? normalized.is_open : false,
      windowCloseMs: normalized ? normalized.windowCloseMs : 0
    });
  } catch (error) {
    console.error('❌ [Events-v2] Error en getActiveEvent:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      event: null
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
        details: error.errors
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
        details: error.errors
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
        details: error.errors
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