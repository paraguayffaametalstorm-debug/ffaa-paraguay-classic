/**
 * ============================================================
 * PARAGUAY-FFAA | METALSTORM - Controlador de Black Market (BM)
 * Módulo de Eventos Especiales, Misiones Diarias y Descuentos (v3.7.0)
 * ============================================================
 */

import { getSupabase } from '../db/supabase.js';
import { logAuditChange, logSecurityEvent } from '../utils/audit.js';
import {
  BmEventSchema,
  UpdateBmEventSchema,
  BmMissionSchema,
  UpdateBmMissionSchema,
  CompleteBmMissionSchema
} from '../utils/schemas.js';

// ============================================================
// GENERADOR DE MISIONES DIARIAS POR DEFECTO (15 misiones, 5 días)
// ============================================================
export function generateDefaultMissions(eventId) {
  return [
    // Día 1
    {
      id: `${eventId}-d1-m1`,
      bm_event_id: eventId,
      day: 1,
      type: 'dedication',
      description: 'Volar 3 partidas con Cazas Ligeros de combate',
      requirement: 'Volar 3 partidas con cazas tácticos ligeros',
      target_value: 3,
      points: 15,
      is_active: true
    },
    {
      id: `${eventId}-d1-m2`,
      bm_event_id: eventId,
      day: 1,
      type: 'skill',
      description: 'Alcanzar un mínimo de 100 trofeos con cualquier caza del hangar',
      requirement: 'Volar aviones con al menos 100 trofeos acumulados',
      target_value: 100,
      points: 15,
      is_active: true
    },
    {
      id: `${eventId}-d1-m3`,
      bm_event_id: eventId,
      day: 1,
      type: 'teamwork',
      description: 'Jugar 2 partidas en escuadrilla con compañeros de escuadrón',
      requirement: 'Jugar con al menos 2 compañeros de escuadrón en grupo',
      target_value: 2,
      points: 10,
      is_active: true
    },
    // Día 2
    {
      id: `${eventId}-d2-m1`,
      bm_event_id: eventId,
      day: 2,
      type: 'dedication',
      description: 'Volar 3 partidas con Cazas Interceptores de alta cota',
      requirement: 'Volar 3 partidas con interceptores supersónicos',
      target_value: 3,
      points: 15,
      is_active: true
    },
    {
      id: `${eventId}-d2-m2`,
      bm_event_id: eventId,
      day: 2,
      type: 'skill',
      description: 'Alcanzar un mínimo de 250 trofeos en combate aéreo',
      requirement: 'Volar aviones con al menos 250 trofeos acumulados',
      target_value: 250,
      points: 15,
      is_active: true
    },
    {
      id: `${eventId}-d2-m3`,
      bm_event_id: eventId,
      day: 2,
      type: 'teamwork',
      description: 'Jugar 3 partidas en escuadrilla con compañeros de escuadrón',
      requirement: 'Jugar con al menos 3 compañeros de escuadrón en grupo',
      target_value: 3,
      points: 10,
      is_active: true
    },
    // Día 3
    {
      id: `${eventId}-d3-m1`,
      bm_event_id: eventId,
      day: 3,
      type: 'dedication',
      description: 'Volar 4 partidas con Cazas Polivalentes / Multirrol',
      requirement: 'Volar 4 partidas con aeronaves polivalentes',
      target_value: 4,
      points: 15,
      is_active: true
    },
    {
      id: `${eventId}-d3-m2`,
      bm_event_id: eventId,
      day: 3,
      type: 'skill',
      description: 'Alcanzar un mínimo de 400 trofeos en combate aéreo',
      requirement: 'Volar aviones con al menos 400 trofeos acumulados',
      target_value: 400,
      points: 15,
      is_active: true
    },
    {
      id: `${eventId}-d3-m3`,
      bm_event_id: eventId,
      day: 3,
      type: 'teamwork',
      description: 'Jugar 4 partidas en escuadrilla con compañeros de escuadrón',
      requirement: 'Jugar con al menos 4 compañeros de escuadrón en grupo',
      target_value: 4,
      points: 10,
      is_active: true
    },
    // Día 4
    {
      id: `${eventId}-d4-m1`,
      bm_event_id: eventId,
      day: 4,
      type: 'dedication',
      description: 'Volar 4 partidas con Cazas Pesados de Superioridad Aérea',
      requirement: 'Volar 4 partidas con cazas pesados',
      target_value: 4,
      points: 15,
      is_active: true
    },
    {
      id: `${eventId}-d4-m2`,
      bm_event_id: eventId,
      day: 4,
      type: 'skill',
      description: 'Alcanzar un mínimo de 550 trofeos en combate aéreo',
      requirement: 'Volar aviones con al menos 550 trofeos acumulados',
      target_value: 550,
      points: 15,
      is_active: true
    },
    {
      id: `${eventId}-d4-m3`,
      bm_event_id: eventId,
      day: 4,
      type: 'teamwork',
      description: 'Jugar 5 partidas en escuadrilla con compañeros de escuadrón',
      requirement: 'Jugar con al menos 5 compañeros de escuadrón en grupo',
      target_value: 5,
      points: 10,
      is_active: true
    },
    // Día 5
    {
      id: `${eventId}-d5-m1`,
      bm_event_id: eventId,
      day: 5,
      type: 'dedication',
      description: 'Volar 5 partidas con Cazas de 5ta Generación o Cazas de Élite',
      requirement: 'Volar 5 partidas con cazas de máxima categoría',
      target_value: 5,
      points: 15,
      is_active: true
    },
    {
      id: `${eventId}-d5-m2`,
      bm_event_id: eventId,
      day: 5,
      type: 'skill',
      description: 'Alcanzar un mínimo de 700-800 trofeos en combate aéreo',
      requirement: 'Volar aviones con al menos 700 trofeos acumulados',
      target_value: 700,
      points: 15,
      is_active: true
    },
    {
      id: `${eventId}-d5-m3`,
      bm_event_id: eventId,
      day: 5,
      type: 'teamwork',
      description: 'Jugar 6 partidas en escuadrilla con compañeros de escuadrón',
      requirement: 'Jugar con al menos 6 compañeros de escuadrón en grupo',
      target_value: 6,
      points: 10,
      is_active: true
    }
  ];
}

