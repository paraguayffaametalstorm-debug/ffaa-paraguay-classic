import { Router } from 'express';
import {
  getAuditSummary,
  getAuditLogs,
  getErrorLogs,
  getBackupList,
  runManualBackup
} from '../controllers/owner.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.js';

const router = Router();

// Owner routes require authentication and OWNER role specifically
router.use(requireAuth);
router.use(requireRole('OWNER'));

router.get('/audit-summary', getAuditSummary);
router.get('/audit-logs', getAuditLogs);
router.get('/error-logs', getErrorLogs);
router.get('/backup/list', getBackupList);
router.post('/backup/run', runManualBackup);

export default router;
