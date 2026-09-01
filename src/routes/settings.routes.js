import { Router } from 'express';
import { getSettings, updateSettings } from '../controllers/settings.controller.js';
import { requireAuth } from '../middlewares/auth.js';

const router = Router();

router.use(requireAuth);
router.get('/', getSettings);
router.get('/me', getSettings);
router.put('/', updateSettings);
router.put('/me', updateSettings);

export default router;
