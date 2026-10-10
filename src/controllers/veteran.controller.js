// src/controllers/veteran.controller.js
//
// ADR-010 — Controlador del módulo Sección Veteranos.
//
// Expone la vista propia del Veterano (pupilos, historial, contacto,
// evaluación consultiva) y los endpoints admin de gestión de mentorías.
//
// Convenciones:
//   - req.user.id       → UUID (users.id). Usar SIEMPRE para FKs.
//   - req.user.user_id  → INTEGER (users.user_id). Solo para display.
//   - req.mentorship    → poblado por requireMentorOwnership (RBAC fino).
//
import { getSupabase } from '../db/supabase.js';
import { logger } from '../config/logger.js';
import { logAuditChange } from '../utils/audit.js';

// ============================================================
// HELPERS
// ============================================================

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Calcula el semáforo militar a partir de tokens y días.
 * Regla oficial (Art. 26 normativa):
 *   VERDE:   tokens >= 175 && días >= 4
 *   NARANJA: tokens >= 130 && días >= 3
 *   ROJO:    tokens >= 100 && días >= 2
 *   NEGRO:   el resto
 */
function computeStatus(tokens, days) {
  const t = Number(tokens) || 0;
  const d = Number(days) || 0;
  if (t >= 175 && d >= 4) return 'VERDE';
  if (t >= 130 && d >= 3) return 'NARANJA';
  if (t >= 100 && d >= 2) return 'ROJO';
  return 'NEGRO';
}

/**
 * Normaliza un UUID o null.
 */
function toUuidOrNull(value) {
  if (!value) return null;
  const s = String(value);
  return UUID_REGEX.test(s) ? s : null;
}

/**
 * Valida que un campo de `criteria` sea uno de los valores permitidos.
 * Criterios de Art. 25.4 (v3.0, borrador — la API los acepta ya).
 */
const CRITERIA_VALUES = new Set(['ALTA', 'MEDIA', 'BAJA']);
const CRITERIA_KEYS = [
  'participacion',
  'cooperacion',
  'conducta',
  'integracion',
  'disposicion'
];

function validateCriteria(criteria) {
  if (!criteria || typeof criteria !== 'object' || Array.isArray(criteria)) {
    return { ok: false, error: 'criteria debe ser un objeto JSON' };
  }
  for (const key of CRITERIA_KEYS) {
    if (!(key in criteria)) {
      return { ok: false, error: `Falta el criterio "${key}"` };
    }
    if (!CRITERIA_VALUES.has(criteria[key])) {
      return {
        ok: false,
        error: `Valor inválido para "${key}": debe ser ALTA, MEDIA o BAJA`
      };
    }
  }
  return { ok: true };
}

