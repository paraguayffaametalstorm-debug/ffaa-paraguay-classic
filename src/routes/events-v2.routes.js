/**
 * ============================================================================
 * PARAGUAY-FFAA | METALSTORM
 * RUTAS DE EVENTOS — v2 (Aditivo, no destructivo)
 * ============================================================================
 * Rutas nuevas bajo /api/events-v2/*.
 * Coexisten con /api/events/* (legacy) hasta migrar el frontend.
 *
 * Versión: v2.0
 * Fecha: 2026-09-17
 * Autor: PJPIROVANI (OWNER)
 * ============================================================================
 */

import { Router } from 'express';
import {
  getEvents,
  getActiveEvent,
  getEventById,
  createEvent,
  updateEvent,
  changeEventStatus,
  deleteEvent,
  getParticipations,
  createParticipation,
  updateParticipation,
  deleteParticipation
} from '../controllers/events-v2.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.js';

const router = Router();

// ============================================================
// Rutas de lectura (autenticadas)
// ============================================================

router.get('/', requireAuth, getEvents);
router.get('/active', requireAuth, getActiveEvent);
router.get('/open', requireAuth, getActiveEvent);  // Alias retrocompatible
router.get('/:id', requireAuth, getEventById);

// ============================================================
// Rutas de escritura (ADMIN/OWNER)
// ============================================================

router.post('/', requireAuth, requireRole('ADMIN', 'OWNER'), createEvent);
router.put('/:id', requireAuth, requireRole('ADMIN', 'OWNER'), updateEvent);
router.patch('/:id/status', requireAuth, requireRole('ADMIN', 'OWNER'), changeEventStatus);
router.delete('/:id', requireAuth, requireRole('ADMIN', 'OWNER'), deleteEvent);

// ============================================================
// Rutas de participaciones (autenticadas)
// ============================================================

router.get('/:id/participations', requireAuth, getParticipations);
router.post('/:id/participations', requireAuth, createParticipation);
router.put('/:id/participations/:uid', requireAuth, updateParticipation);
router.delete('/:id/participations/:uid', requireAuth, deleteParticipation);

export default router;