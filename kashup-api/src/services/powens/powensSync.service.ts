import prisma from '../../config/prisma';
import { AppError } from '../../utils/errors';
import logger from '../../utils/logger';
import env from '../../config/env';
import { decrypt, encrypt } from '../../utils/encryption';

/**
 * Service de synchronisation Powens (comptes + transactions)
 */

interface PowensAccount {
  id: string;
  name: string;
  balance?: number;
  currency?: string;
  type?: string;
  iban?: string;
  [key: string]: unknown;
}

interface PowensTransaction {
  id: string;
  account_id: string;
  date: string;
  amount: number;
  label: string;
  category?: string;
  [key: string]: unknown;
}

interface PowensAccountsResponse {
  accounts: PowensAccount[];
  total?: number;
}

interface PowensTransactionsResponse {
  transactions: PowensTransaction[];
  total?: number;
  next?: string; // URL de pagination
}

/**
 * Récupère les comptes bancaires depuis Powens
 * Utilise l'access_token dans le header Authorization
 */
const fetchAccounts = async (
  accessToken: string,
  powensUserId: string
): Promise<PowensAccount[]> => {
  try {
    const url = `https://${env.POWENS_DOMAIN}.biapi.pro/2.0/users/${powensUserId}/accounts`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erreur Powens accounts (${response.status}): ${errorText}`);
    }

    const data = await response.json() as PowensAccountsResponse;
    return data.accounts || [];
  } catch (error) {
    logger.error({ error, powensUserId }, 'Erreur lors de la récupération des comptes Powens');
    throw new AppError('Impossible de récupérer les comptes bancaires', 500);
  }
};

/**
 * Récupère les transactions depuis Powens (avec pagination)
 * Utilise l'access_token dans le header Authorization
 */
const fetchTransactions = async (
  accessToken: string,
  powensUserId: string,
  accountId?: string
): Promise<PowensTransaction[]> => {
  const allTransactions: PowensTransaction[] = [];
  let nextUrl: string | undefined = accountId
    ? `https://${env.POWENS_DOMAIN}.biapi.pro/2.0/users/${powensUserId}/accounts/${accountId}/transactions`
    : `https://${env.POWENS_DOMAIN}.biapi.pro/2.0/users/${powensUserId}/transactions`;

  try {
    while (nextUrl) {
      const response = await fetch(nextUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur Powens transactions (${response.status}): ${errorText}`);
      }

      const data = await response.json() as PowensTransactionsResponse;

      if (data.transactions) {
        allTransactions.push(...data.transactions);
      }

      // Pagination
      nextUrl = data.next || undefined;

      // Limite de sécurité (max 1000 transactions par sync)
      if (allTransactions.length >= 1000) {
        logger.warn({ powensUserId, accountId }, 'Limite de transactions atteinte (1000)');
        break;
      }
    }

    return allTransactions;
  } catch (error) {
    logger.error({ error, powensUserId, accountId }, 'Erreur lors de la récupération des transactions Powens');
    throw new AppError('Impossible de récupérer les transactions', 500);
  }
};

/**
 * Synchronise tous les comptes et transactions pour une connexion Powens
 */
export const syncAll = async (connectionId: string): Promise<{
  accountsSynced: number;
  transactionsSynced: number;
}> => {
  const connection = await prisma.powensConnection.findUnique({
    where: { id: connectionId },
    include: { user: true }
  });

  if (!connection) {
    throw new AppError('Connexion Powens introuvable', 404);
  }

  if (!connection.powensUserId) {
    throw new AppError('Connexion Powens incomplète (powensUserId manquant)', 400);
  }

  // Déchiffrer l'access token
  let accessToken: string;
  try {
    accessToken = decrypt(connection.accessToken);
  } catch (error) {
    logger.error({ connectionId, error }, 'Erreur déchiffrement access token');
    throw new AppError('Erreur de sécurité : impossible de déchiffrer le token', 500);
  }

  logger.info({ connectionId, userId: connection.userId }, 'Début synchronisation Powens');

  // Récupérer les comptes (utiliser le token déchiffré)
  const powensAccounts = await fetchAccounts(accessToken, connection.powensUserId);

  let accountsSynced = 0;
  let transactionsSynced = 0;

  await prisma.$transaction(async (tx) => {
    // Upsert des comptes
    for (const powensAccount of powensAccounts) {
      // Si powensAccountId est null, on ne peut pas utiliser le unique constraint
      let account;
      if (powensAccount.id) {
        account = await tx.bankAccount.upsert({
          where: {
            connectionId_powensAccountId: {
              connectionId,
              powensAccountId: powensAccount.id
            }
          },
        update: {
          label: powensAccount.name || 'Compte sans nom',
          iban: powensAccount.iban ? encrypt(powensAccount.iban) : null, // Chiffrer IBAN (DSP2)
          balance: powensAccount.balance ?? 0,
          currency: powensAccount.currency || 'EUR',
          type: powensAccount.type || null,
          raw: JSON.stringify(powensAccount),
          lastSyncAt: new Date(),
          updatedAt: new Date()
        },
        create: {
          connectionId,
          powensAccountId: powensAccount.id,
          label: powensAccount.name || 'Compte sans nom',
          iban: powensAccount.iban ? encrypt(powensAccount.iban) : null, // Chiffrer IBAN (DSP2)
          balance: powensAccount.balance ?? 0,
          currency: powensAccount.currency || 'EUR',
          type: powensAccount.type || null,
          raw: JSON.stringify(powensAccount),
          lastSyncAt: new Date()
        }
      });
      } else {
        // Si pas d'ID, créer un nouveau compte
        account = await tx.bankAccount.create({
          data: {
            connectionId,
            label: powensAccount.name || 'Compte sans nom',
            iban: powensAccount.iban ? encrypt(powensAccount.iban) : null,
            balance: powensAccount.balance ?? 0,
            currency: powensAccount.currency || 'EUR',
            type: powensAccount.type || null,
            raw: JSON.stringify(powensAccount),
            lastSyncAt: new Date()
          }
        });
      }

      accountsSynced++;

      // Récupérer les transactions pour ce compte (utiliser le token déchiffré)
      const powensTransactions = await fetchTransactions(
        accessToken,
        connection.powensUserId!,
        powensAccount.id
      );

      // Upsert des transactions
      for (const powensTxn of powensTransactions) {
        // Si powensTransactionId est null, on ne peut pas utiliser le unique constraint
        if (powensTxn.id) {
          await tx.bankTransaction.upsert({
            where: {
              accountId_powensTransactionId: {
                accountId: account.id,
                powensTransactionId: powensTxn.id
              }
            },
            update: {
              date: new Date(powensTxn.date),
              amount: powensTxn.amount || 0,
              label: powensTxn.label || 'Transaction sans libellé',
              category: powensTxn.category || null,
              raw: JSON.stringify(powensTxn),
              updatedAt: new Date()
            },
            create: {
              accountId: account.id,
              powensTransactionId: powensTxn.id,
              date: new Date(powensTxn.date),
              amount: powensTxn.amount || 0,
              label: powensTxn.label || 'Transaction sans libellé',
              category: powensTxn.category || null,
              raw: JSON.stringify(powensTxn)
            }
          });
        } else {
          // Si pas d'ID, créer une nouvelle transaction
          await tx.bankTransaction.create({
            data: {
              accountId: account.id,
              date: new Date(powensTxn.date),
              amount: powensTxn.amount || 0,
              label: powensTxn.label || 'Transaction sans libellé',
              category: powensTxn.category || null,
              raw: JSON.stringify(powensTxn)
            }
          });
        }

        transactionsSynced++;
      }
    }

    // Mettre à jour lastSyncAt de la connexion
    await tx.powensConnection.update({
      where: { id: connectionId },
      data: {
        lastSyncAt: new Date(),
        updatedAt: new Date()
      }
    });
  });

  logger.info(
    { connectionId, accountsSynced, transactionsSynced },
    'Synchronisation Powens terminée'
  );

  return { accountsSynced, transactionsSynced };
};