// ============================================================
// 1. GET /api/veteran/my-pupilos
// ============================================================
// Lista los pupilos con mentoría ACTIVE del Veterano autenticado.
// Para ADMIN/OWNER, `?mentor_id=<uuid>` permite ver los de otro Veterano.
// Para OWNER sin `?mentor_id`, devuelve TODOS los pupilos agrupados por Veterano.
//
export async function getMyPupilos(req, res, next) {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return res.status(500).json({
        error: 'Database client unavailable',
        code: 'DB_UNAVAILABLE'
      });
    }

    const actorRole = (req.user?.role || 'MIEMBRO').toUpperCase();
    let mentorId = req.user?.id; // UUID por defecto
    let globalView = false;       // OWNER sin ?mentor_id → vista global

    // ADMIN/OWNER pueden consultar los pupilos de otro Veterano vía query
    if ((actorRole === 'ADMIN' || actorRole === 'OWNER') && req.query.mentor_id) {
      const requested = toUuidOrNull(req.query.mentor_id);
      if (!requested) {
        return res.status(400).json({
          error: 'mentor_id debe ser un UUID válido',
          code: 'INVALID_MENTOR_ID'
        });
      }
      mentorId = requested;
    } else if (actorRole === 'OWNER' && !req.query.mentor_id) {
      // ADR-010: OWNER sin ?mentor_id ve TODOS los pupilos agrupados por Veterano
      globalView = true;
      mentorId = null;
    }

    if (!mentorId && !globalView) {
      return res.status(400).json({
        error: 'No se pudo determinar el Veterano',
        code: 'INVALID_MENTOR_ID'
      });
    }

    // 1. Mentorías ACTIVE (del mentor específico o de todos si globalView)
    let mQuery = supabase
      .from('mentorships')
      .select('id, mentor_id, mentee_id, started_at, status')
      .eq('status', 'ACTIVE')
      .order('started_at', { ascending: false });

    if (!globalView) {
      mQuery = mQuery.eq('mentor_id', mentorId);
    }

    const { data: mentorships, error: mErr } = await mQuery;
    if (mErr) throw mErr;

    const list = mentorships || [];

    // 2. Datos de los pupilos (users)
    const menteeIds = [...new Set(list.map(m => m.mentee_id).filter(Boolean))];
    let usersById = {};
    if (menteeIds.length > 0) {
      const { data: users, error: uErr } = await supabase
        .from('users')
        .select('id, user_id, nick, role, status, last_activity, avg_tokens, weeks_evaluated, perf_status')
        .in('id', menteeIds);

      if (uErr) throw uErr;

      (users || []).forEach(u => {
        if (u.id) usersById[u.id] = u;
      });
    }

    // 3. Métricas de rendimiento recientes (para semáforo)
    //    Traemos las performances más recientes por pupilo.
    let perfByNick = {};
    if (menteeIds.length > 0) {
      const nicks = Object.values(usersById).map(u => u.nick).filter(Boolean);
      if (nicks.length > 0) {
        const { data: perfs, error: pErr } = await supabase
          .from('performances')
          .select('nick, tokens, days_connected, status, created_at')
          .in('nick', nicks)
          .order('created_at', { ascending: false });

        if (!pErr && perfs) {
          perfs.forEach(p => {
            const key = (p.nick || '').toLowerCase();
            if (!perfByNick[key]) perfByNick[key] = [];
            perfByNick[key].push(p);
          });
        }
      }
    }

    // 4. Armar respuesta enriquecida
    const pupilos = list.map(m => {
      const u = usersById[m.mentee_id] || {};
      const nick = u.nick || 'Piloto';
      const perfs = perfByNick[nick.toLowerCase()] || [];

      // Promedio de tokens de las últimas 4 performances (o menos si no hay)
      const recent = perfs.slice(0, 4);
      const avgTokens = recent.length > 0
        ? Math.round(recent.reduce((s, p) => s + (Number(p.tokens) || 0), 0) / recent.length)
        : (typeof u.avg_tokens === 'number' ? u.avg_tokens : 0);

      const avgDays = recent.length > 0
        ? Math.round(recent.reduce((s, p) => s + (Number(p.days_connected) || 0), 0) / recent.length)
        : 0;

      const latestStatus = recent[0]?.status
        || u.perf_status
        || computeStatus(avgTokens, avgDays);

      return {
        mentorship_id: m.id,
        mentee_id: m.mentee_id,
        user_id: Number.isInteger(u.user_id) ? u.user_id : null,
        nick,
        role: (u.role || 'MIEMBRO').toUpperCase(),
        status: (u.status || 'ACTIVE').toUpperCase(),
        started_at: m.started_at,
        tokens: avgTokens,
        days: avgDays,
        perf_status: String(latestStatus || 'PENDIENTE').toUpperCase(),
        last_activity: u.last_activity || null,
        weeks_evaluated: typeof u.weeks_evaluated === 'number' ? u.weeks_evaluated : recent.length
      };
    });

    // ADR-010: si es vista global (OWNER), agrupar por Veterano
    if (globalView) {
      // 1. Cargar nicks de los mentores
      const mentorIds = [...new Set(list.map(m => m.mentor_id).filter(Boolean))];
      let mentorsById = {};
      if (mentorIds.length > 0) {
        const { data: mentors } = await supabase
          .from('users')
          .select('id, nick, status, role')
          .in('id', mentorIds);
        (mentors || []).forEach(m => { if (m.id) mentorsById[m.id] = m; });
      }

      // 2. Agrupar pupilos por mentor_id
      const groupedMap = {};
      pupilos.forEach(p => {
        const m = list.find(x => x.id === p.mentorship_id);
        const mid = m?.mentor_id || 'unknown';
        if (!groupedMap[mid]) {
          const mentor = mentorsById[mid] || {};
          groupedMap[mid] = {
            mentor_id: mid,
            mentor_nick: mentor.nick || 'Sin Nick',
            mentor_status: (mentor.status || 'ACTIVE').toUpperCase(),
            mentor_role: (mentor.role || 'VETERANO').toUpperCase(),
            pupilos: []
          };
        }
        groupedMap[mid].pupilos.push(p);
      });

      return res.json({
        success: true,
        global_view: true,
        total: pupilos.length,
        total_mentores: Object.keys(groupedMap).length,
        grupos: Object.values(groupedMap),
        pupilos  // mantener flat por compatibilidad
      });
    }

    return res.json({
      success: true,
      mentor_id: mentorId,
      total: pupilos.length,
      pupilos
    });

  } catch (err) {
    logger.error('❌ [Veteran] getMyPupilos:', err.message);
    next(err);
  }
}

