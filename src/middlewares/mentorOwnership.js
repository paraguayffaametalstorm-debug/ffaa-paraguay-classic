// src/middlewares/mentorOwnership.js
//
// ADR-010 — RBAC fino para el módulo Veteranos.
//
// Problema: requireRole('VETERANO') valida el ROL, pero no valida que el
// Veterano autenticado sea DUEÑO de la mentoría que intenta ver/modificar.
// Sin este middleware, un Veterano podría leer mentorías ajenas con solo
// adivinar el UUID de la mentoría.
//
// Reglas (ADR-010 §Permisos):
//   - VETERANO: solo puede acceder si mentor_id === req.user.id.
//   - ADMIN:    puede acceder a cualquier mentoría.
//   - OWNER:    puede acceder a cualquier mentoría.
//   - MIEMBRO:  nunca (el requireRole ya lo bloquea antes).
//
// Uso:
//   router.get('/mentorship/:id',
//     requireAuth,
//     requireRole('VETERANO', 'ADMIN', 'OWNER'),
//     requireMentorOwnership,
//     getMentorship
//   );
//
// Deja en req.mentorship el registro { id, mentor_id, mentee_id, status }
// para que el controller no tenga que volver a consultarlo.
//
import { getSupabase } from '../db/supabase.js';
import { logger } from '../config/logger.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function requireMentorOwnership(req, res, next) {
  try {
    const mentorshipId = req.params.id;
    const userRole = (req.user?.role || 'MIEMBRO').toUpperCase();
    const userId = req.user?.id;         // UUID (users.id)
    const userUserId = req.user?.user_id; // INTEGER (users.user_id)

    // 1. Validar formato del ID (defensa temprana)
    if (!mentorshipId || !UUID_REGEX.test(String(mentorshipId))) {
      return res.status(400).json({
        error: 'Identificador de mentoría inválido',
        code: 'INVALID_MENTORSHIP_ID'
      });
    }

    // 2. ADMIN/OWNER: bypass total (no toca BD)
    if (userRole === 'ADMIN' || userRole === 'OWNER') {
      const supabase = getSupabase();
      if (!supabase) {
        return res.status(500).json({
          error: 'Database client unavailable',
          code: 'DB_UNAVAILABLE'
        });
      }
      const { data, error } = await supabase
        .from('mentorships')
        .select('id, mentor_id, mentee_id, status, started_at, ended_at')
        .eq('id', mentorshipId)
        .maybeSingle();

      if (error) {
        logger.error('❌ [MentorOwnership] Error consultando mentoría:', error.message);
        return res.status(500).json({
          error: 'Error consultando la mentoría',
          code: 'DB_QUERY_FAILED'
        });
      }
      if (!data) {
        return res.status(404).json({
          error: 'Mentoría no encontrada',
          code: 'MENTORSHIP_NOT_FOUND'
        });
      }
      req.mentorship = data;
      return next();
    }

    // 3. VETERANO: validar que sea el mentor dueño
    if (userRole === 'VETERANO') {
      if (!userId) {
        return res.status(403).json({
          error: 'No se pudo identificar al Veterano autenticado',
          code: 'MENTORSHIP_FORBIDDEN'
        });
      }

      const supabase = getSupabase();
      if (!supabase) {
        return res.status(500).json({
          error: 'Database client unavailable',
          code: 'DB_UNAVAILABLE'
        });
      }

      const { data, error } = await supabase
        .from('mentorships')
        .select('id, mentor_id, mentee_id, status, started_at, ended_at')
        .eq('id', mentorshipId)
        .maybeSingle();

      if (error) {
        logger.error('❌ [MentorOwnership] Error consultando mentoría:', error.message);
        return res.status(500).json({
          error: 'Error consultando la mentoría',
          code: 'DB_QUERY_FAILED'
        });
      }
      if (!data) {
        return res.status(404).json({
          error: 'Mentoría no encontrada',
          code: 'MENTORSHIP_NOT_FOUND'
        });
      }

      // Comparar como strings para tolerar UUID vs string
      if (String(data.mentor_id) !== String(userId)) {
        logger.warn(
          `⚠️ [MentorOwnership] Veterano ${userId} intentó acceder a mentoría ajena ${mentorshipId}`
        );
        return res.status(403).json({
          error: 'No tienes permiso para acceder a esta mentoría',
          code: 'MENTORSHIP_FORBIDDEN'
        });
      }

      req.mentorship = data;
      return next();
    }

    // 4. Cualquier otro rol (MIEMBRO) → 403
    // (En la práctica requireRole ya lo bloqueó, pero defensa en profundidad)
    return res.status(403).json({
      error: 'No tienes permiso para acceder a mentorías',
      code: 'MENTORSHIP_FORBIDDEN'
    });

  } catch (err) {
    logger.error('❌ [MentorOwnership] Excepción:', err.message);
    return res.status(500).json({
      error: 'Error interno validando permisos de mentoría',
      code: 'INTERNAL_ERROR'
    });
  }
}

export default requireMentorOwnership;