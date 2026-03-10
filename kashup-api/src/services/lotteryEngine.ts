/**
 * Moteur de loteries KashUP
 * - Participation via points
 * - Tickets limités ou illimités
 * - Tirage sécurisé backend
 * - Compte à rebours, tickets restants
 */

import prisma from '../config/prisma';
import { AppError } from '../utils/errors';
import { notificationBus } from '../events/event-bus';
import { createNotification } from './notification.service';
import logger from '../utils/logger';

const now = () => new Date();

/** Loteries actives (status active, dates valides, non supprimées) */
export async function getActiveLotteries(userId?: string) {
  const at = now();
  const where = {
    deletedAt: null,
    active: true,
    status: 'active',
    startAt: { lte: at },
    endAt: { gte: at },
  };
  const lotteries = await prisma.lottery.findMany({
    where,
    include: {
      partner: { select: { id: true, name: true, logoUrl: true } },
      _count: { select: { entries: true } },
    },
    orderBy: { drawDate: 'asc' },
  });

  if (!userId) {
    return lotteries.map((l) => formatLotteryForApp(l, null));
  }

  const userEntries = await prisma.lotteryEntry.findMany({
    where: {
      userId,
      lotteryId: { in: lotteries.map((x) => x.id) },
    },
  });
  const byLottery = new Map(userEntries.map((e) => [e.lotteryId, e]));

  return lotteries.map((l) => formatLotteryForApp(l, byLottery.get(l.id) ?? null));
}

/** Loteries à afficher sur la page d'accueil : toutes celles en période (débutée, non terminée), actives ou à venir.
 *  Tri : date de tirage la plus proche en premier (drawDate asc). */
export async function getActiveLotteriesForHome(userId?: string) {
  const at = now();
  const lotteries = await prisma.lottery.findMany({
    where: {
      deletedAt: null,
      status: { in: ['active', 'upcoming'] },
      startAt: { lte: at },
      endAt: { gte: at },
    },
    include: {
      partner: { select: { id: true, name: true, logoUrl: true } },
    },
    orderBy: { drawDate: 'asc' },
  });
  if (!userId) {
    return lotteries.map((l) => formatLotteryForApp(l, null));
  }
  const userEntries = await prisma.lotteryEntry.findMany({
    where: {
      userId,
      lotteryId: { in: lotteries.map((x) => x.id) },
    },
  });
  const byLottery = new Map(userEntries.map((e) => [e.lotteryId, e]));
  return lotteries.map((l) => formatLotteryForApp(l, byLottery.get(l.id) ?? null));
}

/** Loteries à afficher sur la page Rewards : en période, actives ou à venir, visibles dans Rewards. */
export async function getActiveLotteriesForRewards(userId?: string) {
  const at = now();
  const lotteries = await prisma.lottery.findMany({
    where: {
      deletedAt: null,
      status: { in: ['active', 'upcoming'] },
      showOnRewards: true,
      startAt: { lte: at },
      endAt: { gte: at },
    },
    include: {
      partner: { select: { id: true, name: true, logoUrl: true } },
    },
    orderBy: { drawDate: 'asc' },
  });
  if (!userId) {
    return lotteries.map((l) => formatLotteryForApp(l, null));
  }
  const userEntries = await prisma.lotteryEntry.findMany({
    where: {
      userId,
      lotteryId: { in: lotteries.map((x) => x.id) },
    },
  });
  const byLottery = new Map(userEntries.map((e) => [e.lotteryId, e]));
  return lotteries.map((l) => formatLotteryForApp(l, byLottery.get(l.id) ?? null));
}

export async function getLotteryById(lotteryId: string, userId?: string) {
  const lottery = await prisma.lottery.findUnique({
    where: { id: lotteryId, deletedAt: null },
    include: {
      partner: { select: { id: true, name: true, logoUrl: true } },
    },
  });
  if (!lottery) throw new AppError('Loterie introuvable', 404);

  let userEntry: Awaited<ReturnType<typeof prisma.lotteryEntry.findUnique>> = null;
  if (userId) {
    userEntry = await prisma.lotteryEntry.findUnique({
      where: { lotteryId_userId: { lotteryId, userId } },
      include: { ticketRows: true },
    });
  }

  return formatLotteryForApp(lottery, userEntry);
}

