// src/routes/health.routes.js
//
// FIX-306 — Router de health checks.
// Monta /health (liveness) y /api/health (readiness).
//
import { Router } from 'express';
import { liveness, readiness } from '../controllers/health.controller.js';

const router = Router();

// /health — Liveness (sin auth, respuesta instantánea)
router.get('/health', liveness);

// /api/health — Readiness (sin auth, verifica Supabase)
router.get('/api/health', readiness);

export default router;