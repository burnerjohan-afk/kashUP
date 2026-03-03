import prisma from '../config/prisma';
import logger from '../utils/logger';

/**
 * Service de gestion de la conservation des données (RGPD Art. 5 (1) e)
 * Principe de limitation de la durée de conservation
 * 
 * Durées de conservation recommandées :
 * - Utilisateurs inactifs : 3 ans après dernière activité
 * - Logs d'audit : 1 an
 * - Notifications lues : 6 mois
 * - Tokens expirés : 30 jours après expiration
 * - Transactions bancaires : 5 ans (obligation comptable)
 */

// Durées de conservation en jours
const RETENTION_PERIODS = {
  // Données utilisateur inactif (3 ans après dernière connexion)
  INACTIVE_USER: 3 * 365,
  // Logs d'audit (1 an)
  AUDIT_LOGS: 365,
  // Notifications lues (6 mois)
  READ_NOTIFICATIONS: 180,
  // Tokens Powens expirés (30 jours après expiration)
  EXPIRED_TOKENS: 30,
  // Transactions bancaires (5 ans - obligation comptable/fiscale)
  BANK_TRANSACTIONS: 5 * 365,
  // Anciennes connexions bancaires déconnectées (2 ans)
  DISCONNECTED_BANK_CONNECTIONS: 2 * 365,
} as const;

/**
 * Anonymise les utilisateurs inactifs (RGPD Art. 17 - droit à l'effacement)
 * Ne supprime pas complètement pour préserver l'intégrité référentielle
 */
export const anonymizeInactiveUsers = async () => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - RETENTION_PERIODS.INACTIVE_USER);

  const inactiveUsers = await prisma.user.findMany({
    where: {
      updatedAt: { lt: cutoffDate },
      // Ne pas anonymiser si wallet actif (solde > 0)
      wallet: {
        OR: [
          { soldeCashback: { gt: 0 } },
          { soldePoints: { gt: 0 } },
          { soldeCoffreFort: { gt: 0 } }
        ]
      }
    },
    select: {
      id: true,
      email: true,
      wallet: {
        select: {
          soldeCashback: true,
          soldePoints: true,
          soldeCoffreFort: true
        }
      }
    }
  });

  let anonymizedCount = 0;

  for (const user of inactiveUsers) {
    // Vérifier une dernière fois qu'il n'y a pas de solde
    const hasBalance = 
      (user.wallet?.soldeCashback || 0) > 0 ||
      (user.wallet?.soldePoints || 0) > 0 ||
      (user.wallet?.soldeCoffreFort || 0) > 0;

    if (hasBalance) {
      logger.warn({ userId: user.id }, 'Utilisateur inactif avec solde, non anonymisé');
      continue;
    }

    // Anonymiser les données personnelles
    await prisma.user.update({
      where: { id: user.id },
      data: {
        email: `deleted_${user.id}@deleted.local`,
        firstName: 'Deleted',
        lastName: 'User',
        phone: null,
        hashedPassword: 'DELETED_ANONYMIZED',
        // Supprimer les connexions bancaires (cascade)
        powensConnections: {
          deleteMany: {}
        }
      }
    });

    anonymizedCount++;
    logger.info({ userId: user.id }, 'Utilisateur inactif anonymisé');
  }

  return { anonymizedCount, totalChecked: inactiveUsers.length };
};

/**
 * Supprime les tokens Powens expirés
 */
export const cleanupExpiredTokens = async () => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - RETENTION_PERIODS.EXPIRED_TOKENS);

  const result = await prisma.powensLinkToken.deleteMany({
    where: {
      expiresAt: { lt: cutoffDate }
    }
  });

  logger.info({ deletedCount: result.count }, 'Tokens Powens expirés supprimés');
  return result.count;
};

/**
 * Supprime les notifications lues anciennes
 */
export const cleanupReadNotifications = async () => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - RETENTION_PERIODS.READ_NOTIFICATIONS);

  const result = await prisma.notification.deleteMany({
    where: {
      readAt: { not: null, lt: cutoffDate }
    }
  });

  logger.info({ deletedCount: result.count }, 'Notifications lues supprimées');
  return result.count;
};

/**
 * Supprime les anciennes connexions bancaires déconnectées
 */
export const cleanupDisconnectedBankConnections = async () => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - RETENTION_PERIODS.DISCONNECTED_BANK_CONNECTIONS);

  const result = await prisma.powensConnection.deleteMany({
    where: {
      status: { in: ['disconnected', 'error'] },
      updatedAt: { lt: cutoffDate }
    }
  });

  logger.info({ deletedCount: result.count }, 'Connexions bancaires déconnectées supprimées');
  return result.count;
};

/**
 * Exécute toutes les tâches de nettoyage
 * À appeler via un cron job (ex: une fois par semaine)
 */
export const runDataRetentionCleanup = async () => {
  logger.info('Début du nettoyage des données (data retention)');

  const results = {
    users: await anonymizeInactiveUsers(),
    tokens: await cleanupExpiredTokens(),
    notifications: await cleanupReadNotifications(),
    bankConnections: await cleanupDisconnectedBankConnections()
  };

  logger.info({ results }, 'Nettoyage des données terminé');
  return results;
};

