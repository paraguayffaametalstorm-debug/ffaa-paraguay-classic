import { Router } from 'express';
import { login, verifyMe, register, changePassword, forgotPassword } from '../controllers/auth.controller.js';
import { requireAuth } from '../middlewares/auth.js';
import { authLimiter } from '../middlewares/rateLimiter.js';

const router = Router();

router.post('/login', authLimiter, login);
router.get('/verify', requireAuth, verifyMe);
router.get('/me', requireAuth, verifyMe);
router.post('/register', register);
router.post('/change-password', requireAuth, changePassword);
router.post('/forgot-password', forgotPassword);

export default router;