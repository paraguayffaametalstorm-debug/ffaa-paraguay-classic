/**
 * ============================================================================
 * PARAGUAY-FFAA | METALSTORM
 * SCHEDULER DE EVENTOS — Auto-creación de Squadron Events
 * ============================================================================
 * Propósito:
 *   Garantizar que nunca falten eventos SQUADRON en el sistema.
 *   Corre cada 1 hora y verifica si existe el evento de la semana actual.
 *   Si no existe, lo crea + cierra el anterior.
 *
 * Características:
 *   - Idempotente (si el evento existe, no hace nada).
 *   - Advisory Lock (solo 1 réplica de Fly.io ejecuta).
 *   - Auto-backfill al arrancar (últimas 12 semanas) — DESHABILITADO (F2.9).
 *   - Auditoría en audit_logs.
 *
 * Versión: v1.1 (HALL-065 fix timezone + duración)
 * Fecha: 2026-09-20
 * Autor: PJPIROVANI (OWNER)
 * ============================================================================
 */

import cron from 'node-cron';
import { getSupabase } from '../db/supabase.js';

// ============================================================
// CONSTANTES DE TIMEZONE
// ============================================================

/**
 * Paraguay usa UTC-3 todo el año desde octubre 2024 (DST abolido por ley).
 * Regla de negocio: los eventos SQ abren jueves 09:00 PY y cierran lunes 08:59 PY.
 * En UTC: jueves 12:00 → lunes 11:59.
 *
 * ⚠️ HALL-065 fix v2 (2026-09-20): corregido offset UTC-4 → UTC-3.
 * Ver ADR-007 §2.3 y SESSION_HANDOFF.
 */
const PY_OFFSET_HOURS = 3;

/** Hora PY de apertura del evento (09:00 PY). */
const SQ_OPEN_HOUR_PY = 9;
/** Hora PY de cierre del evento (08:59 PY). */
const SQ_CLOSE_HOUR_PY = 8;
const SQ_CLOSE_MINUTE_PY = 59;

// ============================================================
// HELPERS
// ============================================================

/**
 * Calcula el número de semana ISO de una fecha.
 * @param {Date} date
 * @returns {number}
 */