// ============================================================
// 2. GET /api/veteran/my-mentorships
// ============================================================
// Historial de mentorías del Veterano (ACTIVE + ENDED + REASSIGNED).
// Para OWNER sin `?mentor_id`, devuelve TODAS las mentorías.
//
export async function getMyMentorships(req, res, next) {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return res.status(500).json({ error: 'Database client unavailable', code: 'DB_UNAVAILABLE' });
    }

    const actorRole = (req.user?.role || 'MIEMBRO').toUpperCase();
    let mentorId = req.user?.id;
    let globalView = false;

    if ((actorRole === 'ADMIN' || actorRole === 'OWNER') && req.query.mentor_id) {
      const requested = toUuidOrNull(req.query.mentor_id);
      if (!requested) {
        return res.status(400).json({ error: 'mentor_id debe ser un UUID válido', code: 'INVALID_MENTOR_ID' });
      }
      mentorId = requested;
    } else if (actorRole === 'OWNER' && !req.query.mentor_id) {
      // ADR-010: OWNER sin ?mentor_id ve TODAS las mentorías
      globalView = true;
      mentorId = null;
    }

    if (!mentorId && !globalView) {
      return res.status(400).json({ error: 'No se pudo determinar el Veterano', code: 'INVALID_MENTOR_ID' });
    }

    let mQuery = supabase
      .from('mentorships')
      .select('id, mentor_id, mentee_id, started_at, ended_at, status, ended_reason, created_at')
      .order('started_at', { ascending: false });

    if (!globalView) {
      mQuery = mQuery.eq('mentor_id', mentorId);
    }

    const { data, error } = await mQuery;
    if (error) throw error;

    const list = data || [];

    // Cargar mentees
    const menteeIds = [...new Set(list.map(m => m.mentee_id).filter(Boolean))];
    let usersById = {};
    if (menteeIds.length > 0) {
      const { data: users } = await supabase
        .from('users')
        .select('id, user_id, nick, role')
        .in('id', menteeIds);
      (users || []).forEach(u => { if (u.id) usersById[u.id] = u; });
    }

    // Cargar mentores (solo si es globalView, para mostrar nick del mentor)
    let mentorsById = {};
    if (globalView) {
      const mentorIds = [...new Set(list.map(m => m.mentor_id).filter(Boolean))];
      if (mentorIds.length > 0) {
        const { data: mentors } = await supabase
          .from('users')
          .select('id, nick, role')
          .in('id', mentorIds);
        (mentors || []).forEach(m => { if (m.id) mentorsById[m.id] = m; });
      }
    }

    const mentorships = list.map(m => {
      const u = usersById[m.mentee_id] || {};
      const mentor = mentorsById[m.mentor_id] || {};
      return {
        id: m.id,
        mentor_id: m.mentor_id,
        mentor_nick: mentor.nick || null,
        mentee_id: m.mentee_id,
        mentee_nick: u.nick || 'Piloto',
        mentee_role: (u.role || 'MIEMBRO').toUpperCase(),
        started_at: m.started_at,
        ended_at: m.ended_at,
        status: m.status,
        ended_reason: m.ended_reason || null
      };
    });

    return res.json({
      success: true,
      global_view: globalView,
      mentor_id: mentorId,
      total: mentorships.length,
      active_count: mentorships.filter(m => m.status === 'ACTIVE').length,
      mentorships
    });

  } catch (err) {
    logger.error('❌ [Veteran] getMyMentorships:', err.message);
    next(err);
  }
}

