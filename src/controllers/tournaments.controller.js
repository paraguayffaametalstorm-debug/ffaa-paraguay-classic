// src/controllers/tournaments.controller.js
//
// ADR-011 — Controlador del Sistema de Torneos (F1.3).
//
// Expone los 8 handlers del RFC-002 + ADR-011 D8:
//   1. GET    /api/tournaments                              → getTournaments
//   2. POST   /api/tournaments                              → createTournament
//   3. GET    /api/tournaments/:id                          → getTournamentById
//   4. PATCH  /api/tournaments/:id/status                   → updateTournamentStatus
//   5. POST   /api/tournaments/:id/register                 → registerTeam
//   6. POST   /api/tournaments/:id/matches/:mid/result      → registerMatchResult
//   7. POST   /api/tournaments/:id/matches/:mid/draft       → registerDraftAction
//   8. PATCH  /api/tournaments/:id/moderator                → changeModerator
//
// Convenciones:
//   - req.user.id       → UUID (users.id). Usar SIEMPRE para FKs.
//   - req.user.user_id  → INTEGER (users.user_id). Solo para display.
//   - req.tournament    → poblado por requireTournamentModerator (RBAC fino).
//
// Notas de alcance F1.3:
//   - Auto-avance de bracket DIFERIDO a F1.5 (decisión 3-A).
//   - Validación de draft: Zod + integridad referencial (decisión 4-B).
//   - Registro de equipo: capitán propio + ADMIN/OWNER (decisión 2-A).
//
import { getSupabase } from '../db/supabase.js';
import { logger } from '../config/logger.js';
import { logAuditChange } from '../utils/audit.js';
import {
  TournamentCreateSchema,
  TournamentUpdateStatusSchema,
  TournamentRegisterTeamSchema,
  TournamentMatchResultSchema,
  TournamentDraftActionSchema,
  TournamentModeratorChangeSchema
} from '../utils/schemas.js';

// ============================================================
// HELPERS
// ============================================================

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value) {
  return typeof value === 'string' && UUID_REGEX.test(value);
}

/**
 * Valida un body con un schema Zod.
 * Retorna { ok: true, data } o { ok: false, response }.
 */
function parseOrError(schema, body) {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return {
      ok: false,
      response: {
        error: 'Datos inválidos',
        code: 'VALIDATION_ERROR',
        details: parsed.error.issues.map((i) => ({
          path: i.path,
          message: i.message
        }))
      }
    };
  }
  return { ok: true, data: parsed.data };
}

/**
 * Mapea errores Postgres a respuestas HTTP.
 * Retorna null si no es un código conocido (deja pasar el error genérico).
 */
function mapPgError(err) {
  if (!err || !err.code) return null;
  if (err.code === '23505') {
    return {
      status: 409,
      body: {
        error: 'Conflicto: registro duplicado',
        code: 'CONFLICT',
        details: err.message
      }
    };
  }
  if (err.code === '23503') {
    return {
      status: 400,
      body: {
        error: 'Referencia inválida (FK inexistente)',
        code: 'INVALID_REFERENCE',
        details: err.message
      }
    };
  }
  return null;
}

/**
 * Transiciones de estado válidas (Anexo III + PLAN_TRABAJO_TORNEOS.md).
 */
const VALID_TRANSITIONS = {
  DRAFT:        ['REGISTRATION', 'CANCELLED'],
  REGISTRATION: ['ONGOING', 'CANCELLED'],
  ONGOING:      ['FINISHED', 'CANCELLED'],
  FINISHED:     [],
  CANCELLED:    []
};

function isValidTransition(from, to) {
  const allowed = VALID_TRANSITIONS[from] || [];
  return allowed.includes(to);
}

/**
 * Auditoría no bloqueante (patrón veteran.controller.js).
 */
async function safeAudit(params) {
  try {
    await logAuditChange(params);
  } catch (err) {
    logger.warn('⚠️ [Tournaments] Auditoría falló:', err.message);
  }
}

