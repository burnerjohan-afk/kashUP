import { Router } from 'express';
import { getImpactLocal } from '../controllers/stats.controller';
import { optionalAuthMiddleware } from '../middlewares/auth';

const router = Router();

// Stats communautaires (volume, cashback, etc.) : accessibles à tous pour l’app mobile
router.get('/impact-local', optionalAuthMiddleware, getImpactLocal);

export default router;


