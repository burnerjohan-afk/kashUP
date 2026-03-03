/**
 * Service d'authentification
 */

import { apiClient, setAuthToken, setRefreshToken, clearAuthToken } from './api';
import { unwrapStandardResponse } from '../types/api';

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

/**
 * Connecte un utilisateur
 */
export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
  const response = await apiClient<AuthResponse>('POST', '/auth/login', credentials);
  const data = unwrapStandardResponse(response);

  // Stocker les tokens
  await setAuthToken(data.tokens.accessToken);
  await setRefreshToken(data.tokens.refreshToken);

  return data;
}

/**
 * Déconnecte l'utilisateur
 */
export async function logout(): Promise<void> {
  await clearAuthToken();
}

/**
 * Récupère l'utilisateur actuel
 */
export async function getCurrentUser(): Promise<User> {
  const response = await apiClient<User>('GET', '/users/me');
  return unwrapStandardResponse(response);
}

