import { Router } from 'express';
import { memoryStore } from '../db/supabase.js';
import { requireAuth } from '../middlewares/auth.js';

const router = Router();

router.get('/active', (req, res) => {
  const activeEvent = memoryStore.events.find(e => e.is_open || e.status === 'OPEN') || memoryStore.events[0];
  res.json({ event: activeEvent });
});

router.get('/current', (req, res) => {
  const activeEvent = memoryStore.events.find(e => e.is_open || e.status === 'OPEN') || memoryStore.events[0];
  res.json({ event: activeEvent });
});

router.get('/history', requireAuth, (req, res) => {
  res.json({ events: memoryStore.events });
});

export default router;
