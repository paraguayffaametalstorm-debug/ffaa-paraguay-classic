import { memoryStore, getSupabase } from '../db/supabase.js';
import { PerformanceSchema } from '../utils/schemas.js';
import { buildSanitizedCSV } from '../utils/csv.js';

export function calculateStatus(tokens, daysConnected) {
  const t = Number(tokens) || 0;
  const d = Number(daysConnected) || 0;
  if (t >= 175 && d >= 4) return 'VERDE';
  if (t >= 130 && d >= 3) return 'NARANJA';
  if (t >= 100 && d >= 2) return 'ROJO';
  return 'NEGRO';
}

export async function savePerformance(req, res, next) {
  try {
    const data = PerformanceSchema.parse(req.body);
    const callerRole = (req.user.role || '').toUpperCase();
    const isAdminOrOwner = callerRole === 'ADMIN' || callerRole === 'OWNER';
    const callerId = req.user.user_id || req.user.id;

    // Solo ADMIN u OWNER pueden registrar para terceros
    const targetUserId = (isAdminOrOwner && data.user_id && data.user_id !== 'self')
      ? (Number(data.user_id) || data.user_id)
      : callerId;

    const supabase = getSupabase();
    let targetUser = req.user;

    // Buscar datos del usuario objetivo en Supabase o en memoria
    if (supabase) {
      try {
        const { data: dbUser } = await supabase
          .from('users')
          .select('id, user_id, nick, email, role')
          .or(`id.eq.${targetUserId},user_id.eq.${targetUserId}`)
          .limit(1);

        if (dbUser && dbUser.length > 0) {
          targetUser = dbUser[0];
        }
      } catch (err) {
        console.warn('⚠️ [Performances] Error buscando usuario en Supabase:', err.message);
      }
    }

    if (!targetUser || targetUser === req.user) {
      const memUser = memoryStore.users.find(u => (u.user_id || u.id) === targetUserId);
      if (memUser) targetUser = memUser;
    }

    const status = calculateStatus(data.tokens, data.days_connected);

    const record = {
      user_id: targetUserId,
      nick: targetUser.nick || req.user.nick || 'Piloto',
      role: targetUser.role || req.user.role || 'MIEMBRO',
      event_id: data.event_id,
      tokens: data.tokens,
      days_connected: data.days_connected,
      flew_in_group: !!data.flew_in_group,
      notes: data.notes || null,
      status,
      created_at: new Date().toISOString()
    };

    let existingIdx = memoryStore.performances.findIndex(
      p => p.user_id === targetUserId && p.event_id === data.event_id
    );

    if (existingIdx >= 0) {
      record.id = memoryStore.performances[existingIdx].id;
      memoryStore.performances[existingIdx] = record;
    } else {
      record.id = memoryStore.performances.length + 1;
      memoryStore.performances.unshift(record);
    }

    targetUser.perf_status = status;

    if (supabase) {
      try {
        const { error: upsertErr } = await supabase
          .from('performances')
          .upsert(record, { onConflict: 'user_id,event_id' });

        if (upsertErr) {
          await supabase.from('performances').insert(record);
        }

        const { data: userPerfs } = await supabase
          .from('performances')
          .select('tokens')
          .eq('user_id', targetUserId);

        if (userPerfs && userPerfs.length > 0) {
          const newAvg = Math.round(userPerfs.reduce((s, p) => s + (Number(p.tokens) || 0), 0) / userPerfs.length);
          await supabase
            .from('users')
            .update({
              avg_tokens: newAvg,
              weeks_evaluated: userPerfs.length,
              perf_status: status
            })
            .eq('user_id', targetUserId);
        }
      } catch (dbErr) {
        console.warn('⚠️ [Performances] Error guardando en Supabase:', dbErr.message);
      }
    }

    const localUserPerfs = memoryStore.performances.filter(p => p.user_id === targetUserId);
    if (localUserPerfs.length > 0) {
      targetUser.avg_tokens = Math.round(localUserPerfs.reduce((s, p) => s + p.tokens, 0) / localUserPerfs.length);
      targetUser.weeks_evaluated = localUserPerfs.length;
    }

    res.status(existingIdx >= 0 ? 200 : 201).json({
      message: 'Rendimiento registrado exitosamente',
      action: existingIdx >= 0 ? 'sobrescrito' : 'creado',
      status,
      performance: record
    });
  } catch (err) {
    next(err);
  }
}

