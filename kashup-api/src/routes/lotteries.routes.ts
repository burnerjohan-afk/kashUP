import { Router } from 'express';
import { getLotteries, joinLotteryHandler } from '../controllers/rewardHistory.controller';
import { authMiddleware, requireRoles } from '../middlewares/auth';
import { USER_ROLE } from '../types/domain';
import { notImplementedHandler } from '../controllers/resource.controller';
import { listLotteries } from '../services/rewardHistory.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { serializeResource } from '../utils/serializer';

const router = Router();

// GET /api/v1/lotteries - Liste des loteries (public)
router.get('/', getLotteries);

// GET /api/v1/lotteries/:id - Détail d'une loterie (public)
router.get('/:id', asyncHandler(async (req, res) => {
  const lotteries = await listLotteries();
  const lottery = lotteries.find((l: any) => l.id === req.params.id);
  
  if (!lottery) {
    throw new (await import('../utils/errors')).AppError('Loterie introuvable', 404);
  }
  
  const serialized = serializeResource(req, lottery, 'partner'); // Pas de type spécifique pour lottery
  sendSuccess(res, serialized, null, 200);
}));

// POST /api/v1/lotteries - Création d'une loterie (admin)
router.post('/', authMiddleware, requireRoles(USER_ROLE.admin), notImplementedHandler);

// PATCH /api/v1/lotteries/:id - Modification d'une loterie (admin)
router.patch('/:id', authMiddleware, requireRoles(USER_ROLE.admin), notImplementedHandler);

// DELETE /api/v1/lotteries/:id - Suppression d'une loterie (admin)
router.delete('/:id', authMiddleware, requireRoles(USER_ROLE.admin), notImplementedHandler);

// POST /api/v1/lotteries/:id/join - Rejoindre une loterie (authentifié)
router.post('/:id/join', authMiddleware, joinLotteryHandler);

export default router;

