import prisma from '../config/prisma';
import { NOTIFICATION_CATEGORIES } from '../types/domain';
import { notificationBus, NotificationEvent } from '../events/event-bus';
import { checkChallengeProgress } from './challengeEngine';
import { addCashbackContribution } from './communityJackpotEngine';
import { addLotteryContribution } from './communityJackpotEngine';
import { addChallengeContribution } from './communityJackpotEngine';
import { sendPushToUser } from './pushNotification.service';

export const listNotificationsForUser = (userId: string) => {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 100
  });
};

export const markNotificationAsRead = async (userId: string, notificationId: string) => {
  await prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { readAt: new Date() }
  });
};

export const createNotification = (
  userId: string,
  payload: {
    title: string;
    body: string;
    category?: string;
    metadata?: Record<string, unknown>;
  }
) => {
  const category =
    payload.category && NOTIFICATION_CATEGORIES.includes(payload.category as never)
      ? payload.category
      : 'system';

  return prisma.notification.create({
    data: {
      userId,
      title: payload.title,
      body: payload.body,
      category,
      metadata: payload.metadata ? JSON.stringify(payload.metadata) : null
    }
  });
};

const handlers: Record<NotificationEvent['type'], (payload: any) => Promise<void> | void> = {
  transaction_created: async (payload) => {
    await createNotification(payload.userId, {
      title: 'Nouvelle transaction',
      body: `Transaction de ${payload.amount}€ enregistrée`,
      category: 'cashback',
      metadata: payload
    });
    checkChallengeProgress(payload.userId, 'transaction_created', {
      transaction_created: {
        transactionId: payload.transactionId,
        userId: payload.userId,
        partnerId: payload.partnerId,
        amount: payload.amount,
      },
    }).catch((err) => console.error('[challengeEngine] transaction_created:', err));
    if (payload.cashbackEarned != null && payload.cashbackEarned > 0) {
      addCashbackContribution(payload.userId, payload.cashbackEarned, payload.amount).catch((err) =>
        console.error('[communityJackpot] addCashbackContribution:', err)
      );
    }
  },
  boost_purchased: async (payload) => {
    const name = payload.boostName ?? 'Boost';
    const rapportParts: string[] = [];
    if (payload.boostDescription && payload.boostDescription.trim()) {
      rapportParts.push(payload.boostDescription.trim());
    } else {
      if (payload.multiplier != null) rapportParts.push(`×${payload.multiplier} sur le cashback`);
      if (payload.target) {
        const cible = payload.target === 'partner' ? 'chez un partenaire' : payload.target === 'category' ? 'sur une catégorie' : 'sur tous vos achats';
        rapportParts.push(cible);
      }
    }
    const ceQueCaRapporte = rapportParts.length > 0 ? rapportParts.join(' • ') : 'avantage cashback activé';
    const costStr = payload.costInPoints != null ? ` (${payload.costInPoints} pts utilisés)` : '';
    const body = `Nom du boost : ${name}. Ce que ça rapporte : ${ceQueCaRapporte}.${costStr}`;
    await createNotification(payload.userId, {
      title: `Boost activé : ${name}`,
      body,
      category: 'boosts',
      metadata: payload
    });
    sendPushToUser(payload.userId, { title: `Boost activé : ${name}`, body }).catch(() => {});
  },
  drimify_experience_result: async (payload) => {
    await createNotification(payload.userId, {
      title: 'Résultat jeu',
      body: payload.message,
      category: 'system',
      metadata: payload
    });
    sendPushToUser(payload.userId, { title: 'Résultat jeu', body: payload.message }).catch(() => {});
  },
  powens_connection_sync: async (payload) => {
    await createNotification(payload.userId, {
      title: 'Mise à jour bancaire',
      body: `Connexion ${payload.connectionId} (${payload.status})`,
      category: 'system',
      metadata: payload
    });
  },
  lottery_joined: async (payload) => {
    // Notification déjà créée dans lotteryEngine.enterLottery
    addLotteryContribution(payload.userId, payload.lotteryId).catch((err) =>
      console.error('[communityJackpot] addLotteryContribution:', err)
    );
  },
  lottery_winner: async () => {
    // Notification déjà créée dans lotteryEngine.notifyWinner
  },
  challenge_completed: async (payload) => {
    addChallengeContribution(payload.userId, payload.challengeId).catch((err) =>
      console.error('[communityJackpot] addChallengeContribution:', err)
    );
  },
  jackpot_winner: async () => {
    // Notification déjà créée dans communityJackpotEngine.drawJackpotWinner
  },
};

notificationBus.on('transaction_created', handlers.transaction_created);
notificationBus.on('boost_purchased', handlers.boost_purchased);
notificationBus.on('drimify_experience_result', handlers.drimify_experience_result);
notificationBus.on('powens_connection_sync', handlers.powens_connection_sync);
notificationBus.on('lottery_joined', handlers.lottery_joined);
notificationBus.on('lottery_winner', handlers.lottery_winner);
notificationBus.on('challenge_completed', handlers.challenge_completed);
notificationBus.on('jackpot_winner', handlers.jackpot_winner);


