import { randomAlphanumeric } from '../utils/randomId';
import prisma from '../config/prisma';
import { AppError } from '../utils/errors';
import { safePrismaQuery } from '../utils/timeout';
import logger from '../utils/logger';

export const getCurrentUser = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      partnerId: true,
      createdAt: true,
      wallet: true
    }
  });

  if (!user) {
    throw new AppError('Utilisateur introuvable', 404);
  }

  return user;
};

export const getWallet = async (userId: string) => {
  const defaultWallet = { soldeCashback: 0, soldePoints: 0, soldeCoffreFort: 0 };
  const wallet = await safePrismaQuery(
    () => prisma.wallet.findUnique({ where: { userId } }),
    null,
    3000,
    'getWallet'
  );
  if (!wallet) {
    logger.warn({ userId }, '[API] Wallet fallback response used');
    return defaultWallet;
  }
  return wallet;
};

const monthKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const ensureWalletSnapshot = async (userId: string) => {
  const month = monthKey();
  const defaultSnapshot = {
    id: 'default',
    userId,
    month,
    objectiveAmount: 0,
    injectedAmount: 0,
    createdAt: new Date()
  };

  const snapshot = await safePrismaQuery(
    () => prisma.walletMonthlySnapshot.upsert({
      where: {
        userId_month: {
          userId,
          month
        }
      },
      update: {},
      create: {
        userId,
        month
      }
    }),
    defaultSnapshot,
    3000,
    'ensureWalletSnapshot'
  );

  return snapshot;
};

export const getWalletHistory = async (userId: string) => {
  const transactions = await safePrismaQuery(
    () => prisma.transaction.findMany({
      where: { userId },
      include: { partner: { select: { id: true, name: true, logoUrl: true } } },
      orderBy: { transactionDate: 'desc' },
      take: 100
    }),
    [],
    3000,
    'getWalletHistory'
  );

  if (transactions.length === 0) {
    logger.warn({ userId }, '[API] Wallet history fallback response used');
  }

  return transactions.map((tx) => ({
    id: tx.id,
    partner: tx.partner,
    amount: tx.amount,
    cashbackEarned: tx.cashbackEarned,
    pointsEarned: tx.pointsEarned,
    source: tx.source,
    status: tx.status,
    transactionDate: tx.transactionDate
  }));
};

export const getWalletMonthlyObjective = async (userId: string) => {
  try {
    const snapshot = await ensureWalletSnapshot(userId);
    return {
      month: snapshot.month,
      objectiveAmount: snapshot.objectiveAmount ?? 0,
      updatedAt: snapshot.createdAt
    };
  } catch (error) {
    logger.error({ userId, error: error instanceof Error ? error.message : String(error) }, '[API] Prisma timeout – default response returned for getWalletMonthlyObjective');
    return {
      month: monthKey(),
      objectiveAmount: 0,
      updatedAt: new Date()
    };
  }
};

export const getWalletMonthlyInjected = async (userId: string) => {
  try {
    const snapshot = await ensureWalletSnapshot(userId);
    return {
      month: snapshot.month,
      injectedAmount: snapshot.injectedAmount ?? 0,
      updatedAt: snapshot.createdAt
    };
  } catch (error) {
    logger.error({ userId, error: error instanceof Error ? error.message : String(error) }, '[API] Prisma timeout – default response returned for getWalletMonthlyInjected');
    return {
      month: monthKey(),
      injectedAmount: 0,
      updatedAt: new Date()
    };
  }
};

const ensureReferral = async (userId: string) => {
  const defaultReferral = {
    id: 'default',
    userId,
    code: `KUP-${randomAlphanumeric(8).toUpperCase()}`,
    rewardPoints: 0,
    createdAt: new Date()
  };

  const referral = await safePrismaQuery(
    () => prisma.referral.upsert({
      where: { userId },
      update: {},
      create: {
        userId,
        code: `KUP-${randomAlphanumeric(8).toUpperCase()}`
      }
    }),
    defaultReferral,
    3000,
    'ensureReferral'
  );

  return referral;
};

export const getReferralsSummary = async (userId: string) => {
  const defaultSummary = {
    code: '',
    rewardPoints: 0,
    pendingInvites: 0,
    completedInvites: 0
  };

  try {
    const referral = await ensureReferral(userId);
    const [pendingInvites, completedInvites] = await Promise.all([
      safePrismaQuery(
        () => prisma.referralInvite.count({
          where: { referralId: referral.id, status: 'pending' }
        }),
        0,
        3000,
        'getReferralsSummary.pending'
      ),
      safePrismaQuery(
        () => prisma.referralInvite.count({
          where: { referralId: referral.id, status: 'completed' }
        }),
        0,
        3000,
        'getReferralsSummary.completed'
      )
    ]);

    return {
      code: referral.code,
      rewardPoints: referral.rewardPoints ?? 0,
      pendingInvites,
      completedInvites
    };
  } catch (error) {
    logger.error({ userId, error: error instanceof Error ? error.message : String(error) }, '[API] Prisma timeout – default response returned for getReferralsSummary');
    return defaultSummary;
  }
};

