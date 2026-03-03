import prisma from '../config/prisma';
import { PurchaseBoostInput, RewardFormInput } from '../schemas/reward.schema';
import { AppError } from '../utils/errors';
import { notificationBus } from '../events/event-bus';
import { boostPurchaseCounter } from '../metrics/prom';
import { emitRewardWebhook } from './webhook.service';
import { buildListMeta, buildListQuery, ListParams } from '../utils/listing';
import { safePrismaQuery } from '../utils/timeout';
import logger from '../utils/logger';

export const listBoosts = async (params: ListParams) => {
  const defaultResult = {
    data: [],
    meta: buildListMeta(0, params)
  };

  try {
    const now = new Date();
    const baseWhere = {
      active: true,
      startsAt: { lte: now },
      endsAt: { gte: now }
    };
    const { where, orderBy, skip, take } = buildListQuery(baseWhere, params, { softDelete: true });
    
    const [total, boosts] = await Promise.all([
      safePrismaQuery(
        () => prisma.boost.count({ where }),
        0,
        3000,
        'listBoosts.count'
      ),
      safePrismaQuery(
        () => prisma.boost.findMany({
          where,
          include: {
            category: { select: { id: true, name: true } },
            partner: { select: { id: true, name: true, logoUrl: true } }
          },
          orderBy,
          skip,
          take
        }),
        [],
        3000,
        'listBoosts.findMany'
      )
    ]);

    return { data: boosts, meta: buildListMeta(total, params) };
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, '[API] Prisma timeout – default response returned for listBoosts');
    return defaultResult;
  }
};

export const listBadges = async (params: ListParams) => {
  const { where, orderBy, skip, take } = buildListQuery({}, params, { softDelete: true });
  const total = await prisma.badge.count({ where });
  const badges = await prisma.badge.findMany({
    where,
    orderBy: [{ level: 'asc' }, { name: 'asc' }, orderBy],
    skip,
    take
  });
  return { data: badges, meta: buildListMeta(total, params) };
};

export const purchaseBoost = async (userId: string, input: PurchaseBoostInput) => {
  const boost = await prisma.boost.findUnique({
    where: { id: input.boostId },
    include: {
      category: true,
      partner: true
    }
  });

  if (!boost || !boost.active) {
    throw new AppError('Boost introuvable ou inactif', 404);
  }

  const now = new Date();
  if (boost.startsAt > now || boost.endsAt < now) {
    throw new AppError('Ce boost n’est pas disponible actuellement', 400);
  }

  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  if (!wallet) {
    throw new AppError('Wallet introuvable', 404);
  }

  if (wallet.soldePoints < boost.costInPoints) {
    throw new AppError('Points insuffisants pour acheter ce boost', 400);
  }

  const expiresAt = boost.endsAt;

  const result = await prisma.$transaction(async (tx) => {
    const updatedWallet = await tx.wallet.update({
      where: { id: wallet.id },
      data: { soldePoints: { decrement: boost.costInPoints } }
    });

    const userBoost = await tx.userBoost.upsert({
      where: {
        userId_boostId: {
          userId,
          boostId: boost.id
        }
      },
      update: { expiresAt, activatedAt: now },
      create: {
        userId,
        boostId: boost.id,
        expiresAt
      },
      include: {
        boost: {
          select: {
            id: true,
            name: true,
            multiplier: true,
            target: true
          }
        }
      }
    });

    await tx.points.create({
      data: {
        userId,
        delta: -boost.costInPoints,
        reason: `Achat du boost ${boost.name}`
      }
    });

    const result = { updatedWallet, userBoost };

    notificationBus.emitEvent({
      type: 'boost_purchased',
      payload: { userId, boostId: boost.id }
    });
    boostPurchaseCounter.inc();

    return result;
  });

  return {
    wallet: result.updatedWallet,
    boost: result.userBoost.boost
  };
};

// Services admin pour les récompenses

