import prisma from '../config/prisma';
import { CreateTransactionInput } from '../schemas/transaction.schema';
import { AppError } from '../utils/errors';
import { BOOST_TARGET, BoostTarget } from '../types/domain';
import { notificationBus } from '../events/event-bus';
import { transactionCounter } from '../metrics/prom';

const now = () => new Date();

const resolveBoostMultiplier = async (userId: string, partnerId: string) => {
  const partner = await prisma.partner.findUnique({
    where: { id: partnerId },
    include: { category: true }
  });

  if (!partner) {
    throw new AppError('Partenaire introuvable', 404);
  }

  const activeBoosts = await prisma.userBoost.findMany({
    where: {
      userId,
      expiresAt: { gte: now() },
      boost: {
        active: true,
        startsAt: { lte: now() },
        endsAt: { gte: now() }
      }
    },
    include: {
      boost: true
    }
  });

  let maxMultiplier = 1;
  for (const userBoost of activeBoosts) {
    const boost = userBoost.boost;
    let matches = false;

    switch (boost.target as BoostTarget) {
      case BOOST_TARGET.all:
        matches = true;
        break;
      case BOOST_TARGET.category:
        matches = boost.categoryId === partner.categoryId;
        break;
      case BOOST_TARGET.partner:
        matches = boost.partnerId === partner.id;
        break;
      default:
        matches = false;
    }

    if (matches) {
      maxMultiplier = Math.max(maxMultiplier, boost.multiplier);
    }
  }

  return { multiplier: maxMultiplier, partner };
};

export const createTransaction = async (userId: string, input: CreateTransactionInput) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { wallet: true }
  });

  if (!user || !user.wallet) {
    throw new AppError('Utilisateur ou portefeuille introuvable', 404);
  }

  const wallet = user.wallet;

  const { multiplier, partner } = await resolveBoostMultiplier(userId, input.partnerId);
  const baseCashback = (input.amount * partner.tauxCashbackBase) / 100;
  const cashbackEarned = Number((baseCashback * multiplier).toFixed(2));
  const pointsEarned = Math.round(input.amount * 10);

  const result = await prisma.$transaction(async (tx) => {
    const transaction = await tx.transaction.create({
      data: {
        userId,
        partnerId: partner.id,
        amount: input.amount,
        cashbackEarned,
        pointsEarned,
        source: input.source
      },
      include: {
        partner: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
            tauxCashbackBase: true,
            territories: true
          }
        }
      }
    });

    const updatedWallet = await tx.wallet.update({
      where: { id: wallet.id },
      data: {
        soldeCashback: { increment: cashbackEarned },
        soldePoints: { increment: pointsEarned }
      }
    });

    await tx.points.create({
      data: {
        userId,
        delta: pointsEarned,
        reason: `Points suite à la transaction ${partner.name}`
      }
    });

    return { transaction, wallet: updatedWallet };
  });

  const response = {
    ...result,
    appliedMultiplier: multiplier,
    cashbackEarned,
    pointsEarned
  };

  notificationBus.emitEvent({
    type: 'transaction_created',
    payload: {
      userId,
      transactionId: result.transaction.id,
      amount: input.amount,
      partnerId: result.transaction.partnerId,
      cashbackEarned: response.cashbackEarned,
    },
  });
  transactionCounter.inc();

  return response;
};

// Services admin pour les transactions

export interface TransactionFilters {
  source?: string;
  status?: string;
  partnerId?: string;
  page?: number;
  pageSize?: number;
}

export const listTransactions = async (filters: TransactionFilters) => {
  const page = filters.page || 1;
  const pageSize = filters.pageSize || 20;
  const skip = (page - 1) * pageSize;

  const where: any = {};

  // Gérer "all" comme "pas de filtre"
  if (filters.source && filters.source !== 'all') {
    where.source = filters.source;
  }

  if (filters.status && filters.status !== 'all') {
    where.status = filters.status;
  } else if (!filters.status || filters.status === 'all') {
    // Par défaut, ne retourner que les transactions confirmées
    where.status = 'confirmed';
  }

  if (filters.partnerId) {
    where.partnerId = filters.partnerId;
  }

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        partner: { select: { id: true, name: true, logoUrl: true } }
      },
      skip,
      take: pageSize,
      orderBy: { transactionDate: 'desc' }
    }),
    prisma.transaction.count({ where })
  ]);

  // Garantir structure stable même si vide (pas de données fantômes)
  return {
    items: transactions || [],
    page,
    pageSize,
    total: total ?? 0
  };
};

export const exportTransactionsToCSV = async (filters: TransactionFilters) => {
  const where: any = {};

  // Gérer "all" comme "pas de filtre"
  if (filters.source && filters.source !== 'all') {
    where.source = filters.source;
  }

  if (filters.status && filters.status !== 'all') {
    where.status = filters.status;
  } else if (!filters.status || filters.status === 'all') {
    // Par défaut, ne retourner que les transactions confirmées
    where.status = 'confirmed';
  }

  if (filters.partnerId) {
    where.partnerId = filters.partnerId;
  }

  const transactions = await prisma.transaction.findMany({
    where,
    include: {
      user: { select: { id: true, email: true, firstName: true, lastName: true } },
      partner: { select: { id: true, name: true } }
    },
    orderBy: { transactionDate: 'desc' }
  });

  const headers = [
    'ID',
    'Date',
    'Utilisateur',
    'Email',
    'Partenaire',
    'Montant',
    'Cashback',
    'Points',
    'Source',
    'Statut'
  ];

  const rows = transactions.map(tx => [
    tx.id,
    tx.transactionDate.toISOString(),
    `${tx.user.firstName} ${tx.user.lastName}`,
    tx.user.email,
    tx.partner?.name || 'N/A',
    tx.amount.toString(),
    tx.cashbackEarned.toString(),
    tx.pointsEarned.toString(),
    tx.source,
    tx.status
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n');

  return csvContent;
};

export const flagTransaction = async (id: string) => {
  const transaction = await prisma.transaction.findUnique({ where: { id } });
  
  if (!transaction) {
    throw new AppError('Transaction introuvable', 404);
  }

  return prisma.transaction.update({
    where: { id },
    data: { status: 'flagged' },
    include: {
      user: { select: { id: true, email: true } },
      partner: { select: { id: true, name: true } }
    }
  });
};


