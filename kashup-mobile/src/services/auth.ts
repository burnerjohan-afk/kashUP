/**
 * Service d'authentification
 * Inclut connexion email/mot de passe, Apple et Google (id_token).
 */

import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { apiClient, getAuthToken, setAuthToken, setRefreshToken, clearAuthToken } from './api';
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
  rememberMe?: boolean;
}

export interface SignUpCredentials {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  territory?: string;
  phone?: string;
}

export interface AuthResponse {
  user: User;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

/**
 * Connecte un utilisateur (email + mot de passe)
 */
export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
  const response = await apiClient<AuthResponse>('POST', '/auth/login', credentials);
  const data = unwrapStandardResponse(response);

  await setAuthToken(data.tokens.accessToken);
  await setRefreshToken(data.tokens.refreshToken);
  if (__DEV__) {
    const stored = await getAuthToken();
    if (!stored?.trim()) {
      console.warn('[auth] ⚠️ Token may not have been persisted after login');
    }
  }

  return data;
}

/**
 * Inscription (email + mot de passe)
 */
export async function signup(credentials: SignUpCredentials): Promise<AuthResponse> {
  const response = await apiClient<AuthResponse>('POST', '/auth/signup', credentials);
  const data = unwrapStandardResponse(response);

  await setAuthToken(data.tokens.accessToken);
  await setRefreshToken(data.tokens.refreshToken);
  if (__DEV__) {
    const stored = await getAuthToken();
    if (!stored?.trim()) {
      console.warn('[auth] ⚠️ Token may not have been persisted after signup');
    }
  }

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
  const response = await apiClient<User>('GET', '/me');
  return unwrapStandardResponse(response);
}

/**
 * Connexion avec Sign in with Apple (iOS uniquement).
 * Récupère le identityToken côté appareil puis l’envoie à l’API.
 */
export async function loginWithApple(): Promise<AuthResponse> {
  if (Platform.OS !== 'ios') {
    throw new Error('Connexion Apple disponible uniquement sur iOS.');
  }
  const available = await AppleAuthentication.isAvailableAsync();
  if (!available) {
    throw new Error('Sign in with Apple n’est pas disponible sur cet appareil.');
  }
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
    ],
  });
  const identityToken = credential.identityToken;
  if (!identityToken) {
    throw new Error('Apple n’a pas renvoyé de token. Réessayez.');
  }
  const response = await apiClient<AuthResponse>('POST', '/auth/apple', { identityToken });
  const data = unwrapStandardResponse(response);
  await setAuthToken(data.tokens.accessToken);
  await setRefreshToken(data.tokens.refreshToken);
  return data;
}

/**
 * Connexion avec Google.
 * Reçoit l’id_token obtenu côté client (ex. via useIdTokenAuthRequest) et l’envoie à l’API.
 */
export async function loginWithGoogle(idToken: string): Promise<AuthResponse> {
  if (!idToken?.trim()) {
    throw new Error('Token Google manquant.');
  }
  const response = await apiClient<AuthResponse>('POST', '/auth/google', { idToken });
  const data = unwrapStandardResponse(response);
  await setAuthToken(data.tokens.accessToken);
  await setRefreshToken(data.tokens.refreshToken);
  return data;
}

