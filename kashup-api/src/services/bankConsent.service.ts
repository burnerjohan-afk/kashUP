import prisma from '../config/prisma';
import { AppError } from '../utils/errors';
import logger from '../utils/logger';

/**
 * Service de gestion des consentements DSP2 (Directive PSD2)
 * Consentement explicite pour accès aux comptes bancaires
 */

export interface BankConsentInput {
  connectionId: string;
  scope: string[]; // ['accounts', 'transactions', 'balances']
  expiresAt?: Date;
}

/**
 * Crée un consentement explicite DSP2 pour une connexion bancaire
 */
export const createBankConsent = async (userId: string, input: BankConsentInput) => {
  // Vérifier que la connexion appartient à l'utilisateur
  const connection = await prisma.powensConnection.findFirst({
    where: {
      id: input.connectionId,
      userId
    }
  });

  if (!connection) {
    throw new AppError('Connexion bancaire introuvable', 404);
  }

  const now = new Date();
  const consent = await prisma.bankConsent.upsert({
    where: {
      userId_connectionId: {
        userId,
        connectionId: input.connectionId
      }
    },
    update: {
      consentGiven: true,
      consentGivenAt: now,
      consentRevoked: false,
      consentRevokedAt: null,
      scope: JSON.stringify(input.scope),
      expiresAt: input.expiresAt || null,
      updatedAt: now
    },
    create: {
      userId,
      connectionId: input.connectionId,
      consentGiven: true,
      consentGivenAt: now,
      scope: JSON.stringify(input.scope),
      expiresAt: input.expiresAt || null
    }
  });

  logger.info({ userId, connectionId: input.connectionId, scope: input.scope }, 'Consentement DSP2 créé');
  return consent;
};

/**
 * Révoque un consentement bancaire
 */
export const revokeBankConsent = async (userId: string, connectionId: string) => {
  const consent = await prisma.bankConsent.findFirst({
    where: {
      userId,
      connectionId
    }
  });

  if (!consent) {
    throw new AppError('Consentement introuvable', 404);
  }

  const updated = await prisma.bankConsent.update({
    where: { id: consent.id },
    data: {
      consentRevoked: true,
      consentRevokedAt: new Date(),
      updatedAt: new Date()
    }
  });

  // Déconnecter la connexion bancaire
  await prisma.powensConnection.update({
    where: { id: connectionId },
    data: {
      status: 'disconnected',
      updatedAt: new Date()
    }
  });

  logger.info({ userId, connectionId }, 'Consentement DSP2 révoqué');
  return updated;
};

/**
 * Vérifie si un consentement bancaire est valide
 */
export const isBankConsentValid = async (userId: string, connectionId: string): Promise<boolean> => {
  const consent = await prisma.bankConsent.findFirst({
    where: {
      userId,
      connectionId,
      consentGiven: true,
      consentRevoked: false
    }
  });

  if (!consent) return false;

  // Vérifier expiration
  if (consent.expiresAt && consent.expiresAt < new Date()) {
    return false;
  }

  return true;
};