// ============================================================
// ALMACÉN REACTIVO EN MEMORIA (FALLBACK SEGURO)
// ============================================================
const nowIso = new Date().toISOString();
const wednesdayStart = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
const sundayEnd = new Date(Date.now() + 4 * 24 * 3600 * 1000).toISOString();

let inMemoryBmEvents = [
  {
    id: 1,
    name: 'Operación Tormenta Negra · BM 2026',
    description: 'Evento especial Black Market de 5 días. Completa misiones tácticas diarias para acumular hasta un 50% de descuento en el caza exclusivo.',
    start_date: wednesdayStart,
    end_date: sundayEnd,
    is_active: true,
    aircraft_id: '125', // F-15EX Eagle II o modelo destacado
    aircraft_name: 'F-15EX Eagle II',
    max_points: 250,
    max_discount: 50,
    created_at: nowIso,
    created_by: '1'
  }
];

let inMemoryBmMissions = generateDefaultMissions(1);
let inMemoryBmProgress = [];
let inMemoryBmDiscounts = [];

/**
 * Calcula el día actual (1..5) según la fecha de inicio del evento
 */
export function calculateEventDay(event) {
  if (!event || !event.start_date) return 1;
  const start = new Date(event.start_date).getTime();
  const now = Date.now();
  const diffHours = (now - start) / (3600 * 1000);
  const day = Math.floor(diffHours / 24) + 1;
  return Math.min(Math.max(day, 1), 5);
}

/**
 * Recalcula puntos y descuentos de un piloto en un evento Black Market
 */
export function recalculatePilotDiscount(userId, eventId) {
  const userMissions = inMemoryBmProgress.filter(
    p => String(p.user_id) === String(userId) && String(p.bm_event_id) === String(eventId) && p.completed
  );

  // Agrupar por días para calcular misiones completadas y bonus diario
  const completedByDay = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const dayMissionPoints = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  for (const prog of userMissions) {
    const day = prog.day || 1;
    completedByDay[day] = (completedByDay[day] || 0) + 1;
    dayMissionPoints[day] = (dayMissionPoints[day] || 0) + (prog.points_earned || 15);
  }

  let totalPoints = 0;
  let bonusPoints = 0;
  for (let d = 1; d <= 5; d++) {
    const count = completedByDay[d] || 0;
    const basePts = dayMissionPoints[d] || 0;
    const dayBonus = count >= 3 ? 10 : 0;
    bonusPoints += dayBonus;
    // Tope diario: máximo 50 puntos por día (requisito militar estricto)
    const dayTotal = Math.min(50, basePts + dayBonus);
    totalPoints += dayTotal;
  }

  // Máximo 250 puntos por evento (50 puntos x 5 días)
  totalPoints = Math.min(250, Math.max(0, totalPoints));
  // Descuento máximo: 50% (250 puntos -> 50%, es decir, 1% por cada 5 puntos)
  const discountPercentage = Math.min(50, Math.floor(totalPoints / 5));

  const targetEvent = inMemoryBmEvents.find(e => String(e.id) === String(eventId));
  const aircraftId = targetEvent?.aircraft_id || '125';

  let discountRecord = inMemoryBmDiscounts.find(
    d => String(d.user_id) === String(userId) && String(d.bm_event_id) === String(eventId)
  );

  if (!discountRecord) {
    discountRecord = {
      id: inMemoryBmDiscounts.length + 1,
      user_id: userId,
      bm_event_id: eventId,
      total_points: totalPoints,
      discount_percentage: discountPercentage,
      aircraft_id: aircraftId,
      purchased: false,
      purchased_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    inMemoryBmDiscounts.push(discountRecord);
  } else {
    discountRecord.total_points = totalPoints;
    discountRecord.discount_percentage = discountPercentage;
    discountRecord.aircraft_id = aircraftId;
    discountRecord.updated_at = new Date().toISOString();
  }

  return {
    totalPoints,
    discountPercentage,
    completedMissionsCount: userMissions.length,
    completedByDay,
    bonusPoints,
    discountRecord
  };
}

// ============================================================
// 1. EVENTOS BLACK MARKET
// ============================================================

/**
 * GET /api/bm/events
 * Listar todos los eventos BM
 */
export async function getBmEvents(req, res) {
  try {
    const supabase = getSupabase();
    let events = [...inMemoryBmEvents];

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('bm_events')
          .select('*, plane_models(id, name, type, tier, stats_real)')
          .order('start_date', { ascending: false });

        if (!error && data && data.length > 0) {
          events = data;
        }
      } catch (dbErr) {
        console.warn('⚠️ [BM] Fallback a memoria para lista de eventos:', dbErr.message);
      }
    }

    return res.json({
      success: true,
      data: events,
      events: events,
      total: events.length
    });
  } catch (error) {
    console.error('❌ [BM] Error en getBmEvents:', error);
    return res.status(500).json({
      success: false,
      error: 'Error al consultar eventos Black Market',
      details: error.message
    });
  }
}

/**
 * GET /api/bm/events/active
 * Obtiene el evento Black Market activo actual
 */
