import { getSupabase } from '../db/supabase.js';
import { PerformanceSchema } from '../utils/schemas.js';
import { buildSanitizedCSV } from '../utils/csv.js';

// ========== FUNCIÓN AUXILIAR PARA CONSULTAS TIPADAS ==========
function buildUserQuery(supabase, userId, userNick, selectFields = '*') {
    let query = supabase.from('users').select(selectFields);
    
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(userId));
    const isNumeric = /^\d+$/.test(String(userId));
    
    if (isUUID) {
        query = query.eq('id', userId);
    } else if (isNumeric) {
        query = query.eq('user_id', Number(userId));
    } else if (userNick) {
        query = query.eq('nick', userNick);
    } else {
        query = query.eq('id', userId);
    }
    
    return query;
}

function buildPerfQuery(supabase, userId, userNick) {
    let query = supabase.from('performances').select('*').order('created_at', { ascending: false });
    
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(userId));
    const isNumeric = /^\d+$/.test(String(userId));
    
    if (isUUID) {
        query = query.eq('user_id', userId);
    } else if (isNumeric) {
        query = query.eq('user_id', Number(userId));
    } else if (userNick) {
        query = query.eq('nick', userNick);
    } else {
        query = query.eq('user_id', userId);
    }
    
    return query;
}

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

    const targetUserId = (isAdminOrOwner && data.user_id && data.user_id !== 'self')
      ? data.user_id
      : callerId;

    const supabase = getSupabase();
    if (!supabase) {
      return res.status(500).json({ error: 'Database client unavailable' });
    }

    let targetUser = req.user;

    if (String(targetUserId) !== String(callerId)) {
      // ✅ CONSULTA TIPADA
      let userQuery = buildUserQuery(supabase, targetUserId, null, 'id, user_id, nick, email, role');
      const { data: dbUser, error: dbUserErr } = await userQuery.limit(1);

      if (!dbUserErr && dbUser && dbUser.length > 0) {
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

    // Recalcular avg_tokens del usuario (CONSULTA TIPADA)
    const { data: userPerfs } = await supabase
      .from('performances')
      .select('tokens')
      .eq('user_id', record.user_id);

    if (userPerfs && userPerfs.length > 0) {
      const newAvg = Math.round(userPerfs.reduce((s, p) => s + (Number(p.tokens) || 0), 0) / userPerfs.length);
      
      let updateQuery = supabase
        .from('users')
        .update({
          avg_tokens: newAvg,
          weeks_evaluated: userPerfs.length,
          perf_status: status,
          last_activity: new Date().toISOString()
        });

      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(record.user_id));
      const isNumeric = /^\d+$/.test(String(record.user_id));

      if (isUUID) {
        updateQuery = updateQuery.eq('id', record.user_id);
      } else if (isNumeric) {
        updateQuery = updateQuery.eq('user_id', Number(record.user_id));
      } else {
        updateQuery = updateQuery.eq('id', record.user_id);
      }
      await updateQuery;
    }

    res.status(isUpdate ? 200 : 201).json({
      success: true,
      message: `Rendimiento ${isUpdate ? 'actualizado' : 'registrado'} exitosamente`,
      data: savedPerf || record,
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

    // ✅ CONSULTA TIPADA
    let query = buildPerfQuery(supabase, userId, userNick);
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
    
    // ✅ CONSULTA TIPADA para performances
    let perfQuery = buildPerfQuery(supabase, userId, req.user.nick);
    const { data: myPerfs } = await perfQuery;

    const userList = users || [];
    const actives = userList.filter(u => {
      const st = (u.status || '').toUpperCase();
      return st === 'ACTIVE' || st === 'ACTIVO' || !st;
    });

    const avgSquad = userList.length > 0
      ? Math.round(userList.reduce((acc, u) => acc + (Number(u.avg_tokens) || 0), 0) / userList.length)
      : 0;

    const myUser = userList.find(u => {
      const uId = String(u.user_id || u.id);
      const targetId = String(userId);
      return uId === targetId;
    }) || req.user;

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

/**
 * Obtiene la lista de pilotos para el selector de rendimiento
 * - ADMIN y OWNER: devuelve TODOS los pilotos con status = 'ACTIVE'
 * - MIEMBRO: devuelve solo su propio nick/perfil
 */
export async function getPilotsList(req, res, next) {
  try {
    const caller = req.user;
    if (!caller) {
      return res.status(401).json({
        success: false,
        message: 'No autenticado',
        error: 'Usuario no autenticado'
      });
    }

    const callerRole = (caller.role || 'MIEMBRO').toUpperCase();
    const isAdminOrOwner = callerRole === 'ADMIN' || callerRole === 'OWNER';

    const supabase = getSupabase();
    if (!supabase) {
      console.warn('⚠️ [getPilotsList] Base de datos Supabase no disponible');
      return res.status(500).json({
        success: false,
        message: 'Cliente de base de datos no disponible',
        error: 'Database client unavailable',
        pilots: [],
        count: 0
      });
    }

    let pilots = [];

    if (isAdminOrOwner) {
      console.log(`📋 [getPilotsList] Solicitud de escuadra autorizada para ${callerRole} (${caller.nick || caller.email})`);

      const { data, error } = await supabase
        .from('users')
        .select('id, user_id, nick, email, role, status, perf_status, avg_tokens')
        .order('nick', { ascending: true });

      if (error) {
        console.error('❌ [getPilotsList] Error al consultar usuarios en Supabase:', error.message);
        throw error;
      }

      pilots = (data || [])
        .filter(u => {
          const st = (u.status || '').toUpperCase();
          return st === 'ACTIVE' || st === 'ACTIVO' || !st;
        })
        .map(u => ({
          id: u.id || u.user_id,
          user_id: u.user_id || u.id,
          nick: u.nick || u.email?.split('@')[0] || 'Sin Nick',
          email: u.email || '',
          role: (u.role || 'MIEMBRO').toUpperCase(),
          status: (u.status || 'ACTIVE').toUpperCase(),
          perf_status: (u.perf_status || 'VERDE').toUpperCase(),
          avg_tokens: typeof u.avg_tokens === 'number' ? u.avg_tokens : 0
        }));

      console.log(`✅ [getPilotsList] ${pilots.length} pilotos activos cargados para el selector militar`);
    } else {
      console.log(`👤 [getPilotsList] Solicitud restringida a piloto individual para MIEMBRO (${caller.nick || caller.email})`);

      pilots = [{
        id: caller.id || caller.user_id,
        user_id: caller.user_id || caller.id,
        nick: caller.nick || caller.email?.split('@')[0] || 'Piloto',
        email: caller.email || '',
        role: callerRole,
        status: (caller.status || 'ACTIVE').toUpperCase(),
        perf_status: (caller.perf_status || 'VERDE').toUpperCase(),
        avg_tokens: typeof caller.avg_tokens === 'number' ? caller.avg_tokens : 0
      }];
    }

    return res.status(200).json({
      success: true,
      message: 'Lista de pilotos obtenida exitosamente',
      pilots,
      count: pilots.length,
      data: {
        pilots,
        count: pilots.length
      }
    });
  } catch (err) {
    console.error('❌ [getPilotsList] Error inesperado:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener la lista de pilotos',
      error: err.message,
      pilots: [],
      count: 0
    });
  }
}