/**
 * ============================================================================
 * PARAGUAY-FFAA | METALSTORM - FIX-209
 * presence.routes.js
 * ============================================================================
 * PROPÓSITO:
 *   Router de presencia de pilotos. Redirige a los controladores que usan
 *   Supabase (persistente y multi-réplica compatible).
 *
 * ANTES (v4.5.8):
 *   Usaba un Set en memoria (`const onlineUsers = new Set()`) que:
 *   - No compartía estado entre las 2 réplicas de Fly.io.
 *   - Se perdía en cada redeploy.
 *   - Sin TTL: los pilotos nunca se "limpiaban" si no llamaban /offline.
 *
 * AHORA (v4.5.9):
 *   - Persistencia en Supabase (tabla `presence`).
 *   - TTL de 5 min: un piloto sin heartbeat reciente se considera OFFLINE.
 *   - Cleanup automático vía cron (cada 5 min).
 *
 * FECHA: 2026-09-23
 * REF: ADR-005-presence-en-supabase.md
 * ============================================================================
 */

import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import {
    markOnline,
    markOffline,
    getActiveCount
} from '../controllers/presence.controller.js';

const router = Router();

// Todas las rutas de presence requieren autenticación
router.use(requireAuth);

// POST /api/presence/online — marca al piloto como ONLINE
router.post('/online', markOnline);

// POST /api/presence/offline — marca al piloto como OFFLINE
router.post('/offline', markOffline);

// GET /api/presence/active — devuelve el conteo de pilotos ONLINE
router.get('/active', getActiveCount);

export default router;