export async function getBmActiveEvent(req, res) {
  try {
    const supabase = getSupabase();
    let activeEvent = inMemoryBmEvents.find(e => e.is_active);

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('bm_events')
          .select('*, plane_models(id, name, type, tier, stats_real)')
          .eq('is_active', true)
          .maybeSingle();

        if (!error && data) {
          activeEvent = data;
        }
      } catch (dbErr) {
        console.warn('⚠️ [BM] Fallback a memoria para evento activo:', dbErr.message);
      }
    }

    if (!activeEvent) {
      return res.json({
        success: true,
        active: false,
        event: null,
        message: 'No hay ningún evento Black Market activo en este momento'
      });
    }

    const currentDay = calculateEventDay(activeEvent);
    const now = Date.now();
    const end = new Date(activeEvent.end_date).getTime();
    const remainingMs = Math.max(0, end - now);

    return res.json({
      success: true,
      active: true,
      event: activeEvent,
      data: activeEvent,
      current_day: currentDay,
      remaining_ms: remainingMs,
      days_left: Math.ceil(remainingMs / (24 * 3600 * 1000))
    });
  } catch (error) {
    console.error('❌ [BM] Error en getBmActiveEvent:', error);
    return res.status(500).json({
      success: false,
      error: 'Error al consultar evento activo BM',
      details: error.message
    });
  }
}

/**
 * GET /api/bm/events/:id
 * Detalle completo de un evento Black Market con misiones
 */
export async function getBmEventById(req, res) {
  try {
    const { id } = req.params;
    const targetId = String(id).trim();

    let event = inMemoryBmEvents.find(e => String(e.id) === targetId);
    let missions = inMemoryBmMissions.filter(m => String(m.bm_event_id) === targetId && m.is_active !== false);

    const supabase = getSupabase();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('bm_events')
          .select('*, plane_models(id, name, type, tier, stats_real)')
          .eq('id', targetId)
          .maybeSingle();

        if (!error && data) {
          event = data;
        }

        const { data: dbMissions, error: mErr } = await supabase
          .from('bm_missions')
          .select('*')
          .eq('bm_event_id', targetId)
          .eq('is_active', true)
          .order('day', { ascending: true });

        if (!mErr && dbMissions && dbMissions.length > 0) {
          missions = dbMissions;
        }
      } catch (dbErr) {
        console.warn('⚠️ [BM] Fallback en getBmEventById:', dbErr.message);
      }
    }

    if (!event) {
      return res.status(404).json({
        success: false,
        error: `Evento Black Market con ID '${id}' no encontrado`
      });
    }

    const currentDay = calculateEventDay(event);

    return res.json({
      success: true,
      event: event,
      data: event,
      missions: missions,
      current_day: currentDay
    });
  } catch (error) {
    console.error('❌ [BM] Error en getBmEventById:', error);
    return res.status(500).json({
      success: false,
      error: 'Error al consultar evento Black Market',
      details: error.message
    });
  }
}

/**
 * POST /api/bm/events
 * Crear evento Black Market (ADMIN/OWNER)
 * Autogenera las 15 misiones diarias (5 días x 3 tipos) si no existen
 */
export async function createBmEvent(req, res) {
  try {
    const validated = BmEventSchema.parse(req.body);
    const actorId = req.user?.id || req.user?.user_id || 'system';
    const actorNick = req.user?.nick || 'Oficial';

    const newId = inMemoryBmEvents.length > 0
      ? Math.max(...inMemoryBmEvents.map(e => Number(e.id) || 0)) + 1
      : 1;

    const newEvent = {
      id: newId,
      name: validated.name.trim(),
      description: validated.description?.trim() || 'Evento especial Black Market del Escuadrón',
      start_date: validated.start_date,
      end_date: validated.end_date,
      is_active: Boolean(validated.is_active),
      aircraft_id: validated.aircraft_id || '125',
      max_points: validated.max_points || 250,
      max_discount: validated.max_discount || 50,
      created_at: new Date().toISOString(),
      created_by: actorId
    };

    // Si se marca como activo, desactivar otros eventos activos
    if (newEvent.is_active) {
      inMemoryBmEvents.forEach(e => { e.is_active = false; });
    }

    inMemoryBmEvents.unshift(newEvent);

    // Autogenerar misiones por defecto
    const autoMissions = generateDefaultMissions(newId);
    inMemoryBmMissions.push(...autoMissions);

    const supabase = getSupabase();
    if (supabase) {
      try {
        if (newEvent.is_active) {
          await supabase.from('bm_events').update({ is_active: false }).neq('id', -1);
        }

        const { data: dbEvent, error: evErr } = await supabase
          .from('bm_events')
          .insert([newEvent])
          .select()
          .single();

        if (!evErr && dbEvent) {
          newEvent.id = dbEvent.id;
          const dbMissionsPayload = autoMissions.map(m => ({
            ...m,
            bm_event_id: dbEvent.id,
            id: undefined // dejar que Postgres genere el ID
          }));
          await supabase.from('bm_missions').insert(dbMissionsPayload);
        }
      } catch (dbErr) {
        console.warn('⚠️ [BM] Error persistiendo en Supabase, conservado en memoria:', dbErr.message);
      }
    }

    // Auditoría C4ISR
    await logAuditChange({
      supabase,
      actorId,
      actorNick,
      targetId: newEvent.id,
      targetNick: newEvent.name,
      action: 'CREATE_BM_EVENT',
      details: {
        id: newEvent.id,
        name: newEvent.name,
        aircraft_id: newEvent.aircraft_id,
        is_active: newEvent.is_active
      }
    });

    console.log(`🔥 [BM] Evento creado: ${newEvent.name} por ${actorNick}`);

    return res.status(201).json({
      success: true,
      message: `Evento Black Market '${newEvent.name}' creado exitosamente con 15 misiones tácticas`,
      event: newEvent,
      data: newEvent
    });
  } catch (error) {
    console.error('❌ [BM] Error en createBmEvent:', error);
    return res.status(400).json({
      success: false,
      error: error.message || 'Error al crear evento Black Market'
    });
  }
}

/**
 * PUT /api/bm/events/:id
 * Editar evento BM (ADMIN/OWNER)
 */
