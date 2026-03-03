import prisma from '../config/prisma';
import { NOTIFICATION_CATEGORIES } from '../types/domain';
import { notificationBus, NotificationEvent } from '../events/event-bus';

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
  },
  boost_purchased: async (payload) => {
    await createNotification(payload.userId, {
      title: 'Boost activé',
      body: 'Votre boost est prêt à l’emploi',
      category: 'boosts',
      metadata: payload
    });
  },
  drimify_experience_result: async (payload) => {
    await createNotification(payload.userId, {
      title: 'Résultat jeu',
      body: payload.message,
      category: 'system',
      metadata: payload
    });
  },
  powens_connection_sync: async (payload) => {
    await createNotification(payload.userId, {
      title: 'Mise à jour bancaire',
      body: `Connexion ${payload.connectionId} (${payload.status})`,
      category: 'system',
      metadata: payload
    });
  }
};

notificationBus.on('transaction_created', handlers.transaction_created);
notificationBus.on('boost_purchased', handlers.boost_purchased);
notificationBus.on('drimify_experience_result', handlers.drimify_experience_result);
notificationBus.on('powens_connection_sync', handlers.powens_connection_sync);


