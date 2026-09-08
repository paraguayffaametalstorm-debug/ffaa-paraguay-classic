import { getSupabase } from '../db/supabase.js';
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
      ? data.user_id
      : callerId;

    const supabase = getSupabase();
    if (!supabase) {
      return res.status(500).json({ error: 'Database client unavailable' });
    }

    let targetUser = req.user;

    // Buscar datos del usuario objetivo en Supabase
    if (String(targetUserId) !== String(callerId)) {
      const { data: dbUser } = await supabase
        .from('users')
        .select('id, user_id, nick, email, role')
        .or(`id.eq.${targetUserId},user_id.eq.${targetUserId}`)
        .limit(1);

      if (dbUser && dbUser.length > 0) {
        targetUser = dbUser[0];
      }
    }

    const status = calculateStatus(data.tokens, data.days_connected);

    const record = {
      user_id: targetUser.user_id || targetUser.id,
      nick: targetUser.nick || req.user.nick || 'Piloto',
      role: targetUser.role || req.user.role || 'MIEMBRO',
      event_id: data.event_id,
      tokens: Number(data.tokens),
      days_connected: Number(data.days_connected),
      flew_in_group: Boolean(data.flew_in_group),
      notes: data.notes || null,
      status,
      created_at: new Date().toISOString()
    };

    // Verificar si ya existe registro para este usuario y evento
    const { data: existingPerfs } = await supabase
      .from('performances')
      .select('id')
      .eq('user_id', record.user_id)
      .eq('event_id', record.event_id)
      .limit(1);

    let isUpdate = false;
    let savedPerf = null;

    if (existingPerfs && existingPerfs.length > 0) {
      isUpdate = true;
      const existingId = existingPerfs[0].id;
      const { data: updated, error: updateErr } = await supabase
        .from('performances')
        .update(record)
        .eq('id', existingId)
        .select()
        .single();

      if (updateErr) throw updateErr;
      savedPerf = updated;
    } else {
      const { data: inserted, error: insertErr } = await supabase
        .from('performances')
        .insert(record)
        .select()
        .single();

      if (insertErr) throw insertErr;
      savedPerf = inserted;
    }

    // Recalcular avg_tokens del usuario
    const { data: userPerfs } = await supabase
      .from('performances')
      .select('tokens')
      .eq('user_id', record.user_id);

    if (userPerfs && userPerfs.length > 0) {
      const newAvg = Math.round(userPerfs.reduce((s, p) => s + (Number(p.tokens) || 0), 0) / userPerfs.length);
      await supabase
        .from('users')
        .update({
          avg_tokens: newAvg,
          weeks_evaluated: userPerfs.length,
          perf_status: status
        })
        .or(`id.eq.${record.user_id},user_id.eq.${record.user_id}`);
    }

    res.status(isUpdate ? 200 : 201).json({
      message: 'Rendimiento registrado exitosamente',
      action: isUpdate ? 'sobrescrito' : 'creado',
      status,
      performance: savedPerf || record
    });
  } catch (err) {
    next(err);
  }
}

export async function getMyHistory(req, res, next) {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return res.json({ history: [], performances: [] });
    }

    const userId = req.user.user_id || req.user.id;
    const userNick = req.user.nick;

    let query = supabase
      .from('performances')
      .select('*')
      .order('created_at', { ascending: false });

    if (userId) {
      query = query.or(`user_id.eq.${userId},nick.eq.${userNick}`);
    } else if (userNick) {
      query = query.eq('nick', userNick);
    }

    const { data, error } = await query;
    if (error) throw error;

    res.json({ history: data || [], performances: data || [] });
  } catch (err) {
    next(err);
  }
}

export async function getStats(req, res, next) {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return res.json({
        userStats: { avg_tokens: 0, weeks_evaluated: 0, trend: 'stable', perf_status: 'VERDE' },
        squadStats: { total_members: 0, active_members: 0, avg_tokens: 0, at_risk_count: 0 }
      });
    }

    const userId = req.user.user_id || req.user.id;
    const { data: users } = await supabase.from('users').select('*');
    const { data: myPerfs } = await supabase
      .from('performances')
      .select('*')
      .or(`user_id.eq.${userId},nick.eq.${req.user.nick}`);

    const userList = users || [];
    const actives = userList.filter(u => {
      const st = (u.status || '').toUpperCase();
      return st === 'ACTIVE' || st === 'ACTIVO' || !st;
    });

    const avgSquad = userList.length > 0
      ? Math.round(userList.reduce((acc, u) => acc + (Number(u.avg_tokens) || 0), 0) / userList.length)
      : 0;

    const myUser = userList.find(u => (u.user_id && String(u.user_id) === String(userId)) || (u.id && String(u.id) === String(userId))) || req.user;

    res.json({
      userStats: {
        avg_tokens: myUser.avg_tokens || 0,
        weeks_evaluated: myUser.weeks_evaluated || myPerfs?.length || 0,
        trend: myUser.trend || 'stable',
        perf_status: myUser.perf_status || 'VERDE'
      },
      squadStats: {
        total_members: userList.length,
        active_members: actives.length,
        avg_tokens: avgSquad,
        at_risk_count: userList.filter(u => u.perf_status === 'ROJO' || u.perf_status === 'NEGRO').length
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
    if (!supabase) {
      return res.json({ performances: [], total: 0 });
    }

    let query = supabase.from('performances').select('*').order('created_at', { ascending: false });
    if (event_id) query = query.eq('event_id', event_id);
    if (status) query = query.eq('status', status);
    if (nick) query = query.ilike('nick', `%${nick}%`);

    const { data, error } = await query;
    if (error) throw error;

    res.json({
      performances: data || [],
      total: data?.length || 0
    });
  } catch (err) {
    next(err);
  }
}

export async function exportPerformancesCSV(req, res, next) {
  try {
    const supabase = getSupabase();
    let list = [];
    if (supabase) {
      const { data } = await supabase.from('performances').select('*').order('created_at', { ascending: false });
      if (data) list = data;
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
