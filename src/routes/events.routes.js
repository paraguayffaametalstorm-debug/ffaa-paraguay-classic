import { Router } from 'express';
import { 
    getEvents,
    getOpenEvent,
    getActiveMembers
} from '../controllers/events.controller.js';
import { activateBlackMarket } from '../controllers/admin.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.js';

const router = Router();

// Todas las rutas de eventos requieren autenticación
router.use(requireAuth);

// Obtener eventos recientes
router.get('/', getEvents);
router.get('/open', getOpenEvent);
router.get('/active', getOpenEvent);
router.get('/current', getOpenEvent);
router.get('/history', getEvents);

// Obtener miembros activos
router.get('/active-members', getActiveMembers);

// Activar Black Market (ADMIN/OWNER)
router.post('/activate-bm', requireRole(['ADMIN', 'OWNER']), activateBlackMarket);

export default router;


