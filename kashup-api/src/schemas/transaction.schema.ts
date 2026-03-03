import { z } from 'zod';
import { TRANSACTION_SOURCES } from '../types/domain';

export const createTransactionSchema = z.object({
  userId: z.string().cuid().optional(),
  partnerId: z.string().cuid(),
  amount: z.number().positive(),
  source: z.enum(TRANSACTION_SOURCES)
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;