// ============================================================
// 3. GET /api/veteran/mentorship/:id
// ============================================================
// Detalle de UNA mentoría: pupilo + logs + evaluaciones.
// req.mentorship ya está poblado por requireMentorOwnership.
//
export async function getMentorship(req, res, next) {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return res.status(500).json({ error: 'Database client unavailable', code: 'DB_UNAVAILABLE' });
    }

    const m = req.mentorship; // { id, mentor_id, mentee_id, status, started_at, ended_at }

    // 1. Datos del mentee
    const { data: menteeRows } = await supabase
      .from('users')
      .select('id, user_id, nick, role, status, last_activity, avg_tokens, weeks_evaluated, perf_status')
      .eq('id', m.mentee_id)
      .limit(1);
    const mentee = menteeRows?.[0] || null;

    // 2. Logs (últimos 50)
    const { data: logs, error: logsErr } = await supabase
      .from('mentorship_logs')
      .select('id, note, created_at, created_by')
      .eq('mentorship_id', m.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (logsErr) throw logsErr;

    // 3. Evaluaciones (últimas 20)
    const { data: evals, error: evalsErr } = await supabase
      .from('mentor_evaluations')
      .select('id, criteria, summary, created_at, created_by')
      .eq('mentorship_id', m.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (evalsErr) throw evalsErr;

    return res.json({
      success: true,
      mentorship: {
        id: m.id,
        mentor_id: m.mentor_id,
        mentee_id: m.mentee_id,
        status: m.status,
        started_at: m.started_at,
        ended_at: m.ended_at
      },
      mentee: mentee
        ? {
            id: mentee.id,
            user_id: Number.isInteger(mentee.user_id) ? mentee.user_id : null,
            nick: mentee.nick || 'Piloto',
            role: (mentee.role || 'MIEMBRO').toUpperCase(),
            status: (mentee.status || 'ACTIVE').toUpperCase(),
            last_activity: mentee.last_activity || null,
            avg_tokens: typeof mentee.avg_tokens === 'number' ? mentee.avg_tokens : 0,
            weeks_evaluated: typeof mentee.weeks_evaluated === 'number' ? mentee.weeks_evaluated : 0,
            perf_status: (mentee.perf_status || 'PENDIENTE').toUpperCase()
          }
        : null,
      logs: logs || [],
      evaluations: evals || []
    });

  } catch (err) {
    logger.error('❌ [Veteran] getMentorship:', err.message);
    next(err);
  }
}

// ============================================================
// 4. POST /api/veteran/mentorship/:id/log
// ============================================================
// Registra un contacto del mentor con el pupilo.
// Body: { note: string (1..2000) }
//
export async function logContact(req, res, next) {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return res.status(500).json({ error: 'Database client unavailable', code: 'DB_UNAVAILABLE' });
    }

    const m = req.mentorship;
    const note = typeof req.body?.note === 'string' ? req.body.note.trim() : '';

    if (!note) {
      return res.status(400).json({
        error: 'La nota es obligatoria',
        code: 'NOTE_REQUIRED'
      });
    }
    if (note.length > 2000) {
      return res.status(400).json({
        error: 'La nota no puede exceder 2000 caracteres',
        code: 'NOTE_TOO_LONG'
      });
    }

    // No se puede registrar contacto en una mentoría cerrada
    if (m.status !== 'ACTIVE') {
      return res.status(400).json({
        error: 'No se puede registrar contacto en una mentoría ' + m.status,
        code: 'MENTORSHIP_NOT_ACTIVE'
      });
    }

    const { data: inserted, error: insErr } = await supabase
      .from('mentorship_logs')
      .insert({
        mentorship_id: m.id,
        note,
        created_by: req.user.id
      })
      .select('id, note, created_at, created_by')
      .single();

    if (insErr) throw insErr;

    // Auditoría (no bloqueante: si falla, logueamos y seguimos)
    try {
      await logAuditChange({
        supabase,
        actorId: req.user.user_id || req.user.id,
        actorNick: req.user.nick || req.user.email,
        targetId: m.mentee_id,
        targetNick: null,
        action: 'MENTORSHIP_LOG_ADDED',
        details: {
          mentorship_id: m.id,
          note_length: note.length
        }
      });
    } catch (auditErr) {
      logger.warn('⚠️ [Veteran] Auditoría falló (logContact):', auditErr.message);
    }

    return res.status(201).json({
      success: true,
      message: 'Contacto registrado',
      log: inserted
    });

  } catch (err) {
    logger.error('❌ [Veteran] logContact:', err.message);
    next(err);
  }
}

