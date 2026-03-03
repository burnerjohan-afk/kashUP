import { Router } from 'express';
import { authMiddleware, requireRoles } from '../middlewares/auth';
import { USER_ROLE } from '../types/domain';
import { notImplementedHandler } from '../controllers/resource.controller';

const router = Router();

// GET /api/v1/carteups - Liste des carteups (public)
// Note: Cette ressource n'existe pas encore en DB, donc on retourne 501
router.get('/', notImplementedHandler);

// GET /api/v1/carteups/:id - Détail d'un carteup (public)
router.get('/:id', notImplementedHandler);

// POST /api/v1/carteups - Création d'un carteup (admin)
router.post('/', authMiddleware, requireRoles(USER_ROLE.admin), notImplementedHandler);

// PATCH /api/v1/carteups/:id - Modification d'un carteup (admin)
router.patch('/:id', authMiddleware, requireRoles(USER_ROLE.admin), notImplementedHandler);

// DELETE /api/v1/carteups/:id - Suppression d'un carteup (admin)
router.delete('/:id', authMiddleware, requireRoles(USER_ROLE.admin), notImplementedHandler);

export default router;

