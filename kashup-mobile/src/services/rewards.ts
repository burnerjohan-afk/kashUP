/**
 * Service pour les récompenses
 */

import { apiClient } from './api';
import { unwrapStandardResponse } from '../types/api';

export type RewardType = 'boost' | 'badge' | 'lottery' | 'challenge';

export interface Reward {
  id: string;
  type: RewardType;
  name: string;
  description: string;
  points?: number;
  multiplier?: number;
  target?: string;
  costInPoints?: number;
  startsAt?: string;
  endsAt?: string;
  active: boolean;
  stock?: number | null;
  category?: {
    id: string;
    name: string;
  } | null;
  partner?: {
    id: string;
    name: string;
    logoUrl?: string | null;
  } | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Récupère les récompenses par type
 */
export async function fetchRewardsByType(type: RewardType): Promise<Reward[]> {
  const response = await apiClient<Reward[]>('GET', `/rewards/${type}`);
  const data = unwrapStandardResponse(response);
  return Array.isArray(data) ? data : [];
}

