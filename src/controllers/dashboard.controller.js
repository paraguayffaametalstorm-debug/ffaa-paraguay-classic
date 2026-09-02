import { getSupabase } from '../db/supabase.js';

export const getSummary = async (req, res, next) => {
  try {
    const user = req.user || { user_id: 1, email: 'admin@ffaa.py', role: 'OWNER', avg_tokens: 0, perf_status: 'VERDE' };
    const supabase = getSupabase();

    let activeEvent = null;
    let topPilots = [];
    let usersWithAvg = [];
    let userTokensAvg = 0;
    let userWeeks = 0;

    if (supabase) {
      try {
        // Fetch active/current event
        const { data: eventData } = await supabase
          .from('events')
          .select('*')
          .order('start_date', { ascending: false });

        if (eventData && eventData.length > 0) {
          activeEvent = eventData.find(e => e.is_open || e.status === 'OPEN') || eventData[0];
        }

        // Obtener usuarios activos
        const { data: users } = await supabase
          .from('users')
          .select('id, user_id, email, nick, role, status, perf_status')
          .order('nick', { ascending: true });

        const activeUsersList = (users || []).filter(u => {
          const st = (u.status || '').toUpperCase();
          return st === 'ACTIVE' || st === 'ACTIVO' || !st;
        });

        if (activeUsersList.length > 0) {
          // Obtener performances para calcular promedios actualizados
          const { data: perfData } = await supabase
            .from('performances')
            .select('user_id, tokens, nick');

          const avgMap = {};
          (perfData || []).forEach(p => {
            const key = p.user_id !== null && p.user_id !== undefined ? String(p.user_id) : (p.nick || '').toLowerCase();
            if (!avgMap[key]) avgMap[key] = { sum: 0, count: 0 };
            avgMap[key].sum += Number(p.tokens) || 0;
            avgMap[key].count += 1;
          });

          // Construir lista con avg_tokens calculado
          usersWithAvg = activeUsersList.map(u => {
            const keyId = u.user_id ? String(u.user_id) : (u.id ? String(u.id) : '');
            const keyNick = (u.nick || '').toLowerCase();
            const stats = avgMap[keyId] || avgMap[keyNick] || null;
            const avg = stats && stats.count > 0 ? Math.round(stats.sum / stats.count) : 0;
            const count = stats && stats.count > 0 ? stats.count : 0;

            return {
              id: u.id || u.user_id,
              user_id: u.user_id || u.id,
              email: u.email,
              nick: u.nick || u.email?.split('@')[0],
              role: (u.role || 'MIEMBRO').toUpperCase(),
              avg_tokens: avg,
              perf_status: u.perf_status || 'VERDE',
              status: (u.status || 'ACTIVE').toUpperCase(),
              weeks_evaluated: count
            };
          });

          // Ordenar y tomar Top 5
          topPilots = [...usersWithAvg]
            .sort((a, b) => b.avg_tokens - a.avg_tokens)
            .slice(0, 5);

          // Estadísticas del usuario actual
          const currentProfile = usersWithAvg.find(u => 
            (user.user_id && String(u.user_id) === String(user.user_id)) || 
            (user.id && String(u.id) === String(user.id)) || 
            (user.email && u.email?.toLowerCase() === user.email?.toLowerCase())
          );
          if (currentProfile) {
            userTokensAvg = currentProfile.avg_tokens;
            userWeeks = currentProfile.weeks_evaluated;
          }
        }
      } catch (err) {
        console.warn('⚠️ [Dashboard] Error leyendo datos de Supabase:', err.message);
      }
    }

    const totalMembersCount = usersWithAvg.length;
    const activeMembersCount = usersWithAvg.filter(u => u.status === 'ACTIVE').length;

    // Calculate squad average
    const avgSquad = usersWithAvg.length > 0
      ? Math.round(usersWithAvg.reduce((acc, u) => acc + (u.avg_tokens || 0), 0) / usersWithAvg.length)
      : 0;

    res.json({
      success: true,
      currentEvent: activeEvent,
      userStats: {
        avg_tokens: userTokensAvg,
        weeks_evaluated: userWeeks || 1,
        trend: user.trend || 'stable',
        perf_status: user.perf_status || 'VERDE'
      },
      squadStats: {
        total_members: totalMembersCount,
        active_members: activeMembersCount,
        avg_tokens: avgSquad,
        at_risk_count: usersWithAvg.filter(u => u.perf_status === 'ROJO' || u.perf_status === 'NEGRO').length
      },
      topPilots
    });
  } catch (err) {
    next(err);
  }
};

export const getActiveMembers = async (req, res, next) => {
  try {
    const supabase = getSupabase();
    let activeMembers = [];

    if (supabase) {
      const { data: users, error } = await supabase
        .from('users')
        .select('id, user_id, email, nick, role, status, perf_status')
        .order('nick', { ascending: true });

      if (!error && users) {
        activeMembers = users
          .filter(u => {
            const st = (u.status || '').toUpperCase();
            return st === 'ACTIVE' || st === 'ACTIVO' || !st;
          })
          .map(u => ({
            id: u.id || u.user_id,
            user_id: u.user_id || u.id,
            email: u.email,
            nick: u.nick || u.email?.split('@')[0],
            role: (u.role || 'MIEMBRO').toUpperCase(),
            perf_status: u.perf_status || 'VERDE',
            status: (u.status || 'ACTIVE').toUpperCase(),
            avg_tokens: 0
          }));
      }
    }

    res.json({ success: true, activeMembers, members: activeMembers });
  } catch (err) {
    next(err);
  }
};