function formatLotteryForApp(
  l: Awaited<ReturnType<typeof prisma.lottery.findFirst>> & {
    partner?: { id: string; name: string; logoUrl: string | null } | null;
    _count?: { entries: number };
    ticketRows?: { id: string; ticketNumber: number; status: string }[];
  },
  entry: Awaited<ReturnType<typeof prisma.lotteryEntry.findUnique>> | null
) {
  const pointsPerTicket = l.pointsPerTicket ?? l.ticketCost ?? 100;
  const ticketsSold = l.totalTicketsSold ?? 0;
  const totalAvailable = l.isTicketStockLimited ? (l.totalTicketsAvailable ?? 0) : null;
  const ticketsRemaining = totalAvailable != null ? Math.max(0, totalAvailable - ticketsSold) : null;
  const drawDate = l.drawDate ?? l.endAt;
  return {
    id: l.id,
    title: l.title,
    description: l.description,
    shortDescription: l.shortDescription,
    imageUrl: l.imageUrl,
    prizeType: l.prizeType,
    prizeTitle: l.prizeTitle,
    prizeDescription: l.prizeDescription,
    prizeValue: l.prizeValue,
    prizeCurrency: l.prizeCurrency,
    partnerId: l.partnerId,
    partner: l.partner,
    pointsPerTicket,
    isTicketStockLimited: l.isTicketStockLimited,
    totalTicketsAvailable: l.totalTicketsAvailable,
    totalTicketsSold: ticketsSold,
    ticketsRemaining,
    maxTicketsPerUser: l.maxTicketsPerUser,
    startAt: l.startAt,
    endAt: l.endAt,
    drawDate,
    status: l.status,
    showOnHome: l.showOnHome,
    showOnRewards: l.showOnRewards,
    userTicketCount: entry ? (entry.ticketCount ?? entry.tickets) : 0,
    userPointsSpent: entry?.pointsSpent ?? 0,
    countdown: getLotteryCountdown(drawDate),
  };
}

/** Valide une entrée sans créer */
export function validateLotteryEntry(
  userId: string,
  lotteryId: string,
  ticketCount: number
): { valid: boolean; error?: string } {
  if (ticketCount < 1) return { valid: false, error: 'Au moins 1 ticket requis' };
  return { valid: true };
}

export async function enterLottery(userId: string, lotteryId: string, ticketCount: number) {
  const valid = validateLotteryEntry(userId, lotteryId, ticketCount);
  if (!valid.valid) throw new AppError(valid.error!, 400);

  const lottery = await prisma.lottery.findUnique({
    where: { id: lotteryId, deletedAt: null },
  });
  if (!lottery || !lottery.active) {
    throw new AppError('Loterie invalide ou inactive', 404);
  }

  const at = now();
  if (lottery.startAt > at || lottery.endAt < at) {
    throw new AppError('La loterie n’est pas ouverte actuellement', 400);
  }
  if (lottery.status === 'closed') {
    throw new AppError('Cette loterie est terminée', 400);
  }

  const pointsPerTicket = lottery.pointsPerTicket ?? lottery.ticketCost ?? 100;
  const totalCost = ticketCount * pointsPerTicket;

  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  if (!wallet) throw new AppError('Wallet introuvable', 404);
  if (wallet.soldePoints < totalCost) {
    throw new AppError(`Points insuffisants. Requis: ${totalCost} pts, disponible: ${wallet.soldePoints} pts`, 400);
  }

  const existingEntry = await prisma.lotteryEntry.findUnique({
    where: { lotteryId_userId: { lotteryId, userId } },
  });
  const currentUserTickets = existingEntry ? (existingEntry.ticketCount ?? existingEntry.tickets) : 0;
  const newTotalUserTickets = currentUserTickets + ticketCount;

  if (lottery.maxTicketsPerUser != null && newTotalUserTickets > lottery.maxTicketsPerUser) {
    throw new AppError(
      `Limite atteinte: maximum ${lottery.maxTicketsPerUser} ticket(s) par utilisateur. Vous avez déjà ${currentUserTickets}.`,
      400
    );
  }

  if (lottery.isTicketStockLimited && lottery.totalTicketsAvailable != null) {
    const sold = lottery.totalTicketsSold ?? 0;
    const remaining = lottery.totalTicketsAvailable - sold;
    if (ticketCount > remaining) {
      throw new AppError(`Stock insuffisant. Il reste ${remaining} ticket(s).`, 400);
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    const entry = await tx.lotteryEntry.upsert({
      where: { lotteryId_userId: { lotteryId, userId } },
      update: {
        ticketCount: { increment: ticketCount },
        tickets: { increment: ticketCount },
        pointsSpent: { increment: totalCost },
      },
      create: {
        lotteryId,
        userId,
        ticketCount,
        tickets: ticketCount,
        pointsSpent: totalCost,
      },
      include: { lottery: true },
    });

    await tx.wallet.update({
      where: { id: wallet.id },
      data: { soldePoints: { decrement: totalCost } },
    });

    await tx.points.create({
      data: {
        userId,
        delta: -totalCost,
        reason: `Participation loterie "${lottery.title}" – ${ticketCount} ticket(s)`,
      },
    });

    const updatedLottery = await tx.lottery.update({
      where: { id: lotteryId },
      data: { totalTicketsSold: { increment: ticketCount } },
    });

    const nextTicketNumber = (updatedLottery.totalTicketsSold ?? 0) - ticketCount + 1;
    const tickets = Array.from({ length: ticketCount }, (_, i) => ({
      lotteryId,
      userId,
      entryId: entry.id,
      ticketNumber: nextTicketNumber + i,
      status: 'valid',
    }));
    await tx.lotteryTicket.createMany({ data: tickets });

    return { entry, updatedLottery };
  });

  notificationBus.emitEvent({
    type: 'lottery_joined',
    payload: { userId, lotteryId, ticketCount, pointsSpent: totalCost },
  });

  await createNotification(userId, {
    title: 'Participation confirmée',
    body: `${ticketCount} ticket(s) pour "${lottery.title}" (−${totalCost} pts)`,
    category: 'lotteries',
    metadata: { lotteryId, ticketCount, pointsSpent: totalCost },
  });

  return await getLotteryById(lotteryId, userId);
}

