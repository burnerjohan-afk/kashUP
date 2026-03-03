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
import {
  getStatisticsTable,
  getStatisticsDepartments
} from '../controllers/adminStatistics.controller';
import {
  getAIAnalysis
} from '../controllers/adminAI.controller';
import { getAdminCoffreFortConfig, patchAdminCoffreFortConfig } from '../controllers/adminCoffreFort.controller';
import { authMiddleware, requireRoles } from '../middlewares/auth';
import { USER_ROLE } from '../types/domain';

const router = Router();

router.use(authMiddleware, requireRoles(USER_ROLE.admin));
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

export default router;

