import { Request, Response } from 'express';
import {
  getJackpotConfig,
  updateJackpotConfig,
  getCurrentJackpot,
  addSponsorContribution,
  checkTriggerConditions,
  drawJackpotWinner,
  resetJackpot,
} from '../services/communityJackpotEngine';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { AppError } from '../utils/errors';
import prisma from '../config/prisma';

/** GET /admin/config/community-jackpot — Config jackpot (singleton). */
export const getJackpotConfigHandler = asyncHandler(async (_req: Request, res: Response) => {
  const config = await getJackpotConfig();
  sendSuccess(res, config);
});

/** PATCH /admin/config/community-jackpot — Mise à jour config jackpot. */
export const patchJackpotConfigHandler = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body || {};
  const config = await updateJackpotConfig({
    ...(body.cashbackContributionPercent != null && { cashbackContributionPercent: Number(body.cashbackContributionPercent) }),
    ...(body.lotteryPointsContribution != null && { lotteryPointsContribution: Number(body.lotteryPointsContribution) }),
    ...(body.challengePointsContribution != null && { challengePointsContribution: Number(body.challengePointsContribution) }),
    ...(body.globalPartnerPurchaseAmountThreshold != null && { globalPartnerPurchaseAmountThreshold: Number(body.globalPartnerPurchaseAmountThreshold) }),
    ...(body.globalActionsThreshold != null && { globalActionsThreshold: Number(body.globalActionsThreshold) }),
    ...(body.minActionsPerUser != null && { minActionsPerUser: Number(body.minActionsPerUser) }),
    ...(body.minPartnerPurchasesPerUser !== undefined && { minPartnerPurchasesPerUser: body.minPartnerPurchasesPerUser == null ? null : Number(body.minPartnerPurchasesPerUser) }),
    ...(body.freeParticipationTickets != null && { freeParticipationTickets: Number(body.freeParticipationTickets) }),
    ...(body.partnerPurchaseTickets != null && { partnerPurchaseTickets: Number(body.partnerPurchaseTickets) }),
    ...(body.lotteryTicketTickets != null && { lotteryTicketTickets: Number(body.lotteryTicketTickets) }),
    ...(body.challengeCompletionTickets != null && { challengeCompletionTickets: Number(body.challengeCompletionTickets) }),
    ...(body.maxDrawDate !== undefined && { maxDrawDate: body.maxDrawDate == null || body.maxDrawDate === '' ? null : body.maxDrawDate }),
  });
  sendSuccess(res, config, null, 200, 'Config jackpot mise à jour');
});

/** GET /admin/community-jackpot — Jackpot actuel (admin). */
export const getAdminCurrentJackpotHandler = asyncHandler(async (_req: Request, res: Response) => {
  const jackpot = await getCurrentJackpot();
  sendSuccess(res, jackpot);
});

/** POST /admin/community-jackpot/sponsor — Contribution sponsor (partnerId + amount). */
export const addSponsorContributionHandler = asyncHandler(async (req: Request, res: Response) => {
  const { partnerId, amount } = req.body || {};
  if (!partnerId || typeof amount !== 'number' || amount <= 0) {
    throw new AppError('partnerId et amount (nombre > 0) requis', 400);
  }
  await addSponsorContribution(partnerId, amount);
  const jackpot = await getCurrentJackpot();
  sendSuccess(res, jackpot, null, 200, 'Contribution sponsor enregistrée');
});

/** POST /admin/community-jackpot/check-trigger — Vérifie si les conditions de tirage sont remplies. */
export const checkTriggerHandler = asyncHandler(async (_req: Request, res: Response) => {
  const triggered = await checkTriggerConditions();
  sendSuccess(res, { triggered });
});

/** POST /admin/community-jackpot/draw — Déclenche le tirage (tire un gagnant, crédite, marque drawn). */
export const drawJackpotHandler = asyncHandler(async (_req: Request, res: Response) => {
  const result = await drawJackpotWinner();
  sendSuccess(res, result, null, 200, result ? 'Tirage effectué' : 'Aucun participant éligible');
});

/** POST /admin/community-jackpot/reset — Ferme le jackpot actuel et en crée un nouveau. */
export const resetJackpotHandler = asyncHandler(async (_req: Request, res: Response) => {
  await resetJackpot();
  const jackpot = await getCurrentJackpot();
  sendSuccess(res, jackpot, null, 200, 'Jackpot réinitialisé');
});

/** GET /admin/community-jackpot/contributions — Liste des contributions (pagination). */
export const listContributionsHandler = asyncHandler(async (req: Request, res: Response) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const cursor = req.query.cursor as string | undefined;
  const jackpotId = req.query.jackpotId as string | undefined;

  const where = jackpotId ? { jackpotId } : {};
  const items = await prisma.jackpotContribution.findMany({
    where,
    take: limit + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { id: true, email: true, firstName: true, lastName: true } },
    },
  });

  const hasMore = items.length > limit;
  const data = hasMore ? items.slice(0, limit) : items;
  const nextCursor = hasMore ? data[data.length - 1].id : null;

  sendSuccess(res, { data, nextCursor });
});

/** GET /admin/community-jackpot/entries — Liste des entrées (participants). */
export const listEntriesHandler = asyncHandler(async (req: Request, res: Response) => {
  const jackpotId = req.query.jackpotId as string | undefined;
  if (!jackpotId) {
    throw new AppError('jackpotId requis', 400);
  }
  const entries = await prisma.jackpotEntry.findMany({
    where: { jackpotId },
    orderBy: { tickets: 'desc' },
    include: {
      user: { select: { id: true, email: true, firstName: true, lastName: true } },
    },
  });
  sendSuccess(res, entries);
});

/** GET /admin/community-jackpot/winners — Liste des gagnants. */
export const listWinnersHandler = asyncHandler(async (req: Request, res: Response) => {
  const jackpotId = req.query.jackpotId as string | undefined;
  const where = jackpotId ? { jackpotId } : {};
  const winners = await prisma.jackpotWinner.findMany({
    where,
    orderBy: { drawDate: 'desc' },
    include: {
      user: { select: { id: true, email: true, firstName: true, lastName: true } },
      jackpot: { select: { id: true, title: true } },
    },
  });
  sendSuccess(res, winners);
});