export const getReferralsInvitees = async (userId: string) => {
  try {
    const referral = await ensureReferral(userId);
    const invitees = await safePrismaQuery(
      () => prisma.referralInvite.findMany({
        where: { referralId: referral.id },
        orderBy: { createdAt: 'desc' }
      }),
      [],
      3000,
      'getReferralsInvitees'
    );
    return invitees;
  } catch (error) {
    logger.error({ userId, error: error instanceof Error ? error.message : String(error) }, '[API] Prisma timeout – default response returned for getReferralsInvitees');
    return [];
  }
};

export const getMyTransactions = async (userId: string) => {
  const transactions = await safePrismaQuery(
    () => prisma.transaction.findMany({
      where: { userId },
      include: {
        partner: { select: { id: true, name: true, logoUrl: true } }
      },
      orderBy: { transactionDate: 'desc' }
    }),
    [],
    3000,
    'getMyTransactions'
  );

  if (transactions.length === 0) {
    logger.warn({ userId }, '[API] Transactions fallback response used');
  }

  return transactions;
};

export const getRewardsSummary = async (userId: string) => {
  const defaultRewards = {
    points: 0,
    walletBalance: 0,
    partners: [],
    boostedPartners: [],
    rewards: []
  };

  try {
    const [wallet, boosts, badges] = await Promise.all([
      getWallet(userId),
      safePrismaQuery(
        () => prisma.userBoost.findMany({
          where: { userId, expiresAt: { gte: new Date() } },
          include: { boost: true }
        }),
        [],
        3000,
        'getRewardsSummary.boosts'
      ),
      safePrismaQuery(
        () => prisma.userBadge.findMany({
          where: { userId },
          include: { badge: true }
        }),
        [],
        3000,
        'getRewardsSummary.badges'
      )
    ]);

    return {
      points: wallet?.soldePoints ?? 0,
      walletBalance: wallet?.soldeCashback ?? 0,
      partners: [],
      boostedPartners: [],
      rewards: boosts.map((userBoost) => ({
        id: userBoost.boost.id,
        name: userBoost.boost.name,
        multiplier: userBoost.boost.multiplier,
        expiresAt: userBoost.expiresAt
      }))
    };
  } catch (error) {
    logger.error({ userId, error: error instanceof Error ? error.message : String(error) }, '[API] Prisma timeout – default response returned for getRewardsSummary');
    return defaultRewards;
  }
};

export const getMyBadges = async (userId: string) => {
  return prisma.userBadge.findMany({
    where: { userId },
    include: { badge: true }
  });
};

