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

const CATEGORY_LABELS: Record<string, string> = {
  consentements: 'Consentements',
  parrainages: 'Parrainages',
  cagnotte: 'Cagnotte',
  achats: 'Challenges',
  connexion: 'Connexion',
  ma_fid: 'Ma fidélité',
};

/** Dérive la catégorie d'un challenge (category explicite ou dérivée du type) — exportée pour le controller */
export function getChallengeCategory(ch: { category?: string | null; type: string }): string {
  if (ch.category && ch.category.trim()) return ch.category.trim().toLowerCase();
  const t = (ch.type || '').toLowerCase();
  if (t.includes('invite')) return 'parrainages';
  if (t.includes('spend') || t.includes('cagnotte')) return 'cagnotte';
  if (t.includes('consent') || t.includes('consentement')) return 'consentements';
  if (t.includes('loyalty') || t.includes('fid')) return 'ma_fid';
  if (t.includes('discovery') || t.includes('geo') || t.includes('event')) return 'achats';
  return 'achats';
}

export async function listChallengeCategories(userId: string): Promise<
  { category: string; label: string; completedCount: number; totalCount: number; pointsEarned: number }[]
> {
  const challenges = await prisma.challenge.findMany({
    where: { deletedAt: null, status: 'active' },
    include: {
      reward: true,
      progressions: userId ? { where: { userId }, take: 1 } : false,
    },
  });
  const byCategory: Record<
    string,
    { completed: number; total: number; pointsEarned: number }
  > = {};
  for (const ch of challenges) {
    const cat = getChallengeCategory(ch);
    if (!byCategory[cat]) {
      byCategory[cat] = { completed: 0, total: 0, pointsEarned: 0 };
    }
    byCategory[cat].total += 1;
    const prog = ch.progressions?.[0];
    const completed = !!prog?.completedAt;
    if (completed) {
      byCategory[cat].completed += 1;
      const pts =
        ch.reward?.rewardType === 'points'
          ? Number(ch.reward?.rewardValue ?? 0)
          : ch.rewardPoints ?? 0;
      byCategory[cat].pointsEarned += pts;
    }
  }
  return Object.entries(byCategory)
    .map(([category, data]) => ({
      category,
      label: CATEGORY_LABELS[category] ?? category,
      completedCount: data.completed,
      totalCount: data.total,
      pointsEarned: data.pointsEarned,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export async function listChallenges(
  userId?: string,
  category?: string
): Promise<Awaited<ReturnType<typeof listChallengesRaw>>[number][]> {
  const list = await listChallengesRaw(userId);
  if (!category || !category.trim()) return list;
  const cat = category.trim().toLowerCase();
  return list.filter((ch) => getChallengeCategory(ch) === cat);
}

function listChallengesRaw(userId?: string) {
  return prisma.challenge.findMany({
    where: { deletedAt: null },
    include: {
      reward: true,
      partner: { select: { id: true, name: true, logoUrl: true } },
      ...(userId
        ? { progressions: { where: { userId }, take: 1 } }
        : { progressions: false }),
    },
    orderBy: { startAt: 'desc' },
  });
}

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


