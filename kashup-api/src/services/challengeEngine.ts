/**
 * Moteur de gestion des challenges KashUP.
 * - Vérification et mise à jour de la progression selon les événements app (transaction, carte, invite, etc.)
 * - Validation uniquement côté backend, une action = une progression.
 */

import prisma from '../config/prisma';
import { notificationBus } from '../events/event-bus';
import { createNotification } from './notification.service';
import { sendPushToUser } from './pushNotification.service';

const CHALLENGE_TYPES = [
  'challenge_purchase',
  'challenge_spend',
  'challenge_discovery',
  'challenge_loyalty',
  'challenge_invite',
  'challenge_geo',
  'challenge_event',
] as const;

export type ChallengeType = (typeof CHALLENGE_TYPES)[number];

export type ChallengeEventType =
  | 'transaction_created'
  | 'gift_card_used'
  | 'qr_validated'
  | 'invite_completed'
  | 'payment_confirmed';

export type ChallengeEventPayload = {
  transaction_created?: { transactionId: string; userId: string; partnerId: string; amount: number };
  gift_card_used?: { userId: string; partnerId?: string; amount?: number };
  qr_validated?: { userId: string; partnerId: string };
  invite_completed?: { userId: string; inviteCount: number };
  payment_confirmed?: { userId: string; partnerId: string; amount: number };
};

const now = () => new Date();

/**
 * Récupère les challenges actifs (période valide, status active) pour lesquels un événement peut faire avancer la progression.
 */
async function getActiveChallengesForEvent(
  userId: string,
  eventType: ChallengeEventType
): Promise<{ challenge: Awaited<ReturnType<typeof prisma.challenge.findFirst>>; progression: { progress: number; completedAt: Date | null } | null }[]> {
  const at = now();
  const challenges = await prisma.challenge.findMany({
    where: {
      status: 'active',
      startAt: { lte: at },
      endAt: { gte: at },
      deletedAt: null,
      type: { in: eventTypeToChallengeTypes(eventType) },
    },
    include: {
      reward: true,
      progressions: {
        where: { userId },
        take: 1,
      },
    },
  });

  return challenges.map((c) => ({
    challenge: c,
    progression: c.progressions[0] ?? null,
  }));
}

function eventTypeToChallengeTypes(eventType: ChallengeEventType): ChallengeType[] {
  switch (eventType) {
    case 'transaction_created':
    case 'payment_confirmed':
      return ['challenge_purchase', 'challenge_spend', 'challenge_discovery', 'challenge_loyalty'];
    case 'gift_card_used':
      return ['challenge_purchase', 'challenge_loyalty'];
    case 'qr_validated':
      return ['challenge_geo'];
    case 'invite_completed':
      return ['challenge_invite'];
    default:
      return [];
  }
}

/**
 * Calcule la nouvelle valeur de progression selon le type de challenge et l’événement.
 * Une seule transaction = +1 pour purchase (partenaires distincts) ou +amount pour spend, etc.
 */
async function computeProgressDelta(
  challenge: { type: string; goalType: string; goalValue: number; partnerId: string | null },
  userId: string,
  eventType: ChallengeEventType,
  payload: ChallengeEventPayload
): Promise<number> {
  switch (challenge.type) {
    case 'challenge_purchase': {
      const partnerId = getPartnerIdFromPayload(eventType, payload);
      if (!partnerId) return 0;
      if (challenge.partnerId) {
        return prisma.transaction.count({
          where: {
            userId,
            status: 'confirmed',
            partnerId: challenge.partnerId,
          },
        });
      }
      const distinctPartners = await prisma.transaction.findMany({
        where: { userId, status: 'confirmed' },
        select: { partnerId: true },
        distinct: ['partnerId'],
      });
      return distinctPartners.length;
    }
    case 'challenge_spend': {
      const amount = getAmountFromPayload(eventType, payload);
      if (amount == null || amount <= 0) return 0;
      const sum = await prisma.transaction.aggregate({
        where: {
          userId,
          status: 'confirmed',
          ...(challenge.partnerId ? { partnerId: challenge.partnerId } : {}),
        },
        _sum: { amount: true },
      });
      return Math.round((sum._sum.amount ?? 0) * 100) / 100;
    }
    case 'challenge_discovery': {
      const partnerId = getPartnerIdFromPayload(eventType, payload);
      if (!partnerId) return 0;
      const distinctPartners = await prisma.transaction.findMany({
        where: { userId, status: 'confirmed' },
        select: { partnerId: true },
        distinct: ['partnerId'],
      });
      return distinctPartners.length;
    }
    case 'challenge_loyalty': {
      // Ex: 5 achats dans le mois
      const count = await prisma.transaction.count({
        where: {
          userId,
          status: 'confirmed',
          transactionDate: { gte: startOfMonth(now()) },
          ...(challenge.partnerId ? { partnerId: challenge.partnerId } : {}),
        },
      });
      return count;
    }
    case 'challenge_invite': {
      return prisma.referralInvite.count({
        where: {
          referral: { userId },
          status: 'completed',
        },
      });
    }
    case 'challenge_geo': {
      const partnerId = getPartnerIdFromPayload(eventType, payload);
      if (!partnerId) return 0;
      const count = await prisma.transaction.count({
        where: {
          userId,
          partnerId,
          status: 'confirmed',
        },
      });
      return count;
    }
    default:
      return 0;
  }
}