export async function updateBmEvent(req, res) {
  try {
    const { id } = req.params;
    const targetId = String(id).trim();
    const validated = UpdateBmEventSchema.parse(req.body);
    const actorId = req.user?.id || req.user?.user_id;
    const actorNick = req.user?.nick || 'Oficial';

    const index = inMemoryBmEvents.findIndex(e => String(e.id) === targetId);
    if (index === -1) {
      return res.status(404).json({
        success: false,
        error: `Evento Black Market con ID '${id}' no encontrado`
      });
    }

    if (validated.is_active) {
      inMemoryBmEvents.forEach(e => { e.is_active = false; });
    }

    const updated = {
      ...inMemoryBmEvents[index],
      ...validated,
      updated_at: new Date().toISOString()
    };
    inMemoryBmEvents[index] = updated;

    const supabase = getSupabase();
    if (supabase) {
      try {
        if (validated.is_active) {
          await supabase.from('bm_events').update({ is_active: false }).neq('id', targetId);
        }
        await supabase
          .from('bm_events')
          .update(validated)
          .eq('id', targetId);
      } catch (dbErr) {
        console.warn('⚠️ [BM] Error actualizando en Supabase:', dbErr.message);
      }
    }

    await logAuditChange({
      supabase,
      actorId,
      actorNick,
      targetId,
      targetNick: updated.name,
      action: 'UPDATE_BM_EVENT',
      details: validated
    });

    return res.json({
      success: true,
      message: `Evento Black Market '${updated.name}' actualizado exitosamente`,
      event: updated,
      data: updated
    });
  } catch (error) {
    console.error('❌ [BM] Error en updateBmEvent:', error);
    return res.status(400).json({
      success: false,
      error: error.message || 'Error al actualizar evento Black Market'
    });
  }
}

/**
 * POST /api/bm/events/:id/activate
 * Activar evento BM (ADMIN/OWNER)
 */
export async function activateBmEvent(req, res) {
  try {
    const { id } = req.params;
    const targetId = String(id).trim();
    const actorId = req.user?.id || req.user?.user_id;
    const actorNick = req.user?.nick || 'Oficial';

    const event = inMemoryBmEvents.find(e => String(e.id) === targetId);
    if (!event) {
      return res.status(404).json({
        success: false,
        error: `Evento Black Market con ID '${id}' no encontrado`
      });
    }

    // Desactivar todos los demás y activar este
    inMemoryBmEvents.forEach(e => {
      e.is_active = (String(e.id) === targetId);
    });

    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.from('bm_events').update({ is_active: false }).neq('id', -1);
        await supabase.from('bm_events').update({ is_active: true }).eq('id', targetId);
      } catch (dbErr) {
        console.warn('⚠️ [BM] Error activando en Supabase:', dbErr.message);
      }
    }

    await logAuditChange({
      supabase,
      actorId,
      actorNick,
      targetId,
      targetNick: event.name,
      action: 'ACTIVATE_BM_EVENT',
      details: { id: targetId, name: event.name }
    });

    console.log(`🚀 [BM] Evento '${event.name}' activado por ${actorNick}`);

    return res.json({
      success: true,
      message: `Evento Black Market '${event.name}' activado operacionalmente`,
      event: event,
      data: event
    });
  } catch (error) {
    console.error('❌ [BM] Error en activateBmEvent:', error);
    return res.status(500).json({
      success: false,
      error: 'Error al activar evento Black Market',
      details: error.message
    });
  }
}

/**
 * POST /api/bm/events/:id/deactivate
 * Desactivar evento BM (ADMIN/OWNER)
 */
export async function deactivateBmEvent(req, res) {
  try {
    const { id } = req.params;
    const targetId = String(id).trim();
    const actorId = req.user?.id || req.user?.user_id;
    const actorNick = req.user?.nick || 'Oficial';

    const event = inMemoryBmEvents.find(e => String(e.id) === targetId);
    if (!event) {
      return res.status(404).json({
        success: false,
        error: `Evento Black Market con ID '${id}' no encontrado`
      });
    }

    event.is_active = false;

    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.from('bm_events').update({ is_active: false }).eq('id', targetId);
      } catch (dbErr) {
        console.warn('⚠️ [BM] Error desactivando en Supabase:', dbErr.message);
      }
    }

    await logAuditChange({
      supabase,
      actorId,
      actorNick,
      targetId,
      targetNick: event.name,
      action: 'DEACTIVATE_BM_EVENT',
      details: { id: targetId, name: event.name }
    });

    console.log(`⏹️ [BM] Evento '${event.name}' desactivado por ${actorNick}`);

    return res.json({
      success: true,
      message: `Evento Black Market '${event.name}' desactivado`,
      event: event,
      data: event
    });
  } catch (error) {
    console.error('❌ [BM] Error en deactivateBmEvent:', error);
    return res.status(500).json({
      success: false,
      error: 'Error al desactivar evento Black Market',
      details: error.message
    });
  }
}

// ============================================================
// 2. MISIONES DIARIAS Y PROGRESO
// ============================================================

/**
 * GET /api/bm/missions/today
 * Obtiene las misiones del día actual para el usuario logueado con estado de completitud
 */
