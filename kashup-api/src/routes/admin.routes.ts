import { Router } from 'express';
import { getAdminDashboard, getAdminDashboardMetrics } from '../controllers/adminReport.controller';
import { serveAdminApp } from '../controllers/adminFrontend.controller';
import {
  forceUserKYCHandler,
  getAdminUserByIdHandler,
  getAdminUsers,
  getUserGiftCardsHandler,
  getUserRewardsHistoryHandler,
  getUserStatisticsHandler,
  getUserTransactionsHandler,
  resetUserPasswordHandler
} from '../controllers/adminUser.controller';
import { getPartners } from '../controllers/partner.controller';
import {
  getStatisticsTable,
  getStatisticsDepartments
} from '../controllers/adminStatistics.controller';
import {
  getAIAnalysis
} from '../controllers/adminAI.controller';
import { getAdminCoffreFortConfig, patchAdminCoffreFortConfig } from '../controllers/adminCoffreFort.controller';
import {
  getJackpotConfigHandler,
  patchJackpotConfigHandler,
  getAdminCurrentJackpotHandler,
  addSponsorContributionHandler,
  checkTriggerHandler,
  drawJackpotHandler,
  resetJackpotHandler,
  listContributionsHandler,
  listEntriesHandler,
  listWinnersHandler,
} from '../controllers/adminJackpot.controller';
import {
  listChallengesAdmin,
  createChallenge,
  updateChallenge,
  getChallengeAdmin,
  deleteChallenge,
  listChallengeRewards,
  createChallengeReward,
} from '../controllers/adminChallenge.controller';
import { drawLotteryHandler, processDueLotteriesHandler } from '../controllers/adminLottery.controller';
import { authMiddleware, requireRoles } from '../middlewares/auth';
import { USER_ROLE } from '../types/domain';

const router = Router();

router.use(authMiddleware, requireRoles(USER_ROLE.admin));

// Liste des partenaires (même réponse que GET /partners, pour le back office)
router.get('/partners', getPartners);

router.get('/dashboard', getAdminDashboard);
router.get('/dashboard/metrics', getAdminDashboardMetrics);
router.get('/app', serveAdminApp);

// Routes admin pour les statistiques
router.get('/statistics/table', getStatisticsTable);
router.get('/statistics/departments', getStatisticsDepartments);

// Routes admin pour l'analyse IA
router.get('/ai/analysis', getAIAnalysis);

// Routes admin pour les utilisateurs
router.get('/users', getAdminUsers);
router.get('/users/:id', getAdminUserByIdHandler);
router.get('/users/:id/transactions', getUserTransactionsHandler);
router.get('/users/:id/rewards/history', getUserRewardsHistoryHandler);
router.get('/users/:id/gift-cards', getUserGiftCardsHandler);
router.get('/users/:id/statistics', getUserStatisticsHandler);
router.post('/users/:id/reset-password', resetUserPasswordHandler);
router.patch('/users/:id/kyc/force', forceUserKYCHandler);

// Config coffre-fort (règle : blocage mois, points par €/mois)
router.get('/config/coffre-fort', getAdminCoffreFortConfig);
router.patch('/config/coffre-fort', patchAdminCoffreFortConfig);

// Config jackpot communautaire
router.get('/config/community-jackpot', getJackpotConfigHandler);
router.patch('/config/community-jackpot', patchJackpotConfigHandler);

// Jackpot communautaire (admin)
router.get('/community-jackpot', getAdminCurrentJackpotHandler);
router.post('/community-jackpot/sponsor', addSponsorContributionHandler);
router.post('/community-jackpot/check-trigger', checkTriggerHandler);
router.post('/community-jackpot/draw', drawJackpotHandler);
router.post('/community-jackpot/reset', resetJackpotHandler);
router.get('/community-jackpot/contributions', listContributionsHandler);
router.get('/community-jackpot/entries', listEntriesHandler);
router.get('/community-jackpot/winners', listWinnersHandler);

// Challenges (moteur challenges)
router.get('/challenges', listChallengesAdmin);
router.get('/challenges/rewards', listChallengeRewards);
router.post('/challenges/rewards', createChallengeReward);
router.get('/challenges/:id', getChallengeAdmin);
router.post('/challenges', createChallenge);
router.patch('/challenges/:id', updateChallenge);
router.delete('/challenges/:id', deleteChallenge);

// Loteries (tirage admin)
router.post('/lotteries/:id/draw', drawLotteryHandler);
router.post('/lotteries/process-due', processDueLotteriesHandler);

export default router;

