/**
 * ============================================================================
 * PARAGUAY-FFAA | METALSTORM - RUTAS DE BLACK MARKET (BM)
 * API RESTful para Eventos Especiales, Misiones Diarias y Descuentos v3.7.0
 * ============================================================================
 */

import { Router } from 'express';
import {
  getBmEvents,
  getBmActiveEvent,
  getBmEventById,
  createBmEvent,
  updateBmEvent,
  activateBmEvent,
  deactivateBmEvent,
  getBmMissionsToday,
  getBmMissionsByEvent,
  createBmMission,
  updateBmMission,
  deleteBmMission,
  completeBmMission,
  getBmProgress,
  getBmDiscount,
  purchaseBmDiscount,
  getBmStats,
  getBmLeaderboard
} from '../controllers/bm.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.js';

const router = Router();

// ============================================================
// 1. RUTAS DE EVENTOS BM
// ============================================================

// Listar eventos BM (público / autenticado)
router.get('/events', getBmEvents);

// Evento activo actual
router.get('/events/active', getBmActiveEvent);

// Detalle de evento por ID
router.get('/events/:id', getBmEventById);

// Rutas de administración de eventos (ADMIN / OWNER)
router.post('/events', requireAuth, requireRole('ADMIN', 'OWNER'), createBmEvent);
router.put('/events/:id', requireAuth, requireRole('ADMIN', 'OWNER'), updateBmEvent);
router.post('/events/:id/activate', requireAuth, requireRole('ADMIN', 'OWNER'), activateBmEvent);
router.post('/events/:id/deactivate', requireAuth, requireRole('ADMIN', 'OWNER'), deactivateBmEvent);

// ============================================================
// 2. RUTAS DE MISIONES Y PROGRESO (AUTENTICADAS)
// ============================================================

// Misiones del día actual para el usuario logueado
router.get('/missions/today', requireAuth, getBmMissionsToday);

// Misiones de un evento agrupadas por día
router.get('/missions/:eventId', requireAuth, getBmMissionsByEvent);

// Crear/editar/desactivar misiones personalizadas (ADMIN / OWNER)
router.post('/missions', requireAuth, requireRole('ADMIN', 'OWNER'), createBmMission);
router.put('/missions/:id', requireAuth, requireRole('ADMIN', 'OWNER'), updateBmMission);
router.delete('/missions/:id', requireAuth, requireRole('ADMIN', 'OWNER'), deleteBmMission);

// Completar/alternar misión por el piloto
router.post('/missions/:id/complete', requireAuth, completeBmMission);

// Progreso del combatiente en el evento activo
router.get('/progress', requireAuth, getBmProgress);

// ============================================================
// 3. DESCUENTOS Y ESTADÍSTICAS
// ============================================================

// Descuento actual y oferta de aeronave del piloto
router.get('/discount', requireAuth, getBmDiscount);

// Canjear / comprar aeronave con descuento acumulado
router.post('/discount/purchase', requireAuth, purchaseBmDiscount);

// Estadísticas globales del evento
router.get('/stats', getBmStats);

// Tabla de posiciones de combatientes en Black Market
router.get('/leaderboard', getBmLeaderboard);

export default router;