export async function getBmMissionsToday(req, res) {
  try {
    const userId = req.user?.id || req.user?.user_id;
    const activeEvent = inMemoryBmEvents.find(e => e.is_active) || inMemoryBmEvents[0];

    if (!activeEvent) {
      return res.json({
        success: true,
        missions: [],
        day: 1,
        message: 'No hay evento Black Market activo actualmente'
      });
    }

    const currentDay = calculateEventDay(activeEvent);
    const eventId = String(activeEvent.id);

    // Misiones del día actual
    const dayMissions = inMemoryBmMissions.filter(
      m => String(m.bm_event_id) === eventId && Number(m.day) === currentDay && m.is_active !== false
    );

    // Progreso del usuario
    const userProgress = inMemoryBmProgress.filter(
      p => String(p.user_id) === String(userId) && String(p.bm_event_id) === eventId && Number(p.day) === currentDay
    );

    const mappedMissions = dayMissions.map(m => {
      const prog = userProgress.find(p => String(p.mission_id) === String(m.id));
      return {
        ...m,
        completed: Boolean(prog?.completed),
        completed_at: prog?.completed_at || null,
        points_earned: prog?.completed ? (prog?.points_earned || m.points || 25) : 0
      };
    });

    const completedCount = mappedMissions.filter(m => m.completed).length;
    const allCompleted = completedCount === 3;
    const bonusEarned = allCompleted ? 25 : 0;
    const dailyTotalPoints = (completedCount * 25) + bonusEarned;

    return res.json({
      success: true,
      event_id: activeEvent.id,
      event_name: activeEvent.name,
      day: currentDay,
      missions: mappedMissions,
      completed_count: completedCount,
      all_completed: allCompleted,
      daily_bonus: bonusEarned,
      daily_total_points: dailyTotalPoints,
      data: mappedMissions
    });
  } catch (error) {
    console.error('❌ [BM] Error en getBmMissionsToday:', error);
    return res.status(500).json({
      success: false,
      error: 'Error al consultar misiones del día',
      details: error.message
    });
  }
}

/**
 * GET /api/bm/missions/:eventId
 * Misiones de un evento agrupadas por día (días 1 a 5)
 */
export async function getBmMissionsByEvent(req, res) {
  try {
    const { eventId } = req.params;
    const targetEventId = String(eventId).trim();
    const userId = req.user?.id || req.user?.user_id;

    const missions = inMemoryBmMissions.filter(
      m => String(m.bm_event_id) === targetEventId && m.is_active !== false
    );

    const userProgress = inMemoryBmProgress.filter(
      p => String(p.user_id) === String(userId) && String(p.bm_event_id) === targetEventId
    );

    const byDay = { 1: [], 2: [], 3: [], 4: [], 5: [] };

    for (const m of missions) {
      const day = Number(m.day) || 1;
      const prog = userProgress.find(p => String(p.mission_id) === String(m.id));
      const enriched = {
        ...m,
        completed: Boolean(prog?.completed),
        completed_at: prog?.completed_at || null,
        points_earned: prog?.completed ? (prog?.points_earned || m.points || 25) : 0
      };
      if (!byDay[day]) byDay[day] = [];
      byDay[day].push(enriched);
    }

    return res.json({
      success: true,
      event_id: targetEventId,
      missions: missions,
      by_day: byDay,
      data: byDay
    });
  } catch (error) {
    console.error('❌ [BM] Error en getBmMissionsByEvent:', error);
    return res.status(500).json({
      success: false,
      error: 'Error al consultar misiones del evento',
      details: error.message
    });
  }
}

/**
 * POST /api/bm/missions/:id/complete
 * Completar o alternar misión (Piloto)
 * Cada misión completada: +25 puntos.
 * Al completar las 3 del día: +25 bonus.
 * Límite máximo: 250 puntos (50% de descuento).
 */
export async function completeBmMission(req, res) {
  try {
    const { id } = req.params;
    const missionId = String(id).trim();
    const userId = req.user?.id || req.user?.user_id;
    const userNick = req.user?.nick || 'Piloto';

    const mission = inMemoryBmMissions.find(m => String(m.id) === missionId);
    if (!mission) {
      return res.status(404).json({
        success: false,
        error: `Misión Black Market '${id}' no encontrada`
      });
    }

    const eventId = String(mission.bm_event_id);
    const day = Number(mission.day) || 1;

    let progressIndex = inMemoryBmProgress.findIndex(
      p => String(p.user_id) === String(userId) && String(p.mission_id) === missionId
    );

    let isCompleted = true;
    if (req.body?.completed !== undefined) {
      isCompleted = Boolean(req.body.completed);
    } else if (progressIndex !== -1) {
      // Toggle si no se especifica
      isCompleted = !inMemoryBmProgress[progressIndex].completed;
    }

    const now = new Date().toISOString();

    if (progressIndex !== -1) {
      inMemoryBmProgress[progressIndex].completed = isCompleted;
      inMemoryBmProgress[progressIndex].completed_at = isCompleted ? now : null;
      inMemoryBmProgress[progressIndex].points_earned = isCompleted ? (mission.points || 25) : 0;
    } else {
      inMemoryBmProgress.push({
        id: inMemoryBmProgress.length + 1,
        user_id: userId,
        bm_event_id: eventId,
        day: day,
        mission_id: missionId,
        completed: isCompleted,
        completed_at: isCompleted ? now : null,
        points_earned: isCompleted ? (mission.points || 25) : 0
      });
    }

    // Recalcular puntos totales y descuento del piloto
    const stats = recalculatePilotDiscount(userId, eventId);

    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase
          .from('bm_progress')
          .upsert({
            user_id: userId,
            bm_event_id: eventId,
            day: day,
            mission_id: missionId,
            completed: isCompleted,
            completed_at: isCompleted ? now : null,
            points_earned: isCompleted ? (mission.points || 25) : 0
          }, { onConflict: 'user_id, bm_event_id, day, mission_id' });

        await supabase
          .from('bm_discounts')
          .upsert({
            user_id: userId,
            bm_event_id: eventId,
            total_points: stats.totalPoints,
            discount_percentage: stats.discountPercentage,
            aircraft_id: stats.discountRecord.aircraft_id,
            updated_at: now
          }, { onConflict: 'user_id, bm_event_id' });
      } catch (dbErr) {
        console.warn('⚠️ [BM] Error guardando progreso en Supabase:', dbErr.message);
      }
    }

    // Auditoría militar
    await logSecurityEvent({
      supabase,
      userId,
      nick: userNick,
      event: isCompleted ? 'COMPLETE_BM_MISSION' : 'UNCOMPLETE_BM_MISSION',
      metadata: {
        mission_id: missionId,
        day,
        type: mission.type,
        total_points: stats.totalPoints,
        discount_percentage: stats.discountPercentage
      }
    });

    console.log(`🎯 [BM] Misión ${missionId} ${isCompleted ? 'completada' : 'desmarcada'} por ${userNick}. Total: ${stats.totalPoints} pts (${stats.discountPercentage}% desc)`);

    return res.json({
      success: true,
      message: isCompleted
        ? `¡Misión de combate cumplida! +${mission.points || 25} puntos añadidos`
        : `Misión desmarcada`,
      completed: isCompleted,
      mission_id: missionId,
      day: day,
      total_points: stats.totalPoints,
      discount_percentage: stats.discountPercentage,
      bonus_points: stats.bonusPoints,
      data: {
        completed: isCompleted,
        total_points: stats.totalPoints,
        discount_percentage: stats.discountPercentage
      }
    });
  } catch (error) {
    console.error('❌ [BM] Error en completeBmMission:', error);
    return res.status(500).json({
      success: false,
      error: 'Error al actualizar estado de misión',
      details: error.message
    });
  }
}

