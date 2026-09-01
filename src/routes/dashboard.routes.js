import { Router } from 'express';
import { memoryStore, getSupabase } from '../db/supabase.js';
import { requireAuth } from '../middlewares/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/summary', async (req, res, next) => {
  try {
    const user = req.user;
    const supabase = getSupabase();

    let activeEvent = null;
    let allUsers = [];
    let userPerfs = [];
    let squadPerfs = [];

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

        // Fetch users
        const { data: userData } = await supabase
          .from('users')
          .select('*')
          .order('avg_tokens', { ascending: false });

        if (userData && userData.length > 0) {
          allUsers = userData.map(u => ({
            user_id: u.user_id || u.id,
            email: u.email,
            nick: u.nick || u.callsign || u.email?.split('@')[0],
            role: (u.role || 'MIEMBRO').toUpperCase(),
            perf_status: u.perf_status || 'VERDE',
            squad_status: u.squad_status || u.status || 'ACTIVE',
            avg_tokens: typeof u.avg_tokens === 'number' ? u.avg_tokens : 0,
            weeks_evaluated: u.weeks_evaluated || 0,
            trend: u.trend || 'stable'
          }));
        }

        // Fetch user performances
        const { data: perfData } = await supabase
          .from('performances')
          .select('*')
          .eq('user_id', user.user_id)
          .order('created_at', { ascending: false });

        if (perfData) {
          userPerfs = perfData;
        }

        // Fetch recent squad performances
        const { data: allPerfs } = await supabase
          .from('performances')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);

        if (allPerfs) {
          squadPerfs = allPerfs;
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
      allUsers = memoryStore.users;
    }
    if (userPerfs.length === 0) {
      userPerfs = memoryStore.performances.filter(p => p.user_id === user.user_id);
    }

    const activeMembers = allUsers.filter(u => (u.squad_status || u.status) === 'ACTIVE');
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

    // Top pilots (sorted by avg_tokens descending)
    const sortedPilots = [...allUsers]
      .sort((a, b) => (b.avg_tokens || 0) - (a.avg_tokens || 0))
      .slice(0, 5)
      .map(u => ({
        nick: u.nick,
        role: u.role,
        avg_tokens: u.avg_tokens || 0,
        perf_status: u.perf_status || 'VERDE'
      }));

    res.json({
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
});

export default router;

