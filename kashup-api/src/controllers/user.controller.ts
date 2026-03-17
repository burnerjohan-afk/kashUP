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
  exportMyData,
  updatePushToken,
  clearPushToken,
} from '../services/user.service';
import {
  getCoffreFortConfig,
  getCoffreFortHistory,
  getWithdrawableCoffre,
  transferToCoffre,
  withdrawFromCoffre
} from '../services/coffreFort.service';
import { updateUserConsent, getUserConsent } from '../services/consent.service';
import { getDonationImpactForUser, createDonation } from '../services/donation.service';
import { getPartner, getPartnerDashboardStats, PartnerDashboardFilters } from '../services/partner.service';
import prisma from '../config/prisma';
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

/** GET /me/donations/impact — montants donnés ce mois / cette année */
export const getMeDonationImpactHandler = asyncHandler(async (req: Request, res: Response) => {
  const userId = ensureAuth(req);
  const impact = await getDonationImpactForUser(userId);
  sendSuccess(res, impact);
});

/** POST /me/donations — créer un don (débit cashback → association) */
export const postDonationHandler = asyncHandler(async (req: Request, res: Response) => {
  const userId = ensureAuth(req);
  const associationId = req.body?.associationId;
  const amount = Number(req.body?.amount);
  if (!associationId || typeof associationId !== 'string') {
    throw new AppError('associationId requis', 400);
  }
  const result = await createDonation(userId, associationId, amount);
  sendSuccess(res, result, null, 201, 'Don enregistré');
});

/** GET /me/partner — infos partenaire pour l'espace partenaire (role=partner) */
export const getMePartnerHandler = asyncHandler(async (req: Request, res: Response) => {
  const userId = ensureAuth(req);
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, partnerId: true }
  });
  if (!user || user.role !== 'partner' || !user.partnerId) {
    throw new AppError('Accès partenaire non autorisé', 403);
  }
  const partner = await getPartner(user.partnerId);
  sendSuccess(res, partner);
});

/** GET /me/partner/stats — stats dashboard partenaire (CA, users, par jour/mois, genre, âge) */
export const getMePartnerStatsHandler = asyncHandler(async (req: Request, res: Response) => {
  const userId = ensureAuth(req);
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, partnerId: true }
  });
  if (!user || user.role !== 'partner' || !user.partnerId) {
    throw new AppError('Accès partenaire non autorisé', 403);
  }
  const filters: PartnerDashboardFilters = {
    groupBy: (req.query.groupBy as 'day' | 'month') || 'month',
    from: req.query.from as string | undefined,
    to: req.query.to as string | undefined
  };
  const stats = await getPartnerDashboardStats(user.partnerId, filters);
  sendSuccess(res, stats);
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

/**
 * POST /me/push-token
 * Enregistre le token Expo Push pour les notifications (app mobile).
 * Body: { token: string, platform?: 'expo' }
 */
export const postPushTokenHandler = asyncHandler(async (req: Request, res: Response) => {
  const userId = ensureAuth(req);
  const token = req.body?.token;
  if (!token || typeof token !== 'string') {
    throw new AppError('Le champ token est requis', 400);
  }
  await updatePushToken(userId, token);
  sendSuccess(res, { message: 'Token push enregistré' }, null, 200, 'Token enregistré');
});

/**
 * DELETE /me/push-token
 * Supprime le token Expo Push (déconnexion ou désactivation des notifications).
 * Body: { token?: string } (optionnel, pour cibler un appareil)
 */
export const deletePushTokenHandler = asyncHandler(async (req: Request, res: Response) => {
  const userId = ensureAuth(req);
  await clearPushToken(userId);
  sendSuccess(res, { message: 'Token push supprimé' }, null, 200, 'Token supprimé');
});


