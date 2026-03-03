import { Router } from 'express';
import { getNetworkInfo } from '../controllers/debug.controller';

const router = Router();

// GET /api/v1/debug/network - Informations réseau (publique, pas d'auth requise)
router.get('/network', getNetworkInfo);

export default router;

