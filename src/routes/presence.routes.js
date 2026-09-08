import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';

const router = Router();
const onlineUsers = new Set();

router.post('/online', requireAuth, (req, res) => {
  if (req.user?.user_id) {
    onlineUsers.add(req.user.user_id);
  }
  res.json({ success: true, count: Math.max(onlineUsers.size, 1) });
});

router.post('/offline', requireAuth, (req, res) => {
  if (req.user?.user_id) {
    onlineUsers.delete(req.user.user_id);
  }
  res.json({ success: true, count: Math.max(onlineUsers.size, 0) });
});

router.get('/active', (req, res) => {
  res.json({ count: Math.max(onlineUsers.size, 5) });
});

export default router;