/**
 * GET /api/bm/progress
 * Progreso detallado del combatiente en el evento BM activo
 */
export async function getBmProgress(req, res) {
  try {
    const userId = req.user?.id || req.user?.user_id;
    const activeEvent = inMemoryBmEvents.find(e => e.is_active) || inMemoryBmEvents[0];

    if (!activeEvent) {
      return res.json({
        success: true,
        active: false,
        total_points: 0,
        discount_percentage: 0,
        message: 'No hay evento Black Market activo'
      });
    }

    const eventId = String(activeEvent.id);
    const stats = recalculatePilotDiscount(userId, eventId);
    const currentDay = calculateEventDay(activeEvent);

    const userMissions = inMemoryBmProgress.filter(
      p => String(p.user_id) === String(userId) && String(p.bm_event_id) === eventId
    );

    return res.json({
      success: true,
      active: true,
      event: activeEvent,
      current_day: currentDay,
      total_points: stats.totalPoints,
      max_points: activeEvent.max_points || 250,
      discount_percentage: stats.discountPercentage,
      max_discount: activeEvent.max_discount || 50,
      completed_count: stats.completedMissionsCount,
      completed_by_day: stats.completedByDay,
      bonus_points: stats.bonusPoints,
      discount_record: stats.discountRecord,
      missions_progress: userMissions,
      data: {
        total_points: stats.totalPoints,
        discount_percentage: stats.discountPercentage,
        current_day: currentDay
      }
    });
  } catch (error) {
    console.error('❌ [BM] Error en getBmProgress:', error);
    return res.status(500).json({
      success: false,
      error: 'Error al consultar progreso Black Market',
      details: error.message
    });
  }
}

// ============================================================
// 3. DESCUENTOS Y OFERTA DE AERONAVE
// ============================================================

/**
 * GET /api/bm/discount
 * Descuento acumulado del piloto y ficha técnica de la aeronave en oferta
 */
export async function getBmDiscount(req, res) {
  try {
    const userId = req.user?.id || req.user?.user_id;
    const activeEvent = inMemoryBmEvents.find(e => e.is_active) || inMemoryBmEvents[0];

    if (!activeEvent) {
      return res.json({
        success: true,
        active: false,
        discount_percentage: 0,
        total_points: 0,
        aircraft: null
      });
    }

    const eventId = String(activeEvent.id);
    const stats = recalculatePilotDiscount(userId, eventId);

    // Ficha de la aeronave en oferta
    const aircraftId = activeEvent.aircraft_id || '125';
    let aircraft = {
      id: aircraftId,
      name: activeEvent.aircraft_name || 'F-15EX Eagle II',
      type: 'Caza Pesado de Superioridad Aérea y Ataque',
      tier: 4,
      precio_base: 5000,
      stats_real: { velocidad: 2650, agilidad: 84, blindaje: 1550, potencia_armas: 1900 },
      special_name: 'Salva Masiva AMRAAM',
      passive_name: 'Radar AESA APG-82'
    };

    const supabase = getSupabase();
    if (supabase) {
      try {
        const { data: planeDb } = await supabase
          .from('plane_models')
          .select('*')
          .eq('id', aircraftId)
          .maybeSingle();

        if (planeDb) {
          aircraft = { ...aircraft, ...planeDb };
        }
      } catch (err) {
        console.warn('⚠️ [BM] Fallback en getBmDiscount avión:', err.message);
      }
    }

    const basePrice = aircraft.precio_base || 5000;
    const discountAmount = Math.round((basePrice * stats.discountPercentage) / 100);
    const finalPrice = Math.max(0, basePrice - discountAmount);

    return res.json({
      success: true,
      active: true,
      event_id: activeEvent.id,
      event_name: activeEvent.name,
      aircraft_id: aircraftId,
      aircraft: aircraft,
      total_points: stats.totalPoints,
      max_points: activeEvent.max_points || 250,
      discount_percentage: stats.discountPercentage,
      max_discount: activeEvent.max_discount || 50,
      pricing: {
        base_price: basePrice,
        discount_amount: discountAmount,
        final_price: finalPrice,
        currency: 'Tokens de Combate'
      },
      purchased: Boolean(stats.discountRecord?.purchased),
      purchased_at: stats.discountRecord?.purchased_at || null,
      data: {
        aircraft,
        discount_percentage: stats.discountPercentage,
        final_price: finalPrice
      }
    });
  } catch (error) {
    console.error('❌ [BM] Error en getBmDiscount:', error);
    return res.status(500).json({
      success: false,
      error: 'Error al consultar descuento Black Market',
      details: error.message
    });
  }
}

/**
 * POST /api/bm/discount/purchase
 * Reclamar / adquirir el avión en oferta con el descuento alcanzado
 */
