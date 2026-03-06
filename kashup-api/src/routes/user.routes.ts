import { Router } from 'express';
import {
  getMe,
  getMeBadges,
  getMeGiftCards,
  getMeRewards,
  getMeTransactions,
  getMeWallet,
  getMeWalletHistory,
  getMeWalletMonthlyInjected,
  getMeWalletMonthlyObjective,
  postCoffreFortTransfer,
  postCoffreFortWithdraw,
  getCoffreFortHistoryHandler,
  getMyReferralsInviteesHandler,
  getMyReferralsSummaryHandler,
  getMeDonationImpactHandler,
  postDonationHandler,
  getMePartnerHandler,
  getMePartnerStatsHandler,
  updateMyConsent,
  getMyConsent,
  exportMyDataHandler,
  deleteMyAccountHandler
} from '../controllers/user.controller';
import { authMiddleware } from '../middlewares/auth';

const router = Router();

router.use(authMiddleware);
router.get('/', getMe);
router.get('/wallet', getMeWallet);
router.get('/wallet/history', getMeWalletHistory);
router.get('/wallet/monthly-objective', getMeWalletMonthlyObjective);
router.get('/wallet/monthly-injected', getMeWalletMonthlyInjected);
router.get('/coffre-fort/history', getCoffreFortHistoryHandler);
router.post('/coffre-fort/transfer', postCoffreFortTransfer);
router.post('/coffre-fort/withdraw', postCoffreFortWithdraw);
router.get('/transactions', getMeTransactions);
router.get('/rewards', getMeRewards);
router.get('/badges', getMeBadges);
router.get('/gift-cards', getMeGiftCards);
router.get('/referrals/summary', getMyReferralsSummaryHandler);
router.get('/referrals/invitees', getMyReferralsInviteesHandler);
router.get('/donations/impact', getMeDonationImpactHandler);
router.post('/donations', postDonationHandler);
router.get('/partner', getMePartnerHandler);
router.get('/partner/stats', getMePartnerStatsHandler);

// Routes RGPD
router.get('/consent', getMyConsent);
router.post('/consent', updateMyConsent);
router.get('/export', exportMyDataHandler);
router.delete('/account', deleteMyAccountHandler);

export default router;


