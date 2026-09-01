import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { 
    getSummary,
    getActiveMembers
} from '../controllers/dashboard.controller.js';

const router = Router();

router.use(requireAuth);
router.get('/summary', getSummary);
router.get('/active-members', getActiveMembers);

export default router;


