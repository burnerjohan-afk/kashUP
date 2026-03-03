import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/errors';
import { sendSuccess } from '../utils/response';
import { initAuth, exchangeTemporaryCode, verifyState } from '../services/powens/powensAuth.service';
import { getWebviewConnectUrl } from '../services/powens/powensWebview.service';
import { syncAll } from '../services/powens/powensSync.service';
import { createBankConsent, isBankConsentValid } from '../services/bankConsent.service';
import { logBankAccess, logBankAccessError } from '../middlewares/bankAccessLogger';
import prisma from '../config/prisma';
import logger from '../utils/logger';
import env from '../config/env';
import { encrypt } from '../utils/encryption';

/**
 * GET /integrations/powens/webview-url
 * Génère l'URL Webview Powens pour connecter une banque
 */
export const getWebviewUrl = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.sub;
  if (!userId) {
    throw new AppError('Authentification requise', 401);
  }

  // Initialiser l'auth Powens pour obtenir un temporary_code
  const authInit = await initAuth();
  const webviewUrl = getWebviewConnectUrl({
    userId,
    temporaryCode: authInit.temporary_code
  });

  logger.info({ userId, webviewUrl }, 'URL Webview Powens générée');

  sendSuccess(res, { webviewUrl, temporaryCode: authInit.temporary_code });
});

/**
 * GET /integrations/powens/callback
 * Callback Powens après connexion banque via Webview
 * Gère le retour avec code/token et finalise la connexion
 */
export const powensCallback = asyncHandler(async (req: Request, res: Response) => {
  const { code, state, error, error_description } = req.query;

  if (error) {
    logger.error({ error, error_description }, 'Erreur callback Powens');
    // Rediriger vers le front avec erreur
    const frontUrl = new URL(env.POWENS_REDIRECT_URI);
    frontUrl.searchParams.set('error', error as string);
    if (error_description) {
      frontUrl.searchParams.set('error_description', error_description as string);
    }
    return res.redirect(frontUrl.toString());
  }

  if (!code || !state) {
    throw new AppError('Paramètres manquants (code ou state)', 400);
  }

  // Vérifier le state signé
  const stateData = verifyState(state as string);
  if (!stateData) {
    throw new AppError('State invalide ou expiré', 400);
  }

  const { userId } = stateData;

  try {
    // Échanger le code contre un access_token
    const tokenResponse = await exchangeTemporaryCode(code as string);

    if (!tokenResponse.access_token) {
      throw new AppError('Access token non reçu de Powens', 500);
    }

    // Chiffrer l'access token avant stockage (RGPD Art. 32, DSP2)
    const encryptedToken = encrypt(tokenResponse.access_token);

    // Créer ou mettre à jour la connexion Powens
    // Si powensConnectionId est null, on ne peut pas utiliser le unique constraint
    const existingConnection = tokenResponse.user_id 
      ? await prisma.powensConnection.findUnique({
          where: {
            userId_powensConnectionId: {
              userId,
              powensConnectionId: tokenResponse.user_id
            }
          }
        })
      : null;

    const connection = existingConnection
      ? await prisma.powensConnection.update({
          where: { id: existingConnection.id },
          data: {
            accessToken: encryptedToken,
            powensUserId: tokenResponse.user_id || undefined,
            powensConnectionId: tokenResponse.user_id || undefined,
            status: 'active',
            updatedAt: new Date()
          }
        })
      : await prisma.powensConnection.create({
          data: {
            userId,
            powensUserId: tokenResponse.user_id || undefined,
            powensConnectionId: tokenResponse.user_id || undefined,
            accessToken: encryptedToken,
            status: 'active'
          }
        });

    logger.info({ userId, connectionId: connection.id }, 'Connexion Powens créée/mise à jour');

    // Créer le consentement DSP2 explicite (obligatoire)
    await createBankConsent(userId, {
      connectionId: connection.id,
      scope: ['accounts', 'transactions', 'balances'] // Scope complet par défaut
    });

    // Logger l'accès bancaire
    await logBankAccess(
      {
        userId,
        connectionId: connection.id,
        action: 'connect'
      },
      req
    );

    // Rediriger vers le front avec succès
    const frontUrl = new URL(env.POWENS_REDIRECT_URI);
    frontUrl.searchParams.set('success', 'true');
    frontUrl.searchParams.set('connectionId', connection.id);
    return res.redirect(frontUrl.toString());
  } catch (error) {
    logger.error({ error, userId }, 'Erreur lors de la finalisation de la connexion Powens');
    const frontUrl = new URL(env.POWENS_REDIRECT_URI);
    frontUrl.searchParams.set('error', 'connection_failed');
    frontUrl.searchParams.set('error_description', 'Impossible de finaliser la connexion');
    return res.redirect(frontUrl.toString());
  }
});

