import { Request, Response } from 'express';
import {
  getBudgetSummary,
  getLinkToken,
  getSecurityEvents,
  listBankConnections,
  listPaymentMethods
} from '../services/powens/powens.service';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/errors';
import { sendSuccess } from '../utils/response';
import { notificationBus } from '../events/event-bus';

export const getPowensLinkToken = asyncHandler(async (_req: Request, res: Response) => {
  const token = await getLinkToken();
  sendSuccess(res, token);
});

export const getMyBankConnections = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentification requise', 401);
  }
  const connections = await listBankConnections(req.user.sub);
  sendSuccess(res, connections);
});

export const getMyBudget = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentification requise', 401);
  }
  const budget = await getBudgetSummary(req.user.sub);
  sendSuccess(res, budget);
});

export const getMyPayments = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentification requise', 401);
  }
  const payments = await listPaymentMethods(req.user.sub);
  sendSuccess(res, payments);
});

export const getMySecurity = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentification requise', 401);
  }
  const security = await getSecurityEvents(req.user.sub);
  sendSuccess(res, security);
});

export const powensWebhook = asyncHandler(async (req: Request, res: Response) => {
  // Placeholder webhook
  if (req.body?.user_id && req.body?.connection_id) {
    notificationBus.emitEvent({
      type: 'powens_connection_sync',
      payload: {
        userId: req.body.user_id,
        connectionId: req.body.connection_id,
        status: req.body.status ?? 'updated'
      }
    });
  }
  sendSuccess(res, { received: true });
});


