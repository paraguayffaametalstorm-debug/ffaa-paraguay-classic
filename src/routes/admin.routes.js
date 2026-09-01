import { Router } from 'express';
import {
  getMembers,
  addMember,
  updateMemberStatus,
  updateMemberRole,
  bulkUploadEvent,
  activateBlackMarket
} from '../controllers/admin.controller.js';
import { getAllPerformances, exportPerformancesCSV } from '../controllers/performances.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.js';
import { bulkLimiter } from '../middlewares/rateLimiter.js';
import { memoryStore } from '../db/supabase.js';

const router = Router();

// All admin routes require authentication and at least ADMIN or OWNER role
router.use(requireAuth);
router.use(requireRole('ADMIN', 'OWNER'));

router.get('/members', getMembers);
router.post('/members', addMember);
router.patch('/members/:id/status', updateMemberStatus);
router.patch('/members/:id/role', requireRole('OWNER'), updateMemberRole);
router.post('/bulk-upload', bulkLimiter, bulkUploadEvent);
router.get('/all-performances', getAllPerformances);
router.get('/export-performances', exportPerformancesCSV);
router.get('/events', (req, res) => res.json({ events: memoryStore.events }));
router.post('/events/activate-bm', activateBlackMarket);

export default router;
