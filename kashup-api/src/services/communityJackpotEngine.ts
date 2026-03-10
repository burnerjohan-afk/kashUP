/**
 * Moteur du Jackpot Communautaire KashUP
 * - Participation gratuite possible
 * - Contributions : cashback partenaires, loterie, challenges, sponsors
 * - Déclenchement par seuils d'activité ou date max
 * - Éligibilité configurable (min actions, optionnel min achats)
 */

import prisma from '../config/prisma';
import { AppError } from '../utils/errors';
import { notificationBus } from '../events/event-bus';
import { createNotification } from './notification.service';
import logger from '../utils/logger';

const now = () => new Date();

export type JackpotConfig = {
  id: string;
  cashbackContributionPercent: number;
  lotteryPointsContribution: number;
  challengePointsContribution: number;
  globalPartnerPurchaseAmountThreshold: number;
  globalActionsThreshold: number;
  minActionsPerUser: number;
  minPartnerPurchasesPerUser: number | null;
  freeParticipationTickets: number;
  partnerPurchaseTickets: number;
  lotteryTicketTickets: number;
  challengeCompletionTickets: number;
  maxDrawDate: string | null;
};

export type CurrentJackpotDto = {
  id: string;
  title: string;
  description: string | null;
  currentAmount: number;
  currency: string;
  startDate: string;
  maxDrawDate: string | null;
  status: string;
  totalParticipants: number;
  totalActions: number;
  totalPartnerPurchasesAmount: number;
  lastWinnerUserId: string | null;
  lastWinningAmount: number | null;
  progress: {
    partnerPurchasesAmount: number;
    partnerPurchasesThreshold: number;
    actions: number;
    actionsThreshold: number;
  };
  config: JackpotConfig;
};

export type UserJackpotStatsDto = {
  tickets: number;
  actionsCount: number;
  partnerPurchasesCount: number;
  isEligible: boolean;
  jackpot: CurrentJackpotDto;
};

/** Récupère la config jackpot (singleton). Crée les valeurs par défaut si absentes. */
export async function getJackpotConfig(): Promise<JackpotConfig> {
  let config = await prisma.communityJackpotConfig.findFirst();
  if (!config) {
    config = await prisma.communityJackpotConfig.create({
      data: {
        cashbackContributionPercent: 0,
        lotteryPointsContribution: 0,
        challengePointsContribution: 0,
        globalPartnerPurchaseAmountThreshold: 10000,
        globalActionsThreshold: 2000,
        minActionsPerUser: 1,
        minPartnerPurchasesPerUser: null,
        freeParticipationTickets: 1,
        partnerPurchaseTickets: 5,
        lotteryTicketTickets: 2,
        challengeCompletionTickets: 2,
      },
    });
  }
  return {
    id: config.id,
    cashbackContributionPercent: config.cashbackContributionPercent,
    lotteryPointsContribution: config.lotteryPointsContribution,
    challengePointsContribution: config.challengePointsContribution,
    globalPartnerPurchaseAmountThreshold: config.globalPartnerPurchaseAmountThreshold,
    globalActionsThreshold: config.globalActionsThreshold,
    minActionsPerUser: config.minActionsPerUser,
    minPartnerPurchasesPerUser: config.minPartnerPurchasesPerUser,
    freeParticipationTickets: config.freeParticipationTickets,
    partnerPurchaseTickets: config.partnerPurchaseTickets,
    lotteryTicketTickets: config.lotteryTicketTickets,
    challengeCompletionTickets: config.challengeCompletionTickets,
    maxDrawDate: config.maxDrawDate?.toISOString() ?? null,
  };
}

