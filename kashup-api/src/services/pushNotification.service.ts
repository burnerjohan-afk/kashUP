/**
 * Service d'envoi des notifications push via Expo.
 * Utilisé pour notifier l'utilisateur sur son téléphone (app ouverte, fermée ou écran verrouillé).
 */

import Expo from 'expo-server-sdk';
import prisma from '../config/prisma';
import logger from '../utils/logger';

const expo = new Expo();

export type PushPayload = {
  title: string;
  body?: string;
  data?: Record<string, unknown>;
};

/**
 * Récupère le token Expo Push d'un utilisateur (s'il en a enregistré un).
 */
export async function getPushTokenForUser(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { pushToken: true },
  });
  return user?.pushToken ?? null;
}

/**
 * Envoie une notification push à un utilisateur par son ID.
 * Ne fait rien si l'utilisateur n'a pas de token enregistré.
 * @returns true si au moins un envoi a été tenté avec succès, false sinon
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload
): Promise<boolean> {
  const token = await getPushTokenForUser(userId);
  if (!token) {
    logger.debug({ userId }, '[Push] Aucun token push pour l\'utilisateur');
    return false;
  }
  return sendPushToTokens([token], payload);
}

/**
 * Envoie une notification push à une liste de tokens Expo.
 * @returns true si tous les tokens sont valides et l'envoi a été lancé, false en cas d'erreur ou aucun token valide
 */
export async function sendPushToTokens(
  tokens: string[],
  payload: PushPayload
): Promise<boolean> {
  const validTokens = tokens.filter((t): t is string => Expo.isExpoPushToken(t));
  if (validTokens.length === 0) {
    logger.warn('[Push] Aucun token Expo valide fourni');
    return false;
  }

  const messages = validTokens.map((to) => ({
    to,
    title: payload.title,
    body: payload.body ?? '',
    data: payload.data ?? {},
    sound: 'default' as const,
    priority: 'high' as const,
  }));

  const chunks = expo.chunkPushNotifications(messages);
  const results: Expo.ExpoPushTicket[] = [];

  for (const chunk of chunks) {
    try {
      const tickets = await expo.sendPushNotificationsAsync(chunk);
      results.push(...tickets);
    } catch (err) {
      logger.error({ err: err instanceof Error ? err.message : String(err) }, '[Push] Erreur envoi Expo');
      return false;
    }
  }

  const errors = results.filter((t) => t.status === 'error');
  if (errors.length > 0) {
    for (const e of errors) {
      const err = e as { message?: string; details?: unknown };
      logger.warn({ message: err.message, details: err.details }, '[Push] Ticket en erreur');
    }
    // DeviceNotRegistered = token à invalider côté user (optionnel)
  }

  return true;
}
