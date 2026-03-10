import prisma from '../config/prisma';
import { PurchaseBoostInput, RewardFormInput } from '../schemas/reward.schema';
import { AppError } from '../utils/errors';
import { notificationBus } from '../events/event-bus';
import { boostPurchaseCounter } from '../metrics/prom';
import { emitRewardWebhook } from './webhook.service';
import { buildListMeta, buildListQuery, ListParams } from '../utils/listing';
import { safePrismaQuery } from '../utils/timeout';
import logger from '../utils/logger';

/** Résout partnerCategoryFilter (nom ou id) en categoryId (id PartnerCategory) pour Boost. */
async function resolveBoostCategoryId(partnerCategoryFilter: string | undefined): Promise<string | undefined> {
  if (!partnerCategoryFilter || !partnerCategoryFilter.trim()) return undefined;
  const value = partnerCategoryFilter.trim();
  if (value.length >= 20 && /^[a-z0-9]+$/i.test(value)) {
    const exists = await prisma.partnerCategory.findUnique({ where: { id: value }, select: { id: true } });
    return exists?.id ?? undefined;
  }
  const byName = await prisma.partnerCategory.findUnique({ where: { name: value }, select: { id: true } });
  return byName?.id ?? undefined;
}

export const listBoosts = async (params: ListParams) => {
  const defaultResult = {
    data: [],
    meta: buildListMeta(0, params)
  };

  try {
    const now = new Date();
    // Inclure les boosts actifs dont la période n'est pas encore terminée (y compris ceux qui n'ont pas encore commencé)
    const baseWhere = {
      active: true,
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
    results.push(...boosts.map(b => ({
      ...b,
      type: 'boost',
      title: b.name,
      status: b.active ? 'active' : 'draft',
      startAt: b.startsAt,
      endAt: b.endsAt,
      conditions: b.description,
      pointsRequired: b.costInPoints,
      boostRate: b.multiplier != null ? Math.round((b.multiplier - 1) * 100) : undefined,
      stock: 100,
    })));
  }

  if (!type || type === 'badge') {
    const { where, orderBy, skip, take } = buildListQuery({}, params, { softDelete: true });
    const badges = await prisma.badge.findMany({
      where,
      orderBy: [{ level: 'asc' }, { name: 'asc' }, orderBy],
      skip,
      take
    });
    const unlockRegex = /^(\d+)\s*transactions?\s+chez\s+(.+)$/i;
    results.push(...badges.map(b => {
      const match = b.unlockCondition.match(unlockRegex);
      return {
        ...b,
        type: 'badge',
        title: b.name,
        status: 'active' as const,
        conditions: b.description,
        transactionCount: match ? parseInt(match[1], 10) : undefined,
        partnerCategory: match ? match[2].trim() : undefined,
      };
    }));
  }

  if (!type || type === 'lottery') {
    const { where, orderBy, skip, take } = buildListQuery({}, params, { softDelete: true });
    const lotteries = await prisma.lottery.findMany({
      where,
      orderBy,
      skip,
      take
    });
    results.push(...lotteries.map(l => ({
      ...l,
      type: 'lottery',
      status: l.status === 'active' ? 'active' : l.status === 'closed' ? 'archived' : 'draft',
      pointsRequired: l.pointsPerTicket ?? l.ticketCost ?? 100,
      conditions: l.description ?? undefined,
      startAt: l.startAt,
      endAt: l.endAt,
      drawDate: l.drawDate,
      partnerIds: l.partnerId ? [l.partnerId] : [],
    })));
  }

  if (!type || type === 'challenge') {
    const { where, orderBy, skip, take } = buildListQuery({}, params, { softDelete: true });
    const challenges = await prisma.challenge.findMany({
      where,
      orderBy,
      skip,
      take
    });
    results.push(...challenges.map(c => ({
      ...c,
      type: 'challenge',
      title: c.title,
      status: c.status,
      conditions: c.description,
      challengeStartAt: c.startAt,
      challengeEndAt: c.endAt,
      challengeTransactionCount: c.goalValue,
      rewardPoints: c.rewardPoints,
      stock: 100,
    })));
  }

  return { data: results, meta: buildListMeta(results.length, params) };
};

export const createReward = async (input: RewardFormInput, imageUrl?: string) => {
  let reward: any;
  
  switch (input.type) {
    case 'boost': {
      const boostCategoryId = await resolveBoostCategoryId(input.partnerCategoryFilter);
      const boostStartsAt = input.startAt ? new Date(input.startAt) : new Date();
      const boostEndsAt = input.endAt
        ? new Date(input.endAt)
        : (() => {
            const end = new Date(boostStartsAt);
            end.setMonth(end.getMonth() + 1);
            return end;
          })();
      reward = await prisma.boost.create({
        data: {
          name: input.title,
          description: input.conditions || '',
          multiplier: (input.boostRate || 0) / 100 + 1,
          target: input.partnerId ? 'partner' : (boostCategoryId ? 'category' : 'all'),
          categoryId: boostCategoryId ?? undefined,
          partnerId: input.partnerId || undefined,
          costInPoints: input.pointsRequired || 0,
          startsAt: boostStartsAt,
          endsAt: boostEndsAt,
          active: input.status === 'active'
        }
      });
      await emitRewardWebhook('reward.created', { ...reward, type: 'boost' });
      return reward;
    }

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

    case 'lottery': {
      const startAt = input.startAt ? new Date(input.startAt) : new Date();
      const endAt = input.endAt ? new Date(input.endAt) : new Date();
      const partnerId = input.partnerId || (Array.isArray(input.partnerIds) && input.partnerIds.length > 0 ? input.partnerIds[0] : undefined);
      reward = await prisma.lottery.create({
        data: {
          title: input.title,
          description: input.conditions ?? '',
          shortDescription: (input.shortDescription != null && String(input.shortDescription).trim() !== '') ? String(input.shortDescription).trim() : undefined,
          imageUrl: (imageUrl != null && imageUrl !== '') ? imageUrl : (input.imageUrl || undefined),
          startAt,
          endAt,
          startDate: startAt,
          endDate: endAt,
          drawDate: input.drawDate ? new Date(input.drawDate) : endAt,
          ticketCost: input.pointsRequired ?? 100,
          pointsPerTicket: input.pointsRequired ?? 100,
          isTicketStockLimited: input.isTicketStockLimited ?? (input.totalTicketsAvailable != null && input.totalTicketsAvailable > 0),
          totalTicketsAvailable: input.totalTicketsAvailable ?? undefined,
          maxTicketsPerUser: input.maxTicketsPerUser ?? undefined,
          showOnHome: input.showOnHome ?? true,
          showOnRewards: input.showOnRewards ?? true,
          prizeType: (input.prizeType != null && String(input.prizeType).trim() !== '') ? String(input.prizeType).trim() : undefined,
          prizeTitle: (input.prizeTitle != null && String(input.prizeTitle).trim() !== '') ? String(input.prizeTitle).trim() : undefined,
          prizeDescription: (input.prizeDescription != null && String(input.prizeDescription).trim() !== '') ? String(input.prizeDescription).trim() : undefined,
          prizeValue: input.prizeValue ?? undefined,
          prizeCurrency: (input.prizeCurrency != null && String(input.prizeCurrency).trim() !== '') ? String(input.prizeCurrency).trim() : undefined,
          partnerId: partnerId || undefined,
          status: input.status === 'active' ? 'active' : 'upcoming',
          active: input.status === 'active'
        }
      });
      await emitRewardWebhook('reward.created', { ...reward, type: 'lottery' });
      return reward;
    }

    case 'challenge':
      reward = await prisma.challenge.create({
        data: {
          title: input.title,
          description: input.conditions || '',
          category: input.category && input.category.trim() ? input.category.trim() : undefined,
          goalType: 'transaction',
          goalValue: input.challengeTransactionCount || 0,
          rewardPoints: input.challengeRewardPoints ?? 0,
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
    case 'boost': {
      const boost = await prisma.boost.findUnique({ where: { id } });
      if (!boost) throw new AppError('Boost introuvable', 404);
      oldStatus = boost.active ? 'active' : 'draft';
      const boostCategoryIdUpdate = await resolveBoostCategoryId(input.partnerCategoryFilter);
      const boostPartnerId = input.partnerId != null && String(input.partnerId).trim() !== '' && String(input.partnerId).trim() !== 'undefined' && String(input.partnerId).trim() !== 'null'
        ? String(input.partnerId).trim()
        : undefined;
      reward = await prisma.boost.update({
        where: { id },
        data: {
          name: input.title,
          description: input.conditions,
          multiplier: input.boostRate !== undefined ? (input.boostRate / 100 + 1) : undefined,
          target: boostPartnerId ? 'partner' : (boostCategoryIdUpdate ? 'category' : 'all'),
          categoryId: boostCategoryIdUpdate ?? undefined,
          partnerId: boostPartnerId ?? undefined,
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
    }

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

    case 'lottery': {
      const lottery = await prisma.lottery.findUnique({ where: { id } });
      if (!lottery) throw new AppError('Loterie introuvable', 404);
      oldStatus = lottery.active ? 'active' : 'draft';
      const resolvedImageUrl = (imageUrl != null && imageUrl !== '')
        ? imageUrl
        : (input.imageUrl ?? lottery.imageUrl ?? undefined);
      let partnerIdVal: string | null | undefined = input.partnerId ?? (Array.isArray(input.partnerIds) && input.partnerIds.length > 0 ? input.partnerIds[0] : undefined);
      if (typeof partnerIdVal === 'string' && partnerIdVal.includes(',')) {
        partnerIdVal = partnerIdVal.split(',')[0].trim();
      }
      if (partnerIdVal != null && (typeof partnerIdVal !== 'string' || (partnerIdVal = partnerIdVal.trim()) === '' || partnerIdVal === 'undefined' || partnerIdVal === 'null')) {
        partnerIdVal = undefined;
      }
      let resolvedPartnerId: string | null =
        (input.partnerIds && input.partnerIds.length === 0) ? null
        : (partnerIdVal && typeof partnerIdVal === 'string') ? partnerIdVal
        : lottery.partnerId;
      if (resolvedPartnerId != null && resolvedPartnerId !== '') {
        const partnerExists = await prisma.partner.findUnique({ where: { id: resolvedPartnerId }, select: { id: true } });
        if (!partnerExists) {
          throw new AppError(`Le partenaire "${resolvedPartnerId}" n'existe pas. Choisissez un partenaire valide ou videz la sélection.`, 400);
        }
      }

      const updateData: Record<string, unknown> = {
        title: input.title !== undefined ? input.title : lottery.title,
        description: input.conditions !== undefined ? input.conditions : lottery.description,
        shortDescription: input.shortDescription !== undefined ? (input.shortDescription != null && String(input.shortDescription).trim() !== '' ? String(input.shortDescription).trim() : null) : lottery.shortDescription,
        imageUrl: resolvedImageUrl,
        startAt: input.startAt ? new Date(input.startAt) : lottery.startAt,
        endAt: input.endAt ? new Date(input.endAt) : lottery.endAt,
        startDate: input.startAt ? new Date(input.startAt) : lottery.startDate,
        endDate: input.endAt ? new Date(input.endAt) : lottery.endDate,
        drawDate: input.drawDate ? new Date(input.drawDate) : lottery.drawDate,
        ticketCost: input.pointsRequired !== undefined ? input.pointsRequired : lottery.pointsPerTicket,
        pointsPerTicket: input.pointsRequired !== undefined ? input.pointsRequired : lottery.pointsPerTicket,
        isTicketStockLimited: input.isTicketStockLimited !== undefined ? input.isTicketStockLimited : (input.totalTicketsAvailable != null && input.totalTicketsAvailable > 0),
        totalTicketsAvailable: input.hasOwnProperty('totalTicketsAvailable') ? (input.totalTicketsAvailable ?? null) : lottery.totalTicketsAvailable,
        maxTicketsPerUser: input.hasOwnProperty('maxTicketsPerUser') ? (input.maxTicketsPerUser ?? null) : lottery.maxTicketsPerUser,
        showOnHome: input.showOnHome !== undefined ? input.showOnHome : lottery.showOnHome,
        showOnRewards: input.showOnRewards !== undefined ? input.showOnRewards : lottery.showOnRewards,
        prizeType: input.prizeType !== undefined ? (input.prizeType != null && String(input.prizeType).trim() !== '' ? String(input.prizeType).trim() : null) : lottery.prizeType,
        prizeTitle: input.prizeTitle !== undefined ? (input.prizeTitle != null && String(input.prizeTitle).trim() !== '' ? String(input.prizeTitle).trim() : null) : lottery.prizeTitle,
        prizeDescription: input.prizeDescription !== undefined ? (input.prizeDescription != null && String(input.prizeDescription).trim() !== '' ? String(input.prizeDescription).trim() : null) : lottery.prizeDescription,
        prizeValue: input.prizeValue !== undefined ? input.prizeValue : lottery.prizeValue,
        prizeCurrency: input.prizeCurrency !== undefined ? (input.prizeCurrency != null && String(input.prizeCurrency).trim() !== '' ? String(input.prizeCurrency).trim() : null) : lottery.prizeCurrency,
        partnerId: resolvedPartnerId,
        status: input.status !== undefined ? (input.status === 'active' ? 'active' : 'upcoming') : lottery.status,
        active: input.status !== undefined ? (input.status === 'active') : lottery.active
      };
      Object.keys(updateData).forEach((k) => {
        if ((updateData as any)[k] === undefined) delete (updateData as any)[k];
      });

      reward = await prisma.lottery.update({
        where: { id },
        data: updateData as Parameters<typeof prisma.lottery.update>[0]['data']
      });
      await emitRewardWebhook('reward.updated', { ...reward, type: 'lottery' });
      if (input.status && oldStatus !== input.status) {
        await emitRewardWebhook('reward.status.changed', { ...reward, type: 'lottery' });
      }
      return reward;
    }

    case 'challenge': {
      const challenge = await prisma.challenge.findUnique({ where: { id } });
      if (!challenge) throw new AppError('Défi introuvable', 404);
      oldStatus = challenge.status;

      const updateData: Record<string, unknown> = {
        title: input.title,
        description: input.conditions,
        goalValue: input.challengeTransactionCount,
        rewardPoints: input.challengeRewardPoints !== undefined ? input.challengeRewardPoints : undefined,
        startAt: input.challengeStartAt ? new Date(input.challengeStartAt) : undefined,
        endAt: input.challengeEndAt ? new Date(input.challengeEndAt) : undefined,
        status: input.status === 'active' ? 'active' : 'upcoming'
      };
      if (input.category !== undefined) {
        updateData.category = input.category && input.category.trim() ? input.category.trim() : null;
      }

      reward = await prisma.challenge.update({
        where: { id },
        data: updateData as Parameters<typeof prisma.challenge.update>[0]['data']
      });
      await emitRewardWebhook('reward.updated', { ...reward, type: 'challenge' });
      if (input.status && oldStatus !== input.status) {
        await emitRewardWebhook('reward.status.changed', { ...reward, type: 'challenge' });
      }
      return reward;
    }

    default:
      throw new AppError('Type de récompense invalide', 400);
  }
};

/** Suppression (soft delete) d'une récompense. Pour les loteries : met à jour deletedAt. */
export const deleteReward = async (id: string, type: string) => {
  switch (type) {
    case 'lottery': {
      const lottery = await prisma.lottery.findUnique({ where: { id } });
      if (!lottery) throw new AppError('Loterie introuvable', 404);
      if (lottery.deletedAt) throw new AppError('Loterie déjà supprimée', 400);
      await prisma.lottery.update({
        where: { id },
        data: { deletedAt: new Date(), active: false, status: 'closed' }
      });
      return { deleted: true, id, type: 'lottery' };
    }
    case 'boost': {
      const boost = await prisma.boost.findUnique({ where: { id } });
      if (!boost) throw new AppError('Boost introuvable', 404);
      await prisma.boost.update({ where: { id }, data: { active: false } });
      return { deleted: true, id, type: 'boost' };
    }
    case 'badge':
    case 'challenge':
      throw new AppError(`Suppression non implémentée pour le type ${type}`, 400);
    default:
      throw new AppError('Type de récompense invalide', 400);
  }
};