export function generateTickets(entryId: string, ticketCount: number) {
  return prisma.lotteryTicket.findMany({
    where: { entryId },
    orderBy: { ticketNumber: 'asc' },
    take: ticketCount,
  });
}

export async function getUserTicketCount(userId: string, lotteryId: string): Promise<number> {
  const entry = await prisma.lotteryEntry.findUnique({
    where: { lotteryId_userId: { lotteryId, userId } },
  });
  return entry ? (entry.ticketCount ?? entry.tickets) : 0;
}

export function getTicketsRemaining(lotteryId: string): Promise<number | null> {
  return prisma.lottery.findUnique({
    where: { id: lotteryId },
    select: {
      isTicketStockLimited: true,
      totalTicketsAvailable: true,
      totalTicketsSold: true,
    },
  }).then((l) => {
    if (!l || !l.isTicketStockLimited || l.totalTicketsAvailable == null) return null;
    return Math.max(0, l.totalTicketsAvailable - (l.totalTicketsSold ?? 0));
  });
}

/** Compte à rebours jusqu'à drawDate */
export function getLotteryCountdown(drawDate: Date | string): {
  text: string;
  imminent: boolean;
  days?: number;
  hours?: number;
  minutes?: number;
  seconds?: number;
} {
  const d = typeof drawDate === 'string' ? new Date(drawDate) : drawDate;
  const diff = d.getTime() - Date.now();
  if (diff <= 0) {
    return { text: 'Tirage en cours', imminent: true };
  }
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  if (days > 0) {
    return {
      text: `Tirage dans ${days}j ${hours}h`,
      imminent: false,
      days,
      hours,
      minutes,
      seconds,
    };
  }
  if (hours > 0) {
    return {
      text: `Tirage dans ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`,
      imminent: false,
      days: 0,
      hours,
      minutes,
      seconds,
    };
  }
  if (minutes > 0 || seconds > 0) {
    return {
      text: `Tirage imminent`,
      imminent: true,
      days: 0,
      hours: 0,
      minutes,
      seconds,
    };
  }
  return { text: 'Tirage imminent', imminent: true };
}

/** Récupère les loteries dont la date de tirage est passée et qui sont encore actives */
export async function getLotteriesReadyForDraw() {
  const at = now();
  const lotteries = await prisma.lottery.findMany({
    where: { status: 'active', endAt: { lte: at } },
    orderBy: { drawDate: 'asc' },
  });
  return lotteries.filter((l) => {
    const drawAt = l.drawDate ?? l.endAt;
    return drawAt && drawAt <= at;
  });
}

export async function closeExpiredLotteries() {
  const at = now();
  const closed = await prisma.lottery.updateMany({
    where: {
      status: 'active',
      endAt: { lt: at },
    },
    data: { status: 'closed' },
  });
  logger.info({ count: closed.count }, '[lotteryEngine] Loteries expirées fermées');
  return closed.count;
}

