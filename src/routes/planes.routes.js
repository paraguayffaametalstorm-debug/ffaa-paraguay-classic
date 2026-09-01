import { Router } from 'express';
import {
  getCatalogModels,
  getCatalogMods,
  getMyPlanes,
  addPlane,
  updatePlane,
  deletePlane,
  exportPlanesCSV,
  getPlaneStats,
  getPlaneDetails,
  updatePlaneSystem
} from '../controllers/planes.controller.js';
import { requireAuth } from '../middlewares/auth.js';

const router = Router();

// Public catalog routes (both formats supported)
router.get('/catalog/plane-models', getCatalogModels);
router.get('/catalog/plane-mods', getCatalogMods);
router.get('/plane-models', getCatalogModels);
router.get('/plane-mods', getCatalogMods);

// Authenticated hangar routes
router.use(requireAuth);
router.get('/', getMyPlanes);
router.get('/my-planes', getMyPlanes);
router.get('/:id/stats', getPlaneStats);
router.get('/:id/details', getPlaneDetails);
router.put('/:id/system', updatePlaneSystem);
router.post('/', addPlane);
router.put('/:id', updatePlane);
router.delete('/:id', deletePlane);
router.get('/export', exportPlanesCSV);

export default router;
