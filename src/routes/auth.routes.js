import { Router } from 'express';
import { 
    login, 
    verifyMe, 
    register, 
    changePassword, 
    forgotPassword, 
    resetPassword,
    linkAccount,
    googleAuth, 
    googleCallback, 
    googleStatus 
} from '../controllers/auth.controller.js';
import { requireAuth } from '../middlewares/auth.js';
import { authLimiter } from '../middlewares/rateLimiter.js';

const router = Router();

router.post('/login', authLimiter, login);
router.get('/verify', requireAuth, verifyMe);
router.get('/me', requireAuth, verifyMe);
router.post('/register', register);
router.post('/change-password', requireAuth, changePassword);
router.put('/change-password', requireAuth, changePassword);
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password', authLimiter, resetPassword);
router.post('/link-account', authLimiter, linkAccount);

// Google OAuth 2.0 endpoints
router.get('/google', googleAuth);
router.get('/google/callback', googleCallback);
router.get('/google/status', googleStatus);

export default router;