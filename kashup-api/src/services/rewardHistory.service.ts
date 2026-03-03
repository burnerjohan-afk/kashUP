import prisma from '../config/prisma';
import { AppError } from '../utils/errors';

export const listRewardHistory = (userId: string) => {
  return prisma.rewardHistory.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 100
  });
};

export const listLotteries = () => {
  return prisma.lottery.findMany({
    include: {
      _count: {
        select: { entries: true }
      }
    },
    orderBy: { startAt: 'desc' }
  });
};

export const listChallenges = () => {
  return prisma.challenge.findMany({
    include: {
      progressions: {
        select: {
          userId: true,
          progress: true,
          completedAt: true
        }
      }
    },
    orderBy: { startAt: 'desc' }
  });
};

export const joinLottery = async (userId: string, lotteryId: string, tickets = 1) => {
  const lottery = await prisma.lottery.findUnique({ where: { id: lotteryId } });

  if (!lottery || !lottery.active) {
    throw new AppError('Loterie invalide ou inactive', 400);
  }

  const now = new Date();
  if (lottery.startAt > now || lottery.endAt < now || lottery.status === 'closed') {
    throw new AppError('La loterie n’est pas ouverte actuellement', 400);
  }

  return prisma.lotteryEntry.upsert({
    where: {
      lotteryId_userId: {
        lotteryId,
        userId
      }
    },
    update: {
      tickets: { increment: tickets }
    },
    create: {
      lotteryId,
      userId,
      tickets
    }
  });
};


