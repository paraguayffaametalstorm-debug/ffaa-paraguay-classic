import { Router } from 'express';
import { 
    login, 
    verifyMe, 
    register, 
    changePassword, 
    forgotPassword, 
    resetPassword,
    googleAuth,
    googleAuthCallback 
} from '../controllers/auth.controller.js';
import { requireAuth } from '../middlewares/auth.js';
import { authLimiter } from '../middlewares/rateLimiter.js';

const router = Router();

// Rutas de autenticación estándar
router.post('/login', authLimiter, login);
router.get('/verify', requireAuth, verifyMe);
router.get('/me', requireAuth, verifyMe);
router.post('/register', register);
router.post('/change-password', requireAuth, changePassword);

// Rutas de restablecimiento de contraseña por correo (15 min)
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password', authLimiter, resetPassword);

// Rutas de Google OAuth 2.0 (restringido a correos registrados y activos)
router.get('/google', googleAuth);
router.get('/google/callback', googleAuthCallback);

export default router;
