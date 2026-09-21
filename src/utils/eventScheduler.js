/**
 * ============================================================================
 * PARAGUAY-FFAA | METALSTORM
 * SCHEDULER DE EVENTOS — v2.0 (HALL-066 FIX)
 * ============================================================================
 * Propósito:
 *   Garantizar la existencia y correcta transición de eventos SQUADRON.
 *   Corre cada 1 hora y ejecuta 3 tareas INDEPENDIENTES:
 *
 *     TAREA 1 — openScheduledEvents()
 *       Promueve SCHEDULED → OPEN cuando NOW() >= start_date.
 *
 *     TAREA 2 — closeExpiredEvents()
 *       Cierra OPEN → CLOSED cuando NOW() >= end_date.
 *       Respeta el end_date real, NO cierra por cambio de semana ISO.
 *
 *     TAREA 3 — ensureNextSquadronEvent()
 *       Prepara el evento de la próxima semana ISO como SCHEDULED.
 *       NUNCA crea eventos futuros como OPEN.
 *
 * Modelo de negocio (ADR-008):
 *   - Ciclo del evento SQ:  jue 09:00 PY → lun 08:59 PY (4 días).
 *   - Ventana de carga SQ:  jue 09:00 PY → jue 08:59 PY (7 días).
 *   - Los pilotos pueden seguir cargando performance durante el "hueco"
 *     (lunes-jueves) entre eventos, porque la ventana de carga está
 *     desacoplada del ciclo del evento.
 *
 * Cambios vs. v1.1 (HALL-066):
 *   - [FIX] created_at ahora usa NOW() en vez de start_date.
 *   - [FIX] closed_at siempre es null al crear.
 *   - [FIX] Guarda: nunca crear evento futuro como OPEN.
 *   - [NUEVO] openScheduledEvents() para transición SCHEDULED → OPEN.
 *   - [NUEVO] closeExpiredEvents() respeta end_date.
 *   - [REFACTOR] schedulerTick() orquesta 3 tareas independientes.
 *   - [NUEVO] ensureNextSquadronEvent() prepara la próxima semana.
 *
 * Versión: v2.0
 * Fecha: 2026-09-21
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
 */
const PY_OFFSET_HOURS = 3;

/** Hora PY de apertura del evento (09:00 PY). */
const SQ_OPEN_HOUR_PY = 9;
/** Hora PY de cierre del evento (08:59 PY). */
const SQ_CLOSE_HOUR_PY = 8;
const SQ_CLOSE_MINUTE_PY = 59;

/** Tipo de evento gestionado por este scheduler. */
const SQ_TYPE = 'SQUADRON';

// ============================================================
// HELPERS DE FECHA / ISO WEEK
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
 * Calcula la ventana de carga (submission window) para un evento.
 * Reglas (ADR-008):
 *   - SQ: 7 días (Jue 09:00 PY → Jue 08:59 PY).
 *   - BM: 6 días (Mié 17:00 PY → Mar 16:59 PY).
 *
 * @param {string|Date} startDate - Fecha de inicio del evento (ISO o Date).
 * @param {string} eventType - 'SQUADRON' | 'BLACK_MARKET' | otros.
 * @returns {{ submission_opens_at: string, submission_closes_at: string }}
 */
