// src/routes/tournaments.routes.js
//
// ADR-011 — Router del Sistema de Torneos (F1.4).
//
// Monta los 8 handlers de tournaments.controller.js con su cadena de
// middlewares. Sin lógica: solo enrutamiento.
//
// Política de acceso (ADR-011 D7, D8 + Anexo III Art. 24.3):
//   - Todo el router requiere autenticación (requireAuth global).
//   - POST /, PATCH /:id/status, PATCH /:id/moderator → ADMIN/OWNER.
//   - POST /:id/matches/:mid/result y /draft → requireTournamentModerator
//     (RBAC fino: OWNER/ADMIN bypass, VETERANO/MIEMBRO solo si son el
//     moderador designado del torneo).
//   - GET /, GET /:id, POST /:id/register → solo requireAuth.
//
import { Router } from 'express';
import {
  getTournaments,
  createTournament,
  getTournamentById,
  updateTournamentStatus,
  registerTeam,
  registerMatchResult,
  registerDraftAction,
  changeModerator
} from '../controllers/tournaments.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.js';
import { requireTournamentModerator } from '../middlewares/tournamentModerator.js';

const router = Router();

// Auth global del router
router.use(requireAuth);

// ========== 1. LISTAR TORNEOS ==========
router.get('/', getTournaments);

// ========== 2. CREAR TORNEO (solo ADMIN/OWNER) ==========
router.post('/', requireRole('ADMIN', 'OWNER'), createTournament);

// ========== 3. DETALLE DEL TORNEO ==========
router.get('/:id', getTournamentById);

// ========== 4. CAMBIAR ESTADO (solo ADMIN/OWNER) ==========
router.patch('/:id/status', requireRole('ADMIN', 'OWNER'), updateTournamentStatus);

// ========== 5. REGISTRAR EQUIPO ==========
router.post('/:id/register', registerTeam);

// ========== 6. REGISTRAR RESULTADO (RBAC fino) ==========
router.post('/:id/matches/:mid/result', requireTournamentModerator, registerMatchResult);

// ========== 7. REGISTRAR DRAFT (RBAC fino) ==========
router.post('/:id/matches/:mid/draft', requireTournamentModerator, registerDraftAction);

// ========== 8. REASIGNAR MODERADOR (solo ADMIN/OWNER) ==========
router.patch('/:id/moderator', requireRole('ADMIN', 'OWNER'), changeModerator);

export default router;
