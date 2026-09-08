import { Router } from 'express';
import {
  savePerformance,
  getMyHistory,
  getStats,
  getAllPerformances,
  exportPerformancesCSV
} from '../controllers/performances.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.js';

const router = Router();

router.use(requireAuth);

router.post('/', savePerformance);
router.get('/history', getMyHistory);
router.get('/my-history', getMyHistory);
router.get('/stats', getStats);
router.get('/all', requireRole('ADMIN', 'OWNER'), getAllPerformances);
router.get('/export', requireRole('ADMIN', 'OWNER'), exportPerformancesCSV);

export default router;
