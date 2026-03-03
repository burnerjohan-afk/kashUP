import apiClient from './apiClient';

/**
 * Endpoints utilisés :
 * - GET /me/rewards : résumé des points, boosts actifs et badges obtenus
 * - GET /me/badges : progression détaillée badge par badge
 * - GET /rewards/boosts : catalogue des boosts disponibles à l’achat
 * - POST /rewards/boosts/:id/purchase : achat d’un boost
 * - GET /rewards/badges : catalogue complet des badges
 */

export type RewardSummary = {
  points: number;
  boostsActifs: {
    id: string;
    name: string;
    multiplier: number;
    expiresAt: string;
  }[];
  badges: {
    id: string;
    name: string;
    description: string;
    level: number;
    obtainedAt: string;
  }[];
};

export type AvailableBoost = {
  id: string;
  name: string;
  description: string;
  multiplier: number;
  target: string;
  costInPoints: number;
  startsAt: string;
  endsAt: string;
  active: boolean;
  category?: {
    id: string;
    name: string;
  } | null;
  partner?: {
    id: string;
    name: string;
    logoUrl?: string | null;
  } | null;
};

export type BadgeCatalogEntry = {
  id: string;
  name: string;
  description: string;
  level: number;
  unlockCondition: string;
};

export type UserBadge = {
  id: string;
  badgeId: string;
  userId: string;
  obtainedAt: string;
  badge: BadgeCatalogEntry;
};

export type PurchaseBoostResult = {
  wallet: {
    id: string;
    soldePoints: number;
    soldeCashback: number;
    soldeCoffreFort: number;
    updatedAt: string;
  };
  boost: {
    id: string;
    name: string;
    multiplier: number;
    target: string;
  };
};

export const getRewardsSummary = async (): Promise<RewardSummary> => {
  const { data } = await apiClient.get<RewardSummary>('/me/rewards');
  return data;
};

export const getUserBadges = async (): Promise<UserBadge[]> => {
  const { data } = await apiClient.get<UserBadge[]>('/me/badges');
  return data;
};

export const getAvailableBoosts = async (): Promise<AvailableBoost[]> => {
  const { data } = await apiClient.get<AvailableBoost[]>('/rewards/boosts');
  return data;
};

export const purchaseBoost = async (boostId: string): Promise<PurchaseBoostResult> => {
  const { data } = await apiClient.post<PurchaseBoostResult>(`/rewards/boosts/${boostId}/purchase`);
  return data;
};

export const getBadgeCatalog = async (): Promise<BadgeCatalogEntry[]> => {
  const { data } = await apiClient.get<BadgeCatalogEntry[]>('/rewards/badges');
  return data;
};