// ============================================================
// 5. POST /api/veteran/mentorship/:id/evaluate
// ============================================================
// Emite una evaluación consultiva (Art. 25.4 v3.0).
// Body: { criteria: { participacion, cooperacion, conducta, integracion, disposicion }, summary: string }
//
export async function evaluateMentorship(req, res, next) {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return res.status(500).json({ error: 'Database client unavailable', code: 'DB_UNAVAILABLE' });
    }

    const m = req.mentorship;
    const criteria = req.body?.criteria;
    const summary = typeof req.body?.summary === 'string' ? req.body.summary.trim() : '';

    // 1. Validar criteria
    const critCheck = validateCriteria(criteria);
    if (!critCheck.ok) {
      return res.status(400).json({
        error: critCheck.error,
        code: 'INVALID_CRITERIA'
      });
    }

    // 2. Validar summary
    if (!summary) {
      return res.status(400).json({
        error: 'El resumen es obligatorio',
        code: 'SUMMARY_REQUIRED'
      });
    }
    if (summary.length > 4000) {
      return res.status(400).json({
        error: 'El resumen no puede exceder 4000 caracteres',
        code: 'SUMMARY_TOO_LONG'
      });
    }

    // 3. Solo mentorías ACTIVE
    if (m.status !== 'ACTIVE') {
      return res.status(400).json({
        error: 'No se puede evaluar una mentoría ' + m.status,
        code: 'MENTORSHIP_NOT_ACTIVE'
      });
    }

    const { data: inserted, error: insErr } = await supabase
      .from('mentor_evaluations')
      .insert({
        mentorship_id: m.id,
        criteria,
        summary,
        created_by: req.user.id
      })
      .select('id, criteria, summary, created_at, created_by')
      .single();

    if (insErr) throw insErr;

    try {
      await logAuditChange({
        supabase,
        actorId: req.user.user_id || req.user.id,
        actorNick: req.user.nick || req.user.email,
        targetId: m.mentee_id,
        targetNick: null,
        action: 'MENTORSHIP_EVALUATION_ADDED',
        details: {
          mentorship_id: m.id,
          criteria
        }
      });
    } catch (auditErr) {
      logger.warn('⚠️ [Veteran] Auditoría falló (evaluate):', auditErr.message);
    }

    return res.status(201).json({
      success: true,
      message: 'Evaluación registrada (consultiva)',
      evaluation: inserted
    });

  } catch (err) {
    logger.error('❌ [Veteran] evaluateMentorship:', err.message);
    next(err);
  }
}

// ============================================================
// 6. GET /api/veteran/my-stats
// ============================================================
// Resumen para el dashboard del Veterano:
// pupilos activos, contactos del mes, evaluaciones del mes.
//
// ADR-010:
//   - VETERANO: stats propios.
//   - OWNER con ?mentor_id: stats de ese Veterano.
//   - OWNER sin ?mentor_id: stats GLOBALES del escuadrón.
//
export async function getMyStats(req, res, next) {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return res.status(500).json({ error: 'Database client unavailable', code: 'DB_UNAVAILABLE' });
    }

    const actorRole = (req.user?.role || 'MIEMBRO').toUpperCase();
    const isOwner = actorRole === 'OWNER';
    const mentorId = req.user?.id;

    // Determinar el mentor objetivo y si es vista global
    let targetMentorId = mentorId;
    let globalView = false;

    if (isOwner && req.query.mentor_id) {
      const requested = toUuidOrNull(req.query.mentor_id);
      if (!requested) {
        return res.status(400).json({ error: 'mentor_id debe ser un UUID válido', code: 'INVALID_MENTOR_ID' });
      }
      targetMentorId = requested;
    } else if (isOwner && !req.query.mentor_id) {
      globalView = true;
      targetMentorId = null;
    }

    if (!targetMentorId && !globalView) {
      return res.status(400).json({ error: 'No se pudo determinar el Veterano', code: 'INVALID_MENTOR_ID' });
    }

    // ─────────────────────────────────────────────────────────
    // Rama 1: OWNER con vista GLOBAL → stats del escuadrón
    // ─────────────────────────────────────────────────────────
    if (globalView) {
      // 1. Contar Veteranos ACTIVE
      const { count: vetCount } = await supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'VETERANO')
        .eq('status', 'ACTIVE');

      // 2. Contar total de mentorías ACTIVE
      const { count: totalActive } = await supabase
        .from('mentorships')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'ACTIVE');

      // 3. Logs y evaluaciones del mes (todas)
      const monthStart = new Date();
      monthStart.setUTCDate(1);
      monthStart.setUTCHours(0, 0, 0, 0);
      const monthIso = monthStart.toISOString();

      const { count: totalLogs } = await supabase
        .from('mentorship_logs')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', monthIso);

      const { count: totalEvals } = await supabase
        .from('mentor_evaluations')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', monthIso);

      return res.json({
        success: true,
        global_view: true,
        stats: {
          active_veteranos: vetCount || 0,
          active_pupilos: totalActive || 0,
          logs_this_month: totalLogs || 0,
          evaluations_this_month: totalEvals || 0,
          month_start: monthIso
        }
      });
    }

    // ─────────────────────────────────────────────────────────
    // Rama 2: VETERANO (o OWNER filtrado) → stats propios del mentor
    // ─────────────────────────────────────────────────────────

    // 1. Mentorías ACTIVE del mentor objetivo
    const { count: activeCount } = await supabase
      .from('mentorships')
      .select('*', { count: 'exact', head: true })
      .eq('mentor_id', targetMentorId)
      .eq('status', 'ACTIVE');

    // 2. IDs de todas las mentorías (ACTIVE + ENDED + REASSIGNED) del mentor objetivo
    const { data: myMentorships } = await supabase
      .from('mentorships')
      .select('id')
      .eq('mentor_id', targetMentorId);

    const ids = (myMentorships || []).map(m => m.id);

    // 3. Logs y evaluaciones del mes
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);
    const monthIso = monthStart.toISOString();

    let logsThisMonth = 0;
    let evalsThisMonth = 0;

    if (ids.length > 0) {
      const { count: lc } = await supabase
        .from('mentorship_logs')
        .select('*', { count: 'exact', head: true })
        .in('mentorship_id', ids)
        .gte('created_at', monthIso);
      logsThisMonth = lc || 0;

      const { count: ec } = await supabase
        .from('mentor_evaluations')
        .select('*', { count: 'exact', head: true })
        .in('mentorship_id', ids)
        .gte('created_at', monthIso);
      evalsThisMonth = ec || 0;
    }

    return res.json({
      success: true,
      mentor_id: targetMentorId,
      stats: {
        active_pupilos: activeCount || 0,
        total_mentorships: ids.length,
        logs_this_month: logsThisMonth,
        evaluations_this_month: evalsThisMonth,
        month_start: monthIso
      }
    });

  } catch (err) {
    logger.error('❌ [Veteran] getMyStats:', err.message);
    next(err);
  }
}