/** Met à jour la config jackpot (admin). */
export async function updateJackpotConfig(
  payload: Partial<Omit<JackpotConfig, 'id'>>
): Promise<JackpotConfig> {
  const config = await getJackpotConfig();
  const updated = await prisma.communityJackpotConfig.update({
    where: { id: config.id },
    data: {
      ...(payload.cashbackContributionPercent != null && { cashbackContributionPercent: payload.cashbackContributionPercent }),
      ...(payload.lotteryPointsContribution != null && { lotteryPointsContribution: payload.lotteryPointsContribution }),
      ...(payload.challengePointsContribution != null && { challengePointsContribution: payload.challengePointsContribution }),
      ...(payload.globalPartnerPurchaseAmountThreshold != null && { globalPartnerPurchaseAmountThreshold: payload.globalPartnerPurchaseAmountThreshold }),
      ...(payload.globalActionsThreshold != null && { globalActionsThreshold: payload.globalActionsThreshold }),
      ...(payload.minActionsPerUser != null && { minActionsPerUser: payload.minActionsPerUser }),
      ...(payload.minPartnerPurchasesPerUser !== undefined && { minPartnerPurchasesPerUser: payload.minPartnerPurchasesPerUser }),
      ...(payload.freeParticipationTickets != null && { freeParticipationTickets: payload.freeParticipationTickets }),
      ...(payload.partnerPurchaseTickets != null && { partnerPurchaseTickets: payload.partnerPurchaseTickets }),
      ...(payload.lotteryTicketTickets != null && { lotteryTicketTickets: payload.lotteryTicketTickets }),
      ...(payload.challengeCompletionTickets != null && { challengeCompletionTickets: payload.challengeCompletionTickets }),
      ...(payload.maxDrawDate !== undefined && { maxDrawDate: payload.maxDrawDate == null ? null : new Date(payload.maxDrawDate) }),
    },
  });
  return {
    ...updated,
    id: updated.id,
    maxDrawDate: updated.maxDrawDate?.toISOString() ?? null,
  } as JackpotConfig;
}

/** Récupère ou crée le jackpot actif (un seul actif à la fois). */
async function getOrCreateCurrentJackpot(): Promise<{
  id: string;
  title: string;
  description: string | null;
  currentAmount: number;
  currency: string;
  startDate: Date;
  maxDrawDate: Date | null;
  status: string;
  totalParticipants: number;
  totalActions: number;
  totalPartnerPurchasesAmount: number;
  lastWinnerUserId: string | null;
  lastWinningAmount: number | null;
}> {
  let jackpot = await prisma.communityJackpot.findFirst({
    where: { status: 'active' },
    orderBy: { createdAt: 'desc' },
  });
  if (!jackpot) {
    const config = await getJackpotConfig();
    jackpot = await prisma.communityJackpot.create({
      data: {
        title: 'Jackpot KashUP',
        description: 'Jackpot communautaire alimenté par le cashback, les loteries et les challenges.',
        currentAmount: 0,
        currency: 'EUR',
        status: 'active',
        totalParticipants: 0,
        totalActions: 0,
        totalPartnerPurchasesAmount: 0,
        maxDrawDate: config.maxDrawDate ? new Date(config.maxDrawDate) : null,
      },
    });
  }
  return jackpot;
}

/** Récupère ou crée l'entrée utilisateur pour le jackpot actif. */
async function getOrCreateJackpotEntry(
  tx: { jackpotEntry: typeof prisma.jackpotEntry },
  jackpotId: string,
  userId: string
) {
  let entry = await tx.jackpotEntry.findUnique({
    where: { jackpotId_userId: { jackpotId, userId } },
  });
  if (!entry) {
    entry = await tx.jackpotEntry.create({
      data: {
        jackpotId,
        userId,
        tickets: 0,
        actionsCount: 0,
        partnerPurchasesCount: 0,
        isEligible: false,
      },
    });
  }
  return entry;
}

/** Recalcule isEligible pour une entrée selon la config. */
function computeEligible(
  actionsCount: number,
  partnerPurchasesCount: number,
  config: JackpotConfig
): boolean {
  if (actionsCount < config.minActionsPerUser) return false;
  if (config.minPartnerPurchasesPerUser != null && partnerPurchasesCount < config.minPartnerPurchasesPerUser) return false;
  return true;
}