export const listAllRewards = async (params: ListParams, type?: 'boost' | 'badge' | 'lottery' | 'challenge') => {
  const results: any[] = [];

  if (!type || type === 'boost') {
    const { where, orderBy, skip, take } = buildListQuery({}, params, { softDelete: true });
    const boosts = await prisma.boost.findMany({
      where,
      include: {
        category: { select: { id: true, name: true } },
        partner: { select: { id: true, name: true, logoUrl: true } }
      },
      orderBy,
      skip,
      take
    });
    results.push(...boosts.map(b => ({ ...b, type: 'boost' })));
  }

  if (!type || type === 'badge') {
    const { where, orderBy, skip, take } = buildListQuery({}, params, { softDelete: true });
    const badges = await prisma.badge.findMany({
      where,
      orderBy: [{ level: 'asc' }, { name: 'asc' }, orderBy],
      skip,
      take
    });
    results.push(...badges.map(b => ({ ...b, type: 'badge' })));
  }

  if (!type || type === 'lottery') {
    const { where, orderBy, skip, take } = buildListQuery({}, params, { softDelete: true });
    const lotteries = await prisma.lottery.findMany({
      where,
      orderBy,
      skip,
      take
    });
    results.push(...lotteries.map(l => ({ ...l, type: 'lottery' })));
  }

  if (!type || type === 'challenge') {
    const { where, orderBy, skip, take } = buildListQuery({}, params, { softDelete: true });
    const challenges = await prisma.challenge.findMany({
      where,
      orderBy,
      skip,
      take
    });
    results.push(...challenges.map(c => ({ ...c, type: 'challenge' })));
  }

  return { data: results, meta: buildListMeta(results.length, params) };
};

export const createReward = async (input: RewardFormInput, imageUrl?: string) => {
  let reward: any;
  
  switch (input.type) {
    case 'boost':
      reward = await prisma.boost.create({
        data: {
          name: input.title,
          description: input.conditions || '',
          multiplier: (input.boostRate || 0) / 100 + 1,
          target: input.partnerId ? 'partner' : (input.partnerCategoryFilter ? 'category' : 'all'),
          categoryId: input.partnerCategoryFilter || undefined,
          partnerId: input.partnerId || undefined,
          costInPoints: input.pointsRequired || 0,
          startsAt: input.startAt ? new Date(input.startAt) : new Date(),
          endsAt: input.endAt ? new Date(input.endAt) : new Date(),
          active: input.status === 'active'
        }
      });
      await emitRewardWebhook('reward.created', { ...reward, type: 'boost' });
      return reward;

    case 'badge':
      reward = await prisma.badge.create({
        data: {
          name: input.title,
          description: input.conditions || '',
          level: 1,
          unlockCondition: `${input.transactionCount} transactions chez ${input.partnerCategory}`
        }
      });
      await emitRewardWebhook('reward.created', { ...reward, type: 'badge' });
      return reward;

    case 'lottery':
      reward = await prisma.lottery.create({
        data: {
          title: input.title,
          description: input.conditions || '',
          imageUrl: imageUrl || input.imageUrl || undefined,
          startAt: input.startAt ? new Date(input.startAt) : new Date(),
          endAt: input.endAt ? new Date(input.endAt) : new Date(),
          ticketCost: input.pointsRequired || 0,
          status: input.status === 'active' ? 'active' : 'upcoming',
          active: input.status === 'active'
        }
      });
      await emitRewardWebhook('reward.created', { ...reward, type: 'lottery' });
      return reward;

    case 'challenge':
      reward = await prisma.challenge.create({
        data: {
          title: input.title,
          description: input.conditions || '',
          goalType: 'transaction',
          goalValue: input.challengeTransactionCount || 0,
          rewardPoints: input.pointsRequired || 0,
          startAt: input.challengeStartAt ? new Date(input.challengeStartAt) : new Date(),
          endAt: input.challengeEndAt ? new Date(input.challengeEndAt) : new Date(),
          status: input.status === 'active' ? 'active' : 'upcoming'
        }
      });
      await emitRewardWebhook('reward.created', { ...reward, type: 'challenge' });
      return reward;

    default:
      throw new AppError('Type de récompense invalide', 400);
  }
};