export async function purchaseBmDiscount(req, res) {
  try {
    const userId = req.user?.id || req.user?.user_id;
    const userNick = req.user?.nick || 'Piloto';
    const activeEvent = inMemoryBmEvents.find(e => e.is_active) || inMemoryBmEvents[0];

    if (!activeEvent) {
      return res.status(400).json({
        success: false,
        error: 'No hay evento Black Market activo para realizar la adquisición'
      });
    }

    const eventId = String(activeEvent.id);
    const stats = recalculatePilotDiscount(userId, eventId);

    if (stats.discountRecord?.purchased) {
      return res.status(400).json({
        success: false,
        error: 'Ya has adquirido esta aeronave con descuento en el evento actual'
      });
    }

    const now = new Date().toISOString();
    stats.discountRecord.purchased = true;
    stats.discountRecord.purchased_at = now;

    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase
          .from('bm_discounts')
          .update({
            purchased: true,
            purchased_at: now
          })
          .eq('user_id', userId)
          .eq('bm_event_id', eventId);

        // Opcional: Registrar aeronave en la flota del piloto si la tabla user_planes / planes existe
        const { error: planeErr } = await supabase
          .from('planes')
          .insert({
            user_id: userId,
            avion_id: activeEvent.aircraft_id || '125',
            nivel: 1,
            created_at: now
          });
        if (planeErr) {
          console.warn('⚠️ [BM] Nota al registrar caza en hangar:', planeErr.message);
        }
      } catch (dbErr) {
        console.warn('⚠️ [BM] Error registrando compra en Supabase:', dbErr.message);
      }
    }

    await logSecurityEvent({
      supabase,
      userId,
      nick: userNick,
      event: 'PURCHASE_BM_AIRCRAFT',
      metadata: {
        event_id: eventId,
        aircraft_id: activeEvent.aircraft_id,
        discount_percentage: stats.discountPercentage,
        total_points: stats.totalPoints
      }
    });

    console.log(`✈️ [BM] Aeronave '${activeEvent.aircraft_id}' adquirida por ${userNick} con ${stats.discountPercentage}% de descuento`);

    return res.json({
      success: true,
      message: `¡Aeronave adquirida exitosamente con ${stats.discountPercentage}% de descuento militar! Añadida a tu hangar.`,
      purchased: true,
      purchased_at: now,
      discount_percentage: stats.discountPercentage,
      aircraft_id: activeEvent.aircraft_id
    });
  } catch (error) {
    console.error('❌ [BM] Error en purchaseBmDiscount:', error);
    return res.status(500).json({
      success: false,
      error: 'Error al adquirir aeronave con descuento',
      details: error.message
    });
  }
}

// ============================================================
// 4. TABLA DE POSICIONES Y ESTADÍSTICAS
// ============================================================

/**
 * GET /api/bm/leaderboard
 * Tabla de posiciones con clasificación de pilotos en Black Market
 */
export async function getBmLeaderboard(req, res) {
  try {
    const activeEvent = inMemoryBmEvents.find(e => e.is_active) || inMemoryBmEvents[0];
    const eventId = activeEvent ? String(activeEvent.id) : '1';

    // Obtener miembros del escuadrón
    const supabase = getSupabase();
    let members = [];

    if (supabase) {
      try {
        const { data: dbUsers } = await supabase
          .from('users')
          .select('id, user_id, nick, role, perf_status, status')
          .eq('status', 'ACTIVE')
          .order('nick', { ascending: true });

        if (dbUsers && dbUsers.length > 0) {
          members = dbUsers;
        }
      } catch (err) {
        console.warn('⚠️ [BM] Error leyendo usuarios para leaderboard:', err.message);
      }
    }

    if (members.length === 0) {
      members = [
        { id: 1, nick: 'Condor_01', role: 'ADMIN', perf_status: 'VERDE' },
        { id: 2, nick: 'Guarani_Ace', role: 'VETERANO', perf_status: 'VERDE' },
        { id: 3, nick: 'Chaco_Viper', role: 'MIEMBRO', perf_status: 'VERDE' },
        { id: 4, nick: 'Halcon_99', role: 'MIEMBRO', perf_status: 'NARANJA' }
      ];
    }

    // Mapear puntos y descuentos por miembro
    const leaderboard = members.map(m => {
      const uid = m.id || m.user_id;
      const stats = recalculatePilotDiscount(uid, eventId);
      const isPurchased = Boolean(stats.discountRecord?.purchased);

      return {
        user_id: uid,
        nick: m.nick || 'Piloto',
        role: m.role || 'MIEMBRO',
        perf_status: m.perf_status || 'VERDE',
        total_points: stats.totalPoints,
        discount_percentage: stats.discountPercentage,
        completed_missions: stats.completedMissionsCount,
        days_active: Object.values(stats.completedByDay).filter(c => c > 0).length,
        purchased: isPurchased
      };
    });

    // Ordenar de mayor a menor puntuación
    leaderboard.sort((a, b) => {
      if (b.total_points !== a.total_points) {
        return b.total_points - a.total_points;
      }
      return b.completed_missions - a.completed_missions;
    });

    // Asignar puestos
    leaderboard.forEach((item, index) => {
      item.rank = index + 1;
    });

    return res.json({
      success: true,
      event_id: eventId,
      event_name: activeEvent?.name || 'Black Market',
      total_participants: leaderboard.filter(p => p.total_points > 0).length,
      leaderboard: leaderboard,
      data: leaderboard
    });
  } catch (error) {
    console.error('❌ [BM] Error en getBmLeaderboard:', error);
    return res.status(500).json({
      success: false,
      error: 'Error al consultar tabla de posiciones Black Market',
      details: error.message
    });
  }
}

/**
 * GET /api/bm/stats
 * Estadísticas globales del evento Black Market
 */