// ============================================================
// 1. GET /api/tournaments
// ============================================================
export async function getTournaments(req, res, next) {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return res.status(500).json({ error: 'Database client unavailable', code: 'DB_UNAVAILABLE' });
    }

    let query = supabase
      .from('tournaments')
      .select('id, name, format, scope, status, starts_at, ends_at, min_teams, max_teams, moderator_id, created_by, created_at, updated_at')
      .order('starts_at', { ascending: false })
      .limit(200);

    const statusFilter = req.query.status ? String(req.query.status).toUpperCase() : null;
    if (statusFilter) {
      if (!['DRAFT', 'REGISTRATION', 'ONGOING', 'FINISHED', 'CANCELLED'].includes(statusFilter)) {
        return res.status(400).json({
          error: 'status inválido',
          code: 'INVALID_STATUS_FILTER'
        });
      }
      query = query.eq('status', statusFilter);
    }

    const scopeFilter = req.query.scope ? String(req.query.scope).toUpperCase() : null;
    if (scopeFilter) {
      if (!['F1', 'F2', 'F3', 'F4'].includes(scopeFilter)) {
        return res.status(400).json({
          error: 'scope inválido',
          code: 'INVALID_SCOPE_FILTER'
        });
      }
      query = query.eq('scope', scopeFilter);
    }

    const { data, error } = await query;
    if (error) throw error;

    return res.json({
      success: true,
      total: (data || []).length,
      tournaments: data || []
    });

  } catch (err) {
    logger.error('❌ [Tournaments] getTournaments:', err.message);
    next(err);
  }
}

// ============================================================
// 2. POST /api/tournaments
// ============================================================
export async function createTournament(req, res, next) {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return res.status(500).json({ error: 'Database client unavailable', code: 'DB_UNAVAILABLE' });
    }

    const parsed = parseOrError(TournamentCreateSchema, req.body);
    if (!parsed.ok) {
      return res.status(400).json(parsed.response);
    }
    const data = parsed.data;

    const insertPayload = {
      name: data.name,
      format: data.format,
      scope: data.scope,
      status: 'DRAFT',
      starts_at: data.starts_at,
      ends_at: data.ends_at,
      min_teams: data.min_teams,
      max_teams: data.max_teams,
      moderator_id: data.moderator_id || null,
      metadata: data.metadata || {},
      created_by: req.user.id
    };

    const { data: inserted, error: insErr } = await supabase
      .from('tournaments')
      .insert(insertPayload)
      .select()
      .single();

    if (insErr) {
      const mapped = mapPgError(insErr);
      if (mapped) return res.status(mapped.status).json(mapped.body);
      throw insErr;
    }

    await safeAudit({
      supabase,
      actorId: req.user.user_id || req.user.id,
      actorNick: req.user.nick || req.user.email,
      targetId: inserted.id,
      targetNick: inserted.name,
      action: 'TOURNAMENT_CREATED',
      details: {
        tournament_id: inserted.id,
        name: inserted.name,
        format: inserted.format,
        scope: inserted.scope
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Torneo creado',
      tournament: inserted
    });

  } catch (err) {
    logger.error('❌ [Tournaments] createTournament:', err.message);
    next(err);
  }
}

// ============================================================
// 3. GET /api/tournaments/:id
// ============================================================
export async function getTournamentById(req, res, next) {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return res.status(500).json({ error: 'Database client unavailable', code: 'DB_UNAVAILABLE' });
    }

    const tournamentId = req.params.id;
    if (!isUuid(tournamentId)) {
      return res.status(400).json({
        error: 'Identificador de torneo inválido',
        code: 'INVALID_TOURNAMENT_ID'
      });
    }

    // 1. Torneo
    const { data: tournament, error: tErr } = await supabase
      .from('tournaments')
      .select('*')
      .eq('id', tournamentId)
      .maybeSingle();

    if (tErr) throw tErr;
    if (!tournament) {
      return res.status(404).json({
        error: 'Torneo no encontrado',
        code: 'TOURNAMENT_NOT_FOUND'
      });
    }

    // 2. Participantes
    const { data: participants, error: pErr } = await supabase
      .from('tournament_participants')
      .select('id, tournament_id, team_name, captain_user_id, roster, registered_at, status')
      .eq('tournament_id', tournamentId)
      .order('registered_at', { ascending: true });

    if (pErr) throw pErr;

    // 3. Matches
    const { data: matches, error: mErr } = await supabase
      .from('tournament_matches')
      .select('id, tournament_id, phase, round, team_a_id, team_b_id, best_of, score_a, score_b, winner_id, status, scheduled_at, metadata, created_at, updated_at')
      .eq('tournament_id', tournamentId)
      .order('phase', { ascending: true })
      .order('round', { ascending: true });

    if (mErr) throw mErr;

    // 4. Historial de moderador
    const { data: moderatorHistory, error: hErr } = await supabase
      .from('tournament_moderator_history')
      .select('id, tournament_id, previous_user, new_user, changed_by, changed_at, reason')
      .eq('tournament_id', tournamentId)
      .order('changed_at', { ascending: false });

    if (hErr) throw hErr;

    return res.json({
      success: true,
      tournament,
      participants: participants || [],
      matches: matches || [],
      moderator_history: moderatorHistory || []
    });

  } catch (err) {
    logger.error('❌ [Tournaments] getTournamentById:', err.message);
    next(err);
  }
}