export const updateReward = async (id: string, type: string, input: Partial<RewardFormInput>, imageUrl?: string) => {
  let reward: any;
  let oldStatus: string | undefined;
  
  switch (type) {
    case 'boost':
      const boost = await prisma.boost.findUnique({ where: { id } });
      if (!boost) throw new AppError('Boost introuvable', 404);
      oldStatus = boost.active ? 'active' : 'draft';
      
      reward = await prisma.boost.update({
        where: { id },
        data: {
          name: input.title,
          description: input.conditions,
          multiplier: input.boostRate !== undefined ? (input.boostRate / 100 + 1) : undefined,
          target: input.partnerId ? 'partner' : (input.partnerCategoryFilter ? 'category' : 'all'),
          categoryId: input.partnerCategoryFilter || undefined,
          partnerId: input.partnerId || undefined,
          costInPoints: input.pointsRequired,
          startsAt: input.startAt ? new Date(input.startAt) : undefined,
          endsAt: input.endAt ? new Date(input.endAt) : undefined,
          active: input.status === 'active'
        }
      });
      await emitRewardWebhook('reward.updated', { ...reward, type: 'boost' });
      if (input.status && oldStatus !== input.status) {
        await emitRewardWebhook('reward.status.changed', { ...reward, type: 'boost' });
      }
      return reward;

    case 'badge':
      const badge = await prisma.badge.findUnique({ where: { id } });
      if (!badge) throw new AppError('Badge introuvable', 404);
      
      reward = await prisma.badge.update({
        where: { id },
        data: {
          name: input.title,
          description: input.conditions,
          unlockCondition: input.transactionCount && input.partnerCategory 
            ? `${input.transactionCount} transactions chez ${input.partnerCategory}`
            : undefined
        }
      });
      await emitRewardWebhook('reward.updated', { ...reward, type: 'badge' });
      return reward;

    case 'lottery':
      const lottery = await prisma.lottery.findUnique({ where: { id } });
      if (!lottery) throw new AppError('Loterie introuvable', 404);
      oldStatus = lottery.active ? 'active' : 'draft';
      
      reward = await prisma.lottery.update({
        where: { id },
        data: {
          title: input.title,
          description: input.conditions,
          imageUrl: imageUrl || input.imageUrl,
          startAt: input.startAt ? new Date(input.startAt) : undefined,
          endAt: input.endAt ? new Date(input.endAt) : undefined,
          ticketCost: input.pointsRequired,
          status: input.status === 'active' ? 'active' : 'upcoming',
          active: input.status === 'active'
        }
      });
      await emitRewardWebhook('reward.updated', { ...reward, type: 'lottery' });
      if (input.status && oldStatus !== input.status) {
        await emitRewardWebhook('reward.status.changed', { ...reward, type: 'lottery' });
      }
      return reward;

    case 'challenge':
      const challenge = await prisma.challenge.findUnique({ where: { id } });
      if (!challenge) throw new AppError('Défi introuvable', 404);
      oldStatus = challenge.status;
      
      reward = await prisma.challenge.update({
        where: { id },
        data: {
          title: input.title,
          description: input.conditions,
          goalValue: input.challengeTransactionCount,
          rewardPoints: input.pointsRequired,
          startAt: input.challengeStartAt ? new Date(input.challengeStartAt) : undefined,
          endAt: input.challengeEndAt ? new Date(input.challengeEndAt) : undefined,
          status: input.status === 'active' ? 'active' : 'upcoming'
        }
      });

    default:
      throw new AppError('Type de récompense invalide', 400);
  }
};


