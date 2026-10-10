// src/routes/veteran.routes.js
//
// ADR-010 — Router del módulo Veteranos.
//
// Política de acceso:
//   - Todo el router requiere autenticación (requireAuth).
//   - Solo VETERANO/ADMIN/OWNER pueden acceder (requireRole).
//   - Los endpoints de mentoría específica pasan por requireMentorOwnership
//     (RBAC fino: el Veterano solo ve SUS mentorías).
//
import { Router } from 'express';
import {
  getMyPupilos,
  getMyMentorships,
  getMentorship,
  logContact,
  evaluateMentorship,
  getMyStats
} from '../controllers/veteran.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.js';
import { requireMentorOwnership } from '../middlewares/mentorOwnership.js';

const router = Router();

// Auth global del router
router.use(requireAuth);
router.use(requireRole('VETERANO', 'ADMIN', 'OWNER'));

// ========== 1. VISTA PROPIA DEL VETERANO ==========
router.get('/my-pupilos', getMyPupilos);
router.get('/my-mentorships', getMyMentorships);
router.get('/my-stats', getMyStats);

// ========== 2. MENTORÍA ESPECÍFICA (RBAC fino) ==========
router.get('/mentorship/:id',
  requireMentorOwnership,
  getMentorship
);

router.post('/mentorship/:id/log',
  requireMentorOwnership,
  logContact
);

router.post('/mentorship/:id/evaluate',
  requireMentorOwnership,
  evaluateMentorship
);

export default router;