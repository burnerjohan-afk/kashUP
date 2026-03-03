import { NextFunction, Request, Response } from 'express';
import prisma from '../config/prisma';
import logger from '../utils/logger';

/**
 * Middleware de journalisation des accès bancaires (DSP2 Art. 94)
 * Traçabilité obligatoire des accès aux données bancaires
 */

export interface BankAccessLogParams {
  userId: string;
  connectionId?: string;
  action: 'sync' | 'view_accounts' | 'view_transactions' | 'connect' | 'disconnect';
  metadata?: Record<string, unknown>;
}

/**
 * Crée un log d'accès bancaire
 */
export const logBankAccess = async (params: BankAccessLogParams, req: Request) => {
  try {
    await prisma.bankAccessLog.create({
      data: {
        userId: params.userId,
        connectionId: params.connectionId || null,
        action: params.action,
        ipAddress: req.ip || req.socket.remoteAddress || null,
        userAgent: req.headers['user-agent'] || null,
        success: true,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null
      }
    });
  } catch (error) {
    // Ne pas faire échouer la requête si le log échoue
    logger.error({ error, params }, 'Erreur lors de la journalisation d\'accès bancaire');
  }
};

/**
 * Crée un log d'erreur d'accès bancaire
 */
export const logBankAccessError = async (
  params: BankAccessLogParams,
  req: Request,
  errorMessage: string
) => {
  try {
    await prisma.bankAccessLog.create({
      data: {
        userId: params.userId,
        connectionId: params.connectionId || null,
        action: params.action,
        ipAddress: req.ip || req.socket.remoteAddress || null,
        userAgent: req.headers['user-agent'] || null,
        success: false,
        errorMessage,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null
      }
    });
  } catch (error) {
    logger.error({ error, params }, 'Erreur lors de la journalisation d\'erreur d\'accès bancaire');
  }
};

/**
 * Middleware pour logger automatiquement les accès bancaires
 */
export const bankAccessLogger = (action: BankAccessLogParams['action']) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).user?.sub;
    const connectionId = req.params.connectionId || req.body.connectionId;

    if (!userId) {
      return next();
    }

    // Logger après la réponse
    const originalSend = res.send;
    res.send = function (body) {
      const success = res.statusCode < 400;
      
      if (success) {
        logBankAccess(
          {
            userId,
            connectionId,
            action
          },
          req
        );
      } else {
        logBankAccessError(
          {
            userId,
            connectionId,
            action
          },
          req,
          typeof body === 'string' ? body.substring(0, 200) : 'Unknown error'
        );
      }

      return originalSend.call(this, body);
    };

    next();
  };
};