export async function getMyHistory(req, res, next) {
  try {
    const supabase = getSupabase();
    if (supabase) {
      const { data, error } = await supabase
        .from('performances')
        .select('*')
        .eq('user_id', req.user.user_id)
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return res.json({ history: data, performances: data });
      }
    }

    const myPerfs = memoryStore.performances.filter(p => p.user_id === req.user.user_id);
    res.json({ history: myPerfs, performances: myPerfs });
  } catch (err) {
    next(err);
  }
}

export async function getStats(req, res, next) {
  try {
    const supabase = getSupabase();
    if (supabase) {
      try {
        const { data: users } = await supabase.from('users').select('*');
        const { data: myPerfs } = await supabase
          .from('performances')
          .select('*')
          .eq('user_id', req.user.user_id);

        if (users && users.length > 0) {
          const actives = users.filter(u => (u.squad_status || u.status) === 'ACTIVE');
          const avgSquad = Math.round(
            users.reduce((acc, u) => acc + (Number(u.avg_tokens) || 0), 0) / users.length
          );

          const myUser = users.find(u => (u.user_id || u.id) === req.user.user_id) || req.user;

          return res.json({
            userStats: {
              avg_tokens: myUser.avg_tokens || 0,
              weeks_evaluated: myUser.weeks_evaluated || myPerfs?.length || 0,
              trend: myUser.trend || 'stable',
              perf_status: myUser.perf_status || 'VERDE'
            },
            squadStats: {
              total_members: users.length,
              active_members: actives.length,
              avg_tokens: avgSquad,
              at_risk_count: users.filter(u => u.perf_status === 'ROJO' || u.perf_status === 'NEGRO').length
            }
          });
        }
      } catch (dbErr) {
        console.warn('⚠️ [Performances Stats] Fallback a memoria:', dbErr.message);
      }
    }

    const myPerfs = memoryStore.performances.filter(p => p.user_id === req.user.user_id);
    const totalActives = memoryStore.users.filter(u => u.squad_status === 'ACTIVE').length;
    const avgSquad = Math.round(
      memoryStore.users.reduce((acc, u) => acc + (u.avg_tokens || 0), 0) / (memoryStore.users.length || 1)
    );

    res.json({
      userStats: {
        avg_tokens: req.user.avg_tokens || 0,
        weeks_evaluated: req.user.weeks_evaluated || myPerfs.length,
        trend: req.user.trend || 'stable',
        perf_status: req.user.perf_status || 'VERDE'
      },
      squadStats: {
        total_members: memoryStore.users.length,
        active_members: totalActives,
        avg_tokens: avgSquad,
        at_risk_count: memoryStore.users.filter(u => u.perf_status === 'ROJO' || u.perf_status === 'NEGRO').length
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function getAllPerformances(req, res, next) {
  try {
    const { event_id, status, nick } = req.query;
    const supabase = getSupabase();

    if (supabase) {
      try {
        let query = supabase.from('performances').select('*').order('created_at', { ascending: false });
        if (event_id) query = query.eq('event_id', event_id);
        if (status) query = query.eq('status', status);
        if (nick) query = query.ilike('nick', `%${nick}%`);

        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          return res.json({ performances: data, total: data.length });
        }
      } catch (dbErr) {
        console.warn('⚠️ [All Performances] Error en Supabase:', dbErr.message);
      }
    }

    let list = [...memoryStore.performances];
    if (event_id) list = list.filter(p => p.event_id === event_id);
    if (status) list = list.filter(p => p.status === status);
    if (nick) list = list.filter(p => (p.nick || '').toLowerCase().includes(nick.toLowerCase()));

    res.json({
      performances: list,
      total: list.length
    });
  } catch (err) {
    next(err);
  }
}

export async function exportPerformancesCSV(req, res, next) {
  try {
    let list = memoryStore.performances;
    const supabase = getSupabase();

    if (supabase) {
      const { data } = await supabase.from('performances').select('*').order('created_at', { ascending: false });
      if (data && data.length > 0) list = data;
    }

    const headers = ['ID', 'Piloto', 'Rol', 'Evento', 'Tokens', 'Dias_Conectados', 'Vuelo_Grupo', 'Estado', 'Notas', 'Fecha_Registro'];
    const rows = list.map(p => [
      p.id,
      p.nick,
      p.role,
      p.event_id,
      p.tokens,
      p.days_connected,
      p.flew_in_group ? 'SI' : 'NO',
      p.status,
      p.notes || '',
      p.created_at
    ]);

    const csvContent = buildSanitizedCSV(headers, rows);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="rendimientos_escuadron.csv"');
    res.send(csvContent);
  } catch (err) {
    next(err);
  }
}