function calculateSubmissionWindow(startDate, eventType) {
  const start = new Date(startDate);

  if (eventType === SQ_TYPE) {
    const closes = new Date(start);
    closes.setUTCDate(closes.getUTCDate() + 7);
    return {
      submission_opens_at: start.toISOString(),
      submission_closes_at: closes.toISOString()
    };
  }

  if (eventType === 'BLACK_MARKET') {
    const closes = new Date(start);
    closes.setUTCDate(closes.getUTCDate() + 6);
    return {
      submission_opens_at: start.toISOString(),
      submission_closes_at: closes.toISOString()
    };
  }

  // Fallback: 7 días desde el inicio
  const closes = new Date(start);
  closes.setUTCDate(closes.getUTCDate() + 7);
  return {
    submission_opens_at: start.toISOString(),
    submission_closes_at: closes.toISOString()
  };
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
 */
function buildLegacyEventId(isoWeek, isoYear, date) {
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const paddedWeek = String(isoWeek).padStart(2, '0');
  return `${isoYear}-${month} · SEM ${paddedWeek} - SQ`;
}

// ============================================================
// ADVISORY LOCKS
// ============================================================

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

async function releaseLock(supabase) {
  try {
    await supabase.rpc('release_scheduler_lock');
  } catch (err) {
    console.warn('⚠️ [Scheduler] Excepción liberando lock:', err.message);
  }
}

// ============================================================
// TAREA 1 — Promover SCHEDULED → OPEN
// ============================================================

/**
 * Promueve eventos SCHEDULED a OPEN cuando NOW() >= start_date.
 * Idempotente. No crea ni cierra nada más.
 *
 * ⚠️ Respeta el índice único parcial `idx_events_master_single_open`:
 *    si ya hay un evento OPEN, NO promueve otro. Esto es defensivo.
 *
 * @param {object} supabase
 */
async function openScheduledEvents(supabase) {
  const now = new Date().toISOString();

  // Buscar eventos SCHEDULED cuyo start_date ya pasó
  const { data: toOpen, error } = await supabase
    .from('events_master')
    .select('id, name, legacy_event_id, start_date')
    .eq('status', 'SCHEDULED')
    .lte('start_date', now);

  if (error) {
    console.error('❌ [Scheduler] Error consultando SCHEDULED:', error.message);
    return;
  }

  if (!toOpen || toOpen.length === 0) {
    return; // Nada que abrir
  }

  // Verificar cuántos eventos OPEN existen ahora (por seguridad)
  const { data: currentOpen, error: openErr } = await supabase
    .from('events_master')
    .select('id, name')
    .eq('status', 'OPEN')
    .limit(1);

  if (openErr) {
    console.error('❌ [Scheduler] Error consultando OPEN actual:', openErr.message);
    return;
  }

  const hasOpen = currentOpen && currentOpen.length > 0;

  for (const ev of toOpen) {
    if (hasOpen) {
      console.warn(
        `⚠️ [Scheduler] No puedo abrir ${ev.name}: ya hay un evento OPEN ` +
        `(${currentOpen[0].name}). Requiere revisión manual (HALL-066).`
      );
      continue;
    }

    const { error: updateErr } = await supabase
      .from('events_master')
      .update({
        status: 'OPEN',
        updated_at: now
      })
      .eq('id', ev.id);

    if (updateErr) {
      console.error(`❌ [Scheduler] Error abriendo ${ev.name}:`, updateErr.message);
    } else {
      console.log(`🟢 [Scheduler] Evento abierto: ${ev.legacy_event_id || ev.name}`);
    }
  }
}

// ============================================================
// TAREA 2 — Cerrar OPEN expirados
// ============================================================

/**
 * Cierra eventos OPEN cuyo end_date ya pasó.
 * Respeta el end_date real, NO cierra por cambio de semana ISO.
 * Idempotente.
 *
 * @param {object} supabase
 */
async function closeExpiredEvents(supabase) {
  const now = new Date().toISOString();

  const { data: toClose, error } = await supabase
    .from('events_master')
    .select('id, name, legacy_event_id, end_date')
    .eq('status', 'OPEN')
    .lte('end_date', now);

  if (error) {
    console.error('❌ [Scheduler] Error consultando OPEN expirados:', error.message);
    return;
  }

  if (!toClose || toClose.length === 0) {
    return; // Nada que cerrar
  }

  for (const ev of toClose) {
    const { error: updateErr } = await supabase
      .from('events_master')
      .update({
        status: 'CLOSED',
        closed_at: now,
        updated_at: now
      })
      .eq('id', ev.id);

    if (updateErr) {
      console.error(`❌ [Scheduler] Error cerrando ${ev.name}:`, updateErr.message);
    } else {
      console.log(`🔴 [Scheduler] Evento cerrado: ${ev.legacy_event_id || ev.name}`);
    }
  }
}

// ============================================================
// TAREA 3 — Preparar próximo evento SQ
// ============================================================

/**
 * Verifica si existe el evento SQ de la próxima semana ISO.
 * Si no existe, lo crea como SCHEDULED (nunca como OPEN).
 *
 * @param {object} supabase
 */
async function ensureNextSquadronEvent(supabase) {
  const now = new Date();
  const nextWeekDate = new Date(now);
  nextWeekDate.setUTCDate(now.getUTCDate() + 7);

  const isoWeek = getISOWeek(nextWeekDate);
  const isoYear = getISOYear(nextWeekDate);

  const exists = await eventExists(supabase, isoWeek, isoYear);
  if (exists) {
    console.log(`✅ [Scheduler] Evento SQ ${isoYear}-W${isoWeek} ya existe. Nada que hacer.`);
    return;
  }

  console.log(`🔧 [Scheduler] Preparando evento SQ ${isoYear}-W${isoWeek} (SCHEDULED)...`);
  await createSquadronEvent(supabase, isoWeek, isoYear, 'SCHEDULED', false);
}

/**
 * Verifica si el evento SQ de una semana ISO ya existe.
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

// ============================================================
// CREACIÓN DE EVENTOS
// ============================================================

/**
 * Crea el evento SQ para una semana ISO.
 *
 * ⚠️ GUARDA DE SEGURIDAD (HALL-066):
 *    Si `start_date` es futura y se solicitó `OPEN`, fuerza `SCHEDULED`.
 *    Un evento futuro NUNCA debe crearse como OPEN.
 *
 * ⚠️ FIX (HALL-066):
 *    - `created_at` = NOW() (no start_date).
 *    - `closed_at` = null (nunca cerrar al crear).
 *
 * @param {object} supabase
 * @param {number} isoWeek
 * @param {number} isoYear
 * @param {string} status - 'OPEN' | 'SCHEDULED' | 'CLOSED'
 * @param {boolean} backfilled
 * @returns {Promise<object|null>}
 */
async function createSquadronEvent(supabase, isoWeek, isoYear, status = 'SCHEDULED', backfilled = false) {
  const { start, end } = getSquadronEventDates(isoWeek, isoYear);
  const submissionWindow = calculateSubmissionWindow(start, SQ_TYPE);
  const legacyId = buildLegacyEventId(isoWeek, isoYear, start);
  const name = buildEventName(isoWeek, isoYear);

  // ⚠️ GUARDA DE SEGURIDAD HALL-066:
  // Un evento futuro NUNCA debe crearse como OPEN.
  if (status === 'OPEN' && start > new Date()) {
    console.warn(
      `⚠️ [Scheduler] Intento de crear evento futuro como OPEN. Forzando a SCHEDULED. ` +
      `(isoWeek=${isoWeek}, isoYear=${isoYear}, start=${start.toISOString()})`
    );
    status = 'SCHEDULED';
  }

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('events_master')
    .insert({
      type: SQ_TYPE,
      name,
      start_date: start.toISOString(),
      end_date: end.toISOString(),
      submission_opens_at: submissionWindow.submission_opens_at,
      submission_closes_at: submissionWindow.submission_closes_at,
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
      // ✅ FIX HALL-066: created_at es el momento real de creación
      created_at: now,
      // ✅ FIX HALL-066: nunca cerrar al crear
      closed_at: null
    })
    .select()
    .single();

  if (error) {
    console.error('❌ [Scheduler] Error creando evento:', error.message);
    return null;
  }

  console.log(`✨ [Scheduler] Evento creado: ${legacyId} (${status})`);
  return data;
}

// ============================================================
// TICK PRINCIPAL DEL SCHEDULER
// ============================================================

/**
 * Ejecuta un tick del scheduler. Orquesta 3 tareas INDEPENDIENTES:
 *
 *   1. Promover SCHEDULED → OPEN si NOW() >= start_date.
 *   2. Cerrar OPEN → CLOSED si NOW() >= end_date.
 *   3. Preparar el evento de la próxima semana ISO como SCHEDULED.
 *
 * Cada tarea es idempotente. Ejecutar el tick N veces tiene el mismo
 * efecto que ejecutarlo 1 vez.
 *
 * @returns {Promise<void>}
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

    console.log(`🕐 [Scheduler] Tick — Semana ISO actual: ${isoYear}-W${isoWeek}`);

    // TAREA 1: Abrir eventos SCHEDULED que llegaron a su hora
    await openScheduledEvents(supabase);

    // TAREA 2: Cerrar eventos OPEN expirados
    await closeExpiredEvents(supabase);

    // TAREA 3: Preparar el evento de la próxima semana
    await ensureNextSquadronEvent(supabase);

    console.log('✅ [Scheduler] Tick completado.');
  } catch (err) {
    console.error('❌ [Scheduler] Error en tick:', err.message);
  } finally {
    await releaseLock(supabase);
  }
}

// ============================================================
// BACKFILL (DESHABILITADO F2.9)
// ============================================================

/**
 * Backfill de las últimas N semanas al arrancar.
 * ⚠️ DESHABILITADO por decisión F2.9: no inventar eventos históricos.
 * @param {number} weeksBack
 */
export async function backfillRecentWeeks(weeksBack = 12) {
  const supabase = getSupabase();
  if (!supabase) {
    console.warn('⚠️ [Scheduler Backfill] Supabase no disponible.');
    return;
  }

  const lockAcquired = await tryAcquireLock(supabase);
  if (!lockAcquired) {
    console.log('⏳ [Scheduler Backfill] Lock no adquirido.');
    return;
  }

  try {
    console.log(`🔧 [Scheduler Backfill] Verificando últimas ${weeksBack} semanas...`);
    const now = new Date();
    let createdCount = 0;

    for (let i = weeksBack; i >= 1; i--) {
      const targetDate = new Date(now);
      targetDate.setUTCDate(now.getUTCDate() - i * 7);

      const isoWeek = getISOWeek(targetDate);
      const isoYear = getISOYear(targetDate);

      const exists = await eventExists(supabase, isoWeek, isoYear);
      if (exists) continue;

      // Semanas pasadas: crear como CLOSED
      await createSquadronEvent(supabase, isoWeek, isoYear, 'CLOSED', true);
      createdCount++;
    }

    console.log(`✅ [Scheduler Backfill] Completado. Eventos creados: ${createdCount}`);
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
  console.log('🕐 [Scheduler] Iniciando scheduler de eventos SQ (v2.0 — HALL-066 fix)...');
  console.log(`🕐 [Scheduler] Timezone PY offset: UTC-${PY_OFFSET_HOURS} (Jue 09:00 PY → Lun 08:59 PY)`);
  console.log(`🕐 [Scheduler] Ventana de carga SQ: 7 días (Jue 09:00 PY → Jue 08:59 PY)`);

  // Cron: cada 1 hora en punto
  cron.schedule('0 * * * *', () => {
    console.log('🕐 [Scheduler] Tick horario...');
    schedulerTick().catch(err => {
      console.error('❌ [Scheduler] Error en tick horario:', err.message);
    });
  });

  console.log('✅ [Scheduler] Scheduler v2.0 iniciado. Cron: cada 1 hora.');
}

// ============================================================
// EXPORTS PARA TESTING
// ============================================================
export {
  // Constantes
  PY_OFFSET_HOURS,
  SQ_OPEN_HOUR_PY,
  SQ_CLOSE_HOUR_PY,
  SQ_CLOSE_MINUTE_PY,
  SQ_TYPE,
  // Funciones puras
  getISOWeek,
  getISOYear,
  getSquadronEventDates,
  calculateSubmissionWindow,
  buildEventName,
  buildLegacyEventId
};