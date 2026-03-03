import apiClient from './apiClient';

/**
 * Endpoints utilisés :
 * - GET /me : informations de profil et wallet associé
 */

export type UserProfile = {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  role: string;
  createdAt: string;
  wallet?: {
    soldeCashback: number;
    soldePoints: number;
    soldeCoffreFort: number;
  } | null;
};

export const getUserProfile = async (): Promise<UserProfile> => {
  const { data } = await apiClient.get<UserProfile>('/me');
  return data;
};

