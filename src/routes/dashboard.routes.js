import { Router } from 'express';
import { memoryStore } from '../db/supabase.js';
import { requireAuth } from '../middlewares/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/summary', (req, res) => {
  const user = req.user;
  const activeEvent = memoryStore.events.find(e => e.is_open || e.status === 'OPEN') || memoryStore.events[0];
  const userPerfs = memoryStore.performances.filter(p => p.user_id === user.user_id);
  const totalActives = memoryStore.users.filter(u => u.squad_status === 'ACTIVE').length;
  const avgSquad = Math.round(
    memoryStore.users.reduce((acc, u) => acc + (u.avg_tokens || 0), 0) / (memoryStore.users.length || 1)
  );

  res.json({
    currentEvent: activeEvent,
    userStats: {
      avg_tokens: user.avg_tokens || 195,
      weeks_evaluated: user.weeks_evaluated || userPerfs.length || 12,
      trend: user.trend || 'up',
      perf_status: user.perf_status || 'VERDE'
    },
    squadStats: {
      total_members: memoryStore.users.length,
      active_members: totalActives,
      avg_tokens: avgSquad,
      at_risk_count: memoryStore.users.filter(u => u.perf_status === 'ROJO' || u.perf_status === 'NEGRO').length
    },
    topPilots: memoryStore.users.slice(0, 5).map(u => ({
      nick: u.nick,
      role: u.role,
      avg_tokens: u.avg_tokens,
      perf_status: u.perf_status
    }))
  });
});

export default router;