// ============================================================
// 4. PATCH /api/tournaments/:id/status
// ============================================================
export async function updateTournamentStatus(req, res, next) {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return res.status(500).json({ error: 'Database client unavailable', code: 'DB_UNAVAILABLE' });
    }

    const tournamentId = req.params.id;
    if (!isUuid(tournamentId)) {
      return res.status(400).json({
        error: 'Identificador de torneo inválido',
        code: 'INVALID_TOURNAMENT_ID'
      });
    }

    const parsed = parseOrError(TournamentUpdateStatusSchema, req.body);
    if (!parsed.ok) {
      return res.status(400).json(parsed.response);
    }
    const { status: newStatus, reason } = parsed.data;

    // Cargar torneo actual
    const { data: current, error: cErr } = await supabase
      .from('tournaments')
      .select('id, name, status')
      .eq('id', tournamentId)
      .maybeSingle();

    if (cErr) throw cErr;
    if (!current) {
      return res.status(404).json({
        error: 'Torneo no encontrado',
        code: 'TOURNAMENT_NOT_FOUND'
      });
    }

    // Validar transición
    if (!isValidTransition(current.status, newStatus)) {
      return res.status(400).json({
        error: `Transición inválida: ${current.status} → ${newStatus}`,
        code: 'INVALID_STATUS_TRANSITION',
        details: {
          from: current.status,
          to: newStatus,
          allowed: VALID_TRANSITIONS[current.status] || []
        }
      });
    }

    // Update
    const updatePayload = { status: newStatus, updated_at: new Date().toISOString() };
    if (newStatus === 'CANCELLED' && reason) {
      updatePayload.metadata = { cancellation_reason: reason };
    }

    const { data: updated, error: uErr } = await supabase
      .from('tournaments')
      .update(updatePayload)
      .eq('id', tournamentId)
      .select()
      .single();

    if (uErr) {
      const mapped = mapPgError(uErr);
      if (mapped) return res.status(mapped.status).json(mapped.body);
      throw uErr;
    }

    await safeAudit({
      supabase,
      actorId: req.user.user_id || req.user.id,
      actorNick: req.user.nick || req.user.email,
      targetId: tournamentId,
      targetNick: current.name,
      action: 'TOURNAMENT_STATUS_CHANGED',
      details: {
        tournament_id: tournamentId,
        from: current.status,
        to: newStatus,
        reason: reason || null
      }
    });

    return res.json({
      success: true,
      message: `Estado actualizado: ${current.status} → ${newStatus}`,
      tournament: updated
    });

  } catch (err) {
    logger.error('❌ [Tournaments] updateTournamentStatus:', err.message);
    next(err);
  }
}