export async function getBmStats(req, res) {
  try {
    const activeEvent = inMemoryBmEvents.find(e => e.is_active) || inMemoryBmEvents[0];
    const eventId = activeEvent ? String(activeEvent.id) : '1';

    const participants = inMemoryBmDiscounts.filter(d => String(d.bm_event_id) === eventId);
    const totalPointsSum = participants.reduce((sum, p) => sum + (p.total_points || 0), 0);
    const avgPoints = participants.length > 0 ? Math.round(totalPointsSum / participants.length) : 0;
    const purchasedCount = participants.filter(p => p.purchased).length;
    const maxDiscountReached = participants.filter(p => p.discount_percentage >= 50).length;

    return res.json({
      success: true,
      event: activeEvent,
      stats: {
        total_participants: participants.length,
        total_points_accumulated: totalPointsSum,
        average_points: avgPoints,
        average_discount: participants.length > 0 ? Math.round(participants.reduce((s, p) => s + p.discount_percentage, 0) / participants.length) : 0,
        max_discount_achieved_count: maxDiscountReached,
        aircraft_purchased_count: purchasedCount,
        missions_completed_total: inMemoryBmProgress.filter(p => String(p.bm_event_id) === eventId && p.completed).length
      }
    });
  } catch (error) {
    console.error('❌ [BM] Error en getBmStats:', error);
    return res.status(500).json({
      success: false,
      error: 'Error al consultar estadísticas de Black Market',
      details: error.message
    });
  }
}

// ============================================================
// 5. GESTIÓN DE MISIONES (ADMIN/OWNER)
// ============================================================

/**
 * POST /api/bm/missions
 * Crear misión personalizada (ADMIN/OWNER)
 */
export async function createBmMission(req, res) {
  try {
    const validated = BmMissionSchema.parse(req.body);
    const actorId = req.user?.id || req.user?.user_id;
    const actorNick = req.user?.nick || 'Oficial';

    const newId = `m-${Date.now()}`;
    const newMission = {
      id: newId,
      ...validated,
      is_active: validated.is_active !== false,
      created_at: new Date().toISOString()
    };

    inMemoryBmMissions.push(newMission);

    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.from('bm_missions').insert([newMission]);
      } catch (dbErr) {
        console.warn('⚠️ [BM] Error insertando misión en Supabase:', dbErr.message);
      }
    }

    await logAuditChange({
      supabase,
      actorId,
      actorNick,
      targetId: newId,
      targetNick: validated.description,
      action: 'CREATE_BM_MISSION',
      details: validated
    });

    return res.status(201).json({
      success: true,
      message: 'Misión Black Market creada exitosamente',
      mission: newMission,
      data: newMission
    });
  } catch (error) {
    console.error('❌ [BM] Error en createBmMission:', error);
    return res.status(400).json({
      success: false,
      error: error.message || 'Error al crear misión Black Market'
    });
  }
}

/**
 * PUT /api/bm/missions/:id
 * Editar misión existente (ADMIN/OWNER)
 */
export async function updateBmMission(req, res) {
  try {
    const { id } = req.params;
    const missionId = String(id).trim();
    const validated = UpdateBmMissionSchema.parse(req.body);
    const actorId = req.user?.id || req.user?.user_id;
    const actorNick = req.user?.nick || 'Oficial';

    const index = inMemoryBmMissions.findIndex(m => String(m.id) === missionId);
    if (index === -1) {
      return res.status(404).json({
        success: false,
        error: `Misión Black Market '${id}' no encontrada`
      });
    }

    const updated = {
      ...inMemoryBmMissions[index],
      ...validated,
      updated_at: new Date().toISOString()
    };
    inMemoryBmMissions[index] = updated;

    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase
          .from('bm_missions')
          .update(validated)
          .eq('id', missionId);
      } catch (dbErr) {
        console.warn('⚠️ [BM] Error actualizando misión en Supabase:', dbErr.message);
      }
    }

    await logAuditChange({
      supabase,
      actorId,
      actorNick,
      targetId: missionId,
      targetNick: updated.description,
      action: 'UPDATE_BM_MISSION',
      details: validated
    });

    return res.json({
      success: true,
      message: 'Misión Black Market actualizada exitosamente',
      mission: updated,
      data: updated
    });
  } catch (error) {
    console.error('❌ [BM] Error en updateBmMission:', error);
    return res.status(400).json({
      success: false,
      error: error.message || 'Error al actualizar misión Black Market'
    });
  }
}

/**
 * DELETE /api/bm/missions/:id
 * Desactivar misión (soft-delete) (ADMIN/OWNER)
 */
export async function deleteBmMission(req, res) {
  try {
    const { id } = req.params;
    const missionId = String(id).trim();
    const actorId = req.user?.id || req.user?.user_id;
    const actorNick = req.user?.nick || 'Oficial';

    const mission = inMemoryBmMissions.find(m => String(m.id) === missionId);
    if (!mission) {
      return res.status(404).json({
        success: false,
        error: `Misión Black Market '${id}' no encontrada`
      });
    }

    mission.is_active = false;

    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase
          .from('bm_missions')
          .update({ is_active: false })
          .eq('id', missionId);
      } catch (dbErr) {
        console.warn('⚠️ [BM] Error desactivando misión en Supabase:', dbErr.message);
      }
    }

    await logAuditChange({
      supabase,
      actorId,
      actorNick,
      targetId: missionId,
      targetNick: mission.description,
      action: 'DEACTIVATE_BM_MISSION',
      details: { id: missionId, is_active: false }
    });

    return res.json({
      success: true,
      message: 'Misión Black Market desactivada (soft-delete)',
      id: missionId,
      is_active: false
    });
  } catch (error) {
    console.error('❌ [BM] Error en deleteBmMission:', error);
    return res.status(500).json({
      success: false,
      error: 'Error al desactivar misión Black Market',
      details: error.message
    });
  }
}
