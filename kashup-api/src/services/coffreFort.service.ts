import prisma from '../config/prisma';
import { AppError } from '../utils/errors';

export type CoffreFortConfigDto = {
  lockPeriodMonths: number;
  pointsPerEuroPerMonth: number;
};

/** Récupère la config coffre-fort (singleton). Crée les valeurs par défaut si absentes. */
export async function getCoffreFortConfig(): Promise<CoffreFortConfigDto> {
  let config = await prisma.coffreFortConfig.findFirst();
  if (!config) {
    config = await prisma.coffreFortConfig.create({
      data: { lockPeriodMonths: 2, pointsPerEuroPerMonth: 10 }
    });
  }
  return {
    lockPeriodMonths: config.lockPeriodMonths,
    pointsPerEuroPerMonth: config.pointsPerEuroPerMonth
  };
}

/** Met à jour la config coffre-fort (admin). */
export async function updateCoffreFortConfig(
  payload: Partial<{ lockPeriodMonths: number; pointsPerEuroPerMonth: number }>
): Promise<CoffreFortConfigDto> {
  let config = await prisma.coffreFortConfig.findFirst();
  if (!config) {
    config = await prisma.coffreFortConfig.create({
      data: {
        lockPeriodMonths: payload.lockPeriodMonths ?? 2,
        pointsPerEuroPerMonth: payload.pointsPerEuroPerMonth ?? 10
      }
    });
  } else {
    config = await prisma.coffreFortConfig.update({
      where: { id: config.id },
      data: {
        ...(payload.lockPeriodMonths != null && { lockPeriodMonths: payload.lockPeriodMonths }),
        ...(payload.pointsPerEuroPerMonth != null && { pointsPerEuroPerMonth: payload.pointsPerEuroPerMonth })
      }
    });
  }
  return {
    lockPeriodMonths: config.lockPeriodMonths,
    pointsPerEuroPerMonth: config.pointsPerEuroPerMonth
  };
}

/** Montant retirable du coffre (mouvements débloqués et non encore retirés). */
export async function getWithdrawableCoffre(userId: string): Promise<number> {
  const now = new Date();
  const movements = await prisma.coffreFortMovement.findMany({
    where: { userId, unlockAt: { lte: now } }
  });
  return movements.reduce((sum, m) => sum + (m.amount - m.amountWithdrawn), 0);
}

/** Transférer du cashback disponible vers le coffre-fort (blocage lockPeriodMonths). */
export async function transferToCoffre(userId: string, amount: number): Promise<{ wallet: { soldeCashback: number; soldeCoffreFort: number }; unlockAt: string }> {
  if (amount <= 0 || !Number.isFinite(amount)) {
    throw new AppError('Montant invalide', 400);
  }
  const config = await getCoffreFortConfig();
  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  if (!wallet) {
    throw new AppError('Portefeuille introuvable', 404);
  }
  if (wallet.soldeCashback < amount) {
    throw new AppError('Solde cashback insuffisant', 400);
  }
  const unlockAt = new Date();
  unlockAt.setMonth(unlockAt.getMonth() + config.lockPeriodMonths);

  const result = await prisma.$transaction(async (tx) => {
    await tx.wallet.update({
      where: { userId },
      data: {
        soldeCashback: { decrement: amount },
        soldeCoffreFort: { increment: amount }
      }
    });
    await tx.coffreFortMovement.create({
      data: { userId, amount, unlockAt }
    });
    return tx.wallet.findUniqueOrThrow({ where: { userId } });
  });

  return {
    wallet: { soldeCashback: result.soldeCashback, soldeCoffreFort: result.soldeCoffreFort },
    unlockAt: unlockAt.toISOString()
  };
}

/** Retirer du coffre-fort vers le cashback disponible (uniquement les montants débloqués). */
export async function withdrawFromCoffre(userId: string, amount: number): Promise<{ soldeCashback: number; soldeCoffreFort: number }> {
  if (amount <= 0 || !Number.isFinite(amount)) {
    throw new AppError('Montant invalide', 400);
  }
  const withdrawable = await getWithdrawableCoffre(userId);
  if (withdrawable < amount) {
    throw new AppError(`Montant retirable insuffisant (max. ${withdrawable.toFixed(2)} €)`, 400);
  }
  const now = new Date();
  const movements = await prisma.coffreFortMovement.findMany({
    where: { userId, unlockAt: { lte: now } },
    orderBy: { unlockAt: 'asc' }
  });

  let remaining = amount;
  await prisma.$transaction(async (tx) => {
    for (const m of movements) {
      if (remaining <= 0) break;
      const available = m.amount - m.amountWithdrawn;
      const toWithdraw = Math.min(available, remaining);
      await tx.coffreFortMovement.update({
        where: { id: m.id },
        data: { amountWithdrawn: { increment: toWithdraw } }
      });
      remaining -= toWithdraw;
    }
    await tx.wallet.update({
      where: { userId },
      data: {
        soldeCashback: { increment: amount },
        soldeCoffreFort: { decrement: amount }
      }
    });
    await tx.coffreFortWithdrawal.create({
      data: { userId, amount }
    });
  });

  const wallet = await prisma.wallet.findUniqueOrThrow({ where: { userId } });
  return { soldeCashback: wallet.soldeCashback, soldeCoffreFort: wallet.soldeCoffreFort };
}

export type CoffreFortHistoryEntry = {
  type: 'versement' | 'retrait' | 'points';
  amount?: number;
  points?: number;
  date: string;
};

/** Historique coffre-fort : versements, retraits, points gagnés (avec date). */
export async function getCoffreFortHistory(userId: string): Promise<{
  versements: { amount: number; date: string }[];
  retraits: { amount: number; date: string }[];
  points: { points: number; date: string }[];
}> {
  const [movements, withdrawals, pointsEntries] = await Promise.all([
    prisma.coffreFortMovement.findMany({
      where: { userId },
      orderBy: { lockedAt: 'desc' },
      select: { amount: true, lockedAt: true }
    }),
    prisma.coffreFortWithdrawal.findMany({
      where: { userId },
      orderBy: { withdrawnAt: 'desc' },
      select: { amount: true, withdrawnAt: true }
    }),
    prisma.coffreFortPointsEntry.findMany({
      where: { userId },
      orderBy: { earnedAt: 'desc' },
      select: { points: true, earnedAt: true }
    })
  ]);

  return {
    versements: movements.map((m) => ({ amount: m.amount, date: m.lockedAt.toISOString() })),
    retraits: withdrawals.map((w) => ({ amount: w.amount, date: w.withdrawnAt.toISOString() })),
    points: pointsEntries.map((p) => ({ points: p.points, date: p.earnedAt.toISOString() }))
  };
}