// ============================================================
// 5. POST /api/tournaments/:id/register
// ============================================================
export async function registerTeam(req, res, next) {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return res.status(500).json({ error: 'Database client unavailable', code: 'DB_UNAVAILABLE' });
    }

    const tournamentId = req.params.id;
    if (!isUuid(tournamentId)) {
      return res.status(400).json({
        error: 'Identificador de torneo inválido',
        code: 'INVALID_TOURNAMENT_ID'
      });
    }

    const parsed = parseOrError(TournamentRegisterTeamSchema, req.body);
    if (!parsed.ok) {
      return res.status(400).json(parsed.response);
    }
    const data = parsed.data;

    // 1. Cargar torneo
    const { data: tournament, error: tErr } = await supabase
      .from('tournaments')
      .select('id, name, status, max_teams, min_teams')
      .eq('id', tournamentId)
      .maybeSingle();

    if (tErr) throw tErr;
    if (!tournament) {
      return res.status(404).json({
        error: 'Torneo no encontrado',
        code: 'TOURNAMENT_NOT_FOUND'
      });
    }

    // 2. Torneo debe estar en REGISTRATION
    if (tournament.status !== 'REGISTRATION') {
      return res.status(400).json({
        error: `El torneo no está en REGISTRATION (estado actual: ${tournament.status})`,
        code: 'TOURNAMENT_NOT_IN_REGISTRATION'
      });
    }

    // 3. RBAC: capitán propio o ADMIN/OWNER (decisión 2-A)
    const actorRole = (req.user?.role || 'MIEMBRO').toUpperCase();
    const isPrivileged = actorRole === 'ADMIN' || actorRole === 'OWNER';
    if (!isPrivileged && String(data.captain_user_id) !== String(req.user.id)) {
      return res.status(403).json({
        error: 'Solo el capitán designado puede registrar su propio equipo',
        code: 'NOT_TEAM_CAPTAIN'
      });
    }

    // 4. Insertar participante (UNIQUE tournament_id+team_name → 23505)
    const { data: inserted, error: insErr } = await supabase
      .from('tournament_participants')
      .insert({
        tournament_id: tournamentId,
        team_name: data.team_name,
        captain_user_id: data.captain_user_id,
        roster: data.roster,
        status: 'CONFIRMED'
      })
      .select()
      .single();

    if (insErr) {
      const mapped = mapPgError(insErr);
      if (mapped) {
        if (insErr.code === '23505') {
          return res.status(409).json({
            error: 'Ya existe un equipo con ese nombre en este torneo',
            code: 'TEAM_NAME_ALREADY_EXISTS'
          });
        }
        return res.status(mapped.status).json(mapped.body);
      }
      throw insErr;
    }

    await safeAudit({
      supabase,
      actorId: req.user.user_id || req.user.id,
      actorNick: req.user.nick || req.user.email,
      targetId: inserted.id,
      targetNick: inserted.team_name,
      action: 'TOURNAMENT_TEAM_REGISTERED',
      details: {
        tournament_id: tournamentId,
        team_id: inserted.id,
        team_name: inserted.team_name,
        captain_user_id: data.captain_user_id,
        roster_size: data.roster.length
      }
    });

    return res.status(201).json({
      success: true,
      message: `Equipo "${inserted.team_name}" registrado`,
      participant: inserted
    });

  } catch (err) {
    logger.error('❌ [Tournaments] registerTeam:', err.message);
    next(err);
  }
}