export const getMyGiftCards = async (userId: string) => {
  return prisma.giftCardPurchase.findMany({
    where: { purchaserId: userId },
    include: {
      giftCard: {
        select: {
          id: true,
          name: true,
          type: true,
          value: true,
          partnerId: true,
          partner: {
            select: {
              id: true,
              name: true,
              logoUrl: true,
              territories: true,
              latitude: true,
              longitude: true,
              phone: true,
              websiteUrl: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
};

/**
 * Export des données personnelles (RGPD Art. 20 - Portabilité)
 * Format JSON structuré et machine-readable
 */
export const exportMyData = async (userId: string) => {
  // Récupérer les données séparément pour éviter les problèmes de typage Prisma
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      territory: true,
      role: true,
      createdAt: true,
      updatedAt: true
    }
  });

  if (!user) {
    throw new AppError('Utilisateur introuvable', 404);
  }

  // Récupérer les relations séparément
  const [wallet, transactions, powensConnections, notifications, pointsHistory, boosts, badges, giftCardPurchases, consent] = await Promise.all([
    prisma.wallet.findUnique({ where: { userId } }),
    prisma.transaction.findMany({
      where: { userId },
      include: {
        partner: {
          select: {
            id: true,
            name: true,
            logoUrl: true
          }
        }
      },
      orderBy: { transactionDate: 'desc' }
    }),
    prisma.powensConnection.findMany({
      where: { userId },
      include: {
        bankAccounts: {
          select: {
            id: true,
            label: true,
            balance: true,
            currency: true,
            type: true,
            createdAt: true
            // IBAN non inclus pour sécurité
          }
        }
      }
    }),
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100
    }),
    prisma.points.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100
    }),
    prisma.userBoost.findMany({
      where: { userId },
      include: {
        boost: {
          select: {
            id: true,
            name: true,
            multiplier: true
          }
        }
      }
    }),
    prisma.userBadge.findMany({
      where: { userId },
      include: {
        badge: {
          select: {
            id: true,
            name: true,
            description: true,
            level: true
          }
        }
      }
    }),
    prisma.giftCardPurchase.findMany({
      where: { purchaserId: userId },
      include: {
        giftCard: {
          select: {
            id: true,
            name: true,
            type: true,
            value: true
          }
        }
      }
    }),
    prisma.userConsent.findUnique({ where: { userId } })
  ]);

  // Format conforme RGPD Art. 20 (portabilité)
  return {
    exportDate: new Date().toISOString(),
    userId: user.id,
    profile: {
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      territory: user.territory,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    },
    wallet: wallet ? {
      soldeCashback: wallet.soldeCashback,
      soldePoints: wallet.soldePoints,
      soldeCoffreFort: wallet.soldeCoffreFort,
      createdAt: wallet.createdAt,
      updatedAt: wallet.updatedAt
    } : null,
    transactions: transactions.map((tx: (typeof transactions)[0]) => ({
      id: tx.id,
      partner: tx.partner,
      amount: tx.amount,
      cashbackEarned: tx.cashbackEarned,
      pointsEarned: tx.pointsEarned,
      source: tx.source,
      status: tx.status,
      transactionDate: tx.transactionDate
    })),
    bankConnections: powensConnections.map((conn: (typeof powensConnections)[0]) => ({
      id: conn.id,
      status: conn.status,
      lastSyncAt: conn.lastSyncAt,
      createdAt: conn.createdAt,
      bankAccounts: conn.bankAccounts
    })),
    notifications: notifications.map((notif: (typeof notifications)[0]) => ({
      id: notif.id,
      title: notif.title,
      body: notif.body,
      category: notif.category,
      readAt: notif.readAt,
      createdAt: notif.createdAt
    })),
    pointsHistory: pointsHistory.map((point: (typeof pointsHistory)[0]) => ({
      id: point.id,
      delta: point.delta,
      reason: point.reason,
      createdAt: point.createdAt
    })),
    boosts: boosts.map((ub: (typeof boosts)[0]) => ({
      boost: ub.boost,
      activatedAt: ub.activatedAt,
      expiresAt: ub.expiresAt
    })),
    badges: badges.map((ub: (typeof badges)[0]) => ({
      badge: ub.badge,
      obtainedAt: ub.obtainedAt
    })),
    giftCards: giftCardPurchases.map((gcp: (typeof giftCardPurchases)[0]) => ({
      id: gcp.id,
      giftCard: gcp.giftCard,
      beneficiaryEmail: gcp.beneficiaryEmail,
      amount: gcp.amount,
      status: gcp.status,
      expiresAt: gcp.expiresAt,
      createdAt: gcp.createdAt
    })),
    consent: consent ? {
      privacyPolicy: consent.privacyPolicy,
      privacyPolicyAt: consent.privacyPolicyAt,
      privacyPolicyVersion: consent.privacyPolicyVersion,
      marketing: consent.marketing,
      marketingAt: consent.marketingAt,
      analytics: consent.analytics,
      analyticsAt: consent.analyticsAt
    } : null
  };
};

/**
 * Suppression/anonymisation du compte (RGPD Art. 17 - Droit à l'effacement)
 * Anonymise au lieu de supprimer pour préserver l'intégrité référentielle
 */
export const deleteMyAccount = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      wallet: true
    }
  });

  if (!user) {
    throw new AppError('Utilisateur introuvable', 404);
  }

  // Vérifier qu'il n'y a pas de solde actif
  if (user.wallet) {
    const hasBalance = 
      user.wallet.soldeCashback > 0 ||
      user.wallet.soldePoints > 0 ||
      user.wallet.soldeCoffreFort > 0;

    if (hasBalance) {
      throw new AppError(
        'Impossible de supprimer le compte : solde actif. Veuillez d\'abord utiliser vos crédits.',
        400
      );
    }
  }

  // Supprimer les connexions bancaires
  await prisma.powensConnection.deleteMany({
    where: { userId }
  });

  // Révoquer tous les consentements
  await prisma.userConsent.updateMany({
    where: { userId },
    data: {
      privacyPolicy: false,
      marketing: false,
      analytics: false
    }
  });

  // Anonymiser les données personnelles (soft delete)
  await prisma.user.update({
    where: { id: userId },
    data: {
      email: `deleted_${userId}@deleted.local`,
      firstName: 'Deleted',
      lastName: 'User',
      phone: null,
      hashedPassword: 'DELETED_ANONYMIZED'
    }
  });

  return { message: 'Compte anonymisé avec succès' };
};

