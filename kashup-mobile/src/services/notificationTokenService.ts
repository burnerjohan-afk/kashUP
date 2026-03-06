/**
 * Service pour enregistrer le token Expo Push auprès du backend
 */

import { apiClient, hasRefreshToken } from './api';
import { ApiError, unwrapStandardResponse } from '../types/api';

/**
 * Enregistre le token Expo Push auprès du backend (uniquement si l'utilisateur est connecté).
 * Si aucun refresh token n'est disponible, l'enregistrement est ignoré sans erreur.
 *
 * @param token - Le token Expo Push à enregistrer
 */
export async function registerPushToken(token: string): Promise<void> {
  try {
    const isLoggedIn = await hasRefreshToken();
    if (!isLoggedIn) {
      return;
    }

    const response = await apiClient('POST', '/me/push-token', {
      token,
      platform: 'expo',
    });
    unwrapStandardResponse(response);
    if (__DEV__) {
      console.log('[NotificationTokenService] Token enregistré avec succès');
    }
  } catch (error) {
    const isNoRefreshToken =
      error instanceof ApiError &&
      (error.statusCode === 401 || /refresh token/i.test(error.message));
    if (isNoRefreshToken) {
      return;
    }
    if (__DEV__) {
      console.warn('[NotificationTokenService] Enregistrement du token ignoré:', (error as Error).message);
    }
  }
}

/**
 * Supprime le token Expo Push du backend
 * 
 * @param token - Le token Expo Push à supprimer
 */
export async function unregisterPushToken(token: string): Promise<void> {
  try {
    const isLoggedIn = await hasRefreshToken();
    if (!isLoggedIn) return;

    const response = await apiClient('DELETE', '/me/push-token', { token });
    unwrapStandardResponse(response);
    if (__DEV__) {
      console.log('[NotificationTokenService] Token supprimé avec succès');
    }
  } catch (error) {
    const isNoRefreshToken =
      error instanceof ApiError &&
      (error.statusCode === 401 || /refresh token/i.test((error as Error).message));
    if (!isNoRefreshToken && __DEV__) {
      console.warn('[NotificationTokenService] Suppression du token ignorée:', (error as Error).message);
    }
  }
}

