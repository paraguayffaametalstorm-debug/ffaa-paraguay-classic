import { getSupabase, memoryStore } from '../db/supabase.js';

export const getSummary = async (req, res, next) => {
  try {
    const user = req.user || { user_id: 1, role: 'OWNER', avg_tokens: 195, perf_status: 'VERDE' };
    const supabase = getSupabase();

    let activeEvent = null;
    let allUsers = [];
    let userPerfs = [];

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

        // Fetch users - ONLY ACTIVE REAL PILOTS (status = 'ACTIVE' and squadron domain)
        const { data: userData } = await supabase
          .from('users')
          .select('id, user_id, email, nick, role, avg_tokens, status, squad_status, perf_status, weeks_evaluated, trend')
          .eq('status', 'ACTIVE')
          .like('email', '%@ffaa.py')
          .order('avg_tokens', { ascending: false });

        if (userData && userData.length > 0) {
          allUsers = userData.map(u => ({
            user_id: u.user_id || u.id,
            email: u.email,
            nick: u.nick || u.email?.split('@')[0],
            role: (u.role || 'MIEMBRO').toUpperCase(),
            perf_status: u.perf_status || u.status || 'VERDE',
            status: u.status || u.squad_status || 'ACTIVE',
            avg_tokens: typeof u.avg_tokens === 'number' ? u.avg_tokens : 0,
            weeks_evaluated: u.weeks_evaluated || 0,
            trend: u.trend || 'stable'
          }));
        } else {
          // Fallback if domain filter yielded empty
          const { data: generalActiveUsers } = await supabase
            .from('users')
            .select('id, user_id, email, nick, role, avg_tokens, status, squad_status, perf_status, weeks_evaluated, trend')
            .eq('status', 'ACTIVE')
            .order('avg_tokens', { ascending: false });

          if (generalActiveUsers && generalActiveUsers.length > 0) {
            allUsers = generalActiveUsers.map(u => ({
              user_id: u.user_id || u.id,
              email: u.email,
              nick: u.nick || u.email?.split('@')[0],
              role: (u.role || 'MIEMBRO').toUpperCase(),
              perf_status: u.perf_status || u.status || 'VERDE',
              status: u.status || u.squad_status || 'ACTIVE',
              avg_tokens: typeof u.avg_tokens === 'number' ? u.avg_tokens : 0,
              weeks_evaluated: u.weeks_evaluated || 0,
              trend: u.trend || 'stable'
            }));
          }
        }

        // Fetch user performances
        if (user.user_id) {
          const { data: perfData } = await supabase
            .from('performances')
            .select('*')
            .eq('user_id', user.user_id)
            .order('created_at', { ascending: false });

          if (perfData) {
            userPerfs = perfData;
          }
        }
      } catch (err) {
        console.warn('⚠️ [Dashboard] Error leyendo datos de Supabase, usando fallback:', err.message);
      }
    }

    // Fallbacks if tables were empty or offline
    if (!activeEvent) {
      activeEvent = memoryStore.events.find(e => e.is_open || e.status === 'OPEN') || memoryStore.events[0];
    }
    if (allUsers.length === 0) {
      allUsers = memoryStore.users.filter(u => (u.status || u.squad_status) === 'ACTIVE');
    }
    if (userPerfs.length === 0 && user.user_id) {
      userPerfs = memoryStore.performances.filter(p => p.user_id === user.user_id);
    }

    const activeMembers = allUsers.filter(u => (u.status || u.squad_status) === 'ACTIVE');
    const totalMembersCount = allUsers.length;
    const activeMembersCount = activeMembers.length;

    // Calculate user stats
    const userTokensAvg = userPerfs.length > 0
      ? Math.round(userPerfs.reduce((s, p) => s + (Number(p.tokens) || 0), 0) / userPerfs.length)
      : (user.avg_tokens || 195);

    // Calculate squad average
    const avgSquad = allUsers.length > 0
      ? Math.round(allUsers.reduce((acc, u) => acc + (Number(u.avg_tokens) || 0), 0) / allUsers.length)
      : 175;

    // Top 5 pilots (strictly active pilots, sorted by avg_tokens descending)
    const sortedPilots = [...activeMembers]
      .sort((a, b) => (b.avg_tokens || 0) - (a.avg_tokens || 0))
      .slice(0, 5)
      .map(u => ({
        nick: u.nick,
        role: u.role,
        avg_tokens: u.avg_tokens || 0,
        perf_status: u.perf_status || 'VERDE',
        status: u.status || 'ACTIVE'
      }));

    res.json({
      success: true,
      currentEvent: activeEvent,
      userStats: {
        avg_tokens: userTokensAvg,
        weeks_evaluated: user.weeks_evaluated || userPerfs.length || 1,
        trend: user.trend || 'up',
        perf_status: user.perf_status || 'VERDE'
      },
      squadStats: {
        total_members: totalMembersCount,
        active_members: activeMembersCount,
        avg_tokens: avgSquad,
        at_risk_count: allUsers.filter(u => u.perf_status === 'ROJO' || u.perf_status === 'NEGRO').length
      },
      topPilots: sortedPilots
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
      const { data, error } = await supabase
        .from('users')
        .select('id, user_id, email, nick, role, perf_status, status, squad_status, last_active, avg_tokens')
        .eq('status', 'ACTIVE')
        .like('email', '%@ffaa.py')
        .order('avg_tokens', { ascending: false })
        .limit(57);

      if (!error && data && data.length > 0) {
        activeMembers = data.map(u => ({
          id: u.id || u.user_id,
          user_id: u.user_id || u.id,
          email: u.email,
          nick: u.nick || u.email?.split('@')[0],
          role: (u.role || 'MIEMBRO').toUpperCase(),
          perf_status: u.perf_status || u.status || 'VERDE',
          status: u.status || u.squad_status || 'ACTIVE',
          avg_tokens: typeof u.avg_tokens === 'number' ? u.avg_tokens : 0
        }));
      } else {
        const { data: generalData } = await supabase
          .from('users')
          .select('id, user_id, email, nick, role, perf_status, status, squad_status, last_active, avg_tokens')
          .eq('status', 'ACTIVE')
          .order('avg_tokens', { ascending: false })
          .limit(57);

        if (generalData && generalData.length > 0) {
          activeMembers = generalData.map(u => ({
            id: u.id || u.user_id,
            user_id: u.user_id || u.id,
            email: u.email,
            nick: u.nick || u.email?.split('@')[0],
            role: (u.role || 'MIEMBRO').toUpperCase(),
            perf_status: u.perf_status || u.status || 'VERDE',
            status: u.status || u.squad_status || 'ACTIVE',
            avg_tokens: typeof u.avg_tokens === 'number' ? u.avg_tokens : 0
          }));
        }
      }
    }

    if (activeMembers.length === 0) {
      activeMembers = (memoryStore.users || [])
        .filter(u => (u.status || u.squad_status) === 'ACTIVE')
        .map(u => ({
          id: u.user_id,
          user_id: u.user_id,
          email: u.email,
          nick: u.nick,
          role: u.role,
          perf_status: u.perf_status || 'VERDE',
          status: u.squad_status || 'ACTIVE',
          avg_tokens: u.avg_tokens || 0
        }));
    }

    res.json({ success: true, activeMembers, members: activeMembers });
  } catch (err) {
    next(err);
  }
};