function getPartnerIdFromPayload(
  eventType: ChallengeEventType,
  payload: ChallengeEventPayload
): string | null {
  return (
    payload.transaction_created?.partnerId ??
    payload.gift_card_used?.partnerId ??
    payload.qr_validated?.partnerId ??
    payload.payment_confirmed?.partnerId ??
    null
  );
}

function getAmountFromPayload(
  eventType: ChallengeEventType,
  payload: ChallengeEventPayload
): number | null {
  return (
    payload.transaction_created?.amount ??
    payload.gift_card_used?.amount ??
    payload.payment_confirmed?.amount ??
    null
  );
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/**
 * Vérifie et met à jour la progression des challenges pour un utilisateur suite à un événement.
 * Appelé par les hooks (transaction créée, carte utilisée, invite, etc.).
 */
export async function checkChallengeProgress(
  userId: string,
  eventType: ChallengeEventType,
  payload: ChallengeEventPayload
): Promise<void> {
  const candidates = await getActiveChallengesForEvent(userId, eventType);
  for (const { challenge, progression } of candidates) {
    if (!challenge) continue;
    const currentProgress = progression?.progress ?? 0;
    if (progression?.completedAt) continue;

    const newProgress = await computeProgressDelta(
      challenge,
      userId,
      eventType,
      payload
    );

    if (newProgress > currentProgress) {
      const goalValue = challenge.goalValue;
      const percentage = Math.min(100, Math.round((newProgress / goalValue) * 100));

      if (currentProgress === 0) {
        await createNotification(userId, {
          title: 'Challenge commencé',
          body: `Tu as démarré « ${challenge.title} ». Bonne chance !`,
          category: 'challenges',
          metadata: { challengeId: challenge.id },
        });
        sendPushToUser(userId, {
          title: 'Challenge commencé',
          body: `Tu as démarré « ${challenge.title} ». Bonne chance !`,
        }).catch(() => {});
      }

      await updateChallengeProgress(challenge.id, userId, newProgress);

      if (percentage >= 100) {
        await completeChallenge(challenge.id, userId);
        const reward = challenge.rewardId ? await grantReward(userId, challenge.rewardId) : null;
        await createNotification(userId, {
          title: 'Challenge complété',
          body: `${challenge.title} – Récompense débloquée !`,
          category: 'challenges',
          metadata: { challengeId: challenge.id, rewardId: reward?.id },
        });
        sendPushToUser(userId, {
          title: 'Challenge complété',
          body: `${challenge.title} – Récompense débloquée !`,
        }).catch(() => {});
        notificationBus.emitEvent({
          type: 'challenge_completed',
          payload: { userId, challengeId: challenge.id },
        });
      } else if (percentage >= 80 && currentProgress < goalValue * 0.8) {
        await createNotification(userId, {
          title: 'Plus que 20 %',
          body: `Tu as atteint ${percentage}% sur « ${challenge.title} ». Continue !`,
          category: 'challenges',
          metadata: { challengeId: challenge.id },
        });
        sendPushToUser(userId, {
          title: 'Plus que 20 %',
          body: `Tu as atteint ${percentage}% sur « ${challenge.title} ». Continue !`,
        }).catch(() => {});
      }
    }
  }
}

/**
 * Met à jour la progression d’un challenge pour un utilisateur (backend only).
 */
export async function updateChallengeProgress(
  challengeId: string,
  userId: string,
  progress: number
): Promise<void> {
  await prisma.challengeProgress.upsert({
    where: {
      challengeId_userId: { challengeId, userId },
    },
    create: {
      challengeId,
      userId,
      progress,
      updatedAt: now(),
    },
    update: {
      progress,
      updatedAt: now(),
    },
  });
}

/**
 * Marque un challenge comme complété pour l’utilisateur et enregistre la date.
 */
export async function completeChallenge(challengeId: string, userId: string): Promise<void> {
  await prisma.challengeProgress.updateMany({
    where: { challengeId, userId },
    data: { completedAt: now(), updatedAt: now() },
  });
}

/**
 * Attribue la récompense à l’utilisateur (cashback → wallet, points → points, etc.).
 */
export async function grantReward(
  userId: string,
  rewardId: string
): Promise<{ id: string; rewardType: string } | null> {
  const reward = await prisma.challengeReward.findUnique({
    where: { id: rewardId },
  });
  if (!reward) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { wallet: true },
  });
  if (!user?.wallet) return null;

  switch (reward.rewardType) {
    case 'cashback': {
      await prisma.wallet.update({
        where: { id: user.wallet.id },
        data: { soldeCashback: { increment: reward.rewardValue } },
      });
      break;
    }
    case 'points': {
      const points = Math.round(reward.rewardValue);
      await prisma.wallet.update({
        where: { id: user.wallet.id },
        data: { soldePoints: { increment: points } },
      });
      await prisma.points.create({
        data: {
          userId,
          delta: points,
          reason: `Récompense challenge (${rewardId})`,
        },
      });
      break;
    }
    case 'gift_card':
    case 'voucher':
    case 'badge':
    case 'boost':
      // Pour l’instant on ne crée pas d’entités spécifiques ; on peut logger ou créer des entrées dédiées plus tard
      break;
  }

  return { id: reward.id, rewardType: reward.rewardType };
}
