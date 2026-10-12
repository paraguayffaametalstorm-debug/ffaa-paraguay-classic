// src/middlewares/tournamentModerator.js
//
// ADR-011 — RBAC fino para el Sistema de Torneos (F1.3).
//
// Problema: requireRole('ADMIN','OWNER') valida el ROL, pero el Anexo III
// (Art. 24.3) permite que la Administración designe a CUALQUIER miembro
// (VETERANO o MIEMBRO) como moderador de UN torneo puntual. Sin este
// middleware, un VETERANO designado no podría operar, o peor: si le
// diéramos requireRole('VETERANO'), podría operar torneos ajenos.
//
// Reglas (ADR-011 D7):
//   - OWNER:    pasa siempre (cualquier torneo).
//   - ADMIN:    pasa siempre (cualquier torneo).
//   - VETERANO: pasa SOLO si moderator_id === req.user.id.
//   - MIEMBRO:  pasa SOLO si moderator_id === req.user.id.
//
// Uso:
//   router.post('/:id/matches/:mid/result',
//     requireAuth,
//     requireTournamentModerator,
//     registerMatchResult
//   );
//
// Deja en req.tournament el registro { id, moderator_id, status, name }
// para que el controller no tenga que volver a consultarlo.
//
import { getSupabase } from '../db/supabase.js';
import { logger } from '../config/logger.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function requireTournamentModerator(req, res, next) {
  try {
    const tournamentId = req.params.id;
    const userRole = (req.user?.role || 'MIEMBRO').toUpperCase();
    const userId = req.user?.id;

    // 1. Validar formato del ID (defensa temprana)
    if (!tournamentId || !UUID_REGEX.test(String(tournamentId))) {
      return res.status(400).json({
        error: 'Identificador de torneo inválido',
        code: 'INVALID_TOURNAMENT_ID'
      });
    }

    // 2. Verificar cliente Supabase
    const supabase = getSupabase();
    if (!supabase) {
      return res.status(500).json({
        error: 'Database client unavailable',
        code: 'DB_UNAVAILABLE'
      });
    }

    // 3. Cargar el torneo (necesario para poblar req.tournament incluso
    //    para OWNER/ADMIN, y para validar existencia)
    const { data, error } = await supabase
      .from('tournaments')
      .select('id, moderator_id, status, name')
      .eq('id', tournamentId)
      .maybeSingle();

    if (error) {
      logger.error('❌ [TournamentModerator] Error consultando torneo:', error.message);
      return res.status(500).json({
        error: 'Error consultando el torneo',
        code: 'DB_QUERY_FAILED'
      });
    }
    if (!data) {
      return res.status(404).json({
        error: 'Torneo no encontrado',
        code: 'TOURNAMENT_NOT_FOUND'
      });
    }

    // 4. OWNER/ADMIN: bypass total (ya cargado req.tournament)
    if (userRole === 'OWNER' || userRole === 'ADMIN') {
      req.tournament = data;
      return next();
    }

    // 5. VETERANO/MIEMBRO: validar que sean el moderador designado
    if (!userId) {
      return res.status(403).json({
        error: 'No se pudo identificar al usuario autenticado',
        code: 'TOURNAMENT_FORBIDDEN'
      });
    }

    // moderator_id null → nadie es moderador → 403
    if (data.moderator_id === null || data.moderator_id === undefined) {
      logger.warn(
        `⚠️ [TournamentModerator] Torneo ${tournamentId} sin moderador designado. Usuario ${userId} (${userRole}) bloqueado.`
      );
      return res.status(403).json({
        error: 'Este torneo no tiene moderador designado. Contactá a la Administración.',
        code: 'TOURNAMENT_NOT_MODERATED_BY_YOU'
      });
    }

    // Comparar como strings para tolerar UUID vs string
    if (String(data.moderator_id) !== String(userId)) {
      logger.warn(
        `⚠️ [TournamentModerator] Usuario ${userId} (${userRole}) intentó operar torneo ajeno ${tournamentId}`
      );
      return res.status(403).json({
        error: 'No tienes permiso para operar este torneo',
        code: 'TOURNAMENT_NOT_MODERATED_BY_YOU'
      });
    }

    req.tournament = data;
    return next();

  } catch (err) {
    logger.error('❌ [TournamentModerator] Excepción:', err.message);
    return res.status(500).json({
      error: 'Error interno validando permisos de torneo',
      code: 'INTERNAL_ERROR'
    });
  }
}

export default requireTournamentModerator;