/** Récupère le jackpot actuel pour l'API (affichage Home, page Jackpot). Crée un jackpot actif si aucun n'existe. */
export async function getCurrentJackpot(): Promise<CurrentJackpotDto | null> {
  let jackpot = await prisma.communityJackpot.findFirst({
    where: { status: 'active' },
    orderBy: { createdAt: 'desc' },
  });
  if (!jackpot) {
    await getOrCreateCurrentJackpot();
    jackpot = await prisma.communityJackpot.findFirst({
      where: { status: 'active' },
      orderBy: { createdAt: 'desc' },
    });
  }
  if (!jackpot) return null;
  const config = await getJackpotConfig();
  return {
    id: jackpot.id,
    title: jackpot.title,
    description: jackpot.description,
    currentAmount: jackpot.currentAmount,
    currency: jackpot.currency,
    startDate: jackpot.startDate.toISOString(),
    maxDrawDate: jackpot.maxDrawDate?.toISOString() ?? null,
    status: jackpot.status,
    totalParticipants: jackpot.totalParticipants,
    totalActions: jackpot.totalActions,
    totalPartnerPurchasesAmount: jackpot.totalPartnerPurchasesAmount,
    lastWinnerUserId: jackpot.lastWinnerUserId,
    lastWinningAmount: jackpot.lastWinningAmount,
    progress: {
      partnerPurchasesAmount: jackpot.totalPartnerPurchasesAmount,
      partnerPurchasesThreshold: config.globalPartnerPurchaseAmountThreshold,
      actions: jackpot.totalActions,
      actionsThreshold: config.globalActionsThreshold,
    },
    config,
  };
}

/** Participation gratuite : 1 ticket (configurable), enregistre une contribution free_participation. */
export async function registerFreeParticipation(userId: string): Promise<void> {
  const config = await getJackpotConfig();
  const jackpot = await getOrCreateCurrentJackpot();
  const ticketsToAdd = config.freeParticipationTickets;

  await prisma.$transaction(async (tx) => {
    let entry = await getOrCreateJackpotEntry(tx as any, jackpot.id, userId);
    const newActions = entry.actionsCount + 1;
    const newTickets = entry.tickets + ticketsToAdd;
    const isEligible = computeEligible(newActions, entry.partnerPurchasesCount, config);

    await tx.jackpotContribution.create({
      data: {
        jackpotId: jackpot.id,
        userId,
        sourceType: 'free_participation',
        contributionAmount: 0,
        contributionPoints: 0,
      },
    });

    await tx.jackpotEntry.update({
      where: { id: entry.id },
      data: {
        tickets: newTickets,
        actionsCount: newActions,
        isEligible,
      },
    });

    await tx.communityJackpot.update({
      where: { id: jackpot.id },
      data: {
        totalActions: { increment: 1 },
        totalParticipants: entry.actionsCount === 0 ? { increment: 1 } : undefined,
      },
    });
  });
}

/** Contribution cashback : applique le % configuré au montant cashback, ajoute au jackpot et met à jour l'entrée (tickets + achats). transactionAmount = montant de l'achat partenaire (pour seuil déclenchement). */
export async function addCashbackContribution(
  userId: string,
  cashbackAmount: number,
  transactionAmount?: number
): Promise<void> {
  if (cashbackAmount <= 0 || !Number.isFinite(cashbackAmount)) return;
  const config = await getJackpotConfig();
  const percent = config.cashbackContributionPercent;
  if (percent <= 0) return;

  const contributionAmount = Number(((cashbackAmount * percent) / 100).toFixed(2));
  const purchaseAmount = transactionAmount != null && Number.isFinite(transactionAmount) ? transactionAmount : 0;
  const jackpot = await getOrCreateCurrentJackpot();
  const ticketsToAdd = config.partnerPurchaseTickets;

  await prisma.$transaction(async (tx) => {
    let entry = await getOrCreateJackpotEntry(tx as any, jackpot.id, userId);
    const newActions = entry.actionsCount + 1;
    const newPurchases = entry.partnerPurchasesCount + 1;
    const newTickets = entry.tickets + ticketsToAdd;
    const isEligible = computeEligible(newActions, newPurchases, config);

    await tx.jackpotContribution.create({
      data: {
        jackpotId: jackpot.id,
        userId,
        sourceType: 'partner_cashback',
        contributionAmount,
        contributionPoints: 0,
      },
    });

    await tx.jackpotEntry.update({
      where: { id: entry.id },
      data: {
        tickets: newTickets,
        actionsCount: newActions,
        partnerPurchasesCount: newPurchases,
        isEligible,
      },
    });

    await tx.communityJackpot.update({
      where: { id: jackpot.id },
      data: {
        currentAmount: { increment: contributionAmount },
        totalActions: { increment: 1 },
        totalPartnerPurchasesAmount: { increment: purchaseAmount },
        totalParticipants: entry.actionsCount === 0 ? { increment: 1 } : undefined,
      },
    });
  });
}

