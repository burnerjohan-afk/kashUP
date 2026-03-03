import { Router } from 'express';
import {
  getMyBankConnections,
  getMyBudget,
  getMyPayments,
  getMySecurity,
  getPowensLinkToken,
  powensWebhook
} from '../controllers/powens.controller';
import { authMiddleware } from '../middlewares/auth';

const router = Router();

router.get('/link-token', authMiddleware, getPowensLinkToken);
router.get('/me/banks', authMiddleware, getMyBankConnections);
router.get('/me/budget', authMiddleware, getMyBudget);
router.get('/me/payments', authMiddleware, getMyPayments);
router.get('/me/security', authMiddleware, getMySecurity);
router.post('/webhook', powensWebhook);

export default router;

