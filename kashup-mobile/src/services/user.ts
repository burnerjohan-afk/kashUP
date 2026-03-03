/**
 * Service pour les données utilisateur
 */

import { apiClient } from './api';
import { unwrapStandardResponse } from '../types/api';

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  wallet?: {
    soldeCashback: number;
    soldePoints: number;
    soldeCoffreFort: number;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  userId: string;
  type: string;
  amount: number;
  description: string;
  partnerId?: string | null;
  partner?: {
    id: string;
    name: string;
  } | null;
  status: string;
  createdAt: string;
}

export interface UserReward {
  id: string;
  userId: string;
  rewardId: string;
  reward?: {
    id: string;
    name: string;
    type: string;
  };
  obtainedAt: string;
  expiresAt?: string | null;
}

/**
 * Récupère le profil de l'utilisateur actuel
 */
export async function fetchUserProfile(): Promise<User> {
  const response = await apiClient<User>('GET', '/users/me');
  return unwrapStandardResponse(response);
}

/**
 * Récupère les transactions de l'utilisateur actuel
 */
export async function fetchUserTransactions(): Promise<Transaction[]> {
  const response = await apiClient<Transaction[]>('GET', '/users/me/transactions');
  const data = unwrapStandardResponse(response);
  return Array.isArray(data) ? data : [];
}

/**
 * Récupère les récompenses de l'utilisateur actuel
 */
export async function fetchUserRewards(): Promise<UserReward[]> {
  const response = await apiClient<UserReward[]>('GET', '/users/me/rewards');
  const data = unwrapStandardResponse(response);
  return Array.isArray(data) ? data : [];
}

