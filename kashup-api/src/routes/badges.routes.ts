import { Router } from 'express';
import { getBadges } from '../controllers/reward.controller';
import { authMiddleware, requireRoles } from '../middlewares/auth';
import { USER_ROLE } from '../types/domain';
import { notImplementedHandler } from '../controllers/resource.controller';

const router = Router();

// GET /api/v1/badges - Liste des badges (public)
router.get('/', getBadges);

// GET /api/v1/badges/:id - Détail d'un badge (public)
// Note: Pour l'instant, on utilise notImplementedHandler car il n'y a pas de service getBadgeById
// Si vous avez besoin de cette fonctionnalité, créez le service correspondant
router.get('/:id', notImplementedHandler);

// POST /api/v1/badges - Création d'un badge (admin)
router.post('/', authMiddleware, requireRoles(USER_ROLE.admin), notImplementedHandler);

// PATCH /api/v1/badges/:id - Modification d'un badge (admin)
router.patch('/:id', authMiddleware, requireRoles(USER_ROLE.admin), notImplementedHandler);

// DELETE /api/v1/badges/:id - Suppression d'un badge (admin)
router.delete('/:id', authMiddleware, requireRoles(USER_ROLE.admin), notImplementedHandler);

export default router;

