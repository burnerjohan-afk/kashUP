import prisma from '../config/prisma';
import { AppError } from '../utils/errors';
import logger from '../utils/logger';

/**
 * Service de gestion des consentements RGPD (Art. 6, 7)
 */

export interface ConsentInput {
  privacyPolicy: boolean;
  privacyPolicyVersion?: string;
  marketing?: boolean;
  analytics?: boolean;
}

/**
 * Met à jour ou crée les consentements utilisateur
 */
export const updateUserConsent = async (userId: string, input: ConsentInput) => {
  const now = new Date();
  
  const consent = await prisma.userConsent.upsert({
    where: { userId },
    update: {
      privacyPolicy: input.privacyPolicy,
      privacyPolicyAt: input.privacyPolicy ? (now) : undefined,
      privacyPolicyVersion: input.privacyPolicy ? (input.privacyPolicyVersion || '1.0') : undefined,
      marketing: input.marketing ?? false,
      marketingAt: input.marketing ? (now) : undefined,
      analytics: input.analytics ?? false,
      analyticsAt: input.analytics ? (now) : undefined,
      updatedAt: now
    },
    create: {
      userId,
      privacyPolicy: input.privacyPolicy,
      privacyPolicyAt: input.privacyPolicy ? now : undefined,
      privacyPolicyVersion: input.privacyPolicy ? (input.privacyPolicyVersion || '1.0') : undefined,
      marketing: input.marketing ?? false,
      marketingAt: input.marketing ? now : undefined,
      analytics: input.analytics ?? false,
      analyticsAt: input.analytics ? now : undefined
    }
  });

  logger.info({ userId, consent }, 'Consentement RGPD mis à jour');
  return consent;
};

/**
 * Récupère les consentements utilisateur
 */
export const getUserConsent = async (userId: string) => {
  return prisma.userConsent.findUnique({
    where: { userId }
  });
};

/**
 * Vérifie si l'utilisateur a consenti à la politique de confidentialité
 */
export const hasPrivacyPolicyConsent = async (userId: string): Promise<boolean> => {
  const consent = await getUserConsent(userId);
  return consent?.privacyPolicy ?? false;
};


