import { Router } from 'express';
import { getProfile, updateProfile } from '../controllers/profile.controller.js';
import { requireAuth } from '../middlewares/auth.js';

const router = Router();

router.use(requireAuth);
router.get('/', getProfile);
router.get('/me', getProfile);
router.put('/', updateProfile);
router.put('/me', updateProfile);

export default router;
