import { Router } from 'express';
import { getSyncChanges } from '../controllers/sync.controller';
import { authMiddleware } from '../middlewares/auth';

const router = Router();

/**
 * GET /api/v1/sync/changes
 * Endpoint global de synchronisation pour récupérer tous les changements depuis une date
 * 
 * Requiert authentification
 */
router.get('/changes', authMiddleware, getSyncChanges);

export default router;