/** Contribution loterie : points jackpot configurés + tickets pour l'utilisateur. */
export async function addLotteryContribution(
  userId: string,
  sourceReferenceId?: string
): Promise<void> {
  const config = await getJackpotConfig();
  const pointsContribution = config.lotteryPointsContribution;
  const ticketsToAdd = config.lotteryTicketTickets;
  if (pointsContribution <= 0 && ticketsToAdd <= 0) return;

  const jackpot = await getOrCreateCurrentJackpot();

  await prisma.$transaction(async (tx) => {
    let entry = await getOrCreateJackpotEntry(tx as any, jackpot.id, userId);
    const newActions = entry.actionsCount + 1;
    const newTickets = entry.tickets + ticketsToAdd;
    const isEligible = computeEligible(newActions, entry.partnerPurchasesCount, config);

    await tx.jackpotContribution.create({
      data: {
        jackpotId: jackpot.id,
        userId,
        sourceType: 'lottery_ticket',
        sourceReferenceId: sourceReferenceId ?? null,
        contributionAmount: 0,
        contributionPoints: pointsContribution,
      },
    });

    await tx.jackpotEntry.update({
      where: { id: entry.id },
      data: {
        tickets: newTickets,
        actionsCount: newActions,
        isEligible,
      },
    });

    await tx.communityJackpot.update({
      where: { id: jackpot.id },
      data: {
        totalActions: { increment: 1 },
        totalParticipants: entry.actionsCount === 0 ? { increment: 1 } : undefined,
      },
    });
  });
}

/** Contribution challenge complété : points jackpot + tickets. */
export async function addChallengeContribution(
  userId: string,
  sourceReferenceId?: string
): Promise<void> {
  const config = await getJackpotConfig();
  const pointsContribution = config.challengePointsContribution;
  const ticketsToAdd = config.challengeCompletionTickets;
  if (pointsContribution <= 0 && ticketsToAdd <= 0) return;

  const jackpot = await getOrCreateCurrentJackpot();

  await prisma.$transaction(async (tx) => {
    let entry = await getOrCreateJackpotEntry(tx as any, jackpot.id, userId);
    const newActions = entry.actionsCount + 1;
    const newTickets = entry.tickets + ticketsToAdd;
    const isEligible = computeEligible(newActions, entry.partnerPurchasesCount, config);

    await tx.jackpotContribution.create({
      data: {
        jackpotId: jackpot.id,
        userId,
        sourceType: 'challenge_completion',
        sourceReferenceId: sourceReferenceId ?? null,
        contributionAmount: 0,
        contributionPoints: pointsContribution,
      },
    });

    await tx.jackpotEntry.update({
      where: { id: entry.id },
      data: {
        tickets: newTickets,
        actionsCount: newActions,
        isEligible,
      },
    });

    await tx.communityJackpot.update({
      where: { id: jackpot.id },
      data: {
        totalActions: { increment: 1 },
        totalParticipants: entry.actionsCount === 0 ? { increment: 1 } : undefined,
      },
    });
  });
}

