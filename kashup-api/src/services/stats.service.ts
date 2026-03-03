import prisma from '../config/prisma';
import { safePrismaQuery } from '../utils/timeout';
import logger from '../utils/logger';

export const getImpactStats = async () => {
  const defaultStats = {
    totalTransactions: 0,
    volumeAchat: 0,
    cashbackDistribue: 0,
    pointsDistribues: 0,
    partenairesActifs: 0
  };

  try {
    const [txnAggregate, partnersCount] = await Promise.all([
      safePrismaQuery(
        () => prisma.transaction.aggregate({
          where: {
            status: 'confirmed'
          },
          _sum: { amount: true, cashbackEarned: true, pointsEarned: true },
          _count: { _all: true }
        }),
        { _sum: { amount: 0, cashbackEarned: 0, pointsEarned: 0 }, _count: { _all: 0 } },
        3000,
        'getImpactStats.transactions'
      ),
      safePrismaQuery(
        () => prisma.partner.count(),
        0,
        3000,
        'getImpactStats.partners'
      )
    ]);

    return {
      totalTransactions: txnAggregate._count._all ?? 0,
      volumeAchat: txnAggregate._sum.amount ?? 0,
      cashbackDistribue: txnAggregate._sum.cashbackEarned ?? 0,
      pointsDistribues: txnAggregate._sum.pointsEarned ?? 0,
      partenairesActifs: partnersCount ?? 0
    };
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, '[API] Prisma timeout – default response returned for getImpactStats');
    return defaultStats;
  }
};

export const getAdminDashboardStats = async () => {
  const defaultStats = {
    kpis: {
      revenue: 0,
      cashback: 0,
      partners: 0,
      users: 0
    },
    services: 0,
    recentWebhooks: 0,
    territories: [],
    dailyTransactions: [],
    totalUsers: 0,
    totalTransactions: 0,
    totalVolume: 0,
    totalCashback: 0,
    totalPoints: 0,
    totalDonations: 0
  };

  try {
    const [txnAggregate, usersCount, partnersCount] = await Promise.all([
      safePrismaQuery(
        () => prisma.transaction.aggregate({
          where: {
            status: 'confirmed'
          },
          _sum: { amount: true, cashbackEarned: true, pointsEarned: true },
          _count: { _all: true }
        }),
        { _sum: { amount: 0, cashbackEarned: 0, pointsEarned: 0 }, _count: { _all: 0 } },
        3000,
        'getAdminDashboardStats.transactions'
      ),
      safePrismaQuery(
        () => prisma.user.count(),
        0,
        3000,
        'getAdminDashboardStats.users'
      ),
      safePrismaQuery(
        () => prisma.partner.count(),
        0,
        3000,
        'getAdminDashboardStats.partners'
      )
    ]);

    const revenue = txnAggregate._sum.amount ?? 0;
    const cashback = txnAggregate._sum.cashbackEarned ?? 0;
    const points = txnAggregate._sum.pointsEarned ?? 0;
    const txnCount = txnAggregate._count._all ?? 0;

    return {
      kpis: {
        revenue,
        cashback,
        partners: partnersCount ?? 0,
        users: usersCount ?? 0
      },
      services: 0,
      recentWebhooks: 0,
      territories: [],
      dailyTransactions: [],
      totalUsers: usersCount ?? 0,
      totalTransactions: txnCount,
      totalVolume: revenue,
      totalCashback: cashback,
      totalPoints: points ?? 0,
      totalDonations: 0
    };
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, '[API] Prisma timeout – default response returned for getAdminDashboardStats');
    return defaultStats;
  }
};


