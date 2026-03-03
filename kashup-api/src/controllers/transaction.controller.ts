import { Request, Response } from 'express';
import { CreateTransactionInput } from '../schemas/transaction.schema';
import { createTransaction, exportTransactionsToCSV, flagTransaction, listTransactions } from '../services/transaction.service';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/errors';
import { sendSuccess } from '../utils/response';
import { authMiddleware, requireRoles } from '../middlewares/auth';
import { USER_ROLE } from '../types/domain';

export const createTransactionHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user && !req.body.userId) {
    throw new AppError('Utilisateur non authentifié', 401);
  }

  const body = req.body as CreateTransactionInput;
  const requestedUserId = body.userId;
  const userId = requestedUserId ?? req.user?.sub;

  if (!userId) {
    throw new AppError('Impossible de déterminer l\'utilisateur cible', 400);
  }

  if (requestedUserId && req.user?.role !== 'admin') {
    throw new AppError('Seul un administrateur peut spécifier un autre utilisateur', 403);
  }

  const targetUserId = userId;

  const result = await createTransaction(targetUserId, {
    partnerId: body.partnerId,
    amount: body.amount,
    source: body.source
  });

  res.status(201).json(result);
});

// Contrôleurs admin
export const getTransactionsHandler = asyncHandler(async (req: Request, res: Response) => {
  const transactions = await listTransactions(req.query as any);
  sendSuccess(res, transactions);
});

export const exportTransactionsHandler = asyncHandler(async (req: Request, res: Response) => {
  const csvContent = await exportTransactionsToCSV(req.query as any);
  
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="transactions.csv"');
  res.send(csvContent);
});

export const flagTransactionHandler = asyncHandler(async (req: Request, res: Response) => {
  const transaction = await flagTransaction(req.params.id);
  sendSuccess(res, transaction);
});


