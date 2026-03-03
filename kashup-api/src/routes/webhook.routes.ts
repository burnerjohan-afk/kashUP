import { Router } from 'express';
import { unifiedWebhook } from '../controllers/webhook.controller';

const router = Router();

router.post('/', unifiedWebhook);

export default router;

