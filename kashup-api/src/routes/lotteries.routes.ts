import { Router } from 'express';
import { getLotteries, getLotteryByIdHandler, joinLotteryHandler } from '../controllers/rewardHistory.controller';
import { authMiddleware, optionalAuthMiddleware, requireRoles } from '../middlewares/auth';
import { USER_ROLE } from '../types/domain';
import { notImplementedHandler } from '../controllers/resource.controller';

const router = Router();

// GET /api/v1/lotteries - Liste des loteries actives (page Rewards)
router.get('/', optionalAuthMiddleware, getLotteries);

// GET /api/v1/lotteries/:id - Détail d'une loterie
router.get('/:id', optionalAuthMiddleware, getLotteryByIdHandler);

// POST /api/v1/lotteries - Création d'une loterie (admin)
router.post('/', authMiddleware, requireRoles(USER_ROLE.admin), notImplementedHandler);

// PATCH /api/v1/lotteries/:id - Modification d'une loterie (admin)
router.patch('/:id', authMiddleware, requireRoles(USER_ROLE.admin), notImplementedHandler);

// DELETE /api/v1/lotteries/:id - Suppression d'une loterie (admin)
router.delete('/:id', authMiddleware, requireRoles(USER_ROLE.admin), notImplementedHandler);

// POST /api/v1/lotteries/:id/join - Rejoindre une loterie (authentifié)
router.post('/:id/join', authMiddleware, joinLotteryHandler);

export default router;

