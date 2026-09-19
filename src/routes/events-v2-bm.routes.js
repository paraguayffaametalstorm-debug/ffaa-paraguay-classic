/**
 * ============================================================================
 * PARAGUAY-FFAA | METALSTORM
 * RUTAS BLACK MARKET UNIFICADO — v2 (F4.2.2-B)
 * ============================================================================
 * Propósito:
 *   Definir las 8 rutas del Black Market sobre el modelo unificado
 *   (events_master + event_participations). Reemplaza bm.routes.js legacy.
 *
 * Montaje (ver server.js):
 *   app.use('/api/events-v2/bm', eventsV2BmRoutes);
 *
 * IMPORTANTE — ORDEN DE MONTAJE:
 *   Este router DEBE montarse ANTES que eventsV2Routes en server.js.
 *   Razón: GET /api/events-v2/:id capturaría /api/events-v2/bm/* como
 *   un evento con id="bm" si se montara primero events-v2.
 *
 * Rutas (orden de declaración crítico):
 *   1. GET    /active                    (literal, antes que /:eventId)
 *   2. GET    /:eventId
 *   3. POST   /
 *   4. PUT    /:eventId
 *   5. GET    /:eventId/progress
 *   6. PUT    /:eventId/progress
 *   7. GET    /:eventId/leaderboard
 *   8. GET    /:eventId/discount
 *
 * NO tiene aliases retrocompatibles. El frontend legacy js/bm.js consume
 * /api/bm/* (deprecado con sunset 2026-12-16) hasta F4.2.2-F.
 *
 * Referencias:
 *   - docs/adr/ADR-006-black-market-unificado.md
 *   - src/controllers/events-v2-bm.controller.js
 *
 * Versión: v2.0
 * Fecha: 2026-09-19
 * Autor: PJPIROVANI (OWNER)
 * ============================================================================
 */

import { Router } from 'express';
import {
  getBmActiveEventV2,
  getBmEventByIdV2,
  createBmEventV2,
  updateBmEventV2,
  getBmProgressV2,
  updateBmProgressV2,
  getBmLeaderboardV2,
  getBmDiscountV2
} from '../controllers/events-v2-bm.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.js';

const router = Router();

// ============================================================
// 1. LECTURA — Evento activo (ruta LITERAL, antes que /:eventId)
// ============================================================
// CRÍTICO: esta ruta debe declararse antes de /:eventId.
// De lo contrario, /active matchearía contra /:eventId con eventId="active".
// ============================================================

router.get('/active', requireAuth, getBmActiveEventV2);

// ============================================================
// 2. LECTURA — Detalle de un evento BM
// ============================================================

router.get('/:eventId', requireAuth, getBmEventByIdV2);

// ============================================================
// 3. ESCRITURA — Crear evento BM (ADMIN/OWNER)
// ============================================================

router.post('/', requireAuth, requireRole('ADMIN', 'OWNER'), createBmEventV2);

// ============================================================
// 4. ESCRITURA — Editar evento BM (ADMIN/OWNER)
// ============================================================

router.put('/:eventId', requireAuth, requireRole('ADMIN', 'OWNER'), updateBmEventV2);

// ============================================================
// 5. LECTURA — Progreso del piloto (con ?day=N opcional)
// ============================================================

router.get('/:eventId/progress', requireAuth, getBmProgressV2);

// ============================================================
// 6. ESCRITURA — Actualizar progreso (toggle o reemplazo total)
// ============================================================
// Cualquier piloto autenticado puede actualizar su propio progreso.
// Auto-crea participación si no existe (Opción A, confirmada).
// ============================================================

router.put('/:eventId/progress', requireAuth, updateBmProgressV2);

// ============================================================
// 7. LECTURA — Leaderboard del evento
// ============================================================

router.get('/:eventId/leaderboard', requireAuth, getBmLeaderboardV2);

// ============================================================
// 8. LECTURA — Descuento acumulado + ficha de aeronave
// ============================================================

router.get('/:eventId/discount', requireAuth, getBmDiscountV2);

// ============================================================
// EXPORT
// ============================================================

export default router;