/** Contribution sponsor : montant direct au jackpot (pas d'userId, partenaire). */
export async function addSponsorContribution(partnerId: string, amount: number): Promise<void> {
  if (amount <= 0 || !Number.isFinite(amount)) {
    throw new AppError('Montant sponsor invalide', 400);
  }
  const jackpot = await getOrCreateCurrentJackpot();

  await prisma.$transaction(async (tx) => {
    await tx.jackpotContribution.create({
      data: {
        jackpotId: jackpot.id,
        userId: null,
        sourceType: 'sponsor',
        sourceReferenceId: partnerId,
        contributionAmount: amount,
        contributionPoints: 0,
      },
    });

    await tx.communityJackpot.update({
      where: { id: jackpot.id },
      data: { currentAmount: { increment: amount } },
    });
  });
}

/** Enregistre une action utilisateur (incrémente actionsCount, pas de ticket sauf si type = free_participation). */
export async function registerUserAction(userId: string, _actionType?: string): Promise<void> {
  const config = await getJackpotConfig();
  const jackpot = await getOrCreateCurrentJackpot();

  await prisma.$transaction(async (tx) => {
    let entry = await getOrCreateJackpotEntry(tx as any, jackpot.id, userId);
    const newActions = entry.actionsCount + 1;
    const isEligible = computeEligible(newActions, entry.partnerPurchasesCount, config);

    await tx.jackpotEntry.update({
      where: { id: entry.id },
      data: { actionsCount: newActions, isEligible },
    });

    await tx.communityJackpot.update({
      where: { id: jackpot.id },
      data: {
        totalActions: { increment: 1 },
        totalParticipants: entry.actionsCount === 0 ? { increment: 1 } : undefined,
      },
    });
  });
}

/** Stats jackpot pour un utilisateur (tickets, actions, éligibilité, jackpot courant). */
export async function getUserJackpotStats(userId: string): Promise<UserJackpotStatsDto | null> {
  const jackpotDto = await getCurrentJackpot();
  if (!jackpotDto) return null;

  const entry = await prisma.jackpotEntry.findUnique({
    where: {
      jackpotId_userId: { jackpotId: jackpotDto.id, userId },
    },
  });

  return {
    tickets: entry?.tickets ?? 0,
    actionsCount: entry?.actionsCount ?? 0,
    partnerPurchasesCount: entry?.partnerPurchasesCount ?? 0,
    isEligible: entry?.isEligible ?? false,
    jackpot: jackpotDto,
  };
}

/** Vérifie si l'utilisateur est éligible au gain. */
export async function checkUserEligibility(userId: string): Promise<boolean> {
  const config = await getJackpotConfig();
  const jackpot = await getOrCreateCurrentJackpot();
  const entry = await prisma.jackpotEntry.findUnique({
    where: { jackpotId_userId: { jackpotId: jackpot.id, userId } },
  });
  if (!entry) return false;
  return computeEligible(entry.actionsCount, entry.partnerPurchasesCount, config);
}

/** Vérifie si les conditions de tirage sont remplies (seuils ou date max). */
export async function checkTriggerConditions(): Promise<boolean> {
  const jackpot = await prisma.communityJackpot.findFirst({
    where: { status: 'active' },
    orderBy: { createdAt: 'desc' },
  });
  if (!jackpot) return false;

  const config = await getJackpotConfig();
  const at = now();

  const thresholdReached =
    jackpot.totalPartnerPurchasesAmount >= config.globalPartnerPurchaseAmountThreshold &&
    jackpot.totalActions >= config.globalActionsThreshold;
  const dateReached = jackpot.maxDrawDate != null && at >= jackpot.maxDrawDate;

  return thresholdReached || dateReached;
}

