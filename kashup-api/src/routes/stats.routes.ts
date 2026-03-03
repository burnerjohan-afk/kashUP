import { Router } from 'express';
import { getImpactLocal } from '../controllers/stats.controller';
import { authMiddleware, requireRoles } from '../middlewares/auth';
import { USER_ROLE } from '../types/domain';

const router = Router();

router.get('/impact-local', authMiddleware, requireRoles(USER_ROLE.admin), getImpactLocal);

export default router;