/**
 * POST /integrations/powens/finalize
 * Alternative: finalisation côté backend si le callback est géré côté front
 */
export const finalizeConnection = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.sub;
  if (!userId) {
    throw new AppError('Authentification requise', 401);
  }

  const { code, state } = req.body;

  if (!code || !state) {
    throw new AppError('Code et state requis', 400);
  }

  const stateData = verifyState(state);
  if (!stateData || stateData.userId !== userId) {
    throw new AppError('State invalide', 400);
  }

  const tokenResponse = await exchangeTemporaryCode(code);

  // Chiffrer l'access token avant stockage
  const encryptedToken = encrypt(tokenResponse.access_token);

  // Si powensConnectionId est null, on ne peut pas utiliser le unique constraint
  let connection;
  if (tokenResponse.user_id) {
    connection = await prisma.powensConnection.upsert({
      where: {
        userId_powensConnectionId: {
          userId,
          powensConnectionId: tokenResponse.user_id
        }
      },
      update: {
        accessToken: encryptedToken,
        powensUserId: tokenResponse.user_id,
        status: 'active',
        updatedAt: new Date()
      },
      create: {
        userId,
        powensUserId: tokenResponse.user_id,
        powensConnectionId: tokenResponse.user_id,
        accessToken: encryptedToken,
        status: 'active'
      }
    });
  } else {
    // Si pas de user_id, créer une nouvelle connexion
    connection = await prisma.powensConnection.create({
      data: {
        userId,
        accessToken: encryptedToken,
        status: 'active'
      }
    });
  }

  sendSuccess(res, { connectionId: connection.id, status: 'connected' });
});

/**
 * POST /integrations/powens/:connectionId/sync
 * Synchronise les comptes et transactions pour une connexion Powens
 */
export const syncConnection = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.sub;
  if (!userId) {
    throw new AppError('Authentification requise', 401);
  }

  const { connectionId } = req.params;

  // Vérifier que la connexion appartient à l'utilisateur
  const connection = await prisma.powensConnection.findFirst({
    where: {
      id: connectionId,
      userId
    }
  });

  if (!connection) {
    await logBankAccessError(
      {
        userId,
        connectionId,
        action: 'sync'
      },
      req,
      'Connexion introuvable'
    );
    throw new AppError('Connexion Powens introuvable', 404);
  }

  // Vérifier le consentement DSP2
  const hasConsent = await isBankConsentValid(userId, connectionId);
  if (!hasConsent) {
    await logBankAccessError(
      {
        userId,
        connectionId,
        action: 'sync'
      },
      req,
      'Consentement DSP2 invalide ou expiré'
    );
    throw new AppError('Consentement bancaire invalide ou expiré. Veuillez reconnecter votre banque.', 403);
  }

  try {
    const result = await syncAll(connectionId);

    // Logger l'accès réussi
    await logBankAccess(
      {
        userId,
        connectionId,
        action: 'sync',
        metadata: {
          accountsSynced: result.accountsSynced,
          transactionsSynced: result.transactionsSynced
        }
      },
      req
    );

    sendSuccess(res, result, null, 200, 'Synchronisation terminée');
  } catch (error) {
    await logBankAccessError(
      {
        userId,
        connectionId,
        action: 'sync'
      },
      req,
      error instanceof Error ? error.message : 'Erreur inconnue'
    );
    throw error;
  }
});

/**
 * GET /integrations/powens/connections
 * Liste les connexions Powens de l'utilisateur
 */
export const listConnections = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.sub;
  if (!userId) {
    throw new AppError('Authentification requise', 401);
  }

  const connections = await prisma.powensConnection.findMany({
    where: { userId },
    include: {
      bankAccounts: {
        select: {
          id: true,
          label: true,
          balance: true,
          currency: true,
          type: true,
          lastSyncAt: true
        }
      },
      _count: {
        select: {
          bankAccounts: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  // Ne pas exposer l'accessToken
  const safeConnections = connections.map(conn => ({
    id: conn.id,
    status: conn.status,
    lastSyncAt: conn.lastSyncAt,
    createdAt: conn.createdAt,
    updatedAt: conn.updatedAt,
    bankAccounts: conn.bankAccounts || [],
    accountsCount: conn._count.bankAccounts || 0
  }));

  // Retourner état explicite même si vide (pas de 404)
  sendSuccess(res, {
    connected: connections.length > 0,
    connections: safeConnections
  });
});

