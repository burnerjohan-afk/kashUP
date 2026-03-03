import { Router } from 'express';
import { getBoxUpContent } from '../controllers/content.controller';
import { authMiddleware, requireRoles } from '../middlewares/auth';
import { USER_ROLE } from '../types/domain';
import { notImplementedHandler } from '../controllers/resource.controller';
import { listGiftBoxes } from '../services/content.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { serializeResource } from '../utils/serializer';
import { parseListParams } from '../utils/listing';

const router = Router();

// GET /api/v1/boxups - Liste des boxups (public)
router.get('/', getBoxUpContent);

// GET /api/v1/boxups/:id - Détail d'un boxup (public)
router.get('/:id', asyncHandler(async (req, res) => {
  const params = parseListParams(req.query);
  const result = await listGiftBoxes(params);
  const boxup = result.data.find((b: any) => b.id === req.params.id);
  
  if (!boxup) {
    throw new (await import('../utils/errors')).AppError('BoxUp introuvable', 404);
  }
  
  const serialized = serializeResource(req, boxup, 'partner'); // Pas de type spécifique pour boxup
  sendSuccess(res, serialized, null, 200);
}));

// POST /api/v1/boxups - Création d'un boxup (admin)
router.post('/', authMiddleware, requireRoles(USER_ROLE.admin), notImplementedHandler);

// PATCH /api/v1/boxups/:id - Modification d'un boxup (admin)
router.patch('/:id', authMiddleware, requireRoles(USER_ROLE.admin), notImplementedHandler);

// DELETE /api/v1/boxups/:id - Suppression d'un boxup (admin)
router.delete('/:id', authMiddleware, requireRoles(USER_ROLE.admin), notImplementedHandler);

export default router;