// ============================================================
// 7. POST /api/admin/mentorships (admin)
// ============================================================
// Asigna manualmente un mentor a un pupilo.
// Body: { mentor_id: uuid, mentee_id: uuid }
//
export async function adminCreateMentorship(req, res, next) {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return res.status(500).json({ error: 'Database client unavailable', code: 'DB_UNAVAILABLE' });
    }

    const mentorId = toUuidOrNull(req.body?.mentor_id);
    const menteeId = toUuidOrNull(req.body?.mentee_id);

    if (!mentorId || !menteeId) {
      return res.status(400).json({
        error: 'mentor_id y mentee_id deben ser UUIDs válidos',
        code: 'INVALID_INPUT'
      });
    }
    if (mentorId === menteeId) {
      return res.status(400).json({
        error: 'Un mentor no puede ser su propio pupilo',
        code: 'SELF_MENTORSHIP'
      });
    }

    // Validar que el mentor sea VETERANO activo
    const { data: mentorRows } = await supabase
      .from('users')
      .select('id, role, status, nick')
      .eq('id', mentorId)
      .limit(1);
    const mentor = mentorRows?.[0];
    if (!mentor) {
      return res.status(404).json({ error: 'Mentor no encontrado', code: 'MENTOR_NOT_FOUND' });
    }
    if ((mentor.role || '').toUpperCase() !== 'VETERANO') {
      return res.status(400).json({ error: 'El mentor debe tener rol VETERANO', code: 'MENTOR_NOT_VETERANO' });
    }

    // Validar que el mentee exista
    const { data: menteeRows } = await supabase
      .from('users')
      .select('id, role, status, nick')
      .eq('id', menteeId)
      .limit(1);
    const mentee = menteeRows?.[0];
    if (!mentee) {
      return res.status(404).json({ error: 'Pupilo no encontrado', code: 'MENTEE_NOT_FOUND' });
    }

    // Insertar (el índice único parcial rechazará si ya tiene mentor ACTIVE)
    const { data: inserted, error: insErr } = await supabase
      .from('mentorships')
      .insert({
        mentor_id: mentorId,
        mentee_id: menteeId,
        status: 'ACTIVE',
        created_by: req.user.id
      })
      .select()
      .single();

    if (insErr) {
      // 23505 = unique_violation del índice parcial
      if (insErr.code === '23505') {
        return res.status(409).json({
          error: 'El pupilo ya tiene un mentor ACTIVE',
          code: 'MENTEE_ALREADY_HAS_MENTOR'
        });
      }
      throw insErr;
    }

    try {
      await logAuditChange({
        supabase,
        actorId: req.user.user_id || req.user.id,
        actorNick: req.user.nick || req.user.email,
        targetId: menteeId,
        targetNick: mentee.nick,
        action: 'MENTORSHIP_MANUAL_ASSIGNED',
        details: {
          mentor_id: mentorId,
          mentor_nick: mentor.nick,
          mentee_id: menteeId,
          mentee_nick: mentee.nick
        }
      });
    } catch (auditErr) {
      logger.warn('⚠️ [Veteran] Auditoría falló (adminCreateMentorship):', auditErr.message);
    }

    return res.status(201).json({
      success: true,
      message: `Mentoría creada: ${mentor.nick} → ${mentee.nick}`,
      mentorship: inserted
    });

  } catch (err) {
    logger.error('❌ [Veteran] adminCreateMentorship:', err.message);
    next(err);
  }
}

