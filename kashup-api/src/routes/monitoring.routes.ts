import { Router } from 'express';
import { getHealthDetailed, getMetrics } from '../controllers/monitoring.controller';

const router = Router();

router.get('/health', getHealthDetailed);
router.get('/metrics', getMetrics);

export default router;

