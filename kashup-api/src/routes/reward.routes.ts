import { Router } from 'express';
import { createRewardHandler, deleteRewardHandler, getAllRewards, getBadges, getBoosts, getRewardsByType, purchaseBoostHandler, updateRewardHandler } from '../controllers/reward.controller';
import { getChallengeCategories, getChallenges, getLotteries, getLotteriesForHome, getLotteryByIdHandler, getRewardHistory, joinLotteryHandler } from '../controllers/rewardHistory.controller';
import { authMiddleware, optionalAuthMiddleware, requireRoles } from '../middlewares/auth';
import { USER_ROLE } from '../types/domain';
import { uploadSingleOptional } from '../config/upload';

const router = Router();

// Routes publiques/utilisateurs
router.get('/boosts', getBoosts);
router.post('/boosts/:id/purchase', authMiddleware, purchaseBoostHandler);
router.get('/badges', getBadges);
router.get('/history', authMiddleware, getRewardHistory);
router.get('/lotteries', optionalAuthMiddleware, getLotteries);
router.get('/lotteries/home', optionalAuthMiddleware, getLotteriesForHome);
router.get('/lotteries/:id', optionalAuthMiddleware, getLotteryByIdHandler);
router.post('/lotteries/:id/join', authMiddleware, joinLotteryHandler);
router.get('/challenges/categories', authMiddleware, getChallengeCategories);
router.get('/challenges', optionalAuthMiddleware, getChallenges);

// Routes admin (validation faite dans le handler après conversion FormData → types)
router.get('/', authMiddleware, requireRoles(USER_ROLE.admin), getAllRewards);
router.get('/:type', authMiddleware, requireRoles(USER_ROLE.admin), getRewardsByType);
router.post(
  '/',
  authMiddleware,
  requireRoles(USER_ROLE.admin),
  uploadSingleOptional('image'),
  createRewardHandler
);
router.patch(
  '/:id',
  authMiddleware,
  requireRoles(USER_ROLE.admin),
  uploadSingleOptional('image'),
  updateRewardHandler
);
router.delete(
  '/:id',
  authMiddleware,
  requireRoles(USER_ROLE.admin),
  deleteRewardHandler
);

export default router;


