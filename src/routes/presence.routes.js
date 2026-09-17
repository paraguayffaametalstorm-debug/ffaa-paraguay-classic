import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';

const router = Router();
const onlineUsers = new Set();

router.post('/online', requireAuth, (req, res) => {
  if (req.user?.user_id) {
    onlineUsers.add(req.user.user_id);
  }
  res.json({ success: true, count: onlineUsers.size });
});

router.post('/offline', requireAuth, (req, res) => {
  if (req.user?.user_id) {
    onlineUsers.delete(req.user.user_id);
  }
  res.json({ success: true, count: onlineUsers.size });
});

router.get('/active', requireAuth, (req, res) => {
  res.json({ count: onlineUsers.size });
});

export default router;
