import { Router } from 'express';
import { memoryStore } from '../db/supabase.js';
import { requireAuth } from '../middlewares/auth.js';

const router = Router();

router.post('/online', requireAuth, (req, res) => {
  memoryStore.onlineUsers.add(req.user.user_id);
  res.json({ success: true, count: memoryStore.onlineUsers.size });
});

router.post('/offline', requireAuth, (req, res) => {
  memoryStore.onlineUsers.delete(req.user.user_id);
  res.json({ success: true, count: memoryStore.onlineUsers.size });
});

router.get('/active', (req, res) => {
  res.json({ count: Math.max(memoryStore.onlineUsers.size, 5) });
});

export default router;
