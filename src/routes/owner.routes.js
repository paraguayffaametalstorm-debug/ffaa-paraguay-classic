import { Router } from 'express';
import {
  getAuditSummary,
  getAuditLogs,
  getErrorLogs,
  getBackupList,
  runManualBackup,
  downloadBackup,
  deleteBackup
} from '../controllers/owner.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.js';

const router = Router();

// Owner routes require authentication and OWNER role specifically
router.use(requireAuth);
router.use(requireRole('OWNER'));

// --- Auditoría ---
router.get('/audit-summary', getAuditSummary);
router.get('/audit-logs', getAuditLogs);
router.get('/error-logs', getErrorLogs);

// --- Backups ---
router.get('/backup/list', getBackupList);
router.post('/backup/run', runManualBackup);
router.get('/backup/download/:id', downloadBackup);
router.delete('/backup/:id', deleteBackup);

export default router;