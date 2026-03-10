import { Router } from 'express';
import { authMiddleware, optionalAuthMiddleware } from '../middlewares/auth';
import {
  getCurrentJackpotHandler,
  getJackpotStatsHandler,
  participateHandler,
} from '../controllers/jackpot.controller';

const router = Router();

/** Jackpot actuel — public (Home, page Jackpot). */
router.get('/', getCurrentJackpotHandler);

/** Stats utilisateur — auth requis. */
router.get('/stats', authMiddleware, getJackpotStatsHandler);

/** Participation gratuite — auth requis. */
router.post('/participate', authMiddleware, participateHandler);

export default router;
