import { Router } from 'express';
import { getProfile, updateProfile } from '../controllers/profile.controller.js';
import { changePassword } from '../controllers/auth.controller.js';
import { requireAuth } from '../middlewares/auth.js';

const router = Router();

router.use(requireAuth);
router.get('/', getProfile);
router.get('/me', getProfile);
router.put('/', updateProfile);
router.put('/me', updateProfile);
router.post('/change-password', changePassword);

export default router;
