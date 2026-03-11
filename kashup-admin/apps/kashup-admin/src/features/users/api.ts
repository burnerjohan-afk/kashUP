import { z } from 'zod';
import { getStandardJson, patchStandardJson, postStandardJson } from '@/lib/api/client';
import { unwrapStandardResponse } from '@/lib/api/response';
import type {
  GiftCard,
  Reward,
  Territory,
  Transaction,
  User,
  UserStatus,
} from '@/types/entities';

export type UsersFilters = {
  search?: string;
  status?: UserStatus | 'all';
  territory?: Territory | 'all';
  page?: number;
  pageSize?: number;
};

export type UsersResponse = {
  items: User[];
  page: number;
  pageSize: number;
  total: number;
};

export const fetchUsers = async (filters: UsersFilters) => {
  const response = await getStandardJson<UsersResponse>('admin/users', filters);
  return unwrapStandardResponse(response);
};

export const fetchUserTransactions = async (userId: string) => {
  const response = await getStandardJson<Transaction[]>(`admin/users/${userId}/transactions`);
  return unwrapStandardResponse(response);
};

export const fetchUserRewards = async (userId: string) => {
  const response = await getStandardJson<Reward[]>(`admin/users/${userId}/rewards/history`);
  return unwrapStandardResponse(response);
};

export const fetchUserGiftCards = async (userId: string) => {
  const response = await getStandardJson<GiftCard[]>(`admin/users/${userId}/gift-cards`);
  return unwrapStandardResponse(response);
};

export const resetUserPassword = async (userId: string) => {
  const response = await postStandardJson<null>(`admin/users/${userId}/reset-password`, {});
  return unwrapStandardResponse(response);
};

export const forceUserKyc = async (userId: string) => {
  const response = await patchStandardJson<User>(`admin/users/${userId}/kyc/force`, {});
  return unwrapStandardResponse(response);
};

export const walletAdjustmentSchema = z.object({
  type: z.enum(['credit', 'debit']),
  source: z.enum(['cashback', 'points']),
  amount: z.number().positive(),
  reason: z.string().min(5),
});

export type WalletAdjustmentInput = z.infer<typeof walletAdjustmentSchema>;

export const adjustWallet = async (userId: string, payload: WalletAdjustmentInput) => {
  const response = await postStandardJson<Transaction>('transactions', { userId, ...payload });
  return unwrapStandardResponse(response);
};

export type UserStatistics = {
  totalTransactions: number;
  averageBasket: number;
  totalAmount: number;
  uniquePartners: number;
  transactionEvolution: Array<{ date: string; transactions: number }>;
  averageBasketEvolution: Array<{ date: string; averageBasket: number }>;
  sectorDistribution: Array<{ name: string; value: number }>;
  dayDistribution: Array<{ day: string; transactions: number }>;
  hourDistribution: Array<{ hour: string; transactions: number }>;
};

export const fetchUserStatistics = async (userId: string) => {
  const response = await getStandardJson<UserStatistics>(`admin/users/${userId}/statistics`);
  return unwrapStandardResponse(response);
};

