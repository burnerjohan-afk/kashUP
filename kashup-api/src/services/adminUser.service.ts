import prisma from '../config/prisma';
import { AppError } from '../utils/errors';

export interface AdminUserFilters {
  search?: string;
  status?: string;
  territory?: string;
  page?: number;
  pageSize?: number;
}

export const listAdminUsers = async (filters: AdminUserFilters) => {
  const page = filters.page || 1;
  const pageSize = filters.pageSize || 20;
  const skip = (page - 1) * pageSize;

  const where: any = {};

  if (filters.search) {
    where.OR = [
      { email: { contains: filters.search } },
      { firstName: { contains: filters.search } },
      { lastName: { contains: filters.search } }
    ];
  }

  if (filters.status) {
    where.role = filters.status; // À adapter selon votre modèle
  }

  if (filters.territory) {
    where.territory = filters.territory;
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        territory: true,
        createdAt: true,
        wallet: {
          select: {
            soldeCashback: true,
            soldePoints: true
          }
        }
      },
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' }
    }),
    prisma.user.count({ where })
  ]);

  return {
    items: users,
    page,
    pageSize,
    total
  };
};

export const getAdminUserById = async (id: string) => {
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      wallet: true,
      transactions: {
        take: 10,
        orderBy: { transactionDate: 'desc' },
        include: {
          partner: { select: { id: true, name: true, logoUrl: true } }
        }
      }
    }
  });

  if (!user) {
    throw new AppError('Utilisateur introuvable', 404);
  }

  return user;
};

export const getUserTransactions = async (userId: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AppError('Utilisateur introuvable', 404);
  }

  return prisma.transaction.findMany({
    where: { userId },
    include: {
      partner: { select: { id: true, name: true, logoUrl: true } }
    },
    orderBy: { transactionDate: 'desc' }
  });
};

export const getUserRewardsHistory = async (userId: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AppError('Utilisateur introuvable', 404);
  }

  return prisma.rewardHistory.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' }
  });
};

export const getUserGiftCards = async (userId: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AppError('Utilisateur introuvable', 404);
  }

  return prisma.giftCardPurchase.findMany({
    where: { purchaserId: userId },
    include: {
      giftCard: {
        select: { id: true, name: true, type: true, value: true, partnerId: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
};

export const getUserStatistics = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { wallet: true }
  });

  if (!user) {
    throw new AppError('Utilisateur introuvable', 404);
  }

  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);

  // Transactions ce mois-ci
  const thisMonthStats = await prisma.transaction.aggregate({
    where: {
      userId,
      transactionDate: { gte: thisMonth }
    },
    _count: { _all: true },
    _avg: { amount: true },
    _sum: { amount: true, cashbackEarned: true }
  });

  // Transactions le mois dernier
  const lastMonthStats = await prisma.transaction.aggregate({
    where: {
      userId,
      transactionDate: { gte: lastMonth, lt: thisMonth }
    },
    _count: { _all: true },
    _avg: { amount: true }
  });

  // Transactions il y a deux mois
  const twoMonthsAgoStats = await prisma.transaction.aggregate({
    where: {
      userId,
      transactionDate: { gte: twoMonthsAgo, lt: lastMonth }
    },
    _count: { _all: true },
    _avg: { amount: true }
  });

  const thisMonthCount = thisMonthStats._count._all ?? 0;
  const lastMonthCount = lastMonthStats._count._all ?? 0;
  const twoMonthsAgoCount = twoMonthsAgoStats._count._all ?? 0;

  let transactionGrowth = 0;
  if (lastMonthCount > 0 && twoMonthsAgoCount > 0) {
    transactionGrowth = ((lastMonthCount - twoMonthsAgoCount) / twoMonthsAgoCount) * 100;
  }

  const thisMonthAvg = thisMonthStats._avg.amount ?? 0;
  const lastMonthAvg = lastMonthStats._avg.amount ?? 0;
  let averageBasketGrowth = 0;
  if (lastMonthAvg > 0 && twoMonthsAgoStats._avg.amount && twoMonthsAgoStats._avg.amount > 0) {
    const twoMonthsAgoAvg = twoMonthsAgoStats._avg.amount;
    averageBasketGrowth = ((lastMonthAvg - twoMonthsAgoAvg) / twoMonthsAgoAvg) * 100;
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName
    },
    wallet: user.wallet,
    thisMonth: {
      transactionCount: thisMonthCount,
      totalAmount: thisMonthStats._sum.amount ?? 0,
      averageBasket: thisMonthAvg,
      totalCashback: thisMonthStats._sum.cashbackEarned ?? 0
    },
    growth: {
      transactionGrowth: Number(transactionGrowth.toFixed(2)),
      averageBasketGrowth: Number(averageBasketGrowth.toFixed(2))
    }
  };
};

export const resetUserPassword = async (userId: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AppError('Utilisateur introuvable', 404);
  }

  // TODO: Implémenter la logique de réinitialisation de mot de passe
  // Générer un token temporaire, envoyer un email, etc.
  
  return { message: 'Réinitialisation de mot de passe initiée' };
};

export const forceUserKYC = async (userId: string, kycLevel: 'none' | 'basic' | 'advanced') => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AppError('Utilisateur introuvable', 404);
  }

  // TODO: Ajouter le champ kycLevel au modèle User si nécessaire
  // return prisma.user.update({
  //   where: { id: userId },
  //   data: { kycLevel }
  // });

  return { message: 'KYC forcé', kycLevel };
};

