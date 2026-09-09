/**
 * ============================================================================
 * PARAGUAY-FFAA | METALSTORM - RUTAS DE MODELOS DE AERONAVES (CATÁLOGO)
 * Rutas RESTful para gestión de catálogo de cazas de combate v3.6.0
 * Protegido con RBAC para roles ADMIN y OWNER
 * ============================================================================
 */

import { Router } from 'express';
import {
  getPlaneModels,
  getPlaneModelById,
  createPlaneModel,
  updatePlaneModel,
  deletePlaneModel,
  restorePlaneModel
} from '../controllers/plane-models.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.js';

const router = Router();

// ============================================================
// RUTAS PÚBLICAS / CONSULTA DE CATÁLOGO
// ============================================================

// Listar todos los modelos (admite ?include_inactive=true)
router.get('/', getPlaneModels);

// Obtener modelo específico por ID
router.get('/:id', getPlaneModelById);

// ============================================================
// RUTAS ADMINISTRATIVAS PROTEGIDAS (ADMIN & OWNER)
// ============================================================
router.use(requireAuth);
router.use(requireRole('ADMIN', 'OWNER'));

// Registrar nuevo modelo de aeronave
router.post('/', createPlaneModel);

// Modificar modelo de aeronave existente
router.put('/:id', updatePlaneModel);

// Desactivar modelo de aeronave (eliminación suave / soft delete)
router.delete('/:id', deletePlaneModel);

// Reactivar modelo de aeronave previamente desactivado
router.patch('/:id/restore', restorePlaneModel);
router.post('/:id/restore', restorePlaneModel);

export default router;