// ============================================================
// 6. POST /api/tournaments/:id/matches/:mid/result
// ============================================================
export async function registerMatchResult(req, res, next) {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return res.status(500).json({ error: 'Database client unavailable', code: 'DB_UNAVAILABLE' });
    }

    const tournamentId = req.params.id;
    const matchId = req.params.mid;

    if (!isUuid(tournamentId)) {
      return res.status(400).json({
        error: 'Identificador de torneo inválido',
        code: 'INVALID_TOURNAMENT_ID'
      });
    }
    if (!isUuid(matchId)) {
      return res.status(400).json({
        error: 'Identificador de match inválido',
        code: 'INVALID_MATCH_ID'
      });
    }

    const parsed = parseOrError(TournamentMatchResultSchema, req.body);
    if (!parsed.ok) {
      return res.status(400).json(parsed.response);
    }
    const data = parsed.data;

    // 1. Cargar match
    const { data: match, error: mErr } = await supabase
      .from('tournament_matches')
      .select('id, tournament_id, team_a_id, team_b_id, best_of, score_a, score_b, status')
      .eq('id', matchId)
      .maybeSingle();

    if (mErr) throw mErr;
    if (!match) {
      return res.status(404).json({
        error: 'Match no encontrado',
        code: 'MATCH_NOT_FOUND'
      });
    }

    // 2. Match debe pertenecer al torneo del path
    if (String(match.tournament_id) !== String(tournamentId)) {
      return res.status(404).json({
        error: 'Match no pertenece a este torneo',
        code: 'MATCH_NOT_FOUND'
      });
    }

    // 3. Best-of debe coincidir con el match (si se provee)
    const bestOf = data.best_of || match.best_of || 3;
    if (bestOf !== match.best_of) {
      return res.status(400).json({
        error: `best_of inconsistente: el match es Bo${match.best_of}, se envió Bo${bestOf}`,
        code: 'BEST_OF_MISMATCH'
      });
    }

    // 4. Determinar ganador (Zod ya validó no-empate)
    let winnerId = data.winner_id || null;
    if (!winnerId) {
      if (data.score_a > data.score_b) winnerId = match.team_a_id;
      else if (data.score_b > data.score_a) winnerId = match.team_b_id;
    }

    // 5. Update
    const { data: updated, error: uErr } = await supabase
      .from('tournament_matches')
      .update({
        score_a: data.score_a,
        score_b: data.score_b,
        winner_id: winnerId,
        status: 'FINISHED',
        metadata: data.notes ? { notes: data.notes } : {},
        updated_at: new Date().toISOString()
      })
      .eq('id', matchId)
      .select()
      .single();

    if (uErr) {
      const mapped = mapPgError(uErr);
      if (mapped) return res.status(mapped.status).json(mapped.body);
      throw uErr;
    }

    await safeAudit({
      supabase,
      actorId: req.user.user_id || req.user.id,
      actorNick: req.user.nick || req.user.email,
      targetId: matchId,
      targetNick: null,
      action: 'TOURNAMENT_MATCH_RESULT_RECORDED',
      details: {
        tournament_id: tournamentId,
        match_id: matchId,
        score_a: data.score_a,
        score_b: data.score_b,
        winner_id: winnerId,
        best_of: bestOf
      }
    });

    return res.json({
      success: true,
      message: 'Resultado registrado',
      match: updated
    });

  } catch (err) {
    logger.error('❌ [Tournaments] registerMatchResult:', err.message);
    next(err);
  }
}

// ============================================================
// 7. POST /api/tournaments/:id/matches/:mid/draft
// ============================================================
export async function registerDraftAction(req, res, next) {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return res.status(500).json({ error: 'Database client unavailable', code: 'DB_UNAVAILABLE' });
    }

    const tournamentId = req.params.id;
    const matchId = req.params.mid;

    if (!isUuid(tournamentId)) {
      return res.status(400).json({
        error: 'Identificador de torneo inválido',
        code: 'INVALID_TOURNAMENT_ID'
      });
    }
    if (!isUuid(matchId)) {
      return res.status(400).json({
        error: 'Identificador de match inválido',
        code: 'INVALID_MATCH_ID'
      });
    }

    const parsed = parseOrError(TournamentDraftActionSchema, req.body);
    if (!parsed.ok) {
      return res.status(400).json(parsed.response);
    }
    const data = parsed.data;

    // 1. Cargar match + verificar torneo
    const { data: match, error: mErr } = await supabase
      .from('tournament_matches')
      .select('id, tournament_id, team_a_id, team_b_id')
      .eq('id', matchId)
      .maybeSingle();

    if (mErr) throw mErr;
    if (!match) {
      return res.status(404).json({
        error: 'Match no encontrado',
        code: 'MATCH_NOT_FOUND'
      });
    }
    if (String(match.tournament_id) !== String(tournamentId)) {
      return res.status(404).json({
        error: 'Match no pertenece a este torneo',
        code: 'MATCH_NOT_FOUND'
      });
    }

    // 2. team_id debe ser team_a o team_b del match (integridad referencial)
    if (String(data.team_id) !== String(match.team_a_id) &&
        String(data.team_id) !== String(match.team_b_id)) {
      return res.status(400).json({
        error: 'El team_id no pertenece a este match',
        code: 'TEAM_NOT_IN_MATCH'
      });
    }

    // 3. Insertar acción (UNIQUE match_id+game_number+order_index → 23505)
    const { data: inserted, error: insErr } = await supabase
      .from('tournament_drafts')
      .insert({
        match_id: matchId,
        game_number: data.game_number,
        team_id: data.team_id,
        action: data.action,
        aircraft_id: data.aircraft_id,
        order_index: data.order_index
      })
      .select()
      .single();

    if (insErr) {
      const mapped = mapPgError(insErr);
      if (mapped) {
        if (insErr.code === '23505') {
          return res.status(409).json({
            error: 'Ya existe una acción en ese turno del draft (order_index duplicado)',
            code: 'DRAFT_ORDER_ALREADY_USED'
          });
        }
        if (insErr.code === '23503') {
          return res.status(400).json({
            error: 'aircraft_id o team_id no existen en la base',
            code: 'INVALID_REFERENCE'
          });
        }
        return res.status(mapped.status).json(mapped.body);
      }
      throw insErr;
    }

    await safeAudit({
      supabase,
      actorId: req.user.user_id || req.user.id,
      actorNick: req.user.nick || req.user.email,
      targetId: inserted.id,
      targetNick: null,
      action: 'TOURNAMENT_DRAFT_ACTION_RECORDED',
      details: {
        tournament_id: tournamentId,
        match_id: matchId,
        game_number: data.game_number,
        order_index: data.order_index,
        action: data.action,
        aircraft_id: data.aircraft_id,
        team_id: data.team_id
      }
    });

    return res.status(201).json({
      success: true,
      message: `Acción ${data.action} registrada`,
      draft: inserted
    });

  } catch (err) {
    logger.error('❌ [Tournaments] registerDraftAction:', err.message);
    next(err);
  }
}