function getISOWeek(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

/**
 * Calcula el número de año ISO de una fecha.
 * @param {Date} date
 * @returns {number}
 */
function getISOYear(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  return d.getUTCFullYear();
}

/**
 * Devuelve las fechas de inicio y fin del evento SQ para una semana ISO.
 *
 * Regla de negocio (F4.4 / HALL-065):
 *   - Apertura: Jueves 09:00 PY  →  Jueves 12:00 UTC
 *   - Cierre:   Lunes 08:59 PY   →  Lunes 11:59 UTC
 *   - Duración: 4 días exactos (jueves a lunes)
 *
 * @param {number} isoWeek
 * @param {number} isoYear
 * @returns {{ start: Date, end: Date }}
 */
function getSquadronEventDates(isoWeek, isoYear) {
  // Encontrar el jueves de la semana ISO (en UTC puro para el cálculo)
  const jan4 = new Date(Date.UTC(isoYear, 0, 4));
  const dayOfWeek = jan4.getUTCDay() || 7;
  const firstThursday = new Date(jan4);
  firstThursday.setUTCDate(jan4.getUTCDate() - dayOfWeek + 4);

  // Jueves 09:00 PY = 12:00 UTC (UTC-3)
  const thursday = new Date(firstThursday);
  thursday.setUTCDate(firstThursday.getUTCDate() + (isoWeek - 1) * 7);
  thursday.setUTCHours(SQ_OPEN_HOUR_PY + PY_OFFSET_HOURS, 0, 0, 0);

  // Lunes 08:59 PY = 11:59 UTC (+4 días desde el jueves)
  const monday = new Date(thursday);
  monday.setUTCDate(thursday.getUTCDate() + 4);
  monday.setUTCHours(SQ_CLOSE_HOUR_PY + PY_OFFSET_HOURS, SQ_CLOSE_MINUTE_PY, 59, 0);

  return { start: thursday, end: monday };
}

/**
 * Construye el nombre del evento SQ.
 * Formato: "Squadron Event YYYY-Www"
 */
function buildEventName(isoWeek, isoYear) {
  const paddedWeek = String(isoWeek).padStart(2, '0');
  return `Squadron Event ${isoYear}-W${paddedWeek}`;
}

/**
 * Construye el legacy_event_id del evento SQ.
 * Formato: "YYYY-MM · SEM NN - SQ"
 *
 * Nota: usamos el mes UTC del jueves de apertura. Como el evento arranca
 * a las 12:00 UTC del jueves, el mes UTC coincide siempre con el mes PY
 * (nunca cae en un cambio de mes por la madrugada).
 */
function buildLegacyEventId(isoWeek, isoYear, date) {
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const paddedWeek = String(isoWeek).padStart(2, '0');
  return `${isoYear}-${month} · SEM ${paddedWeek} - SQ`;
}

// ============================================================
// SCHEDULER CORE
// ============================================================

/**
 * Intenta adquirir el advisory lock del scheduler.
 * @param {object} supabase
 * @returns {Promise<boolean>}
 */
async function tryAcquireLock(supabase) {
  try {
    const { data, error } = await supabase.rpc('acquire_scheduler_lock');
    if (error) {
      console.warn('⚠️ [Scheduler] Error adquiriendo lock:', error.message);
      return false;
    }
    return Boolean(data);
  } catch (err) {
    console.warn('⚠️ [Scheduler] Excepción adquiriendo lock:', err.message);
    return false;
  }
}

/**
 * Libera el advisory lock del scheduler.
 */
async function releaseLock(supabase) {
  try {
    await supabase.rpc('release_scheduler_lock');
  } catch (err) {
    console.warn('⚠️ [Scheduler] Excepción liberando lock:', err.message);
  }
}

/**
 * Cierra el evento OPEN actual (si existe).
 * @param {object} supabase
 * @returns {Promise<string|null>} UUID del evento cerrado, o null
 */
async function closeCurrentOpenEvent(supabase) {
  try {
    const { data: openEvents, error: queryErr } = await supabase
      .from('events_master')
      .select('id, legacy_event_id')
      .eq('status', 'OPEN')
      .limit(1);

    if (queryErr) throw queryErr;
    if (!openEvents || openEvents.length === 0) return null;

    const openEvent = openEvents[0];

    const { error: updateErr } = await supabase
      .from('events_master')
      .update({
        status: 'CLOSED',
        closed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', openEvent.id);

    if (updateErr) throw updateErr;

    console.log(`✅ [Scheduler] Evento cerrado: ${openEvent.legacy_event_id}`);
    return openEvent.id;
  } catch (err) {
    console.error('❌ [Scheduler] Error cerrando evento anterior:', err.message);
    return null;
  }
}

/**
 * Verifica si el evento SQ de la semana ISO ya existe.
 * @param {object} supabase
 * @param {number} isoWeek
 * @param {number} isoYear
 * @returns {Promise<boolean>}
 */
async function eventExists(supabase, isoWeek, isoYear) {
  const { start } = getSquadronEventDates(isoWeek, isoYear);
  const legacyId = buildLegacyEventId(isoWeek, isoYear, start);

  const { data, error } = await supabase
    .from('events_master')
    .select('id')
    .eq('legacy_event_id', legacyId)
    .limit(1);

  if (error) {
    console.warn('⚠️ [Scheduler] Error verificando existencia:', error.message);
    return false;
  }

  return data && data.length > 0;
}

/**
 * Crea el evento SQ para la semana actual.
 * @param {object} supabase
 * @param {number} isoWeek
 * @param {number} isoYear
 * @param {string} status - 'OPEN' o 'CLOSED'
 * @param {boolean} backfilled
 * @returns {Promise<object|null>}
 */
async function createSquadronEvent(supabase, isoWeek, isoYear, status = 'OPEN', backfilled = false) {
  const { start, end } = getSquadronEventDates(isoWeek, isoYear);
  const legacyId = buildLegacyEventId(isoWeek, isoYear, start);
  const name = buildEventName(isoWeek, isoYear);

  const { data, error } = await supabase
    .from('events_master')
    .insert({
      type: 'SQUADRON',
      name,
      start_date: start.toISOString(),
      end_date: end.toISOString(),
      status,
      metadata: {
        target_members: 27,
        target_tokens: 200,
        min_tokens_required: 175,
        iso_week: isoWeek,
        iso_year: isoYear,
        auto_created: !backfilled,
        backfilled,
        no_data: false,
        source: backfilled ? 'SCHEDULER_BACKFILL' : 'SCHEDULER',
        notes: backfilled ? 'Evento backfilleado automáticamente al arranque.' : null,
        timezone_py_offset_hours: PY_OFFSET_HOURS
      },
      legacy_event_id: legacyId,
      created_at: start.toISOString(),
      closed_at: status === 'CLOSED' ? end.toISOString() : null
    })
    .select()
    .single();

  if (error) {
    console.error('❌ [Scheduler] Error creando evento:', error.message);
    return null;
  }

  console.log(`✅ [Scheduler] Evento creado: ${legacyId} (${status})`);
  return data;
}

// ============================================================
// TICK PRINCIPAL DEL SCHEDULER
// ============================================================

/**
 * Ejecuta un tick del scheduler.
 * - Adquiere el lock.
 * - Verifica si el evento de la semana actual existe.
 * - Si no existe, cierra el anterior y crea uno nuevo.
 * - Libera el lock.
 */
export async function schedulerTick() {
  const supabase = getSupabase();
  if (!supabase) {
    console.warn('⚠️ [Scheduler] Supabase no disponible, saltando tick.');
    return;
  }

  const lockAcquired = await tryAcquireLock(supabase);
  if (!lockAcquired) {
    console.log('⏳ [Scheduler] Lock no adquirido (otra réplica está ejecutando).');
    return;
  }

  try {
    const now = new Date();
    const isoWeek = getISOWeek(now);
    const isoYear = getISOYear(now);

    const exists = await eventExists(supabase, isoWeek, isoYear);
    if (exists) {
      console.log(`✅ [Scheduler] Evento SQ ${isoYear}-W${isoWeek} ya existe. Nada que hacer.`);
      return;
    }

    console.log(`🔧 [Scheduler] Evento SQ ${isoYear}-W${isoWeek} no existe. Creando...`);

    // Cerrar el evento anterior (si sigue OPEN)
    await closeCurrentOpenEvent(supabase);

    // Crear el nuevo evento SQ
    await createSquadronEvent(supabase, isoWeek, isoYear, 'OPEN', false);
  } catch (err) {
    console.error('❌ [Scheduler] Error en tick:', err.message);
  } finally {
    await releaseLock(supabase);
  }
}

// ============================================================
// BACKFILL AL ARRANQUE (DESHABILITADO F2.9)
// ============================================================

/**
 * Ejecuta el backfill de las últimas N semanas al arrancar el servidor.
 * ⚠️ DESHABILITADO por decisión F2.9 (Opción C): no inventar eventos
 * históricos para semanas sin actividad real.
 * @param {number} weeksBack - Cuántas semanas hacia atrás backfillear.
 */
export async function backfillRecentWeeks(weeksBack = 12) {
  const supabase = getSupabase();
  if (!supabase) {
    console.warn('⚠️ [Scheduler Backfill] Supabase no disponible.');
    return;
  }

  const lockAcquired = await tryAcquireLock(supabase);
  if (!lockAcquired) {
    console.log('⏳ [Scheduler Backfill] Lock no adquirido. Saltando backfill.');
    return;
  }

  try {
    console.log(`🔧 [Scheduler Backfill] Verificando últimas ${weeksBack} semanas...`);

    const now = new Date();
    let createdCount = 0;

    // Iterar desde weeksBack hasta 1 (NO incluir 0).
    // La semana actual (i=0) es responsabilidad del schedulerTick,
    // que la crea como 'OPEN'. El backfill solo crea semanas PASADAS ('CLOSED').
    for (let i = weeksBack; i >= 1; i--) {
      const targetDate = new Date(now);
      targetDate.setUTCDate(now.getUTCDate() - i * 7);

      const isoWeek = getISOWeek(targetDate);
      const isoYear = getISOYear(targetDate);

      const exists = await eventExists(supabase, isoWeek, isoYear);
      if (exists) continue;

      await createSquadronEvent(supabase, isoWeek, isoYear, 'CLOSED', true);
      createdCount++;
    }

    console.log(`✅ [Scheduler Backfill] Backfill completado. Eventos creados: ${createdCount}`);
  } catch (err) {
    console.error('❌ [Scheduler Backfill] Error:', err.message);
  } finally {
    await releaseLock(supabase);
  }
}

// ============================================================
// ARRANQUE DEL SCHEDULER
// ============================================================

/**
 * Inicia el scheduler.
 * - Backfill inicial DESHABILITADO (F2.9).
 * - Registra el cron job cada 1 hora.
 */
export function startEventScheduler() {
  console.log('🕐 [Scheduler] Iniciando scheduler de eventos SQ...');
  console.log(`🕐 [Scheduler] Timezone PY offset: UTC-${PY_OFFSET_HOURS} (Jue 09:00 PY → Lun 08:59 PY)`);

  // Cron: cada 1 hora en punto
  cron.schedule('0 * * * *', () => {
    console.log('🕐 [Scheduler] Tick horario...');
    schedulerTick().catch(err => {
      console.error('❌ [Scheduler] Error en tick horario:', err.message);
    });
  });

  console.log('✅ [Scheduler] Scheduler iniciado. Cron: cada 1 hora.');
}


// ============================================================
// EXPORTS PARA TESTING
// ============================================================
// ⚠️ Solo se exportan para tests unitarios. No usar en runtime.
export {
  getISOWeek,
  getISOYear,
  getSquadronEventDates,
  PY_OFFSET_HOURS,
  SQ_OPEN_HOUR_PY,
  SQ_CLOSE_HOUR_PY,
  SQ_CLOSE_MINUTE_PY
};
