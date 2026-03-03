import apiClient from './apiClient';

/**
 * Endpoints utilisés :
 * - GET /me/wallet : récupération de la cagnotte utilisateur
 * - GET /me/transactions : historique détaillé avec les partenaires associés
 * - GET /stats/impact-local : statistiques agrégées de la communauté KashUP
 */

export type CoffreFortConfig = {
  lockPeriodMonths: number;
  pointsPerEuroPerMonth: number;
};

export type WalletSummary = {
  id?: string;
  userId?: string;
  soldeCashback: number;
  soldePoints: number;
  soldeCoffreFort: number;
  monthlyObjective?: number | null;
  monthlyInjected?: number | null;
  coffreFortConfig?: CoffreFortConfig;
  withdrawableCoffreFort?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type WalletTransaction = {
  id: string;
  userId: string;
  partnerId: string;
  amount: number;
  cashbackEarned: number;
  pointsEarned: number;
  transactionDate: string;
  source: string;
  status: string;
  partner: {
    id: string;
    name: string;
    logoUrl?: string | null;
  };
};

export type ImpactStats = {
  totalTransactions: number;
  volumeAchat: number;
  cashbackDistribue: number;
  pointsDistribues: number;
  partenairesActifs: number;
};

export const getWalletSummary = async (): Promise<WalletSummary> => {
  const { data } = await apiClient.get<WalletSummary>('/me/wallet');
  return data;
};

export const getWalletHistory = async (): Promise<WalletTransaction[]> => {
  const { data } = await apiClient.get<WalletTransaction[]>('/me/transactions');
  return data;
};

export const getCommunityImpact = async (): Promise<ImpactStats> => {
  const { data } = await apiClient.get<ImpactStats>('/stats/impact-local');
  return data;
};

export const transferToCoffreFort = async (amount: number): Promise<{ wallet: { soldeCashback: number; soldeCoffreFort: number }; unlockAt: string }> => {
  const { data } = await apiClient.post<{ wallet: { soldeCashback: number; soldeCoffreFort: number }; unlockAt: string }>('/me/coffre-fort/transfer', { amount });
  return data;
};

export const withdrawFromCoffreFort = async (amount: number): Promise<{ soldeCashback: number; soldeCoffreFort: number }> => {
  const { data } = await apiClient.post<{ soldeCashback: number; soldeCoffreFort: number }>('/me/coffre-fort/withdraw', { amount });
  return data;
};

export type CoffreFortHistory = {
  versements: { amount: number; date: string }[];
  retraits: { amount: number; date: string }[];
  points: { points: number; date: string }[];
};

export const getCoffreFortHistory = async (): Promise<CoffreFortHistory> => {
  const { data } = await apiClient.get<CoffreFortHistory>('/me/coffre-fort/history');
  return data;
};