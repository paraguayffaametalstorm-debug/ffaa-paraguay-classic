import { Router } from 'express';
import { memoryStore, getSupabase } from '../db/supabase.js';
import { requireAuth } from '../middlewares/auth.js';

const router = Router();

router.get('/active', async (req, res, next) => {
  try {
    const supabase = getSupabase();
    if (supabase) {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('start_date', { ascending: false });

      if (!error && data && data.length > 0) {
        const active = data.find(e => e.is_open || e.status === 'OPEN') || data[0];
        return res.json({ event: active });
      }
    }

    const activeEvent = memoryStore.events.find(e => e.is_open || e.status === 'OPEN') || memoryStore.events[0];
    res.json({ event: activeEvent });
  } catch (err) {
    next(err);
  }
});

router.get('/current', async (req, res, next) => {
  try {
    const supabase = getSupabase();
    if (supabase) {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('start_date', { ascending: false });

      if (!error && data && data.length > 0) {
        const active = data.find(e => e.is_open || e.status === 'OPEN') || data[0];
        return res.json({ event: active });
      }
    }

    const activeEvent = memoryStore.events.find(e => e.is_open || e.status === 'OPEN') || memoryStore.events[0];
    res.json({ event: activeEvent });
  } catch (err) {
    next(err);
  }
});

router.get('/history', requireAuth, async (req, res, next) => {
  try {
    const supabase = getSupabase();
    if (supabase) {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('start_date', { ascending: false });

      if (!error && data && data.length > 0) {
        return res.json({ events: data });
      }
    }

    res.json({ events: memoryStore.events });
  } catch (err) {
    next(err);
  }
});

export default router;

