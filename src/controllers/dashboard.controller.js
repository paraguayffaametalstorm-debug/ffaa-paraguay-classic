import { getSupabase, memoryStore } from '../db/supabase.js';

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

        // Obtener usuarios activos del escuadrón
        let { data: users } = await supabase
          .from('users')
          .select('id, email, nick, role, status')
          .eq('status', 'ACTIVE')
          .like('email', '%@ffaa.py');

        // Fallback si no hay con dominio @ffaa.py
        if (!users || users.length === 0) {
          const { data: generalUsers } = await supabase
            .from('users')
            .select('id, email, nick, role, status')
            .eq('status', 'ACTIVE');
          users = generalUsers || [];
        }

        if (users && users.length > 0) {
          // Obtener emails para filtrar performances
          const emails = users.map(u => u.email).filter(Boolean);

          // Obtener performances de estos usuarios
          let performances = [];
          if (emails.length > 0) {
            const { data: perfData } = await supabase
              .from('performances')
              .select('user_email, tokens')
              .in('user_email', emails);
            if (perfData) {
              performances = perfData;
            }
          }

          // Calcular promedio por usuario
          const avgMap = {};
          (performances || []).forEach(p => {
            if (p.user_email) {
              if (!avgMap[p.user_email]) avgMap[p.user_email] = { sum: 0, count: 0 };
              avgMap[p.user_email].sum += Number(p.tokens) || 0;
              avgMap[p.user_email].count += 1;
            }
          });

          // Construir lista con avg_tokens calculado
          usersWithAvg = users.map(u => {
            const stats = avgMap[u.email];
            const avg = stats && stats.count > 0 ? Math.round(stats.sum / stats.count) : 0;
            return {
              id: u.id,
              email: u.email,
              nick: u.nick || u.email?.split('@')[0],
              role: (u.role || 'MIEMBRO').toUpperCase(),
              avg_tokens: avg,
              perf_status: u.status || 'ACTIVE',
              status: u.status || 'ACTIVE',
              weeks_evaluated: stats ? stats.count : 0
            };
          });

          // Ordenar y tomar Top 5
          topPilots = [...usersWithAvg]
            .sort((a, b) => b.avg_tokens - a.avg_tokens)
            .slice(0, 5);

          // Estadísticas del usuario actual
          const currentProfile = usersWithAvg.find(u => u.email === user.email || u.id === user.id);
          if (currentProfile) {
            userTokensAvg = currentProfile.avg_tokens;
            userWeeks = currentProfile.weeks_evaluated;
          }
        }
      } catch (err) {
        console.warn('⚠️ [Dashboard] Error leyendo datos de Supabase:', err.message);
      }
    }

    // Fallbacks if tables were empty or offline
    if (!activeEvent) {
      activeEvent = (memoryStore.events || []).find(e => e.is_open || e.status === 'OPEN') || (memoryStore.events || [])[0] || null;
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
      let { data: users } = await supabase
        .from('users')
        .select('id, email, nick, role, status')
        .eq('status', 'ACTIVE')
        .like('email', '%@ffaa.py');

      if (!users || users.length === 0) {
        const { data: generalUsers } = await supabase
          .from('users')
          .select('id, email, nick, role, status')
          .eq('status', 'ACTIVE');
        users = generalUsers || [];
      }

      if (users && users.length > 0) {
        const emails = users.map(u => u.email).filter(Boolean);
        let performances = [];
        if (emails.length > 0) {
          const { data: perfData } = await supabase
            .from('performances')
            .select('user_email, tokens')
            .in('user_email', emails);
          if (perfData) performances = perfData;
        }

        const avgMap = {};
        (performances || []).forEach(p => {
          if (p.user_email) {
            if (!avgMap[p.user_email]) avgMap[p.user_email] = { sum: 0, count: 0 };
            avgMap[p.user_email].sum += Number(p.tokens) || 0;
            avgMap[p.user_email].count += 1;
          }
        });

        activeMembers = users.map(u => ({
          id: u.id,
          email: u.email,
          nick: u.nick || u.email?.split('@')[0],
          role: (u.role || 'MIEMBRO').toUpperCase(),
          perf_status: u.status || 'ACTIVE',
          status: u.status || 'ACTIVE',
          avg_tokens: avgMap[u.email] ? Math.round(avgMap[u.email].sum / avgMap[u.email].count) : 0
        })).sort((a, b) => b.avg_tokens - a.avg_tokens);
      }
    }

    res.json({ success: true, activeMembers, members: activeMembers });
  } catch (err) {
    next(err);
  }
};
