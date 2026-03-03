import { Router } from 'express';
import { drimifyWebhookHandler, getDrimifyExperiences, playDrimifyExperience } from '../controllers/drimify.controller';
import { authMiddleware } from '../middlewares/auth';

const router = Router();

router.get('/experiences', getDrimifyExperiences);
router.post('/experiences/:id/play', authMiddleware, playDrimifyExperience);
router.post('/webhook', drimifyWebhookHandler);

export default router;

