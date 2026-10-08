/**
 * ============================================================================
 * PARAGUAY-FFAA | METALSTORM
 * CONTROLADOR DE EXPORTACIÓN DE RESULTADOS
 * ============================================================================
 * Propósito:
 *   Generar el payload de datos para el reporte de rendimiento de un evento.
 *   El frontend renderiza este JSON en HTML y lo convierte a imagen (JPG/PNG)
 *   mediante html2canvas.
 *
 * Endpoint:
 *   - GET /api/admin/results/:eventId/export
 *
 * Acceso:
 *   - ADMIN, OWNER (requireAuth + requireRole)
 *
 * Formato de respuesta:
 *   - Ver docs/mockups/mockup-resultados.html para referencia visual.
 *
 * Versión: v1.0
 * Fecha: 2026-10-08
 * Autor: PJPIROVANI (OWNER)
 * ============================================================================
 */

import { getSupabase } from '../db/supabase.js';
import { logger } from '../config/logger.js';

// ============================================================
// HELPERS
// ============================================================

/**
 * Formatea una fecha ISO a DD/MM/YYYY (formato militar PY).
 * @param {string|Date} dateStr
 * @returns {string}
 */
function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    const day = String(d.getUTCDate()).padStart(2, '0');
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const year = d.getUTCFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return '—';
  }
}

/**
 * Formatea un rango de fechas: "DD/MM/YYYY — DD/MM/YYYY".
 * @param {string} startDate
 * @param {string} endDate
 * @returns {string}
 */
function formatPeriod(startDate, endDate) {
  return `${formatDate(startDate)} — ${formatDate(endDate)}`;
}

/**
 * Calcula el semáforo militar a partir de tokens y días.
 * Regla oficial (Art. 26 de la normativa):
 *   - VERDE:   tokens >= 175 && días >= 4
 *   - NARANJA: tokens >= 130 && días >= 3
 *   - ROJO:    tokens >= 100 && días >= 2
 *   - NEGRO:   el resto
 * @param {number} tokens
 * @param {number} days
 * @returns {'VERDE'|'NARANJA'|'ROJO'|'NEGRO'}
 */
function computeStatus(tokens, days) {
  const t = Number(tokens) || 0;
  const d = Number(days) || 0;
  if (t >= 175 && d >= 4) return 'VERDE';
  if (t >= 130 && d >= 3) return 'NARANJA';
  if (t >= 100 && d >= 2) return 'ROJO';
  return 'NEGRO';
}

// ============================================================
// CONTROLADOR PRINCIPAL
// ============================================================

/**
 * GET /api/admin/results/:eventId/export
 *
 * Devuelve los datos completos para generar el reporte visual de un evento.
 *
 * Response:
 *   {
 *     success: true,
 *     event: { id, name, type, start_date, end_date, status, period_formatted },
 *     pilots_with_data: [
 *       { rank, nick, role, tokens, days_connected, perf_status, flew_in_group }
 *     ],
 *     pilots_without_data: [
 *       { nick, role }
 *     ],
 *     summary: {
 *       total_active, total_loaded, total_missing,
 *       avg_tokens, goal_reached, general_status,
 *       count_verde, count_naranja, count_rojo, count_negro
 *     },
 *     generated_at, generated_by
 *   }
 */