// ============================================================
// 8. PATCH /api/admin/mentorships/:id (admin)
// ============================================================
// Cierra o reasigna una mentoría.
// Body (uno de los dos):
//   { action: 'close', reason: string }
//   { action: 'reassign', new_mentor_id: uuid, reason: string }
//
export async function adminUpdateMentorship(req, res, next) {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return res.status(500).json({ error: 'Database client unavailable', code: 'DB_UNAVAILABLE' });
    }

    const m = req.mentorship; // poblado por requireMentorOwnership
    const action = String(req.body?.action || '').toLowerCase();
    const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';

    if (m.status !== 'ACTIVE') {
      return res.status(400).json({
        error: 'Solo se pueden modificar mentorías ACTIVE',
        code: 'MENTORSHIP_NOT_ACTIVE'
      });
    }

    if (action !== 'close' && action !== 'reassign') {
      return res.status(400).json({
        error: 'action debe ser "close" o "reassign"',
        code: 'INVALID_ACTION'
      });
    }

    if (!reason || reason.length < 5) {
      return res.status(400).json({
        error: 'El motivo es obligatorio (mín. 5 caracteres)',
        code: 'REASON_REQUIRED'
      });
    }

    const nowIso = new Date().toISOString();

    if (action === 'close') {
      const { data: updated, error: upErr } = await supabase
        .from('mentorships')
        .update({
          status: 'ENDED',
          ended_at: nowIso,
          ended_reason: reason
        })
        .eq('id', m.id)
        .select()
        .single();

      if (upErr) throw upErr;

      try {
        await logAuditChange({
          supabase,
          actorId: req.user.user_id || req.user.id,
          actorNick: req.user.nick || req.user.email,
          targetId: m.mentee_id,
          targetNick: null,
          action: 'MENTORSHIP_CLOSED',
          details: { mentorship_id: m.id, reason }
        });
      } catch (auditErr) {
        logger.warn('⚠️ [Veteran] Auditoría falló (close):', auditErr.message);
      }

      return res.json({
        success: true,
        message: 'Mentoría cerrada',
        mentorship: updated
      });
    }

    // action === 'reassign'
    const newMentorId = toUuidOrNull(req.body?.new_mentor_id);
    if (!newMentorId) {
      return res.status(400).json({
        error: 'new_mentor_id debe ser un UUID válido',
        code: 'INVALID_INPUT'
      });
    }
    if (newMentorId === m.mentor_id) {
      return res.status(400).json({
        error: 'El nuevo mentor es el mismo que el actual',
        code: 'SAME_MENTOR'
      });
    }
    if (newMentorId === m.mentee_id) {
      return res.status(400).json({
        error: 'Un mentor no puede ser su propio pupilo',
        code: 'SELF_MENTORSHIP'
      });
    }

    // Validar nuevo mentor
    const { data: newMentorRows } = await supabase
      .from('users')
      .select('id, role, status, nick')
      .eq('id', newMentorId)
      .limit(1);
    const newMentor = newMentorRows?.[0];
    if (!newMentor) {
      return res.status(404).json({ error: 'Nuevo mentor no encontrado', code: 'MENTOR_NOT_FOUND' });
    }
    if ((newMentor.role || '').toUpperCase() !== 'VETERANO') {
      return res.status(400).json({ error: 'El nuevo mentor debe tener rol VETERANO', code: 'MENTOR_NOT_VETERANO' });
    }

    // 1. Cerrar la actual como REASSIGNED
    const { error: closeErr } = await supabase
      .from('mentorships')
      .update({
        status: 'REASSIGNED',
        ended_at: nowIso,
        ended_reason: reason
      })
      .eq('id', m.id);

    if (closeErr) throw closeErr;

    // 2. Crear la nueva
    const { data: created, error: createErr } = await supabase
      .from('mentorships')
      .insert({
        mentor_id: newMentorId,
        mentee_id: m.mentee_id,
        status: 'ACTIVE',
        created_by: req.user.id
      })
      .select()
      .single();

    if (createErr) {
      logger.error('❌ [Veteran] Reasignación falló al crear nueva mentoría:', createErr.message);
      // La vieja ya quedó REASSIGNED — no hay rollback automático.
      // Devolvemos 500 con el id viejo para que el admin sepa el estado.
      return res.status(500).json({
        error: 'La mentoría anterior se cerró pero no se pudo crear la nueva. Requiere revisión manual.',
        code: 'REASSIGN_PARTIAL_FAILURE',
        details: { closed_mentorship_id: m.id }
      });
    }

    try {
      await logAuditChange({
        supabase,
        actorId: req.user.user_id || req.user.id,
        actorNick: req.user.nick || req.user.email,
        targetId: m.mentee_id,
        targetNick: null,
        action: 'MENTORSHIP_REASSIGNED',
        details: {
          old_mentorship_id: m.id,
          old_mentor_id: m.mentor_id,
          new_mentorship_id: created.id,
          new_mentor_id: newMentorId,
          new_mentor_nick: newMentor.nick,
          reason
        }
      });
    } catch (auditErr) {
      logger.warn('⚠️ [Veteran] Auditoría falló (reassign):', auditErr.message);
    }

    return res.json({
      success: true,
      message: `Mentoría reasignada a ${newMentor.nick}`,
      closed_mentorship_id: m.id,
      new_mentorship: created
    });

  } catch (err) {
    logger.error('❌ [Veteran] adminUpdateMentorship:', err.message);
    next(err);
  }
}