/** Tire un gagnant parmi les entrées éligibles (pondéré par tickets), enregistre le gain, crédite le portefeuille. */
export async function drawJackpotWinner(): Promise<{ winnerUserId: string; winningAmount: number } | null> {
  const jackpot = await prisma.communityJackpot.findFirst({
    where: { status: 'active' },
    orderBy: { createdAt: 'desc' },
  });
  if (!jackpot) return null;

  const eligibleEntries = await prisma.jackpotEntry.findMany({
    where: { jackpotId: jackpot.id, isEligible: true, tickets: { gt: 0 } },
    include: { user: { select: { id: true } } },
  });

  if (eligibleEntries.length === 0) {
    logger.warn({ jackpotId: jackpot.id }, 'Jackpot draw: no eligible entries');
    await prisma.communityJackpot.update({
      where: { id: jackpot.id },
      data: { status: 'drawn' },
    });
    return null;
  }

  const totalTickets = eligibleEntries.reduce((sum, e) => sum + e.tickets, 0);
  let r = Math.random() * totalTickets;
  let winnerEntry = eligibleEntries[0];
  for (const entry of eligibleEntries) {
    r -= entry.tickets;
    if (r <= 0) {
      winnerEntry = entry;
      break;
    }
  }

  const winningAmount = jackpot.currentAmount;

  await prisma.$transaction(async (tx) => {
    await tx.jackpotWinner.create({
      data: {
        jackpotId: jackpot.id,
        userId: winnerEntry.userId,
        winningAmount,
        drawDate: now(),
      },
    });

    await tx.communityJackpot.update({
      where: { id: jackpot.id },
      data: {
        status: 'drawn',
        lastWinnerUserId: winnerEntry.userId,
        lastWinningAmount: winningAmount,
      },
    });
  });

  await grantJackpotReward(winnerEntry.userId, winningAmount);

  try {
    await createNotification(winnerEntry.userId, {
      title: 'Jackpot KashUP – Vous avez gagné !',
      body: `Félicitations ! Vous avez remporté le jackpot de ${winningAmount.toFixed(2)} €. Le montant a été crédité sur votre cagnotte.`,
      category: 'jackpot_winner',
      metadata: { jackpotId: jackpot.id, winningAmount },
    });
  } catch (e) {
    logger.warn({ err: e }, 'Failed to create jackpot winner notification');
  }

  notificationBus.emitEvent({
    type: 'jackpot_winner',
    payload: { userId: winnerEntry.userId, jackpotId: jackpot.id, winningAmount },
  } as any);

  return { winnerUserId: winnerEntry.userId, winningAmount };
}

/** Crédite le montant du jackpot sur le portefeuille (solde cashback). */
export async function grantJackpotReward(userId: string, amount: number): Promise<void> {
  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  if (!wallet) {
    logger.warn({ userId }, 'Jackpot grant: wallet not found');
    return;
  }
  await prisma.wallet.update({
    where: { userId },
    data: { soldeCashback: { increment: amount } },
  });
}

/** Réinitialise pour un nouveau cycle : marque l'actuel comme closed et crée un nouveau jackpot actif. */
export async function resetJackpot(): Promise<void> {
  const jackpot = await prisma.communityJackpot.findFirst({
    where: { status: 'active' },
    orderBy: { createdAt: 'desc' },
  });
  if (jackpot) {
    await prisma.communityJackpot.update({
      where: { id: jackpot.id },
      data: { status: 'closed' },
    });
  }
  await getOrCreateCurrentJackpot();
}

/** Calcule la prochaine date de tirage (ex. maxDrawDate si défini). */
export function calculateNextDrawDate(jackpot: { maxDrawDate: Date | null }): Date | null {
  return jackpot.maxDrawDate;
}

/** Vérifie les conditions de tirage et effectue le tirage si elles sont remplies (appelé par le cron). */
export async function processJackpotDueForDraw(): Promise<{ drawn: boolean; winnerUserId?: string; winningAmount?: number } | null> {
  const triggered = await checkTriggerConditions();
  if (!triggered) return null;
  const result = await drawJackpotWinner();
  if (result) {
    await resetJackpot();
    return { drawn: true, winnerUserId: result.winnerUserId, winningAmount: result.winningAmount };
  }
  await resetJackpot();
  return { drawn: false };
}