// ============================================================
// 8. PATCH /api/tournaments/:id/moderator
// ============================================================
export async function changeModerator(req, res, next) {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return res.status(500).json({ error: 'Database client unavailable', code: 'DB_UNAVAILABLE' });
    }

    const tournamentId = req.params.id;
    if (!isUuid(tournamentId)) {
      return res.status(400).json({
        error: 'Identificador de torneo inválido',
        code: 'INVALID_TOURNAMENT_ID'
      });
    }

    const parsed = parseOrError(TournamentModeratorChangeSchema, req.body);
    if (!parsed.ok) {
      return res.status(400).json(parsed.response);
    }
    const { moderator_id: newModeratorId, reason } = parsed.data;

    // 1. Cargar torneo
    const { data: tournament, error: tErr } = await supabase
      .from('tournaments')
      .select('id, name, moderator_id, status')
      .eq('id', tournamentId)
      .maybeSingle();

    if (tErr) throw tErr;
    if (!tournament) {
      return res.status(404).json({
        error: 'Torneo no encontrado',
        code: 'TOURNAMENT_NOT_FOUND'
      });
    }

    // 2. No permitir mismo moderador
    if (String(tournament.moderator_id) === String(newModeratorId)) {
      return res.status(400).json({
        error: 'El nuevo moderador es el mismo que el actual',
        code: 'SAME_MODERATOR'
      });
    }

    const previousModeratorId = tournament.moderator_id;

    // 3. Insertar en historial
    const { error: hErr } = await supabase
      .from('tournament_moderator_history')
      .insert({
        tournament_id: tournamentId,
        previous_user: previousModeratorId,
        new_user: newModeratorId,
        changed_by: req.user.id,
        reason
      });

    if (hErr) {
      const mapped = mapPgError(hErr);
      if (mapped) return res.status(mapped.status).json(mapped.body);
      throw hErr;
    }

    // 4. Update tournaments.moderator_id
    const { data: updated, error: uErr } = await supabase
      .from('tournaments')
      .update({ moderator_id: newModeratorId, updated_at: new Date().toISOString() })
      .eq('id', tournamentId)
      .select()
      .single();

    if (uErr) {
      const mapped = mapPgError(uErr);
      if (mapped) return res.status(mapped.status).json(mapped.body);
      throw uErr;
    }

    await safeAudit({
      supabase,
      actorId: req.user.user_id || req.user.id,
      actorNick: req.user.nick || req.user.email,
      targetId: tournamentId,
      targetNick: tournament.name,
      action: 'TOURNAMENT_MODERATOR_CHANGED',
      details: {
        tournament_id: tournamentId,
        previous_user: previousModeratorId,
        new_user: newModeratorId,
        reason
      }
    });

    return res.json({
      success: true,
      message: 'Moderador actualizado',
      tournament: updated
    });

  } catch (err) {
    logger.error('❌ [Tournaments] changeModerator:', err.message);
    next(err);
  }
}
