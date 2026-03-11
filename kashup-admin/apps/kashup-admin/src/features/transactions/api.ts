import { z } from 'zod';
import { downloadFile, getStandardJson, postStandardJson } from '@/lib/api/client';
import { unwrapStandardResponse } from '@/lib/api/response';
import type { Transaction } from '@/types/entities';

export type TransactionsFilters = {
  source?: Transaction['type'] | 'all';
  status?: Transaction['status'] | 'all';
  partnerId?: string;
};

export const manualTransactionSchema = z.object({
  userId: z.string().min(1),
  type: z.enum(['cashback', 'points', 'boost']),
  amount: z.number().positive(),
  partnerId: z.string().optional(),
  reason: z.string().min(5),
});

export type ManualTransactionInput = z.infer<typeof manualTransactionSchema>;

export const fetchTransactions = async (filters: TransactionsFilters) => {
  const response = await getStandardJson<Transaction[] | { items?: Transaction[]; transactions?: Transaction[] }>('transactions', filters);
  const data = unwrapStandardResponse(response);
  
  if (import.meta.env.DEV) {
    console.log('💳 Données des transactions reçues:', {
      data,
      isArray: Array.isArray(data),
      dataType: typeof data,
      dataKeys: data && typeof data === 'object' ? Object.keys(data) : null,
    });
  }
  
  // Si l'API retourne directement un tableau, l'utiliser
  if (Array.isArray(data)) {
    return data;
  }
  
  // Si l'API retourne un objet avec une propriété items ou transactions
  if (data && typeof data === 'object') {
    if ('items' in data && Array.isArray(data.items)) {
      return data.items;
    }
    if ('transactions' in data && Array.isArray(data.transactions)) {
      return data.transactions;
    }
  }
  
  // Par défaut, retourner un tableau vide
  if (import.meta.env.DEV) {
    console.warn('⚠️ Format de données inattendu pour les transactions, retour d\'un tableau vide');
  }
  
  return [];
};

export const createManualTransaction = async (payload: ManualTransactionInput) => {
  const response = await postStandardJson<Transaction>('transactions', payload);
  return unwrapStandardResponse(response);
};

export const exportTransactions = async (filters: TransactionsFilters) => {
  const blob = await downloadFile('transactions/export', filters);
  return blob;
};

export const flagTransaction = async (transactionId: string) => {
  const response = await postStandardJson<Transaction>(`transactions/${transactionId}/flag`, {});
  return unwrapStandardResponse(response);
};

