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
      user_email: targetUser.email || req.user.email || null,
      event_id: data.event_id,
      tokens: Number(data.tokens),
      days_connected: Number(data.days_connected),
      flew_in_group: Boolean(data.flew_in_group),
      notes: data.notes || null,
      status,
      updated_at: new Date().toISOString()
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
      const insertRecord = {
        ...record,
        created_at: new Date().toISOString()
      };
      const { data: inserted, error: insertErr } = await supabase
        .from('performances')
        .insert(insertRecord)
        .select()
        .single();

      if (insertErr) throw insertErr;
      savedPerf = inserted;
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
    const { data: users } = await supabase.from('users').select('id, user_id, email, nick, role, status');
    const { data: myPerfs } = await supabase
      .from('performances')
      .select('*')
      .or(`user_id.eq.${userId},nick.eq.${req.user.nick}`);

    const userList = users || [];
    const actives = userList.filter(u => {
      const st = (u.status || '').toUpperCase();
      return st === 'ACTIVE' || st === 'ACTIVO' || !st;
    });

    const myPerfsList = myPerfs || [];
    const myAvgTokens = myPerfsList.length > 0
      ? Math.round(myPerfsList.reduce((acc, p) => acc + (Number(p.tokens) || 0), 0) / myPerfsList.length)
      : 0;

    let myPerfStatus = 'VERDE';
    if (myAvgTokens < 100) myPerfStatus = 'NEGRO';
    else if (myAvgTokens < 130) myPerfStatus = 'ROJO';
    else if (myAvgTokens < 175) myPerfStatus = 'NARANJA';

    const { data: allPerfs } = await supabase.from('performances').select('tokens');
    const allPerfsList = allPerfs || [];
    const avgSquad = allPerfsList.length > 0
      ? Math.round(allPerfsList.reduce((acc, p) => acc + (Number(p.tokens) || 0), 0) / allPerfsList.length)
      : 0;

    res.json({
      userStats: {
        avg_tokens: myAvgTokens,
        weeks_evaluated: myPerfsList.length || 0,
        trend: 'stable',
        perf_status: myPerfStatus
      },
      squadStats: {
        total_members: userList.length,
        active_members: actives.length,
        avg_tokens: avgSquad,
        at_risk_count: 0
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

    const headers = ['ID', 'Piloto', 'Email', 'Evento', 'Tokens', 'Dias_Conectados', 'Vuelo_Grupo', 'Estado', 'Notas', 'Fecha_Registro'];
    const rows = list.map(p => [
      p.id,
      p.nick,
      p.user_email || '',
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