export async function drawWinner(lotteryId: string) {
  const lottery = await prisma.lottery.findUnique({
    where: { id: lotteryId },
  });
  if (!lottery) throw new AppError('Loterie introuvable', 404);
  if (lottery.status === 'closed' && lottery.winnerUserId) {
    throw new AppError('Le tirage a déjà été effectué', 400);
  }

  const validTickets = await prisma.lotteryTicket.findMany({
    where: { lotteryId, status: 'valid' },
  });
  if (validTickets.length === 0) {
    await prisma.lottery.update({
      where: { id: lotteryId },
      data: { status: 'closed' },
    });
    logger.info({ lotteryId }, '[lotteryEngine] Aucun ticket valide, loterie fermée sans gagnant');
    return null;
  }

  const winnerIndex = Math.floor(Math.random() * validTickets.length);
  const winningTicket = validTickets[winnerIndex];
  const drawDate = now();

  const result = await prisma.$transaction(async (tx) => {
    await tx.lotteryTicket.update({
      where: { id: winningTicket.id },
      data: { status: 'used' },
    });
    const winner = await tx.lotteryWinner.create({
      data: {
        lotteryId,
        userId: winningTicket.userId,
        entryId: winningTicket.entryId,
        ticketId: winningTicket.id,
        drawDate,
      },
    });
    await tx.lottery.update({
      where: { id: lotteryId },
      data: {
        status: 'closed',
        winnerUserId: winningTicket.userId,
      },
    });
    return winner;
  });

  logger.info(
    {
      lotteryId,
      winningTicketId: winningTicket.id,
      winningTicketNumber: winningTicket.ticketNumber,
      totalTickets: validTickets.length,
      drawDate,
      winnerUserId: winningTicket.userId,
    },
    '[lotteryEngine] Tirage effectué'
  );

  await grantLotteryPrize(winningTicket.userId, lotteryId);
  await notifyWinner(winningTicket.userId, lotteryId);

  return result;
}

export async function grantLotteryPrize(userId: string, lotteryId: string) {
  const lottery = await prisma.lottery.findUnique({
    where: { id: lotteryId },
  });
  if (!lottery) return;

  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  if (!wallet) return;

  const prizeType = lottery.prizeType ?? 'points_bonus';
  switch (prizeType) {
    case 'points_bonus':
    case 'points': {
      const value = lottery.prizeValue ?? 100;
      const pts = Math.round(value);
      await prisma.$transaction(async (tx) => {
        await tx.wallet.update({
          where: { id: wallet.id },
          data: { soldePoints: { increment: pts } },
        });
        await tx.points.create({
          data: {
            userId,
            delta: pts,
            reason: `Lot KashUP – ${lottery.title}`,
          },
        });
      });
      break;
    }
    case 'cashback': {
      const value = lottery.prizeValue ?? 0;
      await prisma.wallet.update({
        where: { id: wallet.id },
        data: { soldeCashback: { increment: value } },
      });
      break;
    }
    default:
      logger.info(
        { lotteryId, prizeType },
        '[lotteryEngine] Attribution manuelle du lot requise'
      );
  }

  await prisma.lotteryWinner.updateMany({
    where: { lotteryId, userId },
    data: { rewardStatus: 'delivered', deliveredAt: now() },
  });
}

export async function notifyWinner(userId: string, lotteryId: string) {
  const lottery = await prisma.lottery.findUnique({
    where: { id: lotteryId },
  });
  if (!lottery) return;

  await createNotification(userId, {
    title: '🎉 Vous avez gagné !',
    body: `Félicitations ! Vous avez gagné la loterie "${lottery.title}".`,
    category: 'lotteries',
    metadata: { lotteryId },
  });

  notificationBus.emitEvent({
    type: 'lottery_winner',
    payload: { userId, lotteryId },
  });
}

/** Traite toutes les loteries dont le tirage est dû (fermeture + tirage) */
export async function processLotteriesDueForDraw() {
  const lotteries = await getLotteriesReadyForDraw();
  const results: { lotteryId: string; status: string; winnerId?: string }[] = [];

  for (const lottery of lotteries) {
    try {
      const winner = await drawWinner(lottery.id);
      results.push({
        lotteryId: lottery.id,
        status: 'drawn',
        winnerId: winner ? (winner as { userId: string }).userId : undefined,
      });
    } catch (err) {
      logger.error({ err, lotteryId: lottery.id }, '[lotteryEngine] Erreur lors du tirage');
      results.push({ lotteryId: lottery.id, status: 'error' });
    }
  }

  return results;
}
