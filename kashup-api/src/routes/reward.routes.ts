import { Router } from 'express';
import { createRewardHandler, getAllRewards, getBadges, getBoosts, getRewardsByType, purchaseBoostHandler, updateRewardHandler } from '../controllers/reward.controller';
import { getChallenges, getLotteries, getRewardHistory, joinLotteryHandler } from '../controllers/rewardHistory.controller';
import { authMiddleware, requireRoles } from '../middlewares/auth';
import { USER_ROLE } from '../types/domain';
import { uploadSingle } from '../config/upload';

const router = Router();

// Routes publiques/utilisateurs
router.get('/boosts', getBoosts);
router.post('/boosts/:id/purchase', authMiddleware, purchaseBoostHandler);
router.get('/badges', getBadges);
router.get('/history', authMiddleware, getRewardHistory);
router.get('/lotteries', getLotteries);
router.post('/lotteries/:id/join', authMiddleware, joinLotteryHandler);
router.get('/challenges', getChallenges);

// Routes admin (validation faite dans le handler après conversion FormData → types)
router.get('/', authMiddleware, requireRoles(USER_ROLE.admin), getAllRewards);
router.get('/:type', authMiddleware, requireRoles(USER_ROLE.admin), getRewardsByType);
router.post(
  '/',
  authMiddleware,
  requireRoles(USER_ROLE.admin),
  uploadSingle('image'),
  createRewardHandler
);
router.patch(
  '/:id',
  authMiddleware,
  requireRoles(USER_ROLE.admin),
  uploadSingle('image'),
  updateRewardHandler
);

export default router;