// ============================================================
// 9. GET /api/admin/mentorships (admin)
// ============================================================
// Lista todas las mentorías (con filtros opcionales).
// Query: ?status=ACTIVE|ENDED|REASSIGNED&mentor_id=<uuid>
//
export async function adminListMentorships(req, res, next) {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return res.status(500).json({ error: 'Database client unavailable', code: 'DB_UNAVAILABLE' });
    }

    let query = supabase
      .from('mentorships')
      .select('id, mentor_id, mentee_id, started_at, ended_at, status, ended_reason, created_by, created_at')
      .order('started_at', { ascending: false })
      .limit(500);

    const statusFilter = req.query.status ? String(req.query.status).toUpperCase() : null;
    if (statusFilter && ['ACTIVE', 'ENDED', 'REASSIGNED'].includes(statusFilter)) {
      query = query.eq('status', statusFilter);
    }

    const mentorFilter = req.query.mentor_id ? toUuidOrNull(req.query.mentor_id) : null;
    if (mentorFilter) {
      query = query.eq('mentor_id', mentorFilter);
    }

    const { data, error } = await query;
    if (error) throw error;

    const list = data || [];

    // Enriquecer con nicks de mentor y mentee
    const allUserIds = [
      ...new Set([
        ...list.map(m => m.mentor_id).filter(Boolean),
        ...list.map(m => m.mentee_id).filter(Boolean)
      ])
    ];

    let usersById = {};
    if (allUserIds.length > 0) {
      const { data: users } = await supabase
        .from('users')
        .select('id, nick, role, status')
        .in('id', allUserIds);
      (users || []).forEach(u => { if (u.id) usersById[u.id] = u; });
    }

    const enriched = list.map(m => {
      const mentor = usersById[m.mentor_id] || {};
      const mentee = usersById[m.mentee_id] || {};
      return {
        id: m.id,
        mentor_id: m.mentor_id,
        mentor_nick: mentor.nick || null,
        mentor_role: (mentor.role || 'VETERANO').toUpperCase(),
        mentee_id: m.mentee_id,
        mentee_nick: mentee.nick || null,
        mentee_role: (mentee.role || 'MIEMBRO').toUpperCase(),
        started_at: m.started_at,
        ended_at: m.ended_at,
        status: m.status,
        ended_reason: m.ended_reason || null,
        created_at: m.created_at
      };
    });

    return res.json({
      success: true,
      total: enriched.length,
      mentorships: enriched
    });

  } catch (err) {
    logger.error('❌ [Veteran] adminListMentorships:', err.message);
    next(err);
  }
}