export async function exportEventResults(req, res, next) {
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

    // ────────────────────────────────────────────────────────────
    // 1. Validar que el evento existe
    // ────────────────────────────────────────────────────────────
    const { data: events, error: eventErr } = await supabase
      .from('events_master')
      .select('id, name, type, start_date, end_date, status, metadata')
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
    const eventType = event.type || 'SQUADRON';

    // ────────────────────────────────────────────────────────────
    // 2. Consultar participaciones del evento
    // ────────────────────────────────────────────────────────────
    const { data: participations, error: partErr } = await supabase
      .from('event_participations')
      .select('user_id, nick, data, computed_points, status, created_at')
      .eq('event_id', eventId);

    if (partErr) throw partErr;

    const participationsList = participations || [];

    // ────────────────────────────────────────────────────────────
    // 3. Consultar todos los usuarios ACTIVOS (para detectar sin carga)
    // ────────────────────────────────────────────────────────────
    const { data: users, error: usersErr } = await supabase
      .from('users')
      .select('id, nick, role, status')
      .eq('status', 'ACTIVE')
      .order('nick', { ascending: true });

    if (usersErr) throw usersErr;

    const activeUsers = users || [];

    // ────────────────────────────────────────────────────────────
    // 4. Procesar participaciones (con datos)
    // ────────────────────────────────────────────────────────────
    const userMap = new Map();
    activeUsers.forEach(u => {
      userMap.set(String(u.id), u);
    });

    const pilotsWithData = participationsList
      .map(p => {
        // Extraer tokens y días según el tipo de evento
        const data = p.data || {};
        let tokens = 0;
        let days = 0;

        if (eventType === 'SQUADRON') {
          tokens = Number(data.tokens) || 0;
          days = Number(data.days_connected) || 0;
        } else if (eventType === 'BLACK_MARKET') {
          tokens = Number(p.computed_points) || 0;
          days = Object.keys(data).filter(k => k.startsWith('day_')).length;
        }

        // v4.6.1 — Priorizar SIEMPRE el nick real de users (no el guardado en la participación).
        // El `p.nick` histórico puede estar desactualizado (era el nick del cargador, no del piloto).
        const user = userMap.get(String(p.user_id));

        return {
          user_id: p.user_id,
          nick: user?.nick || p.nick || 'Piloto',
          role: (user?.role || 'MIEMBRO').toUpperCase(),
          tokens,
          days_connected: days,
          perf_status: computeStatus(tokens, days),
          flew_in_group: Boolean(data.flew_in_group)
        };
      })
      // Ordenar por tokens desc (ranking)
      .sort((a, b) => b.tokens - a.tokens)
      // Asignar ranking secuencial
      .map((p, idx) => ({ ...p, rank: idx + 1 }));

    // ────────────────────────────────────────────────────────────
    // 5. Detectar pilotos SIN carga
    //    (activos que no tienen participación en este evento)
    // ────────────────────────────────────────────────────────────
    const participantsIds = new Set(
      participationsList.map(p => String(p.user_id))
    );

    const pilotsWithoutData = activeUsers
      .filter(u => !participantsIds.has(String(u.id)))
      .map(u => ({
        nick: u.nick || 'Piloto',
        role: (u.role || 'MIEMBRO').toUpperCase()
      }));

    // ────────────────────────────────────────────────────────────
    // 6. Calcular resumen del escuadrón
    // ────────────────────────────────────────────────────────────
    const totalActive = activeUsers.length;
    const totalLoaded = pilotsWithData.length;
    const totalMissing = pilotsWithoutData.length;

    const totalTokens = pilotsWithData.reduce((sum, p) => sum + p.tokens, 0);
    const avgTokens = totalLoaded > 0
      ? Math.round(totalTokens / totalLoaded)
      : 0;

    // Conteo por semáforo
    const countVerde = pilotsWithData.filter(p => p.perf_status === 'VERDE').length;
    const countNaranja = pilotsWithData.filter(p => p.perf_status === 'NARANJA').length;
    const countRojo = pilotsWithData.filter(p => p.perf_status === 'ROJO').length;
    const countNegro = pilotsWithData.filter(p => p.perf_status === 'NEGRO').length;

    // Meta: al menos 27/30 pilotos con 200 tokens (regla oficial SQ)
    // Para el reporte visual usamos: >= 80% de activos cargaron Y promedio >= 175
    const loadPercentage = totalActive > 0
      ? (totalLoaded / totalActive) * 100
      : 0;
    const goalReached = loadPercentage >= 80 && avgTokens >= 175;

    // Semáforo general del escuadrón
    let generalStatus = 'NEGRO';
    if (avgTokens >= 175) generalStatus = 'VERDE';
    else if (avgTokens >= 130) generalStatus = 'NARANJA';
    else if (avgTokens >= 100) generalStatus = 'ROJO';

    // ────────────────────────────────────────────────────────────
    // 7. Armar respuesta final
    // ────────────────────────────────────────────────────────────
    return res.json({
      success: true,
      event: {
        id: event.id,
        name: event.name,
        type: eventType,
        start_date: event.start_date,
        end_date: event.end_date,
        status: event.status,
        period_formatted: formatPeriod(event.start_date, event.end_date)
      },
      pilots_with_data: pilotsWithData,
      pilots_without_data: pilotsWithoutData,
      summary: {
        total_active: totalActive,
        total_loaded: totalLoaded,
        total_missing: totalMissing,
        avg_tokens: avgTokens,
        goal_reached: goalReached,
        general_status: generalStatus,
        count_verde: countVerde,
        count_naranja: countNaranja,
        count_rojo: countRojo,
        count_negro: countNegro
      },
      generated_at: new Date().toISOString(),
      generated_by: {
        nick: req.user?.nick || 'ADMIN',
        role: req.user?.role || 'ADMIN'
      }
    });
  } catch (error) {
    logger.error('❌ [Export] Error en exportEventResults:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      code: 'INTERNAL_ERROR'
    });
  }
}