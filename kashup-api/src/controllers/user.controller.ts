import { Request, Response } from 'express';
import {
  getCurrentUser,
  getMyBadges,
  getMyGiftCards,
  getMyTransactions,
  getReferralsInvitees,
  getReferralsSummary,
  getRewardsSummary,
  getWallet,
  getWalletHistory,
  getWalletMonthlyInjected,
  getWalletMonthlyObjective,
  deleteMyAccount,
  exportMyData
} from '../services/user.service';
import {
  getCoffreFortConfig,
  getCoffreFortHistory,
  getWithdrawableCoffre,
  transferToCoffre,
  withdrawFromCoffre
} from '../services/coffreFort.service';
import { updateUserConsent, getUserConsent } from '../services/consent.service';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/errors';
import { sendSuccess } from '../utils/response';

const ensureAuth = (req: Request) => {
  if (!req.user) {
    throw new AppError('Authentification requise', 401);
  }
  return req.user.sub;
};

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const userId = ensureAuth(req);
  const user = await getCurrentUser(userId);
  sendSuccess(res, user);
});

export const getMeWallet = asyncHandler(async (req: Request, res: Response) => {
  const userId = ensureAuth(req);
  const [wallet, coffreFortConfig, withdrawableCoffreFort] = await Promise.all([
    getWallet(userId),
    getCoffreFortConfig(),
    getWithdrawableCoffre(userId)
  ]);
  sendSuccess(res, {
    ...wallet,
    coffreFortConfig,
    withdrawableCoffreFort
  });
});

export const postCoffreFortTransfer = asyncHandler(async (req: Request, res: Response) => {
  const userId = ensureAuth(req);
  const amount = Number(req.body?.amount);
  const result = await transferToCoffre(userId, amount);
  sendSuccess(res, result, null, 200, 'Versement en coffre-fort effectué');
});

export const postCoffreFortWithdraw = asyncHandler(async (req: Request, res: Response) => {
  const userId = ensureAuth(req);
  const amount = Number(req.body?.amount);
  const wallet = await withdrawFromCoffre(userId, amount);
  sendSuccess(res, wallet, null, 200, 'Retrait coffre-fort effectué');
});

export const getCoffreFortHistoryHandler = asyncHandler(async (req: Request, res: Response) => {
  const userId = ensureAuth(req);
  const history = await getCoffreFortHistory(userId);
  sendSuccess(res, history);
});

export const getMeWalletHistory = asyncHandler(async (req: Request, res: Response) => {
  const userId = ensureAuth(req);
  const history = await getWalletHistory(userId);
  sendSuccess(res, history);
});

export const getMeWalletMonthlyObjective = asyncHandler(async (req: Request, res: Response) => {
  const userId = ensureAuth(req);
  const snapshot = await getWalletMonthlyObjective(userId);
  sendSuccess(res, snapshot);
});

export const getMeWalletMonthlyInjected = asyncHandler(async (req: Request, res: Response) => {
  const userId = ensureAuth(req);
  const snapshot = await getWalletMonthlyInjected(userId);
  sendSuccess(res, snapshot);
});

export const getMeTransactions = asyncHandler(async (req: Request, res: Response) => {
  const userId = ensureAuth(req);
  const transactions = await getMyTransactions(userId);
  sendSuccess(res, transactions);
});

export const getMeRewards = asyncHandler(async (req: Request, res: Response) => {
  const userId = ensureAuth(req);
  const rewards = await getRewardsSummary(userId);
  sendSuccess(res, rewards);
});

export const getMeBadges = asyncHandler(async (req: Request, res: Response) => {
  const userId = ensureAuth(req);
  const badges = await getMyBadges(userId);
  sendSuccess(res, badges);
});

export const getMeGiftCards = asyncHandler(async (req: Request, res: Response) => {
  const userId = ensureAuth(req);
  const cards = await getMyGiftCards(userId);
  sendSuccess(res, cards);
});

export const getMyReferralsSummaryHandler = asyncHandler(async (req: Request, res: Response) => {
  const userId = ensureAuth(req);
  const summary = await getReferralsSummary(userId);
  sendSuccess(res, summary);
});

export const getMyReferralsInviteesHandler = asyncHandler(async (req: Request, res: Response) => {
  const userId = ensureAuth(req);
  const invitees = await getReferralsInvitees(userId);
  sendSuccess(res, invitees);
});

/**
 * POST /me/consent
 * Gérer les consentements RGPD (Art. 6, 7)
 */
export const updateMyConsent = asyncHandler(async (req: Request, res: Response) => {
  const userId = ensureAuth(req);
  const consent = await updateUserConsent(userId, req.body);
  sendSuccess(res, consent, null, 200, 'Consentement mis à jour');
});

/**
 * GET /me/consent
 * Récupérer les consentements utilisateur
 */
export const getMyConsent = asyncHandler(async (req: Request, res: Response) => {
  const userId = ensureAuth(req);
  const consent = await getUserConsent(userId);
  sendSuccess(res, consent || {
    privacyPolicy: false,
    marketing: false,
    analytics: false
  });
});

/**
 * GET /me/export
 * Export des données personnelles (RGPD Art. 20 - Portabilité)
 */
export const exportMyDataHandler = asyncHandler(async (req: Request, res: Response) => {
  const userId = ensureAuth(req);
  const exportData = await exportMyData(userId);
  
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="kashup-data-${userId}-${Date.now()}.json"`);
  res.json(exportData);
});

/**
 * DELETE /me/account
 * Droit à l'effacement (RGPD Art. 17 - Droit à l'oubli)
 */
export const deleteMyAccountHandler = asyncHandler(async (req: Request, res: Response) => {
  const userId = ensureAuth(req);
  await deleteMyAccount(userId);
  sendSuccess(res, { message: 'Compte supprimé avec succès' }, null, 200, 'Compte supprimé');
});


