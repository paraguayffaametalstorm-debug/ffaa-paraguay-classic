import { Router } from 'express';
import { getNormativas, uploadNormativa, downloadNormativa } from '../controllers/normativas.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.js';

const router = Router();

router.use(requireAuth);
router.get('/', getNormativas);
router.post('/', requireRole('ADMIN', 'OWNER'), uploadNormativa);
router.get('/:id/download', downloadNormativa);

export default router;
